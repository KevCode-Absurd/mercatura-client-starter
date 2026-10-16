import { z } from "zod";
import { productSearchType, type SeoContext } from "./model";
import { customerQuestions, validateReference, type StrategyEvidence, type StrategyRowInput } from "./strategy";
import { normalizeQuery, planStoreUrl } from "./planning";
import { slug } from "./content";
export const agentSources = [
    { id: "search", title: "Google: AI features and your website", url: "https://developers.google.com/search/docs/appearance/ai-features" },
    { id: "schema", title: "Google: product structured data", url: "https://developers.google.com/search/docs/appearance/structured-data/product" },
    { id: "feeds", title: "OpenAI: product discovery feeds", url: "https://developers.openai.com/commerce/guides/get-started" },
    { id: "fields", title: "OpenAI: product feed reference", url: "https://developers.openai.com/commerce/specs/file-upload/products" },
    { id: "quality", title: "OpenAI: feed best practices", url: "https://developers.openai.com/commerce/guides/best-practices" },
    { id: "bots", title: "OpenAI: crawler controls", url: "https://developers.openai.com/api/docs/bots" },
    { id: "shopify", title: "Shopify: agentic storefronts", url: "https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts" },
    { id: "eligibility", title: "Shopify: catalog requirements", url: "https://help.shopify.com/en/manual/shopify-catalog/requirements" },
    { id: "ucp", title: "Google: UCP integration overview", url: "https://developers.google.com/merchant/ucp/guides/overview" },
    { id: "bing", title: "Bing: AI Performance measurement", url: "https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c" },
] as const;
export const agentRoutes = [
    { id: "web", title: "Search → store", mechanism: "An assistant retrieves indexed pages, sometimes through several related searches, then follows a relevant product or guide link.", work: "Make PDPs and useful guides crawlable. Answer the buyer's actual constraints and link each guide to the correct product.", proof: "Inspect the retrieved URL, answer and citations for a fixed unbranded question.", basis: "Documented search mechanism", sources: ["search", "bots", "schema"] },
    { id: "catalog", title: "Catalog → product offer", mechanism: "Shopping channels can retrieve structured merchant catalog data through feeds or platform distribution.", work: "Check channel eligibility, exact variants, factual attributes and synchronized offer data. An accepted feed is a distribution route, not a placement promise.", proof: "Record channel acceptance, item errors and a dated preview of the exact SKU in the target market.", basis: "Documented distribution mechanism", sources: ["feeds", "fields", "shopify", "eligibility"] },
    { id: "sources", title: "Reviewer or comparison → store", mechanism: "A search-grounded answer may encounter an independent review, publisher or comparison before the brand's page.", work: "Identify sources actually cited for your buyer questions. Offer useful original evidence and correct inaccurate facts through legitimate contributions.", proof: "Save the cited source and the evidence behind its product recommendation.", basis: "Strategy hypothesis; test with observed citations", sources: ["search", "bing"] },
    { id: "browser", title: "Product page → cart or checkout", mechanism: "After discovery, a shopper or browser agent can follow the store's purchase flow. Supported integrations can provide a separate cart or checkout path.", work: "Make option selection, total cost, delivery and returns explicit. Test checkout handoff, order status and recovery on your supported channel.", proof: "Use a sandbox or a human-authorized purchase test; record failures and confirmation evidence.", basis: "Documented handoff; browser reliability needs testing", sources: ["shopify", "ucp"] },
    { id: "repeat", title: "Known product → reorder", mechanism: "A buyer may ask an assistant to reorder a previously selected product. This route depends on account access and the agent's capabilities.", work: "Keep product identity stable, distinguish subscriptions from one-time purchases, and make renewals and stock changes clear.", proof: "Test a consented returning-buyer journey separately from new-customer discovery.", basis: "Future-facing workflow hypothesis", sources: ["ucp"] },
] as const;
export type AgentRouteId = typeof agentRoutes[number]["id"];
export const agentGates = [
    { id: "access", title: "Can it reach the product?", stage: "Discover", optional: false, action: "Resolve blocked, failed or non-indexable PDPs; inspect engine-specific crawler access and the selected product URL.", acceptance: "Fetch the exact URL, inspect index directives and test the relevant engine's access. Generic crawler access does not prove OAI-SearchBot access.", href: "/seo/audits", sources: ["search", "bots"] },
    { id: "identity", title: "Does it know which item this is?", stage: "Understand", optional: false, action: "Align product name, brand, stable item/variant IDs, selected option, images and URLs across PDP, schema and catalog.", acceptance: "Compare the exact variant in all used channels; verify real identifiers rather than creating GTINs.", href: "/seo/optimize", sources: ["fields", "schema"] },
    { id: "fit", title: "Does it fit the buyer's constraints?", stage: "Compare", optional: false, action: "Publish specific dimensions, materials or ingredients, use cases, compatibility, exclusions and supported trade-offs. Use a comparison guide when several options genuinely need explaining.", acceptance: "A reviewer can check each buyer constraint against an identified product source. State where the product is unsuitable and where evidence is missing.", href: "/seo/strategy#customer-map", sources: ["quality", "search"] },
    { id: "trust", title: "Can the claims be checked?", stage: "Trust", optional: false, action: "Attach original proof to claims, show method and limits, and collect genuine independent coverage. Distinguish brand statements, customer reviews and independently tested evidence.", acceptance: "Inspect provenance, date, exact SKU and applicability. Never invent reviews, certifications or endorsements. A claim in Brand Brain still needs applicability checked.", href: "/seo/geo", sources: ["search", "eligibility"] },
    { id: "offer", title: "Is this a current, usable offer?", stage: "Choose", optional: false, action: "Reconcile visible and structured price/stock for the variant; check currency, quantity, shipping, tax and subscription renewal terms for the market.", acceptance: "Confirm purchasable stock and the final landed total at purchase time. Matching page fields alone do not prove the final cost or feed freshness.", href: "/seo/optimize", sources: ["fields", "quality"] },
    { id: "policies", title: "Can it verify the merchant and terms?", stage: "Buy", optional: false, action: "Make merchant identity, contact, delivery regions and dates, return exclusions, refunds and cancellation terms easy to verify.", acceptance: "Open the actual policies and check the destination market. Policy links prove navigation only; their content and enforceability require review.", href: "/seo/audits", sources: ["ucp", "eligibility"] },
    { id: "feed", title: "Is the chosen catalog route available?", stage: "Distribute", optional: true, action: "Check eligibility and access for the target shopping channel. Assign a feed owner and test acceptance, variant matching, update cadence and errors.", acceptance: "Record the specific channel and market with dated acceptance evidence. OpenAI feed access requires approved onboarding; Shopify and Google have their own eligibility rules.", href: "https://developers.openai.com/commerce/guides/get-started", sources: ["feeds", "shopify", "eligibility"] },
    { id: "checkout", title: "Can the chosen purchase route finish?", stage: "Transact", optional: true, action: "Check supported store handoff or native cart/checkout integration. Test customer authorization, final totals, inventory changes, order confirmation and refund recovery.", acceptance: "Record channel-specific test evidence. Discovery/feed inclusion never proves native checkout support; verify current platform, market and merchant eligibility.", href: "https://developers.google.com/merchant/ucp/guides/overview", sources: ["ucp", "shopify"] },
] as const;
export type AgentGateId = typeof agentGates[number]["id"];
const line = (min: number, max: number) => z.string().trim().min(min).max(max);
export const agentCheckSchema = z.object({ productId: line(1, 150), gateId: z.enum(agentGates.map(g => g.id)), status: z.enum(["supported", "gap", "unknown"]), owner: line(0, 100), sourceUrl: line(0, 2000), note: line(0, 4000), checkedAt: z.iso.datetime() });
export type AgentCheckInput = z.infer<typeof agentCheckSchema>;
export type AgentCheck = AgentCheckInput & {
    contextHash: string;
    savedAt: string;
};
export const agentExperimentSchema = z.object({ productId: line(1, 150), route: z.enum(agentRoutes.map(r => r.id)), prompt: line(10, 1000), engine: line(2, 120), model: line(1, 120), surface: z.enum(["consumer", "api", "store-test"]), market: line(2, 120), hypothesis: line(20, 2000), change: line(10, 2000), targetUrl: line(1, 2000), owner: line(2, 100), repeats: z.number().int().min(3).max(10) });
export type AgentExperimentInput = z.infer<typeof agentExperimentSchema>;
export type AgentExperiment = AgentExperimentInput & {
    id: string;
    contextHash: string;
    createdAt: string;
    changedAt?: string;
};
export const agentTrialSchema = z.object({ experimentId: line(1, 150), phase: z.enum(["before", "after"]), repeat: z.number().int().min(1).max(10), observedAt: z.iso.datetime(), status: z.enum(["completed", "failed"]), answer: line(0, 12000), evidenceUrl: line(0, 2000), shortlisted: z.boolean().nullable(), recommended: z.boolean().nullable(), cited: z.boolean().nullable(), purchased: z.boolean().nullable(), orderEvidenceUrl: line(0, 2000), winner: line(0, 200), reason: line(0, 2000) });
export type AgentTrialInput = z.infer<typeof agentTrialSchema>;
export type AgentTrial = AgentTrialInput & {
    id: string;
    contextHash: string;
    savedAt: string;
};
export type AgentCommerceData = {
    checks: AgentCheck[];
    experiments: AgentExperiment[];
    trials: AgentTrial[];
};
export const emptyAgentCommerce = (): AgentCommerceData => ({ checks: [], experiments: [], trials: [] });
function ownedProduct(ctx: SeoContext, id: string) { const p = ctx.products.find(p => p.id === id); if (!p)
    throw new Error("Choose a product from the active brand."); return p; }
