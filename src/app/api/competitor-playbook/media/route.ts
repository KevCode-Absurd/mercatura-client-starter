import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { activeBrandId } from "@/lib/brand-context";
import { publicFetch } from "@/lib/competitor-playbook/public-fetch";
import { requireSession, sessionDir } from "@/lib/competitor-playbook/store";
export const runtime = "nodejs";
export async function GET(request: Request) {
    try {
        const query = new URL(request.url).searchParams;
        const session = requireSession(query.get("session") ?? "", (await cookies()).get("ce_competitor_browser")?.value ?? "", await activeBrandId());
        const ad = session.ads.find((a) => a.id === query.get("ad"));
        if (ad?.file && /^[0-9a-f]{24}\.webp$/.test(ad.file))
            return new Response(fs.readFileSync(path.join(sessionDir(session.id), ad.file)), { headers: { "Content-Type": "image/webp", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
        const product = session.products[Number(query.get("product"))];
        const image = product?.images[Number(query.get("image") ?? 0)];
        if (!query.has("product") || !image)
            throw new Error("No session image.");
        const result = await publicFetch(image);
        if (!/^image\/(jpeg|png|webp)(?:;|$)/i.test(result.type))
            throw new Error("Not a static image.");
        return new Response(new Uint8Array(result.bytes), { headers: { "Content-Type": result.type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }
    catch {
        return new Response("Image unavailable or session expired", { status: 404, headers: { "Cache-Control": "no-store" } });
    }
}
