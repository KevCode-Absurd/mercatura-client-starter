import type { SeoContext } from "./model";
export type SearchRow = {
    query: string;
    page: string;
    clicks: number;
    impressions: number;
    position: number;
};
export type SearchImport = {
    id: string;
    brandId: string;
    contextHash: string;
    importedAt: string;
    periodStart: string;
    periodEnd: string;
    segment: string;
    rows: SearchRow[];
};
export type LabIssue = {
    id: string;
    title: string;
    description: string;
    savingsMs: number | null;
    evidence: string[];
};
export type LabImport = {
    id: string;
    brandId: string;
    contextHash: string;
    importedAt: string;
    url: string;
    testedAt: string;
    device: "mobile" | "desktop";
    performance: number | null;
    lcpMs: number | null;
    cls: number | null;
    tbtMs: number | null;
    actions: LabIssue[];
};
export type MeasurementData = {
    search: SearchImport[];
    lab: LabImport[];
};
export const SEARCH_TEMPLATE = "query,page,clicks,impressions,position,periodStart,periodEnd\n";
const MAX_INPUT = 700000;
export const MAX_LIGHTHOUSE_RAW_BYTES = 15000000;
export function compactLighthouseJson(text: string): string {
    if (typeof text !== "string" || text.length > MAX_LIGHTHOUSE_RAW_BYTES)
        throw new Error("Choose a Lighthouse report smaller than 15 MB.");
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    }
    catch {
        throw new Error("Paste valid Lighthouse JSON or a PageSpeed API response.");
    }
    if (!raw || typeof raw !== "object")
        throw new Error("The report must be a JSON object.");
    const wrapper = raw as Record<string, unknown>, report = (wrapper.lighthouseResult ?? wrapper) as Record<string, unknown>;
    if (!report || typeof report !== "object" || !report.audits || typeof report.audits !== "object")
        throw new Error("The report has no Lighthouse audits.");
    const allowed = new Set(["url", "snippet", "selector", "nodeLabel", "wastedBytes", "totalBytes", "wastedMs", "duration", "startTime", "value", "metric", "label", "type", "statistic", "node", "subItems", "items"]);
    const trim = (value: unknown, depth: number): unknown => {
        if (depth > 4)
            return undefined;
        if (typeof value === "string")
            return value.startsWith("data:") ? undefined : value.slice(0, 1600);
        if (typeof value === "number" || typeof value === "boolean" || value === null)
            return value;
        if (Array.isArray(value))
            return value.slice(0, 5).map((v) => trim(v, depth + 1));
        if (typeof value === "object")
            return Object.fromEntries(Object.entries(value).filter(([key]) => allowed.has(key)).map(([key, v]) => [key, trim(v, depth + 1)]));
        return undefined;
    };
    const audits = Object.fromEntries(Object.entries(report.audits).filter(([id]) => !/screenshot/i.test(id)).slice(0, 200).map(([id, unknownAudit]) => {
        const a = unknownAudit && typeof unknownAudit === "object" ? unknownAudit as Record<string, unknown> : {};
        const details = a.details && typeof a.details === "object" ? a.details as Record<string, unknown> : {};
        return [id, { numericValue: a.numericValue, score: a.score, title: typeof a.title === "string" ? a.title.slice(0, 500) : undefined, description: typeof a.description === "string" ? a.description.slice(0, 2000) : undefined, details: { overallSavingsMs: details.overallSavingsMs, items: trim(details.items, 0) } }];
    }));
    const result = JSON.stringify({ finalUrl: report.finalUrl, fetchTime: report.fetchTime, configSettings: report.configSettings, categories: { performance: (report.categories as {
                performance?: {
                    score?: unknown;
                };
            } | undefined)?.performance ? { score: (report.categories as {
                    performance: {
                        score?: unknown;
                    };
                }).performance.score } : undefined }, audits });
    if (result.length > MAX_INPUT)
        throw new Error("The diagnostic portion is still larger than 700 KB. Export a report for one page with fewer diagnostic items.");
    return result;
}
export function pageSpeedTarget(ctx: SeoContext, value: string, crawlUrls: string[] = []): string {
    if (typeof value !== "string" || value.length > 2000)
        throw new Error("Choose a public page from the current brand.");
    const url = new URL(sameStore(value, ctx));
    if (url.search || /\/(?:admin|account|cart|checkout|checkouts|login|password|api)(?:\/|$)/i.test(url.pathname) || !url.hostname.includes(".") || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) || url.hostname.includes(":") || /(?:^|\.)(?:localhost|local|internal)$/.test(url.hostname))
        throw new Error("Choose a public storefront page without query parameters, login or checkout paths.");
    const known = [ctx.websiteUrl, ...ctx.products.map((p) => p.url), ...crawlUrls].filter((u): u is string => !!u).flatMap((u) => { try {
        return [sameStore(u, ctx)];
    }
    catch {
        return [];
    } });
    if (!known.includes(url.href))
        throw new Error("Choose the shared store homepage, a catalogue URL or a page from the current crawl.");
    return url.href;
}
export function parseCsv(text: string): string[][] {
    if (typeof text !== "string" || text.length > MAX_INPUT)
        throw new Error("Use a CSV smaller than 700 KB.");
    const rows: string[][] = [];
    let row: string[] = [], cell = "", quoted = false, closed = false;
    const source = text.replace(/^\uFEFF/, "");
    const pushCell = () => { row.push(cell.trim()); cell = ""; closed = false; };
    const pushRow = () => { pushCell(); if (row.some(Boolean))
        rows.push(row); row = []; };
    for (let i = 0; i < source.length; i++) {
        const c = source[i];
        if (quoted) {
            if (c === '"') {
                if (source[i + 1] === '"') {
                    cell += '"';
                    i++;
                }
                else {
                    quoted = false;
                    closed = true;
                }
            }
            else
                cell += c;
            continue;
        }
        if (c === '"') {
            if (cell || closed)
                throw new Error("CSV contains an unexpected quote.");
            quoted = true;
        }
        else if (c === ",")
            pushCell();
        else if (c === "\n" || c === "\r") {
            if (c === "\r" && source[i + 1] === "\n")
                i++;
            pushRow();
        }
        else {
            if (closed && c.trim())
                throw new Error("CSV contains text after a closing quote.");
            if (!closed)
                cell += c;
        }
    }
    if (quoted)
        throw new Error("CSV has an unclosed quoted field.");
    if (cell || row.length || closed)
        pushRow();
    return rows;
}
function dateOnly(value: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        throw new Error("Use dates in YYYY-MM-DD format.");
    const time = Date.parse(value);
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value || value > new Date().toISOString().slice(0, 10))
        throw new Error("Dates must be valid and cannot be in the future.");
    return value;
}
function sameStore(value: string, ctx: SeoContext): string {
    if (!ctx.websiteUrl)
        throw new Error("Add the website in the shared Brand Brain first.");
    let url: URL;
    try {
        url = new URL(value);
    }
    catch {
        throw new Error("Every page must be a full website URL.");
    }
    const host = (s: string) => new URL(s).hostname.toLowerCase().replace(/^www\./, "");
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port || host(value) !== host(ctx.websiteUrl))
        throw new Error("Imported pages must belong to the shared Brand Brain website.");
    url.hash = "";
    return url.href;
}
function numeric(value: string, field: string, min: number, max: number, integer = false): number {
    if (!value.trim() || !/^\d+(?:\.\d+)?$/.test(value))
        throw new Error(`${field} must be a non-negative number without separators.`);
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isSafeInteger(n)))
        throw new Error(`${field} is outside the allowed range.`);
    return n;
}
export function parseSearchCsv(ctx: SeoContext, text: string, segment: string): Omit<SearchImport, "id" | "importedAt"> {
    if (typeof segment !== "string" || segment.trim().length < 3 || segment.length > 200)
        throw new Error("Name the export scope (search type, country and device), using 3–200 characters.");
    const [header, ...records] = parseCsv(text);
    const required = ["query", "page", "clicks", "impressions", "position", "periodstart", "periodend"];
    const normalized = (header ?? []).map((h) => h.toLowerCase().replace(/[\s_-]/g, ""));
    if (new Set(normalized).size !== normalized.length || required.some((h) => !normalized.includes(h)))
        throw new Error("Use the template columns: query, page, clicks, impressions, position, periodStart, periodEnd.");
    if (!records.length || records.length > 5000)
        throw new Error("Import between 1 and 5,000 query-and-page rows.");
    let periodStart = "", periodEnd = "";
    const seen = new Set<string>();
    const rows = records.map((record, i): SearchRow => {
        if (record.length !== normalized.length)
            throw new Error(`Row ${i + 2} has a different number of fields than the header.`);
        const get = (key: string) => record[normalized.indexOf(key)];
        const start = dateOnly(get("periodstart")), end = dateOnly(get("periodend"));
        if (start > end)
            throw new Error("The start date must be on or before the end date.");
        if (periodStart && (periodStart !== start || periodEnd !== end))
            throw new Error("Each CSV must contain one consistent date range.");
        periodStart = start;
        periodEnd = end;
        const query = get("query");
        if (!query || query.length > 500)
            throw new Error(`Row ${i + 2} needs a query of 1–500 characters.`);
        const page = sameStore(get("page"), ctx);
        if (page.length > 2000)
            throw new Error("Page URLs must be shorter than 2,000 characters.");
        const key = JSON.stringify([query, page]);
        if (seen.has(key))
            throw new Error("Duplicate query-and-page rows would double-count metrics. Combine them before importing.");
        seen.add(key);
        const clicks = numeric(get("clicks"), "Clicks", 0, 1e10, true), impressions = numeric(get("impressions"), "Impressions", 0, 1e10, true);
        if (clicks > impressions)
            throw new Error("Clicks cannot exceed impressions.");
        const position = numeric(get("position"), "Position", impressions ? 1 : 0, 10000);
        return { query, page, clicks, impressions, position };
    });
    return { brandId: ctx.brandId, contextHash: ctx.contextHash, segment: segment.trim(), periodStart, periodEnd, rows };
}
export function searchTotals(rows: SearchRow[]) {
    const clicks = rows.reduce((n, r) => n + r.clicks, 0), impressions = rows.reduce((n, r) => n + r.impressions, 0);
    return { clicks, impressions, ctr: impressions ? clicks / impressions : null, position: impressions ? rows.reduce((n, r) => n + r.position * r.impressions, 0) / impressions : null };
}
export function currentMeasurements(ctx: SeoContext, data: MeasurementData): MeasurementData {
    const current = (v: {
        brandId: string;
        contextHash: string;
    }) => v.brandId === ctx.brandId && v.contextHash === ctx.contextHash;
    return { search: data.search.filter(current).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || b.importedAt.localeCompare(a.importedAt)), lab: data.lab.filter(current).sort((a, b) => b.testedAt.localeCompare(a.testedAt)) };
}
export function compareSearch(current: SearchImport, previous: SearchImport) {
    const duration = (v: SearchImport) => Date.parse(v.periodEnd) - Date.parse(v.periodStart);
    if (current.brandId !== previous.brandId || current.contextHash !== previous.contextHash)
        return { comparable: false as const, reason: "Brand context differs. Import both periods against the current Brand Brain." };
    if (current.segment.toLowerCase() !== previous.segment.toLowerCase())
        return { comparable: false as const, reason: "Export scopes differ. Keep search type, country, device and filters identical." };
    if (duration(current) !== duration(previous) || previous.periodEnd >= current.periodStart)
        return { comparable: false as const, reason: "Choose equal-length, non-overlapping periods with the earlier period first." };
    const before = new Map(previous.rows.map((r) => [JSON.stringify([r.query, r.page]), r]));
    const matched = current.rows.flatMap((row) => { const old = before.get(JSON.stringify([row.query, row.page])); return old ? [{ ...row, previousClicks: old.clicks, clickChange: row.clicks - old.clicks }] : []; });
    return { comparable: true as const, current: searchTotals(current.rows), previous: searchTotals(previous.rows), matchedCount: matched.length, lostClicks: matched.filter((r) => r.clickChange < 0).sort((a, b) => a.clickChange - b.clickChange), omittedPairs: previous.rows.filter((r) => !current.rows.some((c) => c.query === r.query && c.page === r.page)).length };
}
export function searchOpportunities(rows: SearchRow[]) {
    return rows.filter((r) => r.impressions >= 100 && r.position <= 20 && r.clicks / r.impressions < .03).sort((a, b) => b.impressions - a.impressions);
}
export function searchCsv(value: SearchImport): string {
    const cell = (v: string | number) => { let text = String(v); if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))
        text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; };
    return SEARCH_TEMPLATE + value.rows.map((r) => [r.query, r.page, r.clicks, r.impressions, r.position, value.periodStart, value.periodEnd].map(cell).join(",")).join("\n");
}
export function parseLighthouse(ctx: SeoContext, text: string): Omit<LabImport, "id" | "importedAt"> {
    if (typeof text !== "string" || text.length > MAX_INPUT)
        throw new Error("Use Lighthouse JSON smaller than 700 KB (remove screenshots if needed).");
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        throw new Error("Paste valid Lighthouse JSON or a PageSpeed API response.");
    }
    if (!parsed || typeof parsed !== "object")
        throw new Error("The report must be a JSON object.");
    const wrapper = parsed as Record<string, unknown>;
    const report = (wrapper.lighthouseResult ?? wrapper) as Record<string, unknown>;
    if (!report || typeof report !== "object" || typeof report.finalUrl !== "string")
        throw new Error("The report needs Lighthouse finalUrl, fetchTime, configSettings and audits.");
    const url = sameStore(report.finalUrl, ctx);
    if (typeof report.fetchTime !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(report.fetchTime) || !Number.isFinite(Date.parse(report.fetchTime)) || Date.parse(report.fetchTime) > Date.now() + 300000)
        throw new Error("The report needs a valid, non-future fetchTime.");
    const config = report.configSettings as Record<string, unknown> | undefined;
    const device = config?.formFactor;
    if (device !== "mobile" && device !== "desktop")
        throw new Error("The report must identify a mobile or desktop formFactor.");
    const audits = report.audits as Record<string, {
        numericValue?: unknown;
        score?: unknown;
        title?: unknown;
        description?: unknown;
        details?: {
            overallSavingsMs?: unknown;
            items?: unknown[];
        };
    }>;
    if (!audits || typeof audits !== "object" || Array.isArray(audits))
        throw new Error("The report has no Lighthouse audits.");
    const finite = (n: unknown, max: number) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max ? n : null;
    const categories = report.categories as {
        performance?: {
            score?: unknown;
        };
    } | undefined;
    const score = finite(categories?.performance?.score, 1);
    const lcpMs = finite(audits["largest-contentful-paint"]?.numericValue, 1e7), cls = finite(audits["cumulative-layout-shift"]?.numericValue, 1000), tbtMs = finite(audits["total-blocking-time"]?.numericValue, 1e7);
    if ([lcpMs, cls, tbtMs].every((n) => n === null))
        throw new Error("The report has no valid LCP, CLS or TBT lab metrics.");
    const evidence = (items: unknown): string[] => {
        if (!Array.isArray(items))
            return [];
        const collect = (item: unknown, depth: number): string[] => {
            if (!item || typeof item !== "object" || depth > 3)
                return [];
            const allowed = new Set(["url", "snippet", "selector", "nodeLabel", "wastedBytes", "totalBytes", "wastedMs", "duration", "startTime", "value", "metric", "label", "type", "statistic"]);
            return Object.entries(item).slice(0, 30).flatMap(([key, v]) => allowed.has(key) && (typeof v === "string" || typeof v === "number") ? [`${key}: ${String(v).slice(0, 1600)}`] : typeof v === "object" ? collect(v, depth + 1) : []).slice(0, 30);
        };
        return items.slice(0, 12).map((item) => collect(item, 0).join("\n")).filter(Boolean);
    };
    const actions = Object.entries(audits).filter(([, a]) => a && typeof a.score === "number" && a.score >= 0 && a.score < 1 && typeof a.title === "string").slice(0, 30).map(([id, a]) => ({ id, title: String(a.title).slice(0, 500), description: typeof a.description === "string" ? a.description.slice(0, 2000) : "", savingsMs: finite(a.details?.overallSavingsMs, 1e7), evidence: evidence(a.details?.items) }));
    return { brandId: ctx.brandId, contextHash: ctx.contextHash, url, testedAt: new Date(report.fetchTime).toISOString(), device, performance: score === null ? null : Math.round(score * 100), lcpMs, cls, tbtMs, actions };
}
export function labRecommendation(issue: LabIssue) {
    const key = `${issue.id} ${issue.title}`.toLowerCase();
    if (/image|largest-contentful|lcp|responsive/.test(key))
        return { impact: "Shoppers may wait for the main product image before they can assess the item.", recommendation: "Find the affected image and its owning product or collection template. Serve a correctly sized compressed image with responsive sources. If it is the visible main image, avoid lazy loading it; keep below-the-fold images lazy loaded.", after: "The same product image remains visible with correct dimensions and responsive sources. Prioritize only the measured main image; do not preload every image.", validation: "Check mobile and desktop product images, variant switching, zoom and layout. Re-run the same Lighthouse test and inspect the image request timing." };
    if (/layout|cls|dimension/.test(key))
        return { impact: "Moving content can make product options or purchase controls harder to use.", recommendation: "Use the reported element to find its template. Reserve image and embed space with explicit width/height or aspect-ratio. Reserve banner space before it loads and avoid inserting content above the shopper's current position.", after: "Product images, announcements and embedded widgets occupy stable space while loading.", validation: "Record loading on a slow mobile connection. Check banners, cookie controls, images, cart drawer and variant changes; repeat the lab test." };
    if (/javascript|script|thread|blocking|unused|third-party|bootup|long-task/.test(key))
        return { impact: "Heavy scripts can delay interaction with variant selectors, menus and add-to-cart controls.", recommendation: "Identify the reported script's owner (theme, app or analytics). Remove unused modules or duplicate app code. Defer nonessential scripts until needed. Keep product, cart and consent dependencies intact; test one change at a time.", after: "The affected optional code loads only where and when it is required. Purchase-critical behavior continues to work.", validation: "Test consent, analytics events, menus, variants, add-to-cart and checkout handoff. Repeat with the same device and throttling; use field INP separately when available." };
    if (/css|render|font/.test(key))
        return { impact: "Blocking styles or fonts can delay readable product information or shift the page.", recommendation: "Locate the named stylesheet or font in the theme. Remove unused rules only after checking all affected templates. Load noncritical resources later and use a font display strategy that keeps text readable.", after: "Essential product information renders without waiting for optional styles or fonts, while the page retains its intended layout.", validation: "Check above-the-fold content, sale badges, pricing, variant controls and font fallback on mobile and desktop. Repeat the same lab test." };
    return { impact: "This diagnostic may affect how quickly a shopper can see or use this page. The lab report alone does not establish a ranking or revenue effect.", recommendation: "Use the exact resource or element below to locate the owning theme file or app. Follow this report's diagnostic, change the smallest affected component, and test in a duplicate theme before publishing.", after: "The reported condition is resolved for this page without breaking product selection, navigation or checkout handoff. Exact edits require the site's theme source.", validation: "Repeat the same URL, device and lab settings, and test the affected customer journey. Compare actual results without treating estimated savings as measured gains." };
}
export function labHandoff(report: LabImport, issue: LabIssue): string {
    const r = labRecommendation(issue);
    return [`# ${issue.title}`, "", `Target: ${report.url}`, `Imported report: ${report.id}`, `Lighthouse audit: ${issue.id}`, `Tested: ${report.testedAt} (${report.device})`, `Brand context: ${report.contextHash}`, "", "## Issue and shopper impact", r.impact, issue.description, "", "## Before: captured report evidence", ...(issue.evidence.length ? issue.evidence.map((e) => `\`\`\`text\n${e}\n\`\`\``) : ["No element or resource detail was included in this report. Inspect the affected page before editing."]), "", "## Recommended implementation", r.recommendation, "", "## Proposed after (not deployed or measured)", r.after, "", "## Developer steps", "1. Identify the owning template/app from the captured resource or selector. Obtain the current source and confirm the affected component.", "2. Duplicate the theme or create a version-controlled branch. Record the exact file and existing code before changing it.", "3. Apply the smallest change described above; have a human approve the code diff and staging result.", "4. Deploy manually, record the published URL/date, then verify.", "", "## Validation", r.validation, "", "## Rollback", "Restore the previous theme version or revert the exact commit if the page or purchase journey regresses. Re-test variants, cart and checkout handoff.", "", "## Measurement limits", "This is one imported lab test. TBT is not field INP; lab LCP/CLS do not establish a Core Web Vitals field pass. Lighthouse estimated savings are not observed gains. No live store changes are made by this handoff."].join("\n\n");
}
