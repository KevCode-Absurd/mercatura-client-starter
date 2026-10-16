# Ecommerce page structures

This is the overall shape, not a template to copy box for box. Each brand bends it: a section the brand cannot fill truthfully is changed or left out.

The bands in grey on the wireframes are the same 3 jobs repeated down the page: **social proof**, **reduce FUDs** (fear, uncertainty, doubt), and **a unique offer**. Proof is never more than 1 thumb-scroll away.

## Product landing page (the default page type)

Wireframes: `product-page-desktop.webp`, `product-page-mobile.webp`.

| # | Section | What the wireframe asks for | Builder section |
|---|---|---|---|
| 1 | Announcement bar | "Highlight social proof, reduction of FUDs or unique offer (free shipping, money back guarantee)" | `announcement` |
| 2 | Navigation | Logo, 3 or 4 links, account, search, cart | (rendered with the page) |
| 3 | Hero: gallery | Product tag ("Best seller", "New"), main image, thumbnails. The gallery is a mini landing page: benefits, proof, before and after in the images | `hero.gallery` |
| 4 | Hero: buy box | Stars and review count; "(Biggest product benefit) - (Product name)"; compare-at price, price, "You save X%"; "Product description outlining the biggest unique benefit or feature and how the end user would benefit"; 4 benefit icons; options (1. choose, 2. choose); bundle rows with "Most popular"; total; Add to cart; under it satisfaction guarantee, shipping policy, guarantee icons; accordions (product details, FAQ, ingredients, shipping and returns) | `hero` |
| 5 | Social proof (UGC), scrollable | 3 or more UGC or video testimonials, then "Shop now" | `ugc` |
| 6 | Benefit icon strip | 7 icons, each a product benefit | `benefits` |
| 7 | Value prop and big benefit #1 ("WIIFM") | Image or video that reinforces the value proposition; "Our product does X, Y, Z (main benefit and how it does it in a proprietary or unique way)"; CTA | `value_prop` |
| 8 | Value prop and big benefit #2 | Copy on the left, accordion of benefits (#1 open with its description, #2, #3), image right | `value_prop` (with points) |
| 9 | Social proof (UGC, stats, testimonials, reviews) | 1 proof block, "Main action to take" | `reviews` |
| 10 | Differentiators | "Benefit driven headline: how you do it as well as what makes you different"; 6 cards (differentiator, body); CTA | `differentiators` |
| 11 | Benefit icon strip | As 6 | `benefits` |
| 12 | Value prop and big benefit #3 | 4 benefit headlines with a line each, image | `value_prop` |
| 13 | Money back guarantee | "Highlight your satisfaction or money back guarantee here to reduce customer fear, anxiety, or doubt around purchasing"; CTA | `guarantee` |
| 14 | Social proof | As 9 | `reviews` |
| 15 | FAQ | Image or video beside 4 questions; CTA | `faq` |
| 16 | Social proof | As 9 | `reviews` |
| 17 | Final value prop | "Final value prop and reason someone should purchase your product today", over a background image; CTA | `final_cta` |
| 18 | Footer | | (rendered with the page) |

Mobile is the same order, 1 column. The buy box sits right under the gallery, so price and Add to cart are above the fold. A sticky Add to cart bar follows the visitor once the hero scrolls away (`sticky_cta`).

## Homepage

Wireframes: `home-desktop.webp`, `home-mobile.webp`.

| # | Section | What the wireframe asks for |
|---|---|---|
| 1 | Announcement bar | Social proof, FUD reduction or unique offer |
| 2 | Social proof #1 | A line of proof above the hero |
| 3 | Hero | "Dream outcome, benefit and what's in it for me". Sub-line: "Stop doing X / No more Y / pain point. Our product does X, Y, Z". CTA, and a social proof line beside it |
| 4 | Hero media | "Image or video that helps reinforce core value proposition and articulate what it is you do. Make sure to fulfill all 3 buying dimensions: **Functional**: what it does, solves a specific problem or makes life easier. **Emotional**: how it makes them feel, confident, secure or excited. **Social**: how it makes them look, status, image or belonging." |
| 5 | Social proof #2 | Logos or a stat bar |
| 6 | Bestselling products | Category tabs; product cards with tag, image, stars, name, 1-line benefit, Add to cart |
| 7 | Social proof section | 3 UGC or video testimonials, "Shop now" |
| 8 | Benefit icon strip | |
| 9 | Value prop #1 and #2 | As on the product page |
| 10 | Product categories | Category cards with "Shop now" |
| 11 | Social proof section | |
| 12 | Differentiators | "Benefit driven headline: how you do it and what makes you different", 6 cards |
| 13 | Benefit icon strip, value prop #3 | |
| 14 | Money back guarantee | |
| 15 | Social proof section | |
| 16 | FAQ | Image or video beside the questions |
| 17 | Additional offers | "List an offer that relates to your ecommerce firm: selling in bulk, a product quiz, a contact page" (1 wide, 2 below) |
| 18 | Final value prop | Over a background image |
| 19 | Footer | |

