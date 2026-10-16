"use server";
import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { approveBriefPlan, generateBriefPlan, prepareBriefVariant, saveBriefPlan, reviseBriefPlan, reviseBriefConcept } from "@/lib/creative-briefs";
import { errorText } from "@/lib/plain-message";
async function owned(brandId: string) {
    if (await activeBrandId() !== brandId)
        throw new Error("The active brand changed. Reopen this brief for the current brand.");
}
export async function generateBriefAction(brandId: string, setup: unknown) {
    try {
        await owned(brandId);
        const draft = await generateBriefPlan(brandId, setup);
        revalidatePath("/studio/brief");
        return { ok: true as const, draft };
    }
    catch (e) {
        return { ok: false as const, error: errorText(e) };
    }
}
export async function saveBriefAction(brandId: string, id: string, plan: unknown) {
    try {
        await owned(brandId);
        const draft = saveBriefPlan(brandId, id, plan);
        revalidatePath("/studio/brief");
        return { ok: true as const, draft };
    }
    catch (e) {
        return { ok: false as const, error: errorText(e) };
    }
}
export async function approveBriefAction(brandId: string, id: string, plan: unknown, indexes: number[], edit?: {
    setup: unknown;
    updatedAt: string;
}) {
    try {
        await owned(brandId);
        const { getBriefPlan } = await import("@/lib/creative-brief-store");
        const existing = getBriefPlan(brandId, id);
        if (!existing?.approved_ids.length) {
            if (edit)
                reviseBriefPlan(brandId, id, plan, edit.setup, edit.updatedAt);
            else
                saveBriefPlan(brandId, id, plan);
        }
        const ids = approveBriefPlan(brandId, id, indexes);
        for (const path of ["/concepts", "/studio", "/studio/brief", "/"])
            revalidatePath(path);
        return { ok: true as const, ids };
    }
    catch (e) {
        return { ok: false as const, error: errorText(e) };
    }
}
export async function prepareBriefVariantAction(brandId: string, conceptId: string, index: number, revision?: number) {
    try {
        await owned(brandId);
        const concept = prepareBriefVariant(brandId, conceptId, index, revision);
        revalidatePath("/concepts");
        return { ok: true as const, concept };
    }
    catch (e) {
        return { ok: false as const, error: errorText(e) };
    }
}
export async function reviseBriefAction(brandId: string, id: string, plan: unknown, setup: unknown, updatedAt: string) {
    try {
        await owned(brandId);
        const draft = reviseBriefPlan(brandId, id, plan, setup, updatedAt);
        for (const path of ["/concepts", "/studio/brief", "/studio"])
            revalidatePath(path);
        return { ok: true as const, draft };
    }
    catch (e) {
        return { ok: false as const, error: errorText(e) };
    }
}
export async function reviseConceptBriefAction(brandId: string, id: string, concept: unknown, revision: number) {
    try {
        await owned(brandId);
        const brief = reviseBriefConcept(brandId, id, concept, revision);
        for (const path of ["/concepts", "/studio/brief", "/studio"])
            revalidatePath(path);
        return { ok: true as const, brief };
    }
    catch (e) {
        return { ok: false as const, error: errorText(e) };
    }
}
