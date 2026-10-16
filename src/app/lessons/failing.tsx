"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAdvanced } from "@/components/mode";
import { AREA_LABEL } from "@/lib/lesson-types";
import type { FailureGroup, ScriptTrend } from "@/lib/failures";
import { dismissFailuresAction, learnFailuresAction } from "./actions";
const SHOWN = 6;
export function Failing({ groups, reads, trend }: {
    groups: FailureGroup[];
    reads: boolean;
    trend?: ScriptTrend | null;
}) {
    const router = useRouter();
    const advanced = useAdvanced();
    const [busy, setBusy] = useState<string | null>(null);
    const [pending, start] = useTransition();
    const [all, setAll] = useState(false);
    const shown = all ? groups : groups.slice(0, SHOWN);
    const learn = (g: FailureGroup) => {
        setBusy(g.key);
        start(async () => {
            const res = await learnFailuresAction(g.key);
            setBusy(null);
            if (!res.ok) {
                toast.error(res.error);
                return;
            }
            if (!res.lessons.length)
                toast.message(res.note || "Nothing lasting was found in it.");
            else if (res.lessons.some((l) => l.isNew))
                toast.success(advanced ? `Added: ${res.lessons.map((l) => l.id).join(", ")}. It is in every prompt it applies to from now on.` : "Added to the rules. It is used from now on.");
            else
                toast.success(advanced ? `Already a rule (${res.lessons.map((l) => l.id).join(", ")}): sharpened and moved up.` : "Already a rule: sharpened and moved up.");
            router.refresh();
        });
    };
    const dismiss = (g: FailureGroup) => {
        setBusy(g.key);
        start(async () => {
            const res = await dismissFailuresAction(g.key);
            setBusy(null);
            if (!res.ok)
                toast.error(res.error);
            else
                toast.message("Put away. It is asked again only if it keeps coming back.");
            router.refresh();
        });
    };
    return (<section id="failing" data-testid="failing">
      <h2 className="display text-2xl">What the checks keep finding</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Every time a check finds something wrong with a script, a piece of copy or an image, it is counted here. When the same thing has come back 3 times, you are asked once: should it become a rule? Yes makes it a rule for every piece it applies to.
        {!reads && advanced && " In mock mode the rule is the standing one for that kind of failure."}
      </p>
      {trend && (<p className="mt-3 max-w-3xl text-sm" data-testid="failing-trend">
          Scripts: the rule checks found {trend.recent.per} thing{trend.recent.per === 1 ? "" : "s"} a script over the last {trend.recent.scripts}
          {trend.before ? `, ${trend.before.per} over the ${trend.before.scripts} before them` : ""}.
          <span className="text-muted-foreground"> A rule that works brings this down. What the 2 editors rewrite is not counted in it: an editor changes about as much in a script it has already fixed.</span>
        </p>)}
      {!groups.length ? (<p className="mt-4 rounded-lg border border-dashed p-5 text-sm text-muted-foreground" data-testid="failing-empty">
          Nothing is waiting. Either nothing has failed 3 times, or you have decided on all of it.
        </p>) : (<ul className="mt-5 divide-y overflow-hidden rounded-lg border bg-card text-sm">
          {shown.map((g) => (<li key={g.key} className="space-y-2 p-5 max-md:p-4" data-testid="failing-row" data-point={g.point}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{AREA_LABEL[g.area]}</span>
                <span className="text-[15px] font-semibold">{g.label}</span>
                <span className="text-xs text-muted-foreground" data-testid="failing-count">
                  {g.count} time{g.count === 1 ? "" : "s"} on {g.pieces} piece{g.pieces === 1 ? "" : "s"}
                </span>
              </div>
              {g.lesson && (<p className="text-xs text-amber-800">
                  This rule is already in use and was broken anyway{advanced ? ` (${g.lesson.id})` : ""}: {g.lesson.rule}
                </p>)}
              <ul className="list-disc space-y-1 pl-5 text-[13px] leading-snug text-muted-foreground">
                {g.notes.slice(0, 3).map((n) => (<li key={n}>{n}</li>))}
              </ul>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => learn(g)} disabled={pending} data-testid="failing-learn">
                  {busy === g.key && pending && <Loader2 className="size-3.5 animate-spin"/>}
                  {g.lesson ? "Sharpen the rule" : "Add as a rule"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => dismiss(g)} disabled={pending} data-testid="failing-dismiss">
                  Not a rule
                </Button>
              </div>
            </li>))}
        </ul>)}
      {groups.length > SHOWN && (<Button size="sm" variant="ghost" className="mt-2" onClick={() => setAll(!all)} data-testid="failing-all">
          {all ? "Show the most frequent only" : `Show all ${groups.length}`}
        </Button>)}
    </section>);
}
