"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AWARENESS_INFO, INSIGHT_INFO, SOURCE_INFO, SOURCE_TYPES, humanize, type AwarenessStage, type InsightType, type SourceType, } from "@/lib/taxonomy";
export function PageHeader({ title, subtitle, back, children, }: {
    title: string;
    subtitle?: React.ReactNode;
    back?: {
        href: string;
        label: string;
        testId?: string;
    };
    children?: React.ReactNode;
}) {
    return (<div className={cn("mx-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-rule pb-5 max-md:pt-6", back ? "pt-5" : "pt-10")}>
      <div className="min-w-0">
        {back && (<Link href={back.href} className="-ml-2 mb-3 inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 pr-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground" data-testid={back.testId ?? "page-back"}>
            <ArrowLeft className="size-4"/>
            {back.label}
          </Link>)}
        <h1 className="display text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-3xl text-[0.9375rem] leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{children}</div>}
    </div>);
}
export function TypePill({ type, className }: {
    type: InsightType;
    className?: string;
}) {
    const info = INSIGHT_INFO[type];
    return (<span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs", className)} title={info.definition}>
      <span className="size-2 rounded-full" style={{ background: info.color }}/>
      {info.label}
    </span>);
}
export function AwarenessPill({ stage }: {
    stage: AwarenessStage;
}) {
    return (<Badge variant="outline" className="border-primary font-medium text-primary">
      {AWARENESS_INFO[stage].label}
    </Badge>);
}
export function SourceLetters({ types }: {
    types: string[];
}) {
    return (<span className="inline-flex gap-0.5 font-mono text-xs">
      {SOURCE_TYPES.map((t) => (<span key={t} title={SOURCE_INFO[t].label} className={cn("inline-flex size-5 items-center justify-center rounded", types.includes(t) ? "bg-primary/15 text-primary" : "text-muted-foreground/40")}>
          {SOURCE_INFO[t as SourceType].short}
        </span>))}
    </span>);
}
const STATUS_WORD: Record<string, string> = { "pre-processing": "preparing", extracting: "reading", queued: "waiting" };
export function StatusPill({ status }: {
    status: string;
}) {
    const tone: Record<string, string> = {
        done: "bg-emerald-50 text-emerald-700 border-emerald-200",
        approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
        ready_for_handoff: "bg-emerald-50 text-emerald-700 border-emerald-200",
        scripted: "bg-sky-50 text-sky-700 border-sky-200",
        pending: "bg-amber-50 text-amber-700 border-amber-200",
        in_review: "bg-amber-50 text-amber-700 border-amber-200",
        failed: "bg-red-50 text-red-700 border-red-200",
        rejected: "bg-red-50 text-red-700 border-red-200",
        queued: "bg-sky-50 text-sky-700 border-sky-200",
        "pre-processing": "bg-sky-50 text-sky-700 border-sky-200 animate-pulse",
        extracting: "bg-violet-50 text-violet-700 border-violet-200 animate-pulse",
    };
    return (<span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs whitespace-nowrap", tone[status] ?? "bg-muted")}>
      {STATUS_WORD[status] ?? humanize(status)}
    </span>);
}
export function PhaseButton({ phase, children, size = "sm", variant = "outline", }: {
    phase: number;
    children: React.ReactNode;
    size?: "sm" | "default";
    variant?: "outline" | "default" | "secondary";
}) {
    return (<Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>
          <Button size={size} variant={variant} disabled>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Not built yet</TooltipContent>
    </Tooltip>);
}
export function IntensityDots({ value }: {
    value: number;
}) {
    return (<span className="inline-flex gap-0.5" title={`Intensity ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (<span key={n} className={cn("size-1.5 rounded-full", n <= value ? "bg-foreground/70" : "bg-muted-foreground/20")}/>))}
    </span>);
}
export function MixBar({ label, actual, targetMin, targetMax, note, }: {
    label: string;
    actual: number | null;
    targetMin: number;
    targetMax: number;
    note?: string;
}) {
    const ok = actual !== null && actual >= targetMin && actual <= targetMax;
    return (<div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={cn("font-medium tabular-nums", actual === null ? "text-muted-foreground" : ok ? "text-emerald-700" : "text-amber-700")}>
          {actual === null ? "no data" : `${Math.round(actual * 100)}%`}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-muted">
        <div className="absolute inset-y-0 rounded-full bg-emerald-200" style={{ left: `${targetMin * 100}%`, width: `${(targetMax - targetMin) * 100}%` }} title="Target range"/>
        {actual !== null && (<div className="absolute -top-0.5 h-3 w-1 rounded bg-foreground" style={{ left: `calc(${actual * 100}% - 2px)` }}/>)}
      </div>
      <div className="text-xs text-muted-foreground">
        Target {Math.round(targetMin * 100)} to {Math.round(targetMax * 100)}%{note ? ` · ${note}` : ""}
      </div>
    </div>);
}
