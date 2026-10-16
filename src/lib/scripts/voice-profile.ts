import { z } from "zod";
import { loadBrandBrain } from "../brands";
import { env } from "../env";
import { geminiEnabled, geminiJson } from "../llm/gemini";
import { getSetting, setSetting } from "../settings";
import { researchText } from "../studio/checks";
import { GRADE_FOR, type VoiceProfile } from "./voice-rules";
export const voiceProfile = (brandId: string): VoiceProfile => getSetting(brandId, "voice");
const Out = z.object({ audience: z.enum(["general", "informed", "expert"]), why: z.string(), terms: z.array(z.string()).max(12).default([]) });
export async function deriveVoiceProfile(brandId: string): Promise<VoiceProfile> {
    const brand = loadBrandBrain(brandId);
    const out = await geminiJson({
        brandId,
        task: "voice_profile",
        model: env.MODEL_REFERENCE,
        system: `You decide how hard the words in a brand's ads may be, from who buys it. Return JSON:
- audience: "general" when the buyers are the general public (most consumer products: food, supplements for everyday health, skincare, household). "informed" when the buyers already use the category's technical terms among themselves (competitive athletes buying performance nutrition, hobbyists buying specialist gear, people managing a condition who know its vocabulary). "expert" only when the buyers are professionals buying for their work.
- why: 1 sentence, pointing at how the customers in the research actually talk.
- terms: technical terms these buyers really use themselves, taken from their own words in the research or the personas' language. Empty for a general audience. Never a term only the brand uses.
Judge by how the customers talk in their own words, not by how the brand's site talks.`,
        user: `Brand: ${brand.brand.name}, ${brand.brand.category}. Market: ${brand.brand.market}.\nProducts: ${brand.products.map((p) => `${p.name} (${p.format})`).join("; ")}\nPersonas:\n${brand.personas.map((p) => `- ${p.name}: ${p.summary} Their words: ${p.language.join(", ")}`).join("\n")}\n\nWhat customers say:\n${researchText(brandId, 8, 3)}`,
        schema: Out,
        effort: "low",
        maxTokens: 3000,
        refType: "brand",
        refId: brandId,
    });
    const profile: VoiceProfile = { audience: out.audience, reading_grade: GRADE_FOR[out.audience], terms: out.audience === "general" ? [] : out.terms, why: out.why.trim(), by: env.MODEL_REFERENCE };
    setSetting(brandId, "voice", profile);
    return profile;
}
export async function ensureVoiceProfile(brandId: string): Promise<VoiceProfile> {
    const have = voiceProfile(brandId);
    if (have.by !== "default" || !geminiEnabled())
        return have;
    try {
        return await deriveVoiceProfile(brandId);
    }
    catch {
        return have;
    }
}
