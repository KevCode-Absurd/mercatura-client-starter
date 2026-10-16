"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CircleAlert, CircleCheck, CircleHelp, CircleX, Clock, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdvanced } from "@/components/mode";
import type { FailureInfo } from "@/lib/offers/data";
import { spread, type Economics } from "@/lib/offers/economics";
import { checkOffer, evaluate, priceOf, type FailureLevel, type FailureResult, type OfferBrand } from "@/lib/offers/evaluate";
import { CUTOFF_KINDS, CUTOFF_LABEL, NAMED_DEALS, cutoffLines, cutoffUrgency, dealPatch, heroProduct, medianOrder, type CutoffKind, type NamedDealId } from "@/lib/offers/plays";
import { ADD_KINDS, ADD_LABEL, AUDIENCES, AUDIENCE_LABEL, MECHANICS, MECHANIC_INFO, OFFER_SOURCE_LABEL, PLACES, PLACE_LABEL, changesTerms, isDesigned, type AddKind, type Audience, type Mechanic, type OfferDesign, type Place } from "@/lib/offers/types";
import { cn } from "@/lib/utils";
import { deleteOfferAction, retireOfferAction, saveOfferAction, putOfferInUseAction } from "./actions";
import { OrderBar, OrderBarLegend } from "./charts";
export interface Ctx {
    ob: OfferBrand;
    econ: Economics | null;
    sym: string;
    personas: {
        id: string;
        name: string;
        image: string | null;
        status: "active" | "draft";
    }[];
    failures: FailureInfo[];
    industries: Record<string, string>;
    offerProduct: Record<string, string>;
    live: boolean;
}
export const LEVEL: Record<FailureLevel, {
    icon: typeof CircleX;
    cls: string;
    chip: string;
    word: string;
}> = {
    fail: { icon: CircleX, cls: "text-red-600", chip: "border-red-300 bg-red-50 text-red-800", word: "Triggered" },
    warn: { icon: CircleAlert, cls: "text-amber-600", chip: "border-amber-300 bg-amber-50 text-amber-900", word: "Watch" },
    unknown: { icon: CircleHelp, cls: "text-muted-foreground", chip: "border-border bg-muted text-muted-foreground", word: "Not known" },
    pass: { icon: CircleCheck, cls: "text-emerald-600", chip: "border-emerald-300 bg-emerald-50 text-emerald-800", word: "Clear" },
};
const x = (n: number) => (Number.isFinite(n) ? `${n.toFixed(2)}x` : "none");
export function BuyerChip({ d, ctx }: {
    d: Pick<OfferDesign, "persona_id" | "new_buyer">;
    ctx: Ctx;
}) {
    const p = ctx.personas.find((q) => q.id === d.persona_id);
    const name = p?.name ?? d.new_buyer?.name;
    if (!name)
        return null;
    return (<span className="inline-flex max-w-full items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs">
      {p?.image ? (<img src={`/api/assets/${p.image}?w=64`} alt="" className="size-5 rounded-full object-cover"/>) : (<span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-semibold">{name.replace(/^The /, "").slice(0, 1)}</span>)}
      <span className="truncate">{name}</span>
      {!p && <span className="text-xs font-medium text-primary">new</span>}
    </span>);
}
export function OfferFigures({ d, ctx, className }: {
    d: OfferDesign;
    ctx: Ctx;
    className?: string;
}) {
    const e = evaluate(d, ctx.ob, ctx.econ);
    if (e.addon != null && d.addon)
        return (<div className={cn("grid grid-cols-3 gap-1 rounded-md bg-muted/60 p-2 text-center text-xs", className)}>
        <Fig label="take it (assumed)" value={`${Math.round(d.addon.take_rate * 100)}%`}/>
        <Fig label="the add-on" value={`${ctx.sym}${d.addon.price.toFixed(2)}`}/>
        <Fig label="more an order" value={`${ctx.sym}${e.addon.toFixed(2)}`} good/>
      </div>);
    if (!e.order || !e.needed || !e.today)
        return <p className={cn("rounded-md bg-muted/60 p-2 text-xs text-muted-foreground", className)}>{e.missing}</p>;
    const ok = e.expected_cac != null && e.needed.cac >= e.expected_cac * 0.98;
    return (<div className={cn("grid grid-cols-3 gap-1 rounded-md bg-muted/60 p-2 text-center text-xs", className)}>
      <Fig label="customer pays" value={`${ctx.sym}${e.order.revenue.toFixed(2)}`}/>
      <Fig label={`kept before ads (today ${ctx.sym}${e.today.margin.toFixed(0)})`} value={`${ctx.sym}${e.order.margin.toFixed(2)}`} good={e.order.margin > e.today.margin}/>
      <Fig label={`can cost to win (costs ${ctx.sym}${(e.expected_cac ?? 0).toFixed(0)})`} value={`${ctx.sym}${Math.max(0, e.needed.cac).toFixed(2)}`} good={ok} bad={!ok}/>
    </div>);
}
const Fig = ({ label, value, good, bad }: {
    label: string;
    value: string;
    good?: boolean;
    bad?: boolean;
}) => (<div>
    <div className={cn("font-semibold tabular-nums", good && "text-emerald-700", bad && "text-red-700")}>{value}</div>
    <div className="text-xs leading-tight text-muted-foreground">{label}</div>
  </div>);
export function OfferCard({ d, ctx, onOpen }: {
    d: OfferDesign;
    ctx: Ctx;
    onOpen: () => void;
}) {
    const flags = checkOffer(d, ctx.ob, ctx.econ).filter((r) => r.level === "fail" || r.level === "warn");
    const base = ctx.ob.offers.find((o) => o.id === d.base_offer_id);
    const name = (id: string) => ctx.failures.find((f) => f.id === id)?.name ?? id;
    const advanced = useAdvanced();
    return (<button type="button" onClick={onOpen} className={cn("group flex h-full w-full flex-col gap-2.5 rounded-lg border bg-card p-3.5 text-left transition hover:border-primary", d.status === "active" && "border-l-4 border-l-emerald-600")} data-testid={`offer-${d.id}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {d.status === "active" ? <Badge className="bg-emerald-600 font-medium hover:bg-emerald-600">In use</Badge> : <Badge variant="secondary" className="font-normal">Draft</Badge>}
        <Badge variant="outline" className="font-normal">{AUDIENCE_LABEL[d.audience]}</Badge>
        {d.borrowed && <Badge variant="outline" className="border-primary/40 font-normal text-primary">From {ctx.industries[d.borrowed.industry]?.toLowerCase() ?? d.borrowed.industry}</Badge>}
      </div>
      <div>
        <div className="text-xs font-medium text-muted-foreground">{d.name}</div>
        <div className="mt-0.5 text-lg font-extrabold leading-snug tracking-tight">{d.headline}</div>
      </div>
      <p className="text-sm text-muted-foreground">{d.terms}</p>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <BuyerChip d={d} ctx={ctx}/>
        {base && !d.addon && (<span className="rounded-full bg-muted px-2 py-0.5 tabular-nums">
            {d.units} × {ctx.sym}
            {base.price}
            {d.discount > 0 ? `, ${Math.round(d.discount * 100)}% off` : ""}
          </span>)}
        {d.adds.map((a) => (<span key={a.name} className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
            + {a.name}
          </span>))}
        {d.risk_reversal && (<span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5" title={d.risk_reversal}>
            <ShieldCheck className="size-3"/>
            risk removed
          </span>)}
        {d.urgency && (<span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5" title={d.urgency}>
            <Clock className="size-3"/>
            deadline
          </span>)}
      </div>
      {advanced && (<div className="mt-auto space-y-2 pt-1">
        <OfferFigures d={d} ctx={ctx}/>
        {flags.length > 0 && (<div className="flex flex-wrap gap-1" data-testid={`flags-${d.id}`}>
            {flags.map((f) => (<span key={f.id} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", LEVEL[f.level].chip)} title={f.message}>
                <AlertTriangle className="size-3"/>
                {name(f.id)}
              </span>))}
          </div>)}
      </div>)}
    </button>);
}
export function FailureRow({ r, info }: {
    r: FailureResult;
    info?: FailureInfo;
}) {
    const L = LEVEL[r.level];
    return (<li className="flex gap-2.5 py-2" data-testid={`failure-${r.id}`} data-level={r.level}>
      <L.icon className={cn("mt-0.5 size-4 shrink-0", L.cls)}/>
      <div className="min-w-0 text-sm">
        <div className="font-medium">
          {info ? `${info.n}. ${info.name}` : r.id}
          <span className={cn("ml-2 rounded-full border px-1.5 py-0.5 align-middle text-xs font-medium", L.chip)}>{L.word}</span>
        </div>
        <div className="text-muted-foreground">{r.message}</div>
        {info && (r.level === "fail" || r.level === "warn") && <div className="mt-0.5 text-xs text-foreground/80">The fix: {info.fix}</div>}
      </div>
    </li>);
}
interface Draft {
    id?: string;
    name: string;
    mechanic: Mechanic;
    audience: Audience;
    product_id: string;
    base_offer_id: string;
    persona_id: string | null;
    headline: string;
    terms: string;
    positioning: string;
    units: string;
    discount: string;
    subscription: boolean;
    adds: {
        kind: AddKind;
        name: string;
        cost: string;
        value: string;
    }[];
    risk_reversal: string;
    urgency: string;
    tiers: {
        at: string;
        get: string;
    }[];
    addon: {
        place: Place;
        item: string;
        price: string;
        margin: string;
        take_rate: string;
    } | null;
    when: string;
    why: string;
    test: string;
    needs: string;
}
export const blankOffer = (ctx: Ctx, mechanic: Mechanic = "bundle"): Draft => {
    const priced = ctx.ob.offers.filter((o) => !isDesigned(o.id));
    const addon = mechanic === "upsell" || mechanic === "post_purchase";
    return { name: "", mechanic, audience: "new", product_id: ctx.ob.products[0]?.id ?? "", base_offer_id: priced[0]?.id ?? "", persona_id: null, headline: "", terms: "", positioning: "", units: "1", discount: "0", subscription: false, adds: [], risk_reversal: "", urgency: "", tiers: [], addon: addon ? { place: mechanic === "upsell" ? "cart" : "post_purchase", item: "", price: "0", margin: "60", take_rate: "10" } : null, when: "evergreen", why: "", test: "", needs: "" };
};
export const toDraft = (d: OfferDesign): Draft => ({ id: d.id, name: d.name, mechanic: d.mechanic, audience: d.audience, product_id: d.product_id, base_offer_id: d.base_offer_id, persona_id: d.persona_id, headline: d.headline, terms: d.terms, positioning: d.positioning, units: String(d.units), discount: String(Math.round(d.discount * 100)), subscription: d.subscription, adds: d.adds.map((a) => ({ kind: a.kind, name: a.name, cost: String(a.cost), value: String(a.value) })), risk_reversal: d.risk_reversal, urgency: d.urgency, tiers: d.tiers.map((t) => ({ at: String(t.at), get: t.get })), addon: d.addon ? { place: d.addon.place, item: d.addon.item, price: String(d.addon.price), margin: String(Math.round(d.addon.margin * 100)), take_rate: String(Math.round(d.addon.take_rate * 100)) } : null, when: d.when, why: d.why, test: d.test, needs: d.needs });
export type OfferDraft = Draft;
const num = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : 0;
};
const payload = (d: Draft) => ({
    ...d,
    units: Math.max(1, Math.round(num(d.units))),
    discount: Math.min(0.7, num(d.discount) / 100),
    adds: d.adds.filter((a) => a.name.trim()).map((a) => ({ kind: a.kind, name: a.name, cost: num(a.cost), value: num(a.value) })),
    tiers: d.tiers.filter((t) => t.get.trim()).map((t) => ({ at: num(t.at), get: t.get })),
    addon: d.addon && d.addon.item.trim() ? { place: d.addon.place, item: d.addon.item, price: num(d.addon.price), margin: Math.min(1, num(d.addon.margin) / 100), take_rate: Math.min(1, num(d.addon.take_rate) / 100) } : null,
});
const Field = ({ label, hint, children }: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) => (<div className="space-y-1">
    <Label className="text-xs font-medium">{label}</Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>);
export function OfferEditor({ draft, was, ctx, onClose, onChanged }: {
    draft: Draft;
    was: OfferDesign | null;
    ctx: Ctx;
    onClose: () => void;
    onChanged: () => Promise<void>;
}) {
    const [d, setD] = useState(draft);
    const [pending, start] = useTransition();
    const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v }));
    const p = payload(d);
    const preview: OfferDesign = { ...(was ?? { new_buyer: null, improves: null, theme_ids: [], borrowed: null, source: "hand", status: "draft", brand_offer_id: null, concept_id: null, created_at: "", updated_at: "" }), ...p, id: was?.id ?? "ofr_new" };
    const e = evaluate(preview, ctx.ob, ctx.econ);
    const checks = checkOffer(preview, ctx.ob, ctx.econ);
    const bad = checks.filter((c) => c.level === "fail");
    const priced = ctx.ob.offers.filter((o) => !isDesigned(o.id));
    const addonKind = d.mechanic === "upsell" || d.mechanic === "post_purchase";
    const stated = was?.brand_offer_id;
    const advanced = useAdvanced();
    const [deal, setDeal] = useState<NamedDealId | null>(null);
    const [put, setPut] = useState<{
        terms?: string;
        urgency?: string;
        when?: string;
        needs?: string;
        adds?: boolean;
    }>({});
    const [dates, setDates] = useState<Partial<Record<CutoffKind, string>>>({});
    const today = new Date().toISOString().slice(0, 10);
    const startFrom = (id: NamedDealId) => {
        const orders = ctx.econ?.order_values ?? [];
        const aov = orders.length ? spread(orders).mean || null : null;
        const patch = dealPatch(id, { sym: ctx.sym, aov, median: medianOrder(orders), hero: heroProduct(ctx.econ?.mix ?? [], ctx.ob.products)?.name ?? null });
        setDeal(id);
        const free = (now: string, was: string | undefined, blank = "") => now.trim() === blank || now === was;
        const ownAdds = d.adds.some((a) => a.name.trim()) && !put.adds;
        setD((cur) => ({
            ...cur,
            mechanic: patch.mechanic,
            addon: null,
            units: String(patch.units ?? 1),
            discount: String(Math.round((patch.discount ?? 0) * 100)),
            tiers: (patch.tiers ?? []).map((t) => ({ at: String(t.at), get: t.get })),
            adds: ownAdds ? cur.adds : (patch.adds ?? []).map((a) => ({ kind: a.kind, name: a.name, cost: String(a.cost), value: String(a.value) })),
            terms: free(cur.terms, put.terms) ? (patch.terms ?? "") : cur.terms,
            urgency: free(cur.urgency, put.urgency) ? (patch.urgency ?? "") : cur.urgency,
            when: free(cur.when, put.when, "evergreen") || cur.when.trim() === "" ? (patch.when ?? "evergreen") : cur.when,
            needs: free(cur.needs, put.needs) ? (patch.needs ?? "") : cur.needs,
        }));
        setPut({ terms: patch.terms ?? "", urgency: patch.urgency ?? "", when: patch.when ?? "evergreen", needs: patch.needs ?? "", adds: !ownAdds });
    };
    const lines = cutoffLines(dates, today);
    const save = (then?: (offer: OfferDesign) => Promise<void>) => start(async () => {
        const res = await saveOfferAction(p);
        if (!res.ok)
            return void toast.error(res.error);
        if (then)
            await then(res.offer);
        else
            toast.success("Saved.");
        await onChanged();
        if (!then)
            onClose();
    });
    const putInUse = () => {
        if (bad.length && !confirm(`${bad.length} of the 7 failures ${bad.length === 1 ? "is" : "are"} triggered:\n\n${bad.map((b) => `- ${b.message}`).join("\n")}\n\nPut it in use anyway?`))
            return;
        save(async (offer) => {
            const res = await putOfferInUseAction(offer.id);
            if (!res.ok)
                return void toast.error(res.error);
            toast.success(`${res.offer.name} is in use. ${res.did.join(" ")}`, { duration: 9000 });
            onClose();
        });
    };
    return (<Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl" data-testid="offer-editor">
        <DialogHeader>
          <DialogTitle>{was ? was.name : "A new offer"}</DialogTitle>
          <DialogDescription>
            {was ? `${OFFER_SOURCE_LABEL[was.source]}${was.borrowed ? ` (${ctx.industries[was.borrowed.industry] ?? was.borrowed.industry}: ${was.borrowed.pattern})` : ""}. ` : "Written by hand. "}
            {was?.status === "active" ? "In use: saving rewrites what the writers are sent." : "A draft: nothing reaches a writer until you put it in use."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_200px_160px]">
              <Field label="Name">
                <Input value={d.name} onChange={(ev) => set("name", ev.target.value)} placeholder="The 90-Day Reset" data-testid="offer-name"/>
              </Field>
              <Field label="Mechanic">
                <Select value={d.mechanic} onValueChange={(v) => setD((cur) => ({ ...cur, mechanic: v as Mechanic, addon: v === "upsell" || v === "post_purchase" ? (cur.addon ?? blankOffer(ctx, v as Mechanic).addon) : null }))}>
                  <SelectTrigger className="w-full" data-testid="offer-mechanic">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MECHANICS.map((m) => (<SelectItem key={m} value={m}>
                        {MECHANIC_INFO[m].label}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Who it is for">
                <Select value={d.audience} onValueChange={(v) => set("audience", v as Audience)}>
                  <SelectTrigger className="w-full" data-testid="offer-audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((a) => (<SelectItem key={a} value={a}>
                        {AUDIENCE_LABEL[a]}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {!addonKind && (<div className="rounded-md border border-dashed p-2.5" data-testid="named-deal">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Label className="text-xs font-medium">Start from a named deal</Label>
                  <Select value={deal ?? ""} onValueChange={(v) => startFrom(v as NamedDealId)}>
                    <SelectTrigger className="w-64" data-testid="named-deal-pick">
                      <SelectValue placeholder="Optional"/>
                    </SelectTrigger>
                    <SelectContent>
                      {NAMED_DEALS.map((x) => (<SelectItem key={x.id} value={x.id}>
                          {x.label}
                        </SelectItem>))}
                    </SelectContent>
                  </Select>
                  <span className="min-w-0 flex-1 basis-56 text-xs text-muted-foreground" data-testid="named-deal-note">
                    {deal ? `${NAMED_DEALS.find((x) => x.id === deal)!.note} The parts below are filled in: change any of them.` : "Buy 1 get 1, a gift over a spend level, a spend ladder, credit, early access, a shipping cut-off. Each fills in the parts below."}
                  </span>
                </div>
                {deal === "cutoff" && (<div className="mt-2.5 space-y-2" data-testid="cutoff-dates">
                    <div className="text-xs text-muted-foreground">The carrier&apos;s real last order days. A date left empty is not shown, and no day count is shown without one.</div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {CUTOFF_KINDS.map((k) => (<Field key={k} label={CUTOFF_LABEL[k]}>
                          <Input type="date" value={dates[k] ?? ""} onChange={(ev) => setDates((cur) => ({ ...cur, [k]: ev.target.value }))} data-testid={`cutoff-${k}`}/>
                        </Field>))}
                    </div>
                    {lines.length > 0 && (<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <ul className="min-w-0 flex-1 basis-72 text-xs" data-testid="cutoff-lines">
                          {lines.map((l) => (<li key={l.kind} className={cn(l.days < 0 && "text-red-700")}>
                              {l.text}
                            </li>))}
                        </ul>
                        <Button size="sm" variant="outline" disabled={!cutoffUrgency(dates, today)} onClick={() => set("urgency", cutoffUrgency(dates, today))} data-testid="cutoff-fill">
                          Use as the deadline
                        </Button>
                      </div>)}
                  </div>)}
              </div>)}
            <Field label="The offer in 1 line" hint="As its page would state it. This is what a writer is given.">
              <Input value={d.headline} onChange={(ev) => set("headline", ev.target.value)} data-testid="offer-headline"/>
            </Field>
            <Field label="What the customer gets and pays">
              <Textarea rows={2} value={d.terms} onChange={(ev) => set("terms", ev.target.value)} data-testid="offer-terms"/>
            </Field>

            <Part n={1} title="Who it is for" note="The problem it solves, for whom, why now.">
              <Textarea rows={2} value={d.positioning} onChange={(ev) => set("positioning", ev.target.value)} data-testid="offer-positioning"/>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field label="Product">
                  <Select value={d.product_id} onValueChange={(v) => set("product_id", v)}>
                    <SelectTrigger className="w-full" data-testid="offer-product">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ctx.ob.products.map((pr) => (<SelectItem key={pr.id} value={pr.id}>
                          {pr.name}
                        </SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="The buyer">
                  <Select value={d.persona_id ?? "__none"} onValueChange={(v) => set("persona_id", v === "__none" ? null : v)}>
                    <SelectTrigger className="w-full" data-testid="offer-persona">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">{was?.new_buyer ? `New: ${was.new_buyer.name}` : "No single buyer"}</SelectItem>
                      {ctx.personas.map((q) => (<SelectItem key={q.id} value={q.id}>
                          {q.name}
                          {q.status === "draft" ? " (draft)" : ""}
                        </SelectItem>))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              {was?.new_buyer && !d.persona_id && (<p className="mt-2 rounded-md bg-muted/60 p-2 text-xs" data-testid="offer-new-buyer">
                  <span className="font-medium">{was.new_buyer.name}</span>
                  {[was.new_buyer.gender, was.new_buyer.age].filter(Boolean).length ? ` (${[was.new_buyer.gender, was.new_buyer.age].filter(Boolean).join(", ")})` : ""}: {was.new_buyer.summary} Becomes a persona in use when this offer is put in use.
                </p>)}
            </Part>

            {!addonKind && (<Part n={2} title="The price" note="The customer pays the price point, times the units, less the discount.">
                <div className="grid gap-3 sm:grid-cols-[1fr_90px_100px]">
                  <Field label="Built on this price point">
                    <Select value={d.base_offer_id} onValueChange={(v) => set("base_offer_id", v)}>
                      <SelectTrigger className="w-full" data-testid="offer-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priced.map((o) => (<SelectItem key={o.id} value={o.id}>
                            {o.name} ({ctx.sym}
                            {o.price})
                          </SelectItem>))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Units">
                    <Input type="number" min={1} max={24} value={d.units} onChange={(ev) => set("units", ev.target.value)} data-testid="offer-units"/>
                  </Field>
                  <Field label="Discount %">
                    <Input type="number" min={0} max={70} value={d.discount} onChange={(ev) => set("discount", ev.target.value)} data-testid="offer-discount"/>
                  </Field>
                </div>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <Switch checked={d.subscription} onCheckedChange={(v) => set("subscription", v)} data-testid="offer-subscription"/>
                  Only with a subscription
                </label>
                {d.mechanic === "tiered" && (<div className="mt-3 space-y-2" data-testid="offer-tiers">
                    <div className="text-xs font-medium">Tiers: spend this much, get this</div>
                    {d.tiers.map((t, i) => (<div key={i} className="flex gap-2">
                        <Input type="number" className="w-24" value={t.at} onChange={(ev) => set("tiers", d.tiers.map((y, k) => (k === i ? { ...y, at: ev.target.value } : y)))} aria-label="Order value"/>
                        <Input value={t.get} onChange={(ev) => set("tiers", d.tiers.map((y, k) => (k === i ? { ...y, get: ev.target.value } : y)))} placeholder="Free shipping and a travel tin" aria-label="What they get"/>
                        <Button size="icon" variant="ghost" onClick={() => set("tiers", d.tiers.filter((_, k) => k !== i))} aria-label="Remove tier">
                          <X className="size-4"/>
                        </Button>
                      </div>))}
                    {d.tiers.length < 4 && (<Button size="sm" variant="outline" onClick={() => set("tiers", [...d.tiers, { at: "", get: "" }])} data-testid="add-tier">
                        <Plus className="size-3.5"/>
                        Add a tier
                      </Button>)}
                  </div>)}
              </Part>)}

            {addonKind && d.addon && (<Part n={2} title="The add-on" note="Extra profit per order is the share who take it, times its price, times what you keep of it.">
                <div className="grid gap-3 sm:grid-cols-[170px_1fr]">
                  <Field label="Where it is shown">
                    <Select value={d.addon.place} onValueChange={(v) => set("addon", { ...d.addon!, place: v as Place })}>
                      <SelectTrigger className="w-full" data-testid="addon-place">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLACES.map((pl) => (<SelectItem key={pl} value={pl}>
                            {PLACE_LABEL[pl]}
                          </SelectItem>))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="What is offered">
                    <Input value={d.addon.item} onChange={(ev) => set("addon", { ...d.addon!, item: ev.target.value })} data-testid="addon-item"/>
                  </Field>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  <Field label="Its price">
                    <Input type="number" value={d.addon.price} onChange={(ev) => set("addon", { ...d.addon!, price: ev.target.value })} data-testid="addon-price"/>
                  </Field>
                  <Field label="Its margin %">
                    <Input type="number" value={d.addon.margin} onChange={(ev) => set("addon", { ...d.addon!, margin: ev.target.value })} data-testid="addon-margin"/>
                  </Field>
                  <Field label="Take rate % (assumed)">
                    <Input type="number" value={d.addon.take_rate} onChange={(ev) => set("addon", { ...d.addon!, take_rate: ev.target.value })} data-testid="addon-take"/>
                  </Field>
                </div>
              </Part>)}

            {!addonKind && (<Part n={3} title="What is added" note="What is given with the order. Its cost is what the brand pays. Its value is what a buyer would pay.">
                <div className="space-y-2" data-testid="offer-adds">
                  {d.adds.map((a, i) => (<div key={i} className="grid grid-cols-[120px_1fr_80px_80px_36px] gap-2">
                      <Select value={a.kind} onValueChange={(v) => set("adds", d.adds.map((y, k) => (k === i ? { ...y, kind: v as AddKind } : y)))}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ADD_KINDS.map((k) => (<SelectItem key={k} value={k}>
                              {ADD_LABEL[k]}
                            </SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Input value={a.name} onChange={(ev) => set("adds", d.adds.map((y, k) => (k === i ? { ...y, name: ev.target.value } : y)))} placeholder="A travel tin" aria-label="What is given"/>
                      <Input type="number" value={a.cost} onChange={(ev) => set("adds", d.adds.map((y, k) => (k === i ? { ...y, cost: ev.target.value } : y)))} placeholder="Cost" aria-label="Cost to the brand" title="Cost to the brand"/>
                      <Input type="number" value={a.value} onChange={(ev) => set("adds", d.adds.map((y, k) => (k === i ? { ...y, value: ev.target.value } : y)))} placeholder="Value" aria-label="Value to the buyer" title="Value to the buyer"/>
                      <Button size="icon" variant="ghost" onClick={() => set("adds", d.adds.filter((_, k) => k !== i))} aria-label="Remove">
                        <X className="size-4"/>
                      </Button>
                    </div>))}
                  {d.adds.length < 4 && (<Button size="sm" variant="outline" onClick={() => set("adds", [...d.adds, { kind: "gift", name: "", cost: "0", value: "0" }])} data-testid="add-add">
                      <Plus className="size-3.5"/>
                      Add something
                    </Button>)}
                </div>
              </Part>)}

            <div className="grid gap-3 sm:grid-cols-2">
              <Part n={4} title="What removes the risk" note="A guarantee, a trial, returns.">
                <Textarea rows={2} value={d.risk_reversal} onChange={(ev) => set("risk_reversal", ev.target.value)} data-testid="offer-risk"/>
              </Part>
              <Part n={5} title="A real reason to act now" note="A real window or limit. Never an invented one.">
                <Textarea rows={2} value={d.urgency} onChange={(ev) => set("urgency", ev.target.value)} data-testid="offer-urgency"/>
                <Input className="mt-2" value={d.when} onChange={(ev) => set("when", ev.target.value)} placeholder="evergreen, or January to March" aria-label="When it runs" data-testid="offer-when"/>
              </Part>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Why it fits this brand">
                <Textarea rows={3} value={d.why} onChange={(ev) => set("why", ev.target.value)} data-testid="offer-why"/>
              </Field>
              <Field label="How to test it">
                <Textarea rows={3} value={d.test} onChange={(ev) => set("test", ev.target.value)} data-testid="offer-test"/>
              </Field>
              <Field label="What the brand must arrange first">
                <Textarea rows={3} value={d.needs} onChange={(ev) => set("needs", ev.target.value)} data-testid="offer-needs"/>
              </Field>
            </div>
          </div>

          <div className="space-y-4">
            {advanced && (<>
            <div className="rounded-lg border p-3" data-testid="offer-numbers">
              <div className="text-sm font-semibold">The numbers{ctx.econ?.simulated ? <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">simulated costs</span> : null}</div>
              {e.addon != null ? (<p className="mt-2 text-sm">
                  Adds <span className="font-semibold text-emerald-700">{ctx.sym}{e.addon.toFixed(2)}</span> to every order, if {Math.round((p.addon?.take_rate ?? 0) * 100)}% take it. The take rate is an assumption until it is tested.
                </p>) : e.order && e.today && e.needed ? (<div className="mt-2 space-y-3">
                  <OrderBar w={e.today} scale={Math.max(e.today.revenue, e.order.revenue)} label="1 unit today" sym={ctx.sym}/>
                  <OrderBar w={e.order} scale={Math.max(e.today.revenue, e.order.revenue)} label="This offer" sym={ctx.sym}/>
                  <OrderBarLegend />
                  <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
                    <dt className="text-muted-foreground">Kept before ads</dt>
                    <dd className="text-right tabular-nums">
                      {ctx.sym}
                      {e.order.margin.toFixed(2)} <span className="text-muted-foreground">({Math.round(e.order.margin_rate * 100)}%; today {ctx.sym}{e.today.margin.toFixed(2)})</span>
                    </dd>
                    <dt className="text-muted-foreground">Breaks even at a return of</dt>
                    <dd className="text-right tabular-nums">{x(e.order.break_even)}</dd>
                    <dt className="text-muted-foreground">The most an order can cost to win and still keep today's profit</dt>
                    <dd className={cn("text-right font-semibold tabular-nums", e.expected_cac != null && e.needed.cac >= e.expected_cac * 0.98 ? "text-emerald-700" : "text-red-700")}>
                      {ctx.sym}
                      {Math.max(0, e.needed.cac).toFixed(2)} <span className="font-normal text-muted-foreground">(a return of {x(e.needed.roas)})</span>
                    </dd>
                    <dt className="text-muted-foreground">{p.discount > 0 ? "What an order cost to win at a discount this size" : "What an order costs to win today"}</dt>
                    <dd className="text-right tabular-nums">
                      {ctx.sym}
                      {(e.expected_cac ?? 0).toFixed(2)} <span className="text-muted-foreground">(a return of {x(e.reachable ?? 0)})</span>
                    </dd>
                    <dt className="text-muted-foreground">Left after ads, at today&apos;s cost to win an order</dt>
                    <dd className="text-right tabular-nums">
                      {e.at_todays_cost! < 0 ? "-" : ""}
                      {ctx.sym}
                      {Math.abs(e.at_todays_cost!).toFixed(2)} <span className="text-muted-foreground">(today {e.today.contribution < 0 ? "-" : ""}{ctx.sym}{Math.abs(e.today.contribution).toFixed(2)})</span>
                    </dd>
                    {e.span && (<>
                        <dt className="text-muted-foreground">A customer today, over the same {e.span.days} days</dt>
                        <dd className="text-right tabular-nums">
                          {e.span.today < 0 ? "-" : ""}
                          {ctx.sym}
                          {Math.abs(e.span.today).toFixed(2)}
                        </dd>
                      </>)}
                  </dl>
                </div>) : (<p className="mt-2 text-sm text-muted-foreground">{e.missing}</p>)}
            </div>

            <div className="rounded-lg border p-3" data-testid="offer-checks">
              <div className="text-sm font-semibold">The 7 ways offers fail</div>
              {checks.length ? (<ul className="mt-1 divide-y">
                  {checks.map((c) => (<FailureRow key={c.id} r={c} info={ctx.failures.find((f) => f.id === c.id)}/>))}
                </ul>) : (<p className="mt-2 text-sm text-muted-foreground">None of the failures that show in a single offer applies to this one.</p>)}
            </div>
            </>)}

            {was?.status === "active" && (<div className="space-y-1.5 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm" data-testid="offer-in-use">
                <div className="font-semibold text-emerald-900">In use: what it unlocked</div>
                {stated ? (<Link href={`/studio/new?kind=ad&offer=${stated}`} className="flex items-center gap-1 text-emerald-900 hover:underline" data-testid="offer-make-ads">
                    Make ads that state this offer <ArrowRight className="size-3.5"/>
                  </Link>) : (<p className="text-emerald-900/80">{changesTerms(was) ? "An add-on is shown in the store, not stated in ads." : "It changes no terms, so it sells at its price point."}</p>)}
                {was.concept_id ? (<Link href={`/scripts?concept=${was.concept_id}`} className="flex items-center gap-1 text-emerald-900 hover:underline" data-testid="offer-write-scripts">
                    {advanced ? <>Write scripts from concept {was.concept_id}</> : "Write scripts from its concept"} <ArrowRight className="size-3.5"/>
                  </Link>) : (stated && (<Link href="/concepts" className="flex items-center gap-1 text-emerald-900 hover:underline">
                      Pick it as the offer of a concept <ArrowRight className="size-3.5"/>
                    </Link>))}
              </div>)}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => save()} disabled={pending} data-testid="offer-save">
                Save
              </Button>
              {was?.status === "active" ? (<Button variant="outline" disabled={pending} onClick={() => start(async () => { const res = await retireOfferAction(was.id); if (!res.ok)
            return void toast.error(res.error); toast.success("Taken out of use."); await onChanged(); onClose(); })} data-testid="offer-retire">
                  Take out of use
                </Button>) : (<Button variant="outline" className="border-emerald-600 text-emerald-800 hover:bg-emerald-50" disabled={pending} onClick={putInUse} data-testid="offer-use">
                  Save and put in use
                </Button>)}
              {was && (<Button variant="ghost" className="ml-auto text-red-700 hover:text-red-800" disabled={pending} onClick={() => confirm(`Delete "${was.name}"?`) && start(async () => { const res = await deleteOfferAction(was.id); if (!res.ok)
            return void toast.error(res.error); await onChanged(); onClose(); })} data-testid="offer-delete">
                  <Trash2 className="size-4"/>
                  Delete
                </Button>)}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>);
}
const Part = ({ n, title, note, children }: {
    n: number;
    title: string;
    note: string;
    children: React.ReactNode;
}) => (<div className="rounded-lg border p-3">
    <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
      <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">{n}</span>
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
    {children}
  </div>);
export const paysLine = (d: OfferDesign, ctx: Ctx) => `${ctx.sym}${priceOf(d, ctx.ob).toFixed(2)}`;
