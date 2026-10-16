"use client";
import type { LengthPreset } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
const WORDS: Record<LengthPreset, string> = { "15s": "15 seconds", "30s": "30 seconds", "60s": "60 seconds", "2-3m": "2 to 3 minutes", "5-10m": "5 to 10 minutes", "10m": "10 minutes" };
export function LengthPick({ lengths, value, onChange }: {
    lengths: LengthPreset[];
    value: LengthPreset;
    onChange: (l: LengthPreset) => void;
}) {
    if (lengths.length < 2)
        return null;
    return (<div className="flex flex-wrap items-center gap-3 text-sm" data-testid="flow-length">
      <span className="font-medium">How long</span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How long">
        {lengths.map((l, i) => (<button key={l} type="button" role="radio" aria-checked={value === l} onClick={() => onChange(l)} className={cn("rounded-full border px-3 py-1", value === l ? "border-primary bg-primary/5 font-medium text-primary" : "text-muted-foreground hover:bg-muted")} data-testid={`flow-length-${l}`}>
            {WORDS[l]}
            {i === 0 && <span className="ml-1 text-xs font-normal text-muted-foreground">usual</span>}
          </button>))}
      </div>
    </div>);
}
