import { activeBrandId } from "@/lib/brand-context";
import { PageHeader } from "@/components/bits";
import { FUNNEL_TARGET, PAIN_TARGET, funnelMix, painShare } from "@/lib/mix";
import { getConcepts, getJobs, getScripts, getThemes, tryBrand } from "@/lib/queries";
import { getSetting } from "@/lib/settings";
import { PlannerView } from "./planner-view";
export default async function PlannerPage() {
    const brandId = await activeBrandId();
    const concepts = getConcepts(brandId);
    const scripts = getScripts(brandId);
    const jobs = getJobs(brandId);
    const themes = getThemes(brandId);
    const typeOf = new Map(themes.map((t) => [t.id, t.type]));
    const month = new Date().toISOString().slice(0, 7);
    const thisMonth = (d: string) => d.slice(0, 7) === month;
    const conceptThemeTypes = concepts.flatMap((c) => [...new Set(c.theme_ids)].map((id) => typeOf.get(id)).filter((t) => !!t));
    const tagCounts = { replication: 0, iteration: 0, net_new: 0 };
    for (const j of jobs)
        tagCounts[j.tag]++;
    const have = {
        activeConcepts: concepts.filter((c) => c.status !== "paused").length,
        scriptsApprovedThisMonth: scripts.filter((s) => s.status !== "draft" && thisMonth(s.updated_at)).length,
        assetsApprovedThisMonth: jobs
            .filter((j) => (j.status === "approved" || j.status === "sent") && thisMonth(j.updated_at))
            .reduce((n, j) => n + Math.max(j.assets.length, 1), 0),
        funnel: funnelMix([...concepts.map((c) => c.awareness_stage), ...scripts.map((s) => s.awareness_stage)]),
        pain: painShare(conceptThemeTypes as never),
        effort: jobs.length
            ? {
                replication: tagCounts.replication / jobs.length,
                iteration: tagCounts.iteration / jobs.length,
                net_new: tagCounts.net_new / jobs.length,
            }
            : null,
    };
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader title="Planner" subtitle="How many ads to make, what to spend on production, and whether each format pays for itself."/>
      <PlannerView defaults={getSetting(brandId, "planner")} currency={tryBrand(brandId)?.brand.currency ?? ""} have={have} targets={{ funnel: FUNNEL_TARGET, pain: PAIN_TARGET }}/>
    </div>);
}
