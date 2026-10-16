"use client";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Check, CircleHelp, Loader2, PenLine, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdvanced } from "@/components/mode";
import type { BrandOffer } from "@/lib/offers/book";
import { spread, thresholdsFor } from "@/lib/offers/economics";
import { ADDON_CHOICE, ADDON_IDS, FREQUENCIES, FREQUENCY_LABEL, MAIN_MECHANICS, MECHANIC_CHOICE, PART_IDS, PART_INFO, QUESTIONS, SLOTS, SLOT_INFO, coverage, downstreamProfit, downstreamTotal, downstreamWarnings, numbersTable, pathWarnings, recommend, tableRows, type AddonId, type DownstreamRow, type Frequency, type MainMechanic, type OfferPath, type PathFacts, type Slot } from "@/lib/offers/path";
import { checkContext, pathFacts } from "@/lib/offers/path-facts";
import { isDesigned } from "@/lib/offers/types";
import type { OfferWords } from "@/lib/offers/words";
import { cn } from "@/lib/utils";
import type { Ctx } from "./offer-parts";
import { savePathOfferAction, writeOfferWordsAction } from "./path-actions";
export interface PathPersona {
    id: string;
    name: string;
    status: "active" | "draft";
    angle: string;
    product_ids: string[];
    doubts: {
        doubt: string;
        proof: string;
    }[];
}
const n = (s: string) => {
    const v = Number(s);
    return Number.isFinite(v) && v >= 0 ? v : 0;
};
function Step({ k, title, note, children, testid }: {
    k: string;
    title: string;
    note: string;
    children: React.ReactNode;
    testid: string;
}) {
    return (<section className="border-t pt-8" data-testid={testid}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="numeral text-3xl text-primary">{k}</span>
        <h2 className="display text-3xl">{title}</h2>
        <p className="min-w-0 flex-1 basis-64 text-sm text-muted-foreground">{note}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>);
}
const Rec = () => <span className="rounded-sm bg-signal px-1.5 py-0.5 text-xs font-semibold text-signal-foreground">Recommended</span>;
function Num({ label, value, onChange, testid, hint, className }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    testid: string;
    hint?: string;
    className?: string;
}) {
    return (<label className={cn("flex items-center gap-2 text-sm", className)}>
      <span className="min-w-0 flex-1">
        {label}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Input type="number" step="0.01" min={0} inputMode="decimal" className="w-24 text-right tabular-nums" value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid}/>
    </label>);
}
export function OfferPathBuilder({ ctx, personas, guarantee, book, brandName, onSaved }: {
    ctx: Ctx;
    personas: PathPersona[];
    guarantee: string;
    book: BrandOffer[];
    brandName: string;
    onSaved: (book: BrandOffer[]) => void;
}) {
    const advanced = useAdvanced();
    const { econ, sym } = ctx;
    const priced = ctx.ob.offers.filter((o) => !isDesigned(o.id));
    const usable = personas.filter((p) => p.status === "active").length ? personas.filter((p) => p.status === "active") : personas;
    const [personaId, setPersonaId] = useState(usable[0]?.id ?? "");
    const persona = personas.find((p) => p.id === personaId) ?? null;
    const [objection, setObjection] = useState(usable[0]?.doubts[0]?.doubt ?? "");
    const [audience, setAudience] = useState<OfferPath["audience"]>("new");
    const [angle, setAngle] = useState<string | null>(null);
    const proof = persona?.doubts.find((d) => d.doubt === objection)?.proof ?? "";
    const pickPersona = (id: string) => {
        setPersonaId(id);
        setObjection(personas.find((p) => p.id === id)?.doubts[0]?.doubt ?? "");
        setWords(null);
    };
    const known = useMemo(() => pathFacts(ctx.ob, econ, !!guarantee), [ctx.ob, econ, guarantee]);
    const [answers, setAnswers] = useState<Partial<Pick<PathFacts, "peaks" | "range" | "repeat">>>({});
    const facts: PathFacts = { ...known, ...answers };
    const rec = useMemo(() => recommend(facts, objection), [facts.margin_rate, facts.peaks, facts.range, facts.repeat, facts.has_guarantee, facts.flat_discounts, objection]);
    const [picked, setPicked] = useState<MainMechanic | null>(null);
    const mechanic = picked ?? rec.mechanic;
    const [ticks, setTicks] = useState<Partial<Record<AddonId, boolean>>>({});
    const [texts, setTexts] = useState<Partial<Record<AddonId, string>>>({ risk_reversal: guarantee });
    const needsExtra = mechanic === "gift" || mechanic === "tiered";
    const on = (id: AddonId) => (id === "free_extra" && needsExtra ? true : (ticks[id] ?? rec.addons[id].on));
    const firstProduct = persona?.product_ids.find((id) => ctx.ob.products.some((p) => p.id === id)) ?? ctx.ob.products[0]?.id ?? "";
    const [productPick, setProductPick] = useState<string | null>(null);
    const productId = productPick ?? firstProduct;
    const product = ctx.ob.products.find((p) => p.id === productId);
    const forProduct = priced.filter((o) => !ctx.offerProduct[o.id] || ctx.offerProduct[o.id] === productId);
    const [basePick, setBasePick] = useState<string | null>(null);
    const baseOffer = (forProduct.length ? forProduct : priced).find((o) => o.id === (basePick ?? (forProduct.some((o2) => o2.id === econ?.reorder_offer_id) ? econ?.reorder_offer_id : forProduct[0]?.id))) ?? (forProduct.length ? forProduct : priced)[0];
    const cost = econ?.products.find((p) => p.product_id === productId);
    const [typed, setTyped] = useState<Partial<Record<"price" | "unit_cost" | "ship1" | "ship2" | "ship3" | "fee" | "roas" | "units_before" | "units_after" | "qty" | "discount" | "extra_cost" | "extra_value" | "threshold", string>>>({});
    const set = (k: keyof typeof typed) => (v: string) => {
        setTyped((t) => ({ ...t, [k]: v }));
        if (k === "price" || k === "qty" || k === "discount" || k === "extra_value" || k === "threshold")
            setWords(null);
    };
    const s = useMemo(() => spread(econ?.order_values ?? []), [econ]);
    const qtyDefault = mechanic === "bundle" ? (product?.cycle_days ? 3 : 2) : mechanic === "gift" ? 2 : 1;
    const f = {
        price: typed.price ?? String(baseOffer?.price ?? ""),
        unit_cost: typed.unit_cost ?? String(cost?.unit_cost ?? ""),
        ship1: typed.ship1 ?? String(econ?.shipping[0] ?? ""),
        ship2: typed.ship2 ?? String(econ?.shipping[1] ?? ""),
        ship3: typed.ship3 ?? String(econ?.shipping[2] ?? ""),
        fee: typed.fee ?? String(econ ? Math.round(econ.fee_rate * 1000) / 10 : 0),
        roas: typed.roas ?? String(econ?.roas ?? ""),
        units_before: typed.units_before ?? "1",
        qty: typed.qty ?? String(qtyDefault),
        discount: typed.discount ?? (mechanic === "discount" ? "20" : "0"),
        extra_cost: typed.extra_cost ?? "",
        extra_value: typed.extra_value ?? "",
        threshold: typed.threshold ?? (mechanic === "tiered" && s.shape !== "unknown" ? String(Math.round(thresholdsFor(s)[0]?.from ?? 0)) : ""),
    };
    const unitsAfter = typed.units_after ?? (mechanic === "bundle" || mechanic === "gift" ? f.qty : f.units_before);
    const [frequency, setFrequency] = useState<Frequency | null>(null);
    const [showAfter, setShowAfter] = useState(false);
    const [rows, setRows] = useState<{
        slot: Slot;
        item: string;
        price: string;
        margin: string;
        take: string;
        discount: string;
    }[]>([]);
    const downstream: DownstreamRow[] = rows.map((r) => ({ slot: r.slot, item: r.item, price: n(r.price), margin: Math.min(1, n(r.margin) / 100), take_rate: Math.min(1, n(r.take) / 100), ...(n(r.discount) > 0 ? { discount: Math.min(1, n(r.discount) / 100) } : {}) }));
    const [words, setWords] = useState<OfferWords | null>(null);
    const [edit, setEdit] = useState({ name: "", page_line: "", say: "", why: "" });
    const [running, setRunning] = useState(false);
    const [writing, startWrite] = useTransition();
    const [saving, startSave] = useTransition();
    const addons: OfferPath["addons"] = Object.fromEntries(ADDON_IDS.filter((id) => on(id) && (texts[id] ?? "").trim()).map((id) => [id, texts[id]!.trim()]));
    const path: OfferPath = {
        product_id: productId,
        product_name: product?.name ?? "",
        persona_id: persona?.id ?? null,
        persona_name: persona?.name ?? "",
        objection: objection.trim(),
        proof,
        audience,
        mechanic,
        addons,
        extra_value: on("free_extra") ? n(f.extra_value) : 0,
        qty: Math.max(1, Math.round(n(f.qty)) || 1),
        base: baseOffer && typed.price === undefined ? `${baseOffer.name}, ${sym}${baseOffer.price}. ${baseOffer.notes ?? ""}`.trim().slice(0, 400) : "",
        angle: (angle ?? persona?.angle ?? "").slice(0, 300),
        threshold: mechanic === "tiered" && n(f.threshold) > 0 ? n(f.threshold) : null,
        frequency: frequency ?? (mechanic === "discount" ? "once_or_twice" : "always"),
        numbers: { price: n(f.price), unit_cost: n(f.unit_cost), shipping: [f.ship1, f.ship2, f.ship3].filter((x) => x.trim() !== "").map(n), fee_rate: Math.min(0.3, n(f.fee) / 100), units_before: Math.max(0.01, n(f.units_before) || 1), units_after: Math.max(0.01, n(unitsAfter) || 1), discount: Math.min(0.9, n(f.discount) / 100), extras_cost: on("free_extra") ? n(f.extra_cost) : 0, roas: n(f.roas) },
        downstream,
    };
    const table = numbersTable(path.numbers);
    const warnings = pathWarnings(path, checkContext(econ, sym, book.map((o) => o.audience), audience));
    const afterWarnings = downstreamWarnings(downstream);
    const cov = useMemo(() => coverage(book.map((o) => o.parts)), [book]);
    const ready = path.numbers.price > 0 && !!path.product_id;
    const write = () => startWrite(async () => {
        const res = await writeOfferWordsAction(path);
        if (!res.ok)
            return void toast.error(res.error);
        setWords(res.words);
        setEdit({ name: res.words.name, page_line: res.words.page_line, say: res.words.say, why: res.words.why });
    });
    const save = () => startSave(async () => {
        const res = await savePathOfferAction(path, { ...edit, running }, words?.written ? { name: words.name, page_line: words.page_line, say: words.say } : null);
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(`Saved: ${res.offer.name}. Writers can now pick it for ${path.persona_name || "any buyer"}.`);
        onSaved(res.book);
        setWords(null);
    });
    return (<div className="space-y-12" data-testid="offer-path">
      <div className="max-w-3xl">
        <h2 className="display text-3xl">Build an offer</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">An offer is more than money off. It has 5 parts: who it is for, the price, what is added, what removes the risk, and a real reason to act now. Make 5 short choices below. 1 option in each is marked Recommended for {brandName}; pick any you like.</p>
      </div>

      {book.length > 0 && (<div className="rounded-lg border bg-card p-5" data-testid="parts-coverage">
          <div className="text-sm font-semibold">What your {book.length} offers in use already state</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-5">
            {cov.map((c) => (<div key={c.part} className={cn("rounded-md border px-3 py-2.5 text-sm", c.have === 0 && "border-dashed border-amber-400 bg-amber-50")} data-testid={`cover-${c.part}`}>
                <div className="font-medium">{PART_INFO[c.part].label}</div>
                <div className="tabular-nums text-muted-foreground">
                  {c.have} of {c.of}
                </div>
              </div>))}
          </div>
          {cov.some((c) => c.have === 0) && (<ul className="mt-3 space-y-1 text-sm text-amber-900">
              {cov.filter((c) => c.have === 0).map((c) => (<li key={c.part}>
                  No offer states &ldquo;{PART_INFO[c.part].label.toLowerCase()}&rdquo;. Suggestion: {c.suggest}
                </li>))}
            </ul>)}
        </div>)}

      {advanced && (<div className="rounded-lg border bg-card p-5" data-testid="path-questions">
          <div className="text-sm font-semibold">The 4 questions behind every Recommended mark</div>
          <p className="text-xs text-muted-foreground">Answered from {brandName}&apos;s numbers where they are entered. Change an answer to see what the recommendation becomes.</p>
          <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="text-sm">
              <div className="font-medium">{QUESTIONS[0].question}</div>
              <div className="text-muted-foreground">{facts.margin_rate == null ? "Not known yet. Enter your costs in step 4." : `${Math.round(facts.margin_rate * 100)}% of a full-price order.`}</div>
            </div>
            {([
                { id: "peaks", q: QUESTIONS[1].question, opts: [["one", "1 group"], ["two", "2 groups"], ["unknown", "Not known"]] },
                { id: "range", q: QUESTIONS[2].question, opts: [["hero", "1 hero product"], ["many", "Many products"]] },
                { id: "repeat", q: QUESTIONS[3].question, opts: [["yes", "Yes"], ["no", "Rarely"], ["unknown", "Not known"]] },
            ] as const).map((x) => (<div key={x.id} className="text-sm">
                <div className="font-medium">{x.q}</div>
                <Select value={facts[x.id]} onValueChange={(v) => setAnswers((a) => ({ ...a, [x.id]: v }))}>
                  <SelectTrigger className="mt-1 w-full" data-testid={`question-${x.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {x.opts.map(([v, l]) => (<SelectItem key={v} value={v}>
                        {l}
                        {known[x.id] === v ? " (from your numbers)" : ""}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </div>))}
          </div>
        </div>)}


      <Step k="1" title="Who is it for?" note="Start from the buyer and their biggest doubt, not from what you want to earn." testid="path-who">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-2">
            <Label className="text-xs font-medium">The buyer</Label>
            <Select value={personaId || "none"} onValueChange={(v) => pickPersona(v === "none" ? "" : v)}>
              <SelectTrigger className="w-full" data-testid="path-persona">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {usable.map((p) => (<SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>))}
                <SelectItem value="none">No persona: any buyer</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1.5" data-testid="path-audience">
              {(advanced ? (["new", "returning", "all"] as const) : (["new", "returning"] as const)).map((a) => (<Button key={a} size="sm" variant={audience === a ? "default" : "outline"} onClick={() => setAudience(a)} data-testid={`audience-${a}`}>
                  {a === "new" ? "New buyers" : a === "returning" ? "Returning buyers" : "Everyone"}
                </Button>))}
            </div>
            <p className="text-xs text-muted-foreground">New buyers need a reason to try. Returning buyers need a reason to stay. They get different offers.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Their biggest doubt, in their words</Label>
            {persona && persona.doubts.length > 0 && (<div className="flex flex-col gap-1" data-testid="path-doubts">
                {persona.doubts.slice(0, 5).map((d) => (<button key={d.doubt} type="button" onClick={() => { setObjection(d.doubt); setWords(null); }} className={cn("rounded-md border px-2.5 py-1.5 text-left text-sm hover:bg-muted/60", objection === d.doubt && "border-primary bg-primary/5")}>
                    {d.doubt}
                    {!d.proof && <span className="ml-2 text-xs text-amber-800">no proof on file yet</span>}
                  </button>))}
              </div>)}
            <Textarea rows={2} value={objection} onChange={(e) => { setObjection(e.target.value.slice(0, 300)); setWords(null); }} placeholder="What stops this buyer just before they would buy? Ask them, or read your reviews." data-testid="path-objection"/>
            {persona && persona.doubts.length === 0 && <p className="text-xs text-muted-foreground">This persona has no doubts on file. Add them on the Personas screen, or type 1 here.</p>}
            {advanced && (<div>
                <Label className="text-xs font-medium">The angle of the ads it goes with</Label>
                <Input className="mt-1" value={angle ?? persona?.angle ?? ""} onChange={(e) => setAngle(e.target.value)} placeholder="So a script on this angle states the offer that matches it" data-testid="path-angle"/>
              </div>)}
          </div>
        </div>
      </Step>


      <Step k="2" title="How does it work?" note="5 ways to build an offer. A discount is only 1 of them, and usually the worst to lead with." testid="path-mechanic">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {MAIN_MECHANICS.map((m) => {
            const c = MECHANIC_CHOICE[m];
            return (<button key={m} type="button" onClick={() => { setPicked(m); setTyped((t) => ({ ...t, qty: undefined, discount: undefined, units_after: undefined, threshold: undefined })); setWords(null); }} aria-pressed={mechanic === m} className={cn("flex flex-col gap-2 rounded-lg border bg-card p-4 text-left transition hover:border-primary/60", mechanic === m && "border-primary bg-primary/5 ring-1 ring-primary")} data-testid={`mech-${m}`}>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold">{c.label}</span>
                  {rec.mechanic === m && <Rec />}
                </span>
                <span className="text-sm">{c.plain}</span>
                <span className="text-xs text-muted-foreground">For example: {c.example}</span>
                {rec.cautions[m] && <span className="text-xs text-amber-800">{rec.cautions[m]}</span>}
              </button>);
        })}
        </div>
        <p className="mt-4 text-sm" data-testid="path-why-recommended">
          <span className="font-medium">Why {MECHANIC_CHOICE[rec.mechanic].label.toLowerCase()} is recommended:</span> {rec.why}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          {mechanic !== "reposition" && mechanic !== "tiered" && <Num className="w-64" label={mechanic === "gift" ? "Items to buy to get the gift" : "Items in the offer"} value={f.qty} onChange={set("qty")} testid="path-qty"/>}
          {(mechanic === "discount" || mechanic === "bundle") && <Num className="w-64" label="Money off, %" hint={mechanic === "bundle" ? "0 is fine: the set can be the offer" : undefined} value={f.discount} onChange={set("discount")} testid="path-discount"/>}
          {mechanic === "tiered" && <Num className="w-72" label={`Spend level (${sym})`} hint={s.shape !== "unknown" ? `Orders bunch near ${s.peaks.map((p) => `${sym}${Math.round(p.at)}`).join(" and ")}` : "Set it just above where orders bunch"} value={f.threshold} onChange={set("threshold")} testid="path-threshold"/>}
          {path.numbers.discount > 0 && (<label className="flex items-center gap-2 text-sm">
              How often it runs
              <Select value={path.frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                <SelectTrigger className="w-48" data-testid="path-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((x) => (<SelectItem key={x} value={x}>
                      {FREQUENCY_LABEL[x]}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </label>)}
        </div>
      </Step>


      <Step k="3" title="What do you add?" note="Tick only what this buyer cares about. Simple offers scale." testid="path-addons">
        <div className="grid gap-4 md:grid-cols-2">
          {ADDON_IDS.map((id) => {
            const c = ADDON_CHOICE[id];
            const forced = id === "free_extra" && needsExtra;
            return (<div key={id} className={cn("rounded-lg border bg-card p-4", on(id) && "border-primary bg-primary/5")} data-testid={`addon-${id}`}>
                <label className="flex items-start gap-2.5">
                  <Checkbox className="mt-0.5" checked={on(id)} disabled={forced} onCheckedChange={(v) => { setTicks((t) => ({ ...t, [id]: !!v })); setWords(null); }} data-testid={`tick-${id}`}/>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold">{id === "free_extra" && mechanic === "gift" ? "The gift" : id === "free_extra" && mechanic === "tiered" ? "The reward at that spend level" : c.label}</span>
                      {rec.addons[id].on && <Rec />}
                    </span>
                    <span className="block text-sm">{c.plain}</span>
                    <span className="block text-xs text-muted-foreground">For example: {c.example}</span>
                    <span className="block text-xs text-muted-foreground">{rec.addons[id].why}</span>
                  </span>
                </label>
                {on(id) && (<div className="mt-2 space-y-2 pl-6">
                    <Input value={texts[id] ?? ""} onChange={(e) => { setTexts((t) => ({ ...t, [id]: e.target.value.slice(0, 300) })); setWords(null); }} placeholder={c.ask} data-testid={`addon-text-${id}`}/>
                    {id === "urgency" && <p className="text-xs text-muted-foreground">Leave it blank if nothing really ends. An invented deadline is worse than none.</p>}
                    {id === "free_extra" && (<div className="flex flex-wrap gap-4">
                        <Num className="w-56" label={`It costs you (${sym})`} value={f.extra_cost} onChange={set("extra_cost")} testid="path-extra-cost"/>
                        <Num className="w-64" label={`It sells for (${sym})`} hint="Its own price on your site" value={f.extra_value} onChange={set("extra_value")} testid="path-extra-value"/>
                      </div>)}
                  </div>)}
              </div>);
        })}
        </div>
      </Step>


      <Step k="4" title="Do the numbers work?" note="Worked out as you type." testid="path-numbers">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <div className="space-y-2.5 rounded-lg border p-3.5">
            {ctx.ob.products.length > 1 && (<label className="flex items-center gap-2 text-sm">
                <span className="flex-1">Product</span>
                <Select value={productId} onValueChange={(v) => { setProductPick(v); setBasePick(null); setTyped((t) => ({ ...t, price: undefined, unit_cost: undefined })); setWords(null); }}>
                  <SelectTrigger className="w-64" data-testid="path-product">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ctx.ob.products.map((p) => (<SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </label>)}
            {forProduct.length > 0 && (<label className="flex items-center gap-2 text-sm">
                <span className="flex-1">Start from a price you set</span>
                <Select value={baseOffer?.id ?? ""} onValueChange={(v) => { setBasePick(v); setTyped((t) => ({ ...t, price: undefined })); setWords(null); }}>
                  <SelectTrigger className="w-64" data-testid="path-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {forProduct.map((o) => (<SelectItem key={o.id} value={o.id}>
                        {o.name} ({sym}
                        {o.price})
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </label>)}
            <Num label={`Price of 1 item (${sym})`} value={f.price} onChange={set("price")} testid="path-price"/>
            <Num label={`What 1 item costs you to make (${sym})`} value={f.unit_cost} onChange={set("unit_cost")} testid="path-unit-cost"/>
            <div className="text-xs font-medium">Pick, pack and post an order of ({sym})</div>
            <div className="grid grid-cols-3 gap-2">
              {(["ship1", "ship2", "ship3"] as const).map((k, i) => (<label key={k} className="text-xs text-muted-foreground">
                  {i + 1} item{i ? "s" : ""}
                  <Input type="number" step="0.01" min={0} className="mt-0.5 text-right tabular-nums" value={f[k]} onChange={(e) => set(k)(e.target.value)} data-testid={`path-${k}`}/>
                </label>))}
            </div>
            <p className="text-xs text-muted-foreground">Sending 3 costs far less than 3 times sending 1. That saving is where bundles earn their keep.</p>
            <Num label="Items in an order today" value={f.units_before} onChange={set("units_before")} testid="path-units-before"/>
            <Num label="Items in an order with this offer" hint="Your best guess. Test it." value={unitsAfter} onChange={set("units_after")} testid="path-units-after"/>
            <Num label="What ads bring back per 1 spent" hint="Today, or your target" value={f.roas} onChange={set("roas")} testid="path-roas"/>
            {advanced && <Num label="Payment fees, % of what is paid" value={f.fee} onChange={set("fee")} testid="path-fee"/>}
            {econ?.simulated && <p className="text-xs text-amber-800">Some of these start from example figures, not {brandName}&apos;s own. Type your own over them.</p>}
          </div>

          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm" data-testid="path-table">
                <thead className="border-b bg-muted/50 text-right text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left font-medium">1 order</th>
                    <th className="p-2 font-medium">Today</th>
                    <th className="p-2 font-medium">With this offer</th>
                  </tr>
                </thead>
                <tbody className="divide-y tabular-nums">
                  {tableRows(table, sym, path.numbers.roas).filter((r) => r.id !== "extras" || table.after.extras > 0).map((r) => (<tr key={r.id} data-testid={`row-${r.id}`} className={cn((r.id === "keep" || r.id === "left" || r.id === "needed") && "font-medium")}>
                      <td className="p-2">
                        <span className="inline-flex items-center gap-1">
                          {r.label}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground" aria-label={`The term for this: ${r.term}`}>
                                <CircleHelp className="size-3.5"/>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{r.term}</TooltipContent>
                          </Tooltip>
                        </span>
                      </td>
                      <td className="p-2 text-right">{r.before}</td>
                      <td className={cn("p-2 text-right", r.good && "text-emerald-700", r.bad && "text-red-700")}>{r.after}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>
            <p className="text-sm" data-testid="path-verdict">
              {!ready
            ? "Enter a price to see the numbers."
            : Math.abs(table.hold.roas - path.numbers.roas) < 0.005
                ? "This offer changes nothing in the sums: the same return on ads keeps the same profit per order. It has to win by bringing in more buyers."
                : table.easier
                    ? `With this offer, ads can do worse than today (${Number.isFinite(table.hold.roas) ? table.hold.roas.toFixed(2) : "any"}x against ${path.numbers.roas.toFixed(2)}x) and you still keep the same profit per order.`
                    : Number.isFinite(table.hold.roas)
                        ? `With this offer, ads must do better than today (${table.hold.roas.toFixed(2)}x against ${path.numbers.roas.toFixed(2)}x) to keep the same profit per order.${table.hold_plus_10 && Number.isFinite(table.hold_plus_10.roas) ? ` 10 points more off would need ${table.hold_plus_10.roas.toFixed(2)}x: it climbs faster with every point.` : ""}`
                        : "With this offer, no return on ads keeps today's profit per order."}
            </p>
            <div className={cn("rounded-lg border p-3", warnings.length ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50")} data-testid="path-warnings">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                {warnings.length ? <AlertTriangle className="size-4 text-amber-700"/> : <Check className="size-4 text-emerald-700"/>}
                {warnings.length ? `${warnings.length} thing${warnings.length === 1 ? "" : "s"} to look at` : "None of the 7 ways offers fail shows up here"}
              </div>
              {warnings.length > 0 && (<ul className="mt-1.5 space-y-1 text-sm text-amber-950">
                  {warnings.map((w, k) => (<li key={k} data-testid={`warn-${w.id}`}>
                      {w.text}
                    </li>))}
                </ul>)}
              <p className="mt-1.5 text-xs text-muted-foreground">These are notes, not a block. You can save the offer as it is.</p>
            </div>
          </div>
        </div>
      </Step>


      <Step k="5" title="After the main offer" note="Optional. Extra profit on an order that is already decided: in the cart, at checkout, after payment, or when someone leaves." testid="path-after">
        {!showAfter && rows.length === 0 ? (<Button variant="outline" size="sm" onClick={() => { setShowAfter(true); setRows([{ slot: "post_purchase", item: "", price: "", margin: "60", take: "20", discount: "" }]); }} data-testid="after-open">
            <Plus className="size-3.5"/>
            Plan an add-on
          </Button>) : (<div className="space-y-2">
            <p className="text-sm text-muted-foreground">Added profit per order is the share who take it, times its price, times what you keep of it. Judge an add-on by that, not by how many take it.</p>
            {rows.map((r, k) => {
                const d = downstream[k];
                const upd = (patch: Partial<(typeof rows)[number]>) => setRows((all) => all.map((x, i) => (i === k ? { ...x, ...patch } : x)));
                return (<div key={k} className="grid items-end gap-2 rounded-lg border p-2.5 md:grid-cols-[11rem_minmax(0,1fr)_6rem_6rem_6rem_7rem_2rem]" data-testid={`after-row-${k}`}>
                  <label className="text-xs text-muted-foreground">
                    Where
                    <Select value={r.slot} onValueChange={(v) => upd({ slot: v as Slot })}>
                      <SelectTrigger className="mt-0.5 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SLOTS.map((x) => (<SelectItem key={x} value={x}>
                            {SLOT_INFO[x].label}
                          </SelectItem>))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="text-xs text-muted-foreground">
                    What is offered
                    <Input className="mt-0.5" value={r.item} onChange={(e) => upd({ item: e.target.value })} placeholder={r.slot === "checkout" ? "Shipping protection" : "A product that goes with the order"} data-testid={`after-item-${k}`}/>
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Price ({sym})
                    <Input type="number" min={0} className="mt-0.5 text-right" value={r.price} onChange={(e) => upd({ price: e.target.value })} data-testid={`after-price-${k}`}/>
                  </label>
                  <label className="text-xs text-muted-foreground">
                    You keep, %
                    <Input type="number" min={0} max={100} className="mt-0.5 text-right" value={r.margin} onChange={(e) => upd({ margin: e.target.value })}/>
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Take it, %
                    <Input type="number" min={0} max={100} className="mt-0.5 text-right" value={r.take} onChange={(e) => upd({ take: e.target.value })}/>
                  </label>
                  <div className="text-sm font-medium tabular-nums" data-testid={`after-profit-${k}`}>
                    +{sym}
                    {downstreamProfit(d).toFixed(2)} an order
                  </div>
                  <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Remove this add-on" onClick={() => setRows((all) => all.filter((_, i) => i !== k))}>
                    <X className="size-4"/>
                  </button>
                  <p className="text-xs text-muted-foreground md:col-span-7">
                    {SLOT_INFO[r.slot].tip}
                    {SLOT_INFO[r.slot].typical ? ` Typical: ${SLOT_INFO[r.slot].typical}.` : ""}
                    {r.slot.startsWith("exit") && (<span className="ml-2 inline-flex items-center gap-1">
                        Money off, %
                        <Input type="number" min={0} max={100} className="h-7 w-16 text-right" value={r.discount} onChange={(e) => upd({ discount: e.target.value })}/>
                      </span>)}
                  </p>
                </div>);
            })}
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setRows((all) => [...all, { slot: "cart", item: "", price: "", margin: "60", take: "10", discount: "" }])} data-testid="after-add">
                <Plus className="size-3.5"/>
                Add another
              </Button>
              <span className="text-sm font-medium tabular-nums" data-testid="after-total">
                In all: +{sym}
                {downstreamTotal(downstream).toFixed(2)} an order
                {table.after.left > 0 ? `, on top of ${sym}${table.after.left.toFixed(2)}` : ""}
              </span>
            </div>
            {afterWarnings.length > 0 && (<ul className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-sm text-amber-950" data-testid="after-warnings">
                {afterWarnings.map((w) => (<li key={w}>{w}</li>))}
              </ul>)}
          </div>)}
      </Step>


      <section className="rounded-xl border bg-card p-6 max-md:p-4" data-testid="path-words">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1 basis-72">
            <h2 className="display text-3xl">Word it and save</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The app writes a name, the line for the page, the line a person says in a script, and why it answers the doubt. It is sent only your choices above.
              {advanced && ctx.live ? " About a fifth of a cent." : ""}
              {!ctx.live ? " You get plain wording to edit." : ""}
            </p>
          </div>
          <Button size="lg" onClick={write} disabled={!ready || writing} data-testid="path-write">
            {writing ? <Loader2 className="size-4 animate-spin"/> : <PenLine className="size-4"/>}
            {words ? "Write it again" : "Write the wording"}
          </Button>
        </div>
        {words && (<div className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Name</Label>
                <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} data-testid="words-name"/>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">On the page</Label>
                <Input value={edit.page_line} onChange={(e) => setEdit({ ...edit, page_line: e.target.value })} data-testid="words-page"/>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">How a person says it (scripts end on this)</Label>
              <Textarea rows={2} value={edit.say} onChange={(e) => setEdit({ ...edit, say: e.target.value })} data-testid="words-say"/>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Why it answers the doubt</Label>
              <Textarea rows={2} value={edit.why} onChange={(e) => setEdit({ ...edit, why: e.target.value })} data-testid="words-why"/>
            </div>
            {words.gift && (<p className={cn("rounded-md border p-2.5 text-sm", words.gift.fit === "yes" ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50")} data-testid="words-gift">
                <span className="font-medium">Would this buyer want the {mechanic === "gift" ? "gift" : "extra"}? {words.gift.fit === "yes" ? "Likely yes." : words.gift.fit === "no" ? "Likely not." : "Not sure."}</span> {words.gift.note} This is a guess from their profile. Ask real buyers before it ships.
              </p>)}
            {(words.notes ?? []).map((n, k) => (<p key={k} className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs" data-testid="words-note">
                Worth a look. {n}
              </p>))}
            {!words.written && <p className="text-xs text-muted-foreground">Plain wording. Change it as you like.</p>}
            <div className="flex flex-wrap items-center gap-4 border-t pt-3">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={running} onCheckedChange={setRunning} data-testid="words-running"/>
                {brandName} runs this offer today
              </label>
              <span className="min-w-0 flex-1 text-xs text-muted-foreground">Saved offers are listed under Offers. Writers can pick this one for {path.persona_name || "any buyer"}.</span>
              <Button onClick={save} disabled={saving || edit.name.trim().length < 2} data-testid="path-save">
                {saving ? <Loader2 className="size-4 animate-spin"/> : <Save className="size-4"/>}
                Save the offer
              </Button>
            </div>
          </div>)}
      </section>
    </div>);
}
export function PartChips({ o }: {
    o: BrandOffer;
}) {
    return (<div className="mt-3 flex flex-wrap gap-1.5" data-testid={`parts-${o.id}`}>
      {PART_IDS.map((id) => (<Tooltip key={id}>
          <TooltipTrigger asChild>
            <span className={cn("rounded-full border px-2 py-0.5 text-xs", o.parts[id]?.trim() ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-dashed text-muted-foreground")}>{PART_INFO[id].label}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{o.parts[id]?.trim() || `Not stated. ${PART_INFO[id].suggest}`}</TooltipContent>
        </Tooltip>))}
    </div>);
}
