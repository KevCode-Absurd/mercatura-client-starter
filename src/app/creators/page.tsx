import Link from "next/link";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { BrandBrainError } from "@/lib/brand-brain";
import { creatorResearchConnection } from "@/lib/creator-discovery/provider";
import { discoveryRuns } from "@/lib/creator-discovery/service";
import { loadOrganic } from "@/lib/organic/store";
import { CreatorsView } from "./creators-view";
export const metadata = { title: "Find creators" };
export default async function CreatorsPage() {
    const row = await activeBrand();
    let brain;
    try {
        brain = loadBrandBrain(row.id);
    }
    catch (error) {
        if (!(error instanceof BrandBrainError))
            throw error;
        return <div className="p-6"><h1 className="display text-3xl">Complete your brand brain first</h1><p className="mt-3">Creator matching uses your products, buyers, positioning and brand voice.</p><Link className="mt-4 block underline" href="/brand">Open Brand brain</Link></div>;
    }
    const connection = creatorResearchConnection();
    return <div className="mx-auto max-w-[80rem]">
    <PageHeader title="Find creators" subtitle={`Find collaborators for ${brain.brand.name} from your brand brain. Compare content relevance, inspect the evidence and save the creators you want to contact.`} back={{ href: "/brand", label: "Brand brain" }}>
      <Link className="text-sm underline" href="/organic?tab=creators">Creator tracker</Link>
    </PageHeader>
    <CreatorsView key={row.id} brandName={brain.brand.name} market={brain.brand.market} products={brain.products.map(p => ({ id: p.id, name: p.name }))} personas={brain.personas.map(p => ({ id: p.id, name: p.name }))} connection={connection} runs={discoveryRuns(row.id)} tracked={loadOrganic(row.id).creators.map(c => ({ handle: c.handle, platform: c.platform, profile_url: c.profile_url }))}/>
  </div>;
}
