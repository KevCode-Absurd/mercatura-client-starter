import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { FOUNDER_HOOKS } from "@/lib/hooks/bank-info";
import { loadOrganic, planRows } from "@/lib/organic/store";
import { OrganicView } from "./organic-view";
import Link from "next/link";
export const metadata = { title: "Organic" };
export default async function OrganicPage({ searchParams }: {
    searchParams: Promise<{
        tab?: string;
    }>;
}) {
    const { tab } = await searchParams;
    const row = await activeBrand();
    const brand = loadBrandBrain(row.id);
    const file = loadOrganic(row.id);
    const rows = planRows(file).map((r) => ({ ...r, like: r.idea.like ? (FOUNDER_HOOKS.find((h) => h.id === r.idea.like)?.beats ?? []) : [] }));
    return (<div className="mx-auto max-w-[80rem]">
      <PageHeader title="Organic" subtitle={`What ${brand.brand.name} posts as itself: videos the founder films, and what creators make when they are sent the product. Nothing on this screen is an ad, and nothing is posted or sent from here.`}>
        <Link className="text-sm underline" href="/creators">Find creators</Link>
        <Link className="text-sm underline" href="/video-editing?mode=organic">Edit organic footage</Link>
      </PageHeader>
      <OrganicView initialTab={tab === "creators" ? "creators" : "founder"} brandName={brand.brand.name} products={brand.products.map((p) => ({ id: p.id, name: p.name }))} personas={brand.personas.map((p) => ({ id: p.id, name: p.name }))} rows={rows} creators={file.creators} handle={file.handle} today={new Date().toISOString().slice(0, 10)}/>
    </div>);
}
