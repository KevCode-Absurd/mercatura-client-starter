export interface PdpBucket {
    id: string;
    n: number;
    title: string;
    question: string;
    layout: string;
    needs: string;
    flex: string;
    type: string;
    frame: string;
}
export const PDP_BUCKETS: PdpBucket[] = [
    { id: "what-it-does", n: 1, title: "What does your product do?", question: "What is this, and what does it do for me?", layout: "1 short statement at the top in large type, the product below it, large and centred, on a plain ground. Nothing else.", needs: "1 sentence that says what the product does, and the pack", flex: "The statement can be a claim, a category line or the job the product does. A badge the brand has earned may sit in a corner.", type: "hero-packshot", frame: "01-what-it-does.png" },
    { id: "benefits-list", n: 2, title: "Product benefits at a glance", question: "What do I get out of it?", layout: "The frame split in 2: the product photo on one half, a vertical list of 4 to 6 short benefits on the other, each with a small round icon.", needs: "4 to 6 benefits the brand may state", flex: "Use as many benefits as the brand can back, 3 at the least. Icons may be ingredients, ticks or small photos.", type: "benefit-infographic", frame: "02-benefits-list.png" },
    { id: "benefit-deep-dive", n: 3, title: "Benefit-driven headline", question: "Why does it work?", layout: "The frame split in 2: on one side a headline and 3 benefits down a thin vertical line, each a bold name with 1 line of explanation; the product or a lifestyle photo on the other side.", needs: "A headline claim and 3 benefits with a reason each", flex: "The 3 points can be ingredients, features or a timeline of what to expect. The reason under each must come from the brand's material.", type: "benefit-infographic", frame: "03-benefit-deep-dive.png" },
    { id: "how-it-works", n: 4, title: "Explain how your product works", question: "How do I use it, and is it easy?", layout: "A headline at the top, then 3 numbered steps stacked: a small photo of each step on the left, the step number and 1 or 2 lines on the right.", needs: "The real steps of use", flex: "2 to 4 steps. A product with 1 step shows the single action and what happens next. The last step can be the result, if the brand may state it.", type: "how-to-use", frame: "04-how-it-works.png" },
    { id: "reviews-ugc", n: 5, title: "Reviews and customer content", question: "Do people like me actually use it?", layout: "2 review cards across the top, each a photo, 5 stars, the review and the customer's name; below them a grid of customer photo tiles running off the edge.", needs: "Real reviews quoted word for word, and real customer photos", flex: "Customer photos must be real. Where the brand has none, show the product in everyday settings with nobody presented as a customer, or leave labelled tiles for the brand to fill. Never invent a review.", type: "ugc-collage", frame: "05-reviews-ugc.png" },
    { id: "before-after", n: 6, title: "Pain point: before and after", question: "What changes when I switch?", layout: "A headline, then 2 tall photos side by side with a round VS badge between them; under the left one BEFORE and 3 pain points with crosses, under the right one AFTER and 3 answers with ticks.", needs: "The pain the product removes and what replaces it", flex: "Where a body result cannot be shown or claimed (supplements, skincare), compare the old routine with the new one: the hassle before, the ease after. Never a result the brand cannot prove.", type: "before-after", frame: "06-before-after.png" },
    { id: "what-makes-us-different", n: 7, title: "What makes us different?", question: "Why this one and not the alternative?", layout: "A headline, then a 2-column table: our product and its photo on the left, other products on the right, 4 rows of differences below, ticks on our side and crosses on theirs.", needs: "A like-for-like comparison the brand can source", flex: "The other side is an unbranded stand-in for the category, never a named competitor. 3 to 5 rows. Each row is 1 fact.", type: "versus-comparison", frame: "07-what-makes-us-different.png" },
    { id: "whats-included", n: 8, title: "What's included?", question: "What exactly arrives?", layout: "The frame split in 2: a headline and a 2 by 2 grid of round photos with a label under each on one side, a tall photo of the whole order on the other.", needs: "What is in the order and how many", flex: "For a single product, show what is inside the pack: the number of servings, the pieces, the flavours. 2 to 6 items.", type: "whats-included", frame: "08-whats-included.png" },
    { id: "feature-callouts", n: 9, title: "Feature callouts", question: "What is it made of, and what is special about it?", layout: "The product large in the centre, with 4 round close-ups around it, each joined to the product by a thin curved line and labelled.", needs: "2 to 4 features or ingredients worth pointing at", flex: "The close-ups can be ingredients, materials or parts. Lines touch what they label. A product with nothing to point at uses ingredients around the pack.", type: "ingredient-breakdown", frame: "09-feature-callouts.png" },
    { id: "top-testimonial", n: 10, title: "Your best testimonial", question: "Can I trust it?", layout: "A 2 by 2 collage of photos fills the frame; a white card in the centre carries the star rating and review count, 1 testimonial in quotes, the customer's name, and a band with the customer count.", needs: "1 real review, the real rating and the real customer count", flex: "The collage is the product in use, not invented customers. If the brand has no rating or count, the card carries the quote alone. A missing quote is written as [REAL REVIEW NEEDED].", type: "review-callout", frame: "10-top-testimonial.png" },
    { id: "guarantee", n: 11, title: "Risk reversal or guarantee", question: "What if it doesn't work for me?", layout: "A headline stating the guarantee at the top, a large photo under it, and a row of 3 small round badges along the bottom that each remove a doubt.", needs: "The exact guarantee terms and 3 true reassurances", flex: "The badges are things the brand actually offers or holds: free returns, a certification, shipping terms. A brand with no guarantee uses the 3 reassurances as the argument.", type: "guarantee", frame: "11-guarantee.png" },
    { id: "occasions", n: 12, title: "Perfect for any occasion", question: "Is it for someone like me, and when would I use it?", layout: "A headline, then a 3 by 2 grid of photos, each with a short caption naming an occasion or a kind of person.", needs: "The moments or people the product is for", flex: "Occasions can be times of day, places, or kinds of people. 4 to 6 tiles. For a daily product, show the day: morning, desk, gym bag, travel.", type: "in-use", frame: "12-occasions.png" },
];
export const PDP_EXTRA_BUCKETS: PdpBucket[] = [
    { id: "product-shot", n: 13, title: "The product, photographed", question: "What does it really look like?", layout: "A photograph with no added words: the pack on its own, the product out of its pack, in a hand for scale, a close-up of its texture, or in use.", needs: "The product", flex: "No text. The photograph does the work: scale, texture, the moment of use.", type: "scale-in-hand", frame: "" },
    { id: "facts-and-specs", n: 14, title: "Facts and specs", question: "What exactly is in it, and what are the numbers?", layout: "A panel of figures: a nutrition or supplement facts table, an ingredient list with amounts, a size or dimensions chart. Rows are few and cells are short.", needs: "The real figures from the label or the spec", flex: "Only figures the brand's material gives. Fewer rows render better: show the ones a shopper asks about.", type: "facts-panel", frame: "" },
];
export const ALL_BUCKETS = [...PDP_BUCKETS, ...PDP_EXTRA_BUCKETS];
export const pdpBucket = (id: string | null | undefined) => ALL_BUCKETS.find((b) => b.id === id);
export const BUCKET_OTHER = "other";
export const BUCKET_GUIDE = `The buckets of the product page template. Each frame has a job. File by the job the image does for a shopper and by its structure, not by its subject.

${ALL_BUCKETS.map((b) => `- ${b.id}: "${b.title}". Answers: ${b.question} Structure: ${b.layout}`).join("\n")}
- ${BUCKET_OTHER}: none of the above: a founder or sourcing story, a category explainer, a range of variants with no other argument.

How to choose:
- A product with 1 statement and little else is what-it-does. A product with a short list of benefits beside it is benefits-list. Benefits that each carry a line of explanation, or a "what to expect" timeline, are benefit-deep-dive.
- Numbered steps or directions are how-it-works.
- Several customers, review cards or a wall of customer photos are reviews-ugc. 1 large quote or a rating as the hero is top-testimonial. Awards, press or an expert as the main proof are top-testimonial too.
- 2 states of the same thing (before and after, with and without, old way and new way) are before-after. This product against other products, in columns or a table, is what-makes-us-different.
- Everything in the box, the bundle, the range or the pack contents is whats-included.
- The product with lines or arrows pointing at parts, ingredients or features is feature-callouts.
- A guarantee, a returns promise, certifications or a list of doubts removed is guarantee.
- Who it is for, or when and where it is used, shown as several moments or people, is occasions. A single in-use photo with no caption is product-shot.`;
export const bucketFolder = (id: string) => {
    const b = pdpBucket(id);
    return b ? `${String(b.n).padStart(2, "0")}-${b.id}` : "15-other";
};
const TYPE_BUCKET: Record<string, string> = {
    "hero-packshot": "what-it-does",
    "benefit-infographic": "benefits-list",
    "category-education": "benefit-deep-dive",
    "how-to-use": "how-it-works",
    "usage-frequency": "how-it-works",
    "comment-proof": "reviews-ugc",
    "ugc-collage": "reviews-ugc",
    "ugc-customer": "reviews-ugc",
    "before-after": "before-after",
    "versus-comparison": "what-makes-us-different",
    "replacement-value": "what-makes-us-different",
    "whats-included": "whats-included",
    "packaging-unboxing": "whats-included",
    "bundle-offer": "whats-included",
    "variant-lineup": "whats-included",
    "ingredient-breakdown": "feature-callouts",
    "cross-section": "feature-callouts",
    "texture-macro": "feature-callouts",
    "dimensions-size": "feature-callouts",
    "review-callout": "top-testimonial",
    "expert-endorsement": "top-testimonial",
    "press-logos": "top-testimonial",
    guarantee: "guarantee",
    certifications: "guarantee",
    "whats-not-in-it": "guarantee",
    "faq-callout": "guarantee",
    "fit-range": "occasions",
    "in-use": "product-shot",
    "scale-in-hand": "product-shot",
    "facts-panel": "facts-and-specs",
};
export const bucketOf = (ref: {
    type: string;
    tags?: {
        bucket?: string;
    } | null;
}): string => ref.tags?.bucket || TYPE_BUCKET[ref.type] || BUCKET_OTHER;
