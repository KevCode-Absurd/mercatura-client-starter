import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { env } from "../env";
import { loadBrandBrain } from "../brands";
import { loadCreativeKit, productImageChoices } from "../production/kit";
import { publicUrl } from "../seo/live";
import { createRun } from "../studio/engine";
import { enqueue } from "../jobs/queue";
import { PDP_TYPES } from "../library/taxonomy";
import type { Fidelity } from "../studio/reference";
import { getEvidence, requestEvidenceResource, type PageEvidence } from "./evidence";
export const pdpReferenceRoot = () => path.resolve(env.DATA_DIR, "assets", "cro-pdp-references");
export const pdpBrandKey = (brandId: string) => createHash("sha256").update(brandId).digest("hex").slice(0, 20);
export interface PdpSelection {
    url: string;
    type: string;
    direction?: string;
}
export function ownPdpEvidence(brandId: string, id: string): PageEvidence {
    const evidence = getEvidence(id);
    if (!evidence || evidence.brandId !== brandId)
        throw new Error("This page capture was not found for this brand.");
    return evidence;
}
export async function downloadPdpReference(url: string): Promise<Buffer> {
    for (let i = 0; i < 5; i++) {
        const r = await requestEvidenceResource(publicUrl(url).href);
        if (r.status >= 300 && r.status < 400 && r.headers.location) {
            url = publicUrl(r.headers.location, url).href;
            continue;
        }
        if (r.status !== 200)
            throw new Error(`Image returned HTTP ${r.status}.`);
        const image = sharp(r.body, { limitInputPixels: 40000000 });
        const meta = await image.metadata();
        if (!["jpeg", "png", "webp", "avif", "gif"].includes(meta.format ?? "") || !meta.width || !meta.height || meta.width < 150 || meta.height < 150)
            throw new Error("Choose a product photograph at least 150 pixels wide and tall.");
        return image.rotate().resize(2400, 2400, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
    }
    throw new Error("Too many redirects for this reference image.");
}
export async function importPdpReferences(brandId: string, evidenceId: string, selections: PdpSelection[]) {
    const evidence = ownPdpEvidence(brandId, evidenceId);
    if (!selections.length || selections.length > 12 || new Set(selections.map(s => s.url)).size !== selections.length)
        throw new Error("Choose 1–12 different reference images.");
    const candidates = new Set(evidence.images.map(i => i.url));
    if (selections.some(s => !candidates.has(s.url) || !PDP_TYPES.some(t => t.id === s.type)))
        throw new Error("Choose images from this captured page and a valid image purpose.");
    const dir = path.join(pdpReferenceRoot(), pdpBrandKey(brandId));
    fs.mkdirSync(dir, { recursive: true });
    const refs: {
        id: string;
        type: string;
        direction: string;
    }[] = [];
    for (const selection of selections) {
        const id = `cro_pdp_${createHash("sha256").update(`${brandId}|${selection.url}|${selection.type}`).digest("hex").slice(0, 24)}`;
        const file = path.join(dir, `${id}.png`), thumb = path.join(dir, `${id}-thumb.jpg`);
        if (!fs.existsSync(file))
            fs.writeFileSync(file, await downloadPdpReference(selection.url));
        const meta = await sharp(file).metadata();
        if (!fs.existsSync(thumb))
            await sharp(file).resize(480, 480, { fit: "inside" }).jpeg({ quality: 82 }).toFile(thumb);
        const purpose = PDP_TYPES.find(t => t.id === selection.type)!;
        const row = { library: "pdp" as const, file, thumb, type: purpose.id, group_name: purpose.group, brand: new URL(evidence.url).hostname, note: `Imported reference from ${evidence.url}. ${purpose.job}. Original image: ${selection.url}`, width: meta.width, height: meta.height, tags: { source: "live-pdp", owner_brand_id: brandId }, analyzed: false, analysis: null };
        if (!db.select().from(schema.libraryRefs).where(eq(schema.libraryRefs.id, id)).get())
            db.insert(schema.libraryRefs).values({ id, ...row }).run();
        refs.push({ id, type: selection.type, direction: selection.direction?.slice(0, 600) ?? "" });
    }
    return refs;
}
export async function createPdpFromPage(brandId: string, input: {
    evidenceId: string;
    productId: string;
    selections: PdpSelection[];
    fidelity: Fidelity;
    aspect: "1:1" | "4:5";
    textOnImage: boolean;
    notes?: string;
}) {
    const brand = loadBrandBrain(brandId);
    const product = brand.products.find(p => p.id === input.productId);
    if (!product)
        throw new Error("Select one of this brand's products.");
    const photos = productImageChoices(brandId, loadCreativeKit(brandId), product.id);
    if (!photos.files.length)
        throw new Error("Add real photos of this product to Brand Brain before recreating its images.");
    const refs = await importPdpReferences(brandId, input.evidenceId, input.selections);
    const evidence = ownPdpEvidence(brandId, input.evidenceId);
    const id = createRun({ brandId, kind: "pdp", productId: product.id, title: `${product.name}: CRO gallery`, aspects: [input.aspect], fidelity: input.fidelity, variety: input.fidelity === "loose" ? 5 : 3,
        taste: { look: input.fidelity === "exact" ? "reference" : input.fidelity === "loose" ? "new" : "between", styling: "full", product: "clear", words: input.textOnImage ? "full" : "none" },
        claimChecks: true, textOnImage: input.textOnImage,
        picks: refs.map((r, i) => ({ refId: r.id, direction: r.direction, label: `${i + 1}. ${PDP_TYPES.find(t => t.id === r.type)!.label}` })),
        notes: `CRO PDP image set. Source page: ${evidence.url}. Rebuild only the selected references, in their selected order, for ${product.name}. Competitor text, people, claims, prices, reviews and product details are reference material, never brand facts. Use the brand's real product photos, approved facts, colors and type specimen. Each frame answers its named buyer question. ${input.notes ?? ""}` });
    enqueue(brandId, "studio", id, { op: "plan" });
    return id;
}
