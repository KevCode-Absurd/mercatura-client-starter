import { editRuleChecks } from "../hand-edits";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { AuditItem, ConceptRow, Guardrail, HookGrades, HookVariant, ReferenceMode, ScriptAxes, ScriptLine, ScriptRow, ScriptSnapshot, VoiceCheck } from "@/db/schema";
import type { BrandBrain } from "../brand-brain";
import { loadBrandBrain } from "../brands";
import { env } from "../env";
import { learnedRules, lessonBlock, lessonIds, lessonsFor } from "../lessons";
import { auditPoints, copyPoints, logFailures, voicePoints } from "../failures";
import { loadCreativeKit, productForConcept } from "../production/kit";
import { cameraBlock } from "../product-truth";
import { WHOLE_BRAND, brandFactLines, buyerOf, isNoOffer, isWholeBrand } from "../choices";
import { callStructured, llmEnabled } from "../llm/gateway";
import { brandPack, claimsFor, claimsOfProduct, withoutSections } from "../llm/context";
import { withBrain } from "../brain/brief";
import { brandVoiceApart, brandVoiceText } from "../brand-voice";
import { chosenLength, isStoryStage, lengthWords, shortForStory } from "../copy/stage";
import { wholeClaim } from "../copy/whole-claim";
import { floorText } from "../copy/words-read";
import { craftText } from "../skills/craft";
import type { FactsText } from "../taste/types";
import { contextLevel, modelOf } from "../llm/routing";
import { RunStoppedError } from "../llm/run-control";
import { providerOf, structuredJson } from "../llm/structured";
import { renderPrompt } from "../prompts";
import { boundRuntimeContext } from "../standalone/runtime";
import { creativeBriefText } from "../creative-brief";
import { getCreativeBrief } from "../creative-brief-store";
import { DEFAULT_REFERENCE_MODE } from "../reference-modes";
import { ensureBreakdown, storedBreakdown } from "../references/breakdown";
import { chooseVideoReferences, recordReferenceUse } from "../references/choose";
import { readReferenceAnalysis } from "../references/analysis";
import { exampleAdsFor, exampleBlock } from "./example-ads";
import { jaccard3, readSeconds, scriptWords } from "../script-metrics";
import { getSetting } from "../settings";
import { AWARENESS_INFO, BEATS, INSIGHT_INFO, LENGTH_SECONDS, SOPHISTICATION_LABELS, humanize, type LengthPreset, type ObjectionClass } from "../taxonomy";
import { auditDeterministic, auditSummary, type AuditContext } from "./audit";
import { BEAT_TABLE } from "./axes";
import { activeGuardrails, ensureGuardrails } from "./guardrails";
import { speakerAge, speakerOfScript } from "./pace";
import { exactScript, nearestLength, referenceBlock, referenceWords, type RefInfo } from "./reference";
import { CORE_SECTIONS, composeSkill } from "./skills";
import { copyNote, copyPass } from "./copy-pass";
import { getPersona } from "../personas/store";
import type { PersonaProfile } from "../personas/types";
import { NO_OFFER_TERMS, offerParts, siblingBrief, siblingChecks, termsBlock } from "./fact-rules";
import { takeSeat, type SeatHandle } from "./in-flight";
import { dealHand, handBlock, handNotes, pickQuotes, scriptNumber, usedBlock } from "./hand";
import { listOfferFits } from "../builder/store";
import { editPass } from "./edit-pass";
import { factStore } from "./fact-check";
import { OFFER_TERM, adviceBlock, briefNote, causeFacts, causeNote, checkScriptFormat, factBudget, flowControls, formatNote, offerForStage, offerSaidBy, principlesText, productFacts, reasonBlock, scriptBriefOn, scriptFlowOn, selectFacts, sentBy, voiceBasics, wordsPlan, type Find, type OfferSaid, type StoryBrief } from "./flow";
import { tasteBlock, tasteSkillsUsed } from "../taste/apply";
import { clampVariety, varietyNote, varietyTemperature } from "../variety";
import { pickOpening } from "./hook-choice";
import { stageBrief } from "./stage-brief";
import { checkSurfacesQuietly } from "./surfaces";
import { ensureVoiceProfile, voiceProfile } from "./voice-profile";
import { dominantPerson, voiceRulesText } from "./voice-rules";
import { clampHooks } from "./versions";
import { emotionLabel, nativeArc, nativeForm, nativeWords, scriptType } from "../script-types";
import { indirectControls, isIndirect } from "./indirect";
import type { OutputType } from "../taxonomy";
import { applyVoiceFixes, numbersOf, skippedVoiceCheck, voiceCheck } from "./voice";
import { writingBrain } from "../claims-through";
export const SIMILARITY_LIMIT = 0.6;
const HOOK_COUNT = 5;
const LineOut = z.object({
    beat: z.enum(BEATS),
    text: z.string().min(1),
    on_screen: z.string(),
    visual_note: z.string(),
    theme_ids: z.array(z.string()),
    claim_ids: z.array(z.string()),
});
export const ScriptOut = z.object({
    title: z.string().min(2),
    lines: z.array(LineOut).min(3),
    hook_variants: z.array(z.object({ type: z.string(), text: z.string().min(1), overlay: z.string(), first_frame: z.string() })).min(3),
    load_bearing_beat: z.enum(["mechanism", "proof", "offer", "problem"]),
    test_plan: z.string(),
    placeholders: z.array(z.string()),
    notes: z.string(),
});
type ScriptOut = z.infer<typeof ScriptOut>;
const FlowOut = z.object({ telling: z.string(), ...ScriptOut.shape });
const briefLine = z.preprocess((v) => (Array.isArray(v) ? v.map(String).join("; ") : v), z.string());
const BriefOut = z.object({ speaker: briefLine, before: briefLine, turn: briefLine, after: briefLine, figures: z.preprocess((v) => (typeof v === "string" ? [v] : v), z.array(z.string())) });
const FlowBriefOut = z.object({ brief: BriefOut, ...FlowOut.shape });
const JUDGE_CHECKS = ["accommodation_not_symptom", "hook_flows", "proof_strength", "cta_parts", "one_person", "voice_rules", "implied_forbidden", "implied_guardrail", "personal_attributes", "shelf_test", "so_what", "invented_testimony"] as const;
const JUDGE_FAILS = new Set<string>(["implied_forbidden", "implied_guardrail", "invented_testimony"]);
const REWRITE_ON = new Set(["length_fit", "number_source", "qualifier_dropped", "renewal_price", "repeated_beat", "platitude", "empty_urgency", "absolute_claim"]);
export const CLAIM_CHECKS = new Set(["claims_substantiated", "forbidden_claims", "guardrails", "number_source", "qualifier_dropped", "renewal_price", "evidence_trace", "absolute_claim"]);
export const claimChecksOn = (axes: ScriptAxes) => axes.claim_checks === true;
const CLAIMS_OFF: AuditItem = { check: "claim_checks", status: "pass", message: "Claim checks are off for this script: it was written freely. Check its facts yourself, or press Check claims." };
function ruleChecks(script: {
    lines: ScriptLine[];
    hook_variants: Pick<HookVariant, "text" | "overlay">[];
}, ctx: AuditContext): AuditItem[] {
    const all = auditDeterministic(script, ctx);
    return claimChecksOn(ctx.axes) ? all : [...all.filter((i) => !CLAIM_CHECKS.has(i.check)), CLAIMS_OFF];
}
const rulesFile = (name: string) => fs.readFileSync(path.join(process.cwd(), "prompts", name), "utf-8").trim();
const scriptRules = (strict: boolean, flow = false, brief = false) => rulesFile(flow ? "script-rules-flow.md" : strict ? "script-rules-strict.md" : "script-rules-free.md")
    .replace("{hook_count}", String(HOOK_COUNT))
    .replace(/\{brief_rule\}\r?\n/, brief ? `${rulesFile("script-rules-brief.md")}\n` : "");
