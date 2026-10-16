import type { AdReferenceRow } from "@/db/schema";
import type { referenceCardRows } from "./cards";
import { adKindsOf, industriesOf, scoreForBrand, type BrandFit, type FitScore } from "./for-brand";
import { formatBuckets } from "./normalize";
export const PAGE = 60;
export const MAX_LIMIT = 600;
export const ALL = "__all";
export const MINE = "__mine";
export interface ReferenceFilter {
    source: string;
    kind: string;
    awareness: string;
    sophistication: string;
    category: string;
    format: string;
    industry: string;
    adKind: string;
    gapsOnly: boolean;
    organise: boolean;
    q: string;
}
export const NO_FILTER: ReferenceFilter = { source: ALL, kind: ALL, awareness: ALL, sophistication: ALL, category: ALL, format: ALL, industry: ALL, adKind: ALL, gapsOnly: false, organise: false, q: "" };
export interface RefCard {
    id: string;
    kind: "image" | "video";
    title: string;
    advertiser: string | null;
    v: string;
    categories: string[];
    awareness: string | null;
    sophistication: string | null;
    duration: number | null;
    hasMedia: boolean;
    analyzed: boolean;
    source: "remix" | "user";
    analysisStatus: AdReferenceRow["analysis_status"];
    analysisError: string | null;
    fit: FitScore;
}
export interface RefFacts extends RefCard {
    formats: string[];
    industries: string[];
    adKinds: string[];
    addedAt: string;
    search: string;
}
export interface ReferencePage {
    cards: RefCard[];
    total: number;
    offset: number;
}
export interface ReferenceSummary {
    all: number;
    added: number;
    library: number;
    synced: string;
    categories: string[];
    analysing: boolean;
}
type Row = ReturnType<typeof referenceCardRows>[number];
export function buildFacts(rows: Row[], fit: BrandFit): RefFacts[] {
    const facts = rows.map((r): RefFacts => {
        const industryText = [...r.categories, ...(r.tags.industry ?? []), ...(r.tags.product_type ?? [])].join(" | ");
        const tagText = [...(r.tags.approach ?? []), ...(r.tags.hook ?? []), ...(r.tags.motivation ?? []), ...(r.tags.style ?? [])].join(" | ");
        const formats = formatBuckets(r.kind, r.tags, r.categories);
        const awareness = r.awareness?.stage ?? null;
        const sophistication = r.sophistication?.stage ?? null;
        return {
            id: r.id,
            kind: r.kind,
            title: r.title,
            advertiser: typeof r.advertiser === "string" ? r.advertiser : null,
            v: r.updated_at.replace(/\D/g, "").slice(0, 14),
            categories: r.categories,
            awareness,
            sophistication,
            duration: r.duration,
            hasMedia: !!r.media_path,
            analyzed: r.analyzed,
            source: r.source,
            analysisStatus: r.analysis_status,
            analysisError: r.analysis_error,
            fit: scoreForBrand({ id: r.id, kind: r.kind, industryText, awareness: awareness ? awareness.replace(/-/g, "_") : null, sophistication: sophistication?.match(/\d/)?.[0] ?? null, formats, tagText }, fit),
            formats,
            industries: industriesOf(industryText),
            adKinds: adKindsOf(r.tags, r.categories),
            addedAt: r.source === "user" ? r.synced_at : "",
            search: [r.title, r.advertiser, r.notes, ...Object.values(r.tags).flat(), r.mechanism, r.transcript].filter(Boolean).join(" ").toLowerCase(),
        };
    });
    return facts.sort((x, y) => (x.addedAt === y.addedAt ? 0 : x.addedAt > y.addedAt ? -1 : 1));
}
export function matches(c: RefFacts, f: ReferenceFilter): boolean {
    const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    return ((f.source === ALL || c.source === f.source) &&
        (f.kind === ALL || c.kind === f.kind) &&
        (f.awareness === ALL || c.awareness === f.awareness) &&
        (f.sophistication === ALL || c.sophistication === f.sophistication) &&
        (f.category === ALL || c.categories.includes(f.category)) &&
        (f.format === ALL || c.formats.includes(f.format)) &&
        (f.industry === ALL || (f.industry === MINE ? c.fit.sameIndustry : c.industries.includes(f.industry))) &&
        (f.adKind === ALL || c.adKinds.includes(f.adKind)) &&
        (!f.gapsOnly || c.fit.gap) &&
        words.every((w) => c.search.includes(w)));
}
export function pageOf<T>(rows: T[], offset: number, limit = PAGE): {
    items: T[];
    total: number;
    offset: number;
} {
    const from = Math.min(Math.max(0, Math.floor(offset) || 0), rows.length);
    const n = Math.min(Math.max(1, Math.floor(limit) || PAGE), MAX_LIMIT);
    return { items: rows.slice(from, from + n), total: rows.length, offset: from };
}
export const toCard = ({ formats: _f, industries: _i, adKinds: _a, addedAt: _d, search: _s, ...card }: RefFacts): RefCard => card;
export function listReferences(facts: RefFacts[], f: ReferenceFilter, offset = 0, limit = PAGE): ReferencePage {
    const hit = facts.filter((c) => matches(c, f));
    const sorted = f.organise ? [...hit].sort((x, y) => y.fit.score - x.fit.score) : hit;
    const page = pageOf(sorted, offset, limit);
    return { cards: page.items.map(toCard), total: page.total, offset: page.offset };
}
export function cleanFilter(f: Partial<ReferenceFilter> | null | undefined): ReferenceFilter {
    const s = (v: unknown, dflt: string) => (typeof v === "string" ? v.slice(0, 200) : dflt);
    return {
        source: s(f?.source, ALL),
        kind: s(f?.kind, ALL),
        awareness: s(f?.awareness, ALL),
        sophistication: s(f?.sophistication, ALL),
        category: s(f?.category, ALL),
        format: s(f?.format, ALL),
        industry: s(f?.industry, ALL),
        adKind: s(f?.adKind, ALL),
        gapsOnly: f?.gapsOnly === true,
        organise: f?.organise === true,
        q: s(f?.q, ""),
    };
}
export function summaryOf(rows: Row[]): ReferenceSummary {
    const library = rows.filter((r) => r.source !== "user");
    return {
        all: rows.length,
        added: rows.length - library.length,
        library: library.length,
        synced: library.reduce((m, r) => (r.synced_at > m ? r.synced_at : m), ""),
        categories: [...new Set(rows.flatMap((r) => r.categories))].sort(),
        analysing: rows.some((r) => r.analysis_status === "queued" || r.analysis_status === "running"),
    };
}
