import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { loadBrandBrain } from "../brands";
import { readLocal, readEvidence } from "./store";
import { seedEvidence, type ProductionRecord, type ResearchPassage } from "./creative";
import { creativeDirections } from "../creative/exploration";
import type { InsightType, SourceType } from "../taxonomy";
export function qualityContext(brandId: string) {
    const brain = loadBrandBrain(brandId);
    const concepts = db.select().from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all();
    const scripts = db.select().from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).all();
    const sets = db.select().from(schema.studioRuns).where(eq(schema.studioRuns.brand_id, brandId)).all();
    const records: ProductionRecord[] = concepts.map((c) => ({ id: c.id, source: "concept", productId: c.product_id ?? "unbound", buyer: c.persona_id, awareness: c.awareness_stage, argument: c.angle || "unclassified", format: c.formats_planned.join(", "), status: c.status === "draft" ? "proposed" : "drafted", text: `${c.name}. ${c.angle}`, execution: "concept" }));
    for (const s of scripts) {
        const c = concepts.find((c) => c.id === s.concept_id);
        records.push({ id: s.id, source: "script", productId: c?.product_id ?? "unbound", buyer: c?.persona_id ?? "unbound", awareness: s.awareness_stage, argument: c?.angle ?? "unclassified", format: s.format_target ?? "script", status: s.status === "draft" ? "drafted" : "approved", text: s.lines.map((l) => l.text).join(" "), execution: s.lines.map((l) => l.visual_note ?? "").join(" ") });
    }
    for (const set of sets)
        for (const item of set.items)
            for (const output of item.outputs) {
                records.push({ id: `${set.id}:${item.id}:${output.aspect}:${output.version}`, source: "asset", productId: set.product_id, buyer: "unbound", awareness: set.context.stage ?? "unclassified", argument: item.reason || "unclassified", format: set.kind, status: output.qa?.status === "fail" ? "rejected" : "produced", text: output.texts?.map((t) => t.text).join(" ") || item.label, execution: item.direction, imagePath: output.path });
            }
    records.push(...readLocal<ProductionRecord[]>(brandId, "draft-batch", []));
    const overrides = readLocal<Record<string, Partial<ProductionRecord>>>(brandId, "production-labels", {});
    const rows = records.map((r) => ({ ...r, ...overrides[r.id], id: r.id, source: r.source, imagePath: r.imagePath }));
    const passages: ResearchPassage[] = [];
    const demo = db.select({ demo: schema.brands.is_demo }).from(schema.brands).where(eq(schema.brands.id, brandId)).get()?.demo;
    if (!demo)
        for (const row of db.select({ i: schema.insights, s: schema.sourceItems }).from(schema.insights).innerJoin(schema.sourceItems, eq(schema.insights.source_item_id, schema.sourceItems.id)).where(and(eq(schema.insights.brand_id, brandId), eq(schema.sourceItems.brand_id, brandId), eq(schema.insights.match, "exact"))).all()) {
            if (row.i.source_type === row.s.source_type && row.s.redacted_text.slice(row.i.char_start, row.i.char_end) === row.i.quote && row.s.meta.segments?.some((s) => s.role === "customer" && s.start <= row.i.char_start && s.end >= row.i.char_end))
                passages.push({ id: row.i.id, sourceId: row.s.id, sourceType: row.s.source_type, type: row.i.type, quote: row.i.quote });
        }
    const evidence = readEvidence(brandId).length ? readEvidence(brandId) : seedEvidence(brain);
    const directions = creativeDirections(brain, passages.map((p) => ({ ...p, sourceType: p.sourceType as SourceType, type: p.type as InsightType, themeId: null })), evidence);
    return { brain, records: rows, passages, evidence, directions };
}