const JudgeOut = z.object({
    checks: z.array(z.object({ check: z.enum(JUDGE_CHECKS), verdict: z.enum(["pass", "flag"]), line_index: z.number().int().nullable(), message: z.string() })),
});
const GradeOut = z.object({
    grades: z.array(z.object({
        index: z.number().int(),
        clarity: z.number().int().min(1).max(5),
        relevance: z.number().int().min(1).max(5),
        novelty: z.number().int().min(1).max(5),
        specificity: z.number().int().min(1).max(5),
        credibility: z.number().int().min(1).max(5),
    })),
});
const stripFrontMatter = (md: string) => md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
const readSkillFile = (...parts: string[]) => {
    const file = path.join(env.SKILLS_DIR, "video-ad-scripts", ...parts);
    return fs.existsSync(file) ? stripFrontMatter(fs.readFileSync(file, "utf-8")) : "(not installed)";
};
export interface RefUse {
    mode?: ReferenceMode | null;
    referenceId?: string | null;
}
export const refUse = (s: Pick<ScriptRow, "reference_mode" | "reference_ids">): RefUse => ({ mode: s.reference_mode, referenceId: s.reference_mode ? s.reference_ids[0] : null });
export function auditContext(brandId: string, brand: BrandBrain, axes: ScriptAxes, ref: RefUse = {}, speaker: string | null = null): AuditContext {
    const themes = db.select({ id: schema.themes.id, oc: schema.themes.objection_classes }).from(schema.themes).where(eq(schema.themes.brand_id, brandId)).all();
    const breakdown = ref.mode === "structure" && ref.referenceId ? storedBreakdown(ref.referenceId) : null;
    return {
        brand,
        axes,
        themeObjectionClasses: new Map(themes.map((t) => [t.id, t.oc as ObjectionClass[]])),
        guardrails: activeGuardrails(brandId),
        mode: ref.mode ?? null,
        voice: voiceProfile(brandId),
        speaker,
        freeOrder: !!scriptType(axes.script_type)?.freeOrder || !!axes.native || !!axes.flow,
        ...(axes.native ? { targetWords: nativeWords(axes.native.length) } : {}),
        ...(breakdown ? { targetWords: referenceWords(breakdown) || undefined } : {}),
    };
}
const guardrailText = (gs: {
    label: string;
    guardrail: Guardrail;
}[]) => gs.filter((g) => g.guardrail.applies).map((g) => `- From "${g.label}": ${g.guardrail.rule}${g.guardrail.banned.length ? ` Banned phrases: ${g.guardrail.banned.map((b) => `"${b}"`).join(", ")}.` : ""}`).join("\n") || "(none yet)";
function themeEvidence(brandId: string, themeIds: string[], n?: number) {
    const themes = db.select().from(schema.themes).where(and(eq(schema.themes.brand_id, brandId), inArray(schema.themes.id, themeIds.length ? themeIds : [""]))).all();
    return themes.map((t) => {
        const ranked = db
            .select({ quote: schema.insights.quote, intensity: schema.insights.intensity, source: schema.insights.source_type })
            .from(schema.insights)
            .where(eq(schema.insights.theme_id, t.id))
            .orderBy(desc(schema.insights.intensity))
            .limit(n == null ? 3 : 8)
            .all();
        return { theme: t, quotes: n == null ? ranked : pickQuotes(ranked, n, 3) };
    });
}
const clip = (s: unknown, n: number) => String(s ?? "").replace(/\s+/g, " ").slice(0, n);
function loadRef(referenceId: string): RefInfo | null {
    const r = db.select().from(schema.adReferences).where(eq(schema.adReferences.id, referenceId)).get();
    if (!r?.analysis)
        return null;
    return { id: r.id, kind: r.kind, title: r.title, format: r.tags.format ?? [], hook: r.tags.hook ?? [], approach: r.tags.approach ?? [], awareness: String((r.awareness as {
            stage?: string;
        } | null)?.stage ?? ""), analysis: r.analysis as Record<string, unknown> };
}
function referenceText(refs: ReturnType<typeof chooseVideoReferences>): string {
    if (!refs.length)
        return "(none in the library for this stage)";
    return "Borrow structure only, never words or claims.\n\n" + refs
        .map((r, i) => {
        const a = readReferenceAnalysis(r.analysis);
        const timeline = Array.isArray(a.timeline) ? (a.timeline as {
            start?: number;
            end?: number;
            visual?: string;
        }[]).slice(0, 3) : [];
        return [
            `Reference ${i + 1} (format: ${(r.tags.format ?? []).slice(0, 3).join(", ") || "n/a"}; hook: ${(r.tags.hook ?? []).slice(0, 2).join(", ") || "n/a"}; approach: ${(r.tags.approach ?? []).slice(0, 3).join(", ") || "n/a"})`,
            `- How it persuades: ${clip(a.mechanism, 420)}`,
            `- What to borrow: ${clip(a.transferable_principles, 700)}`,
            `- Do not borrow: ${clip(a.do_not_transfer, 260)}`,
            timeline.length ? `- Opening shots: ${timeline.map((t) => `[${t.start ?? 0}-${t.end ?? "?"}s] ${clip(t.visual, 140)}`).join(" ")}` : "",
        ]
            .filter(Boolean)
            .join("\n");
    })
        .join("\n\n");
}
const scriptText = (lines: {
    text: string;
}[]) => lines.map((l) => l.text).join(" ");
export function mostSimilar(conceptId: string, lines: {
    text: string;
}[], selfId?: string): {
    script_id: string;
    jaccard: number;
} | null {
    const others = db.select({ id: schema.scripts.id, lines: schema.scripts.lines }).from(schema.scripts).where(eq(schema.scripts.concept_id, conceptId)).all();
    let best: {
        script_id: string;
        jaccard: number;
    } | null = null;
    for (const o of others) {
        if (o.id === selfId)
            continue;
        const j = jaccard3(scriptText(lines), scriptText(o.lines));
        if (!best || j > best.jaccard)
            best = { script_id: o.id, jaccard: Math.round(j * 1000) / 1000 };
    }
    return best;
}
const subjectOf = (brand: BrandBrain, concept: Pick<ConceptRow, "offer_id"> & Partial<Pick<ConceptRow, "product_id">>): string | null => (isWholeBrand(concept.product_id) ? WHOLE_BRAND : productForConcept(brand, concept));
const subjectFacts = (brand: BrandBrain, productId: string | null | undefined): string[] => (isWholeBrand(productId) ? [...brandFactLines(brand), ...brand.products.flatMap((p) => productFacts({ brand: {}, guarantee: null }, p))] : productFacts(brand, brand.products.find((x) => x.id === productId) ?? brand.products[0]));
export const researchFinds = (brandId: string, themeIds: string[]): Find[] => themeEvidence(brandId, themeIds).map((e) => ({ theme: { id: e.theme.id, type: e.theme.type, label: e.theme.label, summary: e.theme.summary }, quotes: e.quotes.map((q) => ({ quote: q.quote, source: q.source })) }));
export function factSheetFor(brand: BrandBrain, concept: Pick<ConceptRow, "awareness_stage" | "angle" | "differentiator_test" | "offer_id" | "persona_id"> & Partial<Pick<ConceptRow, "product_id">>, o: {
    facts?: FactsText;
    offerSaid: OfferSaid;
}) {
    const stage = concept.awareness_stage;
    const budget = factBudget(stage, o.facts);
    const persona = buyerOf(brand, concept.persona_id);
    const whole = isWholeBrand(concept.product_id);
    const product = whole ? undefined : (brand.products.find((x) => x.id === subjectOf(brand, concept)) ?? brand.products[0]);
    const allClaims = claimsOfProduct(brand, product?.id).map(wholeClaim);
    const about = `${concept.angle} ${concept.differentiator_test.claim ?? ""} ${persona?.problem ?? ""}`;
    const own = whole ? brandFactLines(brand) : productFacts({ brand: {}, guarantee: null }, product);
    const sheet = selectFacts(budget.product === "name" ? own.slice(0, 1) : own, allClaims.filter((f) => o.offerSaid === "full" || !OFFER_TERM.test(f)), about, budget.claims);
    const causes = causeFacts(allClaims.filter((f) => !sheet.includes(f)), `${persona?.problem ?? ""} ${concept.angle}`, budget.causes);
    const text = [
        `${budget.product === "name" ? "This buyer does not see the problem yet, so little of the product is sent on purpose. It comes in the last lines: named, said to be what it is in 1 sentence, with at most the 1 fact about it below.\n" : ""}${sheet.map((f) => `- ${f}`).join("\n") || "(none recorded)"}`,
        budget.causes ? causeNote(stage, causes) : "",
    ]
        .filter(Boolean)
        .join("\n\n");
    return { budget, whole, product, allClaims, sheet, causes, text };
}
const NEUTRAL: HookGrades = { clarity: 3, relevance: 3, novelty: 3, specificity: 3, credibility: 3 };
export const COLD_OPENING = "**The opening.** Read line 1 as a cold viewer who has never heard of the brand: in the first 3 seconds, does this buyer stop for their own situation? Where it does not, that is a fault of line 1 (`fresh`): say what is missing. A rewrite keeps the same speaker and telling, and line 2 must follow from it.";
export async function gradeHooks(brandId: string, brand: BrandBrain, concept: ConceptRow, hooks: {
    text: string;
}[], line2: string, refId: string): Promise<HookGrades[]> {
    const persona = buyerOf(brand, concept.persona_id);
    const p = renderPrompt("hook-grade", {
        brand_name: brand.brand.name,
        persona: persona ? `${persona.name}: ${persona.summary}` : concept.persona_id,
        angle: concept.angle,
        line2,
        brand_voice: "",
        lessons: "",
        copy_craft: "",
        hooks: hooks.map((h, i) => `${i} | ${h.text}`).join("\n"),
    });
    const res = await callStructured({ brandId, task: "hook_grade", model: env.MODEL_FAST, system: p.system, user: p.user, schema: GradeOut, maxTokens: 2000, refType: "script", refId });
    return hooks.map((_, i) => {
        const g = res.data.grades.find((x) => x.index === i);
        return g ? { clarity: g.clarity, relevance: g.relevance, novelty: g.novelty, specificity: g.specificity, credibility: g.credibility } : NEUTRAL;
    });
}
async function auditJudged(brandId: string, brand: BrandBrain, ctx: AuditContext, lines: ScriptLine[], hooks: {
    text: string;
}[], refId: string): Promise<AuditItem[]> {
    const p = renderPrompt("audit-judge", {
        brand_name: brand.brand.name,
        brand_voice: brandVoiceText(brandId, { surfaces: [], brand }),
        lessons: learnedRules(brandId, "judges"),
        claims: [...brand.claims.filter((c) => c.status === "substantiated").map((c) => `- ${c.text}`), ...(brand.guarantee ? [`- The guarantee: ${brand.guarantee.text}`] : []), ...brand.offers.map((o) => `- Offer: ${o.name}, ${o.price}${o.notes ? `. ${o.notes}` : ""}`)].join("\n") || "(none)",
        forbidden: brand.forbidden_claims.join("; ") || "(none)",
        guardrails: guardrailText(ctx.guardrails),
        controls: controlsText(ctx.axes),
        script: lines.map((l, i) => `${i} | ${l.beat} | ${l.text} | ${l.on_screen ?? ""}`).join("\n"),
        hooks: hooks.map((h, i) => `${i + 1}. ${h.text}`).join("\n"),
    });
    const res = await callStructured({ brandId, task: "audit_judge", model: env.MODEL_EXTRACT, system: p.system, user: p.user, schema: JudgeOut, effort: "low", maxTokens: 4000, refType: "script", refId });
    const seen = new Set<string>();
    return res.data.checks
        .filter((c) => !seen.has(c.check) && (seen.add(c.check), true))
        .map((c) => ({
        check: c.check,
        status: c.verdict === "pass" ? ("pass" as const) : JUDGE_FAILS.has(c.check) ? ("fail" as const) : ("warn" as const),
        message: c.message,
        ...(c.verdict === "flag" && c.line_index != null && c.line_index >= 0 && c.line_index < lines.length ? { line_index: c.line_index } : {}),
    }));
}
export async function auditScript(brandId: string, axes: ScriptAxes, lines: ScriptLine[], hooks: Pick<HookVariant, "text" | "overlay">[], refId: string, ref: RefUse = {}, speaker: string | null = null): Promise<AuditItem[]> {
    const brand = loadBrandBrain(brandId);
    const ctx = auditContext(brandId, brand, axes, ref, speaker);
    const items = [...ruleChecks({ lines, hook_variants: hooks }, ctx), ...editRuleChecks(brandId, lines.map((l) => l.text), hooks.map((h) => h.text))];
    if (!llmEnabled() || !claimChecksOn(axes))
        return items;
    return [...items, ...(await auditJudged(brandId, brand, ctx, lines, hooks, refId))];
}
const CACHE_TTL_MS = 4 * 60000;
const warm = new Map<string, {
    until: number;
    first?: Promise<void>;
}>();
let releaseFirst: (() => void) | undefined;
async function cacheWarm(brandId: string): Promise<void> {
    const w = warm.get(brandId);
    if (w && w.until > Date.now())
        return w.first;
    let done!: () => void;
    const first = new Promise<void>((r) => (done = r));
    warm.set(brandId, { until: Date.now() + CACHE_TTL_MS, first });
    releaseFirst = done;
}
const controlsText = (a: ScriptAxes) => [
    a.native
        ? `NATIVE AD COPY. Write the long-form copy the task skill describes, 1 line object per movement. Form: ${nativeForm(a.native.form)?.label ?? "personal journey"} (see <copy-form>; it sets the order). Arc: ${nativeArc(a.native.arc)?.label ?? a.native.arc} (see <story-arc>). Narrator: ${a.native.narrator}. Length: ${a.native.length ?? "standard"}, about ${nativeWords(a.native.length)} words. The task skill's "What to return" replaces rules 9, 10 and 11 above: \`on_screen\` and \`visual_note\` are empty (the image is made by a different skill), and each hook variant is an alternative opening with its headline (\`overlay\`) and the moment an image could show (\`first_frame\`). The beat table below does not apply.${isIndirect(a.native) ? `\n${indirectControls(a.native.image)}` : ""}`
        : "",
    a.script_type ? `script type: ${scriptType(a.script_type)?.label ?? a.script_type} (follow its recipe in <script-type>; it sets the opening, the beat order and what carries the script)` : "",
    `length ${a.length}; person ${a.person}, tense ${a.tense}; problem entry: ${humanize(a.entry)}; story shape: ${humanize(a.story_shape)}; register: ${a.register}${a.hook_type ? `; hook type for the script's own hook: ${humanize(a.hook_type)}` : ""}`,
    a.emotion ? `feel: lead with ${emotionLabel(a.emotion) || a.emotion} (hook and problem)${a.emotion_end ? `, end on ${emotionLabel(a.emotion_end) || a.emotion_end} (call to action and identity line)` : ""}. Write it as <emotion-scale> describes. If the brand's voice rules forbid this feel, use the nearest allowed one and say so in notes.` : "",
]
    .filter(Boolean)
    .join("\n");
