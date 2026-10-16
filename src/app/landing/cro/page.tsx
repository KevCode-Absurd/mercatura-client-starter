import { PageHeader } from "@/components/bits";
import { activeBrand } from "@/lib/brand-context";
import { tryBrand } from "@/lib/queries";
import { listAds } from "@/lib/landing/ads";
import type { AuditResult } from "@/lib/landing/audit";
import type { Capture } from "@/lib/landing/capture";
import { listPages, listScans } from "@/lib/landing/store";
import { loadEconomics } from "@/lib/offers/data";
import { loadSegments } from "@/lib/personas/performance";
import { CroView, type Defaults } from "./cro-view";
export const dynamic = "force-dynamic";
function defaultsFor(brandId: string): Defaults {
    const perf = loadSegments(brandId);
    const econ = loadEconomics(brandId);
    const brand = tryBrand(brandId);
    const months = 3;
    const orders = perf ? perf.segments.reduce((a, s) => a + s.purchases, 0) / months : 1000;
    const revenue = perf ? perf.segments.reduce((a, s) => a + s.revenue, 0) / months : 60000;
    const spend = perf ? perf.segments.reduce((a, s) => a + s.spend, 0) / months : 25000;
    const ads = listAds(brandId);
    const cvr = ads.length ? ads.reduce((a, x) => a + (x.insights?.cvr ?? 0), 0) / ads.length : 0.025;
    const aov = orders ? revenue / orders : 60;
    const unit = econ ? econ.products.reduce((a, p) => a + p.unit_cost * (econ.mix.find((m) => m.product_id === p.product_id)?.share ?? 1 / econ.products.length), 0) : aov * 0.3;
    const margin = econ ? Math.max(0, (aov - unit - econ.shipping[0] - econ.fee_rate * aov) / aov) : 0.6;
    return {
        brandId,
        simulated: !perf || perf.simulated,
        source: perf ? `${perf.period}, a month on average` : "a stand-in: no segment file",
        currency: brand?.brand.currency ?? "USD",
        sessions: Math.round(orders / Math.max(0.005, cvr)),
        orders: Math.round(orders),
        netSales: Math.round(revenue),
        shipping: 0,
        margin: Math.round(margin * 100) / 100,
        spend: Math.round(spend),
    };
}
export default async function CroPage({ searchParams }: {
    searchParams: Promise<{
        capture?: string;
        page?: string;
    }>;
}) {
    const sp = await searchParams;
    const row = await activeBrand();
    const pages = listPages(row.id).map((p) => ({ id: p.id, title: p.title }));
    const captures = listScans(row.id, "capture")
        .filter((s) => s.status === "done" && s.result)
        .map((s) => ({ id: s.id, url: s.url, title: (s.result as unknown as Capture).title || s.url, at: s.created_at }));
    const audits = listScans(row.id, "audit")
        .filter((s) => s.status === "done" && s.result)
        .slice(0, 12)
        .map((s) => ({ id: s.id, audit: s.result as unknown as AuditResult }));
    return (<div>
      <PageHeader title="CRO" subtitle={<>
            Find what may be stopping shoppers from buying. Review revenue per visitor, prioritize page improvements and plan tests your traffic can support.
          </>}/>
      <CroView defaults={defaultsFor(row.id)} pages={pages} captures={captures} audits={audits} preselect={{ capture: sp.capture ?? null, page: sp.page ?? null }}/>
    </div>);
}
