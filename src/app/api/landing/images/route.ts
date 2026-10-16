import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { sameOrigin } from "@/lib/copy-builder/http";
import { captureEvidence, discoverPages } from "@/lib/landing/evidence";
import { createPdpFromPage, importPdpReferences } from "@/lib/landing/pdp-images";
export const runtime = "nodejs";
export const maxDuration = 300;
const selection = z.object({ url: z.string().url(), type: z.string().max(80), direction: z.string().max(600).optional() });
const captured = { evidenceId: z.string().uuid(), selections: z.array(selection).min(1).max(12) };
const Input = z.discriminatedUnion("action", [
    z.object({ action: z.literal("capture"), url: z.string().min(1).max(2000) }),
    z.object({ action: z.literal("discover"), url: z.string().min(1).max(2000) }),
    z.object({ action: z.literal("import"), ...captured }),
    z.object({ action: z.literal("create"), ...captured, productId: z.string().min(1).max(100), fidelity: z.enum(["exact", "structure", "loose"]), aspect: z.enum(["1:1", "4:5"]), textOnImage: z.boolean(), notes: z.string().max(1000).optional() }),
]);
export async function POST(req: Request) {
    if (!sameOrigin(req))
        return Response.json({ error: "Request origin is not allowed." }, { status: 403 });
    try {
        const body = await req.text();
        if (body.length > 32000)
            return Response.json({ error: "Request too large." }, { status: 413 });
        const input = Input.parse(JSON.parse(body)), brandId = await activeBrandId();
        if (input.action === "capture")
            return Response.json({ evidence: await captureEvidence(input.url, { brandId }) });
        if (input.action === "discover")
            return Response.json({ pages: await discoverPages(input.url) });
        if (input.action === "import")
            return Response.json({ refs: await importPdpReferences(brandId, input.evidenceId, input.selections) });
        return Response.json({ id: await createPdpFromPage(brandId, input) });
    }
    catch (error) {
        return Response.json({ error: error instanceof z.ZodError ? "Check the page, product and image selections." : error instanceof Error ? error.message : "Could not process these images." }, { status: 400 });
    }
}
