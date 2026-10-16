import fs from "node:fs";
import { stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import sharp from "sharp";
export function previewCache(render: (file: string, width: number) => Promise<Buffer>, maxBytes = 32 * 1024 * 1024, maxEntries = 256) {
    const cached = new Map<string, Buffer>();
    const pending = new Map<string, Promise<Buffer>>();
    let bytes = 0;
    return async (file: string, width: number, revision: string): Promise<Buffer> => {
        const key = `${file}:${width}:${revision}`;
        const hit = cached.get(key);
        if (hit) {
            cached.delete(key);
            cached.set(key, hit);
            return hit;
        }
        if (pending.has(key))
            return pending.get(key)!;
        const work = render(file, width).then((buffer) => {
            if (buffer.length <= maxBytes) {
                cached.set(key, buffer);
                bytes += buffer.length;
                while (bytes > maxBytes || cached.size > maxEntries) {
                    const first = cached.keys().next().value!;
                    bytes -= cached.get(first)!.length;
                    cached.delete(first);
                }
            }
            return buffer;
        }).finally(() => { pending.delete(key); });
        pending.set(key, work);
        return work;
    };
}
const preview = previewCache((file, width) => sharp(file).resize({ width, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer());
export function byteRange(value: string, size: number): {
    start: number;
    end: number;
} | null {
    const match = /^bytes=(\d*)-(\d*)$/.exec(value);
    if (!match || (!match[1] && !match[2]) || size <= 0)
        return null;
    const suffix = !match[1];
    const first = Number(suffix ? match[2] : match[1]);
    const last = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || (suffix && first <= 0))
        return null;
    const start = suffix ? Math.max(0, size - first) : first;
    const end = suffix ? size - 1 : Math.min(last, size - 1);
    return start < size && end >= start ? { start, end } : null;
}
export async function assetResponse(req: Request, file: string, contentType: string, width?: number): Promise<Response> {
    const info = await stat(file, { bigint: true });
    if (!info.isFile())
        return new Response("Not found", { status: 404 });
    const revision = `${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`;
    const etag = `"${createHash("sha1").update(`${revision}:${width ?? "original"}`).digest("hex")}"`;
    const headers = new Headers({ "content-type": width ? "image/jpeg" : contentType, "cache-control": "private, no-cache", etag });
    const condition = req.headers.get("if-none-match");
    if (condition === "*" || condition?.split(",").some((tag) => tag.trim().replace(/^W\//, "") === etag))
        return new Response(null, { status: 304, headers });
    if (width) {
        const buffer = await preview(file, width, revision);
        headers.set("content-length", String(buffer.length));
        return new Response(req.method === "HEAD" ? null : new Uint8Array(buffer), { headers });
    }
    const size = Number(info.size);
    headers.set("accept-ranges", "bytes");
    let range: {
        start: number;
        end: number;
    } | undefined;
    const requested = req.headers.get("range");
    const ifRange = req.headers.get("if-range");
    if (requested && (!ifRange || ifRange === etag)) {
        range = byteRange(requested, size) ?? undefined;
        if (!range) {
            headers.set("content-range", `bytes */${size}`);
            return new Response(null, { status: 416, headers });
        }
        headers.set("content-range", `bytes ${range.start}-${range.end}/${size}`);
    }
    headers.set("content-length", String(range ? range.end - range.start + 1 : size));
    const stream = req.method === "HEAD" ? null : Readable.toWeb(fs.createReadStream(file, range)) as ReadableStream<Uint8Array>;
    return new Response(stream, { status: range ? 206 : 200, headers });
}
