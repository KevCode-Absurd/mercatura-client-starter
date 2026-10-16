import { ALL_CATEGORIES, CATEGORY_IDS, LearningModuleSchema, type PlanModule } from "./types";
import meta from "./content/deep/meta.json";
import copy from "./content/deep/copy.json";
import dataExperiments from "./content/deep/data-experiments.json";
import insights from "./content/deep/insights.json";
import landing from "./content/deep/landing.json";
import retention from "./content/deep/retention.json";
import cx from "./content/deep/cx.json";
import { canonicalTopic, categoryEditorial, editorialPriority } from "./editorial";
type LearningModule = ReturnType<typeof LearningModuleSchema.parse>;
const fragments: LearningModule[] = [...meta, ...copy, ...dataExperiments, ...insights, ...landing, ...retention, ...cx];
export const learningModules = CATEGORY_IDS.flatMap((id) => {
    const parts = fragments.filter((m) => m.id === id);
    if (!parts.length) return [];
    return [LearningModuleSchema.parse({
        id, ...categoryEditorial[id],
        lessons: parts.flatMap((m) => m.lessons).map((l) => ({ ...l, topic: canonicalTopic(l.topic) }))
            .sort((a, b) => editorialPriority(a.id) - editorialPriority(b.id)),
        sources: [...new Map(parts.flatMap((m) => m.sources).map((s) => [s.id, s])).values()],
    })];
});
const ids = new Set<string>();
for (const module of learningModules) {
    const sources = new Set(module.sources.map((s) => s.id));
    for (const lesson of module.lessons) {
        if (ids.has(lesson.id))
            throw new Error(`Duplicate learning guide: ${lesson.id}`);
        if (lesson.sourceIds.some((id) => !sources.has(id)))
            throw new Error(`Missing internal provenance: ${lesson.id}`);
        ids.add(lesson.id);
    }
}
export const learningModule = (id: string) => learningModules.find((item) => item.id === id);
const PER_CATEGORY = 7;
export const growthModule = (): PlanModule => ({ id: ALL_CATEGORIES, title: "Growth, across every category", lessons: learningModules.flatMap((m) => m.lessons.slice(0, PER_CATEGORY)) });
export const categoryOfLesson = (lessonId: string) => learningModules.find((m) => m.lessons.some((l) => l.id === lessonId))?.id;
export const planModule = (scope: string): PlanModule | undefined => (scope === ALL_CATEGORIES ? growthModule() : learningModule(scope));
export const CONTENT_VERSION = "2026-10-06-deep-v2";
