import "server-only";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "../env";
import { getRun, studioCopyAuthority } from "../studio/engine";
import { currentOutputs } from "../studio/outputs";
import { copyDocumentForItem, copyRequirementsForItem } from "../studio/copy-gate";
import { completeCopyApprovalMatches, completeCopyHash } from "../evaluation/copy-repair";
import { buildEvidencePacket, packetAtomicFacts } from "../standalone/evidence";
import { AssertionSchema, evaluateAssertions } from "../production-evidence/facts";
import { mediaReviewIdentity } from "../production-evidence/media";
import { hashMediaFile } from "../production-evidence/media-server";
import { readCheckpoint, saveCheckpoint } from "../production-ops/store";
import { portfolioEvidence } from "./runtime";
import { loadBrandBrain } from "../brands";
import { studioAllocation } from "./store";
import { assertCurrentSlot } from "./runtime";
import { acceptOutput } from "../production-ops/metrics";
export type ReviewCandidate = {
    id: string;
    itemId: string;
    url: string;
    label: string;
    identity: string;
    sha256: string;
    copyHash: string;
    holds: string[];
};
export async function reviewInventory(brandId: string, runId: string): Promise<ReviewCandidate[]> {
    const run = getRun(runId);
    if (!run || run.brand_id !== brandId)
        throw new Error("Choose a Studio set belonging to the active brand.");
    const result: ReviewCandidate[] = [];
    for (const item of run.items) {
        const doc = copyDocumentForItem(item), copyHash = completeCopyHash(doc), approval = completeCopyApprovalMatches(doc, item.copy_review, studioCopyAuthority(run, item), copyRequirementsForItem(item));
        for (const out of [...currentOutputs(item.outputs).map(o => ({ ...o, key: `${o.aspect}:v${o.version}` })), ...(item.variants ?? []).filter(v => v.path).map(v => ({ ...v, path: v.path!, key: `${v.aspect}:${v.id}`, qa: undefined }))]) {
            const file = path.join(env.DATA_DIR, "assets", out.path), hashed = hashMediaFile(file, [path.join(env.DATA_DIR, "assets")]), meta = await sharp(file).metadata();
            if (!meta.width || !meta.height)
                throw new Error("Output dimensions could not be read.");
            const identity = mediaReviewIdentity({ sha256: hashed.sha256, crop: null, frameRange: null, viewport: { width: meta.width, height: meta.height }, method: "studio-editorial-gallery-v1" }).identity;
            const holds = [...(!approval ? ["Complete delivered-copy approval is missing or stale."] : []), ...(out.copy_status !== "approved" || out.copy_content_hash !== copyHash ? ["These exact delivered pixels have no current copy-content binding; approve the current output after inspecting its text."] : []), ...(out.qa?.status === "fail" ? ["The actual image has unresolved failed QA findings."] : [])];
            result.push({ id: `${item.id}:${out.key}`, itemId: item.id, url: `/api/assets/${out.path.split(path.sep).join("/")}`, label: `${run.product_id} · ${item.id} · ${item.plan?.argument || item.label} · ${out.aspect} · ${out.key} · ${holds.length ? "held" : "awaiting editorial decision"}`, identity, sha256: hashed.sha256, copyHash, holds });
        }
    }
    return result;
}
export const DecisionsSchema = z.object({ runId: z.string().min(1), decisions: z.array(z.object({ id: z.string().min(1), identity: z.string().min(1), copyHash: z.string().min(1), seen: z.boolean(), allocationConfirmed: z.boolean().default(false), decision: z.enum(["accept", "hold", "reject"]), note: z.string().max(3000), assertions: z.array(AssertionSchema).max(100) })).min(1).max(100) }).superRefine((v, c) => { if (new Set(v.decisions.map(d => d.id)).size !== v.decisions.length)
    c.addIssue({ code: "custom", message: "Duplicate decisions are not allowed." }); });
