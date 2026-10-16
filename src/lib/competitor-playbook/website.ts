import { publicFetch, publicWebsite } from "./public-fetch";
import type { CompetitorProduct } from "./types";
const absolute = (raw: unknown, base: string) => {
    try {
        return typeof raw === "string" ? publicWebsite(new URL(raw.replace(/&amp;/g, "&"), base).href).href : null;
    }
    catch {
        return null;
    }
};
export function productsFromHtml(html: string, page: string): CompetitorProduct[] {
    const products: CompetitorProduct[] = [];
    const visit = (v: unknown) => {
        if (Array.isArray(v)) {
            v.forEach(visit);
            return;
        }
        if (!v || typeof v !== "object")
            return;
        const row = v as Record<string, unknown>;
        if (row["@type"] === "Product" || (Array.isArray(row["@type"]) && row["@type"].includes("Product"))) {
            const images = (Array.isArray(row.image) ? row.image : [row.image]).map((im) => absolute(typeof im === "object" && im ? (im as {
                url?: unknown;
            }).url : im, page)).filter((s): s is string => !!s);
            if (typeof row.name === "string")
                products.push({ name: row.name.slice(0, 160), url: absolute(row.url, page) || page, images: [...new Set(images)].slice(0, 12) });
        }
        if (row["@graph"])
            visit(row["@graph"]);
        if (row.itemListElement)
            visit(row.itemListElement);
        if (row.item)
            visit(row.item);
    };
    for (const script of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
            visit(JSON.parse(script[1]));
        }
        catch { }
    }
    return products;
}
export async function scanProducts(raw: string): Promise<{
    products: CompetitorProduct[];
    notice: string;
}> {
    const site = publicWebsite(raw);
    try {
        const response = await publicFetch(`${site.origin}/products.json?limit=250`, 2 * 1024 * 1024);
        const body = JSON.parse(response.bytes.toString("utf8"));
        if (Array.isArray(body.products) && body.products.length) {
            return { products: body.products.slice(0, 250).flatMap((p: {
                    title?: unknown;
                    handle?: unknown;
                    images?: {
                        src?: unknown;
                    }[];
                }) => typeof p.title === "string" && typeof p.handle === "string" ? [{ name: p.title.slice(0, 160), url: `${site.origin}/products/${encodeURIComponent(p.handle)}`, images: (p.images ?? []).map((im) => absolute(im.src, site.href)).filter((s): s is string => !!s).slice(0, 12) }] : []), notice: "Products read from the public catalog (up to 250). Competitor photos are for context only; generation uses your own product photos." };
        }
    }
    catch { }
    const response = await publicFetch(site.href, 2 * 1024 * 1024);
    const products = productsFromHtml(response.bytes.toString("utf8"), response.url);
    return { products, notice: products.length ? "Product records read from the website's structured data. Competitor photos are context only." : "No public product catalog or product records found on this page. Add a product-page URL for more context; ads can still be used." };
}
