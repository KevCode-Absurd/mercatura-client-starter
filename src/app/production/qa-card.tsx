"use client";
import { CircleCheck, CircleHelp, Eye } from "lucide-react";
import type { OutputJobRow } from "@/db/schema";
import { OPENING_TIPS, QA_GROUP_LABEL, qaCard, qaCounts, type QaGroup, type QaJob, type QaState } from "@/lib/production/qa";
import { cn } from "@/lib/utils";
import { groupOfType, type ScriptLite } from "./shared";
export function qaJobOf(job: OutputJobRow, script?: ScriptLite): QaJob {
    const p = job.production;
    const medium = groupOfType(job.output_type);
    const cta = (medium === "video" ? p?.video_plan?.ad_copy?.cta : p?.image_plan?.ad_copy.cta) ?? "";
    return {
        medium,
        aspect: p?.aspect ?? "",
        scenes: p?.video_plan?.segments.flatMap((s) => s.scenes.map((x) => ({ seconds: x.seconds, visual: x.visual, dialogue: x.dialogue, overlay: x.overlay }))),
        cards: p?.image_plan?.cards.map((c) => c.text_elements.map((t) => ({ text: t.text, role: t.role }))),
        cta,
        captions: !!p?.burn_captions,
        versions: Math.max(1, script?.hooks.length ?? 1),
        referenced: !!p?.reference_id,
    };
}
const MARK: Record<QaState, {
    icon: typeof Eye;
    cls: string;
    word: string;
}> = {
    ok: { icon: CircleCheck, cls: "text-emerald-600", word: "Checked" },
    look: { icon: Eye, cls: "text-amber-600", word: "Worth a look" },
    ask: { icon: CircleHelp, cls: "text-muted-foreground", word: "For you" },
};
export function QaCard({ job, script }: {
    job: OutputJobRow;
    script?: ScriptLite;
}) {
    const q = qaJobOf(job, script);
    const items = qaCard(q);
    if (!items.length)
        return null;
    const n = qaCounts(items);
    const groups = (Object.keys(QA_GROUP_LABEL) as QaGroup[]).filter((g) => items.some((i) => i.group === g));
    return (<div className="rounded-lg border bg-card" data-testid="qa-card">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3.5 py-2.5">
        <span className="text-sm font-semibold">Before it runs</span>
        <span className="text-xs text-muted-foreground" data-testid="qa-counts">
          {n.ok} checked by the app{n.look ? `, ${n.look} worth a look` : ""}, {n.ask} for you to answer
        </span>
        <span className="ml-auto text-xs text-muted-foreground">It advises. Approving never waits on it.</span>
      </div>
      {groups.map((g, k) => (<details key={g} className="group border-t" open={k === 0 || items.some((i) => i.group === g && i.state === "look")} data-testid={`qa-${g}`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2 text-xs font-medium">
            {QA_GROUP_LABEL[g]}
            <span className="text-muted-foreground">{items.filter((i) => i.group === g).length}</span>
          </summary>
          <ul className="space-y-2 px-3.5 pb-3">
            {items
                .filter((i) => i.group === g)
                .map((i) => {
                const M = MARK[i.state];
                return (<li key={i.id} className="flex gap-2 text-sm" data-testid={`qa-${i.id}`} data-state={i.state}>
                    <M.icon className={cn("mt-0.5 size-4 shrink-0", M.cls)} aria-label={M.word}/>
                    <span>
                      <span className="font-medium">{i.label}.</span> <span className="text-muted-foreground">{i.note}</span>
                    </span>
                  </li>);
            })}
          </ul>
        </details>))}
      {q.medium === "video" && (<details className="group border-t" data-testid="qa-opening">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2 text-xs font-medium">
            8 ways to open a video
            <span className="text-muted-foreground">to hold the first seconds against</span>
          </summary>
          <ol className="list-decimal space-y-1 px-3.5 pb-3 pl-8 text-sm">
            {OPENING_TIPS.map((t) => (<li key={t}>{t}</li>))}
          </ol>
        </details>)}
    </div>);
}
