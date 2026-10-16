"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { validatePlanInput, type SearchPlanInput } from "@/lib/seo/planning";
import { loadSearchPlan, saveSearchPlan } from "@/lib/seo/planning-store";
import { saveArtifact } from "@/lib/seo/store";
import { createSeoArtifactAction } from "./actions";
async function current(brandId: string, hash: string, revision: number) {
    if (await activeBrandId() !== brandId)
        throw new Error("Active brand changed. Refresh before editing this plan.");
    z.number().int().nonnegative().parse(revision);
    const ctx = seoContext(brandId), data = loadSearchPlan(brandId);
    if (ctx.contextHash !== hash)
        throw new Error("Brand Brain changed. Refresh and review this plan.");
    if (data.revision !== revision)
        throw new Error("The plan changed in another view. Refresh before saving.");
    return { ctx, data };
}
export async function saveSearchPlanRowAction(brandId: string, hash: string, revision: number, id: string | null, input: SearchPlanInput) {
    try {
        const { ctx, data } = await current(brandId, hash, revision);
        const parsed = validatePlanInput(ctx, input), previous = data.rows.find((r) => r.id === id);
        if (id && !previous)
            throw new Error("Plan item no longer exists.");
        if (!id && data.rows.length >= 500)
            throw new Error("This plan supports up to 500 tasks.");
        const keepDraft = previous?.contextHash === ctx.contextHash && previous.keyword === parsed.keyword && previous.productId === parsed.productId && previous.targetUrl === parsed.targetUrl && previous.intent === parsed.intent;
        const row = { ...parsed, id: id || randomUUID(), contextHash: ctx.contextHash, updatedAt: new Date().toISOString(), ...(previous?.evidence ? { evidence: previous.evidence } : {}), ...(previous?.strategyRowId ? { strategyRowId: previous.strategyRowId } : {}), ...(keepDraft && previous?.editorialBrief ? { editorialBrief: previous.editorialBrief } : {}), ...(keepDraft && previous?.artifactId ? { artifactId: previous.artifactId } : {}) };
        saveSearchPlan({ ...data, revision: data.revision + 1, rows: [...data.rows.filter((r) => r.id !== id), row] });
        revalidatePath("/seo", "layout");
        return { ok: true as const };
    }
    catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Unable to save search plan." };
    }
}
export async function deleteSearchPlanRowAction(brandId: string, hash: string, revision: number, id: string) {
    try {
        const { data } = await current(brandId, hash, revision);
        if (!data.rows.some((r) => r.id === id))
            throw new Error("Plan item no longer exists.");
        saveSearchPlan({ ...data, revision: data.revision + 1, rows: data.rows.filter((r) => r.id !== id) });
        revalidatePath("/seo", "layout");
        return { ok: true as const };
    }
    catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Unable to remove item." };
    }
}
export async function createMappedBlogAction(brandId: string, hash: string, revision: number, id: string) {
    try {
        const { ctx, data } = await current(brandId, hash, revision);
        const row = data.rows.find((r) => r.id === id);
        if (!row || row.contextHash !== hash)
            throw new Error("Review and save this plan item against the current Brand Brain first.");
        if (row.intent !== "informational")
            throw new Error("Use informational intent for a blog. Product and category queries belong on store pages.");
        validatePlanInput(ctx, row);
        const result = await createSeoArtifactAction(brandId, { keyword: row.keyword, productId: row.productId });
        if (!result.ok)
            throw new Error(result.error);
        if (seoContext(brandId).contextHash !== hash || result.value.contextHash !== hash)
            throw new Error("Brand Brain changed during drafting. Review the saved draft and refresh this plan.");
        saveArtifact({ ...result.value, targetUrl: row.targetUrl, ...(row.evidence ? { sourceIds: [...result.value.sourceIds, `plan-evidence:${row.id}`], codeFiles: [...(result.value.codeFiles ?? []), { name: "editorial-planning-evidence.md", language: "markdown", code: `# Internal editorial planning evidence\n\n${row.evidence.detail}\n\nEvidence captured: ${row.evidence.capturedAt}. This brief explains the task; it is not approved product copy.`, placement: "Internal editorial handoff only. Do not publish this brief as shopper-facing content.", validation: "Review the source evidence and content decisions separately from the article before approving publication.", source: `plan-evidence:${row.id}` }] } : {}) }, result.value.revision);
        const latest = loadSearchPlan(brandId);
        if (latest.revision === revision)
            saveSearchPlan({ ...latest, revision: latest.revision + 1, rows: latest.rows.map((r) => r.id === id ? { ...r, artifactId: result.value.id, status: "drafting", updatedAt: new Date().toISOString() } : r) });
        revalidatePath("/seo", "layout");
        return { ok: true as const, id: result.value.id };
    }
    catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Unable to create draft." };
    }
}
