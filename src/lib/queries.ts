import { BrandBrainError, type BrandBrain } from "./brand-brain";
import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ConceptRow, InsightRow, OutputJobRow, ScriptRow, SourceItemRow, ThemeRow } from "@/db/schema";
import { loadBrandBrain } from "./brands";
import { rankThemes } from "./ranking";
import { getSetting } from "./settings";
import type { SourceType } from "./taxonomy";
export function getBrand(brandId: string) {
    return loadBrandBrain(brandId);
}
export function tryBrand(brandId: string): BrandBrain | null {
    try {
        return loadBrandBrain(brandId);
    }
    catch (e) {
        if (e instanceof BrandBrainError)
            return null;
        throw e;
    }
}
export function getThemes(brandId: string): ThemeRow[] {
    const rows = db.select().from(schema.themes).where(eq(schema.themes.brand_id, brandId)).all();
    return rankThemes(rows, getSetting(brandId, "rank_weights"));
}
export function getInsights(brandId: string): InsightRow[] {
    return db.select().from(schema.insights).where(eq(schema.insights.brand_id, brandId)).all();
}
export function getSourceItems(brandId: string, type?: SourceType): SourceItemRow[] {
    const s = schema.sourceItems;
    return db
        .select()
        .from(s)
        .where(type ? and(eq(s.brand_id, brandId), eq(s.source_type, type)) : eq(s.brand_id, brandId))
        .orderBy(s.date)
        .all();
}
export function getSourceItem(id: string): SourceItemRow | undefined {
    return db.select().from(schema.sourceItems).where(eq(schema.sourceItems.id, id)).get();
}
export function getInsightsForItems(ids: string[]): InsightRow[] {
    if (!ids.length)
        return [];
    return db.select().from(schema.insights).where(inArray(schema.insights.source_item_id, ids)).all();
}
export function getConcepts(brandId: string): ConceptRow[] {
    return db.select().from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).orderBy(schema.concepts.id).all();
}
export function getScripts(brandId: string): ScriptRow[] {
    return db.select().from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).orderBy(schema.scripts.id).all();
}
export function getScript(id: string): ScriptRow | undefined {
    return db.select().from(schema.scripts).where(eq(schema.scripts.id, id)).get();
}
export function getJobs(brandId: string): OutputJobRow[] {
    return db.select().from(schema.outputJobs).where(eq(schema.outputJobs.brand_id, brandId)).orderBy(schema.outputJobs.id).all();
}
export function getImportBatches(brandId: string) {
    return db
        .select()
        .from(schema.importBatches)
        .where(eq(schema.importBatches.brand_id, brandId))
        .orderBy(desc(schema.importBatches.created_at))
        .all();
}
export function getCounts(brandId: string) {
    const items = getSourceItems(brandId);
    const jobs = getJobs(brandId);
    return {
        items: items.length,
        itemsPending: items.filter((i) => i.extraction_status !== "done").length,
        itemsFailed: items.filter((i) => i.extraction_status === "failed" || i.preprocess_status === "failed").length,
        insights: getInsights(brandId).length,
        themes: getThemes(brandId).length,
        concepts: getConcepts(brandId).length,
        scripts: getScripts(brandId).length,
        assets: jobs.reduce((n, j) => n + j.assets.length, 0),
        jobs: jobs.length,
    };
}
export function getSpend(brandId: string) {
    const row = (where?: ReturnType<typeof eq>) => db
        .select({
        cost: sql<number> `coalesce(sum(${schema.llmCalls.cost_usd}), 0)`,
        calls: sql<number> `count(*)`,
        input: sql<number> `coalesce(sum(${schema.llmCalls.input_tokens}), 0)`,
        output: sql<number> `coalesce(sum(${schema.llmCalls.output_tokens}), 0)`,
    })
        .from(schema.llmCalls)
        .where(where)
        .get()!;
    return { brand: row(eq(schema.llmCalls.brand_id, brandId)), total: row() };
}
