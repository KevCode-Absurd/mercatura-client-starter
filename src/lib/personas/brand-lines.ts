import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
import { INDEX_FILE, SITE_FOLDER, readSiteFolder, siteLines } from "../site-pages";
const plain = (s: string) => s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const count = (s: string) => (s ? s.split(" ").length : 0);
const weighty = (s: string) => count(s) >= 3 && s.length >= 12;
const OWN_HEADING = /key phrases|taglines?|slogans?|how the brand writes|ad headlines?|ad primary text|website copy|site copy|email|headlines?/i;
const HEADING = /^(#{1,6})\s+(.*)$/;
export function ownLinesInGuidelines(md: string): string[] {
    const out: string[] = [];
    let depth = 0;
    for (const raw of md.split(/\r?\n/)) {
        const h = HEADING.exec(raw);
        if (h) {
            const level = h[1].length;
            if (OWN_HEADING.test(h[2]))
                depth = depth && level > depth ? depth : level;
            else if (depth && level <= depth)
                depth = 0;
            continue;
        }
        const item = /^\s*[-*]\s+(.*)$/.exec(raw);
        if (depth && item)
            out.push(...item[1].split(/\s*\/\/\s*/));
    }
    return out;
}
const COPY_ROW = /^\s*[-*]?\s*\*\*[^*]*(headline|hook|tagline|slogan|primary text|copy)[^*]*\*\*|^\s*\||\b(site|store|retailer|ad|page|email|[A-Z][a-z]+) copy:/i;
export const quotedLines = (md: string): string[] => md
    .split(/\r?\n/)
    .filter((row) => COPY_ROW.test(row))
    .flatMap((row) => [...row.matchAll(/"([^"\n]{6,300})"|“([^”\n]{6,300})”/g)].flatMap((m) => (m[1] ?? m[2]).split(/\s*\/\/\s*|\s*\.\.\.\s*/)));
const ownPart = (line: string) => line.replace(/^\s*["“]|["”]\s*$/g, "").replace(/(^|[\s(])['‘]([^'’]{4,120})['’](?=[\s:,.!?)]|$)/g, "$1");
export interface OwnLines {
    whole: Set<string>;
    parts: string[];
}
export function ownLines(lines: string[]): OwnLines {
    const whole = new Set<string>();
    const parts = new Set<string>();
    for (const raw of lines) {
        const full = plain(raw.replace(/^\s*["“]|["”]\s*$/g, ""));
        if (full)
            whole.add(full);
        const mine = ownPart(raw);
        for (const piece of [mine, ...mine.split(/(?<=[.!?])\s+/)]) {
            const p = plain(piece);
            if (weighty(p))
                parts.add(p);
        }
    }
    return { whole, parts: [...parts] };
}
export function isOwnLine(phrase: string, own: OwnLines): boolean {
    const p = plain(phrase);
    if (!p)
        return false;
    if (own.whole.has(p))
        return true;
    return own.parts.some((l) => (weighty(p) && l.includes(p) && ` ${l} `.includes(` ${p} `)) || (p.length > l.length && ` ${p} `.includes(` ${l} `)));
}
const DOCS = ["brand-guidelines.md", "winning-ads.md"];
const SITE_INDEX = `${SITE_FOLDER}/${INDEX_FILE}`;
export function readOwnLines(brainDir: string): OwnLines {
    const lines: string[] = [];
    try {
        const brand = JSON.parse(fs.readFileSync(path.join(brainDir, "brand.json"), "utf-8")) as {
            voice?: {
                examples?: string[];
            };
        };
        lines.push(...(brand.voice?.examples ?? []));
    }
    catch {
    }
    const g = path.join(brainDir, DOCS[0]);
    if (fs.existsSync(g))
        lines.push(...ownLinesInGuidelines(fs.readFileSync(g, "utf-8")));
    const w = path.join(brainDir, DOCS[1]);
    if (fs.existsSync(w))
        lines.push(...quotedLines(fs.readFileSync(w, "utf-8")));
    const site = readSiteFolder(brainDir);
    if (site)
        lines.push(...siteLines(site, 400));
    return ownLines(lines);
}
const cache = new Map<string, {
    stamp: string;
    own: OwnLines;
}>();
function cached(brainDir: string): OwnLines {
    const stamp = ["brand.json", ...DOCS, SITE_INDEX]
        .map((f) => {
        try {
            return fs.statSync(path.join(brainDir, f)).mtimeMs;
        }
        catch {
            return 0;
        }
    })
        .join("|");
    const hit = cache.get(brainDir);
    if (hit?.stamp === stamp)
        return hit.own;
    const own = readOwnLines(brainDir);
    cache.set(brainDir, { stamp, own });
    return own;
}
function folders(brandDir?: string): string[] {
    if (brandDir)
        return [path.join(env.BRANDS_DIR, brandDir, "brand-brain")];
    try {
        return fs
            .readdirSync(env.BRANDS_DIR, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => path.join(env.BRANDS_DIR, d.name, "brand-brain"));
    }
    catch {
        return [];
    }
}
export function isBrandLine(phrase: string, brandDir?: string): boolean {
    try {
        return folders(brandDir).some((dir) => isOwnLine(phrase, cached(dir)));
    }
    catch {
        return false;
    }
}
