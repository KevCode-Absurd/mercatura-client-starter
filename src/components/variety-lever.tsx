"use client";
import { Slider } from "@/components/ui/slider";
import { VARIETY_LABELS, clampVariety, type Variety } from "@/lib/variety";
const HINT: Record<Variety, string> = {
    1: "Sounds like the brand's own ads and pages, and comes in the ways they already do.",
    2: "The brand's own sound, with 1 fresh choice.",
    3: "The brand's voice, with a way in of its own. Nothing the brand's ads already say is repeated.",
    4: "Still clearly the brand, but a way in, a scene or a form it has not tried.",
    5: "Something the brand has never run. The facts, the brand's name and the product stay fixed.",
};
export function VarietyLever({ value, onChange, id = "variety", label = "Close to the brand, or something new?", className }: {
    value: Variety;
    onChange: (v: Variety) => void;
    id?: string;
    label?: string;
    className?: string;
}) {
    return (<div className={className} data-testid={`${id}-lever`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span id={`${id}-label`} className="text-sm font-medium">
          {label}
        </span>
        <span className="text-xs font-medium" data-testid={`${id}-value`}>
          {VARIETY_LABELS[value]}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="shrink-0 text-xs text-muted-foreground">Close</span>
        <Slider min={1} max={5} step={1} value={[value]} onValueChange={([v]) => onChange(clampVariety(v))} className="max-w-xs flex-1" aria-labelledby={`${id}-label`} data-testid={`${id}-slider`}/>
        <span className="shrink-0 text-xs text-muted-foreground">New</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{HINT[value]} It always reads aloud, makes sense and tells 1 story.</p>
    </div>);
}
