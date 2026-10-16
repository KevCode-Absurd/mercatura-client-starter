"use server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { acceptFinalChecks } from "@/lib/check-review";
import { handMove } from "@/lib/production/board";
import { JOB_STATUSES, JOB_STATUS_LABELS } from "@/lib/taxonomy";
const To = z.enum(JOB_STATUSES);
export async function moveJobAction(id: string, to: string): Promise<{
    ok: true;
    label: string;
} | {
    ok: false;
    error: string;
}> {
    const target = To.safeParse(to);
    if (!target.success)
        return { ok: false, error: "That is not a column of the board." };
    const brandId = await activeBrandId();
    const job = db.select().from(schema.outputJobs).where(and(eq(schema.outputJobs.id, id), eq(schema.outputJobs.brand_id, brandId))).get();
    if (!job)
        return { ok: false, error: "Job not found" };
    const busy = !!db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(eq(schema.jobs.kind, "production"), eq(schema.jobs.ref_id, id), inArray(schema.jobs.status, ["queued", "running"]))).get();
    const verdict = handMove(job, target.data, busy);
    if (!verdict.ok)
        return { ok: false, error: verdict.why };
    if (verdict.run)
        return { ok: false, error: "Confirm the run on the board to start this step." };
    const reviewed = target.data === "approved" ? acceptFinalChecks(job) : {};
    db.update(schema.outputJobs).set({ status: target.data, ...reviewed, updated_at: new Date().toISOString() }).where(eq(schema.outputJobs.id, id)).run();
    revalidatePath("/production");
    revalidatePath("/");
    return { ok: true, label: JOB_STATUS_LABELS[target.data] };
}
