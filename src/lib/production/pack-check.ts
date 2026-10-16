export interface PackToCheck {
    seconds: number;
    limit?: number;
    clips: {
        index: number;
        seconds?: number;
        prompt: string;
        refs: {
            tag: string;
            file: string;
            purpose: string;
        }[];
        overlays?: string[];
    }[];
}
export interface ClipCheck {
    index: number;
    ok: boolean;
    warnings: string[];
}
const TAG = /@(?:Image|Video)\d+/g;
const tagsIn = (s: string): string[] => [...new Set(s.match(TAG) ?? [])];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9à-ÿ]+/g, " ").trim();
const unspoken = (prompt: string) => prompt.replace(/"[^"\n]*"/g, '""').replace(/\{[^}\n]*\}/g, "{}");
function saysWhatFor(prompt: string, tag: string): boolean {
    const re = new RegExp(`(?:^|[\\n.] *)${tag}(?!\\d)\\s*(?:=|is|are|defines|shows?)\\s+([^\\n]+)`, "i");
    const m = re.exec(prompt);
    return !!m && m[1].trim().split(/\s+/).length >= 2;
}
function asksForCaptions(prompt: string): string | null {
    for (const s of unspoken(prompt).split(/(?<=[.!?])\s+|\n+/)) {
        if (!/\b(captions?|subtitles?|on-screen text|text overlays?|lower third|title cards?)\b/i.test(s))
            continue;
        if (/\b(no|not|never|without|none)\b/i.test(s))
            continue;
        return s.trim();
    }
    return null;
}
export function checkClip(clip: PackToCheck["clips"][number], packSeconds: number, limit?: number): ClipCheck {
    const seconds = clip.seconds ?? packSeconds;
    const w: string[] = [];
    const { prompt, refs } = clip;
    const attached = refs.map((r) => r.tag);
    const named = tagsIn(prompt);
    const unnamed = attached.filter((t) => !named.includes(t));
    if (unnamed.length)
        w.push(`Attached but never named in the prompt: ${unnamed.join(", ")}. The video model cannot tell what ${unnamed.length === 1 ? "it is" : "they are"} for.`);
    const noJob = attached.filter((t) => named.includes(t) && !saysWhatFor(prompt, t));
    if (noJob.length)
        w.push(`Named, but the prompt does not say what ${noJob.length === 1 ? "it is" : "they are"} for: ${noJob.join(", ")}.`);
    const ghost = named.filter((t) => !attached.includes(t));
    if (ghost.length)
        w.push(`The prompt names ${ghost.join(", ")}, but nothing is attached under ${ghost.length === 1 ? "that tag" : "those tags"}.`);
    const images = refs.filter((r) => r.tag.startsWith("@Image"));
    if (images.some((r, i) => r.tag !== `@Image${i + 1}`))
        w.push("The pictures are not numbered in the order they are attached (@Image1, @Image2, ...).");
    const noFile = images.filter((r) => !r.file).map((r) => r.tag);
    if (noFile.length)
        w.push(`No picture file for ${noFile.join(", ")}.`);
    if (new Set(attached).size !== attached.length)
        w.push("A tag is used for 2 attachments.");
    const video = attached.includes("@Video1");
    if (clip.index === 0 && (video || named.includes("@Video1")))
        w.push("Clip 1 refers to a previous clip (@Video1), and there is none.");
    if (clip.index > 0 && !video)
        w.push(`Clip ${clip.index + 1} does not attach the clip before it (@Video1), so it may not join on.`);
    const said = /\b(\d+(?:\.\d+)?)[- ]seconds?\b/i.exec(prompt.split("\n")[0] ?? "") ?? /\b(\d+(?:\.\d+)?)[- ]seconds?\b/i.exec(prompt);
    if (!said)
        w.push("The prompt does not say how long the clip is.");
    else if (Number(said[1]) !== seconds)
        w.push(`The prompt says ${said[1]} seconds, the pack says ${seconds}.`);
    const stamps = [...prompt.matchAll(/\[(\d+)-(\d+)s\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
    if (stamps.some(([a, b], i) => b <= a || (i > 0 && a < stamps[i - 1][1])))
        w.push("The timestamps in the prompt are not in order.");
    if (stamps.length && stamps[stamps.length - 1][1] > seconds)
        w.push(`The timestamps run to ${stamps[stamps.length - 1][1]} seconds, past the clip's ${seconds}.`);
    const asks = asksForCaptions(prompt);
    if (asks)
        w.push(`The prompt asks for words on the picture ("${asks.slice(0, 80)}"). Captions are added afterwards, never by the video model.`);
    if (!/no subtitles/i.test(prompt))
        w.push('The line "No subtitles and no on-screen text." is missing from the prompt.');
    const rest = norm(unspoken(prompt));
    const burnt = (clip.overlays ?? []).map((o) => o.trim()).filter((o) => norm(o).length >= 12 && rest.includes(norm(o)));
    if (burnt.length)
        w.push(`A caption is written into the prompt: "${burnt[0].slice(0, 60)}". Take it out: captions are added afterwards.`);
    if (limit && prompt.length > limit)
        w.push(`The prompt is ${prompt.length} characters, over the ${limit} the tool takes.`);
    if (!prompt.trim())
        w.push("The prompt is empty.");
    return { index: clip.index, ok: w.length === 0, warnings: w };
}
export function checkPack(pack: PackToCheck): {
    ok: boolean;
    order: string | null;
    clips: ClipCheck[];
} {
    const clips = pack.clips.map((c) => checkClip(c, pack.seconds, pack.limit));
    const order = !pack.clips.length ? "The pack has no clips." : pack.clips.some((c, i) => c.index !== i) ? `The clips are not in order: ${pack.clips.map((c) => c.index + 1).join(", ")}. Make them in the order 1, 2, 3, ...` : null;
    return { ok: !order && clips.every((c) => c.ok), order, clips };
}
