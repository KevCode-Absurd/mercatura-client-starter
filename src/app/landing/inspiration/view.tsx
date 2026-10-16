"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { InspirationBrand } from "@/lib/landing/inspiration";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
export function InspirationView({ brands }: {
    brands: InspirationBrand[];
}) {
    const [query, setQuery] = useState(""), [niche, setNiche] = useState("all"), [captured, setCaptured] = useState(false), [device, setDevice] = useState<"desktop" | "mobile">("desktop");
    const [selected, setSelected] = useState<InspirationBrand | null>(null);
    const [limit, setLimit] = useState(24);
    const opener = useRef<HTMLButtonElement | null>(null);
    const inspect = (brand: InspirationBrand, button: HTMLButtonElement) => { opener.current = button; setSelected(brand); };
    const reset = () => { setQuery(""); setNiche("all"); setCaptured(false); setLimit(24); };
    const niches = [...new Set(brands.map(b => b.niche))].sort();
    const shown = useMemo(() => brands.filter(b => (niche === "all" || b.niche === niche) && (!captured || b.pages.some(p => p.status === "captured")) && `${b.name} ${b.niche} ${b.url}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(b.pages.some(p => p.status === "captured")) - Number(a.pages.some(p => p.status === "captured"))), [brands, query, niche, captured]);
    const pageCount = brands.reduce((n, b) => n + b.pages.filter(p => p.status === "captured").length, 0);
    const capturedBrands = brands.filter(b => b.pages.some(p => p.status === "captured")).length;
    return <Dialog open={!!selected} onOpenChange={open => { if (!open)
        setSelected(null); }}><div className="mx-auto max-w-[1500px] space-y-7 p-6 lg:p-10">
    <header className="rounded-3xl border bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 p-6 text-white sm:p-8">
      <Link href="/landing/studio" className="text-xs uppercase tracking-[.2em] text-emerald-200">CRO studio / Reference library</Link>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Good pages are worth studying.</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">Explore real storefronts by category. Inspect their product stories, section rhythms and purchase experience, then adapt the structure using your own Brand Brain.</p>
      <div className="mt-6 grid grid-cols-3 gap-4 text-xs sm:flex sm:flex-wrap sm:gap-7 sm:text-sm"><span><b className="mb-1 block text-2xl sm:mr-2 sm:inline">{capturedBrands}</b>captured brands</span><span><b className="mb-1 block text-2xl sm:mr-2 sm:inline">{pageCount}</b>captured pages</span><span><b className="mb-1 block text-2xl sm:mr-2 sm:inline">{niches.length}</b>categories</span></div>
    </header>
    <div className="flex flex-wrap items-center gap-3">
      <input aria-label="Search reference brands" placeholder="Search brands, category, or domain" value={query} onChange={e => { setQuery(e.target.value); setLimit(24); }} className="min-w-0 basis-64 flex-1 rounded-xl border bg-background px-4 py-3"/>
      <select aria-label="Category" value={niche} onChange={e => { setNiche(e.target.value); setLimit(24); }} className="max-w-full rounded-xl border bg-background px-4 py-3"><option value="all">Every category</option>{niches.map(n => <option key={n}>{n}</option>)}</select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={captured} onChange={e => { setCaptured(e.target.checked); setLimit(24); }}/>Captured only</label>
      <button className="rounded-xl border px-4 py-3 text-sm" onClick={() => setDevice(device === "desktop" ? "mobile" : "desktop")}>{device === "desktop" ? "Desktop" : "Mobile"} views</button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground" role="status">Showing {Math.min(limit, shown.length)} of {shown.length} matching brands · {brands.length} in the catalog</p>{(query || niche !== "all" || captured) && <button onClick={reset} className="text-sm font-semibold text-primary underline">Clear filters</button>}</div>
    <p className="text-xs text-muted-foreground">Reference selection is inspiration, not evidence of conversion performance. Uncaptured and blocked pages are labelled.</p>
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {shown.slice(0, limit).map(b => {
            const page = b.pages.find(p => p.status === "captured"), shot = page?.[device];
            return <article key={b.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <button className="relative block h-64 w-full overflow-hidden bg-gradient-to-br from-secondary to-muted text-left" onClick={e => inspect(b, e.currentTarget)} aria-label={`Inspect ${b.name}`}>
          {shot ? <img src={`/api/assets/${shot}?w=${device === "mobile" ? 320 : 640}`} alt={`${b.name} ${device} screenshot`} loading="lazy" decoding="async" className={`object-cover object-top ${device === "mobile" ? "mx-auto w-44" : "w-full"}`}/> : <div className="flex h-full flex-col items-center justify-center gap-3"><span className="text-5xl font-semibold opacity-30">{b.name.slice(0, 2)}</span><span className="rounded-full border bg-background/70 px-3 py-1 text-xs">{b.attemptedAt ? "Capture unavailable" : "Capture pending"}</span></div>}
        </button>
        <div className="p-5"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{b.niche}</p><h2 className="mt-2 text-xl font-semibold">{b.name}</h2><p className="mt-1 truncate text-sm text-muted-foreground">{new URL(b.url).hostname}</p><div className="mt-5 flex items-center justify-between gap-2 text-sm"><button onClick={e => inspect(b, e.currentTarget)} className="font-medium">Explore pages →</button><Link href={`/landing/studio?mode=reference&url=${encodeURIComponent(page?.url ?? b.url)}${page?.evidenceId ? `&evidence=${page.evidenceId}` : ""}`} className="rounded-lg bg-primary px-3 py-2 text-primary-foreground">Use reference</Link></div></div>
      </article>;
        })}
    </div>
    {shown.length > limit && <div className="text-center"><button onClick={() => setLimit(n => n + 24)} className="rounded-xl border bg-card px-6 py-3 font-semibold text-primary hover:bg-accent">Show more brands</button></div>}
    {!shown.length && <p className="rounded-2xl border p-10 text-center text-muted-foreground">No reference brands match these filters.</p>}
    {selected && <DialogContent showCloseButton={false} aria-describedby={undefined} aria-label={`${selected.name} reference pages`} onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }} className="max-h-[90dvh] overflow-y-auto rounded-2xl p-4 sm:max-w-6xl sm:p-6">
      <div className="min-w-0"><div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-xl border bg-background p-4"><div><DialogTitle className="text-xl font-semibold">{selected.name} reference pages</DialogTitle><a href={selected.url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground">Visit original storefront ↗</a></div><DialogClose asChild><button className="rounded-lg border px-4 py-2">Close</button></DialogClose></div>
        {selected.error && <p className="my-5 rounded-xl border p-4">Capture failed: {selected.error}</p>}
        {!selected.pages.length && <p className="my-8">Screenshots have not been captured yet. You can use the live URL in CRO Studio.</p>}
        {selected.pages.map(p => <section key={p.kind} className="my-6 rounded-xl border p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-semibold capitalize">{p.kind === "pdp" ? "Product page" : p.kind}</h3><a href={p.url} target="_blank" rel="noreferrer" className="break-all text-xs text-muted-foreground">{p.url}</a></div>{p.status === "captured" && <Link className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" href={`/landing/studio?mode=reference&url=${encodeURIComponent(p.url)}&evidence=${p.evidenceId}`}>Adapt this page</Link>}</div>{p.status === "failed" ? <p className="text-sm">{p.error}</p> : <><p className="mb-3 text-xs text-muted-foreground">Captured {p.capturedAt ? new Date(p.capturedAt).toLocaleDateString() : ""}. {p.warnings?.join(" ")}</p><div className="grid items-start gap-4 md:grid-cols-[3fr_1fr]"><img src={`/api/assets/${p.desktop}`} alt="Full desktop page" loading="lazy" decoding="async" className="w-full rounded-lg border"/><img src={`/api/assets/${p.mobile}`} alt="Full mobile page" loading="lazy" decoding="async" className="w-full rounded-lg border"/></div></>}</section>)}
      </div>
    </DialogContent>}
  </div></Dialog>;
}
