import Link from "next/link";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { guideModel } from "@/lib/brain/guide";
export default async function BrandGuidePage() {
    const row = await activeBrand();
    const m = guideModel(row.id);
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader back={{ href: "/brand", label: "Brand brain" }} title="Brand guide" subtitle={`${m.brand} in 5 pages: colour, type, components and voice, and a cheat sheet. Built from the brand look and the guidelines, so it changes when they do. ${m.colors.length} colours, ${m.fonts.length} typefaces.`}>
        <Link href="/brand?tab=guidelines" className="text-sm text-primary hover:underline">Edit the guidelines</Link>
        <a href="/api/brand/guide" target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline" data-testid="guide-print">Open to print (Ctrl+P, margins: none)</a>
        <a href="/api/brand/guide?download=1" className="text-sm text-primary hover:underline" data-testid="guide-download">Download the guide</a>
        <a href="/api/brand/guide?file=tokens" className="text-sm text-primary hover:underline" data-testid="guide-tokens">Download colours and fonts for a designer</a>
      </PageHeader>
      <div className="p-6">
        <iframe src="/api/brand/guide" title={`${m.brand} brand guide`} className="h-[80vh] w-full rounded-lg border bg-white" data-testid="guide-frame"/>
      </div>
    </div>);
}
