import type { BrandBrain } from "./brand-brain";
type Product = BrandBrain["products"][number];
export const specsText = (p: Pick<Product, "specs">) => (p.specs ?? []).filter((s) => s.name.trim() && s.value.trim()).map((s) => `${s.name.trim()}: ${s.value.trim()}`).join("; ");
export const variantsText = (p: Pick<Product, "variants">) => (p.variants ?? []).map((v) => v.trim()).filter(Boolean).join(", ");
export function specLine(p: Pick<Product, "specs" | "variants">): string {
    const s = specsText(p);
    const v = variantsText(p);
    return `${s ? ` Specs: ${s}.` : ""}${v ? ` Comes in: ${v}.` : ""}`;
}
