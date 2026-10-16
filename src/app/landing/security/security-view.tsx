"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SiteScanRow } from "@/db/schema";
import type { SecResult, Severity } from "@/lib/landing/security";
import { cn } from "@/lib/utils";
import { deleteScanAction, securityAction } from "../actions";
import { useScan } from "../scan-poll";
const SEV: Record<Severity, string> = { critical: "bg-red-600 text-white", high: "bg-red-100 text-red-800", medium: "bg-amber-100 text-amber-900", low: "bg-sky-100 text-sky-900", info: "bg-muted text-muted-foreground" };
const GRADE: Record<SecResult["grade"], string> = { A: "bg-emerald-100 text-emerald-800", B: "bg-emerald-50 text-emerald-800", C: "bg-amber-100 text-amber-900", D: "bg-red-100 text-red-800", F: "bg-red-700 text-white" };
function Result({ r }: {
    r: SecResult;
}) {
    const areas = [...new Set(r.findings.map((f) => f.area))];
    const counts = (["critical", "high", "medium", "low"] as Severity[]).map((s) => [s, r.findings.filter((f) => f.severity === s).length] as const);
    return (<div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]" data-testid="security-result">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <div className={cn("flex size-14 items-center justify-center rounded-full text-2xl font-extrabold", GRADE[r.grade])} data-testid="security-grade">
            {r.grade}
          </div>
          <div className="text-sm">
            <div className="font-bold">{r.final_url}</div>
            <div className="text-xs text-muted-foreground">
              {counts.map(([s, n]) => `${n} ${s}`).join(", ")}. {r.platform ? `Runs on ${r.platform}.` : ""} {r.at.slice(0, 16).replace("T", " ")}
            </div>
          </div>
        </div>
        {areas.map((area) => (<div key={area} className="mt-4">
            <h3 className="mb-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">{area}</h3>
            <ul className="grid gap-2">
              {r.findings
                .filter((f) => f.area === area)
                .map((f) => (<li key={f.id} className="rounded-md border p-3 text-sm" data-testid={`sec-${f.id}`}>
                    <div className="flex items-start gap-2">
                      <span className={cn("rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase", SEV[f.severity])}>{f.severity}</span>
                      <div className="min-w-0">
                        <div className="font-semibold">{f.title}</div>
                        <div className="break-words text-muted-foreground">{f.evidence}</div>
                        <div className="mt-1">
                          <b>Fix:</b> {f.fix}
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
            </ul>
          </div>))}
      </div>
      <div className="text-xs">
        <div className="font-bold">What was checked</div>
        <ul className="mt-1 list-disc pl-4">
          {r.checked.map((c) => (<li key={c}>{c}</li>))}
        </ul>
        {r.cert && (<>
            <div className="mt-3 font-bold">Certificate</div>
            <p>
              {r.cert.issuer}, valid to {r.cert.valid_to} ({r.cert.days_left} days), {r.cert.protocol}.
            </p>
          </>)}
        <div className="mt-3 font-bold">Response headers</div>
        <table className="mt-1 w-full">
          <tbody>
            {Object.entries(r.headers)
            .filter(([k]) => /strict-transport|content-security|x-frame|x-content-type|referrer|permissions|server|x-powered/.test(k))
            .map(([k, v]) => (<tr key={k} className="border-t align-top">
                  <td className="py-0.5 pr-2 font-medium">{k}</td>
                  <td className="break-all text-muted-foreground">{v.slice(0, 120)}</td>
                </tr>))}
          </tbody>
        </table>
        <p className="mt-3 text-muted-foreground">This is not a penetration test or a PCI scan. On Shopify the checkout and its payment pages are Shopify&apos;s; the theme, the apps and the scripts are the brand&apos;s.</p>
      </div>
    </div>);
}
export function SecurityView({ scans }: {
    scans: SiteScanRow[];
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [url, setUrl] = useState("");
    const [owner, setOwner] = useState(false);
    const [selected, setSelected] = useState<string | null>(scans[0]?.id ?? null);
    const initial = scans.find((s) => s.id === selected) ?? null;
    const { scan, busy } = useScan(selected, initial);
    const result = scan?.status === "done" ? (scan.result as unknown as SecResult) : null;
    return (<div className="px-6 pb-10 pt-5">
      <div className="grid gap-2 rounded-lg border border-input p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input className="h-9 w-96" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://store.com" data-testid="security-url"/>
          <Button disabled={pending || !url.trim() || !owner} onClick={() => start(async () => {
            const res = await securityAction({ url, owner: true });
            if (!res.ok)
                return void toast.error(res.error);
            setSelected(res.id);
            router.refresh();
        })} data-testid="security-go">
            {pending ? <Loader2 className="size-4 animate-spin"/> : <ShieldCheck className="size-4"/>} Scan it
          </Button>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={owner} onChange={(e) => setOwner(e.target.checked)} data-testid="security-owner"/>
          The brand owns this site, or has the owner&apos;s permission to scan it.
        </label>
      </div>
      {scans.length > 0 && (<div className="mt-4 flex flex-wrap gap-1.5 text-xs">
          {scans.slice(0, 12).map((s) => (<button key={s.id} type="button" onClick={() => setSelected(s.id)} className={cn("rounded-full border px-2.5 py-1", s.id === selected ? "border-foreground bg-foreground text-background" : "hover:bg-secondary")}>
              {s.url.replace(/^https?:\/\//, "").slice(0, 34)} · {s.status === "done" ? (s.result as unknown as SecResult).grade : s.status} · {s.created_at.slice(5, 16).replace("T", " ")}
            </button>))}
        </div>)}
      {scan && busy && (<p className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin"/> Scanning {scan.url}...
        </p>)}
      {scan?.status === "failed" && <p className="mt-6 text-sm text-red-700">The scan failed: {scan.error}</p>}
      {result && <Result r={result}/>}
      {scan && !busy && (<button type="button" className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive" onClick={() => start(async () => (await deleteScanAction(scan.id), setSelected(null), router.refresh()))}>
          <Trash2 className="size-3.5"/> Delete this scan
        </button>)}
    </div>);
}
