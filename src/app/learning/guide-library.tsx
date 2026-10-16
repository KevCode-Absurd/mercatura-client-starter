"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Search } from "lucide-react";
import type { GuideSummary } from "@/lib/learning/presentation";
export function GuideLibrary({ category, lessons, completed }: {
    category: string;
    lessons: GuideSummary[];
    completed: string[];
}) {
    const [topic, setTopic] = useState("All topics");
    const [query, setQuery] = useState("");
    const [limit, setLimit] = useState(18);
    const topics = [...new Set(lessons.map((l) => l.topic))];
    const matches = lessons.filter((l) => (topic === "All topics" || l.topic === topic) && `${l.title} ${l.summary} ${l.topic} ${l.tags.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
    return <section className="mt-10" aria-label="Strategy library">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-serif text-3xl">The strategy library</h2><p className="mt-2 text-sm text-muted-foreground">{lessons.filter((l) => completed.includes(l.id)).length} of {lessons.length} guides completed · {topics.length} topics</p></div><label className="flex w-full items-center gap-2 rounded-full border bg-card px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring sm:w-80"><Search className="size-4 text-muted-foreground"/><input aria-label="Search this category" className="h-10 w-full bg-transparent text-sm outline-none" placeholder="Find a strategy…" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(18); }}/></label></div>
    <div className="mb-6 flex flex-wrap gap-2" aria-label="Filter by topic">{["All topics", ...topics].map((t) => <button key={t} aria-pressed={topic === t} onClick={() => { setTopic(t); setLimit(18); }} className={`rounded-full border px-3 py-2 text-xs transition-colors ${topic === t ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:border-primary"}`}>{t}{t !== "All topics" && <span className="ml-2 opacity-70">{lessons.filter((l) => l.topic === t).length}</span>}</button>)}</div>
    <p className="mb-4 text-xs text-muted-foreground" role="status">{matches.length} guides{topic !== "All topics" ? ` in ${topic}` : ""}</p>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{matches.slice(0, limit).map((lesson) => <Link href={`/learning/${category}/${lesson.id}`} key={lesson.id} className="group flex flex-col rounded-xl border bg-card p-6 hover:border-primary" data-testid="strategy-guide"><div className="mb-3 flex items-start justify-between gap-3"><span className="text-xs font-medium text-primary">{lesson.topic}</span>{completed.includes(lesson.id) ? <CheckCircle2 aria-label="Completed" className="size-4 shrink-0 text-primary"/> : <ArrowUpRight className="size-4 shrink-0 text-muted-foreground"/>}</div><h3 className="text-lg font-semibold leading-snug">{lesson.title}</h3><p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{lesson.summary}</p><div className="mt-5 flex flex-wrap gap-3 border-t pt-4 text-xs text-muted-foreground"><span>{lesson.minutes} min read</span><span className="capitalize">{lesson.effort} effort to apply</span></div></Link>)}</div>
    {!matches.length && <p className="rounded-xl border p-10 text-center text-muted-foreground">No guides match these filters. Try another topic or search term.</p>}
    {matches.length > limit && <button onClick={() => setLimit(limit + 18)} className="mt-6 rounded-full border px-5 py-2 text-sm hover:bg-accent">Show more guides ({matches.length - limit} remaining)</button>}
  </section>;
}
