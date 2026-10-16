"use server";
import { noteFields } from "@/lib/hand-edits";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { deleteAvatar, getAvatar, listAvatars, saveAvatar, setAvatarVoice } from "@/lib/avatars/store";
import { adultProblem, avatarLine, type Avatar } from "@/lib/avatars/types";
import { withListedVoice } from "@/lib/avatars/voices";
import { activeBrandId } from "@/lib/brand-context";
import { enqueue } from "@/lib/jobs/queue";
import { llmEnabled } from "@/lib/llm/gateway";
import { doubtsOf, markEdits, personaForScreen } from "@/lib/personas/doubts";
import { fillDoubts } from "@/lib/personas/doubts-fill";
import { deletePersona, freshId, getPersona, listPersonas, savePersona } from "@/lib/personas/store";
import { PERSONA_AWARENESS, type PersonaProfile } from "@/lib/personas/types";
import { errorText } from "@/lib/plain-message";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const fail = (e: unknown): {
    ok: false;
    error: string;
} => ({ ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check the form.") : errorText(e) });
const working = (brandId: string) => !!db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(eq(schema.jobs.kind, "personas"), eq(schema.jobs.ref_id, brandId), inArray(schema.jobs.status, ["queued", "running"]))).get();
export interface PersonasStatus {
    personas: PersonaProfile[];
    avatars: Avatar[];
    busy: boolean;
    lastError: string | null;
}
export async function personasStatusAction(): Promise<Result<PersonasStatus>> {
    try {
        const brandId = await activeBrandId();
        const failed = db.select({ error: schema.jobs.error, at: schema.jobs.updated_at }).from(schema.jobs).where(and(eq(schema.jobs.kind, "personas"), eq(schema.jobs.ref_id, brandId), eq(schema.jobs.status, "failed"))).all().sort((a, b) => b.at.localeCompare(a.at))[0];
        return { ok: true, personas: listPersonas(brandId).map(personaForScreen), avatars: listAvatars(brandId), busy: working(brandId), lastError: failed?.error ?? null };
    }
    catch (e) {
        return fail(e);
    }
}
const Build = z.object({ count: z.number().int().min(1).max(10), notes: z.string().max(600).optional(), draw: z.boolean().default(true) });
export async function buildPersonasAction(input: z.input<typeof Build>): Promise<Result> {
    try {
        const b = Build.parse(input);
        const brandId = await activeBrandId();
        if (!llmEnabled())
            return { ok: false, error: "Building personas needs live mode. In mock mode, write one by hand." };
        if (working(brandId))
            return { ok: false, error: "Personas are already being built. Wait for it to finish." };
        db.delete(schema.jobs).where(and(eq(schema.jobs.kind, "personas"), eq(schema.jobs.ref_id, brandId), eq(schema.jobs.status, "failed"))).run();
        enqueue(brandId, "personas", brandId, { op: "build", ...b });
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function drawPersonasAction(ids: string[]): Promise<Result> {
    try {
        const brandId = await activeBrandId();
        if (!llmEnabled())
            return { ok: false, error: "Drawing a persona needs live mode." };
        if (working(brandId))
            return { ok: false, error: "Personas are being worked on. Wait for it to finish." };
        const known = ids.filter((id) => getPersona(brandId, id));
        if (!known.length)
            return { ok: false, error: "Persona not found." };
        db.delete(schema.jobs).where(and(eq(schema.jobs.kind, "personas"), eq(schema.jobs.ref_id, brandId), eq(schema.jobs.status, "failed"))).run();
        enqueue(brandId, "personas", brandId, { op: "draw", ids: known });
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
const lines = z.array(z.string().max(200)).max(8);
const Save = z.object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Give the persona a name.").max(60),
    summary: z.string().trim().min(4, "Say who they are in a sentence.").max(400),
    problem: z.string().trim().min(4, "Say what they are living with.").max(300),
    trigger: z.string().trim().max(300),
    language: lines,
    who: z.object({ age: z.string().max(40), gender: z.string().max(40), life: z.string().max(200) }),
    wants: z.string().trim().max(300),
    identity: z.string().trim().max(300).default(""),
    notes: z.string().trim().max(600).default(""),
    objections: lines.default([]),
    doubts: z.array(z.object({ doubt: z.string().max(200), proof: z.string().max(300) })).max(8).optional(),
    tried: z.array(z.string().max(300)).max(8).default([]),
    believes: z.array(z.string().max(300)).max(8).default([]),
    angle: z.string().trim().max(300),
    awareness: z.enum(PERSONA_AWARENESS),
    product_ids: z.array(z.string()).max(8),
    offer_id: z.string().nullable(),
    sounds_like: lines,
    look: z.string().trim().max(500),
    status: z.enum(["active", "draft"]),
});
export async function savePersonaAction(input: z.input<typeof Save>): Promise<Result<{
    persona: PersonaProfile;
}>> {
    try {
        const p = Save.parse(input);
        const brandId = await activeBrandId();
        const was = p.id ? getPersona(brandId, p.id) : undefined;
        if (p.id && !was)
            return { ok: false, error: "Persona not found." };
        const doubts = p.doubts ? markEdits(was ? doubtsOf(was) : [], p.doubts) : was?.doubts;
        const persona = savePersona(brandId, { ...(was ?? { share: null, performance: null, source: "hand" as const, basis: "Written by hand", image: null }), ...p, doubts, id: was?.id ?? freshId(brandId, p.name) });
        if (was && was.source !== "hand")
            noteFields(brandId, persona.id, "persona", was, persona, { look: "image_scene" });
        revalidatePath("/personas");
        revalidatePath("/brand");
        return { ok: true, persona: personaForScreen(persona) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function setPersonaStatusAction(id: string, status: "active" | "draft"): Promise<Result<{
    persona: PersonaProfile;
}>> {
    try {
        const brandId = await activeBrandId();
        const was = getPersona(brandId, id);
        if (!was)
            return { ok: false, error: "Persona not found." };
        const persona = savePersona(brandId, { ...was, status });
        revalidatePath("/personas");
        revalidatePath("/brand");
        return { ok: true, persona };
    }
    catch (e) {
        return fail(e);
    }
}
export async function fillDoubtsAction(id: string): Promise<Result<{
    persona: PersonaProfile;
    open: number;
}>> {
    try {
        const brandId = await activeBrandId();
        const res = await fillDoubts(brandId, id);
        revalidatePath("/personas");
        return { ok: true, persona: personaForScreen(res.persona), open: res.open };
    }
    catch (e) {
        return fail(e);
    }
}
export async function fillMissingDoubtsAction(): Promise<Result<{
    count: number;
}>> {
    try {
        const brandId = await activeBrandId();
        if (!llmEnabled())
            return { ok: false, error: "Filling doubts and proofs needs live mode. In mock mode, write them by hand." };
        if (working(brandId))
            return { ok: false, error: "Personas are being worked on. Wait for it to finish." };
        const ids = listPersonas(brandId).filter((p) => !doubtsOf(p).some((d) => d.proof)).map((p) => p.id);
        if (!ids.length)
            return { ok: false, error: "Every persona already has doubts and proofs." };
        db.delete(schema.jobs).where(and(eq(schema.jobs.kind, "personas"), eq(schema.jobs.ref_id, brandId), eq(schema.jobs.status, "failed"))).run();
        enqueue(brandId, "personas", brandId, { op: "doubts", ids });
        return { ok: true, count: ids.length };
    }
    catch (e) {
        return fail(e);
    }
}
export async function deletePersonaAction(id: string): Promise<Result> {
    try {
        deletePersona(await activeBrandId(), id);
        revalidatePath("/personas");
        revalidatePath("/brand");
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
const part = z.string().trim().max(300);
const AvatarSave = z.object({
    id: z.string().optional(),
    persona_id: z.string().nullable(),
    name: z.string().trim().min(2, "Give the avatar a name.").max(60),
    kind: z.enum(["person", "character"]),
    style: z.string().max(40).nullable().default(null),
    presenter: z.object({ gender: part, age: part, skin_tone: part, eyes: part, hair: part, wardrobe: part, features: part }).partial().optional(),
    character: z.string().trim().max(600).default(""),
    voice: z.object({ direction: z.string().trim().max(600), voice_id: z.string().nullable() }).optional(),
});
export async function saveAvatarAction(input: z.input<typeof AvatarSave>): Promise<Result<{
    avatar: Avatar;
}>> {
    try {
        const a = AvatarSave.parse(input);
        const brandId = await activeBrandId();
        const was = a.id ? getAvatar(brandId, a.id) : undefined;
        if (a.id && !was)
            return { ok: false, error: "That avatar is no longer saved." };
        if (a.persona_id && !getPersona(brandId, a.persona_id))
            return { ok: false, error: "That persona is no longer saved." };
        const voice = a.voice ? withListedVoice({ ...(was?.voice ?? { direction: "" }), direction: a.voice.direction }, a.voice.voice_id) : undefined;
        const avatar = saveAvatar(brandId, { id: was?.id, name: a.name, persona_id: a.persona_id, kind: a.kind, style: a.style, presenter: a.kind === "person" ? (a.presenter ?? {}) : undefined, character: a.kind === "character" ? a.character : undefined, voice, ...(was ? {} : { source: "drawn" as const }) });
        revalidatePath("/personas");
        return { ok: true, avatar };
    }
    catch (e) {
        return fail(e);
    }
}
export async function setAvatarVoiceAction(id: string, patch: {
    direction?: string;
    voice_id?: string | null;
    clear_sample?: boolean;
}): Promise<Result<{
    avatar: Avatar;
}>> {
    try {
        const p = z.object({ direction: z.string().trim().max(600).optional(), voice_id: z.string().nullable().optional(), clear_sample: z.boolean().optional() }).parse(patch);
        const avatar = setAvatarVoice(await activeBrandId(), id, { direction: p.direction, voice_id: p.voice_id, ...(p.clear_sample ? { sample: null } : {}) });
        revalidatePath("/personas");
        return { ok: true, avatar };
    }
    catch (e) {
        return fail(e);
    }
}
export async function drawAvatarAction(id: string): Promise<Result> {
    try {
        const brandId = await activeBrandId();
        if (!llmEnabled())
            return { ok: false, error: "Drawing an avatar needs live mode." };
        const a = getAvatar(brandId, id);
        if (!a)
            return { ok: false, error: "That avatar is no longer saved." };
        if (!avatarLine(a))
            return { ok: false, error: "Describe the avatar first: its picture is drawn from the description." };
        const child = adultProblem(a);
        if (child)
            return { ok: false, error: child };
        if (working(brandId))
            return { ok: false, error: "A picture is already being drawn. Wait for it to finish." };
        db.delete(schema.jobs).where(and(eq(schema.jobs.kind, "personas"), eq(schema.jobs.ref_id, brandId), eq(schema.jobs.status, "failed"))).run();
        enqueue(brandId, "personas", brandId, { op: "avatar", ids: [a.id] });
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function deleteAvatarAction(id: string): Promise<Result> {
    try {
        deleteAvatar(await activeBrandId(), id);
        revalidatePath("/personas");
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
