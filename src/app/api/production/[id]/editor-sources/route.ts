import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { env } from "@/lib/env";
import { editorSources } from "@/lib/production/delivery";
export async function GET(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const brandId = await activeBrandId();
    const wanted = new URL(req.url).searchParams.get("brand");
    if (wanted && wanted !== brandId)
        return Response.json({ error: "Switch back to this creative's brand before editing it." }, { status: 409 });
    const job = db.select().from(schema.outputJobs).where(and(eq(schema.outputJobs.id, id), eq(schema.outputJobs.brand_id, brandId))).get();
    if (!job)
        return Response.json({ error: "Creative not found for this brand." }, { status: 404 });
    const script = db.select().from(schema.scripts).where(and(eq(schema.scripts.id, job.script_id), eq(schema.scripts.brand_id, brandId))).get();
    const sources = editorSources(job, path.join(env.DATA_DIR, "assets"), script?.title ?? job.meta_ad_name ?? "Generated video");
    if (!sources.clips.length)
        return Response.json({ error: "No completed video files are available yet." }, { status: 404 });
    return Response.json(sources, { headers: { "cache-control": "no-store" } });
}
