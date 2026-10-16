"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, ExternalLink, FlaskConical, Route, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { agentAssessments, agentCitationLeads, agentContentBrief as buildAgentContentBrief, agentExperimentSummary, agentGates, agentOutcomeLabels, agentPriorities, agentRoutes, agentSources, agentWorkBrief, emptyAgentCommerce, type AgentAssessment, type AgentCheckInput, type AgentExperiment, type AgentExperimentInput, type AgentTrialInput } from "@/lib/seo/agent-commerce";
import { strategyMetrics, type SearchStrategy, type StrategyEvidence } from "@/lib/seo/strategy";
import { buildSearchStrategyAction } from "./strategy-actions";
import { createAgentExperimentAction, prepareAgentContentAction, recordAgentImplementationAction, saveAgentCheckAction, saveAgentTrialAction } from "./agent-actions";
type Result = {
    ok: boolean;
    error?: string;
    href?: string;
};
type Call = (fn: () => Promise<Result>, message: string) => void;
const field = "w-full rounded-md border bg-background px-3 py-2 text-sm";
function agentContentBrief(...args: Parameters<typeof buildAgentContentBrief>) {
    try {
        return buildAgentContentBrief(...args);
    }
    catch {
        return null;
    }
}
function Sources({ ids }: {
    ids: readonly string[];
}) { return <div className="mt-3 flex flex-wrap gap-3">{agentSources.filter(s => ids.includes(s.id)).map(s => <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline">{s.title}<ExternalLink className="size-3"/></a>)}</div>; }
function download(name: string, value: string) { const url = URL.createObjectURL(new Blob([value], { type: "text/markdown;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function AgentsPanel({ input, strategy }: {
    input: StrategyEvidence;
    strategy: SearchStrategy | null;
}) {
    const { ctx } = input, router = useRouter(), data = strategy?.agentCommerce ?? emptyAgentCommerce();
    const [saving, start] = useTransition(), [hydrated, setHydrated] = useState(false), [productId, setProductId] = useState(ctx.products[0]?.id ?? ""), [persona, setPersona] = useState(0), [tab, setTab] = useState("plan");
    useEffect(() => setHydrated(true), []);
    const pending = saving || !hydrated;
    const now = new Date().toISOString(), product = ctx.products.find(p => p.id === productId);
    const checks = product ? agentAssessments(input, data, productId, now) : [], priorities = agentPriorities(checks);
    const citationLeads = product ? agentCitationLeads(input, productId) : { assessedAnswers: 0, leads: [] };
    const call: Call = (fn, message) => start(async () => { try {
        const result = await fn();
        if (!result.ok)
            toast.error(result.error);
        else {
            toast.success(message);
            if (result.href)
                router.push(result.href);
            router.refresh();
        }
    }
    catch {
        toast.error("Unable to save. Refresh and try again; saved work is preserved.");
    } });
    const revision = strategy?.revision ?? 0;
    return <div className="space-y-6" data-testid="agent-commerce-panel">
    <section className="rounded-xl border bg-accent/30 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">D2C discovery → preference → purchase</p>
      <h2 className="mt-3 font-serif text-3xl">Help agents choose a product they can verify.</h2>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">Work backward from the buyer's constraints: an agent needs to find the item, understand it, compare the evidence and verify the offer. Improve each part, then test whether the product is actually chosen over alternatives.</p>
      <div className="mt-5 flex flex-wrap gap-3">{!strategy && <Button disabled={pending} onClick={() => call(() => buildSearchStrategyAction(ctx.brandId, ctx.contextHash, 0), "Agent shopping plan started.")}>Start agent shopping plan</Button>}<Link href="/seo/aeo" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">Collect AI answer evidence<ArrowRight className="size-4"/></Link>{product && <Button variant="outline" disabled={pending} onClick={() => download(`agent-shopping-${ctx.brandId}-${productId}.md`, agentWorkBrief(input, data, productId, now))}><Download className="size-4"/>Export product work plan</Button>}</div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">Planning model, not a universal ranking formula. Channel availability changes; source review: 10 October 2026. Feed submission and checkout execution require your commerce platform. Tests here record evidence; they do not make purchases.</p>
    </section>
    <div className="flex flex-wrap items-end gap-4"><label className="min-w-0 flex-1 text-sm font-medium">Product to improve<select aria-label="Agent shopping product" className={`${field} mt-2`} value={productId} onChange={e => setProductId(e.target.value)}>{ctx.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><p className="text-sm text-muted-foreground">Market: <b>{ctx.market}</b></p></div>
    <nav aria-label="Agent shopping tools" className="flex flex-wrap gap-2">{[["plan", "Product action plan"], ["routes", "Discovery pathways"], ["tests", "Preference experiments"]].map(([id, label]) => <Button key={id} variant={tab === id ? "default" : "outline"} aria-pressed={tab === id} disabled={pending} onClick={() => setTab(id)}>{label}</Button>)}</nav>
    {tab === "routes" && <>
      <section className="rounded-xl border bg-card p-5"><div className="flex items-center gap-2"><Route className="size-5 text-primary"/><h2 className="text-xl font-semibold">How an agent reaches a D2C store</h2></div><p className="mt-3 text-sm leading-6 text-muted-foreground">Search pages, catalog records and third-party sources can produce different candidate sets. A returning buyer may start with a known item. Measure the route your customers use before deciding where to invest.</p></section>
      <div className="grid gap-4 lg:grid-cols-2">{agentRoutes.map(route => <section key={route.id} className="rounded-xl border bg-card p-5"><Badge variant="outline">{route.basis}</Badge><h3 className="mt-3 text-lg font-semibold">{route.title}</h3><p className="mt-2 text-sm leading-6">{route.mechanism}</p><p className="mt-3 text-sm leading-6 text-muted-foreground"><b>Position your brand:</b> {route.work}</p><p className="mt-3 text-sm leading-6 text-muted-foreground"><b>Verify:</b> {route.proof}</p><Sources ids={route.sources}/></section>)}</div>
      <section className="rounded-xl border bg-card p-5"><h3 className="font-semibold">Match the channel to the merchant</h3><div className="mt-4 grid gap-4 md:grid-cols-3"><p className="text-sm leading-6"><b>ChatGPT:</b> assess approved OpenAI feed access or eligible Shopify distribution. Shopify currently documents a store-checkout referral flow for ChatGPT.</p><p className="text-sm leading-6"><b>Google AI Mode / Gemini:</b> review Merchant Center discovery and the supported UCP cart or checkout path. Confirm merchant and market eligibility separately.</p><p className="text-sm leading-6"><b>Other assistants:</b> test their web or commerce surface directly. MCP or a checkout protocol alone does not create discovery demand or guarantee recommendation.</p></div><Sources ids={["feeds", "shopify", "ucp"]}/></section>
    </>}
    {tab === "plan" && product && <>
      <section className="rounded-xl border bg-card p-5"><h2 className="text-xl font-semibold">Why a buyer's agent might choose you</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">A useful working hypothesis is that preference follows buyer fit, checkable evidence and purchase feasibility. Test your advantage for a specific need: a genuinely suitable variant, a supported feature, a better delivered cost, clearer evidence or a more reliable purchase path. The relative weights are private and differ by engine and shopper.</p><div className="mt-4 grid gap-4 md:grid-cols-3"><p className="text-sm leading-6"><b>Become a candidate:</b> align search pages, channel catalogs and buyer language so the exact item can be retrieved.</p><p className="text-sm leading-6"><b>Earn the recommendation:</b> support the buyer's constraints with concrete facts and an honest comparison against alternatives.</p><p className="text-sm leading-6"><b>Finish the purchase:</b> verify variant, stock, full terms, delivery and the supported checkout handoff.</p></div><p className="mt-3 text-xs text-muted-foreground">These are testable strategy hypotheses. More mentions, more content or a protocol badge alone cannot guarantee first placement.</p></section>
      <section className="rounded-xl border bg-card p-5"><h2 className="text-xl font-semibold">Prepare products for discovery and agent shopping</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{[["Supported by review", checks.filter(c => c.status === "supported").length], ["Observed gaps", checks.filter(c => c.status === "gap").length], ["Needs evidence", checks.filter(c => c.status === "unknown").length]].map(([label, value]) => <div key={label} className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>)}</div><p className="mt-3 text-xs leading-5 text-muted-foreground">These are evidence states for {product.name}, not a visibility score. Crawl checks provide partial signals; feeds, actual suitability, policy contents and checkout need human verification. Reviews over 30 days old prompt a recheck; live price and stock must be checked at purchase time.</p></section>
      <section className="rounded-xl border bg-accent/20 p-5"><h3 className="font-semibold">What to do next</h3><ol className="mt-3 space-y-3">{priorities.slice(0, 3).map((p, i) => { const g = agentGates.find(g => g.id === p.gateId)!; return <li key={p.gateId} className="flex gap-3 text-sm"><span className="font-semibold text-primary">{i + 1}.</span><div><b>{p.status === "gap" ? "Fix" : "Verify"}: {g.title}</b><p className="mt-1 leading-6 text-muted-foreground">{g.action}</p><Link href={g.href} className="mt-1 inline-block text-primary underline">Open the relevant tool</Link></div></li>; })}{!priorities.length && <li className="text-sm">All gates have current review evidence. Repeat your preference tests and monitor changing offers.</li>}</ol><p className="mt-3 text-xs text-muted-foreground">Core evidence gaps come first; catalog and native checkout work depends on the chosen route. This ordering is a work sequence, not a ranking prediction.</p></section>
      <div className="grid gap-4 lg:grid-cols-2">{agentGates.map(gate => { const assessment = checks.find(c => c.gateId === gate.id)!; return <section key={gate.id} className="rounded-xl border bg-card p-5" data-testid="agent-gate"><div className="flex flex-wrap gap-2"><Badge variant={assessment.status === "gap" ? "destructive" : "outline"}>{assessment.status === "unknown" ? "Needs evidence" : assessment.status === "supported" ? "Human supported" : "Observed gap"}</Badge><Badge variant="secondary">{gate.stage}</Badge>{gate.optional && <Badge variant="outline">Route dependent</Badge>}</div><h3 className="mt-3 flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-primary"/>{gate.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{gate.action}</p><p className="mt-3 text-xs font-semibold">{assessment.basis}</p>{assessment.evidence.map((e, i) => <p key={i} className="mt-2 text-xs leading-5 text-muted-foreground">{e}</p>)}{assessment.sourceUrl && <a href={assessment.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-primary underline">Open review evidence</a>}<details className="mt-4 border-t pt-3"><summary className="cursor-pointer text-sm font-medium">Review evidence & assign owner</summary><p className="mt-3 text-xs leading-5 text-muted-foreground">{gate.acceptance}</p><CheckEditor key={`${productId}:${gate.id}:${revision}`} productId={productId} assessment={assessment} saved={data.checks.find(c => c.productId === productId && c.gateId === gate.id)} pending={pending || !strategy} save={value => call(() => saveAgentCheckAction(ctx.brandId, ctx.contextHash, revision, value), "Product evidence review saved.")}/></details><Sources ids={gate.sources}/></section>; })}</div>
      <section className="rounded-xl border bg-card p-5"><h2 className="text-xl font-semibold">Turn the decision journey into content</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Capture the problem, the comparison and the purchase questions separately. Each brief opens in Customer growth strategy for research, existing-page review and handoff to the article builder or page optimizer.</p><label className="mt-4 block max-w-xl text-sm">Buyer persona<select className={`${field} mt-2`} value={persona} onChange={e => setPersona(Number(e.target.value))}>{ctx.personas.length ? ctx.personas.map((p, i) => <option key={i} value={i}>{p.name}</option>) : <option value={0}>Category shoppers · add personas in Brand Brain</option>}</select></label><div className="mt-4 grid gap-4 md:grid-cols-3">{(["buyer-guide", "comparison", "product-facts"] as const).map(kind => { const mapped = kind !== "product-facts" || !!product.url; const brief = ctx.websiteUrl && mapped ? agentContentBrief(ctx, productId, persona, kind) : null; return <div key={kind} className="rounded-lg border p-4"><h3 className="font-semibold">{kind === "buyer-guide" ? "Understand the need" : kind === "comparison" ? "Compare the alternatives" : "Verify before buying"}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{brief?.keyword ?? "Add the product URL and storefront website in Brand Brain."}</p><Button className="mt-4" variant="outline" disabled={pending || !strategy || !brief} onClick={() => call(() => prepareAgentContentAction(ctx.brandId, ctx.contextHash, revision, productId, persona, kind), "Decision brief opened for research.")}>Prepare research brief</Button></div>; })}</div><p className="mt-4 text-xs text-muted-foreground">Use sourced comparison tables, honest exclusions, original evidence and clear links to the exact item. Avoid unsupported “best” claims, fake reviews, doorway pages and instructions aimed at manipulating an assistant. Google does not require a special AI file or special schema to appear in its AI search features.</p><Sources ids={["search", "schema"]}/></section>
      <section className="rounded-xl border bg-card p-5"><h2 className="text-xl font-semibold">Sources AI actually used in your saved sample</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{citationLeads.assessedAnswers} completed discovery answers for this product and market in the latest matching API run. Review these as research leads; citation frequency does not prove authority, endorsement or consumer placement.</p>{citationLeads.leads.map(lead => <div key={lead.url} className="mt-3 rounded-lg border p-3"><a href={lead.url} target="_blank" rel="noreferrer" className="break-words text-sm font-semibold text-primary underline">{lead.title}</a><p className="mt-2 text-xs text-muted-foreground">Cited in {lead.answers} answers · {lead.observedAt}</p><p className="mt-2 text-xs leading-5">Buyer question: {lead.prompt}</p><p className="mt-2 text-xs text-muted-foreground">Inspect the exact claims and comparison criteria. Record a correction, useful evidence contribution or missing answer before planning content.</p></div>)}{!citationLeads.leads.length && <p className="mt-3 text-sm text-muted-foreground">No matching citation leads collected. Run the AI visibility audit and inspect the responses before choosing external sources to prioritize.</p>}<Link href="/seo/geo" className="mt-3 inline-block text-sm text-primary underline">Inspect AI answers and citations</Link></section>
    </>}
    {tab === "tests" && product && <>
      <section className="rounded-xl border bg-card p-5"><h2 className="flex items-center gap-2 text-xl font-semibold"><FlaskConical className="size-5 text-primary"/>Learn why your product wins or loses</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Freeze the buyer question, market, engine/model and surface. Run fresh sessions for each repeat. Save baseline evidence, apply one change, then repeat. Record the competitor chosen and check the cited reasons against actual product evidence.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{strategyMetrics(input).filter(m => ["mentions", "citations"].includes(m.id)).map(m => <div key={m.id} className="rounded-lg border p-3"><b className="text-sm">Existing API sample · {m.label}</b><p className="mt-2 text-xl">{m.value === null ? "Unmeasured" : `${m.value}%`}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{m.detail}</p></div>)}</div><p className="mt-3 text-xs leading-5 text-muted-foreground">API mentions and citations do not measure consumer shopping placement, recommendation preference or purchases. Experiments below use separately recorded evidence. No causal lift or revenue forecast is inferred.</p></section>
      <details className="rounded-xl border bg-card p-5"><summary className="cursor-pointer font-semibold">Create a preference experiment</summary><ExperimentEditor key={`${productId}:${revision}`} ctx={ctx} productId={productId} pending={pending || !strategy} save={value => call(() => createAgentExperimentAction(ctx.brandId, ctx.contextHash, revision, value), "Experiment saved. Collect the planned baseline repeats before implementing the change.")}/></details>
      {data.experiments.filter(e => e.productId === productId).map(experiment => <ExperimentCard key={`${experiment.id}:${revision}`} experiment={experiment} ctx={ctx} data={data} pending={pending} call={call} revision={revision}/>)}
      {!data.experiments.some(e => e.productId === productId) && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Start with one buyer scenario and one measurable change. A useful first test compares a product-fact page improvement against the same unbranded shopping question.</p>}
      <section className="rounded-xl border bg-card p-5"><h3 className="font-semibold">Build this muscle over time</h3><ol className="mt-3 grid gap-4 text-sm md:grid-cols-3"><li><b>Establish the baseline</b><p className="mt-2 leading-6 text-muted-foreground">Review priority SKU facts and channel eligibility. Choose actual buyer constraints and collect repeated answers with cited sources.</p></li><li><b>Fix a decision blocker</b><p className="mt-2 leading-6 text-muted-foreground">Improve the evidence, comparison, offer or route that failed. Record who implemented the change and when. Verify the store before retesting.</p></li><li><b>Retest and retain learning</b><p className="mt-2 leading-6 text-muted-foreground">Compare matched repeats, inspect competitor reasons, and expand scenarios that matter to buyers. Track real channel/referral orders separately, including returns.</p></li></ol><Sources ids={["bing", "shopify"]}/></section>
    </>}
  </div>;
}
function CheckEditor({ productId, assessment, saved, pending, save }: {
    productId: string;
    assessment: AgentAssessment;
    saved?: AgentCheckInput;
    pending: boolean;
    save: (value: AgentCheckInput) => void;
}) {
    const [value, setValue] = useState<AgentCheckInput>({ productId, gateId: assessment.gateId, status: saved && !assessment.stale ? assessment.status : "unknown", owner: saved?.owner ?? "", sourceUrl: saved?.sourceUrl ?? "", note: saved?.note ?? "", checkedAt: new Date().toISOString() });
    const set = <K extends keyof AgentCheckInput>(key: K, next: AgentCheckInput[K]) => setValue(v => ({ ...v, [key]: next }));
    return <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); save(value); }}>
    <label className="block text-xs">Assessment<select className={`${field} mt-1`} value={value.status} onChange={e => set("status", e.target.value as AgentCheckInput["status"])}><option value="unknown">Needs evidence</option><option value="supported">Supported by my review</option><option value="gap">Gap verified by my review</option></select></label>
    <label className="block text-xs">Evidence owner<Input className="mt-1" value={value.owner} maxLength={100} onChange={e => set("owner", e.target.value)}/></label>
    <label className="block text-xs">Source or test evidence URL<Input className="mt-1" type="url" value={value.sourceUrl} maxLength={2000} onChange={e => set("sourceUrl", e.target.value)}/></label>
    <label className="block text-xs">What was checked, for this SKU and market?<Textarea className="mt-1" value={value.note} maxLength={4000} onChange={e => set("note", e.target.value)}/></label>
    <label className="block text-xs">Evidence timestamp (UTC ISO format)<Input className="mt-1" value={value.checkedAt} onChange={e => set("checkedAt", e.target.value)}/></label>
    <Button type="submit" variant="outline" disabled={pending}>Save evidence review</Button>
  </form>;
}
function ExperimentEditor({ ctx, productId, pending, save }: {
    ctx: StrategyEvidence["ctx"];
    productId: string;
    pending: boolean;
    save: (value: AgentExperimentInput) => void;
}) {
    const [value, setValue] = useState<AgentExperimentInput>({ productId, route: "web", prompt: "", engine: "", model: "", surface: "consumer", market: ctx.market, hypothesis: "", change: "", targetUrl: ctx.products.find(p => p.id === productId)?.url ?? ctx.websiteUrl ?? "", owner: "", repeats: 3 });
    const set = <K extends keyof AgentExperimentInput>(key: K, next: AgentExperimentInput[K]) => setValue(v => ({ ...v, [key]: next }));
    return <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={e => { e.preventDefault(); save(value); }}>
    <label className="text-sm">Discovery route<select className={`${field} mt-1`} value={value.route} onChange={e => set("route", e.target.value as AgentExperimentInput["route"])}>{agentRoutes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
    <label className="text-sm">Test surface<select className={`${field} mt-1`} value={value.surface} onChange={e => set("surface", e.target.value as AgentExperimentInput["surface"])}><option value="consumer">Consumer shopping / assistant interface</option><option value="api">Search-enabled API</option><option value="store-test">Store / sandbox checkout test</option></select></label>
    <label className="text-sm md:col-span-2">Fixed buyer prompt<Textarea className="mt-1" required minLength={10} maxLength={1000} value={value.prompt} onChange={e => set("prompt", e.target.value)} placeholder="Describe the need, budget, compatibility and delivery constraints. Keep discovery questions unbranded."/></label>
    {([['engine', 'Engine / channel'], ['model', 'Model or interface version (use undisclosed when unavailable)'], ['owner', 'Experiment owner'], ['targetUrl', 'Store page to improve']] as const).map(([key, label]) => <label key={key} className="text-sm">{label}<Input className="mt-1" required value={value[key]} maxLength={key === "targetUrl" ? 2000 : 120} type={key === "targetUrl" ? "url" : "text"} onChange={e => set(key, e.target.value)}/></label>)}
    <label className="text-sm">Hypothesis: what decision blocker should change?<Textarea className="mt-1" required minLength={20} maxLength={2000} value={value.hypothesis} onChange={e => set("hypothesis", e.target.value)}/></label>
    <label className="text-sm">One planned change<Textarea className="mt-1" required minLength={10} maxLength={2000} value={value.change} onChange={e => set("change", e.target.value)}/></label>
    <label className="text-sm">Repeats per phase<Input className="mt-1" type="number" min={3} max={10} value={value.repeats} onChange={e => set("repeats", Number(e.target.value))}/></label>
    <p className="self-center text-xs leading-5 text-muted-foreground">Market fixed to {ctx.market}. Keep model, tools, account settings and question unchanged. Each repeat starts a fresh session. Changing the test setup requires a new experiment.</p>
    <div className="md:col-span-2"><Button type="submit" disabled={pending}>Save preference experiment</Button></div>
  </form>;
}
function ExperimentCard({ experiment: e, ctx, data, pending, call, revision }: {
    experiment: AgentExperiment;
    ctx: StrategyEvidence["ctx"];
    data: ReturnType<typeof emptyAgentCommerce>;
    pending: boolean;
    call: Call;
    revision: number;
}) {
    const summary = agentExperimentSummary(ctx, e, data.trials), rows = data.trials.filter(t => t.experimentId === e.id);
    return <section className="space-y-4 rounded-xl border bg-card p-5" data-testid="agent-experiment"><div className="flex flex-wrap gap-2"><Badge variant="outline">{e.surface}</Badge><Badge variant="secondary">{e.engine} · {e.model} · {e.market}</Badge>{summary.stale && <Badge variant="destructive">Older brand facts</Badge>}</div><h3 className="text-lg font-semibold">{e.prompt}</h3><p className="text-sm leading-6"><b>Hypothesis:</b> {e.hypothesis}</p><p className="text-sm leading-6 text-muted-foreground"><b>Change:</b> {e.change} · {e.owner}</p><p className="text-xs text-muted-foreground">{e.changedAt ? `Implementation recorded: ${e.changedAt}` : "Collect baseline repeats before implementing the change."} · {summary.failures} failed repeats</p><div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Observed outcomes before and after the change</caption><thead><tr className="border-b"><th className="p-2">Outcome</th><th className="p-2">Before</th><th className="p-2">After</th><th className="p-2">Matched difference</th></tr></thead><tbody>{summary.metrics.map(m => <tr key={m.key} className="border-b"><td className="p-2">{m.label}</td><td className="p-2">{m.beforeRate === null ? "Unmeasured" : `${m.beforeRate}% (${m.beforeN})`}</td><td className="p-2">{m.afterRate === null ? "Unmeasured" : `${m.afterRate}% (${m.afterN})`}</td><td className="p-2">{m.delta === null ? "Not comparable yet" : `${m.delta > 0 ? "+" : ""}${m.delta} pp · ${m.pairs} pairs`}</td></tr>)}</tbody></table></div><p className="text-xs leading-5 text-muted-foreground">Rates use only completed, assessed outcomes. Difference uses matching repeat numbers within this fixed experiment. Unknowns and failures are excluded. Small observational samples cannot establish ranking, statistical significance or causal lift.</p>
    {!summary.stale && <>{!e.changedAt && <Button variant="outline" disabled={pending} onClick={() => call(() => recordAgentImplementationAction(ctx.brandId, ctx.contextHash, revision, e.id), "Implementation time recorded. Collect after evidence using the same setup.")}>I applied the change · record implementation</Button>}<details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Record a {e.changedAt ? "follow-up" : "baseline"} observation</summary><TrialEditor experiment={e} rows={rows} pending={pending} save={value => call(() => saveAgentTrialAction(ctx.brandId, ctx.contextHash, revision, value), "Observation saved.")}/></details></>}
    {!!rows.length && <details><summary className="cursor-pointer text-sm font-medium">Inspect evidence and competitor choices · {rows.length}</summary>{rows.map(t => <div key={t.id} className="mt-3 rounded-lg border p-3 text-xs"><p className="font-semibold">{t.phase} · repeat {t.repeat} · {t.status} · {t.observedAt}</p><p className="mt-2">Chosen product / competitor: {t.winner || "Not recorded"}</p><p className="mt-2">Observed reason: {t.reason || "Not recorded"}</p><p className="mt-2 whitespace-pre-wrap break-words leading-5">{t.answer}</p>{t.evidenceUrl && <a href={t.evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-primary underline">Open answer evidence</a>}{t.orderEvidenceUrl && <a href={t.orderEvidenceUrl} target="_blank" rel="noreferrer" className="ml-3 text-primary underline">Open purchase evidence</a>}</div>)}</details>}
  </section>;
}
function TrialEditor({ experiment, rows, pending, save }: {
    experiment: AgentExperiment;
    rows: AgentTrialInput[];
    pending: boolean;
    save: (value: AgentTrialInput) => void;
}) {
    const phase = experiment.changedAt ? "after" : "before";
    const available = Array.from({ length: experiment.repeats }, (_, i) => i + 1).filter(i => !rows.some(t => t.phase === phase && t.repeat === i && t.status === "completed"));
    const [value, setValue] = useState<AgentTrialInput>({ experimentId: experiment.id, phase, repeat: available[0] ?? 1, observedAt: new Date().toISOString(), status: "completed", answer: "", evidenceUrl: "", shortlisted: null, recommended: null, cited: null, purchased: null, orderEvidenceUrl: "", winner: "", reason: "" });
    const set = <K extends keyof AgentTrialInput>(key: K, next: AgentTrialInput[K]) => setValue(v => ({ ...v, [key]: next }));
    if (!available.length)
        return <p className="mt-3 text-sm">All planned {phase} repeats have evidence.</p>;
    return <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={event => { event.preventDefault(); save(value); }}>
    <label className="text-xs">Repeat<select className={`${field} mt-1`} value={value.repeat} onChange={event => set("repeat", Number(event.target.value))}>{available.map(i => <option key={i} value={i}>{i}</option>)}</select></label>
    <label className="text-xs">Collection status<select className={`${field} mt-1`} value={value.status} onChange={event => setValue(v => ({ ...v, status: event.target.value as AgentTrialInput["status"], shortlisted: null, recommended: null, cited: null, purchased: null }))}><option value="completed">Completed</option><option value="failed">Failed · outcomes unassessed</option></select></label>
    <label className="text-xs md:col-span-2">Observation timestamp (UTC ISO format)<Input className="mt-1" value={value.observedAt} onChange={event => set("observedAt", event.target.value)}/></label>
    <label className="text-xs md:col-span-2">Answer transcript or test result<Textarea className="mt-1" maxLength={12000} value={value.answer} onChange={event => set("answer", event.target.value)}/></label>
    <label className="text-xs md:col-span-2">Saved transcript / screenshot / test evidence URL<Input className="mt-1" type="url" maxLength={2000} value={value.evidenceUrl} onChange={event => set("evidenceUrl", event.target.value)}/></label>
    {(Object.entries(agentOutcomeLabels) as [
        keyof typeof agentOutcomeLabels,
        string
    ][]).map(([key, label]) => <label key={key} className="text-xs">{label}<select className={`${field} mt-1`} disabled={value.status === "failed"} value={value[key] === null ? "unknown" : value[key] ? "yes" : "no"} onChange={event => set(key, event.target.value === "unknown" ? null : event.target.value === "yes")}><option value="unknown">Not assessed</option><option value="yes">Yes · observed</option><option value="no">No · observed</option></select></label>)}
    {value.purchased !== null && <label className="text-xs md:col-span-2">Separate order / checkout-test evidence URL<Input className="mt-1" type="url" required value={value.orderEvidenceUrl} onChange={event => set("orderEvidenceUrl", event.target.value)}/></label>}
    <label className="text-xs">Chosen product or competitor<Input className="mt-1" maxLength={200} value={value.winner} onChange={event => set("winner", event.target.value)}/></label>
    <label className="text-xs">Observed choice reason<Textarea className="mt-1" maxLength={2000} value={value.reason} onChange={event => set("reason", event.target.value)}/></label>
    <p className="text-xs leading-5 text-muted-foreground md:col-span-2">Only record visible outcomes. Store citation can differ from recommendation. Sandbox success is not a customer order. Keep payment details and customer personal information out of this record.</p>
    <div className="md:col-span-2"><Button type="submit" disabled={pending}>Save observation</Button></div>
  </form>;
}
