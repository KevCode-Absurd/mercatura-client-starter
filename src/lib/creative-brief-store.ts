import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CreativeBrief } from "./creative-brief";
export function getCreativeBrief(brandId: string, conceptId: string): CreativeBrief | null {
    return db.select().from(schema.conceptBriefs).where(and(eq(schema.conceptBriefs.brand_id, brandId), eq(schema.conceptBriefs.concept_id, conceptId))).get()?.brief ?? null;
}
export function creativeBriefsFor(brandId: string): Record<string, CreativeBrief> {
    return Object.fromEntries(db.select().from(schema.conceptBriefs).where(eq(schema.conceptBriefs.brand_id, brandId)).all().map((r) => [r.concept_id, r.brief]));
}
export function getBriefPlan(brandId: string, id: string) {
    return db.select().from(schema.creativeBriefPlans).where(and(eq(schema.creativeBriefPlans.brand_id, brandId), eq(schema.creativeBriefPlans.id, id))).get();
}
