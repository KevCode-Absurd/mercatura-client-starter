import { z } from "zod";
import type { SeoContext } from "./model";
import { analyzeVisibilityAnswer, type VisibilityRun, type VisibilityStage } from "./visibility";
export type CitationEvidence = {
    observationId: string;
    question: string;
    stage: VisibilityStage | "unclassified";
    provider: string;
    model: string;
    observedAt: string;
    repeat: number;
    brandAbsent: boolean;
    citedUrl: string;
};
export type CitationOpportunity = {
    url: string;
    title: string;
    domain: string;
    evidence: CitationEvidence[];
    missingResponses: number;
    missingModels: number;
    stages: CitationEvidence["stage"][];
};
export type CitationInspection = {
    checkedAt: string;
    finalUrl: string;
    title: string;
    excerpt: string;
    brandPresence: "present" | "not-found" | "unknown";
    note: string;
};
export const outreachStatuses = ["draft", "reviewed", "contacted", "featured", "dismissed"] as const;
export type CitationOutreachDraft = {
    id: string;
    brandId: string;
    contextHash: string;
    runId: string;
    locale: string;
    source: CitationOpportunity;
    inspection?: CitationInspection;
    subject: string;
    body: string;
    contactName: string;
    contactEmail: string;
    notes: string;
    status: typeof outreachStatuses[number];
    featuredUrl: string;
    revision: number;
    createdAt: string;
    updatedAt: string;
};
export function citationIdentity(value: string): string | null {
    try {
        const url = new URL(value), host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
        if (!/^https?:$/.test(url.protocol) || url.username || url.password || !host.includes(".")
            || /(?:^|\.)(?:localhost|local|internal|invalid|test)$/.test(host)
            || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":"))
            return null;
        if (host === "vertexaisearch.cloud.google.com" || host === "grounding-api-redirects.googleapis.com")
            return null;
        url.hash = "";
        for (const key of [...url.searchParams.keys()])
            if (/^(?:utm_.+|gclid|fbclid|msclkid)$/i.test(key))
                url.searchParams.delete(key);
        url.searchParams.sort();
        return url.href;
    }
    catch {
        return null;
    }
}
export function citationComparisonKey(value: string): string | null {
    const identity = citationIdentity(value);
    if (!identity)
        return null;
    const url = new URL(identity);
    url.hostname = url.hostname.replace(/^www\./, "").replace(/\.$/, "");
    return url.href;
}
const ownHost = (ctx: SeoContext) => {
    try {
        return new URL(ctx.websiteUrl ?? "").hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    }
    catch {
        return "";
    }
};
export function citationOpportunities(ctx: SeoContext, run?: VisibilityRun): CitationOpportunity[] {
    if (!run || run.brandId !== ctx.brandId || run.contextHash !== ctx.contextHash)
        return [];
    const own = ownHost(ctx), rows = new Map<string, CitationOpportunity>();
    for (const observation of run.observations) {
        if (observation.status !== "completed" || !observation.answer.trim())
            continue;
        for (const citation of observation.citations) {
            const url = citationIdentity(citation.url);
            if (!url)
                continue;
            const key = new URL(citationComparisonKey(url)!);
            const domain = key.hostname;
            if (own && (domain === own || domain.endsWith(`.${own}`)))
                continue;
            const row = rows.get(key.href) ?? { url, title: citation.title.trim() || domain, domain, evidence: [], missingResponses: 0, missingModels: 0, stages: [] };
            if (!row.evidence.some(e => e.observationId === observation.id))
                row.evidence.push({
                    observationId: observation.id, question: observation.prompt.text, stage: observation.prompt.stage ?? "unclassified",
                    provider: observation.provider, model: observation.model, observedAt: observation.observedAt, repeat: observation.repeat,
                    brandAbsent: observation.brandMentioned === false, citedUrl: citation.url,
                });
            rows.set(key.href, row);
        }
    }
    return [...rows.values()].flatMap(row => {
        const missing = row.evidence.filter(e => e.brandAbsent);
        return missing.length ? [{ ...row, missingResponses: missing.length, missingModels: new Set(missing.map(e => `${e.provider}:${e.model}`)).size, stages: [...new Set(missing.map(e => e.stage))] }] : [];
    }).sort((a, b) => b.missingModels - a.missingModels || b.missingResponses - a.missingResponses || a.url.localeCompare(b.url));
}
export const outreachEditSchema = z.object({
    subject: z.string().trim().min(3).max(240).refine(s => !/[\r\n]/.test(s), "Keep the subject on one line."),
    body: z.string().trim().min(20).max(12000), contactName: z.string().trim().max(150),
    contactEmail: z.union([z.literal(""), z.email()]), notes: z.string().trim().max(4000),
    status: z.enum(outreachStatuses), featuredUrl: z.string().trim().max(2000),
}).refine(v => !v.featuredUrl || !!citationIdentity(v.featuredUrl), "Enter a public featured-page URL.")
    .refine(v => v.status !== "featured" || !!v.featuredUrl, "Record the published page URL before marking featured.");
