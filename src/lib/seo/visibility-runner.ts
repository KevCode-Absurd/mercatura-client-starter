import "server-only";
import { randomUUID } from "node:crypto";
import type { SeoContext } from "./model";
import { seoContext } from "./context";
import { analyzeVisibilityAnswer, buildVisibilityPrompts, defaultVisibilityModelIds, defaultVisibilityPromptIds, type VisibilityRun } from "./visibility";
import { searchVisibilityAnswer, visibilityConnection } from "./visibility-provider";
import { saveVisibilityRun } from "./store";
const registry = globalThis as unknown as {
    __seoVisibilityRunning?: Set<string>;
    __seoVisibilityStopped?: Set<string>;
};
const running = registry.__seoVisibilityRunning ??= new Set<string>();
const stopped = registry.__seoVisibilityStopped ??= new Set<string>();
export function visibilityRunning(brandId: string) { return running.has(brandId); }
export function requestVisibilityStop(brandId: string): boolean {
    if (!running.has(brandId))
        return false;
    stopped.add(brandId);
    return true;
}
export async function runVisibilityAudit(ctx: SeoContext, options: {
    repeats: 1 | 2;
    locale: string;
    modelIds?: string[];
    promptIds?: string[];
    runId?: string;
}): Promise<VisibilityRun> {
    const connection = visibilityConnection();
    if (!connection.available)
        throw new Error(connection.reason);
    if (![1, 2].includes(options.repeats))
        throw new Error("Choose one or two independent repetitions.");
    if (!options.locale.trim() || options.locale.length > 100)
        throw new Error("Choose a market/language label between 1 and 100 characters.");
    if (!ctx.websiteUrl)
        throw new Error("Add the store website to the shared Brand Brain first.");
    if (running.has(ctx.brandId))
        throw new Error("A visibility audit is already running for this brand.");
    const availableModels = connection.models ?? [{ id: connection.model, provider: "openai" as const, available: connection.available, reason: connection.reason, label: connection.model }];
    const selectedIds = options.modelIds ?? defaultVisibilityModelIds(availableModels);
    if (!selectedIds.length || new Set(selectedIds).size !== selectedIds.length || selectedIds.some((id) => !availableModels.some((model) => model.id === id && model.available)))
        throw new Error("Select one or more configured visibility models from the allowlist.");
    const models = selectedIds.map((id) => availableModels.find((model) => model.id === id)!);
    const allPrompts = buildVisibilityPrompts(ctx);
    if (options.promptIds && (!options.promptIds.length || new Set(options.promptIds).size !== options.promptIds.length || options.promptIds.some((id) => !allPrompts.some((prompt) => prompt.id === id))))
        throw new Error("Select valid, unique buyer queries from this brand's audit plan.");
    const promptIds = options.promptIds ?? defaultVisibilityPromptIds(allPrompts);
    const prompts = allPrompts.filter((prompt) => promptIds.includes(prompt.id));
    if (!prompts.length)
        throw new Error("Add the brand's product catalogue before auditing buyer discovery.");
    running.add(ctx.brandId);
    stopped.delete(ctx.brandId);
    const run: VisibilityRun = { id: options.runId ?? randomUUID(), brandId: ctx.brandId, contextHash: ctx.contextHash,
        startedAt: new Date().toISOString(), completedAt: "", locale: options.locale,
        status: "running", plannedResponses: prompts.length * models.length * options.repeats, observations: [], costUsd: 0,
        modelIds: selectedIds, promptIds: prompts.map((prompt) => prompt.id) };
    try {
        saveVisibilityRun(run);
        const jobs = Array.from({ length: options.repeats }, (_, index) => index + 1).flatMap((repeat) => prompts.flatMap((prompt) => models.map((model) => ({ repeat, prompt, model }))));
        let cursor = 0;
        let fatal: unknown = null;
        const worker = async () => {
            try {
                while (!fatal && cursor < jobs.length) {
                    if (stopped.has(ctx.brandId)) {
                        fatal = Object.assign(new Error("Stopped by you. Completed responses were saved; in-flight responses were allowed to finish."), { name: "RunStoppedError" });
                        break;
                    }
                    const { repeat, prompt, model } = jobs[cursor++];
                    if (seoContext(ctx.brandId).contextHash !== ctx.contextHash) {
                        fatal = new Error("Brand Brain changed during the visibility audit. Saved responses retain their original context; run a new audit.");
                        break;
                    }
                    try {
                        const response = await searchVisibilityAnswer(ctx.brandId, prompt.text, options.locale, model.id);
                        const analyzed = analyzeVisibilityAnswer(ctx, response.answer, response.citations);
                        if (response.citationAssessmentComplete === false && analyzed.storeCited !== true)
                            analyzed.storeCited = null;
                        run.costUsd += response.costUsd;
                        run.observations.push({ id: randomUUID(), prompt, provider: model.provider, model: response.model,
                            observedAt: new Date().toISOString(), locale: options.locale, repeat, status: "completed",
                            answer: response.answer, ...analyzed, citationAssessmentComplete: response.citationAssessmentComplete,
                            ...(response.searchQueries ? { searchQueries: response.searchQueries } : {}),
                            ...(response.retrievedSources ? { retrievedSources: response.retrievedSources } : {}),
                            ...(response.searchEntryPointHtml ? { searchEntryPointHtml: response.searchEntryPointHtml } : {}) });
                    }
                    catch (error) {
                        const billed = error as {
                            costUsd?: unknown;
                            costEstimated?: unknown;
                            name?: string;
                        } | null;
                        if (typeof billed?.costUsd === "number" && Number.isFinite(billed.costUsd) && billed.costUsd >= 0)
                            run.costUsd += billed.costUsd;
                        if (billed?.costEstimated === true)
                            run.costEstimated = true;
                        run.observations.push({ id: randomUUID(), prompt, provider: model.provider, model: model.id,
                            observedAt: new Date().toISOString(), locale: options.locale, repeat, status: "failed",
                            answer: "", citations: [], brandMentioned: null, storeCited: null,
                            error: error instanceof Error ? error.message : "The search provider could not complete this observation." });
                        if (billed?.name === "RunStoppedError")
                            fatal = error;
                    }
                    saveVisibilityRun(run);
                }
            }
            catch (error) {
                fatal ??= error;
                throw error;
            }
        };
        const workers = await Promise.allSettled(Array.from({ length: Math.min(3, jobs.length) }, () => worker()));
        const rejected = workers.find((worker) => worker.status === "rejected");
        if (rejected?.status === "rejected")
            throw rejected.reason;
        if (fatal)
            throw fatal;
        return run;
    }
    finally {
        const completed = run.observations.filter((o) => o.status === "completed").length;
        run.status = completed === run.plannedResponses ? "completed" : completed ? "partial" : "failed";
        run.completedAt = new Date().toISOString();
        try {
            saveVisibilityRun(run);
        }
        finally {
            running.delete(ctx.brandId);
            stopped.delete(ctx.brandId);
        }
    }
}
