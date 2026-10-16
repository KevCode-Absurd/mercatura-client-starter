"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdvanced } from "@/components/mode";
import type { ProductionState } from "@/db/schema";
import { castLine } from "@/lib/production/prompts";
import { cn } from "@/lib/utils";
import { castCostAction, castPromptsAction, chooseCastAction, drawCastPortraitsAction, moreCastAction } from "./actions";
import { assetUrl, imagesText, usd } from "./shared";
type ActionResult = {
    ok: true;
} | {
    ok: false;
    error: string;
};
type Act = (fn: () => Promise<ActionResult>, done?: string, after?: () => void) => void;
const MAX_OPTIONS = 9;
export function CastOptions({ jobId, p, locked, planDirty, act }: {
    jobId: string;
    p: ProductionState;
    locked: boolean;
    planDirty: boolean;
    act: Act;
}) {
    const advanced = useAdvanced();
    const [prompts, setPrompts] = useState<string[] | null>(null);
    const [cost, setCost] = useState<{
        usdEach: number;
        measured: boolean;
    } | null>(null);
    const plan = p.video_plan;
    const options = plan?.cast_options ?? [];
    const settled = !!p.look || !!p.storyboard || p.clips.some((c) => c.status !== "pending");
    const show = !!plan && options.length >= 2;
    useEffect(() => {
        if (!show || settled)
            return;
        let stop = false;
        void castCostAction(jobId).then((r) => !stop && r.ok && setCost({ usdEach: r.usdEach, measured: r.measured }));
        return () => {
            stop = true;
        };
    }, [jobId, show, settled]);
    if (plan && p.avatar_id && options.length === 1) {
        const o = options[0];
        return (<section className="space-y-2" data-testid="cast-avatar">
        <h3 className="text-sm font-medium">Who is in this video</h3>
        <div className="flex gap-3 rounded-md border p-2.5 text-xs">

          {o.portrait && <img src={assetUrl(o.portrait)} alt={`${o.label}, a saved avatar`} className="size-20 shrink-0 rounded object-cover"/>}
          <div className="min-w-0 space-y-1">
            <p className="font-medium break-words">{o.label}</p>
            <p className="break-words text-muted-foreground">{castLine(o)}</p>
            <p className="text-muted-foreground">
              A saved avatar: the same face and voice as its other videos. To change how it looks or sounds, edit it on the{" "}
              <Link href="/personas" className="text-primary hover:underline">
                persona sheet
              </Link>
              .
            </p>
          </div>
        </div>
      </section>);
    }
    if (!plan || !show)
        return null;
    const chosen = plan.cast_choice ?? 0;
    const missing = options.filter((o) => !o.portrait).length;
    const blocked = locked || planDirty;
    const price = (n: number) => (cost ? `${imagesText(n)}, about ${usd(cost.usdEach * n)}${cost.measured ? "" : " (an estimate)"}` : imagesText(n));
    const loadPrompts = () => {
        if (prompts)
            return;
        void castPromptsAction(jobId).then((r) => setPrompts(r.ok ? r.prompts : []));
    };
    return (<section className="space-y-2" data-testid="cast-options">
      <h3 className="text-sm font-medium">Who is in this video</h3>
      <p className="text-xs text-muted-foreground">
        {settled
            ? "The opening frame is made with this cast. To cast it differently, start a new job."
            : `${options.length} options. The first is used unless you pick another. Picking costs nothing${p.character ? "; the character sheet is drawn again for the one you pick" : ""}. ${missing ? "Draw their portraits to choose by looking, or pick by the words alone." : "The character sheet is drawn from the portrait you pick, so this is the face in the video."}`}
      </p>
      {!settled && (<div className="flex flex-wrap items-center gap-2 text-xs" data-testid="cast-tools">
          {missing > 0 && (<Button size="sm" disabled={blocked} onClick={() => act(() => drawCastPortraitsAction(jobId), "Portraits drawn")} data-testid="cast-draw">
              Draw {missing === options.length ? `the ${missing} portraits` : `${missing} more portrait${missing === 1 ? "" : "s"}`}
            </Button>)}
          {missing > 0 && <span className="text-muted-foreground" data-testid="cast-cost">Costs {price(missing)}. Takes about a minute.</span>}
          {options.length + 3 <= MAX_OPTIONS && (<>
              <Button size="sm" variant="outline" disabled={blocked} onClick={() => act(() => moreCastAction(jobId, { pictures: true }), "3 more options, with portraits")} title={`Writes 3 more people and draws a portrait of each: ${price(3)}`} data-testid="cast-more">
                Show 3 more
              </Button>
              <Button size="sm" variant="ghost" disabled={blocked} onClick={() => act(() => moreCastAction(jobId), "3 more options")} title="Writes 3 more people in words. No picture is drawn." data-testid="cast-more-words">
                3 more, words only
              </Button>
              <span className="text-muted-foreground">Show 3 more costs {price(3)}.</span>
            </>)}
        </div>)}
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((o, i) => (<div key={i} className={cn("flex flex-col gap-1.5 rounded-md border-2 p-2.5 text-xs", i === chosen ? "border-primary" : "border-border")} data-testid="cast-option" data-chosen={i === chosen} data-portrait={!!o.portrait}>
            {o.portrait ? (<img src={assetUrl(o.portrait)} alt={`${o.label}: ${castLine(o)}`} className="aspect-square w-full rounded object-cover" data-testid="cast-portrait"/>) : (!settled && missing < options.length && <div className="flex aspect-square w-full items-center justify-center rounded border border-dashed text-muted-foreground">No portrait yet</div>)}
            <div className="flex items-center gap-1.5 font-medium">
              {i === chosen && <Check className="size-3.5 shrink-0 text-primary"/>}
              <span className="break-words">{o.label}</span>
            </div>
            <p className="break-words text-muted-foreground">{castLine(o)}</p>
            {o.why && <p className="break-words">{o.why}</p>}
            {!settled && i !== chosen && (<Button size="sm" variant="outline" className="mt-auto" disabled={blocked} onClick={() => act(() => chooseCastAction(jobId, i), `Cast: ${o.label}`)} data-testid="cast-choose">
                Use this one
              </Button>)}
            {i === chosen && <span className="mt-auto text-muted-foreground">{settled ? "In the video" : "Chosen"}</span>}
          </div>))}
      </div>
      {planDirty && !settled && <p className="text-xs text-amber-700">Save your plan edits before changing the cast.</p>}
      {advanced && (<details className="rounded-md border p-3 text-xs" onToggle={loadPrompts} data-testid="cast-prompts">
          <summary className="cursor-pointer font-medium">The character sheet prompt of each option</summary>
          {!prompts ? (<p className="mt-2 text-muted-foreground">Loading...</p>) : (prompts.map((t, i) => (<div key={i} className="mt-2">
                <div className="font-medium">{options[i]?.label ?? `Option ${i + 1}`}</div>
                <pre className="mt-1 font-sans whitespace-pre-wrap text-muted-foreground">{t}</pre>
              </div>)))}
        </details>)}
    </section>);
}
