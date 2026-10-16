const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function finder(phrase: string): RegExp {
    const body = phrase
        .trim()
        .split(/\s+/)
        .map((w) => escape(w).replace(/['’‘]/g, "['’‘]").replace(/["“”]/g, '["“”]'))
        .join("\\s+");
    return new RegExp(body, "i");
}
export function spliceFix(current: string, phrase: string, replacement: string): string | null {
    if (!phrase.trim())
        return replacement.trim() || null;
    const m = finder(phrase).exec(current);
    if (!m)
        return null;
    const fix = replacement.trim();
    let before = current.slice(0, m.index);
    let after = current.slice(m.index + m[0].length);
    const flat = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    const [f, a, b] = [flat(fix), flat(after), flat(before)];
    const edge = (c: string | undefined) => c === undefined || /[^a-z0-9]/.test(c);
    if (a && f.endsWith(a) && (edge(a[0]) || edge(f[f.length - a.length - 1])))
        after = "";
    if (b && f.startsWith(b) && (edge(b[b.length - 1]) || edge(f[b.length])))
        before = "";
    const out = before + fix + after;
    return out
        .replace(/[ \t]{2,}/g, " ")
        .replace(/ +([.,;:!?])/g, "$1")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .trim();
}
export const EDIT_FIELDS = "`phrase` is the exact words that fail, copied character for character from the field, and no more of the field than has to change. `fix` is the words that replace `phrase`, and only those: never the rest of the field. To change a whole short field (a headline, a label), `phrase` is the whole field.";
