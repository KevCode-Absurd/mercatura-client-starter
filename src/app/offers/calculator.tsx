"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { explainRow, readDraft, sameInputs, toDraft, type CalcDraft, type CalcInputs } from "@/lib/offers/calc-explain";
import { discountCurve, type Economics } from "@/lib/offers/economics";
import { medianOrder } from "@/lib/offers/plays";
import { isDesigned } from "@/lib/offers/types";
import { cn } from "@/lib/utils";
import { saveSalesRecordAction } from "./calc-actions";
import { CurveChart } from "./charts";
import { DealCompare } from "./deal-compare";
import type { Ctx } from "./offer-parts";
const x = (n: number) => (Number.isFinite(n) ? `${n.toFixed(2)}x` : "none");
const kept = new Map<string, {
    draft: CalcDraft | null;
    offerId: string;
    productId: string;
}>();
function Num({ label, value, onChange, bad, changed, testid, hint }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    bad?: boolean;
    changed?: boolean;
    testid: string;
    hint?: string;
}) {
    return (<label className="flex items-center gap-2 text-sm">
      <span className="min-w-0 flex-1">
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Input type="number" step="0.01" inputMode="decimal" className={cn("w-24 text-right tabular-nums", changed && "border-primary", bad && "border-red-500")} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={bad || undefined} data-testid={testid}/>
    </label>);
}
export function Calculator({ ctx, econ, brand, onSaved }: {
    ctx: Ctx;
    econ: Economics | null;
    brand: string;
    onSaved: (e: Economics) => void;
}) {
    const [saving, startSave] = useTransition();
    const priced = ctx.ob.offers.filter((o) => !isDesigned(o.id));
    const was = kept.get(brand);
    const [offerId, setOfferId] = useState(was?.offerId ?? (econ?.reorder_offer_id && priced.some((o) => o.id === econ.reorder_offer_id) ? econ.reorder_offer_id : (priced[0]?.id ?? "")));
    const [productId, setProductId] = useState(was?.productId ?? econ?.products[0]?.product_id ?? "");
    const [draft, setDraft] = useState<CalcDraft | null>(was?.draft ?? null);
    const [row, setRow] = useState<number | null>(null);
    const offer = priced.find((o) => o.id === offerId);
    const cost = econ?.products.find((p) => p.product_id === productId);
    const base: CalcInputs | null = useMemo(() => (econ && offer && cost ? { price: offer.price, unit_cost: cost.unit_cost, shipping: econ.shipping, fee_rate: econ.fee_rate, roas: econ.roas, history: econ.discount_history } : null), [econ, offer, cost]);
    useEffect(() => {
        kept.set(brand, { draft, offerId, productId });
    }, [brand, draft, offerId, productId]);
    if (!econ || !base)
        return <p className="text-sm text-muted-foreground" data-testid="calculator-empty">Enter the brand&apos;s costs under &ldquo;Where it stands&rdquo; first: the calculator needs what a unit costs, what an order costs to ship and the return the ads run at.</p>;
    const fresh = toDraft(base);
    const d = draft ?? fresh;
    const { inputs, bad } = readDraft(d, base);
    const changed = !!draft && (!sameInputs(inputs, base) || bad.length > 0);
    const set = (patch: Partial<CalcDraft>) => setDraft({ ...d, ...patch });
    const setHistory = (k: number, patch: Partial<CalcDraft["history"][number]>) => set({ history: d.history.map((h, i) => (i === k ? { ...h, ...patch } : h)) });
    const isBad = (key: string) => bad.includes(key);
    const pickOffer = (id: string) => {
        setOfferId(id);
        const o = priced.find((p) => p.id === id);
        if (draft && o)
            setDraft({ ...draft, price: String(o.price) });
    };
    const pickProduct = (id: string) => {
        setProductId(id);
        const p = econ.products.find((q) => q.product_id === id);
        if (draft && p)
            setDraft({ ...draft, unit_cost: String(p.unit_cost) });
    };
    const c = discountCurve(inputs);
    const sym = ctx.sym;
    const m = (n: number) => `${n < 0 ? "-" : ""}${sym}${Math.abs(n).toFixed(2)}`;
    const shown = row != null && c.points.some((p) => p.discount === row) ? row : c.best > 0 ? c.best : 0.2;
    const steps = explainRow(inputs, shown, sym);
    const historyIsBrands = JSON.stringify(inputs.history) === JSON.stringify([...base.history].sort((a, b) => a.discount - b.discount));
    const historyBad = bad.some((b) => b.startsWith("history-"));
    const historySimulated = econ.simulated && !econ.history_entered;
    const saveHistory = () => startSave(async () => {
        const res = await saveSalesRecordAction(inputs.history);
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(inputs.history.length ? `Saved: ${inputs.history.length} sale${inputs.history.length === 1 ? "" : "s"} on ${brand}'s record. The failure checks and the offer designer use them from now on.` : `Saved: no past sale on ${brand}'s record.`);
        onSaved(res.economics);
    });
    return (<div className="space-y-5" data-testid="calculator">
      <div className="max-w-3xl">
        <h2 className="display text-2xl">What a flat discount really costs</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">A discount lowers the price of each unit and raises the units in each order. The return needed to break even rises steadily. The return needed to leave what an order leaves today rises much faster. Somewhere in between is the 1 discount that leaves the most; past it, every extra point loses money.</p>
      </div>

      <section className="rounded-lg border p-3.5" data-testid="calc-inputs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="text-sm font-semibold">The inputs</h3>
          <p className="min-w-0 flex-1 basis-72 text-xs text-muted-foreground">Change any of them: the chart and the table follow as you type. They start from {brand}&apos;s numbers. What you type is not saved, so try what you like. The 1 thing that can be kept is the record of what a sale does, with its own button.</p>
          {changed && (<>
              <span className="rounded-sm bg-signal px-1.5 py-0.5 text-xs font-semibold text-signal-foreground" data-testid="calc-changed">
                Your numbers
              </span>
              <Button size="sm" variant="outline" onClick={() => setDraft(null)} data-testid="calc-reset">
                <RotateCcw className="size-3.5"/>
                Put back the brand&apos;s numbers
              </Button>
            </>)}
        </div>

        <div className="mt-3 grid gap-x-6 gap-y-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1.35fr)]">
          <div className="space-y-2.5">
            <div className="text-xs font-medium">The order ({sym})</div>
            <div>
              <Label className="text-xs text-muted-foreground">Start from a price point</Label>
              <Select value={offerId} onValueChange={pickOffer}>
                <SelectTrigger className="mt-1 w-full" data-testid="calc-offer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priced.map((o) => (<SelectItem key={o.id} value={o.id}>
                      {o.name} ({sym}{o.price})
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Num label="Price of 1 unit, before any discount" value={d.price} onChange={(v) => set({ price: v })} bad={isBad("price")} changed={d.price !== fresh.price} testid="calc-price"/>
            <div>
              <Label className="text-xs text-muted-foreground">Start from a product&apos;s cost</Label>
              <Select value={productId} onValueChange={pickProduct}>
                <SelectTrigger className="mt-1 w-full" data-testid="calc-product">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {econ.products.map((p) => (<SelectItem key={p.product_id} value={p.product_id}>
                      {ctx.ob.products.find((pr) => pr.id === p.product_id)?.name ?? p.product_id}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Num label="What 1 unit costs to make" value={d.unit_cost} onChange={(v) => set({ unit_cost: v })} bad={isBad("unit_cost")} changed={d.unit_cost !== fresh.unit_cost} testid="calc-unit-cost"/>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-medium">Costs of an order, and the ads</div>
            {d.shipping.map((s, k) => (<Num key={k} label={`Pick, pack and post ${k + 1} unit${k ? "s" : ""}`} value={s} onChange={(v) => set({ shipping: d.shipping.map((y, i) => (i === k ? v : y)) })} bad={isBad(`ship-${k + 1}`)} changed={s !== fresh.shipping[k]} testid={`calc-ship-${k + 1}`}/>))}
            <Num label="Payment fees, % of what is paid" value={d.fee} onChange={(v) => set({ fee: v })} bad={isBad("fee")} changed={d.fee !== fresh.fee} testid="calc-fee"/>
            <Num label="Return on ad spend today" hint="Revenue for each 1 spent on ads, first orders" value={d.roas} onChange={(v) => set({ roas: v })} bad={isBad("roas")} changed={d.roas !== fresh.roas} testid="calc-roas"/>
          </div>

          <div className="lg:col-span-2 xl:col-span-1" data-testid="calc-history">
            <div className="text-xs font-medium">What a sale does</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              At each size of sale: the units in the average order, and how much more revenue each 1 of ad spend brought than at full price. Discounts between 2 rows are read off a straight line between them.{historyIsBrands && historySimulated ? " These rows are simulated: replace them with what the brand's own sales did, and save." : ""}
            </p>
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-1 font-medium">Discount, %</th>
                  <th className="pb-1 font-medium">Units an order</th>
                  <th className="pb-1 font-medium">Ads better by, %</th>
                  <th className="w-8"/>
                </tr>
              </thead>
              <tbody>
                {d.history.map((h, k) => (<tr key={k} data-testid={`calc-history-${k}`}>
                    {(["discount", "units", "lift"] as const).map((f) => (<td key={f} className="py-0.5 pr-2">
                        <Input type="number" step={f === "units" ? "0.01" : "1"} inputMode="decimal" className={cn("h-8 w-full text-right tabular-nums", h[f] !== fresh.history[k]?.[f] && "border-primary", isBad(`history-${k}`) && "border-red-500")} value={h[f]} onChange={(e) => setHistory(k, { [f]: e.target.value })} aria-label={`${f === "discount" ? "Discount" : f === "units" ? "Units an order" : "Ads better by"}, row ${k + 1}`} data-testid={`calc-history-${k}-${f}`}/>
                      </td>))}
                    <td className="py-0.5">
                      <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => set({ history: d.history.filter((_, i) => i !== k) })} aria-label={`Remove row ${k + 1}`} data-testid={`calc-history-${k}-remove`}>
                        <X className="size-3.5"/>
                      </button>
                    </td>
                  </tr>))}
              </tbody>
            </table>
            <Button size="sm" variant="ghost" className="mt-1 h-7 px-2 text-xs" onClick={() => set({ history: [...d.history, { discount: "", units: "", lift: "" }] })} data-testid="calc-history-add">
              <Plus className="size-3.5"/>
              Add a sale
            </Button>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-2">
              <Button size="sm" variant="outline" disabled={historyIsBrands || historyBad || saving} onClick={saveHistory} data-testid="calc-history-save">
                <Save className="size-3.5"/>
                Save as the brand&apos;s record
              </Button>
              <span className="min-w-0 flex-1 basis-48 text-xs text-muted-foreground" data-testid="calc-history-state">
                {!historyIsBrands
            ? historyBad
                ? "Finish or remove the row marked red, then save."
                : "Saving keeps these rows for this brand. The failure checks and the offer designer use them from then on. The other fields are not saved."
            : econ.history_entered
                ? `These rows are ${brand}'s own record.`
                : "Change a row to what a real sale did, and it can be saved."}
              </span>
            </div>
          </div>
        </div>
        {bad.length > 0 && (<p className="mt-3 text-xs text-red-700" data-testid="calc-bad">
            {bad.some((b) => b.startsWith("history-")) ? "A sale needs all 3 figures (a discount of 1 to 90, at least 0.5 units) and is left out until it has them. " : ""}
            {bad.some((b) => !b.startsWith("history-")) ? "A field marked red is empty or out of range; the brand's own figure is used in its place." : ""}
          </p>)}
        <p className="mt-3 text-xs text-muted-foreground">To keep costs for every offer, save them under Where it stands, The numbers.</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-lg border p-3.5">
          <div className="text-sm font-semibold" data-testid="calc-best">
            {c.best > 0 ? `${Math.round(c.best * 100)}% off leaves the most: ${m(c.points.find((p) => p.discount === c.best)!.contribution)} an order, against ${m(c.today)} at full price.` : `No flat discount beats full price here: an order leaves ${m(c.today)} today.`}
          </div>
          <p className="text-xs text-muted-foreground">Bars: what 1 order leaves after ads. Red line: the return needed to match today. Dashed line: the return a sale that size has reached{historySimulated && historyIsBrands ? " (simulated history)" : ""}.</p>
          <div className="mt-2">
            <CurveChart points={c.points} best={c.best} today={c.today} sym={sym}/>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-right text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-left font-medium">Discount</th>
                <th className="p-2 font-medium">Units an order</th>
                <th className="p-2 font-medium">Pays</th>
                <th className="p-2 font-medium">Kept</th>
                <th className="p-2 font-medium">Breaks even</th>
                <th className="p-2 font-medium">Needed</th>
                <th className="p-2 font-medium">Reached</th>
                <th className="p-2 font-medium">Leaves</th>
              </tr>
            </thead>
            <tbody className="divide-y text-right tabular-nums">
              {c.points.map((p) => (<tr key={p.discount} onClick={() => setRow(p.discount)} aria-selected={p.discount === shown} className={cn("cursor-pointer hover:bg-muted/60", p.discount === c.best && "bg-emerald-50 font-medium", p.discount === shown && "outline outline-2 -outline-offset-2 outline-primary")} data-testid={`calc-row-${Math.round(p.discount * 100)}`}>
                  <td className="p-2 text-left">{Math.round(p.discount * 100)}%</td>
                  <td className="p-2">{p.units.toFixed(2)}</td>
                  <td className="p-2">{m(p.revenue)}</td>
                  <td className="p-2">{m(p.margin)}</td>
                  <td className="p-2">{x(p.break_even)}</td>
                  <td className={cn("p-2", p.needed > p.reachable * 1.02 && "text-red-700")}>{x(p.needed)}</td>
                  <td className="p-2">{x(p.reachable)}</td>
                  <td className={cn("p-2", p.contribution < c.today ? "text-red-700" : "text-emerald-700")}>{m(p.contribution)}</td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      <section data-testid="calc-explain">
        <div className="flex flex-wrap items-baseline gap-x-3 border-t border-rule pt-2">
          <h3 className="display text-2xl">How the {Math.round(shown * 100)}% row is worked out</h3>
          <p className="text-sm text-muted-foreground">Each column of the table, in order, with this row&apos;s own numbers. Click another row to see its sums.</p>
        </div>
        <ol className="mt-3 divide-y rounded-lg border">
          {steps.map((s, k) => (<li key={s.id} className="grid gap-x-4 gap-y-1 p-3 md:grid-cols-[2rem_11rem_7rem_minmax(0,1fr)]" data-testid={`calc-step-${s.id}`}>
              <span className="numeral text-2xl text-primary">{k + 1}</span>
              <span className="text-sm font-semibold">{s.label}</span>
              <span className="text-sm font-semibold tabular-nums">{s.value}</span>
              <span className="min-w-0 text-sm">
                {s.how}
                <span className="mt-0.5 block text-xs text-muted-foreground">{s.means}</span>
              </span>
            </li>))}
        </ol>
      </section>

      <DealCompare costs={inputs} sym={sym} median={medianOrder(econ.order_values)}/>
    </div>);
}
