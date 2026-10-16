import type { LiveCrawlMetadata, LivePageEvidence } from "./live-types";
import { coreProducts } from "./scope";
export type SeoCategory = "SEO" | "AEO" | "GEO";
export type SeoContext = {
    brandId: string;
    brandName: string;
    category: string;
    market: string;
    websiteUrl?: string;
    products: {
        id: string;
        name: string;
        format: string;
        url?: string;
    }[];
    personas: {
        name: string;
        problem: string;
        language: string[];
    }[];
    claims: {
        id: string;
        text: string;
        source: string;
    }[];
    forbiddenClaims: string[];
    voice: string[];
    contextHash: string;
};
type DemoEvidence = {
    mode: "demo";
};
type SeoEvidence = {
    mode: "demo" | "live";
};
export type SeoPage = SeoEvidence & {
    live?: LivePageEvidence;
    id: string;
    url: string;
    productId: string | null;
    kind: "pdp" | "collection" | "blog" | "home" | "page";
    intendedIndexable: boolean;
    statusCode: number | null;
    robotsAllowed: boolean | null;
    noindex: boolean | null;
    canonical: string | null;
    expectedCanonical: string;
    incomingLinks: string[] | null;
    title: string | null;
    description: string | null;
    h1: string | null;
    contentSections: string[] | null;
    answeredQuestions: string[] | null;
    expectedQuestions: string[];
    proofClaimIds: string[] | null;
    visiblePrice: number | null;
    schemaPrice: number | null;
    visibleAvailability: "InStock" | "OutOfStock" | null;
    schemaAvailability: "InStock" | "OutOfStock" | null;
};
export type SeoOpportunity = SeoEvidence & {
    id: string;
    query: string;
    intent: "transactional" | "commercial" | "informational";
    productId: string | null;
    destination: "pdp" | "collection" | "blog";
    targetUrl: string;
    rationale: string;
    monthlySearches: number | null;
};
export type SeoVisibilityObservation = DemoEvidence & {
    id: string;
    engine: string;
    observedAt: string;
    locale: string;
    prompt: string;
    productId: string;
    targetUrl: string;
    brandMentioned: boolean | null;
    citedUrls: string[] | null;
    fact: {
        field: string;
        observed: string;
        expected: string;
        source: string;
    } | null;
    method: "synthetic fixture";
};
export type SeoSnapshot = SeoEvidence & {
    crawl?: LiveCrawlMetadata;
    brandId: string;
    contextHash: string;
    observedAt: string;
    pages: SeoPage[];
    opportunities: SeoOpportunity[];
    observations: SeoVisibilityObservation[];
};
export type SeoCheck = SeoEvidence & {
    id: string;
    ruleId: string;
    category: SeoCategory;
    title: string;
    url: string;
    status: "pass" | "fail" | "unknown";
    evidence: string[];
};
export type SeoFinding = SeoEvidence & {
    id: string;
    ruleId: string;
    category: SeoCategory;
    title: string;
    evidence: string[];
    url: string;
    why: string;
    remedy: string;
    effort: "Small" | "Medium" | "Large";
    priority: "P1" | "P2" | "P3";
};
export type SeoReadiness = {
    score: number | null;
    passed: number;
    failed: number;
    unknown: number;
    total: number;
    label: "Demo readiness" | "Live readiness";
};
export type SeoAudit = SeoEvidence & {
    brandId: string;
    contextHash: string;
    findings: SeoFinding[];
    scores: Record<SeoCategory, SeoReadiness>;
    checks: SeoCheck[];
};
const DEMO_DATE = "2026-10-07T00:00:00.000Z";
const slug = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
const state = (known: boolean, passed: boolean): SeoCheck["status"] => !known ? "unknown" : passed ? "pass" : "fail";
export function productSearchType(product: {
    name: string;
    format: string;
}, category = ""): string {
    const identify = (s: string): string | undefined => {
        const text = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        if (/\b(?:hoodie|hoodies|hudie|hudies|sweatshirt|sweatshirts)\b/.test(text))
            return "hoodies";
        if (/\b(?:tote|totes)\b/.test(text))
            return "tote bags";
        if (/\b(?:t-?shirts?|tees?)\b/.test(text))
            return "t-shirts";
        if (/\b(?:hats?|caps?|beanies?)\b/.test(text))
            return "hats";
        if (/\b(?:gummy|gummies)\b/.test(text))
            return "gummies";
        if (/\belectrolytes?\b/.test(text))
            return "electrolyte mixes";
        return undefined;
    };
    const known = identify(product.name) ?? identify(product.format);
    if (known)
        return known;
    const categoryType = identify(category);
    if (categoryType && /\b(?:flavou?rs?|sachets?|version|original)\b/i.test(`${product.name} ${product.format}`))
        return categoryType;
    const shortFormat = product.format.trim();
    if (shortFormat && shortFormat.split(/\s+/).length <= 5 && shortFormat.length <= 45 && !/[.!?]/.test(shortFormat))
        return shortFormat.toLowerCase();
    return (product.name.trim() || category.trim() || "products").slice(0, 45).trim();
}
const shortQuery = (text: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    return clean.length <= 80 ? clean : clean.slice(0, 81).replace(/\s+\S*$/, "").slice(0, 80);
};
export function buildPlanningSnapshot(ctx: SeoContext): SeoSnapshot {
    const opportunities: SeoOpportunity[] = [];
    const types = new Set<string>();
    for (const product of coreProducts(ctx)) {
        const type = productSearchType(product, ctx.category);
        if (types.has(type))
            continue;
        types.add(type);
        opportunities.push({ mode: "live", id: `query:guide:${product.id}`, query: shortQuery(`how to choose ${type}`),
            intent: "informational", productId: product.id, destination: "blog",
            targetUrl: `${ctx.websiteUrl ? new URL(ctx.websiteUrl).origin : ""}/blogs/guides/choosing-${slug(type)}`,
            monthlySearches: null, rationale: `A proposed buying guide for ${type}, derived from the shared catalogue. Validate demand, intent and the proposed article URL before publishing.` });
    }
    return { mode: "live", brandId: ctx.brandId, contextHash: ctx.contextHash, observedAt: "", pages: [], observations: [], opportunities };
}
export function emptyAudit(ctx: SeoContext): SeoAudit {
    const score = (): SeoReadiness => ({ label: "Live readiness", score: null, passed: 0, failed: 0, unknown: 0, total: 0 });
    return { mode: "live", brandId: ctx.brandId, contextHash: ctx.contextHash, checks: [], findings: [], scores: { SEO: score(), AEO: score(), GEO: score() } };
}
export function buildDemoSnapshot(ctx: SeoContext): SeoSnapshot {
    const base = `https://example.invalid/${encodeURIComponent(ctx.brandId)}`;
    const pages: SeoPage[] = [];
    const opportunities: SeoOpportunity[] = [];
    const observations: SeoVisibilityObservation[] = [];
    const buyerLanguage = ctx.personas.flatMap((p) => p.language).find((s) => s.trim());
    const plannedTypes = new Set<string>();
    const common = () => ({
        mode: "demo" as const, intendedIndexable: true, statusCode: 200, robotsAllowed: true,
        noindex: false, title: "", description: `Explore ${ctx.brandName} product details and buying guidance.`, h1: "", contentSections: ["Product details"],
        incomingLinks: [`${base}/`], answeredQuestions: [] as string[], expectedQuestions: [] as string[],
        proofClaimIds: ctx.claims.filter((c) => c.source.trim()).slice(0, 1).map((c) => c.id), visiblePrice: null, schemaPrice: null,
        visibleAvailability: null, schemaAvailability: null,
    });
    ctx.products.forEach((product, index) => {
        const url = `${base}/products/${slug(product.name)}-${encodeURIComponent(product.id)}`;
        const searchType = productSearchType(product, ctx.category);
        const question = `What should I compare when choosing ${searchType}?`;
        const guide = `${base}/blogs/guides/choosing-${slug(searchType)}-${encodeURIComponent(product.id)}`;
        const collection = `${base}/collections/${slug(ctx.category || product.format || "products")}`;
        const first = index === 0;
        const missingAnswer = first || index % 5 === 0;
        const unknownAccess = index > 0 && index % 7 === 0;
        pages.push({ ...common(), id: `pdp:${product.id}`, url, productId: product.id, kind: "pdp",
            noindex: first, robotsAllowed: unknownAccess ? null : true,
            canonical: first || index % 6 === 0 ? `${base}/` : url, expectedCanonical: url,
            title: first ? "" : `${product.name} | ${ctx.brandName}`, h1: first ? "" : product.name,
            description: first ? "" : `Discover ${product.name}, a ${product.format || ctx.category} product from ${ctx.brandName}.`,
            incomingLinks: first ? [] : [collection], answeredQuestions: missingAnswer ? [] : [question], expectedQuestions: [question],
            proofClaimIds: first ? [] : common().proofClaimIds,
            visiblePrice: 49 + index * 2, schemaPrice: index < 2 ? 39 : 49 + index * 2,
            visibleAvailability: "InStock", schemaAvailability: first ? "OutOfStock" : "InStock" });
        pages.push({ ...common(), id: `guide:${product.id}`, url: guide, productId: product.id, kind: "blog",
            canonical: guide, expectedCanonical: guide, title: `Choosing ${searchType}`,
            h1: `Choosing ${searchType}`, contentSections: ["What to compare"],
            description: index % 8 === 0 ? "" : `Compare the details that matter when choosing ${searchType}.`,
            incomingLinks: index % 8 === 0 ? [] : [collection, url],
            answeredQuestions: first ? [] : [question], expectedQuestions: [question],
            proofClaimIds: first ? [] : common().proofClaimIds });
        const brandedName = slug(product.name).startsWith(`${slug(ctx.brandName)}-`) || slug(product.name) === slug(ctx.brandName)
            ? product.name : `${ctx.brandName} ${product.name}`;
        opportunities.push({ mode: "demo", id: `query:pdp:${product.id}`, query: shortQuery(brandedName), intent: "transactional",
            productId: product.id, destination: "pdp", targetUrl: url, monthlySearches: 360 + index * 40,
            rationale: "Branded product intent belongs on the product page. Demand is synthetic, not a keyword-tool measurement." });
        const cluster = searchType.toLowerCase();
        if (!plannedTypes.has(cluster)) {
            plannedTypes.add(cluster);
            opportunities.push({ mode: "demo", id: `query:guide:${product.id}`, query: shortQuery(`how to choose ${searchType}`), intent: "informational",
                productId: product.id, destination: "blog", targetUrl: guide, monthlySearches: 240 + index * 30,
                rationale: `One guide for this ${searchType} topic cluster, linked to the relevant assortment; validate intent before writing.${first && buyerLanguage ? ` Shared persona language for editorial context only: “${buyerLanguage.replace(/[\r\n<>]/g, " ").slice(0, 160)}”. This is not a target keyword or verified product claim.` : ""}` });
        }
        if (index === 0) {
            pages.push({ ...common(), id: "collection:primary", url: collection, productId: null, kind: "collection",
                canonical: collection, expectedCanonical: collection, title: ctx.category || "Products", h1: ctx.category || "Products",
                contentSections: [], incomingLinks: [`${base}/`] });
            opportunities.push({ mode: "demo", id: "query:collection", query: shortQuery(searchType),
                intent: "commercial", productId: product.id, destination: "collection", targetUrl: collection,
                monthlySearches: 720, rationale: "A category comparison can belong on a collection if the real assortment supports it. For a hero SKU, review whether the PDP is a better destination." });
        }
        const observationUnknown = index > 0 && index % 8 === 0;
        const citationMissing = index % 7 === 0;
        observations.push({ mode: "demo", id: `visibility:${product.id}`, engine: `Synthetic engine ${["A", "B", "C"][index % 3]}`,
            observedAt: DEMO_DATE, locale: ctx.market || "Unspecified market", prompt: `What should I know before buying ${product.name}?`,
            productId: product.id, targetUrl: url, brandMentioned: observationUnknown ? null : first || !citationMissing,
            citedUrls: observationUnknown ? null : citationMissing ? [] : [url], method: "synthetic fixture",
            fact: observationUnknown ? null : { field: "Product name", observed: index % 11 === 0 ? `${product.name} (old name)` : product.name, expected: product.name,
                source: `Brand Brain product ${product.id}` } });
    });
    return { mode: "demo", brandId: ctx.brandId, contextHash: ctx.contextHash, observedAt: DEMO_DATE, pages, opportunities, observations };
}
export function runAudit(ctx: SeoContext, snapshot: SeoSnapshot): SeoAudit {
    if (snapshot.brandId !== ctx.brandId || snapshot.contextHash !== ctx.contextHash) {
        throw new Error("SEO evidence belongs to another brand or an older Brand Brain. Refresh the snapshot.");
    }
    const ids = new Set(ctx.products.map((p) => p.id));
    if (snapshot.pages.some((p) => p.productId !== null && !ids.has(p.productId))
        || snapshot.opportunities.some((p) => p.productId !== null && !ids.has(p.productId))
        || snapshot.observations.some((p) => !ids.has(p.productId))) {
        throw new Error("SEO evidence references a product outside the active Brand Brain.");
    }
    const checks: SeoCheck[] = [];
    const findings: SeoFinding[] = [];
    const add = (key: string, ruleId: string, category: SeoCategory, title: string, url: string, status: SeoCheck["status"], evidence: string[], why: string, remedy: string, priority: SeoFinding["priority"] = "P2", effort: SeoFinding["effort"] = "Small") => {
        const id = `${key}:${ruleId}`;
        checks.push({ mode: "demo", id, ruleId, category, title, url, status, evidence });
        if (status === "fail")
            findings.push({ mode: "demo", id, ruleId, category, title, url, evidence, why, remedy, priority, effort });
    };
    for (const page of snapshot.pages) {
        if (page.intendedIndexable) {
            const blocked = (page.statusCode !== null && page.statusCode !== 200) || page.robotsAllowed === false || page.noindex === true;
            const inspected = page.statusCode !== null && page.robotsAllowed !== null && page.noindex !== null;
            add(page.id, "SEO-INDEX", "SEO", "Check access to this search destination", page.url, blocked ? "fail" : inspected ? "pass" : "unknown", [`Demo HTTP: ${page.statusCode ?? "unknown"}; robots access: ${page.robotsAllowed ?? "unknown"}; noindex: ${page.noindex ?? "unknown"}.`], "A product or collection intended for search must be fetchable and eligible for indexing. Eligibility does not guarantee indexing.", "Inspect the specific status or directive, remove unintended blocks in the storefront, and confirm with a fresh crawl and URL Inspection.", "P1", "Medium");
            add(page.id, "SEO-CANONICAL", "SEO", "Align the canonical with the intended destination", page.url, state(page.canonical !== null, page.canonical === page.expectedCanonical), [`Demo canonical: ${page.canonical ?? "not inspected"}. Intended: ${page.expectedCanonical}.`], "A conflicting canonical can signal a different preferred page. Variant and filter policies must be decided deliberately.", "Confirm the intended canonical policy, then align theme metadata, internal links and sitemap entries with that destination.", "P1", "Medium");
        }
        add(page.id, "SEO-LINKS", "SEO", "Connect this page to the store", page.url, state(page.incomingLinks !== null, (page.incomingLinks?.length ?? 0) > 0), [`Demo incoming links: ${page.incomingLinks === null ? "not inspected" : page.incomingLinks.length}.`], "Products and useful buying guides need discoverable routes from relevant store pages.", "Add a relevant crawlable link from the parent collection, product guide or navigation, then recrawl.", "P2");
        for (const [field, ruleId, title, remedy] of [
            ["title", "SEO-TITLE", "Write a descriptive search title", "Prepare a unique, accurate title naming the product or collection and brand; preview it before copying into the SEO field."],
            ["description", "SEO-DESCRIPTION", "Prepare a useful search description", "Write a concise description from approved product facts. Treat it as a snippet suggestion, not a ranking guarantee."],
            ["h1", "SEO-HEADING", "Name what this page helps shoppers find", "Add a clear main heading describing the actual product, collection or guide. Do not force a fixed keyword count."],
        ] as const) {
            add(page.id, ruleId, "SEO", title, page.url, state(page[field] !== null, Boolean(page[field]?.trim())), [`Demo ${field}: ${page[field] === null ? "not inspected" : page[field]?.trim() || "empty"}.`], "Clear page labels help shoppers understand whether this result matches their task.", remedy, field === "description" ? "P3" : "P2");
        }
        if (page.kind === "pdp") {
            add(page.id, "SEO-PRICE", "SEO", "Reconcile product price in structured data", page.url, state(page.visiblePrice !== null && page.schemaPrice !== null, page.visiblePrice === page.schemaPrice), [`Synthetic price values only: visible ${page.visiblePrice ?? "unknown"}; schema ${page.schemaPrice ?? "unknown"}. Not a real offer.`], "Structured product facts should agree with the selected offer visible to shoppers.", "Identify the theme or app owning Product markup; align the same currency, variant and offer. Never install the synthetic price.", "P1", "Medium");
            add(page.id, "SEO-STOCK", "SEO", "Reconcile structured availability", page.url, state(page.visibleAvailability !== null && page.schemaAvailability !== null, page.visibleAvailability === page.schemaAvailability), [`Demo visible availability: ${page.visibleAvailability ?? "unknown"}; schema: ${page.schemaAvailability ?? "unknown"}.`], "A stock mismatch can mislead shoppers and product discovery systems.", "Bind the existing Product offer availability to the correct variant inventory state, and verify both in-stock and out-of-stock cases.", "P1", "Medium");
        }
        if (page.kind === "collection") {
            add(page.id, "SEO-COLLECTION", "SEO", "Explain how to choose within this collection", page.url, state(page.contentSections !== null, (page.contentSections?.length ?? 0) > 0), [`Demo supporting sections: ${page.contentSections === null ? "not inspected" : page.contentSections.length}.`], "A collection can help shoppers choose using genuine assortment differences; extra word count alone adds no value.", "Draft concise selection guidance from real product differences while keeping the product grid easy to reach. Do not invent an assortment.");
        }
        const unanswered = page.expectedQuestions.filter((q) => !page.answeredQuestions?.includes(q));
        add(page.id, "AEO-ANSWERS", "AEO", "Answer a relevant buyer question", page.url, state(page.expectedQuestions.length > 0 && page.answeredQuestions !== null, unanswered.length === 0), page.expectedQuestions.length ? unanswered.map((q) => `Unanswered demo buyer-question seed: ${q}`) : ["No buyer-question evidence supplied."], "Real buyer questions can reveal missing product or selection information. Persona language is not measured search demand.", "Check that this question fits the page and SKU, draft an answer from approved facts, and place it where it helps shoppers. FAQ content does not guarantee rich results.");
        const knownProof = page.proofClaimIds?.filter((id) => ctx.claims.some((c) => c.id === id && c.source.trim())) ?? [];
        add(page.id, "AEO-PROOF", "AEO", "Attach evidence to product assertions", page.url, state(ctx.claims.some((c) => c.source.trim()) && page.proofClaimIds !== null, knownProof.length > 0), [`Demo recognized proof references: ${knownProof.length}; approved shared claims available: ${ctx.claims.length}.`], "Shopper-facing assertions need traceable product evidence, especially in supplement and other sensitive categories.", "Use relevant approved claims and source references from the shared Brand Brain. If evidence is absent, request it rather than generating a claim.");
    }
    for (const observation of snapshot.observations) {
        const provenance = `${observation.engine}; ${observation.observedAt}; ${observation.locale}; synthetic fixture.`;
        add(observation.id, "GEO-CITATION", "GEO", "Review the observed citation gap", observation.targetUrl, state(observation.citedUrls !== null, observation.citedUrls?.includes(observation.targetUrl) ?? false), [provenance, `Demo brand mentioned: ${observation.brandMentioned ?? "unknown"}; target cited: ${observation.citedUrls?.includes(observation.targetUrl) ?? "unknown"}.`], "A brand mention and a link to the product page are different observations. A single response does not establish visibility.", "Build a repeatable prompt set with date, market and engine. Inspect actual cited sources and useful factual gaps before changing pages.", "P3", "Medium");
        const fact = observation.fact;
        add(observation.id, "GEO-FACTS", "GEO", "Correct inconsistent product facts at the source", observation.targetUrl, state(Boolean(fact?.source.trim()), fact?.observed === fact?.expected), [provenance, fact ? `${fact.field}: observed '${fact.observed}', reference '${fact.expected}' (${fact.source}).` : "No verifiable fact reference supplied."], "Incorrect product names or attributes can mislead shoppers even when the brand is mentioned.", "Confirm the current Brand Brain fact, inspect the source of the error, and prepare a factual correction for human implementation. Repeat the observation afterwards.", "P2");
    }
    const readiness = (category: SeoCategory): SeoReadiness => {
        const group = checks.filter((c) => c.category === category);
        const passed = group.filter((c) => c.status === "pass").length;
        const failed = group.filter((c) => c.status === "fail").length;
        const unknown = group.length - passed - failed;
        return { label: "Demo readiness", score: passed + failed ? Math.round(100 * passed / (passed + failed)) : null,
            passed, failed, unknown, total: group.length };
    };
    findings.sort((a, b) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id));
    return { mode: "demo", brandId: ctx.brandId, contextHash: ctx.contextHash, findings, checks,
        scores: { SEO: readiness("SEO"), AEO: readiness("AEO"), GEO: readiness("GEO") } };
}
