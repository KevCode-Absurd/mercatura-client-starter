"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Capture } from "@/lib/landing/capture";
import { KIND_LABEL, ORIGIN_LABEL, PAGE_KINDS, type AdInsights, type AdOrigin, type PageKind, FORMULAS, FORMULA_INFO, type Formula } from "@/lib/landing/types";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { captureAction, createPageAction } from "../../actions";
import { BuyingTaskFields, defaultBuyingTask } from "../../buying-task-fields";
interface Ad {
    id: string;
    origin: AdOrigin;
    title: string;
    headline: string;
    angle: string;
    awareness: string;
    segment: string | null;
    insights: AdInsights | null;
    matched: {
        id: string;
        name: string;
        by: "ad" | "audience";
    } | null;
    kind: PageKind;
}
interface Persona {
    id: string;
    name: string;
    status: "active" | "draft";
    who: {
        age: string;
        gender: string;
        life: string;
    };
    awareness: string;
    angle: string;
    problem: string;
    kind: PageKind;
    segment: string | null;
    roas: number | null;
}
interface Props {
    tab: string;
    preselectAd: string | null;
    preselectPersona: string | null;
    ads: Ad[];
    personas: Persona[];
    products: {
        id: string;
        name: string;
    }[];
    offers: {
        id: string;
        name: string;
        price: number;
        per_day: number | null;
    }[];
    currency: string;
}
const sel = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;
function KindPicker({ value, onChange, recommended }: {
    value: PageKind;
    onChange: (k: PageKind) => void;
    recommended: PageKind;
}) {
    return (<div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Page type">
      {PAGE_KINDS.map((k) => (<button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)} className={cn("rounded-md border-2 p-2.5 text-left text-xs", value === k ? "border-primary bg-secondary" : "border-border hover:border-foreground/40")} data-testid={`kind-${k}`}>
          <div className="text-sm font-bold">
            {KIND_LABEL[k].label}
            {k === recommended && <span className="ml-1.5 rounded-sm bg-signal px-1 text-[10px] font-bold uppercase">Fits</span>}
          </div>
          <div className="mt-0.5 text-muted-foreground">{KIND_LABEL[k].for}</div>
        </button>))}
    </div>);
}
function FormulaPick({ value, onChange }: {
    value: Formula | null;
    onChange: (f: Formula | null) => void;
}) {
    return (<div className="mt-3" data-testid="formula-pick">
      <Label className="mb-1.5 block text-xs">Choose the headline style to use</Label>
      <div className="grid gap-1.5 sm:grid-cols-2" role="radiogroup" aria-label="Headline formula">
        <button type="button" role="radio" aria-checked={value === null} onClick={() => onChange(null)} className={cn("rounded-md border-2 p-2 text-left text-xs", value === null ? "border-primary bg-secondary" : "border-border hover:border-foreground/40")} data-testid="formula-any">
          <div className="text-sm font-bold">The writer picks</div>
          <div className="text-muted-foreground">The one that makes you want to keep reading</div>
        </button>
        {FORMULAS.map((f) => (<button key={f} type="button" role="radio" aria-checked={value === f} onClick={() => onChange(f)} className={cn("rounded-md border-2 p-2 text-left text-xs", value === f ? "border-primary bg-secondary" : "border-border hover:border-foreground/40")} data-testid={`formula-${f}`}>
            <div className="text-sm font-bold">{FORMULA_INFO[f].label}</div>
            <div className="text-muted-foreground">{FORMULA_INFO[f].template}. {FORMULA_INFO[f].when}.</div>
          </button>))}
      </div>
    </div>);
}
export function NewPageView({ tab: firstTab, preselectAd, preselectPersona, ads, personas, products, offers, currency }: Props) {
    const [taskBrief, setTaskBrief] = useState(defaultBuyingTask);
    const router = useRouter();
    const [pending, start] = useTransition();
    const [tab, setTab] = useState(firstTab);
    const [origin, setOrigin] = useState<AdOrigin | "all">("all");
    const [adId, setAdId] = useState<string | null>(preselectAd ?? ads[0]?.id ?? null);
    const [personaId, setPersonaId] = useState<string | null>(preselectPersona ?? personas[0]?.id ?? null);
    const ad = ads.find((a) => a.id === adId) ?? null;
    const persona = personas.find((p) => p.id === personaId) ?? null;
    const [adKind, setAdKind] = useState<PageKind | null>(null);
    const [formula, setFormula] = useState<Formula | null>(null);
    const [personaKind, setPersonaKind] = useState<PageKind | null>(null);
    const [scratch, setScratch] = useState({ productId: products[0]?.id ?? "", personaId: "", offerId: "", omitOffer: false, kind: "pdp" as PageKind, angle: "", ctaUrl: "" });
    const [link, setLink] = useState({ url: "", productId: products[0]?.id ?? "", personaId: "", kind: "pdp" as PageKind });
    const [capture, setCapture] = useState<{
        id: string;
        capture: Capture;
    } | null>(null);
    const money = (n: number) => (Math.abs(n) >= 1000 ? formatMoney(n, currency, { local: true, digits: 0 }).replace(/\d{4,}/, (d) => Number(d).toLocaleString("en-US")) : formatMoney(n, currency, { local: true }));
    const shown = useMemo(() => ads.filter((a) => origin === "all" || a.origin === origin), [ads, origin]);
    const build = (input: Parameters<typeof createPageAction>[0]) => start(async () => {
        const res = await createPageAction({ ...input, taskBrief: taskBrief.buyerQuestion.trim() ? taskBrief : undefined });
        if (!res.ok)
            return void toast.error(res.error);
        toast.success("Page drafted. Opening the builder.");
        router.push(`/landing/pages/${res.id}`);
    });
    return (<div className="px-6 pb-10 pt-5">
      <div className="mb-3 text-right"><a href="/landing/quality" className="text-sm underline">Open page quality review</a></div>
      <div className="mb-5"><BuyingTaskFields value={taskBrief} onChange={setTaskBrief} classic/></div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ad" data-testid="tab-ad">For an ad</TabsTrigger>
          <TabsTrigger value="persona" data-testid="tab-persona">For a persona</TabsTrigger>
          <TabsTrigger value="scratch" data-testid="tab-scratch">From scratch</TabsTrigger>
          <TabsTrigger value="url" data-testid="tab-url">From an existing page</TabsTrigger>
        </TabsList>


        <TabsContent value="ad" className="pt-4">
          <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
            The page repeats the ad&apos;s promise in its own words, speaks to the audience the ad works best for, and carries its offer. Ad results are <b>simulated</b> until the ad account is connected.
          </p>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div>
              <div className="mb-2 flex flex-wrap gap-1.5 text-xs">
                {(["all", "studio", "script", "account"] as const).map((o) => (<button key={o} type="button" onClick={() => setOrigin(o)} className={cn("rounded-full border px-2.5 py-1", origin === o ? "border-foreground bg-foreground text-background" : "hover:bg-secondary")}>
                    {o === "all" ? `All (${ads.length})` : `${ORIGIN_LABEL[o]} (${ads.filter((a) => a.origin === o).length})`}
                  </button>))}
              </div>
              {shown.length ? (<ul className="max-h-[560px] divide-y overflow-y-auto rounded-md border" data-testid="ad-list">
                  {shown.map((a) => (<li key={a.id}>
                      <button type="button" onClick={() => setAdId(a.id)} className={cn("flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-secondary", a.id === adId && "bg-secondary")} data-testid={`ad-${a.id}`}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">&ldquo;{a.headline}&rdquo;</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {ORIGIN_LABEL[a.origin]}
                            {a.insights ? `. Best for ${a.insights.best.label}` : ""}
                          </span>
                        </span>
                        {a.insights && (<span className="text-right text-xs tabular-nums">
                            <span className={cn("block font-bold", a.insights.verdict === "scale" ? "text-emerald-700" : a.insights.verdict === "cut" ? "text-red-700" : "text-amber-700")}>{a.insights.roas.toFixed(2)}</span>
                            <span className="text-muted-foreground">return</span>
                          </span>)}
                      </button>
                    </li>))}
                </ul>) : (<p className="rounded-md border p-4 text-sm text-muted-foreground">No ads yet. Make ads in Creative Studio, or add the brand&apos;s segment file so its running ads can be listed.</p>)}
            </div>

            {ad && (<div className="rounded-lg border border-input p-4" data-testid="ad-detail">
                <div className="text-xs font-semibold text-muted-foreground uppercase">{ORIGIN_LABEL[ad.origin]}</div>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight">&ldquo;{ad.headline}&rdquo;</h2>
                {ad.angle && <p className="mt-1 text-sm text-muted-foreground">{ad.angle}</p>}
                {ad.insights && (<>
                    <div className="mt-4 flex items-center gap-2 text-sm font-bold">
                      How it performs, {ad.insights.period}
                      <span className="rounded-sm bg-signal px-1.5 py-0.5 text-[10px] font-bold uppercase">Simulated</span>
                    </div>
                    <dl className="mt-2 grid grid-cols-3 gap-2 text-center sm:grid-cols-5">
                      {[
                    ["Spend", money(ad.insights.spend)],
                    ["CTR", pct(ad.insights.ctr, 2)],
                    ["Buy rate", pct(ad.insights.cvr)],
                    ["Cost an order", money(ad.insights.cpa)],
                    ["Return", ad.insights.roas.toFixed(2)],
                ].map(([k, v]) => (<div key={k} className="rounded-md bg-secondary p-2">
                          <dt className="text-[11px] text-muted-foreground">{k}</dt>
                          <dd className="font-bold tabular-nums">{v}</dd>
                        </div>))}
                    </dl>
                    <div className="mt-4 rounded-md border-l-4 border-primary bg-secondary/60 p-3 text-sm" data-testid="best-audience">
                      Works best for <b>{ad.insights.best.label}</b>. {ad.insights.best.why}
                      {ad.matched && (<div className="mt-1">
                          The page is written for <b>{ad.matched.name}</b>, {ad.matched.by === "ad" ? "the buyer the ad was made for" : "the persona closest to that audience"}.
                        </div>)}
                    </div>
                    <table className="mt-3 w-full text-xs tabular-nums">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="py-1 text-left font-medium">Audience</th>
                          <th className="text-right font-medium">Spend</th>
                          <th className="text-right font-medium">Orders</th>
                          <th className="text-right font-medium">Return</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ad.insights.breakdown.filter((b) => b.spend > 0).slice(0, 6).map((b) => (<tr key={`${b.age}${b.gender}`} className="border-t">
                            <td className="py-1 capitalize">
                              {b.gender} {b.age}
                            </td>
                            <td className="text-right">{money(b.spend)}</td>
                            <td className="text-right">{b.purchases}</td>
                            <td className="text-right font-semibold">{b.roas.toFixed(2)}</td>
                          </tr>))}
                      </tbody>
                    </table>
                  </>)}
                <div className="mt-4">
                  <Label className="mb-1.5 block text-xs">Page type</Label>
                  <KindPicker value={adKind ?? ad.kind} onChange={setAdKind} recommended={ad.kind}/>
                  {(adKind ?? ad.kind) === "advertorial" && <FormulaPick value={formula} onChange={setFormula}/>}
                </div>
                <Button className="mt-4" disabled={pending} onClick={() => build({ from: "ad", adId: ad.id, kind: adKind ?? ad.kind, formula })} data-testid="build-ad">
                  {pending ? <Loader2 className="size-4 animate-spin"/> : <Wand2 className="size-4"/>}
                  Build the page for this ad
                </Button>
              </div>)}
          </div>
        </TabsContent>


        <TabsContent value="persona" className="pt-4">
          <p className="mb-3 max-w-3xl text-sm text-muted-foreground">1 buyer, 1 angle: a page for the menopause buyer is not the page for the 19-year-old at the gym. Drafts are offered too; a page can be written for a buyer before they are put in use.</p>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <ul className="grid gap-2 sm:grid-cols-2" data-testid="persona-list">
              {personas.map((p) => (<li key={p.id}>
                  <button type="button" onClick={() => setPersonaId(p.id)} className={cn("h-full w-full rounded-md border-2 p-3 text-left", p.id === personaId ? "border-primary bg-secondary" : "border-border hover:border-foreground/40")} data-testid={`persona-${p.id}`}>
                    <div className="text-sm font-bold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[p.who.gender, p.who.age].filter(Boolean).join(", ") || "Age not set"}
                      {p.status === "draft" ? ". Draft" : ""}
                    </div>
                    {p.roas !== null && <div className="mt-1 text-xs">Return {p.roas.toFixed(2)} (simulated)</div>}
                  </button>
                </li>))}
            </ul>
            {persona && (<div className="rounded-lg border border-input p-4">
                <h2 className="text-xl font-extrabold tracking-tight">{persona.name}</h2>
                <p className="mt-1 text-sm">{persona.problem}</p>
                {persona.angle && (<p className="mt-2 text-sm">
                    <b>Angle:</b> {persona.angle}
                  </p>)}
                <div className="mt-4">
                  <Label className="mb-1.5 block text-xs">Page type</Label>
                  <KindPicker value={personaKind ?? persona.kind} onChange={setPersonaKind} recommended={persona.kind}/>
                  {(personaKind ?? persona.kind) === "advertorial" && <FormulaPick value={formula} onChange={setFormula}/>}
                </div>
                <Button className="mt-4" disabled={pending} onClick={() => build({ from: "persona", personaId: persona.id, kind: personaKind ?? persona.kind, formula })} data-testid="build-persona">
                  {pending ? <Loader2 className="size-4 animate-spin"/> : <Wand2 className="size-4"/>}
                  Build the page for {persona.name}
                </Button>
              </div>)}
          </div>
        </TabsContent>


        <TabsContent value="scratch" className="pt-4">
          <div className="grid max-w-3xl gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="mb-1 block text-xs">Product</Label>
                <select className={sel} value={scratch.productId} onChange={(e) => setScratch({ ...scratch, productId: e.target.value })} data-testid="scratch-product">
                  {products.map((p) => (<option key={p.id} value={p.id}>
                      {p.name}
                    </option>))}
                </select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Buyer (optional)</Label>
                <select className={sel} value={scratch.personaId} onChange={(e) => setScratch({ ...scratch, personaId: e.target.value })}>
                  <option value="">Anyone</option>
                  {personas.map((p) => (<option key={p.id} value={p.id}>
                      {p.name}
                    </option>))}
                </select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">Offer first in the buy box</Label>
                <select className={sel} disabled={scratch.omitOffer} value={scratch.offerId} onChange={(e) => setScratch({ ...scratch, offerId: e.target.value })}>
                  <option value="">The best fit</option>
                  {offers.map((o) => (<option key={o.id} value={o.id}>
                      {o.name} ({money(o.price)})
                    </option>))}
                </select>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Page type</Label>
              <label className="flex gap-2 text-sm"><input type="checkbox" data-testid="scratch-omit-offer" checked={scratch.omitOffer} onChange={e => setScratch({ ...scratch, omitOffer: e.target.checked, offerId: e.target.checked ? "" : scratch.offerId })}/>Product information only: omit prices, promotions, gifts and guarantee terms</label>
              <KindPicker value={scratch.kind} onChange={(k) => setScratch({ ...scratch, kind: k })} recommended={scratch.personaId ? (personas.find((p) => p.id === scratch.personaId)?.kind ?? "pdp") : "pdp"}/>
              {scratch.kind === "advertorial" && <FormulaPick value={formula} onChange={setFormula}/>}
            </div>
            <div>
              <Label className="mb-1 block text-xs">The promise or angle to lead with (optional)</Label>
              <Textarea rows={2} value={scratch.angle} onChange={(e) => setScratch({ ...scratch, angle: e.target.value })} placeholder="Firmer skin by morning, without the redness"/>
            </div>
            <div>
              <Label className="mb-1 block text-xs">Where the buttons go (optional)</Label>
              <Input value={scratch.ctaUrl} onChange={(e) => setScratch({ ...scratch, ctaUrl: e.target.value })} placeholder="https://store.com/products/..."/>
            </div>
            <div>
              <Button disabled={pending || !scratch.productId} onClick={() => build({ from: "scratch", productId: scratch.productId, personaId: scratch.personaId || null, offerId: scratch.offerId || null, omitOffer: scratch.omitOffer, kind: scratch.kind, angle: scratch.angle, ctaUrl: scratch.ctaUrl, formula })} data-testid="build-scratch">
                {pending ? <Loader2 className="size-4 animate-spin"/> : <Wand2 className="size-4"/>}
                Build the page
              </Button>
            </div>
          </div>
        </TabsContent>


        <TabsContent value="url" className="pt-4">
          <p className="mb-3 max-w-3xl text-sm text-muted-foreground">Paste the brand&apos;s current page. It is opened as a phone opens it and read: what the first screen says, the buttons, the proof, what covers the page on arrival. Then build a better version, or audit it on the CRO screen.</p>
          <div className="flex max-w-3xl flex-wrap gap-2">
            <Input className="min-w-72 flex-1" value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} placeholder="https://store.com/products/hero-product" data-testid="capture-url"/>
            <Button variant="outline" disabled={pending || !link.url.trim()} onClick={() => start(async () => {
            const res = await captureAction(link.url);
            if (!res.ok)
                return void toast.error(res.error);
            setCapture({ id: res.id, capture: res.capture });
        })} data-testid="capture-go">
              {pending ? <Loader2 className="size-4 animate-spin"/> : <Globe className="size-4"/>}
              Read the page
            </Button>
          </div>
          {capture && (<div className="mt-5 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]" data-testid="capture-result">

              <img src={`/api/assets/${capture.capture.shot_fold}`} alt="The first screen on a phone" className="w-full rounded-md border"/>
              <div className="text-sm">
                <h3 className="text-base font-bold">{capture.capture.title || capture.capture.final_url}</h3>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                  <dt className="font-semibold">Headline</dt>
                  <dd>{capture.capture.h1[0] ?? "None found"}</dd>
                  <dt className="font-semibold">First screen</dt>
                  <dd className="line-clamp-4 text-muted-foreground">{capture.capture.above_fold || "No text"}</dd>
                  <dt className="font-semibold">Buttons</dt>
                  <dd>{capture.capture.buttons.slice(0, 5).map((b) => b.text).join(", ") || "None found"}</dd>
                  <dt className="font-semibold">Proof</dt>
                  <dd>{capture.capture.proof.slice(0, 3).join(" / ") || "None found"}</dd>
                  <dt className="font-semibold">Prices</dt>
                  <dd>{capture.capture.prices.slice(0, 5).join(", ") || "None found"}</dd>
                  <dt className="font-semibold">Covers the page on arrival</dt>
                  <dd>{capture.capture.overlays.length ? capture.capture.overlays.map((o) => `${Math.round(o.share * 100)}% of the screen`).join(", ") : "Nothing"}</dd>
                </dl>
                <div className="mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="mb-1 block text-xs">Product</Label>
                    <select className={sel} value={link.productId} onChange={(e) => setLink({ ...link, productId: e.target.value })}>
                      {products.map((p) => (<option key={p.id} value={p.id}>
                          {p.name}
                        </option>))}
                    </select>
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs">Buyer (optional)</Label>
                    <select className={sel} value={link.personaId} onChange={(e) => setLink({ ...link, personaId: e.target.value })}>
                      <option value="">Anyone</option>
                      {personas.map((p) => (<option key={p.id} value={p.id}>
                          {p.name}
                        </option>))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button disabled={pending} onClick={() => build({ from: "url", captureId: capture.id, productId: link.productId, personaId: link.personaId || null, kind: link.kind, ctaUrl: capture.capture.final_url })} data-testid="build-url">
                    <Wand2 className="size-4"/> Build a better version
                  </Button>
                  <Button variant="outline" onClick={() => router.push(`/landing/cro?capture=${capture.id}`)}>
                    Audit it on the CRO screen
                  </Button>
                </div>
              </div>
            </div>)}
        </TabsContent>
      </Tabs>
    </div>);
}
