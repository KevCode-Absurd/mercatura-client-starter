import { buildEntryBrief } from "./answer-research";
import { feedRouteNote, routePlaybooks, type EntryGap, type EntryRoute, type EntryStage } from "./answer-research-data";
import { draftBlog, slug } from "./content";
import type { SeoContext } from "./model";
import type { VisibilityRun } from "./visibility";
export type AnswerImplementation = {
    version: 1;
    platform: string;
    stage: EntryStage;
    gap: EntryGap;
    route: EntryRoute;
    brief: string;
    tasks: {
        id: string;
        label: string;
        done: boolean;
    }[];
};
const pending = "Pending human verification";
function worksheet(headers: string[], rows: string[][]) {
    const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
    return [headers, headers.map(() => "---"), ...rows].map(row => `| ${row.map(cell).join(" | ")} |`).join("\n");
}
export function buildAnswerImplementation(ctx: SeoContext, raw: unknown, runs: VisibilityRun[]) {
    const brief = buildEntryBrief(ctx, raw, runs), { route, product, input } = brief, playbook = routePlaybooks[route];
    const scope = product?.name ?? `${ctx.brandName} / ${ctx.category || "category"}`;
    const identity = `Brand: ${ctx.brandName}\nScope: ${scope}\nMarket: ${ctx.market}\nPlatform: ${input.platform}\nBuyer question: ${input.question}\nDestination: ${brief.targetUrl || "Choose before implementation"}`;
    let body: string;
    if (route === "content") {
        const starter = product ? draftBlog(ctx, { id: "answer-entry", mode: "live", query: input.question, intent: "informational", productId: product.id, destination: "blog", targetUrl: brief.targetUrl, rationale: input.note, monthlySearches: null }).body : `# ${input.question}\n\n## Start with the buyer's decision\n\n## Compare the relevant approaches\n\n## Check suitability and limitations\n\n## Next steps\n\n## Sources`;
        body = `${starter}\n\n## Answer and evidence to complete before publishing\n\n[[REVIEW: Replace this marker and section with a direct, sourced answer to the exact buyer question. Confirm category-specific criteria, fair comparisons, citations, review date and product relevance. The starter is not source-verified.]]`;
    }
    else {
        const tables: Record<Exclude<EntryRoute, "content">, string> = {
            research: worksheet(["Requirement or source", "Verified fact / supporting passage", "Fit / source support", "Next check"], [[input.question, pending, "Unreviewed", "Inspect exact answer and cited pages"], [scope, pending, "Unreviewed", input.gap === "no-fit" ? "Document the unmet criterion; do not pursue unsupported placement" : "Compare catalogue facts with buyer requirements"]]),
            facts: worksheet(["Field", "Current page value", "Verified value", "Source and date", "Channels to update"], ["Product identity / selected version", "Specifications / materials / ingredients", "Compatibility / suitability / instructions", "Included quantity / accessories", "Price / currency / availability", "Delivery / returns / recurring terms"].map(field => [field, pending, pending, pending, "Visible page / structured data / feed where applicable"])),
            evidence: worksheet(["Exact claim", "Tested product / version", "Primary evidence", "Method and limits", "Approved wording"], [["Identify the claim; do not infer from category", scope, pending, "Record conditions, sample, outcome, reviewer and date", pending]]) + "\n\n## Evidence-page outline\n\n- What was tested and for whom\n- Methods and primary references\n- Results and limits of applicability\n- Component research versus finished-product evidence\n- Certifications and quality checks with their actual scope\n- Reviewer and update date",
            access: worksheet(["Public URL", "Bot / policy group", "Current rule / status", "Proposed change", "Retest evidence"], [[brief.targetUrl || "Select affected URL", "Use the selected platform reference", pending, "Preserve private exclusions and training preferences", pending]]) + "\n\n## Developer procedure\n\n1. Save the existing robots.txt and relevant CDN configuration as a rollback copy.\n2. Identify the most specific applicable user-agent group and the exact URL path.\n3. Review robots, noindex, canonical and snippet controls separately.\n4. Propose the smallest justified change; do not replace the whole policy with Allow: /.\n5. Check actual authorized crawler requests using the platform's verification guidance; a spoofed user-agent is not proof.\n6. Rerun the website audit and compare the policy result with real HTTP/CDN access.\n\nNo executable robots patch is generated without the current policy and a reviewed change.",
            feed: worksheet(["Item field", "Authoritative page value", "Current feed value", "Verified correction", "Acceptance evidence"], ["ID / product URL / selected version", "Title / description / image", "Market / currency / price", "Availability / quantity", "Shipping / returns / offer terms", "Platform eligibility controls"].map(field => [field, pending, pending, pending, "Record platform response after submission"])) + "\n\nThis is a reconciliation worksheet, not an upload-ready feed. Use the platform's current schema and permitted submission path. Acceptance and eligibility do not guarantee display.",
            coverage: worksheet(["Cited publisher / page", "Buyer question relevance", "Independent or commercial", "Verified facts to supply", "Relationship / outcome"], [["Use the saved citation atlas; no publisher list inferred", input.question, "Unreviewed", scope, "No outreach performed"]]) + "\n\n## Review information pack\n\n- Exact product version, source links and current market availability\n- Documented specifications and claim evidence with limits\n- Sample, affiliate, sponsorship or other relationship disclosure where applicable\n- Open questions the reviewer can investigate independently\n\nSelect relevant publishers from observed evidence. A sample or information pack does not buy editorial judgment or a ranking.",
        };
        body = `# ${playbook.title}\n\n${identity}${route === "feed" ? `\n\n## Platform scope\n\n${feedRouteNote(input.platform)}` : ""}\n\n## Implementation worksheet\n\n${tables[route]}\n\n## Steps\n\n${playbook.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n## Record evidence\n\nAttach the actual destination or platform record and the date checked. Checklist completion is a human work record, separate from publishing and measured visibility. No store changes, feed submissions or outreach have been performed.`;
    }
    const answerEntry: AnswerImplementation = { version: 1, platform: input.platform, stage: input.stage, gap: input.gap, route, brief: brief.body, tasks: playbook.steps.map((label, i) => ({ id: `${route}:${i + 1}`, label, done: false })) };
    const targetUrl = brief.targetUrl || (route === "content" ? `/blogs/guides/${slug(input.question)}` : "");
    return { kind: route === "content" ? "blog" as const : "fix" as const, title: route === "content" ? input.question.slice(0, 240) : `${playbook.title}: ${scope}`.slice(0, 240), keyword: input.question, productId: product?.id ?? null, targetUrl, description: `${playbook.deliverable}. Review required; nothing applied.`.slice(0, 500), body, sourceIds: brief.sourceIds, answerEntry };
}
