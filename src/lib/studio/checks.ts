import { and, asc, desc, eq } from "drizzle-orm";
import { customerVoice } from "../customer-voice";
import { brandVoiceText } from "../brand-voice";
import { learnedRules } from "../lessons";
import { z } from "zod";
import { db, schema } from "@/db";
import type { AuditItem } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import { loadBrandBrain } from "../brands";
import { env } from "../env";
import { claimsFor, claimsOfProduct, mostRelevant, offersFor, ownId } from "../llm/context";
import { contextLevel } from "../llm/routing";
import { structuredJson } from "../llm/structured";
import { renderPrompt } from "../prompts";
import { CONTRAST_NEGATION, UNCONTRACTED, readingGrade } from "../scripts/audit";
import { DEFAULT_VOICE, copyRuleChecks, voiceRuleChecks, type VoiceProfile } from "../scripts/voice-rules";
import { activeGuardrails } from "../scripts/guardrails";
import { staticFeedLines, staticTemplateMethod } from "./static-template";
export interface ResearchRow {
    id: string;
    type: string;
    label: string;
    summary: string;
    quotes: string[];
}
export interface ResearchDeal {
    skip?: string[];
    offset?: number;
}
export interface SourcedQuote {
    quote: string;
    source: string;
}
export interface SourcedRow extends ResearchRow {
    sourced: SourcedQuote[];
}
export const QUOTE_POOL = 8;
function sourcedRows(brandId: string, themes: number, quotes: number, about: string, deal: ResearchDeal): SourcedRow[] {
    const skip = new Set(deal.skip ?? []);
    const ranked = db.select().from(schema.themes).where(eq(schema.themes.brand_id, brandId)).orderBy(asc(schema.themes.rank)).limit((about ? 40 : themes) + skip.size).all();
    const pool = skip.size ? ranked.filter((t) => !skip.has(t.id)).slice(0, about ? 40 : themes) : ranked;
    const rows = about ? mostRelevant(pool, (t) => `${t.label} ${t.summary}`, about, themes) : pool;
    return rows.map((t) => {
        const all = db
            .select({ quote: schema.insights.quote, source: schema.insights.source_type })
            .from(schema.insights)
            .where(and(eq(schema.insights.theme_id, t.id), customerVoice))
            .orderBy(...(deal.offset === undefined ? [desc(schema.insights.intensity)] : [desc(schema.insights.intensity), asc(schema.insights.id)]))
            .limit(deal.offset === undefined ? quotes : QUOTE_POOL)
            .all();
        const from = Math.max(0, Math.floor(deal.offset ?? 0));
        const q = deal.offset === undefined ? all : Array.from({ length: Math.min(quotes, all.length) }, (_, k) => all[(from + k) % all.length]);
        const sourced = q.map((x) => ({ quote: x.quote.replace(/\s+/g, " ").slice(0, 220), source: x.source }));
        return { id: t.id, type: t.type, label: t.label, summary: t.summary, quotes: sourced.map((x) => x.quote), sourced };
    });
}
export function researchRows(brandId: string, themes = 10, quotes = 3, about = "", deal: ResearchDeal = {}): ResearchRow[] {
    return sourcedRows(brandId, themes, quotes, about, deal).map(({ sourced: _sourced, ...row }) => row);
}
export interface ResearchForOpts extends ResearchDeal {
    themes?: number;
    quotes?: number;
}
const forOpts = (opts: ResearchForOpts) => ({ themes: opts.themes ?? 6, quotes: opts.quotes ?? (opts.offset === undefined ? 2 : 3) });
export function researchRowsFor(brandId: string, text: string, opts: ResearchForOpts = {}): SourcedRow[] {
    const o = forOpts(opts);
    return sourcedRows(brandId, o.themes, o.quotes, text, opts);
}
export function researchFor(brandId: string, text: string, opts: ResearchForOpts = {}): string {
    const o = forOpts(opts);
    return researchLines(researchRows(brandId, o.themes, o.quotes, text, opts));
}
export function researchLines(rows: ResearchRow[]): string {
    if (!rows.length)
        return "(no research imported for this brand yet: write from the brand context only, and quote no customer)";
    return rows.map((t) => `${t.id} | ${t.type} | ${t.label}: ${t.summary}\n${t.quotes.map((x) => `  "${x}"`).join("\n")}`).join("\n");
}
export const researchText = (brandId: string, themes = 10, quotes = 3, about = ""): string => researchLines(researchRows(brandId, themes, quotes, about));
export const languageLine = (brand: BrandBrain) => `Market: ${brand.brand.market}. Spelling and idiom: ${brand.brand.locale_accent}. Prices in ${brand.brand.currency}.`;
const plain = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
export function quotedIn(text: string): string[] {
    const out: string[] = [];
    for (const m of text.matchAll(/["“]([^"”]{12,400})["”]|(?<![A-Za-z])'([^']{12,400}(?:'[a-z][^']*)*)'(?![A-Za-z])/g)) {
        const q = (m[1] ?? m[2] ?? "").trim();
        if (q.split(/\s+/).length >= 4)
            out.push(q);
    }
    return out;
}
export function verifyQuotes(brandId: string, texts: string[]): {
    real: string[];
    unknown: string[];
} {
    const quotes = [...new Set(texts.flatMap(quotedIn))];
    if (!quotes.length)
        return { real: [], unknown: [] };
    const corpus = db.select({ quote: schema.insights.quote }).from(schema.insights).where(and(eq(schema.insights.brand_id, brandId), customerVoice)).all().map((r) => plain(r.quote));
    try {
        corpus.push(...loadBrandBrain(brandId).personas.flatMap((p) => p.language.map(plain)));
    }
    catch {
    }
    const real = quotes.filter((q) => corpus.some((c) => c.includes(plain(q))));
    return { real, unknown: quotes.filter((q) => !real.includes(q)) };
}
export function quoteChecks(brandId: string, texts: CopyText[]): AuditItem[] {
    return texts.flatMap((t) => verifyQuotes(brandId, [t.text]).unknown.map((q): AuditItem => ({ check: "quote_source", status: "warn", message: `${t.where} quotes "${q.slice(0, 70)}", which is not word for word in the research. Use a customer's exact words, or say it without quotation marks.`, ...(t.index != null ? { line_index: t.index } : {}) })));
}
export interface CopyText {
    text: string;
    where: string;
    surface: "image" | "feed";
    index?: number;
}
const FILLER = /\b(really|very|actually|super|amazing|incredible|high[- ]quality|game[- ]chang\w+|revolutionary|unique)\b/i;
const STOCK = /\b(let's dive in|here's the thing|at the end of the day|in today's fast[- ]paced|whether you're an? [^.]{2,40} or an? |more on that later|but wait, there's more|imagine (waking|if|a world)|say goodbye to|look no further|unlock (your|the)|elevate your|take (it|your \w+) to the next level)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;
const sentencesOf = (s: string) => s.split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
function parallelStack(text: string): string | null {
    const s = sentencesOf(text);
    for (let i = 0; i + 2 < s.length; i++) {
        const first = (x: string) => x.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z']/g, "") ?? "";
        const w = first(s[i]);
        if (w.length > 1 && w === first(s[i + 1]) && w === first(s[i + 2]))
            return `${s[i]} ${s[i + 1]} ${s[i + 2]}`.slice(0, 70);
    }
    return null;
}
export function copyChecks(texts: CopyText[], voice: VoiceProfile = DEFAULT_VOICE, own = ""): AuditItem[] {
    const out: AuditItem[] = [];
    const add = (t: CopyText, check: string, message: string) => out.push({ check, status: "warn", message, ...(t.index != null ? { line_index: t.index } : {}) });
    for (const t of texts) {
        if (!t.text.trim())
            continue;
        if (/[—–]/.test(t.text))
            add(t, "ai_tells", `Dash in ${t.where}. Use a comma or a full stop.`);
        const contrast = t.text.match(CONTRAST_NEGATION);
        if (contrast)
            add(t, "ai_tells", `"${contrast[0].slice(0, 60)}" in ${t.where} is the "it's not X, it's Y" pattern. Say the thing directly.`);
        const stock = t.text.match(STOCK);
        if (stock)
            add(t, "ai_tells", `"${stock[0]}" in ${t.where} is a stock phrase. Start with the fact instead.`);
        const stack = t.surface === "feed" ? parallelStack(t.text) : null;
        if (stack)
            add(t, "ai_tells", `${t.where} repeats the same opening 3 times in a row ("${stack}..."). Make each line add something new.`);
        const filler = t.text.match(FILLER);
        if (filler && !own.includes(filler[0].toLowerCase()))
            add(t, "filler", `"${filler[0]}" in ${t.where} says nothing. Use a number or cut it.`);
        if ((t.text.match(/!/g) ?? []).length > 1)
            add(t, "ai_tells", `${t.where} has more than 1 exclamation mark. Let the fact carry it.`);
        if (t.surface === "image" && EMOJI.test(t.text))
            add(t, "symbols", `${t.where} has an emoji. Image models draw them wrong: write the word.`);
        if (t.surface === "image" && /[↑↓⬆⬇▲▼]/.test(t.text))
            add(t, "symbols", `${t.where} uses an arrow to carry meaning ("${t.text.slice(0, 40)}"). Write the word instead: image models and readers both get arrows wrong.`);
        for (const v of copyRuleChecks([{ text: t.text, where: t.where }], t.index))
            out.push(v);
        const stiff = t.text.split("\n").filter((line) => !/^\s*[*†]/.test(line)).join("\n").match(UNCONTRACTED);
        if (stiff)
            add(t, "contractions", `"${stiff[0]}" in ${t.where}: use the contraction. People don't talk without them.`);
        if (t.surface === "feed" && t.text.split(/\s+/).length >= 25) {
            const grade = readingGrade(t.text);
            if (grade > voice.reading_grade + 1)
                add(t, "reading_level", `${t.where} reads at grade ${grade.toFixed(1)}. For this audience aim for ${voice.reading_grade} or below: shorter sentences, plainer words.`);
            for (const v of voiceRuleChecks({ lines: [{ text: t.text }], grade: voice.reading_grade, spoken: false }))
                add(t, v.check, `${t.where}: ${v.message}`);
        }
        if (/\[[^\]]+\]/.test(t.text))
            add(t, "placeholder", `${t.where} has a placeholder (${t.text.match(/\[[^\]]+\]/)![0]}). Fill it before publishing.`);
    }
    return out;
}
export interface PictureWordFault {
    index: number;
    check: "fragments" | "said_twice";
    what: string;
}
const FIGURE = /[$£€]\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?%|\b\d{2,}(?:[.,]\d+)*\b/g;
const figuresOf = (s: string) => [...new Set((s.match(FIGURE) ?? []).map((f) => f.replace(/[\s,]/g, "")))];
const wordCount = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
export function pictureWordFaults(texts: {
    role?: string;
    text: string;
}[], own = ""): PictureWordFault[] {
    const out: PictureWordFault[] = [];
    const seen = new Map<string, number>();
    texts.forEach((t, index) => {
        if (/\[[^\]]+\]/.test(t.text))
            return;
        const s = sentencesOf(t.text);
        for (let i = 0; i + 2 < s.length; i++) {
            const run = s.slice(i, i + 3);
            if (!run.every((x) => wordCount(x) <= 2))
                continue;
            const said = run.join(" ");
            if (!own.includes(said.toLowerCase()))
                out.push({ index, check: "fragments", what: `"${said}" is a run of fragments: say it as 1 plain sentence` });
            break;
        }
        for (const f of figuresOf(t.text)) {
            const first = seen.get(f);
            if (first == null)
                seen.set(f, index);
            else if (first !== index)
                out.push({ index, check: "said_twice", what: `${f} is already on the picture, in the ${texts[first].role || "text"} ("${texts[first].text.slice(0, 40)}"): a price or a figure is set once, so say this without it` });
        }
    });
    return out;
}
const META_CTA = ["shop now", "learn more", "get offer", "order now", "sign up", "subscribe", "buy now", "see more", "get started", "try now"];
export function feedChecks(copy: {
    primary: {
        text: string;
        where: string;
    }[];
    headlines: string[];
    description?: string;
    cta?: string;
}, index?: number): AuditItem[] {
    const out: AuditItem[] = [];
    const at = index != null ? { line_index: index } : {};
    const pre = index != null ? `Image ${index + 1} ` : "";
    for (const p of copy.primary) {
        const first = sentencesOf(p.text)[0] ?? "";
        if (first.length > 125)
            out.push({ check: "see_more", status: "warn", message: `${pre}${p.where} opens with a sentence of ${first.length} characters. About 125 show before "See more": put the hook inside them.`, ...at });
    }
    copy.headlines.forEach((h, i) => {
        if (h.length > 40)
            out.push({ check: "ad_headline", status: "warn", message: `${pre}ad headline${copy.headlines.length > 1 ? ` ${i + 1}` : ""} is ${h.length} characters; about 40 show.`, ...at });
    });
    if (copy.description && copy.description.length > 30)
        out.push({ check: "ad_description", status: "warn", message: `${pre}description is ${copy.description.length} characters; about 30 show.`, ...at });
    if (copy.cta && !META_CTA.includes(copy.cta.trim().toLowerCase()))
        out.push({ check: "ad_cta", status: "warn", message: `${pre}call to action "${copy.cta}" is not a button the ad manager offers (Shop now, Learn more, Get offer, Order now, Sign up).`, ...at });
    return out;
}
export interface JudgedLine {
    id: string;
    where: string;
    text: string;
    source?: string;
}
export interface JudgedIssue {
    id: string;
    text: string;
    severity: "fail" | "warn";
    problem: string;
}
const JudgeOut = z.object({ issues: z.array(z.object({ id: z.string(), text: z.string(), severity: z.enum(["fail", "warn"]), problem: z.string() })).max(30) });
export async function judgeWords(req: {
    brandId: string;
    brand: BrandBrain;
    what: string;
    lines: JudgedLine[];
    refType: string;
    refId: string;
    productId?: string | null;
}): Promise<JudgedIssue[]> {
    const { brand } = req;
    if (!req.lines.length)
        return [];
    const full = contextLevel("studio_claims") === "full";
    const approved = full ? brand.claims.filter((c) => c.status === "substantiated") : claimsOfProduct(brand, req.productId);
    const offers = full ? brand.offers : offersFor(brand, req.productId);
    const quotes = verifyQuotes(req.brandId, req.lines.map((l) => l.text));
    const out = await structuredJson({
        brandId: req.brandId,
        task: "studio_claims",
        model: env.MODEL_VOICE,
        system: `You check the words on ${req.what} for ${brand.brand.name} before they are rendered. You are the compliance reader: strict, literal, brief.

For each line, decide whether a shopper would read it as a fact or a promised result, and if so whether the brand's material supports it exactly.

Report a line as "fail" when:
- it states or implies that the product treats, cures, prevents or relieves a disease or medical condition;
- it uses a forbidden claim or breaks a guardrail;
- a number, direction or comparison differs from the claim or offer it cites (a rise written as a fall, "40% more" where the claim says "rose 40%", a price that is not in the offers);
- it states a price, a discount, a deadline, a guarantee term or free shipping that is not in the offers or the guarantee given;
- it names or clearly identifies a competitor;
- it tells the reader they have a condition or a personal attribute ("your bloating", "struggling with your weight?", "behind on your bills?", "at your age"): ad platforms reject copy that asserts a health, body, age or money attribute of the viewer. Describing a situation ("mornings when the vegetables come back uneaten") is fine.

Report a line as "warn" when:
- it promises a result ("less bloating", "more energy") that no approved claim covers, even if customers say it in reviews. A customer's own words are fine as a quoted review, not as a benefit the brand states;
- it types out the brand's name as a logo or sign-off (the product in the picture carries the logo);
- it is written in a different language, spelling or currency than the brand's market uses.

Quotes: the app has already looked up every quoted phrase in the full research, which is larger than the sample you are shown. Do not report whether a quote is real. A verified customer quote, presented as a customer's words, may describe a result the brand itself may not claim. Report a quote only when the brand restates it as its own promise outside the quotation marks.
A phrase cited to a persona id (per_...) is that buyer's own vocabulary from the brand's material: it is a legitimate source for wording, not for a fact.

Do not report plain descriptions of the product, its format, taste words customers use about a category ("chalky powders"), headings, or calls to action. Do not report style. If a line is fine, leave it out. "problem" says what is wrong in 1 sentence and what would be acceptable.`,
        user: `${languageLine(brand)}\n\nApproved claims:\n${approved.map((c) => `${c.id}: ${c.text}`).join("\n")}\n\nNot approved (pending or rejected):\n${brand.claims.filter((c) => c.status !== "substantiated").map((c) => `${c.id} (${c.status}): ${c.text}`).join("\n") || "(none)"}\n\nForbidden claims: ${brand.forbidden_claims.join("; ")}\n\nOffers:\n${offers.map((o) => `${o.id}: ${o.name}, ${o.price}${o.per_day ? `, ${o.per_day} a day` : ""}. ${o.notes ?? ""}`).join("\n")}\nGuarantee: ${brand.guarantee?.text ?? "(none)"}\n\nGuardrails:\n${activeGuardrails(req.brandId).filter((g) => g.guardrail.applies).map((g) => `- ${g.guardrail.rule}`).join("\n") || "(none)"}${full ? `\n\nResearch (customers' own words, a sample):\n${researchText(req.brandId)}` : ""}\n\nPersonas' own words: ${brand.personas.map((p) => `${p.id}: ${p.language.join("; ")}`).join(" | ")}\n\n=== PER CALL ===\n\nQuotes in these lines that are word for word in the research: ${quotes.real.map((q) => `"${q}"`).join("; ") || "(none)"}\nQuotes that are not in the research (already reported to the user): ${quotes.unknown.map((q) => `"${q}"`).join("; ") || "(none)"}\n\nLines to check (id | role | text | cited source):\n${req.lines.map((x) => `${x.id} | ${x.where} | ${x.text.replace(/\s+/g, " ")} | ${x.source || "-"}`).join("\n")}`,
        schema: JudgeOut,
        effort: "low",
        maxTokens: 5000,
        refType: req.refType,
        refId: req.refId,
    });
    const ids = new Set(req.lines.map((l) => l.id));
    return out.issues.flatMap((x) => {
        const id = ownId(x.id, ids);
        return id ? [{ ...x, id }] : [];
    });
}
export interface AdForReview {
    id: string;
    format: string;
    templateContract?: string;
    buyer?: string;
    awareness?: string;
    argument: string;
    picture: string;
    layout: string;
    texts: {
        role: string;
        text: string;
    }[];
    feed?: {
        primary_text: string;
        headline: string;
        description?: string;
        cta?: string;
        more?: {
            medium: string;
            long: string;
            headlines: string[];
        };
    };
}
export interface AdIssue {
    id: string;
    test: string;
    problem: string;
    fix: string;
    blocking: boolean;
}
const ReviewOut = z.object({
    ads: z.array(z.object({ id: z.string(), verdict: z.enum(["ready", "fix_first"]), issues: z.array(z.object({ test: z.string(), problem: z.string().min(4), fix: z.string().default(""), blocking: z.boolean().default(false) })).max(3).default([]) })),
});
export async function reviewAds(req: {
    brandId: string;
    brand: BrandBrain;
    ads: AdForReview[];
    refType: string;
    refId: string;
    productId?: string;
    strict?: boolean;
}): Promise<{
    issues: AdIssue[];
    ready: number;
}> {
    if (!req.ads.length)
        return { issues: [], ready: 0 };
    const { brand } = req;
    const focused = contextLevel("ad_review") !== "full";
    const named = brand.personas.filter((x) => req.ads.some((a) => a.buyer === x.id));
    const personas = focused && named.length ? named : brand.personas;
    const offers = focused ? offersFor(brand, req.productId) : brand.offers;
    const said = req.ads.map((a) => `${a.argument} ${a.texts.map((t) => t.text).join(" ")} ${staticFeedLines(a.feed).map((t) => t.text).join(" ")}`).join(" ");
    const picked = claimsFor(brand, said, 6, req.productId);
    const claims = focused ? [...picked.core, ...picked.more] : brand.claims.filter((c) => c.status === "substantiated");
    const rules = req.strict === false ? [] : activeGuardrails(req.brandId).filter((g) => g.guardrail.applies).map((g) => `- ${g.guardrail.rule}`);
    const p = renderPrompt("ad-review", {
        brand_name: brand.brand.name,
        brand_voice: brandVoiceText(req.brandId, { surfaces: ["on_image", "headline", "primary_text"], personaIds: named.map((x) => x.id), brand }),
        lessons: learnedRules(req.brandId, "judges", { productId: req.productId }),
        language: languageLine(brand),
        stage: String(brand.market_sophistication_stage),
        personas: personas.map((x) => `${x.id}: ${x.name}. ${x.summary} Problem: ${x.problem}. Their words: ${x.language.slice(0, 6).join("; ")}`).join("\n"),
        offers: offers.map((o) => `${o.id}: ${o.name}, ${o.price}${o.per_day ? `, ${o.per_day} a day` : ""}. ${o.notes ?? ""}`).join("\n") || "(none)",
        claims: `${claims.map((c) => `${c.id}: ${c.text}`).join("\n") || "(none)"}\nGuarantee: ${brand.guarantee?.text ?? "(none)"}${rules.length ? `\n\nRules the copy must keep (a fix never asks for one to be dropped):\n${rules.join("\n")}` : ""}\nNever said: ${brand.forbidden_claims.join("; ") || "(none)"}`,
        research: focused ? researchText(req.brandId, 5, 2, said) : researchText(req.brandId, 10, 3),
        ads: req.ads
            .map((a) => [
            `### ${a.id}: ${a.format}`,
            `For: ${a.buyer || "(not named)"}; awareness: ${a.awareness || "(not named)"}`,
            `Argument: ${a.argument}`,
            `Picture: ${a.picture}`,
            a.layout ? `Layout: ${a.layout}` : "",
            a.templateContract ? `Template contract: ${a.templateContract}` : "",
            `Words on the image, in reading order:\n${a.texts.map((t) => `- ${t.role}: "${t.text}"`).join("\n") || "(none)"}`,
            a.feed ? `Feed copy (complete; identical text shares its field labels):\n${staticFeedLines(a.feed).map((t) => `${t.where}: ${t.text}`).join("\n")}` : "",
        ]
            .filter(Boolean)
            .join("\n"))
            .join("\n\n"),
    });
    const out = await structuredJson({ brandId: req.brandId, task: "ad_review", model: env.MODEL_VOICE, system: [p.system, req.ads.some((a) => a.templateContract) ? staticTemplateMethod("Review") : ""].filter(Boolean).join("\n\n"), user: p.user, schema: ReviewOut, effort: "medium", maxTokens: 6000, refType: req.refType, refId: req.refId });
    const ids = new Set(req.ads.map((a) => a.id));
    const ads = out.ads.flatMap((a) => {
        const id = ownId(a.id, ids);
        return id ? [{ ...a, id }] : [];
    });
    return { issues: ads.flatMap((a) => a.issues.map((i) => ({ id: a.id, ...i, blocking: a.verdict === "fix_first" && i.blocking }))), ready: ads.filter((a) => a.verdict === "ready").length };
}
const NOTICE_WORDS = new Set("ad ads advert adverts must should need needs have has disclose warn mention state say that this these those some any all customers customer people person users user buyers buyer may might can could will would cause causes experience experiences first few days day weeks week months month body normal option options recommend recommended with from when where while also their they them your yours more most than into such each every always never before after during about product products brand results result vary varies individual adjusts adjust and the for are not but its was were been being which who whom what does do did".split(" "));
const stem = (w: string) => (w.length > 5 ? w.replace(/(ing|ed|es|s)$/, "") : w.replace(/s$/, ""));
const wordsIn = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").split(/[^a-z']+/).filter(Boolean);
export function disclosureSubjects(notice: string): {
    words: {
        stem: string;
        long: boolean;
    }[];
    names: string[];
} {
    const seen = new Set<string>();
    const words = wordsIn(notice)
        .filter((w) => w.length >= 4 && !NOTICE_WORDS.has(w))
        .map((w) => ({ stem: stem(w), long: w.length >= 7 }))
        .filter((w) => !seen.has(w.stem) && !!seen.add(w.stem));
    const names = [...notice.matchAll(/(?<=[a-z,;:(]\s)[A-Z][A-Za-z]+(?:[- ][A-Z][A-Za-z]+)*/g)].map((m) => m[0].toLowerCase().replace(/-/g, " "));
    return { words, names: [...new Set(names)] };
}
export function statesDisclosed(notice: string, said: string): boolean {
    const about = disclosureSubjects(notice);
    const text = said.toLowerCase().replace(/-/g, " ");
    if (about.names.some((n) => text.includes(n)))
        return true;
    const mine = new Set(wordsIn(said).map(stem));
    const hits = about.words.filter((w) => mine.has(w.stem));
    return hits.some((w) => w.long) || hits.length >= 2;
}
