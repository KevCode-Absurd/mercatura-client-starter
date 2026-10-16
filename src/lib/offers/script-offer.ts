import type { AwarenessStage } from "../taxonomy";
import { offerForBuyer, type BrandOffer } from "./book";
export type OfferReason = "persona" | "default" | "picked" | "none";
export interface ScriptOfferChoice {
    id: string;
    name: string;
    recommended: boolean;
    running: boolean;
}
export interface ScriptOfferView {
    current: {
        id: string;
        name: string;
        say: string;
        terms: string;
    } | null;
    reason: OfferReason;
    label: string;
    why: string;
    recommendedId: string | null;
    choices: ScriptOfferChoice[];
    said: string;
}
const SAID: Record<AwarenessStage, string> = {
    unaware: "A buyer who does not see the problem yet is told no deal in the ad. The terms sit under the caption.",
    problem_aware: "A problem-aware buyer is told no deal in the ad. The terms sit under the caption.",
    solution_aware: "A buyer comparing answers is told 1 term of the deal, once. The full terms sit under the caption.",
    product_aware: "A buyer who knows the product is told 1 term of the deal, once. The full terms sit under the caption.",
    most_aware: "A buyer ready to buy is told the whole deal.",
};
export function scriptOfferView(book: BrandOffer[], c: {
    offer_id: string;
    persona_id: string;
    product_id: string | null;
    angle: string;
    awareness_stage: AwarenessStage;
}, o: {
    noOffer?: boolean;
    personaName?: string;
    personaOfferId?: string | null;
    firstOfferId?: string | null;
} = {}): ScriptOfferView {
    const who = o.personaName || "this persona";
    const find = (id: string | null | undefined) => (id ? book.find((x) => x.id === id || x.also.includes(id)) : undefined);
    const match = offerForBuyer(book, { persona_id: c.persona_id, product_id: c.product_id, angle: c.angle, persona_offer_id: o.personaOfferId });
    const now = o.noOffer ? undefined : find(c.offer_id);
    const forProduct = (x: BrandOffer) => !c.product_id || !x.product_id || x.product_id === c.product_id;
    const listed = book.filter((x) => (x.running && forProduct(x)) || x.id === now?.id);
    const choices = [...listed.filter((x) => x.id === match?.id), ...listed.filter((x) => x.id !== match?.id)].map((x) => ({ id: x.id, name: x.name, recommended: x.id === match?.id, running: x.running }));
    const base = { recommendedId: match?.id ?? null, choices, said: SAID[c.awareness_stage] ?? "" };
    const other = match ? ` The offer built for ${who} is "${match.name}".` : "";
    if (o.noOffer)
        return { ...base, current: null, reason: "none", label: "No offer", why: `This ad makes no offer: it was set up that way.${other}` };
    if (!now)
        return { ...base, current: null, reason: "none", label: "No offer", why: `The offer this script was written with is no longer in use.${other}` };
    const current = { id: now.id, name: now.name, say: now.say, terms: now.terms };
    if (match && now.id === match.id)
        return { ...base, current, reason: "persona", label: "Built for this persona", why: now.objection ? `Built for ${who}. It answers their doubt: "${now.objection}"` : `Built for ${who} and running today.` };
    if (!match && now.id === find(o.firstOfferId)?.id)
        return { ...base, current, reason: "default", label: "Brand default", why: `The brand's first offer. No running offer is built for ${who} yet.` };
    return { ...base, current, reason: "picked", label: "Picked for this script", why: `Chosen when this script was set up.${other}` };
}
