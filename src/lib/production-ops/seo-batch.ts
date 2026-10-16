import { randomUUID } from "node:crypto";
import { seoContext } from "../seo/context";
import { sourcedBlogInput, draftSourcedBlog, type SourcedBlogInput } from "../seo/blog";
import { writeSourcedBlog, materializeWrittenBlog } from "../seo/blog-writer";
import { articleResources, type ArticleResource } from "../seo/article-resources";
import { readArtifact, saveArtifact } from "../seo/store";
import type { SeoArtifact } from "../seo/content";
import { readEvidenceSnapshot } from "../standalone/store";
import { listResearch } from "../seo/review-store";
import { fingerprint, readCheckpoint, saveCheckpoint, indexSummary, opsDb } from "./store";
import { checkpoint } from "../llm/run-control";
import { ProviderDeferredError } from "./attempts";
import { startSpan, endSpan } from "./metrics";
import type { SeoContext } from "../seo/model";
export type SeoBatch = {
    id: string;
    brandId: string;
    title: string;
    contextHash: string;
    evidenceRevision: number;
    items: string[];
    mode: "ai" | "assembly";
    createdAt: string;
    cancelled: boolean;
};
export type SeoBatchItem = {
    id: string;
    batchId: string;
    brandId: string;
    input: SourcedBlogInput;
    inputHash: string;
    context: SeoContext;
    resources: ArticleResource[];
    captures: unknown[];
    status: "queued" | "running" | "saved" | "quarantined" | "failed" | "cancelled";
    artifactId: string;
    response?: {
        data: unknown;
        callId: string;
        costUsd: number;
    };
    model?: string;
    error?: string;
};
export const readSeoBatch = (brand: string, id: string) => readCheckpoint<SeoBatch>(brand, "seo-batch", id);
export const readSeoBatchItem = (brand: string, id: string) => readCheckpoint<SeoBatchItem>(brand, "seo-batch-item", id);
function sources(ctx: SeoContext, input: SourcedBlogInput) { const all = articleResources(ctx, input.productId); return [...new Set(input.sections.flatMap(s => s.resource ? [s.resource.id] : []))].map(id => { const source = all.find(s => s.id === id); if (!source || input.sections.some(s => s.resource?.id === id && s.resource.hash !== source.hash))
    throw new Error("A selected product resource changed. Review the source notes again."); return source; }); }
