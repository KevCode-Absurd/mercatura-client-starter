import { cn } from "@/lib/utils";
import type { AdInsights } from "@/lib/landing/types";
export const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;
export function Simulated({ className }: {
    className?: string;
}) {
    return (<span title="These are sample figures. Connect your ad data before using them to make spending decisions." className={cn("inline-flex items-center rounded-sm bg-signal px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-signal-foreground uppercase", className)} data-testid="simulated">
      Simulated
    </span>);
}
export function Verdict({ v }: {
    v: AdInsights["verdict"];
}) {
    const map = { scale: ["Scale", "bg-emerald-600 text-white"], watch: ["Watch", "bg-amber-300 text-amber-950"], cut: ["Cut", "bg-red-600 text-white"] } as const;
    return <span className={cn("rounded-sm px-1.5 py-0.5 text-[11px] font-bold uppercase", map[v][1])}>{map[v][0]}</span>;
}
export function ScoreDot({ score, fails }: {
    score: number;
    fails: number;
}) {
    return (<span className={cn("inline-flex min-w-11 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums", fails ? "bg-red-100 text-red-800" : score >= 80 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900")} title={`${fails} failing checks`}>
      {score}
    </span>);
}
