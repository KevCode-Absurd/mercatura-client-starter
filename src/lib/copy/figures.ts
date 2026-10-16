import type { BrandBrain } from "../brand-brain";
import { offersFor } from "../llm/context";
import { numbersHeld, numbersSaid } from "../scripts/fact-rules";
import { wholeClaim } from "./whole-claim";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const figure = (n: string) => `(?<![\\d.,])${esc(n)}(?!\\d|[.,]\\d)`;
export { wholeClaim };
const UNIT_WORDS = "pack packet pouch sachet stick bottle box jar tub tube bag can carton case bundle kit set pair roll sheet bar pod capsule tablet pill gummy chew softgel lozenge drop scoop serving dose portion piece slice cup wipe pad patch strip refill cartridge canister tin vial".split(" ");
const one = (w: string) => {
    const x = w.toLowerCase();
    return x.endsWith("ies") ? `${x.slice(0, -3)}y` : /(ch|sh|x|ss)es$/.test(x) ? x.slice(0, -2) : x.endsWith("s") && !x.endsWith("ss") ? x.slice(0, -1) : x;
};
const many = (u: string) => (u.endsWith("y") ? `${esc(u.slice(0, -1))}(?:y|ies)` : /(ch|sh|x|s)$/.test(u) ? `${esc(u)}(?:es)?` : `${esc(u)}s?`);
const unitGroup = (units: string[]) => `(${units.map(many).join("|")})`;
const BETWEEN = "(?:(?:daily|single|full|whole|small|little|individual|extra|more|free)[- ])";
interface Tie {
    n: number;
    unit: string;
    kind: "count" | "per";
    at: string;
}
function tiesIn(text: string, units: string[]): Tie[] {
    if (!units.length)
        return [];
    const U = unitGroup(units);
    const out: Tie[] = [];
    const next = new RegExp(`^\\s+${U}\\b`, "iu");
    const thing = (unit: string, after: string) => one(after.match(next)?.[1] ?? unit);
    const num = "(?<![\\p{L}\\d.,-])([$£€₹¥]\\s?)?(\\d+(?:,\\d{3})*(?:\\.\\d+)?)";
    for (const m of text.matchAll(new RegExp(`${num}([- ])${BETWEEN}{0,2}${U}\\b`, "giu"))) {
        out.push({ n: Number(m[2].replace(/,/g, "")), unit: m[3] === "-" ? one(m[4]) : thing(m[4], text.slice(m.index! + m[0].length)), kind: "count", at: m[0] });
    }
    const amount = `${num}(\\s?(?:mcg|mg|iu|g|grams?|ml|oz|lbs?|kg|billion)\\b)?`;
    for (const m of text.matchAll(new RegExp(`${amount}((?:\\s+(?!(?:per|each|every)\\b)[\\p{L}'’-]+){0,5}?)\\s+(?:per|each|every|an?|in (?:every|each|an?|one|1))\\s+${BETWEEN}?${U}\\b`, "giu"))) {
        if (m[1] || m[3])
            out.push({ n: Number(m[2].replace(/,/g, "")), unit: thing(m[5], text.slice(m.index! + m[0].length)), kind: "per", at: m[0] });
    }
    for (const m of text.matchAll(new RegExp(`\\b(?:each|every|one|per|an?|1)\\s+(?:[\\p{L}-]+\\s+)?${U}\\b([^.!?;,\\d$£€₹¥]{0,40})${amount}`, "giu"))) {
        if (m[3] || m[5])
            out.push({ n: Number(m[4].replace(/,/g, "")), unit: thing(m[1], m[2]), kind: "per", at: m[0] });
    }
    return out;
}
export function unitsOf(productText: string, offerText = ""): string[] {
    const said = new Set((productText.toLowerCase().match(/[\p{L}]+/gu) ?? []).map(one));
    return [...new Set([...UNIT_WORDS.filter((u) => said.has(u)), ...tiesIn(offerText, UNIT_WORDS).map((t) => t.unit)])];
}
export interface Counted {
    names: string[];
    units: string[];
    held: string;
    block: string;
}
const HOW_COUNTED = "The brand's own words for what it sells and how it is counted. These are the words for these things: do not swap one for another, and do not count them again.";
const WHO_ASKED = "A share of people is true only of the people who were asked. Whenever you use one of these figures, say who they were:";
export function countedOf(brand: BrandBrain, productId?: string | null, offerId?: string | null): Counted {
    const product = productId ? brand.products.find((p) => p.id === productId) : undefined;
    const products = product ? [product] : brand.products;
    const offers = product ? offersFor(brand, product.id) : brand.offers;
    const doses = (p: BrandBrain["products"][number]) => (p.ingredients ?? []).filter((i) => /\d/.test(i.dose)).map((i) => `${i.name}: ${i.dose}`);
    const productText = products.map((p) => [p.format, p.counted ?? "", ...doses(p)].join(". ")).join("\n");
    const offerText = offers.map((o) => `${o.name}. ${o.notes ?? ""}`).join("\n");
    const units = unitsOf(productText, offerText);
    const claims = brand.claims.filter((c) => c.status === "substantiated");
    const prices = [...new Set(brand.offers.map((o) => o.price))];
    const savings = prices.flatMap((a) => prices.filter((b) => a > b).map((b) => Math.round((a - b) * 100) / 100));
    const held = [
        ...claims.map(wholeClaim),
        ...claims.map((c) => c.source ?? ""),
        ...brand.offers.map((o) => `${o.name}. ${brand.brand.currency} ${o.price}${o.per_day ? `, ${brand.brand.currency} ${o.per_day} a day` : ""}. ${o.notes ?? ""}`),
        brand.guarantee ? `${brand.guarantee.text} ${brand.guarantee.window_days} days.` : "",
        ...brand.products.map((p) => `${p.name}. ${p.format}. ${p.counted ?? ""} ${(p.ingredients ?? []).map((i) => `${i.name} ${i.dose}`).join(". ")}. ${(p.specs ?? []).map((x) => `${x.name} ${x.value}`).join(". ")}`),
        ...brand.proof_assets,
        brand.brand.one_liner,
        savings.length ? `Savings between its prices: ${savings.map((s) => `${brand.brand.currency} ${s}`).join("; ")}` : "",
    ]
        .filter((x) => x.trim())
        .join("\n");
    const stated = offers.find((o) => o.id === offerId);
    const named = offers.filter((o) => o !== stated && !o.id.startsWith("off_x_") && tiesIn(o.name, UNIT_WORDS).length).slice(0, 6);
    const asked = claims.filter((c) => (!product || !brand.products.some((p) => p !== product && c.text.includes(p.name))) && wholeClaim(c) !== c.text.trim()).map(wholeClaim);
    const lines = [
        ...products.slice(0, 6).flatMap((p) => [`- ${p.name}: ${p.format}${p.counted ? ` ${p.counted}` : ""}`, ...doses(p).map((d) => `  - ${d}`)]),
        ...(stated ? [`- The offer these words state: ${stated.name}${stated.notes ? `. ${stated.notes}` : ""}`] : []),
        ...named.map((o) => `- Offer: ${o.name}`),
    ];
    const block = [lines.length ? `## How it is counted\n${HOW_COUNTED}\n${lines.join("\n")}` : "", asked.length ? `${WHO_ASKED}\n${asked.map((c) => `- ${c}`).join("\n")}` : ""].filter(Boolean).join("\n\n");
    return { names: [brand.brand.name, ...products.map((p) => p.name)], units, held, block };
}
export interface Limit {
    said: RegExp;
    kept: RegExp;
    say: string;
}
export function shareLimits(lines: string[], small = false): Limit[] {
    const out: Limit[] = [];
    const percents = (c: string) => [...c.matchAll(/(\d[\d.]*)\s?%/g)].map((m) => m[1]);
    const plain = new Set(lines.filter((c) => !/\bsurvey/i.test(c)).flatMap(percents));
    for (const c of lines) {
        if (/\bsurvey/i.test(c))
            for (const n of percents(c))
                if (!plain.has(n))
                    out.push({ said: new RegExp(`${figure(n)}\\s?(%|percent)`, "i"), kept: /\bsurvey|\bpolled\b|\basked\b|\brespondents?\b/i, say: `${n}% without saying it is of surveyed customers` });
        for (const m of c.matchAll(/\b(\d[\d,.]*)\+?\s+([a-z]{3,}) and ([a-z]{3,})\b/gi)) {
            if (!small && Number(m[1].replace(/,/g, "")) < 13)
                continue;
            out.push({ said: new RegExp(`${figure(m[1])}\\+?\\s+${esc(m[2])}\\b`, "i"), kept: new RegExp(`\\b${esc(m[3])}\\b`, "i"), say: `"${m[1]} ${m[2].toLowerCase()}" where the claim is "${m[0].toLowerCase()}"` });
        }
    }
    return out;
}
export function upToLimits(lines: string[], small = false): Limit[] {
    const out: Limit[] = [];
    for (const text of lines) {
        for (const m of text.matchAll(/\bup to\s+([$£€₹¥])?\s?(\d[\d,.]*\d|\d)(\s?%)?/gi)) {
            if (!small && !m[1] && !m[3] && Number(m[2].replace(/,/g, "")) < 13)
                continue;
            out.push({ said: new RegExp(small ? figure(m[2]) : `${m[1] ? "[$£€₹¥]\\s?" : ""}${figure(m[2])}${m[3] ? "\\s?(%|percent)" : ""}`), kept: /\bup to\b|\bas much as\b/i, say: `${m[2]} without "up to"` });
        }
    }
    return out;
}
const TIME = /^(years?|yrs?|months?|weeks?|days?|nights?|mornings?|evenings?|hours?|hrs?|minutes?|mins?|seconds?|secs?|times?)$/i;
const PROOF_NOUNS = new Set("review rating customer user buyer subscriber member study participant ingredient vitamin mineral nutrient doctor dermatologist dentist vet expert award".split(" "));
const STOP_AFTER = /^(in|on|per|a|an|and|or|for|from|with|to|at|by|of|vs|than|each|every|that|which|is|are|was|were|the|off|as|it)$/i;
export interface Held {
    numbers: Set<number>;
    prices: Set<number>;
    units: string[];
    counted: Set<string>;
    measured: Set<string>;
    ties: Map<string, Set<string>>;
    same: Map<string, string>;
    limits: Limit[];
    names: string[];
}
const NUMBER = /(?<![\p{L}\d.,-])([$£€₹¥]\s?)?(\d+(?:,\d{3})*(?:\.\d+)?)(\s?(?:thousand|million)\b|[kK]\b|M\b)?\+?(\s?(?:%|percent\b|mcg\b|mg\b|iu\b|g\b|grams?\b|ml\b|oz\b|lbs?\b|kg\b|billion\b|x\b))?/gu;
const valueOf = (m: RegExpMatchArray) => Number(m[2].replace(/,/g, "")) * (/thousand|k/i.test(m[3] ?? "") ? 1000 : /million|M/.test(m[3] ?? "") ? 1000000 : 1);
function runAfter(after: string): string[] {
    const out: string[] = [];
    for (const w of after.replace(/^[- ]+/, "").replace(/^of\s+/i, "").match(/^(?:[\p{L}'’-]+\s*){1,4}/u)?.[0].trim().split(/\s+/) ?? []) {
        if (STOP_AFTER.test(w) || out.length === 3)
            break;
        out.push(w.toLowerCase());
    }
    return out;
}
export function heldFrom(brandText: string, also = "", o: {
    names?: string[];
    units?: string[];
} = {}): Held {
    const read = (text: string) => new Set([...numbersHeld(text), ...numbersSaid(text).map((x) => x.n), ...[...text.matchAll(NUMBER)].map(valueOf)]);
    const numbers = new Set([...read(brandText), ...read(also)]);
    const prices = new Set([...brandText.matchAll(new RegExp(AMOUNT.source, "gi"))].map((m) => Number((m[1] ?? m[2] ?? m[3]).replace(/,/g, ""))));
    const units = o.units ?? [];
    const counted = new Set<string>();
    const measured = new Set<string>();
    for (const m of brandText.matchAll(NUMBER)) {
        const run = runAfter(brandText.slice(m.index! + m[0].length));
        if (m[4] && !/%|percent|x/i.test(m[4]))
            for (const w of run)
                measured.add(one(w));
        const head = [...run].reverse().find((w) => w.length > 3 && w.endsWith("s") && !w.endsWith("ss"));
        if (!m[1] && head && !TIME.test(head))
            counted.add(one(head));
    }
    const ties = new Map<string, Set<string>>();
    const found = tiesIn(brandText, units);
    for (const t of found)
        ties.set(`${t.kind}:${t.n}`, (ties.get(`${t.kind}:${t.n}`) ?? new Set()).add(t.unit));
    const same = new Map<string, string>();
    for (const [key, set] of ties)
        if (key.startsWith("count:") && set.size > 1)
            for (const u of set)
                same.set(u, same.get([...set][0]) ?? [...set][0]);
    const lines = brandText.split(/\n+/);
    return { numbers, prices, units, counted, measured, ties, same, limits: [...shareLimits(lines), ...upToLimits(lines)], names: (o.names ?? []).map((n) => n.replace(/\s*\([^)]*\)/g, "").replace(/^the\s+/i, "").trim()).filter((n) => n.length > 2) };
}
const sentencesOf = (s: string) => s.split(/(?<=[.!?…])["”’']?\s+|\n+/).map((x) => x.trim()).filter(Boolean);
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
export function namedIn(text: string, names: string[]): string | null {
    for (const n of names) {
        const many = /\s/.test(n);
        const re = new RegExp(`(?<![\\p{L}\\d])${esc(fold(n)).replace(/\s+/g, "\\s+")}(?![\\p{L}\\d])`, many ? "iu" : "u");
        if (re.test(fold(text)))
            return n;
    }
    return null;
}
const MONEY_WORD = /^\s?(dollars?|bucks|pounds?|euros?|cents|pence|quid)\b/i;
const OFFER_CUE = /\b(first order|subscri\w+|shipping|delivery|guarantee|refund|money[- ]back|discount)\b|\d\s+off\b/i;
const TERM_CUE = /\b(guarantee|refund|money[- ]back|trial|returns?)\b/i;
const SHARE_CUE = /\b(users?|customers?|people|buyers?|subscribers?|members?|women|men|parents?|mums?|moms?|dads?|owners?|doctors?|dermatologists?|vets?|dentists?|experts?|respondents?|survey\w*|polled|reported|off|more|less|fewer|better|faster|longer|higher|lower|rose|increas\w+|reduc\w+|improv\w+|boost\w*|absor\w+)\b/i;
const STUDY_CUE = /\b(stud(?:y|ies)|clinical\w*|survey\w*|polled|participants?|placebo)\b/i;
const SURE = /^\s?(?:%|percent)\s+(sure|certain|convinced|done|ready|positive|honest|there|of the (?:time|way))\b/i;
const SPELLED = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety";
export interface FigureFault {
    quote: string;
    why: string;
}
const NOT_HELD = "is not in the brand's facts. A figure about the product, its results, its price or a survey is said only as the facts give it: use the figure the facts have, or say the same thing without a number.";
export function figureFaults(text: string, held: Held, o: {
    long?: boolean;
} = {}): FigureFault[] {
    const out: FigureFault[] = [];
    const s = sentencesOf(text);
    const has = (v: number, n: number, money = false) => held.numbers.has(v) || held.numbers.has(n) || (money && [...held.numbers].some((x) => !Number.isInteger(x) && (Math.round(x) === v || Math.floor(x) === v)));
    const cls = (u: string) => held.same.get(u) ?? u;
    const U = held.units.length ? unitGroup(held.units) : null;
    const unitSaid = U ? new RegExp(`\\b${U}\\b`, "iu") : null;
    s.forEach((line, i) => {
        if (out.length >= 3)
            return;
        const cue = !!namedIn(line, held.names) || !!unitSaid?.test(line) || OFFER_CUE.test(line);
        const study = STUDY_CUE.test(line);
        const fault = (quote: string, why: string) => out.push({ quote, why });
        for (const m of line.matchAll(NUMBER)) {
            const n = Number(m[2].replace(/,/g, ""));
            const v = valueOf(m);
            const after = line.slice(m.index! + m[0].length);
            if (/^(?::\d\d|\s?(?:am|pm|a\.m|p\.m)\b|(?:st|nd|rd|th)\b|[- ]years?[- ]old|\s?o['’]clock)/i.test(after) || (!m[1] && !m[4] && n >= 1900 && n <= 2100))
                continue;
            const suffix = (m[4] ?? "").trim().toLowerCase();
            const money = !!m[1] || MONEY_WORD.test(after);
            const run = runAfter(after);
            let attached = false;
            if (money)
                attached = cue;
            else if (suffix === "%" || suffix === "percent")
                attached = n < 100 && !SURE.test(m[4] + after) && (cue || SHARE_CUE.test(line));
            else if (suffix === "x")
                attached = false;
            else if (suffix)
                attached = /^(mg|mcg|iu)$/.test(suffix) || cue || run.some((w) => held.measured.has(one(w)));
            else {
                const head = run.map(one).find((w) => held.counted.has(w) || PROOF_NOUNS.has(w));
                const unit = U && new RegExp(`^[- ]${BETWEEN}{0,2}${U}\\b`, "iu").test(after);
                attached = (!!unit && n !== 1) || (!!head && v >= 13) || (TERM_CUE.test(line) && TIME.test(run[0] ?? ""));
            }
            if (!attached && study && (suffix || v >= 13))
                attached = true;
            if (attached && !has(v, n, money))
                return void fault(line, `"${m[0].trim()}" ${NOT_HELD}`);
        }
        if (U) {
            for (const m of line.matchAll(new RegExp(`\\b((?:${SPELLED})(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?)[- ]${BETWEEN}{0,2}${U}\\b`, "giu"))) {
                const n = numbersSaid(m[1])[0]?.n;
                if (n != null && n !== 1 && !held.numbers.has(n))
                    return void fault(line, `"${m[0]}" ${NOT_HELD}`);
            }
            for (const t of tiesIn(line, held.units)) {
                const facts = held.ties.get(`${t.kind}:${t.n}`);
                if (!facts?.size || [...facts].some((u) => cls(u) === cls(t.unit)))
                    continue;
                const theirs = [...new Set([...facts].map(cls))].join(" or ");
                return void fault(line, t.kind === "count" ? `"${t.at.trim()}": the brand's facts count ${t.n} by the ${theirs}, not by the ${t.unit}. Keep the unit the fact has.` : `"${t.at.trim()}": in the brand's facts this figure is for each ${theirs}, not for each ${t.unit}. Keep the unit the fact has.`);
            }
        }
        const near = o.long ? s.slice(Math.max(0, i - 1), i + 2).join(" ") : text;
        const lost = held.limits.find((l) => l.said.test(line) && !l.kept.test(near));
        if (lost)
            fault(line, `It states ${lost.say}. The figure is true only the way the brand's own claim states it: say it with those words, or leave the figure out.`);
    });
    return out;
}
const AMOUNT = /[$£€₹¥]\s?(\d[\d,]*(?:\.\d+)?)|\b(\d[\d,]*(?:\.\d+)?)\s?(?:dollars?|bucks|pounds?|euros?|cents|pence|quid)\b|\b(?:USD|GBP|EUR|AUD|CAD)\s?(\d[\d,]*(?:\.\d+)?)/i;
export function soldIn(text: string, o: {
    names?: string[];
    units?: string[];
    prices?: Set<number>;
}): string | null {
    const names = (o.names ?? []).map((n) => n.replace(/\s*\([^)]*\)/g, "").replace(/^the\s+/i, "").trim()).filter((n) => n.length > 2);
    const name = namedIn(text, names);
    if (name)
        return `names "${name}"`;
    const price = text.match(AMOUNT);
    const amount = price ? Number((price[1] ?? price[2] ?? price[3]).replace(/,/g, "")) : null;
    if (price && amount != null && (!o.prices || o.prices.has(amount)))
        return `states a price (${price[0].trim()})`;
    if (o.units?.length) {
        const U = unitGroup(o.units);
        const count = text.match(new RegExp(`(?<![\\p{L}\\d])(?:\\d+|${SPELLED}|per|each|every)[- ]${BETWEEN}{0,2}${U}(?:\\s+${U})?\\b|\\ban?\\s+${BETWEEN}?${U}\\s+(?:a|per|each|every)\\s+(?:day|night|morning|week|month)\\b`, "iu"));
        if (count)
            return `counts the product ("${count[0].trim()}")`;
    }
    return null;
}
