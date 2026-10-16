import type { PhotoView } from "./views";
export const CAMERAS = [
    "at eye level, from arm's length",
    "from directly above, looking straight down",
    "close in, the subject filling the frame",
    "wide, with the whole place in view",
    "from low down, looking up",
    "the buyer's own view, over their own hands",
    "from a little above, at three-quarters",
] as const;
export const LIGHTS = [
    "daylight through a window, from the side",
    "hard sun with sharp shadows",
    "soft and even, an overcast day",
    "a warm lamp in the evening",
    "direct flash, the way a phone takes it",
    "bright, clean studio light",
] as const;
const SEEN: {
    how: string;
    needs?: PhotoView[];
}[] = [
    { how: "standing, its front to the camera" },
    { how: "held in a hand, closed" },
    { how: "lying flat on the surface, seen from above" },
    { how: "turned a little to one side, its front still easy to read" },
    { how: "among everyday things, where it is really kept" },
    { how: "open, with what is inside in view", needs: ["out of pack", "in use"] },
    { how: "in use, in the middle of the moment", needs: ["in use", "in hand", "on body"] },
    { how: "close enough that its surface and finish show", needs: ["close up"] },
];
export const DEFAULT_AGES: [
    number,
    number
] = [20, 49];
export const STATES_AGES = /\b\d0s\b|\b\d{2}\s*(?:to|-|through)\s*\d{2}\b(?!\s*(?:minutes?|seconds?|hours?|days?|weeks?|percent|%))|\b\d{2}\s*(?:\+|plus\b|and (?:over|up|older)\b|or (?:over|older)\b)|\b(?:over|above|under|below|aged?)\s+\d{2}\b(?!\s*(?:minutes?|seconds?|hours?|days?|weeks?|percent|%))|\b\d{2}[\s-]*years?[\s-]*old\b/i;
export function adultSpan(ages: readonly [
    number,
    number
] | null | undefined): [
    number,
    number
] | null {
    if (!ages || !Number.isFinite(ages[0]) || !Number.isFinite(ages[1]))
        return null;
    const hi = Math.floor(Math.max(ages[0], ages[1]));
    return hi < 18 ? null : [Math.max(18, Math.floor(Math.min(ages[0], ages[1]))), hi];
}
export function ageAt(span: readonly [
    number,
    number
], place: number, turn = 0): number {
    const n = span[1] - span[0] + 1;
    const x = turn + place * 0.6180339887498949;
    return span[0] + Math.min(n - 1, Math.floor((x - Math.floor(x)) * n));
}
export const LOOKS = [
    "short dark hair and light brown skin",
    "long hair worn loose and pale freckled skin",
    "tight curls and deep brown skin",
    "a close-cropped or shaved head and olive skin",
    "wavy shoulder-length hair and tan skin",
    "straight hair cut at the jaw and light skin",
    "hair in braids and dark brown skin",
] as const;
export const BUILDS = ["slim", "of average build", "broad-shouldered", "heavy-set", "small and wiry"] as const;
export const GAZES = ["lens", "scene", "away"] as const;
export type Gaze = (typeof GAZES)[number];
export const GAZE_SAID: Record<Gaze, string> = { lens: "into the lens", scene: "at someone or something in the scene", away: "down or away" };
export const EXPRESSIONS: readonly {
    face: string;
    gaze: Gaze;
    low?: true;
    smile?: true;
}[] = [
    { face: "mid-chew, cheeks full, eyes down on what is in the hand", gaze: "away" },
    { face: "eyebrows up, mouth a little open, eyes on the phone", gaze: "scene" },
    { face: "one eyebrow raised, lips pressed to one side, looking into the lens", gaze: "lens" },
    { face: "eyes closed, shoulders dropped, a long breath out", gaze: "away" },
    { face: "squinting at small print, head tilted", gaze: "scene" },
    { face: "mid-laugh, head turned to someone out of frame", gaze: "scene", smile: true },
    { face: "mouth flat, jaw set, eyes on a clock", gaze: "scene", low: true },
    { face: "a half smile on one side, eyes down", gaze: "away", smile: true },
    { face: "nose wrinkled, leaning back from what they hold", gaze: "scene" },
    { face: "heavy eyelids, mouth closed, looking at nothing", gaze: "away", low: true },
    { face: "mid-word, mouth open, one hand raised, eyes on the lens", gaze: "lens" },
    { face: "a yawn half-covered by the back of a hand", gaze: "away", low: true },
    { face: "lips pursed, blowing out slowly, eyes on the ceiling", gaze: "away" },
    { face: "brow furrowed, biting the lower lip, eyes on a screen", gaze: "scene", low: true },
    { face: "chin resting in a palm, mouth slack, eyes off to one side", gaze: "away", low: true },
    { face: "eyes wide, eyebrows up, a hand stopped halfway to the mouth, caught looking at the lens", gaze: "lens" },
    { face: "eyes narrowed, head a little back, reading the back of what they hold", gaze: "scene" },
    { face: "a small nod, lips together, eyes on the task in the hands", gaze: "scene" },
    { face: "mouth open in a quiet \"oh\", eyebrows lifted, looking down", gaze: "away" },
    { face: "teeth showing in a grin, eyes creased, looking straight at the lens", gaze: "lens", smile: true },
    { face: "eyes shut tight, a hand pressed to the forehead", gaze: "away", low: true },
    { face: "tongue at the corner of the mouth, eyes fixed on what the hands are doing", gaze: "scene" },
    { face: "looking back over one shoulder, eyebrows drawn together, mouth closed", gaze: "scene" },
    { face: "cheeks puffed, breath held, eyes on the thing in front of them", gaze: "scene" },
    { face: "head back, eyes closed, mouth relaxed, shoulders loose", gaze: "away" },
    { face: "a quick sideways glance at someone beside them, one corner of the mouth pulled in", gaze: "scene" },
    { face: "lips parted, about to speak, eyes on someone out of frame", gaze: "scene" },
    { face: "a closed-mouth smile, eyes lowered to the hands", gaze: "away", smile: true },
    { face: "shoulders up by the ears, a wince, one eye half shut", gaze: "away", low: true },
    { face: "chin up, eyes on the middle distance, a slow breath in through the nose", gaze: "away" },
    { face: "eyebrows knitted, mouth twisted to one side, turning something over in the hands", gaze: "scene" },
    { face: "a laugh let out through the nose, eyes down, the head shaking a little", gaze: "away", smile: true },
    { face: "chin tucked, looking up at the lens from under the eyebrows, mouth closed", gaze: "lens" },
    { face: "mid-chew, one cheek full, eyebrows lifted at the lens", gaze: "lens" },
    { face: "head tilted, eyes narrowed at the lens, mouth pulled to one side", gaze: "lens" },
    { face: "a level look into the lens, mouth closed, jaw relaxed", gaze: "lens" },
    { face: "a glance up at the lens in the middle of a task, eyebrows a little raised", gaze: "lens" },
    { face: "tired eyes straight into the lens, mouth flat, shoulders low", gaze: "lens", low: true },
    { face: "lips pressed together holding in a laugh, eyes on the lens", gaze: "lens", smile: true },
    { face: "mouth open mid-question, eyebrows drawn together, looking into the lens", gaze: "lens" },
    { face: "a shrug, eyebrows raised, lips pushed out, eyes on the lens", gaze: "lens" },
    { face: "eyebrows flat, mouth closed, a long stare into the lens", gaze: "lens" },
];
export const showsNoLow = (never: string | null | undefined): boolean => /\b(sad(ness)?|unhappy|miserable|gloomy|depress\w*|cry(ing)?|tears?|distress\w*|suffering|in pain|pained|sick(ly|ness)?|ill(ness)?|unwell|tired|exhausted|worn[- ]out)\b/i.test(never ?? "");
export function withoutExpression(line: string): string {
    return line
        .replace(/\b(?:with|wearing)\s+(?:an?\s+)?(?:(?:big|wide|warm|bright|genuine|natural|soft|gentle|easy|real|small|broad|happy)\s+)*(?:smiles?|grins?)\b(?:\s+on\s+(?:their|her|his)\s+faces?)?/gi, "")
        .replace(/\b(?:(?:always|often|usually|genuinely|naturally|visibly|really|very)\s+)?(?:smiling|smiley|happy|happily|laughing|cheerful|cheerfully|cheery|grinning|beaming|joyful|joyous|giggling|chuckling|delighted|elated|upbeat|jolly|merry)\b(?:[- ]looking)?/gi, "")
        .replace(/\b(?:big|wide|warm|bright|genuine|natural)?\s*(?:smiles?|grins?|laughter)\b/gi, "")
        .replace(/\(\s*\)/g, "")
        .replace(/\s+([,.;:])/g, "$1")
        .replace(/([,;:])(?:\s*(?:and|or)?\s*[,;:])+/g, "$1")
        .replace(/,\s*(?:and|or)\s*$/i, "")
        .replace(/\b(and|or)\s+(?:and|or)\b/gi, "$1")
        .replace(/\s{2,}/g, " ")
        .replace(/^[\s,;:]+(?:(?:and|or)\s+)?|[\s,;:]+$/g, "")
        .replace(/\s+(?:and|or)$/i, "")
        .trim();
}
export interface DealtBuyer {
    gender?: "woman" | "man" | "";
    ages?: [
        number,
        number
    ] | null;
    life?: string;
}
export const LOOKS_BY_MARKET: Record<string, readonly number[]> = {
    us: [2, 2, 2, 1, 2, 2, 1],
    ca: [2, 2, 1, 1, 2, 2, 1],
    uk: [1, 3, 1, 1, 1, 3, 1],
    au: [1, 3, 1, 1, 2, 3, 1],
    in: [3, 1, 1, 2, 3, 1, 1],
};
export function marketKey(market: string | null | undefined): string {
    const m = (market ?? "").trim().toLowerCase().replace(/[.]/g, "");
    if (!m)
        return "";
    if (/^(us|usa|united states( of america)?|america)$/.test(m))
        return "us";
    if (/^(uk|gb|united kingdom|great britain|britain|england)$/.test(m))
        return "uk";
    if (/^(ca|canada)$/.test(m))
        return "ca";
    if (/^(au|australia)$/.test(m))
        return "au";
    if (/^(in|india)$/.test(m))
        return "in";
    return "";
}
export const PROPS = ["a mug", "a set of keys", "a phone lying face down", "an open notebook and a pen", "a glass of water", "a pair of glasses", "a houseplant", "a paperback book", "a pair of headphones", "a bowl of fruit", "a folded newspaper"] as const;
export const HEADLINE_ZONES = ["across the top", "across the bottom", "down the left side", "down the right side", "over the quiet area of the scene, wherever that falls"] as const;
const NEUTRALS = ["a neutral: white or off-white", "the place's own natural tones, with the brand's colours only as accents", "a neutral: pale warm grey or stone"];
export function groundsOf(colours: string[]): string[] {
    const own = [...new Set(colours.map((c) => c.trim()).filter(Boolean))].map((c) => `the brand's ${c}`);
    return [...own, ...NEUTRALS.slice(0, own.length >= 3 ? 1 : NEUTRALS.length)];
}
export interface Hand {
    camera: string;
    light: string;
    seen: string;
    place: string;
    person: string;
    age: number;
    ages: [
        number,
        number
    ];
    buyer?: string;
    expression: string;
    gaze: Gaze;
    prop: string;
    ground: string;
    headline: string;
}
export const HAND_PARTS = ["place", "camera", "light", "seen", "person", "expression", "prop", "ground", "headline"] as const satisfies readonly (keyof Hand)[];
export function rng(seed: string): () => number {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    let a = h >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function shuffled<T>(list: readonly T[], next: () => number): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}
const FOR_ONE = /^\s*for\b[^,:]{1,40}[,:]/i;
const STOP = /\.(?=\s|$)(?![^(]*\))/;
export function placesOf(recorded: string | null | undefined): string[] {
    return (recorded ?? "")
        .split(STOP)
        .filter((s) => !FOR_ONE.test(s))
        .flatMap((s) => s.split(/[;\n]+|,(?![^(]*\))/))
        .map((x) => x.replace(/^\s*(and|or)\s+/i, "").replace(/\.$/, "").trim())
        .filter((x) => x.length > 2 && x.length < 80);
}
const INFERRED = /\b(inferred|assum(ed|ption)|guess(ed)?|not (yet )?(captured|confirmed|observed|grounded))\b/i;
const ALL_INFERRED = /^\s*(all |these are |this is )?(inferred|assumed|a guess|not (yet )?(captured|confirmed|observed|grounded))\b/i;
export function ownPlaces(recorded: string | null | undefined): string[] {
    const text = recorded ?? "";
    if (text.split(STOP).some((s) => ALL_INFERRED.test(s)))
        return [];
    return placesOf(text).filter((p) => !INFERRED.test(p));
}
const CHILD = /\b(child(ren)?|kids?|bab(y|ies)|toddlers?|infants?|teen(ager)?s?|boys?|girls?|minors?|sons?|daughters?|pupils?|under 18)\b/i;
export function peopleOf(recorded: string | null | undefined): string[] {
    return (recorded ?? "")
        .split(/[;\n]+/)
        .flatMap((s) => s.split(STOP))
        .map((x) => x.replace(/\.$/, "").trim())
        .filter((x) => x.length > 2 && x.length < 120 && !CHILD.test(x));
}
const STRIDE = 13;
export const deckStart = (id: string): number => STRIDE * (Number(id.match(/(\d+)\D*$/)?.[1]) || 0);
export interface DealFrom {
    start?: number;
    people?: string[];
    props?: string[];
    colours?: string[];
    everyday?: readonly string[];
    buyers?: (DealtBuyer | null | undefined)[];
    market?: string | null;
    noLow?: boolean;
    ages?: readonly [
        number,
        number
    ] | null;
}
function spread<T>(many: T[], few: T[]): T[] {
    const out = [...many];
    const step = (many.length + few.length) / Math.max(1, few.length);
    few.forEach((x, j) => out.splice(Math.min(out.length, Math.round(j * step + step / 2)), 0, x));
    return out;
}
export function dealHands(seed: string, count: number, views: PhotoView[], places: string[] = [], from: DealFrom = {}): Hand[] {
    const next = rng(seed);
    const fit = <T>(list: T[]): T[] => (list.length > 1 && list.length % STRIDE === 0 ? list.slice(0, -1) : list);
    const cameras = shuffled(CAMERAS, next);
    const lights = shuffled(LIGHTS, next);
    const seen = shuffled(SEEN.filter((s) => !s.needs || s.needs.some((v) => views.includes(v))).map((s) => s.how), next);
    const everyday = from.everyday?.length ? shuffled(from.everyday, rng(`${seed}:place`)) : [];
    const where = everyday.length ? fit(spread(everyday, shuffled(places, next).slice(0, everyday.length))) : places.length >= 3 ? fit(shuffled(places, next)) : [];
    const own = <T>(name: string, list: readonly T[]): T[] => fit(shuffled(list, rng(`${seed}:${name}`)));
    const turn = rng(`${seed}:age`)();
    const weights = LOOKS_BY_MARKET[marketKey(from.market)];
    const looks = weights
        ? fit(Array.from({ length: Math.max(...weights) }, (_, r) => shuffled(LOOKS.map((_, k) => k), rng(`${seed}:look`)).filter((k) => weights[k] > r))
            .reduce<number[]>((deck, round) => [...deck, ...(deck.length && round.length > 1 && deck[deck.length - 1] === round[0] ? [...round.slice(1), round[0]] : round)], [])
            .map((k) => LOOKS[k]))
        : own("look", LOOKS);
    const builds = own("build", BUILDS);
    const kin = own("people", (from.people ?? []).map(withoutExpression).filter((x) => x.length > 2));
    const looking = shuffled(GAZES, rng(`${seed}:gaze`));
    const facesOf = Object.fromEntries(GAZES.map((g) => [g, shuffled(EXPRESSIONS.filter((e) => e.gaze === g && !(from.noLow && e.low)).map((e) => e.face), rng(`${seed}:expression:${g}`))])) as Record<Gaze, string[]>;
    const faceOf = (i: number): {
        expression: string;
        gaze: Gaze;
    } => {
        const gaze = looking[(start + i) % GAZES.length];
        return { gaze, expression: facesOf[gaze][Math.floor((start + i) / GAZES.length) % facesOf[gaze].length] };
    };
    const props = own("prop", [...new Set([...(from.props ?? []), ...PROPS])]);
    const grounds = own("ground", groundsOf(from.colours ?? []));
    const zones = own("headline", HEADLINE_ZONES);
    const start = from.start ?? 0;
    const at = <T>(list: T[], i: number): T => list[(start + i) % list.length];
    const placed = Array.from({ length: count }, (_, i) => (where.length ? at(where, i) : ""));
    if (everyday.length && count > 1) {
        const spare = everyday.filter((p) => !placed.includes(p));
        let mine = 0;
        placed.forEach((p, i) => {
            if (places.includes(p) && ++mine > Math.floor(count / 2) && spare.length)
                placed[i] = spare.shift()!;
        });
    }
    const personOf = (i: number): {
        person: string;
        age: number;
        ages: [
            number,
            number
        ];
        buyer?: string;
    } => {
        const b = from.buyers?.[i];
        const stated = adultSpan(b?.ages);
        const span = stated ?? adultSpan(from.ages) ?? DEFAULT_AGES;
        const age = ageAt(span, start + i, turn);
        const who = `${b?.gender ? `${b.gender} ` : ""}aged about ${age}`;
        const life = (b?.life ?? "").trim().replace(/[.]$/, "").slice(0, 140);
        const lived = life ? `; the buyer's own life, as their sheet gives it: "${life}"${CHILD.test(life) ? " (nobody under 18 is in the picture)" : ""}` : "";
        const said = [b?.gender ? `a ${b.gender}` : "", b?.ages ? (b.ages[0] === b.ages[1] ? `${b.ages[0]}` : `${b.ages[0]} to ${b.ages[1]}`) : ""].filter(Boolean).join(", ");
        const kinLine = kin.length ? at(kin, i) : "";
        const ofBrand = kinLine && !(stated && STATES_AGES.test(kinLine)) ? `, of the brand's own people (${kinLine})` : "";
        return { person: `${who}, with ${at(looks, i)}, ${at(builds, i)}${ofBrand}${lived}`, age, ages: span, ...(said ? { buyer: said } : {}) };
    };
    return Array.from({ length: count }, (_, i) => ({
        camera: at(cameras, i),
        light: at(lights, i),
        seen: at(seen, i),
        place: placed[i],
        ...personOf(i),
        ...faceOf(i),
        prop: at(props, i),
        ground: at(grounds, i),
        headline: at(zones, i),
    }));
}
export function handLine(h: Hand, only?: readonly (keyof Hand)[], after = ""): string {
    const has = (k: keyof Hand) => (!only || only.includes(k)) && !!h[k];
    const parts = [
        has("place") ? `the place is ${h.place}` : "",
        has("camera") ? `the camera is ${h.camera}` : "",
        has("light") ? `the light is ${h.light}` : "",
        has("seen") ? `the product, where it is in the picture, is ${h.seen}` : "",
        has("person") ? `a person, where the picture has one, is an adult ${h.person}` : "",
        has("expression") ? `the expression, where a face is seen, starts from: ${h.expression}` : "",
        has("prop") ? `1 thing of the scene is ${h.prop}` : "",
        has("ground") ? `the ground or backdrop leans to ${h.ground}` : "",
        has("headline") ? `the headline, where the layout leaves it free, sits ${h.headline}` : "",
    ];
    const start = has("place") ? " The place is a start, not a fact about the brand: where this buyer or this product could not really be there, choose a place where they could." : "";
    const who = !has("person")
        ? ""
        : h.buyer
            ? ` The person's gender and age are this ad's buyer's own (${h.buyer}): keep them. The hair, the skin and the build are dealt, so 2 ads for the same buyer do not show the same person. Always an adult, never anyone under 18.`
            : " The person is someone this ad's buyer could be: where the buyer fixes an age or who they are, the buyer stands and the rest is as dealt. Always an adult, never anyone under 18.";
    const eyes = h.gaze ? ` Where they look is dealt with it: ${GAZE_SAID[h.gaze]}. Keep it.` : "";
    const face = has("expression") ? ` The expression is a start too. Make it this exact second: what they are doing, where they look, eyebrows, eyes, mouth. It must fit the buyer's moment in this ad and what the hands are really doing.${eyes} Write it in \`expression\`. Empty where no face is seen.` : "";
    return `Dealt to this ad, so the set does not repeat itself: ${parts.filter(Boolean).join("; ")}. Build the scene on these. They give way to 3 things only: the user's direction, the rule on the product in the picture (its size, its place, or no product), and a format or a world that fixes one of them.${start}${who}${face}${after ? ` ${after}` : ""} Say in \`adaptation\` which you changed.`;
}
export function faceForPrompt(expression: string | null | undefined, o: {
    drawn?: boolean;
} = {}): string {
    const face = (expression ?? "").trim();
    if (!face || !o.drawn)
        return face;
    return `${face}${/[.!?]$/.test(face) ? "" : "."} This is the face of the drawn or made character the scene names. That character is in the picture with this face, smaller than the product and never in front of it: the rule on the product in the picture keeps photographed people out, never the character this look is drawn with.`;
}
export const DEAL_RULE = "**Each ad is dealt its own camera, light and way of seeing the product, and its own person, expression, prop, ground colour and place for the headline** (the line under it that starts \"Dealt to this ad\"). A set is looked at side by side, and so are the sets made before it: 2 pictures taken the same way, of the same person, with the same look on the face, on the same colour, read as 1. Plan each ad on its own hand. The product itself never changes: its shape, colours, label and wording are the same in every ad. How it is seen changes." +
    " The scene of an ad is one its dealt person could really be in: a detail that could not be true of them (their work, who they live with, what they carry) is changed. The scene gives way, not the person. Where the person looks is dealt too (into the lens, at someone or something in the scene, down or away) and kept, so the people of a set do not all look the same way: it gives way only where the moment makes it impossible. A drawn or made character with a face has an expression as a person does.";
