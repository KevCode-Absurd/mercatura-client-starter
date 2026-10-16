"use server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { enqueue } from "@/lib/jobs/queue";
import { llmEnabled } from "@/lib/llm/gateway";
import { compactTaste, tasteSchema } from "@/lib/taste/schema";
import { HOOK_TYPES, MAX_HOOKS, MIN_HOOKS, makeHookClip, storedHooks, whyNoHooks, type HookSet } from "@/lib/references/hooks";
import { errorText } from "@/lib/plain-message";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const fail = (e: unknown): {
    ok: false;
    error: string;
} => ({ ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check what you asked for.") : errorText(e) });
export interface HooksState {
    set: HookSet | null;
    writing: boolean;
    failed: string;
    blocked: string;
}
function stateOf(referenceId: string): HooksState {
    const ref = db.select().from(schema.adReferences).where(eq(schema.adReferences.id, referenceId)).get();
    const jobs = db.select({ status: schema.jobs.status, error: schema.jobs.error, updated_at: schema.jobs.updated_at }).from(schema.jobs).where(and(eq(schema.jobs.kind, "reference_hooks"), eq(schema.jobs.ref_id, referenceId), inArray(schema.jobs.status, ["queued", "running", "failed"]))).all();
    return { set: storedHooks(referenceId), writing: jobs.some((j) => j.status !== "failed"), failed: jobs.filter((j) => j.status === "failed").sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]?.error ?? "", blocked: whyNoHooks(ref) };
}
export async function hooksStateAction(referenceId: string): Promise<Result<{
    state: HooksState;
}>> {
    try {
        return { ok: true, state: stateOf(z.string().min(1).max(64).parse(referenceId)) };
    }
    catch (e) {
        return fail(e);
    }
}
const Write = z.object({ referenceId: z.string().min(1).max(64), count: z.number().int().min(MIN_HOOKS).max(MAX_HOOKS), note: z.string().max(1200).optional(), taste: tasteSchema.optional() });
export async function writeHooksAction(input: z.input<typeof Write>): Promise<Result<{
    state: HooksState;
}>> {
    try {
        const p = Write.parse(input);
        if (!llmEnabled())
            throw new Error("Writing hooks needs live mode.");
        const blocked = stateOf(p.referenceId).blocked;
        if (blocked)
            throw new Error(blocked);
        enqueue(await activeBrandId(), "reference_hooks", p.referenceId, { count: p.count, note: p.note?.trim() ?? "", taste: compactTaste(p.taste) });
        return { ok: true, state: stateOf(p.referenceId) };
    }
    catch (e) {
        return fail(e);
    }
}
const Clip = z.object({ referenceId: z.string().min(1).max(64), hookId: z.string().min(1).max(20), type: z.enum(HOOK_TYPES) });
export async function makeHookClipAction(input: z.input<typeof Clip>): Promise<Result<{
    jobId: string;
    state: HooksState;
}>> {
    try {
        const p = Clip.parse(input);
        const made = makeHookClip(await activeBrandId(), p.referenceId, p.hookId, p.type);
        revalidatePath("/production");
        revalidatePath("/scripts");
        return { ok: true, jobId: made.jobId, state: stateOf(p.referenceId) };
    }
    catch (e) {
        return fail(e);
    }
}
