import { z } from "zod";
import { productSearchType, type SeoContext } from "./model";
import type { VisibilityObservation, VisibilityRun } from "./visibility";
import { ANSWER_RESEARCH_DATE, answerPlatforms, answerSources, entryGaps, entryRoutes, entryStages, gapPlaybooks, gapRoutes, stagePlaybooks } from "./answer-research-data";
export function buyerQuestion(ctx: SeoContext, stage: typeof entryStages[number], productId = "") {
    const product = ctx.products.find(p => p.id === productId);
    const subject = product ? productSearchType(product, ctx.category) : ctx.category.trim() || "this product category";
    const name = product?.name ?? `${ctx.brandName} products`;
    return ({ education: `What should I know before choosing ${subject}?`, form: `Which types of ${subject} fit my needs?`, selection: `How should I compare ${subject} for my requirements and budget?`, purchase: `What does ${name} cost, and what are the delivery and return terms?` })[stage];
}
export function publicCitationUrl(value: string): URL | null {
    try {
        const url = new URL(value);
        if (!/^https?:$/.test(url.protocol) || url.username || url.password)
            return null;
        url.hash = "";
        return url;
    }
    catch {
        return null;
    }
}
const hostname = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, "");
export function currentResearchRun(ctx: SeoContext, runs: VisibilityRun[]) {
    return runs.filter(r => r.brandId === ctx.brandId && r.contextHash === ctx.contextHash)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}
