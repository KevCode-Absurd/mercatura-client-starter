"use server";
import { activeBrandId } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { allocatePortfolio, transformArgument, proofPresentation, type PortfolioRequest } from "@/lib/production-portfolio/core";
import { createPortfolio, readPortfolio, savePortfolio } from "@/lib/production-portfolio/store";
import { assertCurrentPlan, portfolioEvidence } from "@/lib/production-portfolio/runtime";
import { auditionImage, derivative, originalAssets } from "@/lib/production-portfolio/assets";
import { auditionSvg } from "@/lib/production-portfolio/auditions";
import { createRun } from "@/lib/studio/engine";
import { batchReview, reviewInventory } from "@/lib/production-portfolio/review";
import { type AtomicAssertion } from "@/lib/production-evidence/facts";
export async function allocateAction(input: PortfolioRequest) { const brandId = await activeBrandId(), brain = loadBrandBrain(brandId); if (!brain.products.some(p => p.id === input.scope.productId) || input.scope.market !== brain.brand.market)
    throw new Error("Choose the active brand's product and configured market."); return createPortfolio(brandId, allocatePortfolio(input, portfolioEvidence(brandId))); }
export async function auditionAction(id: string, sourceId?: string) { const brandId = await activeBrandId(), row = readPortfolio(brandId, id); assertCurrentPlan(brandId, row.plan); const available = originalAssets(brandId, row.plan.request.scope); const source = sourceId ? available.find(a => a.id === sourceId) : available[0]; if (!source)
    throw new Error("A contained reference for this product is required for pixel-preserving auditions."); const image = await auditionImage(source); return { source: { id: source.id, name: source.name, sha256: source.sha256 }, sources: available.map(a => ({ id: a.id, name: a.name, sha256: a.sha256, authenticity: a.authenticity })), boards: row.plan.slots.filter(s => s.status === "ready").map(slot => ({ id: slot.id, svg: auditionSvg(row.plan, slot, image) })) }; }
export async function selectAuditionsAction(id: string, revision: number, selected: string[], sourceId?: string) { const brandId = await activeBrandId(), row = readPortfolio(brandId, id); assertCurrentPlan(brandId, row.plan); if (row.revision !== revision)
    throw new Error("Reload the portfolio before selecting auditions."); if (!selected.length || selected.length > 12 || new Set(selected).size !== selected.length || selected.some(id => !row.plan.slots.some(s => s.id === id && s.status === "ready")))
    throw new Error("Choose between 1 and12 distinct ready auditions."); const source = originalAssets(brandId, row.plan.request.scope).find(a => a.id === sourceId); if (!source)
    throw new Error("Choose and inspect a contained audition source first."); row.auditionSource = { id: source.id, sha256: source.sha256, name: source.name, rel: decodeURIComponent(source.url.slice("/api/brand-file/assets/".length)) }; row.selectedSlots = selected; return savePortfolio(row, revision); }
export async function studioPortfolioAction(id: string, revision: number) { const brandId = await activeBrandId(), row = readPortfolio(brandId, id); assertCurrentPlan(brandId, row.plan); if (row.revision !== revision || !row.selectedSlots.length)
    throw new Error("Save your audition selection before creating the Studio set."); const source = originalAssets(brandId, row.plan.request.scope).find(a => a.id === row.auditionSource?.id && a.sha256 === row.auditionSource?.sha256); if (!source)
    throw new Error("The selected original-reference bytes changed; rebuild and inspect auditions."); const existing = row.studioRuns.find(r => r.fingerprint === row.plan.fingerprint && r.assetSha === source.sha256 && JSON.stringify(r.slots) === JSON.stringify(row.selectedSlots)); if (existing)
    return existing.id; const slots = row.selectedSlots.map(id => row.plan.slots.find(s => s.id === id)!); const runId = createRun({ brandId, kind: "ad", productId: row.plan.request.scope.productId, title: row.plan.request.name, picks: slots.map((s, n) => ({ slot: n + 1, type: "portfolio", label: `${s.id}: ${s.grammar}`, direction: `Reserved argument ${s.argumentId}; mechanism ${s.mechanismId}; ${s.grammar}; ${s.proofMode}. World: ${JSON.stringify(s.world)}. This is illustrative staging, never a real test.` })), aspects: ["1:1"], productImages: [source.name], noOffer: true, claimChecks: true, auto: false }); row.studioRuns.push({ id: runId, slots: row.selectedSlots, fingerprint: row.plan.fingerprint, assetSha: source.sha256 }); savePortfolio(row, revision); return runId; }
export async function transformAction(id: string, slotId: string, format: "static" | "carousel" | "video" | "landing" | "seo") { const brandId = await activeBrandId(), row = readPortfolio(brandId, id), records = assertCurrentPlan(brandId, row.plan); return { ...transformArgument(row.plan, slotId, format, records), presentation: proofPresentation(row.plan, slotId, records) }; }
export async function derivativeAction(id: string, input: Parameters<typeof derivative>[2]) { const brandId = await activeBrandId(), row = readPortfolio(brandId, id), records = assertCurrentPlan(brandId, row.plan); return derivative(brandId, row.plan.request.scope, input, records); }
export async function inventoryAction(runId: string) { return reviewInventory(await activeBrandId(), runId); }
export async function batchReviewAction(input: {
    runId: string;
    decisions: {
        id: string;
        identity: string;
        copyHash: string;
        seen: boolean;
        allocationConfirmed?: boolean;
        decision: "accept" | "hold" | "reject";
        note: string;
        assertions: AtomicAssertion[];
    }[];
}) { return batchReview(await activeBrandId(), input); }
