"use client";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { seoStudy, studyDecisions, studyFindings, studyNotesMarkdown, type StudyFinding } from "@/lib/seo/study";
function FindingDetails({ finding: f, anchored = false }: {
    finding: StudyFinding;
    anchored?: boolean;
}) {
    return <details id={anchored ? `study-${f.id}` : undefined} className="min-w-0 scroll-mt-24 rounded-xl border bg-card p-4">
    <summary className="cursor-pointer text-sm font-semibold leading-6"><span className="mr-2 text-xs font-medium text-primary">{f.decision}</span>{f.title}</summary>
    <div className="mt-4 space-y-3 text-sm leading-6 [overflow-wrap:anywhere]">
      <p className="text-xs text-muted-foreground">PDF pages {f.pages.join(", ")} · {f.entries.length ? `Entries ${f.entries.join(", ")} · ` : ""}Study classification: {f.studyMark}</p>
      <p><strong>D2C application:</strong> {f.action}</p>
      <p><strong>Evidence:</strong> {f.evidence}</p>
      <p className="text-muted-foreground"><strong>Limits:</strong> {f.limitation}</p>
      <p><strong>Keep comparable:</strong> {f.keep}</p>
      <p><strong>Measure:</strong> {f.measure}</p>
      <p><strong>Revert or revise:</strong> {f.revert}</p>
      <ul className="space-y-2">{f.sources.map(s => <li key={s.url}><a href={s.url} className="text-primary underline" target="_blank" rel="noreferrer">{s.title}</a><span className="ml-2 text-xs text-muted-foreground">{s.checked ? `Checked ${s.checked}` : "Reference; not independently checked"}</span></li>)}</ul>
    </div>
  </details>;
}
export function StudyEvidenceNotes({ findings }: {
    findings: StudyFinding[];
}) {
    if (!findings.length)
        return null;
    return <section className="my-5 space-y-3" data-testid="seo-study-notes">
    <h2 className="text-sm font-semibold">Research for this D2C workflow</h2>
    <p className="text-xs leading-6 text-muted-foreground">Study outcomes are context, not forecasts for your store. Check the buying journey and measure purchases and revenue separately from traffic or AI citations.</p>
    {findings.map(f => <FindingDetails key={f.id} finding={f}/>)}
    <Link href="/seo/learn#study-evidence" className="block text-xs text-primary underline">Explore the complete D2C evidence library</Link>
  </section>;
}
export function StudyEvidenceLibrary() {
    const [query, setQuery] = useState("");
    const [decision, setDecision] = useState("All evidence");
    const [pageType, setPageType] = useState("All pages");
    const term = query.trim().toLowerCase();
    const pdfPage = /^\d+$/.test(term) ? Number(term) : null;
    const matches = studyFindings.filter(f => (decision === "All evidence" || f.decision === decision) && (pageType === "All pages" || f.pageTypes.includes(pageType as StudyFinding["pageTypes"][number])) && (pdfPage !== null ? f.pages.includes(pdfPage) : `${f.title} ${f.action} ${f.evidence} ${f.limitation}`.toLowerCase().includes(term)));
    function download() {
        const url = URL.createObjectURL(new Blob(["# D2C SEO research and test brief\n\n" + studyNotesMarkdown(matches)], { type: "text/markdown" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "d2c-seo-research-brief.md";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return <section id="study-evidence" className="mt-12 scroll-mt-24 space-y-5 rounded-2xl border bg-accent/15 p-5 md:p-8" data-testid="seo-study-library">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-widest text-primary">The SEO Meta Study · D2C review</p><h2 className="mt-3 font-serif text-3xl">Evidence for your next store change.</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">All {seoStudy.pages} PDF pages reviewed. {studyFindings.length} adaptations for product pages, collections, buying guides and store operations. Practical means a useful method to evaluate; experimental ideas require a scoped test.</p></div><Button variant="outline" disabled={!matches.length} onClick={download}>Download filtered test brief</Button></div>
    <p className="text-xs leading-6 text-muted-foreground">{seoStudy.author} · {seoStudy.edition}. {seoStudy.limitation} Current platform guidance was checked selectively on {seoStudy.reviewedAt}.</p>
    <a href={seoStudy.reviewUrl} className="inline-block text-sm text-primary underline" download>Download the page-by-page review</a>
    <div className="grid gap-3 md:grid-cols-3">
      <label className="space-y-2 text-xs font-medium">Search findings or PDF page<Input aria-label="Search study findings" value={query} onChange={e => setQuery(e.target.value)} placeholder="Stock, titles, collection, 76…"/></label>
      <label className="space-y-2 text-xs font-medium">Decision<select aria-label="Study decision" className="w-full rounded-md border bg-background p-2 text-sm" value={decision} onChange={e => setDecision(e.target.value)}>{["All evidence", ...studyDecisions].map(d => <option key={d}>{d}</option>)}</select></label>
      <label className="space-y-2 text-xs font-medium">Store page<select aria-label="Study page type" className="w-full rounded-md border bg-background p-2 text-sm" value={pageType} onChange={e => setPageType(e.target.value)}>{["All pages", "Product", "Collection", "Guide", "Store"].map(p => <option key={p}>{p}</option>)}</select></label>
    </div>
    <p role="status" className="text-xs text-muted-foreground">{matches.length} of {studyFindings.length} findings</p>
    <div className="grid gap-3 xl:grid-cols-2">{matches.map(f => <FindingDetails key={f.id} finding={f} anchored/>)}</div>
    {!matches.length && <p className="text-sm">No findings match these filters. Change the decision, page type or search.</p>}
  </section>;
}
