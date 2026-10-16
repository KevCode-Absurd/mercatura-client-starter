import type { Taste } from "../taste/types";
import type { AwarenessStage, LengthPreset } from "../taxonomy";
export interface Angle {
    id: string;
    name: string;
    line: string;
    persona_ids: string[];
    stages: AwarenessStage[];
    basis: string;
    notes: string;
    created_at: string;
    updated_at: string;
}
export interface CustomFormat {
    id: string;
    name: string;
    how: string;
    base: string;
}
export interface BuilderFormat {
    id: string;
    name: string;
    medium: string;
    note: string;
    custom: boolean;
    stages: AwarenessStage[];
}
export interface Combo {
    product_id: string;
    stage: AwarenessStage;
    persona_id: string;
    angle_id: string;
    offer_id: string;
    format_id: string;
    note?: string;
}
export { NO_OFFER } from "../choices";
export const NO_OFFER_STAGES: AwarenessStage[] = ["unaware"];
export const PICTURE_WORDS = ["without", "with", "both"] as const;
export type PictureWords = (typeof PICTURE_WORDS)[number];
export const MAX_TEXTS = 3;
export const MAX_PICTURES = 4;
export interface OfferFit {
    offer_id: string;
    say: string;
    persona_ids: string[];
    stages: AwarenessStage[];
    running: boolean;
    needs: string;
    why: string;
}
export type Chosen = Record<string, number>;
export interface BuilderPick {
    products: Chosen;
    stages: Chosen;
    personas: Chosen;
    angles: Chosen;
    offers: Chosen;
    formats: Chosen;
    count: number;
    texts: number;
    pictures: number;
    words: PictureWords;
    notes?: string;
    research: boolean;
    hooks?: number;
    length?: LengthPreset;
    variety?: number;
    taste?: Taste;
    rows?: Combo[];
}
export const FORMAT_STAGES: Record<string, AwarenessStage[]> = {
    native: ["unaware", "problem_aware"],
    "native-cold": ["unaware", "problem_aware"],
    "long-copy": ["unaware", "problem_aware"],
    "advertorial-static": ["unaware", "problem_aware"],
    claymation: ["unaware", "problem_aware"],
    "talking-object": ["unaware", "problem_aware"],
    podcast: ["problem_aware", "solution_aware"],
    comic: ["problem_aware", "solution_aware"],
    explainer: ["solution_aware", "product_aware"],
    carousel: ["solution_aware", "product_aware"],
    satisfying: ["solution_aware", "product_aware"],
    "brief-founder": ["solution_aware", "product_aware"],
    "cinematic-3d": ["unaware", "problem_aware"],
    "clay-world": ["unaware", "problem_aware"],
    wool: ["unaware", "problem_aware"],
    paper: ["unaware", "problem_aware"],
    watercolor: ["unaware", "problem_aware"],
    skeleton: ["unaware", "problem_aware"],
    song: ["unaware", "problem_aware"],
    anime: ["problem_aware", "solution_aware"],
    collage: ["problem_aware", "solution_aware"],
    "motion-graphics": ["solution_aware", "product_aware"],
    "brief-editor": ["unaware", "problem_aware"],
    static: ["product_aware", "most_aware"],
};
export interface ScriptKit {
    run: string;
    product?: string;
    angle: string;
    offer?: string;
    format: string;
    want: {
        primary_text: boolean;
        image_prompts: boolean;
        images?: boolean;
        texts?: number;
        pictures?: number;
        words?: PictureWords;
    };
    asked?: string;
    no_offer?: boolean;
    primary_text?: string;
    headline?: string;
    review?: "rejected";
    hook_texts?: {
        hook_id: string;
        first_line: string;
        headline: string;
    }[];
    variety?: number;
    terms?: string;
    checked?: {
        changed: number;
        found: string[];
        facts?: {
            where: string;
            quote: string;
            held: string;
            verdict: "held" | "stretched" | "invented" | "scene";
        }[];
    };
    taste?: Taste;
    more_texts?: {
        primary_text: string;
        headline: string;
    }[];
    more_headlines?: string[];
    image_prompts?: {
        title: string;
        prompt: string;
        words?: string;
        type?: string;
        file?: string;
        words_file?: string;
    }[];
    error?: string;
}
export const MAX_SCRIPTS = 60;
export const IMAGES_PER_SCRIPT = 2;
