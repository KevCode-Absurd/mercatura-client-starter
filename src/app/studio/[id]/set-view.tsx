"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { confirmWriteAgain, useUnsavedWarning } from "@/components/unsaved-warning";
import Link from "next/link";
import { ApproveLanding } from "@/components/approve-landing";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ChevronDown, Download, Film, GraduationCap, ImageIcon, Loader2, PencilLine, Plus, RefreshCw, ScanSearch, ShieldCheck, Trash2, Type, X } from "lucide-react";
import { toast } from "sonner";
import { ExportButtons } from "../export-buttons";
import { useAdvanced } from "@/components/mode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VoiceNote } from "@/components/voice-note";
import { Working, WorkingMark } from "@/components/working";
import { PLAN_STEPS, planStep } from "@/lib/studio/timing";
import { TasteBar } from "@/components/taste-bar";
import { stageFor, surfaceOf, tasteOf } from "@/lib/studio/taste";
import { skillTitles } from "@/lib/skills/titles";
import type { LeverKey, Taste } from "@/lib/taste/types";
import type { StudioItem, StudioOutput, StudioText, StudioVariant } from "@/db/schema";
import { galleryIdentity, GALLERY_FOCUS } from "@/lib/studio/gallery";
import { variantTitle } from "@/lib/studio/overlay";
import { familyOfItem, formatBrief } from "@/lib/formats/families";
import { KIND_INFO, adType } from "@/lib/library/taxonomy";
import { archetypeOf } from "@/lib/studio/worlds";
import { cn } from "@/lib/utils";
import { acceptImageCheckAction, checkSetAction, deleteSetAction, feedbackAction, planSetAction, reelAction, removeItemAction, renderSetAction, retasteItemAction, saveItemAction, setStatusAction, type LearnedLesson, type SetStatus } from "../actions";
import { STATUS_LABEL, assetUrl, frameUrl, latestOutputs, mediaUrl, thumbUrl } from "../shared";
import { EarlierVersions } from "./earlier-versions";
import { VisualRepairPanel } from "./visual-repair";
const QA_TONE = { pass: "border-emerald-200 bg-emerald-50 text-emerald-700", warn: "border-amber-200 bg-amber-50 text-amber-700", fail: "border-red-200 bg-red-50 text-red-700" } as const;
const QA_LABEL = { pass: "Passed the check", warn: "Check it", fail: "Failed the check" } as const;
const ROLES = ["headline", "subhead", "point", "badge", "label", "price", "table", "quote", "attribution", "caption", "cta"];
const ROLE_NAME: Record<string, string> = { headline: "Headline", subhead: "Subhead", point: "Point", badge: "Badge", label: "Label", price: "Price", table: "Table", quote: "Quote", attribution: "Said by", caption: "Caption", cta: "Button" };
const SENSE = {
    ok: { tone: "text-emerald-700", label: "Checked before it is made: the picture makes sense." },
    fixed: { tone: "text-emerald-700", label: "Checked before it is made: the description was rewritten to fix" },
    check: { tone: "text-amber-800", label: "Checked before it is made: look at this first" },
} as const;
const ITEM_HIDES: LeverKey[] = ["look", "spread", "sell", "people"];
const isReview = (a: {
    check: string;
    line_index?: number;
}) => a.check === "ad_review" && a.line_index != null;
const WRAP = "max-sm:h-auto max-sm:shrink max-sm:py-1.5 max-sm:whitespace-normal max-sm:wrap-anywhere";
const hideIfBroken = (el: HTMLImageElement | null) => {
    if (el && el.complete && !el.naturalWidth)
        el.style.display = "none";
};
const AWARENESS: Record<string, string> = { unaware: "doesn't know the problem yet", problem_aware: "knows the problem", solution_aware: "is comparing kinds of solution", product_aware: "knows this product", most_aware: "is ready to buy" };
export function SetView({ initial, live, voice, personas = {}, productLabel }: {
    initial: SetStatus;
    live: boolean;
    voice: boolean;
    personas?: Record<string, string>;
    productLabel?: string;
}) {
    const router = useRouter();
    const advanced = useAdvanced();
    const [s, setS] = useState(initial);
    const [pending, start] = useTransition();
    const [zoom, setZoom] = useState<string | null>(null);
    const { run, busy } = s;
    const info = KIND_INFO[run.kind];
    const status = STATUS_LABEL[run.status];
    const planned = run.items.filter((i) => i.plan).length;
    const rendered = run.items.filter((i) => i.outputs.length).length;
    const fails = run.audit.filter((a) => a.status === "fail");
    const warns = run.audit.filter((a) => a.status === "warn" && !isReview(a));
    const claimsOn = run.context.claim_checks === true;
    const claimsRead = run.audit.some((a) => a.check === "claims_judge") || (claimsOn && run.log.some((x) => x.message.startsWith("Claims read")));
    const reviewed = run.audit.some((a) => a.check === "ad_review") || run.log.some((x) => x.message.startsWith("Ad review"));
    const refresh = useCallback(async () => {
        const res = await setStatusAction(run.id);
        if (res.ok)
            setS(res);
        return res.ok ? res : null;
    }, [run.id]);
    const working = busy || run.status === "planning" || run.status === "rendering";
    const wasWorking = useRef(working);
    useEffect(() => {
        if (!working) {
            if (wasWorking.current)
                router.refresh();
            wasWorking.current = false;
            return;
        }
        wasWorking.current = true;
        const t = setInterval(() => void refresh(), 2500);
        return () => clearInterval(t);
    }, [working, refresh, router]);
    const act = (fn: () => Promise<{
        ok: true;
    } | {
        ok: false;
        error: string;
    }>, done?: string) => start(async () => {
        const res = await fn();
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        if (done)
            toast.success(done);
        await refresh();
    });
    const unrendered = run.items.filter((i) => i.plan && latestOutputs(i.outputs).length < run.aspects.length);
    const madeWith = Object.keys(run.context.models).length > 0 || run.context.skills.length > 0 || run.context.fields.length > 0 || (run.context.claims_cut?.length ?? 0) > 0;
    const work = s.work;
    const doing = !working ? null : run.status === "rendering" || work?.op === "render" ? "render" : run.status === "planning" || work?.op === "plan" || run.status === "draft" ? "plan" : "other";
    const step = doing === "plan" && work ? planStep(run.log, work.startedAt) : 0;
    const inWork = run.items.filter((i) => !work || work.itemIds.includes(i.id));
    const total = work?.images ?? inWork.length * run.aspects.length;
    const ready = run.status === "rendering" ? inWork.filter((i) => i.status !== "rendering").length * run.aspects.length : 0;
    return (<div className="space-y-8 px-6 pb-6 pt-8 max-md:space-y-6 max-md:pt-6" data-testid="set-view" data-status={run.status}>

      <div className="rounded-xl border bg-card p-5 max-sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", status.tone)} data-testid="set-status">
            {working && <Loader2 className="mr-1 inline size-3 animate-spin"/>}
            {status.label}
          </span>
          <span className="text-sm text-muted-foreground">
            {planned} of {run.items.length} planned, {rendered} made
          </span>
          <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
            {planned > 0 && unrendered.length > 0 && (<Button className={WRAP} onClick={() => act(() => renderSetAction(run.id, { itemIds: unrendered.map((i) => i.id) }), live ? "Rendering started. Each image takes about a minute." : "Making samples.")} disabled={working || pending || fails.length > 0} data-testid="render-all">
                <ImageIcon className="size-4"/>
                Make {unrendered.length * run.aspects.length} image{unrendered.length * run.aspects.length === 1 ? "" : "s"}
                {advanced && live && <span className="font-normal opacity-80">about ${((s.estimate.usd / Math.max(1, s.estimate.images)) * unrendered.length * run.aspects.length).toFixed(2)}</span>}
              </Button>)}
            {planned > 0 && unrendered.length > 0 && fails.length > 0 && (<Button variant="outline" size="sm" className={WRAP} onClick={() => act(() => renderSetAction(run.id, { itemIds: unrendered.map((i) => i.id), force: true }), live ? "Rendering started. Each image takes about a minute." : "Making samples.")} disabled={working || pending} title="The failed checks stay on the plan for you to read. The images are made as the plan stands." data-testid="render-anyway">
                Override checks and make images
              </Button>)}

            {run.items.some((i) => i.plan) && <ExportButtons id={run.id} images={run.items.reduce((n, i) => n + latestOutputs(i.outputs).length, 0)}/>}
            <Button variant="outline" size="sm" className={WRAP} onClick={() => confirm("Write the whole plan again? Your edits to the words will be replaced.") && act(() => planSetAction(run.id), "Writing the plan again.")} disabled={working || pending} data-testid="replan">
              <RefreshCw className="size-3.5"/>
              Plan again
            </Button>
            {rendered > 1 && (<Button variant="outline" size="sm" className={WRAP} onClick={() => act(() => reelAction(run.id), "The reel is cut.")} disabled={working || pending} title="The pictures cut together fast, about 9 seconds, with no sound. No extra cost." data-testid="make-reel">
                <Film className="size-3.5"/>
                {run.context.reel_path ? "Cut the reel again" : "Cut a reel"}
              </Button>)}
            <Button variant="ghost" size="sm" className={WRAP} onClick={() => confirm("Delete this set and its images?") && start(async () => { const res = await deleteSetAction(run.id); if (res.ok)
        router.push("/studio");
    else
        toast.error(res.error); })} disabled={working || pending} data-testid="delete-set">
              <Trash2 className="size-3.5"/>
              Delete
            </Button>
          </div>
        </div>
        {run.context.reel_path && (<div className="mt-3 flex flex-wrap items-end gap-3" data-testid="set-reel">
            <video src={`${assetUrl(run.context.reel_path)}?v=${encodeURIComponent(run.updated_at)}`} controls loop muted playsInline className="h-56 rounded border bg-black"/>
            <div className="text-xs text-muted-foreground">
              <p>A reel of this set&apos;s pictures. No sound: add music in your editor.</p>
              <a href={assetUrl(run.context.reel_path)} download className="mt-1 inline-block font-medium text-primary hover:underline">
                Download the reel
              </a>
            </div>
          </div>)}
        {doing && (<Working className="mt-4" testId="set-working" job={doing === "render" ? "make" : "write"} title={work?.queued ? "Waiting for its turn: something else is being made first" : doing === "render" ? `Making the images: ${ready} of ${total} ready` : doing === "other" ? "Working on it" : live ? PLAN_STEPS[step].label : "Writing a sample plan"} step={doing === "plan" && live && !work?.queued ? `Step ${step + 1} of ${PLAN_STEPS.length}` : undefined} startedAt={work?.startedAt ?? run.updated_at} expect={live ? (work?.expect ?? 0) : 0} done={doing === "render" ? ready : 0} total={doing === "render" ? total : 0} note={doing === "render" ? "Each one is checked as it is made" : "You can leave this screen"}/>)}
        <p className={cn("mt-2 text-sm", doing && "sr-only")} data-testid="set-next">
          {run.status === "planning" || (run.status === "draft" && busy)
            ? "Writing what each image says and the words on it."
            : run.status === "draft"
                ? "The plan hasn't started. Press Plan again."
                : run.status === "planned"
                    ? fails.length
                        ? "The plan is written but a check failed. Fix the words marked below, then make the images."
                        : `Read the plan below. Change any words you like, then make the images. ${live ? "" : "The images will be samples."}`
                    : run.status === "rendering"
                        ? "Making the images. Each one is checked against the product photo. A failed one is made 1 more time."
                        : run.status === "review"
                            ? "Images are ready. Open one to see it at full size. Make any of them again with a note on what to change."
                            : "This set stopped. The reason is below."}
        </p>
        {(s.lastError || run.error) && run.status !== "planning" && run.status !== "rendering" && (<p className="mt-2 flex items-start gap-1.5 text-sm text-red-700" data-testid="set-error">
            <AlertTriangle className="mt-0.5 size-4 shrink-0"/>
            {run.error ?? s.lastError}
          </p>)}
      </div>


      {planned > 0 && (<div className="rounded-xl border bg-card p-5 max-sm:p-4" data-testid="set-audit">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium">Checks on the words</h2>
            <span className="text-xs text-muted-foreground" data-testid="claims-state">
              {claimsOn ? "Held to the brand's claims." : "Written freely: the facts are yours to verify."}
            </span>
            <div className="ml-auto flex min-w-0 flex-wrap gap-2">
              {run.kind !== "photoshoot" && (<Button size="sm" variant="outline" className={WRAP} disabled={working || pending} onClick={() => act(() => checkSetAction(run.id, "claims"), "Claim checks enabled. Reading the plan.")} data-testid="check-claims">
                  <ShieldCheck className="size-3.5"/>
                  {claimsRead ? "Check claims again" : "Check claims"}
                </Button>)}
              {run.kind === "ad" && (<Button size="sm" variant="outline" className={WRAP} disabled={working || pending} onClick={() => act(() => checkSetAction(run.id, "review"), "Ad review enabled. Reading the plan.")} data-testid="review-ads">
                  <ScanSearch className="size-3.5"/>
                  {reviewed ? "Review the ads again" : "Review these ads"}
                </Button>)}
            </div>
          </div>
          {fails.length + warns.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Nothing flagged by the rule checks.</p>}
          {run.log.some((entry) => entry.check_override) && <p className="mt-2 text-xs text-muted-foreground" data-testid="set-human-override">Human override recorded. New failed findings still need review.</p>}
          <ul className="mt-2 space-y-1 text-sm">
            {[...fails, ...warns].map((a, i) => (<li key={i} className={cn("flex items-start gap-2", a.status === "fail" ? "text-red-700" : "text-amber-800")}>
                {a.status === "fail" ? <X className="mt-0.5 size-4 shrink-0"/> : <AlertTriangle className="mt-0.5 size-4 shrink-0"/>}
                {a.message}
              </li>))}
          </ul>
        </div>)}


      <ol id={`studio-gallery-${run.id}`} tabIndex={-1} aria-label={`${productLabel ?? run.product_id} output gallery`} className={`space-y-6 ${GALLERY_FOCUS}`}>
        {run.items.map((item, i) => (<ItemCard productLabel={productLabel ?? run.product_id} key={item.id} n={i + 1} item={item} review={run.audit.filter((a) => isReview(a) && a.line_index === i).map((a) => a.message.replace(/^Image \d+, /, ""))} personas={personas} runId={run.id} kind={run.kind} context={run.context} aspects={run.aspects} working={working} live={live} canRemove={run.items.length > 1} voice={voice} onZoom={setZoom} onChanged={(next) => setS((cur) => ({ ...cur, run: next }))} refresh={refresh}/>))}
      </ol>


      {advanced && madeWith && (<details className="rounded-xl border bg-card px-5 py-4 text-sm max-sm:px-4 max-sm:wrap-anywhere" data-testid="set-how">
        <summary className="cursor-pointer font-medium">How this set was made</summary>
        <dl className="mt-3 grid gap-x-6 gap-y-2 md:grid-cols-[12rem_1fr]">
          {Object.entries(run.context.models).map(([k, v]) => (<div key={k} className="contents">
              <dt className="text-muted-foreground">{k.replace(/_/g, " ")}</dt>
              <dd className="font-mono text-xs">{v}</dd>
            </div>))}
          {run.context.skills.length > 0 && (<div className="contents">
              <dt className="text-muted-foreground">Skills used</dt>
              <dd>{skillTitles(run.context.skills)}</dd>
            </div>)}
          {run.context.fields.length > 0 && (<div className="contents">
              <dt className="text-muted-foreground">Brand material given</dt>
              <dd>{run.context.fields.join(", ").replace(/_/g, " ")}</dd>
            </div>)}
          {(run.context.claims_cut?.length ?? 0) > 0 && (<div className="contents" data-testid="set-claims-cut">
              <dt className="text-muted-foreground">Claims cut, and kept out</dt>
              <dd>
                <ul className="list-disc space-y-0.5 pl-4">
                  {run.context.claims_cut!.map((c, i) => (<li key={i}>{c.point}</li>))}
                </ul>
                <span className="mt-1 block text-xs text-muted-foreground">Taken out because the brand cannot hold them. A later round of this set is told not to bring them back.</span>
              </dd>
            </div>)}
        </dl>
        <ul className="mt-3 space-y-0.5 border-t pt-3 text-xs text-muted-foreground">
          {run.log.map((l, i) => (<li key={i}>
              {new Date(l.at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} {l.message}
            </li>))}
        </ul>
      </details>)}

      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Full size</DialogTitle>
            <DialogDescription>{info.label}</DialogDescription>
          </DialogHeader>

          {zoom && <img src={zoom} alt="Rendered image at full size" className="max-h-[75vh] w-full object-contain"/>}
        </DialogContent>
      </Dialog>
    </div>);
}
function FormatBriefNote({ item, headline }: {
    item: StudioItem;
    headline: string;
}) {
    const kindOf = archetypeOf(item.archetype);
    const b = formatBrief({ label: kindOf?.label ?? adType(item.type)?.label ?? item.label, family: familyOfItem(item), picture: kindOf?.picture ?? adType(item.type)?.job ?? "", headline, argument: item.plan?.argument ?? "", reason: item.reason });
    const rows: [
        string,
        string
    ][] = [
        ["Format", b.format],
        ["What is staged", b.artifact],
        ["The one line", b.one_line],
        ["Where it goes wrong", b.goes_wrong],
        ["Why it might work", b.might_work],
    ];
    return (<details className="text-xs" data-testid="item-format-brief">
      <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">Format brief</summary>
      <dl className="mt-1.5 grid gap-x-4 gap-y-1 sm:grid-cols-[9rem_1fr]">
        {rows.map(([k, v]) => (<div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd>{v}</dd>
          </div>))}
      </dl>
    </details>);
}
function ItemCard({ productLabel, n, item, review, personas, runId, kind, context, aspects, working, live, canRemove, voice, onZoom, onChanged, refresh }: {
    productLabel: string;
    n: number;
    item: StudioItem;
    review: string[];
    personas: Record<string, string>;
    runId: string;
    kind: "pdp" | "photoshoot" | "ad";
    context: SetStatus["run"]["context"];
    aspects: string[];
    working: boolean;
    live: boolean;
    canRemove: boolean;
    voice: boolean;
    onZoom: (url: string) => void;
    onChanged: (run: SetStatus["run"]) => void;
    refresh: () => Promise<unknown>;
}) {
    const plan = item.plan;
    const advanced = useAdvanced();
    const [texts, setTexts] = useState<StudioText[]>(plan?.text_elements ?? []);
    const [prompt, setPrompt] = useState(plan?.prompt ?? "");
    const [direction, setDirection] = useState(item.direction);
    const [copy, setCopy] = useState(plan?.ad_copy);
    const [feedback, setFeedback] = useState("");
    const [via, setVia] = useState<"typed" | "voice">("typed");
    const [learned, setLearned] = useState<{
        lessons: LearnedLesson[];
        status: string;
    } | null>(null);
    const [pending, start] = useTransition();
    const [open, setOpen] = useState(false);
    const stamp = JSON.stringify([plan?.text_elements, plan?.prompt, plan?.ad_copy]);
    const seen = useRef(stamp);
    useEffect(() => {
        if (seen.current === stamp)
            return;
        seen.current = stamp;
        setTexts(plan?.text_elements ?? []);
        setPrompt(plan?.prompt ?? "");
        setCopy(plan?.ad_copy);
    }, [stamp, plan]);
    const dirty = !!plan && (JSON.stringify(texts) !== JSON.stringify(plan.text_elements) || prompt !== plan.prompt || direction !== item.direction || JSON.stringify(copy) !== JSON.stringify(plan.ad_copy));
    useUnsavedWarning(dirty);
    const saveEdits = async () => {
        const res = await saveItemAction(runId, item.id, { text_elements: texts, prompt, direction, ...(copy ? { ad_copy: copy } : {}) });
        if (!res.ok) {
            toast.error(res.error);
            return false;
        }
        onChanged(res.run);
        return true;
    };
    const save = () => start(async () => void ((await saveEdits()) && toast.success("Saved")));
    const made = tasteOf({ kind, context }, item);
    const [taste, setTaste] = useState<Taste>(made);
    const retaste = () => start(async () => {
        const res = await retasteItemAction(runId, item.id, taste);
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(live ? "Planning this picture again with your choices." : "Writing a new sample plan.");
        await refresh();
    });
    const again = (opts: {
        remake: boolean;
        keep?: boolean;
    }) => start(async () => {
        if (dirty && !(await saveEdits()))
            return;
        const note = feedback.trim();
        if (!note) {
            const res = await renderSetAction(runId, { itemIds: [item.id], redo: true, force: true, ...(opts.keep ? { keep: true } : {}) });
            if (!res.ok)
                toast.error(res.error);
            else {
                toast.success(live ? (opts.keep ? "Changing the words on this picture. About a minute." : "Making it again. About a minute.") : "Making a new sample.");
                await refresh();
            }
            return;
        }
        const res = await feedbackAction(runId, { itemId: item.id, text: note, via, remake: opts.remake, keep: !!opts.keep });
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        setFeedback("");
        setVia("typed");
        setLearned({ lessons: res.learned, status: res.status });
        toast.success(opts.remake ? (live ? (opts.keep ? "Feedback kept. Changing this picture, about a minute." : "Feedback kept. Making it again, about a minute.") : "Feedback kept. Making a new sample.") : "Feedback kept.");
        await refresh();
    });
    const wordsDirty = !!plan && (JSON.stringify(texts) !== JSON.stringify(plan.text_elements) || JSON.stringify(copy) !== JSON.stringify(plan.ad_copy));
    const replan = () => start(async () => {
        if (!confirmWriteAgain(wordsDirty || wordsEdited))
            return;
        if (direction !== item.direction && !(await saveEdits()))
            return;
        const res = await planSetAction(runId, [item.id]);
        if (!res.ok)
            toast.error(res.error);
        else {
            toast.success("Writing this plan again with your direction.");
            await refresh();
        }
    });
    const applyReview = () => start(async () => {
        if (!confirmWriteAgain(wordsDirty || wordsEdited))
            return;
        const fixes = review.map((r) => r.split(" Fix: ")[1] ?? r).join(" ");
        const next = `${item.direction ? `${item.direction} ` : ""}From the ad review: ${fixes}`.slice(0, 600);
        const saved = await saveItemAction(runId, item.id, { direction: next });
        if (!saved.ok)
            return void toast.error(saved.error);
        setDirection(next);
        onChanged(saved.run);
        const res = await planSetAction(runId, [item.id]);
        if (!res.ok)
            toast.error(res.error);
        else {
            toast.success("Writing this ad again with the review's points.");
            await refresh();
        }
    });
    const outputs = latestOutputs(item.outputs);
    const wordsNow = JSON.stringify(texts.map((t) => t.text.trim()).filter(Boolean));
    const wordsEdited = outputs.some((o) => o.texts && JSON.stringify(o.texts.map((t) => t.text)) !== wordsNow);
    const canChange = outputs.length > 0 && (feedback.trim().length >= 4 || wordsEdited);
    const versions = item.outputs.length;
    return (<li className="rounded-xl border bg-card" data-testid="set-item" data-item={item.id} data-status={item.status}>
      <div className="grid grid-cols-1 gap-6 p-6 max-sm:gap-4 max-sm:p-4 lg:grid-cols-[8rem_minmax(0,1fr)_minmax(0,24rem)] xl:gap-8">

        <div>
          <div className="text-xs font-medium text-muted-foreground">
            {n}. {item.label}
          </div>
          {item.bucket && kind === "pdp" && (<a href={frameUrl(item.bucket)} target="_blank" rel="noreferrer" title="Open the template frame at full size" data-testid="item-frame">

              <img src={frameUrl(item.bucket)} alt={`Template frame: ${item.label}`} className="mt-2 w-full rounded-lg border bg-white object-cover max-lg:max-w-32" loading="lazy" ref={hideIfBroken} onError={(e) => (e.currentTarget.style.display = "none")}/>
            </a>)}
          {item.ref_id && (<a href={mediaUrl(item.ref_id)} target="_blank" rel="noreferrer" title="Open the reference at full size">

              <img src={thumbUrl(item.ref_id)} alt={`${item.label} reference`} className="mt-2 w-full rounded-lg border bg-muted object-cover max-lg:max-w-32" loading="lazy" ref={hideIfBroken} onError={(e) => (e.currentTarget.style.display = "none")}/>
            </a>)}
          {advanced && (<p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {item.bucket && kind === "pdp" ? (item.ref_id ? "Template frame, and the example it is dressed from. " : "Template frame. ") : "Reference. "}
            {item.reason}
          </p>)}
        </div>


        <div className="min-w-0 space-y-4 text-sm">
          {!plan ? (<p className="flex items-center gap-2 text-muted-foreground">
              {working ? <WorkingMark job="write" className="size-7"/> : null}
              {working ? "Planning this image" : item.error ? item.error : "Not planned yet."}
            </p>) : (<>
              <div>
                <h3 className="display text-2xl" data-testid="item-title">
                  {plan.title}
                </h3>
                {advanced && <p className="text-muted-foreground">{plan.argument}</p>}
                {advanced && (plan.buyer || plan.awareness) && (<p className="mt-1 text-xs text-muted-foreground" data-testid="item-buyer">
                    Written for <span className="font-medium text-foreground">{personas[plan.buyer ?? ""] ?? plan.buyer ?? "any buyer"}</span>
                    {plan.awareness && (<>
                        , who <span className="font-medium text-foreground">{AWARENESS[plan.awareness] ?? plan.awareness.replace(/_/g, " ")}</span>
                      </>)}
                    .
                  </p>)}
                {kind === "ad" && <ApproveLanding adId={`studio:${runId}:${item.id}`} className={cn("mt-2 h-7 text-xs", WRAP)}/>}
              </div>

              {advanced && review.length > 0 && (<div className="rounded-md border border-amber-200 bg-amber-50/60 p-3" data-testid="item-review">
                  <div className="flex items-center justify-between gap-2 max-sm:flex-wrap">
                    <div className="text-xs font-medium text-amber-900">Ad review: {review.length} point{review.length === 1 ? "" : "s"} before you make the images</div>
                    <Button size="sm" variant="outline" className={cn("h-7 bg-background text-xs", WRAP)} onClick={applyReview} disabled={pending || working} data-testid="item-review-apply">
                      {pending ? <Loader2 className="size-3.5 animate-spin"/> : <RefreshCw className="size-3.5"/>}
                      Write again with these
                    </Button>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-xs text-amber-900">
                    {review.map((r, i) => {
                    const [problem, fix] = r.split(" Fix: ");
                    return (<li key={i}>
                          {problem}
                          {fix && <span className="block text-amber-800/80">Fix: {fix}</span>}
                        </li>);
                })}
                  </ul>
                </div>)}

              {kind !== "photoshoot" && (<div data-testid="item-texts">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Words on the image</div>
                  <ul className="space-y-1.5">
                    {texts.map((t, i) => (<li key={i} className="flex items-center gap-1.5 max-sm:flex-wrap">
                        {advanced ? (<select aria-label="Role" value={ROLES.includes(t.role) ? t.role : "label"} onChange={(e) => setTexts((cur) => cur.map((x, k) => (k === i ? { ...x, role: e.target.value } : x)))} className="h-8 w-24 shrink-0 rounded-md border bg-background px-1 text-xs max-sm:w-full">
                          {ROLES.map((r) => (<option key={r} value={r}>
                              {r}
                            </option>))}
                        </select>) : (<span className="w-20 shrink-0 text-xs text-muted-foreground">{ROLE_NAME[t.role] ?? "Label"}</span>)}
                        <Input value={t.text} onChange={(e) => setTexts((cur) => cur.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))} className="h-8 text-sm max-sm:grow max-sm:basis-12" data-testid="item-text"/>
                        {advanced && t.source && (<span className="hidden shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground xl:inline" title="Where this fact comes from">
                            {t.source}
                          </span>)}
                        <button type="button" aria-label="Remove this line" title="Remove this line" className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setTexts((cur) => cur.filter((_, k) => k !== i))}>
                          <X className="size-3.5"/>
                        </button>
                      </li>))}
                  </ul>
                  <button type="button" className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => setTexts((cur) => [...cur, { role: "point", text: "", placement: "", source: "" }])}>
                    <Plus className="size-3"/> Add a line
                  </button>
                </div>)}


              {kind === "ad" && ((plan.figures?.length ?? 0) > 0 || (plan.quote_notes?.length ?? 0) > 0) && (<div data-testid="item-figures">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">Numbers on this ad</div>
                  <ul className="space-y-1 text-xs">
                    {(plan.figures ?? []).map((f, i) => (<li key={i} className={f.status === "not_found" ? "text-amber-800" : "text-muted-foreground"} data-figure={f.status}>
                        <span className="font-medium text-foreground">{f.figure}</span>
                        {f.text ? <> in &ldquo;{f.text}&rdquo;</> : null}: {f.note}
                      </li>))}
                    {(plan.quote_notes ?? []).map((q, i) => (<li key={`q${i}`} className="text-amber-800">
                        {q}
                      </li>))}
                  </ul>
                  <p className="mt-1 text-xs text-muted-foreground">Nothing here holds the ad up. Change a line above, or leave it as it is.</p>
                </div>)}

              {copy && (<div data-testid="item-adcopy" className="space-y-1.5">
                  <div className="text-xs font-medium text-muted-foreground">Copy for the feed</div>
                  <Textarea value={copy.primary_text} onChange={(e) => setCopy({ ...copy, primary_text: e.target.value })} className="min-h-24 text-sm" aria-label="Primary text"/>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <Input value={copy.headline} onChange={(e) => setCopy({ ...copy, headline: e.target.value })} aria-label="Headline" className="h-8"/>
                    <Input value={copy.cta} onChange={(e) => setCopy({ ...copy, cta: e.target.value })} aria-label="Call to action" className="h-8"/>
                  </div>
                  <Input value={copy.description} onChange={(e) => setCopy({ ...copy, description: e.target.value })} aria-label="Description" className="h-8"/>
                  {copy.more && <details className="rounded-md border p-2 text-xs">
                    <summary className="cursor-pointer">Other feed alternatives</summary>
                    <div className="mt-2 space-y-2">
                      {(["medium", "long"] as const).map((key) => <Textarea key={key} aria-label={`${key === "medium" ? "Medium" : "Long"} primary text`} value={copy.more?.[key] ?? ""} onChange={(e) => setCopy({ ...copy, more: { ...copy.more!, [key]: e.target.value } })}/>)}
                      {copy.more.headlines.map((line, index) => <Input key={index} aria-label={`Headline alternative ${index + 1}`} value={line} onChange={(e) => setCopy({ ...copy, more: { ...copy.more!, headlines: copy.more!.headlines.map((old, i) => i === index ? e.target.value : old) } })}/>)}
                    </div>
                  </details>}
                </div>)}

              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">The picture</div>
                <p>{plan.prompt_edited ? "Using your saved prompt for the scene and layout. Image checks use that direction too." : plan.scene}</p>
                {plan.adaptation && <p className="mt-1 text-xs text-muted-foreground">Changed from the reference: {plan.adaptation}</p>}
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">Your direction</div>
                <div className="flex gap-2 max-sm:flex-wrap">
                  <Input value={direction} onChange={(e) => setDirection(e.target.value.slice(0, 600))} placeholder="Tell the planner what to change, then write this plan again" className="h-8 text-sm" data-testid="item-direction"/>
                  <Button size="sm" variant="outline" className={WRAP} onClick={replan} disabled={working || pending} data-testid="item-replan">
                    Write again
                  </Button>
                </div>
              </div>

              {plan.sense && (advanced || plan.sense.status === "check") && (<div className={cn("text-xs", SENSE[plan.sense.status].tone)} data-testid="item-sense" data-sense={plan.sense.status}>
                  <span className="flex items-start gap-1.5">
                    {plan.sense.status === "check" ? <AlertTriangle className="mt-0.5 size-3.5 shrink-0"/> : <Check className="mt-0.5 size-3.5 shrink-0"/>}
                    {SENSE[plan.sense.status].label}
                  </span>
                  {plan.sense.notes.length > 0 && (<ul className="mt-1 list-disc space-y-0.5 pl-9 text-muted-foreground">
                      {plan.sense.notes.map((x, i) => (<li key={i}>{x}</li>))}
                    </ul>)}
                </div>)}

              {advanced && kind === "ad" && <FormatBriefNote item={item} headline={texts.find((t) => t.role === "headline")?.text ?? texts[0]?.text ?? ""}/>}

              {advanced && (<div>
                <button type="button" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => setOpen((o) => !o)} data-testid="item-prompt-toggle">
                  <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")}/>
                  Prompt for the image model
                </button>
                {open && <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="mt-1.5 min-h-56 font-mono text-xs md:text-xs" data-testid="item-prompt"/>}
              </div>)}

              {dirty && (<div className="flex items-center gap-2 max-sm:flex-wrap">
                  <Button size="sm" className={WRAP} onClick={save} disabled={pending} data-testid="item-save">
                    {pending && <Loader2 className="size-3.5 animate-spin"/>}
                    Save changes
                  </Button>
                  <span className="text-xs text-amber-700">Not saved. The image is made from the saved words.</span>
                </div>)}
            </>)}
        </div>


        <div className="min-w-0" data-testid="item-outputs">
          {item.status === "rendering" && outputs.length < aspects.length && (<p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <WorkingMark job="make" className="size-8"/> Making the image
            </p>)}
          {outputs.length === 0 && item.status !== "rendering" && <p className="text-sm text-muted-foreground">{item.error ? <span className="text-red-700">{item.error}</span> : plan ? "Not made yet." : ""}</p>}
          <div className={cn("grid gap-3", outputs.length > 1 && "grid-cols-2")}>
            {outputs.map((o) => (<OutputTile identity={galleryIdentity({ product: productLabel, argument: item.plan?.argument || item.label, itemId: item.id, aspect: o.aspect, version: o.version, copyState: o.copy_status, imageState: o.qa?.status })} key={o.path} o={o} onZoom={onZoom} locked={working || pending} onAccept={() => start(async () => { const result = await acceptImageCheckAction(runId, item.id, o.path); if (!result.ok)
            toast.error(result.error);
        else {
            onChanged(result.run);
            toast.success("Human override recorded.");
        } })} editHref={`/studio/${runId}/edit/${item.id}?aspect=${encodeURIComponent(o.aspect)}`} hasWords={kind !== "photoshoot" && (o.texts ? o.texts.length > 0 : texts.length > 0)}/>))}
          </div>
          <VariantStrip identityBase={`${productLabel}; item ${item.id}; argument ${item.plan?.argument || item.label}`} runId={runId} itemId={item.id} variants={item.variants ?? []} onZoom={onZoom}/>
          {outputs.length > 0 && <div className="mt-3 flex flex-wrap gap-3 text-sm"><a href={`/api/studio/${runId}/download?what=package&item=${encodeURIComponent(item.id)}`} download className="inline-flex min-h-11 items-center text-primary" data-testid="selected-creative-package">Download this creative package</a>{kind === "ad" && <Link href={`/landing/studio?ad=${encodeURIComponent(`studio:${runId}:${item.id}`)}`} className="inline-flex min-h-11 items-center text-primary" data-testid="creative-to-landing">Create its landing page</Link>}</div>}
          {outputs.length > 0 && (<div className="mt-3 space-y-1.5" data-testid="item-feedback-box">
              <Textarea value={feedback} onChange={(e) => {
                setFeedback(e.target.value.slice(0, 4000));
                setVia("typed");
            }} placeholder="What is wrong, or what to change. Type it or say it." className="min-h-16 text-sm" data-testid="item-feedback"/>
              <details className="rounded-md border px-3 py-2" data-testid="item-taste-box">
                <summary className="cursor-pointer text-sm font-medium">Make it differently: the product, the styling, the finish</summary>
                <TasteBar className="mt-3" surface={surfaceOf({ kind, context }, item)} stage={stageFor({ kind, context }, item)} hasReference={!!item.ref_id} value={taste} onChange={setTaste} view="advanced" hide={ITEM_HIDES} id={`item-taste-${item.id}`}/>
                <Button size="sm" variant="outline" className={cn(WRAP, "mt-3")} onClick={retaste} disabled={working || pending || JSON.stringify(taste) === JSON.stringify(made)} title="Writes this picture's plan again with these choices. The picture is then made from the new plan." data-testid="item-retaste">
                  Plan it again with these
                </Button>
              </details>
              <div className="flex flex-wrap items-center gap-2">
                {canChange && (<Button size="sm" className={WRAP} onClick={() => again({ remake: true, keep: true })} disabled={working || pending} title="Keeps this picture and changes only what you wrote here or edited in the words" data-testid="item-change">
                    {pending ? <Loader2 className="size-3.5 animate-spin"/> : <PencilLine className="size-3.5"/>}
                    Change this picture
                  </Button>)}
                <Button size="sm" variant="outline" className={WRAP} onClick={() => again({ remake: true })} disabled={working || pending} title="A new picture from the plan" data-testid="item-again">
                  {pending ? <Loader2 className="size-3.5 animate-spin"/> : <RefreshCw className="size-3.5"/>}
                  Make again
                </Button>
                {feedback.trim().length >= 4 && (<Button size="sm" variant="ghost" className={WRAP} onClick={() => again({ remake: false })} disabled={pending} title="Keep the note and learn from it, without making the image again" data-testid="item-feedback-save">
                    Only save the feedback
                  </Button>)}
                {voice && (<VoiceNote disabled={pending} testId="item-voice" onText={(t) => {
                    setFeedback((cur) => `${cur}${cur && !/\s$/.test(cur) ? " " : ""}${t}`.slice(0, 4000));
                    setVia("voice");
                }}/>)}
                {versions > outputs.length && <EarlierVersions identityBase={`${productLabel}; item ${item.id}; argument ${item.plan?.argument || item.label}`} outputs={item.outputs} onZoom={onZoom} runId={runId} itemId={item.id} disabled={working || pending || dirty} onChanged={onChanged}/>}
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">Feedback is kept and turned into lessons, so the next image doesn&apos;t repeat the mistake.</p>
              <VisualRepairPanel runId={runId} itemId={item.id} disabled={working || pending || dirty} onStarted={() => { void refresh(); }}/>
              {learned && (<div className="rounded-md border bg-muted/40 p-2 text-xs" data-testid="item-learned">
                  <div className="flex items-center gap-1.5 font-medium">
                    <GraduationCap className="size-3.5"/>
                    {learned.lessons.length ? "Learned for next time" : learned.status === "failed" ? "Kept, but it couldn't be read for lessons" : learned.status === "logged" ? "Kept. Its rule waits on the Lessons screen for a yes" : "Kept. Nothing lasting to learn: it reads as a one-off change"}
                  </div>
                  {learned.lessons.length > 0 && (<ul className="mt-1 space-y-1">
                      {learned.lessons.map((x) => (<li key={x.id}>
                          {x.rule}{" "}
                          <span className="text-muted-foreground">({x.isNew ? (x.scope === "general" ? "new, could apply to every brand" : x.scope === "product" ? "new, for this product" : "new, for this brand") : "already known, counted again"})</span>
                        </li>))}
                    </ul>)}
                  <Link href="/lessons" className="mt-1 inline-block text-primary hover:underline">
                    See and edit all lessons
                  </Link>
                </div>)}
            </div>)}
          {plan && canRemove && (<button type="button" className="mt-3 text-xs text-muted-foreground hover:text-red-700 hover:underline" disabled={working || pending} onClick={() => confirm("Remove this image from the set?") && start(async () => { const res = await removeItemAction(runId, item.id); if (!res.ok)
            toast.error(res.error);
        else {
            await refresh();
            requestAnimationFrame(() => document.getElementById(`studio-gallery-${runId}`)?.focus());
        } })} aria-label={`Remove ${productLabel}, ${item.id}, ${item.plan?.argument || item.label} from the set`} data-testid="item-remove">
              Remove from the set
            </button>)}
        </div>
      </div>
    </li>);
}
export function VariantStrip({ identityBase, runId, itemId, variants, onZoom }: {
    identityBase: string;
    runId: string;
    itemId: string;
    variants: StudioVariant[];
    onZoom: (url: string) => void;
}) {
    const made = variants.filter((v) => v.path);
    if (!variants.length)
        return null;
    const edit = `/studio/${runId}/edit/${itemId}?aspect=${encodeURIComponent(variants[0].aspect)}`;
    return (<div className="mt-3 rounded-lg border p-2.5" data-testid="item-variants">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-medium">
          {variants.length} variant{variants.length === 1 ? "" : "s"} of this ad
        </span>
        <span className="text-muted-foreground">The same picture, other words</span>
        <Link href={edit} className="ml-auto text-primary hover:underline" aria-label={`Edit variants for ${identityBase}`} data-testid="item-variants-edit">
          Edit or write more
        </Link>
        {made.length > 0 && (<a href={`/api/studio/${runId}/download?item=${encodeURIComponent(itemId)}&variants=all`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground" title="Download every variant of this ad" aria-label={`Download all current variants for ${identityBase}`} data-testid="item-variants-download">
            <Download className="size-3.5"/>
            All
          </a>)}
      </div>
      {made.length > 0 ? (<ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {made.map((v) => (<li key={v.id} className="relative" data-testid="item-variant">
              <button type="button" onClick={() => onZoom(assetUrl(v.path!))} className={`block w-full ${GALLERY_FOCUS}`} title={variantTitle(v.layers)} aria-label={`Inspect ${identityBase}; ${v.aspect}; version ${v.id}; ${variantTitle(v.layers)}; copy ${v.copy_status ?? "unreviewed"}; image inspection pending`}>

                <img src={assetUrl(v.path!, 320)} alt={`${identityBase}; ${v.aspect}; version ${v.id}; ${variantTitle(v.layers)}; copy ${v.copy_status ?? "unreviewed"}; image inspection pending`} className="w-full rounded-md border bg-muted object-cover" style={/^\d+:\d+$/.test(v.aspect) ? { aspectRatio: v.aspect.replace(":", " / ") } : undefined} loading="lazy"/>
              </button>
              <a href={assetUrl(v.path!)} download className={`absolute right-1 top-1 rounded bg-background/85 p-1 text-muted-foreground shadow-sm hover:text-foreground ${GALLERY_FOCUS}`} title="Download this variant" aria-label={`Download ${identityBase}; ${v.aspect}; version ${v.id}; ${variantTitle(v.layers)}; copy ${v.copy_status ?? "unreviewed"}; image inspection pending`}>
                <Download className="size-3"/>
              </a>
            </li>))}
        </ul>) : (<p className="text-xs text-muted-foreground">Their words are written. Server compositing continues independently; open the editor to inspect progress or retry a held variant.</p>)}
    </div>);
}
export function OutputTile({ identity, o, onZoom, editHref, hasWords, locked, onAccept }: {
    identity: string;
    o: StudioOutput;
    onZoom: (url: string) => void;
    editHref?: string;
    hasWords?: boolean;
    locked: boolean;
    onAccept: () => void;
}) {
    const url = assetUrl(o.path);
    const advanced = useAdvanced();
    return (<div className="[&_a:focus-visible]:outline [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4" data-testid="output" data-qa={o.qa?.status ?? "none"}>
      {o.qa?.status === "fail" && (o.check_override ? <p className="mb-2 text-xs text-muted-foreground" data-testid="image-human-override">Accepted by human reviewer. Failed findings retained.</p> : <Button size="sm" variant="outline" className="mb-2" disabled={locked} onClick={onAccept} data-testid="accept-image-check" aria-label={`Accept failed image check for ${identity}`}>Accept image despite check</Button>)}
      <button type="button" onClick={() => onZoom(url)} className={`block w-full ${GALLERY_FOCUS}`} title="Open at full size" aria-label={`Inspect ${identity}`}>

        <img src={assetUrl(o.path, 640)} alt={identity} className="w-full rounded-lg border bg-muted object-cover" style={/^\d+:\d+$/.test(o.aspect) ? { aspectRatio: o.aspect.replace(":", " / ") } : undefined} loading="lazy"/>
      </button>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">
          {o.aspect} v{o.version}
        </span>
        {o.copy_status && <span className="text-muted-foreground" data-testid="output-copy-status">{o.copy_status === "approved" ? "Copy approved" : o.copy_status === "unverified" ? "Draft · copy review unverified" : "Draft · copy approval pending"}</span>}
        {o.qa && (<span className={cn("flex items-center gap-1 rounded-full border px-1.5 py-0.5", QA_TONE[o.qa.status])} data-testid="output-qa">
            {o.qa.status === "pass" ? <Check className="size-3"/> : <AlertTriangle className="size-3"/>}
            {QA_LABEL[o.qa.status]}
          </span>)}
        <a href={url} download className="ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground" title="Download" aria-label={`Download ${identity}`}>
          <Download className="size-3.5"/>
        </a>
      </div>
      {o.repair && (<div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground" data-testid="output-repair-provenance">
          <span>{o.repair.decision === "retained-original" ? "Original image retained · rechecked" : "Selective repair · reviewed pixels"}</span>
          {o.repair.editable_svg_path && <a href={assetUrl(o.repair.editable_svg_path)} download className="text-primary hover:underline">Editable SVG</a>}
          {o.repair.editable_layers_path && <a href={assetUrl(o.repair.editable_layers_path)} download className="text-primary hover:underline">Layer data</a>}
          <a href={assetUrl(o.repair.approval_path)} download className="text-primary hover:underline">Review evidence</a>
        </div>)}
      {editHref && (<div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          <Link href={editHref} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium hover:bg-muted" title="Change a line, its font or its place on this picture, and keep each one as a new ad. No new image is made." data-testid="output-edit-words" aria-label={`Edit words for ${identity}`}>
            <Type className="size-3.5"/>
            {hasWords ? "Edit the words" : "Add words"}
          </Link>
          {o.layers && <span className="text-muted-foreground" data-testid="output-typeset">Words set as type</span>}
        </div>)}
      {o.base_path && !o.layers && (<div className="mt-1.5 flex items-center gap-2 text-xs" data-testid="output-base">
          <button type="button" onClick={() => onZoom(assetUrl(o.base_path!))} className="shrink-0" title="Open the copy without words at full size" aria-label={`Inspect words-free base for ${identity}`}>

            <img src={assetUrl(o.base_path, 160)} alt={`Words-free base for ${identity}`} className="size-12 rounded-lg border bg-muted object-cover" loading="lazy"/>
          </button>
          <span className="text-muted-foreground">Without words, to set your own type on</span>
          <a href={assetUrl(o.base_path)} download className="ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground" title="Download the copy without words" aria-label={`Download words-free base for ${identity}`}>
            <Download className="size-3.5"/>
          </a>
        </div>)}
      {o.qa && o.qa.notes.length > 0 && (advanced || o.qa.status !== "pass") && (<ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] leading-snug text-muted-foreground">
          {o.qa.notes.slice(0, 4).map((x, i) => (<li key={i}>{x}</li>))}
        </ul>)}
    </div>);
}
