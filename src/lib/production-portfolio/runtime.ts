import path from "node:path";
import { brandBrainDir } from "../brand-brain";
import { getBrandRow } from "../brands";
import { hashMediaFile } from "../production-evidence/media-server";
import { buildEvidencePacket } from "../standalone/evidence";
import { loadBrandBrain } from "../brands";
import { readEvidence } from "../standalone/store";
import { seedEvidence } from "../standalone/creative";
import { allocatePortfolio, portfolioDirective, type PortfolioPlan, type Allocation } from "./core";
import { studioAllocation } from "./store";
export function portfolioEvidence(brandId: string) { const held = readEvidence(brandId); return held.length ? held : seedEvidence(loadBrandBrain(brandId)); }
export function assertCurrentPlan(brandId: string, plan: PortfolioPlan) {
    const records = portfolioEvidence(brandId), current = allocatePortfolio(plan.request, records);
    if (current.fingerprint !== plan.fingerprint)
        throw new Error("Portfolio evidence, source conditions or allocation changed. Rebuild and inspect the allocation before generating.");
    return records;
}
export function assertCurrentSlot(brandId: string, plan: PortfolioPlan, slot: Allocation) { const records = portfolioEvidence(brandId), packet = buildEvidencePacket(plan.request.scope, records.filter(r => slot.evidenceIds.includes(r.id))); if (!slot.evidenceFingerprint || packet.fingerprint !== slot.evidenceFingerprint || packet.records.some(r => !r.eligible) || packet.records.length !== slot.evidenceIds.length)
    throw new Error("This reserved slot's source content, condition, scope or approval changed. Rebuild and inspect this slot before generation/review."); return records; }
export function studioPortfolioDirective(brandId: string, runId: string, index: number) {
    const held = studioAllocation(brandId, runId, index);
    if (!held)
        return "";
    const records = assertCurrentSlot(brandId, held.row.plan, held.slot);
    if (held.binding.assetSha) {
        const source = held.row.auditionSource, brand = getBrandRow(brandId);
        if (!source?.rel || !brand || source.sha256 !== held.binding.assetSha)
            throw new Error("The selected audition source binding changed. Rebuild its audition.");
        const root = path.join(brandBrainDir(brand.dir), "assets");
        if (hashMediaFile(path.join(root, ...source.rel.split("/")), [root]).sha256 !== held.binding.assetSha)
            throw new Error("The selected audition source bytes changed. Inspect a new board before generation.");
    }
    if (held.slot.status !== "ready" || !held.row.selectedSlots.includes(held.slot.id))
        throw new Error("This portfolio slot is blocked or its staging audition was not selected.");
    return `\nIMMUTABLE RESERVED PORTFOLIO SLOT:\n${JSON.stringify(portfolioDirective(held.row.plan, held.slot, records))}\nThe buyer need/decision is a planning hypothesis, not a first-person customer account. State only the held eligible facts and adjacent material conditions. The planned scene must realize the assigned grammar, proof mode and world; unavailable evidence is a hold, never permission to invent it.`;
}
