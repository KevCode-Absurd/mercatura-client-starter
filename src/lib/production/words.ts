import type { AuditItem, ImagePlan, VideoPlan } from "@/db/schema";
import { PRIMARY_WORDS, isStoryStage, stageName } from "../copy/stage";
import type { WordLine } from "../copy/word-faults";
import { leftLine, type LineFault } from "../copy/words-read";
import type { AwarenessStage } from "../taxonomy";
export interface PlanWords {
    lines: WordLine[];
    max: Record<string, number>;
    set: (id: string, text: string) => void;
    where: (id: string) => string;
}
const PLACEHOLDER = /\[[^\]]+\]/;
const HEADLINE_ROOM = 50;
const DESCRIPTION_ROOM = 30;
const LENGTHS = ["short", "medium", "long"] as const;
const plain = (s: string) => ` ${s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
function collect() {
    const lines: WordLine[] = [];
    const max: Record<string, number> = {};
    const sets = new Map<string, (v: string) => void>();
    const places = new Map<string, string>();
    const add = (line: WordLine, place: string, set: (v: string) => void, room?: number) => {
        lines.push(line);
        sets.set(line.id, set);
        places.set(line.id, place);
        if (room)
            max[line.id] = room;
    };
    const out = (): PlanWords => ({ lines, max, set: (id, v) => sets.get(id)?.(v), where: (id) => places.get(id) ?? "the plan" });
    return { add, out };
}
export function primaryTexts(p: ImagePlan["ad_copy"]["primary_text"]): {
    text: string;
    lengths: (typeof LENGTHS)[number][];
}[] {
    const byText = new Map<string, (typeof LENGTHS)[number][]>();
    for (const k of LENGTHS)
        if (p[k].trim())
            byText.set(p[k].trim(), [...(byText.get(p[k].trim()) ?? []), k]);
    return [...byText].map(([text, lengths]) => ({ text, lengths }));
}
function addFeed(c: ImagePlan["ad_copy"], add: ReturnType<typeof collect>["add"], o: {
    primary?: boolean;
    already?: Set<string>;
}) {
    if (o.primary !== false)
        for (const { text, lengths } of primaryTexts(c.primary_text))
            add({ id: lengths[0], surface: "primary", text }, `primary text (${lengths.join(", ")})`, (v) => lengths.forEach((k) => void (c.primary_text[k] = v)));
    c.headlines.forEach((h, i) => {
        if (!h.trim() || o.already?.has(plain(h)))
            return;
        add({ id: `headline${i + 1}`, surface: "headline", text: h }, `headline ${i + 1}`, (v) => void (c.headlines[i] = v), HEADLINE_ROOM);
    });
    if (c.description.trim())
        add({ id: "description", surface: "headline", text: c.description }, "description", (v) => void (c.description = v), DESCRIPTION_ROOM);
}
export function imagePlanWords(plan: ImagePlan, o: {
    room: (text: string, role: string) => number;
    native?: boolean;
    already?: string[];
}): PlanWords {
    const { add, out } = collect();
    const already = new Set((o.already ?? []).filter((x) => x.trim()).map(plain));
    plan.cards.forEach((c, i) => c.text_elements.forEach((t, j) => {
        if (!t.text.trim() || PLACEHOLDER.test(t.text))
            return;
        const quote = /quote|review|testimonial/i.test(t.role) && !/^["“]/.test(t.text.trim());
        add({ id: `c${i + 1}t${j + 1}`, surface: "picture", role: t.role, text: quote ? `"${t.text.trim()}"` : t.text }, `${plan.cards.length > 1 ? `card ${i + 1}, ` : ""}on the picture (${t.role})`, (v) => void (t.text = quote ? v.replace(/^["“]|["”]$/g, "") : v), Math.ceil(o.room(t.text, t.role) * 1.15) + (quote ? 2 : 0));
    }));
    addFeed(plan.ad_copy, add, { primary: !o.native, already });
    return out();
}
export function wordForWord(text: string, script: string): boolean {
    const said = plain(script);
    const parts = text.split(/(?<=[.!?…])\s+/).map(plain).filter((x) => x.trim());
    return parts.length > 0 && parts.every((x) => said.includes(x));
}
export function videoPlanWords(plan: VideoPlan, scriptLines: string[]): PlanWords {
    const { add, out } = collect();
    const script = scriptLines.join(" ");
    plan.segments.forEach((s, i) => s.scenes.forEach((x, j) => {
        const m = x.dialogue.match(/^\s*((?:Host|Guest|Character A|Character B|Narrator)\s*:\s*)([\s\S]*)$/i);
        const who = m?.[1] ?? "";
        const text = (m?.[2] ?? x.dialogue).trim();
        if (!text || PLACEHOLDER.test(text) || wordForWord(text, script))
            return;
        add({ id: `d${i + 1}s${j + 1}`, surface: "spoken", text }, `clip ${i + 1} scene ${j + 1}, spoken`, (v) => void (x.dialogue = `${who}${v}`));
    }));
    if (plan.ad_copy)
        addFeed(plan.ad_copy, add, {});
    return out();
}
export const isSpokenId = (id: string) => /^d\d+s\d+$/.test(id);
export const readPoints = (w: PlanWords, left: LineFault[]): AuditItem[] => left.map((f): AuditItem => {
    const at = w.where(f.id);
    return { check: "words_read", status: "warn", message: `${at.charAt(0).toUpperCase()}${at.slice(1)}: ${leftLine(f)}`.slice(0, 400) };
});
const n = (x: number) => x.toLocaleString("en-US");
export function feedLengths(stage: AwarenessStage | null | undefined): string {
    if (!stage)
        return "`primary_text` has 3 lengths of the same message: `short` 20 to 40 words, `medium` 55 to 90, `long` 120 to 180. More length must add something the buyer wants to know.";
    const [lo, hi] = PRIMARY_WORDS[stage];
    if (isStoryStage(stage))
        return `\`primary_text\` is 1 text for a ${stageName(stage)} buyer, ${n(lo)} to ${n(hi)} words, written in full in \`long\`: the story of the problem, as "The buyer's stage" sets it out. Leave \`short\` and \`medium\` as empty strings. A short text is the wrong ad for this buyer, so the same text is shown at every length.`;
    return `\`primary_text\` has 3 texts of the same message, each inside the range for a ${stageName(stage)} buyer, ${n(lo)} to ${n(hi)} words: \`short\` near the bottom of it, \`long\` near the top, \`medium\` between. Each is a whole telling, never a longer one cut down. More length must add something the buyer wants to know.`;
}
export function fillLengths<T extends {
    short: string;
    medium: string;
    long: string;
}>(p: T): T {
    const long = p.long.trim() || p.medium.trim() || p.short.trim();
    const medium = p.medium.trim() || long;
    return { ...p, short: p.short.trim() || medium, medium, long };
}
