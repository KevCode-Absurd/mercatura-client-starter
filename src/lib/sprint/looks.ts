import { apportion } from "./formats";
import { WORLDS, ruledOut, worldOf } from "../studio/worlds";
export interface SprintLook {
    id: string;
    label: string;
    what: string;
    worlds: string[];
    suits: "picture" | "words" | "any";
    standIn: string;
    example: string;
}
export const LAYOUTS = "layouts";
const PRODUCT = "a plain matte white stand-up pouch with a blank label (no brand name, no words on it)";
export const SPRINT_LOOKS: SprintLook[] = [
    { id: LAYOUTS, label: "Classic static", what: "Built on layouts that have won for other brands: a headline, your product, the proof.", worlds: [], suits: "any", standIn: "ad-layout", example: `A clean static ad: ${PRODUCT} on a soft green background, a big bold headline at the top reading "YOUR HEADLINE", 3 short benefit ticks at the left, a small button shape at the bottom. Modern, bright, well spaced.` },
    { id: "product-shoot", label: "Product shoot", what: "Your product as the hero of a photograph: in the studio, up close, in a real place. Few words.", worlds: ["macro-luxury", "lifestyle-flags", "epic-monument", "bw-accent"], suits: "picture", standIn: "photoshoot", example: `A campaign product photograph used as an ad: ${PRODUCT} on a pale stone plinth in hard sunlight, 1 sharp shadow, a sprig of green leaves beside it, sage background, and 1 short line of small type in a corner reading "ONE A DAY". Magazine quality.` },
    { id: "comic", label: "Comic book", what: "Inked panels, halftone dots and a speech bubble, like a page from a comic.", worlds: ["vintage-comic"], suits: "any", standIn: "comic", example: `A single advertisement drawn as a mid-century comic book panel: flat inks, halftone dots, a tired cartoon adult at a desk with a speech bubble reading "NOT AGAIN", and ${PRODUCT} drawn in the same inked style in the corner with a starburst behind it.` },
    { id: "clay", label: "Clay and 3D", what: "Soft clay shapes, tiny dioramas and 3D characters. Friendly, and hard to scroll past.", worlds: ["soft-clay", "miniature-diorama", "character-3d", "storybook", "mascot-world"], suits: "picture", standIn: "claymation", example: `An advertisement made as a soft clay scene: rounded matte pastel clay shapes with visible fingerprints, a small clay character holding a clay version of ${PRODUCT}, a short headline in chunky clay letters reading "SO EASY". Warm studio light.` },
    { id: "drawn", label: "Hand-drawn", what: "A marker sketch, a flat cartoon, a labelled diagram: made by a hand, not a camera.", worlds: ["hand-sketch", "flat-cartoon", "infographic", "engraving"], suits: "any", standIn: "", example: `An advertisement drawn by hand in black marker on cream paper: a simple sketch of ${PRODUCT} in the middle, 3 hand-drawn arrows pointing to it with short scribbled labels reading "ONE", "TWO" and "THREE", and an underlined handwritten headline at the top reading "HOW IT WORKS".` },
    { id: "post", label: "Looks like a post", what: "A message between 2 people, a note, a photo of a billboard. Reads as something a person shared.", worlds: ["message-thread", "billboard-photo", "hand-sketch"], suits: "words", standIn: "native", example: `A phone screen showing a plain chat between 2 people in a generic design of no real app: 3 short grey and green message bubbles with placeholder lines, and the last bubble a small photo of ${PRODUCT} on a kitchen counter. Clean, bright, vertical.` },
    { id: "surreal", label: "Scroll-stoppers", what: "1 picture that cannot be true, played straight: an impossible scene, an X-ray, a game screen.", worlds: ["absurd-photoreal", "problem-noir", "scientific-imaging", "game-ui"], suits: "picture", standIn: "ad-concept", example: `A scroll-stopping surreal photograph used as an ad: a giant ${PRODUCT} parked in a supermarket car park like a car, shoppers walking past as if it were normal, flat daylight, a short bold headline at the top reading "HARD TO MISS".` },
];
export const SPRINT_FORMATS: SprintLook[] = [SPRINT_LOOKS[0], ...WORLDS.map((w): SprintLook => ({ id: `world-${w.id}`, label: w.label, what: w.look, worlds: [w.id], suits: "any", standIn: "", example: `${w.look} Show ${PRODUCT}. No added lettering.` }))];
SPRINT_LOOKS.push(...SPRINT_FORMATS.slice(1));
export const lookOf = (id: string | null | undefined) => SPRINT_LOOKS.find((l) => l.id === id);
export function balancedLooks(size: number, ids: string[] = SPRINT_FORMATS.map((l) => l.id)): Record<string, number> {
    const chosen = [...new Set(ids)];
    if (!chosen.length)
        throw new Error("Keep at least one format enabled.");
    if (chosen.some((id) => !lookOf(id)))
        throw new Error("Unknown visual format.");
    if (size < chosen.length)
        throw new Error(`Choose at least ${chosen.length} ads or disable some formats. Each enabled format needs at least one ad.`);
    const counts = apportion(size, chosen.map(() => 1));
    return Object.fromEntries(chosen.map((id, i) => [id, counts[i]]));
}
export const lookExampleId = (id: string) => `look-${id}`;
export function lookMix(size: number, mix?: Record<string, number>): Record<string, number> {
    const asked = SPRINT_LOOKS.map((l) => [l.id, Math.max(0, Math.round(mix?.[l.id] ?? 0))] as const).filter(([, n]) => n > 0);
    if (!asked.length)
        return { [LAYOUTS]: size };
    const counts = apportion(size, asked.map(([, n]) => n));
    return Object.fromEntries(asked.map(([id], i) => [id, counts[i]] as const).filter(([, n]) => n > 0));
}
const spaced = <X,>(list: X[], k: number): X[] => (k >= list.length ? list : Array.from({ length: k }, (_, i) => list[Math.floor((i * list.length) / k)]));
export function dealLooks<T extends {
    n: number;
    text_forward: boolean;
}>(slots: T[], mix: Record<string, number>, o: {
    never?: string | null;
    byHand?: string[];
} = {}): (T & {
    look?: string;
    world?: string;
})[] {
    const out = new Map<number, {
        look: string;
        world: string;
        text_forward: boolean;
    }>();
    const worldsOf = (look: SprintLook) => (o.byHand?.includes(look.id) ? look.worlds : look.worlds.filter((w) => !ruledOut(worldOf(w), o.never)));
    const order = SPRINT_LOOKS.filter((l) => l.worlds.length && (mix[l.id] ?? 0) > 0 && worldsOf(l).length).sort((a, b) => Number(a.suits === "any") - Number(b.suits === "any") || mix[a.id] - mix[b.id]);
    for (const look of order) {
        const worlds = worldsOf(look);
        const free = slots.filter((s) => !out.has(s.n));
        const fits = (s: T) => look.suits === "any" || (look.suits === "words") === s.text_forward;
        const first = spaced(free.filter(fits), mix[look.id]);
        const rest = spaced(free.filter((s) => !fits(s)), mix[look.id] - first.length);
        [...first, ...rest].sort((a, b) => a.n - b.n).forEach((s, k) => out.set(s.n, { look: look.id, world: worlds[k % worlds.length], text_forward: look.suits === "picture" ? false : s.text_forward }));
    }
    return slots.map((s) => (out.has(s.n) ? { ...s, ...out.get(s.n)! } : s));
}
export const looksRuledOut = (mix: Record<string, number>, never: string | null | undefined, byHand: string[] = []): {
    look: string;
    word: string;
}[] => SPRINT_LOOKS.filter((l) => l.worlds.length && (mix[l.id] ?? 0) > 0 && !byHand.includes(l.id) && l.worlds.every((w) => ruledOut(worldOf(w), never))).map((l) => ({ look: l.label, word: ruledOut(worldOf(l.worlds[0]), never) }));
export const looksByHand = (formats: string[] | null | undefined, looks?: Record<string, number> | null): string[] => {
    const picked = formats?.length ? formats : Object.entries(looks ?? {}).filter(([, n]) => n > 0).map(([id]) => id);
    return picked.length && picked.length < SPRINT_FORMATS.length ? picked : [];
};
