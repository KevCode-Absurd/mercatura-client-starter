import { AsyncLocalStorage } from "node:async_hooks";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
export type StopMode = "pause" | "stop";
export class RunStoppedError extends Error {
    constructor(public mode: StopMode) {
        super(mode === "pause" ? "Paused by you. Resume picks up where it stopped; what was finished is kept." : "Stopped by you. Nothing more is spent; what was finished is kept.");
        this.name = "RunStoppedError";
    }
}
interface Ctx {
    jobId: string;
    signal: AbortSignal;
    leaseToken?: string;
}
interface Live {
    ac: AbortController;
    mode?: StopMode;
}
const g = globalThis as unknown as {
    __ceRunCtx?: AsyncLocalStorage<Ctx>;
    __ceRunLive?: Map<string, Live>;
};
const als = (g.__ceRunCtx ??= new AsyncLocalStorage<Ctx>());
const live = (g.__ceRunLive ??= new Map<string, Live>());
export const currentJobId = () => als.getStore()?.jobId;
export const currentJobSignal = () => als.getStore()?.signal;
export async function withJob<T>(jobId: string, fn: () => Promise<T>, leaseToken?: string): Promise<T> {
    const entry: Live = { ac: new AbortController() };
    live.set(jobId, entry);
    try {
        return await als.run({ jobId, signal: entry.ac.signal, leaseToken }, fn);
    }
    finally {
        live.delete(jobId);
    }
}
const flagOf = (jobId: string): StopMode | null => live.get(jobId)?.mode ?? (db.select({ c: schema.jobs.control }).from(schema.jobs).where(eq(schema.jobs.id, jobId)).get()?.c as StopMode | null | undefined) ?? null;
export function stopAsked(): StopMode | null {
    const ctx = als.getStore();
    return ctx ? flagOf(ctx.jobId) : null;
}
export function checkpoint(): void {
    const ctx = als.getStore();
    if (ctx?.leaseToken && !db.$client.prepare("SELECT job FROM ops_leases WHERE job=? AND token=? AND expires>?").get(ctx.jobId, ctx.leaseToken, Date.now()))
        throw new Error("The worker lease expired or changed. No further paid calls are permitted from this worker.");
    const mode = stopAsked();
    if (mode)
        throw new RunStoppedError(mode);
}
export function callSignal(timeoutMs: number): AbortSignal {
    const ctx = als.getStore();
    return ctx ? AbortSignal.any([AbortSignal.timeout(timeoutMs), ctx.signal]) : AbortSignal.timeout(timeoutMs);
}
export function asStop(e: unknown): unknown {
    const mode = stopAsked();
    return mode ? new RunStoppedError(mode) : e;
}
export function requestStop(jobId: string, mode: StopMode): boolean {
    const job = db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId)).get();
    if (!job)
        return false;
    const now = new Date().toISOString();
    if (job.status === "queued" || (job.status === "paused" && mode === "stop")) {
        db.update(schema.jobs).set({ status: mode === "pause" ? "paused" : "stopped", control: null, error: new RunStoppedError(mode).message, updated_at: now }).where(eq(schema.jobs.id, jobId)).run();
        return true;
    }
    if (job.status !== "running")
        return false;
    db.update(schema.jobs).set({ control: mode, updated_at: now }).where(eq(schema.jobs.id, jobId)).run();
    const entry = live.get(jobId);
    if (entry) {
        entry.mode = mode;
        entry.ac.abort();
    }
    else {
        db.update(schema.jobs).set({ status: mode === "pause" ? "paused" : "stopped", control: null, error: new RunStoppedError(mode).message, updated_at: now }).where(eq(schema.jobs.id, jobId)).run();
    }
    return true;
}
export function resumeJob(jobId: string): boolean {
    const res = db.update(schema.jobs).set({ status: "queued", control: null, error: null, updated_at: new Date().toISOString() }).where(eq(schema.jobs.id, jobId)).run();
    return res.changes > 0;
}
