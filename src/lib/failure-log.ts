import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AuditItem, VoiceCheck } from "@/db/schema";
import type { Area } from "./lesson-types";
export interface FailurePoint {
    area: Area;
    point: string;
    note: string;
    lessonId?: string | null;
}
export interface FailureRef {
    brandId: string;
    refType: string;
    refId: string;
    itemId?: string | null;
    productId?: string | null;
}
export function logFailures(ref: FailureRef, points: FailurePoint[]): number {
    const rows = points.filter((p) => p.note.trim().length > 2).slice(0, 20);
    if (!rows.length)
        return 0;
    try {
        db.insert(schema.checkFailures)
            .values(rows.map((p) => ({ brand_id: ref.brandId, area: p.area, point: p.point.slice(0, 80), note: p.note.replace(/\s+/g, " ").trim().slice(0, 600), lesson_id: p.lessonId ?? null, ref_type: ref.refType, ref_id: ref.refId, item_id: ref.itemId ?? null, product_id: ref.productId ?? null })))
            .run();
        return rows.length;
    }
    catch {
        return 0;
    }
}
export function brokenCounts(brandId: string): Map<string, number> {
    try {
        const rows = db
            .select({ id: schema.checkFailures.lesson_id, n: sql<number> `count(*)` })
            .from(schema.checkFailures)
            .where(and(eq(schema.checkFailures.brand_id, brandId), isNotNull(schema.checkFailures.lesson_id)))
            .groupBy(schema.checkFailures.lesson_id)
            .all();
        return new Map(rows.map((r) => [r.id!, r.n]));
    }
    catch {
        return new Map();
    }
}
const VOICE_KINDS: [
    string,
    RegExp
][] = [
    ["contractions", /contraction|uncontracted/i],
    ["contrast", /\bnot x\b|x,? not y|not-this|isn't x/i],
    ["blame", /guilt|shame|fear|preach|lectur|blam|scold/i],
    ["customer_words", /customers?['\u2019]?s? ?(own |gritty |plain |pain )*(word|say|phras|talk|language)|buyers?['\u2019]?s? ?(own )?(word|phras)|enemy/i],
    ["ending", /ends? on|weak (final |last )?(word|verb|ending)|final word|weight|trailing|tacked/i],
    ["breath", /breath|two ideas|2 ideas|one idea|1 idea|re-?read|tangled|hard to (say|follow)|too long/i],
    ["brand_sound", /brand['\u2019]?s? (own )?(sound|cheek|voice|rhythm|humou?r|punch|playful)|cheeky|3-beat|salesy/i],
    ["generic", /generic|any brand|could be any|flat\b|bland|vague/i],
    ["written", /formal|clinical|corporate|stiff|nobody says|written|jargon/i],
];
export function voiceKind(why: string): string | null {
    return VOICE_KINDS.find(([, re]) => re.test(why))?.[0] ?? null;
}
const NOT_A_FAILURE = new Set(["claim_checks", "seed_warning", "ad_review", "brand_look", "words_read"]);
export function auditPoints(items: AuditItem[], area: Area = "words"): FailurePoint[] {
    return items.filter((a) => a.status !== "pass" && !NOT_A_FAILURE.has(a.check)).map((a) => ({ area, point: `audit:${a.check}`, note: a.message }));
}
export function voicePoints(check: VoiceCheck | null | undefined, known?: Set<string> | null): FailurePoint[] {
    return (check?.issues ?? [])
        .filter((i) => i.phrase && i.why)
        .map((i) => {
        const note = `"${i.phrase.slice(0, 160)}": ${i.why}`;
        const id = i.why.match(/\[([A-Z]+-\d+)\]/)?.[1];
        if (id && known?.has(id))
            return { area: "words" as const, point: "lesson", note, lessonId: id };
        const kind = voiceKind(i.why);
        return { area: "words" as const, point: kind ? `voice:${kind}` : `voice_${i.pass ?? "brand"}`, note };
    });
}
export function copyPoints(issues: {
    phrase?: string;
    why?: string;
}[]): FailurePoint[] {
    return issues.filter((i) => i.phrase && i.why).map((i) => ({ area: "words" as const, point: "copy_pass", note: `"${i.phrase!.slice(0, 160)}": ${i.why}` }));
}
