export const CREATOR_STEPS = ["Avatar", "Character review", "Script", "Format", "Storyboard", "Clips", "Edit & audio", "Deliver"] as const;
export type CreatorObjective = "introduce" | "explain" | "prove" | "convert";
export type CreatorAudience = "new" | "comparing" | "returning";
export type CreatorAssets = {
    product: boolean;
    avatar: boolean;
    proof: boolean;
    offer: boolean;
};
export type FormatSuggestion = {
    id: string;
    label: string;
    reason: string;
    requirements: string[];
    missing: string[];
    score: number;
};
export function suggestCreativeFormats(objective: CreatorObjective, audience: CreatorAudience, assets: CreatorAssets): FormatSuggestion[] {
    const rows = [
        { id: "ugc", label: "AI UGC", reasons: { introduce: 3, explain: 4, prove: 1, convert: 2 }, for: "A presenter explains the product in a familiar everyday setting.", needs: ["product", "avatar"] },
        { id: "satisfying", label: "Product demo", reasons: { introduce: 2, explain: 5, prove: 3, convert: 3 }, for: "Show one real use or feature through a visible action.", needs: ["product"] },
        { id: "ad-concept", label: "Visual concept ad", reasons: { introduce: 5, explain: 2, prove: 1, convert: 1 }, for: "One visual idea introduces the problem or product to a new buyer.", needs: ["product"] },
        { id: "ad-proof", label: "Proof image ad", reasons: { introduce: 1, explain: 2, prove: 5, convert: 3 }, for: "Use an approved quote or supported fact for buyers comparing options.", needs: ["product", "proof"] },
        { id: "ad-offer", label: "Offer image ad", reasons: { introduce: 1, explain: 1, prove: 2, convert: 5 }, for: "Make an actual offer and next step clear to returning buyers.", needs: ["product", "offer"] },
        { id: "cinematic", label: "Cinematic brand film", reasons: { introduce: 4, explain: 2, prove: 1, convert: 1 }, for: "Build a memorable short scene with a consistent character and setting.", needs: ["product"] },
        { id: "anime", label: "Anime ad", reasons: { introduce: 4, explain: 3, prove: 1, convert: 1 }, for: "Use stylized characters and key frames when animation fits the brand.", needs: ["product"] },
    ] as const;
    const labels: Record<keyof CreatorAssets, string> = { product: "Accurate product photos and facts", avatar: "An adult avatar or character to create and review", proof: "Approved quote or substantiated product evidence", offer: "An actual offer approved by the brand" };
    return rows.map((r) => {
        const missing = r.needs.filter((n) => !assets[n]).map((n) => labels[n]);
        const audienceBonus = audience === "new" && ["ad-concept", "cinematic", "anime", "ugc"].includes(r.id) ? 2 : audience === "comparing" && ["satisfying", "ad-proof"].includes(r.id) ? 2 : audience === "returning" && r.id === "ad-offer" ? 2 : 0;
        return { id: r.id, label: r.label, reason: r.for, requirements: r.needs.map((n) => labels[n]), missing, score: r.reasons[objective] + audienceBonus - missing.length * 3 };
    }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 3);
}
export const HYPERREAL_DIRECTION = "Hyper-realistic AI UGC: preserve the adult character's identity and age. Keep fine naturally varied skin pores, subtle vellus hairs and facial asymmetry, localized gentle highlights, real hair strands and fabric texture. No beauty-filter smoothing, stamped pores, plastic shine, exaggerated sharpening or identity changes. Natural smartphone footage.";
export function characterDirection(notes: string, hyperreal: boolean): string {
    return [hyperreal ? HYPERREAL_DIRECTION : "", notes.trim() ? `Character notes: ${notes.trim()}` : ""].filter(Boolean).join("\n");
}
