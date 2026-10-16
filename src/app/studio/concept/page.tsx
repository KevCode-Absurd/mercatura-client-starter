import Link from "next/link";
import { PageHeader } from "@/components/bits";
import { BrandBrainError } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { claimsHeld } from "@/lib/claims-through";
import { loadBrandBrain } from "@/lib/brands";
import { KIND_INFO } from "@/lib/library/taxonomy";
import { llmEnabled } from "@/lib/llm/gateway";
import { mediaUsage } from "@/lib/media/providers";
import { offerChoices } from "@/lib/offers/book";
import { funnelOf } from "@/lib/studio/worlds";
import { ConceptForm } from "./concept-form";
export default async function ConceptAdsPage({ searchParams }: {
    searchParams: Promise<{
        for?: string;
    }>;
}) {
    const funnel = funnelOf((await searchParams).for)?.id ?? "cold";
    const row = await activeBrand();
    let products: {
        id: string;
        name: string;
    }[] = [];
    let personas: {
        id: string;
        name: string;
    }[] = [];
    let offers: {
        id: string;
        name: string;
    }[] = [];
    let problem = "";
    try {
        const brand = loadBrandBrain(row.id);
        products = brand.products.map((p) => ({ id: p.id, name: p.name }));
        personas = brand.personas.map((p) => ({ id: p.id, name: p.name }));
        offers = offerChoices(row.id, brand).map((o) => ({ id: o.id, name: o.name }));
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
        problem = `${row.name} is not set up yet. Build the brand brain first.`;
    }
    const usage = mediaUsage();
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: "/studio/ads", label: "Back" }} title={funnel === "cold" ? "Concept ads for cold audiences" : funnel === "warm" ? "Proof ads for buyers who are comparing" : "Offer ads for buyers who are ready"} subtitle={`Each ad is 1 argument for 1 buyer, shown as 1 picture in 1 visual world. For ${row.name}, on a real photo of the product.`}/>
      <div className="space-y-6 p-6">
        <p className="max-w-3xl rounded-lg border bg-muted/30 p-4 text-sm text-amber-800" data-testid="concept-new">
          This way of making an ad is new. Start with 4 and read the plan before you make more.
        </p>
        {problem ? (<p className="text-sm text-amber-800">
            {problem}{" "}
            <Link href="/brand" className="underline">
              Open the Brand brain
            </Link>
          </p>) : (<ConceptForm products={products} personas={personas} offers={offers} aspects={KIND_INFO.ad.aspects} live={llmEnabled()} imagesLeft={Math.max(0, usage.imageCap - usage.images)} funnel={funnel} claims={claimsHeld(row.id)}/>)}
      </div>
    </div>);
}
