"use client";
import { pollWhileVisible } from "@/lib/visible-polling";
import { startTransition, useEffect, useOptimistic, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DndContext, DragOverlay, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { Clapperboard, FileText, Image as ImageIcon, LayoutGrid, Loader2, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OutputJobRow } from "@/db/schema";
import { COLUMN_LABELS, columnOf, type BoardColumn } from "@/lib/production/board";
import { BOARD_COLUMNS, discardedFrom, handMove, handTargets } from "@/lib/production/board-discard";
import { JOB_STATUSES, JOB_STATUS_LABELS, OUTPUT_INFO, type JobStatus, type OutputType } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { newestFirst } from "@/lib/production/order";
import { useAdvanced } from "@/components/mode";
import { getJobAction } from "./actions";
import { moveJobAction } from "./board-actions";
import { COLUMN_TONE, CarriedCard, DROP_BACK, DragCard, DropColumn, useBoardSensors, type Landing } from "./board-dnd";
import { JobDrawer } from "./job-drawer";
import { NeedsYou } from "./needs-you";
import { WAITING_LABEL, nextInWalk, type WaitingKind } from "@/lib/production/needs-you";
import { RunOnDrop } from "./run-on-drop";
import { VerdictNote } from "./verdict-note";
import { approveStageAction } from "./actions";
import { ApproveHere, waitsFor } from "./approve-here";
import { STAGE_LABEL, stageStates, usd, waitingOn, waitingOnPlain, type Busy, type ScriptLite, type Usage, type WaitKind } from "./shared";
import { BOARD_HELP, boardHelp } from "./discard";
import { discardJobAction, putBackJobAction } from "./discard-actions";
const ALL = "__all";
type PipelineStatus = {
    jobs: {
        ref: string | null;
        kind: string;
        status: string;
    }[];
};
const signature = (rows: {
    ref: string | null;
    status: string;
}[]) => rows
    .map((r) => `${r.ref}:${r.status}`)
    .sort()
    .join(",");
function OutputIcon({ type }: {
    type: OutputType;
}) {
    const cls = "size-4 text-muted-foreground";
    if (type.startsWith("human_brief"))
        return <User className={cls}/>;
    if (type === "carousel")
        return <LayoutGrid className={cls}/>;
    if (type.startsWith("static"))
        return <ImageIcon className={cls}/>;
    if (type.startsWith("ai_"))
        return <Clapperboard className={cls}/>;
    return <FileText className={cls}/>;
}
export function UsageMeter({ usage }: {
    usage: Usage;
}) {
    const bar = (used: number, cap: number) => (<span className="block h-1 w-full rounded-full bg-muted">
      <span className={cn("block h-1 rounded-full", used >= cap ? "bg-red-500" : used >= cap * 0.8 ? "bg-amber-500" : "bg-primary")} style={{ width: `${Math.min(100, cap ? (used / cap) * 100 : 0)}%` }}/>
    </span>);
    return (<div className="flex gap-4 text-xs" data-testid="media-usage" title="Caps are set in Settings">
      <div className="w-28 space-y-1">
        <span className="tabular-nums" data-testid="usage-images">
          Images {usage.images}/{usage.imageCap}
        </span>
        {bar(usage.images, usage.imageCap)}
      </div>
      <div className="w-32 space-y-1">
        <span className="tabular-nums" data-testid="usage-video">
          Video {usd(usage.videoUsd)} of ${usage.videoCapUsd}
        </span>
        {bar(usage.videoUsd, usage.videoCapUsd)}
      </div>
    </div>);
}
const WAIT_TONE: Record<WaitKind, string> = {
    running: "text-sky-700",
    failed: "text-red-700",
    you: "text-amber-700",
    ready: "text-emerald-700",
    finished: "text-muted-foreground",
};
const CARD = "w-full rounded-xl border border-rule/80 bg-card p-3 text-left text-sm shadow-[0_1px_2px_rgba(40,30,10,0.06)]";
const ON_BOARD = "hover:border-primary/50 hover:shadow-[0_6px_16px_-8px_rgba(40,30,10,0.3)] group-data-[state=over]/col:border-[color-mix(in_oklab,var(--tone)_55%,var(--rule))]";
function CardFace({ j, title, busy }: {
    j: OutputJobRow;
    title: string;
    busy: Busy | undefined;
}) {
    const advanced = useAdvanced();
    const waiting = advanced ? waitingOn(j, busy) : waitingOnPlain(j, busy);
    const images = j.assets.filter((a) => a.kind === "image");
    return (<>
      <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
        <OutputIcon type={j.output_type}/>
        <span className="text-xs">{OUTPUT_INFO[j.output_type].label}</span>
      </div>
      <div className="line-clamp-2 font-medium leading-snug">{title}</div>
      {j.production && waiting && (<div className="mt-2.5 space-y-1.5">
          <div className="flex gap-0.5" data-testid="card-stepper" aria-hidden>
            {stageStates(j.production).map((st) => (<span key={st.id} title={STAGE_LABEL[st.id]} className={cn("h-1 flex-1 rounded-full", st.state === "done" ? "bg-emerald-500" : st.state === "current" ? (waiting.kind === "failed" ? "bg-red-500" : waiting.kind === "running" ? "animate-pulse bg-sky-500" : "bg-amber-500") : "bg-muted-foreground/20")}/>))}
          </div>
          <div className={cn("flex gap-1 text-xs leading-snug", WAIT_TONE[waiting.kind])} data-testid="job-waiting-on" data-kind={waiting.kind}>
            {waiting.kind === "running" && <Loader2 className="mt-0.5 size-3 shrink-0 animate-spin"/>}
            <span className="line-clamp-3 break-words">{waiting.text}</span>
          </div>
        </div>)}
      {images.length > 0 && (<div className="mt-3 grid grid-cols-3 gap-1.5">
          {images.slice(0, 3).map((a, i) => (<span key={a.path} className="relative block aspect-[4/5] overflow-hidden rounded-md bg-muted">

              <img src={`/api/assets/${a.path}?w=240`} alt={a.caption ?? ""} className="size-full object-cover" loading="lazy" draggable={false}/>
              {i === 2 && images.length > 3 && <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-medium text-white">+{images.length - 3}</span>}
            </span>))}
        </div>)}
      {advanced && j.meta_ad_name && <code className="mt-2 block text-[10px] break-all text-muted-foreground">{j.meta_ad_name}</code>}
    </>);
}
export function Kanban({ jobs, scripts, busy, live, openId, scriptId, finishedOnly = false }: {
    finishedOnly?: boolean;
    scriptId?: string;
    openId?: string;
    jobs: OutputJobRow[];
    scripts: Record<string, ScriptLite>;
    busy: Record<string, Busy>;
    live: boolean;
}) {
    const router = useRouter();
    const advanced = useAdvanced();
    const [open, setOpen] = useState<string | null>(openId ?? null);
    const [type, setType] = useState(ALL);
    const [script, setScript] = useState(scriptId ?? ALL);
    const [fast, setFast] = useState(Object.keys(busy).length > 0);
    const [board, moveOnBoard] = useOptimistic(jobs, (rows: OutputJobRow[], m: {
        id: string;
        to: JobStatus;
    }) => rows.map((j) => (j.id === m.id ? { ...j, status: m.to, updated_at: new Date().toISOString() } : j)));
    const current = board.find((j) => j.id === open) ?? null;
    const [full, setFull] = useState<OutputJobRow | null>(null);
    const currentId = current?.id ?? null, currentAt = current?.updated_at ?? null, currentStatus = current?.status ?? null;
    useEffect(() => {
        if (!currentId)
            return;
        let live = true;
        void getJobAction(currentId).then((r) => { if (live && r.ok)
            setFull(r.job); });
        return () => { live = false; };
    }, [currentId, currentAt, currentStatus]);
    const opened = current && full && full.id === current.id ? { ...full, status: current.status } : null;
    const [walk, setWalk] = useState<{
        kind: WaitingKind;
        ids: string[];
    } | null>(null);
    const waits = (id: string) => {
        const j = board.find((b) => b.id === id);
        return !!j && !!walk && columnOf(j) === (walk.kind === "approve" ? "waiting" : "in_review");
    };
    const close = () => (setOpen(null), setWalk(null));
    const decided = () => {
        const next = walk && open ? nextInWalk(walk.ids, open, waits) : null;
        if (next)
            setOpen(next);
        else
            close();
    };
    const sensors = useBoardSensors();
    const [carried, setCarried] = useState<string | null>(null);
    const [flyBack, setFlyBack] = useState(true);
    const [over, setOver] = useState<BoardColumn | null>(null);
    const [ask, setAsk] = useState<{
        id: string;
        approve: boolean;
    } | null>(null);
    const asked = board.find((j) => j.id === ask?.id) ?? null;
    const [said, setSaid] = useState<{
        id: string;
        verdict: "approved" | "rejected";
    } | null>(null);
    const saidJob = board.find((j) => j.id === said?.id) ?? null;
    const landing: Landing = useRef(new Map());
    const carriedJob = board.find((j) => j.id === carried) ?? null;
    const targets = carriedJob ? handTargets(carriedJob, !!busy[carriedJob.id]) : null;
    const refused = carriedJob && over && over !== columnOf(carriedJob) ? handMove(carriedJob, over, !!busy[carriedJob.id]) : null;
    const [dragged, setDragged] = useState(false);
    useEffect(() => { try {
        setDragged(localStorage.getItem("ce-board-dragged") === "1");
    }
    catch { } }, []);
    const drop = (e: DragEndEvent) => {
        setCarried(null);
        setOver(null);
        if (!dragged) {
            setDragged(true);
            try {
                localStorage.setItem("ce-board-dragged", "1");
            }
            catch { }
        }
        const job = board.find((j) => j.id === e.active.id);
        const to = e.over?.id as BoardColumn | undefined;
        if (!job || !to || to === columnOf(job))
            return setFlyBack(true);
        const verdict = handMove(job, to, !!busy[job.id]);
        if (!verdict.ok) {
            setFlyBack(true);
            toast.error(verdict.why);
            return;
        }
        if (verdict.run) {
            setFlyBack(true);
            setAsk({ id: job.id, approve: !!verdict.approve });
            return;
        }
        if (verdict.approve) {
            const at = e.active.rect.current.translated;
            if (at)
                landing.current.set(job.id, { left: at.left, top: at.top, width: at.width });
            setFlyBack(false);
            const thing = waitsFor(job.production);
            startTransition(async () => {
                moveOnBoard({ id: job.id, to: "queued" });
                const res = await approveStageAction(job.id);
                if (res.ok)
                    toast.success(`${thing.charAt(0).toUpperCase()}${thing.slice(1)} approved. Drop ${advanced ? job.id : "the card"} on Running to run its next step.`, { duration: 8000 });
                else
                    toast.error(res.error);
            });
            return;
        }
        if (to === "discarded" || verdict.putBack) {
            const back = !!verdict.putBack;
            const at = e.active.rect.current.translated;
            if (at)
                landing.current.set(job.id, { left: at.left, top: at.top, width: at.width });
            setFlyBack(false);
            startTransition(async () => {
                moveOnBoard({ id: job.id, to: back ? discardedFrom(job) : "discarded" });
                const res = await (back ? putBackJobAction(job.id) : discardJobAction(job.id));
                if (res.ok)
                    toast.success(back ? (advanced ? `${job.id} put back in ${res.label}` : `Put back in ${res.label}`) : advanced ? `${job.id} moved to ${res.label}` : `Moved to ${res.label}`);
                else
                    toast.error(res.error);
            });
            return;
        }
        if (to === "waiting")
            return setFlyBack(true);
        const at = e.active.rect.current.translated;
        if (at)
            landing.current.set(job.id, { left: at.left, top: at.top, width: at.width });
        setFlyBack(false);
        startTransition(async () => {
            moveOnBoard({ id: job.id, to });
            const res = await moveJobAction(job.id, to);
            if (res.ok)
                toast.success(advanced ? `${job.id} moved to ${res.label}` : `Moved to ${res.label}`);
            else
                toast.error(res.error);
            if (res.ok && (to === "approved" || to === "rejected"))
                setTimeout(() => setSaid({ id: job.id, verdict: to }), 350);
        });
    };
    const shown = useRef("");
    const ticks = useRef(0);
    useEffect(() => {
        shown.current = signature(Object.entries(busy).map(([ref, b]) => ({ ref, status: b.status })));
    }, [busy]);
    useEffect(() => {
        let stop = false;
        const poll = async () => {
            try {
                const s: PipelineStatus = await fetch("/api/pipeline/status", { cache: "no-store" }).then((r) => r.json());
                if (stop)
                    return;
                const active = s.jobs.filter((j) => j.kind === "production" && (j.status === "queued" || j.status === "running"));
                if (signature(active) !== shown.current || (active.length > 0 && ++ticks.current % 5 === 0))
                    router.refresh();
                setFast(active.length > 0);
            }
            catch {
            }
        };
        const stopPolling = pollWhileVisible(poll, fast ? 1500 : 10000, { immediate: true });
        return () => {
            stop = true;
            stopPolling();
        };
    }, [fast, router]);
    const types = [...new Set(jobs.map((j) => j.output_type))];
    const scriptIds = [...new Set(jobs.map((j) => j.script_id))];
    const rows = newestFirst(board.filter((j) => (type === ALL || j.output_type === type) && (script === ALL || j.script_id === script)));
    const columns = finishedOnly ? BOARD_COLUMNS.filter((s) => rows.some((j) => columnOf(j) === s)) : BOARD_COLUMNS;
    return (<div className="space-y-5 px-6 pt-8">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger size="sm" className="w-52" data-testid="filter-output">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All formats</SelectItem>
            {types.map((t) => (<SelectItem key={t} value={t}>
                {OUTPUT_INFO[t].label}
              </SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={script} onValueChange={setScript}>
          <SelectTrigger size="sm" className="w-72" data-testid="filter-script">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All scripts</SelectItem>
            {scriptIds.map((id) => (<SelectItem key={id} value={id}>
                {advanced ? (<>
                {id} · {scripts[id]?.title ?? ""}
                  </>) : (scripts[id]?.title || id)}
              </SelectItem>))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground" data-testid="job-count">
          {rows.length} of {jobs.length} jobs
        </span>
        {!live && <span className="text-xs text-amber-700">Making is switched off on this account: briefs are real, images are samples, video is not made.</span>}
      </div>

      <NeedsYou jobs={rows} onWalk={(kind, ids) => (setWalk({ kind, ids }), setOpen(ids[0]))}/>

      <p className={cn("text-xs transition-colors duration-150", carriedJob ? "text-foreground" : "text-muted-foreground")} data-testid="drag-help" aria-live="polite">
        {carriedJob && targets ? boardHelp(carriedJob, targets, refused, advanced) : dragged ? "" : BOARD_HELP}
      </p>

      <DndContext id="production-board" sensors={sensors} onDragStart={(e) => setCarried(String(e.active.id))} onDragOver={(e) => setOver((e.over?.id as BoardColumn | undefined) ?? null)} onDragCancel={() => (setCarried(null), setOver(null))} onDragEnd={drop}>
        <div className="overflow-x-auto p-1">

          <div className={cn("grid gap-3", !finishedOnly && "min-w-[1260px]")} style={{ gridTemplateColumns: columns.map((s) => (rows.some((j) => columnOf(j) === s) ? "minmax(10.5rem, 1.5fr)" : "minmax(7.75rem, 0.7fr)")).join(" ") }} data-testid="kanban">
            {columns.map((s) => {
            const col = rows.filter((j) => columnOf(j) === s);
            return (<DropColumn key={s} status={s} label={COLUMN_LABELS[s]} count={col.length} carrying={!!carriedJob} home={!!carriedJob && columnOf(carriedJob) === s} verdict={carriedJob ? handMove(carriedJob, s, !!busy[carriedJob.id]) : null}>
                  <div className="space-y-2">
                    {col.map((j) => (<div key={j.id}>
                        <DragCard id={j.id} landing={landing} onOpen={() => (setWalk(null), setOpen(j.id))} className={cn(CARD, ON_BOARD)} data-testid="job-card" data-job-id={j.id} data-output-type={j.output_type} data-next={j.production?.next ?? ""}>
                          <CardFace j={j} title={scripts[j.script_id]?.title ?? j.script_id} busy={busy[j.id]}/>
                        </DragCard>
                        {s === "waiting" && !busy[j.id] && <ApproveHere job={j}/>}
                      </div>))}
                  </div>
                </DropColumn>);
        })}
          </div>
        </div>
        <DragOverlay dropAnimation={flyBack ? DROP_BACK : null} className="pointer-events-none">
          {carriedJob && (<CarriedCard className={CARD} tone={over && over !== columnOf(carriedJob) && handMove(carriedJob, over, !!busy[carriedJob.id]).ok ? COLUMN_TONE[over] : null}>
              <CardFace j={carriedJob} title={scripts[carriedJob.script_id]?.title ?? carriedJob.script_id} busy={busy[carriedJob.id]}/>
            </CarriedCard>)}
        </DragOverlay>
      </DndContext>
      {!jobs.length && <p className="text-sm text-muted-foreground">No jobs yet. Use Make assets to turn a script into a brief, an image ad or a video.</p>}
      {said && saidJob && <VerdictNote key={`${said.id}-${said.verdict}`} job={saidJob} verdict={said.verdict} title={scripts[saidJob.script_id]?.title ?? saidJob.script_id} onClose={() => setSaid(null)}/>}
      {asked && <RunOnDrop job={asked} approve={!!ask?.approve} title={scripts[asked.script_id]?.title ?? asked.script_id} onClose={() => setAsk(null)} onStarted={() => setFast(true)}/>}
      {current && opened && (<JobDrawer job={opened} script={scripts[current.script_id]} busy={busy[current.id]} live={live} onClose={close} onDecided={decided} onKick={() => setFast(true)} walk={walk && walk.ids.includes(current.id) ? { label: WAITING_LABEL[walk.kind], ids: walk.ids, at: walk.ids.indexOf(current.id), done: walk.ids.filter((id) => !waits(id)), go: setOpen } : undefined}/>)}
    </div>);
}
