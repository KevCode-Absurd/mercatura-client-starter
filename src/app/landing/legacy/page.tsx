import Link from "next/link";
import { ArrowRight, Gauge, LayoutTemplate, ShieldCheck, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/bits";
import { NeedsBrain } from "@/components/needs-brain";
import { BrandBrainError } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { scoreOf } from "@/lib/landing/checks";
import { listAds } from "@/lib/landing/ads";
import { landingContext } from "@/lib/landing/context";
import { listPages, listScans } from "@/lib/landing/store";
import { themeFrom } from "@/lib/landing/theme";
import { KIND_LABEL, ORIGIN_LABEL, STATUS_LABEL } from "@/lib/landing/types";
import { formatMoney } from "@/lib/money";
import { BuildButton } from "../build-button";
import { ScoreDot, Simulated, Verdict, pct } from "../bits";
export const dynamic = "force-dynamic";
export default async function LandingOverview() {
    const row = await activeBrand();
    let ctx;
    try {
        ctx = landingContext(row.id);
    }
    catch (e) {
        if (e instanceof BrandBrainError)
            return <NeedsBrain title="Landing pages" brandName={row.name} why="A landing page is written from what the brand sells, what it may claim and who buys it."/>;
        throw e;
    }
    const pages = listPages(row.id);
    const ads = listAds(row.id);
    const withPage = new Set(pages.map((p) => p.ad?.id).filter(Boolean));
    const waiting = ads.filter((a) => a.insights?.verdict === "scale" && !withPage.has(a.id)).sort((a, b) => (b.insights?.roas ?? 0) - (a.insights?.roas ?? 0)).slice(0, 5);
    const scans = listScans(row.id);
    const last = (k: string) => scans.find((s) => s.kind === k && s.status === "done");
    const theme = themeFrom(ctx.look);
    const cur = ctx.brand.brand.currency;
    const avg = pages.length ? Math.round(pages.reduce((a, p) => a + scoreOf(p.checks).score, 0) / pages.length) : null;
    const photos = Object.values(ctx.photos).reduce((n, l) => n + l.length, 0);
    const research = ctx.quotes.filter((q) => q.source === "research").length;
    const pillars = [
        { href: "/landing/pages", icon: LayoutTemplate, title: "Builder", line: pages.length ? `${pages.length} page${pages.length === 1 ? "" : "s"}, average check score ${avg}` : "No pages yet", one: "Build a page from scratch, from a link, for an ad or for a persona." },
        { href: "/landing/cro", icon: TrendingUp, title: "CRO", line: last("audit") ? `Last audit ${last("audit")!.created_at.slice(0, 10)}` : "Revenue per visitor, the page audit, the test calculator", one: "Measure the right number, then fix clarity, copy, offer, proof and friction in that order." },
        { href: "/landing/speed", icon: Gauge, title: "Page speed", line: last("speed") ? `Last test ${last("speed")!.created_at.slice(0, 10)}` : "No test yet", one: "A throttled phone test, and what to fix first." },
        { href: "/landing/security", icon: ShieldCheck, title: "Security scan", line: last("security") ? `Last scan ${last("security")!.created_at.slice(0, 10)}` : "No scan yet", one: "Passive checks of the brand's own site, with fixes." },
    ];
    return (<div>
      <PageHeader title="Landing pages" subtitle={<>Pages that continue the ad: the same buyer, the same angle, the same offer. Every page is drafted from {row.name}&apos;s own facts and customers&apos; words, checked on every save, and can be rewritten by a model in live mode.</>}>
        <Link href="/landing/pages/new" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90" data-testid="landing-new">
          New page <ArrowRight className="size-4"/>
        </Link>
      </PageHeader>

      <div className="grid gap-3 px-6 pt-6 sm:grid-cols-2 xl:grid-cols-4">
        {pillars.map((p) => (<Link key={p.href} href={p.href} className="group rounded-lg border border-input p-4 hover:bg-secondary" data-testid={`pillar-${p.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="flex items-center gap-2 text-base font-extrabold tracking-tight">
              <p.icon className="size-4 text-primary"/> {p.title}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{p.one}</p>
            <p className="mt-3 text-xs font-semibold">{p.line}</p>
          </Link>))}
      </div>

      <div className="grid gap-6 px-6 pt-8 xl:grid-cols-[1.4fr_1fr]">
        <section data-testid="ads-waiting">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
            <h2 className="text-lg font-extrabold tracking-tight">
              Ads that work and have no page <Simulated className="ml-1 align-middle"/>
            </h2>
            <Link href="/landing/pages/new?tab=ad" className="text-sm text-primary hover:underline">
              All {ads.length} ads
            </Link>
          </div>
          {waiting.length ? (<ul className="divide-y">
              {waiting.map((a) => (<li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <div className="min-w-0 flex-1 basis-72">
                    <div className="font-semibold">&ldquo;{a.headline}&rdquo;</div>
                    <div className="text-xs text-muted-foreground">
                      {ORIGIN_LABEL[a.origin]}. Works best for <b className="text-foreground">{a.insights!.best.label}</b>. Return {a.insights!.roas.toFixed(2)}, {formatMoney(a.insights!.cpa, cur, { local: true })} an order, {pct(a.insights!.cvr)} of visitors buy.
                    </div>
                  </div>
                  <Verdict v={a.insights!.verdict}/>
                  <BuildButton adId={a.id} testid={`build-${a.id}`}/>
                </li>))}
            </ul>) : (<p className="py-4 text-sm text-muted-foreground">Every ad marked Scale has a page. Approve an ad for a landing page in Creative Studio, or pick any ad under New page.</p>)}

          <div className="mt-8 flex items-baseline justify-between border-b border-rule pb-2">
            <h2 className="text-lg font-extrabold tracking-tight">Recent pages</h2>
            <Link href="/landing/pages" className="text-sm text-primary hover:underline">
              All pages
            </Link>
          </div>
          {pages.length ? (<ul className="divide-y">
              {pages.slice(0, 6).map((p) => {
                const s = scoreOf(p.checks);
                return (<li key={p.id}>
                    <Link href={`/landing/pages/${p.id}`} className="flex items-center gap-3 py-2.5 hover:bg-secondary">
                      <ScoreDot score={s.score} fails={s.fails}/>
                      <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
                      <span className="text-xs text-muted-foreground">{KIND_LABEL[p.kind].label}</span>
                      <span className="text-xs">{STATUS_LABEL[p.status]}</span>
                    </Link>
                  </li>);
            })}
            </ul>) : (<p className="py-4 text-sm text-muted-foreground">No pages yet. Build one for an ad above, or start from New page.</p>)}
        </section>

        <section className="rounded-lg border p-4 text-sm" data-testid="shared-context">
          <h2 className="text-base font-extrabold tracking-tight">What every page is built from</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">The shared context of Mercatura. Change it where it lives and every new page follows.</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt className="font-semibold">Brand look</dt>
            <dd className="flex flex-wrap items-center gap-1.5">
              {[theme.primary, theme.cta, theme.accent, theme.paper].map((c) => (<span key={c} className="inline-block size-5 rounded-sm border" style={{ background: c }} title={c}/>))}
              <span className="text-xs text-muted-foreground">{ctx.look ? ctx.look.fonts.map((f) => f.family).filter((v, i, a) => a.indexOf(v) === i).join(", ") : "Not read yet: pages use a neutral look."}</span>
            </dd>
            <dt className="font-semibold">Products</dt>
            <dd>
              {ctx.brand.products.length}, with {photos} photo{photos === 1 ? "" : "s"}
            </dd>
            <dt className="font-semibold">Offers</dt>
            <dd>{ctx.brand.offers.length} price points{ctx.brand.guarantee ? `, ${ctx.brand.guarantee.window_days}-day guarantee` : ", no guarantee stated"}</dd>
            <dt className="font-semibold">Personas</dt>
            <dd>
              {ctx.personas.filter((p) => p.status === "active").length} in use, {ctx.personas.filter((p) => p.status === "draft").length} drafts
            </dd>
            <dt className="font-semibold">Customers&apos; words</dt>
            <dd>
              {ctx.quotes.length} quotes ({research} from research, {ctx.quotes.length - research} from the brand&apos;s documents), {ctx.objections.length} objections with answers
            </dd>
            <dt className="font-semibold">Claims a page may use</dt>
            <dd>{ctx.brand.claims.filter((c) => c.status !== "rejected").length}, and {ctx.brand.forbidden_claims.length} forbidden phrases checked on every save</dd>
            <dt className="font-semibold">Ads</dt>
            <dd>
              {ads.filter((a) => a.origin === "studio").length} static, {ads.filter((a) => a.origin === "script").length} scripts, {ads.filter((a) => a.origin === "account").length} in the account
            </dd>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link className="text-primary hover:underline" href="/brand">
              Brand brain
            </Link>
            <Link className="text-primary hover:underline" href="/personas">
              Personas
            </Link>
            <Link className="text-primary hover:underline" href="/offers">
              Offers
            </Link>
            <Link className="text-primary hover:underline" href="/sources">
              Research
            </Link>
          </div>
        </section>
      </div>
    </div>);
}
