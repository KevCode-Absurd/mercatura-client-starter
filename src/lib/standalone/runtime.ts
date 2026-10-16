import { readEvidence, readLocal, writeLocal } from "./store";
import { buildEvidencePacket, evidencePrompt, type EvidenceScope } from "./evidence";
import { feedbackAction, type Feedback } from "./creative";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { cachedContext } from "../production-ops/context-cache";
export function boundRuntimeContext(brandId: string, scope: EvidenceScope, choices: Record<string, string> = {}) {
    const now = Date.now();
    return cachedContext<{
        packet: ReturnType<typeof buildEvidencePacket>;
        prompt: string;
    } | null>({ namespace: `bound-evidence:${brandId}`, revision: readLocal(brandId, "evidence-revision", 0), scope: { ...scope, choices }, method: "bound-runtime-v3", now, valueExpiry: (value: {
            packet: ReturnType<typeof buildEvidencePacket>;
        } | null) => { const boundaries = value?.packet.records.flatMap(r => [r.validFrom, r.validUntil, ...(r.atomicFacts ?? []).map(f => f.validUntil)]).filter((v): v is string => !!v).map(Date.parse).filter(t => t > now) ?? []; return boundaries.length ? Math.min(...boundaries) : undefined; } }, () => { const records = readEvidence(brandId); if (!records.length)
        return null; const packet = buildEvidencePacket(scope, records, { choices, now: new Date(now).toISOString() }); return { packet, prompt: evidencePrompt(packet) }; });
}
export function acceptedRepairBrief(brandId: string, scope: {
    productId: string;
    campaign: string;
    format: string;
}) {
    return readLocal<Feedback[]>(brandId, "feedback", []).filter((f) => feedbackAction(f).reusable && f.reviewAt >= new Date().toISOString().slice(0, 10) && f.scope.productId === scope.productId && f.scope.campaign === scope.campaign && f.scope.format === scope.format)
        .map((f) => ({ id: f.id, diagnosis: f.diagnosis, acceptedRepair: feedbackAction(f).selectedRepair, scope: f.scope }));
}
export function recordProviderInput(brandId: string, input: {
    callId: string;
    task: string;
    refType?: string;
    refId?: string;
    system: string;
    user: string;
    images?: string[];
    video?: string;
}) {
    if (!db.select({ id: schema.brands.id }).from(schema.brands).where(eq(schema.brands.id, brandId)).get())
        return;
    const records = readLocal<Record<string, unknown>>(brandId, "provider-inputs", {});
    const next = { ...records, [input.callId]: { ...input, recordedAt: new Date().toISOString(), content: "Exact requested application messages and media paths before provider dispatch; provider transport/configuration remains in the existing call inspector." } };
    writeLocal(brandId, "provider-inputs", Object.fromEntries(Object.entries(next).slice(-100)));
}
