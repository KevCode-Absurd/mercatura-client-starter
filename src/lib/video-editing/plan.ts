import { z } from "zod";
export const EDIT_MODES = {
    organic: { title: "Organic content", skill: "organic-video-editing", purpose: "Keep one useful idea, the founder's voice and the real product experience. End with a question, a save or the next episode." },
    ad: { title: "Ecommerce ad", skill: "ecommerce-video-editing", purpose: "Keep the approved hook, show the product doing the work, preserve proof and offer terms, and end with one clear action." },
} as const;
export type EditMode = keyof typeof EDIT_MODES;
export const MAX_UPLOAD_BYTES = 256 * 1024 * 1024;
export const MAX_EDIT_SECONDS = 600;
export const editPlanSchema = z.object({
    mode: z.enum(["organic", "ad"]),
    title: z.string().trim().min(1).max(100),
    aspect: z.enum(["9:16", "4:5", "1:1", "16:9"]),
    fit: z.enum(["contain", "cover"]).default("contain"),
    sourceAudio: z.boolean().default(true),
    musicDb: z.number().finite().min(-40).max(-8).default(-22),
    musicFade: z.number().finite().min(0).max(5).optional(),
    voiceDb: z.number().finite().min(-40).max(0).optional(),
    duckMusic: z.boolean().optional(),
    captionsEnabled: z.boolean().optional(),
    clips: z.array(z.object({ file: z.number().int().min(0), start: z.number().finite().min(0), end: z.number().finite().positive(),
        focalX: z.number().finite().min(0).max(1).optional(), focalY: z.number().finite().min(0).max(1).optional(),
        gainDb: z.number().finite().min(-40).max(0).optional(), fadeIn: z.number().finite().min(0).max(5).optional(), fadeOut: z.number().finite().min(0).max(5).optional(),
    })).min(1).max(12),
    captions: z.array(z.object({ start: z.number().finite().min(0), end: z.number().finite().positive(), text: z.string().trim().min(1).max(160), position: z.enum(["top", "bottom"]).default("bottom") })).max(40).default([]),
});
export type EditPlan = z.infer<typeof editPlanSchema>;
export type ClipInfo = {
    duration: number;
    width: number;
    height: number;
    hasAudio: boolean;
};
export function validateTimeline(plan: EditPlan, media: ClipInfo[]): number {
    let duration = 0;
    for (const [i, clip] of plan.clips.entries()) {
        const info = media[clip.file];
        if (!info || !info.width || !info.height || !info.duration)
            throw new Error(`Clip ${i + 1} is not a readable video.`);
        if (clip.end <= clip.start || clip.end > info.duration + 0.04)
            throw new Error(`Clip ${i + 1}: the end must follow the start and stay inside the source video.`);
        if ((clip.fadeIn ?? 0) + (clip.fadeOut ?? 0) > clip.end - clip.start)
            throw new Error(`Clip ${i + 1}: audio fades must fit inside its trim.`);
        duration += clip.end - clip.start;
    }
    if (duration < 0.2 || duration > MAX_EDIT_SECONDS)
        throw new Error("Keep the edited video between 0.2 seconds and 10 minutes.");
    const ordered = [...plan.captions].sort((a, b) => a.start - b.start);
    for (const [i, caption] of ordered.entries()) {
        if (caption.end <= caption.start || caption.end > duration + 0.001)
            throw new Error("Caption times must stay inside the edited video.");
        if (i && caption.start < ordered[i - 1].end)
            throw new Error("Caption windows cannot overlap. Move one or combine their words.");
    }
    return duration;
}
export function editSize(aspect: EditPlan["aspect"]): [
    number,
    number
] {
    return { "9:16": [1080, 1920], "4:5": [1080, 1350], "1:1": [1080, 1080], "16:9": [1920, 1080] }[aspect] as [
        number,
        number
    ];
}
export function fitFilter(size: [
    number,
    number
], fit: EditPlan["fit"], focalX = 0.5, focalY = 0.5): string {
    const [w, h] = size;
    return fit === "cover" ? `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}:(iw-ow)*${focalX}:(ih-oh)*${focalY},setsar=1`
        : `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
}
export function editFileUrl(id: string, file: "clean.mp4" | "captioned.mp4" | "captions.srt", download = false): string {
    return `/api/video-edits/${id}/${file}${download ? "?download=1" : ""}`;
}
export function captionSrt(captions: EditPlan["captions"]): string {
    const stamp = (s: number) => {
        const ms = Math.round(s * 1000);
        return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
    };
    return [...captions].sort((a, b) => a.start - b.start).map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text.replace(/\r?\n/g, " ")}\n`).join("\n");
}
export function hookVariant(plan: EditPlan, hook: EditPlan["clips"][number], title: string): EditPlan {
    const oldLength = plan.clips[0].end - plan.clips[0].start, newLength = hook.end - hook.start;
    const delta = newLength - oldLength;
    return editPlanSchema.parse({ ...plan, title, clips: [hook, ...plan.clips.slice(1)],
        captions: plan.captions.filter(c => c.start >= oldLength).map(c => ({ ...c, start: c.start + delta, end: c.end + delta })) });
}
export function parseSrt(text: string): EditPlan["captions"] {
    const stamp = (s: string) => { const [h, m, secs] = s.replace(",", ".").split(":").map(Number); if (m >= 60 || secs >= 60)
        throw new Error("Use minutes and seconds below 60 in SRT timestamps."); return h * 3600 + m * 60 + secs; };
    return editPlanSchema.shape.captions.parse(text.trim().split(/\r?\n\s*\r?\n/).map(block => {
        const lines = block.split(/\r?\n/);
        if (/^\d+$/.test(lines[0]))
            lines.shift();
        const match = /^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})$/.exec(lines.shift() ?? "");
        if (!match)
            throw new Error("Use an SRT file with standard timestamp lines.");
        return { start: stamp(match[1]), end: stamp(match[2]), text: lines.join(" ").replace(/<[^>]*>/g, ""), position: "bottom" as const };
    }));
}
