import type { SkillPatch } from "@/db/schema";
export const LEARNED_HEADING = "## Learned from feedback";
const nl = (s: string) => (s.includes("\r\n") ? "\r\n" : "\n");
const norm = (s: string) => s.replace(/\r\n/g, "\n");
const headingKey = (s: string) => s.replace(/^#+\s*/, "").replace(/[*_`]/g, "").trim().toLowerCase();
function sections(lines: string[]): {
    at: number;
    level: number;
    key: string;
    end: number;
}[] {
    const heads = lines.map((l, i) => ({ i, m: l.match(/^(#{1,6})\s+\S/) })).filter((x) => x.m).map((x) => ({ at: x.i, level: x.m![1].length, key: headingKey(lines[x.i]) }));
    return heads.map((h, k) => ({ ...h, end: heads.slice(k + 1).find((n) => n.level <= h.level)?.at ?? lines.length }));
}
export class PatchRefused extends Error {
}
export function applyPatch(before: string, patch: SkillPatch): string {
    const eol = nl(before);
    const text = norm(patch.text).replace(/\n+$/, "").replace(/^\n+/, "");
    if (!text.trim())
        throw new PatchRefused("The change adds nothing.");
    const src = norm(before);
    const lines = src.split("\n");
    if (patch.op === "replace") {
        const old = norm(patch.old).trim();
        if (old.length < 8)
            throw new PatchRefused("The passage to replace is too short to find safely.");
        const first = src.indexOf(old);
        if (first < 0)
            throw new PatchRefused("The passage to replace is not in the file as it is now.");
        if (src.indexOf(old, first + 1) >= 0)
            throw new PatchRefused("The passage to replace is in the file more than once.");
        return (src.slice(0, first) + text + src.slice(first + old.length)).replace(/\n/g, eol);
    }
    const secs = sections(lines);
    const want = headingKey(patch.heading || "");
    const sec = want ? secs.find((s) => s.key === want) : undefined;
    if (sec) {
        let at = sec.end;
        while (at > sec.at + 1 && !lines[at - 1].trim())
            at--;
        const out = [...lines.slice(0, at), ...(lines[at - 1]?.trim() && !/^[-*\d]/.test(text) ? [""] : []), ...text.split("\n"), ...lines.slice(at)];
        return out.join(eol);
    }
    const learned = secs.find((s) => s.key === headingKey(LEARNED_HEADING));
    if (learned) {
        let at = learned.end;
        while (at > learned.at + 1 && !lines[at - 1].trim())
            at--;
        return [...lines.slice(0, at), ...text.split("\n"), ...lines.slice(at)].join(eol);
    }
    const body = src.replace(/\n+$/, "");
    return `${body}\n\n${LEARNED_HEADING}\n${text}\n`.replace(/\n/g, eol);
}
const numbers = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", "."));
const quoted = (s: string) => [...s.matchAll(/["“]([^"”\n]{2,80})["”]/g)].map((m) => m[1].toLowerCase().trim());
const headings = (s: string) => norm(s).split("\n").filter((l) => /^#{1,6}\s+\S/.test(l)).map(headingKey);
const front = (s: string) => s.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)?.[0] ?? "";
export function tightenFault(before: string, after: string): string | null {
    const a = norm(before);
    const b = norm(after);
    if (!b.trim())
        return "the file would be empty";
    if (front(a) && front(a).trim() !== front(b).trim())
        return "the lines between --- at the top changed";
    const hadH = headings(a);
    const hasH = new Set(headings(b));
    const lostH = hadH.filter((h) => !hasH.has(h));
    if (lostH.length)
        return `a heading was lost: "${lostH[0]}"`;
    const had = new Set(numbers(a));
    const has = new Set(numbers(b));
    const lostN = [...had].filter((n) => !has.has(n));
    if (lostN.length)
        return `a number was lost: ${lostN[0]}`;
    const newN = [...has].filter((n) => !had.has(n));
    if (newN.length)
        return `a number was added: ${newN[0]}`;
    const low = b.toLowerCase();
    const lostQ = quoted(a).find((q) => !low.includes(q));
    if (lostQ)
        return `a quoted phrase was lost: "${lostQ}"`;
    const alow = a.toLowerCase();
    const newQ = quoted(b).find((q) => !alow.includes(q));
    if (newQ)
        return `a quoted phrase was added: "${newQ}"`;
    if (b.length > a.length * 0.95)
        return "it is not shorter by a real margin";
    if (b.length < a.length * 0.35)
        return "it lost more than half the file, which is more than words";
    return null;
}
export const wordCount = (s: string) => (s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").match(/\S+/g) ?? []).length;
