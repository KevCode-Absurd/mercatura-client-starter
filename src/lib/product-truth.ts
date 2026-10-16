import type { BrandBrain } from "./brand-brain";
import { onCamera, onCameraLines } from "./brain/on-camera";
import { WHOLE_BRAND, brandProducts, isWholeBrand } from "./choices";
import { AREAS, lessonsFor } from "./lessons";
import { specLine } from "./product-facts";
import type { CreativeKit } from "./production/kit";
function guideOf(brand: BrandBrain, kit: CreativeKit | null, productId: string | null | undefined) {
    const kitProducts = kit?.products ?? [];
    if (isWholeBrand(productId)) {
        const range = brandProducts(brand.products).map((p) => ({ p, g: kitProducts.find((k) => k.product_id === p.id) }));
        const said = (pick: (g: NonNullable<(typeof range)[number]["g"]>) => string) => range.map(({ p, g }) => (g && pick(g) ? `${p.name}: ${pick(g)}` : "")).filter(Boolean).join(" ");
        return { id: WHOLE_BRAND, name: brand.brand.name, format: `The whole brand, not 1 product. It sells: ${brand.products.map((p) => p.name).join("; ")}`, specs: [], variants: [], packaging: said((g) => g.packaging), details: said((g) => g.details), handling_notes: "" };
    }
    const product = brand.products.find((p) => p.id === productId) ?? brand.products[0];
    const g = kitProducts.find((k) => k.product_id === product?.id);
    return { id: product?.id ?? "", name: product?.name ?? brand.brand.name, format: product?.format ?? "", specs: product?.specs ?? [], variants: product?.variants ?? [], packaging: g?.packaging ?? "", details: g?.details ?? "", handling_notes: g?.handling_notes ?? "" };
}
export function useFactsFor(brandId: string, productId: string | null | undefined): string[] {
    return lessonsFor(brandId, { productId: isWholeBrand(productId) ? null : productId, area: [...AREAS] }).filter((l) => l.category === "product_use" && l.scope !== "general").map((l) => l.rule);
}
export function productTruthSheet(brandId: string, brand: BrandBrain, kit: CreativeKit | null, productId: string | null | undefined): string {
    const g = guideOf(brand, kit, productId);
    const facts = useFactsFor(brandId, g.id || productId);
    const avoid = kit?.visual.avoid ?? [];
    return [
        `Name: ${g.name}`,
        g.format && `Format: ${g.format}`,
        specLine(g).trim(),
        g.packaging && `As photographed: ${g.packaging}`,
        g.details && `Inside and use: ${g.details}`,
        g.handling_notes && `Handling: ${g.handling_notes}`,
        ...onCameraLines(brandId, g.name),
        facts.length && `How it is opened, held and used (facts, follow exactly):\n${facts.map((f) => `- ${f}`).join("\n")}`,
        avoid.length && `Never show: ${avoid.join("; ")}`,
    ].filter(Boolean).join("\n");
}
function writerSheet(brandId: string, brand: BrandBrain, kit: CreativeKit | null, productId: string | null | undefined): string {
    const g = guideOf(brand, kit, productId);
    const cam = onCamera(brandId, g.name);
    const handling = g.handling_notes || cam?.use || useFactsFor(brandId, g.id || productId)[0] || "";
    const avoid = kit?.visual.avoid ?? [];
    return [
        `Name: ${g.name}`,
        g.format && `Format: ${g.format}`,
        handling && `Handling: ${handling}`,
        cam?.never && `Never show (this product): ${cam.never}`,
        avoid.length && `Never show: ${avoid.join("; ")}`,
        "At most 1 shot shows the product being opened; where the story does not need it, none does.",
    ].filter(Boolean).join("\n");
}
export function cameraBlock(a: {
    brandId: string;
    brand: BrandBrain;
    kit: CreativeKit | null;
    productId: string | null | undefined;
}, who: "writer" | "planner"): string {
    const sheet = who === "writer" ? writerSheet(a.brandId, a.brand, a.kit, a.productId) : productTruthSheet(a.brandId, a.brand, a.kit, a.productId);
    if (!sheet)
        return "";
    const head = who === "writer"
        ? "## The product, as the camera will see it\nFacts for every visual_note and first_frame: a frame that shows the product follows them, and shows nothing listed under never. The plan of the shots holds the rest of how it looks and is used. The spoken words need not describe any of it."
        : "## The product, as the camera will see it\nFacts, held in every shot that shows it: open, held or in use only as these say, and nothing listed under never.";
    return `${head}\n${sheet}`;
}
