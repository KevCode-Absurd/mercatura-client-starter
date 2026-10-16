import { z } from "zod";
import { productSearchType, type SeoAudit, type SeoContext, type SeoSnapshot } from "./model";
import { normalizeQuery, planStoreUrl } from "./planning";
import type { MeasurementData } from "./measurement";
import { summarizeVisibility, type VisibilityRun } from "./visibility";
import { slug } from "./content";
import type { AgentCommerceData } from "./agent-commerce";
export const funnelStages = ["TOF", "MOF", "BOF"] as const;
export const editorialFormats = ["article", "listicle", "comparison", "product-page"] as const;
export type StrategyEvidence = {
    ctx: SeoContext;
    snapshot: SeoSnapshot;
    audit: SeoAudit;
    measurement: MeasurementData;
    runs: VisibilityRun[];
};
export type StrategyMetric = {
    id: string;
    label: string;
    value: number | null;
    unit: string;
    detail: string;
    evidenceKey: string;
};
export type StrategyBaseline = {
    capturedAt: string;
    contextHash?: string;
    metrics: StrategyMetric[];
};
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const researchSectionSchema = z.object({ heading: text(0, 160), copy: text(0, 4000), sourceTitle: text(0, 180), sourceUrl: text(0, 2000), limitations: text(0, 1200) });
export const strategyRowSchema = z.object({
    persona: text(2, 200), job: text(3, 1000), stage: z.enum(funnelStages), keyword: text(3, 180),
    productId: text(1, 150), format: z.enum(editorialFormats), taskType: z.enum(["new", "refresh"]).default("new"), targetUrl: text(1, 2000),
    title: text(3, 180), decision: text(10, 1000), description: text(0, 320),
    owner: text(0, 100), priority: z.enum(["High", "Medium", "Low"]),
    notes: text(0, 4000), sections: z.array(researchSectionSchema).min(2).max(8),
});
export type StrategyRowInput = z.infer<typeof strategyRowSchema>;
export type StrategyRow = StrategyRowInput & {
    id: string;
    contextHash: string;
    origin: string;
    planId?: string;
};
export const initiativeDefinitions = [
    { id: "technical", area: "audit", title: "Make priority pages accessible and indexable", action: "Resolve failed crawl, canonical, indexability and internal-link checks on the target pages. Run the audit again after implementation.", after: "Priority pages return the intended status, canonical and indexability signals.", href: "/seo/audits" },
    { id: "on-page", area: "audit", title: "Answer the customer on the right page", action: "Review title, description, main heading, answer coverage and substantiated product facts. Improve an existing page before creating a competing URL.", after: "Each selected query has one useful destination and a clear next step.", href: "/seo/optimize" },
    { id: "authority", area: "authority", title: "Review links, mentions and editorial coverage", action: "Collect a dated backlink or referring-domain export and inspect relevant editorial sources. Record missing brand facts, broken links and credible outreach opportunities.", after: "An evidence-backed authority plan with relevant publishers and accurate brand references.", href: "/seo/geo" },
    { id: "citations", area: "authority", title: "Earn visibility in the sources AI cites", action: "Inspect citations for the selected buyer questions. Prepare useful original evidence for relevant reviewers, communities and publications; record corrections and legitimate contributions.", after: "Accurate, independently useful coverage; retested citations on a fixed question set.", href: "/seo/geo" },
    { id: "ai-answers", area: "answers", title: "Make answers accessible and test each engine", action: "Publish clear, supported answers on crawlable pages. Test the same questions, market and engines again; record mentions, citations and factual discrepancies separately.", after: "More accurate answers and relevant citations in the observed sample.", href: "/seo/aeo" },
    { id: "agent-catalog", area: "agents", title: "Give agents unambiguous product facts", action: "Check stable product and variant IDs, product URLs, images, descriptions, currency, current price and availability across visible pages, structured data and feeds.", after: "Every priority SKU has matching, current product facts in the reviewed channels.", href: "/seo/optimize" },
    { id: "agent-policies", area: "agents", title: "Make buying constraints explicit", action: "Verify delivery regions, shipping costs, returns, subscriptions, cancellation and suitability using current product and policy pages. Record evidence for each market.", after: "A shopper or agent can determine eligibility and total purchase terms before checkout.", href: "/seo/audits" },
    { id: "agent-feeds", area: "agents", title: "Assess product discovery integrations", action: "Review eligibility for OpenAI product feeds and Google Merchant Center. Assign an owner for catalog synchronization, freshness, errors and variant matching.", after: "A validated feed and a documented integration decision for each eligible channel.", href: "https://developers.openai.com/commerce/guides/get-started" },
    { id: "agent-checkout", area: "agents", title: "Prepare a controlled agent purchase journey", action: "Assess platform support for agent commerce such as UCP. Test inventory, final totals, explicit customer authorization, order confirmation, cancellation and refund handling in a sandbox.", after: "A documented, tested purchase journey before enabling live agent transactions.", href: "https://developers.google.com/merchant/ucp" },
] as const;
export const initiativeSchema = z.object({ id: z.enum(initiativeDefinitions.map((d) => d.id)), owner: text(0, 100), status: z.enum(["planned", "working", "verified"]), evidenceUrl: text(0, 2000), notes: text(0, 4000) });
export type StrategyInitiative = z.infer<typeof initiativeSchema> & {
    contextHash?: string;
};
export type SearchStrategy = {
    version: 1;
    brandId: string;
    contextHash: string;
    revision: number;
    createdAt: string;
    baseline: StrategyBaseline;
    previousBaselines?: StrategyBaseline[];
    targets: Record<string, string>;
    rows: StrategyRow[];
    initiatives: StrategyInitiative[];
    agentCommerce?: AgentCommerceData;
};
export const defaultTargets: Record<string, string> = {
    seo: "Resolve priority failures, then compare readiness on the same URLs and checks.",
    clicks: "Set a 90-day organic-click target after reviewing a representative Search Console period.",
    aeo: "Close the answer and product-evidence gaps on priority pages, then repeat the checks.",
    mentions: "Improve relevant discovery mentions on the same question set, engine, model and market.",
    citations: "Earn accurate store citations for suitable questions; repeat the baseline sample.",
};
export function strategyMetrics({ ctx, snapshot, audit, measurement, runs }: StrategyEvidence): StrategyMetric[] {
    const validAudit = audit.brandId === ctx.brandId && audit.contextHash === ctx.contextHash && audit.mode === "live";
    const search = measurement.search.filter((s) => s.brandId === ctx.brandId && s.contextHash === ctx.contextHash).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || b.importedAt.localeCompare(a.importedAt))[0];
    const run = runs.filter((r) => r.brandId === ctx.brandId && r.contextHash === ctx.contextHash && r.status !== "running").sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    const summary = run ? summarizeVisibility(run).discovery : undefined;
    const auditKey = validAudit ? JSON.stringify(audit.checks.map((c) => [c.ruleId, c.url]).sort()) : "";
    return [
        ...(["SEO", "AEO"] as const).map((category) => ({ id: category.toLowerCase(), label: `${category} website readiness`, value: validAudit ? audit.scores[category].score : null, unit: "/100", detail: validAudit && audit.scores[category].total ? `${audit.scores[category].passed} passed · ${audit.scores[category].failed} failed · ${audit.scores[category].unknown} unknown · ${snapshot.observedAt || "Saved audit"}` : "Run a website audit to establish the baseline.", evidenceKey: auditKey })),
        { id: "clicks", label: "Google organic clicks", value: search ? search.rows.reduce((sum, r) => sum + r.clicks, 0) : null, unit: "clicks", detail: search ? `Imported rows · ${search.periodStart} to ${search.periodEnd} · ${search.segment}` : "Import Search Console data. No traffic estimate has been invented.", evidenceKey: search ? `${search.segment}:${search.periodStart}:${search.periodEnd}` : "" },
        { id: "mentions", label: "AI discovery mentions", value: summary?.mentionRate ?? null, unit: "%", detail: summary ? `${summary.mentions}/${summary.mentionAssessed} assessed answers · ${run!.startedAt} · API sample` : "Collect answer evidence before setting a visibility baseline.", evidenceKey: run ? visibilitySampleKey(run) : "" },
        { id: "citations", label: "AI store citations", value: summary?.citationRate ?? null, unit: "%", detail: summary ? `${summary.citations}/${summary.citationAssessed} assessed answers · ${summary.failed} failed responses · API sample` : "No observed citations yet. Grok and consumer-app results are not measured here.", evidenceKey: run ? visibilitySampleKey(run) : "" },
    ];
}
function visibilitySampleKey(run: VisibilityRun) {
    return JSON.stringify([run.locale, run.observations.map((o) => [o.provider, o.model, o.prompt.text, o.prompt.cohort, o.repeat]).sort()]);
}
const words = (s: string) => normalizeQuery(s).split(" ").filter((w) => w.length > 3 && !new Set(["what", "when", "where", "which", "your", "with", "from", "before", "after", "about", "should", "could", "would", "their", "does", "have", "this", "that"]).has(w));
export function contentCoverage(ctx: SeoContext, snapshot: SeoSnapshot, keyword: string) {
    const valid = snapshot.mode === "live" && snapshot.brandId === ctx.brandId && snapshot.contextHash === ctx.contextHash;
    const pages = valid ? snapshot.pages.filter((p) => p.mode === "live" && p.live?.htmlInspected && !p.live.error && p.statusCode === 200) : [];
    const query = [...new Set(words(keyword))];
    const matches = pages.map((page) => {
        const tokens = new Set(words([page.title, page.h1, ...(page.answeredQuestions ?? [])].filter(Boolean).join(" ")));
        return { url: page.url, title: page.title || page.url, overlap: query.filter((t) => tokens.has(t)).length };
    }).filter((p) => query.length > 0 && p.overlap >= Math.max(1, Math.ceil(query.length * .5))).sort((a, b) => b.overlap - a.overlap).slice(0, 3);
    return { status: !pages.length ? "Not assessed" : matches.length ? "Related page found" : "Potential gap in sample", pages: matches, inspected: pages.length };
}
export const blankResearch = () => ["Direct answer", "Evidence and practical next steps"].map((heading) => ({ heading, copy: "", sourceTitle: "", sourceUrl: "", limitations: "" }));
export function researchLeads(input: StrategyEvidence, row: Pick<StrategyRowInput, "keyword" | "productId">) {
    const { ctx, snapshot, measurement, runs } = input;
    const leads: {
        title: string;
        url: string;
        reason: string;
    }[] = [];
    const product = ctx.products.find((p) => p.id === row.productId);
    if (product?.url)
        leads.push({ title: product.name, url: product.url, reason: "Catalogue product reference. Check the current page and exact SKU; catalogue mapping is not independent claim validation." });
    for (const p of contentCoverage(ctx, snapshot, row.keyword).pages)
        leads.push({ title: p.title, url: p.url, reason: "Related inspected page; review coverage and possible refresh before creating a competing URL." });
    for (const batch of measurement.search.filter((s) => s.brandId === ctx.brandId && s.contextHash === ctx.contextHash))
        for (const q of batch.rows.filter((q) => normalizeQuery(q.query) === normalizeQuery(row.keyword)))
            leads.push({ title: `Current landing page for ${q.query}`, url: q.page, reason: `Search Console · ${batch.periodStart}–${batch.periodEnd} · ${q.clicks} clicks / ${q.impressions} impressions in imported rows.` });
    for (const run of runs.filter((r) => r.brandId === ctx.brandId && r.contextHash === ctx.contextHash))
        for (const o of run.observations.filter((o) => o.status === "completed" && normalizeQuery(o.prompt.text) === normalizeQuery(row.keyword)))
            for (const citation of o.citations)
                leads.push({ title: citation.title, url: citation.url, reason: `Cited in ${o.provider}/${o.model} answer on ${o.observedAt}. A citation is a research lead, not approval of its claims.` });
    const seen = new Set<string>();
    return leads.filter((lead) => { try {
        validateReference(lead.url);
    }
    catch {
        return false;
    } if (seen.has(lead.url))
        return false; seen.add(lead.url); return true; }).slice(0, 12);
}
export function validateStrategyRow(ctx: SeoContext, input: unknown) {
    const row = strategyRowSchema.parse(input);
    if (!ctx.products.some((p) => p.id === row.productId))
        throw new Error("Choose a product from the active brand.");
    row.targetUrl = planStoreUrl(ctx, row.targetUrl);
    for (const section of row.sections)
        if (section.sourceUrl)
            validateReference(section.sourceUrl);
    return row;
}
export function validateReference(raw: string) {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
        throw new Error("Use a public HTTP(S) reference without credentials.");
    return u.href;
}
export function validateInitiative(raw: unknown) {
    const item = initiativeSchema.parse(raw);
    if (item.evidenceUrl)
        item.evidenceUrl = validateReference(item.evidenceUrl);
    if (item.status === "verified" && (!item.owner || !item.evidenceUrl || item.notes.length < 20))
        throw new Error("Verification needs an owner, an evidence URL and at least 20 characters describing what was checked.");
    return item;
}
export function customerQuestions(_ctx: SeoContext, persona: SeoContext["personas"][number], type: string, product: string): [
    string,
    string,
    string
] {
    const questions: [
        string,
        string,
        string
    ] = [`What should I know before trying ${type}?`, `What should I compare when choosing ${type}?`, `What should I check before buying ${product}?`];
    const own = persona.language.map((q) => q.trim()).filter((q) => /^(how|what|why|when|should|can|which|where|is|are|do|does)\b/i.test(q) && /\?$/.test(q) && q.length >= 8 && q.length <= 180);
    const buying = own.find((q) => /\b(?:buy|buying|order|price|cost|costs|shipping|delivery|returns?|refund|subscription|cancel)\b/i.test(q));
    const comparing = own.find((q) => q !== buying && /\b(?:vs|versus|compare|compared|better|best|difference|instead)\b/i.test(q));
    const first = own.find((q) => q !== buying && q !== comparing);
    if (first)
        questions[0] = first;
    if (comparing)
        questions[1] = comparing;
    if (buying)
        questions[2] = buying;
    return questions;
}
export function strategySeeds(input: StrategyEvidence): StrategyRow[] {
    const { ctx, measurement, runs } = input;
    const product = ctx.products[0];
    if (!product || !ctx.websiteUrl)
        return [];
    const type = productSearchType(product, ctx.category);
    const rows: StrategyRow[] = [];
    const add = (persona: string, job: string, stage: StrategyRow["stage"], keyword: string, origin: string, format: StrategyRow["format"], selectedProduct = product) => {
        keyword = keyword.slice(0, 180);
        if (rows.some((r) => r.persona === persona && normalizeQuery(r.keyword) === normalizeQuery(keyword)))
            return;
        const targetUrl = format === "product-page" && selectedProduct.url ? selectedProduct.url : new URL(`/blogs/guides/${slug(keyword)}`, ctx.websiteUrl).href;
        rows.push({ id: `seed-${rows.length + 1}`, contextHash: ctx.contextHash, persona: persona.slice(0, 200), job: job.slice(0, 1000), stage, keyword, origin, format, taskType: "new", productId: selectedProduct.id, targetUrl, title: keyword, description: "", decision: stage === "TOF" ? `Understand the problem and sensible options for ${persona}, including when a product is not the answer.` : stage === "MOF" ? `Compare options for ${persona} using supported criteria, trade-offs and product suitability.` : "Confirm the selected product, suitability and current purchase terms before deciding to buy.", priority: origin.startsWith("Search Console") ? "High" : "Medium", owner: "", notes: "Validate intent and product fit. The initial product mapping is a suggestion; confirm the correct SKU before writing. Priorities are editorial, not traffic forecasts.", sections: blankResearch() });
    };
    for (const p of ctx.personas) {
        const child = /\b(child|children|kids|parent|picky)\b/i.test(`${p.name} ${p.problem}`);
        const mapped = child ? ctx.products.find((item) => /\b(kids|children|child)\b/i.test(item.name) && productSearchType(item, ctx.category) === type) ?? product : product;
        const questions = customerQuestions(ctx, p, type, mapped.name);
        add(p.name, p.problem || p.name, "TOF", questions[0], "Brand Brain persona · editorial question hypothesis", "article", mapped);
        add(p.name, p.problem || p.name, "MOF", questions[1], "Brand Brain persona and catalogue · editorial hypothesis", "comparison", mapped);
        add(p.name, p.problem || p.name, "BOF", questions[2], "Brand Brain persona · suitability needs evidence", "product-page", mapped);
    }
    if (!ctx.personas.length)
        add("Category shoppers", `Choose appropriate ${type}`, "MOF", `How to choose ${type}`, "Catalogue seed · add customer avatars in Brand Brain", "listicle");
    const search = measurement.search.filter((s) => s.brandId === ctx.brandId && s.contextHash === ctx.contextHash).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || b.importedAt.localeCompare(a.importedAt))[0];
    for (const row of [...(search?.rows ?? [])].sort((a, b) => b.impressions - a.impressions).slice(0, 20))
        add("Search audience · assign avatar", "Answer this observed query and review its current landing page.", /\b(buy|price|shipping|return)\b/i.test(row.query) ? "BOF" : /\b(best|versus|vs|compare)\b/i.test(row.query) ? "MOF" : "TOF", row.query, `Search Console · ${row.impressions} impressions, ${row.clicks} clicks · ${search!.periodStart}–${search!.periodEnd} · ${row.page}`, /\b(buy|price|shipping|return)\b/i.test(row.query) ? "product-page" : "article");
    const run = runs.filter((r) => r.brandId === ctx.brandId && r.contextHash === ctx.contextHash && r.status !== "running").sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    for (const o of (run?.observations ?? []).filter((o) => o.status === "completed" && o.answer.trim() && (o.brandMentioned === false || o.storeCited === false)).slice(0, 20))
        add("AI question audience · assign avatar", "Review the answer and cited sources before deciding whether a brand mention is appropriate.", o.prompt.stage === "purchase" || o.prompt.stage === "brand" ? "BOF" : o.prompt.stage === "comparison" ? "MOF" : "TOF", o.prompt.text, `Observed AI answer · ${o.provider}/${o.model} · ${o.observedAt} · observation ${o.id}`, o.prompt.stage === "purchase" ? "product-page" : "article");
    return rows.slice(0, 200);
}
export function buildStrategy(input: StrategyEvidence, at: string): SearchStrategy {
    return { version: 1, brandId: input.ctx.brandId, contextHash: input.ctx.contextHash, revision: 1, createdAt: at, baseline: { capturedAt: at, contextHash: input.ctx.contextHash, metrics: strategyMetrics(input) }, targets: { ...defaultTargets }, rows: strategySeeds(input), initiatives: initiativeDefinitions.map(({ id }) => ({ id, owner: "", status: "planned", evidenceUrl: "", notes: "" })) };
}
