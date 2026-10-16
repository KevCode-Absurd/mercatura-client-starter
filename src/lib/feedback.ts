import { learnQuietly } from "./brain/learn";
import fs from "node:fs";
import path from "node:path";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { FeedbackRow } from "@/db/schema";
import { loadBrandBrain } from "./brands";
import { env } from "./env";
import { AREAS, CATEGORIES, addLesson, brandLessons, deleteLesson, generalLessons, reinforceLesson, updateLesson, type Area, type Category, type Lesson } from "./lessons";
import { compactIfLong } from "./lessons-compact";
import { geminiEnabled, geminiJson } from "./llm/gemini";
import { loadCreativeKit, productImages } from "./production/kit";
import { renderPrompt } from "./prompts";
import { proposeFromFeedback } from "./skills/proposals";
import { filesBehind, filesForArea } from "./skills/watched";
export interface FeedbackInput {
    brandId: string;
    refType: FeedbackRow["ref_type"];
    refId?: string;
    itemId?: string | null;
    asset?: string | null;
    productId?: string | null;
    text: string;
    via?: "typed" | "voice";
    action?: "remake" | "note";
    about?: string;
    learn?: boolean;
    source?: "feedback" | "checks";
}
export interface Learned {
    feedback: FeedbackRow;
    proposals?: string[];
    lessons: {
        lesson: Lesson;
        isNew: boolean;
    }[];
    waiting?: Lesson[];
}
const oneOf = <T extends string>(values: readonly T[], fallback: T) => z.string().default(fallback).transform((v) => ((values as readonly string[]).includes(v) ? (v as T) : fallback));
export const FeedbackAnswer = z.object({
    summary: z.string().default(""),
    points: z
        .array(z.object({
        said: z.string().default(""),
        kind: oneOf(["one_off", "known", "new"] as const, "one_off"),
        same_as: z.string().default(""),
        rule: z.string().default(""),
        why: z.string().default(""),
        scope: oneOf(["general", "brand", "product"] as const, "brand"),
        category: oneOf(Object.keys(CATEGORIES) as Category[], "other"),
        areas: z.array(z.string()).default([]).transform((xs) => xs.filter((x): x is Area => (AREAS as readonly string[]).includes(x))),
    }))
        .max(8)
        .default([]),
});
const nextId = () => {
    const all = db.select({ id: schema.feedback.id }).from(schema.feedback).all();
    return `fb_${String(Math.max(0, ...all.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
};
const registerText = (rows: Lesson[]) => (rows.length ? rows.map((l) => `${l.id} | ${l.scope}${l.product_id ? ` (${l.product_id})` : ""} | ${l.category} | ${l.rule}`).join("\n") : "(empty)");
function filesForFeedback(input: FeedbackInput, areas: string[], fallback: Area): string[] {
    const used = (() => {
        try {
            if (input.refType === "landing")
                return ["landing-pages"];
            if (input.refType === "studio" && input.refId)
                return db.select({ context: schema.studioRuns.context }).from(schema.studioRuns).where(eq(schema.studioRuns.id, input.refId)).get()?.context.skills ?? [];
            if (input.refType === "script" && input.refId)
                return db.select({ skills: schema.scripts.skills_used }).from(schema.scripts).where(eq(schema.scripts.id, input.refId)).get()?.skills ?? [];
            if (input.refType === "job" && input.refId)
                return ((db.select({ payload: schema.outputJobs.payload }).from(schema.outputJobs).where(eq(schema.outputJobs.id, input.refId)).get()?.payload as {
                    skills_used?: string[];
                } | undefined)?.skills_used ?? []);
        }
        catch {
        }
        return [];
    })();
    const files = filesBehind(used);
    if (files.length)
        return files;
    const area = input.refType === "landing" ? "landing" : ((areas[0] as Area | undefined) ?? fallback);
    return filesForArea(area);
}
export function listFeedback(brandId: string, limit = 60): FeedbackRow[] {
    return db.select().from(schema.feedback).where(eq(schema.feedback.brand_id, brandId)).orderBy(desc(schema.feedback.created_at)).limit(limit).all();
}
export async function recordFeedback(input: FeedbackInput): Promise<Learned> {
    const text = input.text.replace(/\s+/g, " ").trim();
    if (text.length < 4)
        throw new Error("Say what should change, in a few words.");
    const id = nextId();
    const defaultArea: Area = input.refType === "script" || input.refType === "landing" ? "words" : "pictures";
    db.insert(schema.feedback)
        .values({ id, brand_id: input.brandId, ref_type: input.refType, ref_id: input.refId ?? "", item_id: input.itemId ?? null, asset: input.asset ?? null, product_id: input.productId ?? null, text: text.slice(0, 4000), via: input.via ?? "typed", action: input.action ?? "note", lesson_ids: [], status: "logged" })
        .run();
    const done = (set: Partial<FeedbackRow>) => {
        db.update(schema.feedback).set({ ...set, updated_at: new Date().toISOString() }).where(eq(schema.feedback.id, id)).run();
        return db.select().from(schema.feedback).where(eq(schema.feedback.id, id)).get()!;
    };
    if (input.learn === false)
        return { feedback: done({ status: "nothing", summary: "Kept as a note on this piece only." }), lessons: [] };
    const straight = input.source === "checks";
    if (!geminiEnabled()) {
        const lesson = addLesson(input.brandId, { scope: input.productId ? "product" : "brand", product_id: input.productId, category: "other", areas: [defaultArea], rule: text.slice(0, 500).padEnd(8, "."), why: "", source: "feedback", feedback_id: id, ...(straight ? {} : { status: "off" as const }) });
        if (!straight)
            return { feedback: done({ lesson_ids: [lesson.id], status: "logged", summary: "Kept as written. No model read it. It is a rule once an admin says yes on the Lessons screen." }), lessons: [], waiting: [lesson] };
        learnQuietly(input.brandId);
        return { feedback: done({ lesson_ids: [lesson.id], status: "learned", summary: "Kept as written (no model was called)." }), lessons: [{ lesson, isNew: true }] };
    }
    try {
        const brand = loadBrandBrain(input.brandId);
        const kit = loadCreativeKit(input.brandId);
        const hero = kit ? productImages(input.brandId, kit, input.productId ?? null).hero : null;
        const piece = input.asset ? path.join(env.DATA_DIR, "assets", input.asset) : null;
        const images = [piece, piece ? hero : null].filter((f): f is string => !!f && fs.existsSync(f));
        const mine = brandLessons(input.brandId);
        const general = generalLessons();
        const p = renderPrompt("feedback-learn", {
            brand_name: brand.brand.name,
            feedback: text,
            about: `${input.about || "A finished piece of creative."}${input.productId ? `\nProduct: ${brand.products.find((x) => x.id === input.productId)?.name ?? input.productId} (${input.productId})` : ""}${images.length ? `\nImages attached: 1. the piece the note is about${images.length > 1 ? "; 2. the real product photo" : ""}.` : ""}`,
            products: brand.products.map((x) => `${x.id}: ${x.name} (${x.format})`).join("\n"),
            brand_lessons: registerText(mine),
            general_lessons: registerText(general),
        });
        const out = await geminiJson({ brandId: input.brandId, task: "feedback_learn", model: env.MODEL_REFERENCE, system: p.system, user: p.user, schema: FeedbackAnswer, images, effort: "low", maxTokens: 4000, refType: "feedback", refId: id });
        const learned: Learned["lessons"] = [];
        const waiting: Lesson[] = [];
        const known = new Set([...mine, ...general].map((l) => l.id));
        const toSkill = out.points.slice(0, 6).filter((l) => l.kind === "new" && l.scope === "general" && l.rule.trim().length >= 8 && !(l.same_as && known.has(l.same_as)));
        const proposals: string[] = [];
        if (toSkill.length) {
            const files = filesForFeedback(input, toSkill.flatMap((l) => l.areas), defaultArea);
            const prop = await proposeFromFeedback({ brandId: input.brandId, feedbackId: id, said: text, rules: toSkill.map((l) => ({ rule: l.rule.slice(0, 500), why: l.why.slice(0, 300) })), about: input.about || "", files }).catch(() => null);
            if (prop)
                proposals.push(prop.id);
        }
        for (const l of out.points.slice(0, 6)) {
            if (proposals.length && toSkill.includes(l))
                continue;
            if (l.kind === "one_off")
                continue;
            if (l.same_as && known.has(l.same_as)) {
                if (learned.some((x) => x.lesson.id === l.same_as))
                    continue;
                const before = [...mine, ...general].find((x) => x.id === l.same_as)!;
                const again = reinforceLesson(input.brandId, l.same_as, id, straight && l.rule && l.rule !== before.rule ? l.rule : undefined, { wake: straight });
                if (again && again.status !== "off")
                    learned.push({ lesson: again, isNew: false });
                continue;
            }
            if (l.kind !== "new" || l.rule.trim().length < 8)
                continue;
            const scope = l.scope === "product" && !input.productId ? "brand" : l.scope;
            const lesson = addLesson(input.brandId, { scope, product_id: scope === "product" ? input.productId : null, category: l.category, areas: l.areas.length ? l.areas : [defaultArea], rule: l.rule.slice(0, 500), why: l.why.slice(0, 500), source: input.source ?? "feedback", feedback_id: id, ...(straight ? {} : { status: "off" as const }) });
            if (straight)
                learned.push({ lesson, isNew: true });
            else
                waiting.push(lesson);
        }
        if (learned.length)
            learnQuietly(input.brandId);
        if (learned.some((x) => x.isNew))
            void compactIfLong(input.brandId);
        const waits = waiting.length ? ` ${waiting.length === 1 ? "1 rule drawn from it waits" : `${waiting.length} rules drawn from it wait`} for an admin's yes on the Lessons screen.` : "";
        const summary = `${out.summary.slice(0, 400)}${proposals.length ? " A change to the method was proposed for an admin." : ""}${waits}`.trim();
        return { feedback: done({ lesson_ids: [...learned.map((x) => x.lesson.id), ...waiting.map((x) => x.id)], status: waiting.length ? "logged" : learned.length || proposals.length ? "learned" : "nothing", summary }), lessons: learned, proposals, waiting };
    }
    catch (e) {
        return { feedback: done({ status: "failed", error: (e as Error).message.slice(0, 300) }), lessons: [] };
    }
}
export async function rereadFeedback(brandId: string, id: string): Promise<Learned> {
    const row = db.select().from(schema.feedback).where(eq(schema.feedback.id, id)).get();
    if (!row || row.brand_id !== brandId)
        throw new Error("Feedback not found");
    if (row.status !== "failed")
        throw new Error("That note was read already.");
    const again = await recordFeedback({ brandId, refType: row.ref_type, refId: row.ref_id, itemId: row.item_id, asset: row.asset, productId: row.product_id, text: row.text, via: row.via, action: row.action });
    if (again.feedback.status !== "failed")
        db.delete(schema.feedback).where(eq(schema.feedback.id, id)).run();
    else
        db.delete(schema.feedback).where(eq(schema.feedback.id, again.feedback.id)).run();
    return again;
}
export function unconfirmed(brandId: string, row: Pick<FeedbackRow, "status" | "lesson_ids">, lessons: Lesson[] = brandLessons(brandId)): Lesson[] {
    return row.status === "logged" ? lessons.filter((l) => row.lesson_ids.includes(l.id) && l.status === "off") : [];
}
export function confirmFeedback(brandId: string, id: string): Learned {
    const row = db.select().from(schema.feedback).where(eq(schema.feedback.id, id)).get();
    if (!row || row.brand_id !== brandId)
        throw new Error("Feedback not found");
    const waiting = unconfirmed(brandId, row);
    if (!waiting.length)
        throw new Error("That note has nothing waiting to be confirmed.");
    const lessons = waiting.map((l) => ({ lesson: updateLesson(brandId, l.id, { status: "active" }), isNew: true }));
    db.update(schema.feedback).set({ status: "learned", summary: `${(row.summary ?? "").replace(/\s*\d+ rules? drawn from it waits? for an admin's yes on the Lessons screen\.$/, "").trim()} Confirmed as a rule by an admin.`.trim(), updated_at: new Date().toISOString() }).where(eq(schema.feedback.id, id)).run();
    learnQuietly(brandId);
    void compactIfLong(brandId);
    return { feedback: db.select().from(schema.feedback).where(eq(schema.feedback.id, id)).get()!, lessons };
}
export function deleteFeedback(brandId: string, id: string) {
    const row = db.select().from(schema.feedback).where(eq(schema.feedback.id, id)).get();
    if (!row || row.brand_id !== brandId)
        throw new Error("Feedback not found");
    for (const l of unconfirmed(brandId, row))
        deleteLesson(brandId, l.id);
    db.delete(schema.feedback).where(eq(schema.feedback.id, id)).run();
}
