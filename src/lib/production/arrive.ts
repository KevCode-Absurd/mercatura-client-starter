import type { OutputType } from "../taxonomy";
export interface Started {
    jobId: string | null;
}
export function arriveHref(started: Started, formatId: string, now: number): string {
    return started.jobId ? `/production?job=${encodeURIComponent(started.jobId)}` : `/production?making=${encodeURIComponent(formatId)}&at=${now}`;
}
export interface JobSeen {
    id: string;
    output_type: OutputType;
    created_at: string;
}
export function arrived(jobs: JobSeen[], type: OutputType, at: number): JobSeen | undefined {
    if (!Number.isFinite(at))
        return undefined;
    return jobs
        .filter((j) => j.output_type === type && Date.parse(j.created_at) >= at - 60000)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
}
export const NOTICE_LASTS_MS = 60 * 60 * 1000;
