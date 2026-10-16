import { z } from "zod";
import type { BrandBrain } from "../brand-brain";
export const PLATFORMS = ["instagram", "tiktok", "youtube"] as const;
export const DiscoveryInput = z.object({
    count: z.number().int().min(5).max(30).default(20),
    platform: z.enum(["all", ...PLATFORMS]).default("all"),
    productId: z.string().max(100).nullable().default(null),
    personaId: z.string().max(100).nullable().default(null),
    market: z.string().trim().min(2).max(80),
    reviewRecent: z.boolean().default(false),
    model: z.string().min(1).max(100),
});
export type DiscoveryOptions = z.infer<typeof DiscoveryInput>;
const text = z.string().max(800);
const url = z.string().url().max(2000).refine(value => /^https?:\/\//.test(value), "Use a public web URL.");
export const SourceSchema = z.object({ url, title: z.string().max(300) });
export const FitSchema = z.object({
    product: z.number().int().min(0).max(5),
    audience: z.number().int().min(0).max(5),
    content: z.number().int().min(0).max(5),
    market: z.number().int().min(0).max(5),
    reasons: z.array(text).min(1).max(4),
});
export const CandidateSchema = z.object({
    name: z.string().min(1).max(100),
    platform: z.enum(PLATFORMS),
    handle: z.string().min(2).max(60),
    profile_url: url,
    content: text,
    market_evidence: text.nullable().default(null),
    fit: FitSchema,
    collab_angle: text,
    cautions: z.array(text).max(5).default([]),
    source_urls: z.array(url).min(1).max(6),
});
export type Candidate = z.infer<typeof CandidateSchema>;
export const PostSchema = z.object({
    url,
    published_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    summary: text,
    source_urls: z.array(url).min(1).max(4),
});
export const CreatorSchema = CandidateSchema.omit({ source_urls: true }).extend({
    id: z.string().min(1).max(100),
    sources: z.array(SourceSchema).min(1).max(10),
    score: z.number().min(0).max(100),
    posts: z.array(PostSchema.omit({ source_urls: true }).extend({ sources: z.array(SourceSchema).min(1).max(4) })).max(3).default([]),
    review: z.enum(["not_requested", "pending", "unavailable", "partial", "three_posts"]).default("not_requested"),
    review_note: text.default(""),
    reviewed_at: z.string().nullable().default(null),
});
export type DiscoveredCreator = z.infer<typeof CreatorSchema>;
export const CriteriaSchema = z.object({
    brand: z.string(), category: z.string(), positioning: z.string(),
    products: z.array(z.object({ name: z.string(), format: z.string() })),
    buyers: z.array(z.object({ name: z.string(), summary: z.string(), problem: z.string() })),
    voice: z.array(z.string()), avoid: z.array(z.string()),
});
export type DiscoveryCriteria = z.infer<typeof CriteriaSchema>;
export const RunSchema = z.object({
    id: z.string().uuid(), brand_id: z.string(), created_at: z.string(), updated_at: z.string(),
    status: z.enum(["queued", "running", "complete", "failed", "paused", "stopped"]),
    options: DiscoveryInput, criteria: CriteriaSchema,
    creators: z.array(CreatorSchema).max(30),
    batches_done: z.number().int().min(0),
    progress: z.string(), warnings: z.array(z.string()).max(50), cost_usd: z.number().min(0),
    search_suggestions: z.array(z.string().max(100000)).max(40).default([]),
});
export type DiscoveryRun = z.infer<typeof RunSchema>;
export function criteriaFromBrain(brain: BrandBrain, options: DiscoveryOptions): DiscoveryCriteria {
    const products = options.productId ? brain.products.filter(p => p.id === options.productId) : brain.products;
    const buyers = options.personaId ? brain.personas.filter(p => p.id === options.personaId) : brain.personas;
    if (options.productId && !products.length)
        throw new Error("Choose a product from this brand.");
    if (options.personaId && !buyers.length)
        throw new Error("Choose a buyer from this brand.");
    return {
        brand: brain.brand.name, category: brain.brand.category, positioning: brain.brand.one_liner,
        products: products.map(({ name, format }) => ({ name, format })),
        buyers: buyers.map(({ name, summary, problem }) => ({ name, summary, problem })),
        voice: brain.voice.do, avoid: [...brain.voice.dont, ...brain.forbidden_claims],
    };
}
export function fitScore(fit: z.infer<typeof FitSchema>, marketEvidence: string | null): number {
    return Math.round(fit.product * 7 + fit.audience * 5 + fit.content * 5 + (marketEvidence ? fit.market : 0) * 3);
}
export const rankCreators = (creators: DiscoveredCreator[]) => [...creators].sort((a, b) => b.score - a.score || b.posts.length - a.posts.length || a.handle.localeCompare(b.handle));
export function profileIdentity(raw: string, platform: Candidate["platform"]): {
    url: string;
    handle: string;
} | null {
    try {
        const u = new URL(raw);
        const hosts = { instagram: "instagram.com", tiktok: "tiktok.com", youtube: "youtube.com" };
        if (u.protocol !== "https:" || u.username || u.password || u.port || u.hostname.replace(/^www\./, "") !== hosts[platform])
            return null;
        const parts = u.pathname.split("/").filter(Boolean);
        const name = parts[0]?.replace(/^@/, "");
        if (!name || !/^[\w.-]{2,55}$/.test(name))
            return null;
        if (platform === "instagram" && (parts.length !== 1 || ["p", "reel", "reels", "stories", "explore", "accounts", "direct", "about"].includes(name.toLowerCase())))
            return null;
        if (platform !== "instagram" && (parts.length !== 1 || !parts[0].startsWith("@")))
            return null;
        return { url: `https://www.${hosts[platform]}/${platform === "instagram" ? "" : "@"}${name}/`, handle: `@${name}` };
    }
    catch {
        return null;
    }
}
