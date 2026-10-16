import { formatMoney } from "../money";
export interface Economics {
    simulated: boolean;
    costs_entered: boolean;
    history_entered?: boolean;
    source: string;
    period: string;
    currency: string;
    products: {
        product_id: string;
        unit_cost: number;
        cycle_days?: number;
    }[];
    shipping: number[];
    fee_rate: number;
    roas: number;
    retention: number[];
    reorder_offer_id?: string;
    mix: {
        product_id: string;
        share: number;
    }[];
    order_values: {
        from: number;
        to: number;
        share: number;
    }[];
    discount_history: {
        discount: number;
        units: number;
        roas_lift: number;
    }[];
    promos: {
        name: string;
        month: string;
        discount: number;
    }[];
    monthly: {
        month: string;
        index: number;
    }[];
    has: {
        cart_addon: boolean;
        checkout_addon: boolean;
        post_purchase: boolean;
        returning_offer: boolean;
    };
}
const r2 = (n: number) => Math.round(n * 100) / 100;
export function shippingFor(shipping: number[], units: number): number {
    if (!shipping.length)
        return 0;
    const n = Math.max(1, Math.round(units));
    if (n <= shipping.length)
        return shipping[n - 1];
    const last = shipping[shipping.length - 1];
    const step = shipping.length > 1 ? last - shipping[shipping.length - 2] : last;
    return r2(last + step * (n - shipping.length));
}
const shippingAvg = (shipping: number[], units: number) => {
    const lo = Math.floor(units);
    const f = units - lo;
    return lo < 1 ? shippingFor(shipping, 1) : shippingFor(shipping, lo) * (1 - f) + shippingFor(shipping, lo + 1) * f;
};
export interface Waterfall {
    revenue: number;
    goods: number;
    shipping: number;
    fees: number;
    extras: number;
    margin: number;
    margin_rate: number;
    break_even: number;
}
export function waterfall(i: {
    revenue: number;
    units: number;
    unit_cost: number;
    shipping: number[];
    fee_rate: number;
    extras?: number;
}): Waterfall {
    const goods = i.units * i.unit_cost;
    const shipping = Number.isInteger(i.units) ? shippingFor(i.shipping, i.units) : shippingAvg(i.shipping, i.units);
    const fees = i.revenue * i.fee_rate;
    const extras = i.extras ?? 0;
    const margin = i.revenue - goods - shipping - fees - extras;
    return { revenue: r2(i.revenue), goods: r2(goods), shipping: r2(shipping), fees: r2(fees), extras: r2(extras), margin: r2(margin), margin_rate: i.revenue > 0 ? margin / i.revenue : 0, break_even: margin > 0 ? r2(i.revenue / margin) : Infinity };
}
export const contributionAt = (w: Waterfall, roas: number) => r2(w.margin - (roas > 0 ? w.revenue / roas : 0));
export function hold(w: Waterfall, target: number): {
    cac: number;
    roas: number;
} {
    const cac = r2(w.margin - target);
    return { cac, roas: cac > 0 ? r2(w.revenue / cac) : Infinity };
}
function along(history: Economics["discount_history"], discount: number, pick: (h: Economics["discount_history"][number]) => number, at0: number): number {
    const pts = [{ d: 0, v: at0 }, ...[...history].sort((a, b) => a.discount - b.discount).map((h) => ({ d: h.discount, v: pick(h) }))];
    if (discount <= 0)
        return at0;
    for (let i = 1; i < pts.length; i++) {
        if (discount <= pts[i].d) {
            const a = pts[i - 1];
            const b = pts[i];
            return a.v + ((b.v - a.v) * (discount - a.d)) / (b.d - a.d || 1);
        }
    }
    return pts[pts.length - 1].v;
}
export const unitsAt = (history: Economics["discount_history"], discount: number) => along(history, discount, (h) => h.units, history.length ? Math.min(1, ...history.map((h) => h.units)) : 1);
export const liftAt = (history: Economics["discount_history"], discount: number) => along(history, discount, (h) => h.roas_lift, 0);
export interface CurvePoint {
    discount: number;
    units: number;
    revenue: number;
    margin: number;
    break_even: number;
    needed: number;
    reachable: number;
    contribution: number;
}
export function discountCurve(i: {
    price: number;
    unit_cost: number;
    shipping: number[];
    fee_rate: number;
    roas: number;
    history: Economics["discount_history"];
}): {
    points: CurvePoint[];
    today: number;
    best: number;
} {
    const full = waterfall({ revenue: i.price, units: 1, unit_cost: i.unit_cost, shipping: i.shipping, fee_rate: i.fee_rate });
    const today = contributionAt(full, i.roas);
    const points: CurvePoint[] = [];
    for (let pct = 0; pct <= 60; pct += 5) {
        const discount = pct / 100;
        const units = unitsAt(i.history, discount);
        const w = waterfall({ revenue: i.price * (1 - discount) * units, units, unit_cost: i.unit_cost, shipping: i.shipping, fee_rate: i.fee_rate });
        const reachable = r2(i.roas * (1 + liftAt(i.history, discount)));
        points.push({ discount, units: r2(units), revenue: w.revenue, margin: w.margin, break_even: w.break_even, needed: hold(w, today).roas, reachable, contribution: contributionAt(w, reachable) });
    }
    const top = points.reduce((a, b) => (b.contribution > a.contribution + 0.005 ? b : a), points[0]);
    return { points, today, best: top.discount };
}
export interface Spread {
    mean: number;
    peaks: {
        at: number;
        from: number;
        to: number;
        share: number;
    }[];
    shape: "one" | "two" | "unknown";
}
export function spread(bands: Economics["order_values"]): Spread {
    const b = [...bands].sort((x, y) => x.from - y.from);
    const total = b.reduce((a, x) => a + x.share, 0);
    if (!b.length || total <= 0)
        return { mean: 0, peaks: [], shape: "unknown" };
    const mid = (x: (typeof b)[number]) => (x.from + (Number.isFinite(x.to) && x.to > x.from ? x.to : x.from * 1.25)) / 2;
    const mean = r2(b.reduce((a, x) => a + mid(x) * x.share, 0) / total);
    const tops = b.filter((x, i) => x.share >= (b[i - 1]?.share ?? 0) && x.share > (b[i + 1]?.share ?? 0) && x.share / total >= 0.1);
    const peaks = tops
        .filter((p, k) => {
        if (k === 0)
            return true;
        const prev = tops[k - 1];
        const between = b.filter((x) => x.from > prev.from && x.from < p.from);
        return between.some((x) => x.share < Math.min(prev.share, p.share) * 0.8);
    })
        .sort((x, y) => y.share - x.share)
        .slice(0, 2)
        .sort((x, y) => x.from - y.from)
        .map((p) => ({ at: r2(mid(p)), from: p.from, to: p.to, share: Math.round((p.share / total) * 100) / 100 }));
    return { mean, peaks, shape: peaks.length >= 2 ? "two" : "one" };
}
export const thresholdsFor = (s: Spread) => s.peaks.map((p) => ({ peak: p.at, from: r2((Number.isFinite(p.to) ? p.to : p.at) * 1.1), to: r2((Number.isFinite(p.to) ? p.to : p.at) * 1.3) }));
export const addonProfit = (a: {
    take_rate: number;
    price: number;
    margin: number;
}) => r2(a.take_rate * a.price * a.margin);
export function overCycles(first: Waterfall, reorder: Waterfall, retention: number[], cycles: number, roas: number): number {
    let total = contributionAt(first, roas);
    for (let k = 0; k < cycles - 1; k++)
        total += (retention[k] ?? retention[retention.length - 1] ?? 0) * reorder.margin;
    return r2(total);
}
export const money = (n: number, currency = "USD") => formatMoney(n, currency);
export const times = (n: number) => (Number.isFinite(n) ? `${n.toFixed(2)}x` : "no return is enough");
export const pct = (n: number) => `${Math.round(n * 100)}%`;
