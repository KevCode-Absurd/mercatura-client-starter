import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { StudioItem, StudioRunRow } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import { QUOTES as SHOWS_A_QUOTE } from "../brain/brief";
import { brandLinePool, type Surface } from "../brand-voice";
import { isWholeBrand } from "../choices";
import { FACET, buyerFacets, ownAdAngles, siteDetailPool } from "../copy/material";
import { dealSeeds } from "../copy/seeds";
import { recentTexts, spentFor, worldFor } from "../copy/spent";
import { TYPE_BEAT } from "../taxonomy";
import { researchRowsFor } from "./checks";
import { deckStart, rng, shuffled } from "./deal";
import { ledWith } from "./figures";
import { and } from "drizzle-orm";
import { customerVoice } from "../customer-voice";
import { buyerId } from "./set-checks";
import { stageFor } from "./taste";
export interface DealtItem {
    id: string;
    about: string;
    buyer?: string | null;
    cold?: boolean;
    quotes?: boolean;
}
export interface DealtHand {
    theme?: {
        id: string;
        label: string;
    };
    quotes: {
        quote: string;
        source: string;
    }[];
    lines: string[];
    site?: {
        page: string;
        line: string;
    };
    facet?: {
        kind: string;
        text: string;
    };
    angle?: string;
    wayIn?: string;
}
export interface MaterialPools {
    lines: string[];
    site: {
        page: string;
        line: string;
    }[];
    angles: string[];
    facets: (personaId: string) => {
        kind: string;
        text: string;
    }[];
    props: string[];
    barred: string[];
    notProof: string[];
}
const STRIDE = 13;
const fit = <T>(list: T[]): T[] => (list.length > 1 && list.length % STRIDE === 0 ? list.slice(0, -1) : list);
const quiet = <T>(read: () => T, none: T): T => {
    try {
        return read();
    }
    catch {
        return none;
    }
};
const wordCount = (s: string) => (s.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) ?? []).length;
const showsTone = (line: string) => wordCount(line) >= 3;
const brandsOwn = (line: string) => !/^\s*\*/.test(line) && !/^\s*(?:I|I['’](?:m|ve|d|ll)|My)\b/.test(line) && !/[”"]\s*$/.test(line);
export function materialPools(brandId: string, brand: BrandBrain, surfaces: Surface[], productId?: string): MaterialPools {
    const facets = new Map<string, {
        kind: string;
        text: string;
    }[]>();
    const themes = quiet(() => db.select({ id: schema.themes.id, type: schema.themes.type }).from(schema.themes).where(eq(schema.themes.brand_id, brandId)).all(), []);
    return {
        lines: fit(shuffled(quiet(() => brandLinePool(brandId, surfaces, brand), []).filter(showsTone), rng(`${brandId}:lines`))),
        site: fit(quiet(() => siteDetailPool(brandId, productId), []).filter((s) => brandsOwn(s.line))),
        angles: fit(quiet(() => ownAdAngles(brandId), [])),
        facets: (personaId) => {
            if (!facets.has(personaId))
                facets.set(personaId, fit(quiet(() => buyerFacets(brand, personaId), [])));
            return facets.get(personaId)!;
        },
        props: quiet(() => worldFor(brandId).props, []),
        barred: themes.filter((t) => TYPE_BEAT[t.type] === "guardrail").map((t) => t.id),
        notProof: themes.filter((t) => TYPE_BEAT[t.type] !== "proof" && TYPE_BEAT[t.type] !== "guardrail").map((t) => t.id),
    };
}
function take<T>(list: T[], pos: number, used: Set<number>): T | undefined {
    if (!list.length)
        return undefined;
    if (used.size >= list.length)
        used.clear();
    let i = ((pos % list.length) + list.length) % list.length;
    while (used.has(i))
        i = (i + 1) % list.length;
    used.add(i);
    return list[i];
}
const QUOTES = 3;
export function dealMaterial(from: {
    brandId: string;
    runId: string;
    items: DealtItem[];
    pools: MaterialPools;
}): DealtHand[] {
    const { brandId, items, pools } = from;
    const start = deckStart(from.runId);
    const setNumber = start / STRIDE;
    const n = items.length;
    const ways = (selling: boolean) => quiet(() => dealSeeds({ count: n + 24, seed: brandId, start, selling, props: pools.props }).map((s) => s.wayIn), [] as string[]);
    const cold = items.some((i) => i.cold) ? ways(false) : [];
    const warm = items.some((i) => !i.cold) ? ways(true) : [];
    const saidWays = new Set<string>();
    const used = { lines: new Set<number>(), site: new Set<number>(), angles: new Set<number>() };
    const usedFacets = new Map<string, Set<number>>();
    let taken: string[] = [];
    let round = 0;
    const themeFor = (about: string, proofOnly: boolean) => {
        const read = (more: string[] = []) => quiet(() => researchRowsFor(brandId, about, { skip: [...pools.barred, ...more, ...taken], offset: QUOTES * (setNumber + round), themes: 1, quotes: QUOTES })[0], undefined);
        let row = (proofOnly ? read(pools.notProof) : undefined) ?? read();
        if (!row && taken.length) {
            taken = [];
            round++;
            row = (proofOnly ? read(pools.notProof) : undefined) ?? read();
        }
        if (row)
            taken.push(row.id);
        return row;
    };
    return items.map((item, k): DealtHand => {
        const pos = start + k;
        const row = themeFor(item.about, !!item.quotes);
        const deck = item.cold ? cold : warm;
        const wayIn = deck.slice(k).find((w) => !saidWays.has(w)) ?? deck[k];
        if (wayIn)
            saidWays.add(wayIn);
        const sides = item.buyer ? pools.facets(item.buyer) : [];
        if (item.buyer && !usedFacets.has(item.buyer))
            usedFacets.set(item.buyer, new Set());
        return {
            ...(row ? { theme: { id: row.id, label: row.label } } : {}),
            quotes: row?.sourced.filter((q) => q.quote.trim()) ?? [],
            lines: [take(pools.lines, 2 * pos, used.lines), pools.lines.length > 1 ? take(pools.lines, 2 * pos + 1, used.lines) : undefined].filter((x): x is string => !!x),
            site: take(pools.site, pos, used.site),
            ...(item.buyer ? { facet: take(sides, pos, usedFacets.get(item.buyer)!) } : {}),
            angle: take(pools.angles, pos, used.angles),
            ...(wayIn ? { wayIn } : {}),
        };
    });
}
const NOT_SAID = /quote|review|testimonial|attribution|cta|button|price|offer|guarantee|deal|discount/i;
const PLACEHOLDER = /\[[^\]]+\]/;
const clip = (s: string, max = 70) => (s.length > max ? s.slice(0, max).replace(/\s+\S*$/, "") : s);
export function ownLines(texts: {
    role?: string;
    text: string;
}[] | undefined): string[] {
    const own = (texts ?? []).filter((t) => t.text.trim() && !NOT_SAID.test(t.role ?? "") && !PLACEHOLDER.test(t.text));
    return [...own.filter((t) => t.role === "headline"), ...own.filter((t) => t.role !== "headline")].map((t) => t.text.replace(/\s+/g, " ").trim());
}
export const saidOn = (texts: {
    role?: string;
    text: string;
}[] | undefined): string[] => ownLines(texts).map((t) => clip(t));
export const SAID_MOST = 12;
export function siblingPhrases(o: {
    first?: string[];
    others?: string[];
    spent?: string[];
    most?: number;
}): string[] {
    const seen = new Set<string>();
    return [...(o.first ?? []), ...(o.others ?? []), ...(o.spent ?? [])]
        .map((x) => x.replace(/\s+/g, " ").trim())
        .filter((x) => x && !seen.has(x.toLowerCase()) && (seen.add(x.toLowerCase()), true))
        .slice(0, Math.max(1, o.most ?? SAID_MOST));
}
const said = (s: string) => `"${s.replace(/"/g, "'")}"`;
export const saidLine = (phrases: string[]): string => (phrases.length ? `Other ads of this set and the brand's recent ads already say: ${phrases.map(said).join(", ")}. No ad below reuses any of them.` : "");
export const LED_MOST = 8;
export const ledByOthers = (items: Pick<StudioItem, "id" | "plan" | "copy_draft">[], itemId: string, unwritten: (id: string) => boolean = () => false): string[] => [...new Set(items.filter((x) => x.id !== itemId).flatMap((x) => ledWith(x.plan?.text_elements.length ? x.plan.text_elements : unwritten(x.id) ? [] : layerTexts(x.copy_draft))))].slice(0, LED_MOST);
export function quotesOnFile(brandId: string, brand?: Pick<BrandBrain, "personas">): string[] {
    let rows: string[] = [];
    try {
        rows = db.select({ quote: schema.insights.quote }).from(schema.insights).where(and(eq(schema.insights.brand_id, brandId), customerVoice)).all().map((r) => r.quote);
    }
    catch {
    }
    return [...rows, ...(brand?.personas ?? []).flatMap((p) => p.language ?? [])].filter((q) => q.trim());
}
export const ledLine = (led: string[]): string => (led.length ? `Already the headline of another ad: ${led.join("; ")}. Open on another proof. An offer's terms may still stand as a small line.` : "");
const sourceOf = (s: string) => s.replace(/_/g, " ").trim();
const plain = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").replace(/\s+/g, " ").trim();
export function dealtBlock(hand: DealtHand | undefined, o: {
    siblings?: string[];
    themeId?: boolean;
    led?: string[];
} = {}): string {
    const h = hand ?? { quotes: [], lines: [] };
    const site = h.site ? plain(h.site.line.replace(/\*+\s*$/, "")) : "";
    const lines = [
        h.theme && h.quotes.length ? `- Customers on "${plain(h.theme.label)}"${o.themeId ? ` (theme ${h.theme.id})` : ""}: ${h.quotes.map((q) => `${said(q.quote)}${q.source ? ` (${sourceOf(q.source)})` : ""}`).join(" / ")}` : "",
        h.lines.length ? `- ${h.lines.length === 1 ? "A line" : `${h.lines.length} lines`} this brand has published. ${h.lines.length === 1 ? "It shows" : "They show"} how it sounds; write nothing that repeats ${h.lines.length === 1 ? "it or lightly changes it" : "them or lightly changes them"}: ${h.lines.map(said).join(" / ")}` : "",
        site ? `- From the brand's site (${h.site!.page}): ${said(site)}${/[.!?]$/.test(site) ? "" : "."} A detail this ad may build on, in its own words.` : "",
        h.facet ? `- This buyer, from this side: ${h.facet.kind}: ${plain(h.facet.text)}${h.facet.kind === FACET.phrase ? " (for the phrasing of your own line; never shown as a review)" : ""}` : "",
        h.angle ? `- How one of the brand's own ads made its case. The logic is yours to borrow where it fits this buyer, never the words: ${plain(h.angle)}` : "",
        h.wayIn ? `- Way in: ${h.wayIn}` : "",
        o.siblings?.length ? `- Other ads already say: ${o.siblings.map(said).join(", ")}. Reuse none of them.` : "",
        o.led?.length ? `- ${ledLine(o.led)}` : "",
    ].filter(Boolean);
    return lines.length ? `Dealt to this ad's words, so the set does not say 1 thing many times:\n${lines.join("\n")}` : "";
}
type DealtSet = Pick<StudioRunRow, "id" | "brand_id" | "product_id" | "kind" | "notes" | "items" | "context">;
export const OWN_MATERIAL_RULE = "- Each ad has its own material, dealt under its item. Write from the lines dealt to it and its buyer's moment. A phrase the brand has published is evidence of tone and is never reused, whole or in part. A product count is stated only where it is this ad's argument, never to fill a line.";
export const poolsOfSet = (run: Pick<DealtSet, "brand_id" | "product_id" | "kind" | "context">, brand: BrandBrain): MaterialPools => materialPools(run.brand_id, brand, run.kind === "ad" && run.context.feed_copy !== false ? ["on_image", "headline", "primary_text"] : ["on_image", "headline"], isWholeBrand(run.product_id) ? undefined : run.product_id);
export function buyerOfAd(run: Pick<DealtSet, "notes">, it: Pick<StudioItem, "direction" | "plan">, brand: BrandBrain, planned: boolean): string | undefined {
    const named = (text: string) => brand.personas.filter((p) => text.includes(p.id)).map((p) => p.id);
    if (named(`${it.direction}`).length === 1)
        return named(`${it.direction}`)[0];
    const own = planned && it.plan?.buyer ? buyerId(it.plan.buyer, brand) : "";
    if (own && brand.personas.some((p) => p.id === own))
        return own;
    return named(`${run.notes}`).length === 1 ? named(`${run.notes}`)[0] : undefined;
}
export function handsOfSet(run: DealtSet, brand: BrandBrain, pools: MaterialPools, planned: boolean): DealtHand[] {
    return dealMaterial({
        brandId: run.brand_id,
        runId: run.id,
        pools,
        items: run.items.map((it) => ({ id: it.id, about: `${it.label} ${it.direction}${run.context.sprint ? "" : ` ${run.notes}`}`, buyer: buyerOfAd(run, it, brand, planned), cold: ["unaware", "problem_aware"].includes(stageFor(run, { ...it, plan: undefined }) ?? ""), quotes: SHOWS_A_QUOTE.test(`${it.label} ${it.type}`) })),
    });
}
export const layerTexts = (copy: {
    headline?: string;
    body?: string;
} | null | undefined): {
    role: string;
    text: string;
}[] => [{ role: "headline", text: copy?.headline ?? "" }, { role: "subhead", text: copy?.body ?? "" }].filter((t) => t.text.trim());
export const saidByOthers = (items: Pick<StudioItem, "id" | "plan" | "copy_draft">[], itemId: string, unwritten: (id: string) => boolean = () => false): string[] => items.filter((x) => x.id !== itemId).flatMap((x) => saidOn([...(x.plan?.text_elements ?? []), ...(unwritten(x.id) ? [] : layerTexts(x.copy_draft))]));
export function spentOnPictures(brandId: string, brand: BrandBrain): string[] {
    try {
        return spentFor(brandId, brand, [], recentTexts(brandId, 60, { surfaces: ["picture"] }));
    }
    catch {
        return [];
    }
}
