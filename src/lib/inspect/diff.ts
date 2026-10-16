export interface DiffLine {
    kind: "same" | "gone" | "new" | "skip";
    text: string;
}
export function lineDiff(before: string, after: string, context = 2): DiffLine[] {
    const a = before.split(/\r?\n/);
    const b = after.split(/\r?\n/);
    const lcs: Uint32Array[] = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
    for (let i = a.length - 1; i >= 0; i--)
        for (let j = b.length - 1; j >= 0; j--)
            lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    const all: DiffLine[] = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            all.push({ kind: "same", text: a[i] });
            i++;
            j++;
        }
        else if (lcs[i + 1][j] >= lcs[i][j + 1])
            all.push({ kind: "gone", text: a[i++] });
        else
            all.push({ kind: "new", text: b[j++] });
    }
    while (i < a.length)
        all.push({ kind: "gone", text: a[i++] });
    while (j < b.length)
        all.push({ kind: "new", text: b[j++] });
    const keep = all.map((l) => l.kind !== "same");
    for (let k = 0; k < all.length; k++)
        if (all[k].kind !== "same")
            for (let d = -context; d <= context; d++)
                if (all[k + d])
                    keep[k + d] = true;
    const out: DiffLine[] = [];
    let hidden = 0;
    for (let k = 0; k < all.length; k++) {
        if (keep[k]) {
            if (hidden)
                out.push({ kind: "skip", text: `${hidden} line${hidden === 1 ? "" : "s"} the same` });
            hidden = 0;
            out.push(all[k]);
        }
        else
            hidden++;
    }
    if (hidden)
        out.push({ kind: "skip", text: `${hidden} line${hidden === 1 ? "" : "s"} the same` });
    return out;
}
