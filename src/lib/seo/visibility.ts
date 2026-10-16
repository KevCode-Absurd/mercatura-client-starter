import { productSearchType, type SeoContext } from "./model";
export const visibilityStages = ["problem", "exploration", "comparison", "brand", "purchase"] as const;
export type VisibilityStage = typeof visibilityStages[number];
export const visibilityStageLabels: Record<VisibilityStage | "unclassified", string> = { problem: "Problem & everyday need", exploration: "Explore advice & options", comparison: "Compare products & brands", brand: "Consider this brand", purchase: "Purchase & policy checks", unclassified: "Earlier prompts · no funnel stage" };
export type VisibilityPrompt = {
    id: string;
    text: string;
    cohort: "branded" | "discovery";
    intent: "buying-guide" | "comparison" | "purchase-facts";
    stage?: VisibilityStage;
    productId: string | null;
    targetUrl: string | null;
};
export type VisibilityCitation = {
    url: string;
    title: string;
};
export type VisibilityObservation = {
    id: string;
    prompt: VisibilityPrompt;
    provider: "openai" | "gemini" | "anthropic";
    model: string;
    observedAt: string;
    locale: string;
    repeat: number;
    status: "completed" | "failed";
    answer: string;
    citations: VisibilityCitation[];
    searchQueries?: string[];
    retrievedSources?: VisibilityCitation[];
    brandMentioned: boolean | null;
    storeCited: boolean | null;
    error?: string;
    citationAssessmentComplete?: boolean;
    searchEntryPointHtml?: string;
    factReview?: {
        status: "verified" | "discrepancy" | "unverified";
        note: string;
        sourceUrl: string;
        reviewedAt: string;
    };
};
export type VisibilityRun = {
    id: string;
    brandId: string;
    contextHash: string;
    startedAt: string;
    completedAt: string;
    locale: string;
    observations: VisibilityObservation[];
    status: "running" | "completed" | "partial" | "failed";
    plannedResponses?: number;
    costUsd: number;
    costEstimated?: boolean;
    modelIds?: string[];
    promptIds?: string[];
};
const normalized = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const includesName = (text: string, name: string) => {
    const needle = normalized(name);
    return needle.length > 0 && ` ${normalized(text)} `.includes(` ${needle} `);
};
function discoveryType(ctx: SeoContext): {
    type: string;
    product: SeoContext["products"][number] | undefined;
} {
    const types = new Map<string, {
        count: number;
        product: SeoContext["products"][number];
    }>();
    for (const product of ctx.products) {
        const candidate = productSearchType(product, ctx.category).trim();
        if (!candidate || includesName(candidate, ctx.brandName) || normalized(candidate) === normalized(product.name))
            continue;
        const existing = types.get(candidate);
        types.set(candidate, { count: (existing?.count ?? 0) + 1, product: existing?.product ?? product });
    }
    const selected = [...types.entries()].sort((a, b) => b[1].count - a[1].count)[0];
    if (selected) {
        const qualified = ctx.category.split(":").at(-1)!.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
        const type = qualified.length <= 100 && includesName(qualified, selected[0]) && !includesName(qualified, ctx.brandName) ? qualified.toLowerCase() : selected[0];
        return { type, product: selected[1].product };
    }
    const category = ctx.category.replace(/\s+/g, " ").trim();
    return {
        type: category && category.length <= 100 && !includesName(category, ctx.brandName) ? category : "products sold directly by online brands",
        product: ctx.products[0],
    };
}
function personaCue(ctx: SeoContext, value: string, question = false): string | null {
    const clean = value.replace(/[\r\n<>`]/g, " ").replace(/\s+/g, " ").trim();
    if (clean.length < 8 || clean.length > 140 || /https?:|www\.|@|\b(?:ignore|instructions?|system|prompt|cure[sd]?|treats?|diagnos\w*|guarantee[sd]?)\b/i.test(clean))
        return null;
    const blocked = [ctx.brandName, ...ctx.products.map((p) => p.name), ...ctx.claims.map((c) => c.text), ...ctx.forbiddenClaims].filter((s) => s.trim().length > 2);
    if (blocked.some((name) => includesName(clean, name)))
        return null;
    if (question && (!/^(?:how|what|why|when|can|should|is|are|do|does|which|where)\b/i.test(clean) || !clean.endsWith("?")))
        return null;
    return clean;
}
function everydayQueries(ctx: SeoContext, type: string): string[] {
    const subject = normalized(`${type} ${ctx.category}`);
    const persona = normalized(ctx.personas.flatMap((p) => [p.name, p.problem, ...p.language]).join(" "));
    if (/nutrition|supplement|greens|wellness|gummies/.test(subject))
        return [
            "I often feel bloated after meals. What should I consider before trying supplements?",
            "I keep falling out of my everyday nutrition routine. How can I make it simpler?",
            /gritty|texture|shaker|powder/.test(persona) ? "I bought a greens powder but hate the texture and cleaning the shaker. What are my options?" : "How do I tell whether my diet is missing variety before I start buying supplements?",
            /parent|kids|children|family/.test(persona) ? "Between work and looking after the kids, I keep skipping balanced meals. What are some realistic first steps?" : "I struggle to eat varied meals when work gets busy. Where should I start?",
            "There is so much nutrition advice online. How can I tell what is trustworthy?",
            "I want to improve my everyday eating habits without overcomplicating things. What matters most?",
            "What should I ask a qualified professional before adding a supplement to my routine?",
            "How can I keep up a sensible food routine when I travel a lot?",
        ];
    if (/cookware|skillet|pan|kitchen/.test(subject))
        return [
            "Food keeps sticking when I cook. What should I check before replacing my pan?", "I want to cook more at home but my kitchen is tiny. What do I actually need?", "How can I make weeknight cooking easier without buying lots of equipment?", "How do I know when a pan needs replacing instead of just better care?", "I have a new hob. How do I check whether my existing cookware will work?", "Why does my cooking turn out unevenly, and what can I try?", "What kitchen tools are worth buying first when moving into a new home?", "How can I reduce the cleanup after everyday cooking?",
        ];
    if (/skin|beauty|serum|cleanser|moistur/.test(subject))
        return [
            "My skincare routine feels too complicated. How can I simplify it?", "How can I work out what my skin needs before buying more products?", "What should I ask a qualified professional about recurring skin concerns?", "How do I introduce a new skincare product carefully?", "How can I tell useful skincare advice from marketing hype?", "What should I look at when a product does not seem to suit me?", "How can I keep a simple skincare routine while travelling?", "What information should I keep track of when changing my skincare routine?",
        ];
    if (/apparel|clothing|hoodie|shirt|fashion|hat|shoe/.test(subject))
        return [
            "How can I build a smaller wardrobe that works for everyday life?", "I keep buying clothes I hardly wear. How do I make better choices?", "How do I work out which fit suits me when shopping online?", "What should I check when my clothes wear out sooner than expected?", "How can I choose comfortable clothes for a busy day?", "What matters most when buying clothes for a change in season?", "How can I tell whether clothing quality is worth the price?", "How do I make my everyday clothes last longer?",
        ];
    return [
        "I keep buying things that do not really fit my routine. How can I choose more carefully?", "How can I work out what I actually need before I start shopping?", "What should I check before replacing something I already own?", "How do I tell a useful product from clever marketing?", "I am buying for someone else. How can I choose something they will actually use?", "How can I balance price and everyday usefulness when buying something new?", "What should I think about before trying an unfamiliar online brand?", "How can I avoid buying more than I need?",
    ];
}
export function buildVisibilityPrompts(ctx: SeoContext): VisibilityPrompt[] {
    if (!ctx.products.length)
        return [];
    const { type, product } = discoveryType(ctx);
    const meta = { productId: product?.id ?? null, targetUrl: product?.url ?? ctx.websiteUrl ?? null };
    const brand = ctx.brandName.trim();
    const identity = product?.name ? includesName(product.name, brand) ? product.name : `${product.name} from ${brand}` : brand;
    const problem = everydayQueries(ctx, type);
    const cue = ctx.personas.map((p) => personaCue(ctx, p.problem)).find(Boolean);
    const language = ctx.personas.flatMap((p) => p.language).map((p) => personaCue(ctx, p, true)).find(Boolean);
    if (cue && /^I(?:\s|['’](?:m|ve|d|ll)\b)/i.test(cue))
        problem[6] = `${cue.replace(/[.!?]+$/, "")}. What should I understand before deciding what to do?`;
    if (language)
        problem[7] = language;
    const texts: Record<VisibilityStage, string[]> = {
        problem,
        exploration: [
            `Are ${type} something I should consider, or are there simpler alternatives?`, `What should a beginner know about ${type}?`, `What are the main reasons people consider ${type}, and what are the limitations?`, `How can I decide whether ${type} fit my everyday routine?`, `What should I check on the label or product details when looking at ${type}?`, `What evidence is worth looking for when a brand makes claims about ${type}?`, `What mistakes do people make when choosing ${type} for the first time?`, `What questions should I answer for myself before spending money on ${type}?`,
        ],
        comparison: [
            `Which brands of ${type} are worth comparing?`, `How do budget and premium ${type} compare for everyday use?`, `What are the most useful differences to compare between ${type}?`, `Which ${type} offer good value once delivery and repeat purchases are included?`, `How can I compare reviews of ${type} without being misled?`, `What alternatives to ${type} should I compare before deciding?`, `Which online stores selling ${type} make their product details and policies easy to understand?`, `How should I compare ${type} if I care most about convenience and a simple routine?`,
        ],
        brand: [
            `What is ${brand}, and what does it sell?`, `What should I know about ${identity} before considering it?`, `How does ${brand} compare with other brands selling ${type}?`, `What are the main pros and cons people discuss about ${brand}?`, `Where can I find reliable information about ${brand}'s product claims?`, `What do independent reviews say about ${brand}, and how recent are they?`, `Who might find ${identity} a good fit, and who should consider other options?`, `What questions are still worth checking before choosing ${brand}?`,
        ],
        purchase: [
            `Where is the official store for ${brand}, and is ${product?.name || "its main product"} available right now?`, `What does ${identity} cost, and what exactly comes with the purchase?`, `Does ${brand} deliver to ${ctx.market.trim() || "my region"}, and how long does shipping usually take?`, `What shipping charges should I expect when ordering from ${brand}?`, `What is ${brand}'s return and refund policy if the product does not suit me?`, `Can I buy from ${brand} once, or is there a subscription option?`, `If ${brand} offers a subscription, how do changes or cancellation work?`, `How can I contact ${brand} if I have a question before ordering?`,
        ],
    };
    const seen = new Set<string>();
    return visibilityStages.flatMap((stage) => texts[stage].map((text, i) => {
        if (seen.has(normalized(text)))
            text = everydayQueries(ctx, type)[i];
        seen.add(normalized(text));
        return { id: `funnel-v2:${stage}:${i + 1}`, stage, cohort: stage === "brand" || stage === "purchase" ? "branded" as const : "discovery" as const, intent: stage === "purchase" ? "purchase-facts" as const : stage === "comparison" || stage === "brand" ? "comparison" as const : "buying-guide" as const, text, ...meta };
    }));
}
export const defaultVisibilityPromptIds = (prompts: VisibilityPrompt[]): string[] => prompts.filter((p) => { const slot = Number(p.id.split(":").pop()); return p.stage === "problem" ? [1, 2, 7, 8].includes(slot) : slot <= 4; }).map((p) => p.id);
export const defaultVisibilityModelIds = (models: {
    id: string;
    available: boolean;
}[]): string[] => models.filter((m) => m.available).slice(0, 1).map((m) => m.id);
function safeHttpUrl(value: string): URL | null {
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !!url.hostname ? url : null;
    }
    catch {
        return null;
    }
}
export function analyzeVisibilityAnswer(ctx: SeoContext, answer: string, citations: VisibilityCitation[]): {
    citations: VisibilityCitation[];
    brandMentioned: boolean | null;
    storeCited: boolean | null;
} {
    const seen = new Set<string>();
    const clean = citations.flatMap((citation) => {
        const url = safeHttpUrl(citation.url);
        if (!url || seen.has(url.href))
            return [];
        seen.add(url.href);
        return [{ url: url.href, title: citation.title.trim() || url.hostname }];
    });
    if (!answer.trim())
        return { citations: clean, brandMentioned: null, storeCited: null };
    const prose = answer.replace(/\[([^\]]*)\]\(https?:\/\/[^)]+\)/gi, "$1").replace(/https?:\/\/[^\s<>]+/gi, " ");
    const website = ctx.websiteUrl ? safeHttpUrl(ctx.websiteUrl) : null;
    const host = website?.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    return {
        citations: clean,
        brandMentioned: ctx.brandName.trim() ? includesName(prose, ctx.brandName) : null,
        storeCited: host ? clean.some(({ url }) => {
            const citedHost = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
            return citedHost === host || citedHost.endsWith(`.${host}`);
        }) : null,
    };
}
export type VisibilityCohortSummary = {
    total: number;
    completed: number;
    failed: number;
    mentions: number;
    citations: number;
    mentionAssessed: number;
    citationAssessed: number;
    mentionRate: number | null;
    citationRate: number | null;
};
export type VisibilityRecommendation = {
    id: string;
    title: string;
    detail: string;
    observationIds: string[];
};
export type VisibilitySummary = {
    total: number;
    completed: number;
    failed: number;
    branded: VisibilityCohortSummary;
    discovery: VisibilityCohortSummary;
    recommendations: VisibilityRecommendation[];
};
export function summarizeVisibility(run: VisibilityRun): VisibilitySummary {
    const usable = (observation: VisibilityObservation) => observation.status === "completed" && !!observation.answer.trim();
    const cohort = (kind: VisibilityPrompt["cohort"]): VisibilityCohortSummary => {
        const all = run.observations.filter((o) => o.prompt.cohort === kind);
        const completed = all.filter(usable);
        const mentionAssessed = completed.filter((o) => o.brandMentioned !== null).length;
        const citationAssessed = completed.filter((o) => o.storeCited !== null).length;
        const mentions = completed.filter((o) => o.brandMentioned === true).length;
        const citations = completed.filter((o) => o.storeCited === true).length;
        return { total: all.length, completed: completed.length, failed: all.length - completed.length,
            mentions, citations, mentionAssessed, citationAssessed,
            mentionRate: mentionAssessed ? Math.round(mentions / mentionAssessed * 100) : null,
            citationRate: citationAssessed ? Math.round(citations / citationAssessed * 100) : null };
    };
    const branded = cohort("branded"), discovery = cohort("discovery");
    const completed = run.observations.filter(usable);
    const recommendations: VisibilityRecommendation[] = [];
    const add = (id: string, title: string, detail: string, observations: VisibilityObservation[]) => {
        if (observations.length)
            recommendations.push({ id, title, detail, observationIds: observations.map((o) => o.id) });
    };
    add("discovery-absent", "Review discovery coverage by intent", "The brand was absent from these sampled unbranded answers. A general problem question may not call for a brand at all. Use the stage breakdown: examine useful educational evidence for early questions, and relevant category guides or product comparisons for shopping intent. This sample does not establish a ranking or a guaranteed traffic opportunity.", completed.filter((o) => o.prompt.cohort === "discovery" && o.brandMentioned === false));
    add("official-citations", "Improve the official source for purchase answers", "These branded answers did not cite the store. Inspect each answer and its cited sources, then make the relevant product facts, shipping, returns and cancellation policies clear and linkable on the official site. Absence of a citation does not prove an answer is incorrect.", completed.filter((o) => o.prompt.cohort === "branded" && o.storeCited === false));
    add("fact-review", "Verify purchase facts against the store", "Review the recorded price, availability, delivery and policy statements against dated official pages before accepting them. A mention or citation alone does not verify factual accuracy; this audit does not automatically mark those claims correct.", completed.filter((o) => o.prompt.intent === "purchase-facts" && (!o.factReview || o.factReview.status === "unverified")));
    add("fact-discrepancy", "Resolve reported purchase-fact discrepancies", "A human reviewer recorded a discrepancy against an identified source for these responses. Review the saved notes and source, then correct or clarify the relevant official product or policy page if needed. Rerun the same prompt after changes; the original response remains historical evidence.", completed.filter((o) => o.factReview?.status === "discrepancy"));
    add("collection-errors", "Retry incomplete response collection", "These requests did not yield usable answers and were excluded from visibility rates. Review the recorded provider errors, connection and budget before retrying.", run.observations.filter((o) => !usable(o)));
    return { total: run.observations.length, completed: completed.length, failed: run.observations.length - completed.length, branded, discovery, recommendations };
}
export type VisibilityModelSummary = VisibilityCohortSummary & {
    provider: VisibilityObservation["provider"];
    model: string;
};
export type VisibilityStageSummary = VisibilityCohortSummary & {
    stage: VisibilityStage | "unclassified";
    label: string;
    models: VisibilityModelSummary[];
    recommendations: VisibilityRecommendation[];
};
function observationCounts(all: VisibilityObservation[]): VisibilityCohortSummary {
    const completed = all.filter((o) => o.status === "completed" && Boolean(o.answer.trim()));
    const mentionAssessed = completed.filter((o) => o.brandMentioned !== null).length;
    const citationAssessed = completed.filter((o) => o.storeCited !== null).length;
    const mentions = completed.filter((o) => o.brandMentioned === true).length;
    const citations = completed.filter((o) => o.storeCited === true).length;
    return { total: all.length, completed: completed.length, failed: all.length - completed.length, mentionAssessed, citationAssessed, mentions, citations, mentionRate: mentionAssessed ? Math.round(100 * mentions / mentionAssessed) : null, citationRate: citationAssessed ? Math.round(100 * citations / citationAssessed) : null };
}
function modelCounts(observations: VisibilityObservation[]): VisibilityModelSummary[] {
    const groups = new Map<string, VisibilityObservation[]>();
    for (const o of observations) {
        const key = JSON.stringify([o.provider, o.model]);
        groups.set(key, [...(groups.get(key) ?? []), o]);
    }
    return [...groups.values()].map((items) => ({ provider: items[0].provider, model: items[0].model, ...observationCounts(items) }));
}
const stageStrategy: Record<VisibilityStage | "unclassified", string> = {
    problem: "Read the advice and cited experts to understand the underlying need. Plan a useful problem-first guide with evidence and practical steps; do not force a product recommendation where it would not help. Brand absence can be appropriate at this stage.",
    exploration: "Build a balanced category explainer covering alternatives, limitations, suitability and credible evidence. Connect it to a relevant product or collection only when the buyer's question justifies that next step.",
    comparison: "Prepare a fair comparison or buying guide using dated, checkable criteria, total cost and meaningful trade-offs. Link the relevant collection and product pages. Do not invent competitor claims or rankings.",
    brand: "Clarify who the brand serves, product differences, substantiated claims and accessible supporting sources. Review the actual third-party sources cited before deciding which official page needs better evidence.",
    purchase: "Make current product details, price, stock, delivery, returns and any subscription terms clear on the official product and policy pages. Use the answer's specific missing fact to choose the page to improve.",
    unclassified: "These earlier prompts have no saved funnel stage. Review their original wording individually; rerun the current question set before comparing coverage by stage.",
};
export function summarizeVisibilityStages(run: VisibilityRun): {
    stages: VisibilityStageSummary[];
    models: VisibilityModelSummary[];
} {
    const keys: (VisibilityStage | "unclassified")[] = [...visibilityStages];
    if (run.observations.some((o) => !o.prompt.stage))
        keys.push("unclassified");
    const stages = keys.map((stage): VisibilityStageSummary => {
        const all = run.observations.filter((o) => (o.prompt.stage ?? "unclassified") === stage);
        const completed = all.filter((o) => o.status === "completed" && Boolean(o.answer.trim()));
        const recommendations: VisibilityRecommendation[] = [];
        const absent = completed.filter((o) => o.brandMentioned === false || o.storeCited === false);
        if (absent.length)
            recommendations.push({ id: `stage:${stage}:coverage`, title: stage === "problem" ? "Understand the advice before seeking a mention" : `Review ${visibilityStageLabels[stage].toLowerCase()} coverage`, detail: `${stageStrategy[stage]} These sampled responses lack a brand mention or official-store citation. This is an evidence review prompt, not a measured traffic opportunity or proof that the brand should appear.`, observationIds: absent.map((o) => o.id) });
        const discrepancies = completed.filter((o) => o.factReview?.status === "discrepancy");
        if (discrepancies.length)
            recommendations.push({ id: `stage:${stage}:facts`, title: "Resolve human-reported discrepancies at this stage", detail: "Inspect the recorded human review, the exact response and its reference source. Prepare a supported correction or clearer official explanation, have a human review and implement it, then repeat the same question and model. A mention or citation does not establish accuracy or endorsement.", observationIds: discrepancies.map((o) => o.id) });
        return { stage, label: visibilityStageLabels[stage], ...observationCounts(all), models: modelCounts(all), recommendations };
    });
    return { stages, models: modelCounts(run.observations) };
}
