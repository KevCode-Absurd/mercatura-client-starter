import { createHash, randomUUID } from "node:crypto";
import { db } from "@/db";
const ready = new WeakSet<object>();
export function opsDb() {
    const sql = db.$client;
    if (!ready.has(sql)) {
        sql.exec(`
      CREATE TABLE IF NOT EXISTS ops_records(brand TEXT NOT NULL,space TEXT NOT NULL,item TEXT NOT NULL,revision INTEGER NOT NULL,value TEXT NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(brand,space,item));
      CREATE TABLE IF NOT EXISTS ops_history(brand TEXT NOT NULL,space TEXT NOT NULL,item TEXT NOT NULL,revision INTEGER NOT NULL,value TEXT NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(brand,space,item,revision));
      CREATE TABLE IF NOT EXISTS ops_spans(id TEXT PRIMARY KEY,brand TEXT NOT NULL,operation TEXT NOT NULL,stage TEXT NOT NULL,started INTEGER NOT NULL,ended INTEGER,status TEXT NOT NULL,cost REAL NOT NULL DEFAULT 0,attempt TEXT,error TEXT);
      CREATE INDEX IF NOT EXISTS ops_spans_brand ON ops_spans(brand,started);
      CREATE TABLE IF NOT EXISTS ops_attempts(id TEXT PRIMARY KEY,brand TEXT NOT NULL,fingerprint TEXT NOT NULL,state TEXT NOT NULL,response TEXT,error TEXT,cost REAL NOT NULL DEFAULT 0,updated INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS ops_reservations(id TEXT PRIMARY KEY,channel TEXT NOT NULL,amount REAL NOT NULL,state TEXT NOT NULL,actual REAL,created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS ops_reservation_scopes(reservation TEXT PRIMARY KEY,operation TEXT NOT NULL,cap REAL NOT NULL);
      CREATE TABLE IF NOT EXISTS ops_leases(job TEXT PRIMARY KEY,owner TEXT NOT NULL,token TEXT NOT NULL,expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS ops_schedule(job TEXT PRIMARY KEY,retry_at INTEGER NOT NULL DEFAULT 0,provider TEXT);
      CREATE TABLE IF NOT EXISTS ops_cooldowns(provider TEXT PRIMARY KEY,retry_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS ops_receipts(brand TEXT NOT NULL,artifact TEXT NOT NULL,revision INTEGER NOT NULL,content_hash TEXT NOT NULL,distinct_key TEXT NOT NULL,state TEXT NOT NULL,reviewed INTEGER NOT NULL,PRIMARY KEY(brand,artifact));
      CREATE TABLE IF NOT EXISTS ops_summaries(brand TEXT NOT NULL,kind TEXT NOT NULL,id TEXT NOT NULL,updated TEXT NOT NULL,title TEXT NOT NULL,status TEXT NOT NULL,revision INTEGER NOT NULL,metadata TEXT NOT NULL,PRIMARY KEY(brand,kind,id));
      CREATE INDEX IF NOT EXISTS ops_summaries_page ON ops_summaries(brand,kind,updated DESC,id DESC);
      CREATE TABLE IF NOT EXISTS ops_journal(id TEXT PRIMARY KEY,brand TEXT NOT NULL,state TEXT NOT NULL,changes TEXT NOT NULL,error TEXT,created INTEGER NOT NULL);
    `);
        ready.add(sql);
    }
    return sql;
}
export function fingerprint(value: unknown): string {
    function canonical(v: unknown): unknown { if (Array.isArray(v))
        return v.map(canonical); if (v && typeof v === "object")
        return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canonical(x)])); return v; }
    return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}
