import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { briefHtml, briefPdf } from "@/lib/production/pdf";
export async function GET(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const brandId = await activeBrandId();
    const job = db.select().from(schema.outputJobs).where(and(eq(schema.outputJobs.id, id), eq(schema.outputJobs.brand_id, brandId))).get();
    const md = job?.production?.brief_markdown;
    if (!job || !md)
        return new Response("No brief for this job", { status: 404 });
    const format = new URL(req.url).searchParams.get("format") ?? "pdf";
    const name = `${(job.meta_ad_name ?? job.id).replace(/[^A-Za-z0-9._-]+/g, "_")}_brief`;
    if (format === "md")
        return new Response(md, { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="${name}.md"` } });
    if (format === "html")
        return new Response(briefHtml(md, name), { headers: { "content-type": "text/html; charset=utf-8" } });
    try {
        const pdf = await briefPdf(md, name);
        return new Response(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${name}.pdf"` } });
    }
    catch (e) {
        return new Response((e as Error).message, { status: 500 });
    }
}
