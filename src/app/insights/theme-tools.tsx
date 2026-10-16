"use client";
import { pollWhileVisible } from "@/lib/visible-polling";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { TypePill } from "@/components/bits";
import { useAdvanced } from "@/components/mode";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ThemeRow } from "@/db/schema";
import { humanize } from "@/lib/taxonomy";
import { clusterAction } from "./actions";
type Status = {
    queue: {
        cluster: {
            queued: number;
            running: number;
        };
    };
    jobs: {
        ref: string;
        kind: string;
        status: string;
        error: string | null;
    }[];
};
const MOCK_NOTE = "Mock mode: clustering calls Claude. Set LLM_MODE=live in .env and restart to use it.";
const clusterCost = (insights: number) => Math.max(0.01, (0.15 * insights) / 700).toFixed(2);
export function ClusterControls({ unthemed, insightCount, live, clustering, }: {
    unthemed: number;
    insightCount: number;
    live: boolean;
    clustering: boolean;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(clustering);
    const [error, setError] = useState<string | null>(null);
    const [confirm, setConfirm] = useState(false);
    const [pending, start] = useTransition();
    const wasActive = useRef(clustering);
    const advanced = useAdvanced();
    useEffect(() => {
        if (!live)
            return;
        let stop = false;
        const poll = async () => {
            try {
                const s: Status = await fetch("/api/pipeline/status", { cache: "no-store" }).then((r) => r.json());
                if (stop)
                    return;
                const active = s.queue.cluster.queued + s.queue.cluster.running > 0;
                setBusy(active);
                const failed = s.jobs.filter((j) => j.kind === "cluster" && j.status === "failed").at(-1);
                if (!active)
                    setError(failed ? (failed.error ?? "Clustering failed.") : null);
                if (wasActive.current && !active)
                    router.refresh();
                wasActive.current = active;
            }
            catch {
            }
        };
        const stopPolling = pollWhileVisible(poll, busy ? 2500 : 10000, { immediate: true });
        return () => {
            stop = true;
            stopPolling();
        };
    }, [busy, live, router]);
    const run = (mode: "incremental" | "full") => start(async () => {
        const res = await clusterAction(mode);
        if (res.ok) {
            toast.success(mode === "full" ? "Re-clustering queued." : `Sorting ${unthemed} insights into themes.`);
            setError(null);
            setBusy(true);
            wasActive.current = true;
            setConfirm(false);
        }
        else
            toast.error(res.error);
    });
    const disabled = !live || busy || pending;
    const gate = (button: React.ReactNode) => live ? (button) : (<Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>{button}</span>
        </TooltipTrigger>
        <TooltipContent>{advanced ? MOCK_NOTE : "Not switched on for this account."}</TooltipContent>
      </Tooltip>);
    return (<div className="flex flex-wrap items-center gap-2" data-testid="cluster-controls">
      {busy && (<span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="cluster-progress">
          <Loader2 className="size-4 animate-spin"/>
          Clustering…
        </span>)}
      {error && !busy && (<span className="inline-flex max-w-md items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700" data-testid="cluster-error">
          <span className="truncate" title={error}>
            Clustering failed: {error}
          </span>
          <button aria-label="Dismiss" onClick={() => setError(null)}>
            <X className="size-3"/>
          </button>
        </span>)}
      {unthemed > 0 &&
            gate(<Button size="sm" onClick={() => run("incremental")} disabled={disabled} data-testid="cluster-incremental">
            Sort {unthemed} new insights into themes
          </Button>)}
      {advanced && gate(<Button size="sm" variant="outline" onClick={() => setConfirm(true)} disabled={disabled} data-testid="cluster-full">
          Re-cluster
        </Button>)}

      <Dialog open={advanced && confirm} onOpenChange={setConfirm}>
        <DialogContent data-testid="recluster-dialog">
          <DialogHeader>
            <DialogTitle>Re-cluster every theme?</DialogTitle>
            <DialogDescription>Claude regroups this brand&apos;s insights from scratch.</DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Unlocked themes are rebuilt: their labels, summaries and groupings can all change.</li>
            <li>Kept as they are: themes you edited (renamed, merged or split, marked &quot;Edited&quot;) and themes a concept or script uses as evidence.</li>
            <li>
              Runs on the fast model (Haiku). Cost: about ${clusterCost(insightCount)} for {insightCount} insights (roughly $0.15 per ~700).
            </li>
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={() => run("full")} disabled={disabled} data-testid="recluster-confirm">
              Re-cluster
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);
}
export function MergeDialog({ theme, themes, open, onOpenChange, onMerge, pending, }: {
    theme: ThemeRow;
    themes: ThemeRow[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onMerge: (ids: string[]) => void;
    pending: boolean;
}) {
    const [q, setQ] = useState("");
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const candidates = themes.filter((t) => t.type === theme.type && t.id !== theme.id);
    const shown = candidates.filter((t) => !q || `${t.label} ${t.summary}`.toLowerCase().includes(q.toLowerCase()));
    const chosen = candidates.filter((t) => picked.has(t.id)).map((t) => t.id);
    const toggle = (id: string) => setPicked((s) => {
        const n = new Set(s);
        if (n.has(id))
            n.delete(id);
        else
            n.add(id);
        return n;
    });
    return (<Dialog open={open} onOpenChange={(o) => {
            if (!o) {
                setQ("");
                setPicked(new Set());
            }
            onOpenChange(o);
        }}>
      <DialogContent data-testid="merge-dialog">
        <DialogHeader>
          <DialogTitle>Merge into &ldquo;{theme.label}&rdquo;</DialogTitle>
          <DialogDescription>
            Only <TypePill type={theme.type} className="align-middle"/> themes can merge. Their quotes move into this theme and they are deleted;
            concepts and scripts that cited them now cite this theme.
          </DialogDescription>
        </DialogHeader>
        <Input placeholder="Search themes" value={q} onChange={(e) => setQ(e.target.value)} data-testid="merge-search"/>
        <ul className="max-h-72 divide-y overflow-y-auto rounded-md border text-sm">
          {shown.map((t) => (<li key={t.id}>
              <label className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-muted/40" data-testid="merge-option" data-theme-id={t.id} data-type={t.type}>
                <Checkbox checked={picked.has(t.id)} onCheckedChange={() => toggle(t.id)}/>
                <span className="flex-1">
                  <span className="block font-medium">{t.label}</span>
                  <span className="text-xs text-muted-foreground">
                    Rank {t.rank} · {t.frequency} items
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{t.score.toFixed(1)}</span>
              </label>
            </li>))}
          {!shown.length && (<li className="px-3 py-4 text-center text-muted-foreground">
              {candidates.length ? "No match." : `No other ${humanize(theme.type)} themes to merge.`}
            </li>)}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onMerge(chosen)} disabled={!chosen.length || pending} data-testid="merge-submit">
            Merge into this theme{chosen.length > 1 ? ` (${chosen.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);
}
