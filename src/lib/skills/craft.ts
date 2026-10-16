import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
export const CRAFT_PARTS = ["reader", "buyer", "leads", "hooks", "hook-check", "headlines", "points", "body", "close", "feed-copy", "editor", "tells", "repair", "revise", "sweep", "long-story", "picture-words"] as const;
export type CraftPart = (typeof CRAFT_PARTS)[number];
export const CRAFT_FOR: Record<string, CraftPart[]> = {
    script: ["reader", "hooks"],
    "script-flow": ["reader"],
    "studio-plan": ["headlines", "points"],
    "studio-words": ["reader", "picture-words", "headlines", "points"],
    "studio-feed": ["reader", "leads", "long-story"],
    "studio-variants": ["reader", "headlines"],
    "image-plan": ["headlines", "points"],
    "shot-plan": [],
    "sprint-plan": ["reader", "hooks"],
    "chat-copy": ["reader", "headlines", "leads"],
    "reference-hooks": ["reader", "hooks"],
    "concept-suggest": ["reader", "buyer", "hooks"],
    "persona-build": ["buyer"],
    "offer-build": ["close"],
    "offer-set": ["close"],
    "builder-start": ["buyer"],
    "lp-write": ["reader", "leads", "headlines", "body", "points", "close"],
    "copy-pass": ["editor"],
    "voice-check": ["tells"],
    "line-repair": ["repair"],
    "plan-repair": ["repair"],
    "script-revise": ["revise"],
    transpose: ["revise"],
    "hook-grade": ["hook-check"],
    "audit-judge": ["sweep"],
    "ad-review": ["sweep"],
};
export const CRAFT_FOR_SET: Record<string, CraftPart[]> = { ad: [], pdp: CRAFT_FOR["studio-plan"], photoshoot: [] };
export const CRAFT_FOR_WORDS: Record<string, CraftPart[]> = { ad: CRAFT_FOR["studio-words"] };
export const CRAFT_FOR_COPY: Record<string, CraftPart[]> = {
    headlines: ["reader", "headlines"],
    primary_text: ["reader", "leads"],
    hooks: ["reader", "hooks"],
    descriptions: [],
    captions: ["reader", "leads"],
    angles: ["reader", "buyer", "hooks"],
};
let forProcess: boolean | null = null;
export function setCopyCraft(on: boolean | null) {
    forProcess = on;
}
export const copyCraftOn = (): boolean => forProcess ?? process.env.COPY_CRAFT !== "off";
const HEAD = `## The craft of the words
How copy that sells is written, for any brand. It is the standard, not a script: take the rule, never an example's words. 3 things outrank it: this step's own rules and limits, the brand's voice, and the brand's facts. Nothing here permits a fact, a figure, a quote, a person or a deadline the brand's material does not hold. How long a piece runs is set by the step's own rules for the buyer's stage, never by this craft and never by the length of the brand's usual work. A rule here is never a reason to cut a sentence down to a fragment: a line a person would not say aloud fails whatever else it does.`;
const strip = (md: string) => md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").replace(/<!--[\s\S]*?-->\s*/g, "").trim();
export function craftText(parts: readonly CraftPart[], root: string = env.SKILLS_DIR): string {
    if (!copyCraftOn() || !parts.length)
        return "";
    const texts = parts.map((p) => {
        const file = path.join(root, "copy-craft", "parts", `${p}.md`);
        return fs.existsSync(file) ? strip(fs.readFileSync(file, "utf-8")) : "";
    });
    const have = texts.filter(Boolean);
    return have.length ? `${HEAD}\n\n${have.join("\n\n")}` : "";
}
export const craftFor = (prompt: string): string => craftText(CRAFT_FOR[prompt] ?? []);
