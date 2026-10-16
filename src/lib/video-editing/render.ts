import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ffmpeg, mediaInfo, overlayVideo, stitchClips, LOCAL_UPLOAD_INPUT } from "../media/ffmpeg";
import { brandTextTile, PLAIN_LOOK, type MotionLook } from "../production/tiles";
import { EDIT_MODES, captionSrt, editPlanSchema, editSize, fitFilter, MAX_UPLOAD_BYTES, validateTimeline, type EditPlan } from "./plan";
import { editDirectory, type VideoEdit } from "./store";
import { assertBrandTypeface } from "../creative-brand-contract";
export type EditUpload = {
    name: string;
    bytes: Buffer;
};
async function captionTile(text: string, size: [
    number,
    number
], out: string, look: MotionLook) {
    const [w] = size;
    const tile = await brandTextTile(text, look, Math.round(w * 0.8), Math.round(w * 0.045));
    fs.writeFileSync(out, tile.data);
    return { width: tile.width, height: tile.height };
}
export async function renderVideoEdit(brandId: string, input: unknown, uploads: EditUpload[], music?: EditUpload, look = PLAIN_LOOK, voice?: EditUpload): Promise<VideoEdit> {
    const plan = editPlanSchema.parse(input);
    if (!uploads.length || uploads.length > 12)
        throw new Error("Choose between 1 and 12 source clips.");
    if ([...uploads, ...(music ? [music] : []), ...(voice ? [voice] : [])].reduce((n, f) => n + f.bytes.length, 0) > MAX_UPLOAD_BYTES)
        throw new Error("Keep the combined uploads under 256 MB.");
    if (plan.captions.length && plan.captionsEnabled !== false)
        assertBrandTypeface(look);
    const id = crypto.randomBytes(16).toString("hex");
    const dir = editDirectory(brandId, id);
    fs.mkdirSync(dir, { recursive: true });
    try {
        const paths = uploads.map((f, i) => {
            const file = path.join(dir, `source-${i}.media`);
            fs.writeFileSync(file, f.bytes);
            return file;
        });
        const info = await Promise.all(paths.map((file) => mediaInfo(file, { localUpload: true })));
        const seconds = validateTimeline(plan, info);
        const size = editSize(plan.aspect);
        const notes = [...look.notes];
        if (plan.fit === "cover" && plan.clips.some((c) => Math.abs(info[c.file].width / info[c.file].height - size[0] / size[1]) > 0.02))
            notes.push("Focal crop applied: check the packaging, hands and face throughout the exported video.");
        if (!plan.sourceAudio)
            notes.push("Source audio removed, including any voice, music or effects already baked into the footage.");
        const cuts: string[] = [];
        for (const [i, clip] of plan.clips.entries()) {
            const out = path.join(dir, `cut-${i}.mp4`);
            const audio = plan.sourceAudio && info[clip.file].hasAudio;
            await ffmpeg(["-ss", String(clip.start), ...LOCAL_UPLOAD_INPUT, "-i", paths[clip.file], ...(audio ? [] : ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]),
                "-map", "0:v:0", "-map", audio ? "0:a:0" : "1:a:0", "-t", String(clip.end - clip.start),
                "-vf", fitFilter(size, plan.fit, clip.focalX, clip.focalY), "-af", `volume=${clip.gainDb ?? 0}dB,afade=t=in:d=${clip.fadeIn ?? 0},afade=t=out:st=${Math.max(0, clip.end - clip.start - (clip.fadeOut ?? 0))}:d=${clip.fadeOut ?? 0},apad`, "-r", "30", "-c:v", "libx264", "-preset", "fast", "-crf", "18",
                "-pix_fmt", "yuv420p", "-color_range", "tv", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", out]);
            cuts.push(out);
        }
        const joined = path.join(dir, "joined.mp4");
        await stitchClips(cuts, joined);
        let vocal = joined;
        if (voice) {
            const track = path.join(dir, "voice.media");
            fs.writeFileSync(track, voice.bytes);
            if (!(await mediaInfo(track, { localUpload: true })).hasAudio)
                throw new Error("The voice file has no readable audio.");
            vocal = path.join(dir, "voiced.mp4");
            await ffmpeg(["-i", joined, ...LOCAL_UPLOAD_INPUT, "-i", track, "-filter_complex", `[1:a]volume=${plan.voiceDb ?? 0}dB,apad[v];[0:a][v]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95:level=0[a]`, "-map", "0:v:0", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-t", String(seconds), "-movflags", "+faststart", vocal]);
            notes.push("Separate voice track starts at the beginning of the edited timeline. Source sound remains controlled independently.");
        }
        const clean = path.join(dir, "clean.mp4");
        if (music) {
            const track = path.join(dir, "music.media");
            fs.writeFileSync(track, music.bytes);
            if (!(await mediaInfo(track, { localUpload: true })).hasAudio)
                throw new Error("The music file has no readable audio. Use MP3, WAV, M4A, FLAC or Ogg.");
            const fade = Math.min(plan.musicFade ?? 0.4, seconds / 2);
            const duck = plan.duckMusic && (voice || plan.sourceAudio);
            const sidechain = voice ? `[2:a]volume=${plan.voiceDb ?? 0}dB,apad[side];[m][side]sidechaincompress=threshold=0.025:ratio=6:attack=20:release=300[duck];[0:a][duck]` : "[0:a]asplit=2[main][side];[m][side]sidechaincompress=threshold=0.025:ratio=6:attack=20:release=300[duck];[main][duck]";
            await ffmpeg(["-i", vocal, "-stream_loop", "-1", ...LOCAL_UPLOAD_INPUT, "-i", track, ...(duck && voice ? [...LOCAL_UPLOAD_INPUT, "-i", path.join(dir, "voice.media")] : []), "-filter_complex",
                `[1:a]volume=${plan.musicDb}dB,afade=t=in:d=${fade},afade=t=out:st=${Math.max(0, seconds - fade)}:d=${fade}[m];${duck ? sidechain : "[0:a][m]"}amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95:level=0[a]`,
                "-map", "0:v:0", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-t", String(seconds), "-movflags", "+faststart", clean]);
            notes.push(`Uploaded music mixed at ${plan.musicDb} dB. Listen for voice clarity on a phone.`);
            if (duck)
                notes.push(voice ? "Music ducks beneath the separate voice track, independently of source effects." : "Music ducks beneath all source audio; a mixed source cannot isolate speech from its other sounds.");
        }
        else {
            await ffmpeg(["-i", vocal, "-map", "0:v:0", ...(plan.sourceAudio || voice ? ["-map", "0:a:0", "-c:a", "copy"] : ["-an"]), "-c:v", "copy", "-movflags", "+faststart", clean]);
        }
        const files: VideoEdit["files"] = ["clean.mp4"];
        if (plan.captions.length) {
            fs.writeFileSync(path.join(dir, "captions.srt"), captionSrt(plan.captions));
        }
        if (plan.captions.length && plan.captionsEnabled !== false) {
            const overlays = [];
            for (const [i, c] of plan.captions.entries()) {
                const png = path.join(dir, `caption-${i}.png`);
                const tile = await captionTile(c.text, size, png, look);
                overlays.push({ png, start: c.start, end: c.end, x: Math.round((size[0] - tile.width) / 2), y: c.position === "top" ? Math.round(size[1] * 0.1) : Math.round(size[1] * 0.78 - tile.height) });
            }
            await overlayVideo(clean, overlays, path.join(dir, "captioned.mp4"), seconds);
            files.push("captioned.mp4");
        }
        const measured = await mediaInfo(clean);
        if (measured.width !== size[0] || measured.height !== size[1] || Math.abs(measured.duration - seconds) > 0.15)
            throw new Error("The export did not match the planned size or duration.");
        const edit: VideoEdit = { id, brandId, title: plan.title, at: new Date().toISOString(), seconds: measured.duration, size, plan, sources: uploads.map((f) => path.basename(f.name)), music: music?.name ?? null, voice: voice?.name ?? null, files, notes, skill: EDIT_MODES[plan.mode].skill };
        fs.writeFileSync(path.join(dir, "edit.json"), JSON.stringify(edit, null, 2) + "\n");
        return edit;
    }
    catch (e) {
        fs.rmSync(dir, { recursive: true, force: true });
        throw e;
    }
}
