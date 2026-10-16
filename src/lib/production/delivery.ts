import fs from "node:fs";
import path from "node:path";
import type { OutputJobRow, ScriptRow } from "@/db/schema";
import { jobLengths } from "./prompts";
import { scriptMarkdown, scriptText } from "../scripts/export";
import { scriptVersionById } from "../scripts/versions";
import { zip, type ZipEntry } from "../zip";
export type EditorCaption = {
    start: number;
    end: number;
    text: string;
    position: "top" | "bottom";
};
export type EditorSources = {
    sourceId: string;
    brandId: string;
    title: string;
    clips: {
        name: string;
        url: string;
        mimeType: string;
        durationSeconds?: number;
    }[];
    captions: EditorCaption[];
    captionNote: string;
};
export function deliveryFile(root: string, rel: string): string | null {
    if (!rel || path.isAbsolute(rel) || /(^|[\\/])\.\.([\\/]|$)/.test(rel))
        return null;
    const file = path.resolve(root, rel.replace(/^assets[\\/]/, ""));
    const inside = (f: string, base: string) => f.startsWith(base + path.sep);
    if (!inside(file, path.resolve(root)) || !fs.existsSync(file) || !fs.statSync(file).isFile())
        return null;
    return inside(fs.realpathSync(file), fs.realpathSync(root)) ? file : null;
}
const assetUrl = (file: string) => `/api/assets/${file.replace(/^assets[\\/]/, "").split(/[\\/]/).map(encodeURIComponent).join("/")}`;
const slug = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 70) || "creative";
const mediaName = (name: string, file: string | undefined) => `${name}${path.extname(file ?? "").toLowerCase() || ".bin"}`;
export function plannedCaptions(job: OutputJobRow): EditorCaption[] {
    const p = job.production;
    if (!p?.video_plan)
        return [];
    const lengths = jobLengths(p);
    const result: EditorCaption[] = [];
    let offset = 0;
    p.video_plan.segments.forEach((segment, i) => {
        let at = 0;
        for (const scene of segment.scenes) {
            const duration = Number.isFinite(scene.seconds) ? Math.max(0, scene.seconds) : 0;
            const end = Math.min(lengths[i] ?? 10, at + duration);
            if (scene.overlay.trim() && end > at)
                result.push({ start: offset + at, end: offset + end, text: scene.overlay.trim(), position: "bottom" });
            at += duration;
        }
        offset += lengths[i] ?? 10;
    });
    return result;
}
export function editorSources(job: OutputJobRow, root: string, title: string): EditorSources {
    const p = job.production;
    const lengths = p ? jobLengths(p) : [];
    const completed = [...(p?.clips ?? [])].filter((c) => c.status === "completed" && c.file && deliveryFile(root, c.file)).sort((a, b) => a.index - b.index);
    const files: {
        file: string;
        name: string;
        durationSeconds?: number;
    }[] = completed.map((c) => ({ file: c.file!, name: mediaName(`clip-${String(c.index + 1).padStart(2, "0")}`, c.file), durationSeconds: lengths[c.index] }));
    if (!files.length && p?.joined && deliveryFile(root, p.joined))
        files.push({ file: p.joined, name: mediaName("joined-clean", p.joined), durationSeconds: lengths.reduce((a, b) => a + b, 0) || undefined });
    if (!files.length && !p)
        job.assets.filter((a) => a.kind === "video" && /\.(mp4|webm)$/i.test(a.path) && deliveryFile(root, a.path)).forEach((a, i) => files.push({ file: a.path, name: `video-${i + 1}${path.extname(a.path)}`, durationSeconds: undefined }));
    const isWhole = !completed.length || completed.length === p?.segments;
    const captions = isWhole ? plannedCaptions(job) : [];
    const importable = captions.length <= 40 && captions.every((c) => c.text.length <= 160);
    return { sourceId: job.id, brandId: job.brand_id, title, clips: files.map(({ file, ...rest }) => ({ ...rest, url: assetUrl(file), mimeType: /\.webm$/i.test(file) ? "video/webm" : "video/mp4" })), captions: importable ? captions : [], captionNote: importable ? "Storyboard overlays; review timing against the footage. These are not a speech transcript." : "Storyboard overlays exceed editor limits. Download the full planned SRT in the creative package and edit it before import." };
}
const srtTime = (seconds: number) => {
    const ms = Math.round(Math.max(0, seconds) * 1000);
    return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
};
export const captionsSrt = (captions: EditorCaption[]) => captions.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join("\n");
export function deliveryZip(job: OutputJobRow, script: ScriptRow | undefined, root: string): {
    bytes: Buffer;
    name: string;
} {
    const entries: ZipEntry[] = [];
    const missing: string[] = [];
    const included: string[] = [];
    const seen = new Set<string>();
    let mediaBytes = 0;
    const add = (file: string | undefined, name: string) => {
        if (!file || seen.has(file))
            return;
        seen.add(file);
        const abs = deliveryFile(root, file);
        if (!abs) {
            missing.push(name);
            return;
        }
        mediaBytes += fs.statSync(abs).size;
        if (mediaBytes > 512 * 1024 * 1024)
            throw new Error("This package is over 512 MB. Download its videos separately.");
        entries.push({ name, data: fs.readFileSync(abs) });
        included.push(name);
    };
    const p = job.production;
    if (script) {
        const chosen = { ...script, lines: scriptVersionById(script, p?.hook_id), hook_variants: [] };
        entries.push({ name: "script/script.txt", data: Buffer.from(scriptText(chosen)) }, { name: "script/script.md", data: Buffer.from(scriptMarkdown(chosen)) });
    }
    if (p?.brief_markdown)
        entries.push({ name: "brief.md", data: Buffer.from(p.brief_markdown) });
    const plan = p?.video_plan ?? p?.image_plan;
    if (plan)
        entries.push({ name: "storyboard/plan.json", data: Buffer.from(JSON.stringify(plan, null, 2)) });
    if (plan?.ad_copy)
        entries.push({ name: "copy/ad-copy.json", data: Buffer.from(JSON.stringify(plan.ad_copy, null, 2)) });
    const captions = plannedCaptions(job);
    if (captions.length)
        entries.push({ name: "captions/planned-on-screen-text.srt", data: Buffer.from(captionsSrt(captions)) });
    p?.clips.forEach((c) => { if (c.status === "completed")
        add(c.file, mediaName(`video/clip-${String(c.index + 1).padStart(2, "0")}`, c.file)); });
    add(p?.joined, mediaName("video/joined-clean", p?.joined));
    add(p?.captioned, mediaName("video/joined-captioned", p?.captioned));
    add(p?.motion?.file, mediaName("video/final-with-motion", p?.motion?.file));
    [p?.character, p?.look, p?.storyboard].forEach((stage, i) => { add(stage?.file, mediaName(`storyboard/${["character", "look", "storyboard"][i]}`, stage?.file)); stage?.frames?.forEach((f, n) => add(f.file, mediaName(`storyboard/${["character", "look", "storyboard"][i]}-frame-${String(n + 1).padStart(2, "0")}`, f.file))); });
    job.assets.forEach((a, i) => add(a.path, `assets/${String(i + 1).padStart(2, "0")}-${slug(path.basename(a.path))}`));
    entries.push({ name: "manifest.json", data: Buffer.from(JSON.stringify({ sourceId: job.id, jobId: job.id, brandId: job.brand_id, included, missing, captions: "Storyboard on-screen text; timing needs review against rendered speech. No automatic transcription was claimed." }, null, 2)) });
    return { bytes: zip(entries), name: `${slug(script?.title ?? job.meta_ad_name ?? job.id)}-creative.zip` };
}
