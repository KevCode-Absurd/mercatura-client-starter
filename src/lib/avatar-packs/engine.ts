import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { avatarFile, getAvatar } from "../avatars/store";
import { adultProblem, avatarLine, type Avatar } from "../avatars/types";
import { getBrandRow } from "../brands";
import { env } from "../env";
import { imageAdapterFor } from "../media/adapters";
import { assetPath, generateImage, imageModel, imageModelOf, mediaLive, mediaUsage } from "../media/providers";
import { imageModelInfo } from "../media/models";
import { checkpoint } from "../llm/run-control";
import type { AvatarPack, AvatarPackAspect, AvatarPackAttempt, AvatarPackReference, AvatarPackReferenceChoice, AvatarPackReview, AvatarPackSetting, AvatarPackStatus } from "./types";
const PACK = "avatar_pack", FRAME = "avatar_pack_frame";
type Job = typeof schema.jobs.$inferSelect;
type Parent = {
    fingerprint: string;
    requestId: string;
    avatarId: string;
    name: string;
    aspect: AvatarPackAspect;
    sourcePortrait: string;
    sourceSnapshot: string;
    sourceSha256: string;
    sourceRevision: string;
    sourceDescription: string;
    frames: {
        id: string;
        setting: AvatarPackSetting;
        initialAttemptId: string;
    }[];
};
type Attempt = {
    packId: string;
    frameId: string;
    requestId: string;
    fingerprint: string;
    ordinal: number;
    review: AvatarPackReview;
    correction?: string;
    startedAt?: string;
    image?: string;
    imageSha256?: string;
    width?: number;
    height?: number;
    costUsd?: number;
    model?: string;
    prompt?: string;
    error?: string;
};
const hash = (x: string | Buffer) => createHash("sha256").update(x).digest("hex");
const idFor = (brand: string, request: string) => `avp_${hash(`${brand}:${request}`).slice(0, 32)}`;
const settingSchema = z.object({ label: z.string().trim().min(1).max(80), location: z.string().trim().min(1).max(300), action: z.string().trim().min(1).max(300), wardrobe: z.string().trim().min(1).max(300), camera: z.string().trim().min(1).max(300), lighting: z.string().trim().min(1).max(300) }).strict();
const createSchema = z.object({ requestId: z.string().uuid(), avatarId: z.string().regex(/^ava_[a-z0-9_]{1,40}$/), name: z.string().trim().min(1).max(80).optional(), aspect: z.enum(["9:16", "4:5", "1:1"]), settings: z.array(settingSchema).min(1).max(6) }).strict();
const rerunSchema = z.object({ packId: z.string(), frameId: z.string(), requestId: z.string().uuid(), correction: z.string().trim().min(1).max(600) }).strict();
const sizes: Record<AvatarPackAspect, string> = { "9:16": "1008x1792", "4:5": "1024x1280", "1:1": "1024x1024" };
export class AvatarPackError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}
const now = () => new Date().toISOString();
function brand(brandId: string) { if (!/^[a-zA-Z0-9_-]+$/.test(brandId) || !getBrandRow(brandId))
    throw new AvatarPackError("Brand not found.", 404); }
function row(brandId: string, id: string, kind: string): Job { const found = db.select().from(schema.jobs).where(and(eq(schema.jobs.id, id), eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, kind))).get(); if (!found)
    throw new AvatarPackError("Avatar pack not found.", 404); return found; }
