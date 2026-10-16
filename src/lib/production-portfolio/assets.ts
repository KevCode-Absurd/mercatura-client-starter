import { withResourceLane } from "../production-ops/lanes";
import "server-only";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { env } from "../env";
import { brandBrainDir } from "../brand-brain";
import { getBrandRow } from "../brands";
import { inventoryCached } from "../sprint/assets";
import { readEvidence } from "../standalone/store";
import { productPhotoSheet } from "../studio/photos";
import { assessEvidence, type BoundEvidence, type EvidenceScope } from "../standalone/evidence";
export type OriginalAsset = {
    id: string;
    name: string;
    file: string;
    url: string;
    sha256: string;
    productId: string;
    market: string;
    authenticity: "original" | "generated" | "unknown";
    permission: "selected-brand-product-reference";
};
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
function contained(file: string, root: string) { const real = fs.realpathSync(file), base = fs.realpathSync(root); if (!real.startsWith(base + path.sep))
    throw new Error("Media is outside the contained asset root."); return real; }
export function originalAssets(brandId: string, scope: EvidenceScope): OriginalAsset[] { const brand = getBrandRow(brandId); if (!brand)
    throw new Error("Brand not found."); const root = path.join(brandBrainDir(brand.dir), "assets"), sheet = productPhotoSheet(brandId, null, scope.productId), inventory = inventoryCached(brandId), records = readEvidence(brandId); return sheet.photos.filter(p => p.shows && !p.locked && fs.existsSync(p.abs) && !inventory.some(a => a.file === p.rel && a.product_id && a.product_id !== scope.productId)).flatMap(p => { try {
    const file = contained(p.abs, root), hash = sha(fs.readFileSync(file)), url = `/api/brand-file/assets/${p.rel.split("/").map(encodeURIComponent).join("/")}`, record = records.find(r => r.kind === "asset" && assessEvidence(r, scope).eligible && (r.assetId === url || r.assetId === `original:${hash}`));
    return [{ id: `original:${hash}`, name: p.name, file, url, sha256: hash, productId: scope.productId, market: scope.market, authenticity: record?.authenticity ?? "unknown", permission: "selected-brand-product-reference" as const }];
}
catch {
    return [];
} }); }
async function derivativeWithinLane(brandId: string, scope: EvidenceScope, input: {
    sourceId: string;
    sourceIds?: string[];
    name?: string;
    kind?: "crop" | "cutout" | "sequence" | "composition";
    maskAlpha?: string;
    crop?: {
        left: number;
        top: number;
        width: number;
        height: number;
    };
    width?: number;
    role: "identity" | "illustration" | "real_demonstration";
}, records: BoundEvidence[]) {
    const source = originalAssets(brandId, scope).find(a => a.id === input.sourceId);
    if (!source)
        throw new Error("Choose an existing contained brand reference for this exact product and market.");
    if (input.role === "real_demonstration" && (source.authenticity !== "original" || input.kind && input.kind !== "crop" || !records.some(r => assessEvidence(r, scope).eligible && r.kind === "asset" && r.authenticity === "original" && r.assetRole === "real_demonstration" && (r.assetId === source.id || r.assetId === source.url))))
        throw new Error("A product photograph or edited illustration is not a verified demonstration; register its original demonstration provenance first.");
    const width = input.width ?? 1000;
    if (!Number.isInteger(width) || width < 100 || width > 3000)
        throw new Error("Choose a derivative width between100 and3000 pixels.");
    const kind = input.kind ?? "crop", sources = [source];
    let image = sharp(source.file).rotate();
    const meta = await image.metadata();
    if (input.crop) {
        const c = input.crop;
        if (Object.values(c).some(v => !Number.isInteger(v) || v < 0) || !c.width || !c.height || c.left + c.width > (meta.width ?? 0) || c.top + c.height > (meta.height ?? 0))
            throw new Error("Crop must stay within the original image.");
        image = image.extract(c);
    }
    if (kind === "cutout") {
        if (input.crop)
            throw new Error("Create a cutout before cropping so its supplied alpha mask matches the original pixels.");
        if (!input.maskAlpha || input.maskAlpha.length > 6000000 || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(input.maskAlpha))
            throw new Error("Supply a PNG alpha mask: white keeps original pixels, black removes background. No generated product pixels are created.");
        const mask = Buffer.from(input.maskAlpha.split(",")[1], "base64"), m = await sharp(mask).metadata();
        if (m.width !== meta.width || m.height !== meta.height)
            throw new Error("The mask must match the original dimensions exactly.");
        const alpha = await sharp(mask).greyscale().removeAlpha().raw().toBuffer();
        image = image.removeAlpha().joinChannel(alpha, { raw: { width: m.width!, height: m.height!, channels: 1 } });
    }
    if (kind === "sequence" || kind === "composition") {
        if (input.crop)
            throw new Error("Crop individual views before composing a contact sheet.");
        const ids = [...new Set([source.id, ...input.sourceIds ?? []])];
        if (ids.length < 2 || ids.length > 4)
            throw new Error("Choose two to four distinct views of this same scoped product.");
        const available = originalAssets(brandId, scope);
        sources.splice(0, sources.length, ...ids.map(id => { const a = available.find(a => a.id === id); if (!a)
            throw new Error("A composition source is missing or belongs to another product."); return a; }));
        const columns = kind === "sequence" ? sources.length : 2, rows = Math.ceil(sources.length / columns), cell = Math.floor(width / columns), height = rows * cell + 70;
        const layers = await Promise.all(sources.map(async (a, n) => ({ input: await sharp(a.file).resize({ width: cell - 20, height: cell - 45, fit: "contain", background: "#ffffff" }).png().toBuffer(), left: (n % columns) * cell + 10, top: Math.floor(n / columns) * cell + 35 })));
        const labels = `<svg width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/>${sources.map((_, n) => `<text x="${(n % columns) * cell + 12}" y="${Math.floor(n / columns) * cell + 25}" font-family="sans-serif" font-size="16">VIEW ${n + 1} · same product</text>`).join("")}<text x="12" y="${height - 25}" font-family="sans-serif" font-size="14">Illustrative view arrangement; not pack quantity, chronology or a product test.</text></svg>`;
        image = sharp(Buffer.from(labels)).composite(layers);
    }
    const bytes = await image.resize({ width, withoutEnlargement: true }).png().toBuffer(), hash = sha(bytes), dir = path.join(env.DATA_DIR, "assets", "production-portfolios", createHash("sha256").update(brandId).digest("hex"));
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, hash + ".png");
    if (!fs.existsSync(file))
        fs.writeFileSync(file, bytes, { flag: "wx" });
    const manifest = { schema: "asset-derivative/1", id: `derivative:${hash}`, name: input.name?.trim().slice(0, 120) || `${kind}: ${source.name}`, sourceId: source.id, sourceSha256: source.sha256, sources: sources.map(s => ({ id: s.id, sha256: s.sha256, productId: s.productId, market: s.market, permission: s.permission, authenticity: s.authenticity })), sha256: hash, scope, permission: source.permission, authenticity: sources.some(s => s.authenticity === "generated") ? "generated-derived" : sources.every(s => s.authenticity === "original") ? "original-derived" : "reference-derived; camera provenance unknown", role: input.role, transform: { kind, crop: input.crop ?? null, width, maskSha256: input.maskAlpha ? sha(Buffer.from(input.maskAlpha.split(",")[1], "base64")) : null }, url: `/api/assets/${path.relative(path.join(env.DATA_DIR, "assets"), file).split(path.sep).join("/")}`, warning: "A derivative preserves selected source pixels but is not a product test, chronology or proof of an outcome." };
    fs.writeFileSync(file + ".json", JSON.stringify(manifest, null, 2));
    contained(file, path.join(env.DATA_DIR, "assets"));
    return manifest;
}
export async function auditionImage(source: OriginalAsset) { const bytes = await sharp(source.file).resize({ width: 500, height: 500, fit: "inside", withoutEnlargement: true }).png().toBuffer(); return `data:image/png;base64,${bytes.toString("base64")}`; }
export async function derivative(brandId: string, scope: EvidenceScope, input: Parameters<typeof derivativeWithinLane>[2], records: BoundEvidence[]) { return withResourceLane("cpu", () => derivativeWithinLane(brandId, scope, input, records), { priority: "interactive", timeoutMs: 120000 }); }
