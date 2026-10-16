import type { BrandBrain, Persona } from "./brand-brain";
export const WHOLE_BRAND = "brand";
export const ALL_BUYERS = "everyone";
export const NO_OFFER = "none";
export const isWholeBrand = (id: string | null | undefined): boolean => id === WHOLE_BRAND;
export const isAllBuyers = (id: string | null | undefined): boolean => id === ALL_BUYERS;
export const isNoOffer = (id: string | null | undefined): boolean => id === NO_OFFER;
export const CHOICE_LABEL = {
    [WHOLE_BRAND]: "The whole brand",
    [ALL_BUYERS]: "All buyers",
    [NO_OFFER]: "No offer",
} as const;
export const CHOICE_HELP = {
    [WHOLE_BRAND]: "About the brand, not one product.",
    [ALL_BUYERS]: "For everyone who buys from the brand, not one avatar.",
    [NO_OFFER]: "No price, no deal and no ask for the sale.",
} as const;
export const BRAND_PRODUCTS_SHOWN = 3;
type Brand = Pick<BrandBrain, "brand" | "products" | "personas">;
export function allBuyers(brand: Brand): Persona {
    const who = brand.personas.slice(0, 8);
    const language = [...new Set(who.flatMap((p) => p.language.slice(0, 2)))].slice(0, 8);
    return {
        id: ALL_BUYERS,
        name: `Everyone who buys ${brand.brand.name}`,
        summary: `All of ${brand.brand.name}'s buyers, not one kind of them. ${brand.brand.one_liner}`.trim(),
        problem: who.length ? `What they share, across ${who.map((p) => p.name).join(", ")}: ${who.map((p) => p.problem.replace(/\.$/, "")).slice(0, 4).join("; ")}. Write to what these have in common, never to one of them alone.` : "Not recorded for the brand as a whole.",
        trigger: "",
        language,
    };
}
export function buyerOf(brand: Brand, id: string | null | undefined): Persona | undefined {
    return isAllBuyers(id) ? allBuyers(brand) : brand.personas.find((p) => p.id === id);
}
export function brandFactLines(brand: Brand): string[] {
    return [
        `${brand.brand.name}${brand.brand.category ? `: ${brand.brand.category}` : ""}`,
        brand.brand.one_liner ? `The brand's own line (its facts are true; its wording is not to be repeated): ${brand.brand.one_liner}` : "",
        brand.products.length ? `What it sells: ${brand.products.map((p) => `${p.name}${p.format ? ` (${p.format})` : ""}`).join("; ")}` : "",
    ].filter(Boolean);
}
export function brandProducts<T extends {
    id: string;
}>(products: T[], most = BRAND_PRODUCTS_SHOWN): T[] {
    return products.slice(0, most);
}
export function productLabel(brand: Pick<BrandBrain, "products">, id: string | null | undefined): string {
    return isWholeBrand(id) ? CHOICE_LABEL[WHOLE_BRAND] : (brand.products.find((p) => p.id === id)?.name ?? "");
}
