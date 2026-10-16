export const CUSTOMER_SOURCES = ["call", "ticket", "review", "survey", "community"] as const;
export const BRAND_SOURCES = ["website", "founder"] as const;
export const SOURCE_TYPES = [...CUSTOMER_SOURCES, ...BRAND_SOURCES] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];
export type CustomerSource = (typeof CUSTOMER_SOURCES)[number];
export const isBrandSource = (t: string): t is (typeof BRAND_SOURCES)[number] => (BRAND_SOURCES as readonly string[]).includes(t);
export const SOURCE_INFO: Record<SourceType, {
    label: string;
    tab: string;
    short: string;
    job: string;
    alsoYields: string;
    yield: string;
    effort: string;
}> = {
    website: {
        label: "The brand's website",
        tab: "Website",
        short: "W",
        job: "What the brand already claims in public, with the page each claim stands on. Where a claim is checked.",
        alsoYields: "product facts, proof, the offer and the guarantee as stated",
        yield: "High for claims; none for what buyers want",
        effort: "Lowest",
    },
    founder: {
        label: "Founder insights",
        tab: "Founder",
        short: "F",
        job: "What the data can't show: why the product is made as it is, what the founder hears buyers say, what was tried and dropped.",
        alsoYields: "the origin story, the enemy, objections heard first-hand",
        yield: "High",
        effort: "Low",
    },
    call: {
        label: "Call recordings",
        tab: "Calls",
        short: "C",
        job: "Final objection before purchase (\"I nearly didn't...\")",
        alsoYields: "accommodation, trigger moment, failed solution, the word",
        yield: "Very high",
        effort: "Very high",
    },
    ticket: {
        label: "Support tickets and return reasons",
        tab: "Support tickets",
        short: "T",
        job: "Failure modes, in escalating customer language. Which claims and angles cause refunds.",
        alsoYields: "pre-purchase objections (safety, shipping)",
        yield: "High",
        effort: "Very low",
    },
    review: {
        label: "Reviews",
        tab: "Reviews",
        short: "R",
        job: "The words. Exactly how buyers describe the problem and product. 2 to 4 star reviews give objections.",
        alsoYields: "proof points (\"finally\"), desire",
        yield: "High",
        effort: "Lowest",
    },
    survey: {
        label: "Post-purchase survey",
        tab: "Post-purchase survey",
        short: "S",
        job: "The moment of purchase. What tipped them this week.",
        alsoYields: "purchase drivers, near-objections",
        yield: "Medium",
        effort: "Low",
    },
    community: {
        label: "Reddit, Facebook groups, forums",
        tab: "Community",
        short: "M",
        job: "Language of people who have not bought yet. Competitor failures, category wants.",
        alsoYields: "failed solutions, accommodations, prospect vocabulary",
        yield: "Medium to low",
        effort: "Medium",
    },
};
export const BEATS = [
    "hook",
    "problem",
    "promise",
    "mechanism",
    "objection",
    "proof",
    "offer",
    "risk_reversal",
    "cta",
    "identity",
    "bridge",
    "retention",
] as const;
export type Beat = (typeof BEATS)[number];
export const INSIGHT_TYPES = [
    "accommodation",
    "failed_solution",
    "final_objection",
    "buyer_word",
    "trigger_moment",
    "failure_mode",
    "purchase_driver",
    "desire",
    "objection",
    "proof_point",
] as const;
export type InsightType = (typeof INSIGHT_TYPES)[number];
export const INSIGHT_INFO: Record<InsightType, {
    label: string;
    definition: string;
    beats: string;
    color: string;
}> = {
    accommodation: {
        label: "Accommodation",
        definition: "What they changed in their life to cope, usually without admitting it",
        beats: "problem, hook",
        color: "#0d9488",
    },
    failed_solution: {
        label: "Failed solution",
        definition: "What they tried first, what it cost, why they stopped",
        beats: "objection",
        color: "#7c3aed",
    },
    final_objection: {
        label: "Final objection",
        definition: "The last thing between them and buying (\"I nearly didn't because...\")",
        beats: "risk_reversal, offer",
        color: "#dc2626",
    },
    buyer_word: {
        label: "Buyer word",
        definition: "The noun or phrase they use for the problem",
        beats: "hook (and all lines)",
        color: "#2563eb",
    },
    trigger_moment: {
        label: "Trigger moment",
        definition: "The day or event they started looking",
        beats: "problem, urgency",
        color: "#ea580c",
    },
    failure_mode: {
        label: "Failure mode",
        definition: "Where the product or promise fails; refund reasons",
        beats: "guardrail",
        color: "#52525b",
    },
    purchase_driver: {
        label: "Purchase driver",
        definition: "What tipped the purchase (guarantee, per-day price)",
        beats: "offer, cta",
        color: "#16a34a",
    },
    desire: {
        label: "Desire",
        definition: "The underlying want, evidenced in their words",
        beats: "promise, identity",
        color: "#db2777",
    },
    objection: {
        label: "Objection",
        definition: "Any other reason not to buy, classified into 6 classes",
        beats: "objection",
        color: "#ca8a04",
    },
    proof_point: {
        label: "Proof point",
        definition: "Quotable evidence that it works",
        beats: "proof",
        color: "#0891b2",
    },
};
export const OBJECTION_CLASSES = [
    "not_for_me",
    "wont_work",
    "not_for_me_specifically",
    "not_worth_it",
    "what_if_im_wrong",
    "ill_do_it_later",
] as const;
export type ObjectionClass = (typeof OBJECTION_CLASSES)[number];
export const OBJECTION_LABELS: Record<ObjectionClass, string> = {
    not_for_me: "This isn't for me",
    wont_work: "It won't work",
    not_for_me_specifically: "It won't work for me specifically",
    not_worth_it: "It's not worth it",
    what_if_im_wrong: "What if I'm wrong?",
    ill_do_it_later: "I'll do it later",
};
export const AWARENESS_STAGES = [
    "unaware",
    "problem_aware",
    "solution_aware",
    "product_aware",
    "most_aware",
] as const;
export type AwarenessStage = (typeof AWARENESS_STAGES)[number];
export const AWARENESS_INFO: Record<AwarenessStage, {
    label: string;
    code: string;
}> = {
    unaware: { label: "Unaware", code: "UA" },
    problem_aware: { label: "Problem aware", code: "PA" },
    solution_aware: { label: "Solution aware", code: "SA" },
    product_aware: { label: "Product aware", code: "PR" },
    most_aware: { label: "Most aware", code: "MA" },
};
export const SOPHISTICATION_LABELS: Record<number, string> = {
    1: "1 · First claim",
    2: "2 · Bigger claim",
    3: "3 · Mechanism",
    4: "4 · Bigger mechanism",
    5: "5 · Identity",
};
export const OUTPUT_TYPES = [
    "human_brief_ugc",
    "human_brief_founder",
    "human_brief_editor",
    "ai_ugc",
    "ai_claymation",
    "ai_vsl",
    "ai_podcast",
    "ai_talking_object",
    "ai_comic",
    "ai_explainer",
    "ai_satisfying",
    "ai_watercolor",
    "ai_motion_graphics",
    "ai_anime",
    "ai_wool",
    "ai_skeleton",
    "ai_song",
    "ai_collage",
    "ai_paper",
    "ai_clay_world",
    "ai_cinematic_3d",
    "ai_cinematic",
    "static_image",
    "static_long_copy",
    "static_advertorial",
    "carousel",
] as const;
export type OutputType = (typeof OUTPUT_TYPES)[number];
export const OUTPUT_INFO: Record<OutputType, {
    label: string;
    madeBy: "human" | "ai";
    defaultSkill: string | null;
    short: string;
    deliverable: string;
}> = {
    human_brief_ugc: { label: "UGC creator brief", madeBy: "human", defaultSkill: null, short: "ugc", deliverable: "Creator brief (markdown and PDF)" },
    human_brief_founder: { label: "Founder brief", madeBy: "human", defaultSkill: null, short: "founder", deliverable: "Brief" },
    human_brief_editor: { label: "Editor brief", madeBy: "human", defaultSkill: null, short: "edit", deliverable: "Edit brief with beat timings and visual notes" },
    ai_ugc: { label: "AI UGC", madeBy: "ai", defaultSkill: "ai-ugc-video", short: "aiugc", deliverable: "Video file(s) + copy" },
    ai_claymation: { label: "AI claymation", madeBy: "ai", defaultSkill: "claymation-video", short: "clay", deliverable: "Video file(s) + copy" },
    ai_vsl: { label: "AI VSL", madeBy: "ai", defaultSkill: "vsl-video", short: "vsl", deliverable: "Video file(s) + copy" },
    ai_podcast: { label: "AI podcast clip", madeBy: "ai", defaultSkill: "podcast-ad", short: "podcast", deliverable: "Video file(s) + copy" },
    ai_talking_object: { label: "AI talking object", madeBy: "ai", defaultSkill: "talking-object-ad", short: "object", deliverable: "Video file(s) + copy" },
    ai_comic: { label: "AI comic", madeBy: "ai", defaultSkill: "comic-book-ad", short: "comic", deliverable: "Video file(s) + copy" },
    ai_explainer: { label: "AI CGI explainer", madeBy: "ai", defaultSkill: "zack-d-films-ads", short: "explain", deliverable: "Video file(s) + copy" },
    ai_satisfying: { label: "AI satisfying hook", madeBy: "ai", defaultSkill: "ai-satisfying-hooks", short: "hook", deliverable: "Video file(s) + copy" },
    ai_watercolor: { label: "AI watercolour", madeBy: "ai", defaultSkill: "watercolor-animation", short: "wcolour", deliverable: "Video file(s) + copy" },
    ai_motion_graphics: { label: "AI motion graphics", madeBy: "ai", defaultSkill: "motion-graphics-animation", short: "motion", deliverable: "Video file(s) + copy" },
    ai_anime: { label: "AI anime", madeBy: "ai", defaultSkill: "anime-comic-animation", short: "anime", deliverable: "Video file(s) + copy" },
    ai_wool: { label: "AI knitted wool", madeBy: "ai", defaultSkill: "wool-crochet-animation", short: "wool", deliverable: "Video file(s) + copy" },
    ai_skeleton: { label: "AI skeleton ad", madeBy: "ai", defaultSkill: "skeleton-ads", short: "skeleton", deliverable: "Video file(s) + copy" },
    ai_song: { label: "AI song ad", madeBy: "ai", defaultSkill: "song-style-ad", short: "song", deliverable: "Video file(s) + copy" },
    ai_collage: { label: "AI editorial collage", madeBy: "ai", defaultSkill: "editorial-collage-animation", short: "collage", deliverable: "Video file(s) + copy" },
    ai_paper: { label: "AI paper world", madeBy: "ai", defaultSkill: "paper-animation", short: "paper", deliverable: "Video file(s) + copy" },
    ai_clay_world: { label: "AI clay world", madeBy: "ai", defaultSkill: "claymation-animation", short: "clayworld", deliverable: "Video file(s) + copy" },
    ai_cinematic_3d: { label: "AI cinematic 3D", madeBy: "ai", defaultSkill: "cinematic-3d-animation", short: "cine3d", deliverable: "Video file(s) + copy" },
    ai_cinematic: { label: "AI cinematic film", madeBy: "ai", defaultSkill: "cinematic-ad-directing", short: "film", deliverable: "Video file(s) + copy" },
    static_image: { label: "Static image", madeBy: "ai", defaultSkill: "static-image-ads", short: "static", deliverable: "N images + primary text + headline" },
    static_long_copy: { label: "Long-copy static", madeBy: "ai", defaultSkill: "static-image-ads", short: "longcopy", deliverable: "Image + long primary text" },
    static_advertorial: { label: "Advertorial static", madeBy: "ai", defaultSkill: "advertorial-static", short: "advert", deliverable: "Image + headline + landing page outline" },
    carousel: { label: "Carousel", madeBy: "ai", defaultSkill: "carousel-ads", short: "carousel", deliverable: "3 to 10 cards + copy" },
};
export const JOB_STATUSES = ["draft", "queued", "running", "in_review", "approved", "rejected", "sent", "discarded"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
    draft: "Draft",
    queued: "Queued",
    running: "Running",
    in_review: "In review",
    approved: "Approved",
    rejected: "Rejected",
    sent: "Sent",
    discarded: "Discarded",
};
export const LENGTH_PRESETS = ["15s", "30s", "60s", "2-3m", "5-10m", "10m"] as const;
export type LengthPreset = (typeof LENGTH_PRESETS)[number];
export const LENGTH_SECONDS: Record<LengthPreset, number> = {
    "15s": 15,
    "30s": 30,
    "60s": 60,
    "2-3m": 150,
    "5-10m": 450,
    "10m": 600,
};
export const LENGTH_LABELS: Record<LengthPreset, string> = {
    "15s": "15 seconds",
    "30s": "30 seconds",
    "60s": "1 minute",
    "2-3m": "2 to 3 minutes",
    "5-10m": "5 to 10 minutes",
    "10m": "10 minutes",
};
export const STORY_SHAPES = ["none", "failed_solutions_journey", "discovery", "transformation_with_witness", "confession"] as const;
export type StoryShape = (typeof STORY_SHAPES)[number];
export const REGISTERS = ["ugc", "documentary", "diary"] as const;
export type Register = (typeof REGISTERS)[number];
export const ENTRIES = ["accommodation", "trigger_moment", "failed_solution"] as const;
export const PAIN_TYPES: InsightType[] = ["accommodation", "trigger_moment", "failed_solution", "final_objection", "objection"];
export const DESIRE_TYPES: InsightType[] = ["desire"];
export const SOURCE_PRIORITY_TYPES: Record<SourceType, InsightType[]> = {
    call: ["final_objection", "accommodation", "trigger_moment", "failed_solution", "buyer_word", "purchase_driver"],
    ticket: ["failure_mode", "final_objection", "objection"],
    review: ["buyer_word", "objection", "proof_point", "desire", "accommodation", "failed_solution"],
    survey: ["trigger_moment", "purchase_driver", "final_objection"],
    community: ["buyer_word", "failed_solution", "accommodation", "objection", "desire"],
    website: [],
    founder: ["purchase_driver", "objection", "failed_solution", "proof_point", "trigger_moment", "desire"],
};
export const TYPE_BEAT: Record<InsightType, Beat | "guardrail"> = {
    accommodation: "problem",
    failed_solution: "objection",
    final_objection: "risk_reversal",
    buyer_word: "hook",
    trigger_moment: "problem",
    failure_mode: "guardrail",
    purchase_driver: "offer",
    desire: "identity",
    objection: "objection",
    proof_point: "proof",
};
export const INTENSITY_RUBRIC: [
    number,
    string,
    string
][] = [
    [1, "Neutral mention", "It took a while to arrive."],
    [2, "Mild frustration or preference", "The capsules are a bit big."],
    [3, "Clear emotion or cost", "Feeling pretty stupid."],
    [4, "Strong emotion, money or time lost, social cost", "Tried two brands, about $180 total, nothing."],
    [5, "High stakes: shame, tears, avoidance of people or events", "I sat in the car and cried."],
];
export const humanize = (s: string) => s.replace(/_/g, " ");
export const JOBS = [
    "identity",
    "trigger",
    "failed_fix",
    "objection",
    "slow_start",
    "mechanism",
    "first_notice",
    "real_win",
    "ritual",
    "complaint",
    "villain",
    "repeat_signal",
] as const;
export type Job = (typeof JOBS)[number];
export const JOB_INFO: Record<Job, {
    n: string;
    label: string;
    sounds: string;
    earns: string;
}> = {
    identity: { n: "01", label: "The identity", sounds: "Who they were before the product arrived", earns: "Cold traffic hooks, the first welcome email" },
    trigger: { n: "02", label: "The trigger", sounds: "The season, event or moment that made them search", earns: "Seasonal campaigns, browse abandon" },
    failed_fix: { n: "03", label: "The failed fix", sounds: "What they tried first that did not work", earns: "Us-versus-them ads, comparison sections" },
    objection: { n: "04", label: "The objection", sounds: "The doubt they had before buying", earns: "Cart abandon, product page FAQ, negative qualifier ads" },
    slow_start: { n: "05", label: "The slow start", sounds: "The stretch where they thought it was not working", earns: "The first post-purchase email, refund prevention" },
    mechanism: { n: "06", label: "The mechanism", sounds: "How it works, described by feel rather than spec", earns: "Mid-funnel education, advertorial leads" },
    first_notice: { n: "07", label: "The first notice", sounds: "The exact moment they knew", earns: "Proof ads, review-led creative, subject lines" },
    real_win: { n: "08", label: "The real win", sounds: "The benefit they kept, which is rarely the one that was sold", earns: "Retargeting, winback, positioning" },
    ritual: { n: "09", label: "The ritual", sounds: "How it fits into a normal day now", earns: "Lifestyle creative, UGC scripts, SMS" },
    complaint: { n: "10", label: "The complaint", sounds: "Their honest gripe", earns: "Pre-empt ads, FAQ, the product roadmap" },
    villain: { n: "11", label: "The villain", sounds: "What it replaced and why that thing was bad", earns: "Comparison ads, strikethrough creative" },
    repeat_signal: { n: "12", label: "The repeat signal", sounds: "Why they bought again, or bought one for someone else", earns: "Cross-sell, gifting, subscription" },
};
export const TYPE_JOB: Record<InsightType, Job> = {
    accommodation: "identity",
    failed_solution: "failed_fix",
    final_objection: "objection",
    buyer_word: "identity",
    trigger_moment: "trigger",
    failure_mode: "complaint",
    purchase_driver: "mechanism",
    desire: "real_win",
    objection: "objection",
    proof_point: "first_notice",
};
export const JOB_FORMATS: {
    id: string;
    label: string;
    what: string;
    jobs: Job[];
}[] = [
    { id: "negative_qualifier", label: "Negative qualifier", what: "\"Do not buy this if...\"", jobs: ["identity", "complaint"] },
    { id: "qa_card", label: "Q and A card", what: "The doubt as a question, the buyer's line as the answer", jobs: ["objection", "slow_start"] },
    { id: "strikethrough", label: "Strikethrough correction", what: "The brand's line struck out, the buyer's line written in", jobs: ["mechanism", "villain"] },
    { id: "taped_note", label: "Taped note", what: "A handwritten line taped over a product photo", jobs: ["trigger", "real_win"] },
    { id: "poll_sticker", label: "Poll sticker", what: "Story-native, the phrase as the poll question", jobs: ["mechanism", "ritual"] },
    { id: "quote_card", label: "Quote card", what: "The phrase set large, the attribution small", jobs: ["first_notice", "real_win"] },
    { id: "side_by_side", label: "Side by side", what: "Before and after, both in their words", jobs: ["failed_fix", "villain"] },
];
