import { notFound } from "next/navigation";
import { PageHeader } from "@/components/bits";
import { NeedsBrain } from "@/components/needs-brain";
import { activeBrand } from "@/lib/brand-context";
import { tryBrand, getThemes } from "@/lib/queries";
import { getBriefPlan } from "@/lib/creative-brief-store";
import { briefEditChoices, recentBriefPlans } from "@/lib/creative-briefs";
import { llmEnabled } from "@/lib/llm/gateway";
import { BriefFlow } from "./brief-flow";
export default async function GuidedBriefPage({ searchParams }: {
    searchParams: Promise<{
        draft?: string;
    }>;
}) {
    const row = await activeBrand();
    const brand = tryBrand(row.id);
    if (!brand)
        return <NeedsBrain title="Plan my next ads" brandName={row.name} why="Your products, buyers and approved facts give the brief its direction."/>;
    const { draft: id } = await searchParams;
    const draft = id ? getBriefPlan(row.id, id) : null;
    if (id && !draft)
        notFound();
    return <div className="mx-auto w-full max-w-[80rem]">
    <PageHeader back={{ href: "/studio", label: "Create" }} title="Plan my next ads" subtitle={`Three concepts, each with three ways to tell the idea. Review the brief before making anything for ${row.name}.`}/>
    <BriefFlow key={`${row.id}:${id ?? "new"}`} brandId={row.id} brandName={row.name} products={brand.products} personas={brand.personas} offers={brand.offers} claims={brand.claims.filter((c) => c.status === "substantiated")} themes={getThemes(row.id).map((t) => ({ id: t.id, label: t.label }))} editChoices={briefEditChoices(row.id, brand)} initial={draft ?? null} recent={recentBriefPlans(row.id)} live={llmEnabled()}/>
  </div>;
}
