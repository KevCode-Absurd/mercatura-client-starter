export type SeoCodeFile = {
    name: string;
    language: string;
    code: string;
    placement: string;
    validation: string;
    source: string;
};
export function codeForRule(ruleId: string): SeoCodeFile[] {
    if (ruleId === "SEO-CANONICAL")
        return [{
                name: "canonical-reference.liquid", language: "liquid",
                code: '<link rel="canonical" href="{{ canonical_url | escape }}">',
                placement: "Shopify theme head: inspect the existing canonical tag first. Replace an incorrect duplicate or hardcoded tag only after agreeing the variant/filter policy. Do not add a second canonical.",
                validation: "In a duplicate theme, inspect rendered source on a product, selected variant, collection and paginated collection. Confirm one canonical and the intended destination. Restore the previous head snippet to roll back.",
                source: "https://shopify.dev/docs/api/liquid/objects/canonical_url",
            }];
    if (ruleId === "SEO-PRICE" || ruleId === "SEO-STOCK" || ruleId === "SEO-PRODUCT-SCHEMA")
        return [{
                name: "product-data-reference.liquid", language: "liquid",
                code: '{% if product %}\n<script type="application/ld+json">\n  {{ product | structured_data }}\n</script>\n{% endif %}',
                placement: "Reference for a Shopify product template with a product object. First identify the theme/app that owns existing Product or ProductGroup markup and repair it there. Use this reference only if replacing that owner is appropriate; never layer it over conflicting markup.",
                validation: "Use real catalogue price and inventory. Inspect rendered JSON-LD for each selected variant and stock state, then run a structured-data validator. Shopify output must match visible offers; this reference alone does not prove that. Restore the original snippet/app settings to roll back.",
                source: "https://shopify.dev/docs/api/liquid/filters/structured_data",
            }];
    return [];
}
