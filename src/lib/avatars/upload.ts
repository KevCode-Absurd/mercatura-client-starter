import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { FORMAT_RECIPES } from "../formats";
import { avatarDir, getAvatar, saveAvatar, setAvatarVoice } from "./store";
import type { Avatar, AvatarKind } from "./types";
export const AVATAR_PICTURE_MAX = 20 * 1024 * 1024;
export const AVATAR_VOICE_MAX = 10 * 1024 * 1024;
const PICTURES = [".png", ".jpg", ".jpeg", ".webp"];
const VOICES = [".mp3", ".wav", ".m4a"];
export interface AvatarUpload {
    kind: "portrait" | "voice";
    fileName: string;
    bytes: Buffer;
    avatarId?: string;
    name?: string;
    personaId?: string | null;
    avatarKind?: AvatarKind;
    style?: string | null;
    stated: boolean;
}
function soundsRight(ext: string, b: Buffer): boolean {
    if (b.length < 12)
        return false;
    if (ext === ".wav")
        return b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WAVE";
    if (ext === ".m4a")
        return b.toString("latin1", 4, 8) === "ftyp";
    return b.toString("latin1", 0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
}
export function uploadProblem(u: Pick<AvatarUpload, "kind" | "fileName" | "bytes" | "stated" | "avatarId" | "name">): string | null {
    const ext = path.extname(u.fileName).toLowerCase();
    if (u.kind === "portrait") {
        if (!u.stated)
            return "Tick the box first: an avatar is a character your team made, never a real person. A real person goes in Real people on the Brand screen, with their consent.";
        if (!PICTURES.includes(ext))
            return "Use a PNG, JPG or WebP picture.";
        if (u.bytes.length > AVATAR_PICTURE_MAX)
            return "The picture is over 20 MB. Use a smaller one.";
        if (!u.avatarId && !(u.name ?? "").trim())
            return "Give the avatar a name first.";
        return null;
    }
    if (!u.avatarId)
        return "Save the avatar first, then add its voice.";
    if (!u.stated)
        return "Tick the box first: say this voice is yours to use in ads.";
    if (!VOICES.includes(ext))
        return "Use an MP3, WAV or M4A recording.";
    if (u.bytes.length > AVATAR_VOICE_MAX)
        return "The recording is over 10 MB. Use a shorter one: 10 to 30 seconds is enough.";
    if (!soundsRight(ext, u.bytes))
        return "That file could not be read as a recording. Use an MP3, WAV or M4A recording.";
    return null;
}
export async function addAvatarUpload(brandId: string, u: AvatarUpload): Promise<Avatar> {
    const problem = uploadProblem(u);
    if (problem)
        throw new Error(problem);
    const was = u.avatarId ? getAvatar(brandId, u.avatarId) : undefined;
    if (u.avatarId && !was)
        throw new Error("That avatar is no longer saved.");
    const stamp = Date.now().toString(36);
    if (u.kind === "voice") {
        const dir = avatarDir(brandId, was!.id);
        const file = `voice-${stamp}${path.extname(u.fileName).toLowerCase()}`;
        fs.writeFileSync(path.join(dir.abs, file), u.bytes);
        return setAvatarVoice(brandId, was!.id, { sample: `${dir.rel}/${file}` });
    }
    let png: Buffer;
    try {
        png = await sharp(u.bytes).rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).png().toBuffer();
    }
    catch {
        throw new Error("That file could not be read as a picture. Use a PNG, JPG or WebP picture.");
    }
    const style = u.style && FORMAT_RECIPES.some((r) => r.id === u.style) ? u.style : null;
    const a = was ?? saveAvatar(brandId, { name: u.name!.trim(), persona_id: u.personaId ?? null, kind: u.avatarKind ?? "character", style, source: "upload" });
    const dir = avatarDir(brandId, a.id);
    const file = `portrait-${stamp}.png`;
    fs.writeFileSync(path.join(dir.abs, file), png);
    return saveAvatar(brandId, { id: a.id, name: a.name, portrait: `${dir.rel}/${file}`, sheet: null, panels: [], styled: {} });
}
