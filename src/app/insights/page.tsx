import { angleLibrary } from "@/lib/angles/server";
import { activeBrand } from "@/lib/brand-context";
import { EmptyNext } from "@/components/empty-next";
import { NeedsBrain } from "@/components/needs-brain";
import { PageHeader } from "@/components/bits";
import { queueStats } from "@/lib/jobs/queue";
import { llmEnabled } from "@/lib/llm/gateway";
import { getInsights, getSourceItems, getThemes, tryBrand } from "@/lib/queries";
import { getSetting } from "@/lib/settings";
import { unthemedCount } from "@/lib/themes";
import { isAdvanced } from "@/lib/ui-mode-server";
import { InsightsView } from "./insights-view";
export default async function InsightsPage({ searchParams }: {
    searchParams: Promise<{
        theme?: string;
        view?: string;
    }>;
}) {
    const row = await activeBrand();
    const brandId = row.id;
    const brand = tryBrand(brandId);
    if (!brand)
        return <NeedsBrain title="Insights" brandName={row.name} why="Insights are read out of what customers say, against the brand's products and buyers."/>;
    const sp = await searchParams;
    const themes = getThemes(brandId);
    const insights = getInsights(brandId);
    const items = getSourceItems(brandId).map((i) => ({ id: i.id, source_type: i.source_type, date: i.date, title: i.title }));
    const personas = brand.personas.map((p) => ({ id: p.id, name: p.name }));
    const w = getSetting(brandId, "rank_weights");
    const { cluster } = queueStats(brandId);
    const advanced = await isAdvanced("insights");
    return (<div className="mx-auto max-w-[80rem]">
      <PageHeader title="Insights" subtitle={advanced ? (<>
            Themes ranked by intensity, frequency and source diversity (weights {w.w_int} / {w.w_freq} / {w.w_div}, edit in
            Settings). Every quote links back to its source.
          </>) : (<>What buyers say, grouped into themes and ranked by how strongly and how often they say it. Every quote links back to its source.</>)}/>
      {insights.length === 0 &&
            (items.length ? (<EmptyNext title="Nothing has been read for insights yet" why={`${items.length} source item${items.length === 1 ? " is" : "s are"} imported. Each one still has to be read for what buyers want, fear and tried before. That is done in Sources, with Read for insights.`} href="/sources" act="Read them in Sources"/>) : (<EmptyNext title="No insights yet" why="Insights are read out of what customers say. Bring in reviews, support tickets, call transcripts, a survey or community posts first." href="/sources" act="Bring in research"/>))}
      {insights.length > 0 && themes.length === 0 && <EmptyNext title="The insights are not grouped into themes yet" why={advanced ? `${insights.length} insights are waiting. Press Re-cluster below to group them into themes: concepts and scripts are built on themes.` : `${insights.length} insights are waiting. Press the Sort button below to group them into themes: concepts and scripts are built on themes.`} href="#themes" act="See below" testid="empty-themes"/>}
      <InsightsView themes={themes} insights={insights} items={items} personas={personas} initialTheme={sp.theme ?? null} initialView={sp.view === "angles" ? "angles" : undefined} library={angleLibrary(brandId)} unthemed={unthemedCount(brandId)} live={llmEnabled()} clustering={cluster.queued + cluster.running > 0}/>
    </div>);
}
