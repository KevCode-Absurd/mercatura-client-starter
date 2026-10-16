"use server";
import { activeBrandId } from "@/lib/brand-context";
import { LabDraftSchema, saveLab } from "@/lib/creative-lab/store";
import { loadBrandBrain } from "@/lib/brands";
import { proposePersuasionRepair, writeCutdown } from "@/lib/creative-lab/generation";
import { inspectDisplay } from "@/lib/creative-lab/display";
import { creativeLabData } from "@/lib/creative-lab/data";
export async function saveCreativeLab(input: unknown, expectedVersion: number) {
    const brandId = await activeBrandId();
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0)
        throw new Error("Invalid revision.");
    const productId = (input as {
        productId?: unknown;
    })?.productId;
    if (typeof productId !== "string" || !loadBrandBrain(brandId).products.some(p => p.id === productId))
        throw new Error("Choose a product belonging to this brand.");
    return saveLab(brandId, input, expectedVersion);
}
export async function rewriteCreativeCutdown(input: unknown, targetSeconds: number) {
    const brandId = await activeBrandId();
    const draft = LabDraftSchema.parse(input);
    if (![15, 30, 60].includes(targetSeconds))
        throw new Error("Choose a 15, 30 or 60 second cutdown.");
    if (!loadBrandBrain(brandId).products.some(p => p.id === draft.productId))
        throw new Error("Choose a product belonging to this brand.");
    return writeCutdown(brandId, draft, targetSeconds);
}
export async function inspectCreativeDisplay(input: unknown, width: number) {
    const brandId = await activeBrandId();
    const draft = LabDraftSchema.parse(input);
    if (!loadBrandBrain(brandId).products.some(p => p.id === draft.productId))
        throw new Error("Choose a product belonging to this brand.");
    return inspectDisplay(brandId, draft, width, creativeLabData(brandId).assets.map(a => a.url));
}
export async function diagnoseCreativePersuasion(input: unknown) {
    const brandId = await activeBrandId();
    const draft = LabDraftSchema.parse(input);
    if (!loadBrandBrain(brandId).products.some(p => p.id === draft.productId))
        throw new Error("Choose a product belonging to this brand.");
    return proposePersuasionRepair(brandId, draft);
}
