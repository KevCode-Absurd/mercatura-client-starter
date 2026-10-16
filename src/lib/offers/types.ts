export const MECHANICS = ["reposition", "bundle", "gift", "tiered", "discount", "upsell", "post_purchase"] as const;
export type Mechanic = (typeof MECHANICS)[number];
export const MECHANIC_INFO: Record<Mechanic, {
    label: string;
    one: string;
    changes: string;
    margin: string;
    best: string;
}> = {
    reposition: { label: "Product repositioning", one: "positioning", changes: "The buyer, the problem and the headline. The product stays the same.", margin: "None, sometimes better", best: "A single hero product" },
    bundle: { label: "Bundles", one: "bundle", changes: "Units per order, and the cost to ship each unit.", margin: "Better, if the shipping saving is counted", best: "Several products, or a product that is used up" },
    gift: { label: "Gift with purchase", one: "gift offer", changes: "Units per order, with almost no change in margin.", margin: "About none", best: "A cheap second item that pairs with the product" },
    tiered: { label: "Tiered offers", one: "tiered offer", changes: "Order value: spend more, get more.", margin: "Better, if the tiers sit above the peaks", best: "Order values with 2 peaks" },
    discount: { label: "Disciplined discounting", one: "discount", changes: "The price. Cost to acquire falls; margin falls faster.", margin: "Worse, unless units rise enough", best: "High-margin products or slow stock, 1 or 2 times a year" },
    upsell: { label: "Cross-sells and upsells", one: "add-on", changes: "Extra contribution on an order that is already decided.", margin: "Extra profit per order", best: "The cart and the checkout" },
    post_purchase: { label: "Post-purchase offers", one: "post-purchase offer", changes: "A 1-click add after payment is taken.", margin: "Extra profit per order", best: "Every store that has none" },
};
export const AUDIENCES = ["new", "returning", "all"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const AUDIENCE_LABEL: Record<Audience, string> = { new: "New buyers", returning: "Returning buyers", all: "Everyone" };
export const ADD_KINDS = ["gift", "access", "content", "service", "partner", "shipping", "samples"] as const;
export type AddKind = (typeof ADD_KINDS)[number];
export const ADD_LABEL: Record<AddKind, string> = { gift: "Gift", access: "Access", content: "Download", service: "Done for you", partner: "Partner perk", shipping: "Shipping", samples: "Samples" };
export const PLACES = ["cart", "checkout", "post_purchase"] as const;
export type Place = (typeof PLACES)[number];
export const PLACE_LABEL: Record<Place, string> = { cart: "In the cart", checkout: "At checkout", post_purchase: "After the purchase" };
export interface OfferAdd {
    kind: AddKind;
    name: string;
    cost: number;
    value: number;
}
export interface NewBuyer {
    name: string;
    summary: string;
    problem: string;
    trigger: string;
    age: string;
    gender: string;
}
export type OfferSource = "built" | "industry" | "hand";
export const OFFER_SOURCE_LABEL: Record<OfferSource, string> = { built: "Built from the brand", industry: "Borrowed from another industry", hand: "Written by hand" };
export interface OfferDesign {
    id: string;
    name: string;
    mechanic: Mechanic;
    audience: Audience;
    product_id: string;
    base_offer_id: string;
    persona_id: string | null;
    new_buyer: NewBuyer | null;
    headline: string;
    terms: string;
    positioning: string;
    units: number;
    discount: number;
    subscription: boolean;
    adds: OfferAdd[];
    risk_reversal: string;
    urgency: string;
    tiers: {
        at: number;
        get: string;
    }[];
    addon: {
        place: Place;
        item: string;
        price: number;
        margin: number;
        take_rate: number;
    } | null;
    when: string;
    improves: string | null;
    theme_ids: string[];
    why: string;
    test: string;
    needs: string;
    borrowed: {
        industry: string;
        pattern: string;
    } | null;
    source: OfferSource;
    status: "active" | "draft";
    brand_offer_id: string | null;
    concept_id: string | null;
    created_at: string;
    updated_at: string;
}
export const offerId = (name: string) => `ofr_${name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28)
    .replace(/_+$/, "")}`;
export const brandOfferId = (designId: string) => `off_x_${designId.replace(/^ofr_/, "")}`;
export const isDesigned = (offerIdInBrand: string) => offerIdInBrand.startsWith("off_x_");
export const changesTerms = (d: Pick<OfferDesign, "units" | "discount" | "adds" | "risk_reversal" | "urgency" | "tiers" | "addon" | "mechanic">) => d.mechanic !== "reposition" || d.units > 1 || d.discount > 0 || d.adds.length > 0 || d.tiers.length > 0;
export interface Industry {
    id: string;
    name: string;
    group: string;
    icon: string;
    patterns: {
        name: string;
        how: string;
        example?: string;
        source?: string;
    }[];
    researched?: {
        at: string;
        summary: string;
        sources: string[];
    } | null;
}
export interface IndustryGroup {
    id: string;
    name: string;
    hue: number;
}
