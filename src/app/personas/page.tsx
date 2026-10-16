import { PageHeader } from "@/components/bits";
import { NeedsBrain } from "@/components/needs-brain";
import { listAvatars } from "@/lib/avatars/store";
import { listedVoices } from "@/lib/avatars/voices";
import { BrandBrainError } from "@/lib/brand-brain";
import { FORMAT_RECIPES } from "@/lib/formats";
import { recipeUsesCharacterOnly } from "@/lib/production/prompts";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { llmEnabled } from "@/lib/llm/gateway";
import { offerChoices } from "@/lib/offers/book";
import { personaForScreen } from "@/lib/personas/doubts";
import { loadSegments } from "@/lib/personas/performance";
import { conceptsFor, listPersonas } from "@/lib/personas/store";
import { PersonasView } from "./personas-view";
export const dynamic = "force-dynamic";
export default async function PersonasPage() {
    const row = await activeBrand();
    let products: {
        id: string;
        name: string;
    }[] = [];
    let offers: {
        id: string;
        name: string;
    }[] = [];
    let problem: string | null = null;
    try {
        const brand = loadBrandBrain(row.id);
        products = brand.products.map((p) => ({ id: p.id, name: p.name }));
        offers = offerChoices(row.id, brand, { keep: listPersonas(row.id).map((p) => p.offer_id) }).map((o) => ({ id: o.id, name: `${o.name} (${brand.brand.currency} ${o.price})` }));
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
        problem = `${row.name} has no brand brain yet. Build the brand brain first: personas are kept with it.`;
    }
    const personas = problem ? [] : listPersonas(row.id);
    const perf = problem ? null : loadSegments(row.id);
    if (problem)
        return <NeedsBrain title="Personas" brandName={row.name} why="Personas are kept with the brand brain, beside the products and offers they buy."/>;
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader title="Personas" subtitle={<>The buyers {row.name} writes for. Build them from how each segment performs and what buyers say, or write one by hand. A persona in use can be picked for a concept, a script or a set of ads.</>}/>
      {problem ? (<p className="p-6 text-sm text-amber-800">{problem}</p>) : (<PersonasView brandName={row.name} initial={personas.map(personaForScreen)} avatars={listAvatars(row.id)} voices={listedVoices()} looks={FORMAT_RECIPES.filter((r) => r.character && recipeUsesCharacterOnly(r)).map((r) => ({ id: r.id, label: r.label }))} products={products} offers={offers} live={llmEnabled()} data={perf ? { simulated: perf.simulated, period: perf.period, segments: perf.segments.length, source: perf.source } : null} inConcepts={Object.fromEntries(personas.map((p) => [p.id, conceptsFor(row.id, p.id)]))}/>)}
    </div>);
}
