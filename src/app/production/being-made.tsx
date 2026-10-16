import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { WorkingMark } from "@/components/working";
import { formatById } from "@/lib/catalogue";
import { NOTICE_LASTS_MS, arrived, type JobSeen } from "@/lib/production/arrive";
import { pastTimeLine, type StepTime } from "@/lib/jobs/past-time";
export function BeingMade({ making, at, jobs, now, scriptTime }: {
    making: string | undefined;
    at: string | undefined;
    jobs: JobSeen[];
    now: number;
    scriptTime?: StepTime;
}) {
    const format = making ? formatById(making) : undefined;
    const when = Number(at);
    if (!format || format.start.how !== "script" || !Number.isFinite(when) || now - when > NOTICE_LASTS_MS)
        return null;
    const job = arrived(jobs, format.start.type, when);
    const label = format.label;
    return (<div className="mx-6 mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm" data-testid="being-made" data-state={job ? "ready" : "writing"} role="status">
      {job ? <CheckCircle2 className="size-5 shrink-0 text-primary"/> : <WorkingMark job="write" className="size-10 text-primary"/>}
      <div className="min-w-0 flex-1">
        {job ? (<>
            <p className="font-semibold">Your {label} is on the board.</p>
            <p className="text-muted-foreground">Its script is written and its plan is next. Nothing is made until you approve the plan.</p>
          </>) : (<>
            <p className="font-semibold">Your {label} is being written.</p>
            <p className="text-muted-foreground">The script comes first: {pastTimeLine(scriptTime)}. Its card then appears here by itself, with a plan for you to approve. You can leave this screen: the bar at the bottom shows it while it runs.</p>
          </>)}
      </div>
      {job && (<Link href={`/production?job=${job.id}`} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90" data-testid="being-made-open">
          Open it <ArrowRight className="size-4"/>
        </Link>)}
    </div>);
}
