import { phrases } from "../scripts/fact-rules";
import { rng, shuffled } from "../studio/deal";
export const MOMENTS = [
    "a weekday morning, already running late",
    "Sunday evening, getting the week ready",
    "the middle of the afternoon, when the day sags",
    "late at night, after everyone else is asleep",
    "a Saturday with nothing planned",
    "the first morning back after time away",
    "a lunch break, with 20 minutes to spare",
    "the evening a bill or a statement came in",
    "the night before something that matters",
    "the end of a long week, on Friday evening",
    "the hour before guests arrive",
    "packing for a trip",
    "a family visit or a holiday",
    "the first cold or hot week of the season",
    "a day off sick at home",
    "just after getting home, coat still on",
] as const;
export const PLACES = [
    "at the kitchen counter",
    "in the car, parked",
    "at a desk at work",
    "in front of the bathroom mirror",
    "in a shop aisle",
    "at a friend's place",
    "on the sofa",
    "in a hotel room",
    "at the front door, on the way out",
    "in the bedroom, by the bed",
    "at a till, paying",
    "on a train or a bus",
    "in a waiting room",
    "at a table with other people",
    "out on a walk",
    "in a changing room",
] as const;
export const WITNESSES = [
    "nobody, they are alone with it",
    "a partner who has stopped commenting",
    "a friend who says it straight",
    "a child who asks why",
    "a colleague at the next desk",
    "a parent, on the phone",
    "a stranger who is only being polite",
    "a brother or sister who does it differently",
    "someone they live with",
    "someone they want to look good in front of",
    "an old friend they have not seen in a while",
    "a neighbour, in passing",
] as const;
export const WAYS_IN = [
    "something someone said to them, word for word",
    "a thing they noticed and could not stop noticing",
    "an object: what was in their hand or in front of them",
    "a routine that broke on 1 particular day",
    "a small embarrassment they have told nobody",
    "a comparison with someone who does not have the problem",
    "a question they were asked and had no answer to",
    "something they used to do without thinking and now plan around",
    "the last thing they bought for this, and where it is now",
    "a habit they hide",
    "a decision made on the spot",
    "what they tell other people, against what is true",
] as const;
export const SELLING_WAYS = ["a plain fact about the product, said as a sentence", "the offer, said the way a friend would pass it on", "the 1 doubt that stops this buyer, answered", "what the buyer does now, beside what this asks of them"] as const;
export interface SeedQuote {
    theme: string;
    quote?: string;
}
export interface StorySeed {
    moment: string;
    place: string;
    witness: string;
    wayIn: string;
    buyer?: string;
    theme?: string;
    quote?: string;
}
export interface SeedInput {
    count: number;
    seed: string;
    start?: number;
    quotes?: SeedQuote[] | SeedQuote[][];
    buyers?: string[];
    places?: string[];
    people?: string[];
    props?: string[];
    spent?: string[];
    selling?: boolean;
}
const STRIDE = 13;
const mixed = <T>(a: T[], b: T[]): T[] => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => [a[i], b[i]]).flat().filter((x): x is T => x !== undefined);
const usable = (list: string[] = []) => list.map((x) => x.trim()).filter((x) => x.length > 2 && x.length < 60 && !/^(never|no|not|none|avoid)\b/i.test(x));
const company = (list: string[] = []) => usable(list).map((x) => x.split(/\s+for\s+|[,(:;]/)[0].trim()).filter((x) => x.length > 2 && x.split(/\s+/).length <= 5);
const AT_HOME = /getting home|sick at home|everyone else is asleep|guests arrive|packing for a trip/i;
const ALONE = /everyone else is asleep/i;
const ELSEWHERE = /\b(car|at work|shop|friend's place|hotel|till|train|bus|waiting room|changing room|on a walk|office|gym|store|restaurant|cafe|airport|street|park|table with other people|on the way out)\b/i;
export function dealSeeds(i: SeedInput): StorySeed[] {
    const next = rng(i.seed);
    const worn = (s: string) => (i.spent ?? []).some((p) => s.toLowerCase().includes(p.toLowerCase()));
    const order = (list: string[]) => ((l) => (l.length > 1 && l.length % STRIDE === 0 ? l.slice(0, -1) : l))([...list.filter((x) => !worn(x)), ...list.filter(worn)]);
    const start = i.start ?? 0;
    const at = <T>(list: T[], k: number): T => list[(start + k) % list.length];
    const moments = order(shuffled(MOMENTS, next));
    const places = order(mixed(shuffled(PLACES, next), shuffled(usable(i.places), next)));
    const witnesses = order(mixed(shuffled(WITNESSES, next), shuffled(company(i.people), next)));
    const fits = (moment: string, place: string) => !(AT_HOME.test(moment) && ELSEWHERE.test(place));
    const n = Math.max(0, i.count);
    const dealtPlaces = Array.from({ length: n }, (_, k) => at(places, k));
    for (let k = 0; k < n; k++) {
        const moment = at(moments, k);
        if (fits(moment, dealtPlaces[k]))
            continue;
        const j = dealtPlaces.findIndex((p, x) => x !== k && fits(moment, p) && fits(at(moments, x), dealtPlaces[k]));
        if (j >= 0)
            [dealtPlaces[k], dealtPlaces[j]] = [dealtPlaces[j], dealtPlaces[k]];
        else {
            const home = places.filter((p) => !ELSEWHERE.test(p));
            const atHome = home.some((p) => !worn(p)) ? home.filter((p) => !worn(p)) : home;
            if (atHome.length)
                dealtPlaces[k] = atHome[(start + k) % atHome.length];
        }
    }
    const placeFor = (_moment: string, k: number): string => dealtPlaces[k];
    const ways = order(mixed(shuffled([...WAYS_IN, ...(i.selling ? SELLING_WAYS : [])], next), shuffled(usable(i.props).map((p) => `an object: ${p}`), next)));
    const buyers = (i.buyers ?? []).length > 1 ? shuffled(i.buyers!, next) : [];
    const perText = Array.isArray(i.quotes?.[0]);
    const pool = perText ? [] : shuffled((i.quotes ?? []) as SeedQuote[], next);
    const taken = new Set<string>();
    return Array.from({ length: Math.max(0, i.count) }, (_, k) => {
        const own = perText ? ((i.quotes as SeedQuote[][])[k] ?? []) : [];
        const q = perText ? (own.find((x) => !taken.has(x.theme)) ?? own[0]) : pool.length ? at(pool, k) : undefined;
        if (q)
            taken.add(q.theme);
        return { moment: at(moments, k), place: placeFor(at(moments, k), k), witness: ALONE.test(at(moments, k)) ? WITNESSES[0] : at(witnesses, k), wayIn: at(ways, k), ...(buyers.length ? { buyer: at(buyers, k) } : {}), ...(q ? { theme: q.theme, ...(q.quote ? { quote: q.quote } : {}) } : {}) };
    });
}
const scene = (s: StorySeed) => `${s.moment}, ${s.place}`;
const leanOn = (s: StorySeed) => (s.theme ? `From the research, lean on "${s.theme}"${s.quote ? `, in a customer's own words: "${s.quote}"` : ""}.` : "");
const FREEDOM = "The details are yours: make the scene real and specific, change any part that could not be true of this buyer, and take the story wherever it goes from there. A metaphor or a joke is welcome where the brand's voice has room for it.";
export function seedBlock(seeds: StorySeed[], k: number): string {
    const s = seeds[k];
    if (!s)
        return "";
    const others = seeds.filter((_, j) => j !== k).map(scene);
    return [
        "## This text's story starts here",
        `When and where: ${scene(s)}. Who else is there: ${s.witness}. The way in: ${s.wayIn}.`,
        s.buyer ? `It is told for ${s.buyer}.` : "",
        leanOn(s),
        others.length ? `The other texts of this run start in these moments, so do not tell them: ${others.join("; ")}.` : "",
        FREEDOM,
    ]
        .filter(Boolean)
        .join("\n");
}
export function seedsBlock(seeds: StorySeed[], o: {
    one: string;
    fixed?: string;
    short?: boolean;
}): string {
    if (!seeds.length)
        return "";
    const line = (s: StorySeed) => (o.short ? [`the way in is ${s.wayIn}`, `the moment is ${s.moment}`, s.buyer ? `for ${s.buyer}` : "", s.theme ? `leaning on "${s.theme}"` : ""] : [`${scene(s)}`, `with ${s.witness}`, `the way in is ${s.wayIn}`, s.buyer ? `for ${s.buyer}` : "", s.theme ? `leaning on "${s.theme}"${s.quote ? ` ("${s.quote}")` : ""}` : ""]).filter(Boolean).join("; ");
    return ["## Where each one starts", `Dealt 1 to each, in order, so no 2 start in the same place. ${o.fixed ?? ""}`.trim(), ...seeds.map((s, k) => `${o.one} ${k + 1}: ${line(s)}.`), FREEDOM].join("\n");
}
export const rotated = <T>(list: T[], by: number): T[] => (list.length ? [...list.slice(by % list.length), ...list.slice(0, by % list.length)] : list);
const SPELLED = /\b(one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|percent|dollars?|pounds?|euros?|pence|cents?|grams?|milligrams?|ounces?|calories?)\b/;
const runsOf = (text: string): Set<string> => {
    const out = new Set<string>();
    for (const sentence of text.toLowerCase().replace(/’/g, "'").split(/[.!?;:\n"“”()]+/)) {
        const w = sentence.match(/[\p{L}\p{N}]+(?:'[\p{L}]+)?/gu) ?? [];
        for (let n = 3; n <= 6; n++)
            for (let i = 0; i + n <= w.length; i++)
                out.add(w.slice(i, i + n).join(" "));
    }
    return out;
};
export function spentPhrases(texts: string[], owed: string, o: {
    earlier?: string[];
    names?: string[];
    max?: number;
} = {}): string[] {
    const all = [...(o.earlier ?? []), ...texts].filter((t) => t.trim());
    const counts = new Map<string, number>();
    const inRun = new Map<string, number>();
    all.forEach((t, k) => {
        for (const r of runsOf(t)) {
            counts.set(r, (counts.get(r) ?? 0) + 1);
            if (k < (o.earlier?.length ?? 0))
                inRun.set(r, (inRun.get(r) ?? 0) + 1);
        }
    });
    const owedPairs = phrases(owed);
    const nameWords = (o.names ?? []).flatMap((n) => n.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 3);
    const free = (r: string) => {
        const pairs = [...phrases(r)];
        return pairs.length > 0 && !/\d/.test(r) && !SPELLED.test(r) && !pairs.some((p) => owedPairs.has(p)) && !r.split(" ").some((w) => nameWords.includes(w));
    };
    const kept: string[] = [];
    const threes = (r: string) => r.split(" ").map((_, k, w) => w.slice(k, k + 3).join(" ")).filter((t) => t.split(" ").length === 3);
    const said = new Set<string>();
    for (const [r] of [...counts.entries()].filter(([r, n]) => (n >= 3 || (inRun.get(r) ?? 0) >= 2) && free(r)).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)) {
        if (threes(r).some((t) => said.has(t)))
            continue;
        for (const t of threes(r))
            said.add(t);
        kept.push(r);
        if (kept.length >= (o.max ?? 12))
            break;
    }
    return kept;
}
export const spentLine = (spent: string[]): string => (spent.length ? `Said already in recent ads, so say it another way: ${spent.map((p) => `"${p}"`).join(", ")}.` : "");
