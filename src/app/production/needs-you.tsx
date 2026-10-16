"use client";
import { ArrowRight } from "lucide-react";
import type { OutputJobRow } from "@/db/schema";
import { WAITING_LABEL, waitingForYou, type WaitingKind } from "@/lib/production/needs-you";
const chip = "inline-flex min-h-9 items-center gap-1.5 rounded-md border border-primary/50 bg-card px-3 py-1 text-sm font-semibold text-primary hover:border-primary hover:bg-primary/5 max-md:min-h-10";
export function NeedsYou({ jobs, onWalk }: {
    jobs: OutputJobRow[];
    onWalk: (kind: WaitingKind, ids: string[]) => void;
}) {
    const w = waitingForYou(jobs);
    if (!w.approve.length && !w.review.length)
        return null;
    return (<div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-xl border border-rule bg-card px-5 py-4 text-sm" data-testid="needs-you">
      <span className="display mr-1 text-xl">Waiting for you:</span>
      {w.approve.length > 0 && (<button type="button" className={chip} onClick={() => onWalk("approve", w.approve.map((j) => j.id))} data-testid="needs-you-approve">
          {w.approve.length} {WAITING_LABEL.approve} <ArrowRight className="size-4"/>
        </button>)}
      {w.review.length > 0 && (<button type="button" className={chip} onClick={() => onWalk("review", w.review.map((j) => j.id))} data-testid="needs-you-review">
          {w.review.length} {WAITING_LABEL.review} <ArrowRight className="size-4"/>
        </button>)}
      <span className="text-xs text-muted-foreground">A press opens the one that has waited longest. Next takes you through the rest.</span>
    </div>);
}
