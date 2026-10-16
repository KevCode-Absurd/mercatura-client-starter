import { z } from "zod";
import { AWARENESS_STAGES } from "../taxonomy";
export const CopyRequestSchema = z.object({
    brandId: z.string().min(1),
    sourceId: z.string().min(1).max(240),
    productId: z.string().min(1),
    personaId: z.string().min(1),
    stage: z.enum(AWARENESS_STAGES),
    primaryCount: z.number().int().min(1).max(10),
    headlineCount: z.number().int().min(1).max(10),
    length: z.enum(["mixed", "short", "medium", "long"]),
    notes: z.string().trim().max(2000).default(""),
});
export type CopyRequest = z.infer<typeof CopyRequestSchema>;
export const AnalysisSchema = z.object({
    summary: z.string().min(1),
    visibleText: z.string(),
    transcript: z.string(),
    hook: z.string(),
    product: z.string(),
    offer: z.string(),
    cta: z.string(),
    limitations: z.array(z.string()),
});
export type CopyAnalysis = z.infer<typeof AnalysisSchema>;
const copyLine = z.string().trim().min(1).max(6000);
export const CopyOutputSchema = z.object({
    primaryTexts: z.array(copyLine).min(1).max(10),
    headlines: z.array(z.string().trim().min(1).max(200)).min(1).max(10),
    emojiRationale: z.string(),
    notes: z.array(z.string()),
});
export function outputSchema(primary: number, headlines: number) {
    return CopyOutputSchema.extend({
        primaryTexts: z.array(copyLine).length(primary),
        headlines: z.array(z.string().trim().min(1).max(200)).length(headlines),
    }).superRefine((value, ctx) => {
        for (const key of ["primaryTexts", "headlines"] as const) {
            const normalized = value[key].map((s) => s.toLowerCase().replace(/\s+/g, " ").trim());
            if (new Set(normalized).size !== normalized.length)
                ctx.addIssue({ code: "custom", path: [key], message: "Write distinct alternatives, not duplicate copy." });
        }
    });
}
export interface CopySource {
    id: string;
    title: string;
    kind: "image" | "video";
    preview: string;
    productId?: string;
    personaId?: string;
    stage?: string;
}
export const CopyRunSchema = z.object({
    id: z.string().uuid(),
    createdAt: z.string(),
    sourceTitle: z.string(),
    request: CopyRequestSchema,
    analysis: AnalysisSchema,
    output: CopyOutputSchema,
});
export type CopyRun = z.infer<typeof CopyRunSchema>;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
