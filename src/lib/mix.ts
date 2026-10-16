import { DESIRE_TYPES, PAIN_TYPES, type AwarenessStage, type InsightType } from "./taxonomy";
export const FUNNEL_TARGET = { min: 0.7, max: 0.9 };
export const PAIN_TARGET = { min: 0.6, max: 1 };
export function funnelMix(stages: AwarenessStage[]): number | null {
    if (!stages.length)
        return null;
    return stages.filter((s) => s === "unaware" || s === "problem_aware").length / stages.length;
}
export function painShare(themeTypes: InsightType[]): number | null {
    const pain = themeTypes.filter((t) => PAIN_TYPES.includes(t)).length;
    const desire = themeTypes.filter((t) => DESIRE_TYPES.includes(t)).length;
    return pain + desire ? pain / (pain + desire) : null;
}