export async function batchReview(brandId: string, raw: z.input<typeof DecisionsSchema>) {
    const input = DecisionsSchema.parse(raw), inventory = await reviewInventory(brandId, input.runId), run = getRun(input.runId)!, brain = loadBrandBrain(brandId), scope = { productId: run.product_id, market: brain.brand.market };
    const records = portfolioEvidence(brandId), packet = buildEvidencePacket(scope, records.filter(r => r.productIds.includes(scope.productId) && r.markets.includes(scope.market)));
    const receipts = input.decisions.map(d => {
        const item = inventory.find(i => i.id === d.id), holds = [...(item?.holds ?? ["The output was removed or is not a current delivered output."])];
        if (!d.seen)
            holds.push("This output was not opened for the current editorial review.");
        if (item && (item.identity !== d.identity || item.copyHash !== d.copyHash))
            holds.push("Pixels, copy or render conditions changed after inspection; inspect this revision again.");
        const allocation = item ? studioAllocation(brandId, run.id, run.items.findIndex(i => i.id === item.itemId)) : null;
        if (allocation) {
            try {
                assertCurrentSlot(brandId, allocation.row.plan, allocation.slot);
            }
            catch (error) {
                holds.push(String(error));
            }
            if (!d.allocationConfirmed)
                holds.push("Inspect and confirm that the delivered buyer argument, grammar, proof mode and retained art locks realize this reserved slot.");
            if (allocation.slot.status !== "ready")
                holds.push(...allocation.slot.reasons);
        }
        const receiptPacket = allocation ? buildEvidencePacket(scope, records.filter(r => allocation.slot.evidenceIds.includes(r.id))) : packet, facts = packetAtomicFacts(receiptPacket), tuples = evaluateAssertions(d.assertions, facts, scope);
        for (const t of tuples)
            if (t.status !== "supported")
                holds.push(...t.reasons);
        if (item && facts.length && !d.assertions.length && /\d/.test(run.items.find(i => i.id === item.itemId)?.plan?.text_elements.map(t => t.text).join(" ") ?? ""))
            holds.push("Record the delivered quantity assertions with subject, unit and denominator before accepting numeric copy.");
        return { id: randomUUID(), artifact: d.id, runId: run.id, decision: d.decision, status: d.decision === "accept" ? (holds.length ? "held" : "accepted_editorial") : d.decision === "reject" ? "rejected" : "held", holds, identity: item?.identity ?? d.identity, sha256: item?.sha256, copyHash: item?.copyHash ?? d.copyHash, evidenceFingerprint: receiptPacket.fingerprint, tupleReviews: tuples, seen: d.seen, allocationConfirmed: d.allocationConfirmed, distinctKey: allocation ? `${allocation.slot.argumentKey}:${allocation.slot.grammar}:${JSON.stringify(allocation.slot.world)}` : `studio:${run.id}:${d.id}`, reviewer: "active-brand editor", note: d.note, at: new Date().toISOString(), marketEffect: "unknown" };
    });
    const checkpoint = readCheckpoint<{
        receipts: typeof receipts;
    }>(brandId, "studio-editorial-receipts", run.id);
    saveCheckpoint(brandId, "studio-editorial-receipts", run.id, { receipts: [...(checkpoint?.value.receipts ?? []), ...receipts] }, checkpoint?.revision ?? 0);
    for (const receipt of receipts)
        acceptOutput({ brand: brandId, artifact: `studio:${run.id}:${receipt.artifact}`, revision: (checkpoint?.revision ?? 0) + 1, contentHash: receipt.identity + ":" + receipt.copyHash + ":" + receipt.evidenceFingerprint, distinctKey: receipt.distinctKey, state: receipt.status === "accepted_editorial" ? "accepted" : "held" });
    return { runId: run.id, receipts, unseenOrUnselected: inventory.filter(i => !input.decisions.some(d => d.id === i.id)).map(i => ({ id: i.id, status: "held; no decision" })), accepted: receipts.filter(r => r.status === "accepted_editorial").length };
}
