import fs from "node:fs";
import path from "node:path";
import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { createHash, randomUUID } from "node:crypto";
import { gunzipSync, inflateSync, brotliDecompressSync } from "node:zlib";
import sharp from "sharp";
import { env } from "../env";
import { isPublicAddress, publicUrl, requestPublicPage, parseRobots, robotsAllows } from "../seo/live";
import { tokenizeHtml, textContent } from "../seo/html";
import { launchBrowser } from "./browser";
import { collectVisibleControls, resourceLedger, type ViewportInspection } from "./evidence-inspection";
export interface EvidenceImage {
    url: string;
    alt: string;
    width: number;
    height: number;
}
export interface EvidenceSection {
    id: string;
    title: string;
    text: string;
    top: number;
    height: number;
    html?: string;
    styles?: Record<string, string>;
    images: EvidenceImage[];
}
export interface EvidenceViewport {
    shot: string;
    width: number;
    height: number;
    sections: EvidenceSection[];
    inspection?: ViewportInspection;
}
export interface PageEvidence {
    id: string;
    brandId?: string;
    requestedUrl?: string;
    url: string;
    title: string;
    capturedAt: string;
    freshness?: {
        mode: "captured" | "reused_historical";
        revalidatedAt: string;
        documentSha256: string;
        policy: string;
        limitation: string;
    };
    desktop: EvidenceViewport;
    mobile: EvidenceViewport;
    images: EvidenceImage[];
    gallery?: EvidenceImage[];
    links: {
        url: string;
        text: string;
    }[];
    warnings: string[];
}
export interface DiscoveredPage {
    url: string;
    title: string;
    kind: "home" | "pdp" | "collection" | "page";
    source: "input" | "link" | "sitemap";
}
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const folder = () => path.join(env.DATA_DIR, "cro", "evidence");
export function evidenceIsUsable(evidence: PageEvidence): boolean {
    try {
        publicUrl(evidence.url);
    }
    catch {
        return false;
    }
    return [evidence.mobile, evidence.desktop].every(view => view?.sections?.length && !view.sections.some(s => /(?:can't reach this page|cannot reach this page|ERR_FAILED|ERR_CONNECTION_[A-Z_]+|ERR_NAME_NOT_RESOLVED)/i.test(s.text) && /Microsoft Edge|Google Chrome|webpage at/i.test(s.text)));
}
export function getEvidence(id: string): PageEvidence | null {
    if (!UUID.test(id))
        return null;
    try {
        const evidence = JSON.parse(fs.readFileSync(path.join(folder(), `${id}.json`), "utf8")) as PageEvidence;
        return evidenceIsUsable(evidence) ? evidence : null;
    }
    catch {
        return null;
    }
}
const normalize = (input: string) => publicUrl(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`).href;
export function pageKind(url: string): DiscoveredPage["kind"] {
    const p = new URL(url).pathname;
    return /^\/?$/.test(p) ? "home" : /\/(products?|shop\/[^/]+\/p|p)\//i.test(p) ? "pdp" : /\/(collections?|categor(?:y|ies)|shop(?:-all)?)(?:\/|$)/i.test(p) ? "collection" : "page";
}
async function readPublic(url: string) {
    for (let i = 0; i < 6; i++) {
        const r = await requestPublicPage(url).catch(async (error: Error) => {
            if (!/2 MB|compressed content/.test(error.message))
                throw error;
            const response = await requestEvidenceResource(url);
            return { url, ...response, body: response.body.toString("utf8"), bytes: response.body.length, durationMs: 0 };
        });
        if (r.status >= 300 && r.status < 400 && r.headers.location) {
            url = publicUrl(r.headers.location, url).href;
            continue;
        }
        return r;
    }
    throw new Error("Too many storefront redirects.");
}
export async function discoverPages(input: string, options: {
    quick?: boolean;
} = {}): Promise<DiscoveredPage[]> {
    const requested = normalize(input), origin = new URL(requested).origin;
    const robots = await readPublic(`${origin}/robots.txt`).catch(() => null);
    const policy = parseRobots(robots?.status === 200 ? robots.body : "");
    if (!robotsAllows(requested, policy))
        throw new Error("This page is excluded by the site's robots policy.");
    const home = await readPublic(requested);
    if (home.status >= 400)
        throw new Error(`Storefront returned HTTP ${home.status}.`);
    const finalHost = new URL(home.url).hostname.replace(/^www\./, "");
    const found = new Map<string, DiscoveredPage>();
    const add = (value: string, title: string, source: DiscoveredPage["source"]) => {
        try {
            const u = publicUrl(value.replace(/&amp;/g, "&"), home.url);
            u.search = "";
            if (u.hostname.replace(/^www\./, "") !== finalHost || !robotsAllows(u.href, policy) || /\.(?:xml|png|jpg|webp|pdf|css|js)$/i.test(u.pathname) || /\/(cart|checkout|account|search|policies|challenge)(\/|$)/i.test(u.pathname))
                return;
            if (!found.has(u.href) && found.size < 600)
                found.set(u.href, { url: u.href, title: title.slice(0, 160) || decodeURIComponent(u.pathname), kind: pageKind(u.href), source });
        }
        catch { }
    };
    add(home.url, textContent(tokenizeHtml(home.body).find(t => t.name === "title")?.text ?? ""), "input");
    for (const t of tokenizeHtml(home.body))
        if (t.name === "a" && t.attrs.href)
            add(t.attrs.href, textContent(t.text), "link");
    const maps = [...new Set([`${new URL(home.url).origin}/sitemap.xml`, ...policy.sitemaps])];
    for (let i = 0; i < Math.min(6, maps.length); i++) {
        if (options.quick && [...found.values()].some(p => p.kind === "pdp") && [...found.values()].some(p => p.kind === "collection"))
            break;
        const map = await readPublic(maps[i]).catch(() => null);
        if (!map || map.status !== 200)
            continue;
        const locations = [...map.body.matchAll(/<loc\b[^>]*>([^<]+)<\/loc>/gi)].map(m => m[1].trim());
        if (/<sitemapindex\b/i.test(map.body))
            for (const location of locations.slice(0, 6)) {
                try {
                    const u = publicUrl(location, map.url);
                    if (u.hostname.replace(/^www\./, "") === finalHost && !maps.includes(u.href))
                        maps.push(u.href);
                }
                catch { }
            }
        else
            for (const location of locations)
                add(location, "", "sitemap");
    }
    return [...found.values()];
}
export async function requestEvidenceResource(input: string): Promise<{
    status: number;
    headers: Record<string, string>;
    body: Buffer;
}> {
    const u = publicUrl(input), host = u.hostname.replace(/^\[|\]$/g, "");
    let dnsTimer: ReturnType<typeof setTimeout> | undefined;
    const answers = await Promise.race([dns.lookup(host, { all: true, verbatim: true }), new Promise<never>((_, reject) => { dnsTimer = setTimeout(() => reject(new Error("DNS deadline exceeded")), 8000); })]).finally(() => clearTimeout(dnsTimer));
    if (!answers.length || answers.some(a => !isPublicAddress(a.address)))
        throw new Error("Non-public network address blocked.");
    const a = answers[0];
    return new Promise((resolve, reject) => {
        const req = (u.protocol === "https:" ? https : http).request(u, {
            agent: false, family: a.family, headers: { "user-agent": "MercaturaSeoBot/1.0", "accept-encoding": "identity", accept: "*/*" },
            lookup: ((_h: string, _o: unknown, cb: (e: null, address: string, family: number) => void) => cb(null, a.address, a.family)) as never,
        }, res => {
            const chunks: Buffer[] = [];
            let size = 0;
            res.on("data", (b: Buffer) => { size += b.length; if (size > 8000000)
                req.destroy(new Error("Resource exceeds 8 MB."));
            else
                chunks.push(b); });
            res.on("error", reject);
            res.on("end", () => {
                try {
                    let body: Buffer = Buffer.concat(chunks);
                    const coding = res.headers["content-encoding"];
                    if (coding === "gzip")
                        body = gunzipSync(body, { maxOutputLength: 8000000 });
                    else if (coding === "br")
                        body = brotliDecompressSync(body, { maxOutputLength: 8000000 });
                    else if (coding === "deflate")
                        body = inflateSync(body, { maxOutputLength: 8000000 });
                    const headers: Record<string, string> = {};
                    for (const key of ["content-type", "location", "access-control-allow-origin"])
                        if (typeof res.headers[key] === "string")
                            headers[key] = res.headers[key] as string;
                    resolve({ status: res.statusCode ?? 502, headers, body });
                }
                catch (error) {
                    reject(error);
                }
            });
        });
        const timer = setTimeout(() => req.destroy(new Error("Resource deadline exceeded.")), 12000);
        req.on("close", () => clearTimeout(timer));
        req.on("error", reject);
        req.end();
    });
}
export async function captureEvidence(input: string, options: {
    brandId?: string;
    signal?: AbortSignal;
    force?: boolean;
} = {}): Promise<PageEvidence> {
    if (options.signal?.aborted)
        throw options.signal.reason ?? new Error("Capture cancelled.");
    const url = normalize(input), id = randomUUID();
    const robots = await readPublic(`${new URL(url).origin}/robots.txt`).catch(() => null);
    if (!robotsAllows(url, parseRobots(robots?.status === 200 ? robots.body : "")))
        throw new Error("This page is excluded by the site's robots policy.");
    const policy = "readonly-mobile390-desktop1440-v2", sha = (value: string) => createHash("sha256").update(value).digest("hex");
    const documentResponse = await readPublic(url);
    if (documentResponse.status >= 400)
        throw new Error(`Storefront returned HTTP ${documentResponse.status}.`);
    const documentSha256 = sha(documentResponse.body), revalidatedAt = new Date().toISOString(), cacheKey = sha(JSON.stringify({ brandId: options.brandId, url, policy })), cacheFile = path.join(folder(), `cache-${cacheKey}.json`);
    if (options.brandId && !options.force) {
        try {
            const cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
            const previous = getEvidence(cache.id);
            if (cache.policy === policy && cache.documentSha256 === documentSha256 && previous?.brandId === options.brandId && previous.requestedUrl === url && previous.url === documentResponse.url && Date.now() - Date.parse(previous.capturedAt) >= 0 && Date.now() - Date.parse(previous.capturedAt) < 600000 && [previous.mobile.shot, previous.desktop.shot].every(shot => { const file = path.join(env.DATA_DIR, "assets", shot); return fs.existsSync(file) && cache.shots?.[shot] === createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }))
                return { ...previous, freshness: { mode: "reused_historical", revalidatedAt, documentSha256, policy, limitation: "HTML was revalidated; screenshots are historical. Dynamic state and remote image changes are unverified." }, warnings: [...previous.warnings, `Reused capture from ${previous.capturedAt}; HTML revalidated ${revalidatedAt}. Dynamic state and remote image freshness remain unknown.`] };
        }
        catch { }
    }
    const browser = await launchBrowser({ signal: options.signal });
    const deadline = setTimeout(() => { void browser.close().catch(() => { }); }, 180000);
    const warnings = new Set<string>();
    const assets = path.join(env.DATA_DIR, "assets", "cro");
    fs.mkdirSync(assets, { recursive: true });
    const evidence: PageEvidence = { id, brandId: options.brandId, freshness: { mode: "captured", revalidatedAt, documentSha256, policy, limitation: "One captured state; inventory, dynamic purchase state and future remote changes remain unverified." }, requestedUrl: url, url, title: "", capturedAt: new Date().toISOString(), desktop: { shot: "", width: 1440, height: 0, sections: [] }, mobile: { shot: "", width: 390, height: 0, sections: [] }, images: [], links: [], warnings: [] };
    try {
        for (const device of ["mobile", "desktop"] as const) {
            const width = device === "mobile" ? 390 : 1440;
            const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, isMobile: device === "mobile", serviceWorkers: "block", acceptDownloads: false });
            await ctx.addInitScript("globalThis.__name = (value) => value;");
            let count = 0;
            const started = Date.now(), resources = resourceLedger();
            await ctx.routeWebSocket("**/*", ws => ws.close());
            await ctx.route("**/*", async (route) => {
                const request = route.request(), record = resources.begin(request.resourceType());
                try {
                    const limited = ++count > 260 || Date.now() - started > 60000;
                    if (request.method() !== "GET" || limited || ["media", "websocket"].includes(request.resourceType())) {
                        record("excluded", undefined, limited);
                        await route.abort();
                        return;
                    }
                    const r = await requestEvidenceResource(request.url());
                    await route.fulfill({ status: r.status, headers: r.headers, body: r.body });
                    record("received", r.status);
                }
                catch {
                    record("blocked");
                    warnings.add("Some resources could not load or were blocked by public-network and resource limits.");
                    await route.abort().catch(() => { });
                }
            });
            const page = await ctx.newPage();
            page.on("popup", p => { void p.close(); });
            page.on("dialog", d => { void d.dismiss(); });
            const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
            if (response && response.status() >= 400)
                throw new Error(`Storefront returned HTTP ${response.status()}.`);
            await page.waitForTimeout(1500);
            await page.addStyleTag({ content: "html,body,* { scroll-behavior: auto !important; }" });
            const dismiss = page.locator('button[aria-label="Close" i], button[aria-label="Close modal" i], button[aria-label="Close dialog" i], button[aria-label="Close popup" i], button[title="Close" i]');
            for (let i = 0; i < Math.min(3, await dismiss.count()); i++)
                if (await dismiss.nth(i).isVisible()) {
                    await dismiss.nth(i).click({ timeout: 1000 }).catch(() => { });
                    warnings.add(`${device}: an explicitly labelled Close control was used to dismiss an overlay before the reference capture.`);
                }
            await page.keyboard.press("Escape");
            await page.evaluate(async () => { const bottom = Math.min(document.documentElement.scrollHeight, 30000); for (let y = 0; y < bottom; y += 850) {
                scrollTo(0, y);
                await new Promise(r => setTimeout(r, 90));
            } scrollTo(0, 0); await document.fonts.ready; });
            await page.waitForTimeout(350);
            if (!/^https?:\/\//i.test(page.url()))
                throw new Error("The browser reached an error page instead of the storefront.");
            const data = await page.evaluate(() => {
                const visible = (el: Element) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.height > 10 && r.width > 10 && s.display !== "none" && s.visibility !== "hidden"; };
                const text = (el: Element) => (el as HTMLElement).innerText?.replace(/\s+/g, " ").trim() ?? "";
                const image = (i: HTMLImageElement) => ({ url: i.currentSrc || i.src, alt: i.alt, width: i.naturalWidth || i.width, height: i.naturalHeight || i.height });
                let nodes = [...document.querySelectorAll("header,main section,article > section,.shopify-section,footer")].filter(visible);
                nodes = nodes.filter(el => !nodes.some(other => other !== el && other.contains(el)));
                if (nodes.length < 3)
                    nodes = [...document.querySelectorAll("header,main > div,main > article,footer")].filter(visible);
                if (nodes.length < 3)
                    nodes = [...document.body.children].filter(el => visible(el) && !/SCRIPT|STYLE|NOSCRIPT/.test(el.tagName));
                for (let depth = 0; depth < 4; depth++)
                    nodes = nodes.flatMap(el => {
                        const rect = el.getBoundingClientRect();
                        if (rect.height < 1800 || /HEADER|FOOTER/.test(el.tagName))
                            return [el];
                        const children = [...el.children].filter(x => visible(x) && x.getBoundingClientRect().height > 140);
                        if (children.length === 1 && children[0].getBoundingClientRect().height > rect.height * .8)
                            return children;
                        const heights = children.reduce((n, x) => n + x.getBoundingClientRect().height, 0);
                        const tops = new Set(children.map(x => Math.round(x.getBoundingClientRect().top / 100)));
                        return children.length >= 2 && tops.size >= 2 && heights > rect.height * .7 && heights < rect.height * 1.3 ? children : [el];
                    });
                const sections = nodes.slice(0, 60).map((el, i) => {
                    const r = el.getBoundingClientRect(), css = getComputedStyle(el), heading = el.querySelector("h1,h2,h3");
                    const clone = el.cloneNode(true) as Element;
                    clone.querySelectorAll("script,style,iframe,object,embed,input,textarea").forEach(x => x.remove());
                    for (const node of [clone, ...clone.querySelectorAll("*")])
                        for (const attr of [...node.attributes])
                            if (/^on/i.test(attr.name) || /^(srcdoc|nonce)$/i.test(attr.name))
                                node.removeAttribute(attr.name);
                    return { id: `section-${i + 1}`, title: heading ? text(heading).slice(0, 180) : `${el.tagName.toLowerCase()} ${i + 1}`, text: text(el).slice(0, 6000), top: Math.round(r.top + scrollY), height: Math.round(r.height), html: clone.outerHTML.slice(0, 16000), styles: { background: css.backgroundColor, color: css.color, fontFamily: css.fontFamily, fontSize: css.fontSize, padding: css.padding, display: css.display, gap: css.gap, borderRadius: css.borderRadius, gridTemplateColumns: css.gridTemplateColumns, headingFont: heading ? getComputedStyle(heading).fontFamily : "", headingSize: heading ? getComputedStyle(heading).fontSize : "" }, images: [...el.querySelectorAll("img")].map(image).filter(x => /^https?:/.test(x.url)).slice(0, 30) };
                });
                const gallery = [...document.querySelectorAll<HTMLImageElement>("media-gallery img, product-gallery img, [class*='product__media'] img, [class*='product-gallery'] img, [data-product-gallery] img, [id*='ProductGallery'] img")].map(image).filter(x => /^https?:/.test(x.url));
                return { title: document.title, height: document.documentElement.scrollHeight, sections, gallery, images: [...document.images].map(image).filter(x => /^https?:/.test(x.url)).slice(0, 160), links: [...document.querySelectorAll("a[href]")].map(a => ({ url: (a as HTMLAnchorElement).href, text: text(a).slice(0, 120) })).filter(x => /^https?:/.test(x.url)).slice(0, 300), overlays: [...document.querySelectorAll("body *")].filter(el => { const r = el.getBoundingClientRect(); return visible(el) && getComputedStyle(el).position === "fixed" && r.width * r.height > innerWidth * innerHeight * .3; }).length };
            });
            if (!data.sections.length || /just a moment|checking your browser|access denied|verify you are human/i.test(data.title))
                throw new Error("The storefront returned an access gate rather than a usable page.");
            const controls = await page.evaluate(collectVisibleControls, data.sections.map(({ id, top, height }) => ({ id, top, height })));
            if (data.height > 30000)
                warnings.add(`${device}: screenshot limited to 30,000 pixels; source page is ${data.height} pixels tall.`);
            if (data.overlays)
                warnings.add(`${device}: an overlay covers part of the page. Screenshot preserves the observed state.`);
            const height = Math.min(data.height, 30000), shot = `cro/${id}-${device}.png`;
            await page.screenshot({ path: path.join(env.DATA_DIR, "assets", shot), fullPage: true, clip: { x: 0, y: 0, width, height }, animations: "disabled", timeout: 15000 });
            const pixels = await sharp(path.join(env.DATA_DIR, "assets", shot)).metadata();
            if ((pixels.height ?? 0) < Math.min(height, 900) || (pixels.width ?? 0) !== width)
                throw new Error("The browser screenshot did not match the requested page dimensions.");
            if ((pixels.height ?? 0) < height - 10)
                warnings.add(`${device}: screenshot is ${pixels.height}px high, shorter than the measured ${height}px page.`);
            const resourceSnapshot = resources.snapshot();
            if (resourceSnapshot.httpErrors || resourceSnapshot.excluded || resourceSnapshot.truncated || resourceSnapshot.pending)
                warnings.add(`${device}: some requests failed, were excluded by read-only capture policy, reached capture limits, or were still pending. Dynamic behavior and asset availability require normal-browser verification.`);
            evidence[device] = { shot, width, height: pixels.height ?? height, sections: data.sections, inspection: { mode: "read_only", documentHeight: data.height, viewportHeight: 900, controls: controls.controls, controlsTruncated: controls.truncated, resources: resourceSnapshot } };
            evidence.title = data.title;
            evidence.url = page.url();
            evidence.images.push(...data.images);
            evidence.links.push(...data.links);
            evidence.gallery = [...evidence.gallery ?? [], ...data.gallery];
            await ctx.close();
        }
    }
    finally {
        clearTimeout(deadline);
        await browser.close();
    }
    evidence.images = [...new Map(evidence.images.map(i => [i.url, i])).values()];
    evidence.gallery = [...new Map((evidence.gallery ?? []).map(i => [i.url, i])).values()];
    evidence.links = [...new Map(evidence.links.map(i => [i.url, i])).values()];
    evidence.warnings = [...warnings];
    if (!evidenceIsUsable(evidence))
        throw new Error("The browser reached an error page instead of the storefront.");
    fs.mkdirSync(folder(), { recursive: true });
    fs.writeFileSync(path.join(folder(), `${id}.json`), JSON.stringify(evidence));
    if (options.brandId)
        fs.writeFileSync(cacheFile, JSON.stringify({ id, documentSha256, policy, shots: Object.fromEntries([evidence.mobile.shot, evidence.desktop.shot].map(shot => [shot, createHash("sha256").update(fs.readFileSync(path.join(env.DATA_DIR, "assets", shot))).digest("hex")])) }));
    return evidence;
}
