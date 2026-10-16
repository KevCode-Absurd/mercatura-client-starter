import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
import { launchBrowser } from "./browser";
import { normaliseUrl } from "./capture";
import { searchCards, type Card } from "./library";
export const PROFILE = "Pixel 5 (393 x 851), slow 4G (1.6 Mbps, 150 ms), 4x slower processor, cold cache";
const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const INIT_JS = `
window.__m = { lcp: [], cls: [], longtasks: [], fcp: null };
try {
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp.push({ t: e.startTime, size: e.size, url: e.url || null, tag: e.element ? e.element.tagName : null, text: e.element ? (e.element.innerText || '').slice(0, 60) : null, lazy: e.element && e.element.getAttribute ? e.element.getAttribute('loading') : null, fp: e.element && e.element.getAttribute ? e.element.getAttribute('fetchpriority') : null }); }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls.push({ v: e.value, nodes: (e.sources || []).map((s) => s.node && s.node.nodeName ? (s.node.nodeName + (s.node.className && typeof s.node.className === 'string' ? '.' + s.node.className.split(' ')[0] : '')) : '').filter(Boolean) }); }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.longtasks.push({ t: e.startTime, d: e.duration }); }).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__m.fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
} catch (err) { window.__m.err = String(err); }`;
const COLLECT_JS = `(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource').map((r) => ({ name: r.name.slice(0, 300), rb: r.renderBlockingStatus || null }));
  const imgs = [...document.images].map((i) => { const r = i.getBoundingClientRect(); return { src: (i.currentSrc || i.src || '').slice(0, 300), nw: i.naturalWidth, nh: i.naturalHeight, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + scrollY), loading: i.getAttribute('loading'), fp: i.getAttribute('fetchpriority'), sized: i.hasAttribute('width') && i.hasAttribute('height') || getComputedStyle(i).aspectRatio !== 'auto', inView: r.top < innerHeight && r.bottom > 0 && r.width > 0 }; });
  const fonts = []; try { document.fonts.forEach((f) => fonts.push({ family: f.family.replace(/["']/g, ''), weight: f.weight, style: f.style, status: f.status })); } catch (e) {}
  const scripts = [...document.scripts].map((s) => ({ src: (s.src || '').slice(0, 300), async: s.async, defer: s.defer, type: s.type, inline: s.src ? 0 : (s.textContent || '').length }));
  return { nav: nav ? { ttfb: nav.responseStart, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd } : null, m: window.__m, res, imgs, fonts, scripts, domNodes: document.getElementsByTagName('*').length, title: document.title };
})()`;
export interface Req {
    url: string;
    host: string;
    type: string;
    status: number;
    bytes: number;
    mime: string;
    cache: string;
    encoding: string;
    party: "first" | "third";
    blocking: boolean;
}
export interface Run {
    fcp: number | null;
    lcp: number | null;
    lcp_el: {
        tag: string | null;
        url: string | null;
        text: string | null;
        lazy: string | null;
        fp: string | null;
    } | null;
    ttfb: number | null;
    dcl: number | null;
    load: number | null;
    cls: number;
    cls_nodes: string[];
    tbt: number;
    long_tasks: number;
    bytes: number;
    requests: number;
    error: string | null;
}
export interface SpeedResult {
    url: string;
    profile: string;
    runs: Run[];
    median: Pick<Run, "fcp" | "lcp" | "ttfb" | "dcl" | "load" | "cls" | "tbt" | "bytes" | "requests">;
    requests: Req[];
    images: {
        src: string;
        nw: number;
        nh: number;
        w: number;
        h: number;
        top: number;
        loading: string | null;
        fp: string | null;
        sized: boolean;
        inView: boolean;
        bytes: number;
    }[];
    fonts: {
        family: string;
        weight: string;
        style: string;
        status: string;
    }[];
    scripts: {
        src: string;
        async: boolean;
        defer: boolean;
        inline: number;
    }[];
    dom_nodes: number;
    console_errors: string[];
    failed: string[];
    cdn: string | null;
    lcp_el: Run["lcp_el"];
    shot: string;
    score: number;
    findings: Finding[];
    at: string;
}
export interface Finding {
    id: string;
    severity: "fail" | "warn" | "info";
    title: string;
    evidence: string;
    fix: string;
    gain: string;
    cards: Pick<Card, "id" | "title" | "summary">[];
}
export function siteOf(host: string): string {
    const parts = host.toLowerCase().split(".").filter(Boolean);
    if (parts.length <= 2)
        return parts.join(".");
    const two = parts.slice(-2).join(".");
    return /^(co|com|net|org|gov|ac)\.[a-z]{2}$/.test(two) ? parts.slice(-3).join(".") : two;
}
const median = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => typeof x === "number" && Number.isFinite(x)).sort((a, b) => a - b);
    if (!v.length)
        return null;
    return v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
};
const kb = (n: number) => `${Math.round(n / 1024).toLocaleString("en-US")} KB`;
const sec = (ms: number | null) => (ms === null ? "not measured" : `${(ms / 1000).toFixed(2)} s`);
export async function measure(url: string, scanId: string, runs = 3): Promise<SpeedResult> {
    const target = /^https?:\/\//i.test(url) ? url : normaliseUrl(url);
    const site = siteOf(new URL(target).hostname);
    const browser = await launchBrowser();
    const out: Run[] = [];
    let detail: {
        reqs: Req[];
        data: Record<string, unknown>;
        errors: string[];
        failed: string[];
        cdn: string | null;
    } | null = null;
    const shot = `landing/${scanId}-speed.png`;
    fs.mkdirSync(path.join(env.DATA_DIR, "assets", "landing"), { recursive: true });
    try {
        for (let i = 0; i < Math.max(1, Math.min(3, runs)); i++) {
            const ctx = await browser.newContext({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, userAgent: UA });
            const page = await ctx.newPage();
            const errors: string[] = [];
            const failed: string[] = [];
            page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
            page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
            page.on("requestfailed", (r) => failed.push(r.url().slice(0, 200)));
            await page.addInitScript(INIT_JS);
            const cdp = await ctx.newCDPSession(page);
            await cdp.send("Network.enable");
            await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
            await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
            await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
            const meta = new Map<string, {
                url: string;
                type: string;
                status: number;
                mime: string;
                cache: string;
                encoding: string;
                server: string;
            }>();
            const bytes = new Map<string, number>();
            cdp.on("Network.responseReceived", (e: {
                requestId: string;
                type: string;
                response: {
                    url: string;
                    status: number;
                    mimeType: string;
                    headers: Record<string, string>;
                };
            }) => {
                const h = Object.fromEntries(Object.entries(e.response.headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
                meta.set(e.requestId, { url: e.response.url, type: e.type, status: e.response.status, mime: e.response.mimeType, cache: h["cache-control"] ?? "", encoding: h["content-encoding"] ?? "", server: [h["server"], h["cf-ray"] ? "cloudflare" : "", h["x-served-by"], h["x-cache"], h["x-amz-cf-id"] ? "cloudfront" : "", h["x-vercel-id"] ? "vercel" : "", h["x-shopid"] ? "shopify" : ""].filter(Boolean).join(" ") });
            });
            cdp.on("Network.loadingFinished", (e: {
                requestId: string;
                encodedDataLength: number;
            }) => bytes.set(e.requestId, e.encodedDataLength));
            let error: string | null = null;
            try {
                const res = await page.goto(target, { waitUntil: "load", timeout: 120000 });
                if (res && res.status() >= 400)
                    error = `The page answered ${res.status()}.`;
                await page.waitForTimeout(5000);
            }
            catch (e) {
                error = (e as Error).message.split("\n")[0];
            }
            let data: Record<string, unknown> | null = null;
            for (let k = 0; k < 3 && !data; k++) {
                try {
                    data = (await page.evaluate(COLLECT_JS)) as Record<string, unknown>;
                }
                catch {
                    await page.waitForTimeout(1500);
                }
            }
            const m = (data?.m ?? { lcp: [], cls: [], longtasks: [], fcp: null }) as {
                lcp: (NonNullable<Run["lcp_el"]> & {
                    t: number;
                })[];
                cls: {
                    v: number;
                    nodes: string[];
                }[];
                longtasks: {
                    t: number;
                    d: number;
                }[];
                fcp: number | null;
            };
            const nav = (data?.nav ?? null) as {
                ttfb: number;
                dcl: number;
                load: number;
            } | null;
            const blocking = new Set(((data?.res ?? []) as {
                name: string;
                rb: string | null;
            }[]).filter((r) => r.rb === "blocking").map((r) => r.name));
            const reqs: Req[] = [...meta.entries()].map(([id, x]) => {
                const host = (() => {
                    try {
                        return new URL(x.url).hostname;
                    }
                    catch {
                        return "";
                    }
                })();
                return { url: x.url.slice(0, 300), host, type: x.type, status: x.status, bytes: bytes.get(id) ?? 0, mime: x.mime, cache: x.cache, encoding: x.encoding, party: siteOf(host) === site ? "first" : "third", blocking: blocking.has(x.url.slice(0, 300)) };
            });
            const lcp = m.lcp.length ? m.lcp[m.lcp.length - 1] : null;
            out.push({
                fcp: m.fcp,
                lcp: lcp ? lcp.t : null,
                lcp_el: lcp ? { tag: lcp.tag, url: lcp.url, text: lcp.text, lazy: lcp.lazy, fp: lcp.fp } : null,
                ttfb: nav?.ttfb ?? null,
                dcl: nav?.dcl ?? null,
                load: nav?.load ?? null,
                cls: Math.round(m.cls.reduce((a, c) => a + c.v, 0) * 1000) / 1000,
                cls_nodes: [...new Set(m.cls.flatMap((c) => c.nodes))].slice(0, 5),
                tbt: Math.round(m.longtasks.reduce((a, t) => a + Math.max(0, t.d - 50), 0)),
                long_tasks: m.longtasks.length,
                bytes: reqs.reduce((a, r) => a + r.bytes, 0),
                requests: reqs.length,
                error,
            });
            if (i === 0) {
                await page.screenshot({ path: path.join(env.DATA_DIR, "assets", shot) }).catch(() => undefined);
                const doc = [...meta.values()].find((x) => x.type === "Document");
                detail = { reqs, data: data ?? {}, errors, failed, cdn: doc?.server || null };
            }
            await ctx.close();
        }
    }
    finally {
        await browser.close();
    }
    const d = detail!;
    const imgBytes = new Map(d.reqs.filter((r) => r.type === "Image").map((r) => [r.url, r.bytes]));
    const result: Omit<SpeedResult, "score" | "findings"> = {
        url: target,
        profile: PROFILE,
        runs: out,
        median: { fcp: median(out.map((r) => r.fcp)), lcp: median(out.map((r) => r.lcp)), ttfb: median(out.map((r) => r.ttfb)), dcl: median(out.map((r) => r.dcl)), load: median(out.map((r) => r.load)), cls: median(out.map((r) => r.cls)) ?? 0, tbt: median(out.map((r) => r.tbt)) ?? 0, bytes: median(out.map((r) => r.bytes)) ?? 0, requests: median(out.map((r) => r.requests)) ?? 0 },
        requests: d.reqs,
        images: ((d.data.imgs ?? []) as SpeedResult["images"]).map((im) => ({ ...im, bytes: imgBytes.get(im.src) ?? 0 })),
        fonts: (d.data.fonts ?? []) as SpeedResult["fonts"],
        scripts: (d.data.scripts ?? []) as SpeedResult["scripts"],
        dom_nodes: Number(d.data.domNodes ?? 0),
        console_errors: d.errors.slice(0, 20),
        failed: d.failed.slice(0, 20),
        cdn: d.cdn,
        lcp_el: out[0]?.lcp_el ?? null,
        shot,
        at: new Date().toISOString(),
    };
    const findings = findingsOf(result);
    return { ...result, findings, score: labScore(result.median) };
}
export function labScore(m: SpeedResult["median"]): number {
    const band = (v: number | null, good: number, poor: number) => (v === null ? 0.5 : v <= good ? 1 : v >= poor * 1.5 ? 0 : v <= poor ? 1 - (0.5 * (v - good)) / (poor - good) : 0.5 - (0.5 * (v - poor)) / (poor * 0.5));
    const s = 0.25 * band(m.lcp, 2500, 4000) + 0.3 * band(m.tbt, 200, 600) + 0.25 * band(m.cls, 0.1, 0.25) + 0.1 * band(m.fcp, 1800, 3000) + 0.1 * band(m.bytes, 1.6e6, 4e6);
    return Math.round(s * 100);
}
const DEAD = /google-analytics\.com\/(analytics|ga)\.js|urchin\.js|\/collect\?v=1&/i;
export function findingsOf(r: Omit<SpeedResult, "score" | "findings">): Finding[] {
    const f: Omit<Finding, "cards">[] = [];
    const m = r.median;
    const lcpImg = r.lcp_el?.url ? r.images.find((i) => i.src === r.lcp_el!.url) : undefined;
    if (m.lcp !== null && m.lcp > 2500) {
        const what = r.lcp_el ? `${r.lcp_el.tag ?? "element"}${r.lcp_el.url ? ` (${r.lcp_el.url.split("/").pop()?.split("?")[0]})` : r.lcp_el.text ? ` "${r.lcp_el.text}"` : ""}` : "the largest element";
        const why = [r.lcp_el?.lazy === "lazy" ? "it is lazy-loaded" : "", r.lcp_el?.url && r.lcp_el.fp !== "high" ? "it has no fetchpriority=high" : "", lcpImg && lcpImg.bytes > 200 * 1024 ? `it weighs ${kb(lcpImg.bytes)}` : ""].filter(Boolean);
        f.push({ id: "lcp", severity: m.lcp > 4000 ? "fail" : "warn", title: "The main content appears late", evidence: `Largest paint at ${sec(m.lcp)} (good is 2.5 s). It is ${what}${why.length ? `, and ${why.join(", ")}` : ""}.`, fix: "Fix in this order: take loading=lazy off it, stop any fade-in animation on it, compress it under 200 KB in WebP or AVIF, preload it with fetchpriority=high, then cut the scripts that block before it.", gain: `Up to ${sec(m.lcp - 2500)} off the largest paint.` });
    }
    if (m.cls > 0.1)
        f.push({ id: "cls", severity: m.cls > 0.25 ? "fail" : "warn", title: "The page jumps while it loads", evidence: `Layout shift ${m.cls} (good is 0.1)${r.runs[0]?.cls_nodes.length ? `, from ${r.runs[0].cls_nodes.join(", ")}` : ""}.`, fix: "Reserve space for everything that loads late: width and height (or aspect-ratio) on images and embeds, a fixed height for banners and review widgets, font-display swap with a close fallback.", gain: "A page that does not move under the thumb." });
    if (m.tbt > 200) {
        const third = r.requests.filter((q) => q.type === "Script" && q.party === "third");
        f.push({ id: "tbt", severity: m.tbt > 600 ? "fail" : "warn", title: "The page ignores taps while scripts run", evidence: `${Math.round(m.tbt)} ms of blocking time on a slow phone, ${r.runs[0]?.long_tasks ?? 0} long tasks; ${third.length} outside scripts (${kb(third.reduce((a, q) => a + q.bytes, 0))}).`, fix: "Load marketing tags and apps after the page (on interaction or after load), remove apps that are not used, split the theme's own script.", gain: `Up to ${Math.round(m.tbt - 200)} ms less blocking.` });
    }
    if (m.fcp !== null && m.fcp > 1800)
        f.push({ id: "fcp", severity: m.fcp > 3000 ? "warn" : "info", title: "Nothing shows for a while", evidence: `First paint at ${sec(m.fcp)} (good is 1.8 s).`, fix: "Inline the CSS the first screen needs, defer the rest, and remove render-blocking scripts in the head.", gain: `Up to ${sec(m.fcp - 1800)} sooner.` });
    if (m.ttfb !== null && m.ttfb > 800)
        f.push({ id: "ttfb", severity: m.ttfb > 1800 ? "fail" : "warn", title: "The server answers slowly", evidence: `First byte after ${sec(m.ttfb)} on this connection (good is 0.8 s)${r.cdn ? "" : "; no CDN header was seen on the page"}.`, fix: "Serve the page from a CDN with caching, cut redirects, and check the server or app that builds the page.", gain: "Every other number starts earlier." });
    const blocking = r.requests.filter((q) => q.blocking && (q.type === "Script" || q.type === "Stylesheet"));
    if (blocking.length)
        f.push({ id: "render_blocking", severity: blocking.length > 3 ? "warn" : "info", title: `${blocking.length} file${blocking.length === 1 ? "" : "s"} block the first paint`, evidence: blocking.slice(0, 5).map((q) => `${q.url.split("/").pop()?.split("?")[0] || q.host} (${kb(q.bytes)})`).join(", "), fix: "Add defer or async to scripts; inline critical CSS and load the rest without blocking.", gain: "A sooner first paint." });
    const oversized = r.images.filter((i) => i.w > 0 && i.nw > i.w * 2.75 * 1.5 && i.bytes > 60 * 1024);
    if (oversized.length)
        f.push({ id: "oversized_images", severity: "warn", title: `${oversized.length} image${oversized.length === 1 ? " is" : "s are"} far bigger than shown`, evidence: oversized.slice(0, 3).map((i) => `${i.src.split("/").pop()?.split("?")[0]}: ${i.nw} px wide for a ${i.w} px slot (${kb(i.bytes)})`).join("; "), fix: "Serve responsive sizes (srcset), about 2,000 px on the long edge at most, product images under 100 KB.", gain: `About ${kb(oversized.reduce((a, i) => a + i.bytes * 0.6, 0))} less.` });
    const oldFormat = r.requests.filter((q) => q.type === "Image" && /jpe?g|png/i.test(q.mime) && q.bytes > 150 * 1024);
    if (oldFormat.length)
        f.push({ id: "image_format", severity: "warn", title: `${oldFormat.length} large JPEG or PNG image${oldFormat.length === 1 ? "" : "s"}`, evidence: oldFormat.slice(0, 3).map((q) => `${q.url.split("/").pop()?.split("?")[0]} (${kb(q.bytes)})`).join(", "), fix: "Convert to WebP or AVIF; most stores' CDNs do it with a URL parameter.", gain: `About ${kb(oldFormat.reduce((a, q) => a + q.bytes * 0.35, 0))} less.` });
    const eagerBelow = r.images.filter((i) => !i.inView && i.top > 900 && i.loading !== "lazy" && i.bytes > 20 * 1024);
    if (eagerBelow.length >= 2)
        f.push({ id: "lazy", severity: "info", title: `${eagerBelow.length} images below the fold load straight away`, evidence: `${kb(eagerBelow.reduce((a, i) => a + i.bytes, 0))} that the first screen does not need.`, fix: "Add loading=lazy to images below the first screen (never to the hero).", gain: "A lighter first load." });
    const unsized = r.images.filter((i) => !i.sized && i.inView);
    if (unsized.length && m.cls > 0.05)
        f.push({ id: "unsized", severity: "info", title: `${unsized.length} image${unsized.length === 1 ? " has" : "s have"} no reserved size`, evidence: "No width and height or aspect-ratio, so the page moves when they arrive.", fix: "Set width and height on every image, or an aspect-ratio in CSS.", gain: "Less layout shift." });
    const fontReqs = r.requests.filter((q) => q.type === "Font");
    const families = new Map<string, Set<string>>();
    for (const x of r.fonts)
        families.set(x.family, (families.get(x.family) ?? new Set()).add(`${x.weight}${x.style}`));
    const heavyFamily = [...families.entries()].find(([, v]) => v.size > 3);
    if (fontReqs.length > 4 || heavyFamily)
        f.push({ id: "fonts", severity: "info", title: "Too many font files", evidence: `${fontReqs.length} font files (${kb(fontReqs.reduce((a, q) => a + q.bytes, 0))})${heavyFamily ? `; ${heavyFamily[1].size} versions of ${heavyFamily[0]}` : ""}.`, fix: "Keep about 3 weights in all, self-hosted WOFF2 with font-display swap, subset to the characters used.", gain: `Up to ${kb(fontReqs.reduce((a, q) => a + q.bytes, 0) * 0.5)} less.` });
    const thirdBytes = r.requests.filter((q) => q.party === "third").reduce((a, q) => a + q.bytes, 0);
    const thirdHosts = new Set(r.requests.filter((q) => q.party === "third").map((q) => siteOf(q.host)));
    if (thirdHosts.size > 10 || (m.bytes > 0 && thirdBytes / m.bytes > 0.4)) {
        const top = [...thirdHosts].map((h) => ({ h, b: r.requests.filter((q) => siteOf(q.host) === h).reduce((a, q) => a + q.bytes, 0) })).sort((a, b) => b.b - a.b).slice(0, 4);
        f.push({ id: "third_party", severity: "warn", title: `${thirdHosts.size} outside services load on this page`, evidence: `${kb(thirdBytes)} from other sites (${m.bytes ? Math.round((thirdBytes / m.bytes) * 100) : 0}% of the page). Heaviest: ${top.map((t) => `${t.h} ${kb(t.b)}`).join(", ")}.`, fix: "List every app and tag with what it earns; remove what earns nothing; load the rest after the page. Stores with 0 to 5 services had a median mobile score of 74, with 21 to 30 of 44 (ecomOS speed playbook).", gain: "Often the biggest single saving." });
    }
    const dead = r.requests.filter((q) => DEAD.test(q.url));
    if (dead.length)
        f.push({ id: "dead_tag", severity: "warn", title: "A retired analytics tag still loads", evidence: dead.slice(0, 2).map((q) => q.url.slice(0, 80)).join(", "), fix: "Remove the old Universal Analytics tag; it stopped collecting in 2023.", gain: `${kb(dead.reduce((a, q) => a + q.bytes, 0))} and a request.` });
    const uncompressed = r.requests.filter((q) => ["Document", "Script", "Stylesheet"].includes(q.type) && !/gzip|br|zstd|deflate/i.test(q.encoding) && q.bytes > 10 * 1024 && q.party === "first");
    if (uncompressed.length)
        f.push({ id: "compression", severity: "warn", title: `${uncompressed.length} text file${uncompressed.length === 1 ? " is" : "s are"} sent uncompressed`, evidence: uncompressed.slice(0, 3).map((q) => `${q.url.split("/").pop()?.split("?")[0] || q.host} (${kb(q.bytes)})`).join(", "), fix: "Turn on Brotli or gzip for HTML, CSS and JavaScript.", gain: `About ${kb(uncompressed.reduce((a, q) => a + q.bytes * 0.7, 0))} less.` });
    const shortCache = r.requests.filter((q) => ["Script", "Stylesheet", "Image", "Font"].includes(q.type) && q.party === "first" && q.status === 200 && (!q.cache || /no-store|no-cache/.test(q.cache) || Number(q.cache.match(/max-age=(\d+)/)?.[1] ?? 0) < 7 * 86400));
    if (shortCache.length >= 3)
        f.push({ id: "caching", severity: "info", title: `${shortCache.length} static files are not cached for a week`, evidence: `For example ${shortCache[0].url.split("/").pop()?.split("?")[0]}: "${shortCache[0].cache || "no cache-control"}".`, fix: "Give images, fonts, scripts and styles a long max-age with a version in the file name. Never cache the cart or checkout.", gain: "Repeat visits load from the phone." });
    if (m.bytes > 2.5 * 1024 * 1024)
        f.push({ id: "weight", severity: m.bytes > 5 * 1024 * 1024 ? "fail" : "warn", title: "The page is heavy for a phone on 4G", evidence: `${kb(m.bytes)} over ${m.requests} requests.`, fix: "Work through the images, the outside scripts and the fonts above, biggest first.", gain: "" });
    if (r.dom_nodes > 1500)
        f.push({ id: "dom", severity: "info", title: "A very large page structure", evidence: `${r.dom_nodes.toLocaleString("en-US")} elements (about 1,500 is a sensible ceiling).`, fix: "Remove hidden duplicate sections (desktop and mobile copies) and heavy widgets.", gain: "Faster style and layout work on slow phones." });
    if (r.console_errors.length)
        f.push({ id: "errors", severity: "info", title: `${r.console_errors.length} script error${r.console_errors.length === 1 ? "" : "s"} while loading`, evidence: r.console_errors[0].slice(0, 140), fix: "Fix or remove the failing script: errors can stop buttons and tracking working.", gain: "" });
    const order = { fail: 0, warn: 1, info: 2 };
    return f.sort((a, b) => order[a.severity] - order[b.severity]).map((x) => ({ ...x, cards: searchCards(`${x.title} ${x.fix}`, ["speed"], 2).map(({ id, title, summary }) => ({ id, title, summary })) }));
}
