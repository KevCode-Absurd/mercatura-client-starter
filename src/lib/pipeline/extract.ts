import { randomUUID } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { DroppedQuote, FixedQuote, Segment, SourceItemRow } from "@/db/schema";
import { compactBrandBrain } from "../brand-brain";
import { loadBrandBrain } from "../brands";
import { env } from "../env";
import { callStructured } from "../llm/gateway";
import { renderPrompt } from "../prompts";
import { AWARENESS_STAGES, INSIGHT_INFO, INSIGHT_TYPES, INTENSITY_RUBRIC, JOB_INFO, JOBS, type Job, OBJECTION_CLASSES, OBJECTION_LABELS, SOURCE_INFO, SOURCE_PRIORITY_TYPES, TYPE_BEAT, } from "../taxonomy";
import { chunkSegments } from "./chunk";
import { matchQuote } from "./quote-match";
export const InsightOut = z.object({
    type: z.enum(INSIGHT_TYPES),
    quote: z.string().min(3),
    persona_id: z.string().nullable(),
    intensity: z.number().int().min(1).max(5),
    objection_class: z.enum(OBJECTION_CLASSES).nullable(),
    awareness_stage: z.enum(AWARENESS_STAGES).nullable(),
    note: z.string(),
    job: z.string().nullable().default(null),
});
export const ExtractionOut = z.object({ insights: z.array(InsightOut) });
export type InsightOut = z.infer<typeof InsightOut>;
export function chunkText(item: SourceItemRow, segs: Segment[]): string {
    return segs.map((s) => `${s.role === "agent" ? "Agent" : s.label}: ${item.redacted_text.slice(s.start, s.end)}`).join("\n\n");
}
function itemContext(item: SourceItemRow): string {
    const m = item.meta as Record<string, unknown>;
    if (item.source_type === "review")
        return [
            `Star rating: ${m.rating}/5${m.product ? `. Product: ${m.product}` : ""}.`,
            m.verified === false ? "Not a verified purchase: its quotes may be read, but not put in a paid ad." : "",
            m.incentivised ? "The reviewer was given the product or paid: any quote used in an ad must say so." : "",
        ].filter(Boolean).join(" ");
    if (item.source_type === "ticket")
        return [m.subject && `Subject: ${m.subject}`, m.return_reason && `Return reason: ${m.return_reason}`, (m.tags as string[])?.length ? `Tags: ${(m.tags as string[]).join(", ")}` : ""].filter(Boolean).join(". ");
    if (item.source_type === "survey") {
        const choices = ((m.answers as {
            question: string;
            value: string | null;
            free_text: boolean;
        }[]) ?? []).filter((a) => !a.free_text && a.value);
        return choices.length ? `Multiple-choice answers: ${choices.map((a) => `${a.question}: ${a.value}`).join("; ")}.` : "";
    }
    if (item.source_type === "founder")
        return "The speaker is the brand's founder, answering a questionnaire. The quotes are the founder's words, not a customer's: what they have seen buyers do and say, and why the product is made as it is. Do not assign a persona unless the founder names that kind of buyer.";
    if (item.source_type === "community")
        return `Platform: ${m.platform ?? "unknown"}${m.community ? ` (${m.community})` : ""}. Most posters have not bought.`;
    return "";
}
export function jobOf(said: string | null | undefined): Job | null {
    if (!said)
        return null;
    const key = said.toLowerCase().replace(/^\d+\s*/, "").replace(/^the\s+/, "").trim().replace(/[\s-]+/g, "_");
    return (JOBS as readonly string[]).includes(key) ? (key as Job) : null;
}
export function systemVars(brandId: string) {
    const brand = loadBrandBrain(brandId);
    return {
        brand,
        vars: {
            insight_type_definitions: INSIGHT_TYPES.map((t) => `- ${t}: ${INSIGHT_INFO[t].definition}. Feeds: ${INSIGHT_INFO[t].beats}.`).join("\n"),
            intensity_rubric: INTENSITY_RUBRIC.map(([n, m, ex]) => `${n} = ${m} (e.g. "${ex}")`).join("\n"),
            objection_classes: OBJECTION_CLASSES.map((c, i) => `${i + 1}. ${c}: "${OBJECTION_LABELS[c]}"`).join("\n"),
            jobs: JOBS.map((j) => `${JOB_INFO[j].n} ${j}: ${JOB_INFO[j].sounds}. Earns its money in: ${JOB_INFO[j].earns}.`).join("\n"),
            brand_brain_compact: compactBrandBrain(brand),
        },
    };
}
export interface ExtractSummary {
    kept: number;
    fixed: number;
    dropped: number;
    costUsd: number;
}
export async function extractItem(itemId: string): Promise<ExtractSummary> {
    const item = db.select().from(schema.sourceItems).where(eq(schema.sourceItems.id, itemId)).get();
    if (!item)
        throw new Error(`No source item ${itemId}`);
    if (item.preprocess_status !== "done")
        throw new Error(`${itemId} is not pre-processed yet.`);
    if (item.source_type === "website") {
        db.update(schema.sourceItems).set({ extraction_status: "done" }).where(eq(schema.sourceItems.id, itemId)).run();
        return { kept: 0, fixed: 0, dropped: 0, costUsd: 0 };
    }
    const { brand, vars } = systemVars(item.brand_id);
    const personaIds = new Set(brand.personas.map((p) => p.id));
    const segs = item.meta.segments;
    const chunks = chunkSegments(segs);
    db.delete(schema.insights).where(and(eq(schema.insights.source_item_id, itemId), ne(schema.insights.match, "seed"))).run();
    db.delete(schema.extractionRuns).where(eq(schema.extractionRuns.source_item_id, itemId)).run();
    const seen = new Set<string>();
    const summary: ExtractSummary = { kept: 0, fixed: 0, dropped: 0, costUsd: 0 };
    try {
        for (let c = 0; c < chunks.length; c++) {
            const chunk = chunks[c];
            const text = chunkText(item, chunk.segIdx.map((i) => segs[i]));
            const p = renderPrompt("extract", {
                ...vars,
                source_type: item.source_type,
                source_job: SOURCE_INFO[item.source_type].job,
                priority_types: SOURCE_PRIORITY_TYPES[item.source_type].join(", "),
                item_context: itemContext(item),
                text,
            });
            const res = await callStructured({
                brandId: item.brand_id,
                task: "extract",
                model: env.MODEL_EXTRACT,
                system: p.system,
                user: p.user,
                schema: ExtractionOut,
                effort: text.length < 2000 ? "medium" : "high",
                refType: "source_item",
                refId: item.id,
            });
            summary.costUsd += res.costUsd;
            const runId = randomUUID();
            const fixed: FixedQuote[] = [];
            const dropped: DroppedQuote[] = [];
            const rows: (typeof schema.insights.$inferInsert)[] = [];
            for (const ins of res.data.insights) {
                const m = matchQuote(item.redacted_text, ins.quote);
                if (m.kind === "none") {
                    dropped.push({ quote: ins.quote, type: ins.type, reason: "not_in_source", best_ratio: Math.round(m.bestRatio * 1000) / 1000 });
                    continue;
                }
                const seg = segs.find((s) => m.start >= s.start && m.start < s.end);
                if (seg?.role === "agent") {
                    dropped.push({ quote: ins.quote, type: ins.type, reason: "agent_line" });
                    continue;
                }
                const exactQuote = item.redacted_text.slice(m.start, m.end);
                const key = `${ins.type}|${exactQuote}`;
                if (seen.has(key)) {
                    dropped.push({ quote: ins.quote, type: ins.type, reason: "duplicate" });
                    continue;
                }
                seen.add(key);
                if (m.kind === "fuzzy")
                    fixed.push({ model_quote: ins.quote, source_quote: exactQuote, ratio: Math.round(m.ratio * 1000) / 1000 });
                rows.push({
                    id: `ins_${randomUUID().slice(0, 12)}`,
                    brand_id: item.brand_id,
                    source_item_id: item.id,
                    source_type: item.source_type,
                    type: ins.type,
                    quote: exactQuote,
                    char_start: m.start,
                    char_end: m.end,
                    persona_id: ins.persona_id && personaIds.has(ins.persona_id) ? ins.persona_id : null,
                    intensity: ins.intensity,
                    objection_class: ins.objection_class,
                    awareness_stage: ins.awareness_stage,
                    theme_id: null,
                    note: ins.note.slice(0, 200),
                    beat: TYPE_BEAT[ins.type],
                    job: jobOf(ins.job),
                    extraction_run_id: runId,
                    match: m.kind,
                });
            }
            db.transaction((tx) => {
                tx.insert(schema.extractionRuns)
                    .values({
                    id: runId,
                    brand_id: item.brand_id,
                    source_item_id: item.id,
                    chunk_index: c,
                    llm_call_id: res.callId,
                    raw_output: res.data,
                    kept: rows.length,
                    fixed,
                    dropped,
                })
                    .run();
                if (rows.length)
                    tx.insert(schema.insights).values(rows).run();
            });
            summary.kept += rows.length;
            summary.fixed += fixed.length;
            summary.dropped += dropped.length;
        }
        db.update(schema.sourceItems).set({ extraction_status: "done", updated_at: new Date().toISOString() }).where(eq(schema.sourceItems.id, itemId)).run();
        return summary;
    }
    catch (e) {
        db.update(schema.sourceItems).set({ extraction_status: "failed" }).where(eq(schema.sourceItems.id, itemId)).run();
        throw e;
    }
}
