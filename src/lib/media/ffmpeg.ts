import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
export function ffmpegPath(): string {
    if (env.FFMPEG_PATH)
        return env.FFMPEG_PATH;
    for (const name of ["ffmpeg.exe", "ffmpeg"]) {
        const local = path.join(env.DATA_DIR, "bin", name);
        if (fs.existsSync(local))
            return local;
    }
    return "ffmpeg";
}
export function ffmpeg(args: string[], opts: {
    allowFail?: boolean;
    timeoutMs?: number;
} = {}): Promise<string> {
    return new Promise((resolve, reject) => {
        execFile(ffmpegPath(), ["-hide_banner", "-loglevel", opts.allowFail ? "info" : "error", "-y", ...args], { timeout: opts.timeoutMs ?? 180000, maxBuffer: 16 * 1024 * 1024 }, (err, _out, stderr) => {
            if (err && !opts.allowFail)
                reject(new Error(`ffmpeg failed: ${String(stderr).trim().split("\n").slice(-2).join(" ").slice(0, 400) || err.message}`));
            else
                resolve(String(stderr));
        });
    });
}
export const LOCAL_UPLOAD_INPUT = ["-protocol_whitelist", "file,pipe", "-format_whitelist", "mov,matroska,webm,avi,mp3,wav,flac,ogg,aac"];
export async function mediaInfo(file: string, opts: {
    localUpload?: boolean;
} = {}): Promise<{
    duration: number;
    width: number;
    height: number;
    hasAudio: boolean;
}> {
    const out = await ffmpeg([...(opts.localUpload ? LOCAL_UPLOAD_INPUT : []), "-i", file], { allowFail: true });
    const d = out.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    const s = out.match(/Video:.*?(\d{2,5})x(\d{2,5})/);
    return {
        duration: d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : 0,
        width: s ? Number(s[1]) : 0,
        height: s ? Number(s[2]) : 0,
        hasAudio: /Audio:/.test(out),
    };
}
export function videoSize(aspect: string, resolution: string): [
    number,
    number
] {
    const [a, b] = aspect.split(":").map(Number);
    const side = Number(resolution.replace("p", ""));
    return a >= b ? [Math.round((side * a) / b / 2) * 2, side] : [side, Math.round((side * b) / a / 2) * 2];
}
export async function normalizeClip(source: string, out: string, size: [
    number,
    number
], seconds: number, opts: {
    mute?: boolean;
} = {}): Promise<boolean> {
    const [w, h] = size;
    const info = await mediaInfo(source);
    const hasAudio = info.hasAudio && !opts.mute;
    const cropped = info.width > 0 && Math.abs(info.width / info.height - w / h) > 0.05;
    const fit = cropped ? `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}` : `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`;
    await ffmpeg([
        "-i", source,
        ...(hasAudio ? [] : ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]),
        "-map", "0:v:0", "-map", hasAudio ? "0:a:0" : "1:a:0",
        "-vf", `${fit},tpad=stop_mode=clone:stop_duration=${seconds}`,
        "-af", "apad", "-t", String(seconds), "-r", "30",
        "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-ac", "2",
        out,
    ]);
    return cropped;
}
export async function stitchClips(files: string[], out: string, dropRepeat = false): Promise<void> {
    if (files.length === 1) {
        fs.copyFileSync(files[0], out);
        return;
    }
    if (dropRepeat) {
        const frame = (1 / 30).toFixed(5);
        const parts = files.map((_, i) => (i === 0 ? "[0:v]setpts=PTS-STARTPTS[v0];[0:a]asetpts=PTS-STARTPTS[a0]" : `[${i}:v]trim=start_frame=1,setpts=PTS-STARTPTS[v${i}];[${i}:a]atrim=start=${frame},asetpts=PTS-STARTPTS[a${i}]`));
        const graph = `${parts.join(";")};${files.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${files.length}:v=1:a=1[v][a]`;
        await ffmpeg([...files.flatMap((f) => ["-i", f]), "-filter_complex", graph, "-map", "[v]", "-map", "[a]", "-r", "30", "-c:v", "libx264", "-preset", "fast", "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", out]);
        return;
    }
    const list = `${out}.txt`;
    fs.writeFileSync(list, files.map((f) => `file '${path.resolve(f).replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n"));
    await ffmpeg(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", out]);
    fs.rmSync(list, { force: true });
}
export async function referenceClip(source: string, out: string, seconds: number): Promise<void> {
    await ffmpeg(["-ss", "0", "-i", source, "-t", String(seconds), "-vf", "scale=720:-2", "-c:v", "libx264", "-preset", "fast", "-c:a", "aac", "-movflags", "+faststart", out]);
}
export async function grabFrame(source: string, at: number, out: string, width = 720): Promise<void> {
    await ffmpeg(["-ss", String(Math.max(0, at)), "-i", source, "-frames:v", "1", "-vf", `scale=${width}:-2`, out]);
}
export interface Overlay {
    png: string;
    start: number;
    end: number;
    x: number;
    y: number;
    travel?: number;
    stepped?: boolean;
}
export async function overlayVideo(source: string, overlays: Overlay[], out: string, duration: number): Promise<void> {
    if (!overlays.length) {
        fs.copyFileSync(source, out);
        return;
    }
    const inputs = overlays.flatMap((o) => ["-loop", "1", "-framerate", "30", "-i", o.png]);
    const filters: string[] = [];
    let prev = "0:v";
    overlays.forEach((o, i) => {
        const n = i + 1;
        const E = o.stepped ? `floor((t-${o.start})*12)/12` : `(t-${o.start})`;
        const travel = o.travel ?? 0;
        const y = travel ? `${o.y}+${travel}*(1+18*${E})*exp(-18*${E})-${travel}*pow(max(0\,(t-(${o.end}-0.18))/0.18)\,2)` : String(o.y);
        filters.push(`[${n}:v]format=rgba[t${i}]`);
        filters.push(`[${prev}][t${i}]overlay=x=${o.x}:y='${y}':enable='gte(t\,${o.start})*lt(t\,${o.end})':eof_action=repeat[v${i}]`);
        prev = `v${i}`;
    });
    await ffmpeg(["-i", source, ...inputs, "-filter_complex", filters.join(";"), "-map", `[${prev}]`, "-map", "0:a?", "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "copy", "-t", String(duration), "-movflags", "+faststart", out], { timeoutMs: 600000 });
}
