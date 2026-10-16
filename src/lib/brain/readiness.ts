import type { BrandBrain } from "../brand-brain";
import { realQuotes } from "./brief";
import { readAllDocs, sec, type DocId, type LoadedDoc } from "./docs";
import { fieldValue, itemsOf, tableOf } from "./md";
import { brandWorldOf, motionSoundOf, onCameraOf, productFactsOf, termsOf, type OnCamera } from "./on-camera";
import { assetFolders } from "./products";
export type NeedKey = "looks" | "pack" | "use" | "pack_photo" | "product_photo" | "use_photo" | "moves" | "world" | "sound" | "voice" | "kind" | "how_it_works" | "replaces" | "made_of" | "size" | "box" | "proof" | "quotes" | "offer" | "terms" | "look" | "faq";
interface NeedInfo {
    label: string;
    without: string;
    tab: "products" | "guidelines" | "customers" | "facts";
    field: string;
}
export const NEEDS: Record<NeedKey, NeedInfo> = {
    looks: { label: "What the product itself looks like", without: "The model invents its shape and colour.", tab: "products", field: "Looks like" },
    pack: { label: "What its pack looks like, and what is printed on it", without: "The label is drawn from memory and comes out as scribble.", tab: "products", field: "Pack" },
    use: { label: "How it is used, step by step", without: "It is opened, held or worn in a way nobody does.", tab: "products", field: "How it is used" },
    pack_photo: { label: "A plain photo of the product as it is sold", without: "There is nothing to hold the picture to.", tab: "products", field: "Reference photos: pack front" },
    product_photo: { label: "A plain photo of the product out of its pack, or in a hand", without: "What comes out of the pack is made up, and so is its size.", tab: "products", field: "Reference photos: out of pack, in hand" },
    use_photo: { label: "A photo of it being used or worn", without: "The action is guessed.", tab: "products", field: "Reference photos: in use, on body" },
    moves: { label: "What the product does that a camera can show, and how it sounds", without: "The motion is one the product cannot make.", tab: "products", field: "Moves and sounds, Visible result" },
    world: { label: "Where the brand's pictures happen", without: "The scene is set in a generic room.", tab: "guidelines", field: "Brand world" },
    sound: { label: "How the brand's video sounds", without: "The clip gets whatever sound the model makes.", tab: "guidelines", field: "Motion and sound: Sound" },
    voice: { label: "The voice on camera: language, accent, pace", without: "The model picks its own accent.", tab: "guidelines", field: "Motion and sound: Voice" },
    kind: { label: "What kind of product it is, and whether it is bought once or again", without: "The offer, the objections and the shots are the wrong ones for it.", tab: "products", field: "Kind" },
    how_it_works: { label: "How it works, in 1 line, with where that is stated", without: "The script argues from adjectives, or a mechanism is invented.", tab: "products", field: "How it works" },
    replaces: { label: "What the buyer used before", without: "There is nothing to compare against.", tab: "products", field: "Replaces" },
    made_of: { label: "What it is made of, with amounts", without: "An ingredient or material panel is left out or guessed.", tab: "products", field: "Made of" },
    size: { label: "Its size, fit or serving", without: "A size, a fit or a dose is left out or guessed.", tab: "products", field: "Size and fit" },
    box: { label: "What arrives in the box", without: "The what-you-get picture is left out.", tab: "products", field: "In the box" },
    proof: { label: "Proof with its source: a number, a study, a rating", without: "The ad has nothing it can prove.", tab: "facts", field: "Claims, or Proof on file in Guidelines" },
    quotes: { label: "What real customers said, word for word", without: "No customer's words can be shown.", tab: "customers", field: "Grounded in (customer evidence)" },
    offer: { label: "An offer", without: "There is nothing to say at the end but the price.", tab: "facts", field: "Offers" },
    terms: { label: "Delivery, returns and guarantee terms", without: "The risk line is left out.", tab: "products", field: "Delivery, returns and guarantee" },
    look: { label: "The brand's colours and typefaces", without: "Words on the picture are set in a generic type.", tab: "guidelines", field: "Color palette, Typography" },
    faq: { label: "The questions buyers ask", without: "The page has no questions to answer.", tab: "products", field: "Questions buyers ask" },
};
const SHOWN: NeedKey[] = ["looks", "pack", "pack_photo"];
const USED: NeedKey[] = [...SHOWN, "use", "product_photo"];
export const FORMAT_NEEDS: Record<string, NeedKey[]> = {
    "wide-face": [...SHOWN, "world", "look"],
    "ad-layout": [...SHOWN, "look", "proof"],
    "ad-concept": [...SHOWN, "world", "how_it_works", "replaces"],
    "ad-proof": ["proof", "quotes", ...SHOWN, "look"],
    "ad-offer": ["offer", "terms", ...SHOWN, "look"],
    sprint: [...SHOWN, "look", "proof", "quotes", "offer", "replaces"],
    static: [...SHOWN, "look"],
    carousel: [...USED, "look", "how_it_works"],
    "long-copy": [...SHOWN, "quotes", "replaces"],
    "advertorial-static": [...SHOWN, "how_it_works", "replaces", "proof"],
    native: ["quotes", "replaces", "use", "product_photo"],
    pdp: [...USED, "use_photo", "made_of", "size", "box", "proof", "terms", "replaces", "look"],
    photoshoot: [...USED, "use_photo", "world"],
    ugc: [...USED, "world", "voice", "kind"],
    podcast: ["how_it_works", "replaces", "pack_photo", "voice"],
    "talking-object": ["replaces", "use", ...SHOWN, "voice"],
    claymation: ["how_it_works", ...SHOWN, "voice"],
    comic: ["proof", ...SHOWN],
    explainer: ["how_it_works", "proof", ...SHOWN, "voice"],
    satisfying: ["looks", "product_photo", "moves", "use", "sound", "pack_photo"],
    "cinematic-3d": [...USED, "world", "voice"],
    cinematic: [...USED, "world", "voice", "sound"],
    "clay-world": ["how_it_works", ...SHOWN, "voice"],
    wool: ["how_it_works", ...SHOWN, "voice"],
    paper: ["how_it_works", ...SHOWN, "voice"],
    watercolor: ["how_it_works", ...SHOWN, "world", "voice"],
    anime: [...SHOWN, "how_it_works", "replaces", "voice"],
    skeleton: ["replaces", "how_it_works", "proof", ...SHOWN, "voice"],
    "motion-graphics": ["look", "proof", "how_it_works", ...SHOWN],
    collage: ["how_it_works", "proof", "replaces", ...SHOWN, "look"],
    song: ["voice", "quotes", ...SHOWN, "world"],
    "brief-ugc": ["use", "kind", "replaces", "quotes"],
    "brief-founder": ["how_it_works", "replaces", "proof"],
    "brief-editor": ["how_it_works", "proof", "offer"],
    "page-pdp": ["offer", "terms", "proof", "quotes", "made_of", "size", "box", "faq"],
    "page-listicle": ["how_it_works", "replaces", "proof", "quotes", "offer", "terms"],
    "page-advertorial": ["replaces", "how_it_works", "proof", "quotes", "offer", "terms"],
};
const filled = (v: string) => !!v.trim() && !/^(not captured|none found|tbd\b|to be written|not known|\{)/i.test(v.trim());
type Facts = Pick<BrandBrain, "claims" | "offers" | "proof_assets" | "guarantee">;
export function holdsOf(docs: Record<DocId, LoadedDoc>, folders: Record<string, string[]>, brand: Facts, productName: string | null): Record<NeedKey, boolean> {
    const g = docs.guidelines.doc;
    const p = docs.products.doc;
    const cam: OnCamera | null = productName ? onCameraOf(p, productName, folders) : null;
    const has = (job: string) => !!cam?.photos.some((x) => x.job === job);
    const facts = (productName ? productFactsOf(p, productName) : null) ?? {};
    const world = brandWorldOf(g);
    const motion = motionSoundOf(g);
    const policy = termsOf(p);
    const palette = tableOf(sec(g, "palette"))?.rows.filter((r) => /#[0-9a-f]{3,8}\b/i.test(r[1] ?? "")).length ?? 0;
    const proofRows = tableOf(sec(g, "proof"))?.rows.filter((r) => filled(r[0] ?? "")).length ?? 0;
    return {
        looks: !!cam?.looks,
        pack: !!cam?.pack,
        use: !!cam?.use,
        pack_photo: has("pack front"),
        product_photo: has("out of pack") || has("in hand"),
        use_photo: has("in use") || has("on body"),
        moves: !!cam?.moves || (!!cam?.result && !/^nothing/i.test(cam.result)),
        world: Object.keys(world ?? {}).length >= 3,
        sound: !!motion?.sound,
        voice: !!motion?.voice,
        kind: !!facts.kind,
        how_it_works: !!facts.how_it_works,
        replaces: !!facts.replaces || filled(fieldValue(sec(g, "overview"), "The old way")),
        made_of: !!facts.made_of,
        size: !!facts.size_and_fit,
        box: !!facts.in_the_box,
        proof: proofRows > 0 || brand.claims.some((c) => c.status === "substantiated") || brand.proof_assets.length > 0,
        quotes: realQuotes(docs).length >= 2,
        offer: brand.offers.length > 0,
        terms: Object.keys(policy ?? {}).length >= 2 || !!brand.guarantee?.text,
        look: palette >= 3,
        faq: itemsOf(sec(p, "faq")).length >= 3,
    };
}
export const brainHolds = (brandId: string, brand: Facts, productName: string | null) => holdsOf(readAllDocs(brandId), assetFolders(brandId), brand, productName);
export function needsOf(formatId: string, holds: Record<NeedKey, boolean>): FormatReadiness | null {
    const keys = FORMAT_NEEDS[formatId];
    if (!keys)
        return null;
    const needs = [...new Set(keys)].map((key) => ({ key, label: NEEDS[key].label, have: holds[key], without: NEEDS[key].without, field: NEEDS[key].field, href: `/brand?tab=${NEEDS[key].tab}` }));
    return { needs, missing: needs.filter((n) => !n.have).length };
}
export interface FormatReadiness {
    needs: {
        key: NeedKey;
        label: string;
        have: boolean;
        without: string;
        field: string;
        href: string;
    }[];
    missing: number;
}
export function formatReadiness(brandId: string, brand: Facts, formatId: string, productName: string | null): FormatReadiness | null {
    if (!FORMAT_NEEDS[formatId])
        return null;
    try {
        return needsOf(formatId, brainHolds(brandId, brand, productName));
    }
    catch {
        return null;
    }
}
