import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { readArtifact, saveArtifact } from "@/lib/seo/store";
import { seoDeliveryFiles } from "@/lib/seo/delivery";
import { zip } from "@/lib/zip";
export async function POST(request: Request) {
    try {
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin)
            return Response.json({ error: "Same-origin export required." }, { status: 403 });
        const raw = await request.text();
        if (raw.length > 12000)
            throw new Error("The selection is too large.");
        const input = z.object({ brandId: z.string().max(100), contextHash: z.string().max(100), items: z.array(z.object({ id: z.string().max(150), revision: z.number().int().positive() })).min(1).max(20) }).parse(JSON.parse(raw));
        if (await activeBrandId() !== input.brandId)
            return Response.json({ error: "Active brand changed." }, { status: 403 });
        const ctx = seoContext(input.brandId);
        if (ctx.contextHash !== input.contextHash)
            throw new Error("Brand Brain changed. Review the latest revisions.");
        const artifacts = input.items.map((item) => { const value = readArtifact(input.brandId, item.id); if (!value || value.revision !== item.revision)
            throw new Error("A selected revision changed or is unavailable."); return value; });
        const files = seoDeliveryFiles(ctx, artifacts), archive = zip(files.map((f) => ({ name: f.name, data: Buffer.from(f.content) })));
        const at = new Date().toISOString();
        for (const a of artifacts)
            saveArtifact({ ...a, status: a.status === "approved" ? "exported" : a.status, updatedAt: at, history: [...a.history, { at, message: "Approved SEO delivery ZIP prepared. No store changed." }] });
        return new Response(new Uint8Array(archive), { headers: { "Content-Type": "application/zip", "Content-Disposition": "attachment; filename=approved-seo-delivery.zip", "Cache-Control": "no-store" } });
    }
    catch (e) {
        return Response.json({ error: e instanceof Error ? e.message : "Could not prepare delivery." }, { status: 400 });
    }
}
