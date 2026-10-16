import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { brandBrainDir } from "../brand-brain";
import { getBrandRow } from "../brands";
import { env } from "../env";
import { PRESENTER_KEYS, adultProblem, avatarId, type Avatar, type AvatarKind, type AvatarVoice } from "./types";
import { withListedVoice } from "./voices";
export { avatarCast, avatarLine } from "./types";
const short = z.string().max(300);
const Voice = z.object({
    direction: z.string().max(600).default(""),
    name: z.string().max(80).optional(),
    voice_id: z.string().max(80).optional(),
    preview: z.string().max(400).optional(),
    sample: z.string().max(300).nullable().optional(),
});
export const AvatarSchema = z.object({
    id: z.string().regex(/^ava_[a-z0-9_]{1,40}$/),
    name: z.string().min(1).max(60),
    persona_id: z.string().nullable().default(null),
    kind: z.enum(["person", "character"]),
    style: z.string().max(40).nullable().default(null),
    presenter: z.record(z.string(), short).optional(),
    character: z.string().max(600).optional(),
    portrait: z.string().max(300).nullable().default(null),
    portrait_history: z.array(z.string().max(300)).max(30).optional(),
    sheet: z.string().max(300).nullable().default(null),
    panels: z.array(z.string().max(300)).max(6).default([]),
    styled: z.record(z.string().max(40), z.object({ sheet: z.string().max(300), panels: z.array(z.string().max(300)).max(6) })).optional(),
    voice: Voice.default({ direction: "" }),
    source: z.enum(["video", "upload", "drawn", "library"]).default("drawn"),
    from_job: z.string().nullable().default(null),
    library_id: z.string().max(100).optional(),
    created_at: z.string(),
    updated_at: z.string(),
});
function dirOf(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return row.dir;
}
const fileOf = (brandId: string) => path.join(brandBrainDir(dirOf(brandId)), "avatars.json");
function read(brandId: string): {
    avatars: Avatar[];
    damaged: boolean;
} {
    const f = fileOf(brandId);
    if (!fs.existsSync(f))
        return { avatars: [], damaged: false };
    let raw: unknown;
    try {
        raw = JSON.parse(fs.readFileSync(f, "utf-8"));
    }
    catch {
        return { avatars: [], damaged: true };
    }
    const list = (raw as {
        avatars?: unknown;
    })?.avatars;
    if (!Array.isArray(list))
        return { avatars: [], damaged: true };
    const parsed = list.map((x) => AvatarSchema.safeParse(x));
    return { avatars: parsed.flatMap((x) => (x.success ? [x.data as Avatar] : [])), damaged: parsed.some((x) => !x.success) };
}
function write(brandId: string, avatars: Avatar[]) {
    const f = fileOf(brandId);
    if (read(brandId).damaged)
        fs.copyFileSync(f, path.join(path.dirname(f), `avatars.unread-${Date.now().toString(36)}.json`));
    fs.writeFileSync(f, `${JSON.stringify({ avatars }, null, 2)}\n`, "utf-8");
}
export function listAvatars(brandId: string, opts: {
    personaId?: string | null;
} = {}): Avatar[] {
    let all: Avatar[];
    try {
        all = read(brandId).avatars;
    }
    catch {
        return [];
    }
    const sorted = [...all].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return opts.personaId === undefined ? sorted : sorted.filter((a) => a.persona_id === opts.personaId);
}
export const getAvatar = (brandId: string, id: string): Avatar | undefined => listAvatars(brandId).find((a) => a.id === id);
export function freshAvatarId(brandId: string, name: string): string {
    const taken = new Set(listAvatars(brandId).map((a) => a.id));
    const base = avatarId(name).length > 4 ? avatarId(name) : "ava_avatar";
    let id = base;
    for (let n = 2; taken.has(id); n++)
        id = `${base}_${n}`;
    return id;
}
export function avatarDir(brandId: string, id: string): {
    abs: string;
    rel: string;
} {
    if (!/^ava_[a-z0-9_]{1,40}$/.test(id))
        throw new Error("Avatar not found");
    const rel = `avatars/${brandId}/${id}`;
    const abs = path.join(env.DATA_DIR, "assets", rel);
    fs.mkdirSync(abs, { recursive: true });
    return { abs, rel };
}
export function avatarFile(rel: string | null | undefined): string | null {
    if (!rel)
        return null;
    const root = path.join(env.DATA_DIR, "assets");
    const abs = path.resolve(root, rel);
    return abs.startsWith(root + path.sep) && fs.existsSync(abs) ? abs : null;
}
export type AvatarInput = Partial<Omit<Avatar, "created_at" | "updated_at">> & {
    name: string;
};
export function saveAvatar(brandId: string, input: AvatarInput): Avatar {
    const now = new Date().toISOString();
    const all = read(brandId).avatars;
    const was = input.id ? all.find((a) => a.id === input.id) : undefined;
    if (input.id && !was)
        throw new Error("That avatar is no longer saved.");
    const kind: AvatarKind = input.kind ?? was?.kind ?? "person";
    const given = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as AvatarInput;
    const merged = { ...(was ?? { persona_id: null, style: null, portrait: null, sheet: null, panels: [], voice: { direction: "" }, source: "drawn" as const, from_job: null }), ...given, kind };
    const presenter = kind === "person" ? Object.fromEntries(PRESENTER_KEYS.map((k) => [k, (merged.presenter?.[k] ?? "").trim()])) : undefined;
    const next = AvatarSchema.parse({
        ...merged,
        id: was?.id ?? freshAvatarId(brandId, input.name),
        name: input.name.trim().slice(0, 60),
        presenter,
        character: kind === "character" ? (merged.character ?? "").trim() : undefined,
        style: kind === "character" ? merged.style || null : null,
        voice: { ...merged.voice, direction: (merged.voice?.direction ?? "").trim() },
        created_at: was?.created_at ?? now,
        updated_at: now,
    }) as Avatar;
    const child = adultProblem(next);
    if (child)
        throw new Error(child);
    write(brandId, [...all.filter((a) => a.id !== next.id), next].sort((a, b) => a.created_at.localeCompare(b.created_at)));
    return next;
}
export function setAvatarVoice(brandId: string, id: string, patch: {
    direction?: string;
    voice_id?: string | null;
    sample?: string | null;
}): Avatar {
    const a = getAvatar(brandId, id);
    if (!a)
        throw new Error("That avatar is no longer saved.");
    let voice: AvatarVoice = { ...a.voice };
    if (patch.direction !== undefined)
        voice.direction = patch.direction;
    if (patch.voice_id !== undefined)
        voice = withListedVoice(voice, patch.voice_id);
    if (patch.sample !== undefined) {
        const old = avatarFile(a.voice.sample);
        if (old && a.voice.sample !== patch.sample)
            fs.rmSync(old, { force: true });
        voice.sample = patch.sample;
    }
    return saveAvatar(brandId, { id: a.id, name: a.name, voice });
}
export function deleteAvatar(brandId: string, id: string): void {
    const all = read(brandId).avatars;
    if (!all.some((a) => a.id === id))
        return;
    write(brandId, all.filter((a) => a.id !== id));
    fs.rmSync(avatarDir(brandId, id).abs, { recursive: true, force: true });
}
export function detachAvatars(brandId: string, personaId: string): number {
    const all = read(brandId).avatars;
    const mine = all.filter((a) => a.persona_id === personaId);
    if (!mine.length)
        return 0;
    const now = new Date().toISOString();
    write(brandId, all.map((a) => (a.persona_id === personaId ? { ...a, persona_id: null, updated_at: now } : a)));
    return mine.length;
}
export function avatarsFor(brandId: string, opts: {
    kind: AvatarKind;
    style?: string | null;
    personaId?: string | null;
}): Avatar[] {
    const fits = listAvatars(brandId).filter((a) => a.kind === "person" || (opts.kind === "character" && (!a.style || !opts.style || a.style === opts.style)));
    const rank = (a: Avatar) => (a.kind !== opts.kind ? 4 : 0) + (opts.personaId && a.persona_id === opts.personaId ? 0 : 2) + (a.kind === "character" && opts.style && a.style !== opts.style ? 1 : 0);
    return fits.sort((a, b) => rank(a) - rank(b) || b.updated_at.localeCompare(a.updated_at));
}
