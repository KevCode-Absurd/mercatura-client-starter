import "server-only";
import { launchBrowser } from "@/lib/landing/browser";
import { parseLivePage, publicUrl, requestPublicPage } from "./live";
import { fetchResearchPage } from "./research";
import type { SeoContext, SeoPage } from "./model";
export type RenderedReview = {
    brandId: string;
    contextHash: string;
    url: string;
    observedAt: string;
    viewport: {
        width: number;
        height: number;
    };
    source: Record<string, string | number | null>;
    rendered: Record<string, string | number | null>;
    differences: string[];
    mobile: {
        horizontalOverflow: boolean;
        visibleH1: number;
    };
    blockedRequests: number;
    limits: string;
};
const fields = (p: SeoPage): RenderedReview["source"] => ({ title: p.title, description: p.description, heading: p.h1, canonical: p.canonical, noindex: p.noindex === null ? null : String(p.noindex), headings: p.live?.headings.length ?? null, links: p.live?.links.length ?? null, productObjects: p.live?.productSchema.length ?? null, invalidJsonLd: p.live?.invalidJsonLd ?? null });
export async function reviewRenderedPage(ctx: SeoContext, url: string): Promise<RenderedReview> {
    const raw = await fetchResearchPage(url), origin = new URL(raw.url).origin;
    const site = ctx.websiteUrl ? new URL(ctx.websiteUrl) : null, final = new URL(raw.url);
    if (!site || final.hostname.replace(/^www\./, "") !== site.hostname.replace(/^www\./, "") || final.port !== site.port)
        throw new Error("The page redirects outside this store. Choose a current store destination.");
    const browser = await launchBrowser();
    let requests = 0, bytes = raw.bytes, blockedRequests = 0;
    const deadline = Date.now() + 45000;
    try {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, serviceWorkers: "block", acceptDownloads: false, userAgent: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36 MercaturaSeoReview/1.0" });
        await context.routeWebSocket("**/*", (socket) => socket.close());
        await context.route("**/*", async (route) => {
            try {
                const request = route.request(), target = publicUrl(request.url());
                if (request.method() !== "GET" || target.origin !== origin || !["document", "script", "stylesheet"].includes(request.resourceType()) || /\/(admin|account|cart|checkout|checkouts|api|login|password)(\/|$)/i.test(target.pathname) || requests++ >= 80 || Date.now() >= deadline || bytes >= 12000000) {
                    blockedRequests++;
                    return await route.abort();
                }
                const response = target.href === raw.url ? raw : await requestPublicPage(target.href);
                bytes += response.bytes;
                if (response.status >= 300 || bytes > 12000000) {
                    blockedRequests++;
                    return await route.abort();
                }
                await route.fulfill({ status: response.status, headers: Object.fromEntries(["content-security-policy", "x-robots-tag"].flatMap((key) => response.headers[key] ? [[key, response.headers[key]]] : [])), contentType: response.headers["content-type"] || "text/plain", body: response.body });
            }
            catch {
                blockedRequests++;
                await route.abort().catch(() => { });
            }
        });
        const page = await context.newPage();
        await page.goto(raw.url, { waitUntil: "domcontentloaded", timeout: 25000 });
        await page.waitForLoadState("networkidle", { timeout: 7000 }).catch(() => { });
        const html = await page.content();
        const mobile = await page.evaluate(() => ({ horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2, visibleH1: [...document.querySelectorAll("h1")].filter((el) => { const box = el.getBoundingClientRect(); return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== "hidden" && getComputedStyle(el).display !== "none"; }).length }));
        const source = fields(parseLivePage(raw, ctx)), rendered = fields(parseLivePage({ ...raw, body: html }, ctx));
        return { brandId: ctx.brandId, contextHash: ctx.contextHash, url: raw.url, observedAt: new Date().toISOString(), viewport: { width: 390, height: 844 }, source, rendered, mobile, blockedRequests, differences: Object.keys(source).filter((key) => source[key] !== rendered[key]), limits: "Mobile DOM snapshot of the accessible page, not a store edit or a checkout test. Only same-origin document/script/style GET requests executed through DNS-pinned transport; images, fonts, cross-origin resources, APIs, POSTs and redirects blocked. Missing dynamic content can be caused by these limits. No ranking, full accessibility, layout fidelity or speed pass is claimed." };
    }
    finally {
        await browser.close();
    }
}
