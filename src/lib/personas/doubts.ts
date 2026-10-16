import { pairDoubts } from "../scripts/flow";
import type { DoubtPair, PersonaProfile } from "./types";
export const MAX_DOUBTS = 8;
const DOUBT_MAX = 200;
const PROOF_MAX = 300;
export const LIMITS = { doubt: DOUBT_MAX, proof: PROOF_MAX };
const tidy = (s: string, n: number) => {
    const t = s.replace(/\s*[\u2014\u2013]\s*/g, ", ").replace(/\s+/g, " ").trim();
    if (t.length <= n)
        return t;
    const cut = t.slice(0, n);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "), cut.lastIndexOf('." '));
    return end > n / 3 ? cut.slice(0, end + 1) : cut.trimEnd();
};
const same = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === b.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function cleanDoubts(rows: DoubtPair[]): DoubtPair[] {
    const out: DoubtPair[] = [];
    for (const r of rows) {
        const doubt = tidy(r.doubt, DOUBT_MAX);
        if (!doubt || out.some((x) => same(x.doubt, doubt)))
            continue;
        out.push({ doubt, proof: tidy(r.proof, PROOF_MAX), by: r.by === "owner" ? "owner" : "app" });
    }
    return out.slice(0, MAX_DOUBTS);
}
export function proofLines(doubts: DoubtPair[]): string[] {
    const held = doubts.filter((d) => d.proof);
    const all = doubts.map((d) => d.doubt);
    const lines = held.map((d) => d.proof);
    for (let pass = 0; pass < 2; pass++) {
        const paired = pairDoubts(all, lines);
        held.forEach((d, i) => {
            if (paired[all.indexOf(d.doubt)]?.proof !== lines[i])
                lines[i] = `On "${d.doubt}": ${d.proof}`;
        });
    }
    return lines;
}
export function doubtsOf(p: Pick<PersonaProfile, "doubts" | "objections" | "believes" | "source">): DoubtPair[] {
    if (p.doubts)
        return p.doubts;
    const by = p.source === "hand" ? "owner" : "app";
    return cleanDoubts(pairDoubts(p.objections, p.believes ?? []).map((x) => ({ doubt: x.doubt, proof: x.proof ?? "", by })));
}
export function spareProof(p: Pick<PersonaProfile, "doubts" | "objections" | "believes" | "source">): string[] {
    const doubts = doubtsOf(p);
    const used = new Set([...proofLines(doubts), ...doubts.map((d) => d.proof)]);
    return (p.believes ?? []).filter((b) => !used.has(b));
}
export const personaForScreen = (p: PersonaProfile): PersonaProfile => ({ ...p, doubts: doubtsOf(p), believes: spareProof(p) });
export function withDoubts(rows: DoubtPair[], spare: string[] = []): {
    doubts: DoubtPair[];
    objections: string[];
    believes: string[];
} {
    const doubts = cleanDoubts(rows);
    const lines = proofLines(doubts);
    return { doubts, objections: doubts.map((d) => d.doubt), believes: [...lines, ...spare.filter((s) => s.trim() && !lines.includes(s))].slice(0, 12) };
}
export function markEdits(was: DoubtPair[], rows: {
    doubt: string;
    proof: string;
}[]): DoubtPair[] {
    return cleanDoubts(rows.map((r) => ({ doubt: r.doubt, proof: r.proof, by: was.find((w) => w.doubt === tidy(r.doubt, DOUBT_MAX) && w.proof === tidy(r.proof, PROOF_MAX))?.by ?? "owner" })));
}
export function mergeDoubts(have: DoubtPair[], written: {
    doubt: string;
    proof: string;
}[], max = 5): DoubtPair[] {
    const mine = cleanDoubts(have).filter((d) => d.by === "owner");
    const fresh = cleanDoubts(written.map((w) => ({ ...w, by: "app" as const }))).filter((w) => !mine.some((m) => same(m.doubt, w.doubt)));
    return [...mine, ...fresh].slice(0, Math.max(max, mine.length));
}
