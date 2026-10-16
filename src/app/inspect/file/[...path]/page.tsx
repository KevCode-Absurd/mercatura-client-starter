import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/bits";
import { fileEdits } from "@/lib/inspect/edits";
import { fileNotes } from "@/lib/inspect/notes";
import { readInstructionFile, skillMap } from "@/lib/inspect/skill-map";
import { cn } from "@/lib/utils";
import { FileEditor } from "../../file-editor";
import { NoteBox } from "../../note-box";
import { num, td, th, when } from "../../ui";
export const dynamic = "force-dynamic";
export default async function FilePage({ params, searchParams }: {
    params: Promise<{
        path: string[];
    }>;
    searchParams: Promise<{
        at?: string;
    }>;
}) {
    const { path: parts } = await params;
    const { at } = await searchParams;
    const p = parts.map(decodeURIComponent).join("/");
    const file = readInstructionFile(p);
    if (!file)
        notFound();
    const full = `${file.root}/${file.rel}`;
    const entry = skillMap().groups.flatMap((g) => g.files).find((f) => f.root === file.root && f.rel === file.rel);
    const edits = fileEdits(full);
    const steps = [...new Set((entry?.uses ?? []).filter((u) => u.recent).map((u) => u.task.replace(/_/g, " ")))];
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: "/inspect/skills", label: "Skills and prompts" }} title={file.rel} subtitle={`${file.root === "skills" ? "A skill file" : "A prompt file"}, ${num(file.text.length)} characters (about ${num(file.text.length / 4)} tokens). Change it below and save: the next call uses the new text.`}/>
      <div className="space-y-10 px-6 py-8">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Where it is sent</h2>
          {entry?.uses.length ? (<div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full" data-testid="file-uses">
                <thead>
                  <tr>
                    <th className={th}>Step</th>
                    <th className={th}>Part of the prompt</th>
                    <th className={th}>How much of it</th>
                    <th className={th}>Last sent</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.uses.map((u) => (<tr key={`${u.task}${u.where}`}>
                      <td className={td}>
                        <Link href={`/inspect/step/${u.task}`} className="text-primary hover:underline">
                          {u.task.replace(/_/g, " ")}
                        </Link>
                      </td>
                      <td className={td}>{u.where}</td>
                      <td className={td}>{u.share >= 0.9 ? "whole" : `about ${Math.round(u.share * 100)}%`}</td>
                      <td className={cn(td, u.recent ? "" : "text-amber-700")}>
                        {when(u.last)}
                        {u.recent ? "" : " (not in recent calls)"}
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>) : (<p className="text-sm text-muted-foreground">No call in the log carries its words{edits.length ? " as they are now: it was changed here, and calls made before a change carry the old words" : ""}.</p>)}
        </section>

        <section data-testid="file-notes">
          <NoteBox target={{ kind: "file", file: full }} notes={fileNotes(full)} label="Feedback on this file" placeholder="What this file gets wrong, what is missing, or what to test"/>
        </section>

        <section>
          <h2 className="mb-1 text-sm font-medium">The file</h2>
          <p className="mb-2 max-w-3xl text-xs text-muted-foreground">
            {steps.length ? `A change here reaches ${steps.join(", ")} from the next call, for every brand. ` : "A change here is for every brand. "}
            {file.root === "prompts" ? "A word in curly brackets is a place the app fills; the line \"=== USER ===\" splits the standing instructions from the work. " : "The lines between \"---\" at the top are read by the app, not sent. "}
            Each save is kept below and can be put back. Change 1 thing at a time, then run the step and read the new call.
          </p>
          <FileEditor key={`${file.text.length}:${edits.length}`} file={full} text={file.text} at={at} edits={edits}/>
        </section>
      </div>
    </div>);
}
