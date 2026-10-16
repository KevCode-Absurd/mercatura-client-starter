import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/bits";
import { getCall } from "@/lib/inspect/calls";
import { callNotes } from "@/lib/inspect/notes";
import { cn } from "@/lib/utils";
import { BlockActions } from "../../block-actions";
import { NoteBox } from "../../note-box";
import { FileLink, Pre, Share, Stat, cents, num, pct, r, td, th, when } from "../../ui";
export const dynamic = "force-dynamic";
const isImage = (p: string) => /\.(png|jpe?g|webp)$/i.test(p);
export default async function CallPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const c = getCall(decodeURIComponent(id));
    if (!c)
        notFound();
    const notes = callNotes(c.id, c.kind === "text" ? c.task : null);
    if (c.kind === "media") {
        const asset = c.output ? `/api/${c.output.split("/").map(encodeURIComponent).join("/")}` : null;
        return (<div className="mx-auto w-full max-w-[80rem]">
        <PageHeader back={{ href: "/costs", label: "Costs" }} title={`${c.media === "image" ? "Image" : "Clip"}: ${c.purpose}`} subtitle={`${c.model} through ${c.provider}, ${when(c.at)}${c.jobId ? `, for ${c.jobId}` : ""}.`}/>
        <div className="space-y-10 px-6 py-8">
          <section className="grid gap-3 sm:grid-cols-4">
            <Stat label="Result" value={c.status} note={c.error ?? undefined}/>
            <Stat label="Cost" value={cents(c.usd * 100)}/>
            <Stat label="Time" value={`${c.seconds.toFixed(1)} s`}/>
            <Stat label="Prompt" value={`${num(c.prompt.length)} characters`}/>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold">What was attached and asked for</h2>
            <Pre>{JSON.stringify(c.request, null, 2)}</Pre>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold">The prompt, as sent</h2>
            <Pre>{c.prompt}</Pre>
          </section>
          {asset && (<section>
              <h2 className="mb-3 text-lg font-semibold">What came back</h2>
              {isImage(c.output!) ? (<img src={`${asset}?w=640`} alt={c.purpose} className="max-h-[36rem] border"/>) : (<video src={asset} controls className="max-h-[36rem] border"/>)}
              <p className="mt-1 text-xs text-muted-foreground">The file on disk now. A later attempt saved under the same name replaces it.</p>
            </section>)}
          <section data-testid="call-notes">
            <NoteBox target={{ kind: "media", callId: c.id }} notes={notes} label={`Feedback on this ${c.media === "image" ? "image" : "clip"} or its prompt`} open placeholder="What is wrong with the result, or with what was asked for"/>
          </section>
        </div>
      </div>);
    }
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: `/inspect/step/${c.task}`, label: "The step" }} title={`${c.task.replace(/_/g, " ")}, 1 call`} subtitle={`${c.model}, ${when(c.at)}${c.refId ? `, for ${c.refType} ${c.refId}` : ""}${c.attempt > 1 ? `, attempt ${c.attempt}` : ""}.`}/>
      <div className="space-y-10 px-6 py-8">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="call-numbers">
          <Stat label="Sent" value={`${num(c.sent)} tokens`} note={<Share part={c.cached} whole={c.sent} title={`${num(c.cached)} read from cache, ${num(c.cacheWrite)} written to it, ${num(c.uncached)} at full price`}/>}/>
          <Stat label="Billed output" value={`${num(c.out)} tokens`} note={`about ${num(c.answer)} the answer, ${num(c.thinking)} thinking`}/>
          <Stat label="Cost" value={cents(c.usd * 100)}/>
          <Stat label="Time" value={`${c.seconds.toFixed(1)} s`}/>
          <Stat label="Result" value={<span className={c.status === "ok" ? "" : "text-red-700"}>{c.status}</span>} note={c.error?.slice(0, 200)}/>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">What was sent: {c.blocks.length} blocks</h2>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full" data-testid="call-blocks">
              <thead>
                <tr>
                  <th className={th}>Part</th>
                  <th className={th}>Block (open it for the words)</th>
                  <th className={cn(th, r)}>Tokens</th>
                  <th className={cn(th, r)}>Share</th>
                  <th className={th}>Comes from</th>
                  <th className={th}>Change it</th>
                </tr>
              </thead>
              <tbody>
                {c.blocks.map((b, i) => (<tr key={i} data-testid="call-block">
                    <td className={cn(td, "text-muted-foreground")}>{b.where}</td>
                    <td className={cn(td, "w-full max-w-0")}>
                      <details>
                        <summary className="cursor-pointer font-medium">{b.label}</summary>
                        <div className="mt-2">
                          <Pre>{b.text}</Pre>
                        </div>
                      </details>
                    </td>
                    <td className={cn(td, r)}>{num(b.tokens)}</td>
                    <td className={cn(td, r)}>{pct(b.tokens, c.sent)}</td>
                    <td className={td}>
                      {b.files.length ? (<div className="flex flex-col gap-0.5">
                          {b.files.slice(0, 5).map((f) => (<FileLink key={f.path} path={f.path} className="text-xs"/>))}
                        </div>) : (<span className="text-muted-foreground">the app</span>)}
                    </td>
                    <td className={td}>
                      <BlockActions task={c.task} part={b.where} label={b.label} kind={b.kind} files={b.files.map((f) => f.path)} notes={notes} callId={c.id}/>
                    </td>
                  </tr>))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">What came back ({num(c.response.length)} characters)</h2>
          {c.response ? <Pre>{c.response}</Pre> : <p className="text-sm text-muted-foreground">Nothing was kept: the call failed before an answer.</p>}
          <div className="mt-2" data-testid="answer-notes">
            <NoteBox target={{ kind: "answer", task: c.task, callId: c.id }} notes={notes.filter((n) => n.kind === "answer" && n.callId === c.id)} label="Feedback on this answer" placeholder="What is wrong with the answer, or what a good one would have said"/>
          </div>
        </section>

        <section data-testid="call-notes">
          <NoteBox target={{ kind: "call", task: c.task, callId: c.id }} notes={notes.filter((n) => n.kind === "call" && n.callId === c.id)} label="Feedback on this call as a whole" placeholder="Anything else about this call"/>
        </section>
      </div>
    </div>);
}
