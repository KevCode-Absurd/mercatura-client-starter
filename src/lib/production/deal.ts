import { BUILDS, rng, showsNoLow, shuffled } from "../studio/deal";
export const wordsIn = (s: string) => s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
const LABEL = /^\s*((?:host|guest|character a|character b|narrator)\s*:)\s*/i;
const unlabelled = (s: string) => s.replace(LABEL, "");
const saidWords = (s: string) => wordsIn(unlabelled(s));
const NOT_AN_END = /(?:\b(?:Mr|Mrs|Ms|Dr|St|vs|e\.g|i\.e)|\b[A-HJ-Z])\.$/;
export function sentences(text: string): string[] {
    const t = text.replace(/\s+/g, " ").trim();
    if (!t)
        return [];
    const out: string[] = [];
    const stop = /[.!?…]+["'”’)\]]*\s+/g;
    let from = 0;
    for (let m = stop.exec(t); m; m = stop.exec(t)) {
        const one = t.slice(from, m.index + m[0].length).trim();
        if (NOT_AN_END.test(one))
            continue;
        out.push(one);
        from = m.index + m[0].length;
    }
    if (from < t.length)
        out.push(t.slice(from).trim());
    return out;
}
export function clauses(sentence: string, aim: number, limit: number): string[] {
    const out: string[] = [];
    let rest = sentence.split(" ");
    while (wordsIn(rest.join(" ")) > limit) {
        let cut = -1;
        let atAim = -1;
        let n = 0;
        for (let k = 0; k < rest.length - 1 && n <= limit; k++) {
            if (/[A-Za-z0-9]/.test(rest[k]))
                n++;
            if (n > limit)
                break;
            if (n === aim)
                atAim = k;
            const pause = /[,;:]["'”’)\]]*$/.test(rest[k]) || /[-–—]$/.test(rest[k]) || /^(and|but)$/i.test(rest[k + 1]);
            if (pause && n >= 3 && (cut < 0 || Math.abs(n - aim) <= Math.abs(wordsIn(rest.slice(0, cut + 1).join(" ")) - aim)))
                cut = k;
        }
        if (cut < 0)
            cut = atAim >= 0 ? atAim : Math.min(rest.length - 2, aim - 1);
        out.push(rest.slice(0, cut + 1).join(" "));
        rest = rest.slice(cut + 1);
    }
    if (rest.length)
        out.push(rest.join(" "));
    return out;
}
export interface SpokenLine {
    text: string;
    beat?: string;
}
export interface DealtLine {
    text: string;
    line: number;
}
export interface Deal {
    clips: DealtLine[][];
    dropped: number[];
    needs: number;
    pace: "easy" | "fast";
    cut: number;
}
function pieces(text: string, aim: number, limit: number): string[] {
    const label = LABEL.exec(text)?.[1] ?? "";
    return sentences(unlabelled(text))
        .flatMap((s) => (wordsIn(s) > limit ? clauses(s, aim, limit) : [s]))
        .map((s) => (label ? `${label} ${s}` : s));
}
function pack(units: DealtLine[], cap: number): DealtLine[][] {
    const clips: DealtLine[][] = [];
    let now: DealtLine[] = [];
    let have = 0;
    for (const u of units) {
        const w = saidWords(u.text);
        if (now.length && have + w > cap) {
            clips.push(now);
            now = [];
            have = 0;
        }
        now.push(u);
        have += w;
    }
    if (now.length)
        clips.push(now);
    return clips;
}
export const clipWords = (c: DealtLine[]) => c.reduce((n, u) => n + saidWords(u.text), 0);
function fitInto(units: DealtLine[], clips: number, aim: number, limit: number): DealtLine[][] | null {
    for (let cap = aim; cap <= limit; cap++) {
        const laid = pack(units, cap);
        if (laid.length <= clips)
            return laid;
    }
    return null;
}
const endsSentence = (text: string) => /[.!?\u2026]["'\u201d\u2019)\]]*$/.test(text.trim());
function packScenes(units: DealtLine[], cap: number, least: number, hard: number): DealtLine[][] {
    const runsOn = (a: DealtLine, b: DealtLine) => !endsSentence(a.text) && (a.line === b.line || /^[^A-Za-z0-9]*[a-z]/.test(b.text));
    const said: DealtLine[][] = [];
    for (const u of units) {
        const last = said[said.length - 1];
        if (last && runsOn(last[last.length - 1], u) && clipWords(last) + clipWords([u]) <= hard)
            last.push(u);
        else
            said.push([u]);
    }
    const scenes: DealtLine[][][] = [];
    for (const x of said) {
        const last = scenes[scenes.length - 1];
        if (last && last[0][0].line === x[0].line)
            last.push(x);
        else
            scenes.push([x]);
    }
    const clips: DealtLine[][] = [];
    let now: DealtLine[] = [];
    const close = () => {
        if (now.length)
            clips.push(now);
        now = [];
    };
    for (const scene of scenes) {
        const words = clipWords(scene.flat());
        if (now.length && clipWords(now) + words > cap && clipWords(now) >= least)
            close();
        if (clipWords(now) + words <= cap) {
            now.push(...scene.flat());
            continue;
        }
        for (const x of scene) {
            const have = clipWords(now);
            if (now.length && have + clipWords(x) > cap && (have >= least || have + clipWords(x) > hard))
                close();
            now.push(...x);
        }
    }
    close();
    return clips;
}
const TINY = 4;
function joinTiny(clips: DealtLine[][], limit: number, tiny = TINY): DealtLine[][] {
    const out = clips.map((c) => [...c]);
    for (let i = 0; i < out.length && out.length > 1; i++) {
        const w = clipWords(out[i]);
        if (!w || w >= tiny)
            continue;
        if (i > 0 && clipWords(out[i - 1]) + w <= limit)
            out[i - 1].push(...out[i]);
        else if (i < out.length - 1 && w + clipWords(out[i + 1]) <= limit)
            out[i + 1].unshift(...out[i]);
        else
            continue;
        out.splice(i--, 1);
    }
    return out;
}
function spread(clips: DealtLine[][], count: number): DealtLine[][] {
    const out = clips.map((c) => [...c]);
    while (out.length < count) {
        let at = -1;
        out.forEach((c, i) => {
            if (c.length > 1 && (at < 0 || clipWords(c) > clipWords(out[at])))
                at = i;
        });
        if (at < 0)
            break;
        const c = out[at];
        const half = clipWords(c) / 2;
        let k = 1;
        for (let n = saidWords(c[0].text); k < c.length - 1 && n + saidWords(c[k].text) / 2 < half; k++)
            n += saidWords(c[k].text);
        out.splice(at, 1, c.slice(0, k), c.slice(k));
    }
    while (out.length < count)
        out.push([]);
    return out;
}
export function dropOrder(lines: SpokenLine[]): number[] {
    const spoken = lines.map((l, i) => (wordsIn(unlabelled(l.text)) ? i : -1)).filter((i) => i >= 0);
    const hasCta = spoken.some((i) => lines[i].beat === "cta");
    const proof = spoken.find((i, n) => n > 0 && (lines[i].beat === "mechanism" || lines[i].beat === "proof"));
    const rank = (i: number) => (i === spoken[0] ? 0 : lines[i].beat === "cta" || (!hasCta && i === spoken[spoken.length - 1]) ? 1 : lines[i].beat === "offer" ? 2 : lines[i].beat === "promise" ? 3 : i === proof ? 4 : 5);
    return [...spoken].sort((a, b) => rank(b) - rank(a) || b - a);
}
export function dealLines(lines: SpokenLine[], o: {
    aim: number;
    limit: number;
    clips?: number;
    scene?: {
        words: number;
        least: number;
    };
}): Deal {
    const aim = Math.max(1, Math.round(Math.min(o.aim, o.limit)));
    const limit = Math.max(aim, Math.round(o.limit));
    const units = (without: number[] = []) => lines.flatMap((l, i) => (without.includes(i) ? [] : pieces(l.text, aim, limit).map((text): DealtLine => ({ text, line: i }))));
    const all = units();
    const each = o.scene ? Math.max(1, Math.min(aim, Math.round(o.scene.words))) : aim;
    const scenes = o.scene && all.length ? joinTiny(packScenes(all, each, o.scene.least, aim), aim, o.scene.least) : null;
    if (scenes && (o.clips ?? scenes.length) >= scenes.length)
        return { clips: spread(scenes, o.clips ?? scenes.length), dropped: [], needs: scenes.length, pace: "easy", cut: 0 };
    const needs = scenes ? scenes.length : Math.max(1, Math.ceil(clipWords(all) / aim), pack(all, limit).length);
    const clips = o.clips ?? needs;
    const order = dropOrder(lines);
    const dropped: number[] = [];
    let kept = all;
    let fit = fitInto(kept, clips, each, limit);
    while (!fit && order.length > 1) {
        dropped.push(order.shift()!);
        kept = units(dropped);
        fit = fitInto(kept, clips, each, limit);
    }
    const laid = fit ?? pack(kept, limit);
    const dealt = joinTiny(laid.slice(0, clips), limit);
    const words = dealt.reduce((n, c) => n + clipWords(c), 0);
    return { clips: spread(dealt, clips), dropped: dropped.sort((a, b) => a - b), needs, pace: words > clips * aim ? "fast" : "easy", cut: laid.slice(clips).reduce((n, c) => n + clipWords(c), 0) };
}
export function joinSpoken(parts: string[]): string {
    let last = "";
    return parts
        .map((p) => {
        const label = (LABEL.exec(p)?.[1] ?? "").toLowerCase().replace(/\s+/g, "");
        const out = label && label === last ? unlabelled(p) : p;
        last = label;
        return out;
    })
        .join(" ")
        .trim();
}
export function placeLines(scenes: {
    seconds: number;
    dialogue: string;
}[], lines: string[]): string[] {
    const said: string[][] = scenes.map(() => []);
    if (!scenes.length || !lines.length)
        return said.map(() => "");
    const wrote = scenes.map((s) => saidWords(s.dialogue));
    const weight = wrote.some((w) => w > 0) ? wrote : scenes.map((s) => Math.max(0, s.seconds) || 1);
    const all = weight.reduce((n, w) => n + w, 0);
    const total = lines.reduce((n, x) => n + saidWords(x), 0) || 1;
    let before = 0;
    let at = 0;
    let upTo = weight[0];
    for (const line of lines) {
        const middle = ((before + saidWords(line) / 2) / total) * all;
        while (at < scenes.length - 1 && upTo <= middle)
            upTo += weight[++at];
        let to = at;
        while (weight[to] === 0 && to > 0)
            to--;
        said[to].push(line);
        before += saidWords(line);
    }
    return said.map(joinSpoken);
}
export function placeRows(scenes: {
    seconds: number;
    rows?: number[];
}[], lines: DealtLine[]): string[] {
    const said: string[][] = scenes.map(() => []);
    if (!scenes.length || !lines.length)
        return said.map(() => "");
    let at = 0;
    for (const u of lines) {
        const i = scenes.findIndex((s, k) => k >= at && (s.rows ?? []).includes(u.line + 1));
        if (i < 0)
            return placeLines(scenes.map((s) => ({ seconds: s.seconds, dialogue: "" })), lines.map((x) => x.text));
        said[i].push(u.text);
        at = i;
    }
    return said.map(joinSpoken);
}
const secondsSaid = (n: number) => `${n} second${n === 1 ? "" : "s"}`;
export function dealNote(deal: Deal, lines: SpokenLine[], lengths?: number[]): string {
    const chosen = deal.clips.length;
    const clips = (n: number) => `${n} clip${n === 1 ? "" : "s"}`;
    const out: string[] = [];
    if (lengths?.length && lengths.some((x) => x !== lengths[0])) {
        const total = lengths.reduce((n, x) => n + x, 0);
        const each = lengths.length <= 8 ? `${lengths.slice(0, -1).join(", ")} and ${secondsSaid(lengths[lengths.length - 1])}` : `from ${Math.min(...lengths)} to ${secondsSaid(Math.max(...lengths))}`;
        out.push(`Each clip is as long as its words need: ${clips(lengths.length)}, ${each}, ${secondsSaid(total)} in all.`);
    }
    if (deal.dropped.length) {
        const spoken = lines.filter((l) => wordsIn(unlabelled(l.text))).length;
        const opening = (i: number) => {
            const w = unlabelled(lines[i].text).replace(/\s+/g, " ").trim().split(" ");
            return `"${w.slice(0, 6).join(" ")}${w.length > 6 ? "..." : ""}"`;
        };
        out.push(`${deal.dropped.length} of the script's ${spoken} spoken lines ${deal.dropped.length === 1 ? "was" : "were"} left out, because ${clips(chosen)} ${chosen === 1 ? "is" : "are"} fewer than the ${deal.needs} this script needs: ${deal.dropped.map(opening).join(", ")}. No line was reworded.`);
    }
    if (deal.cut)
        out.push(`The last ${deal.cut} words of the script do not fit ${clips(chosen)} and were left off.`);
    if (deal.pace === "fast")
        out.push(`The lines are said faster than usual to fit ${clips(chosen)}; at an easy pace this script needs ${deal.needs}.`);
    const silent = deal.clips.map((c, i) => (c.length ? 0 : i + 1)).filter(Boolean);
    if (silent.length && deal.clips.some((c) => c.length))
        out.push(`The script fills ${clips(chosen - silent.length)} of the ${chosen} chosen: ${silent.length === 1 ? `clip ${silent[0]} has` : `clips ${silent[0]} to ${silent[silent.length - 1]} have`} no spoken line.`);
    return out.join(" ");
}
export const PLAN_BATCH = 6;
export interface Batch {
    first: number;
    count: number;
}
export function planBatches(clips: number, size = PLAN_BATCH): Batch[] {
    const out: Batch[] = [];
    for (let first = 0; first < clips; first += size)
        out.push({ first, count: Math.min(size, clips - first) });
    return out;
}
export interface ClipLength {
    seconds: number;
    shots?: string;
}
export function clipsBrief(batch: Batch, total: number, deal: Deal | null, lengths?: ClipLength[], faces?: string[][]): string {
    const dealt = (n: number) => (faces?.[n]?.length ? ` Faces dealt, shot by shot: ${faces[n].map((f, k) => `${k + 1}. ${f}`).join("; ")}.` : "");
    const last = batch.first + batch.count;
    const which = batch.count === total ? (total === 1 ? "the 1 clip of this video" : `all ${total} clips of this video`) : batch.count === 1 ? `clip ${last} of ${total}` : `clips ${batch.first + 1} to ${last} of ${total}`;
    const head = `The clips to write: ${which}. Return exactly ${batch.count} segment${batch.count === 1 ? "" : "s"}, in this order.`;
    const long = (i: number) => (lengths?.[i] ? `${secondsSaid(lengths[i].seconds)}${lengths[i].shots ? `, ${lengths[i].shots}` : ""}` : "");
    if (!deal) {
        const mine = Array.from({ length: batch.count }, (_, i) => long(batch.first + i));
        const said = !mine[0] ? "" : mine.every((x) => x === mine[0]) ? ` ${batch.count === 1 ? "The clip" : "Every clip"} is ${mine[0]}.` : ` ${mine.map((x, i) => `Clip ${batch.first + i + 1} is ${x}.`).join(" ")}`;
        return `${head} Where each spoken line falls follows the reference's timing, as the reference mode above says.${said}`;
    }
    const homes = new Map<number, Set<number>>();
    deal.clips.forEach((c, n) => c.forEach((u) => homes.set(u.line, (homes.get(u.line) ?? new Set<number>()).add(n))));
    const whole = (line: number) => !deal.cut && homes.get(line)?.size === 1;
    let quoted = false;
    const each = deal.clips.slice(batch.first, last).map((c, i) => {
        const n = batch.first + i;
        const is = long(n) ? ` is ${long(n)}, and` : "";
        if (!c.length)
            return `Clip ${n + 1}${is} says nothing: its shots list no row.${dealt(n)}`;
        const rows: {
            line: number;
            texts: string[];
        }[] = [];
        for (const u of c) {
            const at = rows[rows.length - 1];
            if (at && at.line === u.line)
                at.texts.push(u.text);
            else
                rows.push({ line: u.line, texts: [u.text] });
        }
        const said = rows.map((r) => {
            if (whole(r.line))
                return `row ${r.line + 1}`;
            quoted = true;
            return `part of row ${r.line + 1} ("${r.texts.join(" ")}")`;
        });
        return `Clip ${n + 1}${is} says ${said.join(", then ")}.${dealt(n)}`;
    });
    const fixed = lengths?.length ? "The length and the spoken lines of each clip are fixed" : "The spoken lines of each clip are fixed";
    const rule = `each clip says the rows named beside it (the first column of the approved script), whole and in order${quoted ? "; where a clip says only part of a row, that part is given in brackets, word for word" : ""}`;
    const left = batch.first === 0 && deal.dropped.length ? `\n\nNot said in this video, in any clip: row${deal.dropped.length === 1 ? "" : "s"} ${deal.dropped.map((x) => x + 1).join(", ")}.` : "";
    return `${head} ${fixed}: ${rule}.\n\n${each.join("\n\n")}${left}`;
}
export function partBrief(a: {
    part: number;
    parts: number;
    shared?: unknown;
    before?: unknown;
    beforeClip?: number;
}): string {
    if (a.parts <= 1)
        return "";
    const head = `This video is too long to plan in 1 answer, so it is planned in parts. This is part ${a.part} of ${a.parts}.`;
    if (a.part === 1)
        return `${head} Write everything the whole video shares (title, visual_direction, cast, cast_options where the schema has them, places, props, product_parts, ad_copy) from the whole script, and the segments of the clips listed below only. \`props\` lists every object any clip of the whole video uses, the later clips too: a later part can use only what is listed.`;
    return [
        `${head} What the whole video shares is written and fixed. Do not change it and do not return it:`,
        JSON.stringify(a.shared),
        `The clip before yours (clip ${a.beforeClip}), so the picture carries on:`,
        JSON.stringify(a.before),
        `Your first clip starts on the frame that clip ended on: its \`start\` describes that same frame. Use only the props listed above, each by its exact name. The script rows below are the rows of your clips only.`,
        `Return 1 JSON object with only \`segments\` (your clips) and \`notes\`.`,
    ].join("\n");
}
export async function writeInBatches<H, S>(a: {
    clips: number;
    size?: number;
    repairs?: number;
    done?: {
        head: H;
        segments: S[];
    } | null;
    write: (batch: Batch, so: {
        head: H | null;
        before: S | null;
        repair: {
            problems: string[];
            previous: S[];
        } | null;
    }) => Promise<{
        head?: H;
        segments: S[];
    }>;
    problems: (batch: Batch, segments: S[], head: H) => string[];
    saved?: (head: H, segments: S[]) => void;
}): Promise<{
    head: H;
    segments: S[];
}> {
    let head: H | null = a.done?.head ?? null;
    const segments: S[] = head ? [...(a.done?.segments ?? [])] : [];
    for (const batch of planBatches(a.clips, a.size)) {
        if (head && segments.length >= batch.first + batch.count)
            continue;
        segments.length = Math.min(segments.length, batch.first);
        const so = { head, before: segments[batch.first - 1] ?? null };
        let out = await a.write(batch, { ...so, repair: null });
        const check = () => a.problems(batch, out.segments, (out.head ?? head) as H);
        for (let attempt = 0; attempt < (a.repairs ?? 2); attempt++) {
            const problems = check();
            if (!problems.length)
                break;
            out = await a.write(batch, { ...so, repair: { problems, previous: out.segments } });
        }
        const left = check();
        if (left.length)
            throw new Error(`The shot plan doesn't fit the clip structure: ${left.join(" ")}`);
        head = (out.head ?? head) as H;
        segments.push(...out.segments);
        a.saved?.(head, segments);
    }
    if (!head)
        throw new Error("The shot plan came back empty.");
    return { head, segments };
}
export type FaceMoment = "before" | "doing" | "after" | "close";
export interface Face {
    text: string;
    kind: string;
    when: readonly FaceMoment[];
    smile?: boolean;
    low?: boolean;
}
export const FACES: readonly Face[] = [
    { text: "eyebrows drawn together, lips pressed to one side, eyes on what is in the hand", kind: "doubt", when: ["before", "doing"] },
    { text: "one eyebrow raised, head tilted, looking straight into the lens", kind: "doubt", when: ["before", "close"] },
    { text: "eyes closed, shoulders dropped, a long breath out through the nose", kind: "tired", when: ["before"] },
    { text: "heavy eyelids, mouth closed, looking at nothing in particular", kind: "tired", when: ["before"], low: true },
    { text: "a yawn half covered by the back of a hand, eyes watering", kind: "tired", when: ["before"] },
    { text: "jaw set, mouth flat, eyes on a clock or a screen", kind: "annoyed", when: ["before"] },
    { text: "eyes rolled up to the ceiling, a short breath out, mouth a little open", kind: "annoyed", when: ["before"] },
    { text: "nose wrinkled, chin pulled back from what they hold", kind: "dislike", when: ["before"] },
    { text: "a wince: one eye half shut, teeth just showing, shoulders up", kind: "hurt", when: ["before"], low: true },
    { text: "lips pressed thin, eyes down, a slow shake of the head", kind: "let down", when: ["before"], low: true },
    { text: "one hand rubbing a temple, eyes shut, mouth turned down", kind: "hurt", when: ["before"], low: true },
    { text: "cheeks puffed, air blown out slowly, eyes wide", kind: "swamped", when: ["before"] },
    { text: "eyebrows up, mouth a little open, eyes on the phone", kind: "surprise", when: ["before", "doing"] },
    { text: "squinting at small print, head pushed forward", kind: "reading", when: ["before", "doing"] },
    { text: "eyes down on the hands, brow smooth, tongue just touching the upper lip", kind: "focus", when: ["doing"] },
    { text: "mid-word, mouth open, eyebrows lifting on the stressed word, one hand raised", kind: "telling", when: ["doing", "close", "before"] },
    { text: "eyes narrowed in thought, looking up and to one side, lips parted", kind: "thinking", when: ["doing"] },
    { text: "a quick look off to one side and back to the lens, mouth closed", kind: "aside", when: ["doing", "before"] },
    { text: "chin on a fist, eyes on the lens, one eyebrow a little up", kind: "weighing", when: ["doing", "before"] },
    { text: "eyebrows up, a slow nod, eyes on what the hands have just done", kind: "noticing", when: ["doing", "after"] },
    { text: "shoulders down, face slack and easy, eyes resting on the middle distance", kind: "ease", when: ["after"] },
    { text: "eyes closed for a second, a breath in through the nose, chin lifting", kind: "relief", when: ["after"] },
    { text: "eyebrows up, lips pushed out in a small 'not bad', a slow nod", kind: "impressed", when: ["after", "doing"] },
    { text: "a quick shrug, both eyebrows up, the corners of the mouth turned down, easy", kind: "shrug", when: ["after", "close"] },
    { text: "eyes bright and wide, mouth open on a breath in, about to speak", kind: "keen", when: ["after", "before"] },
    { text: "head tilted, soft eyes on the lens, mouth closed and relaxed", kind: "warm", when: ["after", "close"] },
    { text: "a half smile on one side, eyes down", kind: "smile", when: ["after", "close"], smile: true },
    { text: "mid-laugh, head tipped back a little, eyes creased", kind: "smile", when: ["after"], smile: true },
    { text: "a closed-mouth smile that reaches the eyes, a small nod at the lens", kind: "smile", when: ["close", "after"], smile: true },
    { text: "level eyes on the lens, chin a little down, mouth relaxed after the last word", kind: "plain", when: ["close"] },
    { text: "a dry, flat look into the lens, one corner of the mouth tucked in", kind: "dry", when: ["close", "before"] },
    { text: "eyebrows lifted, chin pointing at what the hand holds, eyes on the lens", kind: "pointing", when: ["close", "doing"] },
    { text: "already looking away, turning to go, mouth closed, face easy", kind: "moving on", when: ["close", "after"] },
];
const BEAT_MOMENT: Record<string, FaceMoment> = { hook: "before", problem: "before", objection: "before", mechanism: "doing", bridge: "doing", proof: "doing", promise: "after", identity: "after", retention: "after", offer: "close", cta: "close", risk_reversal: "close" };
export const faceMoment = (beat: string | undefined): FaceMoment => BEAT_MOMENT[(beat ?? "").toLowerCase()] ?? "doing";
export const neverShowsLowPeople = (neverShow: string | (string | null | undefined)[] | null | undefined): boolean => showsNoLow([neverShow].flat().filter(Boolean).join(". "));
export interface FaceClip {
    shots: number;
    beats?: string[];
}
export function dealFaces(seed: string, clips: FaceClip[], o: {
    noLow?: boolean;
} = {}): string[][] {
    const deck = shuffled(FACES.filter((f) => !(o.noLow && f.low)), rng(`${seed}:face`));
    const uses = new Map<Face, number>();
    const dealt = (f: Face) => uses.get(f) ?? 0;
    let smiled = false;
    let prev = null as Face | null;
    return clips.map((c) => {
        const beats = c.beats?.length ? c.beats : [""];
        return Array.from({ length: Math.max(0, Math.round(c.shots)) }, (_, k) => {
            const moment = faceMoment(beats[Math.min(beats.length - 1, Math.floor((k * beats.length) / c.shots))]);
            const free = deck.filter((f) => f !== prev && f.kind !== prev?.kind && !(f.smile && smiled));
            const fit = free.filter((f) => f.when.includes(moment));
            const pool = fit.length ? fit : free;
            const least = Math.min(...pool.map(dealt));
            const face = pool.find((f) => dealt(f) === least)!;
            uses.set(face, least + 1);
            if (face.smile)
                smiled = true;
            prev = face;
            return face.text;
        });
    });
}
export const isSmile = (face: string): boolean => /\b(smil\w*|grin\w*|laugh\w*|beam\w*)\b/i.test(face);
export const startsIn = (notes: string | null | undefined): string => (notes ?? "").split(/\r?\n/).find((l) => l.startsWith("Starts in: "))?.slice(11).trim().replace(/\.$/, "") ?? "";
const NOT_FILMED_ALONE = /\b(other people|till|shop|waiting room|changing room|train|bus|mirror)\b/i;
const FILMED_ALONE = ["at the bathroom sink", "on the back step or the balcony", "in the hallway, by the coats and shoes", "at the dining table, alone", "on the bedroom floor, mid-packing", "in the garage or the shed", "on a bench outside", "by the washing machine"];
export const filmPlaces = (everyday: readonly string[]): string[] => [...everyday.filter((p) => !NOT_FILMED_ALONE.test(p)), ...FILMED_ALONE];
const PLACE_STOP = new Set(["the", "and", "with", "for", "from", "into", "out", "way", "front", "back", "other", "people", "place", "room", "home", "house", "alone", "morning", "evening", "night", "day", "mid", "their", "her", "his", "own", "outside", "inside", "sun"]);
const placeWords = (s: string) => [...new Set((s.toLowerCase().match(/[a-zà-ÿ]{3,}/g) ?? []).filter((w) => !PLACE_STOP.has(w)).map((w) => w.replace(/(es|s)$/, "")))];
export function samePlace(place: string, setting: string): boolean {
    const mine = placeWords(place);
    if (!mine.length)
        return false;
    const theirs = new Set(placeWords(setting));
    return theirs.has(mine[0]) || mine.filter((w) => theirs.has(w)).length * 2 >= mine.length;
}
export interface PlaceDeal {
    place: string;
    from: "script" | "brand" | "everyday";
}
export function dealPlace(o: {
    seed: string;
    everyday: readonly string[];
    own?: string[];
    recent?: string[];
    said?: string;
}): PlaceDeal {
    if (o.said?.trim())
        return { place: o.said.trim(), from: "script" };
    const next = rng(`${o.seed}:place`);
    const own = shuffled(o.own ?? [], next).map((place): PlaceDeal => ({ place, from: "brand" }));
    const everyday = shuffled(filmPlaces(o.everyday), next).map((place): PlaceDeal => ({ place, from: "everyday" }));
    const order = own.length && next() < 0.5 ? [...own, ...everyday] : [...everyday, ...own];
    const fresh = (p: string) => !(o.recent ?? []).some((s) => samePlace(p, s));
    return order.find((x) => fresh(x.place)) ?? order[0] ?? { place: "", from: "everyday" };
}
export const placeBrief = (d: PlaceDeal): string => d.place
    ? `Main place of this video: ${d.place.replace(/\.$/, "")}${d.from === "script" ? " (where the script starts)" : ""}. \`cast.setting\` is that place as this buyer would have it: its surfaces, its light, 2 or 3 ordinary things. It gives way only to the user notes or a spoken line that names another place; a visual note that sets the scene elsewhere is moved here. Where the product could not really be used in this place, the shot that uses it cuts to a place where it can be, listed in \`places\`.`
    : "";
const WOMAN = /\b(wom[ae]n|females?|ladies|lady|mothers?|mums?|moms?|wives|wife)\b/i;
const MAN = /\b(m[ae]n|males?|fathers?|dads?|husbands?|guys?)\b/i;
const MOSTLY = /\b(?:mostly|mainly|primarily|predominantly|largely|majority)\s+([a-z]+)/i;
function readGender(said: string): "woman" | "man" | "" {
    const most = MOSTLY.exec(said)?.[1] ?? "";
    if (most && WOMAN.test(most) !== MAN.test(most))
        return WOMAN.test(most) ? "woman" : "man";
    const w = WOMAN.test(said);
    const m = MAN.test(said);
    return w === m ? "" : w ? "woman" : "man";
}
function readAges(said: string): [
    number,
    number
] | null {
    const t = said.toLowerCase();
    const decades = [...t.matchAll(/\b(early|mid|late)?[\s-]*(\d)0s\b/g)].map((m): [
        number,
        number
    ] => {
        const d = Number(m[2]) * 10;
        return m[1] === "early" ? [d, d + 3] : m[1] === "mid" ? [d + 3, d + 7] : m[1] === "late" ? [d + 6, d + 9] : [d, d + 9];
    });
    const range = /(\d{2})\s*(?:to|-|–|—|and|through)\s*(\d{2})(?!\d)/.exec(t);
    const plus = /(\d{2})\s*(?:\+|plus|and (?:over|up|older)|or (?:over|older))/.exec(t) ?? /\b(?:over|above|from)\s+(\d{2})\b/.exec(t);
    const under = /\b(?:under|below|up to)\s+(\d{2})\b/.exec(t);
    const one = /\b(\d{2})\b/.exec(t);
    const band: [
        number,
        number
    ] | null = decades.length
        ? [Math.min(...decades.map((d) => d[0])), Math.max(...decades.map((d) => d[1]))]
        : range
            ? [Number(range[1]), Number(range[2])]
            : plus
                ? [Number(plus[1]), Number(plus[1]) + 15]
                : under
                    ? [18, Number(under[1]) - 1]
                    : one
                        ? [Number(one[1]), Number(one[1])]
                        : null;
    if (!band)
        return null;
    const lo = Math.max(18, Math.min(band[0], band[1]));
    const hi = Math.min(90, Math.max(band[0], band[1]));
    return hi < lo ? null : [lo, hi];
}
export function readWho(who: {
    age?: string | null;
    gender?: string | null;
} | null | undefined): {
    gender: "woman" | "man" | "";
    ages: [
        number,
        number
    ] | null;
} {
    return { gender: readGender(who?.gender ?? ""), ages: readAges(who?.age ?? "") };
}
const HAIR = ["short dark hair", "long hair worn loose", "tight curls", "a close-cropped head", "wavy shoulder-length hair", "straight hair cut at the jaw", "hair in braids", "hair tied up in a loose knot", "a low ponytail", "greying hair cut short", "a fringe and a bob", "thick hair pushed back"] as const;
export interface OnScreen {
    gender: "woman" | "man" | "";
    age: number | null;
    band: [
        number,
        number
    ] | null;
    hair: string;
    build: string;
}
export function dealPresenter(seed: string, who: {
    age?: string | null;
    gender?: string | null;
} | null | undefined): OnScreen | null {
    const { gender, ages } = readWho(who);
    if (!gender && !ages)
        return null;
    const next = rng(`${seed}:cast`);
    const age = ages ? ages[0] + Math.floor(next() * (ages[1] - ages[0] + 1)) : null;
    return { gender, age, band: ages, hair: shuffled(HAIR, next)[0], build: shuffled(BUILDS, next)[0] };
}
export function presenterBrief(p: OnScreen, o: {
    said: string;
    market?: string;
    made?: boolean;
}): string {
    const person = `${p.gender ? `a ${p.gender}` : "an adult"}${p.age ? ` of ${p.age}` : ""}`;
    if (o.made)
        return `Who is on screen: this format is cast with a made character, not a filmed person. Fill \`cast.character\` with 1 sentence that a picture can be drawn from (what it is and what it is made of or drawn as, its build, its colours, its face, what it wears or carries). Where the character is a person it is ${person}, as this ad's buyer is (${o.said}), always an adult. Each of the 3 \`cast_options\` has a \`label\` and a \`character\` sentence.`;
    const others = p.gender === "woman" ? "women" : p.gender === "man" ? "men" : "adults";
    const band = p.band && p.band[0] !== p.band[1] ? ` aged ${p.band[0]} to ${p.band[1]}` : "";
    return [
        `Who is on screen: this format is cast with a person. Fill \`cast.presenter\`: ${person}, because this ad's buyer is ${o.said}. A fictional adult ${o.market ? `a buyer in ${o.market}` : "the buyer"} would take for 1 of their own.`,
        `This is this video's own person, not the person of the brand's other videos: start from ${p.hair}, ${p.build}. The skin, the wardrobe and what marks them out are yours, from the script's own moment.`,
        `Each of the 3 \`cast_options\` has a \`label\` and a \`presenter\`: the first is this person, the other 2 are different ${others}${band}, each with another look.`,
    ].join(" ");
}
