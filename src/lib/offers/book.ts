import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { brandBrainDir, brandBrainPath, readBrandBrainFile, writeBrandBrainFile, type BrandBrain } from "../brand-brain";
import { getBrandRow } from "../brands";
import { offersFor } from "../llm/context";
import { AWARENESS_STAGES, type AwarenessStage } from "../taxonomy";
import { getPersona } from "../personas/store";
import { ADDON_IDS, MAIN_MECHANICS, PART_IDS, SLOTS, partsOfText, type AddonId, type DownstreamRow, type MainMechanic, type OfferParts } from "./path";
const FitSchema = z.object({
    offer_id: z.string(),
    say: z.string().max(400).default(""),
    persona_ids: z.array(z.string()).max(40).default([]),
    stages: z.array(z.enum(AWARENESS_STAGES)).default([]),
    running: z.boolean().default(false),
    needs: z.string().max(400).default(""),
    why: z.string().max(400).default(""),
    same_as: z.string().nullable().default(null),
    mechanic: z.enum(MAIN_MECHANICS).optional(),
    parts: z.object(Object.fromEntries(PART_IDS.map((id) => [id, z.string().max(400).default("")])) as Record<(typeof PART_IDS)[number], z.ZodDefault<z.ZodString>>).optional(),
    objection: z.string().max(300).optional(),
    angle: z.string().max(300).optional(),
    page_line: z.string().max(300).optional(),
    audience: z.enum(["new", "returning", "all"]).optional(),
    addons: z.object(Object.fromEntries(ADDON_IDS.map((id) => [id, z.string().max(300).optional()])) as Record<AddonId, z.ZodOptional<z.ZodString>>).optional(),
    numbers: z.object({ units: z.number(), pays: z.number(), keeps: z.number(), keeps_today: z.number(), break_even: z.number().nullable(), needed_roas: z.number().nullable(), roas_today: z.number(), discount: z.number() }).optional(),
    downstream: z.array(z.object({ slot: z.enum(SLOTS), item: z.string().max(160), price: z.number().min(0), margin: z.number().min(0).max(1), take_rate: z.number().min(0).max(1), discount: z.number().min(0).max(1).optional() })).max(8).optional(),
});
export type OfferFitRow = z.infer<typeof FitSchema>;
function dirOf(brandId: string): string {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return row.dir;
}
const fitFile = (brandId: string) => path.join(brandBrainDir(dirOf(brandId)), "offer-set.json");
function readFits(brandId: string): OfferFitRow[] {
    const f = fitFile(brandId);
    if (!fs.existsSync(f))
        return [];
    return z.array(FitSchema).parse(JSON.parse(fs.readFileSync(f, "utf-8"))?.offers ?? []);
}
const writeFits = (brandId: string, fits: OfferFitRow[]) => fs.writeFileSync(fitFile(brandId), `${JSON.stringify({ offers: fits }, null, 2)}\n`);
export interface BrandOffer {
    id: string;
    name: string;
    price: number;
    per_day?: number;
    terms: string;
    say: string;
    persona_ids: string[];
    stages: AwarenessStage[];
    running: boolean;
    needs: string;
    why: string;
    fitted: boolean;
    source: "price" | "design" | "builder";
    product_id: string | null;
    also: string[];
    mechanic: MainMechanic | null;
    parts: OfferParts;
    objection: string;
    angle: string;
    page_line: string;
    audience: "new" | "returning" | "all" | null;
    numbers: OfferFitRow["numbers"] | null;
    downstream: DownstreamRow[];
}
export const isBuilderOffer = (id: string) => id.startsWith("off_x_s_");
const isMade = (id: string) => id.startsWith("off_x_");
type Entry = BrandBrain["offers"][number];
const SMALL = new Set("the a an of with for and to on in at by or plus per is are your our".split(" "));
const tokens = (s: string) => new Set(s.toLowerCase().normalize("NFD").replace(/[̀-ͯ’']/g, "").replace(/[^a-z0-9.]+/g, " ").split(/\s+/).map((w) => w.replace(/^\.+|\.+$/g, "").replace(/(?<=[a-z]{3})s$/, "")).filter((w) => w && !SMALL.has(w)));
const covered = (a: string, b: string) => {
    const want = [...tokens(a)];
    const have = tokens(b);
    return want.length ? want.filter((w) => have.has(w)).length / want.length : 0;
};
const samePrice = (a: number, b: number) => Math.abs(a - b) < 0.005;
export function foldSameDeals(entries: Entry[], fits: Pick<OfferFitRow, "offer_id" | "running" | "same_as">[], productOf: (id: string) => string | null): Map<string, string> {
    const ids = new Set(entries.map((e) => e.id));
    const fitOf = new Map(fits.map((f) => [f.offer_id, f]));
    const folded = new Map<string, string>();
    for (const f of fits)
        if (f.same_as && f.same_as !== f.offer_id && ids.has(f.same_as) && ids.has(f.offer_id) && !folded.has(f.same_as))
            folded.set(f.same_as, f.offer_id);
    const taken = new Set(folded.values());
    const prices = entries.filter((e) => !isMade(e.id) && !folded.has(e.id));
    const written = entries.filter((e) => isBuilderOffer(e.id) && fitOf.get(e.id)?.running && !taken.has(e.id));
    const near = (p: Entry, b: Entry) => samePrice(p.price, b.price) && (productOf(p.id) === productOf(b.id) || !productOf(p.id) || !productOf(b.id));
    const best = new Map<string, {
        price: string;
        n: number;
    }>();
    for (const p of prices) {
        const twins = written.filter((b) => near(p, b));
        if (!twins.length)
            continue;
        const alone = twins.length === 1 && prices.filter((q) => near(q, twins[0])).length === 1;
        const scored = twins.map((b) => ({ b, n: covered(p.name, `${b.name} ${b.notes ?? ""}`) })).sort((x, y) => y.n - x.n)[0];
        if (scored.n < (alone ? 0.4 : 0.7))
            continue;
        const was = best.get(scored.b.id);
        if (!was || scored.n > was.n)
            best.set(scored.b.id, { price: p.id, n: scored.n });
    }
    for (const [kept, x] of best)
        folded.set(x.price, kept);
    return folded;
}
function productFinder(brand: BrandBrain): (id: string) => string | null {
    const of = new Map<string, string | null>();
    for (const o of brand.offers)
        of.set(o.id, brand.products.length < 2 ? (brand.products[0]?.id ?? null) : null);
    if (brand.products.length >= 2) {
        const lists = brand.products.map((p) => ({ id: p.id, ids: new Set(offersFor(brand, p.id).map((o) => o.id)) }));
        for (const o of brand.offers) {
            const mine = lists.filter((l) => l.ids.has(o.id));
            of.set(o.id, mine.length === 1 ? mine[0].id : null);
        }
    }
    return (id) => of.get(id) ?? null;
}
function build(brand: BrandBrain, fits: OfferFitRow[]): {
    book: BrandOffer[];
    folded: Map<string, string>;
} {
    const productOf = productFinder(brand);
    const folded = foldSameDeals(brand.offers, fits, productOf);
    const fitOf = new Map(fits.map((f) => [f.offer_id, f]));
    const all = brand.offers
        .filter((o) => !folded.has(o.id))
        .map((o): BrandOffer => {
        const f = fitOf.get(o.id);
        const also = [...folded].filter(([, kept]) => kept === o.id).map(([id]) => id);
        const twin = brand.offers.find((x) => also.includes(x.id) && x.per_day);
        const perDay = o.per_day ?? twin?.per_day;
        const names = (f?.persona_ids ?? []).map((id) => brand.personas.find((p) => p.id === id)?.name).filter((n): n is string => !!n);
        const parts = f?.parts ?? partsOfText({ name: o.name, terms: o.notes ?? "", why: f?.why, persona_names: names });
        return { id: o.id, name: o.name, price: o.price, ...(perDay ? { per_day: perDay } : {}), terms: o.notes ?? "", say: f?.say ?? "", persona_ids: f?.persona_ids ?? [], stages: f?.stages ?? [], running: f ? f.running : !isMade(o.id), needs: f?.needs ?? "", why: f?.why ?? "", fitted: !!f, source: isBuilderOffer(o.id) ? "builder" : isMade(o.id) ? "design" : "price", product_id: productOf(o.id) ?? (also.length ? productOf(also[0]) : null), also, mechanic: f?.mechanic ?? null, parts, objection: f?.objection ?? "", angle: f?.angle ?? "", page_line: f?.page_line ?? "", audience: f?.audience ?? null, numbers: f?.numbers ?? null, downstream: f?.downstream ?? [] };
    });
    return { book: [...all.filter((o) => o.fitted), ...all.filter((o) => !o.fitted)], folded };
}
export const bookOf = (brand: BrandBrain, fits: OfferFitRow[] = []) => build(brand, fits).book;
const load = (brandId: string, brand?: BrandBrain) => build(brand ?? readBrandBrainFile(brandBrainPath(dirOf(brandId))), readFits(brandId));
export function listOfferFits(brandId: string): OfferFitRow[] {
    const fits = readFits(brandId);
    let folded: Map<string, string>;
    try {
        folded = load(brandId).folded;
    }
    catch {
        return fits;
    }
    const have = new Set(fits.map((f) => f.offer_id));
    return [...fits, ...[...folded].flatMap(([id, kept]) => (have.has(id) ? [] : fits.filter((f) => f.offer_id === kept).map((f) => ({ ...f, offer_id: id, same_as: null }))))];
}
export function offerBook(brandId: string, brand?: BrandBrain): BrandOffer[] {
    return load(brandId, brand).book;
}
export const listBrandOffers = (brandId: string): BrandOffer[] => offerBook(brandId);
export function bookId(brandId: string, id: string, brand?: BrandBrain): string {
    return load(brandId, brand).folded.get(id) ?? id;
}
export function bookOffer(brandId: string, id: string | null | undefined, brand?: BrandBrain): BrandOffer | undefined {
    if (!id)
        return undefined;
    const { book, folded } = load(brandId, brand);
    return book.find((o) => o.id === (folded.get(id) ?? id));
}
export function offerSay(brandId: string, id: string | null | undefined): string {
    try {
        return bookOffer(brandId, id)?.say ?? "";
    }
    catch {
        return "";
    }
}
export function matchOffers(book: BrandOffer[], want: {
    persona_id?: string | null;
    angle?: string;
    audience?: "new" | "returning";
}): BrandOffer[] {
    const angle = want.angle ? tokens(want.angle) : new Set<string>();
    const score = (o: BrandOffer) => {
        const mine = !!want.persona_id && o.persona_ids.includes(want.persona_id);
        if (!mine && o.persona_ids.length && want.persona_id)
            return -1;
        if (want.audience && o.audience && o.audience !== "all" && o.audience !== want.audience)
            return -1;
        const said = [...tokens(`${o.angle} ${o.objection} ${o.parts.positioning}`)].filter((w) => angle.has(w)).length;
        return (mine ? 10 : 0) + (mine && o.persona_ids.length === 1 ? 4 : 0) + (mine && o.objection ? 2 : 0) + Math.min(5, said) + (o.say ? 1 : 0);
    };
    return book.map((o) => ({ o, n: score(o) })).filter((x) => x.n >= 0).sort((a, b) => b.n - a.n).map((x) => x.o);
}
export const offersMatching = (brandId: string, want: Parameters<typeof matchOffers>[1]) => matchOffers(offerBook(brandId), want);
export interface BuyerWant {
    persona_id?: string | null;
    product_id?: string | null;
    angle?: string;
    persona_offer_id?: string | null;
}
export function offerForBuyer(book: BrandOffer[], want: BuyerWant): BrandOffer | undefined {
    const who = want.persona_id;
    if (!who)
        return undefined;
    const fits = (o: BrandOffer) => o.running && (!want.product_id || !o.product_id || o.product_id === want.product_id);
    const named = want.persona_offer_id ? book.find((o) => (o.id === want.persona_offer_id || o.also.includes(want.persona_offer_id!)) && fits(o)) : undefined;
    return named ?? matchOffers(book, { persona_id: who, angle: want.angle }).find((o) => fits(o) && o.persona_ids.includes(who));
}
export function offerForPersona(brandId: string, want: BuyerWant): BrandOffer | undefined {
    try {
        if (!want.persona_id)
            return undefined;
        return offerForBuyer(offerBook(brandId), { ...want, persona_offer_id: want.persona_offer_id ?? getPersona(brandId, want.persona_id)?.offer_id ?? null });
    }
    catch {
        return undefined;
    }
}
export interface OfferChoice {
    id: string;
    name: string;
    price: number;
    per_day: number | null;
    designed: boolean;
}
export function offerChoices(brandId: string, brand?: BrandBrain, opts: {
    keep?: (string | null | undefined)[];
} = {}): OfferChoice[] {
    const file = brand ?? readBrandBrainFile(brandBrainPath(dirOf(brandId)));
    const { book, folded } = build(file, readFits(brandId));
    const kept = file.offers.filter((o) => folded.has(o.id) && (opts.keep ?? []).includes(o.id));
    return [...book.map((o) => ({ id: o.id, name: o.name, price: o.price, per_day: o.per_day ?? null, designed: o.source !== "price" && !o.also.length })), ...kept.map((o) => ({ id: o.id, name: o.name, price: o.price, per_day: o.per_day ?? null, designed: false }))];
}
function fresh(name: string, taken: Set<string>): string {
    const slug = name
        .toLowerCase()
        .replace(/^the\s+/, "")
        .normalize("NFD")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 28);
    const base = `off_x_s_${slug || "new"}`;
    let id = base;
    for (let n = 2; taken.has(id); n++)
        id = `${base}_${n}`;
    return id;
}
export interface SimpleOffer {
    id?: string;
    name: string;
    price: number;
    terms: string;
    say?: string;
    persona_ids?: string[];
    stages?: string[];
    running?: boolean;
    needs?: string;
    why?: string;
    same_as?: string | null;
    mechanic?: MainMechanic;
    parts?: OfferParts;
    objection?: string;
    angle?: string;
    page_line?: string;
    audience?: "new" | "returning" | "all";
    addons?: Partial<Record<AddonId, string>>;
    numbers?: NonNullable<OfferFitRow["numbers"]>;
    downstream?: DownstreamRow[];
}
export function saveBrandOffer(brandId: string, input: SimpleOffer): {
    id: string;
} {
    const file = brandBrainPath(dirOf(brandId));
    const brand = readBrandBrainFile(file);
    const name = input.name.trim();
    if (name.length < 2)
        throw new Error("Give the offer a name.");
    if (!(input.price >= 0))
        throw new Error("Give the offer a price (0 for a free gift).");
    const fitsNow = readFits(brandId);
    const was = input.id ? brand.offers.find((o) => o.id === input.id) : undefined;
    if (input.id && !was)
        throw new Error("That offer is not in use any more.");
    const id = was?.id ?? fresh(name, new Set(brand.offers.map((o) => o.id)));
    const fromDesign = !!was && isMade(id) && !isBuilderOffer(id);
    if (!fromDesign) {
        const next = { ...was, id, name, price: input.price, notes: input.terms.trim() };
        if (!was || was.name !== next.name || was.price !== next.price || (was.notes ?? "") !== next.notes)
            writeBrandBrainFile(file, { ...brand, offers: was ? brand.offers.map((o) => (o.id === id ? next : o)) : [...brand.offers, next] });
    }
    const old = fitsNow.find((f) => f.offer_id === id);
    const fit = FitSchema.parse({ ...(old ?? { running: !!was && !isMade(id) }), offer_id: id, ...(input.say !== undefined ? { say: input.say.trim() } : {}), ...(input.persona_ids ? { persona_ids: input.persona_ids } : {}), ...(input.stages ? { stages: input.stages } : {}), ...(input.running !== undefined ? { running: input.running } : {}), ...(input.needs !== undefined ? { needs: input.needs } : {}), ...(input.why !== undefined ? { why: input.why } : {}), ...(input.same_as !== undefined ? { same_as: input.same_as } : {}), ...(input.mechanic ? { mechanic: input.mechanic } : {}), ...(input.parts ? { parts: input.parts } : {}), ...(input.objection !== undefined ? { objection: input.objection.trim().slice(0, 300) } : {}), ...(input.angle !== undefined ? { angle: input.angle.trim().slice(0, 300) } : {}), ...(input.page_line !== undefined ? { page_line: input.page_line.trim().slice(0, 300) } : {}), ...(input.audience ? { audience: input.audience } : {}), ...(input.addons ? { addons: input.addons } : {}), ...(input.numbers ? { numbers: input.numbers } : {}), ...(input.downstream ? { downstream: input.downstream } : {}) });
    writeFits(brandId, old ? fitsNow.map((f) => (f.offer_id === id ? fit : f)) : [...fitsNow, fit]);
    return { id };
}
export const saveSimpleOffer = saveBrandOffer;
export function fitDesign(brandId: string, id: string, d: {
    headline: string;
    persona_id: string | null;
    needs: string;
    why: string;
}) {
    const fits = readFits(brandId);
    const old = fits.find((f) => f.offer_id === id);
    const fit = FitSchema.parse({ ...old, offer_id: id, say: old?.say || d.headline.trim().slice(0, 400), persona_ids: old?.persona_ids.length ? old.persona_ids : d.persona_id ? [d.persona_id] : [], needs: d.needs.slice(0, 400), why: d.why.slice(0, 400) });
    if (old && JSON.stringify(old) === JSON.stringify(fit))
        return;
    writeFits(brandId, old ? fits.map((f) => (f.offer_id === id ? fit : f)) : [...fits, fit]);
}
export function dropFit(brandId: string, id: string) {
    const fits = readFits(brandId);
    if (fits.some((f) => f.offer_id === id))
        writeFits(brandId, fits.filter((f) => f.offer_id !== id));
}
export function deleteSimpleOffer(brandId: string, id: string) {
    const fitsNow = readFits(brandId);
    if (!fitsNow.some((f) => f.offer_id === id))
        throw new Error("That offer was not made here. Change it on the Offers screen.");
    const file = brandBrainPath(dirOf(brandId));
    const brand = readBrandBrainFile(file);
    writeBrandBrainFile(file, { ...brand, offers: brand.offers.filter((o) => o.id !== id) });
    writeFits(brandId, fitsNow.filter((f) => f.offer_id !== id));
}
const conceptsStating = (brandId: string, ids: string[]) => db.select({ o: schema.concepts.offer_id }).from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all().filter((c) => ids.includes(c.o)).length;
export function removeBrandOffer(brandId: string, id: string): {
    removed: string[];
} {
    const file = brandBrainPath(dirOf(brandId));
    const brand = readBrandBrainFile(file);
    const fitsNow = readFits(brandId);
    const { book } = build(brand, fitsNow);
    const o = book.find((x) => x.id === id);
    if (!o)
        throw new Error("That offer is not in use any more.");
    if (o.source === "design")
        throw new Error("This offer comes from a design. Take the design out of use in the list below.");
    const ids = [o.id, ...o.also];
    const k = conceptsStating(brandId, ids);
    if (k)
        throw new Error(`${k} concept${k === 1 ? " states" : "s state"} this offer. It stays in use while they exist.`);
    const designs = path.join(brandBrainDir(dirOf(brandId)), "offers.json");
    const built: {
        base_offer_id?: string;
    }[] = fs.existsSync(designs) ? (JSON.parse(fs.readFileSync(designs, "utf-8"))?.offers ?? []) : [];
    if (built.some((d) => d.base_offer_id && ids.includes(d.base_offer_id)))
        throw new Error("An offer design is built on this price. It stays while that design exists.");
    writeBrandBrainFile(file, { ...brand, offers: brand.offers.filter((x) => !ids.includes(x.id)) });
    writeFits(brandId, fitsNow.filter((f) => !ids.includes(f.offer_id)));
    return { removed: ids };
}
