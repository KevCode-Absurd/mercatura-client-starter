import Link from "next/link";
import { activeBrand } from "@/lib/brand-context";
import { BrandBrainError } from "@/lib/brand-brain";
import { NeedsBrain } from "@/components/needs-brain";
import { seoContext } from "@/lib/seo/context";
import { loadEditorialQuality, editorialImports } from "@/lib/seo/editorial-quality-store";
import { EditorialQualityStudio } from "./studio";
import { qualityContext } from "@/lib/standalone/data";
export const metadata = { title: "Editorial quality · SEO", description: "Standalone editorial planning, evidence review and offline benchmarks." };
export default async function EditorialQualityPage() {
    const brand = await activeBrand();
    try {
        const ctx = seoContext(brand.id);
        return <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-8"><Link href="/seo/content" className="text-sm text-primary underline">Back to Blog studio</Link><EditorialQualityStudio ctx={ctx} saved={loadEditorialQuality(brand.id)} imports={editorialImports(ctx)} boundEvidence={qualityContext(brand.id).evidence}/></main>;
    }
    catch (e) {
        if (e instanceof BrandBrainError)
            return <NeedsBrain title="Editorial quality" brandName={brand.name}/>;
        throw e;
    }
}
