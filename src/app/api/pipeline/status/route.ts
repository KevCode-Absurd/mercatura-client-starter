import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { queueStats } from "@/lib/jobs/queue";
import { budgetStatus } from "@/lib/llm/gateway";
import { getSpend } from "@/lib/queries";
import { pastTime } from "@/lib/jobs/past-time-server";
export const dynamic = "force-dynamic";
export async function GET() {
    const brandId = await activeBrandId();
    const items = db
        .select({ id: schema.sourceItems.id, pre: schema.sourceItems.preprocess_status, ext: schema.sourceItems.extraction_status })
        .from(schema.sourceItems)
        .where(eq(schema.sourceItems.brand_id, brandId))
        .all();
    const jobs = db
        .select({ id: schema.jobs.id, ref: schema.jobs.ref_id, kind: schema.jobs.kind, status: schema.jobs.status, error: schema.jobs.error, updated_at: schema.jobs.updated_at })
        .from(schema.jobs)
        .where(eq(schema.jobs.brand_id, brandId))
        .all()
        .filter((j) => j.status === "queued" || j.status === "running" || j.status === "failed");
    const recentScripts = db
        .select({ id: schema.scripts.id, title: schema.scripts.title, concept_id: schema.scripts.concept_id })
        .from(schema.scripts)
        .where(eq(schema.scripts.brand_id, brandId))
        .orderBy(desc(schema.scripts.created_at))
        .limit(40)
        .all();
    return Response.json({ queue: queueStats(brandId), spend: getSpend(brandId), budget: budgetStatus(), items, jobs, recentScripts, times: { script: pastTime("script") } });
}
