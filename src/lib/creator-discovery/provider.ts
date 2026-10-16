import { searchVisibilityAnswer, visibilityConnection, type VisibilityAnswer } from "../seo/visibility-provider";
import type { DiscoveryRun, DiscoveredCreator } from "./types";
export interface CreatorResearchProvider {
    discover(run: DiscoveryRun, batch: number): Promise<VisibilityAnswer>;
    review(run: DiscoveryRun, creator: DiscoveredCreator): Promise<VisibilityAnswer>;
}
export function creatorResearchConnection() {
    const connection = visibilityConnection();
    return { ...connection, models: connection.models.map(m => ({ ...m, reason: m.reason.replace("visibility observations", "creator research") })) };
}
const clip = (value: string, length: number) => value.replace(/\s+/g, " ").replace(/["\\]/g, "").slice(0, length);
function brief(run: DiscoveryRun): string {
    const c = run.criteria;
    return JSON.stringify({ brand: clip(c.brand, 30), category: clip(c.category, 50), positioning: clip(c.positioning, 60),
        products: c.products.slice(0, 2).map(p => clip(`${p.name}: ${p.format}`, 50)),
        buyers: c.buyers.slice(0, 2).map(b => clip(`${b.name}: ${b.summary}; ${b.problem}`, 70)),
        voice: c.voice.slice(0, 1).map(v => clip(v, 30)), avoid: c.avoid.slice(0, 2).map(v => clip(v, 30)) });
}
export const webCreatorProvider: CreatorResearchProvider = {
    discover: (run, batch) => {
        const excluded = run.creators.map(c => `${c.platform}:${c.handle}`).join(",");
        const prompt = `Find up to 4 real public ${run.options.platform === "all" ? "Instagram, TikTok or YouTube" : run.options.platform} creators for a D2C collaboration in ${run.options.market}. Today ${new Date().toISOString().slice(0, 10)}; batch ${batch + 1}. Brand data: ${brief(run)}\nPrefer independent creators, varied niches/sizes. Exclude ${clip(excluded, 180)}. No invented metrics/contact/demographics. Unknown market=null, fit.market=0. Audience fit=topical relevance. JSON only: {"creators":[{"name":"","platform":"instagram|tiktok|youtube","handle":"@...","profile_url":"https://...","content":"topic/format","market_evidence":null,"fit":{"product":0,"audience":0,"content":0,"market":0,"reasons":["evidenced reason"]},"collab_angle":"product collaboration idea","cautions":[],"source_urls":["supporting citation URL"]}]}. Scores 0–5; descriptions <150 chars. Cite EACH creator using provider annotations. source_urls must match citations. Use direct profile URLs (YouTube /@handle). Return fewer if necessary.`;
        return searchVisibilityAnswer(run.brand_id, prompt, run.options.market, run.options.model, { purpose: "creator_discovery", refId: run.id });
    },
    review: (run, creator) => {
        const prompt = `Research ${creator.platform} creator ${creator.handle}, ${creator.profile_url}. Today ${new Date().toISOString().slice(0, 10)}. Find up to 3 most recent accessible posts/videos published in the last 90 days. Brand data: ${brief(run)}\nRead accessible captions, descriptions or transcripts. Do not claim to watch inaccessible video or confirm latest posts from search alone. Posts must belong to this creator. Return ONLY JSON {"posts":[{"url":"direct social post URL","published_at":"YYYY-MM-DD","summary":"specific topic/format from accessible text","source_urls":["exact supporting citation URL"]}],"note":"access limitations and what text was reviewed","fit":{"product":0,"audience":0,"content":0,"market":0,"reasons":["reason grounded in reviewed posts"]}}. Scores 0–5, topical audience relevance only. Keep summary under 180 characters. Cite each post using provider annotations, matching source_urls. Do not invent dates/posts. Return [] if blocked or no dated posts are accessible. No contact details. All observations are TEXT evidence; visual performance remains unreviewed.`;
        return searchVisibilityAnswer(run.brand_id, prompt, run.options.market, run.options.model, { purpose: "creator_discovery", refId: run.id });
    },
};
