import fs from "node:fs";
import { guideImage } from "@/lib/guide";
export async function GET(_req: Request, { params }: {
    params: Promise<{
        file: string;
    }>;
}) {
    const { file } = await params;
    const abs = guideImage(file);
    if (!abs)
        return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(fs.readFileSync(abs)), { headers: { "content-type": abs.endsWith(".png") ? "image/png" : "image/jpeg", "cache-control": "no-cache" } });
}
