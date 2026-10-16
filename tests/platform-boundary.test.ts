import { describe, it, expect } from 'vitest';
import { authorize, assertEvidenceScope, objectPrefix, idempotencyKey } from '../platform/contracts';
const scope={organizationId:'org_a',brandId:'brand_a',actorId:'user_a'};
const member={...scope,role:'creator' as const,brandIds:['brand_a']};
describe('hosted design boundary contracts',()=>{
 it('denies another organization, actor and unassigned brand',()=>{
   for(const change of [{organizationId:'org_b'},{actorId:'user_b'},{brandId:'brand_b'}])
     expect(()=>authorize({...scope,...change},member,'read')).toThrow('Access denied');
 });
 it('separates creation from approval and connection access',()=>{
   expect(authorize(scope,member,'create')).toEqual(scope);
   expect(()=>authorize(scope,member,'approve')).toThrow();
   expect(()=>authorize(scope,member,'connect')).toThrow();
 });
 it('rejects cross-brand retrieval and unsafe storage keys',()=>{
   expect(()=>assertEvidenceScope(scope,[{organizationId:'org_a',brandId:'brand_b',sourceId:'s',version:'1',observedAt:'2026-10-16'}])).toThrow();
   expect(()=>objectPrefix({...scope,brandId:'../outside'})).toThrow();
   expect(objectPrefix(scope)).toBe('organizations/org_a/brands/brand_a/');
 });
 it('deduplicates retries without merging different tenant jobs',()=>{
   const job={scope,connectionId:'c',accountId:'a',stream:'daily',startDate:'2026-10-01',endDate:'2026-10-02',schemaVersion:1};
   expect(idempotencyKey(job)).toBe(idempotencyKey({...job}));
   expect(idempotencyKey(job)).not.toBe(idempotencyKey({...job,scope:{...scope,brandId:'brand_b'}}));
 });
});
