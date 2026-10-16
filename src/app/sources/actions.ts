"use server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { importSampleData } from "@/lib/import/samples";
import { callsToRecords, createImport, deleteImport } from "@/lib/import/service";
import { guessMapping, missingRequired, parseRows, rowsToRecords, TARGET_FIELDS, type Mapping } from "@/lib/import/tabular";
import { parseTranscriptFile } from "@/lib/import/transcripts";
import { enqueue } from "@/lib/jobs/queue";
import { llmEnabled } from "@/lib/llm/gateway";
import { getSetting, setSetting } from "@/lib/settings";
import { syncFounderSource } from "@/lib/brand-sources";
import type { CustomerSource, SourceType } from "@/lib/taxonomy";
import { errorText } from "@/lib/plain-message";
type Tabular = Exclude<CustomerSource, "call">;
type FileIn = {
    name: string;
    content: string;
};
type Fail = {
    ok: false;
    error: string;
};
async function brandTerms(brandId: string) {
    const b = loadBrandBrain(brandId);
    return [b.brand.name, b.brand.name.normalize("NFD").replace(/[̀-ͯ]/g, "")];
}
export type PreviewResult = {
    ok: true;
    kind: "call";
    calls: {
        file: string;
        turns: number;
        customerTurns: number;
        sample: {
            role: string;
            text: string;
        }[];
    }[];
} | {
    ok: true;
    kind: "table";
    columns: string[];
    rows: Record<string, string>[];
    total: number;
    mapping: Mapping;
    fields: {
        key: string;
        label: string;
        required?: boolean;
        multi?: boolean;
        pii?: boolean;
    }[];
};
export async function previewImportAction(type: CustomerSource, files: FileIn[]): Promise<PreviewResult | Fail> {
    try {
        const brandId = await activeBrandId();
        if (type === "call") {
            const terms = await brandTerms(brandId);
            const calls = files.flatMap((f) => parseTranscriptFile(f.name, f.content, terms).map((c) => ({
                file: f.name,
                turns: c.turns.length,
                customerTurns: c.turns.filter((t) => t.role === "customer").length,
                sample: c.turns.slice(0, 4).map((t) => ({ role: t.role, text: t.text.slice(0, 160) })),
            })));
            return { ok: true, kind: "call", calls };
        }
        const { rows, columns } = parseRows(files[0].name, files[0].content);
        const saved = getSetting(brandId, "import_mappings")[type];
        const mapping = saved && Object.values(saved).every((c) => c.split(",").every((x) => columns.includes(x))) ? saved : guessMapping(type, columns);
        return {
            ok: true,
            kind: "table",
            columns,
            total: rows.length,
            rows: rows.slice(0, 5).map((r) => Object.fromEntries(columns.map((c) => [c, typeof r[c] === "object" ? JSON.stringify(r[c]).slice(0, 80) : String(r[c] ?? "").slice(0, 120)]))),
            mapping,
            fields: TARGET_FIELDS[type as Tabular].map(({ key, label, required, multi, pii }) => ({ key, label, required, multi, pii })),
        };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function importAction(type: CustomerSource, files: FileIn[], mapping: Mapping | null, extractAfter: boolean): Promise<{
    ok: true;
    items: number;
    batches: number;
} | Fail> {
    try {
        const brandId = await activeBrandId();
        let items = 0;
        let batches = 0;
        if (type === "call") {
            const terms = await brandTerms(brandId);
            const calls = files.flatMap((f) => parseTranscriptFile(f.name, f.content, terms));
            const r = createImport({ brandId, sourceType: "call", origin: files.map((f) => f.name).join(", "), records: callsToRecords(calls), extractAfter });
            items += r.itemIds.length;
            batches++;
        }
        else {
            if (!mapping)
                return { ok: false, error: "Map the columns first." };
            const missing = missingRequired(type, mapping);
            if (missing.length)
                return { ok: false, error: `Map the required fields: ${missing.join(", ")}.` };
            setSetting(brandId, "import_mappings", { ...getSetting(brandId, "import_mappings"), [type]: mapping });
            for (const f of files) {
                const { rows } = parseRows(f.name, f.content);
                const r = createImport({ brandId, sourceType: type, origin: f.name, records: rowsToRecords(type, rows, mapping), extractAfter });
                items += r.itemIds.length;
                batches++;
            }
        }
        revalidatePath("/sources");
        revalidatePath("/");
        return { ok: true, items, batches };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function loadSamplesAction(extractAfter: boolean): Promise<{
    ok: true;
    items: number;
} | Fail> {
    try {
        const brandId = await activeBrandId();
        const res = importSampleData(brandId, extractAfter);
        revalidatePath("/sources");
        return { ok: true, items: res.reduce((n, r) => n + r.itemIds.length, 0) };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function extractAction(ids: string[]): Promise<{
    ok: true;
    queued: number;
} | Fail> {
    if (!llmEnabled())
        return { ok: false, error: "Mock mode: set LLM_MODE=live in .env (and restart) to run extraction." };
    const brandId = await activeBrandId();
    const items = db
        .select({ id: schema.sourceItems.id, pre: schema.sourceItems.preprocess_status })
        .from(schema.sourceItems)
        .where(and(eq(schema.sourceItems.brand_id, brandId), inArray(schema.sourceItems.id, ids)))
        .all();
    for (const it of items) {
        if (it.pre === "done")
            enqueue(brandId, "extract", it.id);
        else
            enqueue(brandId, "preprocess", it.id, { extract: true });
    }
    revalidatePath("/sources");
    return { ok: true, queued: items.length };
}
export async function syncFounderAction(): Promise<{
    ok: true;
    sections: number;
    changed: number;
    removed: number;
} | Fail> {
    try {
        const brandId = await activeBrandId();
        const res = syncFounderSource(brandId, { extract: llmEnabled() });
        revalidatePath("/sources");
        return { ok: true, ...res };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function extractPendingAction(type: SourceType): Promise<{
    ok: true;
    queued: number;
} | Fail> {
    if (type === "website")
        return { ok: true, queued: 0 };
    const brandId = await activeBrandId();
    const ids = db
        .select({ id: schema.sourceItems.id })
        .from(schema.sourceItems)
        .where(and(eq(schema.sourceItems.brand_id, brandId), eq(schema.sourceItems.source_type, type), inArray(schema.sourceItems.extraction_status, ["pending", "failed"])))
        .all()
        .map((r) => r.id);
    if (!ids.length)
        return { ok: true, queued: 0 };
    return extractAction(ids);
}
export async function deleteBatchAction(batchId: string): Promise<{
    ok: true;
    removed: number;
} | Fail> {
    const brandId = await activeBrandId();
    const batch = db.select().from(schema.importBatches).where(eq(schema.importBatches.id, batchId)).get();
    if (!batch || batch.brand_id !== brandId)
        return { ok: false, error: "Batch not found." };
    if (batch.origin === "seed")
        return { ok: false, error: "Seed data can't be undone here. Run pnpm db:seed to reset it." };
    const removed = deleteImport(batchId);
    revalidatePath("/sources");
    revalidatePath("/");
    return { ok: true, removed };
}
export interface ItemTrace {
    calls: {
        id: string;
        task: string;
        model: string;
        status: string;
        error: string | null;
        cost_usd: number;
        input_tokens: number;
        output_tokens: number;
        cache_read_tokens: number;
        duration_ms: number;
        attempt: number;
        user_prompt: string;
        system_prompt_chars: number;
        response_text: string | null;
    }[];
    runs: (typeof schema.extractionRuns.$inferSelect)[];
}
export async function getItemTraceAction(itemId: string): Promise<ItemTrace> {
    const brandId = await activeBrandId();
    const calls = db
        .select()
        .from(schema.llmCalls)
        .where(and(eq(schema.llmCalls.brand_id, brandId), eq(schema.llmCalls.ref_id, itemId)))
        .orderBy(asc(schema.llmCalls.created_at))
        .all()
        .map((c) => ({
        id: c.id,
        task: c.task,
        model: c.model,
        status: c.status,
        error: c.error,
        cost_usd: c.cost_usd,
        input_tokens: c.input_tokens,
        output_tokens: c.output_tokens,
        cache_read_tokens: c.cache_read_tokens,
        duration_ms: c.duration_ms,
        attempt: c.attempt,
        user_prompt: c.user_prompt,
        system_prompt_chars: c.system_prompt.length,
        response_text: c.response_text,
    }));
    const runs = db.select().from(schema.extractionRuns).where(eq(schema.extractionRuns.source_item_id, itemId)).orderBy(asc(schema.extractionRuns.chunk_index)).all();
    return { calls, runs };
}
