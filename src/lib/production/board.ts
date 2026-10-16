import { JOB_STATUS_LABELS, type JobStatus } from "../taxonomy";
export interface BoardJob {
    status: JobStatus;
    output_type: string;
    production: {
        next?: string;
    } | null;
}
const BY_HAND: Partial<Record<JobStatus, JobStatus[]>> = {
    draft: ["sent"],
    in_review: ["approved", "rejected"],
    approved: ["sent", "in_review", "rejected"],
    rejected: ["in_review"],
    sent: ["approved"],
};
export type Verdict = {
    ok: true;
    run?: true;
    approve?: true;
} | {
    ok: false;
    why: string;
};
export type BoardColumn = JobStatus | "waiting";
export const BOARD_COLUMNS: BoardColumn[] = ["draft", "queued", "running", "waiting", "in_review", "approved", "rejected", "sent"];
export const COLUMN_LABELS: Record<BoardColumn, string> = { ...JOB_STATUS_LABELS, waiting: "Waiting for approval" };
export const RUN_COLUMNS: BoardColumn[] = ["queued", "running"];
const no = (why: string): Verdict => ({ ok: false, why });
const isBrief = (job: BoardJob) => job.output_type.startsWith("human_brief");
const unfinished = (job: BoardJob) => !!job.production && job.production.next !== "done";
const approval = (job: BoardJob) => !!job.production?.next?.startsWith("approve:");
export const hasStepToRun = (job: BoardJob) => unfinished(job) && !approval(job);
export const columnOf = (job: BoardJob): BoardColumn => (job.status === "in_review" && approval(job) ? "waiting" : job.status);
export function handMove(job: BoardJob, to: BoardColumn, busy: boolean): Verdict {
    if (to === columnOf(job))
        return no("It is already here.");
    if (busy)
        return no("The app is working on this job. It moves on its own when the step finishes.");
    if (to === "waiting")
        return no("A job comes here on its own, when it has something for you to approve.");
    if (columnOf(job) === "waiting") {
        if (to === "queued")
            return { ok: true, approve: true };
        if (to === "running")
            return { ok: true, approve: true, run: true };
        if (to === "rejected")
            return { ok: true };
        if (to === "in_review")
            return no("It moves to In review on its own, when its last step has run.");
        return no("This job still has steps to run. Approve what it waits for first: drop it on Queued.");
    }
    if (RUN_COLUMNS.includes(to)) {
        if (hasStepToRun(job))
            return { ok: true, run: true };
        if (approval(job))
            return no("This job waits for you to approve its last step. Open it, look, then approve: after that it can be run from here.");
        return no(job.production ? "Every step of this job has run. There is nothing left to run." : "The app puts a job here while it makes a step. This job has no step to run.");
    }
    if (job.status === "queued" || job.status === "running")
        return no(hasStepToRun(job) ? `This job is part-way through its steps. Drop it on ${job.status === "queued" ? "Running" : "Queued"} to run the next one.` : "This job is part-way through its steps. Open it to see what it waits for.");
    if (to === "draft")
        return no("A job does not go back to draft.");
    if (job.status === "draft" && !isBrief(job))
        return no("This job has steps to run first. Open it to see the next one.");
    if (!BY_HAND[job.status]?.includes(to)) {
        if (to === "sent")
            return no("Approve it first, then mark it as sent.");
        if (to === "approved")
            return no("Move it back to review first.");
        return no(`A job in ${JOB_STATUS_LABELS[job.status]} can't go straight to ${JOB_STATUS_LABELS[to]}.`);
    }
    if (to === "approved" && job.status === "in_review" && unfinished(job))
        return no("This job still has steps to run before it can be approved. Open it to see the next one.");
    return { ok: true };
}
export function handTargets(job: BoardJob, busy: boolean): {
    to: BoardColumn[];
    why: string;
} {
    const to = BOARD_COLUMNS.filter((s) => handMove(job, s, busy).ok);
    if (to.length)
        return { to, why: "" };
    const v = handMove(job, job.status === "approved" ? "sent" : "approved", busy);
    return { to, why: v.ok ? "" : v.why };
}
