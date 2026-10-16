import { activeBrand } from "@/lib/brand-context";
import { EmptyNext } from "@/components/empty-next";
import { NeedsBrain } from "@/components/needs-brain";
import { brandCode } from "@/lib/brand-brain";
import { llmEnabled } from "@/lib/llm/gateway";
import { getConcepts, getScripts, getThemes, tryBrand } from "@/lib/queries";
import { offerChoices } from "@/lib/offers/book";
import { speakerAges } from "@/lib/scripts/pace";
import { getSetting } from "@/lib/settings";
import { ConceptsView } from "./concepts-view";
import { explorationForBrand } from "@/lib/creative/exploration-data";
import { creativeBriefsFor } from "@/lib/creative-brief-store";
import { briefEditChoices } from "@/lib/creative-briefs";
import { conceptAssetCounts } from "@/lib/concept-assets";
export default async function ConceptsPage({ searchParams }: {
    searchParams: Promise<{
        new?: string;
        theme?: string;
        brief?: string;
    }>;
}) {
    const row = await activeBrand();
    const brandId = row.id;
    const sp = await searchParams;
    const brand = tryBrand(brandId);
    if (!brand)
        return <NeedsBrain title="Concepts" brandName={row.name} why="A concept is a buyer, an angle and an offer, and all 3 come from the brand brain."/>;
    const concepts = getConcepts(brandId);
    const scripts = getScripts(brandId);
    const themes = getThemes(brandId).map((t) => ({ id: t.id, label: t.label, type: t.type, score: t.score, rank: t.rank }));
    const scriptCounts = Object.fromEntries(concepts.map((c) => [c.id, scripts.filter((s) => s.concept_id === c.id).length]));
    return (<div className="mx-auto w-full max-w-[80rem]">
      <ConceptsView brandId={brandId} briefs={creativeBriefsFor(brandId)} editChoices={briefEditChoices(brandId, brand)} assetCounts={conceptAssetCounts(brandId)} briefId={sp.brief} concepts={concepts} themes={themes} personas={brand.personas} offers={offerChoices(brandId, brand, { keep: concepts.map((c) => c.offer_id) }).map((o) => ({ id: o.id, name: o.name }))} scriptCounts={scriptCounts} speakerAges={speakerAges(brandId, concepts.map((c) => c.persona_id))} brandCode={brandCode(brand)} adsetTemplate={getSetting(brandId, "naming").adset} openNewWithTheme={sp.new ? (sp.theme ?? "") : null} live={llmEnabled()} directions={explorationForBrand(brandId)} notice={concepts.length ? null : themes.length ? (<EmptyNext title="No concepts yet" why={`A concept is 1 buyer, 1 angle and 1 offer, resting on what customers said. ${themes.length} themes are ready to build from: press New concept above, or let the app suggest some.`} href="/insights" act="Read the themes first"/>) : (<EmptyNext title="No concepts yet, and no research to build them from" why="A concept has to rest on something customers said. Bring in reviews, tickets, calls or a survey, and read them for insights first." href="/sources" act="Bring in research"/>)}/>
    </div>);
}
