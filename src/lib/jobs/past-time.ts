import { SAMPLE_SECONDS, aboutTime } from "@/lib/studio/timing";
export interface StepTime {
    seconds: number;
    basis: number;
}
export const NO_TIME: StepTime = { seconds: 0, basis: 0 };
export const NO_TIME_YET = "first run, no time yet";
const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export function pastSeconds(runs: number[]): StepTime {
    const real = runs.filter((s) => Number.isFinite(s) && s >= SAMPLE_SECONDS);
    if (!real.length)
        return NO_TIME;
    return { seconds: Math.max(SAMPLE_SECONDS, Math.round(median(real))), basis: real.length };
}
export function pastTimeLine(t: StepTime | null | undefined, each?: string): string {
    if (!t || t.basis === 0 || t.seconds <= 0)
        return NO_TIME_YET;
    return `${aboutTime(t.seconds)}${each ? ` ${each}` : ""}, from past runs`;
}
