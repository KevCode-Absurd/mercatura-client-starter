import { z } from "zod";
import { AWARENESS_STAGES } from "../taxonomy";
export const BenchmarkBriefs = z.object({
    brandId: z.string().min(1), productId: z.string().min(1),
    slots: z.array(z.object({ refId: z.string().min(1), buyer: z.string().min(1), stage: z.enum(AWARENESS_STAGES) })).min(1).max(12),
    concepts: z.array(z.string().min(1)).min(1),
});
export type BenchmarkBriefs = z.infer<typeof BenchmarkBriefs>;
export const primaryTestBrief = "Write 2 different primary texts to run with this image ad. Each should tell the buyer what they need at their stage. Let the argument decide the length.";
export async function planOnly(jobId: string, next: string, runStep: (id: string) => Promise<string>): Promise<void> {
    if (next === "plan")
        await runStep(jobId);
}
