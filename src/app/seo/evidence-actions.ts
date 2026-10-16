"use server";
import { randomUUID, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { evidencePlan, type EvidenceChoice, type EvidenceSource } from "@/lib/seo/evidence-planning";
import { loadMeasurement } from "@/lib/seo/measurement-store";
import { loadSearchPlan, saveSearchPlan } from "@/lib/seo/planning-store";
import { internalLinkOpportunities } from "@/lib/seo/planning";
import { listArtifacts, listVisibilityRuns, readFocusedAudit, saveArtifact } from "@/lib/seo/store";
async function context(brandId: string, hash: string) {
    if (await activeBrandId() !== brandId)
        throw new Error("Active brand changed. Refresh this workspace.");
    const ctx = seoContext(brandId);
    if (ctx.contextHash !== hash)
        throw new Error("Brand Brain changed. Refresh and review the evidence.");
    return ctx;
}
export async function createEvidencePlanAction(brandId: string, hash: string, source: EvidenceSource, choice: EvidenceChoice) {
    try {
        const ctx = await context(brandId, hash);
        const resolved = evidencePlan(ctx, source, choice, loadMeasurement(brandId), listVisibilityRuns(brandId));
        const data = loadSearchPlan(brandId);
        const existing = data.rows.find((r) => r.contextHash === hash && r.evidence?.key === resolved.evidence.key);
        if (existing)
            return { ok: true as const, id: existing.id, existing: true };
        if (data.rows.length >= 500)
            throw new Error("This plan supports up to 500 tasks.");
        const id = randomUUID();
        if (loadSearchPlan(brandId).revision !== data.revision)
            throw new Error("The plan changed. Refresh and try again.");
        saveSearchPlan({ ...data, revision: data.revision + 1, rows: [...data.rows, { ...resolved.input, evidence: resolved.evidence, id, contextHash: hash, updatedAt: new Date().toISOString() }] });
        revalidatePath("/seo", "layout");
        return { ok: true as const, id, existing: false };
    }
    catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Unable to create the evidence task." };
    }
}
export async function createInternalLinkHandoffAction(brandId: string, hash: string, observedAt: string, sourceUrl: string, destinationUrl: string) {
    try {
        const ctx = await context(brandId, hash), saved = readFocusedAudit(ctx);
        if (!saved || saved.snapshot.observedAt !== observedAt)
            throw new Error("The crawl changed. Refresh and review the current link suggestion.");
        const link = internalLinkOpportunities(ctx, saved.snapshot).find((l) => l.sourceUrl === sourceUrl && l.destinationUrl === destinationUrl);
        if (!link)
            throw new Error("This pair is not an eligible link suggestion in the current crawl.");
        const sourceId = `internal-link:${createHash("sha256").update(JSON.stringify([hash, observedAt, sourceUrl, destinationUrl])).digest("hex")}`;
        const artifacts = listArtifacts(brandId), existing = artifacts.find((a) => a.contextHash === hash && a.sourceIds.includes(sourceId));
        if (existing)
            return { ok: true as const, id: existing.id, existing: true };
        if (artifacts.length >= 500)
            throw new Error("This workspace supports up to 500 saved artifacts.");
        const body = [`# Internal link placement review`, `Source: ${link.sourceUrl}`, `Destination: ${link.destinationUrl}`, `Observed: ${link.observedAt}`, "## Before: captured crawl evidence", "The inspected source HTML did not contain a link to this destination. This does not establish a whole-site orphan or inspect JavaScript-only links.", link.reason, "## Recommended change", `Review the source text and add one useful contextual link where a shopper would benefit. Suggested anchor: ${link.anchor}. Do not add an unrelated or hidden link.`, "## Proposed after", "```html", link.html, "```", "## Developer placement", "Locate the matching page or theme section in the actual store source. Exact theme filenames and line numbers have not been inspected. This snippet is a proposal, not an applied patch.", "## Acceptance checks", "Check the destination is still live, indexable and canonical. Confirm the link appears once in rendered page content, has useful anchor text, works on mobile and does not interrupt buying. Re-crawl to verify it is observed.", "## Rollback", "Keep the prior section revision; remove the inserted link or restore that revision if placement or the purchase journey regresses."].join("\n\n");
        const at = new Date().toISOString(), id = randomUUID();
        saveArtifact({ id, brandId, contextHash: hash, kind: "fix", title: `Internal link: ${link.anchor}`.slice(0, 240), keyword: "", productId: null, targetUrl: link.sourceUrl, description: "Crawl-grounded link placement handoff for human review.", body, sourceIds: [sourceId], status: "draft", revision: 1, mode: "live", createdAt: at, updatedAt: at, history: [{ at, message: "Prepared a link placement proposal from inspected HTML. No store changes applied." }], codeFiles: [{ name: "proposed-link.html", language: "html", code: link.html, validation: "Confirm the rendered link is useful, resolves correctly and is found by a fresh crawl. Restore the prior section to roll back.", source: link.sourceUrl, placement: "Review the relevant source page or theme section before inserting this contextual link." }] });
        revalidatePath("/seo", "layout");
        return { ok: true as const, id, existing: false };
    }
    catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Unable to prepare link handoff." };
    }
}
