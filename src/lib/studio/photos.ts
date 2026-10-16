import path from "node:path";
import type { SprintAsset } from "@/db/schema";
import { referencePhotos } from "../brain/on-camera";
import { fromPage } from "../brain/products";
import { assetFolders, catalogOf } from "../brain/products";
import { readDoc } from "../brain/docs";
import { siteImageRecords } from "../brain/site-images";
import { mainProductPage } from "../copy/material";
import { getBrandRow, loadBrandBrain } from "../brands";
import { brandBrainDir } from "../brand-brain";
import { loadCreativeKit, productImageChoices, type CreativeKit } from "../production/kit";
import { inventoryCached, ownDesigned } from "../sprint/assets";
import { MAX_LOOK_POOL, MAX_PRODUCT_PHOTOS, MAX_WORLD_POOL, type PhotoView } from "./views";
export { MAX_LOOK_POOL, MAX_PRODUCT_PHOTOS, MAX_WORLD_POOL, VIEW_INFO, type PhotoView } from "./views";
const PICK_ORDER: PhotoView[] = ["pack front", "single unit", "out of pack", "in hand", "in use", "close up", "label", "on body", "in place", "laid out"];
export interface ProductPhoto {
    name: string;
    rel: string;
    abs: string;
    view: PhotoView;
    shows: boolean;
    why: string;
    locked: boolean;
    note: string;
    known: "named" | "read" | "kit" | "no";
}
const singular = (w: string) => w.toLowerCase().replace(/(ch|sh|x|ss)es$/, "$1").replace(/s$/, "");
export function unitsOf(format: string | null | undefined): {
    pack: string;
    unit: string;
} | null {
    const m = /\b([a-z]+) of \d+ (?:[a-z-]+ ){0,2}([a-z]+)(?=\s*(?:[,.;:(]|$)|\s+(?:each|per|in|of|with|for|and|or|a|an|the)\b)/i.exec(format ?? "");
    return m && singular(m[1]) !== singular(m[2]) ? { pack: singular(m[1]), unit: singular(m[2]) } : null;
}
const MORE_THAN_ONE = /\b(two|three|four|five|six|seven|eight|nine|ten|several|many|array|pile|stack|row|rows|pair)\b/i;
export function showsSingleUnit(description: string | null | undefined, format: string | null | undefined): boolean {
    const u = unitsOf(format);
    const d = (description ?? "").toLowerCase();
    if (!u || !d || MORE_THAN_ONE.test(d) || new RegExp(`\\b${u.pack}(e?s)?\\b`).test(d))
        return false;
    return new RegExp(`\\b(a|an|one|1)\\b[^.;]*\\b(${u.unit}|single[- ]serv(e|ing)|individual)\\b`).test(d);
}
const UNIT_WORDS = ["pack", "packet", "sachet", "stick", "pod", "bar", "capsule", "tablet", "serving", "dose", "shot", "scoop", "piece", "wipe", "patch", "pad", "sheet", "strip"];
const unitWords = (format: string | null | undefined) => {
    const u = unitsOf(format);
    return [...new Set([...(u ? [u.unit] : []), ...UNIT_WORDS])].filter((w) => w !== u?.pack).join("|");
};
export function speaksOfOneUnit(words: string, format?: string | null): boolean {
    return new RegExp(`(?:\\b1|\\bone|\\ba single|\\bjust one|\\bsingle)[ -](?:[a-z-]+ ){0,2}(?:${unitWords(format)})\\b`, "i").test(words);
}
export function usesOneUnit(scene: string, format?: string | null): boolean {
    return new RegExp(`\\b(?:${unitWords(format)})\\b`, "i").test(scene) && (HAND.test(scene) || OPEN.test(scene) || USE.test(scene)) && !MANY.test(scene);
}
export function readPhoto(a: Pick<SprintAsset, "type" | "product_id" | "shows_pack" | "has_added_text" | "people" | "licensed_character"> & Partial<Pick<SprintAsset, "description" | "single_unit">>, productId: string, format = ""): {
    view: PhotoView;
    shows: boolean;
    why: string;
    locked: boolean;
} {
    const no = (why: string, view: PhotoView = "other", locked = false) => ({ view, shows: false, why, locked });
    if (a.people === "child")
        return no("A child is in it.", "other", true);
    if (a.licensed_character)
        return no("A licensed character is in it.", "other", true);
    if (a.has_added_text)
        return no("It has words designed onto it, so it goes as a brand image, not as the product.", "other", true);
    if (a.product_id && a.product_id !== productId)
        return no("It shows another product.");
    if (a.shows_pack && (a.single_unit || (a.type === "packshot" && showsSingleUnit(a.description, format))))
        return { view: "single unit", shows: true, why: "", locked: false };
    const view: PhotoView = a.type === "bundle" ? "several" : a.type === "in_use" ? "in use" : a.type === "contents" ? "out of pack" : a.type === "lifestyle" ? "in place" : a.type === "packshot" || a.type === "merch" ? "pack front" : "other";
    if (!a.shows_pack && a.type !== "in_use" && a.type !== "contents")
        return no("The product is not clear in it.", view);
    return { view, shows: true, why: "", locked: false };
}
export function pickViews<T extends Pick<ProductPhoto, "name" | "view" | "shows" | "known">>(photos: T[], max = MAX_PRODUCT_PHOTOS): T[] {
    const rank = { named: 0, kit: 1, read: 2, no: 3 } as const;
    const ok = photos.filter((p) => p.shows);
    const best = (view: PhotoView) => ok.filter((p) => p.view === view).sort((a, b) => rank[a.known] - rank[b.known] || a.name.localeCompare(b.name))[0];
    const picked = PICK_ORDER.map(best).filter((p): p is T => !!p);
    for (const p of ok)
        if (p.view === "other" && p.known !== "no" && !picked.includes(p))
            picked.push(p);
    return picked.slice(0, max);
}
const HAND = /\b(hands?|holds?|holding|held|grips?|gripp\w*|fingers?|palm|pinch\w*|picks? up|reach\w*)\b/i;
const OPEN = /\b(open(s|ed|ing)?|tear\w*|torn|rip\w*|pour\w*|spill\w*|unwrap\w*|unbox\w*|scoop\w*|squeez\w*|out of (its|the|their) (pack|pouch|packet|sachet|box|bottle|jar|tube|bag|wrapper)\w*|contents?|inside)\b/i;
const USE = /\b(using|in use|appl(y|ies|ying)|eat(s|ing)?|chew\w*|bit(e|es|ing)|drink(s|ing)?|sip\w*|spray\w*|brush\w*|rub\w*|cook\w*|stir\w*|mix\w*|wash\w*|mid[- ]action)\b/i;
const WORN = /\b(wear(s|ing)?|worn|dressed in|on (her|his|their) (wrist|neck|head|feet|shoulders?|body|face|finger))\b/i;
const CLOSE = /\b(close[- ]?up|macro|extreme close|texture|fills the frame)\b/i;
const LABEL = /\b(back (panel|of the)|label|ingredients? (list|panel)|nutrition (facts|panel)|side panel)\b/i;
const MANY = /\b(two|three|four|five|six|several|stack\w*|row of|rows of|pile of|a range|line[- ]?up|lined up|bundle|[2-9] (packs?|pouches|bottles|boxes|jars|tubes|bags|cans))\b/i;
const KEPT = /\b(shelf|shelves|counter|worktop|table|desk|bedside|nightstand|cupboard|pantry|fridge|sink|bathroom|gym bag|handbag|tote|backpack|car|drawer)\b/i;
const OPENS = /\b(open(s|ed|ing)?|unseal\w*|unscrew\w*|uncap\w*|unzip\w*|unwrap\w*|peel(s|ed|ing)?|tear(s|ing)?|torn|rip(s|ped|ping)?|pour(s|ed|ing)?|spill(s|ed|ing)?|squeez\w*|scoop\w*|sprinkl\w*|shak(es?|ing) out|tip(s|ped|ping)? (it |them |one |some )?(out|into)|empt(y|ies|ied|ying))\b/i;
const OPEN_OTHER = /\bopen(s|ed|ing)? (the |a |an |her |his |their )?(notebook|book|laptop|window|door|magazine|newspaper|drawer|fridge|cupboard|curtains?|blinds?|shelf|shelving|kitchen|plan|space|air|sky|road|field|eyes?|mouth|hand|palm|arms?)\b/gi;
const NOT_OPENED = /\b(not|never|nothing|none|without)\b[^.;,]{0,30}\b(open\w*|pour\w*|torn|tear\w*|spill\w*)|\b(unopened|still sealed|stays? (closed|sealed))\b/gi;
const PACK_WORDS = ["product", "pack", "packet", "pouch", "sachet", "bottle", "jar", "tube", "wrapper", "lid", "cap", "seal", "carton", "tub"];
export const OPEN_VIEWS: PhotoView[] = ["out of pack", "in use"];
export function opensWithoutPhoto(scene: string, views: PhotoView[], product: {
    name?: string | null;
    format?: string | null;
} = {}): string | null {
    if (views.some((v) => OPEN_VIEWS.includes(v)))
        return null;
    const u = unitsOf(product.format);
    const own = (product.name ?? "").toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
    const named = new RegExp(`\\b(${[...new Set([...PACK_WORDS, ...(u ? [u.pack, u.unit] : []), ...own])].join("|")})(e?s)?\\b`, "i");
    for (const part of scene.split(/(?<=[.;!?])\s+/)) {
        const s = part.replace(OPEN_OTHER, " ").replace(NOT_OPENED, " ");
        if (OPENS.test(s) && named.test(s))
            return part.trim();
    }
    return null;
}
const pagePath = (url: string | null | undefined): string => {
    try {
        return new URL(url ?? "").pathname.replace(/\/+$/, "").toLowerCase() || "/";
    }
    catch {
        return "";
    }
};
export const STRAY_WHY = "It came from another page of the site and the product's pack is not in it, so nothing ties it to this product.";
export interface SitePlace {
    home: string | null | undefined;
    others?: readonly (string | null | undefined)[];
    main?: boolean;
}
export function strayFromSite(a: Pick<SprintAsset, "type" | "shows_pack">, file: string, cameFrom: string | null | undefined, place: SitePlace): boolean {
    const from = pagePath(cameFrom);
    const own = pagePath(place.home);
    if (!fromPage(file.split("/").pop() ?? file) || a.type !== "contents" || a.shows_pack || !from || !own || from === own)
        return false;
    if ((place.others ?? []).some((o) => pagePath(o) === from) || /(^|\/)products?\//.test(from))
        return true;
    return !place.main;
}
const NOT_CONTENTS = new Set(["ages", "days", "weeks", "months", "years", "hours", "minutes", "times", "sizes", "colours", "colors", "flavours", "flavors", "versions", "kinds", "types", "steps", "ways", "hands", "ingredients", "vitamins", "minerals", "nutrients", "calories", "grams", "servings", "doses", "customers", "reviews", "pieces", "units", "items", "things", "others", "parts", "packs"]);
const HOLDS = ["box", "bag", "tin", "can", "case", "handful", "spoonful", "day", "daily", "cup", "bowl", "glass", "plate", "dozen"];
export function contentsWords(lines: (string | null | undefined)[], format?: string | null): string[] {
    const u = unitsOf(format);
    const packs = new Set([...PACK_WORDS, ...UNIT_WORDS, ...(u ? [u.pack, u.unit] : [])].map(singular));
    const holds = new Set([...packs, ...HOLDS]);
    const out = new Set<string>();
    for (const line of lines) {
        for (const m of (line ?? "").toLowerCase().matchAll(/\b([a-z]+)\s+of\s+((?:[a-z0-9+-]+\s+){0,4}?)([a-z]{3,}s)\b/g)) {
            if (!holds.has(singular(m[1])) && !holds.has(m[1]))
                continue;
            if (/^[a-z]{4,}s$/.test(m[3]) && !/ss$/.test(m[3]) && !NOT_CONTENTS.has(m[3]) && !packs.has(singular(m[3])))
                out.add(m[3]);
        }
    }
    return [...out];
}
export function showsContents(scene: string, words: string[]): string | null {
    if (!words.length)
        return null;
    const named = new RegExp(`(?<![A-Za-z])(?:${words.join("|")})(?![A-Za-z])`);
    const none = new RegExp(`\\b(?:no|not|never|without|nothing)\\b[^.;,]{0,40}(?:${words.join("|")})`, "i");
    for (const part of scene.split(/(?<=[.;!?])\s+/))
        if (named.test(part) && !none.test(part))
            return part.trim();
    return null;
}
export function leadIndex(views: PhotoView[], text: string): number {
    const wants: PhotoView[] = [];
    if (WORN.test(text))
        wants.push("on body");
    if (OPEN.test(text))
        wants.push("out of pack", "in use");
    if (USE.test(text))
        wants.push("in use", "in hand");
    if (HAND.test(text))
        wants.push("in hand", "in use");
    if (CLOSE.test(text))
        wants.push("close up");
    if (LABEL.test(text))
        wants.push("label");
    if (MANY.test(text))
        wants.push("several");
    if (KEPT.test(text))
        wants.push("in place");
    for (const w of wants) {
        const at = views.indexOf(w);
        if (at > -1)
            return at;
    }
    const front = views.indexOf("pack front");
    return front > -1 ? front : 0;
}
export function unitIndex(views: PhotoView[], words: string, scene: string, format?: string | null): number {
    const at = views.indexOf("single unit");
    return at > -1 && (speaksOfOneUnit(words, format) || usesOneUnit(scene, format)) ? at : -1;
}
export interface PhotoSheet {
    folder: string;
    photos: ProductPhoto[];
    picked: string[];
    read: boolean;
}
const sheets = new Map<string, {
    at: number;
    value: PhotoSheet;
}>();
const owners = new Map<string, {
    at: number;
    value: Map<string, string[]>;
}>();
export const clearPhotoSheets = () => {
    sheets.clear();
    owners.clear();
};
export function productPhotoSheet(brandId: string, kit: CreativeKit | null, productId: string): PhotoSheet {
    const key = `${brandId}:${productId}:${kit ? 1 : 0}`;
    const hit = sheets.get(key);
    if (hit && Date.now() - hit.at < 10000)
        return hit.value;
    const value = readSheet(brandId, kit, productId);
    sheets.set(key, { at: Date.now(), value });
    return value;
}
function cameFromPages(brandId: string): Record<string, string> {
    try {
        return Object.fromEntries(Object.entries(siteImageRecords(brandId).images).map(([rel, r]) => [rel, r.page]));
    }
    catch {
        return {};
    }
}
function sitePlace(brandId: string, folder: string, brandName: string): SitePlace {
    try {
        const pages = catalogOf(readDoc(brandId, "products").doc, assetFolders(brandId)).filter((c) => /^https?:\/\//i.test(c.url));
        const home = pages.find((c) => c.folder === folder)?.url ?? "";
        return { home, others: pages.filter((c) => c.folder !== folder).map((c) => c.url), main: !!home && mainProductPage(pagePath(home), brandName) };
    }
    catch {
        return { home: "" };
    }
}
export function strayAmong(brandId: string, kit: CreativeKit | null, productId: string, rels: string[]): string[] {
    const stray = new Set(productPhotoSheet(brandId, kit, productId).photos.filter((p) => p.why === STRAY_WHY).map((p) => p.rel));
    return rels.filter((r) => stray.has(r));
}
function readSheet(brandId: string, kit: CreativeKit | null, productId: string): PhotoSheet {
    const c = productImageChoices(brandId, kit, productId);
    const row = getBrandRow(brandId);
    if (!c.folder || !row)
        return { folder: "", photos: [], picked: [], read: false };
    const dir = path.join(brandBrainDir(row.dir), "assets", c.folder);
    const inv = new Map(inventoryCached(brandId).map((a) => [a.file, a]));
    let name: string | null = null;
    let format = "";
    let brandName = "";
    try {
        const brain = loadBrandBrain(brandId);
        const product = brain.products.find((p) => p.id === productId);
        name = product?.name ?? null;
        format = product?.format ?? "";
        brandName = brain.brand.name;
    }
    catch {
        name = null;
    }
    const named = new Map(referencePhotos(brandId, name).map((x) => [path.resolve(x.file), x.job]));
    const came = cameFromPages(brandId);
    const home = sitePlace(brandId, c.folder, brandName);
    const photos = c.files.map((file): ProductPhoto => {
        const abs = path.join(dir, file);
        const rel = `${c.folder}/${file}`;
        const seen = inv.get(rel);
        const job = named.get(path.resolve(abs));
        const read = seen ? readPhoto(seen, productId, format) : null;
        const base = { name: file, rel, abs, note: seen?.description ?? "" };
        const barred = !!seen && (seen.people === "child" || seen.licensed_character);
        if (job)
            return { ...base, view: job, shows: !barred, locked: barred, why: seen?.people === "child" ? "A child is in it." : seen?.licensed_character ? "A licensed character is in it." : "", known: "named" };
        if (read?.shows && seen && strayFromSite(seen, file, came[rel], home))
            return { ...base, view: read.view, shows: false, why: STRAY_WHY, locked: false, known: "read" };
        if (read)
            return { ...base, ...read, known: "read" };
        if (file === c.hero)
            return { ...base, view: "pack front", shows: true, why: "", locked: false, known: "kit" };
        if (c.extras.includes(file))
            return { ...base, view: "other", shows: true, why: "", locked: false, known: "kit" };
        return { ...base, view: "other", shows: false, why: "Not looked at yet.", locked: fromPage(file), known: "no" };
    });
    return { folder: c.folder, photos, picked: pickViews(photos).map((p) => p.name), read: photos.some((p) => p.known === "read" || p.known === "named") };
}
export interface BrandImage {
    rel: string;
    kind: "designed" | "photo";
    productId: string;
    note: string;
}
export function brandImageKind(a: Pick<SprintAsset, "type" | "has_added_text" | "people" | "licensed_character">): BrandImage["kind"] | null {
    if (a.people === "child" || a.licensed_character || a.type === "merch")
        return null;
    if (a.has_added_text)
        return "designed";
    return a.type === "lifestyle" || a.type === "in_use" || a.type === "contents" ? "photo" : null;
}
export function pickLooks(assets: SprintAsset[], productId: string, max = MAX_LOOK_POOL): string[] {
    const near = ownDesigned(assets.filter((a) => !a.product_id || a.product_id === productId), productId, max);
    return near.length >= 2 ? near : [...new Set([...near, ...ownDesigned(assets, productId, 2)])].slice(0, 2);
}
export function pickWorld(images: BrandImage[], productId: string, max = MAX_WORLD_POOL): string[] {
    return images
        .filter((x) => x.kind === "photo" && (!x.productId || x.productId === productId))
        .sort((a, b) => Number(b.productId === productId) - Number(a.productId === productId) || a.rel.localeCompare(b.rel))
        .slice(0, max)
        .map((x) => x.rel);
}
export function productFolders(brandId: string): Map<string, string[]> {
    const hit = owners.get(brandId);
    if (hit && Date.now() - hit.at < 10000)
        return hit.value;
    const value = new Map<string, string[]>();
    try {
        const kit = loadCreativeKit(brandId);
        for (const p of loadBrandBrain(brandId).products) {
            const folder = productImageChoices(brandId, kit, p.id).folder;
            if (folder)
                value.set(folder, [...(value.get(folder) ?? []), p.id]);
        }
    }
    catch {
    }
    owners.set(brandId, { at: Date.now(), value });
    return value;
}
export function atHome<T extends Pick<SprintAsset, "file" | "product_id">>(assets: T[], folders: Map<string, string[]>, productId: string): T[] {
    return assets.map((a) => {
        if (a.product_id)
            return a;
        const home = folders.get(a.file.split("/")[0]) ?? [];
        return home.length ? { ...a, product_id: home.includes(productId) ? productId : home[0] } : a;
    });
}
export function brandImageSheet(brandId: string, productId: string): {
    images: BrandImage[];
    looks: string[];
    world: string[];
} {
    const assets = atHome(inventoryCached(brandId), productFolders(brandId), productId);
    const images = assets
        .map((a): BrandImage | null => {
        const kind = brandImageKind(a);
        return kind ? { rel: a.file, kind, productId: a.product_id, note: a.description } : null;
    })
        .filter((x): x is BrandImage => !!x)
        .sort((a, b) => Number(b.productId === productId) - Number(a.productId === productId) || Number(!b.productId) - Number(!a.productId) || a.rel.localeCompare(b.rel));
    return { images, looks: pickLooks(assets, productId), world: pickWorld(images, productId) };
}
export function splitBrandImages(brandId: string, rels: string[]): {
    looks: string[];
    world: string[];
} {
    const kinds = new Map(inventoryCached(brandId).map((a) => [a.file, brandImageKind(a)]));
    const of = (kind: BrandImage["kind"], max: number) => [...new Set(rels)].filter((r) => kinds.get(r) === kind).slice(0, max);
    return { looks: of("designed", MAX_LOOK_POOL), world: of("photo", MAX_WORLD_POOL) };
}
export function dealFrom<T>(pool: T[], at: number, count: number): T[] {
    if (!pool.length || count <= 0)
        return [];
    const n = Math.min(count, pool.length);
    return Array.from({ length: n }, (_, i) => pool[(at * n + i) % pool.length]);
}
