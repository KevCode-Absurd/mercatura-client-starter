import { revalidatePath } from "next/cache";
import { activeBrandId } from "@/lib/brand-context";
import { getPersona } from "@/lib/personas/store";
import { addAvatarUpload } from "@/lib/avatars/upload";
export async function POST(req: Request) {
    try {
        const brandId = await activeBrandId();
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File))
            return Response.json({ ok: false, error: "Choose a file first." }, { status: 400 });
        const kind = String(form.get("kind") ?? "");
        if (kind !== "portrait" && kind !== "voice")
            return Response.json({ ok: false, error: "Choose a picture or a recording." }, { status: 400 });
        const text = (k: string) => String(form.get(k) ?? "").trim();
        const personaId = text("persona_id");
        if (personaId && !getPersona(brandId, personaId))
            return Response.json({ ok: false, error: "That persona is no longer saved." }, { status: 400 });
        const avatar = await addAvatarUpload(brandId, {
            kind,
            fileName: file.name,
            bytes: Buffer.from(await file.arrayBuffer()),
            avatarId: text("avatar_id") || undefined,
            name: text("name"),
            personaId: personaId || null,
            avatarKind: text("avatar_kind") === "person" ? "person" : "character",
            style: text("style") || null,
            stated: form.get("stated") === "yes",
        });
        revalidatePath("/personas");
        return Response.json({ ok: true, avatar });
    }
    catch (e) {
        return Response.json({ ok: false, error: (e as Error).message.slice(0, 300) }, { status: 400 });
    }
}
