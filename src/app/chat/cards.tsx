"use client";
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, CheckCircle2, Copy, Loader2, Pencil, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { ChatMade } from "@/db/schema";
import type { ActionView, Card, CheckCard, CopyCard, FileCard, ImageCard, JobCard, MessageView, ReportCard, ScriptCard } from "@/lib/chat/types";
import { TOOL_WORDS } from "@/lib/chat/types";
import { pastTimeLine, type StepTime } from "@/lib/jobs/past-time";
import { cn } from "@/lib/utils";
export interface CardHandlers {
    advanced: boolean;
    pending: boolean;
    turnTime?: StepTime;
    onAbout: (made: ChatMade, label: string) => void;
    onJob: (jobId: string, step: "approve" | "run" | "redo" | "skip_motion", instruction?: string, selected?: number) => void;
    onSay: (text: string) => void;
}
const links = (rows: {
    label: string;
    href: string;
}[]) => rows.length > 0 && (<div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {rows.map((l) => l.href.startsWith("/api/") ? (<a key={l.href} href={l.href} className="font-semibold text-primary underline underline-offset-2">
            {l.label}
          </a>) : (<Link key={l.href} href={l.href} className="font-semibold text-primary underline underline-offset-2">
            {l.label}
          </Link>))}
    </div>);
const progress = (text: string) => text && (<p className="flex items-center gap-2 text-sm font-medium" data-testid="chat-progress">
      <Loader2 className="size-4 animate-spin text-primary"/>
      {text} You can leave this screen.
    </p>);
