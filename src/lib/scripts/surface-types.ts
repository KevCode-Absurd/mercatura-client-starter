import type { LengthPreset, OutputType } from "../taxonomy";
export const PROPS = ["face", "unshowable", "order", "sound", "attention", "person"] as const;
export type Prop = (typeof PROPS)[number];
export const PROP_INFO: Record<Prop, {
    label: string;
    question: string;
    beats: string;
}> = {
    face: { label: "A believed human face", question: "Can it carry a human face people believe?", beats: "problem and proof" },
    unshowable: { label: "Shows what a camera cannot", question: "Can it show what a camera cannot?", beats: "the mechanism, sometimes proof" },
    order: { label: "Order is controlled", question: "Do you control the order in which it is received?", beats: "the promise through to the call to action" },
    sound: { label: "Sound can be assumed", question: "Can you assume sound?", beats: "every spoken beat" },
    attention: { label: "Holds attention", question: "Will it hold attention long enough to develop something?", beats: "the problem, the mechanism and the offer" },
    person: { label: "Reads as a person", question: "Does it read as a person and not as an advertisement?", beats: "the hook and the problem" },
};
export type Has = "yes" | "partly" | "no";
export interface Surface {
    id: string;
    label: string;
    what: string;
    has: Record<Prop, Has>;
    outputs: OutputType[];
}
export const SURFACES: Surface[] = [
    { id: "film", label: "Cinematic film scene", what: "One or two fictional adults, directed coverage, a product-led reveal or emotional turn", has: { face: "partly", unshowable: "no", order: "yes", sound: "yes", attention: "yes", person: "partly" }, outputs: ["ai_cinematic"] },
    { id: "person", label: "1 person to camera", what: "UGC, a founder or an expert talking", has: { face: "yes", unshowable: "no", order: "yes", sound: "yes", attention: "partly", person: "partly" }, outputs: ["human_brief_ugc", "human_brief_founder", "ai_ugc", "ai_podcast"] },
    { id: "animated", label: "Drawn, rendered or animated", what: "Claymation, cartoon, a comic, anime, a clay, knitted, paper or painted world, motion graphics, a talking object, an explainer, a satisfying hook, a song", has: { face: "no", unshowable: "yes", order: "yes", sound: "yes", attention: "yes", person: "yes" }, outputs: ["ai_claymation", "ai_talking_object", "ai_comic", "ai_explainer", "ai_satisfying", "ai_cinematic_3d", "ai_clay_world", "ai_wool", "ai_paper", "ai_watercolor", "ai_anime", "ai_skeleton", "ai_motion_graphics", "ai_collage", "ai_song"] },
    { id: "mixed", label: "Mixed video", what: "A person, then animation, then the person; a VSL", has: { face: "yes", unshowable: "yes", order: "yes", sound: "yes", attention: "yes", person: "partly" }, outputs: ["ai_vsl", "human_brief_editor"] },
    { id: "long_static", label: "Long-form native static", what: "A plain photo with long copy beside it", has: { face: "no", unshowable: "no", order: "no", sound: "no", attention: "yes", person: "yes" }, outputs: ["static_long_copy", "static_advertorial"] },
    { id: "designed_static", label: "Designed static", what: "A headline, the product, a few points", has: { face: "no", unshowable: "partly", order: "no", sound: "no", attention: "no", person: "no" }, outputs: ["static_image"] },
    { id: "carousel", label: "Carousel", what: "3 to 10 cards, swiped", has: { face: "no", unshowable: "partly", order: "partly", sound: "no", attention: "partly", person: "no" }, outputs: ["carousel"] },
];
export type Need = "must" | "helps" | "no";
export type Needs = Record<Prop, {
    need: Need;
    why: string;
}>;
export type LoadBearing = "mechanism" | "proof" | "offer" | "problem";
export type Edge = "invisible" | "visible" | "terms" | "shared_experience";
export const EDGE_LABEL: Record<Edge, string> = { invisible: "The edge is invisible: it works where nobody can see", visible: "The edge is visible: you can watch it work", terms: "The edge is in the terms", shared_experience: "The edge is in a shared experience" };
export interface SurfaceFit {
    id: string;
    label: string;
    fit: "recommended" | "possible" | "poor";
    breaks: string[];
    cautions: string[];
    outputs: OutputType[];
}
export interface ScriptSurfaces {
    checked_at: string;
    by: string;
    version: number;
    load_bearing_beat: LoadBearing;
    edge: Edge;
    why: string;
    needs: Needs;
    fits: SurfaceFit[];
    length: {
        seconds: number;
        planned: string;
        verdict: "fits" | "too_short" | "too_long";
        recommended: LengthPreset;
        why: string;
        extend: string;
        squeezed: string[];
    };
    blend: string;
}
export const DEFAULT_NEEDS: Record<LoadBearing, {
    edge: Edge;
    needs: Record<Prop, Need>;
    first: string[];
}> = {
    mechanism: { edge: "invisible", needs: { face: "no", unshowable: "must", order: "must", sound: "helps", attention: "must", person: "helps" }, first: ["animated", "mixed"] },
    proof: { edge: "visible", needs: { face: "must", unshowable: "no", order: "helps", sound: "helps", attention: "helps", person: "must" }, first: ["person", "mixed"] },
    offer: { edge: "terms", needs: { face: "no", unshowable: "no", order: "no", sound: "no", attention: "no", person: "no" }, first: ["designed_static", "carousel"] },
    problem: { edge: "shared_experience", needs: { face: "helps", unshowable: "no", order: "helps", sound: "helps", attention: "must", person: "must" }, first: ["person", "long_static", "mixed"] },
};
export function scoreSurfaces(needs: Record<Prop, {
    need: Need;
}>, loadBearing: LoadBearing): SurfaceFit[] {
    const first = DEFAULT_NEEDS[loadBearing].first;
    const scored = SURFACES.map((s) => {
        const breaks: string[] = [];
        const cautions: string[] = [];
        let held = 0;
        for (const p of PROPS) {
            const need = needs[p].need;
            const has = s.has[p];
            const info = PROP_INFO[p];
            if (need === "must" && has === "no")
                breaks.push(`${info.label}: the script needs it for ${info.beats}, and this surface doesn't have it.`);
            else if (need === "must" && has === "partly")
                cautions.push(`${info.label}: only partly. ${PARTLY[s.id]?.[p] ?? "Plan for it."}`);
            else if (need === "helps" && has === "no")
                cautions.push(`${info.label}: the script is better with it and this surface has none.`);
            else if (need !== "no" && has === "yes")
                held++;
        }
        const fit: SurfaceFit["fit"] = breaks.length ? "poor" : cautions.length >= 2 ? "possible" : "recommended";
        return { s, fit, breaks, cautions, held };
    });
    const rank = { recommended: 0, possible: 1, poor: 2 };
    const pref = (id: string) => (first.includes(id) ? first.indexOf(id) : 9);
    return scored
        .sort((a, b) => rank[a.fit] - rank[b.fit] || a.breaks.length - b.breaks.length || a.cautions.length - b.cautions.length || b.held - a.held || pref(a.s.id) - pref(b.s.id))
        .map(({ s, fit, breaks, cautions }) => ({ id: s.id, label: s.label, fit, breaks, cautions, outputs: s.outputs }));
}
const PARTLY: Record<string, Partial<Record<Prop, string>>> = {
    film: { face: "A fictional adult can act a scene but is not a real customer or testimonial.", person: "A directed brand film reads as a staged scene; keep the reaction believable without implying personal results." },
    person: { attention: "A talking head alone holds attention poorly: cut in b-roll, captions and changes of shot.", person: "It reads as a person only if the script and the delivery sound unscripted." },
    mixed: { person: "Keep the person's sections sounding unscripted." },
    designed_static: { unshowable: "A diagram can show 1 step of it, not the whole process." },
    carousel: { unshowable: "A diagram on 1 card can show 1 step.", order: "The swipe gives an order, but most people see only the first card.", attention: "Each card has to earn the next swipe." },
};
export const NO_ROOM: Record<LengthPreset, string[]> = {
    "15s": ["promise", "mechanism", "objection", "proof", "risk_reversal"],
    "30s": ["objection", "risk_reversal"],
    "60s": [],
    "2-3m": [],
    "5-10m": [],
    "10m": [],
};
