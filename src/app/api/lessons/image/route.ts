import sharp from "sharp";
import { activeBrandId } from "@/lib/brand-context";
import { lessonImagePath, updateLesson } from "@/lib/lessons";
const MAX_BYTES = 12 * 1024 * 1024;
export async function POST(req: Request) {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    const body = Buffer.from(await req.arrayBuffer());
    if (!body.length)
        return Response.json({ ok: false, error: "The file was empty." }, { status: 400 });
    if (body.length > MAX_BYTES)
        return Response.json({ ok: false, error: "That photo is over 12 MB. Use a smaller one." }, { status: 413 });
    try {
        const brandId = await activeBrandId();
        const file = lessonImagePath(brandId, id.replace(/[^A-Za-z0-9-]/g, ""), ".jpg");
        await sharp(body).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toFile(file.abs);
        const lesson = updateLesson(brandId, id, { image: file.rel });
        return Response.json({ ok: true, lesson });
    }
    catch (e) {
        const message = (e as Error).message;
        return Response.json({ ok: false, error: /unsupported image|Input buffer/i.test(message) ? "That file isn't an image the app can read. Use a JPG, PNG or WebP." : message }, { status: 400 });
    }
}
export async function DELETE(req: Request) {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    try {
        return Response.json({ ok: true, lesson: updateLesson(await activeBrandId(), id, { image: "" }) });
    }
    catch (e) {
        return Response.json({ ok: false, error: (e as Error).message }, { status: 400 });
    }
}