function assertCurrent(batch: SeoBatch, item: SeoBatchItem) {
    const ctx = seoContext(batch.brandId);
    if (ctx.contextHash !== batch.contextHash || readEvidenceSnapshot(batch.brandId).revision !== batch.evidenceRevision)
        throw new Error("The frozen brand or evidence revision changed. This result remains under its original scope and needs source review.");
    if (fingerprint(item.input) !== item.inputHash)
        throw new Error("The frozen brief changed; a retained response cannot be reused.");
    const current = sources(ctx, item.input);
    if (fingerprint(current) !== fingerprint(item.resources))
        throw new Error("The selected resource snapshot changed. Recheck cannot authorize a different source scope.");
    return ctx;
}
function saveItem(value: SeoBatchItem, revision: number) { const saved = saveCheckpoint(value.brandId, "seo-batch-item", value.id, value, revision); indexSummary({ brand: value.brandId, kind: "seo-batch-item", id: value.id, updated: new Date().toISOString(), title: value.input.title, status: value.status, revision: saved.revision, metadata: { batchId: value.batchId, artifactId: value.artifactId, error: value.error, callId: value.response?.callId, costUsd: value.response?.costUsd ?? 0 } }); return saved; }
export function createSeoBatch(brandId: string, title: string, raw: unknown[], mode: "ai" | "assembly" = "ai") {
    if (!raw.length || raw.length > 20)
        throw new Error("Choose 1–20 article briefs per batch.");
    const id = randomUUID(), contextSpan = startSpan(brandId, id, "context");
    let ctx: SeoContext;
    try {
        ctx = seoContext(brandId);
    }
    catch (e) {
        endSpan(contextSpan, "failed", { error: String(e) });
        throw e;
    }
    endSpan(contextSpan, "passed");
    const createdAt = new Date().toISOString(), inputs = raw.map(x => sourcedBlogInput.parse(x));
    const items = inputs.map(input => { draftSourcedBlog(ctx, input, createdAt); const captures = input.sections.flatMap(s => { if (!s.captureId)
        return []; const c = listResearch(brandId).find(c => c.id === s.captureId && c.url === s.sourceUrl && c.contextHash === ctx.contextHash); if (!c)
        throw new Error("A selected capture is unavailable."); return [c]; }); return { id: randomUUID(), batchId: id, brandId, input, inputHash: fingerprint(input), context: ctx, resources: sources(ctx, input), captures, status: "queued" as const, artifactId: randomUUID() }; });
    const batch: SeoBatch = { id, brandId, title: title.trim().slice(0, 180) || "Article batch", contextHash: ctx.contextHash, evidenceRevision: readEvidenceSnapshot(brandId).revision, items: items.map(i => i.id), mode, createdAt, cancelled: false };
    opsDb().transaction(() => { for (const item of items)
        saveItem(item, 0); saveCheckpoint(brandId, "seo-batch", id, batch, 0); indexSummary({ brand: brandId, kind: "seo-batch", id, updated: createdAt, title: batch.title, status: "queued", revision: 1, metadata: { items: batch.items, mode, productIds: [...new Set(inputs.map(i => i.productId))] } }); }).immediate();
    return batch;
}
async function processItem(batch: SeoBatch, id: string, recheckOnly = false) {
    let record = readSeoBatchItem(batch.brandId, id);
    if (!record)
        throw new Error("Batch item unavailable.");
    if (record.value.status === 'saved' || record.value.status === 'cancelled')
        return;
    let item = record.value;
    let validation = startSpan(batch.brandId, batch.id, "validation");
    try {
        checkpoint();
        if (readSeoBatch(batch.brandId, batch.id)?.value.cancelled)
            throw new Error("Batch cancelled. No new call was sent.");
        assertCurrent(batch, item);
        record = saveItem({ ...item, status: "running", error: undefined }, record.revision);
        item = record.value;
        let result: ReturnType<typeof materializeWrittenBlog>;
        if (batch.mode === 'assembly')
            result = { draft: draftSourcedBlog(item.context, item.input, new Date().toISOString()), callId: "", model: "human copy", costUsd: 0 };
        else if (item.response)
            result = materializeWrittenBlog(item.context, item.input, item.response, item.model!);
        else {
            if (recheckOnly)
                throw new Error("No paid response was retained; recheck never makes a provider call.");
            endSpan(validation, "passed");
            result = await writeSourcedBlog(item.context, item.input, new Date().toISOString(), { operationId: `seo-batch:${batch.id}:${item.id}`, onResponse: value => { record = saveItem({ ...record!.value, response: value.response, model: value.model }, record!.revision); item = record.value; } });
            validation = startSpan(batch.brandId, batch.id, "validation");
        }
        checkpoint();
        assertCurrent(batch, item);
        if (readSeoBatch(batch.brandId, batch.id)?.value.cancelled)
            throw new Error("Batch cancelled after the response. It is retained for review; no artifact was approved.");
        const at = new Date().toISOString(), snapshotFiles = [...(item.resources.length ? [{ name: "brand-resource-snapshot.json", language: "json", code: JSON.stringify(item.resources), source: item.resources[0].url, placement: "Internal frozen brand resources.", validation: "Source snapshots preserve scope; independent source truth still needs review." }] : []), ...(item.captures.length ? [{ name: "fetched-source-evidence.json", language: "json", code: JSON.stringify(item.captures), source: item.input.sections[0].sourceUrl, placement: "Internal frozen research captures.", validation: "Historical capture; not independent proof." }] : [])];
        const artifact: SeoArtifact = { ...result.draft, id: item.artifactId, brandId: batch.brandId, contextHash: batch.contextHash, mode: "live", status: "draft", revision: 1, createdAt: at, updatedAt: at, codeFiles: [...(result.draft.codeFiles ?? []), ...snapshotFiles], history: [{ at, message: `Resumable batch ${batch.id}. ${result.callId ? `Paid call ${result.callId}; original scope retained.` : "Human copy assembled without a provider call."} Current-revision editorial approval required.` }] };
        const existing = readArtifact(batch.brandId, artifact.id);
        if (!existing)
            saveArtifact(artifact, 0);
        saveItem({ ...item, status: "saved", error: undefined }, record.revision);
        endSpan(validation, "passed");
    }
    catch (e) {
        endSpan(validation, "failed", { error: String(e) });
        if (e instanceof ProviderDeferredError) {
            saveItem({ ...record.value, status: "queued", error: e.message }, record.revision);
            throw e;
        }
        const current = readSeoBatchItem(batch.brandId, id)!;
        const callId = (e as {
            callId?: string;
        }).callId;
        const rejected = callId ? opsDb().prepare("SELECT response_text,cost_usd,model FROM llm_calls WHERE id=? AND brand_id=?").get(callId, batch.brandId) as {
            response_text: string | null;
            cost_usd: number;
            model: string;
        } | undefined : undefined;
        let retained = current.value.response, model = current.value.model;
        if (!retained && rejected?.response_text) {
            let data: unknown;
            try {
                data = JSON.parse(rejected.response_text.replace(/^\s*```(?:json)?\s*/, '').replace(/\s*```\s*$/, ''));
            }
            catch {
                data = { unparsedResponseText: rejected.response_text };
            }
            retained = { data, callId: callId!, costUsd: rejected.cost_usd };
            model = rejected.model;
        }
        saveItem({ ...current.value, response: retained, model, status: retained ? 'quarantined' : 'failed', error: e instanceof Error ? e.message : String(e) }, current.revision);
    }
}
export async function runSeoBatch(brandId: string, id: string) {
    const record = readSeoBatch(brandId, id);
    if (!record)
        throw new Error("Article batch unavailable.");
    const batch = record.value;
    if (batch.cancelled)
        return;
    const pending = batch.items.filter(item => { const status = readSeoBatchItem(brandId, item)?.value.status; return status === 'queued' || status === 'running'; });
    let at = 0;
    const deferred: ProviderDeferredError[] = [];
    await Promise.all(Array.from({ length: Math.min(2, pending.length) }, async () => { while (at < pending.length) {
        checkpoint();
        const next = pending[at++];
        try {
            await processItem(batch, next);
        }
        catch (e) {
            if (e instanceof ProviderDeferredError) {
                deferred.push(e);
                return;
            }
            throw e;
        }
    } }));
    const children = batch.items.map(i => readSeoBatchItem(brandId, i)!.value), status = children.every(i => i.status === 'saved') ? 'ready_for_review' : children.some(i => i.status === 'queued' || i.status === 'running') ? 'waiting' : 'needs_review';
    indexSummary({ brand: brandId, kind: "seo-batch", id, updated: new Date().toISOString(), title: batch.title, status, revision: record.revision, metadata: { items: batch.items, mode: batch.mode, productIds: [...new Set(children.map(i => i.input.productId))], saved: children.filter(i => i.status === 'saved').length, quarantined: children.filter(i => i.status === 'quarantined').length } });
    if (deferred.length)
        throw deferred[0];
}
export async function recheckSeoItem(brandId: string, id: string) { const item = readSeoBatchItem(brandId, id); if (!item)
    throw new Error("Item unavailable."); const batch = readSeoBatch(brandId, item.value.batchId); if (!batch)
    throw new Error("Batch unavailable."); await processItem(batch.value, id, true); return readSeoBatchItem(brandId, id); }
export function cancelSeoBatch(brandId: string, id: string, expectedRevision: number) { const record = readSeoBatch(brandId, id); if (!record || record.revision !== expectedRevision)
    throw new Error("Batch changed. Refresh before cancellation."); return saveCheckpoint(brandId, "seo-batch", id, { ...record.value, cancelled: true }, expectedRevision); }
