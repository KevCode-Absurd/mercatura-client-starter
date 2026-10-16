"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Database, FlaskConical, HeartHandshake, LayoutTemplate, Lightbulb, Search, Sparkles, Repeat } from "lucide-react";
import type { CategoryId } from "@/lib/learning/types";
import type { GuideSummary } from "@/lib/learning/presentation";
const icons = { data: Database, insights: Lightbulb, "creative-studio": Sparkles, "ad-monitoring": BarChart3, experiments: FlaskConical, "landing-pages": LayoutTemplate, retention: Repeat, "customer-experience": HeartHandshake };
type ModuleSummary = {
    id: CategoryId;
    title: string;
    description: string;
    lessons: GuideSummary[];
};
export function LearningCatalog({ modules, completed }: {
    modules: ModuleSummary[];
    completed: string[];
}) {
    const [query, setQuery] = useState("");
    const [limit, setLimit] = useState(24);
    const q = query.trim().toLowerCase();
    const results = modules.flatMap((m) => m.lessons.filter((l) => `${m.title} ${l.title} ${l.topic} ${l.summary} ${l.tags.join(" ")}`.toLowerCase().includes(q)).map((l) => ({ ...l, category: m.id, categoryTitle: m.title })));
    return <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><h2 className="font-serif text-3xl">Explore a category</h2><label className="flex w-full items-center gap-2 rounded-full border bg-card px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring sm:w-80"><Search className="size-4 text-muted-foreground"/><input aria-label="Search strategies" className="h-10 w-full bg-transparent text-sm outline-none" placeholder="Search methods, topics, strategies…" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(24); }}/></label></div>
    {q ? <section aria-label="Search results"><p className="mb-4 text-sm text-muted-foreground" role="status">{results.length} matching guides</p><div className="grid gap-3 md:grid-cols-2">{results.slice(0, limit).map((l) => <Link key={`${l.category}:${l.id}`} href={`/learning/${l.category}/${l.id}`} className="rounded-xl border bg-card p-5 hover:border-primary"><span className="text-xs text-primary">{l.categoryTitle} · {l.topic}</span><h3 className="mt-2 font-semibold">{l.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{l.summary}</p><p className="mt-4 text-xs text-muted-foreground">{l.minutes} min read</p></Link>)}</div>{!results.length && <p className="py-12 text-center text-muted-foreground">Try a broader term, such as “testing”, “customers”, or “email”.</p>}{results.length > limit && <button onClick={() => setLimit(limit + 24)} className="mt-5 rounded-full border px-5 py-2 text-sm hover:bg-accent">Show more guides</button>}</section>
            : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{modules.map((m, index) => {
                    const Icon = icons[m.id];
                    const done = m.lessons.filter((l) => completed.includes(l.id)).length;
                    const topics = [...new Set(m.lessons.map((l) => l.topic))];
                    return <Link key={m.id} href={`/learning/${m.id}`} className="group flex flex-col rounded-2xl border bg-card p-6 transition-colors hover:border-primary hover:bg-accent/20" data-testid={`learning-${m.id}`}>
        <div className="mb-6 flex items-center justify-between"><span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary"><Icon className="size-5"/></span><span className="text-xs tabular-nums text-muted-foreground">0{index + 1}</span></div>
        <h3 className="text-lg font-semibold">{m.title}</h3><p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{m.description}</p><p className="mt-4 text-xs leading-relaxed text-primary">{topics.slice(0, 3).join(" · ")}{topics.length > 3 ? ` · +${topics.length - 3} topics` : ""}</p>
        <div className="mt-6 flex items-center justify-between text-xs"><span>{done ? `${done} of ${m.lessons.length} completed` : `${m.lessons.length} guides`}</span><ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-1"/></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${100 * done / Math.max(1, m.lessons.length)}%` }}/></div>
      </Link>;
                })}</div>}
  </>;
}
