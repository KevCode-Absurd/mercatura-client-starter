import { acceptedRepairBrief } from "../standalone/runtime";
import type { LabDraft } from "./types";
export function labFeedbackFormats(draft: Pick<LabDraft, "mode" | "grammar">): string[] {
    if (draft.mode === "static")
        return ["static"];
    if (draft.mode === "silent_video")
        return ["silent_video", `silent_video:${draft.grammar}`];
    return ["video", draft.grammar];
}
export function labAcceptedRepairs(brandId: string, draft: Pick<LabDraft, "productId" | "name" | "mode" | "grammar">) {
    const repairs = labFeedbackFormats(draft).flatMap(format => acceptedRepairBrief(brandId, { productId: draft.productId, campaign: draft.name, format }));
    return [...new Map(repairs.map(repair => [repair.id, repair])).values()];
}
