import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { activeBrand } from "@/lib/brand-context";
import { brandBrainDir } from "@/lib/brand-brain";
const TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const FONTS: Record<string, string> = { ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf" };
export async function GET(req: Request, { params }: {
    params: Promise<{
        path: string[];
    }>;
}) {
    const { path: parts } = await params;
    if (parts[0] !== "assets" && parts[0] !== "look" && parts[0] !== "people")
        return new Response("Not found", { status: 404 });
    const row = await activeBrand();
    const root = brandBrainDir(row.dir);
    const file = path.resolve(root, ...parts.map(decodeURIComponent));
    const type = TYPES[path.extname(file).toLowerCase()] ?? (parts[0] === "look" && parts[1] === "fonts" && parts.length === 3 ? FONTS[path.extname(file).toLowerCase()] : undefined);
    if (!file.startsWith(root + path.sep) || !type || !fs.existsSync(file) || !fs.statSync(file).isFile())
        return new Response("Not found", { status: 404 });
    const w = Number(new URL(req.url).searchParams.get("w"));
    if (w >= 40 && w <= 1600) {
        try {
            const buf = await sharp(file).rotate().resize({ width: Math.round(w), withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
            return new Response(new Uint8Array(buf), { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=3600" } });
        }
        catch { }
    }
    return new Response(fs.readFileSync(file), { headers: { "content-type": type, "cache-control": "private, max-age=3600" } });
}
