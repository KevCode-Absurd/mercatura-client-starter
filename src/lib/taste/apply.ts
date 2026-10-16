import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
import { lookToScript, lookToStudio, lookToVariety, productToLegacy, type LegacyFidelity, type LegacyProductInPicture, type LegacyScriptMode, type LegacyVariety } from "./compat";
import { ALWAYS_SKILL, decide } from "./decisions";
import { mediumOf } from "./defaults";
import { compactTaste, parseTaste } from "./schema";
import type { ContextPlan, Taste, UseCase } from "./types";
const cache = new Map<string, string>();
export function tasteSnippet(rel: string): string {
    const file = path.join(env.SKILLS_DIR, rel);
    const hit = cache.get(file);
    if (hit !== undefined)
        return hit;
    let text = "";
    try {
        text = fs.readFileSync(file, "utf-8").replace(/\r\n/g, "\n").trim();
    }
    catch {
        text = "";
    }
    cache.set(file, text);
    return text;
}
export function tasteSkillText(plan: ContextPlan, opts: {
    always?: boolean;
} = {}): string {
    const files = [...(opts.always ? [ALWAYS_SKILL] : []), ...plan.skillPath];
    return files
        .map(tasteSnippet)
        .filter(Boolean)
        .join("\n\n");
}
export function tasteBlock(plan: ContextPlan, opts: {
    always?: boolean;
    snippets?: boolean;
} = {}): string {
    const skills = opts.snippets === false ? "" : tasteSkillText(plan, opts);
    if (!plan.notes.length && !skills)
        return "";
    return ["<choices_for_this_piece>", plan.notes.length ? plan.notes.map((n) => `- ${n}`).join("\n") : "", skills, "</choices_for_this_piece>"].filter(Boolean).join("\n");
}
export const tasteSkillsUsed = (plan: ContextPlan): string[] => plan.skillPath.map((p) => p.replace(/\.md$/, ""));
export const asTaste = (raw: unknown): Taste => compactTaste(parseTaste(raw));
export const planFor = (useCase: UseCase, raw: unknown): ContextPlan => decide(useCase, asTaste(raw));
export interface StudioFields {
    variety?: LegacyVariety;
    fidelity?: LegacyFidelity;
    productInPicture?: LegacyProductInPicture;
    textOnImage?: boolean;
}
export function studioFields(taste: Taste | null | undefined, hasReference: boolean): StudioFields {
    const t = taste ?? {};
    const out: StudioFields = {};
    if (t.look) {
        const look = t.look === "reference" && !hasReference ? "between" : t.look;
        const f = lookToStudio(look);
        out.variety = f.variety;
        out.fidelity = f.fidelity;
    }
    if (t.product)
        out.productInPicture = productToLegacy(t.product);
    if (t.words === "none")
        out.textOnImage = false;
    return out;
}
export function scriptFields(taste: Taste | null | undefined, hasReference: boolean, keepWords = false): {
    variety?: LegacyVariety;
    mode?: LegacyScriptMode;
} {
    const look = taste?.look;
    if (!look)
        return {};
    if (look === "reference" && hasReference)
        return { mode: lookToScript(look, keepWords).mode, variety: 3 };
    const safe = look === "reference" ? "between" : look;
    return { variety: lookToVariety(safe), ...(hasReference ? { mode: "principles" as const } : {}) };
}
export const isWords = (u: UseCase) => mediumOf(u.surface) === "words";
