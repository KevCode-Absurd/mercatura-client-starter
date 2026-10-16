"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ExternalLink, Search } from "lucide-react";
import type { SeoGuideSummary, SeoSource } from "@/lib/seo/curriculum/types";
import { disciplineGuides, disciplineSources, filterGuides, type DisciplineFilter } from "@/lib/seo/curriculum/filter";
import { cn } from "@/lib/utils";
type Props = {
    guides: SeoGuideSummary[];
    sources: SeoSource[];
    completed: string[];
    startingPaths: Record<DisciplineFilter, {
        id: string;
        reason: string;
    }[]>;
};
export function SeoGuideLibrary({ guides, sources, completed, startingPaths }: Props) {
    const [discipline, setDiscipline] = useState<DisciplineFilter>("All");
    const [tab, setTab] = useState<"start" | "library" | "sources">("start");
    const [query, setQuery] = useState("");
    const [topic, setTopic] = useState("All topics");
    const [source, setSource] = useState("All sources");
    const [unread, setUnread] = useState(false);
    const scopedGuides = disciplineGuides(guides, discipline);
    const scopedSources = disciplineSources(sources, discipline);
    const topics = [...new Set(scopedGuides.map(g => g.topic))];
    const topTen = startingPaths[discipline];
    const filtered = filterGuides(guides, { discipline, topic, source, query, unread }, completed);
    const showSource = (id: string) => { setSource(id); setTopic("All topics"); setQuery(""); setUnread(false); setTab("library"); };
    const reset = () => { setQuery(""); setTopic("All topics"); setSource("All sources"); setUnread(false); };
    return <section id="curriculum" className="scroll-mt-24" aria-label="Search learning curriculum">
    <div className="mb-6 rounded-2xl border bg-card p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Choose your discipline</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by discipline">
        {(["All", "SEO", "AEO", "GEO"] as const).map(value => <button key={value} type="button" aria-pressed={discipline === value} onClick={() => { setDiscipline(value); reset(); }} className={cn("rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors", discipline === value ? "border-primary bg-primary text-primary-foreground" : "border-transparent bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground")}>{value === "All" ? "All disciplines" : `${value} only`} <span className="ml-2 text-xs tabular-nums opacity-75">{disciplineGuides(guides, value).length}</span></button>)}
      </div>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">SEO: search discovery and store foundations. AEO: clear, accurate buyer answers. GEO: generated-answer visibility, citations and measurement. These overlap; each guide has one primary discipline. This filter applies to all three views below.</p>
    </div>
    <div className="mb-8 flex flex-wrap gap-2 border-b pb-4" role="group" aria-label="Knowledge base views">
      {([["start", "Top 10 to start"], ["library", `All ${scopedGuides.length} guides`], ["sources", `Sources · ${scopedSources.length}`]] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setTab(value)} aria-pressed={tab === value} className={cn("rounded-full px-5 py-2.5 text-sm font-medium transition-colors", tab === value ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground")}>{label}</button>)}
    </div>
    {tab === "start" && <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">{discipline === "All" ? "Across SEO, AEO and GEO" : `${discipline} starting path`}</p><h2 className="font-serif text-3xl">Start with the work that makes the rest useful.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">An editorial reading order for DTC stores. Adapt it to your catalog and evidence; this is not a personalized ranking of your brand’s opportunities.</p></div><Link href="/seo/priorities" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Open your brand’s growth plan <ArrowRight className="size-4"/></Link></div>
      <ol className="grid gap-4 lg:grid-cols-2">{topTen.map((item, i) => {
                const g = guides.find(g => g.id === item.id)!;
                return <li key={g.id}><Link href={`/seo/learn?id=${g.id}`} className="group flex h-full gap-5 rounded-2xl border bg-card p-6 transition-colors hover:border-primary" data-testid="seo-start-guide"><span className="font-serif text-4xl tabular-nums text-primary/40">{String(i + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{g.discipline} · {g.topic} · {g.minutes} min read</p><h3 className="mt-2 text-lg font-semibold leading-snug group-hover:text-primary">{g.title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.reason}</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary">{completed.includes(g.id) ? <><Check className="size-3.5"/> Read · revisit guide</> : <>Read guide <ArrowRight className="size-3.5"/></>}</span></div></Link></li>;
            })}</ol>
      <button type="button" onClick={() => { reset(); setTab("library"); }} className="mt-7 inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium hover:bg-accent">Explore all {scopedGuides.length} guides across {topics.length} topics <ArrowRight className="size-4"/></button>
    </div>}
    {tab === "library" && <div>
      <div className="mb-6 flex flex-wrap items-center gap-3"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border bg-card px-4"><Search className="size-4 shrink-0 text-muted-foreground"/><input aria-label="Search learning guides" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products, answers, citations…" className="h-12 min-w-0 w-full bg-transparent text-sm outline-none"/></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={unread} onChange={e => setUnread(e.target.checked)} className="accent-primary"/>Unread only</label></div>
      <div className="grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)]"><aside className="space-y-5 lg:sticky lg:top-24"><label className="block text-xs font-semibold text-muted-foreground">Source filter<select aria-label="Filter by source" value={source} onChange={e => setSource(e.target.value)} className="mt-2 w-full rounded-lg border bg-card p-2 text-sm font-normal text-foreground"><option>All sources</option>{scopedSources.map(s => <option key={s.id} value={s.id}>{s.id} · {s.title}</option>)}</select></label><nav aria-label="Learning topics" className="flex flex-wrap gap-1 lg:block lg:space-y-1">{["All topics", ...topics].map(t => <button key={t} type="button" aria-pressed={topic === t} onClick={() => setTopic(t)} className={cn("flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm lg:w-full", topic === t ? "bg-accent font-medium text-primary" : "text-muted-foreground hover:bg-muted")}><span>{t}</span><span className="text-xs tabular-nums">{t === "All topics" ? scopedGuides.length : scopedGuides.filter(g => g.topic === t).length}</span></button>)}</nav><button type="button" onClick={reset} className="text-xs text-primary hover:underline">Reset filters</button></aside>
      <div><p className="mb-4 text-sm text-muted-foreground" role="status">{filtered.length} {filtered.length === 1 ? "guide" : "guides"}{topic !== "All topics" ? ` in ${topic.toLowerCase()}` : ` in the ${discipline === "All" ? "complete" : discipline} library`}</p><div className="grid gap-4 xl:grid-cols-2">{filtered.map(g => <Link key={g.id} href={`/seo/learn?id=${g.id}`} className="group flex flex-col rounded-2xl border bg-card p-6 hover:border-primary" data-testid="seo-library-guide"><div className="flex items-center justify-between gap-3 text-xs text-primary"><span>{g.discipline} · {g.topic}</span>{completed.includes(g.id) ? <Check aria-label="Read" className="size-4"/> : <BookOpen className="size-4"/>}</div><h3 className="mt-4 text-lg font-semibold leading-snug group-hover:text-primary">{g.title}</h3><p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">{g.summary}</p><div className="mt-6 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground"><span>{g.minutes} min read · {g.effort} effort</span><ArrowRight className="size-4 text-primary"/></div></Link>)}</div>{!filtered.length && <div className="rounded-2xl border border-dashed p-10 text-center"><p className="text-sm text-muted-foreground">No guides match these filters. Excluded sources do not supply implementation guides.</p><button type="button" onClick={reset} className="mt-4 text-sm text-primary hover:underline">Show all {discipline === "All" ? "learning" : discipline} guides</button></div>}</div></div>
    </div>}
    {tab === "sources" && <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">eCom Intelligence / SEO + Answer and Generative Engines</p><h2 className="font-serif text-3xl">The sources behind the knowledge base.</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">Showing {scopedSources.length} source documents and {scopedSources.reduce((n, s) => n + s.cards, 0)} reviewed cards for {discipline === "All" ? "all disciplines" : discipline}. The complete register covers {sources.length} documents and {sources.reduce((n, s) => n + s.cards, 0)} cards, alongside the merged playbooks and ecommerce reviews. AEO and GEO share one nine-document collection; it is counted once in the total. These are processed source digests and cards, not independently verified recordings or performance results.</p>
      <div className="my-6 rounded-xl border bg-accent/25 p-5 text-sm leading-7"><strong>How they were adapted.</strong> Repeated ideas were consolidated into practical DTC exercises. The SEO collection contributes 15 sources and excludes one; all nine AEO/GEO sources contribute selected methods with qualifications. Their source review found no measured ecommerce case study. Subscription, marketplace and seasonal applications extend documented gaps. Ranking guarantees, fabricated consensus, covert paid endorsements and source-poisoning tactics are excluded. Current technical references qualify claims about crawlers, schema and special AI formatting.</div>
      <div className="space-y-4">{scopedSources.map(s => {
                const count = scopedGuides.filter(g => g.sourceIds.includes(s.id)).length;
                return <article key={s.id} className="rounded-2xl border bg-card p-6" data-testid="seo-source"><div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-semibold text-primary">{s.id} · {s.disciplines.join(" / ")} · {s.cards} cards</span><span className="rounded-full bg-muted px-3 py-1">{s.disposition}</span></div><h3 className="mt-3 text-lg font-semibold">{s.title}</h3><div className="mt-4 grid gap-5 text-sm leading-7 md:grid-cols-2"><div><p className="font-medium">What we take from it</p><p className="mt-1 text-muted-foreground">{s.use}</p></div><div><p className="font-medium">What needs qualification</p><p className="mt-1 text-muted-foreground">{s.caution}</p></div></div><div className="mt-5 flex flex-wrap gap-5 border-t pt-4 text-sm"><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">Open original source <ExternalLink className="size-3.5"/></a>{count > 0 && <button type="button" onClick={() => showSource(s.id)} className="inline-flex items-center gap-2 text-primary hover:underline">Explore {count} related guides <ArrowRight className="size-3.5"/></button>}</div></article>;
            })}</div><p className="mt-5 text-xs leading-6 text-muted-foreground">Original Drive links require your existing access. Source titles retain their original claims for identification; those claims are not promises from this learning guide. Editorial review: 9 October 2026.</p>
    </div>}
  </section>;
}
