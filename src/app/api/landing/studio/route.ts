import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { sameOrigin } from "@/lib/copy-builder/http";
import { createCroRun } from "@/lib/landing/studio-engine";
import { readCroRun, listCroRuns, saveCroRun } from "@/lib/landing/studio-store";
import { SectionDesignSchema, ReviewDecisionSchema } from "@/lib/landing/studio-types";
import { syncCroImageAssignments, duplicateCroSection, removeCroSection, restoreCroProject, reorderCroPlans, insertCroSectionPlan } from "@/lib/landing/studio-sections";
import { listReviewFindings, saveCroReview, approveCroReview, assertCroApproved } from "@/lib/landing/studio-approval";
import { validateSection } from "@/lib/landing/studio-render";
import { discoverPages, getEvidence } from "@/lib/landing/evidence";
import { studioContext } from "@/lib/landing/studio-context";
import { enqueue } from "@/lib/jobs/queue";
import { startWorker } from "@/lib/jobs/worker";
import { listAds } from "@/lib/landing/ads";
export const runtime = "nodejs";
export const maxDuration = 600;
const error = (e: unknown) => Response.json({ error: e instanceof z.ZodError ? e.issues[0]?.message : e instanceof Error ? e.message : "Could not complete the request." }, { status: 400 });
export async function GET(req: Request) {
    try {
        const brandId = await activeBrandId(), params = new URL(req.url).searchParams, id = params.get("id");
        if (id) {
            const run = readCroRun(brandId, id);
            const evidenceId = params.get("evidenceId");
            if (evidenceId) {
                const associated = run.evidence?.id === evidenceId || run.inspirationEvidence?.id === evidenceId || run.coverage.some(c => c.evidenceId === evidenceId);
                if (!associated)
                    return Response.json({ error: "Evidence not found for this page." }, { status: 404 });
                const evidence = getEvidence(evidenceId);
                if (!evidence || (evidence.brandId && evidence.brandId !== brandId))
                    return Response.json({ error: "Evidence not found for this brand." }, { status: 404 });
                return Response.json({ evidence });
            }
            const job = db.select({ id: schema.jobs.id, status: schema.jobs.status, error: schema.jobs.error }).from(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, "landing"), eq(schema.jobs.ref_id, id))).orderBy(desc(schema.jobs.created_at)).get();
            return Response.json({ run, job, reviewFindings: listReviewFindings(run) });
        }
        return Response.json({ runs: listCroRuns(brandId).map(({ id, createdAt, status, stage, blueprint, request, costUsd }) => ({ id, createdAt, status, stage, title: blueprint?.title || request.sourceUrl || "New page", pageType: request.pageType, costUsd })) });
    }
    catch (e) {
        return error(e);
    }
}
export async function POST(req: Request) {
    if (!sameOrigin(req))
        return Response.json({ error: "Invalid origin." }, { status: 403 });
    try {
        const brandId = await activeBrandId(), input = await req.json();
        if (input.brandId !== brandId)
            throw new Error("The active brand changed. Reload this page.");
        if (input.action === "discover") {
            const parsed = z.object({ url: z.string().max(2048).optional() }).parse(input);
            const url = parsed.url || studioContext(brandId).snapshot.siteUrl;
            if (!url)
                throw new Error("Add your website in Brand Brain.");
            return Response.json({ pages: await discoverPages(url) });
        }
        if (input.action === "create") {
            let adContext;
            if (input.adId) {
                const ad = listAds(brandId).find(a => a.id === input.adId && a.origin !== "account");
                if (!ad)
                    throw new Error("Select a saved creative or script belonging to this brand.");
                const offer = studioContext(brandId).ctx.brand.offers.find(o => o.id === ad.offer_id);
                adContext = { id: ad.id, title: ad.title, productId: ad.product_id || "", personaId: ad.persona_id || "", promise: ad.headline || ad.hooks[0] || ad.angle, offer: offer ? [offer.name, offer.price, offer.notes].filter(Boolean).join(" · ") : "", awareness: ad.awareness };
            }
            const run = adContext ? createCroRun(brandId, { ...input, build: false }, adContext) : createCroRun(brandId, { ...input, build: false });
            const jobId = enqueue(brandId, "landing", run.id, { op: "cro" });
            startWorker();
            return Response.json({ run, jobId });
        }
        const edit = z.object({ id: z.string().uuid(), action: z.enum(["build", "retry", "redesign", "save", "restore", "refresh-assets", "check-layout", "save-review", "approve-review", "duplicate-section", "remove-section", "restore-project", "insert-section"]), revision: z.number().int(), sectionId: z.string().optional(), afterSectionId: z.string().optional(), label: z.string().trim().min(1).max(120).optional(), projectRevisionId: z.string().uuid().optional(), redesignKind: z.enum(["copy", "layout", "images", "all"]).optional(), note: z.string().max(4000).optional(), sections: z.array(SectionDesignSchema.extend({ id: z.string(), label: z.string(), enabled: z.boolean(), version: z.number() })).max(20).optional(), version: z.number().optional(), decisions: z.array(ReviewDecisionSchema).max(512).optional(), customerNotes: z.string().max(6000).optional(), redesignMode: z.enum(["targeted", "full"]).optional(), selectedDirectionId: z.string().max(120).optional() }).parse(input);
        const run = readCroRun(brandId, edit.id);
        const busy = db.select({ id: schema.jobs.id }).from(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.ref_id, run.id), eq(schema.jobs.kind, "landing"), inArray(schema.jobs.status, ["queued", "running"]))).get();
        if (busy)
            throw new Error("This page is still being worked on. Wait or stop its job before editing.");
        if (edit.revision !== run.revision)
            throw new Error("This page changed. Reload to keep the latest version.");
        if (["duplicate-section", "remove-section", "restore-project"].includes(edit.action)) {
            if (edit.action === "restore-project")
                restoreCroProject(run, edit.projectRevisionId || "");
            else if (edit.action === "duplicate-section")
                duplicateCroSection(run, edit.sectionId || "");
            else
                removeCroSection(run, edit.sectionId || "");
            return Response.json({ run: saveCroRun(run) });
        }
        if (edit.action === "save-review" || edit.action === "approve-review") {
            if (edit.decisions !== undefined || edit.customerNotes !== undefined || edit.redesignMode !== undefined || edit.selectedDirectionId !== undefined)
                saveCroReview(run, { decisions: edit.decisions ?? run.review?.decisions ?? [], customerNotes: edit.customerNotes ?? run.review?.customerNotes ?? "", redesignMode: edit.redesignMode ?? run.review?.redesignMode ?? run.request.redesignMode ?? "full", selectedDirectionId: edit.selectedDirectionId ?? run.review?.selectedDirectionId ?? "" });
            else if (edit.action === "save-review")
                throw new Error("Provide review decisions or customer notes.");
            if (edit.action === "approve-review") {
                approveCroReview(run);
                run.stage = "Review approved. Ready to build accepted changes.";
            }
            else
                run.stage = "Review decisions saved. Explicit approval is still required.";
            return Response.json({ run: saveCroRun(run), reviewFindings: listReviewFindings(run) });
        }
        if (edit.action === "refresh-assets") {
            const fresh = studioContext(brandId, run.request.productId).snapshot.assets;
            const ids = new Set(run.brand.assets.map(a => a.id));
            const added = fresh.filter(a => !ids.has(a.id));
            run.brand.assets.push(...added);
            return Response.json({ run: saveCroRun(run), added: added.length });
        }
        if (edit.action === "save") {
            if (!edit.sections || edit.sections.length !== run.sections.length || new Set(edit.sections.map(s => s.id)).size !== run.sections.length)
                throw new Error("Invalid section collection.");
            for (const section of edit.sections) {
                const previous = run.sections.find(s => s.id === section.id);
                if (!previous)
                    throw new Error("Unknown section.");
                validateSection(section);
                if (section.html !== previous.html || section.css !== previous.css)
                    throw new Error("Use Redesign for layout changes.");
                if (section.images.some(i => i.assetId && !run.brand.assets.some(a => a.id === i.assetId)))
                    throw new Error("Choose an image from this brand.");
                section.version = previous.version;
                const changed = section.label !== previous.label || section.enabled !== previous.enabled || JSON.stringify(SectionDesignSchema.parse(section)) !== JSON.stringify(SectionDesignSchema.parse(previous));
                if (changed) {
                    run.revisions.push({ at: new Date().toISOString(), section: previous });
                    section.version = previous.version + 1;
                }
            }
            reorderCroPlans(run, edit.sections.map(s => s.id));
            run.sections = edit.sections;
            syncCroImageAssignments(run);
            delete run.quality;
            delete run.visualReview;
            return Response.json({ run: saveCroRun(run) });
        }
        if (edit.action === "restore") {
            const saved = run.revisions.findLast(r => r.section.id === edit.sectionId && r.section.version === edit.version);
            if (!saved)
                throw new Error("Saved section version not found.");
            const current = run.sections.find(s => s.id === edit.sectionId)!;
            run.revisions.push({ at: new Date().toISOString(), section: current });
            run.sections = run.sections.map(s => s.id === edit.sectionId ? { ...saved.section, version: current.version + 1 } : s);
            delete run.quality;
            delete run.visualReview;
            return Response.json({ run: saveCroRun(run) });
        }
        if (edit.action === "redesign" && (!edit.sectionId || !edit.note?.trim() || !run.sections.some(s => s.id === edit.sectionId)))
            throw new Error("Select a section and describe your change.");
        if (edit.action === "check-layout" && !run.sections.length)
            throw new Error("Build the page before checking its layout.");
        const revisionSchema = z.object({ sectionId: z.string().min(1).max(48), note: z.string().min(1).max(4000), kind: z.enum(["copy", "layout", "images", "all"]).optional(), insert: z.boolean().optional() });
        let queuedRevision: z.infer<typeof revisionSchema> | undefined = edit.action === "redesign" ? { sectionId: edit.sectionId!, note: edit.note!, kind: edit.redesignKind ?? "all" } : undefined;
        let validateOnly = edit.action === "check-layout";
        if (edit.action === "retry") {
            const last = db.select({ payload: schema.jobs.payload }).from(schema.jobs).where(and(eq(schema.jobs.brand_id, brandId), eq(schema.jobs.kind, "landing"), eq(schema.jobs.ref_id, run.id), inArray(schema.jobs.status, ["failed", "paused", "stopped"]))).orderBy(desc(schema.jobs.created_at)).get();
            if (last) {
                const resumed = z.object({ op: z.literal("cro"), revision: revisionSchema.optional(), validateOnly: z.boolean().optional() }).safeParse(last.payload);
                if (!resumed.success)
                    throw new Error("The saved retry request is invalid. Start a new explicit action instead.");
                queuedRevision = resumed.data.revision;
                validateOnly = resumed.data.validateOnly === true && !queuedRevision;
            }
        }
        if (edit.action === "build" || edit.action === "insert-section" || queuedRevision || (edit.action === "retry" && run.request.build && !validateOnly))
            assertCroApproved(run);
        if (edit.action === "insert-section") {
            const sectionId = insertCroSectionPlan(run, edit.label || "", edit.note || "", edit.afterSectionId || "");
            queuedRevision = { sectionId, note: edit.note!, kind: "all", insert: true };
        }
        if (edit.action === "build")
            run.request.build = true;
        run.status = "queued";
        run.stage = queuedRevision ? "Section revision queued" : validateOnly ? "Free layout check queued" : "Work queued";
        delete run.error;
        saveCroRun(run);
        const jobId = enqueue(brandId, "landing", run.id, { op: "cro", ...(queuedRevision ? { revision: queuedRevision } : {}), ...(validateOnly ? { validateOnly: true } : {}) });
        startWorker();
        return Response.json({ run, jobId });
    }
    catch (e) {
        return error(e);
    }
}
