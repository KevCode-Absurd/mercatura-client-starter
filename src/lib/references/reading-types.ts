import { CATALOGUE } from "../catalogue";
import { FORMAT_LOOKS } from "../format-media";
import type { LengthPreset, OutputType } from "../taxonomy";
export const CLOSENESS = ["recreate", "keep", "loose"] as const;
export type Closeness = (typeof CLOSENESS)[number];
export const CLOSENESS_DEFAULT: Closeness = "keep";
export const CLOSENESS_INFO: Record<Closeness, {
    label: string;
    line: string;
    look: "reference" | "between" | "brand";
    image: string;
    idea: string;
    video: string;
}> = {
    recreate: {
        label: "Recreate it for my brand",
        line: "The same ad, rebuilt part by part for your brand.",
        look: "reference",
        image: "The picture itself is sent. The layout, camera and light are kept; the product, words, colours and fonts become yours.",
        idea: "The ad is described in full, and the still stays as close to its idea, its hook and its argument as a still can.",
        video: "The ad is read step by step: what happens, and what each step does for the buyer. Each step is then redone with what does that job for your brand. A step that does not fit your brand is changed or dropped.",
    },
    keep: {
        label: "Keep what makes it work",
        line: "What made it work, in your brand's own look and order.",
        look: "between",
        image: "The layout is read and described zone by zone. The look is your brand's own.",
        idea: "Its idea, its hook and the way it persuades are described. The layout is one that suits your product.",
        video: "Why it worked, its best parts and what was weak are sent. Its order of steps is not: the script is built your own way.",
    },
    loose: {
        label: "Loose inspiration",
        line: "Only the idea of the ad. Everything else is yours.",
        look: "brand",
        image: "Only what kind of ad it is and why it works are sent, with your own past ads as the look.",
        idea: "Only why it worked is described. The still is your own.",
        video: "Only the idea of the ad is sent. The script is written from your own research.",
    },
};
export interface RefPart {
    at: string;
    part: string;
    why: string;
}
export interface RefReading {
    at: string;
    model: string;
    summary: string;
    best: RefPart[];
    weak: RefPart[];
}
export interface FormatPick {
    id: string;
    why: string;
}
export interface RefFormats {
    at: string;
    picks: FormatPick[];
}
export type RefFormatHow = "reference" | "idea" | "look" | "script";
export interface RefFormat {
    id: string;
    medium: "image" | "video";
    label: string;
    when: string;
    how: RefFormatHow;
    look?: string;
    type?: OutputType;
    recipe?: string;
    lengths?: LengthPreset[];
}
export const AS_REFERENCE = "as-reference";
export const FROM_IDEA = "from-idea";
export function referenceFormats(ref: {
    kind: string;
    pictureHere: boolean;
}): RefFormat[] {
    const onPicture = ref.kind === "image" && ref.pictureHere;
    const statics: RefFormat[] = [
        onPicture
            ? { id: AS_REFERENCE, medium: "image", label: "Static ad built on this one", when: "The fastest way to your own version: this ad's layout, rebuilt with your product and words.", how: "reference" }
            : { id: FROM_IDEA, medium: "image", label: "Static ad from its idea", when: "The idea of this ad as a still, on a layout that has worked for brands like yours.", how: "idea" },
        ...FORMAT_LOOKS.filter((f) => f.id !== "founder").map((f): RefFormat => ({ id: `look:${f.id}`, medium: "image", label: `${f.label} still`, when: f.what, how: "look", look: f.id })),
    ];
    const scripts = CATALOGUE.filter((f) => f.start.how === "script" && (f.medium === "video" || f.id === "carousel")).map((f): RefFormat => {
        const start = f.start as {
            how: "script";
            type: OutputType;
            recipe: string;
            lengths: LengthPreset[];
        };
        return { id: f.id, medium: f.medium === "video" ? "video" : "image", label: f.label, when: f.when, how: "script", type: start.type, recipe: start.recipe, lengths: start.lengths };
    });
    return [...statics, ...scripts];
}
export const refFormat = (formats: RefFormat[], id: string | null | undefined) => formats.find((f) => f.id === id);
export function suggestedFor(formats: RefFormat[], picks: FormatPick[] | undefined, medium: "image" | "video"): (RefFormat & {
    why: string;
})[] {
    return (picks ?? []).flatMap((p) => {
        const f = refFormat(formats, p.id);
        return f && f.medium === medium ? [{ ...f, why: p.why }] : [];
    });
}
export const firstFormat = (formats: RefFormat[], picks: FormatPick[] | undefined, medium: "image" | "video"): RefFormat | undefined => suggestedFor(formats, picks, medium)[0] ?? formats.find((f) => f.medium === medium);
export const MAX_STATICS = 6;
export const MAX_VIDEOS = 3;
export const STATIC_SIZES = ["4:5", "1:1", "9:16"] as const;
export const VIDEO_SIZES = ["9:16", "1:1", "16:9"] as const;
export interface MakeFromReference {
    referenceId: string;
    closeness: Closeness;
    productId: string;
    personaId: string;
    offerId: string;
    stage: string;
    note: string;
    statics?: {
        formatId: string;
        count: number;
        sizes: string[];
        productInPicture?: "auto" | "none" | "background" | "shown";
    };
    videos?: {
        formatId: string;
        count: number;
        size: string;
        length?: LengthPreset;
        hooks?: number;
        keepWords?: boolean;
    };
    claimChecks?: boolean;
}
export interface MadeFromReference {
    sets: string[];
    scripts: number;
    said: string[];
}
