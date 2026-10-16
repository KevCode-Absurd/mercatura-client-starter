import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { brandBrainDir } from "./brand-brain";
import { getBrandRow } from "./brands";
export interface BrandFontFile {
    file: string;
    family: string;
    weight: string;
    style: "normal" | "italic";
    from: "site" | "upload";
}
export interface FontFace {
    family: string;
    weight: string;
    style: string;
    range: string;
    urls: string[];
}
const MAX_FILES = 16;
const MAX_BYTES = 4 * 1024 * 1024;
const EXT = /\.(woff2|woff|ttf|otf)(?:[?#]|$)/i;
export function fontsDir(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return path.join(brandBrainDir(row.dir), "look", "fonts");
}
const indexPath = (brandId: string) => path.join(fontsDir(brandId), "fonts.json");
export function listBrandFonts(brandId: string): BrandFontFile[] {
    const file = indexPath(brandId);
    if (!fs.existsSync(file))
        return [];
    try {
        const rows = JSON.parse(fs.readFileSync(file, "utf-8")) as BrandFontFile[];
        const dir = fontsDir(brandId);
        return rows.filter((r) => r && typeof r.file === "string" && fs.existsSync(path.join(dir, path.basename(r.file))));
    }
    catch {
        return [];
    }
}
function saveIndex(brandId: string, rows: BrandFontFile[]) {
    fs.mkdirSync(fontsDir(brandId), { recursive: true });
    fs.writeFileSync(indexPath(brandId), JSON.stringify(rows, null, 2));
}
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "font";
const unquote = (s: string) => s.trim().replace(/^["']|["']$/g, "").trim();
export const cssWeight = (w: string) => {
    const v = (w || "400").trim().toLowerCase().replace(/\bnormal\b/g, "400").replace(/\bbold\b/g, "700");
    return /^\d{2,4}( \d{2,4})?$/.test(v) ? v : "400";
};
export function fontKind(bytes: Uint8Array): "woff2" | "woff" | "ttf" | "otf" | null {
    if (bytes.length < 12)
        return null;
    const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (tag === "wOF2")
        return "woff2";
    if (tag === "wOFF")
        return "woff";
    if (tag === "OTTO")
        return "otf";
    if (tag === "true" || (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0))
        return "ttf";
    return null;
}
function declarations(body: string): Map<string, string> {
    const out = new Map<string, string>();
    let depth = 0;
    let quote = "";
    let start = 0;
    const push = (end: number) => {
        const decl = body.slice(start, end);
        const colon = decl.indexOf(":");
        if (colon > 0)
            out.set(decl.slice(0, colon).trim().toLowerCase(), decl.slice(colon + 1).trim());
        start = end + 1;
    };
    for (let i = 0; i < body.length; i++) {
        const c = body[i];
        if (quote) {
            if (c === quote)
                quote = "";
        }
        else if (c === '"' || c === "'")
            quote = c;
        else if (c === "(")
            depth++;
        else if (c === ")")
            depth = Math.max(0, depth - 1);
        else if (c === ";" && depth === 0)
            push(i);
    }
    push(body.length);
    return out;
}
export function parseFontFaces(css: string, baseUrl: string): FontFace[] {
    const out: FontFace[] = [];
    for (const m of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
        const decls = declarations(m[1]);
        const prop = (name: string) => decls.get(name) ?? "";
        const family = unquote(prop("font-family"));
        const urls = [...prop("src").matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)].flatMap((u) => {
            try {
                return [u[1].startsWith("data:") ? u[1] : new URL(u[1], baseUrl).href];
            }
            catch {
                return [];
            }
        });
        if (family && urls.length)
            out.push({ family, weight: cssWeight(prop("font-weight")), style: /italic|oblique/i.test(prop("font-style")) ? "italic" : "normal", range: prop("unicode-range"), urls });
    }
    return out;
}
export function coversLatin(range: string): boolean {
    const ranges = [...range.matchAll(/U\+([0-9A-F?]+)(?:-([0-9A-F]+))?/gi)].map(([, a, b]) => [parseInt(a.replace(/\?/g, "0"), 16), parseInt((b || a).replace(/\?/g, "F"), 16)]);
    return !ranges.length || ranges.some(([a, b]) => a <= 0x41 && 0x41 <= b);
}
const ICONS = /icon|awesome|glyph|symbol|swiper|slick|material|fontello|icomoon|dashicons|video-?js/i;
export const bestUrl = (urls: string[]) => urls.find((u) => /woff2/i.test(u)) ?? urls.find((u) => /\.woff(?:[?#]|$)|font\/woff[;,]/i.test(u)) ?? urls.find((u) => EXT.test(u) || u.startsWith("data:")) ?? urls[0];
export function pickFaces(faces: FontFace[], used: string[]): FontFace[] {
    const order = used.map((f) => f.toLowerCase());
    const seen = new Set<string>();
    return faces
        .filter((f) => order.includes(f.family.toLowerCase()) && !ICONS.test(f.family) && coversLatin(f.range))
        .sort((a, b) => order.indexOf(a.family.toLowerCase()) - order.indexOf(b.family.toLowerCase()))
        .filter((f) => {
        const key = `${f.family.toLowerCase()}|${f.weight}|${f.style}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    })
        .slice(0, MAX_FILES);
}
const WEIGHT_WORDS: [
    RegExp,
    string
][] = [
    [/variable|\bvf\b|\bwght\b/i, "100 900"],
    [/extra[-_ ]?bold|ultra[-_ ]?bold|heavy/i, "800"],
    [/semi[-_ ]?bold|demi[-_ ]?bold|demi/i, "600"],
    [/extra[-_ ]?light|ultra[-_ ]?light/i, "200"],
    [/black/i, "900"],
    [/bold/i, "700"],
    [/medium/i, "500"],
    [/regular|normal|book|roman/i, "400"],
    [/light/i, "300"],
    [/thin|hairline/i, "100"],
];
export function nameFromFile(name: string): {
    family: string;
    weight: string;
    style: "normal" | "italic";
} {
    const stem = path.basename(name).replace(/\.[a-z0-9]+$/i, "");
    const style = /italic|oblique/i.test(stem) ? "italic" : "normal";
    let weight = "400";
    let rest = stem.replace(/italic|oblique/gi, "");
    for (const [re, w] of WEIGHT_WORDS) {
        if (re.test(rest)) {
            weight = w;
            rest = rest.replace(new RegExp(re.source, "gi"), "");
            break;
        }
    }
    const family = rest.replace(/\[.*?\]/g, "").replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim();
    return { family: family || stem, weight, style };
}
export function weightStops(weight: string): number[] {
    const [a, b] = weight.split(" ").map(Number);
    if (!Number.isFinite(a))
        return [400];
    if (!Number.isFinite(b))
        return [a];
    return [100, 200, 300, 400, 500, 600, 700, 800, 900].filter((w) => w >= a && w <= b);
}
export function fontFamilies(files: BrandFontFile[]): {
    family: string;
    weights: number[];
    faces: BrandFontFile[];
}[] {
    const by = new Map<string, BrandFontFile[]>();
    for (const f of files)
        by.set(f.family, [...(by.get(f.family) ?? []), f]);
    return [...by.entries()].map(([family, faces]) => {
        const upright = faces.filter((f) => f.style === "normal");
        const weights = [...new Set((upright.length ? upright : faces).flatMap((f) => weightStops(f.weight)))].sort((a, b) => a - b);
        return { family, weights, faces };
    });
}
interface PageFonts {
    faces: FontFace[];
    used: string[];
    closed: string[];
}
function readFaces(): PageFonts {
    const faces: PageFonts["faces"] = [];
    const closed: string[] = [];
    const walk = (rules: CSSRuleList, base: string) => {
        for (const r of Array.from(rules)) {
            if (r instanceof CSSFontFaceRule) {
                const src = r.style.getPropertyValue("src");
                const urls: string[] = [];
                for (const m of src.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
                    try {
                        urls.push(m[1].startsWith("data:") ? m[1] : new URL(m[1], base).href);
                    }
                    catch { }
                }
                const family = r.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
                if (family && urls.length)
                    faces.push({ family, weight: r.style.getPropertyValue("font-weight") || "400", style: /italic|oblique/i.test(r.style.getPropertyValue("font-style")) ? "italic" : "normal", range: r.style.getPropertyValue("unicode-range") || "", urls });
            }
            else if (r instanceof CSSImportRule) {
                try {
                    if (r.styleSheet)
                        walk(r.styleSheet.cssRules, r.styleSheet.href || base);
                }
                catch {
                    if (r.href)
                        closed.push(new URL(r.href, base).href);
                }
            }
            else if ("cssRules" in r) {
                try {
                    walk((r as CSSGroupingRule).cssRules, base);
                }
                catch { }
            }
        }
    };
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            walk(sheet.cssRules, sheet.href || location.href);
        }
        catch {
            if (sheet.href)
                closed.push(sheet.href);
        }
    }
    const tally = new Map<string, number>();
    for (const el of Array.from(document.querySelectorAll("body *")).slice(0, 4000)) {
        const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
        if (own.length < 2)
            continue;
        const s = getComputedStyle(el);
        if (s.visibility === "hidden" || s.display === "none")
            continue;
        const first = s.fontFamily.split(",")[0].trim().replace(/^["']|["']$/g, "");
        tally.set(first, (tally.get(first) ?? 0) + own.length * (parseFloat(s.fontSize) || 16));
    }
    return { faces, used: [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f]) => f), closed };
}
export interface FontPull {
    files: BrandFontFile[];
    warnings: string[];
}
export async function captureFontsTo(page: Page, dir: string): Promise<FontPull> {
    await page.evaluate("globalThis.__name = globalThis.__name || ((f) => f)");
    const read = await page.evaluate(readFaces);
    const faces = read.faces.map((f) => ({ ...f, weight: cssWeight(f.weight) }));
    for (const href of [...new Set(read.closed)].slice(0, 12)) {
        try {
            const res = await page.request.get(href, { timeout: 15000 });
            if (res.ok())
                faces.push(...parseFontFaces(await res.text(), href));
        }
        catch {
        }
    }
    const warnings: string[] = [];
    const picked = pickFaces(faces, read.used);
    fs.mkdirSync(dir, { recursive: true });
    const files: BrandFontFile[] = [];
    for (const face of picked) {
        const url = bestUrl(face.urls);
        try {
            let bytes: Buffer;
            if (url.startsWith("data:")) {
                const comma = url.indexOf(",");
                if (comma < 0 || !/;base64/i.test(url.slice(0, comma)))
                    continue;
                bytes = Buffer.from(url.slice(comma + 1), "base64");
            }
            else {
                const res = await page.request.get(url, { timeout: 20000, headers: { referer: page.url() } });
                if (!res.ok())
                    continue;
                bytes = await res.body();
            }
            const kind = fontKind(bytes);
            if (!kind || bytes.length > MAX_BYTES)
                continue;
            const file = `${slug(face.family)}-${face.weight.replace(/\s+/g, "_")}${face.style === "italic" ? "-italic" : ""}.${kind}`;
            fs.writeFileSync(path.join(dir, file), bytes);
            files.push({ file, family: face.family, weight: face.weight, style: face.style === "italic" ? "italic" : "normal", from: "site" });
        }
        catch {
        }
    }
    const got = new Set(files.map((f) => f.family.toLowerCase()));
    const missing = read.used.slice(0, 3).filter((f) => !got.has(f.toLowerCase()) && !ICONS.test(f));
    for (const f of missing)
        warnings.push(faces.some((x) => x.family.toLowerCase() === f.toLowerCase()) ? `The font file for ${f} could not be downloaded from the site. Upload it instead.` : `${f} is not a font file the site serves (it is a font of the visitor's own computer, or loaded in a way that can't be read). Upload it if the brand owns it.`);
    return { files, warnings };
}
export async function captureFonts(page: Page, brandId: string): Promise<FontPull> {
    const dir = fontsDir(brandId);
    const before = listBrandFonts(brandId);
    const res = await captureFontsTo(page, dir);
    if (!res.files.length)
        return { files: before, warnings: res.warnings.length ? res.warnings : ["No font files could be read from the site."] };
    const names = new Set(res.files.map((f) => f.file));
    const uploads = before.filter((f) => f.from === "upload" && !names.has(f.file));
    for (const old of before)
        if (old.from === "site" && !names.has(old.file))
            fs.rmSync(path.join(dir, old.file), { force: true });
    saveIndex(brandId, [...res.files, ...uploads]);
    return { files: [...res.files, ...uploads], warnings: res.warnings };
}
export async function pullBrandFonts(brandId: string, url: string): Promise<FontPull> {
    const site = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    new URL(site);
    let pw: typeof import("@playwright/test");
    try {
        pw = await import("@playwright/test");
    }
    catch {
        throw new Error("Reading a site needs Playwright, which is installed with the app's dev dependencies (pnpm install).");
    }
    fontsDir(brandId);
    const browser = await pw.chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge", headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        await page.goto(site, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => undefined);
        await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => undefined);
        return await captureFonts(page, brandId);
    }
    finally {
        await browser.close();
    }
}
export function addBrandFont(brandId: string, f: {
    name: string;
    bytes: Buffer;
}, as: {
    family?: string;
    weight?: string;
} = {}): BrandFontFile {
    const kind = fontKind(f.bytes);
    if (!kind)
        throw new Error("That file is not a font. Upload a WOFF2, WOFF, TTF or OTF file.");
    if (f.bytes.length > MAX_BYTES)
        throw new Error("That font file is over 4 MB.");
    const named = nameFromFile(f.name);
    const family = (as.family ?? "").trim().slice(0, 60) || named.family;
    const weight = as.weight ? cssWeight(as.weight) : named.weight;
    const file = `${slug(family)}-${weight.replace(/\s+/g, "_")}${named.style === "italic" ? "-italic" : ""}.${kind}`;
    const dir = fontsDir(brandId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, file), f.bytes);
    const row: BrandFontFile = { file, family, weight, style: named.style, from: "upload" };
    saveIndex(brandId, [...listBrandFonts(brandId).filter((x) => x.file !== file), row]);
    return row;
}
export function removeBrandFont(brandId: string, file: string) {
    const name = path.basename(file);
    fs.rmSync(path.join(fontsDir(brandId), name), { force: true });
    saveIndex(brandId, listBrandFonts(brandId).filter((x) => x.file !== name));
}
