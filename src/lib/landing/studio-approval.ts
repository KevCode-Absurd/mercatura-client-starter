import { createHash } from "node:crypto";
import { ReviewInputSchema, type CroRun, type CroReviewFinding, type CroApproval } from "./studio-types";
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function listReviewFindings(run: CroRun): CroReviewFinding[] {
    const entries: CroReviewFinding[] = [];
    const add = (prefix: string, sourceUrl: string, audit: CroRun["audit"]) => {
        for (const finding of audit?.findings || [])
            entries.push({ key: `${prefix}:${finding.id}`, sourceUrl, finding });
    };
    add("main", run.evidence?.url || run.request.sourceUrl || run.brand.siteUrl || "", run.audit);
    for (const coverage of run.coverage) {
        if (coverage.evidenceId && coverage.evidenceId === run.evidence?.id)
            continue;
        add(`coverage:${coverage.evidenceId || digest(coverage.url).slice(0, 20)}`, coverage.url, coverage.audit);
    }
    if (new Set(entries.map(entry => entry.key)).size !== entries.length)
        throw new Error("The audit contains duplicate finding identities. Run the audit again before approving.");
    return entries;
}
export function croAuditHash(run: CroRun): string {
    const { build: _, ...request } = run.request;
    return digest({ request, brandHash: run.brand.hash, kind: run.auditKind || "page", evidence: run.evidence?.id, inspiration: run.inspirationEvidence?.id, audit: run.audit, coverage: run.coverage, directions: run.directions });
}
const reviewHash = (run: CroRun) => digest(run.review ? { decisions: [...run.review.decisions].sort((a, b) => a.findingKey.localeCompare(b.findingKey)), customerNotes: run.review.customerNotes, redesignMode: run.review.redesignMode, selectedDirectionId: run.review.selectedDirectionId } : null);
export function saveCroReview(run: CroRun, input: unknown): void {
    if (!run.audit)
        throw new Error("Complete the audit or first-principles readiness review before reviewing findings.");
    const review = ReviewInputSchema.parse(input), known = new Set(listReviewFindings(run).map(entry => entry.key));
    if (new Set(review.decisions.map(d => d.findingKey)).size !== review.decisions.length)
        throw new Error("Choose one decision per finding.");
    if (review.decisions.some(d => !known.has(d.findingKey)))
        throw new Error("A finding changed or does not belong to this audit. Reload the review.");
    if (review.selectedDirectionId && !run.directions?.directions.some(d => d.id === review.selectedDirectionId))
        throw new Error("Choose a visual direction from this review.");
    run.review = { ...review, updatedAt: new Date().toISOString(), auditHash: croAuditHash(run) };
    delete run.approval;
    run.request.build = false;
}
export function approveCroReview(run: CroRun): CroApproval {
    if (!run.audit || !run.review)
        throw new Error("Review the audit before approving generation.");
    if (!["review", "done"].includes(run.status))
        throw new Error("Wait for the complete audit before approving. Retry an incomplete audit first.");
    if (run.review.auditHash !== croAuditHash(run))
        throw new Error("The audit changed after these decisions were saved. Review it again before approving.");
    if (run.directions?.directions.length && !run.directions.directions.some(d => d.id === run.review!.selectedDirectionId))
        throw new Error("Select a visual direction before approving.");
    const findings = listReviewFindings(run), decisions = new Map(run.review.decisions.map(d => [d.findingKey, d]));
    if (findings.some(f => !decisions.has(f.key)) || decisions.size !== findings.length)
        throw new Error("Accept or reject every finding before approving.");
    if (!run.review.decisions.some(d => d.decision === "accept") && !run.review.customerNotes.trim())
        throw new Error("Accept a finding or add a note describing what to build or retain unchanged.");
    const approval: CroApproval = { approvedAt: new Date().toISOString(), runRevision: run.revision + 1, auditHash: croAuditHash(run), reviewHash: reviewHash(run), acceptedFindings: findings.filter(f => decisions.get(f.key)?.decision === "accept").map(f => ({ ...structuredClone(f), note: decisions.get(f.key)!.note })), customerNotes: run.review.customerNotes, redesignMode: run.review.redesignMode, selectedDirectionId: run.review.selectedDirectionId };
    run.approval = approval;
    return approval;
}
export function assertCroApproved(run: CroRun): CroApproval {
    if (!run.audit || !run.review || !run.approval)
        throw new Error("Review the audit, accept or reject its findings, then explicitly approve before generating.");
    if (run.approval.auditHash !== croAuditHash(run) || run.approval.reviewHash !== reviewHash(run))
        throw new Error("The audit or review changed. Approve the current review before generating.");
    return run.approval;
}
export function approvedGenerationInput(run: CroRun) {
    const approval = assertCroApproved(run);
    return { acceptedFindings: approval.acceptedFindings, customerNotes: approval.customerNotes, redesignMode: approval.redesignMode, selectedDirectionId: approval.selectedDirectionId };
}
