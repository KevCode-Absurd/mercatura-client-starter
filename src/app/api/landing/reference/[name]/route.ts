import fs from "node:fs";
import path from "node:path";
import { withPlaceholders } from "@/lib/landing/placeholders";
import { referenceFile } from "@/lib/landing/references";
export async function GET(_req: Request, { params }: {
    params: Promise<{
        name: string;
    }>;
}) {
    const { name } = await params;
    const ref = referenceFile(name);
    if (!ref || !fs.existsSync(ref.file))
        return new Response("Not found", { status: 404 });
    const body = ref.type.startsWith("text/html") ? withPlaceholders(fs.readFileSync(ref.file, "utf-8"), path.dirname(ref.file)) : fs.readFileSync(ref.file);
    return new Response(body, { headers: { "content-type": ref.type, "cache-control": "private, max-age=3600" } });
}
