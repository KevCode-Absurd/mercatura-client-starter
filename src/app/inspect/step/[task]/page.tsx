import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/bits";
import { stepRecord } from "@/lib/inspect/calls";
import { stepNotes } from "@/lib/inspect/notes";
import { cn } from "@/lib/utils";
import { BlockActions } from "../../block-actions";
import { NoteBox, NoteItem } from "../../note-box";
import { FileLink, Share, Stat, cents, num, pct, r, td, th, when } from "../../ui";
export const dynamic = "force-dynamic";
export default async function StepPage({ params }: {
    params: Promise<{
        task: string;
    }>;
}) {
    const { task } = await params;
    if (!/^[a-z_]+$/.test(task))
        notFound();
    const rec = stepRecord(task);
    if (!rec.totalCalls && !rec.step)
        notFound();
    const rcm = rec.recommended;
    const notes = stepNotes(task);
    const onCalls = notes.filter((n) => n.kind === "call" || n.kind === "answer");
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: "/inspect", label: "All steps" }} title={rec.step?.label ?? task.replace(/_/g, " ")} subtitle={rec.step ? rec.step.makes : "This step is in the call log but not in the step table, so it has no entry in Settings."}/>
      <div className="space-y-10 px-6 py-8">
        {rec.step && (<section className="grid gap-3 text-sm md:grid-cols-2" data-testid="step-about">
            <div className="rounded-lg border p-3">
              <div className="text-xs font-medium text-muted-foreground">What it is meant to be sent</div>
              <p className="mt-1">{rec.step.sent}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs font-medium text-muted-foreground">What it runs on, and why</div>
              <p className="mt-1">
                <span className="font-mono text-xs">{rcm?.model}</span>
                {rcm?.effort ? `, ${rcm.effort} effort` : ""}
                {rcm?.context ? `, ${rcm.context} context` : ""} is the recommended setting. {rec.step.why}
              </p>
              <Link href="/settings" className="mt-1 inline-block text-xs text-primary hover:underline">
                Change the model, effort or context in Settings
              </Link>
            </div>
          </section>)}

        <section data-testid="step-notes">
          <NoteBox target={{ kind: "step", task }} notes={notes.filter((n) => n.kind === "step")} label="Feedback on this step as a whole" placeholder="What this step gets wrong, or what it should do differently"/>
        </section>

        {rec.read === 0 ? (<p className="text-sm text-muted-foreground">No good call of this step is in the log yet, so there is nothing to measure.</p>) : (<>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="step-numbers">
              <Stat label={`Sent, average of ${rec.read} calls`} value={`${num(rec.sent)} tokens`} note={<Share part={rec.cached} whole={rec.sent} title="Read from cache"/>}/>
              <Stat label="Billed output" value={`${num(rec.out)} tokens`} note={`about ${num(rec.answer)} the answer, ${num(rec.thinking)} thinking`}/>
              <Stat label="Cost of 1 call" value={cents(rec.cents)}/>
              <Stat label="Time" value={`${rec.seconds.toFixed(1)} s`}/>
              <Stat label="Failed, all time" value={`${rec.totalFailed} of ${rec.totalCalls}`} note={rec.models.map((m) => `${m.model} (${m.calls})`).join(", ")}/>
            </section>

            <section>
              <h2 className="mb-1 text-sm font-medium">What goes in, block by block</h2>
              <p className="mb-2 max-w-3xl text-xs text-muted-foreground">Each prompt is cut at its tags and its headings. Tokens are the provider&apos;s count for the whole call, shared out by length. A block that is not in every call is this step&apos;s own to 1 piece of work (a format, a reference, a note). A block that comes from a file is changed in that file; what the app builds is changed on the brand&apos;s own screens. Feedback is kept on the Notes tab.</p>
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full" data-testid="step-blocks">
                  <thead>
                    <tr>
                      <th className={th}>Part</th>
                      <th className={th}>Block</th>
                      <th className={cn(th, r)}>Tokens</th>
                      <th className={cn(th, r)}>Share</th>
                      <th className={cn(th, r)}>In calls</th>
                      <th className={th}>Comes from</th>
                      <th className={th}>Change it</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rec.blocks.map((b) => (<tr key={`${b.where}${b.label}`} data-testid="step-block">
                        <td className={cn(td, "text-muted-foreground")}>{b.where}</td>
                        <td className={td}>
                          <span className="font-medium">{b.label}</span>
                          {b.parts.length > 0 && <div className="mt-0.5 max-w-xl text-xs text-muted-foreground">{b.parts.slice(0, 8).join(" · ")}{b.parts.length > 8 ? " …" : ""}</div>}
                        </td>
                        <td className={cn(td, r)}>{num(b.tokens)}</td>
                        <td className={cn(td, r)}>{pct(b.tokens, rec.sent)}</td>
                        <td className={cn(td, r, b.inCalls < rec.read && "text-amber-700")}>
                          {b.inCalls} of {rec.read}
                        </td>
                        <td className={td}>
                          {b.files.length ? (<div className="flex flex-col gap-0.5">
                              {b.files.slice(0, 6).map((f) => (<FileLink key={f} path={f} className="text-xs"/>))}
                              {b.files.length > 6 && <span className="text-xs text-muted-foreground">and {b.files.length - 6} more</span>}
                            </div>) : (<span className="text-muted-foreground">built by the app (brand, research, the work itself)</span>)}
                        </td>
                        <td className={td}>
                          <BlockActions task={task} part={b.where} label={b.label} kind={b.kind} files={b.files} notes={notes}/>
                        </td>
                      </tr>))}
                  </tbody>
                </table>
              </div>
            </section>
          </>)}

        {rec.failures.length > 0 && (<section>
            <h2 className="mb-3 text-lg font-semibold">How it has failed</h2>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full" data-testid="step-failures">
                <thead>
                  <tr>
                    <th className={th}>Kind</th>
                    <th className={th}>What the log says</th>
                    <th className={cn(th, r)}>Calls</th>
                    <th className={th}>Last</th>
                  </tr>
                </thead>
                <tbody>
                  {rec.failures.map((f, i) => (<tr key={i}>
                      <td className={cn(td, "text-red-700")}>{f.status}</td>
                      <td className={td}>{f.error || "no message kept"}</td>
                      <td className={cn(td, r)}>{f.calls}</td>
                      <td className={cn(td, "whitespace-nowrap text-muted-foreground")}>{when(f.last)}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </section>)}

        {onCalls.length > 0 && (<section>
            <h2 className="mb-3 text-lg font-semibold">What was said about its calls and answers</h2>
            <ul className="max-w-3xl space-y-1">
              {onCalls.map((n) => (<NoteItem key={n.id} note={n}>
                  <Link href={`/inspect/call/${n.callId}`} className="mb-1 block text-xs text-primary hover:underline">
                    {n.kind === "answer" ? "On the answer of a call" : "On a call"}
                  </Link>
                </NoteItem>))}
            </ul>
          </section>)}

        {rec.calls.length > 0 && (<section>
            <h2 className="mb-3 text-lg font-semibold">The latest calls: open one for its exact words</h2>
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full" data-testid="step-calls">
                <thead>
                  <tr>
                    <th className={th}>When</th>
                    <th className={th}>For</th>
                    <th className={th}>Model</th>
                    <th className={cn(th, r)}>Sent</th>
                    <th className={cn(th, r)}>From cache</th>
                    <th className={cn(th, r)}>Out</th>
                    <th className={cn(th, r)}>Seconds</th>
                    <th className={cn(th, r)}>Cost</th>
                    <th className={th}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rec.calls.map((c) => (<tr key={c.id} className={c.status === "ok" ? "" : "bg-red-50/60"}>
                      <td className={cn(td, "whitespace-nowrap")}>
                        <Link href={`/inspect/call/${c.id}`} className="text-primary hover:underline">
                          {when(c.at)}
                        </Link>
                      </td>
                      <td className={cn(td, "font-mono text-xs")}>{c.ref || "-"}</td>
                      <td className={cn(td, "font-mono")}>{c.model}</td>
                      <td className={cn(td, r)}>{num(c.sent)}</td>
                      <td className={cn(td, r)}>{num(c.cached)}</td>
                      <td className={cn(td, r)}>{num(c.out)}</td>
                      <td className={cn(td, r)}>{c.seconds.toFixed(1)}</td>
                      <td className={cn(td, r)}>{cents(c.usd * 100)}</td>
                      <td className={cn(td, c.status === "ok" ? "text-muted-foreground" : "text-red-700")}>
                        {c.status}
                        {c.attempt > 1 ? `, attempt ${c.attempt}` : ""}
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </section>)}
      </div>
    </div>);
}
