import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/bits";
import { db, schema } from "@/db";
import { BrandBrainError } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { llmEnabled } from "@/lib/llm/gateway";
import { offerChoices } from "@/lib/offers/book";
import { getPersona } from "@/lib/personas/store";
import { adAsText } from "@/lib/references/hooks";
import { formatsOf, storedFormats, storedReading } from "@/lib/references/reading";
import { getSetting } from "@/lib/settings";
import { adReferenceLabel } from "@/lib/studio/ad-refs";
import { MakeFromReferenceView } from "./make-view";
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
export default async function MakeFromReferencePage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const ref = db.select().from(schema.adReferences).where(eq(schema.adReferences.id, id)).get();
    if (!ref)
        notFound();
    const row = await activeBrand();
    let products: {
        id: string;
        name: string;
    }[] = [];
    let personas: {
        id: string;
        name: string;
        stage: string;
    }[] = [];
    let offers: {
        id: string;
        name: string;
    }[] = [];
    try {
        const brand = loadBrandBrain(row.id);
        products = brand.products.map((x) => ({ id: x.id, name: x.name }));
        personas = brand.personas.map((x) => ({ id: x.id, name: x.name, stage: getPersona(row.id, x.id)?.awareness ?? "" }));
        offers = offerChoices(row.id, brand).map((x) => ({ id: x.id, name: x.name }));
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
    }
    const a = (ref.analysis ?? {}) as Record<string, unknown>;
    const ad = adAsText(ref.analysis);
    return (<div className="mx-auto max-w-[80rem]">
      <PageHeader back={{ href: "/references", label: "References", testId: "make-ref-back" }} title="Make an ad from this" subtitle={<>Read what makes this ad work, then choose how your own version is made. {row.name} is the brand it is made for.</>}/>
      <MakeFromReferenceView reference={{
            id: ref.id,
            kind: ref.kind,
            label: adReferenceLabel(ref),
            seconds: ref.duration,
            hasMedia: !!ref.media_path,
            analyzed: ref.analyzed,
            stage: ref.awareness?.stage?.replace(/-/g, "_") ?? "",
            mechanism: text(a.mechanism),
            principles: text(a.transferable_principles),
            transcript: ad.transcript,
            copy: text(a.readable_copy),
        }} formats={formatsOf(ref)} reading={storedReading(ref)} suggested={storedFormats(ref, row.id)} products={products} personas={personas} offers={offers} live={llmEnabled()} claims={getSetting(row.id, "checks").claims}/>
    </div>);
}
