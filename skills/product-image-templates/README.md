# Product image templates

The 12 frames most ecommerce product pages are built from, and real product page images sorted under them. The Creative Engine's "Product images for your landing pages" screen shows each frame beside a real example, and sends both to the image model when it builds the image for a brand.

A product page gallery answers a buyer's questions in order, for someone who will not read the page. Each frame answers 1 of those questions, and is judged on 1 thing: shown alone at phone width to a stranger for 3 seconds, can they say the question and the answer?

Source: "Product Images Template - Ecommerce" (the 12 wireframes and the framework sheet, and a folder of examples), copied in by `pnpm templates:build`.

## What is here

| Path | What it is |
|---|---|
| `template/NN-<bucket>.png` | The 12 wireframes. `template/framework.jpg` is all 12 on 1 sheet |
| `references/NN-<bucket>/` | The examples that came with the template, each filed under the frame whose job it does |
| `REFERENCES.json` | Those examples: id, file, bucket, gallery type, brand, a curator's note |
| `BUCKETS.json` | The bucket of every product page reference in the app, the PDP Image Factory library's included |
| `BUCKETS.md` | The same, to read: each bucket, its frame and the references under it. Written by the app; do not edit it by hand |

Images are not committed (they stay on the machine); the text files are.

The 2 JSON files and the folder names are read by code (`src/lib/library/templates.ts`). Bucket ids are keys: never rename one here. This file is not read by code.

## The 12 buckets

| # | Bucket | The frame's wording | The question it answers | Judged on |
|---|---|---|---|---|
| 1 | `what-it-does` | What does your product do? | What is this, and what does it do for me? | A stranger names the category and repeats the 1 statement at thumbnail size |
| 2 | `benefits-list` | Product benefits at a glance | What do I get out of it? | Each point is a result a buyer would notice, and no 2 say the same thing |
| 3 | `benefit-deep-dive` | Benefit-driven headline | Why does it work? | Each benefit has its reason beside it: an ingredient and its amount, a material, the construction, a test |
| 4 | `how-it-works` | Explain how your product works | How do I use it, and is it easy? | Someone could do it from the frame alone |
| 5 | `reviews-ugc` | Reviews and customer content | Do people like me actually use it? | Every review and every customer photo is real, and there are several |
| 6 | `before-after` | Pain point: before and after | What changes when I switch? | The 2 sides are framed the same, and nothing is shown the brand cannot prove |
| 7 | `what-makes-us-different` | What makes us different? | Why this one and not the alternative? | Each row is 1 fact with a source for both sides |
| 8 | `whats-included` | What's included? | What exactly arrives? | A stranger can count what arrives |
| 9 | `feature-callouts` | Feature callouts | What is it made of, and what is special about it? | Each line touches the part it names, and each label is in the product's facts |
| 10 | `top-testimonial` | Your best testimonial | Can I trust it? | The quote is word for word, and the rating has its count |
| 11 | `guarantee` | Risk reversal or guarantee | What if I don't like it? | A buyer knows what happens if they send it back, with no condition missing |
| 12 | `occasions` | Perfect for any occasion | Is it for someone like me, and when would I use it? | A buyer can point at the tile that is them |

2 more buckets were added for what the 12 leave out. They have no wireframe and are offered as extra images:

| # | Bucket | What it holds | The question it answers | Judged on |
|---|---|---|---|---|
| 13 | `product-shot` | A photograph with no added words: a plain packshot, the product in a hand, a texture close-up, a single in-use photo | What does it really look like, and how big is it? | Beside the hero, the product reads as the same object at the same size |
| 14 | `facts-and-specs` | A panel of figures: nutrition or supplement facts, an ingredient list with amounts, dimensions, a size chart | What exactly is in it, how big is it, and will it fit? | Every figure matches the label or the spec, digit and unit |

Anything else is `other` (a founder story, a sourcing story, a category explainer).

