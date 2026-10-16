"use server";
import { activeBrandId } from "@/lib/brand-context";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { enqueue } from "@/lib/jobs/queue";
import { createSeoBatch, cancelSeoBatch, recheckSeoItem, readSeoBatch, readSeoBatchItem } from "@/lib/production-ops/seo-batch";
import { createCampaign, runCampaign, acceptCampaignTask } from "@/lib/production-ops/campaigns";
import { applyArticleCorrections, undoArticleCorrections } from "@/lib/production-ops/editorial-transactions";
import { readCheckpoint, saveCheckpoint } from "@/lib/production-ops/store";
import { startSpan, endSpan } from "@/lib/production-ops/metrics";
async function action<T>(brand: string, fn: () => Promise<T> | T) { try {
    if (await activeBrandId() !== brand)
        throw new Error("The active brand changed. Refresh this workspace.");
    const value = await fn();
    revalidatePath('/production-ops');
    revalidatePath('/seo', 'layout');
    return { ok: true as const, value };
}
catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
} }
export async function queueArticleBatchAction(brand: string, input: {
    title: string;
    briefs: string;
    mode: "ai" | "assembly";
    reviewed: boolean;
}) { return action(brand, () => { if (input.reviewed !== true)
    throw new Error("Review the exact briefs and selected source scope first."); const parsed = z.object({ title: z.string().max(180), briefs: z.string().max(1500000), mode: z.enum(['ai', 'assembly']) }).parse(input), raw = JSON.parse(parsed.briefs); if (!Array.isArray(raw))
    throw new Error("Provide an array of complete article briefs."); const batch = createSeoBatch(brand, parsed.title, raw, parsed.mode); enqueue(brand, 'seo_batch', batch.id); return batch.id; }); }
export async function cancelArticleBatchAction(brand: string, id: string, revision: number) { return action(brand, () => cancelSeoBatch(brand, id, revision)); }
export async function resumeArticleBatchAction(brand: string, id: string) { return action(brand, () => { const b = readSeoBatch(brand, id); if (!b || b.value.cancelled)
    throw new Error("Cancelled or missing batches cannot be resumed."); return enqueue(brand, 'seo_batch', id); }); }
export async function recheckArticleAction(brand: string, id: string) { return action(brand, () => recheckSeoItem(brand, id)); }
export async function loadRetainedArticleAction(brand: string, id: string) { if (await activeBrandId() !== brand)
    return { ok: false as const, error: "The active brand changed." }; const item = readSeoBatchItem(brand, id); if (!item)
    return { ok: false as const, error: "Article item unavailable." }; return { ok: true as const, value: { revision: item.revision, brief: item.value.input, response: item.value.response, sourceSnapshots: item.value.resources } }; }
export async function createCampaignAction(brand: string, input: {
    title: string;
    productId: string;
    nodes: unknown[];
    spendingAuthorized: boolean;
    reviewed: boolean;
}) { return action(brand, () => { if (input.reviewed !== true)
    throw new Error("Review the complete task and source set first."); const campaign = createCampaign(brand, input); enqueue(brand, 'campaign', campaign.id); return campaign.id; }); }
export async function refreshCampaignAction(brand: string, id: string) { return action(brand, () => runCampaign(brand, id)); }
export async function acceptCampaignTaskAction(brand: string, id: string, node: string, revision: number, reviewed: boolean) { return action(brand, () => { if (reviewed !== true)
    throw new Error("Open and review the individual task outputs first."); return acceptCampaignTask(brand, id, node, revision); }); }
export async function applyCompoundCorrectionAction(brand: string, json: string, reviewed: boolean) { return action(brand, () => { if (!reviewed || json.length > 2000000)
    throw new Error("Review the full affected set before applying corrections."); const raw = JSON.parse(json); if (!Array.isArray(raw))
    throw new Error("Provide a correction array."); return applyArticleCorrections(brand, raw); }); }
export async function undoCompoundCorrectionAction(brand: string, id: string) { return action(brand, () => undoArticleCorrections(brand, id)); }
export async function reviewTimerAction(brand: string, operation: string, command: "start" | "stop") { return action(brand, () => { z.string().min(1).max(200).parse(operation); const prior = readCheckpoint<{
    span: string;
    active: boolean;
}>(brand, 'review-timer', operation); if (command === 'start') {
    if (prior?.value.active)
        throw new Error("A review timer is already active.");
    const span = startSpan(brand, operation, 'human_review');
    saveCheckpoint(brand, 'review-timer', operation, { span, active: true }, prior?.revision ?? 0);
}
else {
    if (!prior?.value.active)
        throw new Error("No active review timer.");
    endSpan(prior.value.span, 'passed');
    saveCheckpoint(brand, 'review-timer', operation, { ...prior.value, active: false }, prior.revision);
} return true; }); }
