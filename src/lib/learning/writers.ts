export const POINTS = [
    ["said", "Sounds said"],
    ["easy", "Easy to read"],
    ["sells", "Sells"],
    ["story", "Story"],
    ["brand", "On brand"],
    ["variety", "Variety"],
    ["accurate", "Accurate"],
] as const;
export type Point = (typeof POINTS)[number][0];
export const STAGES = ["unaware", "problem_aware", "solution_aware", "product_aware", "most_aware"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABEL: Record<Stage, string> = { unaware: "Unaware", problem_aware: "Problem aware", solution_aware: "Solution aware", product_aware: "Product aware", most_aware: "Most aware" };
export const STAGE_BUYER: Record<Stage, string> = {
    unaware: "Someone who has not identified the problem. Use an observed situation from the current client's research.",
    problem_aware: "Someone who recognizes the problem but has not chosen a solution. Explain the relevant tradeoff.",
    solution_aware: "Someone comparing available approaches. Use only substantiated differentiators.",
    product_aware: "Someone who knows this product and has an unresolved objection. Address it with verified evidence.",
    most_aware: "Someone ready to decide. Use the current client's approved offer and accurate terms, if available.",
};
export const SURFACES = [
    ["headlines", "Headlines"],
    ["primary", "Primary texts"],
    ["scripts", "Video scripts"],
    ["clips", "Video plans"],
] as const;
export type Surface = (typeof SURFACES)[number][0];
export const READ_KINDS = ["headlines", "primary", "scripts"] as const;
export type ReadKind = (typeof READ_KINDS)[number];
export type SetScore = Record<Point, number> & {
    best: string;
    worst: string;
    why: string;
};
export interface Reading {
    stage: Stage;
    surface: Surface;
    ranking: string[];
    sets: Record<string, SetScore>;
}
export interface Judge {
    tag: string;
    model: string;
    name: string;
    usd: number;
    readings: Reading[];
}
export interface WriterStage {
    stage: Stage;
    headlines: {
        text: string;
        angle: string;
    }[];
    primary: {
        text: string;
        angle: string;
        words: number;
        grade: number;
    }[];
    scripts: ({
        type: string;
        words: number;
        grade: number;
        lines: {
            text: string;
            on: string;
        }[];
    } | null)[];
    video: {
        clips: number;
        scriptWords: number;
        spoken: number;
        cut: boolean;
    } | null;
}
export interface Writer {
    key: string;
    model: string;
    name: string;
    usd: number;
    copyUsd: number;
    scriptUsd: number;
    clipUsd: number;
    primaryGrade: number;
    scriptGrade: number;
    flagged: number;
    missing: number;
    unawareTextWords: number | null;
    stages: WriterStage[];
}
export interface WriterTest {
    at: string;
    arms: Writer[];
    judges: Judge[];
}
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
export function readingsOf(judges: Judge[], surface: Surface | "all", judge: string): Reading[] {
    return judges.filter((j) => judge === "all" || j.tag === judge).flatMap((j) => j.readings.filter((r) => surface === "all" || r.surface === surface));
}
export interface ScoreRow {
    key: string;
    name: string;
    points: number[];
    mean: number;
    first: number;
    readings: number;
}
export function scoreRows(arms: Pick<Writer, "key" | "name">[], readings: Reading[]): ScoreRow[] {
    return arms.map((a) => {
        const mine = readings.filter((r) => r.sets[a.key]);
        const points = POINTS.map(([p]) => mean(mine.map((r) => r.sets[a.key][p]).filter((v) => !Number.isNaN(v))));
        return { key: a.key, name: a.name, points, mean: mean(points.filter((v) => !Number.isNaN(v))), first: mine.filter((r) => r.ranking[0] === a.key).length, readings: mine.length };
    });
}
export function verdict(judge: Judge, stage: Stage, surface: Surface, key: string): {
    mean: number;
    place: number;
    of: number;
    why: string;
    best: string;
    worst: string;
} | null {
    const r = judge.readings.find((x) => x.stage === stage && x.surface === surface);
    const s = r?.sets[key];
    if (!r || !s)
        return null;
    return { mean: mean(POINTS.map(([p]) => s[p])), place: r.ranking.indexOf(key) + 1, of: r.ranking.length, why: s.why, best: s.best, worst: s.worst };
}
