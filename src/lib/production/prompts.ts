import type { CastOption, PrepStage, ProductionState, ReferenceMode, Scene, StoryFrame, StoryboardFrame, VideoPlan } from "@/db/schema";
import { avatarCast, avatarLine, type Avatar, type AvatarKind } from "../avatars/types";
import { castRoles, isCinematic, type FormatRecipe } from "../formats";
import { videoModelEntry, videoModelInfo, type VideoProfile } from "../media/models";
import { PACE_HEADROOM, USUAL_PACE } from "../pace";
import { videoAudioDirection, type VideoAudio } from "../video-audio";
import { clipWords, dealLines, wordsIn, type Deal, type SpokenLine } from "./deal";
export const SEGMENT_SECONDS = 10;
export const API_PROMPT_LIMIT = 2000;
export const HANDOFF_PROMPT_LIMIT = 5000;
export const PACK_MODEL = "seedance-2.5";
export const SEEDANCE25_PROMPT_LIMIT = videoModelInfo(PACK_MODEL).promptLimit;
export const promptLimit = (model: string) => videoModelInfo(model).promptLimit;
export const planBlockers = (p: Pick<ProductionState, "audit">) => p.audit.filter((a) => ["clip_structure", "requested_duration", "approved_dialogue", "caption_lengths"].includes(a.check) && a.status === "fail");
export const clipSeconds = (p: Pick<ProductionState, "clip_seconds">) => p.clip_seconds ?? SEGMENT_SECONDS;
export const SHORTEST_CLIP = 4;
const tidySeconds = (n: number) => Math.round(n * 100) / 100;
export const segmentSeconds = (seg: {
    scenes: {
        seconds: number;
    }[];
    seconds?: number;
}): number => seg.seconds ?? tidySeconds(seg.scenes.reduce((n, s) => n + (Number(s.seconds) || 0), 0));
export const planSeconds = (plan: Pick<VideoPlan, "segments">): number => tidySeconds(plan.segments.reduce((n, s) => n + segmentSeconds(s), 0));
export const planLengths = (plan: Pick<VideoPlan, "segments">, seconds = SEGMENT_SECONDS): number[] => plan.segments.map((s) => s.seconds ?? seconds);
export const jobLengths = (p: Pick<ProductionState, "segments" | "clip_seconds"> & Partial<Pick<ProductionState, "video_plan" | "script_clips">>): number[] => p.video_plan ? p.video_plan.segments.map(segmentSeconds) : p.script_clips?.lengths.length === p.segments ? p.script_clips.lengths : Array.from({ length: p.segments }, () => clipSeconds(p));
export function sceneTimes(plan: Pick<VideoPlan, "segments">): {
    clip: number;
    scene: number;
    start: number;
    end: number;
}[] {
    let from = 0;
    return plan.segments.flatMap((seg, clip) => {
        let t = from;
        from = tidySeconds(from + segmentSeconds(seg));
        return seg.scenes.map((s, scene) => {
            const start = t;
            t = tidySeconds(t + (Number(s.seconds) || 0));
            return { clip, scene, start, end: t };
        });
    });
}
export function clipsSaid(lengths: number[], unit = "clip"): string {
    const secs = (n: number) => `${n} second${n === 1 ? "" : "s"}`;
    const units = `${lengths.length} ${unit}${lengths.length === 1 ? "" : "s"}`;
    const total = tidySeconds(lengths.reduce((n, x) => n + x, 0));
    if (lengths.length < 2)
        return `${units} of ${secs(total)}`;
    return lengths.every((x) => x === lengths[0]) ? `${units} of ${secs(lengths[0])} (${secs(total)})` : `${units}, ${secs(total)} in all`;
}
export function planLimits(mode?: ReferenceMode | null, cut = false, covered = false, montage = false): {
    wordsPerSecond: number;
    scenes: number;
    visual: number;
} {
    if (mode === "exact")
        return { wordsPerSecond: 4.2, scenes: 6, visual: 260 };
    return { wordsPerSecond: paceLimit(), scenes: cut ? (montage ? MAX_CUTS : MAX_SHOTS) : 3, visual: covered ? SHOT_VISUAL : cut ? 200 : 180 };
}
export const paceLimit = (rate = USUAL_PACE) => Math.round(rate * PACE_HEADROOM * 10) / 10;
export const SHOT_VISUAL = 190;
export const SHOT_FRAMING = 80;
export const SHOT_SLACK = 30;
export const MAX_SHOTS = 6;
export const MAX_CUTS = 10;
export const SHORTEST_CUT = 0.5;
export const CUT_FRAMING = 110;
export const mostShots = (cut?: {
    montage?: boolean;
} | null) => (cut?.montage ? MAX_CUTS : MAX_SHOTS);
export function shotsFor(pace: "calm" | "normal" | "fast" | undefined, seconds = SEGMENT_SECONDS, covered = true, rate = USUAL_PACE, montage = false, format?: string): {
    min: number;
    range: string;
} {
    const most = Math.max(1, montage ? Math.min(MAX_CUTS, Math.floor(seconds / SHORTEST_CUT)) : Math.min(MAX_SHOTS, Math.floor(seconds)));
    if (pace === "calm")
        return { min: 1, range: `about ${Math.min(most, Math.max(1, Math.round(seconds / 5)))}` };
    if (covered && format === "podcast") {
        const min = Math.min(most, Math.ceil(seconds / (pace === "fast" ? 4 : 6)));
        const top = Math.min(most, Math.max(min, Math.floor(seconds / 2)));
        return { min, range: min === top ? String(min) : `${min} to ${top}` };
    }
    const [slow, quick] = montage ? (pace === "fast" ? [1, 0.6] : [1.25, 0.75]) : covered ? (pace === "fast" ? [1.6, 1] : [2, 1.2]) : pace === "fast" ? [2.5, 1.7] : [4, 2];
    const by = (covered || montage) && rate > 0 ? USUAL_PACE / rate : 1;
    const min = Math.min(most, Math.ceil(Math.round((seconds / (slow * by)) * 1000) / 1000));
    const top = Math.min(most, Math.max(min, Math.round(seconds / (quick * by))));
    return { min, range: min === top ? String(min) : `${min} to ${top}` };
}
export function longestShot(pace: "calm" | "normal" | "fast" | undefined, seconds: number, montage = false, format?: string): number | null {
    if (pace === "calm")
        return null;
    if (format === "podcast")
        return 6;
    if (montage)
        return Math.max(2.5, Math.ceil(seconds / Math.max(1, Math.min(MAX_CUTS, Math.floor(seconds / SHORTEST_CUT)))));
    return Math.max(3, Math.ceil(seconds / Math.max(1, Math.min(MAX_SHOTS, Math.floor(seconds)))));
}
export const SHOT_SIZES = ["wide", "full", "medium", "close-up", "extreme close-up"] as const;
export const SHOT_ANGLES = ["eye level", "low angle", "high angle", "overhead", "over the shoulder", "point of view", "profile", "framed"] as const;
export const CAMERA_MOVES = ["locked off", "hand-held", "push in", "pull back", "pan", "tilt", "track", "truck", "crane up", "orbit", "fly over"] as const;
type Move = (typeof CAMERA_MOVES)[number];
const MOVE_FEEL: Record<Move, string> = {
    "locked off": "the camera does not move: watching closely, tension, and a fast action stays readable",
    "hand-held": "a little natural shake: there in the room with them, real and unposed",
    "push in": "toward the subject: this matters, attention tightens on a face or the product",
    "pull back": "away from the subject: how big the place is, how alone they are, an ending",
    pan: "turning to the side: look over there, from 1 thing to the next",
    tilt: "turning up or down: how tall, a reveal from the bottom up",
    track: "going along with a subject that moves: we are with them, the story moves",
    truck: "sliding sideways across the scene: exploring, things near the lens slide past and give depth",
    "crane up": "rising straight up: scale and power, the place opens out below",
    orbit: "round the subject: the hero moment, the thing shown off from every side",
    "fly over": "gliding forward from the air: spectacle, a big place, an opening",
};
export const cameraFeel = () => CAMERA_MOVES.map((m) => `${m} (${MOVE_FEEL[m]})`).join("; ");
const MOVE_SAID: Record<Move, string> = {
    "locked off": "static locked-off camera",
    "hand-held": "hand-held, small natural shake",
    "push in": "dolly in toward the subject, the foreground sliding past",
    "pull back": "dolly out, more of the place coming into frame",
    pan: "pan",
    tilt: "tilt",
    track: "tracking shot moving with the subject",
    truck: "truck sideways, the foreground sliding past the background",
    "crane up": "crane up, the place opening out below",
    orbit: "orbit round the subject, the background turning behind it",
    "fly over": "aerial glide forward over the place",
};
export const SHOT_SUBJECTS = ["face", "person", "hands", "product", "object", "place"] as const;
const HELD: readonly string[] = ["locked off", "hand-held"];
const TERMS: [
    RegExp,
    string
][] = [
    [/\b(extreme|very|ultra) close|\bmacro\b|\becu\b/, "extreme close-up"],
    [/\bclose|\btight\b/, "close-up"],
    [/\b(medium|mid|waist)/, "medium"],
    [/\b(full|head to toe)/, "full"],
    [/\b(wide|establishing|long shot)/, "wide"],
    [/\b(over the shoulder|over-the-shoulder|ots)\b/, "over the shoulder"],
    [/\b(point of view|pov|first person)\b/, "point of view"],
    [/\b(overhead|top[- ]down|from above|bird)/, "overhead"],
    [/\blow\b/, "low angle"],
    [/\bhigh\b/, "high angle"],
    [/\b(profile|side)\b/, "profile"],
    [/\bframed\b/, "framed"],
    [/\b(eye|straight on|front)/, "eye level"],
    [/\b(crane|jib|boom up)\b|\bris(e|es|ing) (straight )?up\b/, "crane up"],
    [/\b(fly|drone|aerial)/, "fly over"],
    [/\b(truck|lateral|sideways|slide)/, "truck"],
    [/\b(push|zoom in|dolly in|move in)/, "push in"],
    [/\b(pull|zoom out|dolly out|move out)/, "pull back"],
    [/\b(pan|whip)/, "pan"],
    [/\btilt/, "tilt"],
    [/\b(track|follow|dolly)/, "track"],
    [/\b(orbit|arc|circl)/, "orbit"],
    [/\bhand-?held\b/, "hand-held"],
    [/\b(locked|static|still|fixed|tripod)/, "locked off"],
];
export function shotTerm(list: readonly string[], said: string | undefined): string {
    const s = (said ?? "").trim().toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ").replace(/\.$/, "");
    if (!s)
        return "";
    if (list.includes(s))
        return s;
    const hit = TERMS.find(([re, to]) => re.test(s) && list.includes(to))?.[1];
    return hit ?? "";
}
export function framing(s: Pick<Scene, "shot" | "size" | "angle" | "move">): string {
    const fixed = [s.size, s.angle, s.move].map((x) => x?.trim()).filter(Boolean).join(", ");
    const own = s.shot?.trim().replace(/\.$/, "") ?? "";
    return fixed && own ? `${fixed}: ${own}` : fixed || own;
}
export function filmed(s: Pick<Scene, "shot" | "size" | "angle" | "move">): string {
    const move = s.move?.trim() ?? "";
    return framing({ ...s, move: MOVE_SAID[move as Move] ?? move });
}
export const coverageOf = (n: number) => ({ kinds: Math.min(3, n), moves: Math.floor(n / 2) });
export function shotsText(range: string): string {
    const m = /^(\d+) to (\d+)$/.exec(range);
    const said = m && Number(m[2]) === Number(m[1]) + 1 ? `${m[1]} or ${m[2]}` : range;
    return `${said} shot${/^(about )?1$/.test(said) ? "" : "s"}`;
}
export function minShots(cut: NonNullable<VideoPlan["cut"]>, seconds: number, full = seconds, rate?: number, format?: string): number {
    if (cut.pace)
        return shotsFor(cut.pace, seconds, !!cut.cover, rate, !!cut.montage, format).min;
    return seconds >= full ? cut.min : Math.max(1, Math.min(cut.min, Math.round((cut.min * seconds) / full)));
}
export const maxWords = (seconds: number, mode?: ReferenceMode | null, rate?: number) => Math.round(seconds * (mode === "exact" ? planLimits("exact").wordsPerSecond : paceLimit(rate)));
export const AIM_WORDS_PER_SECOND = USUAL_PACE;
export const aimWords = (seconds: number, mode?: ReferenceMode | null, rate = USUAL_PACE) => (mode === "exact" ? maxWords(seconds, "exact") : Math.round(seconds * rate));
export const MAX_CLIPS = 720;
export const clampClips = (n: unknown) => Math.min(MAX_CLIPS, Math.max(1, Math.round(Number(n)) || 1));
const sameFraming = (a: string, b: string) => {
    const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return !!key(a) && key(a) === key(b);
};
export function shotAt(seg: Pick<VideoPlan["segments"][number], "scenes">, at: number): number {
    let t = 0;
    for (let i = 0; i < seg.scenes.length; i++) {
        t += seg.scenes[i].seconds;
        if (at < t - 0.01)
            return i;
    }
    return Math.max(0, seg.scenes.length - 1);
}
export function shotStarts(seg: Pick<VideoPlan["segments"][number], "scenes">): number[] {
    const fine = seg.scenes.some((s) => !Number.isInteger(Math.round(s.seconds * 100) / 100));
    let t = 0;
    return seg.scenes.map((s) => {
        const from = fine ? Math.round(t * 10) / 10 : Math.round(t);
        t += s.seconds;
        return from;
    });
}
export function fitSeconds<T extends {
    seconds: number;
}>(scenes: T[], own: number): T[] {
    const tenth = (n: number) => Math.round(n * 10) / 10;
    const out = scenes.map((s) => ({ ...s, seconds: tenth(s.seconds) }));
    const off = tenth(own - out.reduce((n, s) => n + s.seconds, 0));
    if (!off || Math.abs(off) > 1 || !out.length)
        return out;
    const at = out.reduce((best, s, i) => (s.seconds > out[best].seconds ? i : best), 0);
    if (out[at].seconds + off < SHORTEST_CUT)
        return out;
    out[at] = { ...out[at], seconds: tenth(out[at].seconds + off) };
    return out;
}
export function cuttingRule(montage: boolean, pace?: "calm" | "normal" | "fast"): string {
    if (pace === "calm")
        return "";
    const yours = "How many shots a clip gets, inside the range given for it, is yours to decide by what its idea needs: more where a lot can be shown fast, fewer where 1 thing is worth watching happen. Never the fewest out of habit.";
    const free = "None of this is a formula: use what this film needs, in this format's own way of moving, and a clip that surprises is worth more than one that follows a pattern.";
    if (!montage)
        return [
            "Make each clip something a person would watch for its own sake: a viewer is here to be entertained. Give it a shape. It opens on its most telling picture, already moving; each cut after it shows something new being done; it builds to the 1 picture the words are about, and its last shot lands it. The shots are quick where the clip builds and longer where it lands.",
            "In every shot something moves that could be seen from across a room, and where the camera moves it moves with a reason: in on what matters, across with what moves, back to show where we are.",
            yours,
            free,
        ].join(" ");
    return [
        "Make each clip something a person would watch for its own sake: a viewer is here to be entertained, and in this format the lens can go anywhere and anything can move. So a lot happens, and every cut is to a different picture: another size, another angle, another thing happening.",
        yours,
        "Give the clip a shape. It opens on its closest or strangest picture, already moving. Each cut after it goes somewhere new: nearer, further back, inside the thing, above it, to another scale or another place. It builds to the 1 picture the words are about, and its last shot lands that picture. The shots are quick where the clip builds and longer on the reveal and the landing.",
        "In every shot the thing in the frame does something that could be seen from across a room, the way this format's own material moves. The camera moves with a reason and at a speed you say in `shot` (a move with no speed said comes back slow): in fast, across to the next thing, round it, back to show how big it is. Where it helps, 1 shot's motion carries into the next.",
        "The light and the lens are part of the picture: say them in `shot` where they make it (lit from behind, the far side soft). 1 shot of a clip may run slow when what it shows is worth it: say so in its `shot`. No 2 shots of a clip show the same thing doing the same thing.",
        free,
    ].join(" ");
}
const sameName = (a: string, b: string) => a.trim().toLowerCase().replace(/^(the|a|an) /, "") === b.trim().toLowerCase().replace(/^(the|a|an) /, "");
export function propsIn(plan: Pick<VideoPlan, "props" | "segments">, clip: number, shot?: number): NonNullable<VideoPlan["props"]> {
    const all = plan.props ?? [];
    const scenes = plan.segments[clip]?.scenes ?? [];
    const of = shot === undefined ? scenes : scenes.slice(shot, shot + 1);
    if (!of.length || of.some((s) => !s.props))
        return all;
    const named = of.flatMap((s) => s.props ?? []);
    return all.filter((p) => named.some((n) => sameName(n, p.name)));
}
export function productIn(plan: Pick<VideoPlan, "props" | "segments" | "product_parts" | "cut">, clip: number, shot?: number): boolean {
    const parts = plan.product_parts ?? [];
    if (!parts.length)
        return !plan.cut;
    return propsIn(plan, clip, shot).some((p) => parts.some((x) => sameName(x.name, p.name)));
}
export function coverageProblems(scenes: Scene[], clip: number, seconds: number, pace?: "calm" | "normal" | "fast", montage = false, format?: string): string[] {
    const out: string[] = [];
    const at = `Segment ${clip + 1}`;
    const n = scenes.length;
    const lists: [
        keyof Pick<Scene, "size" | "angle" | "move" | "focus">,
        readonly string[]
    ][] = [["size", SHOT_SIZES], ["angle", SHOT_ANGLES], ["move", CAMERA_MOVES], ["focus", SHOT_SUBJECTS]];
    scenes.forEach((x, j) => {
        for (const [key, list] of lists)
            if (!list.includes(x[key] ?? ""))
                out.push(`${at} shot ${j + 1}: \`${key}\` must be 1 of: ${list.join(", ")}.`);
        if (x.shot && x.shot.trim().length > (montage ? CUT_FRAMING : SHOT_FRAMING))
            out.push(`${at} shot ${j + 1}: \`shot\` is ${x.shot.trim().length} characters; keep it under ${montage ? CUT_FRAMING : SHOT_FRAMING}.`);
        if (format === "podcast" && CAMERA_MOVES.includes(x.move as Move) && x.move !== "locked off")
            out.push(`${at} shot ${j + 1}: podcast cameras stay on fixed stands; use \`locked off\`.`);
        const before = scenes[j - 1];
        if (!before)
            return;
        if (format === "podcast") {
            const worded = !!x.shot?.trim() && !!before.shot?.trim();
            const view = (s: Scene) => (worded ? framing(s) : `${framing({ ...s, shot: "" })}: ${s.visual}`);
            if (sameFraming(view(x), view(before)))
                out.push(`${at}: shots ${j} and ${j + 1} repeat the same framing. Cut to a named speaker, listener reaction or relevant detail.`);
            return;
        }
        if (x.size && x.size === before.size)
            out.push(`${at}: shots ${j} and ${j + 1} are both ${x.size}. A cut changes how close the camera is.`);
        if (x.angle && x.angle === before.angle)
            out.push(`${at}: shots ${j} and ${j + 1} are both ${x.angle}. A cut moves the camera to another angle.`);
    });
    if (out.length)
        return out;
    const need = coverageOf(n);
    const kinds = (key: "size" | "angle" | "focus") => new Set(scenes.map((x) => x[key])).size;
    if (format !== "podcast" && kinds("size") < need.kinds)
        out.push(`${at}: its ${n} shots use ${kinds("size")} shot sizes; use at least ${need.kinds} different ones.`);
    if (format !== "podcast" && kinds("angle") < need.kinds)
        out.push(`${at}: its ${n} shots use ${kinds("angle")} angles; use at least ${need.kinds} different ones.`);
    if (format !== "podcast" && kinds("focus") < need.kinds)
        out.push(`${at}: its ${n} shots are of ${kinds("focus")} kind${kinds("focus") === 1 ? "" : "s"} of subject (\`focus\`); make them at least ${need.kinds} different ones, so the viewer is not shown the same thing again.`);
    const travels = scenes.filter((x) => !HELD.includes(x.move ?? "")).length;
    if (format !== "podcast" && pace !== "calm" && travels < need.moves)
        out.push(`${at}: the camera travels in ${travels} of its ${n} shots; give at least ${need.moves} a move that travels (${CAMERA_MOVES.filter((m) => !HELD.includes(m)).join(", ")}).`);
    const longest = longestShot(pace, seconds, montage, format);
    if (longest)
        scenes.forEach((x, j) => x.seconds > longest + 0.01 && out.push(`${at} shot ${j + 1} runs ${x.seconds} seconds; no shot runs over ${longest}. Cut it into 2 shots.`));
    return out;
}
export function videoPlanProblems(plan: Pick<VideoPlan, "segments" | "visual_direction" | "cut" | "speech">, segments: number, seconds: number | number[] = SEGMENT_SECONDS, mode?: ReferenceMode | null, first = 0, coverage = true, format?: string): string[] {
    const cut = mode === "exact" ? undefined : plan.cut;
    const lim = planLimits(mode, !!cut, !!cut?.cover, !!cut?.montage);
    const full = Array.isArray(seconds) ? Math.max(SHORTEST_CLIP, ...seconds) : seconds;
    const lengthOf = (i: number) => (Array.isArray(seconds) ? (seconds[i] ?? full) : seconds);
    const out: string[] = [];
    if (plan.segments.length !== segments)
        out.push(`There must be exactly ${segments} segments; you wrote ${plan.segments.length}.`);
    plan.segments.forEach((s, at) => {
        const i = first + at;
        const own = lengthOf(i);
        const limit = maxWords(own, mode, plan.speech?.rate);
        const secs = s.scenes.reduce((n, x) => n + x.seconds, 0);
        if (Math.abs(secs - own) > 0.01)
            out.push(`Segment ${i + 1}: scene seconds add up to ${Math.round(secs * 100) / 100}, not ${own}.`);
        if (s.scenes.length > lim.scenes)
            out.push(`Segment ${i + 1}: ${s.scenes.length} scenes; the limit is ${lim.scenes}.`);
        if (cut) {
            const fewest = minShots(cut, own, full, plan.speech?.rate, format);
            if (s.scenes.length < fewest)
                out.push(`Segment ${i + 1}: ${s.scenes.length} shot${s.scenes.length === 1 ? "" : "s"} in ${own} seconds; it needs at least ${fewest}, with a hard cut between them. Split the action into more shots: a new framing for each new idea in the words.`);
            if (cut.cover) {
                if (coverage)
                    out.push(...coverageProblems(s.scenes, i, own, cut.pace, !!cut.montage, format));
            }
            else
                s.scenes.forEach((x, j) => {
                    if (!x.shot?.trim())
                        out.push(`Segment ${i + 1} shot ${j + 1} does not say how it is filmed: how close the camera is and how it is held.`);
                    else if (j > 0 && sameFraming(x.shot, s.scenes[j - 1].shot ?? "") && !x.place?.trim() && !s.scenes[j - 1].place?.trim())
                        out.push(`Segment ${i + 1}: shots ${j} and ${j + 1} are framed the same way ("${x.shot.trim()}"); every cut changes how close the camera is or how it is held.`);
                });
        }
        const words = s.scenes.reduce((n, x) => n + wordsIn(x.dialogue), 0);
        if (words > limit)
            out.push(`Segment ${i + 1}: ${words} spoken words; the limit is ${limit}. ${mode === "exact" ? "Move the segment boundary to an earlier cut." : "Cut words, don't move them to another segment."}`);
        s.scenes.forEach((x, j) => {
            const room = lim.visual + (cut?.cover ? (coverage ? SHOT_SLACK : 2 * SHOT_SLACK) : 0);
            if (x.visual.length > room)
                out.push(`Segment ${i + 1} scene ${j + 1}: visual is ${x.visual.length} characters; keep it under ${room}.`);
        });
    });
    if (plan.visual_direction.length > 220)
        out.push(`visual_direction is ${plan.visual_direction.length} characters; keep it under 220.`);
    plan.segments.forEach((s, at) => {
        const i = first + at;
        for (const k of ["start", "end"] as const)
            if ((s[k]?.length ?? 0) > 260)
                out.push(`Segment ${i + 1}: ${k} is ${s[k]!.length} characters; keep it under 220.`);
    });
    return out;
}
export function exactLayout(duration: number, lengths: number[]): {
    segments: number;
    clipSeconds: number;
} {
    let best = { segments: 1, clipSeconds: lengths.includes(SEGMENT_SECONDS) ? SEGMENT_SECONDS : lengths[0], score: Infinity };
    const most = Math.min(MAX_CLIPS, Math.max(6, Math.ceil(duration / SEGMENT_SECONDS)));
    for (const c of lengths) {
        for (let n = 1; n <= most; n++) {
            const diff = n * c - duration;
            const score = (diff >= 0 ? diff : -diff * 3) + Math.abs(c - SEGMENT_SECONDS) * 0.01 + n * 0.001;
            if (score < best.score)
                best = { segments: n, clipSeconds: c, score };
        }
    }
    return { segments: best.segments, clipSeconds: best.clipSeconds };
}
export function shotPlanModeRules(mode: ReferenceMode | null | undefined, seconds: number, dealt = false): string {
    if (mode === "exact") {
        const lim = planLimits("exact");
        return [
            `REFERENCE MODE A, SAME AD IN A NEW FORMAT. This overrides rules 1, 2, 6 and 10 above. The scenes of a segment are separate shots with hard cuts between them, not 1 continuous take.`,
            `- The script is a finished ad, copied word for word. Do not cut, add, re-order or reword any spoken line or on-screen line. Every spoken word appears once, in order.`,
            `- 1 scene per reference shot, up to ${lim.scenes} scenes per segment. \`visual\` (under ${lim.visual} characters) restates that shot in this format: same setting, framing, action, props and product placement, performed by the character.`,
            dealt
                ? `- The spoken lines of each clip are fixed, as listed under "The clips to write". Inside a clip the shot lengths follow the reference, scaled evenly so every segment adds up to exactly ${seconds} seconds.`
                : `- Timing follows the reference. Put each segment boundary at the cut nearest a ${seconds}-second mark, never inside a sentence if a cut within 1.5 seconds avoids it, and scale the shot lengths evenly so every segment adds up to exactly ${seconds} seconds. Up to ${maxWords(seconds, "exact")} spoken words per segment.`,
            `- The character follows the reference's on-camera person (see "People" in the reference), not the brand's default presenter. If the reference shows several different people, use 1 consistent character for all of them unless the user's notes say otherwise. If it uses a voiceover, \`voice_direction\` describes 1 narrator and the character does not lip-sync.`,
            `- Small print the reference holds on screen across several shots (a disclaimer) goes in the \`overlay\` of the first scene it appears in, once. Do not repeat it.`,
            `- Never recreate a real person, a celebrity, a meme of a real person or a third party's character. Replace it with a generic equivalent that does the same job and say so in \`notes\`.`,
            `- \`notes\`: say how the timing was scaled and anything the new format could not show as shot.`,
        ].join("\n");
    }
    if (mode === "structure") {
        return [
            `REFERENCE MODE B, STEP BY STEP. The script was written step by step on a reference ad, whose shot list is given below: each line does the job of 1 of its rows, for this brand.`,
            `- Where a script line does the same job as its reference row, give it the kind of shot that row had (framing, editing rhythm), with this brand's product and character. Where the script changed or dropped a step, the script's own visual note wins.`,
            `- Nothing that belongs to the other brand is rebuilt: not its setting, its props or its people.`,
            `- The words are the script's. The rules above apply in full.`,
        ].join("\n");
    }
    if (mode === "principles")
        return `REFERENCE MODE C, LOOSE INSPIRATION. A reference ad shaped the idea only. Do not rebuild its shots; plan the best shots for this script.`;
    return "";
}
const CHARACTER_ONLY = ["claymation", "cartoon", "talking-object", "comic", "explainer", "cinematic-3d", "clay-world", "wool", "paper", "watercolor", "anime", "skeleton", "motion-graphics", "collage", "song"];
export const recipeUsesCharacterOnly = (r: Pick<FormatRecipe, "id">) => CHARACTER_ONLY.includes(r.id);
export function castKindBrief(r: Pick<FormatRecipe, "id">): string {
    return recipeUsesCharacterOnly(r)
        ? "Who is on screen: this format is cast with a made character, not a filmed person. Fill `cast.character` with 1 sentence that a picture can be drawn from (what it is and what it is made of or drawn as, its build, its colours, its face, what it wears or carries). Each of the 3 `cast_options` has a `label` and a `character` sentence."
        : "Who is on screen: this format is cast with a person. Fill `cast.presenter`. Each of the 3 `cast_options` has a `label` and a `presenter`.";
}
export function castProblems(r: Pick<FormatRecipe, "id" | "character"> & Partial<Pick<FormatRecipe, "people">>, cast: {
    presenter?: unknown;
    character?: string | null;
    guest?: unknown;
}): string[] {
    if (!r.character)
        return [];
    if (isCinematic(r) && (r.people ?? 1) > 1 && !cast.guest)
        return ["The two-character cinematic format requires cast.guest as Character B, a distinct fictional adult."];
    if (recipeUsesCharacterOnly(r))
        return cast.character?.trim() ? [] : ["`cast.character` is empty. This format is cast with a made character: describe it in 1 sentence in `cast.character`, leave `cast.presenter` null, and give each of the 3 `cast_options` a `character` sentence."];
    return cast.presenter ? [] : ["`cast.presenter` is empty. This format is cast with a person: fill `cast.presenter`, and give each of the 3 `cast_options` a `presenter`."];
}
export type { VideoProfile };
export const isSeedance25 = (model: string) => videoModelEntry(model)?.id === "seedance-2.5";
export const videoProfile = (model: string): VideoProfile => videoModelInfo(model).prompt;
export const STORYBOARD_FRAMES = { min: 1, max: 8, default: 4 } as const;
export const clampFrames = (n: unknown) => Math.min(STORYBOARD_FRAMES.max, Math.max(STORYBOARD_FRAMES.min, Math.round(Number(n)) || STORYBOARD_FRAMES.default));
export const framesPerClip = (p: Pick<ProductionState, "storyboard_frames">) => (p.storyboard_frames == null ? 1 : clampFrames(p.storyboard_frames));
export const hasStoryboard = (p: Pick<ProductionState, "segments" | "storyboard_frames">) => p.segments > 1 || p.storyboard_frames != null;
export const storyboardImages = (p: Pick<ProductionState, "segments" | "storyboard_frames"> & Partial<Pick<ProductionState, "video_plan" | "clip_seconds">>) => !hasStoryboard(p) ? 0 : p.video_plan ? storyboardWords(p.video_plan, framesPerClip(p)).length : p.segments * framesPerClip(p);
const STOP = new Set(["the", "a", "an", "and", "of", "in", "at", "to", "its", "her", "his", "their", "is", "are", "with"]);
const momentWords = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, " ").split(" ").filter((w) => w && !STOP.has(w)));
export function sameMoment(a: string, b: string): boolean {
    const x = momentWords(a);
    const y = momentWords(b);
    if (!x.size || !y.size)
        return false;
    const both = [...x].filter((w) => y.has(w)).length;
    return both / (x.size + y.size - both) >= 0.7;
}
export function distinctFrames(frames: StoryFrame[]): StoryFrame[] {
    const end = frames.find((f) => f.moment === "end");
    const keys: StoryFrame[] = [];
    for (const f of frames) {
        if (f.moment !== "key")
            continue;
        if (end && sameMoment(f.description, end.description))
            continue;
        if (keys.some((k) => sameMoment(k.description, f.description)))
            continue;
        keys.push(f);
    }
    return end ? [...keys, end] : keys;
}
export function clipFrames(seg: VideoPlan["segments"][number], perClip: number, shots?: {
    first: boolean;
}): StoryFrame[] {
    const seconds = segmentSeconds(seg);
    const n = clampFrames(perClip);
    const written = (seg.frames ?? []).filter((f) => f.description?.trim());
    if (written.length && written.length <= n && written[written.length - 1].moment === "end" && (written.length === n || seg.frames_for === n))
        return written;
    const last = seg.scenes[seg.scenes.length - 1];
    const end: StoryFrame = written.find((f) => f.moment === "end") ?? { moment: "end", at: seconds, description: seg.end?.trim() || last.visual };
    const keys = written.filter((f) => f.moment === "key");
    if (keys.length === n - 1)
        return distinctFrames([...keys, { ...end, at: seconds }]);
    if (shots) {
        const starts = shotStarts(seg);
        const all = seg.scenes.map((_, i) => i).slice(shots.first ? 1 : 0, -1);
        const at = all.length <= n - 1 ? all : Array.from({ length: n - 1 }, (_, k) => all[Math.round((k * (all.length - 1)) / Math.max(1, n - 2))]).filter((x, i, list) => list.indexOf(x) === i);
        return distinctFrames([...at.map((i): StoryFrame => ({ moment: "key", at: starts[i], description: seg.scenes[i].visual })), { ...end, at: seconds }]);
    }
    const out: StoryFrame[] = [];
    for (let k = 1; k < n; k++) {
        const at = Math.round(((seconds * k) / n) * 2) / 2;
        let t = 0;
        const scene = seg.scenes.find((s) => (t += s.seconds) > at - 0.01) ?? last;
        out.push({ moment: "key", at, description: scene.visual });
    }
    return distinctFrames([...out, { ...end, at: seconds }]);
}
export function shortClips(plan: Pick<VideoPlan, "segments" | "cut">, perClip: number): {
    clip: number;
    frames: number;
    asked: number;
}[] {
    const asked = clampFrames(perClip);
    return plan.segments.map((seg, clip) => ({ clip, frames: clipFrames(seg, asked, plan.cut ? { first: clip === 0 } : undefined).length, asked })).filter((x) => x.frames < asked);
}
export function shortClipsText(plan: Pick<VideoPlan, "segments" | "cut">, perClip: number): string {
    const short = plan.cut ? [] : shortClips(plan, perClip);
    if (!short.length)
        return "";
    return `${short.map((x) => `Clip ${x.clip + 1} gets ${x.frames} frame${x.frames === 1 ? "" : "s"}, not ${x.asked}`).join(". ")}. The plan has fewer different moments there, so no picture is drawn twice.`;
}
export function storyboardWords(plan: Pick<VideoPlan, "segments" | "cut">, perClip: number): (StoryFrame & {
    clip: number;
})[] {
    return plan.segments.flatMap((seg, clip) => clipFrames(seg, perClip, plan.cut ? { first: clip === 0 } : undefined).map((f) => ({ ...f, clip })));
}
export function withFrameWords(plan: VideoPlan, perClip: number, index: number, description: string): VideoPlan {
    const all = storyboardWords(plan, perClip);
    const target = all[index];
    if (!target)
        return plan;
    const frames = all.filter((f) => f.clip === target.clip).map(({ clip: _clip, ...f }) => f);
    frames[index - all.findIndex((f) => f.clip === target.clip)].description = description.trim();
    const end = frames[frames.length - 1].description;
    return { ...plan, segments: plan.segments.map((s, i) => (i === target.clip ? { ...s, frames, frames_for: clampFrames(perClip), ...(target.moment === "end" ? { end } : {}) } : i === target.clip + 1 && target.moment === "end" ? { ...s, start: end } : s)) };
}
export const withScenes = (plan: VideoPlan, clip: number, scenes: VideoPlan["segments"][number]["scenes"]): VideoPlan => ({ ...plan, segments: plan.segments.map((s, i) => (i === clip ? { ...s, scenes } : s)) });
export function drawnFrames(storyboard: Pick<PrepStage, "panels" | "frames"> | undefined, clip: number): Pick<StoryboardFrame, "moment" | "at" | "file" | "description">[] {
    if (!storyboard)
        return [];
    if (storyboard.frames)
        return storyboard.frames.filter((f) => f.clip === clip && f.file);
    const file = storyboard.panels[clip];
    return file ? [{ moment: "end", at: 0, file, description: "" }] : [];
}
export interface ClipRef {
    purpose: string;
    detail?: string;
    short?: string;
}
export const MAX_CLIP_IMAGES = videoModelInfo(PACK_MODEL).maxImages;
export function frameRef(f: Pick<StoryFrame, "moment" | "at" | "description">, nth: number, keys: number, shot?: number): ClipRef {
    const detail = f.description?.trim() || undefined;
    if (shot !== undefined)
        return f.moment === "end" ? { purpose: `is shot ${shot + 1}, the last, and the frame the clip ends on`, short: `is shot ${shot + 1}, the last`, detail } : { purpose: `is shot ${shot + 1}${f.at ? `, from ${Math.round(f.at)}s` : ", the first"}`, short: `is shot ${shot + 1}`, detail };
    if (f.moment === "end")
        return { purpose: "is the last frame, where the clip ends", short: "is the last frame", detail };
    return { purpose: `is key moment ${nth}${keys > 1 ? ` of ${keys}` : ""}${f.at ? `, about ${Math.round(f.at)}s in` : ""}`, short: `is key moment ${nth}${f.at ? ` (${Math.round(f.at)}s)` : ""}`, detail };
}
export const FRAME_PURPOSE = {
    key: (at: number) => `is a key moment the action passes through${at ? `, about ${Number.isInteger(at * 2) ? Math.round(at) : Math.round(at * 10) / 10} seconds in` : ""}. It defines the pose, what each hand holds and where each object is at that moment`,
    end: "is the last frame. It defines the ending composition, the person's pose, what each hand holds and where each object is",
};
export const CAST_OPTIONS = 3;
export function castLine(o: Pick<CastOption, "presenter" | "character">): string {
    const p = o.presenter;
    if (!p)
        return (o.character ?? "").trim();
    return [[p.gender, p.age].filter(Boolean).join(", "), p.skin_tone && `${p.skin_tone} skin`, p.eyes && `${p.eyes} eyes`, p.hair, p.wardrobe, p.features].filter(Boolean).join("; ");
}
export function castOptions(cast: Pick<VideoPlan["cast"], "presenter" | "character">, written: CastOption[] = []): CastOption[] {
    const human = !!cast.presenter;
    const own: CastOption = { label: "Option 1", ...(human ? { presenter: cast.presenter } : { character: cast.character ?? "" }) };
    const key = (o: CastOption) => castLine(o).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const out: CastOption[] = [];
    for (const o of [own, ...written]) {
        const fit: CastOption = human ? { label: o.label, presenter: o.presenter, ...(o.why ? { why: o.why } : {}) } : { label: o.label, character: o.character, ...(o.why ? { why: o.why } : {}) };
        if (!key(fit) || out.some((x) => key(x) === key(fit)))
            continue;
        out.push(fit);
    }
    const first = written.find((o) => key(human ? { label: "", presenter: o.presenter } : { label: "", character: o.character }) === key(own));
    if (first && out[0])
        out[0] = { ...out[0], label: first.label || out[0].label, ...(first.why ? { why: first.why } : {}) };
    return out.slice(0, CAST_OPTIONS).map((o, i) => ({ ...o, label: o.label?.trim() || `Option ${i + 1}` }));
}
export const partsWithoutPhoto = (plan: Pick<VideoPlan, "product_parts">): string[] => (plan.product_parts ?? []).filter((x) => !x.photo).map((x) => x.name);
export function partFlag(name: string): string {
    const many = /[^s]s$/i.test(name.trim());
    return `The plan shows ${/^(the|a|an) /i.test(name) ? name : `the ${name}`}, but there is no photo of ${many ? "them" : "it"}. Upload one, or ${many ? "they" : "it"} will be drawn from a description and small print may come out wrong.`;
}
export function plainPartsLine(plan: Pick<VideoPlan, "product_parts">): string {
    const names = partsWithoutPhoto(plan);
    if (!names.length)
        return "";
    const many = names.length > 1;
    return `No photo exists of ${names.join(" or ")}. Draw ${many ? "each" : "it"} plain: the shape and colours described, with no readable small print, no ingredient or legal text, and no words or logos beyond what ${many ? "their descriptions name" : "its description names"}.`;
}
export function fixedMarks(presenter?: Record<string, string>): string {
    const marks = [presenter?.features, presenter?.hair].map((x) => (x ?? "").trim().replace(/[.;,\s]+$/, "")).filter(Boolean);
    return marks.length ? `Fixed marks, the same in number and place in every picture: ${marks.join("; ")}.` : "";
}
export function withCast(plan: VideoPlan, index: number): VideoPlan {
    const o = plan.cast_options?.[index];
    if (!o)
        return plan;
    const next: VideoPlan = { ...plan, cast: { ...plan.cast, ...(o.presenter ? { presenter: o.presenter } : {}), ...(o.character ? { character: o.character } : {}) }, cast_choice: index };
    const to = castSex(o);
    if (!to || !castSex(plan.cast_options?.[0]) || plan.cast.guest || castSex(plan.cast) === to)
        return next;
    const say = (t: string) => saidFor(t, to);
    const narrated = /voice-?over|narrat|off[- ]?(camera|screen)/i.test(plan.cast.voice_direction ?? "");
    return {
        ...next,
        cast: { ...next.cast, ...(narrated ? {} : { voice_direction: say(next.cast.voice_direction) }) },
        segments: plan.segments.map((s) => ({ ...s, scenes: s.scenes.map((sc) => ({ ...sc, visual: say(sc.visual) })), ...(s.start ? { start: say(s.start) } : {}), ...(s.end ? { end: say(s.end) } : {}), ...(s.frames ? { frames: s.frames.map((f) => ({ ...f, description: say(f.description) })) } : {}) })),
    };
}
type Sex = "woman" | "man";
export const sexOf = (presenter?: Record<string, string>): Sex | "" => (/^(f|w)/i.test(presenter?.gender ?? "") ? "woman" : /^m/i.test(presenter?.gender ?? "") ? "man" : "");
export function castSex(c?: Pick<CastOption, "presenter" | "character">): Sex | "" {
    if (c?.presenter)
        return sexOf(c.presenter);
    const named = /\b(?:(she|hers?|herself|woman|female)|he|him|his|himself|man|male)\b/i.exec(c?.character ?? "");
    return !named ? "" : named[1] ? "woman" : "man";
}
const AFTER_HER = /^(and|to|with|at|in|on|as|while|then|from|by|for|but|or|so|who|a|an|the|her|is|was|up|down|off|out|away|over|into)$/i;
export function saidFor(text: string, to: Sex): string {
    const cased = (from: string, word: string) => (/^[A-Z]/.test(from) ? word[0].toUpperCase() + word.slice(1) : word);
    if (to === "man")
        return text.replace(/\b(she|herself|hers|her|woman|female)\b(?=(?:\s+([A-Za-z0-9'-]+))?)/gi, (w: string, _w: string, after: string | undefined) => {
            const k = w.toLowerCase();
            return cased(w, k === "she" ? "he" : k === "herself" ? "himself" : k === "hers" ? "his" : k === "woman" ? "man" : k === "female" ? "male" : !after || AFTER_HER.test(after) ? "him" : "his");
        });
    return text.replace(/\b(he|himself|him|his|man|male)\b/gi, (w) => {
        const k = w.toLowerCase();
        return cased(w, k === "he" ? "she" : k === "himself" ? "herself" : k === "man" ? "woman" : k === "male" ? "female" : "her");
    });
}
export function avatarKindFor(r: Pick<FormatRecipe, "id" | "character" | "people">): AvatarKind | null {
    if (!r.character || (r.people ?? 1) > 1)
        return null;
    return recipeUsesCharacterOnly(r) ? "character" : "person";
}
export const sheetViews = (r: Pick<FormatRecipe, "people">): number => ((r.people ?? 1) > 1 ? 3 : 6);
export function avatarInFormat(a: Avatar, r: Pick<FormatRecipe, "id" | "label">): Avatar {
    if (a.kind !== "person" || !avatarLine(a) || !recipeUsesCharacterOnly(r))
        return a;
    const kept = a.styled?.[r.id];
    const { presenter: _presenter, ...rest } = a;
    return { ...rest, kind: "character", style: r.id, character: `${avatarLine(a).replace(/[.;,\s]+$/, "")}. The same person in every picture, made the way ${r.label.toLowerCase()} makes a character`, sheet: kept?.sheet ?? null, panels: kept?.panels ?? [] };
}
export function avatarBrief(a: Pick<Avatar, "kind" | "presenter" | "character" | "voice">): string {
    const person = a.kind === "person" && !!a.presenter;
    const who = person
        ? `Who is on screen: this video is already cast, with a person the brand has saved: ${avatarLine(a)}. The cast is fixed by the brand (${JSON.stringify(a.presenter)}); the schema has no presenter or cast_options to fill.`
        : `Who is on screen: this video is already cast, with a made character the brand has saved: ${avatarLine(a)} The cast is fixed by the brand; the schema has no character or cast_options to fill.`;
    const voice = a.voice.direction.trim() ? ` The voice is fixed too: \`cast.voice_direction\` is exactly this, word for word: ${a.voice.direction.trim()}` : "";
    return `${who} Write every shot for ${person ? "this person" : "this character"}, looking as described in every one.${voice}`;
}
export function withAvatar(plan: VideoPlan, a: Pick<Avatar, "name" | "kind" | "presenter" | "character" | "voice">, portrait?: string | null): VideoPlan {
    const who = avatarCast(a);
    const { presenter: _presenter, character: _character, ...rest } = plan.cast;
    const direction = a.voice.direction.trim();
    return { ...plan, cast: { ...rest, ...who, ...(direction ? { voice_direction: direction } : {}) }, cast_options: [{ label: a.name, ...who, ...(portrait ? { portrait } : {}) }], cast_choice: 0 };
}
export const castIsAvatar = (plan: Pick<VideoPlan, "cast">, a: Pick<Avatar, "kind" | "presenter" | "character">): boolean => !!avatarLine(a) && castLine(plan.cast) === avatarLine(a);
export const SCENE_SECONDS = 6;
export const spokenWords = (lines: {
    text: string;
}[]) => lines.reduce((n, l) => n + wordsIn(l.text), 0);
export function dealScript(lines: SpokenLine[], o: {
    clips?: number;
    seconds?: number;
    mode?: ReferenceMode | null;
    rate?: number;
    lengths?: number[];
} = {}): Deal {
    const seconds = o.seconds ?? SEGMENT_SECONDS;
    const base = { aim: aimWords(seconds, o.mode, o.rate), limit: maxWords(seconds, o.mode, o.rate), ...(o.clips ? { clips: o.clips } : {}) };
    const may = (o.lengths ?? Array.from({ length: Math.max(0, seconds - SHORTEST_CLIP + 1) }, (_, i) => SHORTEST_CLIP + i)).filter((x) => x <= seconds).sort((a, b) => a - b);
    const anyLength = may.length > 1 && may.every((x, i) => i === 0 || x === may[i - 1] + 1);
    if (o.mode === "exact" || !anyLength || may[0] >= SCENE_SECONDS)
        return dealLines(lines, base);
    const rate = o.rate && o.rate > 0 ? o.rate : USUAL_PACE;
    return dealLines(lines, { ...base, scene: { words: Math.floor(Math.min(seconds, SCENE_SECONDS) * rate), least: Math.round(may[0] * rate * 0.8) } });
}
export function clipLengths(deal: Deal | null, o: {
    seconds?: number;
    lengths?: number[];
    mode?: ReferenceMode | null;
    clips?: number;
    rate?: number;
} = {}): number[] {
    const rate = o.rate && o.rate > 0 ? o.rate : USUAL_PACE;
    const longest = o.seconds ?? SEGMENT_SECONDS;
    if (!deal || o.mode === "exact")
        return Array.from({ length: deal?.clips.length ?? o.clips ?? 0 }, () => longest);
    const may = (o.lengths ?? Array.from({ length: Math.max(0, longest - SHORTEST_CLIP + 1) }, (_, i) => SHORTEST_CLIP + i)).filter((x) => x <= longest).sort((a, b) => a - b);
    return deal.clips.map((c) => {
        const words = clipWords(c);
        if (!words)
            return longest;
        const needs = Math.ceil(Math.round((words / rate) * 1000) / 1000);
        return may.find((x) => x >= needs) ?? longest;
    });
}
export function clipsForScript(lines: SpokenLine[], seconds = SEGMENT_SECONDS, rate?: number, lengths?: number[]): number {
    return dealScript(lines, { seconds, ...(rate ? { rate } : {}), ...(lengths ? { lengths } : {}) }).needs;
}
const brief = (s?: string) => (s ?? "").split(/[,;.]/)[0].trim();
export function personAnchor(presenter?: Record<string, string>): string {
    if (!presenter)
        return "";
    const who = sexOf(presenter) || "person";
    return [`the ${who}`, brief(presenter.hair), brief(presenter.wardrobe)].filter(Boolean).join(", ");
}
export interface ClipPromptArgs {
    index: number;
    count: number;
    seconds?: number;
    aspect: string;
    resolution: string;
    recipe: FormatRecipe;
    preset: string;
    brand: string;
    product: string;
    plan: VideoPlan;
    images: (string | ClipRef)[];
    chainByVideo?: boolean;
    chain?: "reference" | "extend";
    limit?: number;
    timing?: VideoProfile["timing"];
    speech?: VideoProfile["speech"];
    language?: string;
    refNotes?: string[];
    refNotesShort?: string[];
    cuts?: boolean;
    audio?: VideoAudio;
}
export function shorten(text: string, max: number): string {
    const t = text.replace(/\s+/g, " ").trim();
    if (t.length <= max)
        return t;
    const head = t.slice(0, max);
    const stop = Math.max(head.lastIndexOf(". "), head.lastIndexOf("; "));
    if (stop > max * 0.5)
        return head.slice(0, stop).replace(/[,;:]$/, "") + ".";
    const comma = head.lastIndexOf(", ");
    if (comma > max * 0.6)
        return head.slice(0, comma) + ".";
    return head.slice(0, Math.max(head.lastIndexOf(" "), 1)).replace(/[,;:]$/, "") + ".";
}
const sentence = (s: string) => {
    const t = s.trim().replace(/\s+/g, " ");
    return !t || /[.!?"]$/.test(t) ? t : `${t}.`;
};
const orderWord = (i: number, n: number) => (n === 1 ? "" : i === 0 ? "First:" : i === n - 1 ? "Finally:" : "Then:");
export function clipPrompt(args: ClipPromptArgs): string {
    const { index, count, plan, recipe } = args;
    const limit = args.limit ?? API_PROMPT_LIMIT;
    const last = index === count - 1;
    const c = plan.cast;
    const seg = plan.segments[index];
    const seconds = args.seconds ?? segmentSeconds(seg);
    const human = !!c.presenter && !recipeUsesCharacterOnly(recipe);
    const video = index > 0 && args.chainByVideo !== false;
    const spoken = seg.scenes.some((s) => s.dialogue.trim());
    const duo = human && (recipe.people ?? 1) > 1;
    const cinematic = isCinematic(recipe);
    const anime = recipe.id === "anime";
    const podcast = recipe.id === "podcast";
    const [aRole, bRole] = castRoles(recipe);
    const directed = !!plan.cut;
    const pair = (role: string, p?: Record<string, string>) => `the ${role}${p ? ` (${personAnchor(p).replace(/^the /, "")})` : ""}`;
    const who = cinematic && duo ? `Cast: ${pair(aRole, c.presenter)} and ${pair(bRole, c.guest)}. Each shot shows only its named cast; match identity without copying sheet blocking.` : cinematic && human ? `Cast: ${personAnchor(c.presenter)}; identity stays fixed wherever this adult appears. Show only the subjects this shot names.` : podcast && directed && duo ? `Cast: ${pair("Host", c.presenter)} on the left and ${pair("Guest", c.guest)} on the right. Each shot shows only its named cast; identities and sides stay fixed. Nobody else in the frame.` : duo ? `People: 2 adults, ${pair("Host", c.presenter)} on the left and ${pair("Guest", c.guest)} on the right, as in the reference pictures; the same 2 people ${directed ? "in every shot" : "from the first frame to the last"}, and the only people in the frame.` : human ? `Person: ${personAnchor(c.presenter)}; the same adult ${directed ? "in every shot" : "from the first frame to the last"}, and the only person in the frame.` : c.character ? `Character: ${c.character}` : "";
    const voiceOver = /voice-?over|narrat|off[- ]?(camera|screen)/i.test(c.voice_direction ?? "");
    const ownVoice = !human && !!c.character && !voiceOver;
    const speaker = human && !voiceOver ? personAnchor(c.presenter).split(",")[0].replace(/^t/, "T") : ownVoice ? "The character" : "The voice";
    const turn = (said: string): {
        by: string;
        words: string;
    } => {
        const m = cinematic ? /^\s*(character a|character b|narrator)\s*:\s*([\s\S]+)$/i.exec(said) : duo ? /^\s*(host|guest)\s*:\s*([\s\S]+)$/i.exec(said) : null;
        if (!m)
            return { by: cinematic && !voiceOver ? `The ${aRole}` : speaker, words: said };
        const role = cinematic ? m[1].toLowerCase() === "narrator" ? "Narrator" : m[1].toLowerCase() === "character b" ? bRole : aRole : m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
        return { by: `The ${role}`, words: m[2].trim() };
    };
    const starts = shotStarts(seg);
    const sceneLines = (cut?: number) => {
        let t = 0;
        const n = seg.scenes.length;
        if (directed)
            return seg.scenes.map((s, i) => {
                const to = i === n - 1 ? seconds : starts[i + 1] > starts[i] ? starts[i + 1] : starts[i] + 1;
                const how = [cut ? framing(s) : filmed(s), s.place?.trim() ? `place: ${s.place.trim().replace(/\.$/, "")}` : ""].filter(Boolean).join("; ");
                const face = s.face?.trim() ? `${sentence(`Face: ${s.face.trim()}`)} ` : "";
                return `${args.timing === "seconds" ? `[${starts[i]}-${to}s] ` : ""}Shot ${i + 1}${how ? ` (${how})` : ""}: ${face}${sentence(cut ? shorten(s.visual, cut) : s.visual)}`;
            });
        return seg.scenes.map((s, i) => {
            const from = Math.round(t);
            t += s.seconds;
            const to = i === n - 1 ? seconds : Math.max(from + 1, Math.round(t));
            const label = [args.timing === "seconds" ? `[${from}-${to}s]` : "", args.cuts ? `Shot ${i + 1}:` : args.timing === "seconds" ? "" : orderWord(i, n)].filter(Boolean).join(" ");
            const said = s.dialogue.trim();
            const line = !said ? "" : args.audio?.enabled === false ? `\nSilent performance words (not audible): "${turn(said).words}"` : args.speech === "quotes" ? `\n${turn(said).by}'s line${s.tone?.trim() ? ` (${s.tone.trim()})` : ""}: "${turn(said).words}"` : `${s.tone?.trim() ? ` Delivery: ${sentence(s.tone)}` : ""} ${human ? "Says" : ownVoice ? "The character says" : "Voice says"} {${said}}`;
            return `${label} ${sentence(cut ? shorten(s.visual, cut) : s.visual)}${line}`.trim();
        });
    };
    const speech = (): string => {
        const said = seg.scenes.filter((s) => s.dialogue.trim());
        if (!directed || !said.length)
            return "";
        if (args.audio?.enabled === false)
            return `Silent performance words (not audible):\n${said.map((s) => `${turn(s.dialogue.trim()).by}: "${turn(s.dialogue.trim()).words}"`).join("\n")}`;
        const lines = said.map((s) => {
            const t = turn(s.dialogue.trim());
            return args.speech === "quotes" ? `${t.by}${s.tone?.trim() ? ` (${s.tone.trim()})` : ""}: "${t.words}"` : `${s.tone?.trim() ? `Delivery: ${sentence(s.tone)} ` : ""}${human ? "Says" : ownVoice ? "The character says" : "Voice says"} {${s.dialogue.trim()}}`;
        });
        const seen = cinematic ? "Only the named character speaks with lip sync when visible; a listener is silent. Narrator lines are off screen and move no mouth." : voiceOver || (!human && !ownVoice) ? "" : `${duo ? "Each speaker" : speaker} is seen saying the words in the shots that show ${duo ? "that speaker's" : human ? "the speaker's" : "its"} face, and is heard over the other shots.`;
        const quick = !!plan.cut?.cover && plan.cut.pace !== "calm" && (plan.speech?.rate ?? USUAL_PACE) >= 3.2;
        return [podcast ? "Speech follows the timed speaker turns and live silent reactions; never overlap voices or change the approved words:" : cinematic || anime ? "Speech follows the timed shots and stated performance pauses; never overlap speakers, rush a reveal or change the approved words:" : quick ? `Spoken as 1 unbroken track across the cuts, from 0s, with no pause at a cut or between sentences:` : `Spoken as 1 unbroken track across the cuts, from 0s, with no pause at a cut:`, ...lines, seen].filter(Boolean).join("\n");
    };
    const usualSound = !args.audio || (args.audio.enabled && args.audio.sounds && !args.audio.music);
    const voiceOf = cinematic ? "the voices of the speakers named" : duo ? "the 2 speakers' voices" : human && !voiceOver ? `${personAnchor(c.presenter).split(",")[0]}'s voice` : ownVoice ? "the character's voice" : voiceOver ? "the narrator's voice" : "the voice";
    const heard = (s: string) => (args.speech === "quotes" ? s : `<${s}>`);
    const soundtrack = `Audio: ${spoken ? `${voiceOf} and ${heard("the room's own sounds")}` : heard("the sounds the action itself makes, close and clear, and the room's own sounds")}, nothing else.`;
    const extend = video && !directed && args.chain === "extend";
    const endTag = args.images.findIndex((r) => typeof r !== "string" && /^is the last frame/.test(r.purpose) && !!r.detail);
    const refLines = (frameCut?: number, tight = false, bare = false) => [
        ...args.images.map((r, i) => {
            const tag = `@Image${i + 1}`;
            if (typeof r === "string")
                return /^(defines|is) /.test(r) ? `${tag} ${sentence(r)}` : `${tag} = ${r}`;
            const purpose = tight && r.short ? r.short : r.purpose;
            const detail = r.detail && frameCut !== 0 ? `: ${frameCut ? shorten(r.detail, frameCut) : r.detail}` : "";
            return /^(defines|is|are) /.test(purpose) ? `${tag} ${sentence(`${purpose}${detail}`)}` : `${tag} = ${sentence(`${purpose}${detail}`)}`;
        }),
        ...(video && directed ? [bare || tight ? "@Video1 = the previous clip: the same cast, voice and look. Open on a hard cut to a new shot. Replay none of it." : "@Video1 = the previous clip of this video: the same cast, voice, light and look. This clip opens with a hard cut to a new shot. Replay none of it and repeat none of its words"] : []),
        ...(video && !directed && bare ? [extend ? "@Video1 is the source video to extend forward from its last frame. Replay none of it." : "@Video1 = the previous clip. Continue from its last frame. Replay none of it."] : []),
        ...(video && !directed && tight && !bare ? [extend ? "@Video1 is the source video to extend forward: continue directly from its last frame with the same pose, objects, place, framing, light and voice. Replay none of it and repeat none of its words." : "@Video1 = the previous clip. Continue from its last frame with the same cast, place, light, framing and voice. Replay none of it"] : []),
        ...(video && !directed && !tight ? [extend ? "@Video1 is the source video to extend forward. The first frame of the new footage continues directly from the last frame of @Video1. Keep continuous with it: the person's pose and the way they face, each object's position, the background, the camera position and framing, the light and the voice. Replay none of it and repeat none of its words." : "@Video1 = the previous clip of this video. Continue from its last frame with the same cast, place, light, framing and voice. Replay none of it and repeat none of its words"] : []),
        ...(bare ? [] : tight && args.refNotesShort ? args.refNotesShort : (args.refNotes ?? [])),
    ];
    const inClip = directed ? propsIn(plan, index) : (plan.props ?? []);
    const shown = !directed || productIn(plan, index);
    const props = (look: number, bare = false) => (inClip.length ? `${directed ? "The only objects, each in the shots that name it" : "The only objects in the scene"}: ${inClip.map((p) => `${p.name}${p.look && look ? ` (${shorten(p.look, look).replace(/\.$/, "")})` : ""}`).join("; ")}.${bare ? "" : directed ? " Each keeps its shape, size and printing from shot to shot." : " Each keeps its shape, size and printing and stays where it is until the action moves it."}` : "");
    const cutsAt = starts.slice(1).map((s) => `${s}s`);
    const covered = directed && !!plan.cut?.cover;
    const montage = covered && !!plan.cut?.montage;
    const shape = directed ? (seg.scenes.length === 1 ? "1 shot" : `${seg.scenes.length} shots with hard cuts${args.timing !== "seconds" ? "" : montage && seg.scenes.length > 4 ? " at the times given" : ` at ${cutsAt.length > 1 ? `${cutsAt.slice(0, -1).join(", ")} and ${cutsAt[cutsAt.length - 1]}` : cutsAt[0]}`}; ${covered ? podcast ? "cuts switch among the fixed cameras, and " : "each cut is to a new camera set-up, a different size and angle, and " : ""}the camera cuts only there`) : args.cuts ? `${seg.scenes.length} shot${seg.scenes.length === 1 ? "" : "s"} with hard cuts` : "one continuous take with no cuts";
    const elsewhere = directed ? (plan.places ?? []).filter((p) => seg.scenes.some((s) => s.place && sameName(s.place, p.name))) : [];
    const otherPlaces = (look: number) => (elsewhere.length ? `Other places: ${elsewhere.map((p) => `${p.name}${p.look && look ? ` (${shorten(p.look, look).replace(/\.$/, "")})` : ""}`).join("; ")}.` : "");
    const build = (style: string, direction: string, cut?: number, lean = 0, frameCut?: number) => {
        const bare = lean >= 5;
        const refs = refLines(frameCut, lean > 0 || frameCut !== undefined, bare);
        return [
            `${extend ? "Extend @Video1 forward. " : ""}${args.aspect} video, ${seconds} seconds, ${shape}. ${recipe.label}. ${style}`.trim(),
            usualSound ? soundtrack : videoAudioDirection(args.audio, spoken),
            anime ? "Hand-drawn 2D anime; stable design, line weight and cel shadows. Timed anticipation, action and reaction holds with secondary motion; no photoreal/3D drift. Match reference palette and texture." : "",
            podcast && directed ? "Fixed eye-level cameras; cuts switch between speakers or a live silent reaction. Only the named speaker's mouth moves." : "",
            refs.length ? `References:\n${refs.join("\n")}` : "",
            [lean < 2 ? `${directed ? "Main place" : "Place"}: ${sentence(lean ? shorten(c.setting, 110) : c.setting)}` : "", lean < 4 ? otherPlaces(lean ? 60 : 110) : "", c.camera && !bare && !montage ? `Camera: ${sentence(lean ? shorten(c.camera, 110) : c.camera)}` : ""].filter(Boolean).join(" "),
            props(lean >= 4 ? 0 : lean === 3 ? 34 : lean ? 60 : 110, bare),
            bare ? who.replace(/; the same (adult|2 people) from the first frame to the last, and the only (person|people) in the frame\.$/, "; nobody else in the frame.") : who,
            directed && !bare && seg.scenes.some((s) => s.face?.trim()) ? "The references fix who the person is, never the expression: each shot's face is its own." : "",
            spoken && args.language ? `Dialogue language: ${sentence(args.language)}` : "",
            index > 0 ? (bare ? "No greeting, no recap." : "This is the middle of the video: no greeting and no recap.") : "",
            ...sceneLines(cut),
            covered && !bare && !cinematic && !anime && !podcast
                ? plan.cut?.pace === "calm"
                    ? "Every shot is moving from its first frame: the action is under way, and nothing waits to begin."
                    : montage
                        ? "Every shot is moving from its first frame and its action is done before the cut. Nothing waits or drifts. Slow motion only in a shot that asks for it."
                        : "Every shot is moving from its first frame, at a quick real-life pace: the action is under way and is done before the cut. Nobody waits, drifts or moves in slow motion."
                : "",
            speech(),
            directed
                ? last
                    ? "The last shot holds still for its final half second."
                    : ""
                : `${endTag >= 0 ? `It ends on @Image${endTag + 1}. ` : seg.end ? `It ends on: ${sentence(lean ? shorten(seg.end, lean >= 3 ? 110 : 150) : seg.end)} ` : ""}${last ? "The last pose is held still for the final half second." : "The last half second is a still, settled pose."}`,
            shown
                ? `Product: ${args.product.toLowerCase().includes(args.brand.toLowerCase()) ? args.product : `${args.brand} ${args.product}`}. ${c.product_details && (covered ? !bare : lean < 3) ? sentence(lean ? shorten(c.product_details, 160) : c.product_details) : ""} Its shape, colours and printing stay exactly as in the references.${c.handling === "display" ? (directed ? " Nobody holds, eats or drinks it." : " It stands on display and is not held or consumed.") : ""}`.replace(/ +/g, " ")
                : "",
            human && c.handling !== "display" && !bare ? `Hands: five fingers each, a natural grip${shown ? ", the printing uncovered" : ""}.` : "",
            spoken && args.audio?.enabled !== false ? `Voice: ${sentence(lean >= 2 ? shorten(c.voice_direction, 100) : c.voice_direction)}${cinematic ? " Keep each named voice stable; Narrator is off screen." : human ? (voiceOver ? " A voice-over: nobody on screen speaks it." : directed ? " Lip-synced whenever the speaker's face is on camera." : " Lip-synced, on camera.") : ownVoice ? " The character says it: its mouth moves with the words." : c.character && voiceOver ? " A voice-over: the character's mouth stays closed." : ""}` : "",
            direction,
            "No subtitles and no on-screen text.",
        ]
            .filter(Boolean)
            .join("\n");
    };
    for (const [style, direction] of [[recipe.presets[args.preset] ?? "", plan.visual_direction], ["", plan.visual_direction], ["", ""]] as const) {
        const prompt = build(style, direction);
        if (prompt.length <= limit)
            return prompt;
    }
    for (const frameCut of [120, 80]) {
        const prompt = build("", "", undefined, 0, frameCut);
        if (prompt.length <= limit)
            return prompt;
    }
    for (const lean of [1, 2, 3, 4]) {
        const prompt = build("", "", undefined, lean, 60);
        if (prompt.length <= limit)
            return prompt;
    }
    for (const lean of [4, 5]) {
        const prompt = build("", "", undefined, lean, 0);
        if (prompt.length <= limit)
            return prompt;
    }
    for (const cut of [200, 160, 130, 100, 80, 60, 45]) {
        const prompt = build("", "", cut, 5, 0);
        if (prompt.length <= limit)
            return prompt;
    }
    return build("", "", 45, 5, 0).slice(0, limit);
}
export const promptTags = (prompt: string): string[] => [...new Set(prompt.match(/@Image\d+/g) ?? [])];
