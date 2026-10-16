export type AdProvider = "auto" | "apify" | "meta" | "foreplay";
export type Adaptation = "close" | "brand" | "loose";
export const ADAPTATIONS: {
    id: Adaptation;
    label: string;
    description: string;
    fidelity: "exact" | "structure" | "loose";
}[] = [
    { id: "close", label: "Similar to theirs", description: "Follow the composition closely, with your product, new copy and your brand's colours and type.", fidelity: "exact" },
    { id: "brand", label: "Make it yours", description: "Keep the argument and layout, styled in your brand's own look.", fidelity: "structure" },
    { id: "loose", label: "Loose inspiration", description: "Take the creative idea and build a fresh layout for your brand.", fidelity: "loose" },
];
export interface AdReading {
    format: string;
    hook: string;
    offer: string;
    layout: string;
    adaptation: string;
    basis: "visual" | "copy";
}
export interface CompetitorAd {
    id: string;
    advertiser: string;
    advertiserId: string;
    headline: string;
    body: string;
    startedAt: string | null;
    active: boolean | null;
    libraryUrl: string;
    landingUrl?: string | null;
    imageUrl: string | null;
    file?: string;
    reading?: AdReading;
}
export interface CompetitorProduct {
    name: string;
    url: string;
    images: string[];
}
export interface AdPage {
    ads: CompetitorAd[];
    cursor: string | null;
    notices: string[];
}
export interface ScanInput {
    query: string;
    website?: string;
    pageId?: string;
    country: string;
    provider: AdProvider;
}
export interface AdImport {
    status: "running" | "done" | "failed";
    scanned: number;
    limit: number;
    runId?: string;
    datasetId?: string;
    storeId?: string;
    queueId?: string;
}
export interface PlaybookSession {
    id: string;
    brandId: string;
    owner: string;
    input: ScanInput;
    createdAt: string;
    expiresAt: string;
    cursor: string | null;
    ads: CompetitorAd[];
    products: CompetitorProduct[];
    notices: string[];
    runIds: string[];
    pendingRunIds?: string[];
    closed?: boolean;
    import?: AdImport;
}
export interface SessionView extends Omit<PlaybookSession, "owner" | "ads" | "import"> {
    ads: (Omit<CompetitorAd, "imageUrl" | "file"> & {
        hasImage: boolean;
    })[];
    import?: Pick<AdImport, "status" | "scanned" | "limit">;
}
