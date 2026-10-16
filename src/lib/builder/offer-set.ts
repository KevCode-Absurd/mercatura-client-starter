import { z } from "zod";
import { brandVoiceText } from "../brand-voice";
import { loadBrandBrain } from "../brands";
import { env } from "../env";
import { learnedRules } from "../lessons";
import { llmEnabled } from "../llm/gateway";
import { structuredJson } from "../llm/structured";
import { brandLines } from "../offers/build";
import { listPersonas } from "../personas/store";
import { renderPrompt } from "../prompts";
import { skillFor } from "../skills/card";
import { AWARENESS_STAGES } from "../taxonomy";
import { listOfferFits, saveSimpleOffer } from "./store";
const Out = z.object({
    offers: z
        .array(z.object({
        name: z.string().min(2).max(80),
        say: z.string().min(8).max(400),
        terms: z.string().min(8).max(600),
        price: z.number().finite().min(0),
        persona_ids: z.array(z.string()).default([]),
        stages: z.array(z.string()).default([]),
        running: z.boolean().default(false),
        restates: z.string().default(""),
        needs: z.string().default(""),
        why: z.string().default(""),
    }))
        .min(1)
        .max(16),
});
export interface OfferSetResult {
    made: number;
    note: string;
}
export async function buildOfferSet(brandId: string, opts: {
    count?: number;
    notes?: string;
} = {}): Promise<OfferSetResult> {
    if (!llmEnabled())
        throw new Error("Writing offers needs live mode.");
    const brand = loadBrandBrain(brandId);
    const profiles = listPersonas(brandId);
    const have = listOfferFits(brandId);
    const count = Math.max(1, Math.min(14, opts.count ?? 12));
    const named = have.map((f) => brand.offers.find((o) => o.id === f.offer_id)?.name).filter(Boolean);
    const p = renderPrompt("offer-set", {
        brand_name: brand.brand.name,
        skill: skillFor("offer-set"),
        brand: brandLines(brand, null),
        brand_voice: brandVoiceText(brandId, { surfaces: ["headline", "primary_text"], brand }),
        lessons: learnedRules(brandId, "writes"),
        personas: brand.personas
            .map((x) => `- ${x.id}: ${x.name}. ${x.problem} | ${x.wants ?? ""} | ${x.trigger} | ${(profiles.find((f) => f.id === x.id)?.awareness ?? "problem_aware").replace(/_/g, " ")}`)
            .join("\n") || "(none yet: every `persona_ids` list is empty)",
        ask: [
            `${count} offers. First every deal the brand states today on its site or in its ads, then proposals it does not run yet, so the list covers different reasons to say yes and every persona has at least 1 offer that suits them.`,
            named.length ? `Already on the list, do not repeat: ${named.join("; ")}.` : "",
            opts.notes?.trim() ? `Notes from the person asking: ${opts.notes.trim().slice(0, 600)}` : "",
        ]
            .filter(Boolean)
            .join("\n"),
    });
    const out = await structuredJson({ brandId, task: "offer_build", model: env.MODEL_COPY, system: p.system, user: p.user, schema: Out, effort: "low", maxTokens: 10000, refType: "brand", refId: brandId });
    let made = 0;
    for (const x of out.offers.slice(0, count)) {
        try {
            saveSimpleOffer(brandId, {
                name: x.name.trim(),
                price: Math.round(x.price * 100) / 100,
                terms: x.terms.trim(),
                say: x.say.trim(),
                persona_ids: x.persona_ids.filter((id) => brand.personas.some((q) => q.id === id)),
                stages: x.stages.filter((s) => (AWARENESS_STAGES as readonly string[]).includes(s)),
                running: x.running,
                same_as: brand.offers.some((o) => o.id === x.restates.trim() && !o.id.startsWith("off_x_")) ? x.restates.trim() : null,
                needs: x.needs.trim().slice(0, 400),
                why: x.why.trim().slice(0, 400),
            });
            made++;
        }
        catch {
        }
    }
    return { made, note: `${made} ${made === 1 ? "offer" : "offers"} written.` };
}
