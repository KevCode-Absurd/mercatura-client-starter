import { lookFromStudio, lookToStudio } from "../taste/compat";
import { decide } from "../taste/decisions";
import { lookStops } from "../taste/defaults";
import { LOOKS, type Look } from "../taste/types";
import type { Variety } from "../variety";
export const FIDELITIES = ["exact", "structure", "loose"] as const;
export type Fidelity = (typeof FIDELITIES)[number];
export const FIDELITY_DEFAULT: Fidelity = "structure";
export const CLOSENESS = LOOKS;
export type Closeness = Look;
export const CLOSENESS_DEFAULT: Closeness = "between";
export const closenessStops = (hasReference: boolean): Closeness[] => lookStops(hasReference);
export const closenessFields = (c: Closeness): {
    fidelity: Fidelity;
    variety: Variety;
} => lookToStudio(c);
export const closenessOf = (fidelity: unknown, variety: unknown, hasReference: boolean): Closeness => lookFromStudio(fidelity, variety, hasReference);
export interface Sent {
    productPhoto: boolean;
    brandImages: number;
    brandLookWords: boolean;
    referenceImage: boolean;
    referenceLayoutWords: boolean;
    referenceFunction: boolean;
    newForm: boolean;
}
export function whatIsSent(stop: Closeness, hasReference: boolean, productShown: boolean): Sent {
    const plan = decide({ surface: "image_ad", hasReference }, { look: stop, product: productShown ? "clear" : "none" });
    return {
        productPhoto: plan.attach.productPhotos !== "none",
        brandImages: plan.attach.brandDesignedImages + plan.attach.pastAds,
        brandLookWords: plan.text.brandLook === "full",
        referenceImage: plan.attach.referenceImage,
        referenceLayoutWords: plan.text.referenceDescription === "detailed",
        referenceFunction: plan.text.referenceDescription === "function",
        newForm: plan.taste.look === "new",
    };
}
export function referenceFunction(format: string | undefined, typeLabel: string): string {
    const f = (format ?? "").split(/[.;\n]/)[0].trim();
    return (f && f.length <= 120 ? f : typeLabel).replace(/\.$/, "");
}
export const fidelityOf = (v: unknown): Fidelity => ((FIDELITIES as readonly string[]).includes(String(v)) ? (v as Fidelity) : FIDELITY_DEFAULT);
export const followsReference = (f: Fidelity) => f !== "loose";
export function referencePlanRule(f: Fidelity, kind: "pdp" | "ad" | "photoshoot", image?: number): string {
    const img = image ? `image ${image}` : "the reference image";
    if (kind === "photoshoot")
        return "";
    if (f === "loose")
        return "How close to the reference: LOOSE. You are told only what kind of ad the reference is (the line \"Reference, its function\"). Make an ad that does that job. The layout and the look are yours. `reference_read` is an empty string.";
    const read = `Before you plan, read ${img} and write what you see in \`reference_read\`. Where it shows a second product for a comparison, that place is kept and filled with an unbranded stand-in of the same kind of thing, never left empty.`;
    if (f === "exact")
        return `How close to the reference: EXACT. ${read} This image is that reference rebuilt for this brand. \`scene\` and \`layout\` describe the same picture: the same composition and crop, the same camera angle and distance, the same light, the same kind of surface, background and props, and the same blocks of type and graphic devices (panels, badges, icons, lines) in the same places at the same relative sizes. Only 4 things change: the product (this brand's, as photographed), the words (yours, 1 text for each block of type the reference has, doing the same job in the same place), the colours (each colour of the reference becomes the brand colour that does the same job) and the typefaces (the brand's). Add no element the reference lacks and drop none it has, unless this product cannot fill it truthfully; say so in \`adaptation\`.`;
    return `How close to the reference: STRUCTURE. ${read} The image model will not be shown this image: \`reference_read\` is all it gets of the layout, so write it in 6 to 10 sentences, exact enough that someone who never saw the image could draw its wireframe (each zone with its share of the frame, what sits in it, how big, and where each block of type starts and ends). Keep its layout: how the frame is divided, where the product sits and how big it is, the camera angle, where each block of type and each graphic device sits, their relative sizes and the reading order. \`layout\` and the placing in \`scene\` follow it zone for zone, with 1 text for each block of type it has. The look is this brand's own: its colours, its typefaces, and the kind of light, surface and styling the brand uses.`;
}
export function referenceRole(kind: "pdp" | "ad" | "photoshoot", hasFrame = false, f: Fidelity = "loose"): string {
    if (kind === "photoshoot")
        return "Library reference for composition, camera and light only. Never copy its product, brand name, words, logo or people";
    const one = kind === "pdp" ? "product page image" : "ad";
    const never = "Never copy its product, brand name, words, logo or people";
    if (f === "exact")
        return `THE REFERENCE: the layout and the look to follow. A finished ${one} from another brand. Rebuild this image: the same composition and crop, camera, light, background and props, and the same blocks of type and graphic devices in the same places at the same sizes. In place of its product put the product of image 1, in place of its words the words given, in place of its colours and typefaces this brand's. ${never}`;
    if (f === "structure")
        return `THE REFERENCE: the layout to follow. A finished ${one} from another brand. Keep how its frame is divided, where its product sits and how big it is, its camera angle, and where each block of type and each graphic device sits and how big. The colours, the typefaces and the styling are this brand's, not the reference's. ${never}`;
    return `Library reference: a finished ${one} of this kind from another brand. Take from it how the image is built: its composition, how the frame is divided, how its type and its graphic devices sit, its camera and its light.${hasFrame ? " Where it and the wireframe disagree on structure, the wireframe wins." : ""} ${never}`;
}
export function referenceLine(f: Fidelity, refAt: number, productAt: number | null, read = ""): string {
    const product = productAt ? ` Image ${productAt} is the product: it is the object in the picture and stays exactly as photographed.` : "";
    if (f === "exact" && refAt > 0)
        return `Image ${refAt} is the reference. The finished image looks like image ${refAt} remade for this brand: same layout, same camera, same light, same placing and sizing of type. If the text below and image ${refAt} disagree on where something sits, image ${refAt} wins.${product}`;
    if (f === "structure" && read.trim())
        return `LAYOUT TO FOLLOW, zone for zone. It is the layout of a reference that is not attached: build the frame exactly as described here, with this brand's product, words, colours and typefaces. Where the text further down disagrees with this on where something sits or how big it is, this wins.\n${read.trim()}${product ? `\n${product.trim()}` : ""}`;
    return "";
}
export const logoRole = (where: string) => `The brand's logo, as a file. Place it ${where ? `${where.replace(/\.$/, "")}, ` : ""}exactly as it is in this image: the same letters, shapes, proportions and colours. Do not redraw it, retype it, restyle it or recolour it. It appears once, and not again as typed text`;
