import { traced } from "../production-ops/metrics";
import { randomUUID } from "node:crypto";
import { withOperationBudget } from "../production-ops/budget-context";
import fs from "node:fs";
import { currentOutputs } from "./outputs";
import path from "node:path";
import { z } from "zod";
import type { StudioRunRow, StudioVariant, TextLayer } from "@/db/schema";
import { brandVoiceText } from "../brand-voice";
import { checkWordsQuietly } from "../copy/checked";
import { countedOf } from "../copy/figures";
import { headlineRule, headlinesByStageLine } from "../copy/stage";
import type { WordLine } from "../copy/word-faults";
import { floorText, type WordsResult } from "../copy/words-read";
import { env } from "../env";
import { lessonBlock } from "../lessons";
import { callStructured } from "../llm/gateway";
import { readCheckpoint, saveCheckpoint, fingerprint } from "../production-ops/store";
import { currentJobId } from "../llm/run-control";
import { mediaLive } from "../media/providers";
import { renderPrompt } from "../prompts";
import { voiceRulesText } from "../scripts/voice-rules";
import { getSetting } from "../settings";
import { AWARENESS_STAGES, type AwarenessStage } from "../taxonomy";
import { getRun, productFor, saveRun, slotRoom, studioCopyAuthority } from "./engine";
import { baseOf, nextVariantId, variedSlots, withWords } from "./overlay";
import { invalidateCopyApproval } from "./copy-gate";
import { SAID_MOST, dealtBlock, handsOfSet, poolsOfSet, saidByOthers, siblingPhrases } from "./dealt";
import { layerBudgetOf, wordsOnPicture } from "./word-budget";
export const MAX_VARIANTS_AT_ONCE = 30;
export const MAX_VARIANTS = 120;
const Out = z.preprocess((v) => (Array.isArray(v) ? { versions: v } : v), z.object({ versions: z.array(z.preprocess((v) => (Array.isArray(v) ? { lines: v } : v), z.object({ lines: z.array(z.string()).max(8).default([]) }))).max(60).default([]) }));
const figures = (s: string) => (s.match(/\d[\d,.]*%?/g) ?? []).map((n) => n.replace(/[.,]$/, ""));
const same = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const holds = (draft: string, text: string) => text.length <= Math.max(Math.ceil(draft.length * 1.4), draft.length + 12);
export function keepVersions(versions: {
    lines: string[];
}[], slots: string[], known: string, used: string[][], want: number, room?: number | null): string[][] {
    const facts = new Set(figures(known));
    const seen = new Set(used.map((u) => same(u[0] ?? "")));
    const kept: string[][] = [];
    for (const v of versions) {
        if (kept.length >= want)
            break;
        const lines = v.lines.map((x) => x.replace(/\s+/g, " ").replace(/—/g, ",").trim());
        if (lines.length !== slots.length || lines.some((x, i) => !x || !holds(slots[i], x)))
            continue;
        if (room != null && wordsOnPicture(lines.map((text) => ({ text }))) > room)
            continue;
        if (figures(lines.join(" ")).some((n) => !facts.has(n)))
            continue;
        const key = same(lines[0]);
        if (!key || seen.has(key))
            continue;
        seen.add(key);
        kept.push(lines);
    }
    return kept;
}
export const versionLines = (versions: string[][], roles: string[]): WordLine[] => versions.flatMap((v, n) => v.map((text, k): WordLine => ({ id: `v${n + 1}s${k + 1}`, surface: "picture", role: roles[k] ?? "text", text })));
export function versionsAfterReading(versions: string[][], res: Pick<WordsResult, "lines" | "left">, slots: string[], known: string, used: string[][], room?: number | null): {
    kept: string[][];
    dropped: number;
    allFaulty: boolean;
} {
    const text = new Map(res.lines.map((l) => [l.id, l.text] as const));
    const said = versions.map((v, n) => v.map((t, k) => text.get(`v${n + 1}s${k + 1}`) ?? t));
    const faulty = new Set(res.left.map((f) => Number(/^v(\d+)s/.exec(f.id)?.[1] ?? 0)));
    const sieve = (list: string[][]) => keepVersions(list.map((lines) => ({ lines })), slots, known, used, list.length, room);
    const good = sieve(said.filter((_, n) => !faulty.has(n + 1)));
    if (good.length)
        return { kept: good, dropped: versions.length - good.length, allFaulty: false };
    return { kept: sieve(said), dropped: 0, allFaulty: true };
}
export async function writeVariants(runId: string, itemId: string, aspect: string, count: number, layout: TextLayer[], options: {
    budgetUsd?: number;
} = {}): Promise<{
    run: StudioRunRow;
    made: number;
}> { const perform = () => traced(getRun(runId)?.brand_id ?? "unknown", runId, "repair", () => writeVariantsWithinBudget(runId, itemId, aspect, count, layout)); if (options.budgetUsd !== undefined) {
    if (!Number.isFinite(options.budgetUsd) || options.budgetUsd <= 0)
        throw new Error("Enter a positive optional total variant operation budget.");
    return withOperationBudget({ id: currentJobId() ?? `variants:${runId}:${itemId}:${randomUUID()}`, capUsd: options.budgetUsd }, perform);
} return perform(); }
async function writeVariantsWithinBudget(runId: string, itemId: string, aspect: string, count: number, layout: TextLayer[]): Promise<{
    run: StudioRunRow;
    made: number;
}> {
    const { run, brand, guide } = await productFor(runId);
    const item = run.items.find((i) => i.id === itemId);
    const resumeId = currentJobId(), completed = resumeId ? readCheckpoint<{
        completedIds?: string[];
    }>(run.brand_id, "studio-variant-topups", resumeId) : null;
    if (completed?.value.completedIds?.length && completed.value.completedIds.every(id => item?.variants?.some(v => v.id === id)))
        return { run, made: completed.value.completedIds.length };
    const o = currentOutputs(item?.outputs ?? []).find((x) => x.aspect === aspect);
    if (!item || !o)
        throw new Error("That picture is not in this set.");
    const base = baseOf(run.kind, item, o);
    if (!base || !fs.existsSync(path.join(env.DATA_DIR, "assets", base)))
        throw new Error("This picture has no copy without its words yet. Make it editable first.");
    const lines = layout.filter((l) => l.text.trim());
    const slots = variedSlots(lines);
    if (!slots.length)
        throw new Error("Write at least 1 line on the picture first.");
    const have = item.variants ?? [];
    const want = Math.min(Math.max(1, Math.round(count)), MAX_VARIANTS_AT_ONCE, MAX_VARIANTS - have.length);
    if (want < 1)
        throw new Error(`This ad has ${have.length} variants, the most it keeps. Remove some to write more.`);
    const drafts = slots.map((i) => lines[i].text.replace(/\s+/g, " ").trim());
    const used = [drafts, ...have.filter((v) => v.aspect === aspect).map((v) => variedSlots(v.layers).map((i) => v.layers[i]?.text ?? ""))];
    const plan = item.plan;
    const stays = lines.filter((_, i) => !slots.includes(i));
    let kept: string[][];
    let readNote = "";
    if (!mediaLive()) {
        kept = Array.from({ length: want }, (_, n) => drafts.map((d, k) => (k === 0 ? `Other words ${have.length + n + 1}: ${d}`.slice(0, slotRoom(d) + 10) : d)));
    }
    else {
        const stage = (AWARENESS_STAGES as readonly string[]).includes(plan?.awareness ?? "") ? (plan!.awareness as AwarenessStage) : null;
        const product = { factualAuthority: studioCopyAuthority(run, item).sources.filter(s => ["approved_claim", "approved_offer", "guarantee", "verified_quote"].includes(s.kind)) };
        const counted = countedOf(brand, run.product_id);
        const dealt = run.kind === "ad";
        const ceiling = plan?.words_budget && plan.words_budget.words > 0 ? plan.words_budget : layerBudgetOf(run, item, stage);
        const room = ceiling ? Math.max(ceiling.words, wordsOnPicture(lines)) - wordsOnPicture(stays) : null;
        const tone = dealt ? (handsOfSet(run, brand, poolsOfSet(run, brand), true)[run.items.indexOf(item)]?.lines ?? []) : [];
        const said = dealt ? siblingPhrases({ others: saidByOthers(run.items, itemId), most: SAID_MOST }) : [];
        const p = renderPrompt("studio-variants", {
            count: String(want + Math.max(1, Math.ceil(want / 4))),
            brand_name: brand.brand.name,
            floor: floorText(),
            product: JSON.stringify(product),
            counted: counted.block,
            headline_rule: headlineRule(stage) || headlinesByStageLine(),
            brand_voice: brandVoiceText(run.brand_id, { surfaces: ["on_image", "headline"], brand, ...(dealt ? { toneOnly: true } : {}) }),
            voice_rules: voiceRulesText(getSetting(run.brand_id, "voice"), false),
            lessons: lessonBlock(run.brand_id, { productId: run.product_id, area: ["words"], wordsOnly: true }) || "(none yet)",
            ad: [
                plan?.buyer || plan?.awareness ? `For: ${[plan.buyer, (plan.awareness ?? "").replace(/_/g, " ")].filter(Boolean).join(", ")}` : "",
                plan?.argument ? `Its argument: ${plan.argument}` : "",
                plan?.scene ? `The picture: ${plan.scene}` : "",
                plan?.ad_copy?.primary_text ? `The copy that runs with it in the feed (a source of its facts, not to be rewritten):\n${plan.ad_copy.primary_text}` : "",
            ]
                .filter(Boolean)
                .join("\n") || "(nothing recorded beyond its words)",
            slots: `${slots.map((i, k) => `${k + 1}. ${lines[i].role} | max ${slotRoom(drafts[k])} characters, about ${Math.max(1, Math.round(slotRoom(drafts[k]) / 6))} words`).join("\n")}${room != null ? `\nWords: the ${slots.length === 1 ? "line" : `${slots.length} lines`} of 1 version carry at most ${room} words${slots.length === 1 ? "" : " together"}. A ceiling, not a target: the fewest that carry the 1 idea.` : ""}`,
            fixed: stays.map((l) => `- ${l.role}: ${JSON.stringify(l.text)}`).join("\n") || "(none: these are all the words on the picture)",
            siblings: dealtBlock({ quotes: [], lines: tone }, { siblings: said }) || "(nothing to add: no other ad of this set has words yet)",
            used: used.map((u) => `- ${u.map((x) => JSON.stringify(x)).join(" / ")}`).join("\n"),
        });
        const known = JSON.stringify(product);
        type TopupState = {
            inputHash: string;
            attempts: number;
            kept: string[][];
            rejections: string[];
            writerCostUsd: number;
            callIds: string[];
        };
        const inputHash = fingerprint({ layout: lines, base, plan, known, want, existing: have.map(v => v.id) }), key = currentJobId() ?? `${run.id}:${item.id}:${aspect}:${inputHash}`;
        const saved = readCheckpoint<TopupState>(run.brand_id, "studio-variant-topups", key);
        if (saved && saved.value.inputHash !== inputHash)
            throw new Error("Variant sources changed after the attempt started. Inspect and start a new request.");
        let state: TopupState = saved?.value ?? { inputHash, attempts: 0, kept: [], rejections: [], writerCostUsd: 0, callIds: [] };
        const checkpoint = () => { const cp = readCheckpoint<TopupState>(run.brand_id, "studio-variant-topups", key); saveCheckpoint(run.brand_id, "studio-variant-topups", key, state, cp?.revision ?? 0); };
        while (state.kept.length < want && state.attempts < 3) {
            const missing = want - state.kept.length;
            state.attempts++;
            checkpoint();
            let out;
            try {
                out = await callStructured({ brandId: run.brand_id, task: "studio_variants", model: env.MODEL_COPY, system: p.system, user: p.user + `\nTOP-UP ATTEMPT ${state.attempts}: return only ${missing} missing complete versions. Preserve these successful lines; never rewrite or repeat them: ${JSON.stringify(state.kept)}. Prior rejected-slot findings: ${JSON.stringify(state.rejections.slice(-20))}. Only factualAuthority above authorizes facts. Fixed/legacy ad copy is context, not proof. Preserve all material source conditions; no invented personal use or results.`, schema: Out, effort: "medium", maxTokens: 8000, refType: "studio", refId: run.id });
            }
            catch (error) {
                if (!state.kept.length)
                    throw error;
                state.rejections.push(`Further generation stopped without repeating an uncertain or over-budget call: ${String(error)}`);
                checkpoint();
                break;
            }
            state.writerCostUsd += out.costUsd;
            state.callIds.push(out.callId);
            const fits = keepVersions(out.data.versions, drafts, known, [...used, ...state.kept], missing, room);
            if (!fits.length) {
                state.rejections.push("No complete nonrepeated candidate fit its slots, known figures and complete word budget.");
                checkpoint();
                continue;
            }
            const read = await checkWordsQuietly({ brandId: run.brand_id, brandName: brand.brand.name, refType: "studio", refId: run.id, stage,
                about: [`Product: ${brand.products.find(x => x.id === run.product_id)?.name ?? brand.brand.name}`, plan?.argument ? `Planning argument (not factual evidence): ${plan.argument}` : "", "Each version is its own presented surface. Do not borrow a qualification from a different version."].join("\n"),
                scene: [plan?.scene ?? "", `Fixed adjacent copy: ${stays.map(l => l.text).join(" / ")}`].join("\n"), brandVoice: brandVoiceText(run.brand_id, { surfaces: ["on_image", "headline"], brand }), lines: versionLines(fits, slots.map(i => lines[i].role)), facts: known, counted, max: Object.fromEntries(fits.flatMap((_, n) => drafts.map((d, k) => [`v${n + 1}s${k + 1}`, slotRoom(d)] as const))) });
            if (read.failed) {
                state.rejections.push(`Independent word reading unavailable: ${read.failed}. Stop topping up rather than treating unread words as passed.`);
                checkpoint();
                break;
            }
            const after = versionsAfterReading(fits, read, drafts, known, [...used, ...state.kept], room);
            if (!after.allFaulty)
                state.kept.push(...after.kept.slice(0, want - state.kept.length));
            if (after.allFaulty || after.dropped)
                state.rejections.push(...read.left.map(f => f.why), `${after.allFaulty ? fits.length : after.dropped} candidate(s) failed independent reading.`);
            checkpoint();
        }
        kept = state.kept;
        readNote = ` Bounded top-up: ${state.attempts}/3 writer attempts; ${kept.length}/${want} checked draft candidates, shortfall ${Math.max(0, want - kept.length)}. Successful candidates were retained between attempts. Writer calls: ${state.callIds.join(", ")}; writer cost $${state.writerCostUsd.toFixed(4)} (independent reads/patches have their own ledger costs). Global reserved text budget applies to every call. ${state.rejections.slice(-3).join(" ")}`;
        if (!kept.length)
            throw new Error(`No candidate passed within the bounded attempts.${readNote}`);
    }
    const now = getRun(runId);
    const target = now?.items.find((i) => i.id === itemId);
    if (!now || !target)
        throw new Error("That picture is no longer in this set.");
    const variants = [...(target.variants ?? [])];
    const at = new Date().toISOString();
    const beforeIds = new Set(variants.map(v => v.id));
    for (const words of kept)
        variants.push({ id: nextVariantId(variants), aspect, base_path: base, layers: withWords(lines, slots, words), from: "writer", at, ...(mediaLive() ? { copy_status: "draft" as const } : {}) } satisfies StudioVariant);
    target.variants = variants;
    invalidateCopyApproval(target);
    now.log.push({ at, message: `${itemId} ${aspect}: ${kept.length} variant${kept.length === 1 ? "" : "s"} written with other words${kept.length < want ? ` (${want} asked for; the rest did not fit the lines, stated a figure the ad does not, or did not read well)` : ""}${mediaLive() ? "" : " (mock)"}. No image was made.${readNote}` });
    saveRun(now);
    if (currentJobId()) {
        const cp = readCheckpoint<Record<string, unknown>>(run.brand_id, "studio-variant-topups", currentJobId()!);
        if (cp)
            saveCheckpoint(run.brand_id, "studio-variant-topups", currentJobId()!, { ...cp.value, completedIds: variants.filter(v => !beforeIds.has(v.id)).map(v => v.id) }, cp.revision);
    }
    return { run: now, made: kept.length };
}
export function removeVariant(runId: string, itemId: string, variantId: string): StudioRunRow {
    const run = getRun(runId);
    const item = run?.items.find((i) => i.id === itemId);
    if (!run || !item)
        throw new Error("That picture is not in this set.");
    const before = item.variants?.length ?? 0;
    item.variants = (item.variants ?? []).filter((v) => v.id !== variantId);
    if (item.variants.length !== before)
        invalidateCopyApproval(item);
    saveRun(run);
    return run;
}
