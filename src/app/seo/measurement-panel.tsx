"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SeoContext } from "@/lib/seo/model";
import { SEARCH_TEMPLATE, currentMeasurements, searchTotals, searchOpportunities, compareSearch, searchCsv, labRecommendation, labHandoff, compactLighthouseJson, MAX_LIGHTHOUSE_RAW_BYTES, type MeasurementData } from "@/lib/seo/measurement";
import { EvidenceTask } from "./evidence-task";
import { createPerformanceHandoffAction, importSeoMeasurementAction, runPageSpeedAction } from "./measurement-actions";
function download(name: string, text: string, type = "text/plain") { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
const pct = (n: number | null) => n === null ? "Unknown" : `${(n * 100).toFixed(2)}%`;
const metric = (n: number | null, unit = "") => n === null ? "Unknown" : `${n.toLocaleString(undefined, { maximumFractionDigits: 3 })}${unit}`;
export function MeasurementPanel({ ctx, data, crawlUrls = [] }: {
    ctx: SeoContext;
    data: MeasurementData;
    crawlUrls?: string[];
}) {
    const [kind, setKind] = useState<"search" | "lab">("search"), [text, setText] = useState(""), [segment, setSegment] = useState("Web · all countries · all devices · no filters");
    const [pending, start] = useTransition(), [selected, setSelected] = useState(""), [previousId, setPreviousId] = useState(""), [labId, setLabId] = useState("");
    const [testUrl, setTestUrl] = useState(ctx.websiteUrl ?? ""), [device, setDevice] = useState<"mobile" | "desktop">("mobile");
    const current = currentMeasurements(ctx, data), report = current.search.find((r) => r.id === selected) ?? current.search[0], previous = current.search.find((r) => r.id === previousId);
    const comparison = report && previous ? compareSearch(report, previous) : undefined;
    const totals = report ? searchTotals(report.rows) : undefined, opportunities = report ? searchOpportunities(report.rows) : [];
    const lab = current.lab.find((r) => r.id === labId) ?? current.lab[0];
    const stale = data.search.filter((r) => r.brandId === ctx.brandId && r.contextHash !== ctx.contextHash).length + data.lab.filter((r) => r.brandId === ctx.brandId && r.contextHash !== ctx.contextHash).length;
    const readFile = async (file?: File) => { if (!file)
        return; if (file.size > (kind === "lab" ? MAX_LIGHTHOUSE_RAW_BYTES : 700000)) {
        toast.error(kind === "lab" ? "Choose a Lighthouse report smaller than 15 MB." : "Choose a CSV smaller than 700 KB.");
        return;
    } try {
        const raw = await file.text();
        setText(kind === "lab" ? compactLighthouseJson(raw) : raw);
    }
    catch (error) {
        toast.error(error instanceof Error ? error.message : "This file could not be read.");
    } };
    return <section className="space-y-6" data-testid="seo-measurement-panel">
    <div><h2 className="text-2xl font-semibold">Search performance & page speed</h2><p className="mt-2 text-sm text-muted-foreground">Use real exports for {ctx.brandName}. Search data needs property access; public Lighthouse reports need only the store URL. Nothing is estimated when data is missing.</p></div>
    <div className="rounded-xl border bg-card p-5 space-y-4"><h3 className="font-semibold">Test your page speed</h3><p className="text-sm text-muted-foreground">Google PageSpeed runs Lighthouse on a public page from the shared store. Choose the homepage, a catalogue product or a page in the current audit. The test can take up to two minutes; public Google quota may limit availability.</p><label className="block text-sm">Public store page<Input className="mt-1" value={testUrl} onChange={(e) => setTestUrl(e.target.value)} list="seo-pagespeed-targets" maxLength={2000}/><datalist id="seo-pagespeed-targets">{[...new Set([ctx.websiteUrl, ...ctx.products.map((p) => p.url), ...crawlUrls].filter((url): url is string => !!url))].map((url) => <option key={url} value={url}/>)}</datalist></label><label className="block text-sm">Device<select className="mt-1 block w-full rounded-md border bg-background p-2" value={device} onChange={(e) => setDevice(e.target.value as "mobile" | "desktop")}><option value="mobile">Mobile</option><option value="desktop">Desktop</option></select></label><Button disabled={pending || !testUrl || !ctx.websiteUrl} onClick={() => start(async () => { try {
        const result = await runPageSpeedAction(ctx.brandId, { url: testUrl, device });
        if (!result.ok) {
            toast.error(result.error, { duration: 12000 });
            return;
        }
        setLabId(result.id);
        toast.success("Live PageSpeed report saved. Review the evidence and implementation options below.");
    }
    catch {
        toast.error("PageSpeed could not finish. Use the public link or import a Lighthouse report.");
    } })}>{pending ? "Working…" : "Run page speed test"}</Button>{pending && <p role="status" className="text-xs text-muted-foreground">The request is in progress. A PageSpeed test can take up to two minutes.</p>}</div>
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="font-semibold">Import evidence</h3>
      <label className="block text-sm">Report type<select aria-label="Report type" className="mt-1 block w-full rounded-md border bg-background p-2" value={kind} onChange={(e) => { setKind(e.target.value as "search" | "lab"); setText(""); }}><option value="search">Search Console query + page CSV</option><option value="lab">Lighthouse / PageSpeed JSON</option></select></label>
      {kind === "search" ? <><p className="text-sm text-muted-foreground">One row per query and page, aggregated over one date range. Use the template below; normal Search Console query-only and page-only exports cannot be joined to invent query/page pairs. An owner can export a query-and-page report through the Search Analytics API or an existing reporting tool, then map its columns. Up to 5,000 rows; shown totals cover imported rows only.</p><Button variant="outline" onClick={() => download("search-performance-template.csv", SEARCH_TEMPLATE, "text/csv")}>Download CSV template</Button><label className="block text-sm">Export scope<Input value={segment} onChange={(e) => setSegment(e.target.value)} maxLength={200} className="mt-1"/></label><p className="text-xs text-muted-foreground">Keep search type, country, device and all filters identical for comparisons. Record them here; scope is user supplied and cannot be independently verified.</p></> : <p className="text-sm text-muted-foreground">Paste a Lighthouse JSON report or a PageSpeed API JSON response, up to 15 MB. Screenshots and unrelated payloads are removed in your browser; bounded diagnostic excerpts and metrics are retained. Diagnostic snippets are displayed as evidence, never executed.</p>}
      <label className="block text-sm">Choose report file<Input type="file" accept={kind === "search" ? ".csv,text/csv" : ".json,application/json"} onChange={(e) => { void readFile(e.target.files?.[0]); }} className="mt-1"/></label>
      <label className="block text-sm">Or paste report<Textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={kind === "lab" ? MAX_LIGHTHOUSE_RAW_BYTES : 700000} className="mt-1 font-mono text-xs" placeholder={kind === "search" ? SEARCH_TEMPLATE : '{"finalUrl":"https://your-store.com/", ...}'}/></label>
      <Button disabled={pending || !text.trim() || !ctx.websiteUrl} onClick={() => start(async () => { try {
        const result = await importSeoMeasurementAction(ctx.brandId, { kind, text: kind === "lab" ? compactLighthouseJson(text) : text, segment });
        if (!result.ok) {
            toast.error(result.error);
            return;
        }
        toast.success("Report imported. Metrics are based only on the supplied evidence.");
        if (kind === "search")
            setSelected(result.id);
        else
            setLabId(result.id);
        setText("");
    }
    catch (error) {
        toast.error(error instanceof Error ? error.message : "Import failed. Refresh and try again.");
    } })}>{pending ? "Saving…" : "Import report"}</Button>
      <p className="text-xs text-muted-foreground">Reports must match {ctx.websiteUrl ?? "the website in Brand Brain"}. History retains 20 search imports and 30 lab reports. {stale > 0 ? `${stale} older-context reports are excluded from this view.` : ""}</p>
      <details className="text-sm"><summary className="cursor-pointer font-medium">How to get data without sharing credentials</summary><div className="mt-3 space-y-2"><p>For Search Console, ask the property owner to grant your Google account access or supply the query-and-page export. You do not need to give this app a password. Use the same search type and filters for each reporting period.</p><p><a className="underline" href="https://support.google.com/webmasters/answer/7687615" target="_blank" rel="noreferrer">Search Console access guide</a> · <a className="underline" href="https://developers.google.com/webmaster-tools/v1/searchanalytics/query" target="_blank" rel="noreferrer">Query-and-page API reference</a></p><p>Without store access, run a public PageSpeed test and import its Lighthouse JSON. A lab test diagnoses one page under test conditions; it does not measure sales or establish real-user Core Web Vitals.</p>{ctx.websiteUrl && <a className="inline-block underline" href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(ctx.websiteUrl)}`} target="_blank" rel="noreferrer">Open PageSpeed for the shared store</a>}</div></details>
    </div>
    <div className="rounded-xl border bg-card p-5 space-y-4"><h3 className="font-semibold">Organic search evidence</h3>{!report ? <p className="text-sm text-muted-foreground">No search performance report imported. Clicks, impressions, rankings and traffic changes remain unmeasured.</p> : <>
      <label className="block text-sm">Current period<select className="mt-1 block w-full rounded-md border bg-background p-2" value={report.id} onChange={(e) => setSelected(e.target.value)}>{current.search.map((r) => <option key={r.id} value={r.id}>{r.periodStart} to {r.periodEnd} · {r.segment} · imported {new Date(r.importedAt).toLocaleString()}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Clicks", totals!.clicks], ["Impressions", totals!.impressions], ["CTR", pct(totals!.ctr)], ["Average position", metric(totals!.position)]].map(([label, value]) => <div key={label} className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold">{value}</p></div>)}</div>
      <p className="text-xs text-muted-foreground">{report.rows.length} imported query/page pairs. Position is impression-weighted; CTR uses total clicks / total impressions. Query data can omit anonymized or truncated rows and is not the property's total traffic. These metrics do not separate AI-originated visits.</p>
      <Button variant="outline" onClick={() => download("search-performance-export.csv", searchCsv(report), "text/csv")}>Export imported rows</Button>
      <label className="block text-sm">Compare with earlier period<select className="mt-1 block w-full rounded-md border bg-background p-2" value={previousId} onChange={(e) => setPreviousId(e.target.value)}><option value="">Choose an earlier equal-length period</option>{current.search.filter((r) => r.id !== report.id).map((r) => <option key={r.id} value={r.id}>{r.periodStart} to {r.periodEnd} · {r.segment}</option>)}</select></label>
      {comparison && (comparison.comparable ? <div className="space-y-2 text-sm"><p>Imported clicks: {comparison.previous.clicks} → {comparison.current.clicks}. Matched query/page pairs: {comparison.matchedCount}. {comparison.omittedPairs} earlier pairs are absent from this export and are not counted as zero.</p><p className="text-muted-foreground">Changes are observations, not proof that any SEO action caused them. Seasonality, query mix and export coverage can differ.</p><h4 className="font-medium">Lost clicks on matching query/page pairs</h4>{comparison.lostClicks.length ? <ul className="space-y-2">{comparison.lostClicks.slice(0, 10).map((r) => <li key={r.query + r.page} className="break-words rounded border p-3">{r.query}: {r.previousClicks} → {r.clicks} clicks ({r.clickChange})<br /><a href={r.page} target="_blank" rel="noreferrer" className="text-xs underline">{r.page}</a><EvidenceTask key={`${report.id}:${previous!.id}:${r.query}:${r.page}`} ctx={ctx} source={{ kind: "search", reportId: report.id, previousId: previous!.id, query: r.query, page: r.page, reason: "lost-clicks" }} targetUrl={r.page}/></li>)}</ul> : <p>No click declines on matching pairs.</p>}</div> : <p role="status" className="text-sm text-amber-700">{comparison.reason}</p>)}
      <h4 className="font-medium">Pages worth reviewing</h4><p className="text-xs text-muted-foreground">Triage filter: at least 100 impressions, average position 1–20 and CTR below 3%. This is a review heuristic, not a universal CTR benchmark or promised uplift. Check query intent, search appearance, product availability and title accuracy.</p>{opportunities.length ? <ul className="space-y-2 text-sm">{opportunities.slice(0, 10).map((r) => <li key={r.query + r.page} className="rounded border p-3 break-words"><strong>{r.query}</strong> · {r.impressions} impressions · {pct(r.clicks / r.impressions)} CTR · position {r.position}<br /><a href={r.page} target="_blank" rel="noreferrer" className="text-xs underline">{r.page}</a><EvidenceTask key={`${report.id}:${r.query}:${r.page}`} ctx={ctx} source={{ kind: "search", reportId: report.id, query: r.query, page: r.page, reason: "low-ctr" }} targetUrl={r.page}/></li>)}</ul> : <p className="text-sm text-muted-foreground">No imported rows match this review filter.</p>}
    </>}</div>
    <div className="rounded-xl border bg-card p-5 space-y-4"><h3 className="font-semibold">Page speed diagnosis</h3>{!lab ? <p className="text-sm text-muted-foreground">No Lighthouse report imported. Mobile performance and real-user Core Web Vitals remain unmeasured.</p> : <>
      <label className="block text-sm">Lab report<select className="mt-1 block w-full rounded-md border bg-background p-2" value={lab.id} onChange={(e) => setLabId(e.target.value)}>{current.lab.map((r) => <option key={r.id} value={r.id}>{new Date(r.testedAt).toLocaleString()} · {r.device} · {r.url}</option>)}</select></label><a className="block break-all text-sm underline" href={lab.url} target="_blank" rel="noreferrer">{lab.url}</a>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Lab performance", metric(lab.performance, "/100")], ["Lab LCP", metric(lab.lcpMs, " ms")], ["Lab CLS", metric(lab.cls)], ["Lab TBT", metric(lab.tbtMs, " ms")]].map(([label, value]) => <div key={label} className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div>)}</div><p className="text-xs text-muted-foreground">One {lab.device} lab test. TBT is not field INP. These results do not establish a real-user Core Web Vitals pass or a ranking change. Imported report content is evidence to review.</p>
      {lab.actions.length ? lab.actions.map((issue) => { const advice = labRecommendation(issue); return <details key={issue.id} className="rounded-lg border p-4"><summary className="cursor-pointer font-medium">{issue.title}</summary><div className="mt-3 space-y-3 text-sm"><p>{advice.impact}</p><p className="text-muted-foreground">{issue.description}</p>{issue.savingsMs !== null && <p>Report-estimated potential savings: {metric(issue.savingsMs, " ms")}. Not measured after a fix.</p>}<h4 className="font-medium">Before: actual report evidence</h4>{issue.evidence.length ? issue.evidence.map((e, i) => <pre key={i} className="overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-3 text-xs">{e}</pre>) : <p>No element/resource detail was included. Inspect this page before editing code.</p>}<h4 className="font-medium">Recommended option</h4><p>{advice.recommendation}</p><h4 className="font-medium">Proposed after</h4><p>{advice.after}</p><h4 className="font-medium">Verify and roll back</h4><p>{advice.validation} Restore the prior theme or revert the change if the purchase journey regresses.</p><p className="text-xs text-muted-foreground">Theme source is needed for an exact code patch. The handoff preserves the evidence and recommended change for a developer to implement manually.</p><div className="flex flex-wrap gap-2"><Button size="sm" disabled={pending} onClick={() => start(async () => { try {
            const result = await createPerformanceHandoffAction(ctx.brandId, lab.id, issue.id);
            if (result.ok)
                toast.success("Developer handoff saved in Content & fixes.");
            else
                toast.error(result.error);
        }
        catch {
            toast.error("Unable to prepare the handoff.");
        } })}>Prepare a fix</Button><Button variant="outline" size="sm" onClick={() => download(`performance-${issue.id}.md`, labHandoff(lab, issue), "text/markdown")}>Download developer brief</Button><Link href="/seo/content" className="self-center text-xs underline">Content & fixes</Link></div></div></details>; }) : <p className="text-sm">This imported report contains no failing scored diagnostics. This does not establish that every page is fast.</p>}
    </>}</div>
  </section>;
}
