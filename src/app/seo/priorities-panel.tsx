"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { growthPriorities, priorityEvidence, type PriorityInputs } from "@/lib/seo/priorities";
import { blankGrowthInput, growthStatusLabels, type GrowthData, type GrowthInput, type GrowthRow } from "@/lib/seo/growth";
import { studyFor, studyNotesMarkdown } from "@/lib/seo/study";
import { StudyEvidenceNotes } from "./study-evidence";
import { initializeGrowthAction, prepareGrowthBriefsAction, saveGrowthAction } from "./growth-actions";
export function PrioritiesPanel({ input, compact = false, work }: {
    input: PriorityInputs;
    compact?: boolean;
    work?: GrowthData;
}) {
    const [pending, start] = useTransition();
    const current = work?.rows.filter((r) => r.contextHash === input.ctx.contextHash) ?? [];
    const execute = (all: boolean) => start(async () => {
        try {
            const result = all ? await prepareGrowthBriefsAction(input.ctx.brandId, input.ctx.contextHash, work?.revision ?? 0, growthPriorities.map((p) => p.id)) : await initializeGrowthAction(input.ctx.brandId, input.ctx.contextHash, work?.revision ?? 0);
            if (!result.ok)
                toast.error(result.error);
            else
                toast.success(all ? "Work briefs prepared. Existing packages were kept; review them in Handoff." : "All 15 priorities are ready to assign and track.");
        }
        catch {
            toast.error("Unable to save the work plan. Refresh and try again.");
        }
    });
    const exportPlan = () => {
        const text = [`# ${input.ctx.brandName}: 15 D2C organic growth priorities`, `Shared context: ${input.ctx.contextHash}`, "Priority order is a starting sequence, not a forecast. Measurement and new evidence should change your allocation.", ...growthPriorities.flatMap((p, i) => { const row = current.find((r) => r.id === p.id); return [`\n## ${i + 1}. ${p.title}`, p.why, `Evidence: ${priorityEvidence(input, p.id)}`, ...p.steps.map((s, j) => `- [${row?.completedSteps.includes(j) ? "x" : " "}] ${s}`), `Acceptance: ${p.success}`, `Owner: ${row?.owner || "Unassigned"}\nDue: ${row?.dueDate || "Not scheduled"}\nStatus: ${row ? growthStatusLabels[row.status] : "Not started"}`, row?.notes ?? "", row?.verification ? `Human verification: ${row.verification}\nEvidence: ${row.evidenceUrl}` : "Verification outstanding", `Workflow: /seo/${p.workflow}`, studyNotesMarkdown(studyFor({ priority: p.id }))]; })].join("\n\n");
        const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${input.ctx.brandId}-organic-growth-plan.md`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    return <section data-testid="seo-priorities" className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-accent/40 p-5"><div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Your growth plan · 15 priorities</p><h2 className="mt-2 font-serif text-3xl">Help more shoppers find and choose your products.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Start with access and measurement, improve the buying destinations, then grow helpful content and AI discovery. Each priority opens a working tool and shows what we actually know about {input.ctx.brandName}.</p></div>{compact ? <Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary" href="/seo/priorities">Open all 15 priorities<ArrowRight className="size-4"/></Link> : <Button variant="outline" onClick={exportPlan}><Download className="size-4"/>Export growth plan</Button>}</div>
    {!compact && <><div className="rounded-xl border bg-card p-5 space-y-3"><h3 className="font-semibold">Put all 15 priorities to work</h3><p className="text-sm text-muted-foreground">{current.filter((r) => r.status === "verified").length} human verified · {current.filter((r) => r.status === "working").length} in progress · {current.filter((r) => r.status === "blocked").length} blocked. Store completion is recorded separately from available app tools.</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={pending || work?.rows.length === 15} onClick={() => execute(false)}>Create 15 tasks</Button><Button disabled={pending} onClick={() => execute(true)}>{pending ? "Preparing…" : "Draft instructions for all 15 tasks"}</Button><Link href="/seo/changes" className="self-center text-sm underline">Open handoffs</Link></div><p className="text-xs text-muted-foreground">Briefs preserve the current evidence and acceptance criteria. Page-specific code and content are prepared in each working tool. No store changes are made.</p></div><p className="text-xs leading-5 text-muted-foreground">Work through these priorities in order. Track completed work below; results depend on what you apply to your store.</p><div className="grid gap-4 xl:grid-cols-2">{growthPriorities.map((p, i) => <article key={p.id} className="flex flex-col rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3"><span className="font-serif text-3xl text-primary">{String(i + 1).padStart(2, "0")}</span><Badge variant="secondary">{p.lane}</Badge></div>
      <h3 className="mt-4 text-lg font-semibold">{p.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{p.why}</p><p className="my-4 rounded-lg bg-muted p-3 text-xs leading-5">{priorityEvidence(input, p.id)}</p>
      <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm leading-6">{p.steps.map((s) => <li key={s}>{s}</li>)}</ol><p className="mb-5 text-xs leading-5 text-muted-foreground"><strong>Verify:</strong> {p.success}</p>
      <Link className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" href={`/seo/${p.workflow}`}>Work on this priority<ArrowRight className="size-4"/></Link>
      <StudyEvidenceNotes findings={studyFor({ priority: p.id })}/>
      {work && <GrowthEditor key={`${p.id}:${work.revision}`} id={p.id} input={input} row={work.rows.find((r) => r.id === p.id)} work={work}/>}
    </article>)}</div><p className="text-xs leading-6 text-muted-foreground">Grounded in <a href="https://developers.google.com/search/docs/specialty/ecommerce" target="_blank" rel="noreferrer" className="underline">Google’s ecommerce guidance</a> and <a href="https://developers.google.com/search/docs/appearance/ai-features" target="_blank" rel="noreferrer" className="underline">AI search guidance</a>. Helpful content, crawlable pages and accurate product data apply across these surfaces; no special AI file or guaranteed-ranking recipe is implied.</p></>}
  </section>;
}
function GrowthEditor({ id, row, input, work }: {
    id: string;
    row?: GrowthRow;
    input: PriorityInputs;
    work: GrowthData;
}) {
    const stale = row && row.contextHash !== input.ctx.contextHash;
    const [value, setValue] = useState<GrowthInput>(stale ? { ...blankGrowthInput(), owner: row.owner, dueDate: row.dueDate, notes: row.notes } : row ?? blankGrowthInput());
    const [pending, start] = useTransition();
    const field = <K extends keyof GrowthInput>(key: K, next: GrowthInput[K]) => setValue((old) => ({ ...old, [key]: next }));
    const priority = growthPriorities.find((p) => p.id === id)!;
    return <details className="mt-5 border-t pt-4"><summary className="cursor-pointer text-sm font-medium">Track work · {stale ? "Needs context review" : growthStatusLabels[row?.status ?? "planned"]}{row?.owner ? ` · ${row.owner}` : ""}</summary><div className="mt-4 space-y-3">
    {stale && <p className="text-xs text-amber-700">Your brand details changed. Review these steps again before saving; your earlier progress remains saved until then.</p>}
    <label className="block text-sm">Owner<Input className="mt-1" value={value.owner} maxLength={100} onChange={(e) => field("owner", e.target.value)}/></label>
    <label className="block text-sm">Due date<Input className="mt-1" type="date" value={value.dueDate} onChange={(e) => field("dueDate", e.target.value)}/></label>
    <label className="block text-sm">Work status<select className="mt-1 w-full rounded border bg-background p-2" value={value.status} onChange={(e) => field("status", e.target.value as GrowthInput["status"])}>{Object.entries(growthStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Completed steps</legend>{priority.steps.map((step, i) => <label key={i} className="flex items-start gap-2 text-xs leading-5"><input className="mt-1" type="checkbox" checked={value.completedSteps.includes(i)} onChange={(e) => field("completedSteps", e.target.checked ? [...value.completedSteps, i] : value.completedSteps.filter((n) => n !== i))}/>{step}</label>)}</fieldset>
    <label className="block text-sm">Notes or blocker<Textarea className="mt-1" rows={3} maxLength={4000} value={value.notes} onChange={(e) => field("notes", e.target.value)}/></label>
    <label className="block text-sm">Verification evidence URL<Input className="mt-1" type="url" maxLength={2000} value={value.evidenceUrl} onChange={(e) => field("evidenceUrl", e.target.value)} placeholder="https://…"/></label>
    <label className="block text-sm">What you verified<Textarea className="mt-1" rows={3} maxLength={4000} value={value.verification} onChange={(e) => field("verification", e.target.value)} placeholder="Record the date, changed page or report, and what passed the acceptance criteria."/></label>
    <p className="text-xs text-muted-foreground">Human verification needs all three steps, an owner, evidence URL and a specific verification note. It does not automatically confirm indexing, rankings or sales.</p>
    <div className="flex flex-wrap gap-3"><Button size="sm" disabled={pending} onClick={() => start(async () => { try {
        const r = await saveGrowthAction(input.ctx.brandId, input.ctx.contextHash, work.revision, id, value);
        if (r.ok)
            toast.success("Priority saved.");
        else
            toast.error(r.error);
    }
    catch {
        toast.error("Unable to save this priority.");
    } })}>{pending ? "Saving…" : "Save progress"}</Button>{row?.packageId && !stale && <Link className="self-center text-sm underline" href={`/seo/content?id=${encodeURIComponent(row.packageId)}`}>Review work brief</Link>}</div>
  </div></details>;
}
