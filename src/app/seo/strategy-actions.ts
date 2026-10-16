"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { readFocusedAudit, listVisibilityRuns } from "@/lib/seo/store";
import { buildPlanningSnapshot, emptyAudit } from "@/lib/seo/model";
import { loadMeasurement } from "@/lib/seo/measurement-store";
import { loadStrategy, saveStrategy } from "@/lib/seo/strategy-store";
import { buildStrategy, strategySeeds, strategyMetrics, researchLeads, validateStrategyRow, validateInitiative, defaultTargets, type StrategyRowInput, type StrategyInitiative } from "@/lib/seo/strategy";
import { loadSearchPlan, saveSearchPlan } from "@/lib/seo/planning-store";
import { normalizeQuery, validatePlanInput } from "@/lib/seo/planning";
const fail = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : "Unable to save strategy." });
const refresh = () => { revalidatePath("/seo", "layout"); revalidatePath("/landing", "layout"); };
async function current(brandId: string, hash: string, revision: number) {
    if (await activeBrandId() !== brandId)
        throw new Error("Active brand changed. Refresh this strategy.");
    z.number().int().nonnegative().parse(revision);
    const ctx = seoContext(brandId), data = loadStrategy(brandId);
    if (ctx.contextHash !== hash)
        throw new Error("Brand Brain changed. Refresh before editing.");
    if ((data?.revision ?? 0) !== revision)
        throw new Error("Strategy changed in another view. Refresh before saving.");
    return { ctx, data };
}
function evidence(ctx: ReturnType<typeof seoContext>) {
    const saved = readFocusedAudit(ctx);
    return { ctx, snapshot: saved?.snapshot ?? buildPlanningSnapshot(ctx), audit: saved?.audit ?? emptyAudit(ctx), measurement: loadMeasurement(ctx.brandId), runs: listVisibilityRuns(ctx.brandId) };
}
export async function buildSearchStrategyAction(brandId: string, hash: string, revision: number) {
    try {
        const { ctx, data } = await current(brandId, hash, revision);
        const input = evidence(ctx);
        if (!data)
            saveStrategy(buildStrategy(input, new Date().toISOString()));
        else {
            const added = strategySeeds(input).filter((seed) => !data.rows.some((r) => r.persona === seed.persona && normalizeQuery(r.keyword) === normalizeQuery(seed.keyword))).map((r) => ({ ...r, id: randomUUID() }));
            saveStrategy({ ...data, contextHash: hash, revision: data.revision + 1, rows: [...data.rows, ...added].slice(0, 500) });
        }
        refresh();
        return { ok: true as const };
    }
    catch (e) {
        return fail(e);
    }
}
export async function saveStrategyRowAction(brandId: string, hash: string, revision: number, id: string | null, raw: StrategyRowInput) {
    try {
        const { ctx, data } = await current(brandId, hash, revision);
        if (!data)
            throw new Error("Build the strategy first.");
        const input = validateStrategyRow(ctx, raw), previous = data.rows.find((r) => r.id === id);
        if (id && !previous)
            throw new Error("This opportunity no longer exists.");
        if (!id && data.rows.length >= 500)
            throw new Error("This strategy supports up to 500 opportunities.");
        const row = { ...input, id: id || randomUUID(), contextHash: hash, origin: previous?.origin ?? "User-added research question", ...(previous?.planId ? { planId: previous.planId } : {}) };
        saveStrategy({ ...data, revision: data.revision + 1, rows: id ? data.rows.map((r) => r.id === id ? row : r) : [...data.rows, row] });
        refresh();
        return { ok: true as const };
    }
    catch (e) {
        return fail(e);
    }
}
export async function captureStrategyBaselineAction(brandId: string, hash: string, revision: number) {
    try {
        const { ctx, data } = await current(brandId, hash, revision);
        if (!data)
            throw new Error("Build the strategy first.");
        const metrics = strategyMetrics(evidence(ctx));
        if (metrics.every((m) => m.value === null))
            throw new Error("Collect a website audit, search import or AI answer sample before capturing a measured baseline.");
        saveStrategy({ ...data, revision: data.revision + 1, previousBaselines: [data.baseline, ...(data.previousBaselines ?? [])].slice(0, 12), baseline: { contextHash: hash, capturedAt: new Date().toISOString(), metrics } });
        refresh();
        return { ok: true as const };
    }
    catch (e) {
        return fail(e);
    }
}
export async function saveStrategyTargetsAction(brandId: string, hash: string, revision: number, raw: Record<string, string>) {
    try {
        const { data } = await current(brandId, hash, revision);
        if (!data)
            throw new Error("Build the strategy first.");
        const parsed = z.record(z.string(), z.string().trim().min(10).max(1000)).parse(raw);
        const targets = Object.fromEntries(Object.keys(defaultTargets).map((key) => [key, parsed[key] || data.targets[key]]));
        saveStrategy({ ...data, revision: data.revision + 1, targets });
        refresh();
        return { ok: true as const };
    }
    catch (e) {
        return fail(e);
    }
}
export async function saveStrategyInitiativeAction(brandId: string, hash: string, revision: number, raw: StrategyInitiative) {
    try {
        const { data } = await current(brandId, hash, revision);
        if (!data)
            throw new Error("Build the strategy first.");
        const item = validateInitiative(raw);
        saveStrategy({ ...data, revision: data.revision + 1, initiatives: data.initiatives.map((r) => r.id === item.id ? { ...item, contextHash: hash } : r) });
        refresh();
        return { ok: true as const };
    }
    catch (e) {
        return fail(e);
    }
}
export async function handoffStrategyRowAction(brandId: string, hash: string, revision: number, id: string) {
    try {
        const { ctx, data } = await current(brandId, hash, revision);
        const row = data?.rows.find((r) => r.id === id);
        if (!data || !row || row.contextHash !== hash)
            throw new Error("Review and save this opportunity against the current Brand Brain first.");
        validateStrategyRow(ctx, row);
        if (row.format === "product-page")
            throw new Error("Improve the mapped product page in Page optimizer. Choose an editorial format only when the query needs a separate article.");
        const plan = loadSearchPlan(brandId);
        const linked = plan.rows.find((r) => r.id === row.planId);
        if (linked && linked.strategyRowId !== id)
            throw new Error("The linked content task changed. Review the search planner.");
        if (linked?.artifactId) {
            const old = linked.editorialBrief;
            if (linked.contextHash !== hash || linked.keyword !== row.keyword || linked.productId !== row.productId || linked.targetUrl !== row.targetUrl || old?.title !== row.title || old?.format !== row.format || old?.decision !== row.decision || old?.description !== row.description || old?.audience !== `${row.persona}: ${row.job}`.slice(0, 500) || JSON.stringify(old?.sections) !== JSON.stringify(row.sections))
                throw new Error("This brief changed after its article was drafted. Open the saved article in Articles & listicles and reconcile the research before creating another draft.");
            return { ok: true as const, href: `/landing/articles?id=${encodeURIComponent(linked.artifactId)}` };
        }
        if (!linked && plan.rows.length >= 500)
            throw new Error("The search plan is full.");
        if (plan.rows.some((r) => r.id !== linked?.id && normalizeQuery(r.keyword) === normalizeQuery(row.keyword)))
            throw new Error("This keyword already has a content task. Review it in Search planner before creating a competing page.");
        const planId = linked?.id ?? randomUUID();
        const leads = researchLeads(evidence(ctx), row).map((lead) => `${lead.title}: ${lead.url}\n${lead.reason}`).join("\n\n");
        const input = validatePlanInput(ctx, { keyword: row.keyword, intent: "informational", productId: row.productId, targetUrl: row.targetUrl, owner: row.owner, dueDate: "", status: "planned", taskType: row.taskType, notes: `${row.stage} · ${row.persona}\n${row.origin}\n${row.notes}\n\nResearch leads to review:\n${leads}`.slice(0, 4000) });
        const editorialBrief = { planId, keyword: row.keyword, productId: row.productId, targetUrl: row.targetUrl, audience: `${row.persona}: ${row.job}`.slice(0, 500), decision: row.decision, title: row.title, description: row.description, format: row.format, funnelStage: row.stage, sections: row.sections };
        db.transaction(() => {
            saveSearchPlan({ ...plan, revision: plan.revision + 1, rows: [...plan.rows.filter((r) => r.id !== planId), { ...input, id: planId, strategyRowId: id, contextHash: hash, updatedAt: new Date().toISOString(), editorialBrief }] });
            saveStrategy({ ...data, revision: data.revision + 1, rows: data.rows.map((r) => r.id === id ? { ...r, planId } : r) });
        });
        refresh();
        return { ok: true as const, href: `/landing/articles?planId=${encodeURIComponent(planId)}` };
    }
    catch (e) {
        return fail(e);
    }
}
