export interface PastWork {
    n: number;
    seconds: number;
}
export const FIRST_GUESS = {
    plan: { base: 75, each: 90 },
    render: { base: 30, each: 45 },
} as const;
export const SAMPLE_SECONDS = 8;
const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export function expectSeconds(past: PastWork[], n: number, first: {
    base: number;
    each: number;
}): {
    seconds: number;
    basis: number;
} {
    const count = Math.max(1, n);
    const real = past.filter((p) => p.n > 0 && p.seconds >= SAMPLE_SECONDS);
    if (!real.length)
        return { seconds: first.base + first.each * count, basis: 0 };
    const perImage = median(real.map((p) => p.seconds / p.n)) * count;
    let seconds = perImage;
    if (real.length >= 3 && new Set(real.map((p) => p.n)).size >= 2) {
        const mx = real.reduce((a, p) => a + p.n, 0) / real.length;
        const my = real.reduce((a, p) => a + p.seconds, 0) / real.length;
        const sxx = real.reduce((a, p) => a + (p.n - mx) ** 2, 0);
        const each = real.reduce((a, p) => a + (p.n - mx) * (p.seconds - my), 0) / sxx;
        const base = my - each * mx;
        if (each > 0 && base >= 0)
            seconds = base + each * count;
    }
    return { seconds: Math.max(15, Math.round(seconds)), basis: real.length };
}
export function aboutTime(seconds: number): string {
    if (seconds < 50)
        return `about ${Math.max(10, Math.round(seconds / 10) * 10)} seconds`;
    const m = Math.max(1, Math.round(seconds / 60));
    return `about ${m} minute${m === 1 ? "" : "s"}`;
}
export function clockTime(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    if (s < 60)
        return `${s} s`;
    const m = Math.floor(s / 60);
    return m >= 10 ? `${m} min` : `${m} min ${String(s % 60).padStart(2, "0")} s`;
}
export function barShare(elapsed: number, expected: number, done = 0, total = 0): number {
    const byTime = expected > 0 ? Math.min(0.95, elapsed / expected) : 0;
    const byCount = total > 0 ? Math.min(1, done / total) : 0;
    return Math.max(0.02, byTime, byCount);
}
export const PLAN_STEPS: {
    label: string;
    ends: RegExp;
}[] = [
    { label: "Deciding what each image argues", ends: /^(Strategy and copy written|Mock plan written)/ },
    { label: "Writing the words", ends: /^(Words .*written again|The words pass with the copy craft didn't run)/ },
    { label: "Reading the words back and fixing them", ends: /^Image prompts written/ },
    { label: "Describing each picture, then reading it once more", ends: /^$/ },
];
export function planStep(log: {
    at: string;
    message: string;
}[], since: string): number {
    const lines = log.filter((l) => l.at >= since).map((l) => l.message);
    let step = 0;
    for (let i = 0; i < PLAN_STEPS.length - 1; i++)
        if (lines.some((m) => PLAN_STEPS[i].ends.test(m)))
            step = i + 1;
    return step;
}
