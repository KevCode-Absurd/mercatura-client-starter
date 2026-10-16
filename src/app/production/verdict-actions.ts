"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { BUCKETS } from "@/lib/production/verdict";
import { recordVerdict } from "@/lib/production/verdict-notes";
import { errorText } from "@/lib/plain-message";
const Note = z.object({
    verdict: z.enum(["approved", "rejected"]),
    bucket: z.enum(BUCKETS).optional(),
    ticks: z.array(z.string().max(60)).max(12).default([]),
    note: z.string().max(4000).default(""),
    via: z.enum(["typed", "voice"]).default("typed"),
});
export type VerdictSaved = {
    ok: true;
    learned: {
        id: string;
        rule: string;
        isNew: boolean;
        formats: string[];
        kind: "avoid" | "keep";
    }[];
    status: string;
} | {
    ok: false;
    error: string;
};
export async function verdictNoteAction(jobId: string, input: z.input<typeof Note>): Promise<VerdictSaved> {
    try {
        const o = Note.parse(input);
        const brandId = await activeBrandId();
        const job = db.select().from(schema.outputJobs).where(and(eq(schema.outputJobs.id, jobId), eq(schema.outputJobs.brand_id, brandId))).get();
        if (!job)
            return { ok: false, error: "Job not found" };
        if (job.status !== o.verdict)
            return { ok: false, error: `This job is no longer ${o.verdict}.` };
        const script = db.select({ title: schema.scripts.title }).from(schema.scripts).where(eq(schema.scripts.id, job.script_id)).get();
        const res = await recordVerdict(job, script?.title ?? job.script_id, o);
        revalidatePath("/lessons");
        return { ok: true, learned: res.lessons.map((x) => ({ id: x.lesson.id, rule: x.lesson.rule, isNew: x.isNew, formats: x.lesson.formats, kind: x.lesson.kind })), status: res.feedback.error ?? res.feedback.status };
    }
    catch (e) {
        return { ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Check the note.") : errorText(e) };
    }
}
