import { JOB_STATUSES, type JobStatus } from "../taxonomy";
import { BOARD_COLUMNS as COLUMNS_BEFORE, COLUMN_LABELS, columnOf, handMove as moveBefore, handTargets as targetsBefore, hasStepToRun, type BoardColumn, type BoardJob, type Verdict } from "./board";
export interface DiscardJob extends BoardJob {
    payload?: {
        discarded_from?: unknown;
    } | null;
}
export type BoardVerdict = Verdict & {
    putBack?: true;
};
export const BOARD_COLUMNS: BoardColumn[] = [...COLUMNS_BEFORE, "discarded"];
const no = (why: string): BoardVerdict => ({ ok: false, why });
export const rememberedStatus = (job: DiscardJob): JobStatus => (job.status === "running" ? "queued" : job.status);
export function discardedFrom(job: DiscardJob): JobStatus {
    const was = job.payload?.discarded_from;
    if (typeof was === "string" && was !== "discarded" && (JOB_STATUSES as readonly string[]).includes(was))
        return was as JobStatus;
    return hasStepToRun(job) ? "queued" : "in_review";
}
export const homeColumn = (job: DiscardJob): BoardColumn => columnOf({ ...job, status: discardedFrom(job) });
export function handMove(job: DiscardJob, to: BoardColumn, busy: boolean): BoardVerdict {
    if (job.status === "discarded") {
        if (to === "discarded")
            return no("It is already here.");
        if (busy)
            return no("The app is working on this job. It moves on its own when the step finishes.");
        const home = homeColumn(job);
        return to === home ? { ok: true, putBack: true } : no(`It was discarded from ${COLUMN_LABELS[home]}. Drop it there to put it back.`);
    }
    if (to === "discarded")
        return busy ? no("The app is working on this job. It can be discarded when the step finishes.") : { ok: true };
    return moveBefore(job, to, busy);
}
export function handTargets(job: DiscardJob, busy: boolean): {
    to: BoardColumn[];
    why: string;
} {
    const to = BOARD_COLUMNS.filter((s) => handMove(job, s, busy).ok);
    return to.length ? { to, why: "" } : targetsBefore(job, busy);
}
