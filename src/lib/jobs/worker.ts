import { buildOfferSet } from "../builder/offer-set";
import { releaseRunReferences } from "../competitor-playbook/store";
import { runAvatarGeneration } from "../avatar-studio/engine";
import { writeStarter } from "../builder/starter";
import { writeKit } from "../builder/kit";
import type { ScriptKit } from "../builder/types";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { BudgetExceededError, LlmDisabledError, llmEnabled } from "../llm/gateway";
import { extractItem } from "../pipeline/extract";
import { preprocessItem } from "../pipeline/preprocess";
import { checkJobClaims, createJob, redoFrame, regenerateCharacterViews, regenerateStage, runStep } from "../production/engine";
import { analyzeReference } from "../references/analyze";
import { readReference } from "../references/reading";
import { writeHooks as writeReferenceHooks } from "../references/hooks";
import { runChatTurn } from "../chat/run";
import { stepJob } from "../chat/tools";
import type { ReferenceMode, ScriptAxes, TextLayer } from "@/db/schema";
import type { OutputType } from "../taxonomy";
import type { ProductInPicture } from "../product-in-picture";
import { generateScript, transposeScript } from "../scripts/engine";
import { makeSprint, renderSprint, writeBriefs } from "../sprint/engine";
import { checkRun, getRun, makeBase, planRun, renderRun } from "../studio/engine";
import { LayersSchema } from "../studio/overlay";
import { writeVariants } from "../studio/variants";
import { writeStaticCopy } from "../studio/static-copy";
import { clusterBrand } from "../themes";
import { buildAndDraw, drawPersona } from "../personas/build";
import { drawAvatar } from "../avatars/draw";
import { fillMissingDoubts } from "../personas/doubts-fill";
import { buildOffers } from "../offers/build";
import { researchIndustry } from "../offers/research";
import type { Mechanic } from "../offers/types";
import { writePage } from "../landing/write";
import { runScan } from "../landing/scans";
import { RunStoppedError, withJob } from "../llm/run-control";
import { checkpoint } from "../llm/run-control";
import { driveProduction } from "../production/workflow";
import { approveStage } from "../production/engine";
import { parseTaste } from "../taste/schema";
import type { Taste } from "../taste/types";
import { claimNext, clearFailed, enqueue, failQueued, finishJob, itemsPending, deferClaimedJob } from "./queue";
import { heartbeatLease, liveLease, releaseJobLease } from "../production-ops/leases";
import { ProviderDeferredError } from "../production-ops/attempts";
const CONCURRENCY = 12;
const POLL_MS = 600;
async function run(job: typeof schema.jobs.$inferSelect): Promise<void> {
    if (job.kind === "seo_batch") {
        const { runSeoBatch } = await import("../production-ops/seo-batch");
        await runSeoBatch(job.brand_id, job.ref_id!);
        return;
    }
    if (job.kind === "campaign") {
        const { runCampaign } = await import("../production-ops/campaigns");
        await runCampaign(job.brand_id, job.ref_id!);
        return;
    }
    if (job.kind === "avatar_pack_frame") {
        const { runPackFrame } = await import("../avatar-packs/engine");
        await runPackFrame(job.id);
        return;
    }
    if (job.kind === "creator_discovery") {
        const { runCreatorDiscovery } = await import("../creator-discovery/engine");
        await runCreatorDiscovery(job.brand_id, job.ref_id!);
        return;
    }
    if (job.kind === "avatar_studio") {
        await runAvatarGeneration(job.id);
        return;
    }
    if (job.kind === "preprocess") {
        await preprocessItem(job.ref_id!);
        if (job.payload.extract) {
            if (llmEnabled())
                enqueue(job.brand_id, "extract", job.ref_id!, {});
        }
        return;
    }
    if (job.kind === "extract") {
        await extractItem(job.ref_id!);
        return;
    }
    if (job.kind === "cluster") {
        await clusterBrand(job.ref_id!, job.payload.mode === "full" ? "full" : "incremental");
        return;
    }
    if (job.kind === "production") {
        const p = job.payload as {
            op?: string;
            stage?: "plan" | "character" | "look" | "storyboard";
            feedback?: string;
            frame?: number;
            views?: number[];
            keep?: boolean;
        };
        if (p.op === "character_views")
            await regenerateCharacterViews(job.ref_id!, p.views ?? [], p.feedback ?? "");
        else if (p.op === "regenerate" && p.stage)
            await regenerateStage(job.ref_id!, p.stage, p.feedback ?? "", { keep: p.keep === true });
        else if (p.op === "frame" && typeof p.frame === "number")
            await redoFrame(job.ref_id!, p.frame, p.feedback ?? "", { keep: p.keep === true });
        else if (p.op === "claims")
            await checkJobClaims(job.ref_id!);
        else
            await driveProduction({
                read: () => {
                    const output = db.select({ production: schema.outputJobs.production, assets: schema.outputJobs.assets, error: schema.outputJobs.error, scriptId: schema.outputJobs.script_id }).from(schema.outputJobs).where(eq(schema.outputJobs.id, job.ref_id!)).get();
                    if (!output?.production)
                        throw new Error("Production job not found.");
                    const scriptAudit = db.select({ audit: schema.scripts.audit }).from(schema.scripts).where(eq(schema.scripts.id, output.scriptId)).get()?.audit;
                    return { production: output.production, assets: output.assets, error: output.error, scriptAudit };
                },
                run: () => runStep(job.ref_id!),
                approve: () => approveStage(job.ref_id!),
                checkpoint,
                hold: (reason) => db.update(schema.outputJobs).set({ status: "in_review", error: reason.slice(0, 500), updated_at: new Date().toISOString() }).where(eq(schema.outputJobs.id, job.ref_id!)).run(),
            });
        return;
    }
    if (job.kind === "studio") {
        const p = job.payload as {
            op?: "plan" | "render" | "claims" | "review" | "base" | "variants" | "copy" | "composite";
            itemIds?: string[];
            count?: number;
            layers?: TextLayer[];
            feedback?: string;
            redo?: boolean;
            quality?: "medium" | "high";
            force?: boolean;
            keep?: boolean;
            aspect?: string;
            budgetUsd?: number;
        };
        if (p.op === "composite") {
            const { composePendingVariants } = await import("../studio/compositor");
            await composePendingVariants(job.ref_id!, { itemIds: p.itemIds });
            return;
        }
        if (p.op === "claims" || p.op === "review")
            await checkRun(job.ref_id!, p.op);
        else if (p.op === "copy")
            await writeStaticCopy(job.ref_id!, p.itemIds ?? [], p.redo === true);
        else if (p.op === "base")
            await makeBase(job.ref_id!, p.itemIds?.[0] ?? "", p.aspect ?? "");
        else if (p.op === "variants") {
            await writeVariants(job.ref_id!, p.itemIds?.[0] ?? "", p.aspect ?? "", p.count ?? 5, LayersSchema.parse(p.layers ?? []), { budgetUsd: p.budgetUsd });
            const { composePendingVariants } = await import("../studio/compositor");
            await composePendingVariants(job.ref_id!, { itemIds: p.itemIds });
        }
        else if (p.op === "render")
            await renderRun(job.ref_id!, { itemIds: p.itemIds, feedback: p.feedback, redo: p.redo, quality: p.quality, force: p.force, keep: p.keep });
        else {
            await planRun(job.ref_id!, { itemIds: p.itemIds, redo: p.redo });
            const run = getRun(job.ref_id!);
            if (run?.context.auto && run.status === "planned" && !run.items.some((i) => i.outputs.length)) {
                const failed = new Set(run.audit.filter((a) => a.status === "fail").map((a) => a.line_index));
                const ready = run.items.filter((i, at) => i.plan && !failed.has(at)).map((i) => i.id);
                if (!failed.has(undefined) && ready.length)
                    await renderRun(job.ref_id!, { itemIds: ready, force: true });
            }
        }
        return;
    }
    if (job.kind === "sprint") {
        const p = job.payload as {
            op?: "plan" | "briefs" | "render";
            notes?: string;
            force?: boolean;
        };
        if (p.op === "briefs")
            await writeBriefs(job.ref_id!);
        else if (p.op === "render")
            await renderSprint(job.ref_id!, { force: p.force });
        else
            await makeSprint(job.ref_id!, { notes: p.notes });
        return;
    }
    if (job.kind === "personas") {
        const p = job.payload as {
            op?: "build" | "draw" | "starter" | "doubts" | "avatar";
            count?: number;
            notes?: string;
            draw?: boolean;
            ids?: string[];
            offers?: boolean;
            enhancement?: {
                keep: boolean;
                notes: string;
                hyperreal: boolean;
                sourcePortrait: string;
            };
        };
        if (p.op === "starter")
            await writeStarter(job.brand_id, { offers: p.offers });
        else if (p.op === "doubts")
            await fillMissingDoubts(job.brand_id, p.ids);
        else if (p.op === "draw")
            for (const id of p.ids ?? [])
                await drawPersona(job.brand_id, id);
        else if (p.op === "avatar")
            for (const id of p.ids ?? [])
                await drawAvatar(job.brand_id, id, p.enhancement);
        else
            await buildAndDraw(job.brand_id, { count: p.count, notes: p.notes, draw: p.draw });
        return;
    }
    if (job.kind === "offers") {
        const p = job.payload as {
            op?: "build" | "research" | "set";
            mechanics?: Mechanic[];
            count?: number;
            notes?: string;
            industry?: string;
        };
        if (p.op === "set")
            await buildOfferSet(job.brand_id, { count: p.count, notes: p.notes });
        else if (p.op === "research" && p.industry)
            await researchIndustry(job.brand_id, p.industry);
        else
            await buildOffers(job.brand_id, { mechanics: p.mechanics, count: p.count, notes: p.notes, industry: p.industry });
        return;
    }
    if (job.kind === "chat") {
        const p = job.payload as {
            op?: "turn" | "job_step";
            step?: "approve" | "run" | "redo" | "skip_motion";
            instruction?: string;
            selected?: number;
        };
        if (p.op === "job_step" && p.step)
            await stepJob(job.brand_id, job.ref_id!, p.step, p.instruction ?? "", p.selected);
        else
            await runChatTurn(job.ref_id!);
        return;
    }
    if (job.kind === "landing") {
        if ((job.payload as {
            op?: string;
        }).op === "cro") {
            const { runCroStudio, validateCroStudio } = await import("../landing/studio-engine");
            if (job.payload.validateOnly === true)
                await validateCroStudio(job.brand_id, job.ref_id!);
            else
                await runCroStudio(job.brand_id, job.ref_id!, (job.payload as {
                    revision?: {
                        sectionId: string;
                        note: string;
                        kind?: "copy" | "layout" | "images" | "all";
                        insert?: boolean;
                    };
                }).revision);
            return;
        }
        await writePage(job.ref_id!);
        return;
    }
    if (job.kind === "site_scan") {
        await runScan(job.ref_id!);
        return;
    }
    if (job.kind === "analyze_reference") {
        await analyzeReference(job.ref_id!);
        return;
    }
    if (job.kind === "reference_hooks") {
        const p = job.payload as {
            count?: number;
            note?: string;
            taste?: unknown;
        };
        await writeReferenceHooks(job.brand_id, job.ref_id!, { count: p.count ?? 6, note: p.note, taste: p.taste });
        return;
    }
    if (job.kind === "reference_read") {
        await readReference(job.brand_id, job.ref_id!);
        return;
    }
    if (job.kind === "script") {
        const p = job.payload as {
            axes: ScriptAxes;
            themeIds?: string[];
            turn?: number;
            referenceId?: string;
            referenceMode?: ReferenceMode;
            model?: string;
            altOf?: string;
            format?: OutputType;
            transposeOf?: string;
            person?: ScriptAxes["person"];
            tense?: ScriptAxes["tense"];
            then?: {
                type: OutputType;
                recipe: string;
                preset?: string;
                notes?: string;
                aspect?: string;
                productId?: string;
                productInPicture?: ProductInPicture;
                taste?: Taste;
                avatarId?: string | null;
                workflow?: "guided" | "automatic";
            };
            kit?: ScriptKit;
        };
        if (p.transposeOf && p.person && p.tense) {
            await transposeScript({ scriptId: p.transposeOf, person: p.person, tense: p.tense, model: p.model });
            return;
        }
        const scriptId = await generateScript({ conceptId: job.ref_id!, axes: p.axes, themeIds: p.themeIds, turn: p.turn, referenceId: p.referenceId, referenceMode: p.referenceMode, model: p.model, altOf: p.altOf, format: p.format });
        if (p.kit)
            await writeKit(scriptId, p.kit);
        else if (!p.altOf && db.select({ axes: schema.scripts.axes }).from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get()?.axes.flow)
            await writeKit(scriptId, { run: "", angle: "", format: (p.format ?? "video").replace(/_/g, " "), want: { primary_text: true, image_prompts: false } });
        if (p.then) {
            const made = createJob({ scriptId, type: p.then.type, recipe: p.then.recipe, preset: p.then.preset, notes: p.then.notes, ...(p.then.aspect ? { aspect: p.then.aspect } : {}), productId: p.then.productId, productInPicture: p.then.productInPicture, taste: parseTaste(p.then.taste), avatarId: p.then.avatarId, workflow: p.then.workflow, tag: "net_new" });
            enqueue(job.brand_id, "production", made, { op: "run" });
        }
        return;
    }
    throw new Error(`Unknown job kind ${job.kind}`);
}
let running = 0;
let started = false;
export async function tick(): Promise<void> {
    while (running < CONCURRENCY) {
        const job = claimNext();
        if (!job)
            return;
        const heartbeat = setInterval(() => { if (!heartbeatLease(job.id, job.leaseToken))
            console.warn(`[worker] lease lost for ${job.id}; further stage writes must conflict.`); }, 10000);
        heartbeat.unref();
        const finish = (status: Parameters<typeof finishJob>[1], error: string | null = null) => finishJob(job.id, status, error, job.leaseToken);
        running++;
        withJob(job.id, () => run(job), job.leaseToken)
            .then(() => {
            const asked = db.select({ c: schema.jobs.control }).from(schema.jobs).where(eq(schema.jobs.id, job.id)).get()?.c;
            if (asked)
                return finish(asked === "pause" ? "paused" : "stopped", new RunStoppedError(asked).message);
            finish("done");
            if (job.kind === "studio" && job.ref_id && getRun(job.ref_id)?.status === "review")
                releaseRunReferences(job.ref_id);
            if (job.kind !== "script" && job.kind !== "production" && job.kind !== "studio" && job.kind !== "sprint" && job.kind !== "personas" && job.kind !== "offers" && job.kind !== "chat" && job.kind !== "avatar_pack_frame")
                clearFailed(job.kind, job.ref_id!);
            if (job.kind === "extract" && llmEnabled() && !itemsPending(job.brand_id))
                enqueue(job.brand_id, "cluster", job.brand_id, { mode: "incremental" });
        })
            .catch((e: Error) => {
            if (e instanceof ProviderDeferredError) {
                deferClaimedJob(job.id, e.provider, e.retryAt, e.message, job.leaseToken);
                return;
            }
            const asked = e instanceof RunStoppedError ? e.mode : db.select({ c: schema.jobs.control }).from(schema.jobs).where(eq(schema.jobs.id, job.id)).get()?.c;
            if (asked)
                return finish(asked === "pause" ? "paused" : "stopped", new RunStoppedError(asked).message);
            finish("failed", e.message);
            if (e instanceof BudgetExceededError)
                failQueued(e.message);
            if (!(e instanceof LlmDisabledError || e instanceof BudgetExceededError))
                console.error(`[worker] ${job.kind} ${job.ref_id}:`, e.message);
        })
            .finally(() => {
            clearInterval(heartbeat);
            releaseJobLease(job.id, job.leaseToken);
            running--;
        });
    }
}
export function startWorker(): void {
    if (started)
        return;
    started = true;
    for (const job of db.select().from(schema.jobs).where(eq(schema.jobs.status, "running")).all())
        if (!liveLease(job.id))
            db.update(schema.jobs).set({ status: job.kind === 'preprocess' ? "queued" : "paused", control: null, error: job.kind === 'preprocess' ? null : "An expired worker lease was recovered. Resume reuses confirmed results and holds ambiguous paid attempts." }).where(and(eq(schema.jobs.id, job.id), eq(schema.jobs.status, "running"))).run();
    setInterval(() => void tick(), POLL_MS);
}
export async function drain(): Promise<void> {
    for (;;) {
        await tick();
        if (running === 0 && !claimPeek())
            return;
        await new Promise((r) => setTimeout(r, 200));
    }
}
function claimPeek(): boolean {
    return !!db.select({ id: schema.jobs.id }).from(schema.jobs).where(eq(schema.jobs.status, "queued")).get();
}
