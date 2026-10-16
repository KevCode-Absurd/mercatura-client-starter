import type { Segment } from "@/db/schema";
export interface SegmentInput {
    label: string;
    role: Segment["role"];
    text: string;
}
export function buildText(parts: SegmentInput[]): {
    text: string;
    segments: Segment[];
} {
    let text = "";
    const segments: Segment[] = [];
    for (const p of parts) {
        if (!p.text)
            continue;
        if (text)
            text += "\n\n";
        const start = text.length;
        text += p.text;
        segments.push({ label: p.label, role: p.role, start, end: text.length });
    }
    return { text, segments };
}
const normalise = (s: string) => s.replace(/\s+/g, " ");
export function locateQuote(source: string, quote: string): {
    start: number;
    end: number;
} | null {
    const exact = source.indexOf(quote);
    if (exact >= 0)
        return { start: exact, end: exact + quote.length };
    const map: number[] = [];
    let norm = "";
    for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (/\s/.test(ch)) {
            if (norm.endsWith(" "))
                continue;
            norm += " ";
        }
        else
            norm += ch;
        map.push(i);
    }
    const q = normalise(quote).trim();
    const at = norm.indexOf(q);
    if (at < 0)
        return null;
    return { start: map[at], end: map[at + q.length - 1] + 1 };
}
export interface Highlight {
    start: number;
    end: number;
    id: string;
    color: string;
}
export interface Piece {
    text: string;
    highlights: Highlight[];
}
export function splitWithHighlights(text: string, start: number, end: number, hls: Highlight[]): Piece[] {
    const inside = hls.filter((h) => h.end > start && h.start < end);
    const cuts = new Set<number>([start, end]);
    for (const h of inside) {
        cuts.add(Math.max(start, h.start));
        cuts.add(Math.min(end, h.end));
    }
    const points = [...cuts].sort((a, b) => a - b);
    const pieces: Piece[] = [];
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        if (a === b)
            continue;
        pieces.push({ text: text.slice(a, b), highlights: inside.filter((h) => h.start <= a && h.end >= b) });
    }
    return pieces;
}
