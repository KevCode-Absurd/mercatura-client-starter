import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
export type SellingRole = "planning" | "words" | "visuals" | "editing";
export const SELLING_FOR: Record<string, SellingRole> = {
    "concept-suggest": "planning",
    "sprint-plan": "planning",
    "studio-plan": "planning",
    script: "words",
    "script-flow": "words",
    "ad-copy-flow": "words",
    "chat-copy": "words",
    "studio-words": "words",
    "studio-feed": "words",
    "studio-variants": "words",
    "script-hooks": "words",
    "reference-hooks": "words",
    "script-primary-text": "words",
    "script-hook-texts": "words",
    "lp-write": "words",
    "image-plan": "visuals",
    "shot-plan": "visuals",
    "studio-prompt": "visuals",
    "script-image-prompts": "visuals",
    "copy-pass": "editing",
    "script-revise": "editing",
};
const strip = (md: string) => md.replace(/<!--[\s\S]*?-->\s*/g, "").replace(/\r\n?/g, "\n").trim();
export function sellingText(role: SellingRole, root: string = env.SKILLS_DIR): string {
    const dir = path.join(root, "buyer-led-selling");
    const read = (rel: string) => {
        const file = path.join(dir, rel);
        return fs.existsSync(file) ? strip(fs.readFileSync(file, "utf-8")) : "";
    };
    const core = read("CARD.md");
    if (!core)
        return "";
    return [core, read(`references/${role}.md`)].filter(Boolean).join("\n\n");
}
export const sellingFor = (prompt: string): string => {
    const role = SELLING_FOR[prompt];
    return role ? sellingText(role) : "";
};
