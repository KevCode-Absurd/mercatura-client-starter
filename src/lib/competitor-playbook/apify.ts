import type { AdImport, CompetitorAd, ScanInput } from "./types";
import { publicUrl, searchIdentity } from "./providers";
const BASE = "https://api.apify.com/v2/";
const terminal = (status: string) => ["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"].includes(status);
const str = (value: unknown) => typeof value === "string" ? value.slice(0, 6000) : "";
const id = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) ? String(value) : str(value);
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const integer = (value: string | undefined, fallback: number, max: number) => Math.min(max, Math.max(1, Number(value) || fallback));
export function apifyInput(input: ScanInput) {
    const identity = searchIdentity(input);
    const url = new URL("https://www.facebook.com/ads/library/");
    for (const [key, value] of Object.entries({ active_status: "active", ad_type: "all", country: input.country, media_type: "all", ...(identity.pageId ? { search_type: "page", view_all_page_id: identity.pageId } : { search_type: "keyword_unordered", q: identity.query }) }))
        url.searchParams.set(key, value);
    return { startUrls: [{ url: url.href }], resultsLimit: integer(process.env.COMPETITOR_AD_SCAN_LIMIT, 200, 1000), activeStatus: "active", includeAboutPage: false, isDetailsPerAd: false, enrichWithEcommerceData: false };
}
export function normalizeApify(raw: unknown): CompetitorAd[] {
    return array(raw).flatMap(value => {
        const r = object(value), s = object(r.snapshot);
        const cards = array(s.cards).map(object);
        if (r.isActive === false || array(s.videos).length || array(s.extraVideos).length || cards.some(c => c.videoHdUrl || c.videoSdUrl || c.video_hd_url || c.video_sd_url))
            return [];
        const format = str(s.displayFormat || s.display_format).toUpperCase();
        if (!["IMAGE", "DCO", "MULTI_IMAGES", "CAROUSEL"].includes(format))
            return [];
        const images = [...array(s.images).map(object), ...cards];
        const imageUrl = images.map(i => publicUrl(i.originalImageUrl || i.original_image_url || i.resizedImageUrl || i.resized_image_url)).find(Boolean) ?? null;
        const adId = id(r.adArchiveId || r.adArchiveID || r.ad_archive_id);
        const pageId = id(r.pageId || r.pageID || s.pageId || s.page_id);
        if (!/^\d+$/.test(adId) || !pageId || !imageUrl)
            return [];
        const dateValue = r.startDateFormatted || r.startDate || r.start_date;
        const date = new Date(typeof dateValue === "number" ? dateValue * 1000 : str(dateValue));
        const copy = (primary: unknown, card: unknown) => { const value = str(primary); return value && !value.includes("{{") ? value : str(card).replace(/\{\{[^}]+\}\}/g, "").trim(); };
        return [{ id: adId, advertiser: str(r.pageName || s.pageName || s.page_name) || "Unknown advertiser", advertiserId: pageId, headline: copy(s.title, cards[0]?.title), body: copy(object(s.body).text || s.body, cards[0]?.body), startedAt: Number.isFinite(date.getTime()) ? date.toISOString() : null, active: typeof r.isActive === "boolean" ? r.isActive : null, libraryUrl: `https://www.facebook.com/ads/library/?id=${adId}`, landingUrl: publicUrl(s.linkUrl || s.link_url || cards[0]?.linkUrl), imageUrl }];
    });
}
async function request(endpoint: string, method = "GET", body?: unknown, fetcher: typeof fetch = fetch) {
    const token = process.env.APIFY_API_KEY || process.env.APIFY_TOKEN;
    if (!token)
        throw new Error("Set APIFY_API_KEY on the server to retrieve static ads automatically.");
    const response = await fetcher(`${BASE}${endpoint}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(30000) });
    if (!response.ok && response.status !== 404)
        throw new Error(`Automatic ad import failed (Apify HTTP ${response.status}). Check API access and available credits.`);
    if (response.status === 404 && method !== "DELETE")
        throw new Error("The automatic ad search is no longer available. Start another search.");
    return response;
}
export async function startAdImport(input: ScanInput, fetcher: typeof fetch = fetch): Promise<AdImport> {
    const body = apifyInput(input);
    const budget = Math.min(10, Math.max(0.1, Number(process.env.COMPETITOR_AD_SCAN_BUDGET_USD) || 2));
    const response = await request(`acts/apify~facebook-ads-scraper/runs?timeout=180&maxTotalChargeUsd=${budget}`, "POST", body, fetcher);
    const { data } = await response.json();
    if (!data?.id || !data.defaultDatasetId)
        throw new Error("The ad provider did not return a search job.");
    return { status: "running", scanned: 0, limit: body.resultsLimit, runId: data.id, datasetId: data.defaultDatasetId, storeId: data.defaultKeyValueStoreId, queueId: data.defaultRequestQueueId };
}
export async function pollAdImport(state: AdImport, fetcher: typeof fetch = fetch) {
    if (state.status !== "running" || !state.runId || !state.datasetId)
        return { ads: [], done: true, failed: state.status === "failed" };
    const { data: run } = await (await request(`actor-runs/${encodeURIComponent(state.runId)}?waitForFinish=1`, "GET", undefined, fetcher)).json();
    if (!run?.status)
        throw new Error("The ad provider did not return a search status.");
    const response = await request(`datasets/${encodeURIComponent(state.datasetId)}/items?clean=true&format=json&offset=${state.scanned}&limit=50`, "GET", undefined, fetcher);
    const rows: unknown = await response.json();
    if (!Array.isArray(rows))
        throw new Error("The ad provider returned invalid creative data.");
    return { ads: normalizeApify(rows), scanned: state.scanned + rows.length, done: terminal(run.status) && rows.length < 50, failed: terminal(run.status) && run.status !== "SUCCEEDED" };
}
export async function cleanupAdImport(state: AdImport, fetcher: typeof fetch = fetch) {
    if (!state.runId)
        return;
    if (state.status === "running")
        await request(`actor-runs/${encodeURIComponent(state.runId)}/abort?gracefully=true`, "POST", undefined, fetcher);
    for (const [kind, value] of [["datasets", state.datasetId], ["key-value-stores", state.storeId], ["request-queues", state.queueId]] as const) {
        if (value)
            await request(`${kind}/${encodeURIComponent(value)}`, "DELETE", undefined, fetcher);
    }
    await request(`actor-runs/${encodeURIComponent(state.runId)}`, "DELETE", undefined, fetcher);
    delete state.runId;
    delete state.datasetId;
    delete state.storeId;
    delete state.queueId;
}
