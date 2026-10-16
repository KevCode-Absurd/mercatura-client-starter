import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { activeBrandId } from "@/lib/brand-context";
import { validateMedia } from "@/lib/copy-builder/analyze";
import { recordPath, saveUpload } from "@/lib/copy-builder/store";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, type CopySource } from "@/lib/copy-builder/types";
import { MIME } from "@/lib/references/analyze";
import { sameOrigin } from "@/lib/copy-builder/http";
export const runtime = "nodejs";
export async function POST(req: Request) {
    if (!sameOrigin(req))
        return Response.json({ error: "Invalid origin." }, { status: 403 });
    if (Number(req.headers.get("content-length")) > MAX_VIDEO_BYTES + 1024 * 1024)
        return Response.json({ error: "Use a file under 100 MB." }, { status: 413 });
    let stored: {
        file: string;
        meta: string;
    } | undefined;
    try {
        const brandId = await activeBrandId();
        const form = await req.formData();
        if (form.get("brandId") !== brandId)
            throw new Error("The active brand changed. Reload before uploading.");
        const file = form.get("file");
        if (!(file instanceof File))
            throw new Error("Choose an image or video.");
        const ext = path.extname(file.name).toLowerCase();
        const mime = MIME[ext];
        if (!mime)
            throw new Error("Use JPG, PNG, WebP, MP4, MOV or WebM.");
        const kind = mime.startsWith("image/") ? "image" : "video";
        if (!file.size || file.size > (kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES))
            throw new Error("Images must be under 15 MB; videos under 100 MB.");
        const id = randomUUID();
        const source: CopySource = { id: `upload:${id}`, title: file.name.slice(0, 200), kind, preview: `/api/copy-builder/media/${id}` };
        const saved = saveUpload(brandId, source, ext, Buffer.from(await file.arrayBuffer()));
        stored = { file: saved, meta: recordPath(brandId, id, ".upload.json") };
        await validateMedia(saved, kind);
        return Response.json({ source });
    }
    catch (e) {
        if (stored)
            for (const file of [stored.file, stored.meta])
                fs.rmSync(file, { force: true });
        return Response.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 400 });
    }
}
