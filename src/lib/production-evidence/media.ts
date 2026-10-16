import { z } from "zod";
import { reviewFingerprint } from "./identity";
import { AssertionSchema, AtomicFactSchema, evaluateAssertions, type AtomicFact, type FactScope } from "./facts";
export const MediaReviewInputSchema = z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/i).transform(value => value.toLowerCase()), crop: z.object({ x: z.number().min(0), y: z.number().min(0), width: z.number().positive(), height: z.number().positive() }).nullable(), frameRange: z.object({ startMs: z.number().min(0), endMs: z.number().positive() }).nullable(), viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }), method: z.string().min(1), rendition: z.string().min(1).default("original") }).superRefine((v, ctx) => { if (v.frameRange && v.frameRange.endMs <= v.frameRange.startMs)
    ctx.addIssue({ code: "custom", message: "Frame range must end after it starts." }); });
export type MediaReviewInput = z.input<typeof MediaReviewInputSchema>;
export function mediaReviewIdentity(raw: MediaReviewInput) {
    const value = MediaReviewInputSchema.parse(raw);
    return { ...value, identity: reviewFingerprint(value), reviewState: "unreviewed" as const };
}
const span = z.object({ startMs: z.number().min(0), endMs: z.number().positive(), text: z.string().min(1).max(12000) }).superRefine((s, ctx) => { if (s.endMs <= s.startMs)
    ctx.addIssue({ code: "custom", message: "Span end must follow its start." }); });
export const DeliveryManifestSchema = z.object({
    id: z.string().min(1), media: MediaReviewInputSchema, observedIdentity: z.string().min(1), approvedScript: z.string().min(1).max(60000),
    transcript: z.array(span).max(2000), transcriptSource: z.enum(["actual_audio", "plan_only"]),
    claims: z.array(z.object({ startMs: z.number().min(0), endMs: z.number().positive(), assertion: AssertionSchema, spokenQualification: z.string(), overlayQualification: z.string() })).max(200),
    frames: z.array(z.object({ atMs: z.number().min(0), text: z.string().max(12000), mediaIdentity: z.string(), frameSha256: z.string().regex(/^[a-f0-9]{64}$/i).transform(value => value.toLowerCase()), basis: z.enum(["actual_frame", "plan_only"]), reviewedBy: z.string().min(1), readable: z.boolean() })).max(2000),
    reviewedBy: z.string().min(1), method: z.literal("delivery-alignment-v1"),
    noFactualClaimsReviewed: z.boolean().optional(),
});
export type DeliveryManifest = z.infer<typeof DeliveryManifestSchema>;
const speech = (s: string) => s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function assessDelivery(raw: DeliveryManifest, facts: AtomicFact[], scope: FactScope, currentMedia: MediaReviewInput) {
    const manifest = DeliveryManifestSchema.parse(raw), expected = mediaReviewIdentity(currentMedia), holds: {
        atMs: number;
        reason: string;
    }[] = [];
    if (manifest.observedIdentity !== expected.identity || mediaReviewIdentity(manifest.media).identity !== expected.identity)
        holds.push({ atMs: 0, reason: "Media bytes, crop, frame range, viewport or method changed. Prior observations are stale." });
    if (expected.frameRange) {
        const range = expected.frameRange, outsideSpan = (s: {
            startMs: number;
            endMs: number;
        }) => s.startMs < range.startMs || s.endMs > range.endMs;
        for (const s of manifest.transcript.filter(outsideSpan))
            holds.push({ atMs: s.startMs, reason: `Transcript span is outside the selected review frame range ${range.startMs}–${range.endMs}ms.` });
        for (const c of manifest.claims.filter(outsideSpan))
            holds.push({ atMs: c.startMs, reason: `Claim span is outside the selected review frame range ${range.startMs}–${range.endMs}ms.` });
        for (const f of manifest.frames.filter(f => f.atMs < range.startMs || f.atMs > range.endMs))
            holds.push({ atMs: f.atMs, reason: `Frame observation is outside the selected review frame range ${range.startMs}–${range.endMs}ms.` });
    }
    if (manifest.transcriptSource !== "actual_audio")
        holds.push({ atMs: 0, reason: "A planned transcript cannot verify delivered speech." });
    if (!manifest.claims.length && !manifest.noFactualClaimsReviewed)
        holds.push({ atMs: 0, reason: "Map the delivered factual claims, or explicitly record a review that this delivery makes no factual claims." });
    const delivered = speech(manifest.transcript.map(s => s.text).join(" "));
    if (delivered !== speech(manifest.approvedScript)) {
        const approvedWords = speech(manifest.approvedScript).split(" ");
        let offset = 0, atMs = 0;
        for (const s of manifest.transcript) {
            const words = speech(s.text).split(" ");
            if (words.some((w, i) => w !== approvedWords[offset + i])) {
                atMs = s.startMs;
                break;
            }
            offset += words.length;
            atMs = s.endMs;
        }
        holds.push({ atMs, reason: "Delivered speech differs from the approved script; inspect the timestamp for omitted qualification or changed quantity." });
    }
    const tuples = evaluateAssertions(manifest.claims.map(c => c.assertion), facts.map(f => AtomicFactSchema.parse(f)), scope);
    manifest.claims.forEach((c, i) => {
        if (c.endMs <= c.startMs)
            holds.push({ atMs: c.startMs, reason: "Claim span has invalid timing." });
        if (tuples[i].status !== "supported")
            holds.push({ atMs: c.startMs, reason: tuples[i].reasons.join(" ") });
        const words = speech(manifest.transcript.filter(s => s.startMs < c.endMs && s.endMs > c.startMs).map(s => s.text).join(" "));
        if (c.spokenQualification && !words.includes(speech(c.spokenQualification)))
            holds.push({ atMs: c.startMs, reason: `Spoken qualification is missing in this claim span: ${c.spokenQualification}` });
        if (c.overlayQualification) {
            const observations = manifest.frames.filter(f => f.atMs >= c.startMs && f.atMs <= c.endMs && f.mediaIdentity === expected.identity && f.basis === "actual_frame" && f.readable && speech(f.text).includes(speech(c.overlayQualification)));
            if (!observations.length)
                holds.push({ atMs: c.startMs, reason: `Overlay qualification has no readable actual-frame observation for these bytes/render conditions: ${c.overlayQualification}` });
        }
    });
    return { id: manifest.id, identity: expected.identity, status: holds.length ? "held" as const : "reviewed_alignment" as const, holds, tupleReviews: tuples, reviewedBy: manifest.reviewedBy, observationBasis: "Supplied actual-audio transcript and reviewer-inspected actual-frame observations. No automatic transcription/OCR or independent verification is implied.", acceptance: "No automatic publication or factual approval." };
}
