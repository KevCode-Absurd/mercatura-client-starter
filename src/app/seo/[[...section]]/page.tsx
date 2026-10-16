import { notFound } from "next/navigation";
import { activeBrand } from "@/lib/brand-context";
import { BrandBrainError } from "@/lib/brand-brain";
import { NeedsBrain } from "@/components/needs-brain";
import { seoContext } from "@/lib/seo/context";
import { buildPlanningSnapshot, emptyAudit } from "@/lib/seo/model";
import { completedSeoLessons, listArtifactPage, readArtifact, readFocusedAudit, listVisibilityRuns } from "@/lib/seo/store";
import Link from "next/link";
import { visibilityConnection } from "@/lib/seo/visibility-provider";
import { withVisibilityEvidence } from "@/lib/seo/audit-visibility";
import { SeoWorkspace } from "../workspace";
import { loadMeasurement } from "@/lib/seo/measurement-store";
import { loadSearchPlan } from "@/lib/seo/planning-store";
import { loadGrowth } from "@/lib/seo/growth-store";
import { workspaceEvidence } from "@/lib/seo/workspace-data";
import { SeoLearningPage } from "../learning-page";
import { loadStrategy } from "@/lib/seo/strategy-store";
import { listCitationDrafts } from "@/lib/seo/citation-outreach-store";
export async function generateMetadata({ params }: {
    params: Promise<{
        section?: string[];
    }>;
}) {
    const key = (await params).section?.[0] ?? "overview";
    const names: Record<string, string> = { overview: "Overview", strategy: "Customer growth strategy", agents: "Agent shopping", priorities: "Growth plan", planning: "Search planner", optimize: "Page optimizer", measurement: "Measurement", audits: "Audits", opportunities: "Keywords", content: "Blog studio", aeo: "AEO", geo: "GEO", outreach: "Citation outreach", changes: "Handoff", learn: "Learn" };
    return { title: `${names[key] ?? "Workspace"} · SEO`, description: "D2C search audits, keyword-led content and manual implementation packages." };
}
export default async function SeoPage({ params, searchParams }: {
    params: Promise<{
        section?: string[];
    }>;
    searchParams: Promise<{
        id?: string;
        planId?: string;
        before?: string;
        beforeId?: string;
    }>;
}) {
    const { section = [] } = await params;
    const view = section[0] ?? "overview";
    if (section.length > 1 || !["overview", "strategy", "agents", "priorities", "planning", "optimize", "measurement", "audits", "opportunities", "content", "aeo", "geo", "outreach", "changes", "learn"].includes(view))
        notFound();
    const brand = await activeBrand();
    if (view === "learn")
        return <SeoLearningPage brandId={brand.id} brandName={brand.name} completed={completedSeoLessons(brand.id)} selectedId={(await searchParams).id}/>;
    try {
        const ctx = seoContext(brand.id);
        const saved = readFocusedAudit(ctx);
        const current = saved?.audit.mode === "live" && saved.audit.contextHash === ctx.contextHash ? saved : null;
        const snapshot = current?.snapshot ?? buildPlanningSnapshot(ctx);
        const visibilityRuns = listVisibilityRuns(brand.id);
        const audit = withVisibilityEvidence(current?.audit ?? emptyAudit(ctx), visibilityRuns.find((run) => run.contextHash === ctx.contextHash));
        const query = await searchParams, searchPlan = loadSearchPlan(brand.id);
        const blogSeed = searchPlan.rows.find((r) => r.id === query.planId && r.contextHash === ctx.contextHash && r.intent === "informational");
        const evidence = workspaceEvidence(view, snapshot, audit);
        const artifactPage = listArtifactPage(brand.id, 25, query.before && query.beforeId ? { updated: query.before, id: query.beforeId } : undefined);
        const selected = query.id ? readArtifact(brand.id, query.id) : null;
        const artifacts = selected ? [selected, ...artifactPage.items.filter(a => a.id !== selected.id)] : artifactPage.items;
        return <><div className="mb-4 flex gap-4 text-sm"><Link className="underline" href="/production-ops">Production queue and campaign review</Link>{artifactPage.next && <Link className="underline" href={`/seo/${view}?before=${encodeURIComponent(artifactPage.next.updated)}&beforeId=${encodeURIComponent(artifactPage.next.id)}`}>Older saved work</Link>}{query.before && <Link className="underline" href={`/seo/${view}`}>Newest saved work</Link>}</div><SeoWorkspace key={`${brand.id}:${view}`} view={view} ctx={ctx} snapshot={evidence.snapshot} audit={evidence.audit} auditedAt={current?.at ?? null} artifacts={["overview", "priorities", "content", "changes", "aeo", "geo"].includes(view) ? artifacts : []} citationDrafts={["geo", "outreach"].includes(view) ? listCitationDrafts(brand.id) : []} completed={completedSeoLessons(brand.id)} selectedId={query.id} visibilityRuns={["overview", "strategy", "agents", "priorities", "aeo", "geo", "outreach"].includes(view) ? visibilityRuns : []} visibilityConnection={visibilityConnection()} measurement={["strategy", "agents", "priorities", "measurement", "planning"].includes(view) ? loadMeasurement(brand.id) : { search: [], lab: [] }} searchPlan={searchPlan} growthWork={loadGrowth(brand.id)} strategy={["strategy", "agents"].includes(view) ? loadStrategy(brand.id) : null} blogSeed={blogSeed ? { ...blogSeed.editorialBrief, planId: blogSeed.id, keyword: blogSeed.keyword, productId: blogSeed.productId, targetUrl: blogSeed.targetUrl } : undefined}/></>;
    }
    catch (e) {
        if (e instanceof BrandBrainError)
            return <NeedsBrain title="SEO" brandName={brand.name}/>;
        throw e;
    }
}
