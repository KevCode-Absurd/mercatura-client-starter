import { z } from "zod";
import { AWARENESS_STAGES, OUTPUT_TYPES, type InsightType } from "./taxonomy";
export const DESIRE_EVIDENCE_TYPES: InsightType[] = ["desire", "accommodation", "trigger_moment"];
export const DESIRE_RULE_TOOLTIP = "No evidence of desire outside our own marketing means no concept.";
export const ConceptInput = z.object({
    id: z.string().nullable(),
    parent_concept_id: z.string().nullable(),
    name: z.string().trim().min(3, "Give the concept a name"),
    persona_id: z.string().min(1, "Pick a persona"),
    angle: z.string().trim().min(10, "Write the angle in 1 to 2 sentences"),
    offer_id: z.string().min(1, "Pick an offer"),
    awareness_stage: z.enum(AWARENESS_STAGES, { message: "Awareness label is required" }),
    sophistication_stage: z.number().int().min(1).max(5),
    theme_ids: z.array(z.string()),
    desire_evidence_theme_ids: z.array(z.string()).min(1, DESIRE_RULE_TOOLTIP),
    differentiator_test: z.object({
        claim: z.string(),
        is_proposition: z.boolean(),
        unavailable_to_competitors: z.boolean(),
        moves_a_stranger: z.boolean(),
    }),
    formats_planned: z.array(z.enum(OUTPUT_TYPES)),
    status: z.enum(["draft", "scripted", "in_production", "live", "paused"]),
});
export type ConceptInput = z.infer<typeof ConceptInput>;
export function desireEvidenceProblems(ids: string[], themeType: (id: string) => InsightType | undefined): string[] {
    if (!ids.length)
        return [DESIRE_RULE_TOOLTIP];
    const bad = ids.filter((id) => !DESIRE_EVIDENCE_TYPES.includes(themeType(id) as InsightType));
    return bad.length ? [`Not desire evidence (wrong theme type): ${bad.join(", ")}`] : [];
}
export function differentiatorWarnings(t: ConceptInput["differentiator_test"]): string[] {
    const w: string[] = [];
    if (!t.is_proposition)
        w.push("The claim isn't a proposition (a specific benefit you can state).");
    if (!t.unavailable_to_competitors)
        w.push("Competitors could make the same claim.");
    if (!t.moves_a_stranger)
        w.push("It won't move a stranger.");
    return w;
}
export function isDemographicOnly(summary: string): boolean {
    const rest = summary
        .toLowerCase()
        .replace(/\b(women|woman|men|man|people|females?|males?|mums?|moms?|dads?|aged?|years?|old|to|and|between|in|their|the)\b/g, " ")
        .replace(/[0-9+\-–.,]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
    return rest.length < 3;
}
