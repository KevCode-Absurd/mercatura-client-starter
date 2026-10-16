import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { NO_TIME, pastSeconds, type StepTime } from "./past-time";
const KEEP_MS = 30000;
const kept = new Map<string, {
    at: number;
    time: StepTime;
}>();
const when = (iso: string) => new Date(/Z$|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso.replace(" ", "T")}Z`).getTime();
export function pastTime(kind: string, op?: string | null, limit = 8): StepTime {
    const key = `${kind}:${op ?? "*"}:${limit}`;
    const had = kept.get(key);
    const now = Date.now();
    if (had && now - had.at < KEEP_MS)
        return had.time;
    let time = NO_TIME;
    try {
        const runs = db
            .select({ payload: schema.jobs.payload, from: schema.jobs.created_at, to: schema.jobs.updated_at })
            .from(schema.jobs)
            .where(and(eq(schema.jobs.kind, kind), eq(schema.jobs.status, "done")))
            .orderBy(desc(schema.jobs.created_at))
            .limit(200)
            .all()
            .filter((j) => op == null || (j.payload as {
            op?: string;
        }).op === op)
            .slice(0, limit)
            .map((j) => (when(j.to) - when(j.from)) / 1000);
        time = pastSeconds(runs);
    }
    catch {
    }
    kept.set(key, { at: now, time });
    return time;
}
