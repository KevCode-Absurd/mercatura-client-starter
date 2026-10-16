"use server";
import { readCheckpoint } from "@/lib/production-ops/store";
import { noteStudioEdits } from "@/lib/hand-edit-points";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import type { LibraryKind, LibraryRefRow, StudioRunRow, StudioText, TextLayer } from "@/db/schema";
import { activeBrandId } from "@/lib/brand-context";
import { humanCheckOverride } from "@/lib/check-review";
import { loadBrandBrain } from "@/lib/brands";
import { recordFeedback } from "@/lib/feedback";
import { LOOK_TYPES } from "@/lib/format-media";
import { enqueue } from "@/lib/jobs/queue";
import { bucketOf } from "@/lib/library/buckets";
import { KIND_INFO, typeLabel } from "@/lib/library/taxonomy";
import { mediaUsage } from "@/lib/media/providers";
import { loadCreativeKit } from "@/lib/production/kit";
import { PRODUCT_IN_PICTURE } from "@/lib/product-in-picture";
import { createRun, deleteRun, estimateRun, getRun, picturesFor, readPlaces, removeItem, saveItemPlan, saveRun, setItemTaste } from "@/lib/studio/engine";
import { currentOutputs, selectOutput, visualRepairPrompt, type VisualRepair } from "@/lib/studio/outputs";
import { LayersSchema } from "@/lib/studio/overlay";
import { compositeProgress } from "@/lib/studio/composite-progress";
import { MAX_VARIANTS_AT_ONCE, removeVariant } from "@/lib/studio/variants";
import { FIDELITIES } from "@/lib/studio/reference";
import { tasteSchema } from "@/lib/taste/schema";
import { STAGES } from "@/lib/taste/types";
import { makeReel } from "@/lib/studio/reel";
import { workOf, type SetWork } from "@/lib/studio/timing-server";
import { productProfile, rankRefs, suggestFrames, suggestSet, suggestTemplate, type Scored } from "@/lib/studio/select";
import { errorText } from "@/lib/plain-message";
import path from "node:path";
import { env } from "@/lib/env";
import { deliveryFile } from "@/lib/production/delivery";
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
const Kind = z.enum(["pdp", "photoshoot", "ad"]);
export interface RefCard {
    id: string;
    type: string;
    label: string;
    group: string | null;
    vertical: string;
    brand: string | null;
    note: string;
    why: string;
    craft: number;
    score: number;
    reason: string;
    ratio: number;
    bucket: string;
    direction?: string;
}
const card = (s: Scored, kind: LibraryKind): RefCard => {
    const r: LibraryRefRow = s.ref;
    return { id: r.id, type: r.type, label: typeLabel(kind, r.type), group: r.group_name, vertical: r.vertical, brand: r.brand, note: r.note, why: r.analysis?.why_it_works ?? r.note, craft: r.craft, score: s.score, reason: s.reason, ratio: r.width && r.height ? r.width / r.height : 1, bucket: kind === "pdp" ? bucketOf(r) : "" };
};
export async function suggestAction(kind: LibraryKind, productId: string): Promise<Result<{
    picks: RefCard[];
    profile: {
        vertical: string;
        format: string;
    };
    slots?: {
        bucket: string;
        ref: RefCard | null;
    }[];
}>> {
    try {
        const brandId = await activeBrandId();
        const brand = loadBrandBrain(brandId);
        const profile = productProfile(brandId, brand, loadCreativeKit(brandId), productId);
        if (kind === "pdp") {
            const slots = suggestTemplate(profile).map((s) => ({ bucket: s.bucket, ref: s.pick ? card(s.pick, kind) : null }));
            return { ok: true, picks: slots.flatMap((s) => (s.ref ? [s.ref] : [])), slots, profile: { vertical: profile.vertical, format: profile.format } };
        }
        if (kind === "photoshoot")
            return { ok: true, picks: suggestFrames(profile).map((x) => ({ ...card(x.pick, kind), label: x.frame.label, direction: x.frame.direction })), profile: { vertical: profile.vertical, format: profile.format } };
        const picks = suggestSet(Kind.parse(kind), profile).filter((s) => s.ref.brand?.toLowerCase() !== brand.brand.name.toLowerCase());
        return { ok: true, picks: picks.map((s) => card(s, kind)), profile: { vertical: profile.vertical, format: profile.format } };
    }
    catch (e) {
        return fail(e);
    }
}
const Search = z.object({ kind: Kind, productId: z.string(), type: z.string().optional(), group: z.string().optional(), vertical: z.string().optional(), bucket: z.string().optional(), offset: z.number().int().min(0).default(0) });
export async function searchRefsAction(input: z.input<typeof Search>): Promise<Result<{
    refs: RefCard[];
    more: boolean;
}>> {
    try {
        const q = Search.parse(input);
        const brandId = await activeBrandId();
        const brand = loadBrandBrain(brandId);
        const profile = productProfile(brandId, brand, loadCreativeKit(brandId), q.productId);
        const all = rankRefs(q.kind, profile, { type: q.type || undefined, group: q.group || undefined, vertical: q.vertical || undefined, bucket: q.bucket || undefined, limit: 5000 });
        return { ok: true, refs: all.slice(q.offset, q.offset + 60).map((s) => card(s, q.kind)), more: all.length > q.offset + 60 };
    }
    catch (e) {
        return fail(e);
    }
}
const NewSet = z.object({
    kind: Kind,
    productId: z.string().min(1),
    picks: z.array(z.object({ refId: z.string().nullable().optional(), bucket: z.string().max(40).optional(), direction: z.string().max(600).optional(), reason: z.string().max(300).optional(), label: z.string().max(80).optional(), world: z.string().max(40).optional(), mode: z.string().max(20).optional(), archetype: z.string().max(40).optional() })).min(1).max(12),
    aspects: z.array(z.string()).min(1).max(4),
    notes: z.string().max(2000).optional(),
    productImages: z.array(z.string()).max(4).optional(),
    brandImages: z.array(z.string().max(300)).max(12).optional(),
    buyers: z.array(z.string()).max(6).optional(),
    offer: z.string().max(80).optional(),
    claimChecks: z.boolean().optional(),
    adReview: z.boolean().optional(),
    auto: z.boolean().optional(),
    textOnImage: z.boolean().optional(),
    feedCopy: z.boolean().optional(),
    baseImage: z.boolean().optional(),
    productInPicture: z.enum(PRODUCT_IN_PICTURE).optional(),
    fidelity: z.enum(FIDELITIES).optional(),
    variety: z.number().int().min(1).max(5).optional(),
    taste: tasteSchema.optional(),
    stage: z.enum(STAGES).optional(),
    formatLook: z.string().max(40).optional(),
    lookType: z.enum(LOOK_TYPES).optional(),
});
export async function createSetAction(input: z.input<typeof NewSet>): Promise<Result<{
    id: string;
}>> {
    try {
        const n = NewSet.parse(input);
        const brandId = await activeBrandId();
        const id = createRun({ brandId, ...n });
        enqueue(brandId, "studio", id, { op: "plan" });
        revalidatePath("/studio");
        return { ok: true, id };
    }
    catch (e) {
        return fail(e);
    }
}
async function ownRun(id: string): Promise<StudioRunRow> {
    const brandId = await activeBrandId();
    const run = getRun(id);
    if (!run || run.brand_id !== brandId)
        throw new Error("Set not found");
    return run;
}
const busy = (id: string) => !!db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(eq(schema.jobs.kind, "studio"), eq(schema.jobs.ref_id, id), inArray(schema.jobs.status, ["queued", "running"]))).get();
export interface SetStatus {
    run: StudioRunRow;
    busy: boolean;
    work: SetWork | null;
    estimate: {
        images: number;
        usd: number;
    };
    usage: {
        images: number;
        imageCap: number;
    };
    lastError: string | null;
}
export async function setStatusAction(id: string): Promise<Result<SetStatus>> {
    try {
        const run = await ownRun(id);
        const u = mediaUsage();
        const failed = db.select({ error: schema.jobs.error, at: schema.jobs.updated_at }).from(schema.jobs).where(and(eq(schema.jobs.kind, "studio"), eq(schema.jobs.ref_id, id), eq(schema.jobs.status, "failed"))).all().sort((a, b) => b.at.localeCompare(a.at))[0];
        return { ok: true, run, busy: busy(id), work: workOf(run), estimate: estimateRun(run), usage: { images: u.images, imageCap: u.imageCap }, lastError: run.error ?? failed?.error ?? null };
    }
    catch (e) {
        return fail(e);
    }
}
export async function checkSetAction(id: string, which: "claims" | "review"): Promise<Result> {
    try {
        which = z.enum(["claims", "review"]).parse(which);
        const run = await ownRun(id);
        if (busy(id))
            return { ok: false, error: "This set is already working. Wait for it to finish." };
        if (!run.items.some((i) => i.plan))
            return { ok: false, error: "Write the plan first." };
        enqueue(run.brand_id, "studio", id, { op: which });
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function planSetAction(id: string, itemIds?: string[]): Promise<Result> {
    try {
        const run = await ownRun(id);
        if (busy(id))
            return { ok: false, error: "This set is already working. Wait for it to finish." };
        enqueue(run.brand_id, "studio", id, { op: "plan", redo: !itemIds, itemIds });
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function retasteItemAction(id: string, itemId: string, taste: z.input<typeof tasteSchema>): Promise<Result> {
    try {
        const run = await ownRun(id);
        if (busy(id))
            return { ok: false, error: "This set is already working. Wait for it to finish." };
        if (!setItemTaste(id, itemId, tasteSchema.parse(taste)))
            return { ok: false, error: "Move a lever first." };
        enqueue(run.brand_id, "studio", id, { op: "plan", itemIds: [itemId] });
        revalidatePath(`/studio/${id}`);
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
const Render = z.object({ itemIds: z.array(z.string()).optional(), feedback: z.string().max(800).optional(), redo: z.boolean().optional(), quality: z.enum(["medium", "high"]).optional(), force: z.boolean().optional(), keep: z.boolean().optional() });
export async function renderSetAction(id: string, input: z.input<typeof Render> = {}): Promise<Result> {
    try {
        const o = Render.parse(input);
        const run = await ownRun(id);
        if (busy(id))
            return { ok: false, error: "This set is already working. Wait for it to finish." };
        if (!run.items.some((i) => i.plan))
            return { ok: false, error: "The plan isn't written yet." };
        if (!o.force && run.audit.some((a) => a.status === "fail"))
            return { ok: false, error: "A check on the plan failed. Fix it, or choose to make the images anyway." };
        const todo = run.items.filter((i) => i.plan && (!o.itemIds || o.itemIds.includes(i.id)));
        const u = mediaUsage();
        const need = picturesFor(run, todo);
        if (u.images + need > u.imageCap)
            return { ok: false, error: `This needs ${need} images and ${Math.max(0, u.imageCap - u.images)} are left under the cap (${u.images} of ${u.imageCap} used). Raise the image cap in Settings, or render fewer.` };
        const override = o.force ? humanCheckOverride("image plan", run.audit.filter((a) => a.line_index == null || todo.includes(run.items[a.line_index]))) : undefined;
        if (override) {
            run.log.push({ at: override.at, message: `Human override: ${override.findings.map((a) => a.message).join("; ")}`, check_override: override });
            saveRun(run);
        }
        enqueue(run.brand_id, "studio", id, { op: "render", ...o });
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function makeEditableAction(id: string, itemId: string, aspect: string): Promise<Result> {
    try {
        const run = await ownRun(id);
        if (busy(id))
            return { ok: false, error: "This set is already working. Wait for it to finish." };
        if (!run.items.find((i) => i.id === itemId)?.outputs.some((o) => o.aspect === aspect))
            return { ok: false, error: "That picture is not made yet." };
        const u = mediaUsage();
        if (u.images + 1 > u.imageCap)
            return { ok: false, error: `The image cap is reached (${u.images} of ${u.imageCap} used). Raise the image cap in Settings to continue.` };
        enqueue(run.brand_id, "studio", id, { op: "base", itemIds: [itemId], aspect });
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function readLayoutAction(id: string, itemId: string, aspect: string): Promise<Result<{
    found: number;
}>> {
    try {
        await ownRun(id);
        if (busy(id))
            return { ok: true, found: 0 };
        const placed = await readPlaces(id, itemId, aspect);
        return { ok: true, found: placed?.length ?? 0 };
    }
    catch (e) {
        return fail(e);
    }
}
export async function writeVariantsAction(id: string, itemId: string, aspect: string, count: number, layers: TextLayer[], budgetUsd?: number): Promise<Result> {
    try {
        const run = await ownRun(id);
        if (busy(id))
            return { ok: false, error: "This set is already working. Wait for it to finish." };
        const layout = LayersSchema.parse(layers).filter((l) => l.text.trim());
        if (!layout.length)
            return { ok: false, error: "Write at least 1 line on the picture first." };
        if (budgetUsd !== undefined)
            z.number().positive().finite().parse(budgetUsd);
        const n = Math.min(MAX_VARIANTS_AT_ONCE, Math.max(1, Math.round(Number(count) || 1)));
        enqueue(run.brand_id, "studio", id, { op: "variants", itemIds: [itemId], aspect, count: n, layers: layout, ...(budgetUsd !== undefined ? { budgetUsd } : {}) });
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function variantCompositeStatusAction(id: string, itemId: string, aspect: string): Promise<Result<{
    progress: ReturnType<typeof compositeProgress>;
}>> { try {
    const run = await ownRun(id), item = run.items.find(i => i.id === itemId);
    if (!item)
        throw new Error("That picture is not in this set.");
    const variants = (item.variants ?? []).filter(v => v.aspect === aspect), states = Object.fromEntries(variants.map(v => [v.id, readCheckpoint<{
            state: string;
            findings: string[];
        }>(run.brand_id, "studio-composites", `${run.id}:${item.id}:${v.id}`)?.value ?? {}]));
    return { ok: true, progress: compositeProgress(variants, states) };
}
catch (error) {
    return fail(error);
} }
export async function compositeVariantsAction(id: string, itemId: string): Promise<Result> { try {
    const run = await ownRun(id);
    if (busy(id))
        return { ok: false, error: "This set is already working. Wait for it to finish." };
    if (!run.items.some(i => i.id === itemId))
        throw new Error("That item is not in this set.");
    enqueue(run.brand_id, "studio", id, { op: "composite", itemIds: [itemId] });
    return { ok: true };
}
catch (e) {
    return fail(e);
} }
export async function removeVariantAction(id: string, itemId: string, variantId: string): Promise<Result> {
    try {
        await ownRun(id);
        if (busy(id))
            return { ok: false, error: "This set is working. Wait for it to finish." };
        removeVariant(id, itemId, variantId);
        revalidatePath(`/studio/${id}`);
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
const Text = z.object({ role: z.string().max(30), text: z.string().max(400), placement: z.string().max(200).default(""), source: z.string().max(80).optional() });
const Patch = z.object({ text_elements: z.array(Text).max(16).optional(), prompt: z.string().max(6000).optional(), direction: z.string().max(600).optional(), scene: z.string().max(2000).optional(), ad_copy: z.object({ primary_text: z.string().max(4000), headline: z.string().max(120), description: z.string().max(200), cta: z.string().max(40) }).optional() });
export async function saveItemAction(id: string, itemId: string, patch: z.input<typeof Patch>): Promise<Result<{
    run: StudioRunRow;
}>> {
    try {
        const was = await ownRun(id);
        const p = Patch.parse(patch);
        const run = saveItemPlan(id, itemId, { ...p, text_elements: p.text_elements as StudioText[] | undefined });
        noteStudioEdits(was, run, itemId);
        return { ok: true, run };
    }
    catch (e) {
        return fail(e);
    }
}
const Feedback = z.object({ itemId: z.string(), text: z.string().trim().min(4, "Say what should change, in a few words.").max(4000), via: z.enum(["typed", "voice"]).default("typed"), remake: z.boolean().default(false), keep: z.boolean().default(false) });
export interface LearnedLesson {
    id: string;
    rule: string;
    scope: "general" | "brand" | "product";
    isNew: boolean;
}
export async function feedbackAction(id: string, input: z.input<typeof Feedback>): Promise<Result<{
    learned: LearnedLesson[];
    summary: string;
    status: string;
    remaking: boolean;
}>> {
    try {
        const o = Feedback.parse(input);
        const run = await ownRun(id);
        const item = run.items.find((i) => i.id === o.itemId);
        if (!item)
            return { ok: false, error: "Image not found in this set." };
        if (o.remake) {
            if (busy(id))
                return { ok: false, error: "This set is already working. Wait for it to finish." };
            if (!item.plan)
                return { ok: false, error: "This image has no plan yet." };
            const u = mediaUsage();
            if (u.images + run.aspects.length > u.imageCap)
                return { ok: false, error: `The image cap is reached (${u.images} of ${u.imageCap} used). Raise the image cap in Settings to make it again.` };
        }
        const latest = currentOutputs(item.outputs)[0];
        const res = await recordFeedback({
            brandId: run.brand_id,
            refType: "studio",
            refId: run.id,
            itemId: item.id,
            asset: latest?.path ?? null,
            productId: run.product_id,
            text: o.text,
            via: o.via,
            action: o.remake ? "remake" : "note",
            about: `${KIND_INFO[run.kind].one}${item.plan ? `: "${item.plan.title}". What it was meant to show: ${item.plan.scene}` : ""}`,
        });
        if (o.remake)
            enqueue(run.brand_id, "studio", id, { op: "render", itemIds: [item.id], redo: true, force: true, feedback: o.text.slice(0, 800), ...(o.keep ? { keep: true } : {}) });
        revalidatePath("/lessons");
        return { ok: true, learned: res.lessons.map((x) => ({ id: x.lesson.id, rule: x.lesson.rule, scope: x.lesson.scope, isNew: x.isNew })), summary: res.feedback.summary, status: res.feedback.status, remaking: o.remake };
    }
    catch (e) {
        return fail(e instanceof z.ZodError ? new Error(e.issues[0]?.message ?? "Check the note.") : e);
    }
}
export async function reelAction(id: string): Promise<Result> {
    try {
        const run = await ownRun(id);
        if (busy(id))
            return { ok: false, error: "This set is working. Wait for it to finish." };
        const made = await makeReel(run);
        if (!made)
            return { ok: false, error: "A reel needs at least 2 finished pictures." };
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function removeItemAction(id: string, itemId: string): Promise<Result> {
    try {
        await ownRun(id);
        if (busy(id))
            return { ok: false, error: "This set is working. Wait for it to finish." };
        removeItem(id, itemId);
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function deleteSetAction(id: string): Promise<Result> {
    try {
        await ownRun(id);
        if (busy(id))
            return { ok: false, error: "This set is working. Wait for it to finish." };
        deleteRun(id);
        revalidatePath("/studio");
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function kindLabelAction(kind: LibraryKind) {
    return KIND_INFO[kind].label;
}
export async function acceptImageCheckAction(id: string, itemId: string, outputPath: string): Promise<Result<{
    run: StudioRunRow;
}>> {
    try {
        const run = await ownRun(id);
        if (busy(id))
            return { ok: false, error: "Wait for this set to finish before reviewing its images." };
        const output = run.items.find((i) => i.id === itemId)?.outputs.find((o) => o.path === outputPath);
        if (!output)
            return { ok: false, error: "Image not found in this set." };
        const override = humanCheckOverride(`image ${itemId}, ${output.aspect}, v${output.version}`, output.qa?.status === "fail" ? [{ check: "image_quality", status: "fail", message: output.qa.notes.join("; ") || "Image quality check failed" }] : []);
        if (!override)
            return { ok: false, error: "This image has no failed quality check." };
        output.check_override = override;
        run.log.push({ at: override.at, message: `Human accepted ${override.stage}: ${override.findings.map((a) => a.message).join("; ")}`, check_override: override });
        saveRun(run);
        revalidatePath(`/studio/${id}`);
        return { ok: true, run };
    }
    catch (e) {
        return fail(e);
    }
}
export async function chooseRenderAction(id: string, itemId: string, outputPath: string): Promise<Result<{
    run: StudioRunRow;
}>> {
    try {
        const run = await ownRun(id);
        if (busy(id))
            return { ok: false, error: "Wait for this set to finish before selecting a version." };
        const item = run.items.find((i) => i.id === itemId);
        if (!item)
            return { ok: false, error: "Image not found in this set." };
        if (!deliveryFile(path.join(env.DATA_DIR, "assets"), outputPath))
            return { ok: false, error: "That saved render is no longer available on disk." };
        item.outputs = selectOutput(item.outputs, z.string().max(500).parse(outputPath));
        delete run.context.reel_path;
        run.log.push({ at: new Date().toISOString(), message: `${item.label}: selected an existing render as current. No image was generated.` });
        saveRun(run);
        revalidatePath(`/studio/${id}`);
        return { ok: true, run };
    }
    catch (e) {
        return fail(e);
    }
}
export async function repairImageAction(id: string, itemId: string, input: {
    issue: VisualRepair;
    area: string;
    note: string;
}): Promise<Result> {
    try {
        const repair = z.object({ issue: z.enum(["waxy", "pores", "shine", "contact", "product", "custom"]), area: z.string().trim().min(1).max(80), note: z.string().max(300) }).parse(input);
        const run = await ownRun(id);
        const item = run.items.find((i) => i.id === itemId);
        if (!item?.outputs.length)
            return { ok: false, error: "Generate an image before repairing it." };
        const feedback = visualRepairPrompt(repair.issue, repair.area, repair.note);
        return renderSetAction(id, { itemIds: [itemId], feedback, redo: true, keep: true, force: true });
    }
    catch (e) {
        return fail(e);
    }
}
