import fs from "node:fs";
import path from "node:path";
import { assetResponse } from "@/lib/media/asset-response";
import { env } from "@/lib/env";
const TYPES: Record<string, string> = {
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".md": "text/markdown; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".pdf": "application/pdf",
};
export async function GET(req: Request, { params }: {
    params: Promise<{
        path: string[];
    }>;
}) {
    const { path: parts } = await params;
    const root = path.resolve(env.DATA_DIR, "assets");
    const file = path.resolve(root, ...parts);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        return new Response("Not found", { status: 404 });
    }
    const w = Number(new URL(req.url).searchParams.get("w"));
    if (w >= 40 && w <= 1600 && /\.(png|jpe?g|webp)$/i.test(file)) {
        return assetResponse(req, file, "image/jpeg", Math.round(w));
    }
    return assetResponse(req, file, TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream");
}
export const HEAD = GET;
