import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { COLUMN_LABELS } from "./board";
import { discardedFrom, handMove, homeColumn, rememberedStatus } from "./board-discard";
export type Moved = {
    ok: true;
    label: string;
} | {
    ok: false;
    error: string;
};
const find = (brandId: string, id: string) => db.select().from(schema.outputJobs).where(and(eq(schema.outputJobs.id, id), eq(schema.outputJobs.brand_id, brandId))).get();
const busy = (id: string) => !!db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(eq(schema.jobs.kind, "production"), eq(schema.jobs.ref_id, id), inArray(schema.jobs.status, ["queued", "running"]))).get();
export function discardJob(brandId: string, id: string): Moved {
    const job = find(brandId, id);
    if (!job)
        return { ok: false, error: "Job not found" };
    const verdict = handMove(job, "discarded", busy(id));
    if (!verdict.ok)
        return { ok: false, error: verdict.why };
    db.update(schema.outputJobs)
        .set({ status: "discarded", payload: { ...job.payload, discarded_from: rememberedStatus(job) }, updated_at: new Date().toISOString() })
        .where(eq(schema.outputJobs.id, id))
        .run();
    return { ok: true, label: COLUMN_LABELS.discarded };
}
export function putBackJob(brandId: string, id: string): Moved {
    const job = find(brandId, id);
    if (!job)
        return { ok: false, error: "Job not found" };
    if (job.status !== "discarded")
        return { ok: false, error: "This job is not in Discarded." };
    const home = homeColumn(job);
    const verdict = handMove(job, home, busy(id));
    if (!verdict.ok)
        return { ok: false, error: verdict.why };
    const payload = { ...job.payload };
    delete payload.discarded_from;
    db.update(schema.outputJobs).set({ status: discardedFrom(job), payload, updated_at: new Date().toISOString() }).where(eq(schema.outputJobs.id, id)).run();
    return { ok: true, label: COLUMN_LABELS[home] };
}
