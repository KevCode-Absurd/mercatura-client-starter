import { z } from "zod";
import { reviewFingerprint } from "./identity";
import { AssertionSchema, AtomicFactSchema, evaluateAssertions, type AtomicAssertion, type AtomicFact, type FactScope } from "./facts";
export const ClaimRevisionSchema = z.object({ artifactId: z.string().min(1), artifactRevision: z.number().int().positive().optional(), field: z.string().min(1), before: z.string().max(12000), after: z.string().min(1).max(12000), assertions: z.array(AssertionSchema).max(100), sourceFacts: z.array(AtomicFactSchema).max(100), mediaIdentity: z.string().nullable(), sourcePassage: z.string().min(1).max(40000), sourceRevision: z.number().int().positive(), adjacentConditions: z.array(z.string()).max(100) });
export type ClaimRevision = z.infer<typeof ClaimRevisionSchema>;
export function claimRevisionIdentity(raw: ClaimRevision) {
    const value = ClaimRevisionSchema.parse(raw);
    return { fieldHash: reviewFingerprint({ artifactId: value.artifactId, field: value.field, after: value.after, adjacentConditions: value.adjacentConditions }), sourceHash: reviewFingerprint({ sourceFacts: value.sourceFacts, sourcePassage: value.sourcePassage, revision: value.sourceRevision }), mediaIdentity: value.mediaIdentity };
}
export function reviewClaimRevision(raw: ClaimRevision, scope: FactScope, currentFacts: AtomicFact[], reviewer: string, rationale: string) {
    const value = ClaimRevisionSchema.parse(raw), identity = claimRevisionIdentity(value), results = evaluateAssertions(value.assertions, currentFacts, scope), reasons: string[] = [];
    if (!value.assertions.length)
        reasons.push("Map at least one atomic assertion before approving a claim-changing revision.");
    if (value.assertions.some(a => a.passage && !value.after.includes(a.passage)))
        reasons.push("An assertion passage is absent from the exact changed field.");
    for (const fact of value.sourceFacts)
        if (!currentFacts.some(f => f.id === fact.id && reviewFingerprint(f) === reviewFingerprint(fact)))
            reasons.push("The mapped source tuple changed after this review opened.");
    for (const c of value.sourceFacts.flatMap(f => f.conditions).filter(c => c.kind !== "provenance"))
        if (!value.adjacentConditions.includes(c.text) || ![value.after, ...value.adjacentConditions].join(" ").includes(c.text))
            reasons.push(`Keep the material condition beside this claim: ${c.text}`);
    if (!reviewer.trim() || rationale.trim().length < 10)
        reasons.push("A named reviewer and reasoned support decision are required.");
    if (results.some(r => r.status !== "supported"))
        reasons.push(...results.flatMap(r => r.status !== "supported" ? r.reasons : []));
    return { ...identity, artifactId: value.artifactId, field: value.field, status: reasons.length ? "held" as const : "reviewed_exact_revision" as const, results, reasons, reviewer, rationale, before: value.before, after: value.after, sourcePassage: value.sourcePassage, adjacentConditions: value.adjacentConditions, reviewedAt: new Date().toISOString() };
}
export function receiptIsCurrent(receipt: ReturnType<typeof reviewClaimRevision>, current: ClaimRevision) {
    const identity = claimRevisionIdentity(current);
    return receipt.status === "reviewed_exact_revision" && receipt.fieldHash === identity.fieldHash && receipt.sourceHash === identity.sourceHash && receipt.mediaIdentity === identity.mediaIdentity;
}
export function assertionFromFact(fact: AtomicFact, id = fact.id): AtomicAssertion { const { authority, validUntil: _validUntil, ...value } = fact; return { ...value, id, sourceId: authority.sourceId, sourceRevision: authority.sourceRevision }; }
