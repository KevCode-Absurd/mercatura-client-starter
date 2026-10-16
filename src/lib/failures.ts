import { and, desc, eq, isNull, like, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { FailurePoint } from "./failure-log";
import { recordFeedback } from "./feedback";
import { addLesson, brandLessons, generalLessons, lessonsFor, reinforceLesson, type Area, type Category, type Lesson } from "./lessons";
import { geminiEnabled } from "./llm/gemini";
export * from "./failure-log";
export const MIN_REPEAT = 3;
export const POINTS: Record<string, {
    label: string;
    rule: string;
    category: Category;
}> = {
    product_mismatch: { label: "The product drawn does not match its photo", rule: "Show the product only as its photo shows it: the same shape, size, label and wording. Never plan or draw a pack, a part or a view that no product photo shows.", category: "product_use" },
    pack_use: { label: "The product is opened, held or sized in a way it does not work", rule: "A product opens only at its real opening, and what is inside leaves by that opening. Its size against a hand or another pack is its real size. With no fact about how it opens, show it closed.", category: "product_use" },
    hands: { label: "A hand is drawn in a way a real hand could not be", rule: "Every hand belongs to someone, has 5 fingers and holds what it holds the way a hand can. Never a hand that floats, fuses with an object or grips nothing.", category: "people_hands" },
    scene: { label: "The scene could not be photographed as drawn", rule: "Every object rests on something or is held by something, and the sizes in the picture agree with each other. Never an object floating or joined to nothing unless the plan says it is a stylised frame.", category: "composition" },
    text: { label: "The words on the image are not the planned words", rule: "Every planned line appears once on the image, spelt exactly as written, and nothing else is written on it. Never a reworded, misspelt, repeated or extra line.", category: "words" },
    text_case: { label: "The words on the image changed their capital letters", rule: "Words on an image keep the capital and small letters of the plan. Never set a planned sentence-case line in all capitals.", category: "words" },
    cropped: { label: "The product is cropped or covered", rule: "The whole product is inside the frame with nothing over its front. Never text, a graphic or a prop across the pack.", category: "composition" },
    leak: { label: "Another brand leaked in from a reference", rule: "Nothing of the reference ad's brand appears: not its name, its logo or its product. Only its layout is taken.", category: "composition" },
    frame: { label: "A border, watermark or button nobody asked for", rule: "The image runs to its edges with nothing added: never a white border, a watermark or a button the plan did not ask for.", category: "composition" },
    format_look: { label: "The picture is not made in the look it was asked for", rule: "A picture asked for in a named look is made in that look edge to edge: drawn, modelled, painted or rendered as the look says. Never an ordinary photograph or a pack shot with a little of the look added.", category: "look" },
    look: { label: "Type or colours are off the brand look", rule: "Added type and colours are the brand's own, as its type specimen shows them. Never a typeface or a colour the brand does not use.", category: "look" },
    phone: { label: "Text that would not read on a phone", rule: "Every line reads at the width of a phone feed: large enough, with contrast, over a calm part of the picture. Never small text over a busy area.", category: "composition" },
    hierarchy: { label: "The headline is not clearly the biggest text", rule: "The headline is plainly the largest text and the eye has 1 place to start. Never 2 lines competing at the same size.", category: "composition" },
    lesson: { label: "A rule already in the register was broken", rule: "", category: "other" },
    voice_brand: { label: "A line that is off the brand's voice", rule: "", category: "words" },
    voice_spoken: { label: "A line that does not sound spoken", rule: "", category: "words" },
    copy_pass: { label: "A line the copy editor had to sharpen", rule: "", category: "words" },
    "voice:ending": { label: "A line that ends on a weak word or a trailing clause", rule: "End every line on the word that carries its point. Never on a preposition, a pronoun, a filler word or a clause tacked on after the point.", category: "words" },
    "voice:customer_words": { label: "The buyers' own words for the problem were not used", rule: "Name the problem in the words the buyers themselves use for it, as the customer voice records them. Never a tidier, vaguer or more clinical word in their place.", category: "words" },
    "voice:generic": { label: "A line any brand in the category could have written", rule: "The hook, the first line, the last line and every headline say something only this brand could say: its own number, its own product detail or its buyers' own phrase. Never a line that would fit any brand in the category.", category: "words" },
    "voice:brand_sound": { label: "A line without the brand's own sound", rule: "Write in the sound of the brand's own published lines: its humour, its rhythm and its way of saying a number. Never a flat, salesy or earnest line where the brand itself would be playful.", category: "words" },
    "voice:blame": { label: "A line that blames, lectures or frightens the buyer", rule: "The problem is the thing the buyer put up with, never the buyer. Never a line that shames, lectures or frightens them about what they did or failed to do.", category: "words" },
    "voice:contractions": { label: "A verb left uncontracted", rule: "Contract every verb a person contracts when speaking: you're, it's, don't, there's. Never the full form unless the stress is meant.", category: "words" },
    "voice:contrast": { label: "The \"it's not X, it's Y\" frame", rule: "Say what the thing is. Never the \"it's not X, it's Y\" frame or its variants.", category: "words" },
    "voice:breath": { label: "A line too long or too tangled to say in 1 breath", rule: "1 idea to a sentence, short enough to say in 1 breath and to follow on first hearing. Never 2 ideas joined in a line a listener has to hear twice.", category: "words" },
    "voice:written": { label: "A line that reads written, not said", rule: "Use the word a person says aloud to a friend. Never a formal, clinical or corporate word where a plain one exists.", category: "words" },
};
const AREA_NOUN: Record<Area, string> = { pictures: "images", words: "scripts and pieces of copy", video: "videos" };
export function pointLabel(point: string): string {
    if (POINTS[point])
        return POINTS[point].label;
    const name = point.replace(/^audit:/, "").replace(/_/g, " ");
    return `The check "${name}" was not passed`;
}
const words = (s: string) => new Set(s.toLowerCase().match(/[a-zà-ÿ]{4,}/g) ?? []);
export function matchLesson(lessons: Pick<Lesson, "id" | "rule">[], said: string): string | null {
    const w = words(said);
    if (w.size < 2)
        return null;
    let best: {
        id: string;
        share: number;
    } | null = null;
    for (const l of lessons) {
        const rule = words(l.rule);
        const share = [...w].filter((x) => rule.has(x)).length / w.size;
        if (share >= 0.6 && (!best || share > best.share))
            best = { id: l.id, share };
    }
    return best?.id ?? null;
}
export const pictureLessons = (brandId: string, productId?: string | null) => lessonsFor(brandId, { productId, area: "pictures" }, 50);
export interface FailureGroup {
    key: string;
    area: Area;
    point: string;
    label: string;
    lesson: Pick<Lesson, "id" | "rule"> | null;
    count: number;
    pieces: number;
    notes: string[];
    last: string;
}
const keyOf = (r: {
    area: string;
    point: string;
    lesson_id: string | null;
}) => `${r.area}|${r.point}|${r.lesson_id ?? ""}`;
const open = (brandId: string) => db
    .select()
    .from(schema.checkFailures)
    .where(and(eq(schema.checkFailures.brand_id, brandId), isNull(schema.checkFailures.handled)))
    .orderBy(desc(schema.checkFailures.created_at), desc(schema.checkFailures.id))
    .all();
export function failureGroups(brandId: string, min = MIN_REPEAT): FailureGroup[] {
    let rows: ReturnType<typeof open>;
    try {
        rows = open(brandId);
    }
    catch {
        return [];
    }
    const known = [...brandLessons(brandId), ...generalLessons()];
    const groups = new Map<string, FailureGroup & {
        refs: Set<string>;
    }>();
    for (const r of rows) {
        const key = keyOf(r);
        let g = groups.get(key);
        if (!g) {
            const lesson = r.lesson_id ? (known.find((l) => l.id === r.lesson_id) ?? null) : null;
            g = { key, area: r.area, point: r.point, label: lesson ? POINTS.lesson.label : pointLabel(r.point), lesson: lesson ? { id: lesson.id, rule: lesson.rule } : null, count: 0, pieces: 0, notes: [], last: r.created_at, refs: new Set() };
            groups.set(key, g);
        }
        g.count++;
        g.refs.add(`${r.ref_type}:${r.ref_id}:${r.item_id ?? ""}`);
        if (g.notes.length < 12 && !g.notes.includes(r.note))
            g.notes.push(r.note);
    }
    return [...groups.values()]
        .filter((g) => g.count >= min)
        .map(({ refs, ...g }) => ({ ...g, pieces: refs.size }))
        .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));
}
function settle(brandId: string, key: string, handled: "learned" | "dismissed"): {
    rows: ReturnType<typeof open>;
    productId: string | null;
} {
    const rows = open(brandId).filter((r) => keyOf(r) === key);
    if (!rows.length)
        throw new Error("That is no longer waiting: it was already decided.");
    for (const r of rows)
        db.update(schema.checkFailures).set({ handled, updated_at: new Date().toISOString() }).where(eq(schema.checkFailures.id, r.id)).run();
    const tally = new Map<string, number>();
    for (const r of rows)
        if (r.product_id)
            tally.set(r.product_id, (tally.get(r.product_id) ?? 0) + 1);
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    return { rows, productId: top && top[1] > rows.length / 2 ? top[0] : null };
}
export interface LearnedFromFailures {
    lessons: {
        id: string;
        rule: string;
        isNew: boolean;
    }[];
    note: string;
}
export async function learnFromFailures(brandId: string, key: string): Promise<LearnedFromFailures> {
    const group = failureGroups(brandId, 1).find((g) => g.key === key);
    if (!group)
        throw new Error("That is no longer waiting: it was already decided.");
    const { productId } = settle(brandId, key, "learned");
    if (!geminiEnabled()) {
        if (group.lesson) {
            const again = reinforceLesson(brandId, group.lesson.id);
            return { lessons: again ? [{ id: again.id, rule: again.rule, isNew: false }] : [], note: again ? "" : "The rule it broke is no longer in the register." };
        }
        const rule = POINTS[group.point]?.rule || group.notes[0].slice(0, 500);
        const lesson = addLesson(brandId, { scope: "brand", category: POINTS[group.point]?.category ?? "other", areas: [group.area], rule: rule.padEnd(8, "."), why: `The app's checks found this ${group.count} times: ${group.notes[0]}`.slice(0, 500), source: "checks" });
        return { lessons: [{ id: lesson.id, rule: lesson.rule, isNew: true }], note: "" };
    }
    const text = [
        `The app's own checks reported the same problem ${group.count} times, on ${group.pieces} ${AREA_NOUN[group.area]}: ${group.label.toLowerCase()}. Make it a lasting rule so it is not made again.`,
        "What the checks reported:",
        ...group.notes.map((n) => `- ${n}`),
        group.lesson ? `The register already has ${group.lesson.id} on this, and it was broken anyway: ${group.lesson.rule}` : "",
    ]
        .filter(Boolean)
        .join("\n");
    const res = await recordFeedback({
        brandId,
        refType: "brand",
        productId,
        source: "checks",
        text,
        about: `Not a person's note on 1 piece: a failure the app's checks keep finding on this brand's ${AREA_NOUN[group.area]}. The person asked for it to be learned, so it is lasting and never a one_off: \`known\` if a lesson already states it (then give a sharper wording that would have prevented these failures), otherwise \`new\`. Write 1 rule for the cause the reports share, not 1 for each report.`,
    });
    if (res.feedback.status === "failed") {
        for (const r of db.select().from(schema.checkFailures).where(and(eq(schema.checkFailures.brand_id, brandId), eq(schema.checkFailures.handled, "learned"))).all())
            if (keyOf(r) === key)
                db.update(schema.checkFailures).set({ handled: null }).where(eq(schema.checkFailures.id, r.id)).run();
        throw new Error(`It could not be read into a rule: ${res.feedback.error ?? "the reader failed"}. Nothing was changed.`);
    }
    return { lessons: res.lessons.map((x) => ({ id: x.lesson.id, rule: x.lesson.rule, isNew: x.isNew })), note: res.lessons.length ? "" : res.feedback.summary || "The reader found no lasting rule in it." };
}
export function dismissFailures(brandId: string, key: string): number {
    return settle(brandId, key, "dismissed").rows.length;
}
export interface ScriptTrend {
    recent: {
        scripts: number;
        per: number;
    };
    before: {
        scripts: number;
        per: number;
    } | null;
}
export function scriptTrend(brandId: string, size = 10): ScriptTrend | null {
    try {
        const ids = db.select({ id: schema.scripts.id }).from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).orderBy(desc(schema.scripts.created_at), desc(schema.scripts.id)).limit(size * 2).all().map((s) => s.id);
        if (ids.length < 4)
            return null;
        const found = new Map(db
            .select({ id: schema.checkFailures.ref_id, n: sql<number> `count(*)` })
            .from(schema.checkFailures)
            .where(and(eq(schema.checkFailures.brand_id, brandId), eq(schema.checkFailures.ref_type, "script"), eq(schema.checkFailures.area, "words"), like(schema.checkFailures.point, "audit:%")))
            .groupBy(schema.checkFailures.ref_id)
            .all()
            .map((r) => [r.id, r.n]));
        const half = Math.min(size, Math.ceil(ids.length / 2));
        const rate = (of: string[]) => ({ scripts: of.length, per: Math.round((of.reduce((a, id) => a + (found.get(id) ?? 0), 0) / of.length) * 10) / 10 });
        const older = ids.slice(half, half * 2);
        return { recent: rate(ids.slice(0, half)), before: older.length ? rate(older) : null };
    }
    catch {
        return null;
    }
}
export const failuresWaiting = (brandId: string): number => failureGroups(brandId).length;
