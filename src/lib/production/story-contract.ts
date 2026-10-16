import type { ImagePlan, VideoPlan } from "@/db/schema";
import { MAX_CLIPS, planSeconds, segmentSeconds } from "./prompts";
import { USUAL_PACE } from "../pace";
import { wordsIn } from "./deal";
export function exactTargetLengths(target: number, allowed: number[], count?: number, minimums: number[] = []): number[] {
    if (!Number.isFinite(target) || target <= 0)
        throw new Error("Requested duration must be a positive number of seconds.");
    const choices = [...new Set(allowed.filter((n) => Number.isFinite(n) && n > 0))].map((n) => Math.round(n * 100)).sort((a, b) => a - b);
    if (!choices.length)
        throw new Error("The selected video model has no usable clip lengths.");
    if (count !== undefined && (!Number.isInteger(count) || count < 1 || count > MAX_CLIPS))
        throw new Error(`Requested clip count must be an integer from 1 to ${MAX_CLIPS}.`);
    const total = Math.round(target * 100);
    if (Math.abs(target * 100 - total) > 0.001)
        throw new Error("Requested duration must use at most two decimal places.");
    const least = choices[0], most = choices[choices.length - 1];
    const first = count ?? Math.max(1, Math.ceil(total / most));
    const last = count ?? Math.min(MAX_CLIPS, Math.floor(total / least));
    for (let clips = first; clips <= last; clips++) {
        const failed = new Set<string>();
        const find = (at: number, remaining: number): number[] | null => {
            const left = clips - at;
            if (!left)
                return remaining === 0 ? [] : null;
            if (remaining < left * least || remaining > left * most)
                return null;
            const key = `${at}:${remaining}`;
            if (failed.has(key))
                return null;
            const ordered = choices.filter((n) => n >= Math.ceil((minimums[at] ?? 0) * 100)).sort((a, b) => Math.abs(b - remaining / left) === Math.abs(a - remaining / left) ? b - a : Math.abs(a - remaining / left) - Math.abs(b - remaining / left));
            for (const seconds of ordered) {
                const next = find(at + 1, remaining - seconds);
                if (next)
                    return [seconds / 100, ...next];
            }
            failed.add(key);
            return null;
        };
        const found = find(0, total);
        if (found)
            return found;
    }
    throw new Error(`The requested ${target}-second duration cannot fit ${count ? `${count} clips and ` : ""}the selected model's clip lengths${minimums.length ? " while retaining the approved speech" : ""}. Change the timing or model; the script was not changed.`);
}
export function sceneSpeechTimingProblems(plan: Pick<VideoPlan, "segments"> & Partial<Pick<VideoPlan, "speech">>): string[] {
    const rate = plan.speech?.rate && plan.speech.rate > 0 ? plan.speech.rate : USUAL_PACE;
    return plan.segments.flatMap((segment, clip) => segment.scenes.flatMap((scene, shot) => {
        const count = wordsIn(scene.dialogue.replace(/^\s*(?:Host|Guest|Character A|Character B|Narrator)\s*:\s*/i, ""));
        return count > scene.seconds * rate + 0.001 ? [`segments[${clip}].scenes[${shot}].seconds: ${count} approved spoken words cannot fit ${scene.seconds} seconds at the planned ${rate} words per second. Increase this shot's time; keep the approved words.`] : [];
    }));
}
export function requestedDurationProblems(plan: Pick<VideoPlan, "segments"> & Partial<Pick<VideoPlan, "speech">>, target?: number): string[] {
    if (target === undefined)
        return [];
    const actual = planSeconds(plan);
    const scenes = Math.round(plan.segments.flatMap((s) => s.scenes).reduce((n, s) => n + s.seconds, 0) * 100) / 100;
    return [...(Number.isFinite(target) && target > 0 && Math.abs(actual - target) <= 0.01 && Math.abs(scenes - target) <= 0.01 ? [] : [`The requested duration is ${target} seconds; the plan declares ${actual} and its scenes run ${scenes}. Repair segment timing without changing approved dialogue.`]), ...sceneSpeechTimingProblems(plan)];
}
export function approvedSpeechProblems(plan: Pick<VideoPlan, "segments">, lines: {
    text: string;
}[]): string[] {
    const spoken = (text: string) => text.replace(/^\s*(?:Host|Guest|Character A|Character B|Narrator)\s*:\s*/i, "").trim().replace(/\s+/g, " ");
    const expected = lines.map((l) => spoken(l.text)).filter(Boolean).join(" ");
    const actual = plan.segments.flatMap((s) => s.scenes.map((scene) => spoken(scene.dialogue))).filter(Boolean).join(" ");
    return actual === expected ? [] : ["Approved dialogue was changed, omitted or reordered. Restore the exact spoken script; repair timing or feed-copy fields only."];
}
export function retimeVideoPlan(plan: VideoPlan, lengths: number[]): VideoPlan {
    if (lengths.length !== plan.segments.length || lengths.some((n) => !Number.isFinite(n) || n <= 0))
        throw new Error("Supply one positive duration for every existing segment.");
    const copy = structuredClone(plan);
    const rate = copy.speech?.rate && copy.speech.rate > 0 ? copy.speech.rate : USUAL_PACE;
    copy.segments.forEach((segment, i) => {
        const before = segmentSeconds(segment), own = lengths[i], ticks = Math.round(own * 10);
        if (!segment.scenes.length || before <= 0 || segment.scenes.some((s) => !Number.isFinite(s.seconds) || s.seconds <= 0) || ticks < segment.scenes.length || Math.abs(own * 10 - ticks) > 0.001)
            throw new Error("Retiming needs positive scene lengths and a duration in tenths of a second.");
        const sum = segment.scenes.reduce((n, s) => n + s.seconds, 0);
        const minimums = segment.scenes.map((s) => Math.max(1, Math.ceil(wordsIn(s.dialogue.replace(/^\s*(?:Host|Guest|Character A|Character B|Narrator)\s*:\s*/i, "")) / rate * 10 - 0.0001)));
        if (minimums.reduce((n, s) => n + s, 0) > ticks)
            throw new Error(`Segment ${i + 1} cannot retain its approved speech at ${rate} words per second within ${own} seconds. Increase the segment time; no approved words were changed.`);
        const weights = segment.scenes.map((s) => s.seconds / sum * ticks);
        const allocation = weights.map((n, index) => Math.max(minimums[index], Math.floor(n)));
        let delta = ticks - allocation.reduce((n, s) => n + s, 0);
        const ranked = weights.map((n, index) => ({ index, remainder: n - Math.floor(n) })).sort((a, b) => b.remainder - a.remainder);
        for (let at = 0; delta > 0; at++, delta--)
            allocation[ranked[at % ranked.length].index]++;
        for (let at = 0; delta < 0; at++) {
            const index = ranked[ranked.length - 1 - at % ranked.length].index;
            if (allocation[index] > minimums[index]) {
                allocation[index]--;
                delta++;
            }
        }
        const beforeScenes = segment.scenes;
        const beforeStarts = beforeScenes.map((_, j) => beforeScenes.slice(0, j).reduce((n, s) => n + s.seconds, 0));
        segment.scenes = beforeScenes.map((s, j) => ({ ...s, seconds: allocation[j] / 10 }));
        const starts = segment.scenes.map((_, j) => segment.scenes.slice(0, j).reduce((n, s) => n + s.seconds, 0));
        segment.seconds = own;
        if (segment.frames)
            segment.frames = segment.frames.map((f) => {
                const at = beforeStarts.reduce((current, start, j) => f.at + 0.0001 >= start ? j : current, 0);
                const offset = Math.max(0, Math.min(1, (f.at - beforeStarts[at]) / beforeScenes[at].seconds));
                return { ...f, at: f.moment === "end" ? own : Math.min(own, Math.round((starts[at] + offset * segment.scenes[at].seconds) * 10) / 10) };
            });
    });
    return copy;
}
export const PLACEMENT_CAPTION_WORDS = { short: [20, 40], medium: [55, 90], long: [120, 180] } as const;
export const placementCaptionContract = (): string => "Requested placement captions override the buyer-stage word range for feed copy only. Write three distinct complete primary texts: short 20 to 40 words, medium 55 to 90 words, long 120 to 180 words. The short tells one relevant moment and a next step; medium adds the argument and one verified fact; long adds useful verified detail. Do not repeat or truncate a full story into each field. Keep the buyer's awareness, approved message, evidence and every essential offer qualification at every length. Approved spoken dialogue remains unchanged.";
const words = (text: string): number => text.trim().split(/\s+/).filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
export function placementCaptionProblems(primary: ImagePlan["ad_copy"]["primary_text"] | undefined): string[] {
    if (!primary)
        return ["Requested placement captions are missing: supply short, medium and long primary_text fields."];
    const out: string[] = [];
    const normalized = new Map<string, string>();
    for (const key of ["short", "medium", "long"] as const) {
        const text = primary[key].trim(), count = words(text), [lo, hi] = PLACEMENT_CAPTION_WORDS[key];
        if (count < lo || count > hi)
            out.push(`ad_copy.primary_text.${key}: ${count} words; requested placement range is ${lo} to ${hi}. Rewrite only this caption with the approved message and essential qualifications.`);
        const same = text.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
        if (same && normalized.has(same))
            out.push(`ad_copy.primary_text.${key} duplicates ${normalized.get(same)}. Write a distinct complete caption for this placement.`);
        normalized.set(same, key);
    }
    return out;
}
