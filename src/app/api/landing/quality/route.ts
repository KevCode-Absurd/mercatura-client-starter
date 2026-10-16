import { z } from "zod";
import { activeBrandId } from "@/lib/brand-context";
import { sameOrigin } from "@/lib/copy-builder/http";
import { createQualityDocument, listQualityDocuments, readQualityDocument, refreshQualityEvidence, saveQualityDocument } from "@/lib/landing/quality-store";
import { applyQualityChange, buyingTaskOutline, pageFingerprint, qualityHash, qualityFindings, reconcileRepairChecks, reviewOffer, seoHandoff, validateCurrentObservations } from "@/lib/landing/quality";
import { inspectQualityDocument, qualityExportHtml, qualityHtml } from "@/lib/landing/quality-browser";
import { QualityBriefSchema, QualityChangeSchema, QualityImageSchema, QualityObservationSchema, QualityQuestionSchema, QualitySeoSchema, type QualityDocument } from "@/lib/landing/quality-types";
import { readCroRun, saveCroRun } from "@/lib/landing/studio-store";
import { zip } from "@/lib/zip";
import { db, schema } from "@/db";
import { and, eq, inArray } from "drizzle-orm";
import { inventoryLandingImages, inspectLandingImageClaims, landingImageHolds } from "@/lib/landing/image-claims";
import { sectionInformationGain, previewConsolidation } from "@/lib/landing/information-gain";
import { reviewedExportPackage } from "@/lib/landing/export-package";
import { inspectExportAccessibility } from "@/lib/landing/export-quality";
export const runtime = "nodejs";
export const maxDuration = 120;
const payload = (doc: QualityDocument) => ({ doc: doc.suppliedHtml ? { ...doc, suppliedHtml: undefined } : doc, fingerprint: pageFingerprint(doc), findings: qualityFindings(doc), offer: reviewOffer(doc.brief.terms), outline: buyingTaskOutline(doc.brief, doc.questions), handoff: seoHandoff(doc), imageInventory: inventoryLandingImages(doc).map(({ bytes, src, ...image }) => ({ ...image, localBytes: !!bytes })), imageHolds: landingImageHolds(doc), informationGain: sectionInformationGain(doc) });
const fail = (e: unknown) => Response.json({ error: e instanceof Error ? e.message : "Could not complete the local page review." }, { status: 400 });
const SaveSchema = z.object({ brief: QualityBriefSchema, questions: z.array(QualityQuestionSchema).max(80), images: z.array(QualityImageSchema).max(100), seo: QualitySeoSchema });
const RequestSchema = z.discriminatedUnion("action", [
    z.object({ action: z.literal("create"), kind: z.enum(["studio", "legacy", "html"]), sourceId: z.string().max(160).optional(), html: z.string().max(500000).optional() }),
    z.object({ action: z.literal("save"), id: z.string().uuid(), revision: z.number().int(), value: SaveSchema }),
    z.object({ action: z.literal("audit"), id: z.string().uuid(), revision: z.number().int() }),
    z.object({ action: z.literal("edit"), id: z.string().uuid(), revision: z.number().int(), change: QualityChangeSchema }),
    z.object({ action: z.literal("observe"), id: z.string().uuid(), revision: z.number().int(), observations: z.array(QualityObservationSchema).max(5) }),
    z.object({ action: z.literal("apply"), id: z.string().uuid(), revision: z.number().int() }),
    z.object({ action: z.literal("image-review"), id: z.string().uuid(), revision: z.number().int(), force: z.boolean().default(false) }),
    z.object({ action: z.literal("export-audit"), id: z.string().uuid(), revision: z.number().int() }),
    z.object({ action: z.literal("consolidate"), id: z.string().uuid(), revision: z.number().int(), keepId: z.string().max(120), removeIds: z.array(z.string().max(120)).min(1).max(20), preview: z.boolean().default(true) }),
]);
export async function GET(req: Request) {
    try {
        const brandId = await activeBrandId(), q = new URL(req.url).searchParams, id = q.get("id");
        if (!id)
            return Response.json({ reviews: listQualityDocuments(brandId).map(d => ({ id: d.id, title: d.seo.title || d.run?.brand.productName || "Local HTML", updatedAt: d.updatedAt })) });
        const doc = readQualityDocument(brandId, id), format = q.get("format"), before = qualityHash({ evidence: doc.evidence, sourceReview: doc.sourceReview });
        refreshQualityEvidence(doc);
        if (before !== qualityHash({ evidence: doc.evidence, sourceReview: doc.sourceReview }))
            saveQualityDocument(doc, doc.revision);
        if (format === "html") {
            const functional = q.get("mode") === "functional";
            if (functional && reviewedExportPackage(doc).manifest.holds.length)
                throw new Error("Functional export is held: review the source, image and final package findings in Production checks first.");
            return new Response(q.get("preview") === "1" ? qualityHtml(doc) : qualityExportHtml(doc, functional ? "functional" : "passive"), { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": `sandbox${functional ? " allow-scripts" : ""}; default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; ${functional ? "script-src 'unsafe-inline'; " : ""}form-action 'none'; base-uri 'none'`, ...(q.get("preview") === "1" ? {} : { "Content-Disposition": `attachment; filename="page-${id.slice(0, 8)}.html"` }) } });
        }
        if (format === "bundle") {
            const entries = reviewedExportPackage(doc).entries;
            return new Response(new Uint8Array(zip(entries)), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="page-and-seo-${id.slice(0, 8)}.zip"` } });
        }
        return Response.json(payload(doc));
    }
    catch (e) {
        return fail(e);
    }
}
export async function POST(req: Request) {
    if (!sameOrigin(req))
        return Response.json({ error: "Invalid origin." }, { status: 403 });
    try {
        const raw = await req.text();
        if (raw.length > 800000)
            throw new Error("Request is too large.");
        const input = RequestSchema.parse(JSON.parse(raw)), brandId = await activeBrandId();
        if (input.action === "create")
            return Response.json(payload(createQualityDocument(brandId, { kind: input.kind, id: input.sourceId, html: input.html })));
        let doc = readQualityDocument(brandId, input.id);
        if (doc.revision !== input.revision)
            throw new Error("This review changed in another tab. Reload it before saving.");
        refreshQualityEvidence(doc);
        if (input.action === "save") {
            doc = { ...doc, ...input.value };
            refreshQualityEvidence(doc);
        }
        if (input.action === "audit") {
            doc.rendered = await inspectQualityDocument(doc);
            reconcileRepairChecks(doc);
        }
        if (input.action === "image-review")
            doc.imageClaims = await inspectLandingImageClaims(doc, { force: input.force });
        if (input.action === "export-audit") {
            const passive = qualityExportHtml(doc), functional = doc.source.kind !== "html" ? qualityExportHtml(doc, "functional") : null;
            doc.exportChecks = [...await inspectExportAccessibility(passive, "passive", { signal: req.signal }), ...(functional ? await inspectExportAccessibility(functional, "functional", { signal: req.signal }) : [])];
        }
        if (input.action === "consolidate") {
            const preview = previewConsolidation(doc, input.keepId, input.removeIds);
            if (input.preview)
                return Response.json({ ...payload(doc), consolidation: { holds: preview.holds, ...preview.review } });
            if (preview.holds.length)
                throw new Error(preview.holds.join(" "));
            doc = preview.candidate;
        }
        if (input.action === "edit")
            doc = applyQualityChange(doc, input.change);
        if (input.action === "observe") {
            validateCurrentObservations({ ...doc, observations: input.observations });
            doc.observations = [...doc.observations.filter(o => o.fingerprint !== pageFingerprint(doc)), ...input.observations].slice(-100);
        }
        if (input.action === "apply") {
            if (landingImageHolds(doc).length)
                throw new Error("Image factual review is unresolved; inspect every enabled image before applying the page.");
            if (!doc.run || doc.source.kind !== "studio")
                throw new Error("Only a structured CRO working copy can be applied to its saved project.");
            if (!doc.edits.length && !doc.consolidations?.length)
                throw new Error("Create and review a controlled section edit or consolidation first.");
            const current = readCroRun(brandId, doc.source.id);
            if (current.revision !== doc.source.revision || pageFingerprint({ run: current }) !== doc.source.fingerprint)
                throw new Error("The source page changed. Create a new quality review rather than overwriting those changes.");
            if (db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.ref_id, current.id), eq(schema.jobs.kind, "landing"), inArray(schema.jobs.status, ["queued", "running"]))).get())
                throw new Error("Wait for the page generation job before applying local edits.");
            const fingerprint = pageFingerprint(doc);
            if (!doc.rendered.some(r => r.fingerprint === fingerprint && r.viewport.width < 600) || !doc.rendered.some(r => r.fingerprint === fingerprint && r.viewport.width >= 1000))
                throw new Error("Run the current mobile and desktop audit before applying the working copy.");
            if (doc.edits.some(e => e.afterFingerprint === fingerprint && e.intent === "repair" && e.resolution !== "resolved"))
                throw new Error("The selected repair is still unresolved. Review the finding before applying it.");
            for (const original of current.sections) {
                const changed = doc.run.sections.find(s => s.id === original.id);
                if (JSON.stringify(original) !== JSON.stringify(changed))
                    current.revisions.push({ at: new Date().toISOString(), section: structuredClone(original) });
            }
            current.sections = structuredClone(doc.run.sections);
            if (doc.consolidations?.length) {
                current.blueprint = structuredClone(doc.run.blueprint);
                current.storyboard = structuredClone(doc.run.storyboard);
            }
            delete current.quality;
            delete current.visualReview;
            delete current.visualReviewFingerprint;
            current.stage = "Applied a locally reviewed controlled section edit. Review this revision before publishing.";
            const saved = saveCroRun(current);
            doc.run = structuredClone(saved);
            doc.source.revision = saved.revision;
            doc.source.fingerprint = pageFingerprint(doc);
        }
        return Response.json(payload(saveQualityDocument(doc, input.revision)));
    }
    catch (e) {
        return fail(e);
    }
}
