import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import sharp from "sharp";
import { env } from "../env";
import { cachedFileReader } from "../file-cache";
import type { AvatarAesthetic } from "./types";
export class AvatarStudioError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const mediaPath = z.string().refine((v) => /^[a-zA-Z0-9_/-]+\.(png|jpg|jpeg|webp)$/.test(v) && !v.startsWith("/") && !v.includes("//"), "Invalid media path");
const tagsSchema = z.object({ collection: z.enum(["Campaign-ready", "UGC creators"]).optional(), gender: z.enum(["Female", "Male", "Nonbinary"]), age: z.number().int().min(18).max(120), ageGroup: z.enum(["18–24", "25–34", "35–44", "45–54", "55–64", "65+"]), skinTone: z.enum(["Fair", "Light beige", "Light olive", "Medium beige", "Medium olive", "Light brown", "Medium brown", "Deep brown", "Dark brown"]), ethnicity: z.string().max(100), heritage: z.string().max(200), source: z.literal("character-brief") });
const aestheticSchema = z.object({ id, title: z.string().max(120), description: z.string().max(1000), scene: z.string().max(100), lighting: z.string().max(200), image: mediaPath, thumbnail: mediaPath, source: z.object({ kind: z.enum(["generated", "user-provided"]), model: z.string().optional(), rightsConfirmed: z.boolean().optional() }) });
const catalogSchema = z.object({ schemaVersion: z.literal(1), avatars: z.array(z.object({ id, label: z.string(), portrait: mediaPath, thumbnail: mediaPath, sha256: z.string().regex(/^[a-f0-9]{64}$/), tags: tagsSchema.optional() })), aesthetics: z.array(aestheticSchema) });
export type Aesthetic = z.infer<typeof aestheticSchema>;
export const studioRoot = () => path.join(env.DATA_DIR, "avatar-studio");
export const brandFolder = (brandId: string) => `brands/${createHash("sha256").update(brandId).digest("hex").slice(0, 32)}`;
export const mediaUrl = (relative: string) => `/api/avatar-library/media/${relative.split("/").map(encodeURIComponent).join("/")}`;
const catalogFile = cachedFileReader((text) => {
    const value = catalogSchema.parse(JSON.parse(text));
    if (new Set(value.avatars.map((a) => a.id)).size !== value.avatars.length || new Set(value.aesthetics.map((a) => a.id)).size !== value.aesthetics.length)
        throw new Error("Duplicate avatar catalog identity");
    return Object.freeze({ ...value,
        avatars: Object.freeze(value.avatars.map(a => Object.freeze({ ...a, ...(a.tags ? { tags: Object.freeze(a.tags) } : {}) }))),
        aesthetics: Object.freeze(value.aesthetics.map(a => Object.freeze({ ...a, source: Object.freeze(a.source) }))),
    });
});
export function readCatalog() {
    const file = path.join(studioRoot(), "catalog.json");
    if (!fs.existsSync(file))
        return { schemaVersion: 1 as const, avatars: [], aesthetics: [] };
    return catalogFile(file);
}
export function checkedFile(relative: string): string {
    if (!mediaPath.safeParse(relative).success)
        throw new AvatarStudioError("Image not found", 404);
    const root = fs.realpathSync(studioRoot());
    const file = path.resolve(root, relative);
    if (!fs.existsSync(file))
        throw new AvatarStudioError("Image not found", 404);
    const real = fs.realpathSync(file);
    if (!real.startsWith(root + path.sep) || !fs.statSync(real).isFile())
        throw new AvatarStudioError("Image not found", 404);
    return real;
}
export function brandAesthetics(brandId: string): Aesthetic[] {
    const folder = path.join(studioRoot(), brandFolder(brandId), "references");
    if (!fs.existsSync(folder))
        return [];
    return fs.readdirSync(folder).filter((f) => /^ref-[a-f0-9]+\.json$/.test(f)).map((f) => aestheticSchema.parse(JSON.parse(fs.readFileSync(path.join(folder, f), "utf8"))));
}
const OWN_PHOTO = { description: "A scene photo you added. Its place, pose and light are kept.", scene: "Your photos", lighting: "From your photo" };
export const publicAesthetic = (a: Aesthetic): AvatarAesthetic => ({ id: a.id, title: a.title, description: a.description, scene: a.scene, lighting: a.lighting, ...(a.source.kind === "user-provided" ? OWN_PHOTO : {}), imageUrl: mediaUrl(a.image), thumbnailUrl: mediaUrl(a.thumbnail) });
export async function validateUpload(bytes: Buffer) {
    if (!bytes.length || bytes.length > 20 * 1024 * 1024)
        throw new AvatarStudioError("Choose a photo under 20 MB.");
    let meta;
    try {
        meta = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
    }
    catch {
        throw new AvatarStudioError("That file could not be read as a photo. Use a JPG, PNG or WebP.");
    }
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format) || (meta.pages ?? 1) > 1)
        throw new AvatarStudioError("Use a still JPG, PNG or WebP photo.");
    if (!meta.width || !meta.height || meta.width < 256 || meta.height < 256 || meta.width * meta.height > 40000000)
        throw new AvatarStudioError("Use a photo at least 256 pixels on each side, and not larger than 40 megapixels.");
    const rotated = meta.orientation && [5, 6, 7, 8].includes(meta.orientation);
    const ratio = rotated ? meta.height / meta.width : meta.width / meta.height;
    if (Math.abs(ratio / (9 / 16) - 1) > 0.025)
        throw new AvatarStudioError("Use an upright photo close to 9:16, so its framing can be kept.");
    return meta;
}
export async function addReference(brandId: string, bytes: Buffer, title: string, rightsConfirmed: boolean) {
    if (!rightsConfirmed)
        throw new AvatarStudioError("Tick the box first: say you have permission to use this photo.");
    await validateUpload(bytes);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const refId = `ref-${hash.slice(0, 32)}`;
    const relative = `${brandFolder(brandId)}/references/${refId}`;
    const folder = path.dirname(path.join(studioRoot(), relative));
    fs.mkdirSync(folder, { recursive: true });
    const json = path.join(studioRoot(), `${relative}.json`);
    if (fs.existsSync(json))
        return publicAesthetic(aestheticSchema.parse(JSON.parse(fs.readFileSync(json, "utf8"))));
    const normalized = await sharp(bytes, { limitInputPixels: 40000000 }).rotate().png().toBuffer();
    fs.writeFileSync(path.join(studioRoot(), `${relative}.png`), normalized);
    await sharp(normalized).resize({ width: 420, withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(path.join(studioRoot(), `${relative}-thumb.jpg`));
    const value: Aesthetic = { id: refId, title: title.trim().slice(0, 120) || "Your scene photo", ...OWN_PHOTO, image: `${relative}.png`, thumbnail: `${relative}-thumb.jpg`, source: { kind: "user-provided", rightsConfirmed: true } };
    fs.writeFileSync(json, JSON.stringify(value, null, 2));
    return publicAesthetic(value);
}
export function requireSameOrigin(request: Request) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site")
        throw new AvatarStudioError("This action must be made from this app.", 403);
}
