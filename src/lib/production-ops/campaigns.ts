import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { enqueue } from "../jobs/queue";
import { readEvidence } from "../standalone/store";
import { buildEvidencePacket, type BoundEvidence } from "../standalone/evidence";
import { seoContext } from "../seo/context";
import { readCroRun } from "../landing/studio-store";
import { getRun } from "../studio/engine";
import { readSeoBatch, readSeoBatchItem } from "./seo-batch";
import { readArtifact } from "../seo/store";
import { contentChecks } from "../seo/content";
import { articleResources } from "../seo/article-resources";
import { assertArticleResourcesCurrent } from "../seo/article-resource-handoff";
import { assertCroExportReview } from "../landing/export-guard";
import { fingerprint, readCheckpoint, saveCheckpoint, indexSummary, opsDb } from "./store";
import { checkpoint } from "../llm/run-control";
import { reviewInventory } from "../production-portfolio/review";
export const campaignNodeInput = z.object({ id: z.string().min(1).max(80), kind: z.enum(["studio", "landing", "seo_batch"]), refId: z.string().min(1).max(160), dependsOn: z.array(z.string()).max(30), sourceIds: z.array(z.string()).max(100), operation: z.enum(["plan", "render", "review"]).default("plan") });
export type CampaignNode = z.infer<typeof campaignNodeInput> & {
    scopeHash: string;
    sourceHashes: Record<string, string>;
    reviewedContentHash?: string;
    reviewedReviewHash?: string;
    reviewedAcceptanceIdentity?: string;
    status: "waiting" | "blocked" | "queued" | "running" | "ready_for_review" | "accepted" | "failed";
    jobId?: string;
    error?: string;
};
export type Campaign = {
    id: string;
    brandId: string;
    productId: string;
    market: string;
    title: string;
    contextHash: string;
    brandScopeHash?: string;
    nodes: CampaignNode[];
    createdAt: string;
    spendingAuthorized: boolean;
};
const brandScope = (ctx: ReturnType<typeof seoContext>, productId: string) => fingerprint({ product: ctx.products.find(p => p.id === productId), market: ctx.market, website: ctx.websiteUrl, voice: ctx.voice, forbidden: ctx.forbiddenClaims });
export const readCampaign = (brand: string, id: string) => readCheckpoint<Campaign>(brand, "campaign", id);
function native(brandId: string, node: Pick<CampaignNode, "kind" | "refId">) {
    if (node.kind === 'seo_batch') {
        const r = readSeoBatch(brandId, node.refId);
        if (!r)
            throw new Error("Article batch unavailable.");
        const items = r.value.items.map(id => readSeoBatchItem(brandId, id)!.value), artifacts = items.map(i => readArtifact(brandId, i.artifactId)), ctx = seoContext(brandId);
        return { scopeHash: fingerprint({ contextHash: r.value.contextHash, items: r.value.items, mode: r.value.mode }), contentHash: fingerprint(artifacts.map(a => a ? { id: a.id, revision: a.revision, body: a.body, title: a.title, description: a.description, sourceIds: a.sourceIds } : null)), reviewHash: fingerprint(artifacts.map(a => a ? { status: a.status, revision: a.revision, blockers: contentChecks(a, ctx).blockers, resources: a.codeFiles?.some(file => file.name === "brand-resource-snapshot.json") ? (a.productId ? articleResources(ctx, a.productId) : "unbound-product") : [] } : null)), blockers: items.flatMap(i => i.status === 'quarantined' || i.status === 'failed' ? [i.error ?? i.status] : []), productIds: items.map(i => i.input.productId), ready: items.every(i => i.status === 'saved'), href: `/production-ops?id=${encodeURIComponent(node.refId)}` };
    }
    if (node.kind === 'landing') {
        const r = readCroRun(brandId, node.refId), blockers = [...(r.quality?.failures ?? []), ...(r.error ? [r.error] : [])];
        if (r.status === 'done' || r.status === 'review')
            try {
                assertCroExportReview(r);
            }
            catch (e) {
                blockers.push(e instanceof Error ? e.message : String(e));
            }
        return { scopeHash: fingerprint({ request: r.request, brand: r.brand }), contentHash: fingerprint(r.sections), reviewHash: fingerprint({ approval: r.approval, status: r.status, quality: r.quality, visualReviewFingerprint: r.visualReviewFingerprint }), blockers, productIds: [r.request.productId], ready: r.status === 'done' || r.status === 'review', href: `/landing/studio?id=${encodeURIComponent(node.refId)}` };
    }
    const r = getRun(node.refId);
    if (!r || r.brand_id !== brandId)
        throw new Error("Creative run unavailable for this brand.");
    const { models, fields, skills, ...choices } = r.context;
    return { scopeHash: fingerprint({ productId: r.product_id, kind: r.kind, notes: r.notes, aspects: r.aspects, choices }), contentHash: fingerprint(r.items), reviewHash: fingerprint({ audit: r.audit, status: r.status }), blockers: r.audit.filter(a => a.status === 'fail').map(a => JSON.stringify(a)), productIds: [r.product_id], ready: ['review', 'done', 'planned'].includes(r.status), href: `/studio/${encodeURIComponent(node.refId)}` };
}
export function createCampaign(brandId: string, raw: {
    title: string;
    productId: string;
    nodes: unknown[];
    spendingAuthorized: boolean;
}) {
    const ctx = seoContext(brandId);
    if (!ctx.products.some(p => p.id === raw.productId))
        throw new Error("Select an existing product.");
    const specs = z.array(campaignNodeInput).min(1).max(40).parse(raw.nodes), ids = new Set(specs.map(n => n.id));
    if (ids.size !== specs.length)
        throw new Error("Campaign task IDs must be unique.");
    const visit = (id: string, path: string[] = []) => { if (path.includes(id))
        throw new Error("Campaign dependencies contain a cycle."); const n = specs.find(n => n.id === id); if (!n)
        throw new Error("A task dependency does not exist."); n.dependsOn.forEach(d => visit(d, [...path, id])); };
    specs.forEach(n => visit(n.id));
    const records = readEvidence(brandId), sourceScope = buildEvidencePacket({ productId: raw.productId, market: ctx.market }, records), eligible = new Set(sourceScope.records.filter(source => source.eligible).map(source => source.id)), nodes: CampaignNode[] = specs.map(n => { const resource = native(brandId, n); if (!resource.productIds.length || resource.productIds.some(id => id !== raw.productId))
        throw new Error("A child task has a different selected product."); const sourceHashes = Object.fromEntries(n.sourceIds.map(id => { const r = records.find(r => r.id === id); if (!r || !eligible.has(id))
        throw new Error("Campaign source is unapproved or outside the selected scope."); return [id, fingerprint(r)]; })); return { ...n, scopeHash: resource.scopeHash, sourceHashes, status: "waiting" }; });
    const value: Campaign = { id: randomUUID(), brandId, productId: raw.productId, market: ctx.market, title: raw.title.trim().slice(0, 180) || "Production campaign", contextHash: ctx.contextHash, brandScopeHash: brandScope(ctx, raw.productId), nodes, createdAt: new Date().toISOString(), spendingAuthorized: raw.spendingAuthorized };
    saveCampaign(value, 0);
    return value;
}
function saveCampaign(value: Campaign, revision: number) { const result = saveCheckpoint(value.brandId, "campaign", value.id, value, revision); indexSummary({ brand: value.brandId, kind: "campaign", id: value.id, updated: new Date().toISOString(), title: value.title, status: value.nodes.every(n => n.status === 'accepted') ? 'accepted' : value.nodes.some(n => n.status === 'blocked' || n.status === 'failed') ? 'needs_review' : 'in_progress', revision: result.revision, metadata: { productId: value.productId, nodes: value.nodes.map(n => ({ id: n.id, status: n.status, kind: n.kind, refId: n.refId, error: n.error })) } }); return result; }
export async function runCampaign(brandId: string, id: string) {
    const record = readCampaign(brandId, id);
    if (!record)
        throw new Error("Campaign unavailable.");
    const campaign = structuredClone(record.value), ctx = seoContext(brandId), sources = readEvidence(brandId), affected = new Set<string>();
    const eligible = new Set(buildEvidencePacket({ productId: campaign.productId, market: campaign.market }, sources).records.filter(source => source.eligible).map(source => source.id));
    const snapshots = new Map<string, ReturnType<typeof native>>();
    for (const n of campaign.nodes) {
        checkpoint();
        try {
            const current = native(brandId, n);
            snapshots.set(n.id, current);
            if ((campaign.brandScopeHash ? brandScope(ctx, campaign.productId) !== campaign.brandScopeHash : ctx.contextHash !== campaign.contextHash) || Object.entries(n.sourceHashes).some(([id, hash]) => !eligible.has(id) || fingerprint(sources.find(r => r.id === id)) !== hash) || current.scopeHash !== n.scopeHash)
                affected.add(n.id);
        }
        catch (e) {
            affected.add(n.id);
            n.error = String(e);
        }
    }
    for (let changed = true; changed;) {
        changed = false;
        for (const n of campaign.nodes)
            if (!affected.has(n.id) && n.dependsOn.some(id => affected.has(id))) {
                affected.add(n.id);
                changed = true;
            }
    }
    const reviewChanged = new Set(campaign.nodes.filter(n => { const current = snapshots.get(n.id); return n.status === 'accepted' && (!current || n.reviewedContentHash !== current.contentHash || n.reviewedReviewHash !== current.reviewHash || n.reviewedAcceptanceIdentity !== acceptanceIdentity(current) || !current.ready || current.blockers.length); }).map(n => n.id));
    for (let changed = true; changed;) {
        changed = false;
        for (const n of campaign.nodes)
            if (!reviewChanged.has(n.id) && n.dependsOn.some(id => reviewChanged.has(id))) {
                reviewChanged.add(n.id);
                changed = true;
            }
    }
    for (const n of campaign.nodes)
        if (reviewChanged.has(n.id)) {
            n.status = 'ready_for_review';
            delete n.reviewedContentHash;
            delete n.reviewedReviewHash;
            delete n.reviewedAcceptanceIdentity;
            n.error = 'A reviewed child output or prerequisite changed. Review the current revision again.';
        }
    for (const n of campaign.nodes) {
        checkpoint();
        if (affected.has(n.id)) {
            delete n.reviewedContentHash;
            delete n.reviewedReviewHash;
            delete n.reviewedAcceptanceIdentity;
            n.status = 'blocked';
            n.error = 'Frozen scope or source changed. Review a new task snapshot before proceeding.';
            continue;
        }
        const current = snapshots.get(n.id)!;
        if (n.status === 'accepted' && n.reviewedAcceptanceIdentity === acceptanceIdentity(current) && current.ready && !current.blockers.length)
            continue;
        if (n.status === 'accepted') {
            n.status = 'ready_for_review';
            n.error = 'The child output changed after acceptance. Review its exact current revision again.';
            delete n.reviewedContentHash;
        }
        if (n.jobId) {
            const job = db.select().from(schema.jobs).where(and(eq(schema.jobs.id, n.jobId), eq(schema.jobs.brand_id, brandId))).get();
            if (job) {
                n.status = job.status === 'done' ? 'ready_for_review' : job.status === 'failed' ? 'failed' : job.status === 'running' ? 'running' : 'queued';
                n.error = job.error ?? undefined;
                if (job.status !== 'done' && job.status !== 'failed')
                    continue;
            }
        }
        if (current.blockers.length) {
            n.status = 'blocked';
            n.error = current.blockers.join(' ');
            continue;
        }
        if (n.dependsOn.some(id => campaign.nodes.find(d => d.id === id)?.status !== 'accepted')) {
            n.status = 'waiting';
            n.error = 'Waiting for individual acceptance of prerequisite tasks.';
            continue;
        }
        if (current.ready) {
            n.status = 'ready_for_review';
            continue;
        }
        if (!campaign.spendingAuthorized) {
            n.status = 'blocked';
            n.error = 'This campaign permits review only. Start paid native work explicitly or create an authorized production campaign.';
            continue;
        }
        n.jobId = enqueue(brandId, n.kind, n.refId, n.kind === 'landing' ? { op: 'cro' } : n.kind === 'studio' ? { op: n.operation } : {});
        n.status = 'queued';
        n.error = undefined;
    }
    return saveCampaign(campaign, record.revision);
}
function acceptanceContext(campaign: Campaign) {
    const ctx = seoContext(campaign.brandId);
    if (ctx.market !== campaign.market || !ctx.products.some(product => product.id === campaign.productId) || (campaign.brandScopeHash ? brandScope(ctx, campaign.productId) !== campaign.brandScopeHash : ctx.contextHash !== campaign.contextHash))
        throw new Error('The frozen selected product or market scope changed. Refresh this campaign.');
    const sources = readEvidence(campaign.brandId), packet = buildEvidencePacket({ productId: campaign.productId, market: campaign.market }, sources);
    return { ctx, sources, eligible: new Set(packet.records.filter(record => record.eligible).map(record => record.id)) };
}
function assertAcceptanceSource(node: CampaignNode, sources: BoundEvidence[], eligible: Set<string>) {
    for (const [id, hash] of Object.entries(node.sourceHashes)) {
        const source = sources.find(record => record.id === id);
        if (!source || !eligible.has(id) || fingerprint(source) !== hash)
            throw new Error(`The frozen source ${id} changed, expired or is no longer approved for this campaign scope.`);
    }
}
async function assertNativeAcceptance(brandId: string, node: CampaignNode, ctx: ReturnType<typeof seoContext>) {
    if (node.kind === 'seo_batch') {
        const batch = readSeoBatch(brandId, node.refId)!;
        if (!batch.value.items.length)
            throw new Error('The article batch has no completed outputs.');
        for (const id of batch.value.items) {
            const item = readSeoBatchItem(brandId, id)!.value, a = readArtifact(brandId, item.artifactId);
            if (!a || !['approved', 'exported', 'applied', 'verified'].includes(a.status) || contentChecks(a, ctx).blockers.length)
                throw new Error("Each article needs its own current-revision approval before this campaign task can be accepted.");
            await assertArticleResourcesCurrent(a, ctx);
        }
    }
    else if (node.kind === 'landing') {
        const run = readCroRun(brandId, node.refId);
        if (!run.sections.some(section => section.enabled) || run.status !== 'done' || run.quality?.failures.length || !run.approval)
            throw new Error('Resolve landing checks and native review on a completed page before campaign acceptance.');
        assertCroExportReview(run);
    }
    else {
        const run = getRun(node.refId)!;
        if (!run.items.length || run.audit.some(a => a.status === 'fail') || run.items.some(i => !i.outputs.length))
            throw new Error('Each creative output must exist and clear its own review holds before campaign acceptance.');
        const inventory = await reviewInventory(brandId, node.refId);
        if (!inventory.length || inventory.some(candidate => candidate.holds.length))
            throw new Error(`Each current creative output needs its own complete copy and delivered-pixel review before campaign acceptance. ${inventory.flatMap(candidate => candidate.holds).join(' ')}`);
    }
}
const acceptanceIdentity = (snapshot: ReturnType<typeof native>) => fingerprint({ scope: snapshot.scopeHash, content: snapshot.contentHash, review: snapshot.reviewHash, ready: snapshot.ready, blockers: snapshot.blockers });
export async function acceptCampaignTask(brandId: string, id: string, nodeId: string, expectedRevision: number) {
    const record = readCampaign(brandId, id);
    if (!record || record.revision !== expectedRevision)
        throw new Error('Campaign changed. Refresh the review.');
    const campaign = record.value, node = campaign.nodes.find(node => node.id === nodeId);
    if (!node || node.status !== 'ready_for_review')
        throw new Error('Review this completed task and its individual outputs before accepting it.');
    const { ctx, sources, eligible } = acceptanceContext(campaign), visiting = new Set<string>(), checked = new Map<string, {
        node: CampaignNode;
        identity: string;
        contentHash: string;
        reviewHash: string;
    }>();
    async function visit(current: CampaignNode, isTarget = false): Promise<void> {
        if (visiting.has(current.id))
            throw new Error('Campaign dependencies contain a cycle; acceptance is held.');
        if (checked.has(current.id))
            return;
        if (!isTarget && current.status !== 'accepted')
            throw new Error('Individually accept the current prerequisite outputs first.');
        visiting.add(current.id);
        for (const id of current.dependsOn) {
            const prerequisite = campaign.nodes.find(node => node.id === id);
            if (!prerequisite)
                throw new Error('A prerequisite task is unavailable.');
            await visit(prerequisite);
        }
        const snapshot = native(brandId, current);
        assertAcceptanceSource(current, sources, eligible);
        if (snapshot.scopeHash !== current.scopeHash || !snapshot.productIds.length || snapshot.productIds.some(product => product !== campaign.productId))
            throw new Error('A child or prerequisite scope changed. Refresh its source review.');
        if (!snapshot.ready || snapshot.blockers.length || (!isTarget && (current.reviewedContentHash !== snapshot.contentHash || current.reviewedReviewHash !== snapshot.reviewHash || current.reviewedAcceptanceIdentity !== acceptanceIdentity(snapshot))))
            throw new Error('A child or prerequisite output changed or has current review holds. Accept its exact current revision first.');
        await assertNativeAcceptance(brandId, current, ctx);
        checked.set(current.id, { node: current, identity: acceptanceIdentity(snapshot), contentHash: snapshot.contentHash, reviewHash: snapshot.reviewHash });
        visiting.delete(current.id);
    }
    await visit(node, true);
    return opsDb().transaction(() => {
        if (readCampaign(brandId, id)?.revision !== record.revision)
            throw new Error('Campaign changed during review. Refresh before accepting.');
        const latest = acceptanceContext(campaign);
        for (const entry of checked.values()) {
            assertAcceptanceSource(entry.node, latest.sources, latest.eligible);
            const current = native(brandId, entry.node);
            if (acceptanceIdentity(current) !== entry.identity)
                throw new Error('The child or a prerequisite scope, output or approval changed during review. Refresh before accepting.');
        }
        const target = checked.get(nodeId)!;
        return saveCampaign({ ...campaign, nodes: campaign.nodes.map(node => node.id === nodeId ? { ...node, status: 'accepted' as const, reviewedContentHash: target.contentHash, reviewedReviewHash: target.reviewHash, reviewedAcceptanceIdentity: target.identity } : node) }, record.revision);
    }).immediate();
}
export function campaignTaskLink(brandId: string, node: CampaignNode) { return native(brandId, node).href; }
