import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { loadBrandBrain } from "../brands";
import { checkWordsQuietly } from "../copy/checked";
import type { WordLine } from "../copy/word-faults";
import { floorText, leftLine, type WordsResult } from "../copy/words-read";
import { env } from "../env";
import { enqueue } from "../jobs/queue";
import { learnedRules } from "../lessons";
import { structuredJson } from "../llm/structured";
import { createJob } from "../production/engine";
import { renderPrompt } from "../prompts";
import { fileHookScript } from "../scripts/engine";
import { tasteBlock } from "../taste/apply";
import { decide } from "../taste/decisions";
import { parseTaste } from "../taste/schema";
import type { ContextPlan, Taste } from "../taste/types";
import { voiceForPlan } from "../taste/voice";
import { AWARENESS_STAGES, type AwarenessStage, type OutputType } from "../taxonomy";
import { HOOK_SECONDS, MAX_HOOKS, MIN_HOOKS, type HookSet, type NewHook } from "./hook-types";
import { readReferenceAnalysis, type ReferenceAnalysis } from "./analysis";
export * from "./hook-types";
const Written = z.object({
    original: z.object({ ends_at: z.number().min(0).max(60), spoken: z.string().default(""), on_screen: z.string().default(""), visual: z.string().default(""), device: z.string().default(""), works: z.string().default("") }),
    body: z.object({ first_line: z.string().min(2), speaker: z.string().default(""), promise: z.string().default("") }),
    hooks: z.array(z.object({ device: z.string().default(""), spoken: z.string().default(""), on_screen: z.string().default(""), visual: z.string().min(4), seconds: z.number().min(1).max(15).default(HOOK_SECONDS), joins: z.string().default("") })).min(1).max(MAX_HOOKS + 4),
});
const Checked = z.object({ checks: z.array(z.object({ n: z.number().int(), ok: z.boolean(), note: z.string().default("") })) });
interface Seg {
    start: number;
    end: number;
    speaker?: string;
    text: string;
}
interface Beat {
    start: number;
    end: number;
    visual: string;
    on_screen_text: string;
    function: string;
}
const t = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
export function adAsText(raw: unknown): {
    transcript: string;
    timeline: string;
    body: (from: number) => string;
} {
    const analysis = readReferenceAnalysis(raw);
    const segs = (Array.isArray(analysis?.transcript_segments) ? analysis.transcript_segments : []) as Seg[];
    const beats = (Array.isArray(analysis?.timeline) ? analysis.timeline : []) as Beat[];
    const said = (list: Seg[]) => list.map((s) => `[${t(s.start)}-${t(s.end)}] ${s.speaker ? `${s.speaker}: ` : ""}${s.text}`).join("\n");
    return {
        transcript: said(segs) || (typeof analysis?.transcript === "string" ? analysis.transcript : ""),
        timeline: beats.map((b) => `[${t(b.start)}-${t(b.end)}] ${b.visual}${b.on_screen_text ? ` | on screen: "${b.on_screen_text}"` : ""}${b.function ? ` | job: ${b.function}` : ""}`).join("\n"),
        body: (from) => said(segs.filter((s) => s.end > from + 0.05)) || (typeof analysis?.transcript === "string" ? analysis.transcript : ""),
    };
}
const rowOf = (referenceId: string) => db.select().from(schema.adReferences).where(eq(schema.adReferences.id, referenceId)).get();
export function storedHooks(referenceId: string): HookSet | null {
    const a = rowOf(referenceId)?.analysis as {
        hooks?: HookSet;
    } | null | undefined;
    return a?.hooks?.hooks?.length ? a.hooks : null;
}
function saveHooks(referenceId: string, set: HookSet) {
    const row = rowOf(referenceId);
    if (!row)
        return;
    db.update(schema.adReferences).set({ analysis: { ...(row.analysis ?? {}), hooks: set } }).where(eq(schema.adReferences.id, referenceId)).run();
}
export function whyNoHooks(ref: {
    kind: string;
    analyzed: boolean;
    analysis: ReferenceAnalysis | null;
} | undefined): string {
    if (!ref)
        return "That ad was not found.";
    if (ref.kind !== "video")
        return "New hooks are written for video ads: the hook is the first seconds.";
    if (!ref.analyzed)
        return "The ad has to be analysed first, so its words and its pictures are known.";
    const text = adAsText(ref.analysis);
    if (!text.transcript.trim() && !text.timeline.trim())
        return "The analysis holds no transcript and no timeline for this ad. Run the analysis again.";
    return "";
}
export const deviceRule = (plan: ContextPlan): string => plan.text.hookAnchor === "device"
    ? "**Each one uses the device the ad already has**, with new words and a new picture. They are made to be tested against the opening that is working: the way in is kept, the telling is new."
    : "**Each one uses a different device**, and none uses the device the ad already has. They are made to be tested against each other: 2 hooks that open the same way are 1 hook.";
