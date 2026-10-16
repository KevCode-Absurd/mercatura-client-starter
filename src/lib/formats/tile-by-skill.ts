import { z } from "zod";
import { env } from "../env";
import { formatLook } from "../format-media";
import { structuredJson } from "../llm/structured";
import { contextLevel } from "../llm/routing";
import { renderPrompt } from "../prompts";
import { sharedRules, skillFor } from "../skills/card";
import { formatLookReferences, formatLookText } from "../studio/format-look";
import { withoutImageList } from "../studio/request";
const Plan = z.object({
    scene: z.string().min(40),
    layout: z.string().default(""),
    text_elements: z.array(z.object({ role: z.string(), text: z.string(), placement: z.string().default("") })).max(6).default([]),
});
const Prompts = z.object({ prompts: z.array(z.object({ id: z.string(), prompt: z.string().min(40) })).min(1) });
export const tileHasSkill = (lookId: string): boolean => !!formatLookText(lookId);
export interface TileBySkill {
    refs: string[];
    prompt: string;
    scene: string;
    words: string[];
    used: string[];
}
export async function tileBySkill(n: {
    lookId: string;
    direction: string;
    product: string;
    words: boolean;
}): Promise<TileBySkill> {
    const look = formatLook(n.lookId);
    const fmt = formatLookText(n.lookId);
    if (!look || !fmt)
        throw new Error(`"${n.lookId}" has no image part to make a tile from.`);
    const refs = formatLookReferences(n.lookId);
    const roles = refs.map((r, i) => `${i + 1}. ${r.role}`);
    const plan = renderPrompt("format-example-plan", {
        format: [fmt.planner.trim(), n.words ? fmt.words.trim() : ""].filter(Boolean).join("\n\n"),
        product: n.product,
        words_rule: n.words
            ? "This is the tile of the still image. Words go on the picture as the format's own rules say. Use the words the direction gives in quotes, exactly; add at most 1 smaller line where the format asks for one. No claim, no number, no price, no brand name: the words must suit any brand."
            : "This is the tile of the video: plan 1 frame of it as a still. Nothing is written on the picture: `text_elements` is an empty list, whatever the direction or the format says about words.",
        direction: n.direction,
    });
    const planned = await structuredJson({ brandId: "_shared", task: "format_example_plan", model: env.MODEL_PLAN, system: plan.system, user: plan.user, schema: Plan, effort: "medium", maxTokens: 4000, resultBudget: { profile: "static-plan", items: 1 } });
    const texts = n.words ? planned.text_elements.filter((t) => t.text.trim()) : [];
    const level = contextLevel("format_example_prompt");
    const p = renderPrompt("studio-prompt", {
        skill: `${skillFor("image-prompt-craft", level)}${level === "full" ? sharedRules() : ""}` || "(image-prompt-craft skill not installed)",
        kind_rule: [texts.length ? "This is a static ad: finished artwork. No button." : "This is 1 frame of a video, as a still: no added text, no captions, no logos. A blank label is blank.", fmt.prompt].filter(Boolean).join("\n\n"),
        fingerprint: "(No brand: this picture is an example of a format. Name no brand colour and no brand typeface, and place no logo. Choose colours that suit the format, and for any words 1 clean typeface the format's own rules allow.)",
        truth_sheet: `The product is ${n.product}. It is closed and stays closed. Nothing shows what is inside it or what kind of product it is: no food, no sweets, no pills, no capsules anywhere in the picture. There is no photo of it: describe it in words, the same way each time.`,
        lessons: "(none)",
        image_roles: roles.length ? `The images attached to this render, numbered: ${roles.join("\n")}` : "No image is attached to this render. Write no IMAGES section.",
        aspects: "4:5 (feed)",
        plans: JSON.stringify([{ id: "tile", type: `${look.label}, as a still image`, scene: planned.scene, layout: planned.layout, text_elements: texts, images: roles }], null, 1),
    });
    const out = await structuredJson({ brandId: "_shared", task: "format_example_prompt", model: env.MODEL_PLAN, system: p.system, user: p.user, schema: Prompts, effort: "medium", maxTokens: 6000, resultBudget: { profile: "static-prompt", items: 1, verbatim: texts.map((t) => t.text) } });
    const list = roles.length ? `IMAGES ATTACHED, by role. Read them by role. Do not blend their roles.\n${roles.join("\n")}\n\n` : "";
    return { prompt: `${list}${withoutImageList(out.prompts[0].prompt)}`, scene: planned.scene, words: texts.map((t) => t.text), used: [...fmt.used, "image-prompt-craft", ...(level === "full" ? ["production-principles"] : [])], refs: refs.map((r) => r.file) };
}
