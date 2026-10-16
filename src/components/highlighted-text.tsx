"use client";
import { splitWithHighlights, type Highlight } from "@/lib/segments";
import { cn } from "@/lib/utils";
export function HighlightedText({ text, start, end, highlights, selectedId, onSelect, }: {
    text: string;
    start: number;
    end: number;
    highlights: Highlight[];
    selectedId?: string | null;
    onSelect?: (id: string) => void;
}) {
    const pieces = splitWithHighlights(text, start, end, highlights);
    return (<>
      {pieces.map((p, i) => {
            if (!p.highlights.length)
                return <span key={i}>{p.text}</span>;
            const h = p.highlights[p.highlights.length - 1];
            const selected = p.highlights.some((x) => x.id === selectedId);
            return (<mark key={i} data-insight={h.id} id={`hl-${h.id}`} role="button" tabIndex={0} onClick={() => onSelect?.(h.id)} onKeyDown={(e) => e.key === "Enter" && onSelect?.(h.id)} className={cn("cursor-pointer rounded-sm px-0.5 text-inherit", selected && "ring-2 ring-offset-1")} style={{
                    background: `${h.color}26`,
                    borderBottom: `2px solid ${h.color}`,
                    ...(selected ? ({ "--tw-ring-color": h.color } as React.CSSProperties) : {}),
                }} title="Open insight">
            {p.text}
          </mark>);
        })}
    </>);
}
