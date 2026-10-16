import type { Variety } from "../variety";
import { rng, shuffled } from "./deal";
export const AD_FORMS = [
    { id: "pack-hero", label: "Pack hero", what: "the product large on a backdrop or a surface, a headline above or beside it" },
    { id: "life-scene", label: "Scene from the customer's life", what: "a moment of the buyer's day fills the frame and makes the argument; the product is small in it, where it would really be" },
    { id: "note", label: "Note or message", what: "the ad is a handwritten note, a sticky note, a text-message thread, a sign a person made, a list on a phone or a receipt: the words are the picture" },
    { id: "comparison", label: "Comparison or chart", what: "2 sides, a table, a chart or 1 number drawn large carries the argument" },
    { id: "close-up", label: "Close-up", what: "the result or the problem, so close that its texture fills the frame" },
    { id: "testimonial", label: "Testimonial card", what: "a customer's own words are the picture, set as a review card or a large quote" },
    { id: "editorial", label: "Editorial page", what: "laid out like a magazine page or an article: a big title, a column of text, a small picture" },
    { id: "metaphor", label: "Object metaphor", what: "an unexpected object, scale or swap stands for the argument" },
    { id: "demonstration", label: "Demonstration", what: "the product in use, or its steps or parts shown and labelled" },
    { id: "type-poster", label: "Type poster", what: "type alone fills the frame in the brand's colours; the product is a small sign-off" },
] as const;
export type AdForm = (typeof AD_FORMS)[number]["id"];
export const USUAL_FORM: AdForm = "pack-hero";
export function formId(v: unknown): AdForm | "" {
    const t = String(v ?? "").trim().toLowerCase().replace(/[`'"]/g, "").replace(/[\s_/]+/g, "-");
    if (!t)
        return "";
    const hit = AD_FORMS.find((f) => t === f.id || t.startsWith(f.id) || t === f.label.toLowerCase().replace(/[\s']+/g, "-"));
    return hit ? hit.id : "";
}
export function formOfAsset(a: {
    type: string;
    has_added_text: boolean;
    description?: string;
}): AdForm | "" {
    if (!a.has_added_text)
        return "";
    const d = (a.description ?? "").toLowerCase();
    if (/review|testimonial|quote|stars?\b/.test(d))
        return "testimonial";
    if (/\bversus\b|\bvs\b|compar|chart|table|timeline/.test(d))
        return "comparison";
    if (a.type === "packshot" || a.type === "bundle")
        return "pack-hero";
    if (a.type === "lifestyle")
        return "life-scene";
    if (a.type === "in_use" || a.type === "contents")
        return "demonstration";
    if (a.type === "infographic")
        return "demonstration";
    return "";
}
export const formLabel = (id: string) => AD_FORMS.find((f) => f.id === id)?.label ?? id;
export const planForm = (plan: object | null | undefined): AdForm | "" => formId((plan as {
    form?: string;
} | null | undefined)?.form);
export function formsUsed(...lists: string[][]): AdForm[] {
    const all = [...new Set(lists.flat().map(formId).filter((x): x is AdForm => !!x))];
    return all.length ? all : [USUAL_FORM];
}
export function formRule(variety: Variety, recorded: string[], shown = 0, dealt = false): string {
    const menu = AD_FORMS.map((f) => `\`${f.id}\` (${f.what})`).join("; ");
    const known = [...new Set(recorded.map(formId).filter(Boolean))];
    const sources = [shown ? "the brand's own images attached (read the form of each)" : "", known.length ? `what is on record of its ads (${known.join(", ")})` : "", variety <= 3 ? "what is said of its own images below" : ""].filter(Boolean).join(", ");
    const first = variety >= 4 ? `**The form of each ad.** Forms: ${menu}. \`forms_used\` is given: ${JSON.stringify(formsUsed(recorded))}. Copy it.` : `**The form of each ad.** Forms: ${menu}. First fill \`forms_used\`: the forms this brand already runs, from ${sources || "what the brand block says"}. Where none can be known, \`forms_used\` is ["${USUAL_FORM}"].`;
    if (variety <= 2)
        return `${first} Then \`form\` is 1 of \`forms_used\`: the ad is built the way the brand builds its own.${dealt ? ` An ad with a form dealt under it (its line that starts "${FORM_DEALT}") takes that form.` : ""}`;
    if (variety === 3)
        return dealt ? `${first} Then \`form\` is the one dealt under each ad (its line that starts "${FORM_DEALT}"), so a set does not come back as 1 kind of picture. An ad with no such line takes whichever form of the menu makes its argument best, used or not.` : `${first} Then \`form\` is whichever form of the menu makes this argument best, used or not.`;
    return `${first} Then \`form\` must be a form of the menu that is not in \`forms_used\`${variety >= 5 ? ` and is not \`${USUAL_FORM}\`: take the one furthest from what the brand runs that still makes this argument` : ""}.${dealt ? ` Where a form is dealt under an ad (its line that starts "${FORM_DEALT}"), that is the one it takes: it is a form the brand has not run.` : ""} This outranks the usual picture of the item's type: keep the job the type does for the buyer, drop its layout. \`scene\` and \`layout\` are that form through and through, never the used form on a new backdrop. In a form that is not \`${USUAL_FORM}\` the product is not the biggest thing in the frame: it is as small as the form needs (in use, in the scene, or a sign-off in a corner) and still exactly as photographed. A \`note\` chosen here is a designed ad in the brand's colours and typefaces, not an imitation of a platform. Start \`adaptation\` with the form and why it makes this argument. An item that follows a reference (EXACT or STRUCTURE) takes its form from the reference.`;
}
export function formFault(variety: Variety, form: string, used: string[]): string {
    if (variety < 4)
        return "";
    const id = formId(form);
    const taken = formsUsed(used);
    const barred = (f: string) => taken.includes(f as AdForm) || (variety >= 5 && f === USUAL_FORM);
    const free = AD_FORMS.map((f) => f.id).filter((f) => !barred(f));
    if (!free.length)
        return "";
    if (!id)
        return `\`form\` must name 1 form of the menu. Choose from: ${free.join(", ")}.`;
    if (barred(id))
        return `The form \`${id}\` is one the brand already runs (${taken.join(", ")}). Plan this ad again in a form it has not run: ${free.join(", ")}. Change \`scene\` and \`layout\` to that form, not only its name.`;
    return "";
}
const ALL_FORMS: readonly AdForm[] = AD_FORMS.map((f) => f.id);
export const FORMS_OF_TYPE: Record<string, readonly AdForm[]> = {
    "product-hero-and-minimal": ["pack-hero", "close-up"],
    "lifestyle-and-editorial": ["life-scene", "editorial", "close-up"],
    "problem-and-symptom-framing": ["life-scene", "close-up", "metaphor", "note"],
    "native-format-mimicry": ["note"],
    "conceptual-and-scale": ["metaphor", "close-up", "life-scene", "comparison"],
    "handmade-and-anti-design": ["note", "type-poster"],
    "callout-diagram": ["demonstration"],
    "ingredient-stat-and-spec": ["comparison", "close-up", "demonstration"],
    "comparison-and-us-vs-them": ["comparison"],
    "review-and-testimonial": ["testimonial"],
    "before-and-after": ["comparison"],
    "press-and-authority": ["editorial", "testimonial"],
    "bundle-kit-and-range": ["pack-hero", "demonstration"],
    "offer-sale-and-promo": ["pack-hero", "type-poster"],
    "gifting-and-occasion": ["life-scene", "pack-hero"],
};
export const FORMS_OF_LOOK: Record<string, readonly AdForm[]> = {
    "message-thread": ["note"],
    "studio-comparison": ["comparison"],
    infographic: ["demonstration", "comparison"],
    engraving: ["demonstration"],
    "macro-luxury": ["close-up"],
};
const NEEDS_PRODUCT: readonly AdForm[] = ["pack-hero", "demonstration"];
const PROVES: readonly AdForm[] = ["testimonial", "comparison"];
export const OWN_HAND_FORMS: readonly AdForm[] = ["note"];
export const OWN_HAND_KINDS = ["a handwritten note", "a message thread", "a sign a person made", "a receipt or a list in a person's hand"] as const;
export const inOwnHand = (form: unknown): boolean => (OWN_HAND_FORMS as readonly string[]).includes(formId(form));
const SET_IN_TYPE: readonly AdForm[] = ["editorial", "type-poster"];
export const lookCarriesOwnHand = (world: string | null | undefined): boolean => !FORMS_OF_LOOK[world ?? ""] || FORMS_OF_LOOK[world ?? ""].some(inOwnHand);
export function formsAllowed(o: {
    types?: (string | null | undefined)[];
    world?: string | null;
    stage?: string | null;
    product?: string | null;
    ledByType?: boolean;
}): AdForm[] {
    if (o.stage === "unaware" && o.ledByType && lookCarriesOwnHand(o.world))
        return ALL_FORMS.filter((f) => OWN_HAND_FORMS.includes(f));
    const narrowed = (list: readonly AdForm[], keep: (f: AdForm) => boolean): readonly AdForm[] => (list.some(keep) ? list.filter(keep) : list);
    const ofTypes = [...new Set((o.types ?? []).flatMap((t) => FORMS_OF_TYPE[t ?? ""] ?? []))];
    const byLayout = ofTypes.length ? ofTypes : ALL_FORMS;
    const look = FORMS_OF_LOOK[o.world ?? ""];
    let forms = look ? narrowed(look, (f) => byLayout.includes(f)) : byLayout;
    if (o.product === "none")
        forms = narrowed(forms, (f) => !NEEDS_PRODUCT.includes(f));
    if (o.stage === "unaware")
        forms = narrowed(forms, (f) => !PROVES.includes(f));
    if (o.stage === "unaware")
        forms = narrowed(forms, (f) => !SET_IN_TYPE.includes(f));
    return ALL_FORMS.filter((f) => forms.includes(f));
}
export interface FormAd {
    allowed: readonly AdForm[];
    fixed?: AdForm | "";
    open?: boolean;
    expect?: AdForm | "";
}
export function dealForms(ads: FormAd[], seed: string, start = 0): (AdForm | "")[] {
    const deck = shuffled(ALL_FORMS, rng(`${seed}:form`));
    const used = new Map<AdForm, number>();
    const count = (f: AdForm) => used.get(f) ?? 0;
    const settled = (ad: FormAd): AdForm | "" => ad.fixed || (ad.open ? ad.expect : "") || "";
    for (const ad of ads)
        if (settled(ad))
            used.set(settled(ad) as AdForm, count(settled(ad) as AdForm) + 1);
    let before: AdForm | "" = "";
    return ads.map((ad, i) => {
        let form: AdForm | "" = "";
        if (ad.fixed)
            form = ad.fixed;
        else if (!ad.open && ad.allowed.length) {
            const next = ads[i + 1];
            const after = next?.fixed || (next?.open ? next.expect : next?.allowed.length === 1 ? next.allowed[0] : "") || "";
            const turn = (f: AdForm) => (((deck.indexOf(f) - start - i) % deck.length) + deck.length) % deck.length;
            const order = [...new Set(ad.allowed)].sort((a, b) => count(a) - count(b) || turn(a) - turn(b));
            form = order.find((f) => f !== before && f !== after) ?? order.find((f) => f !== before) ?? order[0];
        }
        if (form && !ad.fixed)
            used.set(form, count(form) + 1);
        before = form || settled(ad);
        return form;
    });
}
export const FORM_DEALT = "Form dealt to this ad";
export const formLine = (form: AdForm): string => `${FORM_DEALT}, so the set is not 1 kind of picture: \`${form}\` (${AD_FORMS.find((f) => f.id === form)!.what}). \`form\` is this one, and \`scene\` and \`layout\` are it through and through. It gives way to 3 things only: the user's direction, the rule on the product in the picture, and a format or a world that cannot be built in it. Say in \`adaptation\` if you changed it.`;
const NAMED: [
    AdForm,
    RegExp
][] = [
    ["pack-hero", /\bpack[- ]hero\b|\bproduct hero\b|\bhero shot\b/i],
    ["life-scene", /\blife[- ]scene\b|\blifestyle (?:scene|shot|photo)\b/i],
    ["note", /\b(?:handwritten|sticky|post-it|taped) note\b|\bnote or message\b|\btext[- ]message\b|\bmessage thread\b|\bas a (?:note|receipt)\b/i],
    ["comparison", /\bcomparison\b|\bside[- ]by[- ]side\b|\bus (?:vs\.?|versus) them\b|\bbefore[- ]and[- ]after\b|\bchart\b/i],
    ["close-up", /\bclose[- ]?up\b|\bmacro (?:shot|photo)\b/i],
    ["testimonial", /\btestimonial\b|\b(?:review|quote) card\b/i],
    ["editorial", /\beditorial page\b|\bmagazine (?:page|layout|spread)\b/i],
    ["metaphor", /\bmetaphor\b/i],
    ["demonstration", /\bdemonstration\b|\bdemo\b|\bhow[- ]to\b|\bstep[- ]by[- ]step\b/i],
    ["type-poster", /\btype[- ]poster\b|\btypographic\b|\b(?:type|text)[- ]only\b/i],
];
export function formNamed(text: string | null | undefined): AdForm | "" {
    const hits = NAMED.filter(([, re]) => re.test(text ?? "")).map(([f]) => f);
    return hits.length === 1 ? hits[0] : "";
}
