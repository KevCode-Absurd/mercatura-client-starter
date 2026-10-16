import { readWho } from "../production/deal";
import { STATES_AGES, adultSpan, peopleOf, type DealtBuyer } from "./deal";
type Seen = {
    gender: "woman" | "man" | "";
    ages: [
        number,
        number
    ] | null;
};
export function buyerFrom(who: {
    age?: string | null;
    gender?: string | null;
    life?: string | null;
} | null | undefined): DealtBuyer | null {
    const read = readWho(who);
    if (!read.gender && !read.ages)
        return null;
    const life = (who?.life ?? "").trim();
    return { gender: read.gender, ages: read.ages, ...(life ? { life } : {}) };
}
export function agesOfPeople(recorded: string | null | undefined): [
    number,
    number
] | null {
    for (const line of peopleOf(recorded)) {
        const ages = STATES_AGES.test(line) ? readWho({ age: line }).ages : null;
        if (ages)
            return ages;
    }
    return null;
}
export function agesOfSet(o: {
    people?: string | null;
    cast?: readonly [
        number,
        number
    ] | null;
}): [
    number,
    number
] | null {
    return agesOfPeople(o.people) ?? adultSpan(o.cast);
}
export function castOver(buyer: DealtBuyer | null | undefined, chosen: readonly [
    number,
    number
] | null | undefined): DealtBuyer | null {
    const ages = adultSpan(chosen);
    return ages ? { ...(buyer ?? {}), ages } : (buyer ?? null);
}
export function buyerSaid(b: DealtBuyer | null | undefined): string {
    if (!b)
        return "";
    const span = b.ages ? (b.ages[0] === b.ages[1] ? `about ${b.ages[0]}` : `${b.ages[0]} to ${b.ages[1]}`) : "";
    return [span, b.gender ? `a ${b.gender}` : ""].filter(Boolean).join(", ");
}
const SHE = /\b(wom[ae]n|females?|lady|ladies|mothers?|mums?|moms?|wife|wives|girlfriend|she|her|hers|herself)\b/i;
const HE = /\b(m[ae]n|males?|guys?|fathers?|dads?|husbands?|boyfriend|he|him|his|himself)\b/i;
const DECADE_WORDS: Record<string, number> = { twenties: 20, thirties: 30, forties: 40, fifties: 50, sixties: 60, seventies: 70, eighties: 80 };
export function personIn(text: string | null | undefined): Seen {
    const t = (text ?? "").toLowerCase();
    const she = SHE.test(t);
    const he = HE.test(t);
    const spans: [
        number,
        number
    ][] = [];
    for (const m of t.matchAll(/\b(early|mid|late)?[\s-]*(\d)0s\b/g)) {
        const d = Number(m[2]) * 10;
        if (d >= 20 && d <= 90)
            spans.push(m[1] === "early" ? [d, d + 3] : m[1] === "mid" ? [d + 3, d + 7] : m[1] === "late" ? [d + 6, d + 9] : [d, d + 9]);
    }
    for (const m of t.matchAll(/\b(twenties|thirties|forties|fifties|sixties|seventies|eighties)\b/g))
        spans.push([DECADE_WORDS[m[1]], DECADE_WORDS[m[1]] + 9]);
    for (const m of t.matchAll(/\b(\d{2})[\s-]*years?[\s-]*old\b|\baged?\s+(?:about\s+|around\s+)?(\d{2})\b/g)) {
        const n = Number(m[1] ?? m[2]);
        if (n >= 18)
            spans.push([n, n]);
    }
    return { gender: she === he ? "" : she ? "woman" : "man", ages: spans.length ? [Math.min(...spans.map((x) => x[0])), Math.max(...spans.map((x) => x[1]))] : null };
}
export const personOnSheet = (sheet: {
    gender?: string | null;
    age?: string | null;
} | null | undefined): Seen => readWho(sheet);
const band = (age: number): number => Math.min(7, Math.max(2, Math.floor(age / 10)));
export function personMismatch(seen: Seen, buyer: DealtBuyer | null | undefined): string {
    if (!buyer)
        return "";
    const why: string[] = [];
    if (seen.gender && buyer.gender && seen.gender !== buyer.gender)
        why.push(`a ${seen.gender} where the buyer is a ${buyer.gender}`);
    if (seen.ages && buyer.ages) {
        const gap = Math.max(band(seen.ages[0]) - band(buyer.ages[1]), band(buyer.ages[0]) - band(seen.ages[1]), 0);
        if (gap > 1)
            why.push(`${seen.ages[0] === seen.ages[1] ? `aged ${seen.ages[0]}` : `aged ${seen.ages[0]} to ${seen.ages[1]}`} where the buyer is ${buyer.ages[0]} to ${buyer.ages[1]}`);
    }
    return why.join(", ");
}
export const fixedByHand = (direction: string | null | undefined): boolean => {
    const said = personIn(direction);
    return !!said.gender || !!said.ages;
};
export const personLine = (person: string): string => `An adult ${person}. This is who the person in the picture is: the buyer this ad is for. Where \`scene\` describes someone of another gender or age, this line stands.`;
export function recheckPerson(o: {
    said: string;
    buyer: DealtBuyer | null | undefined;
    direction?: string | null;
    redeal: () => string;
}): {
    person: string;
    why: string;
} | null {
    if (!o.buyer || fixedByHand(o.direction))
        return null;
    const why = personMismatch(personIn(o.said), o.buyer);
    return why ? { person: personLine(o.redeal()), why } : null;
}
