"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ImageOff, Loader2, PenLine, Play, Plus, RefreshCw, Scissors, SlidersHorizontal, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAdvanced } from "@/components/mode";
import type { AdReferenceRow, RefStage } from "@/db/schema";
import { AD_KINDS, INDUSTRIES, type BrandFit } from "@/lib/references/for-brand";
import { FORMAT_BUCKETS } from "@/lib/references/normalize";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { humanize } from "@/lib/taxonomy";
import { analyzeReferenceAction, deleteReferenceAction, getReferenceAction, updateReferenceAction } from "./actions";
import { AddReferenceDialog, filesOf } from "./add-reference";
import { BuildTray, type BuildChoices, type Picked } from "./build-tray";
import { HooksDialog, NEW_HOOKS_LINE } from "./hooks-panel";
import { ShowMore } from "@/components/show-more";
import { ALL, MINE, NO_FILTER, PAGE, type RefCard, type ReferenceFilter, type ReferencePage, type ReferenceSummary } from "@/lib/references/page";
import { referencePageAction } from "./page-actions";
type AnalysisStatus = AdReferenceRow["analysis_status"];
export type { RefCard };
type QueueStatus = {
    queue: {
        analyze_reference?: {
            queued: number;
            running: number;
            done: number;
            failed: number;
        };
    };
};
type ChipInput = {
    source: string;
    analyzed: boolean;
    status: AnalysisStatus;
    error?: string | null;
};
const MAX_PICKED = 24;
const NO_FILTER_KEY = JSON.stringify(NO_FILTER);
const AWARENESS = ["unaware", "problem-aware", "solution-aware", "product-aware", "most-aware"];
const SOPH = ["stage-1", "stage-2", "stage-3", "stage-4", "stage-5"];
const ANALYSIS_OFF = "Analysis is off. It needs live mode and a Gemini key (GEMINI_API_KEY) in .env.";
function Thumb({ id, video, v }: {
    id: string;
    video: boolean;
    v?: string;
}) {
    const [gone, setGone] = useState(false);
    return (<>
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground/60" aria-hidden>
        {video ? <Play className="size-6"/> : <ImageOff className="size-6"/>}
        {gone && <span className="text-xs">No preview</span>}
      </span>
      {!gone && (<img src={`/api/references/thumb/${id}?w=480${v ? `&v=${v}` : ""}`} alt="" loading="lazy" className="relative size-full object-cover" ref={(n) => {
                if (n && n.complete && n.naturalWidth === 0)
                    setGone(true);
            }} onError={() => setGone(true)}/>)}
    </>);
}
function AnalysisChip({ r }: {
    r: ChipInput;
}) {
    const chip = r.status === "queued"
        ? { label: "Queued", tone: "border-sky-300 bg-sky-50 text-sky-800" }
        : r.status === "running"
            ? { label: "Analysing", tone: "border-sky-300 bg-sky-50 text-sky-800" }
            : r.status === "failed"
                ? { label: "Failed", tone: "border-red-300 bg-red-50 text-red-800" }
                : r.source === "user" && !r.analyzed
                    ? { label: "Not analysed", tone: "border-amber-300 bg-amber-50 text-amber-800" }
                    : null;
    if (!chip)
        return null;
    return (<Badge variant="outline" className={`px-1 py-0 text-[10px] font-normal ${chip.tone}`} title={r.status === "failed" ? (r.error ?? undefined) : undefined} data-testid="ref-analysis-status">
      {r.status === "running" && <Loader2 className="size-2.5 animate-spin"/>}
      {chip.label}
    </Badge>);
}
export function ReferencesView({ first, summary, analysisEnabled, live, fit, choices }: {
    first: ReferencePage;
    summary: ReferenceSummary;
    analysisEnabled: boolean;
    live: boolean;
    fit: BrandFit;
    choices: BuildChoices;
}) {
    const router = useRouter();
    const [source, setSource] = useState(ALL);
    const [adding, setAdding] = useState(false);
    const [dropped, setDropped] = useState<File[]>([]);
    const [dragging, setDragging] = useState(false);
    useEffect(() => {
        if (adding)
            return;
        const take = (files: File[]) => {
            setDropped(files);
            setAdding(true);
        };
        const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
        const onPaste = (e: ClipboardEvent) => {
            const files = filesOf(e.clipboardData);
            if (!files.length || (typing(e.target) && !files.some((f) => /^(image|video)\//.test(f.type))))
                return;
            e.preventDefault();
            take(files);
        };
        const carriesFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files");
        const onOver = (e: DragEvent) => {
            if (!carriesFiles(e))
                return;
            e.preventDefault();
            setDragging(true);
        };
        const onLeave = (e: DragEvent) => {
            if (!e.relatedTarget)
                setDragging(false);
        };
        const onDrop = (e: DragEvent) => {
            if (!carriesFiles(e))
                return;
            e.preventDefault();
            setDragging(false);
            const files = filesOf(e.dataTransfer);
            if (files.length)
                take(files);
        };
        window.addEventListener("paste", onPaste);
        window.addEventListener("dragover", onOver);
        window.addEventListener("dragleave", onLeave);
        window.addEventListener("drop", onDrop);
        return () => {
            window.removeEventListener("paste", onPaste);
            window.removeEventListener("dragover", onOver);
            window.removeEventListener("dragleave", onLeave);
            window.removeEventListener("drop", onDrop);
        };
    }, [adding]);
    const [kind, setKind] = useState(ALL);
    const [aw, setAw] = useState(ALL);
    const [soph, setSoph] = useState(ALL);
    const [cat, setCat] = useState(ALL);
    const [fmt, setFmt] = useState(ALL);
    const [industry, setIndustry] = useState(ALL);
    const [adKind, setAdKind] = useState(ALL);
    const [gapsOnly, setGapsOnly] = useState(false);
    const [organise, setOrganise] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [q, setQ] = useState("");
    const [open, setOpen] = useState<string | null>(null);
    const [picked, setPicked] = useState<Picked[]>([]);
    const [noting, setNoting] = useState<string | null>(null);
    const advanced = useAdvanced();
    const showFilters = advanced || filtersOpen;
    const categories = summary.categories;
    const addedCount = summary.added;
    const set = [aw, soph, cat, fmt, industry, adKind].filter((v) => v !== ALL).length + (gapsOnly ? 1 : 0);
    const filterKey = JSON.stringify({ source, kind, awareness: aw, sophistication: soph, category: cat, format: fmt, industry, adKind, gapsOnly, organise, q } satisfies ReferenceFilter);
    const [rows, setRows] = useState<RefCard[]>(first.cards);
    const [total, setTotal] = useState(first.total);
    const [loading, setLoading] = useState(false);
    const seq = useRef(0);
    const load = useCallback(async (key: string, offset: number, limit = PAGE) => {
        const n = ++seq.current;
        setLoading(true);
        try {
            const page = await referencePageAction(JSON.parse(key) as ReferenceFilter, offset, limit);
            if (n !== seq.current)
                return;
            setRows((cur) => (page.offset === 0 ? page.cards : [...cur, ...page.cards]));
            setTotal(page.total);
        }
        catch {
            if (n === seq.current)
                toast.error("The references could not be loaded. Try again.");
        }
        finally {
            if (n === seq.current)
                setLoading(false);
        }
    }, []);
    const lastKey = useRef(filterKey);
    const lastQ = useRef(q);
    useEffect(() => {
        if (lastKey.current === filterKey)
            return;
        lastKey.current = filterKey;
        const typing = lastQ.current !== q;
        lastQ.current = q;
        const t = setTimeout(() => void load(filterKey, 0), typing ? 250 : 0);
        return () => clearTimeout(t);
    }, [filterKey, q, load]);
    const firstSeen = useRef(first);
    useEffect(() => {
        if (firstSeen.current === first)
            return;
        firstSeen.current = first;
        if (filterKey === NO_FILTER_KEY && rows.length <= first.cards.length) {
            seq.current++;
            setRows(first.cards);
            setTotal(first.total);
            setLoading(false);
        }
        else
            void load(filterKey, 0, Math.max(PAGE, rows.length));
    }, [first, filterKey, rows.length, load]);
    const more = () => void load(filterKey, rows.length);
    const sentinel = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = sentinel.current;
        if (!el || loading || rows.length >= total || typeof IntersectionObserver === "undefined")
            return;
        const io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting))
                void load(filterKey, rows.length);
        }, { rootMargin: "600px" });
        io.observe(el);
        return () => io.disconnect();
    }, [loading, rows.length, total, filterKey, load]);
    const analysing = summary.analysing;
    useEffect(() => {
        if (!analysing)
            return;
        let stop = false;
        let last: string | null = null;
        const poll = async () => {
            try {
                const s: QueueStatus = await fetch("/api/pipeline/status", { cache: "no-store" }).then((r) => r.json());
                if (stop)
                    return;
                const a = s.queue.analyze_reference ?? { queued: 0, running: 0, done: 0, failed: 0 };
                const sig = `${a.queued}/${a.running}/${a.done}/${a.failed}`;
                if (last === null ? a.queued + a.running === 0 : sig !== last)
                    router.refresh();
                last = sig;
            }
            catch {
            }
        };
        void poll();
        const t = setInterval(poll, 2500);
        return () => {
            stop = true;
            clearInterval(t);
        };
    }, [analysing, router]);
    const openCard = open ? rows.find((c) => c.id === open) : undefined;
    const isPicked = (id: string) => picked.some((p) => p.id === id);
    const tick = (c: RefCard) => {
        if (isPicked(c.id)) {
            setPicked((cur) => cur.filter((p) => p.id !== c.id));
            setNoting((n) => (n === c.id ? null : n));
            return;
        }
        if (picked.length >= MAX_PICKED)
            return void toast.message(`A build takes ${MAX_PICKED} references at most. Untick one first.`);
        setPicked((cur) => [...cur, { id: c.id, kind: c.kind, title: c.source === "user" ? c.title : (c.advertiser ?? c.categories[0] ?? c.title), note: "", variants: 1, productId: "", personaId: "" }]);
        setNoting(c.id);
    };
    return (<div className="space-y-5 px-6 pt-8">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-md border bg-card text-sm" role="group" aria-label="Source" data-testid="ref-source-filter">
          {[
            [ALL, "All", "all"],
            ["remix", "Library", "library"],
            ["user", `Added by you (${addedCount})`, "user"],
        ].map(([v, label, id]) => (<button key={v} type="button" aria-pressed={source === v} onClick={() => setSource(v)} className={`h-8 px-3 max-md:h-10 ${source === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} data-testid={`ref-source-${id}`}>
              {label}
            </button>))}
        </div>
        <F value={kind} onChange={setKind} all="Images and videos" options={[["image", "Images"], ["video", "Videos"]]}/>
        <Button size="sm" variant={organise ? "default" : "outline"} onClick={() => setOrganise((o) => !o)} aria-pressed={organise} data-testid="ref-organise" title={`Put the references that suit ${fit.brandName} best first`}>
          <Sparkles className="size-4"/>
          Organise for {fit.brandName}
        </Button>
        {!advanced && (<Button size="sm" variant="outline" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen} data-testid="ref-filters-toggle">
            <SlidersHorizontal className="size-4"/>
            Filters{set ? ` (${set})` : ""}
          </Button>)}
        <Input className="h-8 w-72 max-w-full bg-card" aria-label="Search references" placeholder="Search hooks, advertisers, transcripts" value={q} onChange={(e) => setQ(e.target.value)}/>
        <span className="text-xs text-muted-foreground" data-testid="ref-count" data-loading={loading ? "true" : "false"}>
          {total} of {summary.all}
        </span>
        <Button size="sm" className="ml-auto" onClick={() => setAdding(true)} data-testid="add-ref-button">
          <Plus className="size-4"/>
          Add reference
        </Button>
      </div>

      {showFilters && (<div className="flex flex-wrap items-center gap-2" data-testid="ref-filters">
          <F value={industry} onChange={setIndustry} all="Every industry" options={[...(fit.industries.length ? [[MINE, `${fit.brandName}'s industry`] as [
                    string,
                    string
                ]] : []), ...INDUSTRIES.map(([name]) => [name, name] as [
                string,
                string
            ])]} testid="ref-filter-industry"/>
          <F value={aw} onChange={setAw} all="Any stage of awareness" options={AWARENESS.map((a) => [a, a.replace("-", " ")])} testid="ref-filter-awareness"/>
          <F value={soph} onChange={setSoph} all="Any market stage" options={SOPH.map((s) => [s, s.replace("stage-", "Market stage ")])} testid="ref-filter-sophistication"/>
          <F value={adKind} onChange={setAdKind} all="Any type of ad" options={AD_KINDS.map(([id, label]) => [id, label])} testid="ref-filter-kind"/>
          {advanced && (<>
              <F value={cat} onChange={setCat} all="All categories" options={categories.map((c) => [c, c])}/>
              <F value={fmt} onChange={setFmt} all="All formats" options={FORMAT_BUCKETS.map((f) => [f, humanize(f)])}/>
            </>)}
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={gapsOnly} onCheckedChange={setGapsOnly} data-testid="ref-filter-gaps"/>
            Only where {fit.brandName} is lacking
          </label>
        </div>)}

      {organise && (<div className="rounded-xl border border-rule bg-card p-5 text-sm" data-testid="ref-organise-basis">
          <p>
            <span className="font-medium">Best for {fit.brandName} first.</span> A reference moves up when it is from your industry, speaks to buyers your ads do not reach, argues the way your market still listens to, is a kind of ad you have not run, or looks like what your brain says works.
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
            {fit.basis.map((b) => (<li key={b}>{b}</li>))}
          </ul>
          {fit.simulated && <p className="mt-1.5 text-xs text-amber-800">The account behind the gaps is a simulated one, so the gaps are an example. The order becomes real when an ad account is connected.</p>}
        </div>)}

      {total === 0 && !loading && (<p className="py-8 text-center text-sm text-muted-foreground" data-testid="ref-empty">
          {summary.all === 0 ? "No references yet. Add your own with Add reference." : source === "user" && addedCount === 0 ? "You haven't added any references yet. Use Add reference." : "No references match these filters."}
        </p>)}
      <div className={cn("grid grid-cols-2 gap-x-4 gap-y-6 pt-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5", loading && "opacity-70 transition-opacity")} data-testid="ref-grid" aria-busy={loading}>
        {rows.map((c) => {
            const on = isPicked(c.id);
            const s = c.fit;
            return (<div key={c.id} className={cn("group relative overflow-hidden rounded-xl border border-rule bg-card transition-shadow hover:border-primary/50 hover:shadow-sm", on && "border-primary ring-1 ring-primary")} data-testid="ref-tile" data-picked={on ? "yes" : "no"}>
              <button type="button" onClick={() => tick(c)} aria-pressed={on} aria-label={on ? "Untick this reference" : "Tick this reference to build on it"} title={on ? "Untick" : "Tick to build on it"} className={cn("absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-md border shadow-sm transition max-md:size-10", on ? "border-primary bg-primary text-primary-foreground" : "border-foreground/25 bg-white/95 text-transparent hover:text-muted-foreground")} data-testid="ref-tick">
                <Check className="size-4"/>
              </button>
              <button type="button" onClick={() => setOpen(c.id)} className="block w-full text-left" data-testid="ref-card" data-ref-id={c.id} data-source={c.source} data-kind={c.kind}>
                <div className="relative aspect-[4/5] bg-muted">
                  <Thumb id={c.id} video={c.kind === "video"} v={c.v}/>
                  {c.source === "user" && (<Badge className="absolute top-1.5 left-1.5 px-1 py-0 text-[10px] font-normal" data-testid="ref-added-badge">
                      Added by you
                    </Badge>)}
                  {c.kind === "video" && (<span className="absolute right-1.5 bottom-1.5 inline-flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                      <Play className="size-2.5"/>
                      {c.duration ? `${Math.round(c.duration)}s` : "video"}
                    </span>)}
                </div>
                <div className="space-y-1.5 p-3">
                  <div className="truncate text-sm font-medium">{c.source === "user" ? c.title : (c.advertiser ?? c.categories[0] ?? c.title)}</div>
                  <div className="flex flex-wrap gap-1">
                    <AnalysisChip r={{ source: c.source, analyzed: c.analyzed, status: c.analysisStatus, error: c.analysisError }}/>
                    {organise && s?.gap && (<Badge variant="outline" className="border-emerald-300 bg-emerald-50 px-1 py-0 text-[10px] font-normal text-emerald-800" data-testid="ref-gap-chip">
                        Fills a gap
                      </Badge>)}
                    {(advanced || showFilters) && c.awareness && <Badge variant="outline" className="px-1 py-0 text-[10px] font-normal">{c.awareness}</Badge>}
                    {(advanced || showFilters) && c.sophistication && <Badge variant="outline" className="px-1 py-0 text-[10px] font-normal">{c.sophistication.replace("stage-", "S")}</Badge>}
                  </div>
                  {organise && s && s.reasons[0] && (<p className="line-clamp-3 text-[11px] leading-snug text-muted-foreground" title={s.reasons.join(" ")} data-testid="ref-fit-reason">

                      {s.reasons.find((r) => !r.startsWith("Your industry")) ?? s.reasons[0]}
                    </p>)}
                </div>
              </button>
            </div>);
        })}
      </div>

      <div ref={sentinel} aria-hidden className="h-px"/>
      {rows.length < total && (<div className="flex justify-center">
          <ShowMore hidden={total - rows.length} page={PAGE} onMore={more} className="" testId="ref-show-more"/>
        </div>)}
      {picked.length > 0 && (<BuildTray picks={picked} choices={choices} noting={noting} onNote={setNoting} onChange={(p) => setPicked((cur) => cur.map((x) => (x.id === p.id ? p : x)))} onRemove={(id) => {
                setPicked((cur) => cur.filter((p) => p.id !== id));
                setNoting(null);
            }} onClear={() => {
                setPicked([]);
                setNoting(null);
            }}/>)}
      {open && (<RefDrawer key={open} id={open} stamp={openCard ? `${openCard.analysisStatus}:${openCard.analyzed}` : ""} analysisEnabled={analysisEnabled} live={live} choices={choices} onClose={() => setOpen(null)}/>)}
      {dragging && !adding && (<div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary/10 backdrop-blur-[1px]" data-testid="ref-drop-anywhere">
          <div className="rounded-xl border-2 border-dashed border-primary bg-background px-8 py-6 text-sm font-medium shadow-lg">Drop to add it as a reference</div>
        </div>)}
      {adding && (<AddReferenceDialog analysisEnabled={analysisEnabled} initial={dropped} onClose={() => {
                setAdding(false);
                setDropped([]);
            }} onOpenReference={setOpen}/>)}
    </div>);
}
function F({ value, onChange, all, options, testid }: {
    value: string;
    onChange: (v: string) => void;
    all: string;
    options: [
        string,
        string
    ][];
    testid?: string;
}) {
    return (<Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-48" data-testid={testid}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{all}</SelectItem>
        {options.map(([v, l]) => (<SelectItem key={v} value={v}>
            {l}
          </SelectItem>))}
      </SelectContent>
    </Select>);
}
function StageBlock({ title, s }: {
    title: string;
    s: RefStage | null;
}) {
    if (!s)
        return null;
    return (<div className="rounded-md border p-2">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="font-medium">
        {s.stage} {s.confidence && <span className="font-normal text-muted-foreground">({s.confidence} confidence)</span>}
      </div>
      {s.rationale && <p className="mt-1 text-xs">{s.rationale}</p>}
      {s.adaptation && <p className="mt-1 text-xs text-muted-foreground">To adapt: {s.adaptation}</p>}
    </div>);
}
export const MAKE_FROM_LINE = "Read what makes this ad work, then choose how close your version stays, what it is about, who it is for and what to make: static ads, a video, or both.";
function RefDrawer({ id, stamp, analysisEnabled, live, choices, onClose }: {
    id: string;
    stamp: string;
    analysisEnabled: boolean;
    live: boolean;
    choices: BuildChoices;
    onClose: () => void;
}) {
    const router = useRouter();
    const [ref, setRef] = useState<AdReferenceRow | null>(null);
    const [missing, setMissing] = useState(false);
    const [title, setTitle] = useState("");
    const [notes, setNotes] = useState("");
    const [hooking, setHooking] = useState(false);
    const [pending, start] = useTransition();
    const filled = useRef(false);
    const advanced = useAdvanced();
    useEffect(() => {
        let stop = false;
        getReferenceAction(id).then((r) => {
            if (stop)
                return;
            setRef(r);
            setMissing(!r);
            if (r && !filled.current) {
                filled.current = true;
                setTitle(r.title);
                setNotes(r.notes);
            }
        });
        return () => {
            stop = true;
        };
    }, [id, stamp]);
    const a = (ref?.analysis ?? {}) as Record<string, string | null | undefined>;
    const section = (label: string, v: unknown) => v ? (<div>
        <div className="mb-0.5 text-xs font-medium text-muted-foreground">{label}</div>
        <p className="text-sm whitespace-pre-line">{String(v)}</p>
      </div>) : null;
    const mine = ref?.source === "user";
    const inFlight = ref?.analysis_status === "queued" || ref?.analysis_status === "running";
    const dirty = !!ref && (title.trim() !== ref.title || notes.trim() !== ref.notes);
    const whyNoScript = ref && !ref.analyzed ? "Analyse this reference first. A new ad is built on what the analysis finds." : "";
    const save = () => start(async () => {
        if (!title.trim())
            return void toast.error("Give the reference a title.");
        const res = await updateReferenceAction(id, { title, notes });
        if (!res.ok)
            return void toast.error(res.error);
        setRef((r) => (r ? { ...r, title: title.trim(), notes: notes.trim() } : r));
        toast.success("Saved.");
        router.refresh();
    });
    const analyse = () => start(async () => {
        const res = await analyzeReferenceAction(id);
        if (!res.ok)
            return void toast.error(res.error);
        setRef((r) => (r ? { ...r, analysis_status: "queued", analysis_error: null } : r));
        toast.success("Analysis started.");
        router.refresh();
    });
    const remove = () => {
        if (!confirm("Delete this reference and its file? This can't be undone."))
            return;
        start(async () => {
            const res = await deleteReferenceAction(id);
            if (!res.ok)
                return void toast.error(res.error);
            toast.success("Reference deleted.");
            onClose();
            router.refresh();
        });
    };
    return (<Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-2xl" data-testid="ref-drawer">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2 pr-6">
            <span className="min-w-0 truncate" data-testid="ref-drawer-title">
              {ref?.source === "user" ? ref.title : (a.advertiser ?? ref?.title ?? "Reference")}
            </span>
            {mine && <Badge data-testid="ref-added-badge">Added by you</Badge>}
            {ref && <AnalysisChip r={{ source: ref.source, analyzed: ref.analyzed, status: ref.analysis_status, error: ref.analysis_error }}/>}
          </SheetTitle>
          <SheetDescription>
            {ref ? `${ref.kind} · ${ref.categories.join(", ")}${ref.duration ? ` · ${Math.round(ref.duration)}s` : ""}` : missing ? "This reference no longer exists." : "Loading..."}
          </SheetDescription>
        </SheetHeader>
        {ref && (<div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {ref.media_path ? (ref.kind === "video" ? (<video src={`/api/references/media/${ref.id}`} poster={ref.thumb_path ? `/api/references/thumb/${ref.id}` : undefined} controls className="max-h-[60vh] w-full rounded-md bg-black"/>) : (<img src={`/api/references/media/${ref.id}`} alt="" className="max-h-[60vh] w-full rounded-md object-contain"/>)) : (<p className="text-sm text-amber-700">{advanced ? <>The original file isn&apos;t in skills/ on this computer.</> : <>The original is not available.</>}</p>)}

            <div className="space-y-1.5 rounded-md border p-3">
              {whyNoScript ? (<Button size="sm" disabled data-testid="ref-write-script">
                  <PenLine className="size-4"/>
                  Make an ad from this
                </Button>) : (<Button size="sm" asChild data-testid="ref-write-script">
                  <Link href={`/references/${ref.id}/make`}>
                    <PenLine className="size-4"/>
                    Make an ad from this
                  </Link>
                </Button>)}
              <p className="text-xs text-muted-foreground">{MAKE_FROM_LINE}</p>
              {whyNoScript && (<p className="text-xs text-amber-700" data-testid="ref-write-script-why">
                  {whyNoScript}
                </p>)}
            </div>

            {ref.kind === "video" && (<div className="space-y-1.5 rounded-md border p-3">
                <Button size="sm" variant="outline" onClick={() => setHooking(true)} data-testid="ref-new-hooks">
                  <Scissors className="size-4"/>
                  New hooks for this ad
                </Button>
                <p className="text-xs text-muted-foreground">{NEW_HOOKS_LINE}</p>
              </div>)}

            {(mine || !ref.analyzed || ref.analysis_status === "failed" || inFlight) && (<div className="space-y-1.5 rounded-md border p-3" data-testid="ref-analysis-block">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">Analysis</span>
                  <span className="text-muted-foreground" data-testid="ref-analysis-state">
                    {ref.analysis_status === "queued" ? "Queued" : ref.analysis_status === "running" ? "Analysing" : ref.analysis_status === "failed" ? "Failed" : ref.analyzed ? "Done" : "Not analysed"}
                  </span>
                  {analysisEnabled && ref.media_path && (<Button size="sm" variant="outline" className="ml-auto" onClick={analyse} disabled={pending || inFlight} data-testid="ref-analyse">
                      {inFlight ? <Loader2 className="size-4 animate-spin"/> : <RefreshCw className="size-4"/>}
                      {ref.analyzed || ref.analysis_status === "failed" ? "Analyse again" : "Analyse"}
                    </Button>)}
                </div>
                {ref.analysis_status === "failed" && (<p className="text-xs text-red-700" data-testid="ref-analysis-error">
                    {ref.analysis_error ?? "The analysis failed."}
                  </p>)}
                {!analysisEnabled && (<p className="text-xs text-muted-foreground" data-testid="ref-analysis-off">
                    {advanced ? ANALYSIS_OFF : "Analysis is switched off on this account."}
                  </p>)}
              </div>)}

            {mine ? (<div className="space-y-2 rounded-md border p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ref-title">Title</Label>
                  <Input id="ref-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} data-testid="ref-title-input"/>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ref-notes">What do you want to borrow from this ad?</Label>
                  <Textarea id="ref-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3} data-testid="ref-notes-input"/>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={save} disabled={pending || !dirty} data-testid="ref-save">
                    Save
                  </Button>
                  <Button size="sm" variant="outline" className="ml-auto text-red-700" onClick={remove} disabled={pending} data-testid="ref-delete">
                    <Trash2 className="size-4"/>
                    Delete
                  </Button>
                </div>
              </div>) : (section("Your notes", ref.notes))}

            {advanced && (<div className="grid gap-2 sm:grid-cols-2">
              <StageBlock title="Awareness" s={ref.awareness}/>
              <StageBlock title="Sophistication" s={ref.sophistication}/>
            </div>)}
            {section(advanced ? "Why it works (mechanism)" : "Why it works", a.mechanism)}
            {section("What to copy", a.transferable_principles)}
            {advanced && section("What not to copy", a.do_not_transfer)}
            {advanced && section("Observations", a.observations)}
            {advanced && section("Transcript", a.transcript)}
            {advanced && section("On-screen copy", a.readable_copy)}
            {advanced && Object.values(ref.tags).some((v) => v.length) && (<div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">Tags (cleaned)</div>
                <div className="space-y-1">
                  {Object.entries(ref.tags).map(([facet, vals]) => vals.length ? (<div key={facet} className="flex flex-wrap items-center gap-1 text-xs">
                        <span className="w-24 text-muted-foreground">{humanize(facet)}</span>
                        {vals.map((v) => (<Badge key={v} variant="secondary" className="font-normal">
                            {v}
                          </Badge>))}
                      </div>) : null)}
                </div>
              </div>)}
            {advanced && ref.analyzed && (<p className="text-xs text-muted-foreground">
                Analysis by {mine ? "Gemini" : "Remix"} ({a.model ?? "model n/a"}). &ldquo;Winning&rdquo; is a collection label, not measured performance.
              </p>)}
          </div>)}
        {hooking && ref && <HooksDialog referenceId={ref.id} title={ref.title} live={live} onClose={() => setHooking(false)}/>}
      </SheetContent>
    </Sheet>);
}
