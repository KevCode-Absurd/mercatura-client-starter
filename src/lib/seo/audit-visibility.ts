import type { SeoAudit } from "./model";
import type { VisibilityRun } from "./visibility";
export function withVisibilityEvidence(audit: SeoAudit, run?: VisibilityRun): SeoAudit {
    if (!run || run.brandId !== audit.brandId || run.contextHash !== audit.contextHash)
        return audit;
    const completed = run.observations.filter((o) => o.status === "completed");
    const reviewed = completed.filter((o) => o.factReview);
    return { ...audit, checks: audit.checks.map((check) => {
            if (check.ruleId === "GEO-VISIBILITY")
                return { ...check, title: "Review the separate engine visibility sample", evidence: [
                        `${completed.length} of ${run.plannedResponses ?? run.observations.length} search-grounded API responses collected in run ${run.id} started ${run.startedAt}.`,
                        "See AEO/GEO for the exact prompts, models, original answers and citations. Branded and discovery rates are reported separately, not as a website readiness score.",
                    ] };
            if (check.ruleId === "GEO-FACTS")
                return { ...check, evidence: [
                        `${reviewed.length} of ${completed.length} collected answers have a recorded human fact review; ${reviewed.filter((o) => o.factReview?.status === "discrepancy").length} reported discrepancies.`,
                        "Open the response evidence to compare individual claims with dated official sources and approved Brand Brain facts. An engine citation is not independent verification.",
                    ] };
            return check;
        }) };
}
