"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReferenceMode, VoiceCheck } from "@/db/schema";
import { SCRIPT_MODELS, modelLabel } from "@/lib/reference-modes";
import { cn } from "@/lib/utils";
import { applyVoiceAction, rebuildScriptAction, transposeScriptAction } from "../actions";
import { LiveGate } from "../generation";
const STATUS: Record<VoiceCheck["status"], {
    label: string;
    tone: string;
}> = {
    clean: { label: "On voice", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    fixed: { label: "Fixed", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    suggested: { label: "Suggestions", tone: "border-amber-200 bg-amber-50 text-amber-700" },
    skipped: { label: "Not checked", tone: "text-muted-foreground" },
};
function plain(text: string): {
    what: string;
    todo: string;
} {
    const say = (t: string) => t
        .replace(/rests on no fact the brand holds/g, "is not backed by any fact on file for the brand")
        .replace(/says more than the held fact/g, "says more than the fact on file,")
        .replace(/\bheld fact\b/g, "fact on file")
        .replace(/\bis not held\b/g, "is not on file")
        .replace(/\bnot held\b/g, "not on file")
        .trim();
    const m = text.match(/^(.*?):\s*(take (?:it )?out[^]*)$/i);
    if (!m)
        return { what: say(text), todo: "" };
    const todo = say(m[2]).replace(/\.?\s*Add no figure the line did not have\.?$/i, "");
    return { what: say(m[1]), todo: todo ? todo[0].toUpperCase() + todo.slice(1) + (/[.!?]$/.test(todo) ? "" : ".") : "" };
}
function openItem(raw: string, labels: Record<string, string>): {
    line: number | null;
    where: string;
    label: string;
    what: string;
    todo: string;
} {
    const m = raw.match(/^(Lines? ([\d, ]+))(?: \(([a-z_]+)\))?:\s*([^]*)$/);
    if (!m)
        return { line: null, where: "", label: "", ...plain(raw) };
    const first = Number(m[2].split(",")[0]);
    return { line: Number.isFinite(first) ? first - 1 : null, where: m[1], label: m[3] ? (labels[m[3]] ?? m[3].replace(/_/g, " ")) : "", ...plain(m[4]) };
}
const VERDICT: Record<NonNullable<VoiceCheck["facts"]>[number]["verdict"], {
    label: string;
    tone: string;
}> = {
    held: { label: "Backed by a fact on file", tone: "text-emerald-700" },
    stretched: { label: "Says more than the fact on file", tone: "text-amber-700" },
    invented: { label: "No fact on file backs it", tone: "text-amber-700" },
    scene: { label: "A scene, not a claim", tone: "text-muted-foreground" },
};
export function VoicePanel({ scriptId, check, mode, dirty, onGo }: {
    scriptId: string;
    check: VoiceCheck | null;
    mode: ReferenceMode | null;
    dirty: boolean;
    onGo: (line: number) => void;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    if (!check) {
        return (<div className="rounded-md border p-3" data-testid="voice-panel" data-status="none">
        <h2 className="text-sm font-medium">Voice checks</h2>
        <p className="mt-1 text-xs text-muted-foreground">Not checked yet. Re-run the audit to check how this script sounds aloud and whether it is in the brand&apos;s voice.</p>
      </div>);
    }
    const s = STATUS[check.status];
    const applied = check.issues.filter((i) => i.applied);
    const open = check.issues.filter((i) => !i.applied);
    const pass = !!check.checks?.length;
    const labels = Object.fromEntries((check.checks ?? []).map((c) => [c.check, c.label]));
    const remaining = (check.remaining ?? []).map((r) => openItem(r, labels));
    const found = (check.checks ?? []).filter((c) => !c.ok).length;
    const facts = check.facts ?? [];
    const unbacked = facts.filter((f) => f.verdict === "invented" || f.verdict === "stretched").length;
    const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
    const apply = () => start(async () => {
        const res = await applyVoiceAction(scriptId);
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        toast.success(`Voice fixes saved as version ${res.version}`);
        router.refresh();
    });
    return (<div className="rounded-md border p-3" data-testid="voice-panel" data-status={check.status}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          <MessageSquareText className="size-4"/>
          {check.checks?.length ? "Read-through checks" : "Voice checks"}
        </h2>
        <span className={cn("rounded-full border px-2 py-0.5 text-xs", s.tone)} data-testid="voice-status">
          {pass ? (remaining.length ? `${remaining.length} still open` : check.status === "clean" ? "All held" : check.status === "fixed" ? "Fixed" : check.status === "suggested" ? "Found something" : s.label) : s.label}
        </span>
      </div>
      {pass ? (<p className="mt-1.5 text-xs" data-testid="voice-summary" title={check.summary}>
          This script was read against {n(check.checks!.length, "check", "checks")}. {found ? `${n(found, "check", "checks")} found something.` : "Every check held."}{" "}
          {applied.length ? `${n(applied.length, "line was", "lines were")} changed for you.` : open.length ? "Nothing was changed; the suggestions are below." : "Nothing was changed."}{" "}
          {remaining.length ? `${n(remaining.length, "thing is", "things are")} still open, for you to decide.` : check.loops !== undefined ? "Nothing is left open." : ""}
        </p>) : (<p className="mt-1.5 text-xs" data-testid="voice-summary">
          {check.summary}
        </p>)}
      {remaining.length > 0 && (<div className="mt-2 rounded border border-amber-200 bg-amber-50/60 p-2 text-xs" data-testid="voice-remaining">
          <div className="font-medium text-amber-800">Still open ({remaining.length})</div>
          <p className="mt-0.5 text-muted-foreground">Not changed for you. Edit the line, or leave it if you are happy with it. Nothing is blocked.</p>
          <ul className="mt-1.5 space-y-1.5">
            {remaining.map((r, i) => (<li key={i} data-testid="voice-remaining-row">
                {r.line !== null ? (<button type="button" className="font-medium text-primary hover:underline" onClick={() => onGo(r.line!)}>
                    {r.where}
                  </button>) : null}
                {r.label && <span className="text-muted-foreground"> · {r.label}</span>}
                <span className="block">{r.what}</span>
                {r.todo && <span className="block text-muted-foreground">What to do: {r.todo}</span>}
              </li>))}
          </ul>
        </div>)}
      {pass && <div className="mt-2 text-xs font-medium text-muted-foreground">What was checked</div>}
      {check.checks && check.checks.length > 0 && (<ul className="mt-1 space-y-1 text-xs" data-testid="voice-checks">
          {check.checks.map((c) => (<li key={c.check} className="flex items-start gap-1.5" data-testid="voice-check-row" data-ok={c.ok}>
              {c.ok ? <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600"/> : <span className="mt-1 size-2 shrink-0 rounded-full bg-amber-500" aria-hidden/>}
              <span>
                <span className={c.ok ? "text-muted-foreground" : "font-medium"}>{c.label}</span>
                {!c.ok && c.found.map((f, k) => <span key={k} className="block text-muted-foreground">{plain(f).what}</span>)}
              </span>
            </li>))}
        </ul>)}
      {mode === "exact" && check.status !== "skipped" && <p className="mt-1 text-xs text-muted-foreground">This script copies its reference ad, so nothing was changed. These are notes only.</p>}
      {applied.length > 0 && (<div className="mt-2">
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            {pass ? `Changed for you (${applied.length}). The old line is struck through, the new line is under it.` : `Changed (${applied.length}). See Versions for the before and after.`}
          </div>
          <ul className="space-y-1.5">
            {applied.map((i, n) => (<VoiceRow key={n} issue={i} onGo={onGo} done plainWords={pass}/>))}
          </ul>
        </div>)}
      {open.length > 0 && (<div className="mt-2">
          <div className="mb-1 text-xs font-medium text-muted-foreground">Suggested ({open.length})</div>
          <ul className="space-y-1.5">
            {open.map((i, n) => (<VoiceRow key={n} issue={i} onGo={onGo}/>))}
          </ul>
          <Button size="sm" variant="outline" className="mt-2" onClick={apply} disabled={pending || dirty} data-testid="voice-apply">
            {pending && <Loader2 className="size-3.5 animate-spin"/>}
            Apply suggestions
          </Button>
          {dirty && <p className="mt-1 text-xs text-amber-700">Save your edits first.</p>}
        </div>)}
      {facts.length > 0 && (<details className="mt-2 text-xs" data-testid="voice-facts">
          <summary className="cursor-pointer font-medium text-muted-foreground">
            Facts in this script ({facts.length}){unbacked ? `: ${n(unbacked, "is", "are")} not backed by a fact on file` : ": every claim is backed"}
          </summary>
          <ul className="mt-1.5 space-y-1.5">
            {facts.map((f, i) => (<li key={i} className="rounded border bg-muted/30 p-2">
                <span className="font-medium">{f.where[0].toUpperCase() + f.where.slice(1)}</span> <span className={VERDICT[f.verdict]?.tone}>· {VERDICT[f.verdict]?.label ?? f.verdict}</span>
                <span className="block">&ldquo;{f.quote}&rdquo;</span>
                {f.held && <span className="block text-muted-foreground">Fact on file: {f.held}</span>}
              </li>))}
          </ul>
        </details>)}
      {check.sources.length > 0 && (<p className="mt-2 text-xs text-muted-foreground" data-testid="voice-sources">
          Checked against: {check.sources.join("; ")}.
        </p>)}
    </div>);
}
function VoiceRow({ issue, onGo, done, plainWords }: {
    issue: VoiceCheck["issues"][number];
    onGo: (line: number) => void;
    done?: boolean;
    plainWords?: boolean;
}) {
    const cut = plainWords ? issue.why.indexOf(": ") : -1;
    const tag = cut > 0 && cut < 40 ? issue.why.slice(0, cut) : issue.pass === "spoken" ? "read aloud" : "brand voice";
    const why = cut > 0 && cut < 40 ? plain(issue.why.slice(cut + 2)).what : issue.why;
    const where = issue.where === "line" ? `Line ${issue.index + 1}${issue.field === "on_screen" ? " (on-screen)" : ""}` : `Hook ${issue.index + 1}${issue.field === "on_screen" ? " (overlay)" : ""}`;
    return (<li className="rounded border bg-muted/30 p-2 text-xs" data-testid="voice-issue" data-applied={issue.applied}>
      <div className="flex items-center gap-1.5">
        {done && <Check className="size-3.5 text-emerald-600"/>}
        {issue.where === "line" ? (<button type="button" className="font-medium text-primary hover:underline" onClick={() => onGo(issue.index)}>
            {where}
          </button>) : (<span className="font-medium">{where}</span>)}
        <span className="ml-auto rounded-full border px-1.5 text-[10px] text-muted-foreground" data-testid="voice-pass">
          {tag}
        </span>
      </div>
      <p className="mt-0.5">
        <span className="text-muted-foreground line-through">{issue.phrase}</span>
      </p>
      <p className="mt-0.5">{issue.fix}</p>
      <p className="mt-0.5 text-muted-foreground">{why}</p>
    </li>);
}
export interface Alternative {
    id: string;
    title: string;
    model: string | null;
    voice?: string;
    fails: number;
    warnings: number;
}
export function RebuildWith({ scriptId, model, mode, live, alternatives }: {
    scriptId: string;
    model: string | null;
    mode: ReferenceMode | null;
    live: boolean;
    alternatives: Alternative[];
}) {
    const others = SCRIPT_MODELS.filter((m) => m.id !== model);
    const [pick, setPick] = useState<string>(others[0]?.id ?? SCRIPT_MODELS[0].id);
    const [pending, start] = useTransition();
    const [queued, setQueued] = useState(false);
    const run = () => start(async () => {
        const res = await rebuildScriptAction(scriptId, pick);
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        setQueued(true);
        toast.success(`Writing the same brief with ${modelLabel(pick)}. It will appear here in 1 to 2 minutes.`);
        window.dispatchEvent(new Event("ce:scripts-queued"));
    });
    const ids = [scriptId, ...alternatives.map((a) => a.id)];
    return (<div className="space-y-2 border-t pt-3" data-testid="rebuild-with">
      <div className="text-xs font-medium text-muted-foreground">Same brief, another model</div>
      {mode === "exact" ? (<p className="text-xs text-muted-foreground">This script copies its reference ad, so no model wrote it.</p>) : (<>
          <p className="text-xs text-muted-foreground">Written by {modelLabel(model) || "the default model"}. Write it again with another model and compare them side by side.</p>
          <div className="flex items-center gap-2">
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger className="h-8 flex-1" data-testid="rebuild-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCRIPT_MODELS.map((m) => (<SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>))}
              </SelectContent>
            </Select>
            <LiveGate live={live}>
              <Button size="sm" variant="outline" onClick={run} disabled={!live || pending || queued} data-testid="rebuild-submit">
                {pending && <Loader2 className="size-3.5 animate-spin"/>}
                Rebuild
              </Button>
            </LiveGate>
          </div>
        </>)}
      {alternatives.length > 0 && (<div data-testid="alternatives">
          <ul className="space-y-1 text-xs">
            {alternatives.map((a) => (<li key={a.id}>
                <Link href={`/scripts/${a.id}`} className="text-primary hover:underline">
                  <span className="font-mono">{a.id}</span> {modelLabel(a.model) || "default model"}
                  {a.voice ? `, ${a.voice}` : ""}
                </Link>{" "}
                <span className="text-muted-foreground">
                  {a.fails} fail{a.fails === 1 ? "" : "s"}, {a.warnings} warning{a.warnings === 1 ? "" : "s"}
                </span>
              </li>))}
          </ul>
          <Link href={`/scripts/compare?ids=${ids.join(",")}`} className="mt-1.5 inline-block text-xs font-medium text-primary hover:underline" data-testid="compare-alternatives">
            Compare side by side
          </Link>
        </div>)}
    </div>);
}
const PERSONS = [
    ["first", "1st person"],
    ["second", "2nd person"],
    ["third", "3rd person"],
] as const;
const TENSES = ["past", "present", "future"] as const;
export function ConvertVoice({ scriptId, person, tense, live }: {
    scriptId: string;
    person: string;
    tense: string;
    live: boolean;
}) {
    const [picked, setPicked] = useState<string[]>([]);
    const [pending, start] = useTransition();
    const [queued, setQueued] = useState(0);
    const toggle = (key: string) => setPicked((cur) => (cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key]));
    const run = () => start(async () => {
        const voices = picked.map((k) => ({ person: k.split("/")[0] as "first" | "second" | "third", tense: k.split("/")[1] as "past" | "present" | "future" }));
        const res = await transposeScriptAction(scriptId, voices);
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        setQueued(res.queued);
        setPicked([]);
        toast.success(`Converting into ${res.queued} voice${res.queued === 1 ? "" : "s"}. Each appears below in about a minute.`);
        window.dispatchEvent(new Event("ce:scripts-queued"));
    });
    return (<div className="space-y-2 border-t pt-3" data-testid="convert-voice">
      <div className="text-xs font-medium text-muted-foreground">Same script, another voice</div>
      <p className="text-xs text-muted-foreground">Keeps every line, claim and number, and changes only who is speaking and when. Each voice is a different ad to test.</p>
      <div className="grid grid-cols-3 gap-1">
        {PERSONS.flatMap(([p, label]) => TENSES.map((t) => {
            const key = `${p}/${t}`;
            const own = p === person && t === tense;
            const on = picked.includes(key);
            return (<button key={key} type="button" disabled={own} onClick={() => toggle(key)} aria-pressed={on} data-testid={`convert-${p}-${t}`} className={cn("rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted", own && "cursor-not-allowed opacity-50")}>
                {label.replace(" person", "")} {t}
                {own ? " (this)" : ""}
              </button>);
        }))}
      </div>
      <LiveGate live={live}>
        <Button size="sm" variant="outline" onClick={run} disabled={!live || pending || !picked.length} data-testid="convert-submit">
          {pending && <Loader2 className="size-3.5 animate-spin"/>}
          Convert{picked.length ? ` to ${picked.length}` : ""}
        </Button>
      </LiveGate>
      {queued > 0 && <p className="text-xs text-muted-foreground">{queued} on the way. They are listed above with the other versions of this script.</p>}
    </div>);
}
