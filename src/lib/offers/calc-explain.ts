import { contributionAt, hold, liftAt, unitsAt, waterfall, type Economics } from "./economics";
export interface CalcInputs {
    price: number;
    unit_cost: number;
    shipping: number[];
    fee_rate: number;
    roas: number;
    history: Economics["discount_history"];
}
export interface CalcDraft {
    price: string;
    unit_cost: string;
    shipping: string[];
    fee: string;
    roas: string;
    history: {
        discount: string;
        units: string;
        lift: string;
    }[];
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const r1 = (n: number) => Math.round(n * 10) / 10;
export const toDraft = (i: CalcInputs): CalcDraft => ({
    price: String(i.price),
    unit_cost: String(i.unit_cost),
    shipping: i.shipping.map(String),
    fee: String(r1(i.fee_rate * 100)),
    roas: String(i.roas),
    history: [...i.history].sort((a, b) => a.discount - b.discount).map((h) => ({ discount: String(r1(h.discount * 100)), units: String(h.units), lift: String(r1(h.roas_lift * 100)) })),
});
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
export function readDraft(d: CalcDraft, base: CalcInputs): {
    inputs: CalcInputs;
    bad: string[];
} {
    const bad: string[] = [];
    const take = (key: string, s: string, ok: (n: number) => boolean, fallback: number) => {
        const n = num(s);
        if (Number.isFinite(n) && ok(n))
            return n;
        bad.push(key);
        return fallback;
    };
    const history: CalcInputs["history"] = [];
    d.history.forEach((h, k) => {
        const discount = num(h.discount);
        const units = num(h.units);
        const lift = num(h.lift);
        if (Number.isFinite(discount) && discount > 0 && discount <= 90 && Number.isFinite(units) && units >= 0.5 && Number.isFinite(lift) && lift > -100)
            history.push({ discount: discount / 100, units, roas_lift: lift / 100 });
        else
            bad.push(`history-${k}`);
    });
    return {
        inputs: {
            price: take("price", d.price, (n) => n > 0, base.price),
            unit_cost: take("unit_cost", d.unit_cost, (n) => n >= 0, base.unit_cost),
            shipping: d.shipping.map((s, k) => take(`ship-${k + 1}`, s, (n) => n >= 0, base.shipping[k] ?? base.shipping[base.shipping.length - 1] ?? 0)),
            fee_rate: take("fee", d.fee, (n) => n >= 0 && n <= 30, base.fee_rate * 100) / 100,
            roas: take("roas", d.roas, (n) => n > 0, base.roas),
            history: history.sort((a, b) => a.discount - b.discount),
        },
        bad,
    };
}
const flat = (i: CalcInputs) => JSON.stringify([i.price, i.unit_cost, i.shipping, r2(i.fee_rate * 1000), i.roas, [...i.history].sort((a, b) => a.discount - b.discount).map((h) => [r2(h.discount * 1000), h.units, r2(h.roas_lift * 1000)])]);
export const sameInputs = (a: CalcInputs, b: CalcInputs) => flat(a) === flat(b);
export interface Step {
    id: "units" | "pays" | "kept" | "break_even" | "today" | "needed" | "reached" | "leaves";
    label: string;
    value: string;
    how: string;
    means: string;
}
export function explainRow(i: CalcInputs, discount: number, sym: string): Step[] {
    const m = (n: number) => `${n < 0 ? "-" : ""}${sym}${Math.abs(n).toFixed(2)}`;
    const inSum = (n: number) => (n < 0 ? `(${m(n)})` : m(n));
    const x = (n: number) => (Number.isFinite(n) ? `${n.toFixed(2)}x` : "none");
    const off = (d: number) => `${r1(d * 100)}%`;
    const u = (n: number) => `${r2(n).toFixed(2)} unit${r2(n) === 1 ? "" : "s"}`;
    const full = waterfall({ revenue: i.price, units: 1, unit_cost: i.unit_cost, shipping: i.shipping, fee_rate: i.fee_rate });
    const today = contributionAt(full, i.roas);
    const units = unitsAt(i.history, discount);
    const w = waterfall({ revenue: i.price * (1 - discount) * units, units, unit_cost: i.unit_cost, shipping: i.shipping, fee_rate: i.fee_rate });
    const lift = liftAt(i.history, discount);
    const reached = r2(i.roas * (1 + lift));
    const need = hold(w, today);
    const ads = reached > 0 ? r2(w.revenue / reached) : 0;
    const leaves = contributionAt(w, reached);
    const pts = [...i.history].sort((a, b) => a.discount - b.discount);
    const last = pts[pts.length - 1];
    const exact = pts.find((p) => Math.abs(p.discount - discount) < 1e-9);
    const above = pts.find((p) => p.discount > discount);
    const below = [...pts].reverse().find((p) => p.discount < discount);
    let unitsHow: string;
    if (!pts.length)
        unitsHow = "No past sale is entered, so an order stays at 1 unit at every discount.";
    else if (discount <= 0)
        unitsHow = `No discount, so the order is what it is at full price: ${u(units)}.`;
    else if (exact)
        unitsHow = `A sale at ${off(exact.discount)} off held ${u(exact.units)} an order.`;
    else if (!above)
        unitsHow = `The largest sale entered is ${off(last.discount)} off, at ${u(last.units)}. Past it nothing more is assumed, so it stays there.`;
    else
        unitsHow = `${below ? `${u(below.units)} at ${off(below.discount)} off` : `${u(Math.min(1, ...pts.map((p) => p.units)))} at full price`}, ${u(above.units)} at ${off(above.discount)} off. ${off(discount)} sits between them on a straight line: ${u(units)}.`;
    const cmp = r2(leaves - today);
    return [
        { id: "units", label: "Units an order", value: r2(units).toFixed(2), how: unitsHow, means: "How many units the average order holds at this discount. It comes from what past sales did, in the table above." },
        { id: "pays", label: "Pays", value: m(w.revenue), how: `${m(i.price)} × ${off(1 - discount)} of the price × ${r2(units).toFixed(2)} units = ${m(w.revenue)}.`, means: "What the customer pays for the average order." },
        {
            id: "kept",
            label: "Kept",
            value: m(w.margin),
            how: `${m(w.revenue)} - ${m(w.goods)} goods (${r2(units).toFixed(2)} × ${m(i.unit_cost)}) - ${m(w.shipping)} to pick, pack and post - ${m(w.fees)} payment fees (${r1(i.fee_rate * 100)}% of what is paid) = ${m(w.margin)}.`,
            means: "What is left of the order before any ad is paid for.",
        },
        {
            id: "break_even",
            label: "Breaks even",
            value: x(w.break_even),
            how: w.margin > 0 ? `${m(w.revenue)} paid ÷ ${m(w.margin)} kept = ${x(w.break_even)}.` : "Nothing is kept, so no return on ad spend is enough.",
            means: "The return on ad spend at which the order makes exactly nothing. Below it, every order loses money.",
        },
        {
            id: "today",
            label: "Today, at full price",
            value: m(today),
            how: `A full-price order keeps ${m(full.margin)} and costs ${m(r2(i.price / i.roas))} in ads (${m(i.price)} ÷ ${x(i.roas)}), so it leaves ${m(today)}.`,
            means: "What 1 order leaves now, with no discount. Every row is compared with this.",
        },
        {
            id: "needed",
            label: "Needed",
            value: x(need.roas),
            how: need.cac > 0 ? `To leave ${m(today)} again, the ads may cost at most ${m(w.margin)} - ${inSum(today)} = ${m(need.cac)}. ${m(w.revenue)} ÷ ${m(need.cac)} = ${x(need.roas)}.` : `The order keeps ${m(w.margin)}, which is less than the ${m(today)} an order leaves today even with free ads.`,
            means: "The return on ad spend the ads must reach for this discount to leave what a full-price order leaves today.",
        },
        {
            id: "reached",
            label: "Reached",
            value: x(reached),
            how: lift !== 0 ? `Today's ${x(i.roas)}, and the ads were ${r1(Math.abs(lift) * 100)}% ${lift > 0 ? "more" : "less"} efficient at a sale this size: ${i.roas} × ${r2(1 + lift)} = ${x(reached)}.` : `No past sale says the ads do better at this discount, so today's ${x(i.roas)}.`,
            means: "The return on ad spend a sale this size is expected to reach, from what past sales did.",
        },
        {
            id: "leaves",
            label: "Leaves",
            value: m(leaves),
            how: `${m(w.margin)} kept - ${m(ads)} in ads (${m(w.revenue)} ÷ ${x(reached)}) = ${m(leaves)}. ${cmp === 0 ? "The same as full price." : `${m(Math.abs(cmp))} ${cmp > 0 ? "more" : "less"} than full price leaves.`}${Number.isFinite(need.roas) && need.roas > reached * 1.02 ? ` The ads would need ${x(need.roas)} and reach ${x(reached)}.` : ""}`,
            means: "What 1 order leaves after the ads are paid for. The row where this is highest is the discount that leaves the most.",
        },
    ];
}
