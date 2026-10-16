import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { brandBrainDir, brandBrainPath, brandCode, readBrandBrainFile, writeBrandBrainFile, type BrandBrain } from "../brand-brain";
import { getBrandRow } from "../brands";
import { DESIRE_EVIDENCE_TYPES } from "../concepts";
import { adsetName } from "../naming";
import { freshId as freshPersonaId, getPersona, savePersona } from "../personas/store";
import { getSetting } from "../settings";
import { AWARENESS_INFO, type InsightType } from "../taxonomy";
import { dropFit, fitDesign } from "./book";
import { loadEconomics } from "./data";
import { priceOf, type OfferBrand } from "./evaluate";
import { ADD_KINDS, AUDIENCES, MECHANICS, PLACES, brandOfferId, changesTerms, isDesigned, offerId, type OfferDesign } from "./types";
const money = z.number().finite().min(0);
export const DesignSchema = z.object({
    id: z.string().regex(/^ofr_[a-z0-9_]{2,40}$/),
    name: z.string().min(2).max(70),
    mechanic: z.enum(MECHANICS),
    audience: z.enum(AUDIENCES).default("new"),
    product_id: z.string().min(1),
    base_offer_id: z.string().min(1),
    persona_id: z.string().nullable().default(null),
    new_buyer: z.object({ name: z.string().min(2).max(60), summary: z.string().min(4).max(400), problem: z.string().min(4).max(300), trigger: z.string().max(300).default(""), age: z.string().max(40).default(""), gender: z.string().max(40).default("") }).nullable().default(null),
    headline: z.string().min(4).max(140),
    terms: z.string().min(4).max(500),
    positioning: z.string().max(400).default(""),
    units: z.number().int().min(1).max(24).default(1),
    discount: z.number().min(0).max(0.7).default(0),
    subscription: z.boolean().default(false),
    adds: z.array(z.object({ kind: z.enum(ADD_KINDS), name: z.string().min(2).max(120), cost: money, value: money })).max(4).default([]),
    risk_reversal: z.string().max(240).default(""),
    urgency: z.string().max(240).default(""),
    tiers: z.array(z.object({ at: money, get: z.string().min(2).max(160) })).max(4).default([]),
    addon: z.object({ place: z.enum(PLACES), item: z.string().min(2).max(160), price: money, margin: z.number().min(0).max(1), take_rate: z.number().min(0).max(1) }).nullable().default(null),
    when: z.string().max(80).default("evergreen"),
    improves: z.string().nullable().default(null),
    theme_ids: z.array(z.string()).max(6).default([]),
    why: z.string().max(400).default(""),
    test: z.string().max(300).default(""),
    needs: z.string().max(300).default(""),
    borrowed: z.object({ industry: z.string(), pattern: z.string() }).nullable().default(null),
    source: z.enum(["built", "industry", "hand"]).default("hand"),
    status: z.enum(["active", "draft"]).default("draft"),
    brand_offer_id: z.string().nullable().default(null),
    concept_id: z.string().nullable().default(null),
    created_at: z.string(),
    updated_at: z.string(),
});
const FileSchema = z.object({ offers: z.array(DesignSchema).default([]) });
function dirOf(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return row.dir;
}
const fileOf = (brandId: string) => path.join(brandBrainDir(dirOf(brandId)), "offers.json");
function read(brandId: string): OfferDesign[] {
    const f = fileOf(brandId);
    if (!fs.existsSync(f))
        return [];
    const parsed = FileSchema.safeParse(JSON.parse(fs.readFileSync(f, "utf-8")));
    return parsed.success ? parsed.data.offers : [];
}
function write(brandId: string, offers: OfferDesign[]) {
    fs.writeFileSync(fileOf(brandId), `${JSON.stringify({ offers }, null, 2)}\n`, "utf-8");
}
export function listOffers(brandId: string): OfferDesign[] {
    let inBrand = new Set<string>();
    try {
        inBrand = new Set(readBrandBrainFile(brandBrainPath(dirOf(brandId))).offers.map((o) => o.id));
    }
    catch {
        return [];
    }
    return read(brandId)
        .map((d) => (d.status === "active" && d.brand_offer_id && !inBrand.has(d.brand_offer_id) ? { ...d, status: "draft" as const, brand_offer_id: null } : d))
        .sort((a, b) => (a.status === b.status ? b.created_at.localeCompare(a.created_at) : a.status === "active" ? -1 : 1));
}
export const getOffer = (brandId: string, id: string) => listOffers(brandId).find((d) => d.id === id);
export function freshOfferId(brandId: string, name: string): string {
    const taken = new Set(read(brandId).map((d) => d.id));
    const base = offerId(name).length > 5 ? offerId(name) : "ofr_offer";
    let id = base;
    for (let k = 2; taken.has(id); k++)
        id = `${base}_${k}`;
    return id;
}
export function offerBrand(brandId: string, brand: BrandBrain): OfferBrand {
    const econ = loadEconomics(brandId);
    return { currency: brand.brand.currency, products: brand.products.map((p) => ({ id: p.id, name: p.name, cycle_days: p.cycle_days ?? econ?.products.find((x) => x.product_id === p.id)?.cycle_days })), offers: brand.offers.map((o) => ({ id: o.id, name: o.name, price: o.price, notes: o.notes })) };
}
const clip = (s: string, k: number) => (s.length > k ? `${s.slice(0, k - 1).trimEnd()}…` : s);
export function toBrandOffer(d: OfferDesign, brand: OfferBrand): BrandBrain["offers"][number] | null {
    if (!changesTerms(d) || d.mechanic === "upsell" || d.mechanic === "post_purchase")
        return null;
    const price = priceOf(d, brand);
    const product = brand.products.find((p) => p.id === d.product_id);
    const days = product?.cycle_days ? product.cycle_days * d.units : 0;
    const notes = [
        product ? `For ${product.name}.` : "",
        d.terms.trim(),
        d.adds.length ? `Included: ${d.adds.map((a) => (a.value > 0 ? `${a.name} (worth ${a.value})` : a.name)).join("; ")}.` : "",
        d.tiers.length ? `Tiers: ${d.tiers.map((t) => `at ${t.at}, ${t.get}`).join("; ")}.` : "",
        d.risk_reversal.trim(),
        d.urgency.trim(),
        d.audience === "all" ? "" : `For ${d.audience} buyers only.`,
    ]
        .filter(Boolean)
        .join(" ");
    return { id: brandOfferId(d.id), name: clip(`${d.name}: ${d.headline}`, 140), price, ...(days ? { per_day: Math.round((price / days) * 100) / 100 } : {}), notes: clip(notes, 600) };
}
const conceptsUsing = (brandId: string, offer: string) => db.select({ id: schema.concepts.id, o: schema.concepts.offer_id }).from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all().filter((c) => c.o === offer).length;
type Input = Omit<OfferDesign, "created_at" | "updated_at" | "brand_offer_id" | "concept_id"> & Partial<Pick<OfferDesign, "created_at" | "brand_offer_id" | "concept_id">>;
export function saveOffer(brandId: string, input: Input): OfferDesign {
    const now = new Date().toISOString();
    const all = read(brandId);
    const was = all.find((d) => d.id === input.id);
    const file = brandBrainPath(dirOf(brandId));
    const brand = readBrandBrainFile(file);
    if (!brand.products.some((p) => p.id === input.product_id))
        throw new Error("Pick a product this brand sells.");
    const base = brand.offers.find((o) => o.id === input.base_offer_id);
    if (!base || isDesigned(base.id))
        throw new Error("Pick the price point this offer is built on.");
    let next = DesignSchema.parse({ ...input, brand_offer_id: input.brand_offer_id ?? was?.brand_offer_id ?? null, concept_id: input.concept_id ?? was?.concept_id ?? null, created_at: was?.created_at ?? input.created_at ?? now, updated_at: now });
    if (next.status === "active")
        next = sync(brandId, brand, file, next);
    else if (was?.status === "active" || next.brand_offer_id)
        next = unsync(brandId, brand, file, next);
    write(brandId, [...all.filter((d) => d.id !== next.id), next].sort((a, b) => a.created_at.localeCompare(b.created_at)));
    return next;
}
function sync(brandId: string, brand: BrandBrain, file: string, d: OfferDesign): OfferDesign {
    const entry = toBrandOffer(d, offerBrand(brandId, brand));
    const id = brandOfferId(d.id);
    const rest = brand.offers.filter((o) => o.id !== id);
    if (!entry) {
        if (rest.length !== brand.offers.length) {
            writeBrandBrainFile(file, { ...brand, offers: rest });
            dropFit(brandId, id);
        }
        return { ...d, brand_offer_id: null };
    }
    const at = brand.offers.findIndex((o) => o.id === id);
    if (at < 0 || JSON.stringify(brand.offers[at]) !== JSON.stringify(entry))
        writeBrandBrainFile(file, { ...brand, offers: at >= 0 ? brand.offers.map((o, i) => (i === at ? entry : o)) : [...brand.offers, entry] });
    fitDesign(brandId, id, d);
    return { ...d, brand_offer_id: id };
}
function unsync(brandId: string, brand: BrandBrain, file: string, d: OfferDesign): OfferDesign {
    const id = brandOfferId(d.id);
    if (brand.offers.some((o) => o.id === id)) {
        const k = conceptsUsing(brandId, id);
        if (k)
            throw new Error(`${k} concept${k === 1 ? " states" : "s state"} this offer. It stays in use while they exist.`);
        writeBrandBrainFile(file, { ...brand, offers: brand.offers.filter((o) => o.id !== id) });
        dropFit(brandId, id);
    }
    return { ...d, status: "draft", brand_offer_id: null };
}
export interface UseResult {
    offer: OfferDesign;
    did: string[];
}
export function putInUse(brandId: string, id: string): UseResult {
    const d = getOffer(brandId, id);
    if (!d)
        throw new Error("Offer not found");
    const did: string[] = [];
    let personaId = d.persona_id;
    if (d.new_buyer && !personaId) {
        const p = savePersona(brandId, { id: freshPersonaId(brandId, d.new_buyer.name), name: d.new_buyer.name, summary: d.new_buyer.summary, problem: d.new_buyer.problem, trigger: d.new_buyer.trigger, language: [], who: { age: d.new_buyer.age, gender: d.new_buyer.gender, life: "" }, wants: "", objections: [], angle: d.positioning, awareness: "problem_aware", product_ids: [d.product_id], offer_id: null, sounds_like: [], share: null, performance: null, source: "offer", basis: `The repositioning "${d.name}"`, look: "", image: null, status: "active" });
        personaId = p.id;
        did.push(`${p.name} is a persona in use.`);
    }
    else if (personaId) {
        const p = getPersona(brandId, personaId);
        if (p && p.status === "draft") {
            savePersona(brandId, { ...p, status: "active" });
            did.push(`${p.name} is a persona in use.`);
        }
    }
    let saved = saveOffer(brandId, { ...d, persona_id: personaId, status: "active" });
    if (saved.brand_offer_id)
        did.push("It can be picked as the offer of a concept, a script or a set of ads.");
    else if (saved.mechanic === "upsell" || saved.mechanic === "post_purchase")
        did.push("It is marked as running. An add-on is not stated in ads, so nothing changed for the writers.");
    if (saved.mechanic === "reposition" && !saved.concept_id && personaId) {
        const concept = conceptFor(brandId, saved, personaId);
        if (concept.id) {
            saved = saveOffer(brandId, { ...saved, concept_id: concept.id });
            did.push(`Concept ${concept.id} is filed as a draft: write scripts from it.`);
        }
        else
            did.push(concept.why);
    }
    return { offer: saved, did };
}
export function retireOffer(brandId: string, id: string): OfferDesign {
    const d = getOffer(brandId, id);
    if (!d)
        throw new Error("Offer not found");
    return saveOffer(brandId, { ...d, status: "draft" });
}
export function deleteOffer(brandId: string, id: string) {
    const all = read(brandId);
    const d = all.find((x) => x.id === id);
    if (!d)
        return;
    if (d.status === "active")
        retireOffer(brandId, id);
    write(brandId, all.filter((x) => x.id !== id));
}
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter((w) => w.length > 3));
export function evidenceFor(d: Pick<OfferDesign, "theme_ids" | "positioning" | "headline" | "name">, themes: {
    id: string;
    type: InsightType;
    label: string;
    summary: string;
}[]): string[] {
    const desire = themes.filter((t) => DESIRE_EVIDENCE_TYPES.includes(t.type));
    const cited = d.theme_ids.filter((id) => desire.some((t) => t.id === id));
    if (cited.length)
        return cited;
    const want = words(`${d.name} ${d.headline} ${d.positioning}`);
    return desire
        .map((t) => ({ id: t.id, n: [...words(`${t.label} ${t.summary}`)].filter((w) => want.has(w)).length }))
        .filter((x) => x.n >= 2)
        .sort((a, b) => b.n - a.n)
        .slice(0, 2)
        .map((x) => x.id);
}
function conceptFor(brandId: string, d: OfferDesign, personaId: string): {
    id: string | null;
    why: string;
} {
    const themes = db.select({ id: schema.themes.id, type: schema.themes.type, label: schema.themes.label, summary: schema.themes.summary }).from(schema.themes).where(eq(schema.themes.brand_id, brandId)).all();
    const evidence = evidenceFor(d, themes);
    if (!evidence.length)
        return { id: null, why: "No concept was filed: the research holds no evidence that buyers want this. Add research, or write the concept by hand." };
    const brand = readBrandBrainFile(brandBrainPath(dirOf(brandId)));
    const all = db.select({ id: schema.concepts.id }).from(schema.concepts).all();
    const id = `con_${String(Math.max(0, ...all.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
    const offer = d.brand_offer_id ?? d.base_offer_id;
    const awareness = getPersona(brandId, personaId)?.awareness ?? "problem_aware";
    db.insert(schema.concepts)
        .values({
        id,
        brand_id: brandId,
        name: d.name,
        persona_id: personaId,
        angle: [d.positioning.trim(), d.headline.trim()].filter(Boolean).join(" Headline: "),
        offer_id: offer,
        awareness_stage: awareness,
        sophistication_stage: brand.market_sophistication_stage,
        theme_ids: [...new Set([...d.theme_ids.filter((t) => themes.some((x) => x.id === t)), ...evidence])],
        desire_evidence_theme_ids: evidence,
        differentiator_test: { claim: d.headline, is_proposition: false, unavailable_to_competitors: false, moves_a_stranger: false },
        formats_planned: [],
        status: "draft",
        meta_adset_name: adsetName(getSetting(brandId, "naming").adset, { brandCode: brandCode(brand), conceptId: id, personaId, conceptName: d.name, offerId: offer, awarenessCode: AWARENESS_INFO[awareness].code }),
        parent_concept_id: null,
    })
        .run();
    return { id, why: "" };
}
