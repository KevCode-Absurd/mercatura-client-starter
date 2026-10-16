import { parseTaste } from "../taste/schema";
import fs from "node:fs";
import path from "node:path";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AskIntent, ChatAction, ChatActionResult, ChatCheck, OutputJobRow } from "@/db/schema";
import { listAvatars } from "../avatars/store";
import { writingBrain } from "../claims-through";
import { env } from "../env";
import { recordFeedback } from "../feedback";
import { llmEnabled } from "../llm/gateway";
import { KIND_INFO } from "../library/taxonomy";
import { avatarProblem } from "../make";
import { mediaInfo, normalizeClip, stitchClips } from "../media/ffmpeg";
import { assetPath, mediaLive, mediaUsage } from "../media/providers";
import { approveStage, checkJobClaims, createJob, regenerateStage, runStep, skipMotion } from "../production/engine";
import { CLAIM_CHECKS, reauditScript } from "../scripts/engine";
import { judgeWords } from "../studio/checks";
import { auditRun, checkRun, getRun, planRun, renderRun, saveItemPlan } from "../studio/engine";
import { AWARENESS_STAGES, OUTPUT_INFO, type OutputType } from "../taxonomy";
import { makeImages, writeScripts, type Sink } from "./make";
import { runSkillTool } from "./skill-tools";
import { reviseScript, writeCopy } from "./write";
import type { CopyKind } from "./types";
const imageRoom = (need: number) => {
    const u = mediaUsage();
    return u.images + need > u.imageCap ? `This needs ${need} image${need === 1 ? "" : "s"} and ${Math.max(0, u.imageCap - u.images)} can still be made under the image cap. Raise the cap in Settings, then say "carry on".` : "";
};
async function changeImage(brandId: string, args: {
    set_id: string;
    item_id: string;
    instruction: string;
    rewrite: boolean;
    text_changes: {
        from: string;
        to: string;
    }[];
}, sink: Sink): Promise<void> {
    const run = getRun(args.set_id);
    if (!run || run.brand_id !== brandId)
        throw new Error("That set of images no longer exists.");
    const item = run.items.find((i) => i.id === args.item_id);
    if (!item)
        throw new Error("That image is no longer in the set.");
    sink.save({ set_id: run.id, item_ids: [item.id] });
    if (!item.plan)
        throw new Error("This image has no plan yet. Open the set and plan it first.");
    if (args.text_changes.length) {
        const texts = item.plan.text_elements.map((t) => {
            const hit = args.text_changes.find((c) => c.from.trim() === t.text.trim());
            return hit ? { ...t, text: hit.to.trim() } : t;
        });
        saveItemPlan(run.id, item.id, { text_elements: texts });
    }
    else if (args.rewrite) {
        saveItemPlan(run.id, item.id, { direction: args.instruction });
        await planRun(run.id, { itemIds: [item.id], redo: true });
    }
    const at = getRun(run.id)!.items.findIndex((i) => i.id === item.id);
    const failed = getRun(run.id)!.audit.filter((a) => a.status === "fail" && a.line_index === at);
    if (failed.length) {
        sink.save({ note: `The words are changed, but a check on them failed, so the image was not made again: ${failed[0].message}` });
        return;
    }
    const full = imageRoom(run.aspects.length);
    if (full) {
        sink.save({ note: full });
        return;
    }
    if (mediaLive()) {
        const latest = [...item.outputs].sort((a, b) => b.version - a.version)[0];
        void recordFeedback({ brandId, refType: "studio", refId: run.id, itemId: item.id, asset: latest?.path ?? null, productId: run.product_id, text: args.instruction, via: "typed", action: "remake", about: `${KIND_INFO[run.kind].one}: "${item.plan.title}". What it was meant to show: ${item.plan.scene}` }).catch(() => undefined);
    }
    await renderRun(run.id, { itemIds: [item.id], redo: true, ...(args.rewrite && !args.text_changes.length ? {} : { keep: true }), ...(args.text_changes.length || args.rewrite ? {} : { feedback: args.instruction }) });
    const done = getRun(run.id)!.items.find((i) => i.id === item.id);
    if (done?.error)
        throw new Error(done.error);
}
const MOCK_NOTE = "Mock mode: only the rule checks ran. The read against the approved claims needs live mode.";
async function checkClaims(brandId: string, args: {
    target?: {
        type: "set" | "script" | "job";
        id: string;
    };
    text?: string;
    about?: string;
}, refId: string): Promise<ChatCheck> {
    const t = args.target;
    if (t?.type === "set") {
        const run = getRun(t.id);
        if (!run || run.brand_id !== brandId)
            throw new Error("That set of images no longer exists.");
        const planned = run.items.filter((i) => i.plan);
        if (!planned.length)
            throw new Error("This set has no words yet: its plan is not written.");
        const checked = planned.reduce((n, i) => n + (i.plan?.text_elements.length ?? 0) + (i.plan?.ad_copy ? 1 : 0), 0);
        const audit = llmEnabled() ? (await checkRun(run.id, "claims"), getRun(run.id)!.audit) : auditRun({ ...run, context: { ...run.context, claim_checks: true } }, writingBrain(brandId, true));
        const issues = audit.filter((a) => a.status !== "pass" && a.check !== "claim_checks" && (llmEnabled() ? a.check === "claims_judge" || a.status === "fail" : true));
        return { about: `the images of "${run.title}"`, checked, issues: issues.map((a) => ({ where: a.line_index != null ? `Image ${a.line_index + 1}` : "The set", text: "", severity: a.status === "fail" ? "fail" : "warn", problem: a.message })), ...(llmEnabled() ? {} : { note: MOCK_NOTE }) };
    }
    if (t?.type === "script" || t?.type === "job") {
        let job = t.type === "job" ? db.select().from(schema.outputJobs).where(eq(schema.outputJobs.id, t.id)).get() : undefined;
        if (t.type === "job" && (!job || job.brand_id !== brandId))
            throw new Error("That ad no longer exists.");
        if (job?.production?.next === "approve:plan" && job.production.claim_checks !== true) {
            await checkJobClaims(job.id);
            job = db.select().from(schema.outputJobs).where(eq(schema.outputJobs.id, job.id)).get();
        }
        const issues: ChatCheck["issues"] = [];
        let checked = 0;
        const plan = job?.production?.image_plan;
        if (job && plan) {
            checked += plan.cards.reduce((n, c) => n + c.text_elements.length, 0) + plan.ad_copy.headlines.length + 3;
            for (const a of job.production!.audit.filter((x) => x.status !== "pass"))
                issues.push({ where: "The ad", text: "", severity: a.status === "fail" ? "fail" : "warn", problem: a.message });
        }
        const scriptId = job ? job.script_id : t.id;
        const script = db.select().from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get();
        if (!script || script.brand_id !== brandId)
            throw new Error("That script no longer exists.");
        const audit = await reauditScript(script.id, { claimChecks: true });
        checked += script.lines.length + script.hook_variants.length;
        for (const a of audit.filter((x) => x.status !== "pass" && (CLAIM_CHECKS.has(x.check) || /claim|judge/.test(x.check))))
            issues.push({ where: a.line_index != null ? `Line ${a.line_index + 1}` : "The script", text: a.line_index != null ? (script.lines[a.line_index]?.text ?? "").slice(0, 160) : "", severity: a.status === "fail" ? "fail" : "warn", problem: a.message });
        return { about: job ? `the ${(OUTPUT_INFO[job.output_type]?.label ?? "ad").toLowerCase()} from "${script.title}"` : `the script "${script.title}"`, checked, issues, ...(llmEnabled() ? {} : { note: MOCK_NOTE }) };
    }
    const lines = (args.text ?? "").split(/\n+/).map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim()).filter((l) => l.length > 2).slice(0, 60);
    if (!lines.length)
        throw new Error("There are no words to check.");
    const about = args.about || "the words you gave";
    if (!llmEnabled())
        return { about, checked: lines.length, issues: [], note: "Mock mode: nothing was read. The read against the approved claims needs live mode." };
    const found = await judgeWords({ brandId, brand: writingBrain(brandId, true), what: "ad copy", lines: lines.map((text, k) => ({ id: `l${k + 1}`, where: "copy", text })), refType: "chat", refId });
    return { about, checked: lines.length, issues: found.map((x) => ({ where: `Line ${x.id.slice(1)}`, text: x.text.slice(0, 160), severity: x.severity, problem: x.problem })) };
}
const getJob = (id: string): OutputJobRow | undefined => db.select().from(schema.outputJobs).where(eq(schema.outputJobs.id, id)).get();
const isVideoJob = (job: Pick<OutputJobRow, "output_type">) => job.output_type.startsWith("ai_");
export async function carryOn(jobId: string, opts: {
    motion?: boolean;
} = {}): Promise<string> {
    let flagged = "";
    for (let guard = 0; guard < 12; guard++) {
        const job = getJob(jobId);
        const p = job?.production;
        if (!job || !p)
            throw new Error("That ad no longer exists.");
        const next = p.next;
        if (next === "done")
            return flagged;
        if (next.startsWith("approve:")) {
            if (isVideoJob(job) || next !== "approve:plan")
                return "";
            const failed = p.audit.filter((a) => a.status === "fail");
            if (failed.length)
                return `Human review needed: ${failed.map((a) => a.message).join("; ")}. Review the findings and approve on the Production board to override the checks.`;
            await approveStage(jobId);
            continue;
        }
        if (next === "motion" && !opts.motion)
            return "";
        if (next === "render") {
            const full = imageRoom(p.cards || 1);
            if (full)
                return full;
        }
        await runStep(jobId);
        if (next === "motion")
            return "";
        const now = getJob(jobId)?.production;
        if (next === "clips" && now?.next === "clips" && now.prompts_ready)
            return `${now.prompts_ready.why} It is on the Production board, on this ad.`;
    }
    return "";
}
export async function stepJob(brandId: string, jobId: string, step: "approve" | "run" | "redo" | "skip_motion", instruction = "", selected?: number): Promise<string> {
    const job = getJob(jobId);
    if (!job?.production || job.brand_id !== brandId)
        throw new Error("That ad no longer exists.");
    const next = job.production.next;
    if (step === "skip_motion") {
        await skipMotion(jobId);
        return "";
    }
    if (step === "approve") {
        if (!next.startsWith("approve:"))
            return carryOn(jobId, { motion: true });
        await approveStage(jobId, { ...(selected != null ? { selected } : {}), human: true });
        return carryOn(jobId);
    }
    if (step === "redo") {
        if (instruction.trim().length < 4)
            throw new Error("Say what should be different.");
        const stage = next.startsWith("approve:") ? (next.slice(8) as "plan" | "character" | "look" | "storyboard") : "plan";
        if (mediaLive()) {
            const image = job.assets.find((a) => a.kind === "image");
            void recordFeedback({ brandId, refType: "job", refId: job.id, asset: image?.path ?? null, productId: job.production.product_id ?? null, text: instruction, via: "typed", action: "remake", about: `${(OUTPUT_INFO[job.output_type]?.label ?? "An ad").toLowerCase()} in production.` }).catch(() => undefined);
        }
        await regenerateStage(jobId, stage, instruction.slice(0, 1200));
        return stage === "plan" ? carryOn(jobId) : "";
    }
    return carryOn(jobId, { motion: true });
}
function savedAvatar(brandId: string, named: string, format: string): string {
    const all = listAvatars(brandId);
    const said = named.trim();
    const a = all.find((x) => x.id === said) ?? all.find((x) => x.name.toLowerCase() === said.toLowerCase());
    if (!a)
        throw new Error(`This brand has no saved avatar called "${said.slice(0, 60)}". Avatars are added on the persona sheet.`);
    const problem = avatarProblem(brandId, a.id, format);
    if (problem)
        throw new Error(problem);
    return a.id;
}
async function makeFromScript(brandId: string, args: {
    format: string;
    type: OutputType;
    script_id: string | null;
    intent: AskIntent;
    cards: number | null;
    frames?: number | null;
    avatar?: string | null;
    notes: string;
    reference_id: string | null;
}, sink: Sink): Promise<void> {
    let jobId = sink.had.job_ids?.[0];
    if (!jobId || !getJob(jobId)) {
        const avatarId = args.avatar && args.type.startsWith("ai_") ? savedAvatar(brandId, args.avatar, args.format) : null;
        let scriptId = args.script_id ?? sink.had.script_ids?.[0] ?? null;
        if (!scriptId) {
            if (llmEnabled()) {
                const scripts: Sink = { had: { concept_id: sink.had.concept_id, script_ids: [] }, save: (p) => sink.save({ ...(p.concept_id ? { concept_id: p.concept_id } : {}), ...(p.script_ids ? { script_ids: p.script_ids } : {}) }) };
                await writeScripts(brandId, { ...args.intent, kind: "scripts", count: 1 }, scripts, { format: args.type });
                scriptId = sink.had.script_ids?.[0] ?? null;
            }
            else {
                scriptId = db.select({ id: schema.scripts.id }).from(schema.scripts).where(eq(schema.scripts.brand_id, brandId)).orderBy(desc(schema.scripts.created_at)).limit(1).get()?.id ?? null;
                if (!scriptId)
                    throw new Error("Writing a script needs live mode, and this brand has no script yet to make it from.");
            }
        }
        if (!scriptId)
            throw new Error("No script could be written to make it from.");
        jobId = createJob({ scriptId, type: args.type, recipe: args.format, productId: args.intent.product_id, ...(args.cards ? { cards: args.cards } : {}), ...(args.frames ? { storyboardFrames: args.frames } : {}), ...(avatarId ? { avatarId } : {}), notes: args.notes, ...(args.reference_id ? { referenceId: args.reference_id } : {}), ...(args.intent.taste ? { taste: parseTaste(args.intent.taste) } : {}), tag: "net_new", ...(typeof args.intent.claim_checks === "boolean" ? { claimChecks: args.intent.claim_checks } : {}) });
        sink.save({ script_ids: [scriptId], job_ids: [jobId] });
    }
    const note = await carryOn(jobId);
    if (note)
        sink.save({ note });
}
async function joinClips(brandId: string, chatId: string, ids: string[], sink: Sink): Promise<void> {
    const rows = db.select().from(schema.adReferences).where(inArray(schema.adReferences.id, ids)).all();
    const files = ids.flatMap((id) => rows.filter((r) => r.id === id && r.kind === "video" && r.media_path)).map((r) => path.resolve(r.media_root === "data" ? env.DATA_DIR : env.SKILLS_DIR, r.media_path!));
    const found = files.filter((f) => fs.existsSync(f));
    if (found.length < 2)
        throw new Error("2 or more attached video clips are needed, and their files must be on this computer.");
    const first = await mediaInfo(found[0]);
    if (!first.width || !first.height)
        throw new Error("The first clip could not be read as a video.");
    const even = (n: number) => Math.round(n / 2) * 2;
    const scale = Math.min(1, 1280 / Math.max(first.width, first.height));
    const size: [
        number,
        number
    ] = [even(first.width * scale), even(first.height * scale)];
    const stamp = Date.now().toString(36);
    const parts: string[] = [];
    let seconds = 0;
    for (const [k, f] of found.entries()) {
        const info = await mediaInfo(f);
        if (!info.duration)
            throw new Error(`Clip ${k + 1} could not be read as a video.`);
        const out = assetPath(chatId, `join_${stamp}_${k + 1}.mp4`).abs;
        await normalizeClip(f, out, size, Math.round(info.duration * 100) / 100);
        parts.push(out);
        seconds += info.duration;
    }
    const final = assetPath(chatId, `joined_${stamp}.mp4`);
    await stitchClips(parts, final.abs);
    for (const part of parts)
        fs.rmSync(part, { force: true });
    sink.save({ file: { path: final.rel.replace(/^assets\//, ""), kind: "video", seconds: Math.round(seconds) }, ...(found.length < ids.length ? { note: `${found.length} of the ${ids.length} clips were joined: the others' files were not found.` } : {}) });
}
export async function runAction(brandId: string, chatId: string, a: ChatAction, save: (patch: Partial<ChatActionResult>) => void, refId: string): Promise<void> {
    let had = { ...a.result };
    const sink: Sink = {
        get had() {
            return had;
        },
        save: (patch) => {
            had = { ...had, ...patch };
            save(patch);
        },
    };
    const arg = <T>() => a.args as unknown as T;
    if (a.tool === "make_images") {
        const i = arg<{
            intent: AskIntent & {
                kind: "image_ads" | "product_page" | "photoshoot";
            };
        }>().intent;
        if (!had.set_id) {
            const full = imageRoom(i.count * Math.max(1, i.aspects.length));
            if (full)
                return void sink.save({ note: full });
        }
        return makeImages(brandId, i, sink);
    }
    if (a.tool === "change_image")
        return changeImage(brandId, arg(), sink);
    if (a.tool === "write_scripts")
        return writeScripts(brandId, arg<{
            intent: AskIntent;
        }>().intent, sink);
    if (a.tool === "change_script") {
        const { script_id, instruction } = arg<{
            script_id: string;
            instruction: string;
        }>();
        const own = db.select({ brand: schema.scripts.brand_id }).from(schema.scripts).where(eq(schema.scripts.id, script_id)).get();
        if (!own || own.brand !== brandId)
            throw new Error("That script no longer exists.");
        sink.save({ script_ids: [script_id] });
        const r = await reviseScript(script_id, instruction, refId);
        if (llmEnabled())
            void recordFeedback({ brandId, refType: "script", refId: script_id, text: instruction, via: "typed", action: "remake", about: `The script "${r.script.title}".` }).catch(() => undefined);
        return void sink.save({ note: r.changed });
    }
    if (a.tool === "write_copy") {
        const c = arg<{
            kind: CopyKind;
            count: number;
            product_id: string | null;
            persona_ids: string[];
            offer_id: string | null;
            brief: string;
            audience: string;
            target_id: string | null;
            taste?: unknown;
            stage?: string | null;
        }>();
        const stage = AWARENESS_STAGES.find((s) => s === c.stage) ?? null;
        let about = "";
        if (c.target_id?.startsWith("set_")) {
            const run = getRun(c.target_id);
            about = run ? `It runs with these images ("${run.title}"):\n${run.items.filter((i) => i.plan).map((i, k) => `Image ${k + 1}: ${i.plan!.argument} Words on it: ${i.plan!.text_elements.map((t) => t.text).join(" / ")}`).join("\n")}` : "";
        }
        else if (c.target_id) {
            const s = db.select().from(schema.scripts).where(eq(schema.scripts.id, c.target_id)).get();
            about = s && s.brand_id === brandId ? `It runs with this script ("${s.title}"):\n${s.lines.map((l) => l.text).join("\n")}` : "";
        }
        const copy = await writeCopy({ brandId, kind: c.kind, count: c.count, productId: c.product_id, personaIds: c.persona_ids, offerId: c.offer_id, brief: c.brief, audience: c.audience, about: about.slice(0, 4000), refId, taste: c.taste, stage });
        return void sink.save({ copy });
    }
    if (a.tool === "check_claims")
        return void sink.save({ check: await checkClaims(brandId, arg(), refId) });
    if (a.tool === "make_from_script")
        return makeFromScript(brandId, arg(), sink);
    if (a.tool === "job_step") {
        const j = arg<{
            job_id: string;
            step: "approve" | "run" | "redo" | "skip_motion";
            instruction: string;
        }>();
        sink.save({ job_ids: [j.job_id] });
        const note = await stepJob(brandId, j.job_id, j.step, j.instruction);
        if (note)
            sink.save({ note });
        return;
    }
    if (a.tool === "join_clips")
        return joinClips(brandId, chatId, arg<{
            reference_ids: string[];
        }>().reference_ids, sink);
    if (await runSkillTool(brandId, a, sink))
        return;
    throw new Error(`The chat can't do "${a.tool}".`);
}
