"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAdvanced } from "@/components/mode";
import { AREAS, AREA_LABEL, type Area, type Lesson } from "@/lib/lesson-types";
import type { CompactResult } from "@/lib/lessons-compact";
import { compactLessonsAction, unmergeLessonAction } from "./actions";
export const TIDY_FROM = 6;
export const tidyCount = (rows: Lesson[], area: Area) => rows.filter((l) => l.status !== "off" && l.areas.includes(area) && !l.image).length;
export const foldedAway = (rows: Lesson[], l: Lesson) => !!l.merged_into && rows.some((x) => x.id === l.merged_into);
export function TidyUp({ mine }: {
    mine: Lesson[];
}) {
    const router = useRouter();
    const advanced = useAdvanced();
    const [pending, start] = useTransition();
    const [busy, setBusy] = useState<Area | null>(null);
    const [results, setResults] = useState<CompactResult[]>([]);
    const areas = AREAS.filter((a) => tidyCount(mine, a) >= TIDY_FROM);
    if (!areas.length && !results.length)
        return null;
    const run = (area: Area) => {
        setBusy(area);
        start(async () => {
            const res = await compactLessonsAction(area);
            setBusy(null);
            if (!res.ok) {
                toast.error(res.error);
                return;
            }
            setResults((cur) => [res.result, ...cur.filter((r) => r.area !== area)]);
            if (!res.result.ran)
                toast.message("Nothing was tidied: this is not switched on for this account.");
            else if (!res.result.merged.length)
                toast.message("Nothing to tidy: no 2 rules say the same thing.");
            else
                toast.success(`${res.result.before} rules are now ${res.result.after}.`);
            router.refresh();
        });
    };
    return (<section className="rounded-lg border bg-card p-6 max-md:p-4" data-testid="lessons-tidy">
      <h2 className="display text-2xl">Tidy up</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Rules that say the same thing are merged into 1, so none is left out when the list is long. Nothing is deleted: every merge can be undone.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {areas.map((a) => (<Button key={a} size="sm" variant="outline" disabled={pending} onClick={() => run(a)} data-testid={`tidy-${a}`}>
            {busy === a && <Loader2 className="size-3.5 animate-spin"/>}
            Tidy up {AREA_LABEL[a].toLowerCase()} ({tidyCount(mine, a)} rules)
          </Button>))}
      </div>
      {results.map((r) => (<div key={r.area} className="mt-3 rounded-md bg-muted/40 p-3 text-sm" data-testid="tidy-result">
          <p className="font-medium">
            {AREA_LABEL[r.area]}: {!r.ran ? "not tidied: this is not switched on for this account." : r.merged.length ? `${r.before} rules are now ${r.after}.` : "nothing to merge. No 2 rules say the same thing."}
            {advanced && r.ran ? <span className="font-normal text-muted-foreground"> Cost {(r.costUsd * 100).toFixed(1)}c.</span> : null}
          </p>
          {r.merged.map((m) => (<div key={m.id} className="mt-2">
              <p>
                {m.replaces.length} rules became 1: <span className="font-medium">{m.rule}</span>
              </p>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                {m.replaces.map((o) => (<li key={o.id}>{o.rule}</li>))}
              </ul>
            </div>))}
          {advanced && r.refused.length > 0 && (<ul className="mt-2 text-xs text-muted-foreground">
              {r.refused.map((x, i) => (<li key={i}>
                  Left as they were ({x.ids.join(", ")}): {x.why}.
                </li>))}
            </ul>)}
        </div>))}
    </section>);
}
export function MergedFrom({ lesson, originals }: {
    lesson: Lesson;
    originals: Lesson[];
}) {
    const router = useRouter();
    const advanced = useAdvanced();
    const [open, setOpen] = useState(false);
    const [pending, start] = useTransition();
    if (!lesson.replaces.length)
        return null;
    const n = originals.length || lesson.replaces.length;
    return (<div className="mt-2 text-xs" data-testid="lesson-merged">
      <button type="button" className="flex items-center gap-1 text-muted-foreground hover:text-foreground" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="lesson-merged-toggle">
        {open ? <ChevronDown className="size-3"/> : <ChevronRight className="size-3"/>}
        Merged from {n} rules
      </button>
      {open && (<div className="mt-1.5 rounded-md border bg-muted/30 p-2">
          {originals.length ? (<ul className="list-disc space-y-1 pl-4">
              {originals.map((o) => (<li key={o.id}>
                  {o.rule}
                </li>))}
            </ul>) : (<p className="text-muted-foreground">The rules it replaced are no longer on the list.</p>)}
          {originals.length > 0 && (<button type="button" disabled={pending} className="mt-2 flex items-center gap-1 text-primary hover:underline" data-testid="lesson-unmerge" onClick={() => start(async () => {
                    const res = await unmergeLessonAction(lesson.id);
                    if (!res.ok)
                        toast.error(res.error);
                    else {
                        toast.success(`Undone. The ${originals.length} rules are back in use.`);
                        router.refresh();
                    }
                })}>
              {pending ? <Loader2 className="size-3 animate-spin"/> : <Undo2 className="size-3"/>}
              Undo merge
            </button>)}
        </div>)}
    </div>);
}
