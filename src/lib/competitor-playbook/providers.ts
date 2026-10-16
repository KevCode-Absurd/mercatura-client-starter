import { z } from "zod";
import type { AdPage, CompetitorAd, ScanInput } from "./types";
export const ScanSchema = z.object({
    query: z.string().trim().min(1, "Enter a competitor name or link.").max(1000),
    website: z.string().trim().max(500).optional(),
    pageId: z.string().trim().regex(/^\d*$/, "Use the numeric Facebook Page ID.").max(30).optional(),
    country: z.string().regex(/^[A-Z]{2}$/).default("GB"),
    provider: z.enum(["auto", "apify", "meta", "foreplay"]).default("auto"),
});
export function searchIdentity(input: ScanInput): {
    query: string;
    pageId?: string;
    website?: string;
} {
    try {
        const u = new URL(/^https?:\/\//i.test(input.query) ? input.query : `https://${input.query}`);
        if (u.hostname === "facebook.com" || u.hostname.endsWith(".facebook.com")) {
            const id = u.searchParams.get("view_all_page_id");
            if (id && /^\d+$/.test(id))
                return { query: "", pageId: input.pageId || id, website: input.website };
            if (u.pathname.startsWith("/ads/library"))
                throw new Error("Use an advertiser's Ad Library link with view_all_page_id, or enter its name.");
        }
        if (u.hostname.includes(".") && !input.query.includes(" "))
            return { query: u.hostname.replace(/^www\./, "").split(".")[0], pageId: input.pageId, website: input.website || u.href };
    }
    catch (e) {
        if (e instanceof Error && e.message.startsWith("Use an advertiser"))
            throw e;
    }
    return { query: input.query, pageId: input.pageId, website: input.website };
}
export function providerState() {
    const apify = !!(process.env.APIFY_API_KEY || process.env.APIFY_TOKEN);
    const foreplay = !!process.env.FOREPLAY_API_KEY;
    return { auto: apify || foreplay, apify, meta: !!process.env.META_ACCESS_TOKEN, foreplay };
}
export function resolveProvider(provider: ScanInput["provider"]): ScanInput["provider"] {
    if (provider !== "auto")
        return provider;
    if (providerState().foreplay)
        return "foreplay";
    if (providerState().apify)
        return "apify";
    throw new Error("Connect automatic ad images on the server with APIFY_API_KEY or FOREPLAY_API_KEY. The personal Meta chat connection supplies preview links, not image files.");
}
export function metaQuery(input: ScanInput, cursor?: string | null): URL {
    const version = process.env.META_API_VERSION || "v25.0";
    if (!/^v\d+\.0$/.test(version))
        throw new Error("META_API_VERSION must look like v25.0.");
    const url = new URL(`https://graph.facebook.com/${version}/ads_archive`);
    const identity = searchIdentity(input);
    if (!identity.pageId && identity.query.length > 100)
        throw new Error("Meta keyword searches allow up to 100 characters. Use an advertiser Page ID for a long link.");
    const params = { ad_type: "ALL", ad_reached_countries: JSON.stringify([input.country]), media_type: "IMAGE", ad_active_status: "ACTIVE", fields: "id,page_id,page_name,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_captions,ad_delivery_start_time,ad_delivery_stop_time", limit: "50", ...(identity.pageId ? { search_page_ids: JSON.stringify([identity.pageId]) } : { search_terms: identity.query, search_type: "KEYWORD_EXACT_PHRASE" }), ...(cursor ? { after: cursor } : {}) };
    for (const [key, value] of Object.entries(params))
        url.searchParams.set(key, value);
    return url;
}
const text = (v: unknown) => typeof v === "string" ? v.slice(0, 6000) : "";
const list = (v: unknown) => Array.isArray(v) ? v.map(text).filter(Boolean).join("\n") : "";
const pageId = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v > 0 ? String(v) : text(v);
const date = (v: unknown) => {
    const n = typeof v === "number" ? new Date(v * 1000) : new Date(text(v));
    return Number.isFinite(n.getTime()) ? n.toISOString() : null;
};
export function publicUrl(value: unknown): string | null {
    try {
        const u = new URL(text(value));
        if (u.protocol !== "https:" || u.username || u.password)
            return null;
        for (const key of [...u.searchParams.keys()])
            if (/token|secret|api.?key|authorization/i.test(key))
                u.searchParams.delete(key);
        return u.href;
    }
    catch {
        return null;
    }
}
export function normalizeMeta(raw: unknown): CompetitorAd[] {
    if (!Array.isArray(raw))
        return [];
    return raw.flatMap((r) => {
        if (!r || typeof r !== "object" || !/^\d+$/.test(text(r.id)) || (r.media_type && r.media_type !== "IMAGE"))
            return [];
        const caption = Array.isArray(r.ad_creative_link_captions) ? r.ad_creative_link_captions.find((value: unknown) => typeof value === "string" && /^(?:https:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}/i.test(value)) : null;
        return [{ id: text(r.id), advertiser: text(r.page_name) || "Unknown advertiser", advertiserId: pageId(r.page_id), headline: list(r.ad_creative_link_titles) || text(r.ad_creative_link_title), body: list(r.ad_creative_bodies) || text(r.ad_creative_body), startedAt: date(r.ad_delivery_start_time), active: true, libraryUrl: `https://www.facebook.com/ads/library/?id=${r.id}`, landingUrl: caption ? publicUrl(/^https:\/\//i.test(caption) ? caption : `https://${caption}`) : null, imageUrl: null }];
    });
}
export function normalizeForeplay(raw: unknown): CompetitorAd[] {
    if (!Array.isArray(raw))
        return [];
    return raw.flatMap((r) => {
        if (!r || typeof r !== "object" || r.display_format !== "image" || r.video || (Array.isArray(r.cards) && r.cards.some((c: {
            video?: unknown;
        } | null) => c?.video)))
            return [];
        const id = text(r.ad_id) || text(r.id);
        if (!id)
            return [];
        return [{ id, advertiser: text(r.name) || "Unknown advertiser", advertiserId: text(r.brand_id), headline: text(r.headline), body: typeof r.description === "object" ? "" : text(r.description), startedAt: date(r.started_running), active: typeof r.live === "boolean" ? r.live : null, libraryUrl: publicUrl(r.foreplay_url) || `https://www.facebook.com/ads/library/?id=${encodeURIComponent(id)}`, landingUrl: publicUrl(r.link_url), imageUrl: publicUrl(r.image) }];
    });
}
export async function fetchAdPage(input: ScanInput, cursor: string | null = null, fetcher: typeof fetch = fetch): Promise<AdPage> {
    if (!["meta", "foreplay"].includes(input.provider))
        throw new Error("Automatic imports use the background image importer.");
    const token = input.provider === "meta" ? process.env.META_ACCESS_TOKEN : process.env.FOREPLAY_API_KEY;
    if (!token)
        throw new Error(input.provider === "meta" ? "Connect Meta Ad Library access: set META_ACCESS_TOKEN on the server. A Marketing API token alone may not have Ad Library permission." : "Set FOREPLAY_API_KEY on the server to import static ad images.");
    const url = input.provider === "meta" ? metaQuery(input, cursor) : new URL("https://public.api.foreplay.co/api/discovery/ads");
    if (input.provider === "foreplay") {
        for (const [key, value] of Object.entries({ query: searchIdentity(input).query, display_format: "image", publisher_platform: "facebook", live: "true", order: "longest_running", limit: "50", ...(cursor ? { cursor } : {}) }))
            url.searchParams.set(key, value);
        url.searchParams.append("publisher_platform", "instagram");
    }
    const response = await fetcher(url, { headers: { Authorization: input.provider === "meta" ? `Bearer ${token}` : token, accept: "application/json" }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(25000) });
    const result = await response.json();
    if (!response.ok || result.error) {
        if (input.provider === "meta" && result.error?.code === 10)
            throw new Error("Meta denied Ad Library access (code 10). Enable Ad Library API access for the Meta app and update META_ACCESS_TOKEN; ads_read alone is insufficient.");
        if (input.provider === "meta" && result.error?.code === 190)
            throw new Error("The Meta token is invalid or expired. Update META_ACCESS_TOKEN.");
        throw new Error(`${input.provider === "meta" ? "Meta" : "Foreplay"} import failed (HTTP ${response.status}). Check the server connection, API access and credits.`);
    }
    const next = input.provider === "meta" ? (result.paging?.next ? text(result.paging?.cursors?.after) || null : null) : result.metadata?.cursor == null ? null : String(result.metadata.cursor);
    return { ads: input.provider === "meta" ? normalizeMeta(result.data) : normalizeForeplay(result.data), cursor: next === cursor ? null : next, notices: input.provider === "meta" ? ["Meta returns ad copy and public snapshot links. Attach each static image before generating. Commercial-ad coverage varies by country; it is not a complete worldwide inventory."] : ["Foreplay results come from its indexed library. Confirm the advertiser before choosing ads."] };
}
export function rankAds(ads: CompetitorAd[], sort: "longest" | "newest" = "longest"): CompetitorAd[] {
    return [...ads].sort((a, b) => {
        if (!a.startedAt)
            return b.startedAt ? 1 : 0;
        if (!b.startedAt)
            return -1;
        return sort === "longest" ? a.startedAt.localeCompare(b.startedAt) : b.startedAt.localeCompare(a.startedAt);
    });
}
