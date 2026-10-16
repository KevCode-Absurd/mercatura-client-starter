"use server";
import { revalidatePath } from "next/cache";
import { activeBrand } from "@/lib/brand-context";
import { learningModule, planModule } from "@/lib/learning/catalog";
import { previewPlan } from "@/lib/learning/ranking";
import { savePlan, setLessonCompleted } from "@/lib/learning/store";
import { learningContext, tailorPlan } from "@/lib/learning/tailor";
import type { LearningPlan } from "@/lib/learning/types";
import { BrandBrainError } from "@/lib/brand-brain";
export async function createLearningPlan(category: string, expectedBrandId: string, preview = false): Promise<{
    plan?: LearningPlan;
    error?: string;
}> {
    const module = typeof category === "string" ? planModule(category) : undefined;
    if (!module || typeof preview !== "boolean")
        return { error: "Choose a learning category." };
    const brand = await activeBrand();
    if (brand.id !== expectedBrandId)
        return { error: "The active brand changed. Refresh this page before tailoring." };
    try {
        const context = learningContext(brand.id);
        const plan: LearningPlan = preview
            ? { ...previewPlan(module, brand.name), brandId: brand.id, categoryId: module.id, createdAt: new Date().toISOString(), contextHash: context.hash, mode: "preview", model: null }
            : await tailorPlan(brand.id, module);
        if (!preview)
            savePlan(plan);
        revalidatePath("/learning", "layout");
        return { plan };
    }
    catch (error) {
        if (error instanceof BrandBrainError)
            return { error: "Complete the Brand brain before tailoring lessons." };
        console.error("Learning plan failed", error);
        return { error: "The plan could not be generated. Check the model connection and remaining text budget in Settings, then try again. Your previous plan is still saved." };
    }
}
export async function completeLearningLesson(category: string, lessonId: string, complete: boolean, expectedBrandId: string) {
    const brand = await activeBrand();
    if (brand.id !== expectedBrandId)
        return { error: "The active brand changed. Refresh this page." };
    if (typeof complete !== "boolean" || !learningModule(category)?.lessons.some((l) => l.id === lessonId))
        return { error: "Lesson not found." };
    setLessonCompleted(brand.id, lessonId, complete);
    revalidatePath("/learning", "layout");
    return { ok: true };
}