Each bucket's structure, what it needs from a brand, and how it bends for a brand that does not fit the frame as drawn, are in `src/lib/library/buckets.ts`. That file is what the planner is given.

## The buyer's questions, and where the 12 leave a gap

In the order a buyer asks them: what is it (1); what does it do for me (2, 3); how do I use it (4); what is in it, or what is it made of (9, 14); how big is it, and will it fit (13, 14 only); why this and not what I use now (6, 7); who says so (5, 10); what exactly do I get (8); what if I don't like it (11); is it for someone like me (12).

- The 12 answer "what does it do for me" 3 times and "who says so" twice. Frames that sit close keep to their own half: 2 says what, 3 says why; 5 is many voices, 10 is 1 person in full; 6 is the buyer's old way against the new, 7 is this product against another product.
- The 12 have no frame for size or fit. Where size decides the sale (anything worn, carried, stored or placed in a room), frame 13 or 14 joins the set.
- A set holds 12. A frame that joins takes the place of the frame this product fills least truthfully: 3 when the brand has no reason behind each benefit, 5 when it has no customer photos, 6 when it has neither a real result nor an old way to show.

## Which frame changes, by kind of product

| Kind of product | What changes |
|---|---|
| Eaten or taken (food, drink, supplement) | 9 is the ingredients with their amounts. The facts panel (14) joins. 6 is the old routine against the new, never a body. 4 adds how much and how often |
| Applied (skincare, haircare) | 9 is the actives with their percentages. 6 is a result only from the brand's own before and after photos; otherwise the old routine against the new |
| Colour cosmetics | 12 becomes the shade guide: every shade named, from the brand's own swatch photos |
| Worn (clothing, footwear) | 4 becomes size and fit: the size chart, how it fits, care in 1 line. 8 is the colours it comes in. 9 is fabric and construction. 11 says how a size is exchanged. 12 can show the same item on different bodies, from the brand's fit photos |
| Used by hand at home (cookware, tools, bags, devices) | 8 is everything in the box, counted. Dimensions and weight join as 14, or sit in 9 as callouts. 11 is the warranty with the returns |
| Placed in a room (furniture, bedding, decor) | Dimensions (14) are shown in the room. 4 is assembly or care |

The same table is in `skills/PDP Image Factory/.../references/03-type-library.md` under "Category adaptations", which is the copy the planner is sent. Change both together.

## How a frame is used

A frame is a starting structure, not a design.

1. **Keep the job.** Each frame answers 1 question a shopper has. That does not change.
2. **Bend the rest.** The number of points, the split of the frame and the kind of proof change to what the product can truthfully fill. A supplement or a serum cannot show a body before and after, so that frame becomes the old routine against the new one. A jacket has no steps of use, so "how it works" becomes which size to take and how it fits.
3. **The frame sets the structure; the example shows the craft.** Where a real example is chosen too, it shows how a brand dressed that frame: its light, its styling, how its type sits. Where the 2 disagree on structure, the frame wins.
4. **Nothing of the wireframe is drawn.** Its grey boxes are photographs to plan and its placeholder words are text to write.
5. **A frame the brand cannot fill truthfully is changed or left out.** No invented review, rating, guarantee or comparison. A missing fact is written as a slot in square brackets for the brand to fill.
6. **Every small photo in a frame is a whole picture.** The 4 round close-ups of frame 9, the 3 steps of frame 4, the 6 tiles of frame 12: each shows only what a product photo or the brand's facts show. A close-up of a part nobody photographed is an invented part.
7. **Words can be left off.** A set can be made with its words, without them (clean space for a designer), or both. A dense panel (a full label, a full size chart) is best set by a designer from the label.
8. **People are fictional adults.** No children, even where a wireframe or an example shows a family. A customer, an expert or a founder appears only from their own photo.

## A marketplace listing

On a marketplace the first image is the product alone on plain white, with no added words, badges, props or claims; frame 1 moves to second place. The other frames carry over. Each marketplace sets its own limits on size, text and claims, and changes them: check the marketplace's current image rules before uploading.

