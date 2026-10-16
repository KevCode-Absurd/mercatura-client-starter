import "server-only";
import { and, eq, like } from "drizzle-orm";
import { db, schema } from "@/db";
import type { SeoArtifact } from "./content";
import { buildPlanningSnapshot, type SeoAudit, type SeoContext, type SeoSnapshot } from "./model";
import { runLiveAudit } from "./live";
import { focusAudit } from "./scope";
import type { VisibilityRun } from "./visibility";
import { opsDb, indexSummary, listSummaries, RevisionConflict, fingerprint, readCheckpoint, saveCheckpoint } from "../production-ops/store";
import { invalidateOutput, acceptOutput } from "../production-ops/metrics";
const prefix = "seo:v1:";
function read<T>(brandId: string, key: string): T | null {
    return db.select().from(schema.settings).where(and(eq(schema.settings.brand_id, brandId), eq(schema.settings.key, prefix + key))).get()?.value as T ?? null;
}
function write(brandId: string, key: string, value: unknown) {
    const updated_at = new Date().toISOString();
    db.insert(schema.settings).values({ brand_id: brandId, key: prefix + key, value, updated_at })
        .onConflictDoUpdate({ target: [schema.settings.brand_id, schema.settings.key], set: { value, updated_at } }).run();
}
export const readAudit = (brandId: string) => read<{
    audit: SeoAudit;
    snapshot: SeoSnapshot;
    at: string;
}>(brandId, "audit");
export function readFocusedAudit(ctx: SeoContext) {
    const saved = readAudit(ctx.brandId);
    if (!saved || saved.audit.mode !== "live" || saved.snapshot.mode !== "live" || saved.audit.contextHash !== ctx.contextHash || saved.snapshot.contextHash !== ctx.contextHash)
        return null;
    const focused = focusAudit(ctx, saved.snapshot, runLiveAudit(ctx, saved.snapshot));
    return { at: saved.at, audit: focused.audit, snapshot: { ...focused.snapshot, opportunities: buildPlanningSnapshot(ctx).opportunities } };
}
export const saveAudit = (brandId: string, audit: SeoAudit, snapshot: SeoSnapshot) => write(brandId, "audit", { audit, snapshot, at: new Date().toISOString() });
export function listVisibilityRuns(brandId: string): VisibilityRun[] {
    return (read<VisibilityRun[]>(brandId, "visibility-runs") ?? []).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
export function saveVisibilityRun(run: VisibilityRun) {
    const previous = listVisibilityRuns(run.brandId).filter((r) => r.id !== run.id);
    write(run.brandId, "visibility-runs", [run, ...previous].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 20));
}
export const readArtifact = (brandId: string, id: string) => read<SeoArtifact>(brandId, `artifact:${id}`);
export function saveArtifact(a: SeoArtifact, expectedRevision = a.revision - 1) {
    return opsDb().transaction(() => {
        const prior = readArtifact(a.brandId, a.id);
        if ((prior?.revision ?? 0) !== expectedRevision)
            throw new RevisionConflict(prior?.revision ?? 0);
        write(a.brandId, `artifact:${a.id}`, a);
        const { body, history, codeFiles, ...metadata } = a;
        indexSummary({ brand: a.brandId, kind: "seo", id: a.id, updated: a.updatedAt, title: a.title, status: a.status, revision: a.revision, metadata: { ...metadata, body: "", history: [], contentHash: fingerprint(body) } });
        if (prior && (prior.body !== body || prior.status === 'approved' && a.status === 'draft'))
            invalidateOutput(a.brandId, a.id);
        if (a.status === 'approved') {
            const file = a.codeFiles?.find(f => f.name.endsWith('-editorial-brief.json'));
            let decision = '';
            try {
                decision = JSON.parse(file?.code ?? '{}').buyerDecision ?? '';
            }
            catch { }
            if (decision)
                acceptOutput({ brand: a.brandId, artifact: a.id, revision: a.revision, contentHash: fingerprint({ body: a.body, contextHash: a.contextHash }), distinctKey: fingerprint({ productId: a.productId, decision: decision.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim() }), state: 'accepted' });
        }
        return a;
    }).immediate();
}
export function listArtifactPage(brandId: string, limit = 25, cursor?: {
    updated: string;
    id: string;
}) {
    const sql = opsDb();
    if (!readCheckpoint(brandId, 'index', 'seo-v1'))
        sql.transaction(() => { if (readCheckpoint(brandId, 'index', 'seo-v1'))
            return; sql.prepare(`INSERT OR IGNORE INTO ops_summaries SELECT brand_id,'seo',json_extract(value,'$.id'),json_extract(value,'$.updatedAt'),json_extract(value,'$.title'),json_extract(value,'$.status'),json_extract(value,'$.revision'),json_set(json_remove(value,'$.body','$.history','$.codeFiles'),'$.body','','$.history',json('[]')) FROM settings WHERE brand_id=? AND key LIKE 'seo:v1:artifact:%'`).run(brandId); saveCheckpoint(brandId, 'index', 'seo-v1', { complete: true }, 0); }).immediate();
    const page = listSummaries(brandId, 'seo', limit, cursor);
    return { items: page.items.map(s => s.metadata as unknown as SeoArtifact), next: page.next };
}
export function listArtifacts(brandId: string): SeoArtifact[] {
    return db.select().from(schema.settings).where(and(eq(schema.settings.brand_id, brandId), like(schema.settings.key, `${prefix}artifact:%`))).all()
        .map((r) => r.value as SeoArtifact).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export const completedSeoLessons = (brandId: string) => read<string[]>(brandId, "lessons") ?? [];
export function toggleSeoLesson(brandId: string, id: string) {
    const ids = new Set(completedSeoLessons(brandId));
    if (ids.has(id))
        ids.delete(id);
    else
        ids.add(id);
    write(brandId, "lessons", [...ids]);
}
