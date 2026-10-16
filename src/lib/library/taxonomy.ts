export const VERTICALS = [
    "Baby & Kids",
    "Bags & Leather Goods",
    "Beauty & Skincare",
    "Bedding & Linens",
    "Beverage & Alcohol",
    "Candles & Home Fragrance",
    "Coffee & Tea",
    "Cosmetics & Makeup",
    "Eyewear",
    "Fashion & Apparel",
    "Food",
    "Footwear & Sneakers",
    "Fragrance",
    "Haircare",
    "Home, Furniture & Candles",
    "Jewelry & Watches",
    "Kitchen & Cookware",
    "Men's Grooming",
    "Outdoor & Adventure",
    "Pet",
    "Spirits & Wine",
    "Sportswear & Activewear",
    "Supplements & Wellness",
    "Swim & Intimates",
    "Tech & Accessories",
] as const;
export type Vertical = (typeof VERTICALS)[number];
export const PRODUCT_FORMATS = ["pouch", "sachet", "bottle", "jar", "tub", "tube", "can", "box", "bar", "garment", "footwear", "accessory", "device", "furniture", "other"] as const;
export type PdpGroup = "Product truth" | "Claim" | "Belief" | "Decision";
export const PDP_GROUPS: {
    id: PdpGroup;
    question: string;
}[] = [
    { id: "Product truth", question: "What is it, really?" },
    { id: "Claim", question: "What does it do?" },
    { id: "Belief", question: "Why should I believe it?" },
    { id: "Decision", question: "Why this one, now?" },
];
export interface PdpType {
    id: string;
    label: string;
    group: PdpGroup;
    spine?: number;
    job: string;
    needs: string;
}
export const PDP_TYPES: PdpType[] = [
    { id: "hero-packshot", label: "Hero packshot", group: "Product truth", spine: 1, job: "Stop the scroll and show what it is, with something being argued", needs: "The pack, 1 headline claim, 2 to 4 benefits" },
    { id: "scale-in-hand", label: "Scale in hand", group: "Product truth", spine: 2, job: "Kill the size question up front", needs: "The product out of its pack" },
    { id: "whats-included", label: "What you get", group: "Product truth", spine: 3, job: "Show the whole order, not 1 unit", needs: "What is in the order and how many" },
    { id: "cross-section", label: "Cross section", group: "Product truth", spine: 4, job: "Show what is inside", needs: "A product with an interior worth showing" },
    { id: "facts-panel", label: "Facts panel", group: "Product truth", job: "The full nutrition or spec panel, for the sceptic", needs: "The real panel figures" },
    { id: "texture-macro", label: "Texture macro", group: "Product truth", job: "Justify the price with material quality", needs: "The product out of its pack" },
    { id: "packaging-unboxing", label: "Packaging and unboxing", group: "Product truth", job: "Set the arrival expectation", needs: "What arrives in the box" },
    { id: "dimensions-size", label: "Dimensions and size", group: "Product truth", job: "Exact measurements for fit or footprint", needs: "Real measurements" },
    { id: "benefit-infographic", label: "Benefit infographic", group: "Claim", job: "A headline claim with 2 to 4 supporting points", needs: "Approved claims" },
    { id: "ingredient-breakdown", label: "Ingredient breakdown", group: "Claim", job: "Name the actives and what each is for", needs: "Ingredients and their jobs" },
    { id: "how-to-use", label: "How to use", group: "Claim", job: "Remove the effort objection in 3 steps", needs: "The real steps" },
    { id: "certifications", label: "Certifications", group: "Claim", job: "Third-party proof", needs: "Marks the brand actually holds" },
    { id: "category-education", label: "Category education", group: "Claim", job: "Sell the category and name the villain", needs: "A sourced fact about the problem" },
    { id: "whats-not-in-it", label: "What is not in it", group: "Claim", job: "The exclusion list", needs: "True exclusions" },
    { id: "review-callout", label: "Review callout", group: "Belief", job: "A real customer sentence on the image", needs: "A real review, quoted word for word" },
    { id: "comment-proof", label: "Comment proof", group: "Belief", job: "Social comments that read as found", needs: "Real comments" },
    { id: "ugc-collage", label: "Customer collage", group: "Belief", job: "Volume of real customer content", needs: "A real review count" },
    { id: "ugc-customer", label: "Customer photo style", group: "Belief", job: "Show it in a real home", needs: "The product" },
    { id: "expert-endorsement", label: "Expert endorsement", group: "Belief", job: "A named professional, credential visible", needs: "A real, named expert" },
    { id: "sourcing-story", label: "Sourcing story", group: "Belief", job: "Show where it comes from", needs: "Real sourcing facts" },
    { id: "before-after", label: "Before and after", group: "Belief", job: "Show the result, where the category allows it", needs: "A real, permitted result" },
    { id: "founder-story", label: "Founder story", group: "Belief", job: "Say who made it and why", needs: "The founder's story and consent" },
    { id: "press-logos", label: "Press logos", group: "Belief", job: "Borrow credibility actually earned", needs: "Real press placements" },
    { id: "guarantee", label: "Guarantee", group: "Belief", job: "Remove the risk of being wrong", needs: "The exact guarantee terms" },
    { id: "in-use", label: "In use", group: "Decision", spine: 5, job: "Put it in the moment they would use it", needs: "The product and who uses it" },
    { id: "versus-comparison", label: "Versus", group: "Decision", spine: 6, job: "A reason to skip the alternative, against an unbranded stand-in", needs: "A like-for-like, sourced comparison" },
    { id: "bundle-offer", label: "Bundle or offer", group: "Decision", spine: 7, job: "Close on the offer", needs: "The real offer and price" },
    { id: "replacement-value", label: "Replacement value", group: "Decision", job: "What it replaces, itemised and priced", needs: "Sourced prices of what it replaces" },
    { id: "variant-lineup", label: "Variant lineup", group: "Decision", job: "Show the range", needs: "The real variants" },
    { id: "usage-frequency", label: "Usage frequency", group: "Decision", job: "Set the consumption rate", needs: "How often it is taken or used" },
    { id: "fit-range", label: "Fit range", group: "Decision", job: "The same item on different bodies", needs: "Sizes the brand sells" },
    { id: "faq-callout", label: "FAQ callout", group: "Decision", job: "Answer the question support keeps getting", needs: "The real question and answer" },
];
export const pdpType = (id: string) => PDP_TYPES.find((t) => t.id === id);
export const PDP_SPINE = PDP_TYPES.filter((t) => t.spine).sort((a, b) => a.spine! - b.spine!).map((t) => t.id);
export interface ShotType {
    id: string;
    label: string;
    job: string;
}
export const SHOT_TYPES: ShotType[] = [
    { id: "studio_hero", label: "Studio hero", job: "The product alone, clean and centred" },
    { id: "prop_still_life", label: "Still life with props", job: "The product in a styled arrangement" },
    { id: "hard_light_still_life", label: "Hard light still life", job: "Sharp shadows and graphic shapes" },
    { id: "flat_lay", label: "Flat lay", job: "Shot from above on a surface" },
    { id: "macro_texture", label: "Macro and texture", job: "Close on material, contents or detail" },
    { id: "lifestyle_model", label: "Lifestyle with a person", job: "A person with the product, in a moment" },
    { id: "on_body_detail", label: "On body or in hand", job: "Hands or body close to the product" },
    { id: "environmental_scene", label: "Environment", job: "The product small in a wider place" },
];
export const shotType = (id: string) => SHOT_TYPES.find((t) => t.id === id);
export interface AdType {
    id: string;
    label: string;
    job: string;
    funnel: "TOF" | "MOF" | "BOF";
}
export const AD_TYPES: AdType[] = [
    { id: "product-hero-and-minimal", label: "Product hero", job: "The product large, with 1 line", funnel: "TOF" },
    { id: "lifestyle-and-editorial", label: "Lifestyle and editorial", job: "The product in a life, shot like a magazine", funnel: "TOF" },
    { id: "problem-and-symptom-framing", label: "Problem and symptom", job: "Name the problem the buyer already feels", funnel: "TOF" },
    { id: "native-format-mimicry", label: "Native format", job: "Looks like a post, a note or a message, not an ad", funnel: "TOF" },
    { id: "conceptual-and-scale", label: "Conceptual", job: "A visual idea or an exaggeration that stops the scroll", funnel: "TOF" },
    { id: "handmade-and-anti-design", label: "Handmade", job: "Deliberately rough, so it reads as a person", funnel: "TOF" },
    { id: "callout-diagram", label: "Callout diagram", job: "The product with labelled parts", funnel: "MOF" },
    { id: "ingredient-stat-and-spec", label: "Ingredient, stat and spec", job: "A number or an ingredient as the argument", funnel: "MOF" },
    { id: "comparison-and-us-vs-them", label: "Comparison", job: "This against the alternative", funnel: "MOF" },
    { id: "review-and-testimonial", label: "Review and testimonial", job: "A real customer's words carry the ad", funnel: "MOF" },
    { id: "before-and-after", label: "Before and after", job: "The change, where the category allows it", funnel: "MOF" },
    { id: "press-and-authority", label: "Press and authority", job: "Credibility that was actually earned", funnel: "MOF" },
    { id: "bundle-kit-and-range", label: "Bundle, kit and range", job: "Everything in the order, or the whole range", funnel: "BOF" },
    { id: "offer-sale-and-promo", label: "Offer and sale", job: "The price and the reason to act now", funnel: "BOF" },
    { id: "gifting-and-occasion", label: "Gifting and occasion", job: "Who it is for and when", funnel: "BOF" },
];
export const adType = (id: string) => AD_TYPES.find((t) => t.id === id);
export type LibraryName = "pdp" | "photoshoot" | "ad";
export const typeLabel = (library: LibraryName, id: string) => (library === "pdp" ? pdpType(id)?.label : library === "ad" ? adType(id)?.label : shotType(id)?.label) ?? id.replace(/[-_]/g, " ");
export const typeJob = (library: LibraryName, id: string) => (library === "pdp" ? pdpType(id)?.job : library === "ad" ? adType(id)?.job : shotType(id)?.job) ?? "";
export const KIND_INFO: Record<LibraryName, {
    label: string;
    noun: string;
    one: string;
    defaultAspects: string[];
    aspects: string[];
}> = {
    ad: { label: "Ads", noun: "static ads", one: "ad", defaultAspects: ["4:5"], aspects: ["4:5", "1:1", "9:16"] },
    pdp: { label: "Product page images", noun: "product page images", one: "image", defaultAspects: ["1:1"], aspects: ["1:1", "4:5"] },
    photoshoot: { label: "Photoshoot", noun: "photoshoot frames", one: "frame", defaultAspects: ["4:5"], aspects: ["4:5", "1:1", "9:16", "3:2"] },
};
export const STUDIO_ASPECTS: Record<string, {
    size: string;
    label: string;
    use: string;
}> = {
    "1:1": { size: "1024x1024", label: "Square 1:1", use: "Most store themes, marketplaces" },
    "4:5": { size: "1024x1280", label: "Portrait 4:5", use: "Portrait themes, feed" },
    "9:16": { size: "1008x1792", label: "Tall 9:16", use: "Stories and reels covers" },
    "3:2": { size: "1536x1024", label: "Landscape 3:2", use: "Web banners and hero sections" },
};
