import { createHash } from "node:crypto";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "../env";
import { guideModel } from "../brain/guide";
import { catalogProducts } from "../brain/products";
import { listBrandFonts } from "../brand-fonts";
import { landingContext } from "./context";
import { themeFrom } from "./theme";
import type { CroBrandSnapshot } from "./studio-types";
import { completedPdpAssets } from "./studio-generated";
import { containedFile } from "./studio-assets";
export function siteAddress(value: string, base = ""): string {
    const raw = value.match(/\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/)?.[1] ?? value.trim();
    if (!raw)
        return "";
    try {
        const url = new URL(raw.startsWith("/") && base ? raw : /^https?:\/\//.test(raw) ? raw : `https://${raw}`, base || undefined);
        return /^(http|https):$/.test(url.protocol) && !url.username && !url.password ? url.href : "";
    }
    catch {
        return "";
    }
}
export function studioContext(brandId: string, productId = "") {
    const ctx = landingContext(brandId), guide = guideModel(brandId), catalogue = catalogProducts(brandId);
    const siteUrl = siteAddress(ctx.look?.site_url || guide.site);
    const products = ctx.brand.products.map((p) => ({ ...p, url: siteAddress(catalogue.find((x) => x.name.trim().toLowerCase() === p.name.trim().toLowerCase())?.url || "", siteUrl) }));
    const product = products.find((p) => p.id === productId) ?? products[0];
    const theme = themeFrom(ctx.look);
    const fonts = listBrandFonts(brandId).map(({ family, weight, style, file }) => ({ family, weight, style, file }));
    const tokens = { ink: theme.ink, paper: theme.paper, primary: theme.primary, accent: theme.accent, surface: theme.surface, muted: theme.muted, cta: theme.cta, "cta-ink": theme.ctaText, "font-heading": theme.fontHeading, "font-body": theme.fontBody, "weight-heading": ctx.look?.fonts.find((f) => f.role === "heading")?.weight || "700", "weight-body": ctx.look?.fonts.find((f) => f.role === "body")?.weight || "400", radius: theme.radius };
    const fontTokens: Record<string, string> = {};
    for (const role of ["heading", "body", "button"] as const) {
        const font = ctx.look?.fonts.find(f => f.role === role);
        fontTokens[`style-${role}`] = font?.style === "italic" ? "italic" : "normal";
        fontTokens[`tracking-${role}`] = font?.tracking && /^(normal|-?[\d.]+(?:px|em|rem))$/.test(font.tracking) ? font.tracking : "normal";
        fontTokens[`case-${role}`] = font?.letter_case === "uppercase" ? "uppercase" : font?.letter_case === "lowercase" ? "lowercase" : "none";
        if (role === "button") {
            fontTokens["font-button"] = font ? `'${font.family.replace(/['";{}<>\\]/g, "")}', sans-serif` : theme.fontBody;
            fontTokens["weight-button"] = font?.weight || "700";
        }
    }
    Object.assign(tokens, fontTokens);
    const generated = completedPdpAssets(brandId, db.select().from(schema.studioRuns).where(and(eq(schema.studioRuns.brand_id, brandId), eq(schema.studioRuns.kind, "pdp"))).all()).filter(a => containedFile(path.join(env.DATA_DIR, "assets"), decodeURIComponent(a.src.slice("/api/assets/".length))));
    const assets = [...Object.entries(ctx.photos).flatMap(([pid, photos]) => photos.map((p, i) => ({ id: `asset-${pid}-${i}`, src: p.src, local: p.local, name: p.name, productId: pid }))), ...generated];
    const hash = createHash("sha256").update(JSON.stringify({ brand: ctx.brand, guide, fonts, assets, products })).digest("hex");
    const snapshot: CroBrandSnapshot = { name: ctx.brand.brand.name, category: ctx.brand.brand.category, siteUrl, productUrl: product?.url || siteUrl, productName: product?.name || "", productHandle: product?.url.match(/\/products\/([^/?#]+)/)?.[1] || "", currency: ctx.brand.brand.currency, tokens, fonts, assets, hash, products: products.map(({ id, name, url }) => ({ id, name, url })) };
    return { ctx, guide, products, product, snapshot };
}
