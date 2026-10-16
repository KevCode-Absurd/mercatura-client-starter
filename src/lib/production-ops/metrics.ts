import { randomUUID } from "node:crypto";
import { opsDb } from "./store";
export function startSpan(brand: string, operation: string, stage: "queue" | "context" | "provider" | "validation" | "repair" | "render" | "human_review", at = Date.now()) { const id = randomUUID(); opsDb().prepare("INSERT INTO ops_spans(id,brand,operation,stage,started,status) VALUES(?,?,?,?,?,'running')").run(id, brand, operation, stage, at); return id; }
export function endSpan(id: string, status: "passed" | "failed" | "cancelled", options: {
    cost?: number;
    attempt?: string;
    error?: string;
    at?: number;
} = {}) { opsDb().prepare("UPDATE ops_spans SET ended=?,status=?,cost=?,attempt=?,error=? WHERE id=? AND ended IS NULL").run(options.at ?? Date.now(), status, options.cost ?? 0, options.attempt ?? null, options.error ?? null, id); }
export async function traced<T>(brand: string, operation: string, stage: Parameters<typeof startSpan>[2], fn: () => Promise<T>) { const id = startSpan(brand, operation, stage); try {
    const v = await fn();
    endSpan(id, 'passed');
    return v;
}
catch (e) {
    endSpan(id, 'failed', { error: String(e) });
    throw e;
} }
export function acceptOutput(input: {
    brand: string;
    artifact: string;
    revision: number;
    contentHash: string;
    distinctKey: string;
    state: "accepted" | "held";
    reviewedAt?: number;
}) {
    if (!input.contentHash || !input.distinctKey || input.revision < 1)
        throw new Error("A review receipt needs exact content, revision and distinct argument identity.");
    opsDb().prepare("INSERT INTO ops_receipts VALUES(?,?,?,?,?,?,?) ON CONFLICT(brand,artifact) DO UPDATE SET revision=excluded.revision,content_hash=excluded.content_hash,distinct_key=excluded.distinct_key,state=excluded.state,reviewed=excluded.reviewed").run(input.brand, input.artifact, input.revision, input.contentHash, input.distinctKey, input.state, input.reviewedAt ?? Date.now());
}
export function invalidateOutput(brand: string, artifact: string) { opsDb().prepare("UPDATE ops_receipts SET state='held' WHERE brand=? AND artifact=?").run(brand, artifact); }
export function productionMetrics(brand: string, from = 0, to = Date.now()) {
    const sql = opsDb();
    const spans = sql.prepare("SELECT * FROM ops_spans WHERE brand=? AND started>=? AND started<=? ORDER BY started").all(brand, from, to) as {
        id: string;
        stage: string;
        started: number;
        ended: number | null;
        cost: number;
        attempt: string | null;
        status: string;
    }[];
    const accepted = (sql.prepare("SELECT count(distinct distinct_key) AS n FROM ops_receipts WHERE brand=? AND state='accepted' AND reviewed>=? AND reviewed<=?").get(brand, from, to) as {
        n: number;
    }).n;
    const seen = new Set<string>();
    let cost = 0;
    for (const s of spans) {
        if (s.attempt && seen.has(s.attempt))
            continue;
        if (s.attempt)
            seen.add(s.attempt);
        cost += s.cost;
    }
    const start = spans.length ? Math.min(...spans.map(s => s.started)) : null, end = spans.length ? Math.max(...spans.map(s => s.ended ?? to)) : null, hours = start !== null && end !== null ? (end - start) / 3600000 : 0;
    const stages = Object.fromEntries([...new Set(spans.map(s => s.stage))].map(stage => [stage, spans.filter(s => s.stage === stage).reduce((n, s) => n + (s.ended ?? to) - s.started, 0)]));
    return { acceptedDistinctOutputs: accepted, observedHours: hours, acceptedPerHour: hours > 0 ? accepted / hours : null, attributableCostUsd: cost, costPerAccepted: accepted ? cost / accepted : null, stageMs: stages, spans, definition: "Accepted receipts for exact current revisions; distinct argument identities count once. Stage totals may overlap. Human review and machine spans remain separate." };
}
