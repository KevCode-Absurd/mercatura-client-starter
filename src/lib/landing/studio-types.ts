import { z } from "zod";
import type { PageEvidence } from "./evidence";
import { QualityBriefSchema } from "./quality-types";
export const CRO_PAGE_TYPES = ["pdp", "home", "collection", "advertorial", "listicle", "quiz"] as const;
export const StudioRequest = z.object({
    brandId: z.string().min(1), mode: z.enum(["audit", "reference", "scratch"]),
    pageType: z.enum(CRO_PAGE_TYPES), scope: z.enum(["page", "store"]).default("page"),
    sourceUrl: z.string().max(2048).default(""), productId: z.string().default(""),
    personaId: z.string().default(""), fidelity: z.enum(["exact", "structure", "loose"]).default("structure"),
    notes: z.string().max(6000).default(""), build: z.boolean().default(false),
    goal: z.string().max(2000).default(""), trafficSource: z.string().max(1000).default(""), awarenessStage: z.string().max(1000).default(""),
    inspirationUrl: z.string().max(2048).default(""),
    taskBrief: QualityBriefSchema.pick({ task: true, structure: true, buyerQuestion: true, trafficContext: true }).optional(),
    redesignMode: z.enum(["targeted", "full"]).default("full"),
    adId: z.string().max(240).default(""),
    adContext: z.object({ id: z.string(), title: z.string(), productId: z.string(), personaId: z.string(), promise: z.string(), offer: z.string(), awareness: z.string() }).optional(),
    selectedUrls: z.array(z.string().url()).max(12).default([]),
});
export type CroRequest = z.infer<typeof StudioRequest>;
const key = z.string().regex(/^[a-z][a-z0-9_-]{0,47}$/);
export const FINDING_AREAS = ["clarity", "copy", "offer", "proof", "friction", "imagery", "mobile", "accessibility"] as const;
export type FindingArea = (typeof FINDING_AREAS)[number];
const findingArea = z.string().describe(`One of ${FINDING_AREAS.join(", ")}`).transform((area): FindingArea => (FINDING_AREAS as readonly string[]).includes(area) ? (area as FindingArea) : "clarity");
export const FindingSchema = z.object({
    id: key, sectionId: z.string(), viewport: z.enum(["mobile", "desktop"]),
    area: findingArea,
    title: z.string(), observation: z.string(), evidenceQuote: z.string(), recommendation: z.string(),
    priority: z.enum(["high", "medium", "low"]), confidence: z.enum(["high", "medium", "low"]),
    metric: z.string(), knowledgeIds: z.array(z.string()),
});
export const AUDIT_CRITERIA = ["value_proposition", "product_understanding", "offer_clarity", "proof", "objections", "purchase_path", "mobile_layout", "visual_hierarchy", "accessibility", "brand_consistency"] as const;
export const AuditSchema = z.object({ summary: z.string(), strengths: z.array(z.string()), unknowns: z.array(z.string()), findings: z.array(FindingSchema).max(32), checks: z.array(z.object({ id: z.enum(AUDIT_CRITERIA), status: z.enum(["pass", "partial", "fail", "not_assessed"]), evidence: z.string() })).max(10) });
export type CroAudit = z.infer<typeof AuditSchema>;
export const ReviewDecisionSchema = z.object({ findingKey: z.string().min(1).max(512), decision: z.enum(["accept", "reject"]), note: z.string().max(2000).default("") });
export const ReviewInputSchema = z.object({ decisions: z.array(ReviewDecisionSchema).max(512), customerNotes: z.string().max(6000).default(""), redesignMode: z.enum(["targeted", "full"]).default("full"), selectedDirectionId: z.string().max(120).default("") });
export type CroReview = z.infer<typeof ReviewInputSchema> & {
    updatedAt: string;
    auditHash: string;
};
export type CroReviewFinding = {
    key: string;
    sourceUrl: string;
    finding: z.infer<typeof FindingSchema>;
};
export type CroApproval = {
    approvedAt: string;
    runRevision: number;
    auditHash: string;
    reviewHash: string;
    acceptedFindings: (CroReviewFinding & {
        note: string;
    })[];
    customerNotes: string;
    redesignMode: "targeted" | "full";
    selectedDirectionId: string;
};
export const PlanSectionSchema = z.object({ id: key, label: z.string(), purpose: z.string(), layout: z.string(), referenceSectionId: z.string(), findingIds: z.array(z.string()), knowledgeIds: z.array(z.string()) });
export const BlueprintSchema = z.object({ title: z.string(), strategy: z.string(), sections: z.array(PlanSectionSchema).min(3).max(20) });
export type CroBlueprint = z.infer<typeof BlueprintSchema>;
export const SectionDesignSchema = z.object({
    html: z.string().max(30000), css: z.string().max(20000),
    copy: z.array(z.object({ key, text: z.string().max(6000) })).max(40),
    images: z.array(z.object({ key, assetId: z.string(), alt: z.string() })).max(15),
    visual: z.object({ spacePx: z.number().int().min(0).max(120), readingCh: z.number().int().min(30).max(85), imageRatio: z.enum(["original", "1:1", "4:5", "16:9"]), focalX: z.number().int().min(0).max(100), focalY: z.number().int().min(0).max(100) }).optional(),
});
export type CroSection = z.infer<typeof SectionDesignSchema> & {
    id: string;
    label: string;
    enabled: boolean;
    version: number;
};
export type CroAsset = {
    id: string;
    src: string;
    name: string;
    productId: string;
    local: string | null;
};
export type CroFont = {
    family: string;
    weight: string;
    style: "normal" | "italic";
    file: string;
};
export type CroBrandSnapshot = {
    name: string;
    category: string;
    siteUrl: string;
    productUrl: string;
    productName: string;
    productHandle: string;
    currency: string;
    tokens: Record<string, string>;
    fonts: CroFont[];
    assets: CroAsset[];
    hash: string;
    products?: {
        id: string;
        name: string;
        url: string;
    }[];
};
export type CroCoverage = {
    surface: string;
    url: string;
    status: "captured" | "unavailable" | "failed";
    evidenceId?: string;
    reason?: string;
    audit?: CroAudit;
};
export type CroQuality = {
    checkedAt: string;
    warnings: string[];
    mobileShot?: string;
    desktopShot?: string;
    failures: string[];
    designChecks?: import("./studio-design-checks").CroDesignChecks[];
};
export type CroRun = {
    id: string;
    brandId: string;
    createdAt: string;
    updatedAt: string;
    request: CroRequest;
    status: "queued" | "running" | "review" | "done" | "failed";
    stage: string;
    error?: string;
    brand: CroBrandSnapshot;
    evidence?: PageEvidence;
    inspirationEvidence?: PageEvidence;
    coverage: CroCoverage[];
    audit?: CroAudit;
    blueprint?: CroBlueprint;
    sections: CroSection[];
    revisions: {
        at: string;
        section: CroSection;
    }[];
    quality?: CroQuality;
    knowledge: {
        id: string;
        title: string;
        source: string;
    }[];
    costUsd: number;
    revision: number;
    quiz?: import("./quiz").CroQuiz;
    review?: CroReview;
    approval?: CroApproval;
    generationApprovalHash?: string;
    auditKind?: "page" | "readiness";
    directions?: import("./studio-direction").CroDirectionSet;
    storyboard?: import("./studio-direction").CroPageStoryboard;
    visualReview?: import("./studio-visual-review").CroVisualReview;
    visualReviewFingerprint?: string;
    editRequests?: {
        sectionId: string;
        note: string;
        kind: string;
        at: string;
    }[];
    projectRevisions?: {
        id: string;
        at: string;
        action: string;
        sections: CroSection[];
        blueprint?: CroBlueprint;
        storyboard?: import("./studio-direction").CroPageStoryboard;
    }[];
    localChecks?: import("./studio-local-checks").CroLocalCheck[];
    imageWorkOrders?: {
        sectionId: string;
        slotId: string;
        imageRunId: string;
        createdAt: string;
    }[];
    reusedSections?: {
        sectionId: string;
        sourceRunId: string;
        sourceSectionId: string;
        reviewNote: string;
        at: string;
    }[];
    layoutRepairReceipt?: {
        at: string;
        sectionIds: string[];
        untouched: Record<string, string>;
        copyPreserved: boolean;
        wholePageRechecked: boolean;
    };
};
export function croScore(audit: CroAudit): {
    score: number | null;
    assessed: number;
    total: number;
} {
    const checks = AUDIT_CRITERIA.flatMap(id => { const check = audit.checks.find(c => c.id === id); return check && check.status !== "not_assessed" ? [check] : []; });
    return { score: checks.length ? Math.round(checks.reduce((n, c) => n + (c.status === "pass" ? 1 : c.status === "partial" ? .5 : 0), 0) / checks.length * 100) : null, assessed: checks.length, total: AUDIT_CRITERIA.length };
}
