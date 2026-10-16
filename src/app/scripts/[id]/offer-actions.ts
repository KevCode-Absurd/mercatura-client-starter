"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import type { ScriptAxes } from "@/db/schema";
import { activeBrandId } from "@/lib/brand-context";
import { brandCode } from "@/lib/brand-brain";
import { loadBrandBrain } from "@/lib/brands";
import type { ScriptKit } from "@/lib/builder/types";
import { enqueue } from "@/lib/jobs/queue";
import { llmEnabled } from "@/lib/llm/gateway";
import { adsetName } from "@/lib/naming";
import { bookOffer } from "@/lib/offers/book";
import { getSetting } from "@/lib/settings";
import { AWARENESS_INFO } from "@/lib/taxonomy";
import { errorText } from "@/lib/plain-message";
type Result<T = object> = ({
    ok: true;
} & T) | {
    ok: false;
    error: string;
};
function conceptWithOffer(brandId: string, from: typeof schema.concepts.$inferSelect, offerId: string): string {
    if (from.offer_id === offerId)
        return from.id;
    const all = db.select().from(schema.concepts).where(eq(schema.concepts.brand_id, brandId)).all();
    const same = all.find((c) => c.offer_id === offerId && c.persona_id === from.persona_id && c.angle === from.angle && c.awareness_stage === from.awareness_stage && c.sophistication_stage === from.sophistication_stage && (c.product_id ?? null) === (from.product_id ?? null));
    if (same)
        return same.id;
    const ids = db.select({ id: schema.concepts.id }).from(schema.concepts).all();
    const id = `con_${String(Math.max(0, ...ids.map((x) => Number(x.id.match(/\d+$/)?.[0] ?? 0))) + 1).padStart(3, "0")}`;
    const brand = loadBrandBrain(brandId);
    db.insert(schema.concepts)
        .values({
        id,
        brand_id: brandId,
        name: from.name,
        persona_id: from.persona_id,
        angle: from.angle,
        offer_id: offerId,
        product_id: from.product_id,
        awareness_stage: from.awareness_stage,
        sophistication_stage: from.sophistication_stage,
        theme_ids: from.theme_ids,
        desire_evidence_theme_ids: from.desire_evidence_theme_ids,
        differentiator_test: from.differentiator_test,
        formats_planned: [],
        status: "draft",
        meta_adset_name: adsetName(getSetting(brandId, "naming").adset, { brandCode: brandCode(brand), conceptId: id, personaId: from.persona_id, conceptName: from.name, offerId, awarenessCode: AWARENESS_INFO[from.awareness_stage].code }),
        parent_concept_id: from.id,
    })
        .run();
    return id;
}
export async function rewriteWithOfferAction(scriptId: string, offerId: string): Promise<Result<{
    offer: string;
}>> {
    try {
        const brandId = await activeBrandId();
        const script = db.select().from(schema.scripts).where(and(eq(schema.scripts.id, scriptId), eq(schema.scripts.brand_id, brandId))).get();
        if (!script)
            return { ok: false, error: "Script not found" };
        if (!llmEnabled())
            return { ok: false, error: "Writing a script needs live mode (LLM_MODE=live and an API key in .env)." };
        if (script.reference_mode === "exact")
            return { ok: false, error: "This script keeps the words of its reference ad, so its offer is the one that ad states." };
        const concept = db.select().from(schema.concepts).where(eq(schema.concepts.id, script.concept_id)).get();
        if (!concept)
            return { ok: false, error: "The concept of this script is gone, so it can't be written again." };
        const offer = bookOffer(brandId, offerId);
        if (!offer)
            return { ok: false, error: "That offer is not in use any more." };
        if (!script.axes.no_offer && offer.id === bookOffer(brandId, concept.offer_id)?.id)
            return { ok: false, error: "The script already states this offer." };
        const conceptId = conceptWithOffer(brandId, concept, offer.id);
        const { no_offer: _none, ...axes } = script.axes;
        const old = script.kit as ScriptKit | null;
        const kit: ScriptKit | undefined = old
            ? { run: old.run, ...(old.product ? { product: old.product } : {}), angle: old.angle, offer: offer.name, format: old.format, want: { primary_text: old.want.primary_text, image_prompts: false, ...(old.want.texts ? { texts: old.want.texts } : {}) }, ...(old.asked ? { asked: old.asked } : {}), ...(old.variety ? { variety: old.variety } : {}), ...(old.taste ? { taste: old.taste } : {}) }
            : script.axes.flow
                ? { run: "", angle: "", offer: offer.name, format: (script.format_target ?? "video").replace(/_/g, " "), want: { primary_text: true, image_prompts: false } }
                : undefined;
        enqueue(brandId, "script", conceptId, { axes: axes as ScriptAxes, themeIds: script.theme_ids, turn: 0, referenceId: script.reference_mode ? script.reference_ids[0] : undefined, referenceMode: script.reference_mode ?? undefined, altOf: script.alt_of ?? script.id, format: script.format_target ?? undefined, ...(kit ? { kit } : {}) });
        revalidatePath(`/scripts/${scriptId}`);
        revalidatePath("/scripts");
        return { ok: true, offer: offer.name };
    }
    catch (e) {
        return { ok: false, error: errorText(e) };
    }
}
