export type Variety = 1 | 2 | 3 | 4 | 5;
export const VARIETY_DEFAULT: Variety = 3;
export const VARIETY_LABELS: Record<Variety, string> = {
    1: "Close to the brand",
    2: "Mostly the brand",
    3: "In between",
    4: "Mostly new",
    5: "Try something new",
};
export function clampVariety(n: unknown): Variety {
    const v = Math.round(Number(n));
    if (!Number.isFinite(v))
        return VARIETY_DEFAULT;
    return Math.min(5, Math.max(1, v)) as Variety;
}
export function varietyTemperature(v: Variety): number {
    return { 1: 0.5, 2: 0.7, 3: 0.9, 4: 1.05, 5: 1.2 }[v];
}
export function varietyNote(v: Variety): string {
    if (v <= 1)
        return "Stay close to the brand: its own ads and pages are the model. Sound like them, look like them, and use the ways in they already use.";
    if (v === 2)
        return "Lean on the brand's own ads and pages for sound and look, with one fresh choice of your own.";
    if (v === 3)
        return "Hold the brand's voice and look, and find your own way in. Do not repeat a line, an image or a structure the brand's ads already use.";
    if (v === 4)
        return "Keep the brand recognisable, but take a way in, a scene or a form the brand has not tried. Reach past the first idea.";
    return "Try something the brand has never run: a new way in, a new scene, a new form. Only the truth of the facts, the brand's name and the product itself are fixed.";
}
