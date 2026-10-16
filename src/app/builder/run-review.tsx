"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, CircleDashed, Copy, Loader2, RotateCcw, TriangleAlert, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkingMark } from "@/components/working";
import { cn } from "@/lib/utils";
import type { BuilderScript, RunJob, RunProgress } from "./actions";
import { metaOf } from "./script-text";
export type Verdict = "approved" | "rejected" | "undecided";
export const verdictOf = (s: BuilderScript): Verdict => (s.kit.review === "rejected" ? "rejected" : s.status === "draft" ? "undecided" : "approved");
const copy = (text: string, what: string) => navigator.clipboard.writeText(text).then(() => toast.success(`${what} copied.`), () => toast.error("Could not copy. Select the text instead."));
const scriptText = (s: BuilderScript) => s.lines.join("\n");
export function allText(s: BuilderScript): string {
    const script = s.versions?.length ? s.versions.flatMap((v, i) => [...(i ? [""] : []), `SCRIPT, VERSION ${v.n}${v.n === 1 ? " (main)" : ""}`, v.lines.join("\n")]) : ["SCRIPT", scriptText(s)];
    return [s.title, metaOf(s), "", ...script, ...(s.kit.headline ? ["", "HEADLINE", s.kit.headline] : []), ...(s.kit.primary_text ? ["", "PRIMARY TEXT", s.kit.primary_text] : []), ...(s.kit.more_texts ?? []).flatMap((t, i) => ["", `HEADLINE, VERSION ${i + 2}`, t.headline, "", `PRIMARY TEXT, VERSION ${i + 2}`, t.primary_text]), ...(s.kit.image_prompts ?? []).flatMap((p) => ["", `IMAGE PROMPT: ${p.title}`, p.prompt])].join("\n");
}
function CopyButton({ text, what, label }: {
    text: string;
    what: string;
    label?: string;
}) {
    return (<button type="button" onClick={() => copy(text, what)} className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Copy the ${what.toLowerCase()}`}>
      <Copy className="size-3.5"/>
      {label ?? "Copy"}
    </button>);
}
function Part({ title, text, what, big }: {
    title: string;
    text: string;
    what: string;
    big?: boolean;
}) {
    return (<div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">{title}</p>
        <CopyButton text={text} what={what}/>
      </div>
      <p className={cn("mt-1 whitespace-pre-wrap rounded-md bg-muted/50 px-4 py-3 leading-relaxed", big ? "text-base" : "text-[15px]")}>{text}</p>
    </div>);
}
function Hooks({ s, at, pick }: {
    s: BuilderScript;
    at: number;
    pick: (n: number) => void;
}) {
    const versions = s.versions ?? [];
    return (<div className="min-w-0" data-testid="builder-script-hooks" data-count={versions.length}>
      <p className="text-xs font-semibold text-muted-foreground">
        {versions.length} hooks, 1 body: {versions.length} versions of this ad
      </p>
      <ul className="mt-1 space-y-1">
        {versions.map((v) => (<li key={v.n} className={cn("flex items-start gap-2 rounded-md border px-2 py-1.5 text-sm", v.n === at ? "border-primary bg-primary/5" : "bg-background")} data-testid="builder-hook" data-version={v.n}>
            <button type="button" onClick={() => pick(v.n)} className="min-w-0 flex-1 text-left" aria-pressed={v.n === at} aria-label={`Show version ${v.n}`}>
              <span className="mr-1.5 inline-flex min-w-5 justify-center rounded bg-muted px-1 text-xs font-semibold tabular-nums">{v.n}</span>
              {v.opens}
              {v.n === 1 && <span className="ml-1.5 text-xs text-muted-foreground">(main)</span>}
            </button>
            <CopyButton text={v.lines.join("\n")} what={`Version ${v.n}`} label={`Copy version ${v.n}`}/>
          </li>))}
      </ul>
    </div>);
}
function Parts({ s, big, making }: {
    s: BuilderScript;
    big?: boolean;
    making?: boolean;
}) {
    const [at, setAt] = useState(1);
    const shown = s.versions?.find((v) => v.n === at) ?? s.versions?.[0];
    const words = !!s.kit.headline || !!s.kit.primary_text || !!s.kit.more_texts?.length;
    return (<div className="space-y-4">
      <div className={cn("grid gap-x-8 gap-y-4", words ? "lg:grid-cols-2" : "max-w-3xl")} data-testid="builder-script-parts" data-across={words}>
        <div className="min-w-0 space-y-3">
          {s.versions && s.versions.length > 1 && <Hooks s={s} at={shown?.n ?? 1} pick={setAt}/>}
          <Part title={shown ? `Script, version ${shown.n}` : "Script"} text={shown ? shown.lines.join("\n") : scriptText(s)} what={shown ? `Version ${shown.n}` : "Script"} big={big}/>
        </div>
        {words && (<div className="min-w-0 space-y-3">
            {s.kit.headline && <Part title="Headline" text={s.kit.headline} what="Headline" big={big}/>}
            {s.kit.primary_text && <Part title="Primary text" text={s.kit.primary_text} what="Primary text" big={big}/>}

            {s.kit.more_texts?.map((t, i) => (<div key={i} className="space-y-3" data-testid="builder-script-text-version">
                <Part title={`Headline, version ${i + 2}`} text={t.headline} what={`Headline, version ${i + 2}`} big={big}/>
                <Part title={`Primary text, version ${i + 2}`} text={t.primary_text} what={`Primary text, version ${i + 2}`} big={big}/>
              </div>))}
          </div>)}
      </div>
      {s.kit.asked && <p className="text-xs text-muted-foreground">Your note: {s.kit.asked}</p>}
      {s.kit.want.images && !!s.kit.image_prompts?.length && (<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6" data-testid="builder-script-pictures">
          {s.kit.image_prompts
                .flatMap((p, i) => {
                const want = s.kit.want.words ?? "without";
                const made = [want !== "with" || !p.words ? { file: p.file, label: p.title } : null, want !== "without" && p.words ? { file: p.words_file, label: `${p.title}, with words` } : null].filter((x): x is {
                    file: string | undefined;
                    label: string;
                } => !!x);
                return made.map((m, j) => ({ key: `${i}-${j}`, ...m }));
            })
                .map((p) => p.file ? (<a key={p.key} href={`/api/${p.file}`} target="_blank" rel="noreferrer" title={p.label}>

                  <img src={`/api/${p.file}?w=480`} alt={p.label} loading="lazy" className="aspect-[4/5] w-full rounded-md border object-cover"/>
                </a>) : (<div key={p.key} className="flex aspect-[4/5] items-center justify-center rounded-md border border-dashed p-2 text-center text-xs text-muted-foreground">
                  {making && !s.kit.error ? (<span className="flex flex-col items-center gap-1">
                      <WorkingMark job="make" className="size-9"/>
                      Being made
                    </span>) : ("Not made")}
                </div>))}
        </div>)}
      {s.kit.image_prompts?.map((p, i) => (<details key={i} className="text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
            {s.kit.want.images ? "How this picture was described" : "Picture description"}: {p.title}
          </summary>
          <div className="mt-1 flex justify-end">
            <CopyButton text={p.prompt} what="Picture description"/>
          </div>
          <p className="whitespace-pre-wrap rounded-md bg-muted/50 px-3 py-2 font-mono text-xs">{p.prompt}</p>
        </details>))}
      {s.kit.error && (<p className="flex items-start gap-1.5 text-xs text-amber-800">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0"/>
          The script was written, but a part that goes with it was not. Open the script to write that part again.
        </p>)}
    </div>);
}
function VerdictButtons({ v, set, busy, size = "sm" }: {
    v: Verdict;
    set: (v: Verdict) => void;
    busy: boolean;
    size?: "sm" | "default";
}) {
    if (v !== "undecided")
        return (<div className="flex items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", v === "approved" ? "bg-emerald-100 text-emerald-900" : "bg-zinc-200 text-zinc-700")} data-testid="builder-verdict">
          {v === "approved" ? <Check className="size-3.5"/> : <X className="size-3.5"/>}
          {v === "approved" ? "Approved" : "Turned down"}
        </span>
        <Button size={size} variant="ghost" onClick={() => set("undecided")} disabled={busy}>
          <Undo2 className="size-4"/>
          Undo
        </Button>
      </div>);
    return (<div className="flex gap-2">
      <Button size={size} onClick={() => set("approved")} disabled={busy} data-testid="builder-approve">
        <Check className="size-4"/>
        Approve
      </Button>
      <Button size={size} variant="outline" onClick={() => set("rejected")} disabled={busy} data-testid="builder-reject">
        <X className="size-4"/>
        Turn down
      </Button>
    </div>);
}
export function ScriptCard({ s, busy, making, onVerdict, onReview }: {
    s: BuilderScript;
    busy: boolean;
    making?: boolean;
    onVerdict: (v: Verdict) => void;
    onReview: () => void;
}) {
    const v = verdictOf(s);
    return (<article className={cn("flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-6", v === "approved" && "border-emerald-300", v === "rejected" && "opacity-70")} data-testid="builder-script" data-verdict={v}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-80">
          <p className="text-xs text-muted-foreground">{metaOf(s)}</p>
          <h3 className="display mt-1 text-2xl">{s.title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <VerdictButtons v={v} set={onVerdict} busy={busy}/>
          <Button size="sm" variant="ghost" onClick={onReview}>
            Read it large
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={`/scripts/${s.id}`}>Edit</Link>
          </Button>
          <CopyButton text={allText(s)} what="Everything" label="Copy all"/>
        </div>
      </div>
      <Parts s={s} making={making}/>
    </article>);
}
export function ScriptRow({ s, when, onOpen }: {
    s: BuilderScript;
    when?: string;
    onOpen: () => void;
}) {
    const v = verdictOf(s);
    return (<button type="button" onClick={onOpen} className={cn("flex w-full min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-md border bg-card px-4 py-2.5 text-left hover:border-primary/50 hover:bg-primary/5", v === "rejected" && "opacity-70")} data-testid="builder-script-row" data-verdict={v}>
      <span className="min-w-0 font-medium">{s.title}</span>
      <span className="min-w-0 flex-1 basis-60 truncate text-xs text-muted-foreground">{metaOf(s)}</span>
      {v !== "undecided" && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", v === "approved" ? "bg-emerald-100 text-emerald-900" : "bg-zinc-200 text-zinc-700")}>{v === "approved" ? "Approved" : "Turned down"}</span>}
      {when && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{when}</span>}
    </button>);
}
export function ReviewDialog({ scripts, startAt, busy, making, onVerdict, onClose }: {
    scripts: BuilderScript[];
    startAt: string | null;
    busy: boolean;
    making?: boolean;
    onVerdict: (id: string, v: Verdict) => void;
    onClose: () => void;
}) {
    const [at, setAt] = useState(0);
    const open = startAt !== null;
    useEffect(() => {
        if (startAt === null)
            return;
        setAt(Math.max(0, scripts.findIndex((s) => s.id === startAt)));
    }, [startAt]);
    const s = scripts[Math.min(at, scripts.length - 1)];
    const move = useCallback((by: number) => setAt((i) => Math.max(0, Math.min(scripts.length - 1, i + by))), [scripts.length]);
    const decide = useCallback((v: Verdict) => {
        if (!s || busy)
            return;
        onVerdict(s.id, v);
        if (v !== "undecided")
            move(1);
    }, [s, busy, onVerdict, move]);
    useEffect(() => {
        if (!open)
            return;
        const key = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable]"))
                return;
            if (e.key === "ArrowRight")
                move(1);
            else if (e.key === "ArrowLeft")
                move(-1);
            else if (e.key.toLowerCase() === "a")
                decide("approved");
            else if (e.key.toLowerCase() === "r")
                decide("rejected");
        };
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    }, [open, move, decide]);
    const left = useMemo(() => scripts.filter((x) => verdictOf(x) === "undecided").length, [scripts]);
    return (<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-3 sm:max-w-[min(76rem,calc(100%-8rem))]" data-testid="builder-review">
        {s && (<>
            <DialogHeader>
              <DialogTitle className="display pr-6 text-2xl font-normal leading-tight">{s.title}</DialogTitle>
              <DialogDescription>
                <span data-testid="builder-review-at">
                  {at + 1} of {scripts.length}
                </span>{" "}
                · {left === 0 ? "all decided" : `${left} still to decide`} · {metaOf(s)}
              </DialogDescription>
            </DialogHeader>

            <div key={s.id} className="min-h-0 flex-1 overflow-y-auto pr-1">
              <Parts s={s} big making={making}/>
            </div>

            <button type="button" onClick={() => move(-1)} disabled={at === 0} aria-label="Previous script" className="absolute -left-14 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-md hover:bg-muted disabled:opacity-30 sm:flex" data-testid="builder-review-prev">
              <ChevronLeft className="size-6"/>
            </button>
            <button type="button" onClick={() => move(1)} disabled={at >= scripts.length - 1} aria-label="Next script" className="absolute -right-14 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-md hover:bg-muted disabled:opacity-30 sm:flex" data-testid="builder-review-next">
              <ChevronRight className="size-6"/>
            </button>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => move(-1)} disabled={at === 0}>
                  <ChevronLeft className="size-4"/>
                  Previous
                </Button>
                <Button size="sm" variant="outline" onClick={() => move(1)} disabled={at >= scripts.length - 1}>
                  Next
                  <ChevronRight className="size-4"/>
                </Button>
                <CopyButton text={allText(s)} what="Everything" label="Copy all"/>
              </div>
              <VerdictButtons v={verdictOf(s)} set={decide} busy={busy} size="default"/>
            </div>
            <p className="hidden text-[11px] text-muted-foreground sm:block">Keys: left and right arrows move, A approves, R turns down.</p>
          </>)}
      </DialogContent>
    </Dialog>);
}
const WORD: Record<RunJob["status"], string> = { waiting: "Waiting", writing: "Being written", done: "Written", failed: "Not written" };
export function RunProgressList({ p, busy, live, onRetry, onDrop }: {
    p: RunProgress;
    busy: boolean;
    live: boolean;
    onRetry: (ids: string[]) => void;
    onDrop: (ids: string[]) => void;
}) {
    const n = (st: RunJob["status"]) => p.jobs.filter((j) => j.status === st).length;
    const failed = p.jobs.filter((j) => j.status === "failed");
    const going = n("waiting") + n("writing") > 0;
    const total = p.jobs.length;
    const said = [n("done") && `${n("done")} written`, n("writing") && `${n("writing")} being written`, n("waiting") && `${n("waiting")} waiting`, failed.length && `${failed.length} not written`].filter(Boolean).join(" · ");
    return (<div className="rounded-xl border bg-card p-6" data-testid="builder-progress">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          {going ? <WorkingMark job="write" className="size-9 text-primary"/> : <TriangleAlert className="size-4 shrink-0 text-amber-700"/>}
          {total === 1 ? "1 script" : `${total} scripts`}: {said}
        </p>
        {failed.length > 1 && (<Button size="sm" variant="outline" onClick={() => onRetry(failed.filter((j) => j.retry !== false).map((j) => j.id))} disabled={busy || !live}>
            <RotateCcw className="size-4"/>
            Try all {failed.length} again
          </Button>)}
      </div>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="bg-emerald-500" style={{ width: `${(n("done") / total) * 100}%` }}/>
        <span className="animate-pulse bg-primary" style={{ width: `${(n("writing") / total) * 100}%` }}/>
        <span className="bg-amber-500" style={{ width: `${(failed.length / total) * 100}%` }}/>
      </div>
      <details className="mt-3" open={total <= 12 || failed.length > 0}>
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Each script</summary>
        <ol className="mt-2 max-h-80 space-y-1 overflow-auto text-sm">
          {p.jobs.map((j, i) => (<li key={j.id} className="rounded-md px-2 py-1.5 odd:bg-muted/40" data-testid="builder-progress-row" data-status={j.status}>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">
                  {j.status === "done" ? <Check className="size-4 text-emerald-600"/> : j.status === "writing" ? <Loader2 className="size-4 animate-spin text-primary"/> : j.status === "failed" ? <TriangleAlert className="size-4 text-amber-700"/> : <CircleDashed className="size-4 text-muted-foreground"/>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="tabular-nums text-muted-foreground">{i + 1}.</span> {j.label || "Script"}
                </span>
                <span className={cn("shrink-0 text-xs", j.status === "failed" ? "font-semibold text-amber-800" : "text-muted-foreground")}>{WORD[j.status]}</span>
              </div>
              {j.status === "failed" && (<div className="ml-6 mt-1 flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 basis-60 text-xs text-amber-900">{j.said}</p>
                  <Button size="sm" variant="outline" onClick={() => onRetry([j.id])} disabled={busy || !live} data-testid="builder-retry">
                    <RotateCcw className="size-4"/>
                    Try again
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDrop([j.id])} disabled={busy}>
                    Leave it out
                  </Button>
                </div>)}
            </li>))}
        </ol>
      </details>
    </div>);
}
