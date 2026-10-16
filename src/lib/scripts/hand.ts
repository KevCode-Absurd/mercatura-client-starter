import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ScriptAxes } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import { brandLinePool, noFigures, type Surface } from "../brand-voice";
import { buyerFacets, siteDetailPool } from "../copy/material";
import { dealSeeds, rotated, spentLine, spentPhrases } from "../copy/seeds";
import { owedText, worldFor } from "../copy/spent";
import { isStoryStage } from "../copy/stage";
import { isBrandSource, type AwarenessStage, type InsightType } from "../taxonomy";
const QUOTE_DECK = 8;
const THEME_DECK = 8;
const LAST_SCRIPTS = 40;
const LAST_THEMES = 12;
const OPENINGS = 10;
const SPENT = 10;
export const LAST_AXES = 12;
export interface DealtQuote {
    quote: string;
    source: string;
}
export interface DealtFind {
    id: string;
    label: string;
    quotes: DealtQuote[];
}
export interface ScriptHand {
    n: number;
    moment: string;
    place: string;
    witness: string;
    wayIn: string;
    finds: DealtFind[];
    brandLines: string[];
    site: {
        page: string;
        line: string;
    } | null;
    facet: {
        kind: string;
        text: string;
    } | null;
    openings: string[];
    spent: string[];
}
export function scriptNumber(brandId: string, turn = 0, before?: string | null): number {
    try {
        const where = before ? and(eq(schema.scripts.brand_id, brandId), lt(schema.scripts.created_at, before)) : eq(schema.scripts.brand_id, brandId);
        return (db.select({ c: sql<number> `count(*)` }).from(schema.scripts).where(where).get()?.c ?? 0) + Math.max(0, Math.round(turn) || 0);
    }
    catch {
        return Math.max(0, Math.round(turn) || 0);
    }
}
export const numberOfScript = (id: string | null | undefined): number => Number(String(id ?? "").match(/\d+$/)?.[0] ?? 0);
function lastScripts(brandId: string, cap: number, before?: string | null) {
    try {
        const where = before ? and(eq(schema.scripts.brand_id, brandId), lt(schema.scripts.created_at, before)) : eq(schema.scripts.brand_id, brandId);
        return db
            .select({ id: schema.scripts.id, stage: schema.scripts.awareness_stage, axes: schema.scripts.axes, theme_ids: schema.scripts.theme_ids, lines: schema.scripts.lines, hooks: schema.scripts.hook_variants, notes: schema.scripts.notes, concept_id: schema.scripts.concept_id })
            .from(schema.scripts)
            .where(where)
            .orderBy(desc(schema.scripts.created_at), desc(schema.scripts.id))
            .limit(cap)
            .all();
    }
    catch {
        return [];
    }
}
export function recentAxes(brandId: string, stage: AwarenessStage | string, conceptId?: string | null): ScriptAxes[] {
    try {
        const row = { id: schema.scripts.id, axes: schema.scripts.axes };
        const last = db.select(row).from(schema.scripts).where(and(eq(schema.scripts.brand_id, brandId), eq(schema.scripts.awareness_stage, stage as AwarenessStage))).orderBy(desc(schema.scripts.created_at), desc(schema.scripts.id)).limit(LAST_AXES).all();
        const own = conceptId ? db.select(row).from(schema.scripts).where(eq(schema.scripts.concept_id, conceptId)).all().filter((s) => !last.some((l) => l.id === s.id)) : [];
        return [...last, ...own].map((s) => s.axes);
    }
    catch {
        return [];
    }
}
export function pickQuotes<Q extends {
    source: string;
}>(ranked: Q[], n: number, count: number): Q[] {
    const deck = rotated(ranked.slice(0, QUOTE_DECK), Math.max(0, n));
    const out: Q[] = [];
    while (out.length < count && out.length < deck.length) {
        const kinds = new Set(out.map((q) => q.source));
        out.push(deck.find((q) => !out.includes(q) && !kinds.has(q.source)) ?? deck.find((q) => !out.includes(q))!);
    }
    return out;
}
const LIVED: InsightType[] = ["accommodation", "trigger_moment", "failed_solution", "buyer_word", "desire"];
const SMALL = new Set("that this with from have they their them there what when where which while your yours about into just more most much some such than then very will would could should been were does doing each every other after before because being also only over under again still even like really".split(" "));
const wordsOf = (s: string): Set<string> => new Set((s.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !SMALL.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/, "")));
const THEME_NOTE = "From the research it was given: ";
const themesInNotes = (notes: string | null | undefined): string[] => (notes ?? "").split(/\r?\n/).filter((l) => l.startsWith(THEME_NOTE)).flatMap((l) => [...l.slice(THEME_NOTE.length).matchAll(/"([^"]+)"/g)].map((m) => m[1]));
function dealFinds(brandId: string, n: number, o: {
    stage: AwarenessStage;
    personaId?: string | null;
    about: string;
    own: string[];
    lately: {
        ids: Set<string>;
        labels: Set<string>;
    };
}): DealtFind[] {
    let themes: {
        id: string;
        type: InsightType;
        label: string;
        summary: string;
        beat: string;
        rank: number;
        personas: string[];
    }[];
    let rows: {
        theme_id: string | null;
        quote: string;
        source: string;
        intensity: number;
    }[];
    try {
        themes = db.select({ id: schema.themes.id, type: schema.themes.type, label: schema.themes.label, summary: schema.themes.summary, beat: schema.themes.beat, rank: schema.themes.rank, personas: schema.themes.personas }).from(schema.themes).where(eq(schema.themes.brand_id, brandId)).all();
        rows = db.select({ theme_id: schema.insights.theme_id, quote: schema.insights.quote, source: schema.insights.source_type, intensity: schema.insights.intensity }).from(schema.insights).where(eq(schema.insights.brand_id, brandId)).orderBy(desc(schema.insights.intensity), asc(schema.insights.id)).all();
    }
    catch {
        return [];
    }
    const quotesOf = new Map<string, DealtQuote[]>();
    for (const r of rows)
        if (r.theme_id && !isBrandSource(r.source) && r.quote.trim())
            quotesOf.set(r.theme_id, [...(quotesOf.get(r.theme_id) ?? []), { quote: r.quote, source: r.source }]);
    const about = wordsOf(o.about);
    const story = isStoryStage(o.stage);
    const ranked = themes
        .filter((t) => t.beat !== "guardrail" && quotesOf.has(t.id) && !o.own.includes(t.id))
        .map((t) => ({ t, fits: !story || LIVED.includes(t.type) ? 1 : 0, mine: o.personaId && (t.personas ?? []).includes(o.personaId) ? 1 : 0, near: [...wordsOf(`${t.label} ${t.summary}`)].filter((w) => about.has(w)).length }))
        .sort((a, b) => b.fits - a.fits || b.mine - a.mine || b.near - a.near || a.t.rank - b.t.rank || a.t.id.localeCompare(b.t.id));
    if (!ranked.length)
        return [];
    const pool = ranked.some((x) => x.fits) ? ranked.filter((x) => x.fits) : ranked;
    const fresh = pool.filter((x) => !o.lately.ids.has(x.t.id) && !o.lately.labels.has(x.t.label));
    const deck = (fresh.length ? fresh : pool).slice(0, THEME_DECK);
    const first = deck[n % deck.length].t;
    const finds: DealtFind[] = [{ id: first.id, label: first.label, quotes: pickQuotes(quotesOf.get(first.id)!, n, 2) }];
    const second = deck[(n + 1) % deck.length].t;
    if (finds[0].quotes.length < 2 && second.id !== first.id)
        finds.push({ id: second.id, label: second.label, quotes: pickQuotes(quotesOf.get(second.id)!, n, 1) });
    return finds;
}
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const LINE_SURFACES: Surface[] = ["script", "headline", "primary_text", "site"];
const opening = (text: string): string => {
    const t = oneLine(text);
    return t.length <= 70 ? t : t.slice(0, 70).replace(/\s+\S*$/, "").trim();
};
const GLUE = new Set("a an the and or but so to of in on at for with from by as is are was were be been it its it's this that these those there there's here you you're you've you'll your i i'm i've my we our they them their he she his her not no do does did don't doesn't didn't have has had more most than then too very just some any all got get gets can can't will won't would could what when where who why how up out about into over once also still even really one".split(" "));
const carries = (phrase: string): boolean => phrase.split(" ").filter((w) => !GLUE.has(w)).length >= 2;
const safely = <T>(read: () => T[]): T[] => {
    try {
        return read() ?? [];
    }
    catch {
        return [];
    }
};
export interface HandInput {
    brandId: string;
    brand: BrandBrain;
    stage: AwarenessStage;
    turn?: number | null;
    n?: number;
    personaId?: string | null;
    productId?: string | null;
    about?: string;
    ownThemes?: string[];
    before?: string | null;
}
export function dealHand(i: HandInput): ScriptHand {
    const n = Math.max(0, Math.round(i.n ?? scriptNumber(i.brandId, i.turn ?? 0, i.before)));
    const last = lastScripts(i.brandId, LAST_SCRIPTS, i.before);
    const firsts = last.map((s) => opening(s.lines?.[0]?.text ?? "")).filter(Boolean);
    const openings = firsts.filter((o, k) => firsts.findIndex((x) => x.toLowerCase() === o.toLowerCase()) === k).slice(0, OPENINGS);
    const texts = last.map((s) => [...(s.lines ?? []).map((l) => l.text), ...(s.hooks ?? []).map((h) => h.text)].join("\n")).filter((t) => t.trim());
    const spent = safely(() => spentPhrases(texts, owedText(i.brand), { names: [i.brand.brand.name, ...i.brand.products.map((p) => p.name)], max: 2 * SPENT }).filter(carries).slice(0, SPENT));
    const seed = dealSeeds({ count: 1, seed: i.brandId, start: n, ...worldFor(i.brandId), spent, selling: !isStoryStage(i.stage) })[0];
    const given = last.slice(0, LAST_THEMES);
    const finds = dealFinds(i.brandId, n, { stage: i.stage, personaId: i.personaId, about: i.about ?? "", own: i.ownThemes ?? [], lately: { ids: new Set(given.flatMap((s) => s.theme_ids ?? [])), labels: new Set(given.flatMap((s) => themesInNotes(s.notes))) } });
    const lines = safely(() => brandLinePool(i.brandId, LINE_SURFACES, i.brand));
    const site = safely(() => siteDetailPool(i.brandId, i.productId ?? undefined));
    const facets = i.personaId ? safely(() => buyerFacets(i.brand, i.personaId!)) : [];
    return {
        n,
        moment: seed.moment,
        place: seed.place,
        witness: seed.witness,
        wayIn: seed.wayIn,
        finds,
        brandLines: rotated(lines, 2 * n).slice(0, 2).map((l) => noFigures(oneLine(l))),
        site: site.length ? rotated(site, n)[0] : null,
        facet: facets.length ? rotated(facets, n)[0] : null,
        openings,
        spent,
    };
}
const said = (s: string) => `"${oneLine(s).replace(/"/g, "'")}"`;
const inLine = (s: string) => s.replace(/^(A|An|The|In|On|At|By|With|Near|Inside|Outside)\b/, (w) => w.toLowerCase());
export function handBlock(h: ScriptHand): string {
    return [
        "## Where this ad starts",
        `When and where: ${h.moment}, ${inLine(h.place)}. Who else is there: ${inLine(h.witness)}. The way in: ${h.wayIn}.`,
        "The details are yours: make the scene real, change any part that could not be true of this buyer, and take the story wherever it goes. Where the idea above names a scene, this is where it is told from.",
        ...h.finds.filter((f) => f.quotes.length).map((f, k) => `${k ? "And" : "From the research, for this ad"}: "${f.label}"\n   ${f.quotes.map((q) => `${said(q.quote.slice(0, 240))} (${q.source})`).join("   ")}`),
        h.brandLines.length > 1 ? `Two things the brand has said in public, for its words for things. Say neither: ${h.brandLines.map(said).join(" / ")}` : h.brandLines.length ? `Something the brand has said in public, for its words for things. Do not say it: ${said(h.brandLines[0])}` : "",
        h.site ? `From the brand's site (${oneLine(h.site.page)}): ${said(oneLine(h.site.line).replace(/\.$/, ""))}. A detail this ad may build on, in its own words.` : "",
        h.facet ? `This buyer, from this side: ${oneLine(h.facet.kind)}: ${oneLine(h.facet.text)}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}
export function usedBlock(h: Pick<ScriptHand, "openings" | "spent">): string {
    if (!h.openings.length && !h.spent.length)
        return "";
    return ["## Already used by this brand's last scripts", h.openings.length ? `They open like this. Start with none of them, and not on the same object or moment:\n${h.openings.map((o) => `- ${said(o)}`).join("\n")}` : "", spentLine(h.spent)].filter(Boolean).join("\n");
}
const PLACE_NOTE = "Starts in: ";
export const handNotes = (h: ScriptHand): string[] => [`${PLACE_NOTE}${h.place}`, h.finds.length ? `${THEME_NOTE}${h.finds.map((f) => `"${f.label.replace(/"/g, "'")}"`).join(", ")}` : ""].filter(Boolean);
export const startsInFromNotes = (notes: string | null | undefined): string => (notes ?? "").split(/\r?\n/).find((l) => l.startsWith(PLACE_NOTE))?.slice(PLACE_NOTE.length).trim() ?? "";
