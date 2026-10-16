import fs from "node:fs";
import { competitorLines } from "./competitors";
import { BRAIN_DOCS, brainDocPath, readAllDocs, sec, type DocId, type LoadedDoc } from "./docs";
import { fieldValue, itemsOf, plainText, tableOf } from "./md";
export interface BrainBrief {
    selling_points: string[];
    never_say: string;
    never_show: string;
    always: string;
    works: string[];
    avoid: string[];
    now: string[];
    against?: string[];
    quotes?: string[];
}
const clip = (s: string, n: number) => {
    const t = plainText(s).replace(/\s+/g, " ").trim();
    return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};
const lead = (s: string, n: number) => clip(plainText(s).split(/(?<=[.!?])\s+/).slice(0, 2).join(" "), n);
export function realQuotes(docs: Record<DocId, LoadedDoc>, max = 8): string[] {
    return docs.avatars.doc.sections
        .filter((s) => /^grounded in/i.test(s.title))
        .flatMap((s) => itemsOf(s))
        .filter((i) => /["\u201c][^"\u201d]{12,}["\u201d]\s*\(/.test(i))
        .slice(0, max)
        .map((i) => clip(i, 260));
}
export function buildBrief(docs: Record<DocId, LoadedDoc>, opts: {
    compare?: boolean;
    quotes?: boolean;
    now?: Date;
} = {}): BrainBrief {
    const g = docs.guidelines.doc;
    const brain = docs.brain.doc;
    const rails = sec(g, "guardrails");
    const at = opts.now ?? new Date();
    const until = at.toISOString().slice(0, 10);
    const cutoff = new Date(at.getTime() - 45 * 86400000).toISOString().slice(0, 10);
    const log = tableOf(sec(docs.changes.doc, "changeLog"))?.rows ?? [];
    const now = log
        .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r[0] ?? "") && r[0] >= cutoff && r[0] <= until && !(opts.compare ? /^(setup|learning)$/i : /^(setup|learning|competitor|retail)$/i).test((r[1] ?? "").trim()))
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .slice(0, 5)
        .map((r) => `${r[0]} ${r[1]}: ${clip(r[2] ?? "", 150)}`);
    const brief: BrainBrief = {
        selling_points: itemsOf(sec(g, "usps")).slice(0, 5).map((u) => lead(u, 170)),
        never_say: clip(fieldValue(rails, "Never say"), 220),
        never_show: clip(fieldValue(rails, "Never show"), 200),
        always: clip(fieldValue(rails, "Always"), 200),
        works: itemsOf(sec(brain, "works")).slice(0, 5).map((w) => clip(w, 130)),
        avoid: itemsOf(sec(brain, "avoid")).slice(0, 6).map((w) => clip(w, 130)),
        now,
    };
    if (opts.compare)
        brief.against = competitorLines(docs.competitors.doc, 5);
    if (opts.quotes)
        brief.quotes = realQuotes(docs);
    return brief;
}
export const QUOTE_RULE = "Words shown as a customer's (a quote, a review, a testimonial) come only from this list: word for word, with the name and source given. A buyer's phrase from a persona is not a review. If none here fits, show no quote and make the point another way.";
export const briefIsEmpty = (b: BrainBrief) => !b.selling_points.length && !b.never_say && !b.never_show && !b.always && !b.works.length && !b.avoid.length && !b.now.length && !b.against?.length;
export interface BriefOptions {
    forWriter?: boolean;
    dealt?: boolean;
}
export const DEALT_QUOTE_RULE = "Words shown as a customer's (a quote, a review, a testimonial) come only from the customer lines dealt to that piece: word for word, with the source given there. A buyer's phrase from a persona is not a review. If none dealt to it fits, show no quote and make the point another way.";
export function briefObject(b: BrainBrief, opts: BriefOptions = {}): Record<string, unknown> | null {
    if (briefIsEmpty(b))
        return null;
    const always = opts.dealt ? "" : b.always;
    const out = {
        ...(b.selling_points.length ? { selling_points_ranked: b.selling_points } : {}),
        ...(b.never_say || b.never_show || always ? { guardrails: { ...(b.never_say ? { never_say: b.never_say } : {}), ...(b.never_show ? { never_show: b.never_show } : {}), ...(always ? { always } : {}) } } : {}),
        ...(!opts.forWriter && b.works.length ? { has_worked: b.works } : {}),
        ...(!opts.forWriter && b.avoid.length ? { avoid: b.avoid } : {}),
        ...(!opts.forWriter && b.now.length ? { changed_lately: b.now } : {}),
        ...(!opts.forWriter && b.against?.length ? { against_competitors: b.against } : {}),
        ...(b.quotes ? { real_customer_quotes: opts.dealt ? { rule: DEALT_QUOTE_RULE } : { rule: QUOTE_RULE, quotes: b.quotes } } : {}),
    };
    return Object.keys(out).length ? out : null;
}
export function briefText(b: BrainBrief): string {
    if (briefIsEmpty(b))
        return "";
    const part = (title: string, lines: string[]) => (lines.length ? `${title}\n${lines.map((l) => `- ${l}`).join("\n")}` : "");
    return [
        part("What the brand wins on, most important first:", b.selling_points),
        part("Guardrails:", [b.never_say && `Never say: ${b.never_say}`, b.never_show && `Never show: ${b.never_show}`, b.always && `Always: ${b.always}`].filter((x): x is string => !!x)),
        part("What has worked for this brand:", b.works),
        part("What to avoid:", b.avoid),
        part("What changed lately (a promotion or a product named here is live; one not named may be stale):", b.now),
        part("Against the competitors (state the brand's own advantage; never name a competitor):", b.against ?? []),
        b.quotes ? `Customer quotes. ${QUOTE_RULE}\n${b.quotes.map((q) => `- ${q}`).join("\n") || "- (none recorded)"}` : "",
    ]
        .filter(Boolean)
        .join("\n\n");
}
const cache = new Map<string, {
    at: number;
    revision: string;
    brief: BrainBrief;
}>();
const documentRevision = (brandId: string) => BRAIN_DOCS.map(({ id }) => {
    try {
        const file = brainDocPath(brandId, id);
        const stat = fs.statSync(file, { bigint: true });
        return `${file}:${stat.mtimeNs}:${stat.ctimeNs}:${stat.size}`;
    }
    catch {
        return `${id}:missing`;
    }
}).join("|");
export function brainBrief(brandId: string, opts: {
    compare?: boolean;
    quotes?: boolean;
} = {}): BrainBrief {
    const key = `${brandId}:${opts.compare ? 1 : 0}${opts.quotes ? 1 : 0}`;
    const revision = documentRevision(brandId);
    const hit = cache.get(key);
    if (hit && hit.revision === revision && Date.now() - hit.at < 20000)
        return hit.brief;
    let brief: BrainBrief;
    try {
        brief = buildBrief(readAllDocs(brandId), opts);
    }
    catch {
        brief = { selling_points: [], never_say: "", never_show: "", always: "", works: [], avoid: [], now: [] };
    }
    cache.set(key, { at: Date.now(), revision, brief });
    return brief;
}
export const clearBriefCache = () => cache.clear();
export const COMPARES = /\bcompar|\bversus\b|\bvs\.?(?=\s|$)|\bagainst\b|\bswitch|\balternative|\binstead of\b/i;
export const QUOTES = /customer'?s own words|\breview|\btestimonial|\bquote/i;
export function withBrain<T extends Record<string, unknown>>(brandId: string, block: T, about = "", opts: BriefOptions = {}): T {
    const brief = briefObject(brainBrief(brandId, { compare: COMPARES.test(about), quotes: QUOTES.test(about) }), opts);
    return brief ? { ...block, from_the_brand_brain: brief } : block;
}
