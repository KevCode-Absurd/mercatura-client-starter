import type { CroRun } from "./studio-types";
import { usedCroAssets } from "./studio-assets";
import { findCurrentQualityReview, refreshQualityEvidence } from "./quality-store";
import { pageFingerprint } from "./quality";
import { reviewedExportPackage } from "./export-package";
export function assertCroExportReview(run: CroRun) {
    const review = findCurrentQualityReview(run.brandId, run.id, pageFingerprint({ run }));
    if (!review) {
        if (usedCroAssets(run).length)
            throw new Error(`Image factual review is pending. Open /landing/quality?source=${run.id}, inspect the current page, then review every enabled image before functional/theme export.`);
        return;
    }
    refreshQualityEvidence(review);
    const result = reviewedExportPackage(review);
    if (result.manifest.holds.length)
        throw new Error(`Functional/theme export is held. Open /landing/quality?id=${review.id}. ${result.manifest.holds.slice(0, 3).join(" ")}`);
}
