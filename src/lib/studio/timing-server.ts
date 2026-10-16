import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { StudioRunRow } from "@/db/schema";
import { FIRST_GUESS, expectSeconds, type PastWork } from "./timing";
export interface SetWork {
    op: "plan" | "render" | "other";
    queued: boolean;
    startedAt: string;
    images: number;
    itemIds: string[];
    expect: number;
    basis: number;
}
type Payload = {
    op?: string;
    itemIds?: string[];
};
const opOf = (p: Payload): SetWork["op"] => (p.op === "render" ? "render" : !p.op || p.op === "plan" ? "plan" : "other");
const covered = (run: Pick<StudioRunRow, "items" | "aspects">, p: Payload, op: SetWork["op"]) => (p.itemIds?.length ?? run.items.length) * (op === "render" ? Math.max(1, run.aspects.length) : 1);
export function pastWork(kind: StudioRunRow["kind"], op: "plan" | "render", limit = 8): PastWork[] {
    const jobs = db
        .select({ ref: schema.jobs.ref_id, payload: schema.jobs.payload, from: schema.jobs.created_at, to: schema.jobs.updated_at })
        .from(schema.jobs)
        .where(and(eq(schema.jobs.kind, "studio"), eq(schema.jobs.status, "done")))
        .orderBy(desc(schema.jobs.created_at))
        .limit(200)
        .all()
        .filter((j) => j.ref && opOf(j.payload as Payload) === op);
    const ids = [...new Set(jobs.map((j) => j.ref!))];
    if (!ids.length)
        return [];
    const runs = new Map(db.select({ id: schema.studioRuns.id, kind: schema.studioRuns.kind, items: schema.studioRuns.items, aspects: schema.studioRuns.aspects }).from(schema.studioRuns).where(inArray(schema.studioRuns.id, ids)).all().map((r) => [r.id, r] as const));
    const out: PastWork[] = [];
    for (const j of jobs) {
        const run = runs.get(j.ref!);
        if (!run || run.kind !== kind)
            continue;
        out.push({ n: covered(run, j.payload as Payload, op), seconds: (new Date(j.to).getTime() - new Date(j.from).getTime()) / 1000 });
        if (out.length >= limit)
            break;
    }
    return out;
}
export function workOf(run: StudioRunRow): SetWork | null {
    const job = db
        .select({ payload: schema.jobs.payload, at: schema.jobs.created_at, status: schema.jobs.status })
        .from(schema.jobs)
        .where(and(eq(schema.jobs.kind, "studio"), eq(schema.jobs.ref_id, run.id), inArray(schema.jobs.status, ["queued", "running"])))
        .get();
    if (!job)
        return null;
    const p = job.payload as Payload;
    const op = opOf(p);
    const images = covered(run, p, op);
    const itemIds = p.itemIds ?? run.items.map((i) => i.id);
    const queued = job.status === "queued";
    if (op === "other")
        return { op, queued, startedAt: job.at, images, itemIds, expect: 0, basis: 0 };
    const { seconds, basis } = expectSeconds(pastWork(run.kind, op), images, FIRST_GUESS[op]);
    return { op, queued, startedAt: job.at, images, itemIds, expect: seconds, basis };
}
