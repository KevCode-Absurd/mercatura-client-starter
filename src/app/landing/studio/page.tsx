import { activeBrand } from "@/lib/brand-context";
import { BrandBrainError } from "@/lib/brand-brain";
import { NeedsBrain } from "@/components/needs-brain";
import { studioContext } from "@/lib/landing/studio-context";
import { listCroRuns } from "@/lib/landing/studio-store";
import { CroStudio } from "./studio-view";
import { listAds } from "@/lib/landing/ads";
export const dynamic = "force-dynamic";
export default async function StudioPage({ searchParams }: {
    searchParams: Promise<{
        id?: string;
        url?: string;
        mode?: string;
        ad?: string;
    }>;
}) {
    const brand = await activeBrand(), params = await searchParams;
    try {
        const data = studioContext(brand.id);
        return <CroStudio key={brand.id} ads={listAds(brand.id).filter(a => a.origin !== "account").map(a => ({ id: a.id, title: a.title, productId: a.product_id || "", personaId: a.persona_id || "", promise: a.headline || a.hooks[0] || a.angle, awareness: a.awareness }))} brandId={brand.id} brandName={brand.name} brandReview={{ snapshot: data.snapshot, oneLiner: data.ctx.brand.brand.one_liner, voice: [...(data.ctx.brand.voice.sound || []), ...data.ctx.brand.voice.do], avoid: [...data.ctx.brand.voice.dont, ...data.ctx.brand.forbidden_claims], claims: data.ctx.brand.claims.filter(claim => claim.status === "substantiated").map(({ text, source }) => ({ text, source })), offers: data.ctx.brand.offers.map(({ name, price, notes }) => ({ name, price, notes })) }} siteUrl={data.snapshot.siteUrl} products={data.products.map(({ id, name, url }) => ({ id, name, url }))} personas={data.ctx.personas.map(({ id, name }) => ({ id, name }))} initialAdId={params.ad} initialId={params.id} initialUrl={params.url || ""} initialMode={params.mode || "audit"} history={listCroRuns(brand.id).map(r => ({ id: r.id, title: r.blueprint?.title || r.evidence?.title || r.request.sourceUrl || "New page", status: r.status }))}/>;
    }
    catch (e) {
        if (e instanceof BrandBrainError)
            return <NeedsBrain title="CRO Studio" brandName={brand.name} why="Pages use the same products, customers, fonts and brand voice as Creative."/>;
        throw e;
    }
}
