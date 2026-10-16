import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { tryBrand } from "@/lib/queries";
import { guideModel } from "@/lib/brain/guide";
import { catalogProducts } from "@/lib/brain/products";
import { loadBrandLook } from "@/lib/brand-look";
import { loadCreativeKit, productImageChoices } from "@/lib/production/kit";
import { listRuns } from "@/lib/studio/engine";
import { PdpImagesView } from "./pdp-images-view";
import { getEvidence } from "@/lib/landing/evidence";
export const dynamic = "force-dynamic";
export default async function PdpImagesPage({ searchParams }: {
    searchParams: Promise<{
        evidence?: string;
        product?: string;
    }>;
}) {
    const sp = await searchParams;
    const row = await activeBrand(), brain = tryBrand(row.id);
    if (!brain)
        return <div className="p-8"><h1 className="text-2xl font-semibold">PDP image studio</h1><p className="mt-3">Set up your <a href="/brand" className="underline">Brand Brain</a> and product photos first.</p></div>;
    const kit = loadCreativeKit(row.id), catalog = catalogProducts(row.id), look = loadBrandLook(row.id);
    const candidate = sp.evidence ? getEvidence(sp.evidence) : null;
    const evidence = candidate?.brandId === row.id ? candidate : null;
    const products = brain.products.map(p => ({ id: p.id, name: p.name, url: catalog.find(c => c.name.trim().toLowerCase() === p.name.trim().toLowerCase())?.url ?? "", photos: productImageChoices(row.id, kit, p.id).files.length }));
    return <div className="mx-auto max-w-[90rem]"><PageHeader back={{ href: "/landing", label: "CRO studio" }} title="PDP image studio" subtitle="Turn the right reference into your product's next gallery. Your product, your facts, your brand."/>
    <PdpImagesView key={`${row.id}:${evidence?.id ?? ""}:${sp.product ?? ""}`} brand={row.name} website={guideModel(row.id).site} products={products} initialEvidence={evidence} initialProduct={sp.product} colors={look?.palette.map(p => p.hex) ?? []} fonts={look?.fonts.map(f => `${f.family} · ${f.weight} · ${f.style}`) ?? []} runs={listRuns(row.id, "pdp").slice(0, 30).map(r => ({ id: r.id, title: r.title, status: r.status, count: r.items.length }))}/>
  </div>;
}
