import { PageHeader } from "@/components/bits";
import { NeedsBrain } from "@/components/needs-brain";
import { activeBrand } from "@/lib/brand-context";
import { BrandBrainError } from "@/lib/brand-brain";
import { loadBrandBrain } from "@/lib/brands";
import { listPersonas } from "@/lib/personas/store";
import { listCopySources } from "@/lib/copy-builder/sources";
import { listRuns } from "@/lib/copy-builder/store";
import { copyWriterEnabled } from "@/lib/copy-builder/generate";
import { referenceAnalysisEnabled } from "@/lib/references/analyze";
import { CopyBuilderView } from "./copy-builder-view";
export const dynamic = "force-dynamic";
export default async function CopyBuilderPage() {
    const row = await activeBrand();
    try {
        const brand = loadBrandBrain(row.id);
        const profiles = listPersonas(row.id).filter((p) => p.status === "active");
        const personas = profiles.length ? profiles : brand.personas;
        return <div className="mx-auto max-w-[80rem]">
      <PageHeader title="Copy builder" subtitle={`Turn an image or video into primary text and headlines in ${row.name}’s voice.`}/>
      <CopyBuilderView key={row.id} brandId={row.id} brandName={row.name} products={brand.products.map((p) => ({ id: p.id, name: p.name }))} personas={personas.map((p) => ({ id: p.id, name: p.name }))} sources={listCopySources(row.id).map(({ file: _file, ...s }) => s)} history={listRuns(row.id)} live={referenceAnalysisEnabled() && copyWriterEnabled()}/>
    </div>;
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
        return <NeedsBrain title="Copy builder" brandName={row.name} why="Add the brand's products, avatars and writing guidelines before generating ad copy."/>;
    }
}
