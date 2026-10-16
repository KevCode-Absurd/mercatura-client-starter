"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, CircleAlert, Loader2, Pencil, RefreshCw, Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ExportButtons } from "../../export-buttons";
import { useAdvanced } from "@/components/mode";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { adType } from "@/lib/library/taxonomy";
import { AWARENESS, FORMATS, GROUPS, HOOKS, TOP_HOOKS, formatOf, words } from "@/lib/sprint/formats";
import { LAYOUTS, SPRINT_LOOKS, lookOf } from "@/lib/sprint/looks";
import { worldOf } from "@/lib/studio/worlds";
import { cn } from "@/lib/utils";
import { assetUrl, thumbUrl } from "../../shared";
import { approveBriefsAction, approvePlanAction, deleteSprintAction, editSlotAction, enableSprintChecksAction, replanSprintAction, resumeSprintAction, sprintStatusAction, swapRefAction, type AdView, type SprintView } from "../actions";
import { CopyPanel } from "./copy-panel";
import { generateSprintCopyAction } from "../actions";
import { SPRINT_STATUS, photoUrl } from "../shared";
import { pastTimeLine } from "@/lib/jobs/past-time";
const usd = (n: number) => `$${n.toFixed(2)}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lookId = (slot: {
    look?: string;
}) => slot.look ?? LAYOUTS;
const STEPS = [
    { id: "plan", label: "1. Plan" },
    { id: "briefs", label: "2. Briefs" },
    { id: "images", label: "3. Images and copy" },
] as const;
export function SprintScreen({ initial, live }: {
    initial: SprintView;
    live: boolean;
}) {
    const router = useRouter();
    const advanced = useAdvanced();
    const [view, setView] = useState(initial);
    const [pending, start] = useTransition();
    const s = view.sprint;
    const working = view.busy || s.status === "planning" || s.status === "briefing" || s.status === "rendering" || s.status === "draft";
    const refresh = useCallback(async () => {
        const res = await sprintStatusAction(s.id);
        if (res.ok)
            setView(res.view);
    }, [s.id]);
    const wasWorking = useRef(working);
    useEffect(() => {
        if (!working) {
            if (wasWorking.current)
                router.refresh();
            wasWorking.current = false;
            return;
        }
        wasWorking.current = true;
        const t = setInterval(() => void refresh(), 3000);
        return () => clearInterval(t);
    }, [working, refresh, router]);
    const act = (fn: () => Promise<{
        ok: true;
    } | {
        ok: false;
        error: string;
    }>, done?: string) => start(async () => {
        const res = await fn();
        if (!res.ok)
            return void toast.error(res.error);
        if (done)
            toast.success(done);
        await refresh();
    });
    const hasBriefs = s.set_ids.length > 0;
    const hasImages = view.progress.rendered > 0;
    const [tab, setTab] = useState<(typeof STEPS)[number]["id"]>(hasImages || s.status === "rendering" ? "images" : hasBriefs ? "briefs" : "plan");
    const stage = s.status === "rendering" || s.status === "done" ? "images" : s.status === "briefing" || s.status === "briefs_ready" ? "briefs" : "plan";
    const lastStage = useRef(stage);
    useEffect(() => {
        if (lastStage.current !== stage) {
            lastStage.current = stage;
            setTab(stage);
        }
    }, [stage]);
    const st = SPRINT_STATUS[s.status];
    return (<div className="space-y-6 p-6" data-testid="sprint" data-status={s.status}>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <span className={cn("rounded-full border px-2 py-0.5 text-xs", st.tone)} data-testid="sprint-status">
          {working && <Loader2 className="mr-1 inline size-3 animate-spin"/>}
          {st.label}
        </span>
        <Button size="sm" variant="outline" disabled={pending || working} onClick={() => act(() => enableSprintChecksAction(s.id), "Claim checks enabled for this sprint.")} data-testid="sprint-check-claims">
          {s.options.claim_checks ? "Check claims again" : "Enable claim checks"}
        </Button>
        {!!s.approved.check_overrides?.length && <span className="text-xs text-muted-foreground" data-testid="sprint-human-override">Human override recorded. Failed findings retained.</span>}
        {s.status === "briefing" && <span className="text-xs text-muted-foreground">{view.ads.filter(a => a.slot.avatar).length} of {view.ads.filter(a => a.slot.casting).length} character references ready. {view.progress.written} of {s.size} briefs written. {cap(pastTimeLine(view.times?.briefs, "in all"))}; this page updates itself.</span>}
        {s.status === "rendering" && <span className="text-xs text-muted-foreground">{view.progress.images} of {s.size * (s.options.aspects?.length ?? 1)} images made and checked.</span>}
        {advanced && (<span className="ml-auto text-xs text-muted-foreground" data-testid="sprint-cost">
          Cost so far <span className="font-medium tabular-nums text-foreground">{usd(view.cost.total)}</span> (text {usd(view.cost.text)}, {view.cost.rendered} images {usd(view.cost.images)}){" "}
          <Link href={`/costs/sprint/${s.id}`} className="text-primary hover:underline">
            Every call
          </Link>
        </span>)}
        {!hasBriefs && !working && (<Button size="icon" variant="ghost" className={advanced ? "size-7" : "ml-auto size-7"} aria-label="Delete this sprint" disabled={pending} onClick={() => start(async () => {
                const res = await deleteSprintAction(s.id);
                if (!res.ok)
                    return void toast.error(res.error);
                router.push("/studio/sprint");
            })}>
            <Trash2 className="size-3.5"/>
          </Button>)}
      </div>

      {s.status === "failed" && (<div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" data-testid="sprint-error">
          <CircleAlert className="size-4 shrink-0"/>
          <p className="min-w-0 flex-1">{view.lastError ?? "The last step stopped."} What was already made is kept.</p>
          <Button size="sm" variant="outline" className="bg-card" disabled={pending} onClick={() => act(() => resumeSprintAction(s.id))}>
            <RefreshCw className="size-4"/> Start it again
          </Button>
        </div>)}

      <div className="flex gap-1 border-b" role="tablist">
        {STEPS.map((x) => {
            const off = (x.id === "briefs" && !hasBriefs) || (x.id === "images" && !hasImages && s.status !== "rendering");
            return (<button key={x.id} type="button" role="tab" aria-selected={tab === x.id} disabled={off} onClick={() => setTab(x.id)} className={cn("-mb-px border-b-2 px-3 py-2 text-sm", tab === x.id ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground", off && "opacity-40")} data-testid={`sprint-tab-${x.id}`}>
              {x.label}
            </button>);
        })}
      </div>

      {tab === "plan" && <Plan view={view} live={live} pending={pending || working} act={act}/>}
      {tab === "briefs" && <Briefs view={view} live={live} pending={pending || working} act={act}/>}
      {tab === "images" && <Wall view={view} refresh={refresh} pending={pending || working} act={act}/>}

      {advanced && (<details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">What happened, step by step ({s.log.length})</summary>
        <ul className="mt-2 space-y-0.5" data-testid="sprint-log">
          {s.log.map((l, i) => (<li key={i}>
              <span className="tabular-nums">{new Date(l.at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span> {l.message}
            </li>))}
        </ul>
      </details>)}
    </div>);
}
type Act = (fn: () => Promise<{
    ok: true;
} | {
    ok: false;
    error: string;
}>, done?: string) => void;
function Issues({ view }: {
    view: SprintView;
}) {
    const advanced = useAdvanced();
    const a = view.sprint.audit.filter((x) => !x.ads?.length);
    if (!a.length || !advanced)
        return null;
    return (<details className="rounded-md border p-3 text-xs" data-testid="sprint-issues">
      <summary className="cursor-pointer text-muted-foreground">
        {a.length} note{a.length === 1 ? "" : "s"} on the mix as a whole
      </summary>
      <ul className="mt-2 space-y-1">
        {a.map((x, i) => (<li key={i} className="flex gap-2 text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0"/>
            {x.message}
          </li>))}
      </ul>
    </details>);
}
function AdPoints({ view, n }: {
    view: SprintView;
    n: number;
}) {
    const mine = view.sprint.audit.filter((x) => x.ads?.includes(n));
    if (!mine.length)
        return null;
    return (<ul className="mt-1 space-y-0.5" data-testid="slot-points">
      {mine.map((x, i) => (<li key={i} className={cn("flex gap-1.5 text-xs", x.level === "fail" ? "text-red-700" : "text-amber-800")}>
          <AlertTriangle className="mt-0.5 size-3 shrink-0"/>
          {x.message}
        </li>))}
    </ul>);
}
function Spread({ title, rows, total }: {
    title: string;
    rows: {
        label: string;
        n: number;
        strong?: boolean;
    }[];
    total: number;
}) {
    return (<div className="rounded-lg border p-3">
      <h3 className="text-xs font-medium">{title}</h3>
      <ul className="mt-2 space-y-1">
        {rows.map((r) => (<li key={r.label} className="flex items-center gap-2 text-xs">
            <span className={cn("w-32 shrink-0 truncate", r.strong && "font-medium")} title={r.label}>
              {r.label}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-primary/70" style={{ width: `${total ? (r.n / total) * 100 : 0}%` }}/>
            </span>
            <span className="w-5 text-right tabular-nums text-muted-foreground">{r.n}</span>
          </li>))}
      </ul>
    </div>);
}
function Plan({ view, live, pending, act }: {
    view: SprintView;
    live: boolean;
    pending: boolean;
    act: Act;
}) {
    const s = view.sprint;
    const advanced = useAdvanced();
    const slots = view.ads.map((a) => a.slot);
    const [notes, setNotes] = useState(s.notes);
    const [editing, setEditing] = useState<number | null>(null);
    const count = (f: (x: (typeof slots)[number]) => string) => slots.reduce((m, x) => m.set(f(x), (m.get(f(x)) ?? 0) + 1), new Map<string, number>());
    const editable = s.status === "plan_ready";
    const leads = view.assets.filter((a) => slots.some((x) => x.photo === a.file));
    if (!slots.length)
        return (<p className="text-sm text-muted-foreground" data-testid="plan-waiting">
        {s.status === "failed" ? "The plan was not written." : `Filing the product photos, then writing the angle map and an idea for every ad. ${cap(pastTimeLine(view.times?.plan))}.`}
      </p>);
    const byFormat = count((x) => x.format);
    const byAngle = count((x) => x.angle);
    const byHook = count((x) => x.hook);
    const byStage = count((x) => x.awareness);
    const byPersona = count((x) => x.persona);
    const byProduct = count((x) => x.product_id);
    const byLook = count(lookId);
    const mixed = slots.some((x) => x.look);
    return (<div className="space-y-6" data-testid="plan">
      <Issues view={view}/>

      {advanced && (<>
      <section>
        <h2 className="text-sm font-medium">The mix of formats</h2>
        <table className="mt-2 w-full text-sm" data-testid="plan-formats">
          <tbody>
            {GROUPS.map((g) => {
                const fs = FORMATS.filter((f) => f.group === g.id && byFormat.get(f.id));
                const n = fs.reduce((k, f) => k + (byFormat.get(f.id) ?? 0), 0);
                return (<tr key={g.id} className="border-t align-top">
                  <td className="w-10 py-1.5 font-medium tabular-nums">{n}</td>
                  <td className="w-52 py-1.5 font-medium">{g.label}</td>
                  <td className="py-1.5 text-muted-foreground">{fs.map((f) => `${f.label} ${byFormat.get(f.id)}`).join(" · ")}</td>
                </tr>);
            })}
          </tbody>
        </table>
        <p className="mt-1 text-xs text-muted-foreground">{slots.filter((x) => x.text_forward).length} of {slots.length} are text-forward: the words carry the ad and the pack is a small anchor.</p>
      </section>

      <section>
        <h2 className="text-sm font-medium">The angle map</h2>
        <ul className="mt-2 grid gap-2 md:grid-cols-2" data-testid="plan-angles">
          {s.angles.map((a) => (<li key={a.id} className="rounded-lg border p-3 text-sm" data-testid="plan-angle">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{a.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{byAngle.get(a.id) ?? 0} ads</span>
              </div>
              <p className="mt-0.5 text-muted-foreground">{a.line}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {view.personas[a.persona] ?? a.persona}
                {a.source ? ` · from ${a.source}` : ""}
              </p>
            </li>))}
        </ul>
      </section>

      <section className={cn("grid gap-3 md:grid-cols-2", mixed ? "xl:grid-cols-5" : "xl:grid-cols-4")}>
        {mixed && <Spread title="Types of ads" total={slots.length} rows={SPRINT_LOOKS.filter((l) => byLook.get(l.id)).map((l) => ({ label: l.label, n: byLook.get(l.id)! }))}/>}
        <Spread title="Hooks" total={slots.length} rows={[...byHook.entries()].sort((a, b) => b[1] - a[1]).map(([h, n]) => ({ label: cap(words(h)), n, strong: (TOP_HOOKS as readonly string[]).includes(h) }))}/>
        <Spread title="Where the buyer is" total={slots.length} rows={AWARENESS.map((a) => ({ label: cap(words(a)), n: byStage.get(a) ?? 0 }))}/>
        <Spread title="Who it is for" total={slots.length} rows={Object.keys(view.personas).map((p) => ({ label: view.personas[p], n: byPersona.get(p) ?? 0 }))}/>
        <Spread title="Products" total={slots.length} rows={[...byProduct.entries()].map(([p, n]) => ({ label: view.products[p] ?? p, n }))}/>
      </section>

      <section>
        <h2 className="text-sm font-medium">Product photos</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {view.assets.length} product photos were sorted; {view.assets.filter((a) => a.lead).length} can lead an ad (a real pack, no designed text, no child, no licensed character). Each ad is anchored on 1 of these so the pack is drawn right; the scene around it is made new.
        </p>
        <ul className="mt-2 flex flex-wrap gap-2" data-testid="plan-photos">
          {leads.map((a) => (<li key={a.file} className="w-24 text-center text-xs" title={a.description}>

              <img src={photoUrl(a.file, 200)} alt={a.description} className="size-24 rounded border object-cover" loading="lazy"/>
              <span className="text-muted-foreground">{slots.filter((x) => x.photo === a.file).length} ads</span>
            </li>))}
        </ul>
      </section>
      </>)}

      <section>
        <h2 className="text-sm font-medium">All {slots.length} ads</h2>
        <div className="mt-2 overflow-x-auto rounded-lg border">
          <table className={advanced ? "w-full min-w-[60rem] text-sm" : "w-full text-sm"} data-testid="plan-slots">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 font-medium">#</th>
                {advanced && <th className="px-2 py-1.5 font-medium">Layout</th>}
                <th className="px-2 py-1.5 font-medium">Format</th>
                {advanced && <th className="px-2 py-1.5 font-medium">Angle, buyer, stage, hook</th>}
                <th className="px-2 py-1.5 font-medium">Idea</th>
                <th className="px-2 py-1.5 font-medium">Product</th>
                {advanced && <th />}
              </tr>
            </thead>
            <tbody>
              {view.ads.map(({ slot }) => {
            const f = formatOf(slot.format);
            const angle = s.angles.find((a) => a.id === slot.angle);
            return (<tr key={slot.n} className="border-t align-top" data-testid="plan-slot" data-n={slot.n}>
                    <td className="px-2 py-2 tabular-nums text-muted-foreground">{slot.n}</td>
                    {advanced && (<td className="px-2 py-2">
                      {slot.ref_id ? (<img src={thumbUrl(slot.ref_id)} alt="" className="h-16 w-14 rounded border object-cover" loading="lazy" title={`${view.refs[slot.ref_id]?.label ?? ""}${view.refs[slot.ref_id]?.brand ? `, from ${view.refs[slot.ref_id]!.brand}` : ""}: composition only`}/>) : slot.world ? (<span className="flex h-16 w-14 items-center justify-center rounded border border-primary/40 bg-primary/5 p-0.5 text-center text-[10px] leading-tight text-primary" title={`${worldOf(slot.world)?.label ?? slot.world}: drawn from the idea, with no layout to follow`}>{lookOf(slot.look)?.label ?? "A look"}</span>) : (<span className="flex h-16 w-14 items-center justify-center rounded border border-dashed text-center text-[10px] text-muted-foreground">no example</span>)}
                    </td>)}
                    <td className="px-2 py-2">
                      <div className="font-medium">{f?.label ?? slot.format}</div>{slot.casting && <div className="mt-1 text-xs text-muted-foreground">Character: {slot.casting.description}<br />{slot.casting.setting}</div>}
                      {slot.look && <div className="mt-0.5 inline-block rounded-full border border-primary/40 bg-primary/5 px-1.5 py-px text-[11px] text-primary" data-testid="slot-look">{lookOf(slot.look)?.label ?? slot.look}</div>}
                      {advanced && <div className="text-xs text-muted-foreground">{slot.world ? (worldOf(slot.world)?.label ?? slot.world) : (adType(slot.layout)?.label ?? slot.layout)}</div>}
                      {advanced && slot.text_forward && <div className="text-xs text-muted-foreground">text-forward</div>}
                    </td>
                    {advanced && (<td className="px-2 py-2 text-xs">
                      <div className="font-medium">{angle?.name ?? "No angle"}</div>
                      <div className="text-muted-foreground">{view.personas[slot.persona] ?? slot.persona}</div>
                      <div className="text-muted-foreground">
                        {cap(words(slot.awareness))} · {words(slot.hook)}
                      </div>
                    </td>)}
                    <td className="max-w-md px-2 py-2">
                      {!advanced && angle && <div className="text-xs font-medium text-muted-foreground">{angle.name}</div>}
                      {advanced && editing === slot.n ? (<SlotEditor view={view} n={slot.n} done={() => setEditing(null)} act={act}/>) : (<p>{slot.idea}</p>)}
                      <AdPoints view={view} n={slot.n}/>
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{view.products[slot.product_id] ?? slot.product_id}</td>
                    {advanced && (<td className="px-2 py-2">
                      {editable && editing !== slot.n && (<div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="size-7" aria-label={`Edit ad ${slot.n}`} onClick={() => setEditing(slot.n)} data-testid="slot-edit">
                            <Pencil className="size-3.5"/>
                          </Button>
                          {(!slot.world || (lookOf(slot.look)?.worlds.length ?? 0) > 1) && (<Button size="icon" variant="ghost" className="size-7" aria-label={`Another ${slot.world ? "look" : "layout"} for ad ${slot.n}`} title={slot.world ? "Another look of this type" : "Another layout"} disabled={pending} onClick={() => act(() => swapRefAction(s.id, slot.n))} data-testid="slot-swap">
                            <Shuffle className="size-3.5"/>
                          </Button>)}
                        </div>)}
                    </td>)}
                  </tr>);
        })}
            </tbody>
          </table>
        </div>
      </section>

      {!view.sprint.set_ids.length && s.status !== "planning" && (<section className="rounded-lg border p-4" data-testid="plan-gate">
          <h2 className="text-sm font-medium">Approve the plan</h2>
          {advanced ? (<p className="mt-0.5 text-xs text-muted-foreground">
            Approving starts the briefs: the words, the picture and the prompt for each of the {s.size} ads, with every check a studio ad gets. {live ? `About ${usd(view.estimate.briefs)} of text models; ${usd(view.caps.textLeft)} is left under the cap.` : "Mock mode writes placeholders."} No image is made until you approve the briefs.
          </p>) : (<p className="mt-0.5 text-xs text-muted-foreground">
            Approving starts the briefs: the words and the picture for each of the {s.size} ads. {!live && "These will be samples. "}No image is made until you approve the briefs.
          </p>)}
          <div className="mt-3 flex flex-wrap items-start gap-3">
            <Button disabled={pending || s.status !== "plan_ready"} onClick={() => act(() => approvePlanAction(s.id), "Plan approved. Writing the briefs.")} data-testid="approve-plan">
              <Check className="size-4"/> Approve the plan and write the briefs
            </Button>
            <div className="min-w-64 flex-1">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Or say what to change and plan again: fewer offer ads, an angle to drop, a buyer to lean on" className="min-h-16 text-sm" data-testid="replan-notes"/>
              <Button size="sm" variant="outline" className="mt-2" disabled={pending} onClick={() => act(() => replanSprintAction(s.id, notes), "Planning again.")} data-testid="replan">
                <RefreshCw className="size-4"/> Plan again{advanced && live ? ` (about ${usd(view.estimate.plan)})` : ""}
              </Button>
            </div>
          </div>
        </section>)}
    </div>);
}
function SlotEditor({ view, n, done, act }: {
    view: SprintView;
    n: number;
    done: () => void;
    act: Act;
}) {
    const slot = view.ads.find((a) => a.slot.n === n)!.slot;
    const [idea, setIdea] = useState(slot.idea);
    const [angle, setAngle] = useState(slot.angle);
    const [persona, setPersona] = useState(slot.persona);
    const [awareness, setAwareness] = useState(slot.awareness);
    const [hook, setHook] = useState(slot.hook);
    const sel = "h-7 rounded-md border bg-background px-1.5 text-xs";
    return (<div className="space-y-2" data-testid="slot-editor">
      <Textarea value={idea} onChange={(e) => setIdea(e.target.value)} className="min-h-20 text-sm" aria-label="Idea"/>
      <div className="flex flex-wrap gap-1.5">
        <select value={angle} onChange={(e) => setAngle(e.target.value)} className={sel} aria-label="Angle">
          {view.sprint.angles.map((a) => (<option key={a.id} value={a.id}>
              {a.name}
            </option>))}
        </select>
        <select value={persona} onChange={(e) => setPersona(e.target.value)} className={sel} aria-label="Buyer">
          {Object.entries(view.personas).map(([id, name]) => (<option key={id} value={id}>
              {name}
            </option>))}
        </select>
        <select value={awareness} onChange={(e) => setAwareness(e.target.value)} className={sel} aria-label="Stage">
          {AWARENESS.map((a) => (<option key={a} value={a}>
              {cap(words(a))}
            </option>))}
        </select>
        <select value={hook} onChange={(e) => setHook(e.target.value)} className={sel} aria-label="Hook">
          {HOOKS.map((h) => (<option key={h} value={h}>
              {cap(words(h))}
            </option>))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={() => {
            act(() => editSlotAction(view.sprint.id, n, { idea, angle, persona, awareness, hook }), "Saved.");
            done();
        }} data-testid="slot-save">
          Save
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={done}>
          Cancel
        </Button>
      </div>
    </div>);
}
function Briefs({ view, live, pending, act }: {
    view: SprintView;
    live: boolean;
    pending: boolean;
    act: Act;
}) {
    const s = view.sprint;
    const advanced = useAdvanced();
    const written = view.ads.filter((a) => a.hasBrief);
    const blocked = view.ads.filter((a) => a.fails.length);
    const [anyway, setAnyway] = useState(false);
    const missing = (a: AdView) => (s.options.aspects ?? ["4:5"]).filter(aspect => !a.outputs.some(o => o.aspect === aspect)).length;
    const held = view.ads.filter(a => a.hasBrief && a.fails.length).reduce((n, a) => n + missing(a), 0);
    const toRender = view.ads.filter(a => a.hasBrief && (anyway || !a.fails.length)).reduce((n, a) => n + missing(a), 0);
    const groups = FORMATS.map((f) => ({ f, ads: view.ads.filter((a) => a.slot.format === f.id) })).filter((g) => g.ads.length);
    return (<div className="space-y-6" data-testid="briefs">
      <Issues view={view}/>
      <p className="text-sm text-muted-foreground">
        {written.length} of {s.size} briefs written, grouped by format. Each brief describes a base image. Write and review the copy once the images are ready. {blocked.length > 0 && `${blocked.length} have a failed check, shown on the ad. They are left out unless you say to make them anyway.`} {view.ads.some((a) => a.flags.length) && "What a claim check flagged is shown on the ad, and the ad is made all the same."}
      </p>
      {groups.map(({ f, ads }) => (<section key={f.id}>
          <h2 className="text-sm font-medium">
            {f.label} <span className="font-normal text-muted-foreground">· {ads.length}</span>
          </h2>
          <ul className="mt-2 divide-y rounded-lg border">
            {ads.map((a) => (<BriefRow key={a.slot.n} a={a} view={view}/>))}
          </ul>
        </section>))}
      {(s.status === "briefs_ready" || s.status === "done") && toRender + held > 0 && (<section className="rounded-lg border p-4" data-testid="briefs-gate">
          <h2 className="text-sm font-medium">{s.status === "done" ? "Make the rest" : "Approve the briefs"}</h2>
          {advanced ? (<p className="mt-0.5 text-xs text-muted-foreground">
            Approving makes {toRender} image{toRender === 1 ? "" : "s"} in {(s.options.aspects ?? ["4:5"]).join(", ")}, checks each one twice and makes a failed one once more. {live ? `About ${usd(toRender * (view.estimate.render / (s.size * (s.options.aspects?.length ?? 1))))}; ${view.caps.imagesLeft} images are left under the cap.` : "Mock mode makes placeholders."}
          </p>) : (<>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Approving makes {toRender} image{toRender === 1 ? "" : "s"} in {(s.options.aspects ?? ["4:5"]).join(", ")}, checks each one twice and makes a failed one once more. {!live && "These will be samples. "}
          </p>
          {live && toRender > view.caps.imagesLeft && <p className="mt-1 text-xs text-amber-700">{view.caps.imagesLeft === 0 ? "No more images can be made right now." : `Only ${view.caps.imagesLeft} image${view.caps.imagesLeft === 1 ? "" : "s"} can still be made right now.`}</p>}
          </>)}
          {held > 0 && (<label className="mt-2 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={anyway} onChange={(e) => setAnyway(e.target.checked)} className="accent-primary" data-testid="briefs-anyway"/>
              Override failed checks for these {held} ads
            </label>)}
          <Button className="mt-3" disabled={pending || toRender === 0} onClick={() => act(() => approveBriefsAction(s.id, anyway), "Briefs approved. Making the images.")} data-testid="approve-briefs">
            <Check className="size-4"/> {s.status === "done" ? `Make ${toRender} more` : `Approve the briefs and make ${toRender} images`}
          </Button>
        </section>)}
    </div>);
}
function BriefRow({ a, view }: {
    a: AdView;
    view: SprintView;
}) {
    const angle = view.sprint.angles.find((x) => x.id === a.slot.angle);
    const advanced = useAdvanced();
    return (<li className="flex flex-wrap items-start gap-3 p-3 text-sm" data-testid="brief" data-n={a.slot.n}>
      <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{a.slot.n}</span>
      <div className="min-w-0 flex-1">
        {a.headline ? <p className="font-medium">{a.headline}</p> : <p className="text-muted-foreground">{a.error ?? (a.hasBrief ? a.slot.idea : "Not written yet")}</p>}
        {a.words.length > 0 && <p className="text-xs text-muted-foreground">{a.words.slice(0, 5).join(" · ")}</p>}
        {a.portrait && <details className="mt-2"><summary className="cursor-pointer text-xs">Character reference · {a.slot.casting?.setting}</summary><img className="mt-2 w-32 rounded" src={`/api/assets/${a.portrait}`} alt="Fictional character matched to the scene"/><p className="text-xs text-muted-foreground">{a.slot.casting?.description}</p></details>}
        {a.primary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">Feed: {a.primary}</p>}
        {advanced ? (<p className="mt-1 text-xs text-muted-foreground">
          {angle?.name} · {view.personas[a.slot.persona] ?? a.slot.persona} · {words(a.slot.awareness)} · {words(a.slot.hook)} · {view.products[a.slot.product_id]}{a.slot.world ? ` · ${worldOf(a.slot.world)?.label ?? a.slot.world}` : ""}
        </p>) : (<p className="mt-1 text-xs text-muted-foreground">{[angle?.name, view.products[a.slot.product_id], a.slot.look ? lookOf(a.slot.look)?.label : ""].filter(Boolean).join(" · ")}</p>)}
        {a.fails.map((m) => (<p key={m} className="mt-1 text-xs text-red-700">
            Must fix: {m}
          </p>))}
        {a.flags.map((m) => (<p key={m} className="mt-1 text-xs text-amber-700" data-testid="brief-claim-flag">
            Claim check: {m}
          </p>))}
        {advanced && a.warns.slice(0, 2).map((m) => (<p key={m} className="mt-1 text-xs text-amber-700">
            {m}
          </p>))}
        {advanced && a.warns.length > 2 && <p className="text-xs text-amber-700">and {a.warns.length - 2} more to look at</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs">
        {a.fails.length ? <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-700">{a.fails.length} to fix</span> : a.hasBrief ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">{advanced ? (a.warns.length ? `${a.warns.length} to look at` : "checks passed") : "Ready"}</span> : null}
        {a.setId && (<Link href={`/studio/${a.setId}`} className="text-primary hover:underline">
            Open the set
          </Link>)}
      </div>
    </li>);
}
function Wall({ view, refresh, pending, act }: {
    view: SprintView;
    refresh: () => Promise<void>;
    pending: boolean;
    act: Act;
}) {
    const s = view.sprint;
    const advanced = useAdvanced();
    const [format, setFormat] = useState("");
    const [look, setLook] = useState("");
    const mixed = view.ads.some((a) => a.slot.look);
    const [angle, setAngle] = useState("");
    const [persona, setPersona] = useState("");
    const [product, setProduct] = useState("");
    const [check, setCheck] = useState("");
    const [openId, setOpenId] = useState<number | null>(null);
    const open = view.ads.find(a => a.slot.n === openId);
    const state = (a: AdView) => (a.image ? (a.qa?.status ?? "pass") : a.fails.length ? "blocked" : "waiting");
    const ads = useMemo(() => view.ads.filter((a) => (!format || a.slot.format === format) && (!look || lookId(a.slot) === look) && (!angle || a.slot.angle === angle) && (!persona || a.slot.persona === persona) && (!product || a.slot.product_id === product) && (!check || state(a) === check)), [view.ads, format, look, angle, persona, product, check]);
    const sel = "h-8 rounded-md border bg-background px-2 text-sm";
    const n = (st: string) => view.ads.filter((a) => state(a) === st).length;
    const tone: Record<string, string> = { pass: "bg-emerald-600", warn: "bg-amber-500", fail: "bg-red-600" };
    return (<div className="space-y-4" data-testid="wall">
      <Issues view={view}/>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4">
        <div><h2 className="font-medium">Your base images are ready for copy</h2><p className="text-sm text-muted-foreground">Click an ad to write or generate copy, review it, and optionally add editable text. {view.ads.filter(a => a.copy).length} of {s.size} copy drafts ready.</p></div>
        <Button disabled={pending || !view.ads.some(a => a.image && !a.copy)} onClick={() => act(() => generateSprintCopyAction(s.id), "Generating missing copy drafts. Images stay unchanged.")} data-testid="generate-all-copy">{pending ? "Working…" : "Generate all headlines and body copy"}</Button>
      </section>
      {view.copyErrors.map((error, i) => <p key={i} role="alert" className="text-sm text-red-700">Copy generation stopped: {error}. Completed drafts are kept; generate the remaining drafts to retry.</p>)}
      <details className="rounded-lg border p-4" open><summary className="cursor-pointer text-sm font-medium">Format distribution · planned / ready</summary><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">{SPRINT_LOOKS.filter(l => view.ads.some(a => lookId(a.slot) === l.id)).map(l => { const group = view.ads.filter(a => lookId(a.slot) === l.id); return <div key={l.id} className="flex justify-between gap-2"><span>{l.label}</span><span>{group.length} / {group.filter(a => a.image).length}</span></div>; })}</div></details>
      <div className="flex flex-wrap items-center gap-2">
        {mixed && (<select value={look} onChange={(e) => setLook(e.target.value)} className={sel} aria-label="Type of ad" data-testid="wall-look">
          <option value="">Every type of ad</option>
          {SPRINT_LOOKS.filter((l) => view.ads.some((a) => lookId(a.slot) === l.id)).map((l) => (<option key={l.id} value={l.id}>
              {l.label} ({view.ads.filter((a) => lookId(a.slot) === l.id).length})
            </option>))}
        </select>)}
        {advanced && (<>
        <select value={format} onChange={(e) => setFormat(e.target.value)} className={sel} aria-label="Format" data-testid="wall-format">
          <option value="">Every format</option>
          {FORMATS.filter((f) => view.ads.some((a) => a.slot.format === f.id)).map((f) => (<option key={f.id} value={f.id}>
              {f.label}
            </option>))}
        </select>
        <select value={angle} onChange={(e) => setAngle(e.target.value)} className={sel} aria-label="Angle">
          <option value="">Every angle</option>
          {s.angles.map((a) => (<option key={a.id} value={a.id}>
              {a.name}
            </option>))}
        </select>
        <select value={persona} onChange={(e) => setPersona(e.target.value)} className={sel} aria-label="Buyer">
          <option value="">Every buyer</option>
          {Object.entries(view.personas).map(([id, name]) => (<option key={id} value={id}>
              {name}
            </option>))}
        </select>
        <select value={product} onChange={(e) => setProduct(e.target.value)} className={sel} aria-label="Product">
          <option value="">Every product</option>
          {Object.entries(view.products)
                .filter(([id]) => view.ads.some((a) => a.slot.product_id === id))
                .map(([id, name]) => (<option key={id} value={id}>
                {name}
              </option>))}
        </select>
        <select value={check} onChange={(e) => setCheck(e.target.value)} className={sel} aria-label="Check result" data-testid="wall-check">
          <option value="">Every check result</option>
          <option value="pass">Passed ({n("pass")})</option>
          <option value="warn">To look at ({n("warn")})</option>
          <option value="fail">Failed ({n("fail")})</option>
          <option value="blocked">Brief needs fixing ({n("blocked")})</option>
          <option value="waiting">Not made yet ({n("waiting")})</option>
        </select>
        <span className="text-xs text-muted-foreground" data-testid="wall-count">
          {ads.length} of {view.ads.length} ads
        </span>
        </>)}
        <ExportButtons id={s.id} images={view.progress.images} className="ml-auto"/>
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" data-testid="wall-grid">
        {ads.map((a) => (<li key={a.slot.n} data-testid="wall-ad" data-n={a.slot.n} data-state={state(a)}>
            <button type="button" onClick={() => setOpenId(a.slot.n)} className="group block w-full text-left">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg border bg-muted">
                {a.image ? (<img src={assetUrl(a.image, 480)} alt={a.headline} className="size-full object-contain transition group-hover:scale-[1.02]" loading="lazy"/>) : (<span className="flex size-full items-center justify-center p-3 text-center text-xs text-muted-foreground">{a.fails.length ? "The brief has a check to fix" : (a.error ?? (a.headline || "Waiting"))}</span>)}
                <span className="absolute left-1.5 top-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">{a.slot.n}</span>
                {a.image && <span className={cn("absolute right-1.5 top-1.5 size-2.5 rounded-full ring-2 ring-white", tone[a.qa?.status ?? "pass"])} title={a.qa?.status === "fail" ? "Failed the checks" : a.qa?.status === "warn" ? "Something to look at" : "Passed the checks"}/>}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{a.outputs.length} sizes · {a.copy?.approved_at ? "Copy approved" : a.copy ? "Copy to review" : "No copy yet"}</div>
              <div className="mt-1 truncate text-xs font-medium">{formatOf(a.slot.format)?.label}{a.slot.look ? ` · ${lookOf(a.slot.look)?.label}` : ""}</div>
              <div className="truncate text-xs text-muted-foreground">{s.angles.find((x) => x.id === a.slot.angle)?.name}</div>
            </button>
          </li>))}
      </ul>
      {open && <CopyPanel ad={open} sprintId={s.id} defaultText={s.options.text_on_image ?? false} busy={pending} refresh={refresh} close={() => setOpenId(null)}/>}
    </div>);
}
