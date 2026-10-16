"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { PRODUCT_IN_PICTURE } from "@/lib/product-in-picture";
import { SCRIPT_MODELS } from "@/lib/reference-modes";
import { MAX_PICKS, MAX_VARIANTS, buildFromReferences, scriptsFromReference, type Built } from "@/lib/references/build";
import { compactTaste, tasteSchema } from "@/lib/taste/schema";
import { LENGTH_PRESETS } from "@/lib/taxonomy";
import { errorText } from "@/lib/plain-message";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const withTaste = <T extends {
    taste?: unknown;
}>(p: T) => ({ ...p, taste: compactTaste(p.taste as Parameters<typeof compactTaste>[0]) });
const Build = z.object({
    picks: z
        .array(z.object({ id: z.string().min(1).max(64), note: z.string().max(600), variants: z.number().int().min(1).max(MAX_VARIANTS), productId: z.string().max(80), personaId: z.string().max(80) }))
        .min(1)
        .max(MAX_PICKS),
    productId: z.string().min(1).max(80),
    offerId: z.string().max(80).optional(),
    aspects: z.array(z.string()).min(1).max(4).optional(),
    textOnImage: z.boolean(),
    feedCopy: z.boolean(),
    baseImage: z.boolean(),
    productInPicture: z.enum(PRODUCT_IN_PICTURE).optional(),
    notes: z.string().max(1200).optional(),
    claimChecks: z.boolean().optional(),
    hooks: z.number().int().min(1).max(5).optional(),
    variety: z.number().int().min(1).max(5).optional(),
    taste: tasteSchema.optional(),
});
export async function buildFromReferencesAction(input: z.input<typeof Build>): Promise<Result<Built>> {
    try {
        const built = buildFromReferences(await activeBrandId(), withTaste(Build.parse(input)));
        revalidatePath("/studio");
        revalidatePath("/scripts");
        return { ok: true, ...built };
    }
    catch (e) {
        return { ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check the build.") : errorText(e) };
    }
}
const FromReference = z.object({
    referenceId: z.string().min(1).max(64),
    mode: z.enum(["exact", "structure", "principles"]),
    personaId: z.string().max(80),
    offerId: z.string().max(80),
    note: z.string().max(600),
    count: z.number().int().min(1).max(MAX_VARIANTS),
    length: z.enum(LENGTH_PRESETS).optional(),
    productName: z.string().max(120).optional(),
    model: z.enum(SCRIPT_MODELS.map((m) => m.id) as [
        string,
        ...string[]
    ]).optional(),
    claimChecks: z.boolean().optional(),
    hooks: z.number().int().min(1).max(5).optional(),
    taste: tasteSchema.optional(),
});
export async function makeFromReferenceAction(input: z.input<typeof FromReference>): Promise<Result<{
    queued: number;
}>> {
    try {
        const made = scriptsFromReference(await activeBrandId(), withTaste(FromReference.parse(input)));
        revalidatePath("/scripts");
        revalidatePath("/concepts");
        return { ok: true, queued: made.queued };
    }
    catch (e) {
        return { ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check what you chose.") : errorText(e) };
    }
}
