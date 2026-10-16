"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SeoContext } from "@/lib/seo/model";
import type { EvidenceSource, EvidenceChoice } from "@/lib/seo/evidence-planning";
import { createEvidencePlanAction } from "./evidence-actions";
export function EvidenceTask({ ctx, source, targetUrl = "", disabled = false }: {
    ctx: SeoContext;
    source: EvidenceSource;
    targetUrl?: string;
    disabled?: boolean;
}) {
    const [productId, product] = useState(""), [target, setTarget] = useState(targetUrl), [intent, setIntent] = useState<EvidenceChoice["intent"]>("informational"), [taskType, setType] = useState<EvidenceChoice["taskType"]>(source.kind === "search" ? "refresh" : "new"), [reviewed, review] = useState(false), [saved, setSaved] = useState(false), [pending, start] = useTransition();
    return <details className="mt-3 rounded border p-3"><summary className="cursor-pointer text-sm font-medium">{source.kind === "search" ? "Plan a refresh from this evidence" : "Plan content from this reviewed question"}</summary><div className="mt-3 space-y-3 text-sm">
    <p className="text-xs text-muted-foreground">The saved report or model observation will be attached to the task. Select the relevant product and page deliberately. AI responses are not measured keyword demand. {source.kind === "visibility" && "Save a human fact review above first."}</p>
    <label className="block">Related catalogue product<select className="mt-1 block w-full rounded border bg-background p-2" value={productId} onChange={(e) => { product(e.target.value); review(false); }}><option value="">Choose a product</option>{ctx.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label className="block">Preferred store page<Input className="mt-1" value={target} disabled={source.kind === "search"} onChange={(e) => { setTarget(e.target.value); review(false); }} placeholder="Existing or proposed URL on this store" maxLength={2000}/></label>
    <label className="block">Intent<select className="mt-1 block w-full rounded border bg-background p-2" value={intent} onChange={(e) => { setIntent(e.target.value as EvidenceChoice["intent"]); review(false); }}><option value="informational">Informational / answer or guide</option><option value="commercial">Commercial / collection or comparison</option><option value="transactional">Transactional / product or purchase</option></select></label>
    {source.kind === "visibility" && <label className="block">Work needed<select className="mt-1 block w-full rounded border bg-background p-2" value={taskType} onChange={(e) => { setType(e.target.value as EvidenceChoice["taskType"]); review(false); }}><option value="new">Create new content</option><option value="refresh">Refresh existing page</option></select></label>}
    <label className="flex items-start gap-2"><input type="checkbox" checked={reviewed} onChange={(e) => review(e.target.checked)}/>I reviewed buyer intent, product relevance and the proposed destination.</label>
    <Button size="sm" disabled={disabled || pending || !productId || !target || !reviewed} onClick={() => start(async () => { try {
        const result = await createEvidencePlanAction(ctx.brandId, ctx.contextHash, source, { productId, targetUrl: target, intent, taskType, reviewed });
        if (!result.ok)
            return void toast.error(result.error);
        setSaved(true);
        toast.success(result.existing ? "This evidence already has a task in the search plan." : "Task saved with its exact evidence. Assign an owner and due date in the plan.");
    }
    catch {
        toast.error("Could not save the task. Your selections are still here.");
    } })}>{pending ? "Saving…" : "Save evidence task"}</Button>{saved && <Link className="ml-3 underline" href="/seo/planning">Open search plan</Link>}
  </div></details>;
}
