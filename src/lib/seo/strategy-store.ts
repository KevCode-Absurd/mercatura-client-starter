import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { SearchStrategy } from "./strategy";
const key = "seo:v1:outcome-strategy";
export function loadStrategy(brandId: string): SearchStrategy | null {
    const value = db.select().from(schema.settings).where(and(eq(schema.settings.brand_id, brandId), eq(schema.settings.key, key))).get()?.value as SearchStrategy | undefined;
    if (value && (value.version !== 1 || value.brandId !== brandId))
        throw new Error("Unsupported search strategy or brand.");
    return value ?? null;
}
export function saveStrategy(value: SearchStrategy) {
    const updated_at = new Date().toISOString();
    db.insert(schema.settings).values({ brand_id: value.brandId, key, value, updated_at }).onConflictDoUpdate({ target: [schema.settings.brand_id, schema.settings.key], set: { value, updated_at } }).run();
}
