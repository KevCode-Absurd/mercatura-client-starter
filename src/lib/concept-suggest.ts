import { eq } from "drizzle-orm";
import { tasteBlock } from "./taste/apply";
import { decide } from "./taste/decisions";
import type { ContextPlan, Taste } from "./taste/types";
import { voiceBasics, voiceForPlan } from "./taste/voice";
import { learnedRules } from "./lessons";
import { z } from "zod";
import { db, schema } from "@/db";
import { loadBrandBrain } from "./brands";
import { DESIRE_EVIDENCE_TYPES } from "./concepts";
import { env } from "./env";
import { brandPack } from "./llm/context";
import { contextLevel } from "./llm/routing";
import { callStructured } from "./llm/gateway";
import { renderPrompt } from "./prompts";
import { rankThemes } from "./ranking";
import { getSetting } from "./settings";
import { AWARENESS_STAGES, isBrandSource } from "./taxonomy";
import { explorationForBrand } from "./creative/exploration-data";
import { DIRECTION_IDS, explorationBrief, explorationSelection, type DirectionId, type ExplorationMix } from "./creative/exploration";
import { creativeMethodBrief } from "./creative/methods";
import { readEvidence } from "./standalone/store";
import { buildEvidencePacket, writingAuthority } from "./standalone/evidence";
const TOP_THEMES = 60;
const SuggestOut = z.object({
    concepts: z.array(z.object({
        name: z.string(),
        persona_id: z.string(),
        angle: z.string(),
        offer_id: z.string(),
        awareness_stage: z.enum(AWARENESS_STAGES),
        sophistication_stage: z.number().int().min(1).max(5),
        theme_ids: z.array(z.string()),
        desire_evidence_theme_ids: z.array(z.string()),
        claim: z.string(),
        is_proposition: z.boolean(),
        unavailable_to_competitors: z.boolean(),
        moves_a_stranger: z.boolean(),
        rationale: z.string(),
        new_persona_note: z.string(),
        direction_id: z.enum(DIRECTION_IDS).optional(),
    })),
});
export interface ConceptProposal {
    name: string;
    persona_id: string;
    angle: string;
    offer_id: string;
    awareness_stage: (typeof AWARENESS_STAGES)[number];
    sophistication_stage: number;
    theme_ids: string[];
    desire_evidence_theme_ids: string[];
    differentiator_test: {
        claim: string;
        is_proposition: boolean;
        unavailable_to_competitors: boolean;
        moves_a_stranger: boolean;
    };
    rationale: string;
    new_persona_note: string;
    direction_id?: DirectionId;
}
export const suggestPlan = (taste: Taste | null | undefined, hasBrandRefs = true): ContextPlan => decide({ surface: "script", hasReference: false, hasBrandRefs }, { look: taste?.look });
export async function suggestConcepts(brandId: string, count = 5, taste: Taste | null = null, mix?: ExplorationMix): Promise<ConceptProposal[]> {
    const brand = loadBrandBrain(brandId);
    const selected = mix ? explorationSelection(explorationForBrand(brandId), mix) : null;
    if (selected)
        count = selected.reduce((n, s) => n + s.count, 0);
    const themes = rankThemes(db.select().from(schema.themes).where(eq(schema.themes.brand_id, brandId)).all(), getSetting(brandId, "rank_weights"));
    if (!themes.length)
        throw new Error("No themes yet. Import and extract research first.");
    const top = new Map(themes.slice(0, TOP_THEMES).map((t) => [t.id, t]));
    for (const type of DESIRE_EVIDENCE_TYPES)
        for (const t of themes.filter((x) => x.type === type).slice(0, 8))
            top.set(t.id, t);
    for (const id of selected?.flatMap((s) => s.direction.evidence.map((e) => e.themeId)) ?? []) {
        const theme = themes.find((t) => t.id === id);
        if (theme)
            top.set(theme.id, theme);
    }
    const offered = [...top.values()].sort((a, b) => a.rank - b.rank);
    const existing = db.select().from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all();
    const plan = suggestPlan(taste);
    const records = readEvidence(brandId);
    const packets = records.length ? brand.products.map(product => buildEvidencePacket({ productId: product.id, market: brand.brand.market }, records.filter(record => record.productIds.includes(product.id) && record.markets.includes(brand.brand.market)))) : [];
    const offerAliases = new Map(brand.offers.map((offer, index) => [`offer_link_${index + 1}`, offer.id]));
    const boundBrandContext = packets.length ? {
        brand: { name: brand.brand.name, market: brand.brand.market, currency: brand.brand.currency, category: brand.brand.category },
        products: brand.products.map(product => ({ id: product.id, name: product.name })),
        personas: brand.personas,
        persona_status: "Planning hypotheses and buyer language, not verified product outcomes, quotations or current commercial terms.",
        offers: [...offerAliases.keys()].map((id, index) => ({ id, name: `Planning linkage ${index + 1}`, terms_status: "Unapproved legacy linkage only. No price, discount, subscription or other terms are authorized by this ID." })),
        product_authority: packets.map(packet => ({ scope: packet.scope, ...writingAuthority(packet) })),
        forbidden_claims: brand.forbidden_claims,
        market_sophistication_stage: brand.market_sophistication_stage,
    } : null;
    const selectedBrief = selected && packets.length ? selected.map(item => item.direction.id === "demonstration" ? { ...item, direction: { ...item.direction, basis: "Explain only an eligible feature from the product-bound authority and full source packet below. Legacy product descriptions do not establish a feature or result." } } : item) : selected;
    const choices = tasteBlock({ ...plan, notes: plan.notes.slice(0, 1), skillPath: plan.skillPath.slice(0, 1) });
    const p = renderPrompt("concept-suggest", {
        brand_name: brand.brand.name,
        taste: choices ? `The choice made for these concepts:\n${choices}` : "",
        brand_voice: packets.length ? voiceBasics(brand, []) : voiceForPlan(brandId, plan, { surfaces: ["headline"], brand }),
        lessons: learnedRules(brandId, "writes"),
        brand_brain: JSON.stringify(boundBrandContext ?? (contextLevel("concept_suggest") === "full" ? brand : Object.assign({}, ...Object.values(brandPack(brand, "focused", { about: offered.slice(0, 12).map((t) => t.label).join(" ") }))))),
        existing: existing.length ? packets.length
            ? `Planning history only; names and angle prose are omitted because they do not authorize product or commercial claims.\n${JSON.stringify(existing.map(c => ({ id: c.id, persona_id: c.persona_id, product_id: c.product_id, awareness_stage: c.awareness_stage, theme_ids: c.theme_ids, formats_planned: c.formats_planned })))}`
            : existing.map((c) => `- ${c.name} (${c.persona_id}, ${c.awareness_stage}): ${c.angle}`).join("\n") : "(none)",
        themes: offered.map((t) => `${t.id} | ${t.type} | ${t.score} | ${t.frequency} | ${t.label} | ${t.summary}`).join("\n"),
        count: String(count),
        creative_methods: creativeMethodBrief(),
        exploration: [selectedBrief ? explorationBrief(selectedBrief) : "No argument mix was chosen. Vary arguments and awareness only where the evidence supports them.",
            ...(packets.length ? ["Only eligible scoped product_authority records authorize factual and commercial wording. Full records below retain exact passages, scope and qualifiers. Ineligible records explain gaps; never use them as proof.", JSON.stringify(packets)] : [])].join("\n"),
    });
    if (packets.length)
        p.system += "\nBOUND-REGISTER AUTHORITY: Only eligible product_authority and its full bound source records authorize product facts, ingredient counts, results or commercial terms, within their exact product/market/variant scope and qualifiers. Legacy offer IDs are planning linkage only; never infer terms from their ID or any historical name. No legacy offer price, first-subscription price, discount or guarantee may be used unless an eligible bound offer explicitly supplies it. A customer's quoted price, spend or comparison describes that person's context; never turn it into this brand's price, savings or matched comparison. Research, existing concepts, persona language and voice examples do not approve product claims. Never synthesize a first-person customer purchase, use, result or testimonial; a genuine supplied passage may be quoted only exactly with its original attribution and limits. Label invented scenes as illustrative. If proof is absent, narrow the argument to eligible facts instead of inventing an offer or outcome.";
    if (packets.length)
        p.system += "\nReturn offer_id using only a prompt-local offer_link_* ID from offers. These opaque IDs provide no commercial meaning. For a product with no eligible bound offer, override naming rule 8: name only its buyer situation and supported argument. Omit commercial descriptors from name, angle and claim, including monthly, subscription, first-order, trial, bundle, savings or discount unless an eligible product-scoped offer explicitly authorizes that exact descriptor. Do not fill an absent offer with a commercial assumption.";
    const res = await callStructured({ brandId, task: "concept_suggest", model: env.MODEL_SCRIPT, system: p.system, user: p.user, schema: SuggestOut, effort: "medium", maxTokens: 8000, temperature: plan.temperature, refType: "brand", refId: brandId });
    const typeOf = new Map(themes.map((t) => [t.id, t.type]));
    const proposals: ConceptProposal[] = [];
    const remaining = new Map(selected?.map((s) => [s.direction.id, s.count]));
    for (const c of res.data.concepts) {
        if (proposals.length >= count)
            break;
        if (selected && (!c.direction_id || !(remaining.get(c.direction_id) ?? 0)))
            continue;
        const offerId = packets.length ? offerAliases.get(c.offer_id) : c.offer_id;
        if (!brand.personas.some((x) => x.id === c.persona_id) || !offerId || !brand.offers.some((x) => x.id === offerId))
            continue;
        const desire = [...new Set(c.desire_evidence_theme_ids)].filter((id) => {
            const theme = themes.find((t) => t.id === id);
            return theme && DESIRE_EVIDENCE_TYPES.includes(theme.type) && theme.source_types.some((s) => !isBrandSource(s));
        });
        if (!desire.length)
            continue;
        proposals.push({
            name: c.name.trim(),
            persona_id: c.persona_id,
            angle: c.angle.trim(),
            offer_id: offerId,
            awareness_stage: c.awareness_stage,
            sophistication_stage: c.sophistication_stage,
            theme_ids: [...new Set([...c.theme_ids, ...desire])].filter((id) => typeOf.has(id)),
            desire_evidence_theme_ids: desire,
            differentiator_test: { claim: c.claim.trim(), is_proposition: c.is_proposition, unavailable_to_competitors: c.unavailable_to_competitors, moves_a_stranger: c.moves_a_stranger },
            rationale: c.rationale.trim(),
            new_persona_note: c.new_persona_note.trim(),
            ...(selected && c.direction_id ? { direction_id: c.direction_id } : {}),
        });
        if (selected && c.direction_id)
            remaining.set(c.direction_id, remaining.get(c.direction_id)! - 1);
    }
    return proposals;
}
