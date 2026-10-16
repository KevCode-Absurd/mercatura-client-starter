import type { OutputJobRow } from "@/db/schema";
import { recordFeedback, type Learned } from "../feedback";
import { updateLesson, type Lesson, type LessonPatch } from "../lessons";
import { learnsFrom, verdictAbout, verdictProblem, verdictText, ticksFor, type VerdictNote } from "./verdict";
export function placeFor(v: VerdictNote, type: string, lesson: Pick<Lesson, "scope">): LessonPatch | null {
    const mine = lesson.scope === "general" ? { scope: "brand" as const } : {};
    if (v.verdict === "approved")
        return { kind: "keep", formats: [type], ...mine };
    if (v.bucket === "format")
        return { formats: [type], ...mine };
    if (v.bucket === "input")
        return { areas: ["words"] };
    return null;
}
export async function recordVerdict(job: OutputJobRow, scriptTitle: string, input: VerdictNote & {
    via?: "typed" | "voice";
}): Promise<Learned> {
    const v: VerdictNote = { verdict: input.verdict, bucket: input.verdict === "rejected" ? input.bucket : undefined, ticks: input.ticks.filter((t) => ticksFor(job.output_type).includes(t)), note: input.note };
    const problem = verdictProblem(v);
    if (problem)
        throw new Error(problem);
    const image = job.assets.find((a) => a.kind === "image");
    const res = await recordFeedback({
        brandId: job.brand_id,
        refType: "job",
        refId: job.id,
        asset: image?.path ?? null,
        productId: job.production?.product_id ?? null,
        text: verdictText(v, job.output_type),
        via: input.via ?? "typed",
        action: "note",
        about: verdictAbout(v, job.output_type, scriptTitle),
        learn: learnsFrom(v),
    });
    const lessons = res.lessons.map((x) => {
        const place = x.isNew ? placeFor(v, job.output_type, x.lesson) : null;
        return place ? { ...x, lesson: updateLesson(job.brand_id, x.lesson.id, place) } : x;
    });
    for (const l of res.waiting ?? []) {
        const place = placeFor(v, job.output_type, l);
        if (place)
            updateLesson(job.brand_id, l.id, place);
    }
    return { feedback: res.feedback, lessons, waiting: res.waiting };
}
