"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DiscoveryRun, DiscoveredCreator, DiscoveryOptions } from "@/lib/creator-discovery/types";
import { generateCreatorsAction, controlCreatorsAction, saveDiscoveredCreatorAction } from "./actions";
type Connection = {
    available: boolean;
    models: {
        id: string;
        label: string;
        available: boolean;
    }[];
};
type Tracked = {
    handle: string;
    platform?: string;
    profile_url?: string;
};
const selectClass = "h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm";
const NONE = "__none";
const labelClass = "grid min-w-0 gap-2 text-sm font-medium";
const busy = (run: DiscoveryRun) => run.status === "queued" || run.status === "running";
const isSaved = (c: DiscoveredCreator, tracked: Tracked[]) => tracked.some(t => t.profile_url === c.profile_url || (t.platform === c.platform && t.handle.toLowerCase() === c.handle.toLowerCase()));
export function CreatorsView({ brandName, market, products, personas, connection, runs, tracked }: {
    brandName: string;
    market: string;
    products: {
        id: string;
        name: string;
    }[];
    personas: {
        id: string;
        name: string;
    }[];
    connection: Connection;
    runs: DiscoveryRun[];
    tracked: Tracked[];
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [error, setError] = useState("");
    const [selected, setSelected] = useState(runs[0]?.id ?? "");
    const [options, setOptions] = useState<DiscoveryOptions>({ count: 20, platform: "all", market, productId: null, personaId: null, reviewRecent: false,
        model: connection.models.find(m => m.available)?.id ?? connection.models[0]?.id ?? "" });
    const [saved, setSaved] = useState<string[]>([]);
    const run = runs.find(r => r.id === selected) ?? runs[0];
    const working = runs.some(busy);
    useEffect(() => {
        if (!working)
            return;
        const timer = setInterval(() => router.refresh(), 4000);
        return () => clearInterval(timer);
    }, [working, router]);
    const act = (action: () => Promise<{
        ok: true;
        id?: string;
    } | {
        ok: false;
        error: string;
    }>, after?: (id?: string) => void) => {
        setError("");
        start(async () => { const result = await action(); if (!result.ok)
            return setError(result.error); after?.(result.id); router.refresh(); });
    };
    const disabled = pending || working;
    return <div className="space-y-8 px-6 py-6">
    <form className="space-y-5 rounded-xl border bg-card p-5" onSubmit={event => { event.preventDefault(); act(() => generateCreatorsAction(options), id => id && setSelected(id)); }} data-testid="creator-search-form">
      <div><h2 className="display text-2xl">Who should create for {brandName}?</h2><p className="mt-1 text-sm text-muted-foreground">We use your products, buyer profiles, positioning and voice to research public creators.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelClass}>Number of creators<Input aria-label="Number of creators" type="number" min={5} max={30} required value={options.count} disabled={disabled} onChange={e => setOptions({ ...options, count: Number(e.target.value) })}/></label>
        <label className={labelClass}>Platform<Select disabled={disabled} value={options.platform} onValueChange={v => setOptions({ ...options, platform: v as DiscoveryOptions["platform"] })}><SelectTrigger className={selectClass} aria-label="Platform"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All platforms</SelectItem><SelectItem value="instagram">Instagram</SelectItem><SelectItem value="tiktok">TikTok</SelectItem><SelectItem value="youtube">YouTube</SelectItem></SelectContent></Select></label>
        <label className={labelClass}>Target market<Input required maxLength={80} value={options.market} disabled={disabled} onChange={e => setOptions({ ...options, market: e.target.value })}/></label>
        <label className={labelClass}>Product<Select disabled={disabled} value={options.productId ?? NONE} onValueChange={v => setOptions({ ...options, productId: v === NONE ? null : v })}><SelectTrigger className={selectClass} aria-label="Product"><SelectValue placeholder="All brand products"/></SelectTrigger><SelectContent><SelectItem value={NONE}>All brand products</SelectItem>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></label>
        <label className={labelClass}>Buyer profile<Select disabled={disabled} value={options.personaId ?? NONE} onValueChange={v => setOptions({ ...options, personaId: v === NONE ? null : v })}><SelectTrigger className={selectClass} aria-label="Buyer profile"><SelectValue placeholder="All brand buyers"/></SelectTrigger><SelectContent><SelectItem value={NONE}>All brand buyers</SelectItem>{personas.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></label>
        <label className={labelClass}>Research provider<Select disabled={disabled} value={options.model} onValueChange={v => setOptions({ ...options, model: v })}><SelectTrigger className={selectClass} aria-label="Research provider"><SelectValue /></SelectTrigger><SelectContent>{connection.models.map(m => <SelectItem key={m.id} value={m.id} disabled={!m.available}>{m.label}{!m.available ? " · not connected" : ""}</SelectItem>)}</SelectContent></Select></label>
      </div>
      <label className="flex items-start gap-3 text-sm"><input className="mt-1 size-4" type="checkbox" disabled={disabled} checked={options.reviewRecent} onChange={e => setOptions({ ...options, reviewRecent: e.target.checked })}/><span><strong className="block">Review up to 3 recent public posts per creator</strong><span className="text-muted-foreground">Adds deeper research of accessible captions, descriptions or transcripts from the past 90 days. Search may miss the latest posts; video visuals are not reviewed.</span></span></label>
      <div className="flex flex-wrap items-center gap-4"><Button type="submit" disabled={disabled || !connection.available} data-testid="generate-creators">{pending ? "Starting…" : "Generate creator shortlist"}</Button><p className="max-w-xl text-xs text-muted-foreground">Paid web research uses your configured spend limit. Post review adds research for each creator. Saving to the tracker is free.</p></div>
      {!connection.available && <p className="text-sm" role="status">Creator research is not connected for this account. Connect web research in <Link href="/settings" className="underline">Settings</Link> to generate a shortlist. Saved results remain available.</p>}
      {working && <p className="text-sm" role="status">A search is running for this brand. Its results update below.</p>}
    </form>
    {error && <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive" role="alert">{error}</p>}
    {!run ? <div className="rounded-xl border border-dashed p-8 text-center" data-testid="creator-search-empty"><h2 className="display text-2xl">Your next collaborators start here</h2><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Generate a shortlist to see your five strongest matches, the rest of the ranked list and a collaboration idea for each. Review their profiles before reaching out.</p></div> : <section className="space-y-5" data-testid="creator-search-results">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="display text-2xl">Your creator shortlist</h2><p className="mt-1 text-sm text-muted-foreground">{run.creators.length} of {run.options.count} requested · {run.options.market} · {run.options.platform === "all" ? "All platforms" : run.options.platform}</p></div>
        <label className={labelClass}>Search history<Select value={run.id} onValueChange={setSelected}><SelectTrigger className={`${selectClass} max-w-80`} aria-label="Search history"><SelectValue /></SelectTrigger><SelectContent>{runs.map(r => <SelectItem key={r.id} value={r.id}>{new Date(r.created_at).toLocaleString()} · {r.creators.length} creators · {r.status}</SelectItem>)}</SelectContent></Select></label>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-4" role="status" data-testid="creator-search-status">
        <div className="min-w-0 flex-1"><p className="text-sm font-medium">{run.progress}</p><p className="mt-1 text-xs text-muted-foreground">{run.status} · Research cost ${run.cost_usd.toFixed(3)} · Checked {new Date(run.updated_at).toLocaleString()}</p></div>
        {busy(run) && <><Button variant="outline" size="sm" disabled={pending} onClick={() => act(() => controlCreatorsAction(run.id, "pause"))}>Pause</Button><Button variant="outline" size="sm" disabled={pending} onClick={() => act(() => controlCreatorsAction(run.id, "stop"))}>Stop</Button></>}
        {["paused", "failed"].includes(run.status) && <Button variant="outline" size="sm" disabled={pending || working || !connection.available} onClick={() => act(() => controlCreatorsAction(run.id, "resume"))}>Resume research</Button>}
      </div>
      <details className="rounded-lg border p-4 text-sm"><summary className="cursor-pointer font-medium">How these matches were ranked</summary><div className="mt-3 space-y-2 text-muted-foreground"><p>Editorial relevance: product fit 35%, topical buyer relevance 25%, content format fit 25% and evidenced market fit 15%. Unknown market evidence earns no market points. This is not a sales forecast or a measurement of audience demographics.</p><p>Brand snapshot: {run.criteria.category}. {run.criteria.positioning}</p><p>Products: {run.criteria.products.map(p => p.name).join(", ")}. Buyers: {run.criteria.buyers.map(p => p.name).join(", ") || "Not specified"}.</p><p>Research uses public indexed sources. Follower counts, rates, contact details and audience demographics need separate verification. A list may contain fewer creators when evidence is unavailable.</p></div></details>
      {run.warnings.length > 0 && <details className="rounded-lg border p-4 text-sm" open><summary className="cursor-pointer font-medium">Research notes ({run.warnings.length})</summary><ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">{run.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details>}
      {run.creators.length > 0 && <>
        <h3 className="display text-xl">Top {Math.min(5, run.creators.length)} matches</h3>
        <div className="grid gap-4 lg:grid-cols-2">{run.creators.slice(0, 5).map((creator, i) => <CreatorCard key={creator.id} creator={creator} rank={i + 1} saved={isSaved(creator, tracked) || saved.includes(creator.id)} disabled={pending} save={() => act(() => saveDiscoveredCreatorAction(run.id, creator.id), () => setSaved(was => [...was, creator.id]))}/>)}</div>
        {run.creators.length > 5 && <><h3 className="display text-xl">More relevant creators</h3><div className="grid gap-4 lg:grid-cols-2">{run.creators.slice(5).map((creator, i) => <CreatorCard key={creator.id} creator={creator} rank={i + 6} saved={isSaved(creator, tracked) || saved.includes(creator.id)} disabled={pending} save={() => act(() => saveDiscoveredCreatorAction(run.id, creator.id), () => setSaved(was => [...was, creator.id]))}/>)}</div></>}
      </>}
      {run.search_suggestions.length > 0 && <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-medium">Google Search suggestions</summary><div className="mt-3 grid gap-3">{run.search_suggestions.map((html, i) => <iframe key={i} title={`Google Search suggestions ${i + 1}`} srcDoc={html} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" className="h-44 w-full rounded border bg-white"/>)}</div></details>}
    </section>}
  </div>;
}
function CreatorCard({ creator: c, rank, saved, disabled, save }: {
    creator: DiscoveredCreator;
    rank: number;
    saved: boolean;
    disabled: boolean;
    save: () => void;
}) {
    const review = { not_requested: "Profile evidence", pending: "Post review pending", unavailable: "Posts unavailable", partial: `${c.posts.length}/3 posts reviewed`, three_posts: "3/3 posts reviewed" }[c.review];
    return <article className="min-w-0 space-y-4 rounded-xl border bg-card p-5" data-testid="discovered-creator">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs uppercase tracking-wider text-muted-foreground">#{rank} · {c.platform}</p><h4 className="mt-1 text-lg font-semibold">{c.name}</h4><a className="break-all text-sm underline" href={c.profile_url} target="_blank" rel="noopener noreferrer">{c.handle}</a></div><span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs">Fit {c.score}/100</span></div>
    <p className="text-sm">{c.content}</p>
    <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">{c.fit.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>
    <div className="rounded-md bg-muted/50 p-3 text-sm"><p className="font-medium">Collaboration idea</p><p className="mt-1">{c.collab_angle}</p></div>
    <p className="text-xs text-muted-foreground">Market evidence: {c.market_evidence || "Unknown; verify creator and audience location"}. Audience demographics and rates: unknown.</p>
    <details className="text-sm" data-testid="creator-evidence"><summary className="cursor-pointer font-medium">{review} · Sources and limitations</summary><div className="mt-3 space-y-3">
      <ul className="space-y-2">{c.sources.map((s, i) => <li key={s.url}><a className="break-words text-primary underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.title || `Source ${i + 1}`}</a></li>)}</ul>
      {c.review_note && <p className="text-xs text-muted-foreground">{c.review_note}</p>}
      {c.posts.map(p => <div key={p.url} className="rounded border p-3"><a className="text-primary underline" href={p.url} target="_blank" rel="noopener noreferrer">Public post · {p.published_at}</a><p className="mt-1">{p.summary}</p><p className="mt-1 text-xs text-muted-foreground">Evidence: caption, description or transcript; visuals unreviewed</p>{p.sources.map(s => <a key={s.url} className="mt-1 block break-words text-xs underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>)}</div>)}
      {c.cautions.length > 0 && <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">{c.cautions.map((s, i) => <li key={i}>{s}</li>)}</ul>}
    </div></details>
    <Button variant={saved ? "outline" : "default"} size="sm" disabled={disabled || saved} onClick={save}>{saved ? "Saved to tracker" : "Save to creator tracker"}</Button>
  </article>;
}
