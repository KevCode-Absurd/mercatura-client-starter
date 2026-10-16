import type { AwarenessStage } from "../taxonomy";
import { CONTRAST_NEGATION, UNCONTRACTED, readingGrade } from "../scripts/audit";
import { DEFAULT_VOICE, readingGradeOf, type VoiceProfile } from "../scripts/voice-rules";
import { figureFaults, heldFrom, soldIn } from "./figures";
import { PRIMARY_WORDS, SCRIPT_WORDS, isStoryStage, stageName } from "./stage";
export type WordSurface = "picture" | "headline" | "primary" | "spoken" | "hook" | "offer";
export interface WordLine {
    id: string;
    surface: WordSurface;
    text: string;
    role?: string;
}
export type FaultRule = "negation_run" | "clipped" | "fragments" | "mirror_pair" | "contrast" | "count_stack" | "terms" | "grade" | "stock" | "dash" | "length" | "contractions" | "figures" | "stage_headline" | "fact_figure";
export interface WordFault {
    id: string;
    rule: FaultRule;
    quote: string;
    why: string;
}
export interface FaultOptions {
    stage?: AwarenessStage | null;
    voice?: VoiceProfile;
    own?: string;
    buyerWords?: string;
    names?: string[];
    units?: string[];
    held?: string;
    facts?: string;
}
const sentencesOf = (s: string) => s.split(/(?<=[.!?…])["”’']?\s+|\n+/).map((x) => x.trim()).filter((x) => /[\p{L}\p{N}]/u.test(x));
const wordsOf = (s: string) => s.match(/[\p{L}\p{N}][\p{L}\p{N}'’%$+.,-]*/gu) ?? [];
const TIME_WORD = /^(years?|yrs?|months?|weeks?|days?|nights?|hours?|hrs?|minutes?|mins?|seconds?|times?|am|pm|o['’]clock|kids?|children|people|year-old|years-old)$/i;
function specFigures(s: string, small = false): string[] {
    const out: string[] = [];
    for (const m of s.matchAll(/([$£€]\s?)?(\d[\d,]*(?:\.\d+)?)(\s?(?:%|\+|mcg|mg|g|ml|oz|lbs?|kg|iu|x)(?![\p{L}])|[kKmM]\+?(?![\p{L}]))?(:\d\d|(?:st|nd|rd|th|am|pm)\b)?(?:\s+([\p{L}'’-]+))?/gu)) {
        if (m[1] || m[4] || (m[5] && TIME_WORD.test(m[5])))
            continue;
        if (m[3] || Number(m[2]!.replace(/,/g, "")) >= 10 || (small && m[5]))
            out.push(`${m[2]}${(m[3] ?? "").trim()}`);
    }
    return out;
}
const clip = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const unquoted = (s: string) => s.replace(/["“][^"”]{8,}["”]/g, " ");
const LABEL_ROLE = /cta|button|badge|price|label|tag|logo|brand|name|credit|attribution|stamp|legal|disclaimer|url|handle|sticker|rating|stars|column|row|cell|caption_label/i;
const NEGATION_RUN = /\bno\s+(?:more\s+)?[\p{L}'’-]+(?:\s+[\p{L}'’-]+){0,2}\s*[,.;]\s*(?:and\s+|or\s+)?no\s+(?:more\s+)?[\p{L}'’-]+/iu;
const COMEBACK = /^(fair( enough)?|yes,? really|really|seriously|been there|same|done|period|exactly|simple|easy|that'?s it|not anymore|think again|wrong|spoiler|true story)[.!?]*$/i;
const MIRROR: RegExp[] = [/\b[\p{L}'’]+ like [\p{L}'’ ]{2,24},? (?:and |but )?[\p{L}'’]+ like [\p{L}'’]+/iu, /\banother [\p{L}'’]+,? another [\p{L}'’]+/iu, /\bone [\p{L}'’]+(?: [\p{L}'’]+){0,3}, one [\p{L}'’]+/iu, /\bless [\p{L}'’]+,? (?:more|bigger|better) [\p{L}'’]+/iu];
const DENIES = "(?:never|not|no longer|[a-z]+n['’]t)";
const CORRECTS = "(?:it['’]s|it is|it was|they['’]re|that['’]s|this is|you['’]re|we['’]re|i['’]m)";
const CONTRAST_ACROSS = new RegExp([
    `\\b(?:never|not|(?:is|are|was|were)n['’]t)\\s+(?:about|just|because)\\b[^.?!]{0,80}[.?!]\\s+${CORRECTS}\\b`,
    `\\b(you|we|they|i)\\s+(?:never|[a-z]+n['’]t)\\s+(?:[\\p{L}'’]+\\s+){1,4}(?:because|about)\\b[^.?!]{0,80}[.?!]\\s+\\1(?:['’](?:re|m|ve)|\\s+(?:are|am|just))\\b`,
    `\\b${DENIES}\\b[^.?!]{0,80}[.?!]\\s+${CORRECTS}\\s+(?:(?:really|more|just|all)\\s+)?(?:about|because|actually)\\b`,
].join("|"), "iu");
const STOCK = /\b(there'?s (?:another|a better|a smaller|an easier|a simpler) way|that'?s the whole (?:routine|ask|thing|point|story|trick)|here'?s the (?:thing|number|deal|catch|kicker|truth)|sound familiar|we get it|let that sink in|say (?:hello|goodbye) to|the best part\?|let'?s dive in|at the end of the day|in today'?s fast[- ]paced|look no further|unlock (?:your|the)|elevate your|but wait,? there'?s more|take (?:it|your \w+) to the next level)\b/i;
const LAB_WORDS = /\b((?:pre|pro|post|syn)biotics?|bioavailab\w+|(?:micro|macro)nutrients?|adaptogen\w*|antioxidants?|polyphenols?|placebo(?:-controlled)?|double-blind|randomi[sz]ed|clinical(?:ly)?|peer-reviewed|methyl\w+|folate|folic acid|electrolytes?|peptides?|ceramides?|hyaluronic|retino\w+|niacinamide|nootropics?|microbiome|enzymes?|amino acids?|(?:third|3rd)[- ]party|contaminants?|microbial|heavy metals|formulat\w+|proprietary|hypoallergenic|non-comedogenic|ph-balanced|pectin|psyllium|glp-1)\b/i;
const TENS = "twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety";
const UNITS = "one|two|three|four|five|six|seven|eight|nine";
const NUMBER_WORD = `(?:(?:${TENS})(?:[- ](?:${UNITS}))?|(?:${UNITS}|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)|(?:a|${UNITS}) hundred(?: and)?(?: (?:${TENS})(?:[- ](?:${UNITS}))?)?)`;
const SPELLED_FIGURE = new RegExp(`\\b(?:${NUMBER_WORD} (?:dollars?|cents|percent)\\b(?: and ${NUMBER_WORD} cents\\b)?|(?:${TENS})[- ](?:${UNITS}) (?:${TENS})[- ](?:${UNITS})\\b|(?:${TENS})(?:[- ](?:${UNITS}))?-day\\b)`, "i");
function stiffWords(text: string): string | null {
    for (const m of text.matchAll(new RegExp(UNCONTRACTED.source, "gi"))) {
        const after = text.slice(m.index + m[0].length);
        const before = text.slice(0, m.index);
        if (/^\s*(?:[.,;:!?)"”]|$)/.test(after))
            continue;
        if (/^(?:that|it) /i.test(m[0]) && /\b(?:after|before|than|from|of|with|for|by|to|about|like|at|on|in|until|all)\s+$/i.test(before))
            continue;
        return m[0];
    }
    return null;
}
const isLabel = (l: WordLine) => l.surface === "picture" && !!l.role && LABEL_ROLE.test(l.role) && !/headline|statement|hook|quote|sub/i.test(l.role);
const ownHas = (own: string | undefined, said: string) => !!own && own.includes(said.toLowerCase().replace(/\s+/g, " ").trim());
export function wordFaults(lines: WordLine[], o: FaultOptions = {}): WordFault[] {
    const voice = o.voice ?? DEFAULT_VOICE;
    const out: WordFault[] = [];
    const held = o.held ? heldFrom(o.held, o.facts ?? "", { names: o.names, units: o.units }) : null;
    for (const l of lines) {
        const raw = l.text.trim();
        if (!raw || /\[[^\]]+\]/.test(raw))
            continue;
        const add = (rule: FaultRule, quote: string, why: string) => out.push({ id: l.id, rule, quote: clip(quote), why });
        const text = unquoted(raw);
        const label = isLabel(l) || l.surface === "offer";
        const long = l.surface === "primary" || l.surface === "spoken";
        const s = sentencesOf(text);
        if (/[—–]/.test(text))
            add("dash", text.match(/[^.?!]*[—–][^.?!]*/)?.[0] ?? text, "A dash in the line. Use a comma or a full stop.");
        const stiff = label ? null : stiffWords(text.split("\n").filter((x) => !/^\s*[*†]/.test(x)).join("\n"));
        if (stiff && !ownHas(o.own, stiff))
            add("contractions", s.find((x) => x.includes(stiff)) ?? stiff, `"${stiff}" is not how people talk. Use the contraction, here and anywhere else in this text.`);
        const spelled = l.surface === "spoken" || l.surface === "hook" ? null : text.match(SPELLED_FIGURE);
        if (spelled && !ownHas(o.own, spelled[0]))
            add("figures", s.find((x) => x.includes(spelled[0])) ?? spelled[0], `"${spelled[0]}" is a figure written out in words. This is read, not spoken: write prices, percentages and counts as figures ($24.99, 40%, 30-day), here and anywhere else in this text.`);
        if (held && l.surface !== "spoken")
            for (const f of figureFaults(text, held, { long }))
                if (!ownHas(o.own, f.quote))
                    add("fact_figure", f.quote, f.why);
        if (l.surface === "headline" && isStoryStage(o.stage) && !ownHas(o.own, text)) {
            const sold = soldIn(text, { names: o.names, units: o.units, prices: held?.prices });
            if (sold)
                add("stage_headline", text, `This feed headline ${sold}, for ${o.stage === "unaware" ? "an" : "a"} ${stageName(o.stage!)} buyer who is not looking for a product yet. ${o.stage === "unaware" ? "Say their own moment or thought, in their words, with nothing in it that is for sale." : "Name the problem as they live it, or what could be different, and stop there."}`);
        }
        const neg = text.match(NEGATION_RUN);
        if (neg && !ownHas(o.own, neg[0]))
            add("negation_run", neg[0], "A row of \"no this, no that\" stands where the benefit should be. Say what the buyer gets, as 1 sentence.");
        const contrast = text.match(CONTRAST_NEGATION) ?? text.match(CONTRAST_ACROSS);
        if (contrast)
            add("contrast", contrast[0], "This is the \"it's not X, it's Y\" turn. Say the true thing directly.");
        const stock = text.match(STOCK);
        if (stock && !ownHas(o.own, stock[0]))
            add("stock", stock[0], "A stock line that names nothing. Say the actual thing it stands for, or cut it.");
        if (!label) {
            const mirror = MIRROR.map((r) => text.match(r)?.[0]).find(Boolean);
            const pair = mirror ?? mirroredSentences(s);
            if (pair && !ownHas(o.own, pair))
                add("mirror_pair", pair, "A mirrored slogan: 2 halves built to match. Say the 1 thing it means in a plain sentence.");
            for (let i = 0; i < s.length; i++) {
                const n = wordsOf(s[i]).length;
                if (n > 2 || s.length < 2)
                    continue;
                const afterQuestion = i > 0 && /\?["”’']?$/.test(s[i - 1]);
                const short = !long && i > 0;
                if ((COMEBACK.test(s[i]) || afterQuestion || short) && !ownHas(o.own, s[i])) {
                    add("clipped", `${i > 0 ? `${s[i - 1]} ` : ""}${s[i]}`, `"${s[i]}" is a clipped tag-on, not something a person says. Fold what it means into a whole sentence, or cut it.`);
                    break;
                }
            }
        }
        if (long && s.length >= 8) {
            const lens = s.map((x) => wordsOf(x).length);
            const short = lens.filter((n) => n < 5).length / lens.length;
            let run = 0;
            let runAt = -1;
            lens.forEach((n, i) => {
                run = n <= 3 ? run + 1 : 0;
                if (run === 3 && runAt < 0)
                    runAt = i - 2;
            });
            if (runAt >= 0 && !ownHas(o.own, s.slice(runAt, runAt + 3).join(" ")))
                add("fragments", s.slice(runAt, runAt + 3).join(" "), "3 clipped sentences in a row. Say it as people talk: whole sentences with the small words left in.");
            else if (short > 0.3)
                add("fragments", s.filter((x) => wordsOf(x).length < 5).slice(0, 3).join(" "), `${Math.round(short * 100)}% of the sentences are under 5 words, so it reads as fragments. Join them into sentences a person would say; keep a short one only where the story turns.`);
        }
        if (!label) {
            const most = long ? (isStoryStage(o.stage) ? 2 : 3) : 2;
            const stacked = (long ? s : [text]).find((x) => specFigures(x, !long).length >= most);
            if (stacked && !ownHas(o.own, stacked))
                add("count_stack", stacked, `${specFigures(stacked, !long).length} figures in 1 ${long ? "sentence" : "line"}. A count is not a reason to buy: keep the 1 figure that matters here and say what it does for the buyer.`);
        }
        if (isStoryStage(o.stage)) {
            const terms = [...new Set([...(text.match(new RegExp(LAB_WORDS.source, "gi")) ?? []), ...voice.terms.filter((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text))].map((t) => t.toLowerCase()))].filter((t) => !o.buyerWords?.includes(t));
            if (terms.length)
                add("terms", terms.join(", "), `Technical terms for a ${stageName(o.stage!)} buyer, who has no word for the answer yet. Say what each does in plain words.`);
        }
        else if (!label) {
            const lab = (x: string) => [...new Set((x.match(new RegExp(LAB_WORDS.source, "gi")) ?? []).map((t) => t.toLowerCase()))].filter((t) => !o.buyerWords?.includes(t));
            const run = s.find((x) => lab(x).length >= 3);
            if (run && !ownHas(o.own, run))
                add("terms", run, `${lab(run).length} technical terms in 1 sentence (${lab(run).join(", ")}). Keep the 1 this buyer compares on and say in plain words what it means for them.`);
            else if (o.stage === "solution_aware" && lab(text).length > 2)
                add("terms", lab(text).join(", "), `${lab(text).length} technical terms for a solution aware buyer. Keep 1 or 2 they have already met, each with what it does for them, and say the rest in plain words.`);
        }
        if (wordsOf(text).length >= 20) {
            const grade = readingGrade(text);
            const top = readingGradeOf(voice);
            if (grade > top + (long ? 0.5 : 0))
                add("grade", [...s].sort((a, b) => b.length - a.length)[0] ?? text, `Reads at school grade ${grade.toFixed(1)}; ${top} or below is the limit. Shorter sentences and plainer words, starting with this sentence.`);
        }
    }
    return out;
}
function mirroredSentences(s: string[]): string | null {
    for (let i = 0; i + 1 < s.length; i++) {
        const a = wordsOf(s[i]);
        const b = wordsOf(s[i + 1]);
        if (a.length > 7 || b.length > 7 || a.length < 2 || b.length < 2)
            continue;
        if (a[0]!.toLowerCase() === b[0]!.toLowerCase() && /(?:n['’]t|not)[.!?]*$/i.test(s[i + 1]!))
            return `${s[i]} ${s[i + 1]}`;
    }
    return null;
}
const countWords = (s: string) => wordsOf(s).length;
export function lengthFault(text: string, stage: AwarenessStage | null | undefined, kind: "primary" | "script" = "primary"): {
    words: number;
    range: [
        number,
        number
    ];
    side: "short" | "long";
    why: string;
} | null {
    if (!stage)
        return null;
    const range = (kind === "primary" ? PRIMARY_WORDS : SCRIPT_WORDS)[stage];
    const words = countWords(text);
    const side = words < range[0] * 0.85 ? "short" : words > range[1] * 1.15 ? "long" : null;
    if (!side)
        return null;
    const why = side === "short"
        ? `${words} words. A ${stageName(stage)} buyer is told ${isStoryStage(stage) ? "the whole story of the problem" : "enough to act"}: ${range[0]} to ${range[1]} words. It is short because the story is not told yet, so tell more of it; do not pad.`
        : `${words} words. For a ${stageName(stage)} buyer ${range[0]} to ${range[1]} is the range: say less, and keep what moves them.`;
    return { words, range, side, why };
}
export const faultLine = (f: WordFault) => `"${f.quote}": ${f.why}`;
