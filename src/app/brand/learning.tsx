"use client";
import { useState, useTransition } from "react";
import { Check, Loader2, Plus, RefreshCw, RotateCcw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { tabNames } from "@/lib/brain/file-names";
import { cn } from "@/lib/utils";
import { addWinnerAction, applyLearningAction, dismissLearningAction, learnNowAction, restoreLearningAction, revertLearningAction, setAutoLearnAction } from "./brain-actions";
export interface LearnRow {
    subject: string;
    target: "works" | "avoid" | "ideas" | "questions";
    text: string;
    evidence: string[];
    source: "account" | "feedback" | "winner";
    simulated: boolean;
}
export interface LearnedRow extends LearnRow {
    status: "applied" | "dismissed" | "reverted";
    at: string;
    updates: number;
}
const TARGET: Record<LearnRow["target"], {
    label: string;
    tone: string;
}> = {
    works: { label: "Works", tone: "border-emerald-300 bg-emerald-50 text-emerald-800" },
    avoid: { label: "Avoid", tone: "border-red-300 bg-red-50 text-red-800" },
    ideas: { label: "Idea to try", tone: "border-sky-300 bg-sky-50 text-sky-800" },
    questions: { label: "Open question", tone: "border-amber-300 bg-amber-50 text-amber-800" },
};
const SOURCE: Record<LearnRow["source"], string> = { account: "the ad account", feedback: "your feedback", winner: "a winner you added" };
function useAct() {
    const [busy, start] = useTransition();
    const act = (fn: () => Promise<{
        ok: true;
    } | {
        ok: false;
        error: string;
    }>, said?: string) => start(async () => {
        const r = await fn();
        if (!r.ok)
            return void toast.error(r.error);
        if (said)
            toast.success(said);
    });
    return { busy, act };
}
function Chip({ target }: {
    target: LearnRow["target"];
}) {
    return <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium", TARGET[target].tone)}>{TARGET[target].label}</span>;
}
export function LearningCard({ auto, pending, learned, lastRun }: {
    auto: boolean;
    pending: LearnRow[];
    learned: LearnedRow[];
    lastRun: string | null;
}) {
    const { busy, act } = useAct();
    const [showAside, setShowAside] = useState(false);
    const applied = learned.filter((l) => l.status === "applied");
    const aside = learned.filter((l) => l.status !== "applied");
    return (<Card data-testid="brain-learning">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary"/>
          The brain keeps itself up to date
        </CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={auto} disabled={busy} onCheckedChange={(on) => act(() => setAutoLearnAction(on), on ? "The brain adds what it learns on its own." : "Each learning now waits for you.")} data-testid="learn-auto"/>
            Add what it learns on its own
          </label>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act(async () => { const r = await learnNowAction(); if (r.ok)
        toast.success(r.added + r.updated ? `${r.added} added, ${r.updated} updated.` : r.pending ? `${r.pending} waiting for you below.` : "Nothing new to learn."); return r; })} data-testid="learn-now">
            {busy ? <Loader2 className="size-4 animate-spin"/> : <RefreshCw className="size-4"/>}
            Check now
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <p className="max-w-4xl text-muted-foreground">
          It reads 3 things: the ad account (what returns more or less than the account&apos;s average, and what has never been tried), your feedback and verdicts, and the winners you add on the Winning ads tab. Each becomes 1 line in the brain, and the line is replaced when the numbers move. Every writer is sent the newest lines.
          {lastRun && <> Last checked {lastRun.slice(0, 10)}.</>}
        </p>

        <div data-testid="learn-pending">
          <h3 className="text-sm font-semibold">Waiting for you <span className="font-normal text-muted-foreground">({pending.length})</span></h3>
          {pending.length === 0 ? (<p className="mt-1 text-muted-foreground">Nothing is waiting.</p>) : (<ul className="mt-3 space-y-3">
              {pending.map((p) => (<li key={p.subject} className="rounded-lg border p-4" data-testid="learn-pending-row" data-subject={p.subject}>
                  <div className="flex flex-wrap items-start gap-2">
                    <Chip target={p.target}/>
                    <p className="min-w-0 flex-1 basis-64">{p.text}</p>
                    <div className="flex shrink-0 gap-1.5">
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => applyLearningAction(p.subject), "Added to the brain.")} data-testid="learn-apply">
                        <Check className="size-4"/>
                        Add to the brain
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => dismissLearningAction(p.subject), "Set aside.")} data-testid="learn-dismiss">
                        <X className="size-4"/>
                        Not this
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    From {SOURCE[p.source]}. {tabNames(p.evidence.join(" "))}
                  </p>
                  {p.simulated && <p className="mt-1 text-xs text-amber-800">This rests on a simulated account, so it is an example and is never added on its own.</p>}
                </li>))}
            </ul>)}
        </div>

        <div data-testid="learn-applied">
          <h3 className="text-sm font-semibold">In the brain <span className="font-normal text-muted-foreground">({applied.length})</span></h3>
          {applied.length === 0 ? (<p className="mt-1 text-muted-foreground">Nothing learned yet. It starts with the first feedback, the first verdict or the first winner.</p>) : (<ul className="mt-3 divide-y rounded-lg border">
              {applied.slice(0, 12).map((l) => (<li key={l.subject} className="flex flex-wrap items-start gap-2 p-4" data-testid="learn-applied-row" data-subject={l.subject}>
                  <Chip target={l.target}/>
                  <div className="min-w-0 flex-1 basis-64">
                    <p>{l.text}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {l.at.slice(0, 10)}, from {SOURCE[l.source]}
                      {l.simulated ? " (simulated)" : ""}
                      {l.updates > 0 ? `. Replaced ${l.updates} time${l.updates === 1 ? "" : "s"} as the numbers moved` : ""}.
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => revertLearningAction(l.subject), "Taken back out of the brain.")} data-testid="learn-revert">
                    <RotateCcw className="size-4"/>
                    Take it back
                  </Button>
                </li>))}
            </ul>)}
        </div>

        {aside.length > 0 && (<div data-testid="learn-aside">
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground hover:underline" onClick={() => setShowAside((s) => !s)}>
              {showAside ? "Hide" : "Show"} the {aside.length} set aside or taken back
            </button>
            {showAside && (<ul className="mt-2 space-y-1.5">
                {aside.map((l) => (<li key={l.subject} className="flex flex-wrap items-start gap-2 text-muted-foreground">
                    <span className="min-w-0 flex-1 basis-64">{l.text}</span>
                    <button type="button" className="text-xs hover:text-foreground hover:underline" disabled={busy} onClick={() => act(() => restoreLearningAction(l.subject), "It can come back at the next check.")} data-testid="learn-restore">
                      Let it come back
                    </button>
                  </li>))}
              </ul>)}
          </div>)}
      </CardContent>
    </Card>);
}
export function AddWinner({ kinds }: {
    kinds: readonly string[];
}) {
    const { busy, act } = useAct();
    const [open, setOpen] = useState(false);
    const empty = { kind: kinds[0], name: "", result: "", says: "", why: "", link: "" };
    const [w, setW] = useState(empty);
    const set = (k: keyof typeof empty) => (e: {
        target: {
            value: string;
        };
    }) => setW((cur) => ({ ...cur, [k]: e.target.value }));
    if (!open)
        return (<div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3 text-sm" data-testid="add-winner-closed">
        <p className="min-w-0 flex-1 basis-64 text-muted-foreground">Add what is working: your best ad, landing page, email or line, with how it did. The brain learns from each one.</p>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} data-testid="add-winner-open">
          <Plus className="size-4"/>
          Add what is working
        </Button>
      </div>);
    return (<div className="space-y-3 rounded-lg border border-dashed p-3" data-testid="add-winner">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="block text-xs text-muted-foreground">What it is</label>
          <select value={w.kind} onChange={set("kind")} className="h-9 w-full rounded-md border bg-background px-2 text-sm" data-testid="winner-kind">
            {kinds.map((k) => (<option key={k}>{k}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Its name</label>
          <Input value={w.name} onChange={set("name")} maxLength={100} placeholder="The veggie-gap UGC, the summer bundle page" data-testid="winner-name"/>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">How it did</label>
          <Input value={w.result} onChange={set("result")} maxLength={300} placeholder="ROAS 3.1 over 30 days, 41% open rate" data-testid="winner-result"/>
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground">What it says or shows</label>
        <Textarea value={w.says} onChange={set("says")} rows={3} maxLength={1500} placeholder="Paste its words, or describe what it shows" data-testid="winner-says"/>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="block text-xs text-muted-foreground">Why you think it works</label>
          <Input value={w.why} onChange={set("why")} maxLength={400} placeholder="It opens on the problem in the customer's own words" data-testid="winner-why"/>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Link (optional)</label>
          <Input value={w.link} onChange={set("link")} maxLength={300} placeholder="https://" data-testid="winner-link"/>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={busy || !w.name.trim() || !w.result.trim()} onClick={() => act(async () => { const r = await addWinnerAction(w); if (r.ok) {
        setW(empty);
        setOpen(false);
    } return r; }, "Added. The brain reads it at its next check.")} data-testid="winner-add">
          {busy && <Loader2 className="size-4 animate-spin"/>}
          Add it
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <span className="text-xs text-muted-foreground">With a result and a reason, it becomes a line under &ldquo;What we know works&rdquo;.</span>
      </div>
    </div>);
}
