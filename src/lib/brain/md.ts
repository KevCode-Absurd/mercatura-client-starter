export type Block = {
    kind: "para";
    text: string;
} | {
    kind: "quote";
    text: string;
} | {
    kind: "list";
    ordered: boolean;
    items: string[];
} | {
    kind: "table";
    head: string[];
    rows: string[][];
} | {
    kind: "code";
    text: string;
    lang?: string;
} | {
    kind: "rule";
};
export interface Section {
    id: string;
    level: number;
    title: string;
    blocks: Block[];
}
export interface Doc {
    title: string;
    intro: Block[];
    sections: Section[];
}
export const slug = (s: string) => s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
function cells(line: string): string[] {
    const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    return body.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}
const isSeparator = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
const isRule = (line: string) => /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line);
const bullet = (line: string) => /^\s{0,3}([-*+]|\d+[.)])\s+(.*)$/.exec(line);
function parseBlocks(lines: string[]): Block[] {
    const out: Block[] = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) {
            i++;
            continue;
        }
        if (/^\s*```/.test(line)) {
            const lang = line.trim().slice(3).trim();
            const body: string[] = [];
            i++;
            while (i < lines.length && !/^\s*```/.test(lines[i]))
                body.push(lines[i++]);
            i++;
            out.push({ kind: "code", text: body.join("\n"), ...(lang ? { lang } : {}) });
            continue;
        }
        if (isRule(line)) {
            out.push({ kind: "rule" });
            i++;
            continue;
        }
        if (/^\s*\|/.test(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
            const head = cells(line);
            const rows: string[][] = [];
            i += 2;
            while (i < lines.length && /^\s*\|/.test(lines[i])) {
                const row = cells(lines[i++]);
                rows.push(row.length > head.length ? [...row.slice(0, head.length - 1), row.slice(head.length - 1).join(" | ")] : [...row, ...Array(head.length - row.length).fill("")]);
            }
            out.push({ kind: "table", head, rows });
            continue;
        }
        if (/^\s*>/.test(line)) {
            const body: string[] = [];
            while (i < lines.length && /^\s*>/.test(lines[i]))
                body.push(lines[i++].replace(/^\s*>\s?/, ""));
            out.push({ kind: "quote", text: body.join("\n") });
            continue;
        }
        const b = bullet(line);
        if (b) {
            const ordered = /\d/.test(b[1]);
            const items: string[] = [];
            while (i < lines.length) {
                const m = bullet(lines[i]);
                if (m)
                    items.push(m[2].trim());
                else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length)
                    items[items.length - 1] += `\n${lines[i].trim()}`;
                else
                    break;
                i++;
            }
            out.push({ kind: "list", ordered, items });
            continue;
        }
        const body: string[] = [];
        while (i < lines.length && lines[i].trim() && !/^\s*```/.test(lines[i]) && !isRule(lines[i]) && !/^\s*>/.test(lines[i]) && !bullet(lines[i]) && !(/^\s*\|/.test(lines[i]) && i + 1 < lines.length && isSeparator(lines[i + 1])))
            body.push(lines[i++].trim());
        out.push({ kind: "para", text: body.join("\n") });
    }
    return out;
}
export function parseDoc(md: string): Doc {
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const doc: Doc = { title: "", intro: [], sections: [] };
    let buf: string[] = [];
    let open: Section | null = null;
    let fenced = false;
    const trail: {
        level: number;
        slug: string;
    }[] = [];
    const seen = new Map<string, number>();
    const flush = () => {
        const blocks = parseBlocks(buf);
        if (open)
            open.blocks = blocks;
        else
            doc.intro = blocks;
        buf = [];
    };
    for (const line of lines) {
        if (/^\s*```/.test(line))
            fenced = !fenced;
        const h = fenced ? null : /^(#{1,4})\s+(.*?)\s*#*\s*$/.exec(line);
        if (!h) {
            buf.push(line);
            continue;
        }
        if (h[1].length === 1 && !doc.title && !open) {
            doc.title = h[2];
            continue;
        }
        flush();
        const level = Math.max(2, h[1].length);
        while (trail.length && trail[trail.length - 1].level >= level)
            trail.pop();
        trail.push({ level, slug: slug(h[2]) });
        let id = trail.map((t) => t.slug).join("/");
        const n = (seen.get(id) ?? 0) + 1;
        seen.set(id, n);
        if (n > 1)
            id = `${id}-${n}`;
        open = { id, level, title: h[2], blocks: [] };
        doc.sections.push(open);
    }
    flush();
    return doc;
}
const cell = (c: string) => c.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
export function blocksToMd(blocks: Block[]): string {
    return blocks
        .map((b) => {
        switch (b.kind) {
            case "para":
                return b.text;
            case "quote":
                return b.text.split("\n").map((l) => `> ${l}`.trimEnd()).join("\n");
            case "list":
                return b.items.map((it, n) => `${b.ordered ? `${n + 1}.` : "-"} ${it.split("\n").join("\n  ")}`).join("\n");
            case "table":
                return [`| ${b.head.map(cell).join(" | ")} |`, `|${b.head.map(() => "---").join("|")}|`, ...b.rows.map((r) => `| ${b.head.map((_, k) => cell(r[k] ?? "")).join(" | ")} |`)].join("\n");
            case "code":
                return `\`\`\`${b.lang ?? ""}\n${b.text}\n\`\`\``;
            case "rule":
                return "---";
        }
    })
        .join("\n\n");
}
export function serializeDoc(doc: Doc): string {
    const parts: string[] = [];
    if (doc.title)
        parts.push(`# ${doc.title}`);
    if (doc.intro.length)
        parts.push(blocksToMd(doc.intro));
    for (const s of doc.sections) {
        parts.push(`${"#".repeat(s.level)} ${s.title}`);
        if (s.blocks.length)
            parts.push(blocksToMd(s.blocks));
    }
    return parts.join("\n\n").replace(/\n{3,}/g, "\n\n") + "\n";
}
const same = (a: string, b: string) => slug(a) === slug(b);
export function findSection(doc: Doc, title: string): Section | undefined {
    return doc.sections.find((s) => same(s.title, title));
}
export function findSectionLike(doc: Doc, ...starts: string[]): Section | undefined {
    const want = starts.map(slug);
    return doc.sections.find((s) => want.some((w) => slug(s.title).startsWith(w)));
}
export const sectionById = (doc: Doc, id: string) => doc.sections.find((s) => s.id === id);
export function childrenOf(doc: Doc, parent: Section): Section[] {
    const at = doc.sections.indexOf(parent);
    const out: Section[] = [];
    for (const s of doc.sections.slice(at + 1)) {
        if (s.level <= parent.level)
            break;
        out.push(s);
    }
    return out;
}
export const itemsOf = (s?: Section): string[] => (s?.blocks ?? []).flatMap((b) => (b.kind === "list" ? b.items : []));
export const tableOf = (s?: Section) => s?.blocks.find((b): b is Extract<Block, {
    kind: "table";
}> => b.kind === "table");
export const textOf = (s?: Section): string => (s?.blocks ?? []).flatMap((b) => (b.kind === "para" ? [b.text] : [])).join("\n\n");
export function field(item: string): {
    key: string;
    value: string;
} | null {
    const m = /^\*\*(.+?)\*\*\s*:?\s*([\s\S]*)$/.exec(item.trim());
    if (!m)
        return null;
    return { key: m[1].replace(/:$/, "").trim(), value: m[2].trim() };
}
export const fieldItem = (key: string, value: string) => `**${key}**: ${value.trim()}`;
export function fieldsOf(s?: Section): {
    key: string;
    value: string;
}[] {
    return itemsOf(s).map(field).filter((f): f is {
        key: string;
        value: string;
    } => !!f);
}
export function fieldValue(s: Section | undefined, ...keys: string[]): string {
    const want = keys.map(slug);
    return fieldsOf(s).find((f) => want.some((w) => slug(f.key).startsWith(w)))?.value ?? "";
}
export const plainText = (s: string) => s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
export function setField(s: Section, key: string, value: string): void {
    for (const b of s.blocks) {
        if (b.kind !== "list")
            continue;
        const at = b.items.findIndex((it) => same(field(it)?.key ?? "", key));
        if (at >= 0) {
            b.items[at] = fieldItem(field(b.items[at])!.key, value);
            return;
        }
    }
    const list = s.blocks.find((b): b is Extract<Block, {
        kind: "list";
    }> => b.kind === "list" && b.items.every((it) => !!field(it)));
    if (list)
        list.items.push(fieldItem(key, value));
    else
        s.blocks.push({ kind: "list", ordered: false, items: [fieldItem(key, value)] });
}
export function addSection(doc: Doc, sec: {
    level: number;
    title: string;
    blocks: Block[];
}, under?: string): Section {
    const parent = under ? findSection(doc, under) : undefined;
    const kids = parent ? childrenOf(doc, parent) : [];
    const at = parent ? doc.sections.indexOf(parent) + kids.length + 1 : doc.sections.length;
    const section: Section = { id: "", level: sec.level, title: sec.title, blocks: sec.blocks };
    doc.sections.splice(at, 0, section);
    const fresh = parseDoc(serializeDoc(doc));
    doc.sections.forEach((s, k) => (s.id = fresh.sections[k]?.id ?? s.id));
    return section;
}
export function removeSection(doc: Doc, id: string): boolean {
    const s = sectionById(doc, id);
    if (!s)
        return false;
    const gone = new Set([s, ...childrenOf(doc, s)]);
    doc.sections = doc.sections.filter((x) => !gone.has(x));
    return true;
}
export const noLongDash = (s: string) => s
    .replace(/(\d)\s*–\s*(\d)/g, "$1 to $2")
    .replace(/[ \t]*[—–][ \t]*/g, ", ");
