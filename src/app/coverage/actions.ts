"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { MAX_BRIEFS, startBriefs } from "@/lib/coverage/start";
import { compactTaste, tasteSchema } from "@/lib/taste/schema";
import { AWARENESS_STAGES, LENGTH_PRESETS } from "@/lib/taxonomy";
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
const Brief = z.object({
    id: z.string().max(40),
    source: z.enum(["gap", "winner", "fix"]),
    part: z.enum(["opening", "body"]).optional(),
    from_ad: z.string().max(40).optional(),
    changes: z.string().max(300).optional(),
    persona_id: z.string().min(1).max(80),
    awareness: z.enum(AWARENESS_STAGES),
    sophistication: z.number().int().min(1).max(5),
    format: z.string().min(1).max(40),
    length: z.enum(LENGTH_PRESETS),
    offer_id: z.string().max(80).nullable(),
    angle: z.string().max(600),
    hook: z.string().max(300).optional(),
    fills: z.array(z.string().max(80)).max(20),
    why: z.array(z.string().max(400)).max(12),
});
const Write = z.object({ briefs: z.array(Brief).min(1).max(MAX_BRIEFS), produce: z.boolean(), taste: tasteSchema.optional(), claimChecks: z.boolean().optional(), hooks: z.number().int().min(1).max(5).optional() });
export async function writeBriefsAction(input: z.input<typeof Write>): Promise<Result<{
    said: string;
    scripts: number;
}>> {
    try {
        const r = Write.parse(input);
        const made = startBriefs(await activeBrandId(), r.briefs, { produce: r.produce, claimChecks: r.claimChecks, hooks: r.hooks, taste: compactTaste(r.taste) });
        revalidatePath("/coverage");
        revalidatePath("/scripts");
        revalidatePath("/concepts");
        if (r.produce)
            revalidatePath("/production");
        return { ok: true, said: made.said, scripts: made.scripts };
    }
    catch (e) {
        return fail(e);
    }
}