function Images({ c, h }: {
    c: ImageCard;
    h: CardHandlers;
}) {
    return (<div data-testid="chat-images" data-set={c.setId}>
      {progress(c.progress)}
      {c.images.length > 0 && (<ul className={cn("grid gap-2.5", c.images.length === 1 ? "max-w-xs grid-cols-1" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4", c.progress && "mt-2.5")}>
          {c.images.map((img) => (<li key={img.full} data-testid="chat-image">
              <a href={img.full} target="_blank" rel="noreferrer" className="block border hover:border-primary" title="Open at full size">

                <img src={img.url} alt={img.title} loading="lazy" className="block w-full"/>
              </a>
              <div className="mt-1 flex items-start justify-between gap-2 text-xs leading-snug">
                <span>
                  <span className="font-semibold">{img.n}.</span> {img.title}
                  {img.ok === false && <span className="ml-1 font-semibold text-red-700">Check this one</span>}
                </span>
                <button type="button" onClick={() => h.onAbout({ type: "image", id: c.setId, item: img.itemId }, `Image ${img.n}`)} className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary hover:underline" title="Say what should change in this image" data-testid="chat-image-change">
                  <Pencil className="size-3"/>
                  Change
                </button>
              </div>
            </li>))}
        </ul>)}
      {links(c.links)}
    </div>);
}
function Scripts({ c, h }: {
    c: ScriptCard;
    h: CardHandlers;
}) {
    return (<div data-testid="chat-scripts">
      {progress(c.progress)}
      {c.scripts.length > 0 && (<ul className={cn("divide-y border", c.progress && "mt-2.5")}>
          {c.scripts.map((s) => (<li key={s.id} className="px-3 py-2.5" data-testid="chat-script">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-semibold">{s.title}</span>
                <span className="flex shrink-0 items-center gap-3 text-xs">
                  <span className="text-muted-foreground">
                    {s.seconds ? `about ${s.seconds} seconds` : ""}
                    {s.version > 1 ? ` · version ${s.version}` : ""}
                  </span>
                  <button type="button" onClick={() => h.onAbout({ type: "script", id: s.id }, `The script "${s.title.slice(0, 40)}"`)} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline" data-testid="chat-script-change">
                    <Pencil className="size-3"/>
                    Change
                  </button>
                  <Link href={`/scripts/${s.id}`} className="font-semibold text-primary hover:underline">
                    Open
                  </Link>
                </span>
              </div>
              <ol className="mt-1.5 space-y-1 text-sm">
                {s.lines.slice(0, 3).map((l, k) => (<li key={k}>{l.text}</li>))}
              </ol>
              {s.lines.length > 3 && (<details className="mt-1 text-sm">
                  <summary className="cursor-pointer text-xs font-semibold text-primary">The other {s.lines.length - 3} lines</summary>
                  <ol className="mt-1 space-y-1">
                    {s.lines.slice(3).map((l, k) => (<li key={k}>{l.text}</li>))}
                  </ol>
                </details>)}
              {s.flags > 0 && (<p className="mt-1.5 text-xs font-semibold text-red-700">
                  {s.flags === 1 ? "1 check failed" : `${s.flags} checks failed`}. Open it to see which.
                </p>)}
            </li>))}
        </ul>)}
      {links(c.links)}
    </div>);
}
const copyText = (text: string, said = "Copied.") => void navigator.clipboard.writeText(text).then(() => toast.success(said), () => toast.error("The browser didn't allow copying. Select the words and copy them."));
function CopyOptions({ c }: {
    c: CopyCard;
}) {
    return (<div data-testid="chat-copy">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold tracking-wider text-foreground/50 uppercase">{c.what}</span>
        <button type="button" onClick={() => copyText(c.options.map((o) => o.text).join("\n\n"), "All of them copied.")} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          <Copy className="size-3"/>
          Copy all
        </button>
      </div>
      <ol className="mt-1.5 divide-y border">
        {c.options.map((o, k) => (<li key={k} className="flex items-start gap-3 px-3 py-2" data-testid="chat-copy-option">
            <span className="numeral w-5 shrink-0 text-right text-sm text-muted-foreground">{k + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block whitespace-pre-wrap text-sm">{o.text}</span>
              {o.angle && <span className="mt-0.5 block text-xs text-muted-foreground">{o.angle}</span>}
              {(o.notes ?? []).map((n, i) => (<span key={i} className="mt-1 block text-xs text-amber-800" data-testid="chat-copy-note">
                  Worth a look: {n}
                </span>))}
            </span>
            <button type="button" onClick={() => copyText(o.text)} className="shrink-0 rounded-md border p-1.5 hover:bg-muted" aria-label={`Copy option ${k + 1}`}>
              <Copy className="size-3.5"/>
            </button>
          </li>))}
      </ol>
    </div>);
}
function Check_({ c }: {
    c: CheckCard;
}) {
    const fails = c.check.issues.filter((i) => i.severity === "fail").length;
    const warns = c.check.issues.length - fails;
    return (<div data-testid="chat-check" data-issues={c.check.issues.length}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        {c.check.issues.length === 0 ? <CheckCircle2 className="size-4 text-emerald-700"/> : <AlertTriangle className={cn("size-4", fails ? "text-red-700" : "text-amber-600")}/>}
        {c.check.issues.length === 0
            ? `Nothing to flag in ${c.check.about}. ${c.check.checked} line${c.check.checked === 1 ? "" : "s"} read.`
            : `${[fails ? `${fails} to fix` : "", warns ? `${warns} to look at` : ""].filter(Boolean).join(", ")} in ${c.check.about}.`}
      </p>
      {c.check.issues.length > 0 && (<ul className="mt-2 divide-y border text-sm">
          {c.check.issues.map((i, k) => (<li key={k} className="px-3 py-2">
              <span className={cn("mr-2 inline-block rounded-sm px-1.5 py-0.5 text-[11px] font-bold uppercase", i.severity === "fail" ? "bg-red-600 text-white" : "bg-amber-300 text-amber-950")}>{i.severity === "fail" ? "Fix" : "Look"}</span>
              <span className="font-semibold">{i.where}</span>
              {i.text && <span className="text-muted-foreground"> "{i.text}"</span>}
              <span className="mt-0.5 block">{i.problem}</span>
            </li>))}
        </ul>)}
      {c.check.note && <p className="mt-2 text-xs text-muted-foreground">{c.check.note}</p>}
    </div>);
}
function Job({ c, h }: {
    c: JobCard;
    h: CardHandlers;
}) {
    const [note, setNote] = useState("");
    const [redo, setRedo] = useState(false);
    const [picked, setPicked] = useState<number | null>(null);
    const selected = picked ?? Math.max(0, c.panels.findIndex((p) => p.selected));
    const images = c.media.filter((m) => m.kind === "image");
    const videos = c.media.filter((m) => m.kind === "video");
    const docs = c.media.filter((m) => m.kind === "doc");
    return (<div className="border border-input p-3.5" data-testid="chat-job" data-job={c.jobId}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="font-semibold">
          {c.label}
          {c.title && <span className="font-normal text-muted-foreground"> from "{c.title}"</span>}
        </p>
        <Link href={c.href} className="text-xs font-semibold text-primary hover:underline">
          Open in Production
        </Link>
      </div>
      <p className={cn("mt-1 flex items-center gap-2 text-sm", c.busy && "font-medium")} data-testid="chat-job-state">
        {c.busy && <Loader2 className="size-4 animate-spin text-primary"/>}
        {c.state}
        {c.busy && " You can leave this screen."}
      </p>

      {videos.map((v) => (<div key={v.url} className="mt-3">
          <video src={v.url} controls className="max-h-[28rem] rounded border bg-black" data-testid="chat-job-video"/>
          <a href={v.url} download className="mt-1 inline-block text-sm font-semibold text-primary underline underline-offset-2">
            Download the video
          </a>
        </div>))}
      {c.panels.length > 0 && (<ul className={cn("mt-3 grid gap-2", c.panels.length === 1 ? "max-w-sm grid-cols-1" : "grid-cols-2 sm:grid-cols-3")} data-testid="chat-job-panels">
          {c.panels.map((p, k) => (<li key={p.url}>
              <button type="button" onClick={() => setPicked(k)} className={cn("block w-full border-2", c.panels.length > 1 && k === selected ? "border-primary" : "border-transparent hover:border-foreground/30")} aria-pressed={k === selected} title={c.panels.length > 1 ? "Choose this one" : ""}>

                <img src={p.url} alt={`Option ${k + 1}`} className="block w-full"/>
              </button>
            </li>))}
        </ul>)}
      {c.plan.length > 0 && (<div className="mt-3 space-y-2 text-sm" data-testid="chat-job-plan">
          {c.plan.map((s, k) => (<div key={k}>
              <p className="text-[10px] font-semibold tracking-wider text-foreground/50 uppercase">{s.heading}</p>
              <ul className="mt-0.5 space-y-0.5">
                {s.lines.map((l, n) => (<li key={n}>{l}</li>))}
              </ul>
            </div>))}
        </div>)}
      {c.checks.length > 0 && (<ul className="mt-2.5 space-y-1 border-l-4 border-signal bg-signal/15 px-3 py-1.5 text-sm">
          {c.checks.map((x, k) => (<li key={k}>{x}</li>))}
        </ul>)}
      {images.length > 0 && c.panels.length === 0 && (<ul className={cn("mt-3 grid gap-2.5", images.length === 1 ? "max-w-xs grid-cols-1" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5")} data-testid="chat-job-images">
          {images.map((m, k) => (<li key={m.url}>
              <a href={m.url} target="_blank" rel="noreferrer" className="block border hover:border-primary">

                <img src={`${m.url}?w=480`} alt={m.caption || `Card ${k + 1}`} loading="lazy" className="block w-full"/>
              </a>
              {m.caption && <p className="mt-1 text-xs">{m.caption}</p>}
            </li>))}
        </ul>)}
      {docs.map((d) => (<a key={d.url} href={d.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary underline underline-offset-2">
          {d.caption || "Open the brief"}
        </a>))}
      {c.error && (<p className="mt-2.5 text-sm text-red-700" data-testid="chat-job-error">
          It stopped: {c.error}
        </p>)}

      {!c.busy && (c.buttons.length > 0 || c.redo) && (<div className="mt-3 flex flex-wrap items-center gap-2">
          {c.buttons.map((b) => (<button key={b.op} type="button" disabled={h.pending} onClick={() => h.onJob(c.jobId, b.op, "", b.op === "approve" && c.panels.length > 1 ? selected : undefined)} className={cn("inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-bold disabled:opacity-50", b.primary ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border hover:bg-muted")} data-testid={`chat-job-${b.op}`}>
              {b.op === "approve" && <Check className="size-4"/>}
              {b.label}
            </button>))}
          {c.redo && !redo && (<button type="button" onClick={() => setRedo(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted" data-testid="chat-job-redo">
              <RotateCcw className="size-3.5"/>
              Change it
            </button>)}
        </div>)}
      {!c.busy && redo && (<div className="mt-2 flex flex-wrap items-end gap-2">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Say what should be different." className="min-w-64 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary" aria-label="What should be different" data-testid="chat-job-note"/>
          <button type="button" disabled={h.pending || note.trim().length < 4} onClick={() => {
                h.onJob(c.jobId, "redo", note.trim());
                setRedo(false);
                setNote("");
            }} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50" data-testid="chat-job-redo-go">
            Make it again
          </button>
          <button type="button" onClick={() => setRedo(false)} className="h-9 px-2 text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        </div>)}
      {h.advanced && c.cost && (<p className="mt-2 text-[11px] text-muted-foreground" data-testid="chat-job-cost">
          {c.cost}
        </p>)}
    </div>);
}
function File_({ c }: {
    c: FileCard;
}) {
    return (<div data-testid="chat-file">
      {c.kind === "video" ? (<video src={c.url} controls className="max-h-[28rem] rounded border bg-black"/>) : (<img src={c.url} alt="" className="max-h-[28rem] border"/>)}
      <p className="mt-1 text-sm">
        <a href={c.url} download className="font-semibold text-primary underline underline-offset-2">
          Download
        </a>
        {c.caption && <span className="text-muted-foreground"> · {c.caption}</span>}
      </p>
    </div>);
}
function Report({ c, h }: {
    c: ReportCard;
    h: CardHandlers;
}) {
    const r = c.report;
    return (<div className="border bg-background/60 px-4 py-3" data-testid="chat-report">
      <p className="font-semibold">{r.title}</p>
      {r.summary && <p className="mt-1 text-sm text-foreground/80">{r.summary}</p>}
      {r.sections.map((s) => (<div key={s.heading} className="mt-3">
          <p className="text-[10px] font-semibold tracking-wider text-foreground/50 uppercase">{s.heading}</p>
          <ul className="mt-1 space-y-1 text-sm">
            {s.lines.map((l, k) => (<li key={k} className="whitespace-pre-wrap" data-testid="chat-report-line">
                {l}
              </li>))}
          </ul>
        </div>))}
      {links(r.links)}
      {r.asks.length > 0 && (<div className="mt-3 flex flex-wrap gap-2">
          {r.asks.map((ask) => (<button key={ask} type="button" disabled={h.pending} onClick={() => h.onSay(ask)} className="rounded-full border px-3 py-1 text-xs font-semibold hover:bg-muted disabled:opacity-50" data-testid="chat-report-ask">
              {ask}
            </button>))}
        </div>)}
    </div>);
}
function CardView({ c, h }: {
    c: Card;
    h: CardHandlers;
}) {
    if (c.type === "report")
        return <Report c={c} h={h}/>;
    if (c.type === "images")
        return <Images c={c} h={h}/>;
    if (c.type === "scripts")
        return <Scripts c={c} h={h}/>;
    if (c.type === "copy")
        return <CopyOptions c={c}/>;
    if (c.type === "check")
        return <Check_ c={c}/>;
    if (c.type === "job")
        return <Job c={c} h={h}/>;
    return <File_ c={c}/>;
}
function Action({ a, h, working }: {
    a: ActionView;
    h: CardHandlers;
    working: boolean;
}) {
    const running = a.status === "running" && working;
    return (<div className="space-y-2" data-testid="chat-action" data-tool={a.tool} data-status={a.status}>
      <p className="flex items-start gap-2 text-sm">
        {running ? <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary"/> : a.status === "done" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700"/> : a.status === "failed" ? <XCircle className="mt-0.5 size-4 shrink-0 text-red-700"/> : <span className="mt-1.5 size-2 shrink-0 rounded-full bg-foreground/30"/>}
        <span>
          <span className="font-semibold">{a.says}</span>
          {running && !a.cards.length && <span className="text-muted-foreground"> {TOOL_WORDS[a.tool].doing}.</span>}
        </span>
      </p>
      {a.cards.map((c, k) => (<CardView key={k} c={c} h={h}/>))}
      {a.note && (<p className="border-l-4 border-signal bg-signal/15 px-3 py-1.5 text-sm" data-testid="chat-note">
          {a.note}
        </p>)}
      {a.status === "failed" && a.error && (<p className="text-sm text-red-700" data-testid="chat-action-error">
          It stopped: {a.error}
        </p>)}
    </div>);
}
function Words({ text }: {
    text: string;
}) {
    const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
    return (<div className="space-y-2 text-[15px] leading-relaxed" data-testid="chat-reply">
      {blocks.map((b, k) => {
            const lines = b.split("\n");
            const items = lines.filter((l) => /^\s*[-•]\s+/.test(l));
            if (items.length && items.length === lines.length)
                return (<ul key={k} className="list-disc space-y-1 pl-5">
              {items.map((l, n) => (<li key={n}>{l.replace(/^\s*[-•]\s+/, "")}</li>))}
            </ul>);
            return (<p key={k} className="whitespace-pre-wrap">
            {b}
          </p>);
        })}
    </div>);
}
export function Message({ m, last, h, onSay, onRetry }: {
    m: MessageView;
    last: boolean;
    h: CardHandlers;
    onSay: (text: string) => void;
    onRetry: (id: string) => void;
}) {
    if (m.role === "user")
        return (<li className="flex flex-col items-end gap-1" data-testid="chat-msg" data-role="user">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-md bg-secondary px-3.5 py-2 text-[15px]" data-testid="chat-said">
          {m.text}
        </p>
        {m.tags.length > 0 && (<span className="flex flex-wrap justify-end gap-1.5">
            {m.tags.map((t, k) => (<span key={k} className="inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs">
                <span className="text-muted-foreground">{t.type}</span>
                <span className="font-semibold">{t.label}</span>
              </span>))}
          </span>)}
      </li>);
    const working = m.status === "thinking" || m.status === "working";
    return (<li className="space-y-3" data-testid="chat-msg" data-role="assistant" data-status={m.status}>
      {m.status === "thinking" && (<p className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="chat-thinking">
          <Loader2 className="size-4 animate-spin text-primary"/>
          Reading your message. <span className="text-xs" data-testid="chat-thinking-time">{pastTimeLine(h.turnTime, "in all")}</span>
        </p>)}
      {m.text && <Words text={m.text}/>}
      {m.actions.map((a) => (<Action key={a.id} a={a} h={h} working={working}/>))}
      {m.question && last && m.question.options.length > 0 && (<div className="flex flex-wrap gap-2" data-testid="chat-question">
          {m.question.options.map((o) => (<button key={o} type="button" disabled={h.pending} onClick={() => onSay(o)} className="rounded-md border-2 border-primary px-3 py-1.5 text-sm font-semibold text-primary hover:bg-secondary disabled:opacity-50" data-testid="chat-answer">
              {o}
            </button>))}
        </div>)}
      {m.status === "failed" && m.error && (<p className="text-sm text-red-700" data-testid="chat-error">
          It stopped: {m.error}
        </p>)}
      {(m.status === "stopped" || m.status === "failed" || (m.status === "done" && m.actions.some((a) => a.status === "failed"))) && last && (<button type="button" disabled={h.pending} onClick={() => onRetry(m.id)} className="inline-flex h-9 items-center gap-1.5 rounded-md border-2 border-primary px-3 text-sm font-semibold text-primary hover:bg-secondary disabled:opacity-50" data-testid="chat-retry">
          <RotateCcw className="size-3.5"/>
          {m.status === "stopped" ? "Carry on" : "Try again"}
        </button>)}
      {last && m.status === "done" && m.suggestions.length > 0 && (<div className="flex flex-wrap gap-2" data-testid="chat-suggestions">
          {m.suggestions.map((s) => (<button key={s} type="button" disabled={h.pending} onClick={() => onSay(s)} className="rounded-md border px-2.5 py-1 text-left text-sm hover:bg-secondary disabled:opacity-50" data-testid="chat-suggestion">
              {s}
            </button>))}
        </div>)}
      {m.sources.length > 0 && m.status !== "thinking" && (<p className="text-xs text-muted-foreground" data-testid="chat-sources">
          Read for this: {m.sources.join(" · ")}
        </p>)}
      {h.advanced && m.status !== "thinking" && (<p className="text-[11px] text-muted-foreground" data-testid="chat-cost">
          Read by {m.readBy === "model" ? "a model" : "the rules (no model)"}
          {m.cost > 0 ? ` · the model calls of this message cost $${m.cost.toFixed(m.cost < 0.1 ? 3 : 2)}` : ""}
        </p>)}
    </li>);
}
