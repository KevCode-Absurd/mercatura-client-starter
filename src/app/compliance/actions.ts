"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ComplianceCheckRow } from "@/db/schema";
import { activeBrandId } from "@/lib/brand-context";
import { assetFile, pieceOf, runCheck } from "@/lib/compliance/checks";
import { isVideoFile } from "@/lib/media/video-frames";
import { errorText } from "@/lib/plain-message";
type Result = {
    ok: true;
    check: ComplianceCheckRow;
} | {
    ok: false;
    error: string;
};
const fail = (e: unknown): {
    ok: false;
    error: string;
} => ({ ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check what you entered.") : errorText(e) });
const Words = z.object({ text: z.string().trim().min(8, "Paste the words of the ad first.").max(30000, "That is longer than an ad: paste up to 30,000 characters.") });
export async function checkWordsAction(input: z.input<typeof Words>): Promise<Result> {
    try {
        const { text } = Words.parse(input);
        const brandId = await activeBrandId();
        const check = await runCheck({ brandId, piece: { kind: "copy", text } });
        revalidatePath("/compliance");
        return { ok: true, check };
    }
    catch (e) {
        return fail(e);
    }
}
const Upload = z.object({ file: z.string().trim().min(1), name: z.string().trim().max(200).default("") });
export async function checkUploadAction(input: z.input<typeof Upload>): Promise<Result> {
    try {
        const { file, name } = Upload.parse(input);
        const brandId = await activeBrandId();
        if (!file.startsWith(`compliance/${brandId}/`))
            throw new Error("That file is not here any more.");
        const abs = assetFile(file);
        const check = await runCheck({ brandId, piece: isVideoFile(abs) ? { kind: "video", file: abs } : { kind: "image", file: abs }, ref: name || file });
        revalidatePath("/compliance");
        return { ok: true, check };
    }
    catch (e) {
        return fail(e);
    }
}
const Source = z.object({ kind: z.enum(["image", "script", "video"]), ref: z.string().trim().min(1) });
export async function checkSourceAction(input: z.input<typeof Source>): Promise<Result> {
    try {
        const { kind, ref } = Source.parse(input);
        const brandId = await activeBrandId();
        const { piece, productId, wroteWith } = pieceOf(brandId, kind, ref);
        const check = await runCheck({ brandId, piece, ref, productId, wroteWith });
        revalidatePath("/compliance");
        return { ok: true, check };
    }
    catch (e) {
        return fail(e);
    }
}
