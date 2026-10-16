"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Globe, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuditResult } from "@/lib/landing/audit";
import { ABANDONMENT, SHOPIFY_SETTINGS, blended, cac, honest, testPlan, testingBand } from "@/lib/landing/cro";
import { AREA_LABEL, AREA_ORDER } from "@/lib/landing/types";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { auditAction } from "../actions";
export interface Defaults {
    brandId: string;
    simulated: boolean;
    source: string;
    currency: string;
    sessions: number;
    orders: number;
    netSales: number;
    shipping: number;
    margin: number;
    spend: number;
}
interface Props {
    defaults: Defaults;
    pages: {
        id: string;
        title: string;
    }[];
    captures: {
        id: string;
        url: string;
        title: string;
        at: string;
    }[];
    audits: {
        id: string;
        audit: AuditResult;
    }[];
    preselect: {
        capture: string | null;
        page: string | null;
    };
}
const pct = (n: number, d = 2) => `${(n * 100).toFixed(d)}%`;
const big = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "never");
function Num({ label, value, onChange, step = 1, suffix, testid }: {
    label: string;
    value: number;
    onChange: (n: number) => void;
    step?: number;
    suffix?: string;
    testid?: string;
}) {
    return (<div>
      <Label className="mb-1 block text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input type="number" step={step} value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(Number(e.target.value))} className="h-9 tabular-nums" data-testid={testid}/>
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>);
}
function Tile({ label, value, sub, strong }: {
    label: string;
    value: string;
    sub?: string;
    strong?: boolean;
}) {
    return (<div className={cn("rounded-md p-3", strong ? "border-2 border-primary bg-secondary" : "bg-muted")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-extrabold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>);
}
function BlendChart({ cold, warm, share }: {
    cold: number;
    warm: number;
    share: number;
}) {
    const [hover, setHover] = useState<number | null>(null);
    const W = 520;
    const H = 200;
    const pad = { l: 44, r: 12, t: 12, b: 30 };
    const max = Math.max(cold, warm) * 1.1 || 0.05;
    const x = (s: number) => pad.l + s * (W - pad.l - pad.r);
    const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
    const pts = Array.from({ length: 21 }, (_, i) => i / 20);
    const at = hover ?? share;
    const ticks = [0, max / 2, max];
    return (<figure className="m-0">
      <figcaption className="mb-1 text-sm font-bold">Blended conversion rate as cold traffic grows</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xl touch-none" role="img" aria-label={`From ${pct(warm)} with no cold traffic to ${pct(cold)} when all traffic is cold`} onMouseMove={(e) => {
            const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const s = ((e.clientX - r.left) / r.width) * W;
            setHover(Math.min(1, Math.max(0, (s - pad.l) / (W - pad.l - pad.r))));
        }} onMouseLeave={() => setHover(null)} data-testid="blend-chart">
        {ticks.map((t) => (<g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={0.1}/>
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity={0.6}>
              {pct(t, 1)}
            </text>
          </g>))}
        {[0, 0.5, 1].map((s) => (<text key={s} x={x(s)} y={H - 10} textAnchor={s === 0 ? "start" : s === 1 ? "end" : "middle"} fontSize="10" fill="currentColor" fillOpacity={0.6}>
            {Math.round(s * 100)}% cold
          </text>))}
        <polyline fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" points={pts.map((s) => `${x(s)},${y(blended(s, cold, warm))}`).join(" ")}/>
        <line x1={x(at)} x2={x(at)} y1={pad.t} y2={H - pad.b} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="3 3"/>
        <circle cx={x(at)} cy={y(blended(at, cold, warm))} r={5} fill="var(--primary)" stroke="var(--background)" strokeWidth={2}/>
        <text x={Math.min(x(at) + 8, W - 120)} y={Math.max(pad.t + 12, y(blended(at, cold, warm)) - 10)} fontSize="11" fontWeight="700" fill="currentColor">
          {Math.round(at * 100)}% cold: {pct(blended(at, cold, warm))}
        </text>
      </svg>
    </figure>);
}
function AuditView({ a }: {
    a: AuditResult;
}) {
    return (<div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" data-testid="audit-result">
      <div>
        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="text-lg font-extrabold tracking-tight">{a.title}</h3>
          <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-bold", a.score >= 80 ? "bg-emerald-100 text-emerald-800" : a.score >= 60 ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-800")}>{a.score}</span>
          {a.subject === "page" ? (<Link className="text-sm text-primary hover:underline" href={a.url}>
              Open the page
            </Link>) : (<a className="text-sm text-primary hover:underline" href={a.url} target="_blank" rel="noreferrer">
              {a.url}
            </a>)}
        </div>
        <h4 className="mt-4 mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">The test backlog, by impact, confidence and ease</h4>
        {a.backlog.length ? (<ol className="grid gap-2" data-testid="backlog">
            {a.backlog.map((b, i) => (<li key={b.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-xs font-bold text-muted-foreground tabular-nums">{i + 1}</span>
                  {b.status === "fail" ? <X className="mt-0.5 size-4 shrink-0 text-red-600"/> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600"/>}
                  <div className="min-w-0">
                    <div className="font-semibold">
                      {b.label} <span className="font-normal text-muted-foreground">({AREA_LABEL[b.area]}, ICE {b.ice})</span>
                    </div>
                    <div className="text-muted-foreground">{b.message}</div>
                    <div className="mt-1">{b.hypothesis}</div>
                    {b.cards.length > 0 && (<details className="mt-1.5 text-xs">
                        <summary className="cursor-pointer text-primary">From the library ({b.cards.length})</summary>
                        <ul className="mt-1 grid gap-1.5">
                          {b.cards.map((c) => (<li key={c.id} className="rounded bg-muted p-2">
                              <div className="font-semibold">{c.title}</div>
                              <div className="text-muted-foreground">{c.summary}</div>
                            </li>))}
                        </ul>
                      </details>)}
                  </div>
                </div>
              </li>))}
          </ol>) : (<p className="text-sm text-muted-foreground">Nothing to fix by these checks. The next lever is the offer, or traffic.</p>)}
      </div>
      <div>
        {a.shot && (<img src={`/api/assets/${a.shot}`} alt="The first screen on a phone, as captured" className="mb-3 w-full rounded-md border"/>)}
        {AREA_ORDER.map((area) => {
            const list = a.checks.filter((c) => c.area === area);
            if (!list.length)
                return null;
            return (<div key={area} className="mb-2">
              <div className="text-xs font-bold text-muted-foreground uppercase">{AREA_LABEL[area]}</div>
              <ul className="text-xs">
                {list.map((c) => (<li key={c.id} className="flex gap-1.5">
                    {c.status === "pass" ? <Check className="size-3.5 shrink-0 text-emerald-600"/> : c.status === "fail" ? <X className="size-3.5 shrink-0 text-red-600"/> : c.status === "warn" ? <AlertTriangle className="size-3.5 shrink-0 text-amber-600"/> : <span className="w-3.5"/>}
                    {c.label}
                  </li>))}
              </ul>
            </div>);
        })}
      </div>
    </div>);
}
export function CroView({ defaults: d, pages, captures, audits, preselect }: Props) {
    const [f, setF] = useState({ sessions: d.sessions, orders: d.orders, netSales: d.netSales, shipping: d.shipping, margin: d.margin, spend: d.spend });
    const [blend, setBlend] = useState({ share: 0.6, cold: 0.01, warm: 0.04 });
    const [t, setT] = useState({ baseline: d.sessions ? Math.round((d.orders / d.sessions) * 10000) / 10000 : 0.025, mde: 0.15, arms: 2, weekly: Math.round(d.sessions / 4.3) });
    const [tab, setTab] = useState(preselect.capture || preselect.page ? "audit" : "number");
    const [subject, setSubject] = useState(preselect.page ? `page:${preselect.page}` : preselect.capture ? `capture:${preselect.capture}` : pages[0] ? `page:${pages[0].id}` : "");
    const [url, setUrl] = useState("");
    const [current, setCurrent] = useState<AuditResult | null>(audits[0]?.audit ?? null);
    const [ticks, setTicksState] = useState<Record<string, boolean>>({});
    const key = `landing-friction:${d.brandId}`;
    useEffect(() => {
        try {
            const raw = localStorage.getItem(key);
            if (raw)
                setTicksState(JSON.parse(raw) as Record<string, boolean>);
        }
        catch {
        }
    }, [key]);
    const setTicks = (next: Record<string, boolean>) => {
        setTicksState(next);
        try {
            localStorage.setItem(key, JSON.stringify(next));
        }
        catch {
        }
    };
    const [pending, start] = useTransition();
    const m = (n: number) => (Math.abs(n) >= 1000 ? formatMoney(n, d.currency, { local: true, digits: 0 }).replace(/\d{4,}/, (x) => Number(x).toLocaleString("en-US")) : formatMoney(n, d.currency, { local: true }));
    const h = useMemo(() => honest(f), [f]);
    const plan = useMemo(() => testPlan(t.baseline, t.mde, t.arms, t.weekly), [t]);
    const band = testingBand(f.orders);
    const cacNow = cac(f.spend, f.sessions, h.cvr);
    const blendNow = blended(blend.share, blend.cold, blend.warm);
    const run = (input: Parameters<typeof auditAction>[0]) => start(async () => {
        const res = await auditAction(input);
        if (!res.ok)
            return void toast.error(res.error);
        setCurrent(res.audit);
        toast.success(`Audited: ${res.audit.backlog.length} things to test or fix.`);
    });
    return (<div className="px-6 pb-10 pt-5">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="number" data-testid="cro-tab-number">The right number</TabsTrigger>
          <TabsTrigger value="audit" data-testid="cro-tab-audit">Audit a page</TabsTrigger>
          <TabsTrigger value="test" data-testid="cro-tab-test">Can you test it?</TabsTrigger>
          <TabsTrigger value="friction" data-testid="cro-tab-friction">Checkout friction</TabsTrigger>
        </TabsList>

        <TabsContent value="number" className="pt-4">
          <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
            A store at 9% conversion on $50 orders can be a far worse business than one at 1% on $200 million. Conversion rate is gameable (turn off cold traffic and it jumps while revenue falls) and not comparable between brands. Track revenue per visitor, and contribution per visitor where the margin is known.{" "}
            {d.simulated && (<>
                The figures below start from <b>simulated</b> data ({d.source}); type the brand&apos;s own over them.
              </>)}
          </p>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Num label="Sessions (GA4, not Shopify)" value={f.sessions} onChange={(n) => setF({ ...f, sessions: n })} testid="cro-sessions"/>
                <Num label="Orders" value={f.orders} onChange={(n) => setF({ ...f, orders: n })} testid="cro-orders"/>
                <Num label="Net sales (no tax)" value={f.netSales} onChange={(n) => setF({ ...f, netSales: n })}/>
                <Num label="Shipping collected" value={f.shipping} onChange={(n) => setF({ ...f, shipping: n })}/>
                <Num label="Gross margin" value={f.margin} step={0.01} onChange={(n) => setF({ ...f, margin: n })} suffix="0 to 1"/>
                <Num label="Ad spend" value={f.spend} onChange={(n) => setF({ ...f, spend: n })}/>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4" data-testid="cro-honest">
                <Tile label="Conversion rate" value={pct(h.cvr)} sub="An output, not a lever"/>
                <Tile label="Order value" value={m(h.aov)} sub={`Shopify shows ${m(h.aovShopify)} (no shipping)`}/>
                <Tile label="Revenue per visitor" value={m(h.rpv)} sub="Track this" strong/>
                <Tile label="Contribution per visitor" value={m(h.cpv)} sub="Revenue per visitor x margin" strong/>
              </div>
              <div className="mt-4 rounded-md border p-3 text-sm">
                <div className="font-bold">What a better page is worth</div>
                <p className="mt-1 text-muted-foreground">
                  CAC is ad spend over orders: {m(cacNow)} today. A 10% better conversion rate makes it {m(cac(f.spend, f.sessions, h.cvr * 1.1))}, and adds {m(f.sessions * h.rpv * 0.1)} of revenue a period at the same spend. That headroom is what lets the brand spend more at the same CAC.
                </p>
              </div>
              <div className="mt-4 rounded-md bg-muted p-3 text-xs">
                <div className="mb-1 font-bold">Shopify numbers that lie</div>
                <ul className="list-disc pl-4">
                  <li>Total sales include tax: use net sales plus shipping collected.</li>
                  <li>Shopify&apos;s average order value leaves out shipping collected, which is real revenue.</li>
                  <li>Shopify sessions include bots: use GA4&apos;s for any per-visitor figure.</li>
                  <li>Returning buyers convert higher and order more: a rising share of them flatters conversion rate.</li>
                </ul>
              </div>
            </div>
            <div>
              <BlendChart cold={blend.cold} warm={blend.warm} share={blend.share}/>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Num label="Share of traffic that is cold" value={blend.share} step={0.05} onChange={(n) => setBlend({ ...blend, share: Math.min(1, Math.max(0, n)) })} suffix="0 to 1"/>
                <Num label="Cold conversion rate" value={blend.cold} step={0.001} onChange={(n) => setBlend({ ...blend, cold: n })}/>
                <Num label="Warm conversion rate" value={blend.warm} step={0.001} onChange={(n) => setBlend({ ...blend, warm: n })}/>
              </div>
              <p className="mt-3 text-sm">
                At {Math.round(blend.share * 100)}% cold traffic the blend is <b>{pct(blendNow)}</b>. Scale cold spend and it falls toward {pct(blend.cold)} with no change to the page: a falling blended rate while scaling is expected, not a page problem.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="pt-4">
          <p className="mb-3 max-w-3xl text-sm text-muted-foreground">Checks the page in the order that matters (clarity and hierarchy, copy, offer, proof, friction) and turns each finding into a test: what to change, why, and what it should lift. Code only, free.</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-72">
              <Label className="mb-1 block text-xs">A page built here, or a page already read</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="audit-subject">
                {pages.length > 0 && (<optgroup label="Pages built here">
                    {pages.map((p) => (<option key={p.id} value={`page:${p.id}`}>
                        {p.title}
                      </option>))}
                  </optgroup>)}
                {captures.length > 0 && (<optgroup label="Pages read by link">
                    {captures.map((c) => (<option key={c.id} value={`capture:${c.id}`}>
                        {c.title} ({c.at.slice(0, 10)})
                      </option>))}
                  </optgroup>)}
              </select>
            </div>
            <Button disabled={pending || !subject} onClick={() => run(subject.startsWith("page:") ? { pageId: subject.slice(5) } : { captureId: subject.slice(8) })} data-testid="audit-go">
              {pending ? <Loader2 className="size-4 animate-spin"/> : <Search className="size-4"/>} Audit it
            </Button>
            <span className="px-2 text-sm text-muted-foreground">or</span>
            <Input className="h-9 w-80" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://store.com/products/..." data-testid="audit-url"/>
            <Button variant="outline" disabled={pending || !url.trim()} onClick={() => run({ url })} data-testid="audit-url-go">
              <Globe className="size-4"/> Read and audit a link
            </Button>
          </div>
          {current ? <AuditView a={current}/> : <p className="mt-6 text-sm text-muted-foreground">No audits yet.</p>}
          {audits.length > 1 && (<div className="mt-6 text-xs">
              <div className="mb-1 font-bold text-muted-foreground uppercase">Earlier audits</div>
              <div className="flex flex-wrap gap-2">
                {audits.map((x) => (<button key={x.id} type="button" onClick={() => setCurrent(x.audit)} className="rounded-full border px-2.5 py-1 hover:bg-secondary">
                    {x.audit.title.slice(0, 40)} · {x.audit.score} · {x.audit.at.slice(0, 10)}
                  </button>))}
              </div>
            </div>)}
        </TabsContent>

        <TabsContent value="test" className="pt-4">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="mb-4 text-sm text-muted-foreground">To trust a 10 to 20% lift takes about 1,000 orders an arm. Most 7-figure brands cannot produce that on 1 page in a month, so a green test after 2 weeks on 100 orders is noise. Size the test from the smallest lift worth shipping, before it starts.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Num label="Conversion rate today" value={t.baseline} step={0.001} onChange={(n) => setT({ ...t, baseline: n })} suffix="0 to 1" testid="test-baseline"/>
                <Num label="Smallest lift worth shipping" value={t.mde} step={0.01} onChange={(n) => setT({ ...t, mde: n })} suffix="0.1 = 10%" testid="test-mde"/>
                <Num label="Arms (A/B is 2)" value={t.arms} onChange={(n) => setT({ ...t, arms: Math.max(2, Math.round(n)) })}/>
                <Num label="Sessions a week to the page" value={t.weekly} onChange={(n) => setT({ ...t, weekly: n })} testid="test-weekly"/>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3" data-testid="test-plan">
                <Tile label="Visitors an arm" value={big(plan.perVariant)} sub={`${big(plan.ordersPerVariant)} orders an arm`}/>
                <Tile label="Visitors in all" value={big(plan.total)}/>
                <Tile label="Weeks" value={Number.isFinite(plan.weeks) ? String(plan.weeks) : "never"} sub="2 at least, whatever the traffic" strong/>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">95% confidence, 2-sided, 80% power: visitors an arm = 16 x p(1-p) / (p x lift) squared. Halving the lift quadruples the sample.</p>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="rounded-md border border-input p-3" data-testid="test-band">
                <div className="text-xs font-bold text-muted-foreground uppercase">At {big(f.orders)} orders a month</div>
                <div className="mt-0.5 font-bold">{band.band}</div>
                <p className="mt-1">
                  <b>Can:</b> {band.can}
                </p>
                <p className="mt-1">
                  <b>Cannot:</b> {band.cannot}
                </p>
              </div>
              <div className="rounded-md bg-muted p-3 text-xs">
                <div className="mb-1 font-bold">Why most CRO wins are noise</div>
                <ul className="list-disc pl-4">
                  <li>Checking daily and stopping the day it looks significant inflates false positives. Fix the sample first.</li>
                  <li>An email or SMS campaign spikes conversion. Test on pages that only take cold Meta traffic.</li>
                  <li>About half of buyers click more than once before buying (1.5 Meta clicks per purchase on average): a split of first clicks blurs.</li>
                  <li>A real programme of progressive tests pays from about $8 to 10M a year online. Below that, ship the obvious fixes and test big swings: the offer, the headline, a message-matched page.</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="friction" className="pt-4">
          <p className="mb-3 max-w-3xl text-sm text-muted-foreground">About 70% of carts are left and 43% of those were only browsing. The rest left for a reason a store can fix (Baymard Institute). Tick what is true of the store today; the ticks are kept in this browser.</p>
          <div className="grid gap-6 xl:grid-cols-2">
            <ul className="grid gap-2" data-testid="friction">
              {ABANDONMENT.map((a) => (<li key={a.id} className="rounded-md border p-3 text-sm">
                  <label className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" checked={!!ticks[a.id]} onChange={() => setTicks({ ...ticks, [a.id]: !ticks[a.id] })}/>
                    <span>
                      <span className="font-semibold">{Math.round(a.share * 100)}%: {a.reason}.</span> <span className="text-muted-foreground">Good: {a.check}.</span>
                      {!ticks[a.id] && <span className="mt-0.5 block text-xs">Fix: {a.fix}.</span>}
                    </span>
                  </label>
                </li>))}
            </ul>
            <div className="grid content-start gap-3">
              {SHOPIFY_SETTINGS.map((g) => (<div key={g.group} className="rounded-md border p-3 text-sm">
                  <div className="mb-1 font-bold">{g.group}</div>
                  {g.items.map((it) => (<label key={it} className="flex items-center gap-2 py-0.5">
                      <input type="checkbox" checked={!!ticks[it]} onChange={() => setTicks({ ...ticks, [it]: !ticks[it] })}/>
                      {it}
                    </label>))}
                </div>))}
              <p className="text-xs text-muted-foreground">Keep shipping, tax and fees added at checkout under 10% of the order: {m(h.aov * 0.1)} on today&apos;s average order of {m(h.aov)}.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>);
}
