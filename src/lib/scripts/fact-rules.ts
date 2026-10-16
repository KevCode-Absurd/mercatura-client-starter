import { offersFor } from "../llm/context";
import { MONEY_WORD, currencySymbol } from "../money";
import type { AuditItem, ScriptLine } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import { isNoOffer } from "../choices";
import { dominantPerson } from "./voice-rules";
const ONES: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
export function numbersSaid(text: string): {
    n: number;
    at: string;
}[] {
    const out: {
        n: number;
        at: string;
    }[] = [];
    for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g))
        out.push({ n: Number(m[0].replace(/,/g, "")), at: m[0] });
    const words = text.toLowerCase().replace(/[’']/g, "").match(/[a-z]+(?:-[a-z]+)*/g) ?? [];
    const flat = words.flatMap((w) => w.split("-"));
    for (let i = 0; i < flat.length; i++) {
        const w = flat[i];
        let n: number | null = null;
        let used = 1;
        if (w in TENS) {
            n = TENS[w];
            if (flat[i + 1] in ONES && ONES[flat[i + 1]] < 10) {
                n += ONES[flat[i + 1]];
                used = 2;
            }
        }
        else if (w in ONES)
            n = ONES[w];
        if (n == null)
            continue;
        let at = flat.slice(i, i + used).join(" ");
        const next = flat[i + used];
        if (next === "hundred" || next === "thousand" || next === "million") {
            n *= next === "hundred" ? 100 : next === "thousand" ? 1000 : 1000000;
            at += ` ${next}`;
            used++;
        }
        out.push({ n, at });
        i += used - 1;
    }
    return out;
}
export function knownNumbers(brand: BrandBrain): Set<number> {
    return numbersHeld([...brand.claims.filter((c) => c.status === "substantiated").map((c) => `${c.text} ${c.source ?? ""}`), ...brand.offers.map((o) => `${o.name} ${o.price} ${o.per_day ?? ""} ${o.notes ?? ""}`), brand.guarantee ? `${brand.guarantee.text} ${brand.guarantee.window_days}` : "", ...brand.products.map((p) => `${p.name} ${p.format} ${(p.ingredients ?? []).map((i) => `${i.name} ${i.dose}`).join(" ")} ${(p.specs ?? []).map((x) => `${x.name} ${x.value}`).join(" ")}`), brand.proof_assets.join(" ")].join(" "));
}
export function numbersHeld(text: string): Set<number> {
    const out = new Set<number>();
    for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
        const raw = m[0].replace(/,/g, "");
        out.add(Number(raw));
        for (const part of raw.split("."))
            out.add(Number(part));
    }
    return out;
}
const isColour = (n: number, at: string, line: string) => n < 13 || (n >= 1900 && n <= 2100) || new RegExp(`${at.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(am|pm|a\\.m|p\\.m|o'clock|years? old)`, "i").test(line);
const QUALIFIERS: {
    re: RegExp;
    say: string;
}[] = [
    { re: /\bsurvey(ed)?\b/i, say: "surveyed" },
    { re: /\bup to\b/i, say: "up to" },
    { re: /\bstarts? (at|from)\b|\bfrom [$£€₹¥]/i, say: "starts at" },
    { re: /\bfirst (subscription )?order\b|\bfirst order\b/i, say: "first order" },
];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function qualifiersIn(src: string): {
    re: RegExp;
    say: string;
}[] {
    const out: {
        re: RegExp;
        say: string;
    }[] = [];
    for (const m of src.matchAll(/\bper (?:daily |single |full )?([a-z]{3,})\b/gi)) {
        const unit = m[1].toLowerCase();
        out.push({ re: new RegExp(`\\b(?:per|a|an|each|every|one|1)\\s+(?:daily |single |full )?${esc(unit)}\\b|\\bdaily ${esc(unit)}\\b`, "i"), say: `per ${unit}` });
    }
    for (const m of src.matchAll(/\b\d[\d,.]*\+?\s+([a-z]{3,}) and ([a-z]{3,})\b/gi))
        out.push({ re: new RegExp(`\\band ${esc(m[2])}\\b`, "i"), say: `and ${m[2].toLowerCase()}` });
    return out;
}
export interface FactContext {
    brand: BrandBrain;
    person?: "first" | "second" | "third";
    asked?: string;
}
export function factRuleChecks(lines: Pick<ScriptLine, "text" | "beat">[], hooks: {
    text: string;
}[], ctx: FactContext): AuditItem[] {
    const out: AuditItem[] = [];
    const known = knownNumbers(ctx.brand);
    for (const { n } of numbersSaid(ctx.asked ?? ""))
        known.add(n);
    const stray: string[] = [];
    let strayAt = -1;
    [...lines.map((l) => l.text), ...hooks.map((h) => h.text)].forEach((text, i) => {
        for (const { n, at } of numbersSaid(text)) {
            if (isColour(n, at, text) || known.has(n))
                continue;
            stray.push(`"${at}"`);
            if (strayAt < 0 && i < lines.length)
                strayAt = i;
        }
    });
    if (stray.length)
        out.push({ check: "number_source", status: "warn", message: `${[...new Set(stray)].slice(0, 4).join(", ")}: not in the brand's approved claims, offers or guarantee. If it is a fact about a product, a price or a result it needs an approved claim; if it is story colour, make sure it can't be read as one.`, ...(strayAt >= 0 ? { line_index: strayAt } : {}) });
    const sources = [...ctx.brand.claims.filter((c) => c.status === "substantiated").map((c) => c.text), ...ctx.brand.offers.map((o) => `${o.name}. ${o.price}. ${o.notes ?? ""}`), ctx.brand.guarantee?.text ?? ""].filter(Boolean);
    const dropped = new Set<string>();
    let droppedAt = -1;
    lines.forEach((l, i) => {
        const said = numbersSaid(l.text).filter((x) => !isColour(x.n, x.at, l.text)).map((x) => x.n);
        if (!said.length)
            return;
        for (const src of sources) {
            const nums = new Set<number>();
            for (const m of src.matchAll(/\d[\d,]*(?:\.\d+)?/g))
                for (const part of m[0].replace(/,/g, "").split("."))
                    nums.add(Number(part));
            if (!said.some((n) => nums.has(n)))
                continue;
            for (const q of [...QUALIFIERS, ...qualifiersIn(src)]) {
                if (q.re.test(src) && !q.re.test(l.text) && !lines.slice(Math.max(0, i - 1), i + 2).some((x) => q.re.test(x.text))) {
                    dropped.add(`"${q.say}" (in "${l.text.slice(0, 60)}")`);
                    if (droppedAt < 0)
                        droppedAt = i;
                }
            }
        }
    });
    if (dropped.size)
        out.push({ check: "qualifier_dropped", status: "warn", message: `A figure is used without the words that limit it in the brand's own claim or offer: ${[...dropped].slice(0, 3).join("; ")}. State it the way the claim does.`, line_index: droppedAt });
    const first = ctx.brand.offers.find((o) => /first/i.test(o.name));
    const all = lines.map((l) => l.text).join(" ");
    if (first) {
        const cents = first.per_day ? Math.round((first.per_day % 1) * 100) : -1;
        const quoted = numbersSaid(all).some((x) => x.n === Math.floor(first.price)) || (MONEY_WORD.test(all) && numbersSaid(all).some((x) => x.n === Math.round(first.price) || x.n === cents));
        const later = ctx.brand.offers.filter((o) => o !== first && o.price > first.price && !/one[- ]time/i.test(o.name)).sort((a, b) => a.price - b.price)[0];
        if (quoted && later && !numbersSaid(all).some((x) => x.n === Math.floor(later.price)))
            out.push({ check: "renewal_price", status: "warn", message: `The first-order price is quoted, but not what it becomes (${later.price} after the first order). A buyer who finds out at renewal asks for a refund: say both, or say "first order" plainly.`, line_index: lines.findIndex((l) => l.beat === "offer") >= 0 ? lines.findIndex((l) => l.beat === "offer") : undefined });
    }
    const g = lines.map((l, i) => (/guarantee|money[- ]back/i.test(l.text) ? i : -1)).filter((i) => i >= 0);
    if (g.length > 1)
        out.push({ check: "repeated_beat", status: "warn", message: `The guarantee is stated ${g.length} times. Once, in full, is stronger.`, line_index: g[1] });
    if (ctx.person && ctx.person !== "first") {
        const off = hooks.map((h, i) => ({ i, p: dominantPerson(`${h.text} ${h.text}`).person })).filter((x) => x.p !== "none" && x.p !== ctx.person);
        if (off.length)
            out.push({ check: "hook_person", status: "warn", message: `Hook ${off.map((x) => x.i + 1).join(", ")} ${off.length === 1 ? "is" : "are"} not in the ${ctx.person} person the script is written in. A hook that changes who is speaking doesn't lead into line 2.` });
    }
    return out;
}
const STOP = new Set("a an the and or but of to in on for with your you my our is are was were it its this that at as be by from not no do does did have has had i we they them their he she her his me so just then than into out up one about when what who how all can will would get got im youre ive id dont didnt its thats".split(" "));
const content = (s: string) => (s.toLowerCase().replace(/[’']/g, "").match(/[a-z]+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w));
export function phrases(text: string): Set<string> {
    const w = content(text);
    const out = new Set<string>();
    for (let i = 0; i < w.length - 1; i++)
        out.add(`${w[i]} ${w[i + 1]}`);
    return out;
}
const overlap = (a: string, b: string) => {
    const x = new Set(content(a));
    const y = new Set(content(b));
    if (!x.size || !y.size)
        return 0;
    const both = [...x].filter((w) => y.has(w)).length;
    return both / (x.size + y.size - both);
};
export interface Sibling {
    id: string;
    lines: Pick<ScriptLine, "text" | "beat" | "claim_ids">[];
}
const lineOf = (s: Sibling["lines"], beat: string) => s.find((l) => l.beat === beat)?.text ?? "";
const closeOf = (s: Sibling["lines"]) => s.at(-1)?.text ?? "";
const proofIds = (s: Sibling["lines"]) => [...new Set(s.filter((l) => l.beat === "proof").flatMap((l) => l.claim_ids ?? []))].sort().join(",");
export function compareSiblings(mine: Sibling["lines"], other: Sibling): {
    shared: string[];
    sameOpening: boolean;
    sameProof: boolean;
    sameClose: boolean;
} {
    const a = phrases(mine.map((l) => l.text).join(". "));
    const b = phrases(other.lines.map((l) => l.text).join(". "));
    return {
        shared: [...a].filter((p) => b.has(p)),
        sameOpening: overlap(mine[0]?.text ?? "", other.lines[0]?.text ?? "") >= 0.35 || overlap(lineOf(mine, "problem"), lineOf(other.lines, "problem")) >= 0.4,
        sameProof: !!proofIds(mine) && proofIds(mine) === proofIds(other.lines),
        sameClose: overlap(closeOf(mine), closeOf(other.lines)) >= 0.4,
    };
}
export function siblingChecks(mine: Sibling["lines"], siblings: Sibling[]): AuditItem[] {
    let worst: {
        id: string;
        score: number;
        c: ReturnType<typeof compareSiblings>;
    } | null = null;
    for (const s of siblings) {
        const c = compareSiblings(mine, s);
        const score = c.shared.length + (c.sameOpening ? 4 : 0) + (c.sameProof ? 2 : 0) + (c.sameClose ? 4 : 0);
        if (!worst || score > worst.score)
            worst = { id: s.id, score, c };
    }
    if (!worst || worst.score < 9)
        return [];
    const same = [worst.c.sameOpening ? "the opening" : "", worst.c.sameProof ? "the proof" : "", worst.c.sameClose ? "the close" : ""].filter(Boolean);
    return [{ check: "sibling_variety", status: "warn", message: `This is close to ${worst.id} told another way: ${worst.c.shared.length} shared phrases (${worst.c.shared.slice(0, 5).map((p) => `"${p}"`).join(", ")})${same.length ? `, and the same ${same.join(", ")}` : ""}. A new person or tense is not a new ad: change the opening situation, the proof or the close.` }];
}
export function siblingBrief(siblings: (Sibling & {
    title: string;
})[], brand: BrandBrain, opts: {
    strict?: boolean;
} = {}): string {
    if (!siblings.length)
        return "(none yet)";
    const counts = new Map<string, number>();
    for (const s of siblings)
        for (const p of phrases(s.lines.map((l) => l.text).join(". ")))
            counts.set(p, (counts.get(p) ?? 0) + 1);
    const owed = phrases([...brand.offers.map((o) => `${o.name}. ${o.notes ?? ""}`), brand.guarantee?.text ?? "", ...brand.products.map((p) => `${p.name}. ${p.format}. ${(p.ingredients ?? []).map((i) => `${i.name}. ${i.dose}. ${i.job}`).join(". ")}`), ...brand.claims.map((c) => c.text), brand.brand.one_liner].join(". "));
    const spelled = /\b(one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|percent|dollars?|pounds?|euros?|pence|cents?)\b/;
    const spent = [...counts.entries()].filter(([p, n]) => (n >= 2 || siblings.length === 1) && !owed.has(p) && !spelled.test(p)).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([p]) => p);
    const used = new Set(siblings.flatMap((s) => s.lines.filter((l) => l.beat === "proof" || l.beat === "mechanism").flatMap((l) => l.claim_ids ?? [])));
    const fresh = opts.strict ? brand.claims.filter((c) => c.status === "substantiated" && !used.has(c.id)) : [];
    return [
        ...siblings.slice(-5).map((s) => `- ${s.id} "${s.title}"\n  opens: "${(s.lines[0]?.text ?? "").slice(0, 110)}"\n  proof: "${lineOf(s.lines, "proof").slice(0, 90)}"\n  closes: "${closeOf(s.lines).slice(0, 90)}"`),
        "",
        "A new person, tense or register is not a new ad. This script must differ from every one above in all of these:",
        "- the opening situation (a different moment, place or object: not the one above retold),",
        "- how the mechanism is framed (a different reason to believe, or a different fact about the product),",
        `- the proof it leans on, which must still prove this script's own promise (a certificate does not prove a habit sticks)${fresh.length ? `. Approved claims no sibling has used yet: ${fresh.slice(0, 6).map((c) => `${c.id} (${c.text.slice(0, 70)})`).join("; ")}` : ""},`,
        "- the closing line (a different last thought, not the same promise reworded).",
        spent.length ? `Phrases already spent by the scripts above. Use none of them: ${spent.map((p) => `"${p}"`).join(", ")}.` : "",
    ]
        .filter(Boolean)
        .join("\n");
}
export const NO_OFFER_TERMS = "This ad makes no offer. It states no price, no discount, no gift, no deal, no deadline and no guarantee, and it does not ask for the sale. It ends on the next small step for this buyer (see how it works, find out more), or on the thought it leaves them with.";
export function offerParts(brand: BrandBrain, offerId?: string | null) {
    if (isNoOffer(offerId))
        return null;
    const cur = currencySymbol(brand.brand.currency, { local: true });
    const chosen = brand.offers.find((o) => o.id === offerId) ?? brand.offers[0];
    if (!chosen)
        return null;
    const designed = chosen.id.startsWith("off_x_");
    const product = brand.products.find((p) => offersFor(brand, p.id).some((o) => o.id === chosen.id));
    const mine = (product ? offersFor(brand, product.id) : brand.offers).filter((o) => !o.id.startsWith("off_x_"));
    const first = designed ? undefined : /first/i.test(chosen.name) ? chosen : mine.find((o) => /first/i.test(o.name));
    const later = first ? mine.filter((o) => o !== first && o.price > first.price && !/one[- ]time/i.test(o.name)).sort((a, b) => a.price - b.price)[0] : undefined;
    const notes = [first, later, first ? undefined : chosen].map((o) => o?.notes ?? "").join(" ");
    const perks = [/free shipping/i.test(notes) ? "free shipping" : "", /pause or cancel any ?time/i.test(notes) ? "pause or cancel anytime" : /cancel any ?time/i.test(notes) ? "cancel anytime" : ""].filter(Boolean);
    return { cur, chosen, first, later, guarantee: brand.guarantee?.text?.trim() ?? "", perks };
}
export function termsLine(brand: BrandBrain, offerId?: string | null): string {
    const o = offerParts(brand, offerId);
    if (!o)
        return "";
    const up = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
    const price = o.first ? `First order ${o.cur}${o.first.price}${o.later ? `, then ${o.cur}${o.later.price} for each order after` : ""}.` : `${o.cur}${o.chosen.price}.`;
    return [price, o.perks.length ? `${up(o.perks.join(", "))}.` : "", o.guarantee ? `${o.guarantee.replace(/[.\s]+$/, "")}.` : ""].filter(Boolean).join(" ");
}
export function termsBlock(brand: BrandBrain, offerId?: string | null): string {
    const o = offerParts(brand, offerId);
    if (!o)
        return "";
    const { cur, chosen, first, later } = o;
    const lines = [
        first ? `- First order: ${cur}${first.price}${first.per_day ? ` (${cur}${first.per_day} a day)` : ""}. ${first.notes ?? ""}`.trim() : `- Price: ${cur}${chosen.price}${chosen.per_day ? ` (${cur}${chosen.per_day} a day)` : ""}. ${chosen.notes ?? ""}`.trim(),
        later ? `- After the first order: ${cur}${later.price}${later.per_day ? ` (${cur}${later.per_day} a day)` : ""}. ${later.notes ?? ""}`.trim() : "",
        brand.guarantee ? `- Guarantee: ${brand.guarantee.text}` : "",
    ].filter(Boolean);
    return [
        "The terms, from the brand's offers. They are said once, in the offer and risk-reversal beats, and nowhere else in the script:",
        ...lines,
        `Rules for the terms: say the price once${later ? ", and say what it becomes after the first order in the same breath (a buyer who learns it at renewal asks for a refund)" : ""}. A per-day figure belongs to the price it comes from: never give the first-order per-day figure as the ongoing cost. State the guarantee once, with its conditions, and add none of your own. Say what happens when they tap (what they are starting, and that they can pause or cancel, if the offer says so). No other line mentions a price, a discount or the guarantee. Never write "no risk" or "risk-free".`,
    ].join("\n");
}
