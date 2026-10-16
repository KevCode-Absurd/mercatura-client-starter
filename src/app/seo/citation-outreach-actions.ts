"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { citationOpportunities, createCitationDraft, outreachEditSchema } from "@/lib/seo/citation-outreach";
import { listCitationDrafts, readCitationDraft, saveCitationDraft } from "@/lib/seo/citation-outreach-store";
import { inspectCitation } from "@/lib/seo/citation-inspection";
import { listVisibilityRuns } from "@/lib/seo/store";
async function context(brandId: string, contextHash: string) {
    if (await activeBrandId() !== brandId)
        throw new Error("The active brand changed. Refresh this workspace.");
    const ctx = seoContext(brandId);
    if (ctx.contextHash !== contextHash)
        throw new Error("Brand Brain changed. Refresh and run a new scan before changing outreach.");
    return ctx;
}
const refresh = () => revalidatePath("/seo", "layout");
const failure = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : "Unable to save outreach." });
export async function prepareCitationOutreachAction(brandId: string, contextHash: string, runId: string, sourceUrls?: string[]) {
    try {
        const ctx = await context(brandId, contextHash);
        const run = listVisibilityRuns(brandId).find(r => r.id === runId && r.brandId === brandId && r.contextHash === contextHash);
        if (!run || run.status === "running")
            throw new Error("Choose a finished scan for the current Brand Brain.");
        const opportunities = citationOpportunities(ctx, run);
        if (sourceUrls && (!Array.isArray(sourceUrls) || !sourceUrls.length || sourceUrls.length > 40 || new Set(sourceUrls).size !== sourceUrls.length || sourceUrls.some(url => !opportunities.some(s => s.url === url))))
            throw new Error("Choose valid cited pages from this scan.");
        const selected = sourceUrls ? opportunities.filter(s => sourceUrls.includes(s.url)) : opportunities.slice(0, 40);
        if (!selected.length)
            throw new Error("No third-party cited pages with assessed brand gaps in this scan.");
        const existing = listCitationDrafts(brandId), at = new Date().toISOString();
        const additions = selected.filter(s => !existing.some(d => d.runId === runId && d.source.url === s.url));
        if (existing.length + additions.length > 500)
            throw new Error("This workspace supports up to 500 saved outreach drafts.");
        const drafts = additions.map(s => createCitationDraft(ctx, run, s, randomUUID(), at));
        drafts.forEach(saveCitationDraft);
        refresh();
        return { ok: true as const, created: drafts.length };
    }
    catch (e) {
        return failure(e);
    }
}
export async function updateCitationOutreachAction(brandId: string, contextHash: string, id: string, revision: number, raw: unknown) {
    try {
        await context(brandId, contextHash);
        const patch = outreachEditSchema.parse(raw), draft = readCitationDraft(brandId, id);
        if (!draft || draft.brandId !== brandId || draft.contextHash !== contextHash || draft.revision !== revision)
            throw new Error("Draft changed or belongs to an older Brand Brain. Refresh before saving.");
        saveCitationDraft({ ...draft, ...patch, revision: draft.revision + 1, updatedAt: new Date().toISOString() });
        refresh();
        return { ok: true as const };
    }
    catch (e) {
        return failure(e);
    }
}
export async function inspectCitationOutreachAction(brandId: string, contextHash: string, id: string, revision: number) {
    try {
        const ctx = await context(brandId, contextHash), draft = readCitationDraft(brandId, id);
        if (!draft || draft.brandId !== brandId || draft.contextHash !== contextHash || draft.revision !== revision)
            throw new Error("Draft changed or is stale. Refresh before inspecting its source.");
        const inspection = await inspectCitation(ctx, draft.source.url);
        await context(brandId, contextHash);
        const current = readCitationDraft(brandId, id);
        if (!current || current.revision !== revision)
            throw new Error("Draft changed during inspection. Refresh and inspect again.");
        saveCitationDraft({ ...current, inspection, revision: current.revision + 1, updatedAt: new Date().toISOString() });
        refresh();
        return { ok: true as const };
    }
    catch (e) {
        return failure(e);
    }
}
