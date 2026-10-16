import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { loadBrandBrain } from "../brands";
import { creativeDirections, type ExplorationEvidence } from "./exploration";
import { readEvidence } from "../standalone/store";
export function explorationForBrand(brandId: string) {
    const brand = loadBrandBrain(brandId);
    const demo = db.select({ demo: schema.brands.is_demo }).from(schema.brands).where(eq(schema.brands.id, brandId)).get()?.demo;
    const passages: ExplorationEvidence[] = [];
    if (!demo) {
        const rows = db.select({ insight: schema.insights, text: schema.sourceItems.redacted_text, segments: schema.sourceItems.meta, sourceType: schema.sourceItems.source_type })
            .from(schema.insights).innerJoin(schema.sourceItems, eq(schema.insights.source_item_id, schema.sourceItems.id))
            .where(and(eq(schema.insights.brand_id, brandId), eq(schema.sourceItems.brand_id, brandId), eq(schema.insights.match, "exact"))).all();
        for (const { insight: i, text, segments, sourceType } of rows) {
            if (!i.quote.trim() || i.quote.length > 1500 || i.source_type !== sourceType || text.slice(i.char_start, i.char_end) !== i.quote)
                continue;
            if (sourceType !== "founder" && !(segments.segments ?? []).some((s) => s.role === "customer" && s.start <= i.char_start && s.end >= i.char_end))
                continue;
            passages.push({ id: i.id, sourceId: i.source_item_id, sourceType, type: i.type, themeId: i.theme_id, quote: i.quote });
        }
    }
    return creativeDirections(brand, passages, readEvidence(brandId));
}
