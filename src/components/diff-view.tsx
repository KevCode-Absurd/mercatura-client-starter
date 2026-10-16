import type { DiffLine } from "@/lib/inspect/diff";
import { cn } from "@/lib/utils";
export function DiffView({ lines, className, testId = "edit-diff" }: {
    lines: DiffLine[];
    className?: string;
    testId?: string;
}) {
    return (<div className={cn("overflow-x-auto rounded-lg border bg-card font-mono text-xs leading-relaxed", className)} data-testid={testId}>
      {lines.map((l, i) => (<div key={i} className={cn("whitespace-pre-wrap break-words px-3", l.kind === "gone" && "bg-red-50 text-red-900", l.kind === "new" && "bg-emerald-50 text-emerald-900", l.kind === "skip" && "bg-muted/50 py-0.5 text-center text-muted-foreground")}>
          {l.kind === "skip" ? l.text : `${l.kind === "gone" ? "- " : l.kind === "new" ? "+ " : "  "}${l.text}`}
        </div>))}
    </div>);
}
export function diffCounts(lines: DiffLine[]): string {
    const gone = lines.filter((l) => l.kind === "gone").length;
    const added = lines.filter((l) => l.kind === "new").length;
    return `${added} line${added === 1 ? "" : "s"} in, ${gone} out`;
}
