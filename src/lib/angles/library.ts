import type { AngleStatus } from "@/db/schema";
import { CUSTOMER_SOURCES, JOB_INFO, JOBS, SOURCE_INFO, TYPE_JOB, type InsightType, type Job, type SourceType } from "../taxonomy";
export interface LibraryInsight {
    id: string;
    source_item_id: string;
    source_type: SourceType;
    type: InsightType;
    quote: string;
    intensity: number;
    persona_id: string | null;
    job: Job | null;
}
export interface LibraryTheme {
    id: string;
    type: InsightType;
    label: string;
    summary: string;
    rank: number;
    score: number;
    insight_ids: string[];
    newest_date: string | null;
    created_at: string;
    angle_status: AngleStatus;
    angle_notes: string;
    angle_id: string | null;
}
export interface LibraryItem {
    id: string;
    source_type: SourceType;
    date: string | null;
    external_id: string | null;
    product?: string | null;
    verified?: boolean | null;
    incentivised?: boolean | null;
}
export interface AngleAsset {
    kind: "concept" | "script" | "angle";
    id: string;
    title: string;
}
export interface AngleQuote {
    quote: string;
    ref: string;
    item_id: string;
    source_type: SourceType;
    verified: boolean | null;
    incentivised: boolean;
}
export type Covered = "yes" | "partly" | "no" | "unknown";
export interface MinedAngle {
    theme_id: string;
    label: string;
    summary: string;
    job: Job;
    job_guessed: boolean;
    frequency: number;
    share: number;
    thin: boolean;
    best: AngleQuote;
    backups: AngleQuote[];
    audience: string[];
    product: string | null;
    covered: Covered;
    status: AngleStatus;
    notes: string;
    angle_id: string | null;
    sources: SourceType[];
    newest: string | null;
    fading: boolean;
    fresh: boolean;
    assets: AngleAsset[];
    insight_rank: number;
    rank: number;
}
export interface AngleLibrary {
    angles: MinedAngle[];
    blind_spots: MinedAngle[];
    objections: MinedAngle[];
    corpus: {
        items: number;
        by_type: Partial<Record<SourceType, number>>;
        reviews: {
            verified: number;
            incentivised: number;
        };
    };
    enough: boolean;
    site_read: boolean;
}
export const ENOUGH_SOURCES = 150;
export const BLIND_SPOT_SHARE = 0.05;
export const THIN_BELOW = 3;
const FADING_DAYS = 90;
const FRESH_DAYS = 30;
const CUSTOMER = new Set<string>(CUSTOMER_SOURCES);
const STOP = new Set(["that", "this", "with", "have", "from", "they", "them", "their", "what", "when", "then", "than", "were", "been", "your", "about", "just", "like", "into", "over", "some", "more", "very", "much", "really", "would", "could", "there", "which", "because", "after", "before", "also", "only", "even", "still", "does", "didn", "don", "doesn", "wasn", "isn", "it's", "i've", "i'm", "you're", "we're"]);
export function contentWords(text: string): string[] {
    return [...new Set(text.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w)))];
}
export function coveredBy(site: string, phrase: string, label: string): Covered {
    if (!site.trim())
        return "unknown";
    const words = contentWords(`${label} ${phrase}`);
    if (!words.length)
        return "unknown";
    const text = site.toLowerCase();
    const hit = words.filter((w) => text.includes(w)).length / words.length;
    return hit >= 0.6 ? "yes" : hit >= 0.3 ? "partly" : "no";
}
export function refOf(item: LibraryItem, ordinal: number): string {
    const letter = SOURCE_INFO[item.source_type].short;
    const own = item.external_id?.trim();
    if (own && /^[A-Za-z]{0,3}[-_ ]?\d{1,6}$/.test(own))
        return `${letter}-${own.replace(/^[A-Za-z]*[-_ ]?/, "").padStart(3, "0")}`;
    return `${letter}-${String(ordinal).padStart(3, "0")}`;
}
export function jobOfTheme(type: InsightType, jobs: (Job | null)[]): {
    job: Job;
    guessed: boolean;
} {
    const counts = new Map<Job, number>();
    for (const j of jobs)
        if (j)
            counts.set(j, (counts.get(j) ?? 0) + 1);
    let best: Job | null = null;
    for (const j of JOBS)
        if ((counts.get(j) ?? 0) > (best ? counts.get(best)! : 0))
            best = j;
    return best ? { job: best, guessed: false } : { job: TYPE_JOB[type], guessed: true };
}
const daysBetween = (a: string, b: Date) => (b.getTime() - new Date(a).getTime()) / 86400000;
export interface LibraryInput {
    themes: LibraryTheme[];
    insights: LibraryInsight[];
    items: LibraryItem[];
    personas: {
        id: string;
        name: string;
    }[];
    site: string;
    assets?: Record<string, AngleAsset[]>;
    now?: Date;
}
export function buildAngleLibrary(input: LibraryInput): AngleLibrary {
    const now = input.now ?? new Date();
    const items = input.items.filter((i) => CUSTOMER.has(i.source_type));
    const itemById = new Map(items.map((i) => [i.id, i]));
    const personaName = new Map(input.personas.map((p) => [p.id, p.name]));
    const ordinal = new Map<string, number>();
    for (const t of CUSTOMER_SOURCES) {
        const ofType = items.filter((i) => i.source_type === t).sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.id.localeCompare(b.id));
        ofType.forEach((i, n) => ordinal.set(i.id, n + 1));
    }
    const quoteOf = (ins: LibraryInsight): AngleQuote | null => {
        const item = itemById.get(ins.source_item_id);
        if (!item)
            return null;
        return { quote: ins.quote, ref: refOf(item, ordinal.get(item.id) ?? 0), item_id: item.id, source_type: item.source_type, verified: item.source_type === "review" ? (item.verified ?? null) : null, incentivised: !!item.incentivised };
    };
    const insightById = new Map(input.insights.map((i) => [i.id, i]));
    const corpus = items.length;
    const angles: MinedAngle[] = [];
    for (const t of input.themes) {
        const members = t.insight_ids.map((id) => insightById.get(id)).filter((i): i is LibraryInsight => !!i && CUSTOMER.has(i.source_type) && itemById.has(i.source_item_id));
        if (!members.length)
            continue;
        const { job, guessed } = jobOfTheme(t.type, members.map((m) => m.job));
        const sorted = [...members].sort((a, b) => {
            const ia = itemById.get(a.source_item_id)!;
            const ib = itemById.get(b.source_item_id)!;
            return Number(!!ia.incentivised) - Number(!!ib.incentivised) || b.intensity - a.intensity || Number(ib.verified ?? false) - Number(ia.verified ?? false) || b.quote.length - a.quote.length;
        });
        const best = quoteOf(sorted[0]);
        if (!best)
            continue;
        const backups: AngleQuote[] = [];
        const used = new Set([best.item_id]);
        for (const m of sorted.slice(1)) {
            if (used.has(m.source_item_id))
                continue;
            const q = quoteOf(m);
            if (!q)
                continue;
            backups.push(q);
            used.add(m.source_item_id);
            if (backups.length === 3)
                break;
        }
        const itemIds = new Set(members.map((m) => m.source_item_id));
        const frequency = itemIds.size;
        const products = new Map<string, number>();
        for (const id of itemIds) {
            const p = itemById.get(id)?.product;
            if (p)
                products.set(p, (products.get(p) ?? 0) + 1);
        }
        const product = [...products.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        const audience = [...new Set(members.map((m) => m.persona_id).filter((p): p is string => !!p))].map((p) => personaName.get(p) ?? p).sort();
        const sources = [...new Set(members.map((m) => m.source_type))].sort((a, b) => CUSTOMER_SOURCES.indexOf(a as never) - CUSTOMER_SOURCES.indexOf(b as never));
        angles.push({
            theme_id: t.id,
            label: t.label,
            summary: t.summary,
            job,
            job_guessed: guessed,
            frequency,
            share: corpus ? frequency / corpus : 0,
            thin: frequency < THIN_BELOW,
            best,
            backups,
            audience,
            product,
            covered: coveredBy(input.site, best.quote, t.label),
            status: t.angle_status,
            notes: t.angle_notes,
            angle_id: t.angle_id,
            sources,
            newest: t.newest_date,
            fading: !!t.newest_date && daysBetween(t.newest_date, now) > FADING_DAYS,
            fresh: daysBetween(t.created_at, now) <= FRESH_DAYS,
            assets: input.assets?.[t.id] ?? [],
            insight_rank: t.rank,
            rank: 0,
        });
    }
    angles.sort((a, b) => b.frequency - a.frequency || a.insight_rank - b.insight_rank);
    angles.forEach((a, n) => (a.rank = n + 1));
    const byType: Partial<Record<SourceType, number>> = {};
    for (const i of items)
        byType[i.source_type] = (byType[i.source_type] ?? 0) + 1;
    const reviews = items.filter((i) => i.source_type === "review");
    return {
        angles,
        blind_spots: angles.filter((a) => a.share >= BLIND_SPOT_SHARE && a.covered === "no" && !a.thin),
        objections: angles.filter((a) => a.job === "objection" || a.job === "complaint"),
        corpus: { items: corpus, by_type: byType, reviews: { verified: reviews.filter((r) => r.verified).length, incentivised: reviews.filter((r) => r.incentivised).length } },
        enough: corpus >= ENOUGH_SOURCES,
        site_read: !!input.site.trim(),
    };
}
export function stagesForJob(job: Job): ("unaware" | "problem_aware" | "solution_aware" | "product_aware" | "most_aware")[] {
    switch (job) {
        case "identity":
        case "trigger":
        case "failed_fix":
        case "villain":
            return ["unaware", "problem_aware"];
        case "mechanism":
        case "first_notice":
        case "real_win":
            return ["solution_aware", "product_aware"];
        case "objection":
        case "slow_start":
        case "complaint":
            return ["product_aware", "most_aware"];
        case "ritual":
        case "repeat_signal":
            return ["most_aware"];
    }
}
export function angleLine(a: MinedAngle): string {
    return `"${a.best.quote}" (${a.best.ref}). ${JOB_INFO[a.job].label}: ${a.summary}`.trim();
}
export const shareText = (share: number) => `${Math.round(share * 1000) / 10}%`;
