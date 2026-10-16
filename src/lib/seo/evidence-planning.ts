import { z } from "zod";
import { compareSearch, searchOpportunities, type MeasurementData } from "./measurement";
import type { SeoContext } from "./model";
import type { VisibilityRun } from "./visibility";
import { validatePlanInput, type SearchPlanInput, type SearchPlanRow } from "./planning";
export const evidenceSourceSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("search"), reportId: z.string().min(1).max(150), previousId: z.string().max(150).optional(), query: z.string().min(1).max(1000), page: z.string().max(2000), reason: z.enum(["low-ctr", "lost-clicks"]) }),
    z.object({ kind: z.literal("visibility"), runId: z.string().min(1).max(150), observationId: z.string().min(1).max(150) }),
]);
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;
export type EvidenceChoice = Pick<SearchPlanInput, "productId" | "targetUrl" | "intent" | "taskType"> & {
    reviewed: boolean;
};
export function evidencePlan(ctx: SeoContext, rawSource: unknown, choice: EvidenceChoice, measurements: MeasurementData, runs: VisibilityRun[]): {
    input: SearchPlanInput;
    evidence: NonNullable<SearchPlanRow["evidence"]>;
} {
    const source = evidenceSourceSchema.parse(rawSource);
    if (choice.reviewed !== true)
        throw new Error("Review the buyer intent and destination before creating this task.");
    let keyword: string, detail: string, key: string, capturedAt: string, targetUrl = choice.targetUrl, taskType = choice.taskType;
    if (source.kind === "search") {
        const report = measurements.search.find((r) => r.id === source.reportId && r.brandId === ctx.brandId && r.contextHash === ctx.contextHash);
        if (!report)
            throw new Error("Search evidence is missing or uses older Brand Brain context. Refresh the report.");
        const row = report.rows.find((r) => r.query === source.query && r.page === source.page);
        if (!row)
            throw new Error("This query/page pair is not in the saved report.");
        let change = "";
        if (source.reason === "low-ctr") {
            if (!searchOpportunities(report.rows).some((r) => r.query === row.query && r.page === row.page))
                throw new Error("This row does not match the saved CTR review filter.");
        }
        else {
            const previous = measurements.search.find((r) => r.id === source.previousId && r.brandId === ctx.brandId && r.contextHash === ctx.contextHash);
            if (!previous)
                throw new Error("Choose a valid earlier report.");
            const comparison = compareSearch(report, previous);
            if (!comparison.comparable)
                throw new Error(comparison.reason);
            const decline = comparison.lostClicks.find((r) => r.query === row.query && r.page === row.page);
            if (!decline)
                throw new Error("No click decline is recorded for this matching pair.");
            change = ` Earlier period ${previous.periodStart} to ${previous.periodEnd}, report ${previous.id}: ${decline.previousClicks} clicks → ${decline.clicks} clicks (${decline.clickChange}).`;
        }
        keyword = row.query;
        targetUrl = row.page;
        taskType = "refresh";
        capturedAt = report.importedAt;
        key = JSON.stringify(["search", report.id, source.reason === "lost-clicks" ? source.previousId : "", source.reason, row.query, row.page]);
        detail = `Saved Search Console import ${report.id}; ${report.periodStart} to ${report.periodEnd}; scope: ${report.segment}. Query: ${row.query}. Page: ${row.page}. ${row.clicks} clicks, ${row.impressions} impressions, CTR ${row.impressions ? (row.clicks / row.impressions * 100).toFixed(2) : "unknown"}%, average position ${row.position}.${change} Imported rows only. Review intent, title/snippet, availability and search appearance; this observation does not prove causation or promise uplift.`;
    }
    else {
        const run = runs.find((r) => r.id === source.runId && r.brandId === ctx.brandId && r.contextHash === ctx.contextHash);
        const observation = run?.observations.find((o) => o.id === source.observationId);
        if (!run || !observation || observation.status !== "completed" || run.status === "running")
            throw new Error("Choose a completed observation from the current Brand Brain.");
        if (!observation.factReview || observation.factReview.status === "unverified")
            throw new Error("Save a human fact review before planning content from this answer.");
        keyword = observation.prompt.text;
        capturedAt = observation.observedAt;
        key = JSON.stringify(["visibility", run.id, observation.id]);
        detail = `Visibility run ${run.id}, observation ${observation.id}; ${observation.provider}/${observation.model}; ${observation.locale}; ${observation.observedAt}. Stage: ${observation.prompt.stage ?? "unclassified"}. Exact question: ${keyword}\nBrand mentioned: ${observation.brandMentioned === null ? "unknown" : observation.brandMentioned}; store cited: ${observation.storeCited === null ? "unknown" : observation.storeCited}. Human review: ${observation.factReview.status} on ${observation.factReview.reviewedAt}; source: ${observation.factReview.sourceUrl}.\nReview note: ${observation.factReview.note}\nSampled API answer, not search demand or consumer-app ranking. Check whether this intent merits a brand/product mention; absence alone is not a defect. Validate every claim against current approved sources.`;
    }
    const input = validatePlanInput(ctx, { ...choice, keyword: keyword.slice(0, 180), targetUrl, taskType, owner: "", dueDate: "", status: "planned", notes: "Review the attached saved evidence, then define the content changes and acceptance checks." });
    return { input, evidence: { key, kind: source.kind, capturedAt, detail } };
}
