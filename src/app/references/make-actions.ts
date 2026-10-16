"use server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { enqueue } from "@/lib/jobs/queue";
import { llmEnabled } from "@/lib/llm/gateway";
import { errorText } from "@/lib/plain-message";
import { makeFromReference } from "@/lib/references/make";
import { readReference, storedFormats, storedReading, whyNoReading } from "@/lib/references/reading";
import { CLOSENESS, MAX_STATICS, MAX_VIDEOS, type MadeFromReference, type RefFormats, type RefReading } from "@/lib/references/reading-types";
import { LENGTH_PRESETS } from "@/lib/taxonomy";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const fail = (e: unknown): {
    ok: false;
    error: string;
} => ({ ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check what you chose.") : errorText(e) });
const Id = z.string().min(1).max(64);
export interface ReadingState {
    reading: RefReading | null;
    formats: RefFormats | null;
    working: boolean;
    failed: string;
    blocked: string;
}
async function stateOf(referenceId: string): Promise<ReadingState> {
    const brandId = await activeBrandId();
    const ref = db.select().from(schema.adReferences).where(eq(schema.adReferences.id, referenceId)).get();
    const jobs = db.select({ status: schema.jobs.status, error: schema.jobs.error, updated_at: schema.jobs.updated_at }).from(schema.jobs).where(and(eq(schema.jobs.kind, "reference_read"), eq(schema.jobs.ref_id, referenceId), eq(schema.jobs.brand_id, brandId), inArray(schema.jobs.status, ["queued", "running", "failed"]))).all();
    const formats = storedFormats(ref, brandId);
    const failed = formats ? "" : (jobs.filter((j) => j.status === "failed").sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]?.error ?? "");
    return { reading: storedReading(ref), formats, working: jobs.some((j) => j.status !== "failed"), failed, blocked: whyNoReading(ref) };
}
export async function readingStateAction(referenceId: string): Promise<Result<{
    state: ReadingState;
}>> {
    try {
        return { ok: true, state: await stateOf(Id.parse(referenceId)) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function readReferenceAction(referenceId: string): Promise<Result<{
    state: ReadingState;
}>> {
    try {
        const id = Id.parse(referenceId);
        const now = await stateOf(id);
        if (now.blocked)
            throw new Error(now.blocked);
        if (now.working || (now.formats && (now.reading || !llmEnabled())))
            return { ok: true, state: now };
        const brandId = await activeBrandId();
        if (llmEnabled())
            enqueue(brandId, "reference_read", id, {});
        else
            await readReference(brandId, id);
        return { ok: true, state: await stateOf(id) };
    }
    catch (e) {
        return fail(e);
    }
}
const Make = z.object({
    referenceId: Id,
    closeness: z.enum(CLOSENESS),
    productId: z.string().min(1, "Choose what the ad is about.").max(80),
    personaId: z.string().max(80),
    offerId: z.string().max(80),
    stage: z.string().max(40),
    note: z.string().max(600),
    statics: z.object({ formatId: z.string().min(1).max(60), count: z.number().int().min(1).max(MAX_STATICS), sizes: z.array(z.string().max(8)).min(1, "Pick at least 1 size for the static ad.").max(3), productInPicture: z.enum(["auto", "none", "background", "shown"]).optional() }).optional(),
    videos: z.object({ formatId: z.string().min(1).max(60), count: z.number().int().min(1).max(MAX_VIDEOS), size: z.string().max(8), length: z.enum(LENGTH_PRESETS).optional(), hooks: z.number().int().min(1).max(5).optional(), keepWords: z.boolean().optional() }).optional(),
    claimChecks: z.boolean().optional(),
});
export async function makeFromReferenceFlowAction(input: z.input<typeof Make>): Promise<Result<MadeFromReference>> {
    try {
        const made = makeFromReference(await activeBrandId(), Make.parse(input));
        revalidatePath("/studio");
        revalidatePath("/scripts");
        revalidatePath("/production");
        return { ok: true, ...made };
    }
    catch (e) {
        return fail(e);
    }
}
