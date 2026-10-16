"use server";
import { PLAN_FIELDS, noteCastChoice } from "@/lib/hand-edit-points";
import { noteEdit, noteFields } from "@/lib/hand-edits";
import fs from "node:fs";
import path from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import type { ImagePlan, VideoPlan } from "@/db/schema";
import { activeBrandId } from "@/lib/brand-context";
import { env } from "@/lib/env";
import { recordFeedback } from "@/lib/feedback";
import { enqueue } from "@/lib/jobs/queue";
import { mediaUsage } from "@/lib/media/providers";
import { approveStage, castPortraitCost, castSheetPrompts, chooseCast, drawCastPortraits, moreCastOptions, createJob, estimate, saveCharacterAsAvatar, saveImageFeedCopy, savePlan, setCaptions, setJobTaste, setFrameWords, setProduct, setStoryboardFrames, skipMotion, storyboardPreview } from "@/lib/production/engine";
import { MAX_CLIPS, STORYBOARD_FRAMES } from "@/lib/production/prompts";
import { buildHandoff, type HandoffPack } from "@/lib/production/handoff";
import { buildCreativeKit, loadCreativeKit } from "@/lib/production/kit";
import { llmEnabled } from "@/lib/llm/gateway";
import { PLAN_MODELS } from "@/lib/reference-modes";
import { PRODUCT_IN_PICTURE } from "@/lib/product-in-picture";
import { compactTaste, parseTaste, tasteSchema } from "@/lib/taste/schema";
import { OUTPUT_TYPES, type JobStatus } from "@/lib/taxonomy";
import { errorText } from "@/lib/plain-message";
import { acceptFinalChecks } from "@/lib/check-review";
import { videoAudioSchema, type VideoAudio } from "@/lib/video-audio";
import { setVideoAudio } from "@/lib/production/engine";
import { characterViewIndices, characterViewsRepairable } from "@/lib/production/character-view-rules";
import { FORMAT_RECIPES } from "@/lib/formats";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const fail = (e: unknown): {
    ok: false;
    error: string;
} => ({ ok: false, error: errorText(e) });
function revalidate() {
    revalidatePath("/production");
    revalidatePath("/");
}
async function ownJob(id: string) {
    const brandId = await activeBrandId();
    const job = db.select().from(schema.outputJobs).where(and(eq(schema.outputJobs.id, id), eq(schema.outputJobs.brand_id, brandId))).get();
    if (!job)
        throw new Error("Job not found");
    return job;
}
const busy = (jobId: string) => !!db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(eq(schema.jobs.kind, "production"), eq(schema.jobs.ref_id, jobId), inArray(schema.jobs.status, ["queued", "running"]))).get();
const NewJob = z.object({
    workflow: z.enum(["guided", "automatic"]).optional(),
    type: z.enum(OUTPUT_TYPES),
    recipe: z.string().optional(),
    preset: z.string().optional(),
    aspect: z.string().optional(),
    resolution: z.enum(["480p", "720p"]).optional(),
    segments: z.number().int().min(1).max(MAX_CLIPS).optional(),
    targetSeconds: z.number().positive().max(MAX_CLIPS * 15).optional(),
    captionLengths: z.boolean().optional(),
    cards: z.number().int().min(2).max(6).optional(),
    notes: z.string().max(2000).optional(),
    referenceId: z.string().nullable().optional(),
    planModel: z.enum(PLAN_MODELS.map((m) => m.id) as [
        string,
        ...string[]
    ]).optional(),
    productInPicture: z.enum(PRODUCT_IN_PICTURE).optional(),
    taste: tasteSchema.optional(),
    productId: z.string().max(120).optional(),
    burnCaptions: z.boolean().optional(),
    videoAudio: videoAudioSchema.optional(),
    storyboardFrames: z.number().int().min(STORYBOARD_FRAMES.min).max(STORYBOARD_FRAMES.max).optional(),
    formatLook: z.string().max(40).optional(),
    avatarId: z.string().regex(/^ava_[a-z0-9_]{1,40}$/).nullable().optional(),
    avatarReferenceId: z.string().regex(/^[a-z0-9_]{1,120}$/).optional(),
    count: z.number().int().min(1).max(6).default(1),
});
export async function createJobsAction(scriptId: string, items: z.input<typeof NewJob>[], opts: {
    claimChecks?: boolean;
    hookId?: string;
} = {}): Promise<Result<{
    ids: string[];
}>> {
    try {
        const brandId = await activeBrandId();
        const script = db.select({ id: schema.scripts.id }).from(schema.scripts).where(and(eq(schema.scripts.id, scriptId), eq(schema.scripts.brand_id, brandId))).get();
        if (!script)
            return { ok: false, error: "Script not found" };
        const ids: string[] = [];
        for (const raw of items) {
            const n = NewJob.parse(raw);
            for (let i = 0; i < n.count; i++) {
                const id = createJob({ scriptId, ...n, taste: compactTaste(n.taste), ...(typeof opts.claimChecks === "boolean" ? { claimChecks: opts.claimChecks } : {}), ...(opts.hookId ? { hookId: String(opts.hookId).slice(0, 40) } : {}) });
                ids.push(id);
                enqueue(brandId, "production", id, { op: "run" });
            }
        }
        revalidate();
        return { ok: true, ids };
    }
    catch (e) {
        return fail(e);
    }
}
export async function getJobAction(jobId: string): Promise<Result<{
    job: typeof schema.outputJobs.$inferSelect;
}>> {
    const brandId = await activeBrandId();
    const job = db.select().from(schema.outputJobs).where(and(eq(schema.outputJobs.id, jobId), eq(schema.outputJobs.brand_id, brandId))).get();
    return job ? { ok: true, job } : { ok: false, error: "That job is not on this brand's board." };
}
export async function runStepAction(jobId: string): Promise<Result> {
    try {
        const job = await ownJob(jobId);
        if (!job.production)
            return { ok: false, error: "This job has nothing to run." };
        if (job.production.next === "done" || job.production.next.startsWith("approve:"))
            return { ok: false, error: "This job is waiting for you, not for a run." };
        if (busy(jobId))
            return { ok: false, error: "This job is already running." };
        db.update(schema.outputJobs).set({ status: "queued", error: null }).where(eq(schema.outputJobs.id, jobId)).run();
        enqueue(job.brand_id, "production", jobId, { op: "run" });
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function approveStageAction(jobId: string, opts: {
    selected?: number;
    run?: boolean;
} = {}): Promise<Result<{
    next: string;
}>> {
    try {
        const job = await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "Wait for the current step to finish before approving." };
        const choice = z.object({ selected: z.number().int().min(0).optional(), run: z.boolean().optional() }).parse(opts);
        const next = await approveStage(jobId, { selected: choice.selected, human: true });
        if ((choice.run || job.production?.workflow) && next !== "done" && !next.startsWith("approve:"))
            enqueue(job.brand_id, "production", jobId, { op: "run" });
        revalidate();
        return { ok: true, next };
    }
    catch (e) {
        return fail(e);
    }
}
export async function checkJobClaimsAction(jobId: string): Promise<Result> {
    try {
        const job = await ownJob(jobId);
        if (!job.production || !["approve:script", "approve:plan"].includes(job.production.next))
            return { ok: false, error: "Check claims while the script or plan waits for approval." };
        if (busy(jobId))
            return { ok: false, error: "This job is already running." };
        enqueue(job.brand_id, "production", jobId, { op: "claims" });
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function regenerateStageAction(jobId: string, stage: "plan" | "character" | "look" | "storyboard", feedback: string, opts: {
    keep?: boolean;
} = {}): Promise<Result> {
    try {
        const job = await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "This job is already running." };
        if (opts.keep && feedback.trim().length < 4)
            return { ok: false, error: "Say what to change in the picture." };
        enqueue(job.brand_id, "production", jobId, { op: "regenerate", stage, feedback: feedback.slice(0, 1200), ...(opts.keep && (stage === "character" || stage === "look") ? { keep: true } : {}) });
        if (llmEnabled() && feedback.trim().length >= 4)
            void learnFromJob(job, feedback, "typed", "remake").catch(() => undefined);
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function regenerateCharacterViewsAction(jobId: string, selected: number[], feedback: string): Promise<Result> {
    try {
        const job = await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "This job is already running." };
        const views = characterViewIndices(selected);
        const p = job.production;
        if (!p || !characterViewsRepairable(p, FORMAT_RECIPES.find((r) => r.id === p.recipe) ?? null))
            return { ok: false, error: "View repair requires a six-panel reference sheet of one adult presenter." };
        if (p.plan_status !== "approved" || p.clips.some((c) => c.status !== "pending"))
            return { ok: false, error: "Approve the plan and repair views before video clips are made." };
        if (typeof feedback !== "string" || feedback.trim().length < 4)
            return { ok: false, error: "Say what to correct in the selected view." };
        enqueue(job.brand_id, "production", jobId, { op: "character_views", views, feedback: feedback.trim().slice(0, 1200) });
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function saveImageFeedCopyAction(jobId: string, copy: unknown, updatedAt: string): Promise<Result> {
    try {
        const was = await ownJob(jobId);
        if (busy(jobId))
            throw new Error("Wait for this job to finish before editing its feed copy.");
        await saveImageFeedCopy(jobId, copy, z.string().min(1).parse(updatedAt));
        noteFields(was.brand_id, jobId, "plan", { image_plan: was.production?.image_plan }, { image_plan: { ...was.production?.image_plan, ad_copy: copy } }, PLAN_FIELDS);
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function savePlanAction(jobId: string, plan: {
    image?: ImagePlan;
    video?: VideoPlan;
}): Promise<Result> {
    try {
        const was = await ownJob(jobId);
        await savePlan(jobId, plan);
        noteFields(was.brand_id, jobId, "plan", { image_plan: was.production?.image_plan, video_plan: was.production?.video_plan }, { image_plan: plan.image, video_plan: plan.video }, PLAN_FIELDS);
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function chooseCastAction(jobId: string, index: number): Promise<Result> {
    try {
        const was = await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "This job is running. Choose the cast when it stops." };
        await chooseCast(jobId, index);
        noteCastChoice(was, index);
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function castCostAction(jobId: string): Promise<Result<{
    usdEach: number;
    measured: boolean;
}>> {
    try {
        const job = await ownJob(jobId);
        return { ok: true, ...castPortraitCost(job.brand_id) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function drawCastPortraitsAction(jobId: string): Promise<Result<{
    drawn: number;
}>> {
    try {
        await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "This job is running. Draw the portraits when it stops." };
        const drawn = await drawCastPortraits(jobId);
        revalidate();
        return { ok: true, drawn };
    }
    catch (e) {
        return fail(e);
    }
}
export async function moreCastAction(jobId: string, opts: {
    pictures?: boolean;
} = {}): Promise<Result<{
    added: number;
    drawn: number;
}>> {
    try {
        await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "This job is running. Ask for more options when it stops." };
        const added = await moreCastOptions(jobId);
        const drawn = opts.pictures ? await drawCastPortraits(jobId) : 0;
        revalidate();
        return { ok: true, added, drawn };
    }
    catch (e) {
        revalidate();
        return fail(e);
    }
}
export async function castPromptsAction(jobId: string): Promise<Result<{
    prompts: string[];
}>> {
    try {
        const job = await ownJob(jobId);
        return { ok: true, prompts: job.production ? castSheetPrompts(job.production) : [] };
    }
    catch (e) {
        return fail(e);
    }
}
export async function saveCharacterAvatarAction(jobId: string, name: string): Promise<Result<{
    name: string;
}>> {
    try {
        await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "This job is running. Save the character when it stops." };
        const avatar = await saveCharacterAsAvatar(jobId, String(name).slice(0, 60));
        revalidatePath("/personas");
        revalidate();
        return { ok: true, name: avatar.name };
    }
    catch (e) {
        return fail(e);
    }
}
export async function storyboardPreviewAction(jobId: string): Promise<Result<Awaited<ReturnType<typeof storyboardPreview>>>> {
    try {
        await ownJob(jobId);
        return { ok: true, ...(await storyboardPreview(jobId)) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function jobOptionsAction(jobId: string): Promise<Result<{
    products: {
        id: string;
        name: string;
    }[];
}>> {
    try {
        const job = await ownJob(jobId);
        const { loadBrandBrain } = await import("@/lib/brands");
        return { ok: true, products: loadBrandBrain(job.brand_id).products.map((x) => ({ id: x.id, name: x.name })) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function setJobTasteAction(jobId: string, taste: unknown): Promise<Result> {
    try {
        await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "This job is running. Change this when it stops." };
        await setJobTaste(jobId, parseTaste(taste));
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function setCaptionsAction(jobId: string, on: boolean): Promise<Result> {
    try {
        await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "This job is running. Change the captions when it stops." };
        await setCaptions(jobId, on === true);
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function setVideoAudioAction(jobId: string, audio: VideoAudio): Promise<Result> {
    try {
        await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "This job is running. Change audio when it stops." };
        await setVideoAudio(jobId, videoAudioSchema.parse(audio));
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function setProductAction(jobId: string, productId: string): Promise<Result> {
    try {
        const job = await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "This job is running. Change the product when it stops." };
        const hadPlan = job.production?.plan_status !== "none";
        await setProduct(jobId, String(productId).slice(0, 120));
        if (hadPlan && job.production?.product_id !== productId)
            enqueue(job.brand_id, "production", jobId, { op: "run" });
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function setStoryboardFramesAction(jobId: string, perClip: number): Promise<Result> {
    try {
        await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "This job is running. Change the storyboard when it stops." };
        await setStoryboardFrames(jobId, perClip);
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function saveFrameWordsAction(jobId: string, index: number, description: string): Promise<Result> {
    try {
        const was = await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "This job is running. Change the storyboard when it stops." };
        const drawn = (await storyboardPreview(jobId)).frames?.[index];
        await setFrameWords(jobId, index, description);
        noteEdit(was.brand_id, jobId, "frame_words", drawn?.description, description, index);
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function redoFrameAction(jobId: string, index: number, feedback: string, opts: {
    keep?: boolean;
} = {}): Promise<Result> {
    try {
        const job = await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "This job is already running." };
        if (!job.production?.storyboard?.frames?.[index])
            return { ok: false, error: "Draw the storyboard first: this frame doesn't exist yet." };
        if (opts.keep && feedback.trim().length < 4)
            return { ok: false, error: "Say what to change in the picture." };
        enqueue(job.brand_id, "production", jobId, { op: "frame", frame: index, feedback: feedback.slice(0, 1200), ...(opts.keep ? { keep: true } : {}) });
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function skipMotionAction(jobId: string): Promise<Result> {
    try {
        await ownJob(jobId);
        await skipMotion(jobId);
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function resetClipAction(jobId: string, index: number): Promise<Result> {
    try {
        const job = await ownJob(jobId);
        const p = job.production;
        const clip = p?.clips[index];
        if (!p || !clip || clip.status === "completed")
            return { ok: false, error: "That clip can't be reset." };
        Object.assign(clip, { status: "pending", provider_id: undefined, error: undefined });
        db.update(schema.outputJobs).set({ production: p, error: null }).where(eq(schema.outputJobs.id, jobId)).run();
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function deleteJobAction(jobId: string): Promise<Result> {
    try {
        await ownJob(jobId);
        if (busy(jobId))
            return { ok: false, error: "This job is running. Wait for it to stop first." };
        db.delete(schema.outputJobs).where(eq(schema.outputJobs.id, jobId)).run();
        const dir = path.join(env.DATA_DIR, "assets", jobId);
        if (dir.startsWith(path.join(env.DATA_DIR, "assets") + path.sep))
            fs.rmSync(dir, { recursive: true, force: true });
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function buildCreativeKitAction(): Promise<Result> {
    try {
        if (!llmEnabled())
            return { ok: false, error: "Needs live mode (LLM_MODE=live and an API key in .env)." };
        await buildCreativeKit(await activeBrandId());
        revalidatePath("/brand");
        revalidate();
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function productionStatusAction() {
    const brandId = await activeBrandId();
    return { usage: mediaUsage(), live: llmEnabled(), kit: !!loadCreativeKit(brandId) };
}
export async function handoffAction(jobId: string): Promise<Result<{
    pack: HandoffPack;
}>> {
    try {
        await ownJob(jobId);
        return { ok: true, pack: await buildHandoff(jobId) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function estimateAction(jobId: string) {
    const job = await ownJob(jobId);
    return job.production ? estimate(job.production) : { images: 0, videoUsd: 0, clips: 0, seconds: 0 };
}
const ALLOWED: Partial<Record<JobStatus, JobStatus[]>> = {
    in_review: ["approved", "rejected"],
    approved: ["sent"],
    rejected: ["in_review"],
    draft: ["sent"],
};
export async function reviewJobAction(id: string, to: JobStatus, notes: string | null) {
    const brandId = await activeBrandId();
    const job = db.select().from(schema.outputJobs).where(and(eq(schema.outputJobs.id, id), eq(schema.outputJobs.brand_id, brandId))).get();
    if (!job)
        return { ok: false as const, error: "Job not found" };
    if (!ALLOWED[job.status]?.includes(to))
        return { ok: false as const, error: `Can't move ${job.status} to ${to}` };
    if (to === "approved" && job.production && job.production.next !== "done")
        return { ok: false as const, error: "This job still has steps to run before it can be approved." };
    const reviewed = to === "approved" ? acceptFinalChecks(job) : { production: job.production, assets: job.assets };
    db.update(schema.outputJobs)
        .set({ status: to, ...reviewed, review_notes: notes ?? job.review_notes, updated_at: new Date().toISOString() })
        .where(eq(schema.outputJobs.id, id))
        .run();
    revalidate();
    return { ok: true as const };
}
type JobRow = Awaited<ReturnType<typeof ownJob>>;
async function learnFromJob(job: JobRow, text: string, via: "typed" | "voice", action: "note" | "remake") {
    const script = db.select({ title: schema.scripts.title }).from(schema.scripts).where(eq(schema.scripts.id, job.script_id)).get();
    const image = job.assets.find((a) => a.kind === "image");
    return recordFeedback({
        brandId: job.brand_id,
        refType: "job",
        refId: job.id,
        asset: image?.path ?? null,
        productId: job.production?.product_id ?? null,
        text,
        via,
        action,
        about: `${OUTPUT_TYPES.includes(job.output_type) ? job.output_type.replace(/_/g, " ") : "An ad"} made from the script "${script?.title ?? job.script_id}".`,
    });
}
const JobNote = z.object({ text: z.string().trim().min(4, "Say what should change, in a few words.").max(4000), via: z.enum(["typed", "voice"]).default("typed") });
export async function jobFeedbackAction(jobId: string, input: z.input<typeof JobNote>): Promise<Result<{
    learned: {
        id: string;
        rule: string;
        isNew: boolean;
    }[];
    status: string;
}>> {
    try {
        const o = JobNote.parse(input);
        const res = await learnFromJob(await ownJob(jobId), o.text, o.via, "note");
        revalidatePath("/lessons");
        return { ok: true, learned: res.lessons.map((x) => ({ id: x.lesson.id, rule: x.lesson.rule, isNew: x.isNew })), status: res.feedback.status };
    }
    catch (e) {
        return fail(e instanceof z.ZodError ? new Error(e.issues[0]?.message ?? "Check the note.") : e);
    }
}
