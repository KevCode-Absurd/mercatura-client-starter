"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Pencil, Plus, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAdvanced } from "@/components/mode";
import { contributionAt, waterfall, type Economics } from "@/lib/offers/economics";
import type { BrandOffer } from "@/lib/offers/book";
import { checkBrand, fit, withInUse } from "@/lib/offers/evaluate";
import { simulatedLead } from "@/lib/offers/own-numbers";
import { mainMechanic } from "@/lib/offers/path";
import { MECHANICS, MECHANIC_INFO, isDesigned, type Industry, type IndustryGroup, type Mechanic, type OfferDesign } from "@/lib/offers/types";
import { tabNames } from "@/lib/brain/file-names";
import { cn } from "@/lib/utils";
import { buildOffersAction, offersStatusAction, researchIndustryAction, saveEconomicsAction } from "./actions";
import { Calculator } from "./calculator";
import { SpreadChart } from "./charts";
import { InUse } from "./in-use";
import { IndustriesTab } from "./industries";
import { OfferPathBuilder, type PathPersona } from "./offer-path";
import { FailureRow, OfferCard, OfferEditor, blankOffer, toDraft, type Ctx, type OfferDraft } from "./offer-parts";
interface Props {
    brandName: string;
    category: string;
    initial: OfferDesign[];
    book: BrandOffer[];
    ctx: Omit<Ctx, "industries">;
    pathPersonas: PathPersona[];
    guarantee: string;
    groups: IndustryGroup[];
    industries: Industry[];
    industriesNote: string;
    initialTab: string;
}
const x = (n: number) => (Number.isFinite(n) ? `${n.toFixed(2)}x` : "none");
export function OffersView({ brandName, category, initial, book: firstBook, ctx: base, pathPersonas, guarantee, groups, industries: firstIndustries, industriesNote, initialTab }: Props) {
    const router = useRouter();
    const [offers, setOffers] = useState(initial);
    const [book, setBook] = useState(firstBook);
    const [industries, setIndustries] = useState(firstIndustries);
    const [econ, setEcon] = useState(base.econ);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, start] = useTransition();
    const [tab, setTab] = useState(initialTab);
    const advanced = useAdvanced();
    const shownTab = advanced || tab === "build" || tab === "offers" || tab === "industries" ? tab : "build";
    const [building, setBuilding] = useState<Mechanic[] | null>(null);
    const [editing, setEditing] = useState<OfferDraft | null>(null);
    const ctx: Ctx = useMemo(() => ({ ...base, econ, industries: Object.fromEntries(industries.map((i) => [i.id, i.name])) }), [base, econ, industries]);
    const sym = ctx.sym;
    const refresh = useCallback(async () => {
        const res = await offersStatusAction();
        if (res.ok) {
            setOffers(res.offers);
            setIndustries(res.industries);
            setBusy(res.busy);
            setError(res.lastError);
        }
    }, []);
    const wasBusy = useRef(false);
    useEffect(() => {
        void refresh();
    }, [refresh]);
    useEffect(() => {
        if (!busy) {
            if (wasBusy.current)
                router.refresh();
            wasBusy.current = false;
            return;
        }
        wasBusy.current = true;
        const t = setInterval(() => void refresh(), 4000);
        return () => clearInterval(t);
    }, [busy, refresh, router]);
    const act = (fn: () => Promise<{
        ok: true;
    } | {
        ok: false;
        error: string;
    }>, done: string, then?: () => void) => start(async () => {
        const res = await fn();
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(done);
        then?.();
        await refresh();
    });
    const f = useMemo(() => fit(ctx.ob, withInUse(econ, offers)), [ctx.ob, econ, offers]);
    const brandChecks = useMemo(() => checkBrand(offers, ctx.ob, econ), [offers, ctx.ob, econ]);
    const priced = ctx.ob.offers.filter((o) => !isDesigned(o.id));
    const active = offers.filter((o) => o.status === "active");
    const triggered = brandChecks.filter((c) => c.level === "fail").length;
    const borrowed = useMemo(() => offers.reduce<Record<string, number>>((a, o) => (o.borrowed ? { ...a, [o.borrowed.industry]: (a[o.borrowed.industry] ?? 0) + 1 } : a), {}), [offers]);
    const costOf = (offerId: string) => econ?.products.find((p) => p.product_id === ctx.offerProduct[offerId]) ?? econ?.products[0];
    return (<div className="space-y-6 px-6 py-8" data-testid="offers">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setTab("build")} disabled={pending} data-testid="go-build">
          <Sparkles className="size-4"/>
          Build an offer
        </Button>
        {advanced && (<>
            <Button variant="outline" onClick={() => setBuilding(f.ranked.slice(0, 4).map((r) => r.mechanic))} disabled={!!busy || pending} data-testid="build-offers">
              <Wand2 className="size-4"/>
              Design several at once
            </Button>
            <Button variant="outline" onClick={() => setEditing(blankOffer(ctx))} disabled={pending} data-testid="new-offer">
              <Plus className="size-4"/>
              Write a design by hand
            </Button>
          </>)}
        {busy && (<span className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="offers-busy">
            <Loader2 className="size-4 animate-spin"/>
            {busy}. You can leave this screen.
          </span>)}
        <span className="ml-auto text-sm text-muted-foreground" data-testid="offers-count">
          {active.length} in use, {offers.length - active.length} draft{offers.length - active.length === 1 ? "" : "s"}
        </span>
      </div>

      {econ?.simulated && (<p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900" data-testid="simulated-note">
          <AlertTriangle className="mt-0.5 size-4 shrink-0"/>
          <span>
            <span className="mr-1.5 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-bold text-amber-950">Example</span> {simulatedLead(econ)}: they stand in for {brandName}&apos;s store and ad account until those are connected, and are no record of how the brand performs. The arithmetic is real; the inputs are not.
          </span>
        </p>)}
      {!econ && (<p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="no-economics">
          <AlertTriangle className="mt-0.5 size-4 shrink-0"/>
          {advanced ? <span>{brandName}&apos;s costs are not entered, so no offer&apos;s margin can be worked out. Enter them under &ldquo;The numbers&rdquo; below: what a unit costs to make, what an order costs to ship, and the return the ads run at.</span> : <span>{brandName}&apos;s costs are not entered, so offers cannot be priced. Enter them in the Advanced view of Offers, under &ldquo;The numbers&rdquo;: what a unit costs to make, what an order costs to ship, and the return the ads run at.</span>}
        </p>)}
      {error && !busy && (<p className="flex items-start gap-1.5 text-sm text-red-700" data-testid="offers-error">
          <AlertTriangle className="mt-0.5 size-4 shrink-0"/>
          {error}
        </p>)}

      <Tabs value={shownTab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="build" data-testid="tab-build">
            Build an offer
          </TabsTrigger>
          {advanced && (<TabsTrigger value="now" data-testid="tab-now">
            Where it stands{triggered ? <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">{triggered}</span> : null}
          </TabsTrigger>)}
          <TabsTrigger value="offers" data-testid="tab-offers">
            Offers<span className="ml-1.5 text-xs text-muted-foreground">{offers.length}</span>
          </TabsTrigger>
          <TabsTrigger value="industries" data-testid="tab-industries">
            Other industries<span className="ml-1.5 text-xs text-muted-foreground">{industries.length}</span>
          </TabsTrigger>
          {advanced && (<TabsTrigger value="calculator" data-testid="tab-calculator">
            Discount calculator
          </TabsTrigger>)}
        </TabsList>


        <TabsContent value="build" className="mt-10">
          <OfferPathBuilder ctx={ctx} personas={pathPersonas} guarantee={guarantee} book={book} brandName={brandName} onSaved={(b) => {
            setBook(b);
            setTab("offers");
            router.refresh();
        }}/>
        </TabsContent>


        <TabsContent value="now" className="mt-5 space-y-8">
          <section data-testid="running-now">
            <Head title="What runs now" note="The price points in the brand brain, each as 1 order of 1 unit."/>
            <div className="mt-3 overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2.5 font-medium">Price point</th>
                    <th className="whitespace-nowrap p-2.5 text-right font-medium">Customer pays</th>
                    <th className="whitespace-nowrap p-2.5 text-right font-medium">Kept before ads</th>
                    <th className="whitespace-nowrap p-2.5 text-right font-medium">Breaks even at</th>
                    <th className="whitespace-nowrap p-2.5 text-right font-medium">Left after ads today</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {priced.map((o) => {
            const c = costOf(o.id);
            const w = econ && c ? waterfall({ revenue: o.price, units: 1, unit_cost: c.unit_cost, shipping: econ.shipping, fee_rate: econ.fee_rate }) : null;
            const left = w && econ ? contributionAt(w, econ.roas) : null;
            return (<tr key={o.id} data-testid={`price-${o.id}`}>
                        <td className="p-2.5">
                          <div className="font-medium">{o.name}</div>
                          {o.notes && <div className="text-xs text-muted-foreground">{o.notes}</div>}
                        </td>
                        <td className="p-2.5 text-right tabular-nums">{sym}{o.price.toFixed(2)}</td>
                        <td className="p-2.5 text-right tabular-nums">{w ? `${sym}${w.margin.toFixed(2)} (${Math.round(w.margin_rate * 100)}%)` : "not known"}</td>
                        <td className="p-2.5 text-right tabular-nums">{w ? x(w.break_even) : "not known"}</td>
                        <td className={cn("p-2.5 text-right font-medium tabular-nums", left != null && left < 0 ? "text-red-700" : "text-emerald-700")}>{left == null ? "not known" : `${left < 0 ? "-" : ""}${sym}${Math.abs(left).toFixed(2)}`}</td>
                      </tr>);
        })}
                </tbody>
              </table>
            </div>
            {econ && <p className="mt-2 text-xs text-muted-foreground">At a return on ad spend of {x(econ.roas)} on first orders. A first order that leaves less than nothing is paid back by the {Math.round((econ.retention[0] ?? 0) * 100)}% who order again.</p>}
          </section>

          <section data-testid="fit">
            <Head title="The right offer for this brand" note="4 questions, answered from the numbers. They decide which mechanics are worth building."/>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {f.answers.map((a, i) => (<div key={a.id} className={cn("rounded-lg border p-3.5", !a.known && "border-dashed")} data-testid={`answer-${a.id}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="display text-2xl text-primary">{i + 1}</span>
                    <span className="font-semibold">{a.question}</span>
                  </div>
                  <p className={cn("mt-1 text-sm", a.known ? "text-foreground/85" : "text-muted-foreground")}>{a.answer}</p>
                </div>))}
            </div>
            {econ && f.spread.shape !== "unknown" && (<div className="mt-3 rounded-lg border p-3.5">
                <div className="text-sm font-semibold">How order values are spread</div>
                <p className="text-xs text-muted-foreground">Each bar is a band of order values; the filled ones are the peaks. A threshold belongs in a green band, just above a peak. The red line is the average, which is where most thresholds get put.</p>
                <div className="mt-2 max-w-3xl">
                  <SpreadChart bands={econ.order_values} spread={f.spread} sym={sym}/>
                </div>
              </div>)}
            <div className="mt-3 rounded-lg border" data-testid="ranked">
              {f.ranked.map((r, i) => {
            const n = offers.filter((o) => o.mechanic === r.mechanic).length;
            return (<div key={r.mechanic} className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 p-3", i > 0 && "border-t")} data-testid={`rank-${r.mechanic}`}>
                    <div className="w-44 shrink-0">
                      <div className="text-sm font-semibold">{MECHANIC_INFO[r.mechanic].label}</div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className={cn("h-full rounded-full", r.score >= 75 ? "bg-emerald-600" : r.score >= 45 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${r.score}%` }}/>
                      </div>
                    </div>
                    <p className="min-w-0 flex-1 basis-64 text-sm text-muted-foreground">{r.why}</p>
                    <div className="flex items-center gap-2">
                      {n > 0 && <Badge variant="secondary" className="font-normal">{n} designed</Badge>}
                      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setBuilding([r.mechanic])} data-testid={`design-${r.mechanic}`}>
                        <Wand2 className="size-3.5"/>
                        Design
                      </Button>
                    </div>
                  </div>);
        })}
            </div>
          </section>

          <section data-testid="failures">
            <Head title="The 7 ways offers fail" note="Tested against what runs now and every offer in use, each time something changes."/>
            <ul className="mt-2 divide-y rounded-lg border px-3.5">
              {brandChecks.map((c) => (<FailureRow key={c.id} r={c} info={ctx.failures.find((x2) => x2.id === c.id)}/>))}
            </ul>
          </section>

          <NumbersEditor ctx={ctx} econ={econ} onSaved={(e) => { setEcon(e); router.refresh(); }}/>
        </TabsContent>


        <TabsContent value="offers" className="mt-10 space-y-12">
          <InUse initial={book} sym={sym} refreshKey={offers}/>
          <div className="border-t pt-8">
            <h2 className="display text-3xl">Earlier designs</h2>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">Offers designed earlier, kept as they were. The first 5 groups are the 5 ways to build an offer. Cross-sells and post-purchase offers come after the main offer: they add profit to an order that is already decided.</p>
          </div>
          {[...f.ranked.filter((r) => mainMechanic(r.mechanic)), ...f.ranked.filter((r) => !mainMechanic(r.mechanic))].map((r) => {
            const info = MECHANIC_INFO[r.mechanic];
            const list = offers.filter((o) => o.mechanic === r.mechanic);
            return (<section key={r.mechanic} data-testid={`mechanic-${r.mechanic}`}>
                <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-6">
                  <div className="min-w-0">
                    <h2 className="display text-2xl">{info.label}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/80">Changes:</span> {info.changes} <span className="font-medium text-foreground/80">Margin:</span> {info.margin}. <span className="font-medium text-foreground/80">Best for:</span> {info.best}.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(blankOffer(ctx, r.mechanic))} data-testid={`write-${r.mechanic}`}>
                      <Pencil className="size-3.5"/>
                      Write
                    </Button>
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setBuilding([r.mechanic])}>
                      <Wand2 className="size-3.5"/>
                      Design
                    </Button>
                  </div>
                </div>
                {list.length ? (<ul className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {list.map((d) => (<li key={d.id}>
                        <OfferCard d={d} ctx={ctx} onOpen={() => setEditing(toDraft(d))}/>
                      </li>))}
                  </ul>) : (<p className="mt-3 text-sm text-muted-foreground">{r.mechanic === "reposition" ? "No positioning yet. Each one is a new buyer and a new reason to buy the same product, and each becomes a concept to write scripts from." : `No ${info.one} designed yet.`}</p>)}
              </section>);
        })}
        </TabsContent>


        <TabsContent value="industries" className="mt-10">
          <IndustriesTab note={industriesNote} groups={groups} industries={industries} borrowed={borrowed} brandName={brandName} category={category} live={ctx.live} busy={!!busy || pending} onBuild={(b) => act(() => buildOffersAction({ mechanics: [], count: b.count, notes: b.notes, industry: b.industry }), "Designing borrowed offers. About 2 minutes.", () => setTab("offers"))} onResearch={(id) => act(() => researchIndustryAction(id), "Researching on the web. About a minute.")}/>
        </TabsContent>


        <TabsContent value="calculator" className="mt-5">
          <Calculator ctx={ctx} econ={econ} brand={brandName} onSaved={(e) => { setEcon(e); router.refresh(); }}/>
        </TabsContent>
      </Tabs>

      {building && <BuildDialog initial={building} ranked={f.ranked.map((r) => r.mechanic)} econ={econ} live={ctx.live} have={offers.length} onClose={() => setBuilding(null)} onStart={(b) => act(() => buildOffersAction(b), "Designing offers. About 2 minutes.", () => setTab("offers"))}/>}
      {editing && (<OfferEditor draft={editing} was={offers.find((o) => o.id === editing.id) ?? null} ctx={ctx} onClose={() => setEditing(null)} onChanged={async () => {
                await refresh();
                router.refresh();
            }}/>)}
    </div>);
}
const Head = ({ title, note }: {
    title: string;
    note: string;
}) => (<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t pt-8">
    <h2 className="display text-3xl">{title}</h2>
    <p className="text-sm text-muted-foreground">{note}</p>
  </div>);
