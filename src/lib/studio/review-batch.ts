import type { StudioItem, AuditItem } from "@/db/schema";
import { completeCopyHash, completeCopyPacket, finalizeCompleteCopyReview, type CopyAuthority } from "../evaluation/copy-repair";
import { boundedMap } from "../production-portfolio/core";
import { completeCopyAudit, copyDocumentForItem, copyRequirementsForItem, reviewCompleteCopy, type CompleteCopyServiceOptions } from "./copy-gate";
import { RunStoppedError } from "../llm/run-control";
export async function reviewSnapshotBatch(items: StudioItem[], options: {
    limit: number;
    index: (item: StudioItem) => number;
    authority: (item: StudioItem) => CopyAuthority;
    persisted: (item: StudioItem) => StudioItem | undefined;
    service: CompleteCopyServiceOptions;
    reader?: typeof reviewCompleteCopy;
}): Promise<AuditItem[]> {
    return (await boundedMap(items, options.limit, async (item) => {
        const document = structuredClone(copyDocumentForItem(item)), authority = structuredClone(options.authority(item)), requirements = structuredClone(copyRequirementsForItem(item)), before = completeCopyPacket(document, authority, requirements), persisted = options.persisted(item), persistedHash = persisted ? completeCopyHash(copyDocumentForItem(persisted), copyRequirementsForItem(persisted)) : null;
        let checked;
        try {
            checked = await (options.reader ?? reviewCompleteCopy)(document, authority, { ...options.service, requirements, previousReview: structuredClone(item.copy_review) });
        }
        catch (error) {
            if (error instanceof RunStoppedError)
                throw error;
            const review = finalizeCompleteCopyReview(before, undefined);
            review.verificationErrors.push(`Independent review failed: ${String(error)}`);
            checked = { review };
        }
        const current = options.persisted(item), currentHash = current ? completeCopyHash(copyDocumentForItem(current), copyRequirementsForItem(current)) : null;
        if (persistedHash !== null && currentHash !== persistedHash && current)
            Object.assign(item, structuredClone(current));
        const after = completeCopyPacket(copyDocumentForItem(item), options.authority(item), copyRequirementsForItem(item));
        if (before.contentHash !== after.contentHash || before.evidenceHash !== after.evidenceHash || (persistedHash !== null && currentHash !== persistedHash)) {
            const held = finalizeCompleteCopyReview(after, undefined);
            held.verificationErrors.push("Copy, requirements or factual authority changed while this item was being reviewed. Inspect the current revision; no earlier approval was attached.");
            item.copy_review = held;
        }
        else
            item.copy_review = checked.review;
        return completeCopyAudit(item.copy_review, options.index(item));
    })).flat();
}
