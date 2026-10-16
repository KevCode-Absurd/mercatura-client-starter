import { FIXED, LEVERS_FOR, mediumOf, resolveTaste, stageOf } from "./defaults";
import type { BrandLookText, ContextPlan, CustomerWordsText, FactsText, FullTaste, HookAnchor, LeverKey, Look, OfferText, PictureWords, ProductPhotoRole, ReferenceText, SiblingsText, Stage, Surface, Taste, UseCase, VoiceText, } from "./types";
export const SKILL_ROOT = "taste";
const skill = (p: string) => `${SKILL_ROOT}/${p}.md`;
export const ALWAYS_SKILL = skill("always");
export const LEVER_TITLE: Record<LeverKey, string> = {
    look: "How close should it stay?",
    product: "The product in the picture",
    styling: "Brand styling",
    sell: "How hard it sells",
    words: "Words on the picture",
    finish: "Picture finish",
    spread: "How different the versions are",
    length: "Copy length",
    pace: "Video pace",
    people: "People pictures",
    hooks: "How different the hooks are",
};
type WithRef<T> = {
    withRef: T;
    noRef: T;
};
export interface LookPictureRow {
    label: string;
    referenceImage: boolean;
    brandImages: WithRef<number>;
    pastAds: number;
    reference: WithRef<ReferenceText>;
    brandLook: BrandLookText;
    temperature: number;
    hint: WithRef<string>;
    sends: string;
    never: string;
    note: WithRef<string>;
    skill: string;
}
export const LOOK_PICTURE: Record<Look, LookPictureRow> = {
    brand: {
        label: "Close to my brand",
        referenceImage: false,
        brandImages: { withRef: 2, noRef: 2 },
        pastAds: 2,
        reference: { withRef: "function", noRef: "none" },
        brandLook: "full",
        temperature: 0.5,
        hint: {
            withRef: "We will send your own designed images and past ads as the look. Of the reference, only what kind of ad it is.",
            noRef: "We will send your own designed images and past ads as the look.",
        },
        sends: "Up to 2 of the brand's designed images and up to 2 of its past ads, attached. The brand guidelines in full. Of a reference, only what kind of ad it is.",
        never: "The reference picture. A description of the reference's layout.",
        note: { withRef: "Match the look of the brand images attached. A new picture should pass for one of theirs.", noRef: "Match the look of the brand images attached. A new picture should pass for one of theirs." },
        skill: skill("look/picture-brand"),
    },
    between: {
        label: "In between",
        referenceImage: false,
        brandImages: { withRef: 1, noRef: 0 },
        pastAds: 0,
        reference: { withRef: "detailed", noRef: "none" },
        brandLook: "full",
        temperature: 0.9,
        hint: {
            withRef: "We will send 1 of your own images and a detailed description in words of the reference's layout. The reference picture itself is not sent.",
            noRef: "We will send your brand's look described in words. The layout is new.",
        },
        sends: "With a reference: 1 of the brand's designed images, and the reference described in words (layout, what sits where, camera, light, type). With none: the brand's look in words.",
        never: "The reference picture. The brand's past ads.",
        note: { withRef: "Build the layout that is described, zone for zone. Its look is this brand's, as far as it was sent.", noRef: "Dress it in the brand's look. Choose a layout the brand's own images do not already use." },
        skill: skill("look/picture-between"),
    },
    reference: {
        label: "Exactly like this reference",
        referenceImage: true,
        brandImages: { withRef: 0, noRef: 0 },
        pastAds: 0,
        reference: { withRef: "none", noRef: "none" },
        brandLook: "colours_fonts",
        temperature: 0.5,
        hint: {
            withRef: "We will send the reference picture itself, with only your colours, fonts and logo. It is rebuilt with your product and your words. None of your past ads is sent.",
            noRef: "Pick a reference first.",
        },
        sends: "The reference picture, attached. The brand's colours, fonts and logo only.",
        never: "The brand's designed images. Its past ads. Its look in words. A description of the reference (the picture itself is the layout).",
        note: { withRef: "Rebuild the reference picture: same layout, camera, light and placing of type. Swap in this brand's product, words, colours and fonts.", noRef: "" },
        skill: skill("look/picture-exact"),
    },
    new: {
        label: "Try something new",
        referenceImage: false,
        brandImages: { withRef: 0, noRef: 0 },
        pastAds: 0,
        reference: { withRef: "none", noRef: "none" },
        brandLook: "colours_fonts",
        temperature: 1.2,
        hint: {
            withRef: "Nothing is sent as a look: no past ads, no reference, no description. Only your colours, fonts and logo.",
            noRef: "Nothing is sent as a look: no past ads and no description. Only your colours, fonts and logo.",
        },
        sends: "The brand's colours, fonts and logo only.",
        never: "The brand's designed images. Its past ads. Its look in words. The reference in any form.",
        note: { withRef: "Take a form this brand has not run. Do not guess at how it usually stages a picture.", noRef: "Take a form this brand has not run. Do not guess at how it usually stages a picture." },
        skill: skill("look/picture-new"),
    },
};
export interface LookWordsRow {
    label: string;
    voice: VoiceText;
    reference: WithRef<ReferenceText>;
    temperature: number;
    hint: WithRef<string>;
    sends: string;
    never: string;
    note: WithRef<string>;
    skill: string;
}
export const LOOK_WORDS: Record<Look, LookWordsRow> = {
    brand: {
        label: "Close to my brand",
        voice: "own_ads",
        reference: { withRef: "function", noRef: "none" },
        temperature: 0.5,
        hint: {
            withRef: "We will send your own published ads and lines as the model to write like. Of the reference, only why it worked.",
            noRef: "We will send your own published ads and lines as the model to write like.",
        },
        sends: "The brand's own published ads and lines, as the model of shape and sound. Of a reference, only why it worked.",
        never: "The reference's structure or words.",
        note: { withRef: "Write like the brand's own ads sent here: their length of line, their way in, their sound.", noRef: "Write like the brand's own ads sent here: their length of line, their way in, their sound." },
        skill: skill("look/words-brand"),
    },
    between: {
        label: "In between",
        voice: "full",
        reference: { withRef: "detailed", noRef: "none" },
        temperature: 0.9,
        hint: {
            withRef: "We will send your brand voice and a description of how the reference is built. Its words are not sent.",
            noRef: "We will send your brand voice. How the piece is built is new.",
        },
        sends: "The brand voice block. With a reference: a description of its structure.",
        never: "The brand's past ads as a model. The reference's own words.",
        note: { withRef: "Hold the brand's voice. Use the structure described as a guide, not a mould.", noRef: "Hold the brand's voice and find your own way in. Do not repeat a line the brand already runs." },
        skill: skill("look/words-between"),
    },
    reference: {
        label: "Exactly like this reference",
        voice: "full",
        reference: { withRef: "beats", noRef: "none" },
        temperature: 0.5,
        hint: {
            withRef: "We will send the reference beat by beat. Each beat is rewritten with your facts, in your voice.",
            noRef: "Pick a reference first.",
        },
        sends: "The reference, beat by beat, with the brand voice block. For the brand's own ad kept word for word: its words.",
        never: "The brand's past ads as a model.",
        note: { withRef: "Keep the reference's beats in order, its pacing and its hook device. Every fact is this brand's.", noRef: "" },
        skill: skill("look/words-exact"),
    },
    new: {
        label: "Try something new",
        voice: "basics",
        reference: { withRef: "none", noRef: "none" },
        temperature: 1.2,
        hint: {
            withRef: "We will send only the basics of your voice and your facts. No past ads and nothing of the reference. The writer is given more freedom.",
            noRef: "We will send only the basics of your voice and your facts. None of your past ads is sent. The writer is given more freedom.",
        },
        sends: "The basics of the voice (who speaks, to whom, words never used) and the facts.",
        never: "The brand's past ads. The full voice block. The reference in any form.",
        note: { withRef: "Take a way in the brand has never run. Only the facts, the brand's name and the product are fixed.", noRef: "Take a way in the brand has never run. Only the facts, the brand's name and the product are fixed." },
        skill: skill("look/words-new"),
    },
};
export interface ProductRow {
    label: string;
    role: ProductPhotoRole;
    hint: string;
    sends: string;
    note: string;
    skill: string;
}
export const PRODUCT: Record<FullTaste["product"], ProductRow> = {
    none: {
        label: "Not shown",
        role: "none",
        hint: "No product photo is sent. The picture will not show the product.",
        sends: "No product photo and no logo. The plan is told there is no pack in frame.",
        note: "No pack in frame: no product, no label, no logo. The picture is the buyer's own moment.",
        skill: skill("product/none"),
    },
    scene: {
        label: "In the scene",
        role: "present",
        hint: "Your product photo is sent as a thing in the room. It is there, but it is never the subject.",
        sends: "The product photos, with the role: present in the scene, small, never the subject.",
        note: "The product is in the scene where it would really be kept. Small, never centred, never held up.",
        skill: skill("product/scene"),
    },
    clear: {
        label: "Clearly shown",
        role: "exact",
        hint: "Your product photos are sent to be shown exactly as photographed, easy to see, in use or in the scene.",
        sends: "The product photos, with the role: shown exactly as photographed, easy to see, in use or in the scene and sharing the frame with it.",
        note: "Show the product clearly, exactly as photographed, inside the idea: in use, in a hand or in the place of the scene. A person, a hand or the scene takes at least as much of the frame as the product. Not a pack alone on a plain ground.",
        skill: skill("product/clear"),
    },
    hero: {
        label: "The hero",
        role: "hero",
        hint: "Your product photos are sent as the subject. The product is the biggest thing in the picture. On an ad it is 1 of 3 pictures, a different one for each ad: alone on a plain ground, standing in its own place, or held up in 1 hand.",
        sends: "The product photos, with the role: the subject of the picture, alone on a plain ground.",
        note: "The product is the subject: alone, the biggest thing in frame, exactly as photographed. No person and no scene beside it: a plain ground, its light, and at most a few of its own contents.",
        skill: skill("product/hero"),
    },
};
export interface StylingRow {
    label: string;
    cap: BrandLookText;
    designedImages: boolean;
    logo: boolean;
    hint: string;
    sends: string;
    note: string;
    skill: string;
}
export const STYLING: Record<FullTaste["styling"], StylingRow> = {
    none: {
        label: "None",
        cap: "none",
        designedImages: false,
        logo: false,
        hint: "No design rules are sent: no colours, no fonts, no logo. It will not look like an ad.",
        sends: "Nothing of the brand's design.",
        note: "No brand design: no brand colours, no brand fonts, no logo, no layout that reads as an ad.",
        skill: skill("styling/none"),
    },
    basics: {
        label: "Colours and fonts only",
        cap: "colours_fonts",
        designedImages: false,
        logo: true,
        hint: "Only your colours and fonts are sent, with your logo. No layout rules and no designed images.",
        sends: "The brand's colours and fonts, and its logo.",
        note: "Use the brand's colours and fonts. The layout and the kind of picture are free.",
        skill: skill("styling/basics"),
    },
    full: {
        label: "Full brand look",
        cap: "full",
        designedImages: true,
        logo: true,
        hint: "Your style card, your logo and the look of your designed images are sent.",
        sends: "The style card, the logo, and the look of the brand's designed images as far as the Look lever allows.",
        note: "",
        skill: skill("styling/full"),
    },
};
export interface SecondaryRow {
    label: string;
    hint: string;
    change: string;
    note?: string;
    skill?: string;
}
const ORDER: OfferText[] = ["none", "light", "full"];
export const SELL: Record<FullTaste["sell"], SecondaryRow & {
    shift: -1 | 0 | 1;
}> = {
    soft: {
        label: "Soft",
        shift: -1,
        hint: "The offer is sent 1 step lighter, with no price or deadline. It ends on an easy next step.",
        change: "The offer block is sent 1 step lighter (full becomes light, light becomes none). Price, discount and deadline lines are taken out. The soft-sell snippet is loaded.",
        note: "Ask for little: a look or a read. No price, no discount, no deadline.",
        skill: skill("sell/soft"),
    },
    balanced: {
        label: "Balanced",
        shift: 0,
        hint: "The offer follows the buyer's stage. Nothing is changed.",
        change: "Nothing is changed. The offer follows the buyer's stage: none for unaware, light for problem aware and solution aware, full from product aware on.",
    },
    direct: {
        label: "Direct",
        shift: 1,
        hint: "The offer is sent 1 step fuller, with the price, the guarantee and any deadline the brand has.",
        change: "The offer block is sent 1 step fuller (none becomes light, light becomes full), with price, guarantee and deadline where the brand has them. The direct-sell snippet is loaded.",
        note: "Say the offer plainly and ask for the order. Use only the offer terms that were sent.",
        skill: skill("sell/direct"),
    },
};
export const WORDS: Record<FullTaste["words"], SecondaryRow & {
    slots: PictureWords;
}> = {
    none: {
        label: "None",
        slots: "none",
        hint: "No words are planned on the picture. Clean space is left for your own type.",
        change: "No word slots are asked for, and no customer words or full voice block are sent to the picture. The no-words snippet is loaded.",
        note: "No words in the picture. Leave clean space where type could go.",
        skill: skill("words/none"),
    },
    headline: {
        label: "Headline only",
        slots: "headline",
        hint: "1 line is planned on the picture: the headline.",
        change: "1 word slot is asked for: the headline. The sub-line, points and button slots are not asked for. The headline-only snippet is loaded.",
        note: "1 headline is the only type in the picture. No sub-line, no points, no button.",
        skill: skill("words/headline"),
    },
    full: {
        label: "Full layout",
        slots: "full",
        hint: "Every word slot of the layout is planned: headline, sub-line, points and button.",
        change: "Nothing is changed. Every word slot the format has is asked for.",
    },
};
export const FINISH: Record<FullTaste["finish"], SecondaryRow> = {
    phone: {
        label: "Phone photo",
        hint: "No designed images or layout rules are sent, and no logo. It should look like a photo a person took.",
        change: "The brand's designed images, past ads and layout rules are not sent, and no logo. At most its colours and fonts go in words. The phone-photo snippet is loaded.",
        note: "It looks like a photo a person took on a phone: ordinary light, no design layer.",
        skill: skill("finish/phone"),
    },
    brand: {
        label: "Brand-styled",
        hint: "The finish follows the choices above. Nothing is changed.",
        change: "Nothing is changed. The look follows the Look and Brand styling levers.",
    },
    studio: {
        label: "Studio polished",
        hint: "A studio finish is asked for: clean light, a clean surface, a finished product shot.",
        change: "The studio snippet is loaded. Nothing is removed.",
        note: "Studio finish: controlled light, a clean surface, nothing in frame that was not chosen.",
        skill: skill("finish/studio"),
    },
};
export const SPREAD: Record<FullTaste["spread"], SecondaryRow & {
    siblings: SiblingsText;
    heat: number;
}> = {
    openings: {
        label: "New openings",
        siblings: "body",
        heat: 0,
        hint: "Each version is sent the body of the first one, to keep. Only the opening is new.",
        change: "Each version is sent the body of the first version, to keep as it is. The new-openings snippet is loaded.",
        note: "Keep the body sent here as it is. Only the opening is new, and it must lead into that body.",
        skill: skill("spread/openings"),
    },
    angles: {
        label: "New angle each",
        siblings: "briefs",
        heat: 0,
        hint: "Each version is sent a 1-line brief of the others, so it takes an angle none of them took.",
        change: "Nothing is changed. Each version is sent a 1-line brief of the other versions and must not retell them.",
    },
    free: {
        label: "Anything goes",
        siblings: "none",
        heat: 0.1,
        hint: "Nothing of the other versions is sent, and the writer is given a little more freedom. Versions may overlap.",
        change: "Nothing of the other versions is sent. The temperature goes up by 0.1 (never above 1.2). The anything-goes snippet is loaded.",
        note: "Make this version as if it were the only one.",
        skill: skill("spread/free"),
    },
};
export const LENGTH: Record<FullTaste["length"], SecondaryRow & {
    facts: FactsText;
    customerWords: CustomerWordsText;
}> = {
    short: {
        label: "Short",
        facts: "core",
        customerWords: "few",
        hint: "Only the core facts and a few customer lines are sent: 1 promise and its best proof.",
        change: "Only the core facts are sent (the promise and its best proof) and a few customer lines. Objections and the wider proof are taken out. The short-copy snippet is loaded.",
        note: "1 idea, 1 proof, 1 ask. Cut anything a second idea would need.",
        skill: skill("length/short"),
    },
    standard: {
        label: "Standard",
        facts: "standard",
        customerWords: "full",
        hint: "The usual facts and the customer's words are sent. Nothing is changed.",
        change: "Nothing is changed. The usual fact block and the customer's words are sent.",
    },
    long: {
        label: "Long",
        facts: "full",
        customerWords: "full",
        hint: "Every fact is sent: every proof, the objections and their answers.",
        change: "The full fact block is sent: every proof, the objections and their answers. The long-copy snippet is loaded.",
        note: "Use the room for proof and answered doubts, not for more ways of saying the promise.",
        skill: skill("length/long"),
    },
};
export const PACE: Record<FullTaste["pace"], SecondaryRow> = {
    calm: {
        label: "Calm",
        hint: "A calm pace is asked for: fewer, longer shots.",
        change: "The calm-pace snippet is loaded: about 2 shots in each 10 seconds, each held.",
        note: "About 2 shots in each 10 seconds. Hold each one. No cut without a reason.",
        skill: skill("pace/calm"),
    },
    normal: {
        label: "Normal",
        hint: "The pace follows the format. Nothing is changed.",
        change: "Nothing is changed. The pace follows the format's own skill.",
    },
    fast: {
        label: "Fast cuts",
        hint: "Fast cuts are asked for: more, shorter shots.",
        change: "The fast-cuts snippet is loaded: 6 shots in each 10 seconds, a cut on each new idea.",
        note: "6 shots in each 10 seconds. Cut on each new idea. Every shot still reads at a glance.",
        skill: skill("pace/fast"),
    },
};
export const PEOPLE: Record<FullTaste["people"], SecondaryRow> = {
    clay: {
        label: "Clay figure",
        hint: "People are made as clay figures. No photo of a real person is sent.",
        change: "The clay-figure snippet is loaded. No photo of a real person is sent.",
        note: "People are clay figures: hand-made, visible fingerprints, simple faces.",
        skill: skill("people/clay"),
    },
    illustrated: {
        label: "Illustrated",
        hint: "People are drawn, not photographed. No photo of a real person is sent.",
        change: "The illustrated snippet is loaded. No photo of a real person is sent.",
        note: "People are drawn, in 1 style kept across every picture of the set.",
        skill: skill("people/illustrated"),
    },
    photo: {
        label: "Photo-real",
        hint: "People look like real photos. A real person's photo is sent only when you uploaded and chose one.",
        change: "Nothing is added. A real person's uploaded photo is sent only when one was chosen.",
    },
};
export const HOOKS: Record<FullTaste["hooks"], SecondaryRow & {
    anchor: HookAnchor;
}> = {
    device: {
        label: "Same way in, new words",
        anchor: "device",
        hint: "Every hook opens the way the ad already opens, said in new words. For testing wording against wording.",
        change: "The body is sent with the opening it has and the name of its device. The same-device snippet is loaded. On a script, hooks may open on the same picture: only the same first words are refused.",
        note: "Every new hook uses the device named here, with new words.",
        skill: skill("hooks/device"),
    },
    promise: {
        label: "A different way in each",
        anchor: "promise",
        hint: "The body is sent with its promise in 1 line. The old opening's words are not sent.",
        change: "Nothing is changed. The body is sent with its promise in 1 line. The old opening's words are not sent.",
    },
    free: {
        label: "Completely different",
        anchor: "none",
        hint: "Only the body is sent. Any opening that leads into it is allowed.",
        change: "Only the body is sent: not the old opening, not its device, not a promise line. The free-hooks snippet is loaded.",
        note: "Any way in is allowed, as long as the first line of the body still follows from it.",
        skill: skill("hooks/free"),
    },
};
export const SECONDARY: {
    sell: typeof SELL;
    words: typeof WORDS;
    finish: typeof FINISH;
    spread: typeof SPREAD;
    length: typeof LENGTH;
    pace: typeof PACE;
    people: typeof PEOPLE;
    hooks: typeof HOOKS;
} = { sell: SELL, words: WORDS, finish: FINISH, spread: SPREAD, length: LENGTH, pace: PACE, people: PEOPLE, hooks: HOOKS };
export function stopLabel(key: LeverKey, stop: string): string {
    if (key === "look")
        return LOOK_PICTURE[stop as Look]?.label ?? stop;
    if (key === "product")
        return PRODUCT[stop as FullTaste["product"]]?.label ?? stop;
    if (key === "styling")
        return STYLING[stop as FullTaste["styling"]]?.label ?? stop;
    return (SECONDARY[key] as Record<string, SecondaryRow>)[stop]?.label ?? stop;
}
export function stopHint(key: LeverKey, stop: string, u: UseCase): string {
    if (key === "look") {
        const row = (mediumOf(u.surface) === "words" ? LOOK_WORDS : LOOK_PICTURE)[stop as Look];
        return row ? (u.hasReference ? row.hint.withRef : row.hint.noRef) : "";
    }
    if (key === "product")
        return PRODUCT[stop as FullTaste["product"]]?.hint ?? "";
    if (key === "styling")
        return STYLING[stop as FullTaste["styling"]]?.hint ?? "";
    return (SECONDARY[key] as Record<string, SecondaryRow>)[stop]?.hint ?? "";
}
export const OFFER_BY_STAGE: Record<Stage, OfferText> = { unaware: "none", problem_aware: "light", solution_aware: "light", product_aware: "full", most_aware: "full" };
export const OFFER_NO_STAGE: OfferText = "light";
export const OFFER_CAP: Record<Surface, OfferText> = {
    script: "full",
    hooks: "light",
    caption: "full",
    landing: "full",
    image_ad: "full",
    native_ad: "light",
    sprint_ad: "full",
    carousel: "full",
    pdp: "light",
    photoshoot: "none",
    storyboard: "none",
    shot_plan: "none",
    cast: "none",
};
export const FROM_SCRIPT_NOTE = "The words on the picture are the script's: take its on-screen lines, its hooks and its headlines as they are, or shorten one. Write a new line only where none fits the place. No fact, figure or offer term the script does not state.";
export const NO_PRODUCT_WORDS_NOTE = "The words stay with the picture: the buyer's moment and what it costs them. They do not say what the product is made as, how it is taken or used, or what is in it, and they make no offer. At most 1 short line says there is another way.";
export const TYPED_BY_A_PERSON_NOTE = "The words in the picture are what a person typed or was sent: a note, a list, a message, a reminder. Write and set them as a person types on a phone: sentence case or lower case, never Title Case, the phone's own plain type, a short title and short lines. Nothing is set as a headline. A photo in it is an attachment in its own rectangle, never blended behind the words.";
export const NO_WORDS_PHONE_NOTE = "No words in the picture, and no space kept for them: a snapshot is not composed around type.";
const AD_SURFACES: Surface[] = ["image_ad", "native_ad", "sprint_ad", "carousel"];
const LOGO_SURFACES: Surface[] = [...AD_SURFACES, "pdp"];
const PICTURE_ONLY: Surface[] = ["photoshoot", "storyboard", "shot_plan"];
const has = (s: Surface, key: LeverKey) => LEVERS_FOR[s].includes(key);
const minLook = (a: BrandLookText, b: BrandLookText): BrandLookText => (["none", "colours_fonts", "full"] as const)[Math.min(["none", "colours_fonts", "full"].indexOf(a), ["none", "colours_fonts", "full"].indexOf(b))];
function offerFor(u: UseCase, t: FullTaste): OfferText {
    const stage = stageOf(u.stage);
    const base = ORDER.indexOf(stage ? OFFER_BY_STAGE[stage] : OFFER_NO_STAGE);
    const shifted = Math.max(0, Math.min(2, base + (has(u.surface, "sell") ? SELL[t.sell].shift : 0)));
    return ORDER[Math.min(shifted, ORDER.indexOf(OFFER_CAP[u.surface]))];
}
export function decide(useCase: UseCase, taste: Taste | null | undefined = {}): ContextPlan {
    const u: UseCase = { hasReference: false, hasBrandRefs: true, productHasPhoto: true, ...useCase, stage: stageOf(useCase.stage) };
    const t = resolveTaste(u, taste);
    const s = u.surface;
    const words = mediumOf(s) === "words";
    const ref = !!u.hasReference;
    const notes: string[] = [];
    const warnings: string[] = [];
    const skillPath: string[] = [];
    const say = (n: string | undefined) => {
        if (n && !notes.includes(n))
            notes.push(n);
    };
    const load = (p: string | undefined) => {
        if (p && !skillPath.includes(p))
            skillPath.push(p);
    };
    if (taste?.look === "reference" && !ref)
        warnings.push("No reference is picked, so \"Exactly like this reference\" cannot be used. It was made as \"In between\" instead.");
    const fixed = FIXED[s];
    if (fixed)
        for (const [k, v] of Object.entries(fixed.value))
            if (taste?.[k as LeverKey] && taste[k as LeverKey] !== v && !warnings.includes(fixed.why))
                warnings.push(fixed.why);
    const plan: ContextPlan = {
        useCase: u,
        taste: t,
        attach: { referenceImage: false, brandDesignedImages: 0, pastAds: 0, productPhotos: "none", logo: false },
        text: { referenceDescription: "none", brandLook: "none", voice: "basics", facts: "standard", customerWords: "none", offer: offerFor(u, t), siblings: "none", pictureWords: "none", hookAnchor: "none", wordsFrom: "brand" },
        skillPath,
        temperature: 0.9,
        notes,
        warnings,
    };
    if (words) {
        const row = LOOK_WORDS[t.look];
        plan.text.voice = row.voice;
        if (row.voice === "own_ads" && u.hasBrandRefs === false) {
            plan.text.voice = "full";
            warnings.push("This brand has no published ads on file, so none can be sent as the model. Its voice block is sent instead.");
        }
        plan.text.referenceDescription = ref ? (t.look === "reference" && u.keepWords ? "words" : row.reference.withRef) : row.reference.noRef;
        plan.temperature = row.temperature;
        load(row.skill);
        say(ref ? row.note.withRef : row.note.noRef);
        if (t.look === "reference" && u.keepWords)
            say("Keep the words as they are. Only the format changes.");
        const len = LENGTH[has(s, "length") ? t.length : "standard"];
        plan.text.facts = len.facts;
        plan.text.customerWords = len.customerWords;
        if (has(s, "length")) {
            load(len.skill);
            say(len.note);
        }
    }
    else {
        const row = LOOK_PICTURE[t.look];
        const style = STYLING[t.styling];
        const phone = has(s, "finish") && t.finish === "phone";
        const designed = style.designedImages && !phone && s !== "cast";
        let images = designed ? (ref ? row.brandImages.withRef : row.brandImages.noRef) : 0;
        let ads = designed && AD_SURFACES.includes(s) ? row.pastAds : 0;
        if (u.hasBrandRefs === false && (images || ads)) {
            images = 0;
            ads = 0;
            if (t.look === "brand")
                warnings.push("This brand has no designed images or past ads on file, so none can be attached. Its look is sent in words instead.");
        }
        if (t.look === "brand" && !designed && s !== "cast")
            warnings.push(phone ? "Picture finish is Phone photo, so your brand's designed images and past ads are not sent." : `Brand styling is "${style.label}", so your brand's designed images and past ads are not sent. Move it to "Full brand look" to send them.`);
        plan.attach.referenceImage = row.referenceImage && ref;
        plan.attach.brandDesignedImages = images;
        plan.attach.pastAds = ads;
        plan.text.referenceDescription = ref ? row.reference.withRef : row.reference.noRef;
        plan.text.brandLook = minLook(minLook(row.brandLook, style.cap), phone ? "colours_fonts" : "full");
        plan.temperature = row.temperature;
        const silent = (t.look === "brand" || t.look === "between") && plan.text.brandLook === "none" && plan.text.referenceDescription === "none";
        if (s !== "cast" && !silent) {
            load(row.skill);
            say(ref ? row.note.withRef : row.note.noRef);
        }
        const product = PRODUCT[t.product];
        plan.attach.productPhotos = product.role;
        if (product.role !== "none" && u.productHasPhoto === false) {
            plan.attach.productPhotos = "none";
            warnings.push("This product has no photo on file, so none is sent. The product is described in words and may not match the real pack. Add a photo to fix this.");
        }
        if (has(s, "product")) {
            load(product.skill);
            say(product.note);
            if (t.look === "reference" && t.product === "none")
                say("Where the reference shows its product, show the buyer's moment in that space instead.");
        }
        plan.attach.logo = LOGO_SURFACES.includes(s) && style.logo && !phone && t.product !== "none";
        if (has(s, "styling")) {
            const sent = STYLING[plan.text.brandLook === "none" ? "none" : plan.text.brandLook === "colours_fonts" ? "basics" : "full"];
            load(sent.skill);
            say(sent.note);
        }
        const slots = WORDS[t.words];
        plan.text.pictureWords = slots.slots;
        const typed = slots.slots !== "none";
        plan.text.voice = typed && t.look !== "new" ? "full" : "basics";
        plan.text.customerWords = typed && !PICTURE_ONLY.includes(s) ? "few" : "none";
        plan.text.facts = s === "cast" ? "none" : typed && !PICTURE_ONLY.includes(s) ? "standard" : "core";
        if (has(s, "words")) {
            load(slots.skill);
            say(!typed && phone ? NO_WORDS_PHONE_NOTE : slots.note);
            if (typed && s === "native_ad" && t.styling === "none")
                say(TYPED_BY_A_PERSON_NOTE);
        }
        if (u.fromScript && !PICTURE_ONLY.includes(s) && s !== "cast") {
            plan.text.wordsFrom = "script";
            plan.text.voice = "basics";
            plan.text.customerWords = "none";
            plan.text.facts = "core";
            if (typed)
                say(FROM_SCRIPT_NOTE);
        }
        if (typed && t.product === "none" && (u.stage === "unaware" || u.stage === "problem_aware"))
            say(NO_PRODUCT_WORDS_NOTE);
        if (has(s, "finish")) {
            load(FINISH[t.finish].skill);
            say(FINISH[t.finish].note);
        }
        if (has(s, "pace")) {
            load(PACE[t.pace].skill);
            say(PACE[t.pace].note);
        }
        if (has(s, "people")) {
            load(PEOPLE[t.people].skill);
            say(PEOPLE[t.people].note);
            say("A real person (founder, customer, expert) only from an uploaded photo. No children.");
        }
    }
    if (has(s, "sell")) {
        load(SELL[t.sell].skill);
        say(SELL[t.sell].note);
    }
    if (plan.text.offer === "none" && OFFER_CAP[s] !== "none")
        say("No offer is sent. Do not write a price, a discount or a deadline.");
    if (has(s, "spread")) {
        const row = SPREAD[t.spread];
        plan.text.siblings = row.siblings;
        plan.temperature = Math.min(1.2, plan.temperature + row.heat);
        load(row.skill);
        say(row.note);
    }
    if (s === "hooks") {
        const row = HOOKS[t.hooks];
        plan.text.siblings = "body";
        plan.text.hookAnchor = row.anchor;
        load(row.skill);
        say(row.note);
    }
    plan.temperature = Math.round(plan.temperature * 100) / 100;
    return plan;
}
