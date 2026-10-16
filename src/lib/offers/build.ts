import { eq, inArray, and } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { BrandBrain } from "../brand-brain";
import { loadBrandBrain } from "../brands";
import { env } from "../env";
import { offersFor } from "../llm/context";
import { llmEnabled } from "../llm/gateway";
import { structuredJson } from "../llm/structured";
import { renderPrompt } from "../prompts";
import { brandVoiceText } from "../brand-voice";
import { learnedRules } from "../lessons";
import { skillFor } from "../skills/card";
import type { InsightType } from "../taxonomy";
import { failuresCard, getIndustry, loadEconomics } from "./data";
import { spread, thresholdsFor, waterfall, type Economics } from "./economics";
import { fit, withInUse } from "./evaluate";
import { freshOfferId, listOffers, offerBrand, saveOffer } from "./store";
import { ADD_KINDS, AUDIENCES, MECHANICS, MECHANIC_INFO, PLACES, isDesigned, type Industry, type Mechanic, type OfferDesign } from "./types";
const num = z.number().finite();
const Out = z.object({
    offers: z
        .array(z.object({
        name: z.string().min(2),
        mechanic: z.enum(MECHANICS),
        audience: z.enum(AUDIENCES).catch("new"),
        product_id: z.string(),
        base_offer_id: z.string(),
        persona_id: z.string().nullish(),
        new_buyer: z.object({ name: z.string(), summary: z.string(), problem: z.string(), trigger: z.string().default(""), age: z.string().default(""), gender: z.string().default("") }).nullish(),
        headline: z.string().min(4),
        terms: z.string().min(4),
        positioning: z.string().default(""),
        units: num.default(1),
        discount: num.default(0),
        subscription: z.boolean().default(false),
        adds: z.array(z.object({ kind: z.enum(ADD_KINDS).catch("gift"), name: z.string(), cost: num.catch(0), value: num.catch(0) })).default([]),
        risk_reversal: z.string().default(""),
        urgency: z.string().default(""),
        tiers: z.array(z.object({ at: num, get: z.string() })).default([]),
        addon: z.object({ place: z.enum(PLACES).catch("post_purchase"), item: z.string(), price: num, margin: num.catch(0.5), take_rate: num.catch(0.1) }).nullish(),
        when: z.string().default("evergreen"),
        improves: z.string().nullish(),
        theme_ids: z.array(z.string()).default([]),
        why: z.string().default(""),
        test: z.string().default(""),
        needs: z.string().default(""),
        pattern: z.string().default(""),
    }))
        .max(12),
});
const clip = (s: string, n: number) => (s.trim().length > n ? `${s.trim().slice(0, n - 1).trimEnd()}…` : s.trim());
const pctOf = (n: number) => `${Math.round(n * 100)}%`;
export function brandLines(brand: BrandBrain, econ: Economics | null): string {
    const cur = brand.brand.currency;
    const days = (id: string) => brand.products.find((p) => p.id === id)?.cycle_days ?? econ?.products.find((p) => p.product_id === id)?.cycle_days;
    return [
        `${brand.brand.name}: ${brand.brand.one_liner} Category: ${brand.brand.category}. Market: ${brand.brand.market}. Prices in ${cur}.`,
        "Products (id: name. format):",
        ...brand.products.map((p) => `- ${p.id}: ${p.name}. ${clip(p.format, 140)}${days(p.id) ? ` 1 unit lasts ${days(p.id)} days.` : ""}`),
        "Price points it runs now (id: name, price. notes):",
        ...brand.offers.filter((o) => !isDesigned(o.id)).map((o) => `- ${o.id}: ${o.name}, ${o.price}.${o.notes ? ` ${clip(o.notes, 160)}` : ""}`),
        brand.guarantee ? `Guarantee: ${brand.guarantee.text}` : "No guarantee is stated.",
    ].join("\n");
}
export function numberLines(brandId: string, brand: BrandBrain, econ: Economics | null): string {
    if (!econ)
        return "Not entered yet: no costs, no order values. Say in `needs` that the margin must be checked, and prefer offers that add value over offers that cut price.";
    const f = fit(offerBrand(brandId, brand), econ);
    const s = spread(econ.order_values);
    const cost = (offerId: string) => econ.products.find((p) => p.product_id === brand.products.find((pr) => offersFor(brand, pr.id).some((o) => o.id === offerId))?.id) ?? econ.products[0];
    const rows = brand.offers
        .filter((o) => !isDesigned(o.id))
        .map((o) => {
        const w = waterfall({ revenue: o.price, units: 1, unit_cost: cost(o.id).unit_cost, shipping: econ.shipping, fee_rate: econ.fee_rate });
        return `- ${o.id}: pays ${o.price}, keeps ${w.margin.toFixed(2)} before ads (${pctOf(w.margin_rate)}), breaks even at a return of ${Number.isFinite(w.break_even) ? w.break_even.toFixed(2) : "none"}`;
    });
    return [
        "1 unit at each price point:",
        ...rows,
        `A unit costs ${econ.products.map((p) => `${p.product_id} ${p.unit_cost}`).join(", ")} to make. Shipping an order of 1, 2, 3 units costs ${econ.shipping.slice(0, 3).join(", ")}.`,
        `Return on ad spend on first orders today: ${econ.roas}. Of new customers, ${econ.retention.slice(0, 3).map(pctOf).join(", ")} place a 2nd, 3rd, 4th order.`,
        s.shape === "unknown" ? "" : `Order values: ${s.shape === "two" ? "2 peaks" : "1 peak"}, at ${s.peaks.map((p) => `${p.from} to ${p.to}`).join(" and ")}; the average is ${s.mean.toFixed(0)}. A spend threshold belongs at ${thresholdsFor(s).map((t) => `${t.from.toFixed(0)} to ${t.to.toFixed(0)}`).join(" or ")}.`,
        econ.discount_history.length ? `What past flat discounts did: ${econ.discount_history.map((h) => `${pctOf(h.discount)} off gave ${h.units} units an order and ads ${pctOf(Math.abs(h.roas_lift))} ${h.roas_lift >= 0 ? "more" : "less"} efficient`).join("; ")}.` : "",
        `Flat discounts run in the last 12 months: ${econ.promos.length}.`,
        `The store has ${econ.has.cart_addon ? "a" : "no"} cart add-on, ${econ.has.checkout_addon ? "a" : "no"} checkout add-on, ${econ.has.post_purchase ? "a" : "no"} post-purchase offer, ${econ.has.returning_offer ? "an" : "no"} offer for returning buyers.`,
        `Fit, best first: ${f.ranked.map((r) => r.mechanic).join(", ")}.`,
    ]
        .filter(Boolean)
        .join("\n");
}
const WANTED: InsightType[] = ["objection", "final_objection", "desire", "purchase_driver", "trigger_moment", "accommodation"];
function researchLines(brandId: string, keep = 16): string {
    const rows = db.select({ id: schema.themes.id, type: schema.themes.type, label: schema.themes.label }).from(schema.themes).where(and(eq(schema.themes.brand_id, brandId), inArray(schema.themes.type, WANTED))).orderBy(schema.themes.rank).limit(keep).all();
    return rows.length ? rows.map((t) => `${t.id} | ${t.type.replace(/_/g, " ")} | ${t.label}`).join("\n") : "(no research imported yet: every `theme_ids` list is empty)";
}
export const industryLines = (i: Industry) => [`## Borrow from: ${i.name}`, "These are ordinary there and may be new in this brand's category. Translate each into something an online store can deliver: shipped, downloaded, access granted, or done for the buyer. Keep what makes the pattern work; drop what needs a shop floor.", ...i.patterns.slice(0, 8).map((p) => `- ${p.name}: ${p.how}${p.example ? ` Example: ${clip(p.example, 140)}` : ""}`)].join("\n");
export interface BuildOffersOpts {
    mechanics?: Mechanic[];
    count?: number;
    notes?: string;
    industry?: string;
    replay?: string;
}
export interface BuildOffersResult {
    made: OfferDesign[];
    skipped: number;
    note: string;
}
export async function buildOffers(brandId: string, opts: BuildOffersOpts = {}): Promise<BuildOffersResult> {
    if (!opts.replay && !llmEnabled())
        throw new Error("Building offers needs live mode.");
    const brand = loadBrandBrain(brandId);
    const have = listOffers(brandId);
    const econ = withInUse(loadEconomics(brandId), have);
    const ob = offerBrand(brandId, brand);
    const industry = opts.industry ? getIndustry(opts.industry) : undefined;
    if (opts.industry && !industry)
        throw new Error("That industry is not in the list.");
    const count = Math.max(1, Math.min(8, opts.count ?? (industry ? 4 : 6)));
    const mechanics = opts.mechanics?.length ? opts.mechanics : industry ? [] : fit(ob, econ).ranked.slice(0, 4).map((r) => r.mechanic);
    const ask = [
        industry ? `${count} offers, each borrowed from a different pattern above, using whichever mechanic carries it.` : mechanics.length === 1 && mechanics[0] === "reposition" ? `${count} repositionings of the hero product: ${count} different buyers, problems and headlines for the same product, each with terms built around that buyer. At most 2 may use a buyer the brand already has.` : `${count} offers across these mechanics: ${mechanics.join(", ")}. Spread them; at least 1 of each where the count allows.`,
        have.length ? `Already designed, do not repeat: ${have.slice(0, 20).map((d) => d.name).join("; ")}.` : "",
    ]
        .filter(Boolean)
        .join("\n");
    const p = renderPrompt("offer-build", {
        brand_name: brand.brand.name,
        card: skillFor("offer-building", "focused"),
        failures: failuresCard(),
        brand: brandLines(brand, econ),
        brand_voice: brandVoiceText(brandId, { surfaces: ["headline", "primary_text"], brand }),
        lessons: learnedRules(brandId, "writes"),
        simulated: "",
        numbers: numberLines(brandId, brand, econ?.simulated ? null : econ),
        buyers: brand.personas.map((x) => `- ${x.id}: ${x.name}. ${clip(x.problem, 110)}`).join("\n") || "(none)",
        research: researchLines(brandId),
        industry: industry ? industryLines(industry) : "",
        ask,
        notes: opts.notes?.trim() ? `Notes from the person asking: ${opts.notes.trim().slice(0, 600)}` : "",
    });
    const out = opts.replay ? Out.parse(JSON.parse(opts.replay)) : await structuredJson({ brandId, task: "offer_build", model: env.MODEL_COPY, system: p.system, user: p.user, schema: Out, effort: "low", maxTokens: 12000, refType: "brand", refId: brandId });
    const themes = new Set(db.select({ id: schema.themes.id }).from(schema.themes).where(eq(schema.themes.brand_id, brandId)).all().map((t) => t.id));
    const priced = brand.offers.filter((o) => !isDesigned(o.id));
    const made: OfferDesign[] = [];
    let skipped = 0;
    for (const x of out.offers.slice(0, count)) {
        const product = brand.products.find((pr) => pr.id === x.product_id) ?? brand.products[0];
        const base = priced.find((o) => o.id === x.base_offer_id) ?? priced[0];
        if (!product || !base) {
            skipped++;
            continue;
        }
        const persona = brand.personas.find((pp) => pp.id === x.persona_id)?.id ?? null;
        const buyer = !persona && x.new_buyer && x.new_buyer.name.trim().length > 1 && x.new_buyer.summary.trim().length > 3 && x.new_buyer.problem.trim().length > 3 ? { name: clip(x.new_buyer.name, 60), summary: clip(x.new_buyer.summary, 390), problem: clip(x.new_buyer.problem, 290), trigger: clip(x.new_buyer.trigger, 290), age: clip(x.new_buyer.age, 40), gender: clip(x.new_buyer.gender, 40) } : null;
        const addon = x.addon && (x.mechanic === "upsell" || x.mechanic === "post_purchase") && x.addon.item.trim().length > 1 ? { place: x.addon.place, item: clip(x.addon.item, 160), price: Math.max(0, x.addon.price), margin: Math.min(1, Math.max(0, x.addon.margin)), take_rate: Math.min(1, Math.max(0, x.addon.take_rate)) } : null;
        try {
            made.push(saveOffer(brandId, {
                id: freshOfferId(brandId, x.name),
                name: clip(x.name, 70),
                mechanic: x.mechanic,
                audience: x.audience,
                product_id: product.id,
                base_offer_id: base.id,
                persona_id: persona,
                new_buyer: buyer,
                headline: clip(x.headline, 140),
                terms: clip(x.terms, 500),
                positioning: clip(x.positioning, 400),
                units: Math.max(1, Math.min(24, Math.round(x.units))),
                discount: Math.max(0, Math.min(0.7, x.discount > 1 ? x.discount / 100 : x.discount)),
                subscription: x.subscription,
                adds: x.adds.filter((a) => a.name.trim().length > 1).slice(0, 4).map((a) => ({ kind: a.kind, name: clip(a.name, 120), cost: Math.max(0, a.cost), value: Math.max(0, a.value) })),
                risk_reversal: clip(x.risk_reversal, 240),
                urgency: clip(x.urgency, 240),
                tiers: x.mechanic === "tiered" ? x.tiers.filter((t) => t.at > 0 && t.get.trim().length > 1).slice(0, 4).map((t) => ({ at: t.at, get: clip(t.get, 160) })) : [],
                addon,
                when: clip(x.when || "evergreen", 80),
                improves: priced.find((o) => o.id === x.improves)?.id ?? null,
                theme_ids: x.theme_ids.filter((t) => themes.has(t)).slice(0, 6),
                why: clip(x.why, 400),
                test: clip(x.test, 300),
                needs: clip(x.needs, 300),
                borrowed: industry ? { industry: industry.id, pattern: clip(x.pattern || industry.name, 80) } : null,
                source: industry ? "industry" : "built",
                status: "draft",
            }));
        }
        catch {
            skipped++;
        }
    }
    const what = industry ? `borrowed from ${industry.name.toLowerCase()}` : mechanics.map((m) => MECHANIC_INFO[m].one).join(", ");
    return { made, skipped, note: `${made.length} offer${made.length === 1 ? "" : "s"} designed (${what})${econ?.simulated ? ", on simulated costs" : ""}${skipped ? `; ${skipped} left out as unusable` : ""}.` };
}
