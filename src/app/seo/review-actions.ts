"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { readArtifact, readFocusedAudit, listArtifacts, saveArtifact } from "@/lib/seo/store";
import { listResearch, saveResearch, listRendered, saveRendered } from "@/lib/seo/review-store";
import { fetchResearchPage, researchCapture } from "@/lib/seo/research";
import { reviewRenderedPage } from "@/lib/seo/rendered";
import { codeProposal, insertDraftLink } from "@/lib/seo/review-tools";
import { contentChecks, type SeoArtifact } from "@/lib/seo/content";
import { draftOptimization, optimizationInput, type OptimizationInput } from "@/lib/seo/optimization";
import { buildPlanningSnapshot, emptyAudit } from "@/lib/seo/model";
import { pageSpeedTarget } from "@/lib/seo/measurement";
async function current(brandId: string, hash: string) { if (await activeBrandId() !== brandId)
    throw new Error("The active brand changed. Refresh this workspace."); const ctx = seoContext(brandId); if (ctx.contextHash !== hash)
    throw new Error("Brand Brain changed. Refresh and review the current evidence."); return ctx; }
type Result<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: string;
};
async function result<T>(fn: () => Promise<T>): Promise<Result<T>> { try {
    return { ok: true, value: await fn() };
}
catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not complete the review." };
} }
export async function fetchArticleSourceAction(brandId: string, hash: string, url: string) { return result(async () => { const ctx = await current(brandId, hash); z.string().min(10).max(2000).parse(url); const capture = researchCapture(await fetchResearchPage(url), brandId, ctx.contextHash, url); await current(brandId, hash); saveResearch(capture); revalidatePath("/seo", "layout"); return capture; }); }
export async function savedResearchAction(brandId: string, hash: string) { return result(async () => { await current(brandId, hash); return listResearch(brandId).filter((s) => s.contextHash === hash); }); }
export async function renderedReviewAction(brandId: string, hash: string, url: string) { return result(async () => { const ctx = await current(brandId, hash), audit = readFocusedAudit(ctx); url = pageSpeedTarget(ctx, url, audit?.snapshot.pages.map((p) => p.url)); const value = await reviewRenderedPage(ctx, url); await current(brandId, hash); saveRendered(value); return value; }); }
export async function savedRenderedAction(brandId: string, hash: string) { return result(async () => { await current(brandId, hash); return listRendered(brandId).filter((s) => s.contextHash === hash); }); }
export async function saveCodeProposalAction(brandId: string, hash: string, findingId: string, sampleIndex: number, after: string, reason: string) {
    return result(async () => {
        const ctx = await current(brandId, hash), saved = readFocusedAudit(ctx), finding = saved?.audit.findings.find((f) => f.id === findingId), page = saved?.snapshot.pages.find((p) => p.url === finding?.url);
        if (!finding || !page)
            throw new Error("The captured finding is unavailable. Rerun the audit.");
        z.number().int().min(0).max(2).parse(sampleIndex);
        if (listArtifacts(brandId).length >= 500)
            throw new Error("The workspace already contains 500 artifacts.");
        const proposal = codeProposal(finding, page, sampleIndex, after, reason), at = new Date().toISOString();
        const fenced = (s: string) => `\n\n\`\`\`html\n${s.replace(/`{3,}/g, "[backticks]")}\n\`\`\``;
        const value: SeoArtifact = { id: randomUUID(), brandId, contextHash: hash, kind: "fix", title: finding.title, keyword: "", productId: page.productId, targetUrl: page.url, description: reason.trim().slice(0, 500),
            body: `# ${finding.title}\n\nTarget: ${page.url}\n\n## Before · captured response line ${proposal.line}${fenced(proposal.before)}\n\n## After · proposed replacement${fenced(proposal.after)}\n\n## Reason\n\n${proposal.reason}\n\n## Demonstrable difference\n\nExcerpt UTF-8 bytes: ${proposal.bytesBefore} → ${proposal.bytesAfter}. ${proposal.effect}\n\nCapture: ${proposal.capturedAt}\nSource SHA-256: ${proposal.sourceHash}\n\nLocate the actual template/app owner of this emitted snippet. This response-excerpt patch is for review only and cannot automatically install into a theme. No store edit or implementation test performed.`,
            sourceIds: [`finding:${finding.id}`, page.url], status: "draft", revision: 1, mode: "live", createdAt: at, updatedAt: at, history: [{ at, message: "Captured-source replacement proposed for human review. No store changed or tested." }],
            codeFiles: [{ name: "captured-response.patch", language: "diff", code: proposal.patch, placement: `Captured response excerpt at ${page.url}; line ${proposal.line}. Locate its real owner before adapting.`, validation: proposal.effect, source: page.url }, { name: "replacement-provenance.json", language: "json", code: JSON.stringify(proposal, null, 2), placement: "Internal developer evidence only.", validation: "Review exact source hash, scope and replacement before approval.", source: page.url }] };
        const checks = contentChecks(value, ctx);
        if (checks.blockers.length)
            throw new Error(checks.blockers.join(" "));
        saveArtifact(value);
        revalidatePath("/seo", "layout");
        return value;
    });
}
export async function createOptimizationBatchAction(brandId: string, hash: string, inputs: OptimizationInput[]) {
    return result(async () => {
        const ctx = await current(brandId, hash), parsed = z.array(optimizationInput).min(1).max(10).parse(inputs);
        if (parsed.some((p) => !["pdp", "collection"].includes(p.mode)))
            throw new Error("Batch review supports product and collection copy packages.");
        if (new Set(parsed.map((p) => p.targetUrl)).size !== parsed.length)
            throw new Error("Give each batch row a distinct target URL.");
        if (listArtifacts(brandId).length + parsed.length > 500)
            throw new Error("The batch exceeds the workspace's 500-artifact limit.");
        const saved = readFocusedAudit(ctx), snapshot = saved?.snapshot ?? buildPlanningSnapshot(ctx), audit = saved?.audit ?? emptyAudit(ctx), at = new Date().toISOString();
        const artifacts = parsed.map((input): SeoArtifact => ({ ...draftOptimization(ctx, snapshot, audit, input), id: randomUUID(), brandId, contextHash: hash, mode: "live", status: "draft", revision: 1, createdAt: at, updatedAt: at, history: [{ at, message: "Product-specific batch proposal saved after individual fact review; nothing installed." }] }));
        for (const artifact of artifacts)
            saveArtifact(artifact);
        revalidatePath("/seo", "layout");
        return artifacts;
    });
}
export async function insertArticleLinkAction(brandId: string, hash: string, artifactId: string, revision: number, anchor: string, url: string, occurrence: number) {
    return result(async () => {
        const ctx = await current(brandId, hash), previous = readArtifact(brandId, artifactId);
        if (!previous || previous.kind !== "blog" || previous.revision !== revision || previous.contextHash !== hash)
            throw new Error("Save your latest draft and refresh before inserting a link.");
        const body = insertDraftLink(ctx, previous.body, anchor, url, occurrence), destination = await fetchResearchPage(url);
        if (new URL(destination.url).hostname.replace(/^www\./, "") !== new URL(ctx.websiteUrl!).hostname.replace(/^www\./, ""))
            throw new Error("The destination redirects outside this store. Choose the final intended store URL.");
        await current(brandId, hash);
        if (readArtifact(brandId, artifactId)?.revision !== revision)
            throw new Error("The draft changed while checking the destination. Refresh it.");
        const checks = contentChecks({ ...previous, body }, ctx);
        if (checks.blockers.length)
            throw new Error(checks.blockers.join(" "));
        const at = new Date().toISOString(), next: SeoArtifact = { ...previous, body, revision: revision + 1, status: "draft", appliedUrl: undefined, verification: undefined, updatedAt: at, history: [...previous.history, { at, message: `Inserted exact article anchor “${anchor}” after checking a public HTML destination: ${destination.url}. Fresh approval required.` }], codeFiles: [...(previous.codeFiles ?? []).filter((f) => f.name !== `link-check-${revision + 1}.json`), { name: `link-check-${revision + 1}.json`, language: "json", code: JSON.stringify({ anchor, requestedUrl: url, finalUrl: destination.url, status: destination.status, checkedAt: at, scope: "Public HTML request and store destination validation. Does not validate product suitability or future availability." }, null, 2), placement: "Internal editorial link evidence only.", validation: "Recheck links before manual publication.", source: destination.url }] };
        saveArtifact(next);
        revalidatePath("/seo", "layout");
        revalidatePath("/landing", "layout");
        return next;
    });
}
