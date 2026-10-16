"use server";
import { getAvatar } from "@/lib/avatars/store";
import { currentOutputs } from "@/lib/studio/outputs";
import { noteEdit } from "@/lib/hand-edits";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import type { SprintAngle, SprintAsset, SprintRow, SprintSlot, StaticAdCopy } from "@/db/schema";
import { SPRINT_FORMATS } from "@/lib/sprint/looks";
import { castPictures } from "@/lib/sprint/cast";
import { castPool } from "@/lib/sprint/cast";
import { mediaUrl, readCatalog } from "@/lib/avatar-studio/catalog";
import { FORMATS } from "@/lib/sprint/formats";
import { baseOf } from "@/lib/studio/overlay";
import { approveStaticCopy, saveStaticCopy, StaticCopySchema } from "@/lib/studio/static-copy";
import { activeBrandId } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { enqueue } from "@/lib/jobs/queue";
import { runLedger } from "@/lib/ledger";
import { adType } from "@/lib/library/taxonomy";
import { budgetStatus } from "@/lib/llm/gateway";
import { mediaLive, mediaUsage } from "@/lib/media/providers";
import { compactTaste, tasteSchema } from "@/lib/taste/schema";
import type { Taste } from "@/lib/taste/types";
import { COST, approveBriefs, approvePlan, createSprint, deleteSprint, editSlot, getSprint, sprintAds, sprintClaims, sprintRefs, swapRef } from "@/lib/sprint/engine";
import { errorText } from "@/lib/plain-message";
import { pastTime } from "@/lib/jobs/past-time-server";
import type { StepTime } from "@/lib/jobs/past-time";
import { humanCheckOverride } from "@/lib/check-review";
import { getRun, saveRun } from "@/lib/studio/engine";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const fail = (e: unknown): {
    ok: false;
    error: string;
} => ({ ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check the form.") : errorText(e) });
async function own(id: string): Promise<SprintRow> {
    const brandId = await activeBrandId();
    const s = getSprint(id);
    if (!s || s.brand_id !== brandId)
        throw new Error("Sprint not found");
    return s;
}
const busy = (s: SprintRow) => !!db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(eq(schema.jobs.kind, "sprint"), eq(schema.jobs.ref_id, s.id), inArray(schema.jobs.status, ["queued", "running"]))).get() ||
    (s.set_ids.length > 0 && !!db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(eq(schema.jobs.kind, "studio"), inArray(schema.jobs.ref_id, s.set_ids), inArray(schema.jobs.status, ["queued", "running"]))).get());