function pastDate(value: string, now: string) { if (!Number.isFinite(Date.parse(value)) || Date.parse(value) > Date.parse(now))
    throw new Error("Evidence dates must be valid and cannot be in the future."); }
export function validateAgentCheck(ctx: SeoContext, raw: unknown, now: string) {
    const check = agentCheckSchema.parse(raw);
    ownedProduct(ctx, check.productId);
    pastDate(check.checkedAt, now);
    if (check.sourceUrl)
        check.sourceUrl = validateReference(check.sourceUrl);
    if (check.status !== "unknown" && (!check.owner || !check.sourceUrl || check.note.length < 20))
        throw new Error("An assessed check needs an owner, a source URL and at least 20 characters describing the evidence.");
    return check;
}
export function validateAgentExperiment(ctx: SeoContext, raw: unknown) {
    const item = agentExperimentSchema.parse(raw);
    ownedProduct(ctx, item.productId);
    item.targetUrl = planStoreUrl(ctx, item.targetUrl);
    if (item.market !== ctx.market)
        throw new Error("Use the active brand market; create a separate market context for other tests.");
    if (["web", "catalog", "sources"].includes(item.route)) {
        const prompt = ` ${normalizeQuery(item.prompt)} `;
        if ([ctx.brandName, ...ctx.products.map(p => p.name)].some(name => name.trim() && prompt.includes(` ${normalizeQuery(name)} `)))
            throw new Error("Discovery tests need an unbranded buyer question so the prompt does not seed the brand.");
    }
    return item;
}
export function validateAgentTrial(experiment: AgentExperiment, raw: unknown, now: string) {
    const trial = agentTrialSchema.parse(raw);
    pastDate(trial.observedAt, now);
    if (trial.experimentId !== experiment.id || trial.repeat > experiment.repeats)
        throw new Error("Choose a valid experiment and planned repeat.");
    if (trial.phase === "after" && (!experiment.changedAt || Date.parse(trial.observedAt) < Date.parse(experiment.changedAt)))
        throw new Error("Record implementation before collecting after evidence.");
    if (trial.phase === "before" && experiment.changedAt && Date.parse(trial.observedAt) >= Date.parse(experiment.changedAt))
        throw new Error("Before evidence must predate implementation.");
    if (trial.evidenceUrl)
        trial.evidenceUrl = validateReference(trial.evidenceUrl);
    if (trial.orderEvidenceUrl)
        trial.orderEvidenceUrl = validateReference(trial.orderEvidenceUrl);
    if (trial.status === "completed" && (trial.answer.length < 10 || !trial.evidenceUrl))
        throw new Error("Completed observations need a transcript or test result and an evidence URL.");
    if (trial.status === "failed" && [trial.shortlisted, trial.recommended, trial.cited, trial.purchased].some(v => v !== null))
        throw new Error("Failed tests must leave outcomes unassessed.");
    if (trial.recommended === true && trial.shortlisted === false)
        throw new Error("A recommended product cannot be marked absent from the shortlist.");
    if (trial.purchased !== null && !trial.orderEvidenceUrl)
        throw new Error("Purchase outcomes need separate order or checkout-test evidence.");
    return trial;
}
export type AgentAssessment = {
    gateId: AgentGateId;
    status: "supported" | "gap" | "unknown";
    basis: string;
    evidence: string[];
    owner: string;
    stale: boolean;
    sourceUrl?: string;
};
export function agentAssessments(input: StrategyEvidence, data: AgentCommerceData, productId: string, now: string): AgentAssessment[] {
    const { ctx, snapshot } = input;
    ownedProduct(ctx, productId);
    const valid = snapshot.mode === "live" && snapshot.brandId === ctx.brandId && snapshot.contextHash === ctx.contextHash;
    const pages = valid ? snapshot.pages.filter(p => p.productId === productId && p.kind === "pdp" && p.mode === "live") : [];
    return agentGates.map(gate => {
        const saved = data.checks.filter(c => c.productId === productId && c.gateId === gate.id).sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0];
        const stale = !!saved && (saved.contextHash !== ctx.contextHash || !Number.isFinite(Date.parse(saved.checkedAt)) || Date.parse(now) - Date.parse(saved.checkedAt) > 30 * 86400000);
        const newer = pages.filter(p => p.live && Date.parse(p.live.fetchedAt) > Date.parse(saved?.checkedAt ?? ""));
        const newConflict = gate.id === "access" ? newer.some(p => (p.statusCode !== null && p.statusCode !== 200) || p.noindex === true || p.robotsAllowed === false) : gate.id === "offer" && newer.some(p => p.live?.htmlInspected && ((p.visiblePrice !== null && p.schemaPrice !== null && p.visiblePrice !== p.schemaPrice) || (p.visibleAvailability !== null && p.schemaAvailability !== null && p.visibleAvailability !== p.schemaAvailability)));
        if (saved && !stale && !newConflict)
            return { gateId: gate.id, status: saved.status, basis: `Human review · ${saved.checkedAt}`, evidence: [saved.note], owner: saved.owner, sourceUrl: saved.sourceUrl, stale: false };
        const evidence: string[] = [];
        let status: AgentAssessment["status"] = "unknown";
        if (gate.id === "access" && pages.some(p => (p.statusCode !== null && p.statusCode !== 200) || p.noindex === true || p.robotsAllowed === false)) {
            status = "gap";
            evidence.push("A mapped product page has a failed HTTP, indexability or crawler-access signal. Review the affected URL in Audits.");
        }
        if (gate.id === "offer" && pages.some(p => p.live?.htmlInspected && ((p.visiblePrice !== null && p.schemaPrice !== null && p.visiblePrice !== p.schemaPrice) || (p.visibleAvailability !== null && p.schemaAvailability !== null && p.visibleAvailability !== p.schemaAvailability)))) {
            status = "gap";
            evidence.push("Visible price or availability conflicts with structured data on a mapped product page.");
        }
        const inspected = pages.filter(p => p.live?.htmlInspected && !p.live.error && p.statusCode === 200);
        if (gate.id === "access" && inspected.length)
            evidence.push(`${inspected.length} mapped HTML page(s) fetched; engine-specific access and indexing still need verification.`);
        if (gate.id === "identity" && inspected.length)
            evidence.push(`${inspected.filter(p => p.live!.productSchema.length).length} inspected page(s) contain Product schema; exact variant identity and feed parity remain unverified.`);
        if (gate.id === "policies" && inspected.length)
            evidence.push(`${inspected.filter(p => p.live!.policyLinks.shipping && p.live!.policyLinks.returns && p.live!.policyLinks.contact).length} inspected page(s) link to shipping, returns and contact; policy contents are unverified.`);
        if (newConflict)
            evidence.unshift("A newer crawl conflicts with the saved human review. Recheck the product before treating this gate as supported.");
        if (stale)
            evidence.unshift("Saved review belongs to older brand facts or is over 30 days old. Recheck; 30 days is our review reminder, not a ranking rule.");
        if (!evidence.length)
            evidence.push("No sufficient current evidence for this product and market. Collect it before assessing this gate.");
        return { gateId: gate.id, status, basis: status === "gap" ? "Observed crawl evidence" : inspected.length ? "Bounded crawl signals; review required" : "Not assessed", evidence, owner: saved?.owner ?? "", stale };
    });
}
export function agentCitationLeads(input: StrategyEvidence, productId: string) {
    const { ctx } = input;
    const run = input.runs.filter(r => r.brandId === ctx.brandId && r.contextHash === ctx.contextHash && r.locale === ctx.market && r.status !== "running").sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    const rows = run?.observations.filter(o => o.status === "completed" && o.prompt.cohort === "discovery" && (o.prompt.productId === productId || o.prompt.productId === null)) ?? [];
    const leads = new Map<string, {
        url: string;
        title: string;
        answers: number;
        prompt: string;
        observedAt: string;
    }>();
    for (const row of rows)
        for (const citation of [...new Map(row.citations.map(c => [c.url, c])).values()]) {
            try {
                validateReference(citation.url);
            }
            catch {
                continue;
            }
            const previous = leads.get(citation.url);
            leads.set(citation.url, { url: citation.url, title: citation.title || citation.url, answers: (previous?.answers ?? 0) + 1, prompt: row.prompt.text, observedAt: row.observedAt });
        }
    return { runId: run?.id, assessedAnswers: rows.length, leads: [...leads.values()].sort((a, b) => b.answers - a.answers).slice(0, 8) };
}
export function agentPriorities(assessments: AgentAssessment[]) {
    return [...assessments].filter(a => a.status !== "supported").sort((a, b) => {
        const score = (x: AgentAssessment) => (agentGates.find(g => g.id === x.gateId)!.optional ? 10 : 0) + (x.status === "gap" ? 0 : 1);
        return score(a) - score(b) || agentGates.findIndex(g => g.id === a.gateId) - agentGates.findIndex(g => g.id === b.gateId);
    });
}
export const agentOutcomeLabels = { shortlisted: "Product shortlisted", recommended: "Product recommended", cited: "Store cited", purchased: "Purchase completed" };
export function agentExperimentSummary(ctx: SeoContext, experiment: AgentExperiment, trials: AgentTrial[]) {
    const current = experiment.contextHash === ctx.contextHash;
    const rows = current ? trials.filter(t => t.experimentId === experiment.id && t.contextHash === ctx.contextHash) : [];
    const before = rows.filter(t => t.phase === "before" && (!experiment.changedAt || Date.parse(t.observedAt) < Date.parse(experiment.changedAt)));
    const after = rows.filter(t => t.phase === "after" && experiment.changedAt && Date.parse(t.observedAt) >= Date.parse(experiment.changedAt));
    return { stale: !current, failures: rows.filter(t => t.status === "failed").length,
        metrics: (Object.keys(agentOutcomeLabels) as (keyof typeof agentOutcomeLabels)[]).map(key => {
            const eligible = (r: AgentTrial) => r.status === "completed" && r[key] !== null;
            const left = before.filter(eligible), right = after.filter(eligible);
            const pairs = left.filter(l => right.some(r => r.repeat === l.repeat));
            const matchedAfter = right.filter(r => pairs.some(l => l.repeat === r.repeat));
            const rate = (r: AgentTrial[]) => r.length ? Math.round(100 * r.filter(t => t[key] === true).length / r.length) : null;
            const beforeRate = rate(left), afterRate = rate(right), b = rate(pairs), a = rate(matchedAfter);
            return { key, label: agentOutcomeLabels[key], beforeRate, afterRate, beforeN: left.length, afterN: right.length, pairs: pairs.length, delta: a !== null && b !== null ? a - b : null };
        }) };
}
export const agentContentKinds = ["buyer-guide", "comparison", "product-facts"] as const;
export type AgentContentKind = typeof agentContentKinds[number];
export function agentContentBrief(ctx: SeoContext, productId: string, personaIndex: number, kind: AgentContentKind): StrategyRowInput {
    const product = ownedProduct(ctx, productId), persona = ctx.personas[personaIndex] ?? { name: "Category shoppers", problem: `Choose appropriate ${productSearchType(product, ctx.category)}`, language: [] };
    const questions = customerQuestions(ctx, persona, productSearchType(product, ctx.category), product.name);
    const index = kind === "buyer-guide" ? 0 : kind === "comparison" ? 1 : 2;
    const keyword = questions[index].slice(0, 180), format = kind === "product-facts" ? "product-page" : kind === "comparison" ? "comparison" : "article";
    if (!ctx.websiteUrl)
        throw new Error("Add the storefront website to Brand Brain.");
    if (format === "product-page" && !product.url)
        throw new Error("Map this product's real URL in Brand Brain before creating a product-page brief.");
    const headings = kind === "buyer-guide" ? ["Answer the buyer's need", "Constraints and sensible alternatives", "Evidence and next steps"] : kind === "comparison" ? ["Decision criteria and comparison method", "Evidence for each option and trade-off", "Who should choose another option"] : ["Exact variant and suitability", "Current offer and delivery", "Returns, cancellation and support"];
    return { persona: persona.name.slice(0, 200), job: (persona.problem || persona.name).slice(0, 1000), stage: index === 0 ? "TOF" : index === 1 ? "MOF" : "BOF", keyword, productId, format, taskType: format === "product-page" ? "refresh" : "new", targetUrl: planStoreUrl(ctx, format === "product-page" ? product.url! : new URL(`/blogs/guides/${slug(keyword)}`, ctx.websiteUrl).href), title: keyword, decision: "Help a buyer or assistant evaluate the exact product against stated constraints using verifiable evidence and honest trade-offs.", description: "", owner: "", priority: "Medium", notes: "Agent-shopping editorial hypothesis. Review existing content before creating a URL. Collect dated sources for the exact SKU and market; do not invent competitor facts, reviews or suitability. Link the supported answer to the correct PDP. Blank research sections are a brief, not finished content.", sections: headings.map(heading => ({ heading, copy: "", sourceTitle: "", sourceUrl: "", limitations: "" })) };
}
export function agentWorkBrief(input: StrategyEvidence, data: AgentCommerceData, productId: string, now: string) {
    const p = ownedProduct(input.ctx, productId), checks = agentAssessments(input, data, productId, now);
    return [`# Agent shopping plan: ${p.name}`, `Brand: ${input.ctx.brandName} | Market: ${input.ctx.market} | Prepared: ${now}`, "## Decision model", "Reachable candidate → exact item → buyer fit → checkable evidence → usable offer → authorized purchase. This is a planning model, not a disclosed universal ranking algorithm.", "## Prioritized work", ...agentPriorities(checks).map(a => { const g = agentGates.find(g => g.id === a.gateId)!; return `### ${g.title} — ${a.status}\nOwner: ${a.owner || "Unassigned"}\nEvidence: ${a.evidence.join(" ")}\nAction: ${g.action}\nAcceptance: ${g.acceptance}\nTool: ${g.href}`; }), "## Improve through repeated evidence", "Freeze a buyer question, product, market, engine/model and surface. Collect at least three baseline repeats. Apply one documented change, record implementation, then repeat. Inspect competitor choices and source evidence. Separate shortlist, recommendation, citation and purchases. An API answer is not a consumer shopping placement; before/after changes are observational.", "## Sources reviewed 10 October 2026", ...agentSources.map(s => `- [${s.title}](${s.url})`)].join("\n\n");
}
