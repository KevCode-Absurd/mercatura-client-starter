import "server-only";
import { createHash } from "node:crypto";
import { loadBrandBrain } from "@/lib/brands";
import { guideModel } from "@/lib/brain/guide";
import { catalogProducts } from "@/lib/brain/products";
import type { SeoContext } from "./model";
export function seoContext(brandId: string): SeoContext {
    const brain = loadBrandBrain(brandId);
    const site = guideModel(brandId).site.trim();
    const websiteUrl = site ? normalizeSite(site) : undefined;
    const catalogue = catalogProducts(brandId);
    const products = brain.products.map(({ id, name, format }) => {
        const match = catalogue.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
        return { id, name, format, ...(match?.url ? { url: normalizeSite(match.url, websiteUrl) } : {}) };
    });
    return {
        brandId, brandName: brain.brand.name, category: brain.brand.category, market: brain.brand.market,
        websiteUrl, products,
        personas: brain.personas.map(({ name, problem, language }) => ({ name, problem, language })),
        claims: brain.claims.filter((c) => c.status === "substantiated").map(({ id, text, source }) => ({ id, text, source })),
        forbiddenClaims: [...brain.forbidden_claims, ...brain.claims.filter((c) => c.status !== "substantiated").map((c) => c.text)],
        voice: brain.voice.do,
        contextHash: createHash("sha256").update(JSON.stringify({ brain, websiteUrl, products })).digest("hex").slice(0, 20),
    };
}
function normalizeSite(value: string, base?: string): string | undefined {
    const href = value.match(/\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/)?.[1] ?? value;
    try {
        const url = new URL(href.startsWith("/") && base ? href : /^https?:\/\//i.test(href) ? href : `https://${href}`, base);
        if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || !url.hostname.includes("."))
            return undefined;
        url.hash = "";
        return url.href;
    }
    catch {
        return undefined;
    }
}
