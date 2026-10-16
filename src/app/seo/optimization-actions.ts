"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { buildPlanningSnapshot, emptyAudit } from "@/lib/seo/model";
import { draftOptimization, type OptimizationInput } from "@/lib/seo/optimization";
import { readFocusedAudit, saveArtifact } from "@/lib/seo/store";
import type { SeoArtifact } from "@/lib/seo/content";
export async function createOptimizationAction(brandId: string, input: OptimizationInput): Promise<{
    ok: true;
    value: SeoArtifact;
} | {
    ok: false;
    error: string;
}> {
    try {
        if (await activeBrandId() !== brandId)
            throw new Error("The active brand changed. Refresh this workspace.");
        const ctx = seoContext(brandId);
        const stored = readFocusedAudit(ctx);
        const current = stored?.snapshot.contextHash === ctx.contextHash && stored.audit.contextHash === ctx.contextHash ? stored : null;
        const snapshot = current?.snapshot ?? buildPlanningSnapshot(ctx);
        const audit = current?.audit ?? emptyAudit(ctx);
        const draft = draftOptimization(ctx, snapshot, audit, input);
        const at = new Date().toISOString();
        const artifact: SeoArtifact = { ...draft, id: randomUUID(), brandId, contextHash: ctx.contextHash, status: "draft", revision: 1, mode: "live", createdAt: at, updatedAt: at, history: [{ at, message: "Human-supplied optimization draft created from shared Brand Brain and current page evidence. Awaiting review; nothing published." }] };
        saveArtifact(artifact);
        revalidatePath("/seo", "layout");
        return { ok: true, value: artifact };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Unable to prepare the optimization package." };
    }
}
