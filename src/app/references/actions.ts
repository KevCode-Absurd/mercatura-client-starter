"use server";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import type { AdReferenceRow } from "@/db/schema";
import { activeBrandId } from "@/lib/brand-context";
import { env } from "@/lib/env";
import { enqueue } from "@/lib/jobs/queue";
import { referenceAnalysisEnabled } from "@/lib/references/analyze";
type Result = {
    ok: true;
} | {
    ok: false;
    error: string;
};
export async function getReferenceAction(id: string): Promise<AdReferenceRow | null> {
    return db.select().from(schema.adReferences).where(eq(schema.adReferences.id, id)).get() ?? null;
}
export async function analyzeReferenceAction(id: string): Promise<Result> {
    if (!referenceAnalysisEnabled())
        return { ok: false, error: "Analysis needs live mode and GEMINI_API_KEY in .env." };
    const ref = db.select({ id: schema.adReferences.id, media: schema.adReferences.media_path }).from(schema.adReferences).where(eq(schema.adReferences.id, id)).get();
    if (!ref)
        return { ok: false, error: "Reference not found" };
    if (!ref.media)
        return { ok: false, error: "This reference has no media file on this machine." };
    db.update(schema.adReferences).set({ analysis_status: "queued", analysis_error: null }).where(eq(schema.adReferences.id, id)).run();
    enqueue(await activeBrandId(), "analyze_reference", id, {});
    revalidatePath("/references");
    return { ok: true };
}
export async function updateReferenceAction(id: string, edit: {
    title?: string;
    notes?: string;
}): Promise<Result> {
    const set: Partial<typeof schema.adReferences.$inferInsert> = {};
    if (edit.title?.trim())
        Object.assign(set, { title: edit.title.trim().slice(0, 200), title_locked: true });
    if (edit.notes !== undefined)
        set.notes = edit.notes.trim().slice(0, 2000);
    if (Object.keys(set).length)
        db.update(schema.adReferences).set(set).where(eq(schema.adReferences.id, id)).run();
    revalidatePath("/references");
    return { ok: true };
}
export async function deleteReferenceAction(id: string): Promise<Result> {
    const ref = db.select().from(schema.adReferences).where(eq(schema.adReferences.id, id)).get();
    if (!ref)
        return { ok: false, error: "Reference not found" };
    if (ref.source !== "user")
        return { ok: false, error: "Only references you added can be removed." };
    for (const rel of [ref.media_path, ref.thumb_path]) {
        if (!rel)
            continue;
        const file = path.resolve(env.DATA_DIR, rel);
        if (file.startsWith(path.join(env.DATA_DIR, "references", "user") + path.sep))
            fs.rmSync(file, { force: true });
    }
    db.delete(schema.adReferences).where(eq(schema.adReferences.id, id)).run();
    revalidatePath("/references");
    return { ok: true };
}
