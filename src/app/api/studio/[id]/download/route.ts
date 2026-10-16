import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { getSprint } from "@/lib/sprint/engine";
import { getRun } from "@/lib/studio/engine";
import { copyCsv, exportZip, variantsZip, selectedCreativeZip } from "@/lib/studio/export";
export async function GET(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const brandId = await activeBrandId();
    const sprint = id.startsWith("sprint_") ? getSprint(id) : undefined;
    const run = sprint ? undefined : getRun(id);
    if ((sprint && sprint.brand_id !== brandId) || (run && run.brand_id !== brandId) || (!sprint && !run))
        return new Response("Not found", { status: 404 });
    const runs = run ? [run] : sprint!.set_ids.length ? db.select().from(schema.studioRuns).where(inArray(schema.studioRuns.id, sprint!.set_ids)).all().sort((a, b) => sprint!.set_ids.indexOf(a.id) - sprint!.set_ids.indexOf(b.id)) : [];
    const base = (sprint?.title ?? run?.title ?? id).toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || id;
    const q = new URL(req.url).searchParams;
    if (run && q.get("item") && q.get("what") === "package") {
        try {
            const pack = selectedCreativeZip(run, q.get("item")!);
            if (!pack.images)
                return new Response("No selected image is available for this creative.", { status: 404 });
            return new Response(new Uint8Array(pack.zip), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${base}-${q.get("item")!.replace(/[^a-z0-9_-]/gi, "")}-creative.zip"`, "cache-control": "no-store" } });
        }
        catch (e) {
            return Response.json({ error: (e as Error).message }, { status: 400 });
        }
    }
    if (run && q.get("item") && q.get("variants")) {
        const ids = q.get("variants") === "all" ? undefined : q.get("variants")!.split(",").filter((x) => /^v\d+$/.test(x));
        const out = variantsZip(run, q.get("item")!, ids);
        if (!out.images)
            return new Response("This ad has no variant to download yet.", { status: 404 });
        return new Response(new Uint8Array(out.zip), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${base}-${q.get("item")!.replace(/[^a-z0-9_-]/gi, "")}-variants.zip"`, "cache-control": "no-store" } });
    }
    if (q.get("what") === "csv") {
        return new Response(copyCsv(runs), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${base}-ad-copy.csv"`, "cache-control": "no-store" } });
    }
    const out = exportZip(runs);
    if (!out.images)
        return new Response("No image of this set has been rendered yet.", { status: 404 });
    return new Response(new Uint8Array(out.zip), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${base}.zip"`, "cache-control": "no-store" } });
}
