import type { SeoContext, SeoFinding, SeoPage } from "./model";
import type { SeoCodeFile } from "./code";
export type Diagnosis = {
    explanation: string;
    mechanism: string;
    recommendation: string;
    alternative: string;
    before: string;
    after: string;
    location: string;
    validation: string[];
    rollback: string;
    scope: string;
    capturedAt: string | null;
    sourceHash: string | null;
    reference: string;
};
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const root = "https://developers.google.com/search/docs/";
export function diagnoseFinding(f: SeoFinding, page: SeoPage | undefined, ctx: SeoContext): Diagnosis {
    const rule = f.ruleId.replace("SEO-DUPLICATE-", "SEO-");
    const samples = page?.live?.sourceSamples?.filter((s) => s.ruleId === rule) ?? [];
    const product = ctx.products.find((p) => p.id === page?.productId);
    const label = product?.name ?? page?.h1 ?? "[reviewed page-specific label]";
    const base: Diagnosis = {
        explanation: f.why, mechanism: f.evidence.join("\n"), recommendation: f.remedy,
        alternative: "Keep the current behavior if it is intentional; document the page's purpose and supporting evidence before closing this item.",
        before: samples.length ? samples.map((s) => `Fetched HTML line ${s.line}\n${s.code}`).join("\n\n") : `No matching code excerpt retained.\n${f.evidence.join("\n")}\n${page?.live?.sourceSamples ? "Absence is based on the parsed response, not a theme file search." : "Rerun the website audit to capture source excerpts."}`,
        after: f.remedy, location: "Locate the template or app that generates this field on the affected URL. Public HTML cannot identify the exact theme filename.",
        validation: ["Open the exact affected URL in an unpublished theme or staging preview.", "Inspect the returned source and the rendered mobile page; confirm the specific field matches the approved change.", "Check a product variant, cart and adjacent page using the same template for regressions.", "After human publication, rerun the audit and record the URL and new evidence. Rankings and AI citations are separate measurements."],
        rollback: "Save the current theme/page/app settings before editing. If validation fails, restore that revision and confirm the previous behavior returns.",
        scope: "Inspected public server HTML and selected response headers only. No theme repository, JavaScript execution, checkout test or vulnerability assessment was performed.",
        capturedAt: page?.live?.fetchedAt ?? null, sourceHash: page?.live?.sourceHash ?? null,
        reference: `${root}fundamentals/seo-starter-guide`,
    };
    const duplicate = f.ruleId.includes("DUPLICATE");
    switch (rule) {
        case "GEO-SEARCH-ACCESS": return { ...base,
            explanation: "The fetched robots.txt policy disallows at least one selected search or retrieval agent on this intended public page. This may be intentional and requires review.",
            mechanism: "Specific user-agent groups can override wildcard groups. Policy evaluation does not test actual provider requests, CDN challenges, indexing or recommendation eligibility.",
            recommendation: "Review the exact agent and public path with the store owner. Update its existing robots group only where discovery is intended, preserve private-path exclusions, and manage training preferences separately.",
            after: "The intended public destination has the reviewed policy for the selected search/retrieval agent. Existing private paths remain excluded. Actual provider HTTP access is verified separately using logs and documented identity checks.",
            location: "The storefront's robots.txt template or platform setting, followed by CDN/WAF settings if real requests remain blocked.",
            validation: ["Record the original robots policy and the exact agent/URL.", "Re-evaluate both the public destination and private-path exclusions after editing.", "Verify CDN behavior separately; a matching user-agent string alone does not verify crawler identity.", "Repeat the saved answer protocol; a policy pass is not a visibility result."],
            reference: "https://developers.openai.com/api/docs/bots" };
        case "SEO-TITLE": return { ...base,
            explanation: duplicate ? "Several sampled URLs return the same title. Shoppers may be unable to tell the products or categories apart in search." : "The fetched page has no usable title element. This is the page label search systems can use when constructing a result.",
            mechanism: "A product name shown visually is not necessarily the HTML title. Search systems may choose another label, so this does not guarantee a specific search appearance.",
            recommendation: "Edit the page's search listing title and confirm the theme emits exactly one descriptive title. Start with the product or collection purpose, then the brand.",
            after: `<title>${esc(label)} | ${esc(ctx.brandName)}</title>`,
            location: "Shopify product/collection/blog → Search engine listing. If that saved value is not emitted, inspect the theme head and the SEO app that owns the title.",
            validation: [...base.validation, "Check each affected URL has a distinct useful title unless the URLs intentionally consolidate to one canonical."], reference: `${root}appearance/title-link` };
        case "SEO-DESCRIPTION": return { ...base,
            explanation: duplicate ? "Repeated descriptions do not explain how these distinct destinations serve different shopping needs." : "There is no usable description meta tag in the fetched source. The search engine has less page-specific summary text to consider.",
            mechanism: "Descriptions can help a shopper choose a result; search engines may rewrite them. Their presence is not a ranking or click-through guarantee.",
            recommendation: "Write a concise summary of this page's verified assortment or product purpose and its useful buying information. Avoid unverified benefits, price or shipping promises.",
            after: '<meta name="description" content="[Reviewed summary of this exact page, using verified product facts and purchase information]">',
            location: "Search engine listing description for this page; then verify the emitted meta tag in the theme head.", reference: `${root}appearance/snippet` };
        case "SEO-HEADING": return { ...base,
            explanation: "No readable main heading was found in the source. A logo or styled div can look like a heading without identifying the page semantically.",
            mechanism: "A clear main heading helps shoppers and assistive technology understand which product, collection or guide they reached. This check does not assert that multiple H1 elements always harm SEO.",
            recommendation: "Render the actual product/collection/article title as the page's main heading, then organize supporting sections below it.",
            after: `<h1>${esc(label)}</h1>`, location: "The visible page-title section in the product, collection or article template; preserve existing styling and accessibility." };
        case "SEO-CANONICAL": return { ...base,
            explanation: "The source does not declare one valid preferred URL. Duplicate tags or missing destinations leave ambiguous consolidation signals.",
            mechanism: "Canonical is a preference signal, not a redirect. Variants, collection product paths and filters can need different policies. A different canonical is not automatically wrong.",
            recommendation: "Agree the intended canonical with the SEO owner. Repair the existing tag's owner rather than adding another tag.",
            after: '<link rel="canonical" href="{{ canonical_url | escape }}">',
            location: "Shopify theme head or the app emitting canonical markup; use this Liquid reference only after checking the store's URL policy.",
            validation: [...base.validation, "Check base product, selected variant, collection and page 2. Do not canonicalize every paginated page to page 1 by default."],
            reference: `${root}crawling-indexing/consolidate-duplicate-urls` };
        case "SEO-INDEX": return { ...base,
            explanation: "This URL returned an error or a noindex directive. Whether that is a problem depends on whether this exact destination is meant to attract search visitors.",
            mechanism: "A noindex directive requests exclusion. A robots block stops crawling and may stop a crawler from seeing noindex; these controls do different jobs. A public 200 response still does not prove indexing.",
            recommendation: "Confirm page intent first. Restore a broken intended destination, or remove accidental noindex at its actual owner. Keep private, checkout and intentionally excluded pages excluded.",
            before: `${base.before}\nHTTP: ${page?.statusCode ?? "unknown"}\nX-Robots-Tag: ${page?.live?.responseHeaders?.["x-robots-tag"] ?? "not observed"}`,
            after: "Intended public destination: HTTP 200, useful content, crawl allowed and no accidental noindex.\nRetired destination: choose a genuinely equivalent 301 target or intentional 404/410; do not redirect everything to the home page.",
            location: "Hosting routing, platform publication state, theme robots meta or response header owner, depending on the observed symptom.",
            validation: [...base.validation, "With property access, use Search Console URL Inspection. Until then, index status remains unknown."], reference: `${root}crawling-indexing/block-indexing` };
        case "SEO-IMAGE-ALT": return { ...base,
            explanation: "The captured image elements omit alt attributes. People who cannot see an informative product image lose its meaning.",
            mechanism: "An empty alt attribute is correct for decoration. A missing attribute differs from intentionally empty alt; this check does not judge whether existing descriptions are accurate.",
            recommendation: "Inspect each captured image. Describe useful visible product details concisely, or set alt to empty for a purely decorative image. Do not stuff keywords.",
            after: '<img src="[existing verified image URL]" alt="[Accurate description of the visible product and relevant detail]">\n<!-- Decorative image: alt="" -->',
            location: "Product media alt-text field or image section in the theme that emitted the captured element.", reference: `${root}appearance/google-images` };
        case "SEO-JSONLD": return { ...base,
            explanation: "At least one JSON-LD block could not be parsed as JSON. The consumer cannot reliably read the intended structured information from that block.",
            mechanism: "Common causes include trailing commas, unescaped quotes or theme variables inserted without JSON encoding. This parser check does not validate every Schema.org or Google requirement.",
            recommendation: "Use the captured block and line to find its owning app/template. Parse it with a JSON validator, fix the actual syntax error at the data serializer and validate the entire output.",
            after: "Serialize values with the template's JSON encoder, not manual string concatenation.\nShopify example for one field: \"name\": {{ product.title | json }}\nThe surrounding object must also be valid JSON; this line is not a complete schema block.",
            location: "The theme/app emitting the invalid application/ld+json block.", reference: `${root}appearance/structured-data/sd-policies` };
        case "SEO-PRODUCT-SCHEMA": return { ...base,
            explanation: "No inspected Product JSON-LD object includes all the checked identity and offer fields. This can leave product-result consumers without usable product or purchase information.",
            mechanism: "The check covers name, image, offer, price, currency and availability presence. It does not prove values match the visible selected variant, validate ProductGroup, or certify rich-result eligibility.",
            recommendation: "Repair the existing schema owner. Use the Page optimizer to create a reviewed Product/Offer reference with verified price, currency, image and availability; reconcile variants before deployment.",
            after: "Product/Offer reference → Page optimizer → Product schema.\nProvide verified offer values; never invent price, availability, reviews, GTIN or ratings.\nFor Shopify, {{ product | structured_data }} is a platform reference to evaluate, not a patch to layer over an existing schema owner.",
            validation: [...base.validation, "Run the Rich Results Test on the rendered URL and compare the same selected variant's price, currency and stock with the structured offer."], reference: `${root}appearance/structured-data/merchant-listing` };
        case "SEO-BREADCRUMB": return { ...base,
            explanation: "BreadcrumbList JSON-LD was not found. This is a review opportunity: visible breadcrumbs or supported microdata may already exist.",
            mechanism: "A breadcrumb describes the shopping hierarchy. Missing JSON-LD alone does not prove that store navigation is broken.",
            recommendation: "Confirm the visible category path is useful. If adding structured breadcrumbs, make each item match that real path and check for another markup owner first.",
            after: "Home → [Actual parent collection] → [Actual product]\nUse Page optimizer to supply the real breadcrumb names and URLs; do not invent a collection path.", reference: `${root}appearance/structured-data/breadcrumb` };
        case "AEO-ANSWERS": return { ...base,
            explanation: "The source heuristic did not find an explicit question heading followed by enough answer text. The page may still contain useful prose, so review its purpose before adding a FAQ.",
            mechanism: "This checks source structure, not truth or AI inclusion. Clear answers help a buyer resolve real fit, use, delivery or return questions.",
            recommendation: "Choose a question from the shared buyer context, write a direct factual answer, and attach its exact policy/product evidence in Page optimizer. Add it where it helps the shopping decision.",
            after: '<section>\n  <h2>[Actual shopper question]</h2>\n  <p>[Direct answer verified against the exact product or current policy]</p>\n</section>',
            alternative: "Keep a clear existing prose answer if it already serves the buyer; record that the structure heuristic is not applicable. FAQ markup is not a requirement for AI visibility.",
            reference: `${root}appearance/ai-features` };
        case "AEO-POLICIES": return { ...base,
            explanation: "The source did not expose recognizable links for every checked shipping, returns and support destination. Policy wording and actual terms were not verified.",
            mechanism: "Buyers need to find the current purchase rules before ordering. A footer link can exist under different wording, so check the page and the crawler's evidence together.",
            recommendation: "Locate the real policies and support route. Add descriptive links near relevant purchase decisions and verify the destination content for the active market.",
            after: '<a href="[verified shipping policy URL]">Shipping and delivery</a>\n<a href="[verified returns policy URL]">Returns and refunds</a>\n<a href="[verified contact URL]">Contact support</a>',
            location: "Store navigation/footer and relevant product purchase-information section. Confirm actual destinations before pasting." };
        case "SECURITY-HTTPS": return { ...base, after: "Valid HTTPS storefront URL; HTTP redirects once to the equivalent HTTPS path. Verify certificate and custom-domain configuration with the platform owner.", reference: "https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security" };
        case "SECURITY-MIXED-CONTENT": return { ...base,
            explanation: "The HTTPS document contains explicit HTTP image, script, style or media references. The browser may upgrade or block them.",
            mechanism: "These are observed source references, not a confirmed exploit or a rendered failure. JavaScript may create additional requests that this scan cannot see.",
            recommendation: "Verify each resource actually supports HTTPS, then update its owning theme or app. Replace unsupported resources with an approved secure host.",
            after: samples.length ? samples.map((s) => s.code.replace(/http:\/\//g, "https://")).join("\n\n") + "\n[Proposed URL substitutions only — verify each HTTPS endpoint before applying.]" : "Replace the recorded HTTP references with verified HTTPS resources.",
            validation: [...base.validation, "Inspect the browser Network and Console panels for blocked or upgraded requests; test the storefront apps that use the resource."], reference: "https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content" };
        case "SECURITY-HEADERS": return { ...base,
            before: JSON.stringify(page?.live?.responseHeaders ?? {}, null, 2),
            explanation: "These are the browser protection headers returned on the public page. This is a configuration review, not a security pass/fail certification.",
            mechanism: "CSP restricts content sources; HSTS requests HTTPS for future visits; nosniff restricts content-type guessing. Safe values depend on the storefront's platform and third-party integrations.",
            recommendation: "Have the platform owner review existing policies, build an inventory of required integrations and evaluate proposed CSP rules in report-only mode before enforcement.",
            after: "A reviewed platform-specific policy with verified payment/app/analytics origins. No blanket CSP or HSTS policy is generated from a source-only crawl.",
            location: "Hosting/CDN response configuration or supported platform settings, not a meta-tag workaround for every header.",
            validation: ["Review CSP violation reports in a controlled test.", "Test login, payment redirects, subscriptions, consent, analytics and embeds before enforcement.", "Have the hosting owner verify headers after deployment; no active security testing is performed by this app."], reference: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP" };
        default: return base;
    }
}
export function diagnosisMarkdown(f: SeoFinding, d: Diagnosis): string {
    const fence = (s: string) => `\n\n\`\`\`text\n${s.replace(/`{3,}/g, "[backticks]")}\n\`\`\`\n`;
    return `# ${f.title}\n\nAffected URL: ${f.url}\n\n## What is happening\n\n${d.explanation}\n\n## Why it happens and why it matters\n\n${d.mechanism}\n\n## Before — captured evidence\n${fence(d.before)}\nCaptured: ${d.capturedAt ?? "not available"}\nSource SHA-256: ${d.sourceHash ?? "not captured in this audit"}\n\n## Recommended option\n\n${d.recommendation}\n\n## After — proposed, not implemented\n${fence(d.after)}\n## Where the developer should change it\n\n${d.location}\n\n## Alternative / when to leave it alone\n\n${d.alternative}\n\n## Acceptance tests\n\n${d.validation.map((s) => `- ${s}`).join("\n")}\n\n## Rollback\n\n${d.rollback}\n\n## Scope and limitations\n\n${d.scope}\n\nReference: ${d.reference}\n\nExecutor: human. Exporting this package does not change the live store.\n`;
}
export function diagnosisCodeFiles(f: SeoFinding, d: Diagnosis): SeoCodeFile[] {
    return [{ name: `${f.ruleId.toLowerCase()}-diagnosis.md`, language: "markdown", code: diagnosisMarkdown(f, d), placement: d.location, validation: d.validation.join("\n"), source: d.reference }];
}