## Adding to it

- **More examples:** drop them in the source folder and run `pnpm templates:build` again. Images already sorted are skipped. Each new one is a small paid call to sort and another to analyse.
- **Moving a reference to another bucket:** edit `BUCKETS.json` (and, for a template example, `REFERENCES.json` and its folder), then run `pnpm libraries:import --only pdp`.
- **A new bucket:** add it to `src/lib/library/buckets.ts`.
- Leave out examples that show children, a real person's face, or a before and after of a body: a set cannot be built from them.

## What this reads from the brand brain

By frame, with the names of the contract (`docs/skill-pass/README.md`). **New** marks a field that the contract does not hold yet; each is logged in `docs/skill-pass/product-page.md`. A blank field is a question for the brand, or the frame is bent and the plan says so. It is never filled by guessing.

Every frame that shows the product reads, from the product's entry in `products-and-positioning.md`: Looks like, Pack, Never show, and Reference photos (the file for each job). Every frame with words reads `brand.json` claims with their sources and forbidden claims, the palette and typefaces of `brand-guidelines.md`, and `brand-look.json`.

| Frame | Reads | New fields it needs |
|---|---|---|
| 1 What it does | What it is, Core benefit, Positioning angle; `proof_assets` for an earned badge; "What almost stops them" (the biggest doubt) | Marketplaces (is a plain white first image needed) |
| 2 Benefits list | Key features, Core benefit; Unique selling propositions; "What they care about" (to order the points) | none |
| 3 Benefit deep dive | `products[].ingredients` (name, dose, job), `products[].specs`; claims with sources | Studies (what was measured, the result, how many people, how long, who ran it, the wording that goes with it); What to expect (what a buyer may be told and by when) |
| 4 How it works | How it is used; `lessons.json` | Usage rate (how much, how often, how long a pack lasts); Care; for anything worn, Size and fit |
| 5 Reviews and customer content | "Grounded in" (real quotes with source), Customer language bank | Reviews (each: the words, the name as published, stars, date, source, whether it may be used on an image; and the totals: count, average, as of when); Customer photos (real files, with permission) |
| 6 Before and after | Visible result; "What almost stops them"; Competitive landscape | Replaces (what the buyer used before, unbranded, and what was wrong with it); a real before and a real after photo with their conditions; Required wording (what the category does not allow) |
| 7 What makes us different | Differentiation summary; claims with sources | Comparison facts (per row: the attribute, our figure, the alternative's figure, a source for each, the unbranded name of the alternative); for a price argument, Replaces with a sourced price for each item |
| 8 What's included | Pack; Variants; Bundles and offers; `offers` | In the box (every item with its count, per offer; a free gift and its condition); a photo of the order laid out |
| 9 Feature callouts | `products[].ingredients`, `products[].specs`; Key features; the close view under Reference photos | Materials and parts (each part, where it sits on the product, what it does); Free from; a photo of the inside where there is one |
| 10 Best testimonial | "Grounded in"; `proof_assets` | Reviews and their totals; Experts (name, credential, the quote, their say, their photo); Press (outlet, date, the line written, a logo file if its use is allowed) |
| 11 Guarantee | `guarantee` (text, days) | Guarantee terms in full (what comes back, who pays the return, conditions, how to claim; a warranty's length and cover); Delivery and returns; Certifications (name, who awards it, what it covers, the mark's file) |
| 12 Occasions | Who buys it; per avatar "Who they are" and The moment; Brand world (places, people) | Each variant's own photo and name (for a shade or colour guide); fit photos with the wearer's height and size |
| 13 Product shot | Looks like (size against a hand); the in-hand and close-view photos | a photo of the product in its place (on the hob, in the bag, in the room) |
| 14 Facts and specs | `products[].ingredients`, `products[].specs` | Label panel (every row as printed, in order, with units, and a photo of it); Dimensions and weight (each figure, its unit, what it measures); Size and fit (the size chart) |
