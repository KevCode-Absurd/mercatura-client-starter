import type { AuditItem, HookGrades, HookVariant, ScriptLine } from "@/db/schema";
import { alike } from "./versions";
const total = (g: HookGrades) => g.clarity + g.relevance + g.novelty + g.specificity + g.credibility;
const goodEnough = (g: HookGrades) => g.clarity >= 3 && [g.clarity, g.relevance, g.novelty, g.specificity, g.credibility].filter((v) => v >= 4).length >= 2;
export const ungraded = (hooks: HookVariant[]) => hooks.length > 0 && hooks.every((h) => total(h.grades) === 15 && h.grades.clarity === 3 && h.grades.relevance === 3 && h.grades.novelty === 3);
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const wordsOf = (s: string) => s.toLowerCase().match(/[a-z0-9']+/g) ?? [];
export function openingNote(lines: ScriptLine[], hooks: HookVariant[]): string {
    if (!lines.length || !hooks.length || ungraded(hooks))
        return "";
    const opener = hooks.find((h) => same(h.text, lines[0].text));
    if (!opener)
        return "";
    if (goodEnough(opener.grades))
        return "**The opening.** A separate grader found line 1 good enough. Leave it unless it has one of the faults above.";
    const g = opener.grades;
    const best = hooks.filter((h) => h !== opener && goodEnough(h.grades) && total(h.grades) > total(g)).sort((a, b) => total(b.grades) - total(a.grades))[0];
    return [
        `**The opening.** A separate grader found line 1 weak (out of 5: clear ${g.clarity}, about this buyer ${g.relevance}, fresh ${g.novelty}, specific ${g.specificity}, believable ${g.credibility}). Rewrite line 1 so this buyer stops for their own situation in the first 3 seconds, in the same speaker and telling. Do it with the whole ad in view: line 2 must follow from the new line 1, and nothing later may lean on words you took out.`,
        best ? `An opening that graded stronger, as a direction and not to paste in: "${best.text}"` : "",
    ]
        .filter(Boolean)
        .join(" ");
}
export interface Opening {
    lines: ScriptLine[];
    hooks: HookVariant[];
    audit: AuditItem[];
}
export function pickOpening(lines: ScriptLine[], hooks: HookVariant[], brandName: string, opts: {
    swap?: boolean;
} = {}): Opening {
    const swap = opts.swap ?? true;
    const audit: AuditItem[] = [];
    let outLines = lines;
    let outHooks = hooks;
    if (ungraded(hooks)) {
        audit.push({ check: "hook_choice", status: "warn", message: "The hooks could not be graded this time, so the script opens on the first one. Grade them again from the script screen before choosing." });
    }
    else if (hooks.length > 1 && lines.length) {
        const at = hooks.findIndex((h) => same(h.text, lines[0].text));
        const opener = at >= 0 ? hooks[at] : null;
        const best = hooks.filter((h) => h !== opener && goodEnough(h.grades)).sort((a, b) => total(b.grades) - total(a.grades))[0];
        if (swap && opener && best && !goodEnough(opener.grades) && total(best.grades) > total(opener.grades)) {
            outLines = [{ ...lines[0], text: best.text, ...(best.overlay ? { on_screen: best.overlay } : {}) }, ...lines.slice(1)];
            outHooks = [best, ...hooks.filter((h) => h !== best)].map((h, i) => ({ ...h, id: `hk_${i + 1}` }));
            audit.push({ check: "hook_choice", status: "pass", message: `The script now opens on its best-graded hook ("${best.text.slice(0, 70)}", ${total(best.grades)} of 25). The opening it was written with ("${opener.text.slice(0, 70)}", ${total(opener.grades)} of 25) is kept as a variant. Read line 2 after it: it was written to follow the first opening.`, line_index: 0 });
        }
        else if (opener && best && (total(best.grades) - total(opener.grades) >= 4 || (!swap && !goodEnough(opener.grades) && total(best.grades) > total(opener.grades)))) {
            audit.push({ check: "hook_choice", status: "warn", message: `Another hook graded well above the opening ("${best.text.slice(0, 70)}", ${total(best.grades)} of 25 against ${total(opener.grades)}). Consider opening on it.`, line_index: 0 });
        }
    }
    const brand = brandName.trim().toLowerCase();
    outHooks.forEach((h, i) => {
        const n = wordsOf(h.text).length;
        if (n > 22)
            audit.push({ check: "hook_length", status: "warn", message: `Hook ${i + 1} is ${n} words. An opening is read or heard in about 3 seconds: 15 words or fewer lands.` });
        if (brand.length > 2 && h.text.trim().toLowerCase().startsWith(brand))
            audit.push({ check: "hook_brand_first", status: "warn", message: `Hook ${i + 1} opens on the brand's name. A stranger stops for their own situation, not for a name they don't know.` });
    });
    for (let i = 0; i < outHooks.length; i++) {
        for (let j = i + 1; j < outHooks.length; j++) {
            if (alike(outHooks[i].text, outHooks[j].text) >= 0.8 && wordsOf(outHooks[i].text).length >= 4)
                audit.push({ check: "hook_variety", status: "warn", message: `Hooks ${i + 1} and ${j + 1} are nearly the same opening. A variant is worth testing only if it is a different way in.` });
        }
    }
    return { lines: outLines, hooks: outHooks, audit };
}
