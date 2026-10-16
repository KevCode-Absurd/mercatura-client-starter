import { worldOf } from "../studio/worlds";
import { STAGES, type FullTaste, type LeverKey, type Medium, type Stage, type Surface, type Taste, type UseCase } from "./types";
export const SURFACE_INFO: Record<Surface, {
    label: string;
    medium: Medium;
}> = {
    script: { label: "Script", medium: "words" },
    hooks: { label: "Hooks", medium: "words" },
    caption: { label: "Caption and feed copy", medium: "words" },
    landing: { label: "Landing page copy", medium: "words" },
    image_ad: { label: "Image ad", medium: "picture" },
    native_ad: { label: "Native ad", medium: "picture" },
    sprint_ad: { label: "Sprint ad", medium: "picture" },
    carousel: { label: "Carousel", medium: "picture" },
    pdp: { label: "Product page image", medium: "picture" },
    photoshoot: { label: "Photoshoot frame", medium: "picture" },
    storyboard: { label: "Storyboard frame", medium: "picture" },
    shot_plan: { label: "Shot plan", medium: "video" },
    cast: { label: "Cast picture", medium: "picture" },
};
export const mediumOf = (s: Surface): Medium => SURFACE_INFO[s].medium;
export const stageOf = (s: UseCase["stage"]): Stage | null => ((STAGES as readonly string[]).includes(String(s ?? "")) ? (s as Stage) : null);
export const PRODUCT_BY_STAGE: Record<Stage, FullTaste["product"]> = {
    unaware: "none",
    problem_aware: "none",
    solution_aware: "scene",
    product_aware: "clear",
    most_aware: "hero",
};
export const PRODUCT_NO_STAGE: FullTaste["product"] = "clear";
export const PRODUCT_BY_SURFACE: Partial<Record<Surface, FullTaste["product"]>> = {
    native_ad: "none",
    pdp: "hero",
    photoshoot: "hero",
};
export const STYLING_BY_SURFACE: Partial<Record<Surface, FullTaste["styling"]>> = { native_ad: "none" };
export const STYLING_UNAWARE_AD: FullTaste["styling"] = "basics";
export const UNAWARE_AD_SURFACES: Surface[] = ["image_ad", "sprint_ad", "carousel"];
export const FINISH_BY_STAGE: Partial<Record<Stage, FullTaste["finish"]>> = { unaware: "phone", problem_aware: "phone" };
export const WORDS_BY_STAGE: Partial<Record<Stage, FullTaste["words"]>> = { unaware: "none" };
export interface WordBudget {
    words: number;
    lines: number;
}
export const WORD_BUDGET: Record<Stage, WordBudget> = {
    unaware: { words: 0, lines: 0 },
    problem_aware: { words: 8, lines: 1 },
    solution_aware: { words: 10, lines: 2 },
    product_aware: { words: 12, lines: 2 },
    most_aware: { words: 14, lines: 3 },
};
export const WORD_BUDGET_NO_STAGE: WordBudget = WORD_BUDGET.product_aware;
export const WORD_BUDGET_OWN_WORDS: WordBudget = { words: 25, lines: 4 };
export const WORD_BUDGET_CARRIED: WordBudget = { words: 10, lines: 1 };
export function wordBudget(stage: Stage | null | undefined, o: {
    ownWords?: boolean;
    carried?: boolean;
} = {}): WordBudget {
    if (stage === "unaware")
        return o.ownWords ? WORD_BUDGET_OWN_WORDS : WORD_BUDGET.unaware;
    const base = stage ? WORD_BUDGET[stage] : WORD_BUDGET_NO_STAGE;
    return o.carried || o.ownWords ? { words: base.words + WORD_BUDGET_CARRIED.words, lines: base.lines + WORD_BUDGET_CARRIED.lines } : base;
}
const conceptWorld = (format: UseCase["format"]) => !!worldOf(format);
export const LEVERS_FOR: Record<Surface, LeverKey[]> = {
    script: ["look", "sell", "length", "spread"],
    hooks: ["look", "hooks", "length"],
    caption: ["look", "sell", "length", "spread"],
    landing: ["look", "sell", "length"],
    image_ad: ["look", "product", "styling", "sell", "words", "finish", "spread", "people"],
    native_ad: ["look", "product", "styling", "sell", "words", "finish", "spread"],
    sprint_ad: ["look", "product", "styling", "sell", "words", "finish", "spread", "people"],
    carousel: ["look", "product", "styling", "sell", "words", "finish", "people"],
    pdp: ["look", "product", "words", "finish"],
    photoshoot: ["look", "product", "finish", "people"],
    storyboard: ["look", "product", "finish", "people"],
    shot_plan: ["look", "product", "pace", "people"],
    cast: ["people", "finish"],
};
export const FIXED: Partial<Record<Surface, {
    value: Taste;
    why: string;
}>> = {
    pdp: { value: { styling: "full" }, why: "Product page images always use the full brand look." },
    photoshoot: { value: { words: "none" }, why: "A photoshoot frame has no words on it." },
    storyboard: { value: { words: "none" }, why: "A storyboard frame has no words on it. Captions are added after the clip is made." },
    cast: { value: { product: "none", words: "none", styling: "none", look: "between" }, why: "A cast picture shows the person only: no product, no words, no brand design." },
};
const BASE: FullTaste = {
    look: "between",
    product: PRODUCT_NO_STAGE,
    styling: "full",
    sell: "balanced",
    words: "full",
    finish: "brand",
    spread: "angles",
    length: "standard",
    pace: "normal",
    people: "photo",
    hooks: "promise",
};
export const SECONDARY_BY_SURFACE: Partial<Record<Surface, Taste>> = {
    native_ad: { finish: "phone" },
    photoshoot: { finish: "studio" },
    pdp: { finish: "studio" },
    hooks: { spread: "openings" },
};
export function peopleForFormat(format: string | null | undefined): FullTaste["people"] {
    const f = String(format ?? "").toLowerCase();
    if (/clay_world|wool|paper|watercolor|anime|skeleton|cinematic_3d|song/.test(f))
        return "illustrated";
    if (f.includes("clay"))
        return "clay";
    if (f.includes("comic") || f.includes("explainer") || f.includes("illustrat"))
        return "illustrated";
    return "photo";
}
export function defaultTaste(u: UseCase): FullTaste {
    const stage = stageOf(u.stage);
    const t: FullTaste = { ...BASE, ...SECONDARY_BY_SURFACE[u.surface] };
    t.product = PRODUCT_BY_SURFACE[u.surface] ?? (stage ? PRODUCT_BY_STAGE[stage] : PRODUCT_NO_STAGE);
    t.styling = STYLING_BY_SURFACE[u.surface] ?? (stage === "unaware" && UNAWARE_AD_SURFACES.includes(u.surface) ? STYLING_UNAWARE_AD : "full");
    if (stage && UNAWARE_AD_SURFACES.includes(u.surface) && !conceptWorld(u.format)) {
        t.finish = FINISH_BY_STAGE[stage] ?? t.finish;
        t.words = WORDS_BY_STAGE[stage] ?? t.words;
    }
    if (stage && UNAWARE_AD_SURFACES.includes(u.surface) && conceptWorld(u.format))
        t.words = WORDS_BY_STAGE[stage] ?? t.words;
    t.people = peopleForFormat(u.format);
    return { ...t, ...FIXED[u.surface]?.value };
}
export function resolveTaste(u: UseCase, partial: Taste | null | undefined = {}): FullTaste {
    const moved: Taste = {};
    for (const [k, v] of Object.entries(partial ?? {}))
        if (v)
            (moved as Record<string, string>)[k] = v;
    const t: FullTaste = { ...defaultTaste(u), ...moved, ...FIXED[u.surface]?.value };
    if (t.look === "reference" && !u.hasReference)
        t.look = "between";
    return t;
}
export const isDefault = (u: UseCase, key: LeverKey, value: string) => defaultTaste(u)[key] === value;
export const lookStops = (hasReference: boolean): FullTaste["look"][] => (hasReference ? ["brand", "between", "reference", "new"] : ["brand", "between", "new"]);
