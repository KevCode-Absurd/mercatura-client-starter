import Link from "next/link";
import { forBlock, type Note } from "@/lib/inspect/notes";
import { NoteBox } from "./note-box";
import { EditLink, builtWhere } from "./ui";
export function BlockActions({ task, part, label, kind, files, notes, callId }: {
    task: string;
    part: "system" | "user";
    label: string;
    kind: "tag" | "heading" | "opening";
    files: string[];
    notes: Note[];
    callId?: string;
}) {
    const built = files.length ? null : builtWhere(label);
    return (<div className="flex flex-col gap-1">
      {files.slice(0, 3).map((f) => (<EditLink key={f} path={f} at={kind === "heading" ? label : undefined}>
          Edit {f.split("/").slice(-2).join("/")}
        </EditLink>))}
      {built && (<Link href={built.href} className="text-xs text-primary hover:underline">
          Changed in {built.label}
        </Link>)}
      <NoteBox target={{ kind: "block", task, part, block: label, callId: callId ?? null }} notes={forBlock(notes, part, label)} placeholder="What is wrong with this block, or what it should say"/>
    </div>);
}
