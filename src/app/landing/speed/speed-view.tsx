"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Gauge, Info, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SiteScanRow } from "@/db/schema";
import type { SpeedResult } from "@/lib/landing/speed";
import { cn } from "@/lib/utils";
import { deleteScanAction, speedAction } from "../actions";
import { useScan } from "../scan-poll";
const sec = (ms: number | null) => (ms === null ? "n/a" : `${(ms / 1000).toFixed(2)} s`);
const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${Math.round(n / 1024)} KB`);
function band(v: number | null, good: number, poor: number): "good" | "mid" | "poor" | "na" {
    if (v === null)
        return "na";
    return v <= good ? "good" : v <= poor ? "mid" : "poor";
}
const TONE = { good: "border-emerald-500 bg-emerald-50", mid: "border-amber-400 bg-amber-50", poor: "border-red-500 bg-red-50", na: "border-border bg-muted" };
function Metric({ label, value, b, note }: {
    label: string;
    value: string;
    b: keyof typeof TONE;
    note: string;
}) {
    return (<div className={cn("rounded-md border-l-4 p-2.5", TONE[b])}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-lg font-extrabold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{note}</div>
    </div>);
}
function Result({ r, previous }: {
    r: SpeedResult;
    previous: SpeedResult | null;
}) {
    const m = r.median;
    const delta = (a: number | null, b: number | null | undefined) => (a !== null && b !== null && b !== undefined ? a - b : null);
    const dl = previous ? delta(m.lcp, previous.median.lcp) : null;
    const byType = useMemo(() => {
        const g = new Map<string, {
            n: number;
            b: number;
        }>();
        for (const q of r.requests)
            g.set(q.type, { n: (g.get(q.type)?.n ?? 0) + 1, b: (g.get(q.type)?.b ?? 0) + q.bytes });
        return [...g.entries()].sort((a, b) => b[1].b - a[1].b);
    }, [r]);
    const heaviest = [...r.requests].sort((a, b) => b.bytes - a.bytes).slice(0, 10);
    return (<div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]" data-testid="speed-result">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <div className={cn("flex size-14 items-center justify-center rounded-full text-xl font-extrabold", r.score >= 90 ? "bg-emerald-100 text-emerald-800" : r.score >= 50 ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-800")} title="Lab score from the medians, weighted like Lighthouse's. Not Google's score.">
            {r.score}
          </div>
          <div className="text-sm">
            <div className="font-bold">{r.url}</div>
            <div className="text-xs text-muted-foreground">
              {r.runs.length} run{r.runs.length === 1 ? "" : "s"}, {r.profile}. {r.cdn ? `Served by: ${r.cdn}.` : "No CDN header seen."} {previous && dl !== null ? `Largest paint ${dl <= 0 ? "faster" : "slower"} by ${sec(Math.abs(dl))} than the last test.` : ""}
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" data-testid="speed-metrics">
          <Metric label="Largest paint" value={sec(m.lcp)} b={band(m.lcp, 2500, 4000)} note="good under 2.5 s"/>
          <Metric label="Blocking time" value={`${Math.round(m.tbt)} ms`} b={band(m.tbt, 200, 600)} note="good under 200 ms"/>
          <Metric label="Layout shift" value={m.cls.toFixed(3)} b={band(m.cls, 0.1, 0.25)} note="good under 0.1"/>
          <Metric label="First paint" value={sec(m.fcp)} b={band(m.fcp, 1800, 3000)} note="good under 1.8 s"/>
          <Metric label="First byte" value={sec(m.ttfb)} b={band(m.ttfb, 800, 1800)} note="good under 0.8 s"/>
          <Metric label="Weight" value={kb(m.bytes)} b={band(m.bytes, 1.6e6, 4e6)} note={`${m.requests} requests`}/>
          <Metric label="Loaded" value={sec(m.load)} b={band(m.load, 3000, 6000)} note="on slow 4G"/>
        </div>

        <h3 className="mt-5 mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">What to fix, worst first</h3>
        {r.findings.length ? (<ol className="grid gap-2" data-testid="speed-findings">
            {r.findings.map((f) => (<li key={f.id} className="rounded-md border p-3 text-sm" data-testid={`speed-${f.id}`}>
                <div className="flex gap-2">
                  {f.severity === "fail" ? <X className="mt-0.5 size-4 shrink-0 text-red-600"/> : f.severity === "warn" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600"/> : <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground"/>}
                  <div className="min-w-0">
                    <div className="font-semibold">{f.title}</div>
                    <div className="text-muted-foreground">{f.evidence}</div>
                    <div className="mt-1">
                      <b>Fix:</b> {f.fix} {f.gain && <span className="text-emerald-700">{f.gain}</span>}
                    </div>
                    {f.cards.length > 0 && (<details className="mt-1 text-xs">
                        <summary className="cursor-pointer text-primary">From the library ({f.cards.length})</summary>
                        {f.cards.map((c) => (<div key={c.id} className="mt-1 rounded bg-muted p-2">
                            <b>{c.title}</b> <span className="text-muted-foreground">{c.summary}</span>
                          </div>))}
                      </details>)}
                  </div>
                </div>
              </li>))}
          </ol>) : (<p className="text-sm text-muted-foreground">Nothing over the thresholds on this profile.</p>)}

        <h3 className="mt-5 mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">The heaviest requests</h3>
        <table className="w-full text-xs tabular-nums">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">File</th>
              <th className="font-medium">Type</th>
              <th className="font-medium">From</th>
              <th className="text-right font-medium">Size</th>
            </tr>
          </thead>
          <tbody>
            {heaviest.map((q, i) => (<tr key={i} className="border-t">
                <td className="max-w-80 truncate py-1" title={q.url}>
                  {q.url.split("/").pop()?.split("?")[0] || q.host}
                  {q.blocking && <span className="ml-1 rounded bg-red-100 px-1 text-[10px] text-red-800">blocks paint</span>}
                </td>
                <td>{q.type}</td>
                <td>{q.party === "first" ? "This site" : q.host}</td>
                <td className="text-right">{kb(q.bytes)}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
      <div className="text-xs">

        <img src={`/api/assets/${r.shot}`} alt="The page on the test phone" className="w-full rounded-md border"/>
        <div className="mt-3 font-bold">By type</div>
        <ul>
          {byType.map(([t, v]) => (<li key={t} className="flex justify-between border-b py-0.5 tabular-nums">
              <span>
                {t} ({v.n})
              </span>
              <span>{kb(v.b)}</span>
            </li>))}
        </ul>
        <div className="mt-3 font-bold">Each run</div>
        <ul className="tabular-nums">
          {r.runs.map((x, i) => (<li key={i}>
              Run {i + 1}: paint {sec(x.lcp)}, blocking {x.tbt} ms, shift {x.cls}
              {x.error ? `, ${x.error}` : ""}
            </li>))}
        </ul>
      </div>
    </div>);
}
export function SpeedView({ pages, scans, preselectPage }: {
    pages: {
        id: string;
        title: string;
    }[];
    scans: SiteScanRow[];
    preselectPage: string | null;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [source, setSource] = useState<"page" | "url">(preselectPage || (pages.length && !scans.length) ? "page" : "url");
    const [pageId, setPageId] = useState(preselectPage ?? pages[0]?.id ?? "");
    const [url, setUrl] = useState("");
    const [runs, setRuns] = useState(3);
    const [selected, setSelected] = useState<string | null>(scans[0]?.id ?? null);
    const initial = scans.find((s) => s.id === selected) ?? null;
    const { scan, busy } = useScan(selected, initial);
    const result = scan?.status === "done" ? (scan.result as unknown as SpeedResult) : null;
    const previous = useMemo(() => {
        if (!scan)
            return null;
        const p = scans.find((s) => s.url === scan.url && s.status === "done" && s.created_at < scan.created_at);
        return p ? (p.result as unknown as SpeedResult) : null;
    }, [scan, scans]);
    return (<div className="px-6 pb-10 pt-5">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-input p-3">
        <div className="flex gap-1 self-center text-sm">
          {(["page", "url"] as const).map((s) => (<button key={s} type="button" onClick={() => setSource(s)} className={cn("rounded-md px-2.5 py-1", source === s ? "bg-foreground text-background" : "hover:bg-secondary")}>
              {s === "page" ? "A page built here" : "A link"}
            </button>))}
        </div>
        {source === "page" ? (<select className="h-9 min-w-72 rounded-md border bg-background px-2 text-sm" value={pageId} onChange={(e) => setPageId(e.target.value)} data-testid="speed-page">
            {pages.map((p) => (<option key={p.id} value={p.id}>
                {p.title}
              </option>))}
          </select>) : (<Input className="h-9 w-96" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://store.com/products/hero" data-testid="speed-url"/>)}
        <div>
          <Label className="mb-1 block text-xs">Runs</Label>
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={runs} onChange={(e) => setRuns(Number(e.target.value))} data-testid="speed-runs">
            {[1, 2, 3].map((n) => (<option key={n} value={n}>
                {n}
              </option>))}
          </select>
        </div>
        <Button disabled={pending || (source === "page" ? !pageId : !url.trim())} onClick={() => start(async () => {
            const res = await speedAction(source === "page" ? { pageId, runs } : { url, runs });
            if (!res.ok)
                return void toast.error(res.error);
            setSelected(res.id);
            router.refresh();
        })} data-testid="speed-go">
          {pending ? <Loader2 className="size-4 animate-spin"/> : <Gauge className="size-4"/>} Test it
        </Button>
        <span className="text-xs text-muted-foreground">Free. About 20 to 60 seconds a run.</span>
      </div>

      {scans.length > 0 && (<div className="mt-4 flex flex-wrap gap-1.5 text-xs" data-testid="speed-history">
          {scans.slice(0, 14).map((s) => (<button key={s.id} type="button" onClick={() => setSelected(s.id)} className={cn("rounded-full border px-2.5 py-1", s.id === selected ? "border-foreground bg-foreground text-background" : "hover:bg-secondary")}>
              {s.page_id ?? s.url.replace(/^https?:\/\//, "").slice(0, 34)} · {s.status === "done" ? (s.result as unknown as SpeedResult).score : s.status} · {s.created_at.slice(5, 16).replace("T", " ")}
            </button>))}
        </div>)}

      {scan && busy && (<p className="mt-6 flex items-center gap-2 text-sm" data-testid="speed-running">
          <Loader2 className="size-4 animate-spin"/> Testing {scan.url} on a throttled phone...
        </p>)}
      {scan?.status === "failed" && <p className="mt-6 text-sm text-red-700">The test failed: {scan.error}</p>}
      {result && <Result r={result} previous={previous}/>}
      {scan && !busy && (<button type="button" className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive" onClick={() => start(async () => {
                await deleteScanAction(scan.id);
                setSelected(null);
                router.refresh();
            })}>
          <Trash2 className="size-3.5"/> Delete this test
        </button>)}
    </div>);
}
