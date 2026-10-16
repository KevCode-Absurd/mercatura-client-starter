import { VOICE_MARK, brandVoiceText, buyerText, type Surface as VoiceSurface } from "../brand-voice";
import type { BrandBrain } from "../brand-brain";
import { loadBrandBrain } from "../brands";
import type { ContextPlan } from "./types";
export interface VoiceOpts {
    surfaces: VoiceSurface[];
    personaIds?: string[];
    brand?: BrandBrain;
    story?: boolean;
}
export function voiceBasics(brand: BrandBrain, personaIds: string[]): string {
    const never = brand.voice.dont.map((x) => `- ${x}`).join("\n");
    const buyer = buyerText(brand, personaIds);
    return [`## The brand's voice (the basics only)\n${VOICE_MARK} Only the basics are sent for this piece, on purpose: how the brand usually builds a line is left out.`, `Who speaks: ${brand.brand.name}.`, never ? `### Never say\n${never}` : "", buyer].filter(Boolean).join("\n\n");
}
export function voiceForPlan(brandId: string, plan: ContextPlan, opts: VoiceOpts): string {
    const personaIds = plan.text.customerWords === "none" ? [] : (opts.personaIds ?? []);
    const level = plan.text.voice;
    if (level === "basics") {
        try {
            return voiceBasics(opts.brand ?? loadBrandBrain(brandId), personaIds);
        }
        catch {
            return brandVoiceText(brandId, { surfaces: [], personaIds, brand: opts.brand, story: opts.story });
        }
    }
    return brandVoiceText(brandId, { surfaces: level === "own_ads" ? opts.surfaces : [], personaIds, brand: opts.brand, story: opts.story });
}
