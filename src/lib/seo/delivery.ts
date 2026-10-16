import { articleHtml, exportPackage, slug, type SeoArtifact } from "./content";
import { articleInternalLinks } from "./review-tools";
import type { SeoContext } from "./model";
export function seoDeliveryFiles(ctx: SeoContext, artifacts: SeoArtifact[]) {
    if (!artifacts.length || artifacts.length > 20 || new Set(artifacts.map((a) => a.id)).size !== artifacts.length)
        throw new Error("Choose one to twenty distinct approved revisions.");
    const files: {
        name: string;
        content: string;
    }[] = [];
    for (const artifact of artifacts) {
        const approved = exportPackage(artifact, ctx), folder = `${slug(artifact.title)}-${artifact.id.slice(0, 8)}-r${artifact.revision}`;
        const copyPath = artifact.kind === "blog" ? "shopper/article" : "developer/brief";
        files.push({ name: `${folder}/${copyPath}.md`, content: artifact.body }, { name: `${folder}/${copyPath}.html`, content: articleHtml(artifact.body) }, { name: `${folder}/metadata.json`, content: JSON.stringify({ title: artifact.title, description: artifact.description, keyword: artifact.keyword, targetUrl: artifact.targetUrl, productId: artifact.productId }, null, 2) }, { name: `${folder}/internal-links.json`, content: JSON.stringify(articleInternalLinks(ctx, artifact.body), null, 2) }, { name: `${folder}/implementation.md`, content: approved.instructions.map((s) => `- ${s}`).join("\n") });
        if (artifact.kind === "blog")
            files.push({ name: `${folder}/schema/article-reference.json`, content: JSON.stringify({ "@context": "https://schema.org", "@type": "BlogPosting", headline: artifact.title, description: artifact.description, mainEntityOfPage: artifact.targetUrl }, null, 2) });
        for (const file of artifact.codeFiles ?? []) {
            const schema = /product-offer|schema/i.test(file.name) && artifact.kind === "fix";
            files.push({ name: `${folder}/${schema ? "schema" : artifact.kind === "blog" ? "editorial" : "developer"}/${slug(file.name.split(".").slice(0, -1).join("."))}.${file.name.split(".").at(-1)?.replace(/[^a-z0-9]/gi, "") || "txt"}`, content: file.code });
        }
        files.push({ name: `${folder}/editorial/revision-provenance.json`, content: JSON.stringify({ id: artifact.id, brandId: artifact.brandId, contextHash: artifact.contextHash, revision: artifact.revision, status: artifact.status, sourceIds: artifact.sourceIds, history: artifact.history, codePlacement: artifact.codeFiles?.map(({ name, placement, validation, source }) => ({ name, placement, validation, source })) }, null, 2) });
    }
    files.push({ name: "README.md", content: "# Approved SEO delivery\n\nEvery folder retains its own target URL and approved revision. Shopper copy, metadata, link inventory, proposed schema, implementation notes and editorial provenance are separate. Developer briefs are not shopper-facing content. Schema is a reference for the existing owner; do not layer duplicate Product markup or invent authors, prices, ratings or publication dates. Review current links and facts before manual publication. No theme, live store or ranking was changed or tested by this export.\n" });
    return files;
}
