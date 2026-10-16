"use client";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import type { SeoArtifact } from "@/lib/seo/content";
import { routePlaybooks } from "@/lib/seo/answer-research-data";
import { setAnswerTaskAction } from "./answer-research-actions";
export function AnswerImplementationPanel({ artifact, stale, dirty }: {
    artifact: SeoArtifact;
    stale: boolean;
    dirty: boolean;
}) {
    const router = useRouter(), [pending, start] = useTransition(), entry = artifact.answerEntry;
    const [ready, setReady] = useState(false);
    useEffect(() => setReady(true), []);
    const [tasks, updateTask] = useOptimistic(entry?.tasks ?? [], (current, update: {
        taskId: string;
        done: boolean;
    }) => current.map(t => t.id === update.taskId ? { ...t, done: update.done } : t));
    if (!entry)
        return null;
    return <section className="rounded-xl border bg-card p-5" data-testid="answer-implementation">
    <h2 className="font-semibold">Implementation checklist</h2>
    <p className="mt-2 text-xs text-muted-foreground">{routePlaybooks[entry.route].title} · {entry.platform} · {tasks.filter(t => t.done).length}/{tasks.length} tasks recorded{pending ? " · Saving…" : ""}</p>
    <p className="mt-2 text-xs text-muted-foreground">Tick completed work and keep evidence in the package. These records do not publish changes or establish AI visibility.</p>
    <div className="mt-3 space-y-3">{tasks.map(task => <label key={task.id} className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={task.done} disabled={!ready || pending || stale || dirty} onChange={e => { const done = e.target.checked; start(async () => { updateTask({ taskId: task.id, done }); try {
        const result = await setAnswerTaskAction(artifact.brandId, artifact.id, artifact.revision, task.id, done);
        if (!result.ok)
            toast.error(result.error);
        else
            router.refresh();
    }
    catch {
        toast.error("Could not save the task record.");
    } }); }}/><span>{task.label}</span></label>)}</div>
    <details className="mt-4 border-t pt-3"><summary className="cursor-pointer text-sm font-medium">Research brief and source evidence</summary><article className="mt-3 max-h-96 space-y-3 overflow-auto break-words text-xs leading-6 [&_h1]:font-semibold [&_h2]:font-semibold [&_a]:text-primary"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: () => null }}>{entry.brief}</ReactMarkdown></article></details>
    <Link href="/seo/geo" className="mt-4 inline-block text-sm text-primary underline">Return to answer research and saved work</Link>
  </section>;
}
