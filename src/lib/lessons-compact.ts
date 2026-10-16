import { z } from "zod";
import { env } from "./env";
import { AREAS, type Area, type Lesson } from "./lesson-types";
import { brandLessons, generalLessons, mergeLessons } from "./lessons";
import { callStructured, llmEnabled } from "./llm/gateway";
import { renderPrompt } from "./prompts";
export const COMPACT_OVER = 12;
export const CompactAnswer = z.object({ merged: z.array(z.object({ ids: z.array(z.string()).max(12), rule: z.string().default("") })).max(20).default([]) });
export type ProposedMerge = z.infer<typeof CompactAnswer>["merged"][number];
export const compactable = (rows: Lesson[], area: Area): Lesson[] => rows.filter((l) => l.status !== "off" && l.areas.includes(area) && !l.image);
const kindOf = (l: Lesson) => [l.kind, l.scope, l.product_id ?? "", [...l.formats].sort().join(","), l.category === "product_use" ? "use" : "advice"].join("|");
const quoted = (s: string) => [...s.matchAll(/["“]([^"”]{2,80})["”]/g)].map((m) => m[1].toLowerCase().trim());
const numbers = (s: string) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", "."));
const words = (s: string) => (s.toLowerCase().match(/[a-zà-ÿ]{4,}/g) ?? []).map((w) => w.replace(/(ing|ed|es|s)$/, ""));
export function mergeFault(rows: Lesson[], m: ProposedMerge, taken: Set<string> = new Set()): string | null {
    const ids = [...new Set(m.ids)];
    if (ids.length < 2)
        return "fewer than 2 rules";
    const from = ids.map((id) => rows.find((l) => l.id === id));
    if (from.some((l) => !l))
        return "names a rule that is not on the list";
    if (ids.some((id) => taken.has(id)))
        return "a rule is in 2 groups";
    const olds = from as Lesson[];
    if (new Set(olds.map(kindOf)).size > 1)
        return "rules of different kinds";
    const rule = m.rule.replace(/\s+/g, " ").trim();
    const all = olds.map((l) => l.rule).join(" ");
    if (rule.length < 8 || rule.length > 500)
        return "the merged rule is too short or too long";
    if (rule.length >= all.length)
        return "the merged rule is no shorter than the rules it replaces";
    const low = rule.toLowerCase();
    if (quoted(all).some((q) => !low.includes(q)))
        return "a quoted phrase was lost";
    if (quoted(rule).some((q) => !all.toLowerCase().includes(q)))
        return "a quoted phrase was added";
    const had = new Set(numbers(all));
    const has = new Set(numbers(rule));
    if ([...has].some((n) => !had.has(n)))
        return "a number was added";
    if ([...had].some((n) => !has.has(n)))
        return "a number was lost";
    const known = new Set(words(all));
    const mine = words(rule);
    if (mine.length && mine.filter((w) => known.has(w)).length / mine.length < 0.7)
        return "the merged rule says something the rules did not";
    return null;
}
export interface CompactResult {
    area: Area;
    before: number;
    after: number;
    ran: boolean;
    merged: {
        id: string;
        rule: string;
        replaces: {
            id: string;
            rule: string;
        }[];
    }[];
    refused: {
        ids: string[];
        why: string;
    }[];
    costUsd: number;
}
const label = (l: Lesson) => `[${[l.kind, l.scope === "product" ? `product ${l.product_id}` : l.scope, l.category === "product_use" ? "how the product is used" : "", l.formats.length ? `format ${[...l.formats].sort().join("+")}` : ""].filter(Boolean).join(", ")}]`;
export async function compactLessons(brandId: string, area: Area, opts: {
    force?: boolean;
    general?: boolean;
    dry?: boolean;
} = {}): Promise<CompactResult> {
    const rows = compactable(opts.general ? generalLessons() : brandLessons(brandId), area);
    const res: CompactResult = { area, before: rows.length, after: rows.length, ran: false, merged: [], refused: [], costUsd: 0 };
    if (rows.length < 2 || (!opts.force && rows.length <= COMPACT_OVER) || !llmEnabled())
        return res;
    const p = renderPrompt("lesson-compact", { rules: rows.map((l) => `${l.id} ${label(l)} ${l.rule}`).join("\n") });
    const out = await callStructured({ brandId, task: "lesson_compact", model: env.MODEL_REFERENCE, system: p.system, user: p.user, schema: CompactAnswer, effort: "low", maxTokens: 2500, refType: "brand", refId: `${brandId}:${area}` });
    res.ran = true;
    res.costUsd = out.costUsd ?? 0;
    const taken = new Set<string>();
    for (const m of out.data.merged) {
        const ids = [...new Set(m.ids)];
        const why = mergeFault(rows, m, taken);
        if (why) {
            res.refused.push({ ids, why });
            continue;
        }
        ids.forEach((id) => taken.add(id));
        const rule = m.rule.replace(/\s+/g, " ").trim();
        const id = opts.dry ? "(not written)" : mergeLessons(brandId, ids, rule).id;
        res.merged.push({ id, rule, replaces: ids.map((x) => ({ id: x, rule: rows.find((l) => l.id === x)!.rule })) });
    }
    res.after = rows.length - taken.size + res.merged.length;
    return res;
}
const running = new Set<string>();
export async function compactIfLong(brandId: string): Promise<CompactResult[]> {
    const done: CompactResult[] = [];
    if (running.has(brandId))
        return done;
    running.add(brandId);
    try {
        for (const area of AREAS) {
            if (compactable(brandLessons(brandId), area).length <= COMPACT_OVER)
                continue;
            done.push(await compactLessons(brandId, area));
        }
    }
    catch {
    }
    finally {
        running.delete(brandId);
    }
    return done;
}
