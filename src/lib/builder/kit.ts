import fs from "node:fs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { brandLookState, loadBrandLook, lookFile, lookFingerprint, specimenMissing } from "../brand-look";
import { splitFingerprint, typeBlock } from "../studio/request";
import { brandOwnWords, brandVoiceText } from "../brand-voice";
import { loadBrandBrain } from "../brands";
import { env } from "../env";
import { lessonBlock, lessonsFor } from "../lessons";
import { structuredJson } from "../llm/structured";
import { assetPath, generateImage, MediaCapError, MediaDisabledError } from "../media/providers";
import { getPersona } from "../personas/store";
import { specLine } from "../product-facts";
import { productPlace, productRule, sendsProductPhoto } from "../product-in-picture";
import { ensureCreativeKit, productForScript, productImages } from "../production/kit";
import { renderPrompt } from "../prompts";
import { askedLine, factSheetFor, researchFinds } from "../scripts/engine";
import { factCheck, factFaultLine, factFaults, factStore, type FactRow } from "../scripts/fact-check";
import { NO_OFFER_TERMS, offerParts, termsBlock, termsLine } from "../scripts/fact-rules";
import { HOW_CUSTOMERS_TALK, adviceBlock, briefFromNotes, customerWords, figuresSaid, missingNote, offerForStage, offerSaidBy, principlesText, researchFor, tellingFromNotes, wordsPlan, type OfferSaid } from "../scripts/flow";
import { readingGradeOf, type VoiceProfile } from "../scripts/voice-rules";
import { countedOf } from "../copy/figures";
import { dealSeeds, seedsBlock, spentLine } from "../copy/seeds";
import { spentFor, worldFor } from "../copy/spent";
import { deckStart } from "../studio/deal";
import { PRIMARY_WORDS, headlineRule, isStoryStage, primaryLengthText, stageName, termsRule } from "../copy/stage";
import { faultLine, lengthFault, wordFaults, type WordLine } from "../copy/word-faults";
import { checkWords, floorText, leftLine } from "../copy/words-read";
import { llmEnabled } from "../llm/gateway";
import { getSetting } from "../settings";
import { craftText } from "../skills/craft";
import type { AwarenessStage } from "../taxonomy";
import { tasteBlock } from "../taste/apply";
import { versionsOf } from "../scripts/versions";
import { clampVariety, varietyNote, varietyTemperature } from "../variety";
import { stageBrief } from "../scripts/stage-brief";
import { skillFor } from "../skills/card";
import { AWARENESS_INFO } from "../taxonomy";
import { listOfferFits } from "./store";
import { IMAGES_PER_SCRIPT, MAX_PICTURES, MAX_TEXTS, type ScriptKit } from "./types";
import { buyerOf } from "../choices";
const Text = z.object({ primary_text: z.string().min(20), headline: z.string().max(120).default(""), headlines: z.array(z.string().max(160)).max(8).default([]) });
const TextOut = z.preprocess((v) => (v && typeof v === "object" && !("texts" in v) ? { texts: [v] } : v), z.object({ texts: z.array(Text).min(1).max(MAX_TEXTS + 1) }));
export const MAX_HEADLINES = 4;
export function headlinesOf(t: {
    headline?: string;
    headlines?: string[];
}): string[] {
    const seen = new Set<string>();
    return [...(t.headlines ?? []), t.headline ?? ""].map((h) => h.replace(/\s+/g, " ").trim()).filter((h) => h.length >= 2 && !seen.has(h.toLowerCase()) && (seen.add(h.toLowerCase()), true)).slice(0, MAX_HEADLINES);
}
export function primaryTextTokens(stage: AwarenessStage, count = 1): number {
    const perText = Math.ceil(PRIMARY_WORDS[stage][1] * 1.5) + 400;
    return Math.max(6000 + 3000 * (count - 1), count * perText + 4000);
}
export function captionFaults(text: string, headlines: string[], o: {
    stage: AwarenessStage;
    voice?: VoiceProfile;
    own?: string;
    buyerWords?: string;
}): string[] {
    const length = lengthFault(text, o.stage, "primary");
    const found = wordFaults([{ id: "Primary text", surface: "primary", text }, ...headlines.map((h, i) => ({ id: `Headline ${i + 1}`, surface: "headline" as const, text: h }))], { stage: o.stage, voice: o.voice, own: o.own, buyerWords: o.buyerWords });
    return [...(length ? [`Primary text: ${length.why}`] : []), ...found.map((f) => `${f.id}: ${faultLine(f)}`)];
}
const PICTURE_SIZE = "1024x1280";
const PromptsOut = z.object({ prompts: z.array(z.object({ title: z.string(), prompt: z.string().min(40), words: z.string().max(160).default(""), type: z.string().max(400).default("") })).min(1).max(MAX_PICTURES + 2) });
export const SPECIMEN_ROLE = "Brand type and colour specimen. A style guide only: set added words in these typefaces and colours. It never appears in the picture";
export function wordsPrompt(picture: {
    prompt: string;
    words?: string;
    type?: string;
}, onto: boolean, look: {
    fingerprint?: string;
    specimenAt?: number;
} = {}): string {
    const words = (picture.words ?? "").trim();
    const faces = splitFingerprint(look.fingerprint ?? "").type.length > 0;
    const how = picture.type?.trim() || (faces ? "in the brand's own headline typeface, as BRAND TYPE below gives it, large enough to read on a phone, in a clear area of the picture, never over a face or the product." : "clean bold sans-serif, large enough to read on a phone, in a clear area of the picture, never over a face or the product.");
    const set = `WORDS ON THE PICTURE\nExactly these words, once, spelled exactly, and no other words, letters, logos or marks anywhere: "${words}"\nHow they are set: ${how}`;
    const body = onto ? `Image 1 is a finished picture. Add the words below to it and change nothing else: the scene, the people, the product, the light, the colours and the crop stay exactly as they are.\n\n${set}` : `${picture.prompt}\n\n${set}`;
    const role = look.specimenAt ? `${look.specimenAt}. ${SPECIMEN_ROLE}` : "";
    const type = words ? typeBlock({ body, texts: [{ role: "headline", text: words }], roles: role ? [role] : [], fingerprint: look.fingerprint }) : "";
    return [body, role ? `ALSO ATTACHED\nImage ${role}.` : "", type].filter(Boolean).join("\n\n");
}
const LineAgainOut = z.object({ lines: z.array(z.object({ picture: z.number().int(), words: z.string().max(160) })).max(MAX_PICTURES + 2).default([]) });
export function pictureWordFaults(words: string, o: {
    stage: AwarenessStage;
    voice?: VoiceProfile;
    own?: string;
    buyerWords?: string;
}): string[] {
    return wordFaults([{ id: "words", surface: "picture", role: "headline", text: words }], { stage: o.stage, voice: o.voice, own: o.own, buyerWords: o.buyerWords }).map(faultLine);
}
export const picturesOf = (want: ScriptKit["want"]) => (want.images ? Math.max(1, Math.min(MAX_PICTURES, want.pictures ?? IMAGES_PER_SCRIPT)) * (want.words === "both" ? 2 : 1) : 0);
export const saveKit = (scriptId: string, kit: ScriptKit) => db.update(schema.scripts).set({ kit }).where(eq(schema.scripts.id, scriptId)).run();
const HookTextsOut = z.object({ leans_on: z.string().default(""), texts: z.array(z.object({ hook: z.number().int(), first_line: z.string().min(8).max(600), headline: z.string().min(2).max(120) })).max(8) });
export function splitOpening(text: string): {
    first: string;
    rest: string;
} {
    const t = text.trim();
    const para = t.split(/\n\s*\n/)[0].trim();
    if (para.length < t.length && para.split(/\s+/).length <= 60)
        return { first: para, rest: t.slice(para.length).trim() };
    const m = t.match(/^[\s\S]*?[.!?]["')\]]?(?=\s|$)/);
    const first = (m ? m[0] : t.split(/\n/)[0]).trim();
    return { first, rest: t.slice(first.length).trim() };
}
export function hookPrimaryText(kit: Pick<ScriptKit, "primary_text" | "headline" | "hook_texts">, hookId: string | null | undefined): {
    primary_text: string;
    headline: string;
} {
    const base = { primary_text: kit.primary_text ?? "", headline: kit.headline ?? "" };
    const own = hookId ? kit.hook_texts?.find((t) => t.hook_id === hookId) : undefined;
    if (!own || !base.primary_text)
        return base;
    const { first, rest } = splitOpening(base.primary_text);
    const gap = base.primary_text.trim().slice(first.length).startsWith("\n") ? "\n\n" : " ";
    return { primary_text: rest ? `${own.first_line}${gap}${rest}` : own.first_line, headline: own.headline };
}
async function hookTexts(script: Pick<import("@/db/schema").ScriptRow, "id" | "brand_id" | "lines" | "hook_variants" | "axes" | "awareness_stage">, primary: string, headline: string, variety: import("../variety").Variety, counted = ""): Promise<NonNullable<ScriptKit["hook_texts"]>> {
    const versions = versionsOf(script).filter((v) => v.n > 1 && v.hook);
    if (!versions.length || !primary.trim())
        return [];
    const { first, rest } = splitOpening(primary);
    const brand = loadBrandBrain(script.brand_id);
    const voice = getSetting(script.brand_id, "voice");
    const p = renderPrompt("script-hook-texts", {
        brand_name: brand.brand.name,
        floor: floorText(),
        grade: String(readingGradeOf(voice)),
        terms: termsRule(script.awareness_stage, voice.terms),
        headline_rule: headlineRule(script.awareness_stage),
        counted,
        count: String(versions.length),
        speaker: `${script.axes.person} person, ${script.axes.tense} tense`,
        variety: varietyNote(variety),
        first,
        rest: rest || "(the first sentence is the whole text)",
        headline,
        hooks: versions.map((v) => `${v.n}. ${v.opens}`).join("\n"),
        brand_voice: brandVoiceText(script.brand_id, { surfaces: [], brand, story: true }),
        lessons: adviceBlock(lessonsFor(script.brand_id, { area: "words" }).filter((l) => l.category !== "product_use")),
    });
    const out = await structuredJson({ brandId: script.brand_id, task: "script_hook_texts", model: env.MODEL_EDIT, system: p.system, user: p.user, schema: HookTextsOut, effort: "low", maxTokens: 3000, temperature: varietyTemperature(variety), refType: "script", refId: script.id });
    const nums = (s: string) => s.match(/\d[\d,.]*%?/g) ?? [];
    const known = new Set(nums(`${primary} ${headline} ${script.lines.map((l) => l.text).join(" ")} ${versions.map((v) => v.opens).join(" ")}`).map((n) => n.replace(/[.,]$/, "")));
    const seen = new Set<string>([first.toLowerCase(), headline.toLowerCase()]);
    const kept: NonNullable<ScriptKit["hook_texts"]> = [];
    for (const v of versions) {
        const t = out.texts.find((x) => x.hook === v.n);
        if (!t)
            continue;
        const first_line = t.first_line.replace(/\s+/g, " ").trim();
        const head = t.headline.replace(/\s+/g, " ").trim();
        if (nums(`${first_line} ${head}`).some((n) => !known.has(n.replace(/[.,]$/, ""))))
            continue;
        if (seen.has(first_line.toLowerCase()) || seen.has(head.toLowerCase()))
            continue;
        seen.add(first_line.toLowerCase());
        seen.add(head.toLowerCase());
        kept.push({ hook_id: v.hook!.id, first_line, headline: head });
    }
    return kept;
}
const CheckOut = z.object({ findings: z.array(z.object({ id: z.string(), what: z.string().default("") })).max(40).default([]), changes: z.array(z.object({ id: z.string(), text: z.string() })).max(40).default([]) });
type CaptionCheck = z.infer<typeof CheckOut>;
const figuresIn = (s: string) => (s.match(/\d[\d,.]*%?/g) ?? []).map((n) => n.replace(/[.,]$/, ""));
export function sentencesByParagraph(text: string): string[][] {
    return text.trim().split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim().split(/(?<=[.!?]["')\]]?)\s+(?=["'(A-Z0-9$£€])/).filter(Boolean)).filter((p) => p.length);
}
export interface CaptionParts {
    primary_text: string;
    headline: string;
    versions: {
        hook_id: string;
        n: number;
        hook: string;
        first_line: string;
        headline: string;
    }[];
}
export function applyCaptionCheck(parts: CaptionParts, out: CaptionCheck, scriptText: string, opts: {
    maxCut?: number;
} = {}): CaptionParts & {
    changed: number;
} {
    const known = new Set(figuresIn(`${scriptText} ${parts.primary_text} ${parts.headline}`));
    const paras = sentencesByParagraph(parts.primary_text);
    const flat = paras.flat();
    const count = (s: string) => s.split(/\s+/).filter(Boolean).length;
    const total = Math.max(1, count(flat.join(" ")));
    let cut = 0;
    const next = { headline: parts.headline, versions: parts.versions.map((v) => ({ ...v })) };
    const edits = new Map<number, string>();
    let changed = 0;
    for (const c of out.changes ?? []) {
        const id = c.id.trim().toUpperCase();
        const text = c.text.replace(/\s+/g, " ").trim();
        if (figuresIn(text).some((n) => !known.has(n)))
            continue;
        const v = next.versions.find((x) => String(x.n) === id.slice(1));
        if (/^\d+$/.test(id)) {
            const i = Number(id) - 1;
            if (flat[i] == null || flat[i] === text || edits.has(i))
                continue;
            if (!text && opts.maxCut != null) {
                if ((cut + count(flat[i])) / total > opts.maxCut)
                    continue;
                cut += count(flat[i]);
            }
            edits.set(i, text);
        }
        else if (id === "T1" && text) {
            if (text !== next.headline)
                changed++;
            next.headline = text;
        }
        else if (v && text && /^[KHT]\d+$/.test(id)) {
            const key = id[0] === "K" ? "hook" : id[0] === "H" ? "first_line" : "headline";
            if (id[0] === "K" && text.split(/\s+/).length > 26)
                continue;
            if (v[key] !== text)
                changed++;
            v[key] = text;
        }
    }
    let k = 0;
    const rebuilt = paras.map((p) => p.map((s) => (edits.has(k++) ? edits.get(k - 1)! : s)).filter(Boolean).join(" ")).filter(Boolean).join("\n\n");
    const primary_text = rebuilt.trim() ? rebuilt : parts.primary_text;
    if (rebuilt.trim())
        changed += edits.size;
    return { primary_text, headline: next.headline, versions: next.versions, changed };
}
async function checkCaption(script: Pick<import("@/db/schema").ScriptRow, "id" | "brand_id" | "lines">, parts: CaptionParts, ctx: {
    buyer: string;
    deal: OfferSaid;
    stage?: AwarenessStage;
    store?: string[];
}): Promise<CaptionParts & {
    changed: number;
    found: string[];
    facts: FactRow[];
}> {
    const brand = loadBrandBrain(script.brand_id);
    const paras = sentencesByParagraph(parts.primary_text);
    const { first } = splitOpening(parts.primary_text);
    const openingEnd = Math.max(1, sentencesByParagraph(first).flat().length);
    const flat = paras.flat();
    const scriptText = script.lines.map((l) => l.text).join("\n");
    const items = [...flat.map((s, i) => ({ id: String(i + 1), text: s })), { id: "T1", text: parts.headline }, ...parts.versions.flatMap((v) => [{ id: `K${v.n}`, text: v.hook }, { id: `H${v.n}`, text: v.first_line }, { id: `T${v.n}`, text: v.headline }])].filter((x) => x.text.trim());
    const facts = ctx.store?.length && process.env.CAPTION_FACT_CHECK === "on" ? await factCheck({ brandId: script.brand_id, brandName: brand.brand.name, store: [...ctx.store, ...script.lines.map((l) => `The script says (already checked): ${l.text}`)], items, refId: script.id }).catch(() => [] as FactRow[]) : [];
    const untrue = factFaults(facts);
    const p = renderPrompt("script-caption-check", {
        brand_name: brand.brand.name,
        script: script.lines.map((l, i) => `${i + 1} | ${l.text}`).join("\n"),
        buyer: ctx.buyer || "(nothing recorded)",
        deal: ctx.deal === "none" ? "None of it: no price, deal or guarantee." : ctx.deal === "one" ? "1 term, once: what the script says of it and no more." : "All of it, as talk.",
        stage: ctx.stage && isStoryStage(ctx.stage) ? `This buyer is ${stageName(ctx.stage)}, so the feed text is long on purpose: it tells more of the before than the script does (more moments of the same problem, the ways they get round it, fixes that let them down). Those scenes are the story and are never a fault and never cut. Only a fact (the short list in fault 1), a contradiction or another speaker is.` : "The feed text stays close to the script.",
        brand_voice: brandVoiceText(script.brand_id, { surfaces: [], brand, story: true }),
        lessons: adviceBlock(lessonsFor(script.brand_id, { area: "words" }).filter((l) => l.category !== "product_use")),
        text: flat.map((s, i) => `${i + 1} | ${s}`).join("\n"),
        opening_end: String(openingEnd),
        held: ctx.store?.length ? ctx.store.map((f) => `- ${f}`).join("\n") : "(none sent: the script is the only source)",
        fact_faults: untrue.length ? `## Found by the fact checker (each is a fault: patch it in its sentence)\n${untrue.map((r) => `- ${r.id}: ${factFaultLine(r)}`).join("\n")}` : "",
        versions: [`T1 | ${parts.headline}`, ...parts.versions.flatMap((v) => [`K${v.n} | ${v.hook}\n   then: ${script.lines[1]?.text ?? ""}`, v.first_line ? `H${v.n} | ${v.first_line}\n   then: ${flat[openingEnd] ?? ""}` : "", v.headline ? `T${v.n} | ${v.headline}` : ""])].filter(Boolean).join("\n"),
    });
    const out = await structuredJson({ brandId: script.brand_id, task: "script_caption_check", model: env.MODEL_EDIT, system: p.system, user: p.user, schema: CheckOut, effort: "low", maxTokens: 4000, refType: "script", refId: script.id });
    const applied = applyCaptionCheck(parts, out, scriptText, ctx.stage && isStoryStage(ctx.stage) ? { maxCut: 0.1 } : {});
    const fixed = new Set(out.changes.map((c) => c.id.trim().toUpperCase()));
    return { ...applied, facts, found: [...out.findings.map((f) => `${f.id}: ${f.what.replace(/\s+/g, " ").trim()}`), ...untrue.filter((r) => !fixed.has(r.id.toUpperCase())).map((r) => `${r.id}: NOT PATCHED. ${factFaultLine(r)}`)] };
}
export async function writeHookTexts(scriptId: string): Promise<number> {
    const script = db.select().from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get();
    if (!script?.kit?.primary_text)
        return 0;
    const concept = db.select().from(schema.concepts).where(eq(schema.concepts.id, script.concept_id)).get();
    const brand = loadBrandBrain(script.brand_id);
    const hook_texts = await hookTexts(script, script.kit.primary_text, script.kit.headline ?? "", clampVariety(script.kit.variety ?? script.axes.variety), concept ? countedOf(brand, productForScript(brand, concept, script)).block : "");
    saveKit(scriptId, { ...script.kit, hook_texts });
    return hook_texts.length;
}
export async function writeKit(scriptId: string, kit: ScriptKit): Promise<void> {
    saveKit(scriptId, kit);
    if (!kit.want.primary_text && !kit.want.image_prompts)
        return;
    const script = db.select().from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get();
    const concept = script && db.select().from(schema.concepts).where(eq(schema.concepts.id, script.concept_id)).get();
    if (!script || !concept)
        return;
    const brandId = script.brand_id;
    const brand = loadBrandBrain(brandId);
    const persona = buyerOf(brand, concept.persona_id);
    const profile = getPersona(brandId, concept.persona_id);
    const stage = concept.awareness_stage;
    const said = script.lines.map((l) => l.text).join("\n");
    const plan = wordsPlan("caption", { stage, format: script.format_target, taste: { ...(script.axes.taste ?? {}), ...(kit.taste ?? {}) }, variety: kit.variety ?? script.axes.variety });
    const phrases = customerWords(persona?.language ?? []).phrases.slice(0, plan.text.customerWords === "none" ? 0 : plan.text.customerWords === "few" ? 3 : undefined);
    const told = tellingFromNotes(script.notes);
    const brief = briefFromNotes(script.notes);
    const figures = figuresSaid(script.lines);
    const dealSaid = script.lines.filter((l) => l.beat === "offer" || l.beat === "risk_reversal").map((l) => l.text);
    const story = [
        `Who speaks: ${script.axes.person} person, ${script.axes.tense} tense. The caption is the same person.`,
        told ? `How the script is told: ${told}` : "",
        brief || [persona ? `- Before: ${persona.problem}` : "", persona?.wants ? `- After: ${persona.wants}` : ""].filter(Boolean).join("\n"),
        figures.length ? `Every sentence of the script that states a figure. These are the only figures the caption may use, each said the same way:\n${figures.map((x) => `- ${x}`).join("\n")}` : "The script states no figure, so the caption states none beyond the offer.",
        dealSaid.length ? `How the script says the offer:\n${dealSaid.map((x) => `- ${x}`).join("\n")}` : "The script does not state the offer.",
    ]
        .filter(Boolean)
        .join("\n");
    const fit = listOfferFits(brandId).find((f) => f.offer_id === concept.offer_id);
    const deal = offerSaidBy(plan, stage, !!script.axes.no_offer, !!(kit.taste?.sell ?? script.axes.taste?.sell));
    const parts = offerParts(brand, concept.offer_id);
    const offer = offerForStage(deal, { tryPrice: parts ? (parts.first ? `${parts.cur}${parts.first.price} for the first order` : `${parts.cur}${parts.chosen.price}`) : "", guarantee: parts?.guarantee ?? "", terms: termsBlock(brand, concept.offer_id).split("\n").filter((l) => l.startsWith("- ")), say: fit?.say }).replace(/^### The offer\n/, "");
    const terms = deal === "none" ? "" : termsLine(brand, concept.offer_id);
    const buyer = [
        persona ? `Who it is for: ${persona.name}. ${persona.summary}` : "",
        profile?.identity ? `How they see themselves: ${profile.identity}` : "",
        persona ? `What they live with (the before): ${persona.problem}` : "",
        persona?.wants ? `Where they want to be (the after): ${persona.wants}` : "",
        persona?.trigger ? `What makes them buy now: ${persona.trigger}` : "",
        phrases.length ? `${HOW_CUSTOMERS_TALK} ${phrases.map((l) => `"${l}"`).join(", ")}` : "",
        `The idea of the ad: ${concept.angle}`,
        `Where they are: ${AWARENESS_INFO[stage].label}.`,
    ]
        .filter(Boolean)
        .join("\n");
    const errors: string[] = [];
    const next: ScriptKit = { ...kit };
    const asked = kit.asked?.trim() ? askedLine(kit.asked) : "(nothing)";
    const variety = clampVariety(kit.variety ?? script.axes.variety);
    const voice = getSetting(brandId, "voice");
    const own = brandOwnWords(brandId);
    const finds = researchFinds(brandId, script.theme_ids?.length ? script.theme_ids : concept.theme_ids);
    const buyerWords = [...(persona?.language ?? []), ...finds.filter((f) => f.theme.type === "buyer_word").flatMap((f) => [f.theme.label, ...f.quotes.map((q) => q.quote)])].join("\n");
    const counted = countedOf(brand, productForScript(brand, concept, script), script.axes.no_offer ? null : concept.offer_id);
    if (kit.want.primary_text) {
        try {
            const count = Math.max(1, Math.min(MAX_TEXTS, kit.want.texts ?? 1));
            const longStory = isStoryStage(stage) ? craftText(["long-story"]) : "";
            const factSheet = factSheetFor(brand, concept, { facts: plan.text.facts, offerSaid: deal }).text;
            const held = researchFor(finds, persona ? { ...persona, tried: profile?.tried, objections: profile?.objections } : null, plan.text.customerWords === "none" ? 0 : plan.text.customerWords === "few" ? 3 : undefined);
            const research = [held.research.join("\n") || "(nothing held for this ad)", missingNote(stage, held.missing)].filter(Boolean).join("\n");
            const spent = spentFor(brandId, brand);
            const seeds = dealSeeds({ count, seed: brandId, start: deckStart(scriptId), quotes: finds.map((f) => ({ theme: f.theme.label })), ...worldFor(brandId), spent, selling: !isStoryStage(stage) });
            const seed = [seedsBlock(seeds, { one: "Version", short: !isStoryStage(stage), fixed: "Who speaks, what happened and every fact stay the script's: what is dealt is where each telling opens, and a part of it that could not be true of the script's story is changed." }), spentLine(spent)].filter(Boolean).join("\n\n");
            const render = (extra: string) => renderPrompt("script-primary-text", {
                brand_name: brand.brand.name,
                floor: floorText(),
                principles: principlesText(undefined, { longStory: !!longStory }),
                length: [primaryLengthText(stage), termsRule(stage, voice.terms), `Reading level: school grade ${readingGradeOf(voice)} or below.`].join("\n"),
                story_craft: longStory,
                research,
                facts: [factSheet, counted.block].filter(Boolean).join("\n\n"),
                headline_count: "3 or 4",
                headline_rule: headlineRule(stage),
                seed,
                extra,
                buyer,
                stage_brief: stageBrief(stage, concept.sophistication_stage) || "(none)",
                story,
                offer: script.axes.no_offer ? NO_OFFER_TERMS : offer,
                brand_voice: brandVoiceText(brandId, { surfaces: [], brand, story: true }),
                lessons: adviceBlock(lessonsFor(brandId, { area: "words" }).filter((l) => l.category !== "product_use")),
                format: kit.format,
                script: said,
                asked,
                variety: `How close to what the brand already runs: ${varietyNote(variety)} At every setting it is the same story and the same facts as the script, and it reads like a person wrote it.${tasteBlock(plan) ? `\n\n${tasteBlock(plan)}` : ""}`,
                versions: count === 1 ? "Write 1 version." : `Write ${count} versions, for this same buyer and this same ad: every version is the same speaker telling the same story with the same facts. Each opens on a different first sentence and takes a different way into that story (a different moment of it, a different doubt answered first), so the ${count} can be tested against each other. No 2 share a first sentence or a headline.`,
            });
            const ask = async (extra: string) => {
                const p = render(extra);
                const out = await structuredJson({ brandId, task: "script_primary_text", model: env.MODEL_COPY, system: p.system, user: p.user, schema: TextOut, effort: "medium", maxTokens: primaryTextTokens(stage, count), temperature: plan.temperature, refType: "script", refId: scriptId });
                return out.texts.slice(0, count).map((t) => ({ primary_text: t.primary_text.trim(), headlines: headlinesOf(t) })).filter((t) => t.headlines.length);
            };
            let texts = await ask("");
            if (!texts.length)
                throw new Error("no text came back with a headline");
            const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
            const short = texts.map((t) => lengthFault(t.primary_text, stage, "primary")).map((f) => (f?.side === "short" ? f : null));
            if (short.some(Boolean)) {
                try {
                    const again = await ask(`## Your first draft came back short\n${texts.map((t, i) => (short[i] ? `Version ${i + 1}: ${short[i]!.why} Keep what is there, in the same order, and tell the parts of the story it passes over: more moments of the problem, what they did to get round it, what they tried. Return the whole text again, with its headlines.\n\n${t.primary_text}` : `Version ${i + 1}: its length is right. Return it as it is.`)).join("\n\n")}`);
                    texts = texts.map((t, i) => (short[i] && again[i] && words(again[i].primary_text) > words(t.primary_text) ? again[i] : t));
                }
                catch (e) {
                    errors.push(`The primary text came back short and the second try did not finish: ${(e as Error).message.slice(0, 160)}`);
                }
            }
            const figs = (s: string) => (s.match(/\d[\d,.]*%?/g) ?? []).map((n) => n.replace(/[.,]$/, ""));
            const knownFigs = new Set(figs(`${said} ${texts.map((t) => t.primary_text).join(" ")}`));
            const safe = (hs: string[]) => hs.filter((h, i) => i === 0 || figs(h).every((n) => knownFigs.has(n)));
            next.primary_text = texts[0].primary_text;
            const heads = safe(texts[0].headlines);
            next.headline = heads[0];
            if (heads.length > 1)
                next.more_headlines = heads.slice(1);
            else
                delete next.more_headlines;
            if (texts.length > 1)
                next.more_texts = texts.slice(1).map((t) => ({ primary_text: t.primary_text, headline: t.headlines[0] }));
            saveKit(scriptId, next);
            try {
                const hook_texts = await hookTexts(script, next.primary_text, next.headline, variety, counted.block);
                if (hook_texts.length)
                    next.hook_texts = hook_texts;
                else
                    delete next.hook_texts;
                saveKit(scriptId, next);
            }
            catch (e) {
                errors.push(`The first line and headline for each hook were not written: ${(e as Error).message.slice(0, 160)}`);
            }
            if (process.env.CAPTION_CHECK !== "off") {
                try {
                    const versions = versionsOf(script).filter((v) => v.n > 1 && v.hook).map((v) => ({ hook_id: v.hook!.id, n: v.n, hook: v.hook!.text, first_line: next.hook_texts?.find((t) => t.hook_id === v.hook!.id)?.first_line ?? "", headline: next.hook_texts?.find((t) => t.hook_id === v.hook!.id)?.headline ?? "" }));
                    const record = [profile?.tried?.length ? `Tried before: ${profile.tried.join("; ")}` : "Tried before: nothing recorded.", profile?.notes ? `Also known: ${profile.notes}` : ""].filter(Boolean).join("\n");
                    const product = brand.products.find((x) => x.id === productForScript(brand, concept, script)) ?? brand.products[0];
                    const whole = factStore(brand, { productId: product?.id, offerId: concept.offer_id, persona, profile, brief: [`The idea of the ad: ${concept.angle}`, ...lessonsFor(brandId, { productId: product?.id, area: "words" }).filter((l) => l.category === "product_use").map((l) => `How the product is opened and used: ${l.rule}`)] });
                    const cited = new Set((script.voice_check?.facts ?? []).map((f) => f.held).filter(Boolean));
                    const store = whole.filter((f) => cited.has(f) || /^(The offer|The buyer|Also known of the buyer|In a customer's words|How the product is opened)/.test(f));
                    const checked = await checkCaption(script, { primary_text: next.primary_text, headline: next.headline, versions }, { buyer: record, deal, stage, store: store.length ? store : whole });
                    next.primary_text = checked.primary_text;
                    next.headline = checked.headline;
                    if (next.hook_texts)
                        next.hook_texts = next.hook_texts.map((t) => ({ ...t, ...(({ first_line, headline }) => ({ first_line: first_line || t.first_line, headline: headline || t.headline }))(checked.versions.find((v) => v.hook_id === t.hook_id) ?? { first_line: "", headline: "" }) }));
                    const fixedHooks = script.hook_variants.map((h) => ({ ...h, text: checked.versions.find((v) => v.hook_id === h.id)?.hook || h.text }));
                    if (fixedHooks.some((h, i) => h.text !== script.hook_variants[i].text))
                        db.update(schema.scripts).set({ hook_variants: fixedHooks }).where(eq(schema.scripts.id, scriptId)).run();
                    next.checked = { changed: checked.changed, found: checked.found, facts: checked.facts.map((r) => ({ where: r.id, quote: r.quote, held: r.held, verdict: r.verdict })) };
                    saveKit(scriptId, next);
                }
                catch (e) {
                    errors.push(`The primary text was not checked against the script: ${(e as Error).message.slice(0, 160)}`);
                }
            }
            const finalHeads = [next.headline ?? "", ...(next.more_headlines ?? [])].filter(Boolean);
            const length = lengthFault(next.primary_text, stage, "primary");
            let noted: string[] = [];
            let patched = 0;
            try {
                const lines: WordLine[] = [{ id: "primary", surface: "primary", text: next.primary_text }, ...finalHeads.map((h, i): WordLine => ({ id: `h${i + 1}`, surface: "headline", text: h }))];
                const res = await checkWords({
                    brandId,
                    brandName: brand.brand.name,
                    refType: "script",
                    refId: scriptId,
                    stage,
                    voice,
                    about: buyer,
                    brandVoice: brandVoiceText(brandId, { surfaces: [], brand, story: true, long: isStoryStage(stage) }),
                    lines,
                    own,
                    buyerWords: [research, buyerWords].filter(Boolean).join("\n"),
                    facts: [factSheet, script.axes.no_offer ? NO_OFFER_TERMS : offer, said].filter(Boolean).join("\n\n"),
                    counted,
                    max: Object.fromEntries(finalHeads.map((_, i) => [`h${i + 1}`, 50])),
                }, llmEnabled() ? {} : { read: false, fix: false });
                const text = (id: string) => res.lines.find((l) => l.id === id)?.text.trim() ?? "";
                if (text("primary"))
                    next.primary_text = text("primary");
                const read = finalHeads.map((h, i) => text(`h${i + 1}`) || h);
                if (read[0])
                    next.headline = read[0];
                if (read.length > 1)
                    next.more_headlines = read.slice(1);
                patched = res.changed.length;
                const whereOf = (id: string) => (id === "primary" ? "Primary text" : `Headline ${id.slice(1)}`);
                noted = res.left.map((f) => `${whereOf(f.id)}: ${leftLine(f)}`.slice(0, 400));
            }
            catch (e) {
                noted = [...captionFaults(next.primary_text, finalHeads, { stage, voice, own, buyerWords: buyerWords.toLowerCase() }).filter((x) => !length || !x.includes(length.why)), `The reading of these words did not finish: ${(e as Error).message.slice(0, 120)}`];
            }
            const after = lengthFault(next.primary_text, stage, "primary");
            if (after)
                noted.unshift(`Primary text: ${after.why}`);
            if (noted.length || patched) {
                next.checked = { changed: (next.checked?.changed ?? 0) + patched, found: [...(next.checked?.found ?? []), ...noted], ...(next.checked?.facts ? { facts: next.checked.facts } : {}) };
                saveKit(scriptId, next);
            }
            if (terms && !next.primary_text.includes(terms)) {
                next.primary_text = `${next.primary_text.trim()}\n\n${terms}`;
                next.terms = terms;
                saveKit(scriptId, next);
            }
        }
        catch (e) {
            errors.push(`The primary text was not written: ${(e as Error).message.slice(0, 200)}`);
        }
    }
    if (kit.want.image_prompts) {
        try {
            const count = Math.max(1, Math.min(MAX_PICTURES, kit.want.pictures ?? IMAGES_PER_SCRIPT));
            const words = kit.want.words ?? "without";
            const place = productPlace("auto", stage, !!script.axes.native);
            const product = brand.products.find((x) => x.id === productForScript(brand, concept, script)) ?? brand.products[0];
            const look = loadBrandLook(brandId);
            const fingerprint = lookFingerprint(look);
            const lettering = words !== "without";
            const render = (again: string) => renderPrompt("script-image-prompts", {
                floor: lettering ? floorText() : "",
                picture_words: lettering ? craftText(["picture-words"]) : "",
                brand_voice: lettering ? brandVoiceText(brandId, { surfaces: [], brand, story: true }) : "",
                again,
                skill: skillFor("image-prompt-craft") || "(image-prompt-craft skill not installed)",
                count: String(count),
                fingerprint: fingerprint || "(The brand's site has not been scanned. Describe type as clean bold sans-serif.)",
                product_rule: productRule(place),
                product: place === "none" || !product ? "(Not sent: the product is not in these pictures.)" : [`Name: ${product.name}`, `Format: ${product.format}`, specLine(product).trim()].filter(Boolean).join("\n"),
                lessons: lessonBlock(brandId, { productId: product?.id, area: "pictures" }) || "(none yet)",
                buyer,
                format: kit.format,
                script: said,
                asked,
                words_rule: words === "without"
                    ? 'These pictures carry no words. Leave `words` and `type` empty.'
                    : 'Each picture is also made with words set on it. In `words`, give the 1 line that goes on it: a whole plain sentence a person would say, with its small words left in, up to about 12 words, taken from this moment of the script or its hook. It makes sense alone to a stranger who sees only the picture and this line. Where there is less room, say a smaller thing: never squeeze a sentence until its small words fall out. Never a slogan, a mirrored saying, a row of "no this, no that", or the brand\'s name. In `type`, say where the words sit and how they are set (place in the frame, size, weight, colour, and the brand\'s own typeface by the attributes the brand look gives), in a clear area and never over a face or the product. Leave room for them in the picture.',
            });
            const p = render("");
            const out = await structuredJson({ brandId, task: "image_prompt", model: env.MODEL_PLAN, system: p.system, user: p.user, schema: PromptsOut, effort: "medium", maxTokens: 4000 + 2500 * count, refType: "script", refId: scriptId });
            next.image_prompts = out.prompts.slice(0, count).map((x) => ({ title: x.title.trim(), prompt: x.prompt.trim(), ...(lettering && x.words.trim() ? { words: x.words.trim(), type: x.type.trim() } : {}) }));
            saveKit(scriptId, next);
            if (lettering) {
                const seen = { stage, voice, own, buyerWords: buyerWords.toLowerCase() };
                const faultsOf = (w: string) => pictureWordFaults(w, seen);
                const faulty = next.image_prompts.map((x, i) => ({ i, words: x.words ?? "", faults: x.words ? faultsOf(x.words) : [] })).filter((x) => x.faults.length);
                if (faulty.length && llmEnabled()) {
                    try {
                        const q = render(`## Say these lines again\nThe prompts are written and stay as they are. Only the line set on ${faulty.length === 1 ? "this picture" : "these pictures"} failed a check. Say each again as a whole plain sentence a person would say, for the same moment of the script, and mend what is named.\n${faulty.map((x) => `Picture ${x.i + 1} ("${next.image_prompts![x.i].title}"): "${x.words}"\n${x.faults.map((f) => `   - ${f}`).join("\n")}`).join("\n")}\n\nFor this answer only, return JSON \`{ "lines": [ { "picture": <number>, "words": "<the line>" } ] }\` and nothing else.`);
                        const again = await structuredJson({ brandId, task: "image_prompt", model: env.MODEL_PLAN, system: q.system, user: q.user, schema: LineAgainOut, effort: "low", maxTokens: 1500, refType: "script", refId: scriptId });
                        for (const x of faulty) {
                            const line = again.lines.find((l) => l.picture === x.i + 1)?.words.replace(/\s+/g, " ").trim();
                            if (line && faultsOf(line).length < x.faults.length)
                                next.image_prompts[x.i].words = line;
                        }
                    }
                    catch (e) {
                        errors.push(`A line set on a picture failed a check and was not said again: ${(e as Error).message.slice(0, 160)}`);
                    }
                }
                const left = next.image_prompts.flatMap((x, i) => (x.words ? faultsOf(x.words).map((f) => `Picture ${i + 1}, the words on it: ${f}`.slice(0, 400)) : []));
                const kept = (next.checked?.found ?? []).filter((f) => !/^Picture \d+, the words on it: /.test(f));
                if (left.length || kept.length !== (next.checked?.found ?? []).length)
                    next.checked = { changed: next.checked?.changed ?? 0, found: [...kept, ...left], ...(next.checked?.facts ? { facts: next.checked.facts } : {}) };
                saveKit(scriptId, next);
            }
            if (kit.want.images) {
                const found = sendsProductPhoto(place) && product ? productImages(brandId, await ensureCreativeKit(brandId, false), product.id).hero : null;
                const hero = found && fs.existsSync(found) ? found : null;
                const refs = hero ? [hero] : [];
                const specimen = lettering ? lookFile(brandId, look?.specimen ?? "") : null;
                if (lettering && !look && brandLookState(brandId) === "unreadable")
                    errors.push("The brand's fonts and colours are on file and could not be read, so the words on these pictures are set without them. Scan the site again on the Brand brain.");
                else if (lettering && specimenMissing(brandId, look))
                    errors.push("The picture of the brand's fonts is missing, so the image model is told them in words only and may not match them. Scan the site again on the Brand brain.");
                const withType = (base: string[]) => ({ files: specimen ? [...base, specimen] : base, look: { fingerprint, ...(specimen ? { specimenAt: base.length + 1 } : {}) } });
                pictures: for (const [i, picture] of next.image_prompts.entries()) {
                    const lettered = words !== "without" && !!picture.words;
                    const first = () => (words === "both" && picture.file ? [assetPath(scriptId, `picture_${i + 1}.png`).abs] : refs);
                    const steps: {
                        name: string;
                        into: "file" | "words_file";
                        prompt: () => string;
                        refs: () => string[];
                        quality: "medium" | "high";
                    }[] = [
                        ...(words !== "with" || !lettered ? [{ name: `picture_${i + 1}.png`, into: "file" as const, prompt: () => picture.prompt, refs: () => refs, quality: hero ? ("high" as const) : ("medium" as const) }] : []),
                        ...(lettered ? [{ name: `picture_${i + 1}_words.png`, into: "words_file" as const, prompt: () => wordsPrompt(picture, words === "both", withType(first()).look), refs: () => withType(first()).files, quality: "high" as const }] : []),
                    ];
                    for (const step of steps) {
                        if (step.into === "words_file" && words === "both" && !picture.file)
                            continue;
                        try {
                            const file = assetPath(scriptId, step.name);
                            await generateImage({ brandId, jobId: scriptId, purpose: `script picture ${i + 1}${step.into === "words_file" ? " with words" : ""}`, prompt: step.prompt(), refs: step.refs(), size: PICTURE_SIZE, quality: step.quality, out: file.abs });
                            picture[step.into] = file.rel;
                            saveKit(scriptId, next);
                        }
                        catch (e) {
                            errors.push(`Picture ${i + 1}${step.into === "words_file" ? " with words" : ""} was not made: ${(e as Error).message.slice(0, 200)}`);
                            if (e instanceof MediaCapError || e instanceof MediaDisabledError)
                                break pictures;
                        }
                    }
                }
            }
        }
        catch (e) {
            errors.push(`The ${kit.want.images ? "pictures were not made" : "image prompts were not written"}: ${(e as Error).message.slice(0, 200)}`);
        }
    }
    if (errors.length)
        next.error = errors.join(" ");
    saveKit(scriptId, next);
}
