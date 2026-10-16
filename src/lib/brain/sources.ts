import type { DocId } from "./docs";
export type SourceStatus = "live" | "files" | "none";
export interface DataSource {
    id: string;
    name: string;
    group: "Store" | "Ads" | "Email and SMS" | "Site behaviour" | "Customer voice" | "Public";
    gives: string;
    feeds: DocId[];
    standIn: string;
    fileTypes?: string[];
}
export const DATA_SOURCES: DataSource[] = [
    { id: "shopify", name: "Shopify", group: "Store", gives: "Best sellers, revenue and repeat rate by product, order value, discount codes in use", feeds: ["products", "brain", "changes"], standIn: "The store's public product list (prices, versions, stock, pictures). Sales figures are typed in on Offers." },
    { id: "meta_ads", name: "Meta Ads", group: "Ads", gives: "Spend and result by ad, how many start and stay on a video, the winners and the losers", feeds: ["winning", "brain"], standIn: "An export of your ad account, added on the Coverage screen. The Ad Library for what is live." },
    { id: "google_ads", name: "Google Ads", group: "Ads", gives: "The words buyers search with, spend and result by campaign", feeds: ["avatars", "brain"], standIn: "" },
    { id: "klaviyo", name: "Klaviyo", group: "Email and SMS", gives: "Campaigns and flows, open and click rates, the subject lines that worked, list size", feeds: ["brain", "guidelines"], standIn: "" },
    { id: "ga4", name: "Google Analytics 4", group: "Site behaviour", gives: "Visits and conversion rate by landing page and by channel", feeds: ["brain"], standIn: "" },
    { id: "clarity", name: "Microsoft Clarity", group: "Site behaviour", gives: "How far buyers scroll, where they click in anger, recordings of visits", feeds: ["brain"], standIn: "" },
    { id: "reviews", name: "Reviews", group: "Customer voice", gives: "The buyers' own words: the problem before, the result after, the complaints", feeds: ["avatars", "brain"], standIn: "Review files added on the Sources screen.", fileTypes: ["review"] },
    { id: "support", name: "Support tickets", group: "Customer voice", gives: "Objections, refund reasons, what confuses a buyer", feeds: ["avatars", "brain"], standIn: "Ticket files added on the Sources screen.", fileTypes: ["ticket"] },
    { id: "surveys", name: "Surveys", group: "Customer voice", gives: "Why they bought, what nearly stopped them, where they heard of the brand", feeds: ["avatars"], standIn: "Survey files added on the Sources screen.", fileTypes: ["survey"] },
    { id: "calls", name: "Customer calls", group: "Customer voice", gives: "Long answers in the buyer's own voice", feeds: ["avatars"], standIn: "Call transcripts added on the Sources screen.", fileTypes: ["call", "interview"] },
    { id: "website", name: "The brand's website", group: "Public", gives: "The story, the claims, the prices, the fonts and colours", feeds: ["guidelines", "products"], standIn: "Read by the app: the pages, the claims, the look.", fileTypes: ["website"] },
    { id: "ad_library", name: "Meta Ad Library", group: "Public", gives: "Every ad a brand or a competitor has live, with its start date", feeds: ["winning", "competitors"], standIn: "Read by hand into Winning ads and the competitor profiles." },
];
export interface SourceState extends DataSource {
    status: SourceStatus;
    holds: string;
}
export function sourceStates(counts: Record<string, number>, has: {
    website: boolean;
    store: boolean;
    account: boolean;
    winning: number;
    competitors: number;
}): SourceState[] {
    return DATA_SOURCES.map((s) => {
        const n = (s.fileTypes ?? []).reduce((a, t) => a + (counts[t] ?? 0), 0);
        if (s.id === "website")
            return { ...s, status: has.website || n ? "live" : "none", holds: has.website || n ? `Read by the app${n ? `: ${n} page${n === 1 ? "" : "s"} kept` : ""}` : "Not read yet" };
        if (s.id === "shopify")
            return { ...s, status: has.store ? "files" : "none", holds: has.store ? "Not connected. The public product list is in the catalogue." : "Not connected" };
        if (s.id === "meta_ads")
            return { ...s, status: has.account ? "files" : "none", holds: has.account ? "Not connected. An export of your ad account is loaded on Coverage." : "Not connected" };
        if (s.id === "ad_library")
            return { ...s, status: has.winning || has.competitors ? "files" : "none", holds: has.winning || has.competitors ? `${has.winning} of the brand's ads recorded, ${has.competitors} competitors profiled` : "Nothing recorded" };
        if (s.fileTypes)
            return { ...s, status: n ? "files" : "none", holds: n ? `${n} item${n === 1 ? "" : "s"} from files` : "Nothing added" };
        return { ...s, status: "none", holds: "Not connected" };
    });
}
