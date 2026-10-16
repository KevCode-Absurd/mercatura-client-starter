import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/bits";
import { NeedsBrain } from "@/components/needs-brain";
import { BrandBrainError } from "@/lib/brand-brain";
import { activeBrand } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { listArtifacts } from "@/lib/seo/store";
import { loadSearchPlan } from "@/lib/seo/planning-store";
import { SourcedBlogPanel } from "@/app/seo/blog-panel";
import { ArtifactEditor } from "@/app/seo/workspace";
export const dynamic = "force-dynamic";
export const metadata = { title: "Articles & listicles · Builder" };
export default async function ArticleBuilder({ searchParams }: {
    searchParams: Promise<{
        id?: string;
        planId?: string;
    }>;
}) {
    const brand = await activeBrand(), query = await searchParams;
    let ctx;
    try {
        ctx = seoContext(brand.id);
    }
    catch (e) {
        if (e instanceof BrandBrainError)
            return <NeedsBrain title="Article builder" brandName={brand.name}/>;
        throw e;
    }
    const articles = listArtifacts(brand.id).filter((a) => a.kind === "blog");
    const selected = articles.find((a) => a.id === query.id);
    if (query.id && !selected)
        notFound();
    const task = query.planId ? loadSearchPlan(brand.id).rows.find((r) => r.id === query.planId && r.intent === "informational") : undefined;
    if (query.planId && !task)
        notFound();
    const stale = task && task.contextHash !== ctx.contextHash;
    const seed = task && !stale ? { ...task.editorialBrief, keyword: task.keyword, productId: task.productId, targetUrl: task.targetUrl, planId: task.id } : undefined;
    return <div className="mx-auto max-w-[90rem]" data-testid="landing-article-builder"><PageHeader back={{ href: "/landing/pages", label: "Builder" }} title={selected ? "Review your search article." : "Articles, listicles & comparison guides."} subtitle="Turn customer research into useful content. Keep the brief, product facts and citations connected through drafting, review and export."><Link href="/seo/strategy" className="text-sm font-semibold text-primary">Customer growth strategy →</Link></PageHeader><div className="space-y-6 px-6 pb-10">{task && <section className="rounded-xl border bg-accent/30 p-5"><h2 className="font-semibold">Brief from your search strategy</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{task.notes}</p><p className="mt-3 text-xs">Owner: {task.owner || "Unassigned"} · {task.taskType === "refresh" ? "Refresh existing content" : "Proposed content"} · {task.status}</p></section>}{stale ? <p role="alert" className="rounded-xl border p-5 text-sm">Brand Brain changed. <Link href="/seo/strategy" className="text-primary underline">Review and save the strategy brief</Link> before creating this article.</p> : selected ? <ArtifactEditor key={`${selected.id}:${selected.revision}:${selected.status}`} artifact={selected} ctx={ctx} listPath="/landing/articles"/> : <SourcedBlogPanel key={`${ctx.contextHash}:${task?.id ?? "new"}:${task?.updatedAt ?? ""}`} ctx={ctx} seed={seed} editorPath="/landing/articles"/>}<section className="rounded-xl border bg-card p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">Saved articles · {articles.length}</h2><Link href="/landing/articles" className="text-sm text-primary underline">New article</Link></div>{!articles.length && <p className="mt-3 text-sm text-muted-foreground">Research a customer question in SEO, or start with your own source-backed brief above.</p>}<div className="divide-y">{articles.map((a) => <Link key={a.id} href={`/landing/articles?id=${encodeURIComponent(a.id)}`} className="block py-4 hover:text-primary"><p className="font-semibold">{a.title}</p><p className="mt-1 text-xs text-muted-foreground">{a.keyword} · {a.status} · Revision {a.revision}{a.contextHash !== ctx.contextHash ? " · Brand facts changed" : ""}</p></Link>)}</div></section></div></div>;
}
