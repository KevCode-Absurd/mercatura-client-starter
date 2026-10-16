import type { ScriptAxes } from "@/db/schema";
import type { AwarenessStage, LengthPreset, OutputType } from "./taxonomy";
export interface ScriptType {
    id: string;
    label: string;
    summary: string;
    example: string;
    stages: AwarenessStage[];
    minLength: LengthPreset;
    voices: Pick<ScriptAxes, "person" | "tense">[];
    story_shape: string;
    entry?: ScriptAxes["entry"];
    hook_type?: string;
    freeOrder?: boolean;
}
const YOU = { person: "second", tense: "present" } as const;
const I = { person: "first", tense: "past" } as const;
const SHE = { person: "third", tense: "past" } as const;
export const SCRIPT_TYPES: ScriptType[] = [
    { id: "straight-argument", label: "Straight argument", summary: "The 9 beats in order, said directly to the viewer.", example: "You've stopped parting it in the middle. You didn't decide to do that.", stages: ["problem_aware", "solution_aware"], minLength: "15s", voices: [YOU], story_shape: "none" },
    { id: "confession", label: "Confession", summary: "A 1st-person story that starts with something they did and never told anyone.", example: "I stopped parting my hair in the middle about a year ago. I never told anyone.", stages: ["unaware", "problem_aware"], minLength: "60s", voices: [I], story_shape: "confession", entry: "accommodation", hook_type: "accommodation" },
    { id: "failed-solutions", label: "Failed solutions", summary: "The story of what they tried before, and why each half worked.", example: "I did the rosemary oil for 4 months. My pillowcase smelled. Nothing else happened.", stages: ["problem_aware", "solution_aware"], minLength: "60s", voices: [I, SHE], story_shape: "failed_solutions_journey", entry: "failed_solution", hook_type: "failed_solution" },
    { id: "discovery", label: "Discovery", summary: "Someone finds out why it happens. The mechanism told as news.", example: "Here's what I didn't know. It's not the hair. It's the follicle.", stages: ["problem_aware", "solution_aware"], minLength: "60s", voices: [I, SHE], story_shape: "discovery", hook_type: "curiosity_gap" },
    { id: "witness", label: "Someone noticed", summary: "Someone else notices the change first. Proof leads.", example: "My sister noticed before I did. That's the bit that got me.", stages: ["problem_aware"], minLength: "60s", voices: [I, SHE], story_shape: "transformation_with_witness", entry: "trigger_moment", hook_type: "moment" },
    { id: "three-things", label: "Three things", summary: "The mechanism as a short list, with a question left open.", example: "3 things slow it down. The first is the reason most people fail.", stages: ["solution_aware", "problem_aware"], minLength: "30s", voices: [YOU], story_shape: "none", hook_type: "curiosity_gap" },
    { id: "category-callout", label: "What the category gets wrong", summary: "Names the category's flaw, then shows the sharper version.", example: "Most hair supplements use it at a fifth of the dose the studies used.", stages: ["solution_aware"], minLength: "30s", voices: [YOU, { person: "third", tense: "present" }], story_shape: "none", entry: "failed_solution", hook_type: "contrarian" },
    { id: "demonstration", label: "Demonstration", summary: "Shows it working first. The argument follows the proof.", example: "Dry in 40 seconds. We timed it.", stages: ["solution_aware", "product_aware"], minLength: "15s", voices: [YOU], story_shape: "none", hook_type: "specific_proof", freeOrder: true },
    { id: "offer-first", label: "Offer first", summary: "Leads with the terms, for people who already know the product.", example: "The 90-day pack is back, and it's the last run at this price.", stages: ["product_aware", "most_aware"], minLength: "15s", voices: [YOU], story_shape: "none", freeOrder: true },
    { id: "days-in", label: "Days in", summary: "A diary entry from 1 day: where things stand after a stated number of days of use.", example: "Day 30 of the 90. Nothing to see yet, and that's on schedule.", stages: ["solution_aware", "product_aware"], minLength: "30s", voices: [YOU, { person: "third", tense: "present" }], story_shape: "none", hook_type: "curiosity_gap", freeOrder: true },
    { id: "objection-first", label: "Objection first", summary: "Says the buyer's doubt before they think it.", example: "You're going to react to this in week 1. Everyone does. That's why the first tube is weaker.", stages: ["solution_aware", "product_aware"], minLength: "30s", voices: [YOU], story_shape: "none", hook_type: "confrontation", freeOrder: true },
    { id: "timeline", label: "Timeline", summary: "What happens over time, step by step.", example: "The cycle is 90 days. Here's what each month is doing.", stages: ["problem_aware", "solution_aware"], minLength: "60s", voices: [YOU, { person: "third", tense: "present" }], story_shape: "none", hook_type: "curiosity_gap" },
    { id: "daily-routine", label: "Daily routine", summary: "The product inside an ordinary day, shown and not argued.", example: "7:10. It's next to the toothbrush, so it gets taken.", stages: ["solution_aware", "product_aware"], minLength: "30s", voices: [YOU, { person: "third", tense: "present" }], story_shape: "none", hook_type: "moment", freeOrder: true },
    { id: "how-its-made", label: "How it's made", summary: "A decision made in making the product, told by the brand.", example: "We made the first tube weaker on purpose.", stages: ["solution_aware", "product_aware"], minLength: "30s", voices: [I], story_shape: "none", hook_type: "founder_stakes", freeOrder: true },
    { id: "unaware-observation", label: "An observation", summary: "Starts from something in their life they haven't linked to a problem.", example: "The photos you don't like of yourself are usually taken from behind. There's a reason.", stages: ["unaware"], minLength: "60s", voices: [YOU, SHE], story_shape: "none", entry: "accommodation", hook_type: "curiosity_gap" },
    { id: "honest-review", label: "Honest review", summary: "Says what is not perfect and who it is not for, before what is good.", example: "It takes 90 days and it isn't cheap. If you want something by next month, this isn't it.", stages: ["product_aware", "solution_aware"], minLength: "30s", voices: [YOU, { person: "third", tense: "present" }], story_shape: "none", hook_type: "truth_bomb", freeOrder: true },
    { id: "identity-led", label: "Who they are", summary: "Leads with the kind of person the buyer is, tied to what the product does.", example: "The women who keep it are the ones who started before they could see it.", stages: ["product_aware", "most_aware", "solution_aware"], minLength: "30s", voices: [YOU, { person: "third", tense: "present" }], story_shape: "none", hook_type: "truth_bomb", freeOrder: true },
    { id: "tested-several", label: "Several, side by side", summary: "Several options of the category compared on stated criteria, this one among them.", example: "3 kinds of hair supplement and 3 things to check on the label. Start with the dose.", stages: ["solution_aware", "product_aware"], minLength: "30s", voices: [YOU, { person: "third", tense: "present" }], story_shape: "none", hook_type: "curiosity_gap", freeOrder: true },
    { id: "price-of-the-problem", label: "Price of the problem", summary: "Starts from what the problem has already cost them.", example: "You've spent more than this on 2 things that didn't work.", stages: ["problem_aware", "solution_aware"], minLength: "30s", voices: [YOU], story_shape: "none", entry: "failed_solution", hook_type: "confrontation" },
];
export const scriptType = (id: string | null | undefined) => SCRIPT_TYPES.find((t) => t.id === id) ?? null;
const LENGTH_ORDER: LengthPreset[] = ["15s", "30s", "60s", "2-3m", "5-10m", "10m"];
export const typeFitsLength = (t: ScriptType, length: LengthPreset) => LENGTH_ORDER.indexOf(length) >= LENGTH_ORDER.indexOf(t.minLength);
export const typeFitsStage = (t: ScriptType, stage: AwarenessStage) => t.stages.includes(stage);
export const EMOTIONS = [
    { id: "fear-of-loss", label: "Fear of loss", summary: "What is being lost while they wait. Quiet and exact." },
    { id: "frustration", label: "Frustration", summary: "Fed up with what they've tried." },
    { id: "matter-of-fact", label: "Matter of fact", summary: "Calm and plain. The facts carry it." },
    { id: "relief", label: "Relief", summary: "The weight coming off. \"Finally.\"" },
    { id: "transformation", label: "Transformation", summary: "Who they become and what opens up." },
    { id: "joy", label: "Joy", summary: "Light, playful, pleased." },
    { id: "pride", label: "Pride", summary: "The kind of person who does this." },
] as const;
export type EmotionId = (typeof EMOTIONS)[number]["id"];
export const emotionLabel = (id: string | null | undefined) => EMOTIONS.find((e) => e.id === id)?.label ?? "";
export const FORMAT_SKILL: Record<OutputType, string> = {
    human_brief_ugc: "script-format-ugc",
    ai_ugc: "script-format-ugc",
    human_brief_founder: "script-format-founder",
    human_brief_editor: "script-format-vsl",
    ai_vsl: "script-format-vsl",
    ai_claymation: "script-format-claymation",
    ai_podcast: "script-format-podcast",
    ai_talking_object: "script-format-talking-object",
    ai_comic: "script-format-comic",
    ai_explainer: "script-format-explainer",
    ai_satisfying: "script-format-satisfying",
    ai_watercolor: "script-format-watercolor",
    ai_motion_graphics: "script-format-motion-graphics",
    ai_anime: "script-format-anime",
    ai_wool: "script-format-wool",
    ai_skeleton: "script-format-skeleton",
    ai_song: "script-format-song",
    ai_collage: "script-format-collage",
    ai_paper: "script-format-paper",
    ai_clay_world: "script-format-clay-world",
    ai_cinematic_3d: "script-format-cinematic-3d",
    ai_cinematic: "script-format-cinematic",
    static_image: "script-format-static",
    static_long_copy: "script-format-long-copy-static",
    static_advertorial: "script-format-advertorial",
    carousel: "script-format-carousel",
};
export const NATIVE_ARCS = [
    { id: "the-searcher", label: "The searcher", summary: "Kept looking after everything failed, and found why." },
    { id: "exhausted-surrender", label: "Exhausted surrender", summary: "Had given up. The answer found them." },
    { id: "self-blamer", label: "The self-blamer", summary: "Thought they were the problem. They weren't." },
    { id: "quietly-angry", label: "Quietly angry", summary: "Sold big promises that delivered little." },
    { id: "reluctant-believer", label: "Reluctant believer", summary: "Didn't want to hope again. Glad to be wrong." },
] as const;
export const NATIVE_IMAGES = [
    { id: "candid-moment", label: "Candid moment", summary: "A phone photo of a moment from their day with the problem.", words: false },
    { id: "worn-object", label: "Worn object", summary: "The flattened cushion, the half-used tub: evidence of what failed.", words: false },
    { id: "notes-app", label: "Notes app", summary: "A screenshot of a note typed to themselves.", words: true },
    { id: "handwritten-note", label: "Handwritten note", summary: "A few lines in pen on paper.", words: true },
    { id: "sticky-note", label: "Sticky note", summary: "A reminder stuck on the fridge, mirror or monitor.", words: true },
    { id: "phone-reminder", label: "Phone reminder", summary: "The reminders and alarms they keep snoozing.", words: true },
    { id: "text-bubbles", label: "Text bubbles", summary: "A short message thread: someone else noticing.", words: true },
    { id: "whatsapp-chat", label: "Group chat", summary: "A family or friends chat where the problem comes up.", words: true },
    { id: "breaking-news", label: "News bulletin", summary: "A bulletin-style caption with a true, surprising fact.", words: true },
    { id: "one-star-review", label: "One-star review", summary: "A 1-star review that turns out to be praise.", words: true },
    { id: "dont-buy-this", label: "Don't buy this", summary: "A blunt warning that becomes the argument.", words: true },
    { id: "abstract-curiosity", label: "Abstract curiosity", summary: "An odd image that only the story explains.", words: false },
    { id: "curiosity-object", label: "Curiosity object", summary: "A strange object the problem leaves behind: \"what is that?\"", words: false },
    { id: "medical-imaging", label: "Test result", summary: "An X-ray, scan or lab sheet with one red mark.", words: false },
    { id: "emotional-scene", label: "Emotional scene", summary: "The room where the problem changed how they live. Nobody in it.", words: false },
    { id: "symptom-closeup", label: "Symptom close-up", summary: "The symptom, real and unflattering, in the routine where it shows.", words: false },
    { id: "nightmare-scenario", label: "Feared future", summary: "The next step they are afraid of, as one quiet real object.", words: false },
    { id: "hook-headline-photo", label: "Headline over a photo", summary: "One advertorial headline over a candid photo.", words: true },
    { id: "illustration-chronicle", label: "Drawn panels", summary: "The problem's story in ink panels, for a pain a camera can't show.", words: false },
    { id: "annotated-photo", label: "Annotated photo", summary: "A plain photo with one red circle or a 4-word handwritten note.", words: true },
] as const;
export const NATIVE_NARRATORS = [
    { id: "customer", label: "A customer", summary: "1st person, a composite of real customer accounts." },
    { id: "founder", label: "The founder", summary: "1st person, why it was made. Real process facts only." },
    { id: "expert", label: "A named expert", summary: "1st person as a real professional the brand has. Name and credentials are never invented." },
    { id: "observer", label: "An observer", summary: "3rd or 2nd person. No personal result is claimed." },
] as const;
export const NATIVE_FORMS = [
    { id: "personal-journey", label: "Personal journey", summary: "Their own history with the problem, to the day it changed.", lengths: ["standard", "long"] },
    { id: "mistake-confession", label: "The mistake I was making", summary: "They were doing something they thought was right.", lengths: ["standard", "long"] },
    { id: "letter-about-someone", label: "A letter about someone", summary: "About a friend or parent they watched struggle.", lengths: ["standard", "long"] },
    { id: "stop-doing-this", label: "Please stop doing this", summary: "Tells the reader to stop the usual fix, then says why.", lengths: ["short", "standard"] },
    { id: "rant", label: "A rant", summary: "Anger at the advice everyone gives, in very short lines.", lengths: ["short", "standard"] },
    { id: "short-review", label: "A short review", summary: "Reads like a detailed review someone posted.", lengths: ["short"] },
    { id: "forum-post", label: "A forum post", summary: "A long post to people with the same problem, with an EDIT.", lengths: ["long"] },
    { id: "statistic-and-family", label: "A number, then a family story", summary: "A real, sourced fact, then what happened to someone they love.", lengths: ["long"] },
    { id: "expert-voice", label: "An expert's voice", summary: "A real professional explains what is usually missed.", lengths: ["standard", "long"] },
    { id: "indirect-story", label: "Cold-traffic story", summary: "Picks up the question the image asked, answers it as a story, sends them to a page that teaches.", lengths: ["brief", "short"] },
] as const;
export const NATIVE_LENGTHS = [
    { id: "brief", label: "Brief (a quick read)", words: 300 },
    { id: "short", label: "Short (a few paragraphs)", words: 600 },
    { id: "standard", label: "Standard (the whole story)", words: 1200 },
    { id: "long", label: "Long (the whole story, in detail)", words: 2500 },
] as const;
export const nativeWords = (length: string | null | undefined) => NATIVE_LENGTHS.find((l) => l.id === length)?.words ?? 1200;
export const nativeForm = (id: string | null | undefined) => NATIVE_FORMS.find((a) => a.id === id) ?? null;
export const nativeArc = (id: string | null | undefined) => NATIVE_ARCS.find((a) => a.id === id) ?? null;
export const nativeImage = (id: string | null | undefined) => NATIVE_IMAGES.find((a) => a.id === id) ?? null;
