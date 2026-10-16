import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { BoundEvidenceSchema, contentFingerprint, type BoundEvidence } from "./evidence";
export function readLocal<T>(brandId: string, key: string, fallback: T): T {
    return (db.select().from(schema.settings).where(and(eq(schema.settings.brand_id, brandId), eq(schema.settings.key, `standalone:${key}`))).get()?.value as T | undefined) ?? fallback;
}
export function writeLocal(brandId: string, key: string, value: unknown) {
    if (!db.select({ id: schema.brands.id }).from(schema.brands).where(eq(schema.brands.id, brandId)).get())
        throw new Error("Unknown brand.");
    const updated_at = new Date().toISOString();
    db.insert(schema.settings).values({ brand_id: brandId, key: `standalone:${key}`, value, updated_at })
        .onConflictDoUpdate({ target: [schema.settings.brand_id, schema.settings.key], set: { value, updated_at } }).run();
}
export function readEvidence(brandId: string): BoundEvidence[] { return z.array(BoundEvidenceSchema).parse(readLocal(brandId, "evidence", [])); }
export function readEvidenceSnapshot(brandId: string) { return { revision: readLocal<number>(brandId, "evidence-revision", 0), records: readEvidence(brandId) }; }
export function evidenceHistory(brandId: string) { return readLocal<{
    revision: number;
    records: BoundEvidence[];
    at: string;
}[]>(brandId, "evidence-history", []); }
export function saveEvidence(brandId: string, records: BoundEvidence[], options?: {
    expectedRevision: number;
    baseRecords?: BoundEvidence[];
}) {
    const parsed = z.array(BoundEvidenceSchema).max(1000).parse(records);
    if (new Set(parsed.map((r) => r.id)).size !== parsed.length)
        throw new Error("Evidence IDs must be unique within this brand.");
    const factIds = parsed.flatMap(r => (r.atomicFacts ?? []).map(f => f.id));
    if (new Set(factIds).size !== factIds.length)
        throw new Error("Atomic fact IDs must be unique within this brand's source records.");
    return db.transaction(() => {
        const prior = readEvidenceSnapshot(brandId);
        let next = parsed;
        if (options && options.expectedRevision === prior.revision && parsed.some(r => { const live = prior.records.find(v => v.id === r.id); return live && r.revision < live.revision && contentFingerprint(r) !== contentFingerprint(live); }))
            throw new Error("Evidence record revision conflict. Review the current source and conditions before replacing it.");
        if (options && options.expectedRevision !== prior.revision) {
            if (!options.baseRecords)
                throw new Error("Evidence register revision conflict. Reload; prior revisions remain recoverable.");
            const base = options.baseRecords, ids = new Set([...base, ...parsed].map(r => r.id));
            const changed = [...ids].filter(id => contentFingerprint(base.find(r => r.id === id)) !== contentFingerprint(parsed.find(r => r.id === id)));
            if (changed.some(id => contentFingerprint(base.find(r => r.id === id)) !== contentFingerprint(prior.records.find(r => r.id === id))))
                throw new Error("The same evidence record changed concurrently. Reload and reconcile the source and conditions.");
            next = [...prior.records.filter(r => !changed.includes(r.id)), ...parsed.filter(r => changed.includes(r.id))];
        }
        const at = new Date().toISOString(), revision = prior.revision + 1;
        writeLocal(brandId, "evidence-history", [...evidenceHistory(brandId), { ...prior, at }]);
        writeLocal(brandId, "evidence", next);
        writeLocal(brandId, "evidence-revision", revision);
        return { revision, records: next };
    }, { behavior: "immediate" });
}
export function restoreEvidenceRevision(brandId: string, historicalRevision: number, expectedRevision: number) {
    const old = evidenceHistory(brandId).find(h => h.revision === historicalRevision);
    if (!old)
        throw new Error("Historical evidence revision is unavailable.");
    return saveEvidence(brandId, old.records.map(record => ({ ...record, status: "pending", revision: Math.max(record.revision, readEvidence(brandId).find(r => r.id === record.id)?.revision ?? 0) + 1 })), { expectedRevision });
}
export const EvidenceTaskSchema = z.object({ id: z.string(), artifactId: z.string(), originalBrief: z.string(), missing: z.array(z.string()), alternative: z.string(), status: z.enum(["open", "resolved"]), resolvedEvidenceIds: z.array(z.string()), createdAt: z.string() });
export type EvidenceTask = z.infer<typeof EvidenceTaskSchema>;
export function readEvidenceTasks(brandId: string): EvidenceTask[] { return z.array(EvidenceTaskSchema).parse(readLocal(brandId, "evidence-tasks", [])); }
export function saveEvidenceTasks(brandId: string, tasks: EvidenceTask[]) { writeLocal(brandId, "evidence-tasks", z.array(EvidenceTaskSchema).max(1000).parse(tasks)); }
