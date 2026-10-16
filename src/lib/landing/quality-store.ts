import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { env } from "../env";
import { qualityContext } from "../standalone/data";
import { buildEvidencePacket, reviewEvidencePacket } from "../standalone/evidence";
import { readCroRun } from "./studio-store";
import { getPage, pageHtml } from "./store";
import { landingContext } from "./context";
import { QualityBriefSchema, QualitySeoSchema, type QualityDocument, type QualityImage, type QualityQuestion } from "./quality-types";
import { pageFingerprint, promiseHeadline, qualityHash } from "./quality";
import { brandBrainDir } from "../brand-brain";
import { getBrandRow } from "../brands";
import { containedFile } from "./studio-assets";
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const folder = (brandId: string) => path.join(env.DATA_DIR, "landing-quality", createHash("sha256").update(brandId).digest("hex"));
function file(brandId: string, id: string) { if (!uuid.test(id))
    throw new Error("Invalid quality review ID."); return path.join(folder(brandId), `${id}.json`); }
export function readQualityDocument(brandId: string, id: string): QualityDocument {
    const doc = JSON.parse(fs.readFileSync(file(brandId, id), "utf8")) as QualityDocument;
    if (doc.version !== 1 || doc.id !== id || doc.brandId !== brandId || doc.run && doc.run.brandId !== brandId)
        throw new Error("Review not found for this brand.");
    return doc;
}
export function listQualityDocuments(brandId: string): QualityDocument[] {
    if (!fs.existsSync(folder(brandId)))
        return [];
    return fs.readdirSync(folder(brandId)).filter(f => f.endsWith(".json")).flatMap(f => { try {
        return [readQualityDocument(brandId, f.slice(0, -5))];
    }
    catch {
        return [];
    } }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 80);
}
export function saveQualityDocument(doc: QualityDocument, expectedRevision?: number): QualityDocument {
    if (expectedRevision !== undefined && readQualityDocument(doc.brandId, doc.id).revision !== expectedRevision)
        throw new Error("This review changed in another tab. Reload before editing.");
    const dir = folder(doc.brandId);
    fs.mkdirSync(dir, { recursive: true });
    doc.updatedAt = new Date().toISOString();
    doc.revision += 1;
    const target = file(doc.brandId, doc.id), temp = `${target}.${randomUUID()}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(doc));
    fs.renameSync(temp, target);
    const indexFile = path.join(dir, "_index.json");
    let index: {
        id: string;
        sourceId: string;
        fingerprint: string;
        updatedAt: string;
    }[] = [];
    try {
        index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
    }
    catch {
        index = listQualityDocuments(doc.brandId).map(old => ({ id: old.id, sourceId: old.source.id, fingerprint: pageFingerprint(old), updatedAt: old.updatedAt }));
    }
    index = [{ id: doc.id, sourceId: doc.source.id, fingerprint: pageFingerprint(doc), updatedAt: doc.updatedAt }, ...index.filter(old => old.id !== doc.id)].slice(0, 5000);
    const indexTemp = `${indexFile}.${randomUUID()}.tmp`;
    fs.writeFileSync(indexTemp, JSON.stringify(index));
    fs.renameSync(indexTemp, indexFile);
    return doc;
}
export function findCurrentQualityReview(brandId: string, sourceId: string, fingerprint: string): QualityDocument | null {
    const indexFile = path.join(folder(brandId), "_index.json");
    let index: {
        id: string;
        sourceId: string;
        fingerprint: string;
        updatedAt: string;
    }[] = [];
    try {
        index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
    }
    catch {
        index = listQualityDocuments(brandId).map(old => ({ id: old.id, sourceId: old.source.id, fingerprint: pageFingerprint(old), updatedAt: old.updatedAt }));
    }
    for (const entry of index.filter(entry => entry.sourceId === sourceId && entry.fingerprint === fingerprint).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
        try {
            return readQualityDocument(brandId, entry.id);
        }
        catch { }
    }
    return null;
}
export function refreshQualityEvidence(doc: QualityDocument) {
    const context = qualityContext(doc.brandId);
    const current = buildEvidencePacket({ productId: doc.brief.productId || "unbound", variant: doc.brief.variant || undefined, market: context.brain.brand.market }, context.evidence, { choices: { pageId: doc.id, purpose: doc.brief.buyerQuestion } });
    if (doc.evidence) {
        const review = reviewEvidencePacket(doc.evidence, context.evidence);
        if (!review.current) {
            const findings = [...(doc.sourceReview?.findings || []), ...review.findings].filter((f, i, all) => all.findIndex(other => other.id === f.id && other.issue === f.issue) === i);
            doc.sourceReview = { needsReview: true, invalidatedAt: doc.sourceReview?.invalidatedAt || new Date().toISOString(), snapshotFingerprint: doc.sourceReview?.snapshotFingerprint || doc.evidence.fingerprint, currentFingerprint: current.fingerprint, findings, previousPacket: doc.sourceReview?.previousPacket || doc.evidence };
            for (const edit of doc.edits)
                if (edit.resolution === "resolved")
                    edit.resolution = "needs_review";
        }
        else if (doc.sourceReview)
            doc.sourceReview.currentFingerprint = current.fingerprint;
    }
    doc.evidence = current;
    return doc;
}
export function createQualityDocument(brandId: string, input: {
    kind: "studio" | "legacy" | "html";
    id?: string;
    html?: string;
}): QualityDocument {
    const ctx = landingContext(brandId), at = new Date().toISOString();
    const run = input.kind === "studio" ? structuredClone(readCroRun(brandId, input.id || "")) : undefined;
    if (run && !run.sections.length)
        throw new Error("Save a built page before opening its quality review.");
    const legacy = input.kind === "legacy" ? getPage(input.id || "") : undefined;
    if (input.kind === "legacy" && (!legacy || legacy.brand_id !== brandId))
        throw new Error("Page not found for this brand.");
    const row = getBrandRow(brandId), photos = Object.values(ctx.photos).flat();
    const suppliedHtml = legacy ? pageHtml(legacy, { image: src => {
            const photo = photos.find(p => p.src === src && p.local);
            const local = row && photo?.local ? containedFile(path.join(brandBrainDir(row.dir), "assets"), photo.local) : null;
            if (!local)
                return src;
            const ext = path.extname(local).slice(1).toLowerCase(), mime = ext === "jpg" ? "jpeg" : ext;
            return ["png", "jpeg", "webp", "gif"].includes(mime) ? `data:image/${mime};base64,${fs.readFileSync(local).toString("base64")}` : src;
        } }, ctx) : input.kind === "html" ? input.html || "" : undefined;
    if (input.kind === "html" && (!suppliedHtml?.trim() || suppliedHtml.length > 500000))
        throw new Error("Paste a local HTML document up to 500 KB.");
    const productId = run?.request.productId || legacy?.product_id || ctx.brand.products[0]?.id || "", offer = ctx.brand.offers.find(o => o.id === legacy?.offer_id);
    const brief = QualityBriefSchema.parse({ ...(run?.request.taskBrief || legacy?.brief.taskBrief || {}), productId, promise: run?.request.adContext?.promise || (run ? promiseHeadline(run) : "") || legacy?.brief.promise || "", destination: run?.brand.productUrl || legacy?.brief.cta_url || "", terms: { productId, currency: ctx.brand.brand.currency, ...(offer ? { offerId: offer.id, price: offer.price, source: `Brand Brain offer ${offer.id}` } : {}) } });
    const questions: QualityQuestion[] = ctx.objections.slice(0, 20).map((q, i) => ({ id: `question-${i + 1}`, question: q.q, answer: q.a, priority: /fit|size|compatib|return|price|safe/i.test(q.q) ? 5 : 3, sectionId: "", source: q.source === "documents" ? "customer-avatars.md" : "local research", quote: q.q, origin: q.source === "documents" ? "document" : "research" }));
    if (!questions.length)
        questions.push({ id: "suggested-fit", question: "Does this product fit my intended use?", answer: "", priority: 5, sectionId: "", source: "", quote: "", origin: "hypothesis" });
    const images: QualityImage[] = run?.sections.flatMap(section => section.images.map(image => {
        const plan = run.storyboard?.imagePlan.find(p => p.sectionId === section.id && p.slotId === image.key), asset = run.brand.assets.find(a => a.id === image.assetId);
        const role: QualityImage["role"] = plan?.role === "proof" ? "proof" : plan?.role === "demonstration" ? "demonstration" : plan?.role === "scale" ? "scale" : plan?.role === "product-detail" || plan?.role === "ingredients" ? "detail" : plan?.role === "product-use" ? "use" : plan?.role === "variant-comparison" ? "comparison" : plan?.role === "decoration" ? "decoration" : "identity";
        return { slotId: image.key, sectionId: section.id, assetId: image.assetId, productId: asset?.productId || productId, role, provenance: asset?.id.startsWith("pdp-") || asset?.src.startsWith("/api/assets/") ? "generated" as const : "unknown" as const, source: "", evidence: "", question: plan?.purpose || section.label, mobileCrop: "unreviewed" as const, desktopCrop: "unreviewed" as const };
    })) || [];
    const doc: QualityDocument = { version: 1, id: randomUUID(), brandId, productName: ctx.brand.products.find(p => p.id === productId)?.name || "", createdAt: at, updatedAt: at, revision: 0, source: { kind: input.kind, id: input.id || "local-html", revision: run?.revision || 0, fingerprint: run ? qualityHash(run.sections) : qualityHash(suppliedHtml) }, run, suppliedHtml, brief, questions, images, observations: [], seo: QualitySeoSchema.parse({ title: run?.blueprint?.title || legacy?.title || "" }), rendered: [], edits: [] };
    refreshQualityEvidence(doc);
    doc.source.fingerprint = pageFingerprint(doc);
    return saveQualityDocument(doc);
}
