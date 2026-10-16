"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquarePlus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Note, NoteTarget } from "@/lib/inspect/notes";
import { cn } from "@/lib/utils";
import { addNoteAction, deleteNoteAction, setNoteAction } from "./actions";
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
export function NoteItem({ note, children }: {
    note: Note;
    children?: React.ReactNode;
}) {
    const router = useRouter();
    const [pending, begin] = useTransition();
    const [closing, setClosing] = useState(false);
    const [done, setDone] = useState("");
    const run = (f: () => Promise<{
        ok: boolean;
        error?: string;
    }>, said?: string) => begin(async () => {
        const res = await f();
        if (!res.ok)
            return void toast.error(res.error ?? "That did not work.");
        if (said)
            toast.success(said);
        setClosing(false);
        router.refresh();
    });
    return (<li className={cn("rounded-md border p-2 text-xs", note.status === "done" && "bg-muted/40 text-muted-foreground")} data-testid="note">
      {children}
      <p className="whitespace-pre-wrap">{note.text}</p>
      {note.status === "done" && <p className="mt-1 whitespace-pre-wrap">Done{note.resolution ? `: ${note.resolution}` : "."}</p>}
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          {note.id}, {when(note.at)}
        </span>
        {note.status === "open" ? (<button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setClosing(!closing)} disabled={pending} data-testid="note-close">
            <Check className="size-3"/>
            Mark done
          </button>) : (<button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => run(() => setNoteAction(note.id, "open"))} disabled={pending}>
            <RotateCcw className="size-3"/>
            Open again
          </button>)}
        <button type="button" className="inline-flex items-center gap-1 hover:text-red-700" onClick={() => {
            if (window.confirm("Delete this note? It cannot be brought back."))
                run(() => deleteNoteAction(note.id));
        }} disabled={pending}>
          <Trash2 className="size-3"/>
          Delete
        </button>
      </div>
      {closing && (<div className="mt-2 space-y-1">
          <Textarea value={done} onChange={(e) => setDone(e.target.value)} placeholder="What was done about it (optional)" className="min-h-12 text-xs md:text-xs" data-testid="note-resolution"/>
          <Button size="sm" onClick={() => run(() => setNoteAction(note.id, "done", done), "Note closed.")} disabled={pending} data-testid="note-close-save">
            Close the note
          </Button>
        </div>)}
    </li>);
}
export function NoteBox({ target, notes, label = "Feedback", open: startOpen = false, placeholder }: {
    target: NoteTarget;
    notes: Note[];
    label?: string;
    open?: boolean;
    placeholder?: string;
}) {
    const router = useRouter();
    const [pending, begin] = useTransition();
    const [open, setOpen] = useState(startOpen);
    const [text, setText] = useState("");
    const live = notes.filter((n) => n.status === "open").length;
    const save = () => begin(async () => {
        const res = await addNoteAction(target, text);
        if (!res.ok)
            return void toast.error(res.error);
        setText("");
        toast.success(`Saved as ${res.note.id}. It is on the Notes tab until it is marked done.`);
        router.refresh();
    });
    return (<div data-testid="note-box">
      <button type="button" onClick={() => setOpen(!open)} className={cn("inline-flex items-center gap-1 text-xs hover:text-foreground", live ? "font-medium text-amber-700" : "text-muted-foreground")} data-testid="note-toggle">
        <MessageSquarePlus className="size-3.5"/>
        {label}
        {notes.length > 0 && <span className="tabular-nums">({live ? `${live} open` : `${notes.length} done`})</span>}
      </button>
      {open && (<div className="mt-2 min-w-64 space-y-2">
          {notes.length > 0 && (<ul className="space-y-1">
              {notes.map((n) => (<NoteItem key={n.id} note={n}/>))}
            </ul>)}
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder ?? "What you saw, or what should change"} className="min-h-14 text-xs md:text-xs" data-testid="note-text"/>
          <Button size="sm" onClick={save} disabled={pending || text.trim().length < 3} data-testid="note-save">
            Save the note
          </Button>
        </div>)}
    </div>);
}
