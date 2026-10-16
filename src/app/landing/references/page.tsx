import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { tryBrand } from "@/lib/queries";
import { productPhotos } from "@/lib/landing/context";
import { cardCounts } from "@/lib/landing/library";
import { TEMPLATES, WIREFRAMES, nicheFor, swipeLibrary } from "@/lib/landing/references";
import { BUCKETS, BUCKET_LABEL } from "@/lib/landing/types";
import { ReferencesView } from "./references-view";
export const dynamic = "force-dynamic";
export default async function ReferencesPage() {
    const row = await activeBrand();
    const brand = tryBrand(row.id);
    const photos = brand ? Object.values(productPhotos(row.id)).flat() : [];
    return (<div>
      <PageHeader title="References" subtitle="Browse page templates, store examples and product images to plan your next landing page."/>
      <ReferencesView templates={TEMPLATES.map((t) => ({ ...t }))} wireframes={WIREFRAMES.map((w) => ({ ...w }))} swipe={swipeLibrary()} niche={brand ? nicheFor(brand.brand.category) : null} buckets={BUCKETS.map((b) => ({ id: b, label: BUCKET_LABEL[b], photos: photos.filter((p) => p.bucket === b).length }))} counts={cardCounts()}/>
    </div>);
}
