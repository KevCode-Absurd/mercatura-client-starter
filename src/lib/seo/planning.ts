import { z } from "zod";
import { buildPlanningSnapshot, type SeoContext, type SeoPage, type SeoSnapshot } from "./model";
export const planInputSchema = z.object({
    keyword: z.string().trim().min(3).max(180), intent: z.enum(["informational", "commercial", "transactional"]),
    productId: z.string().max(150), targetUrl: z.string().trim().min(1).max(2000),
    owner: z.string().trim().max(100), dueDate: z.string().refine((s) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s, "Enter a valid due date."),
    status: z.enum(["planned", "drafting", "review", "implemented", "verified"]), taskType: z.enum(["new", "refresh"]),
    notes: z.string().trim().max(4000),
});
export type SearchPlanInput = z.infer<typeof planInputSchema>;
export type SearchPlanRow = SearchPlanInput & {
    id: string;
    contextHash: string;
    updatedAt: string;
    artifactId?: string;
    editorialBrief?: import("./blog").BlogSeed;
    strategyRowId?: string;
    evidence?: {
        key: string;
        kind: "search" | "visibility";
        capturedAt: string;
        detail: string;
    };
};
export type SearchPlanData = {
    version: 1;
    revision: number;
    brandId: string;
    rows: SearchPlanRow[];
};
export function emptySearchPlan(brandId: string): SearchPlanData { return { version: 1, revision: 0, brandId, rows: [] }; }
export function normalizeQuery(value: string) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim(); }
const host = (u: URL) => u.hostname.toLowerCase().replace(/^www\./, "");
export function planStoreUrl(ctx: SeoContext, value: string) {
    if (!ctx.websiteUrl)
        throw new Error("Add a website in the shared Brand Brain first.");
    const base = new URL(ctx.websiteUrl);
    let url: URL;
    try {
        url = new URL(value, base);
    }
    catch {
        throw new Error("Enter a valid store URL.");
    }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || host(url) !== host(base) || url.port !== base.port)
        throw new Error("The target must belong to the shared Brand Brain store.");
    url.hash = "";
    return url.href;
}
export function validatePlanInput(ctx: SeoContext, input: unknown): SearchPlanInput {
    const parsed = planInputSchema.parse(input);
    if (!ctx.products.some((p) => p.id === parsed.productId))
        throw new Error("Choose a product from this brand's catalogue.");
    return { ...parsed, targetUrl: planStoreUrl(ctx, parsed.targetUrl) };
}
function urlKey(value: string) { try {
    const u = new URL(value);
    return `${host(u)}${u.pathname.replace(/\/$/, "")}${u.search}`;
}
catch {
    return value;
} }
export function mappingConflicts(rows: SearchPlanRow[]) {
    const groups = new Map<string, SearchPlanRow[]>();
    for (const row of rows) {
        const key = normalizeQuery(row.keyword);
        groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups.entries()].filter(([, values]) => new Set(values.map((r) => urlKey(r.targetUrl))).size > 1)
        .map(([keyword, values]) => ({ keyword, ids: values.map((r) => r.id), urls: [...new Set(values.map((r) => r.targetUrl))] }));
}
export function cataloguePlanSeeds(ctx: SeoContext): SearchPlanInput[] {
    return buildPlanningSnapshot(ctx).opportunities.filter((o) => o.productId).map((o) => ({ keyword: o.query, productId: o.productId!, targetUrl: o.targetUrl, intent: o.intent, owner: "", dueDate: "", status: "planned", taskType: "new", notes: "Catalogue-derived editorial seed. Search demand and ranking difficulty are unknown; validate search intent before writing." }));
}
const escapeHtml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const topicStop = new Set("with from your this that what best shop about products product choose every kids news learn rewards reward account cart menu search contact returns return shipping privacy policy terms more read learn join discover explore online store official home page blog blogs collections collection guide guides ndash mdash nbsp quot amp copyright all daily subscribe subscription save free sale login support customer customers shopping brand brands today now welcome new our their here there how should buying buy can for and the you are has have will into only us just also newsletter exclusive offers offer adult bundle bundles".split(" "));
const decoded = (s: string) => s.replace(/&(?:ndash|mdash);/gi, "—").replace(/&(?:nbsp|ensp|emsp);/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&[a-z]+;/gi, " ");
const tokens = (s: string) => new Set(normalizeQuery(decoded(s)).split(" ").filter((t) => t.length > 3 && !topicStop.has(t)).map((t) => t.endsWith("ies") ? t.slice(0, -3) + "y" : t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t));
function conciseAnchor(p: SeoPage, ctx: SeoContext) {
    const product = p.kind === "pdp" ? ctx.products.find((item) => item.id === p.productId) : undefined;
    const chunks = decoded(product?.name || p.h1 || p.title || "View product details").split(/\s*\|\s*|[\r\n]+/).map((part) => part.trim()).filter(Boolean);
    const unique = [...new Map(chunks.map((part) => [normalizeQuery(part), part])).values()];
    let text = unique.find((part) => tokens(part).size > 0) || unique[0] || "View product details";
    const words = text.split(/\s+/);
    for (let width = 1; width <= Math.floor(words.length / 2); width++) {
        if (words.length % width === 0 && words.every((word, i) => word.toLowerCase() === words[i % width].toLowerCase())) {
            text = words.slice(0, width).join(" ");
            break;
        }
    }
    return text.length <= 90 ? text : text.slice(0, 91).replace(/\s+\S*$/, "").trim();
}
function eligible(p: SeoPage) { return p.mode === "live" && p.live?.htmlInspected && !p.live.error && p.statusCode === 200 && p.robotsAllowed === true && p.noindex === false && p.intendedIndexable && (!p.canonical || urlKey(p.canonical) === urlKey(p.url)); }
export type InternalLinkOpportunity = {
    sourceUrl: string;
    destinationUrl: string;
    sourceTitle: string;
    destinationTitle: string;
    anchor: string;
    html: string;
    reason: string;
    observedAt: string;
};
export function internalLinkOpportunities(ctx: SeoContext, snapshot: SeoSnapshot): InternalLinkOpportunity[] {
    if (snapshot.mode !== "live" || snapshot.brandId !== ctx.brandId || snapshot.contextHash !== ctx.contextHash)
        return [];
    const pages = snapshot.pages.filter(eligible).filter((p) => { try {
        planStoreUrl(ctx, p.url);
        return true;
    }
    catch {
        return false;
    } });
    const brandTokens = tokens(ctx.brandName);
    const describe = (p: SeoPage) => tokens(p.description ?? "");
    const frequency = new Map<string, number>();
    for (const p of pages)
        for (const word of describe(p))
            frequency.set(word, (frequency.get(word) ?? 0) + 1);
    const details = new Map(pages.map((p) => {
        const productName = ctx.products.find((item) => item.id === p.productId)?.name ?? "";
        const primary = tokens([p.title, conciseAnchor(p, ctx), new URL(p.url).pathname, productName].filter(Boolean).join(" "));
        const description = [...describe(p)].filter((word) => pages.length < 4 || (frequency.get(word) ?? 0) / pages.length < 0.65);
        const words = new Set([...primary, ...description].filter((word) => !brandTokens.has(word)));
        for (const word of brandTokens)
            primary.delete(word);
        return [p.url, { primary, words }];
    }));
    const candidates: (InternalLinkOpportunity & {
        score: number;
    })[] = [];
    for (const source of pages.filter((p) => p.kind === "blog" || p.kind === "collection" || p.kind === "pdp")) {
        const sourceWords = details.get(source.url)!;
        for (const destination of pages.filter((p) => p.kind === "pdp" || p.kind === "collection" || p.kind === "blog")) {
            if (urlKey(source.url) === urlKey(destination.url) || source.live!.links.some((l) => urlKey(l.url) === urlKey(destination.url)))
                continue;
            const destinationWords = details.get(destination.url)!;
            const shared = [...destinationWords.words].filter((t) => sourceWords.words.has(t));
            const primaryShared = shared.filter((word) => sourceWords.primary.has(word) && destinationWords.primary.has(word));
            const sameProduct = Boolean(source.productId && source.productId === destination.productId);
            if (shared.length < 2 || !primaryShared.length)
                continue;
            const anchor = conciseAnchor(destination, ctx);
            candidates.push({ sourceUrl: source.url, destinationUrl: destination.url, sourceTitle: source.title || source.url, destinationTitle: destination.title || destination.url, anchor, html: `<a href="${escapeHtml(destination.url)}">${escapeHtml(anchor)}</a>`, reason: `${sameProduct ? "Both pages map to the same catalogue product. " : ""}Shared page-specific title, URL, product or description topics: ${shared.slice(0, 6).join(", ")}. Navigation headings and repeated store descriptions are excluded.`, observedAt: snapshot.observedAt, score: primaryShared.length * 3 + shared.length + (sameProduct ? 4 : 0) });
        }
    }
    const output: InternalLinkOpportunity[] = [], perSource = new Map<string, number>();
    for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
        if ((perSource.get(candidate.sourceUrl) ?? 0) >= 2)
            continue;
        const { score: _, ...link } = candidate;
        output.push(link);
        perSource.set(candidate.sourceUrl, (perSource.get(candidate.sourceUrl) ?? 0) + 1);
        if (output.length >= 40)
            break;
    }
    return output;
}
export function planCsv(data: SearchPlanData) {
    const cell = (value: string) => `"${(/^[\s]*[=+@\-\t\r\n]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`;
    const keys = ["keyword", "intent", "productId", "targetUrl", "taskType", "owner", "dueDate", "status", "notes", "contextHash"] as const;
    return [keys.join(","), ...data.rows.map((r) => keys.map((k) => cell(r[k])).join(","))].join("\r\n");
}
