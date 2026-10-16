import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { brandBrainDir } from "@/lib/brand-brain";
import { getBrandRow } from "@/lib/brands";
import { getPage, pageHtml } from "@/lib/landing/store";
const slug = (s: string) => s.normalize("NFD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "landing-page";
export async function GET(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const page = getPage(id);
    if (!page)
        return new Response("Not found", { status: 404 });
    const url = new URL(req.url);
    const download = url.searchParams.get("download") === "1";
    let html = pageHtml(page, { preview: !download && url.searchParams.get("bare") !== "1" });
    if (download) {
        const row = getBrandRow(page.brand_id);
        const root = row ? brandBrainDir(row.dir) : "";
        const local = [...new Set(html.match(/\/api\/brand-file\/assets\/[^"'\s)]+/g) ?? [])];
        for (const src of local) {
            const file = path.resolve(root, "assets", ...src.replace("/api/brand-file/assets/", "").split("/").map(decodeURIComponent));
            if (!root || !file.startsWith(root + path.sep) || !fs.existsSync(file))
                continue;
            const buf = await sharp(file).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
            html = html.split(src).join(`data:image/webp;base64,${buf.toString("base64")}`);
        }
    }
    return new Response(html, {
        headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
            ...(download ? { "content-disposition": `attachment; filename="${slug(page.title)}.html"` } : {}),
        },
    });
}
