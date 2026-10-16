import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { generateCopy } from "@/lib/copy-builder/generate";
import { readRun, saveRun } from "@/lib/copy-builder/store";
import { CopyOutputSchema } from "@/lib/copy-builder/types";
import { sameOrigin } from "@/lib/copy-builder/http";
export const runtime = "nodejs";
export const maxDuration = 600;
export async function POST(req: Request) {
    if (!sameOrigin(req))
        return Response.json({ error: "Invalid origin." }, { status: 403 });
    try {
        return Response.json({ run: await generateCopy(await activeBrandId(), await req.json()) });
    }
    catch (e) {
        return Response.json({ error: e instanceof z.ZodError ? "Check the product, avatar, awareness stage and counts (1–10 each)." : e instanceof Error ? e.message : "Could not generate copy." }, { status: 400 });
    }
}
export async function PATCH(req: Request) {
    if (!sameOrigin(req))
        return Response.json({ error: "Invalid origin." }, { status: 403 });
    try {
        const brandId = await activeBrandId();
        const input = z.object({ brandId: z.string(), id: z.string().uuid(), output: CopyOutputSchema }).parse(await req.json());
        if (input.brandId !== brandId)
            throw new Error("The active brand changed. Reload before saving.");
        const run = readRun(brandId, input.id);
        if (input.output.primaryTexts.length !== run.request.primaryCount || input.output.headlines.length !== run.request.headlineCount)
            throw new Error("The number of alternatives cannot be changed while editing.");
        run.output = input.output;
        saveRun(brandId, run);
        return Response.json({ run });
    }
    catch {
        return Response.json({ error: "Could not save. Check for empty copy or reload the active brand." }, { status: 400 });
    }
}
