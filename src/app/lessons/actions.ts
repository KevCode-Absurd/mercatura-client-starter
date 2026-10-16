"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { dismissFailures, learnFromFailures, type LearnedFromFailures } from "@/lib/failures";
import { confirmFeedback, deleteFeedback, recordFeedback, rereadFeedback } from "@/lib/feedback";
import { dismissEdits, learnFromEdits } from "@/lib/hand-edits";
import { AREAS, CATEGORIES, deleteLesson, promoteLesson, unmergeLesson, updateLesson, type Category, type Lesson } from "@/lib/lessons";
import { compactIfLong, compactLessons, type CompactResult } from "@/lib/lessons-compact";
import { errorText } from "@/lib/plain-message";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
const fail = (e: unknown): {
    ok: false;
    error: string;
} => ({ ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check what you entered.") : errorText(e) });
const Note = z.object({ text: z.string().trim().min(4, "Say what should change, in a few words.").max(4000), via: z.enum(["typed", "voice"]).default("typed"), productId: z.string().optional() });
export async function noteAction(input: z.input<typeof Note>): Promise<Result<{
    learned: {
        id: string;
        rule: string;
        isNew: boolean;
    }[];
    status: string;
}>> {
    try {
        const o = Note.parse(input);
        const brandId = await activeBrandId();
        const res = await recordFeedback({ brandId, refType: "brand", text: o.text, via: o.via, productId: o.productId || null, about: "A general note about this brand's creative, not about 1 piece." });
        revalidatePath("/lessons");
        return { ok: true, learned: res.lessons.map((x) => ({ id: x.lesson.id, rule: x.lesson.rule, isNew: x.isNew })), status: res.feedback.error ?? res.feedback.status };
    }
    catch (e) {
        return fail(e);
    }
}
const Patch = z.object({
    rule: z.string().trim().min(8, "A lesson needs at least a few words.").max(500).optional(),
    why: z.string().max(500).optional(),
    category: z.enum(Object.keys(CATEGORIES) as [
        Category,
        ...Category[]
    ]).optional(),
    areas: z.array(z.enum(AREAS)).min(1, "Pick at least 1 kind of work it applies to.").optional(),
    status: z.enum(["active", "proposed", "off"]).optional(),
    scope: z.enum(["general", "brand", "product"]).optional(),
    product_id: z.string().nullable().optional(),
    formats: z.array(z.string()).max(12).optional(),
    kind: z.enum(["avoid", "keep"]).optional(),
});
export async function updateLessonAction(id: string, patch: z.input<typeof Patch>): Promise<Result<{
    lesson: Lesson;
}>> {
    try {
        const lesson = updateLesson(await activeBrandId(), id, Patch.parse(patch));
        revalidatePath("/lessons");
        return { ok: true, lesson };
    }
    catch (e) {
        return fail(e);
    }
}
export async function deleteLessonAction(id: string): Promise<Result> {
    try {
        deleteLesson(await activeBrandId(), id);
        revalidatePath("/lessons");
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function promoteLessonAction(id: string): Promise<Result<{
    lesson: Lesson;
}>> {
    try {
        const lesson = promoteLesson(await activeBrandId(), id);
        revalidatePath("/lessons");
        return { ok: true, lesson };
    }
    catch (e) {
        return fail(e);
    }
}
export async function deleteFeedbackAction(id: string): Promise<Result> {
    try {
        deleteFeedback(await activeBrandId(), id);
        revalidatePath("/lessons");
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function learnFailuresAction(key: string): Promise<Result<LearnedFromFailures>> {
    try {
        const brandId = await activeBrandId();
        const res = await learnFromFailures(brandId, z.string().min(3).max(200).parse(key));
        void compactIfLong(brandId);
        revalidatePath("/lessons");
        return { ok: true, ...res };
    }
    catch (e) {
        return fail(e);
    }
}
export async function dismissFailuresAction(key: string): Promise<Result> {
    try {
        dismissFailures(await activeBrandId(), z.string().min(3).max(200).parse(key));
        revalidatePath("/lessons");
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
const EditKey = z.string().min(5).max(400);
const editPaths = (scriptId?: string) => {
    revalidatePath("/lessons");
    revalidatePath("/");
    if (scriptId)
        revalidatePath(`/scripts/${scriptId}`);
};
export async function learnEditAction(key: string, scriptId?: string): Promise<Result<{
    lesson: {
        id: string;
        rule: string;
        isNew: boolean;
    };
}>> {
    try {
        const brandId = await activeBrandId();
        const res = learnFromEdits(brandId, EditKey.parse(key));
        void compactIfLong(brandId);
        editPaths(scriptId);
        return { ok: true, ...res };
    }
    catch (e) {
        return fail(e);
    }
}
export async function compactLessonsAction(area: (typeof AREAS)[number]): Promise<Result<{
    result: CompactResult;
}>> {
    try {
        const result = await compactLessons(await activeBrandId(), z.enum(AREAS).parse(area), { force: true });
        revalidatePath("/lessons");
        return { ok: true, result };
    }
    catch (e) {
        return fail(e);
    }
}
export async function unmergeLessonAction(id: string): Promise<Result> {
    try {
        unmergeLesson(await activeBrandId(), z.string().min(3).max(40).parse(id));
        revalidatePath("/lessons");
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function dismissEditAction(key: string, scriptId?: string): Promise<Result> {
    try {
        dismissEdits(await activeBrandId(), EditKey.parse(key));
        editPaths(scriptId);
        return { ok: true };
    }
    catch (e) {
        return fail(e);
    }
}
export async function confirmFeedbackAction(id: string): Promise<Result<{
    learned: {
        id: string;
        rule: string;
    }[];
}>> {
    try {
        const res = confirmFeedback(await activeBrandId(), z.string().min(3).max(40).parse(id));
        revalidatePath("/lessons");
        revalidatePath("/");
        return { ok: true, learned: res.lessons.map((x) => ({ id: x.lesson.id, rule: x.lesson.rule })) };
    }
    catch (e) {
        return fail(e);
    }
}
export async function rereadFeedbackAction(id: string): Promise<Result<{
    learned: {
        id: string;
        rule: string;
        isNew: boolean;
    }[];
    status: string;
}>> {
    try {
        const res = await rereadFeedback(await activeBrandId(), id);
        revalidatePath("/lessons");
        return { ok: true, learned: res.lessons.map((x) => ({ id: x.lesson.id, rule: x.lesson.rule, isNew: x.isNew })), status: res.feedback.error ?? res.feedback.status };
    }
    catch (e) {
        return fail(e);
    }
}
