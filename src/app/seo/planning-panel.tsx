"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { SeoContext, SeoSnapshot } from "@/lib/seo/model";
import { cataloguePlanSeeds, internalLinkOpportunities, mappingConflicts, planCsv, type SearchPlanData, type SearchPlanInput, type SearchPlanRow } from "@/lib/seo/planning";
import { createInternalLinkHandoffAction } from "./evidence-actions";
import { createMappedBlogAction, deleteSearchPlanRowAction, saveSearchPlanRowAction } from "./planning-actions";
import type { MeasurementData } from "@/lib/seo/measurement";
import { QueryIntentPanel, OverlapPanel } from "./local-panels";
const fieldClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";
function download(name: string, content: string) { const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function blank(ctx: SeoContext): SearchPlanInput { return { keyword: "", intent: "informational", productId: "", targetUrl: ctx.websiteUrl ?? "", owner: "", dueDate: "", status: "planned", taskType: "new", notes: "" }; }
export function SearchPlanningPanel({ ctx, snapshot, data, measurement = { search: [], lab: [] } }: {
    ctx: SeoContext;
    snapshot: SeoSnapshot;
    data: SearchPlanData;
    measurement?: MeasurementData;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [editing, setEditing] = useState<string | null>(null);
    const [input, setInput] = useState<SearchPlanInput>(() => blank(ctx));
    const [filter, setFilter] = useState("all");
    const currentRows = data.rows.filter((r) => r.contextHash === ctx.contextHash);
    const conflicts = mappingConflicts(currentRows);
    const conflictIds = new Set(conflicts.flatMap((c) => c.ids));
    const seeds = cataloguePlanSeeds(ctx);
    const links = internalLinkOpportunities(ctx, snapshot);
    const stale = data.rows.length - currentRows.length;
    const rows = [...data.rows].filter((r) => filter === "all" || (filter === "refresh" ? r.taskType === "refresh" : r.status === filter))
        .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999") || a.keyword.localeCompare(b.keyword));
    const update = <K extends keyof SearchPlanInput>(key: K, value: SearchPlanInput[K]) => setInput((old) => ({ ...old, [key]: value }));
    function edit(row: SearchPlanRow) { setEditing(row.id); setInput({ keyword: row.keyword, intent: row.intent, productId: row.productId, targetUrl: row.targetUrl, owner: row.owner, dueDate: row.dueDate, status: row.status, taskType: row.taskType, notes: row.notes }); document.getElementById("search-plan-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
    function save() { start(async () => { try {
        const result = await saveSearchPlanRowAction(ctx.brandId, ctx.contextHash, data.revision, editing, input);
        if (!result.ok)
            return void toast.error(result.error);
        setEditing(null);
        setInput(blank(ctx));
        toast.success("Search plan saved. Implementation stays with your team.");
        router.refresh();
    }
    catch {
        toast.error("Could not save. Your edits are still here.");
    } }); }
    function remove(id: string) { start(async () => { try {
        const result = await deleteSearchPlanRowAction(ctx.brandId, ctx.contextHash, data.revision, id);
        if (!result.ok)
            return void toast.error(result.error);
        if (editing === id) {
            setEditing(null);
            setInput(blank(ctx));
        }
        toast.success("Plan item removed.");
        router.refresh();
    }
    catch {
        toast.error("Could not remove the plan item.");
    } }); }
    function draft(row: SearchPlanRow) { start(async () => { try {
        const result = await createMappedBlogAction(ctx.brandId, ctx.contextHash, data.revision, row.id);
        if (!result.ok)
            return void toast.error(result.error);
        router.push(`/seo/content?id=${result.id}`);
    }
    catch {
        toast.error("Could not prepare the blog draft.");
    } }); }
    return <div className="space-y-6" data-testid="search-planning-panel">
    <QueryIntentPanel ctx={ctx} measurement={measurement} plan={data.rows} onMap={(keyword, intent, targetUrl, notes) => { setEditing(null); setInput({ ...blank(ctx), keyword, intent, targetUrl, notes }); document.getElementById("search-plan-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}/>
    <OverlapPanel ctx={ctx} snapshot={snapshot} measurement={measurement}/>
    <section className="rounded-xl border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Keyword map &amp; content calendar</h2><p className="mt-1 text-sm text-muted-foreground">Give each buyer query a preferred product, collection or guide. Plan new content and refresh existing pages.</p></div><Button variant="outline" disabled={!data.rows.length} onClick={() => download(`${ctx.brandId}-search-plan.csv`, planCsv(data))}>Export plan CSV</Button></div>
      <p className="mt-3 text-xs text-muted-foreground">Shared Brand Brain: {ctx.brandName} · {ctx.products.length} products · {ctx.market}. Demand and ranking difficulty remain unknown until measured. Workflow status is reported by your team; it is not a publishing action.</p>
      {stale > 0 && <p className="mt-3 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm">{stale} plan item(s) use older Brand Brain facts. Edit, review the product and target, then save each item to confirm the current context. Older items are excluded from conflict checks and draft creation.</p>}
      {conflicts.length > 0 && <div className="mt-3 rounded-lg border border-amber-400/40 p-3 text-sm"><p className="font-medium">{conflicts.length} query mapping conflict(s)</p><p className="mt-1 text-muted-foreground">The same normalized query points to multiple destinations. Choose a preferred page or clarify intent. This is a planning conflict, not proof of search cannibalization.</p>{conflicts.map((c) => <p key={c.keyword} className="mt-2 break-words">“{c.keyword}” → {c.urls.join(" · ")}</p>)}</div>}
    </section>
    <section className="rounded-xl border bg-card p-5" id="search-plan-form"><h3 className="font-semibold">{editing ? "Edit planned work" : "Add a search target"}</h3>
      <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="space-y-1 text-sm">Buyer query<Input required minLength={3} maxLength={180} value={input.keyword} onChange={(e) => update("keyword", e.target.value)} placeholder="how to choose a commuter bottle"/></label>
        <label className="space-y-1 text-sm">Search intent<select className={fieldClass} value={input.intent} onChange={(e) => update("intent", e.target.value as SearchPlanInput["intent"])}><option value="informational">Informational · buying guide / answer</option><option value="commercial">Commercial · compare / collection</option><option value="transactional">Transactional · product / purchase</option></select></label>
        <label className="space-y-1 text-sm">Related catalogue product<select required className={fieldClass} value={input.productId} onChange={(e) => update("productId", e.target.value)}><option value="">Choose a product</option>{ctx.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="space-y-1 text-sm">Preferred store URL<Input required maxLength={2000} value={input.targetUrl} onChange={(e) => update("targetUrl", e.target.value)}/><span className="text-xs text-muted-foreground">Existing or proposed URL on this brand’s website.</span></label>
        <label className="space-y-1 text-sm">Task type<select className={fieldClass} value={input.taskType} onChange={(e) => update("taskType", e.target.value as SearchPlanInput["taskType"])}><option value="new">Create new content</option><option value="refresh">Refresh existing content</option></select></label>
        <label className="space-y-1 text-sm">Workflow status<select className={fieldClass} value={input.status} onChange={(e) => update("status", e.target.value as SearchPlanInput["status"])}>{["planned", "drafting", "review", "implemented", "verified"].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
        <label className="space-y-1 text-sm">Owner<Input maxLength={100} value={input.owner} onChange={(e) => update("owner", e.target.value)} placeholder="Content lead"/></label>
        <label className="space-y-1 text-sm">Due date<Input type="date" value={input.dueDate} onChange={(e) => update("dueDate", e.target.value)}/></label>
        <label className="space-y-1 text-sm md:col-span-2">Evidence, refresh reason &amp; handoff notes<Textarea maxLength={4000} value={input.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Buyer need, reference sources, what to change, reviewer and verification evidence."/></label>
        <div className="flex gap-2 md:col-span-2"><Button disabled={pending || !ctx.products.length || !ctx.websiteUrl} type="submit">{pending ? "Saving…" : editing ? "Save reviewed item" : "Add to plan"}</Button>{editing && <Button type="button" variant="ghost" onClick={() => { setEditing(null); setInput(blank(ctx)); }}>Cancel edit</Button>}</div>
      </form>
      <details className="mt-5 border-t pt-4"><summary className="cursor-pointer text-sm font-medium">Catalogue topic starters · {seeds.length}</summary><p className="mt-2 text-xs text-muted-foreground">These are editorial suggestions, not keyword research results. Review the query and proposed URL before adding.</p><div className="mt-3 flex flex-wrap gap-2">{seeds.map((seed) => <Button key={`${seed.productId}:${seed.keyword}`} variant="outline" size="sm" onClick={() => { setEditing(null); setInput(seed); }}>{seed.keyword}</Button>)}</div></details>
    </section>
    <section className="rounded-xl border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Scheduled work · {rows.length}</h3><select aria-label="Filter search plan" className={`${fieldClass} max-w-52`} value={filter} onChange={(e) => setFilter(e.target.value)}>{["all", "planned", "drafting", "review", "implemented", "verified", "refresh"].map((s) => <option key={s} value={s}>{s === "all" ? "All work" : s}</option>)}</select></div>
      {!rows.length ? <p className="mt-4 text-sm text-muted-foreground">Add a target above. Dates and owners turn keyword ideas into a reviewable publishing plan.</p> : <div className="mt-3 divide-y">{rows.map((row) => <article key={row.id} className="py-4"><div className="flex flex-wrap items-center gap-2"><h4 className="font-medium">{row.keyword}</h4><Badge variant="outline">{row.intent}</Badge><Badge variant="outline">{row.taskType}</Badge><Badge variant="outline">{row.status}</Badge>{conflictIds.has(row.id) && <Badge variant="destructive">Mapping conflict</Badge>}{row.contextHash !== ctx.contextHash && <Badge variant="destructive">Review brand facts</Badge>}</div><a href={row.targetUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-primary underline underline-offset-4">{row.targetUrl}</a><p className="mt-2 text-xs text-muted-foreground">{ctx.products.find((p) => p.id === row.productId)?.name ?? "Product changed"} · Owner: {row.owner || "Unassigned"} · Due: {row.dueDate || "Unscheduled"}</p>{row.evidence && <details className="mt-3 rounded border p-3 text-sm"><summary className="cursor-pointer font-medium">Saved source evidence · {row.evidence.kind}</summary><p className="mt-2 text-xs text-muted-foreground">Captured {row.evidence.capturedAt}</p><p className="mt-2 whitespace-pre-wrap break-words">{row.evidence.detail}</p></details>}{row.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{row.notes}</p>}<div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={pending} onClick={() => edit(row)}>Edit</Button>{row.artifactId ? <Button size="sm" variant="outline" asChild><Link href={`/seo/content?id=${row.artifactId}`}>Open starter draft</Link></Button> : row.intent === "informational" && <Button size="sm" disabled={pending || row.contextHash !== ctx.contextHash} onClick={() => draft(row)}>Create starter outline</Button>}{row.intent === "informational" && row.contextHash === ctx.contextHash && <Button size="sm" asChild><Link href={`/landing/articles?planId=${encodeURIComponent(row.id)}`}>Write sourced article</Link></Button>}<Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(row.id)}>Remove plan item</Button></div></article>)}</div>}
    </section>
    <section className="rounded-xl border bg-card p-5"><h3 className="font-semibold">Internal link opportunities</h3><p className="mt-2 text-sm text-muted-foreground">Relevant source and destination pages from inspected HTML. Existing links, self-links, blocked pages and conflicting canonicals are excluded. Review placement before copying into your store.</p><p className="mt-2 text-xs text-muted-foreground">At most 40 suggestions, two per source. This bounded crawl cannot prove a page is orphaned or inspect links added only by JavaScript.</p>
      {!links.length ? <p className="mt-4 text-sm text-muted-foreground">No eligible missing links identified in the current crawl. Run an audit against this Brand Brain to collect page evidence.</p> : <div className="mt-3 divide-y">{links.map((link) => <article key={`${link.sourceUrl}:${link.destinationUrl}`} className="py-4"><p className="text-sm font-medium">{link.sourceTitle} → {link.destinationTitle}</p><div className="mt-2 flex flex-wrap gap-4 text-xs"><a className="text-primary underline" href={link.sourceUrl} target="_blank" rel="noreferrer">Inspect source</a><a className="text-primary underline" href={link.destinationUrl} target="_blank" rel="noreferrer">Inspect destination</a></div><p className="mt-2 text-xs text-muted-foreground">{link.reason} · Observed: {link.observedAt}</p><pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-xs"><code>{link.html}</code></pre><Button className="mt-2" size="sm" variant="outline" onClick={async () => { try {
        await navigator.clipboard.writeText(link.html);
        toast.success("Link HTML copied for human placement.");
    }
    catch {
        toast.error("Clipboard unavailable. Select the code above to copy.");
    } }}>Copy link HTML</Button><Button className="ml-2 mt-2" size="sm" disabled={pending} onClick={() => start(async () => { try {
        const result = await createInternalLinkHandoffAction(ctx.brandId, ctx.contextHash, link.observedAt, link.sourceUrl, link.destinationUrl);
        if (!result.ok)
            return void toast.error(result.error);
        router.push(`/seo/content?id=${result.id}`);
    }
    catch {
        toast.error("Could not prepare the link handoff.");
    } })}>Prepare developer handoff</Button></article>)}</div>}
    </section>
  </div>;
}
