import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { BrandRow } from "@/db/schema";
import { brandBrainPath } from "./brand-brain";
import { env } from "./env";
import { founderMarkdown, parseQuestionnaire, type FounderAnswer, type FounderSection } from "./founder-questions";
export const FOUNDER_FILE = "founder-interview.md";
const questionnaireFile = () => path.join(env.SKILLS_DIR, "founder-interview", "questionnaire.md");
export function questionnaireText(): string {
    const file = questionnaireFile();
    return fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
}
export function loadQuestionnaire(): FounderSection[] {
    return parseQuestionnaire(questionnaireText());
}
export function getFounderAnswers(brandId: string): Record<string, FounderAnswer> {
    const rows = db.select().from(schema.founderAnswers).where(eq(schema.founderAnswers.brand_id, brandId)).all();
    return Object.fromEntries(rows.map((r) => [r.question_id, { answer: r.answer, skipped: r.skipped, updated_at: r.updated_at }]));
}
export function saveFounderAnswer(brandId: string, questionId: string, answer: string, skipped: boolean): void {
    if (!loadQuestionnaire().some((s) => s.questions.some((q) => q.id === questionId)))
        throw new Error(`Unknown question "${questionId}".`);
    const t = schema.founderAnswers;
    const text = answer.trim();
    if (!text && !skipped) {
        db.delete(t).where(and(eq(t.brand_id, brandId), eq(t.question_id, questionId))).run();
        return;
    }
    const updated_at = new Date().toISOString();
    db.insert(t)
        .values({ brand_id: brandId, question_id: questionId, answer: text, skipped, updated_at })
        .onConflictDoUpdate({ target: [t.brand_id, t.question_id], set: { answer: text, skipped, updated_at } })
        .run();
}
export function founderFilePath(row: BrandRow): string {
    return path.join(path.dirname(brandBrainPath(row.dir)), FOUNDER_FILE);
}
export function writeFounderFile(row: BrandRow): string {
    const file = founderFilePath(row);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, founderMarkdown(row.name, loadQuestionnaire(), getFounderAnswers(row.id), new Date().toISOString().slice(0, 10)), "utf-8");
    return file;
}
