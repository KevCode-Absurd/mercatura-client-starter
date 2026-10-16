"use client";
import { TasteBar } from "@/components/taste-bar";
import type { LeverKey, Stage, Surface, Taste } from "@/lib/taste/types";
const WORDS_ONLY: LeverKey[] = ["look", "product", "styling", "sell", "finish", "spread", "length", "pace", "people", "hooks"];
export function StudioTaste({ surface, stage, hasReference, value, onChange, feedCopy = false, follows, className, id = "set-taste" }: {
    surface: Surface;
    follows?: Partial<Record<LeverKey, string>>;
    stage?: Stage | null;
    hasReference: boolean;
    value: Taste;
    onChange: (next: Taste) => void;
    feedCopy?: boolean;
    className?: string;
    id?: string;
}) {
    const hasWords = surface !== "photoshoot" && surface !== "storyboard" && surface !== "cast";
    return (<div className={className}>
      <TasteBar surface={surface} stage={stage} hasReference={hasReference} value={value} onChange={onChange} hide={["words"]} follows={follows} id={id}/>
      {hasWords && <TasteBar className="mt-4" surface={surface} stage={stage} hasReference={hasReference} value={value} onChange={onChange} view="advanced" hide={WORDS_ONLY} id={`${id}-words`}/>}
      {feedCopy && <TasteBar className="mt-4" surface="caption" stage={stage} value={value} onChange={onChange} hide={["look", "sell", "spread"]} id={`${id}-copy`}/>}
    </div>);
}
