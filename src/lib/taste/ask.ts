import { compactTaste } from "./schema";
import type { Taste } from "./types";
type Rules<K extends keyof Taste> = [
    RegExp,
    NonNullable<Taste[K]>
][];
const LOOK: Rules<"look"> = [
    [/\b(exactly|just|precisely) (like|as) (this|that|the|my) (reference|ad|one|image|picture|layout)\b|\bexact(ly)? (the )?same (as|layout)\b|\b(copy|clone|recreate|rebuild|remake|replicate) (this|that|the) (reference|ad|layout|image|picture)\b|\bsame (layout|ad) as (this|that|the) reference\b/, "reference"],
    [/\btry something (new|different|fresh)\b|\bsomething (completely|totally|entirely|really)? ?(new|different|fresh)\b|\bsomething (we|they|the brand) (have|has)(n'?t| not| never) (run|tried|done)\b|\bsurprise me\b|\bbreak (away )?from (our|the) (usual|brand)\b|\bnothing like (our|the) (usual|other|past) ads\b/, "new"],
    [/\b(close|closer|true) to (my|our|the) brand\b|\b(stay|keep it|keep them|stick) (very )?(close|on[- ]brand)\b|\bon[- ]brand\b|\blike (our|my) (own|usual|other|past|existing) ads\b|\bin (our|my) (usual|house) style\b/, "brand"],
    [/\b(somewhere )?in between\b|\bmiddle (path|ground)\b|\bloosely (like|based on|follow)\b|\bfollow (it|this|that|the reference) loosely\b/, "between"],
];
const PRODUCT: Rules<"product"> = [
    [/\b(no|without( the| a| any)?) (product|pack|packaging|bottle|pouch)\b(?! (claims?|facts?|names?))|\b(leave|keep|take) (the )?(product|pack) out\b|\b(do not|don'?t|never) show (the |our )?(product|pack)\b|\bproduct (is )?not shown\b/, "none"],
    [/\b(product|pack) (only )?(in|into) the (background|scene|room)\b|\b(product|pack) in (the )?background\b|\b(small|subtle) (product|pack)\b/, "scene"],
    [/\b(product|pack) (is |as )?the hero\b|\bhero shot of (the|our) (product|pack)\b|\b(make|with) the (product|pack) (the )?(hero|star|subject)\b|\b(product|pack) front and cent(er|re)\b/, "hero"],
    [/\bshow (the |our )?(product|pack) clearly\b|\b(product|pack) clearly (shown|visible|seen)\b|\bclearly show (the |our )?(product|pack)\b/, "clear"],
];
const STYLING: Rules<"styling"> = [
    [/\bno (brand )?(styling|design|branding)\b|\bunbranded\b|\b(no|without( a| the| our)?) logo\b|\b(should|must|does|do)(n'?t| not) look like an ad\b|\bnot look like an ad\b/, "none"],
    [/\b(only|just) (my |our |the )?(brand )?colou?rs and fonts\b|\bcolou?rs and fonts only\b/, "basics"],
    [/\bfull brand (look|styling|style)\b|\bfully branded\b/, "full"],
];
const SELL: Rules<"sell"> = [
    [/\bsoft(er)? sell\b|\b(do not|don'?t) (push|sell hard)\b|\bno hard sell\b|\bless salesy\b/, "soft"],
    [/\bhard(er)? sell\b|\bsell (it )?hard(er)?\b|\bdirect (sell|offer|response)\b|\bpush the offer\b|\bask for the (order|sale)\b/, "direct"],
];
const WORDS: Rules<"words"> = [
    [/\b(no|without( any)?) (words|text|copy|type|headline) on (it|them|the (image|picture|ad)s?)\b|\b(no|without( any)?) (text|words) overlay\b|\bimage only, no (text|words)\b/, "none"],
    [/\b(only|just) (a |the )?headline\b|\bheadline only\b/, "headline"],
];
const FINISH: Rules<"finish"> = [
    [/\bphone (photo|picture|shot)\b|\b(shot|taken) on (a |an |my )?(phone|iphone)\b|\blooks? like (a )?phone\b/, "phone"],
    [/\bstudio (shot|polish|polished|finish|quality|lit|look)\b/, "studio"],
];
const LENGTH: Rules<"length"> = [
    [/\b(keep|make) (it|them|the copy) short\b|\bshort copy\b|\bshort and (sweet|punchy)\b/, "short"],
    [/\blong copy\b|\blong[- ]form\b|\b(make|keep) (it|them|the copy) long\b/, "long"],
];
const PACE: Rules<"pace"> = [
    [/\bfast cuts?\b|\bfast[- ]paced\b|\bquick cuts?\b/, "fast"],
    [/\b(calm|slow)(er)? (pace|paced|cuts?)\b|\bslow[- ]paced\b|\bfewer, longer shots\b/, "calm"],
];
const PEOPLE: Rules<"people"> = [
    [/\bclay (figures?|people|person|characters?)\b/, "clay"],
    [/\b(illustrated|drawn|cartoon) (people|person|characters?|figures?)\b/, "illustrated"],
];
const HOOKS: Rules<"hooks"> = [
    [/\bsame (hook )?device\b|\bsame (way in|way|opening|hook),? (in |with |but )?(new|different|other) words\b|\b(only|just) (change|vary) the wording\b/, "device"],
    [/\bany (hook|opening|way in)\b|\bfree hooks?\b|\bcompletely different (hooks?|openings?)\b|\b(hooks?|openings?) (that are )?completely different\b/, "free"],
];
const first = <K extends keyof Taste>(text: string, rules: Rules<K>): Taste[K] | undefined => rules.find(([re]) => re.test(text))?.[1];
export function tasteAsked(text: string, hasReference = true): Taste {
    const t = ` ${text.toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ")} `;
    const look = first(t, LOOK);
    return compactTaste({
        look: look === "reference" && !hasReference ? undefined : look,
        product: first(t, PRODUCT),
        styling: first(t, STYLING),
        sell: first(t, SELL),
        words: first(t, WORDS),
        finish: first(t, FINISH),
        length: first(t, LENGTH),
        pace: first(t, PACE),
        people: first(t, PEOPLE),
        hooks: first(t, HOOKS),
    });
}
