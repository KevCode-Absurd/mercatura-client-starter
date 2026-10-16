import { activeBrandId } from "@/lib/brand-context";
import { addReference, AvatarStudioError, requireSameOrigin } from "@/lib/avatar-studio/catalog";
export const runtime = "nodejs";
export async function POST(request: Request) {
    try {
        requireSameOrigin(request);
        if (Number(request.headers.get("content-length")) > 21 * 1024 * 1024)
            throw new AvatarStudioError("Choose a photo under 20 MB.", 413);
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File) || file.size > 20 * 1024 * 1024)
            throw new AvatarStudioError("Choose a JPG, PNG or WebP photo under 20 MB.");
        const aesthetic = await addReference(await activeBrandId(), Buffer.from(await file.arrayBuffer()), String(form.get("title") ?? ""), form.get("rightsConfirmed") === "true");
        return Response.json({ aesthetic }, { status: 201 });
    }
    catch (error) {
        return Response.json({ error: error instanceof AvatarStudioError ? error.message : "The photo could not be added. Try again." }, { status: error instanceof AvatarStudioError ? error.status : 500 });
    }
}
