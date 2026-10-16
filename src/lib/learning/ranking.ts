import { StrategyOutputSchema, type PlanModule, type Strategy, type StrategyOutput } from "./types";
export const priorityScore = (s: Pick<Strategy, "fit" | "impact" | "ease" | "confidence">) => Math.round((s.fit * 0.4 + s.impact * 0.3 + s.ease * 0.15 + s.confidence * 0.15) * 20);
export function validateAndRank(input: unknown, module: PlanModule): StrategyOutput {
    const output = StrategyOutputSchema.parse(input);
    const allowed = new Set(module.lessons.map((l) => l.id));
    const seen = new Set<string>();
    for (const s of output.strategies) {
        if (!allowed.has(s.lessonId))
            throw new Error("The plan referenced a lesson outside this category. Please try again.");
        if (seen.has(s.lessonId))
            throw new Error("The plan repeated a strategy. Please try again.");
        seen.add(s.lessonId);
    }
    return { ...output, strategies: [...output.strategies].sort((a, b) => priorityScore(b) - priorityScore(a)) };
}
export function previewPlan(module: PlanModule, brandName: string): StrategyOutput {
    return validateAndRank({
        summary: `A starter plan for exploring ${module.title.toLowerCase()} at ${brandName}. Generate a live plan to rank these against the full brand context.`,
        assumptions: ["This preview uses lesson effort only. It has not assessed brand fit or business impact.", "Revenue, margins, channel results, available time and current tooling have not been supplied."],
        strategies: [...module.lessons].sort((a, b) => ({ low: 1, medium: 2, high: 3 }[a.effort] - { low: 1, medium: 2, high: 3 }[b.effort])).slice(0, 10).map((l) => ({
            lessonId: l.id, title: l.title, why: `Consider this for ${brandName} when: ${l.whenToUse}`,
            adaptation: "Preview only. A live plan adapts this method to your products, customers, offers, and evidence.",
            firstDeliverable: l.steps[0], decisionRule: l.pitfall,
            steps: l.steps.slice(0, 4), successMetric: l.successMetric,
            prerequisites: ["Confirm that the lesson's situation applies to your brand."],
            fit: 1, impact: 1, confidence: 1, ease: { low: 5, medium: 3, high: 1 }[l.effort],
        })),
    }, module);
}
