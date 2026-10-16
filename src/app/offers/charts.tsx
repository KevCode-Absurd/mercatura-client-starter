"use client";
import { thresholdsFor, type CurvePoint, type Economics, type Spread, type Waterfall } from "@/lib/offers/economics";
export function SpreadChart({ bands, spread, sym }: {
    bands: Economics["order_values"];
    spread: Spread;
    sym: string;
}) {
    const b = [...bands].sort((x, y) => x.from - y.from);
    if (!b.length)
        return null;
    const W = 640;
    const H = 220;
    const pad = { l: 8, r: 8, t: 28, b: 34 };
    const lo = b[0].from;
    const hi = b[b.length - 1].to;
    const x = (v: number) => pad.l + ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (W - pad.l - pad.r);
    const total = b.reduce((a, v) => a + v.share, 0);
    const dens = b.map((v) => v.share / total / (v.to - v.from));
    const top = Math.max(...dens);
    const y = (d: number) => H - pad.b - (d / top) * (H - pad.t - pad.b);
    const isPeak = (v: (typeof b)[number]) => spread.peaks.some((p) => p.from === v.from);
    return (<svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Order values: ${spread.shape === "two" ? "2 peaks" : "1 peak"}, average ${sym}${spread.mean.toFixed(0)}`} data-testid="spread-chart">
      {thresholdsFor(spread).map((t) => (<g key={t.peak}>
          <rect x={x(t.from)} y={pad.t} width={Math.max(2, x(t.to) - x(t.from))} height={H - pad.t - pad.b} className="fill-emerald-500/15"/>
          <text x={(x(t.from) + x(t.to)) / 2} y={pad.t - 8} textAnchor="middle" className="fill-emerald-700 text-xs font-medium">
            a tier here
          </text>
        </g>))}
      {b.map((v, i) => (<g key={v.from}>
          <rect x={x(v.from) + 1} y={y(dens[i])} width={Math.max(1, x(v.to) - x(v.from) - 2)} height={H - pad.b - y(dens[i])} rx={2} className={isPeak(v) ? "fill-primary" : "fill-primary/25"}/>
          <text x={(x(v.from) + x(v.to)) / 2} y={y(dens[i]) - 4} textAnchor="middle" className="fill-foreground text-xs tabular-nums">
            {Math.round((v.share / total) * 100)}%
          </text>
          <text x={x(v.from)} y={H - pad.b + 14} textAnchor="middle" className="fill-muted-foreground text-xs tabular-nums">
            {sym}
            {v.from}
          </text>
        </g>))}
      <text x={x(hi)} y={H - pad.b + 14} textAnchor="end" className="fill-muted-foreground text-xs tabular-nums">
        {sym}
        {hi}
      </text>
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="stroke-foreground" strokeWidth={1.5}/>
      <line x1={x(spread.mean)} x2={x(spread.mean)} y1={pad.t} y2={H - pad.b} className="stroke-red-600" strokeWidth={1.5} strokeDasharray="4 3"/>
      <text x={x(spread.mean)} y={H - 4} textAnchor="middle" className="fill-red-700 text-xs font-medium">
        average {sym}
        {spread.mean.toFixed(0)}
      </text>
    </svg>);
}
export function CurveChart({ points, best, today, sym }: {
    points: CurvePoint[];
    best: number;
    today: number;
    sym: string;
}) {
    const W = 640;
    const H = 260;
    const pad = { l: 44, r: 44, t: 16, b: 30 };
    const step = (W - pad.l - pad.r) / points.length;
    const cx = (i: number) => pad.l + step * (i + 0.5);
    const vals = points.map((p) => p.contribution);
    const lo = Math.min(0, ...vals, today);
    const hi = Math.max(0, ...vals, today);
    const span = hi - lo || 1;
    const y = (v: number) => pad.t + ((hi - v) / span) * (H - pad.t - pad.b);
    const cap = Math.max(...points.map((p) => p.reachable)) * 2.2;
    const ry = (v: number) => pad.t + (1 - Math.min(v, cap) / cap) * (H - pad.t - pad.b);
    const line = (pick: (p: CurvePoint) => number) => points.map((p, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)},${ry(Number.isFinite(pick(p)) ? pick(p) : cap).toFixed(1)}`).join(" ");
    return (<svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="What a flat discount does to an order" data-testid="curve-chart">
      <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} className="stroke-foreground" strokeWidth={1}/>
      <line x1={pad.l} x2={W - pad.r} y1={y(today)} y2={y(today)} className="stroke-muted-foreground" strokeWidth={1} strokeDasharray="3 3"/>
      <text x={pad.l - 4} y={y(today) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">
        today
      </text>
      {points.map((p, i) => (<g key={p.discount}>
          <rect x={cx(i) - step * 0.32} y={Math.min(y(0), y(p.contribution))} width={step * 0.64} height={Math.max(1, Math.abs(y(p.contribution) - y(0)))} rx={2} className={p.discount === best ? "fill-emerald-600" : p.contribution >= today ? "fill-emerald-600/35" : "fill-red-500/35"}/>
          <text x={cx(i)} y={H - pad.b + 14} textAnchor="middle" className={p.discount === best ? "fill-emerald-700 text-xs font-semibold" : "fill-muted-foreground text-xs"}>
            {Math.round(p.discount * 100)}%
          </text>
        </g>))}
      <path d={line((p) => p.needed)} fill="none" className="stroke-red-600" strokeWidth={2}/>
      <path d={line((p) => p.reachable)} fill="none" className="stroke-primary" strokeWidth={2} strokeDasharray="5 3"/>
      <text x={W - pad.r + 4} y={ry(points[points.length - 1].needed) + 3} className="fill-red-700 text-[9px] font-medium">
        needed
      </text>
      <text x={W - pad.r + 4} y={ry(points[points.length - 1].reachable) + 12} className="fill-primary text-[9px] font-medium">
        reached
      </text>
      <text x={pad.l - 4} y={y(hi) + 8} textAnchor="end" className="fill-muted-foreground text-[9px] tabular-nums">
        {sym}
        {hi.toFixed(0)}
      </text>
      <text x={pad.l - 4} y={y(lo)} textAnchor="end" className="fill-muted-foreground text-[9px] tabular-nums">
        {lo < 0 ? "-" : ""}
        {sym}
        {Math.abs(lo).toFixed(0)}
      </text>
    </svg>);
}
const PARTS: {
    key: keyof Pick<Waterfall, "goods" | "shipping" | "fees" | "extras" | "margin">;
    label: string;
    cls: string;
}[] = [
    { key: "goods", label: "Goods", cls: "bg-foreground/70" },
    { key: "shipping", label: "Shipping", cls: "bg-foreground/45" },
    { key: "fees", label: "Fees", cls: "bg-foreground/25" },
    { key: "extras", label: "Given with it", cls: "bg-amber-500" },
    { key: "margin", label: "Kept before ads", cls: "bg-emerald-600" },
];
export function OrderBar({ w, scale, label, sym }: {
    w: Waterfall;
    scale: number;
    label: string;
    sym: string;
}) {
    const width = scale > 0 ? Math.max(8, (w.revenue / scale) * 100) : 100;
    return (<div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          pays {sym}
          {w.revenue.toFixed(2)}
        </span>
      </div>
      <div className="mt-1 flex h-5 overflow-hidden rounded" style={{ width: `${width}%` }}>
        {PARTS.filter((p) => w[p.key] > 0).map((p) => (<div key={p.key} className={p.cls} style={{ width: `${(w[p.key] / w.revenue) * 100}%` }} title={`${p.label}: ${sym}${w[p.key].toFixed(2)}`}/>))}
      </div>
    </div>);
}
export const OrderBarLegend = () => (<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    {PARTS.map((p) => (<span key={p.key} className="flex items-center gap-1">
        <span className={`inline-block size-2.5 rounded-sm ${p.cls}`}/>
        {p.label}
      </span>))}
  </div>);
