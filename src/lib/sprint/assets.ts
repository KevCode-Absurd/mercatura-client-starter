import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { SprintAsset } from "@/db/schema";
import { brandBrainDir, type BrandBrain } from "../brand-brain";
import { getBrandRow } from "../brands";
import { env } from "../env";
import { geminiEnabled, geminiJson } from "../llm/gemini";
import type { CreativeKit } from "../production/kit";
const assetsDir = (brandId: string) => {
    const row = getBrandRow(brandId);
    if (!row)
        throw new Error(`Brand ${brandId} not found`);
    return path.join(brandBrainDir(row.dir), "assets");
};
const cacheFile = (brandId: string) => path.join(path.dirname(assetsDir(brandId)), "assets-cache.json");
export const assetAbs = (brandId: string, rel: string) => path.join(assetsDir(brandId), ...rel.split("/"));
const Seen = z.object({
    type: z.enum(["packshot", "bundle", "lifestyle", "in_use", "contents", "infographic", "merch", "other"]).catch("other"),
    product_id: z.string().default(""),
    shows_pack: z.boolean().default(false),
    has_added_text: z.boolean().default(false),
    people: z.enum(["none", "adult", "child"]).catch("none"),
    licensed_character: z.boolean().default(false),
    single_unit: z.boolean().optional().catch(undefined),
    description: z.string().default(""),
});
type Cache = Record<string, {
    size: number;
    seen: z.infer<typeof Seen>;
}>;
export function listAssetFiles(brandId: string): string[] {
    const root = assetsDir(brandId);
    if (!fs.existsSync(root))
        return [];
    const out: string[] = [];
    for (const d of fs.readdirSync(root, { withFileTypes: true })) {
        if (!d.isDirectory())
            continue;
        for (const f of fs.readdirSync(path.join(root, d.name)).sort())
            if (/\.(webp|png|jpe?g)$/i.test(f))
                out.push(`${d.name}/${f}`);
    }
    return out;
}
const toAsset = (file: string, s: z.infer<typeof Seen>): SprintAsset => ({
    file,
    ...s,
    lead: (s.type === "packshot" || s.type === "bundle") && s.shows_pack && !s.has_added_text && s.people !== "child" && !s.licensed_character && !!s.product_id,
    extra: (s.type === "in_use" || s.type === "contents" || s.type === "lifestyle") && !s.has_added_text && s.people !== "child" && !s.licensed_character && !!s.product_id,
});
export async function inventory(brandId: string, brand: BrandBrain, kit: CreativeKit | null, refId: string): Promise<SprintAsset[]> {
    const files = listAssetFiles(brandId);
    if (!geminiEnabled()) {
        return files.map((file) => {
            const [folder, name] = file.split("/");
            const prod = kit?.products.find((p) => p.asset_folder === folder);
            const hero = !!prod && prod.hero_image === name;
            return toAsset(file, { type: hero ? "packshot" : "other", product_id: prod?.product_id ?? "", shows_pack: hero, has_added_text: false, people: "none", licensed_character: false, description: hero ? "The product photo the creative kit chose." : "Not looked at (mock mode)." });
        });
    }
    const cache: Cache = fs.existsSync(cacheFile(brandId)) ? (JSON.parse(fs.readFileSync(cacheFile(brandId), "utf-8")) as Cache) : {};
    const products = brand.products.map((p) => `- ${p.id}: ${p.name} (${p.format})`).join("\n");
    const todo = files.filter((f) => cache[f]?.size !== fs.statSync(assetAbs(brandId, f)).size);
    let next = 0;
    const failed: string[] = [];
    await Promise.all(Array.from({ length: Math.min(4, todo.length) }, async () => {
        for (;;) {
            const file = todo[next++];
            if (!file)
                return;
            try {
                const seen = await geminiJson({
                    brandId,
                    task: "sprint_inventory",
                    model: env.MODEL_REFERENCE,
                    system: `You file 1 image from an ecommerce brand's own asset folder, so an ad planner knows what it can be used for. Look at the image and return JSON:
- type: "packshot" (the product on its own, as it is sold, on a plain or gradient background, nothing else), "bundle" (several of the product, or a set of the brand's products, on a plain background), "lifestyle" (the product in a real place), "in_use" (the product being opened, held, worn, used or eaten), "contents" (what is inside the packaging, or what the product is made of, shown on its own or in a hand), "infographic" (a designed image: headlines, statistics, review cards, callouts, a comparison), "merch" (clothing or accessories, not the product), "other".
- product_id: which exact product and variant from the list is in the image. Printed flavour, colour, size and audience take precedence over its folder: product pages often include cross-sell images of other products. Never map a different named flavour to Original just because it is in the Original folder. Use "" if no listed product matches the pictured variant, or the identity is uncertain.
- shows_pack: true if the product itself, as it is sold (in its packaging when it is sold in one), is fully visible and sharp enough to copy its shape, colours and any label.
- has_added_text: true if there is designed text on the image other than what is printed on the product or its packaging.
- people: "child" if anyone in it is or looks under 18, "adult" if only adults (a hand counts), "none".
- licensed_character: true if a film, television, game or cartoon character appears anywhere, including printed on the product or its packaging.
- single_unit: true only for a product that is sold as a pack of smaller units (its line in the list says so: a pouch of sachets, a box of bars, a pack of sticks) when the image shows exactly 1 of those units, closed and on its own, without the pack they come in. false for everything else.
- description: 1 sentence on exactly what is in the image: how many of the product, which variant each is (the flavour, colour or size words printed on it), the background, any hands.`,
                    user: `Brand: ${brand.brand.name}\nProducts:\n${products}\n\nFolder: ${file.split("/")[0]}\nFile: ${file.split("/")[1]}`,
                    schema: Seen,
                    images: [assetAbs(brandId, file)],
                    effort: "low",
                    maxTokens: 1200,
                    refType: "sprint",
                    refId,
                });
                cache[file] = { size: fs.statSync(assetAbs(brandId, file)).size, seen: { ...seen, product_id: brand.products.some((p) => p.id === seen.product_id) ? seen.product_id : "" } };
            }
            catch (e) {
                failed.push(`${file}: ${(e as Error).message.slice(0, 80)}`);
            }
        }
    }));
    for (const f of Object.keys(cache))
        if (!files.includes(f))
            delete cache[f];
    fs.writeFileSync(cacheFile(brandId), `${JSON.stringify(cache, null, 2)}\n`, "utf-8");
    if (failed.length && failed.length === todo.length && !Object.keys(cache).length)
        throw new Error(`The product photos could not be read: ${failed[0]}`);
    return files.filter((f) => cache[f]).map((f) => toAsset(f, cache[f].seen));
}
export function inventoryCached(brandId: string): SprintAsset[] {
    try {
        if (!fs.existsSync(cacheFile(brandId)))
            return [];
        const cache = JSON.parse(fs.readFileSync(cacheFile(brandId), "utf-8")) as Cache;
        return listAssetFiles(brandId).filter((f) => cache[f]).map((f) => toAsset(f, Seen.parse(cache[f].seen)));
    }
    catch {
        return [];
    }
}
export function unreadAssets(brandId: string): number {
    try {
        const cache = fs.existsSync(cacheFile(brandId)) ? (JSON.parse(fs.readFileSync(cacheFile(brandId), "utf-8")) as Cache) : {};
        return listAssetFiles(brandId).filter((f) => !cache[f]).length;
    }
    catch {
        return 0;
    }
}
export function followMoves(brandId: string, moves: {
    from: string;
    to: string;
}[]) {
    if (!moves.length || !fs.existsSync(cacheFile(brandId)))
        return;
    const cache = JSON.parse(fs.readFileSync(cacheFile(brandId), "utf-8")) as Cache;
    for (const m of moves) {
        if (!cache[m.from])
            continue;
        cache[m.to] = cache[m.from];
        delete cache[m.from];
    }
    fs.writeFileSync(cacheFile(brandId), `${JSON.stringify(cache, null, 2)}\n`, "utf-8");
}
export function ownDesigned(assets: SprintAsset[], productId: string, limit = 2): string[] {
    const ok = assets.filter((a) => a.has_added_text && a.people !== "child" && !a.licensed_character && a.type !== "merch");
    const rank = (a: SprintAsset) => Number(a.product_id === productId) * 2 + Number(a.type === "infographic");
    return [...ok].sort((a, b) => rank(b) - rank(a) || a.file.localeCompare(b.file)).slice(0, limit).map((a) => a.file);
}
export function photosFor(assets: SprintAsset[], kit: CreativeKit, productId: string): {
    leads: SprintAsset[];
    extras: SprintAsset[];
} {
    const prod = kit.products.find((p) => p.product_id === productId);
    const hero = prod ? `${prod.asset_folder}/${prod.hero_image}` : "";
    const mine = assets.filter((a) => a.product_id === productId);
    const own = mine.filter((a) => a.lead && !!prod && a.file.startsWith(`${prod.asset_folder}/`));
    const leads = (own.length ? own : mine.filter((a) => a.lead)).sort((a, b) => Number(b.file === hero) - Number(a.file === hero) || Number(a.type === "bundle") - Number(b.type === "bundle") || a.file.localeCompare(b.file));
    if (!leads.length && hero && assets.some((a) => a.file === hero))
        leads.push(assets.find((a) => a.file === hero)!);
    return { leads, extras: mine.filter((a) => a.extra) };
}
