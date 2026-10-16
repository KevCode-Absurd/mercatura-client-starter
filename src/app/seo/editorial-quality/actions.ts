"use server";
import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { saveEditorialQuality } from "@/lib/seo/editorial-quality-store";
export async function saveEditorialQualityAction(brandId: string, contextHash: string, state: unknown, revision: number) {
    try {
        if (await activeBrandId() !== brandId)
            throw new Error("The active brand changed. Reload this workspace.");
        if (seoContext(brandId).contextHash !== contextHash)
            throw new Error("Brand Brain changed. Reload the current product context before saving.");
        if (!Number.isInteger(revision) || revision < 0)
            throw new Error("Invalid workspace revision.");
        const saved = saveEditorialQuality(brandId, state, revision);
        revalidatePath("/seo/editorial-quality");
        return { ok: true as const, value: saved };
    }
    catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Unable to save editorial work." };
    }
}
