import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { LibraryKind, LibraryRefRow } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import { loadBrandLook } from "../brand-look";
import { PDP_BUCKETS, bucketOf } from "../library/buckets";
import { PDP_SPINE, PRODUCT_FORMATS, VERTICALS, pdpType, typeLabel } from "../library/taxonomy";
import type { CreativeKit } from "../production/kit";
import { advertiserKey, chooseCandidates, libraryCandidates, referenceUsage } from "../references/choose";
export interface ProductProfile {
    brandId?: string;
    stage?: string | null;
    vertical: string;
    format: string;
    category: string;
}
const VERTICAL_WORDS: [
    RegExp,
    string
][] = [
    [/\b(?:pets?|dogs?|cats?|puppy|kitten)\b/i, "Pet"],
    [/\b(?:baby|babies|kids?|child|children|toddler)/i, "Baby & Kids"],
    [/\b(?:skincare|skin care|serum|moisturi|sunscreen)/i, "Beauty & Skincare"],
    [/\b(?:makeup|make-up|cosmetic|lipstick|mascara)/i, "Cosmetics & Makeup"],
    [/\b(?:haircare|hair care|shampoo|conditioner)/i, "Haircare"],
    [/\b(?:coffee|teas?|matcha)\b/i, "Coffee & Tea"],
    [/\b(?:wines?|spirits?|whisk|gin|vodka)/i, "Spirits & Wine"],
    [/\b(?:drinks?|beverage|soda|juice|beer|sparkling water)/i, "Beverage & Alcohol"],
    [/\b(?:snacks?|foods?|protein bars?|sauces?|chocolate|candy|confectionery|grocery)\b/i, "Food"],
    [/\b(?:supplement|vitamin|wellness|gumm|greens|protein powder|probiotic|sports nutrition|collagen)/i, "Supplements & Wellness"],
    [/\b(?:shoes?|sneaker|footwear|boots?)\b/i, "Footwear & Sneakers"],
    [/\b(?:activewear|sportswear|gymwear|legging|athleisure)/i, "Sportswear & Activewear"],
    [/\b(?:swimwear|swim|lingerie|underwear|intimates?)\b/i, "Swim & Intimates"],
    [/\b(?:apparel|fashion|clothing|clothes|dress|shirt|denim|knitwear)/i, "Fashion & Apparel"],
    [/\b(?:jewel|watch|watches|rings?|necklace)/i, "Jewelry & Watches"],
    [/\b(?:bags?|wallet|leather goods)\b/i, "Bags & Leather Goods"],
    [/\b(?:eyewear|glasses|sunglass)/i, "Eyewear"],
    [/\b(?:perfume|fragrance|cologne)/i, "Fragrance"],
    [/\b(?:candles?|diffuser)/i, "Candles & Home Fragrance"],
    [/\b(?:bedding|sheets?|pillow|duvet|linen|mattress)/i, "Bedding & Linens"],
    [/\b(?:cookware|kitchen|knife|knives|pans?|bakeware)\b/i, "Kitchen & Cookware"],
    [/\b(?:furniture|homeware|home decor|decor|sofa)/i, "Home, Furniture & Candles"],
    [/\b(?:grooming|shave|shaving|beard|razor)/i, "Men's Grooming"],
    [/\b(?:outdoor|camping|hiking|adventure)/i, "Outdoor & Adventure"],
    [/\b(?:tech|phones?|headphone|charger|gadget|device|electronics)/i, "Tech & Accessories"],
    [/\b(?:beauty)\b/i, "Beauty & Skincare"],
    [/\b(?:hair)\b/i, "Haircare"],
];
export const verticalOf = (category: string) => VERTICAL_WORDS.find(([re]) => re.test(category))?.[1] ?? "";
const FORMAT_WORDS: [
    RegExp,
    string
][] = [
    [/sachet|stick pack|packet/i, "sachet"],
    [/pouch|bag of/i, "pouch"],
    [/bottle|dropper|spray|pump/i, "bottle"],
    [/\bjar\b/i, "jar"],
    [/\btub\b|canister/i, "tub"],
    [/\btube\b/i, "tube"],
    [/\bcan\b|cans\b/i, "can"],
    [/\bbox\b|carton/i, "box"],
    [/\bbar\b/i, "bar"],
];
export function productProfile(brandId: string, brand: BrandBrain, kit: CreativeKit | null, productId: string): ProductProfile {
    const look = loadBrandLook(brandId);
    const product = brand.products.find((p) => p.id === productId);
    const guide = kit?.products.find((p) => p.product_id === productId);
    const category = `${brand.brand.category} ${product?.name ?? ""}`;
    const vertical = look?.vertical || verticalOf(category);
    const packText = `${product?.format ?? ""} ${guide?.packaging ?? ""}`;
    const format = FORMAT_WORDS.find(([re]) => re.test(packText))?.[1] ?? "";
    return { brandId, vertical: (VERTICALS as readonly string[]).includes(vertical) ? vertical : "", format: (PRODUCT_FORMATS as readonly string[]).includes(format) ? format : "", category };
}
export interface Scored {
    ref: LibraryRefRow;
    score: number;
    reason: string;
}
export function distinctRefs(rows: Scored[], count: number): Scored[] {
    const ids = new Set<string>();
    const brands = new Set<string>();
    return rows.filter((s) => {
        const brand = advertiserKey(s.ref.brand ?? "");
        if (ids.has(s.ref.id) || (brand && brands.has(brand)))
            return false;
        ids.add(s.ref.id);
        if (brand)
            brands.add(brand);
        return true;
    }).slice(0, count);
}
export function scoreRef(ref: LibraryRefRow, p: ProductProfile): Scored {
    let score = ref.library === "ad" ? 0 : ref.craft * 5;
    const why: string[] = [];
    if (p.vertical && ref.vertical === p.vertical) {
        score += 40;
        why.push(`made for ${p.vertical.toLowerCase()}`);
    }
    else if (p.vertical && ref.tags.works_for?.includes(p.vertical)) {
        score += 22;
        why.push(`also suits ${p.vertical.toLowerCase()}`);
    }
    if (p.format && ref.tags.product_format === p.format) {
        score += 15;
        why.push(`shows a ${p.format}, like this product`);
    }
    if (ref.library === "pdp" && ref.tags.source === "live-pdp") {
        score += 5;
        why.push("taken from a live product page");
    }
    if (ref.library === "photoshoot" && ref.tags.text_overlay === "none")
        score += 4;
    if (ref.library !== "ad" && ref.craft >= 5)
        why.push("top craft");
    return { ref, score, reason: why.length ? why.join(", ") : "a strong example of this type" };
}
export function rankRefs(library: LibraryKind, p: ProductProfile, opts: {
    type?: string;
    group?: string;
    vertical?: string;
    bucket?: string;
    limit?: number;
} = {}): Scored[] {
    const t = schema.libraryRefs;
    const where = [eq(t.library, library), eq(t.usable, true)];
    if (opts.type)
        where.push(eq(t.type, opts.type));
    if (opts.group)
        where.push(eq(t.group_name, opts.group));
    if (opts.vertical)
        where.push(eq(t.vertical, opts.vertical));
    const rows = db.select().from(t).where(and(...where)).all().filter((r) => (!r.tags.owner_brand_id || r.tags.owner_brand_id === p.brandId) && (!opts.bucket || bucketOf(r) === opts.bucket));
    if (library !== "ad") {
        const usage = referenceUsage(p.brandId);
        return rows.map((r) => scoreRef(r, p)).sort((a, b) => {
            const au = usage.get(`library:${a.ref.id}`) ?? { count: 0, last: "" };
            const bu = usage.get(`library:${b.ref.id}`) ?? { count: 0, last: "" };
            return b.score - a.score || au.count - bu.count || au.last.localeCompare(bu.last) || a.ref.id.localeCompare(b.ref.id);
        }).slice(0, opts.limit ?? 60);
    }
    return chooseCandidates(libraryCandidates(rows, p.brandId), { brandId: p.brandId, stage: p.stage, industry: p.vertical, productType: p.format, count: opts.limit ?? 60 }, referenceUsage(p.brandId))
        .slice(0, opts.limit ?? 60).map((c) => scoreRef(c.value, p));
}
export const DEFAULT_TYPES: Record<LibraryKind, string[]> = {
    pdp: ["hero-packshot", "scale-in-hand", "whats-included", "benefit-infographic", "ingredient-breakdown", "in-use", "versus-comparison"],
    photoshoot: ["studio_hero", "prop_still_life", "hard_light_still_life", "flat_lay", "macro_texture", "on_body_detail", "lifestyle_model", "environmental_scene"],
    ad: ["product-hero-and-minimal", "callout-diagram", "ingredient-stat-and-spec", "review-and-testimonial", "comparison-and-us-vs-them", "problem-and-symptom-framing"],
};
export const spineNote = `The default gallery follows the 7-slot spine (${PDP_SPINE.map((t) => pdpType(t)?.label ?? t).join(", ")}), with types the library has no examples of left out.`;
export function suggestSet(library: LibraryKind, p: ProductProfile, types: string[] = DEFAULT_TYPES[library]): Scored[] {
    const out: Scored[] = [];
    const brands = new Set<string>();
    for (const type of types) {
        const ranked = rankRefs(library, p, { type, limit: 30 });
        const pick = ranked.find((s) => !s.ref.brand || !brands.has(advertiserKey(s.ref.brand))) ?? (library !== "ad" ? ranked[0] : undefined);
        if (!pick)
            continue;
        if (pick.ref.brand)
            brands.add(advertiserKey(pick.ref.brand));
        out.push({ ...pick, reason: `${typeLabel(library, type)}: ${pick.reason}` });
    }
    return out;
}
export const STAGE_AD_TYPES: Record<string, string[]> = {
    unaware: ["problem-and-symptom-framing", "native-format-mimicry", "lifestyle-and-editorial", "conceptual-and-scale"],
    problem_aware: ["problem-and-symptom-framing", "native-format-mimicry", "conceptual-and-scale", "handmade-and-anti-design", "lifestyle-and-editorial", "callout-diagram"],
    solution_aware: ["comparison-and-us-vs-them", "callout-diagram", "ingredient-stat-and-spec", "problem-and-symptom-framing", "review-and-testimonial", "product-hero-and-minimal"],
    product_aware: ["review-and-testimonial", "ingredient-stat-and-spec", "comparison-and-us-vs-them", "callout-diagram", "product-hero-and-minimal", "lifestyle-and-editorial"],
    most_aware: ["product-hero-and-minimal", "review-and-testimonial", "bundle-kit-and-range", "ingredient-stat-and-spec", "comparison-and-us-vs-them", "callout-diagram"],
};
export function suggestLayouts(p: ProductProfile, count: number, opts: {
    stage?: string | null;
    skipBrand?: string;
} = {}): Scored[] {
    const types = STAGE_AD_TYPES[opts.stage ?? ""] ?? DEFAULT_TYPES.ad;
    const skip = opts.skipBrand?.toLowerCase();
    const t = schema.libraryRefs;
    const rows = db.select().from(t).where(and(eq(t.library, "ad"), eq(t.usable, true), inArray(t.type, types))).all()
        .filter((r) => !r.tags.owner_brand_id || r.tags.owner_brand_id === p.brandId);
    const candidates = libraryCandidates(rows, p.brandId);
    const usage = referenceUsage(p.brandId);
    const profile = { ...p, stage: opts.stage };
    const queues = types.map((type) => chooseCandidates(candidates.filter((c) => c.value.type === type), { brandId: p.brandId, stage: opts.stage, industry: p.vertical, productType: p.format, count: 200 }, usage)
        .map((c) => scoreRef(c.value, profile)).filter((s) => !skip || advertiserKey(s.ref.brand ?? "") !== advertiserKey(skip)));
    const out: Scored[] = [];
    const brands = new Set<string>();
    while (out.length < count && queues.some((q) => q.length)) {
        for (let k = 0; k < types.length && out.length < count; k++) {
            const q = queues[k];
            while (q.length && q[0].ref.brand && brands.has(advertiserKey(q[0].ref.brand)))
                q.shift();
            const pick = q.shift();
            if (!pick)
                continue;
            if (pick.ref.brand)
                brands.add(advertiserKey(pick.ref.brand));
            out.push({ ...pick, reason: `${typeLabel("ad", types[k])}: ${pick.reason}` });
        }
    }
    return out;
}
export interface PhotoFrame {
    id: string;
    label: string;
    type: string;
    direction: string;
}
export const PHOTO_FRAMES: PhotoFrame[] = [
    { id: "hero", label: "Studio hero", type: "studio_hero", direction: "The product alone, front on and sharp, on a clean background in 1 of the brand's colours." },
    { id: "with_ingredients", label: "With what it is made of", type: "prop_still_life", direction: "The product with the real things it is made of, or goes with, arranged around it. Only things the product facts name." },
    { id: "hard_light", label: "Hard light, graphic", type: "hard_light_still_life", direction: "Hard sun, 1 sharp shadow, 1 bold block of colour. Graphic and simple." },
    { id: "whole_order", label: "Flat lay: the whole order", type: "flat_lay", direction: "From straight above: everything a customer gets in 1 order, laid out neatly with even gaps." },
    { id: "inside", label: "Macro: what is inside", type: "macro_texture", direction: "Very close on what is inside the pack, out of the pack: its texture, colour and detail." },
    { id: "in_hand", label: "In hand, for scale", type: "on_body_detail", direction: "An adult hand holding the product the way it is really held, so its size is clear. No face." },
    { id: "moment_of_use", label: "The moment of use", type: "lifestyle_model", direction: "An adult using the product at the moment it is used, in a real room, in daylight. Unposed." },
    { id: "at_home", label: "Where it lives at home", type: "environmental_scene", direction: "The product small in the place it is kept or used at home: a counter, a shelf, a bedside. The room is the picture." },
    { id: "on_the_go", label: "Out of the house", type: "environmental_scene", direction: "The product out of the house: in a bag, on a desk at work, in a car, at a gym. A place this buyer really goes." },
    { id: "routine", label: "Part of the routine", type: "prop_still_life", direction: "The product among the things of the routine it joins (a coffee cup, keys, a water bottle, a notebook). No other brand's product." },
    { id: "pattern", label: "Flat lay: pattern", type: "flat_lay", direction: "From straight above: the same product repeated in a tidy pattern on 1 flat colour." },
    { id: "pack_detail", label: "Macro: the pack", type: "macro_texture", direction: "Very close on the pack itself: its label, its seal, its finish, at an angle, with shallow focus." },
    { id: "motion", label: "Caught in motion", type: "hard_light_still_life", direction: "The product caught mid-movement the way it is really used: opened, tipped, poured or dropped, frozen sharp." },
    { id: "group", label: "A month of it", type: "studio_hero", direction: "Several of the same product stacked or lined up, the way a month's supply looks. The same product repeated, never a second product." },
    { id: "shared", label: "Shared", type: "on_body_detail", direction: "2 adults' hands, 1 passing the product to the other across a table. No faces." },
];
export const photoFrame = (id: string) => PHOTO_FRAMES.find((f) => f.id === id);
export function suggestFrames(p: ProductProfile, frames: PhotoFrame[] = PHOTO_FRAMES.slice(0, 12)): {
    frame: PhotoFrame;
    pick: Scored;
}[] {
    const used = new Set<string>();
    const brands = new Map<string, number>();
    const out: {
        frame: PhotoFrame;
        pick: Scored;
    }[] = [];
    for (const frame of frames) {
        const ranked = rankRefs("photoshoot", p, { type: frame.type, limit: 40 }).filter((s) => !used.has(s.ref.id));
        const pick = ranked.find((s) => !s.ref.brand || (brands.get(s.ref.brand) ?? 0) < 2) ?? ranked[0];
        if (!pick)
            continue;
        used.add(pick.ref.id);
        if (pick.ref.brand)
            brands.set(pick.ref.brand, (brands.get(pick.ref.brand) ?? 0) + 1);
        out.push({ frame, pick: { ...pick, reason: `${frame.label}: ${pick.reason}` } });
    }
    return out;
}
export function suggestTemplate(p: ProductProfile): {
    bucket: string;
    pick: Scored | null;
}[] {
    const brands = new Set<string>();
    return PDP_BUCKETS.map((b) => {
        const ranked = rankRefs("pdp", p, { bucket: b.id, limit: 40 });
        const pick = ranked.find((s) => !s.ref.brand || !brands.has(s.ref.brand)) ?? ranked[0] ?? null;
        if (pick?.ref.brand)
            brands.add(pick.ref.brand);
        return { bucket: b.id, pick };
    });
}
