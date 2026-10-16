import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "@/lib/env";
import { ensureReferenceThumb, resizedThumb, THUMB_WIDTHS } from "@/lib/references/thumb";
const TYPES: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
};
export async function GET(req: Request, { params }: {
    params: Promise<{
        kind: string;
        id: string;
    }>;
}) {
    const { kind, id } = await params;
    const ref = db.select({ media: schema.adReferences.media_path, thumb: schema.adReferences.thumb_path, root: schema.adReferences.media_root }).from(schema.adReferences).where(eq(schema.adReferences.id, id)).get();
    if (!ref)
        return new Response("Not found", { status: 404 });
    const rel = kind === "thumb" ? (ref.thumb ?? (await ensureReferenceThumb(id))) : kind === "media" ? ref.media : null;
    const base = kind === "thumb" || ref.root === "data" ? env.DATA_DIR : env.SKILLS_DIR;
    if (!rel)
        return new Response("Not found", { status: 404 });
    let file = path.resolve(base, rel);
    if (!file.startsWith(base + path.sep) || !fs.existsSync(file))
        return new Response("Not found", { status: 404 });
    const url = new URL(req.url);
    const width = Number(url.searchParams.get("w") ?? 0);
    if (kind === "thumb" && THUMB_WIDTHS.has(width))
        file = (await resizedThumb(id, file, width)) ?? file;
    const versioned = url.searchParams.has("v");
    const size = fs.statSync(file).size;
    const type = TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
    const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
    const headers = { "content-type": type, "accept-ranges": "bytes", "cache-control": versioned ? "private, max-age=31536000, immutable" : "private, max-age=3600" };
    if (range) {
        const start = range[1] ? Number(range[1]) : 0;
        const end = range[2] ? Math.min(Number(range[2]), size - 1) : Math.min(start + 4 * 1024 * 1024 - 1, size - 1);
        const stream = fs.createReadStream(file, { start, end });
        return new Response(stream as unknown as ReadableStream, {
            status: 206,
            headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) },
        });
    }
    return new Response(fs.readFileSync(file), { headers: { ...headers, "content-length": String(size) } });
}
