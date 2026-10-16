import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { LearningPlan, PlanScope } from "./types";
function read<T>(brandId: string, key: string): T | null {
    return (db.select().from(schema.settings).where(and(eq(schema.settings.brand_id, brandId), eq(schema.settings.key, key))).get()?.value as T | undefined) ?? null;
}
function write(brandId: string, key: string, value: unknown) {
    const updated_at = new Date().toISOString();
    db.insert(schema.settings).values({ brand_id: brandId, key, value, updated_at })
        .onConflictDoUpdate({ target: [schema.settings.brand_id, schema.settings.key], set: { value, updated_at } }).run();
}
export const readPlan = (brandId: string, category: PlanScope) => read<LearningPlan>(brandId, `learning:plan:${category}`);
export const savePlan = (plan: LearningPlan) => write(plan.brandId, `learning:plan:${plan.categoryId}`, plan);
export const completedLessons = (brandId: string) => read<string[]>(brandId, "learning:completed") ?? [];
export function setLessonCompleted(brandId: string, lessonId: string, complete: boolean) {
    const ids = new Set(completedLessons(brandId));
    if (complete)
        ids.add(lessonId);
    else
        ids.delete(lessonId);
    write(brandId, "learning:completed", [...ids]);
}
