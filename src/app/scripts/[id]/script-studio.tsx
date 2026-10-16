"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useUnsavedWarning } from "@/components/unsaved-warning";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowUp, Check, CheckCircle2, History, Plus, RefreshCw, Square, Trash2, Volume2, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AwarenessPill, StatusPill, TypePill } from "@/components/bits";
import { useAdvanced } from "@/components/mode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AuditItem, HookVariant, ScriptAxes, ScriptLine, ScriptRow } from "@/db/schema";
import type { Claim } from "@/lib/brand-brain";
import { chosenLength, lengthReadout, lengthWords } from "@/lib/copy/stage";
import { paceSaid } from "@/lib/pace";
import { aboutLength, hookGoodEnough, paceOfWords, readSeconds, scriptWords } from "@/lib/script-metrics";
import { auditSummary } from "@/lib/scripts/audit";
import { skillTitle } from "@/lib/skills/titles";
import { HOOK_TYPES } from "@/lib/scripts/axes";
import { BEATS, ENTRIES, LENGTH_LABELS, LENGTH_PRESETS, LENGTH_SECONDS, REGISTERS, SOURCE_INFO, STORY_SHAPES, humanize, type Beat, type InsightType, type LengthPreset, type SourceType } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { keepAsHookVariantAction, reauditScriptAction, saveScriptAction, setScriptStatusAction } from "../actions";
import { LiveGate, MAX_BATCH, SCRIPT_MOCK_NOTE, ScriptProgress, clampCount, queueScripts } from "../generation";
import { MakeAssetsButton } from "../../production/make-assets";
import { modelLabel, referenceModeLabel, isUploadedScript } from "@/lib/reference-modes";
import { EMOTIONS, SCRIPT_TYPES, emotionLabel, nativeArc, nativeImage, scriptType } from "@/lib/script-types";
import { ConvertVoice, RebuildWith, VoicePanel, type Alternative } from "./voice-panel";
import { SurfacesPanel } from "./surfaces-panel";
import { VersionsDrawer } from "./versions";
import { ScriptExport } from "../export-menu";
type Evidence = {
    id: string;
    label: string;
    type: InsightType;
    score: number;
    quotes: {
        id: string;
        quote: string;
        source_item_id: string;
        source_type: SourceType;
    }[];
};
type OtherScript = {
    id: string;
    title: string;
    lines: ScriptLine[];
};
type Reference = {
    id: string;
    title: string;
    kind: string;
    hasThumb: boolean;
};
type EditLine = ScriptLine & {
    key: number;
};
const PERSONS = [
    { key: "first-past", label: "1st past", person: "first", tense: "past" },
    { key: "second-present", label: "2nd present", person: "second", tense: "present" },
    { key: "third-past", label: "3rd past", person: "third", tense: "past" },
] as const;
const clean = (l: ScriptLine): ScriptLine => ({
    beat: l.beat,
    text: l.text,
    theme_ids: l.theme_ids,
    claim_ids: l.claim_ids,
    ...(l.visual_note?.trim() ? { visual_note: l.visual_note.trim() } : {}),
    ...(l.on_screen?.trim() ? { on_screen: l.on_screen.trim() } : {}),
});
const fingerprint = (title: string, lines: ScriptLine[]) => JSON.stringify([title.trim(), lines.map(clean)]);
export function ScriptStudio({ script, concept, evidence, claims, conceptThemes, speakerAge, other, references, alternatives, live, }: {
    script: ScriptRow;
    concept: {
        id: string;
        name: string;
        awareness_stage: ScriptRow["awareness_stage"];
    } | null;
    evidence: Record<string, Evidence>;
    claims: Record<string, Claim>;
    conceptThemes: Evidence[];
    speakerAge: string | null;
    other: OtherScript | null;
    references: Reference[];
    alternatives: Alternative[];
    live: boolean;
}) {
    const router = useRouter();
    const advanced = useAdvanced();
    const [pending, start] = useTransition();
    const [generating, startGenerate] = useTransition();
    const [axes, setAxes] = useState<ScriptAxes>(script.axes);
    const [more, setMore] = useState("3");
    const [themesOn, setThemesOn] = useState<Set<string>>(() => {
        const used = new Set(script.theme_ids.length ? script.theme_ids : script.lines.flatMap((l) => l.theme_ids));
        return new Set(conceptThemes.map((t) => t.id).filter((id) => used.has(id)));
    });
    const nextKey = useRef(script.lines.length);
    const [title, setTitle] = useState(script.title);
    const [lines, setLines] = useState<EditLine[]>(() => script.lines.map((l, key) => ({ ...l, key })));
    const [focusLine, setFocusLine] = useState<number | null>(null);
    const [versionsOpen, setVersionsOpen] = useState(false);
    const [compareOpen, setCompareOpen] = useState(false);
    const dirty = fingerprint(title, lines) !== fingerprint(script.title, script.lines);
    useUnsavedWarning(dirty);
    const words = scriptWords(lines);
    const secs = readSeconds(lines, speakerAge);
    const pace = paceOfWords(words, speakerAge);
    const target = (!script.axes.flow || script.axes.length_chosen) && script.axes.length in LENGTH_SECONDS ? lengthWords(script.axes.length as LengthPreset, speakerAge) : undefined;
    const asked = target ? `${script.axes.length_chosen ? "you chose" : "planned for"} ${LENGTH_LABELS[script.axes.length as LengthPreset]}, about ${target} words` : "";
    const audit = script.audit;
    const { fails, warnings } = auditSummary(audit);
    const patch = (i: number, p: Partial<ScriptLine>) => setLines((ls) => ls.map((l, n) => (n === i ? { ...l, ...p } : l)));
    const move = (i: number, by: -1 | 1) => setLines((ls) => {
        const j = i + by;
        if (j < 0 || j >= ls.length)
            return ls;
        const next = [...ls];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
    });
    const remove = (i: number) => setLines((ls) => ls.filter((_, n) => n !== i));
    const add = () => setLines((ls) => [...ls, { key: nextKey.current++, beat: "bridge", text: "", theme_ids: [], claim_ids: [] }]);
    const discard = () => {
        setTitle(script.title);
        setLines(script.lines.map((l, n) => ({ ...l, key: nextKey.current + n })));
        nextKey.current += script.lines.length;
    };
    const approve = () => start(async () => {
        await setScriptStatusAction(script.id, "approved");
        toast.success(advanced ? `${script.id} approved` : "Script approved.");
        router.refresh();
    });
    const save = () => start(async () => {
        const res = await saveScriptAction(script.id, { title, lines: lines.map(clean) });
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        const s = auditSummary(res.audit);
        if (!advanced)
            (res.found.length ? toast.message : toast.success)(res.found.length ? `Saved. The read-through found something on ${res.found.length} check${res.found.length === 1 ? "" : "s"}: ${res.found.join("; ").toLowerCase()}. Nothing was changed: see the suggestions under the script.` : "Saved.");
        else
            (s.fails ? toast.warning : toast.success)(`Saved as version ${res.version}: ${s.fails} fail${s.fails === 1 ? "" : "s"}, ${s.warnings} warning${s.warnings === 1 ? "" : "s"}`);
        router.refresh();
    });
    const reaudit = (claimChecks = false) => start(async () => {
        const res = await reauditScriptAction(script.id, claimChecks);
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        const s = auditSummary(res.audit);
        toast.success(`${claimChecks ? "Claims checked" : "Audit re-run"}: ${s.fails} fail${s.fails === 1 ? "" : "s"}, ${s.warnings} warning${s.warnings === 1 ? "" : "s"}`);
        router.refresh();
    });
    const keepVariant = (of: string | null) => start(async () => {
        const res = await keepAsHookVariantAction(script.id, of);
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        toast.success(of ? `Kept as a hook variant of ${of}` : "No longer marked as a hook variant");
        router.refresh();
    });
    const swapHook = (h: HookVariant) => {
        const at = Math.max(0, lines.findIndex((l) => l.beat === "hook"));
        if (!lines.length)
            setLines([{ key: nextKey.current++, beat: "hook", text: h.text, theme_ids: [], claim_ids: [], ...(h.overlay ? { on_screen: h.overlay } : {}) }]);
        else
            patch(at, { beat: "hook", text: h.text, ...(h.overlay ? { on_screen: h.overlay } : {}) });
        goToLine(at);
    };
    const goToLine = (i: number) => {
        setFocusLine(i);
        document.getElementById(`script-line-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    useEffect(() => {
        if (focusLine === null)
            return;
        const t = setTimeout(() => setFocusLine(null), 2500);
        return () => clearTimeout(t);
    }, [focusLine]);
    const generate = (count: number, exact: boolean) => startGenerate(async () => {
        if (!concept)
            return;
        await queueScripts({
            conceptId: concept.id,
            count,
            length: axes.length as LengthPreset,
            lengthChosen: !!axes.length_chosen,
            axes: exact ? axes : undefined,
            themeIds: themesOn.size ? [...themesOn] : undefined,
        });
    });
    const canGenerate = live && !!concept && !generating;
    const similar = script.similar_to;
    const hookText = lines.find((l) => l.beat === "hook")?.text ?? lines[0]?.text ?? "";
    return (<div>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rule px-6 py-5">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">
            <Link href="/scripts" className="hover:underline">
              Scripts
            </Link>{" "}
            {advanced && <span data-testid="script-version">v{script.version}</span>}
          </div>
          <h1 className="sr-only">{script.title}</h1>
          <Input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="script-title" className="-ml-2 h-8 max-w-2xl border-transparent px-2 text-lg font-semibold tracking-tight shadow-none hover:border-input md:text-lg"/>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            {advanced && <AwarenessPill stage={script.awareness_stage}/>}
            <StatusPill status={script.status}/>
            {advanced && (<>
            <Badge variant="outline" className="font-normal">
              load-bearing: {humanize(script.load_bearing_beat)}
            </Badge>
            {script.hook_variant_of && (<Badge variant="secondary" className="font-normal">
                hook variant of {script.hook_variant_of}
              </Badge>)}
            {script.model && (<Badge variant="outline" className="font-normal" data-testid="script-model-badge">
                written by {modelLabel(script.model)}
              </Badge>)}
            {script.axes.native && (<Badge variant="secondary" className="font-normal" data-testid="native-badge">
                native ad: {script.axes.native.form ? `${script.axes.native.form.replace(/-/g, " ")}, ` : ""}
                {(nativeArc(script.axes.native.arc)?.label ?? script.axes.native.arc).toLowerCase()}, {(nativeImage(script.axes.native.image)?.label ?? script.axes.native.image).toLowerCase()}
              </Badge>)}
            {scriptType(script.axes.script_type) && (<Badge variant="secondary" className="font-normal" data-testid="script-type-badge">
                {scriptType(script.axes.script_type)!.label.toLowerCase()}
              </Badge>)}
            {script.axes.emotion && (<Badge variant="outline" className="font-normal" data-testid="script-emotion-badge">
                {emotionLabel(script.axes.emotion).toLowerCase()}
                {script.axes.emotion_end && script.axes.emotion_end !== script.axes.emotion ? ` to ${emotionLabel(script.axes.emotion_end).toLowerCase()}` : ""}
              </Badge>)}
            {script.reference_mode && (<Badge variant="secondary" className="font-normal" data-testid="reference-mode-badge">
                {isUploadedScript(script) ? "your own script, kept word for word" : `from a reference: ${referenceModeLabel(script.reference_mode).toLowerCase()}`}
              </Badge>)}
            </>)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ScriptExport script={{ id: script.id, title, version: script.version, est_seconds: script.est_seconds, status: script.status, lines, hook_variants: script.hook_variants }} unsaved={dirty}/>
          {advanced && (<Button size="sm" variant="outline" onClick={() => setVersionsOpen(true)} data-testid="versions-button">
            <History className="size-4"/>
            Versions
          </Button>)}
          <Button size="sm" variant="outline" onClick={approve} disabled={pending || dirty || (script.status !== "draft" && !fails)} data-testid="script-approve">
            {fails ? "Override checks and approve" : "Approve"}
          </Button>
          <MakeAssetsButton scriptId={script.id}/>
        </div>
      </div>

      <ScriptProgress live={live} className="border-b px-6 py-3"/>

      <div className={advanced ? "grid gap-0 xl:grid-cols-[17rem_1fr_19rem]" : "mx-auto max-w-4xl"}>

        {advanced && (<section className="space-y-4 border-r p-4 text-sm" aria-label="Controls">
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Concept</div>
            {concept ? (<Link href="/concepts" className="text-primary hover:underline">
                {concept.id} · {concept.name}
              </Link>) : ("none")}
          </div>
          <Seg label="Kind of script" value={axes.script_type ?? ""} options={[["", "auto"], ...SCRIPT_TYPES.map((t) => [t.id, t.label] as const)]} onChange={(v) => setAxes({ ...axes, script_type: v || undefined })}/>
          {scriptType(axes.script_type) && (<p className="-mt-2 text-xs text-muted-foreground" data-testid="script-type-example">
              {scriptType(axes.script_type)!.summary} <span className="italic">&ldquo;{scriptType(axes.script_type)!.example}&rdquo;</span>
            </p>)}
          <Seg label="Feel" value={axes.emotion ?? ""} options={[["", "auto"], ...EMOTIONS.map((e) => [e.id, e.label] as const)]} onChange={(v) => setAxes({ ...axes, emotion: v || undefined, ...(v ? {} : { emotion_end: undefined }) })}/>
          {axes.emotion && <Seg label="Ends on" value={axes.emotion_end ?? ""} options={[["", "natural"], ...EMOTIONS.map((e) => [e.id, e.label] as const)]} onChange={(v) => setAxes({ ...axes, emotion_end: v || undefined })}/>}

          <Seg label="Length" value={axes.length_chosen ? axes.length : ""} options={[["", "Let the story decide"], ...LENGTH_PRESETS.map((l) => [l, LENGTH_LABELS[l]] as const)]} onChange={(v) => setAxes(v ? { ...axes, length: v, length_chosen: true } : { ...axes, length_chosen: undefined })}/>
          <p className="-mt-2 text-xs text-muted-foreground" data-testid="length-readout">
            {lengthReadout(chosenLength(axes), concept ? [concept.awareness_stage] : [], speakerAge)}
          </p>
          <Seg label="Person and tense" value={`${axes.person}-${axes.tense}`} options={PERSONS.map((p) => [p.key, p.label])} onChange={(v) => {
                const p = PERSONS.find((x) => x.key === v)!;
                setAxes({ ...axes, person: p.person, tense: p.tense });
            }}/>
          <Seg label="Problem entry" value={axes.entry} options={ENTRIES.map((e) => [e, humanize(e)])} onChange={(v) => setAxes({ ...axes, entry: v as typeof axes.entry })}/>
          <Seg label="Story shape" value={axes.story_shape} options={STORY_SHAPES.map((s) => [s, humanize(s)])} onChange={(v) => setAxes({ ...axes, story_shape: v })}/>
          <Seg label="Register" value={axes.register} options={REGISTERS.map((r) => [r, r === "ugc" ? "UGC casual" : r])} onChange={(v) => setAxes({ ...axes, register: v })}/>
          <Seg label="Hook type" value={axes.hook_type ?? ""} options={[["", "auto"], ...HOOK_TYPES.map((h) => [h, humanize(h)] as const)]} onChange={(v) => setAxes({ ...axes, hook_type: v || undefined })}/>
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Themes to draw on</div>
            <div className="space-y-1">
              {conceptThemes.map((t) => (<label key={t.id} className="flex items-start gap-2">
                  <Checkbox className="mt-0.5" checked={themesOn.has(t.id)} onCheckedChange={() => {
                    const n = new Set(themesOn);
                    if (n.has(t.id))
                        n.delete(t.id);
                    else
                        n.add(t.id);
                    setThemesOn(n);
                }}/>
                  <span className="leading-tight">{t.label}</span>
                </label>))}
            </div>
            {!themesOn.size && <p className="mt-1 text-xs text-muted-foreground">None ticked: the concept&apos;s top themes are used.</p>}
          </div>
          <div className="space-y-2 border-t pt-3">
            <LiveGate live={live}>
              <Button size="sm" className="w-full" onClick={() => generate(1, true)} disabled={!canGenerate} data-testid="generate-one">
                Generate
              </Button>
            </LiveGate>
            <p className="text-xs text-muted-foreground">1 new script with exactly these controls.</p>
            <div className="flex items-center gap-2">
              <Input type="number" min={1} max={MAX_BATCH} value={more} onChange={(e) => setMore(e.target.value)} aria-label="How many more scripts" className="h-8 w-16" data-testid="generate-more-count"/>
              <LiveGate live={live}>
                <Button size="sm" variant="outline" onClick={() => generate(clampCount(Number(more)), false)} disabled={!canGenerate} data-testid="generate-more">
                  Generate {clampCount(Number(more))} more
                </Button>
              </LiveGate>
            </div>
            <p className="text-xs text-muted-foreground">Up to {MAX_BATCH} at this length. The app varies the other controls so no 2 read alike.</p>
            {!live && (<p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800" data-testid="generate-mock-note">
                {SCRIPT_MOCK_NOTE}
              </p>)}
          </div>
          <RebuildWith scriptId={script.id} model={script.model} mode={script.reference_mode} live={live} alternatives={alternatives}/>
          <ConvertVoice scriptId={script.id} person={script.axes.person} tense={script.axes.tense} live={live}/>
        </section>)}


        <section className="min-w-0 space-y-6 p-4" aria-label="Script">
          {!advanced ? null : script.hook_variant_of ? (<div className="flex flex-wrap items-center gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900" data-testid="hook-variant-state">
              <span className="flex-1">
                Kept on purpose as a hook variant of{" "}
                <Link href={`/scripts/${script.hook_variant_of}`} className="font-mono underline">
                  {script.hook_variant_of}
                </Link>
                . The similarity check skips it.
              </span>
              {other && (<Button size="sm" variant="outline" onClick={() => setCompareOpen(true)}>
                  Compare side by side
                </Button>)}
              <Button size="sm" variant="outline" onClick={() => keepVariant(null)} disabled={pending} data-testid="undo-hook-variant">
                Undo
              </Button>
            </div>) : (similar && (<div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" data-testid="similar-warning">
                <AlertTriangle className="size-4 shrink-0"/>
                <span className="flex-1">
                  Too similar to{" "}
                  <Link href={`/scripts/${similar.script_id}`} className="font-mono underline">
                    {similar.script_id}
                  </Link>{" "}
                  ({Math.round(similar.jaccard * 100)}%). Meta may bundle these.
                </span>
                {other && (<Button size="sm" variant="outline" onClick={() => setCompareOpen(true)} data-testid="compare-similar">
                    Compare side by side
                  </Button>)}
                <Button size="sm" variant="outline" onClick={() => keepVariant(similar.script_id)} disabled={pending} data-testid="keep-hook-variant">
                  Keep as a hook variant
                </Button>
              </div>))}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="tabular-nums">
              {aboutLength(secs)} · <span data-testid="word-count">{words} words</span>
            </span>
            {asked && <span className="text-muted-foreground">{asked}</span>}
            {dirty && (<span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700" data-testid="unsaved">
                Unsaved changes
              </span>)}
            <span className="ml-auto flex gap-2">
              {!advanced && <ReadAloud text={lines.map((l) => l.text).join(" ")} className=""/>}
              {dirty && (<Button size="sm" variant="ghost" onClick={discard} disabled={pending}>
                  Discard edits
                </Button>)}
              <Button size="sm" onClick={save} disabled={!dirty || pending || !lines.some((l) => l.text.trim())} data-testid="save-version">
                {pending ? "Saving..." : "Save as new version"}
              </Button>
            </span>
          </div>

          <table className="w-full text-sm" data-testid="av-sheet">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className={advanced ? "w-32 pb-2" : "w-20 pb-2"}>{advanced ? "Beat" : <span className="sr-only">Line</span>}</th>
                <th className="pb-2">Line and on-screen text</th>
                <th className="w-48 pb-2">Visual</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
            const flagged = dirty || !advanced ? [] : audit.filter((a) => a.line_index === i && a.status !== "pass");
            const failed = flagged.some((a) => a.status === "fail");
            return (<tr key={l.key} id={`script-line-${i}`} data-testid="script-line" className={cn("border-t align-top transition-colors", failed ? "bg-red-50/60" : flagged.length ? "bg-amber-50/50" : "", focusLine === i && "bg-primary/10 outline-2 outline-primary/50")}>
                    <td className="space-y-1.5 py-3 pr-2">
                      {advanced ? (<select aria-label={`Beat of line ${i + 1}`} value={l.beat} onChange={(e) => patch(i, { beat: e.target.value as Beat })} data-testid="line-beat" className="w-full rounded-md border bg-transparent px-1.5 py-1 text-xs font-semibold tracking-wide uppercase">
                        {BEATS.map((b) => (<option key={b} value={b}>
                            {humanize(b)}
                          </option>))}
                      </select>) : null}
                      <div className="flex items-center gap-0.5 text-muted-foreground">
                        <span className="mr-1 text-xs tabular-nums">{i + 1}</span>
                        <IconButton label={`Move line ${i + 1} up`} onClick={() => move(i, -1)} disabled={i === 0} testid="line-up">
                          <ArrowUp className="size-3.5"/>
                        </IconButton>
                        <IconButton label={`Move line ${i + 1} down`} onClick={() => move(i, 1)} disabled={i === lines.length - 1} testid="line-down">
                          <ArrowDown className="size-3.5"/>
                        </IconButton>
                        <IconButton label={`Remove line ${i + 1}`} onClick={() => remove(i)} disabled={lines.length === 1} testid="line-remove">
                          <Trash2 className="size-3.5"/>
                        </IconButton>
                      </div>
                    </td>
                    <td className="space-y-1.5 py-3 pr-3">
                      <Textarea aria-label={`Line ${i + 1}`} value={l.text} onChange={(e) => patch(i, { text: e.target.value })} data-testid="line-text" className="min-h-9 leading-relaxed"/>
                      <Input aria-label={`On-screen text of line ${i + 1}`} value={l.on_screen ?? ""} onChange={(e) => patch(i, { on_screen: e.target.value })} placeholder="On-screen text (optional)" data-testid="line-on-screen" className="h-7 text-xs md:text-xs"/>
                      {advanced && (<div className="flex flex-wrap items-center gap-1">
                        {l.theme_ids.map((id) => (<ThemeChip key={id} e={evidence[id]} id={id} onRemove={() => patch(i, { theme_ids: l.theme_ids.filter((x) => x !== id) })}/>))}
                        {l.claim_ids.map((id) => (<ClaimChip key={id} c={claims[id]} id={id} onRemove={() => patch(i, { claim_ids: l.claim_ids.filter((x) => x !== id) })}/>))}
                        {!l.theme_ids.length && !l.claim_ids.length && <span className="text-xs text-amber-700">No evidence cited</span>}
                        <select aria-label={`Add evidence to line ${i + 1}`} value="" onChange={(e) => {
                        const [kind, id] = e.target.value.split(":");
                        if (kind === "theme")
                            patch(i, { theme_ids: [...l.theme_ids, id] });
                        if (kind === "claim")
                            patch(i, { claim_ids: [...l.claim_ids, id] });
                    }} data-testid="line-add-evidence" className="w-28 rounded-full border border-dashed bg-transparent px-1.5 py-0.5 text-xs text-muted-foreground">
                          <option value="">+ evidence</option>
                          <optgroup label="Themes">
                            {conceptThemes
                        .filter((t) => !l.theme_ids.includes(t.id))
                        .map((t) => (<option key={t.id} value={`theme:${t.id}`}>
                                  {t.label}
                                </option>))}
                          </optgroup>
                          <optgroup label="Substantiated claims">
                            {Object.values(claims)
                        .filter((c) => c.status === "substantiated" && !l.claim_ids.includes(c.id))
                        .map((c) => (<option key={c.id} value={`claim:${c.id}`}>
                                  {c.id}: {c.text.slice(0, 60)}
                                </option>))}
                          </optgroup>
                        </select>
                      </div>)}
                      {flagged.map((a, n) => (<p key={n} className={cn("text-xs", a.status === "fail" ? "text-red-700" : "text-amber-700")}>
                          {a.message}
                        </p>))}
                    </td>
                    <td className="py-3">
                      <Textarea aria-label={`Visual note of line ${i + 1}`} value={l.visual_note ?? ""} onChange={(e) => patch(i, { visual_note: e.target.value })} placeholder="Visual note" data-testid="line-visual" className="min-h-9 text-xs text-muted-foreground md:text-xs"/>
                    </td>
                  </tr>);
        })}
            </tbody>
          </table>
          <Button size="sm" variant="outline" onClick={add} data-testid="line-add">
            <Plus className="size-4"/>
            Add a line
          </Button>


          {!advanced && script.voice_check?.checks?.some((c) => !c.ok) && <VoicePanel scriptId={script.id} check={script.voice_check} mode={script.reference_mode} dirty={dirty} onGo={goToLine}/>}


          {advanced && (<div>
            <h2 className="mb-2 text-sm font-medium">{advanced ? <>Hook variants ({script.hook_variants.length})</> : "Other openings"}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {script.hook_variants.map((h) => (<HookCard key={h.id} h={h} inUse={h.text.trim() === hookText.trim()} onUse={() => swapHook(h)}/>))}
            </div>
            {advanced && (<p className="mt-2 text-xs text-muted-foreground">
              Good enough = clarity at least 3 and 2 criteria at 4 or more. Relevance scores the problem named, not a persona call-out. Record
              every hook: each one is another ad.
            </p>)}
          </div>)}
        </section>


        {(<section className="space-y-4 border-l p-4 text-sm" aria-label="Auditor">
          {advanced && <VoicePanel scriptId={script.id} check={script.voice_check} mode={script.reference_mode} dirty={dirty} onGo={goToLine}/>}
          {!!script.axes.check_overrides?.length && <p className="text-xs text-muted-foreground" data-testid="script-human-override">Human override recorded. Failed findings remain visible.</p>}
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium">Auditor</h2>
              <div className="flex flex-wrap gap-1.5">
                {(<Button size="sm" onClick={() => reaudit(true)} disabled={pending || dirty} title={dirty ? "Save your edits first" : "Read this script against the approved claims and the guardrails"} data-testid="check-claims">
                    {script.axes.claim_checks ? "Check claims again" : "Enable and check claims"}
                  </Button>)}
                <Button size="sm" variant="outline" onClick={() => reaudit()} disabled={pending} data-testid="reaudit">
                  <RefreshCw className={cn("size-3.5", pending && "animate-spin")}/>
                  Re-run audit
                </Button>
              </div>
            </div>
            <div className="mb-2 flex gap-1.5 text-xs" data-testid="audit-summary">
              <span className={cn("rounded-full border px-2 py-0.5", fails ? "border-red-200 bg-red-50 text-red-700" : "text-muted-foreground")} data-testid="audit-fails" data-count={fails}>
                {fails} fail{fails === 1 ? "" : "s"}
              </span>
              <span className={cn("rounded-full border px-2 py-0.5", warnings ? "border-amber-200 bg-amber-50 text-amber-700" : "text-muted-foreground")} data-testid="audit-warnings" data-count={warnings}>
                {warnings} warning{warnings === 1 ? "" : "s"}
              </span>
              <span className="rounded-full border px-2 py-0.5 text-muted-foreground" data-testid="audit-passes" data-count={audit.length - fails - warnings}>
                {audit.length - fails - warnings} passed
              </span>
            </div>
            {dirty && <p className="mb-2 text-xs text-amber-700">This is the audit of the saved version. Save to check your edits.</p>}
            <div className="space-y-3" data-testid="audit-list">
              {(["fail", "warn", "pass"] as const).map((status) => {
                const items = audit.filter((a) => a.status === status);
                if (!items.length)
                    return null;
                return (<div key={status} data-testid={`audit-group-${status}`}>
                    <div className="mb-1 text-xs font-medium text-muted-foreground">{status === "fail" ? "Fails" : status === "warn" ? "Warnings" : "Passed"}</div>
                    <ul className="space-y-1.5">
                      {items.map((a, n) => (<AuditRow key={n} a={a} onGo={goToLine}/>))}
                    </ul>
                  </div>);
            })}
            </div>
            {!live && <p className="mt-2 text-xs text-muted-foreground">Demo mode checks the basic rules. Connect AI in Settings to check the hook, supporting evidence and brand voice.</p>}
          </div>

          <div className="rounded-md border p-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Read time</span>
              <span className="font-medium tabular-nums" data-testid="read-time">
                {aboutLength(secs)}
              </span>
            </div>
            <div className="flex justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {words} words, said at {paceSaid(pace.rate)}
                {pace.band ? ` by a speaker aged ${pace.band}` : ""}
              </span>
              <span className="text-right">{asked || "as long as its buyer needs"}</span>
            </div>
            <ReadAloud text={lines.map((l) => l.text).join(" ")}/>
          </div>

          <SurfacesPanel scriptId={script.id} version={script.version} beat={script.load_bearing_beat} surfaces={script.surfaces ?? null} live={live}/>
          {(script.awareness_stage === "unaware" || script.awareness_stage === "problem_aware") && (<p className="text-xs text-amber-700">Unaware and problem-aware concepts need education. Prefer longer formats unless you are testing the angle with statics first.</p>)}

          <div className="rounded-md border p-3">
            <div className="text-muted-foreground">Similar to</div>
            <div data-testid="similar-to">
              {script.hook_variant_of ? `Hook variant of ${script.hook_variant_of}` : similar ? `${similar.script_id} (${Math.round(similar.jaccard * 100)}%)` : "-"}
            </div>
          </div>

          <div className="rounded-md border p-3" data-testid="test-plan">
            <div className="text-muted-foreground">Test plan</div>
            <p className="mt-1 text-xs whitespace-pre-wrap">{script.test_plan || "No test plan yet. Generated scripts say what to test them against."}</p>
          </div>

          <div className="rounded-md border p-3" data-testid="script-notes">
            <div className="text-muted-foreground">Writer&apos;s notes</div>
            <p className="mt-1 text-xs whitespace-pre-wrap">{script.notes || "No notes."}</p>
          </div>

          {script.skills_used && script.skills_used.length > 0 && (<div className="rounded-md border p-3" data-testid="script-skills">
              <div className="text-muted-foreground">Skills the writer was given</div>
              <ul className="mt-1 space-y-0.5 text-xs">
                {script.skills_used.map((s) => (<li key={s} className={s.startsWith("principles:") ? "text-muted-foreground" : ""}>
                    {s.startsWith("principles:") ? s : skillTitle(s)}
                  </li>))}
              </ul>
            </div>)}

          <div className="rounded-md border p-3" data-testid="script-references">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Reference ads used</span>
              <Link href="/references" className="text-xs text-primary hover:underline">
                Library
              </Link>
            </div>
            {script.reference_ids.length ? (<ul className="mt-2 space-y-2">
                {script.reference_ids.map((id) => {
                    const r = references.find((x) => x.id === id);
                    return (<li key={id}>
                      <Link href="/references" className="flex items-center gap-2 text-xs hover:underline">
                        {r?.hasThumb ? (<img src={`/api/references/thumb/${id}?w=160`} alt="" loading="lazy" className="size-10 shrink-0 rounded object-cover"/>) : (<span className="size-10 shrink-0 rounded bg-muted"/>)}
                        <span className="min-w-0">
                          <span className="block truncate">{r?.title ?? "Reference no longer in the library"}</span>
                          <span className="font-mono text-muted-foreground">{id.slice(0, 8)}</span>
                        </span>
                      </Link>
                    </li>);
                })}
              </ul>) : (<p className="mt-1 text-xs">None. This script was written from the research alone.</p>)}
          </div>
        </section>)}
      </div>

      <VersionsDrawer script={script} open={versionsOpen} onOpenChange={setVersionsOpen} dirty={dirty}/>

      {other && (<Dialog open={compareOpen} onOpenChange={setCompareOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl" data-testid="compare-dialog">
            <DialogHeader>
              <DialogTitle>Side by side</DialogTitle>
              <DialogDescription>
                {similar ? `${Math.round(similar.jaccard * 100)}% of the 3-word phrases are shared. ` : ""}Scripts this close can be bundled by Meta into 1 ad. Change the
                body, or keep this one on purpose as a hook variant.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <CompareColumn id={script.id} title={title} lines={lines} note="this script"/>
              <CompareColumn id={other.id} title={other.title} lines={other.lines}/>
            </div>
          </DialogContent>
        </Dialog>)}
    </div>);
}
function CompareColumn({ id, title, lines, note }: {
    id: string;
    title: string;
    lines: ScriptLine[];
    note?: string;
}) {
    return (<div className="min-w-0 rounded-md border">
      <div className="border-b bg-muted/50 px-3 py-2">
        <span className="font-mono text-xs text-muted-foreground">
          {id}
          {note ? ` (${note})` : ""}
        </span>
        <div className="font-medium">{title}</div>
      </div>
      <ol className="divide-y">
        {lines.map((l, i) => (<li key={i} className="px-3 py-2">
            <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">{humanize(l.beat)}</span>
            {l.text}
          </li>))}
      </ol>
    </div>);
}
function IconButton({ label, onClick, disabled, testid, children }: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    testid: string;
    children: React.ReactNode;
}) {
    return (<button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} data-testid={testid} className="rounded p-1 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
      {children}
    </button>);
}
function Seg({ label, value, options, onChange, }: {
    label: string;
    value: string;
    options: (readonly [
        string,
        string
    ])[];
    onChange: (v: string) => void;
}) {
    return (<div>
      <Label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1">
        {options.map(([v, l]) => (<button key={v} onClick={() => onChange(v)} aria-pressed={value === v} className={cn("rounded-md border px-2 py-0.5 text-xs", value === v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
            {l}
          </button>))}
      </div>
    </div>);
}
function RemoveChip({ label, onRemove }: {
    label: string;
    onRemove: () => void;
}) {
    return (<button type="button" aria-label={label} title={label} onClick={onRemove} data-testid="evidence-remove" className="rounded-full p-0.5 opacity-60 hover:bg-black/10 hover:opacity-100">
      <X className="size-3"/>
    </button>);
}
function ThemeChip({ e, id, onRemove }: {
    e?: Evidence;
    id: string;
    onRemove: () => void;
}) {
    return (<span data-testid="evidence-chip" className="inline-flex items-center gap-0.5 rounded-full border bg-secondary py-0.5 pr-1 pl-2 text-xs hover:border-primary/50">
      <HoverCard openDelay={150}>
        <HoverCardTrigger asChild>
          <Link href={`/insights?theme=${id}`}>{e?.label ?? id}</Link>
        </HoverCardTrigger>
        {e && (<HoverCardContent className="w-96 text-sm">
            <div className="mb-2 flex items-center gap-2">
              <TypePill type={e.type}/>
              <span className="text-xs text-muted-foreground">score {e.score.toFixed(1)}</span>
            </div>
            <ul className="space-y-2">
              {e.quotes.map((q) => (<li key={q.id}>
                  <p className="italic">“{q.quote}”</p>
                  <Link href={`/sources?tab=${q.source_type}&item=${q.source_item_id}&hl=${q.id}`} className="text-xs text-primary hover:underline">
                    {SOURCE_INFO[q.source_type].tab} · {q.source_item_id}
                  </Link>
                </li>))}
            </ul>
          </HoverCardContent>)}
      </HoverCard>
      <RemoveChip label={`Remove evidence ${e?.label ?? id}`} onRemove={onRemove}/>
    </span>);
}
function ClaimChip({ c, id, onRemove }: {
    c?: Claim;
    id: string;
    onRemove: () => void;
}) {
    const tone = c?.status === "substantiated"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : c?.status === "pending"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-red-200 bg-red-50 text-red-800";
    return (<span data-testid="evidence-chip" className={cn("inline-flex items-center gap-0.5 rounded-full border py-0.5 pr-1 pl-2 font-mono text-xs", tone)}>
      <HoverCard openDelay={150}>
        <HoverCardTrigger asChild>
          <span className="cursor-default">{id}</span>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 font-sans text-sm">
          {c ? (<>
              <p>{c.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {c.status} · {c.source}
              </p>
            </>) : (<p className="text-red-700">Claim not in the brand brain.</p>)}
        </HoverCardContent>
      </HoverCard>
      <RemoveChip label={`Remove claim ${id}`} onRemove={onRemove}/>
    </span>);
}
const CRITERIA = ["clarity", "relevance", "novelty", "specificity", "credibility"] as const;
function HookCard({ h, inUse, onUse }: {
    h: HookVariant;
    inUse: boolean;
    onUse: () => void;
}) {
    const ok = hookGoodEnough(h.grades);
    const advanced = useAdvanced();
    return (<div className="rounded-lg border p-3" data-testid="hook-variant">
      {advanced && (<div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-mono text-muted-foreground">
          {h.id} · {humanize(h.type)}
        </span>
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")} data-testid="hook-good-enough" data-ok={ok}>
          {ok && <Check className="size-3"/>}
          {ok ? "Good enough" : "Needs work"}
        </span>
      </div>)}
      <p className="mb-2 text-sm font-medium">“{h.text}”</p>
      {(h.overlay || h.first_frame) && (<dl className="mb-2 space-y-0.5 text-xs">
          {h.overlay && (<div className="flex gap-1.5">
              <dt className="shrink-0 text-muted-foreground">Overlay</dt>
              <dd>{h.overlay}</dd>
            </div>)}
          {h.first_frame && (<div className="flex gap-1.5">
              <dt className="shrink-0 text-muted-foreground">First frame</dt>
              <dd>{h.first_frame}</dd>
            </div>)}
        </dl>)}
      {advanced && (<div className="space-y-1">
        {CRITERIA.map((k) => (<div key={k} className="flex items-center gap-2 text-xs" data-testid="hook-grade">
            <span className="w-20 text-muted-foreground">{k}</span>
            <div className="flex flex-1 gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (<span key={n} className={cn("h-1.5 flex-1 rounded-sm", n <= h.grades[k] ? "bg-primary" : "bg-muted")}/>))}
            </div>
            <span className="w-3 tabular-nums">{h.grades[k]}</span>
          </div>))}
      </div>)}
      <Button size="sm" variant="outline" className="mt-2" onClick={onUse} disabled={inUse} data-testid="use-hook">
        {advanced ? (inUse ? "This is the hook" : "Use as the hook") : inUse ? "This is the opening" : "Use this opening"}
      </Button>
    </div>);
}
function AuditRow({ a, onGo }: {
    a: AuditItem;
    onGo: (line: number) => void;
}) {
    const Icon = a.status === "pass" ? CheckCircle2 : a.status === "warn" ? AlertTriangle : XCircle;
    const tone = a.status === "pass" ? "text-emerald-600" : a.status === "warn" ? "text-amber-600" : "text-red-600";
    const body = (<>
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone)}/>
      <span>
        {a.message}
        {a.line_index !== undefined && <span className="text-xs text-muted-foreground"> (line {a.line_index + 1})</span>}
      </span>
    </>);
    return (<li data-testid="audit-item" data-status={a.status} data-check={a.check}>
      {a.line_index !== undefined ? (<button type="button" onClick={() => onGo(a.line_index!)} className="flex gap-2 rounded text-left hover:bg-muted" title={`Go to line ${a.line_index + 1}`}>
          {body}
        </button>) : (<span className="flex gap-2">{body}</span>)}
    </li>);
}
function ReadAloud({ text, className = "mt-2 w-full" }: {
    text: string;
    className?: string;
}) {
    const [speaking, setSpeaking] = useState(false);
    const [supported, setSupported] = useState(true);
    useEffect(() => {
        setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
        return () => {
            if ("speechSynthesis" in window)
                window.speechSynthesis.cancel();
        };
    }, []);
    const toggle = () => {
        const synth = window.speechSynthesis;
        if (speaking) {
            synth.cancel();
            setSpeaking(false);
            return;
        }
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1;
        u.onend = () => setSpeaking(false);
        synth.speak(u);
        setSpeaking(true);
    };
    return (<Button size="sm" variant="outline" className={className} onClick={toggle} disabled={!supported}>
      {speaking ? <Square className="size-4"/> : <Volume2 className="size-4"/>}
      {speaking ? "Stop" : "Read aloud"}
    </Button>);
}
