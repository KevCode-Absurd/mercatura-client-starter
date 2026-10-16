import Link from "next/link";
import type { Ledger } from "@/lib/ledger";
import { cn } from "@/lib/utils";
export const usd = (n: number, digits = 2) => `$${n.toFixed(n > 0 && n < 0.01 && digits === 2 ? 3 : digits)}`;
export const num = (n: number) => Math.round(n).toLocaleString("en-US");
const th = "border-b bg-muted/50 px-3 py-2.5 text-left text-xs font-medium text-muted-foreground";
const td = "border-b px-3 py-3 text-[13px] align-top";
const r = "text-right tabular-nums";
const Est = () => (<span className="ml-1 rounded border border-amber-200 bg-amber-50 px-1 text-xs text-amber-800" title="No price is on file for this model, so its cost is worked out at a fallback rate. The tokens are exact.">
    est.
  </span>);
export function Totals({ l, label = "This run" }: {
    l: Ledger;
    label?: string;
}) {
    const parts = [
        { name: "Writing and checks", usd: l.textUsd, note: `${num(l.tokensIn + l.tokensCached)} tokens in, ${num(l.tokensOut)} out`, color: "var(--primary)" },
        { name: "Images", usd: l.imageUsd, note: `${l.images} image${l.images === 1 ? "" : "s"}`, color: "color-mix(in oklab, var(--primary) 55%, var(--card))" },
        { name: "Video", usd: l.videoUsd, note: `${l.clips} clip${l.clips === 1 ? "" : "s"}`, color: "color-mix(in oklab, var(--primary) 25%, var(--card))" },
    ];
    return (<div className="rounded-xl border bg-card p-6 max-md:p-4" data-testid="cost-totals">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="numeral mt-1 text-6xl leading-none" data-testid="cost-total">
            {usd(l.totalUsd)}
          </div>
        </div>
        {l.estimatedUsd > 0 && (<p className="max-w-md text-xs text-amber-800">
            {usd(l.estimatedUsd)} of this is an estimate: the models marked <Est /> have no price on file and are costed at a fallback rate. Their tokens are exact.
          </p>)}
      </div>
      {l.totalUsd > 0 && (<div className="mt-6 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
          {parts.filter((p) => p.usd > 0).map((p) => (<div key={p.name} style={{ width: `${(p.usd / l.totalUsd) * 100}%`, background: p.color }} title={`${p.name}: ${usd(p.usd)}`}/>))}
        </div>)}
      <dl className="mt-5 grid gap-5 sm:grid-cols-3">
        {parts.map((p) => (<div key={p.name}>
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="size-2.5 rounded-full" style={{ background: p.color }}/>
              {p.name}
            </dt>
            <dd className="numeral mt-1 text-3xl">{usd(p.usd)}</dd>
            <dd className="text-xs text-muted-foreground">{p.note}</dd>
          </div>))}
      </dl>
    </div>);
}
export function ModelTable({ l }: {
    l: Ledger;
}) {
    if (!l.models.length)
        return null;
    return (<div className="overflow-x-auto rounded-lg border bg-card" data-testid="cost-models">
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>Model</th>
            <th className={th}>Kind</th>
            <th className={cn(th, r)}>Calls</th>
            <th className={cn(th, r)}>Tokens in</th>
            <th className={cn(th, r)}>From cache</th>
            <th className={cn(th, r)}>Tokens out</th>
            <th className={th}>Priced at, per million</th>
            <th className={cn(th, r)}>Cost</th>
            <th className={cn(th, r)}>Share</th>
          </tr>
        </thead>
        <tbody>
          {l.models.map((m) => (<tr key={`${m.kind}${m.model}`} data-testid="cost-model">
              <td className={cn(td, "font-mono")}>
                {m.model}
                {m.estimated && <Est />}
              </td>
              <td className={td}>{m.kind}</td>
              <td className={cn(td, r)}>{m.calls}</td>
              <td className={cn(td, r)}>{m.kind === "text" ? num(m.tokensIn) : "-"}</td>
              <td className={cn(td, r)}>{m.kind === "text" ? num(m.tokensCached) : "-"}</td>
              <td className={cn(td, r)}>{m.kind === "text" ? num(m.tokensOut) : "-"}</td>
              <td className={td}>{m.kind === "text" ? m.rate : m.kind === "image" ? "by the usage the provider reports" : "by the second"}</td>
              <td className={cn(td, r, "font-medium")}>{usd(m.usd)}</td>
              <td className={cn(td, r)}>{l.totalUsd ? `${Math.round((m.usd / l.totalUsd) * 100)}%` : "-"}</td>
            </tr>))}
          <tr className="bg-muted/30 font-medium">
            <td className={td} colSpan={2}>
              Total
            </td>
            <td className={cn(td, r)}>{l.models.reduce((n, m) => n + m.calls, 0)}</td>
            <td className={cn(td, r)}>{num(l.tokensIn)}</td>
            <td className={cn(td, r)}>{num(l.tokensCached)}</td>
            <td className={cn(td, r)}>{num(l.tokensOut)}</td>
            <td className={td}/>
            <td className={cn(td, r)}>{usd(l.totalUsd)}</td>
            <td className={cn(td, r)}>100%</td>
          </tr>
        </tbody>
      </table>
    </div>);
}
export function StepTable({ l }: {
    l: Ledger;
}) {
    if (!l.steps.length)
        return <p className="text-sm text-muted-foreground">No text model was called.</p>;
    return (<div className="overflow-x-auto rounded-lg border bg-card" data-testid="cost-steps">
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>Step</th>
            <th className={th}>Model</th>
            <th className={cn(th, r)}>Calls</th>
            <th className={cn(th, r)}>Failed</th>
            <th className={cn(th, r)}>Tokens in</th>
            <th className={cn(th, r)}>From cache</th>
            <th className={cn(th, r)}>Tokens out</th>
            <th className={cn(th, r)}>Seconds</th>
            <th className={cn(th, r)}>Cost</th>
          </tr>
        </thead>
        <tbody>
          {l.steps.map((s) => (<tr key={`${s.step}${s.model}`} data-testid="cost-step">
              <td className={td}>{s.step.replace(/_/g, " ")}</td>
              <td className={cn(td, "font-mono")}>
                {s.model}
                {s.estimated && <Est />}
              </td>
              <td className={cn(td, r)}>{s.calls}</td>
              <td className={cn(td, r, s.failed ? "text-red-700" : "text-muted-foreground")}>{s.failed}</td>
              <td className={cn(td, r)}>{num(s.tokensIn)}</td>
              <td className={cn(td, r)}>{num(s.tokensCached)}</td>
              <td className={cn(td, r)}>{num(s.tokensOut)}</td>
              <td className={cn(td, r)}>{num(s.seconds)}</td>
              <td className={cn(td, r, "font-medium")}>{usd(s.usd, 3)}</td>
            </tr>))}
          <tr className="bg-muted/30 font-medium">
            <td className={td} colSpan={2}>
              Writing and checks
            </td>
            <td className={cn(td, r)}>{l.steps.reduce((n, s) => n + s.calls, 0)}</td>
            <td className={cn(td, r)}>{l.steps.reduce((n, s) => n + s.failed, 0)}</td>
            <td className={cn(td, r)}>{num(l.tokensIn)}</td>
            <td className={cn(td, r)}>{num(l.tokensCached)}</td>
            <td className={cn(td, r)}>{num(l.tokensOut)}</td>
            <td className={cn(td, r)}>{num(l.steps.reduce((n, s) => n + s.seconds, 0))}</td>
            <td className={cn(td, r)}>{usd(l.textUsd, 3)}</td>
          </tr>
        </tbody>
      </table>
    </div>);
}
export function MediaTable({ l }: {
    l: Ledger;
}) {
    if (!l.media.length)
        return <p className="text-sm text-muted-foreground">No image or video was generated.</p>;
    return (<div className="overflow-x-auto rounded-lg border bg-card" data-testid="cost-media">
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>What</th>
            <th className={th}>Model</th>
            <th className={th}>Quality</th>
            <th className={cn(th, r)}>Made</th>
            <th className={cn(th, r)}>Failed</th>
            <th className={cn(th, r)}>Each</th>
            <th className={cn(th, r)}>Seconds</th>
            <th className={cn(th, r)}>Cost</th>
          </tr>
        </thead>
        <tbody>
          {l.media.map((m) => (<tr key={`${m.what}${m.model}${m.quality}`} data-testid="cost-media-row">
              <td className={td}>
                {m.what} <span className="text-muted-foreground">({m.kind})</span>
              </td>
              <td className={cn(td, "font-mono")}>{m.model}</td>
              <td className={td}>{m.quality || "-"}</td>
              <td className={cn(td, r)}>{m.made}</td>
              <td className={cn(td, r, m.failed ? "text-red-700" : "text-muted-foreground")}>{m.failed}</td>
              <td className={cn(td, r)}>{m.made ? usd(m.usd / m.made, 3) : "-"}</td>
              <td className={cn(td, r)}>{num(m.seconds)}</td>
              <td className={cn(td, r, "font-medium")}>{usd(m.usd, 3)}</td>
            </tr>))}
          <tr className="bg-muted/30 font-medium">
            <td className={td} colSpan={3}>
              Images and video
            </td>
            <td className={cn(td, r)}>{l.images + l.clips}</td>
            <td className={cn(td, r)}>{l.media.reduce((n, m) => n + m.failed, 0)}</td>
            <td className={td}/>
            <td className={td}/>
            <td className={cn(td, r)}>{usd(l.imageUsd + l.videoUsd, 3)}</td>
          </tr>
        </tbody>
      </table>
    </div>);
}
export function CallLog({ l }: {
    l: Ledger;
}) {
    if (!l.calls.length)
        return null;
    let running = 0;
    return (<div className="overflow-x-auto rounded-lg border bg-card" data-testid="cost-log">
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>Time</th>
            <th className={th}>Step</th>
            <th className={th}>Model</th>
            <th className={cn(th, r)}>Tokens in</th>
            <th className={cn(th, r)}>From cache</th>
            <th className={cn(th, r)}>Tokens out</th>
            <th className={cn(th, r)}>Seconds</th>
            <th className={cn(th, r)}>Cost</th>
            <th className={cn(th, r)}>Running total</th>
            <th className={th}>Note</th>
          </tr>
        </thead>
        <tbody>
          {l.calls.map((c, i) => {
            running += c.usd;
            return (<tr key={i} className={c.status === "ok" || c.status === "submitted" ? "" : "bg-red-50/60"} data-testid="cost-call">
                <td className={cn(td, "whitespace-nowrap tabular-nums text-muted-foreground")}>{new Date(c.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                <td className={td}>
                  <Link href={`/inspect/call/${c.id}`} className="text-primary hover:underline" title="Open this call: what was sent and what came back">
                    {c.step.replace(/_/g, " ")}
                  </Link>
                </td>
                <td className={cn(td, "font-mono")}>{c.model}</td>
                <td className={cn(td, r)}>{c.kind === "text" ? num(c.tokensIn) : "-"}</td>
                <td className={cn(td, r)}>{c.kind === "text" ? num(c.tokensCached) : "-"}</td>
                <td className={cn(td, r)}>{c.kind === "text" ? num(c.tokensOut) : "-"}</td>
                <td className={cn(td, r)}>{c.seconds.toFixed(1)}</td>
                <td className={cn(td, r)}>{usd(c.usd, 4)}</td>
                <td className={cn(td, r, "text-muted-foreground")}>{usd(running, 3)}</td>
                <td className={cn(td, c.status === "ok" || c.status === "submitted" ? "text-muted-foreground" : "text-red-700")}>{c.status === "ok" ? c.note : `${c.status}${c.note ? `: ${c.note}` : ""}`}</td>
              </tr>);
        })}
        </tbody>
      </table>
    </div>);
}
