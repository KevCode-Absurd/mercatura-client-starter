import { z } from "zod";
import { REVIEW_QUALITY_CONTRACT, VISUAL_BRAND_CONTRACT } from "@/lib/creative-brand-contract";
export const CREATIVE_CRITERIA = [
    "visual_clarity", "buyer_relevance", "product_brand_fidelity", "claim_support",
    "copy_picture_coherence", "format_execution", "mobile_legibility",
] as const;
export type CreativeCriterion = (typeof CREATIVE_CRITERIA)[number];
export const FATAL_FAILURES = [
    "unsupported_claim", "fabricated_proof", "wrong_product", "impossible_product_use",
    "unreadable_essential_text", "missing_required_asset", "identity_continuity",
] as const;
const rating = z.object({ score: z.number().int().min(0).max(4), evidence: z.string().trim().min(1) }).strict();
const scores = z.object({
    visual_clarity: rating, buyer_relevance: rating, product_brand_fidelity: rating,
    claim_support: rating, copy_picture_coherence: rating, format_execution: rating, mobile_legibility: rating,
}).strict();
export const CreativeJudgmentSchema = z.object({
    inspected_asset_ids: z.array(z.string().trim().min(1)).min(1),
    visual_inspection: z.literal(true),
    scores,
    fatal_failures: z.array(z.object({ code: z.enum(FATAL_FAILURES), asset_id: z.string().min(1), detail: z.string().trim().min(1) }).strict()),
    smallest_repair: z.string(),
    performance: z.literal("unknown"),
}).strict();
export type CreativeJudgment = z.infer<typeof CreativeJudgmentSchema>;
export const PairJudgmentSchema = z.object({
    pair_id: z.string().min(1), A: CreativeJudgmentSchema, B: CreativeJudgmentSchema,
    choice: z.enum(["A", "B", "tie", "neither"]), reasons: z.array(z.string().trim().min(1)).min(1),
}).strict().superRefine((value, ctx) => {
    const failedA = value.A.fatal_failures.length > 0;
    const failedB = value.B.fatal_failures.length > 0;
    if ((value.choice === "A" && failedA) || (value.choice === "B" && failedB))
        ctx.addIssue({ code: "custom", path: ["choice"], message: "An artifact with a fatal failure cannot be selected as publishable." });
    if (value.choice === "tie" && (failedA || failedB))
        ctx.addIssue({ code: "custom", path: ["choice"], message: "A tie requires two publishable artifacts. Use neither if both fail." });
});
export type PairJudgment = z.infer<typeof PairJudgmentSchema>;
export const CREATIVE_JUDGE_RUBRIC = `${REVIEW_QUALITY_CONTRACT}\n${VISUAL_BRAND_CONTRACT}\nInspect the supplied rendered images and final copy against the approved brief. Hide before/after, model and token labels. Read at mobile display size; zoom for product details. Do not grade prompts alone. Each score requires visible or fact-based evidence. Penalize missing planned logos, changed typefaces and generic cover panels in product_brand_fidelity and format_execution even if the copy is factually supported. 0 unusable; 1 major repair; 2 usable with repair; 3 strong; 4 excellent.
visual_clarity: immediate focal point, clear hierarchy, no clutter.
buyer_relevance: a specific situation/objection appropriate to the supplied buyer and awareness stage.
product_brand_fidelity: correct product/packaging/use plus approved visual and voice constraints.
claim_support: every factual claim, offer condition and proof matches approved evidence; absence of proof is not itself failure.
copy_picture_coherence: picture, overlay, primary text and headline make the same coherent argument.
format_execution: the requested format's distinct mechanism works; decorative differences alone are not new concepts.
mobile_legibility: essential words, product and CTA can be read at intended display size.
Separate fatal failures from aesthetic scores: unsupported claims, fabricated proof, wrong product, impossible use, unreadable essential text, missing required assets or broken storyboard identity continuity. Cite asset ID and visible detail. A failing item cannot be a publishable winner. Ties and neither are valid. Performance is unknown; do not predict CTR, ROAS or sales. Return the strict pair schema only.`;
export const STORYBOARD_JUDGE_ADDENDUM = "For storyboard journeys inspect avatar reference, every required character-sheet view and all storyboard panels. Check stable face/body/wardrobe/product, orientation and shot continuity, drawable actions, timing, dialogue/caption agreement and a coherent payoff/CTA. A written plan cannot substitute for missing rendered views or panels. Record broken identity/product continuity as fatal; evaluate narrative clarity under format_execution.";
export function aestheticAverage(judgment: CreativeJudgment): number {
    return Math.round(CREATIVE_CRITERIA.reduce((sum, key) => sum + judgment.scores[key].score, 0) / CREATIVE_CRITERIA.length * 100) / 100;
}
export function validateInspectedAssets(judgment: CreativeJudgment, suppliedIds: readonly string[]): string[] {
    const supplied = new Set(suppliedIds);
    const inspected = new Set(judgment.inspected_asset_ids);
    return [
        ...judgment.inspected_asset_ids.filter(id => !supplied.has(id)).map(id => `Unknown inspected asset: ${id}`),
        ...suppliedIds.filter(id => !inspected.has(id)).map(id => `Supplied asset was not inspected: ${id}`),
        ...judgment.fatal_failures.filter(f => !supplied.has(f.asset_id)).map(f => `Unknown failure asset: ${f.asset_id}`),
    ];
}
