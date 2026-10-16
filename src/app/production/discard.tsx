"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAdvanced } from "@/components/mode";
import type { OutputJobRow } from "@/db/schema";
import { COLUMN_LABELS, type BoardColumn } from "@/lib/production/board";
import { homeColumn, type BoardVerdict } from "@/lib/production/board-discard";
import { discardJobAction, putBackJobAction } from "./discard-actions";
import { dragHelp, dragHelpPlain } from "./run-on-drop";
export const BOARD_HELP = "Drag a card to another column to move it. Drop it on Queued or Running to run its next step. Approve what waits for you in its own column. Drop what you do not want at all on Discarded.";
export function boardHelp(job: OutputJobRow, targets: {
    to: BoardColumn[];
    why: string;
}, refused: BoardVerdict | null, advanced: boolean): string {
    const base = advanced ? dragHelp : dragHelpPlain;
    const card = advanced ? job.id : "this card";
    const not = refused && !refused.ok ? `Not here. ${refused.why} ` : "";
    if (!targets.to.length)
        return base(job, targets, refused);
    if (job.status === "discarded")
        return `${not}Drop ${card} on ${COLUMN_LABELS[homeColumn(job)]} to put it back where it was.`;
    if (!targets.to.includes("discarded"))
        return base(job, targets, refused);
    const rest = targets.to.filter((s) => s !== "discarded");
    if (!rest.length)
        return `${not}Drop ${card} on Discarded if you do not want it at all. It is kept there, and can be put back.`;
    return `${base(job, { to: rest, why: targets.why }, refused)} Or on Discarded, if you do not want it at all.`;
}
export function DiscardButton({ job, locked, onDone }: {
    job: OutputJobRow;
    locked: boolean;
    onDone: () => void;
}) {
    const router = useRouter();
    const [pending, begin] = useTransition();
    const advanced = useAdvanced();
    const discarded = job.status === "discarded";
    const go = () => begin(async () => {
        const res = await (discarded ? putBackJobAction(job.id) : discardJobAction(job.id));
        if (!res.ok)
            return void toast.error(res.error);
        toast.success(discarded ? (advanced ? `${job.id} put back in ${res.label}` : `Put back in ${res.label}`) : advanced ? `${job.id} moved to ${res.label}` : `Moved to ${res.label}`);
        onDone();
        router.refresh();
    });
    return (<Button variant={discarded ? "default" : "ghost"} onClick={go} disabled={locked || pending} title={discarded ? `Back to ${COLUMN_LABELS[homeColumn(job)]}, where it was` : "You do not want this one. It is kept in Discarded and can be put back."} data-testid={discarded ? "job-put-back" : "job-discard"}>
      {pending ? <Loader2 className="size-4 animate-spin"/> : discarded ? <Undo2 className="size-4"/> : <Archive className="size-4"/>}
      {discarded ? "Put back" : "Discard"}
    </Button>);
}
