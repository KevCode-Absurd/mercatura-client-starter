export type LivePageEvidence = {
    requestedUrl: string;
    fetchedAt: string;
    durationMs: number;
    bytes: number;
    contentType: string;
    error?: string;
    htmlInspected: boolean;
    h1Count: number;
    canonicalCount: number;
    canonicalRaw: string[];
    headings: string[];
    wordCount: number;
    links: {
        url: string;
        text: string;
    }[];
    contentText?: string;
    contentScope?: string;
    imageCount: number;
    imagesMissingAlt: number;
    schemaTypes: string[];
    invalidJsonLd: number;
    otherStructuredData: boolean;
    productSchema: {
        name: string;
        image: boolean;
        offers: boolean;
        price: boolean;
        currency: boolean;
        availability: boolean;
    }[];
    productOffers?: {
        name: string;
        sku: string;
        price: string;
        currency: string;
        availability: string;
    }[];
    policyLinks: {
        shipping: boolean;
        returns: boolean;
        contact: boolean;
    };
    questionHeadings: string[];
    answeredQuestionCount: number;
    robotsDirectives: string[];
    inSitemap: boolean;
    externalSourceLinks: number;
    sourceSamples?: {
        ruleId: string;
        line: number;
        code: string;
    }[];
    responseHeaders?: Record<string, string>;
    sourceHash?: string;
    insecureResources?: {
        tag: string;
        url: string;
    }[];
};
export type LiveCrawlMetadata = {
    botAccess?: {
        url: string;
        agent: string;
        allowed: boolean;
        robotsUrl: string;
        checkedAt: string;
    }[];
    websiteUrl: string;
    finalOrigin: string;
    startedAt: string;
    completedAt: string;
    maxPages: number;
    crawledPages: number;
    discoveredUrls: number;
    limited: boolean;
    excludedUrls?: number;
    robotsUrl: string;
    robotsStatus: number | null;
    robotsError?: string;
    sitemaps: {
        url: string;
        status: number | null;
        urls: number;
        error?: string;
    }[];
    errors: {
        url: string;
        message: string;
    }[];
    limits: string[];
};