## The general landing page (B2B / general V1, for reference)

Hero with the dream outcome and a lead form above the fold; "Address the largest pain point that you solve and the old way, while tying in your unique benefit" (paint the prospect's pain, expose the flaws of the status quo); 3 alternating value props ("Our solution does X, Y, Z"); social proof; differentiators; "How it works? Make the perceived likelihood of achieving success high and effortless"; meet the team; guarantee; FAQ; final recap ("why should people take action today: create urgency"). The pain section and "how it works" are borrowed into the advertorial and the product page where the product needs them.

## How the 3 page types map to the masterclass

| Page type | Buyer | Order |
|---|---|---|
| Product landing page | Product aware, most aware | The table above. Clarity (hero answers the 4 questions), copy (value props, differentiators), offer (bundles in the buy box), proof (reviews matching the claim), friction (guarantee, FAQ, sticky cart) |
| Listicle | Solution aware | Hero (angle headline, "N reasons why"), reasons each supporting the 1 angle with proof labelled by the problem it solved, offer box, FAQ, CTA. Ad, then listicle, then product page |
| Advertorial | Unaware, problem aware | Hook in the ad's own words, problem, agitation, failed solutions, the mechanism, the product, objections, proof, risk reversal, CTA |

Each page type's rules for the writer are in `kinds/` (`pdp.md`, `listicle.md`, `advertorial.md`).

## What the first screen takes from the ad

Whatever the page type, the first screen repeats the ad that sent the visitor: the hook line in the headline, the buyer it spoke to, the offer it named as the first buying option, and the same product, pack and variant in the first image (the same picture where the brand has it). `SKILL.md` section 4 has the table.

## What changes by kind of product

The wireframes were drawn for a product sold in packs with a bundle row and a subscription. A product bought once after longer thought needs other sections and another buy box. `SKILL.md` section 12 has the reasoning; this is the section list.

| Section of the product landing page | Bought again (a serum, a snack, coffee) | Bought once (a pan, a jacket, luggage) |
|---|---|---|
| 4. Buy box | Pack or bundle rows, one-time against subscribe with the saving in money, the price per day, "pause or cancel" | 1 price, the size and colour picker with the size guide 1 tap away, delivery time, returns window, warranty. No price per day |
| 4. Accordions | Ingredients, how to use, shipping and returns | Dimensions and materials, what is in the box, care, shipping and returns, warranty |
| 6 and 11. Benefit icons | What it does, what is left out of it, how it is taken | What it is made of, what it works with, how long it lasts |
| 7, 8 and 12. Value props | The result, what is in it and what each part does, how it fits a day | The result, how it is made and why it lasts, fit or compatibility |
| 10. Differentiators | Against the usual product in the category: what is in it, the dose, the taste | Against the cheaper kind: materials, what wears out, cost over the years it lasts (only with figures the brand states) |
| 13. Risk reversal | Money-back guarantee, cancel any time | Returns (window, who pays postage), warranty and what it covers, repairs |
| 15. FAQ | Taste or feel, who it suits, how long a pack lasts, when to expect a change, how to pause | Which size, what it works with, care, how a return works, what the warranty leaves out, when it arrives |
| Extra section | How to use it, step by step; what to expect and when, only as the brand states it | Size or fit guide; what is in the box, item by item |

The builder has no section type yet for a size guide, a specification list or "what is in the box" as its own block; until it does, these go in a value prop's points, the offer's "includes" list and the FAQ.
