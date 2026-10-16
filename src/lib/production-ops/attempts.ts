import { opsDb, fingerprint } from "./store";
export class AttemptHeldError extends Error {
    constructor(public attemptId: string) { super("This paid attempt has no confirmed result. Reconcile its provider receipt before trying again; it will not be repeated automatically."); }
}
export class ProviderDeferredError extends Error {
    constructor(public provider: string, public retryAt: number) { super(`${provider} is cooling down until ${new Date(retryAt).toISOString()}. The worker is released while waiting.`); }
}
export function reserveSpend(id: string, channel: "text" | "image" | "video", amount: number, cap: number, spent: number, operationBudget?: {
    id: string;
    capUsd: number;
}) {
    if ([amount, cap, spent].some(n => !Number.isFinite(n) || n < 0))
        throw new Error("Invalid spending reservation.");
    const sql = opsDb();
    return sql.transaction(() => {
        if (sql.prepare("SELECT id FROM ops_reservations WHERE id=?").get(id))
            throw new Error("The spending reservation already exists.");
        const recorded = channel === 'text' ? (sql.prepare("SELECT coalesce(sum(cost_usd),0) AS amount FROM llm_calls").get() as {
            amount: number;
        }).amount : 0;
        const currentSpent = Math.max(spent, recorded);
        const held = (sql.prepare("SELECT coalesce(sum(amount),0) AS amount FROM ops_reservations WHERE channel=? AND state IN ('reserved','ambiguous')").get(channel) as {
            amount: number;
        }).amount;
        if (currentSpent + held + amount > cap + 1e-9)
            throw new Error(`Insufficient ${channel} budget after in-flight reservations. Requested ${amount.toFixed(4)}; remaining ${Math.max(0, cap - currentSpent - held).toFixed(4)}.`);
        if (operationBudget) {
            if (!operationBudget.id || !Number.isFinite(operationBudget.capUsd) || operationBudget.capUsd < 0 || operationBudget.capUsd > cap)
                throw new Error("Invalid operation budget; it cannot exceed the existing global cap.");
            const prior = sql.prepare("SELECT cap FROM ops_reservation_scopes WHERE operation=? LIMIT 1").get(operationBudget.id) as {
                cap: number;
            } | undefined;
            if (prior && prior.cap !== operationBudget.capUsd)
                throw new Error("An existing operation budget cannot silently change.");
            const usage = (sql.prepare("SELECT coalesce(sum(CASE WHEN r.state IN ('reserved','ambiguous') THEN r.amount ELSE coalesce(r.actual,0) END),0) AS amount FROM ops_reservations r JOIN ops_reservation_scopes s ON s.reservation=r.id WHERE s.operation=?").get(operationBudget.id) as {
                amount: number;
            }).amount;
            if (usage + amount > operationBudget.capUsd + 1e-9)
                throw new Error("Insufficient operation budget after completed and in-flight attempts.");
        }
        sql.prepare("INSERT INTO ops_reservations VALUES(?,?,?,'reserved',NULL,?)").run(id, channel, amount, Date.now());
        if (operationBudget)
            sql.prepare("INSERT INTO ops_reservation_scopes VALUES(?,?,?)").run(id, operationBudget.id, operationBudget.capUsd);
        return id;
    }).immediate();
}
export function settleSpend(id: string, actual: number | null) { if (actual !== null && (!Number.isFinite(actual) || actual < 0))
    throw new Error("Invalid actual cost."); opsDb().prepare("UPDATE ops_reservations SET state=?,actual=? WHERE id=? AND state IN ('reserved','ambiguous')").run(actual === null ? 'ambiguous' : 'settled', actual, id); }
export function heldSpend(channel: string) { return (opsDb().prepare("SELECT coalesce(sum(amount),0) AS n FROM ops_reservations WHERE channel=? AND state IN ('reserved','ambiguous')").get(channel) as {
    n: number;
}).n; }
export function assertProviderReady(provider: string, now = Date.now()) { const row = opsDb().prepare("SELECT retry_at FROM ops_cooldowns WHERE provider=?").get(provider) as {
    retry_at: number;
} | undefined; if (row && row.retry_at > now)
    throw new ProviderDeferredError(provider, row.retry_at); }
export function deferProvider(provider: string, delayMs = 60000) { const retryAt = Date.now() + Math.max(1000, Math.min(900000, delayMs)); opsDb().prepare("INSERT INTO ops_cooldowns VALUES(?,?) ON CONFLICT(provider) DO UPDATE SET retry_at=max(retry_at,excluded.retry_at)").run(provider, retryAt); return new ProviderDeferredError(provider, retryAt); }
export async function paidAttempt<T>(input: {
    id: string;
    brandId: string;
    request: unknown;
    onReuse?: () => void;
}, fn: () => Promise<{
    data: T;
    callId: string;
    costUsd: number;
}>) {
    const sql = opsDb(), hash = fingerprint(input.request);
    const prior = sql.transaction(() => {
        const row = sql.prepare("SELECT * FROM ops_attempts WHERE id=?").get(input.id) as {
            brand: string;
            fingerprint: string;
            state: string;
            response: string | null;
        } | undefined;
        if (row) {
            if (row.brand !== input.brandId || row.fingerprint !== hash)
                throw new Error("An attempt ID cannot be reused for changed scope or inputs.");
            if (row.state === 'completed')
                return JSON.parse(row.response!) as {
                    data: T;
                    callId: string;
                    costUsd: number;
                };
            if (row.state === 'started' || row.state === 'ambiguous')
                throw new AttemptHeldError(input.id);
        }
        sql.prepare("INSERT INTO ops_attempts VALUES(?,?,?,'started',NULL,NULL,0,?) ON CONFLICT(id) DO UPDATE SET state='started',error=NULL,updated=excluded.updated").run(input.id, input.brandId, hash, Date.now());
        return null;
    }).immediate();
    if (prior) {
        input.onReuse?.();
        return prior;
    }
    try {
        const result = await fn();
        sql.prepare("UPDATE ops_attempts SET state='completed',response=?,cost=?,updated=? WHERE id=?").run(JSON.stringify(result), result.costUsd, Date.now(), input.id);
        return result;
    }
    catch (e) {
        const safe = e instanceof ProviderDeferredError || /before.*call|disabled|spend cap|Insufficient .*budget|needs .*API_KEY|Refusing to send|not connected/i.test(String(e));
        sql.prepare("UPDATE ops_attempts SET state=?,error=?,updated=? WHERE id=?").run(safe ? 'failed' : 'ambiguous', String(e), Date.now(), input.id);
        throw e;
    }
}
