import { VIEW_INFO, type PhotoView } from "./views";
import type { StudioItem, StudioRunRow } from "@/db/schema";
import type { ProductPlace } from "../product-in-picture";
import { lookFromStudio, lookToVariety, productFromLegacy, tasteFromLegacy } from "../taste/compat";
import { decide, PRODUCT } from "../taste/decisions";
import { stageOf } from "../taste/defaults";
import { compactTaste, parseTaste } from "../taste/schema";
import type { ContextPlan, ProductStop, Stage, Surface, Taste } from "../taste/types";
type RunLike = Pick<StudioRunRow, "kind" | "context">;
type ItemLike = Pick<StudioItem, "ref_id"> & Partial<Pick<StudioItem, "type" | "world" | "mode" | "fidelity" | "plan" | "taste" | "stage" | "bucket">>;
const NATIVE_TYPE = "native-format-mimicry";
export const isNative = (item: Pick<ItemLike, "type" | "mode"> | null | undefined) => item?.type === NATIVE_TYPE || item?.mode === "native";
export function surfaceOf(run: RunLike, item?: ItemLike | null): Surface {
    if (run.kind === "pdp")
        return "pdp";
    if (run.kind === "photoshoot")
        return "photoshoot";
    if (isNative(item))
        return "native_ad";
    const given = run.context?.surface;
    if (given === "carousel" || given === "native_ad" || given === "sprint_ad")
        return given;
    return run.context?.sprint ? "sprint_ad" : "image_ad";
}
export const stageId = (awareness: string | null | undefined): Stage | null => stageOf(awareness?.trim().toLowerCase().replace(/[\s-]+/g, "_"));
export const stageFor = (run: RunLike, item?: ItemLike | null): Stage | null => stageId(item?.plan?.awareness) ?? stageId(item?.stage) ?? stageId(run.context?.stage);
const PHOTOSHOOT_LOOK = "reference" as const;
export function tasteOf(run: RunLike, item?: ItemLike | null): Taste {
    const c = run.context ?? ({} as RunLike["context"]);
    const hasRef = !!item?.ref_id;
    const set = tasteFromLegacy({ taste: parseTaste(c.taste), variety: c.variety, fidelity: c.fidelity, product_in_picture: c.product_in_picture, text_on_image: c.text_on_image }, hasRef, "picture");
    if (hasRef && !parseTaste(c.taste).look && c.fidelity === "loose" && c.variety == null)
        set.look = "brand";
    const own: Taste = {};
    if (item?.fidelity)
        own.look = item.fidelity === "loose" && hasRef && (set.look ?? "between") === "between" ? "brand" : lookFromStudio(item.fidelity, lookToVariety(set.look ?? "between"), hasRef);
    const planned = item?.plan?.product_stop ?? (set.product ? undefined : productFromLegacy(item?.plan?.product));
    if (planned)
        own.product = planned;
    const t = { ...set, ...own, ...parseTaste(item?.taste) };
    if (run.kind === "photoshoot" && hasRef && !t.look)
        t.look = PHOTOSHOOT_LOOK;
    return compactTaste(t);
}
export interface PlanFacts {
    stage?: string | null;
    refOk?: boolean;
    hasBrandRefs?: boolean;
    productHasPhoto?: boolean;
}
const OWN_REFERENCE_TYPE = "your-reference";
export const lookDropsLayout = (run: RunLike, item?: ItemLike | null): boolean => run.kind === "ad" && !!run.context?.format_look && !!item?.ref_id && item.type !== OWN_REFERENCE_TYPE;
export function planFor(run: RunLike, item?: ItemLike | null, facts: PlanFacts = {}): ContextPlan {
    return decide({
        surface: surfaceOf(run, item),
        stage: stageId(facts.stage) ?? stageFor(run, item),
        format: item?.world ?? item?.type ?? null,
        hasReference: !!item?.ref_id && facts.refOk !== false && !lookDropsLayout(run, item),
        ...(run.context?.from_script ? { fromScript: true } : {}),
        ...(facts.hasBrandRefs === undefined ? {} : { hasBrandRefs: facts.hasBrandRefs }),
        ...(facts.productHasPhoto === undefined ? {} : { productHasPhoto: facts.productHasPhoto }),
    }, tasteOf(run, item));
}
export const placeOfStop = (stop: ProductStop): ProductPlace => (stop === "none" ? "none" : stop === "scene" ? "background" : "shown");
export const PRODUCT_FRAME: Record<ProductStop, {
    share: string;
    where: string;
}> = {
    none: { share: "", where: "" },
    scene: { share: "5 to 10% of the frame's area", where: "on the surface where it is really kept, in an outer third of the frame, beside or behind the subject, off the centre line" },
    clear: { share: "12 to 25% of the frame's area", where: "in the hand of the person or on the surface where the moment happens, whole and easy to read, off the centre line" },
    hero: { share: "45 to 65% of the frame's area", where: "on the centre line, in front of everything else, its front to the camera, alone on a plain ground" },
};
export const HERO_PICTURES = [
    {
        id: "alone",
        note: PRODUCT.hero.note,
        share: PRODUCT_FRAME.hero.share,
        where: PRODUCT_FRAME.hero.where,
        more: " No person, no hand holding it and no room: if anything but the product draws the eye, the picture is wrong.",
        size: " Nothing else competes with it: no person, no room.",
    },
    {
        id: "in_place",
        note: "The product is the subject: the biggest thing in frame, exactly as photographed, standing in its own place: the real surface where it is kept or used, the room soft behind it, 1 or 2 everyday things beside it. No person and no hand.",
        share: "35 to 50% of the frame's area",
        where: "standing on the real surface where it is kept or used, in front of everything else, its front to the camera, the room behind it soft and out of focus",
        more: " No person and no hand. The place is a setting, never a second subject: nothing in it is as sharp or as large as the product.",
        size: " The room behind it is soft and out of focus, and nothing in it is as large as the product. No person, no hand.",
    },
    {
        id: "in_hand",
        note: "The product is the subject: the biggest thing in frame, exactly as photographed, held up toward the camera in 1 hand, as it is sold: nothing opened, nothing poured. The hand and the forearm are in frame. A person, if seen at all, is behind the product, smaller than it and out of focus.",
        share: "35 to 50% of the frame's area",
        where: "held up toward the camera in 1 hand, at its true size against that hand, its front to the camera and easy to read, the place behind it soft and out of focus",
        more: " The hand holds it by its sides, with no finger across its front or its name. A product too big to hold in 1 hand stands on its surface with the hand resting on it.",
        size: " 1 hand holds it by its sides, with no finger across its front. Anyone behind it is smaller than the product and out of focus.",
    },
] as const;
export type HeroPicture = (typeof HERO_PICTURES)[number];
export const HERO_NOTE = "The product is the subject: the biggest thing in frame, exactly as photographed. A set does not show it the same way twice: each ad has 1 of 3 hero pictures, given with the ad itself. In all 3 it is sharp and lit to be looked at, and no prop and no type competes with it. A smaller unit from inside the pack is secondary, unless the ad is about using 1.";
export const heroLine = (h: HeroPicture, open = false): string => `The hero picture of this ad${open ? ", if its stage makes the product the hero" : ""}: ${productFrameRule("hero", h)}`;
export function productFrameRule(stop: ProductStop, hero?: HeroPicture): string {
    const f = PRODUCT_FRAME[stop];
    if (stop === "none")
        return `${PRODUCT.none.note} No product photo is sent with it.`;
    if (stop === "hero" && hero)
        return `${hero.note} Size and place: the product takes ${hero.share}, ${hero.where}.${hero.more}`;
    const more = stop === "scene" ? " A person, a room or an object of the scene is the biggest thing in the frame, and nothing points at the product." : stop === "clear" ? " The moment (a person, a hand, the place) is the picture and takes more of the frame than the product does. If the product stands alone on a plain ground, the picture is wrong." : stop === "hero" ? " No person, no hand holding it and no room: if anything but the product draws the eye, the picture is wrong." : "";
    return `${PRODUCT[stop].note} Size and place: the product takes ${f.share}, ${f.where}.${more}`;
}
const KEEP = "shape, colours, materials, label, wording and typeface";
const IDENTITY = `This photo says what the product IS: its ${KEEP}, and its true proportions. Keep all of that exact. It does not say how the product is seen here: the angle, the distance, the light on it, what holds it and where it stands are this picture's own`;
export function productPhotoRoleFor(stop: ProductStop, name: string, spot = "", o: {
    view?: PhotoView;
    held?: boolean;
    hero?: HeroPicture;
} = {}): string {
    const f = stop === "hero" && o.hero ? o.hero : PRODUCT_FRAME[stop];
    const at = spot.trim() ? ` It sits ${spot.trim().replace(/\.$/, "")}.` : "";
    const seen = o.view && o.view !== "other" ? `, ${VIEW_INFO[o.view].is}` : "";
    const what = o.held ? `Keep it exactly as photographed: ${KEEP}` : IDENTITY;
    if (stop === "scene")
        return `The product: ${name}${seen}. This photo is for IDENTITY ONLY: what the product looks like (${KEEP}). It does not set the product's size or its place. The photo shows it large; in the picture it is small: ${f.share}, ${f.where}.${at}`;
    if (stop === "hero")
        return `The product: ${name}${seen}. It is the subject of the picture: ${f.share}, ${f.where}.${at} ${what}`;
    return `The product: ${name}${seen}. ${what}. In the picture it takes ${f.share}, ${f.where}: it is in the moment, not the whole picture.${at}`;
}
export function productViewRole(name: string, view: PhotoView): string {
    if (view === "several")
        return `Several of the same product (${name}) together, in a real photo. For what the product is only: the picture shows as many as its scene says, not as many as this photo does`;
    if (view === "single unit")
        return `1 single unit of the same product (${name}), out of the pack it is sold in, in a real photo. Wherever the picture shows 1 unit (in a hand, being opened, beside the pack) it is exactly this: its ${KEEP}, at its true size against a hand. The picture shows a unit only where its scene has one`;
    return `The same product (${name}) ${VIEW_INFO[view].is}, in a real photo. For what the product is from there only (its ${KEEP}): never a second product in the picture, and never how it is posed`;
}
export function productSizeLine(stop: ProductStop, spot = "", hero?: HeroPicture): string {
    if (stop === "none")
        return "";
    const f = stop === "hero" && hero ? hero : PRODUCT_FRAME[stop];
    const whole = stop === "clear" || stop === "hero" ? " The whole product is inside the frame, with clear room between it and every edge: no part of the pack is cut off by the frame, and nothing is laid across its front. Where the product at this size would not fit whole beside the words, it is made smaller: the whole product in the frame comes before its size." : "";
    return `PRODUCT SIZE AND PLACE. The product takes ${f.share}, ${f.where}.${whole}${spot.trim() ? ` It sits ${spot.trim().replace(/\.$/, "")}.` : ""}${stop === "clear" ? " A person, a hand or the scene takes more of the frame than the product. A pack standing alone on a plain ground is wrong here." : stop === "hero" ? (hero?.size ?? " Nothing else competes with it: no person, no room.") : ""}${stop === "scene" ? " The product photo attached shows it large: that is for what it looks like, not for how big it is here. If the product is the biggest thing in the frame, the picture is wrong." : ""}`;
}
export const ZONE_HOLDS = ["product", "person", "hands", "prop", "background", "headline", "subhead", "points", "badge", "button", "logo", "chart", "table", "quote", "photo", "icon", "empty space"] as const;
const COLOUR = /\b(?:(?:light|dark|deep|pale|bright|soft|warm|cool|muted|pastel|neon|hot|off)[- ])?(?:red|orange|yellow|green|blue|purple|violet|pink|magenta|brown|beige|cream|ivory|tan|teal|turquoise|cyan|navy|maroon|burgundy|olive|lime|mint|sage|emerald|gold|golden|silver|bronze|copper|grey|gray|charcoal|black|white|lavender|lilac|peach|coral|salmon|mustard|indigo|khaki|terracotta|rose|blush|crimson|scarlet|amber|aqua|ochre|taupe)(?:ish)?(?:[- ](?:coloured|colored|toned|tinted))?\b|#[0-9a-f]{3,8}\b/gi;
export const stripColours = (s: string): string => s.replace(COLOUR, "").replace(/\s+([,.;:])/g, "$1").replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").replace(/\b(a|an|the)\s+(?=[,.;:]|$)/gi, "").trim();
export function zoneHolds(v: unknown): string {
    const t = String(v ?? "").toLowerCase();
    return ZONE_HOLDS.find((h) => t === h) ?? ZONE_HOLDS.find((h) => new RegExp(`\\b${h}`).test(t)) ?? "an object";
}
export interface ReferenceStructure {
    zones: {
        where: string;
        share: string;
        holds: string;
        size?: string;
    }[];
    camera?: string;
    light?: string;
    type?: string;
}
export function structureText(s: ReferenceStructure | null | undefined): string {
    const zones = (s?.zones ?? []).filter((z) => z.where?.trim());
    if (!zones.length)
        return "";
    const lines = zones.slice(0, 10).map((z, i) => `${i + 1}. ${stripColours(z.where)}${z.share?.trim() ? ` (${stripColours(z.share)} of the frame)` : ""}: ${zoneHolds(z.holds)}${z.size?.trim() ? `, ${stripColours(z.size)}` : ""}.`);
    const more = [s?.camera?.trim() ? `Camera: ${stripColours(s.camera)}` : "", s?.light?.trim() ? `Light: ${stripColours(s.light)}` : "", s?.type?.trim() ? `Type, in reading order: ${stripColours(s.type)}` : ""].filter(Boolean).map((x) => (/[.!?]$/.test(x) ? x : `${x}.`));
    return [`The frame, zone by zone:`, ...lines, ...more].join("\n");
}
export const STRUCTURE_RULE = `How close to the reference: STRUCTURE. Read the reference image before you plan and fill \`reference_structure\`: \`zones\` (each zone of the frame in reading order: \`where\` it is, its \`share\` of the frame as a percentage, what it \`holds\` as 1 of ${ZONE_HOLDS.join(", ")}, and for type or the product its \`size\` against the rest), \`camera\` (angle and distance), \`light\` (hard or soft, where it comes from) and \`type\` (the blocks of type from biggest to smallest and how each is set: weight, case, alignment). It is structure only: no colour is named, the reference's product is only ever "product", and none of its words, brand or people is written down. The image model is never shown the reference: these fields are all it gets of the layout. Then \`layout\` and the placing in \`scene\` follow the zones one for one, with 1 text for each block of type it has. The colours, the typefaces, the surface, the styling and what the product is are this brand's own, from what was sent here. \`reference_read\` is an empty string.`;
export const PDP_FORMS = [
    { id: "pack-and-line", what: "the product large with 1 statement" },
    { id: "split", what: "the frame in 2 halves, a photo on one and type on the other" },
    { id: "steps", what: "numbered steps in a row or a column, each with a small photo" },
    { id: "cards-grid", what: "a grid of cards or tiles" },
    { id: "versus", what: "2 columns set against each other" },
    { id: "annotated-photo", what: "1 photo fills the frame and short labels sit on the parts of it they are about" },
    { id: "full-photo-caption", what: "1 photograph of the product in use fills the frame, with 1 line over it" },
    { id: "big-number", what: "1 number or 1 word set very large carries the answer, the product small beside it" },
    { id: "table", what: "a table or a chart is the picture" },
    { id: "close-up-inset", what: "a close-up fills the frame, with a small inset of the whole product" },
] as const;
export type PdpForm = (typeof PDP_FORMS)[number]["id"];
export const pdpFormId = (v: unknown): PdpForm | "" => {
    const t = String(v ?? "").trim().toLowerCase().replace(/[`'"]/g, "").replace(/[\s_/]+/g, "-");
    return PDP_FORMS.find((f) => t === f.id || t.startsWith(f.id))?.id ?? "";
};
export function pdpNewRule(usual: string): string {
    return `**A new layout for this frame.** The job is kept: the question it answers and what it needs from the brand. The layout is free, and its wireframe is not sent. Its usual layout is: "${usual}" Layouts: ${PDP_FORMS.map((f) => `\`${f.id}\` (${f.what})`).join("; ")}. Fill \`forms_used\` with the 1 layout of that list the usual one is, then \`form\` with another one that answers the same question for this product. \`scene\` and \`layout\` are that layout through and through. Start \`adaptation\` with it and why.`;
}
export function pdpFormFault(form: string, used: string[]): string {
    const id = pdpFormId(form);
    const taken = used.map(pdpFormId).filter(Boolean);
    const free = PDP_FORMS.map((f) => f.id).filter((f) => !taken.includes(f));
    if (!id)
        return `\`form\` must name 1 layout of the list. Choose from: ${free.join(", ")}.`;
    if (taken.includes(id))
        return `The layout \`${id}\` is the frame's usual one. Plan this frame again in another: ${free.join(", ")}. Change \`scene\` and \`layout\` to it, not only its name.`;
    return "";
}
export const keptKey = (asset: string): string => {
    const m = asset.replace(/\\/g, "/").match(/^([^/]+)\/([a-z]+_\d+)_/);
    return m ? `${m[1]}/${m[2]}` : "";
};
export function formsOfKept(runs: {
    id: string;
    items: {
        id: string;
        outputs: unknown[];
        plan?: object | null;
    }[];
}[], kept: Set<string>): string[] {
    return [...new Set(runs.flatMap((r) => r.items.filter((i) => i.outputs.length && kept.has(`${r.id}/${i.id}`)).map((i) => (i.plan as {
            form?: string;
        } | null | undefined)?.form ?? "")).filter(Boolean))];
}
