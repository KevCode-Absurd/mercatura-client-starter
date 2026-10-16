"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { buildAnswerImplementation } from "@/lib/seo/answer-implementation";
import { listArtifacts, listVisibilityRuns, readArtifact, saveArtifact } from "@/lib/seo/store";
export async function prepareAnswerEntryAction(brandId: string, contextHash: string, raw: unknown) {
    try {
        if (await activeBrandId() !== brandId)
            throw new Error("The active brand changed. Refresh this workspace.");
        const ctx = seoContext(brandId);
        if (ctx.contextHash !== contextHash)
            throw new Error("Brand Brain changed. Refresh before preparing this brief.");
        if (listArtifacts(brandId).length >= 500)
            throw new Error("This workspace supports up to 500 saved artifacts.");
        const draft = buildAnswerImplementation(ctx, raw, listVisibilityRuns(brandId)), id = randomUUID(), at = new Date().toISOString();
        saveArtifact({ ...draft, id, brandId, contextHash, mode: "live", status: "draft", revision: 1, createdAt: at, updatedAt: at,
            history: [{ at, message: "Prepared from primary-source mechanisms and the human-selected diagnosis; no store changes applied." }] });
        revalidatePath("/seo", "layout");
        return { ok: true as const, id };
    }
    catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Unable to prepare the brief." };
    }
}
export async function setAnswerTaskAction(brandId: string, id: string, revision: number, taskId: string, done: boolean) {
    try {
        if (await activeBrandId() !== brandId)
            throw new Error("The active brand changed. Refresh this workspace.");
        if (typeof done !== "boolean" || typeof taskId !== "string")
            throw new Error("Invalid task update.");
        const ctx = seoContext(brandId), artifact = readArtifact(brandId, id);
        if (!artifact || artifact.brandId !== brandId || artifact.contextHash !== ctx.contextHash || artifact.revision !== revision)
            throw new Error("Package unavailable or changed. Refresh before tracking work.");
        if (!artifact.answerEntry?.tasks.some(t => t.id === taskId))
            throw new Error("Task does not belong to this package.");
        if (artifact.answerEntry.tasks.find(t => t.id === taskId)?.done === done)
            return { ok: true as const };
        const at = new Date().toISOString();
        saveArtifact({ ...artifact, updatedAt: at, answerEntry: { ...artifact.answerEntry, tasks: artifact.answerEntry.tasks.map(t => t.id === taskId ? { ...t, done } : t) }, history: [...artifact.history, { at, message: `Human work record: ${taskId} ${done ? "completed" : "reopened"}. Deployment and visibility are tracked separately.` }] }, artifact.revision);
        revalidatePath("/seo", "layout");
        return { ok: true as const };
    }
    catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Unable to update the task." };
    }
}
