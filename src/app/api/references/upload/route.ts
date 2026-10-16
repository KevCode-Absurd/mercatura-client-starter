import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { ensureReferenceThumb } from "@/lib/references/thumb";
import { env, SHARED_BRAND } from "@/lib/env";
import { enqueue } from "@/lib/jobs/queue";
import { MAX_VIDEO_SECONDS, referenceAnalysisEnabled } from "@/lib/references/analyze";
const MAX_BYTES = 100 * 1024 * 1024;
const KINDS: Record<string, "image" | "video"> = { ".jpg": "image", ".jpeg": "image", ".png": "image", ".webp": "image", ".mp4": "video", ".mov": "video", ".webm": "video" };
const num = (v: FormDataEntryValue | null) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
};
export async function POST(req: Request) {
    const brandId = await activeBrandId();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File))
        return Response.json({ ok: false, error: "No file" }, { status: 400 });
    const ext = path.extname(file.name).toLowerCase();
    const kind = KINDS[ext];
    if (!kind)
        return Response.json({ ok: false, error: "Use a JPG, PNG, WebP, MP4, MOV or WebM file." }, { status: 400 });
    if (file.size > MAX_BYTES)
        return Response.json({ ok: false, error: "The file is over 100 MB." }, { status: 400 });
    const duration = num(form.get("duration"));
    if (kind === "video" && duration && duration > MAX_VIDEO_SECONDS)
        return Response.json({ ok: false, error: "Videos over 15 minutes aren't supported." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const id = sha256.slice(0, 32);
    const existing = db.select({ id: schema.adReferences.id, source: schema.adReferences.source }).from(schema.adReferences).where(eq(schema.adReferences.id, id)).get();
    if (existing)
        return Response.json({ ok: true, id, duplicate: true, analysis: false });
    const dir = path.join(env.DATA_DIR, "references", "user");
    fs.mkdirSync(dir, { recursive: true });
    const media_path = path.join("references", "user", `${id}${ext}`).split(path.sep).join("/");
    fs.writeFileSync(path.join(env.DATA_DIR, media_path), bytes);
    let thumb_path: string | null = kind === "image" ? media_path : null;
    const thumb = form.get("thumb");
    if (thumb instanceof File && thumb.size > 0 && thumb.size < 2 * 1024 * 1024) {
        thumb_path = path.join("references", "user", `${id}.thumb.jpg`).split(path.sep).join("/");
        fs.writeFileSync(path.join(env.DATA_DIR, thumb_path), Buffer.from(await thumb.arrayBuffer()));
    }
    const title = String(form.get("title") ?? "").trim();
    const analysis = referenceAnalysisEnabled();
    db.insert(schema.adReferences)
        .values({
        id,
        brand_id: SHARED_BRAND,
        sha256,
        kind,
        title: title || file.name.replace(/\.[^.]+$/, ""),
        title_locked: !!title,
        width: num(form.get("width")),
        height: num(form.get("height")),
        duration,
        categories: ["Added by you"],
        tags: {},
        tags_raw: {},
        awareness: null,
        sophistication: null,
        analysis: null,
        analyzed: false,
        media_path,
        media_root: "data",
        thumb_path,
        remix_revision: null,
        synced_at: new Date().toISOString(),
        source: "user",
        added_by_brand: brandId,
        notes: String(form.get("notes") ?? "").trim().slice(0, 2000),
        analysis_status: analysis ? "queued" : "none",
    })
        .run();
    if (kind === "video" && !thumb_path)
        await ensureReferenceThumb(id);
    if (analysis)
        enqueue(brandId, "analyze_reference", id, {});
    return Response.json({ ok: true, id, duplicate: false, analysis });
}
