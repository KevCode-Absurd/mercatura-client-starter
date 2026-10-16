import type { AwarenessStage } from "./taxonomy";
export const PRODUCT_IN_PICTURE = ["auto", "none", "background", "shown"] as const;
export type ProductInPicture = (typeof PRODUCT_IN_PICTURE)[number];
export type ProductPlace = Exclude<ProductInPicture, "auto">;
export const PRODUCT_IN_PICTURE_INFO: Record<ProductInPicture, {
    label: string;
    hint: string;
}> = {
    auto: { label: "Decide by the buyer's stage", hint: "Left out for unaware and problem aware buyers and for native ads. Shown from solution aware on." },
    none: { label: "Leave the product out", hint: "The picture is the buyer's moment. No product photo is sent to the image model." },
    background: { label: "In the background", hint: "The product is an ordinary thing in the room, small and never the subject." },
    shown: { label: "Show the product", hint: "The product as photographed is part of the picture." },
};
export function productPlace(choice: ProductInPicture | undefined, awareness: AwarenessStage | string | undefined, native = false): ProductPlace {
    if (choice && choice !== "auto")
        return choice;
    return native || awareness === "unaware" || awareness === "problem_aware" ? "none" : "shown";
}
export const sendsProductPhoto = (place: ProductPlace) => place !== "none";
export function productRule(place: ProductPlace): string {
    if (place === "none")
        return "The product is not in this picture: no pack, no label, no brand name, no logo, nothing that reads as the thing for sale. The picture is the buyer's own moment: the moment the problem hurts, the moment they notice it, the workaround, or the thing they tried that failed (generic and unbranded). No product photo is sent with it.";
    if (place === "background")
        return "The product is in this picture, but only as an ordinary thing in the room: small, off to one side or behind the subject, partly hidden or out of focus, where it would really be kept. It is never the subject, never held up to the camera, never centred, and nothing points at it. The picture still works with it taken out. It is the pack as photographed.";
    return "The product is in this picture as it is sold and photographed. A smaller unit from inside it (1 serving, 1 piece) is the subject only where the ad is about using 1 and a real photo of that 1 unit is attached; otherwise it is small and secondary, never the biggest thing in the frame and never the only product. Where the facts do not say how something opens or is used, show it closed or at rest.";
}
export function productPhotoRole(place: ProductPlace, name: string): string {
    const keep = "Keep it exactly as photographed: shape, colours, materials, label, wording and typeface";
    return place === "background" ? `The product: ${name}. It appears only small and in the background, as an ordinary thing in the room. ${keep}` : `The product: ${name}. ${keep}`;
}
