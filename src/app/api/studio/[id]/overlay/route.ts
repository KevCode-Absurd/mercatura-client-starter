import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { errorText } from "@/lib/plain-message";
import { getRun } from "@/lib/studio/engine";
import { LayersSchema } from "@/lib/studio/overlay";
import { saveOverlay } from "@/lib/studio/overlay-store";
const MAX_BYTES = 25 * 1024 * 1024;
export async function POST(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    try {
        const { id } = await params;
        const run = getRun(id);
        if (!run || run.brand_id !== (await activeBrandId()))
            return Response.json({ ok: false, error: "Set not found" }, { status: 404 });
        const busy = db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(eq(schema.jobs.kind, "studio"), eq(schema.jobs.ref_id, id), inArray(schema.jobs.status, ["queued", "running"]))).get();
        if (busy)
            return Response.json({ ok: false, error: "This set is working. Wait for it to finish, then save." }, { status: 409 });
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File) || !file.size)
            return Response.json({ ok: false, error: "No picture was sent." }, { status: 400 });
        if (file.size > MAX_BYTES)
            return Response.json({ ok: false, error: "That picture is over 25 MB." }, { status: 400 });
        const layers = LayersSchema.parse(JSON.parse(String(form.get("layers") ?? "[]")));
        const saved = await saveOverlay(id, String(form.get("item") ?? ""), { aspect: String(form.get("aspect") ?? ""), from: Number(form.get("from")), layers, png: Buffer.from(await file.arrayBuffer()), variant: String(form.get("variant") ?? "") || undefined, approve: form.get("approve") === "true" });
        revalidatePath(`/studio/${id}`);
        return Response.json({ ok: true, itemId: saved.itemId, version: saved.version, path: saved.path, variantId: saved.variantId ?? null, copyStatus: saved.copyStatus ?? null, reviewMessage: saved.reviewMessage ?? null });
    }
    catch (e) {
        return Response.json({ ok: false, error: errorText(e).slice(0, 300) }, { status: 400 });
    }
}
