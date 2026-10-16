"use client";
import { pollWhileVisible } from "@/lib/visible-polling";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { checksDefaultAction } from "@/app/settings/actions";
import { useAdvanced } from "@/components/mode";
import { WorkingMark } from "@/components/working";
import { HooksPicker } from "@/components/hooks-picker";
import { LengthChoice } from "@/components/length-choice";
import { sharedAge } from "@/lib/copy/stage";
import { TasteBar } from "@/components/taste-bar";
import type { Taste } from "@/lib/taste/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ReferenceMode, ScriptAxes } from "@/db/schema";
import { DEFAULT_SCRIPT_MODEL, SCRIPT_MODELS } from "@/lib/reference-modes";
import { INDIRECT_FORM, indirectImageChoices, isIndirectOnly } from "@/lib/scripts/indirect";
import { EMOTIONS, NATIVE_ARCS, NATIVE_FORMS, NATIVE_IMAGES, NATIVE_LENGTHS, NATIVE_NARRATORS, SCRIPT_TYPES, typeFitsLength } from "@/lib/script-types";
import { cn } from "@/lib/utils";
import { OUTPUT_INFO, OUTPUT_TYPES, type AwarenessStage, type LengthPreset, type OutputType } from "@/lib/taxonomy";
import { generateScriptsAction } from "./actions";
import { pastTimeLine, type StepTime } from "@/lib/jobs/past-time";
export const SCRIPT_MOCK_NOTE = "Mock mode: writing scripts calls a paid model. Set LLM_MODE=live in .env and restart to use it.";
const SCRIPT_MOCK_NOTE_NORMAL = "Not switched on for this account.";
export const MAX_BATCH = 20;
const QUEUED_EVENT = "ce:scripts-queued";
type Status = {
    queue: {
        script: {
            queued: number;
            running: number;
            done: number;
            failed: number;
        };
    };
    spend: {
        brand: {
            cost: number;
            calls: number;
        };
    };
    budget: {
        spent: number;
        cap: number;
    };
    jobs: {
        id: string;
        ref: string | null;
        kind: string;
        status: string;
        error: string | null;
    }[];
    recentScripts: {
        id: string;
        title: string;
        concept_id: string;
    }[];
    times?: {
        script: StepTime;
    };
};
export function LiveGate({ live, note = SCRIPT_MOCK_NOTE, children }: {
    live: boolean;
    note?: string;
    children: React.ReactNode;
}) {
    const advanced = useAdvanced();
    if (live)
        return <>{children}</>;
    return (<Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{!advanced && note === SCRIPT_MOCK_NOTE ? SCRIPT_MOCK_NOTE_NORMAL : note}</TooltipContent>
    </Tooltip>);
}
export async function queueScripts(input: {
    conceptId: string;
    count: number;
    length: LengthPreset;
    lengthChosen?: boolean;
    axes?: ScriptAxes;
    themeIds?: string[];
    referenceId?: string;
    referenceMode?: ReferenceMode;
    model?: string;
    scriptTypes?: string[];
    emotion?: string;
    emotionEnd?: string;
    format?: OutputType;
    native?: {
        arcs?: string[];
        images?: string[];
        forms?: string[];
        narrator?: string;
        length?: string;
    };
    claimChecks?: boolean;
    hooks?: number;
    taste?: Taste;
}): Promise<boolean> {
    const res = await generateScriptsAction({ ...input, axes: input.axes as Parameters<typeof generateScriptsAction>[0]["axes"] } as Parameters<typeof generateScriptsAction>[0]);
    if (!res.ok) {
        toast.error(res.error);
        return false;
    }
    const cold = input.native?.forms?.[0] === INDIRECT_FORM;
    toast.success(`Writing ${res.queued} ${cold ? "cold-traffic " : ""}${input.native ? "native ad stor" : "script"}${res.queued === 1 ? (input.native ? "y" : "") : input.native ? "ies" : "s"}. Each takes ${cold ? "about 1 minute" : input.native ? "2 to 4 minutes" : "1 to 2 minutes"}.`);
    window.dispatchEvent(new Event(QUEUED_EVENT));
    return true;
}
export const clampCount = (n: number) => Math.min(MAX_BATCH, Math.max(1, Math.round(n) || 1));
type Snapshot = {
    done: number;
    failed: number;
    scripts: Set<string>;
    failures: Set<string>;
};
type Outcome = {
    scripts: Status["recentScripts"];
    errors: string[];
    failed: number;
};
const failedScriptJobs = (s: Status) => s.jobs.filter((j) => j.kind === "script" && j.status === "failed");
const snapshot = (s: Status): Snapshot => ({
    done: s.queue.script.done,
    failed: s.queue.script.failed,
    scripts: new Set(s.recentScripts.map((r) => r.id)),
    failures: new Set(failedScriptJobs(s).map((j) => j.id)),
});
export function ScriptProgress({ live, className }: {
    live: boolean;
    className?: string;
}) {
    const router = useRouter();
    const advanced = useAdvanced();
    const [status, setStatus] = useState<Status | null>(null);
    const [busy, setBusy] = useState(false);
    const [outcome, setOutcome] = useState<Outcome | null>(null);
    const base = useRef<Snapshot | null>(null);
    const wasActive = useRef(false);
    useEffect(() => {
        if (!live)
            return;
        let stop = false;
        const poll = async () => {
            try {
                const s: Status = await fetch("/api/pipeline/status", { cache: "no-store" }).then((r) => r.json());
                if (stop)
                    return;
                const active = s.queue.script.queued + s.queue.script.running > 0;
                if (active && !base.current)
                    base.current = snapshot(s);
                if (!active && wasActive.current && base.current) {
                    const b = base.current;
                    const scripts = s.recentScripts.filter((r) => !b.scripts.has(r.id));
                    const failures = failedScriptJobs(s).filter((j) => !b.failures.has(j.id));
                    const errors = [...new Set(failures.map((j) => j.error ?? "Unknown error"))];
                    setOutcome({ scripts, errors, failed: failures.length });
                    if (scripts.length) {
                        const one = scripts.length === 1 ? scripts[0] : null;
                        toast.success(one ? `${one.title} is ready` : `${scripts.length} new scripts are ready`, {
                            action: {
                                label: one ? "Open" : "View",
                                onClick: () => router.push(one ? `/scripts/${one.id}` : `/scripts?concept=${scripts[0].concept_id}`),
                            },
                        });
                    }
                    else if (failures.length)
                        toast.error(`Script writing failed: ${errors[0]}`);
                    router.refresh();
                }
                if (!active)
                    base.current = snapshot(s);
                wasActive.current = active;
                setStatus(s);
                setBusy(active);
            }
            catch {
            }
        };
        const stopPolling = pollWhileVisible(poll, busy ? 2500 : 10000, { immediate: true });
        const onQueued = () => {
            setOutcome(null);
            setBusy(true);
            void poll();
        };
        window.addEventListener(QUEUED_EVENT, onQueued);
        return () => {
            stop = true;
            stopPolling();
            window.removeEventListener(QUEUED_EVENT, onQueued);
        };
    }, [advanced, busy, live, router]);
    if (!live || !status)
        return null;
    const q = status.queue.script;
    const active = q.queued + q.running;
    if (!active && !outcome)
        return null;
    const b = base.current;
    const finished = b ? Math.max(0, q.done - b.done) + Math.max(0, q.failed - b.failed) : 0;
    const failedNow = b ? failedScriptJobs(status).filter((j) => !b.failures.has(j.id)) : [];
    const total = finished + active;
    const errors = active ? [...new Set(failedNow.map((j) => j.error ?? "Unknown error"))] : (outcome?.errors ?? []);
    const failed = active ? failedNow.length : (outcome?.failed ?? 0);
    return (<div className={className} data-testid="script-progress">
      <div className="space-y-2 rounded-lg border bg-card p-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {active > 0 ? (<span className="inline-flex items-center gap-1.5">
              <WorkingMark job="write" className="size-8 text-primary"/>
              Writing {Math.min(total, finished + 1)} of {total}…
              <span className="text-xs text-muted-foreground" data-testid="script-progress-time">{pastTimeLine(status.times?.script, "a script")}</span>
            </span>) : (<span>
              {outcome!.scripts.length
                ? `Wrote ${outcome!.scripts.length} script${outcome!.scripts.length === 1 ? "" : "s"}.`
                : "No new scripts were written."}
            </span>)}
          {failed > 0 && <span className="text-red-700">{failed} failed</span>}
          {advanced && (<span className="ml-auto text-xs text-muted-foreground" data-testid="script-spend">
            This brand: ${status.spend.brand.cost.toFixed(3)} in {status.spend.brand.calls} model calls · all brands ${status.budget.spent.toFixed(2)} of ${status.budget.cap} cap
          </span>)}
          {!active && (<button aria-label="Dismiss" onClick={() => setOutcome(null)} className={advanced ? "text-muted-foreground hover:text-foreground" : "ml-auto text-muted-foreground hover:text-foreground"}>
              <X className="size-4"/>
            </button>)}
        </div>
        {active > 0 && <Progress value={(finished / Math.max(1, total)) * 100} className="h-1.5"/>}
        {!active && outcome && outcome.scripts.length > 0 && (<ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {outcome.scripts.map((s) => (<li key={s.id}>
                <Link href={`/scripts/${s.id}`} className="text-primary hover:underline" data-testid="new-script-link">
                  {s.title}
                </Link>
              </li>))}
          </ul>)}
        {errors.slice(0, 3).map((e) => (<p key={e} className="text-xs text-red-700" data-testid="script-job-error">
            {e}
          </p>))}
      </div>
    </div>);
}
export function ModelSelect({ value, onChange, testid = "script-model" }: {
    value: string;
    onChange: (v: string) => void;
    testid?: string;
}) {
    return (<Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full" data-testid={testid}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={DEFAULT_SCRIPT_MODEL}>Recommended (as set in Settings)</SelectItem>
        {SCRIPT_MODELS.map((m) => (<SelectItem key={m.id} value={m.id}>
            {m.label}
          </SelectItem>))}
      </SelectContent>
    </Select>);
}
const ALL_CONCEPTS = "all";
const ANY = "any";
const PLAN_LENGTH: LengthPreset = "60s";
export function ScriptTypePicker({ value, onChange, length }: {
    value: string[];
    onChange: (v: string[]) => void;
    length: LengthPreset;
}) {
    const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
    return (<div data-testid="script-type-picker">
      <div className="mb-1.5 flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">What kind of script</Label>
        <span className="text-xs text-muted-foreground" data-testid="script-type-mode">
          {value.length ? `${value.length} chosen` : "Mix: a different kind for each script"}
        </span>
      </div>
      <div className="grid max-h-56 gap-1.5 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
        {SCRIPT_TYPES.map((t) => {
            const fits = typeFitsLength(t, length);
            const on = value.includes(t.id);
            return (<button key={t.id} type="button" disabled={!fits} onClick={() => toggle(t.id)} aria-pressed={on} data-testid={`script-type-${t.id}`} className={cn("rounded-md border p-2 text-left text-xs", on ? "border-primary bg-primary/5" : "hover:bg-muted/50", !fits && "cursor-not-allowed opacity-50")}>
              <span className="font-medium">{t.label}</span>
              <span className="block text-muted-foreground">{fits ? t.summary : `Needs ${t.minLength} or longer.`}</span>
              <span className="mt-0.5 block text-muted-foreground italic">&ldquo;{t.example}&rdquo;</span>
            </button>);
        })}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">With none ticked, each script gets a different kind that suits the concept&apos;s awareness stage. The examples show the shape only; the words come from your research.</p>
    </div>);
}
function ChipPicker({ label, items, value, onChange, testid }: {
    label: string;
    items: readonly {
        id: string;
        label: string;
        summary: string;
    }[];
    value: string[];
    onChange: (v: string[]) => void;
    testid: string;
}) {
    const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
    return (<div data-testid={testid}>
      <div className="mb-1.5 flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        <span className="text-xs text-muted-foreground">{value.length ? `${value.length} chosen` : "Mix: a different one for each"}</span>
      </div>
      <div className="grid max-h-44 gap-1.5 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
        {items.map((t) => {
            const on = value.includes(t.id);
            return (<button key={t.id} type="button" onClick={() => toggle(t.id)} aria-pressed={on} data-testid={`${testid}-${t.id}`} className={cn("rounded-md border p-2 text-left text-xs", on ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
              <span className="font-medium">{t.label}</span>
              <span className="block text-muted-foreground">{t.summary}</span>
            </button>);
        })}
      </div>
    </div>);
}
export function GenerateDialog({ open, onOpenChange, concepts, conceptId, initialFormat, initialCount = 3, initialClaimChecks, }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    concepts: {
        id: string;
        name: string;
        stage?: AwarenessStage;
        age?: string | null;
    }[];
    conceptId?: string;
    initialFormat?: OutputType;
    initialCount?: number;
    initialClaimChecks?: boolean;
}) {
    const advanced = useAdvanced();
    const [concept, setConcept] = useState(conceptId ?? concepts[0]?.id ?? "");
    const [count, setCount] = useState(String(initialCount));
    const [chosenLength, setLength] = useState<LengthPreset | null>(null);
    const length = chosenLength ?? PLAN_LENGTH;
    const [picked, setModel] = useState<string>(DEFAULT_SCRIPT_MODEL);
    const model = picked === DEFAULT_SCRIPT_MODEL ? undefined : picked;
    const [types, setTypes] = useState<string[]>([]);
    const [emotion, setEmotion] = useState<string>(ANY);
    const [emotionEnd, setEmotionEnd] = useState<string>(ANY);
    const [format, setFormat] = useState<string>(initialFormat ?? ANY);
    const [kind, setKind] = useState<"script" | "native" | "indirect">("script");
    const [arcs, setArcs] = useState<string[]>([]);
    const [images, setImages] = useState<string[]>([]);
    const [narrator, setNarrator] = useState<string>(NATIVE_NARRATORS[0].id);
    const [forms, setForms] = useState<string[]>([]);
    const [nativeLength, setNativeLength] = useState<string>("standard");
    const [claimChecks, setClaimChecks] = useState(initialClaimChecks ?? false);
    const [hooks, setHooks] = useState(1);
    const [taste, setTaste] = useState<Taste>({});
    useEffect(() => {
        if (initialClaimChecks !== undefined)
            return;
        void checksDefaultAction().then((c) => setClaimChecks(c.claims));
    }, [initialClaimChecks]);
    const formsForLength = NATIVE_FORMS.filter((f) => f.id !== INDIRECT_FORM && (f.lengths as readonly string[]).includes(nativeLength));
    const indirect = kind === "indirect";
    const native = kind !== "script";
    const nativeLengths = NATIVE_LENGTHS.filter((l) => (indirect ? l.id === "brief" || l.id === "short" : l.id !== "brief"));
    const [pending, start] = useTransition();
    const target = conceptId ?? concept;
    const fixed = concepts.find((c) => c.id === conceptId);
    const per = clampCount(Number(count));
    const total = target === ALL_CONCEPTS ? per * concepts.length : per;
    const chosen = types.filter((id) => SCRIPT_TYPES.some((t) => t.id === id && typeFitsLength(t, length)));
    const asked = target === ALL_CONCEPTS ? concepts : concepts.filter((c) => c.id === target);
    const stages = asked.flatMap((c) => (c.stage ? [c.stage] : []));
    const submit = () => start(async () => {
        const ok = indirect
            ? await queueScripts({ conceptId: target, count: per, length: "5-10m", model, claimChecks, hooks, taste, native: { images: images.filter((id) => indirectImageChoices().some((i) => i.id === id)).length ? images.filter((id) => indirectImageChoices().some((i) => i.id === id)) : undefined, forms: [INDIRECT_FORM], narrator, length: nativeLength } })
            : native
                ? await queueScripts({ conceptId: target, count: per, length: "5-10m", model, claimChecks, hooks, taste, native: { arcs: arcs.length ? arcs : undefined, images: images.length ? images : undefined, forms: forms.filter((id) => formsForLength.some((f) => f.id === id)).length ? forms.filter((id) => formsForLength.some((f) => f.id === id)) : undefined, narrator, length: nativeLength } })
                : await queueScripts({
                    conceptId: target,
                    count: per,
                    length,
                    lengthChosen: !!chosenLength,
                    model,
                    claimChecks,
                    hooks,
                    taste,
                    scriptTypes: chosen.length ? chosen : undefined,
                    emotion: emotion === ANY ? undefined : emotion,
                    emotionEnd: emotionEnd === ANY || emotion === ANY || emotion === "mix" ? undefined : emotionEnd,
                    format: format === ANY ? undefined : (format as OutputType),
                });
        if (ok)
            onOpenChange(false);
    });
    return (<Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={advanced ? "max-h-[90vh] overflow-y-auto sm:max-w-2xl" : "max-h-[90vh] overflow-y-auto sm:max-w-lg"} data-testid="generate-dialog">
        <DialogHeader>
          <DialogTitle>Write scripts</DialogTitle>
          <DialogDescription>
            Each script is a different kind of script from the same research, so no 2 read alike. They are written 4 at a time and each takes 1 to 2 minutes. Every script
            is read for the brand&apos;s voice before you see it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {advanced && (<div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="What to write">
            {([
                ["script", "Ad scripts", "For video, statics and carousels. Each a different kind of script."],
                ["native", "Native ads", "A long 1st-person story with an image that looks like a person's post."],
                ["indirect", "Native ads for cold traffic", "For strangers: a photo of the problem, no product, a 300-word story, a click to an advertorial."],
            ] as const).map(([id, title, text]) => (<button key={id} type="button" role="radio" aria-checked={kind === id} onClick={() => {
                    setKind(id);
                    setCount(id === "native" ? "5" : "3");
                    if (id !== kind) {
                        setImages([]);
                        setNativeLength(id === "indirect" ? "brief" : "standard");
                        setNarrator(id === "indirect" ? "observer" : NATIVE_NARRATORS[0].id);
                    }
                }} data-testid={`generate-kind-${id}`} className={cn("rounded-md border p-2.5 text-left", kind === id ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
                <span className="font-medium">{title}</span>
                <span className="block text-xs text-muted-foreground">{text}</span>
              </button>))}
          </div>)}
          {fixed ? (<p className="rounded-md bg-muted px-3 py-2">{fixed.name}</p>) : (<div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Concept (persona, angle, offer)</Label>
              <Select value={concept} onValueChange={setConcept}>
                <SelectTrigger className="w-full" data-testid="generate-concept">
                  <SelectValue placeholder="Pick a concept"/>
                </SelectTrigger>
                <SelectContent>
                  {concepts.length > 1 && <SelectItem value={ALL_CONCEPTS}>All {concepts.length} concepts</SelectItem>}
                  {concepts.map((c) => (<SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>)}
          <div className={advanced ? "grid grid-cols-3 gap-3" : "grid grid-cols-2 gap-3"}>
            <div>
              <Label htmlFor="generate-count" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                How many{target === ALL_CONCEPTS ? " per concept" : ""} (1 to {MAX_BATCH})
              </Label>
              <Input id="generate-count" type="number" min={1} max={MAX_BATCH} value={count} onChange={(e) => setCount(e.target.value)} data-testid="generate-count"/>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Length</Label>
              {native ? (<Select value={nativeLength} onValueChange={setNativeLength}>
                  <SelectTrigger className="w-full" data-testid="generate-length">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {nativeLengths.map((l) => (<SelectItem key={l.id} value={l.id}>
                        {l.label}
                      </SelectItem>))}
                  </SelectContent>
                </Select>) : (<LengthChoice id="generate-length" value={chosenLength} onChange={setLength} stages={stages} speakerAge={sharedAge(asked.map((c) => c.age))}/>)}
            </div>
            {advanced && (<div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Written by</Label>
              <ModelSelect value={picked} onChange={setModel} testid="generate-model"/>
            </div>)}
          </div>
          {advanced && indirect && (<>
              <ChipPicker label="Image: what the pain looks like from outside" items={indirectImageChoices()} value={images} onChange={setImages} testid="indirect-images"/>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Told by</Label>
                  <Select value={narrator} onValueChange={setNarrator}>
                    <SelectTrigger className="w-full" data-testid="indirect-narrator">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="observer">The brand</SelectItem>
                      <SelectItem value="founder">The founder</SelectItem>
                      <SelectItem value="customer">A real customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="col-span-2 self-end text-xs text-muted-foreground" data-testid="indirect-note">
                  {narrator === "customer" ? "Only retells a real review or conversation from your research. No customer is invented." : narrator === "founder" ? "1st person as the maker. Real facts only." : "The brand, summarising what customers say."}{" "}
                  With no image chosen, the first is picked from the concept&apos;s pain. No price in the copy: approving a story drafts the advertorial it leads to.
                </p>
              </div>
            </>)}
          {advanced && native && !indirect && (<>
              <ChipPicker label="Copy form: the shape of the piece" items={formsForLength} value={forms} onChange={setForms} testid="native-forms"/>
              <ChipPicker label="Story arc: how the narrator feels about it" items={NATIVE_ARCS} value={arcs} onChange={setArcs} testid="native-arcs"/>
              <ChipPicker label="Image type (made later, from the copy)" items={NATIVE_IMAGES.filter((i) => !isIndirectOnly(i.id))} value={images} onChange={setImages} testid="native-images"/>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Told by</Label>
                  <Select value={narrator} onValueChange={setNarrator}>
                    <SelectTrigger className="w-full" data-testid="native-narrator">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NATIVE_NARRATORS.map((n) => (<SelectItem key={n.id} value={n.id}>
                          {n.label}
                        </SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="col-span-2 self-end text-xs text-muted-foreground" data-testid="native-note">
                  {NATIVE_NARRATORS.find((n) => n.id === narrator)?.summary} Each story leads with the concept&apos;s strongest tension from your research. Pains and failed fixes come
                  from the research.
                </p>
              </div>
            </>)}
          {advanced && !native && <ScriptTypePicker value={types} onChange={setTypes} length={length}/>}
          {advanced && (<>
          <div className={cn("grid grid-cols-3 gap-3", native && "hidden")}>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Feel</Label>
              <Select value={emotion} onValueChange={setEmotion}>
                <SelectTrigger className="w-full" data-testid="generate-emotion">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Writer&apos;s choice</SelectItem>
                  <SelectItem value="mix">Mix: a different feel each</SelectItem>
                  {EMOTIONS.map((e) => (<SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Ends on</Label>
              <Select value={emotionEnd} onValueChange={setEmotionEnd} disabled={emotion === ANY || emotion === "mix"}>
                <SelectTrigger className="w-full" data-testid="generate-emotion-end">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Its natural ending</SelectItem>
                  {EMOTIONS.map((e) => (<SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Written for</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="w-full" data-testid="generate-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any format</SelectItem>
                  {OUTPUT_TYPES.map((t) => (<SelectItem key={t} value={t}>
                      {OUTPUT_INFO[t].label}
                    </SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className={cn("text-xs text-muted-foreground", native && "hidden")}>
            {EMOTIONS.find((e) => e.id === emotion)?.summary ?? (emotion === "mix" ? "Each script leads with a different feel, from fear of loss to joy." : "The writer picks the feel that suits each script.")}{" "}
            A script written for any format can still be made in every format later; choosing one here shapes the writing for it.
          </p>
          </>)}
        </div>
        <HooksPicker id="generate-hooks" value={hooks} onChange={setHooks} className="rounded-md border p-3"/>
        <TasteBar id="generate-taste" surface="script" value={taste} onChange={setTaste} className="rounded-md border p-3"/>
        {advanced && (<label className="flex cursor-pointer items-start gap-3 rounded-md border p-3" data-testid="claim-checks-row">
          <Switch checked={claimChecks} onCheckedChange={setClaimChecks} data-testid="claim-checks" className="mt-0.5"/>
          <span className="text-sm">
            <span className="font-medium">Check claims</span>
            <span className="block text-xs text-muted-foreground">
              {claimChecks
                ? "On: every fact must come from the approved claims, and each script is checked against them before you see it. Slower, and about 3 cents more a script."
                : "Off: scripts are written freely, with no claim rules and no claim checks. You verify the facts when you edit. You can check a script later from its own page."}
            </span>
          </span>
        </label>)}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !target || total > 60} data-testid="generate-submit">
            {pending ? "Starting..." : total > 60 ? "Write 60 or fewer at a time" : indirect ? `Write ${total} cold-traffic ad${total === 1 ? "" : "s"}` : native ? `Write ${total} native ad${total === 1 ? "" : "s"}` : `Write ${total} script${total === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);
}
