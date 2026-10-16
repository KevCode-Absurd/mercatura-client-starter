"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { loadStrategy, saveStrategy } from "@/lib/seo/strategy-store";
import { validateStrategyRow, type SearchStrategy } from "@/lib/seo/strategy";
import { normalizeQuery } from "@/lib/seo/planning";
import { agentContentBrief, agentContentKinds, emptyAgentCommerce, validateAgentCheck, validateAgentExperiment, validateAgentTrial } from "@/lib/seo/agent-commerce";
const fail = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : "Unable to save agent shopping work." });
async function current(brandId: string, hash: string, revision: number) {
    if (await activeBrandId() !== brandId)
        throw new Error("Active brand changed. Refresh this page.");
    z.number().int().positive().parse(revision);
    const ctx = seoContext(brandId), strategy = loadStrategy(brandId);
    if (ctx.contextHash !== hash)
        throw new Error("Brand Brain changed. Refresh before saving.");
    if (!strategy)
        throw new Error("Start the agent shopping plan first.");
    if (strategy.revision !== revision)
        throw new Error("Strategy changed in another view. Refresh before saving.");
    return { ctx, strategy, data: strategy.agentCommerce ?? emptyAgentCommerce(), now: new Date().toISOString() };
}
function commit(strategy: SearchStrategy, hash: string, next: SearchStrategy) {
    db.transaction(() => {
        if (loadStrategy(strategy.brandId)?.revision !== strategy.revision)
            throw new Error("Strategy changed in another view. Refresh before saving.");
        saveStrategy({ ...next, contextHash: hash, revision: strategy.revision + 1 });
    });
    revalidatePath("/seo", "layout");
}
export async function saveAgentCheckAction(brandId: string, hash: string, revision: number, raw: unknown) {
    try {
        const { ctx, strategy, data, now } = await current(brandId, hash, revision), item = validateAgentCheck(ctx, raw, now);
        const checks = [...data.checks.filter(c => c.productId !== item.productId || c.gateId !== item.gateId), { ...item, contextHash: hash, savedAt: now }];
        commit(strategy, hash, { ...strategy, agentCommerce: { ...data, checks } });
        return { ok: true as const };
    }
    catch (e) {
        return fail(e);
    }
}
export async function createAgentExperimentAction(brandId: string, hash: string, revision: number, raw: unknown) {
    try {
        const { ctx, strategy, data, now } = await current(brandId, hash, revision), item = validateAgentExperiment(ctx, raw);
        if (data.experiments.length >= 100)
            throw new Error("This plan has reached its 100-experiment limit.");
        commit(strategy, hash, { ...strategy, agentCommerce: { ...data, experiments: [...data.experiments, { ...item, id: randomUUID(), contextHash: hash, createdAt: now }] } });
        return { ok: true as const };
    }
    catch (e) {
        return fail(e);
    }
}
export async function recordAgentImplementationAction(brandId: string, hash: string, revision: number, id: string) {
    try {
        const { strategy, data, now } = await current(brandId, hash, revision), experiment = data.experiments.find(e => e.id === id);
        if (!experiment || experiment.contextHash !== hash)
            throw new Error("Choose an experiment for the current brand facts.");
        if (experiment.changedAt)
            throw new Error("Implementation is already recorded; create a new experiment for another change.");
        if (data.trials.filter(t => t.experimentId === id && t.contextHash === hash && t.phase === "before" && t.status === "completed").length < experiment.repeats)
            throw new Error("Collect all planned successful baseline repeats before recording implementation.");
        commit(strategy, hash, { ...strategy, agentCommerce: { ...data, experiments: data.experiments.map(e => e.id === id ? { ...e, changedAt: now } : e) } });
        return { ok: true as const };
    }
    catch (e) {
        return fail(e);
    }
}
export async function saveAgentTrialAction(brandId: string, hash: string, revision: number, raw: unknown) {
    try {
        const { strategy, data, now } = await current(brandId, hash, revision);
        const id = z.object({ experimentId: z.string() }).parse(raw).experimentId, experiment = data.experiments.find(e => e.id === id);
        if (!experiment || experiment.contextHash !== hash)
            throw new Error("Choose an experiment for the current brand facts.");
        const trial = validateAgentTrial(experiment, raw, now);
        const old = data.trials.find(t => t.experimentId === id && t.phase === trial.phase && t.repeat === trial.repeat);
        if (old?.status === "completed")
            throw new Error("This repeat already has evidence. Use another repeat or a new experiment.");
        if (data.trials.length >= 2000 && !old)
            throw new Error("This plan has reached its observation limit.");
        commit(strategy, hash, { ...strategy, agentCommerce: { ...data, trials: [...data.trials.filter(t => t.id !== old?.id), { ...trial, id: old?.id ?? randomUUID(), contextHash: hash, savedAt: now }] } });
        return { ok: true as const };
    }
    catch (e) {
        return fail(e);
    }
}
export async function prepareAgentContentAction(brandId: string, hash: string, revision: number, productId: string, personaIndex: number, kind: string) {
    try {
        const { ctx, strategy } = await current(brandId, hash, revision);
        z.number().int().nonnegative().max(Math.max(0, ctx.personas.length - 1)).parse(personaIndex);
        const row = validateStrategyRow(ctx, agentContentBrief(ctx, productId, personaIndex, z.enum(agentContentKinds).parse(kind)));
        const existing = strategy.rows.find(r => r.contextHash === hash && r.productId === productId && normalizeQuery(r.keyword) === normalizeQuery(row.keyword));
        if (existing)
            return { ok: true as const, href: `/seo/strategy?id=${encodeURIComponent(existing.id)}#customer-map` };
        if (strategy.rows.length >= 500)
            throw new Error("The content strategy is full.");
        const id = randomUUID();
        commit(strategy, hash, { ...strategy, rows: [...strategy.rows, { ...row, id, contextHash: hash, origin: "Agent shopping · buyer decision brief; research required" }] });
        return { ok: true as const, href: `/seo/strategy?id=${encodeURIComponent(id)}#customer-map` };
    }
    catch (e) {
        return fail(e);
    }
}
