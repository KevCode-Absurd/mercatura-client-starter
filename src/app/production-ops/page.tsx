import Link from "next/link";
import { activeBrand } from "@/lib/brand-context";
import { seoContext } from "@/lib/seo/context";
import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { listSummaries, opsDb } from "@/lib/production-ops/store";
import { productionMetrics } from "@/lib/production-ops/metrics";
import { laneStatus } from "@/lib/production-ops/lanes";
import { contextCacheStats } from "@/lib/production-ops/context-cache";
import { readSeoBatch, readSeoBatchItem } from "@/lib/production-ops/seo-batch";
import { readCampaign, campaignTaskLink } from "@/lib/production-ops/campaigns";
import { listCroRunSummaries } from "@/lib/landing/studio-store";
import { readEvidence } from "@/lib/standalone/store";
import { budgetStatus } from "@/lib/llm/gateway";
import { mediaUsage } from "@/lib/media/providers";
import { heldSpend } from "@/lib/production-ops/attempts";
import { OperationsWorkbench, type OperationItemSummary } from "./workbench";
export const dynamic = "force-dynamic";
export default async function OperationsPage({ searchParams }: {
    searchParams: Promise<{
        id?: string;
    }>;
}) {
    const brand = await activeBrand(), ctx = seoContext(brand.id), query = await searchParams;
    const batches = listSummaries(brand.id, 'seo-batch', 30).items, campaigns = listSummaries(brand.id, 'campaign', 30).items;
    const batch = query.id ? readSeoBatch(brand.id, query.id) : null, campaign = query.id ? readCampaign(brand.id, query.id) : null;
    const items: OperationItemSummary[] = batch ? batch.value.items.map(id => readSeoBatchItem(brand.id, id)!).filter(Boolean).map(item => ({ revision: item.revision, updated: item.updated, value: { id: item.value.id, status: item.value.status, artifactId: item.value.artifactId, error: item.value.error, input: { title: item.value.input.title }, response: item.value.response ? { callId: item.value.response.callId, costUsd: item.value.response.costUsd } : undefined } })) : [];
    const studio = db.select({ id: schema.studioRuns.id, title: schema.studioRuns.title, productId: schema.studioRuns.product_id }).from(schema.studioRuns).where(eq(schema.studioRuns.brand_id, brand.id)).orderBy(desc(schema.studioRuns.updated_at)).limit(30).all();
    const landing = listCroRunSummaries(brand.id, 30).items;
    const tasks = [...studio.map(s => ({ kind: 'studio' as const, refId: s.id, title: s.title, productId: s.productId ?? '' })), ...landing.map(r => ({ kind: 'landing' as const, refId: r.id, title: r.title, productId: r.productId })), ...batches.map(r => ({ kind: 'seo_batch' as const, refId: r.id, title: r.title, productId: (r.metadata.productIds as string[] | undefined)?.[0] ?? (() => { const first = readSeoBatch(brand.id, r.id)?.value.items[0]; return first ? readSeoBatchItem(brand.id, first)?.value.input.productId ?? '' : ''; })() }))];
    const journals = opsDb().prepare("SELECT id,state,error,created FROM ops_journal WHERE brand=? ORDER BY created DESC LIMIT 20").all(brand.id) as {
        id: string;
        state: string;
        error: string | null;
        created: number;
    }[];
    const textBudget = budgetStatus(), mediaBudget = mediaUsage(), textHeld = heldSpend('text');
    return <main className="mx-auto max-w-7xl space-y-6 p-6"><div><p className="text-sm text-muted-foreground">{brand.name} · Standalone production</p><h1 className="text-3xl font-semibold">Production queue and campaign review</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Resume completed stages, inspect retained responses and review individual outputs. Every task keeps its product, source revision and spending limits.</p><div className="mt-3 flex flex-wrap gap-4 text-sm underline"><Link href="/seo/content">Write an article</Link><Link href="/creative-portfolio">Plan creative variety</Link><Link href="/production-evidence">Review typed evidence</Link><Link href="/landing/studio">Landing studio</Link></div></div>
 <OperationsWorkbench brandId={brand.id} products={ctx.products.map(p => ({ id: p.id, name: p.name }))} metrics={productionMetrics(brand.id)} lanes={laneStatus()} cache={contextCacheStats()} budget={{ textRemaining: Math.max(0, textBudget.remaining - textHeld), textHeld, imagesRemaining: Math.max(0, mediaBudget.imageCap - mediaBudget.images), videoRemaining: Math.max(0, mediaBudget.videoCapUsd - mediaBudget.videoUsd) }} batches={batches} campaigns={campaigns} selectedBatch={batch} items={items} campaign={campaign ? { ...campaign, links: Object.fromEntries(campaign.value.nodes.map(n => { try {
            return [n.id, campaignTaskLink(brand.id, n)];
        }
        catch {
            return [n.id, ''];
        } })) } : null} tasks={tasks} evidence={readEvidence(brand.id).filter(r => r.status === 'approved').map(r => ({ id: r.id, text: r.text, productIds: r.productIds }))} journals={journals}/></main>;
}
