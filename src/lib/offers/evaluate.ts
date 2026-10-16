import { addonProfit, contributionAt, hold, liftAt, overCycles, spread, thresholdsFor, unitsAt, waterfall, type Economics, type Spread, type Waterfall } from "./economics";
import { currencySymbol } from "../money";
import { giftsTheHero, heroProduct } from "./plays";
import { MECHANICS, isDesigned, type Mechanic, type OfferDesign } from "./types";
export interface OfferBrand {
    currency: string;
    products: {
        id: string;
        name: string;
        cycle_days?: number;
    }[];
    offers: {
        id: string;
        name: string;
        price: number;
        notes?: string;
    }[];
}
type Numbers = Pick<OfferDesign, "mechanic" | "product_id" | "base_offer_id" | "units" | "discount" | "adds" | "addon">;
export interface Evaluation {
    missing: string | null;
    today: (Waterfall & {
        cac: number;
        contribution: number;
    }) | null;
    order: Waterfall | null;
    at_todays_cost: number | null;
    needed: {
        roas: number;
        cac: number;
    } | null;
    expected_cac: number | null;
    reachable: number | null;
    span: {
        days: number;
        cycles: number;
        today: number;
    } | null;
    addon: number | null;
}
export function evaluate(d: Numbers, brand: OfferBrand, econ: Economics | null): Evaluation {
    const none: Evaluation = { missing: null, today: null, order: null, at_todays_cost: null, needed: null, expected_cac: null, reachable: null, span: null, addon: null };
    if (d.addon && (d.mechanic === "upsell" || d.mechanic === "post_purchase"))
        return { ...none, addon: addonProfit(d.addon) };
    if (!econ)
        return { ...none, missing: "The brand's costs are not entered, so this offer's margin is not known." };
    const base = brand.offers.find((o) => o.id === d.base_offer_id);
    if (!base)
        return { ...none, missing: "The price point this is built on is no longer in the brand brain." };
    const cost = econ.products.find((p) => p.product_id === d.product_id);
    if (!cost)
        return { ...none, missing: "This product's cost is not entered, so the margin is not known." };
    const one = waterfall({ revenue: base.price, units: 1, unit_cost: cost.unit_cost, shipping: econ.shipping, fee_rate: econ.fee_rate });
    const cac = Math.round((base.price / econ.roas) * 100) / 100;
    const today = { ...one, cac, contribution: contributionAt(one, econ.roas) };
    const units = Math.max(1, Math.round(d.units));
    const order = waterfall({ revenue: base.price * units * (1 - d.discount), units, unit_cost: cost.unit_cost, shipping: econ.shipping, fee_rate: econ.fee_rate, extras: d.adds.reduce((a, x) => a + x.cost, 0) });
    let span: Evaluation["span"] = null;
    const cycle = cost.cycle_days ?? brand.products.find((p) => p.id === d.product_id)?.cycle_days;
    if (units > 1 && cycle) {
        const reorderAt = brand.offers.find((o) => o.id === econ.reorder_offer_id) ?? base;
        const reorder = waterfall({ revenue: reorderAt.price, units: 1, unit_cost: cost.unit_cost, shipping: econ.shipping, fee_rate: econ.fee_rate });
        span = { days: units * cycle, cycles: units, today: overCycles(one, reorder, econ.retention, units, econ.roas) };
    }
    const expected = d.discount > 0 ? Math.round(((base.price * (1 - d.discount) * unitsAt(econ.discount_history, d.discount)) / (econ.roas * (1 + liftAt(econ.discount_history, d.discount)))) * 100) / 100 : cac;
    return { missing: null, today, order, at_todays_cost: Math.round((order.margin - cac) * 100) / 100, needed: hold(order, today.contribution), expected_cac: expected, reachable: expected > 0 ? Math.round((order.revenue / expected) * 100) / 100 : null, span, addon: null };
}
export const priceOf = (d: Pick<OfferDesign, "base_offer_id" | "units" | "discount">, brand: OfferBrand) => {
    const base = brand.offers.find((o) => o.id === d.base_offer_id);
    return base ? Math.round(base.price * Math.max(1, d.units) * (1 - d.discount) * 100) / 100 : 0;
};
export function withInUse(econ: Economics | null, designs: Pick<OfferDesign, "status" | "mechanic" | "audience" | "addon">[]): Economics | null {
    if (!econ)
        return null;
    const live = designs.filter((d) => d.status === "active");
    const at = (place: string) => live.some((d) => d.addon?.place === place);
    return { ...econ, has: { cart_addon: econ.has.cart_addon || at("cart"), checkout_addon: econ.has.checkout_addon || at("checkout"), post_purchase: econ.has.post_purchase || live.some((d) => d.mechanic === "post_purchase"), returning_offer: econ.has.returning_offer || live.some((d) => d.audience === "returning") } };
}
export interface Fit {
    answers: {
        id: "margin" | "spread" | "range" | "repeat";
        question: string;
        answer: string;
        known: boolean;
    }[];
    ranked: {
        mechanic: Mechanic;
        score: number;
        why: string;
    }[];
    spread: Spread;
}
export function fit(brand: OfferBrand, econ: Economics | null): Fit {
    const s = spread(econ?.order_values ?? []);
    const priced = brand.offers.filter((o) => !isDesigned(o.id));
    const hero = econ?.mix.length ? [...econ.mix].sort((a, b) => b.share - a.share)[0] : null;
    const single = brand.products.length === 1 || (hero?.share ?? 0) >= 0.6;
    const consumable = brand.products.some((p) => p.cycle_days) || !!econ?.products.some((p) => p.cycle_days);
    const repeat = econ?.retention[0] ?? null;
    const heroCost = econ?.products.find((p) => p.product_id === (hero?.product_id ?? brand.products[0]?.id));
    const full = econ && heroCost && priced.length ? waterfall({ revenue: Math.max(...priced.map((o) => o.price)), units: 1, unit_cost: heroCost.unit_cost, shipping: econ.shipping, fee_rate: econ.fee_rate }) : null;
    const flat = econ?.promos.length ?? 0;
    const cur = currencySymbol(brand.currency);
    const heroName = brand.products.find((p) => p.id === hero?.product_id)?.name ?? brand.products[0]?.name ?? "the product";
    const answers: Fit["answers"] = [
        { id: "margin", question: "What is the margin floor?", known: !!full, answer: full ? `At full price an order keeps ${Math.round(full.margin_rate * 100)}% before ads (${cur}${full.margin.toFixed(2)} of ${cur}${full.revenue.toFixed(2)}), and breaks even at a return of ${full.break_even.toFixed(2)}. Every point of discount comes out of that.` : "Not known: enter what a unit costs to make and to ship." },
        { id: "spread", question: "How are order values spread?", known: s.shape !== "unknown", answer: s.shape === "unknown" ? "Not known: no order values yet." : s.shape === "two" ? `2 peaks, near ${cur}${s.peaks[0].at.toFixed(0)} and ${cur}${s.peaks[1].at.toFixed(0)}. The average (${cur}${s.mean.toFixed(0)}) sits between them, where few buyers are: a threshold there moves almost nobody.` : `1 peak, near ${cur}${s.peaks[0]?.at.toFixed(0) ?? s.mean.toFixed(0)}. 1 step up is the job: a threshold or a larger pack just above it.` },
        { id: "range", question: "1 hero product or many?", known: brand.products.length > 0, answer: single ? `1 hero: ${heroName}${hero ? ` is ${Math.round(hero.share * 100)}% of revenue` : ""}. Repositioning first, then a gift with purchase, then disciplined discounting.` : `${brand.products.length} products with no single hero. Bundles, cross-sells and thresholds are open.` },
        { id: "repeat", question: "Do buyers come back?", known: repeat != null, answer: repeat == null ? "Not known: no repeat data yet." : repeat >= 0.35 ? `Yes: ${Math.round(repeat * 100)}% place a 2nd order${consumable ? ", and the product is used up" : ""}. The subscription and the billing cycle belong in the offer: a longer supply up front, a reward on the 2nd order.` : `Rarely: ${Math.round(repeat * 100)}% place a 2nd order. Protect the margin on the first order; it is most of what a customer is worth.` },
    ];
    const score: Record<Mechanic, {
        score: number;
        why: string;
    }> = {
        reposition: { score: single ? 95 : 60, why: single ? "1 product carries the brand, so new buyers come from new reasons to buy it. It costs no margin." : "Costs no margin, and each positioning opens its own offers." },
        bundle: { score: consumable ? 85 : brand.products.length > 1 ? 80 : 30, why: consumable ? "The product is used up, so a 60 or 90-day supply is a bundle of 1 product. Shipping 3 costs far less than 3 times shipping 1." : brand.products.length > 1 ? "Several products can go in 1 order." : "1 product that is not used up: there is little to bundle." },
        gift: { score: full && full.margin_rate >= 0.5 ? 82 : 65, why: full && full.margin_rate >= 0.5 ? "The margin has room for a low-cost gift, and a gift lifts units without touching the price." : "Works where a cheap item pairs with the product. Check its cost against the margin first." },
        tiered: { score: s.shape === "two" ? 84 : brand.products.length > 1 ? 62 : 45, why: s.shape === "two" ? "Order values have 2 peaks, so 1 tier above each can move both groups." : "With 1 peak, a single step up is enough: a tier ladder adds little." },
        discount: { score: flat > 2 ? 15 : 35, why: flat > 2 ? `${flat} flat discounts ran in the last 12 months. The year's 1 or 2 are used up, and buyers are being taught to wait.` : "1 or 2 times a year, on high-margin products or slow stock, and modelled first." },
        upsell: { score: brand.products.length > 1 ? (econ?.has.cart_addon ? 55 : 78) : 50, why: brand.products.length > 1 ? `A second product can be offered beside the first${econ && !econ.has.cart_addon ? ", and the cart has no add-on today" : ""}.` : "With 1 product, the add-on is more of the same or a low-friction extra such as shipping protection." },
        post_purchase: { score: econ && !econ.has.post_purchase ? 90 : 58, why: econ && !econ.has.post_purchase ? "The store has no offer after the purchase. It is the lowest-friction place to add profit: payment is taken and the add is 1 click." : "Payment is taken and the add is 1 click. Worth testing what is offered there." },
    };
    return { answers, ranked: MECHANICS.map((m) => ({ mechanic: m, ...score[m] })).sort((a, b) => b.score - a.score), spread: s };
}
export const FAILURE_IDS = ["blank_discount", "margin_miscalculated", "same_for_new_and_returning", "threshold_at_average", "wrong_gift", "promo_calendar", "q1_as_season"] as const;
export type FailureId = (typeof FAILURE_IDS)[number];
export type FailureLevel = "fail" | "warn" | "pass" | "unknown";
export interface FailureResult {
    id: FailureId;
    level: FailureLevel;
    message: string;
}
const Q1 = /\b(jan|feb|mar|q1|first quarter|new year|winter|resolution)/i;
const isGift = (k: string) => k === "gift" || k === "samples";
export function checkOffer(d: OfferDesign, brand: OfferBrand, econ: Economics | null): FailureResult[] {
    const out: FailureResult[] = [];
    const e = evaluate(d, brand, econ);
    const addon = d.mechanic === "upsell" || d.mechanic === "post_purchase";
    if (d.discount > 0) {
        const bare = d.units <= 1 && !d.adds.length && !d.risk_reversal.trim() && !d.urgency.trim() && !d.subscription && !d.tiers.length;
        out.push(bare ? { id: "blank_discount", level: "fail", message: `${Math.round(d.discount * 100)}% off and nothing else: no units, nothing added, no guarantee, no deadline. That is a discount, not an offer.` } : { id: "blank_discount", level: "pass", message: "The discount is tied to something: units, a subscription, something added, a guarantee or a deadline." });
    }
    if (!addon) {
        if (e.missing)
            out.push({ id: "margin_miscalculated", level: "unknown", message: e.missing });
        else if (e.order && e.needed && e.expected_cac != null && e.today) {
            const cost = e.expected_cac.toFixed(2);
            const basis = d.discount > 0 ? `an order cost ${cost} to win at a discount this size` : `an order costs ${cost} to win today`;
            if (e.order.margin <= 0)
                out.push({ id: "margin_miscalculated", level: "fail", message: "After goods, shipping, fees and what is given with it, this order has no margin left before ads." });
            else if (e.needed.cac < e.expected_cac * 0.98) {
                const short = e.needed.cac > 0 ? `the ads would have to win it ${Math.round((1 - e.needed.cac / e.expected_cac) * 100)}% more cheaply` : "no cost to win it is low enough";
                out.push({ id: "margin_miscalculated", level: e.needed.cac < e.expected_cac * 0.8 ? "fail" : "warn", message: `To leave what an order leaves today, this order must be won for ${Math.max(0, e.needed.cac).toFixed(2)} or less, and ${basis}: ${short}.` });
            }
            else
                out.push({ id: "margin_miscalculated", level: "pass", message: `Shipping, fees and what is given are counted. It can cost up to ${e.needed.cac.toFixed(2)} to win and still leave what an order leaves today; ${basis}.${d.units > 1 && d.discount === 0 ? " That a bigger order costs no more to win is the assumption to test." : ""}` });
        }
    }
    if (!addon && d.audience === "all" && (d.discount > 0 || d.adds.length > 0))
        out.push({ id: "same_for_new_and_returning", level: "warn", message: "This goes to everyone. New buyers need a reason to try; returning buyers need a reason to stay. One of them is being overpaid." });
    if (d.tiers.length) {
        const s = spread(econ?.order_values ?? []);
        if (s.shape === "unknown")
            out.push({ id: "threshold_at_average", level: "unknown", message: "The spread of order values is not known, so the tiers cannot be placed against it." });
        else {
            const ok = thresholdsFor(s);
            const atMean = d.tiers.find((t) => Math.abs(t.at - s.mean) / s.mean <= 0.1 && !ok.some((r) => t.at >= r.from && t.at <= r.to));
            const inside = d.tiers.find((t) => s.peaks.some((p) => t.at >= p.from && t.at <= (Number.isFinite(p.to) ? p.to : p.at)));
            if (atMean && s.shape === "two")
                out.push({ id: "threshold_at_average", level: "fail", message: `The tier at ${atMean.at} sits on the average order value (${s.mean.toFixed(0)}), between the 2 peaks. Put 1 tier at ${ok.map((r) => `${r.from.toFixed(0)} to ${r.to.toFixed(0)}`).join(" and 1 at ")}.` });
            else if (inside)
                out.push({ id: "threshold_at_average", level: "warn", message: `The tier at ${inside.at} is inside a peak: the buyers there already spend that much and get the reward for nothing. Tiers belong at ${ok.map((r) => `${r.from.toFixed(0)} to ${r.to.toFixed(0)}`).join(" and ")}.` });
            else
                out.push({ id: "threshold_at_average", level: "pass", message: "The tiers sit above the peaks in order values, not at the average." });
        }
    }
    const gifts = d.adds.filter((a) => isGift(a.kind));
    if (gifts.length) {
        const cost = gifts.reduce((a, g) => a + g.cost, 0);
        const noValue = gifts.find((g) => g.value <= 0);
        const thin = gifts.find((g) => g.cost > 0 && g.value > 0 && g.value < g.cost * 3);
        const heavy = e.order && cost > (e.order.margin + cost) * 0.25;
        const hero = heroProduct(econ?.mix ?? [], brand.products);
        const isHero = hero ? gifts.find((g) => giftsTheHero(g.name, hero.name)) : undefined;
        if (heavy)
            out.push({ id: "wrong_gift", level: "fail", message: `The gift costs ${cost.toFixed(2)}, more than a quarter of the order's margin. It no longer pays for itself.` });
        else if (isHero && hero)
            out.push({ id: "wrong_gift", level: "warn", message: `"${isHero.name}" is ${hero.name}, the product ${Math.round(hero.share * 100)}% of sales come from. Never gift the hero: give something that goes with it, costs little and has its own price.` });
        else if (noValue)
            out.push({ id: "wrong_gift", level: "warn", message: `"${noValue.name}" has no price a buyer would pay. Sell it on the site at a real price, or ask buyers whether they want it.` });
        else if (thin)
            out.push({ id: "wrong_gift", level: "warn", message: `"${thin.name}" is worth ${thin.value.toFixed(0)} to the buyer and costs ${thin.cost.toFixed(2)}: under 3 times its cost. A gift should feel worth far more than it costs.` });
        else if (!d.theme_ids.length)
            out.push({ id: "wrong_gift", level: "warn", message: "The numbers work, but nothing in the research says buyers want this gift. Ask them before it ships." });
        else
            out.push({ id: "wrong_gift", level: "pass", message: "The gift is cheap against the margin, has a real price, and the research shows the want." });
    }
    return out;
}
export function checkBrand(designs: OfferDesign[], brand: OfferBrand, econ: Economics | null): FailureResult[] {
    const live = designs.filter((d) => d.status === "active");
    const each = live.map((d) => ({ d, r: checkOffer(d, brand, econ) }));
    const worst = (id: FailureId): {
        level: FailureLevel;
        names: string[];
    } => {
        const hit = each.filter((x) => x.r.some((r) => r.id === id && (r.level === "fail" || r.level === "warn")));
        const level = hit.some((x) => x.r.some((r) => r.id === id && r.level === "fail")) ? "fail" : hit.length ? "warn" : "pass";
        return { level, names: hit.map((x) => x.d.name) };
    };
    const out: FailureResult[] = [];
    const priced = brand.offers.filter((o) => !isDesigned(o.id));
    const pctOnly = priced.filter((o) => /\d+\s*%|\bdiscount\b|% off/i.test(`${o.name} ${o.notes ?? ""}`));
    const b = worst("blank_discount");
    out.push(b.level !== "pass" ? { id: "blank_discount", level: b.level, message: `In use and nothing but money off: ${b.names.join(", ")}.` } : pctOnly.length && !live.some((d) => d.mechanic !== "discount") ? { id: "blank_discount", level: "warn", message: `What runs now leans on a discount (${pctOnly.map((o) => o.name).join("; ")}), and no offer built on anything else is in use.` } : { id: "blank_discount", level: "pass", message: live.length ? "No offer in use is a bare discount." : "No bare discount is in use." });
    const m = worst("margin_miscalculated");
    out.push(!econ ? { id: "margin_miscalculated", level: "unknown", message: "The brand's costs are not entered. Until they are, no offer's margin can be checked." } : m.level !== "pass" ? { id: "margin_miscalculated", level: m.level, message: `Would have to be won more cheaply than orders are won today: ${m.names.join(", ")}.` } : { id: "margin_miscalculated", level: econ.simulated ? "warn" : "pass", message: econ.simulated ? "The costs on this screen are simulated. Every margin here is a test of the arithmetic until the brand's own costs are entered." : "Goods, shipping and fees are entered, and every offer in use is modelled with them." });
    const forReturning = live.some((d) => d.audience === "returning") || !!econ?.has.returning_offer;
    const n = worst("same_for_new_and_returning");
    out.push(n.level !== "pass" ? { id: "same_for_new_and_returning", level: "warn", message: `Goes to everyone: ${n.names.join(", ")}.` } : !forReturning ? { id: "same_for_new_and_returning", level: "warn", message: "Nothing in use is for returning buyers. Every offer is spent on the first order." } : { id: "same_for_new_and_returning", level: "pass", message: "New and returning buyers each have their own offer." });
    const t = worst("threshold_at_average");
    const sp = spread(econ?.order_values ?? []);
    out.push(t.level !== "pass" ? { id: "threshold_at_average", level: t.level, message: `A tier at the average or inside a peak: ${t.names.join(", ")}.` } : sp.shape === "unknown" ? { id: "threshold_at_average", level: "unknown", message: "Order values are not known yet, so no threshold can be placed." } : { id: "threshold_at_average", level: "pass", message: live.some((d) => d.tiers.length) ? "Tiers in use sit above the peaks." : `No threshold is in use. When one is, it belongs above ${sp.shape === "two" ? "each of the 2 peaks" : "the peak"}, not at the average (${sp.mean.toFixed(0)}).` });
    const g = worst("wrong_gift");
    out.push(g.level !== "pass" ? { id: "wrong_gift", level: g.level, message: `A gift that costs too much, has no price, or nobody asked for: ${g.names.join(", ")}.` } : { id: "wrong_gift", level: "pass", message: live.some((d) => d.adds.some((a) => isGift(a.kind))) ? "Gifts in use are cheap against the margin and wanted." : "No gift is in use." });
    const flat = econ?.promos.length ?? 0;
    const discounts = live.filter((d) => d.mechanic === "discount").length;
    out.push(!econ ? { id: "promo_calendar", level: "unknown", message: "No record of past promotions yet." } : flat > 2 || discounts > 2 ? { id: "promo_calendar", level: "fail", message: `${flat} flat discounts in the last 12 months${discounts > 2 ? `, and ${discounts} discount offers in use` : ""}. More than 2 a year teaches buyers that the full price is not the price.` } : { id: "promo_calendar", level: "pass", message: `${flat} flat discount${flat === 1 ? "" : "s"} in the last 12 months.` });
    const q1 = (econ?.monthly ?? []).filter((x) => /-(01|02|03)$/.test(x.month));
    const dip = q1.length ? q1.reduce((a, x) => a + x.index, 0) / q1.length : null;
    const planned = designs.some((d) => Q1.test(d.when));
    out.push(dip == null ? { id: "q1_as_season", level: "unknown", message: "No monthly sales yet, so the first quarter cannot be read." } : dip < 90 && !planned ? { id: "q1_as_season", level: "fail", message: `January to March ran at ${Math.round(dip)}% of an average month, and no offer is planned for it. It is the best quarter to test one.` } : { id: "q1_as_season", level: "pass", message: dip < 90 ? "The first quarter dips, and an offer is planned for it." : `The first quarter held up (${Math.round(dip)}% of an average month).` });
    return out;
}
