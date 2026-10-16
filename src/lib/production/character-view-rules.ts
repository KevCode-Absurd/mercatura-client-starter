import type { ProductionState } from "@/db/schema";
import type { FormatRecipe } from "../formats";
import { recipeUsesCharacterOnly, sheetViews } from "./prompts";
export const CHARACTER_VIEWS = [
    { label: "Face, front", direction: "Head and shoulders, straight front view, relaxed neutral face, eyes into the camera." },
    { label: "Waist up, three-quarter", direction: "Waist up, three-quarter view, the same relaxed neutral face, mouth closed." },
    { label: "Full body, front", direction: "Standing full-body straight front view, face and torso directly toward the camera, hands at the sides, fingers together." },
    { label: "Face, right profile", direction: "Head and shoulders in strict 90-degree right-facing profile. Nose points to the image's right edge, only the near eye is visible. Not a three-quarter view." },
    { label: "Full body, back", direction: "Standing full-body straight back view, head and torso directly away from the camera, showing the back of the hair and outfit. Hands at the sides." },
    { label: "Hands", direction: "Close-up of both hands at chest height, five fingers on each hand, with the cuffs of the same outfit." },
] as const;
export function characterViewIndices(value: unknown): number[] {
    if (!Array.isArray(value) || value.length < 1 || value.length > 6 || value.some((i) => !Number.isSafeInteger(i) || i < 0 || i > 5) || new Set(value).size !== value.length) {
        throw new Error("Choose 1 to 6 different character views, using panel indices 0 to 5.");
    }
    return [...value];
}
export function characterViewsRepairable(p: ProductionState, recipe: FormatRecipe | null): boolean {
    return !!recipe && sheetViews(recipe) === 6 && !recipeUsesCharacterOnly(recipe) && !!p.video_plan?.cast.presenter && !p.video_plan.cast.guest && p.character?.panels.length === 6;
}
export function characterViewDirection(index: number): string {
    characterViewIndices([index]);
    const fullBody = index === 2 || index === 4;
    return [
        `ONE square reference photograph of the same single fictional adult. Required view: ${CHARACTER_VIEWS[index].direction}`,
        fullBody
            ? "Fit the ENTIRE standing person inside this square: top of head, both legs, ankles, BOTH complete feet or shoes and both soles fully visible. The person occupies at most 70% of the image height. Leave at least 15% empty background above the head and 15% below the lowest sole, plus space beside both arms. Pull the camera back to achieve this. No body part touches an image edge; no knee-up, ankle crop or cut-off shoes. Show the floor beneath both feet."
            : "Keep every part required by this view inside the square, with space around its edges.",
        `Image 1 is the chosen portrait: match its face, skin, eyes, nose, hair and distinctive marks exactly. ${fullBody ? "Do not copy its head-and-shoulders crop: draw the entire person in the outfit and build described below. The full-body framing above is authoritative." : "Image 2 is the old view for outfit, build and accessories only. Match those details, but IGNORE its pose, crop, framing and background. The required view and framing above are authoritative."} Keep the same number and placement of jewellery and marks. Plain warm off-white background, soft even daylight. No product, props, captions, text, border, collage or multiple panels.`,
    ].join("\n\n");
}
