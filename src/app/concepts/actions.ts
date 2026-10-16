"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { activeBrandId } from "@/lib/brand-context";
import { brandCode } from "@/lib/brand-brain";
import { loadBrandBrain } from "@/lib/brands";
import { suggestConcepts, type ConceptProposal } from "@/lib/concept-suggest";
import { parseTaste } from "@/lib/taste/schema";
import { ConceptInput, desireEvidenceProblems } from "@/lib/concepts";
import { llmEnabled } from "@/lib/llm/gateway";
import { adsetName } from "@/lib/naming";
import { getSetting } from "@/lib/settings";
import { AWARENESS_INFO, isBrandSource } from "@/lib/taxonomy";
import { errorText } from "@/lib/plain-message";
import { z } from "zod";
import { DIRECTION_IDS, type ExplorationMix } from "@/lib/creative/exploration";
export async function saveConceptAction(input: ConceptInput): Promise<{
    ok: true;
    id: string;
} | {
    ok: false;
    errors: string[];
}> {
    const parsed = ConceptInput.safeParse(input);
    if (!parsed.success)
        return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
    const c = parsed.data;
    const brandId = await activeBrandId();
    if (c.id) {
        const existing = db.select().from(schema.concepts).where(and(eq(schema.concepts.id, c.id), eq(schema.concepts.brand_id, brandId))).get();
        if (!existing)
            return { ok: false, errors: ["Concept not found for this brand."] };
        const guided = db.select().from(schema.conceptBriefs).where(eq(schema.conceptBriefs.concept_id, c.id)).get();
        if (guided)
            return { ok: false, errors: ["Edit guided concepts from their brief card. Existing variant inputs are kept for their scripts."] };
    }
    const themes = db.select({ id: schema.themes.id, type: schema.themes.type, sources: schema.themes.source_types }).from(schema.themes).where(eq(schema.themes.brand_id, brandId)).all();
    const typeOf = new Map(themes.map((t) => [t.id, t.type]));
    const desireProblems = desireEvidenceProblems(c.desire_evidence_theme_ids, (id) => typeOf.get(id));
    if (desireProblems.length)
        return { ok: false, errors: desireProblems };
    const brandOnly = c.desire_evidence_theme_ids.filter((id) => {
        const s = themes.find((t) => t.id === id)?.sources ?? [];
        return s.length > 0 && s.every(isBrandSource);
    });
    if (brandOnly.length === c.desire_evidence_theme_ids.length)
        return { ok: false, errors: ["The evidence of desire rests on the founder's account only. It has to include something customers said."] };
    const brand = loadBrandBrain(brandId);
    if (!brand.personas.some((p) => p.id === c.persona_id))
        return { ok: false, errors: ["Unknown persona"] };
    if (!brand.offers.some((o) => o.id === c.offer_id))
        return { ok: false, errors: ["Unknown offer"] };
    const all = db.select({ id: schema.concepts.id }).from(schema.concepts).all();
    const id = c.id ?? `con_${String(Math.max(0, ...all.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
    const meta_adset_name = adsetName(getSetting(brandId, "naming").adset, {
        brandCode: brandCode(brand),
        conceptId: id,
        personaId: c.persona_id,
        conceptName: c.name,
        offerId: c.offer_id,
        awarenessCode: AWARENESS_INFO[c.awareness_stage].code,
    });
    const row = {
        name: c.name,
        persona_id: c.persona_id,
        angle: c.angle,
        offer_id: c.offer_id,
        awareness_stage: c.awareness_stage,
        sophistication_stage: c.sophistication_stage,
        theme_ids: [...new Set([...c.theme_ids, ...c.desire_evidence_theme_ids])],
        desire_evidence_theme_ids: c.desire_evidence_theme_ids,
        differentiator_test: c.differentiator_test,
        formats_planned: c.formats_planned,
        status: c.status,
        meta_adset_name,
        parent_concept_id: c.parent_concept_id,
        updated_at: new Date().toISOString(),
    };
    if (c.id)
        db.update(schema.concepts).set(row).where(and(eq(schema.concepts.id, c.id), eq(schema.concepts.brand_id, brandId))).run();
    else
        db.insert(schema.concepts).values({ id, brand_id: brandId, ...row }).run();
    revalidatePath("/concepts");
    revalidatePath("/");
    return { ok: true, id };
}
export async function suggestConceptsAction(taste?: unknown, mix?: ExplorationMix): Promise<{
    ok: true;
    proposals: ConceptProposal[];
} | {
    ok: false;
    error: string;
}> {
    try {
        const selected = mix === undefined ? undefined : z.partialRecord(z.enum(DIRECTION_IDS), z.number().int().min(0).max(4)).parse(mix);
        if (!llmEnabled())
            return { ok: false, error: "Suggestions need live mode (LLM_MODE=live and an API key in .env)." };
        return { ok: true, proposals: await suggestConcepts(await activeBrandId(), 5, parseTaste(taste), selected) };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
export async function deleteConceptAction(id: string): Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
}> {
    const brandId = await activeBrandId();
    const c = db.select().from(schema.concepts).where(eq(schema.concepts.id, id)).get();
    if (!c || c.brand_id !== brandId)
        return { ok: false, error: "Concept not found." };
    const scripts = db.select({ id: schema.scripts.id }).from(schema.scripts).where(eq(schema.scripts.concept_id, id)).all().length;
    if (scripts)
        return { ok: false, error: `${scripts} script${scripts === 1 ? " is" : "s are"} written from this concept. Delete ${scripts === 1 ? "it" : "them"} first, or set the concept to paused.` };
    const variants = db.select({ id: schema.concepts.id }).from(schema.concepts).where(eq(schema.concepts.parent_concept_id, id)).all();
    db.transaction((tx) => {
        for (const v of variants)
            tx.update(schema.concepts).set({ parent_concept_id: null }).where(eq(schema.concepts.id, v.id)).run();
        tx.delete(schema.jobs).where(eq(schema.jobs.ref_id, id)).run();
        tx.delete(schema.concepts).where(eq(schema.concepts.id, id)).run();
    });
    revalidatePath("/concepts");
    revalidatePath("/");
    return { ok: true };
}
