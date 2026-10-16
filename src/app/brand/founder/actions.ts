"use server";
import { revalidatePath } from "next/cache";
import { activeBrand } from "@/lib/brand-context";
import { syncFounderSource } from "@/lib/brand-sources";
import { saveFounderAnswer, writeFounderFile } from "@/lib/founder";
import { llmEnabled } from "@/lib/llm/gateway";
import { errorText } from "@/lib/plain-message";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
export async function saveFounderAnswerAction(questionId: string, answer: string, skipped: boolean): Promise<Result> {
    try {
        const row = await activeBrand();
        saveFounderAnswer(row.id, questionId, answer, skipped);
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
    revalidatePath("/brand");
    return { ok: true };
}
export async function writeFounderFileAction(): Promise<Result<{
    file: string;
}>> {
    try {
        const row = await activeBrand();
        const file = writeFounderFile(row);
        syncFounderSource(row.id, { extract: llmEnabled() });
        revalidatePath("/brand", "layout");
        revalidatePath("/sources");
        return { ok: true, file };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
