import { activeBrandId } from "@/lib/brand-context";
import { sameOrigin } from "@/lib/copy-builder/http";
import { motionLook } from "@/lib/production/motion-look";
import { editPlanSchema, MAX_UPLOAD_BYTES } from "@/lib/video-editing/plan";
import { renderVideoEdit, type EditUpload } from "@/lib/video-editing/render";
export const runtime = "nodejs";
const running = new Set<string>();
export async function POST(req: Request) {
    if (!sameOrigin(req))
        return Response.json({ ok: false, error: "Invalid origin." }, { status: 403 });
    const brandId = await activeBrandId();
    if (running.has(brandId))
        return Response.json({ ok: false, error: "An edit is already exporting for this brand. Wait for it to finish." }, { status: 409 });
    if (Number(req.headers.get("content-length")) > MAX_UPLOAD_BYTES + 1024 * 1024)
        return Response.json({ ok: false, error: "Keep the combined uploads under 256 MB." }, { status: 413 });
    running.add(brandId);
    try {
        const form = await req.formData();
        if (form.get("brand") !== brandId)
            return Response.json({ ok: false, error: "The active brand changed. Reload the editor before exporting." }, { status: 409 });
        const plan = editPlanSchema.parse(JSON.parse(String(form.get("plan"))));
        const files = form.getAll("clips");
        const music = form.get("music");
        const voice = form.get("voice");
        if (!files.length || files.length > 12 || files.some((f) => !(f instanceof File)))
            throw new Error("Choose between 1 and 12 video files.");
        const all = [...files as File[], ...(music instanceof File && music.size ? [music] : []), ...(voice instanceof File && voice.size ? [voice] : [])];
        if (all.reduce((n, f) => n + f.size, 0) > MAX_UPLOAD_BYTES)
            return Response.json({ ok: false, error: "Keep the combined uploads under 256 MB." }, { status: 413 });
        const read = async (f: File): Promise<EditUpload> => ({ name: f.name, bytes: Buffer.from(await f.arrayBuffer()) });
        const uploads = await Promise.all((files as File[]).map(read));
        const track = music instanceof File && music.size ? await read(music) : undefined;
        const vocal = voice instanceof File && voice.size ? await read(voice) : undefined;
        const edit = await renderVideoEdit(brandId, plan, uploads, track, plan.captions.length && plan.captionsEnabled !== false ? await motionLook(brandId, [], "caption") : undefined, vocal);
        return Response.json({ ok: true, edit });
    }
    catch (e) {
        const error = e instanceof Error ? e.message : "The export failed.";
        return Response.json({ ok: false, error: error.slice(0, 400) }, { status: 400 });
    }
    finally {
        running.delete(brandId);
    }
}
