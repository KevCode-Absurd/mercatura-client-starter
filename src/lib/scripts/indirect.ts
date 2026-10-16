import { NATIVE_IMAGES } from "../script-types";
export const INDIRECT_IMAGES = ["candid-moment", "curiosity-object", "medical-imaging", "emotional-scene", "symptom-closeup", "nightmare-scenario", "hook-headline-photo", "illustration-chronicle", "annotated-photo"] as const;
export type IndirectImage = (typeof INDIRECT_IMAGES)[number];
export const isIndirectImage = (id: string | null | undefined): id is IndirectImage => (INDIRECT_IMAGES as readonly string[]).includes(id ?? "");
export const isIndirectOnly = (id: string | null | undefined) => isIndirectImage(id) && id !== "candid-moment";
export const INDIRECT_FORMAT_ID = "native-cold";
export const INDIRECT_FORMAT = { id: INDIRECT_FORMAT_ID, name: "Native ad, cold traffic", note: "For people who have never heard of you: a photo of the problem with no product, a 300-word story, a click to an advertorial" } as const;
export const INDIRECT_FORM = "indirect-story";
export const INDIRECT_LENGTH = "brief";
export const INDIRECT_LEADS = [
    { id: "story", label: "Story", what: "A specific person, a specific moment.", example: "Murphy slept at the foot of our bed for nine years." },
    { id: "warning", label: "Warning", what: "Stops them on the thing they are about to do.", example: "Before you book another cortisone shot, read this." },
    { id: "authority_reversal", label: "Authority reversal", what: "An expert who believed the usual answer until something changed. Only a real expert the brand has, on record.", example: "I told patients the same thing for 12 years." },
    { id: "confession", label: "Confession", what: "Disarms them before the pitch.", example: "I used to plan meetings around my shirts." },
    { id: "curiosity_question", label: "Curiosity question", what: "A question the reader cannot answer yet.", example: "Why does a firmer mattress almost never fix a sore back?" },
] as const;
export const INDIRECT_HEADLINES = ["Before you [thing they are about to do], read this", "Why your [problem] [keeps happening]", "It wasn't [what they blamed]. It was [the real cause].", "The reason you [behaviour they are embarrassed by]"] as const;
const PAIN_TO_IMAGE: [
    RegExp,
    IndirectImage,
    string
][] = [
    [/x-?ray|scan|mri|blood (test|work|sugar)|lab (result|test)|diagnos|the doctor|cholesterol|joint|knee|arthrit|cortisone|heart rate|sleep (study|score)|hba1c|results? came back/i, "medical-imaging", "The pain has a test. Show the test result with one red mark on it."],
    [/snor|couch|spare room|partner|marriage|relationship|lonely|confiden|the kids|bedtime|2 ?am|3 ?am|can'?t sleep|insomnia|wide awake/i, "emotional-scene", "The pain changes how people live. Show the room where you can see it changed, with nobody in frame."],
    [/\bdrain\b|clump|shedding|hair (loss|fall)|gut|bloat|stool|feet|fungus|\bgross\b|what is that|mould|mold|\bgunk\b|\bresidue\b/i, "curiosity-object", "The pain leaves a strange object behind. Show the object, close, so the thumb stops on \"what is that?\"."],
    [/skin|acne|rash|eczema|nails?|swell|redness|dark circles|wrinkle|texture|pores|psoriasis|cracked|chaf/i, "symptom-closeup", "The pain is a symptom you can see. Show the symptom, real and unflattering."],
    [/look(s|ing)? (old|tired)|aging|ageing|in every photo|surgeon|consult|lift|botox|filler|before it'?s too late|wheelchair|fall(s|ing)? over/i, "nightmare-scenario", "The pain has a feared future. Show that future staged as a real moment, not the product that avoids it."],
    [/sweat|stain|pit|chafe|underarm|shirt|bra|waistband|rub|blister|insole|slip/i, "annotated-photo", "The pain is one visible flaw. Show a real photo with a red circle or a handwritten note doing the talking."],
    [/digest|stomach|cramp|migraine|headache|back pain|nerve|inflam|hard to photograph|inside|hormon|cycle|period/i, "illustration-chronicle", "The pain is hard to photograph. Tell its story in ink panels instead."],
    [/\b(dog|cat|puppy|pet|vet)\b|supplement|capsule|gummy/i, "hook-headline-photo", "A strong headline over a real photo carries the question."],
];
export function imageForPain(pain: string): {
    image: IndirectImage;
    why: string;
} {
    const t = pain.trim();
    for (const [re, image, why] of PAIN_TO_IMAGE)
        if (t && re.test(t))
            return { image, why };
    return { image: "candid-moment", why: "A found phone photo of the buyer's life with the problem in it: the most common kind by far." };
}
export const isIndirect = (native: {
    form?: string;
} | null | undefined) => native?.form === INDIRECT_FORM;
export function indirectOptions(pain: string, opts: {
    images?: string[];
    arcs?: string[];
    narrator?: string;
    length?: string;
} = {}): {
    forms: string[];
    images: string[];
    arcs?: string[];
    narrator?: string;
    length: string;
} {
    const own = (opts.images ?? []).filter((id) => isIndirectImage(id));
    const first = imageForPain(pain).image;
    const images = own.length ? own : [first, ...INDIRECT_IMAGES.filter((i) => i !== first)];
    return { forms: [INDIRECT_FORM], images, ...(opts.arcs?.length ? { arcs: opts.arcs } : {}), ...(opts.narrator ? { narrator: opts.narrator } : {}), length: opts.length === "short" ? "short" : INDIRECT_LENGTH };
}
export function indirectControls(image: string): string {
    const label = NATIVE_IMAGES.find((i) => i.id === image);
    return `COLD-TRAFFIC (INDIRECT) AD, see <skill name="indirect-ads">. The reader has never heard of the brand and is not shopping. The image above the copy is a ${label ? `"${label.label}" (${label.summary})` : image}, with no product in it: it plants 1 question, and the first line of the copy picks that question up. 150 to 400 words. The click goes to an advertorial that teaches, never a product page: no price, no discount, no offer, and the product is hinted at, not pitched. Each hook variant is 1 of the 5 leads with its headline (\`overlay\`) in 1 of the 4 headline shapes, and \`first_frame\` is the moment the image shows. In the notes say the lead used, the question the image plants, and "Leads to: an advertorial".`;
}
export const indirectImageChoices = () => NATIVE_IMAGES.filter((i) => isIndirectImage(i.id)).map((i) => ({ id: i.id, label: i.label, summary: i.summary }));
export const INDIRECT_TESTS = [
    "The recognition test: shown to one person who has the problem, with no context, they say \"oh no, that's me\" or \"what happened?\", never \"nice photo\".",
    "The no-product test: with the product covered, the image still makes sense. The product is not in it.",
] as const;
