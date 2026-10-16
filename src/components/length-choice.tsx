"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lengthReadout } from "@/lib/copy/stage";
import { LENGTH_LABELS, LENGTH_PRESETS, type AwarenessStage, type LengthPreset } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
const STORY_DECIDES = "story";
export function LengthChoice({ value, onChange, stages, speakerAge, id = "length", className, }: {
    value: LengthPreset | null;
    onChange: (length: LengthPreset | null) => void;
    stages: AwarenessStage[];
    speakerAge?: string | null;
    id?: string;
    className?: string;
}) {
    return (<div className={cn("min-w-0", className)}>
      <Select value={value ?? STORY_DECIDES} onValueChange={(v) => onChange(v === STORY_DECIDES ? null : (v as LengthPreset))}>
        <SelectTrigger className="w-full" data-testid={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={STORY_DECIDES}>Let the story decide</SelectItem>
          {LENGTH_PRESETS.map((l) => (<SelectItem key={l} value={l}>
              {LENGTH_LABELS[l]}
            </SelectItem>))}
        </SelectContent>
      </Select>
      <p className="mt-1 text-xs text-muted-foreground" data-testid={`${id}-readout`}>
        {lengthReadout(value, stages, speakerAge)}
      </p>
    </div>);
}
