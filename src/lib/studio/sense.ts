import fs from "node:fs";
import { z } from "zod";
import { env } from "../env";
import { ownId } from "../llm/context";
import { geminiJson } from "../llm/gemini";
import { renderPrompt } from "../prompts";
export interface SenseItem {
    id: string;
    argument: string;
    scene: string;
    prompt: string;
}
export interface SenseProblem {
    kind: string;
    problem: string;
    fix: string;
}
const Out = z.object({
    items: z.array(z.object({ id: z.string(), problems: z.array(z.object({ kind: z.string().default("unclear"), problem: z.string().min(4), fix: z.string().default("") })).max(6).default([]) })),
});
export interface SenseRequest {
    brandId: string;
    brandName: string;
    refType: string;
    refId: string;
    truthSheet: string;
    lessons: string;
    images: string[];
    items: SenseItem[];
}
export async function senseCheck(req: SenseRequest): Promise<Map<string, SenseProblem[]>> {
    const found = new Map<string, SenseProblem[]>();
    const images = req.images.filter((f) => fs.existsSync(f)).slice(0, 3);
    for (let i = 0; i < req.items.length; i += 6) {
        const batch = req.items.slice(i, i + 6);
        const p = renderPrompt("sense-check", {
            brand_name: req.brandName,
            truth_sheet: req.truthSheet,
            lessons: req.lessons || "(none yet)",
            image_legend: images.length ? images.map((_, k) => `${k + 1}. ${k === 0 ? "The product: the real photo every image is anchored on." : "The same product, another view."}`).join("\n") : "(no product photo)",
            items: batch.map((b) => `### ${b.id}\nArgument: ${b.argument}\nScene as planned: ${b.scene}\nPrompt:\n${b.prompt}`).join("\n\n"),
        });
        const out = await geminiJson({ brandId: req.brandId, task: "sense_check", model: env.MODEL_COPY, system: p.system, user: p.user, schema: Out, images, effort: "low", maxTokens: 12000, refType: req.refType, refId: req.refId });
        for (const it of out.items) {
            const problems = it.problems.slice(0, 4);
            const id = ownId(it.id, batch.map((b) => b.id));
            if (problems.length && id)
                found.set(id, problems);
        }
    }
    return found;
}
export const senseLine = (p: SenseProblem) => `${p.problem}${p.fix ? ` Fix: ${p.fix}` : ""}`;
