import { spread, waterfall, type Economics } from "./economics";
import type { OfferBrand } from "./evaluate";
import type { CheckContext, PathFacts, PathNumbers } from "./path";
import { isDesigned } from "./types";
export function pathFacts(ob: OfferBrand, econ: Economics | null, hasGuarantee: boolean): PathFacts {
    const s = spread(econ?.order_values ?? []);
    const priced = ob.offers.filter((o) => !isDesigned(o.id));
    const hero = econ?.mix.length ? [...econ.mix].sort((a, b) => b.share - a.share)[0] : null;
    const cost = econ?.products.find((p) => p.product_id === (hero?.product_id ?? ob.products[0]?.id));
    const full = econ && cost && priced.length ? waterfall({ revenue: Math.max(...priced.map((o) => o.price)), units: 1, unit_cost: cost.unit_cost, shipping: econ.shipping, fee_rate: econ.fee_rate }) : null;
    const repeat = econ?.retention[0] ?? null;
    return {
        margin_rate: full ? full.margin_rate : null,
        peaks: s.shape,
        range: ob.products.length <= 1 || (hero?.share ?? 0) >= 0.6 ? "hero" : "many",
        repeat: repeat == null ? (ob.products.some((p) => p.cycle_days) ? "yes" : "unknown") : repeat >= 0.35 ? "yes" : "no",
        has_guarantee: hasGuarantee,
        flat_discounts: econ?.promos.length ?? 0,
    };
}
export function checkContext(econ: Economics | null, sym: string, audiences: ("new" | "returning" | "all" | null)[], forAudience: "new" | "returning" | "all"): CheckContext {
    const s = spread(econ?.order_values ?? []);
    const q1 = (econ?.monthly ?? []).filter((m) => /-(01|02|03)$/.test(m.month));
    const other = forAudience === "new" ? "returning" : "new";
    return {
        spread: s.shape === "unknown" ? null : s,
        flat_discounts: econ?.promos.length ?? 0,
        quiet_quarter_index: q1.length ? q1.reduce((a, m) => a + m.index, 0) / q1.length : null,
        other_audience_covered: audiences.includes(other) || (other === "returning" && !!econ?.has.returning_offer),
        sym,
    };
}
export function startNumbers(econ: Economics | null, price: number, productId: string): PathNumbers {
    const cost = econ?.products.find((p) => p.product_id === productId) ?? econ?.products[0];
    return { price, unit_cost: cost?.unit_cost ?? 0, shipping: econ?.shipping.slice(0, 3) ?? [], fee_rate: econ?.fee_rate ?? 0, units_before: 1, units_after: 1, discount: 0, extras_cost: 0, roas: econ?.roas ?? 0 };
}
