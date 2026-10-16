import strategy from "./01-strategy";
import research from "./02-research";
import architecture from "./03-architecture";
import products from "./04-products";
import collections from "./05-collections";
import editorial from "./06-editorial";
import technical from "./07-technical";
import productData from "./08-product-data";
import experience from "./09-experience";
import lifecycle from "./10-lifecycle";
import authority from "./11-authority";
import measurement from "./12-measurement";
import aeoResearch from "./13-aeo-research";
import aeoProducts from "./14-aeo-product-answers";
import aeoEvidence from "./15-aeo-access-and-evidence";
import geoStrategy from "./16-geo-strategy";
import geoSources from "./17-geo-citation-sources";
import geoMeasurement from "./18-geo-measurement";
import sourceData from "./sources.json";
import answerSourceData from "./aeo-geo-sources.json";
import type { SeoSource } from "./types";
import { seoStudySource, studyFor } from "../study";
export const seoGuides = [...strategy, ...research, ...architecture, ...products, ...collections, ...editorial, ...technical, ...productData, ...experience, ...lifecycle, ...authority, ...measurement, ...aeoResearch, ...aeoProducts, ...aeoEvidence, ...geoStrategy, ...geoSources, ...geoMeasurement].map(g => studyFor({ guideId: g.id }).length ? { ...g, sourceIds: [...g.sourceIds, seoStudySource.id] } : g);
export const seoSources: SeoSource[] = [...sourceData.map(s => ({ ...s, disciplines: ["SEO"] })), ...answerSourceData, seoStudySource] as SeoSource[];
export const seoTopics = [...new Set(seoGuides.map(g => g.topic))];
export const SEO_CURRICULUM_VERSION = "2026-10-10-d2c-study-v3";
export const seoTopTen = [
    { id: "shared-brand-search-plan", reason: "Choose a strategy that fits your actual products and buying model." },
    { id: "seo-baseline", reason: "Establish what is known before changing the store." },
    { id: "crawl-and-index-diagnosis", reason: "Resolve confirmed access failures on important pages first." },
    { id: "keyword-to-page-mapping", reason: "Give each buyer decision a deliberate destination." },
    { id: "product-and-collection-pages", reason: "Make your core product page complete, factual and useful." },
    { id: "seo-collection-brief", reason: "Help shoppers choose among a real assortment; skip if your catalog does not need it." },
    { id: "seo-internal-links", reason: "Connect the pages that help a shopper understand and buy." },
    { id: "structured-product-facts", reason: "Align the product, its visible offer and structured information." },
    { id: "commercial-editorial-content", reason: "Add a guide when the buying decision needs deeper explanation." },
    { id: "seo-search-console-analysis", reason: "Review the evidence and choose the next useful change." },
];
export const searchStartingPaths: Record<"All" | "SEO" | "AEO" | "GEO", {
    id: string;
    reason: string;
}[]> = {
    SEO: seoTopTen,
    AEO: [
        { id: "buyer-answer-library", reason: "Begin with the questions real buyers need answered." },
        { id: "aeo-answer-page-routing", reason: "Give each answer an accountable page and owner." },
        { id: "answer-access-and-fact-corrections", reason: "Separate access failures from missing or incorrect information." },
        { id: "aeo-product-fact-blocks", reason: "Make the exact product and variant facts dependable." },
        { id: "aeo-answer-first-writing", reason: "Answer clearly while keeping essential conditions attached." },
        { id: "aeo-subscription-policy-answers", reason: "Explain the actual purchase and recurring commitment." },
        { id: "aeo-comparison-answers", reason: "Help shoppers choose using fair, verifiable differences." },
        { id: "aeo-support-and-faq", reason: "Make care, compatibility and setup answers easy to reach." },
        { id: "aeo-brand-fact-corrections", reason: "Correct consequential errors at the sources that carry them." },
        { id: "aeo-answer-quality-gate", reason: "Review the finished answer before publishing it." },
    ],
    GEO: [
        { id: "geo-store-strategy", reason: "Scope the program to your catalog and buyer behavior." },
        { id: "ai-visibility-and-measurement", reason: "Create a repeatable baseline before making changes." },
        { id: "geo-citation-gap-audit", reason: "Inspect the evidence before choosing a tactic." },
        { id: "geo-referral-measurement", reason: "Connect identifiable visits with real store outcomes." },
        { id: "geo-discovery-surveys", reason: "Add customer-reported discovery without double-counting it." },
        { id: "earned-authority-and-citations", reason: "Research relevant editorial coverage with a useful contribution." },
        { id: "geo-community-participation", reason: "Contribute genuine expertise where buyers already discuss the category." },
        { id: "geo-product-video-evidence", reason: "Demonstrate what a shopper cannot assess from copy alone." },
        { id: "geo-controlled-experiments", reason: "Test one intervention against a reasonable comparison." },
        { id: "geo-catalog-refresh-monitoring", reason: "Keep facts current as products and offers change." },
    ],
    All: [
        { id: "shared-brand-search-plan", reason: "Set the commercial foundation for the entire search program." },
        { id: "crawl-and-index-diagnosis", reason: "Resolve confirmed access problems on important pages." },
        { id: "buyer-answer-library", reason: "Identify the real questions behind product selection." },
        { id: "aeo-product-fact-blocks", reason: "Make the underlying catalog facts reliable." },
        { id: "aeo-answer-first-writing", reason: "Explain those facts in useful, qualified answers." },
        { id: "geo-store-strategy", reason: "Choose a bounded generated-answer opportunity." },
        { id: "ai-visibility-and-measurement", reason: "Establish what appears before you intervene." },
        { id: "geo-citation-gap-audit", reason: "Match an observed gap to the right action." },
        { id: "geo-referral-measurement", reason: "Connect identifiable discovery to store outcomes." },
        { id: "geo-controlled-experiments", reason: "Evaluate change before scaling the work." },
    ],
};
const google = "https://developers.google.com/search/docs/";
export const seoReferences: Record<string, {
    title: string;
    url: string;
}> = {
    "openai-bots": { title: "OpenAI · Search, training and user-initiated crawlers", url: "https://developers.openai.com/api/docs/bots" },
    "ai-features": { title: "Google · AI features and your website", url: google + "appearance/ai-features" },
    "ai-optimization": { title: "Google · Guidance for generative AI features", url: google + "fundamentals/ai-optimization-guide" },
    "ga4-channels": { title: "Google Analytics · Custom channel groups", url: "https://support.google.com/analytics/answer/13051316" },
    ecommerce: { title: "Google · Ecommerce search best practices", url: google + "specialty/ecommerce" },
    helpful: { title: "Google · Helpful, reliable content", url: google + "fundamentals/creating-helpful-content" },
    "ecommerce-urls": { title: "Google · Ecommerce URL structure", url: google + "specialty/ecommerce/designing-a-url-structure-for-ecommerce-sites" },
    "site-structure": { title: "Google · Ecommerce navigation", url: google + "specialty/ecommerce/help-google-understand-your-ecommerce-site-structure" },
    links: { title: "Google · Crawlable links", url: google + "crawling-indexing/links-crawlable" },
    canonical: { title: "Google · Canonical URL signals", url: google + "crawling-indexing/consolidate-duplicate-urls" },
    facets: { title: "Google · Faceted navigation", url: "https://developers.google.com/crawling/docs/faceted-navigation" },
    pagination: { title: "Google · Pagination and incremental loading", url: google + "specialty/ecommerce/pagination-and-incremental-page-loading" },
    javascript: { title: "Google · JavaScript SEO", url: google + "crawling-indexing/javascript/javascript-seo-basics" },
    noindex: { title: "Google · Exclude pages with noindex", url: google + "crawling-indexing/block-indexing" },
    robots: { title: "Google · Introduction to robots.txt", url: google + "crawling-indexing/robots/intro" },
    sitemaps: { title: "Google · Sitemaps", url: google + "crawling-indexing/sitemaps/overview" },
    product: { title: "Google · Product structured data", url: google + "appearance/structured-data/product" },
    merchant: { title: "Google · Merchant listing structured data", url: google + "appearance/structured-data/merchant-listing" },
    variants: { title: "Google · Product variant structured data", url: google + "appearance/structured-data/product-variants" },
    "review-schema": { title: "Google · Review snippet requirements", url: google + "appearance/structured-data/review-snippet" },
    breadcrumbs: { title: "Google · Breadcrumb structured data", url: google + "appearance/structured-data/breadcrumb" },
    faq: { title: "Google · Search updates, including FAQ feature retirement", url: "https://developers.google.com/search/updates" },
    "product-data": { title: "Google · Share ecommerce product data", url: google + "specialty/ecommerce/share-your-product-data-with-google" },
    "free-listings": { title: "Merchant Center · Free product listings", url: "https://support.google.com/merchants/answer/9199328" },
    titles: { title: "Google · Title links", url: google + "appearance/title-link" },
    snippets: { title: "Google · Search snippets", url: google + "appearance/snippet" },
    reviews: { title: "Google · High-quality product reviews", url: google + "specialty/ecommerce/write-high-quality-reviews" },
    vitals: { title: "Google · Core Web Vitals", url: google + "appearance/core-web-vitals" },
    "page-experience": { title: "Google · Page experience", url: google + "appearance/page-experience" },
    images: { title: "Google · Image SEO", url: google + "appearance/google-images" },
    video: { title: "Google · Video SEO", url: google + "appearance/video" },
    http: { title: "Google · HTTP status and network errors", url: google + "crawling-indexing/http-network-errors" },
    redirects: { title: "Google · Redirects and search", url: google + "crawling-indexing/301-redirects" },
    launch: { title: "Google · Launching an ecommerce site", url: google + "specialty/ecommerce/how-to-launch-an-ecommerce-website" },
    "site-move": { title: "Google · Site moves with URL changes", url: google + "crawling-indexing/site-move-with-url-changes" },
    international: { title: "Google · Localized page versions", url: google + "specialty/international/localized-versions" },
    multiregional: { title: "Google · Multi-regional and multilingual sites", url: google + "specialty/international/managing-multi-regional-sites" },
    spam: { title: "Google · Search spam policies", url: google + "essentials/spam-policies" },
    "qualify-links": { title: "Google · Qualify sponsored links", url: google + "crawling-indexing/qualify-outbound-links" },
    gsc: { title: "Search Console · Clicks, impressions and position", url: "https://support.google.com/webmasters/answer/7042828" },
    performance: { title: "Search Console · Performance report", url: "https://support.google.com/webmasters/answer/7576553" },
    inspection: { title: "Search Console · URL Inspection", url: "https://support.google.com/webmasters/answer/9012289" },
    "traffic-drops": { title: "Google · Diagnose search traffic drops", url: google + "monitor-debug/debugging-search-traffic-drops" },
    shopify: { title: "Shopify · Search engine optimization", url: "https://help.shopify.com/en/manual/promoting-marketing/seo" },
};
const sourceIds = new Set(seoSources.filter(s => s.disposition === "Adapted").map(s => s.id));
const ids = new Set<string>();
for (const guide of seoGuides) {
    if (ids.has(guide.id))
        throw new Error(`Duplicate SEO guide: ${guide.id}`);
    if (guide.sourceIds.some(id => !sourceIds.has(id)))
        throw new Error(`Missing or excluded SEO source: ${guide.id}`);
    if (guide.references.some(id => !seoReferences[id]))
        throw new Error(`Missing official SEO reference: ${guide.id}`);
    ids.add(guide.id);
}
for (const [discipline, path] of Object.entries(searchStartingPaths)) {
    if (path.length !== 10 || new Set(path.map(g => g.id)).size !== 10)
        throw new Error(`Invalid starting path: ${discipline}`);
    if (path.some(item => !ids.has(item.id) || (discipline !== "All" && seoGuides.find(g => g.id === item.id)?.discipline !== discipline)))
        throw new Error(`Unknown or mismatched starting-path guide: ${discipline}`);
}
