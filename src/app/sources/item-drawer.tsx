"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IntensityDots, TypePill } from "@/components/bits";
import { useAdvanced } from "@/components/mode";
import { HighlightedText } from "@/components/highlighted-text";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { InsightRow, Segment, SourceItemRow } from "@/db/schema";
import type { Highlight } from "@/lib/segments";
import { INSIGHT_INFO, OBJECTION_LABELS, SOURCE_INFO, humanize, type InsightType } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { ItemPipeline } from "./item-pipeline";
export function ItemDrawer({ item, insights, themes, personas, initialHighlight, onClose, }: {
    item: SourceItemRow | null;
    insights: InsightRow[];
    themes: {
        id: string;
        label: string;
    }[];
    personas: {
        id: string;
        name: string;
    }[];
    initialHighlight: string | null;
    onClose: () => void;
}) {
    const [selected, setSelected] = useState<string | null>(initialHighlight);
    const [view, setView] = useState<"working" | "clean" | "raw">("working");
    const [tab, setTab] = useState<"source" | "pipeline">("source");
    const advanced = useAdvanced();
    useEffect(() => {
        setSelected(initialHighlight);
        setView("working");
        setTab("source");
        if (initialHighlight) {
            setTimeout(() => document.getElementById(`hl-${initialHighlight}`)?.scrollIntoView({ block: "center" }), 300);
        }
    }, [item?.id, initialHighlight]);
    if (!item)
        return <Sheet open={false}/>;
    const p = item.pipeline;
    const ready = item.preprocess_status === "done";
    const effView = ready ? view : "raw";
    const text = effView === "raw" ? item.raw_text : effView === "clean" && p ? item.clean_text : item.redacted_text;
    const segments: Segment[] = effView === "raw" ? (p?.raw_segments ?? item.meta.segments) : effView === "clean" && p ? p.clean_segments : item.meta.segments;
    const hls: Highlight[] = effView !== "working" ? [] : insights.map((i) => ({ id: i.id, start: i.char_start, end: i.char_end, color: INSIGHT_INFO[i.type].color }));
    const sel = insights.find((i) => i.id === selected);
    const typesPresent = [...new Set(insights.map((i) => i.type))] as InsightType[];
    const meta = item.meta as any;
    const seg = (s: Segment) => (<HighlightedText text={text} start={s.start} end={s.end} highlights={hls} selectedId={selected} onSelect={setSelected}/>);
    return (<Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-2xl" data-testid="item-drawer">
        <SheetHeader className="border-b">
          <SheetTitle className="pr-6">{item.title ?? (advanced ? item.id : SOURCE_INFO[item.source_type].label)}</SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary">{SOURCE_INFO[item.source_type].tab}</Badge>
              {advanced && <span className="font-mono">{item.id}</span>}
              {item.date && <span>{item.date}</span>}
              {item.source_type === "call" && (<>
                  <span>{meta.customer_label}</span>
                  <span>{Math.round(meta.duration_sec / 60)} min</span>
                </>)}
              {item.source_type === "community" && (<span>
                  {humanize(meta.platform)} · {meta.community}
                </span>)}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {typesPresent.length > 0 && (<div className="flex flex-wrap items-center gap-1.5" aria-label="Legend">
              <span className="text-xs text-muted-foreground">Highlights:</span>
              {typesPresent.map((t) => (<TypePill key={t} type={t}/>))}
            </div>)}

          {advanced && (<Tabs value={tab} onValueChange={(v) => setTab(v as "source" | "pipeline")}>
            <TabsList>
              <TabsTrigger value="source">Source</TabsTrigger>
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            </TabsList>
          </Tabs>)}

          {advanced && tab === "pipeline" ? (<ItemPipeline item={item} insights={insights}/>) : (<>
          {!advanced && !ready && <p className="text-xs text-muted-foreground">This item has not been prepared yet: this is the text as it was imported.</p>}
          {advanced && (<div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Text version">
            {([
                    ["working", "Redacted working copy"],
                    ...(item.source_type === "call" && p ? [["clean", "Clean"] as const] : []),
                    ["raw", item.source_type === "call" ? "Raw transcript" : "Raw"],
                ] as const).map(([v, label]) => (<button key={v} disabled={!ready && v !== "raw"} onClick={() => setView(v as typeof view)} className={cn("rounded-md border px-2 py-0.5 text-xs disabled:opacity-40", effView === v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                {label}
              </button>))}
            <span className="text-xs text-muted-foreground">
              {!ready
                    ? "Pre-processing hasn't run yet: this is the raw import."
                    : effView === "working"
                        ? "Quotes are verified against this copy. It is the only text sent to Claude for extraction."
                        : effView === "clean"
                            ? "After transcript cleaning, before names are redacted."
                            : "As imported. Stays on this computer."}
            </span>
          </div>)}

          {item.source_type === "call" && (<div className="space-y-2" data-testid="transcript">
              {segments.map((s, n) => (<div key={n} className={cn("flex", s.role === "customer" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%] rounded-lg px-3 py-2 text-sm", s.role === "customer" ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted")}>
                    <div className="mb-0.5 text-xs font-medium text-muted-foreground">{s.label}</div>
                    {seg(s)}
                  </div>
                </div>))}
            </div>)}

          {item.source_type === "ticket" && (<div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">{meta.channel}</Badge>
                <Badge variant="outline">Status: {meta.status}</Badge>
                {meta.tags.map((t: string) => (<Badge key={t} variant="secondary">
                    {t}
                  </Badge>))}
                {meta.return_reason && (<span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                    Return reason: {humanize(meta.return_reason)}
                  </span>)}
              </div>
              {segments.map((s, n) => (<div key={n} className={cn("rounded-md border p-3 text-sm", s.role === "agent" && "bg-muted/50")}>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">{s.label}</div>
                  {seg(s)}
                </div>))}
            </div>)}

          {item.source_type === "review" && (<div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-amber-500" aria-label={`${meta.rating} stars`}>
                  {"★".repeat(meta.rating)}
                  <span className="text-muted-foreground/30">{"★".repeat(5 - meta.rating)}</span>
                </span>
                {meta.rating >= 2 && meta.rating <= 4 && (<Badge variant="outline" className="border-amber-300 text-amber-700">
                    Objection mine
                  </Badge>)}
                {meta.verified && <Badge variant="secondary">Verified</Badge>}
                {meta.incentivised && (<Badge variant="outline" className="border-amber-300 text-amber-700" title="The reviewer was given the product or paid. A quote used in an ad must say so.">
                    Given the product
                  </Badge>)}
                <span className="text-xs text-muted-foreground">
                  {meta.product} · {meta.author}
                </span>
              </div>
              {segments.map((s, n) => (<div key={n} className={s.label === "Title" ? "font-semibold" : ""}>
                  {seg(s)}
                </div>))}
            </div>)}

          {item.source_type === "survey" && (<dl className="divide-y rounded-md border text-sm">
              {meta.answers.map((a: any, n: number) => {
                    const s = segments.find((x) => x.label === a.question);
                    return (<div key={n} className="grid grid-cols-[14rem_1fr] gap-3 px-3 py-2">
                    <dt className="text-muted-foreground">{a.question}</dt>
                    <dd>{s ? seg(s) : a.value ?? <span className="text-muted-foreground">no answer</span>}</dd>
                  </div>);
                })}
            </dl>)}

          {item.source_type === "community" && (<div className="space-y-3 text-sm">
              {segments
                    .filter((s) => !s.label.startsWith("Comment"))
                    .map((s, n) => (<div key={n} className={s.label === "Post title" ? "text-base font-semibold" : ""}>
                    {seg(s)}
                  </div>))}
              <div className="space-y-2 border-l-2 pl-3">
                <div className="text-xs font-medium text-muted-foreground">Comments, by upvotes</div>
                {segments
                    .filter((s) => s.label.startsWith("Comment"))
                    .map((s, n) => (<div key={n} className="rounded-md bg-muted/50 p-2">
                      <div className="mb-0.5 text-xs text-muted-foreground">▲ {s.label.replace("Comment · ", "")}</div>
                      {seg(s)}
                    </div>))}
              </div>
            </div>)}

          {!insights.length && (<p className="text-sm text-muted-foreground">
              {item.extraction_status === "done" ? "No insights extracted from this item." : "Not extracted yet."}
            </p>)}
          </>)}
        </div>

        {sel && (<div className="border-t bg-muted/30 p-4 text-sm" data-testid="insight-detail">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <TypePill type={sel.type}/>
              <IntensityDots value={sel.intensity}/>
              {sel.objection_class && <Badge variant="outline">{OBJECTION_LABELS[sel.objection_class]}</Badge>}
              {advanced && <span className="ml-auto font-mono text-xs text-muted-foreground">{sel.id}</span>}
            </div>
            <blockquote className="border-l-2 pl-3 italic">“{sel.quote}”</blockquote>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Beat: {humanize(sel.beat)}</span>
              <span>Persona: {personas.find((p) => p.id === sel.persona_id)?.name ?? "none"}</span>
              {sel.theme_id && (<Link className="text-primary hover:underline" href={`/insights?theme=${sel.theme_id}`}>
                  Theme: {themes.find((t) => t.id === sel.theme_id)?.label ?? sel.theme_id}
                </Link>)}
            </div>
          </div>)}
      </SheetContent>
    </Sheet>);
}
