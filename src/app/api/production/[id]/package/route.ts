import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { env } from "@/lib/env";
import { deliveryZip } from "@/lib/production/delivery";
export async function GET(_req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const brandId = await activeBrandId();
    const job = db.select().from(schema.outputJobs).where(and(eq(schema.outputJobs.id, id), eq(schema.outputJobs.brand_id, brandId))).get();
    if (!job)
        return new Response("Creative not found", { status: 404 });
    const script = db.select().from(schema.scripts).where(and(eq(schema.scripts.id, job.script_id), eq(schema.scripts.brand_id, brandId))).get();
    try {
        const pack = deliveryZip(job, script, path.join(env.DATA_DIR, "assets"));
        return new Response(new Uint8Array(pack.bytes), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${pack.name}"`, "cache-control": "no-store" } });
    }
    catch (e) {
        return Response.json({ error: (e as Error).message }, { status: 400 });
    }
}
