import fs from "node:fs";
import path from "node:path";
import type { ScriptAxes } from "@/db/schema";
import { SCRIPT_WORDS, chosenLength, isStoryStage, scriptLengthText, shortForStory } from "../copy/stage";
import { env } from "../env";
import { paceSaid, speechPace } from "../pace";
import { isBrandLine } from "../personas/brand-lines";
import { emotionLabel, scriptType } from "../script-types";
import { AWARENESS_INFO, LENGTH_SECONDS, type AwarenessStage, type InsightType, type OutputType } from "../taxonomy";
import { lookFromVariety } from "../taste/compat";
import { decide } from "../taste/decisions";
import type { ContextPlan, FactsText, Taste } from "../taste/types";
import { OUTPUT_TYPES } from "../taxonomy";
import { clampVariety, varietyTemperature } from "../variety";
import { formatSkill, formatSkillText } from "./skills";
import { withoutSections } from "../llm/context";
let forProcess: boolean | null = null;
export function setScriptFlow(on: boolean | null) {
    forProcess = on;
}
export const scriptFlowOn = (): boolean => forProcess ?? process.env.SCRIPT_FLOW !== "off";
export const scriptBriefOn = (): boolean => process.env.SCRIPT_BRIEF !== "off";
export interface StoryBrief {
    speaker: string;
    before: string;
    turn: string;
    after: string;
    figures: string[];
}
const BRIEF_HEAD = "Story brief:";
const BRIEF_ROWS: [
    keyof Omit<StoryBrief, "figures">,
    string
][] = [["speaker", "Who speaks"], ["before", "Before"], ["turn", "Turning point"], ["after", "After"]];
export function briefNote(b: StoryBrief | null | undefined): string {
    if (!b)
        return "";
    const one = (x: string) => x.replace(/\s+/g, " ").trim();
    const rows = BRIEF_ROWS.filter(([k]) => one(b[k] ?? "")).map(([k, label]) => `- ${label}: ${one(b[k])}`);
    const figures = (b.figures ?? []).map(one).filter(Boolean);
    if (!rows.length)
        return "";
    return [BRIEF_HEAD, ...rows, figures.length ? `- Figures said, and whose each is: ${figures.join("; ")}` : ""].filter(Boolean).join("\n");
}
export function briefFromNotes(notes: string | null | undefined): string {
    const all = (notes ?? "").split(/\r?\n/);
    const at = all.findIndex((l) => l.trim() === BRIEF_HEAD);
    if (at < 0)
        return "";
    const rows: string[] = [];
    for (const l of all.slice(at + 1)) {
        if (!l.startsWith("- "))
            break;
        rows.push(l);
    }
    return rows.join("\n");
}
export const tellingFromNotes = (notes: string | null | undefined): string => (notes ?? "").split(/\r?\n/).find((l) => l.startsWith("Told as: "))?.slice(9).trim() ?? "";
export function figuresSaid(lines: {
    text: string;
}[]): string[] {
    const out: string[] = [];
    for (const l of lines)
        for (const s of l.text.split(/(?<=[.!?])\s+/))
            if (/\d/.test(s) && !out.includes(s.trim()))
                out.push(s.trim());
    return out.slice(0, 10);
}
const PERSONAL_FACT = /\d|[$£€]|\b(one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|a few|several|half)\b[^.]{0,24}\b(years?|months?|weeks?|days?|pounds?|lbs|kilos?|dollars?|bucks|price)\b/i;
export function customerWords(language: string[], brandDir?: string): {
    phrases: string[];
    facts: string[];
} {
    const clean = language.map((l) => l.trim()).filter((l) => l && !isBrandLine(l, brandDir));
    return { phrases: clean.filter((l) => !PERSONAL_FACT.test(l)), facts: clean.filter((l) => PERSONAL_FACT.test(l)) };
}
export const HOW_CUSTOMERS_TALK = "How customers talk, as a reference: borrow a phrase where it fits a sentence of your own, and none has to be used. Never borrow a customer's figure, price, named product or health result as the narrator's own.";
export const offerSayLine = (say: string) => `One way a person might put it. A reference for the sense: say it your own way, fitted to this speaker and this moment, and never recite it: "${say.trim()}"`;
export function productFacts(brand: {
    brand: {
        one_liner?: string;
    };
    guarantee?: {
        text: string;
    } | null;
}, product: {
    name: string;
    format?: string;
    ingredients?: {
        name: string;
        dose?: string;
        job?: string;
    }[];
    specs?: {
        name: string;
        value: string;
    }[];
    variants?: string[];
} | null | undefined): string[] {
    const held = (x?: string) => (x && !/not captured|^n\/?a$/i.test(x.trim()) ? x.trim() : "");
    return [
        product ? `${product.name}${product.format ? `: ${product.format}` : ""}` : "",
        ...(product?.ingredients ?? []).map((i) => [i.name.trim(), held(i.dose), held(i.job)].filter(Boolean).join(". ")),
        ...(product?.specs ?? []).filter((s) => s.name.trim() && s.value.trim()).map((s) => `${s.name.trim()}: ${s.value.trim()}`),
        product?.variants?.length ? `Comes in: ${product.variants.join(", ")}` : "",
        brand.brand.one_liner ? `The brand's own line for it (its facts are true; its wording is not to be repeated): ${brand.brand.one_liner}` : "",
    ].filter(Boolean);
}
export const FORCES_FORM = /\b(\d|two|three)[- ]beats?\b|\bcadence\b|\brhythms?\b|\bpunchy\b|short sentences|sentence length|lead with (a |the )?numbers?|weight(ed)? (nouns?|words?)|\bend (every |each )?(lines?|sentences?)\b|long paragraphs|\bfragments?\b/i;
const PERSON_SAID = new Set(["edits", "manual", "feedback"]);
export function adviceBlock(lessons: {
    rule: string;
    category: string;
    scope: string;
    source?: string;
}[]): string {
    const facts = lessons.filter((l) => l.category === "product_use" && l.scope !== "general");
    const advice = lessons.filter((l) => !facts.includes(l) && (PERSON_SAID.has(l.source ?? "") || !FORCES_FORM.test(l.rule)));
    return [
        facts.length ? `## How this product is opened, held and used\nFacts for the pictures: every shot that shows it in use follows them exactly. The spoken words need not describe any of it.\n${facts.map((l) => `- ${l.rule}`).join("\n")}` : "",
        advice.length
            ? `## Advice from feedback on earlier work\nNotes on earlier pieces. They sit below the principles: where a note would make a line less natural to say, or bend the story, the principles win. A brand phrase or catchphrase that a note or the voice names may be used where a person would really say it: at most once in the piece, and never because a note asks for it.\n${advice.map((l) => `- ${l.rule}`).join("\n")}`
            : "",
    ]
        .filter(Boolean)
        .join("\n\n");
}
const STOP = new Set("that this with from they them their have will what when your about just into than then there been were would could should still really because which while being does don't can't isn't take taking takes took make makes made like want need feel feels felt know think thing things going".split(" "));
const keys = (x: string) => new Set(x.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/, "")));
export function pairDoubts(doubts: string[], proofs: string[]): {
    doubt: string;
    proof: string | null;
}[] {
    return doubts.map((doubt) => {
        const d = keys(doubt);
        const best = proofs.map((proof) => ({ proof, n: [...keys(proof)].filter((w) => d.has(w)).reduce((sum, w) => sum + (w.length >= 8 ? 2 : 1), 0) })).sort((a, b) => b.n - a.n)[0];
        return { doubt, proof: best && best.n >= 2 ? best.proof : null };
    });
}
export interface VarietyContext {
    brandAds: boolean;
    voice: "full" | "basics";
    freeSpeaker: boolean;
    temperature: number;
}
export function varietyContext(v: unknown): VarietyContext {
    const stop = clampVariety(v);
    return { brandAds: stop <= 2, voice: stop >= 4 ? "basics" : "full", freeSpeaker: stop >= 4, temperature: varietyTemperature(stop) };
}
export function wordsPlan(surface: "script" | "hooks" | "caption", o: {
    stage?: string | null;
    format?: string | null;
    taste?: Taste | null;
    variety?: unknown;
    hasReference?: boolean;
    keepWords?: boolean;
}): ContextPlan {
    const taste: Taste = { ...(o.taste ?? {}) };
    if (!taste.look && o.variety != null)
        taste.look = lookFromVariety(o.variety);
    return decide({ surface, stage: o.stage, format: o.format, hasReference: !!o.hasReference, hasBrandRefs: true, keepWords: o.keepWords }, taste);
}
export const sentBy = (plan: ContextPlan): VarietyContext => ({ brandAds: plan.text.voice === "own_ads", voice: plan.text.voice === "basics" ? "basics" : "full", freeSpeaker: plan.taste.look === "new", temperature: plan.temperature });
export function factBudget(stage: AwarenessStage, facts: FactsText = "standard"): {
    product: "name" | "all";
    claims: number;
    doubts: number;
    causes: number;
} {
    if (facts === "none")
        return { product: "name", claims: 0, doubts: 0, causes: 0 };
    if (stage === "unaware")
        return { product: "name", claims: 1, doubts: 0, causes: 3 };
    if (stage === "problem_aware")
        return { product: "all", claims: 2, doubts: 2, causes: 3 };
    return { product: "all", claims: facts === "core" ? 2 : facts === "full" ? 40 : 6, doubts: facts === "core" ? 2 : 3, causes: 0 };
}
const CAUSE = /\b(because|causes?d?|why|reasons?|due to|leads? to|comes? from|results? in|happens? when|linked to|tied to|depends? on|wears? (out|down)|breaks? down|builds? up|runs? out|without enough|not enough|too (little|much|few|many)|lacks?|lacking|loses?|lost|missing|most (people|adults|women|men|owners|homes|dogs|cats)|on average|the average)\b/i;
export function causeFacts(held: string[], problem: string, max = 3): string[] {
    if (max <= 0)
        return [];
    const about = keys(problem);
    return held
        .filter((f) => CAUSE.test(f) && !OFFER_TERM.test(f))
        .map((f, i) => ({ f, i, n: [...keys(f)].filter((w) => about.has(w)).length }))
        .sort((a, b) => b.n - a.n || a.i - b.i)
        .slice(0, max)
        .map((x) => x.f)
        .filter((x, i, all) => all.indexOf(x) === i);
}
export function causeNote(stage: AwarenessStage, causes: string[]): string {
    if (!isStoryStage(stage))
        return "";
    return causes.length
        ? `Why the problem happens, as the brand holds it. This is the cause the ad may explain, and the only one. Say it the way a friend would explain it, in plain words: the fact is held, its wording is not. A figure in it stays exact.\n${causes.map((f) => `- ${f}`).join("\n")}`
        : "Why the problem happens: the brand holds no fact about its cause. So the ad states none. Stay on the problem as this buyer lives it and on what they notice themselves (when it happens, what it stops them doing, what each fix they tried left undone). That is enough to make it felt, and nothing here needs a study or a body explained.";
}
export function checkScriptFormat(format: string | null | undefined): void {
    if (format && !(OUTPUT_TYPES as readonly string[]).includes(format))
        throw new Error(`"${format}" is not an ad format the app makes. Use one of: ${OUTPUT_TYPES.join(", ")}.`);
}
export function voiceBasics(voice: string): string {
    const [lead, ...sections] = voice.split(/\n(?=### )/);
    return [lead.trim(), ...sections.filter((x) => /^### (Don't|Guardrails)/.test(x)).map((x) => x.trim())].join("\n\n");
}
export const OFFER_TERM = /[$£€]\s?\d|\b(guarantee|money[- ]back|refund|cancel|subscription|free shipping|first order|per day|a day on)\b/i;
const sentencesOf = (x: string) => x.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
const figs = (x: string) => (x.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replace(/,/g, ""));
export type OfferSaid = "none" | "one" | "full";
export const offerSaidAt = (stage: AwarenessStage, noOffer = false): OfferSaid => (noOffer || stage === "unaware" || stage === "problem_aware" ? "none" : stage === "most_aware" ? "full" : "one");
export const offerSaidBy = (plan: ContextPlan, stage: AwarenessStage, noOffer: boolean, moved: boolean): OfferSaid => (noOffer ? "none" : !moved ? offerSaidAt(stage) : plan.text.offer === "none" ? "none" : plan.text.offer === "full" ? "full" : "one");
export interface OfferForWriter {
    tryPrice: string;
    guarantee: string;
    terms: string[];
    say?: string;
}
export function offerForStage(said: OfferSaid, o: OfferForWriter | null): string {
    if (said === "none" || !o)
        return "### The offer\nNot said in this ad. It states no price, no deal and no guarantee: this buyer is not ready for one. It ends on the after, and at most the next small step (see it, try it).";
    if (said === "one") {
        const options = [o.tryPrice ? `- What it costs to try: ${o.tryPrice}.` : "", o.guarantee ? `- What makes trying safe: ${o.guarantee}` : ""].filter(Boolean);
        return ["### The offer", `Say ${options.length > 1 ? "1 of these 2" : "this"}, once, the way a friend mentions it, at the point the story reaches it${options.length > 1 ? ". Not both" : ""}, and no other term, price or figure of the deal: the full terms sit under the caption, where terms belong.`, ...options].join("\n");
    }
    return ["### The offer", "This buyer knows the product, so the deal can be the ad. Told as talk: 1 term to a sentence, each joined to why it matters to them, every number exact, each said once. Never \"risk-free\".", o.say?.trim() ? offerSayLine(o.say) : "", ...o.terms].filter(Boolean).join("\n");
}
export function selectFacts(always: string[], more: string[], about: string, max = 6): string[] {
    const a = keys(about);
    const scored = more.map((f, i) => ({ f, i, n: [...keys(f)].filter((w) => a.has(w)).length })).filter((x) => x.n > 0).sort((x, y) => y.n - x.n || x.i - y.i);
    return [...always, ...scored.slice(0, max).map((x) => x.f)].filter((x, i, all) => x && all.indexOf(x) === i);
}
export function exactFor(sentence: string, held: string[]): string {
    const mine = figs(sentence);
    if (!mine.length)
        return "";
    const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const telling = (x: string) => x.includes(".") || x.length >= 2;
    const best = held.map((h) => ({ h, n: figs(h).filter((x) => mine.includes(x)).length, t: figs(h).some((x) => telling(x) && mine.includes(x)) })).filter((x) => x.t && x.n >= Math.ceil(mine.length / 2)).sort((a, b) => b.n - a.n)[0];
    return best && best.n > 0 && !norm(best.h).includes(norm(sentence)) && !norm(sentence).includes(norm(best.h)) ? best.h : "";
}
export interface DoubtForWriter {
    doubt: string;
    proof: string;
    exact: string[];
}
export function doubtsFor(pairs: {
    doubt: string;
    proof: string | null;
}[], about: string, said: OfferSaid, held: string[] = [], max = 3): DoubtForWriter[] {
    const a = keys(about);
    return pairs
        .map((x, i) => {
        const proof = sentencesOf((x.proof ?? "").replace(/^On "[^"]*":\s*/, "")).filter((s) => said === "full" || !OFFER_TERM.test(s));
        return { doubt: x.doubt, proof: proof.join(" "), exact: [...new Set(proof.map((s) => exactFor(s, held)).filter(Boolean))], i, n: [...keys(`${x.doubt} ${proof.join(" ")}`)].filter((w) => a.has(w)).length };
    })
        .filter((x) => x.proof)
        .sort((x, y) => y.n - x.n || x.i - y.i)
        .slice(0, max)
        .map(({ doubt, proof, exact }) => ({ doubt, proof, exact }));
}
const strip = (md: string) => md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
const read = (rel: string, root: string) => {
    const f = path.join(root, rel);
    return fs.existsSync(f) ? strip(fs.readFileSync(f, "utf-8").replace(/\r\n/g, "\n")) : "";
};
const STORY_SECTION = /\n### How a story moves\n[\s\S]*?(?=\n#{2,3} )/;
export const principlesText = (root: string = env.SKILLS_DIR, o: {
    longStory?: boolean;
} = {}): string => {
    const text = read("ad-principles/SKILL.md", root);
    return o.longStory ? text.replace(STORY_SECTION, '\n### How a story moves\nThis ad is the long story of the buyer\'s problem. How one is told and held is given with the request, under "Long story copy": follow that.\n') : text;
};
const FORMAT_NOTE: Partial<Record<OutputType, string>> = { human_brief_founder: "founder", human_brief_ugc: "ugc", ai_ugc: "ugc", ai_claymation: "claymation", ai_vsl: "vsl", human_brief_editor: "vsl", static_image: "static" };
const NOT_FOR_WRITER_PART = /^(Length|What to avoid)/i;
const NOT_FOR_WRITER_CORE = /^(Length|What to avoid|What it is good for|What this reads from the brand brain)$/i;
export function formatNote(format: OutputType | null | undefined, root: string = env.SKILLS_DIR): string {
    if (!format)
        return "Format: not chosen yet. Write it so that 1 person could say it to a camera.";
    const own = FORMAT_NOTE[format] ? read(`ad-principles/formats/${FORMAT_NOTE[format]}.md`, root) : "";
    if (own)
        return own;
    const old = formatSkillText(format, root);
    if (!old)
        return "";
    const part = old.medium ? (formatSkill(old.name, old.medium, root)?.part ?? "") : "";
    const body = part ? withoutSections(part, NOT_FOR_WRITER_PART) : withoutSections(old.text, NOT_FOR_WRITER_CORE);
    return `Format notes. Where they give an order of beats, that is 1 option and not a rule.\n${body}`;
}
export const STAGE_WORDS: Record<AwarenessStage, [
    number,
    number
]> = SCRIPT_WORDS;
export interface Find {
    theme: {
        id: string;
        type: InsightType;
        label: string;
        summary: string;
    };
    quotes: {
        quote: string;
        source: string;
    }[];
}
const FINDS: {
    title: string;
    types: InsightType[];
    missing?: string;
}[] = [
    { title: "What they want", types: ["desire", "purchase_driver"] },
    { title: "What they do to live with it (the problem, as they live it)", types: ["accommodation"], missing: "what they do to live with the problem" },
    { title: "The day they went looking", types: ["trigger_moment"] },
    { title: "What they tried, and why they stopped (the doubt they bring)", types: ["failed_solution"], missing: "what they tried before" },
    { title: "What nearly stops them buying", types: ["final_objection", "objection"], missing: "what nearly stops them buying" },
    { title: "Their words for it", types: ["buyer_word"] },
    { title: "Proof customers give", types: ["proof_point"] },
    { title: "Where buyers were let down (never promise the opposite)", types: ["failure_mode"] },
];
const clip = (s: string, n: number) => s.replace(/\s+/g, " ").trim().slice(0, n);
export interface ReasonInput {
    persona?: {
        name: string;
        summary: string;
        problem: string;
        trigger: string;
        language: string[];
        wants?: string;
        identity?: string;
        notes?: string;
        tried?: string[];
        objections?: string[];
        believes?: string[];
    } | null;
    personaId: string;
    angle: string;
    claim?: string;
    awareness: AwarenessStage;
    stageBrief: string;
    finds: Find[];
    terms: string[];
    noOffer?: boolean;
    tryPrice?: string;
    guarantee?: string;
    held?: string[];
    deal?: OfferSaid;
    doubtsMax?: number;
    wordsMax?: number;
    offerSay?: string;
    asked: string;
    causes?: string[];
}
export function missingNote(stage: AwarenessStage, missing: string[]): string {
    if (!missing.length)
        return "";
    const never = "Invent no customer quote, figure, study or health result for them, name no other product or brand, and give no price or figure that the buyer's record does not hold.";
    return isStoryStage(stage)
        ? `Not in the research for this ad: ${missing.join("; ")}. The story still needs them, so draw them from ordinary life for this buyer: the small ways anyone living with this rearranges a day around it, and the everyday kinds of fix people reach for and give up on, said as kinds of thing and never as a named product. That is colour, not fact, and it is yours to imagine. ${never}`
        : `Not in the research for this ad: ${missing.join("; ")}. ${never} The story around it is yours to imagine.`;
}
export function reasonBlock(r: ReasonInput): string {
    const { research, missing } = researchFor(r.finds, r.persona, r.wordsMax);
    return reasonBlockBody(r, research, missing);
}
export function researchFor(finds: Find[], p: ReasonInput["persona"], wordsMax?: number): {
    research: string[];
    missing: string[];
} {
    const groups = FINDS.map((g) => ({ ...g, items: finds.filter((f) => g.types.includes(f.theme.type)) }));
    const all = customerWords(p?.language ?? []);
    const said = { phrases: all.phrases.slice(0, wordsMax ?? all.phrases.length), facts: all.facts };
    const words = said.phrases.length ? `- From their profile: ${said.phrases.map((l) => `"${l}"`).join(", ")}` : "";
    const ownFacts = said.facts.length ? `- 1 customer's own result or figure, theirs and never the narrator's: ${said.facts.map((l) => `"${l}"`).join(", ")}` : "";
    const research = groups
        .filter((g) => g.items.length || (g.types[0] === "buyer_word" && words) || (g.types[0] === "proof_point" && ownFacts) || (g.types[0] === "trigger_moment" && p?.trigger))
        .map((g) => [
        `**${g.title}**`,
        g.types[0] === "trigger_moment" && p?.trigger ? `- From their profile: ${p.trigger}` : "",
        g.types[0] === "buyer_word" ? words : "",
        g.types[0] === "proof_point" ? ownFacts : "",
        ...g.items.map((f) => `- [${f.theme.id}] ${f.theme.label}: ${clip(f.theme.summary, 220)}${f.quotes.map((q) => `\n   "${clip(q.quote, 240)}" (${q.source === "founder" ? "the founder's words, never a customer's" : q.source})`).join("")}`),
    ]
        .filter(Boolean)
        .join("\n"));
    const held = (g: {
        types: InsightType[];
    }) => (g.types[0] === "failed_solution" && !!p?.tried?.length) || (g.types[0] === "final_objection" && !!p?.objections?.length);
    return { research, missing: groups.filter((g) => g.missing && !g.items.length && !held(g)).map((g) => g.missing!) };
}
function reasonBlockBody(r: ReasonInput, research: string[], missing: string[]): string {
    const p = r.persona;
    const list = (title: string, xs?: string[]) => (xs?.length ? [title, ...xs.map((x) => `- ${x}`)].join("\n") : "");
    const profile = [p?.identity ? `How they see themselves: ${p.identity}` : "", p?.wants ? `Where they want to be (the after): ${p.wants}` : "", list("What they tried before, and why they stopped:", p?.tried), p?.notes ? `Also known about them: ${p.notes}` : ""].filter(Boolean);
    const of = (types: InsightType[]) => r.finds.filter((f) => types.includes(f.theme.type)).map((f) => `${f.theme.label}: ${clip(f.theme.summary, 160)}`);
    const proofs = [...(p?.believes ?? []), ...of(["proof_point"])];
    const deal = r.deal ?? offerSaidAt(r.awareness, r.noOffer);
    const most = r.doubtsMax ?? 3;
    const about = `${r.angle} ${r.claim ?? ""}`;
    const allPairs = pairDoubts([...(p?.objections ?? []), ...of(["final_objection", "objection"])], proofs);
    const pairs = most ? doubtsFor(allPairs, about, deal, r.held ?? [], most) : [];
    const paired = new Set(allPairs.map((x) => x.proof));
    const spare = doubtsFor((p?.believes ?? []).filter((x) => !paired.has(x)).map((x) => ({ doubt: "", proof: x })), about, deal, r.held ?? [], most ? 2 : 0);
    const exact = (x: DoubtForWriter) => (x.exact.length ? `\n   A figure is said as the brand holds it: ${x.exact.map((e) => `"${e}"`).join(" ")}` : "");
    const doubts = [
        "### Doubts and proof",
        pairs.length
            ? "The only doubts this ad may raise, each in the sense written here, and the only proof that may answer each. A proof shows what it literally says and no more (what is in a product does not show it works; a result for one thing is not a result for another). Raise a doubt only if you answer it at once with its proof. Any other doubt is left unsaid."
            : most
                ? "No doubt is held with a proof that fits this ad, so the ad raises none."
                : "This buyer has no doubt about the product yet: they do not know it. The ad raises none and answers none.",
        ...pairs.map((x) => `- Doubt: ${x.doubt}\n   Its proof: ${x.proof}${exact(x)}`),
        spare.length ? `Other proof held for this buyer (use one only for what it literally says):\n${spare.map((x) => `- ${x.proof}${exact(x)}`).join("\n")}` : "",
        `${r.causes?.length ? 'The cause of the buyer\'s problem is said only as "The facts" hold it, in plain words. No other medical cause' : "No medical cause of the buyer's problem"} and no account of what the product does to a body that is not written in the facts. 1 figure to a sentence, with what it means for this buyer. A result belongs to a person who is in the ad: the speaker's own, or said as what customers report, and never more exact than it is held. When a real customer's result is the proof, the speaker says it in their own words as part of the story: never "one reviewer wrote", "a customer said" or a review read out.`,
    ]
        .filter(Boolean)
        .join("\n");
    const claim = r.claim?.trim() && r.claim.trim() !== r.angle.trim() ? `The claim it rests on: ${r.claim.trim()}` : "";
    return [
        "## The reason for this ad",
        `Who it is for: ${p ? `${p.name}. ${p.summary} What they live with: ${p.problem}` : r.personaId}`,
        ...profile,
        `The idea: ${r.angle}`,
        claim,
        r.asked,
        `Where they are: ${AWARENESS_INFO[r.awareness].label}.`,
        r.stageBrief,
        "",
        "### What the research holds",
        `Real customers. ${HOW_CUSTOMERS_TALK}`,
        research.join("\n"),
        "",
        doubts,
        missingNote(r.awareness, missing),
        "",
        offerForStage(deal, r.noOffer ? null : { tryPrice: r.tryPrice ?? "", guarantee: r.guarantee ?? "", terms: r.terms, say: r.offerSay }),
    ]
        .filter((x, i, all) => x !== "" || (i > 0 && all[i - 1] !== ""))
        .join("\n");
}
function wayIn(id: string | undefined, root: string): string {
    const type = scriptType(id);
    if (!type || type.id === "straight-argument")
        return "";
    const recipe = read(`script-types/types/${type.id}.md`, root).split(/\r?\n/).filter((l) => !/^# /.test(l) && !/^- \*\*(Beat order|Person and tense):\*\*/.test(l)).join("\n").trim();
    return `A way in you could take: ${type.label}. Use it where it serves the idea and the stage. Where another way of telling serves them better, take that one and say so in the notes.\n${recipe}`;
}
const howLinesRun = (band: string | null): string => band === "under 30"
    ? "this speaker's sentences run into each other, 1 thought straight into the next"
    : band === "60 to 74" || band === "75 and over"
        ? "this speaker's sentences are fuller, and each is finished before the next begins"
        : "each sentence follows straight on from the last";
export function paceLine(age?: string | null, long = false): string {
    const { rate, band } = speechPace(age, { long });
    return `Pace: the speaker is ${band ? `aged ${band}` : "an adult"} and talks at ${paceSaid(rate)}, the way people talk to a friend, not the way a script is read out. Write lines that are said in 1 run at that pace: ${howLinesRun(band)}. No line asks for a pause.`;
}
export function flowControls(axes: ScriptAxes, format: OutputType | null | undefined, voiceRules: string, awareness: AwarenessStage, root: string = env.SKILLS_DIR, sent: VarietyContext = varietyContext(axes.variety), reference = "", speaker: string | null = null): string {
    checkScriptFormat(format);
    const stage = STAGE_WORDS[awareness] ? awareness : "problem_aware";
    const chosen = chosenLength(axes);
    const long = !!chosen && LENGTH_SECONDS[chosen] > 60;
    const perTen = Math.round(speechPace(speaker, { long }).rate * 10);
    return [
        format === "static_image"
            ? ""
            : `Length: ${chosen ? "" : "as long as this buyer needs: "}${scriptLengthText(stage, chosen, speaker)}${chosen ? "" : " Nobody counts: tell it properly, and stop when it is told, unless the person asked for a length for this ad (see what they asked for)."} Where the format notes count words to a clip, a clip of about 10 seconds holds about ${perTen} words at this speaker's pace (see Pace below).${isStoryStage(stage) && !shortForStory(stage, chosen, speaker) ? " A long story is more than 1 scene: it may move through several moments of the same person's life with the problem, each leading into the next." : ""}`,
        reference,
        sent.freeSpeaker
            ? `Who speaks: the usual choice here would be ${axes.person} person, ${axes.tense} tense. You were sent none of this brand's past ads on purpose: the speaker, the scene and the form are yours to choose (1 person's own story, a talk between 2 people, a letter, a list of mornings, a single scene held to the end), and do not open on the scene the idea itself names. Hold your choice from the first line to the last, and name it in \`telling\`. Every hook is in the same person.`
            : `Who speaks: ${axes.person} person, ${axes.tense} tense, ${axes.register} register. Every hook is in the same person.${sent.brandAds ? " The brand's own published ads are sent with its voice: take your shape and your way in from them." : ""}`,
        format === "static_image" ? "" : paceLine(speaker, long),
        axes.emotion ? `Feel: it leads with ${emotionLabel(axes.emotion) || axes.emotion}${axes.emotion_end ? ` and ends on ${emotionLabel(axes.emotion_end) || axes.emotion_end}` : ""}. If the brand's voice forbids this feel, use the nearest it allows and say so in the notes.` : "",
        wayIn(axes.script_type, root),
        `Writing for the voice (each is checked afterwards):\n${voiceRules}`,
    ]
        .filter(Boolean)
        .join("\n\n");
}
