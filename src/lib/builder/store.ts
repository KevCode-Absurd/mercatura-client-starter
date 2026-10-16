import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { brandBrainDir } from "../brand-brain";
import { getBrandRow } from "../brands";
import { CATALOGUE, formatById } from "../catalogue";
import { AWARENESS_STAGES } from "../taxonomy";
import { INDIRECT_FORMAT } from "../scripts/indirect";
import { FORMAT_STAGES, type Angle, type BuilderFormat, type CustomFormat } from "./types";
const AngleSchema = z.object({
    id: z.string().regex(/^ang_[a-z0-9_]{2,40}$/),
    name: z.string().trim().min(2).max(60),
    line: z.string().trim().min(8).max(500),
    persona_ids: z.array(z.string()).max(40).default([]),
    stages: z.array(z.enum(AWARENESS_STAGES)).max(5).default([]),
    basis: z.string().max(300).default(""),
    notes: z.string().max(600).default(""),
    created_at: z.string(),
    updated_at: z.string(),
});
const FormatSchema = z.object({ id: z.string().regex(/^fmt_[a-z0-9_]{2,40}$/), name: z.string().trim().min(2).max(60), how: z.string().trim().min(4).max(600), base: z.string() });
function dirOf(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return row.dir;
}
const fileOf = (brandId: string, name: string) => path.join(brandBrainDir(dirOf(brandId)), name);
function readList<T>(file: string, key: string, schema: z.ZodType<T>): T[] {
    if (!fs.existsSync(file))
        return [];
    const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
    return z.array(schema).parse(raw?.[key] ?? []);
}
const writeList = (file: string, key: string, list: unknown[]) => fs.writeFileSync(file, `${JSON.stringify({ [key]: list }, null, 2)}\n`);
const slug = (s: string) => s
    .toLowerCase()
    .replace(/^the\s+/, "")
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28);
function fresh(prefix: string, name: string, taken: Set<string>): string {
    const base = `${prefix}_${slug(name) || "new"}`;
    let id = base;
    for (let n = 2; taken.has(id); n++)
        id = `${base}_${n}`;
    return id;
}
export const listAngles = (brandId: string): Angle[] => readList(fileOf(brandId, "angles.json"), "angles", AngleSchema) as Angle[];
export function saveAngle(brandId: string, input: {
    id?: string;
    name: string;
    line: string;
    persona_ids?: string[];
    stages?: string[];
    basis?: string;
    notes?: string;
}): Angle {
    const all = listAngles(brandId);
    const was = input.id ? all.find((a) => a.id === input.id) : undefined;
    const now = new Date().toISOString();
    const next = AngleSchema.parse({ ...was, ...input, id: was?.id ?? fresh("ang", input.name, new Set(all.map((a) => a.id))), created_at: was?.created_at ?? now, updated_at: now }) as Angle;
    writeList(fileOf(brandId, "angles.json"), "angles", was ? all.map((a) => (a.id === next.id ? next : a)) : [...all, next]);
    return next;
}
export function deleteAngle(brandId: string, id: string) {
    writeList(fileOf(brandId, "angles.json"), "angles", listAngles(brandId).filter((a) => a.id !== id));
}
export const listCustomFormats = (brandId: string): CustomFormat[] => readList(fileOf(brandId, "formats.json"), "formats", FormatSchema) as CustomFormat[];
export function builderFormats(brandId: string): BuilderFormat[] {
    const built = CATALOGUE.filter((f) => f.start.how === "script").map((f) => ({ id: f.id, name: f.label, medium: f.medium as string, note: f.makes, custom: false, stages: FORMAT_STAGES[f.id] ?? [] }));
    const native: BuilderFormat = { id: "native", name: "Native ad", medium: "image", note: formatById("native")?.makes ?? "A long first-person story with an image that looks like a person's own post", custom: false, stages: FORMAT_STAGES.native };
    const own = listCustomFormats(brandId).map((f) => ({ id: f.id, name: f.name, medium: (formatById(f.base)?.medium as string) ?? "video", note: f.how, custom: true, stages: FORMAT_STAGES[f.base] ?? [] }));
    const cold: BuilderFormat = { id: INDIRECT_FORMAT.id, name: INDIRECT_FORMAT.name, medium: "image", note: INDIRECT_FORMAT.note, custom: false, stages: FORMAT_STAGES[INDIRECT_FORMAT.id] };
    return [...built.filter((f) => f.medium === "video"), ...built.filter((f) => f.medium === "image"), native, cold, ...built.filter((f) => f.medium === "brief"), ...own];
}
export function saveCustomFormat(brandId: string, input: {
    id?: string;
    name: string;
    how: string;
    base: string;
}): CustomFormat {
    if (formatById(input.base)?.start.how !== "script")
        throw new Error("Pick the built-in format it is made as.");
    const all = listCustomFormats(brandId);
    const was = input.id ? all.find((f) => f.id === input.id) : undefined;
    const next = FormatSchema.parse({ ...input, id: was?.id ?? fresh("fmt", input.name, new Set(all.map((f) => f.id))) }) as CustomFormat;
    writeList(fileOf(brandId, "formats.json"), "formats", was ? all.map((f) => (f.id === next.id ? next : f)) : [...all, next]);
    return next;
}
export function deleteCustomFormat(brandId: string, id: string) {
    writeList(fileOf(brandId, "formats.json"), "formats", listCustomFormats(brandId).filter((f) => f.id !== id));
}
export { deleteSimpleOffer, isBuilderOffer, listBrandOffers, listOfferFits, saveSimpleOffer, type BrandOffer, type SimpleOffer } from "../offers/book";