const line = (text: string, max = 300) => text.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
export function createCitationDraft(ctx: SeoContext, run: VisibilityRun, source: CitationOpportunity, id: string, at: string): CitationOutreachDraft {
    const evidence = source.evidence.find(e => e.brandAbsent);
    if (!evidence || !citationOpportunities(ctx, run).some(s => s.url === source.url))
        throw new Error("Choose a cited source with a recorded brand gap in this run.");
    const observation = run.observations.find(o => o.id === evidence.observationId)!;
    const product = ctx.products.find(p => p.id === observation.prompt.productId);
    const educational = evidence.stage === "problem" || evidence.stage === "exploration";
    const facts = ctx.claims.filter(c => c.text.trim().length <= 1000 && citationIdentity(c.source) && !ctx.forbiddenClaims.some(f => f.trim() && c.text.toLowerCase().includes(f.toLowerCase()))).slice(0, 3);
    const body = [
        "Hi [editor name],", "",
        `I'm reaching out from ${line(ctx.brandName)} about your page, “${line(source.title)}”:`, source.url, "",
        `We're looking at the questions customers ask in ${line(run.locale)}, including: “${line(evidence.question, 1000)}”`,
        educational ? "Would you consider a relevant expert contribution or a sourced explanation from our team if it would help readers with that question?"
            : `Would you consider ${line(product?.name ?? ctx.brandName)} for an independent review or a relevant update to this page?`, "",
        ...(product ? [`Product to evaluate: ${line(product.name)}${product.url && citationIdentity(product.url) ? ` — ${product.url}` : ""}`] : []),
        ...(facts.length ? ["Here are documented facts you can check:", ...facts.map(c => `- ${line(c.text, 1000)} — ${c.source}`)] : []),
        ...(ctx.websiteUrl && citationIdentity(ctx.websiteUrl) ? [`Official information: ${ctx.websiteUrl}`] : []), "",
        "If this fits your editorial plans, please let me know what information you would need to assess it. We're happy to answer questions and provide the supporting sources.",
        "Any inclusion and conclusions would be yours to decide. Please let us know your disclosure requirements for any commercial relationship.", "",
        "Thanks,", "[your name]", line(ctx.brandName),
    ].join("\n");
    return { id, brandId: ctx.brandId, contextHash: ctx.contextHash, runId: run.id, locale: run.locale, source,
        subject: line(`${educational ? "Sourced contribution" : "Independent review consideration"}: ${ctx.brandName} for ${source.title}`, 240), body,
        contactName: "", contactEmail: "", notes: "", status: "draft", featuredUrl: "", revision: 1, createdAt: at, updatedAt: at };
}
export function sourceBrandPresence(ctx: SeoContext, text: string) {
    return analyzeVisibilityAnswer(ctx, text, []).brandMentioned === true;
}
