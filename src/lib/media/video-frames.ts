import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ffmpeg, mediaInfo } from "./ffmpeg";
export const VIDEO_MIME: Record<string, string> = { ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".m4v": "video/mp4", ".mkv": "video/x-matroska" };
export const isVideoFile = (file: string) => path.extname(file).toLowerCase() in VIDEO_MIME;
export const videoMime = (file: string) => VIDEO_MIME[path.extname(file).toLowerCase()] ?? "video/mp4";
export interface Frames {
    files: string[];
    seconds: number[];
    duration: number;
    done: () => void;
}
export async function videoFrames(file: string, max = 16, width = 720): Promise<Frames> {
    const { duration } = await mediaInfo(file);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ce-frames-"));
    const done = () => fs.rmSync(dir, { recursive: true, force: true });
    const secs = Math.max(1, Math.ceil(duration || 1));
    const step = secs <= max ? 1 : secs / max;
    const seconds: number[] = [];
    for (let t = 0; t < secs && seconds.length < max; t += step)
        seconds.push(Math.floor(t));
    const files: string[] = [];
    for (const [i, at] of seconds.entries()) {
        const out = path.join(dir, `frame_${String(i + 1).padStart(2, "0")}.jpg`);
        try {
            await ffmpeg(["-ss", String(at), "-i", file, "-frames:v", "1", "-vf", `scale=${width}:-2`, "-q:v", "4", out]);
            if (fs.existsSync(out))
                files.push(out);
        }
        catch {
        }
    }
    return { files, seconds: seconds.slice(0, files.length), duration, done };
}
