import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { adoptLibraryAvatar } from "@/lib/avatar-studio/adopt";
import { AvatarStudioError, requireSameOrigin } from "@/lib/avatar-studio/catalog";
export const runtime = "nodejs";
export async function POST(request: Request) {
    try {
        requireSameOrigin(request);
        if (Number(request.headers.get("content-length")) > 4096)
            throw new AvatarStudioError("Request is too large.", 413);
        const text = await request.text();
        if (text.length > 4096)
            throw new AvatarStudioError("Request is too large.", 413);
        let input: unknown;
        try {
            input = JSON.parse(text);
        }
        catch {
            throw new AvatarStudioError("Invalid request.");
        }
        const avatar = await adoptLibraryAvatar(await activeBrandId(), input);
        revalidatePath("/personas");
        return Response.json({ avatar: { id: avatar.id, name: avatar.name, persona_id: avatar.persona_id } }, { status: 201 });
    }
    catch (error) {
        return Response.json({ error: error instanceof AvatarStudioError ? error.message : "The avatar could not be saved. Try again." }, { status: error instanceof AvatarStudioError ? error.status : 500 });
    }
}
