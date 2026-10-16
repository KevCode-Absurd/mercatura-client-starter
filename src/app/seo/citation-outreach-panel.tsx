"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, ExternalLink, Mail, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SeoContext } from "@/lib/seo/model";
import { citationComparisonKey, citationOpportunities, outreachStatuses, type CitationOutreachDraft } from "@/lib/seo/citation-outreach";
import { visibilityStageLabels, visibilityStages, type VisibilityRun } from "@/lib/seo/visibility";
import { inspectCitationOutreachAction, prepareCitationOutreachAction, updateCitationOutreachAction } from "./citation-outreach-actions";
const statusLabels = { draft: "Draft", reviewed: "Reviewed", contacted: "Contacted", featured: "Featured", dismissed: "Dismissed" };
function download(name: string, value: unknown) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const date = (value: string) => new Date(value).toLocaleString();
export function CitationOutreachPanel({ ctx, runs, drafts }: {
    ctx: SeoContext;
    runs: VisibilityRun[];
    drafts: CitationOutreachDraft[];
}) {
    const router = useRouter(), [pending, start] = useTransition();
    const [runId, setRunId] = useState(""), [stage, setStage] = useState("all"), [provider, setProvider] = useState("all"), [status, setStatus] = useState("all");
    const current = runs.filter(r => r.brandId === ctx.brandId && r.contextHash === ctx.contextHash && r.status !== "running").sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const run = current.find(r => r.id === runId) ?? current[0];
    const sources = citationOpportunities(ctx, run);
    const shown = sources.filter(s => s.evidence.some(e => e.brandAbsent && (stage === "all" || e.stage === stage) && (provider === "all" || e.provider === provider)));
    const currentDrafts = drafts.filter(d => d.brandId === ctx.brandId && d.contextHash === ctx.contextHash);
    const saved = currentDrafts.filter(d => status === "all" || d.status === status);
    const historical = drafts.filter(d => d.brandId === ctx.brandId && d.contextHash !== ctx.contextHash);
    const eligible = new Set(sources.map(s => citationComparisonKey(s.url)));
    const candidates = new Set(run?.observations.filter(o => o.status === "completed" && o.answer.trim() && o.brandMentioned === false)
        .flatMap(o => o.retrievedSources ?? []).map(s => citationComparisonKey(s.url)).filter((s): s is string => !!s && !eligible.has(s)) ?? []);
    function prepare(urls?: string[]) {
        if (!run)
            return;
        start(async () => {
            try {
                const result = await prepareCitationOutreachAction(ctx.brandId, ctx.contextHash, run.id, urls);
                if (!result.ok)
                    toast.error(result.error);
                else {
                    toast.success(result.created ? `${result.created} outreach draft${result.created === 1 ? "" : "s"} saved.` : "These sources already have saved drafts.");
                    router.refresh();
                }
            }
            catch {
                toast.error("Could not prepare outreach. Please retry.");
            }
        });
    }
    return <section className="space-y-5 rounded-xl border bg-card p-5" data-testid="citation-outreach">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 font-semibold"><Mail className="size-4"/>From missing answers to publisher outreach</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Your Brand Brain informs questions across five buyer stages. See which third-party pages models cite when your brand is absent, then prepare a relevant pitch for their editors.</p></div><Link href="/seo/outreach" className="text-sm text-primary underline">Open outreach workspace</Link></div>
    <div className="grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-lg bg-muted/50 p-3"><strong>{sources.length}</strong> cited pages with a brand gap</div><div className="rounded-lg bg-muted/50 p-3"><strong>{currentDrafts.length}</strong> saved outreach drafts</div><div className="rounded-lg bg-muted/50 p-3"><strong>{currentDrafts.filter(d => d.status === "featured").length}</strong> features recorded by you</div></div>
    <p className="text-xs leading-5 text-muted-foreground">Priority follows the number of models and sampled answers citing each page. These are API observations. An early-stage question may not call for a brand, and publisher coverage does not guarantee inclusion in later answers.</p>
    {!run ? <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Run a buyer-journey visibility scan below to collect actual answers and citations. Drafts use saved source evidence; no publisher list is invented.</div> : <>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 text-sm font-medium">Source scan<select aria-label="Outreach source scan" className="mt-2 block w-full rounded-md border bg-background p-2 text-sm" value={run.id} onChange={e => setRunId(e.target.value)}>{current.map(r => <option key={r.id} value={r.id}>{date(r.completedAt || r.startedAt)} · {r.locale} · {r.status}</option>)}</select></label>
        <label className="text-sm font-medium">Buyer stage<select aria-label="Outreach buyer stage" className="mt-2 block max-w-full rounded-md border bg-background p-2 text-sm" value={stage} onChange={e => setStage(e.target.value)}><option value="all">All stages</option>{visibilityStages.map(s => <option key={s} value={s}>{visibilityStageLabels[s]}</option>)}<option value="unclassified">Earlier unclassified queries</option></select></label>
        <label className="text-sm font-medium">Model provider<select aria-label="Outreach model provider" className="mt-2 block rounded-md border bg-background p-2 text-sm" value={provider} onChange={e => setProvider(e.target.value)}><option value="all">All providers</option>{[...new Set(run.observations.map(o => o.provider))].map(p => <option key={p} value={p}>{p}</option>)}</select></label>
        <Button disabled={pending || !shown.length} onClick={() => prepare(shown.slice(0, 40).map(s => s.url))}><Mail className="size-4"/>{pending ? "Preparing…" : "Prepare outreach drafts"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">{run.observations.filter(o => o.status === "completed" && o.answer.trim()).length} completed answers in this scan. Failed answers and unknown brand presence produce no outreach targets. {candidates.size} additional retrieved source candidates are excluded from outreach because they have no recorded gap citation. Preparing saves up to 40 pages at a time and keeps existing edits.</p>
      {!shown.length ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No qualifying cited pages for this selection. Inspect the answers below for empty citations, source redirects or questions where the brand already appears.</p> : <div className="space-y-3">{shown.slice(0, 40).map(source => {
                    const existing = currentDrafts.find(d => d.runId === run.id && d.source.url === source.url);
                    return <article key={source.url} className="rounded-lg border p-4" data-testid="citation-opportunity">
          <div className="flex flex-wrap justify-between gap-3"><div className="min-w-0 flex-1"><a href={source.url} target="_blank" rel="noreferrer" className="break-words text-sm font-semibold text-primary underline">{source.title}<ExternalLink className="ml-1 inline size-3"/></a><p className="mt-1 break-all text-xs text-muted-foreground">{source.domain}</p></div><Button variant="outline" size="sm" disabled={pending || !!existing} onClick={() => prepare([source.url])}>{existing ? "Draft saved" : "Draft outreach"}</Button></div>
          <div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline">{source.missingModels} model{source.missingModels === 1 ? "" : "s"} with a gap</Badge><Badge variant="outline">Absent in {source.missingResponses} / {source.evidence.length} citing answers</Badge>{source.stages.map(s => <Badge key={s} variant="secondary">{visibilityStageLabels[s]}</Badge>)}</div>
          <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">Queries and model evidence</summary><ul className="mt-3 space-y-3">{source.evidence.map(e => <li key={e.observationId} className="rounded-md bg-muted/40 p-3"><p className="break-words">{e.question}</p><p className="mt-1 break-words text-xs text-muted-foreground">{e.provider} · {e.model} · repeat {e.repeat} · {date(e.observedAt)} · {e.brandAbsent ? "Brand absent" : "Brand presence not marked absent"}</p>{e.citedUrl && <a href={e.citedUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs text-primary underline">Exact provider citation: {e.citedUrl}</a>}</li>)}</ul></details>
        </article>;
                })}</div>}
      {shown.length > 40 && <p className="text-xs text-muted-foreground">Showing the first 40 of {shown.length} pages. Filter by buyer stage or provider to review the rest.</p>}
    </>}
    <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-5"><div><h3 className="font-semibold">Saved outreach queue</h3><p className="mt-1 text-xs text-muted-foreground">Edit and save before exporting. Contact details come from your research. Statuses record your work; emails are sent through your own email tool.</p></div><label className="text-sm">Queue status<select aria-label="Outreach queue status" className="ml-2 rounded-md border bg-background p-2" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option>{outreachStatuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label><Button variant="outline" disabled={!saved.length} onClick={() => download(`outreach-${ctx.brandId}.json`, { exportedAt: new Date().toISOString(), measurement: "Search-grounded API observations; statuses reported by user", drafts: saved })}><Download className="size-4"/>Export queue</Button></div>
    {!saved.length && <p className="text-sm text-muted-foreground">No saved drafts in this selection.</p>}
    {saved.map(draft => <OutreachEditor key={`${draft.id}:${draft.revision}`} ctx={ctx} draft={draft}/>)}
    {historical.length > 0 && <details className="border-t pt-4"><summary className="cursor-pointer text-sm">{historical.length} historical drafts from earlier Brand Brains</summary><p className="my-3 text-xs text-muted-foreground">Preserved for reference. Run a fresh scan to draft with the current brand facts.</p>{historical.map(d => <div key={d.id} className="my-2 flex flex-wrap justify-between gap-2 rounded-md border p-3 text-sm"><span className="break-words">{d.source.title} · {statusLabels[d.status]}</span><Button size="sm" variant="outline" onClick={() => download(`historical-outreach-${d.id}.json`, d)}>Export historical draft</Button></div>)}</details>}
  </section>;
}
function OutreachEditor({ ctx, draft }: {
    ctx: SeoContext;
    draft: CitationOutreachDraft;
}) {
    const router = useRouter(), [pending, start] = useTransition();
    const initial = { subject: draft.subject, body: draft.body, contactName: draft.contactName, contactEmail: draft.contactEmail, notes: draft.notes, status: draft.status, featuredUrl: draft.featuredUrl };
    const [fields, setFields] = useState(initial), dirty = JSON.stringify(fields) !== JSON.stringify(initial);
    function action(inspect: boolean) {
        start(async () => {
            try {
                const result = inspect ? await inspectCitationOutreachAction(ctx.brandId, ctx.contextHash, draft.id, draft.revision)
                    : await updateCitationOutreachAction(ctx.brandId, ctx.contextHash, draft.id, draft.revision, fields);
                if (!result.ok)
                    toast.error(result.error);
                else {
                    toast.success(inspect ? "Source inspection saved." : "Outreach changes saved.");
                    router.refresh();
                }
            }
            catch {
                toast.error("Could not save this draft. Please retry.");
            }
        });
    }
    return <details className="rounded-lg border p-4" data-testid="outreach-draft">
    <summary className="cursor-pointer break-words text-sm font-semibold">{draft.source.title} <span className="ml-2 text-xs font-normal text-muted-foreground">{statusLabels[draft.status]} · {draft.locale}</span></summary>
    <div className="mt-4 space-y-4">
      <p className="break-words text-xs text-muted-foreground">Source scan {draft.runId} · saved {date(draft.createdAt)} · revision {draft.revision}</p>
      <div className="flex flex-wrap gap-2"><a href={draft.source.url} target="_blank" rel="noreferrer" className="self-center text-sm text-primary underline">Open cited page</a><Button type="button" variant="outline" size="sm" disabled={pending || dirty} onClick={() => action(true)}><ScanSearch className="size-4"/>{pending ? "Working…" : "Inspect source page"}</Button><Button type="button" variant="outline" size="sm" disabled={dirty} onClick={() => download(`outreach-${draft.id}.json`, draft)}><Download className="size-4"/>Export draft</Button></div>
      {dirty && <p className="text-xs text-muted-foreground">Save your edits before inspecting or exporting.</p>}
      {draft.inspection && <div className="rounded-lg bg-muted/50 p-3 text-sm" data-testid="citation-inspection"><p className="font-medium">Article brand presence: {draft.inspection.brandPresence === "present" ? "Found" : draft.inspection.brandPresence === "not-found" ? "Not found in fetched text" : "Unknown"}</p><p className="mt-1 text-xs text-muted-foreground">{date(draft.inspection.checkedAt)} · {draft.inspection.note}</p><p className="mt-2 break-all text-xs">{draft.inspection.finalUrl}</p>{draft.inspection.excerpt && <details className="mt-2"><summary className="cursor-pointer text-xs">Fetched source excerpt</summary><p className="mt-2 break-words text-xs leading-6">{draft.inspection.excerpt}</p></details>}</div>}
      <form onSubmit={e => { e.preventDefault(); action(false); }} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Editor name<Input value={fields.contactName} maxLength={150} onChange={e => setFields({ ...fields, contactName: e.target.value })} className="mt-2"/></label><label className="text-sm font-medium">Editor email<Input type="email" value={fields.contactEmail} maxLength={254} placeholder="Add a verified contact" onChange={e => setFields({ ...fields, contactEmail: e.target.value })} className="mt-2"/></label></div>
        <label className="block text-sm font-medium">Outreach subject<Input required minLength={3} maxLength={240} value={fields.subject} onChange={e => setFields({ ...fields, subject: e.target.value })} className="mt-2"/></label>
        <label className="block text-sm font-medium">Outreach email<Textarea required minLength={20} maxLength={12000} rows={16} value={fields.body} onChange={e => setFields({ ...fields, body: e.target.value })} className="mt-2"/></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Outreach status<select value={fields.status} onChange={e => setFields({ ...fields, status: e.target.value as typeof fields.status })} className="mt-2 block w-full rounded-md border bg-background p-2 text-sm">{outreachStatuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></label><label className="text-sm font-medium">Published feature URL<Input type="url" required={fields.status === "featured"} value={fields.featuredUrl} maxLength={2000} onChange={e => setFields({ ...fields, featuredUrl: e.target.value })} className="mt-2"/></label></div>
        <label className="block text-sm font-medium">Outreach notes<Textarea rows={3} maxLength={4000} value={fields.notes} onChange={e => setFields({ ...fields, notes: e.target.value })} className="mt-2"/></label>
        <Button disabled={pending || !dirty}>{pending ? "Saving…" : "Save outreach"}</Button>
      </form>
    </div>
  </details>;
}
