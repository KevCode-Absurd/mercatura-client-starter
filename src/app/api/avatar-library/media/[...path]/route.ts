import fs from "node:fs/promises";
import path from "node:path";
import { activeBrandId } from "@/lib/brand-context";
import { allowedMedia } from "@/lib/avatar-studio/engine";
export const runtime = "nodejs";
export async function GET(_request: Request, context: {
    params: Promise<{
        path: string[];
    }>;
}) {
    try {
        const parts = (await context.params).path;
        if (!parts.length || parts.some((p) => !p || p === "." || p === ".." || /[\\/\0]/.test(p)))
            return new Response("Not found", { status: 404 });
        const file = allowedMedia(await activeBrandId(), parts.join("/"));
        const contentType = ({ ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" } as Record<string, string>)[path.extname(file)];
        return new Response(new Uint8Array(await fs.readFile(file)), { headers: { "Content-Type": contentType, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=300" } });
    }
    catch {
        return new Response("Not found", { status: 404 });
    }
}
