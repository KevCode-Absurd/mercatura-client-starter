import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
export function creatorData(brandId: string) {
    const j = schema.outputJobs;
    return {
        scripts: db.select({ id: schema.scripts.id, title: schema.scripts.title, status: schema.scripts.status }).from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).orderBy(schema.scripts.id).all(),
        concepts: db.select({ id: schema.concepts.id, name: schema.concepts.name }).from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).orderBy(schema.concepts.id).all(),
        jobs: db.select({
            id: j.id, scriptId: j.script_id,
            next: sql<string> `coalesce(json_extract(${j.production}, '$.next'), '')`,
            completedClips: sql<number> `(select count(*) from json_each(json_extract(${j.production}, '$.clips')) where json_extract(value, '$.status') = 'completed')`,
            plannedClips: sql<number> `coalesce(json_extract(${j.production}, '$.segments'), 0)`,
            joined: sql<boolean> `json_extract(${j.production}, '$.joined') is not null`.mapWith(Boolean),
            avatarId: sql<string | null> `json_extract(${j.production}, '$.avatar_id')`,
        }).from(j).where(and(eq(j.brand_id, brandId), ne(j.status, "discarded"))).orderBy(j.id).all(),
    };
}
