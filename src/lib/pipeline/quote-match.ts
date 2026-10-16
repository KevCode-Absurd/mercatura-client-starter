import { locateQuote } from "../segments";
export const FUZZY_THRESHOLD = 0.92;
export type QuoteMatch = {
    kind: "exact";
    start: number;
    end: number;
} | {
    kind: "fuzzy";
    start: number;
    end: number;
    ratio: number;
} | {
    kind: "none";
    bestRatio: number;
};
export function similarity(a: string, b: string): number {
    if (a === b)
        return 1;
    if (!a.length || !b.length)
        return 0;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b.length; j++) {
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        prev = cur;
    }
    return 1 - prev[b.length] / Math.max(a.length, b.length);
}
const norm = (s: string) => s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
export function matchQuote(source: string, quote: string): QuoteMatch {
    const exact = locateQuote(source, quote);
    if (exact)
        return { kind: "exact", ...exact };
    const words = [...source.matchAll(/\S+/g)].map((m) => ({ w: m[0], start: m.index!, end: m.index! + m[0].length }));
    const qWords = norm(quote).split(" ").filter(Boolean);
    if (!qWords.length || !words.length)
        return { kind: "none", bestRatio: 0 };
    const qSet = new Set(qWords.map((w) => w.replace(/[^\w']/g, "")));
    const qNorm = norm(quote);
    let best = { ratio: 0, start: 0, end: 0 };
    for (let i = 0; i < words.length; i++) {
        for (let len = Math.max(1, qWords.length - 2); len <= qWords.length + 2 && i + len <= words.length; len++) {
            const win = words.slice(i, i + len);
            const overlap = win.filter((x) => qSet.has(norm(x.w).replace(/[^\w']/g, ""))).length / qWords.length;
            if (overlap < 0.6)
                continue;
            const span = source.slice(win[0].start, win[win.length - 1].end);
            const r = similarity(norm(span), qNorm);
            if (r > best.ratio)
                best = { ratio: r, start: win[0].start, end: win[win.length - 1].end };
        }
    }
    if (best.ratio >= FUZZY_THRESHOLD)
        return { kind: "fuzzy", start: best.start, end: best.end, ratio: best.ratio };
    return { kind: "none", bestRatio: best.ratio };
}
