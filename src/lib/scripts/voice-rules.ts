import type { AuditItem } from "@/db/schema";
import { isStoryStage, termsRule } from "../copy/stage";
import type { AwarenessStage } from "../taxonomy";
export interface VoiceProfile {
    audience: "general" | "informed" | "expert";
    reading_grade: number;
    terms: string[];
    why: string;
    by: string;
}
export const GRADE_FOR: Record<VoiceProfile["audience"], number> = { general: 8, informed: 9, expert: 11 };
export const DEFAULT_VOICE: VoiceProfile = { audience: "general", reading_grade: 8, terms: [], why: "No analysis yet: a general audience is assumed.", by: "default" };
export const TOP_GRADE = 9;
export const readingGradeOf = (v: (Pick<VoiceProfile, "reading_grade"> & Partial<Pick<VoiceProfile, "audience" | "by">>) | null | undefined): number => {
    const grade = v?.audience && v.by && v.by !== "you" ? GRADE_FOR[v.audience] : (v?.reading_grade ?? DEFAULT_VOICE.reading_grade);
    return Math.max(1, Math.min(TOP_GRADE, Math.round(grade)));
};
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => /[A-Za-z0-9]/.test(s));
const words = (text: string) => text.match(/[A-Za-z0-9'’]+/g) ?? [];
const WEAK_END = new Set("it this that these those there here of to for with from at by in on as than then too also though anyway is are was were be been am do does did have has had so and or but if when which who what them they he she we i me us you your its a an the really very just".split(" "));
const lastWord = (s: string) => (words(s).at(-1) ?? "").toLowerCase().replace(/[’']s$/, "");
export function weakEndings(text: string): string[] {
    return sentences(text).filter((s) => words(s).length >= 4 && WEAK_END.has(lastWord(s)));
}
export function staccatoRun(text: string): number {
    let best = 0;
    let run = 0;
    for (const s of sentences(text)) {
        run = words(s).length <= 4 ? run + 1 : 0;
        best = Math.max(best, run);
    }
    return best;
}
export function sameLengthRun(text: string): number {
    const lens = sentences(text).map((s) => words(s).length);
    let best = lens.length ? 1 : 0;
    let run = 1;
    for (let i = 1; i < lens.length; i++) {
        run = Math.abs(lens[i] - lens[i - 1]) <= 2 ? run + 1 : 1;
        best = Math.max(best, run);
    }
    return best;
}
export function breathless(text: string, maxWords: number): string[] {
    return sentences(text).filter((s) => words(s).length > maxWords);
}
export function dominantPerson(text: string): {
    person: "first" | "second" | "third" | "none";
    counts: Record<"first" | "second" | "third", number>;
} {
    const t = ` ${text.toLowerCase().replace(/[’]/g, "'")} `;
    const n = (re: RegExp) => (t.match(re) ?? []).length;
    const counts = { first: n(/\b(i|i'm|i've|i'd|i'll|me|my|mine|myself)\b/g), second: n(/\b(you|you're|you've|you'd|you'll|your|yours|yourself)\b/g), third: n(/\b(he|she|they|him|her|his|hers|them|their|he's|she's|they're)\b/g) };
    const top = (Object.entries(counts) as [
        "first" | "second" | "third",
        number
    ][]).sort((a, b) => b[1] - a[1])[0];
    return { person: top[1] >= 2 ? top[0] : "none", counts };
}
export interface VoiceRuleInput {
    lines: {
        text: string;
        where?: string;
    }[];
    grade: number;
    person?: "first" | "second" | "third";
    spoken: boolean;
    keyLines?: number[];
    index?: number;
}
export function voiceRuleChecks(input: VoiceRuleInput): AuditItem[] {
    const out: AuditItem[] = [];
    const all = input.lines.map((l) => l.text).join(" ");
    const at = input.index != null ? { line_index: input.index } : {};
    const max = input.spoken ? 28 : 40;
    const long = input.lines.findIndex((l) => breathless(l.text, max).length > 0);
    if (long !== -1) {
        const s = breathless(input.lines[long].text, max)[0];
        out.push({ check: "breath", status: "warn", message: `A sentence of ${words(s).length} words ("${s.slice(0, 50)}...") is too long to ${input.spoken ? "say in 1 breath" : "take in at once"}. 1 idea per sentence: split it.`, line_index: input.index ?? long });
    }
    const stac = staccatoRun(all);
    if (stac >= 4)
        out.push({ check: "staccato", status: "warn", message: `${stac} very short sentences in a row. That reads as a machine.`, ...at });
    const same = sameLengthRun(all);
    if (same >= 5 && stac < 4)
        out.push({ check: "rhythm", status: "warn", message: `${same} sentences in a row of about the same length.`, ...at });
    const total = sentences(all).length;
    const weak = weakEndings(all);
    const keyWeak = (input.keyLines ?? []).map((i) => input.lines[i]).filter((l) => l && weakEndings(sentences(l.text).at(-1) ?? "").length > 0);
    if (keyWeak.length)
        out.push({ check: "last_word", status: "warn", message: `"${keyWeak[0].text.slice(-60)}" ends on a word with no weight.`, ...at });
    else if (total >= 5 && weak.length / total > 0.35)
        out.push({ check: "last_word", status: "warn", message: `${weak.length} of ${total} sentences end on a word with no weight (like "${lastWord(weak[0])}").`, ...at });
    if (input.person) {
        const d = dominantPerson(all);
        if (d.person !== "none" && d.person !== input.person && d.counts[d.person] > d.counts[input.person] * 2)
            out.push({ check: "person", status: "warn", message: `Asked for ${input.person} person, but it is written mostly in the ${d.person} person. Hold 1 person throughout (the close may turn to the viewer).`, ...at });
    }
    return out;
}
export function voiceRulesText(v: VoiceProfile, spoken = true, plain = false, stage?: AwarenessStage | null): string {
    const PAGE = /^(1 idea per sentence|Vary sentence length)/;
    return [
        "These are the defaults for a brand that has recorded nothing on a point. Where the brand's own voice (given with this request) differs, the brand's way wins: a word, a rhythm, a sentence length, an emoji or an exclamation mark that its own published lines use is its sound, not a fault.",
        `Audience: ${v.audience === "general" ? "the general public" : v.audience === "informed" ? "people who know this category's terms" : "professionals in the field"}. Reading level: grade ${readingGradeOf(v)} or below. ${termsRule(stage, v.terms)}`,
        plain && isStoryStage(stage) ? 'A sentence may run long where a person would say it in 1 go, joined by "and", "so" or "because". Never cut a told sentence into short flat ones.' : "",
        "1 idea per sentence.",
        "Vary sentence length: never 4 very short sentences in a row, and never a run of sentences all the same length.",
        "Contractions always: can't, don't, it's, you'll. Never \"do not\" or \"it is\" unless the stress is deliberate.",
        spoken ? `Every sentence can be said in 1 breath at speaking pace (28 words at most). Read it aloud in your head: rewrite any line you would trip on or be embarrassed to say.` : "Copy that is read: paragraphs of 1 or 2 sentences, no sentence over 40 words.",
        "Hold 1 person and 1 tense. First person for a story (past tense), third for narration. Present tense for how the mechanism works.",
        "No \"it's not X, it's Y\". No em dashes.",
    ].filter((x) => x && (!plain || !PAGE.test(x))).map((x) => `- ${x}`).join("\n");
}
export const PLATITUDE = /\b(premium|high[- ]quality|superior|unmatched|world[- ]class|best[- ]in[- ]class|the best|number one|#1|cutting[- ]edge|state[- ]of[- ]the[- ]art|revolutionary|game[- ]chang\w+|next[- ]level|ultimate|unparalleled|top[- ]quality|finest)\b/i;
export const EMPTY_URGENCY = /\b(limited time( only)?|don't miss out|act now|hurry|while (stocks|supplies) last|selling fast|before it's (too late|gone))\b/i;
export function copyRuleChecks(lines: {
    text: string;
    where?: string;
}[], index?: number): AuditItem[] {
    const out: AuditItem[] = [];
    lines.forEach((l, i) => {
        const at = { line_index: index ?? i };
        const where = l.where ? ` in ${l.where}` : "";
        const plat = l.text.match(PLATITUDE);
        if (plat)
            out.push({ check: "platitude", status: "warn", message: `"${plat[0]}"${where} is a word any competitor can use, so it says nothing. Put the fact that earns it, or cut it.`, ...at });
        const abs = l.text.match(/\b(risk[- ]free|no risk|zero risk|nothing to lose|guaranteed results?)\b/i);
        if (abs)
            out.push({ check: "absolute_claim", status: "warn", message: `"${abs[0]}"${where} promises more than a guarantee does. State the guarantee with its conditions instead.`, ...at });
        const urgent = l.text.match(EMPTY_URGENCY);
        if (urgent && !/\d|last run|this batch|until|ends/i.test(l.text))
            out.push({ check: "empty_urgency", status: "warn", message: `"${urgent[0]}"${where} is urgency with nothing behind it. Give the real reason for now (a date, a number, a limited run), or leave it out.`, ...at });
    });
    return out;
}
