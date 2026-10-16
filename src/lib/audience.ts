export function seedOf(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++)
        h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
}
export function rng(seed: string): () => number {
    let a = seedOf(seed);
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export const between = (r: () => number, lo: number, hi: number) => lo + (hi - lo) * r();
export const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
export const AGE_BANDS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];
export const BAND_RANGE: Record<AgeBand, [
    number,
    number
]> = { "18-24": [18, 24], "25-34": [25, 34], "35-44": [35, 44], "45-54": [45, 54], "55-64": [55, 64], "65+": [65, 90] };
export const GENDERS = ["women", "men"] as const;
export type Gender = (typeof GENDERS)[number];
export function ageRange(age: string): [
    number,
    number
] | null {
    const nums = (age.match(/\d+/g) ?? []).map(Number);
    if (!nums.length)
        return null;
    if (/over|\+|and up|older/i.test(age))
        return [nums[0], 90];
    return [nums[0], nums[1] ?? nums[0]];
}
export function overlap(a: [
    number,
    number
], b: [
    number,
    number
]): number {
    const lo = Math.max(a[0], b[0]);
    const hi = Math.min(a[1], b[1]);
    return hi < lo ? 0 : (hi - lo + 1) / (b[1] - b[0] + 1);
}
export const genderWeight = (gender: string, g: Gender) => {
    const s = gender.toLowerCase();
    if (/mostly women/.test(s))
        return g === "women" ? 0.75 : 0.25;
    if (/mostly men/.test(s))
        return g === "men" ? 0.75 : 0.25;
    if (/women|female/.test(s))
        return g === "women" ? 0.92 : 0.08;
    if (/\bmen\b|male/.test(s))
        return g === "men" ? 0.92 : 0.08;
    return 0.5;
};
export const genderWord = (g: string) => (g === "women" ? "Women" : "Men");
export const cellLabel = (age: AgeBand, gender: Gender) => `${genderWord(gender)} ${age === "65+" ? "65 and over" : age.replace("-", " to ")}`;
export function spread(age: string, gender: string): {
    age: AgeBand;
    gender: Gender;
    weight: number;
}[] {
    const range = ageRange(age);
    const cells = AGE_BANDS.flatMap((band) => GENDERS.map((g) => ({ age: band, gender: g, weight: (range ? overlap(range, BAND_RANGE[band]) : 1) * genderWeight(gender, g) })));
    const total = cells.reduce((a, c) => a + c.weight, 0) || 1;
    return cells.map((c) => ({ ...c, weight: c.weight / total }));
}
