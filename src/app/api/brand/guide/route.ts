import { activeBrand } from "@/lib/brand-context";
import { guideModel, tokensMd } from "@/lib/brain/guide";
import { guideHtml } from "@/lib/brain/guide-html";
import { listBrandFonts } from "@/lib/brand-fonts";
export async function GET(req: Request) {
    const row = await activeBrand();
    const q = new URL(req.url).searchParams;
    const m = guideModel(row.id);
    const name = row.id.replace(/[^a-z0-9-]+/gi, "-");
    if (q.get("file") === "tokens")
        return new Response(tokensMd(m), { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="${name}-brand-tokens.md"` } });
    const faces = listBrandFonts(row.id).map((f) => ({ family: f.family, weight: f.weight, style: f.style, url: `/api/brand-file/look/fonts/${encodeURIComponent(f.file.split(/[\\/]/).pop() ?? f.file)}` }));
    return new Response(guideHtml(m, faces), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...(q.get("download") ? { "content-disposition": `attachment; filename="${name}-brand-guide.html"` } : {}) } });
}
