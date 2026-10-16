import { factRuleChecks } from "./fact-rules";
import { copyRuleChecks, readingGradeOf, voiceRuleChecks, weakEndings, type VoiceProfile } from "./voice-rules";
import type { AuditItem, Guardrail, HookVariant, ReferenceMode, ScriptAxes, ScriptLine } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import { lengthWords } from "../copy/stage";
import { scriptWords } from "../script-metrics";
import { LENGTH_SECONDS, OBJECTION_CLASSES, type LengthPreset, type ObjectionClass } from "../taxonomy";
export interface AuditContext {
    brand: BrandBrain;
    axes: ScriptAxes;
    themeObjectionClasses: Map<string, ObjectionClass[]>;
    guardrails: {
        theme_id: string;
        label: string;
        guardrail: Guardrail;
    }[];
    mode?: ReferenceMode | null;
    freeOrder?: boolean;
    targetWords?: number;
    voice?: VoiceProfile;
    speaker?: string | null;
}
export interface AuditInput {
    lines: ScriptLine[];
    hook_variants: Pick<HookVariant, "text" | "overlay">[];
}
const pass = (check: string, message: string): AuditItem => ({ check, status: "pass", message });
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const phraseRegex = (phrase: string) => new RegExp(`(?<![A-Za-z])${phrase.trim().split(/\s+/).map(esc).join("\\s+")}(?![A-Za-z])`, "i");
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => /[A-Za-z0-9]/.test(s));
const words = (text: string) => text.match(/[A-Za-z0-9'’]+/g) ?? [];
export function syllables(word: string): number {
    const w = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!w)
        return /\d/.test(word) ? 1 : 0;
    if (w.length <= 3)
        return 1;
    const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
    return Math.max(1, groups?.length ?? 1);
}
export function readingGrade(text: string): number {
    const s = sentences(text);
    const w = words(text);
    if (!s.length || !w.length)
        return 0;
    const syl = w.reduce((n, x) => n + syllables(x), 0);
    return 0.39 * (w.length / s.length) + 11.8 * (syl / w.length) - 15.59;
}
export function sentenceVariation(text: string): number {
    const lens = sentences(text).map((s) => words(s).length);
    if (lens.length < 3)
        return 1;
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
    return mean ? sd / mean : 0;
}
export const UNCONTRACTED = /\b(do not|does not|did not|cannot|can not|will not|would not|should not|could not|is not|are not|was not|were not|have not|has not|had not|it is|that is|you are|they are|we are|i am|i have|you have|i would|you will|i will)\b/i;
export const CONTRAST_NEGATION = /\b(?:isn't|is not|it's not|its not|wasn't|was not|aren't|not about|not just|never about)\b[^.?!]{0,70}[,.;:]\s*(?:it's|it is|it was|they're|that's|this is|you're)\b|\b(you're|we're|they're|i'm|he's|she's|it's)\s+not\s+(\w+ing)\b[^.?!]{0,70}[,.;:]\s*\1\s+\2\b|\b(you|we|they|i)\s+(?:don't|do not|didn't|did not)\s+(\w+)\b[^.?!]{0,70}[,.;:]\s*\3\s+\4\w*\b/i;
const EM_DASH = /[—–]|\s--\s/;
const NO_PROMISE_LENGTHS = new Set(["15s"]);
const UNTRACED_OK = new Set(["bridge", "cta", "retention"]);
export function auditDeterministic(script: AuditInput, ctx: AuditContext): AuditItem[] {
    const { lines } = script;
    const items: AuditItem[] = [];
    const all = lines.map((l) => l.text).join(" ");
    const firstOf = (beat: string) => lines.findIndex((l) => l.beat === beat);
    const story = ctx.axes.person === "first";
    const promise = firstOf("promise");
    const mechanism = firstOf("mechanism");
    if (promise === -1 && !NO_PROMISE_LENGTHS.has(ctx.axes.length)) {
        items.push({ check: "promise_before_mechanism", status: "fail", message: "No promise line. Say what they get, in 1 sentence." });
    }
    else if (promise !== -1 && mechanism !== -1 && mechanism < promise && !story) {
        items.push({ check: "promise_before_mechanism", status: "fail", message: "The mechanism comes before the promise. Say what they get first.", line_index: mechanism });
    }
    else {
        items.push(pass("promise_before_mechanism", story && mechanism !== -1 && mechanism < promise ? "Promise follows the mechanism (allowed in a 1st person story)" : "Promise comes before the mechanism"));
    }
    const names = [ctx.brand.brand.name, ...ctx.brand.products.map((p) => p.name)].filter((n) => n.trim().length > 2);
    const landing = mechanism !== -1 ? mechanism : firstOf("offer");
    const early = lines.findIndex((l, i) => (landing === -1 || i < landing) && l.beat !== "offer" && names.some((n) => phraseRegex(n).test(l.text)));
    items.push(early !== -1
        ? { check: "product_named_late", status: "warn", message: "The product is named before the mechanism lands. Show it first, name it later.", line_index: early }
        : pass("product_named_late", "Product not named before the mechanism"));
    const claims = new Map(ctx.brand.claims.map((c) => [c.id, c]));
    let claimsOk = true;
    lines.forEach((l, i) => {
        if (l.beat !== "mechanism" && l.beat !== "proof")
            return;
        const bad = l.claim_ids.filter((id) => claims.get(id)?.status !== "substantiated");
        if (!l.claim_ids.length) {
            claimsOk = false;
            items.push({ check: "claims_substantiated", status: "fail", message: `The ${l.beat} line cites no claim from the brand brain.`, line_index: i });
        }
        else if (bad.length) {
            claimsOk = false;
            items.push({ check: "claims_substantiated", status: "fail", message: `Cites ${bad.join(", ")}, which ${bad.length > 1 ? "aren't" : "isn't"} a substantiated claim.`, line_index: i });
        }
    });
    if (claimsOk)
        items.push(pass("claims_substantiated", "Mechanism and proof lines cite substantiated claims"));
    const texts: {
        text: string;
        line_index?: number;
        where: string;
    }[] = [
        ...lines.flatMap((l, i) => [
            { text: l.text, line_index: i, where: `line ${i + 1}` },
            ...(l.on_screen ? [{ text: l.on_screen, line_index: i, where: `on-screen text, line ${i + 1}` }] : []),
        ]),
        ...script.hook_variants.flatMap((h, i) => [
            { text: h.text, where: `hook variant ${i + 1}` },
            ...(h.overlay ? [{ text: h.overlay, where: `hook variant ${i + 1} overlay` }] : []),
        ]),
    ];
    let forbiddenOk = true;
    for (const phrase of ctx.brand.forbidden_claims) {
        const re = phraseRegex(phrase);
        for (const t of texts) {
            if (re.test(t.text)) {
                forbiddenOk = false;
                items.push({ check: "forbidden_claims", status: "fail", message: `Forbidden claim "${phrase}" in ${t.where}.`, line_index: t.line_index });
            }
        }
    }
    if (forbiddenOk)
        items.push(pass("forbidden_claims", "No forbidden claims"));
    let guardOk = true;
    for (const g of ctx.guardrails) {
        if (!g.guardrail.applies)
            continue;
        for (const phrase of g.guardrail.banned) {
            const re = phraseRegex(phrase);
            for (const t of texts) {
                if (re.test(t.text)) {
                    guardOk = false;
                    items.push({ check: "guardrails", status: "fail", message: `"${phrase}" in ${t.where} breaks the guardrail from "${g.label}": ${g.guardrail.rule}`, line_index: t.line_index });
                }
            }
        }
    }
    if (guardOk)
        items.push(pass("guardrails", `Failure-mode guardrails respected (${ctx.guardrails.filter((g) => g.guardrail.applies).length} rules)`));
    const order = (c: ObjectionClass) => OBJECTION_CLASSES.indexOf(c);
    let last = -1;
    let outOfOrder = -1;
    lines.forEach((l, i) => {
        if (l.beat !== "objection" && l.beat !== "risk_reversal")
            return;
        const cls = l.theme_ids.flatMap((id) => ctx.themeObjectionClasses.get(id) ?? []).map(order).filter((n) => n >= 0);
        if (!cls.length)
            return;
        const latest = Math.max(...cls);
        if (latest < last && outOfOrder === -1)
            outOfOrder = i;
        last = Math.max(last, latest);
    });
    items.push(outOfOrder !== -1
        ? { check: "objection_order", status: "warn", message: "Objections are out of order (not for me, won't work, not for me specifically, not worth it, what if I'm wrong, later).", line_index: outOfOrder }
        : pass("objection_order", "Objections in class order"));
    const stiff = lines.findIndex((l) => UNCONTRACTED.test(l.text));
    items.push(stiff !== -1
        ? { check: "contractions", status: "warn", message: `Use a contraction: "${lines[stiff].text.match(UNCONTRACTED)![0]}".`, line_index: stiff }
        : pass("contractions", "Contractions used"));
    const grade = readingGrade(all);
    const maxGrade = readingGradeOf(ctx.voice);
    const who = ctx.voice?.audience === "informed" ? "an audience that knows the category" : ctx.voice?.audience === "expert" ? "a professional audience" : "a general audience";
    items.push(grade > maxGrade ? { check: "reading_level", status: "warn", message: `Reading level is grade ${grade.toFixed(1)}. For ${who}, aim for ${maxGrade} or below.` } : pass("reading_level", `Reading level grade ${Math.max(0, grade).toFixed(1)} (${who}: ${maxGrade} or below)`));
    const cv = sentenceVariation(all);
    items.push(cv < 0.25 ? { check: "sentence_variation", status: "warn", message: "Sentences are all about the same length. Try long, long, short." } : pass("sentence_variation", "Sentence length varies"));
    const person = ctx.axes.person === "first" || ctx.axes.person === "second" || ctx.axes.person === "third" ? ctx.axes.person : undefined;
    const voiced = voiceRuleChecks({ lines: lines.map((l) => ({ text: l.text })), grade: maxGrade, person: ctx.mode === "exact" ? undefined : person, spoken: !ctx.axes.native, keyLines: [lines.length - 1] });
    for (const check of ["breath", "staccato", "rhythm", "last_word", "person"]) {
        const hit = voiced.find((v) => v.check === check);
        if (hit)
            items.push(hit);
    }
    if (!voiced.length)
        items.push(pass("voice_rules", "Sayable: no breathless sentence, no staccato run, strong last words, 1 person"));
    const empty = copyRuleChecks(lines.map((l) => ({ text: `${l.text} ${l.on_screen ?? ""}` })));
    for (const check of ["platitude", "empty_urgency", "absolute_claim"]) {
        const hit = empty.find((v) => v.check === check);
        if (hit)
            items.push(hit);
    }
    if (ctx.mode !== "exact")
        items.push(...factRuleChecks(lines, script.hook_variants, { brand: ctx.brand, person, asked: ctx.axes.asked }));
    const tell = lines.findIndex((l) => CONTRAST_NEGATION.test(l.text) || EM_DASH.test(l.text));
    items.push(tell !== -1
        ? { check: "ai_tells", status: "warn", message: EM_DASH.test(lines[tell].text) ? "Em dash. Use a full stop or comma." : `Contrast negation ("it's not X, it's Y"). Say the point directly.`, line_index: tell }
        : pass("ai_tells", "No contrast negation or em dashes"));
    const target = ctx.axes.flow && !ctx.axes.length_chosen ? 0 : ctx.targetWords || (ctx.axes.length in LENGTH_SECONDS ? lengthWords(ctx.axes.length as LengthPreset, ctx.speaker) : 0);
    const count = scriptWords(lines);
    if (target) {
        const off = (count - target) / target;
        items.push(Math.abs(off) > 0.15
            ? { check: "length_fit", status: "warn", message: `${count} words is ${off > 0 ? "over" : "under"} the ${ctx.targetWords ? "reference's" : ctx.axes.length} target of about ${target}.` }
            : pass("length_fit", `${count} words fits ${ctx.targetWords ? "the reference" : ctx.axes.length} (target about ${target})`));
    }
    const untraced = lines.findIndex((l) => !UNTRACED_OK.has(l.beat) && !l.theme_ids.length && !l.claim_ids.length);
    items.push(untraced !== -1
        ? { check: "evidence_trace", status: "warn", message: `The ${lines[untraced].beat} line has no evidence (no theme or claim).`, line_index: untraced }
        : pass("evidence_trace", "Every line traced to evidence"));
    return forMode(items, ctx.freeOrder && !ctx.mode ? "structure" : ctx.mode);
}
const STRUCTURE_CHECKS = new Set(["promise_before_mechanism", "product_named_late", "objection_order"]);
const EXACT_KEEPS = new Set(["forbidden_claims", "guardrails"]);
function forMode(items: AuditItem[], mode: ReferenceMode | null | undefined): AuditItem[] {
    if (mode === "structure")
        return items.filter((i) => !STRUCTURE_CHECKS.has(i.check));
    if (mode !== "exact")
        return items;
    const unbacked = items.filter((i) => i.check === "claims_substantiated" && i.status === "fail");
    return [
        ...items.filter((i) => EXACT_KEEPS.has(i.check)),
        unbacked.length
            ? { check: "claims_substantiated", status: "warn" as const, message: `Copied from the reference: ${unbacked.length} mechanism or proof line${unbacked.length === 1 ? " isn't" : "s aren't"} tied to an approved claim. Check the brand can support ${unbacked.length === 1 ? "it" : "them"}.`, line_index: unbacked[0].line_index }
            : pass("claims_substantiated", "No mechanism or proof lines need a claim"),
    ];
}
export const auditSummary = (items: AuditItem[]) => ({
    fails: items.filter((i) => i.status === "fail").length,
    warnings: items.filter((i) => i.status === "warn").length,
});
export function voiceFlags(lines: {
    text: string;
}[], maxWords = 28): {
    line: number;
    flag: string;
}[] {
    const out: {
        line: number;
        flag: string;
    }[] = [];
    lines.forEach((l, i) => {
        const stiff = l.text.match(UNCONTRACTED);
        if (stiff)
            out.push({ line: i, flag: `uncontracted: "${stiff[0]}"` });
        if (EM_DASH.test(l.text))
            out.push({ line: i, flag: "em dash" });
        if (CONTRAST_NEGATION.test(l.text))
            out.push({ line: i, flag: `contrast negation ("it's not X, it's Y")` });
        const long = sentences(l.text).find((s) => words(s).length > maxWords);
        if (long)
            out.push({ line: i, flag: `a sentence of ${words(long).length} words: "${long.slice(0, 60)}..."` });
        const lastSentence = sentences(l.text).at(-1) ?? "";
        if (weakEndings(lastSentence).length)
            out.push({ line: i, flag: `ends on a word with no weight: "...${lastSentence.slice(-40)}"` });
    });
    return out;
}
