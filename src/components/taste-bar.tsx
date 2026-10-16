"use client";
import { useRef, type KeyboardEvent } from "react";
import { useMode } from "@/components/mode";
import { LEVER_TITLE, decide, stopHint, stopLabel } from "@/lib/taste/decisions";
import { FIXED, LEVERS_FOR, defaultTaste, lookStops, resolveTaste } from "@/lib/taste/defaults";
import { TASTE_FIELD, compactTaste, tasteJson } from "@/lib/taste/schema";
import { LEVER_STOPS, type LeverKey, type Stage, type Surface, type Taste } from "@/lib/taste/types";
import { cn } from "@/lib/utils";
export { tasteToFormData } from "@/lib/taste/schema";
export interface TasteBarProps {
    surface: Surface;
    stage?: Stage | string | null;
    format?: string | null;
    hasReference?: boolean;
    hasBrandRefs?: boolean;
    productHasPhoto?: boolean;
    value: Taste;
    onChange: (next: Taste) => void;
    view?: "normal" | "advanced";
    hide?: LeverKey[];
    follows?: Partial<Record<LeverKey, string>>;
    id?: string;
    className?: string;
}
export function TasteInput({ value, name = TASTE_FIELD }: {
    value: Taste;
    name?: string;
}) {
    return <input type="hidden" name={name} value={tasteJson(value)} data-testid="taste-input"/>;
}
const NORMAL: LeverKey[] = ["look", "product"];
const NORMAL_ALSO: Partial<Record<TasteBarProps["surface"], LeverKey[]>> = { hooks: ["hooks"] };
export function TasteBar({ surface, stage, format, hasReference = false, hasBrandRefs, productHasPhoto, value, onChange, view, hide = [], follows, id = "taste", className }: TasteBarProps) {
    const sectionView = useMode();
    const advanced = (view ?? sectionView) === "advanced";
    const useCase = { surface, stage, format, hasReference, hasBrandRefs, productHasPhoto };
    const defaults = defaultTaste(useCase);
    const shown = resolveTaste(useCase, value);
    const fixed = FIXED[surface]?.value ?? {};
    const levers = LEVERS_FOR[surface].filter((k) => !hide.includes(k) && !(k in fixed) && (advanced || NORMAL.includes(k) || !!NORMAL_ALSO[surface]?.includes(k)));
    const warnings = decide(useCase, value).warnings;
    const moved = levers.filter((k) => value[k] && value[k] !== defaults[k]);
    const set = (key: LeverKey, stop: string) => onChange(compactTaste({ ...value, [key]: stop }));
    const reset = (key: LeverKey) => {
        const next = { ...value };
        delete next[key];
        onChange(compactTaste(next));
    };
    if (!levers.length)
        return null;
    return (<div className={cn("min-w-0 space-y-4", className)} data-testid={id}>
      {levers.map((key) => {
            const stops = key === "look" ? lookStops(hasReference) : (LEVER_STOPS[key] as readonly string[]);
            const free = follows?.[key];
            const unset = !!free && value[key] === undefined;
            return (<Lever key={key} id={`${id}-${key}`} title={LEVER_TITLE[key]} stops={stops.map((stop) => ({ stop, label: stopLabel(key, stop), isDefault: !free && defaults[key] === stop }))} value={unset ? "" : shown[key]} hint={unset ? free : stopHint(key, shown[key], useCase)} showDefault={advanced} canReset={free ? value[key] !== undefined : advanced && value[key] !== undefined && shown[key] !== defaults[key]} resetLabel={free ? "Let each one decide again" : "Reset"} onPick={(stop) => set(key, stop)} onReset={() => reset(key)}/>);
        })}
      {warnings.length > 0 && (<ul className="space-y-1 text-xs text-muted-foreground" data-testid={`${id}-warnings`}>
          {warnings.map((w) => (<li key={w}>Note: {w}</li>))}
        </ul>)}
      {advanced && moved.length > 1 && (<button type="button" onClick={() => onChange({})} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground" data-testid={`${id}-reset-all`}>
          Reset all to the defaults
        </button>)}
    </div>);
}
interface LeverProps {
    id: string;
    title: string;
    stops: {
        stop: string;
        label: string;
        isDefault: boolean;
    }[];
    value: string;
    hint: string;
    showDefault: boolean;
    canReset: boolean;
    resetLabel?: string;
    onPick: (stop: string) => void;
    onReset: () => void;
}
function Lever({ id, title, stops, value, hint, showDefault, canReset, resetLabel = "Reset", onPick, onReset }: LeverProps) {
    const group = useRef<HTMLDivElement>(null);
    const at = Math.max(0, stops.findIndex((s) => s.stop === value));
    const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
        const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        const to = e.key === "Home" ? 0 : e.key === "End" ? stops.length - 1 : step ? (at + step + stops.length) % stops.length : -1;
        if (to < 0)
            return;
        e.preventDefault();
        onPick(stops[to].stop);
        group.current?.querySelectorAll<HTMLButtonElement>("button[role=radio]")[to]?.focus();
    };
    return (<div className="min-w-0" data-testid={`${id}-lever`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span id={`${id}-label`} className="text-sm font-medium">
          {title}
        </span>
        {canReset && (<button type="button" onClick={onReset} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground" data-testid={`${id}-reset`}>
            {resetLabel}
          </button>)}
      </div>
      <div ref={group} role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={`${id}-hint`} onKeyDown={onKey} className="mt-2 inline-flex max-w-full flex-wrap gap-0.5 rounded-md border p-0.5">
        {stops.map((s, i) => {
            const on = s.stop === value;
            return (<button key={s.stop} type="button" role="radio" aria-checked={on} tabIndex={i === at ? 0 : -1} onClick={() => onPick(s.stop)} className={cn("min-h-9 rounded px-3 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", on ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")} data-testid={`${id}-${s.stop}`}>
              {s.label}
              {showDefault && s.isDefault && <span className={cn("ml-1 text-xs font-normal", on ? "text-primary-foreground/80" : "text-muted-foreground")}>(default)</span>}
            </button>);
        })}
      </div>
      <p id={`${id}-hint`} className="mt-1 max-w-xl text-xs text-muted-foreground" data-testid={`${id}-hint`}>
        {hint}
      </p>
    </div>);
}