export interface GenerateRequest {
    draftOnly?: boolean;
    conceptId: string;
    axes: ScriptAxes;
    themeIds?: string[];
    turn?: number;
    referenceId?: string;
    referenceMode?: ReferenceMode;
    altOf?: string;
    format?: OutputType | null;
    model?: string;
}
export function askedLine(asked: string): string {
    return `Asked for by the person, for this ad only: "${asked.replace(/\s+/g, " ").trim().slice(0, 2400)}"\nDo what it says. Where it names an offer, a price, a discount or a gift, that is the offer of this ad: it replaces the offer above and the terms block below. Say it once, as they stated it, and add no figure or condition they did not give.`;
}
const nextScriptId = () => {
    const all = db.select({ id: schema.scripts.id }).from(schema.scripts).all();
    return `scr_${String(Math.max(0, ...all.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
};
function snapshot(row: Pick<ScriptRow, "title" | "lines" | "hook_variants" | "audit" | "est_seconds">): ScriptSnapshot {
    return { title: row.title, lines: row.lines, hook_variants: row.hook_variants, audit: row.audit, est_seconds: row.est_seconds };
}
function addVersion(brandId: string, scriptId: string, version: number, source: "seed" | "generated" | "edit" | "repair" | "voice", snap: ScriptSnapshot) {
    db.insert(schema.scriptVersions).values({ id: `sv_${randomBytes(6).toString("hex")}`, brand_id: brandId, script_id: scriptId, version, source, snapshot: snap }).run();
}
function cleanLines(out: ScriptOut, allowedThemes: Set<string>, brand: BrandBrain): ScriptLine[] {
    const claims = new Set(brand.claims.map((c) => c.id));
    return out.lines.map((l) => ({
        beat: l.beat,
        text: l.text.trim(),
        theme_ids: [...new Set(l.theme_ids.filter((id) => allowedThemes.has(id)))],
        claim_ids: [...new Set(l.claim_ids.filter((id) => claims.has(id)))],
        visual_note: l.visual_note.trim(),
        on_screen: l.on_screen.trim(),
    }));
}
const RepairOut = z.object({ changes: z.array(z.object({ index: z.number().int(), text: z.string().min(1), on_screen: z.string() })).max(12), note: z.string() });
async function repairLines(args: {
    brandId: string;
    brand: BrandBrain;
    ctx: AuditContext;
    lines: ScriptLine[];
    fails: AuditItem[];
    refId: string;
}): Promise<{
    lines: ScriptLine[];
    note: string;
} | null> {
    const { brand } = args;
    const p = renderPrompt("line-repair", {
        brand_name: brand.brand.name,
        claims: [...brand.claims.filter((c) => c.status === "substantiated").map((c) => `- ${c.text}`), ...(brand.guarantee ? [`- The guarantee: ${brand.guarantee.text}`] : []), ...brand.offers.map((o) => `- Offer: ${o.name}, ${o.price}${o.notes ? `. ${o.notes}` : ""}`)].join("\n") || "(none)",
        forbidden: brand.forbidden_claims.join("; ") || "(none)",
        guardrails: guardrailText(args.ctx.guardrails),
        brand_voice: brandVoiceText(args.brandId, { surfaces: ["script"], brand }),
        lessons: learnedRules(args.brandId, "edits"),
        fails: args.fails.map((f) => `- ${f.check}${f.line_index != null ? ` (line ${f.line_index})` : ""}: ${f.message}`).join("\n"),
        script: args.lines.map((l, i) => `${i} | ${l.beat} | ${l.text} | ${l.on_screen ?? ""}`).join("\n"),
    });
    const out = await structuredJson({ brandId: args.brandId, task: "line_repair", model: env.MODEL_EXTRACT, system: p.system, user: p.user, schema: RepairOut, effort: "low", maxTokens: 4000, refType: "script", refId: args.refId });
    const lines = args.lines.map((l) => ({ ...l }));
    let changed = 0;
    for (const c of out.changes) {
        const l = lines[c.index];
        if (!l || (c.text.trim() === l.text && c.on_screen.trim() === (l.on_screen ?? "")))
            continue;
        l.text = c.text.trim();
        l.on_screen = c.on_screen.trim();
        changed++;
    }
    if (!changed)
        return null;
    if (newFails(auditDeterministic({ lines: args.lines, hook_variants: [] }, args.ctx), auditDeterministic({ lines, hook_variants: [] }, args.ctx)).length)
        return null;
    return { lines, note: out.note.trim() };
}
const newFails = (before: AuditItem[], after: AuditItem[]) => {
    const had = new Set(before.filter((i) => i.status === "fail").map((i) => `${i.check}:${i.message}`));
    return after.filter((i) => i.status === "fail" && !had.has(`${i.check}:${i.message}`));
};
async function voicePass(args: {
    brandId: string;
    brand: BrandBrain;
    ctx: AuditContext;
    lines: ScriptLine[];
    hooks: {
        text: string;
        overlay: string;
    }[];
    themeIds: string[];
    fix: boolean;
    stage?: import("../taxonomy").AwarenessStage | null;
    refId: string;
    personaId?: string;
}): Promise<{
    lines: ScriptLine[];
    hooks: {
        text: string;
        overlay: string;
    }[];
    check: VoiceCheck;
}> {
    if (!llmEnabled())
        return { lines: args.lines, hooks: args.hooks, check: skippedVoiceCheck("Mock mode: the brand voice check needs live mode.") };
    try {
        const res = await voiceCheck({ brandId: args.brandId, brand: args.brand, lines: args.lines, hooks: args.hooks, themeIds: args.themeIds, fix: args.fix, refId: args.refId, stage: args.stage, readCopy: !!args.ctx.axes.native, personaIds: args.personaId ? [args.personaId] : [] });
        if (res.check.status !== "fixed")
            return { lines: args.lines, hooks: args.hooks, check: res.check };
        const before = auditDeterministic({ lines: args.lines, hook_variants: args.hooks }, args.ctx);
        const after = auditDeterministic({ lines: res.lines, hook_variants: res.hooks }, args.ctx);
        if (newFails(before, after).length) {
            return { lines: args.lines, hooks: args.hooks, check: { ...res.check, status: "suggested", summary: `${res.check.summary} The fixes weren't applied because they broke an audit rule.`, issues: res.check.issues.map((i) => ({ ...i, applied: false })) } };
        }
        return res;
    }
    catch (e) {
        return { lines: args.lines, hooks: args.hooks, check: skippedVoiceCheck(`The brand voice check didn't run: ${(e as Error).message.slice(0, 160)}`) };
    }
}
async function generateExactScript(req: GenerateRequest, concept: ConceptRow, brand: BrandBrain, ref: RefInfo): Promise<string> {
    const brandId = concept.brand_id;
    const breakdown = await ensureBreakdown(ref.id);
    const exact = exactScript(breakdown);
    if (exact.lines.length < 1)
        throw new Error("The reference has no spoken words or readable copy to carry over. Use \"Keep the structure\" or \"Loose inspiration\" instead.");
    const speaker = speakerAge(brandId, concept.persona_id);
    const seconds = exact.seconds || readSeconds(exact.lines, speaker);
    const axes: ScriptAxes = { ...req.axes, length: nearestLength(seconds) };
    const ctx = auditContext(brandId, brand, axes, { mode: "exact", referenceId: ref.id }, speaker);
    const refId = `${concept.id}:${randomBytes(3).toString("hex")}`;
    const hooks = [{ text: exact.lines[0].text, overlay: exact.lines[0].on_screen ?? "" }];
    const [judged, voice] = await Promise.all([
        llmEnabled() ? auditJudged(brandId, brand, ctx, exact.lines, hooks, refId).catch((e: Error): AuditItem[] => [{ check: "judge", status: "warn", message: `Judgement checks didn't run: ${e.message.slice(0, 120)}` }]) : Promise.resolve([] as AuditItem[]),
        voicePass({ brandId, brand, ctx, lines: exact.lines, hooks, themeIds: concept.theme_ids, fix: false, refId }),
    ]);
    const hook_variants: HookVariant[] = [{ id: "hk_1", type: "reference", text: hooks[0].text, overlay: hooks[0].overlay, first_frame: exact.first_frame, grades: NEUTRAL }];
    const advertiser = String(ref.analysis.advertiser ?? "").trim();
    const foreign = advertiser && !advertiser.toLowerCase().includes(brand.brand.name.toLowerCase()) && !brand.brand.name.toLowerCase().includes(advertiser.toLowerCase());
    const audit: AuditItem[] = [
        ...auditDeterministic({ lines: exact.lines, hook_variants }, ctx),
        ...judged.filter((i) => ["implied_forbidden", "implied_guardrail", "proof_strength", "personal_attributes", "judge"].includes(i.check)),
        ...(foreign ? [{ check: "reference_owner", status: "warn" as const, message: `This ad looks like it is by ${advertiser}, not ${brand.brand.name}. "Same ad, new format" copies its words and claims as they are. Use "Keep the structure" to make it yours.` }] : []),
    ];
    const id = nextScriptId();
    const row = {
        id,
        brand_id: brandId,
        concept_id: concept.id,
        title: `${ref.title} (same ad, new format)`.slice(0, 120),
        version: 1,
        axes,
        awareness_stage: concept.awareness_stage,
        format_target: null,
        lines: exact.lines,
        hook_variants,
        load_bearing_beat: exact.load_bearing_beat,
        audit,
        est_seconds: seconds,
        status: "draft" as const,
        similar_to: null,
        notes: `Same ad, new format: the lines, shots and timing are the reference ad's own (${breakdown.kind === "video" ? `${breakdown.shots.length} shots, ${breakdown.duration} seconds` : `${breakdown.elements.length} text elements`}). Nothing was rewritten.${breakdown.device ? ` The device: ${breakdown.device}` : ""}`,
        test_plan: "Tests the format only: the same ad against its original. If it wins, remake the other winners in this format.",
        reference_ids: [ref.id],
        hook_variant_of: null,
        theme_ids: [],
        model: null,
        reference_mode: "exact" as const,
        voice_check: voice.check,
        alt_of: null,
        skills_used: ["ad-reference-exact"],
    };
    db.transaction((tx) => {
        tx.insert(schema.scripts).values(row).run();
        if (concept.status === "draft")
            tx.update(schema.concepts).set({ status: "scripted" }).where(eq(schema.concepts.id, concept.id)).run();
    });
    addVersion(brandId, id, 1, "generated", snapshot(row));
    await checkSurfacesQuietly(id);
    return id;
}
export async function generateScript(req: GenerateRequest): Promise<string> {
    const seat = req.draftOnly || req.altOf || req.turn == null ? null : takeSeat(req.conceptId, req.turn);
    try {
        return await writeScript(req, seat);
    }
    finally {
        seat?.leave();
    }
}
async function writeScript(req: GenerateRequest, seat: SeatHandle | null): Promise<string> {
    checkScriptFormat(req.format);
    const concept = db.select().from(schema.concepts).where(eq(schema.concepts.id, req.conceptId)).get();
    if (!concept)
        throw new Error(`Concept ${req.conceptId} not found`);
    const brandId = concept.brand_id;
    const brand = writingBrain(brandId, req.axes.claim_checks);
    const creativeBrief = getCreativeBrief(brandId, concept.id);
    if (creativeBrief?.selected_variant === null)
        throw new Error("Choose a variant of this guided concept on the Concepts screen before writing scripts.");
    if (creativeBrief?.basis === "preview" && llmEnabled())
        throw new Error("Generate and approve a live brief before writing scripts from preview concepts.");
    const ref = req.referenceId ? loadRef(req.referenceId) : null;
    if (req.referenceId && !ref)
        throw new Error("That reference ad hasn't been analysed yet, so it can't drive a script.");
    const mode: ReferenceMode | null = ref ? (req.referenceMode ?? DEFAULT_REFERENCE_MODE) : null;
    if (ref && mode === "exact")
        return generateExactScript(req, concept, brand, ref);
    const strict = req.axes.claim_checks ?? getSetting(brandId, "checks").claims;
    if (strict)
        await ensureGuardrails(brandId);
    await ensureVoiceProfile(brandId);
    const ideaOnly = !!ref && mode === "principles" && req.axes.taste?.look === "brand";
    const breakdown = ref && mode === "structure" ? await ensureBreakdown(ref.id) : null;
    const flow = (scriptFlowOn() || !!req.axes.flow) && !strict && (!mode || mode === "principles") && !req.axes.native;
    const axes: ScriptAxes = { ...req.axes, ...(breakdown?.duration && mode === "structure" ? { length: nearestLength(breakdown.duration) } : {}), claim_checks: strict, ...(flow ? { flow: true } : {}), ...(isNoOffer(concept.offer_id) ? { no_offer: true } : {}) };
    const speaker = speakerAge(brandId, concept.persona_id);
    const ctx = auditContext(brandId, brand, axes, { mode, referenceId: ref?.id }, speaker);
    const themeIds = req.themeIds?.length ? req.themeIds : concept.theme_ids;
    const persona = buyerOf(brand, concept.persona_id);
    const takeOf = req.altOf ? db.select({ at: schema.scripts.created_at }).from(schema.scripts).where(eq(schema.scripts.id, req.altOf)).get()?.at : null;
    const dealt = mode === "structure" ? null : dealHand({ brandId, brand, stage: concept.awareness_stage, turn: req.turn, personaId: persona?.id, productId: isWholeBrand(concept.product_id) ? null : subjectOf(brand, concept), about: `${concept.angle} ${persona?.problem ?? ""}`, ownThemes: themeIds, before: takeOf });
    const evidence = themeEvidence(brandId, themeIds, dealt?.n ?? scriptNumber(brandId, req.turn ?? 0, takeOf));
    const allowed = new Set(evidence.map((e) => e.theme.id));
    const offer = brand.offers.find((o) => o.id === concept.offer_id);
    const level = contextLevel("script");
    const refs = ref ? [] : exampleAdsFor({ brandId, stage: concept.awareness_stage,
        format: req.format, industry: brand.brand.category, productType: brand.products.find((p) => p.id === subjectOf(brand, concept))?.format,
        skipAdvertiser: brand.brand.name, count: level === "minimal" ? 1 : 2 });
    const length = axes.length as LengthPreset;
    const refId = `${concept.id}:${randomBytes(3).toString("hex")}`;
    const model = req.model || env.MODEL_SCRIPT;
    const pin = !!req.model;
    const skills = flow ? { stable: "", own: "", used: ["ad-principles", ...(axes.script_type ? [`script-types/${axes.script_type}`] : [])], sections: [] as string[], text: "" } : composeSkill({ start: axes.native && !mode ? "native" : (mode ?? "research"), scriptType: axes.script_type, emotion: axes.emotion, format: axes.native ? null : req.format, native: axes.native, ...(level === "minimal" ? { onlySections: CORE_SECTIONS } : {}) });
    const pack = level === "full" && strict ? null : brandPack(brand, level === "full" ? "focused" : level, { productId: subjectOf(brand, concept), offerId: concept.offer_id, personaIds: persona ? [persona.id] : [], about: `${concept.name} ${concept.angle} ${concept.differentiator_test.claim ?? ""} ${persona?.problem ?? ""}` });
    const patterns = flow ? "" : readSkillFile("references", "winning-ad-patterns.md");
    const saved = () => db.select({ id: schema.scripts.id, title: schema.scripts.title, lines: schema.scripts.lines, alt_of: schema.scripts.alt_of }).from(schema.scripts).where(eq(schema.scripts.concept_id, concept.id)).all().filter((s) => !req.altOf || (s.id !== req.altOf && s.alt_of !== req.altOf));
    const inFlight = seat ? await seat.before() : [];
    const existing = [...saved(), ...inFlight.map((d) => ({ ...d, alt_of: null as string | null }))];
    const refDeal: OfferSaid | null = mode && !strict && !axes.no_offer && !axes.native ? offerSaidBy(wordsPlan("script", { stage: concept.awareness_stage, format: req.format, taste: axes.taste, variety: axes.variety, hasReference: !!ref }), concept.awareness_stage, false, !!axes.taste?.sell) : null;
    const refOffer = (() => {
        if (!refDeal || refDeal === "full")
            return null;
        const p = offerParts(brand, concept.offer_id);
        return offerForStage(refDeal, { tryPrice: p ? (p.first ? `${p.cur}${p.first.price} for the first order` : `${p.cur}${p.chosen.price}`) : "", guarantee: p?.guarantee ?? "", terms: [] });
    })();
    const voiceApart = brandVoiceApart(brandId, { surfaces: ["script", "headline", "site"], personaIds: persona ? [persona.id] : [], brand, story: true });
    const vars = {
        brand_name: brand.brand.name,
        floor: floorText(),
        brand_voice: voiceApart.text,
        buyer: voiceApart.buyer,
        skill: skills.stable,
        own_skills: skills.own || "(none: the task skill's default order applies)",
        patterns: level === "full" ? patterns : level === "focused" ? withoutSections(patterns, /^(What this is and how to use it|The numbers)/i) : "(not sent at this context level)",
        hook_count: String(HOOK_COUNT),
        brand_brain: JSON.stringify(withBrain(brandId, { ...(pack ? (strict ? pack.stable : { ...pack.stable, approved_claims: undefined, forbidden_claims: undefined, proof_assets: undefined }) : brand), voice: undefined, ...(refOffer ? { offers: undefined } : {}), bound_evidence: boundRuntimeContext(brandId, { productId: subjectOf(brand, concept) ?? "unbound", market: brand.brand.market }, { concept: concept.id })?.prompt }, `${axes.script_type} ${concept.name} ${concept.angle}`)),
        brand_own: strict && pack && Object.keys(pack.own).length ? JSON.stringify(pack.own) : "(nothing further)",
        rules: scriptRules(strict),
        guardrails: strict ? guardrailText(ctx.guardrails) : "(not applied: claim checks are off for this script)",
        concept: [
            `Name: ${concept.name}`,
            `Persona: ${persona ? `${persona.name} (${persona.id}). ${persona.summary} Problem: ${persona.problem} Trigger: ${persona.trigger} Their words: ${persona.language.join(", ")}` : concept.persona_id}`,
            `Angle: ${concept.angle}`,
            `Offer: ${axes.no_offer ? NO_OFFER_TERMS : refOffer ? (refDeal === "none" ? "Not said in this ad (see \"The offer\" below)." : "Only what \"The offer\" below gives.") : offer ? `${offer.name} (${offer.id}), ${brand.brand.currency} ${offer.price}${offer.per_day ? `, ${offer.per_day} per day` : ""}${offer.notes ? `. ${offer.notes}` : ""}` : concept.offer_id}`,
            axes.asked?.trim() ? askedLine(axes.asked) : "",
            `Awareness stage: ${AWARENESS_INFO[concept.awareness_stage].label}`,
            `Sophistication stage: ${concept.sophistication_stage} (${SOPHISTICATION_LABELS[concept.sophistication_stage] ?? ""})`,
            concept.differentiator_test.claim ? `Main claim: ${concept.differentiator_test.claim}` : "",
            !mode || mode === "principles" ? stageBrief(concept.awareness_stage, concept.sophistication_stage) : "",
        ]
            .filter(Boolean)
            .join("\n"),
        controls: `${controlsText(axes)}${axes.variety ? `\n\nHow close to what the brand already runs: ${varietyNote(clampVariety(axes.variety))}` : ""}\n\n${axes.no_offer ? NO_OFFER_TERMS : (refOffer ?? termsBlock(brand, concept.offer_id))}\n\nWriting for the voice (rules for every line, hook and on-screen word; each is checked afterwards):\n${voiceRulesText(voiceProfile(brandId), !axes.native, false, concept.awareness_stage)}`,
        beat_table: Object.entries(BEAT_TABLE[length] ?? BEAT_TABLE["60s"]).map(([b, v]) => `- ${b}: ${v}`).join("\n"),
        target_words: String(ctx.targetWords ?? lengthWords(length in LENGTH_SECONDS ? length : "60s", speaker)),
        length: axes.length,
        themes: evidence
            .map((e) => `[${e.theme.id}] ${INSIGHT_INFO[e.theme.type].label} · "${e.theme.label}": ${e.theme.summary}\n${e.quotes.map((q) => `   - (${q.source === "founder" ? "the founder's words: never quote as a customer's" : q.source}, intensity ${q.intensity}) "${clip(q.quote, 240)}"`).join("\n")}`)
            .join("\n"),
        references: ref && mode && mode !== "exact" ? referenceBlock(mode, ref, breakdown, brand.brand.name, ideaOnly) : referenceText(refs),
        lessons: [lessonBlock(brandId, { productId: subjectOf(brand, concept), area: "words", factsElsewhere: true }) || "(none yet)", cameraBlock({ brandId, brand, kit: loadCreativeKit(brandId), productId: subjectOf(brand, concept) }, "writer")].filter(Boolean).join("\n\n"),
        existing: [siblingBrief(existing.map((s) => ({ id: s.id, title: s.title, lines: s.lines })), brand, { strict }), dealt ? usedBlock(dealt) : ""].filter(Boolean).join("\n\n"),
        hand: dealt ? handBlock(dealt) : "",
    };
    const briefOn = flow && scriptBriefOn();
    const flowSchema = (briefOn ? FlowBriefOut : FlowOut) as unknown as typeof ScriptOut;
    const offerSay = flow ? (listOfferFits(brandId).find((f) => f.offer_id === concept.offer_id)?.say ?? "") : "";
    const offerFacts = axes.no_offer ? [`- ${NO_OFFER_TERMS}`] : termsBlock(brand, concept.offer_id).split("\n").filter((l) => l.startsWith("- "));
    const parts = offerParts(brand, concept.offer_id);
    const plan = wordsPlan("script", { stage: concept.awareness_stage, format: req.format, taste: axes.taste, variety: axes.variety, hasReference: !!ref });
    const offerSaid = offerSaidBy(plan, concept.awareness_stage, !!axes.no_offer, !!axes.taste?.sell);
    const tryPrice = parts ? (parts.first ? `${parts.cur}${parts.first.price} for the first order` : `${parts.cur}${parts.chosen.price}`) : "";
    const { budget, whole, product, allClaims, causes, text: factSheet } = factSheetFor(brand, concept, { facts: plan.text.facts, offerSaid });
    const story = isStoryStage(concept.awareness_stage);
    const longStory = flow && story && !shortForStory(concept.awareness_stage, chosenLength(axes), speaker) ? craftText(["long-story"]) : "";
    const sent = sentBy(plan);
    const voiceFor = (text: string) => (sent.voice === "basics" ? voiceBasics(text) : text);
    const offerBrief = offerForStage(offerSaid, axes.no_offer ? null : { tryPrice, guarantee: parts?.guarantee ?? "", terms: offerFacts, say: offerSay });
    const flowVoice = brandVoiceApart(brandId, { surfaces: sent.brandAds ? ["script", "primary_text"] : [], brand, story: true });
    const flowVars = flow
        ? {
            brand_name: vars.brand_name,
            floor: vars.floor,
            principles: principlesText(undefined, { longStory: !!longStory }),
            rules: scriptRules(false, true, briefOn),
            facts: factSheet,
            story: longStory,
            examples: exampleBlock(refs, concept.awareness_stage),
            reason: reasonBlock({
                ...(budget.causes ? { causes } : {}),
                persona: persona ? { ...persona, ...(({ wants, identity, notes, tried, objections, believes }) => ({ wants, identity, notes, tried, objections, believes }))(getPersona(brandId, persona.id) ?? ({} as Partial<PersonaProfile>)) } : persona,
                personaId: concept.persona_id,
                angle: concept.angle,
                claim: concept.differentiator_test.claim,
                awareness: concept.awareness_stage,
                stageBrief: stageBrief(concept.awareness_stage, concept.sophistication_stage),
                finds: evidence.map((e) => ({ theme: { id: e.theme.id, type: e.theme.type, label: e.theme.label, summary: e.theme.summary }, quotes: e.quotes.map((q) => ({ quote: q.quote, source: q.source })) })),
                terms: offerFacts,
                offerSay: axes.no_offer ? "" : offerSay,
                noOffer: !!axes.no_offer,
                tryPrice,
                guarantee: parts?.guarantee ?? "",
                held: [...allClaims, ...subjectFacts(brand, whole ? WHOLE_BRAND : product?.id)],
                deal: offerSaid,
                doubtsMax: budget.doubts,
                ...(plan.text.customerWords === "none" ? { wordsMax: 0 } : plan.text.customerWords === "few" ? { wordsMax: 3 } : {}),
                asked: axes.asked?.trim() ? askedLine(axes.asked) : "",
            }),
            brand_voice: voiceFor(flowVoice.text),
            buyer: flowVoice.buyer,
            format: formatNote(req.format),
            controls: [flowControls(axes, req.format, voiceRulesText(voiceProfile(brandId), true, true, concept.awareness_stage), concept.awareness_stage, undefined, sent, ref && mode === "principles" ? referenceBlock(mode, ref, null, brand.brand.name, ideaOnly, true) : "", speaker), tasteBlock(plan)].filter(Boolean).join("\n\n"),
            existing: vars.existing,
            hand: vars.hand,
            lessons: [adviceBlock(lessonsFor(brandId, { productId: subjectOf(brand, concept), area: "words", factsElsewhere: true })), cameraBlock({ brandId, brand, kit: loadCreativeKit(brandId), productId: subjectOf(brand, concept) }, "writer")].filter(Boolean).join("\n\n"),
        }
        : null;
    const call = async (extra: string) => {
        const p = flowVars ? renderPrompt("script-flow", { ...flowVars, extra }) : renderPrompt("script", { ...vars, extra });
        const approvedDirection = creativeBriefText(creativeBrief);
        if (approvedDirection)
            p.user += `\n\n${approvedDirection}`;
        recordReferenceUse(brandId, ref ? [ref.id] : refs.map((r) => r.id), `script:${refId}`);
        const temperature = flow ? plan.temperature : axes.variety ? varietyTemperature(clampVariety(axes.variety)) : undefined;
        if (providerOf(pin ? model : modelOf("script", model)) !== "claude")
            return structuredJson({ brandId, task: "script", model, pin, system: p.system, user: p.user, schema: flow ? flowSchema : ScriptOut, effort: "medium", maxTokens: 16000, temperature, refType: "script", refId });
        await cacheWarm(brandId);
        const mine = releaseFirst;
        releaseFirst = undefined;
        try {
            const res = await callStructured({ brandId, task: "script", model, pin, system: p.system, user: p.user, schema: flow ? flowSchema : ScriptOut, effort: "medium", maxTokens: 16000, refType: "script", refId });
            warm.set(brandId, { until: Date.now() + CACHE_TTL_MS });
            return res.data;
        }
        finally {
            mine?.();
        }
    };
    let out = await call("");
    let lines = cleanLines(out, allowed, brand);
    seat?.publish({ title: out.title, lines });
    let source: "generated" | "repair" = "generated";
    if (req.draftOnly)
        return JSON.stringify({ title: out.title, lines, hook_variants: out.hook_variants, rule_checks: ruleChecks({ lines, hook_variants: out.hook_variants }, ctx).filter((i) => i.status !== "pass") });
    const flagged = ruleChecks({ lines, hook_variants: out.hook_variants }, ctx).filter((i) => (i.status === "fail" || (i.status === "warn" && REWRITE_ON.has(i.check))) && !(flow && (i.check === "renewal_price" || i.check === "length_fit")));
    const sim0 = req.altOf ? null : mostSimilar(concept.id, lines);
    const tooClose = sim0 && sim0.jaccard >= SIMILARITY_LIMIT ? sim0 : null;
    if (flagged.some((i) => i.status === "fail" || i.check === "length_fit") || tooClose) {
        const notes = flagged.map((i) => `- ${i.message}${i.line_index != null ? ` (line ${i.line_index + 1})` : ""}`);
        if (tooClose)
            notes.push(`- Too similar to an existing script (${Math.round(tooClose.jaccard * 100)}% shared phrasing): "${clip(scriptText(existing.find((x) => x.id === tooClose.script_id)?.lines ?? []), 600)}". Rewrite with a different opening, order and wording.`);
        out = await call(`Your previous draft had these problems. Fix every one and return the full corrected script.\n${notes.join("\n")}\n\nPrevious draft:\n${out.lines.map((l, i) => `${i + 1}. [${l.beat}] ${l.text}`).join("\n")}`);
        lines = cleanLines(out, allowed, brand);
        source = "repair";
    }
    else if (flagged.length) {
        const fixed = await repairLines({ brandId, brand, ctx, lines, fails: flagged, refId }).catch((e) => {
            if (e instanceof RunStoppedError)
                throw e;
            return null;
        });
        if (fixed) {
            if (out.hook_variants[0] && out.hook_variants[0].text.trim() === lines[0]?.text.trim())
                out.hook_variants[0] = { ...out.hook_variants[0], text: fixed.lines[0].text };
            lines = fixed.lines;
            source = "repair";
        }
    }
    if (flow && clampVariety(axes.variety) >= 4) {
        const told = dominantPerson(lines.map((l) => l.text).join(" ")).person;
        if (told !== "none")
            axes.person = told;
    }
    const drafted = { lines, hooks: out.hook_variants.slice(0, HOOK_COUNT + 3) };
    let edited = flow ? ({ lines, hooks: drafted.hooks.map((h) => ({ text: h.text, overlay: h.overlay })), issues: [], summary: "", model: "", status: "skipped" } as Awaited<ReturnType<typeof copyPass<ScriptLine, {
        text: string;
        overlay: string;
    }>>>) : await copyPass({ brandId, brand, what: `a ${axes.length} ${axes.native ? "long-copy native ad" : "video ad script"} (${axes.person} person, ${axes.tense} tense, ${axes.register} register)`, context: vars.concept, lines, hooks: drafted.hooks.map((h) => ({ text: h.text, overlay: h.overlay })), refType: "script", refId, productId: subjectOf(brand, concept), surfaces: ["script"], personaIds: persona ? [persona.id] : [] });
    if (edited.status === "edited" && newFails(ruleChecks({ lines, hook_variants: drafted.hooks }, ctx), ruleChecks({ lines: edited.lines, hook_variants: edited.hooks }, ctx)).length) {
        edited = { ...edited, lines, hooks: drafted.hooks.map((h) => ({ text: h.text, overlay: h.overlay })), status: "clean", issues: edited.issues.map((i) => ({ ...i, applied: false, refused: "together the edits broke an audit rule" })) };
    }
    let voiced = flow ? { lines: edited.lines, hooks: edited.hooks, check: skippedVoiceCheck("The edit pass has not run.") } : await voicePass({ brandId, brand, ctx, stage: concept.awareness_stage, lines: edited.lines, hooks: edited.hooks, themeIds, fix: true, refId, personaId: persona?.id });
    lines = voiced.lines;
    const hookTexts = drafted.hooks.map((h, i) => ({ ...h, text: voiced.hooks[i].text, overlay: voiced.hooks[i].overlay }));
    const told = (out as {
        telling?: string;
    }).telling?.trim() ?? "";
    const storyBrief = briefOn ? briefNote((out as {
        brief?: StoryBrief;
    }).brief) : "";
    const line2 = lines.find((l, i) => i > 0)?.text ?? "";
    const judge = () => (!strict ? Promise.resolve([] as AuditItem[]) : auditJudged(brandId, brand, ctx, lines, hookTexts, refId)).catch((e: Error): AuditItem[] => [{ check: "judge", status: "warn", message: `Judgement checks didn't run: ${e.message.slice(0, 120)}` }]);
    const pairsSent = flowVars ? (flowVars.reason.match(/- Doubt: .*\n {3}Its proof: .*/g) ?? []) : [];
    const [firstGrades, firstJudged] = await Promise.all([flow ? Promise.resolve(hookTexts.map(() => NEUTRAL)) : gradeHooks(brandId, brand, concept, hookTexts, line2, refId).catch(() => hookTexts.map(() => NEUTRAL)), judge()]);
    const grades = firstGrades;
    let judged = firstJudged;
    if (flow && llmEnabled()) {
        const editBrief = [
            `Who it is for: ${persona ? `${persona.name}. ${persona.summary} What they live with: ${persona.problem}` : concept.persona_id}`,
            ...((p) => [p?.tried?.length ? `What they tried before: ${p.tried.join("; ")}` : "", p?.notes ? `Also known about them: ${p.notes}` : ""])(persona ? getPersona(brandId, persona.id) : undefined),
            `The idea: ${concept.angle}`,
            `Where they are: ${AWARENESS_INFO[concept.awareness_stage].label}. Who speaks: ${axes.person} person, ${axes.tense} tense.`,
            told ? `How it is told: ${told}` : "",
            storyBrief,
            pairsSent.length ? `The doubts this ad may raise, each with the proof the brand holds for it. A doubt answered with its proof here is answered:\n${pairsSent.join("\n")}` : "",
            `How much of the deal this buyer is told: ${offerSaid === "none" ? "none. No price, deal or guarantee is said" : offerSaid === "one" ? "1 term, once (what it costs to try, or the guarantee), and nothing else of the deal" : "all of it, as talk"}.`,
            offerSaid === "none" ? "" : offerBrief.split("\n").filter((l) => l.startsWith("- ")).join("\n"),
        ]
            .filter(Boolean)
            .join("\n");
        try {
            const res = await editPass({ brandId, brand, lines, brief: editBrief, facts: heldFacts(brandId, brand, concept, subjectOf(brand, concept), lines), opening: COLD_OPENING, person: axes.person, offerSay: axes.no_offer ? "" : offerSay, offerSaid, after: (out as {
                    brief?: StoryBrief;
                }).brief?.after ?? "", stage: concept.awareness_stage, buyerWords: [...(persona?.language ?? []), ...evidence.filter((e) => e.theme.type === "buyer_word").flatMap((e) => [e.theme.label, ...e.quotes.map((q) => q.quote)])], store: factStore(brand, { productId: product?.id, offerId: concept.offer_id, persona, profile: persona ? getPersona(brandId, persona.id) : null, brief: [`The idea of the ad: ${concept.angle}`, axes.asked?.trim() ? `Asked for by the person making it: ${axes.asked.trim()}` : "", ...lessonsFor(brandId, { productId: product?.id, area: "words" }).filter((l) => l.category === "product_use").map((l) => `How the product is opened and used: ${l.rule}`)] }), refId });
            if (res.check.status === "fixed" && newFails(ruleChecks({ lines, hook_variants: hookTexts }, ctx), ruleChecks({ lines: res.lines, hook_variants: hookTexts }, ctx)).length) {
                voiced = { ...voiced, check: { ...res.check, status: "suggested", summary: `${res.check.summary} The changes were not applied because together they broke an audit rule.`, issues: res.check.issues.map((i) => ({ ...i, applied: false })) } };
            }
            else {
                voiced = { ...voiced, check: res.check };
                lines = res.lines;
                if (res.openingChanged && hookTexts[0])
                    hookTexts[0] = { ...hookTexts[0], text: lines[0].text };
            }
        }
        catch (e) {
            if (e instanceof RunStoppedError)
                throw e;
            voiced = { ...voiced, check: skippedVoiceCheck(`The edit pass didn't run: ${(e as Error).message.slice(0, 160)}`) };
        }
    }
    const failing = judged.filter((i) => i.status === "fail");
    let repairNote = "";
    if (failing.length) {
        const fixed = await repairLines({ brandId, brand, ctx, lines, fails: failing, refId }).catch(() => null);
        if (fixed) {
            if (hookTexts[0] && hookTexts[0].text.trim() === lines[0]?.text.trim())
                hookTexts[0] = { ...hookTexts[0], text: fixed.lines[0].text };
            lines = fixed.lines;
            repairNote = fixed.note;
            source = "repair";
            judged = await judge();
        }
    }
    const gradedHooks: HookVariant[] = hookTexts.map((h, i) => ({ id: `hk_${i + 1}`, type: h.type, text: h.text.trim(), overlay: h.overlay.trim(), first_frame: h.first_frame.trim(), grades: grades[i] }));
    const opening = pickOpening(lines, flow ? gradedHooks.slice(0, 1) : gradedHooks, brand.brand.name, { swap: !flow });
    lines = opening.lines;
    const hook_variants = opening.hooks;
    const audit = [...ruleChecks({ lines, hook_variants }, ctx), ...judged, ...(req.altOf ? [] : siblingChecks(lines, [...saved(), ...(seat?.others() ?? [])].map((s) => ({ id: s.id, lines: s.lines }))))];
    audit.push(...opening.audit);
    const sim = req.altOf ? null : mostSimilar(concept.id, lines);
    const id = nextScriptId();
    const row = {
        id,
        brand_id: brandId,
        concept_id: concept.id,
        title: out.title.trim(),
        version: 1,
        axes,
        awareness_stage: concept.awareness_stage,
        format_target: req.format ?? (axes.native ? ("static_long_copy" as const) : null),
        lines,
        hook_variants,
        load_bearing_beat: out.load_bearing_beat,
        audit,
        est_seconds: readSeconds(lines, speaker),
        status: "draft" as const,
        similar_to: sim && sim.jaccard >= SIMILARITY_LIMIT ? sim : null,
        notes: [told ? `Told as: ${told}` : "", ...(dealt ? handNotes(dealt) : []), storyBrief, out.notes.trim(), copyNote(edited), out.placeholders.length ? `Placeholders to fill: ${out.placeholders.join(", ")}` : "", repairNote ? `Compliance repair after the audit: ${repairNote}` : ""].filter(Boolean).join("\n"),
        test_plan: out.test_plan.trim(),
        reference_ids: ref ? [ref.id] : refs.map((r) => r.id),
        hook_variant_of: null,
        theme_ids: [...allowed],
        model: pin ? model : modelOf("script", model),
        reference_mode: mode,
        voice_check: voiced.check,
        alt_of: req.altOf ?? null,
        skills_used: flow ? [...skills.used, ...tasteSkillsUsed(plan)] : skills.used,
    };
    db.transaction((tx) => {
        tx.insert(schema.scripts).values(row).run();
        if (concept.status === "draft")
            tx.update(schema.concepts).set({ status: "scripted" }).where(eq(schema.concepts.id, concept.id)).run();
    });
    logFailures({ brandId, refType: "script", refId: id, productId: subjectOf(brand, concept) }, [
        ...auditPoints(audit),
        ...voicePoints(voiced.check, lessonIds(brandId)),
        ...copyPoints(edited.issues),
    ]);
    if (voiced.check.status === "fixed" || edited.status === "edited") {
        const rawHooks = hook_variants.map((h, i) => ({ ...h, text: (drafted.hooks[i] ?? h).text.trim(), overlay: ((drafted.hooks[i] ?? h).overlay ?? "").trim() }));
        addVersion(brandId, id, 1, source, snapshot({ ...row, lines: drafted.lines, hook_variants: rawHooks, audit: ruleChecks({ lines: drafted.lines, hook_variants: rawHooks }, ctx) }));
        db.update(schema.scripts).set({ version: 2 }).where(eq(schema.scripts.id, id)).run();
        addVersion(brandId, id, 2, "voice", snapshot(row));
    }
    else
        addVersion(brandId, id, 1, source, snapshot(row));
    const wantHooks = clampHooks(axes.hooks);
    if (wantHooks > 1 && llmEnabled()) {
        try {
            const { writeHooks } = await import("./hooks");
            await writeHooks(id, wantHooks - 1);
        }
        catch (e) {
            const now = db.select({ audit: schema.scripts.audit }).from(schema.scripts).where(eq(schema.scripts.id, id)).get();
            db.update(schema.scripts).set({ audit: [...(now?.audit ?? audit).filter((a) => a.check !== "hooks"), { check: "hooks", status: "warn", message: `The ${wantHooks - 1} extra hook${wantHooks === 2 ? " was" : "s were"} not written: ${(e as Error).message.slice(0, 160)} Write them from the script's page.` }] }).where(eq(schema.scripts.id, id)).run();
        }
    }
    await checkSurfacesQuietly(id);
    return id;
}
export interface ScriptEdit {
    title?: string;
    lines: ScriptLine[];
    hook_variants?: HookVariant[];
}
async function voiceReport(script: Pick<ScriptRow, "id" | "brand_id" | "concept_id" | "axes" | "theme_ids" | "reference_mode" | "reference_ids">, lines: ScriptLine[], hooks: HookVariant[]): Promise<VoiceCheck> {
    const brand = writingBrain(script.brand_id, claimChecksOn(script.axes));
    const ctx = auditContext(script.brand_id, brand, script.axes, refUse(script), speakerOfScript(script));
    return (await voicePass({ brandId: script.brand_id, brand, ctx, lines, hooks: hooks.map((h) => ({ text: h.text, overlay: h.overlay ?? "" })), themeIds: script.theme_ids, fix: false, refId: script.id })).check;
}
function heldFacts(brandId: string, brand: BrandBrain, concept: Pick<ConceptRow, "persona_id" | "offer_id" | "angle"> | undefined, productId: string | null | undefined, lines: {
    text: string;
}[]): string[] {
    const profile = concept ? getPersona(brandId, concept.persona_id) : undefined;
    const claims = claimsFor(brand, `${concept?.angle ?? ""} ${lines.map((l) => l.text).join(" ")}`, 10, productId);
    return [...subjectFacts(brand, productId), ...[...claims.core, ...claims.more].map((c) => c.text), ...(profile?.believes ?? [])].filter((x, i, all) => x && all.indexOf(x) === i);
}
async function editReport(script: ScriptRow, lines: ScriptLine[]): Promise<VoiceCheck> {
    const brand = writingBrain(script.brand_id, false);
    const concept = db.select().from(schema.concepts).where(eq(schema.concepts.id, script.concept_id)).get();
    const { hookBrief } = await import("./hooks");
    const res = await editPass({ brandId: script.brand_id, brand, lines, brief: hookBrief(script).brief, facts: heldFacts(script.brand_id, brand, concept, concept ? subjectOf(brand, concept) : null, lines), opening: "", person: script.axes.person, stage: script.awareness_stage, refId: script.id, report: true });
    return res.check;
}
export async function saveScriptEdit(scriptId: string, edit: ScriptEdit, source: "edit" | "voice" = "edit"): Promise<ScriptRow> {
    const script = db.select().from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get();
    if (!script)
        throw new Error(`Script ${scriptId} not found`);
    const has = db.select({ id: schema.scriptVersions.id }).from(schema.scriptVersions).where(eq(schema.scriptVersions.script_id, scriptId)).get();
    if (!has)
        addVersion(script.brand_id, scriptId, script.version, "seed", snapshot(script));
    const lines = edit.lines.map((l) => ({ ...l, text: l.text.trim() })).filter((l) => l.text);
    const hook_variants = edit.hook_variants ?? script.hook_variants;
    const speaker = speakerOfScript(script);
    const [audit, voice_check] = await Promise.all([auditScript(script.brand_id, script.axes, lines, hook_variants, scriptId, refUse(script), speaker), script.axes.flow && source === "edit" && llmEnabled() ? editReport(script, lines).catch((e: Error) => skippedVoiceCheck(`The checks didn't run: ${e.message.slice(0, 160)}`)) : voiceReport(script, lines, hook_variants)]);
    const sim = script.hook_variant_of || script.alt_of ? null : mostSimilar(script.concept_id, lines, scriptId);
    const next = {
        title: edit.title?.trim() || script.title,
        lines,
        hook_variants,
        audit,
        voice_check,
        est_seconds: script.reference_mode === "exact" ? script.est_seconds : readSeconds(lines, speaker),
        version: script.version + 1,
        similar_to: sim && sim.jaccard >= SIMILARITY_LIMIT ? sim : null,
        updated_at: new Date().toISOString(),
    };
    db.update(schema.scripts).set(next).where(eq(schema.scripts.id, scriptId)).run();
    addVersion(script.brand_id, scriptId, next.version, source, snapshot(next));
    return { ...script, ...next };
}
export async function applyVoiceSuggestions(scriptId: string): Promise<ScriptRow> {
    const script = db.select().from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get();
    if (!script)
        throw new Error(`Script ${scriptId} not found`);
    const pending = (script.voice_check?.issues ?? []).filter((i) => !i.applied);
    if (!pending.length)
        throw new Error("There are no voice suggestions to apply.");
    const applied = applyVoiceFixes(script.lines, script.hook_variants, pending);
    if (!applied.issues.some((i) => i.applied))
        throw new Error("None of the suggestions could be applied safely (they would change a number, a placeholder or the length of a line). Edit those lines by hand.");
    return saveScriptEdit(scriptId, { lines: applied.lines, hook_variants: applied.hooks }, "voice");
}
export async function reauditScript(scriptId: string, opts: {
    claimChecks?: boolean;
} = {}): Promise<AuditItem[]> {
    const script = db.select().from(schema.scripts).where(eq(schema.scripts.id, scriptId)).get();
    if (!script)
        throw new Error(`Script ${scriptId} not found`);
    if (opts.claimChecks && !claimChecksOn(script.axes)) {
        script.axes = { ...script.axes, claim_checks: true };
        await ensureGuardrails(script.brand_id);
        db.update(schema.scripts).set({ axes: script.axes }).where(eq(schema.scripts.id, scriptId)).run();
    }
    const [audit, voice_check] = await Promise.all([auditScript(script.brand_id, script.axes, script.lines, script.hook_variants, scriptId, refUse(script), speakerOfScript(script)), voiceReport(script, script.lines, script.hook_variants)]);
    db.update(schema.scripts).set({ audit, voice_check, updated_at: new Date().toISOString() }).where(eq(schema.scripts.id, scriptId)).run();
    return audit;
}
const TransposeOut = z.object({
    lines: z.array(z.object({ index: z.number().int(), text: z.string().min(1), on_screen: z.string(), visual_note: z.string() })).min(1),
    hooks: z.array(z.object({ index: z.number().int(), text: z.string().min(1), overlay: z.string() })),
    notes: z.string(),
});
type TransposeOut = z.infer<typeof TransposeOut>;
export const VOICE_LABEL = (person: string, tense: string) => `${person === "first" ? "1st" : person === "second" ? "2nd" : "3rd"} person, ${tense}`;
export function applyTranspose(lines: ScriptLine[], hooks: HookVariant[], out: TransposeOut): {
    lines: ScriptLine[];
    hooks: HookVariant[];
    kept: number[];
} {
    const kept: number[] = [];
    const next = lines.map((l, i) => {
        const c = out.lines.find((x) => x.index === i);
        if (!c || numbersOf(c.text) !== numbersOf(l.text) || numbersOf(c.on_screen) !== numbersOf(l.on_screen ?? "")) {
            kept.push(i);
            return { ...l };
        }
        return { ...l, text: c.text.trim(), on_screen: c.on_screen.trim(), visual_note: c.visual_note.trim() || l.visual_note };
    });
    const nextHooks = hooks.map((h, i) => {
        const c = out.hooks.find((x) => x.index === i);
        return c && numbersOf(c.text) === numbersOf(h.text) ? { ...h, text: c.text.trim(), overlay: c.overlay.trim() } : { ...h };
    });
    return { lines: next, hooks: nextHooks, kept };
}
export interface TransposeRequest {
    scriptId: string;
    person: ScriptAxes["person"];
    tense: ScriptAxes["tense"];
    model?: string;
}
export async function transposeScript(req: TransposeRequest): Promise<string> {
    const script = db.select().from(schema.scripts).where(eq(schema.scripts.id, req.scriptId)).get();
    if (!script)
        throw new Error(`Script ${req.scriptId} not found`);
    if (script.axes.person === req.person && script.axes.tense === req.tense)
        throw new Error(`This script is already in ${VOICE_LABEL(req.person, req.tense)}.`);
    const brandId = script.brand_id;
    const brand = writingBrain(brandId, claimChecksOn(script.axes));
    const axes: ScriptAxes = { ...script.axes, person: req.person, tense: req.tense };
    const speaker = speakerOfScript(script);
    const ctx = auditContext(brandId, brand, axes, refUse(script), speaker);
    const skills = composeSkill({ start: "transpose" });
    const model = req.model || env.MODEL_SCRIPT;
    const narrator = script.axes.native?.narrator;
    const p = renderPrompt("transpose", {
        brand_name: brand.brand.name,
        skill: skills.text,
        brand_voice: brandVoiceText(brandId, { surfaces: ["script"], brand }),
        lessons: learnedRules(brandId, "edits"),
        forbidden: brand.forbidden_claims.join("; ") || "(none)",
        guardrails: guardrailText(ctx.guardrails),
        speaker: narrator === "founder" ? "the founder, who can speak for how the product is made" : narrator === "customer" ? "a composite of real customers; personal results stay within what customers report" : "not a customer. A 1st-person line must not claim a personal result; keep such lines as what customers report.",
        person: req.person,
        tense: req.tense,
        from_person: script.axes.person,
        from_tense: script.axes.tense,
        title: script.title,
        script: script.lines.map((l, i) => `${i} | ${l.beat} | ${l.text} | ${l.on_screen ?? ""} | ${l.visual_note ?? ""}`).join("\n"),
        hooks: script.hook_variants.map((h, i) => `${i} | ${h.text} | ${h.overlay ?? ""}`).join("\n") || "(none)",
        line_count: String(script.lines.length),
        hook_count: String(script.hook_variants.length),
    });
    const out = await structuredJson({ brandId, task: "transpose", model, system: p.system, user: p.user, schema: TransposeOut, effort: "low", maxTokens: 16000, refType: "script", refId: script.id });
    const applied = applyTranspose(script.lines, script.hook_variants, out);
    if (applied.kept.length === script.lines.length)
        throw new Error("The conversion came back unusable (no line could be matched to the original). Try again.");
    const id = nextScriptId();
    const [audit, voice] = await Promise.all([
        auditScript(brandId, axes, applied.lines, applied.hooks, id, refUse(script), speaker),
        voicePass({ brandId, brand, ctx, stage: script.awareness_stage, lines: applied.lines, hooks: applied.hooks.map((h) => ({ text: h.text, overlay: h.overlay ?? "" })), themeIds: script.theme_ids, fix: false, refId: id }),
    ]);
    const row = {
        id,
        brand_id: brandId,
        concept_id: script.concept_id,
        title: `${script.title} (${VOICE_LABEL(req.person, req.tense)})`.slice(0, 140),
        version: 1,
        axes,
        awareness_stage: script.awareness_stage,
        format_target: script.format_target,
        lines: applied.lines,
        hook_variants: applied.hooks,
        load_bearing_beat: script.load_bearing_beat,
        audit,
        est_seconds: script.est_seconds,
        status: "draft" as const,
        similar_to: null,
        notes: [`Converted from ${script.id} (${VOICE_LABEL(script.axes.person, script.axes.tense)}) to ${VOICE_LABEL(req.person, req.tense)}. Same lines, order, claims and numbers.`, out.notes.trim(), applied.kept.length ? `Kept in the original voice because the conversion changed a number or was missing: line${applied.kept.length === 1 ? "" : "s"} ${applied.kept.map((i) => i + 1).join(", ")}.` : ""].filter(Boolean).join("\n"),
        test_plan: `Tests voice only against ${script.id}: the same argument in ${VOICE_LABEL(req.person, req.tense)}.`,
        reference_ids: script.reference_ids,
        hook_variant_of: null,
        theme_ids: script.theme_ids,
        model,
        reference_mode: script.reference_mode,
        voice_check: voice.check,
        alt_of: script.alt_of ?? script.id,
        skills_used: skills.used,
    };
    db.insert(schema.scripts).values(row).run();
    addVersion(brandId, id, 1, "generated", snapshot(row));
    await checkSurfacesQuietly(id);
    return id;
}
export function scriptVersions(scriptId: string) {
    return db.select().from(schema.scriptVersions).where(eq(schema.scriptVersions.script_id, scriptId)).orderBy(schema.scriptVersions.version).all();
}
export function keepAsHookVariant(scriptId: string, ofScriptId: string | null) {
    db.update(schema.scripts).set({ hook_variant_of: ofScriptId, updated_at: new Date().toISOString() }).where(eq(schema.scripts.id, scriptId)).run();
}
export { auditSummary, scriptWords };
const UploadedOut = z.object({
    title: z.string(),
    person: z.enum(["first", "second", "third"]),
    tense: z.enum(["past", "present", "future"]),
    load_bearing_beat: z.enum(BEATS),
    lines: z.array(z.object({ beat: z.enum(BEATS), text: z.string().min(1), on_screen: z.string().default(""), visual_note: z.string().default("") })).min(1).max(80),
});
const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function splitScriptPlain(text: string): ScriptLine[] {
    const parts = text.split(/\n{2,}|\n(?=[A-Z0-9"“(\[])/).map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => p.length > 1).slice(0, 80);
    return parts.map((p, i): ScriptLine => ({ beat: i === 0 ? "hook" : i === parts.length - 1 && parts.length > 2 ? "cta" : "bridge", text: p, theme_ids: [], claim_ids: [] }));
}
function uploadsConcept(brandId: string, brand: BrandBrain): ConceptRow {
    const NAME = "Your own scripts";
    const existing = db.select().from(schema.concepts).where(and(eq(schema.concepts.brand_id, brandId), eq(schema.concepts.name, NAME))).get();
    if (existing)
        return existing;
    const persona = brand.personas[0];
    const offer = brand.offers[0];
    if (!persona || !offer)
        throw new Error("The brand brain needs at least 1 persona and 1 offer before a script can be filed.");
    const all = db.select({ id: schema.concepts.id }).from(schema.concepts).all();
    const id = `con_${String(Math.max(0, ...all.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
    db.insert(schema.concepts)
        .values({ id, brand_id: brandId, name: NAME, persona_id: persona.id, angle: "Scripts written outside the app and uploaded as they are.", offer_id: offer.id, awareness_stage: "problem_aware", sophistication_stage: brand.market_sophistication_stage, theme_ids: [], desire_evidence_theme_ids: [], differentiator_test: { claim: "", is_proposition: false, unavailable_to_competitors: false, moves_a_stranger: false }, formats_planned: [], status: "scripted", meta_adset_name: `${brandId}_${id}_uploads` })
        .run();
    return db.select().from(schema.concepts).where(eq(schema.concepts.id, id)).get()!;
}
export function fileHookScript(req: {
    brandId: string;
    title: string;
    spoken: string;
    onScreen: string;
    visual: string;
    notes: string;
}): string {
    const brand = writingBrain(req.brandId);
    const concept = uploadsConcept(req.brandId, brand);
    const lines: ScriptLine[] = [{ beat: "hook", text: req.spoken.trim(), theme_ids: [], claim_ids: [], ...(req.visual.trim() ? { visual_note: req.visual.trim() } : {}), ...(req.onScreen.trim() ? { on_screen: req.onScreen.trim() } : {}) }];
    const seconds = readSeconds(lines, speakerAge(req.brandId, concept.persona_id));
    const hook_variants: HookVariant[] = [{ id: "hk_1", type: "uploaded", text: lines[0].text, overlay: lines[0].on_screen ?? "", grades: NEUTRAL }];
    const id = nextScriptId();
    const row = {
        id,
        brand_id: req.brandId,
        concept_id: concept.id,
        title: req.title.slice(0, 120),
        version: 1,
        axes: { length: nearestLength(seconds), person: "second", tense: "present", entry: "trigger_moment", story_shape: "uploaded", register: "as written" } as ScriptAxes,
        awareness_stage: concept.awareness_stage,
        format_target: null,
        lines,
        hook_variants,
        load_bearing_beat: "hook" as const,
        audit: [],
        est_seconds: seconds,
        status: "draft" as const,
        similar_to: null,
        notes: req.notes,
        test_plan: "",
        reference_ids: [],
        hook_variant_of: null,
        theme_ids: [],
        model: null,
        reference_mode: "exact" as const,
        voice_check: null,
        alt_of: null,
        skills_used: [],
    };
    db.insert(schema.scripts).values(row).run();
    addVersion(req.brandId, id, 1, "generated", snapshot(row));
    return id;
}
export interface ImportScript {
    brandId: string;
    conceptId?: string | null;
    text: string;
    fileName: string;
}
export async function importScript(req: ImportScript): Promise<string> {
    const brand = writingBrain(req.brandId);
    const concept = req.conceptId ? db.select().from(schema.concepts).where(and(eq(schema.concepts.id, req.conceptId), eq(schema.concepts.brand_id, req.brandId))).get() : uploadsConcept(req.brandId, brand);
    if (!concept)
        throw new Error("That concept wasn't found for this brand.");
    const source = req.text.trim();
    let lines: ScriptLine[] = splitScriptPlain(source);
    let title = req.fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim() || "Uploaded script";
    let person: ScriptAxes["person"] = "second";
    let tense: ScriptAxes["tense"] = "present";
    let loadBearing: (typeof BEATS)[number] = "hook";
    let how = "split by paragraph";
    if (llmEnabled()) {
        try {
            const out = await structuredJson({
                brandId: req.brandId,
                task: "script_import",
                model: env.MODEL_SCRIPT,
                system: `You file an advertiser's own ad script into an app. You do not write or improve anything.

Split the script into lines and say what job each line does. Rules:
- Every word of the spoken or written ad copy is kept exactly as it is: same words, same order, same spelling and punctuation. Never fix, shorten, merge away or add a word.
- 1 line is 1 thought as it would be said in one go: usually 1 to 3 sentences. Keep the script's own paragraph or row breaks where it has them.
- "text" is the words the audience hears or reads. If the document has no spoken words for a row but has on-screen text, put that on-screen text in "text".
- "on_screen" is text the script says appears on screen for that line (overlay, super, caption), exactly as written. Empty if none.
- "visual_note" is the script's own direction for the picture on that line (shot, action, b-roll), in its words. Empty if none.
- Leave out things that are not the ad: the title, the brand brief, notes to the editor that belong to no line, timings on their own, speaker labels ("VO:", "HOST:").
- beat is 1 of: ${BEATS.join(", ")}. hook is the opening. bridge is a transition that fits nothing else.
- load_bearing_beat is the beat the ad's argument rests on.
- person is who the copy speaks as or to: first (I/we), second (you), third (he/she/they). tense is the main tense.
- title: the script's own title if it has one, else 3 to 6 words naming it.`,
                user: `File name: ${req.fileName}\n\nThe script:\n${source}`,
                schema: UploadedOut,
                effort: "low",
                maxTokens: 16000,
                refType: "script",
                refId: concept.id,
            });
            const hay = squash(source);
            const unchanged = out.lines.every((l) => hay.includes(squash(l.text)) && (!l.on_screen || hay.includes(squash(l.on_screen))));
            const kept = out.lines.reduce((n, l) => n + squash(l.text).length + squash(l.on_screen).length + squash(l.visual_note).length, 0);
            if (unchanged && kept >= hay.length * 0.6) {
                lines = out.lines.map((l): ScriptLine => ({ beat: l.beat, text: l.text.trim(), theme_ids: [], claim_ids: [], ...(l.on_screen.trim() ? { on_screen: l.on_screen.trim() } : {}), ...(l.visual_note.trim() ? { visual_note: l.visual_note.trim() } : {}) }));
                title = out.title.trim() || title;
                person = out.person;
                tense = out.tense;
                loadBearing = out.load_bearing_beat;
                how = `sorted into ${lines.length} lines by ${env.MODEL_SCRIPT}, every word checked against your file`;
            }
            else
                how = unchanged ? "split by paragraph (the model's split left too much of the script out)" : "split by paragraph (the model's split changed some words, so it was discarded)";
        }
        catch (e) {
            how = `split by paragraph (the sorting step didn't run: ${(e as Error).message.slice(0, 100)})`;
        }
    }
    if (!lines.length)
        throw new Error("No script lines could be read from that file.");
    const speaker = speakerAge(req.brandId, concept.persona_id);
    const seconds = readSeconds(lines, speaker);
    const axes: ScriptAxes = { length: nearestLength(seconds), person, tense, entry: "trigger_moment", story_shape: "uploaded", register: "as written" };
    const ctx = auditContext(req.brandId, brand, axes, { mode: "exact" }, speaker);
    const refId = `${concept.id}:${randomBytes(3).toString("hex")}`;
    const hooks = [{ text: lines[0].text, overlay: lines[0].on_screen ?? "" }];
    const [judged, voice] = await Promise.all([
        llmEnabled() ? auditJudged(req.brandId, brand, ctx, lines, hooks, refId).catch((e: Error): AuditItem[] => [{ check: "judge", status: "warn", message: `Judgement checks didn't run: ${e.message.slice(0, 120)}` }]) : Promise.resolve([] as AuditItem[]),
        voicePass({ brandId: req.brandId, brand, ctx, stage: concept.awareness_stage, lines, hooks, themeIds: concept.theme_ids, fix: false, refId }),
    ]);
    const hook_variants: HookVariant[] = [{ id: "hk_1", type: "uploaded", text: hooks[0].text, overlay: hooks[0].overlay, grades: NEUTRAL }];
    const audit: AuditItem[] = [...auditDeterministic({ lines, hook_variants }, ctx), ...judged.filter((i) => ["implied_forbidden", "implied_guardrail", "proof_strength", "personal_attributes", "judge"].includes(i.check))];
    const id = nextScriptId();
    const row = {
        id,
        brand_id: req.brandId,
        concept_id: concept.id,
        title: title.slice(0, 120),
        version: 1,
        axes,
        awareness_stage: concept.awareness_stage,
        format_target: null,
        lines,
        hook_variants,
        load_bearing_beat: loadBearing,
        audit,
        est_seconds: seconds,
        status: "draft" as const,
        similar_to: null,
        notes: `Your own script, uploaded as ${req.fileName}: ${how}. Nothing was rewritten. The checks below report on it; they change nothing.`,
        test_plan: "",
        reference_ids: [],
        hook_variant_of: null,
        theme_ids: [],
        model: null,
        reference_mode: "exact" as const,
        voice_check: voice.check,
        alt_of: null,
        skills_used: [],
    };
    db.transaction((tx) => {
        tx.insert(schema.scripts).values(row).run();
    });
    addVersion(req.brandId, id, 1, "generated", snapshot(row));
    await checkSurfacesQuietly(id);
    return id;
}
