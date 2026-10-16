import type { CroRun, CroAudit } from "./studio-types";
import { getEvidence, type PageEvidence } from "./evidence";
import { findingEvidence, inspectionSummary, UNTESTED_PURCHASE_BEHAVIOR } from "./evidence-inspection";
import { assertCroApproved, listReviewFindings } from "./studio-approval";
const line = (value: string) => value.replace(/[\r\n]+/g, " ").replace(/\|/g, "\\|");
function coverageEvidence(run: CroRun, id?: string): PageEvidence | undefined {
    if (!id)
        return undefined;
    if (id === run.evidence?.id)
        return run.evidence;
    const evidence = getEvidence(id);
    return evidence?.brandId === run.brandId ? evidence : undefined;
}
function captureReport(evidence?: PageEvidence): string {
    if (!evidence)
        return "No page capture loaded; no live-page behavior established.\n";
    return [
        `Capture: \`${evidence.id}\` · ${evidence.capturedAt} · ${line(evidence.url)}`,
        ...inspectionSummary(evidence).map(summary => `- ${line(summary)}`),
        ...evidence.warnings.map(warning => `- Limitation: ${line(warning)}`),
        UNTESTED_PURCHASE_BEHAVIOR,
        "Observed controls (appearance/state only):",
        ...(["mobile", "desktop"] as const).flatMap(device => evidence[device].inspection?.controls.map(control => `- ${device}, ${control.sectionId || "outside mapped sections"}, ${control.id}: ${line(control.label)} · ${control.kind} · ${control.disabled ? "disabled" : "not marked disabled"}${control.target ? ` · ${line(control.target)}` : ""}`) ?? []),
    ].join("\n\n");
}
function auditReport(audit: CroAudit | undefined, decisions: Map<CroAudit["findings"][number], string>, evidence?: PageEvidence): string {
    if (!audit)
        return "No audit was completed for this page.\n";
    return `${audit.summary}\n\n### What is working\n\n${audit.strengths.map(s => `- ${line(s)}`).join("\n") || "- Not assessed."}\n\n### Assessment coverage\n\n| Criterion | Result | Evidence |\n|---|---|---|\n${audit.checks.map(c => `| ${c.id.replace(/_/g, " ")} | ${c.status.replace(/_/g, " ")} | ${line(c.evidence)} |`).join("\n")}\n\n### Proposed findings and review decisions\n\n${audit.findings.map((f, i) => `#### ${i + 1}. ${f.title}\n\n- Review: ${decisions.get(f) || "Not reviewed; not approved for implementation"}.\n- Priority: ${f.priority}; confidence: ${f.confidence}.\n- Location: ${f.viewport}, section \`${f.sectionId}\`; finding \`${f.id}\`.\n- Source reference: ${evidence ? findingEvidence(evidence, f).reference : "No capture loaded"}.\n- Evidence basis: ${evidence ? findingEvidence(evidence, f).label : "No page observation established"}.\n- Observed: ${line(f.observation)}\n- Evidence: ${line(f.evidenceQuote)}\n- Change: ${line(f.recommendation)}\n- Test metric: ${line(f.metric)}\n- Knowledge references: ${f.knowledgeIds.join(", ") || "None supplied"}.`).join("\n\n") || "No findings recorded."}\n\n### Unknowns\n\n${audit.unknowns.map(s => `- ${line(s)}`).join("\n") || "- None recorded."}\n`;
}
export function exportCroReport(run: CroRun): string {
    let approved = false;
    try {
        assertCroApproved(run);
        approved = true;
    }
    catch { }
    const decisions = new Map(listReviewFindings(run).map(entry => { const choice = run.review?.decisions.find(d => d.findingKey === entry.key); return [entry.finding, choice?.decision === "reject" ? "Rejected — excluded from the build" : choice?.decision === "accept" ? (approved ? "Accepted and approved" : "Accepted draft — approval still required") : "Not reviewed; not approved for implementation"] as const; }));
    const authorization = approved ? `Scope approved ${run.approval!.approvedAt}. Only the accepted changes and customer instructions below are authorized.\n\n${run.approval!.acceptedFindings.map(entry => `- ${line(entry.finding.title)}: ${line(entry.finding.recommendation)}${entry.note ? ` — Customer note: ${line(entry.note)}` : ""}`).join("\n")}\n\nCustomer instructions: ${line(run.approval!.customerNotes) || "None"}\n\nDesign scope: ${run.approval!.redesignMode}. Direction: ${run.approval!.selectedDirectionId || "Existing project"}.` : "No current build approval. Findings below are proposals, not implementation instructions. Review all decisions and explicitly approve before generating a page.";
    return `# CRO implementation report: ${line(run.blueprint?.title || run.brand.productName || run.brand.name)}\n\nBrand: ${line(run.brand.name)}\n\nRun: ${run.id} · revision ${run.revision} · ${run.updatedAt}\n\nPage type: ${run.request.pageType} · mode: ${run.request.mode} · status: ${run.status}\n\nSource: ${run.evidence?.url || run.request.sourceUrl || run.brand.siteUrl || "Brand Brain"}\n\n## Capture boundary\n\n${captureReport(run.evidence)}\n\n## Build authorization\n\n${authorization}\n\n## Audit\n\n${auditReport(run.audit, decisions, run.evidence)}\n## Store inspection coverage\n\n| Surface | Address | Status | Evidence record / limitation |\n|---|---|---|---|\n${run.coverage.map(c => `| ${line(c.surface)} | ${line(c.url)} | ${c.status} | ${line(c.evidenceId || c.reason || "Not recorded")} |`).join("\n") || "| Individual page | — | — | No additional pages inspected |"}\n\n${run.coverage.filter(c => c.audit).map(c => `### ${line(c.surface)}: ${line(c.url)}\n\n${captureReport(coverageEvidence(run, c.evidenceId))}\n${auditReport(c.audit, decisions, coverageEvidence(run, c.evidenceId))}`).join("\n")}\n## Proposed design\n\n${run.blueprint?.strategy || "The page has not been designed yet."}\n\n| Section | Purpose and layout | Findings addressed | Current version |\n|---|---|---|---|\n${(run.blueprint?.sections || []).map(s => { const actual = run.sections.find(x => x.id === s.id); return `| ${line(s.label)} | ${line(`${s.purpose} ${s.layout}`)} | ${s.findingIds.join(", ") || "—"} | ${actual ? `${actual.version}${actual.enabled ? "" : " (disabled)"}` : "Not built"} |`; }).join("\n")}\n\n## Brand and assets\n\n- Brand snapshot: \`${run.brand.hash}\`.\n- Product: ${line(run.brand.productName || "Brand-level page")}.\n- Product destination: ${run.brand.productUrl || "Not set"}.\n- Fonts: ${run.brand.fonts.map(f => `${f.family} (${f.weight}, ${f.style})`).join("; ") || "No local brand font files captured"}.\n- Quiz: ${run.quiz ? `${run.quiz.questions.length} questions and ${run.quiz.products.length} product recommendations; browser-local answers, no email collection.` : "Not included"}\n\n## QA and release checks\n\nVisual design review: ${run.visualReview ? `${run.visualReview.verdict} — ${line(run.visualReview.summary)}` : "Not performed; layout checks alone do not establish design quality."}\n\n${run.quality ? `Last checked: ${run.quality.checkedAt}\n\nFailures:\n${run.quality.failures.map(f => `- ${line(f)}`).join("\n") || "- None recorded."}\n\nWarnings:\n${run.quality.warnings.map(w => `- ${line(w)}`).join("\n") || "- None recorded."}` : "Visual QA has not been completed."}\n\n- Compare the original mobile and desktop screenshots with the rebuilt sections.\n- Verify factual claims, guarantee conditions, reviews, prices and product variants against the brand's records.\n- For Shopify: install in a duplicate theme, select the correct product, run Theme Check and test variants, quantities, subscriptions and add-to-cart.\n- For standalone HTML: purchase links lead to the saved store; it does not implement a checkout.\n- Validate mobile reading order, image loading, keyboard navigation and exact brand font files.\n- Measure the proposed changes against the original using the stated metrics; this audit does not establish conversion uplift or competitor performance.\n\n## Knowledge provenance\n\n${run.knowledge.map(k => `- ${line(k.title)} — ${line(k.source)} (\`${k.id}\`)`).join("\n") || "No knowledge sources recorded."}\n\nRecorded run cost: $${run.costUsd.toFixed(4)}.\n`;
}
