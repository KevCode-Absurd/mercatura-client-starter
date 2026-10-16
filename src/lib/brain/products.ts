import fs from "node:fs";
import path from "node:path";
import { brandBrainDir, type BrandBrain } from "../brand-brain";
import { getBrandRow } from "../brands";
import { currencySymbol } from "../money";
import { brainDocPath, readDoc, sec, today, writeDoc } from "./docs";
import { addSection, childrenOf, fieldItem, fieldValue, fieldsOf, setField, slug, type Doc, type Section } from "./md";
export const PRODUCT_FIELDS = ["Price", "URL", "What it is", "Key features", "Who buys it", "Core benefit", "Positioning angle", "Variants", "Stock", "Photos", "In ads"] as const;
export const CAMERA_FIELDS = ["Looks like", "Pack", "How it is used", "Visible result", "Moves and sounds", "Never show", "Reference photos"] as const;
export const FACT_FIELDS = ["Kind", "How it works", "Replaces", "Made of", "Size and fit", "In the box", "Lasts and care"] as const;
export interface CatalogProduct {
    id: string;
    name: string;
    fields: {
        key: string;
        value: string;
    }[];
    price: string;
    url: string;
    what: string;
    benefit: string;
    angle: string;
    who: string;
    stock: string;
    folder: string;
    photos: string[];
    tags: string[];
}
const IMG = /\.(png|jpe?g|webp)$/i;
export const PAGE_PREFIX = "page-";
export const fromPage = (file: string) => file.startsWith(PAGE_PREFIX);
export const SITE_FOLDER = "Website";
export function assetFolders(brandId: string): Record<string, string[]> {
    const row = getBrandRow(brandId);
    const root = row ? path.join(brandBrainDir(row.dir), "assets") : "";
    if (!root || !fs.existsSync(root))
        return {};
    const out: Record<string, string[]> = {};
    for (const d of fs.readdirSync(root, { withFileTypes: true })) {
        if (!d.isDirectory())
            continue;
        const files = fs.readdirSync(path.join(root, d.name)).filter((f) => IMG.test(f)).sort();
        if (files.length)
            out[d.name] = files;
    }
    return out;
}
const words = (s: string) => new Set(slug(s).split("-").filter((w) => w.length > 1));
export function matchFolder(name: string, named: string, folders: string[]): string {
    if (named && folders.includes(named))
        return named;
    const exact = folders.find((f) => slug(f) === slug(name));
    if (exact)
        return exact;
    const want = words(name);
    let best = "";
    let top = 0;
    let most = 0;
    for (const f of folders) {
        const have = words(f);
        if (want.has("kids") !== have.has("kids"))
            continue;
        const shared = [...want].filter((w) => have.has(w)).length;
        const score = shared / new Set([...want, ...have]).size;
        if (score > top || (score === top && shared > most)) {
            top = score;
            most = shared;
            best = f;
        }
    }
    return top >= 0.5 ? best : "";
}
function tagsOf(s: Section, stock: string): string[] {
    const t: string[] = [];
    const text = `${s.title} ${fieldsOf(s).map((f) => f.value).join(" ")}`;
    if (/\blimited\b|\bLTO\b/i.test(text))
        t.push("Limited");
    if (/sold out/i.test(stock))
        t.push("Part sold out");
    if (/\bmerch\b|hoodie|h[uü]die|\btee\b|\btote\b|\bhat\b/i.test(s.title))
        t.push("Merchandise");
    if (/best seller|hero/i.test(text))
        t.push("Best seller");
    return t;
}
export function catalogOf(doc: Doc, folders: Record<string, string[]> = {}): CatalogProduct[] {
    const root = sec(doc, "catalog");
    if (!root)
        return [];
    return childrenOf(doc, root)
        .filter((s) => s.level === root.level + 1)
        .map((s) => {
        const stock = fieldValue(s, "Stock");
        const folder = matchFolder(s.title, fieldValue(s, "Photos"), Object.keys(folders));
        return {
            id: s.id,
            name: s.title,
            fields: fieldsOf(s),
            price: fieldValue(s, "Price"),
            url: fieldValue(s, "URL"),
            what: fieldValue(s, "What it is"),
            benefit: fieldValue(s, "Core benefit"),
            angle: fieldValue(s, "Positioning angle"),
            who: fieldValue(s, "Who buys it"),
            stock,
            folder,
            photos: folder ? folders[folder] : [],
            tags: tagsOf(s, stock),
        };
    });
}
export const catalogProducts = (brandId: string) => catalogOf(readDoc(brandId, "products").doc, assetFolders(brandId));
type ListedProduct = BrandBrain["products"][number];
const NAME_NOISE = new Set(["ages", "to", "the", "and", "of", "for", "with"]);
const nameWords = (s: string) => new Set([...words(s)].filter((w) => !NAME_NOISE.has(w) && !/^[0-9]+$/.test(w)));
function alike(a: string, b: string): number {
    if (slug(a) === slug(b))
        return 1;
    const x = nameWords(a);
    const y = nameWords(b);
    if (x.has("kids") !== y.has("kids"))
        return 0;
    const shared = [...x].filter((w) => y.has(w)).length;
    return shared < 2 ? 0 : shared / new Set([...x, ...y]).size;
}
const said = (v: string) => (v && !/^not (captured|written|known)/i.test(v.trim()) ? v.replace(/\s+/g, " ").trim() : "");
export function productsFromCatalog(catalog: CatalogProduct[], listed: Pick<ListedProduct, "id" | "name">[]): ListedProduct[] {
    const taken = new Set<string>();
    for (const p of listed) {
        let best: CatalogProduct | undefined;
        let top = 0;
        for (const c of catalog) {
            const score = taken.has(c.id) ? 0 : alike(p.name, c.name);
            if (score > top)
                [best, top] = [c, score];
        }
        if (best && top >= 0.6)
            taken.add(best.id);
    }
    const ids = new Set(listed.map((p) => p.id));
    const out: ListedProduct[] = [];
    for (const c of catalog) {
        if (taken.has(c.id))
            continue;
        const id = `prd_${slug(c.name).replace(/-/g, "_")}`.slice(0, 64);
        if (!c.name.trim() || ids.has(id))
            continue;
        ids.add(id);
        const what = said(c.what);
        const specs = ["Made of", "Size and fit"].map((name) => ({ name, value: said(c.fields.find((f) => f.key === name)?.value ?? "") })).filter((x) => x.value);
        out.push({ id, name: c.name, format: (what.length > 220 ? `${what.slice(0, 219).trimEnd()}…` : what) || (c.tags.includes("Merchandise") ? "Merchandise" : ""), ...(specs.length ? { specs } : {}) });
    }
    return out;
}
const fromCatalog = new Map<string, {
    key: string;
    products: ListedProduct[];
}>();
export function catalogAsProducts(brandId: string, listed: Pick<ListedProduct, "id" | "name">[]): ListedProduct[] {
    try {
        const file = brainDocPath(brandId, "products");
        if (!fs.existsSync(file))
            return [];
        const stat = fs.statSync(file);
        const key = `${stat.mtimeMs}:${stat.size}:${listed.map((p) => `${p.id}=${p.name}`).join("|")}`;
        const hit = fromCatalog.get(brandId);
        if (hit?.key === key)
            return hit.products;
        const products = productsFromCatalog(catalogOf(readDoc(brandId, "products").doc), listed);
        fromCatalog.set(brandId, { key, products });
        return products;
    }
    catch {
        return [];
    }
}
export function addProduct(brandId: string, name: string): string {
    const title = name.replace(/[\r\n#|]+/g, " ").trim().slice(0, 120);
    if (!title)
        throw new Error("Give the product a name.");
    const { doc } = readDoc(brandId, "products");
    if (!sec(doc, "catalog"))
        addSection(doc, { level: 2, title: "Product catalog", blocks: [] });
    if (catalogOf(doc).some((p) => slug(p.name) === slug(title)))
        throw new Error("That product is already in the catalogue.");
    const s = addSection(doc, { level: 3, title, blocks: [{ kind: "list", ordered: false, items: ["Price", "URL", "What it is", "Key features", "Who buys it", "Core benefit", "Positioning angle", ...FACT_FIELDS, ...CAMERA_FIELDS].map((k) => fieldItem(k, "")) }] }, "Product catalog");
    writeDoc(brandId, "products", doc);
    return s.id;
}
export interface StoreProduct {
    title: string;
    handle: string;
    product_type?: string;
    body_html?: string;
    variants?: {
        title?: string;
        price?: string;
        available?: boolean;
    }[];
    images?: {
        src: string;
        position?: number;
    }[];
}
const NOT_A_PRODUCT = /shipping protection|free returns|warranty|gift card|route |re:do|package protection|insurance|cash\s?back|upgrade to /i;
const stripHtml = (h: string) => h.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
export const cleanTitle = (t: string) => t.replace(/[\u{1F000}-\u{1FAFF}☀-➿]/gu, "").replace(/[/\\|#]/g, "-").replace(/\s+/g, " ").trim();
export async function fetchStore(site: string, fetcher: typeof fetch = fetch): Promise<StoreProduct[]> {
    const origin = new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`).origin;
    const out: StoreProduct[] = [];
    for (let page = 1; page <= 4; page++) {
        const res = await fetcher(`${origin}/products.json?limit=250&page=${page}`, { headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (compatible; brand-catalogue)" } });
        if (!res.ok)
            throw new Error(page === 1 ? `The store did not give a product list (${res.status}). Add the products by hand, or paste a price list into the brand's notes.` : `Page ${page} of the product list failed (${res.status}).`);
        const body = (await res.json()) as {
            products?: StoreProduct[];
        };
        const batch = body.products ?? [];
        out.push(...batch);
        if (batch.length < 250)
            break;
    }
    return out.filter((p) => p.title && !NOT_A_PRODUCT.test(p.title) && (p.variants ?? []).some((v) => Number(v.price) > 0));
}
function priceLine(p: StoreProduct, symbol: string): string {
    const prices = (p.variants ?? []).map((v) => Number(v.price)).filter((n) => Number.isFinite(n) && n > 0);
    if (!prices.length)
        return "";
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const n = (p.variants ?? []).length;
    return `${symbol}${lo.toFixed(2)}${hi > lo ? ` to ${symbol}${hi.toFixed(2)}` : ""}${n > 1 ? ` (${n} versions)` : ""}, store price on ${today()}`;
}
function stockLine(p: StoreProduct): string {
    const v = p.variants ?? [];
    const out = v.filter((x) => x.available === false);
    if (!v.length || !out.length)
        return `In stock on ${today()}`;
    if (out.length === v.length)
        return `SOLD OUT on ${today()}`;
    return `Sold out on ${today()}: ${out.map((x) => x.title).filter(Boolean).slice(0, 6).join("; ")}`;
}
const variantLine = (p: StoreProduct) => {
    const names = (p.variants ?? []).map((v) => v.title ?? "").filter((t) => t && t !== "Default Title");
    return names.length > 1 ? names.slice(0, 12).join("; ") : "";
};
export function mergeStore(doc: Doc, site: string, products: StoreProduct[], symbol: string, folders: string[] = []): {
    added: string[];
    refreshed: string[];
} {
    const origin = new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`).origin;
    if (!sec(doc, "catalog"))
        addSection(doc, { level: 2, title: "Product catalog", blocks: [] });
    const added: string[] = [];
    const refreshed: string[] = [];
    for (const p of products) {
        const title = cleanTitle(p.title);
        const root = sec(doc, "catalog")!;
        const kids = childrenOf(doc, root).filter((s) => s.level === root.level + 1);
        const hit = kids.find((s) => new RegExp(`/products/${p.handle}(?![\\w-])`).test(fieldValue(s, "URL"))) ?? kids.find((s) => slug(s.title) === slug(title));
        if (hit) {
            const price = priceLine(p, symbol);
            if (price)
                setField(hit, "Store price", price);
            setField(hit, "Stock", stockLine(p));
            refreshed.push(hit.title);
            continue;
        }
        const what = stripHtml(p.body_html ?? "").split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").slice(0, 320);
        const folder = matchFolder(title, "", folders);
        const items = [
            fieldItem("Price", priceLine(p, symbol)),
            fieldItem("URL", `${origin}/products/${p.handle}`),
            fieldItem("What it is", what),
            fieldItem("Key features", ""),
            fieldItem("Who buys it", ""),
            fieldItem("Core benefit", ""),
            fieldItem("Positioning angle", ""),
            ...(variantLine(p) ? [fieldItem("Variants", variantLine(p))] : []),
            fieldItem("Stock", stockLine(p)),
            ...(folder ? [fieldItem("Photos", folder)] : []),
        ];
        addSection(doc, { level: 3, title, blocks: [{ kind: "list", ordered: false, items }] }, root.title);
        added.push(title);
    }
    return { added, refreshed };
}
export async function pullImages(brandId: string, products: StoreProduct[], fetcher: typeof fetch = fetch): Promise<{
    saved: number;
    products: number;
    failed: number;
}> {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error("Unknown brand.");
    const root = path.join(brandBrainDir(row.dir), "assets");
    const have = assetFolders(brandId);
    const catalog = catalogOf(readDoc(brandId, "products").doc, have);
    let saved = 0;
    let failed = 0;
    let touched = 0;
    for (const p of products) {
        const entry = catalog.find((c) => new RegExp(`/products/${p.handle}(?![\\w-])`).test(c.url));
        const title = cleanTitle(entry?.name ?? p.title).replace(/[<>:"?*]/g, "").trim();
        const folder = entry?.folder || matchFolder(title, "", Object.keys(have));
        if (folder && have[folder].some((f) => !fromPage(f)))
            continue;
        const images = [...(p.images ?? [])].sort((x, y) => (x.position ?? 0) - (y.position ?? 0)).slice(0, 10);
        if (!images.length)
            continue;
        const dir = path.join(root, folder || title);
        fs.mkdirSync(dir, { recursive: true });
        let n = 0;
        for (const img of images) {
            n++;
            const base = path.basename(new URL(img.src).pathname).replace(/[^A-Za-z0-9._-]+/g, "-");
            if (!IMG.test(base))
                continue;
            try {
                const res = await fetcher(img.src);
                if (!res.ok)
                    throw new Error(String(res.status));
                const buf = Buffer.from(await res.arrayBuffer());
                if (buf.length < 500 || buf.length > 20 * 1024 * 1024)
                    throw new Error("size");
                fs.writeFileSync(path.join(dir, `${String(n).padStart(2, "0")}-${base}`), buf);
                saved++;
            }
            catch {
                failed++;
            }
        }
        touched++;
    }
    return { saved, products: touched, failed };
}
export async function pullStore(brandId: string, site: string, opts: {
    images?: boolean;
    currency?: string;
} = {}, fetcher: typeof fetch = fetch) {
    const products = await fetchStore(site, fetcher);
    if (!products.length)
        throw new Error("The store's product list is empty.");
    const { doc } = readDoc(brandId, "products");
    const res = mergeStore(doc, site, products, currencySymbol(opts.currency ?? "USD"), Object.keys(assetFolders(brandId)));
    writeDoc(brandId, "products", doc);
    const images = opts.images ? await pullImages(brandId, products, fetcher) : { saved: 0, products: 0, failed: 0 };
    return { found: products.length, ...res, images };
}
