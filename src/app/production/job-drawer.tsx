"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, Copy, Download, GraduationCap, Loader2, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAdvanced } from "@/components/mode";
import { VoiceNote } from "@/components/voice-note";
import type { ImagePlan, OutputJobRow, PrepStage, ProductionState, VideoPlan } from "@/db/schema";
import { JOB_STATUS_LABELS, OUTPUT_INFO, humanize, type JobStatus } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { avatarKindFor, clipSeconds, hasStoryboard } from "@/lib/production/prompts";
import { scriptClipsText } from "@/lib/video/clips-from-script";
import { skillTitle, skillTitles } from "@/lib/skills/titles";
import { approveStageAction, checkJobClaimsAction, deleteJobAction, jobFeedbackAction, regenerateCharacterViewsAction, regenerateStageAction, resetClipAction, reviewJobAction, runStepAction, saveImageFeedCopyAction, savePlanAction, skipMotionAction } from "./actions";
import { CHARACTER_VIEWS, characterViewsRepairable } from "@/lib/production/character-view-rules";
import { ImagePlanEditor, VideoPlanEditor } from "./plan-editor";
import { ApproveLanding } from "@/components/approve-landing";
import { QaCard } from "./qa-card";
import { HandoffSection } from "./handoff-pack";
import { CastOptions } from "./cast-options";
import { SaveAvatar } from "./save-avatar";
import { ClipUpload } from "./clip-upload";
import { MissingPhotos } from "./missing-photos";
import { StoryboardBoard } from "./storyboard-board";
import { VideoSettings } from "./video-settings";
import { DiscardButton } from "./discard";
import { CONTEXT_LABEL, STAGE_CONTEXT, STAGE_LABEL, STAGE_THING, assetUrl, flowOf, jobClipsText, groupOfType, isApproval, planApprovalBlockers, promptsReady, recipeLabel, recipeOf, runLabel, stageStates, stepCost, usd, waitingOn, waitingOnPlain, words, type Busy, type ScriptLite, type StageId } from "./shared";
import { plainMessage } from "@/lib/plain-message";
import { ScriptPreview } from "@/components/script-preview";
import { productionFindings } from "@/lib/check-review";
type ActionResult = {
    ok: true;
} | {
    ok: false;
    error: string;
};
type PrepId = "character" | "look" | "storyboard";
const NEXT_STAGE_AFTER_APPROVAL = (p: ProductionState): StageId | null => {
    const flow = flowOf(p);
    return flow[flow.indexOf(p.next.slice(8) as StageId) + 1] ?? null;
};
export function Elapsed({ since }: {
    since: string;
}) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    const s = Math.max(0, Math.round((now - new Date(since).getTime()) / 1000));
    return (<span className="tabular-nums" data-testid="job-elapsed">
      {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
    </span>);
}
function CopyButton({ text, label, testid = "copy-button" }: {
    text: string;
    label: string;
    testid?: string;
}) {
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied`);
        }
        catch {
            toast.error("Could not copy. Select the text and copy it by hand.");
        }
    };
    return (<button type="button" onClick={copy} aria-label={`Copy ${label.toLowerCase()}`} title={`Copy ${label.toLowerCase()}`} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" data-testid={testid}>
      <Copy className="size-3.5"/>
    </button>);
}
const Section = ({ title, children, testid }: {
    title: string;
    children: React.ReactNode;
    testid?: string;
}) => (<section className="space-y-2" data-testid={testid}>
    <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
    {children}
  </section>);
export interface Walk {
    label: string;
    ids: string[];
    at: number;
    done: string[];
    go: (id: string) => void;
}
interface DrawerProps {
    job: OutputJobRow;
    script?: ScriptLite;
    busy?: Busy;
    live: boolean;
    onClose: () => void;
    onDecided?: () => void;
    onKick: () => void;
    walk?: Walk;
}
export function JobDrawer(props: DrawerProps) {
    const p = props.job.production;
    return (<Sheet open onOpenChange={(o) => !o && props.onClose()}>
      <SheetContent className={cn("flex w-full flex-col gap-0", p ? "sm:max-w-4xl" : "sm:max-w-xl")} data-testid="job-drawer" data-job-id={props.job.id} data-next={p?.next ?? ""}>
        <JobDrawerBody key={props.job.id} {...props}/>
      </SheetContent>
    </Sheet>);
}
const NO_ARROW_KEYS = "input, textarea, select, video, audio, [contenteditable='true'], [role='slider'], [role='radio'], [role='tab'], [role='combobox'], [role='listbox'], [role='menu']";
function WalkBar({ walk }: {
    walk: Walk;
}) {
    const { ids, at, go } = walk;
    const prev = ids[at - 1];
    const next = ids[at + 1];
    useEffect(() => {
        const key = (e: KeyboardEvent) => {
            if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
                return;
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight")
                return;
            if ((e.target as HTMLElement | null)?.closest?.(NO_ARROW_KEYS) || document.querySelectorAll("[role='dialog'], [role='alertdialog']").length > 1)
                return;
            const to = e.key === "ArrowLeft" ? prev : next;
            if (!to)
                return;
            e.preventDefault();
            go(to);
        };
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    }, [prev, next, go]);
    return (<div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5" data-testid="walk-bar">
      <Button size="sm" variant="outline" disabled={!prev} onClick={() => prev && go(prev)} data-testid="walk-prev">
        <ChevronLeft className="size-4"/>
        <span className="max-sm:sr-only">Previous</span>
      </Button>
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
        <div className="text-sm" data-testid="walk-count">
          <span className="font-semibold tabular-nums">
            {at + 1} of {ids.length}
          </span>{" "}
          <span className="text-muted-foreground">{walk.label}</span>
        </div>
        {ids.length <= 30 && (<div className="flex flex-wrap justify-center gap-1">
            {ids.map((id, i) => {
                const done = walk.done.includes(id);
                return (<button key={id} type="button" onClick={() => go(id)} aria-label={`Open ${i + 1} of ${ids.length}${done ? ", already decided" : ""}`} aria-current={i === at ? "step" : undefined} data-testid="walk-step" data-done={done || undefined} className={cn("flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums transition-colors", i === at ? "bg-primary font-semibold text-primary-foreground" : done ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:ring-emerald-400" : "bg-card text-muted-foreground ring-1 ring-rule hover:text-foreground hover:ring-primary/60")}>
                  {done && i !== at ? <Check className="size-3"/> : i + 1}
                </button>);
            })}
          </div>)}
      </div>
      <Button size="sm" variant="outline" disabled={!next} onClick={() => next && go(next)} data-testid="walk-next">
        <span className="max-sm:sr-only">Next</span>
        <ChevronRight className="size-4"/>
      </Button>
    </div>);
}
function JobDrawerBody({ job, script, busy, live, onClose, onDecided = onClose, onKick, walk }: DrawerProps) {
    const router = useRouter();
    const advanced = useAdvanced();
    const p = job.production;
    const [notes, setNotes] = useState(job.review_notes ?? "");
    const [feedDirty, setFeedDirty] = useState(false);
    const [pending, start] = useTransition();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const locked = pending || !!busy;
    const act = (fn: () => Promise<ActionResult>, done?: string, after?: () => void) => start(async () => {
        const res = await fn();
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        if (done)
            toast.success(done);
        after?.();
        router.refresh();
        onKick();
    });
    const move = (to: JobStatus) => act(() => reviewJobAction(job.id, to, notes || null), advanced ? `${job.id} moved to ${JOB_STATUS_LABELS[to]}` : `Moved to ${JOB_STATUS_LABELS[to]}`, to === "in_review" ? undefined : onDecided);
    const isBrief = job.output_type.startsWith("human_brief");
    const finished = !p || p.next === "done";
    return (<>
        <SheetHeader className="border-b">
          {advanced ? (<SheetTitle>
            {OUTPUT_INFO[job.output_type].label} · {job.id}
          </SheetTitle>) : (<SheetTitle>{OUTPUT_INFO[job.output_type].label}</SheetTitle>)}
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary" data-testid="job-status">
                {JOB_STATUS_LABELS[job.status]}
              </Badge>
              {advanced && (p ? (<>
                  <span>{recipeLabel(p)}</span>
                  {p.recipe !== "brief" && (<span>
                      {[p.preset !== "default" && humanize(p.preset), p.aspect, groupOfType(job.output_type) === "video" ? `${jobClipsText(p)} at ${p.resolution}` : `${p.cards} card${p.cards === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
                    </span>)}
                </>) : (<>
                  <span>{job.skill ? `skill: ${skillTitle(job.skill)}` : "made by a human"}</span>
                  <span>×{job.count}</span>
                </>))}
            </div>
          </SheetDescription>
        </SheetHeader>

        {walk && walk.ids.length > 1 && <WalkBar walk={walk}/>}

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Script</div>
            <Link href={`/scripts/${job.script_id}`} className="text-primary hover:underline">
              {advanced ? (<>
              {job.script_id} · {script?.title}
                </>) : (script?.title || "Open the script")}
            </Link>
            <div className="mt-2">
              <ApproveLanding adId={`script:${job.script_id}`}/>
            </div>
          </div>

          {p ? <ProductionBody job={job} p={p} busy={busy} live={live} locked={locked || job.status === "discarded"} act={act} onFeedDirty={setFeedDirty}/> : <SeedBody job={job} script={script} isBrief={isBrief}/>}

          {advanced && job.meta_ad_name && (<div className="flex items-start justify-between gap-2 rounded-md bg-muted px-2 py-1.5">
              <div>
                <div className="text-xs text-muted-foreground">Meta ad name</div>
                <code className="text-xs break-all" data-testid="job-ad-name">
                  {job.meta_ad_name}
                </code>
              </div>
              <CopyButton text={job.meta_ad_name} label="Ad name" testid="copy-ad-name"/>
            </div>)}

          <Section title="Review">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notes for the review: what to change, or why it was rejected" data-testid="review-notes"/>
            {job.review_notes && job.status === "rejected" && <p className="text-xs text-muted-foreground">Rejected with: {job.review_notes}</p>}
            {job.status === "in_review" && !finished && <p className="text-xs text-muted-foreground">This job can be approved for sending once its last step has run. It can be rejected at any point.</p>}
          </Section>

          <JobFeedback jobId={job.id} voice={live}/>

          {advanced && p && p.log.length > 0 && (<Section title="Activity" testid="job-log">
              <ol className="space-y-1 text-xs">
                {[...p.log].reverse().map((l, i) => (<li key={i} className="flex gap-2">
                    <time className="shrink-0 text-muted-foreground tabular-nums" suppressHydrationWarning>
                      {new Date(l.at).toLocaleString()}
                    </time>
                    <span>{l.message}</span>
                  </li>))}
              </ol>
            </Section>)}

          {job.status === "in_review" && finished && !isBrief && (<Section title="Before you approve" testid="job-qa">
              <QaCard job={job} script={script}/>
            </Section>)}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t p-4">
          <DiscardButton job={job} locked={locked} onDone={onDecided}/>
          <Button variant="ghost" className="mr-auto text-red-700 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmDelete(true)} disabled={locked} data-testid="job-delete">
            <Trash2 className="size-4"/>
            Delete job
          </Button>
          {job.status === "in_review" && (<>
              <Button variant="outline" onClick={() => move("rejected")} disabled={locked} data-testid="review-reject">
                {p ? "Reject with notes" : "Reject"}
              </Button>
              {finished && (<Button onClick={() => move("approved")} disabled={locked || feedDirty} title={feedDirty ? "Save or undo your caption edits before approving." : undefined} data-testid="review-approve">
                  {job.assets.some((a) => a.qa?.status === "fail") || p?.audit.some((a) => a.status === "fail") ? "Override checks and approve for sending" : p ? "Approve for sending" : "Approve"}
                </Button>)}
            </>)}
          {job.status === "rejected" && (<Button variant="outline" onClick={() => move("in_review")} disabled={locked} data-testid="review-reopen">
              Move back to review
            </Button>)}
          {(job.status === "approved" || (isBrief && job.status === "draft")) && (<Button onClick={() => move("sent")} disabled={locked} data-testid="review-sent">
              Mark as sent
            </Button>)}
        </div>

        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent data-testid="delete-job-dialog">
            <DialogHeader>
              <DialogTitle>{advanced ? <>Delete {job.id}?</> : "Delete this job?"}</DialogTitle>
              <DialogDescription>{advanced ? "The job, its plan and every file it made are removed for good. Money already spent on it is not refunded." : "The job, its plan and everything it made are removed for good."}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button variant="destructive" disabled={pending} onClick={() => act(() => deleteJobAction(job.id), advanced ? `${job.id} deleted` : "Job deleted", onDecided)} data-testid="delete-job-confirm">
                {pending ? "Deleting..." : "Delete job"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </>);
}
function JobFeedback({ jobId, voice }: {
    jobId: string;
    voice: boolean;
}) {
    const [text, setText] = useState("");
    const [via, setVia] = useState<"typed" | "voice">("typed");
    const [learned, setLearned] = useState<{
        lessons: {
            id: string;
            rule: string;
            isNew: boolean;
        }[];
        status: string;
    } | null>(null);
    const [pending, start] = useTransition();
    const advanced = useAdvanced();
    const save = () => start(async () => {
        const res = await jobFeedbackAction(jobId, { text, via });
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        setText("");
        setVia("typed");
        setLearned({ lessons: res.learned, status: res.status });
        toast.success(res.status === "logged" ? "Feedback kept. The rule drawn from it waits on the Lessons screen for a yes." : res.learned.length ? "Feedback kept and learned from." : "Feedback kept.");
    });
    return (<Section title="Feedback for next time" testid="job-feedback">
      <Textarea value={text} onChange={(e) => {
            setText(e.target.value.slice(0, 4000));
            setVia("typed");
        }} rows={2} placeholder="What is wrong with this one, or what it should always get right. Type it or say it." data-testid="job-feedback-text"/>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={save} disabled={pending || text.trim().length < 4} data-testid="job-feedback-save">
          {pending && <Loader2 className="size-3.5 animate-spin"/>}
          Save feedback
        </Button>
        {voice && (<VoiceNote disabled={pending} onText={(t) => {
                setText((cur) => `${cur}${cur && !/\s$/.test(cur) ? " " : ""}${t}`.slice(0, 4000));
                setVia("voice");
            }}/>)}
      </div>
      {learned && (<div className="rounded-md border bg-muted/40 p-2 text-xs" data-testid="job-learned">
          <div className="flex items-center gap-1.5 font-medium">
            <GraduationCap className="size-3.5"/>
            {learned.lessons.length ? "Learned for next time" : learned.status === "logged" ? "Kept. Its rule waits on the Lessons screen for a yes" : "Kept. Nothing lasting to learn from it"}
          </div>
          {learned.lessons.map((x) => (<p key={x.id} className="mt-1">
              {x.rule} <span className="text-muted-foreground">({x.isNew ? "new" : "already known, counted again"})</span>
            </p>))}
          <Link href="/lessons" className="mt-1 inline-block text-primary hover:underline">
            See and edit all lessons
          </Link>
        </div>)}
    </Section>);
}
function SeedBody({ job, script, isBrief }: {
    job: OutputJobRow;
    script?: ScriptLite;
    isBrief: boolean;
}) {
    const hookIds = (job.payload.hooks as string[] | undefined) ?? [];
    const advanced = useAdvanced();
    return (<>
      {typeof job.payload.target === "string" && (<div>
          <div className="text-xs text-muted-foreground">Talent</div>
          {job.payload.target}
        </div>)}
      {hookIds.length > 0 && (<div>
          <div className="mb-1 text-xs text-muted-foreground">Hooks to record (1 take each)</div>
          <ul className="list-disc space-y-0.5 pl-5">
            {hookIds.map((id) => (<li key={id}>
                {script?.hooks.find((h) => h.id === id)?.text}
              </li>))}
          </ul>
        </div>)}
      <div>
        <div className="mb-1 text-xs text-muted-foreground">Assets ({job.assets.length})</div>
        {job.assets.length ? (<div className="grid grid-cols-3 gap-2">
            {job.assets.map((a) => a.kind === "image" ? (<figure key={a.path}>

                  <img src={`/api/assets/${a.path}`} alt={a.caption ?? ""} className="w-full rounded border" data-testid="job-asset"/>
                  {a.caption && <figcaption className="mt-1 text-xs text-muted-foreground">{a.caption}</figcaption>}
                  {a.qa && (<div className={a.qa.status === "pass" ? "mt-1 text-xs text-emerald-700" : a.qa.status === "fail" ? "mt-1 text-xs text-red-700" : "mt-1 text-xs text-amber-700"} data-testid="job-asset-qa" data-qa={a.qa.status}>
                      {a.qa.status === "pass" ? "Passed the check" : a.qa.status === "fail" ? "Failed the check" : "Check it"}
                      {a.check_override && <span className="ml-1 text-muted-foreground">· Accepted by human reviewer</span>}
                      {a.qa.notes.length > 0 && (<ul className="mt-0.5 list-disc pl-4">
                          {a.qa.notes.slice(0, 4).map((n, k) => (<li key={k}>{n}</li>))}
                        </ul>)}
                    </div>)}
                </figure>) : a.kind === "video" ? (<video key={a.path} src={`/api/assets/${a.path}`} controls className="col-span-3 w-full rounded border"/>) : (<a key={a.path} href={`/api/assets/${a.path}`} className="text-primary underline">
                  {advanced ? a.path : "Open the file"}
                </a>))}
          </div>) : (<p className="text-muted-foreground">{isBrief ? "This is an example job with no brief. Use Make assets on the script to write one." : "Nothing generated yet."}</p>)}
      </div>
    </>);
}
type Act = (fn: () => Promise<ActionResult>, done?: string, after?: () => void) => void;
function ProductionBody({ job, p, busy, live, locked, act, onFeedDirty }: {
    job: OutputJobRow;
    p: ProductionState;
    busy?: Busy;
    live: boolean;
    locked: boolean;
    act: Act;
    onFeedDirty: (dirty: boolean) => void;
}) {
    const advanced = useAdvanced();
    const waiting = (advanced ? waitingOn(job, busy) : waitingOnPlain(job, busy))!;
    const [planDirty, setPlanDirty] = useState(false);
    const group = groupOfType(job.output_type);
    const approving = isApproval(p.next) ? (p.next.slice(8) as "script" | "plan" | PrepId | "clips") : null;
    const stuck = p.clips.filter((c) => c.status === "submitting");
    const tone = { running: "border-sky-200 bg-sky-50 text-sky-900", failed: "border-red-200 bg-red-50 text-red-800", you: "border-amber-200 bg-amber-50 text-amber-900", ready: "border-emerald-200 bg-emerald-50 text-emerald-900", finished: "bg-muted" }[waiting.kind];
    const ready = promptsReady(p);
    const canRun = p.next !== "done" && !approving;
    const recipe = recipeOf(p.recipe);
    const savable = group === "video" && !!p.character && approving !== "character" && !p.avatar_id && !!recipe && !!avatarKindFor(recipe);
    return (<>
      <div className={cn("space-y-2 rounded-md border p-3", tone)} data-testid="job-waiting" data-kind={waiting.kind}>
        <div className="flex items-center gap-2 font-medium">
          {busy && <Loader2 className="size-4 shrink-0 animate-spin"/>}
          <span className="break-words" data-testid={waiting.kind === "failed" ? "job-error" : undefined}>
            {waiting.text}
          </span>
          {busy && (<span className="ml-auto text-xs font-normal">
              <Elapsed since={busy.since}/>
            </span>)}
        </div>
        {busy && p.next === "clips" && <p className="text-xs">Each clip takes a few minutes. You can close this and come back: the job keeps running.</p>}
        {waiting.kind === "failed" && !live && /live mode/i.test(job.error ?? "") && <p className="text-xs">{advanced ? "The app is in mock mode. Set LLM_MODE=live in .env and restart to make video." : "Video is not switched on for this account."}</p>}
        {!busy && stuck.length > 0 && (<div className="space-y-2 text-xs" data-testid="clip-stuck">
            <p className="flex gap-2">
              <AlertTriangle className="size-4 shrink-0"/>
              {advanced ? (<>
              The app stopped while clip {stuck.map((c) => c.index + 1).join(", ")} was being sent, so it may already be paid for. Check the video provider&apos;s dashboard first. Reset the clip only if no video was made there.
                </>) : (<>The app stopped while clip {stuck.map((c) => c.index + 1).join(", ")} was being sent, so the clip may already exist. Ask your admin to check before you reset the clip.</>)}
            </p>
            {stuck.map((c) => (<Button key={c.index} size="sm" variant="outline" disabled={locked} onClick={() => act(() => resetClipAction(job.id, c.index), `Clip ${c.index + 1} reset`)} data-testid="clip-reset">
                Reset clip {c.index + 1}
              </Button>))}
          </div>)}
        {ready && !busy && !job.error && (<p className="text-xs" data-testid="prompts-ready">
            {p.prompts_ready!.why}
          </p>)}
        {canRun && !busy && (<div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={ready && !job.error ? "outline" : "default"} disabled={locked} onClick={() => act(() => runStepAction(job.id), ready ? "Writing the prompts again" : "Started")} data-testid={job.error ? "job-retry" : "job-run"}>
              {job.error ? "Try again" : ready ? "Write the prompts again" : runLabel(p.next)}
            </Button>
            {ready && !job.error ? (<span className="text-xs">Free. No clip is made.</span>) : advanced ? (<span className="text-xs" data-testid="step-cost">
              {job.error ? `${runLabel(p.next)}: ` : "Costs "}
              {stepCost(p)}
            </span>) : (job.error && <span className="text-xs">{runLabel(p.next)}</span>)}
            {p.next === "motion" && (<Button size="sm" variant="outline" disabled={locked} onClick={() => act(() => skipMotionAction(job.id), "Motion finishing skipped")} data-testid="skip-motion">
                Skip motion finishing
              </Button>)}
          </div>)}
      </div>

      <Stepper jobId={job.id} p={p} busy={!!busy}/>
      {p.script_clips && !p.video_plan && <p className="text-xs text-muted-foreground" data-testid="job-clip-layout">{scriptClipsText(p.script_clips)}</p>}
      {p.workflow && <p className="text-xs text-muted-foreground" data-testid="job-workflow">{p.workflow === "guided" ? "Step-by-step approval · each approval starts the next step" : "AI end to end · same generation models and checks"}</p>}
      {approving === "script" && <ScriptPreview key={job.updated_at} id={job.script_id} hookId={p.hook_id}/>}
      {!!p.check_overrides?.length && <p className="text-xs text-muted-foreground" data-testid="job-human-override">Human override recorded for {p.check_overrides.at(-1)!.stage}. The failed findings remain in the checks.</p>}

      {(group === "video" || group === "brief") && <VideoSettings jobId={job.id} p={p} video={group === "video"} locked={locked} act={act}/>}

      {approving && <Approval job={job} p={p} stage={approving} locked={locked} planDirty={planDirty} act={act}/>}

      {group === "video" && <CastOptions jobId={job.id} p={p} locked={locked} planDirty={planDirty} act={act}/>}

      {group === "video" && <MissingPhotos jobId={job.id} p={p} locked={locked}/>}

      {group === "video" && <StoryboardBoard jobId={job.id} p={p} locked={locked} planDirty={planDirty} act={act}/>}

      {(p.image_plan || p.video_plan) && (<Section title={approving === "plan" ? "The plan (edit it here)" : "The plan"} testid="job-plan">
          {advanced && p.audit.length > 0 && (<ul className="space-y-1 text-xs" data-testid="plan-audit">
              {p.audit.map((a, i) => (<li key={i} className="flex gap-1.5" data-testid="plan-audit-item" data-status={a.status}>
                  {a.status === "pass" ? <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600"/> : a.status === "warn" ? <AlertTriangle className="size-3.5 shrink-0 text-amber-600"/> : <XCircle className="size-3.5 shrink-0 text-red-600"/>}
                  <span className={a.status === "fail" ? "text-red-700" : ""}>{a.message}</span>
                </li>))}
            </ul>)}
          {approving === "plan" ? (<PlanEditor job={job} p={p} locked={locked} act={act} onDirty={setPlanDirty}/>) : (<details className="rounded-md border p-3">
              <summary className="cursor-pointer text-xs font-medium">Show the approved plan</summary>
              <div className="mt-3">
                <PlanEditor job={job} p={p} locked act={act} onDirty={setPlanDirty} readOnly/>
              </div>
            </details>)}
        </Section>)}

      {(["character", "look", "storyboard"] as const).map((s) => (p[s] && approving !== s && !p[s]!.frames ? <PrepView key={s} stage={s} rec={p[s]!} jobId={job.id} p={p} locked={locked} act={act}/> : null))}

      {savable && <SaveAvatar key={job.id} jobId={job.id} p={p} locked={locked}/>}

      {group === "brief" && p.brief_markdown && <BriefOutput job={job}/>}
      {group === "image" && p.next === "done" && p.image_plan && job.assets.some((a) => a.kind === "image") && !["sent", "discarded"].includes(job.status) && <details className="rounded-md border p-3" data-testid="finished-feed-editor">
        <summary className="cursor-pointer text-sm font-medium">Edit captions, headlines and button</summary>
        <p className="my-3 text-xs text-muted-foreground">Keeps the rendered image. Save the copy, then review it before sending.</p>
        <PlanEditor job={job} p={p} locked={locked} act={act} onDirty={onFeedDirty} feedOnly/>
      </details>}
      {group === "image" && job.assets.some((a) => a.kind === "image") && <ImageOutput job={job} plan={p.image_plan}/>}
      <a href={`/api/production/${job.id}/package`} download className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm text-primary" data-testid="creative-package"><Download className="size-4"/>Download this creative package</a>
      <Link href={`/landing/studio?ad=${encodeURIComponent(`script:${job.script_id}`)}`} className="inline-flex min-h-11 items-center gap-2 text-sm text-primary" data-testid="production-to-landing">Create a landing page from this script</Link>
      {group === "video" && p.video_plan?.ad_copy && <FeedCopy copy={p.video_plan.ad_copy}/>}
      {(advanced || ready) && group === "video" && p.video_plan && (!hasStoryboard(p) || p.storyboard?.status === "approved" ? <HandoffSection key={p.prompts_ready?.at ?? "pack"} jobId={job.id} approved={p.plan_status === "approved"} open={ready}/> : <p className="text-xs text-muted-foreground" data-testid="handoff-waits">Prompt pack: written once the storyboard is approved, because each clip's prompt is built around its frames.</p>)}
      {group === "video" && <VideoOutput p={p} jobId={job.id} brandId={job.brand_id} locked={locked}/>}
    </>);
}
function Stepper({ p, busy, jobId }: {
    p: ProductionState;
    busy: boolean;
    jobId: string;
}) {
    const stages = stageStates(p);
    const advanced = useAdvanced();
    return (<Section title="Steps" testid="job-stepper">
      <ol className="space-y-1.5">
        {stages.map((s, i) => {
            const context = STAGE_CONTEXT[s.id].filter((k) => p.context_used[k]?.length);
            return (<li key={s.id} className="flex gap-2" data-testid="job-step" data-step={s.id} data-state={s.state}>
              <span className="mt-0.5">
                {s.state === "done" ? <CheckCircle2 className="size-4 text-emerald-600"/> : s.state === "current" ? busy ? <Loader2 className="size-4 animate-spin text-sky-600"/> : <Circle className="size-4 fill-primary text-primary"/> : <Circle className="size-4 text-muted-foreground/40"/>}
              </span>
              <div className="min-w-0 flex-1">
                <div className={cn(s.state === "current" ? "font-medium" : s.state === "upcoming" ? "text-muted-foreground" : "")}>
                  {i + 1}. {STAGE_LABEL[s.id]}
                  {s.state === "current" && <span className="ml-2 text-xs font-normal text-muted-foreground">{busy ? "running now" : isApproval(p.next) ? "waiting for your approval" : "ready to run"}</span>}
                </div>
                {advanced && context.length > 0 && (<details className="text-xs text-muted-foreground" data-testid="step-context">
                    <summary className="cursor-pointer hover:text-foreground">Brand context this step was given</summary>
                    <ul className="mt-1 space-y-0.5 pl-3">
                      {context.map((k) => (<li key={k}>
                          <span className="font-medium">{CONTEXT_LABEL[k] ?? humanize(k)}:</span> {p.context_used[k].map(humanize).join(", ")}
                        </li>))}
                    </ul>
                  </details>)}
              </div>
            </li>);
        })}
      </ol>
      {advanced && (<p className="text-xs">
        <a href={`/costs/job/${jobId}`} className="text-primary hover:underline" data-testid="job-cost-link">
          What this job has cost: every step, model and call
        </a>
      </p>)}
      {advanced && p.skills_used.length > 0 && (<p className="text-xs text-muted-foreground" data-testid="job-skills">
          Skills used: {skillTitles(p.skills_used)}
        </p>)}
      {p.notes && <p className="text-xs whitespace-pre-wrap text-muted-foreground">Your notes: {p.notes}</p>}
    </Section>);
}
function PanelPicker({ stage, rec, selected, onSelect, viewLabels }: {
    stage: PrepId;
    rec: PrepStage;
    selected: number;
    onSelect?: (i: number) => void;
    viewLabels?: readonly string[];
}) {
    const angles = ["Face", "Waist up", "Full body"];
    if (rec.panels.length <= 1) {
        return <img src={assetUrl(rec.file)} alt={STAGE_LABEL[stage]} className="max-h-[28rem] rounded border" data-testid="stage-image"/>;
    }
    return (<div className="grid grid-cols-3 gap-2" data-testid="stage-panels">
      {rec.panels.map((f, i) => (<button key={f} type="button" disabled={!onSelect} onClick={() => onSelect?.(i)} aria-pressed={selected === i} className={cn("relative rounded border-2 text-left", selected === i ? "border-primary" : "border-transparent", onSelect && "hover:border-primary/50")} data-testid="stage-panel" data-selected={selected === i}>

          <img src={assetUrl(f)} alt={`${STAGE_LABEL[stage]} panel ${i + 1}`} className="w-full rounded"/>
          <span className="mt-1 block px-1 pb-1 text-xs">
            {stage === "character" ? (viewLabels?.[i] ?? angles[i] ?? `Panel ${i + 1}`) : `Clip ${i + 1}`}
            {selected === i && (<span className="ml-1 inline-flex items-center gap-0.5 font-medium text-primary">
                <Check className="size-3"/>
                {stage === "character" ? "reference angle" : "chosen"}
              </span>)}
          </span>
        </button>))}
    </div>);
}
function PrepView({ stage, rec, jobId, p, locked, act }: {
    stage: PrepId;
    rec: PrepStage;
    jobId: string;
    p: ProductionState;
    locked: boolean;
    act: Act;
}) {
    const [selected, setSelected] = useState(rec.selected);
    const [feedback, setFeedback] = useState("");
    const repairViews = stage === "character" && p.plan_status === "approved" && characterViewsRepairable(p, recipeOf(p.recipe)) && !p.clips.some((c) => c.status !== "pending");
    return (<Section title={`${STAGE_LABEL[stage]}${rec.status === "approved" ? " (approved)" : ""}`} testid={`stage-${stage}`}>
      <PanelPicker stage={stage} rec={rec} selected={repairViews ? selected : rec.selected} onSelect={repairViews && !locked ? setSelected : undefined} viewLabels={repairViews ? CHARACTER_VIEWS.map((v) => v.label) : undefined}/>
      {rec.feedback && <p className="text-xs text-muted-foreground">Made again with your notes: {rec.feedback}</p>}
      {repairViews && (<details className="rounded-md border p-3" data-testid="character-view-repair">
          <summary className="cursor-pointer text-xs font-medium">Correct one view</summary>
          <div className="mt-2 space-y-2">
            <Textarea rows={2} maxLength={1200} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Select a view above, then say what to correct" data-testid="character-view-notes"/>
            <Button size="sm" disabled={locked || feedback.trim().length < 4} onClick={() => act(() => regenerateCharacterViewsAction(jobId, [selected], feedback.trim()), "Drawing the selected view", () => setFeedback(""))} data-testid="regenerate-selected-view">
              Redraw selected view ({CHARACTER_VIEWS[selected]?.label}; 1 image)
            </Button>
            <p className="text-xs text-muted-foreground">Other panel pixels stay exact. The opening frame and storyboard need to be made again after you approve the repaired sheet.</p>
          </div>
        </details>)}
    </Section>);
}
function Approval({ job, p, stage, locked, planDirty, act }: {
    job: OutputJobRow;
    p: ProductionState;
    stage: "script" | "plan" | PrepId | "clips";
    locked: boolean;
    planDirty: boolean;
    act: Act;
}) {
    const rec = stage === "plan" || stage === "clips" || stage === "script" ? null : p[stage];
    const [selected, setSelected] = useState(rec?.selected ?? 0);
    const [feedback, setFeedback] = useState("");
    const advanced = useAdvanced();
    const broken = planApprovalBlockers(p);
    const flagged = productionFindings(p, [], job.assets).filter((a) => !broken.includes(a));
    const blocked = locked || planDirty || broken.length > 0;
    const claimsOn = p.claim_checks === true;
    const nextStage = NEXT_STAGE_AFTER_APPROVAL(p);
    const nextCost = nextStage ? stepCost({ ...p, next: nextStage }) : "";
    const approve = (run: boolean) => act(() => approveStageAction(job.id, { ...(rec && rec.panels.length > 1 && !rec.frames ? { selected } : {}), run }), run || p.workflow ? "Approved. The next step has started." : "Approved");
    const paid = stage !== "plan";
    const repairViews = stage === "character" && characterViewsRepairable(p, recipeOf(p.recipe));
    return (<Section title={`Approve ${STAGE_THING[stage]}`} testid="job-approval">
      {rec && (<>
          {rec.panels.length > 1 && <p className="text-xs text-muted-foreground">{stage === "character" ? "The whole sheet is the reference for this person in every later picture. Approve it, or ask for a change." : "Each frame is where 1 clip ends. Check the hands, the product and where each object is, then approve."}</p>}
          {rec.frames ? <p className="text-xs text-muted-foreground">The whole storyboard is laid out below, clip by clip. Change a frame's words or draw 1 frame again there, then approve here. No clip is made before you do.</p> : <PanelPicker stage={stage as PrepId} rec={rec} selected={selected} onSelect={locked ? undefined : setSelected} viewLabels={repairViews ? CHARACTER_VIEWS.map((v) => v.label) : undefined}/>}
        </>)}
      {broken.length > 0 && (<p className="text-xs text-red-700" data-testid="approval-blocked">
          Clip requirements need a fix: {broken.map((f) => f.message).join(" ")} Edit or regenerate the plan before approving. These requirements cannot be overridden.
        </p>)}
      {flagged.length > 0 && (<div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" data-testid="approval-flags">
          <p className="font-medium">
            {flagged.length === 1 ? "1 check flagged these words" : `${flagged.length} checks flagged these words`}. {broken.length ? "Fix the clip requirements first; you can then accept these editorial findings or edit the plan." : "You can accept these editorial findings and approve, or edit the plan first."}
          </p>
          <ul className="list-disc space-y-1 pl-4">
            {flagged.map((f, i) => (<li key={i}>{f.message}</li>))}
          </ul>
        </div>)}
      {(stage === "plan" || stage === "script") && (<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" data-testid="job-claims" data-claims={claimsOn ? "on" : "off"}>
            <>
              <span>Claim checks {claimsOn ? "on" : "off"}. You decide whether to accept flagged findings.</span>
              <Button size="sm" variant="outline" disabled={locked || planDirty} onClick={() => act(() => checkJobClaimsAction(job.id), "Reading the plan against the brand's claims")} title="Reads every word against the brand's claims, rewrites a failure once, and leaves the plan for you to approve" data-testid="job-check-claims">
                {claimsOn ? "Check claims again" : "Enable and check claims"}
              </Button>
            </>
        </div>)}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={blocked} onClick={() => approve(false)} data-testid="stage-approve">
          {broken.length ? "Fix clip requirements first" : flagged.length > 0 ? (p.workflow ? "Override checks and continue" : "Override checks and approve") : (p.workflow ? "Approve and continue" : "Approve")}
        </Button>
        {nextStage && !p.workflow && (<Button size="sm" disabled={blocked} onClick={() => approve(true)} data-testid="stage-approve-run">
            {broken.length ? "Fix clip requirements first" : <>{flagged.length > 0 ? "Override checks and " : "Approve and "}{runLabel(nextStage).charAt(0).toLowerCase() + runLabel(nextStage).slice(1)}{advanced && <> ({nextCost})</>}</>}
          </Button>)}
        {planDirty && <span className="text-xs text-amber-700">Save your plan edits first.</span>}
      </div>
      {stage !== "clips" && stage !== "script" && <details className="rounded-md border p-3" data-testid="regenerate">
        <summary className="cursor-pointer text-xs font-medium">Not right? Make it again with notes</summary>
        <div className="mt-2 space-y-2">
          <Textarea rows={2} maxLength={1200} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={stage === "plan" ? "What the plan should do differently" : "What should look different"} data-testid="regenerate-notes"/>
          <div className="flex flex-wrap items-center gap-2">
            {repairViews && (<Button size="sm" disabled={locked || feedback.trim().length < 4} onClick={() => act(() => regenerateCharacterViewsAction(job.id, [selected], feedback.trim()), "Drawing the selected view", () => setFeedback(""))} title="Draws this view as one separate image and replaces only its panel. Other panels stay exact. The opening frame and storyboard will need to be made again." data-testid="regenerate-selected-view">
                Redraw selected view ({CHARACTER_VIEWS[selected]?.label}; 1 image)
              </Button>)}
            {(stage === "character" || stage === "look") && (<Button size="sm" disabled={locked || feedback.trim().length < 4} onClick={() => act(() => regenerateStageAction(job.id, stage, feedback.trim(), { keep: true }), "Changing this picture", () => setFeedback(""))} title="Sends this picture back with your change. Everything you did not name stays as it is." data-testid="regenerate-change">
                Change this picture
              </Button>)}
            <Button size="sm" variant="outline" disabled={locked || !feedback.trim()} onClick={() => act(() => regenerateStageAction(job.id, stage, feedback.trim()), "Making it again with your notes", () => setFeedback(""))} title={paid ? "Makes a new picture from the start, with your notes" : undefined} data-testid="regenerate-submit">
              {stage === "character" || stage === "look" ? "Make a fresh one" : "Regenerate with notes"}
            </Button>
            {advanced ? (<span className="text-xs text-muted-foreground">{stage === "storyboard" ? `Costs ${stepCost({ ...p, next: "storyboard" })}: every frame is drawn again. To change 1 frame, use the frame's own buttons below.` : paid ? "Costs 1 image either way. Change this picture keeps everything you did not name. A fresh one starts over." : "Costs a few cents. This plan is replaced."}</span>) : (<span className="text-xs text-muted-foreground">{stage === "storyboard" ? "Every frame is drawn again. To change 1 frame, use the frame's own buttons below." : paid ? "Change this picture keeps everything you did not name. A fresh one starts over." : "This plan is replaced."}</span>)}
          </div>
        </div>
      </details>}
      {stage === "clips" && <p className="text-xs text-muted-foreground">Review the footage below before joining. Use a clip's retry control to replace it, or give feedback on this job.</p>}
    </Section>);
}
function PlanEditor({ job, p, locked, act, onDirty, readOnly, feedOnly = false }: {
    job: OutputJobRow;
    p: ProductionState;
    locked: boolean;
    act: Act;
    onDirty: (d: boolean) => void;
    readOnly?: boolean;
    feedOnly?: boolean;
}) {
    const [saving, setSaving] = useState(false);
    const save = (plan: {
        image?: ImagePlan;
        video?: VideoPlan;
    }) => {
        setSaving(true);
        act(async () => {
            const res = feedOnly && plan.image ? await saveImageFeedCopyAction(job.id, plan.image.ad_copy, job.updated_at) : await savePlanAction(job.id, plan);
            setSaving(false);
            return res;
        }, feedOnly ? "Feed copy saved. Review it before sending." : "Plan saved. It needs your approval again.");
    };
    const key = `${job.id}:${job.updated_at}`;
    if (p.image_plan)
        return <ImagePlanEditor key={key} plan={p.image_plan} locked={locked || !!readOnly} saving={saving} feedOnly={feedOnly} onSave={(image) => save({ image })} onDirty={onDirty}/>;
    if (p.video_plan)
        return <VideoPlanEditor key={key} plan={p.video_plan} seconds={clipSeconds(p)} mode={p.reference_mode} locked={locked || !!readOnly} saving={saving} onSave={(video) => save({ video })} onDirty={onDirty}/>;
    return null;
}
function BriefOutput({ job }: {
    job: OutputJobRow;
}) {
    const base = `/api/production/${job.id}/brief`;
    return (<Section title="The brief" testid="job-brief">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <a href={`${base}?format=pdf`} data-testid="brief-pdf">
            <Download className="size-4"/>
            Download PDF
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={`${base}?format=md`} data-testid="brief-md">
            <Download className="size-4"/>
            Download as text
          </a>
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <a href={`${base}?format=html`} target="_blank" rel="noreferrer" data-testid="brief-open">
            Open in a new tab
          </a>
        </Button>
      </div>
      <iframe src={`${base}?format=html`} title={`Brief for ${job.script_id}`} className="h-[36rem] w-full rounded-md border bg-white" data-testid="brief-frame"/>
    </Section>);
}
function FeedCopy({ copy }: {
    copy: ImagePlan["ad_copy"];
}) {
    return (<Section title="Copy to paste into Meta" testid="job-copy">
      <CopyRow label="Primary text, short" text={copy.primary_text.short}/>
      <CopyRow label="Primary text, medium" text={copy.primary_text.medium}/>
      <CopyRow label="Primary text, long" text={copy.primary_text.long}/>
      {copy.headlines.map((h, i) => (<CopyRow key={i} label={`Headline ${i + 1}`} text={h}/>))}
      {copy.description && <CopyRow label="Description" text={copy.description}/>}
      {copy.cta && <p className="text-xs text-muted-foreground">Button: {copy.cta}</p>}
    </Section>);
}
function CopyRow({ label, text }: {
    label: string;
    text: string;
}) {
    return (<div className="rounded-md border p-2" data-testid="copy-row">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="flex items-center gap-1">
          <span className="tabular-nums">
            {words(text)} words · {text.length} characters
          </span>
          <CopyButton text={text} label={label}/>
        </span>
      </div>
      <p className="mt-1 whitespace-pre-wrap">{text}</p>
    </div>);
}
function ImageOutput({ job, plan }: {
    job: OutputJobRow;
    plan?: ImagePlan;
}) {
    const [zoom, setZoom] = useState<number | null>(null);
    const images = job.assets.filter((a) => a.kind === "image");
    return (<Section title={`Images (${images.length})`} testid="job-images">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((a, i) => {
            const texts = plan?.cards[i]?.text_elements ?? [];
            return (<figure key={a.path} className="space-y-1" data-testid="image-card">
              <button type="button" onClick={() => setZoom(i)} className="block w-full" aria-label={`Enlarge card ${i + 1}`}>

                <img src={`/api/assets/${a.path}`} alt={a.caption ?? `Card ${i + 1}`} className="w-full rounded border hover:border-primary/50" data-testid="job-asset"/>
              </button>
              <figcaption className="text-xs">
                <div className="font-medium">Card {i + 1}</div>
                {texts.length ? (<ul className="text-muted-foreground" data-testid="card-texts">
                    {texts.map((t, k) => (<li key={k}>
                        <span className="text-foreground">&ldquo;{t.text}&rdquo;</span> {t.role}
                      </li>))}
                  </ul>) : (<span className="text-muted-foreground">No added text on this image.</span>)}
                <a href={`/api/assets/${a.path}`} download className="text-primary hover:underline">
                  Download
                </a>
              </figcaption>
            </figure>);
        })}
      </div>
      {plan && (<div className="space-y-2" data-testid="job-copy">
          <div className="text-xs font-medium">Copy to paste into Meta</div>
          <CopyRow label="Primary text, short" text={plan.ad_copy.primary_text.short}/>
          <CopyRow label="Primary text, medium" text={plan.ad_copy.primary_text.medium}/>
          <CopyRow label="Primary text, long" text={plan.ad_copy.primary_text.long}/>
          {plan.ad_copy.headlines.map((h, i) => (<CopyRow key={i} label={`Headline ${i + 1}`} text={h}/>))}
          {plan.ad_copy.description && <CopyRow label="Description" text={plan.ad_copy.description}/>}
          {plan.ad_copy.cta && <p className="text-xs text-muted-foreground">Button: {plan.ad_copy.cta}</p>}
        </div>)}
      <Dialog open={zoom !== null} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="sm:max-w-3xl" data-testid="image-zoom">
          <DialogHeader>
            <DialogTitle>Card {(zoom ?? 0) + 1}</DialogTitle>
            <DialogDescription>{images[zoom ?? 0]?.caption ?? ""}</DialogDescription>
          </DialogHeader>
          {zoom !== null && images[zoom] && (<img src={`/api/assets/${images[zoom].path}`} alt={images[zoom].caption ?? ""} className="max-h-[75vh] w-full object-contain"/>)}
        </DialogContent>
      </Dialog>
    </Section>);
}
function VideoOutput({ p, jobId, brandId, locked }: {
    p: ProductionState;
    jobId: string;
    brandId: string;
    locked: boolean;
}) {
    const advanced = useAdvanced();
    const canAdd = !p.joined && !!p.video_plan;
    const toAdd = p.clips.filter((c) => c.status !== "completed").length;
    const final = p.motion?.file ?? p.captioned ?? p.joined;
    if (!final && !p.clips.length)
        return null;
    const spent = p.clips.reduce((n, c) => n + (c.cost_usd ?? 0), 0);
    return (<Section title="Video" testid="job-video">
      {(final || p.clips.some((c) => c.status === "completed" && c.file)) && <Link href={`/video-editing?mode=ad&source=production&id=${encodeURIComponent(jobId)}&brand=${encodeURIComponent(brandId)}`} className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground" data-testid="production-edit-video">Edit these clips, captions and music</Link>}
      {final && (<div className="space-y-1">
          <video src={assetUrl(final)} controls className="max-h-[32rem] rounded border bg-black" data-testid="video-player"/>
          <p className="text-xs text-muted-foreground">
            {p.motion?.file ? (p.captioned ? "Final video with captions and motion finishing." : "Final video with motion finishing. No captions are drawn in.") : p.captioned ? "Joined video with captions. Motion finishing has not been added." : "Joined clips. No captions are drawn in."}{" "}
            <a href={assetUrl(final)} download className="text-primary hover:underline">
              Download
            </a>
          </p>
        </div>)}
      {p.clips.length > 0 && (<div className="space-y-1.5" data-testid="clip-list">
          {advanced ? (<div className="text-xs font-medium">
            Clips · {usd(spent)} spent
          </div>) : (<div className="text-xs font-medium">Clips</div>)}
          {canAdd && toAdd > 0 && (<p className="text-xs text-muted-foreground" data-testid="clip-upload-help">
              Made the clips yourself from the prompts? Add each one to its row. When they are all in, the app joins them into 1 video and adds the motion graphics.
            </p>)}
          {p.clips.map((c) => (<div key={c.index} className="rounded-md border p-2 text-xs" data-testid="clip-row" data-status={c.status}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Clip {c.index + 1}</span>
                <Badge variant={c.status === "failed" ? "destructive" : "secondary"} className="font-normal">
                  {c.status === "submitting" ? "outcome unknown" : c.status === "submitted" ? "generating" : c.status === "pending" ? "not started" : c.status}
                </Badge>
                {advanced && c.cost_usd != null && <span className="tabular-nums">{usd(c.cost_usd)}</span>}
                {c.file && (<a href={assetUrl(c.file)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Watch this clip
                  </a>)}
                {canAdd && c.status !== "submitting" && c.status !== "submitted" && <ClipUpload jobId={jobId} index={c.index} has={!!c.file} locked={locked}/>}
              </div>
              {c.error && <p className="mt-1 text-red-700">{advanced ? c.error : plainMessage(c.error)}</p>}
              {advanced && c.prompt && (<details className="mt-1">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Prompt sent to the video model ({c.prompt.length} characters)</summary>
                  <pre className="mt-1 font-sans whitespace-pre-wrap text-muted-foreground">{c.prompt}</pre>
                </details>)}
            </div>))}
        </div>)}
      {advanced && p.motion && p.motion.status !== "skipped" && (<div className="space-y-1.5 text-xs" data-testid="motion-plan">
          <div className="font-medium">Motion finishing{p.motion.style ? ` · ${p.motion.style} style` : ""}</div>
          {p.motion.rationale && <p className="text-muted-foreground">{p.motion.rationale}</p>}
          {p.motion.events.length > 0 && (<table className="w-full">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2">Time</th>
                  <th className="py-1 pr-2">Kind</th>
                  <th className="py-1 pr-2">Text</th>
                  <th className="py-1 pr-2">Where</th>
                  <th className="py-1">Why</th>
                </tr>
              </thead>
              <tbody>
                {p.motion.events.map((e, i) => (<tr key={i} className="border-t align-top" data-testid="motion-event">
                    <td className="py-1 pr-2 whitespace-nowrap tabular-nums">
                      {e.start.toFixed(1)} to {e.end.toFixed(1)}s
                    </td>
                    <td className="py-1 pr-2">{e.kind}</td>
                    <td className="py-1 pr-2">{e.text || "(underline)"}</td>
                    <td className="py-1 pr-2 whitespace-nowrap">{e.position.replace("-", " ")}</td>
                    <td className="py-1 text-muted-foreground">{e.purpose}</td>
                  </tr>))}
              </tbody>
            </table>)}
        </div>)}
      {p.motion?.status === "skipped" && <p className="text-xs text-muted-foreground">Motion finishing was skipped. The joined video is the final.</p>}
    </Section>);
}
