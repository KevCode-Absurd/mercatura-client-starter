import Link from "next/link";
import { PageHeader } from "@/components/bits";
import { stepRows, type StepRow } from "@/lib/inspect/calls";
import { openNotes } from "@/lib/inspect/notes";
import { cn } from "@/lib/utils";
import { InspectTabs, Share, cents, num, r, td, th, when } from "./ui";
export const dynamic = "force-dynamic";
export default function InspectPage() {
    const rows = stepRows();
    const open = openNotes();
    const areas = new Map<string, StepRow[]>();
    for (const row of rows) {
        const area = row.step?.area ?? (row.shares ? "Shares another step's settings" : "In the log, not in the step table");
        areas.set(area, [...(areas.get(area) ?? []), row]);
    }
    const ran = rows.filter((x) => x.calls);
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader title="Inspect" subtitle="What every step is sent and what comes back, read from the log of real calls. Open a step for its record block by block, or a call for its exact words. Averages are over each step's 20 most recent good calls."/>
      <InspectTabs at="/inspect" open={open.open}/>
      <div className="space-y-10 px-6 py-8">
        <p className="text-sm text-muted-foreground" data-testid="inspect-summary">
          {rows.length} steps, {ran.length} of them run at least once. {num(rows.reduce((n, x) => n + x.calls, 0))} calls in the log, {num(rows.reduce((n, x) => n + x.failed, 0))} of them failed.
        </p>
        {[...areas.entries()].map(([area, list]) => (<section key={area}>
            <h2 className="mb-3 text-lg font-semibold">{area}</h2>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full" data-testid="inspect-steps">
                <thead>
                  <tr>
                    <th className={th}>Step</th>
                    <th className={th}>Runs on</th>
                    <th className={cn(th, r)}>Calls</th>
                    <th className={cn(th, r)}>Failed</th>
                    <th className={cn(th, r)}>Sent</th>
                    <th className={th}>From cache</th>
                    <th className={cn(th, r)}>Out</th>
                    <th className={th}>Thinking</th>
                    <th className={cn(th, r)}>Each</th>
                    <th className={cn(th, r)}>Seconds</th>
                    <th className={th}>Last run</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((x) => (<tr key={x.task} data-testid="inspect-step">
                      <td className={td}>
                        <Link href={`/inspect/step/${x.task}`} className="font-medium text-primary hover:underline">
                          {x.step?.label ?? x.task.replace(/_/g, " ")}
                        </Link>
                        {open.byTask.get(x.task) ? <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-xs font-medium tabular-nums text-amber-800" title="Open notes on this step">{open.byTask.get(x.task)}</span> : null}
                        <div className="font-mono text-xs text-muted-foreground">
                          {x.task}
                          {x.shares ? ` (settings of ${x.shares})` : ""}
                        </div>
                      </td>
                      <td className={cn(td, "font-mono")}>{x.model ?? "-"}</td>
                      <td className={cn(td, r)}>{x.calls}</td>
                      <td className={cn(td, r, x.failed ? "text-red-700" : "text-muted-foreground")}>{x.failed}</td>
                      <td className={cn(td, r)}>{x.recent ? num(x.sent) : "-"}</td>
                      <td className={td}>{x.recent ? <Share part={x.cached} whole={x.sent} title={`${num(x.cached)} of ${num(x.sent)} tokens read from cache`}/> : "-"}</td>
                      <td className={cn(td, r)}>{x.recent ? num(x.out) : "-"}</td>
                      <td className={td}>{x.recent ? <Share part={x.thinking} whole={x.out} color="color-mix(in oklab, var(--primary) 45%, white)" title={`About ${num(x.thinking)} of ${num(x.out)} billed output tokens were the model's own thinking, not the answer`}/> : "-"}</td>
                      <td className={cn(td, r)}>{x.recent ? cents(x.cents) : "-"}</td>
                      <td className={cn(td, r)}>{x.recent ? x.seconds.toFixed(1) : "-"}</td>
                      <td className={cn(td, "whitespace-nowrap text-muted-foreground")}>{when(x.last)}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </section>))}
      </div>
    </div>);
}
