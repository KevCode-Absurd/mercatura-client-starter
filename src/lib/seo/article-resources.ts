import "server-only";
import { createHash } from "node:crypto";
import { readDoc } from "../brain/docs";
import { serializeDoc } from "../brain/md";
import { loadBrandBrain } from "../brands";
import type { SeoContext } from "./model";
export type ArticleResource = {
    id: string;
    hash: string;
    title: string;
    text: string;
    url: string;
    productId: string;
    scope: string;
};
const identity = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function articleResources(ctx: SeoContext, productId: string): ArticleResource[] {
    const product = ctx.products.find(p => p.id === productId);
    if (!product)
        throw new Error("Choose a product from the active brand.");
    const brainProduct = loadBrandBrain(ctx.brandId).products.find(p => p.id === productId);
    const url = product.url ?? ctx.websiteUrl ?? "";
    const resources: ArticleResource[] = [];
    const add = (id: string, title: string, text: string, scope: string) => {
        if (text.trim().length < 30 || !url)
            return;
        resources.push({ id, title, text, hash: hash(text), url, productId, scope });
    };
    if (brainProduct) {
        const text = [brainProduct.name, brainProduct.format, brainProduct.counted,
            ...(brainProduct.ingredients ?? []).map(i => `${i.name}: ${i.dose}`),
            ...(brainProduct.specs ?? []).map(s => `${s.name}: ${s.value}`),
            brainProduct.variants?.length ? `Listed options: ${brainProduct.variants.join("; ")}` : "",
        ].filter(Boolean).join("\n\n");
        add(`catalogue:${productId}`, `${product.name} · catalogue facts`, text, `Selected product in ${ctx.market}. Review variant applicability and the current label; catalogue entries are not independent verification.`);
    }
    const loaded = readDoc(ctx.brandId, "products");
    if (loaded.exists) {
        const sections = loaded.doc.sections;
        const matches = sections.filter(s => identity(s.title) === identity(product.name));
        for (let i = 0; i < sections.length; i++) {
            if (matches.length !== 1 || identity(sections[i].title) !== identity(product.name))
                continue;
            let end = i + 1;
            while (end < sections.length && sections[end].level > sections[i].level)
                end++;
            const text = serializeDoc({ title: "", intro: [], sections: sections.slice(i, end) }).trim();
            if (text.length <= 24000)
                add(`products:${sections[i].id}`, `${product.name} · product document`, text, `Exact product heading; ${ctx.market}. Historical prices, availability, offers, studies and outcome claims require current supporting evidence. Visual staging directions are not customer experiences.`);
        }
    }
    return resources;
}
