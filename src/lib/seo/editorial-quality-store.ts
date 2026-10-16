import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { emptyEditorialQuality, validateEditorialQuality, refreshDependencies, type EditorialQualityState, type EditorialEvidence, type EditorialPage } from "./editorial-quality";
import { listArtifacts, readAudit } from "./store";
import { listResearch } from "./review-store";
import type { SeoContext } from "./model";
import { qualityContext } from "../standalone/data";
import { assessEvidence, buildEvidencePacket, evidenceConditions, contentFingerprint } from "../standalone/evidence";
const KEY = "seo:v1:editorial-quality";
export function loadEditorialQuality(brandId: string) {
    const row = db.select().from(schema.settings).where(and(eq(schema.settings.brand_id, brandId), eq(schema.settings.key, KEY))).get();
    if (!row)
        return { state: emptyEditorialQuality(), revision: 0 };
    const saved = row.value as {
        state: EditorialQualityState;
        revision: number;
    };
    return { state: validateEditorialQuality(saved.state), revision: saved.revision };
}
export function saveEditorialQuality(brandId: string, raw: unknown, expectedRevision: number) {
    const state = validateEditorialQuality(raw);
    return db.transaction(tx => {
        const row = tx.select().from(schema.settings).where(and(eq(schema.settings.brand_id, brandId), eq(schema.settings.key, KEY))).get();
        const prior = row?.value as {
            revision: number;
            state: EditorialQualityState;
        } | undefined;
        if ((prior?.revision ?? 0) !== expectedRevision)
            throw new Error("This editorial workspace changed in another tab. Reload before saving to preserve both sets of work.");
        const staleIds = new Set(refreshDependencies(state.dependencies, state.evidence).map(d => d.id));
        state.dependencies = state.dependencies.map(d => staleIds.has(d.id) ? { ...d, reviewState: "unreviewed" } : d);
        state.claims = state.claims.map(c => c.review === "supported" && state.evidence.find(e => e.id === c.sourceId)?.revision !== c.sourceRevision ? { ...c, review: "unreviewed" } : c);
        const revision = expectedRevision + 1, updated_at = new Date().toISOString();
        tx.insert(schema.settings).values({ brand_id: brandId, key: KEY, value: { state, revision }, updated_at }).onConflictDoUpdate({ target: [schema.settings.brand_id, schema.settings.key], set: { value: { state, revision }, updated_at } }).run();
        return { state, revision };
    });
}
export function editorialImports(ctx: SeoContext) {
    const evidence: EditorialEvidence[] = listResearch(ctx.brandId).filter(s => s.contextHash === ctx.contextHash).map(s => ({ id: `capture:${s.id}`, locator: `${s.url} · captured ${s.fetchedAt} · ${s.id}`, text: s.excerpts.join("\n\n"), productId: "", variant: "", conditions: [s.limits], revision: 1, kind: "research" }));
    const quality = qualityContext(ctx.brandId);
    for (const e of quality.evidence)
        for (const productId of e.productIds)
            if (buildEvidencePacket({ productId, market: ctx.market, variant: e.variants.length === 1 ? e.variants[0] : undefined }, quality.evidence).records.find(r => r.id === e.id)?.eligible)
                evidence.push({ id: `bound:${e.id}:${productId}`, locator: e.source.id, text: `${e.text}\n\nOriginal source passage: ${e.source.excerpt}`, productId, variant: e.variants.length === 1 ? e.variants[0] : "", conditions: evidenceConditions(e).adjacent, typedConditions: e.conditions, atomicFacts: e.atomicFacts, market: ctx.market, revision: e.revision, kind: "product" });
    for (const p of quality.passages)
        evidence.push({ id: `research:${p.id}`, locator: `source:${p.sourceId} · insight:${p.id}`, text: p.quote, productId: "", variant: "", conditions: ["Customer research is not a verified product specification or outcome."], revision: 1, kind: "research" });
    for (const p of ctx.products)
        if (p.format.trim())
            evidence.push({ id: `product:${p.id}`, locator: `Brand Brain product:${p.id} · ${ctx.contextHash}`, text: `${p.name}: ${p.format}`, productId: p.id, variant: "", conditions: [], revision: 1, kind: "product" });
    const draftTask = (a: ReturnType<typeof listArtifacts>[number]): EditorialPage["task"] => { for (const file of a.codeFiles ?? []) {
        try {
            const task = JSON.parse(file.code).decisionType;
            if (["comparison", "compatibility", "use", "care", "selection", "objection"].includes(task))
                return task;
        }
        catch { }
    } return "selection"; };
    const pages: EditorialPage[] = listArtifacts(ctx.brandId).filter(a => a.mode !== "demo").map(a => ({ id: a.id, url: a.targetUrl, title: a.title, question: a.keyword, task: draftTask(a), productId: a.productId ?? "", body: a.body, metadata: a.description, structuredData: (a.codeFiles ?? []).filter(f => /schema|structured/i.test(f.name)).map(f => f.code).join("\n\n"), inspected: true, purpose: "Imported local draft. Set its exact buyer decision before reviewing overlap." }));
    const audit = readAudit(ctx.brandId);
    if (audit?.snapshot.mode === "live" && audit.snapshot.contextHash === ctx.contextHash)
        for (const p of audit.snapshot.pages)
            if (p.contentSections?.length && !pages.some(q => q.url === p.url))
                pages.push({ id: `page:${p.id}`, url: p.url, title: p.title ?? p.h1 ?? p.url, question: p.answeredQuestions?.[0] ?? "", task: "selection", productId: p.productId ?? "", body: p.contentSections.join("\n\n"), inspected: true, purpose: "Bounded inspected page text; not a complete whole-site inventory." });
    return { evidence, pages: pages.map(page => { const value = { body: page.body, metadata: page.metadata, structuredData: page.structuredData, title: page.title }; return { ...page, canonical: { ...value, revision: contentFingerprint(value) } }; }) };
}
