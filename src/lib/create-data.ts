import "server-only";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { StudioOutput, LibraryKind } from "@/db/schema";
export function createScreenData(brandId: string, opts: {
    kind?: LibraryKind;
    all?: boolean;
} = {}) {
    const r = schema.studioRuns;
    const belongs = and(eq(r.brand_id, brandId), sql `coalesce(json_extract(${r.context}, '$.sprint'), '') = ''`);
    const counts = db.select({ kind: r.kind, n: sql<number> `count(*)` }).from(r).where(belongs).groupBy(r.kind).all();
    const total = counts.reduce((n, row) => n + row.n, 0);
    const ofKind = opts.kind ? counts.find((row) => row.kind === opts.kind)?.n ?? 0 : total;
    const runs = db.select({
        id: r.id, title: r.title, kind: r.kind, status: r.status,
        itemCount: sql<number> `json_array_length(${r.items})`,
        items: sql<{
            outputs: StudioOutput[];
        }[]> `coalesce((select json_group_array(json_object('outputs', json(outputs))) from (select json_extract(value, '$.outputs') as outputs from json_each(${r.items}) where json_array_length(json_extract(value, '$.outputs')) > 0 limit 4)), '[]')`.mapWith((value: string) => JSON.parse(value) as {
            outputs: StudioOutput[];
        }[]),
    }).from(r).where(opts.kind ? and(belongs, eq(r.kind, opts.kind)) : belongs).orderBy(desc(r.created_at)).limit(opts.all ? Math.max(1, ofKind) : 12).all();
    const s = schema.sprints;
    const sprints = db.select({ id: s.id, title: s.title, size: s.size, status: s.status }).from(s).where(eq(s.brand_id, brandId)).orderBy(desc(s.created_at)).all();
    const j = schema.outputJobs;
    const jobsWhere = and(eq(j.brand_id, brandId), ne(j.status, "discarded"));
    const jobCount = db.select({ n: sql<number> `count(*)` }).from(j).where(jobsWhere).get()!.n;
    const jobs = db.select({
        id: j.id, script_id: j.script_id, output_type: j.output_type, status: j.status,
        title: schema.scripts.title,
        assets: j.assets,
        next: sql<string | null> `json_extract(${j.production}, '$.next')`,
    }).from(j).leftJoin(schema.scripts, eq(schema.scripts.id, j.script_id)).where(jobsWhere).orderBy(desc(j.updated_at)).limit(6).all().map(({ next, ...job }) => ({ ...job, production: next ? { next } : null }));
    return { counts, total, ofKind, runs, sprints, jobs, jobCount };
}