export interface AdView {
    slot: SprintSlot;
    portrait: string | null;
    setId: string | null;
    itemId: string | null;
    base: string | null;
    copy: StaticAdCopy | null;
    hasBrief: boolean;
    outputs: {
        aspect: string;
        path: string;
        base: string | null;
    }[];
    comments: {
        id: string;
        text: string;
        action: string;
    }[];
    headline: string;
    words: string[];
    primary: string;
    fails: string[];
    flags: string[];
    warns: string[];
    image: string | null;
    qa: {
        status: "pass" | "warn" | "fail";
        notes: string[];
    } | null;
    error: string | null;
}
export interface SprintView {
    sprint: Omit<SprintRow, "slots" | "assets" | "angles"> & {
        angles: SprintAngle[];
    };
    ads: AdView[];
    assets: SprintAsset[];
    refs: Record<string, {
        brand: string | null;
        label: string;
    }>;
    products: Record<string, string>;
    personas: Record<string, string>;
    busy: boolean;
    progress: {
        written: number;
        rendered: number;
        images: number;
        sets: {
            id: string;
            status: string;
        }[];
    };
    cost: {
        total: number;
        text: number;
        images: number;
        rendered: number;
    };
    estimate: {
        plan: number;
        briefs: number;
        render: number;
    };
    caps: {
        textLeft: number;
        imagesLeft: number;
    };
    lastError: string | null;
    copyErrors: string[];
    times?: {
        plan: StepTime;
        briefs: StepTime;
    };
}
export async function sprintStatusAction(id: string): Promise<Result<{
    view: SprintView;
}>> {
    try {
        const s = await own(id);
        const brand = loadBrandBrain(s.brand_id);
        const ads = sprintAds(s);
        const comments = s.set_ids.length ? db.select({ id: schema.feedback.id, text: schema.feedback.text, action: schema.feedback.action, ref_id: schema.feedback.ref_id, item_id: schema.feedback.item_id }).from(schema.feedback).where(and(eq(schema.feedback.brand_id, s.brand_id), eq(schema.feedback.ref_type, "studio"), inArray(schema.feedback.ref_id, s.set_ids))).all() : [];
        const refs = sprintRefs(s);
        const sets = s.set_ids.length ? db.select({ id: schema.studioRuns.id, status: schema.studioRuns.status }).from(schema.studioRuns).where(inArray(schema.studioRuns.id, s.set_ids)).all() : [];
        const l = runLedger(s.brand_id, "sprint", s.id);
        const b = budgetStatus();
        const u = mediaUsage();
        const failed = db.select({ error: schema.jobs.error, at: schema.jobs.updated_at }).from(schema.jobs).where(and(eq(schema.jobs.kind, "sprint"), eq(schema.jobs.ref_id, id), eq(schema.jobs.status, "failed"))).all().sort((a, b2) => b2.at.localeCompare(a.at))[0];
        const { slots: _slots, assets, ...rest } = s;
        void _slots;
        const view: SprintView = {
            sprint: rest,
            ads: ads.map((a) => ({ slot: a.slot, portrait: a.slot.avatar ? getAvatar(s.brand_id, a.slot.avatar)?.portrait ?? null : null, setId: a.setId, comments: comments.filter(c => c.ref_id === a.setId && c.item_id === a.item?.id).map(({ id, text, action }) => ({ id, text, action })), itemId: a.item?.id ?? null, base: a.item && a.output ? baseOf("ad", a.item, a.output) : null, copy: a.item?.copy_draft ?? null, hasBrief: !!a.item?.plan, outputs: [...new Set(a.item?.outputs.map(o => o.aspect) ?? [])].map(aspect => { const o = currentOutputs(a.item!.outputs).find(o => o.aspect === aspect)!; return { aspect, path: o.path, base: baseOf("ad", a.item!, o) }; }), headline: a.headline, words: (a.item?.plan?.text_elements ?? []).filter((t) => t.text !== a.headline).map((t) => t.text), primary: a.item?.plan?.ad_copy?.primary_text ?? "", fails: a.fails, flags: a.flags, warns: a.warns, image: a.output?.path ?? null, qa: a.output?.qa ?? null, error: a.item?.error ?? null })),
            assets,
            refs: Object.fromEntries([...refs.entries()].map(([k, r]) => [k, { brand: r.brand, label: adType(r.type)?.label ?? r.type }])),
            products: Object.fromEntries(brand.products.map((p) => [p.id, p.name])),
            personas: Object.fromEntries(brand.personas.map((p) => [p.id, p.name])),
            busy: busy(s),
            progress: { written: ads.filter((a) => a.item?.plan).length, rendered: ads.filter((a) => a.output).length, images: ads.reduce((n, a) => n + new Set(a.item?.outputs.map(o => o.aspect) ?? []).size, 0), sets },
            cost: { total: l.totalUsd, text: l.textUsd, images: l.imageUsd, rendered: l.images },
            estimate: { plan: COST.plan, briefs: Math.round(s.size * COST.brief * 100) / 100, render: Math.round(s.size * (s.options.aspects?.length ?? 1) * COST.image * 100) / 100 },
            caps: { textLeft: Math.max(0, b.cap - b.spent), imagesLeft: Math.max(0, u.imageCap - u.images) },
            lastError: s.error ?? (s.status === "failed" ? (failed?.error ?? null) : null),
            times: { plan: pastTime("sprint", "plan"), briefs: pastTime("sprint", "briefs") },
            copyErrors: s.set_ids.length ? db.select({ payload: schema.jobs.payload, error: schema.jobs.error }).from(schema.jobs).where(and(eq(schema.jobs.kind, "studio"), inArray(schema.jobs.ref_id, s.set_ids), eq(schema.jobs.status, "failed"))).all().filter((j) => j.payload.op === "copy" && j.error).map((j) => j.error!) : [],
        };
        return { ok: true, view };
    }
    catch (e) {
        return fail(e);
    }
}
const CastAges = z.tuple([z.number().int().min(18).max(90), z.number().int().min(18).max(90)]).refine(([youngest, oldest]) => youngest <= oldest, "The youngest age cannot be above the oldest.");
const CastChoice = z.object({ ages: CastAges.optional(), women: z.number().min(0).max(1).optional(), from: z.enum(["anywhere", "market"]).optional() });
const CastBriefSchema = CastChoice.extend({ people: z.array(z.string().max(100)).max(6, "Pick 6 people at most.").optional() });
export interface CastFace {
    id: string;
    thumb: string;
    gender: "Female" | "Male" | "Nonbinary";
    age: number;
}
const New = z.object({
    size: z.number().int().min(4, "A sprint is 4 ads or more.").max(100, "A sprint is 100 ads at most."),
    split: z.record(z.string(), z.number().int().min(0)),
    notes: z.string().max(2000).optional(),
    options: z.object({ structures: z.array(z.string()).min(1).max(30).optional(), aspects: z.array(z.enum(["4:5", "1:1", "9:16"])).min(1).max(3).optional(), formats: z.array(z.string()).min(1).max(100).optional(), textOnImage: z.boolean().default(false), feedCopy: z.boolean().optional(), cast: z.boolean().optional(), pictureQuality: z.enum(["medium", "high"]).optional(), castBrief: CastBriefSchema.optional(), claimChecks: z.boolean().optional(), auto: z.boolean().optional(), personas: z.array(z.string()).max(30).optional(), looks: z.record(z.string(), z.number().int().min(0)).optional(), taste: tasteSchema.optional() }).optional(),
});
export async function createSprintAction(input: z.input<typeof New>): Promise<Result<{
    id: string;
}>> {
    try {
        const n = New.parse(input);
        const brandId = await activeBrandId();
        const o = n.options ?? { textOnImage: false };
        if (o.auto && mediaLive()) {
            const u = mediaUsage();
            const images = n.size * new Set(o.aspects ?? ["4:5"]).size + ((o.cast ?? n.size >= 80) ? Math.max(castPictures(n.size), o.castBrief?.people?.length ?? 0) : 0);
            if (u.images + images > u.imageCap)
                return { ok: false, error: `Making ${n.size} ads in 1 go allows for up to ${images} images including character references, and ${Math.max(0, u.imageCap - u.images)} are left under the cap (${u.images} of ${u.imageCap} used). Raise the image cap in Settings, make fewer, or approve each step.` };
        }
        const id = createSprint({ brandId, size: n.size, split: n.split, notes: n.notes, options: { aspects: o.aspects, formats: o.formats ?? SPRINT_FORMATS.map(f => f.id), structures: o.structures ?? FORMATS.map(f => f.id), text_on_image: o.textOnImage, feed_copy: false, cast: o.cast, cast_brief: o.castBrief, picture_quality: o.pictureQuality, claim_checks: o.claimChecks, auto: o.auto, personas: o.personas, looks: o.looks, taste: compactTaste(o.taste as Taste | undefined) } });
        enqueue(brandId, "sprint", id, { op: "plan" });
        revalidatePath("/studio/sprint");
        return { ok: true, id };
    }
    catch (e) {
        return fail(e);
    }
}
export async function castChoicesAction(input: z.input<typeof CastChoice>): Promise<Result<{
    count: number;
    people: CastFace[];
}>> {
    try {
        const b = CastChoice.parse(input);
        const market = loadBrandBrain(await activeBrandId()).brand.market;
        const fit = castPool(readCatalog().avatars, b, market).pool.filter((a) => (b.women === 1 ? a.tags!.gender === "Female" : b.women === 0 ? a.tags!.gender === "Male" : true));
        const share = b.women ?? 0.5;
        const byAge = (g: string) => fit.filter((a) => a.tags!.gender === g).sort((x, y) => x.tags!.age - y.tags!.age || x.id.localeCompare(y.id));
        const women = byAge("Female");
        const men = byAge("Male");
        const w = Math.min(women.length, Math.max(Math.round(60 * share), 60 - men.length));
        const m = Math.min(men.length, 60 - w);
        const shown = share >= 0.5 ? [...women.slice(0, w), ...men.slice(0, m)] : [...men.slice(0, m), ...women.slice(0, w)];
        const people = [...shown, ...byAge("Nonbinary").slice(0, 60 - shown.length)].map((a) => ({ id: a.id, thumb: mediaUrl(a.thumbnail), gender: a.tags!.gender, age: a.tags!.age }));
        return { ok: true, count: fit.length, people };
    }
    catch (e) {
        return fail(e);
    }
}
export async function replanSprintAction(id: string, notes: string): Promise<Result> {
    try {
        const s = await own(id);
        if (busy(s))
            return { ok: false, error: "This sprint is already working. Wait for it to finish." };
        if (s.set_ids.length)
            return { ok: false, error: "The briefs are already written. Start a new sprint to plan again." };
        enqueue(s.brand_id, "sprint", id, { op: "plan", notes: notes.slice(0, 2000) });
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
const Edit = z.object({ angle: z.string().optional(), persona: z.string().optional(), awareness: z.string().optional(), hook: z.string().optional(), idea: z.string().max(600).optional() });
export async function editSlotAction(id: string, n: number, patch: z.input<typeof Edit>): Promise<Result> {
    try {
        const was = await own(id);
        editSlot(id, n, Edit.parse(patch));
        noteEdit(was.brand_id, id, "sprint_idea", was.slots.find((x) => x.n === n)?.idea, patch.idea ?? was.slots.find((x) => x.n === n)?.idea, n);
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function swapRefAction(id: string, n: number): Promise<Result> {
    try {
        await own(id);
        await swapRef(id, n);
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function enableSprintChecksAction(id: string): Promise<Result> {
    try {
        const s = await own(id);
        if (busy(s))
            return { ok: false, error: "Wait for this sprint to finish before running checks." };
        db.update(schema.sprints).set({ options: { ...s.options, claim_checks: true }, updated_at: new Date().toISOString() }).where(eq(schema.sprints.id, id)).run();
        for (const setId of s.set_ids)
            enqueue(s.brand_id, "studio", setId, { op: "claims" });
        revalidatePath(`/studio/sprint/${id}`);
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function approvePlanAction(id: string): Promise<Result> {
    try {
        const s = await own(id);
        if (busy(s))
            return { ok: false, error: "This sprint is already working. Wait for it to finish." };
        approvePlan(id);
        enqueue(s.brand_id, "sprint", id, { op: "briefs" });
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function approveBriefsAction(id: string, force = false): Promise<Result> {
    try {
        const s = await own(id);
        if (busy(s))
            return { ok: false, error: "This sprint is already working. Wait for it to finish." };
        const todo = sprintAds(s).filter(a => a.item?.plan && (force || !a.fails.length)).reduce((n, a) => n + (s.options.aspects ?? ["4:5"]).filter(aspect => !a.item?.outputs.some(o => o.aspect === aspect)).length, 0);
        if (!todo)
            return { ok: false, error: "There is nothing to render: every ad either has an image or has a failed check on its brief." };
        const u = mediaUsage();
        if (u.images + todo > u.imageCap)
            return { ok: false, error: `This needs ${todo} images and ${Math.max(0, u.imageCap - u.images)} are left under the cap (${u.images} of ${u.imageCap} used). Raise the image cap in Settings.` };
        const accepted = sprintAds(s).filter((a) => a.item?.plan && (force || !a.fails.length));
        for (const setId of s.set_ids) {
            const run = getRun(setId);
            if (!run)
                continue;
            const acceptedIds = new Set(accepted.filter((a) => a.setId === setId).map((a) => a.item?.id));
            const override = humanCheckOverride("sprint briefs", run.audit.filter((a) => a.line_index == null || acceptedIds.has(run.items[a.line_index]?.id)));
            if (override) {
                run.log.push({ at: override.at, message: `Human override: ${override.findings.map((a) => a.message).join("; ")}`, check_override: override });
                saveRun(run);
                s.approved.check_overrides = [...(s.approved.check_overrides ?? []), override];
            }
        }
        db.update(schema.sprints).set({ approved: s.approved }).where(eq(schema.sprints.id, id)).run();
        approveBriefs(id);
        enqueue(s.brand_id, "sprint", id, { op: "render", ...(force ? { force: true } : {}) });
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function resumeSprintAction(id: string): Promise<Result> {
    try {
        const s = await own(id);
        if (busy(s))
            return { ok: false, error: "This sprint is already working." };
        if (s.status !== "failed")
            return { ok: false, error: "This sprint has not stopped." };
        if (s.stage === "render")
            approveBriefs(id);
        enqueue(s.brand_id, "sprint", id, { op: s.stage });
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function deleteSprintAction(id: string): Promise<Result> {
    try {
        const s = await own(id);
        if (busy(s))
            return { ok: false, error: "This sprint is working. Wait for it to finish." };
        deleteSprint(id);
        revalidatePath("/studio/sprint");
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function generateSprintCopyAction(id: string, slot?: number): Promise<Result> {
    try {
        const s = await own(id);
        if (busy(s))
            throw new Error("Wait for the current work to finish.");
        if (slot !== undefined)
            z.number().int().positive().parse(slot);
        const ads = sprintAds(s).filter((a) => a.output && a.item?.plan && (slot === undefined ? !a.item.copy_draft : a.slot.n === slot));
        if (!ads.length)
            throw new Error("No ads need copy. Open an ad to edit or generate a new draft.");
        const groups = new Map<string, string[]>();
        for (const a of ads)
            if (a.setId && a.item)
                groups.set(a.setId, [...(groups.get(a.setId) ?? []), a.item.id]);
        for (const [setId, itemIds] of groups)
            enqueue(s.brand_id, "studio", setId, { op: "copy", itemIds, redo: slot !== undefined });
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function saveSprintCopyAction(id: string, slot: number, input: z.input<typeof StaticCopySchema>, approve: boolean): Promise<Result> {
    try {
        const s = await own(id);
        if (busy(s))
            throw new Error("Wait for the current work to finish before saving copy.");
        const a = sprintAds(s).find((a) => a.slot.n === slot);
        if (!a?.setId || !a.item)
            throw new Error("Ad not found.");
        try {
            if (z.boolean().parse(approve))
                await approveStaticCopy(a.setId, a.item.id, input);
            else
                saveStaticCopy(a.setId, a.item.id, input);
        }
        finally {
            revalidatePath(`/studio/sprint/${id}`);
            revalidatePath(`/studio/${a.setId}`);
        }
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
