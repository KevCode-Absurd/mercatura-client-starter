import { speechPace } from "../pace";
import { aboutLength, secondsForWords, type SpeakerAge } from "../script-metrics";
import { LENGTH_LABELS, LENGTH_SECONDS, type AwarenessStage, type LengthPreset } from "../taxonomy";
export const PRIMARY_WORDS: Record<AwarenessStage, [
    number,
    number
]> = {
    unaware: [800, 2000],
    problem_aware: [700, 1000],
    solution_aware: [200, 400],
    product_aware: [100, 220],
    most_aware: [50, 130],
};
export const SCRIPT_WORDS: Record<AwarenessStage, [
    number,
    number
]> = {
    unaware: [350, 2500],
    problem_aware: [250, 2000],
    solution_aware: [150, 300],
    product_aware: [100, 220],
    most_aware: [60, 130],
};
export const isStoryStage = (stage: AwarenessStage | null | undefined): boolean => stage === "unaware" || stage === "problem_aware";
const STAGE_NAME: Record<AwarenessStage, string> = { unaware: "unaware", problem_aware: "problem aware", solution_aware: "solution aware", product_aware: "product aware", most_aware: "most aware" };
export const stageName = (stage: AwarenessStage) => STAGE_NAME[stage];
const HOW: Record<AwarenessStage, string> = {
    unaware: "This buyer does not know they have a problem to solve, so the copy is the story of it. Open inside 1 real moment of 1 person's day. Stay with that person: what goes wrong, what it costs them, the small ways they have rearranged their life around it, what they tried and why it did not last. Then what is really going on, said the way a friend would explain it. The product is not named, shown or hinted at until the last fifth, and then it arrives as the next thing this person did, in 2 or 3 plain sentences, with 1 fact and where to look. No list of what is in it.",
    problem_aware: "This buyer knows the problem and has not found what fixes it. Tell the problem as they live it: the moment it bites, what they do to get round it, what they have already tried and why each let them down. Make it worse before it gets better: what it costs them if nothing changes. Then the kind of answer that works and why, and only after that the product, as the bridge from where they are to where they want to be. The product is not named in the first two thirds.",
    solution_aware: "This buyer knows the kind of answer and is choosing between them. Open on what the other answers ask of them, then say how this one differs and what that changes in their day. 1 proof they can check. A clear next step.",
    product_aware: "This buyer knows the product and has not bought. Answer the 1 doubt that stopped them, with proof that is bigger than the doubt, then what they get and what happens if it is not for them.",
    most_aware: "This buyer is ready and waiting for a reason. Say the deal as a sentence a person would say: what they get, what it costs, why now, what happens if they do not like it. Nothing else.",
};
export function primaryLengthText(stage: AwarenessStage): string {
    const [lo, hi] = PRIMARY_WORDS[stage];
    return [
        `Length of the primary text: ${lo.toLocaleString("en-US")} to ${hi.toLocaleString("en-US")} words, for a ${STAGE_NAME[stage]} buyer. A range, not a target: write until the story is told and stop. This range wins over any other length given with this request, and over the length of the brand's own ads: those show how the brand's sentences sound, not how long this one runs.`,
        HOW[stage],
        isStoryStage(stage)
            ? "It is told the way a person tells a friend what happened: whole sentences, paragraphs of 2 to 5 sentences that each lead into the next, a short sentence now and then where the story turns. It is never a list, never a row of 1-line paragraphs, and never the same point said again in other words."
            : "Whole sentences a person would say. No row of fragments, no list of counts in place of a reason.",
    ].join("\n");
}
export const primaryLengthsLine = (): string => (Object.keys(PRIMARY_WORDS) as AwarenessStage[]).map((s) => `${STAGE_NAME[s]} ${PRIMARY_WORDS[s][0].toLocaleString("en-US")} to ${PRIMARY_WORDS[s][1].toLocaleString("en-US")} words`).join("; ");
export const termsByStageLine = (terms: string[] = []): string => `Technical terms follow each ad's stage. Unaware and problem aware: none, not an ingredient name, a lab word or a category term; say what the thing does in the buyer's own words, and say a fact that is worded technically in plain words. Solution aware: 1 or 2 at most, each followed by what it does for the buyer. Product aware and most aware: the category's own terms are welcome where they are how this buyer compares products, each beside what it does for them.${terms.length ? ` The brand records these as terms its buyers use: ${terms.join(", ")}.` : ""}`;
const HEADLINE: Record<AwarenessStage, string> = {
    unaware: "A feed headline for an unaware buyer is their own moment or thought, in their words. It does not name the product, the brand, the pack or unit it comes in, an ingredient, a price or an offer, and it does not hint that something is for sale.",
    problem_aware: "A feed headline for a problem aware buyer names the problem as they live it, or what could be different. It names no product and no brand, and states no price and no offer.",
    solution_aware: "A feed headline for a solution aware buyer may name the kind of answer this is and what is different about it.",
    product_aware: "A feed headline for a product aware buyer may name the product and state its proof, its price or its offer: whichever answers the doubt that stopped them.",
    most_aware: "A feed headline for a most aware buyer may say all of it plainly: the product, its proof, its price and its offer.",
};
export const headlineRule = (stage: AwarenessStage | null | undefined): string => (stage ? HEADLINE[stage] : "");
export const headlinesByStageLine = (): string => "Feed headlines follow each ad's stage. Unaware: the buyer's own moment or thought, in their words, with no product, brand, pack, ingredient, price or offer in it and no hint that something is for sale. Problem aware: the problem as they live it, or what could be different, with no product, brand, price or offer. Solution aware: the kind of answer and what is different about it. Product aware and most aware: the product, its proof, its price and its offer are welcome.";
export const CHOSEN_SPREAD = 0.15;
const runsLong = (length: LengthPreset): boolean => LENGTH_SECONDS[length] > 60;
export const lengthWords = (length: LengthPreset, age?: SpeakerAge): number => Math.round((LENGTH_SECONDS[length] * Math.round(speechPace(age, { long: runsLong(length) }).rate * 10)) / 10);
export function chosenWords(length: LengthPreset, age?: SpeakerAge): [
    number,
    number
] {
    const target = lengthWords(length, age);
    return [Math.round(target * (1 - CHOSEN_SPREAD)), Math.round(target * (1 + CHOSEN_SPREAD))];
}
export const chosenLength = (axes: {
    length?: string;
    length_chosen?: boolean;
} | null | undefined): LengthPreset | null => (axes?.length_chosen && axes.length && axes.length in LENGTH_SECONDS ? (axes.length as LengthPreset) : null);
export const shortForStory = (stage: AwarenessStage, chosen: LengthPreset | null | undefined, age?: SpeakerAge): boolean => !!chosen && isStoryStage(stage) && chosenWords(chosen, age)[1] < SCRIPT_WORDS[stage][0];
export function scriptLengthText(stage: AwarenessStage, chosen?: LengthPreset | null, age?: SpeakerAge): string {
    if (chosen) {
        const [lo, hi] = chosenWords(chosen, age);
        const usual = SCRIPT_WORDS[stage];
        const shape = shortForStory(stage, chosen, age)
            ? " At this length, tell 1 moment, not the whole history: 1 scene of this person's life with the problem, held to the end."
            : lo > usual[1]
                ? " That is longer than this buyer is usually told: fill it with more of the story and the proof, never by saying a point twice."
                : "";
        return `${lo.toLocaleString("en-US")} to ${hi.toLocaleString("en-US")} spoken words: the person making this ad chose ${LENGTH_LABELS[chosen]} for it. A chosen length wins over the usual length for a ${STAGE_NAME[stage]} buyer, and over the length of the brand's own ads: those show how the brand's sentences sound, not how long this one runs. Stay inside the range.${shape}`;
    }
    const [lo, hi] = SCRIPT_WORDS[stage];
    return `${lo.toLocaleString("en-US")} to ${hi.toLocaleString("en-US")} spoken words for a ${STAGE_NAME[stage]} buyer. A range, never a target${isStoryStage(stage) ? ": the top of it is there for an ad that has a whole story to tell, and a short format still runs short" : ""}.`;
}
const CLIP_SECONDS = 10;
const planned = (words: number, age: SpeakerAge): string => {
    const s = secondsForWords(words, age);
    return aboutLength(s < 60 ? s : Math.round(s / 5) * 5);
};
export const sharedAge = (ages: SpeakerAge[]): string | null => (ages.length && new Set(ages.map((a) => speechPace(a).band)).size === 1 ? (ages[0] ?? null) : null);
export function lengthReadout(chosen: LengthPreset | null | undefined, stages: AwarenessStage[] = [], age?: SpeakerAge): string {
    if (chosen) {
        const words = lengthWords(chosen, age);
        const clips = Math.max(1, Math.ceil(LENGTH_SECONDS[chosen] / CLIP_SECONDS));
        return `${aboutLength(LENGTH_SECONDS[chosen])} · about ${(Math.round(words / 10) * 10).toLocaleString("en-US")} words · ${clips} ${clips === 1 ? "clip" : "clips"} of up to ${CLIP_SECONDS} seconds`;
    }
    const known = [...new Set(stages)].filter((s) => SCRIPT_WORDS[s]);
    if (!known.length)
        return "As long as the buyer needs. Choose who the script is for to see about how long that is.";
    const lo = Math.min(...known.map((s) => SCRIPT_WORDS[s][0]));
    const hi = Math.max(...known.map((s) => SCRIPT_WORDS[s][1]));
    return `${planned(lo, age)} to ${planned(hi, age)} ${known.length === 1 ? "for this buyer" : "across these buyers, each as long as theirs needs"}`;
}
export function termsRule(stage: AwarenessStage | null | undefined, terms: string[] = []): string {
    const known = terms.length ? ` (the brand records these as terms its buyers use: ${terms.join(", ")})` : "";
    if (!stage)
        return terms.length ? `Terms this audience really uses and you may keep: ${terms.join(", ")}. Any other technical term is replaced by plain words.` : "No technical terms: say what it does in plain words.";
    if (isStoryStage(stage))
        return `Technical terms: none. A ${STAGE_NAME[stage]} buyer has no word yet for what is in the product, so an ingredient name, a lab word or a category term means nothing to them${known ? `, even the brand's own${known}` : ""}. Say what the thing does, in the words they use for their own life. A word the customers themselves say in the research is theirs and may stay. Where a fact you are given is worded technically, say it plainly: the fact is held, its wording is not.`;
    if (stage === "solution_aware")
        return `Technical terms: 1 or 2 at most, and only a term this buyer has already met while looking for an answer${known}. Each is followed by what it does for them.`;
    return `Technical terms: welcome where they are how this buyer compares products${known}. Use the category's own words for what is in it and how it is tested, each one beside what it does for them, and never a run of them in 1 sentence.`;
}
