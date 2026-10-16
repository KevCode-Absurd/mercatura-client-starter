import type { AuditItem, StudioItem } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import { wholeClaim } from "../copy/figures";
import { PRIMARY_WORDS } from "../copy/stage";
import { AWARENESS_STAGES, type AwarenessStage } from "../taxonomy";
import { env } from "../env";
import { applyCompleteCopyPatches, completeCopyApprovalMatches, completeCopyPacket, CompleteCopyReadSchema, CompleteCopySpanPatchSchema, finalizeCompleteCopyReview, materializeCompleteCopySpanPatches, type CompleteCopyDocument, type CompleteCopyRequirements, type CompleteCopyReview, type CopyAuthority, type CopyAuthoritySource, } from "../evaluation/copy-repair";
import { aboutAnotherProduct, claimsOfProduct, offersFor } from "../llm/context";
import { callStructured, LlmCallError } from "../llm/gateway";
import { RunStoppedError } from "../llm/run-control";
import { completeCopyRepairPrompt } from "./feed";
import { REVIEW_QUALITY_CONTRACT } from "../creative-brand-contract";
export const COMPLETE_COPY_REVIEW_RULES = `${REVIEW_QUALITY_CONTRACT}\nFor this pre-render pass check planned copy and supplied placement; actual pixels require a later image inspection. Required brand voice, clarity, buyer logic and CTA failures are blocking style/brief issues, not optional editorial advice. Brand voice and the buyer brief are supplied authority sources for these checks, never factual product evidence. Read every supplied delivered copy field before image rendering. Return contentHash and evidenceHash exactly as supplied, checkedPaths containing every supplied field path exactly once, and issues with exact fieldPath, exact contiguous offendingText, severity, category, reason, sourceIds and smallestCorrection. A fine field has no issue. Empty optional fields are fine; requested missing fields and lengths are checked by code.
Use only the supplied authority sources for factual support, preserving their product scope, status and provenance. Layout references, ads, personas and brand voice cannot substantiate outcomes. Check the full argument, all overlays, each primary-text/headline alternative, description and CTA. Overlay fields on one image are one presented surface: adjacent readable attribution can qualify its headline; inspect planned role/placement and require actual pixel legibility after rendering, rather than repeating the complete denominator in every line. Each editable image variant is its own surface. A qualification elsewhere in a different ad/alternative, or only in an optional description missing in some placements, cannot repair this alternative. Match the survey denominator, study measure, direction, comparator, introductory or subscription terms and complete guarantee conditions. A survey finding is not evidence for an invented cause, and a money-back guarantee is not a personal outcome promise.
Read actual wording literally. Saying that a pack contains or gives a supported ingredient/vitamin count, including compact wording such as "1 pack: 6 pieces", does not itself claim medical treatment or replace every supplement. Commonly equivalent everyday packaging nouns such as daily pack/sachet do not change the supplied count, contents, dose or SKU; flag an actual unit mismatch rather than demanding one noun verbatim. Ordinary convenience wording such as no prep/no mixing does not promise a sealed package never needs opening. An ordinary figurative convenience description is not automatically an efficacy promise. Do not invent a whole-food implication, replacement claim or platform rule absent from the actual wording. Product variants explicitly supported by the supplied authority may be named without claiming a price or another SKU's offer.
An issue must identify an actual defective span and a necessary correction. If the wording is supported and no correction is needed, return no issue; do not add a factual warning merely to settle a question or restate that the source supports the formula. Fields marked metadata are retained provenance, not delivered words: acknowledge their checkedPaths but never route a word repair to them. Source observations without an actual offending copy span may be returned separately in sourceNotes as {sourceIds,note}. If source uncertainty actually makes a delivered claim unsupported, report that exact delivered span as a blocking/warning issue. Optional editorial advice uses severity advisory AND category style; factual/offer categories cannot be harmless advisory advice.
Report unsupported claims, unverified customer history, changed figures and commercial terms as blocking; uncertain factual/qualification/requirement issues are warning and block approval until settled. Only optional style suggestions may be advisory. Do not invent a platform rule or blanket pronoun prohibition. Neutral/conditional you, brand-authored we and supported guarantee wording are allowed. A fictional avatar is an actor, not evidence of authentic first-person customer experience. Supplied verified quotes may retain their exact wording and attribution. Cite only actual supplied source IDs, including the protocol authority when evidence is absent. Request the smallest change in the failing field and preserve successful copy. A correction removes or narrows. It never names a replacement fact.`;
export function copyAuthorityForBrand(brand: BrandBrain, productId?: string | null, guardrails: readonly {
    id: string;
    rule: string;
}[] = [], verifiedQuotes: readonly {
    id: string;
    text: string;
    source: string;
}[] = []): CopyAuthority {
    const sources: CopyAuthoritySource[] = claimsOfProduct(brand, productId)
        .filter(c => c.origin !== "ad" && c.source.trim() && !/\b(?:not reviewed in the app|published by the brand; not reviewed|winning[- ]ads|ad[- ]library)\b|^\s*Ad:/i.test(c.source))
        .map(c => ({ id: c.id, kind: "approved_claim", text: wholeClaim(c), provenance: { origin: c.origin ?? "brand", source: c.source, status: c.status } }));
    const product = brand.products.find(p => p.id === productId);
    if (product)
        sources.push({ id: `product/${product.id}`, kind: "approved_claim", text: [product.name, product.format, product.counted, ...(product.specs ?? []).map(s => `${s.name}: ${s.value}`)].filter(Boolean).join(". "), provenance: { origin: "brand", source: "Configured selected-product specification", status: "documented" } });
    for (const offer of offersFor(brand, productId).filter(o => !/^off_x_/i.test(o.id) && !aboutAnotherProduct(brand, productId, `${o.name}. ${o.notes ?? ""}`)))
        sources.push({ id: offer.id, kind: "approved_offer", text: `${offer.name}. Price: ${brand.brand.currency} ${offer.price}${offer.per_day !== undefined ? `; ${brand.brand.currency} ${offer.per_day} per day` : ""}. ${offer.notes ?? ""}`, provenance: { origin: "brand", source: "Configured brand offer; live freshness is not independently verified by this read", status: "documented" } });
    if (brand.guarantee)
        sources.push({ id: brand.guarantee.id, kind: "guarantee", text: brand.guarantee.text, provenance: { origin: "brand", source: "Configured complete guarantee wording", status: "documented" } });
    brand.forbidden_claims.forEach((text, i) => sources.push({ id: `brand-forbidden/${i + 1}`, kind: "brand_guardrail", text: `Do not state or imply: ${text}`, provenance: { origin: "brand", source: "Configured forbidden claim", status: "active" } }));
    guardrails.forEach(g => sources.push({ id: `brand-rule/${g.id}`, kind: "brand_guardrail", text: g.rule, provenance: { origin: "brand", source: g.id, status: "active" } }));
    verifiedQuotes.forEach(q => sources.push({ id: q.id, kind: "verified_quote", text: q.text, provenance: { origin: "customer", source: q.source, status: "verified_wording" } }));
    return { productId, market: `${brand.brand.market}; ${brand.brand.currency}; ${brand.brand.locale_accent}`, sources };
}
export interface CompleteCopyServiceOptions {
    brandId: string;
    refId: string;
    refType?: string;
    requirements?: CompleteCopyRequirements;
    model?: string;
    pin?: boolean;
    task?: string;
    previousReview?: CompleteCopyReview;
}
export async function reviewCompleteCopy(document: CompleteCopyDocument, authority: CopyAuthority, options: CompleteCopyServiceOptions) {
    const packet = completeCopyPacket(document, authority, options.requirements);
    if (completeCopyApprovalMatches(document, options.previousReview, authority, options.requirements))
        return { review: options.previousReview!, packet, callIds: [] as string[], reused: true };
    const callIds: string[] = [];
    if (env.LLM_MODE !== "live") {
        const review = finalizeCompleteCopyReview(packet, undefined);
        review.verificationErrors = ["A live complete-copy reader is required; mock output is not approval."];
        return { review, packet, callIds, reused: false };
    }
    try {
        const perCall = packet.authority.sources.filter(s => s.kind === "brief");
        const stable = { ...packet.authority, sources: packet.authority.sources.filter(s => s.kind !== "brief") };
        const response = await callStructured({ brandId: options.brandId, task: options.task ?? "studio_claims", model: options.model ?? env.MODEL_VOICE, pin: options.pin ?? !!options.model, refType: options.refType ?? "studio", refId: options.refId, schema: CompleteCopyReadSchema, effort: "low", maxTokens: 6000, system: COMPLETE_COPY_REVIEW_RULES, user: `Authority and protocol:\n${JSON.stringify(stable)}\n\n=== PER CALL ===\n${JSON.stringify({ schemaVersion: packet.schemaVersion, contentHash: packet.contentHash, evidenceHash: packet.evidenceHash, briefSources: perCall, requirements: packet.requirements, fields: packet.fields })}` });
        callIds.push(response.callId);
        return { review: finalizeCompleteCopyReview(packet, response.data), packet, callIds, reused: false };
    }
    catch (error) {
        if (error instanceof RunStoppedError)
            throw error;
        if (error instanceof LlmCallError)
            callIds.push(error.callId);
        const review = finalizeCompleteCopyReview(packet, undefined);
        review.verificationErrors.push(`The complete-copy reader failed: ${(error as Error).message.slice(0, 240)}`);
        return { review, packet, callIds, reused: false };
    }
}
export interface CompleteCopyRepairOptions extends Omit<CompleteCopyServiceOptions, "previousReview"> {
    reviewModel?: string;
    reviewTask?: string;
    brandVoice?: string;
}
export async function repairReviewedCopy<T extends CompleteCopyDocument>(document: T, authority: CopyAuthority, review: CompleteCopyReview, options: CompleteCopyRepairOptions) {
    const packet = completeCopyPacket(document, authority, options.requirements);
    if (review.status === "unverified" || review.verificationErrors.length || review.contentHash !== packet.contentHash || review.evidenceHash !== packet.evidenceHash)
        throw new Error("Repair requires a valid current complete-copy review against this authority.");
    if (completeCopyApprovalMatches(document, review, authority, options.requirements))
        return { document: structuredClone(document), review, changes: [], requiresImageRepair: false, callIds: [] as string[] };
    if (env.LLM_MODE !== "live")
        throw new Error("A live span writer is required; mock output is not a copy repair.");
    const prompt = completeCopyRepairPrompt(packet, review.issues, options.brandVoice);
    const written = await callStructured({ brandId: options.brandId, task: options.task ?? "studio_copy_repair", model: options.model ?? env.MODEL_COPY, pin: options.pin ?? !!options.model, refType: options.refType ?? "studio", refId: options.refId, schema: CompleteCopySpanPatchSchema, effort: "low", maxTokens: 6000, system: prompt.system, user: prompt.user });
    const patched = applyCompleteCopyPatches(document, review.issues, materializeCompleteCopySpanPatches(document, review.issues, written.data.patches), options.requirements);
    const checked = await reviewCompleteCopy(patched.document, authority, { ...options, task: options.reviewTask ?? "studio_claims", model: options.reviewModel ?? env.MODEL_VOICE, previousReview: undefined });
    return { document: patched.document, review: checked.review, changes: patched.changes, requiresImageRepair: patched.requiresImageRepair, callIds: [written.callId, ...checked.callIds] };
}
export const copyDocumentForItem = (item: StudioItem): CompleteCopyDocument => ({ text_elements: item.plan?.text_elements ?? [], ad_copy: item.plan?.ad_copy, ...(item.variants ? { variants: item.variants } : {}) });
export const copyRequirementsForItem = (item: StudioItem): CompleteCopyRequirements => {
    if (item.copy_requirements)
        return item.copy_requirements;
    if (!item.plan?.ad_copy)
        return {};
    const stage = (AWARENESS_STAGES as readonly string[]).includes(item.plan.awareness ?? "") ? item.plan.awareness as AwarenessStage : null;
    return { primary: true, ...(stage ? { primaryWords: { minWords: PRIMARY_WORDS[stage][0], maxWords: PRIMARY_WORDS[stage][1] } } : {}) };
};
export function invalidateCopyApproval(item: StudioItem): void {
    delete item.copy_review;
    delete item.copy_draft_review;
    if (item.copy_draft) {
        delete item.copy_draft.approved_at;
        delete item.copy_draft.approval_hash;
    }
    for (const candidate of [...item.outputs, ...(item.variants ?? [])])
        if (candidate.copy_status === "approved")
            candidate.copy_status = "draft";
}
export const HOLDING_CATEGORIES = new Set(["claim", "offer", "testimonial", "personal_attribute", "qualification"]);
export const holdsRender = (issue: Pick<CompleteCopyReview["issues"][number], "severity" | "category">): boolean => issue.severity !== "advisory" && HOLDING_CATEGORIES.has(issue.category);
export function copyHoldReason(item: StudioItem, authority: CopyAuthority, strict: boolean): string | null {
    if (!strict)
        return null;
    const review = item.copy_review;
    if (!review)
        return "its words have not been read yet";
    const document = copyDocumentForItem(item);
    const requirements = copyRequirementsForItem(item);
    if (completeCopyApprovalMatches(document, review, authority, requirements))
        return null;
    const packet = completeCopyPacket(document, authority, requirements);
    if (review.contentHash !== packet.contentHash || review.evidenceHash !== packet.evidenceHash)
        return "its words changed since they were read";
    if (review.status === "unverified" || review.verificationErrors.length)
        return "the claims read did not finish";
    const open = review.issues.filter(holdsRender);
    return open.length ? `${open[0].fieldPath}: ${open[0].reason}` : null;
}
export function assertCompleteCopyRenderApproval(item: StudioItem, authority: CopyAuthority, live: boolean, _force?: boolean, strict = true): void {
    if (!live)
        return;
    const why = copyHoldReason(item, authority, strict);
    if (why)
        throw new Error(`${item.label || item.id}: approve the complete current copy before rendering (${why}). Resolve failing fields or an unverified reader; force cannot bypass this gate.`);
}
export function completeCopyAudit(review: CompleteCopyReview, index: number): AuditItem[] {
    const issues: AuditItem[] = review.issues.map(issue => ({ check: "claims_judge", status: holdsRender(issue) ? "fail" : "warn", message: `Image ${index + 1}, ${issue.fieldPath}, "${issue.offendingText}": ${issue.reason} Smallest correction: ${issue.smallestCorrection}`, line_index: index, field_path: issue.fieldPath, offending_text: issue.offendingText, source_ids: issue.sourceIds, category: issue.category, smallest_correction: issue.smallestCorrection }));
    if (review.status === "unverified")
        issues.push({ check: "claims_judge", status: "fail", message: `Image ${index + 1}: complete-copy approval is unverified. ${review.verificationErrors.join(" ")}`, line_index: index });
    return issues;
}
