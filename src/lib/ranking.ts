export interface RankWeights {
    w_int: number;
    w_freq: number;
    w_div: number;
}
export const DEFAULT_WEIGHTS: RankWeights = { w_int: 0.5, w_freq: 0.35, w_div: 0.15 };
export interface RankableInsight {
    id: string;
    source_item_id: string;
    source_type: string;
    intensity: number;
    persona_id: string | null;
    objection_class: string | null;
    date?: string | null;
}
export interface ThemeStats {
    frequency: number;
    intensity_avg: number;
    intensity_peak: number;
    source_types: string[];
    personas: string[];
    objection_classes: string[];
    newest_date: string | null;
}
const SOURCE_ORDER = ["call", "ticket", "review", "survey", "community", "website", "founder"];
const BRAND_VOICE = new Set(["website", "founder"]);
export function themeStats(insights: RankableInsight[]): ThemeStats {
    const intensities = insights.map((i) => i.intensity);
    const uniq = <T,>(xs: T[]) => [...new Set(xs)];
    const dates = insights.map((i) => i.date).filter((d): d is string => !!d).sort();
    return {
        frequency: new Set(insights.map((i) => i.source_item_id)).size,
        intensity_avg: intensities.length ? intensities.reduce((a, b) => a + b, 0) / intensities.length : 0,
        intensity_peak: intensities.length ? Math.max(...intensities) : 0,
        source_types: uniq(insights.map((i) => i.source_type)).sort((a, b) => SOURCE_ORDER.indexOf(a) - SOURCE_ORDER.indexOf(b)),
        personas: uniq(insights.map((i) => i.persona_id).filter((p): p is string => !!p)).sort(),
        objection_classes: uniq(insights.map((i) => i.objection_class).filter((o): o is string => !!o)).sort(),
        newest_date: dates.length ? dates[dates.length - 1] : null,
    };
}
export function themeScore(stats: Pick<ThemeStats, "frequency" | "intensity_avg" | "source_types">, maxFrequency: number, w: RankWeights = DEFAULT_WEIGHTS): number {
    const diversity = Math.max(1, stats.source_types.filter((t) => !BRAND_VOICE.has(t)).length);
    const freqPart = maxFrequency > 0 ? Math.log(1 + stats.frequency) / Math.log(1 + maxFrequency) : 0;
    const raw = 100 * (w.w_int * (stats.intensity_avg - 1) / 4 + w.w_freq * freqPart + w.w_div * (diversity - 1) / 4);
    return Math.round(raw * 10) / 10;
}
export interface Scorable {
    id: string;
    label: string;
    frequency: number;
    intensity_avg: number;
    intensity_peak: number;
    source_types: string[];
}
export function rankThemes<T extends Scorable>(themes: T[], w: RankWeights = DEFAULT_WEIGHTS): (T & {
    score: number;
    rank: number;
})[] {
    const maxFrequency = Math.max(0, ...themes.map((t) => t.frequency));
    return themes
        .map((t) => ({ ...t, score: themeScore(t, maxFrequency, w) }))
        .sort((a, b) => b.score - a.score || b.intensity_peak - a.intensity_peak || a.label.localeCompare(b.label))
        .map((t, i) => ({ ...t, rank: i + 1 }));
}
export function daysSince(date: string | null, now: Date = new Date()): number | null {
    if (!date)
        return null;
    return Math.floor((now.getTime() - new Date(date).getTime()) / 86400000);
}
