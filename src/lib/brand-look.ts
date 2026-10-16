import fs from "node:fs";
import type { Page } from "@playwright/test";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { brandBrainDir } from "./brand-brain";
import { captureFonts } from "./brand-fonts";
import { getBrandRow, loadBrandBrain } from "./brands";
import { env } from "./env";
import { VERTICALS } from "./library/taxonomy";
import { geminiEnabled, geminiJson } from "./llm/gemini";
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const ROLES = ["heading", "body", "display", "accent"] as const;
const words = z.string().default("").catch("");
const rowsOf = <T extends z.ZodType>(row: T) => z
    .array(z.unknown())
    .default([])
    .catch([])
    .transform((rows) => rows.flatMap((r) => {
    const p = row.safeParse(r);
    return p.success ? [p.data as z.output<T>] : [];
}));
const Font = z.object({
    role: z.enum(ROLES),
    family: z.string(),
    stack: z.string().default(""),
    weight: z.union([z.string(), z.number()]).transform(String),
    style: z.string().default("normal"),
    letter_case: z.string().default("sentence"),
    tracking: z.string().default("normal"),
    attributes: z.string().default(""),
    lookalike: z.string().default(""),
    well_known: z.boolean().default(false),
    use: z.string().default(""),
});
const Swatch = z.object({ role: z.enum(["primary", "secondary", "accent", "background", "surface", "text", "cta", "other"]).catch("other"), name: words, hex, use: words });
export const BrandLookSchema = z.object({
    site_url: words,
    scanned_at: words,
    fonts: rowsOf(Font),
    palette: rowsOf(Swatch),
    button: words,
    aesthetic: words,
    vertical: words,
    specimen: words,
    homepage: words,
    logo: words,
    notes: z.array(z.string()).default([]).catch([]),
});
export type BrandLook = z.infer<typeof BrandLookSchema>;
export type BrandFont = z.infer<typeof Font>;
function dirOf(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return brandBrainDir(row.dir);
}
const lookPath = (brandId: string) => path.join(dirOf(brandId), "brand-look.json");
export const lookDir = (brandId: string) => path.join(dirOf(brandId), "look");
export function lookFile(brandId: string, name: string): string | null {
    if (!name)
        return null;
    const file = path.join(lookDir(brandId), path.basename(name));
    return fs.existsSync(file) ? file : null;
}
export type BrandLookState = "none" | "ok" | "unreadable";
export interface BrandLookRead {
    state: BrandLookState;
    look: BrandLook | null;
    leftOut: string[];
}
const told = new Set<string>();
function tell(file: string, what: string) {
    if (told.has(`${file}|${what}`))
        return;
    told.add(`${file}|${what}`);
    console.warn(`[brand look] ${file}: ${what}`);
}
const WITHOUT = "Pictures are made without the brand's fonts and colours until the site is scanned again.";
export function readBrandLook(brandId: string): BrandLookRead {
    const file = lookPath(brandId);
    if (!fs.existsSync(file))
        return { state: "none", look: null, leftOut: [] };
    let raw: unknown;
    try {
        raw = JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch (e) {
        tell(file, `not valid JSON (${(e as Error).message.slice(0, 80)}). ${WITHOUT}`);
        return { state: "unreadable", look: null, leftOut: [] };
    }
    const parsed = BrandLookSchema.safeParse(raw);
    if (!parsed.success || (!parsed.data.fonts.length && !parsed.data.palette.length)) {
        const why = parsed.success ? "no typeface and no colour in it could be read" : parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".") || "file"}: ${i.message}`).join("; ");
        tell(file, `could not be read (${why}). ${WITHOUT}`);
        return { state: "unreadable", look: null, leftOut: [] };
    }
    const had = (key: string) => {
        const rows = raw && typeof raw === "object" ? (raw as Record<string, unknown>)[key] : null;
        return Array.isArray(rows) ? rows.length : 0;
    };
    const fonts = had("fonts") - parsed.data.fonts.length;
    const colours = had("palette") - parsed.data.palette.length;
    const leftOut = [fonts > 0 ? `${fonts} ${fonts === 1 ? "typeface" : "typefaces"}` : "", colours > 0 ? `${colours} ${colours === 1 ? "colour" : "colours"}` : ""].filter(Boolean);
    if (leftOut.length)
        tell(file, `${leftOut.join(" and ")} could not be read and ${fonts + colours === 1 ? "was" : "were"} left out.`);
    return { state: "ok", look: parsed.data, leftOut };
}
export function loadBrandLook(brandId: string): BrandLook | null {
    return readBrandLook(brandId).look;
}
export function brandLookState(brandId: string): BrandLookState {
    try {
        return readBrandLook(brandId).state;
    }
    catch {
        return "none";
    }
}
export function specimenMissing(brandId: string, look: BrandLook | null): boolean {
    return !!look && look.fonts.length > 0 && !lookFile(brandId, look.specimen);
}
const SCAN_AGAIN = "Scan the site again on the Brand brain.";
export function lookWarnings(brandId: string, o: {
    words: boolean;
} = { words: true }): string[] {
    let read: BrandLookRead;
    try {
        read = readBrandLook(brandId);
    }
    catch {
        return [];
    }
    if (read.state === "unreadable")
        return [`The brand's fonts and colours could not be read, so these pictures are made without them. ${SCAN_AGAIN}`];
    if (!read.look)
        return [];
    const out: string[] = [];
    if (read.leftOut.length)
        out.push(`Part of the brand's look could not be read and is not used: ${read.leftOut.join(" and ")}. ${SCAN_AGAIN}`);
    if (o.words && specimenMissing(brandId, read.look))
        out.push(`The picture of the brand's fonts is missing, so the image model is told them in words only and may not match them. ${SCAN_AGAIN}`);
    return out;
}
export function saveBrandLook(brandId: string, look: BrandLook) {
    fs.writeFileSync(lookPath(brandId), JSON.stringify(BrandLookSchema.parse(look), null, 2));
}
interface RawText {
    family: string;
    stack: string;
    weight: string;
    style: string;
    transform: string;
    tracking: string;
    size: number;
    color: string;
    sample: string;
    count?: number;
}
interface RawScan {
    heading: RawText | null;
    body: RawText | null;
    display: RawText | null;
    accent: RawText | null;
    button: {
        background: string;
        color: string;
        radius: string;
        text: RawText;
    } | null;
    colors: {
        hex: string;
        area: number;
        kind: "background" | "text";
    }[];
    vars: {
        name: string;
        hex: string;
    }[];
    logo: {
        kind: "img" | "svg" | "shot";
        src: string;
    } | null;
    title: string;
}
function readPage(): RawScan {
    const visible = (el: Element) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 4 && r.height > 4 && r.right > 0 && r.left < window.innerWidth && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.1;
    };
    const toHex = (c: string): string | null => {
        const m = c.match(/rgba?\(([^)]+)\)/);
        if (!m)
            return null;
        const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
        if (p.length >= 4 && p[3] < 0.5)
            return null;
        return `#${p.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`.toLowerCase();
    };
    const first = (stack: string) => stack.split(",")[0].trim().replace(/^["']|["']$/g, "");
    const ownText = (el: Element) => Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
    const textOf = (el: Element): RawText => {
        const s = getComputedStyle(el);
        const size = parseFloat(s.fontSize) || 16;
        const ls = parseFloat(s.letterSpacing);
        return {
            family: first(s.fontFamily),
            stack: s.fontFamily,
            weight: s.fontWeight,
            style: s.fontStyle,
            transform: s.textTransform,
            tracking: Number.isFinite(ls) && ls !== 0 ? `${(ls / size).toFixed(3)}em` : "normal",
            size,
            color: toHex(s.color) ?? "",
            sample: (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
        };
    };
    const all = Array.from(document.querySelectorAll("body *")).filter(visible).slice(0, 4000);
    const texts = all.filter((el) => ownText(el).length >= 3);
    const headings = texts.filter((el) => ownText(el).length <= 120).sort((a, b) => parseFloat(getComputedStyle(b).fontSize) - parseFloat(getComputedStyle(a).fontSize));
    const headingEl = document.querySelector("h1") && visible(document.querySelector("h1")!) && ownText(document.querySelector("h1")!).length ? document.querySelector("h1")! : headings[0];
    const tally = new Map<string, {
        el: Element;
        chars: number;
    }>();
    for (const el of texts) {
        const s = getComputedStyle(el);
        const size = parseFloat(s.fontSize);
        if (size < 12 || size > 22)
            continue;
        const key = `${s.fontFamily}|${s.fontWeight}`;
        const t = tally.get(key) ?? { el, chars: 0 };
        t.chars += ownText(el).length;
        tally.set(key, t);
    }
    const bodyEl = Array.from(tally.values()).sort((a, b) => b.chars - a.chars)[0]?.el ?? document.body;
    const buttons = Array.from(document.querySelectorAll("button, a, [role=button], input[type=submit]")).filter(visible).filter((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return !!toHex(s.backgroundColor) && toHex(s.backgroundColor) !== "#ffffff" && r.width > 60 && r.width < 600 && r.height > 24 && r.height < 100 && (el.textContent ?? "").trim().length > 1;
    });
    const btn = buttons.sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
    const button = btn ? { background: toHex(getComputedStyle(btn).backgroundColor) ?? "", color: toHex(getComputedStyle(btn).color) ?? "", radius: getComputedStyle(btn).borderRadius, text: textOf(btn) } : null;
    const body = textOf(bodyEl);
    const heading = headingEl ? textOf(headingEl) : null;
    const groups = (pick: (t: RawText, el: Element) => boolean) => {
        const by = new Map<string, {
            el: Element;
            n: number;
            chars: number;
        }>();
        for (const el of texts) {
            const t = textOf(el);
            if (!pick(t, el))
                continue;
            const key = `${t.family}|${t.weight}|${t.transform}`;
            const g = by.get(key) ?? { el, n: 0, chars: 0 };
            g.n++;
            g.chars += ownText(el).length;
            by.set(key, g);
        }
        return Array.from(by.values());
    };
    const smalls = groups((t, el) => t.size <= 16 && (t.family !== body.family || t.transform === "uppercase") && ownText(el).length < 40).sort((a, b) => b.n - a.n);
    const small = smalls[0];
    const accent = small ? { ...textOf(small.el), sample: ownText(small.el).slice(0, 40), count: smalls.filter((g) => textOf(g.el).family === textOf(small.el).family).reduce((n, g) => n + g.n, 0) } : null;
    const big = groups((t) => t.size >= 24 && t.family !== body.family && t.family !== heading?.family && t.family !== accent?.family);
    const families = new Map<string, {
        n: number;
        top: {
            el: Element;
            n: number;
            chars: number;
        };
    }>();
    for (const g of big) {
        const fam = textOf(g.el).family;
        const cur = families.get(fam) ?? { n: 0, top: g };
        cur.n += g.n;
        if (g.chars > cur.top.chars)
            cur.top = g;
        families.set(fam, cur);
    }
    const shown = Array.from(families.values()).filter((f) => f.n >= 3).sort((a, b) => b.n - a.n)[0];
    const display = shown ? { ...textOf(shown.top.el), sample: ownText(shown.top.el).slice(0, 60), count: shown.n } : null;
    const area = new Map<string, {
        area: number;
        kind: "background" | "text";
    }>();
    const add = (h: string | null, a: number, kind: "background" | "text") => {
        if (!h)
            return;
        const k = `${kind}:${h}`;
        const cur = area.get(k) ?? { area: 0, kind };
        cur.area += a;
        area.set(k, cur);
    };
    for (const el of all) {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        add(toHex(s.backgroundColor), r.width * r.height, "background");
        const chars = ownText(el).length;
        if (chars)
            add(toHex(s.color), chars * parseFloat(s.fontSize), "text");
    }
    add(toHex(getComputedStyle(document.body).backgroundColor) ?? "#ffffff", window.innerWidth * window.innerHeight, "background");
    const colors = Array.from(area.entries()).map(([k, v]) => ({ hex: k.split(":")[1], area: Math.round(v.area), kind: v.kind })).sort((a, b) => b.area - a.area).slice(0, 40);
    const vars: {
        name: string;
        hex: string;
    }[] = [];
    const root = getComputedStyle(document.documentElement);
    for (let i = 0; i < root.length && vars.length < 40; i++) {
        const name = root[i];
        if (!name.startsWith("--"))
            continue;
        const v = root.getPropertyValue(name).trim();
        if (/^#[0-9a-f]{6}$/i.test(v))
            vars.push({ name, hex: v.toLowerCase() });
    }
    let logo: RawScan["logo"] = null;
    const header = document.querySelector("header") ?? document.body;
    const img = Array.from(header.querySelectorAll("img")).filter(visible).find((i) => /logo/i.test(`${i.alt} ${i.className} ${i.src}`) || !!i.closest('a[href="/"]'));
    if (img?.currentSrc || img?.src) {
        img.setAttribute("data-ce-logo", "1");
        logo = { kind: "img", src: img.currentSrc || img.src };
    }
    else {
        const svg = Array.from(header.querySelectorAll("svg")).filter(visible).find((s) => /logo/i.test(`${s.getAttribute("class") ?? ""} ${s.getAttribute("aria-label") ?? ""} ${s.parentElement?.className ?? ""}`) || !!s.closest('a[href="/"]'));
        if (svg) {
            const clone = svg.cloneNode(true) as SVGElement;
            const r = svg.getBoundingClientRect();
            clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            clone.setAttribute("width", String(Math.round(r.width * 4)));
            clone.setAttribute("height", String(Math.round(r.height * 4)));
            clone.setAttribute("style", `color:${getComputedStyle(svg).color};fill:${getComputedStyle(svg).fill}`);
            svg.setAttribute("data-ce-logo", "1");
            logo = { kind: "svg", src: clone.outerHTML };
        }
    }
    if (!logo) {
        const el = Array.from(document.querySelectorAll("header img, header svg, a[href='/'] img, a[href='/'] svg, [class*='logo' i] img, [class*='logo' i] svg, [class*='logo' i]")).filter(visible).find((x) => {
            const r = x.getBoundingClientRect();
            return r.top < 220 && r.left < window.innerWidth * 0.6 && r.width >= 40 && r.width <= 420 && r.height >= 14 && r.height <= 160;
        });
        if (el) {
            el.setAttribute("data-ce-logo", "1");
            logo = { kind: "shot", src: "" };
        }
    }
    return { heading, body, display, accent, button, colors, vars, logo, title: document.title };
}
function drawSpecimen(input: {
    fonts: {
        role: string;
        stack: string;
        weight: string;
        style: string;
        transform: string;
        tracking: string;
        label: string;
    }[];
    swatches: {
        hex: string;
        label: string;
    }[];
    headline: string;
    body: string;
}) {
    const old = document.getElementById("ce-specimen");
    old?.remove();
    const el = document.createElement("div");
    el.id = "ce-specimen";
    el.setAttribute("style", "position:fixed;left:0;top:0;width:1200px;height:1880px;z-index:2147483647;background:#ffffff;color:#111111;padding:56px 64px;box-sizing:border-box;overflow:hidden;text-align:left;");
    const label = (t: string) => `<div style="font:500 20px/1.3 Arial,sans-serif;color:#666;letter-spacing:0.04em;margin:0 0 10px;text-transform:none">${t}</div>`;
    const css = (f: (typeof input.fonts)[number], size: number) => `font-family:${f.stack.replace(/"/g, "'")};font-weight:${f.weight};font-style:${f.style};text-transform:${f.transform};letter-spacing:${f.tracking};font-size:${size}px;line-height:1.08;color:#111;margin:0`;
    let html = "";
    for (const f of input.fonts) {
        const big = f.role === "heading" ? 104 : f.role === "display" ? 88 : f.role === "body" ? 44 : 40;
        html += `<div style="margin:0 0 36px">${label(f.label)}<div style="${css(f, big)}">${f.role === "body" ? input.body : input.headline}</div><div style="${css(f, 46)};margin-top:14px">ABCDEFGHIJKLM abcdefghijklm 0123456789 $ % &amp; ! ?</div></div>`;
    }
    html += `<div>${label("Brand colours")}<div style="display:flex;gap:18px;flex-wrap:wrap">${input.swatches.map((s) => `<div style="width:160px"><div style="height:120px;border-radius:10px;background:${s.hex};border:1px solid #ddd"></div><div style="font:500 20px/1.3 Arial,sans-serif;color:#333;margin-top:8px">${s.label}<br>${s.hex.toUpperCase()}</div></div>`).join("")}</div></div>`;
    el.innerHTML = html;
    document.body.appendChild(el);
}
const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
function caseOf(t: RawText): string {
    if (t.transform === "uppercase")
        return "uppercase";
    if (t.transform === "lowercase")
        return "lowercase";
    const letters = t.sample.replace(/[^A-Za-z]/g, "");
    if (letters.length >= 6 && letters === letters.toUpperCase())
        return "uppercase";
    if (letters.length >= 6 && letters === letters.toLowerCase())
        return "lowercase";
    const words = t.sample.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
    return words.length >= 3 && words.filter((w) => /^[A-Z]/.test(w)).length / words.length > 0.7 ? "title" : "sentence";
}
const lum = (h: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const sat = (h: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const max = Math.max(r, g, b);
    return max ? (max - Math.min(r, g, b)) / max : 0;
};
const ROLE_LABEL: Record<(typeof ROLES)[number], string> = { heading: "Headline type", display: "Display type, for a big statement line", body: "Body type", accent: "Small tag type" };
const rolesOf = (raw: RawScan): [
    (typeof ROLES)[number],
    RawText
][] => ([["heading", raw.heading], ["display", raw.display], ["body", raw.body], ["accent", raw.accent]] as const).filter((r): r is [
    (typeof ROLES)[number],
    RawText
] => !!r[1]);
const useOf = (role: string, t: RawText): string => {
    if (!t.count)
        return "";
    const eg = t.sample ? `, for example "${t.sample}"` : "";
    if (role === "display")
        return `${t.count} big statement lines on the homepage${eg}`;
    if (role === "accent")
        return `${t.count} small ${t.count === 1 ? "tag" : "tags"} on the homepage${eg}. Short tags only, never a sentence, a quote, a name, a price or a button`;
    return "";
};
const Described = z.object({
    fonts: z.array(z.object({ role: z.enum(ROLES), attributes: z.string(), lookalike: z.string(), well_known: z.boolean() })),
    palette: z.array(z.object({ hex: z.string(), role: z.enum(["primary", "secondary", "accent", "background", "surface", "text", "cta", "other"]), name: z.string(), use: z.string() })).max(8),
    button: z.string(),
    aesthetic: z.string(),
    vertical: z.string(),
});
export interface ScanResult {
    look: BrandLook;
    warnings: string[];
}
export async function scanBrandLook(brandId: string, url: string): Promise<ScanResult> {
    const site = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    new URL(site);
    let pw: typeof import("@playwright/test");
    try {
        pw = await import("@playwright/test");
    }
    catch {
        throw new Error("Scanning a site needs Playwright, which is installed with the app's dev dependencies (pnpm install).");
    }
    const dir = lookDir(brandId);
    fs.mkdirSync(dir, { recursive: true });
    const warnings: string[] = [];
    const browser = await pw.chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge", headless: true });
    try {
        return await scanPage(brandId, site, dir, warnings, await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }));
    }
    finally {
        await browser.close();
    }
}
async function scanPage(brandId: string, site: string, dir: string, warnings: string[], page: Page): Promise<ScanResult> {
    let raw: RawScan;
    let specimen = "";
    let homepage = "";
    let logo = "";
    const shoot = async (selector: string, name: string, width: number) => {
        const png = await page.locator(selector).first().screenshot({ omitBackground: true });
        await sharp(png).resize({ width, withoutEnlargement: true }).png().toFile(path.join(dir, name));
    };
    {
        await page.goto(site, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => undefined);
        await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => undefined);
        await page.waitForTimeout(1200);
        await page.evaluate("globalThis.__name = globalThis.__name || ((f) => f)");
        await page
            .screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } })
            .then((png) => sharp(png).resize({ width: 1440 }).png().toFile(path.join(dir, "homepage.png")))
            .then(() => (homepage = "homepage.png"))
            .catch(() => warnings.push("The homepage screenshot could not be taken."));
        raw = await page.evaluate(readPage);
        await captureFonts(page, brandId).then((r) => warnings.push(...r.warnings)).catch(() => warnings.push("The brand's font files could not be read from the site."));
        if (raw.logo?.kind === "svg") {
            await sharp(Buffer.from(raw.logo.src)).png().toFile(path.join(dir, "logo.png")).then(() => (logo = "logo.png")).catch(() => undefined);
        }
        else if (raw.logo?.kind === "img") {
            try {
                const res = await page.request.get(raw.logo.src, { timeout: 20000 });
                if (res.ok()) {
                    await sharp(await res.body(), { density: 300 }).png().toFile(path.join(dir, "logo.png"));
                    logo = "logo.png";
                }
            }
            catch {
            }
        }
        if (!logo && raw.logo) {
            await shoot("[data-ce-logo]", "logo.png", 1200)
                .then(() => {
                logo = "logo.png";
                warnings.push("The logo was photographed from the site header, with whatever sits behind it. Replace look/logo.png with a clean file if you have one.");
            })
                .catch(() => undefined);
        }
        if (!logo)
            warnings.push("No logo was found in the site header. Add one as look/logo.png in the brand folder.");
        const fonts = rolesOf(raw).map(([role, t]) => ({ role, stack: t.stack, weight: t.weight, style: t.style, transform: t.transform, tracking: t.tracking, label: `${ROLE_LABEL[role]}: ${t.family}, weight ${t.weight}${caseOf(t) === "uppercase" ? ", uppercase" : ""}` }));
        const top = pickPalette(raw);
        await page.evaluate(drawSpecimen, { fonts, swatches: top.map((c) => ({ hex: c.hex, label: c.role })), headline: (raw.heading?.sample || "The quick brown fox").slice(0, 34), body: "The quick brown fox jumps over the lazy dog. 1234567890" });
        await page.waitForTimeout(300);
        await shoot("#ce-specimen", "type-specimen.png", 1200)
            .then(() => (specimen = "type-specimen.png"))
            .catch(() => warnings.push("The type specimen could not be rendered."));
    }
    const base = pickPalette(raw);
    const prev = loadBrandLook(brandId);
    const fontRows: BrandFont[] = rolesOf(raw).map(([role, t]) => ({ role, family: t.family, stack: t.stack, weight: t.weight, style: t.style, letter_case: caseOf(t), tracking: t.tracking, attributes: fallbackAttributes(t), lookalike: "", well_known: false, use: useOf(role, t) }));
    const buttonType = raw.button ? `words set in ${raw.button.text.family}, weight ${raw.button.text.weight}` : "";
    if (!fontRows.length)
        warnings.push("No text styles could be read from the page.");
    let look: BrandLook = {
        site_url: site,
        scanned_at: new Date().toISOString(),
        fonts: fontRows,
        palette: base,
        button: raw.button ? `Filled ${raw.button.background}, text ${raw.button.color}, corner radius ${raw.button.radius}, ${buttonType}` : "",
        aesthetic: "",
        vertical: "",
        specimen,
        homepage,
        logo,
        notes: ["Fonts, weights, case and tracking are the values the browser computed on the live site.", "Colours are ranked by the area they cover on the homepage."],
    };
    if (geminiEnabled()) {
        try {
            const brand = loadBrandBrain(brandId);
            const out = await geminiJson({
                brandId,
                task: "brand_look",
                model: env.MODEL_REFERENCE,
                system: `You describe a brand's typography and colour for an image generator. Image generators cannot load a font by name; they act on attributes. You see the brand's homepage and a specimen of its real typefaces.

Return JSON:
- fonts: for each role given, { role, attributes, lookalike, well_known }. "display" is the brand's second headline face, set on big statement lines; "accent" is the face of its small tags.
  attributes: 1 line of what the typeface looks like, in this order: weight word (thin, light, regular, medium, bold, extra-bold, black), width if not normal (condensed, compressed, extended), category (geometric sans-serif, neo-grotesque sans-serif, humanist sans-serif, rounded sans-serif, high-contrast serif, slab serif, editorial display serif, script, monospace), then case and tracking as used by the brand. Add 1 distinguishing trait if there is one (rounded terminals, single-storey a, tall x-height). Describe what you see in the specimen; the family name alone is not enough.
  well_known: true only for typefaces an image model would know by name (Helvetica, Inter, Futura, Montserrat, Poppins, Bebas Neue, Georgia, Times, Garamond, Playfair Display, Roboto, Open Sans, Lato, Oswald, DM Sans, Work Sans and the like).
  lookalike: the closest widely known typeface, or "" when the family itself is well known.
- palette: up to 8 of the candidate colours, each { hex, role, name, use }. Use only hex values from the candidates. role is 1 of primary, secondary, accent, background, surface, text, cta, other; use each of primary, background, text and cta at most once. name is a plain colour name ("forest green"). use says where the brand uses it. Leave out colours that are only greys from the page furniture unless they are the text or background colour.
- button: 1 line on the brand's main button (shape, fill, text style).
- aesthetic: 3 words.
- vertical: the closest 1 of: ${VERTICALS.join("; ")}.`,
                user: `Brand: ${brand.brand.name}. Category: ${brand.brand.category}.\n\nText styles read from the site:\n${JSON.stringify(fontRows.map((f) => ({ role: f.role, family: f.family, weight: f.weight, style: f.style, letter_case: f.letter_case, tracking: f.tracking, ...(f.use ? { used_for: f.use } : {}) })))}\n\nCandidate colours (by area covered):\n${JSON.stringify(raw.colors.slice(0, 24))}\n\nNamed colour variables in the theme:\n${JSON.stringify(raw.vars.slice(0, 30))}\n\nMain button: ${JSON.stringify(raw.button ? { background: raw.button.background, color: raw.button.color, radius: raw.button.radius } : null)}`,
                schema: Described,
                images: [homepage && path.join(dir, homepage), specimen && path.join(dir, specimen)].filter((x): x is string => !!x),
                effort: "low",
                maxTokens: 4000,
                refType: "brand",
                refId: brandId,
            });
            const known = new Set([...raw.colors.map((c) => c.hex), ...raw.vars.map((v) => v.hex), raw.button?.background ?? "", raw.button?.color ?? ""].map((h) => h.toLowerCase()));
            const palette = out.palette.filter((c) => /^#[0-9a-f]{6}$/i.test(c.hex) && known.has(c.hex.toLowerCase())).map((c) => ({ ...c, hex: c.hex.toLowerCase() }));
            look = {
                ...look,
                fonts: look.fonts.map((f) => {
                    const d = out.fonts.find((x) => x.role === f.role);
                    return d ? { ...f, attributes: d.attributes || f.attributes, lookalike: d.lookalike, well_known: d.well_known } : f;
                }),
                palette: palette.length >= 2 ? palette : look.palette,
                button: out.button ? `${out.button}${buttonType ? ` (${buttonType})` : ""}` : look.button,
                aesthetic: out.aesthetic,
                vertical: (VERTICALS as readonly string[]).includes(out.vertical) ? out.vertical : "",
                notes: [...look.notes, `Type descriptions and colour roles were written by ${env.MODEL_REFERENCE} from the homepage and the specimen.`],
            };
        }
        catch (e) {
            warnings.push(`The type and colour description did not run: ${(e as Error).message.slice(0, 140)}`);
        }
    }
    else
        warnings.push("Live mode is off, so the typefaces are described by rule and colour roles are guessed from coverage.");
    if (!look.aesthetic && prev) {
        const seen = new Set([...raw.colors.map((c) => c.hex), ...raw.vars.map((v) => v.hex), raw.button?.background ?? "", raw.button?.color ?? ""].map((h) => h.toLowerCase()));
        const kept = prev.palette.filter((c) => seen.has(c.hex.toLowerCase()));
        look = {
            ...look,
            fonts: look.fonts.map((f) => {
                const was = prev.fonts.find((x) => x.family === f.family && x.weight === f.weight);
                return was ? { ...f, attributes: was.attributes || f.attributes, lookalike: was.lookalike, well_known: was.well_known } : f;
            }),
            palette: kept.length >= 2 ? kept : look.palette,
            button: prev.button ? `${prev.button.replace(/ \(words set in [^)]*\)$/, "")}${buttonType ? ` (${buttonType})` : ""}` : look.button,
            aesthetic: prev.aesthetic,
            vertical: prev.vertical,
            notes: [...look.notes, `The type descriptions and colour names are kept from the reading of ${prev.scanned_at.slice(0, 10)}.`],
        };
    }
    if (specimen) {
        const fonts = look.fonts.map((f) => ({ role: f.role, stack: f.stack, weight: f.weight, style: f.style, transform: f.letter_case === "uppercase" ? "uppercase" : f.letter_case === "lowercase" ? "lowercase" : "none", tracking: f.tracking, label: `${ROLE_LABEL[f.role]}: ${f.family}, weight ${f.weight}${f.letter_case === "uppercase" ? ", uppercase" : ""}` }));
        await page
            .evaluate(drawSpecimen, { fonts, swatches: look.palette.map((c) => ({ hex: c.hex, label: `${c.role}: ${c.name}` })), headline: (raw.heading?.sample || "The quick brown fox").slice(0, 34), body: "The quick brown fox jumps over the lazy dog. 1234567890" })
            .then(() => page.waitForTimeout(200))
            .then(() => shoot("#ce-specimen", "type-specimen.png", 1200))
            .catch(() => undefined);
    }
    saveBrandLook(brandId, look);
    return { look, warnings };
}
function pickPalette(raw: RawScan): BrandLook["palette"] {
    const out: BrandLook["palette"] = [];
    const seen = new Set<string>();
    const add = (role: BrandLook["palette"][number]["role"], h: string | undefined, use: string) => {
        if (!h || !/^#[0-9a-f]{6}$/i.test(h) || seen.has(h))
            return;
        seen.add(h);
        out.push({ role, name: h, hex: h.toLowerCase(), use });
    };
    const bg = raw.colors.filter((c) => c.kind === "background");
    const text = raw.colors.filter((c) => c.kind === "text");
    add("background", bg[0]?.hex, "Page background");
    add("text", text[0]?.hex, "Running text");
    add("cta", raw.button?.background, "Main button");
    const vivid = bg.filter((c) => sat(c.hex) > 0.25 && lum(c.hex) > 0.04 && lum(c.hex) < 0.96);
    add("primary", vivid[0]?.hex, "Largest coloured area");
    add("secondary", vivid[1]?.hex, "Second coloured area");
    add("accent", vivid[2]?.hex ?? text.find((c) => sat(c.hex) > 0.3)?.hex, "Accent");
    return out;
}
function fallbackAttributes(t: RawText): string {
    const w = Number(t.weight) || 400;
    const weight = w >= 850 ? "black" : w >= 750 ? "extra-bold" : w >= 650 ? "bold" : w >= 550 ? "semi-bold" : w >= 450 ? "medium" : w >= 350 ? "regular" : "light";
    const serif = /serif/i.test(t.stack) && !/sans-serif/i.test(t.stack.split(",").slice(-1)[0] ?? "") ? "serif" : "sans-serif";
    const c = caseOf(t);
    const track = t.tracking === "normal" ? "" : parseFloat(t.tracking) < 0 ? ", tight tracking" : ", wide tracking";
    return `${weight} ${serif}, ${c === "sentence" ? "sentence case" : c === "title" ? "title case" : c}${track}`;
}
const fontLine = (f: BrandFont) => {
    const name = f.well_known ? `, the typeface ${f.family}` : f.lookalike ? `, similar in feel to ${f.lookalike}` : "";
    return `${f.attributes || fallbackAttributes({ family: f.family, stack: f.stack, weight: f.weight, style: f.style, transform: f.letter_case, tracking: f.tracking, size: 16, color: "", sample: "" })}${name} (the brand's ${f.family}, weight ${f.weight})`;
};
const used = (f: BrandFont) => (f.use ? `. On the brand's site: ${f.use}` : "");
export function lookFingerprint(look: BrandLook | null): string {
    if (!look)
        return "";
    const c = (role: string) => look.palette.find((p) => p.role === role);
    const colour = (label: string, role: string) => (c(role) ? `${label}: ${c(role)!.hex.toUpperCase()} (${c(role)!.name})` : "");
    const f = (role: string) => look.fonts.find((x) => x.role === role);
    const lines = [
        colour("PRIMARY", "primary"),
        colour("SECONDARY", "secondary"),
        colour("ACCENT", "accent"),
        colour("BACKGROUND", "background"),
        colour("TEXT", "text"),
        colour("BUTTON", "cta"),
        f("heading") ? `HEADLINE TYPE: ${fontLine(f("heading")!)}` : "",
        f("display") ? `DISPLAY TYPE, the brand's second headline face, for a big statement line: ${fontLine(f("display")!)}${used(f("display")!)}` : "",
        f("body") ? `BODY TYPE, also for subheads, points, labels, captions, quotes, names and prices: ${fontLine(f("body")!)}` : "",
        f("accent") ? `SMALL TAG TYPE, short tags of 1 to 3 words only: ${fontLine(f("accent")!)}${used(f("accent")!)}` : "",
        look.button ? `BUTTON: ${look.button}` : "",
        look.aesthetic ? `AESTHETIC: ${titleCase(look.aesthetic)}` : "",
    ].filter(Boolean);
    return lines.join("\n");
}
export function lookContext(look: BrandLook | null): Record<string, unknown> | null {
    if (!look)
        return null;
    return { palette: look.palette.map((p) => ({ role: p.role, hex: p.hex, name: p.name, use: p.use })), fonts: look.fonts.map((f) => ({ role: f.role, family: f.family, weight: f.weight, case: f.letter_case, tracking: f.tracking, describe_as: fontLine(f), ...(f.use ? { used_for: f.use } : {}) })), button: look.button, aesthetic: look.aesthetic };
}
