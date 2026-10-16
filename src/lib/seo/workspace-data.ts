import type { SeoAudit, SeoSnapshot } from "./model";
export function workspaceEvidence(view: string, snapshot: SeoSnapshot, audit: SeoAudit) {
    if (["content", "changes", "learn", "opportunities", "outreach"].includes(view))
        return {
            snapshot: { ...snapshot, pages: [], crawl: undefined, observations: [], opportunities: view === "opportunities" ? snapshot.opportunities : [] },
            audit: { ...audit, checks: [], findings: [] },
        };
    if (view === "measurement")
        return {
            snapshot: { ...snapshot, observations: [], opportunities: [], pages: snapshot.pages.map((p) => ({ ...p, incomingLinks: null, contentSections: null, answeredQuestions: null, expectedQuestions: [], proofClaimIds: null, live: p.live ? { ...p.live, links: [], headings: [], contentText: undefined, productOffers: [], sourceSamples: [], productSchema: [], canonicalRaw: [], questionHeadings: [], insecureResources: [] } : undefined })) },
            audit: { ...audit, checks: [], findings: [] },
        };
    return { snapshot, audit };
}
