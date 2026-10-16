"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CONTEXT_LABEL, type ContextLevel } from "@/lib/llm/context";
import { TIER_LABEL, type ModelInfo } from "@/lib/llm/models";
import { EXTRA_CONTEXT, EXTRA_LABEL, type Effort, type ExtraContext, type StepChoice } from "@/lib/llm/steps";
import type { WriterShows } from "@/lib/llm/writer";
import { cn } from "@/lib/utils";
import { resetStepChoicesAction, saveStepChoiceAction, saveWriterAction } from "./actions";
export interface StepRow {
    task: string;
    area: string;
    label: string;
    makes: string;
    sent: string;
    why: string;
    vision: boolean;
    recommended: {
        model: string;
        effort: Effort | null;
        context: ContextLevel | null;
    };
    now: {
        model: string;
        effort: Effort | null;
        context: ContextLevel | null;
        extra: ExtraContext | null;
    };
    choice: string | null;
    levels: ContextLevel[];
    tested: Record<string, number | string>;
    suggested: string[];
    measured: {
        calls: number;
        input: number;
        cachedPct: number;
        output: number;
        cents: number;
    } | null;
}
type Model = ModelInfo & {
    available: boolean;
};
interface Line {
    id: string;
    name: string;
    versions: Model[];
}
const REC = "__recommended";
const MIXED = "__mixed";
const LATEST = "__latest";
const EFFORTS: Effort[] = ["low", "medium", "high"];
const money = (n: number) => (n >= 1 ? `$${n}` : `$${n.toFixed(2).replace(/0$/, "")}`);
const GUIDE = "/learning/models";
export function StepsCard({ steps, models, lineNames, changed, writer, simple = false }: {
    steps: StepRow[];
    models: Model[];
    lineNames: Record<string, string>;
    changed: number;
    writer: WriterShows;
    simple?: boolean;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [open, setOpen] = useState<string | null>(null);
    const areas = [...new Set(steps.map((s) => s.area))];
    const lines: Line[] = [...new Set(models.map((m) => m.family))].map((id) => ({ id, name: lineNames[id] ?? id, versions: models.filter((m) => m.family === id) }));
    const lineOf = (choice: string) => lines.find((l) => l.id === choice) ?? lines.find((l) => l.versions.some((v) => v.id === choice));
    const save = (task: string, patch: StepChoice) => start(async () => {
        const res = await saveStepChoiceAction(task, patch);
        if (res.ok) {
            toast.success("Saved. It applies from the next run.");
            router.refresh();
        }
        else
            toast.error(res.error);
    });
    const kept = (st: StepRow): StepChoice => ({ model: st.choice ?? undefined, effort: st.now.effort === st.recommended.effort ? undefined : (st.now.effort ?? undefined), context: st.now.context === st.recommended.context ? undefined : (st.now.context ?? undefined), extra: st.now.extra ?? undefined });
    const nameOf = (id: string) => lines.find((l) => l.id === id)?.name ?? models.find((m) => m.id === id)?.name ?? id;
    const missing = simple ? " · not connected" : " · no key in .env";
    const lineText = (l: Line, st?: StepRow) => {
        const m = l.versions[0];
        const score = st?.tested[m.id];
        return [l.name, st && suggestedFor(st, l) ? "also suggested" : "", m.version && l.versions.length > 1 ? `latest is ${m.version}` : "", TIER_LABEL[m.tier].toLowerCase(), simple ? "" : `${money(m.price[0])} in, ${money(m.price[1])} out`, typeof score === "number" ? `scored ${score.toFixed(1)}` : ""].filter(Boolean).join(" · ");
    };
    const suggestedFor = (st: StepRow, l: Line) => l.versions.some((v) => st.suggested.includes(v.id));
    const saveWriter = (v: string) => start(async () => {
        const res = await saveWriterAction(v === REC ? null : v);
        if (res.ok) {
            toast.success(res.kept.length ? `Saved. ${res.kept.length} step${res.kept.length === 1 ? " kept its" : "s kept their"} own model, because ${nameOf(v)} cannot be sent pictures: ${res.kept.join(", ")}.` : "Saved. It applies from the next run.");
            router.refresh();
        }
        else
            toast.error(res.error);
    });
    const row = (st: StepRow) => {
        const off = !!st.choice || st.now.model !== st.recommended.model || st.now.effort !== st.recommended.effort || st.now.context !== st.recommended.context || !!st.now.extra;
        const usable = lines.map((l) => ({ ...l, versions: l.versions.filter((m) => !st.vision || m.vision) })).filter((l) => l.versions.length);
        const line = st.choice ? usable.find((l) => l.id === lineOf(st.choice!)?.id) : undefined;
        const rec = models.find((m) => m.id === st.recommended.model);
        return (<div key={st.task} className="p-3" data-testid={`step-${st.task}`}>
        <div className={cn("grid gap-3 xl:items-start", simple ? "sm:grid-cols-[minmax(0,1fr)_19rem_9.5rem]" : "sm:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_15rem_9rem_10rem_14rem]")}>
          <div className={cn("min-w-0", !simple && "sm:col-span-3 xl:col-span-1")}>
            {simple ? (<span className="text-sm font-medium">{st.label}</span>) : (<button type="button" className="text-left text-sm font-medium hover:underline" onClick={() => setOpen(open === st.task ? null : st.task)} aria-expanded={open === st.task}>
                {st.label}
              </button>)}
            {off && <span className="ml-2 rounded-sm bg-signal px-1.5 py-0.5 text-xs font-semibold text-foreground">Changed</span>}
            <p className="text-xs text-muted-foreground">Makes: {st.makes}</p>
            {st.suggested.length > 0 && (<p className="text-xs text-muted-foreground" data-testid={`step-suggested-${st.task}`}>
                Also suggested: {st.suggested.map((id) => lineOf(id)?.name ?? nameOf(id)).join(", ")}
              </p>)}
            {!simple && st.measured && (<p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                Last {st.measured.calls} calls: {st.measured.input.toLocaleString()} tokens in ({st.measured.cachedPct}% from cache), {st.measured.output.toLocaleString()} out, {st.measured.cents < 0.1 ? "under 0.1" : st.measured.cents.toFixed(1)} cents a call
              </p>)}
          </div>
          <div>
            <div className="mb-0.5 text-xs font-medium text-muted-foreground">Model</div>
            <Select value={st.choice ? (line?.id ?? st.choice) : REC} onValueChange={(v) => save(st.task, { ...kept(st), model: v === REC ? undefined : v })} disabled={pending}>
              <SelectTrigger size="sm" className="w-full" data-testid={`step-model-${st.task}`} aria-label={`Model for: ${st.label}`}>

                <SelectValue>{st.choice ? (line?.name ?? nameOf(st.choice)) : `${nameOf(st.recommended.model)} (recommended)`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={REC}>{nameOf(st.recommended.model)} (recommended)</SelectItem>
                {usable.map((l) => (<SelectItem key={l.id} value={l.id} disabled={!l.versions[0].available}>
                    {lineText(l, st)}
                    {!l.versions[0].available ? missing : ""}
                  </SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="mb-0.5 text-xs font-medium text-muted-foreground">Version</div>
            {line ? (<Select value={st.choice === line.id ? LATEST : st.choice!} onValueChange={(v) => save(st.task, { ...kept(st), model: v === LATEST ? line.id : v })} disabled={pending || (line.versions.length === 1 && !line.versions[0].version)}>
                <SelectTrigger size="sm" className="w-full" data-testid={`step-version-${st.task}`} aria-label={`Version for: ${st.label}`}>
                  <SelectValue>{st.choice === line.id ? `Latest${line.versions[0].version ? ` (${line.versions[0].version})` : ""}` : `${line.versions.find((m) => m.id === st.choice)?.version ?? st.choice} only`}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LATEST}>Latest{line.versions[0].version ? ` (${line.versions[0].version})` : ""}: moves to a newer version when there is one</SelectItem>
                  {line.versions
                    .filter((m) => m.version)
                    .map((m) => (<SelectItem key={m.id} value={m.id} disabled={!m.available}>
                        {m.version} only{m.id === st.recommended.model ? " (recommended)" : ""}
                      </SelectItem>))}
                </SelectContent>
              </Select>) : (<div className="flex h-8 items-center rounded-md border border-dashed px-2.5 text-sm text-muted-foreground" data-testid={`step-version-${st.task}`}>
                {st.choice ? "As written" : rec?.version || "–"}
              </div>)}
          </div>
          {!simple && (<>
              <div>
                <div className="mb-0.5 text-xs font-medium text-muted-foreground">Thinking effort</div>
                <Select value={st.now.effort === st.recommended.effort ? REC : (st.now.effort ?? REC)} onValueChange={(v) => save(st.task, { ...kept(st), effort: v === REC ? undefined : (v as Effort) })} disabled={pending}>
                  <SelectTrigger size="sm" className="w-full" data-testid={`step-effort-${st.task}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={REC}>{st.recommended.effort ? `${st.recommended.effort} (recommended)` : "As built"}</SelectItem>
                    {EFFORTS.filter((e) => e !== st.recommended.effort).map((e) => (<SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-0.5 text-xs font-medium text-muted-foreground">What it is sent</div>
                {st.levels.length ? (<Select value={st.now.context === st.recommended.context ? REC : (st.now.context ?? REC)} onValueChange={(v) => save(st.task, { ...kept(st), context: v === REC ? undefined : (v as ContextLevel) })} disabled={pending}>
                    <SelectTrigger size="sm" className="w-full" data-testid={`step-context-${st.task}`}>
                      <SelectValue>{`${CONTEXT_LABEL[st.now.context ?? st.recommended.context!].split(":")[0]}${st.now.context === st.recommended.context ? " (recommended)" : ""}`}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={REC}>{CONTEXT_LABEL[st.recommended.context!].split(":")[0]} (recommended)</SelectItem>
                      {st.levels
                        .filter((l) => l !== st.recommended.context)
                        .map((l) => (<SelectItem key={l} value={l}>
                            {CONTEXT_LABEL[l]}
                          </SelectItem>))}
                    </SelectContent>
                  </Select>) : (<Select value={st.now.extra ?? REC} onValueChange={(v) => save(st.task, { ...kept(st), extra: v === REC ? undefined : (v as ExtraContext) })} disabled={pending}>
                    <SelectTrigger size="sm" className="w-full" data-testid={`step-context-${st.task}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={REC}>Its own input (recommended)</SelectItem>
                      {EXTRA_CONTEXT.map((x) => (<SelectItem key={x} value={x}>
                          {EXTRA_LABEL[x]}
                        </SelectItem>))}
                    </SelectContent>
                  </Select>)}
              </div>
            </>)}
        </div>
        {!simple && open === st.task && (<dl className={cn("mt-3 grid gap-x-4 gap-y-1 rounded-md bg-muted/60 p-3 text-xs sm:grid-cols-[8rem_1fr]")}>
            <dt className="font-medium">It is sent</dt>
            <dd className="text-muted-foreground">{st.sent}</dd>
            <dt className="font-medium">Why this model</dt>
            <dd className="text-muted-foreground">{st.why}</dd>
            {Object.keys(st.tested).length > 0 && (<>
                <dt className="font-medium">Compared blind</dt>
                <dd className="text-muted-foreground">
                  {Object.entries(st.tested)
                        .map(([id, v]) => `${models.find((m) => m.id === id)?.name ?? id}: ${typeof v === "number" ? v.toFixed(1) : v}`)
                        .join(" · ")}
                </dd>
              </>)}
          </dl>)}
      </div>);
    };
    return (<Card data-testid="model-routes" id="models" className="scroll-mt-24">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{simple ? "The model for each step" : "Every step: its model, its effort, what it is sent"}</CardTitle>
            <CardDescription className="mt-1 max-w-3xl">
              {simple
            ? "Each step of the work is done by a model, and each starts on the one that did best when they were compared. Pick another for any step. A step stays on the latest version of the model you pick, unless you hold it at 1 version. A change applies from the next run, for every brand."
            : "Each step starts on the recommended setting: the cheapest model whose output held up when compared blind, sent only what its output depends on. Change any of them to try your own. A step put on a model runs on its latest version, unless it is held at 1 version. Scores are out of 10 from blind comparisons; prices are per million tokens. A change applies from the next run, for every brand."}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" disabled={pending || !changed} data-testid="steps-reset" onClick={() => start(async () => {
            const res = await resetStepChoicesAction();
            if (res.ok) {
                toast.success("Every step is back on its recommended setting.");
                router.refresh();
            }
            else
                toast.error(res.error);
        })}>
            {changed ? `Reset ${changed} changed step${changed === 1 ? "" : "s"}` : "All on recommended"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className={simple ? "space-y-3" : "space-y-6"}>

        <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_18rem] sm:items-start" data-testid="writer">
          <div className="min-w-0">
            <div className="text-sm font-medium">Writer</div>
            <p className="text-xs text-muted-foreground">Sets 1 model for every step that writes words a customer reads, so you can compare writers. Each step can still be set on its own below.</p>
            {writer.kind === "model" && writer.kept.length > 0 && (<p className="mt-0.5 text-xs text-muted-foreground" data-testid="writer-kept">
                {nameOf(writer.model)} cannot be sent pictures, so {writer.kept.length} step{writer.kept.length === 1 ? " kept its" : "s kept their"} own model: {writer.kept.map((s) => s.label).join(", ")}.
              </p>)}
            <Link href={GUIDE} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline" data-testid="writer-guide">
              See how 6 models wrote the same brief <ArrowRight className="size-3"/>
            </Link>
          </div>
          <Select value={writer.kind === "model" ? writer.model : writer.kind === "mixed" ? MIXED : REC} onValueChange={saveWriter} disabled={pending}>
            <SelectTrigger size="sm" className="w-full" data-testid="writer-model" aria-label="Writer">
              <SelectValue>{writer.kind === "model" ? nameOf(writer.model) : writer.kind === "mixed" ? "Mixed" : "Recommended for each step"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={REC}>Recommended for each step</SelectItem>
              {lines.map((l) => (<SelectItem key={l.id} value={l.id} disabled={!l.versions[0].available}>
                  {lineText(l)}
                  {!l.versions[0].available ? missing : ""}
                </SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        {areas.map((area) => {
            const list = steps.filter((s) => s.area === area);
            if (simple) {
                const moved = list.filter((s) => s.choice).length;
                return (<details key={area} className="group rounded-md border" data-testid={`steps-area-${area}`}>
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium">
                  <span>{area}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {list.length} step{list.length === 1 ? "" : "s"}
                    {moved ? ` · ${moved} changed` : ""}
                  </span>
                </summary>
                <div className="divide-y border-t">{list.map(row)}</div>
              </details>);
            }
            return (<section key={area}>
              <h3 className="mb-1 text-xs font-semibold text-muted-foreground">{area}</h3>
              <div className="divide-y rounded-md border">{list.map(row)}</div>
            </section>);
        })}
      </CardContent>
    </Card>);
}
