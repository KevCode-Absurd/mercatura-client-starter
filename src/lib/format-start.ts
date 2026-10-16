import { angleLibrary } from "./angles/server";
import { characterDirection } from "./creator-studio";
import type { MinedAngle } from "./angles/library";
import { reviewNote } from "./studio/review-ads";
import { BANK_ASPECTS, BANK_NOTE } from "./studio/offer-bank";
import { loadBrandBrain } from "./brands";
import { formatById } from "./catalogue";
import { galleryFormat, stepNotes } from "./format-gallery";
import { picksFor } from "./format-picks";
import { getPersona } from "./personas/store";
import { enqueue } from "./jobs/queue";
import { startMake } from "./make";
import { arriveHref } from "./production/arrive";
import type { ProductInPicture } from "./product-in-picture";
import { createRun } from "./studio/engine";
import { studioFields } from "./taste/apply";
import { decide } from "./taste/decisions";
import { compactTaste } from "./taste/schema";
import type { Surface, Taste } from "./taste/types";
export { picksFor };
export interface FormatRequest {
    workflow?: "guided" | "automatic";
    formatId: string;
    productId: string;
    personaId: string | null;
    count: number;
    notes: {
        product?: string;
        buyer?: string;
        general?: string;
    };
    textOnImage: boolean;
    feedCopy: boolean;
    baseImage: boolean;
    productInPicture?: ProductInPicture;
    also?: boolean;
    claimChecks?: boolean;
    length?: string;
    offerId?: string;
    angleId?: string;
    hooks?: number;
    variety?: number;
    taste?: Taste;
    avatarId?: string | null;
    characterNotes?: string;
    hyperreal?: boolean;
}
export interface FormatStarted {
    href: string;
    said: string;
}
export function angleFor(brandId: string, themeId?: string | null, builderAngleId?: string | null): MinedAngle | undefined {
    const lib = angleLibrary(brandId);
    return (themeId ? lib.angles.find((a) => a.theme_id === themeId) : undefined) ?? (builderAngleId ? lib.angles.find((a) => a.angle_id === builderAngleId) : undefined) ?? lib.angles.find((a) => a.status === "unrun") ?? lib.angles[0];
}
export function startFormat(brandId: string, r: FormatRequest): FormatStarted {
    const format = galleryFormat(r.formatId);
    if (!format)
        throw new Error("That format is not in the list.");
    if (format.start.via === "screen")
        throw new Error(format.start.why);
    const brand = loadBrandBrain(brandId);
    const product = brand.products.find((p) => p.id === r.productId);
    if (!product)
        throw new Error("Pick a product this brand sells.");
    const persona = r.personaId ? brand.personas.find((p) => p.id === r.personaId) : undefined;
    if (r.personaId && !persona)
        throw new Error("That persona is not in use for this brand.");
    const notes = stepNotes(r.notes);
    const taste = compactTaste(r.taste);
    if (format.start.via === "script") {
        const written = formatById(format.start.catalogue);
        if (!written || written.start.how !== "script")
            throw new Error("That format is not started from here.");
        const direction = written.medium === "video" ? characterDirection(r.characterNotes ?? "", !!r.hyperreal) : "";
        const brief = [direction, notes].filter(Boolean).join("\n");
        if (brief.length > 2000)
            throw new Error("Shorten the combined product, buyer and character notes to 2,000 characters before creating this format. No notes have been dropped.");
        const made = startMake(brandId, { formatId: written.id, workflow: r.workflow, productId: product.id, personaId: persona?.id ?? null, offerId: null, conceptId: null, brief, length: written.start.lengths.find((l) => l === r.length) ?? written.start.lengths[0], ...(typeof r.claimChecks === "boolean" ? { claimChecks: r.claimChecks } : {}), ...(r.productInPicture ? { productInPicture: r.productInPicture } : {}), ...(r.hooks ? { hooks: r.hooks } : {}), ...(r.variety ? { variety: r.variety } : {}), taste, ...(r.avatarId !== undefined ? { avatarId: r.avatarId } : {}) });
        return { href: arriveHref(made, written.id, Date.now()), said: made.said };
    }
    const count = Math.max(format.count?.min ?? 1, Math.min(format.count?.max ?? 1, Math.round(r.count) || 1));
    const angle = format.start.picks === "review" ? angleFor(brandId, r.angleId) : undefined;
    if (format.start.picks === "review" && !angle)
        throw new Error("The angle library is empty: bring in customer sources, extract and sort them into themes first.");
    const picks = picksFor(brandId, format, product.id, count, { ...(angle ? { angle } : {}), stage: persona ? getPersona(brandId, persona.id)?.awareness : undefined });
    if (!picks.length)
        throw new Error("The library has nothing to build this on yet. Import the layout library first (the Guide says how).");
    const offer = format.start.picks === "ready" ? (brand.offers.find((o) => o.id === r.offerId) ?? brand.offers[0]) : undefined;
    const surface: Surface = format.start.kind === "pdp" ? "pdp" : format.start.kind === "photoshoot" ? "photoshoot" : format.id.includes("native") ? "native_ad" : "image_ad";
    const plan = decide({ surface, format: format.id, hasReference: false }, taste);
    const fields = studioFields(taste, false);
    const textOn = plan.text.pictureWords === "none" && taste.words ? false : r.textOnImage;
    const words = format.words && textOn;
    const id = createRun({
        brandId,
        kind: format.start.kind,
        productId: product.id,
        picks,
        ...(format.id === "ad-offer" ? { aspects: [...BANK_ASPECTS] } : {}),
        notes: [format.start.look ?? "", format.id === "ad-offer" ? BANK_NOTE : "", angle ? reviewNote(angle) : "", notes].filter(Boolean).join("\n"),
        title: angle ? `${product.name}: in their words, ${angle.label.toLowerCase()}` : `${product.name}: ${format.label.toLowerCase()}`,
        buyers: persona ? [persona.id] : [],
        ...(offer ? { offer: offer.id } : {}),
        auto: true,
        ...(format.words ? { textOnImage: textOn, feedCopy: r.feedCopy, baseImage: words && r.baseImage } : {}),
        ...(format.also?.id === "reel" && r.also ? { reel: true } : {}),
        ...(format.words && typeof r.claimChecks === "boolean" ? { claimChecks: r.claimChecks } : {}),
        ...((fields.productInPicture ?? r.productInPicture) ? { productInPicture: fields.productInPicture ?? r.productInPicture } : {}),
        ...(fields.variety ? { variety: fields.variety } : {}),
        ...(fields.fidelity ? { fidelity: fields.fidelity } : {}),
    });
    enqueue(brandId, "studio", id, { op: "plan" });
    const short = `${picks.length < count ? ` The library had ${picks.length} that fit, so this is ${picks.length}.` : ""}${plan.warnings.length ? ` ${plan.warnings.join(" ")}` : ""}`;
    const sizes = format.id === "ad-offer" ? ` Each in ${BANK_ASPECTS.join(" and ")}.` : "";
    return { href: `/studio/${id}`, said: `${picks.length} ${picks.length === 1 ? "image is" : "images are"} being planned and made.${sizes}${short}` };
}
