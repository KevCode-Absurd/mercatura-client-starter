"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { ArtifactSummary } from "@/lib/production-ops/store";
import type { SeoBatch, SeoBatchItem } from "@/lib/production-ops/seo-batch";
import type { Campaign } from "@/lib/production-ops/campaigns";
import type { productionMetrics } from "@/lib/production-ops/metrics";
import type { laneStatus } from "@/lib/production-ops/lanes";
import { queueArticleBatchAction, cancelArticleBatchAction, resumeArticleBatchAction, recheckArticleAction, createCampaignAction, refreshCampaignAction, acceptCampaignTaskAction, applyCompoundCorrectionAction, undoCompoundCorrectionAction, reviewTimerAction, loadRetainedArticleAction } from "./actions";
type Saved<T> = {
    revision: number;
    value: T;
    updated: number;
};
type Task = {
    kind: "studio" | "landing" | "seo_batch";
    refId: string;
    title: string;
    productId: string;
};
export type OperationItemSummary = Saved<Pick<SeoBatchItem, "id" | "status" | "artifactId" | "error"> & {
    input: {
        title: string;
    };
    response?: {
        callId: string;
        costUsd: number;
    };
}>;
type Props = {
    budget: {
        textRemaining: number;
        textHeld: number;
        imagesRemaining: number;
        videoRemaining: number;
    };
    brandId: string;
    products: {
        id: string;
        name: string;
    }[];
    metrics: ReturnType<typeof productionMetrics>;
    lanes: ReturnType<typeof laneStatus>;
    cache: {
        hits: number;
        misses: number;
        entries: number;
    };
    batches: ArtifactSummary[];
    campaigns: ArtifactSummary[];
    selectedBatch: Saved<SeoBatch> | null;
    items: OperationItemSummary[];
    campaign: (Saved<Campaign> & {
        links: Record<string, string>;
    }) | null;
    tasks: Task[];
    evidence: {
        id: string;
        text: string;
        productIds: string[];
    }[];
    journals: {
        id: string;
        state: string;
        error: string | null;
        created: number;
    }[];
};
export function OperationsWorkbench(p: Props) {
    const [retained, setRetained] = useState<Record<string, {
        revision: number;
        data: unknown;
    }>>({});
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => setHydrated(true), []);
    const router = useRouter(), [pending, start] = useTransition(), [message, setMessage] = useState(''), [batchTitle, setBatchTitle] = useState('Article batch'), [briefs, setBriefs] = useState('[]'), [mode, setMode] = useState<'ai' | 'assembly'>('assembly'), [reviewed, setReviewed] = useState(false), [title, setTitle] = useState('Campaign'), [product, setProduct] = useState(p.products[0]?.id ?? ''), [selected, setSelected] = useState<number[]>([]), [dependencies, setDependencies] = useState<Record<number, number | ''>>({}), [sources, setSources] = useState<string[]>([]), [authorize, setAuthorize] = useState(false), [campaignReviewed, setCampaignReviewed] = useState(false), [corrections, setCorrections] = useState('[]'), [correctionReviewed, setCorrectionReviewed] = useState(false), [taskReviews, setTaskReviews] = useState<string[]>([]);
    useEffect(() => { const timer = setInterval(() => { if (!document.hidden && !pending && !Object.values(expanded).some(Boolean))
        router.refresh(); }, 5000); return () => clearInterval(timer); }, [router, pending, expanded]);
    function act<T>(fn: () => Promise<{
        ok: true;
        value: T;
    } | {
        ok: false;
        error: string;
    }>, success: string, href?: (value: T) => string) { setMessage(''); start(async () => { try {
        const r = await fn();
        if (!r.ok) {
            setMessage(r.error);
            return;
        }
        setMessage(success);
        if (href) {
            setExpanded({});
            router.push(href(r.value));
        }
        router.refresh();
    }
    catch {
        setMessage('The request did not complete. Your entries remain here; inspect the saved state before retrying.');
    } }); }
    const toggle = (list: string[], id: string) => list.includes(id) ? list.filter(x => x !== id) : [...list, id];
    return <fieldset disabled={!hydrated || pending} inert={!hydrated} aria-label="Production operations workbench" className="min-w-0 space-y-6"><div role="status" className="text-sm" aria-live="polite">{message}</div><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Observed production metrics">{[[p.metrics.acceptedDistinctOutputs, 'Accepted distinct outputs'], [p.metrics.acceptedPerHour === null ? 'Unmeasured' : p.metrics.acceptedPerHour.toFixed(2), 'Accepted outputs per measured hour'], [p.metrics.costPerAccepted === null ? 'Undefined' : `$${p.metrics.costPerAccepted.toFixed(3)}`, 'All-attempt cost per accepted output'], [`$${p.metrics.attributableCostUsd.toFixed(3)}`, 'Recorded attempt cost']].map(([value, label]) => <div className="rounded-lg border p-4" key={label}><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</section>
 <p className="rounded-lg border p-4 text-sm">Remaining shared authorization: text {p.budget.textRemaining.toFixed(3)} USD ({p.budget.textHeld.toFixed(3)} held in flight), {p.budget.imagesRemaining} images, video {p.budget.videoRemaining.toFixed(2)} USD. These are the existing app limits; this workspace does not raise them.</p><details className="rounded-lg border p-4"><summary>Resource limits, measured stages and context reuse</summary><p className="mt-2 text-xs text-muted-foreground">Stage totals may overlap. Human review is measured only through the explicit timer; no speed multiplier is assumed.</p><div className="mt-3 grid gap-3 sm:grid-cols-4">{Object.entries(p.lanes).map(([name, lane]) => <p key={name}>{name}: {lane.active}/{lane.limit} active · {lane.waiting} waiting</p>)}</div><p className="mt-3 text-sm">Context cache: {p.cache.hits} hits, {p.cache.misses} builds. Entries retain source revision, scope, method and expiry.</p>{Object.entries(p.metrics.stageMs).map(([name, ms]) => <p key={name} className="text-sm">{name.replace('_', ' ')}: {(ms / 1000).toFixed(1)} seconds</p>)}</details>
 <div className="grid gap-6 lg:grid-cols-2"><section className="space-y-3 rounded-xl border p-5"><h2 className="text-xl font-semibold">Article batches</h2>{p.batches.length ? p.batches.map(b => <Link key={b.id} href={`/production-ops?id=${b.id}`} className="block rounded border p-3"><strong>{b.title}</strong><span className="ml-3 text-xs">{b.status.replaceAll('_', ' ')}</span></Link>) : <p>No queued article batches yet.</p>}<details open={!!expanded.batch} onToggle={e => { const open = e.currentTarget.open; setExpanded(old => old.batch === open ? old : { ...old, batch: open }); }}><summary>Queue multiple reviewed article briefs</summary><p className="my-3 text-sm text-muted-foreground">Use the Blog studio for a single article. For a batch, provide 1–20 complete source-backed briefs in its existing JSON format. Each article gets an independent checkpoint and editorial review.</p><form className="space-y-3" onSubmit={e => { e.preventDefault(); act(() => queueArticleBatchAction(p.brandId, { title: batchTitle, briefs, mode, reviewed }), 'Batch queued.', id => `/production-ops?id=${id}`); }}><label className="block text-sm">Batch title<Input value={batchTitle} onChange={e => setBatchTitle(e.target.value)} maxLength={180}/></label><label className="block text-sm">Creation method<select className="block w-full rounded border p-2" value={mode} onChange={e => { setMode(e.target.value as typeof mode); setReviewed(false); }}><option value="assembly">Assemble finished copy · no provider call</option><option value="ai">Write from verified source notes · existing paid limits</option></select></label><label className="block text-sm">Complete article briefs<Textarea className="min-h-48 font-mono" value={briefs} onChange={e => { setBriefs(e.target.value); setReviewed(false); }}/></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)}/>I reviewed every brief, product and source scope, and authorize the selected creation method.</label><Button disabled={pending || !reviewed}>Queue article batch</Button></form></details></section>
 <section className="space-y-3 rounded-xl border p-5"><h2 className="text-xl font-semibold">Campaigns</h2>{p.campaigns.map(c => <Link key={c.id} href={`/production-ops?id=${c.id}`} className="block rounded border p-3"><strong>{c.title}</strong><span className="ml-3 text-xs">{c.status.replaceAll('_', ' ')}</span></Link>)}<details open={!!expanded.campaign} onToggle={e => { const open = e.currentTarget.open; setExpanded(old => old.campaign === open ? old : { ...old, campaign: open }); }}><summary>Connect a campaign's existing work</summary><form className="mt-3 space-y-3" onSubmit={e => { e.preventDefault(); const nodes = selected.map(index => { const t = p.tasks[index]; return { id: `task-${index}`, kind: t.kind, refId: t.refId, dependsOn: dependencies[index] !== undefined && dependencies[index] !== '' ? [`task-${dependencies[index]}`] : [], sourceIds: sources, operation: 'plan' as const }; }); act(() => createCampaignAction(p.brandId, { title, productId: product, nodes, spendingAuthorized: authorize, reviewed: campaignReviewed }), 'Campaign created.', id => `/production-ops?id=${id}`); }}><label className="block text-sm">Campaign name<Input value={title} maxLength={180} onChange={e => setTitle(e.target.value)}/></label><label className="block text-sm">Selected product<select className="block w-full rounded border p-2" value={product} onChange={e => { setProduct(e.target.value); setSelected([]); setSources([]); setCampaignReviewed(false); }}>{p.products.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><p className="text-sm text-muted-foreground">Choose existing creative sets, landing runs and article batches. Prerequisites require individual acceptance before later work starts.</p>{p.tasks.map((t, i) => t.productId === product && <div key={`${t.kind}:${t.refId}`} className="rounded border p-2"><label className="flex gap-2 text-sm"><input type="checkbox" checked={selected.includes(i)} onChange={() => { setSelected(old => old.includes(i) ? old.filter(n => n !== i) : [...old, i]); setCampaignReviewed(false); }}/>{t.title} · {t.kind.replace('_', ' ')}</label>{selected.includes(i) && <label className="block text-xs">Prerequisite<select className="ml-2 rounded border p-1" value={dependencies[i] ?? ''} onChange={e => setDependencies(old => ({ ...old, [i]: e.target.value === '' ? '' : Number(e.target.value) }))}><option value="">Independent task</option>{selected.filter(n => n !== i).map(n => <option key={n} value={n}>{p.tasks[n].title}</option>)}</select></label>}</div>)}<fieldset><legend className="text-sm font-medium">Shared approved sources</legend>{p.evidence.filter(s => s.productIds.includes(product)).map(s => <label key={s.id} className="flex gap-2 text-xs"><input type="checkbox" checked={sources.includes(s.id)} onChange={() => { setSources(toggle(sources, s.id)); setCampaignReviewed(false); }}/>{s.text}</label>)}</fieldset><label className="flex gap-2 text-sm"><input type="checkbox" checked={authorize} onChange={e => { setAuthorize(e.target.checked); setCampaignReviewed(false); }}/>Authorize unfinished native production stages under existing spending limits.</label><label className="flex gap-2 text-sm"><input type="checkbox" checked={campaignReviewed} onChange={e => setCampaignReviewed(e.target.checked)}/>I reviewed this product, complete task set, prerequisites and selected source revisions.</label><Button disabled={pending || !campaignReviewed || !selected.length}>Create campaign</Button></form></details></section></div>
 {p.selectedBatch && <section className="space-y-4 rounded-xl border p-5"><h2 className="text-xl font-semibold">{p.selectedBatch.value.title}</h2><p className="text-xs text-muted-foreground">Frozen context {p.selectedBatch.value.contextHash.slice(0, 16)} · evidence revision {p.selectedBatch.value.evidenceRevision} · {p.selectedBatch.value.cancelled ? 'Cancelled' : p.selectedBatch.value.mode}</p><div className="flex flex-wrap gap-3"><Button variant="outline" disabled={pending || p.selectedBatch.value.cancelled} onClick={() => act(() => resumeArticleBatchAction(p.brandId, p.selectedBatch!.value.id), 'Unfinished work queued; confirmed responses are reused.')}>Resume unfinished articles</Button><Button variant="outline" disabled={pending || p.selectedBatch.value.cancelled} onClick={() => act(() => cancelArticleBatchAction(p.brandId, p.selectedBatch!.value.id, p.selectedBatch!.revision), 'Batch cancelled. Completed and retained work remains available.')}>Cancel further generation</Button><Button variant="outline" disabled={pending} onClick={() => act(() => reviewTimerAction(p.brandId, p.selectedBatch!.value.id, 'start'), 'Review timer started.')}>Start review timer</Button><Button variant="outline" disabled={pending} onClick={() => act(() => reviewTimerAction(p.brandId, p.selectedBatch!.value.id, 'stop'), 'Review time recorded.')}>Stop review timer</Button></div>{p.items.map(item => <article key={item.value.id} className="space-y-2 rounded-lg border p-4"><h3 className="font-semibold">{item.value.input.title}</h3><p className="text-sm">{item.value.status} · checkpoint {item.revision}{item.value.response && ` · $${item.value.response.costUsd.toFixed(4)} · call ${item.value.response.callId}`}</p>{item.value.error && <p role="alert" className="text-sm text-amber-800">{item.value.error}</p>}{item.value.status === 'saved' && <Link className="underline" href={`/seo/content?id=${item.value.artifactId}`}>Open full article for editorial review</Link>}{item.value.response && item.value.status !== 'saved' && <Button variant="outline" disabled={pending} onClick={() => act(() => recheckArticleAction(p.brandId, item.value.id), 'Retained response rechecked without a provider call.')}>Recheck retained response · no generation</Button>}<details onToggle={e => { const open = e.currentTarget.open; setExpanded(old => ({ ...old, [item.value.id]: open })); if (open && retained[item.value.id]?.revision !== item.revision)
        start(async () => { const result = await loadRetainedArticleAction(p.brandId, item.value.id); if (result.ok)
            setRetained(old => ({ ...old, [item.value.id]: { revision: result.value.revision, data: result.value } }));
        else
            setMessage(result.error); }); }}><summary>Frozen brief and retained response</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">{retained[item.value.id]?.revision === item.revision ? JSON.stringify(retained[item.value.id].data, null, 2) : "Loading this checkpoint on demand…"}</pre></details></article>)}</section>}
 {p.campaign && <section className="space-y-4 rounded-xl border p-5"><h2 className="text-xl font-semibold">{p.campaign.value.title}</h2><Button disabled={pending} variant="outline" onClick={() => act(() => refreshCampaignAction(p.brandId, p.campaign!.value.id), 'Campaign states refreshed.')}>Refresh campaign and dispatch eligible tasks</Button>{p.campaign.value.nodes.map(n => <article className="space-y-2 rounded border p-4" key={n.id}><h3 className="font-semibold">{n.kind.replace('_', ' ')} · {n.refId}</h3><p>{n.status.replaceAll('_', ' ')}</p>{n.error && <p className="text-sm text-amber-800">{n.error}</p>}<p className="text-xs">Prerequisites: {n.dependsOn.join(', ') || 'independent'} · source revision identity {n.scopeHash.slice(0, 16)}</p>{p.campaign!.links[n.id] && <Link className="block underline" href={p.campaign!.links[n.id]}>Open this task's outputs</Link>}{n.status === 'ready_for_review' && <><label className="flex gap-2 text-sm"><input type="checkbox" checked={taskReviews.includes(n.id)} onChange={() => setTaskReviews(toggle(taskReviews, n.id))}/>I reviewed this task and its individual outputs; this does not approve unseen siblings.</label><Button disabled={pending || !taskReviews.includes(n.id)} onClick={() => act(() => acceptCampaignTaskAction(p.brandId, p.campaign!.value.id, n.id, p.campaign!.revision, true), 'Individual campaign task accepted.')}>Accept reviewed task {n.id}</Button></>}</article>)}</section>}
 <section className="space-y-3 rounded-xl border p-5"><h2 className="text-xl font-semibold">Compound editorial corrections</h2><p className="text-sm text-muted-foreground">Apply a reviewed set of article copy/reference corrections together. Every item needs its current ID and revision. Changed articles return to draft; undo restores copy and references with a fresh review requirement.</p><details open={!!expanded.correction} onToggle={e => { const open = e.currentTarget.open; setExpanded(old => old.correction === open ? old : { ...old, correction: open }); }}><summary>Prepare a correction set</summary><form className="mt-3 space-y-3" onSubmit={e => { e.preventDefault(); act(() => applyCompoundCorrectionAction(p.brandId, corrections, correctionReviewed), 'Corrections committed. Each affected article needs fresh review.'); }}><label className="block text-sm">Affected draft corrections<Textarea value={corrections} onChange={e => { setCorrections(e.target.value); setCorrectionReviewed(false); }} className="min-h-40 font-mono" placeholder={'[{"id":"draft-id","revision":1,"body":"Full corrected Markdown"}]'}/></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={correctionReviewed} onChange={e => setCorrectionReviewed(e.target.checked)}/>I reviewed the complete affected set, including copy and source-reference changes.</label><Button disabled={pending || !correctionReviewed}>Apply complete correction set</Button></form></details>{p.journals.map(j => <div className="flex flex-wrap items-center gap-3 rounded border p-3 text-sm" key={j.id}><code className="break-all">{j.id}</code><span>{j.state}</span>{j.error && <span>{j.error}</span>}{j.state === 'committed' && <Button variant="outline" disabled={pending} onClick={() => act(() => undoCompoundCorrectionAction(p.brandId, j.id), 'Copy and references restored; fresh approval is required.')}>Undo correction {j.id.slice(0, 8)}</Button>}</div>)}</section></fieldset>;
}
