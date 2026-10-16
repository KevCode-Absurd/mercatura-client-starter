import { PageHeader } from "@/components/bits";
import { NeedsBrain } from "@/components/needs-brain";
import { BrandBrainError } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { loadBrandBrain } from "@/lib/brands";
import { offersFor } from "@/lib/llm/context";
import { llmEnabled } from "@/lib/llm/gateway";
import { currencySymbol } from "@/lib/money";
import { loadEconomics, loadFailures, loadIndustries } from "@/lib/offers/data";
import { offerBook } from "@/lib/offers/book";
import { listOffers, offerBrand } from "@/lib/offers/store";
import { doubtsOf } from "@/lib/personas/doubts";
import { listPersonas } from "@/lib/personas/store";
import { OffersView } from "./offers-view";
export const dynamic = "force-dynamic";
export default async function OffersPage({ searchParams }: {
    searchParams: Promise<{
        tab?: string;
    }>;
}) {
    const row = await activeBrand();
    const sp = await searchParams;
    let brand;
    try {
        brand = loadBrandBrain(row.id);
    }
    catch (e) {
        if (!(e instanceof BrandBrainError))
            throw e;
        return <NeedsBrain title="Offers" brandName={row.name} why="Offers are built on the brand's products and the prices it sells them at."/>;
    }
    const ind = loadIndustries();
    const profiles = listPersonas(row.id);
    const offerProduct = Object.fromEntries(brand.offers.map((o) => [o.id, brand.products.find((p) => offersFor(brand, p.id).some((x) => x.id === o.id))?.id ?? brand.products[0]?.id ?? ""]));
    return (<div className="mx-auto w-full max-w-[80rem]">
      <PageHeader title="Offers" subtitle={<>What {row.name} offers customers. Create an offer in five steps, check the numbers, and save it for your ads and scripts.</>}/>
      <OffersView brandName={row.name} category={brand.brand.category} initial={listOffers(row.id)} book={offerBook(row.id, brand)} ctx={{
            ob: offerBrand(row.id, brand),
            econ: loadEconomics(row.id),
            sym: currencySymbol(brand.brand.currency),
            personas: profiles.map((p) => ({ id: p.id, name: p.name, image: p.image, status: p.status })),
            failures: loadFailures(),
            offerProduct,
            live: llmEnabled(),
        }} pathPersonas={profiles.map((p) => ({ id: p.id, name: p.name, status: p.status, angle: p.angle, product_ids: p.product_ids, doubts: doubtsOf(p).map((d) => ({ doubt: d.doubt, proof: d.proof })) }))} guarantee={brand.guarantee?.text ?? ""} groups={ind.groups} industries={ind.industries} industriesNote={ind.note} initialTab={["build", "now", "offers", "industries", "calculator"].includes(sp.tab ?? "") ? sp.tab! : "build"}/>
    </div>);
}
