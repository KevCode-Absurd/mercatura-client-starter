"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { buildPlanningSnapshot, type SeoSnapshot } from "@/lib/seo/model";
import { buildLiveSnapshot, runLiveAudit } from "@/lib/seo/live";
import { contentChecks, draftBlog, draftFix, exportPackage, slug, type SeoArtifact, type ArtifactStatus } from "@/lib/seo/content";
import { listArtifacts, readArtifact, readFocusedAudit, saveArtifact, saveAudit, toggleSeoLesson, listVisibilityRuns, saveVisibilityRun } from "@/lib/seo/store";
import { seoLessons } from "@/lib/seo/lessons";
import { seoGuides } from "@/lib/seo/curriculum/catalog";
import { codeForRule } from "@/lib/seo/code";
import { runVisibilityAudit, visibilityRunning, requestVisibilityStop } from "@/lib/seo/visibility-runner";
import { visibilityConnection } from "@/lib/seo/visibility-provider";
import { diagnoseFinding, diagnosisCodeFiles, diagnosisMarkdown } from "@/lib/seo/diagnostics";
import { buildVisibilityPrompts, defaultVisibilityModelIds, defaultVisibilityPromptIds } from "@/lib/seo/visibility";
import { visibilityQueued } from "@/lib/seo/visibility-jobs";
import { hasStoredBlogEvidence, markEditedBlogBrief, reviewStoredBlogEvidence } from "@/lib/seo/editorial-handoff";
import { assertArticleResourcesCurrent } from "@/lib/seo/article-resource-handoff";
type Result<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: string;
};
async function act<T>(brandId: string, fn: (ctx: ReturnType<typeof seoContext>) => T | Promise<T>): Promise<Result<T>> {
    try {
        if (await activeBrandId() !== brandId)
            throw new Error("The active brand changed. Refresh this workspace before continuing.");
        const value = await fn(seoContext(brandId));
        revalidatePath("/seo", "layout");
        revalidatePath("/landing", "layout");
        return { ok: true, value };
    }
    catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Unable to save. Please try again." };
    }
}
const running = new Map<string, Promise<SeoSnapshot>>();
export async function runSeoAuditAction(brandId: string, backgroundVisibility = false) {
    return act(brandId, async (ctx) => {
        z.boolean().parse(backgroundVisibility);
        if (!ctx.websiteUrl)
            throw new Error("Add the store website in the shared Brand Brain before running an audit.");
        if (running.has(brandId) || visibilityRunning(brandId) || visibilityQueued.has(brandId))
            throw new Error("An audit is already running for this brand. Wait for it to finish, then refresh.");
        const job = buildLiveSnapshot(ctx, { maxPages: 250, maxDurationMs: 180000 });
        running.set(brandId, job);
        try {
            const snapshot = await job;
            if (seoContext(brandId).contextHash !== ctx.contextHash)
                throw new Error("Brand Brain changed during this audit. Run it again using the updated store context.");
            snapshot.opportunities = buildPlanningSnapshot(ctx).opportunities;
            const audit = runLiveAudit(ctx, snapshot);
            saveAudit(brandId, audit, snapshot);
            let visibility: "completed" | "partial" | "failed" | "unavailable" | "running" = "unavailable";
            let visibilityReason = visibilityConnection().reason;
            if (visibilityConnection().available) {
                try {
                    if (backgroundVisibility) {
                        running.delete(brandId);
                        queueVisibilityAudit(ctx, { repeats: 1, locale: ctx.market || "Not specified" });
                        visibility = "running";
                        visibilityReason = "The buyer-journey scan is collecting in the background. Open AEO or GEO for progress.";
                    }
                    else {
                        const result = await runVisibilityAudit(ctx, { repeats: 1, locale: ctx.market || "Not specified" });
                        visibility = result.status === "running" ? "partial" : result.status;
                        visibilityReason = `${result.observations.filter((o) => o.status === "completed").length} of ${result.plannedResponses} engine responses collected.`;
                    }
                }
                catch (error) {
                    visibility = "failed";
                    visibilityReason = error instanceof Error ? error.message : "Engine responses could not be collected.";
                }
            }
            return { mode: audit.mode, brandId, pages: snapshot.pages.length, findings: audit.findings.length, visibility, visibilityReason };
        }
        finally {
            running.delete(brandId);
        }
    });
}
const visibilityOptions = z.object({ repeats: z.union([z.literal(1), z.literal(2)]), locale: z.string().trim().min(2).max(100), modelIds: z.array(z.string().max(100)).min(1).max(3).optional(), promptIds: z.array(z.string().max(100)).min(1).max(40).optional() });
type VisibilityOptions = z.infer<typeof visibilityOptions>;
export async function runSeoVisibilityAction(brandId: string, input: VisibilityOptions) {
    return act(brandId, async (ctx) => {
        const options = visibilityOptions.parse(input);
        if (running.has(brandId) || visibilityQueued.has(brandId))
            throw new Error("An audit is already running. Wait for it to finish.");
        const run = await runVisibilityAudit(ctx, options);
        return { id: run.id, status: run.status, completed: run.observations.filter((o) => o.status === "completed").length, total: run.plannedResponses };
    });
}
export async function beginSeoVisibilityAction(brandId: string, input: VisibilityOptions) {
    return act(brandId, (ctx) => queueVisibilityAudit(ctx, input));
}
function queueVisibilityAudit(ctx: ReturnType<typeof seoContext>, input: VisibilityOptions) {
    const brandId = ctx.brandId;
    const options = visibilityOptions.parse(input), connection = visibilityConnection();
    if (!connection.available || !ctx.websiteUrl)
        throw new Error(connection.available ? "Add the shared brand website first." : connection.reason);
    if (running.has(brandId) || visibilityRunning(brandId) || visibilityQueued.has(brandId))
        throw new Error("An audit is already running for this brand.");
    const models = connection.models ?? [{ id: connection.model, available: connection.available }];
    const modelIds = options.modelIds ?? defaultVisibilityModelIds(models);
    if (!modelIds.length || new Set(modelIds).size !== modelIds.length || modelIds.some((id) => !models.some((m) => m.id === id && m.available)))
        throw new Error("Choose configured models from this workspace.");
    const prompts = buildVisibilityPrompts(ctx), promptIds = options.promptIds ?? defaultVisibilityPromptIds(prompts);
    if (!promptIds.length || new Set(promptIds).size !== promptIds.length || promptIds.some((id) => !prompts.some((p) => p.id === id)))
        throw new Error("Choose buyer queries from the current Brand Brain plan.");
    const id = randomUUID();
    visibilityQueued.set(brandId, id);
    try {
        saveVisibilityRun({ id, brandId, contextHash: ctx.contextHash, startedAt: new Date().toISOString(), completedAt: "", locale: options.locale, status: "running", plannedResponses: modelIds.length * promptIds.length * options.repeats, observations: [], costUsd: 0, modelIds, promptIds });
        after(async () => {
            try {
                if (visibilityQueued.get(brandId) !== id)
                    return;
                await runVisibilityAudit(ctx, { ...options, modelIds, promptIds, runId: id });
            }
            catch {
                const saved = listVisibilityRuns(brandId).find((r) => r.id === id);
                if (saved?.status === "running")
                    saveVisibilityRun({ ...saved, status: saved.observations.some((o) => o.status === "completed") ? "partial" : "failed", completedAt: new Date().toISOString() });
            }
            finally {
                if (visibilityQueued.get(brandId) === id)
                    visibilityQueued.delete(brandId);
            }
        });
        return { id };
    }
    catch (error) {
        visibilityQueued.delete(brandId);
        throw error;
    }
}
export async function stopSeoVisibilityAction(brandId: string) {
    return act(brandId, () => {
        if (visibilityRunning(brandId))
            return { stopping: requestVisibilityStop(brandId) };
        const id = visibilityQueued.get(brandId);
        visibilityQueued.delete(brandId);
        const saved = id ? listVisibilityRuns(brandId).find((r) => r.id === id) : null;
        if (saved?.status === "running")
            saveVisibilityRun({ ...saved, status: "failed", completedAt: new Date().toISOString() });
        return { stopping: Boolean(id) };
    });
}
export async function recordSeoFactReviewAction(brandId: string, runId: string, observationId: string, input: {
    status: "verified" | "discrepancy" | "unverified";
    note: string;
    sourceUrl: string;
}) {
    return act(brandId, (ctx) => {
        const review = z.object({ status: z.enum(["verified", "discrepancy", "unverified"]), note: z.string().trim().min(20).max(4000), sourceUrl: z.url({ protocol: /^https?$/ }).max(2000) }).parse(input);
        const source = new URL(review.sourceUrl);
        if (source.username || source.password)
            throw new Error("Use a public evidence link without credentials.");
        const run = listVisibilityRuns(brandId).find((r) => r.id === runId);
        if (!run || run.contextHash !== ctx.contextHash)
            throw new Error("This response belongs to an older Brand Brain. Run a fresh visibility audit.");
        if (run.status === "running")
            throw new Error("Wait for response collection to finish before reviewing facts.");
        const observation = run.observations.find((o) => o.id === observationId && o.status === "completed");
        if (!observation)
            throw new Error("A completed response is required for fact review.");
        observation.factReview = { ...review, reviewedAt: new Date().toISOString() };
        saveVisibilityRun(run);
        return { id: observation.id, status: review.status };
    });
}
export async function createSeoArtifactAction(brandId: string, input: {
    opportunityId?: string;
    findingId?: string;
    keyword?: string;
    productId?: string;
}) {
    return act(brandId, (ctx) => {
        const parsed = z.object({ opportunityId: z.string().max(300).optional(), findingId: z.string().max(300).optional(), keyword: z.string().trim().min(3).max(180).optional(), productId: z.string().max(150).optional() }).parse(input);
        const saved = readFocusedAudit(ctx);
        const current = saved?.audit.mode === "live" && saved.audit.contextHash === ctx.contextHash ? saved : null;
        const snapshot = current?.snapshot ?? buildPlanningSnapshot(ctx);
        let draft: ReturnType<typeof draftBlog>;
        let codeFiles: ReturnType<typeof codeForRule> = [];
        if (parsed.findingId) {
            const review = current?.audit.checks.find((c) => c.id === parsed.findingId && c.status === "unknown" && ["SECURITY-HEADERS", "SEO-PRICE"].includes(c.ruleId));
            const finding = current?.audit.findings.find((f) => f.id === parsed.findingId) ?? (review ? { ...review, why: "This check needs human verification against the observed source and the actual storefront behavior.", remedy: "Review the evidence and prepare a scoped, verified change only if an issue is confirmed.", priority: "P2" as const, effort: "Medium" as const } : undefined);
            if (!finding)
                throw new Error("Finding no longer available. Run the audit again.");
            draft = draftFix(finding);
            const page = snapshot.pages.find((p) => p.url === finding.url);
            draft.productId = page?.productId ?? null;
            const diagnosis = diagnoseFinding(finding, page, ctx);
            draft.body = diagnosisMarkdown(finding, diagnosis);
            codeFiles = [...codeForRule(finding.ruleId), ...diagnosisCodeFiles(finding, diagnosis)];
        }
        else {
            const opportunity = parsed.opportunityId ? snapshot.opportunities.find((o) => o.id === parsed.opportunityId) : undefined;
            if (parsed.opportunityId && !opportunity)
                throw new Error("Keyword opportunity not found.");
            if (opportunity && opportunity.destination !== "blog")
                throw new Error("This intent belongs on a product or collection page. Choose a blog opportunity.");
            if (!opportunity && (!parsed.keyword || !ctx.products.some((p) => p.id === parsed.productId)))
                throw new Error("Enter a keyword and select a product from this brand.");
            draft = draftBlog(ctx, opportunity ?? { id: "custom", mode: "live", query: parsed.keyword!, productId: parsed.productId!, destination: "blog", targetUrl: `/blogs/guides/${slug(parsed.keyword!)}`, intent: "informational", monthlySearches: null, rationale: "User-selected topic; validate search intent before publishing." });
        }
        if (listArtifacts(brandId).length >= 500)
            throw new Error("This workspace supports up to 500 saved artifacts.");
        const at = new Date().toISOString();
        const artifact: SeoArtifact = { ...draft, codeFiles, id: randomUUID(), brandId, contextHash: ctx.contextHash, status: "draft", revision: 1, mode: "live", createdAt: at, updatedAt: at, history: [{ at, message: parsed.findingId ? `Created from live audit dated ${current?.at}. Human implementation required.` : "Created from shared Brand Brain. Editorial seed; search demand is unmeasured. Human review required." }] };
        saveArtifact(artifact);
        return artifact;
    });
}
export async function updateSeoArtifactAction(brandId: string, id: string, revision: number, input: {
    title: string;
    description: string;
    body: string;
}) {
    return act(brandId, () => {
        const patch = z.object({ title: z.string().trim().min(1).max(240), description: z.string().max(500), body: z.string().trim().min(1).max(100000) }).parse(input);
        const a = readArtifact(brandId, id);
        if (!a || a.revision !== revision)
            throw new Error("This draft changed or is unavailable. Reload it before saving.");
        const at = new Date().toISOString();
        const next: SeoArtifact = markEditedBlogBrief({ ...a, ...patch, ...(a.answerEntry ? { answerEntry: { ...a.answerEntry, tasks: a.answerEntry.tasks.map(t => ({ ...t, done: false })) } } : {}), revision: a.revision + 1, status: "draft", appliedUrl: undefined, verification: undefined, updatedAt: at, history: [...a.history, { at, message: "Edited; any previous approval applies only to the earlier revision. Answer-entry checklist records reset where applicable." }] }, a.body);
        saveArtifact(next, a.revision);
        return next;
    });
}
export async function advanceSeoArtifactAction(brandId: string, id: string, revision: number, status: ArtifactStatus, evidence?: string) {
    return act(brandId, async (ctx) => {
        const a = readArtifact(brandId, id);
        if (!a || a.revision !== revision)
            throw new Error("Draft unavailable or changed. Reload before continuing.");
        const transitions: Record<string, string[]> = { draft: ["approved"], approved: [], exported: ["applied"], applied: ["verified"], verified: [] };
        if (!transitions[a.status]?.includes(status))
            throw new Error("Complete the preceding review or handoff step first.");
        if (a.contextHash !== ctx.contextHash)
            throw new Error("Brand Brain changed. Create a fresh draft and review its facts.");
        if (contentChecks(a, ctx).blockers.length)
            throw new Error("Resolve the blocked content before proceeding.");
        const note = evidence?.trim().slice(0, 2000);
        if (status === "applied" && (!note || !z.url({ protocol: /^https?$/ }).safeParse(note).success))
            throw new Error("Enter the actual published page URL to record implementation.");
        if (status === "verified" && (!note || note.length < 20))
            throw new Error("Describe the fresh evidence you checked (at least 20 characters).");
        if (status === "approved")
            await assertArticleResourcesCurrent(a, ctx);
        if (await activeBrandId() !== brandId || seoContext(brandId).contextHash !== ctx.contextHash)
            throw new Error("The active brand or its context changed while checking sources. Refresh before continuing.");
        const currentArtifact = readArtifact(brandId, id);
        if (!currentArtifact || currentArtifact.revision !== a.revision || currentArtifact.status !== a.status)
            throw new Error("This draft changed while checking sources. Reload before continuing.");
        const at = new Date().toISOString();
        const next: SeoArtifact = { ...a, status, updatedAt: at, ...(status === "applied" ? { appliedUrl: note } : {}), ...(status === "verified" ? { verification: note } : {}), history: [...a.history, { at, message: status === "verified" ? `Human verification recorded: ${note}` : status === "applied" ? `Human reported implementation: ${note}` : "Human approved this revision for manual handoff." }] };
        saveArtifact(next, a.revision);
        return next;
    });
}
export async function exportSeoArtifactAction(brandId: string, id: string, revision: number) {
    return act(brandId, async (ctx) => {
        const a = readArtifact(brandId, id);
        if (!a || a.revision !== revision)
            throw new Error("Draft unavailable or changed. Reload before exporting.");
        const baseline = exportPackage(a, ctx), at = new Date().toISOString();
        await assertArticleResourcesCurrent(a, ctx);
        const current = hasStoredBlogEvidence(a) ? (await import("@/lib/standalone/store")).readEvidence(brandId) : [];
        const review = reviewStoredBlogEvidence(a, current, at);
        if (await activeBrandId() !== brandId || seoContext(brandId).contextHash !== ctx.contextHash)
            throw new Error("The active brand or its context changed while checking sources. Refresh before exporting.");
        const currentArtifact = readArtifact(brandId, id);
        if (!currentArtifact || currentArtifact.revision !== a.revision || currentArtifact.status !== a.status)
            throw new Error("This draft changed while checking sources. Reload before exporting.");
        const status = review.needsReview ? "draft" : a.status === "approved" ? "exported" : a.status;
        const next: SeoArtifact = { ...review.artifact, status, updatedAt: at, history: [...a.history, { at, message: review.needsReview ? "Evidence sources changed after the saved provider packet. Prior approval invalidated; this historical export needs source review before implementation." : "Manual export prepared. No store changes made." }] };
        saveArtifact(next, a.revision);
        return { ...baseline, artifact: next, evidenceReview: review.evidenceReview, instructions: review.needsReview ? ["NEEDS SOURCE REVIEW: the saved evidence packet is stale. Compare the exact changed or expired sources and revise the affected wording before implementation.", ...baseline.instructions] : baseline.instructions, checks: { ...baseline.checks, notes: [...baseline.checks.notes, ...review.evidenceReview.warnings] } };
    });
}
export async function completeSeoLessonAction(brandId: string, lessonId: string) {
    return act(brandId, () => { if (![...seoLessons, ...seoGuides].some((l) => l.id === lessonId))
        throw new Error("Lesson not found."); toggleSeoLesson(brandId, lessonId); return true; });
}
