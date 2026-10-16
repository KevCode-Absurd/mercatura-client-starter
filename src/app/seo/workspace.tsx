"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, BookOpen, Brain, Check, FileText, Sparkles, Download, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SeoAudit, SeoCategory, SeoContext, SeoFinding, SeoSnapshot } from "@/lib/seo/model";
import { coreProducts, groupFindings, type FindingGroup } from "@/lib/seo/scope";
import { contentChecks, type SeoArtifact } from "@/lib/seo/content";
import { articleWordCount } from "@/lib/seo/article-quality";
import { summarizeVisibility, type VisibilityRun } from "@/lib/seo/visibility";
import type { VisibilityConnection } from "./visibility-panel";
import { SearchOutcomes, StrategyPanel } from "./strategy-panel";
import type { SearchStrategy } from "@/lib/seo/strategy";
import type { BlogSeed } from "@/lib/seo/blog";
import type { MeasurementData } from "@/lib/seo/measurement";
import type { SearchPlanData } from "@/lib/seo/planning";
import type { GrowthData } from "@/lib/seo/growth";
import type { CitationOutreachDraft } from "@/lib/seo/citation-outreach";
import { advanceSeoArtifactAction, createSeoArtifactAction, exportSeoArtifactAction, runSeoAuditAction, updateSeoArtifactAction } from "./actions";
const panelLoading = () => <div role="status" className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">Opening this tool…</div>;
const VisibilityPanel = dynamic(() => import("./visibility-panel").then(m => m.VisibilityPanel), { loading: panelLoading });
const MeasurementPanel = dynamic(() => import("./measurement-panel").then(m => m.MeasurementPanel), { loading: panelLoading });
const SearchPlanningPanel = dynamic(() => import("./planning-panel").then(m => m.SearchPlanningPanel), { loading: panelLoading });
const OptimizationPanel = dynamic(() => import("./optimization-panel").then(m => m.OptimizationPanel), { loading: panelLoading });
const PrioritiesPanel = dynamic(() => import("./priorities-panel").then(m => m.PrioritiesPanel), { loading: panelLoading });
const DiagnosisPanel = dynamic(() => import("./diagnosis-panel").then(m => m.DiagnosisPanel), { loading: panelLoading });
const SourcedBlogPanel = dynamic(() => import("./blog-panel").then(m => m.SourcedBlogPanel), { loading: panelLoading });
const RenderedSeoPanel = dynamic(() => import("./local-panels").then(m => m.RenderedSeoPanel), { loading: panelLoading });
const SeoDeliveryPanel = dynamic(() => import("./local-panels").then(m => m.SeoDeliveryPanel), { loading: panelLoading });
const DraftLinkPanel = dynamic(() => import("./local-panels").then(m => m.DraftLinkPanel), { loading: panelLoading });
const AnswerResearchPanel = dynamic(() => import("./answer-research-panel").then(m => m.AnswerResearchPanel), { loading: panelLoading });
const AnswerImplementationPanel = dynamic(() => import("./answer-implementation-panel").then(m => m.AnswerImplementationPanel), { loading: panelLoading });
const AgentsPanel = dynamic(() => import("./agents-panel").then(m => m.AgentsPanel), { loading: panelLoading });
const CitationOutreachPanel = dynamic(() => import("./citation-outreach-panel").then(m => m.CitationOutreachPanel), { loading: panelLoading });
type Props = {
    view: string;
    ctx: SeoContext;
    snapshot: SeoSnapshot;
    audit: SeoAudit;
    auditedAt: string | null;
    artifacts: SeoArtifact[];
    completed: string[];
    selectedId?: string;
    visibilityRuns: VisibilityRun[];
    visibilityConnection: VisibilityConnection;
    citationDrafts?: CitationOutreachDraft[];
    measurement: MeasurementData;
    searchPlan: SearchPlanData;
    growthWork: GrowthData;
    blogSeed?: BlogSeed;
    strategy?: SearchStrategy | null;
};
const names: Record<string, string> = { overview: "Help shoppers find your brand.", audits: "Find what is holding discovery back.", opportunities: "Turn buyer questions into search opportunities.", content: "From the right keyword to a useful blog.", aeo: "Be a useful answer to a buyer's question.", geo: "Understand how AI represents your brand.", changes: "Review and apply your changes.", learn: "Learn it. Apply it to your store." };
const statusName = { draft: "Draft", approved: "Approved", exported: "Export prepared", applied: "Reported applied", verified: "Human verified" };
Object.assign(names, { priorities: "Your search growth plan.", planning: "Turn search intent into an owned plan.", optimize: "Prepare the next version of your store pages.", measurement: "Measure what changed. Choose what to fix." });
Object.assign(names, { strategy: "Turn customer demand into organic growth.", agents: "Get ready for the agent shopper." });
Object.assign(names, { outreach: "Get your brand into the sources buyers discover." });
function Panel({ title, children, className }: {
    title?: string;
    children: React.ReactNode;
    className?: string;
}) { return <section className={cn("rounded-xl border bg-card p-5", className)}>{title && <h2 className="mb-3 font-semibold">{title}</h2>}{children}</section>; }
function Jump({ to, children }: {
    to: string;
    children: React.ReactNode;
}) { return <Link href={to} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{children}<ArrowRight className="size-4"/></Link>; }
function Empty({ children }: {
    children: React.ReactNode;
}) { return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>; }
function download(name: string, content: string, type = "text/plain") { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function auditCsv(audit: SeoAudit) {
    const cell = (value: string) => `"${(/^[\s]*[=+@-]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`;
    return [["Category", "Rule", "Check", "URL", "Status", "Evidence"], ...audit.checks.map((c) => [c.category, c.ruleId, c.title, c.url, c.status, c.evidence.join(" | ")])].map((row) => row.map(cell).join(",")).join("\r\n");
}
export function SeoWorkspace(props: Props) {
    const { ctx, view, snapshot, audit, artifacts, auditedAt } = props;
    const router = useRouter();
    const [pending, start] = useTransition();
    const [category, setCategory] = useState("All");
    const [query, setQuery] = useState("");
    const [keyword, setKeyword] = useState("");
    const [productId, setProductId] = useState(ctx.products[0]?.id ?? "");
    const [auditing, setAuditing] = useState(false);
    const [visibilityBusy, setVisibilityBusy] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (!auditing)
            return;
        const started = Date.now();
        const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
        return () => window.clearInterval(timer);
    }, [auditing]);
    const runAudit = () => {
        if (auditing || visibilityBusy || pending || !ctx.websiteUrl)
            return;
        setElapsed(0);
        setAuditing(true);
        start(async () => {
            try {
                const result = await runSeoAuditAction(ctx.brandId, true);
                if (!result.ok)
                    toast.error(result.error);
                else {
                    const visibility = result.value.visibility;
                    if (visibility === "completed")
                        toast.success("Website and answer visibility audits saved. Review findings, responses and citations.");
                    else if (visibility === "running")
                        toast.success("Website audit saved. The buyer-journey scan is collecting in the background; open AEO or GEO for progress.");
                    else if (visibility === "partial" || visibility === "failed")
                        toast.warning("Website audit saved. Visibility collection has errors; inspect response coverage before drawing conclusions.");
                    else
                        toast.success("Website audit saved. Answer visibility needs a connection; see AEO or GEO for details.");
                    router.refresh();
                }
            }
            catch {
                toast.error("The website audit could not finish. Please try again; your last saved audit is preserved.");
            }
            finally {
                setAuditing(false);
            }
        });
    };
    const selected = artifacts.find((a) => a.id === props.selectedId);
    const perform = (fn: () => Promise<{
        ok: boolean;
        error?: string;
    }>, message: string) => start(async () => { try {
        const result = await fn();
        if (!result.ok)
            toast.error(result.error);
        else {
            toast.success(message);
            router.refresh();
        }
    }
    catch {
        toast.error("Unable to complete the action. Please try again.");
    } });
    const create = (input: Parameters<typeof createSeoArtifactAction>[1]) => start(async () => {
        try {
            const result = await createSeoArtifactAction(ctx.brandId, input);
            if (!result.ok)
                toast.error(result.error);
            else
                router.push(`/seo/content?id=${result.value.id}`);
        }
        catch {
            toast.error("Unable to create the draft. Please try again.");
        }
    });
    const groups = groupFindings(audit.findings, snapshot.pages);
    const filtered = groups.filter((g) => (category === "All" || g.category === category) && `${g.title} ${g.findings.map(f => f.url).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
    const priority = groups.filter((g) => g.priority === "P1");
    const priorityInput = { ctx, snapshot, audit, artifacts, runs: props.visibilityRuns, measurement: props.measurement, plan: props.searchPlan };
    return <div className="mx-auto max-w-[90rem]" data-testid="seo-workspace" data-brand-id={ctx.brandId} data-context-hash={ctx.contextHash}>
    <div className="mx-6 flex flex-wrap items-center justify-between gap-2 border-b py-3 text-xs text-muted-foreground">
      <span className="flex flex-wrap items-center gap-2"><Badge variant="outline">{auditedAt && audit.mode === "live" ? "Live website evidence" : "Ready to audit"}</Badge> {ctx.brandName} · {ctx.market}{ctx.websiteUrl && <a href={ctx.websiteUrl} target="_blank" rel="noreferrer" className="max-w-full break-all text-primary underline">{ctx.websiteUrl}<ExternalLink className="ml-1 inline size-3"/></a>}</span>
      <Link href="/brand" className="flex items-center gap-1.5 hover:text-primary"><Brain className="size-3.5"/> Shared Brand Brain</Link>
    </div>
    <PageHeader title={view === "content" && selected?.kind === "fix" ? "Review the diagnosis. Prepare the implementation." : names[view]} subtitle={view === "overview" ? "Audit your store, choose the right search opportunities, and build the content and changes your team can implement." : "Use your brand details and audit results to decide what to improve next."}>
      <Button disabled={pending || auditing || visibilityBusy || !ctx.websiteUrl} onClick={runAudit}><RefreshCw className={cn("size-4", auditing && "animate-spin")}/>{auditing ? `Auditing · ${elapsed}s` : "Run audit"}</Button>
    </PageHeader>
    <div className="space-y-6 px-6 py-6"><Link href="/seo/editorial-quality" className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-semibold text-primary hover:underline">Standalone editorial quality · buyer questions, evidence review and offline benchmark<ArrowRight className="size-4 shrink-0"/></Link>
      {!ctx.websiteUrl && <Empty>Add your storefront website to the <Link href="/brand" className="text-primary underline">shared Brand Brain</Link> to run an audit. SEO uses that shared website as its source.</Empty>}
      {auditing && <div role="status" aria-live="polite" className="rounded-xl border bg-accent/50 p-4 text-sm"><p className="font-medium">Collecting audit evidence · {elapsed}s elapsed</p><p className="mt-1 text-muted-foreground">Checking robots.txt, sitemaps and a bounded sample of up to 250 storefront pages.{props.visibilityConnection.available ? " Then starting the buyer-journey visibility scan in the background. Open AEO or GEO for its saved progress." : " Answer visibility is not connected; this run collects website readiness evidence."} Website results appear when the crawl finishes.</p></div>}
      {!auditedAt && ctx.websiteUrl && !auditing && !["aeo", "geo", "overview", "strategy", "agents"].includes(view) && <Empty>Run your first website audit to inspect the live storefront. Readiness is unassessed until evidence has been collected.</Empty>}
      {!ctx.products.length && <Empty>Add products to the <Link href="/brand" className="text-primary underline">shared Brand Brain</Link> for product-specific blog planning and comparisons with approved brand facts.</Empty>}
      {view === "overview" && <>
        <SearchOutcomes />
        <PrioritiesPanel input={priorityInput} compact/>
        <div className="grid gap-4 md:grid-cols-3">{(["SEO", "AEO", "GEO"] as SeoCategory[]).map((cat) => <ScoreCard key={cat} category={cat} audit={audit} ctx={ctx} visibilityRuns={props.visibilityRuns}/>)}</div>
        <p className="text-xs text-muted-foreground">Readiness = passed checks ÷ assessed checks on the sampled pages. Unknown evidence is excluded. These scores measure website readiness, not rankings, AI visibility or a forecast of traffic. {auditedAt ? `Last run: ${new Date(auditedAt).toLocaleString()}.` : "No audit has been run for the current website and brand context."}</p>
        {snapshot.crawl && <CrawlCoverage snapshot={snapshot} compact/>}
        <VisibilityPanel ctx={ctx} runs={props.visibilityRuns} connection={props.visibilityConnection} compact/>
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Panel><div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">Your next best actions</h2><Badge variant="secondary">{priority.length} high priority</Badge></div>
            {groups.slice(0, 5).map((f, i) => <div key={f.id} className="flex gap-4 border-t py-4"><span className="font-serif text-3xl text-muted-foreground">{String(i + 1).padStart(2, "0")}</span><div className="min-w-0"><p className="font-medium">{f.title}</p><p className="mt-1 text-sm text-muted-foreground">{f.remedy}</p><div className="mt-2 flex gap-2 text-xs"><Badge variant="outline">{f.priority}</Badge><span>{f.category} · {f.findings.length} affected {f.findings.length === 1 ? "page" : "pages"}</span></div></div></div>)}
            {!audit.findings.length && <p className="mb-4 text-sm text-muted-foreground">{auditedAt ? "No failed checks were found in the inspected evidence. Review unknown checks and coverage before drawing conclusions." : "Your prioritized actions will appear after the first live audit."}</p>}
            <Jump to="/seo/audits">Open the prioritized audit</Jump>
          </Panel>
          <div className="space-y-4"><Panel className="bg-accent/50"><FileText className="mb-4 size-6 text-primary"/><h2 className="font-serif text-3xl">A blog with a reason to exist.</h2><p className="my-3 text-sm leading-relaxed text-muted-foreground">Start with a buyer question, connect it to a product, and build a useful article with a clear path back to your store.</p><Jump to="/seo/opportunities">Find your next blog topic</Jump></Panel>
          <Panel title="One shared understanding of the brand"><dl className="grid grid-cols-2 gap-3 text-sm"><dt className="text-muted-foreground">Products</dt><dd>{ctx.products.length}</dd><dt className="text-muted-foreground">Buyer personas</dt><dd>{ctx.personas.length}</dd><dt className="text-muted-foreground">Approved brand claims</dt><dd>{ctx.claims.length}</dd><dt className="text-muted-foreground">Saved work</dt><dd>{artifacts.length} saved drafts</dd></dl><p className="mt-4 text-xs text-muted-foreground">Update your products and customer details in Brand Brain. Import search data in Measurement and run an AI audit to see where your brand appears.</p><div className="mt-4 flex gap-4"><Jump to="/brand">Brand Brain</Jump><Jump to="/sources">Sources</Jump></div></Panel></div>
        </div>
        <Panel title="From finding an issue to fixing it"><ol className="grid gap-4 text-sm md:grid-cols-5">{["Audit the evidence", "Choose a priority", "Create and review", "Export for your team", "Apply and verify"].map((step, i) => <li key={step}><span className="mb-2 block text-xs text-primary">0{i + 1}</span>{step}</li>)}</ol></Panel>
      </>}
      {view === "strategy" && <StrategyPanel input={{ ctx, snapshot, audit, measurement: props.measurement, runs: props.visibilityRuns }} data={props.strategy ?? null} initialSelectedId={props.selectedId}/>}
      {view === "agents" && <AgentsPanel input={{ ctx, snapshot, audit, measurement: props.measurement, runs: props.visibilityRuns }} strategy={props.strategy ?? null}/>}
      {view === "priorities" && <PrioritiesPanel input={priorityInput} work={props.growthWork}/>}
      {["strategy", "planning"].includes(view) && <Panel title="Plan the right route into AI answers"><p className="text-sm text-muted-foreground">Match the buyer decision and observed source gap to product facts, technical access, evidence, merchant data, independent coverage or an article.</p><div className="mt-3 flex flex-wrap gap-4"><Jump to="/seo/geo">Choose an answer-entry implementation</Jump><a href="/seo/dtc-ai-answer-research.md" target="_blank" rel="noreferrer" className="text-sm text-primary underline">Read the D2C answer-entry framework</a></div></Panel>}
      {view === "planning" && <SearchPlanningPanel key={`${ctx.brandId}:${ctx.contextHash}`} ctx={ctx} snapshot={snapshot} data={props.searchPlan} measurement={props.measurement}/>}
      {view === "optimize" && <OptimizationPanel key={`${ctx.brandId}:${ctx.contextHash}`} ctx={ctx} snapshot={snapshot} audit={audit}/>}
      {view === "measurement" && <MeasurementPanel key={`${ctx.brandId}:${ctx.contextHash}`} ctx={ctx} data={props.measurement} crawlUrls={snapshot.pages.filter((p) => p.live?.htmlInspected).map((p) => p.url)}/>}
      {view === "audits" && <>
        <Panel title="Complete the audit across the site and its reputation"><p className="text-sm text-muted-foreground">The checks below inspect technical and on-page evidence. Review referring links, editorial mentions and sources cited by AI in the strategy checklist to complete the off-page assessment.</p><div className="mt-3"><Jump to="/seo/strategy">Open authority and implementation work</Jump></div></Panel>
        <div className="grid gap-4 md:grid-cols-3">{(["SEO", "AEO", "GEO"] as SeoCategory[]).map((cat) => <ScoreCard key={cat} category={cat} audit={audit} ctx={ctx} visibilityRuns={props.visibilityRuns}/>)}</div>
        <AuditFocus ctx={ctx} snapshot={snapshot}/>
        <RenderedSeoPanel ctx={ctx} snapshot={snapshot}/>

        <div className="flex flex-wrap gap-3"><div className="flex gap-1">{["All", "SEO", "AEO", "GEO"].map((c) => <Button key={c} variant={category === c ? "default" : "outline"} onClick={() => setCategory(c)}>{c}</Button>)}</div><Input className="max-w-sm" aria-label="Search findings" placeholder="Search findings or URLs…" value={query} onChange={(e) => setQuery(e.target.value)}/></div>
        <p className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "issue" : "issues"} across {new Set(filtered.flatMap(g => g.findings.map(f => f.url))).size} affected pages. Open an issue to see the pages and evidence.</p>
        <div className="space-y-3">{filtered.map((group) => <FindingGroupCard key={group.id} group={group} ctx={ctx} pages={snapshot.pages} pending={pending} onCreate={(findingId) => create({ findingId })}/>)}{!filtered.length && <Empty>{auditedAt ? "No findings match this filter. Review the full checklist for unknown evidence." : "Run an audit to collect live evidence and prioritize findings."}</Empty>}</div>
        <details className="rounded-xl border p-5"><summary className="cursor-pointer font-semibold">Full audit checklist · {audit.checks.length} checks</summary><div className="mt-4 divide-y">{audit.checks.map((c) => <div key={c.id} className="py-3 text-sm"><Badge variant="outline">{c.status}</Badge><span className="ml-2">{c.ruleId} · {c.title}</span><p className="mt-1 break-all text-xs text-muted-foreground">{c.url}</p>{c.evidence.map((e, i) => <p key={i} className="mt-1 text-xs text-muted-foreground">{e}</p>)}</div>)}</div></details>
        {snapshot.crawl && <CrawlCoverage snapshot={snapshot}/>}
        {auditedAt && <div className="flex flex-wrap items-center gap-3"><p className="mr-auto text-xs text-muted-foreground">Last run: {new Date(auditedAt).toLocaleString()} · {audit.checks.length} checks · {audit.checks.filter((c) => c.status === "unknown").length} unknown</p><Button variant="outline" onClick={() => download(`seo-audit-${ctx.brandId}.json`, JSON.stringify({ audit, snapshot, auditedAt }, null, 2), "application/json")}><Download className="size-4"/>Download audit JSON</Button><Button variant="outline" onClick={() => download(`seo-checks-${ctx.brandId}.csv`, auditCsv(audit), "text/csv;charset=utf-8")}>Download checks CSV</Button></div>}
        <details className="rounded-xl border p-5"><summary className="cursor-pointer font-semibold">Optional: browser protection review</summary><div className="mt-4"><p className="mb-4 text-sm leading-6 text-muted-foreground">HTTPS and explicit HTTP resource references are checked in fetched HTML. Response headers below need a platform-specific review. This does not inspect private theme code, execute scripts or establish that a store is secure.</p>{audit.checks.filter((c) => c.ruleId === "SECURITY-HEADERS").map((c) => { const f: SeoFinding = { ...c, why: "Review the browser policies actually returned by the storefront.", remedy: "Validate any policy with the platform owner before enforcement.", priority: "P2", effort: "Medium" }; return <div key={c.id} className="mb-3 rounded-lg border p-4"><p className="break-all text-sm">{c.url}</p><Badge variant="outline">Human review required</Badge><DiagnosisPanel finding={f} page={snapshot.pages.find((p) => p.url === c.url)} ctx={ctx}/><Button className="mt-4" variant="outline" disabled={pending} onClick={() => create({ findingId: c.id })}>Prepare developer review</Button></div>; })}{!audit.checks.some((c) => c.ruleId === "SECURITY-HEADERS") && <p className="text-xs text-muted-foreground">Rerun the website audit to capture current header evidence.</p>}</div></details>
      </>}
      {view === "opportunities" && <>
        <Panel title="Target the buyer and the right page"><p className="text-sm text-muted-foreground">These keyword seeds come from {ctx.brandName}&apos;s catalogue and shared buyer language. Demand has not been measured. A product query usually belongs on a product page; an informational buying question can support a blog. Validate real demand and current results before publishing.</p></Panel>
        <Input className="max-w-md" aria-label="Search keywords" placeholder="Search a keyword, product or intent…" value={query} onChange={(e) => setQuery(e.target.value)}/>
        <div className="grid gap-4 lg:grid-cols-2">{snapshot.opportunities.filter((o) => `${o.query} ${o.intent}`.toLowerCase().includes(query.toLowerCase())).map((o) => <Panel key={o.id}><div className="flex flex-wrap justify-between gap-2"><Badge variant="secondary">{o.intent}</Badge><span className="text-xs text-muted-foreground">{o.monthlySearches === null ? "Search demand unmeasured" : `${o.monthlySearches.toLocaleString()} searches / month${o.mode === "demo" ? " · demo" : ""}`}</span></div><h2 className="mt-4 text-xl font-semibold">{o.query}</h2><p className="my-3 text-sm leading-relaxed text-muted-foreground">{o.rationale}</p><p className="mb-4 break-all text-xs text-muted-foreground">Destination: {o.destination} · {o.targetUrl || "Choose the actual page during review"}</p>{o.destination === "blog" ? <Button disabled={pending} onClick={() => create({ opportunityId: o.id })}><FileText className="size-4"/>Create buying-guide starter</Button> : <Jump to="/seo/audits">Review page improvements</Jump>}</Panel>)}</div>
      </>}
      {view === "content" && (selected ? <ArtifactEditor key={`${selected.id}:${selected.revision}:${selected.status}`} artifact={selected} ctx={ctx}/> : <>
        <SourcedBlogPanel ctx={ctx} seed={props.blogSeed}/>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]"><Panel title="Buying-guide starter"><form onSubmit={(e) => { e.preventDefault(); create({ keyword, productId }); }} className="space-y-4"><label className="block text-sm font-medium">Target keyword<Input className="mt-2" placeholder="e.g. how to choose the right product for your needs" required minLength={3} maxLength={180} value={keyword} onChange={(e) => setKeyword(e.target.value)}/></label><label className="block text-sm font-medium">Relevant product<select className="mt-2 w-full rounded-md border bg-background p-2" value={productId} onChange={(e) => setProductId(e.target.value)}>{ctx.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><p className="text-xs text-muted-foreground">Creates a buying-guide starter from the shared Brand Brain without a paid model call. Review relevance, expand the answer with evidence, and replace proposed URLs before publishing.</p><Button disabled={pending || !productId}><Sparkles className="size-4"/>Create buying-guide starter</Button></form></Panel><Panel title="Start with a researched direction"><p className="mb-5 text-sm text-muted-foreground">Use the keyword workspace to choose a buyer question with a product connection. Your draft includes a title, search description, article, buying checklist, answer sections and product link.</p><Jump to="/seo/opportunities">Browse keyword opportunities</Jump><div className="mt-6 border-t pt-4"><Jump to="/seo/learn">Learn how to plan a useful blog</Jump></div></Panel></div>
        <ArtifactList artifacts={artifacts.filter((a) => a.kind === "blog")} ctx={ctx}/>
      </>)}
      {(view === "aeo" || view === "geo") && <>
        {view === "geo" && <CitationOutreachPanel ctx={ctx} runs={props.visibilityRuns} drafts={props.citationDrafts ?? []}/>}
        <AnswerResearchPanel ctx={ctx} runs={props.visibilityRuns} snapshot={snapshot} artifacts={artifacts}/>
        {view === "aeo" && <div className="grid gap-6 lg:grid-cols-[1fr_2fr]"><ScoreCard category={view.toUpperCase() as SeoCategory} audit={audit} ctx={ctx} visibilityRuns={props.visibilityRuns}/><Panel title={view === "aeo" ? "Answer readiness and observed answers" : "What this audit measures"}><p className="text-sm leading-relaxed text-muted-foreground">{view === "aeo" ? "Website checks inspect buyer answers and product evidence in fetched HTML. The visibility audit below separately collects real model answers, citations and human fact reviews. Helpful answers do not require a special AI schema." : "See whether AI mentions your brand when answering customer questions, and inspect the sources it uses. Results describe the answers collected in this audit."}</p><div className="mt-4"><Jump to="/seo/learn">Read the method</Jump></div></Panel></div>}
        <VisibilityPanel ctx={ctx} runs={props.visibilityRuns} connection={props.visibilityConnection} busy={pending || auditing} onBusyChange={setVisibilityBusy}/>
        {view === "aeo" && <Panel title="Buyer language from the shared Brand Brain"><div className="grid gap-4 md:grid-cols-2">{ctx.personas.map((p) => <div key={p.name} className="rounded-lg bg-muted p-4"><h3 className="font-semibold">{p.name}</h3><p className="mt-2 text-sm">{p.problem}</p><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{p.language.slice(0, 3).map((q) => <li key={q}>“{q}”</li>)}</ul></div>)}</div></Panel>}
        <div className="space-y-3">{groups.filter((g) => g.category === view.toUpperCase()).map((group) => <FindingGroupCard key={group.id} group={group} ctx={ctx} pages={snapshot.pages} pending={pending} onCreate={(findingId) => create({ findingId })}/>)}</div>
      </>}
      {view === "outreach" && <>
        <CitationOutreachPanel ctx={ctx} runs={props.visibilityRuns} drafts={props.citationDrafts ?? []}/>
        <VisibilityPanel ctx={ctx} runs={props.visibilityRuns} connection={props.visibilityConnection} busy={pending || auditing} onBusyChange={setVisibilityBusy}/>
      </>}
      {view === "changes" && <><Panel title="Review, apply and track changes."><p className="text-sm text-muted-foreground">Review → approve this revision → prepare an export → apply it in your store → record fresh verification. An export never marks a change as published. Editing invalidates approval; changed Brand Brain facts require a fresh draft.</p></Panel><SeoDeliveryPanel ctx={ctx} artifacts={artifacts}/><ArtifactList artifacts={artifacts} ctx={ctx}/></>}
    </div>
  </div>;
}
function CrawlCoverage({ snapshot, compact = false }: {
    snapshot: SeoSnapshot;
    compact?: boolean;
}) {
    const crawl = snapshot.crawl;
    if (!crawl)
        return null;
    const inspected = snapshot.pages.filter((p) => p.live?.htmlInspected).length;
    return <Panel title="Live crawl coverage">
    <div className="flex flex-wrap gap-2"><Badge variant="outline">{inspected} pages inspected</Badge><Badge variant="outline">{snapshot.pages.length} pages in scope</Badge><Badge variant="outline">{crawl.discoveredUrls} URLs discovered</Badge>{crawl.limited && <Badge variant="secondary">Partial crawl</Badge>}</div>
    <p className="mt-3 text-sm text-muted-foreground">Checked {new Date(crawl.completedAt).toLocaleString()} · Up to {crawl.maxPages} pages per run. Findings apply to the inspected sample. Unavailable evidence remains unknown; confirmed HTTP errors can become findings.</p>
    {compact ? <div className="mt-3"><Jump to="/seo/audits">Inspect pages, evidence and crawl limits</Jump></div> : <>
      <details className="mt-4 rounded-lg border p-4"><summary className="cursor-pointer text-sm font-semibold">Collection method and limitations</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-xs text-muted-foreground">{crawl.limits.map((limit, i) => <li key={i}>{limit}</li>)}</ul><p className="mt-3 break-all text-xs">Robots: {crawl.robotsUrl} · {crawl.robotsStatus ?? "No HTTP response"}{crawl.robotsError ? ` · ${crawl.robotsError}` : ""}</p>{crawl.sitemaps.map((map, i) => <p key={`${map.url}:${i}`} className="mt-2 break-all text-xs text-muted-foreground">Sitemap: {map.url} · {map.status ?? "No HTTP response"} · {map.urls} URLs{map.error ? ` · ${map.error}` : ""}</p>)}</details>
      {!!crawl.errors.length && <details className="mt-3 rounded-lg border p-4"><summary className="cursor-pointer text-sm font-semibold">Crawl issues · {crawl.errors.length}</summary><ul className="mt-3 space-y-3 text-xs text-muted-foreground">{crawl.errors.map((error, i) => <li key={`${error.url}:${i}`}><p className="break-all font-medium">{error.url}</p><p className="mt-1">{error.message}</p></li>)}</ul></details>}
      <details className="mt-3 rounded-lg border p-4"><summary className="cursor-pointer text-sm font-semibold">Pages and request evidence · {snapshot.pages.length}</summary><div className="mt-4 max-h-[32rem] overflow-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b"><th className="p-2">Page</th><th className="p-2">Type</th><th className="p-2">HTTP</th><th className="p-2">Checked</th></tr></thead><tbody>{snapshot.pages.map((page) => <tr key={page.id} className="border-b align-top"><td className="max-w-sm p-2"><a href={page.url} target="_blank" rel="noreferrer" className="break-all text-primary underline">{page.url}</a><p className="mt-1 text-muted-foreground">{page.live?.htmlInspected ? "HTML inspected" : "HTML not inspected"}{page.live?.error ? ` · ${page.live.error}` : ""}</p></td><td className="p-2">{page.kind === "pdp" ? "Product" : page.kind}</td><td className="p-2">{page.statusCode ?? "Unknown"}</td><td className="min-w-36 p-2">{page.live?.fetchedAt ? new Date(page.live.fetchedAt).toLocaleString() : "Unknown"}</td></tr>)}</tbody></table></div></details>
    </>}
  </Panel>;
}
function ScoreCard({ category, audit, ctx, visibilityRuns }: {
    category: SeoCategory;
    audit: SeoAudit;
    ctx: SeoContext;
    visibilityRuns: VisibilityRun[];
}) {
    if (category === "GEO") {
        const run = visibilityRuns.filter((r) => r.brandId === ctx.brandId && r.contextHash === ctx.contextHash).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
        const summary = run ? summarizeVisibility(run) : undefined;
        return <Panel><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">GEO response evidence</span><Badge variant="outline">{run ? run.status === "running" ? "Collecting" : "Observed sample" : "Unmeasured"}</Badge></div><div className="my-3 flex items-baseline gap-2"><span className="font-serif text-5xl">{summary?.completed ?? "—"}</span><span className="text-sm text-muted-foreground">{run ? `/ ${run.plannedResponses ?? run.observations.length} responses` : "No answers collected"}</span></div><p className="text-xs text-muted-foreground">{run ? `${summary?.failed ?? 0} failed · API answer evidence; separate from website readiness.` : "Run a connected visibility audit to collect actual answers and citations."}</p><div className="mt-3"><Jump to="/seo/geo">Review visibility evidence</Jump></div></Panel>;
    }
    const score = audit.scores[category];
    return <Panel><div className="flex justify-between gap-2"><span className="font-semibold">{category} readiness</span><Badge variant="outline">{audit.mode === "demo" ? "Demo" : score.total ? "Website checks" : "Unassessed"}</Badge></div><div className="my-3 flex items-baseline gap-2"><span className="font-serif text-5xl">{score.score ?? "—"}</span><span className="text-sm text-muted-foreground">{score.score === null ? "Not assessed" : "/ 100"}</span></div><div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${score.score ?? 0}%` }}/></div><p className="mt-3 text-xs text-muted-foreground">{score.failed} need work · {score.passed} passed · {score.unknown} unknown</p></Panel>;
}
function AuditFocus({ ctx, snapshot }: {
    ctx: SeoContext;
    snapshot: SeoSnapshot;
}) {
    const excluded = (snapshot.crawl?.excludedUrls ?? 0) + Math.max(0, (snapshot.crawl?.crawledPages ?? snapshot.pages.length) - snapshot.pages.length);
    return <Panel title="Focus on the pages that help shoppers discover and buy">
    <p className="text-sm text-muted-foreground">Homepage, core product pages and existing blog content. Promotions, giveaways, referral pages, policies and other utility pages are left out of findings and scores.</p>
    <p className="mt-3 text-sm">{snapshot.pages.length} pages in scope{excluded > 0 ? ` · ${excluded} other discovered pages left out` : ""}</p>
    <p className="mt-2 text-xs text-muted-foreground">Core products come from the product URLs in Brand Brain. {coreProducts(ctx).some(p => p.url) ? "Keep those URLs complete to include your full core range." : "Product URLs are not mapped yet, so product paths are included provisionally. Add your core product URLs to narrow the audit."} This is a page relevance filter; revenue impact has not been measured.</p>
    <div className="mt-4 flex flex-wrap gap-4"><Jump to="/brand">Review core products</Jump><Jump to="/seo/planning">Research new blog opportunities</Jump></div>
  </Panel>;
}
function FindingGroupCard({ group, ctx, pages, pending, onCreate }: {
    group: FindingGroup;
    ctx: SeoContext;
    pages: SeoSnapshot["pages"];
    pending: boolean;
    onCreate: (findingId: string) => void;
}) {
    return <Panel><div data-testid="finding-group"><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant={group.priority === "P1" ? "default" : "outline"}>{group.priority}</Badge><span className="text-xs text-muted-foreground">{group.category} · {group.findings.length} affected {group.findings.length === 1 ? "page" : "pages"}</span></div>
    <h2 className="font-semibold">{group.title}</h2><p className="mt-3 text-sm text-muted-foreground">{group.findings[0].why}</p>
    <h3 className="mt-4 text-sm font-semibold">How to fix it</h3><p className="mt-2 text-sm leading-6">{group.remedy}</p>
    <details className="mt-4 border-t pt-4"><summary className="cursor-pointer text-sm font-semibold text-primary">View {group.findings.length} affected {group.findings.length === 1 ? "page" : "pages"} and evidence</summary>
      <div className="mt-3 divide-y">{group.findings.map(f => <div key={f.id} className="py-4"><a href={f.url} target="_blank" rel="noreferrer" className="break-all text-sm text-primary underline">{f.url}</a><ul className="my-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{f.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul><Button variant="outline" disabled={pending} onClick={() => onCreate(f.id)}>Prepare fix for this page<ArrowRight className="size-4"/></Button><DiagnosisPanel finding={f} ctx={ctx} page={pages.find(p => p.url === f.url)}/></div>)}</div>
    </details></div></Panel>;
}
function ArtifactList({ artifacts, ctx }: {
    artifacts: SeoArtifact[];
    ctx: SeoContext;
}) { return <Panel title="Saved work">{!artifacts.length ? <Empty>Create a blog or fix package to start your handoff queue.</Empty> : <div className="divide-y">{artifacts.map((a) => <Link href={`/seo/content?id=${a.id}`} key={a.id} className="flex flex-wrap items-center gap-3 py-4 hover:text-primary"><FileText className="size-5 shrink-0"/><div className="min-w-0 flex-1"><p className="font-medium">{a.title}</p><p className="mt-1 text-xs text-muted-foreground">{a.kind === "blog" ? a.keyword : a.answerEntry ? "Answer-entry implementation" : "Audit fix package"} · Revision {a.revision}</p></div>{a.contextHash !== ctx.contextHash && <Badge variant="destructive">Brand facts changed</Badge>}<Badge variant="outline">{a.mode === "demo" ? "Demo draft" : "Brand / website evidence"}</Badge><Badge variant="outline">{statusName[a.status]}</Badge><ArrowRight className="size-4"/></Link>)}</div>}</Panel>; }
export function ArtifactEditor({ artifact: a, ctx, listPath = "/seo/content" }: {
    artifact: SeoArtifact;
    ctx: SeoContext;
    listPath?: string;
}) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [title, setTitle] = useState(a.title);
    const [description, setDescription] = useState(a.description);
    const [body, setBody] = useState(a.body);
    const [preview, setPreview] = useState(false);
    const [note, setNote] = useState("");
    const dirty = title !== a.title || description !== a.description || body !== a.body;
    const recoveryKey = `seo:unsaved:${ctx.brandId}:${a.id}:${a.revision}`;
    const [recoveryReady, setRecoveryReady] = useState(false);
    const [recovered, setRecovered] = useState(false);
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(recoveryKey);
            if (raw) {
                const draft = JSON.parse(raw);
                if (typeof draft.title === "string" && draft.title.length <= 240 && typeof draft.description === "string" && draft.description.length <= 500 && typeof draft.body === "string" && draft.body.length <= 100000) {
                    setTitle(draft.title);
                    setDescription(draft.description);
                    setBody(draft.body);
                    setRecovered(true);
                }
            }
        }
        catch { }
        setRecoveryReady(true);
    }, [recoveryKey]);
    useEffect(() => {
        if (!recoveryReady)
            return;
        try {
            if (dirty)
                sessionStorage.setItem(recoveryKey, JSON.stringify({ title, description, body }));
            else
                sessionStorage.removeItem(recoveryKey);
        }
        catch { }
    }, [recoveryReady, recoveryKey, dirty, title, description, body]);
    useEffect(() => {
        if (!dirty)
            return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);
    const checks = contentChecks({ ...a, title, description, body }, ctx);
    const stale = a.contextHash !== ctx.contextHash;
    const perform = (fn: () => Promise<{
        ok: boolean;
        error?: string;
    }>, message: string) => start(async () => { try {
        const r = await fn();
        if (!r.ok)
            toast.error(r.error);
        else {
            try {
                sessionStorage.removeItem(recoveryKey);
            }
            catch { }
            toast.success(message);
            router.refresh();
        }
    }
    catch {
        toast.error("Could not save. Your text is still in this editor.");
    } });
    const exportFile = (format: "html" | "json" | "md" | "copy" | "code") => start(async () => { try {
        const r = await exportSeoArtifactAction(ctx.brandId, a.id, a.revision);
        if (!r.ok) {
            toast.error(r.error);
            return;
        }
        if (format === "copy") {
            await navigator.clipboard.writeText(r.value.html);
        }
        else if (format === "code") {
            for (const file of r.value.artifact.codeFiles ?? [])
                download(file.name, file.code);
        }
        else {
            const value = format === "json" ? JSON.stringify(r.value, null, 2) : format === "html" ? r.value.html : a.body;
            download(`seo-${a.id}-r${a.revision}.${format}`, value, format === "json" ? "application/json" : format === "html" ? "text/html" : "text/markdown");
        }
        router.refresh();
        if (r.value.evidenceReview?.status === "needs_review")
            toast.warning("The historical export needs source review. Changed evidence invalidated its prior approval; inspect the editorial brief before implementation.");
        else
            toast.success(format === "copy" ? "HTML copied for manual implementation." : "Export prepared for manual implementation.");
    }
    catch {
        router.refresh();
        toast.error("Download or clipboard unavailable. Try another export format.");
    } });
    const blocked = !recoveryReady || pending || dirty || stale || !!checks.blockers.length;
    return <>
    <div className="flex flex-wrap items-center justify-between gap-3"><Jump to={a.kind === "fix" ? "/seo/changes" : listPath}>{a.kind === "fix" ? "All handoff packages" : "All blog drafts"}</Jump><div className="flex items-center gap-2"><Badge variant="outline">{a.mode === "demo" ? "Demo draft" : "Brand / website evidence"}</Badge><Badge variant="outline">{statusName[a.status]}</Badge><span className="text-xs text-muted-foreground">Revision {a.revision} · {a.kind === "blog" ? articleWordCount(body) : body.split(/\s+/).filter(Boolean).length} words</span></div></div>
    {stale && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">The shared Brand Brain changed after this draft was created. Create a fresh draft and review the differences before exporting.</div>}
    {recovered && dirty && <p role="status" className="rounded-lg border bg-accent/50 p-3 text-sm">Recovered unsaved edits from this browser tab. Save them to keep this revision.</p>}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel><div className="mb-5 flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">{a.kind === "blog" ? "Blog editor" : "Implementation brief"}</h2><p className="mt-1 text-xs text-muted-foreground">{a.keyword || a.targetUrl}</p></div><Button variant="outline" disabled={!recoveryReady || pending} onClick={() => setPreview(!preview)}>{preview ? "Edit draft" : (a.kind === "fix" ? "Preview brief" : "Preview article")}</Button></div>
        {preview ? <article className="min-w-0 space-y-4 break-words text-sm leading-7 [&_h1]:font-serif [&_h1]:text-3xl [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: () => null, table: ({ children }) => <div className="overflow-x-auto"><table className="w-full border-collapse text-xs [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2">{children}</table></div> }}>{body}</ReactMarkdown></article> : <div className="space-y-4"><label className="block text-sm font-medium">Title<Input className="mt-2" value={title} disabled={!recoveryReady || pending} maxLength={240} onChange={(e) => setTitle(e.target.value)}/></label><label className="block text-sm font-medium">Search description<Textarea className="mt-2" value={description} disabled={!recoveryReady || pending} maxLength={500} onChange={(e) => setDescription(e.target.value)}/></label><label className="block text-sm font-medium">{a.kind === "blog" ? "Article (Markdown)" : "Fix instructions (Markdown)"}<Textarea className="mt-2 min-h-[38rem] font-mono text-sm leading-6" value={body} disabled={!recoveryReady || pending} maxLength={100000} onChange={(e) => setBody(e.target.value)}/></label></div>}
        <div className="mt-5 flex items-center gap-3"><Button disabled={pending || !dirty} onClick={() => perform(() => updateSeoArtifactAction(ctx.brandId, a.id, a.revision, { title, description, body }), "Draft saved; review this revision before export.")}>Save changes</Button>{dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}</div>
      </Panel>
      <div className="space-y-4">{a.kind === "blog" && <DraftLinkPanel ctx={ctx} artifact={a} disabled={pending || dirty || stale}/>}{a.answerEntry && <AnswerImplementationPanel artifact={a} stale={stale} dirty={dirty}/>}<Panel title="Review and handoff"><p className="mb-4 text-xs text-muted-foreground">Confirm accuracy, product relevance and links. This app never publishes to your store.</p>
        {checks.blockers.map((c) => <p key={c} role="alert" className="mb-3 text-sm text-destructive">{c}</p>)}
        <ul className="mb-5 list-disc space-y-2 pl-4 text-xs text-muted-foreground">{checks.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        {a.status === "draft" ? <Button className="w-full" disabled={blocked} onClick={() => perform(() => advanceSeoArtifactAction(ctx.brandId, a.id, a.revision, "approved"), "Revision approved for manual handoff.")}><Check className="size-4"/>Approve for handoff</Button> : <div className="grid gap-2"><Button disabled={blocked} onClick={() => exportFile("json")}><Download className="size-4"/>Download full package</Button><Button variant="outline" disabled={blocked} onClick={() => exportFile("html")}>Download HTML</Button><Button variant="outline" disabled={blocked} onClick={() => exportFile("md")}>Download Markdown</Button><Button variant="outline" disabled={blocked} onClick={() => exportFile("copy")}>Copy HTML</Button>{!!a.codeFiles?.length && <Button variant="outline" disabled={blocked} onClick={() => exportFile("code")}>{a.kind === "blog" ? "Download editorial brief" : "Download code files"}</Button>}</div>}
        {(a.status === "exported" || a.status === "applied") && <div className="mt-5 border-t pt-4"><label className="text-sm font-medium">{a.status === "exported" ? (a.answerEntry ? "Implementation or record URL" : "Actual published URL") : "Fresh verification evidence"}<Textarea className="my-2" value={note} onChange={(e) => setNote(e.target.value)} placeholder={a.status === "exported" ? "https://your-store.com/blogs/…" : "Checked rendered content and product links on…"}/></label><Button variant="outline" disabled={blocked} onClick={() => perform(() => advanceSeoArtifactAction(ctx.brandId, a.id, a.revision, a.status === "exported" ? "applied" : "verified", note), "Human implementation record saved.")}>{a.status === "exported" ? "Record implementation" : "Record human verification"}</Button></div>}
      </Panel>
      {!!a.codeFiles?.length && <Panel title={a.kind === "blog" ? "Editorial evidence and brief" : "Code for developer review"}>{a.codeFiles.map((file) => <div key={file.name} className="space-y-3"><Badge variant="outline">{a.kind === "blog" ? "Editorial reference" : "Theme adaptation required"}</Badge><p className="text-xs text-muted-foreground">{file.placement}</p><pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs"><code>{file.code}</code></pre><p className="text-xs text-muted-foreground">{file.validation}</p><a href={file.source} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{a.kind === "blog" ? "Source reference" : "Technical reference"}</a></div>)}</Panel>}
      <Panel title="Brand details and sources"><p className="text-xs text-muted-foreground">{ctx.brandName} · {ctx.market}<br />Brain version: {a.contextHash}</p><ul className="mt-3 space-y-2 break-all text-xs">{[...new Set(a.sourceIds)].map((id) => <li key={id}>{id}</li>)}</ul><p className="mt-3 text-xs text-muted-foreground">Brand-level claims are not automatically assigned to a product. Add only statements supported for the exact SKU.</p><div className="mt-4"><Jump to="/brand">Review shared facts</Jump></div></Panel>
      <Panel title="Manual installation"><ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-muted-foreground">{a.answerEntry ? <><li>Complete the route-specific worksheet and review the source evidence.</li><li>Approve and download the package, then apply it in the appropriate store, CMS or commerce platform.</li><li>Record the actual page or platform record URL and fresh verification evidence here.</li><li>Repeat the original answer protocol to measure visibility separately.</li></> : <><li>Keep a rollback copy of the page or theme.</li><li>Paste the reviewed title, HTML and search description into a draft blog post or give the fix brief to your developer.</li><li>Confirm the exact product and article URLs; replace proposed or legacy demo paths.</li><li>Check claims, links and mobile preview, then publish in the store.</li><li>Record the live URL and fresh verification here.</li></>}</ol></Panel>
      <details className="rounded-xl border p-4 text-xs"><summary className="cursor-pointer font-semibold">Revision activity</summary>{a.history.map((h, i) => <p className="mt-3" key={i}>{new Date(h.at).toLocaleString()} · {h.message}</p>)}</details></div>
    </div>
  </>;
}
