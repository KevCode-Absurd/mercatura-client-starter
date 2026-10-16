import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { env } from "../env";
import { ownId } from "../llm/context";
import { structuredJson } from "../llm/structured";
import { learnedRules } from "../lessons";
import { renderPrompt } from "../prompts";
import type { VoiceProfile } from "../scripts/voice-rules";
import type { AwarenessStage } from "../taxonomy";
import type { Counted } from "./figures";
import { isStoryStage, termsRule } from "./stage";
import { wordFaults, type WordFault, type WordLine } from "./word-faults";
const strip = (md: string) => md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
let floorCache: {
    root: string;
    text: string;
} | null = null;
export function floorText(root: string = env.SKILLS_DIR): string {
    if (floorCache?.root === root)
        return floorCache.text;
    const f = path.join(root, "copy-floor", "CARD.md");
    const text = fs.existsSync(f) ? strip(fs.readFileSync(f, "utf-8")) : "";
    floorCache = { root, text };
    return text;
}
export type ReadTest = "sense" | "said" | "plain" | "sells" | "story" | "flow" | "brand";
export interface ReadFault {
    id: string;
    test: ReadTest;
    quote: string;
    why: string;
    severity: "high" | "medium";
}
export interface LineFault {
    id: string;
    by: string;
    quote: string;
    why: string;
}
export interface WordsRequest {
    brandId: string;
    brandName: string;
    refType: string;
    refId: string;
    stage: AwarenessStage | null;
    voice: VoiceProfile;
    about: string;
    scene?: string;
    brandVoice: string;
    buyer?: string;
    lines: WordLine[];
    own?: string;
    buyerWords?: string;
    facts?: string;
    counted?: Pick<Counted, "names" | "units" | "held">;
    max?: Record<string, number>;
}
export interface WordsResult {
    lines: WordLine[];
    changed: {
        id: string;
        from: string;
        to: string;
        why: string;
    }[];
    refused: {
        id: string;
        text: string;
        why: string;
    }[];
    left: LineFault[];
    found: LineFault[];
}
const WHERE: Record<WordLine["surface"], string> = { picture: "on the picture", headline: "feed headline", primary: "primary text", spoken: "script", hook: "hook", offer: "offer line" };
const where = (l: WordLine) => (l.surface === "picture" && l.role ? `on the picture, ${l.role}` : WHERE[l.surface]);
const isLong = (l: WordLine) => l.surface === "primary" || l.surface === "spoken";
const STORY_TEST: Record<"top" | "low", string> = {
    top: "this buyer does not yet know the answer exists, so the copy must be the story of the problem. It fails when there is no person and no moment carried past the first lines; when the ways people live around the problem are a list and not scenes; when the problem is named and not made worse; when the product is named early, or arrives as a block of counts; or when it ends with no next step.",
    low: "is there a small concrete moment or a person in it, and does it end on what the buyer does next? A short ad needs only a short one.",
};
const ReadOut = z.object({
    faults: z.array(z.object({ id: z.string(), test: z.enum(["sense", "said", "plain", "sells", "story", "flow", "brand"]).catch("said"), quote: z.string().default(""), why: z.string().min(3), severity: z.enum(["high", "medium"]).catch("medium") })).max(40).default([]),
});
const FixOut = z.object({
    changes: z.array(z.object({ id: z.string(), find: z.string().default(""), text: z.string() })).max(60).default([]),
    stands: z.array(z.object({ id: z.string(), why: z.string().default("") })).max(40).default([]),
});
const shown = (lines: WordLine[], max?: Record<string, number>) => lines.map((l) => `${l.id} | ${where(l)} | ${max?.[l.id] ? `max ${max[l.id]} | ` : ""}${l.text.replace(/\n{2,}/g, "\n").trim()}`).join("\n\n");
const sceneBlock = (scene?: string) => (scene ? `## What the picture shows\n${scene}` : "");
export async function readWords(req: WordsRequest, seen: WordFault[] = []): Promise<ReadFault[]> {
    const lines = req.lines.filter((l) => l.text.trim());
    if (!lines.length)
        return [];
    const p = renderPrompt("words-read", {
        brand_name: req.brandName,
        floor: floorText(),
        terms_rule: termsRule(req.stage, req.voice.terms),
        story_test: STORY_TEST[isStoryStage(req.stage) ? "top" : "low"],
        about: req.about,
        buyer: req.buyer ?? "",
        scene: sceneBlock(req.scene),
        brand_voice: req.brandVoice,
        lessons: learnedRules(req.brandId, "judges"),
        seen: seen.length ? seen.map((f) => `- ${f.id}: "${f.quote}" (${f.rule})`).join("\n") : "(nothing)",
        lines: shown(lines),
    });
    const out = await structuredJson({ brandId: req.brandId, task: "words_read", model: env.MODEL_REFERENCE, system: p.system, user: p.user, schema: ReadOut, effort: "low", maxTokens: 4000, refType: req.refType, refId: req.refId });
    const ids = lines.map((l) => l.id);
    return out.faults.flatMap((f) => {
        const id = ownId(f.id, ids);
        return id ? [{ ...f, id }] : [];
    });
}
const figures = (s: string) => new Set((s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((x) => x.replace(/,/g, "")));
const factFigures = (s: string) => new Set([...s.matchAll(/([$£€]\s?)?(\d[\d,]*(?:\.\d+)?)(\s?(?:%|\+|mcg|mg|g|ml|oz|lbs?|kg|iu|x)(?![\p{L}])|[kKmM]\+?(?![\p{L}]))?/gu)].filter((m) => m[1] || m[3] || Number(m[2]!.replace(/,/g, "")) > 12).map((m) => m[2]!.replace(/,/g, "")));
export function patchProblem(line: WordLine, change: {
    find: string;
    text: string;
}, allowed: string, max?: number): string | null {
    const next = applyPatch(line, change);
    if (next == null)
        return "the sentence to replace is not in the text";
    if (!next.trim() && !isLong(line))
        return "a short line can't be emptied";
    const held = new Set([...figures(line.text), ...figures(allowed)]);
    const added = [...factFigures(change.text)].filter((f) => !held.has(f));
    if (added.length)
        return `adds a figure that was not there (${added.join(", ")})`;
    if (max && next.length > max)
        return `${next.length} characters where ${max} fit`;
    return null;
}
export function saidTwice(text: string): boolean {
    const s = text.split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim().toLowerCase().split(/\s+/).slice(0, 3).join(" ")).filter((x) => x.split(" ").length === 3);
    return s.some((x, i) => i > 0 && x === s[i - 1]);
}
export function applyPatch(line: WordLine, change: {
    find: string;
    text: string;
}): string | null {
    if (!isLong(line) || !change.find.trim())
        return change.text.trim();
    const find = change.find.trim();
    if (!line.text.includes(find))
        return null;
    return line.text.replace(find, change.text.trim()).replace(/[ \t]{2,}/g, " ").replace(/ +\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
async function fixWords(req: WordsRequest, faults: LineFault[]): Promise<z.infer<typeof FixOut>> {
    const bad = new Set(faults.map((f) => f.id));
    const p = renderPrompt("words-fix", {
        brand_name: req.brandName,
        floor: floorText(),
        terms_rule: termsRule(req.stage, req.voice.terms),
        about: req.about,
        buyer: req.buyer ?? "",
        scene: sceneBlock(req.scene),
        brand_voice: req.brandVoice,
        lessons: learnedRules(req.brandId, "edits"),
        facts: req.facts?.trim() || "(none beyond what the lines already say)",
        customer_words: req.buyerWords?.trim() ? req.buyerWords.trim().slice(0, 2400) : "(none given)",
        lines: shown(req.lines.filter((l) => bad.has(l.id)), req.max),
        faults: faults.map((f) => `- ${f.id}: "${f.quote}" ${f.why}`).join("\n"),
        others: shown(req.lines.filter((l) => !bad.has(l.id) && !isLong(l))) || "(none)",
    });
    return structuredJson({ brandId: req.brandId, task: "words_fix", model: env.MODEL_EDIT, system: p.system, user: p.user, schema: FixOut, effort: "low", maxTokens: 6000, refType: req.refType, refId: req.refId });
}
const fromCode = (f: WordFault): LineFault => ({ id: f.id, by: f.rule, quote: f.quote, why: f.why });
const fromRead = (f: ReadFault): LineFault => ({ id: f.id, by: f.test, quote: f.quote, why: f.why });
export async function checkWords(req: WordsRequest, o: {
    read?: boolean;
    fix?: boolean;
    rounds?: number;
} = {}): Promise<WordsResult> {
    const sources = [req.facts, req.about, req.buyerWords].filter(Boolean).join("\n");
    const faultsOf = (lines: WordLine[]) => wordFaults(lines, { stage: req.stage, voice: req.voice, own: req.own, buyerWords: req.buyerWords?.toLowerCase(), names: req.counted?.names ?? [req.brandName], units: req.counted?.units, held: req.counted?.held, facts: sources });
    const lines = req.lines.map((l) => ({ ...l }));
    const ids = lines.map((l) => l.id);
    const changed: WordsResult["changed"] = [];
    const refused: WordsResult["refused"] = [];
    const found: LineFault[] = [];
    let open: ReadFault[] = [];
    let stands = new Set<string>();
    let toRead = lines;
    for (let round = 0; round < (o.rounds ?? 1); round++) {
        const code = faultsOf(toRead);
        const read = o.read === false || !toRead.length ? [] : await readWords({ ...req, lines: toRead }, code);
        const whole = (f: ReadFault) => (f.test === "story" || f.test === "flow") && lines.some((l) => l.id === f.id && isLong(l));
        const now = [...code.map(fromCode), ...read.filter((f) => !whole(f)).map(fromRead)];
        if (round === 0)
            found.push(...now, ...read.filter(whole).map(fromRead));
        const touched = new Set(toRead.map((l) => l.id));
        open = [...open.filter((f) => !touched.has(f.id)), ...read.filter((f) => !whole(f) || f.severity === "high")];
        if (!now.length || o.fix === false)
            break;
        const out = await fixWords({ ...req, lines }, now);
        stands = new Set([...stands, ...out.stands.map((s) => ownId(s.id, ids)).filter((x): x is string => !!x)]);
        const patched = new Set<string>();
        for (const c of out.changes) {
            const line = lines.find((l) => l.id === ownId(c.id, ids));
            if (!line)
                continue;
            const problem = patchProblem(line, c, `${req.facts ?? ""}\n${req.about}`, isLong(line) ? undefined : req.max?.[line.id]);
            const to = problem ? null : applyPatch(line, c);
            const worse = to != null && (faultsOf([{ ...line, text: to }]).length > faultsOf([line]).length || (saidTwice(to) && !saidTwice(line.text)));
            if (problem || to == null || worse) {
                refused.push({ id: line.id, text: c.text.slice(0, 200), why: problem ?? (worse ? "it has more faults than the line it replaces" : "nothing to replace") });
                continue;
            }
            if (to === line.text)
                continue;
            changed.push({ id: line.id, from: c.find.trim() || line.text, to: c.find.trim() ? c.text.trim() : to, why: now.filter((f) => f.id === line.id).map((f) => f.why).join(" ") });
            line.text = to;
            patched.add(line.id);
        }
        open = open.filter((f) => !patched.has(f.id));
        toRead = lines.filter((l) => patched.has(l.id));
        if (!toRead.length)
            break;
    }
    const left = [...faultsOf(lines).map(fromCode), ...open.filter((f) => !stands.has(f.id)).map(fromRead)];
    return { lines, changed, refused, left, found };
}
export const leftLine = (f: LineFault) => `"${f.quote}": ${f.why}`;
