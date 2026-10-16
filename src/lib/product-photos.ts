import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { brandBrainDir } from "./brand-brain";
import { loadBrandLook, lookDir, saveBrandLook } from "./brand-look";
import { catalogProducts, fromPage } from "./brain/products";
import { getBrandRow, loadBrandBrain } from "./brands";
import { loadCreativeKit, saveCreativeKit } from "./production/kit";
const MAX_BYTES = 20 * 1024 * 1024;
const OK = /\.(png|jpe?g|webp)$/i;
function dirOf(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return brandBrainDir(row.dir);
}
const assetsDir = (brandId: string) => path.join(dirOf(brandId), "assets");
const safeName = (name: string) => path
    .basename(name)
    .normalize("NFD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "photo.jpg";
export const MAIN_FILE = "_main.txt";
export function photoFolder(brandId: string, productId: string): string {
    return loadCreativeKit(brandId)?.products.find((p) => p.product_id === productId)?.asset_folder || productId;
}
export interface ProductPhotos {
    product_id: string;
    folder: string;
    files: string[];
    main: string;
}
export function listProductPhotos(brandId: string): ProductPhotos[] {
    const kit = loadCreativeKit(brandId);
    const catalog = catalogProducts(brandId);
    return loadBrandBrain(brandId).products.map((p) => {
        const entry = kit?.products.find((x) => x.product_id === p.id);
        const folder = entry?.asset_folder || catalog.find((c) => c.name === p.name)?.folder || p.id;
        const dir = path.join(assetsDir(brandId), folder);
        const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => OK.test(f)).sort() : [];
        const named = entry?.hero_image || (fs.existsSync(path.join(dir, MAIN_FILE)) ? fs.readFileSync(path.join(dir, MAIN_FILE), "utf-8").trim() : "");
        return { product_id: p.id, folder, files, main: files.includes(named) ? named : (files.find((f) => !fromPage(f)) ?? files[0] ?? "") };
    });
}
export async function addProductPhotos(brandId: string, productId: string, files: {
    name: string;
    bytes: Buffer;
}[]): Promise<string[]> {
    if (!loadBrandBrain(brandId).products.some((p) => p.id === productId))
        throw new Error("That product is not in the brand brain.");
    if (!files.length)
        throw new Error("Choose at least 1 photo.");
    const folder = photoFolder(brandId, productId);
    const hadPhotos = (listProductPhotos(brandId).find((p) => p.product_id === productId)?.files.length ?? 0) > 0;
    const dir = path.join(assetsDir(brandId), folder);
    fs.mkdirSync(dir, { recursive: true });
    const saved: string[] = [];
    for (const f of files.slice(0, 12)) {
        if (!OK.test(f.name))
            throw new Error(`${f.name} is not a JPG, PNG or WebP picture.`);
        if (f.bytes.length > MAX_BYTES)
            throw new Error(`${f.name} is over 20 MB. Use a smaller copy.`);
        let name = safeName(f.name);
        for (let n = 2; fs.existsSync(path.join(dir, name)); n++)
            name = safeName(f.name).replace(/(\.[a-z]+)$/i, `-${n}$1`);
        try {
            await sharp(f.bytes).rotate().toFile(path.join(dir, name));
        }
        catch {
            throw new Error(`${f.name} could not be read as a picture.`);
        }
        saved.push(name);
    }
    if (!hadPhotos)
        setMainPhoto(brandId, productId, saved[0]);
    else
        syncKit(brandId, productId);
    return saved;
}
function syncKit(brandId: string, productId: string, main?: string) {
    const kit = loadCreativeKit(brandId);
    const entry = kit?.products.find((p) => p.product_id === productId);
    if (!kit || !entry)
        return;
    const dir = path.join(assetsDir(brandId), entry.asset_folder || productId);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => OK.test(f)).sort() : [];
    entry.asset_folder = entry.asset_folder || productId;
    entry.hero_image = main && files.includes(main) ? main : files.includes(entry.hero_image) ? entry.hero_image : (files[0] ?? "");
    entry.extra_images = entry.extra_images.filter((f) => files.includes(f) && f !== entry.hero_image).slice(0, 3);
    saveCreativeKit(brandId, kit);
}
export function setMainPhoto(brandId: string, productId: string, file: string) {
    const p = listProductPhotos(brandId).find((x) => x.product_id === productId);
    if (!p || !p.files.includes(file))
        throw new Error("That photo is not in the product's folder.");
    fs.writeFileSync(path.join(assetsDir(brandId), p.folder, MAIN_FILE), file, "utf-8");
    syncKit(brandId, productId, file);
}
export function removeProductPhoto(brandId: string, productId: string, file: string) {
    const p = listProductPhotos(brandId).find((x) => x.product_id === productId);
    if (!p || !p.files.includes(file))
        throw new Error("That photo is not in the product's folder.");
    fs.unlinkSync(path.join(assetsDir(brandId), p.folder, file));
    const main = path.join(assetsDir(brandId), p.folder, MAIN_FILE);
    if (p.main === file && fs.existsSync(main))
        fs.unlinkSync(main);
    syncKit(brandId, productId);
}
export async function saveLogo(brandId: string, f: {
    name: string;
    bytes: Buffer;
}): Promise<void> {
    const look = loadBrandLook(brandId);
    if (!look)
        throw new Error("Read the brand's look from its site first: the logo is kept with it.");
    if (!/\.(png|jpe?g|webp|svg)$/i.test(f.name))
        throw new Error("Upload the logo as a PNG, SVG, JPG or WebP.");
    if (f.bytes.length > MAX_BYTES)
        throw new Error("That file is over 20 MB.");
    fs.mkdirSync(lookDir(brandId), { recursive: true });
    try {
        await sharp(f.bytes, { density: 300 }).resize({ width: 1200, withoutEnlargement: true }).png().toFile(path.join(lookDir(brandId), "logo.png"));
    }
    catch {
        throw new Error("That file could not be read as a picture.");
    }
    saveBrandLook(brandId, { ...look, logo: "logo.png" });
}
