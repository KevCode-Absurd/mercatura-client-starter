import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { loadBrandBrain, slugify } from "./brands";
import { loadClaimSources, quoteIsIn, type FoundClaim } from "./claim-sources";
import { getFounderAnswers, loadQuestionnaire } from "./founder";
import { isAnswered } from "./founder-questions";
import { enqueue } from "./jobs/queue";
import { buildText, type SegmentInput } from "./segments";
const key = (brandId: string) => slugify(brandId).replace(/-/g, "").slice(0, 14) || "brand";
function dropItems(ids: string[]) {
    if (!ids.length)
        return;
    db.transaction((tx) => {
        tx.delete(schema.insights).where(inArray(schema.insights.source_item_id, ids)).run();
        tx.delete(schema.extractionRuns).where(inArray(schema.extractionRuns.source_item_id, ids)).run();
        tx.delete(schema.jobs).where(inArray(schema.jobs.ref_id, ids)).run();
        tx.delete(schema.sourceItems).where(inArray(schema.sourceItems.id, ids)).run();
    });
}
function ensureBatch(brandId: string, id: string, type: "website" | "founder", origin: string, count: number) {
    db.insert(schema.importBatches)
        .values({ id, brand_id: brandId, source_type: type, origin, item_count: count })
        .onConflictDoUpdate({ target: schema.importBatches.id, set: { origin, item_count: count } })
        .run();
}
export function storeWebsitePages(brandId: string, pages: {
    where: string;
    title: string;
    text: string;
}[]): string[] {
    const batch = `batch_website_${key(brandId)}`;
    const old = db.select({ id: schema.sourceItems.id }).from(schema.sourceItems).where(and(eq(schema.sourceItems.brand_id, brandId), eq(schema.sourceItems.source_type, "website"))).all();
    dropItems(old.map((o) => o.id));
    if (!pages.length)
        return [];
    const today = new Date().toISOString().slice(0, 10);
    const stamp = Date.now().toString(36);
    ensureBatch(brandId, batch, "website", `website, read ${today}`, pages.length);
    const ids: string[] = [];
    pages.forEach((p, n) => {
        const id = `web_${key(brandId)}_${stamp}_${String(n + 1).padStart(2, "0")}`;
        const raw = buildText([{ label: "Page", role: "brand", text: p.text }]);
        db.insert(schema.sourceItems)
            .values({ id, brand_id: brandId, source_type: "website", date: today, title: p.title || p.where, raw_text: raw.text, clean_text: "", redacted_text: "", meta: { url: p.where, segments: [] }, persona_hint: null, import_batch_id: batch, external_id: p.where, extraction_status: "done", preprocess_status: "pending", pipeline: { raw_segments: raw.segments, clean_segments: [], stages: [{ name: "parse", ms: 0, note: `Read from ${p.where}: ${raw.text.length} characters. Read for claims only: no insights are extracted from the brand's own pages.` }], chunks: [] } })
            .run();
        enqueue(brandId, "preprocess", id, { extract: false });
        ids.push(id);
    });
    return ids;
}
export interface ClaimOnSite {
    id: string;
    text: string;
    status: string;
    origin: string;
    found: {
        where: string;
        quote: string;
    } | null;
}
export function claimsOnSite(brandId: string): {
    claims: ClaimOnSite[];
    pages: number;
    readAt: string;
} {
    const brand = loadBrandBrain(brandId);
    const reg = loadClaimSources(brandId);
    const site = reg.claims.filter((c) => c.origin === "website");
    const pages = db.select({ url: schema.sourceItems.external_id, text: schema.sourceItems.raw_text }).from(schema.sourceItems).where(and(eq(schema.sourceItems.brand_id, brandId), eq(schema.sourceItems.source_type, "website"))).all();
    const hit = (c: FoundClaim) => ({ where: c.where, quote: c.quote });
    return {
        pages: reg.read.filter((r) => r.origin === "website").length,
        readAt: reg.scanned_at,
        claims: brand.claims.map((c) => {
            const same = site.find((f) => f.claim_id === c.id) ?? site.find((f) => f.same_as === c.id);
            const still = same && pages.length ? pages.find((p) => quoteIsIn(same.quote, p.text)) : undefined;
            return { id: c.id, text: c.text, status: c.status, origin: c.origin ?? "brand", found: same ? { ...hit(same), where: still?.url ?? same.where } : null };
        }),
    };
}
export interface FounderSync {
    sections: number;
    changed: number;
    removed: number;
}
const founderItemId = (brandId: string, n: number) => `fnd_${key(brandId)}_${String(n).padStart(2, "0")}`;
export function syncFounderSource(brandId: string, opts: {
    extract?: boolean;
} = {}): FounderSync {
    const answers = getFounderAnswers(brandId);
    const batch = `batch_founder_${key(brandId)}`;
    const have = new Map(db.select({ id: schema.sourceItems.id, raw: schema.sourceItems.raw_text }).from(schema.sourceItems).where(and(eq(schema.sourceItems.brand_id, brandId), eq(schema.sourceItems.source_type, "founder"))).all().map((r) => [r.id, r.raw]));
    const keep = new Set<string>();
    let changed = 0;
    let sections = 0;
    for (const s of loadQuestionnaire()) {
        const answered = s.questions.filter((q) => isAnswered(answers[q.id]));
        if (!answered.length)
            continue;
        sections++;
        const id = founderItemId(brandId, s.n);
        keep.add(id);
        const parts: SegmentInput[] = answered.flatMap((q) => [
            { label: `Question ${q.id}`, role: "agent" as const, text: q.text },
            { label: "Founder", role: "customer" as const, text: answers[q.id].answer.trim() },
        ]);
        const raw = buildText(parts);
        if (have.get(id) === raw.text)
            continue;
        dropItems(have.has(id) ? [id] : []);
        const date = answered.map((q) => answers[q.id].updated_at ?? "").sort().pop()?.slice(0, 10) || new Date().toISOString().slice(0, 10);
        db.insert(schema.sourceItems)
            .values({ id, brand_id: brandId, source_type: "founder", date, title: `${s.n}. ${s.title}`, raw_text: raw.text, clean_text: "", redacted_text: "", meta: { section: s.n, questions: answered.map((q) => q.id), segments: [] }, persona_hint: null, import_batch_id: batch, external_id: `founder-section-${s.n}`, extraction_status: "pending", preprocess_status: "pending", pipeline: { raw_segments: raw.segments, clean_segments: [], stages: [{ name: "parse", ms: 0, note: `From the founder questionnaire: ${answered.length} answer${answered.length === 1 ? "" : "s"}, ${raw.text.length} characters.` }], chunks: [] } })
            .run();
        enqueue(brandId, "preprocess", id, { extract: !!opts.extract });
        changed++;
    }
    const gone = [...have.keys()].filter((id) => !keep.has(id));
    dropItems(gone);
    if (keep.size)
        ensureBatch(brandId, batch, "founder", "founder questionnaire", keep.size);
    else
        db.delete(schema.importBatches).where(eq(schema.importBatches.id, batch)).run();
    return { sections, changed, removed: gone.length };
}
export function founderPending(brandId: string): {
    answered: number;
    sections: number;
    stale: number;
} {
    const answers = getFounderAnswers(brandId);
    const have = new Map(db.select({ id: schema.sourceItems.id, raw: schema.sourceItems.raw_text }).from(schema.sourceItems).where(and(eq(schema.sourceItems.brand_id, brandId), eq(schema.sourceItems.source_type, "founder"))).all().map((r) => [r.id, r.raw]));
    let stale = 0;
    let sections = 0;
    let answered = 0;
    for (const s of loadQuestionnaire()) {
        const done = s.questions.filter((q) => isAnswered(answers[q.id]));
        if (!done.length)
            continue;
        sections++;
        answered += done.length;
        const raw = buildText(done.flatMap((q) => [{ label: `Question ${q.id}`, role: "agent" as const, text: q.text }, { label: "Founder", role: "customer" as const, text: answers[q.id].answer.trim() }])).text;
        if (have.get(founderItemId(brandId, s.n)) !== raw)
            stale++;
        have.delete(founderItemId(brandId, s.n));
    }
    return { answered, sections, stale: stale + have.size };
}
