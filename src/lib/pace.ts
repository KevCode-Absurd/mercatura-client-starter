export const SPEECH_PACES = [
    { from: 18, band: "under 30", rate: 3.6, said: "fast and bright, the words running on the way they do when someone in their twenties tells a friend" },
    { from: 30, band: "30 to 44", rate: 3.4, said: "quick and easy, 1 sentence straight after the last, the way people talk to a friend" },
    { from: 45, band: "45 to 59", rate: 3.2, said: "brisk and sure, with no gap between sentences" },
    { from: 60, band: "60 to 74", rate: 3, said: "steady and warm, at an easy pace that never drags" },
    { from: 75, band: "75 and over", rate: 2.8, said: "gentle and clear, in no hurry, with no long pauses" },
] as const;
export const USUAL_PACE = 3.3;
const USUAL_SAID = "quick and easy, 1 sentence straight after the last, the way people talk to a friend";
export const CALM_PACE = 0.85;
export const LONG_PACE = 0.9;
export const PACE_HEADROOM = 1.15;
const DECADES: Record<string, number> = { twenties: 20, thirties: 30, forties: 40, fifties: 50, sixties: 60, seventies: 70, eighties: 80, nineties: 90 };
const PART: Record<string, number> = { early: 2, mid: 5, late: 8 };
export function ageIn(said: string | number | null | undefined): number | null {
    if (typeof said === "number")
        return Number.isFinite(said) && said > 0 ? Math.max(18, Math.round(said)) : null;
    const s = (said ?? "").toLowerCase().replace(/[–—]/g, "-").trim();
    if (!s)
        return null;
    const adult = (n: number) => Math.max(18, Math.round(n));
    const part = /\b(early|mid|late)\b/.exec(s)?.[1];
    const decade = /\b(\d0)'?s\b/.exec(s)?.[1] ?? Object.keys(DECADES).find((w) => s.includes(w));
    if (decade)
        return adult((DECADES[decade] ?? Number(decade)) + (part ? PART[part] : 5));
    const range = /\b(\d{2})\s*(?:-|to|and)\s*(\d{2})\b/.exec(s);
    if (range)
        return adult(Math.floor((Number(range[1]) + Number(range[2])) / 2));
    const over = /\b(?:over|above|from)\s*(\d{2})\b/.exec(s)?.[1] ?? /\b(\d{2})\s*(?:\+|and over|and up|and older|or older|plus)/.exec(s)?.[1];
    if (over)
        return adult(Number(over) + 5);
    const under = /\b(?:under|below)\s*(\d{2})\b/.exec(s)?.[1];
    if (under)
        return adult(Number(under) - 3);
    const one = /\b(\d{2})\b/.exec(s)?.[1];
    if (one)
        return adult(Number(one));
    if (/\b(elderly|senior|pensioner|retired|retiree|grandmother|grandfather|grandparent)\b/.test(s))
        return 70;
    if (/\bmiddle[- ]aged\b/.test(s))
        return 50;
    if (/\b(young adult|student|gen z)\b/.test(s))
        return 24;
    return null;
}
export interface SpeechPace {
    rate: number;
    limit: number;
    band: string | null;
    said: string;
}
const tenth = (n: number) => Math.round(n * 10) / 10;
export function speechPace(age?: string | number | null, o: {
    calm?: boolean;
    long?: boolean;
} = {}): SpeechPace {
    const years = ageIn(age);
    const row = years === null ? null : [...SPEECH_PACES].reverse().find((p) => years >= p.from) ?? SPEECH_PACES[0];
    const rate = tenth((row?.rate ?? USUAL_PACE) * (o.calm ? CALM_PACE : 1) * (o.long ? LONG_PACE : 1));
    return { rate, limit: tenth(rate * PACE_HEADROOM), band: row?.band ?? null, said: o.calm ? "calm and unhurried, every word given its room" : (row?.said ?? USUAL_SAID) };
}
export const firstAge = (...said: (string | number | null | undefined)[]): string | number | null => said.find((x) => ageIn(x) !== null) ?? null;
export const paceSaid = (rate: number): string => `about ${Math.round((rate * 60) / 10) * 10} words a minute`;
