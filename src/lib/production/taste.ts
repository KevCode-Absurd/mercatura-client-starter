import type { ProductPlace } from "../product-in-picture";
import { lookFromVariety, productFromLegacy } from "../taste/compat";
import { LOOK_PICTURE, NO_PRODUCT_WORDS_NOTE, PRODUCT, decide } from "../taste/decisions";
import { compactTaste } from "../taste/schema";
import type { ContextPlan, FullTaste, Surface, Taste } from "../taste/types";
export interface JobTasteFacts {
    stored?: Taste | null;
    scriptTaste?: Taste | null;
    productInPicture?: unknown;
    scriptVariety?: unknown;
    referenceMode?: string | null;
    recipe: string;
    native: boolean;
    cards: number;
    video: boolean;
    stage?: string | null;
    format?: string | null;
    hasReference: boolean;
    hasReferenceImage: boolean;
    productHasPhoto: boolean;
    hasBrandRefs?: boolean;
}
export function jobTaste(f: JobTasteFacts): Taste {
    const t: Taste = { ...compactTaste(f.scriptTaste), ...compactTaste(f.stored) };
    const stored = compactTaste(f.stored);
    if (!stored.look) {
        const rebuilds = f.referenceMode === "exact" || f.referenceMode === "structure" || f.recipe === "static-remix";
        if (rebuilds && (f.video ? f.hasReference : f.hasReferenceImage))
            t.look = "reference";
        else if (!t.look && f.scriptVariety != null)
            t.look = lookFromVariety(f.scriptVariety);
    }
    if (!stored.product) {
        const old = productFromLegacy(f.productInPicture);
        if (old)
            t.product = old;
        else if (!t.product && f.referenceMode === "exact")
            t.product = "clear";
    }
    return compactTaste(t);
}
export const imageSurface = (f: Pick<JobTasteFacts, "native" | "cards">): Surface => (f.native ? "native_ad" : f.cards > 1 ? "carousel" : "image_ad");
export function jobPlan(f: JobTasteFacts, surface?: Surface): ContextPlan {
    const s = surface ?? imageSurface(f);
    const picture = s !== "shot_plan";
    const taste = jobTaste(f);
    const own = compactTaste(f.stored).product || productFromLegacy(f.productInPicture) || compactTaste(f.scriptTaste).product;
    const t: Taste = f.video && picture && !taste.product ? { ...taste, product: "clear" } : taste;
    const plan = decide({ surface: s, stage: f.stage, format: f.format, hasReference: picture ? f.hasReferenceImage : f.hasReference, hasBrandRefs: f.hasBrandRefs, productHasPhoto: f.productHasPhoto }, t);
    return s === "shot_plan" ? filmChoices(plan, own ? "person" : f.referenceMode === "exact" ? "reference" : "stage") : plan;
}
export type ProductBy = "person" | "reference" | "stage";
const filmProduct = (stop: FullTaste["product"], by: ProductBy): string => by === "reference"
    ? ""
    : stop === "none"
        ? by === "person"
            ? "The product is in no shot of this video: no pack, no label and no logo. Every shot is the buyer's own moment."
            : "The product stays out of frame until the script's words reach it: no pack, no label and no logo in any shot before that. It comes in on the cut where the words first speak of it, in use, and is then only in the shots that list it. Where the words never reach it, no shot shows it."
        : stop === "scene"
            ? "The product comes in on the cut where the script's words reach it, in use. Before that it is at most a thing in the room, where it would really be kept: small, never held up and never the subject."
            : stop === "hero"
                ? "The product is the subject of the shots that show it: the biggest thing in frame, exactly as photographed. It may be in frame from the first shot."
                : "The product comes in on the cut where the script's words reach it. From there it is shown clearly, exactly as photographed, in use or in a hand, sharing the frame with the person or the scene.";
export function filmChoices(plan: ContextPlan, by: ProductBy = "stage"): ContextPlan {
    const picture = new Set<string>([...Object.values(LOOK_PICTURE).flatMap((r) => [r.note.withRef, r.note.noRef]), ...Object.values(PRODUCT).map((r) => r.note), NO_PRODUCT_WORDS_NOTE]);
    const film = filmProduct(plan.taste.product, by);
    const notes = plan.notes.filter((n) => !picture.has(n) && !n.startsWith("Where the reference shows its product") && n !== film);
    return { ...plan, notes: [...(film ? [film] : []), ...notes], skillPath: plan.skillPath.filter((p) => !/\/(look|product)\//.test(p)) };
}
export const placeOf = (plan: ContextPlan): ProductPlace => (plan.taste.product === "none" ? "none" : plan.taste.product === "scene" ? "background" : "shown");
