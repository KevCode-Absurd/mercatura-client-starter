import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { brandBrainDir, brandBrainPath, readBrandBrainFile, writeBrandBrainFile, type BrandBrain } from "../brand-brain";
import { getBrandRow } from "../brands";
import { detachAvatars } from "../avatars/store";
import { proofLines, withDoubts } from "./doubts";
import { PERSONA_AWARENESS, personaCore, personaId, type PersonaProfile } from "./types";
const Performance = z.object({ simulated: z.boolean(), period: z.string(), segment: z.string(), spend: z.number(), purchases: z.number(), revenue: z.number(), spend_share: z.number(), cpa: z.number(), roas: z.number(), aov: z.number() });
export const ProfileSchema = z.object({
    id: z.string().regex(/^per_[a-z0-9_]{2,40}$/),
    name: z.string().min(2).max(60),
    summary: z.string().min(4).max(400),
    problem: z.string().min(4).max(300),
    trigger: z.string().max(300).default(""),
    language: z.array(z.string().max(160)).max(8).default([]),
    who: z.object({ age: z.string().max(40).default(""), gender: z.string().max(40).default(""), life: z.string().max(200).default("") }).default({ age: "", gender: "", life: "" }),
    wants: z.string().max(300).default(""),
    identity: z.string().max(300).default(""),
    notes: z.string().max(600).default(""),
    objections: z.array(z.string().max(200)).max(8).default([]),
    doubts: z.array(z.object({ doubt: z.string().min(1).max(200), proof: z.string().max(300).default(""), by: z.enum(["app", "owner"]).default("app") })).max(8).optional(),
    tried: z.array(z.string().max(300)).max(8).default([]),
    believes: z.array(z.string().max(520)).max(12).default([]),
    angle: z.string().max(300).default(""),
    awareness: z.enum(PERSONA_AWARENESS).default("problem_aware"),
    product_ids: z.array(z.string()).max(8).default([]),
    offer_id: z.string().nullable().default(null),
    sounds_like: z.array(z.string().max(160)).max(8).default([]),
    share: z.number().min(0).max(100).nullable().default(null),
    performance: Performance.nullable().default(null),
    source: z.enum(["documents", "data", "hand", "offer"]).default("hand"),
    basis: z.string().max(300).default(""),
    look: z.string().max(500).default(""),
    image: z.string().nullable().default(null),
    status: z.enum(["active", "draft"]).default("draft"),
    created_at: z.string(),
    updated_at: z.string(),
});
const FileSchema = z.object({ personas: z.array(ProfileSchema).default([]) });
function dirOf(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return row.dir;
}
const fileOf = (brandId: string) => path.join(brandBrainDir(dirOf(brandId)), "personas.json");
function readProfiles(brandId: string): PersonaProfile[] {
    const f = fileOf(brandId);
    if (!fs.existsSync(f))
        return [];
    const parsed = FileSchema.safeParse(JSON.parse(fs.readFileSync(f, "utf-8")));
    return parsed.success ? parsed.data.personas : [];
}
function writeProfiles(brandId: string, personas: PersonaProfile[]) {
    fs.writeFileSync(fileOf(brandId), `${JSON.stringify({ personas }, null, 2)}\n`, "utf-8");
}
const shareIn = (summary: string) => {
    const m = /about (\d{1,2})%/i.exec(summary);
    return m ? Number(m[1]) : null;
};
function fromBrand(p: BrandBrain["personas"][number], brand: BrandBrain): PersonaProfile {
    const now = new Date().toISOString();
    return { ...p, who: { age: "", gender: "", life: "" }, wants: "", objections: [], angle: "", awareness: "problem_aware", product_ids: brand.products.length === 1 ? [brand.products[0].id] : [], offer_id: null, sounds_like: [], share: shareIn(p.summary), performance: null, source: "documents", basis: "The brand's own documents (customer avatars)", look: "", image: null, status: "active", created_at: now, updated_at: now };
}
export function listPersonas(brandId: string): PersonaProfile[] {
    let brand: BrandBrain;
    try {
        brand = readBrandBrainFile(brandBrainPath(dirOf(brandId)));
    }
    catch {
        return [];
    }
    const profiles = new Map(readProfiles(brandId).map((p) => [p.id, p]));
    const active = brand.personas.map((p) => {
        const mine = profiles.get(p.id);
        profiles.delete(p.id);
        return mine ? { ...mine, ...p, status: "active" as const } : fromBrand(p, brand);
    });
    const drafts = [...profiles.values()].map((p) => ({ ...p, status: "draft" as const }));
    const size = (p: PersonaProfile) => p.performance?.spend_share ?? (p.share ?? 0) / 100;
    return [...active.sort((a, b) => size(b) - size(a)), ...drafts.sort((a, b) => size(b) - size(a))];
}
export const getPersona = (brandId: string, id: string) => listPersonas(brandId).find((p) => p.id === id);
export function conceptsFor(brandId: string, id: string): number {
    return db.select({ id: schema.concepts.id, p: schema.concepts.persona_id }).from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all().filter((c) => c.p === id).length;
}
export function freshId(brandId: string, name: string): string {
    const taken = new Set(listPersonas(brandId).map((p) => p.id));
    const base = personaId(name) || "per_persona";
    let id = base;
    for (let n = 2; taken.has(id); n++)
        id = `${base}_${n}`;
    return id;
}
export function savePersona(brandId: string, input: Omit<PersonaProfile, "created_at" | "updated_at"> & {
    created_at?: string;
}): PersonaProfile {
    const now = new Date().toISOString();
    const all = listPersonas(brandId);
    const was = all.find((p) => p.id === input.id);
    const lines = (d?: PersonaProfile["doubts"]) => (d ? [...proofLines(d), ...d.map((x) => x.proof)] : []);
    const derived = new Set([...lines(was?.doubts), ...lines(input.doubts)]);
    const paired = input.doubts ? withDoubts(input.doubts, (input.believes ?? []).filter((b) => !derived.has(b))) : {};
    const next = ProfileSchema.parse({ ...input, language: input.language.map((x) => x.trim()).filter(Boolean), objections: input.objections.map((x) => x.trim()).filter(Boolean), ...paired, sounds_like: input.sounds_like.map((x) => x.trim()).filter(Boolean), created_at: was?.created_at ?? input.created_at ?? now, updated_at: now }) as PersonaProfile;
    if (was?.status === "active" && next.status === "draft") {
        const n = conceptsFor(brandId, next.id);
        if (n)
            throw new Error(`${n} concept${n === 1 ? " is" : "s are"} written for this persona. It stays in use while they exist.`);
    }
    writeProfiles(brandId, [...all.filter((p) => p.id !== next.id), next].sort((a, b) => a.created_at.localeCompare(b.created_at)));
    syncBrand(brandId, next);
    return next;
}
function syncBrand(brandId: string, p: PersonaProfile) {
    const file = brandBrainPath(dirOf(brandId));
    const brand = readBrandBrainFile(file);
    const at = brand.personas.findIndex((x) => x.id === p.id);
    const core = personaCore(p);
    const same = at >= 0 && JSON.stringify(brand.personas[at]) === JSON.stringify(core);
    if (p.status === "active" && same)
        return;
    if (p.status === "draft" && at < 0)
        return;
    const personas = p.status === "active" ? (at >= 0 ? brand.personas.map((x, i) => (i === at ? core : x)) : [...brand.personas, core]) : brand.personas.filter((x) => x.id !== p.id);
    if (!personas.length)
        throw new Error("A brand needs at least 1 persona in use.");
    writeBrandBrainFile(file, { ...brand, personas });
}
export function deletePersona(brandId: string, id: string) {
    const n = conceptsFor(brandId, id);
    if (n)
        throw new Error(`${n} concept${n === 1 ? " is" : "s are"} written for this persona. Delete or move them first.`);
    const all = listPersonas(brandId);
    const p = all.find((x) => x.id === id);
    if (!p)
        return;
    if (p.status === "active")
        syncBrand(brandId, { ...p, status: "draft" });
    writeProfiles(brandId, all.filter((x) => x.id !== id));
    detachAvatars(brandId, id);
}