function source(brandId: string, avatarId: string): {
    avatar: Avatar;
    file: string;
    bytes: Buffer;
    revision: string;
} {
    const a = getAvatar(brandId, avatarId);
    if (!a || a.kind !== "person" || !a.presenter?.age?.trim() || adultProblem(a))
        throw new AvatarPackError("Choose a saved fictional adult person with a portrait.", 409);
    const file = avatarFile(a.portrait);
    if (!file || !a.portrait?.replaceAll("\\", "/").startsWith(`avatars/${brandId}/${a.id}/`))
        throw new AvatarPackError("This avatar needs its own saved portrait first.", 409);
    const ownRoot = path.join(fs.realpathSync(path.join(env.DATA_DIR, "assets")), "avatars", brandId, a.id);
    if (!within(ownRoot, fs.realpathSync(file)))
        throw new AvatarPackError("This avatar needs its own saved portrait first.", 409);
    if (!fs.statSync(file).isFile() || fs.statSync(file).size > 20 * 1024 * 1024)
        throw new AvatarPackError("The source portrait is unavailable or too large.", 409);
    return { avatar: a, file, bytes: fs.readFileSync(file), revision: hash(JSON.stringify([a.portrait, a.presenter])) };
}
function isCurrent(brandId: string, p: Parent): boolean { try {
    const s = source(brandId, p.avatarId);
    return hash(s.bytes) === p.sourceSha256 && s.revision === p.sourceRevision;
}
catch {
    return false;
} }
function fileFor(relative: string): string {
    const root = path.resolve(env.DATA_DIR, "assets"), file = path.resolve(root, relative);
    if (!within(root, file) || !fs.existsSync(file) || !fs.statSync(file).isFile() || !within(fs.realpathSync(root), fs.realpathSync(file)))
        throw new AvatarPackError("Pack image not found.", 404);
    return file;
}
function within(root: string, file: string): boolean { const rel = path.relative(root, file); return !!rel && rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); }
function calls(jobId: string) { return db.select().from(schema.mediaCalls).where(eq(schema.mediaCalls.job_id, jobId)).all(); }
function status(job: Job, p: Attempt): AvatarPackStatus {
    if (p.image && job.status === "done")
        return "completed";
    if (job.status === "queued" || job.status === "running")
        return job.status;
    if (calls(job.id).some((c) => c.status === "submitted"))
        return "uncertain";
    if (job.status === "paused" || job.status === "stopped")
        return "interrupted";
    return job.status === "done" ? "failed" : job.status;
}
function publicAttempt(job: Job): AvatarPackAttempt {
    const p = job.payload as Attempt;
    return { id: job.id, requestId: p.requestId, status: status(job, p), review: p.review ?? "pending", createdAt: job.created_at, updatedAt: job.updated_at, ...(p.correction ? { correction: p.correction } : {}), ...(p.image ? { relative: p.image, imageUrl: `/api/assets/${p.image}` } : {}), ...(p.width ? { width: p.width, height: p.height } : {}), ...(p.costUsd !== undefined ? { costUsd: p.costUsd } : {}), ...(p.model ? { model: p.model } : {}), ...(p.prompt ? { prompt: p.prompt } : {}), ...((p.error || job.error) ? { error: p.error || job.error! } : {}) };
}
function publicPack(job: Job): AvatarPack {
    const p = job.payload as Parent;
    const children = db.select().from(schema.jobs).where(and(eq(schema.jobs.brand_id, job.brand_id), eq(schema.jobs.kind, FRAME))).all().filter((j) => j.payload.packId === job.id);
    const current = isCurrent(job.brand_id, p);
    return { id: job.id, avatarId: p.avatarId, name: p.name, aspect: p.aspect, sourcePortrait: p.sourcePortrait, sourceSnapshot: p.sourceSnapshot, sourceSha256: p.sourceSha256, sourceRevision: p.sourceRevision, createdAt: job.created_at, current, stale: !current, frames: p.frames.map((f) => {
            const jobs = children.filter((j) => j.payload.frameId === f.id).sort((a, b) => Number(a.payload.ordinal) - Number(b.payload.ordinal));
            const attempts = jobs.map(publicAttempt), currentAttempt = attempts.at(-1)!;
            return { id: f.id, setting: f.setting, status: currentAttempt.status, review: currentAttempt.review, currentAttemptId: currentAttempt.id, currentAttempt, attempts };
        }) };
}
export function packAvailability(): {
    generationEnabled: boolean;
    disabledReason?: string;
    remainingImages: number;
    modelName: string;
    priceNote: string;
} {
    const own = imageModelOf({ use: "photoreal" }), usual = imageModelInfo(imageModel());
    const selected = imageAdapterFor(own).connected() ? own : imageAdapterFor(usual).connected() ? usual : own;
    const usage = mediaUsage(), remainingImages = Math.max(0, usage.imageCap - usage.images);
    const disabledReason = !mediaLive() ? "Image generation is switched off in Settings." : !imageAdapterFor(selected).connected() ? "No picture maker is connected. Add its key before creating a pack." : !remainingImages ? "The picture limit has been reached. Raise it in Settings to continue." : undefined;
    return { generationEnabled: !disabledReason, ...(disabledReason ? { disabledReason } : {}), remainingImages, modelName: selected.name, priceNote: selected.price };
}
function enabled(count = 1) { const a = packAvailability(); if (!a.generationEnabled || a.remainingImages < count)
    throw new AvatarPackError(a.disabledReason ?? `Only ${a.remainingImages} pictures remain. Choose fewer settings or raise the limit.`, 409); }