export class RevisionConflict extends Error {
    constructor(public currentRevision: number) { super(`This record changed (revision ${currentRevision}). Refresh and merge your edits.`); }
}
export function readCheckpoint<T>(brand: string, space: string, item: string): {
    revision: number;
    value: T;
    updated: number;
} | null {
    const row = opsDb().prepare("SELECT revision,value,updated FROM ops_records WHERE brand=? AND space=? AND item=?").get(brand, space, item) as {
        revision: number;
        value: string;
        updated: number;
    } | undefined;
    return row ? { ...row, value: JSON.parse(row.value) } : null;
}
export function saveCheckpoint<T>(brand: string, space: string, item: string, value: T, expectedRevision: number) {
    const sql = opsDb();
    return sql.transaction(() => {
        const prior = readCheckpoint<T>(brand, space, item);
        if ((prior?.revision ?? 0) !== expectedRevision)
            throw new RevisionConflict(prior?.revision ?? 0);
        const revision = expectedRevision + 1, updated = Date.now(), json = JSON.stringify(value);
        sql.prepare("INSERT INTO ops_records VALUES(?,?,?,?,?,?) ON CONFLICT(brand,space,item) DO UPDATE SET revision=excluded.revision,value=excluded.value,updated=excluded.updated").run(brand, space, item, revision, json, updated);
        sql.prepare("INSERT INTO ops_history VALUES(?,?,?,?,?,?)").run(brand, space, item, revision, json, updated);
        return { revision, value, updated };
    }).immediate();
}
export function checkpointHistory(brand: string, space: string, item: string) { return opsDb().prepare("SELECT revision,value,updated FROM ops_history WHERE brand=? AND space=? AND item=? ORDER BY revision DESC LIMIT 100").all(brand, space, item).map(r => { const row = r as {
    revision: number;
    value: string;
    updated: number;
}; return { ...row, value: JSON.parse(row.value) }; }); }
export type RecordChange = {
    space: string;
    item: string;
    expectedRevision: number;
    value: unknown;
};
export function transactEditorial(brand: string, changes: RecordChange[], options?: {
    failAfter?: number;
}) {
    if (!changes.length || new Set(changes.map(c => c.space + ":" + c.item)).size !== changes.length)
        throw new Error("Choose a nonempty, unique affected set.");
    const sql = opsDb(), id = randomUUID(), snapshots = changes.map(c => ({ ...c, before: readCheckpoint(brand, c.space, c.item) }));
    sql.prepare("INSERT INTO ops_journal VALUES(?,?,?,?,?,?)").run(id, brand, "prepared", JSON.stringify(snapshots), null, Date.now());
    try {
        sql.transaction(() => { for (const c of snapshots)
            if ((readCheckpoint(brand, c.space, c.item)?.revision ?? 0) !== c.expectedRevision)
                throw new RevisionConflict(readCheckpoint(brand, c.space, c.item)?.revision ?? 0); snapshots.forEach((c, i) => { saveCheckpoint(brand, c.space, c.item, c.value, c.expectedRevision); if (options?.failAfter === i + 1)
            throw new Error("Injected editorial interruption"); }); sql.prepare("UPDATE ops_journal SET state='committed' WHERE id=?").run(id); }).immediate();
    }
    catch (e) {
        sql.prepare("UPDATE ops_journal SET state='failed',error=? WHERE id=?").run(String(e), id);
        throw Object.assign(e as Error, { journalId: id });
    }
    return id;
}
export function rollbackEditorial(brand: string, id: string) {
    const row = opsDb().prepare("SELECT * FROM ops_journal WHERE id=? AND brand=? AND state='committed'").get(id, brand) as {
        changes: string;
    } | undefined;
    if (!row)
        throw new Error("This transaction cannot be rolled back.");
    const changes = JSON.parse(row.changes) as (RecordChange & {
        before: {
            value: unknown;
        } | null;
    })[];
    const invalidated = (v: unknown): unknown => { if (Array.isArray(v))
        return v.map(invalidated); if (v && typeof v === 'object')
        return Object.fromEntries(Object.entries(v).filter(([k]) => !['approval', 'receipt', 'approvedAt'].includes(k)).map(([k, x]) => [k, k === 'status' ? 'needs_review' : invalidated(x)])); return v; };
    const undo = transactEditorial(brand, changes.map(c => ({ space: c.space, item: c.item, expectedRevision: c.expectedRevision + 1, value: invalidated(c.before?.value ?? null) })));
    opsDb().prepare("UPDATE ops_journal SET state='rolled_back' WHERE id=?").run(id);
    return undo;
}
export type ArtifactSummary = {
    brand: string;
    kind: string;
    id: string;
    updated: string;
    title: string;
    status: string;
    revision: number;
    metadata: Record<string, unknown>;
};
export function indexSummary(s: ArtifactSummary) { opsDb().prepare("INSERT INTO ops_summaries VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(brand,kind,id) DO UPDATE SET updated=excluded.updated,title=excluded.title,status=excluded.status,revision=excluded.revision,metadata=excluded.metadata").run(s.brand, s.kind, s.id, s.updated, s.title, s.status, s.revision, JSON.stringify(s.metadata)); }
export function listSummaries(brand: string, kind: string, limit = 25, cursor?: {
    updated: string;
    id: string;
}) {
    limit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.trunc(limit))) : 25;
    const rows = opsDb().prepare(`SELECT * FROM ops_summaries WHERE brand=? AND kind=? ${cursor ? "AND (updated < ? OR (updated = ? AND id < ?))" : ""} ORDER BY updated DESC,id DESC LIMIT ?`).all(brand, kind, ...(cursor ? [cursor.updated, cursor.updated, cursor.id] : []), Math.min(100, Math.max(1, limit)) + 1) as (Omit<ArtifactSummary, "metadata"> & {
        metadata: string;
    })[];
    const more = rows.length > limit, items = rows.slice(0, limit).map(r => ({ ...r, metadata: JSON.parse(r.metadata) })), last = items.at(-1);
    return { items, next: more && last ? { updated: last.updated, id: last.id } : null };
}
