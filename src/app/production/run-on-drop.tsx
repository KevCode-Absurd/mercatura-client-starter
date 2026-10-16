"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdvanced } from "@/components/mode";
import type { OutputJobRow } from "@/db/schema";
import { COLUMN_LABELS, RUN_COLUMNS, columnOf, type BoardColumn, type Verdict } from "@/lib/production/board";
import { OUTPUT_INFO } from "@/lib/taxonomy";
import { approveStageAction, runStepAction } from "./actions";
import { afterApproval, waitsFor } from "./approve-here";
import { runLabel, stepCost } from "./shared";
const or = (ss: BoardColumn[]) => ss.map((s) => COLUMN_LABELS[s]).join(" or ");
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
export function costLine(cost: string): string {
    if (cost === "free")
        return "This step is free.";
    if (/image/.test(cost))
        return `This step makes ${cost}, counted against the image cap.`;
    return `This step costs ${cost}.`;
}
export function dragHelp(job: OutputJobRow, targets: {
    to: BoardColumn[];
    why: string;
}, refused: Verdict | null): string {
    if (!targets.to.length)
        return `${job.id} can't be moved by hand. ${targets.why}`;
    const not = refused && !refused.ok ? `Not here. ${refused.why} ` : "";
    if (columnOf(job) === "waiting") {
        const next = afterApproval(job.production);
        return `${not}Drop ${job.id} on Queued to approve ${waitsFor(job.production)}${next ? `, or on Running to approve it and ${lower(next.verb)} (${next.cost}): you are asked before it starts` : ""}. Or drop it on Rejected.`;
    }
    const moves = targets.to.filter((s) => !RUN_COLUMNS.includes(s));
    const runs = targets.to.filter((s) => RUN_COLUMNS.includes(s));
    const next = job.production?.next ?? "";
    const where = [moves.length ? `Drop ${job.id} on ${or(moves)}.` : "", runs.length ? `${moves.length ? "Or drop it" : `Drop ${job.id}`} on ${or(runs)} to run its next step: ${lower(runLabel(next))} (${job.production ? stepCost(job.production) : "free"}). You are asked before it starts.` : ""].filter(Boolean).join(" ");
    return `${not}${where}`;
}
export function dragHelpPlain(job: OutputJobRow, targets: {
    to: BoardColumn[];
    why: string;
}, refused: Verdict | null): string {
    if (!targets.to.length)
        return `This card can't be moved by hand. ${targets.why}`;
    const not = refused && !refused.ok ? `Not here. ${refused.why} ` : "";
    if (columnOf(job) === "waiting") {
        const next = afterApproval(job.production);
        return `${not}Drop this card on Queued to approve ${waitsFor(job.production)}${next ? `, or on Running to approve it and ${lower(next.verb)}: you are asked before it starts` : ""}. Or drop it on Rejected.`;
    }
    const moves = targets.to.filter((s) => !RUN_COLUMNS.includes(s));
    const runs = targets.to.filter((s) => RUN_COLUMNS.includes(s));
    const next = job.production?.next ?? "";
    const where = [moves.length ? `Drop this card on ${or(moves)}.` : "", runs.length ? `${moves.length ? "Or drop it" : "Drop this card"} on ${or(runs)} to run its next step: ${lower(runLabel(next))}. You are asked before it starts.` : ""].filter(Boolean).join(" ");
    return `${not}${where}`;
}
export function RunOnDrop({ job, title, approve = false, onClose, onStarted }: {
    job: OutputJobRow;
    title: string;
    approve?: boolean;
    onClose: () => void;
    onStarted: () => void;
}) {
    const router = useRouter();
    const [pending, begin] = useTransition();
    const advanced = useAdvanced();
    const after = approve ? afterApproval(job.production) : null;
    const step = after ? after.verb : runLabel(job.production?.next ?? "");
    const cost = after ? after.cost : job.production ? stepCost(job.production) : "free";
    const run = () => begin(async () => {
        const res = approve ? await approveStageAction(job.id, { run: true }) : await runStepAction(job.id);
        if (!res.ok) {
            toast.error(res.error);
            onClose();
            return;
        }
        toast.success(advanced ? `${job.id}: started. ${step}.` : `Started. ${step}.`);
        onStarted();
        onClose();
        router.refresh();
    });
    return (<Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent data-testid="run-on-drop" data-job-id={job.id}>
        <DialogHeader>
          <DialogTitle>{approve ? `Approve ${waitsFor(job.production)} and ${lower(step)}?` : `${step}?`}</DialogTitle>
          {advanced ? (<DialogDescription>
            {OUTPUT_INFO[job.output_type].label} · {job.id} · {title}
          </DialogDescription>) : (<DialogDescription>
              {OUTPUT_INFO[job.output_type].label} · {title}
            </DialogDescription>)}
        </DialogHeader>
        {advanced ? (<p className="text-sm" data-testid="run-cost">
          {approve ? `${waitsFor(job.production).charAt(0).toUpperCase()}${waitsFor(job.production).slice(1)} is approved as it stands. ` : ""}
          {costLine(cost)} It runs in the background and the card moves on its own when it is done.
        </p>) : (<p className="text-sm">
            {approve ? `${waitsFor(job.production).charAt(0).toUpperCase()}${waitsFor(job.production).slice(1)} is approved as it stands. ` : ""}
            It runs in the background and the card moves on its own when it is done.
          </p>)}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending} data-testid="run-cancel">
            Not now
          </Button>
          <Button onClick={run} disabled={pending} data-testid="run-confirm" autoFocus>
            {pending ? <Loader2 className="size-4 animate-spin"/> : <Play className="size-4"/>}
            {approve ? "Approve and run" : "Run it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);
}
