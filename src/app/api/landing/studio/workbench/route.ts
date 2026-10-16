import { z } from "zod";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { sameOrigin } from "@/lib/copy-builder/http";
import { readCroRun, listCroRuns, saveCroRun } from "@/lib/landing/studio-store";
import { SectionDesignSchema } from "@/lib/landing/studio-types";
import { retargetSection } from "@/lib/landing/studio-workbench";
import { validateSection } from "@/lib/landing/studio-render";
import { checkCroLocalExport } from "@/lib/landing/studio-local-checks";
import { createRun, getRun } from "@/lib/studio/engine";
import { completedPdpAssets } from "@/lib/landing/studio-generated";
import { syncCroImageAssignments, snapshotCroProject } from "@/lib/landing/studio-sections";
import { loadCreativeKit, productImageChoices } from "@/lib/production/kit";
import { enqueue } from "@/lib/jobs/queue";
import { startWorker } from "@/lib/jobs/worker";
export const runtime = "nodejs";
export const maxDuration = 120;
const Input = z.object({ brandId: z.string(), id: z.string().uuid(), revision: z.number().int(), action: z.enum(["local-check", "choose-section", "reuse-section", "create-slot-image", "assign-slot-image"]), sectionId: z.string().max(48).optional(), sourceRunId: z.string().uuid().optional(), sourceRevision: z.number().int().optional(), sourceSectionId: z.string().max(48).optional(), reviewNote: z.string().trim().max(4000).optional(), copy: SectionDesignSchema.shape.copy.optional(), slotId: z.string().max(48).optional(), imageRunId: z.string().regex(/^set_\d+$/).max(100).optional(), assetId: z.string().max(240).optional() });
const fail = (e: unknown) => Response.json({ error: e instanceof Error ? e.message : "Could not complete this local action." }, { status: 400 });
export async function GET(req: Request) {
    try {
        const brandId = await activeBrandId(), q = new URL(req.url).searchParams;
        if (q.get("imageRunId")) {
            const image = getRun(q.get("imageRunId")!);
            if (!image || image.brand_id !== brandId || image.kind !== "pdp")
                throw new Error("Image set not found for this brand.");
            return Response.json({ assets: completedPdpAssets(brandId, [image]) });
        }
        return Response.json({ projects: listCroRuns(brandId).filter(r => r.sections.length).map(r => ({ id: r.id, title: r.blueprint?.title || r.brand.name, productId: r.request.productId, revision: r.revision, sections: r.sections })) });
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
        if (raw.length > 100000)
            throw new Error("Request too large.");
        const input = Input.parse(JSON.parse(raw)), brandId = await activeBrandId();
        if (input.brandId !== brandId)
            throw new Error("The active brand changed. Reload this page.");
        const run = readCroRun(brandId, input.id);
        if (input.revision !== run.revision)
            throw new Error("This page changed. Reload before editing.");
        if (db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.ref_id, run.id), eq(schema.jobs.kind, "landing"), inArray(schema.jobs.status, ["queued", "running"]))).get())
            throw new Error("Wait for the page job before editing.");
        if (input.action === "local-check") {
            const checks = await checkCroLocalExport(run);
            const latest = readCroRun(brandId, run.id);
            if (latest.revision !== run.revision)
                throw new Error("The page changed during the check. Run it again on the current version.");
            run.localChecks = [...(run.localChecks || []), ...checks].slice(-20);
            return Response.json({ run: saveCroRun(run) });
        }
        if (input.action === "choose-section" || input.action === "reuse-section") {
            if (!input.reviewNote?.trim() || !input.copy)
                throw new Error("Review product facts, words, imagery and proof, then add a review note.");
            const source = readCroRun(brandId, input.sourceRunId || "");
            if (input.sourceRevision !== source.revision)
                throw new Error("The source proposal changed. Load saved proposals again before choosing a section.");
            const section = source.sections.find(s => s.id === input.sourceSectionId);
            if (!section)
                throw new Error("Source section not found.");
            if (input.action === "reuse-section" && run.sections.length >= 20)
                throw new Error("A page supports at most 20 sections.");
            const current = run.sections.find(s => s.id === input.sectionId);
            if (!current)
                throw new Error("Select the destination section.");
            if (new Set(input.copy.map(c => c.key)).size !== section.copy.length || input.copy.length !== section.copy.length || section.copy.some(c => !input.copy!.some(x => x.key === c.key)))
                throw new Error("Review every source copy field exactly once.");
            const copied = retargetSection(section, input.action === "choose-section" ? current.id : `reuse-${randomUUID().slice(0, 8)}`, input.copy, []);
            validateSection(copied);
            snapshotCroProject(run, `${input.action === "choose-section" ? "Replaced" : "Inserted"} a reviewed section from ${source.blueprint?.title || source.id}`);
            if (input.action === "choose-section") {
                run.revisions.push({ at: new Date().toISOString(), section: structuredClone(current) });
                copied.version = current.version + 1;
                run.sections = run.sections.map(s => s.id === current.id ? copied : s);
            }
            else
                run.sections.splice(run.sections.indexOf(current) + 1, 0, copied);
            const plan = run.blueprint?.sections.find(s => s.id === current.id);
            if (plan) {
                if (input.action === "reuse-section")
                    run.blueprint!.sections.splice(run.blueprint!.sections.indexOf(plan) + 1, 0, { ...structuredClone(plan), id: copied.id, label: copied.label, findingIds: [], knowledgeIds: [], referenceSectionId: "" });
                else {
                    plan.label = copied.label;
                    plan.referenceSectionId = "";
                }
            }
            if (run.storyboard) {
                if (input.action === "choose-section")
                    run.storyboard.imagePlan = run.storyboard.imagePlan.filter(p => p.sectionId !== current.id);
                const board = run.storyboard.sections.find(s => s.id === current.id);
                if (board && input.action === "reuse-section")
                    run.storyboard.sections.splice(run.storyboard.sections.indexOf(board) + 1, 0, { ...structuredClone(board), id: copied.id, label: copied.label, purpose: input.reviewNote, findingKeys: [], evidenceIds: [], knowledgeIds: [], referenceSectionId: "" });
                if (board && input.action === "choose-section") {
                    board.label = copied.label;
                    board.purpose = input.reviewNote;
                    board.evidenceIds = [];
                    board.referenceSectionId = "";
                }
                run.storyboard.visualSpec.surfaceSequence = run.storyboard.sections.map(s => s.surface);
            }
            run.reusedSections = [...(run.reusedSections || []), { sectionId: copied.id, sourceRunId: source.id, sourceSectionId: section.id, reviewNote: input.reviewNote, at: new Date().toISOString() }].slice(-40);
            delete run.quality;
            delete run.visualReview;
            run.stage = "Reviewed layout reused. Assign this product's imagery and run the local check.";
            return Response.json({ run: saveCroRun(run) });
        }
        const slot = run.storyboard?.imagePlan.find(p => p.slotId === input.slotId && p.sectionId === input.sectionId), section = run.sections.find(s => s.id === input.sectionId), image = section?.images.find(i => i.key === input.slotId);
        if (!slot || !section || !image)
            throw new Error("Choose an existing planned image slot.");
        if (slot.role === "proof")
            throw new Error("Generated imagery cannot manufacture proof.");
        if (input.action === "create-slot-image") {
            const productId = slot.productId || run.request.productId;
            if (!productId || !productImageChoices(brandId, loadCreativeKit(brandId), productId).files.length)
                throw new Error("Add real photos of the selected product first.");
            const existing = run.imageWorkOrders?.findLast(o => o.slotId === slot.slotId && o.sectionId === slot.sectionId);
            if (existing)
                return Response.json({ run, imageRunId: existing.imageRunId });
            const imageRunId = createRun({ brandId, kind: "pdp", productId, title: `${run.brand.productName}: ${slot.role}`, aspects: ["4:5"], picks: [{ bucket: "product-shot", label: slot.role, direction: `${slot.purpose}. Mobile framing: ${slot.mobileFraming}. Desktop framing: ${slot.desktopFraming}` }], textOnImage: false, claimChecks: true, auto: false, notes: `CRO project ${run.id}, section ${slot.sectionId}, slot ${slot.slotId}. Create the planned ${slot.role} image. Preserve real product packaging, logo, proportions, colours and identity. Do not invent customer proof, certifications or demonstrations of unsupported effects. ${slot.purpose}` });
            run.imageWorkOrders = [...(run.imageWorkOrders || []), { sectionId: slot.sectionId, slotId: slot.slotId, imageRunId, createdAt: new Date().toISOString() }];
            saveCroRun(run);
            enqueue(brandId, "studio", imageRunId, { op: "plan" });
            startWorker();
            return Response.json({ run, imageRunId });
        }
        const order = run.imageWorkOrders?.find(o => o.sectionId === slot.sectionId && o.slotId === slot.slotId && o.imageRunId === input.imageRunId);
        if (!order)
            throw new Error("Choose an image from this slot's work order.");
        const imageRun = getRun(order.imageRunId);
        if (!imageRun || imageRun.brand_id !== brandId)
            throw new Error("Image set not found.");
        const asset = completedPdpAssets(brandId, [imageRun]).find(a => a.id === input.assetId);
        if (!asset || asset.productId !== (slot.productId || run.request.productId))
            throw new Error("Choose a completed, checked image of the right product.");
        if (!run.brand.assets.some(a => a.id === asset.id))
            run.brand.assets.push(asset);
        run.revisions.push({ at: new Date().toISOString(), section: structuredClone(section) });
        image.assetId = asset.id;
        section.version++;
        syncCroImageAssignments(run);
        delete run.quality;
        delete run.visualReview;
        return Response.json({ run: saveCroRun(run) });
    }
    catch (e) {
        return fail(e);
    }
}
