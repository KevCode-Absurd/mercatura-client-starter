import type { AgeBand, Gender } from "../audience";
import type { AwarenessStage, LengthPreset, OutputType } from "../taxonomy";
import type { EvidenceReview, PerformanceEvidence } from "./evidence";
export interface AccountAd {
    id: string;
    name: string;
    format: string;
    awareness: AwarenessStage;
    sophistication: number;
    persona_id: string | null;
    offer_id: string | null;
    angle: string;
    hook: string;
    spend: number;
    purchases: number;
    revenue: number;
    days: number;
    status: "active" | "paused";
    hook_rate?: number | null;
    hold_rate?: number | null;
    creative_tags?: {
        concept?: string;
        visual?: string;
        hook_type?: string;
    };
}
export interface AudienceCell {
    age: AgeBand;
    gender: Gender;
    spend: number;
    purchases: number;
    revenue: number;
    buyers_share: number;
}
export interface AccountRead {
    simulated: boolean;
    period: string;
    source: string;
    currency: string;
    market: {
        stage: number;
        basis: string;
    };
    audience: AudienceCell[];
    ads: AccountAd[];
    performance_evidence?: PerformanceEvidence;
}
export interface CoveragePersona {
    id: string;
    name: string;
    age: string;
    gender: string;
    awareness: AwarenessStage | null;
    offer_id: string | null;
    angle: string;
    hooks: string[];
    share: number | null;
}
export interface InWork {
    awareness: AwarenessStage;
    sophistication: number;
    persona_id: string;
    format: string | null;
}
export interface CoverageInput {
    account: AccountRead;
    personas: CoveragePersona[];
    offers: {
        id: string;
        name: string;
    }[];
    inWork: InWork[];
}
export const DIMENSIONS = ["awareness", "sophistication", "format", "persona", "audience", "offer"] as const;
export type Dimension = (typeof DIMENSIONS)[number];
export const DIMENSION_INFO: Record<Dimension, {
    label: string;
    asks: string;
}> = {
    awareness: { label: "Awareness", asks: "How much the buyer already knows when the ad reaches them" },
    sophistication: { label: "Market sophistication", asks: "How the ads argue, against how tired the market is of claims" },
    format: { label: "Formats", asks: "Which kinds of ad have run" },
    persona: { label: "Buyers", asks: "Which of your buyers an ad speaks to" },
    audience: { label: "Age and gender", asks: "Who the money reaches, against who buys" },
    offer: { label: "Offers", asks: "Which offers the ads carry" },
};
export type CellState = "ok" | "thin" | "missing" | "past";
export interface Cell {
    key: string;
    label: string;
    ads: number;
    spend: number;
    spend_share: number;
    revenue: number;
    roas: number | null;
    in_work: number;
    buyers_share?: number;
    state: CellState;
    note: string;
}
export interface Gap {
    id: string;
    dimension: Dimension;
    key: string;
    label: string;
    why: string;
    weight: number;
}
export interface Winner {
    ad: AccountAd;
    roas: number;
    times: number;
    spend_share: number;
}
export interface Fix {
    ad: AccountAd;
    part: "opening" | "body";
    hook_rate: number;
    hold_rate: number;
    spend_share: number;
    why: string;
}
export interface Coverage {
    totals: {
        ads: number;
        active: number;
        spend: number;
        revenue: number;
        roas: number | null;
    };
    cold_share: number | null;
    write_at: number[];
    dims: Record<Dimension, Cell[]>;
    gaps: Gap[];
    winners: Winner[];
    fixes: Fix[];
    evidence_review?: EvidenceReview;
}
export interface ScriptBrief {
    id: string;
    source: "gap" | "winner" | "fix";
    part?: "opening" | "body";
    from_ad?: string;
    changes?: string;
    persona_id: string;
    awareness: AwarenessStage;
    sophistication: number;
    format: string;
    length: LengthPreset;
    offer_id: string | null;
    angle: string;
    hook?: string;
    fills: string[];
    why: string[];
}
const UA: AwarenessStage = "unaware";
const PA: AwarenessStage = "problem_aware";
const SA: AwarenessStage = "solution_aware";
const PR: AwarenessStage = "product_aware";
const MA: AwarenessStage = "most_aware";
export interface CoverageFormat {
    id: string;
    label: string;
    medium: "image" | "video";
    write: string | null;
    screen?: string;
    stages: AwarenessStage[];
    argues: number[];
}
export const COVERAGE_FORMATS: CoverageFormat[] = [
    { id: "static", label: "Static image ad", medium: "image", write: "static", stages: [SA, PR, MA], argues: [1, 2, 3, 4] },
    { id: "ad-concept", label: "Concept static", medium: "image", write: null, screen: "ad-concept", stages: [UA, PA], argues: [3, 5] },
    { id: "carousel", label: "Carousel", medium: "image", write: "carousel", stages: [PA, SA, PR], argues: [3, 4] },
    { id: "long-copy", label: "Long-copy static", medium: "image", write: "long-copy", stages: [UA, PA], argues: [3, 5] },
    { id: "advertorial-static", label: "Advertorial static", medium: "image", write: "advertorial-static", stages: [UA, PA], argues: [3, 4] },
    { id: "native", label: "Native ad", medium: "image", write: null, screen: "native", stages: [UA, PA], argues: [5] },
    { id: "ugc", label: "UGC video", medium: "video", write: "ugc", stages: [PA, SA, PR], argues: [2, 3, 5] },
    { id: "founder", label: "Founder video", medium: "video", write: "brief-founder", stages: [SA, PR], argues: [4, 5] },
    { id: "podcast", label: "Podcast clip", medium: "video", write: "podcast", stages: [UA, PA, SA], argues: [3, 5] },
    { id: "talking-object", label: "Talking object", medium: "video", write: "talking-object", stages: [UA, PA], argues: [5] },
    { id: "claymation", label: "Claymation story", medium: "video", write: "claymation", stages: [UA, PA, SA], argues: [3] },
    { id: "comic", label: "Comic", medium: "video", write: "comic", stages: [PA, SA], argues: [2, 3] },
    { id: "explainer", label: "CGI explainer", medium: "video", write: "explainer", stages: [PA, SA, PR], argues: [3, 4] },
    { id: "satisfying", label: "Satisfying hook and demo", medium: "video", write: "satisfying", stages: [SA, PR, MA], argues: [1, 2] },
    { id: "cinematic-3d", label: "Cinematic 3D film", medium: "video", write: "cinematic-3d", stages: [UA, PA, SA], argues: [3, 5] },
    { id: "cinematic", label: "Cinematic film", medium: "video", write: "cinematic", stages: [UA, PA, SA], argues: [3, 5] },
    { id: "clay-world", label: "Clay world", medium: "video", write: "clay-world", stages: [UA, PA, SA], argues: [3, 5] },
    { id: "wool", label: "Knitted wool world", medium: "video", write: "wool", stages: [UA, PA, SA], argues: [3, 5] },
    { id: "paper", label: "Paper world", medium: "video", write: "paper", stages: [UA, PA, SA], argues: [3, 5] },
    { id: "watercolor", label: "Watercolour story", medium: "video", write: "watercolor", stages: [UA, PA, SA], argues: [3, 5] },
    { id: "anime", label: "Anime", medium: "video", write: "anime", stages: [PA, SA], argues: [2, 3, 5] },
    { id: "skeleton", label: "Skeleton: what happens if", medium: "video", write: "skeleton", stages: [UA, PA], argues: [2, 3] },
    { id: "motion-graphics", label: "Motion graphics", medium: "video", write: "motion-graphics", stages: [SA, PR, MA], argues: [1, 2, 3, 4] },
    { id: "collage", label: "Editorial collage explainer", medium: "video", write: "collage", stages: [PA, SA, PR], argues: [3, 4] },
    { id: "song", label: "Song ad", medium: "video", write: "song", stages: [UA, PA], argues: [1, 5] },
    { id: "edited", label: "Edited longer video", medium: "video", write: "brief-editor", stages: [UA, PA, SA], argues: [3, 4] },
];
export const coverageFormat = (id: string | null | undefined) => COVERAGE_FORMATS.find((f) => f.id === id) ?? null;
export const ARGUES: Record<number, {
    label: string;
    write: string;
}> = {
    1: { label: "A plain claim", write: "Say what it does." },
    2: { label: "A bigger claim", write: "Say it does more, faster or better than the rest." },
    3: { label: "A mechanism", write: "Say why it works: the cause of the problem and what the product does about it." },
    4: { label: "A sharper mechanism", write: "Say why this mechanism beats the others, with proof and specifics." },
    5: { label: "Identity", write: "Say who the buyer is and becomes. The product is what that kind of person uses." },
};
export const THIN_SHARE = 0.05;
export const THIN_ARGUE = 0.1;
export const UNDERSERVED = 0.05;
export const BUYERS_FLOOR = 0.02;
export const WINNER_TIMES = 1.3;
export const WINNER_SHARE = 0.015;
export const WINNERS_SHOWN = 6;
export const HOOK_STRONG = 0.3;
export const HOOK_WEAK = 0.2;
export const HOLD_STRONG = 0.25;
export const HOLD_WEAK = 0.15;
export const FIX_SHARE = 0.01;
export const FIXES_SHOWN = 4;
export const OUTPUT_FORMAT: Record<OutputType, string> = {
    human_brief_ugc: "ugc",
    ai_ugc: "ugc",
    human_brief_founder: "founder",
    human_brief_editor: "edited",
    ai_vsl: "edited",
    ai_claymation: "claymation",
    ai_podcast: "podcast",
    ai_talking_object: "talking-object",
    ai_comic: "comic",
    ai_explainer: "explainer",
    ai_satisfying: "satisfying",
    ai_watercolor: "watercolor",
    ai_motion_graphics: "motion-graphics",
    ai_anime: "anime",
    ai_wool: "wool",
    ai_skeleton: "skeleton",
    ai_song: "song",
    ai_collage: "collage",
    ai_paper: "paper",
    ai_clay_world: "clay-world",
    ai_cinematic_3d: "cinematic-3d",
    ai_cinematic: "cinematic",
    static_image: "static",
    static_long_copy: "long-copy",
    static_advertorial: "advertorial-static",
    carousel: "carousel",
};
