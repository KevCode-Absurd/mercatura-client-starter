"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Download, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { ShowcaseExample } from "@/lib/sprint/showcase";
const image = (id: string, thumb = false) => `/examples/static-ads/${id}${thumb ? "-thumb" : ""}.webp`;
type Filter = "style" | "format" | "cast" | "copy";
const filters: {
    key: Filter;
    label: string;
    all: string;
}[] = [
    { key: "style", label: "Visual style", all: "All styles" },
    { key: "format", label: "Ad format", all: "All formats" },
    { key: "cast", label: "People & characters", all: "All subjects" },
    { key: "copy", label: "Text on image", all: "With or without copy" },
];
export function ExampleGallery({ examples, reviewed }: {
    examples: ShowcaseExample[];
    reviewed: number;
}) {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Record<Filter, string>>({ style: "", format: "", cast: "", copy: "" });
    const [openId, setOpenId] = useState<string | null>(null);
    const trigger = useRef<HTMLButtonElement | null>(null);
    const choices = useMemo(() => Object.fromEntries(filters.map(({ key }) => [key,
        [...new Set(examples.map(e => e[key]))].sort().map(value => ({ value, count: examples.filter(e => e[key] === value).length })),
    ])) as Record<Filter, {
        value: string;
        count: number;
    }[]>, [examples]);
    const visible = useMemo(() => examples.filter(e => filters.every(({ key }) => !selected[key] || selected[key] === e[key]) &&
        `${e.title} ${e.style} ${e.format} ${e.cast} ${e.brand} ${e.collection}`.toLowerCase().includes(query.trim().toLowerCase())), [examples, selected, query]);
    const index = visible.findIndex(e => e.id === openId);
    const current = visible[index];
    const active = !!query || Object.values(selected).some(Boolean);
    function reset() { setQuery(""); setSelected({ style: "", format: "", cast: "", copy: "" }); }
    useEffect(() => {
        if (!current)
            return;
        function keydown(event: KeyboardEvent) {
            if (event.key === "ArrowRight" && index < visible.length - 1) {
                event.preventDefault();
                setOpenId(visible[index + 1].id);
            }
            if (event.key === "ArrowLeft" && index > 0) {
                event.preventDefault();
                setOpenId(visible[index - 1].id);
            }
        }
        window.addEventListener("keydown", keydown);
        return () => window.removeEventListener("keydown", keydown);
    }, [current, index, visible]);
    return (<div className="space-y-6 px-6 py-6">
      <section className="grid gap-4 rounded-2xl border bg-muted/40 p-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Selected for craft and variety</p>
          <div className="mt-3 grid grid-cols-3 gap-4 md:flex md:gap-8">
            {[[examples.length, "selected examples"], [choices.style.length, "visual styles"], [choices.format.length, "ad formats"]].map(([n, label]) => (<div key={label}><span className="display text-3xl md:text-4xl">{n}</span><span className="block text-xs text-muted-foreground md:ml-2 md:inline md:text-sm">{label}</span></div>))}
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Chosen from {reviewed}Upload your own evidence to populate this view.</p>
        </div>
        <Link href="/studio/sprint#start-sprint" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">Create your own 100 <ArrowRight className="size-4"/></Link>
      </section>

      <details className="rounded-xl border px-5 py-4" data-testid="example-distribution">
        <summary className="cursor-pointer text-sm font-medium">See the style distribution</summary>
        <div className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {choices.style.map(({ value, count }) => <button type="button" key={value} onClick={() => { reset(); setSelected(s => ({ ...s, style: value })); }} className="flex justify-between gap-4 rounded px-2 py-1 text-left hover:bg-muted"><span>{value}</span><span className="tabular-nums text-muted-foreground">{count}</span></button>)}
        </div>
      </details>

      <section aria-label="Filter examples" className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <label className="col-span-2 block text-xs font-medium xl:col-span-1">Search examples
          <span className="relative mt-1.5 block"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Paper, skeleton, picnic…" className="h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-sm"/></span>
        </label>
        {filters.map(({ key, label, all }) => <label key={key} className="block text-xs font-medium">{label}
          <select aria-label={label} value={selected[key]} onChange={e => setSelected(s => ({ ...s, [key]: e.target.value }))} className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 text-sm">
            <option value="">{all}</option>{choices[key].map(({ value, count }) => <option value={value} key={value}>{value} ({count})</option>)}
          </select>
        </label>)}
      </section>
      <div className="flex items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted-foreground" data-testid="example-count">{visible.length} of {examples.length} examples</p>
        {active && <button type="button" onClick={reset} className="min-h-10 text-sm font-medium underline underline-offset-4">Clear filters</button>}
      </div>
      {visible.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" data-testid="example-grid">
        {visible.map(e => <button key={e.id} type="button" onClick={event => { trigger.current = event.currentTarget; setOpenId(e.id); }} aria-label={`View ${e.title}`} className="group overflow-hidden rounded-xl border bg-card text-left transition hover:border-primary/60 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" data-testid="example-card">
          <div className="aspect-[4/5] overflow-hidden bg-muted"><img src={image(e.id, true)} alt={`${e.style}: ${e.title}`} loading="lazy" decoding="async" width={400} height={500} className="size-full object-contain"/></div>
          <div className="space-y-1.5 p-3"><p className="text-[11px] font-medium text-muted-foreground">{e.style}</p><h2 className="line-clamp-2 text-sm font-semibold leading-snug">{e.title}</h2><p className="text-xs text-muted-foreground">{e.format}</p></div>
        </button>)}
      </div> : <div className="rounded-xl border border-dashed px-6 py-16 text-center"><p className="font-medium">No examples match these filters.</p><button type="button" onClick={reset} className="mt-3 min-h-11 text-sm underline">Show all 100 examples</button></div>}

      <p className="max-w-3xl pb-12 text-sm leading-relaxed text-muted-foreground">These are creative examples, not performance rankings. Your sprint uses your own brand and starts with text off. Add and approve copy separately. Some earlier examples include copy and offers from their original drafts.</p>

      <Dialog open={!!current} onOpenChange={open => { if (!open)
        setOpenId(null); }}>
        <DialogContent className="max-h-[94dvh] overflow-y-auto p-0 sm:max-w-5xl" onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}>
          {current && <div className="grid md:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex items-center justify-center bg-muted p-3 max-md:pt-12"><img src={image(current.id)} alt={`${current.style}: ${current.title}`} className="max-h-[75dvh] w-full object-contain max-md:max-h-[48dvh]" width={1200} height={1500}/></div>
            <div className="flex flex-col p-6 md:pt-12">
              <p className="text-xs text-muted-foreground">Example {examples.findIndex(e => e.id === current.id) + 1} · {current.brand}</p>
              <DialogTitle className="mt-2 text-xl leading-snug">{current.title}</DialogTitle>
              <DialogDescription className="mt-2">{current.collection}. Selected for visual quality and a distinct place in the collection.</DialogDescription>
              <dl className="my-6 space-y-4 text-sm">{filters.map(({ key, label }) => <div key={key}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{current[key]}</dd></div>)}</dl>
              <a href={image(current.id)} download={`${current.id}.webp`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium"><Download className="size-4"/> Download example</a>
              <div className="mt-6 flex items-center justify-between gap-2 border-t pt-4">
                <button type="button" aria-label="Previous example" disabled={index <= 0} onClick={() => setOpenId(visible[index - 1].id)} className="flex size-11 items-center justify-center rounded-lg border disabled:opacity-30"><ArrowLeft className="size-4"/></button>
                <span className="text-xs tabular-nums text-muted-foreground">{index + 1} / {visible.length}</span>
                <button type="button" aria-label="Next example" disabled={index === visible.length - 1} onClick={() => setOpenId(visible[index + 1].id)} className="flex size-11 items-center justify-center rounded-lg border disabled:opacity-30"><ArrowRight className="size-4"/></button>
              </div>
            </div>
          </div>}
        </DialogContent>
      </Dialog>
    </div>);
}
