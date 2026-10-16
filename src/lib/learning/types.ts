import { z } from "zod";
export const CATEGORY_IDS = ["data", "insights", "creative-studio", "ad-monitoring", "experiments", "landing-pages", "retention", "customer-experience"] as const;
export const CategoryIdSchema = z.enum(CATEGORY_IDS);
export type CategoryId = z.infer<typeof CategoryIdSchema>;
export const LessonSchema = z.object({
    id: z.string().min(1), title: z.string().min(1), summary: z.string().min(1),
    topic: z.string().min(1), body: z.string().min(1),
    whenToUse: z.string().min(1), steps: z.array(z.string().min(1)).min(3),
    example: z.string().min(1), successMetric: z.string().min(1), pitfall: z.string().min(1),
    sourceIds: z.array(z.string()).min(1), effort: z.enum(["low", "medium", "high"]), tags: z.array(z.string()),
});
export const SourceSchema = z.object({
    id: z.string(), title: z.string(), url: z.string(), playbook: z.string(), localFile: z.string(),
    verification: z.enum(["playbook", "verified"]), note: z.string(),
});
export const LearningModuleSchema = z.object({
    id: CategoryIdSchema, title: z.string(), description: z.string(),
    lessons: z.array(LessonSchema).min(10), sources: z.array(SourceSchema).min(1),
});
export type Lesson = z.infer<typeof LessonSchema>;
export type LearningSource = z.infer<typeof SourceSchema>;
export type LearningModule = z.infer<typeof LearningModuleSchema>;
const score = z.number().int().min(1).max(5);
export const StrategySchema = z.object({
    lessonId: z.string(), title: z.string().min(1), why: z.string().min(1),
    adaptation: z.string().min(1).describe("A substantive implementation for this brand using its actual product, customer situation, offer and evidence. Preserve the full method's conditions; label assumptions. Use short paragraphs, not a generic summary or a brand-name substitution."),
    firstDeliverable: z.string().min(1).describe("The concrete first artifact to create, including its required contents and a relevant worked example where supported."),
    decisionRule: z.string().min(1).describe("What evidence would justify continuing, revising or stopping. If baseline data is absent, specify the measurement needed before setting a target."),
    steps: z.array(z.string().min(1)).min(3).max(12),
    successMetric: z.string().min(1), prerequisites: z.array(z.string()),
    fit: score, impact: score, ease: score, confidence: score,
});
export const StrategyOutputSchema = z.object({
    summary: z.string().min(1), assumptions: z.array(z.string()),
    strategies: z.array(StrategySchema).length(10),
});
export type StrategyOutput = z.infer<typeof StrategyOutputSchema>;
export type Strategy = z.infer<typeof StrategySchema>;
export const ALL_CATEGORIES = "all";
export type PlanScope = CategoryId | typeof ALL_CATEGORIES;
export type PlanModule = {
    id: PlanScope;
    title: string;
    lessons: Lesson[];
};
export type LearningPlan = StrategyOutput & {
    brandId: string;
    categoryId: PlanScope;
    createdAt: string;
    contextHash: string;
    mode: "live" | "preview";
    model: string | null;
    sample?: string[];
};