function matching(job: Job, fingerprint: string, kind: string) { if (job.kind !== kind || job.payload.fingerprint !== fingerprint)
    throw new AvatarPackError("This request ID was already used for a different selection. Start a new request.", 409); }
export function listPacks(brandId: string, avatarId?: string): AvatarPack[] {
    brand(brandId);
    return db.select().from(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, PACK))).all().filter((j) => !avatarId || j.payload.avatarId === avatarId).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(publicPack);
}
export function createPack(brandId: string, input: unknown): AvatarPack {
    brand(brandId);
    const parsed = createSchema.safeParse(input);
    if (!parsed.success)
        throw new AvatarPackError("Choose one saved avatar, 1–6 complete scene briefs, a supported aspect and a request UUID.");
    const request = parsed.data, normalized = { requestId: request.requestId.toLowerCase(), avatarId: request.avatarId, name: request.name ?? "Avatar settings pack", aspect: request.aspect, settings: request.settings }, fingerprint = hash(JSON.stringify(normalized)), id = idFor(brandId, normalized.requestId);
    const existing = db.select().from(schema.jobs).where(eq(schema.jobs.id, id)).get();
    if (existing) {
        matching(existing, fingerprint, PACK);
        return publicPack(existing);
    }
    enabled(request.settings.length);
    const s = source(brandId, request.avatarId), snapshot = assetPath(id, "source-portrait.png"), sourceSnapshot = snapshot.rel.replace(/^assets\//, "");
    const frames = request.settings.map((setting, index) => ({ id: `avpf_${hash(`${id}:${index}`).slice(0, 32)}`, setting, initialAttemptId: `${id}_${index + 1}` }));
    const payload: Parent = { fingerprint, requestId: normalized.requestId, avatarId: request.avatarId, name: normalized.name, aspect: request.aspect, sourcePortrait: s.avatar.portrait!, sourceSnapshot, sourceSha256: hash(s.bytes), sourceRevision: s.revision, sourceDescription: avatarLine({ ...s.avatar, presenter: { ...s.avatar.presenter, wardrobe: "" } }), frames };
    db.transaction((tx) => {
        const inserted = tx.insert(schema.jobs).values({ id, brand_id: brandId, kind: PACK, ref_id: request.avatarId, status: "done", progress: 1, payload }).onConflictDoNothing().run();
        if (!inserted.changes) {
            matching(tx.select().from(schema.jobs).where(eq(schema.jobs.id, id)).get()!, fingerprint, PACK);
            return;
        }
        for (const f of frames)
            tx.insert(schema.jobs).values({ id: f.initialAttemptId, brand_id: brandId, kind: FRAME, ref_id: f.id, status: "queued", payload: { packId: id, frameId: f.id, requestId: normalized.requestId, fingerprint, ordinal: 1, review: "pending" } }).run();
        if (fs.existsSync(snapshot.abs)) {
            if (hash(fs.readFileSync(snapshot.abs)) !== payload.sourceSha256)
                throw new AvatarPackError("The source snapshot changed. Start a new request.", 409);
        }
        else
            fs.writeFileSync(snapshot.abs, s.bytes, { flag: "wx" });
    });
    return publicPack(row(brandId, id, PACK));
}
function selected(brandId: string, packId: string, frameId: string) {
    const parent = row(brandId, packId, PACK), p = parent.payload as Parent, definition = p.frames.find((f) => f.id === frameId);
    if (!definition)
        throw new AvatarPackError("Frame not found in this pack.", 404);
    const jobs = db.select().from(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, FRAME), eq(schema.jobs.ref_id, frameId))).all().filter((j) => j.payload.packId === packId).sort((a, b) => Number(a.payload.ordinal) - Number(b.payload.ordinal));
    if (!jobs.length)
        throw new AvatarPackError("Pack attempt not found.", 404);
    return { parent, p, definition, jobs, latest: jobs.at(-1)! };
}
export function reviewFrame(brandId: string, packId: string, frameId: string, decision: "kept" | "rejected"): AvatarPack {
    brand(brandId);
    if (decision !== "kept" && decision !== "rejected")
        throw new AvatarPackError("Choose keep or reject.");
    const { parent, p, latest } = selected(brandId, packId, frameId), a = latest.payload as Attempt;
    if (status(latest, a) !== "completed" || !a.image)
        throw new AvatarPackError("Review this frame after it finishes.", 409);
    if (decision === "kept" && !isCurrent(brandId, p))
        throw new AvatarPackError("The source portrait changed. Create a pack from the current master before reuse.", 409);
    if (decision === "kept" && (!a.imageSha256 || hash(fs.readFileSync(fileFor(a.image))) !== a.imageSha256))
        throw new AvatarPackError("The frame changed on disk. Review a new attempt before keeping it.", 409);
    db.update(schema.jobs).set({ payload: { ...a, review: decision }, updated_at: now() }).where(eq(schema.jobs.id, latest.id)).run();
    return publicPack(parent);
}
export function rerunFrame(brandId: string, input: {
    packId: string;
    frameId: string;
    requestId: string;
    correction: string;
}): AvatarPack {
    brand(brandId);
    const parsed = rerunSchema.safeParse(input);
    if (!parsed.success)
        throw new AvatarPackError("Choose one frame, a new request UUID and a specific correction (up to 600 characters).");
    const request = { ...parsed.data, requestId: parsed.data.requestId.toLowerCase() }, fingerprint = hash(JSON.stringify(request)), id = idFor(brandId, request.requestId);
    db.transaction(() => {
        const { parent, p, jobs, latest } = selected(brandId, request.packId, request.frameId);
        const existing = db.select().from(schema.jobs).where(eq(schema.jobs.id, id)).get();
        if (existing) {
            matching(existing, fingerprint, FRAME);
            return;
        }
        if (!isCurrent(brandId, p))
            throw new AvatarPackError("The source portrait changed. Create a new pack from the current master.", 409);
        if (latest.status === "queued" || latest.status === "running")
            throw new AvatarPackError("This frame is still waiting or running. Review its outcome before a new attempt.", 409);
        enabled();
        db.insert(schema.jobs).values({ id, brand_id: brandId, kind: FRAME, ref_id: request.frameId, status: "queued", payload: { packId: parent.id, frameId: request.frameId, requestId: request.requestId, fingerprint, ordinal: jobs.length + 1, review: "pending", correction: request.correction } }).run();
    }, { behavior: "immediate" });
    return publicPack(row(brandId, request.packId, PACK));
}
export function resolvePackReference(brandId: string, frameId: string): AvatarPackReference {
    brand(brandId);
    const hit = db.select().from(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, FRAME), eq(schema.jobs.ref_id, frameId))).get();
    if (!hit)
        throw new AvatarPackError("Kept avatar frame not found.", 404);
    const { p, latest, definition, parent } = selected(brandId, String(hit.payload.packId), frameId), a = latest.payload as Attempt;
    if (!isCurrent(brandId, p))
        throw new AvatarPackError("The source portrait changed. Use a new pack from the current master.", 409);
    if (status(latest, a) !== "completed" || a.review !== "kept" || !a.image || !a.width || !a.height)
        throw new AvatarPackError("Keep a completed current frame before using it as a reference.", 409);
    const file = fileFor(a.image);
    if (!a.imageSha256 || hash(fs.readFileSync(file)) !== a.imageSha256)
        throw new AvatarPackError("The kept frame changed on disk. Review a new attempt before reuse.", 409);
    return { file, relative: a.image, avatarId: p.avatarId, packId: parent.id, sourcePortrait: p.sourcePortrait, sourceSha256: p.sourceSha256, setting: definition.setting, aspect: p.aspect, width: a.width, height: a.height };
}
export function listPackReferences(brandId: string): AvatarPackReferenceChoice[] {
    return listPacks(brandId).flatMap((p) => p.current ? p.frames.flatMap((f) => {
        if (f.review !== "kept" || f.status !== "completed")
            return [];
        try {
            const { file: _file, ...ref } = resolvePackReference(brandId, f.id);
            return [{ ...ref, id: f.id, frameId: f.id }];
        }
        catch {
            return [];
        }
    }) : []);
}
export async function runPackFrame(jobId: string): Promise<void> {
    const job = db.select().from(schema.jobs).where(and(eq(schema.jobs.id, jobId), eq(schema.jobs.kind, FRAME))).get();
    if (!job)
        throw new AvatarPackError("Pack attempt not found.", 404);
    const a = job.payload as Attempt;
    if (a.startedAt || calls(job.id).length)
        throw new AvatarPackError("This attempt was already started. Inspect it; only an explicit correction can create a new attempt.", 409);
    const claimed = db.update(schema.jobs).set({ status: "running", payload: { ...a, startedAt: now() }, updated_at: now() }).where(and(eq(schema.jobs.id, jobId), inArray(schema.jobs.status, ["queued", "running"]), sql `json_extract(${schema.jobs.payload}, '$.startedAt') is null`, sql `not exists (select 1 from ${schema.mediaCalls} where ${schema.mediaCalls.job_id} = ${jobId})`)).returning().get();
    if (!claimed)
        throw new AvatarPackError("This attempt is interrupted or already running. It will not be submitted again.", 409);
    const sending = claimed.payload as Attempt;
    try {
        checkpoint();
        const { p, definition, latest } = selected(job.brand_id, a.packId, a.frameId);
        if (latest.id !== job.id)
            throw new AvatarPackError("A later correction replaced this attempt. Review the current attempt; this one will not be sent.", 409);
        if (!isCurrent(job.brand_id, p))
            throw new AvatarPackError("The source portrait changed while this frame waited. Create a new pack.", 409);
        enabled();
        const portrait = fileFor(p.sourceSnapshot), sourceBytes = fs.readFileSync(portrait);
        if (hash(sourceBytes) !== p.sourceSha256)
            throw new AvatarPackError("The source snapshot changed. Create a new pack.", 409);
        const sourceMeta = await sharp(sourceBytes).metadata();
        if (!sourceMeta.width || !sourceMeta.height)
            throw new AvatarPackError("The saved portrait is not a readable image.");
        const s = definition.setting, output = assetPath(job.id, "frame.png"), relative = output.rel.replace(/^assets\//, "");
        const prompt = `ONE photoreal photograph, ${p.aspect}, of the same fictional adult as Image 1. Image 1 defines identity, face proportions, baseline complexion, adult age, hair and existing distinguishing marks only; do not copy its crop, pose, wardrobe, background or light. Preserve that identity without adding scars/freckles or changing age. Source identity: ${p.sourceDescription}.\nScene: ${s.location}. Action: ${s.action}. Wardrobe: ${s.wardrobe} (this scene wardrobe overrides Image 1's clothing). Camera/crop: ${s.camera}. Lighting: ${s.lighting}.\nNatural skin detail proportionate to crop and actual light, coherent catchlights/contact shadows, believable hands and fabric. One person, no product, logos or added words; only accessories specified by the approved wardrobe. Follow the scene's physical camera/light; avoid etched pores, beauty smoothing or sharpening halos.${a.correction ? `\nRequested correction: ${a.correction}. Change that diagnosed detail while retaining this identity, scene, aspect and other approved decisions.` : ""}`;
        db.update(schema.jobs).set({ payload: { ...sending, prompt }, updated_at: now() }).where(eq(schema.jobs.id, jobId)).run();
        await generateImage({ brandId: job.brand_id, jobId, purpose: "avatar_pack_frame", prompt, refs: [portrait], size: sizes[p.aspect], quality: "high", use: "photoreal", out: output.abs, holdUnsure: true });
        const imageBytes = fs.readFileSync(output.abs), meta = await sharp(imageBytes).metadata();
        if (!meta.width || !meta.height)
            throw new Error("The picture maker returned an unreadable image.");
        const logs = calls(jobId), costUsd = logs.reduce((sum, c) => sum + c.cost_usd, 0), model = logs.findLast((c) => c.status === "ok")?.model;
        const delivered: Attempt = { ...sending, prompt, image: relative, imageSha256: hash(imageBytes), width: meta.width, height: meta.height, costUsd, ...(model ? { model } : {}) };
        db.update(schema.jobs).set({ payload: delivered, updated_at: now() }).where(eq(schema.jobs.id, jobId)).run();
        const [aspectWidth, aspectHeight] = p.aspect.split(":").map(Number);
        if (Math.abs((meta.width / meta.height) / (aspectWidth / aspectHeight) - 1) > 0.02)
            throw new AvatarPackError("The generated frame did not match the approved aspect. Request a specific correction before reuse.", 409);
        db.update(schema.jobs).set({ status: "done", progress: 1, payload: delivered, error: null, updated_at: now() }).where(eq(schema.jobs.id, jobId)).run();
    }
    catch (error) {
        const uncertain = calls(jobId).some((c) => c.status === "submitted");
        const message = error instanceof AvatarPackError ? error.message : uncertain ? "The picture request was interrupted and may have been billed. Inspect this attempt before explicitly requesting a correction; it will not be sent again automatically." : "The frame could not be completed. Check the image connection and source, then explicitly request a correction if needed.";
        const latest = row(job.brand_id, job.id, FRAME).payload as Attempt;
        db.update(schema.jobs).set({ status: "failed", payload: { ...latest, error: message, costUsd: calls(jobId).reduce((sum, c) => sum + c.cost_usd, 0) }, error: message, updated_at: now() }).where(eq(schema.jobs.id, jobId)).run();
        throw new AvatarPackError(message, 409);
    }
}
