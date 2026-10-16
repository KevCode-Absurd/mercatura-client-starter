---
name: generate-50
description: The 50-ad sprint. Plans 50 different static ads for any D2C brand from its brand brain, research and product photos, writes a brief for each, and renders them, with a person's approval between each stage. Used by the Creative Engine's "50-ad sprint" screen.
---

# generate-50: the 50-ad sprint

A brand's first 50 ads should not be 50 versions of 1 idea. The sprint plans 50 ads that differ on purpose (format, angle, buyer, stage, hook, product, layout and photo), writes each one, and renders it. The aim is not 50 good ads. It is to learn which buyer, angle and format this brand should make more of.

A plan is judged on 3 things: no 2 slots could be swapped without anyone noticing; every idea names something true and particular about this product; and a person reading the plan can say what the brand will learn from it.

## The 2 approvals

1. **The plan.** No brief is written until a person approves the plan.
2. **The briefs.** No image is rendered until a person approves the briefs.

A change request is not an approval. After a change the stage is shown again and waits again.

## Stage 1: photos, then the plan

### Photo inventory

Every image in the brand's assets folder is looked at once and filed: the pack, a bundle, a lifestyle photo, the product in use, what is inside or what it is made of, an infographic, merchandise. A photo can lead an ad only if it shows the real product, has no designed text over it, shows no child, and carries no licensed character. The photo fixes what the product looks like and every scene is made new, so 1 photo may anchor many ads; the screen suggests a photoshoot when a product has too few.

### The mix of formats

From `reference/motion-benchmarks.md`, for an account with no sale running:

| Share | Group | Formats |
|---|---|---|
| 40% | Scale | Demo, Testimonial, Headline, Montage, Listicle, Offer-first (only with a live offer) |
| 30% | High hit rate, underused | Unboxing, Founder, POV, Behind the scenes |
| 20% | Angle-specific | Before and after, Us vs them, Problem agitation |
| 10% | Experimental | Statistic, Collage, Expert, Native format |

Most of these are video formats in the benchmarks. Each is made here as a still that does the same job. 30 to 40% of the ads are text-forward: the words carry the ad and the product is a small anchor.

The app sets the format and the product of every slot by arithmetic, so the split is exact. The planner does not change them. A format the brand cannot make honestly (an offer with no offer, an expert with no proof on file) is left out and its share goes to the rest of its group.

### The angle map

9 or 10 angles for 50 ads. An angle is 1 sentence about 1 buyer, specific enough that 2 writers would write the same kind of ad from it:

- "The person who has given up on 3 products like this one and expects to give up on this too."
- "The person who replaces the same cheap one every 2 years and has stopped noticing the cost."

Angles come from:

- what each persona says hurts, in the customers' own words from the research,
- the moment the problem shows and the workaround they live with,
- the gaps competitors leave,
- what only this product can say (its approved claims, how it is made, what it is made of),
- what the brand's own winning ads already prove works.

No angle carries more than 6 of the 50 ads. An angle that fits only 1 product is used only in that product's slots.

### Each slot

For each slot the planner chooses the angle, the buyer (a persona), where that buyer is in the decision (unaware to most aware), the hook, and writes the idea in 1 or 2 sentences: what the ad argues and what the picture shows.

- **Hooks.** Start from the 5 that both win and absorb spend: confession, urgency, curiosity, FOMO, price anchor. At least half the ads use one of them. Then diversify. No hook carries more than 8 ads.
- **Buyers and stages.** Every persona and every stage is covered. Cold stages (unaware, problem aware) lead with the buyer's situation; warm stages lead with what is different and the proof; most aware leads with the offer.
- **The idea names the real thing in the frame:** this product as its photos show it, the place it is really used, the object it replaces. An idea that would fit any product in the category is not finished.
- **The picture is one a camera could take.** The product is shown open, held, worn or in use only the way the brand's facts say; a result is shown only if the brand records one that can be seen. Otherwise the product is closed and at rest.
- **No 2 slots share an idea.** Same angle is fine; same angle, same format and same picture is the same ad twice.
- **Urgency and FOMO are honest.** A deadline, a limited run or a stock claim appears only if the brand's offers or products say so. Otherwise they are built on the cost of waiting.
- **A price anchor uses only the brand's figures,** or a customer's own sum quoted from the research.
- **A figure the brand states differently in different places is not quoted** until the brand says which is live.

### What a slot may not do

- Show a child, or anyone who looks under 18. An ad for a children's product is written to the adult who buys it and shows the product.
- Present a generated person as the founder, a customer or an expert. A founder ad uses the founder's real photo if the brand uploaded one; otherwise it is the founder's words as a signed note. A testimonial is the customer's words from the research, word for word, with no face.
- Show a body changing. A before and after is the old way against the new one: objects, not people.
- Invent an expert, a press logo, a study, a review or a number.
- Name or show a competitor.

## Stage 2: the briefs

Each slot becomes a brief: the words on the image, what the picture shows, the layout, the feed copy, and the prompt for the image model. The studio's ad planner writes them, so each gets what every studio ad gets (`image-ad-copy`, the brand voice, the research, the lessons, the checks and 1 automatic rewrite).

Rules that are specific to the sprint:

- **Headline: 6 words or fewer** where the idea allows, and never more than 10. Lead with what the buyer wants, not with a description of the product. No full stop at the end.
- **No 2 headlines in the sprint share most of their words** or open on the same 3 words. Each set is told the headlines already written; a pair that still collides is written again.
- **The layout reference is used once in the whole sprint**, and no reference brand more than twice. It gives composition only.

## Stage 3: render and check

Each ad is rendered with the real product photo, the brand's type specimen and its layout reference attached, and checked (`skills/production-principles`, section 9). A failed image is rendered once more with the notes as corrections. What still fails is shown as failed, never hidden. The finished wall is filtered by format, angle, buyer, product and check result.

## What this reads from the brand brain

A blank field is a gap the plan names; it is never filled by guessing.

| Document | Field | Used for |
|---|---|---|
| `customer-avatars.md` | Ranked insight bank, Customer language bank; per avatar: Grounded in, What almost stops them, The moment | The angle map, the hooks, the scenes |
| `competitors.md` | Gaps worth owning, Differentiation summary | Angles nobody else is making |
| `winning-ads.md` | Pattern summary | Formats and angles already proved |
| `brain.md` | Market awareness level, Market sophistication, What we know works, What to avoid | The spread of stages |
| `products-and-positioning.md` | Per product: Key features, Who buys it, Looks like, Pack, How it is used, Visible result, Never show, Reference photos; Bundles and offers | What each idea may show and say |
| `brand-guidelines.md` | Category, Brand story, Brand world | The format mix for the category, the founder ad, the places |
| `brand.json`, `offers.json`, `personas.json` | Claims, proof assets, offers, guarantee, personas | Which formats can be made honestly; every fact in an idea |
