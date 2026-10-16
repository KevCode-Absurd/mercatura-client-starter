"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { priorityScore } from "@/lib/learning/ranking";
import type { LearningPlan, PlanScope } from "@/lib/learning/types";
import { createLearningPlan } from "./actions";
export function TailorPanel({ moduleId, brandId, brandName, ready, live, initialPlan, currentContextHash, contextSummary, lessonTitles, lessonCategory = {}, heading, lead }: {
    moduleId: PlanScope;
    brandId: string;
    brandName: string;
    ready: boolean;
    live: boolean;
    initialPlan: LearningPlan | null;
    currentContextHash: string;
    contextSummary: string;
    lessonTitles: Record<string, string>;
    lessonCategory?: Record<string, string>;
    heading?: string;
    lead?: string;
}) {
    const [plan, setPlan] = useState(initialPlan);
    const [error, setError] = useState("");
    const stale = Boolean(plan && currentContextHash && plan.contextHash !== currentContextHash);
    const [pending, start] = useTransition();
    const generate = (preview: boolean) => start(async () => {
        setError("");
        try {
            const result = await createLearningPlan(moduleId, brandId, preview);
            if (result.error)
                setError(result.error);
            if (result.plan)
                setPlan(result.plan);
        }
        catch {
            setError("Connection interrupted. Please try again. Your saved plan is unchanged.");
        }
    });
    return <section id="brand-plan" aria-label="Your brand strategy plan" className="scroll-mt-24 rounded-2xl border bg-accent/30 p-5 md:p-7">
    <div className="flex flex-wrap items-center justify-between gap-5"><div className="max-w-2xl"><div className="mb-2 flex items-center gap-2 text-primary"><Sparkles className="size-4"/><span className="text-xs font-semibold uppercase tracking-wider">Put this into practice</span></div><h2 className="font-serif text-3xl">{heading ?? `What should ${brandName} do first?`}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lead ?? "Get 10 strategies ranked for your products, customers, offers, and available evidence."}</p>{ready && <p className="mt-2 text-xs text-muted-foreground">Uses what the app knows about {brandName} · {contextSummary}</p>}</div>
      {ready ? <Button onClick={() => generate(!live)} disabled={pending} className="min-h-10" data-testid="tailor-brand">{pending ? <Loader2 className="size-4 animate-spin"/> : <Sparkles className="size-4"/>}{pending ? "Building your plan…" : live ? (plan?.mode === "live" ? `Build ${brandName}’s top 10 again` : `Get ${brandName}’s top 10`) : "Preview a starter plan"}</Button> : <Button asChild><Link href="/brand">Complete your Brand brain <ArrowRight className="size-4"/></Link></Button>}
    </div>
    {!ready && <p className="mt-4 text-sm text-muted-foreground">You can read every lesson now. Add your brand details to get a plan for your business.</p>}
    {ready && !live && <p className="mt-4 text-sm text-muted-foreground">Tailoring is not switched on for this account. The preview shows the format using general lesson steps. <Link href="/settings" className="text-primary underline">Switch it on in Settings</Link> to get a brand-specific ranking.</p>}
    {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-card p-3 text-sm text-destructive">{error}</p>}
    {pending && <p role="status" className="mt-4 text-sm text-primary">Choosing the 10 that fit and writing a plan for each. This takes about 5 minutes. You can leave this page: the plan is saved when it is done.</p>}
    {plan && <div className="mt-7 border-t pt-6" data-testid="learning-plan">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{plan.mode === "preview" ? "Starter plan preview" : `${brandName}’s top 10 strategies`}</h3><span className="text-xs text-muted-foreground">{plan.mode === "preview" ? "Preview · not saved" : `Saved ${plan.createdAt.slice(0, 10)}`}</span></div>
      {stale && <p role="status" className="mt-3 rounded-lg border bg-card p-3 text-sm">Your brand details or lessons have changed. Create a new plan to include the updates.</p>}
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{plan.summary}</p>
      {plan.mode === "live" && <p className="mt-2 text-xs text-muted-foreground">Priority considers brand fit (40%), potential impact (30%), ease (15%), and confidence (15%). Scores are estimates, not predicted returns.</p>}
      {plan.mode === "live" && !!plan.sample?.length && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="learning-sample">Built partly on placeholder numbers for {plan.sample.join(", and for ")}, because {brandName}’s ad account and store are not connected yet. The plan says where a step rests on one. Build it again once your own numbers are in.</p>}
      {!!plan.assumptions.length && <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Assumptions & missing information</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{plan.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul></details>}
      <ol className="mt-5 grid gap-3 lg:grid-cols-2">{plan.strategies.map((s, index) => <li key={s.lessonId} className="min-w-0 rounded-xl border bg-card p-5 [overflow-wrap:anywhere]" data-testid="learning-strategy">
        <div className="flex gap-3"><span className="font-serif text-3xl text-primary">{String(index + 1).padStart(2, "0")}</span><div className="flex-1"><h4 className="font-semibold leading-snug">{s.title}</h4>{plan.mode === "live" && <span className="mt-1 block text-xs text-muted-foreground">Priority {priorityScore(s)}/100 · Confidence {s.confidence}/5</span>}</div></div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.why}</p>
        {s.adaptation && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{s.adaptation}</p>}
        {s.firstDeliverable && <div className="mt-4 whitespace-pre-line rounded-lg bg-accent/40 p-3 text-sm leading-relaxed"><strong className="block mb-1">First deliverable</strong>{s.firstDeliverable}</div>}
        <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium text-primary">How to put it into action</summary><ol className="mt-3 list-decimal space-y-2 pl-5">{s.steps.map((step, i) => <li key={i}>{step}</li>)}</ol><p className="mt-4"><strong>Measure:</strong> {s.successMetric}</p>{s.prerequisites.length > 0 && <p className="mt-3 text-muted-foreground"><strong>Before you start:</strong> {s.prerequisites.join(" ")}</p>}</details>
        {s.decisionRule && <p className="mt-4 text-sm leading-relaxed text-muted-foreground"><strong className="text-foreground">Decision rule:</strong> {s.decisionRule}</p>}
        <Link href={`/learning/${lessonCategory[s.lessonId] ?? moduleId}/${s.lessonId}`} className="mt-4 inline-block text-xs font-medium text-primary hover:underline">Read the full strategy: {lessonTitles[s.lessonId]} →</Link>
      </li>)}</ol>
    </div>}
  </section>;
}
