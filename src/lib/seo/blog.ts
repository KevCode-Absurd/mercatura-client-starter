import { z } from "zod";
import { contentChecks, slug, type SeoArtifact } from "./content";
import type { SeoContext } from "./model";
import { publicReference, storeTarget } from "./optimization";
import { assessArticleDepth } from "./article-quality";
import { AtomicFactSchema } from "../production-evidence/facts";
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const sectionSchema = z.object({
    heading: text(3, 160), copy: text(30, 12000), sourceTitle: text(3, 180),
    sourceUrl: text(1, 2000), limitations: z.string().trim().max(1200).default(""),
    guidance: z.string().trim().max(2000).optional(),
    atomicFacts: z.array(AtomicFactSchema).max(100).optional(),
    captureId: z.string().trim().min(1).max(100).optional(),
    resource: z.object({ id: text(1, 300), hash: text(64, 64) }).optional(),
});
export const sourcedBlogInput = z.object({
    contextHash: text(1, 100), keyword: text(3, 180), productId: text(1, 100),
    audience: text(5, 500), decision: text(10, 1000), title: text(5, 180),
    description: text(20, 320), targetUrl: text(1, 2000),
    sections: z.array(sectionSchema).min(2).max(8), reviewed: z.literal(true),
    planId: z.string().trim().min(1).max(150).optional(),
    format: z.enum(["article", "listicle", "comparison"]).optional(),
    depth: z.enum(["short_answer", "standard", "deep"]).default("standard"),
    decisionType: z.enum(["comparison", "compatibility", "use", "care", "selection", "objection"]).optional(),
    originalContribution: z.object({ type: z.enum(["comparison_criteria", "fit_worksheet", "product_explanation", "measurement", "expert_clarification"]), description: text(10, 2000) }).optional(),
    funnelStage: z.enum(["TOF", "MOF", "BOF"]).optional(),
});
export type SourcedBlogInput = z.input<typeof sourcedBlogInput>;
export type BlogSeed = Partial<Omit<SourcedBlogInput, "reviewed" | "contextHash">>;
function citationUrl(raw: string) {
    return publicReference(raw).replace(/\(/g, "%28").replace(/\)/g, "%29");
}
function prose(value: string) {
    if (/<\/?[a-z][^>]*>|!?\[[^\]]*\]\(|^\s*(#{1,6}\s|```)/im.test(value))
        throw new Error("Use plain text in the editorial fields. Put links in the source URL fields.");
    return value;
}
export function draftSourcedBlog(ctx: SeoContext, raw: SourcedBlogInput, reviewedAt = new Date().toISOString(), options: {
    readerCopyIncludesScope?: boolean;
} = {}): Pick<SeoArtifact, "kind" | "title" | "keyword" | "productId" | "targetUrl" | "description" | "body" | "sourceIds" | "codeFiles"> {
    const input = sourcedBlogInput.parse(raw);
    if (input.contextHash !== ctx.contextHash)
        throw new Error("Brand Brain changed. Refresh and review the brief again.");
    const product = ctx.products.find((p) => p.id === input.productId);
    if (!product)
        throw new Error("Choose a product from the active Brand Brain.");
    for (const section of input.sections)
        for (const fact of section.atomicFacts ?? [])
            if (fact.scope.productId !== input.productId || fact.scope.market !== ctx.market || fact.authority.kind !== "approved_fact" || fact.validUntil && fact.validUntil <= new Date().toISOString())
                throw new Error("A typed source fact is unapproved, expired or outside the selected product and market. Review the current source before drafting.");
    const targetUrl = storeTarget(ctx, input.targetUrl);
    if (new URL(targetUrl).search)
        throw new Error("Use a clean proposed article URL without tracking or filter parameters.");
    const headings = input.sections.map((s) => s.heading.toLocaleLowerCase());
    if (new Set(headings).size !== headings.length)
        throw new Error("Give each article section a distinct heading.");
    const sections = input.sections.map((s, index) => ({ ...s, heading: prose(s.heading), copy: prose(s.copy), guidance: prose(s.guidance ?? ""), sourceTitle: prose(s.sourceTitle), limitations: prose(s.limitations), sourceUrl: citationUrl(s.sourceUrl), id: `source-${index + 1}` }));
    [input.title, input.keyword, input.description, input.audience, input.decision].forEach(prose);
    const checks = contentChecks({ kind: "blog", title: input.title, keyword: input.keyword, description: input.description, body: [input.audience, input.decision, ...sections.flatMap((s) => [s.heading, s.copy, s.sourceTitle, s.limitations])].join("\n\n") }, ctx);
    if (checks.blockers.length)
        throw new Error(checks.blockers.join(" "));
    const productUrl = product.url ? citationUrl(storeTarget(ctx, product.url)) : null;
    const body = [
        `# ${input.title}`,
        ...sections.map((s, index) => `## ${input.format === "listicle" ? `${index + 1}. ` : ""}${s.heading}\n\n${s.copy}\n\n[Source ${index + 1}: ${s.sourceTitle.replace(/[\[\]]/g, "")}](${s.sourceUrl})${s.limitations && !options.readerCopyIncludesScope ? `\n\n${s.limitations}` : ""}`),
        ...(productUrl ? [`## Explore ${product.name.replace(/[\[\]\r\n]/g, " ")}\n\n[View the current product details](${productUrl}) and confirm the selected option and purchase terms before ordering.`] : []),
    ].join("\n\n");
    const finalChecks = contentChecks({ kind: "blog", title: input.title, keyword: input.keyword, description: input.description, body }, ctx);
    if (finalChecks.blockers.length)
        throw new Error(finalChecks.blockers.join(" "));
    const brief = {
        version: 1, method: "Human-reviewed source assembly; no independent source verification or model synthesis", brandId: ctx.brandId,
        contextHash: ctx.contextHash, brandName: ctx.brandName, market: ctx.market, voice: ctx.voice,
        keyword: input.keyword, audience: input.audience, buyerDecision: input.decision, targetUrl, format: input.format ?? "article", funnelStage: input.funnelStage,
        productId: product.id, title: input.title, description: input.description, decisionType: input.decisionType ?? "selection", originalContribution: input.originalContribution ?? null,
        depth: input.depth ?? null,
        articleQuality: input.depth ? assessArticleDepth(body, input.depth, input.sections.map(s => s.heading)) : null,
        reviewedAt, reviewScope: "Submitter confirmed applicability and wording of every section. No named external reviewer is implied.",
        sections, editorialChecks: ["Does the first section directly answer the target query?", "Do the sources support the exact selected product, variant and market?", "Are decision-relevant product/variant conditions and claim limits preserved in natural reader-facing prose, with technical QA kept in this brief?", "Have any subsequent edits introduced claims absent from these sources?", "Confirm uniqueness, source attribution, actual product URLs and mobile formatting before publishing."],
        limitations: ["A supplied URL is not proof that a statement is true.", "No search volume, competitor rank or ranking improvement is asserted.", "This brief records the source draft; later article edits require a fresh evidence review."],
    };
    return {
        kind: "blog", title: input.title, keyword: input.keyword, productId: product.id, targetUrl,
        description: input.description, body,
        sourceIds: [...new Set([`brand:${ctx.brandId}:product:${product.id}`, ...sections.map((s) => s.sourceUrl)])],
        codeFiles: [{ name: `${slug(input.keyword)}-editorial-brief.json`, language: "json", code: JSON.stringify(brief, null, 2),
                placement: "Editorial reference only. Keep alongside the article; do not paste this JSON into the store theme. HTML is generated from the reviewed article at export time.",
                validation: "Review every paragraph and citation, plus any changes made after this source draft. Preserve attribution, check product applicability and approve the article revision before publishing.", source: sections[0].sourceUrl }],
    };
}
