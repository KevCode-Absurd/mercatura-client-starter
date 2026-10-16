import { activeBrandId } from "@/lib/brand-context";
import { sameOrigin } from "@/lib/copy-builder/http";
import { generateEditCaptions } from "@/lib/video-editing/captions";
import { MAX_UPLOAD_BYTES } from "@/lib/video-editing/plan";
export const runtime = "nodejs";
const running = new Set<string>();
export async function POST(req: Request) {
    if (!sameOrigin(req))
        return Response.json({ ok: false, error: "Invalid origin." }, { status: 403 });
    const brand = await activeBrandId();
    if (running.has(brand))
        return Response.json({ ok: false, error: "Captions are already being generated for this brand." }, { status: 409 });
    if (Number(req.headers.get("content-length")) > MAX_UPLOAD_BYTES + 1024 * 1024)
        return Response.json({ ok: false, error: "Keep uploads under 256 MB." }, { status: 413 });
    running.add(brand);
    try {
        const form = await req.formData();
        if (form.get("brand") !== brand)
            return Response.json({ ok: false, error: "The active brand changed. Reload before generating captions." }, { status: 409 });
        const files = form.getAll("clips"), voice = form.get("voice");
        if (!files.length || files.length > 12 || files.some(f => !(f instanceof File)))
            throw new Error("Choose up to 12 video files.");
        const all = [...files as File[], ...(voice instanceof File && voice.size ? [voice] : [])];
        if (all.reduce((n, f) => n + f.size, 0) > MAX_UPLOAD_BYTES)
            throw new Error("Keep uploads under 256 MB.");
        const read = async (f: File) => ({ name: f.name, bytes: Buffer.from(await f.arrayBuffer()) });
        const captions = await generateEditCaptions(brand, JSON.parse(String(form.get("plan"))), await Promise.all((files as File[]).map(read)), voice instanceof File && voice.size ? await read(voice) : undefined);
        return Response.json({ ok: true, captions, review: "Draft transcript: listen and correct names and timestamps before export." });
    }
    catch (e) {
        return Response.json({ ok: false, error: (e instanceof Error ? e.message : "Transcription failed.").slice(0, 400) }, { status: 400 });
    }
    finally {
        running.delete(brand);
    }
}
