import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { LibraryRefRow } from "@/db/schema";
import { SHARED_BRAND } from "../env";
import { readReferenceAnalysis } from "./analysis";
import { formatBuckets } from "./normalize";
export interface ReferenceJob {
    brandId?: string;
    stage?: string | null;
    format?: string | null;
    industry?: string;
    productType?: string;
    count: number;
    skipAdvertiser?: string;
}
export interface Candidate<T> {
    key: string;
    advertiser: string;
    stages: string[];
    formats: string[];
    industries: string[];
    productTypes: string[];
    approaches?: string[];
    value: T;
}
export interface UseCount {
    count: number;
    last: string;
}
export const advertiserKey = (name: string) => name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
const norm = (s: string) => s.toLowerCase().replace(/[_\W]+/g, " ").trim();
const matches = (want: string | null | undefined, values: string[]) => !!want && values.some((v) => norm(v) === norm(want));
const categoryMatch = (want: string | undefined, values: string[]) => !!want && values.some((v) => {
    const terms = norm(v).split(" ").filter((t) => t.length > 3 && !["with", "other", "products"].includes(t));
    return terms.some((t) => norm(want).split(" ").some((w) => w.replace(/s$/, "") === t.replace(/s$/, "")));
});
export function stagesOf(stage: string | null | undefined): string[] {
    const s = norm(stage ?? "");
    return ({ tof: ["unaware", "problem_aware"], mof: ["solution_aware"], bof: ["product_aware", "most_aware"] } as Record<string, string[]>)[s] ?? (s ? [s] : []);
}
export function relevance<T>(c: Candidate<T>, job: ReferenceJob): number {
    return (matches(job.stage, c.stages) ? 100 : 0) + (matches(job.format, c.formats) ? 40 : 0)
        + (categoryMatch(job.industry, c.industries) ? 20 : 0) + (categoryMatch(job.productType, c.productTypes) ? 15 : 0);
}
const tie = (brand: string, key: string) => createHash("sha256").update(`${brand}:${key}`).digest("hex");
export function rankCandidates<T>(candidates: Candidate<T>[], job: ReferenceJob, usage: Map<string, UseCount> = new Map()): Candidate<T>[] {
    const skip = advertiserKey(job.skipAdvertiser ?? "");
    const unique = new Map(candidates.filter((c) => !skip || advertiserKey(c.advertiser) !== skip).map((c) => [c.key, c]));
    const ranked = [...unique.values()].map((c) => ({ c, score: relevance(c, job), use: usage.get(c.key) ?? { count: 0, last: "" }, tie: tie(job.brandId ?? "", c.key) }));
    ranked.sort((a, b) => b.score - a.score || a.use.count - b.use.count || a.use.last.localeCompare(b.use.last) || a.tie.localeCompare(b.tie));
    return ranked.map((r) => r.c);
}
export function chooseCandidates<T>(candidates: Candidate<T>[], job: ReferenceJob, usage?: Map<string, UseCount>): Candidate<T>[] {
    const seen = new Set<string>();
    const out: Candidate<T>[] = [];
    const pool = rankCandidates(candidates, job, usage);
    const approaches = new Set<string>();
    while (pool.length) {
        if (out.length >= Math.max(0, job.count))
            break;
        const best = relevance(pool[0], job);
        const fresh = pool.findIndex((c) => c.approaches?.some((a) => !approaches.has(norm(a)))
            && !seen.has(advertiserKey(c.advertiser)) && relevance(c, job) === best);
        const [c] = pool.splice(fresh < 0 ? 0 : fresh, 1);
        const advertiser = advertiserKey(c.advertiser);
        if (advertiser && seen.has(advertiser))
            continue;
        if (advertiser)
            seen.add(advertiser);
        for (const a of c.approaches ?? [])
            approaches.add(norm(a));
        out.push(c);
    }
    return out;
}
export function referenceUsage(brandId?: string): Map<string, UseCount> {
    const usage = new Map<string, UseCount>();
    if (!brandId)
        return usage;
    for (const row of db.select().from(schema.referenceUses).where(eq(schema.referenceUses.brand_id, brandId)).all()) {
        const before = usage.get(row.reference_key);
        usage.set(row.reference_key, { count: (before?.count ?? 0) + 1, last: before && before.last > row.created_at ? before.last : row.created_at });
    }
    return usage;
}
export function referenceKey(id: string): string {
    const row = db.select({ analysis: schema.adReferences.analysis }).from(schema.adReferences).where(eq(schema.adReferences.id, id)).get();
    if (!row)
        return `library:${id}`;
    const linked = readReferenceAnalysis(row.analysis).library_ref_id;
    return linked ? `library:${linked}` : `ad:${id}`;
}
export function recordReferenceUse(brandId: string, ids: string[], useKey: string): void {
    db.transaction((tx) => {
        for (const reference_key of new Set(ids.map(referenceKey)))
            tx.insert(schema.referenceUses)
                .values({ brand_id: brandId, reference_key, use_key: useKey }).onConflictDoNothing().run();
    });
}
export function chooseVideoReferences(job: ReferenceJob) {
    const formats = formatBuckets("video", { format: [(job.format ?? "").replace(/_/g, " ")] }, []);
    const wanted = { ...job, format: formats[0] ?? job.format };
    const rows = db.select().from(schema.adReferences).where(eq(schema.adReferences.kind, "video")).all()
        .filter((r) => r.analyzed && (r.brand_id === SHARED_BRAND || r.brand_id === job.brandId) && readReferenceAnalysis(r.analysis).transferable_principles);
    return chooseCandidates(rows.map((r) => ({ key: `ad:${r.id}`, advertiser: readReferenceAnalysis(r.analysis).advertiser ?? "",
        stages: stagesOf(r.awareness?.stage), formats: [...(r.tags.format ?? []), ...formatBuckets(r.kind, r.tags, r.categories)],
        industries: r.tags.industry ?? [], productTypes: r.tags.product_type ?? [], approaches: r.tags.approach ?? [], value: r })), wanted, referenceUsage(job.brandId)).map((c) => c.value);
}
export function libraryCandidates(rows: LibraryRefRow[], brandId?: string): Candidate<LibraryRefRow>[] {
    const strategies = new Map(db.select().from(schema.adReferences).where(eq(schema.adReferences.kind, "image")).all()
        .filter((r) => r.brand_id === SHARED_BRAND || r.brand_id === brandId)
        .flatMap((r) => r.analysis?.library_ref_id ? [[r.analysis.library_ref_id, r] as const] : []));
    return rows.map((r) => {
        const strategy = strategies.get(r.id);
        return { key: `library:${r.id}`, advertiser: readReferenceAnalysis(strategy?.analysis).advertiser || r.brand || "",
            stages: stagesOf(strategy?.awareness?.stage || r.group_name), formats: [r.type, ...(strategy?.tags.format ?? [])],
            industries: [r.vertical, ...(r.tags.works_for ?? []), ...(strategy?.tags.industry ?? [])],
            productTypes: [r.tags.product_format ?? "", ...(strategy?.tags.product_type ?? [])], value: { ...r, brand: readReferenceAnalysis(strategy?.analysis).advertiser || r.brand } };
    });
}
