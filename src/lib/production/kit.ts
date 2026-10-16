import fs from "node:fs";
import { brandVoiceText } from "../brand-voice";
import { learnedRules } from "../lessons";
import path from "node:path";
import { z } from "zod";
import type { ConceptRow, Guardrail } from "@/db/schema";
import { brandBrainDir, type BrandBrain } from "../brand-brain";
import { brandWorld, motionSound, onCameraContext, productFacts, referencePhotos, terms } from "../brain/on-camera";
import { withoutExpression } from "../studio/deal";
import { SITE_FOLDER, catalogProducts, fromPage } from "../brain/products";
import { loadBrandLook, lookContext, lookFingerprint, type BrandLook } from "../brand-look";
import { getBrandRow, loadBrandBrain } from "../brands";
import { env } from "../env";
import { callStructured } from "../llm/gateway";
import { renderPrompt } from "../prompts";
import { creativeBriefText } from "../creative-brief";
import { getCreativeBrief } from "../creative-brief-store";
import { activeGuardrails } from "../scripts/guardrails";
const Color = z.object({ name: z.string(), hex: z.string(), use: z.string() });
export const CreativeKitSchema = z.object({
    visual: z.object({ colors: z.array(Color), typography: z.string(), imagery_style: z.string(), do: z.array(z.string()), avoid: z.array(z.string()), logo_notes: z.string() }),
    voice_direction: z.string(),
    style_line: z.string(),
    products: z.array(z.object({
        product_id: z.string(),
        asset_folder: z.string(),
        hero_image: z.string(),
        extra_images: z.array(z.string()),
        packaging: z.string(),
        details: z.string(),
        handling: z.enum(["display", "hold", "use"]),
        handling_notes: z.string(),
    })),
    presenters: z.array(z.object({ persona_id: z.string(), gender: z.string(), age: z.string(), look: z.string(), wardrobe: z.string(), setting: z.string() })),
});
export type CreativeKit = z.infer<typeof CreativeKitSchema>;
const KitOut = CreativeKitSchema.extend({ visual: CreativeKitSchema.shape.visual.extend({ colors: z.array(Color).default([]), typography: z.string().default("") }) });
export function kitFacts(brand: BrandBrain): string {
    return JSON.stringify({
        brand: { name: brand.brand.name, category: brand.brand.category, market: brand.brand.market, one_liner: brand.brand.one_liner },
        products: brand.products.map((p) => ({ id: p.id, name: p.name, format: p.format, ...(p.ingredients?.length ? { ingredients: p.ingredients } : {}), ...(p.specs?.length ? { specs: p.specs } : {}), ...(p.variants?.length ? { variants: p.variants } : {}) })),
        personas: brand.personas.map((p) => ({ id: p.id, name: p.name, summary: p.summary, problem: p.problem, trigger: p.trigger })),
    }, null, 1);
}
const ROLE_WORD: Record<string, string> = { heading: "Headings", display: "Big statement lines", body: "Body text", accent: "Small tags" };
export function visualFromLook(look: BrandLook): {
    colors: CreativeKit["visual"]["colors"];
    typography: string;
} {
    const colors = look.palette.filter((p) => p.hex).slice(0, 6).map((p) => ({ name: p.name || p.role, hex: p.hex.toUpperCase(), use: p.use || p.role }));
    const typography = look.fonts.map((f) => `${ROLE_WORD[f.role] ?? f.role} in ${f.family} ${f.weight}${f.letter_case && f.letter_case !== "sentence" ? `, ${f.letter_case} case` : ""}`).join("; ");
    return { colors, typography: typography ? `${typography}.` : "" };
}
const EMPTY: CreativeKit = { visual: { colors: [], typography: "", imagery_style: "", do: [], avoid: [], logo_notes: "" }, voice_direction: "", style_line: "", products: [], presenters: [] };
function dirOf(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return brandBrainDir(row.dir);
}
const kitPath = (brandId: string) => path.join(dirOf(brandId), "creative-kit.json");
const readIf = (file: string, max = 14000) => (fs.existsSync(file) ? fs.readFileSync(file, "utf-8").slice(0, max) : "(not provided)");
function assetListing(brandId: string): Record<string, string[]> {
    const root = path.join(dirOf(brandId), "assets");
    if (!fs.existsSync(root))
        return {};
    const out: Record<string, string[]> = {};
    for (const d of fs.readdirSync(root, { withFileTypes: true })) {
        if (!d.isDirectory())
            continue;
        const files = fs.readdirSync(path.join(root, d.name)).filter((f) => /\.(webp|png|jpe?g)$/i.test(f)).sort();
        if (files.length)
            out[d.name] = files;
    }
    return out;
}
function uploadedPhotos(brandId: string, productId: string): {
    folder: string;
    files: string[];
    hero: string;
    extras: string[];
} | null {
    const files = assetListing(brandId)[productId] ?? [];
    if (!files.length)
        return null;
    const mainFile = path.join(dirOf(brandId), "assets", productId, "_main.txt");
    const named = fs.existsSync(mainFile) ? fs.readFileSync(mainFile, "utf-8").trim() : "";
    const hero = files.includes(named) ? named : files[0];
    return { folder: productId, files, hero, extras: files.filter((f) => f !== hero).slice(0, 3) };
}
function cataloguePhotos(brandId: string, productId: string): {
    folder: string;
    files: string[];
    hero: string;
    extras: string[];
} | null {
    const name = productNameOf(brandId, productId);
    const folder = name ? catalogProducts(brandId).find((c) => c.name === name)?.folder : "";
    const files = folder ? (assetListing(brandId)[folder] ?? []) : [];
    if (!folder || !files.length)
        return null;
    const mainFile = path.join(dirOf(brandId), "assets", folder, "_main.txt");
    const named = fs.existsSync(mainFile) ? fs.readFileSync(mainFile, "utf-8").trim() : "";
    const hero = files.includes(named) ? named : (files.find((f) => !fromPage(f)) ?? "");
    return { folder, files, hero, extras: [] };
}
export function loadCreativeKit(brandId: string): CreativeKit | null {
    const file = kitPath(brandId);
    if (!fs.existsSync(file))
        return null;
    const parsed = CreativeKitSchema.safeParse(JSON.parse(fs.readFileSync(file, "utf-8")));
    return parsed.success ? parsed.data : null;
}
export function saveCreativeKit(brandId: string, kit: CreativeKit) {
    fs.writeFileSync(kitPath(brandId), JSON.stringify(CreativeKitSchema.parse(kit), null, 2));
}
export async function buildCreativeKit(brandId: string): Promise<CreativeKit> {
    const brand = loadBrandBrain(brandId);
    const dir = dirOf(brandId);
    const assets = Object.fromEntries(Object.entries(assetListing(brandId))
        .filter(([folder]) => folder !== SITE_FOLDER)
        .map(([folder, files]) => [folder, files.filter((f) => !fromPage(f))] as const)
        .filter(([, files]) => files.length));
    const look = loadBrandLook(brandId);
    const p = renderPrompt("creative-kit", {
        brand_name: brand.brand.name,
        brand_voice: brandVoiceText(brandId, { surfaces: ["script"], brand }),
        lessons: learnedRules(brandId, "writes"),
        brand_facts: kitFacts(brand),
        look: look ? lookFingerprint(look) || "(the site scan read no colours or type)" : "(the site has not been scanned: take the colours and the type from the guidelines)",
        guidelines: readIf(path.join(dir, "brand-guidelines.md")),
        products: readIf(path.join(dir, "products-and-positioning.md")),
        avatars: readIf(path.join(dir, "customer-avatars.md")),
        assets: Object.keys(assets).length ? Object.entries(assets).map(([folder, files]) => `${folder}/\n${files.map((f) => `  ${f}`).join("\n")}`).join("\n") : "(no product images)",
    });
    const res = await callStructured({ brandId, task: "creative_kit", model: env.MODEL_EXTRACT, system: p.system, user: p.user, schema: KitOut, effort: "medium", maxTokens: 8000, refType: "brand", refId: brandId });
    const kit: CreativeKit = res.data;
    if (look && (look.palette.length || look.fonts.length)) {
        const v = visualFromLook(look);
        if (v.colors.length)
            kit.visual.colors = v.colors;
        if (v.typography)
            kit.visual.typography = v.typography;
    }
    for (const prod of kit.products) {
        const files = assets[prod.asset_folder] ?? [];
        if (!files.includes(prod.hero_image))
            prod.hero_image = files[0] ?? "";
        prod.extra_images = prod.extra_images.filter((f) => files.includes(f) && f !== prod.hero_image).slice(0, 3);
        if (!files.length)
            prod.asset_folder = "";
    }
    kit.products = kit.products.filter((x) => brand.products.some((b) => b.id === x.product_id));
    kit.presenters = kit.presenters.filter((x) => brand.personas.some((b) => b.id === x.persona_id));
    saveCreativeKit(brandId, kit);
    return kit;
}
export async function ensureCreativeKit(brandId: string, live: boolean): Promise<CreativeKit> {
    return loadCreativeKit(brandId) ?? (live ? await buildCreativeKit(brandId) : EMPTY);
}
function productNameOf(brandId: string, productId: string | null): string | null {
    if (!productId)
        return null;
    try {
        return loadBrandBrain(brandId).products.find((p) => p.id === productId)?.name ?? null;
    }
    catch {
        return null;
    }
}
export function photoLabel(brandId: string, productId: string | null, file: string | null | undefined): string | null {
    if (!file)
        return null;
    const hit = referencePhotos(brandId, productNameOf(brandId, productId)).find((x) => path.resolve(x.file) === path.resolve(file));
    if (!hit)
        return null;
    const r = hit.role.replace(/^is /, "");
    return `${r[0].toUpperCase()}${r.slice(1)}`;
}
export function productImages(brandId: string, kit: CreativeKit, productId: string | null): {
    hero: string | null;
    extras: string[];
} {
    const named = referencePhotos(brandId, productNameOf(brandId, productId));
    if (named.length)
        return { hero: named[0].file, extras: named.slice(1, 4).map((x) => x.file) };
    const own = productId && !kit.products.some((p) => p.product_id === productId && p.asset_folder) ? uploadedPhotos(brandId, productId) : null;
    if (own)
        return { hero: path.join(dirOf(brandId), "assets", own.folder, own.hero), extras: own.extras.map((f) => path.join(dirOf(brandId), "assets", own.folder, f)) };
    const prod = productId ? kit.products.find((p) => p.product_id === productId) : kit.products.find((p) => p.hero_image);
    if (!prod?.asset_folder)
        return { hero: null, extras: [] };
    const abs = (f: string) => path.join(dirOf(brandId), "assets", prod.asset_folder, f);
    return { hero: prod.hero_image ? abs(prod.hero_image) : null, extras: prod.extra_images.map(abs) };
}
export type ProductionStep = "brief" | "copy" | "image_prompt" | "character" | "look" | "storyboard" | "shot_plan" | "video_prompt" | "motion";
export function offerProduct(brand: BrandBrain, offerId: string | null | undefined): string | null {
    const offer = brand.offers.find((o) => o.id === offerId);
    if (!offer)
        return null;
    const words = (s: string) => new Set(s.toLowerCase().match(/[a-zà-ÿ]{4,}/g) ?? []);
    const ow = words(`${offer.name} ${offer.notes ?? ""}`);
    let best: string | null = null;
    let score = 0;
    for (const p of brand.products) {
        const n = [...words(p.name)].filter((w) => ow.has(w)).length;
        if (n > score)
            [best, score] = [p.id, n];
    }
    return best;
}
export function productForConcept(brand: BrandBrain, concept: Pick<ConceptRow, "offer_id"> & Partial<Pick<ConceptRow, "product_id">>): string | null {
    if (concept.product_id && brand.products.some((p) => p.id === concept.product_id))
        return concept.product_id;
    return offerProduct(brand, concept.offer_id) ?? brand.products[0]?.id ?? null;
}
const CONTAINER = new Set(["pack", "packs", "packet", "packets", "box", "boxes", "bag", "bags", "pouch", "pouches", "bottle", "bottles", "jar", "jars", "tub", "tubs", "tin", "tins", "can", "cans", "sachet", "sachets", "case", "cases"]);
export function productForScript(brand: BrandBrain, concept: ConceptRow, script?: {
    title?: string;
    lines: {
        text: string;
        on_screen?: string;
        visual_note?: string;
    }[];
} | null): string | null {
    if (concept.product_id && brand.products.some((p) => p.id === concept.product_id))
        return concept.product_id;
    if (brand.products.length <= 1)
        return brand.products[0]?.id ?? null;
    const words = (s: string) => s.toLowerCase().match(/[a-zà-ÿ0-9]{3,}/g) ?? [];
    const names = brand.products.map((p) => new Set(words(p.name)));
    const brandWords = new Set(words(brand.brand.name));
    const own = names.map((n, i) => [...n].filter((w) => !brandWords.has(w) && !CONTAINER.has(w) && !names.some((m, j) => j !== i && m.has(w))));
    const pick = (text: string): string | null => {
        const lower = text.toLowerCase();
        const has = new Set(words(text));
        const scores = brand.products.map((p, i) => (lower.includes(p.name.toLowerCase()) ? 10 : 0) + own[i].filter((w) => has.has(w)).length);
        const top = Math.max(...scores);
        return top > 0 && scores.filter((s) => s === top).length === 1 ? brand.products[scores.indexOf(top)].id : null;
    };
    const offer = brand.offers.find((o) => o.id === concept.offer_id);
    const said = script ? [script.title ?? "", ...script.lines.flatMap((l) => [l.text, l.on_screen ?? "", l.visual_note ?? ""])].join(" ") : "";
    return (offer ? pick(`${offer.name} ${offer.notes ?? ""}`) : null) ?? (said ? pick(said) : null) ?? pick(`${concept.name} ${concept.angle}`) ?? (offer ? productForConcept(brand, concept) : brand.products[0].id);
}
export interface StepContext {
    data: Record<string, unknown>;
    fields: string[];
}
export function contextFor(step: ProductionStep, args: {
    brandId: string;
    brand: BrandBrain;
    kit: CreativeKit;
    concept: ConceptRow;
    productId: string | null;
    guardrails?: {
        label: string;
        guardrail: Guardrail;
    }[];
    cited?: string[];
    cast?: boolean;
    placed?: boolean;
}): StepContext {
    const { brand, kit, concept } = args;
    const persona = brand.personas.find((p) => p.id === concept.persona_id);
    const offer = brand.offers.find((o) => o.id === concept.offer_id);
    const product = brand.products.find((p) => p.id === args.productId) ?? brand.products[0];
    const guide = kit.products.find((p) => p.product_id === product?.id);
    const presenter = kit.presenters.find((p) => p.persona_id === concept.persona_id);
    const rules = (args.guardrails ?? activeGuardrails(args.brandId)).filter((g) => g.guardrail.applies).map((g) => g.guardrail.rule);
    const claims = brand.claims.filter((c) => c.status === "substantiated").map((c) => ({ id: c.id, text: c.text }));
    const cam = onCameraContext(args.brandId, product?.name);
    const world = brandWorld(args.brandId);
    const motion = motionSound(args.brandId);
    const facts = productFacts(args.brandId, product?.name);
    const policy = terms(args.brandId);
    const placedPresenter = presenter && args.placed ? (({ setting: _setting, ...rest }) => rest)(presenter) : presenter;
    const filmWorld = world?.people ? { ...world, people: withoutExpression(world.people) } : world;
    const productGuide = { name: product?.name, format: product?.format, packaging: guide?.packaging ?? "", details: guide?.details ?? "", handling: guide?.handling ?? "display", handling_notes: guide?.handling_notes ?? "", ...(cam ? { on_camera: cam } : {}) };
    const slices: Record<ProductionStep, Record<string, unknown>> = {
        brief: { brand: brand.brand.name, market: brand.brand.market, accent: brand.brand.locale_accent, persona, offer, guarantee: brand.guarantee?.text, voice: brand.voice, guardrails: rules, forbidden_claims: brand.forbidden_claims, product: productGuide, ...(facts ? { product_facts: facts } : {}), ...(policy ? { terms: policy } : {}) },
        copy: { brand: brand.brand, persona, offer, all_offers: brand.offers, guarantee: brand.guarantee, product, approved_claims: claims, forbidden_claims: brand.forbidden_claims, voice: brand.voice, proof_assets: brand.proof_assets, guardrails: rules, sophistication_stage: concept.sophistication_stage, ...(facts ? { product_facts: facts } : {}), ...(policy ? { terms: policy } : {}) },
        image_prompt: { brand: brand.brand.name, product: productGuide, brand_look: lookContext(loadBrandLook(args.brandId)), colors: kit.visual.colors, typography: kit.visual.typography, imagery_style: kit.visual.imagery_style, visual_do: kit.visual.do, visual_avoid: kit.visual.avoid, logo_notes: kit.visual.logo_notes, persona_look: presenter ?? null, ...(world ? { brand_world: world } : {}) },
        character: { brand: brand.brand.name, presenter: presenter ?? null, persona: persona ? { name: persona.name, summary: persona.summary } : null, imagery_style: kit.visual.imagery_style, visual_avoid: kit.visual.avoid },
        look: { brand: brand.brand.name, product: productGuide, presenter: presenter ?? null, imagery_style: kit.visual.imagery_style, colors: kit.visual.colors, visual_avoid: kit.visual.avoid, ...(world ? { brand_world: world } : {}) },
        storyboard: { brand: brand.brand.name, product: productGuide, presenter: presenter ?? null, imagery_style: kit.visual.imagery_style, ...(world ? { brand_world: world } : {}) },
        shot_plan: { brand: brand.brand.name, product: { name: product?.name, handling: guide?.handling ?? "display", ...(cam?.moves_and_sounds ? { moves_and_sounds: cam.moves_and_sounds } : {}) }, ...(args.cast ? {} : { presenter: placedPresenter ?? null }), voice_direction: kit.voice_direction, style_line: kit.style_line, approved_claims: args.cited ? claims.filter((c) => args.cited!.includes(c.id)) : claims, forbidden_claims: brand.forbidden_claims, guardrails: rules, offer, guarantee: brand.guarantee?.text, ...(filmWorld ? { brand_world: filmWorld } : {}), ...(motion ? { motion_and_sound: motion } : {}) },
        video_prompt: { brand: brand.brand.name, product: product?.name, product_details: guide?.details ?? "", handling: guide?.handling ?? "display", handling_notes: guide?.handling_notes ?? "", presenter: presenter ?? null, voice_direction: kit.voice_direction, style_line: kit.style_line },
        motion: { brand: brand.brand.name, visual_avoid: kit.visual.avoid, ...(motion ? { motion_and_sound: motion } : {}) },
    };
    const data = slices[step];
    const brief = creativeBriefText(getCreativeBrief(args.brandId, concept.id));
    if (brief)
        data.creative_brief = brief;
    return { data, fields: Object.keys(data).filter((k) => data[k] != null && data[k] !== "" && !(Array.isArray(data[k]) && !(data[k] as unknown[]).length)) };
}
export function productImageChoices(brandId: string, kit: CreativeKit | null, productId: string): {
    folder: string;
    files: string[];
    hero: string;
    extras: string[];
} {
    const prod = kit?.products.find((p) => p.product_id === productId);
    if (!prod?.asset_folder)
        return uploadedPhotos(brandId, productId) ?? cataloguePhotos(brandId, productId) ?? { folder: "", files: [], hero: "", extras: [] };
    return { folder: prod.asset_folder, files: assetListing(brandId)[prod.asset_folder] ?? [], hero: prod.hero_image, extras: prod.extra_images };
}
export function chosenProductImages(brandId: string, kit: CreativeKit | null, productId: string, names: string[]): string[] {
    const c = productImageChoices(brandId, kit, productId);
    return names.filter((n) => c.files.includes(n)).map((n) => path.join(dirOf(brandId), "assets", c.folder, n));
}
