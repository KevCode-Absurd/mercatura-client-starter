import type { ConceptRow } from "@/db/schema";
import { productFacts, terms } from "../brain/on-camera";
import type { BrandBrain } from "../brand-brain";
import { brandPack, onlySections, withoutSections, type ContextLevel } from "../llm/context";
import { contextLevel } from "../llm/routing";
import { activeGuardrails } from "../scripts/guardrails";
import { contextFor, type CreativeKit, type StepContext } from "./kit";
import { creativeBriefText } from "../creative-brief";
import { getCreativeBrief } from "../creative-brief-store";
export interface SkillParts {
    skill: string;
    playbook: string;
    patterns: string;
}
export interface ScriptAdBrand {
    copy: StepContext;
    voice: {
        level?: "focused" | "minimal";
    };
    skills: (parts: SkillParts) => SkillParts;
}
export function cutCopySkill(level: ContextLevel, parts: SkillParts): SkillParts {
    let { skill, playbook, patterns } = parts;
    if (level !== "full") {
        skill = withoutSections(skill, /^(Reference files|Match effort to the ask|What this skill produces|Inputs|Carousels|Variants|Output format|Ad \[n\]|Worked example)/i);
        patterns = withoutSections(patterns, /^What this is and how to use it/i);
        playbook = withoutSections(playbook, /^(2\. Read the numbers|4\. Writing prompts)/i);
    }
    if (level === "minimal") {
        skill = onlySections(skill, /^(How image ads differ|Non-negotiable rules|Workflow)/i);
        playbook = onlySections(playbook, /^3\. What Meta/i);
        patterns = onlySections(patterns, /^(Layout archetypes|Patterns by awareness stage|Do not transfer)/i);
    }
    return { skill: skill || "(image-ad-copy skill not installed)", playbook: playbook || "(not installed)", patterns: patterns || "(not installed)" };
}
export function scriptAdBrand(l: {
    job: {
        brand_id: string;
    };
    p: {
        product_id: string | null;
    };
    brand: BrandBrain;
    kit: CreativeKit;
    concept: ConceptRow;
    script: {
        title: string;
    };
    claims: boolean;
}): ScriptAdBrand {
    const level = contextLevel("image_plan");
    const skills = (parts: SkillParts) => cutCopySkill(level, parts);
    const args = { brandId: l.job.brand_id, brand: l.brand, kit: l.kit, concept: l.concept, productId: l.p.product_id };
    if (level === "full")
        return { copy: contextFor("copy", args), voice: {}, skills };
    const product = l.brand.products.find((p) => p.id === l.p.product_id) ?? l.brand.products[0];
    const offerId = l.concept.offer_id && l.brand.offers.some((o) => o.id === l.concept.offer_id) ? l.concept.offer_id : null;
    const pack = brandPack(l.brand, level, { productId: product?.id ?? null, personaIds: l.concept.persona_id ? [l.concept.persona_id] : [], offerId, about: `${l.concept.angle} ${l.script.title}` });
    const rules = l.claims ? activeGuardrails(l.job.brand_id).filter((g) => g.guardrail.applies).map((g) => g.guardrail.rule) : [];
    const facts = productFacts(l.job.brand_id, product?.name);
    const policy = terms(l.job.brand_id);
    const data: Record<string, unknown> = { ...pack.stable, ...pack.own, ...(rules.length ? { guardrails: rules } : {}), sophistication_stage: l.concept.sophistication_stage, ...(facts ? { product_facts: facts } : {}), ...(policy ? { terms: policy } : {}) };
    const brief = creativeBriefText(getCreativeBrief(l.job.brand_id, l.concept.id));
    if (brief)
        data.creative_brief = brief;
    const fields = Object.keys(data).filter((k) => data[k] != null && data[k] !== "" && !(Array.isArray(data[k]) && !(data[k] as unknown[]).length));
    return { copy: { data, fields }, voice: { level }, skills };
}
