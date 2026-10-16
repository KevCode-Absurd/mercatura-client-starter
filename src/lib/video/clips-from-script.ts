import { aimWords, MAX_CLIPS, SEGMENT_SECONDS } from "../production/prompts";
import { dealLines, type Deal, type SpokenLine } from "../production/deal";
import type { ReferenceMode } from "@/db/schema";
export const LEAST_CLIP_SECONDS = 3;
export interface ScriptClips {
    lengths: number[];
    seconds: number;
    left: number;
}
const made = (n: number, lengths?: number[]): number => {
    if (!lengths?.length)
        return n;
    const may = [...lengths].sort((a, b) => a - b);
    return may.find((x) => x >= n) ?? may[may.length - 1];
};
export function clipsFromScript(seconds: number, o: {
    clip?: number;
    least?: number;
    most?: number;
    atLeast?: number;
    lengths?: number[];
} = {}): ScriptClips | null {
    if (!Number.isFinite(seconds) || seconds <= 0)
        return null;
    const clip = Math.max(1, Math.round(o.clip ?? SEGMENT_SECONDS));
    const least = Math.max(1, Math.round(o.least ?? LEAST_CLIP_SECONDS));
    const most = Math.max(1, Math.min(MAX_CLIPS, Math.round(o.most ?? MAX_CLIPS)));
    const s = Math.max(1, Math.round(seconds));
    let count = Math.max(1, Math.ceil(s / clip));
    let last = s - (count - 1) * clip;
    if (count > 1 && last < least) {
        count -= 1;
        last += clip;
    }
    let lengths: number[];
    let left = 0;
    if (o.atLeast && o.atLeast > count) {
        count = Math.min(most, Math.round(o.atLeast));
        const each = Math.floor(s / count);
        const extra = s - each * count;
        lengths = Array.from({ length: count }, (_, i) => Math.max(least, each + (i < extra ? 1 : 0)));
    }
    else if (count > most) {
        lengths = Array.from({ length: most }, () => clip);
        left = s - most * clip;
    }
    else {
        lengths = [...Array.from({ length: count - 1 }, () => clip), Math.max(least, last)];
    }
    return { lengths: lengths.map((n) => made(n, o.lengths)), seconds: s, left };
}
export function dealToClips(lines: SpokenLine[], o: {
    clip?: number;
    rate?: number;
    mode?: ReferenceMode | null;
    clips?: number;
}): Deal {
    const aim = aimWords(o.clip ?? SEGMENT_SECONDS, o.mode, o.rate);
    return dealLines(lines, { aim, limit: aim, ...(o.clips ? { clips: o.clips } : {}) });
}
export function scriptClipLayout(lines: SpokenLine[], seconds: number, o: {
    clip?: number;
    rate?: number;
    mode?: ReferenceMode | null;
    lengths?: number[];
}): ScriptClips | null {
    const clip = o.clip ?? SEGMENT_SECONDS;
    const need = lines.some((l) => l.text.trim()) ? dealToClips(lines, { clip, rate: o.rate, mode: o.mode }).clips.length : 0;
    return clipsFromScript(seconds, { clip, lengths: o.lengths, atLeast: need });
}
export function fitClipsToWords(laid: number[], words: number[], rate: number, lengths?: number[]): number[] {
    const pace = rate > 0 ? rate : 1;
    return laid.map((n, i) => {
        const w = words[i] ?? 0;
        const needs = w ? Math.ceil(Math.round((w / pace) * 1000) / 1000) : 0;
        return made(Math.max(n, needs), lengths);
    });
}
const timeSaid = (seconds: number): string => {
    const s = Math.max(0, Math.round(seconds));
    const min = Math.floor(s / 60);
    if (!min)
        return `${s} second${s === 1 ? "" : "s"}`;
    return s % 60 ? `${min} min ${s % 60} s` : `${min} min`;
};
export function scriptClipsText(c: ScriptClips): string {
    const n = c.lengths.length;
    const from = `from the script's ${timeSaid(c.seconds)}`;
    const line = n === 1 ? `1 clip of ${c.lengths[0]} s, ${from}` : `${n} clips: ${c.lengths.map((s) => `${s} s`).join(", ")}, ${from}`;
    if (c.left <= 0)
        return line;
    return `${line}. A video is at most ${n} clips (${timeSaid(c.lengths.reduce((a, b) => a + b, 0))}), so the last ${timeSaid(c.left)} of the script are left off.`;
}