export function citationAtlas(ctx: SeoContext, run: VisibilityRun | undefined) {
    if (!run || run.brandId !== ctx.brandId || run.contextHash !== ctx.contextHash)
        return [];
    const own = ctx.websiteUrl ? publicCitationUrl(ctx.websiteUrl) : null;
    const rows = new Map<string, {
        url: string;
        title: string;
        domain: string;
        owned: boolean;
        observations: string[];
        questions: string[];
        providers: string[];
    }>();
    for (const observation of run.observations.filter(o => o.status === "completed")) {
        for (const citation of observation.citations) {
            const url = publicCitationUrl(citation.url);
            if (!url)
                continue;
            const domain = hostname(url), key = url.href;
            const row = rows.get(key) ?? { url: key, title: citation.title || domain, domain, owned: !!own && domain === hostname(own), observations: [], questions: [], providers: [] };
            if (!row.observations.includes(observation.id))
                row.observations.push(observation.id);
            if (!row.questions.includes(observation.prompt.text))
                row.questions.push(observation.prompt.text);
            if (!row.providers.includes(observation.provider))
                row.providers.push(observation.provider);
            rows.set(key, row);
        }
    }
    return [...rows.values()].sort((a, b) => b.observations.length - a.observations.length || a.url.localeCompare(b.url));
}
export const entryBriefSchema = z.object({
    stage: z.enum(entryStages), gap: z.enum(entryGaps), question: z.string().trim().min(3).max(1000),
    note: z.string().trim().min(20).max(4000),
    platform: z.enum(["chatgpt", "gemini", "claude", "grok", "perplexity", "google-search"]).default("chatgpt"),
    productId: z.string().max(150).optional(), route: z.enum(entryRoutes).optional(),
    targetUrl: z.string().trim().max(2000).optional(),
    runId: z.string().max(150).optional(), observationId: z.string().max(150).optional(),
}).refine(v => !!v.runId === !!v.observationId, "Choose both a run and observation, or neither.");
export type EntryBriefInput = z.infer<typeof entryBriefSchema>;
export function buildEntryBrief(ctx: SeoContext, raw: unknown, runs: VisibilityRun[]) {
    const input = entryBriefSchema.parse(raw), stage = stagePlaybooks[input.stage], gap = gapPlaybooks[input.gap];
    const product = input.productId ? ctx.products.find(p => p.id === input.productId) : undefined;
    if (input.productId && !product)
        throw new Error("Choose a product from the active Brand Brain.");
    const route = input.route ?? gapRoutes[input.gap][0];
    if (!gapRoutes[input.gap].includes(route))
        throw new Error("This output does not match the selected diagnosis.");
    const targetUrl = input.targetUrl || (route === "content" ? "" : product?.url || ctx.websiteUrl || "");
    if (targetUrl && !publicCitationUrl(targetUrl))
        throw new Error("Enter a public HTTP or HTTPS destination without credentials.");
    const platform = answerPlatforms.find(p => p.id === input.platform)!;
    let observation: VisibilityObservation | undefined;
    if (input.runId) {
        const run = runs.find(r => r.id === input.runId && r.brandId === ctx.brandId && r.contextHash === ctx.contextHash);
        observation = run?.observations.find(o => o.id === input.observationId && o.status === "completed");
        if (!run || run.status === "running" || !observation)
            throw new Error("Choose a completed saved answer for the current Brand Brain.");
        if (input.question !== observation.prompt.text)
            throw new Error("The research question must match the saved observation.");
    }
    const sources = [...new Set([...gap.sources, ...platform.sources])];
    const body = [
        `# ${stage.title}: ${gap.title}`,
        `Brand: ${ctx.brandName}\nStore: ${ctx.websiteUrl ?? "Not set"}\nMarket: ${ctx.market}\nBrand Brain: ${ctx.contextHash}\nMechanism research checked: ${ANSWER_RESEARCH_DATE}`,
        `Category: ${ctx.category || "Not set"}\nScope: ${product?.name ?? "Brand / category"}\nPlatform: ${platform.name}\nDestination: ${targetUrl || "Choose before implementation"}\nOutput route: ${route}`,
        "## Selected platform", `${platform.mechanism}\n\n${platform.action}\n\n${platform.limit}`,
        "## Buyer question", input.question,
        "## Evidence and diagnosis", observation ? `Saved API observation ${observation.id} in run ${input.runId}; ${observation.provider}/${observation.model}; ${observation.locale}; ${observation.observedAt}; repeat ${observation.repeat}.\n\n${observation.answer}\n\nVisible citations:\n${observation.citations.flatMap(c => publicCitationUrl(c.url) ? [`- ${c.title}: ${c.url}`] : []).join("\n") || "None recorded."}\n\nCitation support and product recommendation status require human inspection. A citation is not an endorsement, and this API answer does not measure consumer-app placement.` : "User-entered question and hypothesis. No saved chatbot answer is attached; visibility and citation gaps remain unmeasured.",
        `Human diagnosis (not automatically verified): ${input.note}`,
        ...(observation ? ["## Provider-exposed retrieval metadata", `Queries: ${observation.searchQueries?.join(" | ") || "Not exposed in this saved observation."}\nProvider-returned source candidates (distinct from inline citations; metadata can be incomplete):\n${observation.retrievedSources?.flatMap(s => publicCitationUrl(s.url) ? [`- ${s.title}: ${s.url}`] : []).join("\n") || "Not available in this observation."}`] : []),
        "## Proposed intervention", gap.action,
        `Suggested owner: ${gap.owner}\nDestination to evaluate: ${stage.destination}`,
        "## Content brief if justified", stage.brief,
        "## Routes beyond articles", stage.alternatives,
        "## Acceptance checks", ...gap.checks.map(c => `- ${c}`), stage.acceptance,
        "## Measurement", "Freeze neutral discovery questions separately from branded accuracy questions. Repeat under the same surface, market, mode and session conditions. Record failures. Count mention, explicit recommendation, owned citation, third-party citation, factual accuracy and shopping appearance separately. Compare against an unchanged topic group where feasible; before/after movement alone does not prove causation. Track identifiable referrals and purchases separately.",
        "## Primary sources", ...sources.map(id => `- [${answerSources[id].title}](${answerSources[id].url})`),
        "## Review and implementation", "This is a research-led proposal. Assign a destination, owner and review date. Inspect source support and approved claims before implementation. No store changes or outreach have been performed.",
    ].join("\n\n");
    return { input, route, targetUrl, product, title: `${stage.title}: ${gap.title}`, body, sourceIds: ["answer-research:2026-10-10", ...sources.map(s => `research:${s}`), ...(product ? [`brand:${ctx.brandId}:product:${product.id}`] : []), ...(observation ? [`visibility:${input.runId}:${observation.id}`] : [])] };
}
