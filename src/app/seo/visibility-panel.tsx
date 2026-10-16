"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SeoContext } from "@/lib/seo/model";
import { buildVisibilityPrompts, defaultVisibilityModelIds, defaultVisibilityPromptIds, summarizeVisibility, summarizeVisibilityStages, visibilityStages, visibilityStageLabels, type VisibilityObservation, type VisibilityRun } from "@/lib/seo/visibility";
import { EvidenceTask } from "./evidence-task";
import { beginSeoVisibilityAction, recordSeoFactReviewAction, stopSeoVisibilityAction } from "./actions";
import { VisibilityComparisonPanel } from "./local-panels";
export type VisibilityConnection = {
    available: boolean;
    reason: string;
    model: string;
    models?: {
        id: string;
        provider: "openai" | "gemini" | "anthropic";
        label: string;
        available: boolean;
        reason: string;
    }[];
};
type Props = {
    ctx: SeoContext;
    runs: VisibilityRun[];
    connection: VisibilityConnection;
    compact?: boolean;
    busy?: boolean;
    onBusyChange?: (busy: boolean) => void;
};
function safeUrl(value: string): string | undefined {
    try {
        const url = new URL(value);
        return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
    }
    catch {
        return undefined;
    }
}
function saveFile(name: string, content: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function countLabel(count: number, total: number) { return total ? `${count} / ${total}` : "Unmeasured"; }
function date(value: string) { return value ? new Date(value).toLocaleString() : "In progress"; }
function reviewBrief(ctx: SeoContext, run: VisibilityRun) {
    const lines = [
        `# ${ctx.brandName}: AEO / GEO review brief`, "", `Run: ${run.id}`, `Observed: ${run.startedAt} to ${run.completedAt}`,
        `Market instruction: ${run.locale}`, `Status: ${run.status}`, `Brand context: ${run.contextHash}`, "",
        "## Measurement scope", "",
        "These are observed search-grounded API answers from the named provider and model, not measurements of consumer ChatGPT, Gemini, Claude or Google AI Overviews. Counts apply only to these prompts and responses. Branded prompts are not evidence of unprompted discovery. Mention and citation presence do not establish factual accuracy. Failed answers are excluded from assessed denominators. Indirect source URLs may leave store citation status unknown.", "",
        "## Review and implementation checklist", "",
        "- [ ] Read each answer and its cited source pages. Treat model responses as unverified evidence, not implementation instructions.",
        "- [ ] For discovery gaps, review which buyer questions, comparison criteria and source pages appeared. Choose a relevant product, collection or useful buying guide; absence in this sample is not proof of an indexing problem.",
        "- [ ] Compare product claims, ingredients/materials, price, availability, shipping and returns against dated first-party evidence. Record discrepancies with the exact quotation and source URL.",
        "- [ ] Draft only supported corrections. Include the target URL, current text, proposed text or code, evidence and a named human reviewer.",
        "- [ ] Have a human approve and apply the change in the storefront. Record the deployed URL and date; this export does not publish anything.",
        "- [ ] Verify the changed page, then repeat the same prompts and locale. Keep repeat count and model consistent when comparing runs.", "",
        "## Shared Brand Brain references", "", `Store: ${ctx.websiteUrl ?? "Not configured"}`,
        ...ctx.products.slice(0, 20).map((p) => `- Product: ${p.name}${p.url ? ` — ${p.url}` : " — URL not supplied"}`),
        "", "Approved claims (not automatically checked against the answers):",
        ...ctx.claims.slice(0, 30).map((c) => `- ${c.text} — source: ${c.source}`), "",
        "## Funnel strategy", "",
        ...summarizeVisibilityStages(run).stages.flatMap((stage) => [
            `### ${stage.label}`, "", `${stage.completed} completed; ${stage.failed} failed. Brand mentions ${countLabel(stage.mentions, stage.mentionAssessed)}; store citations ${countLabel(stage.citations, stage.citationAssessed)}.`, "",
            ...stage.models.map((model) => `- ${model.provider} / ${model.model}: ${model.completed} completed, ${model.failed} failed; mentions ${countLabel(model.mentions, model.mentionAssessed)}; store cited ${countLabel(model.citations, model.citationAssessed)}.`), "",
            ...stage.recommendations.map((item) => `- ${item.title}: ${item.detail} Evidence IDs: ${item.observationIds.join(", ")}`), "",
        ]), "## Observations", "",
    ];
    for (const o of run.observations) {
        lines.push(`### ${visibilityStageLabels[o.prompt.stage ?? "unclassified"]} · ${o.prompt.cohort} · repeat ${o.repeat}`, "", `Prompt ID: ${o.prompt.id}`, `Prompt: ${o.prompt.text}`, `Provider: ${o.provider}`, `Model: ${o.model} · ${o.observedAt}`, `Status: ${o.status}`, `Brand mentioned: ${o.brandMentioned === null ? "Unknown" : o.brandMentioned ? "Yes" : "No"}`, `Store cited: ${o.storeCited === null ? "Unknown" : o.storeCited ? "Yes" : "No"}`, "", o.error ? `Collection error: ${o.error}` : "Answer:", "", o.answer, "", "Citations:", ...o.citations.map((c) => `- ${c.title}: ${c.url}`), "", `Human fact review: ${o.factReview?.status ?? "Pending"}`, `Reviewed at: ${o.factReview?.reviewedAt ?? "Not reviewed"}`, `Review note: ${o.factReview?.note ?? ""}`, `Reference source: ${o.factReview?.sourceUrl ?? ""}`, "", `Target URL: ${o.prompt.targetUrl ?? ""}`, "Current claim / evidence:", "Proposed correction:", "Reviewer / implementation date:", "");
    }
    return lines.join("\n");
}
export function VisibilityPanel({ ctx, runs, connection, compact = false, busy = false, onBusyChange }: Props) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [stopPending, stopTransition] = useTransition();
    const [stopRequested, setStopRequested] = useState(false);
    const prompts = buildVisibilityPrompts(ctx);
    const models = connection.models ?? [{ id: connection.model, provider: "openai" as const, label: `${connection.model} + web search`, available: connection.available, reason: connection.reason }];
    const [localRuns, setLocalRuns] = useState(runs);
    const [watching, setWatching] = useState(runs.some((r) => r.brandId === ctx.brandId && r.contextHash === ctx.contextHash && r.status === "running"));
    const [pollError, setPollError] = useState("");
    const [promptIds, setPromptIds] = useState(() => defaultVisibilityPromptIds(prompts));
    const [modelIds, setModelIds] = useState(() => defaultVisibilityModelIds(models));
    const [selectedRun, setSelectedRun] = useState("");
    const [cohort, setCohort] = useState("all");
    const [stageFilter, setStageFilter] = useState("all");
    const [modelFilter, setModelFilter] = useState("all");
    const [repeats, setRepeats] = useState<1 | 2>(1);
    const [locale, setLocale] = useState(ctx.market || "United States");
    const [elapsed, setElapsed] = useState(0);
    const currentRuns = localRuns.filter((run) => run.brandId === ctx.brandId && run.contextHash === ctx.contextHash).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    const staleCount = localRuns.filter((run) => run.brandId === ctx.brandId && run.contextHash !== ctx.contextHash).length;
    const run = currentRuns.find((r) => r.id === selectedRun) ?? currentRuns[0];
    const [reviewing, setReviewing] = useState(false);
    const reviewBusy = (value: boolean) => { setReviewing(value); };
    const summary = run ? summarizeVisibility(run) : undefined;
    const funnel = run ? summarizeVisibilityStages(run) : undefined;
    const selectedPrompts = prompts.filter((p) => promptIds.includes(p.id));
    const selectedModels = models.filter((model) => model.available && modelIds.includes(model.id));
    const plannedCalls = selectedPrompts.length * selectedModels.length * repeats;
    const locked = pending || busy || watching || reviewing;
    useEffect(() => { setPromptIds(buildVisibilityPrompts(ctx).map((p) => p.id)); setSelectedRun(""); setStageFilter("all"); setModelFilter("all"); setCohort("all"); }, [ctx.contextHash]);
    useEffect(() => { setLocalRuns(runs); if (runs.some((r) => r.brandId === ctx.brandId && r.contextHash === ctx.contextHash && r.status === "running"))
        setWatching(true); }, [runs, ctx.brandId, ctx.contextHash]);
    useEffect(() => { onBusyChange?.(pending || watching || reviewing); return () => onBusyChange?.(false); }, [pending, watching, reviewing, onBusyChange]);
    useEffect(() => {
        let disposed = false, inFlight = false;
        const refresh = async () => {
            if (inFlight)
                return;
            inFlight = true;
            try {
                const response = await fetch(`/api/seo/visibility?brandId=${encodeURIComponent(ctx.brandId)}`, { cache: "no-store" });
                if (!response.ok)
                    throw new Error("Could not refresh the saved audit.");
                const data = await response.json() as {
                    runs: VisibilityRun[];
                    running: boolean;
                };
                if (!disposed) {
                    setLocalRuns(data.runs);
                    setPollError("");
                    if (data.running)
                        setWatching(true);
                    else {
                        setWatching(false);
                        setStopRequested(false);
                        if (watching)
                            router.refresh();
                    }
                }
            }
            catch {
                if (!disposed)
                    setPollError("Progress could not be refreshed. Retrying automatically; saved responses remain available.");
            }
            finally {
                inFlight = false;
            }
        };
        void refresh();
        const timer = watching ? window.setInterval(() => void refresh(), 3000) : undefined;
        return () => { disposed = true; if (timer)
            window.clearInterval(timer); };
    }, [watching, ctx.brandId, router]);
    useEffect(() => {
        if (!pending && !watching)
            return;
        const started = currentRuns.find((r) => r.status === "running")?.startedAt;
        const began = started ? new Date(started).getTime() : Date.now();
        const timer = window.setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - began) / 1000))), 1000);
        return () => window.clearInterval(timer);
    }, [pending, watching, currentRuns.find((r) => r.status === "running")?.startedAt]);
    const collect = () => {
        if (locked || !connection.available || !ctx.websiteUrl || locale.trim().length < 2 || !plannedCalls)
            return;
        setElapsed(0);
        setStopRequested(false);
        start(async () => {
            try {
                const result = await beginSeoVisibilityAction(ctx.brandId, { repeats, locale: locale.trim(), modelIds: selectedModels.map((m) => m.id), promptIds: selectedPrompts.map((p) => p.id) });
                if (!result.ok)
                    toast.error(result.error);
                else {
                    setSelectedRun(result.value.id);
                    setWatching(true);
                    setStageFilter("all");
                    setModelFilter("all");
                    setCohort("all");
                    toast.success(`Visibility audit started: ${plannedCalls} planned responses. Progress is saved as answers arrive.`);
                }
            }
            catch {
                toast.error("Visibility collection could not finish. Previous saved runs are preserved.");
            }
        });
    };
    const stop = () => stopTransition(async () => {
        try {
            const result = await stopSeoVisibilityAction(ctx.brandId);
            if (!result.ok)
                toast.error(result.error);
            else {
                setStopRequested(true);
                toast.success("Stop requested. Active requests will finish and collected evidence will be kept.");
            }
        }
        catch {
            toast.error("Could not request a stop. Check progress and try again.");
        }
    });
    return <section className="rounded-xl border bg-card p-5" data-testid="seo-visibility-panel">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">How AI answers questions about your market</h2><p className="mt-1 text-sm text-muted-foreground">Test likely customer questions, see where your brand appears, and review what to improve.</p></div><Badge variant="outline">{watching ? "Collecting responses" : run ? "Saved AI answers" : "Not measured"}</Badge></div>
    <p className="mt-3 text-sm text-muted-foreground">These tests use AI models with web search. They do not measure rankings in ChatGPT, Gemini, Claude or Google AI Overviews.</p><details className="mt-2 text-xs text-muted-foreground"><summary className="font-medium">How to read these results</summary><p className="mt-2 leading-relaxed">Questions are suggestions based on your brand details, not measured search demand. Counts cover only the answers collected. Failed answers and results we could not check are excluded from the relevant totals. Website checks and AI answers are measured separately.</p></details>
    {!connection.available && <div className="mt-4 rounded-lg border bg-muted/50 p-4 text-sm"><p className="font-medium">Connect an AI provider to run this audit</p><p className="mt-1 text-muted-foreground">Ask your administrator to enable AI audits and connect a provider.</p><details className="mt-2 text-xs text-muted-foreground"><summary>Connection details</summary><p className="mt-2">{connection.reason}</p></details><p className="mt-2 text-xs text-muted-foreground">Public website audits still run. No store-owner or Search Console access is needed for model response collection.</p></div>}
    {run ? <>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{(["discovery", "branded"] as const).map((kind) => {
                const stats = summary![kind];
                return <div key={kind} className="rounded-lg border p-4"><h3 className="text-sm font-semibold">{kind === "discovery" ? "Unbranded discovery" : "Brand-specific answers"}</h3><p className="mt-1 text-xs text-muted-foreground">{kind === "discovery" ? "The prompt does not name your brand." : "The prompt already names your brand."}</p><dl className="mt-4 grid grid-cols-2 gap-3"><div><dt className="text-xs text-muted-foreground">Brand mentioned</dt><dd className="mt-1 text-2xl font-semibold">{countLabel(stats.mentions, stats.mentionAssessed)}</dd></div><div><dt className="text-xs text-muted-foreground">Store cited</dt><dd className="mt-1 text-2xl font-semibold">{countLabel(stats.citations, stats.citationAssessed)}</dd></div></dl><p className="mt-3 text-xs text-muted-foreground">{stats.completed} completed / {stats.total} collected · {stats.failed} failed</p></div>;
            })}</div>
      <p className="mt-3 text-xs text-muted-foreground">{date(run.completedAt)} · Market instruction: {run.locale} · {run.status} · {run.observations.length} / {run.plannedResponses ?? run.observations.length} planned responses collected · {run.costEstimated ? "Recorded cost including estimated allowances" : "Recorded API cost"} ${run.costUsd.toFixed(4)}. Failed or unassessed observations are excluded from mention and citation denominators. A small sample is not market-wide visibility.</p>
      {run.status === "running" && <div role="status" aria-live="polite" className="mt-3 rounded-lg bg-accent/50 p-3 text-sm"><p className="font-medium">{stopRequested ? "Finishing active requests" : watching ? "Collecting answers in the background" : "Partial saved run"} · {elapsed}s</p><p className="mt-1">{run.observations.length} / {run.plannedResponses ?? "—"} responses collected · {summary?.completed ?? 0} completed · {summary?.failed ?? 0} failed. Results refresh every three seconds while collection is active.</p><div className="mt-3 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${run.plannedResponses ? Math.min(100, run.observations.length / run.plannedResponses * 100) : 0}%` }}/></div><p className="mt-2 text-xs text-muted-foreground">You can read evidence or return later. The local server must stay running for collection to continue. Saved responses survive a page reload.</p>{!compact && watching && <Button variant="outline" size="sm" className="mt-3" disabled={stopPending || stopRequested} onClick={stop}>{stopPending || stopRequested ? "Stopping after active requests…" : "Stop audit and keep results"}</Button>}</div>}
    </> : <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No AI answers saved for your current brand details. Run an audit to see whether your brand appears and which sources are used.</p>}
    {staleCount > 0 && <p className="mt-3 text-xs text-muted-foreground">{staleCount} earlier {staleCount === 1 ? "run is" : "runs are"} excluded because the shared Brand Brain changed. New measurements use the current brand context.</p>}
    {!compact && <VisibilityComparisonPanel runs={currentRuns}/>}
    {compact ? <Link href="/seo/geo" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">See AI answers and run an audit →</Link> : <>
      <div className="mt-5 border-t pt-5">
        <h3 className="text-sm font-semibold">Choose models to compare</h3>
        <p className="mt-1 text-xs text-muted-foreground">A run starts with 1 model and 20 of the 40 questions. Tick a second model, or more questions below, to widen it: each added model asks every chosen question again.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">{models.map((model) => <label key={model.id} className={`flex items-start gap-3 rounded-lg border p-4 ${locked || !model.available ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted"}`}><input type="checkbox" className="mt-1 size-4 accent-primary" checked={model.available && modelIds.includes(model.id)} disabled={locked || !model.available} onChange={(event) => setModelIds((ids) => event.target.checked ? [...ids, model.id] : ids.filter((id) => id !== model.id))}/><span className="min-w-0"><span className="block text-sm font-medium">{model.label}</span><span className="mt-2 block text-xs text-muted-foreground">{model.available ? "Ready to run" : "Connection needed"}</span></span></label>)}</div>
        <div className="mt-4 flex flex-wrap items-end gap-3"><label className="min-w-44 flex-1 text-sm font-medium">Target market<Input aria-label="Visibility market" className="mt-2" value={locale} minLength={2} maxLength={100} onChange={(e) => setLocale(e.target.value)} disabled={locked}/></label><label className="text-sm font-medium">Responses per question<select aria-label="Responses per prompt" className="mt-2 block w-full rounded-md border bg-background p-2 text-sm" value={repeats} onChange={(e) => setRepeats(Number(e.target.value) as 1 | 2)} disabled={locked}><option value={1}>1 response per model</option><option value={2}>2 independent responses per model</option></select></label><Button disabled={locked || !connection.available || !ctx.websiteUrl || locale.trim().length < 2 || !plannedCalls} onClick={collect}><RefreshCw className={pending || watching ? "size-4 animate-spin" : "size-4"}/>{pending ? "Starting audit…" : watching ? "Audit in progress" : "Run AI visibility audit"}</Button></div>
        <p className="mt-3 text-sm font-medium">{selectedPrompts.length} questions × {selectedModels.length} {selectedModels.length === 1 ? "model" : "models"} × {repeats} {repeats === 1 ? "repeat" : "repeats"} = {plannedCalls} planned responses</p><p className="mt-2 text-xs text-muted-foreground">Each question is sent independently. Uses the app’s live-mode and spend limits. Market is an instruction, not a guaranteed physical search location. Larger scans can take several minutes; collected answers appear as they finish.</p>
      </div>
      {pollError && <p role="status" className="mt-4 rounded-lg border p-3 text-sm text-muted-foreground">{pollError}</p>}
      {watching && !currentRuns.some((r) => r.status === "running") && <p role="status" className="mt-4 rounded-lg bg-accent/50 p-4 text-sm">Audit started. Waiting for the first saved progress update…</p>}
      <details className="mt-4 rounded-lg border p-4"><summary className="cursor-pointer text-sm font-semibold">Review and select the exact questions · {selectedPrompts.length} / {prompts.length}</summary><p className="mt-3 text-xs text-muted-foreground">Problem questions begin with a person’s everyday situation. Later stages explore options, compare products, investigate the brand and check purchase details. Select the questions you want to measure; none of these queries have a verified search volume.</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={locked} onClick={() => setPromptIds(defaultVisibilityPromptIds(prompts))}>Select the starting 20</Button><Button variant="outline" size="sm" disabled={locked} onClick={() => setPromptIds(prompts.map((p) => p.id))}>Select all {prompts.length}</Button><Button variant="outline" size="sm" disabled={locked} onClick={() => setPromptIds([])}>Clear selection</Button></div>
        <div className="mt-4 max-h-[36rem] space-y-5 overflow-y-auto pr-1">{visibilityStages.map((stage) => {
                const questions = prompts.filter((p) => p.stage === stage);
                return <fieldset key={stage} className="rounded-lg border p-3"><legend className="px-2 text-sm font-semibold">{visibilityStageLabels[stage]} · {questions.filter((p) => promptIds.includes(p.id)).length} / {questions.length}</legend><ol className="space-y-2">{questions.map((p, index) => <li key={p.id}><label className="flex cursor-pointer items-start gap-3 rounded-lg bg-muted/40 p-3 text-sm"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" disabled={locked} checked={promptIds.includes(p.id)} onChange={(event) => setPromptIds((ids) => event.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id))}/><span><span className="mr-2 text-xs text-muted-foreground">{index + 1}.</span>{p.text}<span className="mt-2 block text-xs text-muted-foreground">{p.cohort === "discovery" ? "Unbranded question" : "Brand-specific question"}</span></span></label></li>)}</ol></fieldset>;
            })}</div>
      </details>
      {run && <>
        <div className="mt-5 flex flex-wrap items-end gap-3"><label className="min-w-48 flex-1 text-sm font-medium">Saved run<select aria-label="Saved visibility run" className="mt-2 block w-full rounded-md border bg-background p-2 text-sm" value={run.id} onChange={(e) => setSelectedRun(e.target.value)}>{currentRuns.map((r) => <option key={r.id} value={r.id}>{date(r.completedAt)} · {r.locale} · {r.status}</option>)}</select></label><Button variant="outline" onClick={() => saveFile(`visibility-${ctx.brandId}-${run.id}.json`, JSON.stringify(run, null, 2), "application/json")}><Download className="size-4"/>Download data (JSON)</Button><Button variant="outline" onClick={() => saveFile(`visibility-review-${ctx.brandId}-${run.id}.md`, reviewBrief(ctx, run), "text/markdown")}><Download className="size-4"/>Download review brief</Button></div>
        {funnel && <>
          <div className="mt-5 rounded-lg border p-4"><h3 className="font-semibold">Compare models across the buying journey</h3><p className="mt-2 text-xs text-muted-foreground">Counts are observed responses, not ranks. Each metric uses only its assessed responses. Unknown citation destinations, failed calls and earlier prompts without a stage remain explicit.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b"><th className="min-w-44 p-3">Funnel stage</th>{funnel.models.map((model) => <th key={`${model.provider}:${model.model}`} className="min-w-48 p-3 font-medium">{model.provider}<br /><span className="break-all text-muted-foreground">{model.model}</span></th>)}</tr></thead><tbody>{funnel.stages.map((stage) => <tr key={stage.stage} className="border-b align-top"><th className="p-3 font-medium">{stage.label}</th>{funnel.models.map((model) => {
                            const cell = stage.models.find((item) => item.provider === model.provider && item.model === model.model);
                            return <td key={`${model.provider}:${model.model}`} className="p-3">{cell ? <><p>{cell.completed} completed · {cell.failed} failed</p><p className="mt-2">Mentions: <strong>{countLabel(cell.mentions, cell.mentionAssessed)}</strong></p><p className="mt-1">Store cited: <strong>{countLabel(cell.citations, cell.citationAssessed)}</strong></p></> : <span className="text-muted-foreground">No responses collected</span>}</td>;
                        })}</tr>)}</tbody></table></div></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">{funnel.models.map((model) => <div key={`${model.provider}:${model.model}`} className="rounded-lg border p-4"><h3 className="break-all text-sm font-semibold">{model.provider} · {model.model}</h3><p className="mt-2 text-xs text-muted-foreground">{model.completed} completed / {model.total} collected · {model.failed} failed</p><p className="mt-3 text-sm">Brand mentions {countLabel(model.mentions, model.mentionAssessed)} · Store cited {countLabel(model.citations, model.citationAssessed)}</p>{model.citationAssessed < model.completed && <p className="mt-2 text-xs text-muted-foreground">{model.completed - model.citationAssessed} answers have unknown store citation status. Indirect source links are not treated as missing citations.</p>}</div>)}</div>
          <div className="mt-5 space-y-3"><h3 className="font-semibold">What to work on at each stage</h3>{funnel.stages.map((stage) => <details key={stage.stage} className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-semibold">{stage.label} · {stage.completed} completed / {stage.total} collected</summary>{stage.recommendations.length ? <div className="mt-3 space-y-4">{stage.recommendations.map((item) => <div key={item.id}><h4 className="text-sm font-medium">{item.title}</h4><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.detail}</p><div className="mt-2 flex flex-wrap items-center gap-3"><span className="text-xs text-muted-foreground">{item.observationIds.length} supporting response records</span><button type="button" className="text-xs font-medium text-primary underline" onClick={() => { setStageFilter(stage.stage); setModelFilter("all"); setCohort("all"); document.getElementById("visibility-response-evidence")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Review this stage’s responses</button></div></div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No evidence-backed recommendation is available for this stage yet. Collect usable responses before choosing changes.</p>}</details>)}</div>
        </>}
        <div className="mt-4 rounded-lg bg-accent/40 p-4 text-sm"><p className="font-medium">Review the facts before making changes</p><p className="mt-1 text-muted-foreground">A brand mention is not an endorsement and a citation does not prove accuracy. Compare answers with approved Brand Brain claims and current product and policy pages. Export a review brief to record corrections, target URLs, reviewer decisions and manual implementation.</p></div>
        {!!summary?.recommendations.length && <div className="mt-4 space-y-3"><h3 className="text-sm font-semibold">Follow-up priorities from this sample</h3>{summary.recommendations.map((item) => <div key={item.id} className="rounded-lg border p-3"><h4 className="text-sm font-medium">{item.title}</h4><p className="mt-1 text-sm text-muted-foreground">{item.detail}</p><p className="mt-2 text-xs text-muted-foreground">Supported by {item.observationIds.length} response {item.observationIds.length === 1 ? "record" : "records"}. Review evidence before choosing a fix.</p></div>)}</div>}
        <details className="mt-4 rounded-lg border p-4"><summary className="cursor-pointer text-sm font-semibold">Approved Brand Brain facts for human review · {ctx.claims.length}</summary><p className="mt-3 text-xs text-muted-foreground">These are the shared approved claims, not evidence that every answer is accurate. Check time-sensitive prices, availability and policies on current official pages.</p><ul className="mt-3 space-y-3">{ctx.claims.map((claim) => <li key={claim.id} className="text-sm"><p>{claim.text}</p><p className="mt-1 break-all text-xs text-muted-foreground">Source: {safeUrl(claim.source) ? <a href={safeUrl(claim.source)} target="_blank" rel="noreferrer" className="text-primary underline">{claim.source}</a> : claim.source || "No source supplied"}</p></li>)}</ul><Link href="/brand" className="mt-4 inline-block text-sm text-primary underline">Open shared Brand Brain</Link></details>
        <div id="visibility-response-evidence" className="mt-6 scroll-mt-6"><h3 className="font-semibold">Answers to each question</h3><div className="mt-3 flex flex-wrap items-end gap-3"><label className="min-w-48 flex-1 text-sm font-medium">Funnel stage<select aria-label="Filter responses by funnel stage" className="mt-2 block w-full rounded-md border bg-background p-2 text-sm" value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="all">All stages</option>{[...visibilityStages, "unclassified" as const].map((stage) => <option key={stage} value={stage}>{visibilityStageLabels[stage]}</option>)}</select></label><label className="min-w-48 flex-1 text-sm font-medium">Model<select aria-label="Filter responses by model" className="mt-2 block w-full rounded-md border bg-background p-2 text-sm" value={modelFilter} onChange={(event) => setModelFilter(event.target.value)}><option value="all">All models</option>{funnel?.models.map((model) => <option key={`${model.provider}:${model.model}`} value={`${model.provider}:${model.model}`}>{model.provider} · {model.model}</option>)}</select></label></div><div className="mt-3 flex flex-wrap gap-2" aria-label="Filter visibility responses">{[["all", "All question types"], ["discovery", "Unbranded discovery"], ["branded", "Brand-specific"]].map(([value, label]) => <Button key={value} variant={cohort === value ? "default" : "outline"} onClick={() => setCohort(value)}>{label}</Button>)}</div></div>
        <div className="mt-4 space-y-3">{run.observations.filter((o) => (cohort === "all" || o.prompt.cohort === cohort) && (stageFilter === "all" || (o.prompt.stage ?? "unclassified") === stageFilter) && (modelFilter === "all" || `${o.provider}:${o.model}` === modelFilter)).map((observation) => <Observation key={`${observation.id}:${observation.factReview?.reviewedAt ?? "unreviewed"}`} observation={observation} ctx={ctx} brandId={ctx.brandId} runId={run.id} busy={pending || busy || reviewing || run.status === "running"} onBusyChange={reviewBusy}/>)}{!run.observations.some((o) => (cohort === "all" || o.prompt.cohort === cohort) && (stageFilter === "all" || (o.prompt.stage ?? "unclassified") === stageFilter) && (modelFilter === "all" || `${o.provider}:${o.model}` === modelFilter)) && <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No collected responses match these filters yet.</p>}</div>
      </>}
    </>}
  </section>;
}
function Observation({ observation: o, ctx, brandId, runId, busy, onBusyChange }: {
    observation: VisibilityObservation;
    ctx: SeoContext;
    brandId: string;
    runId: string;
    busy: boolean;
    onBusyChange?: (busy: boolean) => void;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [reviewStatus, setReviewStatus] = useState<"verified" | "discrepancy" | "unverified">(o.factReview?.status ?? "unverified");
    const [note, setNote] = useState(o.factReview?.note ?? "");
    const [sourceUrl, setSourceUrl] = useState(o.factReview?.sourceUrl ?? "");
    const saveReview = () => {
        if (pending || busy)
            return;
        onBusyChange?.(true);
        start(async () => {
            try {
                const result = await recordSeoFactReviewAction(brandId, runId, o.id, { status: reviewStatus, note: note.trim(), sourceUrl: sourceUrl.trim() });
                if (!result.ok)
                    toast.error(result.error);
                else {
                    toast.success("Human fact review saved with this observation.");
                    router.refresh();
                }
            }
            catch {
                toast.error("Could not save the review. Your note is still here.");
            }
            finally {
                onBusyChange?.(false);
            }
        });
    };
    return <article className="rounded-lg border p-4"><div className="flex flex-wrap items-center gap-2"><Badge variant={o.status === "failed" ? "destructive" : "outline"}>{o.status === "completed" ? "Observed answer" : "Collection failed"}</Badge><Badge variant="secondary">{o.prompt.cohort}</Badge><Badge variant="outline">{visibilityStageLabels[o.prompt.stage ?? "unclassified"]}</Badge><span className="text-xs text-muted-foreground">Repeat {o.repeat} · {o.prompt.intent}</span></div><h3 className="mt-3 font-medium">{o.prompt.text}</h3><p className="mt-2 break-all text-xs text-muted-foreground">{o.provider} · {o.model} · {date(o.observedAt)} · {o.locale}</p>
    {o.error && <p className="mt-3 rounded-md bg-muted p-3 text-sm">{o.error}</p>}
    {o.status === "completed" && <><dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm"><div><dt className="inline text-muted-foreground">Brand mentioned: </dt><dd className="inline font-medium">{o.brandMentioned === null ? "Unknown" : o.brandMentioned ? "Yes" : "No"}</dd></div><div><dt className="inline text-muted-foreground">Store cited: </dt><dd className="inline font-medium">{o.storeCited === null ? "Unknown" : o.storeCited ? "Yes" : "No"}</dd></div><div><dt className="inline text-muted-foreground">Fact accuracy: </dt><dd className="inline">{o.factReview?.status === "verified" ? "Human verified (see scope below)" : o.factReview?.status === "discrepancy" ? "Human-reported discrepancy" : "Needs human review"}</dd></div></dl><details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-primary">Read full answer and citations</summary><div className="mt-3 space-y-3 break-words rounded-lg bg-muted/40 p-4 text-sm leading-7 [&_a]:text-primary [&_a]:underline [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-4 [&_ul]:list-disc [&_ol]:list-decimal"><ReactMarkdown components={{ a: ({ href, children }) => { const url = href && safeUrl(href); return url ? <a href={url} target="_blank" rel="noreferrer">{children}</a> : <span>{children}</span>; }, img: ({ alt }) => <span>{alt}</span> }}>{o.answer}</ReactMarkdown></div><h4 className="mt-4 text-sm font-semibold">Cited sources · {o.citations.length}</h4>{o.citations.length ? <ul className="mt-2 space-y-2 text-xs">{o.citations.map((c, i) => <li key={`${c.url}:${i}`}>{safeUrl(c.url) ? <a href={safeUrl(c.url)} target="_blank" rel="noreferrer" className="break-all text-primary underline">{c.title || c.url}<ExternalLink className="ml-1 inline size-3"/><span className="mt-1 block text-muted-foreground">{c.url}</span></a> : <span className="break-all">{c.title} · {c.url} (unsupported URL)</span>}</li>)}</ul> : <p className="mt-2 text-xs text-muted-foreground">No citation URLs were returned with this answer.</p>}</details></>}
    {o.status === "completed" && <details className="mt-4 rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-semibold">Human fact review · {o.factReview?.status === "verified" ? "Human verified" : o.factReview?.status === "discrepancy" ? "Discrepancy recorded" : "Not verified"}</summary>
      <p className="mt-3 text-xs text-muted-foreground">Compare this answer with the approved Brand Brain facts above and current official product or policy pages. Record the exact facts checked and any discrepancy. This decision is made by you, not automatically by the model.</p>
      {o.factReview && <p className="mt-2 text-xs text-muted-foreground">Last saved review: {date(o.factReview.reviewedAt)}</p>}
      <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); saveReview(); }}>
        <label className="block text-sm font-medium">Review decision<select className="mt-2 block w-full rounded-md border bg-background p-2 text-sm" value={reviewStatus} disabled={pending || busy} onChange={(event) => setReviewStatus(event.target.value as typeof reviewStatus)}><option value="unverified">Unverified / still reviewing</option><option value="verified">I verified the checked facts</option><option value="discrepancy">I found a factual discrepancy</option></select></label>
        <label className="block text-sm font-medium">Official source URL<Input className="mt-2" type="url" placeholder="https://store.example/products/…" value={sourceUrl} maxLength={2000} required disabled={pending || busy} onChange={(event) => setSourceUrl(event.target.value)}/></label>
        <label className="block text-sm font-medium">Facts checked, evidence and proposed correction<Textarea className="mt-2 min-h-28" placeholder="Quote the claim, describe what the dated source says, and record the proposed correction if needed (at least 20 characters)." value={note} minLength={20} maxLength={4000} required disabled={pending || busy} onChange={(event) => setNote(event.target.value)}/></label>
        <Button variant="outline" disabled={pending || busy}>{pending ? "Saving review…" : "Save fact check"}</Button>
      </form>
    </details>}
    {o.status === "completed" && <EvidenceTask ctx={ctx} source={{ kind: "visibility", runId, observationId: o.id }} targetUrl={o.prompt.targetUrl ?? ""} disabled={busy || pending || !o.factReview || o.factReview.status === "unverified"}/>}
  </article>;
}
