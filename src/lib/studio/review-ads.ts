import type { MinedAngle } from "../angles/library";
import { JOB_INFO } from "../taxonomy";
import { ARCHETYPES, archetypeOf, WORLDS } from "./worlds";
export interface ReviewPick {
    world: string;
    mode: string;
    archetype: string;
    label: string;
    reason: string;
    direction: string;
}
export function reviewFormatsFor(job: MinedAngle["job"]): string[] {
    const kinds = ARCHETYPES.filter((a) => a.funnel === "review");
    const first = kinds.filter((a) => a.jobs?.includes(job));
    const rest = kinds.filter((a) => !a.jobs?.includes(job));
    return [...first, ...rest].map((a) => a.id);
}
export function headlineFrom(quote: string, max = 40): string {
    const clean = quote.replace(/\s+/g, " ").trim();
    if (clean.length <= max)
        return clean;
    const cut = clean.slice(0, max + 1);
    const at = cut.lastIndexOf(" ");
    return (at > 10 ? cut.slice(0, at) : cut.slice(0, max)).replace(/[,;:]+$/, "");
}
const quoteOf = (a: MinedAngle) => `"${a.best.quote}" (${a.best.ref})`;
export function reviewNote(a: MinedAngle): string {
    const backups = a.backups.map((b) => `"${b.quote}" (${b.ref})`);
    return [
        `THEIR WORDS, EXACTLY: ${quoteOf(a)}`,
        `The angle: ${a.label} (${JOB_INFO[a.job].n} ${JOB_INFO[a.job].label.toLowerCase()}), said by ${a.frequency} separate source${a.frequency === 1 ? "" : "s"}. ${a.summary}`,
        backups.length ? `Other buyers, for the feed copy, each from a different source: ${backups.join("; ")}` : "",
        a.best.incentivised ? "The reviewer was given the product: say so beside the quote wherever it is used." : "",
        a.best.verified === false ? "The quote is from an unverified review: it may be shown, but the set is not for paid traffic until a verified phrase replaces it." : "",
    ]
        .filter(Boolean)
        .join("\n");
}
export function lockedPhrase(notes: string | null | undefined): {
    quote: string;
    ref: string;
} | null {
    const m = (notes ?? "").match(/THEIR WORDS, EXACTLY: "([^"]+)" \(([A-Z]-\d+)\)/);
    return m ? { quote: m[1], ref: m[2] } : null;
}
export function reviewPicks(a: MinedAngle, n: number): ReviewPick[] {
    const used = new Set<string>();
    const out: ReviewPick[] = [];
    for (const id of reviewFormatsFor(a.job).slice(0, Math.max(1, Math.min(n, 7)))) {
        const k = archetypeOf(id)!;
        const world = [...k.worlds, ...WORLDS.map((w) => w.id)].find((w) => !used.has(w))!;
        used.add(world);
        out.push({
            world,
            mode: k.mode,
            archetype: k.id,
            label: `${k.label}: ${a.label}`,
            reason: `${k.label}, carrying "${headlineFrom(a.best.quote, 60)}" (${a.best.ref})`,
            direction: [
                `FORMAT: ${k.label}. ${k.picture} ${k.words}`,
                `THE PHRASE, character for character, as the \`quote\` text element: ${quoteOf(a)}. It is the biggest text on the image. Not one word changed, trimmed only at a word boundary if the format cannot hold it whole, and then say so in \`adaptation\`.`,
                k.id === "strikethrough" ? "The struck-out line is the brand's own nearest line from its site or ads, or a plain category claim; never a competitor's words." : "",
                k.id === "qa_card" ? "The question is the doubt in a buyer's words (the objection list); the answer is the phrase." : "",
                k.id === "side_by_side" ? "Both halves are buyers' words: the before from the failed fix or the villain, the after from the phrase. No pictures of a person's body before and after." : "",
                "The attribution is only what the source holds: a first name if the export has one, else nothing. No invented name, initial or city.",
            ]
                .filter(Boolean)
                .join(" "),
        });
    }
    return out;
}
export interface ReviewFault {
    check: "review_headline" | "review_quote_missing" | "review_quote_changed";
    what: string;
}
export function reviewFaults(locked: {
    quote: string;
} | null, plan: {
    text_elements: {
        role: string;
        text: string;
    }[];
    ad_copy?: {
        headline: string;
    } | null;
}): ReviewFault[] {
    if (!locked)
        return [];
    const norm = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
    const q = norm(locked.quote);
    const out: ReviewFault[] = [];
    const quotes = plan.text_elements.filter((t) => t.role === "quote");
    if (!quotes.length)
        out.push({ check: "review_quote_missing", what: "has no quote on the image: the phrase is the ad" });
    else if (!quotes.some((t) => q.includes(norm(t.text).replace(/^"|"$/g, "")) && norm(t.text).replace(/^"|"$/g, "").length >= Math.min(q.length, 12)))
        out.push({ check: "review_quote_changed", what: `quote on the image is not the phrase word for word: "${quotes[0].text.slice(0, 60)}"` });
    const h = plan.ad_copy?.headline ? norm(plan.ad_copy.headline).replace(/^"|"$/g, "").replace(/[.…]+$/, "") : "";
    if (h && !q.includes(h))
        out.push({ check: "review_headline", what: `feed headline "${plan.ad_copy!.headline.slice(0, 50)}" is not the phrase trimmed at a word boundary` });
    return out;
}
export const REVIEW_AD_RULES = `## Rules for ads in their words

- Every ad of this set carries the 1 phrase under THEIR WORDS, EXACTLY in the notes, as a \`quote\` text element, character for character: its typos, its lowercase, its grammar. It is the biggest text on the image. If the format cannot hold it whole, trim at a word boundary and say so in \`adaptation\`; never reword it.
- The ad's argument is the phrase. Your other words on the image are plainer than it: a question, a label, a struck-out line, a small attribution. If your line is the most interesting line on the ad, cut it.
- The feed copy: \`headline\` is the phrase, trimmed at a word boundary to 40 characters or fewer, never reworded. \`primary_text\` is 60 to 110 words: open with an identity or trigger line, quote at least 2 of the other buyers given in the notes (different sources, in quotation marks), then 1 plain call to action; one quote, one plain sentence, one quote, never 3 quotes in a row. \`description\` answers the doubt in the objection list, under 30 characters; never a discount.
- One angle per ad. Nothing from a second theme.
- Attribution is only what the source holds. No invented name, initial, city or star count. A reviewer the notes say was given the product is marked so beside the quote.
- No exclamation marks, no em dashes, none of: game-changer, elevate, unlock, transform.`;
export const REVIEW_WORDS_RULE = `- This is a set in a buyer's words: the \`quote\` slot of every item holds the phrase under THEIR WORDS, EXACTLY in the notes, unchanged. The feed headline is that phrase trimmed at a word boundary, never reworded. The primary text quotes 2 of the other buyers in the notes, in quotation marks, from different sources, with your plain sentences between them.`;
