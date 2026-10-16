import fs from "node:fs";
import path from "node:path";
import { referencePhotos } from "../brain/on-camera";
import { brandBrainDir } from "../brand-brain";
import { getBrandRow, loadBrandBrain } from "../brands";
import { addProductPhotos, photoFolder } from "../product-photos";
import { productImages, type CreativeKit } from "./kit";
const PARTS_FILE = "_parts.json";
const assetsDir = (brandId: string) => {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return path.join(brandBrainDir(row.dir), "assets");
};
const relOf = (brandId: string, abs: string) => path.relative(assetsDir(brandId), abs).split(path.sep).join("/");
export function partFile(brandId: string, rel: string | undefined): string | null {
    if (!rel)
        return null;
    const root = assetsDir(brandId);
    const abs = path.resolve(root, rel);
    return abs.startsWith(path.resolve(root) + path.sep) && fs.existsSync(abs) ? abs : null;
}
function readParts(brandId: string, productId: string): Record<string, string> {
    const file = path.join(assetsDir(brandId), photoFolder(brandId, productId), PARTS_FILE);
    try {
        const raw: unknown = JSON.parse(fs.readFileSync(file, "utf-8"));
        return raw && typeof raw === "object" ? Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((e): e is [
            string,
            string
        ] => typeof e[1] === "string")) : {};
    }
    catch {
        return {};
    }
}
export interface PhotoOnFile {
    photo: string;
    shows: string;
}
export function photosOnFile(brandId: string, kit: CreativeKit, productId: string | null): PhotoOnFile[] {
    const out: PhotoOnFile[] = [];
    const name = productId ? (loadBrandBrain(brandId).products.find((p) => p.id === productId)?.name ?? null) : null;
    const named = referencePhotos(brandId, name);
    for (const x of named)
        out.push({ photo: relOf(brandId, x.file), shows: x.role.replace(/^is /, "").replace(/:.*$/, "") });
    if (!named.length) {
        const hero = productImages(brandId, kit, productId).hero;
        if (hero && fs.existsSync(hero))
            out.push({ photo: relOf(brandId, hero), shows: "the product as it is sold (its main photo)" });
    }
    if (productId) {
        const folder = photoFolder(brandId, productId);
        for (const [file, shows] of Object.entries(readParts(brandId, productId))) {
            const photo = `${folder}/${file}`;
            if (partFile(brandId, photo) && !out.some((o) => o.photo === photo))
                out.push({ photo, shows: `${shows}, on its own` });
        }
    }
    return out;
}
export const photosOnFileText = (photos: PhotoOnFile[]) => (photos.length ? photos.map((p, i) => `${i + 1}. ${p.shows}`).join("\n") : "(none: there is no photo of this product)");
export async function addPartPhoto(brandId: string, productId: string, shows: string, file: {
    name: string;
    bytes: Buffer;
}): Promise<string> {
    const [saved] = await addProductPhotos(brandId, productId, [file]);
    const folder = photoFolder(brandId, productId);
    const parts = readParts(brandId, productId);
    parts[saved] = shows.trim().slice(0, 80);
    fs.writeFileSync(path.join(assetsDir(brandId), folder, PARTS_FILE), JSON.stringify(parts, null, 2), "utf-8");
    return `${folder}/${saved}`;
}
