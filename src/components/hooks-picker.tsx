"use client";
import { cn } from "@/lib/utils";
export const HOOK_CHOICES = [1, 2, 3, 4, 5] as const;
export function HooksPicker({ value, onChange, id = "hooks", label = "Hooks for each script", hint = true, className }: {
    value: number;
    onChange: (n: number) => void;
    id?: string;
    label?: string;
    hint?: boolean;
    className?: string;
}) {
    return (<div className={cn("min-w-0", className)} data-testid={`${id}-picker`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span id={`${id}-label`} className="text-sm font-medium">
          {label}
        </span>
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="inline-flex overflow-hidden rounded-md border">
          {HOOK_CHOICES.map((n) => (<button key={n} type="button" role="radio" aria-checked={value === n} onClick={() => onChange(n)} className={cn("min-w-9 px-2.5 py-1.5 text-sm tabular-nums transition-colors", n > 1 && "border-l", value === n ? "bg-primary font-semibold text-primary-foreground" : "bg-background hover:bg-muted")} data-testid={`${id}-${n}`}>
              {n}
            </button>))}
        </div>
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{value > 1 ? `Each script gets ${value} openings and 1 body: ${value} versions of the ad to test against each other.` : "1 opening. Choose more to get several versions of each ad: a different hook, the same body."}</p>}
    </div>);
}
