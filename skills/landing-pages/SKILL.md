---
name: landing-pages
description: The method for building and judging D2C ecommerce landing pages, for any product a brand sells online. Carry on from the ad that sent the visitor, answer what a buyer needs before buying in the order they need it, on a phone, and change the sections and the offer block by the kind of product (bought again, or bought once). Measure revenue per visitor, fix what moves the page most first (clarity, copy, offer, proof, friction). Loaded by the Landing pages module's writer, its checks and its CRO audit.
---

# Landing pages

For brand-led page composition and rendered design review, use [ecommerce-page-design](../ecommerce-page-design/SKILL.md). Its focused card is always loaded by CRO planning, section design and visual review; relevant detailed methods also participate in CRO retrieval. It complements buyer evidence and never overrides approved findings.

For review-led PDP repairs, use [the objection answer map](objection-answer-map.md): trace the question to its source, inspect the answer and visibility, identify missing proof, and place a checkable answer at the decision. The CRO runtime retrieves this method when relevant.

For observed-page audits and purchase-control research, use [ecommerce-funnel-inspection](../ecommerce-funnel-inspection/SKILL.md). It is loaded by every storefront audit and records the difference between visible controls, captured text, visual interpretation and untested purchase behavior.

For the CRO workspace's capture-to-export workflow, read `app-contract.md`. It applies the methods below to real desktop/mobile evidence and editable section design rather than requiring a fixed template. Runtime retrieval in `src/lib/landing/knowledge.ts` combines detailed Learning guides, cards, ideas and playbook passages with their applicability and evidence limitations. The app stops after audit and three textual art directions for an explicit finding/scope/direction approval. It then builds from that saved approval without asking again after every section. See the current approval and mobile-first storyboard contract before generation.

A landing page is judged on 1 thing: **does the visitor the ad sent find, in the order they need it, everything they need to buy, on a phone**. Most of what is sold as conversion rate optimisation is button colours. The 2 things that move a page are **measuring the right number honestly** and **working back from the page through the message and the buyer**. Design comes third, to reinforce the first 2.

## 1. Measure the right number

**Conversion rate is an output, not a lever.** It is the result of about 50 inputs, most of which are not on the page: category, price point, average order value, traffic source, how much the ad educated, purchase intent, the share of returning buyers.

- A store at 9% conversion and $50 orders can be a far worse business than one at 1% doing $200 million at a 50% contribution margin. Never compare conversion rates between brands, and never between a $30 product bought monthly and a $300 product bought once.
- **Revenue per visitor (RPV) = conversion rate x average order value.** Contribution per visitor = RPV x gross margin. Track these, over months, not conversion rate.
- Every single metric can be gamed. Turn off cold traffic and conversion rate jumps overnight while revenue collapses. Push higher priced products and AOV rises while CAC rises more. Judge with the finance numbers: contribution profit, LTGP to CAC.
- **Cold traffic lowers the blend.** Cold traffic from ads may convert at 1% and warm traffic at 4% (illustrative); a blend of 2.8% falls toward 1% as the brand scales cold spend. A falling blended rate while scaling is expected, not a page problem.
- Returning buyers convert higher and order more, which lifts both conversion rate and AOV. A product bought once has few of them: its page is judged on first orders, returns and referrals.
- **Why conversion rate still matters:** CAC = ad spend / (sessions x conversion rate). Doubling conversion rate halves CAC, which lets the brand spend more at the same CAC. It is also part of the ad platform's expected action rate, so a better rate lowers CPMs a little. And it is the one lever that needs no extra money.
- **The page has a ceiling** set by category, price and traffic quality. Once clarity, offer and proof are done, the next lever is the margin on the first order, new products, product quality and repeat purchase, not another redesign.

### Store numbers that lie (Shopify named; the same traps exist elsewhere)
- Total sales include tax. Use net sales plus shipping collected.
- The store's AOV leaves out shipping collected, which is real revenue. Add it back before RPV.
- Store sessions include bot traffic. Prefer the analytics tool's sessions for any per-session metric.
- Conversion rate itself, as above.

## 2. Fix the page in this order

Ranked by ICE (impact x confidence x ease), not by impact alone:

1. **Clarity and hierarchy.** Can a stranger understand it at once, above the fold, on a phone? Quickest, biggest win.
2. **Copy.** Does it remove doubt and speak to the actual desire?
3. **Offer.** Is the thing on offer worth converting on? The biggest impact of all (a $1M car for free converts at 80%), but the hardest to change.
4. **Proof.** Do they believe the claim and the mechanism?
5. **Friction.** Is anything physically in the way of buying?

