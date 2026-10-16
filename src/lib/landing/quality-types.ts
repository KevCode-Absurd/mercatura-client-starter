import { z } from "zod";
import type { CroRun } from "./studio-types";
export const BUYING_TASKS = ["purchase", "compatibility", "explanation", "comparison", "selection", "story"] as const;
export const PAGE_STRUCTURES = ["pdp", "explanation", "comparison", "listicle", "quiz"] as const;
const text = z.string().max(6000);
export const QualityTermsSchema = z.object({
    offerId: text.default(""), source: text.default(""), productId: text.default(""), variant: text.default(""),
    currency: z.string().max(8).default(""), quantity: z.number().positive().nullable().default(null), quantityUnit: text.default(""), price: z.number().nonnegative().nullable().default(null),
    cadence: z.string().max(200).default(""), renewalPrice: z.number().nonnegative().nullable().default(null), renewalTerms: text.default(""),
    comparisonPrice: z.number().nonnegative().nullable().default(null), comparisonQuantity: z.number().positive().nullable().default(null),
    comparisonCadence: z.string().max(200).default(""), comparisonProductId: text.default(""), comparisonVariant: text.default(""), comparisonSource: text.default(""),
    shipping: text.default(""), returns: text.default(""), qualification: text.default(""),
});
export type QualityTerms = z.infer<typeof QualityTermsSchema>;
export const QualityBriefSchema = z.object({
    buyerQuestion: text.default(""), task: z.enum(BUYING_TASKS).default("purchase"), structure: z.enum(PAGE_STRUCTURES).default("pdp"),
    trafficContext: text.default("User-supplied audience context; no performance inference."), promise: text.default(""),
    productId: text.default(""), variant: text.default(""), qualifiers: z.array(text).max(30).default([]), destination: text.default(""),
    proofRequirements: z.array(z.object({ id: text, statement: text, source: text, excerpt: text, sectionId: text })).max(40).default([]),
    terms: QualityTermsSchema.prefault({}),
});
export type QualityBrief = z.infer<typeof QualityBriefSchema>;
export const QualityQuestionSchema = z.object({ id: text, question: text, answer: text, priority: z.number().int().min(1).max(5), sectionId: text,
    source: text, quote: text, origin: z.enum(["research", "document", "faq", "hypothesis"]),
});
export type QualityQuestion = z.infer<typeof QualityQuestionSchema>;
export const QualityImageSchema = z.object({ slotId: text, sectionId: text, assetId: text, productId: text,
    role: z.enum(["identity", "detail", "use", "scale", "demonstration", "proof", "decoration", "comparison"]),
    provenance: z.enum(["real", "generated", "unknown"]), source: text, evidence: text, question: text,
    mobileCrop: z.enum(["unreviewed", "answers_question", "loses_detail"]), desktopCrop: z.enum(["unreviewed", "answers_question", "loses_detail"]),
});
export type QualityImage = z.infer<typeof QualityImageSchema>;
export const SHOPPER_TASKS = ["identify_product", "reason_to_consider", "find_objection_answer", "price_and_terms", "next_action"] as const;
export const QualityObservationSchema = z.object({ task: z.enum(SHOPPER_TASKS), result: z.enum(["clear", "confused", "not_reviewed"]),
    response: text, sectionId: text, evidence: text, reviewer: text, kind: z.enum(["editorial", "observed_person"]),
    viewport: z.number().int().min(280).max(1920).default(390), fingerprint: text,
});
export type QualityObservation = z.infer<typeof QualityObservationSchema>;
export const QualitySeoSchema = z.object({ title: z.string().max(300).default(""), description: z.string().max(600).default(""),
    canonical: z.string().max(2048).default(""), indexability: z.enum(["undecided", "index", "noindex"]).default("undecided"), purpose: text.default(""),
});
export type QualityFinding = {
    id: string;
    area: string;
    sectionId: string;
    status: "pass" | "review" | "missing";
    observed: string;
    expected: string;
    repair: string;
};
export type QualityControl = {
    sectionId: string;
    locator: string;
    label: string;
    href: string;
    kind: "fragment" | "external" | "local" | "other";
    status: "verified_local" | "broken" | "unverified" | "unsafe";
    destination: string;
    sticky: boolean;
    width: number;
    height: number;
    covered: boolean;
};
export type QualityRendered = {
    at: string;
    fingerprint: string;
    viewport: {
        width: number;
        height: number;
    };
    text: string;
    sections: {
        id: string;
        text: string;
        headings: string[];
    }[];
    controls: QualityControl[];
    layout: {
        kind: string;
        sectionId: string;
        evidence: string;
        element?: string;
    }[];
    images: {
        sectionId: string;
        alt: string;
        loaded: boolean;
        width: number;
        height: number;
        fit: string;
        position: string;
    }[];
    unknowns: string[];
};
export type QualityEdit = {
    id: string;
    at: string;
    intent: "variant" | "repair";
    sectionId: string;
    hypothesis: string;
    variable: "wording" | "crop" | "treatment" | "destination" | "proof_order";
    findingId: string;
    beforeFingerprint: string;
    afterFingerprint: string;
    unchangedHashes: Record<string, string>;
    diff: {
        field: string;
        before: string;
        after: string;
    }[];
    locks: string[];
    strengths: string[];
    resolution: "needs_review" | "resolved" | "unresolved";
    verification: string[];
};
export type QualityDocument = {
    version: 1;
    id: string;
    brandId: string;
    createdAt: string;
    updatedAt: string;
    revision: number;
    productName?: string;
    source: {
        kind: "studio" | "legacy" | "html";
        id: string;
        revision: number;
        fingerprint: string;
    };
    run?: CroRun;
    suppliedHtml?: string;
    brief: QualityBrief;
    questions: QualityQuestion[];
    images: QualityImage[];
    observations: QualityObservation[];
    seo: z.infer<typeof QualitySeoSchema>;
    rendered: QualityRendered[];
    edits: QualityEdit[];
    evidence?: import("../standalone/evidence").EvidencePacket;
    sourceReview?: {
        needsReview: boolean;
        invalidatedAt: string;
        snapshotFingerprint: string;
        currentFingerprint: string;
        findings: {
            id: string;
            issue: string;
        }[];
        previousPacket: import("../standalone/evidence").EvidencePacket;
    };
    imageClaims?: import("./image-claims").LandingImageClaimReview[];
    exportChecks?: import("./export-quality").ExportAccessibilityReceipt[];
    consolidations?: {
        id: string;
        at: string;
        keepId: string;
        removed: string[];
        beforeFingerprint: string;
        afterFingerprint: string;
        preservedFacts: string[];
        termsHash: string;
    }[];
};
export const QualityChangeSchema = z.object({ intent: z.enum(["variant", "repair"]), sectionId: z.string().min(1).max(120),
    hypothesis: z.string().trim().min(3).max(2000), variable: z.enum(["wording", "crop", "treatment", "destination", "proof_order"]), findingId: text.default(""),
    field: z.string().max(120).default(""), replacement: text.default(""), css: z.string().max(20000).optional(),
    order: z.array(z.string().max(120)).min(2).max(40).optional(),
    visual: z.object({ spacePx: z.number().int().min(0).max(120), readingCh: z.number().int().min(30).max(85), imageRatio: z.enum(["original", "1:1", "4:5", "16:9"]), focalX: z.number().int().min(0).max(100), focalY: z.number().int().min(0).max(100) }).optional(),
    locks: z.array(z.enum(["layout", "typography", "images", "wording", "crop", "destination"])).max(6).default([]), strengths: z.array(text).max(30).default([]),
});
export type QualityChange = z.infer<typeof QualityChangeSchema>;
