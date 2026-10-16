import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { briefHtml, briefPdf } from "@/lib/production/pdf";
import { tryBrand } from "@/lib/queries";
import { scriptMarkdown, scriptText } from "@/lib/scripts/export";
export async function GET(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const brandId = await activeBrandId();
    const s = db.select().from(schema.scripts).where(and(eq(schema.scripts.id, id), eq(schema.scripts.brand_id, brandId))).get();
    if (!s)
        return new Response("Script not found", { status: 404 });
    const concept = db.select().from(schema.concepts).where(eq(schema.concepts.id, s.concept_id)).get();
    const brand = tryBrand(brandId);
    const persona = brand?.personas.find((p) => p.id === concept?.persona_id);
    const offer = brand?.offers.find((o) => o.id === concept?.offer_id);
    const doc = { id: s.id, title: s.title, version: s.version, est_seconds: s.est_seconds, status: s.status, lines: s.lines, hook_variants: s.hook_variants, context: [concept ? `**Concept:** ${concept.name}. ${concept.angle}` : "", persona ? `**Written for:** ${persona.name}. ${persona.summary}` : "", offer ? `**Offer:** ${offer.name}` : ""] };
    const format = new URL(req.url).searchParams.get("format") ?? "pdf";
    const name = `${s.id}_${s.title.normalize("NFD").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50)}`;
    const attach = (ext: string) => `attachment; filename="${name}.${ext}"`;
    if (format === "txt")
        return new Response(scriptText(doc), { headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": attach("txt") } });
    const md = scriptMarkdown(doc);
    if (format === "md")
        return new Response(md, { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": attach("md") } });
    if (format === "doc")
        return new Response(briefHtml(md, s.title), { headers: { "content-type": "application/msword; charset=utf-8", "content-disposition": attach("doc") } });
    try {
        const pdf = await briefPdf(md, s.title);
        return new Response(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": attach("pdf") } });
    }
    catch (e) {
        return new Response(`The PDF could not be made: ${(e as Error).message.slice(0, 200)}. Download it as Word or text instead.`, { status: 500 });
    }
}
