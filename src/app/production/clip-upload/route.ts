import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { attachClip } from "@/lib/production/engine";
export async function POST(req: Request) {
    try {
        const brandId = await activeBrandId();
        const form = await req.formData();
        const jobId = String(form.get("job") ?? "");
        const index = Number(form.get("clip"));
        const file = form.get("file");
        if (!(file instanceof File))
            return Response.json({ ok: false, error: "Choose a video file." }, { status: 400 });
        if (!Number.isInteger(index) || index < 0)
            return Response.json({ ok: false, error: "That clip is not part of this video." }, { status: 400 });
        const job = db.select({ id: schema.outputJobs.id }).from(schema.outputJobs).where(and(eq(schema.outputJobs.id, jobId), eq(schema.outputJobs.brand_id, brandId))).get();
        if (!job)
            return Response.json({ ok: false, error: "Job not found" }, { status: 404 });
        const running = db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(eq(schema.jobs.kind, "production"), eq(schema.jobs.ref_id, jobId), inArray(schema.jobs.status, ["queued", "running"]))).get();
        if (running)
            return Response.json({ ok: false, error: "This job is running. Add the clip when it stops." }, { status: 409 });
        const res = await attachClip(jobId, index, { name: file.name, bytes: Buffer.from(await file.arrayBuffer()) });
        revalidatePath("/production");
        revalidatePath("/", "layout");
        return Response.json({ ok: true, ...res });
    }
    catch (e) {
        return Response.json({ ok: false, error: (e as Error).message.slice(0, 300) }, { status: 400 });
    }
}
