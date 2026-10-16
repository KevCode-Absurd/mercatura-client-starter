import Link from "next/link";
import { PageHeader } from "@/components/bits";
import { NeedsBrain } from "@/components/needs-brain";
import { BrandBrainError } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { listAds } from "@/lib/landing/ads";
import { landingContext } from "@/lib/landing/context";
import { personaForAudience } from "@/lib/landing/draft";
import { kindForAwareness } from "@/lib/landing/types";
import { NewPageView } from "./new-view";
export const dynamic = "force-dynamic";
export default async function NewLandingPage({ searchParams }: {
    searchParams: Promise<{
        tab?: string;
        ad?: string;
        persona?: string;
    }>;
}) {
    const sp = await searchParams;
    const row = await activeBrand();
    let ctx;
    try {
        ctx = landingContext(row.id);
    }
    catch (e) {
        if (e instanceof BrandBrainError)
            return <NeedsBrain title="New landing page" brandName={row.name}/>;
        throw e;
    }
    const ads = listAds(row.id).map((a) => {
        const matched = a.persona_id ? ctx.personas.find((p) => p.id === a.persona_id) : personaForAudience(ctx.personas, a.insights?.best ?? null);
        return { ...a, matched: matched ? { id: matched.id, name: matched.name, by: a.persona_id ? ("ad" as const) : ("audience" as const) } : null, kind: kindForAwareness(a.awareness) };
    });
    const personas = ctx.personas.map((p) => ({ id: p.id, name: p.name, status: p.status, who: p.who, awareness: p.awareness, angle: p.angle, problem: p.problem, kind: kindForAwareness(p.awareness), segment: p.performance?.segment ?? null, roas: p.performance?.roas ?? null }));
    return (<div>
      <PageHeader back={{ href: "/landing/pages", label: "All pages" }} title="New landing page" subtitle="Pick what the page is for. It is drafted at once from the brand's own facts and customers' words, free, and opens in the builder to edit, check and rewrite."/>
      <NewPageView tab={sp.tab ?? (sp.persona ? "persona" : "ad")} preselectAd={sp.ad ?? null} preselectPersona={sp.persona ?? null} ads={ads} personas={personas} products={ctx.brand.products.map((p) => ({ id: p.id, name: p.name }))} offers={ctx.brand.offers.map((o) => ({ id: o.id, name: o.name, price: o.price, per_day: o.per_day ?? null }))} currency={ctx.brand.brand.currency}/>
    </div>);
}
