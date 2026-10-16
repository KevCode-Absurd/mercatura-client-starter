export const COPY_QUALITY_CONTRACT = "Use the supplied brand voice and the tone for this surface across TOFU, MOFU and BOFU. Write at the reading level given for this brand (one number, stated once with the voice rules): plain, natural sentences with a clear buyer situation, supported reason to believe and useful next action. Answer the stated buyer's problem or objection; an aware buyer needs specific supported evidence, not another convenience introduction. Keep a supported technical term only when this buyer needs it to decide, such as a BOFU comparison; explain it simply, never use jargon to inflate authority. Preserve every material claim and offer qualification. The argument and CTA must fit the buyer's awareness and the actual destination. Editorial quality is not proof of conversion lift.";
export const VISUAL_BRAND_CONTRACT = "Preserve the planned actual logo, product marks, palette and typefaces by role; do not invent extra branding in an approved native/no-brand scene. Keep approved words and their case exact. Added brand type uses the verified brand font; a missing font is an input gap, never permission to substitute Arial or another family. A specifically approved in-world lettering treatment is not a fallback. Place readable type in planned negative space; use a restrained glyph outline/shadow if needed. Never add a generic opaque text panel, remove a planned logo or replace a font to pass a check. Repair only the failing field or region and preserve successful artwork.";
export const REVIEW_QUALITY_CONTRACT = "Check every delivered copy surface for brand voice/tone, plain clarity at the brand's stated reading level (justify any necessary supported technical term), a coherent buyer argument, evidence and qualifications, and a useful CTA matching its destination. Fail copy that skips the stated buyer's problem/objection or evidence needed at that awareness level, even when it sounds on-brand. Inspect actual mobile-size pixels for the exact logo, product, brand typography, legibility and spelling. Return the failing field/region, exact reason and smallest correction; distinguish unresolved inputs from observed defects. Do not treat an editorial score as measured conversion performance.";
export type BrandTypeface = {
    brandType: boolean;
    fontFamily: string;
    fontFile?: string;
};
export function assertBrandTypeface(look: BrandTypeface | undefined): asserts look is BrandTypeface & {
    fontFile: string;
} {
    if (!look?.brandType || !look.fontFamily.trim() || !look.fontFile?.trim()) {
        throw new Error("The verified brand font is missing. Restore the brand's font file before rendering added text; no replacement font will be used.");
    }
}
