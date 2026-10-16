import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { acquireJobLease, releaseJobLease, deferJob } from "../production-ops/leases";
import { opsDb } from "../production-ops/store";
import { startSpan, endSpan } from "../production-ops/metrics";
const queueOwner = `${process.pid}:${randomUUID()}`;
export type JobKind = "preprocess" | "extract" | "cluster" | "script" | "analyze_reference" | "production" | "studio" | "sprint" | "personas" | "offers" | "chat" | "landing" | "site_scan" | "reference_hooks" | "reference_read" | "avatar_studio" | "avatar_pack" | "avatar_pack_frame" | "creator_discovery" | "seo_batch" | "campaign";
export function enqueue(brandId: string, kind: JobKind, refId: string, payload: Record<string, unknown> = {}): string {
    if (kind === "avatar_pack" || kind === "avatar_pack_frame")
        throw new Error("Use the avatar pack request or explicit frame correction to create this job.");
    return opsDb().transaction(() => {
        const existing = kind === "script" ? undefined : db
            .select({ id: schema.jobs.id })
            .from(schema.jobs)
            .where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, kind), eq(schema.jobs.ref_id, refId), inArray(schema.jobs.status, ["queued", "running"])))
            .get();
        if (existing) {
            if (kind === "cluster" && payload.mode === "full") {
                db.update(schema.jobs).set({ payload }).where(and(eq(schema.jobs.id, existing.id), eq(schema.jobs.status, "queued"))).run();
            }
            return existing.id;
        }
        if (kind !== "script")
            db.delete(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, kind), eq(schema.jobs.ref_id, refId), inArray(schema.jobs.status, ["paused", "stopped"]))).run();
        const id = randomUUID();
        db.insert(schema.jobs).values({ id, brand_id: brandId, kind, ref_id: refId, status: "queued", payload }).run();
        startSpan(brandId, id, "queue");
        return id;
    }).immediate();
}
export function deferClaimedJob(id: string, provider: string, retryAt: number, error: string, leaseToken: string): boolean {
    const client = opsDb();
    return client.transaction(() => {
        if (!client.prepare("SELECT job FROM ops_leases WHERE job=? AND token=? AND expires>?").get(id, leaseToken, Date.now()))
            return false;
        const changed = db.update(schema.jobs).set({ status: "queued", error, updated_at: new Date().toISOString() }).where(and(eq(schema.jobs.id, id), eq(schema.jobs.status, "running"))).run();
        if (!changed.changes)
            return false;
        deferJob(id, provider, retryAt);
        releaseJobLease(id, leaseToken);
        return true;
    }).immediate();
}
export function claimNext(owner = queueOwner): (typeof schema.jobs.$inferSelect & {
    leaseToken: string;
}) | undefined {
    const client = opsDb();
    return client.transaction(() => {
        const next = client.prepare(`SELECT jobs.id FROM jobs LEFT JOIN ops_schedule s ON s.job=jobs.id LEFT JOIN ops_leases l ON l.job=jobs.id WHERE jobs.status='queued' AND coalesce(s.retry_at,0)<=? AND coalesce(l.expires,0)<=? ORDER BY CASE WHEN jobs.created_at < ? THEN 0 WHEN json_extract(jobs.payload,'$.priority')='interactive' OR jobs.kind='chat' THEN 1 ELSE 2 END,jobs.created_at,jobs.id LIMIT 1`).get(Date.now(), Date.now(), new Date(Date.now() - 30000).toISOString()) as {
            id: string;
        } | undefined;
        if (!next)
            return;
        const token = acquireJobLease(next.id, owner);
        if (!token)
            return;
        const job = db
            .update(schema.jobs)
            .set({ status: "running", updated_at: new Date().toISOString() })
            .where(and(eq(schema.jobs.id, next.id), eq(schema.jobs.status, "queued")))
            .returning()
            .get();
        if (!job) {
            releaseJobLease(next.id, token);
            return;
        }
        const pending = client.prepare("SELECT id FROM ops_spans WHERE operation=? AND stage='queue' AND ended IS NULL").all(job.id) as {
            id: string;
        }[];
        for (const span of pending)
            endSpan(span.id, "passed");
        return { ...job, leaseToken: token };
    }).immediate();
}
export function finishJob(id: string, status: "done" | "failed" | "paused" | "stopped", error: string | null = null, leaseToken?: string) {
    return opsDb().transaction(() => {
        if (leaseToken && !opsDb().prepare("SELECT job FROM ops_leases WHERE job=? AND token=? AND expires>?").get(id, leaseToken, Date.now()))
            return;
        db.update(schema.jobs)
            .set({ status, error, control: null, progress: status === "done" ? 1 : 0, updated_at: new Date().toISOString() })
            .where(eq(schema.jobs.id, id))
            .run();
        if (leaseToken)
            releaseJobLease(id, leaseToken);
    }).immediate();
}
export function clearFailed(kind: string, refId: string) {
    if (kind === "avatar_pack" || kind === "avatar_pack_frame")
        return;
    db.delete(schema.jobs).where(and(eq(schema.jobs.kind, kind), eq(schema.jobs.ref_id, refId), eq(schema.jobs.status, "failed"))).run();
}
export function failQueued(reason: string) {
    db.update(schema.jobs).set({ status: "failed", error: reason, updated_at: new Date().toISOString() }).where(eq(schema.jobs.status, "queued")).run();
}
export function queueStats(brandId: string) {
    const rows = db
        .select({ kind: schema.jobs.kind, status: schema.jobs.status, n: sql<number> `count(*)` })
        .from(schema.jobs)
        .where(eq(schema.jobs.brand_id, brandId))
        .groupBy(schema.jobs.kind, schema.jobs.status)
        .all();
    const get = (kind: string, status: string) => rows.find((r) => r.kind === kind && r.status === status)?.n ?? 0;
    return {
        preprocess: { queued: get("preprocess", "queued"), running: get("preprocess", "running"), done: get("preprocess", "done"), failed: get("preprocess", "failed") },
        extract: { queued: get("extract", "queued"), running: get("extract", "running"), done: get("extract", "done"), failed: get("extract", "failed") },
        cluster: { queued: get("cluster", "queued"), running: get("cluster", "running"), done: get("cluster", "done"), failed: get("cluster", "failed") },
        script: { queued: get("script", "queued"), running: get("script", "running"), done: get("script", "done"), failed: get("script", "failed") },
        production: { queued: get("production", "queued"), running: get("production", "running"), done: get("production", "done"), failed: get("production", "failed") },
        analyze_reference: { queued: get("analyze_reference", "queued"), running: get("analyze_reference", "running"), done: get("analyze_reference", "done"), failed: get("analyze_reference", "failed") },
    };
}
export function itemsPending(brandId: string): boolean {
    return !!db
        .select({ id: schema.jobs.id })
        .from(schema.jobs)
        .where(and(eq(schema.jobs.brand_id, brandId), inArray(schema.jobs.kind, ["preprocess", "extract"]), inArray(schema.jobs.status, ["queued", "running"])))
        .get();
}
