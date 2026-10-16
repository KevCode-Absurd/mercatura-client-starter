export interface Beat {
    what: string;
    at: [
        number,
        number
    ];
}
export interface FounderIdea {
    id: string;
    week: number;
    name: string;
    opens: string;
    best_for: string;
    beats?: Beat[];
    like?: "frustration_origin" | "credential" | "against_the_grain" | "vulnerability" | "process_reveal";
    needs: string;
}
export const FOUNDER_IDEAS: FounderIdea[] = [
    { id: "origin", week: 1, name: "The origin story", opens: "I started [brand] because I was frustrated with [problem]...", best_for: "Brand awareness, top of funnel", beats: [{ what: "The problem you lived", at: [0, 10] }, { what: "Why what existed failed you", at: [10, 20] }, { what: "The moment it clicked", at: [20, 30] }, { what: "What you built", at: [30, 40] }, { what: "A soft close", at: [40, 45] }], needs: "" },
    { id: "why_product", week: 2, name: "Why I made this product", opens: "Everyone asked why I made [product]. Here's the real reason...", best_for: "Product launches, middle of funnel", like: "frustration_origin", needs: "" },
    { id: "hardest_lesson", week: 3, name: "The hardest lesson", opens: "This mistake almost killed my business...", best_for: "Building trust, showing vulnerability", beats: [{ what: "The setup", at: [0, 10] }, { what: "What went wrong", at: [10, 25] }, { what: "What it cost", at: [25, 35] }, { what: "The lesson", at: [35, 45] }], needs: "A real mistake, with its real numbers." },
    { id: "behind_scenes", week: 4, name: "Behind the scenes", opens: "Ever wonder how we make [product]? Let me show you...", best_for: "Building trust, justifying price, education", like: "process_reveal", needs: "Somewhere real to film: where it is made, packed or tested." },
    { id: "day_in_life", week: 5, name: "A day in my life", opens: "Here's what running [brand] actually looks like...", best_for: "Personal connection, showing it is real", needs: "A real working day to film." },
    { id: "misconception", week: 6, name: "A common misconception", opens: "Everyone thinks [misconception]. Here's the truth...", best_for: "Education, establishing expertise", like: "against_the_grain", needs: "What is said to be true is something the brand's facts support." },
    { id: "customer_story", week: 7, name: "A customer's story, retold", opens: "A customer sent me this message and I had to share...", best_for: "Social proof, emotional connection", needs: "A real message from a real customer, with their say to share it. It is read out as they wrote it." },
    { id: "unpopular_opinion", week: 8, name: "An unpopular opinion", opens: "Hot take: [an opinion about the industry]", best_for: "Engagement, standing out, sparking debate", like: "against_the_grain", needs: "An opinion the founder really holds. About a kind of product, never a named one." },
    { id: "wish_i_knew", week: 9, name: "What I wish I knew", opens: "If I could go back and tell myself one thing before starting...", best_for: "Relatability, credibility", like: "vulnerability", needs: "" },
    { id: "why_different", week: 10, name: "Why we're different", opens: "Here's why [brand] isn't like other [kind of product]...", best_for: "Differentiation, positioning", like: "against_the_grain", needs: "A difference that is true of the brand, said about a kind of product, never a named competitor." },
];
export const founderIdea = (id: string | null | undefined) => FOUNDER_IDEAS.find((i) => i.id === id);
export const PLAN_WEEKS = FOUNDER_IDEAS.length;
export const IDEA_STATUSES = ["todo", "briefed", "filmed", "posted"] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];
export const IDEA_STATUS_LABEL: Record<IdeaStatus, string> = { todo: "Not started", briefed: "Brief written", filmed: "Filmed", posted: "Posted" };
export const SHOOT_PIECES = [
    { id: "full", what: "The full video", where: "Reels and TikTok" },
    { id: "teaser", what: "The first 15 seconds", where: "A story, as a teaser" },
    { id: "excerpt", what: "A passage of the transcript", where: "A text post" },
    { id: "quotes", what: "The key lines", where: "Image posts" },
    { id: "email", what: "The whole transcript", where: "An email" },
    { id: "making_of", what: "The shoot itself, behind the scenes", where: "A second video" },
] as const;
export const SHOOT_RULES = ["A phone, facing a window, in a quiet room with a plain background.", "Talk to 1 person, for about 60 seconds.", "3 takes, without watching between them. Pick the best.", "Film each opening 5 ways: the first take is never the best.", "Look at the lens. Speak a fifth faster than feels natural.", "45 to 60 seconds. Imperfect and posted beats perfect and unposted."] as const;
export const ORGANIC_FORMATS: {
    group: string;
    formats: {
        name: string;
        what: string;
    }[];
}[] = [
    { group: "The founding story", formats: [{ name: "The origin story, as a series", what: "Weekly episodes of the journey, each ending on what comes next." }, { name: "Day 1 against day 1,000", what: "Where it started, and where it is now." }, { name: "Why we almost quit", what: "The hard stretch, told plainly." }] },
    { group: "A show", formats: [{ name: "A travel series", what: "The brand on the road, filmed on a phone." }, { name: "Customer spotlights", what: "Real customers are the content, with their say." }, { name: "The making of", what: "The factory, the checks, the design." }] },
    { group: "Teaching", formats: [{ name: "Industry hot takes", what: "A position the founder really holds." }, { name: "Myth busters", what: "3 things people get wrong about the category." }, { name: "Compare and contrast", what: "This kind of product against the usual way." }] },
    { group: "Quick wins", formats: [{ name: "Product hacks", what: "Uses buyers found that the brand did not plan." }, { name: "Packing orders", what: "Quiet, close, satisfying. Builds trust." }, { name: "Meet the team", what: "The people who make it." }] },
    { group: "To get replies", formats: [{ name: "This or that", what: "A choice between 2. People comment their pick." }, { name: "Answering your messages", what: "A question a buyer really sent, answered on camera." }, { name: "Reposting customers", what: "What customers posted, shared with their say." }] },
];
export const SOFT_CLOSES = ["A question with 2 answers, for the comments.", "\"Yay or nay?\"", "What next week's video is about.", "\"Save this for later.\"", "A reply to a comment a viewer really left."] as const;
export const COMMENTARY_SHAPE: Beat[] = [
    { what: "A flat claim that makes them stop", at: [0, 3] },
    { what: "The setup: how it got this way", at: [3, 15] },
    { what: "The tension: what that costs", at: [15, 35] },
    { what: "The turn: what to do with it", at: [35, 50] },
    { what: "A question for the comments", at: [50, 60] },
];
export const beatsLength = (beats: Beat[]) => Math.max(0, ...beats.map((b) => b.at[1]));
export function ideaNote(idea: FounderIdea, likeBeats: {
    what: string;
    seconds: number;
}[] = []): string {
    const own = idea.beats?.map((b) => `${b.what} (${b.at[0]} to ${b.at[1]} s)`);
    const borrowed = !own && likeBeats.length ? likeBeats.filter((b) => !/call to action/i.test(b.what)).map((b) => `${b.what} (${b.seconds} s)`) : [];
    return [
        `ORGANIC FOUNDER VIDEO, week ${idea.week} of ${PLAN_WEEKS}: ${idea.name}. Best for: ${idea.best_for.toLowerCase()}.`,
        `It opens in the founder's own words on this shape (a way in, not a line to copy): "${idea.opens}"`,
        own ? `Beats: ${own.join("; ")}.` : borrowed.length ? `Beats, as a guide: ${borrowed.join("; ")}.` : "No fixed beats: 1 thing told well, in 45 to 60 seconds.",
        idea.needs ? `It needs: ${idea.needs} What the brand's material does not hold is a prompt in square brackets for the founder to answer on camera.` : "A fact the brand's material does not hold is a prompt in square brackets for the founder to answer on camera.",
        "This is an organic post, not an ad: no price, no offer, no discount, no \"link in bio\" as the point of it. Close softly: a question for the comments, or what next week's video is about.",
        "When useful for this selected video's purpose, choose one supported content job: explain a material/ingredient, show official use/care, answer a real customer question, show verified sourcing/process, tell a true founder/team moment, or help choose between actual products. Do not add unrelated beats or change this idea's identity. Customer stories need a real source and agreed use; unexpected uses need official compatibility checked first. No invented facts, results, stock or customer experience.",
        `For the shoot, in the notes: ${SHOOT_RULES[1]} ${SHOOT_RULES[2]} Then the 6 pieces it is cut into: ${SHOOT_PIECES.map((p) => p.what.toLowerCase()).join(", ")}.`,
    ].join(" ");
}
