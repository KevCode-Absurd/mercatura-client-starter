"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ScriptLine, ScriptRow, ScriptVersionRow } from "@/db/schema";
import { humanize } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { saveScriptAction, scriptVersionsAction } from "../actions";
import { lineDiff, type LineDiff } from "../diff";
const SOURCE_LABEL: Record<ScriptVersionRow["source"], string> = {
    seed: "Seed",
    generated: "Written by the model",
    edit: "Edited by hand",
    repair: "Repaired by the model",
    voice: "Brand voice fixes",
};
type Entry = Pick<ScriptVersionRow, "version" | "source" | "created_at" | "snapshot">;
export function VersionsDrawer({ script, open, onOpenChange, dirty, }: {
    script: ScriptRow;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dirty: boolean;
}) {
    const router = useRouter();
    const [entries, setEntries] = useState<Entry[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [picked, setPicked] = useState<number | null>(null);
    const [pending, start] = useTransition();
    useEffect(() => {
        if (!open)
            return;
        let stop = false;
        void scriptVersionsAction(script.id).then((res) => {
            if (stop)
                return;
            if (!res.ok) {
                setError(res.error);
                return;
            }
            const current: Entry = {
                version: script.version,
                source: "seed",
                created_at: script.updated_at,
                snapshot: { title: script.title, lines: script.lines, hook_variants: script.hook_variants, audit: script.audit, est_seconds: script.est_seconds },
            };
            const byVersion = new Map<number, Entry>();
            for (const v of res.versions)
                if (v.version <= script.version)
                    byVersion.set(v.version, v);
            if (!byVersion.has(script.version))
                byVersion.set(script.version, current);
            setEntries([...byVersion.values()].sort((a, b) => b.version - a.version));
        });
        return () => {
            stop = true;
        };
    }, [open, script]);
    const chosen = entries?.find((e) => e.version === picked && e.version !== script.version) ?? null;
    const diff = chosen ? lineDiff(chosen.snapshot.lines, script.lines) : [];
    const changes = diff.filter((d) => d.kind !== "same").length;
    const titleChanged = chosen && chosen.snapshot.title !== script.title;
    const restore = () => start(async () => {
        if (!chosen)
            return;
        const res = await saveScriptAction(script.id, { title: chosen.snapshot.title, lines: chosen.snapshot.lines, hook_variants: chosen.snapshot.hook_variants });
        if (!res.ok) {
            toast.error(res.error);
            return;
        }
        toast.success(`Restored version ${chosen.version} as version ${res.version}`);
        onOpenChange(false);
        router.refresh();
    });
    return (<Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-3xl" data-testid="versions-drawer">
        <SheetHeader className="border-b">
          <SheetTitle>Versions of {script.id}</SheetTitle>
          <SheetDescription>Every save is a new version. Pick an older one to see what changed since then.</SheetDescription>
        </SheetHeader>
        <div className="grid min-h-0 flex-1 grid-cols-[14rem_1fr] text-sm">
          <ul className="space-y-1 overflow-y-auto border-r p-3" data-testid="version-list">
            {error && <li className="text-xs text-red-700">{error}</li>}
            {!entries && !error && <li className="text-xs text-muted-foreground">Loading versions...</li>}
            {entries?.map((e) => {
            const current = e.version === script.version;
            return (<li key={e.version}>
                  <button data-testid="version-entry" data-version={e.version} disabled={current} onClick={() => setPicked(e.version)} className={cn("w-full rounded-md border px-2 py-1.5 text-left", current ? "cursor-default bg-muted/50" : "hover:bg-muted", picked === e.version && !current && "border-primary bg-primary/5")}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">Version {e.version}</span>
                      {current && (<Badge variant="secondary" className="font-normal">
                          Current
                        </Badge>)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {SOURCE_LABEL[e.source] ?? e.source} · {new Date(e.created_at).toLocaleString()}
                    </span>
                  </button>
                </li>);
        })}
          </ul>

          <div className="min-w-0 space-y-3 overflow-y-auto p-4">
            {!chosen ? (<p className="text-muted-foreground">
                {entries && entries.length < 2 ? "Only 1 version so far. Edit a line and save to make another." : "Pick an older version on the left to compare it with the current one."}
              </p>) : (<>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      Version {chosen.version} compared with version {script.version} (current)
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {changes === 0 && !titleChanged ? "No differences in the lines." : `${changes} line${changes === 1 ? "" : "s"} differ.`}{" "}
                      <span className="rounded bg-red-100 px-1 text-red-800 line-through">Only in version {chosen.version}</span>{" "}
                      <span className="rounded bg-emerald-100 px-1 text-emerald-800">Only in the current version</span>
                    </div>
                  </div>
                  <Button size="sm" onClick={restore} disabled={pending || dirty} data-testid="restore-version" title={dirty ? "Save or discard your edits first" : undefined}>
                    {pending ? "Restoring..." : "Restore this version"}
                  </Button>
                </div>
                {dirty && <p className="text-xs text-amber-700">You have unsaved edits. Save or discard them before restoring a version.</p>}
                {titleChanged && (<p className="text-xs">
                    Title: <span className="rounded bg-red-100 px-1 text-red-800 line-through">{chosen.snapshot.title}</span>{" "}
                    <span className="rounded bg-emerald-100 px-1 text-emerald-800">{script.title}</span>
                  </p>)}
                <ol className="divide-y rounded-md border" data-testid="version-diff">
                  {diff.map((d, n) => (<DiffRow key={n} d={d}/>))}
                </ol>
              </>)}
          </div>
        </div>
      </SheetContent>
    </Sheet>);
}
const extras = (l: ScriptLine) => [l.on_screen ? `On screen: ${l.on_screen}` : "", l.visual_note ? `Visual: ${l.visual_note}` : ""].filter(Boolean).join(" · ");
function DiffRow({ d }: {
    d: LineDiff;
}) {
    const beat = d.kind === "changed" ? d.after.beat : d.line.beat;
    const beatWas = d.kind === "changed" && d.before.beat !== d.after.beat ? d.before.beat : null;
    return (<li data-testid="diff-line" data-kind={d.kind} className={cn("grid grid-cols-[6.5rem_1fr] gap-2 px-3 py-2", d.kind === "added" && "bg-emerald-50", d.kind === "removed" && "bg-red-50", d.kind === "changed" && "bg-amber-50/60")}>
      <div className="text-xs font-semibold tracking-wide uppercase">
        {humanize(beat)}
        {beatWas && <span className="block font-normal text-red-800 normal-case line-through">{humanize(beatWas)}</span>}
        {d.kind !== "same" && <span className="block font-normal text-muted-foreground normal-case">{d.kind}</span>}
      </div>
      <div className="min-w-0 leading-relaxed">
        {d.kind === "changed" ? (<>
            <p>
              {d.words.map((w, k) => w.kind === "same" ? (<span key={k}>{w.text}</span>) : w.kind === "add" ? (<ins key={k} className="rounded bg-emerald-100 text-emerald-800 no-underline">
                    {w.text}
                  </ins>) : (<del key={k} className="rounded bg-red-100 text-red-800">
                    {w.text}{" "}
                  </del>))}
            </p>
            {extras(d.before) !== extras(d.after) && (<p className="mt-1 text-xs">
                {extras(d.before) && <span className="rounded bg-red-100 px-1 text-red-800 line-through">{extras(d.before)}</span>}{" "}
                {extras(d.after) && <span className="rounded bg-emerald-100 px-1 text-emerald-800">{extras(d.after)}</span>}
              </p>)}
          </>) : (<>
            <p className={cn(d.kind === "removed" && "text-red-800 line-through", d.kind === "added" && "text-emerald-800")}>{d.line.text}</p>
            {d.kind !== "same" && extras(d.line) && <p className="mt-1 text-xs text-muted-foreground">{extras(d.line)}</p>}
          </>)}
      </div>
    </li>);
}
