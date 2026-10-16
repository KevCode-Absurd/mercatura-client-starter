import { randomUUID } from "node:crypto";
import { opsDb } from "./store";
export function acquireJobLease(job: string, owner: string, ttlMs = 30000, now = Date.now()) {
    const sql = opsDb();
    return sql.transaction(() => { const row = sql.prepare("SELECT owner,expires FROM ops_leases WHERE job=?").get(job) as {
        owner: string;
        expires: number;
    } | undefined; if (row && row.expires > now)
        return null; const token = randomUUID(); sql.prepare("INSERT INTO ops_leases VALUES(?,?,?,?) ON CONFLICT(job) DO UPDATE SET owner=excluded.owner,token=excluded.token,expires=excluded.expires").run(job, owner, token, now + ttlMs); return token; }).immediate();
}
export function heartbeatLease(job: string, token: string, ttlMs = 30000, now = Date.now()) { return opsDb().prepare("UPDATE ops_leases SET expires=? WHERE job=? AND token=? AND expires>?").run(now + ttlMs, job, token, now).changes === 1; }
export function releaseJobLease(job: string, token: string) { opsDb().prepare("DELETE FROM ops_leases WHERE job=? AND token=?").run(job, token); }
export function liveLease(job: string, now = Date.now()) { return !!opsDb().prepare("SELECT job FROM ops_leases WHERE job=? AND expires>?").get(job, now); }
export function deferJob(job: string, provider: string, retryAt: number) { opsDb().prepare("INSERT INTO ops_schedule VALUES(?,?,?) ON CONFLICT(job) DO UPDATE SET retry_at=excluded.retry_at,provider=excluded.provider").run(job, retryAt, provider); }
