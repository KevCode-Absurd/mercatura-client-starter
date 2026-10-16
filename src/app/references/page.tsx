import { PageHeader } from "@/components/bits";
import { BrandBrainError } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { llmEnabled } from "@/lib/llm/gateway";
import { referenceAnalysisEnabled } from "@/lib/references/analyze";
import { referenceCardRows } from "@/lib/references/cards";
import { brandFit } from "@/lib/references/for-brand-load";
import { buildFacts, listReferences, NO_FILTER, summaryOf } from "@/lib/references/page";
import { getSetting } from "@/lib/settings";
import { offerChoices } from "@/lib/offers/book";
import { isAdvanced } from "@/lib/ui-mode-server";
import { ReferencesView } from "./references-view";
import { ReferencesTabs } from "./references-tabs";
export default async function ReferencesPage() {
    const brandRow = await activeBrand();
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
    try {
        const brand = loadBrandBrain(brandRow.id);
        products = brand.products.map((x) => ({ id: x.id, name: x.name }));
        personas = brand.personas.map((x) => ({ id: x.id, name: x.name }));
        offers = offerChoices(brandRow.id, brand).map((x) => ({ id: x.id, name: x.name }));
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
    }
    const fit = brandFit(brandRow.id, brandRow.name);
    const rows = referenceCardRows();
    const first = listReferences(buildFacts(rows, fit), NO_FILTER);
    const summary = summaryOf(rows);
    const advanced = await isAdvanced("references");
    return (<div className="mx-auto max-w-[96rem]">
      <PageHeader title="References" subtitle={advanced ? (<>
            {summary.library} reference ads copied from the Remix library{summary.synced && <> on {summary.synced.slice(0, 10)}</>}
            {summary.added > 0 && <>, plus {summary.added} added by you</>}. Shared by every brand. Re-sync the library with <code className="text-xs">pnpm refs:import</code>.
          </>) : (<>
              {summary.library} reference ads from the library{summary.added > 0 && <>, plus {summary.added} added by you</>}. Shared by every brand. Tick the ones you want to build on, say what each should do, and press Build.
            </>)}/>
      <ReferencesTabs />
      <ReferencesView first={first} summary={summary} analysisEnabled={referenceAnalysisEnabled()} live={llmEnabled()} fit={fit} choices={{ products, personas, offers, live: llmEnabled(), claims: getSetting(brandRow.id, "checks").claims }}/>
    </div>);
}
