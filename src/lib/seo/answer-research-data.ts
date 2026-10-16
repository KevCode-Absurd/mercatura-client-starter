export const ANSWER_RESEARCH_DATE = "2026-10-10";
export const answerSources = {
    openaiSearch: { title: "OpenAI · Web search", url: "https://developers.openai.com/api/docs/guides/tools-web-search" },
    openaiBots: { title: "OpenAI · Crawlers", url: "https://developers.openai.com/api/docs/bots" },
    openaiFeed: { title: "OpenAI · Product feed specification", url: "https://developers.openai.com/commerce/specs/file-upload/products" },
    googleAi: { title: "Google · AI features and your website", url: "https://developers.google.com/search/docs/appearance/ai-features" },
    geminiSearch: { title: "Google · Gemini Search grounding", url: "https://ai.google.dev/gemini-api/docs/google-search" },
    geminiSources: { title: "Google · Gemini Apps related sources", url: "https://support.google.com/gemini/answer/14143489" },
    googleBots: { title: "Google · Crawler controls", url: "https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers" },
    googleProducts: { title: "Google · Share product data", url: "https://developers.google.com/search/docs/specialty/ecommerce/share-your-product-data-with-google" },
    claudeSearch: { title: "Anthropic · Web search", url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool" },
    claudeBots: { title: "Anthropic · Crawler controls", url: "https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler" },
    grokSearch: { title: "xAI · Web search", url: "https://docs.x.ai/developers/tools/web-search" },
    grokX: { title: "xAI · X search", url: "https://docs.x.ai/developers/tools/x-search" },
    perplexityBots: { title: "Perplexity · Crawlers", url: "https://docs.perplexity.ai/docs/resources/perplexity-crawlers" },
    searchStudy: { title: "Amani et al. · Conversational web search (2026 preprint)", url: "https://arxiv.org/html/2609.19244v1" },
    geoStudy: { title: "Aggarwal et al. · GEO (KDD 2024)", url: "https://arxiv.org/html/2311.09735v3" },
} as const;
export type AnswerSourceId = keyof typeof answerSources;
export const answerPlatforms: {
    id: string;
    name: string;
    mechanism: string;
    action: string;
    limit: string;
    sources: AnswerSourceId[];
}[] = [
    { id: "chatgpt", name: "ChatGPT", mechanism: "Search-enabled answers can search and cite web pages. Product feeds provide a separate route for product discovery.", action: "Review OAI-SearchBot access, readable product evidence and current feed eligibility. Manage GPTBot training preferences separately.", limit: "Our OpenAI API samples do not measure ChatGPT app placement, shopping cards or personalization. Feed acceptance does not guarantee recommendation.", sources: ["openaiSearch", "openaiBots", "openaiFeed"] },
    { id: "gemini", name: "Gemini", mechanism: "Search grounding can generate several queries and synthesize cited results. Gemini Apps and Google Search AI features are distinct surfaces.", action: "Maintain Google-indexable pages and product data. Review Google-Extended policy for the Gemini grounding uses Google documents, separately from Googlebot.", limit: "API grounding is not a Gemini Apps ranking test. Related links alone do not establish the complete retrieval history.", sources: ["geminiSearch", "geminiSources", "googleBots"] },
    { id: "claude", name: "Claude", mechanism: "Claude can decide to search, iterate and cite results; some API versions filter results before they reach context.", action: "Review Claude-SearchBot and Claude-User access; publish clear facts and inspect actual citations. ClaudeBot controls training separately.", limit: "The Claude API collector requires live mode, ANTHROPIC_API_KEY and organization web search access. API observations do not measure consumer Claude placement. Public documentation does not reveal product recommendation weights or a universal preferred publisher list.", sources: ["claudeSearch", "claudeBots"] },
    { id: "grok", name: "Grok", mechanism: "Web search retrieves and browses pages. X search is a separate tool that can retrieve social content.", action: "Maintain public evidence and genuine, disclosed participation on X when observed sources justify it.", limit: "No Grok collector is connected here. An X mention is not proof of trust or a recommendation. No verified universal Grok robots token is prescribed.", sources: ["grokSearch", "grokX"] },
    { id: "perplexity", name: "Perplexity", mechanism: "Perplexity documents separate search crawling and user-requested fetching.", action: "Review PerplexityBot access and published IP verification; inspect pages cited for the exact buyer question.", limit: "No Perplexity collector is connected here. Crawler documentation establishes access behavior, not ranking weights.", sources: ["perplexityBots"] },
    { id: "google-search", name: "Google AI Mode / AI Overviews", mechanism: "Search AI features may fan out across related queries; supporting pages must be indexed and snippet-eligible.", action: "Use ordinary SEO fundamentals and consistent Merchant Center data. Google states no special AI file or schema is required.", limit: "These are Google Search surfaces, distinct from Gemini Apps. Eligibility never guarantees serving.", sources: ["googleAi", "googleProducts"] },
];
export const entryStages = ["education", "form", "selection", "purchase"] as const;
export type EntryStage = typeof entryStages[number];
export const stagePlaybooks: Record<EntryStage, {
    title: string;
    question: string;
    destination: string;
    brief: string;
    alternatives: string;
    acceptance: string;
}> = {
    education: { title: "Understand the need", question: "What should I know before choosing a solution?", destination: "Reviewed educational guide", brief: "Explain the buyer's task, available approaches, decision criteria and evidence limits. Separate category knowledge from claims about a particular product; a product mention may be unnecessary.", alternatives: "Expert-reviewed resources, original research, demonstrations and clear links to primary evidence.", acceptance: "Every consequential claim has a source and scope. Use category-appropriate review; do not imply that every buyer needs the product." },
    form: { title: "Compare ways to meet the need", question: "Which product type or format fits my needs?", destination: "Type / format comparison", brief: "Compare applicable alternatives using the buyer's use case, specifications, compatibility, materials or ingredients, care, routine and total cost. Similar formats do not establish equivalent performance.", alternatives: "Product fact tables, demonstrations, qualified expert contributions and a clear evidence page.", acceptance: "Use comparable versions and units. Do not transfer a component test or category study to an untested finished product." },
    selection: { title: "Choose a suitable product", question: "Which product fits my requirements and budget?", destination: "Comparison plus complete product page", brief: "Use explicit buyer criteria and fair current comparisons. Make specifications, testing scope, suitability and total cost inspectable. Explain who the product is not for.", alternatives: "Accurate merchant feeds, independent editorial testing, authentic reviews and retailer listings.", acceptance: "Each comparison cell has a dated source; commercial relationships are disclosed. No self-awarded best-brand or certification claims." },
    purchase: { title: "Verify the offer", question: "What does this product cost and how does renewal work?", destination: "Product, shipping and subscription pages", brief: "Align selected variant, market, price, stock, pack size, renewal cadence, cancellation and returns across visible pages, structured data and feeds.", alternatives: "Product/Offer data, merchant-feed maintenance and accessible support policies.", acceptance: "The same variant and offer match across channels; distinguish first-order promotion from ongoing renewal price." },
};
export const entryGaps = ["unknown", "content", "access", "facts", "evidence", "coverage", "feed", "no-fit"] as const;
export type EntryGap = typeof entryGaps[number];
export const gapPlaybooks: Record<EntryGap, {
    title: string;
    action: string;
    owner: string;
    checks: string[];
    sources: AnswerSourceId[];
}> = {
    unknown: { title: "Cause not established", action: "Inspect cited pages and the buyer's criteria before choosing a tactic. Record why the brand should or should not be considered. Absence alone does not diagnose a problem.", owner: "Research lead", checks: ["Capture the exact answer and conditions", "Open citations and mark whether they support the answer", "Compare buyer requirements with verified product facts"], sources: ["searchStudy"] },
    content: { title: "Buyer question is not answered on the site", action: "Check existing destinations first, then build or refresh a useful guide or comparison for this buyer decision. Link to verified product facts where relevant.", owner: "Content / category reviewer", checks: ["Check whether an existing page already addresses the decision", "Answer using inspectable sources and explicit comparison criteria", "Review factual claims and product relevance before publication"], sources: ["googleAi", "geoStudy"] },
    access: { title: "Confirmed access restriction", action: "Review the exact bot, URL, robots group and CDN behavior. Restore intended public access where appropriate while preserving private-path exclusions and training preferences.", owner: "Store developer", checks: ["Retest the exact public URL and bot policy", "Check noindex, canonical and snippet controls", "Verify actual crawler requests separately from user-agent text"], sources: ["openaiBots", "claudeBots", "googleAi", "perplexityBots"] },
    facts: { title: "Missing or stale product facts", action: "Repair the authoritative existing product or policy page and synchronize downstream data. Write an article only if the buying decision needs a separate explanation.", owner: "Merchandising / content", checks: ["Identify one authoritative destination", "Reconcile variant, serving, price and purchase terms", "Recheck the saved factual discrepancy against the updated source"], sources: ["googleProducts", "openaiFeed"] },
    evidence: { title: "Claim evidence is insufficient", action: "Publish inspectable evidence with methodology and limits. Separate component research, finished-product testing, certifications and customer experience.", owner: "Product / category reviewer", checks: ["Match evidence to the exact claim and tested version", "Record test conditions, sample, outcome, date and limits", "Keep quality or compliance tests separate from performance claims"], sources: ["googleAi", "geoStudy"] },
    coverage: { title: "Relevant independent coverage gap", action: "Research the actual cited publisher or community. Offer useful facts or a review sample with disclosure; editorial judgment remains independent.", owner: "PR / partnerships", checks: ["Confirm cited-page relevance and accuracy", "Separate independent sources from syndicated copies", "Avoid bought rankings, fake reviews and undisclosed promotion"], sources: ["searchStudy", "geoStudy"] },
    feed: { title: "Product discovery data gap", action: "Inspect platform feed access and actual accepted item status. Reconcile identity, variant, market, offer and availability with the public product page.", owner: "Commerce operations", checks: ["Check acceptance and eligibility rather than assuming submission succeeded", "Match feed and page for the same variant and market", "Measure shopping appearance separately from text citations"], sources: ["openaiFeed", "googleProducts"] },
    "no-fit": { title: "Product does not fit this question", action: "Record a legitimate no-fit outcome. Improve buyer clarity or investigate product capability; do not commission content claiming unsupported suitability.", owner: "Product / research lead", checks: ["Document the unmet buyer criterion", "Keep unsupported claims out of pages and feeds", "Revisit only when verified product evidence changes"], sources: ["googleAi"] },
};
export const entryRoutes = ["research", "content", "facts", "evidence", "access", "feed", "coverage"] as const;
export type EntryRoute = typeof entryRoutes[number];
export function feedRouteNote(platform: string) {
    return platform === "chatgpt" ? "Review OpenAI's current feed access, accepted format and item eligibility; display is not guaranteed."
        : platform === "google-search" ? "Review Google Merchant Center and product page data; eligibility for Google Search does not guarantee serving."
            : "No direct product-feed program for this target platform is established by this workspace's references. Reconcile supported commerce channels separately; do not assume that an accepted feed creates placement on this platform.";
}
export const routePlaybooks: Record<EntryRoute, {
    title: string;
    deliverable: string;
    steps: string[];
}> = {
    research: { title: "Research / product-fit record", deliverable: "An evidence inspection worksheet and baseline protocol", steps: ["Inspect the exact buyer criteria and cited sources", "Compare requirements with verified product facts", "Record a supported diagnosis or legitimate no-fit outcome", "Collect a comparable answer sample before choosing an intervention"] },
    content: { title: "Guide or comparison", deliverable: "An editable editorial starter, source worksheet and publishing checklist", steps: ["Choose an existing destination to refresh or a new guide URL", "Replace all pending answers with source-backed explanations", "Review product fit, comparison fairness and links", "Publish the reviewed guide and check the rendered page", "Repeat the same buyer questions and record outcomes"] },
    facts: { title: "Product / policy fact refresh", deliverable: "A field-by-field reconciliation table and page update plan", steps: ["Identify the authoritative product or policy destination", "Verify the selected version's facts and purchase terms", "Update visible copy and synchronize structured data and feeds", "Check the live page and downstream records", "Repeat the factual accuracy question"] },
    evidence: { title: "Evidence and testing page", deliverable: "A claim-to-evidence register and evidence-page outline", steps: ["Identify the exact product claim and supporting material", "Review methodology, tested version and limitations", "Publish qualified evidence with primary references", "Check claims against the rendered evidence page", "Repeat the same buyer questions and inspect citation support"] },
    access: { title: "Crawler access review", deliverable: "A bot-and-URL review worksheet and retest procedure", steps: ["Capture the current robots policy and affected public URL", "Review the selected platform's documented access controls", "Apply the reviewed policy or CDN change with a rollback copy", "Retest robots, indexing controls and actual access separately", "Run a fresh website audit and answer sample"] },
    feed: { title: "Product data / feed reconciliation", deliverable: "An item-level reconciliation worksheet and acceptance checklist", steps: ["Confirm platform access and current feed contract", "Reconcile identity, version, market and offer fields", "Submit the reviewed records through the commerce platform", "Record accepted item status and eligibility evidence", "Measure shopping appearance separately from text citations"] },
    coverage: { title: "Independent coverage research", deliverable: "A publisher shortlist worksheet and disclosed review information pack", steps: ["Inspect publishers actually cited for the buyer decision", "Verify relevance and editorial independence", "Prepare accurate product facts and relationship disclosures", "Record any separately authorized outreach and editorial outcome", "Inspect future citations and recommendations independently"] },
};
export const gapRoutes: Record<EntryGap, readonly EntryRoute[]> = {
    unknown: ["research"], content: ["content"], access: ["access"], facts: ["facts", "feed"],
    evidence: ["evidence", "content"], coverage: ["coverage"], feed: ["feed"], "no-fit": ["research"],
};
export const searchBots = ["Googlebot", "OAI-SearchBot", "Claude-SearchBot", "Claude-User", "PerplexityBot"] as const;
