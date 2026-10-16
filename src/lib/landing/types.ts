export const PAGE_KINDS = ["pdp", "listicle", "advertorial"] as const;
export type PageKind = (typeof PAGE_KINDS)[number];
export const KIND_LABEL: Record<PageKind, {
    label: string;
    one: string;
    for: string;
}> = {
    pdp: { label: "Product landing page", one: "Hero with the buy box, value props, proof, offer, guarantee, FAQ", for: "Product aware and ready to buy" },
    listicle: { label: "Listicle", one: "N reasons why, each with proof, then the offer", for: "Solution aware, comparing options" },
    advertorial: { label: "Advertorial", one: "A story: hook, problem, mechanism, objections, proof, risk reversal, CTA", for: "Unaware or problem aware, cold traffic from long video" },
};
export const FORMULAS = ["switch", "gift", "revelation", "alternative"] as const;
export type Formula = (typeof FORMULAS)[number];
export const FORMULA_INFO: Record<Formula, {
    label: string;
    template: string;
    when: string;
}> = {
    switch: { label: "The switch", template: "Why [audience] may choose [product] for [supported differentiator]", when: "There is a sourced old way and a relevant new option" },
    gift: { label: "The gift", template: "What makes [product] useful for [occasion]", when: "The supplied brief supports the gifting purpose" },
    revelation: { label: "The explanation", template: "How [product] addresses [specific problem]", when: "The mechanism and its limits are supported" },
    alternative: { label: "The alternative", template: "Comparing [product] with [old category] for [buying task]", when: "There are matched criteria for a fair comparison" },
};
export const ADVERTORIAL_MEASURES = [
    "Scroll depth to reason 3: whether the headline and the lede earned the read.",
    "Click-through to the product page: whether the reasons and the proof did their job.",
    "Conversion of that traffic against traffic sent straight to the product page: the value of the page.",
    "Average order value of advertorial traffic: whether the buy box earned the bigger order.",
    "Judge on revenue per visitor, not conversion rate alone: a page that raises the order value can look flat on conversion and still be the better page.",
];
export function kindForAwareness(awareness: string | null | undefined): PageKind {
    if (awareness === "unaware" || awareness === "problem_aware")
        return "advertorial";
    if (awareness === "solution_aware")
        return "listicle";
    return "pdp";
}
export const BUCKETS = ["what-it-does", "benefits-list", "benefit-deep-dive", "how-it-works", "reviews-ugc", "before-after", "what-makes-us-different", "whats-included", "feature-callouts", "top-testimonial", "guarantee", "occasions", "product-shot"] as const;
export type Bucket = (typeof BUCKETS)[number];
export const BUCKET_LABEL: Record<Bucket, string> = {
    "what-it-does": "What it does",
    "benefits-list": "Benefits at a glance",
    "benefit-deep-dive": "Why it works",
    "how-it-works": "How it works",
    "reviews-ugc": "Reviews and customer photos",
    "before-after": "Before and after",
    "what-makes-us-different": "What makes us different",
    "whats-included": "What's included",
    "feature-callouts": "Feature callouts",
    "top-testimonial": "Best testimonial",
    guarantee: "Guarantee",
    occasions: "Who it's for and when",
    "product-shot": "Product photo",
};
export interface ImageSlot {
    src: string;
    alt: string;
    bucket: Bucket;
}
export interface Quote {
    text: string;
    who: string;
    source: "research" | "documents" | "person";
    ref?: string;
}
export interface BuyOption {
    label: string;
    offer_id: string | null;
    price: number;
    compare_at: number | null;
    per_day: number | null;
    note: string;
    badge: string;
    preferred?: boolean;
    includes?: {
        item: string;
        value: number | null;
    }[];
}
interface Base {
    id: string;
    on: boolean;
}
export type Section = (Base & {
    type: "announcement";
    text: string;
}) | (Base & {
    type: "hero";
    eyebrow: string;
    headline: string;
    subhead: string;
    bullets: string[];
    proof_line: string;
    price_line: string;
    why_now: string;
    cta: string;
    risk_line: string;
    options: BuyOption[];
    images: ImageSlot[];
}) | (Base & {
    type: "benefits";
    title: string;
    items: string[];
}) | (Base & {
    type: "problem";
    headline: string;
    greeting: string;
    questions: string[];
    empathy: string;
    agitate: string[];
    solve: string;
}) | (Base & {
    type: "story";
    headline: string;
    paragraphs: string[];
    image: ImageSlot;
}) | (Base & {
    type: "value_prop";
    eyebrow: string;
    headline: string;
    body: string;
    points: string[];
    image: ImageSlot;
    cta: string;
}) | (Base & {
    type: "reasons";
    headline: string;
    items: {
        title: string;
        body: string;
        quote: Quote | null;
        image: ImageSlot;
    }[];
}) | (Base & {
    type: "how_it_works";
    headline: string;
    steps: {
        title: string;
        body: string;
    }[];
}) | (Base & {
    type: "differentiators";
    headline: string;
    items: {
        title: string;
        body: string;
    }[];
}) | (Base & {
    type: "comparison";
    headline: string;
    us: string;
    them: string;
    rows: {
        label: string;
        us: string;
        them: string;
    }[];
}) | (Base & {
    type: "reviews";
    headline: string;
    rating_line: string;
    quotes: Quote[];
}) | (Base & {
    type: "offer";
    headline: string;
    body: string;
    options: BuyOption[];
    includes: string[];
    cta: string;
    risk_line: string;
    image: ImageSlot;
}) | (Base & {
    type: "guarantee";
    headline: string;
    body: string;
    cta: string;
}) | (Base & {
    type: "faq";
    headline: string;
    items: {
        q: string;
        a: string;
    }[];
}) | (Base & {
    type: "final_cta";
    headline: string;
    body: string;
    cta: string;
    risk_line: string;
    image: ImageSlot;
}) | (Base & {
    type: "sticky_cta";
    text: string;
    cta: string;
});
export type SectionType = Section["type"];
export const SECTION_LABEL: Record<SectionType, string> = {
    announcement: "Announcement bar",
    hero: "Hero (above the fold)",
    benefits: "Benefit strip",
    problem: "Problem, agitate, solve",
    story: "Story",
    value_prop: "Value prop (what's in it for me)",
    reasons: "Reasons why",
    how_it_works: "How it works",
    differentiators: "What makes it different",
    comparison: "Comparison",
    reviews: "Customer proof",
    offer: "Offer",
    guarantee: "Guarantee",
    faq: "FAQ (objections)",
    final_cta: "Final call to action",
    sticky_cta: "Sticky button (mobile)",
};
export const SECTION_AREA: Record<SectionType, "clarity" | "copy" | "offer" | "proof" | "friction"> = {
    announcement: "offer",
    hero: "clarity",
    benefits: "copy",
    problem: "copy",
    story: "copy",
    value_prop: "copy",
    reasons: "copy",
    how_it_works: "copy",
    differentiators: "copy",
    comparison: "copy",
    reviews: "proof",
    offer: "offer",
    guarantee: "friction",
    faq: "copy",
    final_cta: "friction",
    sticky_cta: "friction",
};
export interface Brief {
    omitOffer?: boolean;
    taskBrief?: Pick<import("./quality-types").QualityBrief, "task" | "structure" | "buyerQuestion" | "trafficContext">;
    promise: string;
    angle: string;
    awareness: string;
    audience: {
        label: string;
        age: string;
        gender: string;
    } | null;
    rating: {
        value: number;
        count: string;
    } | null;
    cta_url: string;
    notes: string;
    formula?: Formula | null;
    headlines?: {
        formula: Formula;
        text: string;
    }[];
    taste?: import("../taste/types").Taste;
}
export interface AdSnapshot {
    id: string;
    origin: AdOrigin;
    title: string;
    headline: string;
    primary_text: string;
    hooks: string[];
    angle: string;
    persona_id: string | null;
    awareness: string;
    product_id: string | null;
    offer_id: string | null;
    image: string | null;
    insights: AdInsights | null;
}
export type AdOrigin = "studio" | "script" | "account";
export const ORIGIN_LABEL: Record<AdOrigin, string> = { studio: "Static ad from Creative Studio", script: "Video script from Creative Studio", account: "Running in the ad account" };
export interface AdInsights {
    simulated: boolean;
    period: string;
    spend: number;
    impressions: number;
    ctr: number;
    cpc: number;
    hook_rate: number | null;
    lp_views: number;
    cvr: number;
    purchases: number;
    cpa: number;
    roas: number;
    aov: number;
    breakdown: {
        age: string;
        gender: string;
        spend: number;
        purchases: number;
        roas: number;
        cpa: number;
    }[];
    best: {
        label: string;
        age: string;
        gender: string;
        why: string;
    };
    verdict: "scale" | "watch" | "cut";
}
export type PageStatus = "draft" | "review" | "approved" | "published";
export const STATUS_LABEL: Record<PageStatus, string> = { draft: "Draft", review: "In review", approved: "Approved", published: "Published" };
export type SourceKind = "scratch" | "ad" | "persona" | "url" | "variant";
export const SOURCE_LABEL: Record<SourceKind, string> = { scratch: "From scratch", ad: "For an ad", persona: "For a persona", url: "From an existing page", variant: "Variant" };
export interface CheckResult {
    id: string;
    area: "clarity" | "copy" | "offer" | "proof" | "friction" | "truth";
    status: "pass" | "warn" | "fail" | "na";
    label: string;
    message: string;
    fix: string;
    ice: number;
}
export const AREA_ORDER = ["clarity", "copy", "offer", "proof", "friction", "truth"] as const;
export const AREA_LABEL: Record<(typeof AREA_ORDER)[number], string> = { clarity: "Clarity and hierarchy", copy: "Copy", offer: "Offer", proof: "Proof", friction: "Friction", truth: "Truth" };
