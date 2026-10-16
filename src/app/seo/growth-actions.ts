"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { buildPlanningSnapshot, emptyAudit } from "@/lib/seo/model";
import { growthPriorities } from "@/lib/seo/priorities";
import { growthBrief, growthId, initialGrowthRows, validateGrowthInput, type GrowthInput } from "@/lib/seo/growth";
import { loadGrowth, saveGrowth } from "@/lib/seo/growth-store";
import { listArtifacts, listVisibilityRuns, readFocusedAudit, saveArtifact } from "@/lib/seo/store";
import { loadMeasurement } from "@/lib/seo/measurement-store";
import { loadSearchPlan } from "@/lib/seo/planning-store";
async function current(brandId: string, hash: string, revision: number) {
    if (await activeBrandId() !== brandId)
        throw new Error("The active brand changed. Refresh this workspace.");
    z.number().int().nonnegative().parse(revision);
    const ctx = seoContext(brandId), data = loadGrowth(brandId);
    if (ctx.contextHash !== hash)
        throw new Error("Brand Brain changed. Refresh before saving work.");
    if (data.revision !== revision)
        throw new Error("The growth plan changed in another view. Refresh before saving.");
    return { ctx, data };
}
export async function initializeGrowthAction(brandId: string, hash: string, revision: number) {
    try {
        const { ctx, data } = await current(brandId, hash, revision);
        if (data.rows.length < 15)
            saveGrowth({ ...data, revision: data.revision + 1, rows: initialGrowthRows(ctx, data, new Date().toISOString()) });
        revalidatePath("/seo", "layout");
        return { ok: true as const };
    }
    catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Unable to prepare the work plan." };
    }
}
export async function saveGrowthAction(brandId: string, hash: string, revision: number, id: string, input: GrowthInput) {
    try {
        const { ctx, data } = await current(brandId, hash, revision), priorityId = growthId(id), parsed = validateGrowthInput(input), at = new Date().toISOString();
        const rows = initialGrowthRows(ctx, data, at), old = rows.find((r) => r.id === priorityId)!;
        const row = { ...parsed, id: priorityId, contextHash: hash, updatedAt: at, ...(old.contextHash === hash && old.packageId ? { packageId: old.packageId } : {}), ...(parsed.status === "verified" ? { verifiedAt: at } : {}) };
        saveGrowth({ ...data, revision: data.revision + 1, rows: rows.map((r) => r.id === priorityId ? row : r) });
        revalidatePath("/seo", "layout");
        return { ok: true as const };
    }
    catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Unable to save this priority." };
    }
}
export async function prepareGrowthBriefsAction(brandId: string, hash: string, revision: number, ids: string[]) {
    try {
        const { ctx, data } = await current(brandId, hash, revision);
        const selected = [...new Set(z.array(z.string()).min(1).max(15).parse(ids).map(growthId))];
        const at = new Date().toISOString(), rows = initialGrowthRows(ctx, data, at), artifacts = listArtifacts(brandId), stored = readFocusedAudit(ctx);
        const saved = stored?.audit.contextHash === hash && stored.snapshot.contextHash === hash ? stored : null;
        const input = { ctx, snapshot: saved?.snapshot ?? buildPlanningSnapshot(ctx), audit: saved?.audit ?? emptyAudit(ctx), artifacts, runs: listVisibilityRuns(brandId), measurement: loadMeasurement(brandId), plan: loadSearchPlan(brandId) };
        let created = 0;
        for (const row of rows.filter((r) => selected.includes(r.id))) {
            if (row.contextHash === hash && artifacts.some((a) => a.id === row.packageId && a.brandId === brandId && a.contextHash === hash))
                continue;
            const p = growthPriorities.find((p) => p.id === row.id)!;
            const packageId = randomUUID();
            saveArtifact({ id: packageId, brandId, contextHash: hash, kind: "fix", title: p.title, keyword: "", productId: null, targetUrl: ctx.websiteUrl ?? "", description: p.why, body: growthBrief(input, row.id, row), sourceIds: [`growth:${row.id}`, `brand:${brandId}`], status: "draft", revision: 1, mode: "live", createdAt: at, updatedAt: at, history: [{ at, message: "Growth work brief prepared from current shared context and available evidence. Human implementation required." }] });
            if (row.contextHash !== hash) {
                row.status = "planned";
                row.completedSteps = [];
                row.verification = "";
                row.evidenceUrl = "";
                delete row.verifiedAt;
            }
            row.contextHash = hash;
            row.packageId = packageId;
            row.updatedAt = at;
            created++;
        }
        if (created || data.rows.length !== rows.length)
            saveGrowth({ ...data, revision: data.revision + 1, rows });
        revalidatePath("/seo", "layout");
        return { ok: true as const, created };
    }
    catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Unable to prepare handoffs." };
    }
}
