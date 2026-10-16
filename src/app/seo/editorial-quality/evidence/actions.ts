"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { BoundEvidenceSchema, buildEvidencePacket, packetAtomicFacts, packetFactConflicts, contentFingerprint } from "@/lib/standalone/evidence";
import { readEvidenceSnapshot, saveEvidence, restoreEvidenceRevision } from "@/lib/standalone/store";
import { FactScopeSchema, ConflictResolutionSchema, DerivationSchema, deriveFact, factConflicts, parseLocaleValue } from "@/lib/production-evidence/facts";
import { DeliveryManifestSchema, MediaReviewInputSchema, assessDelivery, mediaReviewIdentity } from "@/lib/production-evidence/media";
import { ClaimRevisionSchema, reviewClaimRevision, assertionFromFact } from "@/lib/production-evidence/review";
import { adversarialEvidenceBenchmark } from "@/lib/production-evidence/benchmark";
import { appendEvidenceReceipt, currentEvidenceMedia, captureEvidenceFrame, frameReceiptMatches, readEvidenceWorkbench } from "@/lib/production-evidence/store";
import { db } from "@/db";
import { readArtifact } from "@/lib/seo/store";
export async function productionEvidenceAction(brandId: string, contextHash: string, operation: string, payload: unknown) {
    try {
        if (await activeBrandId() !== brandId)
            throw new Error("Active brand changed. Reload before reviewing evidence.");
        const ctx = seoContext(brandId);
        if (ctx.contextHash !== contextHash)
            throw new Error("Brand context changed. Reload the exact current sources.");
        const snapshot = readEvidenceSnapshot(brandId);
        let result: unknown;
        if (operation === "save_record") {
            const args = z.object({ record: BoundEvidenceSchema, expectedRevision: z.number().int().min(0) }).parse(payload);
            if (args.record.productIds.some(id => !ctx.products.some(p => p.id === id)))
                throw new Error("Record names a product outside this brand.");
            const old = snapshot.records.find(r => r.id === args.record.id);
            if (old && old.revision !== args.record.revision)
                throw new Error("This evidence source record changed. Reconcile its current conditions.");
            result = saveEvidence(brandId, [...snapshot.records.filter(r => r.id !== args.record.id), { ...args.record, revision: old ? old.revision + 1 : 1 }], { expectedRevision: args.expectedRevision });
        }
        else if (operation === "restore") {
            const a = z.object({ historicalRevision: z.number().int().min(0), expectedRevision: z.number().int().min(0) }).parse(payload);
            result = restoreEvidenceRevision(brandId, a.historicalRevision, a.expectedRevision);
        }
        else if (operation === "resolve") {
            const a = z.object({ resolution: ConflictResolutionSchema, expectedRevision: z.number().int().min(0) }).parse(payload);
            const selected = snapshot.records.flatMap(r => r.atomicFacts ?? []).find(f => f.id === a.resolution.selectedFactId);
            const conflict = selected && packetFactConflicts(selected.scope, snapshot.records).find(c => c.key === a.resolution.key);
            if (!conflict || !factConflicts(conflict.facts, [a.resolution]).find(c => c.key === conflict.key)?.resolution)
                throw new Error("Conflict or pinned source revisions changed. Review all current values.");
            const next = snapshot.records.map(r => r.atomicFacts?.some(f => conflict.facts.some(c => c.id === f.id)) ? { ...r, revision: r.revision + 1, resolutions: [...(r.resolutions ?? []).filter(c => c.key !== conflict.key), a.resolution] } : r);
            result = saveEvidence(brandId, next, { expectedRevision: a.expectedRevision });
        }
        else if (operation === "locale") {
            const a = z.object({ display: z.string(), locale: z.string(), type: z.enum(["number", "date"]) }).parse(payload);
            result = parseLocaleValue(a.display, a.locale, a.type);
        }
        else if (operation === "media") {
            const a = z.object({ assetId: z.string(), render: z.object({ crop: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }).nullable(), frameRange: z.object({ startMs: z.number(), endMs: z.number() }).nullable(), viewport: z.object({ width: z.number(), height: z.number() }), method: z.string(), rendition: z.string().optional() }) }).parse(payload), media = currentEvidenceMedia(brandId, a.assetId);
            result = { ...mediaReviewIdentity({ ...a.render, sha256: media.sha256 }), assetId: a.assetId, bytes: media.bytes };
        }
        else if (operation === "capture_frame") {
            const a = z.object({ assetId: z.string(), atMs: z.number().min(0), media: MediaReviewInputSchema }).parse(payload);
            if (currentEvidenceMedia(brandId, a.assetId).sha256 !== a.media.sha256)
                throw new Error("Media bytes changed; reopen its review identity.");
            result = await captureEvidenceFrame(brandId, a.assetId, a.atMs, a.media);
            if (await activeBrandId() !== brandId || seoContext(brandId).contextHash !== contextHash)
                throw new Error("Context changed during capture; no review was accepted.");
        }
        else if (operation === "derive") {
            const a = z.object({ derivation: DerivationSchema, expectedRevision: z.number().int().min(0), workspaceRevision: z.number().int().min(0) }).parse(payload);
            const facts = packetAtomicFacts(buildEvidencePacket(a.derivation.scope, snapshot.records));
            const derived = deriveFact(a.derivation, facts);
            const derivedRevision = (snapshot.records.find(r => r.id === derived.fact.id)?.revision ?? 0) + 1;
            derived.fact.authority.sourceRevision = derivedRevision;
            const record = BoundEvidenceSchema.parse({ id: derived.fact.id, kind: "fact", productIds: [derived.fact.scope.productId], markets: [derived.fact.scope.market], variants: derived.fact.scope.variant ? [derived.fact.scope.variant] : [], text: `${derived.fact.value} ${derived.fact.unit}${derived.fact.denominator ? ` per ${derived.fact.denominator.value} ${derived.fact.denominator.unit}` : ""}`, qualifiers: [], source: { id: `calculation:${derived.fact.id}`, excerpt: JSON.stringify(derived.audit) }, status: "approved", revision: 1, atomicFacts: [derived.fact], conditions: derived.fact.conditions, authority: derived.fact.authority, validUntil: derived.fact.validUntil, derivation: { spec: a.derivation, operands: derived.audit.operands, recordFingerprints: Object.fromEntries(snapshot.records.filter(r => r.atomicFacts?.some(f => a.derivation.operands.some(o => o.factId === f.id))).map(r => [r.id, contentFingerprint(r)])) } });
            record.revision = derivedRevision;
            result = db.transaction(() => { const saved = saveEvidence(brandId, [...snapshot.records.filter(r => r.id !== record.id), record], { expectedRevision: a.expectedRevision }); appendEvidenceReceipt(brandId, "derivations", derived.audit, a.workspaceRevision); return saved; }, { behavior: "immediate" });
        }
        else if (operation === "delivery") {
            const a = z.object({ assetId: z.string(), manifest: DeliveryManifestSchema, scope: FactScopeSchema, workspaceRevision: z.number().int().min(0) }).parse(payload), media = currentEvidenceMedia(brandId, a.assetId);
            if (media.productId !== a.scope.productId)
                throw new Error("Delivered asset belongs to another product.");
            const facts = packetAtomicFacts(buildEvidencePacket(a.scope, snapshot.records));
            result = assessDelivery(a.manifest, facts, a.scope, { ...a.manifest.media, sha256: media.sha256 });
            const checked = result as ReturnType<typeof assessDelivery>;
            for (const frame of a.manifest.frames.filter(f => f.basis === "actual_frame"))
                if (!frameReceiptMatches(brandId, a.assetId, frame)) {
                    checked.holds.push({ atMs: frame.atMs, reason: "Actual frame bytes are missing, changed or not in this brand's captured-frame receipts. Capture the frame before recording its observation." });
                    checked.status = "held";
                }
            appendEvidenceReceipt(brandId, "deliveries", { manifest: a.manifest, result, evidenceRevision: snapshot.revision, assetId: a.assetId, scope: a.scope }, a.workspaceRevision);
        }
        else if (operation === "prepare_claim") {
            const a = z.object({ artifactId: z.string(), factId: z.string(), scope: FactScopeSchema }).parse(payload), artifact = readArtifact(brandId, a.artifactId), facts = packetAtomicFacts(buildEvidencePacket(a.scope, snapshot.records)), fact = facts.find(f => f.id === a.factId);
            if (!artifact || artifact.productId !== a.scope.productId || !fact)
                throw new Error("Choose a current draft and applicable approved source fact.");
            const source = snapshot.records.find(r => r.atomicFacts?.some(f => f.id === fact.id))!;
            const paragraph = artifact.body.split(/\n\s*\n/).find(p => p.trim() && !/^\s*(?:#|\[Source)/.test(p)) ?? artifact.body;
            const previous = readEvidenceWorkbench(brandId).claimReviews.filter((r: any) => r.artifactId === artifact.id && r.field === "body").at(-1) as {
                after: string;
            } | undefined;
            result = { artifactId: artifact.id, artifactRevision: artifact.revision, field: "body", before: previous?.after ?? "No prior reviewed wording recorded.", after: paragraph, assertions: [{ ...assertionFromFact(fact), passage: paragraph }], sourceFacts: [fact], sourcePassage: source.source.excerpt, sourceRevision: fact.authority.sourceRevision, adjacentConditions: fact.conditions.filter(c => c.kind !== "provenance").map(c => c.text), mediaIdentity: null };
        }
        else if (operation === "claim_review") {
            const a = z.object({ revision: ClaimRevisionSchema, scope: FactScopeSchema, reviewer: z.string(), rationale: z.string(), workspaceRevision: z.number().int().min(0) }).parse(payload);
            const facts = packetAtomicFacts(buildEvidencePacket(a.scope, snapshot.records));
            const artifact = readArtifact(brandId, a.revision.artifactId);
            if (!artifact || artifact.productId !== a.scope.productId || artifact.revision !== a.revision.artifactRevision)
                throw new Error("The actual draft revision is missing or changed. Reopen its current claim review.");
            const currentField = a.revision.field === "description" ? artifact.description : a.revision.field === "title" ? artifact.title : a.revision.field === "body" || a.revision.field.startsWith("body.") ? artifact.body : "";
            const at = currentField.indexOf(a.revision.after);
            if (at < 0)
                throw new Error("The reviewed changed passage is absent from the actual current artifact field.");
            const adjacent = currentField.slice(Math.max(0, at - 300), at + a.revision.after.length + 300);
            if (a.revision.adjacentConditions.some(c => !adjacent.includes(c)))
                throw new Error("A material condition is not adjacent to this actual draft passage.");
            if (!snapshot.records.some(r => r.source.excerpt.includes(a.revision.sourcePassage) && r.atomicFacts?.some(f => a.revision.sourceFacts.some(s => s.id === f.id))))
                throw new Error("The displayed passage is not the exact current mapped source.");
            result = reviewClaimRevision(a.revision, a.scope, facts, a.reviewer, a.rationale);
            appendEvidenceReceipt(brandId, "claimReviews", { ...result as object, reviewInput: a.revision, scope: a.scope }, a.workspaceRevision);
        }
        else if (operation === "benchmark") {
            const a = z.object({ factId: z.string(), workspaceRevision: z.number().int().min(0) }).parse(payload), fact = snapshot.records.flatMap(r => r.atomicFacts ?? []).find(f => f.id === a.factId);
            if (!fact)
                throw new Error("Choose an actual mapped source tuple for the isolated controls.");
            result = adversarialEvidenceBenchmark(fact);
            appendEvidenceReceipt(brandId, "benchmarks", result, a.workspaceRevision);
        }
        else
            throw new Error("Unknown evidence operation.");
        revalidatePath("/seo/editorial-quality");
        revalidatePath("/creative-quality");
        return { ok: true as const, result };
    }
    catch (error) {
        return { ok: false as const, error: error instanceof Error ? error.message : "Evidence action failed." };
    }
}
