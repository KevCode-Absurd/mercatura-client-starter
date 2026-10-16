import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
export const TEMPLATES = [
    { id: "listicle-advertorial", title: "5 reasons: Advertorial / Modern DTC", skill: "five-reasons-lp-pro", file: "five-reasons-lp-pro/five-reasons-lp-pro/reference/design-B-advertorial.html", for: "Listicle for paid traffic and bundle offers: stacked reasons with their own buttons, a bundle showcase, UGC wall, sticky add to cart" },
    { id: "listicle-editorial", title: "5 reasons: Editorial", skill: "five-reasons-lp-pro", file: "five-reasons-lp-pro/five-reasons-lp-pro/reference/design-A-editorial.html", for: "Listicle for premium, considered or gift products: magazine layout, proof tiles, product detail with free gifts" },
    { id: "listicle-editorial-example", title: "5 reasons: Editorial, worked example", skill: "five-reasons-lp-pro", file: "five-reasons-lp-pro/five-reasons-lp-pro/reference/example-editorial.html", for: "How far the editorial design can flex: numbered reasons with testimonials and a button under each" },
    { id: "five-reasons", title: "5 reasons: the original", skill: "five-reasons-lp", file: "five-reasons-lp/five-reasons-lp/reference/template-example.html", for: "The single-design listicle" },
    { id: "advertorial", title: "Long-form advertorial", skill: "advertorial-v1", file: "advertorial-v1/advertorial-v1/reference/template-example.html", for: "Story-led page for cold traffic: problem, failed alternatives, discovery, product" },
] as const;
export const WIREFRAMES = [
    { id: "product-page-mobile", title: "Product landing page, mobile", file: "product-page-mobile.webp" },
    { id: "product-page-desktop", title: "Product landing page, desktop", file: "product-page-desktop.webp" },
    { id: "home-mobile", title: "Homepage, mobile", file: "home-mobile.webp" },
    { id: "home-desktop", title: "Homepage, desktop", file: "home-desktop.webp" },
] as const;
export function referenceFile(id: string): {
    file: string;
    type: string;
} | null {
    const t = TEMPLATES.find((x) => x.id === id);
    if (t)
        return { file: path.join(env.SKILLS_DIR, t.file), type: "text/html; charset=utf-8" };
    const w = WIREFRAMES.find((x) => x.id === id);
    if (w)
        return { file: path.join(process.cwd(), "docs", "landing-pages", "wireframes", w.file), type: "image/webp" };
    return null;
}
export interface SwipeNiche {
    niche: string;
    brands: {
        name: string;
        url: string;
    }[];
}
export function swipeLibrary(): SwipeNiche[] {
    const f = path.join(env.SKILLS_DIR, "cro-brain", "cro-brain", "reference", "cro-brain-master.md");
    if (!fs.existsSync(f))
        return [];
    const text = fs.readFileSync(f, "utf-8");
    const from = text.indexOf("## 15.");
    if (from < 0)
        return [];
    const out: SwipeNiche[] = [];
    let current: SwipeNiche | null = null;
    for (const line of text.slice(from).split(/\r?\n/)) {
        const h = line.match(/^###\s+(.+?)\s+\(\d+\)/);
        if (h) {
            current = { niche: h[1].trim(), brands: [] };
            if (/[a-z]/i.test(current.niche))
                out.push(current);
            continue;
        }
        if (current)
            for (const m of line.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g))
                current.brands.push({ name: m[1], url: m[2] });
    }
    return out.filter((n) => n.brands.length);
}
const KEYS: [
    RegExp,
    string
][] = [
    [/supplement|vitamin|gumm|wellness|vms/i, "Supplements"],
    [/skin|beauty|cosmetic|makeup|hair/i, "Beauty"],
    [/drink|beverage|coffee|tea|soda/i, "Beverage"],
    [/food|snack|cereal|sauce/i, "Food"],
    [/home|kitchen|cookware|bedding|furniture/i, "Home Goods"],
    [/pet|dog|cat/i, "Pets"],
    [/kid|baby|child/i, "Kids"],
    [/jewel/i, "Jewelry"],
    [/apparel|clothing|fashion|wear/i, "Unisex Apparel"],
];
export function nicheFor(category: string): string | null {
    return KEYS.find(([re]) => re.test(category))?.[1] ?? null;
}
