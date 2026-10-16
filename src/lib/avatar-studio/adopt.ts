import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { z } from "zod";
import { db, schema } from "@/db";
import { avatarDir, saveAvatar } from "../avatars/store";
import { adultProblem, type Avatar } from "../avatars/types";
import { getPersona } from "../personas/store";
import { AvatarStudioError, readCatalog } from "./catalog";
import { CHANGED_PICTURE, allowedMedia } from "./engine";
import type { AvatarTags } from "./types";
const adoptSchema = z.object({
    avatarId: z.string().max(100),
    generationId: z.string().max(100).optional(),
    name: z.string().trim().min(2, "Give the avatar a name.").max(60, "Use a name of 60 characters or fewer."),
    personaId: z.string().max(100).nullable().optional(),
}).strict();
const GENDER: Record<AvatarTags["gender"], string> = { Female: "woman", Male: "man", Nonbinary: "nonbinary person" };
export function presenterFromTags(tags?: AvatarTags): Record<string, string> {
    if (!tags)
        return { features: "an adult, as in the saved picture" };
    return { gender: GENDER[tags.gender], age: String(tags.age), skin_tone: tags.skinTone.toLowerCase() };
}
export async function adoptLibraryAvatar(brandId: string, input: unknown): Promise<Avatar> {
    const parsed = adoptSchema.safeParse(input);
    if (!parsed.success)
        throw new AvatarStudioError(parsed.error.issues.find((i) => i.path[0] === "name")?.message ?? "Choose an avatar first.");
    const request = parsed.data;
    if (request.personaId && !getPersona(brandId, request.personaId))
        throw new AvatarStudioError("That persona is no longer saved. Choose another, or none.");
    const avatars = readCatalog().avatars;
    let listed = avatars.find((a) => a.id === request.avatarId);
    let libraryId = request.avatarId;
    let relative: string;
    if (request.generationId) {
        const job = db.select().from(schema.jobs).where(and(eq(schema.jobs.id, request.generationId), eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, "avatar_studio"))).get();
        const made = job?.payload as {
            avatarId?: string;
            image?: string;
        } | undefined;
        if (!job || job.status !== "done" || !made?.image)
            throw new AvatarStudioError("That picture is not ready, or is no longer saved.", 404);
        listed = avatars.find((a) => a.id === made.avatarId);
        if (made.avatarId)
            libraryId = made.avatarId;
        relative = made.image;
    }
    else {
        if (!listed)
            throw new AvatarStudioError("That avatar is no longer in the library. Choose another.", 404);
        relative = listed.portrait;
    }
    const bytes = fs.readFileSync(allowedMedia(brandId, relative));
    if (!request.generationId && createHash("sha256").update(bytes).digest("hex") !== listed!.sha256)
        throw new AvatarStudioError(CHANGED_PICTURE, 409);
    let png: Buffer;
    try {
        png = await sharp(bytes).rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).png().toBuffer();
    }
    catch {
        throw new AvatarStudioError("That picture could not be read. Choose another.");
    }
    const presenter = presenterFromTags(listed?.tags);
    const child = adultProblem({ kind: "person", presenter });
    if (child)
        throw new AvatarStudioError(child);
    const saved = saveAvatar(brandId, { name: request.name, persona_id: request.personaId ?? null, kind: "person", presenter, source: "library", library_id: libraryId });
    const dir = avatarDir(brandId, saved.id);
    const name = `portrait-${Date.now().toString(36)}.png`;
    fs.writeFileSync(path.join(dir.abs, name), png);
    return saveAvatar(brandId, { id: saved.id, name: saved.name, portrait: `${dir.rel}/${name}` });
}
