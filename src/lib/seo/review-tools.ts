import type { SeoContext, SeoFinding, SeoPage, SeoSnapshot } from "./model";
import type { SearchImport } from "./measurement";
import type { SearchPlanRow } from "./planning";
import { normalizeQuery } from "./planning";
import { storeTarget } from "./optimization";
import { tokenizeHtml } from "./html";
import type { VisibilityRun } from "./visibility";
export type CodeProposal = {
    targetUrl: string;
    ruleId: string;
    capturedAt: string;
    sourceHash: string;
    line: number;
    before: string;
    after: string;
    reason: string;
    bytesBefore: number;
    bytesAfter: number;
    byteReduction: number;
    countsBefore: ReturnType<typeof excerptFieldCounts>;
    countsAfter: ReturnType<typeof excerptFieldCounts>;
    patch: string;
    effect: string;
};
export function replaceInSuppliedSource(source: string, before: string, after: string) {
    if (!before || !after.trim() || source.length > 500000)
        throw new Error("Provide source smaller than 500 KB and a complete replacement.");
    const index = source.indexOf(before);
    if (index < 0 || source.indexOf(before, index + before.length) >= 0)
        throw new Error("The exact captured excerpt must occur once in this supplied source. Resolve missing or ambiguous matches before downloading an edit.");
    return source.slice(0, index) + after + source.slice(index + before.length);
}
export function suggestedCodeReplacement(finding: SeoFinding, page: SeoPage, ctx: SeoContext, before: string): string | null {
    if (finding.ruleId.startsWith("SEO-DUPLICATE-"))
        return null;
    const rule = finding.ruleId.replace("SEO-DUPLICATE-", "SEO-"), product = ctx.products.find((p) => p.id === page.productId);
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const label = product?.name || page.h1?.split(" | ")[0];
    const insert = (tag: string) => /^<(head|main)\b/i.test(before) ? `${before}\n${tag}` : tag;
    if (rule === "SEO-TITLE" && label)
        return insert(`<title>${esc(label)} | ${esc(ctx.brandName)}</title>`);
    if (rule === "SEO-DESCRIPTION" && label)
        return insert(`<meta name="description" content="${esc(`Explore ${label} from ${ctx.brandName}. Review the current product details and available options.`)}">`);
    if (rule === "SEO-HEADING" && label)
        return insert(`<h1>${esc(label)}</h1>`);
    if (rule === "SEO-CANONICAL" && page.expectedCanonical) {
        try {
            const url = storeTarget(ctx, page.expectedCanonical);
            return /^<head\b/i.test(before) ? insert(`<link rel="canonical" href="${esc(url)}">`) : before.replace(/\bhref\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, `href="${esc(url)}"`);
        }
        catch {
            return null;
        }
    }
    if (rule === "SEO-INDEX" && page.intendedIndexable && /^<meta\b/i.test(before))
        return before.replace(/\bcontent\s*=\s*("([^"]*)"|'([^']*)')/i, (_m, _quoted, double: string, single: string) => `content="${esc((double ?? single).split(/[\s,]+/).filter((s) => !/^(noindex|none)$/i.test(s)).join(", ") || "index")}"`);
    if (rule === "SECURITY-MIXED-CONTENT")
        return before.replace(/http:\/\//g, "https://");
    return null;
}
export function codeProposal(finding: SeoFinding, page: SeoPage, sampleIndex: number, after: string, reason: string): CodeProposal {
    const rule = finding.ruleId.replace("SEO-DUPLICATE-", "SEO-");
    const samples = page.live?.sourceSamples?.filter((s) => s.ruleId === rule) ?? [];
    const sample = samples[sampleIndex];
    if (page.mode !== "live" || page.url !== finding.url || !sample || !page.live?.sourceHash || !page.live.fetchedAt)
        throw new Error("A dated, captured HTML excerpt is required. Rerun the audit; missing fields need a separately reviewed insertion.");
    if (sample.code.includes("[excerpt truncated]"))
        throw new Error("This excerpt is truncated. Inspect the complete source before proposing a replacement.");
    if (!after.trim() || after.length > 20000 || after === sample.code || reason.trim().length < 20 || reason.length > 2000)
        throw new Error("Provide changed replacement code and a specific reason of at least 20 characters.");
    const bytes = (s: string) => new TextEncoder().encode(s).length;
    const patch = [`--- captured-response.html`, `+++ proposed-response.html`, `@@ -${sample.line},${sample.code.split("\n").length} +${sample.line},${after.split("\n").length} @@`, ...sample.code.split("\n").map((s) => `-${s}`), ...after.split("\n").map((s) => `+${s}`)].join("\n") + "\n";
    return { targetUrl: page.url, ruleId: finding.ruleId, capturedAt: page.live.fetchedAt, sourceHash: page.live.sourceHash, line: sample.line, before: sample.code, after, reason: reason.trim(), bytesBefore: bytes(sample.code), bytesAfter: bytes(after), byteReduction: bytes(sample.code) - bytes(after), countsBefore: excerptFieldCounts(sample.code), countsAfter: excerptFieldCounts(after), patch,
        effect: "Only the UTF-8 byte difference and parsed field counts of this excerpt are measured. Whole-page issue resolution, load time, search rankings, traffic and conversion effects are untested and unknown. The developer must locate this output's real owner; no theme or store was changed." };
}
export function inferBuyerIntent(query: string): SearchPlanRow["intent"] {
    const q = normalizeQuery(query);
    if (/\b(buy|order|shop|price|coupon|discount|delivery|shipping|in stock)\b/.test(q))
        return "transactional";
    if (/\b(best|vs|versus|compare|comparison|review|reviews|alternatives)\b/.test(q))
        return "commercial";
    return "informational";
}
export function queryIntentGroups(report: SearchImport, plan: SearchPlanRow[]) {
    const queries = new Map<string, {
        query: string;
        clicks: number;
        impressions: number;
        urls: Set<string>;
    }>();
    for (const row of report.rows) {
        const key = normalizeQuery(row.query), current = queries.get(key) ?? { query: row.query, clicks: 0, impressions: 0, urls: new Set<string>() };
        current.clicks += row.clicks;
        current.impressions += row.impressions;
        current.urls.add(row.page);
        queries.set(key, current);
    }
    return [...queries.values()].map((row) => {
        const mapped = plan.filter((p) => normalizeQuery(p.keyword) === normalizeQuery(row.query));
        return { query: row.query, clicks: row.clicks, impressions: row.impressions, ctr: row.impressions ? row.clicks / row.impressions : null, observedUrls: [...row.urls], intent: mapped[0]?.intent ?? inferBuyerIntent(row.query), intentSource: mapped.length ? "Reviewed plan" : "Heuristic — review before mapping", proposedUrls: [...new Set(mapped.map((p) => p.targetUrl))], demand: "Clicks and impressions measured in the imported scope; total search volume and difficulty unknown." };
    }).sort((a, b) => b.impressions - a.impressions).slice(0, 300);
}
const stop = new Set("the and with for your from this that how what why are can our you products product shop collection guide".split(" "));
const words = (p: SeoPage) => new Set(normalizeQuery([p.title, p.h1, ...(p.contentSections ?? [])].join(" ")).split(" ").filter((w) => w.length > 2 && !stop.has(w)));
const shingles = (p: SeoPage) => { const tokens = normalizeQuery(p.live?.contentText ?? "").split(" ").filter(Boolean).slice(0, 700); return new Set(tokens.slice(0, -2).map((t, n) => `${t} ${tokens[n + 1]} ${tokens[n + 2]}`)); };
export function pageOverlap(snapshot: SeoSnapshot, report?: SearchImport) {
    const pages = snapshot.pages.filter((p) => p.live?.htmlInspected && p.statusCode === 200 && p.intendedIndexable && !p.noindex).slice(0, 250);
    const labels = pages.map(words), content = pages.map(shingles);
    const rows: {
        left: string;
        right: string;
        sharedTerms: string[];
        similarity: number;
        contentSimilarity: number | null;
        contentScope: string;
        sharedQueries: string[];
        explanation: string;
    }[] = [];
    for (let a = 0; a < pages.length; a++)
        for (let b = a + 1; b < pages.length; b++) {
            const left = pages[a], right = pages[b], x = labels[a], y = labels[b], sharedTerms = [...x].filter((w) => y.has(w));
            const union = new Set([...x, ...y]).size, similarity = union ? sharedTerms.length / union : 0;
            const cx = content[a], cy = content[b], sharedContent = [...cx].filter((s) => cy.has(s)).length, contentUnion = cx.size + cy.size - sharedContent;
            const contentSimilarity = cx.size >= 10 && cy.size >= 10 ? sharedContent / contentUnion : null;
            const leftQueries = new Set(report?.rows.filter((r) => r.page === left.url).map((r) => normalizeQuery(r.query)) ?? []);
            const sharedQueries = [...new Set(report?.rows.filter((r) => r.page === right.url && leftQueries.has(normalizeQuery(r.query))).map((r) => r.query) ?? [])];
            if ((similarity >= 0.6 && sharedTerms.length >= 3) || (contentSimilarity !== null && contentSimilarity >= 0.45 && sharedContent >= 10) || sharedQueries.length)
                rows.push({ left: left.url, right: right.url, sharedTerms: sharedTerms.slice(0, 12), similarity, contentSimilarity, contentScope: `${left.live?.contentScope ?? "Earlier capture: body text unavailable."} ${right.live?.contentScope ?? "Earlier capture: body text unavailable."}`, sharedQueries: sharedQueries.slice(0, 20), explanation: sharedQueries.length ? "Both URLs received impressions for these exact imported queries. Review page purpose, variant/market differences and query intent before choosing differentiation or consolidation. This does not prove ranking loss or cannibalization." : "Captured labels or bounded body text overlap. Inspect the full content and distinct shopper purpose; similarity alone does not justify deleting or redirecting a page." });
        }
    return rows.sort((a, b) => b.sharedQueries.length - a.sharedQueries.length || b.similarity - a.similarity).slice(0, 40);
}
export function insertDraftLink(ctx: SeoContext, body: string, anchor: string, rawUrl: string, occurrence = 0): string {
    const url = storeTarget(ctx, rawUrl).replace(/\(/g, "%28").replace(/\)/g, "%29");
    if (!anchor.trim() || anchor !== anchor.trim() || anchor.length > 160 || /[\[\]\r\n<>`*\\]/.test(anchor) || !Number.isInteger(occurrence) || occurrence < 0)
        throw new Error("Choose a short exact plain-text anchor in the article.");
    const excluded: [
        number,
        number
    ][] = [];
    for (const match of body.matchAll(/!?\[[^\]]*\]\([^)]*\)|```[\s\S]*?```|`[^`]*`|^#{1,6} .*$/gm))
        excluded.push([match.index!, match.index! + match[0].length]);
    const positions: number[] = [];
    const word = (s: string) => /[\p{L}\p{N}_]/u.test(s);
    for (let offset = 0; offset < body.length;) {
        const at = body.indexOf(anchor, offset);
        if (at < 0)
            break;
        const partialWord = (word(anchor[0]) && at > 0 && word(body[at - 1])) || (word(anchor.at(-1)!) && at + anchor.length < body.length && word(body[at + anchor.length]));
        if (!partialWord && !excluded.some(([start, end]) => at < end && at + anchor.length > start))
            positions.push(at);
        offset = at + anchor.length;
    }
    const at = positions[occurrence];
    if (at === undefined)
        throw new Error("The selected anchor occurrence is not available in plain article copy.");
    return body.slice(0, at) + `[${anchor}](${url})` + body.slice(at + anchor.length);
}
export function schemaReconciliation(page: SeoPage | undefined, proposed: {
    productName?: string;
    price?: string;
    currency?: string;
    availability?: string;
    sku?: string;
}) {
    if (!page?.live?.htmlInspected)
        return ["Captured source unavailable. Existing schema owners and visible product facts remain unknown."];
    const notes: string[] = [], products = page.live.productSchema;
    if (products.length > 1)
        notes.push(`${products.length} Product objects captured. Identify their variant IDs and owners; multiple distinct variants can be intentional. Do not add another owner blindly.`);
    if (products.some((p) => p.name && proposed.productName && p.name !== proposed.productName))
        notes.push("Proposed name differs from a captured Product name. Confirm selected variant and SKU.");
    for (const field of ["price", "currency", "availability", "sku"] as const) {
        const value = (s: string) => field === "price" && /^\d+(?:\.\d+)?$/.test(s) ? String(Number(s)) : s;
        const values = [...new Set((page.live.productOffers ?? []).map((p) => value(p[field])).filter(Boolean))];
        if (values.length > 1)
            notes.push(`Captured offers contain multiple ${field} values: ${values.join(", ")}. Check variant scope before replacing markup.`);
        if (proposed[field] && values.length && !values.includes(value(proposed[field])))
            notes.push(`Proposed ${field} ${proposed[field]} differs from captured offer values ${values.join(", ")}. Captured schema is not proof of visible purchase terms.`);
    }
    if (page.visiblePrice !== null && proposed.price && Number(proposed.price) !== page.visiblePrice)
        notes.push(`Proposed price differs from independently captured visible price ${page.visiblePrice}.`);
    if (page.visibleAvailability !== null && proposed.availability && proposed.availability !== page.visibleAvailability)
        notes.push("Proposed availability differs from captured visible availability.");
    if (page.visiblePrice === null || page.visibleAvailability === null)
        notes.push("Visible selected-variant price or stock was not independently verified. Human confirmation of the same market and variant is required.");
    if (page.live.invalidJsonLd)
        notes.push(`${page.live.invalidJsonLd} JSON-LD blocks failed parsing; inspect their actual owner.`);
    return notes.length ? notes : ["No conflict detected in the limited captured fields. This is not rich-result eligibility or a guarantee that all visible facts match."];
}
export function compareVisibilityRuns(before: VisibilityRun, after: VisibilityRun) {
    const reasons: string[] = [];
    if (before.id === after.id)
        reasons.push("Choose two different saved runs.");
    if (before.brandId !== after.brandId || before.contextHash !== after.contextHash)
        reasons.push("Brand or Brand Brain context differs.");
    if (before.locale !== after.locale)
        reasons.push("Market instructions differ.");
    if (before.status === "running" || after.status === "running")
        reasons.push("Collection is still running.");
    if (Date.parse(before.startedAt) >= Date.parse(after.startedAt))
        reasons.push("The earlier run must precede the later run.");
    if (before.plannedResponses !== after.plannedResponses)
        reasons.push("Planned response counts differ.");
    for (const field of ["promptIds", "modelIds"] as const)
        if (before[field] && after[field] && JSON.stringify([...before[field]!].sort()) !== JSON.stringify([...after[field]!].sort()))
            reasons.push(`Selected ${field === "promptIds" ? "question" : "model"} plan differs.`);
    const key = (o: VisibilityRun["observations"][number]) => JSON.stringify([o.prompt.text, o.prompt.stage ?? "unclassified", o.prompt.cohort, o.prompt.productId, o.prompt.targetUrl, o.provider, o.model, o.locale, o.repeat]);
    const left = new Map(before.observations.map((o) => [key(o), o])), right = new Map(after.observations.map((o) => [key(o), o]));
    if (left.size !== before.observations.length || right.size !== after.observations.length)
        reasons.push("Duplicate question/model/repeat records cannot be paired reliably.");
    if (left.size !== right.size || [...left.keys()].some((k) => !right.has(k)))
        reasons.push("Questions, actual model IDs, reference context or repeat counts differ.");
    if (!left.size)
        reasons.push("No observations to compare.");
    const citation = (o: VisibilityRun["observations"][number]) => o.status === "completed" && !(o.storeCited === false && o.citationAssessmentComplete === false) ? o.storeCited : null;
    const pairs = [...left.entries()].flatMap(([k, a]) => { const b = right.get(k); if (!b)
        return []; return [{ question: a.prompt.text, model: a.model, repeat: a.repeat, beforeMention: a.status === "completed" ? a.brandMentioned : null, afterMention: b.status === "completed" ? b.brandMentioned : null, beforeCitation: citation(a), afterCitation: citation(b) }]; });
    const metric = (field: "Mention" | "Citation") => { const assessed = pairs.filter((p) => p[`before${field}`] !== null && p[`after${field}`] !== null); return { assessed: assessed.length, unknown: pairs.length - assessed.length, before: assessed.filter((p) => p[`before${field}`]).length, after: assessed.filter((p) => p[`after${field}`]).length }; };
    return { comparable: !reasons.length, reasons, pairs, mentions: metric("Mention"), citations: metric("Citation"), limitation: "Matched API response samples only. Failures and unresolved citations stay unknown; changes do not establish consumer search rank, causal lift or revenue." };
}
export function articleInternalLinks(ctx: SeoContext, body: string) {
    return [...body.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].flatMap((match) => { try {
        return [{ anchor: match[1], url: storeTarget(ctx, match[2]) }];
    }
    catch {
        return [];
    } });
}
export function excerptFieldCounts(html: string) { const tags = tokenizeHtml(html); return { title: tags.filter((t) => t.name === "title").length, canonical: tags.filter((t) => t.name === "link" && t.attrs.rel?.toLowerCase().split(/\s+/).includes("canonical")).length, missingAlt: tags.filter((t) => t.name === "img" && !("alt" in t.attrs)).length }; }
