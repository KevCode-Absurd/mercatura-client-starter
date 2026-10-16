"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { startFormat } from "@/lib/format-start";
import { PRODUCT_IN_PICTURE } from "@/lib/product-in-picture";
import { compactTaste, tasteSchema } from "@/lib/taste/schema";
import { errorText } from "@/lib/plain-message";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const Note = z.string().max(600).optional();
const Start = z.object({
    workflow: z.enum(["guided", "automatic"]).optional(),
    formatId: z.string().min(1).max(40),
    productId: z.string().min(1).max(80),
    personaId: z.string().max(80).nullable(),
    count: z.number().int().min(1).max(12),
    notes: z.object({ product: Note, buyer: Note, general: Note }),
    textOnImage: z.boolean(),
    feedCopy: z.boolean(),
    baseImage: z.boolean(),
    productInPicture: z.enum(PRODUCT_IN_PICTURE).optional(),
    also: z.boolean().optional(),
    claimChecks: z.boolean().optional(),
    length: z.string().max(8).optional(),
    offerId: z.string().max(80).optional(),
    angleId: z.string().max(80).optional(),
    hooks: z.number().int().min(1).max(5).optional(),
    variety: z.number().int().min(1).max(5).optional(),
    taste: tasteSchema.optional(),
    avatarId: z.string().regex(/^ava_[a-z0-9_]{1,40}$/).nullable().optional(),
    characterNotes: z.string().max(600).optional(),
    hyperreal: z.boolean().optional(),
});
export async function startFormatAction(input: z.input<typeof Start>): Promise<Result<{
    href: string;
    said: string;
}>> {
    try {
        const parsed = Start.parse(input);
        const started = startFormat(await activeBrandId(), { ...parsed, taste: compactTaste(parsed.taste) });
        revalidatePath("/studio");
        revalidatePath("/production");
        revalidatePath("/scripts");
        return { ok: true, ...started };
    }
    catch (e) {
        return { ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check the answers.") : errorText(e) };
    }
}
