"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { SeoContext, SeoSnapshot } from "@/lib/seo/model";
import type { SearchImport, MeasurementData } from "@/lib/seo/measurement";
import type { SearchPlanRow, SearchPlanInput } from "@/lib/seo/planning";
import type { SeoArtifact } from "@/lib/seo/content";
import type { VisibilityRun } from "@/lib/seo/visibility";
import type { RenderedReview } from "@/lib/seo/rendered";
import { compareVisibilityRuns, pageOverlap, queryIntentGroups } from "@/lib/seo/review-tools";
import { insertArticleLinkAction, renderedReviewAction, savedRenderedAction } from "./review-actions";
const selectClass = "w-full min-h-11 rounded-md border bg-background p-2 text-sm";
const sectionClass = "space-y-4 rounded-xl border bg-card p-4 sm:p-5";
const period = (r: SearchImport) => `${r.periodStart}–${r.periodEnd} · ${r.segment} · imported ${r.importedAt.slice(0, 10)}`;
export function QueryIntentPanel({ ctx, measurement, plan, onMap }: {
    ctx: SeoContext;
    measurement: MeasurementData;
    plan: SearchPlanRow[];
    onMap: (query: string, intent: SearchPlanInput["intent"], url: string, note: string) => void;
}) {
    const reports = measurement.search.filter((r) => r.contextHash === ctx.contextHash), [reportId, setReportId] = useState(""), [filter, setFilter] = useState("all");
    const report = reports.find((r) => r.id === reportId) ?? reports[0];
    const groups = report ? queryIntentGroups(report, plan.filter((p) => p.contextHash === ctx.contextHash)) : [];
    return <section className={sectionClass} data-testid="seo-query-intent"><h3 className="font-semibold">Imported queries by buyer intent</h3><p className="text-sm text-muted-foreground">Use actual imported query/page pairs. Intent is a reviewable heuristic unless your plan already supplies it. Impressions in this report are measured; keyword volume and difficulty remain unknown.</p>{!report ? <p className="text-sm">Import a query + page report in Measurement to group real shopper queries.</p> : <><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">Measured report<select className={selectClass} value={report.id} onChange={(e) => setReportId(e.target.value)}>{reports.map((r) => <option key={r.id} value={r.id}>{period(r)}</option>)}</select></label><label className="grid gap-1 text-sm">Buyer intent<select className={selectClass} value={filter} onChange={(e) => setFilter(e.target.value)}>{["all", "informational", "commercial", "transactional"].map((f) => <option key={f} value={f}>{f}</option>)}</select></label></div><div className="space-y-3">{groups.filter((g) => filter === "all" || g.intent === filter).slice(0, 40).map((g) => <article key={g.query} className="rounded-lg border p-3"><div className="flex flex-wrap items-center gap-2"><strong className="break-words text-sm">{g.query}</strong><Badge variant="outline">{g.intent}</Badge></div><p className="mt-2 text-xs">{g.clicks} clicks · {g.impressions} impressions · CTR {g.ctr === null ? "Unknown" : `${(g.ctr * 100).toFixed(1)}%`}</p><p className="mt-1 text-xs text-muted-foreground">{g.intentSource}</p><div className="mt-2 space-y-2">{g.observedUrls.map((url) => <div key={url} className="space-y-1"><a className="block break-all text-xs text-primary underline" href={url} target="_blank" rel="noreferrer">Observed destination: {url}</a><Button size="sm" variant="outline" onClick={() => onMap(g.query, g.intent, url, `Imported query/page evidence: ${report.id}; ${period(report)}. Query: ${g.query}; ${g.clicks} aggregate clicks, ${g.impressions} aggregate impressions across observed URLs. Suggested intent ${g.intent} requires human review. Keyword volume and difficulty unknown.`)}>Review this query in the map</Button></div>)}</div>{g.proposedUrls.length > 0 && <p className="mt-2 break-all text-xs">Current mapped destination: {g.proposedUrls.join("; ")}</p>}</article>)}</div><p className="text-xs text-muted-foreground">Showing at most 40 of {groups.length} grouped queries, prioritized by measured impressions.</p></>}</section>;
}
export function OverlapPanel({ ctx, snapshot, measurement }: {
    ctx: SeoContext;
    snapshot: SeoSnapshot;
    measurement: MeasurementData;
}) {
    const reports = measurement.search.filter((r) => r.contextHash === ctx.contextHash), [reportId, setReportId] = useState(""), report = reports.find((r) => r.id === reportId) ?? reports[0], rows = pageOverlap(snapshot, report);
    return <section className={sectionClass} data-testid="seo-page-overlap"><h3 className="font-semibold">Review overlapping destinations</h3><p className="text-sm text-muted-foreground">Compare captured body passages separately from titles/headings and, when supplied, exact imported queries receiving impressions on both pages. This identifies a review hypothesis; it cannot prove search cannibalization or ranking loss.</p>{report && <label className="grid gap-1 text-sm">Query evidence scope<select className={selectClass} value={report.id} onChange={(e) => setReportId(e.target.value)}>{reports.map((r) => <option key={r.id} value={r.id}>{period(r)}</option>)}</select></label>}{rows.length ? rows.map((row) => <article key={`${row.left}:${row.right}`} className="space-y-2 rounded-lg border p-3 text-sm"><a className="block break-all text-primary underline" href={row.left} target="_blank" rel="noreferrer">{row.left}</a><a className="block break-all text-primary underline" href={row.right} target="_blank" rel="noreferrer">{row.right}</a><p className="text-xs">Captured label/heading overlap: {Math.round(row.similarity * 100)}% · terms: {row.sharedTerms.join(", ") || "None"}</p><p className="text-xs">Captured body passage overlap: {row.contentSimilarity === null ? "Unknown — insufficient captured body text" : `${Math.round(row.contentSimilarity * 100)}% of bounded three-word passages`}</p><p className="text-xs text-muted-foreground">Body evidence scope: {row.contentScope}</p><p className="text-xs">Shared measured queries: {row.sharedQueries.join("; ") || "No paired query evidence"}</p><p className="text-xs text-muted-foreground">{row.explanation}</p></article>) : <p className="text-sm text-muted-foreground">No qualifying overlap found in the sampled evidence. Missing pages and unimported queries remain unknown.</p>}</section>;
}
export function RenderedSeoPanel({ ctx, snapshot }: {
    ctx: SeoContext;
    snapshot: SeoSnapshot;
}) {
    const targets = [...new Set([ctx.websiteUrl, ...ctx.products.map((p) => p.url), ...snapshot.pages.filter((p) => p.live?.htmlInspected).map((p) => p.url)].filter((u): u is string => Boolean(u)))], [url, setUrl] = useState(targets[0] ?? ""), [reviews, setReviews] = useState<RenderedReview[]>([]), [pending, start] = useTransition();
    useEffect(() => { let disposed = false; savedRenderedAction(ctx.brandId, ctx.contextHash).then((r) => { if (r.ok && !disposed)
        setReviews(r.value); }); return () => { disposed = true; }; }, [ctx.brandId, ctx.contextHash]);
    const review = reviews.find((r) => r.url === url) ?? null;
    return <section className={sectionClass} data-testid="seo-rendered-review"><h3 className="font-semibold">Mobile rendered SEO versus source HTML</h3><p className="text-sm text-muted-foreground">Check how JavaScript changes the page labels, canonical, headings, links and schema at a 390 × 844 mobile viewport. This reads an accessible public page; it does not implement or test a proposed theme change.</p><label className="grid gap-2 text-sm">Store page<select className={selectClass} value={url} onChange={(e) => setUrl(e.target.value)}>{targets.map((u) => <option key={u} value={u}>{u}</option>)}</select></label><Button disabled={pending || !url} onClick={() => start(async () => { try {
        const r = await renderedReviewAction(ctx.brandId, ctx.contextHash, url);
        if (!r.ok) {
            toast.error(r.error);
            return;
        }
        setReviews((old) => [r.value, ...old.filter((x) => x.url !== r.value.url)]);
        setUrl(r.value.url);
        toast.success("Mobile source comparison saved.");
    }
    catch {
        toast.error("The public mobile read could not finish.");
    } })}>{pending ? "Reading mobile DOM…" : "Read mobile rendered evidence"}</Button>{review && <><p className="text-xs">Captured {new Date(review.observedAt).toLocaleString()} · {review.differences.length} field differences · {review.mobile.visibleH1} visible H1 · horizontal overflow: {review.mobile.horizontalOverflow ? "Detected" : "Not detected in this limited render"}</p><div className="space-y-3">{Object.keys(review.source).map((field) => <div key={field} className="grid min-w-0 gap-2 rounded border p-3 sm:grid-cols-2"><p className="break-all text-xs"><strong>Source {field}:</strong> {review.source[field] ?? "Unknown"}</p><p className="break-all text-xs"><strong>Rendered {field}:</strong> {review.rendered[field] ?? "Unknown"}</p></div>)}</div><p className="text-xs text-muted-foreground">{review.blockedRequests} requests blocked. {review.limits}</p></>}</section>;
}
export function VisibilityComparisonPanel({ runs }: {
    runs: VisibilityRun[];
}) {
    const saved = runs.filter((r) => r.status !== "running"), [beforeId, setBeforeId] = useState(""), [afterId, setAfterId] = useState(""), before = saved.find((r) => r.id === beforeId) ?? saved[1], after = saved.find((r) => r.id === afterId) ?? saved[0], result = before && after ? compareVisibilityRuns(before, after) : null;
    return <details className="mt-5 rounded-lg border p-4" data-testid="seo-visibility-comparison"><summary className="cursor-pointer font-semibold">Compare two saved visibility runs</summary><div className="mt-4 space-y-3"><p className="text-xs text-muted-foreground">Only identical question text, reference context, actual model IDs, market and repeat counts qualify for a trend comparison.</p>{saved.length < 2 ? <p className="text-sm">Save two comparable runs before comparing.</p> : <><div className="grid gap-3 sm:grid-cols-2">{([['before', before, setBeforeId], ['after', after, setAfterId]] as const).map(([name, run, setter]) => <label key={name} className="grid gap-1 text-sm">{name === "before" ? "Earlier" : "Later"} run<select className={selectClass} value={run?.id ?? ""} onChange={(e) => setter(e.target.value)}>{saved.map((r) => <option key={r.id} value={r.id}>{new Date(r.startedAt).toLocaleString()} · {r.locale} · {r.id.slice(0, 8)}</option>)}</select></label>)}</div>{result?.comparable ? <><p className="text-sm">Brand mentions: {result.mentions.before} → {result.mentions.after} of {result.mentions.assessed} paired assessed responses. Unknown pairs: {result.mentions.unknown}.</p><p className="text-sm">Direct store citations: {result.citations.before} → {result.citations.after} of {result.citations.assessed} paired assessed responses. Unknown pairs: {result.citations.unknown}.</p><details><summary className="cursor-pointer text-sm">Inspect paired questions</summary><div className="mt-3 space-y-2">{result.pairs.map((p, i) => <p className="rounded border p-2 text-xs" key={i}>{p.question} · {p.model} · repeat {p.repeat}<br />Mention: {p.beforeMention === null ? "Unknown" : String(p.beforeMention)} → {p.afterMention === null ? "Unknown" : String(p.afterMention)} · Citation: {p.beforeCitation === null ? "Unknown" : String(p.beforeCitation)} → {p.afterCitation === null ? "Unknown" : String(p.afterCitation)}</p>)}</div></details></> : <p className="text-sm">Comparison unavailable: {result?.reasons.join(" ")}</p>}<p className="text-xs text-muted-foreground">{result?.limitation}</p></>}</div></details>;
}
export function DraftLinkPanel({ ctx, artifact, disabled }: {
    ctx: SeoContext;
    artifact: SeoArtifact;
    disabled: boolean;
}) {
    const [anchor, setAnchor] = useState(""), [url, setUrl] = useState(""), [occurrence, setOccurrence] = useState(0), [pending, start] = useTransition(), router = useRouter();
    return <section className={sectionClass} data-testid="seo-draft-link"><h3 className="font-semibold">Insert a checked internal link</h3><p className="text-xs text-muted-foreground">Save the current article first. Choose an exact phrase in plain body copy and the real store destination. The app checks public HTML access before inserting; headings, code and already-linked text are excluded. A new draft revision needs fresh approval.</p><label className="grid gap-1 text-sm">Exact anchor phrase<Input maxLength={160} value={anchor} onChange={(e) => setAnchor(e.target.value)}/></label><label className="grid gap-1 text-sm">Destination URL<Input type="url" maxLength={2000} value={url} onChange={(e) => setUrl(e.target.value)}/></label><label className="grid gap-1 text-sm">Eligible occurrence (first = 1)<Input type="number" min={1} max={100} value={occurrence + 1} onChange={(e) => setOccurrence(Math.max(0, Number(e.target.value) - 1))}/></label><Button disabled={disabled || pending || !anchor || !url} onClick={() => start(async () => { try {
        const r = await insertArticleLinkAction(ctx.brandId, ctx.contextHash, artifact.id, artifact.revision, anchor, url, occurrence);
        if (!r.ok) {
            toast.error(r.error);
            return;
        }
        router.refresh();
        toast.success("Link inserted into a new editable draft revision.");
    }
    catch {
        toast.error("Could not validate or insert this link.");
    } })}>{pending ? "Checking destination…" : "Check destination and insert"}</Button></section>;
}
export function SeoDeliveryPanel({ ctx, artifacts }: {
    ctx: SeoContext;
    artifacts: SeoArtifact[];
}) {
    const eligible = artifacts.filter((a) => a.contextHash === ctx.contextHash && a.mode === "live" && ["approved", "exported", "applied", "verified"].includes(a.status)), [selected, setSelected] = useState<string[]>([]), [pending, setPending] = useState(false), router = useRouter();
    return <section className={sectionClass} data-testid="seo-delivery-package"><h3 className="font-semibold">Complete approved SEO delivery</h3><p className="text-sm text-muted-foreground">Select up to twenty approved article and developer revisions. Download one ZIP with shopper copy, metadata, internal-link inventory, schema references, implementation notes and separate editorial provenance. Each item retains its own target URL.</p>{eligible.length ? <div className="space-y-2">{eligible.map((a) => <label key={a.id} data-testid={`seo-delivery-choice-${a.id}`} className="flex items-start gap-2 rounded border p-3 text-sm"><input type="checkbox" checked={selected.includes(a.id)} onChange={(e) => setSelected((old) => e.target.checked ? [...old, a.id].slice(0, 20) : old.filter((id) => id !== a.id))}/><span className="min-w-0">{a.title} · r{a.revision}<span className="mt-1 block break-all text-xs text-muted-foreground">{a.targetUrl}</span></span></label>)}</div> : <p className="text-sm text-muted-foreground">Approve a current-context revision in its editor to enable delivery.</p>}<Button disabled={pending || !selected.length} onClick={async () => { setPending(true); try {
        const response = await fetch("/api/seo/delivery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brandId: ctx.brandId, contextHash: ctx.contextHash, items: eligible.filter((a) => selected.includes(a.id)).map((a) => ({ id: a.id, revision: a.revision })) }) });
        if (!response.ok)
            throw new Error((await response.json()).error);
        const url = URL.createObjectURL(await response.blob()), link = document.createElement("a");
        link.href = url;
        link.download = "approved-seo-delivery.zip";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        router.refresh();
        toast.success("Approved SEO delivery downloaded.");
    }
    catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not download delivery.");
    }
    finally {
        setPending(false);
    } }}>{pending ? "Preparing delivery…" : `Download ${selected.length} approved revision(s)`}</Button></section>;
}
