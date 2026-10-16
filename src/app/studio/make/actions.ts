"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { startMake } from "@/lib/make";
import { LENGTH_PRESETS } from "@/lib/taxonomy";
import { tasteSchema } from "@/lib/taste/schema";
import { errorText } from "@/lib/plain-message";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const fail = (e: unknown): {
    ok: false;
    error: string;
} => ({ ok: false, error: errorText(e) });
const Make = z.object({
    workflow: z.enum(["guided", "automatic"]).optional(),
    formatId: z.string().min(1).max(40),
    productId: z.string().max(80).nullable(),
    personaId: z.string().max(80).nullable(),
    offerId: z.string().max(80).nullable(),
    conceptId: z.string().max(80).nullable(),
    brief: z.string().max(1200),
    length: z.enum(LENGTH_PRESETS),
    claimChecks: z.boolean().optional(),
    hooks: z.number().int().min(1).max(5).optional(),
    variety: z.number().int().min(1).max(5).optional(),
    taste: tasteSchema.optional(),
    avatarId: z.string().regex(/^ava_[a-z0-9_]{1,40}$/).nullable().optional(),
});
export async function startMakeAction(input: z.input<typeof Make>): Promise<Result<{
    said: string;
    jobId: string | null;
}>> {
    try {
        const r = Make.parse(input);
        const made = startMake(await activeBrandId(), r);
        revalidatePath("/production");
        revalidatePath("/scripts");
        return { ok: true, said: made.said, jobId: made.jobId };
    }
    catch (e) {
        return fail(e);
    }
}
