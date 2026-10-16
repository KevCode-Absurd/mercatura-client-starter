import fs from "node:fs";
import path from "node:path";
import { activeBrandId } from "@/lib/brand-context";
import { readUpload } from "@/lib/copy-builder/store";
import { MIME } from "@/lib/references/analyze";
export const runtime = "nodejs";
export async function GET(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    try {
        const { id } = await params;
        const { file } = readUpload(await activeBrandId(), id);
        const bytes = fs.readFileSync(file);
        const headers = { "content-type": MIME[path.extname(file)], "cache-control": "private, no-store", "accept-ranges": "bytes", "x-content-type-options": "nosniff" };
        const range = req.headers.get("range");
        if (range) {
            const match = /^bytes=(\d+)-(\d*)$/.exec(range);
            if (!match)
                return new Response(null, { status: 416, headers: { "content-range": `bytes */${bytes.length}` } });
            const start = Number(match[1]);
            const end = match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
            if (start > end || start >= bytes.length)
                return new Response(null, { status: 416, headers: { "content-range": `bytes */${bytes.length}` } });
            return new Response(bytes.subarray(start, end + 1), { status: 206, headers: { ...headers, "content-range": `bytes ${start}-${end}/${bytes.length}`, "content-length": String(end - start + 1) } });
        }
        return new Response(bytes, { headers: { ...headers, "content-length": String(bytes.length) } });
    }
    catch {
        return new Response("Not found", { status: 404 });
    }
}
