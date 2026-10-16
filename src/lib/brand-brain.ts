import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { env } from "./env";
import { cachedFileReader } from "./file-cache";
export const PersonaSchema = z.object({
    id: z.string(),
    name: z.string(),
    summary: z.string(),
    problem: z.string(),
    trigger: z.string(),
    wants: z.string().optional(),
    language: z.array(z.string()),
});
export const ClaimSchema = z.object({
    id: z.string(),
    text: z.string(),
    status: z.enum(["substantiated", "pending", "rejected"]),
    source: z.string(),
    origin: z.enum(["brand", "website", "ad"]).optional(),
});
export const BrandBrainSchema = z.object({
    brand: z.object({
        name: z.string(),
        market: z.string(),
        currency: z.string(),
        category: z.string(),
        locale_accent: z.string(),
        one_liner: z.string(),
    }),
    products: z.array(z.object({
        id: z.string(),
        name: z.string(),
        format: z.string(),
        counted: z.string().optional(),
        cycle_days: z.number().optional(),
        ingredients: z.array(z.object({ name: z.string(), dose: z.string(), job: z.string() })).optional(),
        specs: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
        variants: z.array(z.string()).optional(),
    })),
    offers: z.array(z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        per_day: z.number().optional(),
        notes: z.string().optional(),
    })),
    guarantee: z.object({ id: z.string(), text: z.string(), window_days: z.number() }).optional(),
    personas: z.array(PersonaSchema),
    claims: z.array(ClaimSchema),
    forbidden_claims: z.array(z.string()),
    proof_assets: z.array(z.string()),
    voice: z.object({ do: z.array(z.string()), dont: z.array(z.string()), sound: z.array(z.string()).optional(), examples: z.array(z.string()).optional() }),
    market_sophistication_stage: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
});
export type BrandBrain = z.infer<typeof BrandBrainSchema>;
export type Persona = z.infer<typeof PersonaSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export class BrandBrainError extends Error {
}
export function brandBrainDir(brandDir: string): string {
    return path.join(env.BRANDS_DIR, brandDir, "brand-brain");
}
export function brandBrainPath(brandDir: string): string {
    return path.join(brandBrainDir(brandDir), "brand.json");
}
const readBrain = cachedFileReader((text, file): BrandBrain => {
    const parsed = BrandBrainSchema.safeParse(JSON.parse(text));
    if (!parsed.success)
        throw new BrandBrainError(`${file} failed validation: ${parsed.error.message}`);
    return parsed.data;
});
export function readBrandBrainFile(file: string): BrandBrain {
    if (!fs.existsSync(file)) {
        throw new BrandBrainError(`No brand.json at ${file}. Add one, or build it from the brand-brain files.`);
    }
    return structuredClone(readBrain(file));
}
export function writeBrandBrainFile(file: string, input: unknown): BrandBrain {
    const data = BrandBrainSchema.parse(input);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file))
        fs.copyFileSync(file, `${file}.bak`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf-8");
    return data;
}
export function brandCode(b: BrandBrain): string {
    const words = b.brand.name.split(/\s+/).map((w) => w.normalize("NFD").replace(/[^A-Za-z0-9]/g, "")).filter(Boolean);
    if (words.length > 1)
        return words.map((w) => w[0].toUpperCase()).join("");
    return (words[0] ?? "").slice(0, 3).toUpperCase() || "BR";
}
export function compactBrandBrain(b: BrandBrain): string {
    return JSON.stringify({
        brand: { name: b.brand.name, category: b.brand.category, one_liner: b.brand.one_liner },
        products: b.products.map((p) => ({ id: p.id, name: p.name })),
        personas: b.personas.map((p) => ({ id: p.id, name: p.name, summary: p.summary, problem: p.problem })),
        forbidden_claims: b.forbidden_claims,
    });
}
