import type { Look, ProductStop, Taste } from "./types";
export type LegacyVariety = 1 | 2 | 3 | 4 | 5;
export type LegacyFidelity = "exact" | "structure" | "loose";
export type LegacyScriptMode = "exact" | "structure" | "principles";
export type LegacyProductInPicture = "auto" | "none" | "background" | "shown";
const variety = (v: unknown): LegacyVariety => {
    const n = Math.round(Number(v ?? 3));
    return (Number.isFinite(n) && n ? Math.min(5, Math.max(1, n)) : 3) as LegacyVariety;
};
export const lookToVariety = (look: Look): LegacyVariety => (look === "brand" ? 1 : look === "new" ? 5 : 3);
export const lookFromVariety = (v: unknown): Look => (variety(v) <= 2 ? "brand" : variety(v) >= 4 ? "new" : "between");
export function lookToStudio(look: Look): {
    fidelity: LegacyFidelity;
    variety: LegacyVariety;
} {
    if (look === "brand")
        return { fidelity: "loose", variety: 1 };
    if (look === "new")
        return { fidelity: "loose", variety: 5 };
    if (look === "reference")
        return { fidelity: "exact", variety: 5 };
    return { fidelity: "structure", variety: 3 };
}
export function lookFromStudio(fidelity: unknown, v: unknown, hasReference: boolean): Look {
    if (hasReference && fidelity === "exact")
        return "reference";
    if (fidelity === "exact")
        return "between";
    return lookFromVariety(v);
}
export function lookToScript(look: Look, keepWords = false): {
    mode: LegacyScriptMode;
    variety: LegacyVariety;
} {
    if (look === "reference")
        return { mode: keepWords ? "exact" : "structure", variety: 3 };
    return { mode: "principles", variety: lookToVariety(look) };
}
export function lookFromScript(mode: unknown, v: unknown, hasReference: boolean): Look {
    if (hasReference && (mode === "exact" || mode === "structure"))
        return "reference";
    return lookFromVariety(v);
}
export const productFromLegacy = (p: unknown): ProductStop | undefined => (p === "none" ? "none" : p === "background" ? "scene" : p === "shown" ? "clear" : undefined);
export const productToLegacy = (p: ProductStop | undefined): LegacyProductInPicture => (!p ? "auto" : p === "none" ? "none" : p === "scene" ? "background" : "shown");
export interface LegacyFields {
    taste?: Taste | null;
    variety?: unknown;
    fidelity?: unknown;
    reference_mode?: unknown;
    product_in_picture?: unknown;
    text_on_image?: unknown;
}
export function tasteFromLegacy(row: LegacyFields, hasReference: boolean, medium: "words" | "picture" = "picture"): Taste {
    const t: Taste = {};
    const hasLook = row.variety != null || row.fidelity != null || row.reference_mode != null;
    if (hasLook)
        t.look = medium === "words" ? lookFromScript(row.reference_mode, row.variety, hasReference) : lookFromStudio(row.fidelity, row.variety, hasReference);
    const product = productFromLegacy(row.product_in_picture);
    if (product)
        t.product = product;
    if (row.text_on_image === false)
        t.words = "none";
    return { ...t, ...(row.taste ?? {}) };
}
