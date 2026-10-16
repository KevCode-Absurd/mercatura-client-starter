import { activeBrandId } from "@/lib/brand-context";
import { readCroRun } from "@/lib/landing/studio-store";
import { exportCroHtml, exportCroShopify } from "@/lib/landing/studio-export";
import { renderCroPage } from "@/lib/landing/studio-render";
import { fontCssFor, inlineCroImages } from "@/lib/landing/studio-assets";
import { exportCroReport } from "@/lib/landing/studio-report";
import { assertCroExportReview } from "@/lib/landing/export-guard";
export const runtime = "nodejs";
export async function GET(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    try {
        const { id } = await params, run = readCroRun(await activeBrandId(), id), query = new URL(req.url).searchParams, format = query.get("format") || "html";
        if (format === "report-md")
            return new Response(exportCroReport(run), { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": `attachment; filename="cro-implementation-${id.slice(0, 8)}.md"` } });
        if (format === "report")
            return new Response(JSON.stringify({ brand: run.brand.name, source: run.evidence?.url, audit: run.audit, coverage: run.coverage, blueprint: run.blueprint, review: run.review, approval: run.approval, storyboard: run.storyboard, knowledge: run.knowledge, quality: run.quality, visualReview: run.visualReview }, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="cro-audit-${id.slice(0, 8)}.json"` } });
        if (!run.sections.length)
            throw new Error("Build the page before exporting.");
        if (query.get("preview") !== "1")
            assertCroExportReview(run);
        if (format === "liquid")
            return new Response(new Uint8Array(exportCroShopify(run)), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="shopify-${id.slice(0, 8)}.zip"` } });
        const preview = query.get("preview") === "1", section = query.get("section") || undefined;
        const html = preview ? renderCroPage(run, { fontCss: fontCssFor(run), images: inlineCroImages(run), onlySection: section, preview: true, simulator: query.get("simulate") === "1" }) : exportCroHtml(run);
        return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "sandbox allow-scripts; default-src 'none'; img-src data: https:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'none'; base-uri 'none'", ...(!preview && query.get("view") !== "1" ? { "Content-Disposition": `attachment; filename="page-${id.slice(0, 8)}.html"` } : {}) } });
    }
    catch (e) {
        return Response.json({ error: e instanceof Error ? e.message : "Export failed." }, { status: 400 });
    }
}
