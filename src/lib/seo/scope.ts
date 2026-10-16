import type { SeoAudit, SeoCategory, SeoContext, SeoFinding, SeoPage, SeoSnapshot } from "./model";
export type PageFocus = {
    included: boolean;
    kind: "home" | "pdp" | "blog" | "excluded";
    reason: string;
};
const pathOf = (url: string) => decodeURIComponent(new URL(url).pathname).toLowerCase().replace(/\/+$/, "") || "/";
const hostOf = (url: string) => new URL(url).hostname.toLowerCase().replace(/^www\./, "");
const promotional = /(?:^|[\s/_-])(?:gwp|giveaway|referrals?|coupons?|discounts?|vip-pass|member-homepage|first-order|pinch-text|index-text|unauthorized-resale|free-gift)(?:$|[\s/_-])/i;
function auxiliary(value: string) {
    return promotional.test(value.replace(/\s+/g, "-"));
}
export function coreProducts(ctx: SeoContext) {
    const nonFashionBrand = /nutrition|supplement|food|snack|wellness|skincare|beauty|cookware/i.test(ctx.category);
    return ctx.products.filter(p => !auxiliary(`${p.name} ${p.url ? safePath(p.url) : ""}`)
        && !(nonFashionBrand && /(?:^|[\s/_-])(?:hoodies?|totes?|tees?|t-shirts?|hats?|merch(?:andise)?)(?:$|[\s/_-])/i.test(`${p.name} ${p.url ? safePath(p.url) : ""}`)));
}
function safePath(url: string) { try {
    return pathOf(url);
}
catch {
    return "";
} }
function sameStore(a: string, b: string) { try {
    return hostOf(a) === hostOf(b);
}
catch {
    return false;
} }
const words = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/);
function matchesUnmappedProduct(ctx: SeoContext, path: string) {
    const brand = new Set(words(ctx.brandName));
    const identity = (value: string) => words(value).filter(word => !brand.has(word)).join(" ");
    const slug = identity(path.split("/").pop() ?? "");
    return slug && coreProducts(ctx).some(p => !p.url && identity(p.name.split(/[(:]/)[0]) === slug);
}
export function classifyAuditUrl(ctx: SeoContext, url: string): PageFocus {
    const excluded = (reason: string): PageFocus => ({ included: false, kind: "excluded", reason });
    try {
        const parsed = new URL(url), path = pathOf(url);
        if (!ctx.websiteUrl || hostOf(url) !== hostOf(ctx.websiteUrl))
            return excluded("Outside this store");
        if (parsed.search)
            return excluded("Filtered or campaign URL");
        if (path === pathOf(ctx.websiteUrl))
            return { included: true, kind: "home", reason: "Store homepage" };
        if (/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:blogs?|articles)(?:\/|$)/i.test(path))
            return { included: true, kind: "blog", reason: "Blog or article" };
        if (auxiliary(path))
            return excluded("Promotion, member benefit or utility page");
        const products = coreProducts(ctx);
        const mapped = products.filter(p => p.url && sameStore(p.url, ctx.websiteUrl!));
        if (mapped.some(p => safePath(p.url!) === path))
            return { included: true, kind: "pdp", reason: "Core product in Brand Brain" };
        if (/\/(?:products?|shop)\//i.test(path)) {
            if (matchesUnmappedProduct(ctx, path))
                return { included: true, kind: "pdp", reason: "Matches a core product name; confirm its URL in Brand Brain" };
            if (mapped.length)
                return excluded("Not a core product URL in Brand Brain");
            return { included: true, kind: "pdp", reason: "Product URL; add catalogue URLs to confirm the core range" };
        }
        return excluded("Outside homepage, core products and blog content");
    }
    catch {
        return excluded("Invalid page URL");
    }
}
export function classifyAuditPage(ctx: SeoContext, page: SeoPage): PageFocus {
    const result = classifyAuditUrl(ctx, page.url);
    if (result.included || auxiliary(safePath(page.url)))
        return result;
    if (page.live?.requestedUrl && page.live.requestedUrl !== page.url && classifyAuditUrl(ctx, page.live.requestedUrl).kind === "pdp") {
        if (sameStore(page.url, ctx.websiteUrl!) && page.live.htmlInspected && page.live.productSchema.length > 0)
            return { included: true, kind: "pdp", reason: "Core product destination after redirect" };
    }
    return result;
}
export function focusAudit(ctx: SeoContext, snapshot: SeoSnapshot, audit: SeoAudit) {
    const included = snapshot.pages.filter(page => classifyAuditPage(ctx, page).included);
    const urls = new Set(included.map(page => page.url));
    const checks = audit.checks.filter(check => urls.has(check.url));
    const scores = Object.fromEntries((["SEO", "AEO", "GEO"] as SeoCategory[]).map(category => {
        const rows = checks.filter(check => check.category === category);
        const passed = rows.filter(check => check.status === "pass").length, failed = rows.filter(check => check.status === "fail").length;
        return [category, { ...audit.scores[category], passed, failed, unknown: rows.length - passed - failed, total: rows.length, score: passed + failed ? Math.round(100 * passed / (passed + failed)) : null }];
    })) as SeoAudit["scores"];
    return { snapshot: { ...snapshot, pages: included.map(page => ({ ...page, kind: classifyAuditPage(ctx, page).kind as SeoPage["kind"] })) }, audit: { ...audit, checks, findings: audit.findings.filter(f => urls.has(f.url)), scores }, excluded: snapshot.pages.filter(page => !urls.has(page.url)).map(page => ({ url: page.url, reason: classifyAuditPage(ctx, page).reason })) };
}
export type FindingGroup = {
    id: string;
    title: string;
    remedy: string;
    priority: SeoFinding["priority"];
    category: SeoCategory;
    findings: SeoFinding[];
};
export function groupFindings(findings: SeoFinding[], pages: SeoPage[]): FindingGroup[] {
    const groups = new Map<string, FindingGroup>();
    for (const finding of findings) {
        const page = pages.find(page => page.url === finding.url);
        let cause = "", title = finding.title, remedy = finding.remedy;
        if (finding.ruleId === "SEO-INDEX") {
            if (page?.statusCode === 404 || page?.statusCode === 410) {
                cause = "missing";
                title = "Fix missing core pages";
                remedy = "Restore pages that should still exist. If a product was replaced, redirect to its relevant replacement and update internal links; do not redirect every removed product to the homepage.";
            }
            else if (page?.statusCode && page.statusCode >= 500) {
                cause = "server";
                title = "Fix server errors on core pages";
                remedy = "Ask your hosting or platform team to resolve the failing responses, then confirm these pages return usable content before rerunning the audit.";
            }
            else if (page?.statusCode && page.statusCode >= 400) {
                cause = "access";
                title = "Check blocked access to core pages";
                remedy = "Check these responses with your hosting or security team. Confirm whether shoppers and search crawlers are blocked before changing access rules; a block on this audit crawler alone does not prove Google is blocked.";
            }
            else if (page?.noindex) {
                cause = "noindex";
                title = "Review search exclusion on core pages";
                remedy = "For pages intended to appear in search, remove the noindex directive from the page or response header, check the canonical URL, then verify with Search Console. Keep intentional exclusions in place.";
            }
        }
        const key = `${finding.category}:${finding.ruleId}:${cause}`;
        const group = groups.get(key) ?? { id: key, title, remedy, priority: finding.priority, category: finding.category, findings: [] };
        if (!group.findings.some(row => row.url === finding.url))
            group.findings.push(finding);
        if (finding.priority < group.priority)
            group.priority = finding.priority;
        groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.priority.localeCompare(b.priority) || b.findings.length - a.findings.length || a.id.localeCompare(b.id));
}
