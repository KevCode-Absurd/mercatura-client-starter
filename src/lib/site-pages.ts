import fs from "node:fs";
import path from "node:path";
export interface SitePage {
    where: string;
    title: string;
    text: string;
}
export type PageKind = "home" | "product" | "collection" | "science" | "reviews" | "faq" | "about" | "page";
export interface CleanPage extends SitePage {
    slug: string;
    kind: PageKind;
    kept: number;
    removed: number;
    cut: number;
    heading: string;
    para: string;
    file: string;
}
export interface SiteRead {
    site: string;
    date: string;
    pages: CleanPage[];
    shared: string[];
    sharedOn: number;
}
export const PAGE_CEILING = 60000;
export const SHARED_ON = 3;
export const SITE_FOLDER = "site";
export const SHARED_FILE = "_shared.md";
export const INDEX_FILE = "_index.json";
const INDEX_JSON = INDEX_FILE;
const HEADING = /^#{1,6}\s+(.*)$/;
export const normLine = (s: string) => s.replace(/^#{1,6}\s+/, "").trim().toLowerCase().replace(/\s+/g, " ");
const fmt = (n: number) => n.toLocaleString("en-US");
export function pageKind(where: string): PageKind {
    let p = "";
    try {
        p = new URL(where).pathname.toLowerCase();
    }
    catch {
        p = where.toLowerCase();
    }
    if (p === "" || p === "/")
        return "home";
    if (/product/.test(p))
        return "product";
    if (/collection|shop|categor|range|bundle/.test(p))
        return "collection";
    if (/science|ingredient|research|stud|how-it|clinical/.test(p))
        return "science";
    if (/review|testimonial|result/.test(p))
        return "reviews";
    if (/faq|question|help|support/.test(p))
        return "faq";
    if (/about|story|founder|mission|our-/.test(p))
        return "about";
    return "page";
}
export function pageSlug(where: string): string {
    let p = "";
    try {
        p = new URL(where).pathname;
    }
    catch {
        p = where;
    }
    const s = p
        .toLowerCase()
        .replace(/\.html?$/, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60)
        .replace(/-+$/, "");
    return s || "home";
}
export function markHeadings(text: string, headings: string[]): string {
    const set = new Set(headings.map(normLine).filter((h) => h.length >= 2));
    if (!set.size)
        return text;
    return text
        .split("\n")
        .map((line) => (set.has(normLine(line)) && !HEADING.test(line) ? `## ${line.trim()}` : line))
        .join("\n");
}
export function cleanSite(pages: SitePage[], site: string, opts: {
    date?: string;
    sharedOn?: number;
    ceiling?: number;
    folder?: string;
} = {}): SiteRead {
    const sharedOn = opts.sharedOn ?? SHARED_ON;
    const ceiling = opts.ceiling ?? PAGE_CEILING;
    const folder = opts.folder ?? SITE_FOLDER;
    const date = opts.date ?? new Date().toISOString().slice(0, 10);
    const onPages = new Map<string, number>();
    const split = pages.map((p) => p.text.replace(/\r\n/g, "\n").split("\n"));
    for (const lines of split) {
        for (const key of new Set(lines.map(normLine).filter(Boolean)))
            onPages.set(key, (onPages.get(key) ?? 0) + 1);
    }
    const isShared = (key: string) => !!key && (onPages.get(key) ?? 0) >= sharedOn;
    const shared: string[] = [];
    const seenShared = new Set<string>();
    const slugs = new Map<string, number>();
    const clean: CleanPage[] = pages.map((p, i) => {
        const keep: string[] = [];
        let removed = 0;
        for (const line of split[i]) {
            const key = normLine(line);
            if (isShared(key)) {
                if (!seenShared.has(key)) {
                    seenShared.add(key);
                    shared.push(line.replace(/^#{1,6}\s+/, "").trim());
                }
                if (!HEADING.test(line)) {
                    removed += line.length + 1;
                    continue;
                }
            }
            keep.push(line.trimEnd());
        }
        let text = keep.join("\n").replace(/\n{3,}/g, "\n\n").trim();
        let cut = 0;
        if (text.length > ceiling) {
            const at = Math.max(text.lastIndexOf("\n", ceiling), Math.floor(ceiling / 2));
            cut = text.length - at;
            text = text.slice(0, at).trimEnd();
        }
        const lines = text.split("\n");
        const heading = lines.map((l) => HEADING.exec(l)?.[1]?.trim() ?? "").find(Boolean) ?? "";
        const para = lines.map((l) => l.trim()).find((l) => l && !HEADING.test(l) && l.split(/\s+/).length >= 3) ?? "";
        const base = pageSlug(p.where);
        const n = (slugs.get(base) ?? 0) + 1;
        slugs.set(base, n);
        const slug = n > 1 ? `${base}-${n}` : base;
        return { where: p.where, title: (p.title || p.where).trim().slice(0, 160), text, slug, kind: pageKind(p.where), kept: text.length, removed, cut, heading, para: para.slice(0, 240), file: `${folder}/${slug}.md` };
    });
    return { site, date, pages: clean, shared, sharedOn };
}
const headerLine = (p: CleanPage, read: SiteRead) => `Kept: ${fmt(p.kept)} characters. Removed as repeats: ${fmt(p.removed)} characters (lines that stand on ${read.sharedOn} or more of the ${read.pages.length} pages read, kept once in ${SHARED_FILE}). Cut: ${p.cut ? `${fmt(p.cut)} characters past the ${fmt(PAGE_CEILING)} ceiling` : "nothing"}.`;
export function pageMarkdown(p: CleanPage, read: SiteRead): string {
    return `# ${p.title}\n\nPage: ${p.where}\nRead: ${read.date}\nKind: ${p.kind}\n${headerLine(p, read)}\n\n${p.text}\n`;
}
export function sharedMarkdown(read: SiteRead): string {
    return `# Lines that stand on ${read.sharedOn} or more pages of ${read.site}\n\nRead: ${read.date}\nPages: ${read.pages.length}\nThese ${read.shared.length} lines (the menu, the footer, the announcement bar, legal notes, the questions every product page repeats) were taken out of every page in this folder and kept once here. What they state is still what the brand says in public.\n\n${read.shared.join("\n")}\n`;
}
export function indexMarkdown(read: SiteRead, folder = SITE_FOLDER): string {
    const total = read.pages.reduce((n, p) => n + p.kept, 0);
    const removed = read.pages.reduce((n, p) => n + p.removed, 0);
    const q = (s: string) => s.replace(/\s+/g, " ").replace(/"/g, "'").trim();
    const lines = read.pages.map((p) => `- "${q(p.title)}" | ${p.where} | ${fmt(p.kept)} characters | ${p.kind} | File: ${p.file}${p.heading ? ` | First heading: "${q(p.heading)}"` : ""}${p.para ? ` | First paragraph: "${q(p.para)}"` : ""}${p.cut ? ` | Cut: ${fmt(p.cut)} characters past the ceiling` : ""}`);
    return [
        `# The brand's website, as read on ${read.date}`,
        "",
        `Website: ${read.site}`,
        `Pages: ${read.pages.length}, kept 1 to a file in ${folder}/ with ${fmt(total)} characters in all. ${fmt(removed)} characters of lines that stand on ${read.sharedOn} or more pages (the menu, the footer, notices) were taken out of the pages and kept once in ${folder}/${SHARED_FILE}.`,
        "",
        "Source: the brand's own pages. What they state is what the brand says in public; it is not proof of a claim.",
        "",
        "## Pages",
        "",
        ...lines,
        "",
    ].join("\n");
}
export interface WrittenSite {
    chars: number;
    removed: number;
    files: string[];
    index: string;
}
export function writeSiteFolder(dir: string, read: SiteRead, opts: {
    folder?: string;
    index?: string;
} = {}): WrittenSite {
    const folder = opts.folder ?? SITE_FOLDER;
    const indexName = opts.index ?? "website.md";
    const pagesDir = path.join(dir, folder);
    fs.rmSync(pagesDir, { recursive: true, force: true });
    fs.mkdirSync(pagesDir, { recursive: true });
    let chars = 0;
    const files: string[] = [];
    for (const p of read.pages) {
        const md = pageMarkdown(p, read);
        fs.writeFileSync(path.join(pagesDir, `${p.slug}.md`), md, "utf-8");
        chars += md.length;
        files.push(p.file);
    }
    const shared = sharedMarkdown(read);
    fs.writeFileSync(path.join(pagesDir, SHARED_FILE), shared, "utf-8");
    chars += shared.length;
    const meta = { site: read.site, date: read.date, sharedOn: read.sharedOn, shared: read.shared, pages: read.pages.map(({ text: _text, ...rest }) => rest) };
    fs.writeFileSync(path.join(pagesDir, INDEX_JSON), JSON.stringify(meta, null, 2) + "\n", "utf-8");
    const index = path.join(dir, indexName);
    fs.writeFileSync(index, indexMarkdown(read, folder), "utf-8");
    return { chars, removed: read.pages.reduce((n, p) => n + p.removed, 0), files, index };
}
export function pageTextOf(md: string): string {
    const m = /^# [^\n]*\n\n(?:[A-Z][a-z]+: [^\n]*\n)+\n?/.exec(md);
    return (m ? md.slice(m[0].length) : md).trim();
}
export function readSiteFolder(dir: string, folder = SITE_FOLDER): SiteRead | null {
    const pagesDir = path.join(dir, folder);
    const metaFile = path.join(pagesDir, INDEX_JSON);
    if (!fs.existsSync(metaFile))
        return null;
    try {
        const meta = JSON.parse(fs.readFileSync(metaFile, "utf-8")) as {
            site: string;
            date: string;
            sharedOn: number;
            shared?: string[];
            pages: Omit<CleanPage, "text">[];
        };
        const pages: CleanPage[] = [];
        for (const p of meta.pages) {
            const f = path.join(pagesDir, `${p.slug}.md`);
            if (!fs.existsSync(f))
                continue;
            pages.push({ ...p, text: pageTextOf(fs.readFileSync(f, "utf-8")) });
        }
        return { site: meta.site, date: meta.date, sharedOn: meta.sharedOn ?? SHARED_ON, pages, shared: Array.isArray(meta.shared) ? meta.shared : [] };
    }
    catch {
        return null;
    }
}
export function sameSite(a: string, b: string): boolean {
    const host = (u: string) => {
        try {
            return new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.toLowerCase().replace(/^www\./, "");
        }
        catch {
            return "";
        }
    };
    const ha = host(a.trim());
    return !!ha && ha === host(b.trim());
}
export function siteLines(read: SiteRead, max = 200): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const p of read.pages) {
        if (p.kind === "reviews")
            continue;
        for (const raw of p.text.split("\n")) {
            const h = HEADING.exec(raw);
            const line = (h ? h[1] : raw).replace(/\s+/g, " ").trim();
            if (/^["“]/.test(line))
                continue;
            if (!h && (line.length < 12 || line.length > 110))
                continue;
            if (line.length < 12 || line.split(" ").length < 3 || !/[a-z]/i.test(line))
                continue;
            const key = normLine(line);
            if (seen.has(key))
                continue;
            seen.add(key);
            out.push(line);
            if (out.length >= max)
                return out;
        }
    }
    return out;
}
export function pagesFromLegacyWebsiteMd(md: string): SitePage[] {
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const pages: SitePage[] = [];
    let cur: (SitePage & {
        body: string[];
    }) | null = null;
    const nextFull = (i: number) => {
        for (let j = i + 1; j < lines.length; j++)
            if (lines[j].trim())
                return lines[j];
        return "";
    };
    for (let i = 0; i < lines.length; i++) {
        const h = /^## (.*)$/.exec(lines[i]);
        const where = h ? /^Page: (\S+)/.exec(nextFull(i).trim())?.[1] : undefined;
        if (h && where) {
            if (cur)
                pages.push({ where: cur.where, title: cur.title, text: cur.body.join("\n").trim() });
            cur = { where, title: h[1].trim(), text: "", body: [] };
            while (i + 1 < lines.length && !/^Page: /.test(lines[i + 1].trim()))
                i++;
            i++;
            continue;
        }
        if (cur)
            cur.body.push(lines[i]);
    }
    if (cur)
        pages.push({ where: cur.where, title: cur.title, text: cur.body.join("\n").trim() });
    return pages;
}
export function packDocs<T extends {
    text: string;
}>(docs: T[], opts: {
    maxChars?: number;
    maxDocs?: number;
} = {}): T[][] {
    const maxChars = opts.maxChars ?? 12000;
    const maxDocs = opts.maxDocs ?? 3;
    const groups: T[][] = [];
    let cur: T[] = [];
    let size = 0;
    for (const d of docs) {
        if (cur.length && (cur.length >= maxDocs || size + d.text.length > maxChars)) {
            groups.push(cur);
            cur = [];
            size = 0;
        }
        cur.push(d);
        size += d.text.length;
    }
    if (cur.length)
        groups.push(cur);
    return groups;
}
