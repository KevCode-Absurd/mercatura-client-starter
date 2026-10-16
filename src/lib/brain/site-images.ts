import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { brandBrainDir } from "../brand-brain";
import { getBrandRow } from "../brands";
import { readDoc } from "./docs";
import { PAGE_PREFIX, SITE_FOLDER, assetFolders, catalogOf, cleanTitle, fetchStore, type StoreProduct } from "./products";
export { SITE_FOLDER } from "./products";
export const MAX_PER_PRODUCT = 40;
export const MAX_FOR_SITE = 120;
const MAX_PAGES = 8;
const WIDTH = 1600;
const UA = "Mozilla/5.0 (compatible; brand-catalogue)";
const EXT = /\.(png|jpe?g|webp)$/i;
const SIZE_PART = String.raw `_(?:\d{2,}x\d*|x\d{2,}|pico|icon|thumb|small|compact|medium|large|grande|original|master)(?:@[23]x)?`;
const SIZE = new RegExp(`${SIZE_PART}$`, "i");
const safe = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
function stem(url: string): string {
    let name = path.posix.basename(new URL(url).pathname);
    try {
        name = decodeURIComponent(name);
    }
    catch {
    }
    return safe(name.replace(EXT, "").replace(SIZE, ""));
}
export const imageKey = (url: string) => stem(url).toLowerCase();
export const fileKey = (file: string) => safe(file.replace(/^\d{1,3}-/, "").replace(new RegExp(`^${PAGE_PREFIX}`), "").replace(EXT, "").replace(SIZE, "")).toLowerCase();
const NOISE = /(^|[-_.])(icons?|logos?|badges?|sprites?|favicon|flags?|stars?|ratings?|arrows?|chevron|check(mark)?|tick|placeholder|spinner|loader|loading|payments?|visa|mastercard|amex|paypal|klarna|afterpay|shop-?pay|apple-?pay|google-?pay|trustpilot|avatar|pixel|spacer|toggle)([-_.]|\d|$)/i;
const PHONE = new Set(["mobile", "mob", "phone"]);
const SCREEN = new Set(["desktop", "dsk", ...PHONE]);
const twinOf = (key: string) => key.split(/[-_.]+/).filter((w) => w && !SCREEN.has(w)).join("-");
const forPhone = (key: string) => key.split(/[-_.]+/).some((w) => PHONE.has(w));
function resolve(raw: string, page: string): string | null {
    const s = raw.trim().replace(/&amp;/g, "&").replace(/_\{width\}x/g, "").replace(/\{width\}/g, String(WIDTH));
    if (!s || /^(data|blob|javascript):/i.test(s))
        return null;
    try {
        let u = new URL(s, page);
        const inner = /\/_next\/image\/?$/.test(u.pathname) ? u.searchParams.get("url") : null;
        if (inner)
            u = new URL(inner, page);
        return /^https?:$/.test(u.protocol) && EXT.test(u.pathname) ? u.toString() : null;
    }
    catch {
        return null;
    }
}
function widest(srcset: string): string {
    let best = "";
    let top = -1;
    for (const part of srcset.split(/,\s+|,(?=https?:|\/)/)) {
        const [url, size] = part.trim().split(/\s+/);
        const n = Number.parseFloat(size ?? "") || 0;
        if (url && n >= top)
            [best, top] = [url, n];
    }
    return best;
}
export interface PageImage {
    url: string;
    key: string;
    link: string;
}
const ATTR = /\b(src|data-src|data-lazy-src|data-original|poster|data-bg|srcset|data-srcset|data-bgset)\s*=\s*(?:"([^"]*)"|'([^']*)')|url\(\s*(?:&quot;|["'])?([^"')&]+)/gi;
export function imagesInPage(html: string, pageUrl: string): PageImage[] {
    let body = html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, " ");
    const from = body.search(/<main\b/i);
    const to = body.toLowerCase().lastIndexOf("</main>");
    body = from > -1 && to > from ? body.slice(from, to) : body.replace(/<(header|footer|nav)\b[\s\S]*?<\/\1>/gi, " ");
    const links: {
        at: number;
        end: number;
        path: string;
    }[] = [];
    for (const m of body.matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+)["']/gi)) {
        const end = body.indexOf("</a>", m.index);
        try {
            links.push({ at: m.index, end: end > -1 ? end : m.index, path: new URL(m[1].replace(/&amp;/g, "&"), pageUrl).pathname.replace(/\/$/, "") });
        }
        catch {
        }
    }
    const out = new Map<string, PageImage>();
    for (const m of body.matchAll(ATTR)) {
        const name = (m[1] ?? "").toLowerCase();
        const value = m[2] ?? m[3] ?? m[4] ?? "";
        const url = resolve(name.endsWith("set") ? widest(value) : value, pageUrl);
        if (!url)
            continue;
        const key = imageKey(url);
        if (!key || out.has(key))
            continue;
        const at = m.index;
        out.set(key, { url, key, link: links.find((l) => l.at < at && at < l.end)?.path ?? "" });
    }
    return [...out.values()];
}
export function fullSize(url: string): string[] {
    const u = new URL(url);
    if (/(^|\.)cdn\.shopify\.com$/i.test(u.hostname) || u.pathname.includes("/cdn/shop/")) {
        const v = u.searchParams.get("v");
        u.search = "";
        if (v)
            u.searchParams.set("v", v);
        u.searchParams.set("width", String(WIDTH));
        const asGiven = u.toString();
        u.pathname = u.pathname.replace(new RegExp(`${SIZE_PART}(?=\\.(?:png|jpe?g|webp)$)`, "i"), "");
        return [...new Set([u.toString(), asGiven])];
    }
    for (const [w, h] of [["width", "height"], ["w", "h"]] as const) {
        if (!u.searchParams.has(w))
            continue;
        u.searchParams.set(w, String(WIDTH));
        u.searchParams.delete(h);
    }
    return [u.toString()];
}
const PAGE_SKIP = /gift-?card|cart|checkout|account|login|register|sign-?in|privacy|terms|polic|refund|returns|shipping|delivery|cookie|blog|news|article|career|jobs|press|contact|wishlist|locator|stockist|find-a-store|referr|affiliate|wholesale|resale|track|faq|help|support|accessib|sitemap|search|rewards|subscri|legal|\.[a-z0-9]{2,5}$/i;
const PAGE_FIRST = /about|story|science|ingredient|how|why|review|result|collection|shop|range|mission|quality/i;
export function sitePages(html: string, home: string, productPaths: Set<string> = new Set(), max = MAX_PAGES): string[] {
    const origin = new URL(home).origin;
    const seen = new Set<string>();
    for (const m of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"'#?]+)/gi)) {
        try {
            const u = new URL(m[1], home);
            const p = u.pathname.replace(/\/$/, "");
            if (u.origin !== origin || !p || productPaths.has(p) || /\/products?\//i.test(`${p}/`) || /^\/[a-z]{2}(-[a-z]{2})?(\/|$)/i.test(p) || PAGE_SKIP.test(p) || p.split("/").length > 4)
                continue;
            seen.add(p);
        }
        catch {
        }
    }
    return [...seen].sort((a, b) => Number(PAGE_FIRST.test(b)) - Number(PAGE_FIRST.test(a)) || a.length - b.length || a.localeCompare(b)).slice(0, max).map((p) => `${origin}${p}`);
}
export interface FoundImage {
    key: string;
    url: string;
    page: string;
    folder: string;
}
export function fileImages(input: {
    products: {
        folder: string;
        page: string;
        images: PageImage[];
    }[];
    pages: {
        page: string;
        images: PageImage[];
    }[];
    have?: Set<string>;
    known?: Set<string>;
    gallery?: Map<string, string>;
}): FoundImage[] {
    const { products, pages, have = new Set(), known = new Set(), gallery = new Map<string, string>() } = input;
    const every = [...products, ...pages].flatMap((p) => p.images);
    const twin = new Map<string, string>();
    for (const i of every) {
        const t = twinOf(i.key);
        const cur = twin.get(t);
        if (!cur || (forPhone(cur) && !forPhone(i.key)))
            twin.set(t, i.key);
    }
    const onPages = new Map<string, Set<string>>();
    for (const p of products)
        for (const i of p.images)
            onPages.set(i.key, (onPages.get(i.key) ?? new Set()).add(p.folder));
    const byPath = new Map(products.map((p) => [new URL(p.page).pathname.replace(/\/$/, ""), p.folder]));
    const placed = new Set<string>();
    const keep = (i: PageImage) => twin.get(twinOf(i.key)) === i.key && !NOISE.test(i.key) && !have.has(i.key) && !known.has(i.key) && !placed.has(i.key);
    const put = (to: FoundImage[], i: PageImage, page: string, folder: string) => {
        placed.add(i.key);
        to.push({ key: i.key, url: i.url, page, folder });
    };
    const own: FoundImage[] = [];
    const shared: FoundImage[] = [];
    const rest: FoundImage[] = [];
    for (const p of products) {
        for (const i of p.images) {
            if (!keep(i))
                continue;
            const owner = gallery.get(i.key);
            if (owner && owner !== p.folder)
                continue;
            if (owner !== p.folder && (onPages.get(i.key)?.size ?? 0) > 1)
                continue;
            put(own, i, p.page, p.folder);
        }
    }
    for (const p of products)
        for (const i of p.images)
            if (keep(i) && !gallery.has(i.key))
                put(shared, i, p.page, SITE_FOLDER);
    for (const p of pages)
        for (const i of p.images)
            if (keep(i) && !gallery.has(i.key))
                put(rest, i, p.page, byPath.get(i.link) ?? SITE_FOLDER);
    return [...own, ...rest, ...shared];
}
export interface SiteImageRecord {
    source: string;
    page: string;
}
interface SiteImagesFile {
    site: string;
    pulled_at: string;
    images: Record<string, SiteImageRecord>;
    seen: string[];
}
function assetsRoot(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error("Unknown brand.");
    return path.join(brandBrainDir(row.dir), "assets");
}
const recordFile = (brandId: string) => path.join(assetsRoot(brandId), "site-images.json");
export function siteImageRecords(brandId: string): SiteImagesFile {
    try {
        const f = JSON.parse(fs.readFileSync(recordFile(brandId), "utf-8")) as Partial<SiteImagesFile>;
        return { site: f.site ?? "", pulled_at: f.pulled_at ?? "", images: f.images ?? {}, seen: f.seen ?? [] };
    }
    catch {
        return { site: "", pulled_at: "", images: {}, seen: [] };
    }
}
function saveRecords(brandId: string, f: SiteImagesFile) {
    fs.mkdirSync(assetsRoot(brandId), { recursive: true });
    fs.writeFileSync(recordFile(brandId), `${JSON.stringify(f, null, 2)}\n`, "utf-8");
}
async function each<T>(items: T[], at: number, fn: (item: T) => Promise<void>) {
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(at, items.length) }, async () => {
        for (;;) {
            const item = items[next++];
            if (item === undefined)
                return;
            await fn(item);
        }
    }));
}
export interface SitePull {
    pages: number;
    pagesFailed: number;
    saved: number;
    byProduct: Record<string, number>;
    forBrand: number;
    left: number;
    failed: number;
    cut: number;
}
export async function pullSiteImages(brandId: string, site: string, fetcher: typeof fetch = fetch): Promise<SitePull> {
    const root = assetsRoot(brandId);
    const home = new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`);
    const folders = assetFolders(brandId);
    const catalog = catalogOf(readDoc(brandId, "products").doc, folders);
    const html = async (url: string): Promise<string | null> => {
        try {
            const res = await fetcher(url, { headers: { accept: "text/html,*/*", "user-agent": UA }, signal: AbortSignal.timeout(30000) });
            return res.ok ? (await res.text()).slice(0, 6000000) : null;
        }
        catch {
            return null;
        }
    };
    const entries = catalog.filter((c) => /^https?:\/\//i.test(c.url)).map((c) => ({ page: c.url.split(/[?#]/)[0], folder: c.folder || cleanTitle(c.name).replace(/[<>:"?*]/g, "").trim() }));
    let pagesFailed = 0;
    const products: {
        folder: string;
        page: string;
        images: PageImage[];
    }[] = [];
    await each(entries, 3, async (e) => {
        const body = await html(e.page);
        if (body === null)
            return void pagesFailed++;
        products.push({ ...e, images: imagesInPage(body, e.page) });
    });
    products.sort((a, b) => entries.findIndex((e) => e.page === a.page) - entries.findIndex((e) => e.page === b.page));
    const pages: {
        page: string;
        images: PageImage[];
    }[] = [];
    const front = await html(home.origin);
    if (front === null)
        pagesFailed++;
    else {
        pages.push({ page: home.origin, images: imagesInPage(front, home.origin) });
        const paths = new Set(entries.map((e) => new URL(e.page).pathname.replace(/\/$/, "")));
        for (const page of sitePages(front, home.origin, paths)) {
            const body = await html(page);
            if (body === null)
                pagesFailed++;
            else
                pages.push({ page, images: imagesInPage(body, page) });
        }
    }
    if (!products.length && !pages.length)
        throw new Error("The site did not answer. Check the address, or add the pictures by hand.");
    const gallery = new Map<string, string>();
    let store: StoreProduct[] = [];
    try {
        store = await fetchStore(home.origin, fetcher);
    }
    catch {
    }
    for (const p of store) {
        const folder = entries.find((e) => new RegExp(`/products/${p.handle}(?![\\w-])`).test(e.page))?.folder ?? `store:${p.handle}`;
        for (const img of p.images ?? []) {
            try {
                gallery.set(imageKey(img.src), folder);
            }
            catch {
            }
        }
    }
    const records = siteImageRecords(brandId);
    const have = new Set(Object.values(folders).flatMap((files) => files.map(fileKey)));
    const found = fileImages({ products, pages, have, known: new Set(records.seen), gallery });
    const out: SitePull = { pages: products.length + pages.length, pagesFailed, saved: 0, byProduct: {}, forBrand: 0, left: 0, failed: 0, cut: 0 };
    const seen = new Set(records.seen);
    const taken = new Set<string>();
    const save = async (f: FoundImage): Promise<boolean> => {
        try {
            let res: Response | null = null;
            for (const from of fullSize(f.url)) {
                res = await fetcher(from, { headers: { "user-agent": UA, accept: "image/webp,image/png,image/jpeg" }, signal: AbortSignal.timeout(60000) });
                if (res.ok)
                    break;
            }
            if (!res?.ok)
                throw new Error(String(res?.status));
            const buf = Buffer.from(await res.arrayBuffer());
            if (buf.length > 20 * 1024 * 1024)
                throw new Error("size");
            const meta = await sharp(buf).metadata();
            const [w, h] = [meta.width ?? 0, meta.height ?? 0];
            const ext = meta.format === "jpeg" ? "jpg" : meta.format === "png" || meta.format === "webp" ? meta.format : "";
            seen.add(f.key);
            if (!ext || Math.min(w, h) < 400 || Math.max(w, h) < 600 || Math.max(w, h) / Math.min(w, h) > 3) {
                out.left++;
                return false;
            }
            const dir = path.join(root, f.folder);
            const base = `${f.folder === SITE_FOLDER ? "" : PAGE_PREFIX}${stem(f.url)}`;
            let name = `${base}.${ext}`;
            for (let n = 2; taken.has(`${f.folder}/${name}`.toLowerCase()) || fs.existsSync(path.join(dir, name)); n++)
                name = `${base}-${n}.${ext}`;
            taken.add(`${f.folder}/${name}`.toLowerCase());
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, name), buf);
            records.images[`${f.folder}/${name}`] = { source: f.url, page: f.page };
            out.saved++;
            if (f.folder === SITE_FOLDER)
                out.forBrand++;
            else
                out.byProduct[f.folder] = (out.byProduct[f.folder] ?? 0) + 1;
            return true;
        }
        catch {
            out.failed++;
            return false;
        }
    };
    const byFolder = new Map<string, FoundImage[]>();
    for (const f of found)
        byFolder.set(f.folder, [...(byFolder.get(f.folder) ?? []), f]);
    await each([...byFolder], 4, async ([folder, list]) => {
        let room = (folder === SITE_FOLDER ? MAX_FOR_SITE : MAX_PER_PRODUCT) - Object.keys(records.images).filter((rel) => rel.startsWith(`${folder}/`)).length;
        for (let at = 0; at < list.length;) {
            if (room <= 0) {
                out.cut += list.length - at;
                break;
            }
            const batch = list.slice(at, at + Math.min(4, room));
            at += batch.length;
            room -= (await Promise.all(batch.map(save))).filter(Boolean).length;
        }
    });
    saveRecords(brandId, { site: home.origin, pulled_at: new Date().toISOString(), images: records.images, seen: [...seen].sort() });
    return out;
}
export async function refileSiteImages(brandId: string, shown: {
    file: string;
    product_id: string;
}[], folderOf: (productId: string) => string): Promise<{
    from: string;
    to: string;
}[]> {
    const root = assetsRoot(brandId);
    const records = siteImageRecords(brandId);
    const moves: {
        from: string;
        to: string;
    }[] = [];
    try {
        for (const a of shown) {
            const [folder, name] = a.file.split("/");
            const to = a.product_id ? folderOf(a.product_id) : "";
            if (folder !== SITE_FOLDER || !name || !to || to === SITE_FOLDER || !records.images[a.file] || !fs.existsSync(path.join(root, folder, name)))
                continue;
            const ext = path.extname(name);
            const base = `${PAGE_PREFIX}${name.slice(0, name.length - ext.length)}`;
            let next = `${base}${ext}`;
            for (let n = 2; fs.existsSync(path.join(root, to, next)); n++)
                next = `${base}-${n}${ext}`;
            fs.mkdirSync(path.join(root, to), { recursive: true });
            if (!(await moveFile(path.join(root, folder, name), path.join(root, to, next))))
                continue;
            records.images[`${to}/${next}`] = records.images[a.file];
            delete records.images[a.file];
            moves.push({ from: a.file, to: `${to}/${next}` });
        }
    }
    finally {
        if (moves.length)
            saveRecords(brandId, records);
    }
    return moves;
}
async function moveFile(from: string, to: string): Promise<boolean> {
    for (let attempt = 1; attempt <= 6; attempt++) {
        try {
            fs.renameSync(from, to);
            return true;
        }
        catch (e) {
            if (!["EBUSY", "EPERM", "EACCES"].includes((e as NodeJS.ErrnoException).code ?? ""))
                throw e;
            await new Promise((done) => setTimeout(done, 250 * attempt));
        }
    }
    return false;
}
