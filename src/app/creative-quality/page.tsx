import Link from "next/link";
import { activeBrand } from "@/lib/brand-context";
import { tryBrand } from "@/lib/queries";
import { NeedsBrain } from "@/components/needs-brain";
import { qualityContext } from "@/lib/standalone/data";
import { readLocal, readEvidenceTasks } from "@/lib/standalone/store";
import type { Feedback, BenchmarkReview } from "@/lib/standalone/creative";
import { QualityWorkbench } from "./workbench";
import { reviewEvidencePacket, type EvidencePacket } from "@/lib/standalone/evidence";
export default async function CreativeQualityPage() {
    const brand = await activeBrand();
    if (!tryBrand(brand.id))
        return <NeedsBrain title="Creative quality" brandName={brand.name} why="Add product facts and a buyer situation to start a local creative brief."/>;
    const context = qualityContext(brand.id);
    const handoffs = Object.fromEntries(Object.entries(readLocal<Record<string, EvidencePacket>>(brand.id, "packets", {})).map(([id, packet]) => [id, { ...packet, currentEvidenceReview: reviewEvidencePacket(packet, context.evidence) }]));
    const headlines = Object.fromEntries(Object.entries(readLocal<Record<string, {
        packet: EvidencePacket;
    }>>(brand.id, "headline-sets", {})).map(([id, set]) => [id, { ...set, currentEvidenceReview: reviewEvidencePacket(set.packet, context.evidence) }]));
    return <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-6">
    <div><p className="text-xs uppercase tracking-widest text-primary">Creative Studio · Local quality</p><h1 className="font-serif text-4xl mt-2">Make the next creative stronger.</h1><p className="text-muted-foreground mt-3 max-w-3xl">Use your product facts, customer passages and saved outputs. Plan coverage, bind evidence, inspect arguments and keep useful corrections. No connected ad account is required.</p></div>
    <nav className="flex flex-wrap gap-4 text-sm underline"><Link href="/creative-lab">Production lab</Link><Link href="/concepts">Concepts</Link><Link href="/landing/quality">Page quality</Link><Link href="/seo/editorial-quality">Editorial quality</Link></nav>
    <QualityWorkbench key={brand.id} brandId={brand.id} context={context} initialFeedback={readLocal<Feedback[]>(brand.id, "feedback", [])} tasks={readEvidenceTasks(brand.id)} siblings={readLocal<string[]>(brand.id, "kept-siblings", [])} benchmark={readLocal<BenchmarkReview[]>(brand.id, "benchmark", [])} packets={{ handoffs, headlines, providerInputs: readLocal<Record<string, unknown>>(brand.id, "provider-inputs", {}) }}/>
  </div>;
}
