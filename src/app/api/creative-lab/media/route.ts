import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { activeBrandId } from "@/lib/brand-context";
import { env } from "@/lib/env";
export const runtime = "nodejs";
const extensions: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/mp4": "m4a", "video/mp4": "mp4", "video/webm": "webm", "audio/webm": "webm" };
export async function POST(req: Request) {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin)
        return Response.json({ error: "Upload from this app's page." }, { status: 403 });
    const brandId = await activeBrandId();
    if (!/^[a-zA-Z0-9_-]+$/.test(brandId))
        return Response.json({ error: "Invalid brand." }, { status: 400 });
    if (Number(req.headers.get("content-length")) > 61 * 1024 * 1024)
        return Response.json({ error: "Choose media up to 60 MB." }, { status: 413 });
    let data: FormData;
    try {
        data = await req.formData();
    }
    catch {
        return Response.json({ error: "The upload was interrupted or unreadable. Choose the file again." }, { status: 400 });
    }
    const file = data.get("file");
    if (!(file instanceof File) || !extensions[file.type] || file.size < 1 || file.size > 60 * 1024 * 1024)
        return Response.json({ error: "Choose a supported image, read or video up to 60 MB." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const head = bytes.subarray(0, 16);
    const known = file.type === "image/png" ? head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : file.type === "image/jpeg" ? head[0] === 255 && head[1] === 216 : file.type === "image/webp" ? head.toString("ascii").startsWith("RIFF") && head.toString("ascii", 8, 12) === "WEBP" : file.type.includes("wav") ? head.toString("ascii").startsWith("RIFF") : file.type.includes("mp4") ? head.toString("ascii", 4, 8) === "ftyp" : file.type.includes("webm") ? head.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])) : head.toString("ascii", 0, 3) === "ID3" || head[0] === 255;
    if (!known)
        return Response.json({ error: "The media contents do not match its declared format." }, { status: 400 });
    const rel = `creative-lab/${brandId}/${randomUUID()}.${extensions[file.type]}`;
    const target = path.join(env.DATA_DIR, "assets", rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: "wx" });
    return Response.json({ url: `/api/assets/${rel}`, name: file.name.slice(0, 200), kind: file.type.split("/")[0] });
}
