"use client";
import { ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { FOUNDER_FILMING, FOUNDER_HOOKS, HOOK_TYPE_LABEL, founderHookSeconds, type Callout, type Opener } from "@/lib/hooks/bank-info";
const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success("Copied."), () => toast.error("Could not copy. Select the text instead."));
export function HookBank({ callouts, shapes, founder, gifting, stage }: {
    callouts: Callout[];
    shapes: Opener[];
    founder: boolean;
    gifting: boolean;
    stage: string;
}) {
    if (!callouts.length && !shapes.length)
        return null;
    return (<details className="group rounded-xl border bg-card" data-testid="hook-bank">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-medium">
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90"/>
        From the hook bank
        <span className="font-normal text-muted-foreground">
          {shapes.length} way{shapes.length === 1 ? "" : "s"} in for a buyer who is {stage}
          {gifting ? ", with gift lines" : ""}
        </span>
      </summary>
      <div className="grid gap-5 border-t px-5 py-4 md:grid-cols-2">
        {callouts.length > 0 && (<div data-testid="hook-bank-callouts">
            <h3 className="text-sm font-semibold">Who to name in the first 3 seconds</h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {callouts.map((c) => (<li key={c.kind}>
                  <span className="text-muted-foreground">{c.label}:</span> {c.from}
                </li>))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Name what they do or live with, not their age or sex.</p>
          </div>)}
        <div data-testid="hook-bank-shapes">
          <h3 className="text-sm font-semibold">Shapes that fit</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {shapes.map((s) => (<li key={s.id} className="flex items-start gap-2">
                <button type="button" onClick={() => copy(s.line)} className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Copy: ${s.line}`}>
                  <Copy className="size-3.5"/>
                </button>
                <span>
                  {s.line} <span className="text-xs text-muted-foreground">{HOOK_TYPE_LABEL[s.type].toLowerCase()}</span>
                </span>
              </li>))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">A shape is a way in, not a line to run: say it in this buyer&apos;s own words, and put nothing in a blank the ad does not state. &ldquo;Write more hooks&rdquo; is given these.</p>
        </div>
        {founder && (<div className="md:col-span-2" data-testid="hook-bank-founder">
            <h3 className="text-sm font-semibold">The 5 founder hooks</h3>
            <ul className="mt-2 grid gap-2 text-sm md:grid-cols-2">
              {FOUNDER_HOOKS.map((h) => (<li key={h.id} className="rounded-md border p-2.5">
                  <div className="font-medium">
                    {h.label} <span className="text-xs font-normal text-muted-foreground">{founderHookSeconds(h)} s</span>
                  </div>
                  <div className="mt-0.5">&ldquo;{h.formula}&rdquo;</div>
                  <div className="mt-1 text-xs text-muted-foreground">{h.beats.map((b) => `${b.what} (${b.seconds}s)`).join(" → ")}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Needs: {h.needs}</div>
                </li>))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">{FOUNDER_FILMING.slice(0, 2).join(" ")}</p>
          </div>)}
      </div>
    </details>);
}
