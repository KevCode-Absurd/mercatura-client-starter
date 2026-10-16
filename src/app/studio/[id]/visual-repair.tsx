"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { REPAIR_LABELS, visualRepairPrompt, type VisualRepair } from "@/lib/studio/outputs";
import { repairImageAction } from "../actions";
export function VisualRepairPanel({ runId, itemId, disabled, onStarted }: {
    runId: string;
    itemId: string;
    disabled: boolean;
    onStarted: () => void;
}) {
    const [issue, setIssue] = useState<VisualRepair>("waxy");
    const [area, setArea] = useState("cheeks");
    const [note, setNote] = useState("");
    const [pending, start] = useTransition();
    let prompt = "";
    try {
        prompt = visualRepairPrompt(issue, area, note);
    }
    catch { }
    return <details className="rounded-md border px-3 py-2" data-testid="visual-repair">
    <summary className="cursor-pointer text-sm font-medium">Repair one visual detail</summary>
    <div className="mt-3 space-y-3 text-xs">
      <p>Change one issue on the current picture, keeping identity, crop, lighting, product and unrelated details. Review the result beside the earlier version.</p>
      <Label htmlFor={`repair-issue-${itemId}`}>Visible issue</Label>
      <select id={`repair-issue-${itemId}`} value={issue} onChange={(e) => setIssue(e.target.value as VisualRepair)} className="h-11 w-full rounded border bg-background px-2" data-testid="repair-issue">{Object.entries(REPAIR_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
      <Label htmlFor={`repair-area-${itemId}`}>Only in this area</Label><Input id={`repair-area-${itemId}`} value={area} maxLength={80} onChange={(e) => setArea(e.target.value)} data-testid="repair-area"/>
      <Label htmlFor={`repair-note-${itemId}`}>One specific correction (optional)</Label><Textarea id={`repair-note-${itemId}`} rows={2} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} data-testid="repair-note"/>
      <details><summary className="cursor-pointer">Preview the exact repair direction</summary><p className="mt-2 whitespace-pre-wrap" data-testid="repair-prompt">{prompt || "Name the area; for another issue, also describe what should change."}</p></details>
      <Button size="sm" disabled={disabled || pending || !prompt} data-testid="repair-generate" onClick={() => start(async () => { const res = await repairImageAction(runId, itemId, { issue, area, note }); if (!res.ok)
        return void toast.error(res.error); toast.success("One-detail repair started. The earlier image remains in history."); onStarted(); })}>Generate this repair</Button>
      <p className="text-muted-foreground">Uses one image generation per selected size, plus any existing quality-check retry. No picture changes until you generate.</p>
    </div>
  </details>;
}
