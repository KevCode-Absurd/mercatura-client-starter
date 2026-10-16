import { z } from "zod";
import type { RefBreakdown } from "./breakdown";
const text = z.string().catch("");
const timed = z.object({ start: z.number().finite().nonnegative(), end: z.number().finite().nonnegative() });
const segment = timed.extend({ speaker: text, text }).refine((s) => s.end > s.start);
const scene = timed.extend({ visual: text, on_screen_text: text, audio_relation: text, function: text, evidence: text });
const fields = z.object({
    advertiser: text, observations: text, readable_copy: text, transcript: text,
    mechanism: text, transferable_principles: text, do_not_transfer: text, limitations: text,
    performance: text, model: text, level: text,
});
export type ReferenceAnalysis = Partial<z.infer<typeof fields>> & {
    transcript_segments?: z.infer<typeof segment>[];
    timeline?: z.infer<typeof scene>[] | null;
    breakdown?: RefBreakdown;
    library_ref_id?: string;
    hooks?: import("./hook-types").HookSet;
    reading?: import("./reading-types").RefReading;
    formats?: Record<string, import("./reading-types").RefFormats>;
};
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const entries = <T>(value: unknown, schema: z.ZodType<T>): T[] => (Array.isArray(value) ? value : []).flatMap((entry) => {
    const read = schema.safeParse(entry);
    return read.success ? [read.data] : [];
});
export function readReferenceAnalysis(value: unknown): ReferenceAnalysis {
    const raw = object(value);
    return {
        ...fields.parse(raw),
        transcript_segments: entries(raw.transcript_segments, segment),
        timeline: entries(raw.timeline, scene),
        ...(typeof raw.library_ref_id === "string" ? { library_ref_id: raw.library_ref_id } : {}),
        ...(raw.breakdown && typeof raw.breakdown === "object" ? { breakdown: raw.breakdown as RefBreakdown } : {}),
    };
}
export function importedAnalysis(value: unknown, nativeValue: unknown): ReferenceAnalysis {
    const raw = object(value);
    const native = object(nativeValue);
    const own = readReferenceAnalysis(raw);
    const video = readReferenceAnalysis(native);
    return { ...own, transcript: own.transcript || video.transcript,
        transcript_segments: own.transcript_segments?.length ? own.transcript_segments : video.transcript_segments,
        timeline: video.timeline?.length ? video.timeline : own.timeline };
}
export function analysisDirection(value: unknown): string {
    const a = readReferenceAnalysis(value);
    return ([["How it persuades", a.mechanism], ["What to borrow", a.transferable_principles],
        ["Do not borrow", a.do_not_transfer], ["What is shown", a.observations]] as const)
        .filter(([, value]) => value?.trim()).map(([label, value]) => `${label}: ${value!.trim().slice(0, 500)}`).join("; ");
}
