import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { enqueue } from "../jobs/queue";
import { requestStop, resumeJob } from "../llm/run-control";
import { plainMessage } from "../plain-message";
import { creatorResearchConnection } from "./provider";
import { createDiscovery, getDiscovery, listDiscovery } from "./store";
import { DiscoveryInput, type DiscoveryOptions, type DiscoveryRun } from "./types";
const jobsFor = (brandId: string) => and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, "creator_discovery"));
export function discoveryRuns(brandId: string): DiscoveryRun[] {
    return listDiscovery(brandId).map(run => {
        const job = db.select().from(schema.jobs).where(and(jobsFor(brandId), eq(schema.jobs.ref_id, run.id))).orderBy(desc(schema.jobs.created_at)).get();
        if (job && ["queued", "running", "paused", "stopped", "failed"].includes(job.status)) {
            return { ...run, status: job.status as DiscoveryRun["status"], progress: job.error ? plainMessage(job.error) : run.progress };
        }
        return run;
    });
}
export function startDiscovery(brandId: string, input: DiscoveryOptions): string {
    const options = DiscoveryInput.parse(input);
    const connection = creatorResearchConnection().models.find(m => m.id === options.model && m.available);
    if (!connection)
        throw new Error("Creator web research is not connected. Connect a search provider in Settings to generate a shortlist.");
    const busy = db.select().from(schema.jobs).where(and(jobsFor(brandId), inArray(schema.jobs.status, ["queued", "running"]))).get();
    if (busy)
        throw new Error("A creator search is already running for this brand. Pause or stop it before starting another.");
    const run = createDiscovery(brandId, options);
    enqueue(brandId, "creator_discovery", run.id);
    return run.id;
}
export function controlDiscovery(brandId: string, id: string, op: "pause" | "stop" | "resume"): void {
    const run = getDiscovery(brandId, id);
    const job = db.select().from(schema.jobs).where(and(jobsFor(brandId), eq(schema.jobs.ref_id, id))).orderBy(desc(schema.jobs.created_at)).get();
    if (!job)
        throw new Error("The research job was not found.");
    if (op === "resume") {
        if (run.status === "complete" || !["paused", "failed"].includes(job.status))
            throw new Error("Only paused or failed searches can be resumed.");
        const busy = db.select().from(schema.jobs).where(and(jobsFor(brandId), inArray(schema.jobs.status, ["queued", "running"]))).get();
        if (busy)
            throw new Error("Wait for this brand's active creator search to finish.");
        if (!creatorResearchConnection().models.some(m => m.id === run.options.model && m.available))
            throw new Error("Connect the search provider before resuming.");
        resumeJob(job.id);
    }
    else if (!requestStop(job.id, op))
        throw new Error("This search has already finished.");
}
