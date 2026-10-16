import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { activeBrandId } from "@/lib/brand-context";
import { editDirectory, getVideoEdit } from "@/lib/video-editing/store";
import { captionSrt } from "@/lib/video-editing/plan";
export const runtime = "nodejs";
export async function GET(req: Request, { params }: {
    params: Promise<{
        id: string;
        file: string;
    }>;
}) {
    const { id, file } = await params;
    if (!/^[a-f0-9]{32}$/.test(id) || !["clean.mp4", "captioned.mp4", "captions.srt"].includes(file))
        return new Response("Not found", { status: 404 });
    const brandId = await activeBrandId();
    const edit = getVideoEdit(brandId, id);
    if (!edit || (file === "captions.srt" ? !edit.plan.captions.length : !edit.files.includes(file as "clean.mp4" | "captioned.mp4")))
        return new Response("Not found", { status: 404 });
    const local = path.join(editDirectory(brandId, id), file);
    if (!fs.existsSync(local)) {
        if (file !== "captions.srt")
            return new Response("Not found", { status: 404 });
        return new Response(captionSrt(edit.plan.captions), { headers: { "Content-Type": "application/x-subrip; charset=utf-8", "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="${edit.title.replace(/[^A-Za-z0-9_-]/g, "_")}-captions.srt"` } });
    }
    const size = fs.statSync(local).size;
    const headers = new Headers({ "Content-Type": file.endsWith(".srt") ? "application/x-subrip; charset=utf-8" : "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "private, no-store" });
    if (new URL(req.url).searchParams.has("download"))
        headers.set("Content-Disposition", `attachment; filename="${edit.title.replace(/[^A-Za-z0-9_-]/g, "_")}-${file}"`);
    let start = 0, end = size - 1;
    const range = req.headers.get("range");
    if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!match || (!match[1] && !match[2]))
            return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
        if (!match[1])
            start = Math.max(0, size - Number(match[2]));
        else {
            start = Number(match[1]);
            if (match[2])
                end = Math.min(end, Number(match[2]));
        }
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size)
            return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
        headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    }
    headers.set("Content-Length", String(end - start + 1));
    return new Response(Readable.toWeb(fs.createReadStream(local, { start, end })) as ReadableStream<Uint8Array>, { status: range ? 206 : 200, headers });
}
