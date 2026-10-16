import { z } from "zod";
import { studyFor, studyNotesMarkdown } from "./study";
import { contentChecks, type SeoArtifact } from "./content";
import type { SeoCodeFile } from "./code";
import type { SeoAudit, SeoContext, SeoSnapshot } from "./model";
import { schemaReconciliation } from "./review-tools";
export const optimizationModes = {
    pdp: "Product page copy & metadata",
    collection: "Collection page copy & metadata",
    answer: "Evidence-backed answer block",
    schema: "Product / Offer structured data",
    feed: "Merchant product feed row",
    trust: "Trust & source evidence brief",
    policy: "Canonical, variants & stock policy",
} as const;
export type OptimizationMode = keyof typeof optimizationModes;
const optionalText = (max: number) => z.string().trim().max(max).default("");
export const optimizationInput = z.object({
    mode: z.enum(["pdp", "collection", "answer", "schema", "feed", "trust", "policy"]),
    contextHash: z.string().min(1).max(100), targetUrl: z.string().trim().min(1).max(2000),
    keyword: optionalText(180), title: optionalText(200), description: optionalText(1000),
    heading: optionalText(200), facts: optionalText(6000), question: optionalText(300), answer: optionalText(4000),
    evidenceUrl: optionalText(2000), verified: z.boolean().default(false),
    productName: optionalText(150), sku: optionalText(50), imageUrl: optionalText(2000),
    price: optionalText(20), currency: optionalText(3), availability: z.enum(["", "InStock", "OutOfStock", "PreOrder", "BackOrder"]).default(""),
    condition: z.enum(["", "new", "refurbished", "used"]).default(""), gtin: optionalText(14), mpn: optionalText(70),
    breadcrumbName: optionalText(100), breadcrumbUrl: optionalText(2000),
    policy: z.enum(["canonical", "filters", "variants", "temporary-stock", "discontinued"]).default("canonical"),
    destinationUrl: optionalText(2000), rationale: optionalText(3000),
});
export type OptimizationInput = z.input<typeof optimizationInput>;
export type OptimizationDraft = Pick<SeoArtifact, "kind" | "title" | "keyword" | "productId" | "targetUrl" | "description" | "body" | "sourceIds" | "codeFiles">;
export const htmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
export const jsonForHtml = (value: unknown) => JSON.stringify(value, null, 2).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
export const csvCell = (s: string) => `"${(/^[\s]*[=+@-]/.test(s) || /^[\t\r]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
const md = (s: string) => s.replace(/[<>]/g, (c) => c === "<" ? "&lt;" : "&gt;").replace(/([\\`*_\[\]])/g, "\\$1");
const normHost = (host: string) => host.toLowerCase().replace(/^www\./, "");
export function publicReference(value: string): string {
    let url: URL;
    try {
        url = new URL(value);
    }
    catch {
        throw new Error("Enter a complete HTTP or HTTPS evidence URL.");
    }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
        throw new Error("Use an HTTP or HTTPS URL without credentials.");
    return url.href;
}
export function storeTarget(ctx: SeoContext, value: string): string {
    if (!ctx.websiteUrl)
        throw new Error("Add the website to the shared Brand Brain first.");
    const url = new URL(publicReference(value));
    const site = new URL(ctx.websiteUrl);
    if (normHost(url.hostname) !== normHost(site.hostname) || url.port !== site.port)
        throw new Error("Choose a page on the shared Brand Brain store website.");
    if (url.hash)
        throw new Error("Use the page URL without a fragment.");
    return url.href;
}
export function optimizationTargets(ctx: SeoContext, snapshot: SeoSnapshot) {
    const urls = new Map<string, {
        url: string;
        label: string;
        kind: string;
    }>();
    if (ctx.websiteUrl)
        urls.set(ctx.websiteUrl, { url: ctx.websiteUrl, label: "Store home", kind: "home" });
    for (const p of ctx.products)
        if (p.url) {
            try {
                const url = storeTarget(ctx, p.url);
                urls.set(url, { url, label: p.name, kind: "pdp" });
            }
            catch { }
        }
    if (snapshot.brandId === ctx.brandId && snapshot.contextHash === ctx.contextHash && snapshot.mode === "live") {
        for (const p of snapshot.pages) {
            try {
                const url = storeTarget(ctx, p.url);
                urls.set(url, { url, label: p.title || p.h1 || new URL(url).pathname, kind: p.kind });
            }
            catch { }
        }
    }
    return [...urls.values()];
}
export function draftOptimization(ctx: SeoContext, snapshot: SeoSnapshot, audit: SeoAudit, raw: OptimizationInput): OptimizationDraft {
    const input = optimizationInput.parse(raw);
    if (input.contextHash !== ctx.contextHash)
        throw new Error("Brand Brain changed. Refresh before generating a draft.");
    if (snapshot.brandId !== ctx.brandId || audit.brandId !== ctx.brandId || snapshot.contextHash !== ctx.contextHash || audit.contextHash !== ctx.contextHash)
        throw new Error("Audit context changed. Refresh the workspace.");
    const target = storeTarget(ctx, input.targetUrl);
    const selected = optimizationTargets(ctx, snapshot).find((p) => p.url === target);
    if (!selected)
        throw new Error("Choose a page from the current crawl or shared catalogue.");
    if (["pdp", "schema", "feed"].includes(input.mode) && selected.kind !== "pdp")
        throw new Error("Choose a product page for this package.");
    if (input.mode === "collection" && selected.kind !== "collection")
        throw new Error("Choose an observed collection page for this package.");
    const product = ctx.products.find((p) => { try {
        return p.url && storeTarget(ctx, p.url) === target;
    }
    catch {
        return false;
    } });
    const page = snapshot.mode === "live" ? snapshot.pages.find((p) => p.url === target) : undefined;
    const issues = audit.mode === "live" ? audit.findings.filter((f) => f.url === target) : [];
    const files: SeoCodeFile[] = [];
    const sections = [
        `# ${optimizationModes[input.mode]}`, `Target: ${target}`, `Shared brand: ${md(ctx.brandName)} · Market: ${md(ctx.market)}`,
        `Context revision: ${ctx.contextHash}`, `Capture: ${page ? snapshot.observedAt : "Catalogue reference; page not crawled"}`,
        "## Observed baseline", page ? `HTTP status: ${page.statusCode ?? "Unknown"}\n\nTitle: ${md(page.title ?? "Unknown")}\n\nCanonical: ${md(page.canonical ?? "Unknown")}\n\nRobots allowed: ${page.robotsAllowed ?? "Unknown"}; noindex: ${page.noindex ?? "Unknown"}` : "No live HTML observation is available for this catalogue page.",
        ...issues.map((f) => `- ${md(f.title)}: ${f.evidence.map(md).join("; ")}`),
    ];
    const samples = page?.live?.sourceSamples?.slice(0, 6) ?? [];
    if (samples.length)
        sections.push("## Before — captured public HTML", "Line numbers refer to the fetched HTML response, not a Shopify theme file. The capture can differ from the JavaScript-rendered page.", ...samples.map((sample) => `Source rule: ${sample.ruleId} · response line ${sample.line}\n\n\`\`\`html\n${sample.code.replace(/```/g, "` ` `")}\n\`\`\``));
    else
        sections.push("## Before — source coverage", "No HTML excerpt was retained for this page. The baseline above contains captured field values only; inspect the current theme/rendered source before editing code.");
    const field = (value: string, label: string) => { if (!value)
        throw new Error(`Enter ${label}.`); return value; };
    const proof = () => {
        if (!input.verified)
            throw new Error("Confirm that the supplied facts match the exact page and variant.");
        const url = publicReference(field(input.evidenceUrl, "the evidence URL"));
        sections.push("## Evidence supplied by the reviewer", `Reference: ${url}`, "Facts are human-supplied and have not been independently verified by this generator.");
        return url;
    };
    const check = contentChecks({ title: "Optimization draft", description: "", body: Object.values(input).filter((v) => typeof v === "string").join("\n"), keyword: "", kind: "fix" }, ctx);
    if (check.blockers.length)
        throw new Error(check.blockers.join(" "));
    const addFile = (name: string, language: string, code: string, placement: string, validation: string, source: string) => files.push({ name, language, code, placement, validation, source });
    if (input.mode === "pdp" || input.mode === "collection") {
        const source = proof();
        const keyword = field(input.keyword, "a primary buyer search term");
        const title = field(input.title, "the proposed search title");
        const desc = field(input.description, "the proposed search description");
        const h1 = field(input.heading, "the visible page heading");
        const facts = field(input.facts, "the supported page introduction and facts");
        sections.push("## Proposed search listing", `Primary term: ${md(keyword)}\n\nTitle (${title.length} characters): ${md(title)}\n\nDescription (${desc.length} characters): ${md(desc)}\n\nH1: ${md(h1)}`, "## Visible content draft", md(facts), "## Page-specific brief", input.mode === "pdp" ? "Keep this copy scoped to the selected variant. Present documented specifications, intended use, suitability limits, included quantity and care/directions beside the buying controls. Link shipping and returns to the current policy pages; do not infer terms from brand-wide claims." : "Explain which products belong in this assortment and the documented differences that help shoppers choose. Keep product cards and useful filters accessible. Link to a relevant buying guide and the individual products; do not repeat a generic product description across all collections.", `Shared voice direction: ${ctx.voice.map(md).join("; ") || "No voice guidance supplied"}`, "These are editable human-supplied draft values. Character counts are previews, not Google limits or ranking promises.");
        addFile("metadata-reference.html", "html", `<title>${htmlEscape(title)}</title>\n<meta name="description" content="${htmlEscape(desc)}">`, "Use the store search listing fields; this is the rendered HTML reference. Replace existing values instead of adding duplicate title or description tags.", "Preview mobile and desktop listings; check the rendered source contains one title and one description after implementation.", source);
        addFile("page-content.html", "html", `<h1>${htmlEscape(h1)}</h1>\n${facts.split(/\n\s*\n/).map((p) => `<p>${htmlEscape(p).replace(/\n/g, "<br>\n")}</p>`).join("\n")}`, "Adapt in the existing product/collection content area; do not duplicate the theme H1. Keep navigation and product controls intact.", "Review factual accuracy against the evidence and inspect the rendered mobile page.", source);
    }
    else if (input.mode === "answer") {
        const source = proof();
        const question = field(input.question, "the shopper question");
        const answer = field(input.answer, "the verified answer");
        sections.push("## Question and direct answer", `### ${md(question)}`, md(answer), `Evidence: ${source}`, "Use a concise visible answer that applies to this exact product or policy. Do not add FAQ rich-result claims or hidden answers. A useful answer does not guarantee an engine mention.");
        addFile("answer-block.html", "html", `<section aria-label="Product question">\n  <h2>${htmlEscape(question)}</h2>\n  <p>${htmlEscape(answer).replace(/\n/g, "<br>\n")}</p>\n  <p><a href="${htmlEscape(source)}">Supporting source</a></p>\n</section>`, "Place beside the relevant visible product/policy information. Use an appropriate heading level in the existing page.", "Verify the answer, source link, exact variant and current policy; test readability on mobile.", source);
    }
    else if (input.mode === "schema" || input.mode === "feed") {
        sections.push("## Captured schema and visible-fact reconciliation", ...schemaReconciliation(page, input).map((note) => `- ${md(note)}`));
        const source = proof();
        const name = field(input.productName, "the exact product/variant name");
        const sku = field(input.sku, "the verified SKU / stable product ID");
        const image = publicReference(field(input.imageUrl, "the exact product image URL"));
        if (!/^\d+(?:\.\d{1,2})?$/.test(input.price) || Number(input.price) <= 0)
            throw new Error("Enter a positive price with up to two decimal places.");
        if (!/^[A-Z]{3}$/.test(input.currency))
            throw new Error("Enter the verified three-letter uppercase currency code.");
        const availability = field(input.availability, "the verified stock status");
        if (input.gtin && !validGtin(input.gtin))
            throw new Error("GTIN must have 8, 12, 13 or 14 digits and a valid check digit. Do not invent one.");
        sections.push("## Verified variant inputs", `Name: ${md(name)}\n\nSKU / ID: ${md(sku)}\n\nPrice: ${input.price} ${input.currency}\n\nAvailability: ${availability}\n\nImage: ${image}`, "Match the exact selected variant and market on the landing page. This is a dated draft; inventory and price must be kept synchronized by the store owner.");
        if (input.mode === "schema") {
            const node = { "@type": "Product", "@id": `${target}#product`, name, url: target, image: [image], sku, brand: { "@type": "Brand", name: ctx.brandName }, ...(input.description ? { description: input.description } : {}), ...(input.gtin ? { [`gtin${input.gtin.length}`]: input.gtin } : {}), ...(input.mpn ? { mpn: input.mpn } : {}), offers: { "@type": "Offer", url: target, price: input.price, priceCurrency: input.currency, availability: `https://schema.org/${availability}` } };
            const graph: unknown[] = [node];
            if (input.breadcrumbName || input.breadcrumbUrl) {
                const collection = storeTarget(ctx, field(input.breadcrumbUrl, "the visible parent breadcrumb URL"));
                const label = field(input.breadcrumbName, "the visible parent breadcrumb label");
                graph.push({ "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: new URL(ctx.websiteUrl!).origin + "/" }, { "@type": "ListItem", position: 2, name: label, item: collection }, { "@type": "ListItem", position: 3, name, item: target }] });
            }
            addFile("product-offer-reference.html", "html", `<script type="application/ld+json">\n${jsonForHtml({ "@context": "https://schema.org", "@graph": graph })}\n</script>`, "Locate the theme/app that owns Product or ProductGroup markup first. Repair that owner; do not paste this over existing markup. This single-variant static draft must be adapted to live catalogue data before long-term use. Add breadcrumbs only if they match the visible hierarchy.", "Run Google Rich Results Test on the implementation; compare rendered price, currency, availability, URL, image and SKU for each relevant variant. Restore the original theme owner to roll back.", "https://developers.google.com/search/docs/appearance/structured-data/merchant-listing");
            sections.push("## Structured data scope", "One verified product/offer only; no invented ratings, reviews, shipping policy or return window. Variant groups require a catalogue-backed implementation. Additional merchant-listing attributes may be required or recommended; validate the rendered result.");
        }
        else {
            const desc = field(input.description, "the verified product description");
            const condition = field(input.condition, "the product condition");
            const stock: Record<string, string> = { InStock: "in_stock", OutOfStock: "out_of_stock", PreOrder: "preorder", BackOrder: "backorder" };
            const columns = ["id", "title", "description", "link", "image_link", "availability", "price", "condition", "brand", "gtin", "mpn", "identifier_exists", "availability_date", "item_group_id", "color", "size"];
            const row = [sku, name, desc, target, image, stock[availability], `${input.price} ${input.currency}`, condition, ctx.brandName, input.gtin, input.mpn, "", "", "", "", ""];
            addFile("merchant-row-review.csv", "csv", [columns, row].map((r) => r.map(csvCell).join(",")).join("\r\n"), "Spreadsheet review preview; map verified fields to the store's current Merchant Center feed method. Convert to a supported submission format where needed. Do not import until missing category/market fields are resolved.", "Compare every row field with the selected landing-page variant and Merchant Center diagnostics. Spreadsheet formula prefixes are escaped with an apostrophe; review those values before feed submission.", "https://support.google.com/merchants/answer/7052112?hl=en");
            sections.push("## Missing-data review before submission", ...[
                !input.gtin ? "- GTIN is blank. Obtain the assigned identifier if one exists; absence is not an exemption." : "- Confirm the supplied GTIN belongs to this variant, not a pack or another SKU.",
                !input.mpn ? "- MPN is blank. Confirm whether a manufacturer part number applies." : "- Confirm the manufacturer part number.",
                "- identifier_exists remains blank: determine identifier requirements before choosing a value.",
                ["PreOrder", "BackOrder"].includes(availability) ? "- BLOCKER: availability_date is blank for preorder/backorder. Supply the real expected availability date before submission." : "- Confirm current stock again at upload time.",
                "- item_group_id, color and size are blank. Supply applicable variant attributes; do not group unrelated products.",
                "- Confirm shipping, returns, tax and country/category-specific requirements in Merchant Center. This row is a review preview, not a submission-ready full feed.",
            ]);
        }
    }
    else if (input.mode === "trust") {
        const source = proof();
        sections.push("## Evidence statement for this page", md(field(input.facts, "the exact evidence statement and its applicability")), `Supporting source: ${source}`, `Reviewer notes: ${md(field(input.rationale, "the limitations, reviewer and date of the evidence"))}`, "## Implementation brief", "Place the supported statement close to the relevant product assertion, with accessible source attribution and limitations. Add named authors/reviewers only when their identity and involvement are verified. Keep customer reviews separate from substantiation. Do not transfer brand-wide claims to a SKU without an applicability review.", "## Brand Brain evidence candidates — applicability not established", ...ctx.claims.filter((c) => c.source.trim()).map((c) => `- ${md(c.text)} — source: ${md(c.source)}`));
    }
    else {
        const reason = field(input.rationale, "a page-specific decision rationale");
        const destination = input.destinationUrl ? storeTarget(ctx, input.destinationUrl) : target;
        const playbooks: Record<typeof input.policy, string> = {
            canonical: `Proposed canonical: ${destination}. Compare content equivalence, rendered canonical, sitemap inclusion and internal links. Use a canonical only for duplicate or substantially similar content; it is a signal, not a redirect. Do not use it to hide unrelated pages.`,
            filters: `Candidate clean destination: ${destination}. Inventory the selected filter/sort parameters and buyer intent before deciding which combinations deserve independent indexable pages. Retain navigation for shoppers. A blanket robots block can prevent crawlers from seeing noindex or canonical changes; coordinate the crawl and indexing plan.`,
            variants: `Candidate representative URL: ${destination}. Confirm whether variants have separate stable URLs, unique useful content and directly selectable offers. Keep internal links, canonicals and Product/ProductGroup data consistent. Do not canonicalize distinct products together simply because they share a collection.`,
            "temporary-stock": "Proposed temporary-stock treatment: retain a useful live product URL when replenishment is genuinely expected; show truthful unavailability, keep Offer availability synchronized, and offer relevant alternatives or a consent-based restock option. Do not redirect temporarily unavailable products to the home page. Confirm the replenishment decision with inventory owners.",
            discontinued: `Candidate replacement (only if truly equivalent): ${input.destinationUrl ? destination : "Not supplied"}. Confirm permanent discontinuation. Compare useful retained content and a genuinely relevant replacement before choosing retention, redirect, or a 404/410 response. Update internal links and sitemaps to match the approved outcome; never redirect every retired product to the homepage.`,
        };
        sections.push("## Proposed URL / stock decision", `Scenario: ${input.policy}\n\nRationale: ${md(reason)}`, playbooks[input.policy], "## Before / after verification", `Affected page: ${target}\n\nObserved status: ${page?.statusCode ?? "Unknown"}\n\nObserved canonical: ${md(page?.canonical ?? "Unknown")}\n\nProposed destination: ${destination}`, "Inspect the target and destination status, redirect chain, canonical, robots, sitemap entry and internal links before and after the change. Capture a backup and rollback plan. Index selection must be checked later with Search Console access; a public crawl cannot confirm Google's chosen canonical.");
        if (input.policy === "canonical")
            addFile("canonical-reference.html", "html", `<link rel="canonical" href="${htmlEscape(destination)}">`, "Replace the existing canonical only after a human approves content equivalence. Do not add a second canonical or a global hardcoded URL.", "Inspect rendered source on this page, then test representative products, filters and pagination to ensure the change is scoped correctly.", "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls");
    }
    if (files.length)
        sections.push("## After — proposed files", ...files.map((file) => `### ${file.name}\n\nPlacement: ${file.placement}\n\nValidation: ${file.validation}\n\nThe complete proposed code is attached to this draft as ${file.name}. This is not deployed code.`));
    sections.push(studyNotesMarkdown(studyFor({ mode: input.mode })));
    sections.push("## Manual release", "Review the draft and supporting evidence, save the current page/theme for rollback, then approve and export this revision from the handoff workspace. A human applies the change and records the deployed URL and fresh verification evidence. Nothing is published by this generator.");
    return { kind: "fix", title: `${optimizationModes[input.mode]}: ${input.productName || selected.label}`.slice(0, 240), keyword: input.keyword, productId: product?.id ?? page?.productId ?? null, targetUrl: target, description: `Manual ${optimizationModes[input.mode].toLowerCase()} package for ${target}`.slice(0, 500), body: sections.join("\n\n"), sourceIds: [...new Set(issues.map((f) => f.id))], codeFiles: files };
}
function validGtin(value: string): boolean {
    if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(value))
        return false;
    const digits = value.split("").map(Number);
    const check = digits.pop()!;
    const sum = digits.reverse().reduce((total, digit, i) => total + digit * (i % 2 === 0 ? 3 : 1), 0);
    return (10 - sum % 10) % 10 === check;
}
