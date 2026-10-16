import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { createHash } from "node:crypto";
import type { SeoAudit, SeoCategory, SeoCheck, SeoContext, SeoFinding, SeoPage, SeoReadiness, SeoSnapshot } from "./model";
import type { LiveCrawlMetadata, LivePageEvidence } from "./live-types";
import { decodeHtml, textContent, tokenizeHtml } from "./html";
import { classifyAuditPage, classifyAuditUrl, coreProducts } from "./scope";
import { searchBots } from "./answer-research-data";
const USER_AGENT = "MercaturaSeoBot/1.0";
const TIMEOUT = 12000;
const MAX_BYTES = 2000000;
const id = (url: string) => createHash("sha256").update(url).digest("hex").slice(0, 16);
export type PageResponse = {
    url: string;
    status: number;
    headers: Record<string, string>;
    body: string;
    bytes: number;
    durationMs: number;
};
export type CrawlTransport = (url: string) => Promise<PageResponse>;
type Rule = {
    allow: boolean;
    path: string;
};
export type RobotsPolicy = {
    rules: Rule[];
    sitemaps: string[];
    delayMs: number;
};
export function isPublicAddress(address: string): boolean {
    const value = address.replace(/^\[|\]$/g, "").toLowerCase();
    if (isIP(value) === 4) {
        const [a, b, c] = value.split(".").map(Number);
        return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
            || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99)))
            || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
    }
    if (isIP(value) !== 6)
        return false;
    const first = parseInt(value.split(":")[0], 16);
    return first >= 0x2000 && first <= 0x3fff && !/^2001:(?:0*:|0?db8:|0?10:|0?20:)/i.test(value) && !value.startsWith("2002:");
}
export function publicUrl(input: string, base?: string): URL {
    const url = new URL(input, base);
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port))
        || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || !host.includes(".") && !isIP(host)
        || isIP(host) && !isPublicAddress(host))
        throw new Error("Only public HTTP(S) storefront addresses on standard ports can be audited.");
    url.hash = "";
    return url;
}
export async function requestPublicPage(input: string): Promise<PageResponse> {
    const url = publicUrl(input), started = Date.now(), host = url.hostname.replace(/^\[|\]$/g, "");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const answers = await Promise.race([
        dns.lookup(host, { all: true, verbatim: true }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("DNS lookup timed out.")), TIMEOUT); }),
    ]).finally(() => clearTimeout(timer));
    if (!answers.length || answers.some((answer) => !isPublicAddress(answer.address)))
        throw new Error("The storefront resolved to a non-public address; request blocked.");
    const address = answers[0];
    return new Promise((resolve, reject) => {
        const req = (url.protocol === "https:" ? https : http).request(url, {
            method: "GET", agent: false, family: address.family,
            headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,application/xml,text/xml,text/plain;q=0.8", "accept-encoding": "identity" },
            lookup: ((_hostname: string, _options: unknown, callback: (err: null, address: string, family: number) => void) => callback(null, address.address, address.family)) as never,
        }, (res) => {
            const chunks: Buffer[] = [];
            let bytes = 0;
            const contentLength = Number(res.headers["content-length"] ?? 0);
            if (contentLength > MAX_BYTES) {
                req.destroy(new Error("Response exceeds the 2 MB source limit."));
                return;
            }
            if (res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity") {
                req.destroy(new Error("The server returned compressed content despite an identity request; source was not inspected."));
                return;
            }
            res.on("data", (chunk: Buffer) => {
                bytes += chunk.length;
                if (bytes > MAX_BYTES)
                    req.destroy(new Error("Response exceeds the 2 MB source limit."));
                else
                    chunks.push(chunk);
            });
            res.on("error", reject);
            res.on("end", () => {
                const headers = Object.fromEntries(Object.entries(res.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : value ?? ""]));
                resolve({ url: url.href, status: res.statusCode ?? 0, headers, body: Buffer.concat(chunks).toString("utf8"), bytes, durationMs: Date.now() - started });
            });
        });
        const deadline = setTimeout(() => req.destroy(new Error("Storefront request timed out after 12 seconds.")), TIMEOUT);
        req.on("close", () => clearTimeout(deadline));
        req.on("error", reject);
        req.end();
    });
}
export function parseRobots(body: string, userAgent = USER_AGENT): RobotsPolicy {
    const groups: {
        agents: string[];
        rules: Rule[];
        delayMs: number;
    }[] = [];
    const sitemaps: string[] = [];
    let group: typeof groups[number] | undefined, hasRules = false;
    for (const raw of body.split(/\r?\n/)) {
        const line = raw.replace(/#.*$/, "").trim(), colon = line.indexOf(":");
        if (colon < 0)
            continue;
        const key = line.slice(0, colon).trim().toLowerCase(), value = line.slice(colon + 1).trim();
        if (key === "sitemap") {
            if (value)
                sitemaps.push(value);
            continue;
        }
        if (key === "user-agent") {
            if (!group || hasRules) {
                group = { agents: [], rules: [], delayMs: 0 };
                groups.push(group);
                hasRules = false;
            }
            group.agents.push(value.toLowerCase());
        }
        else if (group && (key === "allow" || key === "disallow")) {
            hasRules = true;
            if (value)
                group.rules.push({ allow: key === "allow", path: value });
        }
        else if (group && key === "crawl-delay") {
            hasRules = true;
            const seconds = Number(value);
            if (Number.isFinite(seconds) && seconds > 0)
                group.delayMs = seconds * 1000;
        }
    }
    const specificity = (g: typeof groups[number]) => Math.max(0, ...g.agents.filter(agent => agent !== "*" && userAgent.toLowerCase().startsWith(agent)).map(agent => agent.length));
    const longest = Math.max(0, ...groups.map(specificity));
    const selected = longest ? groups.filter(g => specificity(g) === longest) : groups.filter(g => g.agents.includes("*"));
    return { rules: selected.flatMap((g) => g.rules), sitemaps, delayMs: Math.max(0, ...selected.map((g) => g.delayMs)) };
}
export function robotsAllows(url: string, policy: RobotsPolicy): boolean {
    const parsed = new URL(url), path = parsed.pathname + parsed.search;
    let best = -1, allow = true;
    for (const rule of policy.rules) {
        const expression = rule.path.split("*").map((part) => part.replace(/[.+?^{}()|[\]\\]/g, "\\$&")).join(".*");
        const length = rule.path.replace(/[*$]/g, "").length;
        if (new RegExp(`^${expression}`).test(path) && (length > best || length === best && rule.allow)) {
            best = length;
            allow = rule.allow;
        }
    }
    return allow;
}
const relevant = (url: URL) => !/^\/(?:cart|checkout|checkouts|account|search|challenge|apps|admin|orders|password)(?:\/|$)/i.test(url.pathname)
    && !/\.(?:jpe?g|png|gif|webp|avif|svg|ico|css|js|json|pdf|zip|mp4|woff2?|xml|txt)$/i.test(url.pathname);
const normal = (url: string) => { const u = new URL(url); u.hash = ""; return u.href; };
const rootEquivalent = (a: string, b: string) => {
    const x = new URL(a), y = new URL(b);
    return x.hostname.replace(/^www\./, "") === y.hostname.replace(/^www\./, "") && !(x.protocol === "https:" && y.protocol === "http:");
};
const urlFrom = (value: string, base: string) => { try {
    return publicUrl(value, base).href;
}
catch {
    return null;
} };
function emptyPage(url: string, ctx: SeoContext, error?: string): SeoPage {
    const path = new URL(url).pathname;
    const focus = classifyAuditUrl(ctx, url);
    const product = ctx.products.find((p) => p.url && urlFrom(p.url, url) === url);
    return { mode: "live", id: id(url), url, kind: focus.included ? focus.kind as SeoPage["kind"] : /\/products\//.test(path) ? "pdp" : /\/collections\//.test(path) ? "collection" : "page",
        productId: product?.id ?? null, intendedIndexable: !/\/(?:policies|pages\/(?:privacy|terms))\//.test(path), statusCode: null, robotsAllowed: null, noindex: null,
        canonical: null, expectedCanonical: url, incomingLinks: null, title: null, description: null, h1: null, contentSections: null, answeredQuestions: null, expectedQuestions: [],
        proofClaimIds: null, visiblePrice: null, schemaPrice: null, visibleAvailability: null, schemaAvailability: null,
        live: { requestedUrl: url, fetchedAt: new Date().toISOString(), durationMs: 0, bytes: 0, contentType: "", error, htmlInspected: false,
            h1Count: 0, canonicalCount: 0, canonicalRaw: [], headings: [], wordCount: 0, links: [], imageCount: 0, imagesMissingAlt: 0,
            schemaTypes: [], invalidJsonLd: 0, otherStructuredData: false, productSchema: [], policyLinks: { shipping: false, returns: false, contact: false }, questionHeadings: [], answeredQuestionCount: 0,
            robotsDirectives: [], inSitemap: false, externalSourceLinks: 0 } };
}
export function parseLivePage(response: PageResponse, ctx: SeoContext, requestedUrl = response.url): SeoPage {
    const page = emptyPage(response.url, ctx), e = page.live!;
    Object.assign(e, { requestedUrl, fetchedAt: new Date().toISOString(), durationMs: response.durationMs, bytes: response.bytes, contentType: response.headers["content-type"] ?? "" });
    e.responseHeaders = Object.fromEntries(["content-type", "x-robots-tag", "content-security-policy", "content-security-policy-report-only", "strict-transport-security", "x-content-type-options", "referrer-policy", "x-frame-options"].flatMap((key) => response.headers[key] ? [[key, response.headers[key].slice(0, 3000)]] : []));
    page.statusCode = response.status;
    page.robotsAllowed = true;
    if (response.status < 200 || response.status >= 300 || !/(?:text\/html|application\/xhtml\+xml)/i.test(e.contentType)) {
        e.error = response.status >= 200 && response.status < 300 ? "The response is not HTML; page content was not inspected." : `HTTP ${response.status}; page content was not inspected.`;
        return page;
    }
    const html = response.body, tags = tokenizeHtml(html);
    e.htmlInspected = true;
    e.sourceHash = createHash("sha256").update(html).digest("hex");
    e.sourceSamples = [];
    const sample = (ruleId: string, selected: typeof tags) => {
        for (const tag of selected.slice(0, 3))
            e.sourceSamples!.push({ ruleId, line: html.slice(0, tag.start).split("\n").length, code: html.slice(tag.start, Math.min(tag.end, tag.start + 1400)) + (tag.end - tag.start > 1400 ? "\n[excerpt truncated]" : "") });
    };
    sample("SEO-TITLE", tags.filter((t) => t.name === "title"));
    sample("SEO-DESCRIPTION", tags.filter((t) => t.name === "meta" && t.attrs.name?.toLowerCase() === "description"));
    sample("SEO-HEADING", tags.filter((t) => t.name === "h1"));
    sample("SEO-CANONICAL", tags.filter((t) => t.name === "link" && t.attrs.rel?.toLowerCase().split(/\s+/).includes("canonical")));
    const insertionAnchors = [
        ["SEO-TITLE", tags.some((t) => t.name === "title"), "head"],
        ["SEO-DESCRIPTION", tags.some((t) => t.name === "meta" && t.attrs.name?.toLowerCase() === "description"), "head"],
        ["SEO-CANONICAL", tags.some((t) => t.name === "link" && t.attrs.rel?.toLowerCase().split(/\s+/).includes("canonical")), "head"],
        ["SEO-HEADING", tags.some((t) => t.name === "h1"), "main"],
    ] as const;
    for (const [rule, present, anchor] of insertionAnchors)
        if (!present)
            sample(rule, tags.filter((t) => t.name === anchor).slice(0, 1));
    sample("SEO-INDEX", tags.filter((t) => t.name === "meta" && /^(robots|googlebot)$/i.test(t.attrs.name ?? "")));
    sample("SEO-IMAGE-ALT", tags.filter((t) => t.name === "img" && !("alt" in t.attrs)));
    const structured = tags.filter((t) => t.name === "script" && t.attrs.type?.toLowerCase().split(";")[0].trim() === "application/ld+json");
    sample("SEO-JSONLD", structured.filter((t) => { try {
        JSON.parse(t.text);
        return false;
    }
    catch {
        return true;
    } }));
    sample("SEO-PRODUCT-SCHEMA", structured.filter((t) => /Product|Offer/.test(t.text)));
    sample("SEO-BREADCRUMB", structured.filter((t) => /BreadcrumbList/.test(t.text)));
    sample("AEO-ANSWERS", tags.filter((t) => /^h[1-6]$/.test(t.name) || t.name === "summary"));
    sample("AEO-POLICIES", tags.filter((t) => t.name === "a" && /shipping|delivery|returns?|refund|contact|support/i.test(`${t.attrs.href} ${t.text}`)));
    const insecureTags = tags.filter((t) => /^(script|img|iframe|video|audio|source)$/.test(t.name) && /^http:\/\//i.test(t.attrs.src ?? "") || t.name === "link" && /stylesheet/i.test(t.attrs.rel ?? "") && /^http:\/\//i.test(t.attrs.href ?? ""));
    e.insecureResources = insecureTags.slice(0, 50).map((t) => ({ tag: t.name, url: (t.attrs.src ?? t.attrs.href).slice(0, 2000) }));
    sample("SECURITY-MIXED-CONTENT", insecureTags);
    e.otherStructuredData = tags.some((tag) => "itemscope" in tag.attrs || "itemtype" in tag.attrs || "typeof" in tag.attrs || "vocab" in tag.attrs);
    const meta = (name: string) => tags.find((tag) => tag.name === "meta" && tag.attrs.name?.toLowerCase() === name)?.attrs.content ?? "";
    const baseTag = tags.find((tag) => tag.name === "base" && tag.attrs.href);
    const base = baseTag ? urlFrom(baseTag.attrs.href, page.url) ?? page.url : page.url;
    page.title = textContent(tags.find((tag) => tag.name === "title")?.text ?? "").slice(0, 500);
    page.description = meta("description").slice(0, 1000);
    const headingTags = tags.filter((tag) => /^h[1-6]$/.test(tag.name));
    const headings = headingTags.map((tag) => textContent(tag.text)).filter(Boolean);
    const h1 = tags.filter((tag) => tag.name === "h1");
    page.h1 = h1.map((tag) => textContent(tag.text)).filter(Boolean).join(" | ").slice(0, 1000);
    e.h1Count = h1.length;
    e.headings = headings.slice(0, 80);
    page.contentSections = headings.slice(0, 80);
    const main = /<(main|article)\b[^>]*>([\s\S]*?)<\/\1\s*>/i.exec(html);
    const contentRegion = (main?.[2] ?? html).replace(/<(nav|header|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
    e.contentText = tokenizeHtml(contentRegion).filter((t) => /^(p|li|dd)$/.test(t.name)).map((t) => textContent(t.text)).filter((s) => s.length >= 40).join("\n").slice(0, 4800);
    e.contentScope = main ? "First main/article region; readable paragraph/list text, navigation/header/footer excluded where explicit; first 4,800 characters." : "No explicit main/article region; readable paragraph/list text from source with explicit navigation/header/footer excluded; first 4,800 characters. Boilerplate may remain.";
    const canonicalTags = tags.filter((tag) => tag.name === "link" && tag.attrs.rel?.toLowerCase().split(/\s+/).includes("canonical"));
    e.canonicalRaw = canonicalTags.map((tag) => tag.attrs.href ?? "");
    e.canonicalCount = canonicalTags.length;
    page.canonical = canonicalTags[0]?.attrs.href?.trim() ? urlFrom(canonicalTags[0].attrs.href.trim(), base) : "";
    e.robotsDirectives = [...tags.filter((tag) => tag.name === "meta" && ["robots", "googlebot"].includes(tag.attrs.name?.toLowerCase())).map((tag) => tag.attrs.content ?? ""), response.headers["x-robots-tag"] ?? ""].filter(Boolean);
    page.noindex = e.robotsDirectives.some((s) => /(?:^|[\s,:])(?:noindex|none)(?:$|[\s,;])/i.test(s));
    const seen = new Set<string>();
    e.links = tags.filter((tag) => tag.name === "a" && tag.attrs.href).flatMap((tag) => {
        const url = urlFrom(tag.attrs.href, base);
        if (!url || seen.has(url))
            return [];
        seen.add(url);
        return [{ url, text: textContent(tag.text).slice(0, 200) }];
    }).slice(0, 2000);
    const imgs = tags.filter((tag) => tag.name === "img");
    e.imageCount = imgs.length;
    e.imagesMissingAlt = imgs.filter((tag) => !("alt" in tag.attrs)).length;
    e.wordCount = textContent(html).split(/\s+/).filter(Boolean).length;
    e.questionHeadings = [...headingTags, ...tags.filter((tag) => tag.name === "summary")].filter((tag) => /\?|^(?:what|why|how|when|where|who|can|does|is|are)\b/i.test(textContent(tag.text)))
        .map((tag) => textContent(tag.text).slice(0, 200)).filter(Boolean).slice(0, 60);
    e.answeredQuestionCount = [...headingTags, ...tags.filter((tag) => tag.name === "summary")].filter((tag) => {
        if (!e.questionHeadings.includes(textContent(tag.text).slice(0, 200)))
            return false;
        const after = html.slice(tag.end, tag.end + 3000).split(/<h[1-6]\b|<summary\b/i)[0];
        return textContent(after).length >= 40;
    }).length;
    page.answeredQuestions = e.questionHeadings;
    for (const link of e.links) {
        if (new URL(link.url).origin !== new URL(page.url).origin) {
            e.externalSourceLinks++;
            continue;
        }
        const hint = `${new URL(link.url).pathname} ${link.text}`;
        e.policyLinks.shipping ||= /shipping|delivery/i.test(hint);
        e.policyLinks.returns ||= /returns?|refund/i.test(hint);
        e.policyLinks.contact ||= /contact|support|help[- /]?center/i.test(hint);
    }
    const nodes: Record<string, unknown>[] = [];
    const walk = (value: unknown, depth = 0) => {
        if (!value || depth > 20 || nodes.length > 3000)
            return;
        if (Array.isArray(value)) {
            value.forEach((entry) => walk(entry, depth + 1));
            return;
        }
        if (typeof value !== "object")
            return;
        const obj = value as Record<string, unknown>;
        nodes.push(obj);
        Object.values(obj).forEach((entry) => { if (entry && typeof entry === "object")
            walk(entry, depth + 1); });
    };
    for (const script of tags.filter((tag) => tag.name === "script" && tag.attrs.type?.toLowerCase().split(";")[0].trim() === "application/ld+json")) {
        try {
            walk(JSON.parse(script.text));
        }
        catch {
            e.invalidJsonLd++;
        }
    }
    const types = (node: Record<string, unknown>) => [node["@type"]].flat().filter((t): t is string => typeof t === "string").map((t) => t.replace(/^https?:\/\/schema.org\//, ""));
    e.schemaTypes = [...new Set(nodes.flatMap(types))].slice(0, 100);
    e.productSchema = nodes.filter((node) => types(node).includes("Product")).map((product) => {
        const offers = [product.offers].flat().filter((offer): offer is Record<string, unknown> => Boolean(offer) && typeof offer === "object");
        const has = (field: string) => offers.some((offer) => offer[field] !== undefined && offer[field] !== "");
        return { name: typeof product.name === "string" ? product.name.slice(0, 200) : "", image: Boolean(product.image), offers: offers.length > 0,
            price: has("price") || has("lowPrice"), currency: has("priceCurrency"), availability: has("availability") };
    });
    e.productOffers = nodes.filter((node) => types(node).includes("Product")).flatMap((product) => [product.offers].flat().filter((offer): offer is Record<string, unknown> => Boolean(offer) && typeof offer === "object").map((offer) => ({
        name: typeof product.name === "string" ? product.name.slice(0, 200) : "", sku: typeof product.sku === "string" ? product.sku.slice(0, 100) : "",
        price: typeof offer.price === "number" || typeof offer.price === "string" ? String(offer.price).slice(0, 30) : "", currency: typeof offer.priceCurrency === "string" ? offer.priceCurrency.slice(0, 10) : "",
        availability: typeof offer.availability === "string" ? offer.availability.replace(/^https?:\/\/schema.org\//, "").slice(0, 40) : "",
    }))).slice(0, 100);
    return page;
}
export async function buildLiveSnapshot(ctx: SeoContext, options: {
    maxPages?: number;
    maxDurationMs?: number;
    transport?: CrawlTransport;
    requestSpacingMs?: number;
} = {}): Promise<SeoSnapshot> {
    if (!ctx.websiteUrl?.trim())
        throw new Error("Add the brand's storefront website in the shared Brand Brain before running an audit.");
    const startUrl = publicUrl(/^https?:\/\//i.test(ctx.websiteUrl) ? ctx.websiteUrl : `https://${ctx.websiteUrl}`);
    const started = Date.now(), budget = Math.max(1000, Math.min(options.maxDurationMs ?? 120000, 180000));
    const maxPages = Math.max(1, Math.min(options.maxPages ?? 60, 250));
    const transport = options.transport ?? requestPublicPage;
    const crawl: LiveCrawlMetadata = { websiteUrl: startUrl.href, finalOrigin: startUrl.origin, startedAt: new Date(started).toISOString(), completedAt: "",
        maxPages, crawledPages: 0, discoveredUrls: 0, limited: false, robotsUrl: `${startUrl.origin}/robots.txt`, robotsStatus: null,
        sitemaps: [], errors: [], limits: ["Public server HTML only; JavaScript-rendered content, search indexing, traffic, keyword demand and AI engine responses are not measured.",
            `At most ${maxPages} HTML URLs, 12 sitemap documents, 3 concurrent requests, 2 MB per response and ${Math.round(budget / 1000)} seconds.`,
            "Incoming links and duplicates describe only the sampled pages. A readiness score is not a ranking or AI visibility score.",
            "Page fetching uses MercaturaSeoBot. Separate bot access rows evaluate sampled robots policies only; CDN access, actual crawler identity, indexing and visibility remain unmeasured."] };
    const pages: SeoPage[] = [], queue: string[] = [], discovered = new Set<string>(), sitemapUrls = new Set<string>();
    const policies = new Map<string, RobotsPolicy>();
    const botPolicies = new Map<string, {
        body: string;
        robotsUrl: string;
        checkedAt: string;
    }>();
    let spacing = options.requestSpacingMs ?? 200, nextStart = Date.now();
    const request = async (url: string) => {
        if (Date.now() - started >= budget)
            throw new Error("Crawl time budget reached.");
        const delay = Math.max(0, nextStart - Date.now());
        nextStart = Math.max(nextStart, Date.now()) + spacing;
        if (delay)
            await new Promise((resolve) => setTimeout(resolve, delay));
        if (Date.now() - started >= budget)
            throw new Error("Crawl time budget reached.");
        return transport(url);
    };
    const readRobots = async (origin: string): Promise<RobotsPolicy> => {
        if (policies.has(origin))
            return policies.get(origin)!;
        let url = `${origin}/robots.txt`, response: PageResponse | undefined;
        for (let redirects = 0; redirects <= 5; redirects++) {
            response = await request(url);
            if (response.status < 300 || response.status >= 400 || !response.headers.location)
                break;
            const next = publicUrl(response.headers.location, url).href;
            if (!rootEquivalent(url, next))
                throw new Error("robots.txt redirected outside the storefront host.");
            url = next;
            response = undefined;
        }
        if (!response)
            throw new Error("Too many robots.txt redirects.");
        crawl.robotsStatus = response.status;
        if (response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500)
            throw new Error(`robots.txt returned HTTP ${response.status}; crawling paused until access can be checked.`);
        const policy = response.status >= 200 && response.status < 300 ? parseRobots(response.body) : { rules: [], sitemaps: [], delayMs: 0 };
        if (response.status >= 200 && response.status < 300 || response.status === 404 || response.status === 410) {
            const captured = { body: response.status < 300 ? response.body : "", robotsUrl: response.url, checkedAt: new Date().toISOString() };
            botPolicies.set(origin, captured);
            botPolicies.set(new URL(response.url).origin, captured);
        }
        if (policy.delayMs > budget)
            throw new Error("The storefront robots crawl-delay exceeds this audit's time budget.");
        spacing = Math.max(spacing, policy.delayMs);
        policies.set(origin, policy);
        policies.set(new URL(response.url).origin, policy);
        return policy;
    };
    const fetchFollowing = async (input: string): Promise<PageResponse> => {
        let url = input;
        for (let redirects = 0; redirects <= 5; redirects++) {
            const parsed = publicUrl(url);
            if (!rootEquivalent(startUrl.href, parsed.href))
                throw new Error("Redirect outside the brand storefront was not followed.");
            const policy = await readRobots(parsed.origin);
            if (!robotsAllows(url, policy))
                throw new Error("URL is disallowed by the storefront robots.txt; not fetched.");
            const response = await request(url);
            if (response.status < 300 || response.status >= 400 || !response.headers.location)
                return response;
            url = publicUrl(response.headers.location, url).href;
        }
        throw new Error("Too many storefront redirects.");
    };
    const enqueue = (raw: string, source: string, inSitemap = false) => {
        let url = urlFrom(raw, source);
        if (!url)
            return;
        if (rootEquivalent(url, crawl.finalOrigin)) {
            const u = new URL(url);
            url = `${crawl.finalOrigin}${u.pathname}${u.search}`;
        }
        const parsed = new URL(url);
        if (parsed.origin !== crawl.finalOrigin || !relevant(parsed) || parsed.search)
            return;
        if (inSitemap)
            sitemapUrls.add(url);
        if (discovered.size >= 5000) {
            crawl.limited = true;
            return;
        }
        if (!discovered.has(url)) {
            discovered.add(url);
            if (classifyAuditUrl(ctx, url).included)
                queue.push(url);
            else
                crawl.excludedUrls = (crawl.excludedUrls ?? 0) + 1;
        }
    };
    const recordError = (url: string, error: unknown) => {
        const message = error instanceof Error ? error.message : "Unable to inspect this URL.";
        crawl.errors.push({ url, message });
        return message;
    };
    try {
        await readRobots(startUrl.origin);
        const home = await fetchFollowing(startUrl.href);
        crawl.finalOrigin = new URL(home.url).origin;
        crawl.robotsUrl = `${crawl.finalOrigin}/robots.txt`;
        const first = parseLivePage(home, ctx, startUrl.href);
        pages.push(first);
        discovered.add(home.url);
        const policy = await readRobots(crawl.finalOrigin);
        coreProducts(ctx).forEach((p) => { if (p.url)
            enqueue(p.url, crawl.finalOrigin); });
        const maps = [...new Set([`${crawl.finalOrigin}/sitemap.xml`, ...policy.sitemaps])];
        const seenMaps = new Set<string>();
        for (let index = 0; index < maps.length && seenMaps.size < 12 && Date.now() - started < budget; index++) {
            const map = urlFrom(maps[index], crawl.finalOrigin);
            if (!map || new URL(map).origin !== crawl.finalOrigin || seenMaps.has(map))
                continue;
            seenMaps.add(map);
            try {
                const result = await fetchFollowing(map);
                const isXml = /<\s*(?:[\w-]+:)?(?:urlset|sitemapindex)\b/i.test(result.body);
                const locations = isXml ? [...result.body.matchAll(/<(?:[\w-]+:)?(?:url|sitemap)\b[^>]*>([^]*?)<\/(?:[\w-]+:)?(?:url|sitemap)\s*>/gi)].flatMap((block) => {
                    const match = block[1].match(/<(?:[\w-]+:)?loc\b[^>]*>([^]*?)<\/(?:[\w-]+:)?loc\s*>/i);
                    return match ? [decodeHtml(match[1].replace(/<!\[CDATA\[([^]*?)\]\]>/g, "$1").trim())] : [];
                }).slice(0, 5000) : [];
                crawl.sitemaps.push({ url: map, status: result.status, urls: locations.length, ...(result.status !== 200 || !isXml ? { error: "No readable sitemap XML at this address." } : {}) });
                if (result.status !== 200 || !isXml)
                    continue;
                if (/<\s*(?:[\w-]+:)?sitemapindex\b/i.test(result.body))
                    maps.push(...locations);
                else
                    locations.forEach((url) => enqueue(url, map, true));
            }
            catch (error) {
                const message = recordError(map, error);
                crawl.sitemaps.push({ url: map, status: null, urls: 0, error: message });
            }
        }
        if (seenMaps.size < maps.length)
            crawl.limited = true;
        first.live?.links.forEach((link) => enqueue(link.url, first.url));
        const catalogueUrls = new Set(coreProducts(ctx).flatMap((p) => p.url && urlFrom(p.url, crawl.finalOrigin) ? [`${crawl.finalOrigin}${new URL(p.url).pathname}${new URL(p.url).search}`] : []));
        queue.sort((a, b) => Number(catalogueUrls.has(b)) - Number(catalogueUrls.has(a)));
        const core = queue.filter((u) => catalogueUrls.has(u));
        const rest = queue.filter((u) => !catalogueUrls.has(u));
        const buckets = [rest.filter((u) => classifyAuditUrl(ctx, u).kind !== "blog"), rest.filter((u) => classifyAuditUrl(ctx, u).kind === "blog")];
        queue.length = 0;
        queue.push(...core);
        while (buckets.some((bucket) => bucket.length))
            for (const bucket of buckets) {
                const url = bucket.shift();
                if (url)
                    queue.push(url);
            }
        const processed = new Set(pages.map((page) => page.url));
        while (queue.length && pages.length < maxPages && Date.now() - started < budget) {
            const batch: string[] = [];
            while (queue.length && batch.length < Math.min(3, maxPages - pages.length)) {
                const url = queue.shift()!;
                if (processed.has(url))
                    continue;
                processed.add(url);
                if (!robotsAllows(url, policy)) {
                    if (crawl.errors.length < 100)
                        crawl.errors.push({ url, message: "Excluded by robots.txt; not fetched or graded as missing content." });
                    continue;
                }
                batch.push(url);
            }
            const results = await Promise.all(batch.map(async (url) => {
                try {
                    return parseLivePage(await fetchFollowing(url), ctx, url);
                }
                catch (error) {
                    return emptyPage(url, ctx, recordError(url, error));
                }
            }));
            for (const page of results) {
                if (!pages.some((existing) => existing.url === page.url))
                    pages.push(page);
                page.live?.links.forEach((link) => enqueue(link.url, page.url));
            }
        }
        crawl.limited ||= queue.length > 0 || Date.now() - started >= budget;
    }
    catch (error) {
        const message = recordError(startUrl.href, error);
        crawl.robotsError = policies.size ? undefined : message;
        if (!pages.length)
            pages.push(emptyPage(startUrl.href, ctx, message));
    }
    for (const page of pages) {
        if (page.live)
            page.live.inSitemap = sitemapUrls.has(page.url);
        page.incomingLinks = pages.filter((other) => other.url !== page.url && other.live?.links.some((link) => link.url === page.url)).map((other) => other.url);
    }
    crawl.botAccess = pages.filter(page => page.intendedIndexable).flatMap(page => {
        const captured = botPolicies.get(new URL(page.url).origin);
        return captured ? searchBots.map(agent => ({ url: page.url, agent, allowed: robotsAllows(page.url, parseRobots(captured.body, agent)), robotsUrl: captured.robotsUrl, checkedAt: captured.checkedAt })) : [];
    });
    crawl.crawledPages = pages.length;
    crawl.discoveredUrls = discovered.size;
    crawl.completedAt = new Date().toISOString();
    return { mode: "live", brandId: ctx.brandId, contextHash: ctx.contextHash, observedAt: crawl.completedAt, pages, opportunities: [], observations: [], crawl };
}
export function runLiveAudit(ctx: SeoContext, snapshot: SeoSnapshot): SeoAudit {
    if (snapshot.mode !== "live" || snapshot.brandId !== ctx.brandId || snapshot.contextHash !== ctx.contextHash)
        throw new Error("Live evidence belongs to a different brand or an older Brand Brain. Run a fresh audit.");
    const checks: SeoCheck[] = [], findings: SeoFinding[] = [];
    const add = (page: SeoPage, ruleId: string, category: SeoCategory, title: string, status: SeoCheck["status"], evidence: string[], why: string, remedy: string, priority: SeoFinding["priority"] = "P2", effort: SeoFinding["effort"] = "Small") => {
        const key = `${page.id}:${ruleId}`;
        checks.push({ mode: "live", id: key, ruleId, category, title, url: page.url, status, evidence });
        if (status === "fail")
            findings.push({ mode: "live", id: key, ruleId, category, title, url: page.url, evidence, why, remedy, priority, effort });
    };
    const pages = snapshot.pages.filter((page) => classifyAuditPage(ctx, page).included).map((page) => ({ ...page, kind: classifyAuditPage(ctx, page).kind as SeoPage["kind"] }));
    const inspected = pages.filter((page) => page.live?.htmlInspected);
    for (const page of pages) {
        const e = page.live, known = Boolean(e?.htmlInspected), state = (pass: boolean) => !known ? "unknown" as const : pass ? "pass" as const : "fail" as const;
        add(page, "SEO-INDEX", "SEO", "Check public access and indexing directives", page.statusCode === null ? "unknown" : page.statusCode >= 400 ? "fail" : state(!page.noindex), [`HTTP ${page.statusCode ?? "not obtained"}; HTML inspected: ${known}; noindex: ${page.noindex ?? "unknown"}.`, ...(e?.error ? [e.error] : []), "Indexing in Google is not measured; use Search Console URL Inspection."], "Search destinations need accessible content and intentional indexing directives.", "Review this URL's HTTP response, robots and indexing policy; confirm whether it should appear in search before changing directives.", "P1", "Medium");
        if (!known) {
            add(page, "AEO-SOURCE", "AEO", "Inspect shopper answers in page source", "unknown", [e?.error ?? "HTML content was not available."], "Blocked or unavailable HTML cannot be scored for content quality.", "Restore public access or supply an authorized rendered capture.");
            continue;
        }
        add(page, "SECURITY-HTTPS", "SEO", "Serve the storefront over HTTPS", state(new URL(page.url).protocol === "https:"), [`Fetched URL: ${page.url}. This is a public transport check, not a penetration test.`], "An encrypted connection protects the page in transit and prevents browser warnings for shoppers.", "Configure HTTPS on the storefront domain with the hosting provider and verify the certificate and HTTP-to-HTTPS redirect without changing checkout routes.", "P1", "Medium");
        if (new URL(page.url).protocol === "https:")
            add(page, "SECURITY-MIXED-CONTENT", "SEO", "Remove HTTP resource references from HTTPS pages", e!.insecureResources === undefined ? "unknown" : state(e!.insecureResources.length === 0), [`HTTP resource references captured: ${e!.insecureResources?.length ?? "not captured"}.`, ...(e!.insecureResources ?? []).slice(0, 8).map((r) => `${r.tag}: ${r.url}`), "Browsers may upgrade or block these requests; actual runtime behavior needs a browser test."], "Unencrypted resource URLs can result in blocked images, scripts or styles and a broken shopping experience.", "Find the theme or app that emits each resource, verify its HTTPS endpoint works, update the reference and test product selection, cart and checkout.", "P2", "Medium");
        if (page.kind === "home")
            add(page, "SECURITY-HEADERS", "SEO", "Review storefront browser protection headers", "unknown", [e!.responseHeaders ? JSON.stringify(e!.responseHeaders) : "Headers were not captured in this older audit.", "Header presence alone cannot establish a secure site. Missing policies require hosting/platform review; they are not proof of an exploitable vulnerability."], "Browser protection policies need to match the storefront's payment, analytics and app integrations.", "Review observed headers with the hosting owner. Evaluate CSP in report-only mode and verify script/embed requirements before enforcing a policy; do not paste a blanket policy into Shopify.", "P2", "Medium");
        for (const [field, rule, label] of [["title", "SEO-TITLE", "descriptive search title"], ["description", "SEO-DESCRIPTION", "useful search description"], ["h1", "SEO-HEADING", "clear main heading"]] as const) {
            add(page, rule, "SEO", `Provide a ${label}`, state(Boolean(page[field]?.trim())), [`Observed ${field}: ${page[field] || "missing"}.`], "Accurate page labels help shoppers choose the right product, category or guide.", `Write a page-specific ${label} grounded in approved product facts.`, field === "description" ? "P3" : "P2");
        }
        const canonical = page.canonical ? urlFrom(page.canonical, page.url) : null;
        add(page, "SEO-CANONICAL", "SEO", "Declare one valid preferred URL", state(e!.canonicalCount === 1 && Boolean(canonical)), [`Canonical tags: ${e!.canonicalCount}; declared: ${page.canonical || "missing/invalid"}.`, canonical && normal(canonical) !== normal(page.url) ? "A different canonical is declared. Review variant/filter policy; this alone is not an error." : ""].filter(Boolean), "A clear preferred URL helps consolidate duplicate product and collection paths.", "Review the intended URL policy and configure one valid canonical tag in the theme.", "P2", "Medium");
        for (const [field, rule] of [["title", "SEO-DUPLICATE-TITLE"], ["description", "SEO-DUPLICATE-DESCRIPTION"]] as const) {
            if (!page[field])
                continue;
            const duplicates = inspected.filter((other) => other.url !== page.url && other[field]?.trim().toLowerCase() === page[field]?.trim().toLowerCase() && !(page.canonical && other.canonical && page.canonical === other.canonical));
            add(page, rule, "SEO", `Differentiate repeated ${field} text`, state(!duplicates.length), [`${duplicates.length} other sampled destinations use the same ${field}.`, ...duplicates.slice(0, 5).map((p) => p.url)], "Distinct searchable destinations should communicate their distinct shopping purpose.", "Check whether these are duplicates that need consolidation or separate pages needing accurate individual metadata.", "P3");
        }
        add(page, "SEO-IMAGE-ALT", "SEO", "Review images without an alt attribute", state(e!.imagesMissingAlt === 0), [`${e!.imagesMissingAlt} of ${e!.imageCount} source images lack alt attributes. Empty alt is accepted for decorative images; alt accuracy was not evaluated.`], "Product imagery should be understandable with assistive technology and when images cannot load.", "Write concise meaningful alt text for informative images; use empty alt for purely decorative images.", "P3");
        add(page, "SEO-JSONLD", "SEO", "Keep structured data valid JSON", state(e!.invalidJsonLd === 0), [`Invalid JSON-LD blocks: ${e!.invalidJsonLd}; observed types: ${e!.schemaTypes.join(", ") || "none"}.`], "Malformed JSON-LD cannot be reliably interpreted by consumers.", "Correct JSON syntax in the owning theme/app and validate with the Rich Results Test. This check does not validate every schema property.");
        if (page.kind !== "home")
            add(page, "SEO-LINKS", "SEO", "Check discovery through relevant store links", page.incomingLinks?.length ? "pass" : "unknown", [`Incoming links found within this sample: ${page.incomingLinks?.length ?? 0}.`, "A bounded crawl cannot prove that a page is orphaned."], "Useful products and buying guides need relevant crawlable paths from the rest of the store.", "Review internal linking from the parent collection and relevant product guides; confirm with a complete crawl before treating this as an orphan.");
        if (page.kind === "pdp") {
            const complete = e!.productSchema.some((p) => p.name && p.image && p.offers && p.price && p.currency && p.availability);
            add(page, "SEO-PRODUCT-SCHEMA", "SEO", "Describe purchasable products and offers", !e!.productSchema.length && e!.otherStructuredData ? "unknown" : state(complete), [`Product JSON-LD objects: ${e!.productSchema.length}; microdata/RDFa detected: ${e!.otherStructuredData} (not validated).`, ...e!.productSchema.map((p) => `${p.name || "Unnamed"}: image=${p.image}, offers=${p.offers}, price=${p.price}, currency=${p.currency}, availability=${p.availability}.`)], "Product and offer information supports product result eligibility; markup never guarantees a rich result.", "Review the existing Product markup, add missing current offer properties, and validate the actual product and variant in Google's Rich Results Test.", "P1", "Medium");
            add(page, "SEO-PRICE", "SEO", "Verify visible price and stock against structured offers", "unknown", ["A static HTML crawl cannot reliably identify the selected variant's rendered price and availability. Schema was not compared with itself."], "Price and stock must match what shoppers can actually buy.", "Compare a rendered selected variant with the same structured offer, currency and inventory state.", "P1", "Medium");
        }
        if (["pdp", "collection", "blog"].includes(page.kind)) {
            add(page, "SEO-BREADCRUMB", "SEO", "Review product and category navigation structure", !e!.schemaTypes.includes("BreadcrumbList") && e!.otherStructuredData ? "unknown" : state(e!.schemaTypes.includes("BreadcrumbList")), [`BreadcrumbList JSON-LD: ${e!.schemaTypes.includes("BreadcrumbList") ? "present" : "not found"}. Microdata and rendered navigation require manual verification.`], "Breadcrumbs can clarify store hierarchy for shoppers and search systems.", "Check existing breadcrumbs and microdata before adding anything. Where useful, align the visible hierarchy and structured breadcrumb URLs.", "P3");
        }
        add(page, "AEO-ANSWERS", "AEO", "Provide explicit answers to shopper questions", state(e!.answeredQuestionCount > 0), [`Question headings/summaries: ${e!.questionHeadings.length}; followed by at least 40 characters of source text: ${e!.answeredQuestionCount}.`, ...e!.questionHeadings.slice(0, 4), "This heuristic measures answer structure, not answer accuracy or engine visibility."], "Useful direct answers can reduce uncertainty about fit, use, delivery and returns.", "Use Brand Brain buyer questions and approved product facts to write helpful on-page answers. Review whether this page needs them; FAQ schema is not required.", "P2");
        if (page.kind === "home" || page.kind === "pdp") {
            add(page, "AEO-POLICIES", "AEO", "Make purchase policies and support discoverable", state(e!.policyLinks.shipping && e!.policyLinks.returns && e!.policyLinks.contact), [`Source links: shipping/delivery=${e!.policyLinks.shipping}; returns/refunds=${e!.policyLinks.returns}; contact/support=${e!.policyLinks.contact}. Policy content was not verified.`], "D2C customers need reliable purchase, delivery and support answers.", "Link to current shipping, returns and contact information from useful store locations; write details that match your actual policies.");
        }
    }
    const home = pages.find((page) => page.kind === "home") ?? pages[0] ?? emptyPage(ctx.websiteUrl || "https://example.invalid", ctx);
    for (const page of pages.filter(p => p.intendedIndexable)) {
        const access = snapshot.crawl?.botAccess?.filter(row => row.url === page.url) ?? [];
        const blocked = access.filter(row => !row.allowed);
        add(page, "GEO-SEARCH-ACCESS", "GEO", "Review search-bot robots access", access.length ? blocked.length ? "fail" : "pass" : "unknown", access.length ? access.map(row => `${row.agent}: ${row.allowed ? "allowed" : "disallowed"} by ${row.robotsUrl}; ${row.checkedAt}. Policy only; real bot HTTP access and indexing untested.`) : ["No bot-specific robots policy evidence saved. Run a fresh audit."], "Search crawlers can have different policies from the audit crawler; intentional exclusions need review before changes.", "Review exact public paths for Googlebot, OAI-SearchBot, Claude-SearchBot, Claude-User and PerplexityBot. Preserve private-path rules and separate training preferences. Verify CDN access separately; allowing a bot does not guarantee recommendation.");
    }
    add(home, "GEO-VISIBILITY", "GEO", "Measure real AI engine mentions and citations", "unknown", ["No AI engine responses were collected. A storefront crawl cannot establish ChatGPT, Gemini, Perplexity or other engine visibility."], "Citation frequency and answer accuracy require actual repeatable observations.", "Collect dated engine responses for brand-relevant buyer prompts with market, model and cited URLs; compare product facts against the shared Brand Brain.");
    add(home, "GEO-FACTS", "GEO", "Verify factual accuracy in generated answers", "unknown", ["No generated answers or independent engine fact observations are available."], "A page being readable does not prove engines describe its products accurately.", "Supply observed engine answers and verify their factual claims against approved shared product evidence.");
    const score = (category: SeoCategory): SeoReadiness => {
        const group = checks.filter((check) => check.category === category), passed = group.filter((c) => c.status === "pass").length, failed = group.filter((c) => c.status === "fail").length;
        return { label: "Live readiness", score: passed + failed ? Math.round(100 * passed / (passed + failed)) : null, passed, failed, unknown: group.length - passed - failed, total: group.length };
    };
    findings.sort((a, b) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id));
    return { mode: "live", brandId: ctx.brandId, contextHash: ctx.contextHash, checks, findings, scores: { SEO: score("SEO"), AEO: score("AEO"), GEO: score("GEO") } };
}
