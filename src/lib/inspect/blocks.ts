export interface Block {
    label: string;
    kind: "tag" | "heading" | "opening";
    text: string;
    chars: number;
    parts: string[];
}
const OPEN = /^<([a-zA-Z][\w-]*)((?:\s+[\w-]+="[^"]*")*)\s*>\s*$/;
const HEAD = /^(#{1,2})\s+(.+?)\s*$/;
const SUB = /^#{2,4}\s+(.+?)\s*$/;
const tagLabel = (tag: string, attrs: string) => {
    const name = attrs.match(/\sname="([^"]*)"/)?.[1];
    return name ? `${tag}: ${name}` : tag;
};
export function splitBlocks(text: string): Block[] {
    const lines = text.split(/\r?\n/);
    const out: Block[] = [];
    let cur: {
        label: string;
        kind: Block["kind"];
        lines: string[];
    } = { label: "Opening", kind: "opening", lines: [] };
    let closing: string | null = null;
    const push = () => {
        const body = cur.lines.join("\n");
        if (body.trim()) {
            const inner = cur.kind === "tag" ? cur.lines.slice(1) : cur.lines.slice(cur.kind === "heading" ? 1 : 0);
            out.push({ label: cur.label, kind: cur.kind, text: body, chars: body.length + 1, parts: inner.map((l) => (cur.kind === "tag" ? l.match(/^#{1,4}\s+(.+?)\s*$/) : l.match(SUB))?.[1]).filter((x): x is string => !!x) });
        }
    };
    for (const line of lines) {
        if (closing) {
            cur.lines.push(line);
            if (line.trim() === closing) {
                push();
                closing = null;
                cur = { label: "", kind: "opening", lines: [] };
            }
            continue;
        }
        const open = line.match(OPEN);
        if (open && lines.some((l) => l.trim() === `</${open[1]}>`)) {
            push();
            cur = { label: tagLabel(open[1], open[2] ?? ""), kind: "tag", lines: [line] };
            closing = `</${open[1]}>`;
            continue;
        }
        const head = line.match(HEAD);
        if (head) {
            push();
            cur = { label: head[2], kind: "heading", lines: [line] };
            continue;
        }
        if (!cur.label)
            cur = { label: "(text between blocks)", kind: "opening", lines: [] };
        cur.lines.push(line);
    }
    push();
    return out;
}
export const blockKey = (label: string) => label.replace(/\b(img|scr|con|set|job|thm|ins)_\d+\b/g, "$1_N");
export function blockTokens(blocks: Block[], totalTokens: number): number[] {
    const chars = blocks.reduce((n, b) => n + b.chars, 0);
    return blocks.map((b) => (chars ? Math.round((b.chars / chars) * totalTokens) : 0));
}
export function signatureLines(md: string): string[] {
    const body = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").replace(/<!--[\s\S]*?-->/g, "");
    return [...new Set(body.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length >= 40 && !/^#/.test(l) && !/^[|\-\s:]+$/.test(l) && !/\{[a-z_]+\}/.test(l)))];
}
