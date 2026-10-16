import type { EditPlan } from "./plan";
export type PreviewClip = Omit<EditPlan["clips"][number], "file"> & {
    url: string;
    name: string;
};
export function timelinePosition(clips: Pick<PreviewClip, "start" | "end">[], time: number) {
    let offset = 0;
    for (const [index, c] of clips.entries()) {
        const length = Math.max(0, c.end - c.start);
        if (time < offset + length || index === clips.length - 1)
            return { index, offset, sourceTime: Math.max(c.start, Math.min(c.end, c.start + time - offset)) };
        offset += length;
    }
    return { index: 0, offset: 0, sourceTime: 0 };
}
export function previewGain(db: number, elapsed: number, duration: number, fadeIn = 0, fadeOut = 0) {
    const fade = Math.max(0, Math.min(1, fadeIn ? elapsed / fadeIn : 1, fadeOut ? (duration - elapsed) / fadeOut : 1));
    return Math.min(1, Math.pow(10, db / 20) * fade);
}
