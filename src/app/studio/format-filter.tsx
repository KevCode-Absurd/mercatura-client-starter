"use client";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
export function FormatFilter({ within }: {
    within: string;
}) {
    const [q, setQ] = useState("");
    const [left, setLeft] = useState<number | null>(null);
    const [medium, setMedium] = useState<"all" | "image" | "video">("all");
    useEffect(() => {
        const root = document.getElementById(within);
        if (!root)
            return;
        const words = q.toLowerCase().split(/\s+/).filter(Boolean);
        let n = 0;
        for (const tile of root.querySelectorAll<HTMLElement>("[data-words]")) {
            const hit = words.every((w) => (tile.dataset.words ?? "").includes(w)) && (medium === "all" || tile.dataset.medium === medium);
            tile.hidden = !hit;
            if (hit)
                n++;
        }
        for (const group of root.querySelectorAll<HTMLElement>("[data-format-group]"))
            group.hidden = !group.querySelector("[data-words]:not([hidden])");
        setLeft(words.length ? n : null);
    }, [q, within, medium]);
    return (<div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex overflow-hidden rounded-lg border bg-card text-sm" role="group" aria-label="Show image or video formats" data-testid="format-medium">
        {(["all", "image", "video"] as const).map((m) => (<button key={m} type="button" aria-pressed={medium === m} onClick={() => setMedium(m)} className={`h-10 px-4 ${medium === m ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted"}`} data-testid={`format-medium-${m}`}>
            {m === "all" ? "All" : m === "image" ? "Image" : "Video"}
          </button>))}
      </div>
      <label className="relative block max-w-full">
        <span className="sr-only">Find a format</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a format: comic, video, brief..." className="h-10 w-80 max-w-full rounded-lg border bg-card pl-8 pr-8 text-sm outline-none focus:border-primary [&::-webkit-search-cancel-button]:hidden" data-testid="format-filter"/>
        {q && (<button type="button" onClick={() => setQ("")} aria-label="Clear" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground">
            <X className="size-4"/>
          </button>)}
      </label>
      {left !== null && (<span className="text-sm text-muted-foreground" data-testid="format-filter-count" role="status">
          {left === 0 ? "No format has those words. Try 1 word, or say it in the chat." : `${left} format${left === 1 ? "" : "s"}`}
        </span>)}
    </div>);
}
