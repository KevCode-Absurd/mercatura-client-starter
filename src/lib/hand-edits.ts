import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { HandEditAskRow, HandEditChange } from "@/db/schema";
import { loadBrandBrain } from "./brands";
import { EDIT_THRESHOLDS, changeKeyParts, editChanges, editTokens, normKey, normPhrase, parseKey, phraseInside, plainRule, surfaceArea, surfaceFamily, surfaceLabel, wordedInCode, type RepeatKind } from "./edit-diff";
import { env } from "./env";
import { addLesson, brandLessons, liveLesson, reinforceLesson } from "./lessons";
import { geminiEnabled, geminiJson } from "./llm/gemini";
import { renderPrompt } from "./prompts";
export * from "./edit-diff";
export const MIN_REPEAT: number = EDIT_THRESHOLDS.repeat;
export type EditSurface = string;
export interface HandEdit {
    surface: EditSurface;
    line?: number | null;
    before: string;
    after: string;
    choice?: boolean;
}
const tidy = (s: string) => s.replace(/\r\n/g, "\n").trim();
export function recordHandEdits(brandId: string, refId: string, edits: HandEdit[]): number {
    const rows = edits
        .map((e) => ({ ...e, before: tidy(e.before ?? ""), after: tidy(e.after ?? "") }))
        .filter((e) => e.before && e.before !== e.after)
        .slice(0, 80)
        .map((e) => ({ brand_id: brandId, script_id: refId, surface: e.surface.slice(0, 60), line: e.line ?? null, before: e.before.slice(0, 12000), after: e.after.slice(0, 12000), changes: e.after && !e.choice ? editChanges(e.before, e.after) : [] }));
    if (!rows.length)
        return 0;
    try {
        db.insert(schema.handEdits).values(rows).run();
        return rows.length;
    }
    catch {
        return 0;
    }
}
export function listHandEdits(brandId: string, limit = 100) {
    return db.select().from(schema.handEdits).where(eq(schema.handEdits.brand_id, brandId)).orderBy(desc(schema.handEdits.id)).limit(limit).all();
}
export interface EditRepeat {
    key: string;
    kind: RepeatKind;
    from: string;
    to: string;
    count: number;
    scripts: string[];
    surfaces: string[];
    examples: {
        before: string;
        after: string;
    }[];
    rule: string;
    scope: "brand" | "general";
    lesson: {
        id: string;
        rule: string;
    } | null;
}
const asks = (brandId: string) => db.select().from(schema.handEditAsks).where(eq(schema.handEditAsks.brand_id, brandId)).all();
export function editRepeats(brandId: string, min = MIN_REPEAT): EditRepeat[] {
    let rows: {
        id: number;
        script_id: string;
        surface: string;
        before: string;
        after: string;
        changes: HandEditChange[];
    }[];
    let asked: ReturnType<typeof asks>;
    try {
        rows = db.select({ id: schema.handEdits.id, script_id: schema.handEdits.script_id, surface: schema.handEdits.surface, before: schema.handEdits.before, after: schema.handEdits.after, changes: schema.handEdits.changes }).from(schema.handEdits).where(eq(schema.handEdits.brand_id, brandId)).orderBy(desc(schema.handEdits.id)).limit(EDIT_THRESHOLDS.lookBack).all();
        asked = asks(brandId);
    }
    catch {
        return [];
    }
    if (!rows.length)
        return [];
    const ask = new Map(asked.map((a) => [normKey(a.key), a]));
    const spent = (id: number, keys: string[]) => keys.some((k) => {
        const a = ask.get(k);
        return !!a && (a.status === "dismissed" || (a.status === "learned" && a.upto >= id));
    });
    const groups = new Map<string, {
        count: number;
        scripts: Set<string>;
        surfaces: Set<string>;
        examples: {
            before: string;
            after: string;
        }[];
        from: string;
        to: string;
        kept: number[];
    }>();
    for (const r of rows) {
        for (const c of r.changes ?? []) {
            const parts = changeKeyParts(c, r.surface);
            if (spent(r.id, parts.map((x) => x.key)))
                continue;
            for (const { key, from, to } of parts) {
                let g = groups.get(key);
                if (!g)
                    groups.set(key, (g = { count: 0, scripts: new Set(), surfaces: new Set(), examples: [], from, to, kept: [] }));
                g.count++;
                g.scripts.add(r.script_id);
                g.surfaces.add(surfaceFamily(r.surface));
                if (c.kind === "shorter")
                    g.kept.push(Number(c.to) || 0);
                if (g.examples.length < 3)
                    g.examples.push({ before: r.before.slice(0, 400), after: r.after.slice(0, 400) });
            }
        }
    }
    const waiting = [...groups.entries()].filter(([, g]) => g.count >= min);
    const swapped = new Set(waiting.filter(([k, g]) => k.startsWith("swap|") && g.count >= MIN_REPEAT).map(([k]) => parseKey(k).from));
    const known = waiting.length ? brandLessons(brandId) : [];
    const outs = waiting.filter(([k]) => k.startsWith("out|")).map(([k, g]) => ({ from: parseKey(k).from, count: g.count }));
    const beaten = (k: string, count: number) => {
        const from = parseKey(k).from;
        return outs.some((o) => phraseInside(from, o.from) && (o.count > count || (o.count === count && o.from.length > from.length)));
    };
    return waiting
        .filter(([k, g]) => !k.startsWith("out|") || (!swapped.has(parseKey(k).from) && !beaten(k, g.count)))
        .map(([key, g]) => {
        const a = ask.get(key);
        const k = parseKey(key);
        const phrase = k.kind === "swap" || k.kind === "out";
        const lesson = a?.status === "learned" && a.lesson_id ? (known.find((l) => l.id === a.lesson_id) ?? null) : null;
        const plain = plainRule(key, { from: g.from, to: g.to, words: k.kind === "shorter" ? Math.max(0, ...g.kept) : undefined });
        return { key, kind: k.kind, from: phrase ? g.from : k.from, to: phrase ? g.to : k.to, count: g.count, scripts: [...g.scripts], surfaces: [...g.surfaces], examples: g.examples, rule: lesson?.rule ?? (a?.rule || plain), scope: a?.status === "open_general" ? ("general" as const) : ("brand" as const), lesson: lesson ? { id: lesson.id, rule: lesson.rule } : null };
    })
        .sort((x, y) => y.count - x.count || x.key.localeCompare(y.key));
}
export const editsWaiting = (brandId: string): number => editRepeats(brandId).length;
function setAsk(brandId: string, key: string, set: Partial<Pick<HandEditAskRow, "rule" | "status" | "lesson_id" | "upto">>) {
    const has = asks(brandId).find((a) => a.key === key) ?? asks(brandId).find((a) => normKey(a.key) === key);
    if (has)
        db.update(schema.handEditAsks).set({ ...set, updated_at: new Date().toISOString() }).where(eq(schema.handEditAsks.id, has.id)).run();
    else
        db.insert(schema.handEditAsks).values({ brand_id: brandId, key: key.slice(0, 400), ...set }).run();
}
const newest = (brandId: string) => db.select({ id: schema.handEdits.id }).from(schema.handEdits).where(eq(schema.handEdits.brand_id, brandId)).orderBy(desc(schema.handEdits.id)).limit(1).get()?.id ?? 0;
export const EditRuleAnswer = z.object({ rules: z.array(z.object({ n: z.number().int(), rule: z.string().default(""), scope: z.enum(["brand", "general"]).catch("brand").default("brand") })).max(6).default([]) });
const holds = (rule: string, phrase: string) => rule.toLowerCase().replace(/[‘’]/g, "'").includes(phrase.toLowerCase()) || normPhrase(rule.replace(/[^\p{L}\p{N}\s'%—–!…-]/gu, " ")).includes(normPhrase(phrase));
export async function wordRepeats(brandId: string, repeats: EditRepeat[] = editRepeats(brandId)): Promise<number> {
    if (!geminiEnabled())
        return 0;
    const before = asks(brandId);
    const done = new Set(before.filter((a) => a.rule).map((a) => normKey(a.key)));
    const todo = repeats.filter((r) => !r.lesson && !done.has(r.key) && !wordedInCode(r.key)).slice(0, 5);
    if (!todo.length)
        return 0;
    try {
        const p = renderPrompt("edit-rule", {
            brand_name: loadBrandBrain(brandId).brand.name,
            repeats: todo
                .map((r, i) => [`${i + 1}. ${r.kind === "swap" ? `"${r.from}" was replaced with "${r.to}"` : `"${r.from}" was taken out`}, ${r.count} times, in ${r.surfaces.map(surfaceLabel).join(", ")}.`, ...r.examples.map((e) => `   before: ${e.before.slice(0, 240)}\n   after:  ${e.after.slice(0, 240)}`)].join("\n"))
                .join("\n\n"),
        });
        const out = await geminiJson({ brandId, task: "edit_rule", model: env.MODEL_REFERENCE, system: p.system, user: p.user, schema: EditRuleAnswer, effort: "low", maxTokens: 600, refType: "hand_edit", refId: todo[0].key.slice(0, 80) });
        let worded = 0;
        todo.forEach((r, i) => {
            const got = out.rules.find((x) => x.n === i + 1);
            const rule = (got?.rule ?? "").replace(/\s+/g, " ").trim();
            if (rule.length < 8 || rule.length > 300 || !holds(rule, r.from) || (r.kind === "swap" && !holds(rule, r.to)))
                return;
            setAsk(brandId, r.key, { rule, status: got?.scope === "general" ? "open_general" : "open" });
            worded++;
        });
        return worded;
    }
    catch {
        return 0;
    }
}
export async function noteHandEdits(brandId: string, refId: string, edits: HandEdit[]): Promise<EditRepeat[]> {
    try {
        if (!recordHandEdits(brandId, refId, edits))
            return [];
        const mine = editRepeats(brandId).filter((r) => r.scripts.includes(refId));
        if (!mine.length)
            return [];
        return (await wordRepeats(brandId, mine)) ? editRepeats(brandId).filter((r) => r.scripts.includes(refId)) : mine;
    }
    catch {
        return [];
    }
}
export function noteEdit(brandId: string, refId: string, surface: EditSurface, before: string | null | undefined, after: string | null | undefined, line?: number | null): void {
    void noteHandEdits(brandId, refId, [{ surface, before: before ?? "", after: after ?? "", line }]);
}
export function noteEdits(brandId: string, refId: string, edits: HandEdit[]): void {
    void noteHandEdits(brandId, refId, edits);
}
export function noteChoice(brandId: string, refId: string, surface: EditSurface, passedOver: string | null | undefined, chosen: string | null | undefined): void {
    void noteHandEdits(brandId, refId, [{ surface, before: passedOver ?? "", after: chosen ?? "", choice: true }]);
}
const NOT_WORDS = /(^|_)(id|ids|url|href|link|file|path|image|images|photo|asset|status|kind|type|model|ref|slug|color|colour|font|aspect|ratio|size|source|awareness|mechanic|audience|handling|place|placement|role|age|gender|when|basis|at)$/i;
const FIELD_SURFACE: [
    RegExp,
    string
][] = [
    [/^headlines?$/i, "headline"],
    [/^primary_text$/i, "primary_text"],
    [/^cta$/i, "cta"],
    [/^(on_screen|overlay)$/i, "on_screen"],
    [/^captions?$/i, "caption"],
];
export function fieldEdits(surface: EditSurface, before: unknown, after: unknown, fields: Record<string, string> = {}): HandEdit[] {
    const out: HandEdit[] = [];
    const walk = (a: unknown, b: unknown, s: string, depth: number) => {
        if (out.length >= 80 || depth > 7 || a == null || b == null)
            return;
        if (typeof a === "string" && typeof b === "string") {
            const x = a.trim();
            if (x.length >= 3 && x !== b.trim() && !/^(https?:|\/|#[0-9a-f]{3,8}$|data:)/i.test(x))
                out.push({ surface: s, before: a, after: b });
            return;
        }
        if (Array.isArray(a) && Array.isArray(b)) {
            const idOf = (v: unknown) => (v && typeof v === "object" && typeof (v as {
                id?: unknown;
            }).id === "string" ? (v as {
                id: string;
            }).id : null);
            if (a.length && a.every(idOf) && b.every(idOf))
                a.forEach((v) => walk(v, b.find((w) => idOf(w) === idOf(v)), s, depth + 1));
            else if (a.length === b.length)
                a.forEach((v, i) => walk(v, b[i], s, depth + 1));
            return;
        }
        if (typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
            for (const [k, v] of Object.entries(a as Record<string, unknown>)) {
                if (NOT_WORDS.test(k) || !(k in (b as object)))
                    continue;
                const named = fields[k] ?? FIELD_SURFACE.find(([re]) => re.test(k))?.[1];
                walk(v, (b as Record<string, unknown>)[k], named ?? s, depth + 1);
            }
        }
    };
    walk(before, after, surface, 0);
    return out;
}
export function noteFields(brandId: string, refId: string, surface: EditSurface, before: unknown, after: unknown, fields: Record<string, string> = {}): void {
    try {
        const edits = fieldEdits(surface, before, after, fields);
        if (edits.length)
            void noteHandEdits(brandId, refId, edits);
    }
    catch {
    }
}
export interface LearnedFromEdits {
    lesson: {
        id: string;
        rule: string;
        isNew: boolean;
    };
}
export function learnFromEdits(brandId: string, asked: string): LearnedFromEdits {
    const key = normKey(asked);
    const r = editRepeats(brandId, 1).find((x) => x.key === key);
    if (!r)
        throw new Error("That is no longer waiting: it was already decided.");
    const upto = newest(brandId);
    if (r.lesson) {
        const again = reinforceLesson(brandId, r.lesson.id);
        if (again) {
            setAsk(brandId, key, { status: "learned", lesson_id: again.id, upto });
            return { lesson: { id: again.id, rule: again.rule, isNew: false } };
        }
    }
    const eg = r.examples[0];
    const area = surfaceArea(r.surfaces);
    const lesson = addLesson(brandId, {
        scope: r.scope,
        category: area === "words" ? "words" : "other",
        areas: [area],
        rule: r.rule.slice(0, 500),
        why: `Changed by hand ${r.count} time${r.count === 1 ? "" : "s"}${eg ? `: "${eg.before.slice(0, 160)}" became "${eg.after.slice(0, 160)}"` : ""}`.slice(0, 500),
        source: "edits",
    });
    setAsk(brandId, key, { rule: r.rule, status: "learned", lesson_id: lesson.id, upto });
    return { lesson: { id: lesson.id, rule: lesson.rule, isNew: true } };
}
export function editBans(brandId: string): {
    phrase: string;
    lesson_id: string;
    rule: string;
}[] {
    try {
        const learned = asks(brandId).filter((a) => a.status === "learned" && a.lesson_id && /^(out|swap)\|/.test(a.key) && !wordedInCode(normKey(a.key)));
        if (!learned.length)
            return [];
        const rows = brandLessons(brandId);
        return learned.flatMap((a) => {
            const l = liveLesson(rows, a.lesson_id!);
            return l ? [{ phrase: parseKey(normKey(a.key)).from, lesson_id: l.id, rule: l.rule }] : [];
        });
    }
    catch {
        return [];
    }
}
export function editRuleChecks(brandId: string, lines: string[], hooks: string[] = []): {
    check: string;
    status: "warn";
    message: string;
    line_index?: number;
}[] {
    const bans = editBans(brandId);
    if (!bans.length)
        return [];
    const has = (text: string, phrase: string) => ` ${normPhrase(editTokens(text).join(" "))} `.includes(` ${phrase} `);
    const out: {
        check: string;
        status: "warn";
        message: string;
        line_index?: number;
    }[] = [];
    for (const b of bans) {
        lines.forEach((t, i) => has(t, b.phrase) && out.push({ check: "learned_edit", status: "warn", line_index: i, message: `Line ${i + 1} says "${b.phrase}". You added a rule against it [${b.lesson_id}]: ${b.rule}` }));
        hooks.forEach((t, i) => has(t, b.phrase) && out.push({ check: "learned_edit", status: "warn", message: `Hook ${i + 1} says "${b.phrase}". You added a rule against it [${b.lesson_id}]: ${b.rule}` }));
    }
    return out.slice(0, 12);
}
export function dismissEdits(brandId: string, asked: string) {
    const key = normKey(asked);
    if (!editRepeats(brandId, 1).some((x) => x.key === key))
        throw new Error("That is no longer waiting: it was already decided.");
    setAsk(brandId, key, { status: "dismissed", upto: newest(brandId) });
}
