"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { controlJobAction, stopSmallJobsAction } from "@/app/run-actions";
import { useAdvanced } from "@/components/mode";
import type { ActivityView } from "@/lib/jobs/activity";
import { cn } from "@/lib/utils";
import { plainMessage } from "@/lib/plain-message";
import { aboutTime } from "@/lib/studio/timing";
import { pollWhileVisible } from "@/lib/visible-polling";
const mins = (iso: string) => {
    const m = Math.max(0, Math.round((Date.now() - new Date(iso.endsWith("Z") ? iso : `${iso}Z`).getTime()) / 60000));
    return m < 1 ? "just now" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};
export function RunBar({ initial }: {
    initial: ActivityView;
}) {
    const [view, setView] = useState(initial);
    const [pending, start] = useTransition();
    const router = useRouter();
    const busy = useRef(false);
    const advanced = useAdvanced();
    const load = useCallback(async () => {
        if (busy.current)
            return;
        busy.current = true;
        try {
            const res = await fetch("/api/jobs", { cache: "no-store" });
            if (res.ok)
                setView((await res.json()) as ActivityView);
        }
        catch {
        }
        finally {
            busy.current = false;
        }
    }, []);
    const told = useRef<Set<string> | null>(null);
    useEffect(() => {
        const done = view.finished ?? [];
        if (!told.current) {
            told.current = new Set(done.map((f) => f.id));
            return;
        }
        let changed = false;
        for (const f of done) {
            if (told.current.has(f.id))
                continue;
            told.current.add(f.id);
            const open = { label: "Open", onClick: () => router.push(f.href) };
            if (f.outcome === "failed")
                toast.error(`${f.label} stopped: ${(advanced ? (f.error ?? "it did not finish") : f.error ? plainMessage(f.error) : "it did not finish").slice(0, 160)}`, { duration: 20000, action: open });
            else
                toast.success(f.said, { duration: 12000, action: open });
            changed = true;
        }
        if (changed)
            router.refresh();
    }, [view.finished, router, advanced]);
    const live = view.jobs.length > 0 || view.small.running + view.small.queued > 0;
    useEffect(() => {
        return pollWhileVisible(load, live ? 3000 : 12000);
    }, [load, live]);
    const act = (fn: () => Promise<unknown>) => start(async () => {
        await fn();
        await load();
        router.refresh();
    });
    const bar = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const root = document.documentElement;
        const el = bar.current;
        if (!live || !el) {
            root.style.removeProperty("--run-bar");
            return;
        }
        const set = () => root.style.setProperty("--run-bar", `${el.offsetHeight}px`);
        set();
        const watch = new ResizeObserver(set);
        watch.observe(el);
        return () => {
            watch.disconnect();
            root.style.removeProperty("--run-bar");
        };
    }, [live, view.jobs.length]);
    if (!live)
        return null;
    const small = view.small.running + view.small.queued;
    return (<div ref={bar} className="fixed bottom-0 left-0 right-0 z-40 border-t bg-signal pr-14 text-signal-foreground" data-testid="run-bar" role="status">
      <ul className="divide-y divide-foreground/15 text-sm">
        {view.jobs.map((j) => (<li key={j.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5" data-testid="run-row">
            <span className="flex w-24 shrink-0 items-center gap-1.5 font-bold">
              {j.status === "running" ? <Loader2 className="size-3.5 animate-spin"/> : j.status === "paused" ? <Pause className="size-3.5"/> : null}
              {j.stopping ? "Stopping" : j.status === "running" ? "Running" : j.status === "paused" ? "Paused" : "Waiting"}
            </span>
            <Link href={j.href} className="min-w-0 flex-1 truncate font-medium hover:underline" title={j.note ?? j.label}>
              {j.label}
            </Link>
            <span className="tabular-nums text-foreground/70">
              {mins(j.since)}
              {j.expect > 0 ? ` of ${aboutTime(j.expect)}, from past runs` : ""}
              {advanced && j.spent > 0 ? `, $${j.spent.toFixed(2)} so far` : ""}
            </span>
            <span className="flex shrink-0 gap-1.5">
              {j.status === "paused" ? (<Ctl onClick={() => act(() => controlJobAction(j.id, "resume"))} disabled={pending} testid="run-resume">
                  <Play className="size-3.5"/> Resume
                </Ctl>) : (<Ctl onClick={() => act(() => controlJobAction(j.id, "pause"))} disabled={pending || j.stopping} testid="run-pause">
                  <Pause className="size-3.5"/> Pause
                </Ctl>)}
              <Ctl onClick={() => act(() => controlJobAction(j.id, "stop"))} disabled={pending || j.stopping} testid="run-stop" strong>
                <Square className="size-3.5"/> Stop
              </Ctl>
            </span>
          </li>))}
        {small > 0 && (<li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5">
            <span className="flex w-24 shrink-0 items-center gap-1.5 font-bold">
              <Loader2 className="size-3.5 animate-spin"/> Running
            </span>
            <span className="min-w-0 flex-1">
              Reading sources and references: {view.small.running} in progress, {view.small.queued} waiting{view.small.each > 0 ? `. ${aboutTime(view.small.each)} each, from past runs` : ""}
            </span>
            <Ctl onClick={() => act(() => stopSmallJobsAction())} disabled={pending} testid="run-stop-small" strong>
              <Square className="size-3.5"/> Stop
            </Ctl>
          </li>)}
      </ul>
    </div>);
}
function Ctl({ children, onClick, disabled, strong, testid }: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    strong?: boolean;
    testid: string;
}) {
    return (<button type="button" onClick={onClick} disabled={disabled} data-testid={testid} className={cn("inline-flex h-7 items-center gap-1 rounded-md border border-input px-2.5 text-xs font-bold disabled:opacity-50", strong ? "bg-foreground text-background hover:bg-foreground/85" : "bg-background hover:bg-secondary")}>
      {children}
    </button>);
}
