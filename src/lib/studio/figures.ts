import type { BrandBrain } from "../brand-brain";
import { isWholeBrand } from "../choices";
import { countedOf, heldFrom, unitsOf } from "../copy/figures";
import { claimsOfProduct, offersFor } from "../llm/context";
import { currencySymbol } from "../money";
import { figuresIn } from "../scripts/fact-check";
type Text = {
    role: string;
    text: string;
};
export type FigureStatus = "held" | "said_another_way" | "worked_out" | "not_found" | "story";
export interface FigureRow {
    text: string;
    role: string;
    figure: string;
    status: FigureStatus;
    held?: string;
    sum?: string;
    was?: string;
    note: string;
}
export interface HeldLine {
    text: string;
    from: "claim" | "offer" | "guarantee" | "product" | "proof" | "script";
}
export interface HeldMaterial {
    lines: HeldLine[];
    prices: {
        amount: number;
        line: string;
    }[];
    counts: number[];
    words: Set<string>;
    symbol: string;
}
const PLACEHOLDER = /\[[^\]]+\]/;
const QUOTE_ROLE = /quote|review|testimonial/i;
const singular = (w: string) => {
    const x = w.toLowerCase();
    return x.endsWith("ies") && x.length > 4 ? `${x.slice(0, -3)}y` : /(ch|sh|x|ss)es$/.test(x) ? x.slice(0, -2) : x.endsWith("s") && !x.endsWith("ss") && x.length > 3 ? x.slice(0, -1) : x;
};
const wordsOf = (s: string) => (s.toLowerCase().match(/[\p{L}]{3,}/gu) ?? []).map(singular);
const PROOF_NOUNS = "review rating star customer user buyer subscriber member study trial participant ingredient vitamin mineral nutrient doctor dermatologist dentist vet expert award".split(" ");
const TIME_NOUN = /^(?:year|yr|month|week|day|night|morning|evening|hour|hr|minute|min|second|sec|time)$/;
export function heldMaterial(brand: BrandBrain, productId?: string | null, also: string[] = []): HeldMaterial {
    const whole = !productId || isWholeBrand(productId);
    const products = whole ? brand.products : brand.products.filter((p) => p.id === productId);
    const offers = whole ? brand.offers : offersFor(brand, productId);
    const symbol = currencySymbol(brand.brand.currency, { local: true });
    const offerLine = (o: BrandBrain["offers"][number]) => `${o.name}: ${symbol}${o.price}${o.per_day ? `, ${symbol}${o.per_day} a day` : ""}.${o.notes ? ` ${o.notes}` : ""}`;
    const lines: HeldLine[] = [
        ...claimsOfProduct(brand, whole ? undefined : productId).map((c): HeldLine => ({ text: c.text, from: "claim" })),
        ...offers.map((o): HeldLine => ({ text: offerLine(o), from: "offer" })),
        ...(brand.guarantee ? [{ text: brand.guarantee.text, from: "guarantee" } as HeldLine] : []),
        ...products.flatMap((p): HeldLine[] => [{ text: `${p.name}: ${p.format}${p.counted ? ` ${p.counted}` : ""}`, from: "product" }, ...(p.ingredients ?? []).map((i): HeldLine => ({ text: `${i.name}: ${i.dose}`, from: "product" })), ...(p.specs ?? []).map((x): HeldLine => ({ text: `${x.name}: ${x.value}`, from: "product" }))]),
        ...brand.proof_assets.map((text): HeldLine => ({ text, from: "proof" })),
        ...also.map((text): HeldLine => ({ text, from: "script" })),
    ]
        .map((l) => ({ ...l, text: l.text.replace(/\s+/g, " ").trim() }))
        .filter((l) => l.text);
    const counted = countedOf(brand, whole ? null : productId);
    const read = heldFrom(counted.held, "", { units: counted.units });
    const counts = [...read.ties.keys()].filter((k) => k.startsWith("count:")).map((k) => Number(k.slice(6))).filter((n) => n >= 2);
    const words = new Set([...wordsOf(brand.brand.category ?? ""), ...counted.units, ...read.counted, ...read.measured, ...PROOF_NOUNS]);
    return { lines, prices: offers.map((o) => ({ amount: o.price, line: offerLine(o) })), counts: [...new Set(counts)], words, symbol };
}
const ONES: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const UNITS: Record<string, number> = { one: 1, ...ONES };
const NUMBER_WORD = new RegExp(`\\b(${Object.keys(TENS).join("|")})(?:[- ](${Object.keys(UNITS).filter((w) => UNITS[w] < 10).join("|")}))?\\b|\\b(${Object.keys(ONES).join("|")})\\b`, "gi");
export const inDigits = (text: string): string => text.replace(NUMBER_WORD, (_m, tens?: string, unit?: string, ones?: string) => String(tens ? TENS[tens.toLowerCase()] + (unit ? UNITS[unit.toLowerCase()] : 0) : ONES[ones!.toLowerCase()]));
type Kind = "money" | "percent" | "measure" | "count";
interface Hit {
    figure: string;
    n: number;
    kind: Kind;
    unit: string;
    nouns: string[];
    perDay: boolean;
}
const MONEY_BEFORE = /[$£€₹¥]\s?$/;
const MONEY_AFTER = /^\s?(?:dollars?|bucks|pounds?|euros?|cents|pence|quid)\b/i;
const UNIT_AFTER = /^\s?(mcg|mg|kg|g|grams?|ml|l|oz|lbs?|iu|k?cal|x)\b/i;
const PER_DAY = /^\s*(?:a|per|each|every)[ -]day\b|^\s*\/\s?day\b/i;
const RUN_STOP = /^(?:in|on|per|a|an|and|or|for|from|with|to|at|by|of|vs|versus|than|each|every|that|which|is|are|was|were|the|off|as|it|you|your|i|my|we|our|not|no)$/i;
function runAfter(after: string): string[] {
    const out: string[] = [];
    const said = after.replace(/^[\s+-]+/, "").replace(/^of\s+/i, "");
    for (const w of said.match(/^(?:[\p{L}'’-]+[ ]*){1,4}/u)?.[0].trim().split(/[\s-]+/) ?? []) {
        if (RUN_STOP.test(w) || out.length === 3)
            break;
        out.push(singular(w));
    }
    return out;
}
const sameUnit = (a: string, b: string) => a.toLowerCase().replace(/^grams?$/, "g") === b.toLowerCase().replace(/^grams?$/, "g");
function readAt(text: string, start: number, raw: string): Hit {
    const before = text.slice(0, start);
    const after = text.slice(start + raw.length);
    const n = Number(raw.replace(/[,%]/g, ""));
    const money = MONEY_BEFORE.test(before) || MONEY_AFTER.test(after);
    const unit = money || raw.endsWith("%") ? null : after.match(UNIT_AFTER);
    const kind: Kind = raw.endsWith("%") || /^\s?percent\b/i.test(after) ? "percent" : money ? "money" : unit ? "measure" : "count";
    const nouns = runAfter(unit ? after.slice(unit[0].length) : after);
    const sign = before.match(/[$£€₹¥]\s?$/)?.[0].trim() ?? "";
    const counted = after.match(/^(-?)\s*\+?\s*((?:[\p{L}'’]+[ -]?){1,2})/u);
    const named = (counted?.[2] ?? "").trim().split(/[\s-]+/).filter((w) => w && !RUN_STOP.test(w)).map((w) => w.toLowerCase());
    const thing = named.slice(0, /s$/.test(named[0] ?? "") || named.length < 2 ? 1 : 2).join(" ");
    const label = kind === "money" ? `${sign}${raw}` : kind === "percent" ? (raw.endsWith("%") ? raw : `${raw}%`) : kind === "measure" ? `${raw}${unit![1].toLowerCase()}` : nouns.length && named.length ? (counted![1] ? `${raw}-${named[0]}` : `${raw} ${thing}`) : raw;
    return { figure: label.trim(), n, kind, unit: unit?.[1].toLowerCase() ?? "", nouns, perDay: kind === "money" && PER_DAY.test(after) };
}
export function figuresOfLine(line: string): Hit[] {
    const text = inDigits(line);
    const runs = [...text.matchAll(/\d[\d,.]*%?/g)].map((m) => ({ at: m.index!, raw: m[0].replace(/[.,]+$/, "") }));
    const out: Hit[] = [];
    for (const r of runs) {
        const clock = (o: {
            at: number;
            raw: string;
        }) => (o.at < r.at ? text.slice(o.at + o.raw.length, r.at) : text.slice(r.at + r.raw.length, o.at)) === ":";
        let probe = text;
        for (const o of runs)
            if (o !== r && !clock(o))
                probe = `${probe.slice(0, o.at)}${"#".repeat(o.raw.length)}${probe.slice(o.at + o.raw.length)}`;
        if (!figuresIn(probe).includes(r.raw))
            continue;
        out.push(readAt(text, r.at, r.raw));
    }
    return out;
}
const VERSUS = /\b(?:vs\.?|versus|than|compared (?:to|with)|against)\b/i;
const ENTRY_PRICE = /\bfirst\b|\bstarts?\b|\bstarting\b|\bfrom\b|\bnew (?:customers?|subscribers?|buyers?|members?)\b/i;
const ASKED = /\bsurvey|\bpolled\b|\basked\b|\brespondents?\b/i;
const firstPerson = (s: string) => /(?<![\p{L}'’])I(?:['’](?:m|ve|d|ll))?(?![\p{L}])/u.test(s) || /\b(?:my|me|mine|myself)\b/i.test(s);
const TO_THE_BUYER = /\b(?:you|your|yours|you['’](?:re|ve|ll|d))\b/i;
const STANDS_IN = /\breplac\w*|\binstead of\b|\btrad(?:e|es|ed|ing)\b|\bswap\w*|\b(?:job|work) of\b/i;
const sentenceAt = (text: string, at: number): string => {
    let from = 0;
    for (const s of text.split(/(?<=[.!?])\s+/)) {
        if (at < from + s.length + 1)
            return s.trim();
        from += s.length + 1;
    }
    return text.trim();
};
const clip = (s: string, max = 240) => (s.length > max ? `${s.slice(0, max).replace(/\s+\S*$/, "")}…` : s);
interface Found {
    line: HeldLine;
    sentence: string;
    stated: boolean;
}
function foundIn(hit: Hit, adLine: string, whole: string, held: HeldMaterial): Found[] {
    const out: Found[] = [];
    for (const line of held.lines) {
        for (const m of line.text.matchAll(/\d[\d,]*(?:\.\d+)?%?/g)) {
            const raw = m[0].replace(/,+$/, "");
            if (Number(raw.replace(/[,%]/g, "")) !== hit.n)
                continue;
            const there = readAt(line.text, m.index!, raw);
            if (there.kind !== hit.kind)
                continue;
            if (hit.kind === "measure" && (!sameUnit(there.unit, hit.unit) || (hit.nouns.length > 0 && there.nouns.length > 0 && !hit.nouns.some((w) => there.nouns.includes(w)))))
                continue;
            if (hit.kind === "count" && hit.nouns.length > 0 && !hit.nouns.some((w) => there.nouns.includes(w)))
                continue;
            const before = line.text.slice(0, m.index!);
            const after = line.text.slice(m.index! + raw.length);
            const sentence = sentenceAt(line.text, m.index!);
            const pair = after.match(/^[\s+-]*([\p{L}]{3,})\s+and\s+([\p{L}]{3,})\b/u);
            const changed = (VERSUS.test(adLine) && !VERSUS.test(sentence)) ||
                (hit.kind === "money" && hit.perDay !== there.perDay) ||
                (/\bup to\s*[$£€₹¥]?\s?$/i.test(before) && !/\bup to\b|\bas much as\b/i.test(whole)) ||
                (hit.kind === "money" && (/\b(?:starts?|starting)\s+(?:at|from)\s*[$£€₹¥]?\s?$/i.test(before) || /\bfirst\b/i.test(sentence)) && !ENTRY_PRICE.test(whole)) ||
                (hit.kind === "percent" && ASKED.test(line.text) && !ASKED.test(whole)) ||
                (!!pair && hit.nouns.includes(singular(pair[1])) && !new RegExp(`\\b${pair[2]}\\b`, "i").test(adLine));
            out.push({ line, sentence, stated: !changed });
        }
    }
    return out;
}
function workedOut(hit: Hit, held: HeldMaterial): {
    sum: string;
    held: string;
} | null {
    const s = held.symbol;
    for (const p of held.prices)
        for (const c of held.counts)
            if (hit.n < p.amount && Math.abs(p.amount / c - hit.n) < 0.0105)
                return { sum: `${s}${p.amount} / ${c} = ${s}${(p.amount / c).toFixed(2)}`, held: p.line };
    for (const a of held.prices)
        for (const b of held.prices)
            if (a.amount > b.amount && Math.abs(a.amount - b.amount - hit.n) < 0.005)
                return { sum: `${s}${a.amount} - ${s}${b.amount} = ${s}${(a.amount - b.amount).toFixed(2)}`, held: a.line };
    return null;
}
function isStory(hit: Hit, t: Text, held: HeldMaterial): boolean {
    if (QUOTE_ROLE.test(t.role) || firstPerson(t.text))
        return true;
    if (hit.kind !== "count" || !hit.nouns.length)
        return false;
    if (hit.nouns.some((w) => held.words.has(w) || unitsOf(w).length > 0) || STANDS_IN.test(t.text))
        return false;
    return hit.nouns.every((w) => TIME_NOUN.test(w)) ? TO_THE_BUYER.test(t.text) : true;
}
const NOTE: Record<FigureStatus, (r: Pick<FigureRow, "held" | "sum">) => string> = {
    held: () => "On file, as the brand states it.",
    said_another_way: (r) => `On file, said another way. The brand's own sentence: "${r.held}"`,
    worked_out: (r) => `Worked out from a price on file: ${r.sum}. On file: "${r.held}"`,
    not_found: () => "Not in the brand's material.",
    story: () => "The buyer's own, not a claim.",
};
export function figuresOn(texts: Text[], held: HeldMaterial): FigureRow[] {
    const whole = texts.map((t) => t.text).join(" \n ");
    const out: FigureRow[] = [];
    for (const t of texts) {
        if (!t.text.trim() || PLACEHOLDER.test(t.text))
            continue;
        for (const hit of figuresOfLine(t.text)) {
            if (out.some((r) => r.text === t.text && r.figure === hit.figure))
                continue;
            const row = (status: FigureStatus, more: Pick<FigureRow, "held" | "sum"> = {}): FigureRow => ({ text: t.text, role: t.role, figure: hit.figure, status, ...more, note: NOTE[status](more) });
            if (QUOTE_ROLE.test(t.role)) {
                out.push(row("story"));
                continue;
            }
            const found = foundIn(hit, inDigits(t.text), inDigits(whole), held);
            const stated = found.find((f) => f.stated);
            if (stated)
                out.push(row("held", { held: clip(stated.sentence) }));
            else if (found.length)
                out.push(row("said_another_way", { held: clip([...found].sort((a, b) => Number(b.line.from === "claim") - Number(a.line.from === "claim") || a.sentence.length - b.sentence.length)[0].sentence) }));
            else {
                const sum = hit.kind === "money" ? workedOut(hit, held) : null;
                if (sum)
                    out.push(row("worked_out", { sum: sum.sum, held: clip(sum.held) }));
                else
                    out.push(row(isStory(hit, t, held) ? "story" : "not_found"));
            }
        }
    }
    return out;
}
export const notFound = (rows: FigureRow[]): FigureRow[] => rows.filter((r) => r.status === "not_found");
export function figureAsk(row: FigureRow, lineNo: number, held: HeldMaterial): string {
    const hit = figuresOfLine(row.text).find((h) => h.figure === row.figure);
    const near = hit?.kind === "money" ? held.prices.slice(0, 2).map((p) => p.line) : hit?.nouns.length ? held.lines.filter((l) => figuresOfLine(l.text).some((h) => h.kind === hit.kind && h.nouns.some((w) => hit.nouns.includes(w)))).slice(0, 2).map((l) => l.text) : [];
    return `"${row.figure}" in line ${lineNo} is a figure the brand's material does not hold. Say that line without the figure${near.length ? `, or with the figure the brand holds (${near.map((x) => `"${clip(x, 160)}"`).join("; ")})` : ""}. Keep what the line argues.`;
}
export function afterMend(first: FigureRow[], was: Text[], now: Text[], held: HeldMaterial): FigureRow[] {
    const rows = figuresOn(now, held);
    const sent = notFound(first);
    for (const b of sent) {
        const at = was.findIndex((t) => t.text === b.text);
        const line = at >= 0 && now[at]?.text.trim() ? now[at] : undefined;
        const still = rows.find((r) => r.status === "not_found" && r.figure === b.figure && (!line || r.text === line.text));
        if (still)
            still.note = `${NOTE.not_found({})} It was sent back once and is still stated: change the line, or keep it.`;
        else if (line)
            rows.push({ text: line.text, role: line.role, figure: b.figure, status: "not_found", was: b.text, note: `${NOTE.not_found({})} The line was written again without it. First version: "${b.text}"` });
        else
            rows.push({ text: "", role: b.role, figure: b.figure, status: "not_found", was: b.text, note: `${NOTE.not_found({})} The line was taken off. First version: "${b.text}"` });
    }
    return rows;
}
export function relist(before: FigureRow[] | undefined, now: Text[], held: HeldMaterial): FigureRow[] {
    return [...figuresOn(now, held), ...(before ?? []).filter((r) => r.was && now.some((t) => t.text === r.text))];
}
const ATTRIBUTION = /attribution/i;
const SAID_BY = /^[\s\-–—~]*(?:(?:real|verified|actual|happy)\s+)?(?:customers?|buyers?|reviewers?|reviews?|members?|subscribers?)(?:\s+(?:review|quote|story))?[\s.]*$|\bcommunity[\s.]*$/i;
const normal = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, " ").replace(/\s+/g, " ").trim();
const SMALL = new Set("a an the and or but of to in on for with your you my our is are was were it its this that at as be by from not no do does did have has had i we they them their he she her his me so just then than into out up about when what who how all can will would one im ive".split(" "));
const stem = (w: string) => (w.endsWith("ies") && w.length > 4 ? `${w.slice(0, -3)}y` : w.endsWith("s") && !w.endsWith("ss") && w.length > 3 ? w.slice(0, -1) : w);
const content = (s: string) => new Set(normal(s).replace(/'/g, "").split(" ").filter((w) => w.length > 2 && !SMALL.has(w)).map(stem));
export const QUOTE_SHARE = 0.6;
function closest(line: string, onFile: string[]): string | null {
    const mine = content(line);
    let best: {
        quote: string;
        share: number;
    } | null = null;
    for (const q of onFile) {
        for (const s of q.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean)) {
            const its = content(s);
            const shared = [...its].filter((w) => mine.has(w)).length;
            if (shared < 3 || shared / its.size < QUOTE_SHARE || shared / mine.size < 0.4)
                continue;
            const share = shared / its.size + shared / mine.size;
            if (!best || share > best.share)
                best = { quote: s, share };
        }
    }
    return best?.quote ?? null;
}
export function settleQuotes<T extends Text>(texts: T[], onFile: string[]): {
    texts: T[];
    notes: string[];
} {
    const saidBy = (t: Text) => ATTRIBUTION.test(t.role) || (t.text.trim().split(/\s+/).length <= 4 && SAID_BY.test(t.text));
    const names = texts.filter(saidBy);
    let quotes = texts.filter((t) => QUOTE_ROLE.test(t.role) && !saidBy(t) && !PLACEHOLDER.test(t.text));
    if (!quotes.length && names.length) {
        const under = texts.slice(0, texts.indexOf(names[0])).reverse().find((t) => !saidBy(t) && !/cta|button|price|offer/i.test(t.role) && !PLACEHOLDER.test(t.text));
        if (under)
            quotes = [under];
    }
    if (!quotes.length)
        return { texts, notes: [] };
    const file = onFile.map(normal).filter(Boolean);
    const notes: string[] = [];
    const swap = new Map<T, T>();
    const unknown: T[] = [];
    for (const t of quotes) {
        const said = normal(t.text);
        if (!said || file.some((f) => f.includes(said)))
            continue;
        const real = closest(t.text, onFile);
        if (real) {
            swap.set(t, { ...t, text: real });
            notes.push(`A customer's words had been reworded ("${t.text}"). The customer's own words on file were put in: "${real}"`);
        }
        else
            unknown.push(t);
    }
    if (!swap.size && !unknown.length)
        return { texts, notes: [] };
    const dropNames = unknown.length > 0 && unknown.length === quotes.length;
    const hasHeadline = texts.some((t) => /headline/i.test(t.role));
    for (const t of unknown) {
        swap.set(t, { ...t, role: QUOTE_ROLE.test(t.role) ? (hasHeadline ? "subhead" : "headline") : t.role, text: t.text.replace(/^["“'‘]+|["”'’]+$/g, "").trim() });
        notes.push(`"${t.text}" is not a customer's words on file. It stands as the brand's own line${dropNames && names.length ? ", and the name under it was taken off" : ""}.`);
    }
    return { texts: texts.filter((t) => !(dropNames && names.includes(t))).map((t) => swap.get(t) ?? t), notes };
}
export function ledWith(texts: Text[] | undefined): string[] {
    const head = (texts ?? []).find((t) => /headline/i.test(t.role)) ?? (texts ?? [])[0];
    if (!head || PLACEHOLDER.test(head.text) || QUOTE_ROLE.test(head.role))
        return [];
    return [...new Set(figuresOfLine(head.text).filter((h) => h.kind !== "count" || h.n >= 13 || h.nouns.some((w) => /^(?:guarantee|refund|trial|gift|free)$/.test(w))).map((h) => h.figure))];
}
