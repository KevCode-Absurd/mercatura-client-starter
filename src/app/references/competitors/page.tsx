import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { BrandBrainError } from "@/lib/brand-brain";
import { loadBrandBrain } from "@/lib/brands";
import { providerState } from "@/lib/competitor-playbook/providers";
import { llmEnabled } from "@/lib/llm/gateway";
import { ReferencesTabs } from "../references-tabs";
import { CompetitorPlaybook } from "./playbook-view";
export default async function CompetitorPlaybookPage() {
    const brand = await activeBrand();
    let products: {
        id: string;
        name: string;
    }[] = [];
    try {
        products = loadBrandBrain(brand.id).products.map(({ id, name }) => ({ id, name }));
    }
    catch (error) {
        if (!(error instanceof BrandBrainError))
            throw error;
    }
    return <div className="mx-auto w-full max-w-[96rem]">
    <PageHeader title="Competitor playbook" subtitle={`Study their static ads. Create fresh ads for ${brand.name}, with your own product and brand.`}/>
    <ReferencesTabs />
    <CompetitorPlaybook brandName={brand.name} brandId={brand.id} products={products} connections={providerState()} live={llmEnabled()}/>
  </div>;
}
