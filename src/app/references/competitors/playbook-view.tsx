"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ExternalLink, ImageIcon, Loader2, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ADAPTATIONS, type Adaptation, type AdProvider, type SessionView } from "@/lib/competitor-playbook/types";
import { cn } from "@/lib/utils";
const field = "w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const API = "/api/competitor-playbook";
type Pick = {
    id: string;
    mode: Adaptation;
    note: string;
};
export function CompetitorPlaybook({ brandName, brandId, products, connections, live }: {
    brandName: string;
    brandId: string;
    products: {
        id: string;
        name: string;
    }[];
    connections: Record<AdProvider, boolean>;
    live: boolean;
}) {
    const [query, setQuery] = useState("");
    const [website, setWebsite] = useState("");
    const [pageId, setPageId] = useState("");
    const [country, setCountry] = useState("US");
    const [provider, setProvider] = useState<AdProvider>("auto");
    const [session, setSession] = useState<SessionView | null>(null);
    const [advertiser, setAdvertiser] = useState("");
    const [picks, setPicks] = useState<Pick[]>([]);
    const [mode, setMode] = useState<Adaptation>("brand");
    const [productId, setProductId] = useState(products[0]?.id ?? "");
    const [aspect, setAspect] = useState("4:5");
    const [notes, setNotes] = useState("");
    const [sort, setSort] = useState<"longest" | "newest">("longest");
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [result, setResult] = useState<{
        runId: string;
        ads: number;
    } | null>(null);
    const key = `competitor-playbook:${brandId}`;
    async function call(body: unknown | FormData) {
        const response = await fetch(API, body instanceof FormData ? { method: "POST", body } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await response.json();
        if (!data.ok)
            throw new Error(data.error || "The playbook request failed.");
        return data;
    }
    useEffect(() => {
        let active = true;
        const id = sessionStorage.getItem(key);
        if (id)
            void call({ op: "restore", sessionId: id }).then((data) => {
                if (!active)
                    return;
                setSession(data.session);
                const advertisers = new Set<string>(data.session.ads.map((ad: SessionView["ads"][number]) => ad.advertiserId));
                if (advertisers.size === 1)
                    setAdvertiser([...advertisers][0]);
            }).catch(() => { sessionStorage.removeItem(key); });
        return () => { active = false; };
    }, [key]);
    useEffect(() => {
        if (session?.import?.status !== "running" || busy || error)
            return;
        let active = true;
        const timer = setTimeout(() => {
            void call({ op: "poll", sessionId: session.id }).then(data => {
                if (!active)
                    return;
                setSession(data.session);
                const ids = new Set<string>(data.session.ads.map((ad: SessionView["ads"][number]) => ad.advertiserId));
                if (ids.size === 1)
                    setAdvertiser([...ids][0]);
            }).catch(e => { if (active)
                setError(e instanceof Error ? e.message : "The ad search could not be checked. Retry the search status."); });
        }, 4000);
        return () => { active = false; clearTimeout(timer); };
    }, [session, busy, error]);
    async function task(label: string, work: () => Promise<void>) {
        if (busy)
            return;
        setBusy(label);
        setError("");
        try {
            await work();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Playbook request failed.");
        }
        finally {
            setBusy("");
        }
    }
    const scan = () => task("Importing static ads and product context", async () => {
        if (session)
            await call({ op: "close", sessionId: session.id });
        setSession(null);
        setPicks([]);
        setResult(null);
        setAdvertiser("");
        sessionStorage.removeItem(key);
        const data = await call({ op: "scan", input: { query, website, pageId, country, provider } });
        setSession(data.session);
        sessionStorage.setItem(key, data.session.id);
        if (data.importError)
            setError(data.importError);
        const advertisers = new Set<string>(data.session.ads.map((ad: SessionView["ads"][number]) => ad.advertiserId));
        if (advertisers.size === 1)
            setAdvertiser([...advertisers][0]);
    });
    const ads = [...(session?.ads ?? [])].filter((ad) => !advertiser || ad.advertiserId === advertiser).sort((a, b) => {
        if (!a.startedAt)
            return b.startedAt ? 1 : 0;
        if (!b.startedAt)
            return -1;
        return sort === "longest" ? a.startedAt.localeCompare(b.startedAt) : b.startedAt.localeCompare(a.startedAt);
    });
    const advertisers = [...new Map((session?.ads ?? []).map((ad) => [ad.advertiserId, ad.advertiser])).entries()];
    const ready = ads.filter((ad) => ad.hasImage && ad.advertiserId === advertiser);
    const toggle = (id: string) => setPicks((current) => current.some((p) => p.id === id) ? current.filter((p) => p.id !== id) : current.length < 12 ? [...current, { id, mode, note: "" }] : current);
    const update = (id: string, change: Partial<Pick>) => setPicks((current) => current.map((p) => p.id === id ? { ...p, ...change } : p));
    const generated = !!(result || session?.runIds.length);
    const close = () => task("Clearing session", async () => { if (session)
        await call({ op: "close", sessionId: session.id }); setSession(null); setPicks([]); setResult(null); sessionStorage.removeItem(key); });
    return <div className="space-y-8 px-6 py-8" data-testid="competitor-playbook">
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <form className="space-y-5 rounded-2xl border bg-card p-6" onSubmit={(e) => { e.preventDefault(); void scan(); }}>
        <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">01 / Find a competitor</p><h2 className="display mt-2 text-3xl">Start with a name or link</h2><p className="mt-2 text-sm text-muted-foreground">Search static ads, confirm the advertiser, then choose the ideas to build on.</p></div>
        <label className="block space-y-2 text-sm font-medium">Competitor name, website or Ad Library link<input className={field} value={query} onChange={(e) => setQuery(e.target.value)} maxLength={1000} required placeholder="AG1, drinkag1.com, or an advertiser's library link"/></label>
        <label className="block space-y-2 text-sm font-medium">Competitor website <span className="font-normal text-muted-foreground">(optional product context)</span><input className={field} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://drinkag1.com" maxLength={500}/></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Ad source<select className={field} value={provider} onChange={(e) => setProvider(e.target.value as AdProvider)}><option value="auto">Automatic images{connections.auto ? " · connected" : " · connection needed"}</option><option value="apify">Meta Ad Library via Apify{connections.apify ? " · connected" : " · connection needed"}</option><option value="foreplay">Foreplay{connections.foreplay ? " · connected" : " · connection needed"}</option><option value="meta">Meta API · copy and preview links</option></select></label><label className="space-y-2 text-sm font-medium">Country<select className={field} value={country} onChange={(e) => setCountry(e.target.value)}><option value="GB">United Kingdom</option><option value="DE">Germany</option><option value="FR">France</option><option value="US">United States</option><option value="IN">India</option><option value="AU">Australia</option></select></label></div>
        <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">Know the Facebook Page ID?</summary><label className="mt-3 block space-y-2">Numeric Page ID<input className={field} value={pageId} onChange={(e) => setPageId(e.target.value)} inputMode="numeric" pattern="[0-9]*" placeholder="Locks the search to this advertiser"/></label></details>
        <Button disabled={!!busy || !query.trim() || session?.import?.status === "running"} type="submit"><Search className="size-4"/> Build playbook</Button>
      </form>
      <aside className="flex flex-col justify-between rounded-2xl bg-muted/50 p-6"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">From their creative to yours</p><h2 className="display mt-3 text-3xl">A reference, with a direction.</h2><div className="mt-5 space-y-5">{ADAPTATIONS.map((m) => <div key={m.id}><h3 className="text-sm font-semibold">{m.label}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{m.description}</p></div>)}</div></div><p className="mt-8 border-t pt-4 text-xs leading-relaxed text-muted-foreground">Static images only. Imports are temporary for this browser session, with a two-hour expiry. Generation holds references for its job, up to 24 hours. Finished ads are saved in Create.</p></aside>
    </div>
    {busy && <p className="flex items-center gap-2 text-sm text-primary" role="status"><Loader2 className="size-4 animate-spin"/>{busy}…</p>}
    {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">{error}</div>}
    {!live && <p className="text-sm text-muted-foreground">Generation is in preview mode. It creates test plans and placeholder images until live generation is enabled.</p>}
    {session && <>
      {session.import?.status === "running" && <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4" role="status"><Loader2 className="size-4 animate-spin"/><p className="text-sm">Retrieving static ads automatically · {session.import.scanned} source ads checked. You can select images as they arrive.</p>{error && <Button variant="outline" size="sm" onClick={() => setError("")}>Retry search status</Button>}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-muted-foreground">02 / Read the playbook</p><h2 className="display mt-1 text-3xl">{session.input.query}<span className="ml-3 text-base text-muted-foreground">{ads.length} static ads{advertiser ? " for this advertiser" : " imported"}</span></h2></div><Button variant="outline" onClick={() => void close()} disabled={!!busy}><X className="size-4"/> Clear session</Button></div>
      <div className="space-y-2 rounded-xl border bg-card p-4">{[...new Set(session.notices)].map((n) => <p key={n} className="text-sm text-muted-foreground">{n}</p>)}<p className="text-sm">Ranked by visible run dates. Conversions and ROAS are unknown; a long-running ad is a research lead, not a proven winner.</p></div>
      {session.products.length > 0 && <section><h3 className="mb-3 text-sm font-semibold">Products from their website <span className="font-normal text-muted-foreground">· {session.products.length} source records</span></h3><div className="flex gap-3 overflow-x-auto pb-3">{session.products.map((p, index) => <a key={`${p.url}-${index}`} href={p.url} target="_blank" rel="noreferrer" className="w-40 shrink-0 overflow-hidden rounded-xl border bg-card">{p.images.length > 0 ? <img src={`${API}/media?session=${session.id}&product=${index}`} alt={p.name} className="aspect-square w-full object-contain bg-muted" loading="lazy"/> : <div className="flex aspect-square items-center justify-center bg-muted"><ImageIcon className="size-8 text-muted-foreground"/></div>}<p className="p-3 text-xs font-medium">{p.name}</p></a>)}</div></section>}
      {session.ads.length > 0 && <div className="flex flex-wrap items-end gap-4"><label className="min-w-56 space-y-2 text-sm font-medium">Confirm the advertiser<select className={field} value={advertiser} onChange={(e) => { setAdvertiser(e.target.value); setPicks([]); }} disabled={generated || !!busy}><option value="">Choose an advertiser</option>{advertisers.map(([id, name]) => <option key={id} value={id}>{name} · {id || "ID unavailable"}</option>)}</select></label><label className="min-w-44 space-y-2 text-sm font-medium">Show first<select className={field} value={sort} onChange={(e) => setSort(e.target.value as "longest" | "newest")}><option value="longest">Longest running</option><option value="newest">Newest</option></select></label><Button variant="outline" disabled={!!busy || !advertiser || !ready.length || generated} onClick={() => setPicks(ready.slice(0, 5).map((ad) => ({ id: ad.id, mode, note: "" })))}>Select first five</Button><Button variant="ghost" disabled={!!busy || !advertiser || !ready.length || generated} onClick={() => setPicks(ready.slice(0, 12).map((ad) => ({ id: ad.id, mode, note: "" })))}>Select all ready ({Math.min(12, ready.length)})</Button></div>}
      {!session.ads.length && <div className="rounded-xl border border-dashed p-10 text-center"><ImageIcon className="mx-auto size-8 text-muted-foreground"/><h3 className="mt-3 font-semibold">No static ads imported yet</h3><p className="mt-2 text-sm text-muted-foreground">Check the connection, advertiser and country, then scan again. No sample ads are substituted for live results.</p></div>}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{ads.map((ad) => {
                const pick = picks.find((p) => p.id === ad.id);
                return <article key={ad.id} className={cn("overflow-hidden rounded-xl border bg-card", pick && "border-primary ring-1 ring-primary")} data-testid="competitor-ad">
          <div className="relative aspect-[4/5] bg-muted">{ad.hasImage ? <img src={`${API}/media?session=${session.id}&ad=${encodeURIComponent(ad.id)}`} alt={`${ad.advertiser}: ${ad.headline || `static ad ${ad.id}`}`} className="size-full object-contain" loading="lazy"/> : <div className="flex size-full flex-col items-center justify-center gap-3 px-6 text-center"><ImageIcon className="size-10 text-muted-foreground"/><p className="text-sm font-medium">Image unavailable</p><p className="text-xs text-muted-foreground">{session.input.provider === "meta" ? "Meta's direct API supplies preview links only. Choose Automatic images for retrieval." : "The source image could not be retrieved. Retry below."}</p></div>}
            <button aria-label={`Select ad ${ad.id}`} aria-pressed={!!pick} disabled={!!busy || !ad.hasImage || !advertiser || generated || (!pick && picks.length >= 12)} onClick={() => toggle(ad.id)} className={cn("absolute right-3 top-3 flex size-9 items-center justify-center rounded-full border shadow-sm disabled:opacity-40", pick ? "bg-primary text-primary-foreground" : "bg-background")}><Check className={cn("size-4", !pick && "opacity-0")}/></button>
          </div>
          <div className="space-y-3 p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold">{ad.advertiser}</p><p className="text-xs text-muted-foreground">{ad.startedAt ? `Running since ${ad.startedAt.slice(0, 10)}` : "Start date unavailable"} · {ad.id}</p></div><a href={ad.libraryUrl} target="_blank" rel="noreferrer" aria-label={`Open source for ad ${ad.id}`} className="p-1 text-muted-foreground hover:text-primary"><ExternalLink className="size-4"/></a></div>
            {ad.headline && <h3 className="text-sm font-medium">{ad.headline}</h3>}{ad.body && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Read original copy</summary><p className="mt-2 whitespace-pre-line leading-relaxed">{ad.body}</p></details>}
            {!generated && !ad.hasImage && session.input.provider !== "meta" && <Button variant="outline" size="sm" disabled={!!busy} onClick={() => void task("Retrieving static image", async () => { const data = await call({ op: "images", sessionId: session.id, adId: ad.id }); setSession(data.session); })}>Retry image retrieval</Button>}
            {!generated && session.input.provider === "meta" && <label className="inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-xs hover:bg-muted">{ad.hasImage ? "Replace static image" : "Attach static image"}<input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" disabled={!!busy} onChange={(e) => { const file = e.target.files?.[0]; if (!file)
                    return; const form = new FormData(); form.set("sessionId", session.id); form.set("adId", ad.id); form.set("file", file); void task("Attaching static image", async () => { const data = await call(form); setSession(data.session); }); e.target.value = ""; }}/></label>}
            {ad.reading && <div className="rounded-lg bg-muted/60 p-3"><p className="text-xs font-semibold">{ad.reading.format}<span className="ml-2 font-normal text-muted-foreground">{ad.reading.basis === "visual" ? "Visual analysis" : "Copy cues only"}</span></p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ad.reading.adaptation}</p>{ad.reading.basis === "visual" && <details className="mt-2 text-xs"><summary className="cursor-pointer">Hook, offer and layout</summary><p className="mt-2">{ad.reading.hook}</p><p className="mt-2">{ad.reading.offer}</p><p className="mt-2">{ad.reading.layout}</p></details>}</div>}
            {ad.hasImage && !generated && <Button variant="ghost" size="sm" disabled={!!busy} onClick={() => void task("Reading this ad", async () => { const data = await call({ op: "analyse", sessionId: session.id, adId: ad.id }); setSession(data.session); })}>Read creative</Button>}
            {pick && <div className="space-y-2 border-t pt-3"><label className="block space-y-1 text-xs font-medium">Direction for this ad<select className={field} value={pick.mode} onChange={(e) => update(ad.id, { mode: e.target.value as Adaptation })} disabled={!!busy || generated}>{ADAPTATIONS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label><label className="block space-y-1 text-xs font-medium">Anything to change?<input className={field} value={pick.note} onChange={(e) => update(ad.id, { note: e.target.value })} placeholder="An angle, audience or visual detail" maxLength={380} disabled={!!busy || generated}/></label></div>}
          </div></article>;
            })}</div>
      {session.cursor && <div className="flex justify-center gap-3"><Button variant="outline" disabled={!!busy || generated} onClick={() => void task("Importing the next page of static ads", async () => { const data = await call({ op: "more", sessionId: session.id }); setSession(data.session); })}>Load more static ads</Button><Button variant="outline" disabled={!!busy || generated} onClick={() => void task("Importing remaining static ads", async () => { let next = session; for (let page = 0; next.cursor && page < 20; page++) {
            const data = await call({ op: "more", sessionId: session.id });
            next = data.session;
            setSession(next);
        } if (next.cursor)
            setError("Import paused after 20 pages. More provider results remain; continue importing to view them."); })}>Import remaining</Button></div>}
      {picks.length > 0 && !generated && <section className="sticky z-20 space-y-4 rounded-xl border border-primary/30 bg-background/95 p-5 shadow-lg backdrop-blur" style={{ bottom: "calc(var(--run-bar, 0px) + 1rem)" }} data-testid="competitor-build-tray"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{picks.length} ads selected for {brandName}</h3><div className="flex items-center gap-2"><select aria-label="Direction for all selected ads" className={field} value={mode} onChange={(e) => setMode(e.target.value as Adaptation)} disabled={!!busy}>{ADAPTATIONS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select><Button variant="outline" size="sm" onClick={() => setPicks((current) => current.map((p) => ({ ...p, mode })))} disabled={!!busy}>Apply to all</Button></div></div><div className="grid gap-3 sm:grid-cols-[1fr_8rem_2fr]"><label className="space-y-1 text-xs font-medium">Your product<select className={field} value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!!busy}><option value="" disabled>Choose your product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="space-y-1 text-xs font-medium">Image shape<select className={field} value={aspect} onChange={(e) => setAspect(e.target.value)} disabled={!!busy}><option>4:5</option><option>1:1</option><option>9:16</option></select></label><label className="space-y-1 text-xs font-medium">Direction for the whole set<input className={field} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1200} placeholder="What should these ads do for your brand?" disabled={!!busy}/></label></div><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">One new image per reference. Your own photos, fresh copy and checked claims. {live ? "Uses your configured generation budget." : "Preview mode creates placeholders."}</p><Button disabled={!!busy || !productId || !advertiser || session.import?.status === "running"} onClick={() => void task("Starting your ad set", async () => { const data = await call({ op: "build", sessionId: session.id, build: { productId, advertiserId: advertiser, picks, aspect, notes } }); setResult({ runId: data.runId, ads: data.ads }); })}><Sparkles className="size-4"/>{live ? "Generate" : "Preview"} {picks.length} ads<ArrowRight className="size-4"/></Button></div></section>}
      {generated && <div className="rounded-xl border border-primary/30 bg-primary/5 p-6" role="status"><h3 className="font-semibold">Your ad set has started</h3><p className="mt-2 text-sm text-muted-foreground">Track generation and review the finished ads in Create.</p><Link href={`/studio/${result?.runId ?? session.runIds[0]}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Open {result?.ads ?? "your"} ads<ArrowRight className="size-4"/></Link></div>}
    </>}
  </div>;
}
