import path from "node:path";
import sharp from "sharp";
import { FORMAT_RECIPES } from "../formats";
import { generateImage, mediaLive } from "../media/providers";
import { recipeUsesCharacterOnly } from "../production/prompts";
import { avatarDir, avatarFile, getAvatar, saveAvatar } from "./store";
import { characterDirection } from "../creator-studio";
import { adultProblem, avatarLine, type Avatar } from "./types";
const PHOTOREAL = "Look: a real photograph, like an unretouched phone photo of a real person in soft window daylight. Clear eyes and readable facial structure without close wide-angle distortion; catchlights and shadows come from the same window. Natural skin texture with subtly varied local pores, slight natural asymmetry, real hair strands and fabric wrinkles. Detail stays proportionate to this head-and-shoulders crop: no etched or stamped pores, artificial skin gloss or sharpening halos. No added scars, freckles or accessories unless described. Not illustrated, not 3D, no beauty filter, no studio glamour lighting.";
const dot = (s: string) => {
    const t = s.trim().replace(/\s+/g, " ");
    return !t || /[.!?]$/.test(t) ? t : `${t}.`;
};
const NOT_LOOK = /product|packag|\bpack\b|label|brand|logo|\bcta\b|claim|statistic|selling|\bshots?\b|\bclips?\b|\bcuts?\b|spoken|speaks|sings|sung|song|lyric|narrat|footage|\bline\b|rung|caption|overlay/i;
export function lookLine(style: string | null): string {
    const recipe = style ? FORMAT_RECIPES.find((r) => r.id === style) : undefined;
    if (!recipe || !recipeUsesCharacterOnly(recipe))
        return "";
    const preset = Object.values(recipe.presets).find((p) => p.trim());
    const craft = recipe.craft.split(/(?<=[.!?])\s+/).filter((s) => !NOT_LOOK.test(s)).slice(0, 2).join(" ");
    const words = preset && !NOT_LOOK.test(preset) ? preset : craft;
    return `Style: ${dot(recipe.label)}${words ? ` ${dot(words)}` : ""}`;
}
export function avatarPortraitPrompt(a: Pick<Avatar, "kind" | "style" | "presenter" | "character">): string {
    if (a.kind === "character" || !a.presenter) {
        return [
            "ONE square picture of 1 original character, as a casting sheet would show it. Full figure, front on, centred, against a plain neutral background in soft even light. No text, no caption, no logo, no product, nothing else in the picture.",
            `Character: ${dot(a.character ?? "")}`,
            [lookLine(a.style), "An original, fictional character that resembles no real person and no known character. Not a photoreal human. Any human figure is an adult. No children."].filter(Boolean).join(" "),
        ].join("\n\n");
    }
    const p = a.presenter;
    const who = [p.gender, p.age, p.skin_tone && `${p.skin_tone} skin`, p.eyes && `${p.eyes} eyes`, p.hair].filter(Boolean).join(", ");
    return [
        "ONE square portrait of 1 fictional adult, as a casting sheet would show them. Head and shoulders, front on, centred, eyes into the camera, a relaxed neutral face with the mouth closed. Plain warm off-white wall behind, soft even daylight. Exactly 1 person. No text, no caption, no logo, no product.",
        [`Who: a fictional adult who resembles no real person. ${dot(who)}${p.features ? ` ${dot(p.features)}` : ""}`.trim(), p.wardrobe ? `Outfit: ${dot(p.wardrobe)} No logos and no printed words on clothing.` : "Outfit: plain everyday clothes. No logos and no printed words on clothing."].join("\n"),
        `${PHOTOREAL} The person is an adult. No children.`,
    ].join("\n\n");
}
export async function drawAvatar(brandId: string, avatarId: string, options: {
    keep?: boolean;
    notes?: string;
    hyperreal?: boolean;
    sourcePortrait?: string;
} = {}): Promise<Avatar> {
    if (!mediaLive())
        throw new Error("Drawing an avatar needs live mode.");
    const a = getAvatar(brandId, avatarId);
    if (!a)
        throw new Error("That avatar is no longer saved.");
    if (!avatarLine(a))
        throw new Error("Describe the avatar first: its picture is drawn from the description.");
    const child = adultProblem(a);
    if (child)
        throw new Error(child);
    if (options.sourcePortrait && a.portrait !== options.sourcePortrait)
        throw new Error("The avatar picture changed after this enhancement was requested. Review it and try again.");
    const reference = options.keep ? avatarFile(a.portrait) : null;
    if (options.keep && !reference)
        throw new Error("Choose an avatar with a saved portrait before enhancing it.");
    const dir = avatarDir(brandId, a.id);
    const file = `portrait-${Date.now().toString(36)}.png`;
    const direction = characterDirection(options.notes ?? "", !!options.hyperreal);
    const prompt = reference ? `Edit this supplied adult avatar portrait. Preserve identity, age, facial shape, expression, pose, crop, lighting and all features not named in the correction. ${direction || "Subtly refine photographic detail while preserving the entire portrait."} No added text, product or logo.` : avatarPortraitPrompt(a);
    const metadata = reference ? await sharp(reference).metadata() : undefined;
    const ratio = metadata?.width && metadata?.height ? metadata.width / metadata.height : 1;
    const size = ratio < 0.9 ? "1024x1536" : ratio > 1.1 ? "1536x1024" : "1024x1024";
    await generateImage({ brandId, jobId: `avatars_${brandId}`, purpose: options.keep ? "avatar_enhancement" : "avatar", prompt, refs: reference ? [reference] : [], size, quality: options.keep ? "high" : "medium", ...(a.kind === "person" ? { use: "avatar" as const } : {}), out: path.join(dir.abs, file) });
    const now = getAvatar(brandId, a.id) ?? a;
    if (reference && now.portrait !== a.portrait)
        throw new Error("The avatar was edited during generation. Its new portrait has not been replaced; the generated file is kept in its local folder.");
    return saveAvatar(brandId, { id: now.id, name: now.name, portrait: `${dir.rel}/${file}`, portrait_history: [...new Set([...(now.portrait_history ?? []), ...(now.portrait ? [now.portrait] : [])])].slice(-30), sheet: null, panels: [], styled: {} });
}
