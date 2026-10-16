"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdvanced } from "@/components/mode";
import type { OutputJobRow, ProductionState } from "@/db/schema";
import { approveStageAction } from "./actions";
import { STAGE_THING, flowOf, planApprovalBlockers, runLabel, stepCost, type StageId } from "./shared";
export const waitsFor = (p: ProductionState | null): string => (p?.next.startsWith("approve:") ? (STAGE_THING[p.next.slice(8) as StageId] ?? "its last step") : "its last step");
export function afterApproval(p: ProductionState | null): {
    step: string;
    verb: string;
    cost: string;
} | null {
    if (!p || !p.next.startsWith("approve:"))
        return null;
    const flow = flowOf(p);
    const step = flow[flow.indexOf(p.next.slice(8) as StageId) + 1];
    if (!step)
        return null;
    return { step, verb: runLabel(step), cost: stepCost({ ...p, next: step }) };
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export function ApproveHere({ job }: {
    job: OutputJobRow;
}) {
    const router = useRouter();
    const [pending, begin] = useTransition();
    const advanced = useAdvanced();
    const thing = waitsFor(job.production);
    const blocked = planApprovalBlockers(job.production).length > 0;
    const flagged = job.production?.next === "approve:plan" && job.production.audit.some((a) => a.status === "fail");
    const next = afterApproval(job.production);
    const approve = () => begin(async () => {
        const res = await approveStageAction(job.id);
        if (!res.ok)
            return void toast.error(res.error);
        if (job.production?.workflow)
            toast.success(`${cap(thing)} approved. The next step starts automatically.`);
        else if (!advanced)
            toast.success(next ? `${cap(thing)} approved. The card is in Queued: drop it on Running to ${next.verb.charAt(0).toLowerCase()}${next.verb.slice(1)}.` : `${cap(thing)} approved.`, { duration: 8000 });
        else
            toast.success(next ? `${cap(thing)} approved. ${job.id} is in Queued: drop it on Running to ${next.verb.charAt(0).toLowerCase()}${next.verb.slice(1)} (${next.cost}).` : `${cap(thing)} approved.`, { duration: 8000 });
        router.refresh();
    });
    return (<button type="button" onClick={approve} disabled={pending || blocked} title={blocked ? "Edit or regenerate the plan to fix its clip requirements before approving. Click the card to review them." : `Approve ${thing} as the human reviewer, accepting any failed editorial findings. Click the card to review them first.`} className="mt-1.5 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md border border-primary/40 bg-card px-2 py-1.5 text-xs font-semibold text-primary hover:border-primary hover:bg-primary/5 disabled:opacity-60 max-md:min-h-10" data-testid="approve-here" data-approves={job.id}>
      {pending ? <Loader2 className="size-3.5 animate-spin"/> : <Check className="size-3.5"/>}
      {blocked ? "Fix clip requirements first" : <>{flagged ? "Override checks and approve" : "Approve"} {thing}{job.production?.workflow ? " and continue" : ""}</>}
    </button>);
}
