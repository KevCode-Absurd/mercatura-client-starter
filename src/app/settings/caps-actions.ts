"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveSpendCaps, type SpendCaps } from "@/lib/spend-caps";
const Caps = z.object({ textUsd: z.number(), videoUsd: z.number(), images: z.number() });
type Result = {
    ok: true;
    caps: SpendCaps;
} | {
    ok: false;
    error: string;
};
const touch = () => revalidatePath("/", "layout");
export async function saveCapsAction(input: z.input<typeof Caps>): Promise<Result> {
    try {
        const caps = saveSpendCaps(Caps.parse(input));
        touch();
        return { ok: true, caps };
    }
    catch (e) {
        return { ok: false, error: e instanceof z.ZodError ? "Each cap has to be a number." : (e as Error).message };
    }
}