This is also the order of a good page from top to bottom: clarity, then copy that explains the mechanism, then the offer, then proof, then nothing in the way.

**Mobile first.** Most paid traffic reads on a phone (60 to 95%, rule of thumb; read the brand's own device split when analytics are connected). Judge every page on a phone. Desktop gets 10% of the effort.

**Load time is part of clarity.** A page that loads in 4.8 seconds loses to one that loads in 0.9.

### What a buyer needs before buying, in order

Every page type answers these 7, top to bottom. A page is judged by walking them on a phone and noting the first one it does not answer.

1. **Is this the thing the ad showed me?** The same promise, the same words, the same picture (section 4).
2. **What is it, and what does it do for me?** The outcome, then what it is.
3. **Why this one?** The mechanism, or the difference from what they use or tried.
4. **Do I believe it?** Proof that matches the claim, from real customers or a named source.
5. **What exactly do I get, and what does it cost in full?** The offer, what is in the pack or the box, the price with anything added at checkout.
6. **Will it work for me?** Section 12 says what this means by kind of product: size, fit and care for a product bought once; taste or feel, how to use it and how long a pack lasts for a product bought again.
7. **What if it does not, and when does it arrive?** Returns, guarantee, warranty, delivery time, then 1 button.

## 3. Above the fold: 4 questions

A product page answers all 4 before the first scroll:

1. **What is it?** Not "Face serum 30 ml" or "28 cm carbon steel pan". "The vitamin C serum that does not sting sensitive skin." "The non-stick pan with no coating to wear off."
2. **Why this one?** The unique mechanism, the reason it is different from what they tried. A sub-line can add one more reason ("Vitamin C loses strength on the shelf, so we bottle in small batches"; "1 piece of steel, so there is no rivet to work loose").
3. **Why now?** A real reason to act today. For a product bought again: a gift with the first order, a starter pack, the price per day. For a product bought once: when it arrives, free returns, the warranty, a real season, pay in instalments. Never invented urgency. If the brand states none, the first screen says none.
4. **Why trust you?** The brand's own star rating and review count as the brand states them, right under the title. Never a default, never rounded up. A brand with no stated rating shows 1 customer's words, word for word, or a fact it can stand behind (years made, warranty length, tested by a named body). A blank is better than a filled-in guess.

Ordered by persuasive weight: value proposition, then proof, then price, then the button. A quantity box does not belong above the fold. A size or colour picker does when the product cannot be bought without it (a jacket, a ring, a mattress), with the size guide 1 tap away; for a product sold in packs, lead with the pack or bundle options. Give a **scroll cue** (a fade, a "more below") so the visitor knows there is a page.

## 4. Continuity: the page continues the ad

The biggest single lever. A visitor decides in the first screen whether they landed in the right place.

**What the page takes from the ad, and where it goes:**

| From the ad | On the page |
|---|---|
| The hook line (the headline on the image, or the first spoken line) | The hero headline keeps its main words. The sub-headline adds what the ad left out |
| The buyer it spoke to | The whole page is written to that buyer: their words, their objections, their reviews |
| The offer it named (the pack, the price, the gift) | The first buying option, at the same price, with the same name. An ad that named no offer leads to the brand's standing offer |
| The picture (the product as shown, the person, the scene) | The first image of the hero is the same product, pack and variant, and where the brand has it, the same picture |
| The question it opened (an advertorial ad, a list) | The first screen starts answering it |

- A concept changes 1 of 3 things: the **persona**, the **offer** or the **angle**. Each change needs its own page.
- Persona: the same pan for a first-time cook and for someone replacing their 4th non-stick are 2 pages. The same protein powder for women in menopause and for 19-year-old men at the gym are 2 pages.
- Offer: a bundle, a single product and a different product are different pages.
- Angle: a product can be spun many ways. A page that lists every benefit tells the buyer who came for 1 that the product is for everything, so they do not believe it is for them. **Specificity beats breadth**, on the page and in the ad.
- The hero says what the ad said: ad "The pan with no coating to wear off" leads to a hero "The pan with no coating to wear off".
- A page built for no ad is written for 1 buyer and 1 angle all the same, and says so in its brief.

## 5. Copy

- **Write about the person, not the product.** Too much about what it is, not enough about why it matters.
- **The so-what test.** Every line must answer "so what?". "Triple peptide complex" fails; "Firmer skin in 4 weeks" passes if the brand states it. "3 mm carbon steel" fails; "Sears a steak the way a restaurant pan does" passes.
- **Lead with the outcome, justify with the feature.** "Dry on the bike in an hour of rain, with taped seams and a 20,000 mm shell", not the other way round.
- **Your product is probably not unique. Reposition it as one of one.**
  - Export the reviews and ask which feedback sets the product apart. Customers often name a benefit the brand never noticed ("the first retinol that didn't make me peel"; "the only rain jacket I wear to the office").
  - Combine 2 benefits nobody else claims together.
  - Find white space: the same product for a buyer the category ignores.
  - Free shipping, great service and fast delivery are table stakes. They do not make anyone unique: never a headline. They are still answers a buyer needs (section 2, need 7), so they sit under the button and in the questions, stated plainly.
- **Handle every objection toward the end**, including every other solution they could choose instead (cheaper, already owned). Use the FAQ for it.
- **FAQs answer the reasons people do not buy**, in the buyer's words, from customer research. "Will it sting sensitive skin?", "How long does a bottle last?", "What if it does not fit?", "Does it work on an induction hob?". Returns, delivery and warranty are reasons not to buy and belong here, asked as the buyer's worry and answered with the brand's terms. What does not belong: questions nobody asks before buying ("What is your shipping policy", "How did the brand start", "Where are you based").

## 6. Offer

The offer is the positioning of the product in the market, not a discount. Discounting is the lazy way out: it erodes margin and trains buyers to wait for sales.

- **Reframe beats discount.** The same product bundled as a "New Year reset" or a "first kitchen set" at full price can outsell it on sale.
- **Gift with purchase:** worth far more to the buyer than it costs to make. Raises perceived value without cutting price.
- **Bundles:** for a product bought again, a routine whose steps are each needed for the outcome; for a product bought once, the set that completes it (the lid and the care kit with the pan, the liner with the jacket). The saving is the shipping the brand saves by sending together, so margin is kept.
- **A compare-at price is a real former or separate price**, never one made up to anchor.
- **Shipping:** free shipping is not always a win. Keep everything added at checkout under 10% of AOV (rule of thumb) and show the full price up front. If free shipping is offered, set the threshold from the most common order value, not the average.
- **The cart upgrade:** the visitor adds the single product; the cart shows what the set or the routine adds, with 1 click to upgrade.
- **Post-purchase one-click upsell:** relevant to what was bought, right after payment, no card re-entry. More of the same suits a product bought again; what goes with it suits a product bought once.

Section 12 gives the offer block by kind of product.

## 7. Proof

- **Reviews first.** Going from no reviews to a first few dozen is the largest step (the masterclass put it at "0 to about 80 can double conversion": rule of thumb, no published source). Beyond that the effect is hard to measure.
- **Every review shown is a real one, word for word, with where it came from.** Never written, shortened into new words, or given a name the source does not give.
- **Sort reviews with photos and video first.** Ask for photo reviews where it is legal (a credit, not a payment for a positive review).
- **Proof must match the claim.** If the page promises firmer skin in 4 weeks, show reviews about firmness. If it promises a pan that lasts, show reviews from people who have had it for years. 5 relevant reviews beat 400 generic ones.
- **Press, awards and certifications** are shown only when the brand holds them, named as the brand's facts name them. No logo strip made to look like one.
- **Low-quality trust signals do nothing:** security seals and trust badges in the footer. A guarantee is table stakes but works as a risk reversal at the end of the proof.

## 8. Friction (cart and checkout)

Baymard Institute's cart abandonment research (figures as quoted in the masterclass; the study is updated yearly, so read the current one before quoting a number): about 70% of carts are abandoned, and 43% of those were only browsing. For the rest:

| Reason | Share | Fix |
|---|---|---|
| Extra costs too high (shipping, tax, fees) | 39% | Keep everything added at checkout low; show the full price up front |
| Delivery too slow | 21% | State when it arrives, on the page; a fast option |
| Did not trust the site with card details | 19% | Proof and brand presence; do not look like a scam |
| Forced to create an account | 19% | Guest checkout on |
| Checkout too long | 18% | Fewest fields, 1 page, wallet payments at the top |
| Returns policy | 15% | State it clearly, on the page, by the button |
| Total cost not shown up front | 14% | No price that changes in the cart (a quarterly-only subscription shown as a monthly price) |

3 of the 7 (cost, delivery, returns) are answered by facts the page can state. They are also the facts a brand most often has not written down (see the last section).

## 9. Testing honestly

- To trust a 10 to 20% lift you need roughly **1,000 conversions per variant** (rule of thumb; the test calculator works it out from the brand's own rate). At 2.5% conversion that is about 40,000 sessions per variant, 80,000 for a simple A/B test. Most 7-figure brands cannot produce that on 1 page in a month.
- A green result after 2 weeks on 100 conversions is noise. Stopping a test the day it looks significant inflates false positives.
- Email and SMS campaigns spike conversion and contaminate a test that splits all traffic. Test on custom pages that only take cold ad traffic.
- Many buyers take more than 1 click to buy, which blurs any split. A product bought once after long thought takes more visits than one bought on impulse.
- A real CRO programme of progressive tests is worth it from about $8 to 10M a year online (rule of thumb), with enough sessions and a clean account structure. Below that, ship the obvious fixes.
- Use a heatmap and session recording tool. List every possible change, score each out of 10 for impact, confidence and ease, multiply, and work from the top.
- **With no analytics at all** the page can still be judged: walk the 7 needs of section 2 on a phone and run the checklist. What analytics add is size (which leak costs most) and proof that a change worked. Without them, findings are ranked by ICE and none is given a money value.

## 10. Beyond the product page

Cold traffic from long, unaware-level video needs a page that continues the story, not a product page. The rules of each are in `kinds/`:

- **Advertorial** (`kinds/advertorial.md`): hook, problem, what people try, the cause, the product, proof, risk reversal, CTA. The hook reuses the ad's words. It is marked as advertising, told in the brand's own voice, and never by a made-up person.
- **Reasons-why page** (`kinds/listicle.md`): "N reasons why", a trailer for the product page. Ad, then listicle, then product page.
- **Product landing page** (`kinds/pdp.md`): the default.
- **Quiz funnels** for products that need matching (a shade, a size, a formula). Not built by the app yet.

## 11. Do not over-optimise

Dark patterns and claims the product cannot keep raise conversion now and cost later: more returns, chargebacks, fewer repeat orders, weaker LTV. Do not promise firmer skin in 4 weeks, or a pan that never sticks, if it does not happen. Watch returns and 365-day LTV by angle: an angle that converts but does not satisfy is a loss.

## 12. What changes by kind of product

Ask of every rule: does it hold for a pan, a jacket and a serum? Most do. These do not.

| | Bought again (a serum, a snack, a supplement, coffee) | Bought once (a pan, a jacket, luggage, a mattress) |
|---|---|---|
| How it is bought | Quickly, and again if it worked. The first order is a trial | After longer thought, often over several visits, compared with others |
| "Will it work for me?" means | Taste or feel, what is in it, how to use it, how long a pack lasts, when to expect a change | Size and fit, dimensions and weight, what it is made of, what it works with, how to care for it, how long it lasts |
| Sections the page needs | What is in it (ingredients, and what each does); how to use it; how long a pack lasts; what to expect and when, only as the brand states it | Size or fit guide; dimensions and materials; what is in the box; how it is made or why it lasts; care; comparison with the cheaper kind |
| Sections it can drop | Size guide, what is in the box (unless a kit) | Price per day, "how long a pack lasts", subscription terms |
| The offer block | One-time against subscribe, with the real saving in money, the price per day, how often it arrives, and "pause or cancel" in the brand's words. A starter or trial pack. A gift with the first order | 1 price, the variant picker (size, colour), what is in the box, delivery time, returns window, warranty. A set or the accessory that completes it. Pay in instalments above a price the brand chooses |
| "Why now" | A gift, a starter pack, the price per day | When it arrives, free returns, a real season, instalments |
| Risk reversal | Money-back guarantee, cancel any time | Returns window and who pays the postage, warranty and what it covers, repairs |
| Proof that fits | Reviews about the result and about sticking with it | Reviews from long-time owners, wear photos, tests by a named body |
| FAQ | Taste, safety with what they already take or use, how long until a change, how to pause | Fit between sizes, compatibility, care, what the warranty leaves out, how a return works |

A kit of a durable and its refills (a razor and blades, a machine and pods) uses both columns: the once-bought part first.

## The checklist

1. Measure RPV or contribution per visitor, not conversion rate.
2. The first screen carries on from the ad: its words, its buyer, its offer, its picture.
3. Clarity and hierarchy: the 4 questions above the fold, on a phone.
4. Copy that removes doubt: benefit-led, one of one, objections handled with real customer language.
5. An offer worth converting on, in the offer block that fits the kind of product.
6. Proof that matches the claim: real reviews, word for word, photos first, no trust badges.
7. Returns, delivery and the full price stated on the page. No friction at checkout.

## Files

- `CARD.md`: the same rules without the reasoning, for a writer step.
- `kinds/pdp.md`, `kinds/listicle.md`, `kinds/advertorial.md`: the rules of each page type, sent to the writer on top of the card.
- `structure.md`: the ecommerce page structures (ThrillX: home and product landing page, desktop and mobile), section by section, and what changes by kind of product.
- `copy-formulas.md`: the formulas for headlines, sub-headlines, problem-agitate-solve, value props and CTAs.
- `checklist.json`: every check the app runs, with its id, where it comes from and how it is tested.
- `REFERENCES.md`: the references library: which other skills, templates and examples the module uses, and when.

## What this reads from the brand brain

| What | Where (contract names) | When it is blank |
|---|---|---|
| The product: what it is, format, variants | `products-and-positioning.md` Product catalog (What it is, Key features, Variants); `brand.json` products (`format`, `variants`) | No page: the brain needs a product first |
| What it is made of | `brand.json` products `ingredients` (name, dose, job) or `specs` (material, size, capacity, weight) | Leave the section out. Never guess a dose or a dimension |
| How it is used | Product catalog: How it is used (new in the draft) | Leave "how to use it" out and list it as missing |
| The offer and its price | `offers.json`; `brand.json` offers (price, `per_day`, notes) | The page shows the product's price only; no saving is stated |
| The guarantee | `brand.json` guarantee (text, window in days) | No guarantee is promised; the line under the button stays empty |
| Claims, with sources | `brand.json` claims, forbidden claims | Fewer value props. Never a new claim |
| Proof | `brand.json` proof assets; a rating only where a claim states it | No rating line. A customer quote, or nothing |
| Real quotes | `customer-avatars.md` Grounded in, Customer language bank; the research | No reviews section, and the page is marked as lacking proof |
| The buyer and their objections, ranked | `customer-avatars.md` per avatar (What almost stops them, How to talk to this person); `personas.json` | The page is written to "anyone who might buy", and the FAQ holds only what the facts answer |
| Comparison | `competitors.md` Differentiation summary; a claim worded "x against y" | No comparison section |
| Voice | `brand-guidelines.md` Brand voice and tone, Brand guardrails | The house style |
| Look | `brand-look.json`; `assets/` product photos | Labelled empty image slots |
| The ad | The ad's headline, hooks, angle, buyer, offer and image, from Creative Studio or the ad account | The page is "not for 1 ad": it still has 1 buyer and 1 angle |

**Not in the contract, and a page needs them** (proposed names; until they exist the page leaves the line out, and never writes a term the brand has not stated):

- `products-and-positioning.md` > **Shipping and delivery**: where the brand ships, what it costs, the free-shipping threshold, how long it takes.
- `products-and-positioning.md` > **Returns**: the window, who pays the postage, the state the product must be in, how a refund is paid. Kept apart from the guarantee.
- `products-and-positioning.md` > **Warranty**, per product: how long, what it covers, what it leaves out.
- Product catalog > **Bought again or once**: "again", "once" or "both" (a kit and its refills). Today the writer has to guess it from whether the product has a subscription or a size, and the wrong guess gives a jacket a price per day.
- Product catalog > **What is in the box**: every item in the pack, counted.
- Product catalog > **Size and fit**: the size chart, how it runs, the model's size, or dimensions and weight and what it fits (hob types, cabin luggage limits).
- Product catalog > **How long it lasts**: a pack in days at the stated use, or the expected life of the product if the brand states one.
- Product catalog > **Care**: how to clean, store or maintain it.
- Product catalog > **Subscription terms**: how often, how to pause or cancel, what the saving is.
- `products-and-positioning.md` > **Frequently asked questions**: the brand's own questions and answers, word for word, with where each is published.
- `competitors.md` > **Comparison facts**: rows the brand can stand behind (this against the usual alternative: price, what it is made of, how long it lasts), each with a source.
- `brand-guidelines.md` > **Proof on file**: the rating and count with the date and where it is shown; press, awards and certifications with a link to each.
