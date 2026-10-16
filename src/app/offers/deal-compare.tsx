"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEAL_SHAPES, creditVsCash, dealOrder, giftThreshold, giftVsDepth, type DealShapeId, type OrderCosts } from "@/lib/offers/plays";
import { cn } from "@/lib/utils";
const n = (s: string, max = Infinity) => {
    const v = Number(s);
    return Number.isFinite(v) && v >= 0 ? Math.min(max, v) : 0;
};
function Field({ label, value, onChange, testid, hint }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    testid: string;
    hint?: string;
}) {
    return (<label className="flex items-center gap-2 text-sm">
      <span className="min-w-0 flex-1">
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Input type="number" step="0.01" inputMode="decimal" className="w-24 text-right tabular-nums" value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid}/>
    </label>);
}
function Rows({ rows, win }: {
    rows: {
        name: string;
        pays: string;
        kept: string;
    }[];
    win: number | null;
}) {
    return (<table className="mt-3 w-full text-sm">
      <thead className="text-right text-xs text-muted-foreground">
        <tr>
          <th className="pb-1 text-left font-medium"/>
          <th className="pb-1 font-medium">Pays</th>
          <th className="pb-1 font-medium">Kept before ads</th>
        </tr>
      </thead>
      <tbody className="divide-y text-right tabular-nums">
        {rows.map((r, i) => (<tr key={r.name} className={cn(i === win && "font-medium text-emerald-700")}>
            <td className="py-1.5 text-left">{r.name}</td>
            <td className="py-1.5">{r.pays}</td>
            <td className="py-1.5">{r.kept}</td>
          </tr>))}
      </tbody>
    </table>);
}
export function DealCompare({ costs, sym, median }: {
    costs: OrderCosts;
    sym: string;
    median: number | null;
}) {
    const [shape, setShape] = useState<DealShapeId>("bogo");
    const [g, setG] = useState({ units: "2", deep: "40", light: "20", cost: "4", value: "20" });
    const [c, setC] = useState({ credit: "10", redeem: "60" });
    const m = (v: number) => `${v < 0 ? "-" : ""}${sym}${Math.abs(v).toFixed(2)}`;
    const pc = (v: number) => `${Math.round(v * 1000) / 10}%`;
    const s = DEAL_SHAPES.find((x) => x.id === shape)!;
    const deal = dealOrder(s, costs);
    const gift = giftVsDepth({ ...costs, units: Math.max(1, Math.round(n(g.units, 24))), deep: n(g.deep, 90) / 100, light: n(g.light, 90) / 100, gift_cost: n(g.cost), gift_value: n(g.value) });
    const credit = creditVsCash({ credit: n(c.credit), price: costs.price, unit_cost: costs.unit_cost, redeem: n(c.redeem, 100) / 100 });
    const level = median ? giftThreshold(median) : null;
    return (<section data-testid="deal-compare">
      <div className="flex flex-wrap items-baseline gap-x-3 border-t border-rule pt-2">
        <h3 className="display text-2xl">Deals that are not a flat discount</h3>
        <p className="text-sm text-muted-foreground">The same price, costs and fees as above. Nothing here is saved.</p>
      </div>
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border p-3.5" data-testid="deal-bogo">
          <div className="text-sm font-semibold">Buy some, get some</div>
          <Select value={shape} onValueChange={(v) => setShape(v as DealShapeId)}>
            <SelectTrigger className="mt-2 w-full" data-testid="deal-shape">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEAL_SHAPES.map((x) => (<SelectItem key={x.id} value={x.id}>
                  {x.label}
                </SelectItem>))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-sm" data-testid="deal-effective">
            Works out at <span className="font-semibold">{pc(deal.discount)} off</span>, on {deal.units} units in 1 parcel.
          </p>
          <Rows win={deal.deal.margin > deal.flat.margin ? 0 : 1} rows={[
            { name: s.label, pays: m(deal.deal.revenue), kept: m(deal.deal.margin) },
            { name: `${pc(deal.discount)} off 1 unit`, pays: m(deal.flat.revenue), kept: m(deal.flat.margin) },
            { name: "Full price, 1 unit", pays: m(deal.full.revenue), kept: m(deal.full.margin) },
        ]}/>
          <p className="mt-2 text-xs text-muted-foreground">The price is cut by the same share either way. The deal moves more units for 1 shipping cost, so judge it against the flat discount, and both against full price.</p>
        </div>

        <div className="rounded-lg border p-3.5" data-testid="deal-gift">
          <div className="text-sm font-semibold">A gift, against a deeper discount</div>
          <div className="mt-2 space-y-2">
            <Field label="Units in the order" value={g.units} onChange={(v) => setG({ ...g, units: v })} testid="gift-units"/>
            <Field label="The deep discount, %" value={g.deep} onChange={(v) => setG({ ...g, deep: v })} testid="gift-deep"/>
            <Field label="The lighter discount, %" value={g.light} onChange={(v) => setG({ ...g, light: v })} testid="gift-light"/>
            <Field label={`What the gift costs to make (${sym})`} value={g.cost} onChange={(v) => setG({ ...g, cost: v })} testid="gift-cost"/>
            <Field label={`What the gift sells for (${sym})`} value={g.value} onChange={(v) => setG({ ...g, value: v })} testid="gift-value"/>
          </div>
          <Rows win={gift.better === "gift" ? 1 : gift.better === "depth" ? 0 : null} rows={[
            { name: `${Math.round(n(g.deep, 90))}% off`, pays: m(gift.depth.revenue), kept: m(gift.depth.margin) },
            { name: `${Math.round(n(g.light, 90))}% off and the gift`, pays: m(gift.gift.revenue), kept: m(gift.gift.margin) },
        ]}/>
          <p className="mt-2 text-sm" data-testid="gift-verdict">
            {gift.better === "same" ? "Both keep the same." : `${gift.better === "gift" ? "The gift" : "The deep discount"} keeps ${m(gift.by)} more an order.`}{" "}
            <span className="text-muted-foreground">
              The buyer saves {m(gift.buyer.depth_saves)}, or saves {m(gift.buyer.gift_saves)} and gets something that sells for {m(gift.buyer.gift_value)}.
            </span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {level ? `Set the spend level at ${sym}${level.from} to ${sym}${level.to}: the median order (${m(median!)}) plus 20 to 30%. ` : ""}
            Never gift the product buyers come for. Name the gift and its price, and know how many there are.
          </p>
        </div>

        <div className="rounded-lg border p-3.5" data-testid="deal-credit">
          <div className="text-sm font-semibold">Credit on the next order, against money off this one</div>
          <div className="mt-2 space-y-2">
            <Field label={`The sum (${sym})`} value={c.credit} onChange={(v) => setC({ ...c, credit: v })} testid="credit-sum"/>
            <Field label="Share of credit that gets spent, %" hint="An assumption until the brand has its own figure" value={c.redeem} onChange={(v) => setC({ ...c, redeem: v })} testid="credit-redeem"/>
          </div>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y tabular-nums">
              <tr>
                <td className="py-1.5">Off today&apos;s order, it costs</td>
                <td className="py-1.5 text-right">{m(credit.cash_cost)}</td>
              </tr>
              <tr className="font-medium text-emerald-700">
                <td className="py-1.5">As credit, it costs</td>
                <td className="py-1.5 text-right" data-testid="credit-cost">{m(credit.credit_cost)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted-foreground">Credit is paid in goods on a second order: what is spent costs what those goods cost to make, and what is never spent costs nothing. It also brings the buyer back. Say the expiry date on it.</p>
        </div>
      </div>
    </section>);
}
