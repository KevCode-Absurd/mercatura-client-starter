import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { HookVariant, ScriptLine, ScriptRow } from "@/db/schema";
import { writingBrain } from "../claims-through";
import { env } from "../env";
import { llmEnabled } from "../llm/gateway";
import { structuredJson } from "../llm/structured";
import { lessonBlock } from "../lessons";
import { listPersonas } from "../personas/store";
import { productForConcept } from "../production/kit";
import { renderPrompt } from "../prompts";
import { CRAFT_FOR_COPY, craftText } from "../skills/craft";
import { brandFacts } from "../scripts/copy-pass";
import { saveScriptEdit } from "../scripts/engine";
import { brandVoicePack } from "../scripts/voice";
import { brandVoiceText, type Surface, brandVoiceApart } from "../brand-voice";
import { ensureVoiceProfile } from "../scripts/voice-profile";
import { voiceRulesText } from "../scripts/voice-rules";
import { languageLine, researchLines, researchRows } from "../studio/checks";
import { BEATS, type AwarenessStage, type Beat } from "../taxonomy";
import { countedOf } from "../copy/figures";
import { dealSeeds, rotated, seedBlock, seedsBlock, spentLine } from "../copy/seeds";
import { recentTexts, spentFor, worldFor } from "../copy/spent";
import { headlineRule, isStoryStage, primaryLengthText, stageName, termsRule } from "../copy/stage";
import { lengthFault, type WordLine, type WordSurface } from "../copy/word-faults";
import { checkWords, floorText, leftLine } from "../copy/words-read";
import { brandOwnWords } from "../brand-voice";
import { tasteBlock } from "../taste/apply";
import { decide } from "../taste/decisions";
import { parseTaste } from "../taste/schema";
import type { ContextPlan, Taste } from "../taste/types";
import { voiceBasics } from "../taste/voice";
import { COPY_KINDS, type CopyKind } from "./types";
export interface CopyRequest {
    brandId: string;
    kind: CopyKind;
    count: number;
    productId: string | null;
    personaIds: string[];
    offerId: string | null;
    brief: string;
    audience: string;
    about: string;
    refId: string;
    taste?: unknown;
    stage?: AwarenessStage | null;
}
const COPY_SURFACES: Record<string, Surface[]> = { headlines: ["headline"], primary_text: ["primary_text"], hooks: ["script", "headline"], descriptions: ["headline"], captions: ["primary_text"], angles: ["headline"] };
export const copyPlan = (kind: string, taste: Taste | null | undefined, hasBrandRefs = true): ContextPlan => decide({ surface: kind === "hooks" ? "hooks" : "caption", hasReference: false, hasBrandRefs }, taste);
export const copySurfaces = (kind: string, plan: ContextPlan): Surface[] => (plan.text.voice === "own_ads" ? (COPY_SURFACES[kind] ?? ["headline", "primary_text"]) : []);
const CopyOut = z.object({ options: z.array(z.object({ text: z.string().min(1), angle: z.string().default("") })).min(1).max(24) });
const READ_AS: Partial<Record<CopyKind, {
    surface: WordSurface;
    max?: number;
}>> = { headlines: { surface: "headline", max: 40 }, descriptions: { surface: "headline", max: 30 }, primary_text: { surface: "primary" }, captions: { surface: "primary" }, hooks: { surface: "hook" } };
export async function writeCopy(req: CopyRequest): Promise<{
    what: string;
    options: {
        text: string;
        angle: string;
        notes?: string[];
    }[];
}> {
    const info = COPY_KINDS[req.kind];
    const brand = writingBrain(req.brandId);
    const product = brand.products.find((p) => p.id === req.productId);
    if (!llmEnabled()) {
        return { what: info.label, options: Array.from({ length: req.count }, (_, k) => ({ text: `Mock ${info.one} ${k + 1} for ${product?.name ?? brand.brand.name}`, angle: "Mock mode" })) };
    }
    const voice = await ensureVoiceProfile(req.brandId);
    const buyers = listPersonas(req.brandId).filter((p) => req.personaIds.includes(p.id));
    const plan = copyPlan(req.kind, parseTaste(req.taste));
    const offer = plan.text.offer === "none" ? undefined : brand.offers.find((o) => o.id === req.offerId);
    const choices = tasteBlock(plan);
    const stage = req.stage ?? null;
    const story = (req.kind === "primary_text" || req.kind === "captions") && isStoryStage(stage);
    const themes = story ? 10 : plan.text.customerWords === "none" ? 0 : plan.text.customerWords === "few" ? 3 : 6;
    const rows = themes ? researchRows(req.brandId, themes, 3, `${req.brief} ${req.audience} ${buyers.map((b) => b.problem).join(" ")}`) : [];
    const research = themes ? researchLines(rows) : "";
    const counted = countedOf(brand, req.productId, offer?.id);
    const facts = [brandFacts(brand, req.productId, `${req.brief} ${req.audience}`), counted.block].filter(Boolean).join("\n\n");
    const long = req.kind === "primary_text" || req.kind === "captions";
    const recent = recentTexts(req.brandId);
    const seeds = dealSeeds({ count: req.count, seed: `${req.refId}:${req.kind}`, quotes: rows.map((r) => ({ theme: r.label, quote: r.quotes[0] })), buyers: buyers.map((b) => b.name), ...worldFor(req.brandId), spent: spentFor(req.brandId, brand, [], recent), selling: !isStoryStage(stage) });
    const voicePack = story
        ? brandVoiceApart(req.brandId, { surfaces: ["primary_text"], personaIds: req.personaIds, brand, story: true, long: true })
        : plan.text.voice === "basics"
            ? { text: voiceBasics(brand, req.personaIds), buyer: "" }
            : brandVoicePack(req.brandId, brand, [], { level: "focused", personaIds: req.personaIds, surfaces: copySurfaces(req.kind, plan), buyerApart: true });
    const brandVoice = voicePack.text || "(the brand has no written voice guide: plain, warm, specific)";
    const buyerBlock = voicePack.buyer;
    const ask = async (count: number, extra: string, own: {
        seed?: string;
        research?: string;
    } = {}) => {
        const p = renderPrompt("chat-copy", {
            brand_name: brand.brand.name,
            count: String(count),
            what: count === 1 ? info.one : info.label.toLowerCase(),
            limit: req.kind === "primary_text" && stage ? `the text above the image in the feed. Its first sentence is 125 characters or fewer and makes sense alone above "See more"` : info.limit,
            floor: floorText(),
            stage: stage ? [`## The buyer is ${stageName(stage)}`, long ? primaryLengthText(stage) : "", req.kind === "headlines" || req.kind === "descriptions" ? headlineRule(stage) : "", termsRule(stage, voice.terms)].filter(Boolean).join("\n") : termsRule(null, voice.terms),
            copy_craft: craftText(story ? ["reader", "leads", "long-story"] : (CRAFT_FOR_COPY[req.kind] ?? [])),
            voice_rules: voiceRulesText(voice, req.kind === "hooks", story),
            brand_voice: brandVoice,
            buyer: buyerBlock,
            lessons: lessonBlock(req.brandId, { productId: req.productId, area: "words", wordsOnly: true }) || "(none yet)",
            facts,
            language: languageLine(brand),
            buyers: buyers.length ? buyers.map((b) => `${b.name}: ${b.summary} Their problem: ${b.problem}. What they want: ${b.wants || "(not written)"}. What stops them: ${b.objections.join("; ") || "(not written)"}. Their words: ${[...b.language, ...b.sounds_like].slice(0, 8).join("; ")}`).join("\n") : req.audience || "(not said: the brand's buyers in general)",
            research: own.research || research || "(left out on purpose)",
            seed: own.seed ?? "",
            about: [req.about, offer ? `It states this offer: ${offer.name}, ${brand.brand.currency} ${offer.price}.${offer.notes ? ` ${offer.notes}` : ""}` : ""].filter(Boolean).join("\n") || "(an ad for the product in general)",
            brief: [choices ? `${req.brief}\n\nThe choices made for these:\n${choices}` : req.brief, extra].filter(Boolean).join("\n\n") || "(nothing further)",
        });
        const out = await structuredJson({ brandId: req.brandId, task: "chat_copy", model: env.MODEL_COPY, system: p.system, user: p.user, schema: CopyOut, effort: story ? "high" : "low", maxTokens: story ? 12000 : 4000, temperature: plan.temperature, refType: "chat", refId: req.refId });
        return out.options.slice(0, count).map((o) => ({ text: o.text.trim(), angle: o.angle.trim().slice(0, 60) }));
    };
    let options: {
        text: string;
        angle: string;
        notes?: string[];
    }[] = [];
    if (story && stage) {
        for (let k = 0; k < req.count; k++) {
            const before = options.length ? `Already written for this buyer. Tell a different story: another moment, another way the problem shows up, another fix that failed.\n${options.map((o) => `- ${o.angle}: ${o.text.slice(0, 160)}`).join("\n")}` : "";
            const lead = Math.max(0, rows.findIndex((r) => r.label === seeds[k]?.theme));
            const own = { seed: [seedBlock(seeds, k), spentLine(spentFor(req.brandId, brand, options.map((x) => x.text), recent))].filter(Boolean).join("\n\n"), research: rows.length ? researchLines(rotated(rows, lead)) : "" };
            let [o] = await ask(1, before, own);
            if (!o)
                continue;
            const off = lengthFault(o.text, stage);
            if (off) {
                const [again] = await ask(1, [before, `Your last answer was not the length this buyer needs. ${off.why}`].filter(Boolean).join("\n\n"), own);
                if (again && (!lengthFault(again.text, stage) || (off.side === "short") === again.text.length > o.text.length))
                    o = again;
            }
            options.push(o);
        }
    }
    else
        options = await ask(req.count, "", { seed: [seedsBlock(seeds, { one: long ? "Text" : "Line", short: !long }), spentLine(spentFor(req.brandId, brand, [], recent))].filter(Boolean).join("\n\n") });
    const as = READ_AS[req.kind];
    if (as && options.length) {
        try {
            const lines: WordLine[] = options.map((o, k) => ({ id: `o${k + 1}`, surface: as.surface, text: o.text }));
            const res = await checkWords({ brandId: req.brandId, brandName: brand.brand.name, refType: "chat", refId: req.refId, stage, voice, about: [`For: ${buyers.map((b) => `${b.name} (${b.problem})`).join("; ") || req.audience || "the brand's buyers in general"}`, `The product: ${product?.name ?? brand.brand.name}`, req.about || req.brief ? `What it is for: ${[req.about, req.brief].filter(Boolean).join(" ").slice(0, 600)}` : "", "Each line below is a separate piece: they are not read together."].filter(Boolean).join("\n"), brandVoice, lines, own: brandOwnWords(req.brandId), buyerWords: research, facts: facts.slice(0, 3000), counted, max: as.max ? Object.fromEntries(lines.map((l) => [l.id, as.max!])) : undefined });
            options = options.map((o, k) => ({ ...o, text: res.lines[k]?.text ?? o.text, ...(res.left.some((f) => f.id === `o${k + 1}`) ? { notes: res.left.filter((f) => f.id === `o${k + 1}`).map(leftLine) } : {}) }));
        }
        catch {
        }
    }
    return { what: info.label, options };
}
const ReviseOut = z.object({
    lines: z.array(z.object({ beat: z.string(), text: z.string().min(1), on_screen: z.string().nullable().default(""), visual_note: z.string().nullable().default("") })).min(1).max(120),
    hooks: z.array(z.object({ text: z.string().min(1), overlay: z.string().nullable().default("") })).max(12).default([]),
    changed: z.string().default(""),
});
export function carryLines(before: ScriptLine[], after: {
    beat: string;
    text: string;
    on_screen: string | null;
    visual_note: string | null;
}[]): ScriptLine[] {
    const left = [...before];
    const take = (pred: (l: ScriptLine) => boolean) => {
        const at = left.findIndex(pred);
        return at < 0 ? undefined : left.splice(at, 1)[0];
    };
    const wordsOf = (s: string) => new Set(s.toLowerCase().match(/[a-zà-ÿ0-9']{3,}/g) ?? []);
    const near = (a: string, b: string) => {
        const x = wordsOf(a);
        const y = wordsOf(b);
        return x.size && y.size ? [...x].filter((w) => y.has(w)).length / Math.min(x.size, y.size) : 0;
    };
    return after.map((l) => {
        const beat = ((BEATS as readonly string[]).includes(l.beat) ? l.beat : "bridge") as Beat;
        const from = take((x) => x.text.trim() === l.text.trim()) ?? take((x) => x.beat === beat && near(x.text, l.text) >= 0.5);
        return { beat: from && !(BEATS as readonly string[]).includes(l.beat) ? from.beat : beat, text: l.text.trim(), theme_ids: from?.theme_ids ?? [], claim_ids: from?.claim_ids ?? [], ...(l.visual_note ? { visual_note: l.visual_note } : {}), ...(l.on_screen ? { on_screen: l.on_screen } : {}) };
    });
}
export async function reviseScript(scriptId: string, instruction: string, refId: string): Promise<{
    script: ScriptRow;
    changed: string;
}> {
    const script = db.select().from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get();
    if (!script)
        throw new Error("That script no longer exists.");
    if (!llmEnabled())
        throw new Error("Rewriting a script needs live mode.");
    const concept = db.select().from(schema.concepts).where(eq(schema.concepts.id, script.concept_id)).get();
    const brand = writingBrain(script.brand_id, script.axes.claim_checks === true);
    const productId = concept ? productForConcept(brand, concept) : null;
    const voice = await ensureVoiceProfile(script.brand_id);
    const p = renderPrompt("script-revise", {
        brand_name: brand.brand.name,
        voice_rules: voiceRulesText(voice, !script.axes.native),
        brand_voice: brandVoiceText(script.brand_id, { surfaces: script.axes.flow ? [] : ["script"], personaIds: concept?.persona_id ? [concept.persona_id] : [], brand, story: !!script.axes.flow }),
        lessons: lessonBlock(script.brand_id, { productId, area: "words" }) || "(none yet)",
        facts: brandFacts(brand, productId),
        title: script.title,
        script: script.lines.map((l, k) => `${k + 1}. [${l.beat}] ${l.text}${l.on_screen ? `\n   on screen: ${l.on_screen}` : ""}${l.visual_note ? `\n   seen: ${l.visual_note}` : ""}`).join("\n"),
        hooks: script.hook_variants.map((h, k) => `${k + 1}. ${h.text}${h.overlay ? ` (on screen: ${h.overlay})` : ""}`).join("\n") || "(none)",
        instruction,
    });
    const out = await structuredJson({ brandId: script.brand_id, task: "script_revise", model: env.MODEL_SCRIPT, system: p.system, user: p.user, schema: ReviseOut, effort: "low", maxTokens: 12000, refType: "chat", refId });
    const lines = carryLines(script.lines, out.lines);
    const hooks: HookVariant[] = out.hooks.length === script.hook_variants.length ? script.hook_variants.map((h, k) => ({ ...h, text: out.hooks[k].text.trim(), ...(out.hooks[k].overlay ? { overlay: out.hooks[k].overlay! } : {}) })) : script.hook_variants;
    const saved = await saveScriptEdit(scriptId, { lines, hook_variants: hooks });
    return { script: saved, changed: out.changed.trim().slice(0, 300) };
}
