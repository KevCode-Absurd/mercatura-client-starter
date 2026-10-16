import Link from "next/link";
import { activeBrand } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { readEvidenceSnapshot, evidenceHistory } from "@/lib/standalone/store";
import { qualityContext } from "@/lib/standalone/data";
import { evidenceMediaChoices, readEvidenceWorkbench } from "@/lib/production-evidence/store";
import { EvidenceWorkbench } from "./workbench";
import { listArtifactPage } from "@/lib/seo/store";
export const metadata = { title: "Evidence and delivered claims" };
export default async function EvidencePage() {
    const brand = await activeBrand(), ctx = seoContext(brand.id), snapshot = readEvidenceSnapshot(brand.id);
    return <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-8"><Link className="text-sm underline" href="/seo/editorial-quality">Back to editorial review</Link><EvidenceWorkbench ctx={ctx} artifacts={listArtifactPage(brand.id, 100).items.map(a => ({ id: a.id, title: a.title, productId: a.productId }))} initial={snapshot} seeds={qualityContext(brand.id).evidence} history={evidenceHistory(brand.id).map(h => ({ revision: h.revision, at: h.at, count: h.records.length }))} workspace={readEvidenceWorkbench(brand.id)} media={evidenceMediaChoices(brand.id).map(m => ({ ...m, preview: `/api/assets/${m.path.split(/[\\/]/).map(encodeURIComponent).join("/")}` }))}/></main>;
}
