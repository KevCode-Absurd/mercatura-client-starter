"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EditRow } from "@/lib/inspect/edits";
import { restoreEditAction, saveFileAction } from "./actions";
const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const num = (n: number) => Math.round(n).toLocaleString("en-US");
export function FileEditor({ file, text: saved, at, edits }: {
    file: string;
    text: string;
    at?: string;
    edits: EditRow[];
}) {
    const router = useRouter();
    const [pending, begin] = useTransition();
    const [text, setText] = useState(saved.replace(/\r\n/g, "\n"));
    const [note, setNote] = useState("");
    const [warnings, setWarnings] = useState<string[]>([]);
    const box = useRef<HTMLTextAreaElement>(null);
    const base = saved.replace(/\r\n/g, "\n");
    const dirty = text !== base;
    const target = useMemo(() => {
        if (!at)
            return null;
        const lines = base.split("\n");
        const want = at.toLowerCase();
        let line = lines.findIndex((l) => /^#/.test(l) && l.toLowerCase().includes(want));
        if (line < 0)
            line = lines.findIndex((l) => l.toLowerCase().includes(want));
        if (line < 0)
            return null;
        return { start: lines.slice(0, line).join("\n").length + (line ? 1 : 0), title: lines[line].replace(/^#+\s*/, "") };
    }, [at, base]);
    const openedAt = target?.title ?? "";
    useEffect(() => {
        const ta = box.current;
        if (!ta || !target)
            return;
        const whole = ta.value;
        ta.value = whole.slice(0, target.start);
        const above = ta.scrollHeight > ta.clientHeight ? ta.scrollHeight : 0;
        ta.value = whole;
        ta.scrollTop = Math.max(0, above - 48);
    }, []);
    useEffect(() => {
        if (!dirty)
            return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);
    const save = () => begin(async () => {
        const res = await saveFileAction(file, text, note);
        if (!res.ok)
            return void toast.error(res.error, { duration: 12000 });
        setWarnings(res.warnings);
        setNote("");
        toast.success(res.saved ? "Saved. The next call of every step that is sent this file uses the new text." : "Nothing had changed.");
        router.refresh();
    });
    const restore = (e: EditRow) => {
        if (dirty && !window.confirm("You have changes that are not saved. Putting the file back drops them."))
            return;
        begin(async () => {
            const res = await restoreEditAction(e.id);
            if (!res.ok)
                return void toast.error(res.error);
            toast.success(res.saved ? `The file is back to its text before ${e.id}.` : "The file already has that text.");
            window.location.reload();
        });
    };
    return (<div className="space-y-3">
      {openedAt && (<p className="text-xs text-muted-foreground" data-testid="file-at">
          Opened at &quot;{openedAt}&quot;, the part the block came from.
        </p>)}
      <textarea ref={box} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} className="h-[36rem] w-full resize-y rounded-md border bg-muted/30 p-3 font-mono text-[12px] leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50" data-testid="file-text"/>
      <div className="flex flex-wrap items-center gap-2">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you changed and why (kept with the change)" className="h-8 max-w-md text-xs" data-testid="file-note"/>
        <Button size="sm" onClick={save} disabled={pending || !dirty} data-testid="file-save">
          Save the file
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setText(base)} disabled={pending || !dirty} data-testid="file-undo">
          Drop my changes
        </Button>
        <span className="text-xs text-muted-foreground" data-testid="file-size">
          {num(text.length)} characters, about {num(text.length / 4)} tokens{dirty ? ` (${text.length >= base.length ? "+" : ""}${num(text.length - base.length)} characters, not saved)` : ""}
        </span>
      </div>
      {warnings.length > 0 && (<ul className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900" data-testid="file-warnings">
          {warnings.map((w) => (<li key={w}>{w}</li>))}
        </ul>)}
      {edits.length > 0 && (<div>
          <h3 className="mb-1 text-xs font-medium">Changes saved here</h3>
          <ul className="divide-y rounded-md border text-xs" data-testid="file-edits">
            {edits.map((e) => (<li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                <Link href={`/inspect/edit/${e.id}`} className="font-mono text-primary hover:underline">
                  {e.id}
                </Link>
                <span className="text-muted-foreground">{when(e.at)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {num(e.charsBefore)} to {num(e.charsAfter)} characters
                </span>
                <span className="min-w-0 flex-1">{e.note || "no reason given"}</span>
                <button type="button" className="text-primary hover:underline disabled:opacity-50" onClick={() => restore(e)} disabled={pending} data-testid="file-restore">
                  Put back the text before this
                </button>
              </li>))}
          </ul>
        </div>)}
    </div>);
}
