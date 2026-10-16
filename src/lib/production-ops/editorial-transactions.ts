import { randomUUID } from "node:crypto";
import { z } from "zod";
import { readArtifact, saveArtifact } from "../seo/store";
import { markEditedBlogBrief } from "../seo/editorial-handoff";
import { opsDb } from "./store";
import type { SeoArtifact } from "../seo/content";
const changeSchema = z.object({ id: z.string().min(1), revision: z.number().int().min(1), title: z.string().trim().min(1).max(240).optional(), description: z.string().max(500).optional(), body: z.string().trim().min(1).max(100000).optional(), sourceIds: z.array(z.string()).max(500).optional() });
export function applyArticleCorrections(brandId: string, raw: unknown[], options?: {
    failAfter?: number;
}) {
    const changes = z.array(changeSchema).min(1).max(20).parse(raw);
    if (new Set(changes.map(c => c.id)).size !== changes.length)
        throw new Error("Choose each affected draft once.");
    const snapshots = changes.map(c => { const before = readArtifact(brandId, c.id); if (!before || before.revision !== c.revision)
        throw new Error("An affected draft changed; review the complete affected set again."); return { change: c, before }; });
    const id = randomUUID(), sql = opsDb();
    sql.prepare("INSERT INTO ops_journal VALUES(?,?, 'prepared', ?,NULL,?)").run(id, brandId, JSON.stringify({ kind: "seo-compound", snapshots }), Date.now());
    try {
        sql.transaction(() => { for (let i = 0; i < snapshots.length; i++) {
            const { change, before } = snapshots[i], at = new Date().toISOString();
            const { id: _, revision, ...patch } = change;
            const next: SeoArtifact = markEditedBlogBrief({ ...before, ...patch, revision: revision + 1, status: "draft", updatedAt: at, appliedUrl: undefined, verification: undefined, history: [...before.history, { at, message: `Compound editorial correction ${id}; approval invalidated for this exact affected draft.` }] }, before.body);
            saveArtifact(next, revision);
            if (options?.failAfter === i + 1)
                throw new Error("Injected compound editorial interruption");
        } sql.prepare("UPDATE ops_journal SET state='committed' WHERE id=?").run(id); }).immediate();
    }
    catch (error) {
        sql.prepare("UPDATE ops_journal SET state='failed',error=? WHERE id=?").run(String(error), id);
        throw Object.assign(error as Error, { journalId: id });
    }
    return id;
}
export function undoArticleCorrections(brandId: string, id: string) { const sql = opsDb(), row = sql.prepare("SELECT changes FROM ops_journal WHERE brand=? AND id=? AND state='committed'").get(brandId, id) as {
    changes: string;
} | undefined; if (!row)
    throw new Error("No committed correction is available to undo."); const record = JSON.parse(row.changes) as {
    kind: string;
    snapshots: {
        change: z.infer<typeof changeSchema>;
        before: SeoArtifact;
    }[];
}; if (record.kind !== 'seo-compound')
    throw new Error("This journal uses a different recovery flow."); const reverse = record.snapshots.map(({ change, before }) => ({ id: before.id, revision: change.revision + 1, title: before.title, description: before.description, body: before.body, sourceIds: before.sourceIds })); const undoId = applyArticleCorrections(brandId, reverse); sql.prepare("UPDATE ops_journal SET state='rolled_back' WHERE id=?").run(id); return undoId; }
