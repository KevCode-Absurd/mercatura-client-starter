"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveMediaModels } from "@/lib/media/chosen";
const Choice = z.object({ kind: z.enum(["image", "video", "quality"]), id: z.string().min(1).max(120) });
type Result = {
    ok: true;
} | {
    ok: false;
    error: string;
};
export async function saveMediaModelAction(input: z.input<typeof Choice>): Promise<Result> {
    try {
        const p = Choice.parse(input);
        if (p.kind === "quality")
            saveMediaModels({ quality: z.enum(["medium", "high"]).parse(p.id) });
        else
            saveMediaModels({ [p.kind]: p.id });
        revalidatePath("/", "layout");
        return { ok: true };
    }
    catch (e) {
        return { ok: false, error: e instanceof z.ZodError ? "Choose a model from the list." : (e as Error).message };
    }
}
