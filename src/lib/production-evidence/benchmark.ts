import { contentFingerprint } from "../standalone/evidence";
import { evaluateAssertions, type AtomicFact, type AtomicAssertion } from "./facts";
import { assertionFromFact } from "./review";
import { assessDelivery, mediaReviewIdentity, type DeliveryManifest } from "./media";
export function adversarialEvidenceBenchmark(source: AtomicFact) {
    const fact = structuredClone(source), base = assertionFromFact(fact), mutations: {
        family: string;
        claim: AtomicAssertion;
        facts?: AtomicFact[];
    }[] = [
        { family: "subject", claim: { ...base, subject: `${base.subject} unrelated ingredient` } },
        { family: "unit", claim: { ...base, unit: base.unit === "ml" ? "g" : "ml" } },
        { family: "denominator", claim: { ...base, denominator: { value: (base.denominator?.value ?? 1) + 1, unit: base.denominator?.unit ?? "individual_unit" } } },
        { family: "comparator", claim: { ...base, comparator: base.comparator === "equal" ? "at_least" : "equal" } },
        { family: "direction", claim: { ...base, direction: base.direction === "increase" ? "decrease" : "increase" } },
        { family: "negation", claim: { ...base, predicate: `not ${base.predicate}` } },
    ];
    const condition = { id: "fixture-condition", kind: "claim_limit" as const, text: "Fixture-only material limit", display: "adjacent" as const }, restricted = { ...fact, conditions: [...fact.conditions, condition] };
    mutations.push({ family: "qualification_placement", claim: { ...assertionFromFact(restricted), conditions: fact.conditions }, facts: [restricted] });
    const localized = { ...fact, value: "1,500", locale: "en-US" };
    mutations.push({ family: "locale", claim: { ...assertionFromFact(localized), locale: "de-DE" }, facts: [localized] });
    const families = mutations.map(m => {
        const facts = m.facts ?? [fact], positive = evaluateAssertions([assertionFromFact(facts[0])], facts, fact.scope)[0], negative = evaluateAssertions([m.claim], facts, fact.scope)[0];
        return { family: m.family, negativeDetected: negative.status !== "supported", falseHolds: Number(positive.status !== "supported"), positive, negative };
    });
    const media = { sha256: "a".repeat(64), crop: null, frameRange: { startMs: 0, endMs: 3000 }, viewport: { width: 390, height: 844 }, method: "delivery-v1" }, identity = mediaReviewIdentity(media).identity;
    const manifest: DeliveryManifest = { id: "fixture-only", media: { ...media, rendition: "original" }, observedIdentity: identity, approvedScript: "Use the selected pack only.", transcript: [{ startMs: 0, endMs: 3000, text: "Use the selected pack only." }], transcriptSource: "actual_audio", claims: [], noFactualClaimsReviewed: true, frames: [], reviewedBy: "Offline fixture", method: "delivery-alignment-v1" };
    const positive = assessDelivery(manifest, [fact], fact.scope, media);
    for (const [family, negative] of [["pixels", assessDelivery(manifest, [fact], fact.scope, { ...media, sha256: "b".repeat(64) })], ["transcript_span", assessDelivery({ ...manifest, transcript: [{ startMs: 0, endMs: 3000, text: "Use any pack." }] }, [fact], fact.scope, media)]] as const)
        families.push({ family, negativeDetected: negative.status === "held", falseHolds: Number(positive.status !== "reviewed_alignment"), positive: { id: family, status: positive.status === "reviewed_alignment" ? "supported" : "unresolved", reasons: positive.holds.map(h => h.reason), sourceIds: [] }, negative: { id: family, status: negative.status === "held" ? "unsupported" : "supported", reasons: negative.holds.map(h => h.reason), sourceIds: [] } });
    return { version: "schema-mutations-v1", fixtureFingerprint: contentFingerprint(fact), testMaterialOnly: true, families, limitation: "Per-family detection and false-hold counts describe these generated controls, not semantic accuracy or customer evidence." };
}
