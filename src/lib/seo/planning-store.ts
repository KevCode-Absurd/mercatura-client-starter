import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { emptySearchPlan, type SearchPlanData } from "./planning";
export type { SearchPlanData } from "./planning";
const key = "seo:v1:search-plan";
export function loadSearchPlan(brandId: string): SearchPlanData {
    const row = db.select().from(schema.settings).where(and(eq(schema.settings.brand_id, brandId), eq(schema.settings.key, key))).get();
    const value = row?.value as SearchPlanData | undefined;
    if (value && (value.version !== 1 || value.brandId !== brandId))
        throw new Error("This search plan has an unsupported version or brand.");
    return value ?? emptySearchPlan(brandId);
}
export function saveSearchPlan(value: SearchPlanData) {
    const updated_at = new Date().toISOString();
    db.insert(schema.settings).values({ brand_id: value.brandId, key, value, updated_at }).onConflictDoUpdate({ target: [schema.settings.brand_id, schema.settings.key], set: { value, updated_at } }).run();
}
