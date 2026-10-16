import { z } from "zod";
import type { ScriptLine, VoiceCheck, VoiceIssue } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import { brandOwnWords, brandVoiceText } from "../brand-voice";
import { isStoryStage, stageName } from "../copy/stage";
import { floorText } from "../copy/words-read";
import { faultLine as wordFaultLine, wordFaults, type FaultRule } from "../copy/word-faults";
import { env } from "../env";
import { lessonsFor } from "../lessons";
import { modelOf } from "../llm/routing";
import { structuredJson } from "../llm/structured";
import { renderPrompt } from "../prompts";
import { getSetting } from "../settings";
import type { AwarenessStage } from "../taxonomy";
import { readingGrade } from "./audit";
import { factCheck, factFaultLine, factFaults, figuresIn, type FactRow } from "./fact-check";
import { adviceBlock, voiceBasics } from "./flow";
import { readingGradeOf, type VoiceProfile } from "./voice-rules";
export const CHECKS = [
    ["logic", "Makes sense"],
    ["one_story", "Tells 1 story"],
    ["one_speaker", "1 speaker throughout"],
    ["speakable", "Can be said aloud"],
    ["reading_level", "Simple words"],
    ["brand_voice", "Sounds like the brand"],
    ["facts", "Facts are true, none made up"],
    ["proof", "Doubts answered with proof"],
    ["offer", "Offer said like a person"],
    ["ends_on_after", "Ends on the after"],
    ["after_payoff", "Nothing new after the payoff"],
    ["fresh", "No stock or machine lines"],
] as const;
const LABEL: Record<string, string> = Object.fromEntries(CHECKS);
const checkId = (raw: string) => {
    const r = raw.toLowerCase().replace(/[^a-z_ ]+/g, "").trim().replace(/\s+/g, "_");
    return LABEL[r] ? r : (CHECKS.find(([id]) => r.includes(id))?.[0] ?? "");
};
const Finding = z.object({ check: z.string().default(""), lines: z.array(z.number().int()).max(30).default([]), what: z.string().default(""), severity: z.string().default("medium"), against: z.array(z.number().int()).max(10).default([]), stands: z.string().default("") });
const EditOut = z.object({
    checks: z.array(z.object({ check: z.string(), ok: z.boolean(), found: z.string().default("") })).max(30).default([]),
    findings: z.array(Finding).max(40).default([]),
    changes: z.array(z.object({ line: z.number().int(), check: z.string().default(""), text: z.string() })).max(30).default([]),
});
export type EditOut = z.input<typeof EditOut>;
export type Finding = z.infer<typeof Finding>;
const numbers = (s: string) => (s.match(/\d[\d,.]*%?/g) ?? []).map((n) => n.replace(/[.,]$/, ""));
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const sentencesOf = (s: string) => s.split(/(?<=[.!?])\s+/).filter(Boolean);
export function checkReport(out: EditOut): NonNullable<VoiceCheck["checks"]> {
    if (!(out.checks ?? []).length) {
        const by = new Map<string, string[]>();
        for (const f of out.findings ?? []) {
            const id = checkId(f.check ?? "");
            if (!id || (f.stands ?? "").trim())
                continue;
            const at = f.lines ?? [];
            by.set(id, [...(by.get(id) ?? []), `${at.length ? `Line${at.length === 1 ? "" : "s"} ${at.join(", ")}: ` : ""}${(f.what ?? "").replace(/\s+/g, " ").trim()}`]);
        }
        return CHECKS.map(([id, label]) => ({ check: id, label, ok: !by.has(id), found: by.get(id) ?? [] }));
    }
    const said = new Map<string, {
        ok: boolean;
        found: string;
    }>();
    for (const c of out.checks ?? []) {
        const id = checkId(c.check);
        if (id && !said.has(id))
            said.set(id, { ok: c.ok, found: (c.found ?? "").replace(/\s+/g, " ").trim() });
    }
    return CHECKS.filter(([id]) => said.has(id)).map(([id, label]) => {
        const s = said.get(id)!;
        return { check: id, label, ok: s.ok, found: !s.ok && s.found ? [s.found] : [] };
    });
}
const FIRST = /\b(i|i'm|i've|i'd|i'll|my|me|mine)\b/gi;
const SECOND = /\b(you|you're|you've|you'd|you'll|your|yours)\b/gi;
const PRICE = /[$£€]\s?\d[\d,.]*/g;
const KINDS: [
    string,
    RegExp
][] = [
    ["a price", /[$£€]\s?\d|\b\d+ (dollars|bucks|pounds|euros)\b/i],
    ["the guarantee", /\b(guarantee|money[- ]back|refund)/i],
    ["the way out", /\b(cancel|pause)\b/i],
    ["shipping", /\bshipping\b/i],
];
const SMALLW = new Set("the a an and or but so then when you your i my we our it its is are was were be to of in on at for with from that this there here what do does did have has had just not no every each one into out up about can will would".split(" "));
const content = (s: string) => new Set((s.toLowerCase().match(/[a-z']+/g) ?? []).map((w) => w.replace(/(ing|ed|es|s)$/, "")).filter((w) => w.length > 2 && !SMALLW.has(w)));
const esc = (n: string) => n.replace(/[.$]/g, "\\$&");
export interface CodeFault {
    line: number;
    check: string;
    what: string;
}
export interface CodeOpts {
    person?: "first" | "second" | "third";
    offerSay?: string;
    offerSaid?: "none" | "one" | "full";
    held?: string;
    after?: string;
    stage?: AwarenessStage | null;
    voice?: VoiceProfile;
    own?: string;
    buyerWords?: string;
    grade?: number;
}
const WORD_CHECK: Partial<Record<FaultRule, string>> = { negation_run: "fresh", contrast: "fresh", mirror_pair: "fresh", stock: "fresh", dash: "fresh", clipped: "speakable", fragments: "speakable", terms: "reading_level" };
const ACROSS: FaultRule[] = ["contrast", "mirror_pair", "fragments"];
export function codeFaults(lines: {
    text: string;
}[], opts: CodeOpts = {}): CodeFault[] {
    const out: CodeFault[] = [];
    const add = (i: number, check: string, what: string) => out.push({ line: i + 1, check, what });
    const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
    const held = opts.held == null ? null : new Set(numbers(opts.held));
    const seenFig = new Map<string, number>();
    const openings = new Map<string, number>();
    lines.forEach((l, i) => {
        const sentences = sentencesOf(l.text);
        const long = sentences.find((s) => words(s) > 28);
        if (long)
            add(i, "speakable", `a sentence of ${words(long)} words, too long for 1 breath: end it where the speaker would breathe, and keep its joining words`);
        const notPrices = (s: string) => figuresIn(s.replace(PRICE, " "));
        const listed = sentences.find((s) => notPrices(s).length >= 2);
        if (listed)
            add(i, "fresh", `${notPrices(listed).length} figures in 1 sentence`);
        else if (notPrices(l.text).length > 2)
            add(i, "fresh", `${notPrices(l.text).length} figures in 1 line`);
        if (opts.offerSaid && opts.offerSaid !== "full" && count(l.text, PRICE) > 1)
            add(i, "offer", `${count(l.text, PRICE)} prices in 1 line`);
        if (sentences.filter((s) => words(s) <= 3).length >= 3)
            add(i, "speakable", "a run of fragments");
        const lone = sentences.find((s) => words(s) === 1 && /^[A-Za-z']+[.!]$/.test(s.trim()) && sentences.length > 1);
        if (lone)
            add(i, "speakable", `a 1-word sentence ("${lone.trim()}"): say it as part of a whole sentence, or take it out`);
        for (const n of new Set(figuresIn(l.text))) {
            const big = n.includes("%") || Number(n.replace(/[^\d.]/g, "")) >= 10 || new RegExp(`[$£€]\\s?${esc(n)}`).test(l.text);
            if (big && seenFig.has(n))
                add(i, "one_story", `${n} was already said in line ${seenFig.get(n)! + 1}: a figure is said once`);
            else if (big)
                seenFig.set(n, i);
            if (held && !held.has(n) && !new RegExp(`${esc(n)}\\s?(am|pm|a\\.m|p\\.m|o'clock)`, "i").test(l.text))
                add(i, "facts", `${n} is in neither the facts nor the brief`);
        }
        for (const s of sentences) {
            const w = (s.toLowerCase().match(/[a-z']+/g) ?? []).filter((x, k) => !(k === 0 && /^(and|but|so|then)$/.test(x)));
            if (w.length < 5)
                continue;
            const open = w.slice(0, 3).join(" ");
            if (openings.has(open) && openings.get(open) !== i)
                add(i, "fresh", `opens "${open}" as line ${openings.get(open)! + 1} does`);
            else if (!openings.has(open))
                openings.set(open, i);
        }
    });
    if (opts.person === "second")
        lines.forEach((l, i) => count(l.text.replace(/"[^"]*"/g, ""), FIRST) >= 2 && add(i, "one_speaker", '"I" or "my" in an ad said to "you"'));
    if (opts.person === "first")
        lines.slice(0, Math.max(1, lines.length - 2)).forEach((l, i) => count(l.text.replace(/"[^"]*"/g, ""), SECOND) >= 2 && count(l.text, FIRST) === 0 && add(i, "one_speaker", 'said to "you" in an "I" story, before the next step'));
    const say = (opts.offerSay ?? "").toLowerCase().replace(/[^a-z0-9$ ]+/g, " ").split(/\s+/).filter(Boolean);
    if (say.length >= 6) {
        const at = lines.findIndex((l) => {
            const t = ` ${l.text.toLowerCase().replace(/[^a-z0-9$ ]+/g, " ").replace(/\s+/g, " ")} `;
            return say.some((_, k) => k + 6 <= say.length && t.includes(` ${say.slice(k, k + 6).join(" ")} `));
        });
        if (at >= 0)
            add(at, "offer", "the offer in the brief's own words");
    }
    if (opts.offerSaid === "none" || opts.offerSaid === "one") {
        const termsAt = lines.map((l, i) => ({ i, kinds: KINDS.filter(([, re]) => re.test(l.text)).map(([k]) => k) })).filter((x) => x.kinds.length);
        const kinds = [...new Set(termsAt.flatMap((x) => x.kinds))];
        if (opts.offerSaid === "none")
            termsAt.forEach((x) => add(x.i, "offer", `${x.kinds.join(" and ")} said to a buyer who is told no deal: take it out`));
        else if (kinds.length > 1)
            termsAt.forEach((x) => add(x.i, "offer", `the ad states ${kinds.join(", ")}: this buyer is told 1 of them, once (the rest sit under the caption)`));
    }
    if (opts.after?.trim()) {
        const a = content(opts.after);
        const best = lines.map((l, i) => ({ i, n: [...content(l.text)].filter((w) => a.has(w)).length })).reduce((m, x) => (x.n >= m.n ? x : m), { i: -1, n: 0 });
        if (best.n >= 2)
            lines.forEach((l, i) => i > best.i && figuresIn(l.text.replace(PRICE, " ")).length > 0 && !KINDS.some(([, re]) => re.test(l.text)) && add(i, "after_payoff", "a new figure after the story has reached its after"));
    }
    const wf = { stage: opts.stage, voice: opts.voice, own: opts.own, buyerWords: opts.buyerWords };
    const seenRule = new Set<string>();
    const addWord = (i: number, rule: FaultRule, said: string) => {
        const check = WORD_CHECK[rule];
        if (!check || i < 0 || seenRule.has(`${i}:${rule}`))
            return;
        if (rule === "clipped" && out.some((x) => x.line === i + 1 && x.what.startsWith("a 1-word sentence")))
            return;
        if (rule === "fragments" && out.some((x) => x.line === i + 1 && x.what === "a run of fragments"))
            return;
        seenRule.add(`${i}:${rule}`);
        add(i, check, said);
    };
    for (const f of wordFaults(lines.map((l, i) => ({ id: String(i), surface: "spoken" as const, text: l.text })), wf))
        addWord(Number(f.id), f.rule, wordFaultLine(f));
    const lineOf = (quote: string) => {
        const head = quote.replace(/…$/, "").split(/(?<=[.!?])\s+/)[0]!.trim();
        return head ? lines.findIndex((l) => l.text.includes(head) || (head.length > 24 && l.text.includes(head.slice(0, 24)))) : -1;
    };
    if (lines.length > 1)
        for (const f of wordFaults([{ id: "all", surface: "spoken", text: lines.map((l) => l.text).join(" ") }], wf))
            if (ACROSS.includes(f.rule))
                addWord(lineOf(f.quote), f.rule, wordFaultLine(f));
    const all = lines.map((l) => l.text).join(" ");
    if (opts.grade && words(all) >= 60 && readingGrade(all) > opts.grade) {
        const hardest = lines.map((l, i) => ({ i, g: words(l.text) >= 8 ? readingGrade(l.text) : 0 })).reduce((m, x) => (x.g > m.g ? x : m), { i: -1, g: 0 });
        if (hardest.i >= 0)
            add(hardest.i, "reading_level", `the ad reads at school grade ${readingGrade(all).toFixed(1)} and ${opts.grade} or below is the limit: plainer words in this line first, still as a sentence a person would say`);
    }
    return out.filter((f, k, all) => all.findIndex((x) => x.line === f.line && x.what === f.what) === k);
}
export const codeFindings = (lines: {
    text: string;
}[], opts: CodeOpts = {}): string[] => codeFaults(lines, opts).map((f) => `Line ${f.line}: ${f.what} (${f.check}).`);
export interface AppliedEdits {
    lines: ScriptLine[];
    issues: VoiceIssue[];
    openingChanged: boolean;
}
const MAX_CUT = 0.35;
const MAX_CUT_STORY = 0.15;
export const maxCut = (stage?: AwarenessStage | null): number => (isStoryStage(stage) ? MAX_CUT_STORY : MAX_CUT);
const NEXT_STEP = /\b(try (it|one|them|a|the)|see (it|for yourself|if it)|take a look|have a look|look (it|them) up|find out|check (it|them) out|order|get yours|start (with|today|here)|tap|click|link|shop|learn more|head to|go to|search for|give (it|them) a (go|try))\b/i;
const isNextStep = (l: {
    text: string;
    beat?: string;
}) => l.beat === "cta" || NEXT_STEP.test(l.text);
export function applyEdits(lines: ScriptLine[], out: EditOut, held: string, opts: {
    report?: boolean;
    stage?: AwarenessStage | null;
} = {}): AppliedEdits {
    const most = maxCut(opts.stage);
    const known = new Set(numbers(`${lines.map((l) => l.text).join(" ")} ${held}`));
    const report = checkReport(out);
    const why = (check: string, line: number) => {
        const mine = (out.findings ?? []).filter((f) => (f.lines ?? []).includes(line) && !(f.stands ?? "").trim());
        const id = checkId(check) || checkId(mine[0]?.check ?? "");
        const found = (mine.find((f) => checkId(f.check ?? "") === id)?.what ?? "").replace(/\s+/g, " ").trim() || report.find((c) => c.check === id)?.found[0];
        return id ? `${LABEL[id]}${found ? `: ${found}` : "."}` : "Read aloud, it did not hold.";
    };
    const total = words(lines.map((l) => l.text).join(" "));
    const next: (ScriptLine | null)[] = lines.map((l) => ({ ...l }));
    const issues: VoiceIssue[] = [];
    let cut = 0;
    const seen = new Set<number>();
    for (const c of out.changes ?? []) {
        const i = c.line - 1;
        const old = lines[i];
        if (!old || seen.has(i))
            continue;
        seen.add(i);
        const text = c.text.replace(/\s+/g, " ").trim();
        if (text === old.text.trim())
            continue;
        const issue = (applied: boolean, note = ""): VoiceIssue => ({ pass: checkId(c.check ?? "") === "brand_voice" ? "brand" : "spoken", where: "line", index: i, field: "text", phrase: old.text, why: `${why(c.check ?? "", c.line)}${note}`, fix: text || "(line removed)", applied });
        if (!text) {
            if (isNextStep(old) && !lines.some((l, k) => k !== i && next[k] && isNextStep(l))) {
                issues.push(issue(false, " Not removed: it is the ad's only next step."));
                continue;
            }
            if (i === 0 || (cut + words(old.text)) / Math.max(1, total) > most) {
                issues.push(issue(false, " Not removed: the pass does not cut the ad down."));
                continue;
            }
            if (opts.report) {
                issues.push(issue(false));
                continue;
            }
            cut += words(old.text);
            next[i] = null;
            issues.push(issue(true));
            continue;
        }
        const added = numbers(text).filter((n) => !known.has(n));
        if (added.length) {
            issues.push(issue(false, ` Not applied: it states ${added.join(", ")}, which is in neither the script nor what the brand holds.`));
            continue;
        }
        if (opts.report) {
            issues.push(issue(false));
            continue;
        }
        next[i] = { ...old, text };
        issues.push(issue(true));
    }
    const kept = next.filter((l): l is ScriptLine => !!l);
    return { lines: kept, issues, openingChanged: !!kept[0] && kept[0].text !== lines[0]?.text };
}
export function unfixed(out: EditOut, applied: Pick<AppliedEdits, "issues">): Finding[] {
    const changed = new Set(applied.issues.filter((i) => i.applied).map((i) => i.index + 1));
    return (out.findings ?? []).map((f) => Finding.parse(f)).filter((f) => !f.stands.trim() && f.lines.length > 0 && !f.lines.some((n) => changed.has(n)));
}
export interface EditRequest {
    brandId: string;
    brand: BrandBrain;
    lines: ScriptLine[];
    brief: string;
    facts?: string[];
    store?: string[];
    opening: string;
    refId: string;
    report?: boolean;
    person?: "first" | "second" | "third";
    offerSay?: string;
    offerSaid?: "none" | "one" | "full";
    after?: string;
    loops?: number;
    first?: "edit" | "patch";
    stage?: AwarenessStage | null;
    buyerWords?: string[];
}
export function stageNote(stage?: AwarenessStage | null): string {
    if (!stage || !isStoryStage(stage))
        return "";
    return `This buyer is ${stageName(stage)}, so the ad is the story of their problem and its length is that story. A second scene of the same problem (another moment it bites, another way they get round it, another fix that let them down) is the story building, not the same point made twice: leave it. Only a sentence that says again what the sentence beside it just said is a repeat. Technical terms have no place for this buyer: a fact worded technically is said in plain words, and that is not a fault of fact. The ad keeps its next step.`;
}
export const FIRST_STEP: "edit" | "patch" = "patch";
export const LOOPS = 1;
const ADVISORY = new Set(["reading_level"]);
const loopsWanted = (n?: number) => Math.max(0, Math.min(LOOPS, n ?? (process.env.SCRIPT_EDIT_LOOPS ? Number(process.env.SCRIPT_EDIT_LOOPS) || 0 : LOOPS)));
const FIX = "Mode: fix. Go through all 12 checks and list every fault in `findings`, with the numbers of the lines it is in. Then fix every one: each line a finding names comes back in `changes`, said again, merged into its neighbour, or with empty text to cut it. A sentence that says again what the one beside it just said is fixed by cutting 1 of the 2. The ad's only next step is never cut. Only where a named line is right as it stands, leave it and say why in that finding's `stands`. Code compares the 2 lists and sends back any fault found and not fixed.";
const TARGET = "Mode: fix only these. The ad below has been edited once. The faults listed remain: some you found and did not fix, some a second reader found, some a check in code found. Fix each one in its line (say it again, merge it into its neighbour, or cut it with empty text) and return a finding for each, with its lines. Where a listed fault is not a fault, say why in `stands`. Change no other line.";
const VERIFY = "Mode: report only. This ad is about to be recorded. Go through the checks and list every fault still there in `findings`, with its lines and a `severity`: high (a contradiction, an impossible order, a figure that does not prove its claim, a second speaker, 2 stories), medium (a listener would notice: a sentence nobody could say in 1 breath, a clipped line, the same thing said twice in other words, the offer recited, something new after the payoff, a stock line, a mirrored slogan), low (taste). Leave the low ones out. A long sentence joined by \"and\", \"so\" or \"because\" that a person would say in 1 go is not a fault. `changes` is empty. An ad with no fault returns no findings.";
const REPORT = "Mode: report and suggest. The person making this ad edited it by hand, so their words stay. List every fault in `findings`, and for each put the line as you would say it in `changes`. It is shown to them as a suggestion and nothing is changed.";
const FACTS_ELSEWHERE = "Check 7 (`facts`) is read by a separate fact checker: skip it.";
export interface Fault {
    lines: number[];
    check: string;
    what: string;
    held?: string;
    against?: number[];
}
const faultLine = (f: {
    lines?: number[];
    line?: number;
    check: string;
    what: string;
}) => {
    const at = f.lines ?? [f.line ?? 0];
    return `Line${at.length === 1 ? "" : "s"} ${at.join(", ")} (${f.check}): ${f.what.replace(/\s+/g, " ").trim()}`;
};
const adviceLine = (f: {
    lines?: number[];
    line?: number;
    check: string;
    what: string;
}) => `${faultLine(f).replace(/[.\s]+$/, "")}. This is advice, so no line was changed for it.`;
const isAdvice = (f: {
    check: string;
}) => ADVISORY.has(f.check);
export function patchWindow(lines: {
    text: string;
}[], faults: Fault[]): {
    shown: number[];
    text: string;
} {
    const bad = new Set(faults.flatMap((f) => f.lines).filter((n) => n >= 1 && n <= lines.length));
    const shown = [...new Set([...[...bad].flatMap((n) => [n - 1, n, n + 1]), ...faults.flatMap((f) => f.against ?? [])])].filter((n) => n >= 1 && n <= lines.length).sort((a, b) => a - b);
    const rows: string[] = [];
    shown.forEach((n, k) => {
        if (k > 0 && n !== shown[k - 1] + 1)
            rows.push("...");
        rows.push(`${bad.has(n) ? "*" : " "} ${n} | ${lines[n - 1].text}`);
    });
    return { shown, text: rows.join("\n") };
}
export function factsFor(lines: {
    text: string;
}[], faults: Fault[], store: string[], max = 6): string[] {
    const about = content(faults.filter((f) => f.check === "facts" || f.check === "proof").flatMap((f) => [f.what, ...f.lines.map((n) => lines[n - 1]?.text ?? "")]).join(" "));
    const named = faults.map((f) => f.held ?? "").filter(Boolean);
    if (!about.size && !named.length)
        return [];
    const near = store.map((s, i) => ({ s, i, n: [...content(s)].filter((w) => about.has(w)).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.i - b.i).slice(0, max).map((x) => x.s);
    return [...named, ...near].filter((x, i, all) => all.indexOf(x) === i);
}
const PatchOut = z.object({ changes: z.array(z.object({ line: z.number().int(), text: z.string() })).max(30).default([]), stands: z.array(z.object({ line: z.number().int(), why: z.string().default("") })).max(30).default([]) });
export async function editPass(req: EditRequest): Promise<AppliedEdits & {
    check: VoiceCheck;
}> {
    const facts = (req.facts ?? []).map((f) => `- ${f}`).join("\n");
    const store = req.store ?? [];
    const held = `${req.brief} ${facts} ${store.join(" ")}`;
    const profile = getSetting(req.brandId, "voice");
    const grade = readingGradeOf(profile);
    const own = brandOwnWords(req.brandId);
    const buyerWords = (req.buyerWords ?? []).join("\n").toLowerCase();
    const code = (lines: {
        text: string;
    }[]) => codeFaults(lines, { person: req.person, offerSay: req.offerSay, offerSaid: req.offerSaid, held: req.facts?.length || store.length ? held : undefined, after: req.after, stage: req.stage, voice: profile, own, buyerWords, grade });
    const voice = brandVoiceText(req.brandId, { surfaces: [], brand: req.brand, story: true });
    const lessons = adviceBlock(lessonsFor(req.brandId, { area: "words" }).filter((l) => l.category !== "product_use"));
    const staged = stageNote(req.stage);
    const stable = { brand_name: req.brand.brand.name, floor: floorText(), grade: String(grade), brief: [req.brief, staged].filter(Boolean).join("\n"), facts: facts || "(none recorded: hold the ad to the brief)", brand_voice: voice, lessons };
    const numbered = (lines: ScriptLine[]) => lines.map((l, i) => `${i + 1} | ${l.text}`).join("\n");
    const ask = (mode: string, lines: ScriptLine[], notes: string, verify = false) => {
        const p = renderPrompt("script-readaloud", { ...stable, mode, notes, script: numbered(lines) });
        return structuredJson({ brandId: req.brandId, task: verify ? "script_verify" : "script_edit", model: verify ? env.MODEL_REFERENCE : env.MODEL_EDIT, system: p.system, user: p.user, schema: EditOut, effort: "low", maxTokens: verify ? 4000 : 6000, refType: "script", refId: req.refId });
    };
    const seen = (found: CodeFault[]) => (found.length ? `Seen by code before you read. Each is a fault unless the line plainly shows otherwise: list it and fix it.\n${found.map((f) => `- ${faultLine(f)}`).join("\n")}` : "");
    const coldRead = /Rewrite line 1/.test(req.opening) ? "" : req.opening.trim();
    const whole = req.report || (req.first ?? (process.env.SCRIPT_EDIT_FIRST === "edit" ? "edit" : process.env.SCRIPT_EDIT_FIRST === "patch" ? "patch" : FIRST_STEP)) === "edit";
    const first: EditOut = whole ? await ask(req.report ? REPORT : FIX, req.lines, [req.report ? "" : req.opening, seen(code(req.lines).filter((f) => req.report || !isAdvice(f)))].filter(Boolean).join("\n\n")) : { findings: [], changes: [] };
    const applied = applyEdits(req.lines, first, held, { report: req.report, stage: req.stage });
    let lines = applied.lines;
    const issues = [...applied.issues];
    let checks = checkReport(first);
    const want = req.report ? 0 : loopsWanted(req.loops);
    let loops = 0;
    let remaining: string[] = [];
    let table: FactRow[] = [];
    const log: string[] = whole ? [`Edit: ${checks.filter((c) => !c.ok).length} of ${checks.length} checks found something, ${applied.issues.filter((i) => i.applied).length} line(s) changed.`] : [];
    if (!req.report) {
        const patch = async (faults: Fault[]) => {
            const window = patchWindow(lines, faults);
            const near = factsFor(lines, faults, store.length ? store : (req.facts ?? []));
            const p = renderPrompt("script-patch", {
                brand_name: req.brand.brand.name,
                floor: floorText(),
                grade: String(grade),
                about: [req.brief.split("\n").filter((l) => /^(Who it is for|What they tried|Also known|Where they are|How much of the deal|How it is told|- (Who speaks|Before|Turning point|After)|- What it costs|- What makes trying)/.test(l)).join("\n") || "(1 person talking to 1 buyer)", staged].filter(Boolean).join("\n"),
                brand_voice: voiceBasics(voice),
                lessons: "",
                facts: near.length ? near.map((f) => `- ${f}`).join("\n") : "(no fault here is about a fact: add none)",
                faults: faults.map((f) => `- ${faultLine(f)}${f.against?.length ? ` It disagrees with line${f.against.length === 1 ? "" : "s"} ${f.against.join(", ")}.` : ""}${f.held ? ` Held fact: "${f.held}"` : ""}`).join("\n"),
                lines: window.text,
            });
            const out = await structuredJson({ brandId: req.brandId, task: "script_patch", model: env.MODEL_EDIT, system: p.system, user: p.user, schema: PatchOut, effort: "low", maxTokens: 2500, refType: "script", refId: req.refId });
            const before = lines.map((l) => l.text);
            const factOnly = new Set(faults.filter((f) => f.check === "facts").flatMap((f) => f.lines).filter((n) => !faults.some((f) => f.check !== "facts" && f.lines.includes(n))));
            const changes = out.changes
                .filter((c) => window.shown.includes(c.line))
                .filter((c) => {
                if (c.text.trim() || !factOnly.has(c.line) || !lines[c.line - 1])
                    return true;
                issues.push({ pass: "spoken", where: "line", index: c.line - 1, field: "text", phrase: lines[c.line - 1].text, why: "Facts are true, none made up. Not removed: a fact fault is fixed by rewording, and the scene stays.", fix: "(line removed)", applied: false });
                return false;
            });
            const next = applyEdits(lines, { findings: faults.map((f) => ({ check: f.check, lines: f.lines, what: f.what })), changes }, held, { stage: req.stage });
            lines = next.lines;
            issues.push(...next.issues);
            const stood = new Set(out.stands.map((s) => s.line));
            const touched = new Set(next.issues.filter((i) => i.applied).map((i) => i.index + 1));
            return {
                fixed: next.issues.filter((i) => i.applied).length,
                open: faults.filter((f) => !f.lines.some((n) => touched.has(n)) && !f.lines.every((n) => stood.has(n))),
                changed: lines.map((l, i) => (before.includes(l.text) ? 0 : i + 1)).filter(Boolean),
            };
        };
        try {
            let carried: Fault[] = unfixed(first, applied).map((f) => ({ lines: f.lines, check: checkId(f.check) || f.check, what: f.what }));
            if (!whole && /Rewrite line 1/.test(req.opening))
                carried.push({ lines: [1], check: "fresh", what: req.opening.replace(/\*\*/g, "") });
            let scope: number[] | null = null;
            const nearStore = (at: number[]) => [...new Set([...table.filter((r) => at.includes(Number(r.id))).map((r) => r.held).filter(Boolean), ...factsFor(lines, at.map((n) => ({ lines: [n], check: "facts", what: "" })), store, 8)])];
            const tries = new Map<string, number>();
            let factsPatched = false;
            for (let n = want; n > 0; n--) {
                const note = scope ? `Only line${scope.length === 1 ? "" : "s"} ${scope.join(", ")} changed since the last reading. Report a fault only where it is in ${scope.length === 1 ? "that line" : "those lines"}, or where ${scope.length === 1 ? "it" : "one of them"} now contradicts another line.` : "";
                const [read, rows] = await Promise.all([
                    ask(VERIFY, lines, [store.length ? FACTS_ELSEWHERE : "", note, !whole && !scope ? coldRead : ""].filter(Boolean).join(" "), true),
                    store.length && (!scope || factsPatched) ? factCheck({ brandId: req.brandId, brandName: req.brand.brand.name, store: scope ? nearStore(scope) : store, faultsOnly: !!scope, items: lines.map((l, i) => ({ id: String(i + 1), text: l.text })).filter((x) => !scope || scope.includes(Number(x.id))), refId: req.refId }) : Promise.resolve([] as FactRow[]),
                ]);
                const reread = new Set(rows.map((r) => r.id));
                table = scope ? [...table.filter((r) => !reread.has(r.id)), ...rows] : rows;
                const found: Fault[] = (read.findings ?? [])
                    .map((f) => Finding.parse(f))
                    .filter((f) => f.severity.trim().toLowerCase() !== "low" && !f.stands.trim() && f.what.trim() && f.lines.length && !(store.length && checkId(f.check) === "facts"))
                    .map((f) => ({ lines: f.lines, check: checkId(f.check) || f.check, what: f.what, against: f.against.filter((x) => !f.lines.includes(x)) }));
                const untrue: Fault[] = factFaults(rows).map((r) => ({ lines: [Number(r.id)], check: "facts", what: factFaultLine(r), held: r.held || undefined }));
                const inScript = (f: {
                    lines: number[];
                }) => f.lines.every((x) => x >= 1 && x <= lines.length);
                const readerAdvice = [...carried, ...found].filter((f) => isAdvice(f) && inScript(f));
                const all = [...carried, ...found, ...untrue, ...code(lines).map((f) => ({ lines: [f.line], check: f.check, what: f.what }))].filter(inScript);
                if (!whole && !scope)
                    checks = checkReport({ findings: all.map((f) => ({ check: f.check, lines: f.lines, what: f.what })), changes: [] });
                carried = [];
                const shown = all.filter(isAdvice);
                const faults = all.filter((f) => !isAdvice(f));
                remaining = [...faults.map(faultLine), ...shown.map(adviceLine)];
                const stuck = faults.filter((f) => (tries.get(`${f.lines.join(",")}:${f.check}`) ?? 0) >= 2);
                if (faults.length && stuck.length === faults.length) {
                    log.push(`Stopped: ${stuck.length} fault(s) came back after 2 patches each, and are left open.`);
                    break;
                }
                for (const f of faults)
                    tries.set(`${f.lines.join(",")}:${f.check}`, (tries.get(`${f.lines.join(",")}:${f.check}`) ?? 0) + 1);
                if (!faults.length) {
                    log.push(`Reading ${loops + 1}${scope ? ` (lines ${scope.join(", ")})` : ""}: nothing to patch${shown.length ? `; ${shown.length} piece${shown.length === 1 ? "" : "s"} of advice shown` : ""}.`);
                    break;
                }
                loops++;
                const done = await patch(faults);
                factsPatched = faults.some((f) => f.check === "facts");
                const fromReader = found.filter((f) => !isAdvice(f) && inScript(f)).length;
                log.push(`Loop ${loops}${scope ? ` (lines ${scope.join(", ")} read again)` : ""}: ${fromReader} from the second reader, ${untrue.length} from the fact checker, ${Math.max(0, faults.length - fromReader - untrue.length)} from code or carried over. ${done.fixed} line(s) patched.${shown.length ? ` ${shown.length} piece${shown.length === 1 ? "" : "s"} of advice shown, not patched.` : ""}\n${faults.map((f) => `   - ${faultLine(f)}`).join("\n")}`);
                const said = (f: {
                    lines: number[];
                    check: string;
                    what: string;
                }) => (isAdvice(f) ? adviceLine(f) : faultLine(f));
                const spot = (f: {
                    lines: number[];
                    check: string;
                }) => `${f.lines.join(",")}:${f.check}`;
                const seenNow = [...code(lines).map((f) => ({ lines: [f.line], check: f.check, what: f.what })), ...readerAdvice.filter((f) => f.lines.every((x) => x <= lines.length))];
                remaining = [...done.open, ...seenNow].map(said);
                scope = done.changed;
                if (!scope.length)
                    break;
                if (n === 1) {
                    const at = scope;
                    const which = `line${at.length === 1 ? "" : "s"} ${at.join(", ")}`;
                    const [again, last] = await Promise.all([
                        ask(VERIFY, lines, [store.length ? FACTS_ELSEWHERE : "", `Only ${which} changed since the last reading. Report a fault only where it is in ${at.length === 1 ? "that line" : "those lines"}, or where ${at.length === 1 ? "it" : "one of them"} now contradicts another line.`].filter(Boolean).join(" "), true),
                        store.length && factsPatched ? factCheck({ brandId: req.brandId, brandName: req.brand.brand.name, store: nearStore(at), faultsOnly: true, items: at.map((i) => ({ id: String(i), text: lines[i - 1].text })), refId: req.refId }) : Promise.resolve([] as FactRow[]),
                    ]);
                    table = [...table.filter((r) => !last.some((x) => x.id === r.id)), ...last];
                    const left = [
                        ...(again.findings ?? [])
                            .map((f) => Finding.parse(f))
                            .filter((f) => f.severity.trim().toLowerCase() !== "low" && !f.stands.trim() && f.what.trim() && f.lines.length && !(store.length && checkId(f.check) === "facts"))
                            .map((f) => ({ lines: f.lines, check: checkId(f.check) || f.check, what: f.what })),
                        ...factFaults(last).map((r) => ({ lines: [Number(r.id)], check: "facts", what: factFaultLine(r) })),
                    ];
                    const named = new Set(left.map(spot));
                    remaining = [...done.open.filter((f) => !named.has(spot(f))), ...seenNow, ...left.filter((f) => f.lines.every((x) => x >= 1 && x <= lines.length))].map(said);
                    log.push(`Read again after the patch (${which}): ${left.length} thing${left.length === 1 ? "" : "s"} found and shown, not patched. ${remaining.length} thing(s) still open.`);
                }
            }
            if (!want)
                remaining = code(lines).map((f) => (isAdvice(f) ? adviceLine(f) : faultLine(f)));
        }
        catch (e) {
            remaining = [...remaining, `The second reading did not finish: ${(e as Error).message.slice(0, 140)}`];
        }
    }
    const n = issues.filter((i) => i.applied).length;
    const failed = checks.filter((c) => !c.ok);
    const open = issues.length - n;
    const found = failed.length ? `${failed.length} of ${checks.length} checks found something (${failed.map((c) => c.label.toLowerCase()).join("; ")}).` : `All ${checks.length} checks held.`;
    const second = want ? ` Read again by a second reader${store.length ? " and a fact checker" : ""}${loops ? `, and patched ${loops === 1 ? "once" : `${loops} times`}` : ""}: ${remaining.length ? `${remaining.length} thing${remaining.length === 1 ? "" : "s"} still open.` : "nothing left open."}` : "";
    const check: VoiceCheck = {
        status: n ? "fixed" : open || failed.length ? "suggested" : "clean",
        model: modelOf("script_edit", env.MODEL_EDIT),
        summary: req.report ? `Checked as you saved it. ${found}${open ? ` ${open} suggestion${open === 1 ? "" : "s"} below: nothing was changed.` : ""}` : `Edit pass: read aloud against ${checks.length || CHECKS.length} checks. ${found} ${n ? `${n} change${n === 1 ? "" : "s"} made.` : "Nothing needed changing."}${second}`,
        issues,
        checks,
        ...(req.report ? {} : { loops, remaining, log, facts: table.sort((a, b) => Number(a.id) - Number(b.id)).map((r) => ({ where: `line ${r.id}`, quote: r.quote, held: r.held, verdict: r.verdict })) }),
        sources: ["the script's brief", "the product's facts", "the brand's voice for a told story", ...(store.length ? ["everything the brand holds as fact"] : [])],
        checked_at: new Date().toISOString(),
    };
    return { lines, issues, openingChanged: !!lines[0] && lines[0].text !== req.lines[0]?.text, check };
}
export const EDIT_MODES = { fix: FIX, target: TARGET, verify: VERIFY, report: REPORT };
export { EditOut as EditOutSchema };
