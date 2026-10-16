"use client";
import { Download } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { StudioOutput, StudioRunRow } from "@/db/schema";
import { GALLERY_FOCUS } from "@/lib/studio/gallery";
import { cn } from "@/lib/utils";
import { assetUrl, earlierOutputs, latestOutputs } from "../shared";
import { chooseRenderAction } from "../actions";
import { Button } from "@/components/ui/button";
const TONE = { pass: "border-emerald-200 bg-emerald-50 text-emerald-700", warn: "border-amber-200 bg-amber-50 text-amber-700", fail: "border-red-200 bg-red-50 text-red-700" } as const;
export function EarlierVersions({ identityBase = "Selected Studio item", outputs, onZoom, runId, itemId, disabled, onChanged }: {
    identityBase?: string;
    outputs: StudioOutput[];
    onZoom: (url: string) => void;
    runId: string;
    itemId: string;
    disabled?: boolean;
    onChanged: (run: StudioRunRow) => void;
}) {
    const summary = useRef<HTMLElement>(null), comparison = useRef<HTMLDivElement>(null);
    const restoreFocus = () => requestAnimationFrame(() => summary.current?.focus());
    const older = earlierOutputs(outputs);
    const [compare, setCompare] = useState<string | null>(null);
    const [pending, start] = useTransition();
    const candidate = outputs.find((o) => o.path === compare);
    const current = candidate && latestOutputs(outputs).find((o) => o.aspect === candidate.aspect);
    if (!older.length)
        return null;
    return (<details className="basis-full text-xs" data-testid="earlier-versions">
      <summary ref={summary} aria-label={`Earlier versions of ${identityBase}`} className={`cursor-pointer text-muted-foreground hover:text-foreground ${GALLERY_FOCUS}`}>
        {older.length} earlier version{older.length === 1 ? "" : "s"}
      </summary>
      {candidate && current && <div ref={comparison} tabIndex={-1} role="region" aria-label={`Version comparison for ${identityBase}`} className={`mt-3 space-y-2 rounded-lg border p-3 ${GALLERY_FOCUS}`} data-testid="render-comparison">
        <p>Same ratio and display scale. The original pixels are preserved.</p>
        <div className="grid grid-cols-2 gap-3">
          {[{ output: current, label: "Current" }, { output: candidate, label: "Alternative" }].map(({ output, label }) => <figure key={label}><img src={assetUrl(output.path, 640)} alt={`${identityBase}; ${label}; ${output.aspect}; version ${output.version}; copy ${output.copy_status ?? "unreviewed"}; image ${output.qa?.status ?? "unreviewed"}`} className="w-full rounded border object-contain" style={{ aspectRatio: output.aspect.replace(":", " / ") }}/><figcaption className="mt-1">{label}: v{output.version}</figcaption></figure>)}
        </div>
        <Button size="sm" disabled={disabled || pending} aria-label={`Choose ${identityBase}; ${candidate.aspect}; version ${candidate.version}; copy ${candidate.copy_status ?? "unreviewed"}; image ${candidate.qa?.status ?? "unreviewed"}`} data-testid="choose-render" onClick={() => start(async () => { const res = await chooseRenderAction(runId, itemId, candidate.path); if (!res.ok)
            return void toast.error(res.error); onChanged(res.run); setCompare(null); restoreFocus(); toast.success("Selected version is now current for preview and export."); })}>Use version {candidate.version}</Button>
        <Button size="sm" variant="ghost" onClick={() => { setCompare(null); restoreFocus(); }}>Close comparison</Button>
        <p className="text-muted-foreground">The plan is kept as it stands. Check any edited words against the selected image before delivery.</p>
      </div>}
      <ul className="mt-2 grid grid-cols-3 gap-2">
        {older.map((o) => {
            const url = assetUrl(o.path);
            return (<li key={o.path} data-testid="earlier-version">
              <button type="button" onClick={() => onZoom(url)} className={`block w-full ${GALLERY_FOCUS}`} title="Open at full size" aria-label={`Inspect ${identityBase}; ${o.aspect}; version ${o.version}; copy ${o.copy_status ?? "unreviewed"}; image ${o.qa?.status ?? "unreviewed"}`}>

                <img src={assetUrl(o.path, 240)} alt={`${identityBase}; ${o.aspect}; version ${o.version}; copy ${o.copy_status ?? "unreviewed"}; image ${o.qa?.status ?? "unreviewed"}`} className="w-full rounded border bg-muted" loading="lazy"/>
              </button>
              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <span>
                  {o.aspect} v{o.version}
                </span>
                {o.qa && <span className={cn("rounded-full border px-1", TONE[o.qa.status])}>{o.qa.status === "pass" ? "passed" : o.qa.status === "warn" ? "check" : "failed"}</span>}
                <a href={url} download className="ml-auto hover:text-foreground" title={`Download version ${o.version}`} aria-label={`Download ${identityBase}; ${o.aspect}; version ${o.version}; copy ${o.copy_status ?? "unreviewed"}; image ${o.qa?.status ?? "unreviewed"}`}>
                  <Download className="size-3"/>
                </a>
              </div>
              <button type="button" className={`mt-1 min-h-9 text-primary hover:underline ${GALLERY_FOCUS}`} aria-label={`Compare ${identityBase}; ${o.aspect}; version ${o.version}; copy ${o.copy_status ?? "unreviewed"}; image ${o.qa?.status ?? "unreviewed"}`} onClick={() => { setCompare(o.path); requestAnimationFrame(() => comparison.current?.focus()); }} data-testid="compare-render">Compare and choose</button>
            </li>);
        })}
      </ul>
    </details>);
}
