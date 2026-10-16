import fs from "node:fs";
import path from "node:path";
import { brandBrainDir } from "../brand-brain";
import { getBrandRow } from "../brands";
import { readDoc, sec } from "./docs";
import { childrenOf, fieldValue, plainText, slug, type Doc, type Section } from "./md";
import { assetFolders, matchFolder } from "./products";
export const ON_CAMERA_FIELDS = ["Looks like", "Pack", "How it is used", "Visible result", "Moves and sounds", "Never show", "Reference photos"] as const;
export const PHOTO_JOBS = [
    { job: "pack front", role: "is the product as it is sold, front on: copy its shape, colours and printing exactly" },
    { job: "single unit", role: "is 1 single unit of the product, out of the pack it is sold in: copy its shape, colours and printing exactly" },
    { job: "out of pack", role: "is the product itself, out of its packaging: copy its shape, colour and finish exactly" },
    { job: "in hand", role: "is the product in a hand: its true size" },
    { job: "in use", role: "is the product being used: how it is held, opened, applied or worn" },
    { job: "close up", role: "is a close view of the product's surface: its texture and finish" },
    { job: "label", role: "is the product's label or back panel: its exact wording" },
    { job: "on body", role: "is the product worn by a real person: its fit and how it hangs" },
    { job: "in place", role: "is the product where it is kept or used: its size against the room" },
    { job: "laid out", role: "is everything that comes in the box, laid out" },
    { job: "before after", role: "is a real before and after, as photographed" },
] as const;
export type PhotoJob = (typeof PHOTO_JOBS)[number]["job"];
const JOB_WORDS: [
    PhotoJob,
    RegExp
][] = [
    ["single unit", /^(single|one unit|1 unit|unit\b|individual)/i],
    ["pack front", /^(pack|packaging|box|bottle|front|hero|as sold)/i],
    ["out of pack", /^(out of|product out|product itself|unpacked|contents|inside)/i],
    ["in hand", /^(in (a |the )?hand|scale|held)/i],
    ["in use", /^(in use|use|applied|being used)/i],
    ["close up", /^(close|texture|macro|surface|detail)/i],
    ["label", /^(label|back panel|back of|ingredients panel|nutrition)/i],
    ["on body", /^(on (a |the )?body|worn|on (a |the )?model|fit)/i],
    ["in place", /^(in (its )?place|in (a |the )?room|in situ|at home)/i],
    ["laid out", /^(laid out|in the box|box contents|flat lay)/i],
    ["before after", /^(before)/i],
];
const jobOf = (label: string): PhotoJob | null => JOB_WORDS.find(([, re]) => re.test(label.trim()))?.[0] ?? null;
export interface OnCamera {
    product: string;
    looks: string;
    pack: string;
    use: string;
    result: string;
    moves: string;
    never: string;
    photos: {
        job: PhotoJob;
        file: string;
        role: string;
    }[];
    missing: string[];
    folder: string;
}
const filled = (v: string) => !!v.trim() && !/^(not captured|none found|tbd\b|to be written|not known|\{)/i.test(v.trim());
const text = (v: string) => (filled(v) ? plainText(v).replace(/\s+/g, " ").trim() : "");
export function parsePhotos(value: string): {
    job: PhotoJob;
    file: string;
}[] {
    const out: {
        job: PhotoJob;
        file: string;
    }[] = [];
    for (const part of plainText(value).split(/[;\n]+/)) {
        const m = /^\s*([^:]+):\s*(.+?)\s*$/.exec(part);
        if (!m)
            continue;
        const job = jobOf(m[1]);
        const file = m[2].replace(/^["'`]|["'`.,]+$/g, "").trim();
        if (job && /\.(png|jpe?g|webp)$/i.test(file) && !out.some((x) => x.job === job))
            out.push({ job, file });
    }
    return PHOTO_JOBS.flatMap((j) => out.filter((x) => x.job === j.job));
}
const products = (doc: Doc): Section[] => {
    const root = sec(doc, "catalog");
    return root ? childrenOf(doc, root).filter((s) => s.level === root.level + 1) : [];
};
const wordsOf = (s: string) => new Set(slug(s).split("-").filter((w) => w.length > 1));
export function entryFor(doc: Doc, productName: string): Section | undefined {
    const all = products(doc);
    const exact = all.find((s) => slug(s.title) === slug(productName));
    if (exact)
        return exact;
    const titles = all.map((s) => wordsOf(s.title));
    const common = new Set([...new Set(titles.flatMap((t) => [...t]))].filter((w) => titles.filter((t) => t.has(w)).length > all.length / 2));
    const want = wordsOf(productName);
    let best: Section | undefined;
    let top = 0;
    all.forEach((s, i) => {
        const have = [...titles[i]].filter((w) => !common.has(w));
        if (!have.length || want.has("kids") !== titles[i].has("kids"))
            return;
        const score = have.filter((w) => want.has(w)).length / have.length + (ON_CAMERA_FIELDS.some((k) => filled(fieldValue(s, k))) ? 0.01 : 0);
        if (score > top)
            [best, top] = [s, score];
    });
    return top >= 0.5 ? best : undefined;
}
export function onCameraOf(doc: Doc, productName: string, folders: Record<string, string[]> = {}): OnCamera | null {
    const s = entryFor(doc, productName);
    if (!s)
        return null;
    const folder = matchFolder(s.title, fieldValue(s, "Photos"), Object.keys(folders));
    const have = folder ? folders[folder] : [];
    const named = parsePhotos(fieldValue(s, "Reference photos"));
    const cam: OnCamera = {
        product: s.title,
        looks: text(fieldValue(s, "Looks like")),
        pack: text(fieldValue(s, "Pack")),
        use: text(fieldValue(s, "How it is used")),
        result: text(fieldValue(s, "Visible result")),
        moves: text(fieldValue(s, "Moves and sounds")),
        never: text(fieldValue(s, "Never show")),
        photos: named.filter((x) => have.includes(x.file)).map((x) => ({ ...x, role: PHOTO_JOBS.find((j) => j.job === x.job)!.role })),
        missing: named.filter((x) => !have.includes(x.file)).map((x) => `${x.job}: ${x.file}`),
        folder,
    };
    return cam.looks || cam.pack || cam.use || cam.result || cam.moves || cam.never || cam.photos.length ? cam : null;
}
const cache = new Map<string, {
    at: number;
    value: unknown;
}>();
function kept<T>(key: string, make: () => T): T {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 20000)
        return hit.value as T;
    let value: T;
    try {
        value = make();
    }
    catch {
        value = null as T;
    }
    cache.set(key, { at: Date.now(), value });
    return value;
}
export const clearOnCameraCache = () => cache.clear();
export function onCamera(brandId: string, productName: string | null | undefined): OnCamera | null {
    if (!productName)
        return null;
    return kept(`cam:${brandId}:${productName}`, () => onCameraOf(readDoc(brandId, "products").doc, productName, assetFolders(brandId)));
}
export function onCameraContext(brandId: string, productName: string | null | undefined): Record<string, string> | null {
    const c = onCamera(brandId, productName);
    if (!c)
        return null;
    const o: Record<string, string> = {
        ...(c.looks ? { looks_like: c.looks } : {}),
        ...(c.pack ? { pack: c.pack } : {}),
        ...(c.use ? { how_it_is_used: c.use } : {}),
        ...(c.result ? { visible_result: c.result } : {}),
        ...(c.moves ? { moves_and_sounds: c.moves } : {}),
        ...(c.never ? { never_show: c.never } : {}),
    };
    return Object.keys(o).length ? o : null;
}
export function onCameraLines(brandId: string, productName: string | null | undefined): string[] {
    const c = onCamera(brandId, productName);
    if (!c)
        return [];
    return [c.looks && `The product itself: ${c.looks}`, c.pack && `Its pack: ${c.pack}`, c.use && `How it is used, in order: ${c.use}`, c.result && `What a viewer sees change: ${c.result}`, c.never && `Never show (this product): ${c.never}`].filter((x): x is string => !!x);
}
export function referencePhotos(brandId: string, productName: string | null | undefined): {
    job: PhotoJob;
    file: string;
    role: string;
}[] {
    const c = onCamera(brandId, productName);
    const row = getBrandRow(brandId);
    if (!c?.photos.length || !row)
        return [];
    const dir = path.join(brandBrainDir(row.dir), "assets", c.folder);
    return c.photos.map((x) => ({ job: x.job, role: x.role, file: path.join(dir, x.file) })).filter((x) => fs.existsSync(x.file));
}
export const WORLD_FIELDS = ["Places", "Surfaces and props", "Light and time of day", "People", "People on file", "Never in frame"] as const;
export const MOTION_FIELDS = ["Pace", "Camera", "Sound", "Voice", "On-screen text", "Formats in use"] as const;
export const SELLING_FIELDS = ["Kind", "How it works", "Replaces", "Made of", "Size and fit", "In the box", "Lasts and care"] as const;
export function productFactsOf(productsDoc: Doc, productName: string): Record<string, string> | null {
    const s = entryFor(productsDoc, productName);
    if (!s)
        return null;
    const o: Record<string, string> = {};
    for (const k of SELLING_FIELDS) {
        const v = text(fieldValue(s, k));
        if (v)
            o[slug(k).replace(/-/g, "_")] = v;
    }
    return Object.keys(o).length ? o : null;
}
export function productFacts(brandId: string, productName: string | null | undefined): Record<string, string> | null {
    if (!productName)
        return null;
    return kept(`facts:${brandId}:${productName}`, () => productFactsOf(readDoc(brandId, "products").doc, productName));
}
export const TERMS_FIELDS = ["Delivery", "Returns", "Guarantee", "Warranty", "Subscription"] as const;
const TERMS = /^delivery, returns/i;
export const termsOf = (productsDoc: Doc) => fieldsAs(productsDoc, TERMS, TERMS_FIELDS);
export const terms = (brandId: string) => kept(`terms:${brandId}`, () => termsOf(readDoc(brandId, "products").doc));
const WORLD = /^brand world/i;
const MOTION = /^motion and sound/i;
function fieldsAs(doc: Doc, heading: RegExp, keys: readonly string[]): Record<string, string> | null {
    const s = doc.sections.find((x) => heading.test(x.title.trim()));
    if (!s)
        return null;
    const o: Record<string, string> = {};
    for (const k of keys) {
        const v = text(fieldValue(s, k));
        if (v)
            o[slug(k).replace(/-/g, "_")] = v;
    }
    return Object.keys(o).length ? o : null;
}
export const brandWorldOf = (guidelines: Doc) => fieldsAs(guidelines, WORLD, WORLD_FIELDS);
export const motionSoundOf = (guidelines: Doc) => fieldsAs(guidelines, MOTION, MOTION_FIELDS);
export const brandWorld = (brandId: string) => kept(`world:${brandId}`, () => brandWorldOf(readDoc(brandId, "guidelines").doc));
export const motionSound = (brandId: string) => kept(`motion:${brandId}`, () => motionSoundOf(readDoc(brandId, "guidelines").doc));
export function onCameraGaps(doc: Doc, productNames: string[], folders: Record<string, string[]> = {}): {
    product: string;
    blank: string[];
    missing: string[];
    photos: number;
}[] {
    return productNames.map((name) => {
        const c = onCameraOf(doc, name, folders);
        const blank = [!c?.looks && "Looks like", !c?.pack && "Pack", !c?.use && "How it is used", !c?.photos.length && "Reference photos"].filter((x): x is string => !!x);
        return { product: name, blank, missing: c?.missing ?? [], photos: c?.photos.length ?? 0 };
    });
}
