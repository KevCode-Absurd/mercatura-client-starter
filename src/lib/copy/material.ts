import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { brandBrainDir, type BrandBrain } from "../brand-brain";
import { readDoc } from "../brain/docs";
import { fieldsOf, plainText, tableOf } from "../brain/md";
import { namesNeverUsed, noFigures } from "../brand-voice";
import { getBrandRow, listBrands, loadBrandBrain } from "../brands";
import { loadClaimSources } from "../claim-sources";
import { getPersona } from "../personas/store";
import type { PersonaProfile } from "../personas/types";
import { pageSlug, readSiteFolder, type CleanPage } from "../site-pages";
const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const keyOf = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const wordsOf = (s: string) => keyOf(s).split(" ").filter(Boolean);
const firstSentence = (s: string) => clean(plainText(s)).split(/(?<=[.!?])\s+(?=[\p{Lu}\d"“'])/u)[0] ?? "";
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, "").replace(/[,;:]$/, "")}…` : s);
export const SITE_LINE_MIN = 40;
export const SITE_LINE_MAX = 180;
const NOT_DETAIL = /[$£€]\s?\d|\d\s?(?:usd|gbp|eur)\b|\b(?:\d+\s?% off|save \d|discount|coupon|promo code|sale ends|subscribe|subscription|renews?|cancel|checkout|basket|cart|add to|shop now|buy now|learn more|view all|see all|read more|sign up|sign in|log ?in|account|newsletter|e-?mail|shipping|delivery|deliver(?:ed|s)|returns?|refunds?|money[- ]back|guarantee|cookies?|privacy|terms|policy|copyright|all rights reserved|trademark|these statements|not intended to|evaluated by|disclaimer|accessibility|follow us|instagram|tiktok|facebook|reviews?|stars?|rated|out of stock|sold out)\b|[©®|•→›»]/i;
const ABOUT_US = /\b(?:we believe|we(?:'re| are) (?:dedicated|committed|proud|on a mission)|our (?:mission|commitment|promise|values|team|founders?)|this (?:commitment|dedication)|dedication to|paid spokesperson|investor in|manufactur(?:e|ed|ing) in|registered facilit)/i;
const isSentence = (l: string) => /^[^\p{L}\p{N}]*[\p{Lu}\d]/u.test(l) && /(?:^|\s)\p{Ll}{2,}(?=[\s,.!]|$)/u.test(l) && wordsOf(l).length >= 6 && !/\?\s*$/.test(l) && !/^["“'‘]/.test(l);
export function siteDetails(text: string): string[] {
    const out: string[] = [];
    for (const raw of text.split(/\r?\n/)) {
        if (/^#{1,6}\s/.test(raw))
            continue;
        for (const part of clean(raw).split(/(?<=[.!])\s+(?=[\p{Lu}\d])/u)) {
            const line = clean(part);
            if (line.length < SITE_LINE_MIN || line.length > SITE_LINE_MAX || !isSentence(line) || NOT_DETAIL.test(line))
                continue;
            if (noFigures(line) !== line)
                continue;
            if (/[:,;(]\s*$/.test(line) || (line.match(/\(/g) ?? []).length !== (line.match(/\)/g) ?? []).length)
                continue;
            if (/^\*|\*$|https?:|www\./i.test(line) || /["”’']$/.test(line) || ABOUT_US.test(line))
                continue;
            out.push(line);
        }
    }
    return out;
}
const ADDRESS_WORDS = new Set(["products", "product", "pages", "page", "collections", "collection", "shop", "store", "item", "items", "the", "and", "for", "www", "html", "en", "us", "uk"]);
const plainWord = (w: string) => w.normalize("NFD").replace(/[^a-z0-9]/g, "");
function addressWords(slug: string, brandName: string): string[] {
    const brand = new Set(wordsOf(brandName).map(plainWord));
    return wordsOf(slug).map(plainWord).filter((w) => w.length >= 3 && !ADDRESS_WORDS.has(w) && !brand.has(w));
}
function pageMatch(page: {
    slug: string;
}, product: string, brandName: string): number | null {
    const said = addressWords(page.slug, brandName);
    if (!said.length)
        return null;
    const name = new Set(wordsOf(product).map(plainWord));
    return said.filter((w) => name.has(w)).length / said.length;
}
export const mainProductPage = (address: string, brandName: string): boolean => !!address.trim() && addressWords(address, brandName).length === 0;
const interleaved = <T>(lists: T[][]): T[] => Array.from({ length: Math.max(0, ...lists.map((l) => l.length)) }, (_, i) => lists.flatMap((l) => (i < l.length ? [l[i]] : []))).flat();
export function siteDetailPool(brandId: string, productId?: string): {
    page: string;
    line: string;
}[] {
    let brand: BrandBrain | null = null;
    try {
        brand = loadBrandBrain(brandId);
    }
    catch {
        return [];
    }
    let pages: Pick<CleanPage, "slug" | "title" | "heading" | "kind" | "text">[] = [];
    try {
        const row = getBrandRow(brandId);
        pages = (row ? readSiteFolder(brandBrainDir(row.dir)) : null)?.pages ?? [];
    }
    catch {
        pages = [];
    }
    if (!pages.length)
        pages = liftedPages(brandId);
    const product = productId ? brand.products.find((p) => p.id === productId) : undefined;
    const seen = new Set<string>();
    const never = namesNeverUsed(brand);
    const lines = (p: (typeof pages)[number]) => siteDetails(p.text)
        .filter((l) => !never.some((n) => l.toLowerCase().includes(n)))
        .filter((l) => (seen.has(keyOf(l)) ? false : (seen.add(keyOf(l)), true)))
        .map((line) => ({ page: p.slug, line }));
    const usable = pages.filter((p) => p.kind !== "reviews");
    if (!product)
        return interleaved(usable.map(lines));
    const match = (p: (typeof pages)[number]) => (p.kind === "product" ? pageMatch(p, product.name, brand.brand.name) : null);
    const own = usable.filter((p) => (match(p) ?? 0) >= 0.5);
    const general = usable.filter((p) => !own.includes(p) && (p.kind !== "product" || match(p) === null));
    return [...interleaved(own.map(lines)), ...interleaved(general.map(lines))];
}
function liftedPages(brandId: string): Pick<CleanPage, "slug" | "title" | "heading" | "kind" | "text">[] {
    try {
        const by = new Map<string, string[]>();
        for (const c of loadClaimSources(brandId).claims) {
            if (c.origin !== "website" || c.forbidden)
                continue;
            by.set(c.where, [...(by.get(c.where) ?? []), ...c.quote.split(/\n+/)]);
        }
        return [...by.entries()].map(([where, quotes]) => ({ slug: pageSlug(where), title: "", heading: "", kind: /review|testimonial/i.test(where) ? ("reviews" as const) : /product/i.test(where) ? ("product" as const) : ("page" as const), text: quotes.join("\n") }));
    }
    catch {
        return [];
    }
}
export const FACET = {
    problem: "the problem as they live it",
    trigger: "what set them looking",
    wants: "what they want",
    doubt: "what they doubt",
    tried: "what they tried before",
    phrase: "a phrase they use",
    moment: "a moment of their day",
    identity: "how they see themselves",
} as const;
export type FacetKind = (typeof FACET)[keyof typeof FACET];
export type BuyerProfile = Partial<Pick<PersonaProfile, "who" | "identity" | "objections" | "doubts" | "tried" | "sounds_like">>;
function profileOf(brand: BrandBrain, personaId: string): BuyerProfile | null {
    try {
        const rows = listBrands().filter((b) => b.name === brand.brand.name);
        return rows.length === 1 ? (getPersona(rows[0].id, personaId) ?? null) : null;
    }
    catch {
        return null;
    }
}
export function buyerFacets(brand: BrandBrain, personaId: string, profile?: BuyerProfile | null): {
    kind: string;
    text: string;
}[] {
    const p = brand.personas.find((x) => x.id === personaId);
    if (!p)
        return [];
    const more = profile === undefined ? profileOf(brand, personaId) : profile;
    const text = (s: string | undefined) => noFigures(clean(s ?? ""));
    const list = (xs: (string | undefined)[] | undefined) => [...new Set((xs ?? []).map(text).filter(Boolean))];
    const days = clean(p.summary).split(/(?<=[.!?])\s+(?=[\p{Lu}\d])/u).slice(1).filter((s) => !/%|\best\b|\bshare\b|\bintensity\b/i.test(s));
    const sides: [
        FacetKind,
        string[]
    ][] = [
        [FACET.problem, list([p.problem])],
        [FACET.trigger, list([p.trigger])],
        [FACET.wants, list([p.wants])],
        [FACET.doubt, list([...(more?.doubts ?? []).map((d) => d.doubt), ...(more?.objections ?? [])])],
        [FACET.tried, list(more?.tried)],
        [FACET.phrase, list(p.language)],
        [FACET.moment, list([...days, more?.who?.life])],
        [FACET.identity, list([more?.identity])],
    ];
    const seen = new Set<string>();
    return interleaved(sides.map(([kind, texts]) => texts.map((t) => ({ kind: kind as string, text: t })))).filter((f) => (seen.has(keyOf(f.text)) ? false : (seen.add(keyOf(f.text)), true)));
}
const ANGLE_MAX = 200;
const angleLine = (title: string, clause: string) => {
    const t = clean(plainText(title)).replace(/[.:]+$/, "");
    const c = firstSentence(clause).replace(/[.]+$/, "");
    return noFigures(clip([t, c].filter(Boolean).join(": "), ANGLE_MAX));
};
export function anglesInDoc(doc: ReturnType<typeof readDoc>["doc"]): string[] {
    const out: string[] = [];
    for (const s of doc.sections) {
        const fields = fieldsOf(s);
        if (fields.some((f) => /hook|headline/i.test(f.key))) {
            const pick = (re: RegExp) => fields.find((f) => re.test(f.key) && f.value.trim())?.value ?? "";
            const title = s.title.replace(/^ad\s*\d+\s*[:.–-]\s*/i, "");
            const line = angleLine(title, pick(/^angle|^argument/i) || pick(/^why/i) || pick(/^takeaway|^lesson/i));
            if (wordsOf(line).length >= 2)
                out.push(line);
        }
        const table = tableOf(s);
        const col = table?.head.findIndex((h) => /^(angle|argument)/i.test(plainText(h).trim())) ?? -1;
        if (table && col >= 0)
            for (const row of table.rows)
                if (wordsOf(row[col] ?? "").length >= 2)
                    out.push(angleLine(row[col], ""));
    }
    return out;
}
export function ownAdAngles(brandId: string): string[] {
    const out: string[] = [];
    try {
        const d = readDoc(brandId, "winning");
        if (d.exists)
            out.push(...anglesInDoc(d.doc));
    }
    catch {
    }
    try {
        const key = keyOf(loadBrandBrain(brandId).brand.name).normalize("NFD").replace(/[^a-z0-9]/g, "");
        const mine = key ? db.select().from(schema.adReferences).where(and(eq(schema.adReferences.source, "user"), eq(schema.adReferences.added_by_brand, brandId))).orderBy(asc(schema.adReferences.created_at), asc(schema.adReferences.id)).all() : [];
        for (const r of mine) {
            const a = (r.analysis ?? {}) as {
                advertiser?: unknown;
                mechanism?: unknown;
                observations?: unknown;
            };
            const who = keyOf(`${typeof a.advertiser === "string" ? a.advertiser : JSON.stringify(a.advertiser ?? "")} ${r.title}`).normalize("NFD").replace(/[^a-z0-9]/g, "");
            if (!who.includes(key))
                continue;
            const clause = [r.notes, a.mechanism, a.observations].find((x): x is string => typeof x === "string" && x.trim().length > 0) ?? [...(r.tags?.approach ?? []), ...(r.tags?.hook ?? [])].join(", ");
            const line = angleLine(r.title, clause);
            if (wordsOf(line).length >= 2)
                out.push(line);
        }
    }
    catch {
    }
    const seen = new Set<string>();
    return out.filter((l) => wordsOf(l).length >= 5).filter((l) => (seen.has(keyOf(l)) ? false : (seen.add(keyOf(l)), true)));
}
