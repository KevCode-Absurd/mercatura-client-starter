export const LOOKS = ["brand", "between", "reference", "new"] as const;
export type Look = (typeof LOOKS)[number];
export const PRODUCT_STOPS = ["none", "scene", "clear", "hero"] as const;
export type ProductStop = (typeof PRODUCT_STOPS)[number];
export const STYLING_STOPS = ["none", "basics", "full"] as const;
export type Styling = (typeof STYLING_STOPS)[number];
export const SELL_STOPS = ["soft", "balanced", "direct"] as const;
export type Sell = (typeof SELL_STOPS)[number];
export const WORDS_STOPS = ["none", "headline", "full"] as const;
export type WordsOnPicture = (typeof WORDS_STOPS)[number];
export const FINISH_STOPS = ["phone", "brand", "studio"] as const;
export type Finish = (typeof FINISH_STOPS)[number];
export const SPREAD_STOPS = ["openings", "angles", "free"] as const;
export type Spread = (typeof SPREAD_STOPS)[number];
export const LENGTH_STOPS = ["short", "standard", "long"] as const;
export type CopyLength = (typeof LENGTH_STOPS)[number];
export const PACE_STOPS = ["calm", "normal", "fast"] as const;
export type Pace = (typeof PACE_STOPS)[number];
export const PEOPLE_STOPS = ["clay", "illustrated", "photo"] as const;
export type People = (typeof PEOPLE_STOPS)[number];
export const HOOK_STOPS = ["device", "promise", "free"] as const;
export type HookFreedom = (typeof HOOK_STOPS)[number];
export interface FullTaste {
    look: Look;
    product: ProductStop;
    styling: Styling;
    sell: Sell;
    words: WordsOnPicture;
    finish: Finish;
    spread: Spread;
    length: CopyLength;
    pace: Pace;
    people: People;
    hooks: HookFreedom;
}
export type Taste = Partial<FullTaste>;
export type LeverKey = keyof FullTaste;
export const LEVER_KEYS: LeverKey[] = ["look", "product", "styling", "sell", "words", "finish", "spread", "length", "pace", "people", "hooks"];
export const MAIN_LEVERS: LeverKey[] = ["look", "product", "styling"];
export const LEVER_STOPS: {
    [K in LeverKey]: readonly FullTaste[K][];
} = {
    look: LOOKS,
    product: PRODUCT_STOPS,
    styling: STYLING_STOPS,
    sell: SELL_STOPS,
    words: WORDS_STOPS,
    finish: FINISH_STOPS,
    spread: SPREAD_STOPS,
    length: LENGTH_STOPS,
    pace: PACE_STOPS,
    people: PEOPLE_STOPS,
    hooks: HOOK_STOPS,
};
export const SURFACES = ["script", "hooks", "caption", "landing", "image_ad", "native_ad", "sprint_ad", "carousel", "pdp", "photoshoot", "storyboard", "shot_plan", "cast"] as const;
export type Surface = (typeof SURFACES)[number];
export type Medium = "words" | "picture" | "video";
export const STAGES = ["unaware", "problem_aware", "solution_aware", "product_aware", "most_aware"] as const;
export type Stage = (typeof STAGES)[number];
export interface UseCase {
    surface: Surface;
    stage?: Stage | string | null;
    format?: string | null;
    hasReference?: boolean;
    hasBrandRefs?: boolean;
    productHasPhoto?: boolean;
    keepWords?: boolean;
    fromScript?: boolean;
}
export type ProductPhotoRole = "none" | "present" | "exact" | "hero";
export type ReferenceText = "none" | "function" | "detailed" | "beats" | "words";
export type BrandLookText = "none" | "colours_fonts" | "full";
export type VoiceText = "basics" | "full" | "own_ads";
export type FactsText = "none" | "core" | "standard" | "full";
export type CustomerWordsText = "none" | "few" | "full";
export type OfferText = "none" | "light" | "full";
export type SiblingsText = "none" | "body" | "briefs";
export type PictureWords = "none" | "headline" | "full";
export type HookAnchor = "none" | "device" | "promise";
export type WordsFrom = "brand" | "script";
export interface ContextPlan {
    useCase: UseCase;
    taste: FullTaste;
    attach: {
        referenceImage: boolean;
        brandDesignedImages: number;
        pastAds: number;
        productPhotos: ProductPhotoRole;
        logo: boolean;
    };
    text: {
        referenceDescription: ReferenceText;
        brandLook: BrandLookText;
        voice: VoiceText;
        facts: FactsText;
        customerWords: CustomerWordsText;
        offer: OfferText;
        siblings: SiblingsText;
        pictureWords: PictureWords;
        hookAnchor: HookAnchor;
        wordsFrom: WordsFrom;
    };
    skillPath: string[];
    temperature: number;
    notes: string[];
    warnings: string[];
}
