import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { ItemPipeline, PipelineStage, Segment } from "@/db/schema";
import { loadBrandBrain } from "../brands";
import { env } from "../env";
import { callStructured, llmEnabled } from "../llm/gateway";
import { renderPrompt } from "../prompts";
import { buildText, type SegmentInput } from "../segments";
import { chunkSegments } from "./chunk";
import { redactContactPii, replaceEntities } from "./redact";
const CleanOut = z.object({ turns: z.array(z.object({ i: z.number().int(), text: z.string() })) });
const EntitiesOut = z.object({
    entities: z.array(z.object({ text: z.string(), type: z.enum(["name", "address"]) })),
});
export function reuseClean(prev: PipelineStage | undefined, texts: string[]): {
    texts: string[];
    fixes: {
        from: string;
        to: string;
    }[];
} | null {
    if (!prev || prev.name !== "clean" || !prev.llm_call_id)
        return null;
    const count = /of (\d+) turns/.exec(prev.note ?? "")?.[1];
    if (count && Number(count) !== texts.length)
        return null;
    const reps = prev.replacements ?? [];
    if (!reps.every((r) => texts.includes(r.from)))
        return null;
    const map = new Map(reps.map((r) => [r.from, r.to]));
    return { texts: texts.map((t) => map.get(t) ?? t), fixes: reps };
}
function brandTerms(brandId: string): string[] {
    const b = loadBrandBrain(brandId);
    return [b.brand.name, ...b.products.map((p) => p.name)];
}
function workingLabel(sourceType: string, seg: Segment): string {
    if (sourceType === "call" || sourceType === "ticket")
        return seg.role === "agent" ? "Agent" : "Customer";
    return seg.label;
}
export async function preprocessItem(itemId: string): Promise<void> {
    const item = db.select().from(schema.sourceItems).where(eq(schema.sourceItems.id, itemId)).get();
    if (!item)
        throw new Error(`No source item ${itemId}`);
    const pipeline: ItemPipeline = item.pipeline ?? {
        raw_segments: item.meta.segments,
        clean_segments: [],
        stages: [],
        chunks: [],
    };
    const rawSegs = pipeline.raw_segments;
    const stages: PipelineStage[] = pipeline.stages.filter((s) => s.name === "parse");
    const live = llmEnabled();
    try {
        let t0 = Date.now();
        const regexReps: {
            from: string;
            to: string;
        }[] = [];
        let texts = rawSegs.map((s) => {
            const r = redactContactPii(item.raw_text.slice(s.start, s.end));
            regexReps.push(...r.replacements.map(({ from, to }) => ({ from, to })));
            return r.text;
        });
        stages.push({ name: "regex_redact", ms: Date.now() - t0, replacements: regexReps, note: `${regexReps.length} emails, phones, addresses or order numbers replaced.` });
        if (item.source_type === "call") {
            t0 = Date.now();
            const earlier = item.pipeline?.stages.find((s) => s.name === "clean");
            const again = reuseClean(earlier, texts);
            if (again) {
                texts = again.texts;
                stages.push({ name: "clean", ms: 0, llm_call_id: earlier?.llm_call_id, replacements: again.fixes, note: `${again.fixes.length} of ${texts.length} turns corrected, as in the earlier run: the text had not changed, so it was not cleaned again.` });
            }
            else if (!live) {
                stages.push({ name: "clean", ms: 0, note: "Skipped: mock mode (no API calls)." });
            }
            else {
                const terms = brandTerms(item.brand_id).join(", ");
                const turns = texts.map((text, i) => ({ i, speaker: rawSegs[i].role === "agent" ? "Agent" : "Customer", text }));
                const p = renderPrompt("clean", { brand_terms: terms, turns: JSON.stringify(turns, null, 1) });
                const res = await callStructured({
                    brandId: item.brand_id,
                    task: "clean",
                    model: env.MODEL_FAST,
                    system: p.system,
                    user: p.user,
                    schema: CleanOut,
                    maxTokens: 16000,
                    refType: "source_item",
                    refId: item.id,
                });
                const fixes: {
                    from: string;
                    to: string;
                }[] = [];
                const byIndex = new Map(res.data.turns.map((t) => [t.i, t.text]));
                texts = texts.map((before, i) => {
                    const after = byIndex.get(i);
                    if (!after || after.length < before.length * 0.6 || after.length > before.length * 1.4)
                        return before;
                    if (after !== before)
                        fixes.push({ from: before, to: after });
                    return after;
                });
                stages.push({ name: "clean", ms: Date.now() - t0, llm_call_id: res.callId, replacements: fixes, note: `${fixes.length} of ${texts.length} turns corrected.` });
            }
        }
        const cleanTexts = texts;
        t0 = Date.now();
        if (item.source_type === "website") {
            stages.push({ name: "name_redact", ms: 0, note: "Skipped: a page of the brand's own site is already public, and holds no customer's name." });
        }
        else if (!live) {
            stages.push({ name: "name_redact", ms: 0, note: "Skipped: mock mode (no API calls). Names are still visible." });
        }
        else {
            const p = renderPrompt("pii-names", { brand_terms: brandTerms(item.brand_id).join(", "), text: texts.join("\n\n") });
            const res = await callStructured({
                brandId: item.brand_id,
                task: "name_redact",
                model: env.MODEL_FAST,
                system: p.system,
                user: p.user,
                schema: EntitiesOut,
                maxTokens: 4000,
                refType: "source_item",
                refId: item.id,
            });
            const reps: {
                from: string;
                to: string;
            }[] = [];
            texts = texts.map((t) => {
                const r = replaceEntities(t, res.data.entities);
                reps.push(...r.replacements.map(({ from, to }) => ({ from, to })));
                return r.text;
            });
            stages.push({ name: "name_redact", ms: Date.now() - t0, llm_call_id: res.callId, replacements: reps, note: `${res.data.entities.length} names or addresses found, ${reps.length} mentions replaced.` });
        }
        const toParts = (arr: string[]): SegmentInput[] => rawSegs.map((s, i) => ({ label: workingLabel(item.source_type, s), role: s.role, text: arr[i] }));
        const clean = buildText(toParts(cleanTexts));
        const working = buildText(toParts(texts));
        t0 = Date.now();
        const chunks = chunkSegments(working.segments).map(({ start, end }) => ({ start, end }));
        stages.push({ name: "chunk", ms: Date.now() - t0, note: `${chunks.length} chunk${chunks.length === 1 ? "" : "s"} of up to ~3,000 tokens.` });
        db.update(schema.sourceItems)
            .set({
            clean_text: clean.text,
            redacted_text: working.text,
            meta: { ...item.meta, segments: working.segments },
            pipeline: { ...pipeline, clean_segments: clean.segments, stages, chunks, error: undefined },
            preprocess_status: "done",
            updated_at: new Date().toISOString(),
        })
            .where(eq(schema.sourceItems.id, item.id))
            .run();
    }
    catch (e) {
        db.update(schema.sourceItems)
            .set({ preprocess_status: "failed", pipeline: { ...pipeline, stages, error: (e as Error).message } })
            .where(eq(schema.sourceItems.id, item.id))
            .run();
        throw e;
    }
}
