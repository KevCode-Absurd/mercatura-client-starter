/** Design contracts for the hosted migration. These are not wired to local app routes. */
export type Role = 'owner'|'admin'|'integration_admin'|'creator'|'reviewer'|'analyst'|'viewer'|'billing';
export type Action = 'read'|'create'|'approve'|'connect'|'bill'|'manage';
export interface TenantScope { organizationId: string; brandId: string; actorId: string }
export interface Membership { organizationId: string; actorId: string; role: Role; brandIds: string[] }
const permissions: Record<Role, readonly Action[]> = {
  owner:['read','create','approve','connect','bill','manage'], admin:['read','create','approve','manage'],
  integration_admin:['read','connect'], creator:['read','create'], reviewer:['read','approve'],
  analyst:['read'], viewer:['read'], billing:['bill'],
};
export function authorize(scope: TenantScope, membership: Membership, action: Action): TenantScope {
  if (!scope.organizationId || !scope.brandId || !scope.actorId ||
      membership.organizationId !== scope.organizationId || membership.actorId !== scope.actorId ||
      !membership.brandIds.includes(scope.brandId) || !permissions[membership.role]?.includes(action))
    throw new Error('Access denied');
  return Object.freeze({...scope});
}
export function objectPrefix(scope: TenantScope): string {
  for (const id of [scope.organizationId, scope.brandId]) if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid tenant identifier');
  return 'organizations/'+scope.organizationId+'/brands/'+scope.brandId+'/';
}
export type JobState = 'queued'|'running'|'report_pending'|'retry_wait'|'needs_reauth'|'succeeded'|'failed'|'cancelled';
export interface IngestJob {
  id: string; scope: TenantScope; connectionId: string; accountId: string;
  stream: string; startDate: string; endDate: string; schemaVersion: number;
  checkpoint?: string; attempt: number; state: JobState;
}
export interface SecretReference { keyId: string; ciphertextId: string; version: number }
export interface ConnectorAdapter {
  provider: string;
  discover(scope: TenantScope, secret: SecretReference): Promise<{accountId:string;name:string}[]>;
  ingest(job: IngestJob, secret: SecretReference): Promise<{checkpoint?:string; rows:number; rawObjectKeys:string[]; nextPollAt?:string}>;
  revoke(scope: TenantScope, secret: SecretReference): Promise<void>;
}
export function idempotencyKey(job: Pick<IngestJob,'scope'|'connectionId'|'accountId'|'stream'|'startDate'|'endDate'|'schemaVersion'>): string {
  return JSON.stringify([job.scope.organizationId,job.scope.brandId,job.connectionId,job.accountId,job.stream,job.startDate,job.endDate,job.schemaVersion]);
}
export interface EvidenceReference { organizationId:string; brandId:string; sourceId:string; version:string; observedAt:string }
export function assertEvidenceScope(scope: TenantScope, evidence: EvidenceReference[]): void {
  if(evidence.some(e=>e.organizationId!==scope.organizationId || e.brandId!==scope.brandId)) throw new Error('Evidence crosses tenant boundary');
}
