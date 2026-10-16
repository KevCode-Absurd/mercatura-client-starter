import type { HookGrades, ScriptLine } from "@/db/schema";
import { speechPace, type SpeechPace } from "./pace";
export const wordCount = (s: string) => (s.match(/[A-Za-z0-9'’,.$-]+/g) ?? []).filter((w) => /[A-Za-z0-9]/.test(w)).length;
export function scriptWords(lines: ScriptLine[]): number {
    return lines.reduce((n, l) => n + wordCount(l.text), 0);
}
export type SpeakerAge = string | null | undefined;
export function paceOfWords(words: number, age?: SpeakerAge): SpeechPace {
    const plain = speechPace(age);
    return words * 10 > 60 * Math.round(plain.rate * 10) ? speechPace(age, { long: true }) : plain;
}
export function secondsForWords(words: number, age?: SpeakerAge): number {
    return Math.round((Math.max(0, words) * 10) / Math.round(paceOfWords(words, age).rate * 10));
}
export function readSeconds(lines: ScriptLine[], age?: SpeakerAge): number {
    return secondsForWords(scriptWords(lines), age);
}
export function aboutLength(seconds: number): string {
    const s = Math.max(0, Math.round(seconds));
    const min = Math.floor(s / 60);
    if (!min)
        return `about ${s} s`;
    return s % 60 ? `about ${min} min ${s % 60} s` : `about ${min} min`;
}
export function hookGoodEnough(g: HookGrades): boolean {
    const values = [g.clarity, g.relevance, g.novelty, g.specificity, g.credibility];
    return g.clarity >= 3 && values.filter((v) => v >= 4).length >= 2;
}
export function jaccard3(a: string, b: string): number {
    const grams = (s: string) => {
        const w = s.toLowerCase().match(/[a-z0-9']+/g) ?? [];
        const out = new Set<string>();
        for (let i = 0; i + 2 < w.length; i++)
            out.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`);
        return out;
    };
    const A = grams(a);
    const B = grams(b);
    if (!A.size && !B.size)
        return 0;
    let inter = 0;
    for (const g of A)
        if (B.has(g))
            inter++;
    return inter / (A.size + B.size - inter);
}
