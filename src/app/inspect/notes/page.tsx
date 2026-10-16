import Link from "next/link";
import { PageHeader } from "@/components/bits";
import { allEdits } from "@/lib/inspect/edits";
import { allNotes, type Note } from "@/lib/inspect/notes";
import { cn } from "@/lib/utils";
import { NoteItem } from "../note-box";
import { FileLink, InspectTabs, num, r, td, th, when } from "../ui";
export const dynamic = "force-dynamic";
const fileHref = (p: string) => `/inspect/file/${p.split("/").map(encodeURIComponent).join("/")}`;
function about(n: Note): {
    href: string;
    text: string;
} {
    const step = n.task ? n.task.replace(/_/g, " ") : "";
    switch (n.kind) {
        case "step":
            return { href: `/inspect/step/${n.task}`, text: `The step "${step}"` };
        case "block":
            return { href: n.callId ? `/inspect/call/${n.callId}` : `/inspect/step/${n.task}`, text: `The block "${n.block}" (${n.part} part) of "${step}"` };
        case "answer":
            return { href: `/inspect/call/${n.callId}`, text: `An answer of "${step}"` };
        case "call":
            return { href: `/inspect/call/${n.callId}`, text: `A call of "${step}"` };
        case "media":
            return { href: `/inspect/call/${n.callId}`, text: "An image or a clip" };
        case "file":
            return { href: fileHref(n.file ?? ""), text: n.file ?? "A file" };
    }
}
function List({ notes }: {
    notes: Note[];
}) {
    return (<ul className="max-w-3xl space-y-1.5" data-testid="notes-list">
      {notes.map((n) => {
            const a = about(n);
            return (<NoteItem key={n.id} note={n}>
            <Link href={a.href} className="mb-1 block text-xs font-medium text-primary hover:underline">
              {a.text}
            </Link>
          </NoteItem>);
        })}
    </ul>);
}
export default function NotesPage() {
    const notes = allNotes();
    const open = notes.filter((n) => n.status === "open");
    const done = notes.filter((n) => n.status === "done");
    const edits = allEdits();
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader title="Inspect" subtitle="What was said about a step, a block, a call, an answer or a file, and every change made to a skill or prompt file from these screens. A note is work for a person: nothing here is read by a model."/>
      <InspectTabs at="/inspect/notes" open={open.length}/>
      <div className="space-y-10 px-6 py-8">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Open notes ({open.length})</h2>
          {open.length ? <List notes={open}/> : <p className="text-sm text-muted-foreground">None. Leave one with &quot;Feedback&quot; on any step, block, call, answer or file.</p>}
        </section>
        {done.length > 0 && (<section>
            <h2 className="mb-3 text-lg font-semibold">Done ({done.length})</h2>
            <List notes={done}/>
          </section>)}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Changes to skill and prompt files ({edits.length})</h2>
          {edits.length ? (<div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full" data-testid="edits-list">
                <thead>
                  <tr>
                    <th className={th}>Change</th>
                    <th className={th}>When</th>
                    <th className={th}>File</th>
                    <th className={cn(th, r)}>Before</th>
                    <th className={cn(th, r)}>After</th>
                    <th className={th}>Why</th>
                  </tr>
                </thead>
                <tbody>
                  {edits.map((e) => (<tr key={e.id}>
                      <td className={td}>
                        <Link href={`/inspect/edit/${e.id}`} className="font-mono text-primary hover:underline">
                          {e.id}
                        </Link>
                      </td>
                      <td className={cn(td, "whitespace-nowrap text-muted-foreground")}>{when(e.at)}</td>
                      <td className={td}>
                        <FileLink path={e.file} className="text-xs"/>
                      </td>
                      <td className={cn(td, r)}>{num(e.charsBefore)}</td>
                      <td className={cn(td, r)}>{num(e.charsAfter)}</td>
                      <td className={td}>{e.note || <span className="text-muted-foreground">no reason given</span>}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>) : (<p className="text-sm text-muted-foreground">None yet. Open a file from Skills and prompts, or &quot;Edit&quot; on a block, to change it.</p>)}
        </section>
      </div>
    </div>);
}
