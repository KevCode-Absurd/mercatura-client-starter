import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { offersFor } from "@/lib/llm/context";
import { llmEnabled } from "@/lib/llm/gateway";
import { transcriptionEnabled } from "@/lib/founder-transcribe";
import { landingContext } from "@/lib/landing/context";
import { shopperNotes } from "@/lib/landing/draft";
import { getPage } from "@/lib/landing/store";
import { themeFrom } from "@/lib/landing/theme";
import { KIND_LABEL, SOURCE_LABEL, type BuyOption } from "@/lib/landing/types";
import { PageEditor } from "./editor";
export const dynamic = "force-dynamic";
export default async function LandingPageEditor({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const row = await activeBrand();
    const page = getPage(id);
    if (!page || page.brand_id !== row.id)
        notFound();
    const ctx = landingContext(row.id);
    const brand = ctx.brand;
    const options: BuyOption[] = offersFor(brand, page.product_id).map((o) => ({ label: o.name, offer_id: o.id, price: o.price, compare_at: null, per_day: o.per_day ?? null, note: shopperNotes(o.notes)[0] ?? "", badge: "" }));
    const product = brand.products.find((p) => p.id === page.product_id);
    const persona = ctx.personas.find((p) => p.id === page.persona_id);
    return (<div>
      <PageHeader back={{ href: "/landing/pages", label: "All pages" }} title={page.title} subtitle={<>
            {KIND_LABEL[page.kind].label} for {product?.name ?? page.product_id}
            {persona ? `, written for ${persona.name}` : ""}
            {page.brief.audience ? ` (the ad works best for ${page.brief.audience.label})` : ""}. {SOURCE_LABEL[page.source.kind]}. {page.id}, version {page.version}, {page.writer === "draft" ? "drafted from the brand's facts" : `written by ${page.writer}`}.
          </>}/>
      <PageEditor initial={page} theme={themeFrom(ctx.look)} brandName={brand.brand.name} currency={brand.brand.currency} photos={(ctx.photos[page.product_id] ?? []).map((p) => ({ src: p.src, name: p.name, bucket: p.bucket }))} quotes={ctx.quotes.map(({ text, who, source, ref }) => ({ text, who, source, ...(ref ? { ref } : {}) }))} options={options} personas={ctx.personas.map((p) => ({ id: p.id, name: p.name }))} offers={brand.offers.map((o) => ({ id: o.id, name: o.name }))} live={llmEnabled()} voice={transcriptionEnabled()}/>
    </div>);
}
