"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { draftSourcedBlog, sourcedBlogInput, type SourcedBlogInput } from "@/lib/seo/blog";
import { saveArtifact } from "@/lib/seo/store";
import type { SeoArtifact } from "@/lib/seo/content";
import { writeSourcedBlog } from "@/lib/seo/blog-writer";
import { loadSearchPlan, saveSearchPlan } from "@/lib/seo/planning-store";
import { planStoreUrl, type SearchPlanData } from "@/lib/seo/planning";
import type { SeoContext } from "@/lib/seo/model";
import type { ResearchCapture } from "@/lib/seo/research";
import type { ArticleResource } from "@/lib/seo/article-resources";
export async function queueSourcedBlogAction(brandId: string, input: SourcedBlogInput) {
    try {
        if (await activeBrandId() !== brandId)
            throw new Error("The active brand changed. Refresh the brief.");
        const { createSeoBatch } = await import("@/lib/production-ops/seo-batch"), { enqueue } = await import("@/lib/jobs/queue");
        const batch = createSeoBatch(brandId, input.title, [input]);
        enqueue(brandId, "seo_batch", batch.id, { priority: "interactive" });
        revalidatePath("/production-ops");
        return { ok: true as const, value: { id: batch.id } };
    }
    catch (error) {
        return { ok: false as const, error: error instanceof Error ? error.message : "Could not queue the article." };
    }
}
export async function loadArticleResourcesAction(brandId: string, contextHash: string, productId: string): Promise<{
    ok: true;
    resources: ArticleResource[];
} | {
    ok: false;
    error: string;
}> {
    try {
        if (await activeBrandId() !== brandId)
            throw new Error("The active brand changed. Refresh this brief.");
        const ctx = seoContext(brandId);
        if (ctx.contextHash !== contextHash)
            throw new Error("Brand Brain changed. Refresh before selecting sources.");
        const { articleResources } = await import("@/lib/seo/article-resources");
        return { ok: true, resources: articleResources(ctx, productId) };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Could not load brand resources." };
    }
}
async function selectedResources(ctx: SeoContext, input: SourcedBlogInput) {
    if (!input.sections.some(s => s.resource))
        return [];
    const { articleResources } = await import("@/lib/seo/article-resources");
    const resources = articleResources(ctx, input.productId);
    return [...new Set(input.sections.flatMap(s => s.resource?.id ?? []))].map(id => {
        const source = resources.find(s => s.id === id);
        if (!source || input.sections.some(s => s.resource?.id === id && s.resource.hash !== source.hash))
            throw new Error("A selected brand resource changed. Reload it and review the affected section notes before drafting.");
        return source;
    });
}
function attachBrandResources(artifact: SeoArtifact, resources: ArticleResource[]) {
    if (!resources.length)
        return artifact;
    return { ...artifact, codeFiles: [...(artifact.codeFiles ?? []), { name: "brand-resource-snapshot.json", language: "json", code: JSON.stringify(resources, null, 2), placement: "Internal source snapshots for this draft; keep outside reader-facing copy.", validation: "Product-scoped local records reviewed by the submitter. A snapshot preserves the input; it does not independently verify its truth or current purchase terms.", source: resources[0].url }] };
}
async function sourceCaptures(ctx: SeoContext, input: SourcedBlogInput): Promise<ResearchCapture[]> {
    if (!input.sections.some((s) => s.captureId))
        return [];
    const { listResearch } = await import("@/lib/seo/review-store");
    const saved = listResearch(ctx.brandId);
    return input.sections.flatMap((section) => {
        if (!section.captureId)
            return [];
        const capture = saved.find((s) => s.id === section.captureId && s.contextHash === ctx.contextHash && s.url === section.sourceUrl);
        if (!capture)
            throw new Error("A selected source capture is unavailable or its URL changed. Fetch and review the source again, or detach it.");
        return [capture];
    });
}
function attachSourceCaptures(artifact: SeoArtifact, captures: ResearchCapture[]) {
    if (!captures.length)
        return artifact;
    return { ...artifact, codeFiles: [...(artifact.codeFiles ?? []), { name: "fetched-source-evidence.json", language: "json", code: JSON.stringify([...new Map(captures.map((c) => [c.id, c])).values()], null, 2), placement: "Internal editorial evidence only; keep outside shopper-facing copy.", validation: "Capture establishes the fetched text and date, not truth, product applicability or a complete source. Review final claims independently.", source: captures[0].url }] };
}
function linkedPlan(ctx: SeoContext, input: SourcedBlogInput): SearchPlanData | null {
    if (!input.planId)
        return null;
    const data = loadSearchPlan(ctx.brandId), row = data.rows.find((r) => r.id === input.planId);
    if (!row || row.contextHash !== ctx.contextHash || row.intent !== "informational" || row.keyword !== input.keyword || row.productId !== input.productId || planStoreUrl(ctx, row.targetUrl) !== planStoreUrl(ctx, input.targetUrl))
        throw new Error("The linked content plan changed or no longer matches this keyword, product and URL. Refresh the plan or detach this article.");
    return data;
}
function attachDraft(plan: SearchPlanData | null, input: SourcedBlogInput, artifact: SeoArtifact) {
    if (!plan || !input.planId)
        return;
    saveSearchPlan({ ...plan, revision: plan.revision + 1, rows: plan.rows.map((row) => row.id === input.planId ? { ...row, artifactId: artifact.id, status: "drafting", updatedAt: artifact.updatedAt } : row) });
}
export async function createSourcedBlogAction(brandId: string, input: SourcedBlogInput): Promise<{
    ok: true;
    value: SeoArtifact;
} | {
    ok: false;
    error: string;
}> {
    try {
        if (await activeBrandId() !== brandId)
            throw new Error("The active brand changed. Refresh the Blog studio.");
        const ctx = seoContext(brandId), at = new Date().toISOString();
        input = sourcedBlogInput.parse(input);
        const captures = await sourceCaptures(ctx, input);
        const resources = await selectedResources(ctx, input);
        if (await activeBrandId() !== brandId || seoContext(brandId).contextHash !== ctx.contextHash)
            throw new Error("Brand Brain changed while loading source evidence. Refresh before creating this article.");
        const draft = draftSourcedBlog(ctx, input, at), plan = linkedPlan(ctx, input);
        const artifact: SeoArtifact = { ...draft, id: randomUUID(), brandId, contextHash: ctx.contextHash, mode: "live", status: "draft", revision: 1, createdAt: at, updatedAt: at, history: [{ at, message: "Source-backed editorial draft assembled from human-reviewed passages and shared Brand Brain. Source URLs were not independently verified. Nothing published." }] };
        const enriched = attachBrandResources(attachSourceCaptures(artifact, captures), resources);
        saveArtifact(enriched);
        attachDraft(plan, input, artifact);
        revalidatePath("/seo", "layout");
        revalidatePath("/landing", "layout");
        return { ok: true, value: enriched };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Unable to create the sourced article draft." };
    }
}
export async function writeSourcedBlogAction(brandId: string, input: SourcedBlogInput): Promise<{
    ok: true;
    value: SeoArtifact;
} | {
    ok: false;
    error: string;
}> {
    try {
        if (await activeBrandId() !== brandId)
            throw new Error("The active brand changed. Refresh the Blog studio.");
        const ctx = seoContext(brandId), at = new Date().toISOString();
        input = sourcedBlogInput.parse(input);
        const captures = await sourceCaptures(ctx, input);
        const resources = await selectedResources(ctx, input);
        const planBefore = linkedPlan(ctx, input);
        const result = await writeSourcedBlog(ctx, input, at);
        if (await activeBrandId() !== brandId || seoContext(brandId).contextHash !== ctx.contextHash)
            throw new Error("Brand Brain changed while drafting. Refresh and review the source notes again. Model usage is recorded, but no draft was saved.");
        let planAfter: SearchPlanData | null = null;
        if (planBefore) {
            try {
                const current = linkedPlan(ctx, input);
                if (current?.revision === planBefore.revision)
                    planAfter = current;
            }
            catch { }
        }
        const artifact: SeoArtifact = { ...result.draft, id: randomUUID(), brandId, contextHash: ctx.contextHash, mode: "live", status: "draft", revision: 1, createdAt: at, updatedAt: at, history: [{ at, message: `AI draft needs human review. Generated from supplied source notes with ${result.model}; call ${result.callId}; usage $${result.costUsd.toFixed(4)}. Sources are not independently verified. Nothing published.` }] };
        if (planBefore && !planAfter)
            artifact.history.push({ at, message: "The content plan changed during drafting. This article was saved independently; its task link was not changed. Review and attach it manually." });
        await selectedResources(ctx, input);
        const enriched = attachBrandResources(attachSourceCaptures(artifact, captures), resources);
        saveArtifact(enriched);
        attachDraft(planAfter, input, artifact);
        revalidatePath("/seo", "layout");
        revalidatePath("/landing", "layout");
        return { ok: true, value: enriched };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Unable to draft the article from these notes." };
    }
}
