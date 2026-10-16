import fs from "node:fs";
import path from "node:path";
import { activeBrand } from "@/lib/brand-context";
import { BrandBrainError } from "@/lib/brand-brain";
import { loadBrandLook } from "@/lib/brand-look";
import { claimsOnSite, founderPending } from "@/lib/brand-sources";
import { brandFolderStatus } from "@/lib/brands";
import { brandConflicts } from "@/lib/claim-conflicts";
import { loadClaimSources } from "@/lib/claim-sources";
import { PageHeader } from "@/components/bits";
import { listSampleFiles } from "@/lib/import/samples";
import { llmEnabled } from "@/lib/llm/gateway";
import { NeedsBrain } from "@/components/needs-brain";
import { getImportBatches, getInsights, getSourceItems, getThemes, tryBrand } from "@/lib/queries";
import { SOURCE_TYPES, type SourceType } from "@/lib/taxonomy";
import { isAdvanced } from "@/lib/ui-mode-server";
import { SourcesView } from "./sources-view";
function siteUrl(brainDir: string): string {
    for (const f of [".claude/CLAUDE.md", "README.md", "brain.md"]) {
        const file = path.join(brainDir, f);
        if (!fs.existsSync(file))
            continue;
        const m = fs.readFileSync(file, "utf-8").match(/Website:\s*(https?:\/\/[^\s)>]+)/i);
        if (m)
            return m[1];
    }
    return "";
}
export default async function SourcesPage({ searchParams, }: {
    searchParams: Promise<{
        tab?: string;
        item?: string;
        hl?: string;
    }>;
}) {
    const row = await activeBrand();
    const brandId = row.id;
    const sp = await searchParams;
    const brand = tryBrand(brandId);
    if (!brand)
        return <NeedsBrain title="Sources" brandName={row.name} why="Customer words are read against the brand's products and buyers, and its name is kept out of redaction."/>;
    const items = getSourceItems(brandId);
    const insights = getInsights(brandId);
    const themes = getThemes(brandId).map((t) => ({ id: t.id, label: t.label }));
    const personas = brand.personas.map((p) => ({ id: p.id, name: p.name }));
    const fromItem = items.find((i) => i.id === sp.item)?.source_type;
    const tab: SourceType = SOURCE_TYPES.includes(sp.tab as SourceType) ? (sp.tab as SourceType) : (fromItem ?? "call");
    let website = null;
    try {
        website = { register: loadClaimSources(brandId), conflicts: brandConflicts(brandId), defaultUrl: loadBrandLook(brandId)?.site_url ?? siteUrl(brandFolderStatus(row).brainDir), check: claimsOnSite(brandId) };
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
    }
    const advanced = await isAdvanced("sources");
    return (<div className="mx-auto max-w-[80rem]">
      <PageHeader title="Sources" subtitle={advanced ? "Each source has a job. Open an item to see its highlighted quotes, or its Pipeline tab to see every step from raw text to verified insight." : "Import customer research, then open a source to review its key quotes."}/>
      <SourcesView items={items} insights={insights} themes={themes} personas={personas} initialTab={tab} initialItem={sp.item ?? null} initialHighlight={sp.hl ?? null} batches={getImportBatches(brandId).map((b) => ({ id: b.id, source_type: b.source_type, origin: b.origin, item_count: b.item_count, created_at: b.created_at }))} live={llmEnabled()} hasSamples={listSampleFiles(brandId).length > 0} website={website} founder={founderPending(brandId)}/>
    </div>);
}
