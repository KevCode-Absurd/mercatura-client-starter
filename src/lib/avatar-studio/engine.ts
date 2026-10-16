import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import { db, schema } from "@/db";
import { env } from "../env";
import { IMAGE_ADAPTERS } from "../media/adapters";
import { googleImageCost, googleRefusal } from "../media/adapters/google";
import { IMAGE_MODEL_FOR } from "../media/models";
import { generateImage, mediaUsage } from "../media/providers";
import { plainMessage } from "../plain-message";
import { AvatarStudioError, brandAesthetics, brandFolder, checkedFile, mediaUrl, publicAesthetic, readCatalog, studioRoot } from "./catalog";
import type { AvatarGeneration, AvatarLibraryResponse } from "./types";
export const AVATAR_MODEL = IMAGE_MODEL_FOR.photoreal;
export { googleImageCost as usageCost, googleRefusal as providerErrorMessage };
export const SWAP_PROMPT = `Image 1 is the BASE PHOTO. Image 2 is the FICTIONAL CHARACTER IDENTITY REFERENCE.

Change only the identity of the person in the base photo to match the character reference. Transfer only the character's facial identity and body composition from the character reference; preserve their recognizable facial proportions, apparent adult age, baseline complexion, eye shape/color and characteristic marks. Ignore the character reference's own lighting, background, and texture. Re-render the new identity so it is lit, textured, and graded exactly like the base photo: match the base photo's light direction and hardness, its color temperature, and especially its grain and sharpness, so the character has the same texture as the rest of the image. Catchlights, skin sheen and material reflections follow the base photo's actual light sources. Do not re-pose, change the expression, zoom, or recrop. Natural skin texture with subtly varied local detail appropriate to the base photo's crop and focus; no smoothing, airbrushing, etched or stamped pores, sharpening halos, added scars or freckles, or pasted-on or composite look.

Keep the base photo's camera viewpoint, framing, expression, gaze, pose, wardrobe, background, props, and aspect ratio. Accommodate the reference body composition within the same pose and camera view. Produce one image. Do not add text or a watermark.`;
const requestSchema = z.object({ avatarId: z.string().max(100), aestheticId: z.string().max(100), requestId: z.string().uuid(), note: z.string().max(400).optional() }).strict();
interface GenerationPayload extends Record<string, unknown> {
    requestId: string;
    avatarId: string;
    aestheticId: string;
    base: string;
    identity: string;
    baseSha256: string;
    identitySha256: string;
    note?: string;
    said?: string;
    image?: string;
    original?: string;
    costUsd?: number;
    error?: string;
}
type Job = typeof schema.jobs.$inferSelect;
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const OTHER_CHOICE = "That request was for a different selection. Close this avatar, open it again and choose the scene photo once more.";
export const CHANGED_PICTURE = "This avatar's picture has changed since the library was made, so it can't be used. Tell whoever set up the app.";
export const generationId = (brandId: string, requestId: string) => `avatar-${createHash("sha256").update(`${brandId}\0${requestId}`).digest("hex").slice(0, 40)}`;
export function plainFailure(message: string): string {
    if (/Google AI Studio/.test(message))
        return message;
    return plainMessage(message).replace(/\s*\(HTTP \d{3}\)/g, "").replace(/^Google('s)?(?=\s)/, "The picture maker$1").replace(/\bGoogle('s)?(?=\s)/g, "the picture maker$1");
}
export function generationEnabled(): {
    generationEnabled: boolean;
    disabledReason?: string;
} {
    if (env.LLM_MODE !== "live")
        return { generationEnabled: false, disabledReason: "Image generation is switched off in Settings." };
    if (!Object.values(IMAGE_ADAPTERS).some((a) => a.connected()))
        return { generationEnabled: false, disabledReason: "No picture maker is connected yet. Ask whoever set up the app to add its key." };
    const use = mediaUsage();
    if (use.images >= use.imageCap)
        return { generationEnabled: false, disabledReason: "The picture limit has been reached. Raise it in Settings to continue." };
    return { generationEnabled: true };
}
function publicGeneration(job: Job): AvatarGeneration {
    const p = job.payload as GenerationPayload;
    return { id: job.id, requestId: p.requestId, avatarId: p.avatarId, aestheticId: p.aestheticId,
        status: job.status === "done" ? "completed" : job.status === "paused" || job.status === "stopped" ? "interrupted" : job.status,
        createdAt: job.created_at, updatedAt: job.updated_at,
        ...(p.image ? { imageUrl: mediaUrl(p.image) } : {}), ...(p.original ? { originalUrl: mediaUrl(p.original) } : {}),
        ...(p.costUsd !== undefined ? { costUsd: p.costUsd } : {}), ...(p.note ? { note: p.note } : {}), ...(p.said ? { said: p.said } : {}),
        ...((p.error || job.error) ? { error: plainFailure(p.error || (job.status === "paused" ? "This picture was stopped before it finished. It will not be made again by itself." : job.error!)) } : {}) };
}
export function library(brandId: string): AvatarLibraryResponse {
    const catalog = readCatalog();
    const jobs = db.select().from(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, "avatar_studio"))).all();
    return { avatars: catalog.avatars.map((a) => ({ id: a.id, label: a.label, portraitUrl: mediaUrl(a.portrait), thumbnailUrl: mediaUrl(a.thumbnail), ...(a.tags ? { tags: a.tags } : {}) })),
        aesthetics: [...catalog.aesthetics, ...brandAesthetics(brandId)].map(publicAesthetic),
        generations: jobs.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(publicGeneration), ...generationEnabled() };
}
export function requestGeneration(brandId: string, input: unknown): AvatarGeneration {
    const parsed = requestSchema.safeParse(input);
    if (!parsed.success)
        throw new AvatarStudioError("Choose an avatar and a scene photo first. A note can be up to 400 characters.");
    const request = parsed.data;
    const id = generationId(brandId, request.requestId);
    const existing = db.select().from(schema.jobs).where(eq(schema.jobs.id, id)).get();
    if (existing) {
        const p = existing.payload as GenerationPayload;
        if (p.avatarId !== request.avatarId || p.aestheticId !== request.aestheticId)
            throw new AvatarStudioError(OTHER_CHOICE, 409);
        return publicGeneration(existing);
    }
    const enabled = generationEnabled();
    if (!enabled.generationEnabled)
        throw new AvatarStudioError(enabled.disabledReason!, 409);
    const catalog = readCatalog();
    const avatar = catalog.avatars.find((a) => a.id === request.avatarId);
    const aesthetic = [...catalog.aesthetics, ...brandAesthetics(brandId)].find((a) => a.id === request.aestheticId);
    if (!avatar || !aesthetic)
        throw new AvatarStudioError("That avatar or scene photo is no longer in the library. Choose another.", 404);
    const identitySha256 = sha(fs.readFileSync(checkedFile(avatar.portrait)));
    if (identitySha256 !== avatar.sha256)
        throw new AvatarStudioError(CHANGED_PICTURE, 409);
    const note = request.note?.trim();
    const payload: GenerationPayload = { avatarId: request.avatarId, aestheticId: request.aestheticId, requestId: request.requestId, ...(note ? { note } : {}), base: aesthetic.image, identity: avatar.portrait, identitySha256, baseSha256: sha(fs.readFileSync(checkedFile(aesthetic.image))) };
    db.insert(schema.jobs).values({ id, brand_id: brandId, kind: "avatar_studio", ref_id: id, status: "queued", payload }).onConflictDoNothing().run();
    const inserted = db.select().from(schema.jobs).where(eq(schema.jobs.id, id)).get()!;
    if (inserted.payload.avatarId !== request.avatarId || inserted.payload.aestheticId !== request.aestheticId)
        throw new AvatarStudioError(OTHER_CHOICE, 409);
    return publicGeneration(inserted);
}
export function allowedMedia(brandId: string, relative: string): string {
    const catalog = readCatalog();
    const allow = new Set([...catalog.avatars.flatMap((a) => [a.portrait, a.thumbnail]), ...[...catalog.aesthetics, ...brandAesthetics(brandId)].flatMap((a) => [a.image, a.thumbnail])]);
    for (const job of db.select().from(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, "avatar_studio"))).all()) {
        const p = job.payload as GenerationPayload;
        if (p.image)
            allow.add(p.image);
        if (p.original)
            allow.add(p.original);
    }
    if (!allow.has(relative))
        throw new AvatarStudioError("Image not found", 404);
    return checkedFile(relative);
}
export async function exactPortrait(bytes: Buffer): Promise<Buffer> {
    const meta = await sharp(bytes).metadata();
    if (!meta.width || !meta.height)
        throw new Error("Image dimensions missing");
    const unit = Math.max(Math.ceil(meta.width / 9), Math.ceil(meta.height / 16));
    const w = unit * 9 - meta.width, h = unit * 16 - meta.height;
    const padded = await sharp(bytes).extend({ left: Math.floor(w / 2), right: Math.ceil(w / 2), top: Math.floor(h / 2), bottom: Math.ceil(h / 2), extendWith: "copy" }).png().toBuffer();
    return sharp(padded).resize(1152, 2048).png().toBuffer();
}
export const swapPrompt = (note?: string) => (note?.trim() ? `${SWAP_PROMPT}\n\nMake 2 changes to the base photo, both of them. First, the change of identity described above: the person in the result has the face and build of the character reference, not of the person in the base photo. Second, this change the team asked for, which never replaces the first: ${note.trim().slice(0, 400)}` : SWAP_PROMPT);
export async function runAvatarGeneration(jobId: string, options: {
    strictModel?: boolean;
} = {}): Promise<void> {
    const job = db.select().from(schema.jobs).where(and(eq(schema.jobs.id, jobId), eq(schema.jobs.kind, "avatar_studio"))).get();
    if (!job)
        throw new Error("Avatar generation not found");
    const p = job.payload as GenerationPayload;
    if (db.select({ id: schema.mediaCalls.id }).from(schema.mediaCalls).where(eq(schema.mediaCalls.job_id, jobId)).get())
        throw new Error("This picture was already asked for once. It will not be asked for again by itself.");
    try {
        const baseFile = checkedFile(p.base), identityFile = checkedFile(p.identity);
        if (sha(fs.readFileSync(baseFile)) !== p.baseSha256 || sha(fs.readFileSync(identityFile)) !== p.identitySha256)
            throw new Error("A picture you chose changed while this one was waiting. Choose it again.");
        const relative = `${brandFolder(job.brand_id)}/generations/${jobId}`;
        const original = `${relative}-original.png`;
        const delivered = `${relative}.png`;
        fs.mkdirSync(path.dirname(path.join(studioRoot(), original)), { recursive: true });
        let said = "";
        await generateImage({ brandId: job.brand_id, jobId, purpose: "avatar_identity_swap", prompt: swapPrompt(p.note), refs: [baseFile, identityFile], size: "1152x2048", quality: "high", use: "photoreal", strictModel: options.strictModel, out: path.join(studioRoot(), original), holdUnsure: true, onOtherModel: (x) => (said = x) });
        fs.writeFileSync(path.join(studioRoot(), delivered), await exactPortrait(fs.readFileSync(path.join(studioRoot(), original))));
        const costUsd = db.select({ c: sql<number> `coalesce(sum(${schema.mediaCalls.cost_usd}), 0)` }).from(schema.mediaCalls).where(eq(schema.mediaCalls.job_id, jobId)).get()!.c;
        db.update(schema.jobs).set({ status: "done", payload: { ...p, original, image: delivered, costUsd, ...(said ? { said } : {}) }, updated_at: new Date().toISOString() }).where(eq(schema.jobs.id, jobId)).run();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "The picture was not made.";
        db.update(schema.jobs).set({ status: "failed", error: message, payload: { ...p, error: message }, updated_at: new Date().toISOString() }).where(eq(schema.jobs.id, jobId)).run();
        throw error;
    }
}
