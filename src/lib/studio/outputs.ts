export function currentOutputs<T extends {
    aspect: string;
    version: number;
    selected?: boolean;
}>(outputs: T[]): T[] {
    const by = new Map<string, T>();
    for (const o of outputs) {
        const was = by.get(o.aspect);
        if (!was || (!!o.selected && !was.selected) || (!!o.selected === !!was.selected && o.version > was.version))
            by.set(o.aspect, o);
    }
    return [...by.values()];
}
export function selectOutput<T extends {
    aspect: string;
    version: number;
    path: string;
    selected?: boolean;
}>(outputs: T[], target: string): T[] {
    const selected = outputs.find((o) => o.path === target);
    if (!selected)
        throw new Error("That render is no longer in this image's history.");
    return outputs.map((o) => o.aspect === selected.aspect ? { ...o, selected: o.path === target } : o);
}
export type VisualRepair = "waxy" | "pores" | "shine" | "contact" | "product" | "custom";
export const REPAIR_LABELS: Record<VisualRepair, string> = { waxy: "Waxy or over-smoothed skin", pores: "Dark or repetitive pores", shine: "Blown-out skin highlights", contact: "A floating accessory or contact detail", product: "One product detail", custom: "Another single issue" };
const repairs: Record<VisualRepair, string> = {
    waxy: "Reduce waxy smoothing; restore subtle localized skin variation and a few fine vellus hairs. Do not add blemishes or sharpen the whole face.",
    pores: "Soften dark, evenly repeated pores. Keep naturally varied pores, slightly more visible beside the nose and less on the outer cheek. No dotted filter.",
    shine: "Soften the broad blown-out reflection while retaining gentle sheen, light direction, face shape and fine skin texture beneath it.",
    contact: "Correct only the named contact: keep the object physically attached with plausible local occlusion and a small contact shadow. Preserve its design and all other placement.",
    product: "Correct only the named packaging detail using the supplied product reference as truth. Preserve all other product features and the entire composition.",
    custom: "Correct only the single issue described below.",
};
export function visualRepairPrompt(issue: VisualRepair, area: string, note: string): string {
    if (!area.trim() || area.length > 80 || note.length > 300)
        throw new Error("Name the area and keep the repair note brief.");
    if (issue === "custom" && note.trim().length < 4)
        throw new Error("Describe one visible issue first.");
    return `Keep identity, expression, pose, crop, camera, lighting, product and unrelated details. Only repair ${area.trim()}: ${repairs[issue]}${note.trim() ? ` Detail: ${note.trim()}.` : ""} No broad retouching or artificial sharpening.`;
}
