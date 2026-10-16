import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { enqueue } from "../jobs/queue";
import { buildText, type SegmentInput } from "../segments";
import type { SourceType } from "../taxonomy";
import type { ImportRecord } from "./tabular";
import type { ParsedCall } from "./transcripts";
const PREFIX: Record<SourceType, string> = { call: "call", ticket: "tkt", review: "rev", survey: "srv", community: "com", website: "web", founder: "fnd" };
export function callsToRecords(calls: ParsedCall[]): ImportRecord[] {
    return calls.map((c) => ({
        external_id: c.external_id ?? null,
        date: c.date ?? null,
        title: c.title ?? null,
        parts: c.turns.map((t) => ({ label: t.speaker, role: t.role, text: t.text })),
        meta: { duration_sec: c.duration_sec ?? null, customer_label: c.customer_label ?? null, turns: c.turns.length },
        persona_hint: c.persona_hint ?? null,
    }));
}
export interface ImportResult {
    batchId: string;
    itemIds: string[];
}
export function createImport(opts: {
    brandId: string;
    sourceType: SourceType;
    origin: string;
    records: ImportRecord[];
    extractAfter: boolean;
}): ImportResult {
    const { brandId, sourceType, origin, records } = opts;
    if (!records.length)
        throw new Error("Nothing to import: no rows had the required fields.");
    const short = randomBytes(3).toString("hex");
    const batchId = `batch_${sourceType}_${short}`;
    const itemIds: string[] = [];
    db.transaction((tx) => {
        tx.insert(schema.importBatches).values({ id: batchId, brand_id: brandId, source_type: sourceType, origin, item_count: records.length }).run();
        records.forEach((r, n) => {
            const id = `${PREFIX[sourceType]}_${short}_${String(n + 1).padStart(3, "0")}`;
            const parts: SegmentInput[] = r.parts.filter((p) => p.text.trim());
            const raw = buildText(parts);
            tx.insert(schema.sourceItems)
                .values({
                id,
                brand_id: brandId,
                source_type: sourceType,
                date: r.date,
                title: r.title,
                raw_text: raw.text,
                clean_text: "",
                redacted_text: "",
                meta: { ...r.meta, segments: [] },
                persona_hint: r.persona_hint ?? null,
                import_batch_id: batchId,
                external_id: r.external_id,
                extraction_status: "pending",
                preprocess_status: "pending",
                pipeline: {
                    raw_segments: raw.segments,
                    clean_segments: [],
                    stages: [{ name: "parse", ms: 0, note: `Imported from ${origin}: ${raw.segments.length} segments, ${raw.text.length} characters.` }],
                    chunks: [],
                },
            })
                .run();
            itemIds.push(id);
        });
    });
    for (const id of itemIds)
        enqueue(brandId, "preprocess", id, { extract: opts.extractAfter });
    return { batchId, itemIds };
}
export function deleteImport(batchId: string): number {
    const items = db.select({ id: schema.sourceItems.id }).from(schema.sourceItems).where(eq(schema.sourceItems.import_batch_id, batchId)).all();
    const ids = items.map((i) => i.id);
    db.transaction((tx) => {
        if (ids.length) {
            tx.delete(schema.insights).where(inArray(schema.insights.source_item_id, ids)).run();
            tx.delete(schema.extractionRuns).where(inArray(schema.extractionRuns.source_item_id, ids)).run();
            tx.delete(schema.jobs).where(inArray(schema.jobs.ref_id, ids)).run();
            tx.delete(schema.sourceItems).where(inArray(schema.sourceItems.id, ids)).run();
        }
        tx.delete(schema.importBatches).where(eq(schema.importBatches.id, batchId)).run();
    });
    return ids.length;
}