export function hookWords(hooks: Pick<NewHook, "spoken" | "on_screen">[]): {
    lines: WordLine[];
    max: Record<string, number>;
} {
    const lines: WordLine[] = [];
    const max: Record<string, number> = {};
    hooks.forEach((h, i) => {
        if (h.spoken.trim()) {
            lines.push({ id: `s${i + 1}`, surface: "hook", text: h.spoken });
            max[`s${i + 1}`] = Math.max(90, Math.ceil(h.spoken.length * 1.25));
        }
        if (h.on_screen.trim()) {
            lines.push({ id: `t${i + 1}`, surface: "hook", text: h.on_screen });
            max[`t${i + 1}`] = Math.max(48, Math.ceil(h.on_screen.length * 1.25));
        }
    });
    return { lines, max };
}
export function applyHookWords(hooks: NewHook[], res: Pick<WordsResult, "lines" | "changed" | "left">): boolean {
    let touched = false;
    for (const c of res.changed) {
        const hook = hooks[Number(c.id.slice(1)) - 1];
        const text = res.lines.find((l) => l.id === c.id)?.text.trim();
        if (!hook || !text)
            continue;
        if (c.id.startsWith("s"))
            hook.spoken = text;
        else
            hook.on_screen = text;
        touched = true;
    }
    hooks.forEach((h, i) => {
        const notes = res.left.filter((f) => f.id === `s${i + 1}` || f.id === `t${i + 1}`).map(leftLine);
        if (!notes.length)
            return;
        h.notes = notes;
        touched = true;
    });
    return touched;
}
export const hooksPlan = (taste: Taste | null | undefined, stage?: string | null, hasBrandRefs = true): ContextPlan => decide({ surface: "hooks", hasReference: true, stage: stage?.replace(/-/g, "_") ?? null, hasBrandRefs }, taste);
export async function writeHooks(brandId: string, referenceId: string, opts: {
    count: number;
    note?: string;
    taste?: unknown;
}): Promise<HookSet> {
    const ref = rowOf(referenceId);
    const why = whyNoHooks(ref);
    if (why || !ref)
        throw new Error(why);
    const count = Math.max(MIN_HOOKS, Math.min(MAX_HOOKS, Math.round(opts.count) || 6));
    const was = storedHooks(referenceId);
    const ad = adAsText(ref.analysis);
    const a = (ref.analysis ?? {}) as {
        mechanism?: string;
        awareness?: {
            stage?: string;
        };
    };
    const plan = hooksPlan(parseTaste(opts.taste), a.awareness?.stage);
    const bodyOnly = plan.text.hookAnchor === "none" && !!was;
    const brand = loadBrandBrain(brandId);
    const brandVoice = voiceForPlan(brandId, plan, { surfaces: ["script"], personaIds: [], brand });
    const p = renderPrompt("reference-hooks", {
        count: String(count),
        floor: floorText(),
        device_rule: deviceRule(plan),
        taste: tasteBlock(plan, { always: true }) || "(the usual)",
        brand_voice: brandVoice,
        lessons: learnedRules(brandId, "writes", { area: "words" }) || "(none yet)",
        title: ref.title,
        stage: a.awareness?.stage?.replace(/-/g, " ") || "not known",
        mechanism: a.mechanism || "(not noted)",
        transcript: (bodyOnly ? `(The opening is left out on purpose. The body begins at second ${was!.original.ends_at}.)
${ad.body(was!.original.ends_at)}` : ad.transcript) || "(no words are spoken)",
        timeline: bodyOnly ? "(left out: only the body is sent)" : ad.timeline || "(no timeline)",
        written: was?.hooks.length ? was.hooks.map((h) => `- ${h.device}: ${h.spoken || h.on_screen || h.visual}`).join("\n") : "(none yet)",
        asked: opts.note?.trim() ? `"${opts.note.trim().replace(/\s+/g, " ").slice(0, 1200)}"\nDo what it says, inside the rules above.` : "(nothing)",
    });
    const out = await structuredJson({ brandId, task: "reference_hooks", model: env.MODEL_COPY, system: p.system, user: p.user, schema: Written, effort: "high", maxTokens: 9000, temperature: plan.temperature, refType: "reference", refId: referenceId });
    const start = Math.max(0, ...(was?.hooks ?? []).map((h) => Number(h.id.replace(/\D/g, "")) || 0));
    const fresh: NewHook[] = out.hooks.slice(0, count).map((h, i) => ({ id: `hk_${start + i + 1}`, device: h.device.trim(), spoken: h.spoken.trim(), on_screen: h.on_screen.trim(), visual: h.visual.trim(), seconds: Math.min(HOOK_SECONDS, Math.max(1, Math.round(h.seconds))), joins: h.joins.trim(), check: null }));
    const set: HookSet = { at: new Date().toISOString(), model: env.MODEL_COPY, original: out.original, body: out.body, hooks: [...(was?.hooks ?? []), ...fresh] };
    saveHooks(referenceId, set);
    const stage = a.awareness?.stage?.replace(/-/g, "_") ?? "";
    const w = hookWords(fresh);
    const res = await checkWordsQuietly({
        brandId,
        brandName: brand.brand.name,
        refType: "reference",
        refId: referenceId,
        stage: (AWARENESS_STAGES as readonly string[]).includes(stage) ? (stage as AwarenessStage) : null,
        about: [`New openings for the video ad "${ref.title}". Each is filmed as a clip of about ${HOOK_SECONDS} seconds and cut onto the front of the ad's body, which does not change.`, a.mechanism ? `What the ad argues: ${a.mechanism}` : "", `The line the body opens with, straight after each opening: "${out.body.first_line}"${out.body.speaker ? ` (${out.body.speaker})` : ""}`, "Each opening is a separate piece: they are not read together. An opening hands over to the body, so it may end on a question or a thing left open. A line whose id starts with s is spoken. A line whose id starts with t is the few words set over the picture of the opening with the same number: it adds to the spoken line and is read beside it."].filter(Boolean).join("\n"),
        brandVoice,
        lines: w.lines,
        facts: ad.body(out.original.ends_at).slice(0, 3000),
        max: w.max,
    });
    if (applyHookWords(fresh, res))
        saveHooks(referenceId, set);
    try {
        const judge = env.MODEL_FAST === env.MODEL_COPY ? env.MODEL_VOICE : env.MODEL_FAST;
        const c = renderPrompt("reference-hooks-check", {
            first_line: out.body.first_line,
            speaker: out.body.speaker || "(not noted)",
            body: ad.body(out.original.ends_at) || "(no words are spoken)",
            hooks: fresh.map((h, i) => `${i + 1}. Spoken: "${h.spoken || "(no words)"}"${h.on_screen ? ` | On screen: "${h.on_screen}"` : ""} | Seen: ${h.visual}`).join("\n"),
        });
        const read = await structuredJson({ brandId, task: "reference_hooks_check", model: judge, system: c.system, user: c.user, schema: Checked, effort: "low", maxTokens: 3000, refType: "reference", refId: referenceId });
        for (const k of read.checks)
            if (fresh[k.n - 1])
                fresh[k.n - 1].check = { ok: k.ok, note: k.note.trim() };
        saveHooks(referenceId, set);
    }
    catch {
    }
    return set;
}
export function makeHookClip(brandId: string, referenceId: string, hookId: string, type: OutputType = "ai_ugc"): {
    jobId: string;
    scriptId: string;
} {
    const ref = rowOf(referenceId);
    const set = storedHooks(referenceId);
    const hook = set?.hooks.find((h) => h.id === hookId);
    if (!ref || !set || !hook)
        throw new Error("That hook was not found. Write the hooks again.");
    if (hook.job_id && hook.script_id)
        return { jobId: hook.job_id, scriptId: hook.script_id };
    const said = hook.spoken || hook.on_screen;
    const scriptId = fileHookScript({ brandId, title: `New hook for "${ref.title}": ${(said || hook.visual).slice(0, 60)}`, spoken: said || hook.visual, onScreen: hook.spoken ? hook.on_screen : "", visual: hook.visual, notes: `A new opening for the ad "${ref.title}", written to be cut onto its body. Only the hook is here: the body is the ad's own.` });
    const jobId = createJob({
        scriptId,
        type,
        segments: 1,
        clipSeconds: HOOK_SECONDS,
        tag: "iteration",
        notes: [
            `This clip is only the opening of an ad, about ${hook.seconds} seconds. It is cut onto the front of an existing ad, so it stops on its own line: no product pitch, no claim, no price and no call to action after it.`,
            set.body.speaker ? `The speaker, to match the ad it joins: ${set.body.speaker}` : "",
            `What is seen: ${hook.visual}`,
            hook.spoken ? "" : "Nobody speaks in this clip.",
            hook.on_screen ? `Words on screen, added in the edit and never drawn by the video model: "${hook.on_screen}"` : "",
            `The line the ad's body opens with straight after this clip: "${set.body.first_line}"`,
        ]
            .filter(Boolean)
            .join("\n"),
    });
    hook.script_id = scriptId;
    hook.job_id = jobId;
    saveHooks(referenceId, set);
    enqueue(brandId, "production", jobId, { op: "run" });
    return { jobId, scriptId };
}
