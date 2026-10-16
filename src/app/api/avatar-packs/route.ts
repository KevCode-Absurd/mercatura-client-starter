import { activeBrandId } from "@/lib/brand-context";
import { avatarFile, listAvatars } from "@/lib/avatars/store";
import { adultProblem } from "@/lib/avatars/types";
import { createPack, listPacks, packAvailability, rerunFrame, reviewFrame } from "@/lib/avatar-packs/engine";
import { requireSameOrigin } from "@/lib/avatar-studio/catalog";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reviewInput = z.object({ packId: z.string().min(1).max(100), frameId: z.string().min(1).max(100), decision: z.enum(["kept", "rejected"]) }).strict();
export async function GET() {
    const brandId = await activeBrandId();
    const avatars = listAvatars(brandId).filter(a => a.kind === "person" && a.portrait?.replaceAll("\\", "/").startsWith(`avatars/${brandId}/${a.id}/`) && a.presenter?.age?.trim() && !adultProblem(a) && avatarFile(a.portrait)).map(a => ({ id: a.id, name: a.name, portrait: a.portrait }));
    return Response.json({ avatars, packs: listPacks(brandId), ...packAvailability() });
}
export async function POST(request: Request) {
    try {
        requireSameOrigin(request);
        if (Number(request.headers.get("content-length")) > 20000)
            return Response.json({ error: "The settings are too long." }, { status: 413 });
        const text = await request.text();
        if (text.length > 20000)
            return Response.json({ error: "The settings are too long." }, { status: 413 });
        const body = JSON.parse(text);
        const brandId = await activeBrandId();
        const { op, ...input } = body;
        let pack;
        if (op === "create")
            pack = createPack(brandId, input);
        else if (op === "review") {
            const reviewed = reviewInput.parse(input);
            pack = reviewFrame(brandId, reviewed.packId, reviewed.frameId, reviewed.decision);
        }
        else if (op === "rerun")
            pack = rerunFrame(brandId, input);
        else
            return Response.json({ error: "Choose a pack action." }, { status: 400 });
        return Response.json({ pack });
    }
    catch (error) {
        const status = typeof (error as {
            status?: unknown;
        })?.status === "number" ? (error as {
            status: number;
        }).status : 400;
        return Response.json({ error: error instanceof SyntaxError || error instanceof z.ZodError ? "Invalid pack request. Check your choices and try again." : error instanceof Error ? error.message.slice(0, 300) : "The pack could not be updated." }, { status });
    }
}
