import type { ScriptLine } from "@/db/schema";
export type WordOp = {
    text: string;
    kind: "same" | "add" | "del";
};
function lcs<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean): number[][] {
    const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--)
        for (let j = b.length - 1; j >= 0; j--)
            dp[i][j] = eq(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    return dp;
}
export function wordDiff(before: string, after: string): WordOp[] {
    const a = before.split(/(\s+)/).filter(Boolean);
    const b = after.split(/(\s+)/).filter(Boolean);
    const dp = lcs(a, b, (x, y) => x === y);
    const out: WordOp[] = [];
    let i = 0;
    let j = 0;
    while (i < a.length || j < b.length) {
        if (i < a.length && j < b.length && a[i] === b[j]) {
            out.push({ text: b[j], kind: "same" });
            i++;
            j++;
        }
        else if (i < a.length && (j >= b.length || dp[i + 1][j] >= dp[i][j + 1])) {
            out.push({ text: a[i], kind: /\S/.test(a[i]) ? "del" : "same" });
            i++;
        }
        else {
            out.push({ text: b[j], kind: /\S/.test(b[j]) ? "add" : "same" });
            j++;
        }
    }
    return out;
}
export type LineDiff = {
    kind: "same";
    line: ScriptLine;
} | {
    kind: "added";
    line: ScriptLine;
} | {
    kind: "removed";
    line: ScriptLine;
} | {
    kind: "changed";
    before: ScriptLine;
    after: ScriptLine;
    words: WordOp[];
};
const sameLine = (x: ScriptLine, y: ScriptLine) => x.beat === y.beat && x.text === y.text && (x.on_screen ?? "") === (y.on_screen ?? "") && (x.visual_note ?? "") === (y.visual_note ?? "");
export function lineDiff(before: ScriptLine[], after: ScriptLine[]): LineDiff[] {
    const dp = lcs(before, after, sameLine);
    const out: LineDiff[] = [];
    let gone: ScriptLine[] = [];
    let fresh: ScriptLine[] = [];
    const flush = () => {
        const pairs = Math.min(gone.length, fresh.length);
        for (let k = 0; k < pairs; k++)
            out.push({ kind: "changed", before: gone[k], after: fresh[k], words: wordDiff(gone[k].text, fresh[k].text) });
        for (const line of gone.slice(pairs))
            out.push({ kind: "removed", line });
        for (const line of fresh.slice(pairs))
            out.push({ kind: "added", line });
        gone = [];
        fresh = [];
    };
    let i = 0;
    let j = 0;
    while (i < before.length || j < after.length) {
        if (i < before.length && j < after.length && sameLine(before[i], after[j])) {
            flush();
            out.push({ kind: "same", line: after[j] });
            i++;
            j++;
        }
        else if (i < before.length && (j >= after.length || dp[i + 1][j] >= dp[i][j + 1]))
            gone.push(before[i++]);
        else
            fresh.push(after[j++]);
    }
    flush();
    return out;
}
