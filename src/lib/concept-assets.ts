import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { OutputJobRow } from "@/db/schema";
import { creativeBriefsFor } from "./creative-brief-store";
export function finishedCreative(job: Pick<OutputJobRow, "status" | "assets"> & {
    production: {
        next?: string;
    } | null;
}): boolean {
    return job.status !== "discarded" && (!job.production || job.production.next === "done") && job.assets.length > 0;
}
export function conceptAssetScope(brandId: string, id: string, variant?: string) {
    const concepts = db.select().from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all();
    const concept = concepts.find((c) => c.id === id);
    if (!concept)
        return null;
    const ids = new Set([id]);
    for (let changed = true; changed;) {
        changed = false;
        for (const c of concepts)
            if (c.parent_concept_id && ids.has(c.parent_concept_id) && !ids.has(c.id)) {
                ids.add(c.id);
                changed = true;
            }
    }
    const briefs = creativeBriefsFor(brandId);
    const selected = variant ? ["A", "B", "C"].indexOf(variant) : -1;
    return { concept, planId: briefs[id]?.plan_id, ids: [...ids].filter((key) => !variant || (selected >= 0 && briefs[key]?.selected_variant === selected)) };
}
export function conceptAssetCounts(brandId: string): Record<string, number> {
    const jobs = db.select({ conceptId: schema.scripts.concept_id, assets: schema.outputJobs.assets, status: schema.outputJobs.status, hasProduction: sql<number> `${schema.outputJobs.production} is not null`, next: sql<string | null> `json_extract(${schema.outputJobs.production}, '$.next')` })
        .from(schema.outputJobs).innerJoin(schema.scripts, eq(schema.scripts.id, schema.outputJobs.script_id))
        .where(and(eq(schema.outputJobs.brand_id, brandId), eq(schema.scripts.brand_id, brandId))).all();
    const parents = new Map(db.select({ id: schema.concepts.id, parent: schema.concepts.parent_concept_id }).from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all().map((c) => [c.id, c.parent]));
    const counts: Record<string, number> = {};
    for (const j of jobs) {
        if (!finishedCreative({ ...j, production: j.hasProduction ? { next: j.next ?? undefined } : null }))
            continue;
        const seen = new Set<string>();
        for (let id: string | null | undefined = j.conceptId; id && parents.has(id) && !seen.has(id); id = parents.get(id)) {
            seen.add(id);
            counts[id] = (counts[id] ?? 0) + 1;
        }
    }
    return counts;
}
