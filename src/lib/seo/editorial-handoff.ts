import { z } from "zod";
import { contentFingerprint, BoundEvidenceSchema, EvidenceScopeSchema, reviewEvidencePacket, type BoundEvidence, type EvidencePacket } from "../standalone/evidence";
import type { SeoArtifact } from "./content";
const snapshotSchema = z.object({ schemaVersion: z.literal(1), scope: EvidenceScopeSchema, records: z.array(z.intersection(BoundEvidenceSchema, z.object({ eligible: z.boolean(), issues: z.array(z.string()) }))), methods: z.record(z.string(), z.string()), choices: z.record(z.string(), z.string()), omitted: z.array(z.string()), fingerprint: z.string().min(1) });
function savedBriefs(artifact: SeoArtifact) {
    return (artifact.codeFiles ?? []).flatMap(file => {
        if (file.language !== "json")
            return [];
        try {
            const value = JSON.parse(file.code);
            return value && typeof value === "object" && "boundEvidencePacket" in value && value.boundEvidencePacket !== null ? [{ file, value }] : [];
        }
        catch {
            return file.code.includes('"boundEvidencePacket"') ? [{ file, value: { boundEvidencePacket: { malformed: true, originalRaw: file.code } } }] : [];
        }
    });
}
export const hasStoredBlogEvidence = (artifact: SeoArtifact) => artifact.kind === "blog" && savedBriefs(artifact).length > 0;
export function reviewStoredBlogEvidence(artifact: SeoArtifact, current: BoundEvidence[], at = new Date().toISOString()) {
    const reviews = savedBriefs(artifact).map(({ file, value }) => {
        const packet = snapshotSchema.safeParse(value.boundEvidencePacket);
        if (!packet.success)
            return { file: file.name, current: false, snapshotFingerprint: null, findings: [{ id: "packet", issue: "The saved evidence packet is incomplete or malformed; inspect the original call and current source before reusing it." }] };
        const review = reviewEvidencePacket(packet.data as EvidencePacket, current, at);
        if (packet.data.scope.productId !== artifact.productId) {
            review.current = false;
            review.findings.push({ id: "scope", issue: "The historical packet belongs to a different product than this article." });
        }
        return { file: file.name, ...review };
    });
    const needsReview = reviews.some(r => !r.current);
    const warnings = reviews.flatMap(r => r.findings.map(f => `${f.id}: ${f.issue}`));
    const evidenceReview = { status: needsReview ? "needs_review" as const : "current" as const, checkedAt: at, reviews, warnings, scope: "Current local evidence register compared with the historical packet. No independent source verification or search-performance assessment." };
    const enriched: SeoArtifact = { ...artifact, codeFiles: artifact.codeFiles?.map(file => {
            const brief = savedBriefs(artifact).find(b => b.file.name === file.name);
            if (!brief)
                return file;
            return { ...file, code: JSON.stringify({ ...brief.value, handoffEvidenceReview: evidenceReview }, null, 2), validation: needsReview ? `NEEDS SOURCE REVIEW: ${warnings.join(" ")} The historical provider packet remains unchanged. ${file.validation}` : file.validation };
        }) };
    return { artifact: enriched, evidenceReview, needsReview };
}
export function markEditedBlogBrief(artifact: SeoArtifact, previousBody: string): SeoArtifact {
    if (artifact.kind !== "blog" || artifact.body === previousBody)
        return artifact;
    return { ...artifact, codeFiles: artifact.codeFiles?.map(file => {
            if (file.language !== "json")
                return file;
            try {
                const brief = JSON.parse(file.code);
                if (!brief || typeof brief !== "object" || !Array.isArray(brief.sections))
                    return file;
                return { ...file, code: JSON.stringify({ ...brief,
                        generationOriginalContributionLocation: brief.generationOriginalContributionLocation ?? brief.originalContributionLocation ?? null,
                        generationSemanticSupportReview: brief.generationSemanticSupportReview ?? brief.semanticSupportReview ?? [],
                        originalContributionLocation: null,
                        semanticSupportReview: [],
                        currentArticleReview: { status: "needs_editorial_review", revision: artifact.revision, bodyFingerprint: contentFingerprint(artifact.body), reason: "The article was edited after its source draft. Source notes and generation checks remain historical; locate the current contribution and review current sentences before implementation." },
                    }, null, 2), validation: "CURRENT ARTICLE EDITED: source notes and model checks describe the historical draft. Review this article revision and locate its actual contribution before implementation." };
            }
            catch {
                return file;
            }
        }) };
}
