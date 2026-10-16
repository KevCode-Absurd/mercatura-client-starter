import { skillTitle } from "../skills/titles";
import type { AwarenessStage } from "../taxonomy";
import type { MakeFormat } from "./types";
export type SkillGroup = "pictures" | "scripts" | "ads" | "video" | "plans" | "checks" | "brand";
export const SKILL_GROUPS: {
    id: SkillGroup;
    label: string;
}[] = [
    { id: "pictures", label: "Pictures" },
    { id: "scripts", label: "Scripts" },
    { id: "ads", label: "Ads from a script" },
    { id: "video", label: "Video" },
    { id: "plans", label: "Plans, pages and offers" },
    { id: "checks", label: "Audits" },
    { id: "brand", label: "The brand" },
];
export type SkillNeed = "product" | "persona" | "stage" | "offer" | "reference" | "link";
export type SkillMake = {
    tool: "make_images";
    kind: "image_ads" | "product_page" | "photoshoot";
    format: string;
    onReference?: boolean;
} | {
    tool: "write_scripts";
    start: "research" | "native" | "indirect" | "structure" | "principles" | "exact";
} | {
    tool: "make_from_script";
    format: MakeFormat;
} | {
    tool: "write_hooks";
} | {
    tool: "build_offers";
    set?: boolean;
} | {
    tool: "plan_sprint";
} | {
    tool: "audit_page";
} | {
    tool: "audit_gaps";
} | {
    tool: "print_guide";
} | {
    tool: "founder_questions";
} | {
    tool: "draft_page";
    kind?: "pdp" | "listicle" | "advertorial";
} | {
    tool: "transpose_script";
} | {
    tool: "list_angles";
} | {
    tool: "list_hooks";
} | {
    tool: "organic_plan";
} | {
    tool: "video_editor";
    mode: "organic" | "ad";
};
export interface SkillCall {
    skill: string;
    group: SkillGroup;
    gives: string;
    needs: SkillNeed[];
    make: SkillMake;
}
const PICTURE: SkillNeed[] = ["product"];
const SCRIPT: SkillNeed[] = ["product", "persona", "stage", "offer"];
export const SKILL_CALLS: SkillCall[] = [
    { skill: "image-ad-copy", group: "pictures", gives: "Static ads built on layouts that have worked, with your product and your words.", needs: PICTURE, make: { tool: "make_images", kind: "image_ads", format: "ad-layout" } },
    { skill: "offer-ad-bank", group: "pictures", gives: "Your offer argued 3 ways (the deal, the proof, the product), in both feed sizes, with the offer line changeable on every ad at once.", needs: ["product", "offer"], make: { tool: "make_images", kind: "image_ads", format: "ad-offer" } },
    { skill: "tof-statics", group: "pictures", gives: "Scroll-stopping ads for people who have never heard of you: 1 idea in 1 striking picture.", needs: PICTURE, make: { tool: "make_images", kind: "image_ads", format: "ad-concept" } },
    { skill: "review-ads", group: "pictures", gives: "Static ads built on 1 thing buyers keep saying, in their own words: the phrase on the picture character for character, in formats made to carry a quote.", needs: PICTURE, make: { tool: "make_images", kind: "image_ads", format: "review-ad" } },
    { skill: "recreate-winning-ads", group: "pictures", gives: "Your ad rebuilt on a reference ad you tag: its layout, your product, your words.", needs: ["product", "reference"], make: { tool: "make_images", kind: "image_ads", format: "ad-layout", onReference: true } },
    { skill: "pdp-image-factory", group: "pictures", gives: "The images a product page is built from: what it does, how it works, reviews, why it is different.", needs: PICTURE, make: { tool: "make_images", kind: "product_page", format: "pdp" } },
    { skill: "photoshoot-factory", group: "pictures", gives: "Campaign photographs of your product in proven looks: a studio hero, in hand, at home, a flat lay.", needs: PICTURE, make: { tool: "make_images", kind: "photoshoot", format: "photoshoot" } },
    { skill: "instant-photoshoot", group: "pictures", gives: "A whole shoot in 1 colour world, so every picture looks made in 1 afternoon.", needs: PICTURE, make: { tool: "make_images", kind: "photoshoot", format: "instant-photoshoot" } },
    { skill: "flash-photography", group: "pictures", gives: "Candid party pictures with the flash on: warm, mid-action, nobody looking at the camera.", needs: PICTURE, make: { tool: "make_images", kind: "photoshoot", format: "flash-photoshoot" } },
    { skill: "script-from-research", group: "scripts", gives: "Video scripts written from what your customers say, for the buyer and the stage you name.", needs: SCRIPT, make: { tool: "write_scripts", start: "research" } },
    { skill: "native-ad-copy", group: "scripts", gives: "A long first-person story that reads like a person's own post, not an ad.", needs: SCRIPT, make: { tool: "write_scripts", start: "native" } },
    { skill: "indirect-ads", group: "scripts", gives: "A native ad for people who have never heard of you: a photo of the problem with no product, a 300-word story, a click to an advertorial.", needs: SCRIPT, make: { tool: "write_scripts", start: "indirect" } },
    { skill: "format-library", group: "checks", gives: "The 7 ways a static ad argues, which of them your ads have never tried, and the 2 to test next.", needs: [], make: { tool: "audit_gaps" } },
    { skill: "organic-content", group: "plans", gives: "The founder's 10 videos, 1 a week, with where each stands and which is next; and the creators list: who posted, who is worth running as an ad.", needs: [], make: { tool: "organic_plan" } },
    { skill: "hook-bank", group: "scripts", gives: "Ways to open an ad: who to name in the first 3 seconds, shapes that fit the buyer's stage, the 5 founder hooks, gift lines in season.", needs: ["persona"], make: { tool: "list_hooks" } },
    { skill: "script-reference-structure", group: "scripts", gives: "A script on the structure of a reference ad you tag: its beats, your product and your words.", needs: ["product", "reference", "persona"], make: { tool: "write_scripts", start: "structure" } },
    { skill: "script-reference-principles", group: "scripts", gives: "A script that takes why a reference ad worked and builds its own.", needs: ["product", "reference", "persona"], make: { tool: "write_scripts", start: "principles" } },
    { skill: "ad-reference-exact", group: "scripts", gives: "The same ad as the reference you tag, kept as it is, in a new format.", needs: ["product", "reference"], make: { tool: "write_scripts", start: "exact" } },
    { skill: "script-format-static", group: "ads", gives: "A static ad that argues in words first: a script, then 1 image that carries it.", needs: SCRIPT, make: { tool: "make_from_script", format: "static-concept" } },
    { skill: "script-format-carousel", group: "ads", gives: "A carousel of 2 to 6 cards read in order, each doing 1 job.", needs: SCRIPT, make: { tool: "make_from_script", format: "carousel" } },
    { skill: "ugc-script", group: "ads", gives: "A brief a real creator can film from: the script, the shots, what to say and what not to.", needs: SCRIPT, make: { tool: "make_from_script", format: "brief" } },
    { skill: "organic-video-editing", group: "video", gives: "Edit your founder, creator or educational footage into an organic post, with trims, sound and optional captions.", needs: [], make: { tool: "video_editor", mode: "organic" } },
    { skill: "ecommerce-video-editing", group: "video", gives: "Edit your existing product or UGC clips into an ecommerce ad, with trims, sound and separate captioned exports.", needs: [], make: { tool: "video_editor", mode: "ad" } },
    { skill: "realistic-ai-ugc", group: "video", gives: "A person talking to camera with your product, the way a customer would film it.", needs: SCRIPT, make: { tool: "make_from_script", format: "ugc" } },
    { skill: "podcast-ad", group: "video", gives: "2 people at microphones in a conversation that sounds overheard.", needs: SCRIPT, make: { tool: "make_from_script", format: "podcast" } },
    { skill: "talking-object-ad", group: "video", gives: "An object from the buyer's life gets a face and says what it has watched.", needs: SCRIPT, make: { tool: "make_from_script", format: "talking-object" } },
    { skill: "claymation-ads", group: "video", gives: "A narrated clay story about 1 small character. Good for a mechanism nobody can see.", needs: SCRIPT, make: { tool: "make_from_script", format: "claymation" } },
    { skill: "comic-book-ad", group: "video", gives: "A comic page filmed on an artist's desk and read panel by panel.", needs: SCRIPT, make: { tool: "make_from_script", format: "comic" } },
    { skill: "zack-d-films-ads", group: "video", gives: "A narrated mini-documentary in rendered 3D: how something works inside the body or a machine.", needs: SCRIPT, make: { tool: "make_from_script", format: "explainer" } },
    { skill: "ai-satisfying-hooks", group: "video", gives: "4 wordless seconds in which the product does 1 motion that resolves, then its 1 action shown and said.", needs: SCRIPT, make: { tool: "make_from_script", format: "demo" } },
    { skill: "cinematic-3d-animation", group: "video", gives: "A short animated film that looks like a frame from a 3D feature, lit like a photograph.", needs: SCRIPT, make: { tool: "make_from_script", format: "cinematic-3d" } },
    { skill: "claymation-animation", group: "video", gives: "A narrated story in a whole miniature clay world with a cast, in 1 of 4 clay looks.", needs: SCRIPT, make: { tool: "make_from_script", format: "clay-world" } },
    { skill: "wool-crochet-animation", group: "video", gives: "A narrated story in a miniature world knitted from yarn.", needs: SCRIPT, make: { tool: "make_from_script", format: "wool" } },
    { skill: "paper-animation", group: "video", gives: "A narrated story in a world of cut, layered or folded paper.", needs: SCRIPT, make: { tool: "make_from_script", format: "paper" } },
    { skill: "watercolor-animation", group: "video", gives: "A narrated story painted in watercolour, where the paint itself moves.", needs: SCRIPT, make: { tool: "make_from_script", format: "watercolor" } },
    { skill: "anime-comic-animation", group: "video", gives: "A drawn, animated ad with 1 original hero: a transformation, a reveal, the old way against the new.", needs: SCRIPT, make: { tool: "make_from_script", format: "anime" } },
    { skill: "skeleton-ads", group: "video", gives: "A narrated journey that answers what happens if you do 1 thing every day, Day 1 to Day 365, lived by 1 friendly cartoon skeleton.", needs: SCRIPT, make: { tool: "make_from_script", format: "skeleton" } },
    { skill: "motion-graphics-animation", group: "video", gives: "Moving type, diagrams, icons and product cutouts in the brand's colours.", needs: SCRIPT, make: { tool: "make_from_script", format: "motion-graphics" } },
    { skill: "editorial-collage-animation", group: "video", gives: "1 argument explained fast with paper cutouts, product photos, arrows and labels over a narration.", needs: SCRIPT, make: { tool: "make_from_script", format: "collage" } },
    { skill: "song-style-ad", group: "video", gives: "The lyric of an original song about what the buyer gets, and the animated pictures cut to it. The song is made in a music tool.", needs: SCRIPT, make: { tool: "make_from_script", format: "song" } },
    { skill: "ai-ugc-hooks", group: "video", gives: "New openings for a video ad that already works, each a 5 second clip to cut onto its front.", needs: ["reference"], make: { tool: "write_hooks" } },
    { skill: "script-transpose", group: "scripts", gives: "The same script told in another person and tense (\"you, now\" or \"I, back then\"), nothing else changed.", needs: [], make: { tool: "transpose_script" } },
    { skill: "generate-50", group: "plans", gives: "A plan for a sprint of different static ads: the angles, the mix and an idea for every slot, to approve before any brief is written.", needs: ["product"], make: { tool: "plan_sprint" } },
    { skill: "landing-pages", group: "plans", gives: "A landing page the ad can send people to: hero, proof, offer, guarantee, FAQ, drafted from the brand's own facts.", needs: ["product", "persona", "offer"], make: { tool: "draft_page" } },
    { skill: "advertorial-page", group: "plans", gives: "An advertorial for cold traffic: a headline under 1 of 4 formulas, a lede that never names the product, 5 reasons from the buyers' most frequent doubts, proof after reasons 2 and 4, a real FAQ, a 2-card buy box.", needs: ["product", "persona"], make: { tool: "draft_page", kind: "advertorial" } },
    { skill: "offer-building", group: "plans", gives: "Offer drafts built on the brand's numbers and its customers' words, each passed through the 7 failure checks.", needs: [], make: { tool: "build_offers" } },
    { skill: "review-mining", group: "plans", gives: "The angle library read out of every customer source: what buyers say most, the phrase verbatim with its source id, what the site never says, the doubts.", needs: [], make: { tool: "list_angles" } },
    { skill: "offer-set", group: "plans", gives: "The short list of offers the script builder ticks from: running deals first, then 1 for each buyer and stage.", needs: [], make: { tool: "build_offers", set: true } },
    { skill: "cro-audit", group: "checks", gives: "A page read on a phone and checked for clarity, proof, offer, friction and truth, with the fixes ranked.", needs: ["link"], make: { tool: "audit_page" } },
    { skill: "strategic-audit", group: "checks", gives: "Where the account's ads are thin: awareness stages, buyers, formats and offers nothing speaks to, and the winners to vary.", needs: [], make: { tool: "audit_gaps" } },
    { skill: "brand-guide", group: "brand", gives: "The printable brand guide and its tokens, rebuilt from the brand brain as it stands today.", needs: [], make: { tool: "print_guide" } },
    { skill: "founder-interview", group: "brand", gives: "Where the founder interview stands, and the next questions only the founder can answer.", needs: [], make: { tool: "founder_questions" } },
];
export const skillCall = (skill: string | null | undefined) => (skill ? SKILL_CALLS.find((c) => c.skill === skill) : undefined);
export const callName = (c: SkillCall) => skillTitle(c.skill);
export const NEED_WORDS: Record<SkillNeed, string> = { product: "Product", persona: "Who", stage: "Stage", offer: "Offer", reference: "Reference", link: "Page link" };
export function linkIn(text: string): string | null {
    const m = /\bhttps?:\/\/[^\s<>"')\]]+/i.exec(text) ?? /\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s<>"')\]]*)?/i.exec(text);
    if (!m)
        return null;
    const raw = m[0].replace(/[.,;:!?]+$/, "");
    if (!/^https?:/i.test(raw) && !/\.(com|co|io|shop|store|net|org|uk|de|fr|es|it|nl|au|ca|us|app|ai)\b/i.test(raw))
        return null;
    return /^https?:/i.test(raw) ? raw : `https://${raw}`;
}
export const STAGE_CHOICES: {
    id: AwarenessStage;
    label: string;
    hint: string;
}[] = [
    { id: "unaware", label: "Unaware", hint: "Don't know they have the problem" },
    { id: "problem_aware", label: "Problem aware", hint: "Feel the problem, don't know a fix" },
    { id: "solution_aware", label: "Solution aware", hint: "Know fixes exist, not yours" },
    { id: "product_aware", label: "Product aware", hint: "Know you, haven't bought" },
    { id: "most_aware", label: "Most aware", hint: "Ready, or have bought before" },
];
