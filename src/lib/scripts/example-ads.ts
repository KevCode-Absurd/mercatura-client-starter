import type { AdReferenceRow } from "@/db/schema";
import { readReferenceAnalysis } from "../references/analysis";
import { chooseVideoReferences, stagesOf, type ReferenceJob } from "../references/choose";
import { AWARENESS_INFO, type AwarenessStage } from "../taxonomy";
export const EXAMPLE_RULE = "Examples of shape, not of words. Each is a real ad for a buyer at this stage: read how it opens, where it turns and how it closes, and take that shape where it serves this brief. Nothing else moves across: not a line, a claim, a figure, an offer, a name or a person. What this ad says comes from the brand's own voice, facts and research.";
const SPEECH_MAX = 1200;
const STEP_MAX = 8;
const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[_\W]+/g, " ").trim();
const oneLine = (s: string | undefined, n: number) => {
    const t = (s ?? "").replace(/\s+/g, " ").trim();
    const first = t.match(/^.*?(?<!\b(?:vs|e\.g|i\.e|etc|approx))[.!?](?=\s+\S|\s*$)/)?.[0].trim() ?? t;
    return first.length > n ? `${first.slice(0, n - 1).trimEnd()}…` : first;
};
export function exampleAdsFor(job: Omit<ReferenceJob, "count"> & {
    count?: number;
}): AdReferenceRow[] {
    const want = norm(job.stage);
    if (!want)
        return [];
    return chooseVideoReferences({ ...job, count: Math.min(2, Math.max(1, job.count ?? 2)) }).filter((r) => stagesOf(r.awareness?.stage).some((s) => norm(s) === want));
}
export function exampleText(r: Pick<AdReferenceRow, "id" | "tags" | "analysis" | "awareness">, stage: AwarenessStage | string): string {
    const a = readReferenceAnalysis(r.analysis);
    const label = AWARENESS_INFO[stage as AwarenessStage]?.label ?? String(stage);
    const formats = (r.tags.format ?? []).slice(0, 3).join(", ");
    const why = oneLine(a.transferable_principles, 220) || oneLine(a.mechanism, 220);
    const speech = a.transcript_segments?.length ? a.transcript_segments.map((s) => `[${s.start}-${s.end}s] ${s.text.trim()}`).join("\n") : (a.transcript ?? "").trim();
    const steps = (a.timeline ?? []).slice(0, STEP_MAX).map((t, i) => `${i + 1}. [${t.start}-${t.end}s] ${oneLine(t.function, 90)}`).filter((s) => !/\]\s*$/.test(s));
    const shape = speech
        ? `Its lines, in order${speech.length > SPEECH_MAX ? " (the opening and the close; the middle left out)" : ""}:\n${speech.length > SPEECH_MAX ? `${speech.slice(0, SPEECH_MAX / 2).trimEnd()}\n[...]\n${speech.slice(-SPEECH_MAX / 2).trimStart()}` : speech}`
        : steps.length
            ? `Its steps, in order (no speech stored):\n${steps.join("\n")}`
            : "";
    return [`Source ad:${r.id} (a ${label.toLowerCase()} ad${formats ? `; ${formats}` : ""})`, why ? `Why it is here: ${why}` : "", shape].filter(Boolean).join("\n");
}
export function exampleBlock(refs: Pick<AdReferenceRow, "id" | "tags" | "analysis" | "awareness">[], stage: AwarenessStage | string): string {
    return refs.length ? `${EXAMPLE_RULE}\n\n${refs.map((r) => exampleText(r, stage)).join("\n\n")}` : "";
}
