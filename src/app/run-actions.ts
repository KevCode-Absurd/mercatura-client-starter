"use server";
import { revalidatePath } from "next/cache";
import { smallJobIds } from "@/lib/jobs/activity";
import { requestStop, resumeJob, type StopMode } from "@/lib/llm/run-control";
export async function controlJobAction(jobId: string, what: StopMode | "resume"): Promise<{
    ok: boolean;
}> {
    const ok = what === "resume" ? resumeJob(jobId) : requestStop(jobId, what);
    revalidatePath("/", "layout");
    return { ok };
}
export async function stopSmallJobsAction(): Promise<{
    ok: boolean;
}> {
    for (const id of smallJobIds())
        requestStop(id, "stop");
    revalidatePath("/", "layout");
    return { ok: true };
}