export function cleanBlocks(input: unknown): Block[] {
    if (!Array.isArray(input))
        throw new Error("A section is a list of parts.");
    const str = (v: unknown, max = 8000) => noLongDash(String(v ?? "").replace(/\r\n/g, "\n")).slice(0, max);
    const out: Block[] = [];
    for (const raw of input.slice(0, 60) as Record<string, unknown>[]) {
        switch (raw?.kind) {
            case "para":
            case "quote":
            case "code": {
                const text = str(raw.text).split("\n").map((l) => (raw.kind !== "code" && /^\s*#{1,6}\s/.test(l) ? l.replace(/^\s*#+\s*/, "") : l)).join("\n").trim();
                const lang = raw.kind === "code" ? String(raw.lang ?? "").replace(/[^a-z0-9+-]/gi, "").slice(0, 20) : "";
                if (text)
                    out.push(lang ? { kind: "code", text, lang } : { kind: raw.kind, text });
                break;
            }
            case "list": {
                const items = (Array.isArray(raw.items) ? raw.items : []).slice(0, 200).map((x) => str(x, 4000).split("\n").map((l) => l.trim()).filter(Boolean).join("\n")).filter(Boolean);
                if (items.length)
                    out.push({ kind: "list", ordered: !!raw.ordered, items });
                break;
            }
            case "table": {
                const head = (Array.isArray(raw.head) ? raw.head : []).slice(0, 12).map((x) => str(x, 120).replace(/\n/g, " ").trim());
                if (!head.length)
                    break;
                const rows = (Array.isArray(raw.rows) ? raw.rows : []).slice(0, 400).map((r) => head.map((_, k) => str((r as unknown[])?.[k], 3000).replace(/\n/g, " ").trim())).filter((r) => r.some(Boolean));
                out.push({ kind: "table", head, rows });
                break;
            }
            case "rule":
                out.push({ kind: "rule" });
                break;
            default:
                throw new Error("Unknown kind of part.");
        }
    }
    return out;
}
