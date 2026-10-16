import { activeBrandId } from "@/lib/brand-context";
import { AvatarStudioError, requireSameOrigin } from "@/lib/avatar-studio/catalog";
import { requestGeneration } from "@/lib/avatar-studio/engine";
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
        const generation = requestGeneration(await activeBrandId(), input);
        return Response.json({ generation }, { status: ["queued", "running"].includes(generation.status) ? 202 : 200 });
    }
    catch (error) {
        return Response.json({ error: error instanceof AvatarStudioError ? error.message : "The picture could not be started." }, { status: error instanceof AvatarStudioError ? error.status : 500 });
    }
}
