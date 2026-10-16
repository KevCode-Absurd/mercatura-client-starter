import { activeBrand } from "@/lib/brand-context";
import { BrandBrainError } from "@/lib/brand-brain";
import { NeedsBrain } from "@/components/needs-brain";
import { listCroRuns } from "@/lib/landing/studio-store";
import { listPages } from "@/lib/landing/store";
import { landingContext } from "@/lib/landing/context";
import { listQualityDocuments } from "@/lib/landing/quality-store";
import { PageQualityView } from "./quality-view";
export const dynamic = "force-dynamic";
export default async function PageQualityPage({ searchParams }: {
    searchParams: Promise<{
        id?: string;
        source?: string;
    }>;
}) {
    const brand = await activeBrand(), params = await searchParams;
    try {
        const ctx = landingContext(brand.id);
        const sources = [...listCroRuns(brand.id).filter(r => r.sections.length).map(r => ({ id: r.id, kind: "studio" as const, title: r.blueprint?.title || r.brand.productName || r.brand.name })), ...listPages(brand.id).map(p => ({ id: p.id, kind: "legacy" as const, title: p.title }))];
        return <PageQualityView key={brand.id} brandName={brand.name} initialId={params.id} initialSource={params.source} sources={sources} products={ctx.brand.products.map(p => ({ id: p.id, name: p.name }))} reviews={listQualityDocuments(brand.id).map(d => ({ id: d.id, title: d.seo.title || d.run?.brand.productName || "Local HTML" }))}/>;
    }
    catch (e) {
        if (e instanceof BrandBrainError)
            return <NeedsBrain title="Page quality" brandName={brand.name} why="Review pages with your saved product facts and supplied evidence."/>;
        throw e;
    }
}
