import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { brandBrainDir } from "./brand-brain";
import { getBrandRow } from "./brands";
import { env } from "./env";
import { brokenCounts } from "./failure-log";
import { AREA_LABEL, CATEGORIES, LessonSchema, type Area, type Category, type Lesson } from "./lesson-types";
export * from "./lesson-types";
const FileSchema = z.object({ lessons: z.array(LessonSchema) });
const override = () => (env.LESSONS_DIR ? path.resolve(process.cwd(), env.LESSONS_DIR) : "");
const skillDir = () => path.join(env.SKILLS_DIR, "creative-lessons");
const generalFile = () => (override() ? path.join(override(), "_general.json") : path.join(skillDir(), "register.json"));
export function brandLessonsFile(brandId: string): string {
    if (override())
        return path.join(override(), `${brandId}.json`);
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return path.join(brandBrainDir(row.dir), "lessons.json");
}
function read(file: string): Lesson[] {
    if (!fs.existsSync(file))
        return [];
    const parsed = FileSchema.safeParse(JSON.parse(fs.readFileSync(file, "utf-8")));
    if (!parsed.success)
        throw new Error(`${path.basename(file)} is not a valid lessons file: ${parsed.error.issues[0]?.message ?? "unknown problem"} at ${parsed.error.issues[0]?.path.join(".")}`);
    return parsed.data.lessons;
}
function write(file: string, lessons: Lesson[]) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify({ lessons }, null, 2)}\n`, "utf-8");
}
export function brandLessons(brandId: string): Lesson[] {
    return read(brandLessonsFile(brandId));
}
export function generalLessons(): Lesson[] {
    const file = generalFile();
    return fs.existsSync(file) ? read(file) : read(path.join(skillDir(), "register.json"));
}
const START = "<!-- register:start (written by the app from register.json; edit lessons in the app or in register.json) -->";
const END = "<!-- register:end -->";
export function registerMarkdown(lessons: Lesson[]): string {
    const live = lessons.filter((l) => l.status === "active");
    if (!live.length)
        return "(no lessons yet)";
    return (Object.keys(CATEGORIES) as Category[])
        .map((c) => {
        const rows = live.filter((l) => l.category === c);
        if (!rows.length)
            return "";
        return `### ${CATEGORIES[c]}\n\n${rows.map((l) => `- **${l.id}** (${l.areas.map((a) => AREA_LABEL[a].toLowerCase()).join(", ")}). ${l.rule}${l.why ? ` *Why: ${l.why}*` : ""}`).join("\n")}`;
    })
        .filter(Boolean)
        .join("\n\n");
}
function saveGeneral(lessons: Lesson[]) {
    write(generalFile(), lessons);
    if (override())
        return;
    const skill = path.join(skillDir(), "SKILL.md");
    if (!fs.existsSync(skill))
        return;
    const md = fs.readFileSync(skill, "utf-8");
    const a = md.indexOf(START);
    const b = md.indexOf(END);
    if (a < 0 || b < a)
        return;
    fs.writeFileSync(skill, `${md.slice(0, a)}${START}\n\n${registerMarkdown(lessons)}\n\n${md.slice(b)}`, "utf-8");
}
function saveBrand(brandId: string, lessons: Lesson[]) {
    const file = brandLessonsFile(brandId);
    if (!lessons.length && fs.existsSync(file))
        fs.rmSync(file);
    else if (lessons.length)
        write(file, lessons);
}
export interface LessonQuery {
    productId?: string | null;
    area: Area | Area[];
    format?: string | null;
    wordsOnly?: boolean;
    factsElsewhere?: boolean;
}
export function lessonsFor(brandId: string, q: LessonQuery, cap = 15): Lesson[] {
    const mine = brandLessons(brandId).filter((l) => l.status !== "off" && (l.scope !== "product" || l.product_id === q.productId));
    const own = new Set(mine);
    const all = [...mine, ...generalLessons().filter((l) => l.status === "active")].filter((l) => [q.area].flat().some((x) => l.areas.includes(x))).filter((l) => !l.formats.length || (!!q.format && l.formats.includes(q.format))).filter((l) => !q.wordsOnly || l.category !== "product_use")
        .filter((l) => !q.factsElsewhere || l.category !== "product_use" || l.scope === "general");
    const broken = brokenCounts(brandId);
    const brokenOf = (l: Lesson) => [l.id, ...l.replaces].reduce((n, id) => n + (broken.get(id) ?? 0), 0);
    const rank = (l: Lesson) => (l.category === "product_use" ? 0 : 1) * 1000 + (own.has(l) ? 0 : 100) - Math.min(l.times + brokenOf(l), 90);
    return all.sort((a, b) => rank(a) - rank(b) || b.updated_at.localeCompare(a.updated_at)).slice(0, cap);
}
export function useFacts(brandId: string, productId: string | null | undefined, area: Area = "pictures"): string[] {
    return lessonsFor(brandId, { productId, area }).filter((l) => l.category === "product_use" && l.scope !== "general").map((l) => l.rule);
}
const FORM_RULE = /\b(\d|two|three)[- ]beats?\b|\bcadence\b|\brhythms?\b|\bpunch(y|ier)\b|short sentences|sentence length|lead with (a |the )?numbers?|weight(ed)? (nouns?|words?)|\bend (every |each )?(lines?|sentences?)\b|long paragraphs|\bfragments?\b|\bgeneric\b|cheeky sound/i;
const isDevice = (l: Lesson) => (l.source === "checks" || l.source === "seed") && FORM_RULE.test(l.rule);
export function lessonBlock(brandId: string, q: LessonQuery, ids = false): string {
    const all = lessonsFor(brandId, q).filter((l) => !isDevice(l));
    if (!all.length)
        return "";
    const tag = (l: Lesson) => (ids ? `[${l.id}] ` : "");
    const facts = all.filter((l) => l.category === "product_use" && l.scope !== "general");
    const keeps = all.filter((l) => l.kind === "keep" && !facts.includes(l));
    const rest = all.filter((l) => !facts.includes(l) && !keeps.includes(l) && !(facts.length && l.category === "product_use" && l.scope === "general"));
    const line = (l: Lesson) => `- ${tag(l)}${l.rule}${l.why ? ` (Why: ${l.why})` : ""}`;
    return [
        facts.length ? `HOW THIS PRODUCT IS OPENED, HELD AND USED. These are facts. Anything that shows the product open, held or in use follows them exactly:\n${facts.map((l) => `- ${tag(l)}${l.rule}`).join("\n")}` : "",
        rest.length ? `MISTAKES MADE BEFORE. Each was pointed out on earlier work. Do not repeat any of them:\n${rest.map(line).join("\n")}` : "",
        keeps.length ? `WHAT WAS APPROVED BEFORE. Each was named as a reason an earlier piece was approved. Keep doing these where they fit:\n${keeps.map((l) => `- ${tag(l)}${l.rule}`).join("\n")}` : "",
    ]
        .filter(Boolean)
        .join("\n\n");
}
export const lessonIds = (brandId: string): Set<string> => new Set([...brandLessons(brandId), ...generalLessons()].map((l) => l.id));
export type WordRole = "writes" | "edits" | "judges";
const ROLE_LINE: Record<WordRole, string> = {
    writes: "Write so that none of them is broken.",
    edits: "A line that breaks one of them is a problem to fix, and no fix may break one.",
    judges: "Judge by them as well: a line that breaks one of them does not pass.",
};
export function learnedRules(brandId: string, role: WordRole, q: {
    productId?: string | null;
    area?: Area | Area[];
    format?: string | null;
    ids?: boolean;
} = {}): string {
    const query = { productId: q.productId, area: q.area ?? "words", format: q.format };
    const block = role === "writes"
        ? lessonBlock(brandId, query, q.ids)
        : lessonsFor(brandId, query, 10)
            .filter((l) => !isDevice(l))
            .filter((l) => role === "edits" || l.category === "words" || l.category === "other")
            .map((l) => `- ${q.ids ? `[${l.id}] ` : ""}${l.rule}`)
            .join("\n");
    if (!block)
        return "";
    return `## Rules learned from earlier work on this brand\nEach was pointed out by a person on a finished piece, or found by the app's checks again and again. They stand above a house rule. ${ROLE_LINE[role]}\n\n${block}`;
}
export function lessonRules(brandId: string, q: LessonQuery, cap = 10, only?: string[]): string {
    const all = lessonsFor(brandId, q, only ? 50 : cap).filter((l) => !only || only.includes(l.id)).slice(0, cap);
    return all.length ? all.map((l) => `- ${l.rule}`).join("\n") : "";
}
export function lessonImages(brandId: string, productId: string | null | undefined): {
    file: string;
    role: string;
}[] {
    return lessonsFor(brandId, { productId, area: "pictures" }, 50)
        .filter((l) => l.image && fs.existsSync(path.join(env.DATA_DIR, "assets", l.image)))
        .slice(0, 2)
        .map((l) => ({ file: path.join(env.DATA_DIR, "assets", l.image), role: `Shows this done right: ${l.rule.slice(0, 160)} Take only that from it: not its setting, its light or its people` }));
}
const now = () => new Date().toISOString();
const nextId = (rows: Lesson[], prefix: string) => `${prefix}-${String(Math.max(0, ...rows.map((l) => Number(l.id.match(/(\d+)$/)?.[1] ?? 0))) + 1).padStart(3, "0")}`;
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
export interface LessonInput {
    scope: Lesson["scope"];
    product_id?: string | null;
    category: Category;
    areas: Area[];
    rule: string;
    why?: string;
    status?: Lesson["status"];
    source?: Lesson["source"];
    feedback_id?: string;
    formats?: string[];
    kind?: Lesson["kind"];
}
export function addLesson(brandId: string, input: LessonInput): Lesson {
    const rows = brandLessons(brandId);
    const lesson = LessonSchema.parse({
        id: nextId(rows, "L"),
        scope: input.scope,
        product_id: input.scope === "product" ? (input.product_id ?? null) : null,
        category: input.category,
        areas: input.areas.length ? input.areas : ["pictures"],
        rule: clean(input.rule),
        why: clean(input.why ?? ""),
        status: input.status ?? (input.scope === "general" ? "proposed" : "active"),
        source: input.source ?? "manual",
        formats: input.formats ?? [],
        kind: input.kind ?? "avoid",
        feedback_ids: input.feedback_id ? [input.feedback_id] : [],
        created_at: now(),
        updated_at: now(),
    });
    if (lesson.scope === "product" && !lesson.product_id)
        throw new Error("A lesson about 1 product needs the product.");
    saveBrand(brandId, [...rows, lesson]);
    return lesson;
}
export type LessonPatch = Partial<Pick<Lesson, "rule" | "why" | "category" | "areas" | "status" | "scope" | "product_id" | "image" | "formats" | "kind">>;
function locate(brandId: string, id: string): {
    rows: Lesson[];
    at: number;
    general: boolean;
} {
    const mine = brandLessons(brandId);
    const a = mine.findIndex((l) => l.id === id);
    if (a > -1)
        return { rows: mine, at: a, general: false };
    const all = generalLessons();
    const b = all.findIndex((l) => l.id === id);
    if (b > -1)
        return { rows: all, at: b, general: true };
    throw new Error(`Lesson ${id} not found`);
}
export function updateLesson(brandId: string, id: string, patch: LessonPatch): Lesson {
    const { rows, at, general } = locate(brandId, id);
    const next = LessonSchema.parse({ ...rows[at], ...patch, ...(patch.rule !== undefined ? { rule: clean(patch.rule) } : {}), ...(patch.why !== undefined ? { why: clean(patch.why) } : {}), updated_at: now() });
    if (general) {
        if (next.scope !== "general")
            throw new Error("A general lesson stays general. Turn it off and add a brand lesson instead.");
        if (next.status === "proposed")
            next.status = "active";
        next.product_id = null;
    }
    else {
        if (next.scope !== "product")
            next.product_id = null;
        if (next.scope === "product" && !next.product_id)
            throw new Error("A lesson about 1 product needs the product.");
        if (next.scope === "general" && next.status === "active")
            next.status = "proposed";
        if (next.scope !== "general" && next.status === "proposed")
            next.status = "active";
    }
    rows[at] = next;
    if (general)
        saveGeneral(rows);
    else
        saveBrand(brandId, rows);
    return next;
}
export function deleteLesson(brandId: string, id: string) {
    const { rows, at, general } = locate(brandId, id);
    const [gone] = rows.splice(at, 1);
    if (general)
        saveGeneral(rows);
    else
        saveBrand(brandId, rows);
    if (gone.image)
        fs.rmSync(path.join(env.DATA_DIR, "assets", gone.image), { force: true });
}
export function promoteLesson(brandId: string, id: string): Lesson {
    const mine = brandLessons(brandId);
    const at = mine.findIndex((l) => l.id === id);
    if (at < 0)
        throw new Error(`Lesson ${id} is not in this brand's register.`);
    const all = generalLessons();
    const [l] = mine.splice(at, 1);
    const moved = LessonSchema.parse({ ...l, id: nextId(all, "G"), scope: "general", product_id: null, status: "active", image: "", updated_at: now() });
    saveGeneral([...all, moved]);
    saveBrand(brandId, mine);
    return moved;
}
export function reinforceLesson(brandId: string, id: string, feedbackId?: string, sharper?: string, opts: {
    wake?: boolean;
} = {}): Lesson | null {
    const wake = opts.wake ?? true;
    let found: ReturnType<typeof locate>;
    try {
        found = locate(brandId, id);
    }
    catch {
        return null;
    }
    const { rows, general } = found;
    let at = found.at;
    for (let hop = 0; hop < 5 && rows[at].merged_into; hop++) {
        const next = rows.findIndex((x) => x.id === rows[at].merged_into);
        if (next < 0)
            break;
        at = next;
    }
    const l = rows[at];
    rows[at] = { ...l, times: l.times + 1, status: l.status === "off" && wake ? (general || l.scope !== "general" ? "active" : "proposed") : l.status, feedback_ids: feedbackId ? [...new Set([...l.feedback_ids, feedbackId])].slice(-20) : l.feedback_ids, ...(sharper && !general && clean(sharper).length >= 8 ? { rule: clean(sharper).slice(0, 500) } : {}), updated_at: now() };
    if (general)
        saveGeneral(rows);
    else
        saveBrand(brandId, rows);
    return rows[at];
}
const SOURCE_RANK: Lesson["source"][] = ["edits", "feedback", "manual", "checks", "seed"];
export function liveLesson(rows: Lesson[], id: string): Lesson | null {
    let l = rows.find((x) => x.id === id);
    for (let hop = 0; hop < 5 && l?.merged_into; hop++)
        l = rows.find((x) => x.id === l!.merged_into);
    return l && l.status !== "off" ? l : null;
}
export function mergeLessons(brandId: string, ids: string[], rule: string): Lesson {
    if (new Set(ids).size < 2)
        throw new Error("A merge needs at least 2 rules.");
    const { rows, general } = locate(brandId, ids[0]);
    const olds = ids.map((id) => rows.find((l) => l.id === id));
    if (olds.some((l) => !l || l.status === "off"))
        throw new Error("A rule to merge is not in use in this register.");
    const from = olds as Lesson[];
    const first = [...from].sort((a, b) => b.times - a.times)[0];
    const merged = LessonSchema.parse({
        ...first,
        id: nextId(rows, general ? "G" : "L"),
        rule: clean(rule),
        why: `Merged from ${ids.join(", ")}. ${[...new Set(from.map((l) => l.why).filter(Boolean))].join(" ")}`.trim().slice(0, 500),
        areas: [...new Set(from.flatMap((l) => l.areas))],
        status: general || first.scope !== "general" ? "active" : "proposed",
        source: SOURCE_RANK.find((s) => from.some((l) => l.source === s)) ?? first.source,
        feedback_ids: [...new Set(from.flatMap((l) => l.feedback_ids))].slice(-20),
        image: "",
        times: from.reduce((n, l) => n + l.times, 0),
        replaces: ids,
        merged_into: "",
        created_at: now(),
        updated_at: now(),
    });
    const next = [...rows.map((l) => (ids.includes(l.id) ? { ...l, status: "off" as const, merged_into: merged.id, updated_at: now() } : l)), merged];
    if (general)
        saveGeneral(next);
    else
        saveBrand(brandId, next);
    return merged;
}
export function unmergeLesson(brandId: string, id: string): Lesson[] {
    const { rows, at, general } = locate(brandId, id);
    const merged = rows[at];
    if (!merged.replaces.length)
        throw new Error(`${id} was not made by a merge.`);
    const back = rows.filter((l) => l.id !== id).map((l) => (l.merged_into === id ? { ...l, merged_into: "", status: general || l.scope !== "general" ? ("active" as const) : ("proposed" as const), updated_at: now() } : l));
    if (general)
        saveGeneral(back);
    else
        saveBrand(brandId, back);
    return back.filter((l) => merged.replaces.includes(l.id));
}
export function lessonImagePath(brandId: string, id: string, ext: string): {
    abs: string;
    rel: string;
} {
    const rel = `lessons/${brandId}/${id}${ext}`;
    const abs = path.join(env.DATA_DIR, "assets", rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    return { abs, rel };
}
