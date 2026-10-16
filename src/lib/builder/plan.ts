import { AWARENESS_STAGES, type AwarenessStage } from "../taxonomy";
import { NO_OFFER, NO_OFFER_STAGES, type BuilderPick, type Chosen, type Combo } from "./types";
export interface MatchData {
    products: {
        id: string;
    }[];
    personas: {
        id: string;
        awareness: string;
        product_ids: string[];
    }[];
    angles: {
        id: string;
        persona_ids: string[];
        stages?: string[];
    }[];
    offers: {
        id: string;
        persona_ids: string[];
        stages: string[];
        product_id: string | null;
        fitted?: boolean;
    }[];
    formats: {
        id: string;
        stages: string[];
    }[];
}
type Lists = Pick<BuilderPick, "products" | "stages" | "personas" | "angles" | "offers" | "formats">;
const asked = (c: Chosen) => Object.values(c).reduce((s, n) => s + Math.max(0, n), 0);
export const totalOf = (pick: Lists & {
    count: number;
}) => Math.max(1, Math.round(pick.count) || 1, ...[pick.products, pick.stages, pick.personas, pick.angles, pick.offers, pick.formats].map(asked));
const near = (a: string, b: string) => Math.abs(AWARENESS_STAGES.indexOf(a as AwarenessStage) - AWARENESS_STAGES.indexOf(b as AwarenessStage));
const suits = (list: string[], id: string) => !list.length || list.includes(id);
export const fits = {
    product: (p: {
        product_ids: string[];
    }, productId: string) => suits(p.product_ids, productId),
    angle: (a: {
        persona_ids: string[];
    }, personaId: string) => suits(a.persona_ids, personaId),
    stage: (p: {
        awareness: string;
    }, stage: string) => near(p.awareness, stage) <= 1,
    offer: (o: {
        persona_ids: string[];
        stages: string[];
    }, personaId: string, stage: string) => suits(o.persona_ids, personaId) && suits(o.stages, stage),
    format: (f: {
        stages: string[];
    }, stage: string) => suits(f.stages, stage),
};
export type Recommended = "products" | "angles" | "offers" | "formats";
export interface Chose {
    product_id: string;
    stage: string;
    persona_id: string;
}
export function why(key: Recommended, id: string, at: Chose, data: MatchData): string[] {
    const persona = data.personas.find((p) => p.id === at.persona_id);
    if (key === "products") {
        const buys = persona ? (persona.product_ids.length ? persona.product_ids : data.products.slice(0, 1).map((p) => p.id)) : [];
        return buys.includes(id) ? ["what this persona buys"] : [];
    }
    if (key === "angles") {
        const a = data.angles.find((x) => x.id === id);
        if (!a)
            return [];
        const stages = a.stages ?? [];
        const forPersona = !!at.persona_id && a.persona_ids.includes(at.persona_id);
        const forStage = !!at.stage && stages.includes(at.stage);
        if ((at.persona_id && a.persona_ids.length && !forPersona) || (at.stage && stages.length && !forStage))
            return [];
        return [forPersona && "written for this persona", forStage && "suits this stage"].filter(Boolean) as string[];
    }
    if (key === "offers") {
        const none = (NO_OFFER_STAGES as string[]).includes(at.stage);
        if (id === NO_OFFER)
            return none ? ["a buyer at this stage is not ready for a deal"] : [];
        const o = data.offers.find((x) => x.id === id);
        if (!o || none || o.fitted === false)
            return [];
        if (o.product_id && at.product_id && o.product_id !== at.product_id)
            return [];
        const forProduct = !!o.product_id && o.product_id === at.product_id;
        const forPersona = !!at.persona_id && o.persona_ids.includes(at.persona_id);
        const forStage = !!at.stage && o.stages.includes(at.stage);
        if ((at.persona_id && o.persona_ids.length && !forPersona) || (at.stage && o.stages.length && !forStage))
            return [];
        return [forProduct && "for this product", forPersona && "written for this persona", forStage && "suits this stage"].filter(Boolean) as string[];
    }
    const f = data.formats.find((x) => x.id === id);
    return f && at.stage && f.stages.includes(at.stage) ? ["suits this stage"] : [];
}
export function match(pick: Lists & {
    count: number;
}, data: MatchData): Combo[] {
    const pool = {
        products: data.products.filter((p) => p.id in pick.products),
        stages: AWARENESS_STAGES.filter((s) => s in pick.stages),
        personas: data.personas.filter((p) => p.id in pick.personas),
        angles: data.angles.filter((a) => a.id in pick.angles),
        offers: data.offers.filter((o) => o.id in pick.offers),
        formats: data.formats.filter((f) => f.id in pick.formats),
    };
    if ((data.products.length && !pool.products.length) || !pool.stages.length || !pool.personas.length || !pool.angles.length || !pool.offers.length || !pool.formats.length)
        return [];
    const left = { products: { ...pick.products }, stages: { ...pick.stages }, personas: { ...pick.personas }, angles: { ...pick.angles }, offers: { ...pick.offers }, formats: { ...pick.formats } };
    const used = new Map<string, number>();
    const seen = new Set<string>();
    const n = totalOf(pick);
    const out: Combo[] = [];
    function best<T>(kind: keyof typeof left, items: T[], idOf: (x: T) => string, score: (x: T) => number, spread = true): T {
        let top = items[0];
        let topScore = -Infinity;
        for (const x of items) {
            const id = idOf(x);
            const s = ((left[kind][id] ?? 0) > 0 ? 1000 : 0) + score(x) - (spread ? (used.get(`${kind}:${id}`) ?? 0) * 10 : 0);
            if (s > topScore)
                [top, topScore] = [x, s];
        }
        const id = idOf(top);
        if ((left[kind][id] ?? 0) > 0)
            left[kind][id]--;
        used.set(`${kind}:${id}`, (used.get(`${kind}:${id}`) ?? 0) + 1);
        return top;
    }
    const buys = (p: {
        product_ids: string[];
    }) => (p.product_ids.length ? p.product_ids : data.products.slice(0, 1).map((x) => x.id));
    const sold = (p: {
        product_ids: string[];
    }) => !pool.products.length || buys(p).some((id) => id in pick.products);
    while (out.length < n) {
        const owedProducts = pool.products.filter((p) => (left.products[p.id] ?? 0) > 0);
        const owedAngles = pool.angles.filter((a) => (left.angles[a.id] ?? 0) > 0);
        const owedStages = pool.stages.filter((s) => (left.stages[s] ?? 0) > 0);
        const persona = best("personas", pool.personas, (p) => p.id, (p) => (owedProducts.some((x) => buys(p).includes(x.id)) ? 50 : 0) + (owedAngles.some((a) => a.persona_ids.includes(p.id)) ? 50 : 0) + (owedStages.some((s) => near(p.awareness, s) === 0) ? 20 : 0) - (sold(p) ? 0 : 200));
        const product = pool.products.length ? best("products", pool.products, (p) => p.id, (p) => (buys(persona).includes(p.id) ? 100 : 0), false).id : "";
        const stage = best("stages", pool.stages, (s) => s, (s) => (near(persona.awareness, s) === 0 ? 30 : near(persona.awareness, s) === 1 ? 15 : 0));
        const angle = best("angles", pool.angles, (a) => a.id, (a) => (a.persona_ids.includes(persona.id) ? 120 : !a.persona_ids.length ? 100 : 0) + (a.stages?.length ? (a.stages.includes(stage) ? 15 : -15) : 0));
        const key = (offerId: string, formatId: string) => [product, stage, persona.id, angle.id, offerId, formatId].join("|");
        const spent = (offerId: string) => pool.formats.every((f) => seen.has(key(offerId, f.id)));
        const offer = best("offers", pool.offers, (o) => o.id, (o) => (o.id === NO_OFFER ? ((NO_OFFER_STAGES as string[]).includes(stage) ? 700 : -700) : 0) + (o.product_id && product ? (o.product_id === product ? 40 : -100) : 0) + (o.persona_ids.includes(persona.id) ? 30 : !o.persona_ids.length ? 10 : 0) + (o.stages.includes(stage) ? 25 : !o.stages.length ? 10 : 0) - (o.fitted === false ? 25 : 0) - (spent(o.id) ? 200 : 0));
        const format = best("formats", pool.formats, (f) => f.id, (f) => (f.stages.includes(stage) ? 30 : !f.stages.length ? 15 : 0) - (seen.has(key(offer.id, f.id)) ? 200 : 0));
        seen.add(key(offer.id, format.id));
        out.push({ product_id: product, stage, persona_id: persona.id, angle_id: angle.id, offer_id: offer.id, format_id: format.id });
    }
    return out;
}
export const withEdits = (plan: Combo[], edits: Record<number, Combo>): Combo[] => plan.map((c, i) => edits[i] ?? c);
export function unknownRows(rows: Combo[], data: MatchData): number[] {
    const has = { products: new Set(data.products.map((p) => p.id)), personas: new Set(data.personas.map((p) => p.id)), angles: new Set(data.angles.map((a) => a.id)), offers: new Set(data.offers.map((o) => o.id)), formats: new Set(data.formats.map((f) => f.id)) };
    return rows.flatMap((r, i) => ((data.products.length ? has.products.has(r.product_id) : !r.product_id) && AWARENESS_STAGES.includes(r.stage) && has.personas.has(r.persona_id) && has.angles.has(r.angle_id) && has.offers.has(r.offer_id) && has.formats.has(r.format_id) ? [] : [i + 1]));
}
