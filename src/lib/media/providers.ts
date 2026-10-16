import { checkpoint } from "../llm/run-control";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "../env";
import { spendCaps } from "../spend-caps";
import { imageAdapterFor, videoAdapterFor, type ImageRequest, type VideoRequest } from "./adapters";
import { imageModel, videoModel } from "./chosen";
import { ClipFailedError, MediaCapError, MediaDisabledError, ProviderRefused, neverBilled } from "./errors";
import { IMAGE_MODEL_FOR, imageModelInfo, lengthsText, videoModelInfo, type ImageModelInfo } from "./models";
import { withResourceLane } from "../production-ops/lanes";
import { startSpan, endSpan } from "../production-ops/metrics";
import { currentJobId, currentJobSignal } from "../llm/run-control";
import { paidAttempt } from "../production-ops/attempts";
import { fingerprint } from "../production-ops/store";
export { imageModel, videoModel } from "./chosen";
export { MediaCapError, MediaDisabledError } from "./errors";
export { publicUrl, uid } from "./storage";
export type { ImageRequest, VideoRequest } from "./adapters";
export const mediaLive = () => env.LLM_MODE === "live";
export function assetPath(jobId: string, name: string): {
    abs: string;
    rel: string;
} {
    const rel = path.join("assets", jobId, name).split(path.sep).join("/");
    const abs = path.join(env.DATA_DIR, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    return { abs, rel };
}
export const dataPath = (rel: string) => path.join(env.DATA_DIR, rel);
export function mediaUsage() {
    const images = db.select({ n: sql<number> `count(*)` }).from(schema.mediaCalls).where(and(eq(schema.mediaCalls.kind, "image"), sql `${schema.mediaCalls.status} in ('ok', 'submitted')`)).get()!.n;
    const video = db.select({ c: sql<number> `coalesce(sum(${schema.mediaCalls.cost_usd}), 0)` }).from(schema.mediaCalls).where(and(eq(schema.mediaCalls.kind, "video"), sql `${schema.mediaCalls.status} != 'error'`)).get()!.c;
    const caps = spendCaps();
    return { images, imageCap: caps.images, videoUsd: video, videoCapUsd: caps.videoUsd };
}
export function videoCost(seconds: number, hasReferenceVideo: boolean, resolution: string, model: string = videoModel()): number {
    return videoModelInfo(model).price(seconds, hasReferenceVideo, resolution);
}
function logCall(row: Omit<typeof schema.mediaCalls.$inferInsert, "id">): string {
    const id = randomUUID();
    db.insert(schema.mediaCalls).values({ id, ...row }).run();
    return id;
}
const updateCall = (id: string, set: Partial<typeof schema.mediaCalls.$inferInsert>) => db.update(schema.mediaCalls).set({ ...set, updated_at: new Date().toISOString() }).where(eq(schema.mediaCalls.id, id)).run();
export function imageModelOf(req: Pick<ImageRequest, "use" | "model">): ImageModelInfo {
    const asked = req.model ?? (req.use ? IMAGE_MODEL_FOR[req.use] : undefined);
    return imageModelInfo(asked ?? imageModel());
}
export async function generateImage(req: ImageRequest): Promise<string> {
    const send = () => withResourceLane("image", () => generateImageInLane(req), { signal: currentJobSignal(), priority: currentJobId() ? "batch" : "interactive" });
    const job = currentJobId();
    if (!job)
        return send();
    const references = req.refs.map(file => ({ file, sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') }));
    const result = await paidAttempt({ id: `media:${job}:image:${fingerprint({ out: req.out, purpose: req.purpose })}`, brandId: req.brandId, request: { model: imageModelOf(req).id, prompt: req.prompt, size: req.size, quality: req.quality, references } }, async () => {
        const out = await send(), rel = path.relative(env.DATA_DIR, out).split(path.sep).join('/');
        const row = db.$client.prepare("SELECT id,cost_usd FROM media_calls WHERE brand_id=? AND output_path=? AND status='ok' ORDER BY created_at DESC LIMIT 1").get(req.brandId, rel) as {
            id: string;
            cost_usd: number;
        } | undefined;
        if (!row)
            throw new Error("The image completion has no persisted provider receipt.");
        return { data: { out, sha256: createHash('sha256').update(fs.readFileSync(out)).digest('hex') }, callId: row.id, costUsd: row.cost_usd };
    });
    if (!fs.existsSync(result.data.out) || createHash('sha256').update(fs.readFileSync(result.data.out)).digest('hex') !== result.data.sha256)
        throw new Error("The retained image bytes changed or are missing. Review the original attempt before requesting a new variation.");
    return result.data.out;
}
async function generateImageInLane(req: ImageRequest): Promise<string> {
    const usual = imageModelInfo(imageModel());
    const own = imageModelOf(req);
    if (req.strictModel)
        return imageOn(own, req);
    if (own.id === usual.id)
        return imageOn(usual, req);
    const other = "This picture was made on the app's other picture model: the one that usually makes people";
    if (mediaLive() && !imageAdapterFor(own).connected() && imageAdapterFor(usual).connected()) {
        req.onOtherModel?.(`${other} is not connected.`);
        return imageOn(usual, req);
    }
    try {
        return await imageOn(own, req);
    }
    catch (e) {
        if (!neverBilled(e) || !imageAdapterFor(usual).connected())
            throw e;
        req.onOtherModel?.(`${other} turned the request away (${e.status === 429 ? "its spending or usage limit was reached" : "its key or access was refused"}). Nothing was charged for that.`);
        return imageOn(usual, req);
    }
}
async function imageOn(model: ImageModelInfo, req: ImageRequest): Promise<string> {
    const adapter = imageAdapterFor(model);
    if (!mediaLive() || !adapter.connected())
        throw new MediaDisabledError(`Image generation needs LLM_MODE=live and ${adapter.key} in .env.`);
    checkpoint();
    const use = mediaUsage();
    if (use.images >= use.imageCap)
        throw new MediaCapError(`Image cap reached (${use.images} of ${use.imageCap}). Raise the image cap in Settings to continue.`);
    if (req.refs.length > model.maxRefs)
        throw new Error(`At most ${model.maxRefs} reference images per request.`);
    const callId = db.$client.transaction(() => {
        const current = mediaUsage();
        if (current.images >= current.imageCap)
            throw new MediaCapError("The image cap has no room after in-flight reservations.");
        return logCall({ brand_id: req.brandId, job_id: req.jobId, provider: adapter.id, kind: "image", model: model.id, purpose: req.purpose, prompt: req.prompt, request: { size: req.size, quality: req.quality ?? "medium", refs: req.refs.map((r) => path.basename(r)) }, status: "submitted" });
    }).immediate();
    const span = startSpan(req.brandId, currentJobId() ?? req.jobId ?? callId, "render");
    const started = Date.now();
    try {
        const { costUsd } = await adapter.generate(model, req);
        updateCall(callId, { status: "ok", cost_usd: costUsd, duration_ms: Date.now() - started, output_path: path.relative(env.DATA_DIR, req.out).split(path.sep).join("/") });
        endSpan(span, "passed", { cost: costUsd, attempt: callId });
        return req.out;
    }
    catch (e) {
        const held = !(e instanceof ProviderRefused);
        const billed = (e as {
            costUsd?: unknown;
        }).costUsd;
        updateCall(callId, { ...(held ? {} : { status: "error" as const }), ...(typeof billed === "number" ? { cost_usd: billed } : {}), error: (e as Error).message.slice(0, 400), duration_ms: Date.now() - started });
        endSpan(span, "failed", { cost: typeof billed === 'number' ? billed : 0, attempt: callId, error: String(e) });
        throw e;
    }
}
export function videoProviderProblem(model: string = videoModel(), baseUrl: string = env.SEEDANCE_BASE_URL): string {
    const info = videoModelInfo(model);
    return videoAdapterFor(info, baseUrl).problem(info);
}
export async function submitVideo(req: VideoRequest): Promise<{
    taskId: string;
    callId: string;
    cost: number;
}> {
    const job = currentJobId();
    if (!job)
        return submitVideoInLane(req);
    const references = [...req.images, ...(req.referenceVideo ? [req.referenceVideo] : [])].map(file => ({ file, sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') }));
    const result = await paidAttempt({ id: `media:${job}:video:${fingerprint({ purpose: req.purpose, prompt: req.prompt, images: req.images, seconds: req.seconds, aspect: req.aspect, resolution: req.resolution })}`, brandId: req.brandId, request: { model: videoModel(), prompt: req.prompt, seconds: req.seconds, aspect: req.aspect, resolution: req.resolution, references } }, async () => { const data = await withResourceLane('image', () => submitVideoInLane(req), { signal: currentJobSignal() }); return { data, callId: data.callId, costUsd: data.cost }; });
    return result.data;
}
async function submitVideoInLane(req: VideoRequest): Promise<{
    taskId: string;
    callId: string;
    cost: number;
}> {
    const model = videoModelInfo(videoModel());
    const adapter = videoAdapterFor(model);
    const unavailable = adapter.problem(model);
    if (!mediaLive() || !adapter.connected())
        throw new MediaDisabledError(unavailable || `Video generation needs LLM_MODE=live and ${adapter.key} in .env.`);
    checkpoint();
    if (unavailable)
        throw new MediaDisabledError(unavailable);
    if (req.prompt.length > model.promptLimit)
        throw new Error(`The video prompt is ${req.prompt.length} characters; the limit is ${model.promptLimit}.`);
    if (!req.images.length || req.images.length > model.maxImages)
        throw new Error(`A clip needs 1 to ${model.maxImages} images for ${model.id}.`);
    if (model.secondsOnly && !model.seconds.includes(req.seconds))
        throw new Error(`${model.id} makes ${lengthsText(model.seconds)} second clips.`);
    if (!model.referenceVideo && req.referenceVideo)
        throw new Error(`${model.id} doesn't take a reference video.`);
    const cost = model.price(req.seconds, !!req.referenceVideo, req.resolution);
    const use = mediaUsage();
    if (use.videoUsd + cost > use.videoCapUsd + 1e-9)
        throw new MediaCapError(`Video cap reached: $${use.videoUsd.toFixed(2)} spent of $${use.videoCapUsd}, and this clip costs $${cost.toFixed(2)}. Raise the video cap in Settings to continue.`);
    let callId = "";
    const sending = () => {
        db.$client.transaction(() => {
            const current = mediaUsage();
            if (current.videoUsd + cost > current.videoCapUsd + 1e-9)
                throw new MediaCapError("The video cap has no room after in-flight reservations.");
            callId = logCall({
                brand_id: req.brandId,
                job_id: req.jobId,
                provider: adapter.id as (typeof schema.mediaCalls.$inferInsert)["provider"],
                kind: "video",
                model: model.id,
                purpose: req.purpose,
                prompt: req.prompt,
                request: { seconds: req.seconds, resolution: req.resolution, aspect: req.aspect, images: req.images.map((f) => path.basename(f)), reference_video: req.referenceVideo ? path.basename(req.referenceVideo) : null },
                cost_usd: cost,
                status: "submitted",
            });
        }).immediate();
    };
    try {
        const { taskId } = await adapter.submit(model, req, sending);
        updateCall(callId, { provider_id: taskId });
        return { taskId, callId, cost };
    }
    catch (e) {
        if (callId)
            updateCall(callId, { ...(e instanceof ProviderRefused ? { status: "error" as const, cost_usd: 0 } : {}), error: (e as Error).message.slice(0, 400) });
        throw e;
    }
}
export async function awaitVideo(taskId: string, callId: string, out: string, maxPolls = 120): Promise<string> {
    const sentOn = callId ? db.select({ model: schema.mediaCalls.model }).from(schema.mediaCalls).where(eq(schema.mediaCalls.id, callId)).get()?.model : undefined;
    const adapter = videoAdapterFor(videoModelInfo(sentOn ?? videoModel()));
    const started = Date.now();
    try {
        await adapter.wait(taskId, out, maxPolls);
    }
    catch (e) {
        if (e instanceof ClipFailedError)
            updateCall(callId, { status: "error", cost_usd: 0, error: "The video provider reported a failure." });
        throw e;
    }
    updateCall(callId, { status: "ok", duration_ms: Date.now() - started, output_path: path.relative(env.DATA_DIR, out).split(path.sep).join("/") });
    return out;
}
