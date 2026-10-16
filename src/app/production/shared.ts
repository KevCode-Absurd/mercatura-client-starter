import type { OutputJobRow, ProductionState } from "@/db/schema";
import { FORMAT_RECIPES, type FormatRecipe } from "@/lib/formats";
import { clampFrames, hasStoryboard, jobLengths, planBlockers, storyboardImages } from "@/lib/production/prompts";
import { aboutLength } from "@/lib/script-metrics";
import type { OutputType } from "@/lib/taxonomy";
import { plainMessage } from "@/lib/plain-message";
export type Usage = {
    images: number;
    imageCap: number;
    videoUsd: number;
    videoCapUsd: number;
};
export type Busy = {
    status: "queued" | "running";
    since: string;
};
export type ScriptLite = {
    id: string;
    title: string;
    hooks: {
        id: string;
        text: string;
    }[];
};
export const recipeOf = (id: string | undefined): FormatRecipe | null => FORMAT_RECIPES.find((r) => r.id === id) ?? null;
export const isVideoRecipe = (r: FormatRecipe | null) => !!r && (r.base === "ugc" || r.base === "demo");
export const recipeLabel = (p: ProductionState | null) => (!p ? null : p.recipe === "brief" ? "Human brief" : (recipeOf(p.recipe)?.label ?? p.recipe));
export const assetUrl = (file: string) => `/api/assets/${file.replace(/^assets\//, "")}`;
export type OutputGroup = "brief" | "image" | "video";
export const groupOfType = (t: OutputType): OutputGroup => (t.startsWith("human_brief") ? "brief" : t.startsWith("ai_") ? "video" : "image");
export const clipCost = (resolution: string, first: boolean, model = "seedance-2.5") => (!model.includes("mini") ? (model.includes("fast") ? 3.2 : 4.8) : resolution === "720p" ? (first ? 3.08 : 1.88) : first ? 1.43 : 0.9);
export const usd = (n: number) => `$${n.toFixed(2)}`;
export const imagesText = (n: number) => `${n} image${n === 1 ? "" : "s"}`;
export const clipsText = (clips: number, seconds = 10) => `${clips} clip${clips === 1 ? "" : "s"}, ${aboutLength(clips * seconds)}`;
export const clipsOfText = (lengths: number[]) => `${lengths.length} clip${lengths.length === 1 ? "" : "s"}, ${aboutLength(lengths.reduce((n, s) => n + s, 0))}`;
export const jobClipsText = (p: ProductionState) => clipsOfText(jobLengths(p));
export function estimateNew(recipeId: string, opts: {
    cards: number;
    segments: number;
    resolution: string;
    videoModel?: string;
    frames?: number;
}): {
    images: number;
    videoUsd: number;
} {
    const recipe = recipeOf(recipeId);
    if (!recipe)
        return { images: 0, videoUsd: 0 };
    if (!isVideoRecipe(recipe))
        return { images: recipe.base === "carousel" ? opts.cards : 1, videoUsd: 0 };
    return {
        images: (recipe.character ? 1 : 0) + 1 + opts.segments * clampFrames(opts.frames),
        videoUsd: clipCost(opts.resolution, true, opts.videoModel) + (opts.segments - 1) * clipCost(opts.resolution, false, opts.videoModel),
    };
}
export type StageId = "brief" | "script" | "plan" | "render" | "character" | "look" | "storyboard" | "clips" | "finish" | "motion";
export const STAGE_LABEL: Record<StageId, string> = {
    script: "Script",
    brief: "Brief",
    plan: "Plan",
    render: "Images",
    character: "Character sheet",
    look: "Look frame",
    storyboard: "Storyboard",
    clips: "Video clips",
    finish: "Join the clips",
    motion: "Motion finishing",
};
export const STAGE_THING: Record<StageId, string> = {
    script: "the script",
    brief: "the brief",
    plan: "the plan",
    render: "the images",
    character: "the character sheet",
    look: "the look frame",
    storyboard: "the storyboard",
    clips: "the video clips",
    finish: "the joined video",
    motion: "motion finishing",
};
export const STAGE_CONTEXT: Record<StageId, string[]> = {
    script: [],
    brief: ["brief"],
    plan: ["copy", "image_prompt", "shot_plan", "voice_check"],
    render: ["image_prompt"],
    character: ["character"],
    look: ["look"],
    storyboard: ["storyboard"],
    clips: ["video_prompt"],
    finish: [],
    motion: ["motion"],
};
export const CONTEXT_LABEL: Record<string, string> = {
    brief: "Brief",
    copy: "Ad copy",
    image_prompt: "Art direction",
    shot_plan: "Shot plan",
    character: "Character sheet",
    look: "Look frame",
    storyboard: "Storyboard",
    video_prompt: "Video prompt",
    motion: "Motion finishing",
    voice_check: "Brand voice check",
};
export function flowOf(p: ProductionState): StageId[] {
    const recipe = recipeOf(p.recipe);
    if (!recipe)
        return ["brief"];
    if (!isVideoRecipe(recipe))
        return ["plan", "render"];
    return [...(p.workflow === "guided" ? (["script"] as const) : []), "plan", ...(recipe.character ? (["character"] as const) : []), "look", ...(hasStoryboard(p) ? (["storyboard"] as const) : []), "clips", "finish", "motion"];
}
export const isApproval = (next: string) => next.startsWith("approve:");
export const stageOfNext = (next: string): StageId | null => (next === "done" ? null : ((isApproval(next) ? next.slice(8) : next) as StageId));
export const planApprovalBlockers = (p: ProductionState | null) => p?.next === "approve:plan" ? planBlockers(p) : [];
export type StageState = "done" | "current" | "upcoming";
export function stageStates(p: ProductionState): {
    id: StageId;
    state: StageState;
}[] {
    const flow = flowOf(p);
    const at = stageOfNext(p.next);
    const index = at ? flow.indexOf(at) : flow.length;
    return flow.map((id, i) => ({ id, state: i < index ? "done" : i === index ? "current" : "upcoming" }));
}
export function stepCost(p: ProductionState): string {
    const step = p.next;
    if (step === "render")
        return imagesText(p.image_plan?.cards.length ?? p.cards);
    if (step === "storyboard")
        return imagesText(storyboardImages(p));
    if (step === "character" || step === "look")
        return "1 image";
    if (step === "clips") {
        const left = p.clips.length ? p.clips.filter((c) => c.status !== "completed").map((c) => c.index) : Array.from({ length: p.segments }, (_, i) => i);
        const lengths = jobLengths(p);
        const each = left.map((i) => lengths[i] ?? lengths[0] ?? 10);
        return `${usd(left.reduce((n, i, k) => n + (clipCost(p.resolution, i === 0) * each[k]) / 10, 0))} for ${clipsOfText(each)}`;
    }
    if (step === "plan" || step === "motion")
        return "a few cents";
    return "free";
}
const RUN_VERB: Record<StageId, string> = {
    script: "Review the script",
    brief: "Write the brief",
    plan: "Write the plan",
    render: "Generate the images",
    character: "Generate the character sheet",
    look: "Generate the look frame",
    storyboard: "Generate the storyboard",
    clips: "Generate the video clips",
    finish: "Join the clips",
    motion: "Add motion finishing",
};
export const runLabel = (next: string) => RUN_VERB[next as StageId] ?? "Run the next step";
function doing(p: ProductionState): string {
    const step = p.next;
    if (isApproval(step))
        return `making ${STAGE_THING[step.slice(8) as StageId]} again with your notes`;
    if (step === "brief")
        return "writing the brief";
    if (step === "plan")
        return "writing the plan";
    if (step === "render")
        return `rendering ${imagesText(p.image_plan?.cards.length ?? p.cards)}`;
    if (step === "clips") {
        const total = p.clips.length || p.segments;
        return `generating clip ${Math.min(total, p.clips.filter((c) => c.status === "completed").length + 1)} of ${total}`;
    }
    if (step === "finish")
        return p.burn_captions ? "joining the clips and adding captions" : "joining the clips";
    if (step === "motion")
        return "adding motion finishing";
    return `generating ${STAGE_THING[step as StageId] ?? "the next step"}`;
}
export const promptsReady = (p: ProductionState) => p.next === "clips" && !!p.prompts_ready && !p.clips.some((c) => c.status !== "pending");
export type WaitKind = "running" | "failed" | "you" | "ready" | "finished";
export interface Waiting {
    kind: WaitKind;
    text: string;
}
export function waitingOn(job: Pick<OutputJobRow, "production" | "error" | "status">, busy: Busy | undefined): Waiting | null {
    const p = job.production;
    if (!p)
        return null;
    if (busy)
        return { kind: "running", text: busy.status === "queued" ? `Starting: ${doing(p)}` : `Running: ${doing(p)}` };
    if (job.status === "discarded")
        return { kind: "finished", text: "Discarded. Put it back to use it again." };
    if (job.error)
        return { kind: "failed", text: `Failed: ${job.error}` };
    if (p.next === "done") {
        const text = job.status === "in_review" ? "Finished: ready for your review" : job.status === "rejected" ? "Rejected" : job.status === "sent" ? "Sent" : "Finished and approved";
        return { kind: "finished", text };
    }
    if (planApprovalBlockers(p).length)
        return { kind: "you", text: "Waiting for you: edit or regenerate the plan to fix its clip requirements" };
    if (isApproval(p.next))
        return { kind: "you", text: `Waiting for you: approve ${STAGE_THING[p.next.slice(8) as StageId]}` };
    if (promptsReady(p))
        return { kind: "finished", text: "Prompts ready: make the clips in Seedance 2.5 from the prompt pack below" };
    const verb = runLabel(p.next);
    return { kind: "ready", text: `Ready: ${verb.charAt(0).toLowerCase()}${verb.slice(1)} (${stepCost(p)})` };
}
export function waitingOnPlain(job: Pick<OutputJobRow, "production" | "error" | "status">, busy: Busy | undefined): Waiting | null {
    const w = waitingOn(job, busy);
    if (w?.kind === "failed")
        return { kind: "failed", text: `Failed: ${plainMessage(job.error)}` };
    if (!w || w.kind !== "ready" || !job.production)
        return w;
    const verb = runLabel(job.production.next);
    return { kind: "ready", text: `Ready: ${verb.charAt(0).toLowerCase()}${verb.slice(1)}` };
}
export const words = (s: string) => s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