function BuildDialog({ initial, ranked, econ, live, have, onClose, onStart }: {
    initial: Mechanic[];
    ranked: Mechanic[];
    econ: Economics | null;
    live: boolean;
    have: number;
    onClose: () => void;
    onStart: (b: {
        mechanics: Mechanic[];
        count: number;
        notes: string;
    }) => void;
}) {
    const [picked, setPicked] = useState<Mechanic[]>(initial);
    const only = picked.length === 1 ? picked[0] : null;
    const [count, setCount] = useState(initial.length === 1 ? (initial[0] === "reposition" ? 6 : 3) : 6);
    const [notes, setNotes] = useState("");
    const advanced = useAdvanced();
    return (<Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl" data-testid="build-dialog">
        <DialogHeader>
          <DialogTitle>Design offers</DialogTitle>
          <DialogDescription>The app reads what the brand sells, its numbers, its buyers and what they want and fear, and designs offers with the mechanics you pick. Each is priced, tested against the 7 failures, and arrives as a draft.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid gap-1.5 sm:grid-cols-2" data-testid="build-mechanics">
            {(ranked.length ? ranked : [...MECHANICS]).map((m) => (<label key={m} className="flex items-center gap-2 rounded-md border p-2">
                <Checkbox checked={picked.includes(m)} onCheckedChange={(v) => setPicked((cur) => (v ? [...cur, m] : cur.filter((c) => c !== m)))} data-testid={`pick-${m}`}/>
                {MECHANIC_INFO[m].label}
              </label>))}
          </div>
          {only === "reposition" && <p className="rounded-md bg-muted/60 p-2.5 text-xs">Each positioning is a different buyer, problem and headline for the same product, with terms built around that buyer. Put one in use and its buyer becomes a persona and a draft concept is filed, ready for scripts.</p>}
          <div className="flex items-center gap-3">
            <Label htmlFor="offer-count" className="shrink-0">
              How many
            </Label>
            <Input id="offer-count" type="number" min={1} max={8} value={count} onChange={(e) => setCount(Math.max(1, Math.min(8, Number(e.target.value) || 1)))} className="w-20" data-testid="build-count"/>
            <span className="text-xs text-muted-foreground">{have ? `${have} designed so far. None is repeated.` : "Spread across the mechanics picked."}</span>
          </div>
          <Textarea placeholder="Notes (optional): a buyer to design for, something the brand can give away cheaply, something it can't do" value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 600))} data-testid="build-notes"/>
          {econ?.simulated && <p className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">The costs are simulated, so each offer&apos;s margin is an illustration, not a figure to act on.</p>}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{live ? (advanced ? "About 3 cents, and about 2 minutes." : "About 2 minutes.") : "Not switched on for this account. Write one by hand instead."}</span>
            <Button disabled={!live || !picked.length} onClick={() => { onStart({ mechanics: picked, count, notes }); onClose(); }} data-testid="build-start">
              <Wand2 className="size-4"/>
              Design
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);
}
function NumbersEditor({ ctx, econ, onSaved }: {
    ctx: Ctx;
    econ: Economics | null;
    onSaved: (e: Economics) => void;
}) {
    const advanced = useAdvanced();
    const [costs, setCosts] = useState<Record<string, string>>(() => Object.fromEntries(ctx.ob.products.map((p) => [p.id, String(econ?.products.find((x2) => x2.product_id === p.id)?.unit_cost ?? "")])));
    const [ship, setShip] = useState<string[]>(() => [0, 1, 2].map((i) => String(econ?.shipping[i] ?? "")));
    const [fee, setFee] = useState(String(econ ? Math.round(econ.fee_rate * 1000) / 10 : 3));
    const [roas, setRoas] = useState(String(econ?.roas ?? ""));
    const [pending, start] = useTransition();
    const save = () => start(async () => {
        const products = ctx.ob.products.filter((p) => costs[p.id]?.trim()).map((p) => ({ product_id: p.id, unit_cost: Number(costs[p.id]), ...(p.cycle_days ? { cycle_days: p.cycle_days } : {}) }));
        const res = await saveEconomicsAction({ products, shipping: ship.filter((s) => s.trim()).map(Number), fee_rate: Number(fee) / 100, roas: Number(roas) });
        if (!res.ok)
            return void toast.error(res.error);
        toast.success("Saved. Every offer is priced with these from now on.");
        onSaved(res.economics);
    });
    return (<section data-testid="numbers">
      <Head title="The numbers" note="What every offer is priced with. Enter the brand's own to replace the simulated ones."/>
      <div className="mt-3 grid gap-4 rounded-lg border p-3.5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="text-xs font-medium">What 1 unit costs to make ({ctx.sym})</div>
          {ctx.ob.products.map((p) => (<label key={p.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate" title={p.name}>{p.name}</span>
              <Input type="number" step="0.01" className="w-24" value={costs[p.id] ?? ""} onChange={(e) => setCosts((c) => ({ ...c, [p.id]: e.target.value }))} data-testid={`cost-${p.id}`}/>
            </label>))}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-medium">Pick, pack and post an order of ({ctx.sym})</div>
          {[0, 1, 2].map((i) => (<label key={i} className="flex items-center gap-2 text-sm">
              <span className="flex-1">{i + 1} unit{i ? "s" : ""}</span>
              <Input type="number" step="0.01" className="w-24" value={ship[i]} onChange={(e) => setShip((s) => s.map((v, k) => (k === i ? e.target.value : v)))} data-testid={`ship-${i + 1}`}/>
            </label>))}
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="flex-1">Payment fees, %</span>
            <Input type="number" step="0.1" className="w-24" value={fee} onChange={(e) => setFee(e.target.value)} data-testid="fee-rate"/>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="flex-1">Return on ad spend, first orders</span>
            <Input type="number" step="0.01" className="w-24" value={roas} onChange={(e) => setRoas(e.target.value)} data-testid="roas"/>
          </label>
          <div className="flex justify-end pt-1">
            <Button size="sm" onClick={save} disabled={pending} data-testid="save-numbers">
              Save the numbers
            </Button>
          </div>
        </div>
      </div>
      {econ && (advanced || econ.simulated) && <p className="mt-2 text-xs text-muted-foreground">{advanced ? tabNames(econ.source) : "Example figures until your store is connected."}</p>}
    </section>);
}
