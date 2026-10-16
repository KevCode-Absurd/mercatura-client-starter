"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, ShieldCheck, XCircle } from "lucide-react";
import { TypePill } from "@/components/bits";
import { Badge } from "@/components/ui/badge";
import type { InsightRow, PipelineStage, SourceItemRow } from "@/db/schema";
import { findContactPii } from "@/lib/pipeline/redact";
import type { InsightType } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { getItemTraceAction, type ItemTrace } from "./actions";
const STAGE_TITLE: Record<PipelineStage["name"], string> = {
    parse: "1. Import and parse",
    regex_redact: "2. Redact contact details (regex, no API)",
    clean: "3. Clean the transcript (fast model)",
    name_redact: "4. Redact names and addresses (fast model)",
    chunk: "5. Chunk the working copy",
};
function wordDiff(before: string, after: string): {
    text: string;
    added: boolean;
}[] {
    const a = before.split(/(\s+)/);
    const b = after.split(/(\s+)/);
    const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--)
        for (let j = b.length - 1; j >= 0; j--)
            dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out: {
        text: string;
        added: boolean;
    }[] = [];
    let i = 0;
    let j = 0;
    while (j < b.length) {
        if (i < a.length && a[i] === b[j]) {
            out.push({ text: b[j], added: false });
            i++;
            j++;
        }
        else if (i < a.length && dp[i + 1][j] >= dp[i][j + 1])
            i++;
        else {
            out.push({ text: b[j], added: /\S/.test(b[j]) });
            j++;
        }
    }
    return out;
}
function Step({ title, status, meta, children }: {
    title: string;
    status: "done" | "skipped" | "failed";
    meta?: React.ReactNode;
    children?: React.ReactNode;
}) {
    const Icon = status === "done" ? CheckCircle2 : status === "failed" ? XCircle : CircleDashed;
    return (<li className="relative border-l pb-5 pl-5 last:border-l-transparent" data-testid="pipeline-step">
      <Icon className={cn("absolute top-0 -left-2 size-4 bg-card", status === "done" ? "text-emerald-600" : status === "failed" ? "text-red-600" : "text-muted-foreground")}/>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-medium">{title}</div>
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
      </div>
      <div className="mt-1 space-y-2 text-sm">{children}</div>
    </li>);
}
function Replacements({ reps }: {
    reps: {
        from: string;
        to: string;
    }[];
}) {
    if (!reps.length)
        return <p className="text-xs text-muted-foreground">Nothing to replace.</p>;
    return (<ul className="flex flex-wrap gap-1.5">
      {reps.slice(0, 60).map((r, i) => (<li key={i} className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-xs">
          <span className="text-red-700 line-through">{r.from}</span> → <span className="text-emerald-700">{r.to}</span>
        </li>))}
      {reps.length > 60 && <li className="text-xs text-muted-foreground">+{reps.length - 60} more</li>}
    </ul>);
}
function Collapsible({ label, children }: {
    label: string;
    children: React.ReactNode;
}) {
    return (<details className="rounded-md border">
      <summary className="cursor-pointer px-2 py-1 text-xs font-medium">{label}</summary>
      <div className="border-t p-2">{children}</div>
    </details>);
}
export function ItemPipeline({ item, insights }: {
    item: SourceItemRow;
    insights: InsightRow[];
}) {
    const [trace, setTrace] = useState<ItemTrace | null>(null);
    useEffect(() => {
        let cancelled = false;
        getItemTraceAction(item.id).then((t) => !cancelled && setTrace(t));
        return () => {
            cancelled = true;
        };
    }, [item.id, item.extraction_status, item.preprocess_status]);
    const p = item.pipeline;
    if (!p) {
        return (<p className="text-sm text-muted-foreground">
        Seed item: loaded with its insights already extracted, so it has no pipeline trace. Import a file (or load sample data) to see every step.
      </p>);
    }
    const stage = (n: PipelineStage["name"]) => p.stages.find((s) => s.name === n);
    const callById = new Map((trace?.calls ?? []).map((c) => [c.id, c]));
    const allExtract = (trace?.calls ?? []).filter((c) => c.task === "extract");
    const currentIds = new Set((trace?.runs ?? []).map((r) => r.llm_call_id));
    const firstCurrent = allExtract.findIndex((c) => currentIds.has(c.id));
    const extractCalls = firstCurrent === -1 ? allExtract.slice(-2) : allExtract.slice(Math.max(0, firstCurrent - 1)).filter((c) => currentIds.has(c.id) || c.status !== "ok");
    const hiddenRuns = allExtract.length - extractCalls.length;
    const money = (n: number) => `$${n.toFixed(4)}`;
    const callMeta = (id?: string) => {
        const c = id ? callById.get(id) : undefined;
        return c ? `${c.model} · ${c.input_tokens + c.cache_read_tokens} in / ${c.output_tokens} out · ${money(c.cost_usd)} · ${(c.duration_ms / 1000).toFixed(1)}s` : undefined;
    };
    const totalCost = (trace?.calls ?? []).reduce((n, c) => n + c.cost_usd, 0);
    return (<div className="space-y-3" data-testid="item-pipeline">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">pre-process: {item.preprocess_status}</Badge>
        <Badge variant="outline">extraction: {item.extraction_status}</Badge>
        <Badge variant="outline">{trace ? `${trace.calls.length} Claude calls · ${money(totalCost)}` : "loading calls..."}</Badge>
      </div>
      {p.error && <p className="rounded bg-red-50 p-2 text-xs text-red-700">{p.error}</p>}
      <ol className="ml-2">
        {(["parse", "regex_redact", "clean", "name_redact", "chunk"] as const).map((n) => {
            const s = stage(n);
            if (n === "clean" && item.source_type !== "call")
                return null;
            const skipped = !s || (s.ms === 0 && !!s.note?.startsWith("Skipped"));
            return (<Step key={n} title={STAGE_TITLE[n]} status={s ? (skipped ? "skipped" : "done") : p.error ? "failed" : "skipped"} meta={s?.llm_call_id ? callMeta(s.llm_call_id) : s ? `${s.ms} ms` : "waiting"}>
              {s?.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
              {n === "clean" && s?.replacements && s.replacements.length > 0 && (<Collapsible label={`Show the ${s.replacements.length} corrected turns`}>
                  <ul className="space-y-2">
                    {s.replacements.map((r, i) => (<li key={i} className="text-xs leading-relaxed">
                        {wordDiff(r.from, r.to).map((w, k) => (<span key={k} className={w.added ? "rounded bg-emerald-100 text-emerald-900" : ""}>
                            {w.text}
                          </span>))}
                      </li>))}
                  </ul>
                </Collapsible>)}
              {(n === "regex_redact" || n === "name_redact") && s?.replacements && <Replacements reps={s.replacements}/>}
              {n === "chunk" && s && (<p className="text-xs text-muted-foreground">
                  {p.chunks.map((c, i) => `chunk ${i + 1}: ${c.end - c.start} chars`).join(" · ")}
                </p>)}
            </Step>);
        })}

        <Step title="6. Extract insights (Claude, per chunk)" status={item.extraction_status === "done" ? "done" : item.extraction_status === "failed" ? "failed" : "skipped"} meta={extractCalls.length ? `${extractCalls.length} call${extractCalls.length === 1 ? "" : "s"} · ${money(extractCalls.reduce((n, c) => n + c.cost_usd, 0))}` : "not run yet"}>
          {hiddenRuns > 0 && <p className="text-xs text-muted-foreground">{hiddenRuns} earlier extraction call{hiddenRuns === 1 ? "" : "s"} replaced by this run (still counted in cost).</p>}
          {extractCalls.map((c) => {
            const leaks = findContactPii(c.user_prompt);
            return (<div key={c.id} className="space-y-1.5 rounded-md border p-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="secondary">attempt {c.attempt}</Badge>
                  <span className="text-muted-foreground">{callMeta(c.id)}</span>
                  {c.cache_read_tokens > 0 && <Badge variant="outline">cache hit: {c.cache_read_tokens} tokens</Badge>}
                  <span className={cn("inline-flex items-center gap-1", leaks.length ? "text-red-700" : "text-emerald-700")} data-testid="pii-check">
                    <ShieldCheck className="size-3.5"/>
                    {leaks.length ? `${leaks.length} contact details in prompt!` : "no emails or phones in prompt"}
                  </span>
                  {c.status !== "ok" && <span className="text-red-700">{c.status}: {c.error}</span>}
                </div>
                <Collapsible label={`Prompt sent (item part; plus a ${Math.round(c.system_prompt_chars / 1000)}k-character cached system prompt with definitions and the brand brain)`}>
                  <pre className="max-h-72 overflow-auto text-xs whitespace-pre-wrap">{c.user_prompt}</pre>
                </Collapsible>
                <Collapsible label="Raw model output (JSON)">
                  <pre className="max-h-72 overflow-auto text-xs whitespace-pre-wrap">{c.response_text}</pre>
                </Collapsible>
              </div>);
        })}
        </Step>

        <Step title="7. Check every quote against the working copy" status={trace?.runs.length ? "done" : "skipped"} meta={trace?.runs.length ? `${trace.runs.reduce((n, r) => n + r.kept, 0)} kept · ${trace.runs.reduce((n, r) => n + r.fixed.length, 0)} fixed · ${trace.runs.reduce((n, r) => n + r.dropped.length, 0)} dropped` : undefined}>
          {trace?.runs.map((r) => (<div key={r.id} className="space-y-1 text-xs">
              {trace.runs.length > 1 && <div className="font-medium">Chunk {r.chunk_index + 1}</div>}
              {r.fixed.map((f, i) => (<div key={i} className="rounded border border-amber-200 bg-amber-50 p-1.5">
                  Fixed (similarity {f.ratio}): model wrote “{f.model_quote}”, stored the exact source span “{f.source_quote}”.
                </div>))}
              {r.dropped.map((d, i) => (<div key={i} className="rounded border border-red-200 bg-red-50 p-1.5" data-testid="dropped-quote">
                  Dropped ({d.reason.replace(/_/g, " ")}
                  {d.best_ratio !== undefined ? `, best match ${d.best_ratio}` : ""}): “{d.quote}”
                </div>))}
              {!r.fixed.length && !r.dropped.length && <p className="text-muted-foreground">All {r.kept} quotes matched the source exactly.</p>}
            </div>))}
        </Step>

        <Step title="8. Stored insights" status={insights.length ? "done" : "skipped"} meta={`${insights.length} insights`}>
          <ul className="space-y-1">
            {insights.map((i) => (<li key={i.id} className="flex items-start gap-2 text-xs">
                <TypePill type={i.type as InsightType}/>
                <span className="flex-1">“{i.quote}”</span>
                <span className="text-muted-foreground">{i.match}</span>
              </li>))}
          </ul>
        </Step>
      </ol>
    </div>);
}
