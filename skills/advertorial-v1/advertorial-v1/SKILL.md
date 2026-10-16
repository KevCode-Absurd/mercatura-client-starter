---
name: advertorial-v1
description: Build a long-form D2C advertorial landing page as 1 self-contained HTML file, for any brand and product. The page carries on from the ad that sent the reader, leads them through a problem they recognise, what they tried, the cause underneath and then the product, and sells late. Marked as advertising, told in the brand's own voice, never by a made-up person. Usable from any assistant with supplied brand context; file and browser steps depend on available tools.
trigger: user invokes /advertorial-v1, wants a long-form advertorial landing page, wants a "story-driven" or "narrative" landing page, or says "build an advertorial for [brand/product]"
reference: reference/template-example.html
---

# Advertorial V1

Use from any assistant/harness with the context and tools this task needs. Follow [Harness portability](../../README.md#harness-portability): discover tool capabilities, carry explicit brand evidence, and deliver source with accurate execution status when file/browser tools are unavailable.

**This skill builds one thing: a long-form advertorial landing page.** Not a feature list, not a homepage. An article-shaped page for a reader who does not yet know they need the product: a problem they recognise, what people try first, why that fails, and then the product as what follows. The order of the story is fixed. The brand, the product, the buyer and the words change.

**What it is judged on:** a reader who tapped the ad finds the same promise in the first screen, reads to the product, and believes every line because every line is the brand's own fact.

In the app, a page of this type is written by the Landing pages module from `skills/landing-pages/CARD.md` and `skills/landing-pages/kinds/advertorial.md`; the rules there and here agree. The planning step of a static advertorial ad is sent this skill's `CARD.md`. This file is the whole method, for a person building the HTML page by hand.

## Rules that hold on every page

1. **It is advertising and says so.** A visible "Advertisement" label by the logo. No publication name, masthead, "as seen in" strip, news date or section name made to look like editorial.
2. **Who tells it.** The brand's own voice, about the reader ("you") or about buyers like them ("they"). First person by the founder only when the founder's own words are on file (an interview, an upload). A customer speaks only as a real quote, word for word, with where it came from. An expert appears only as a real, named person the brand has an agreement with and whose words are on file. Never a made-up founder, customer, doctor, journalist or author line, and never initials standing in for one.
3. **Proof is the brand's own.** A review shown is a real one, word for word, with its source. No default review score or count, no invented press logos, no badge the brand does not hold. With no reviews on file, the reviews block is left out.
4. **Facts come only from the brand brain:** claims, prices, the offer, guarantee and returns terms, ingredients or materials, timeframes. A fact not on file is asked for or left out, never estimated.
5. **It carries on from the ad** (see the next section).
6. **No generated children, and no person shown as the founder, a customer or an expert unless that person's real photo was uploaded.**
7. **The reference template is a layout.** `reference/template-example.html` was built for 1 haircare brand. Its narrator, its review score, its reviews and its copy are sample content: none of it is carried into a new page.

## What the page takes from the ad

Ask which ad sends readers to this page before writing a word.

| From the ad | On the page |
|---|---|
| The headline on the image, or the first spoken line | The page's headline is that line, or keeps its main words. No brand or product name in it |
| The question the ad opened ("why does this happen", "3 reasons the usual fix fails") | The first 2 paragraphs start answering it. A reader who has to hunt for the answer leaves |
| The buyer it spoke to | The story is that buyer's: their words, what they tried, their objections |
| The offer it named | The first option in the pricing block, same name, same price |
| The picture (the product as shown, the scene) | The hero image shows the same product, pack and variant; the same picture where the brand has it |

A page built for no ad still needs 1 buyer and 1 problem: write them down first.

## The story, in order

Each part appears once.

1. **Hero.** Eyebrow (3 to 6 words naming the reader or the subject), headline (10 to 18 words about the problem or what was found), the "Advertisement" label. No button here.
2. **The problem**, in the reader's own terms. 3 or 4 short paragraphs. No brand name, no pitch. Ends on the question the reader is asking themselves.
3. **What people try first.** 3 to 6 things, named plainly as kinds of thing (not rival brands), and why each falls short. Said in this 1 place only.
4. **The cause underneath.** 2 or 3 paragraphs on why those fixes fail. This is where the mechanism is explained, and it leads straight into the product.
5. **The product**, as what follows from the cause. A boxed block: what it is, 3 or 4 things it does, each tied to the cause.
6. **Trust band.** 3 short phrases, each a fact on file (what is left out of it, the returns window, the guarantee).
7. **Pricing.** See "The pricing block" below.
8. **3 benefit cards.** A 3 to 5 word headline and 1 sentence each.
9. **Who it is for, and who it is not for.** 3 of each. Saying who it is not for is what makes the rest believed.
10. **What is in it, or how it is made.** 3 or 4 callouts: an ingredient or a material or a step of the making, and what it does for the buyer.
11. **Reviews.** Real ones only, the ones about this page's problem, each with its source. Left out if none is on file.
12. **FAQ.** 6 to 8 reasons this reader still would not buy, in their words.
13. **Closing call to action.** A short headline, 1 sentence, the button, the risk line.

The button first appears after part 5 and stays in view from there.

## What changes by kind of product

| | Bought again (a serum, a snack, coffee, a supplement) | Bought once (a pan, a jacket, luggage, a mattress) |
|---|---|---|
| The problem | Something felt or lived with daily | Something that keeps failing, wearing out or not fitting |
| What people try first | Other products of the kind, home fixes, doing nothing | The cheaper kind bought again and again, the big-name default, making do |
| The cause underneath | What is in the usual product, the dose, how it is taken | How the usual product is made, the material, the part that fails |
| Part 10 | Ingredients and what each does | Materials, construction, dimensions, what it works with |
| The pricing block | The single pack; one-time against subscribe with the saving in money; a starter or routine bundle. Say how long a pack lasts and how to pause or cancel, in the brand's words | 1 price with the size or colour picker; what is in the box; the set or accessory that completes it. Say when it arrives, the returns window and the warranty. Never "3x" of the same item or a "supply" |
| FAQ | Taste or feel, who it suits, when to expect a change (only as the brand states), pausing | Which size, what it works with, care, how a return works, what the warranty covers |
| Risk line | Guarantee, cancel any time | Returns and warranty |

## The pricing block

- **Single card:** the product, its price, 1 button. No quantity box. A size or colour picker when the product cannot be bought without one.
- **Options card:** up to 3 rows, each an offer the brand really runs, under the brand's name for it, at its price. A row is left out before it is invented. A saving is shown in money; a compare-at price is a real former or separate price.
- Under each button: the guarantee or returns line and the delivery line, as the brand states them. With neither on file, nothing.
- Below about 100 in the brand's currency a flat bundle price reads stronger than a percentage. Suggest it; the brand confirms.

## Building the page (for a person, step by step)

Start at step 1. Do not narrate the skill.

1. **Brand and product.** Ask: "Which brand are we building this for, and which product is the page about?"
2. **Read the brand brain first.** If the brand has one, read the fields listed in "What this reads from the brand brain". Only with no brain: ask for the website and read the homepage, the product page, and the shipping, returns and FAQ pages. Present a short snapshot (brand, product, price, colours, fonts, buyer, what was not found) and wait for corrections. A rating, a review or a guarantee goes into the snapshot only as found, with the page it was found on.
3. **The ad.** Ask which ad this page follows and fill the table above. If there is none, agree the buyer and the problem.
4. **Who tells it.** Offer the choices the brand's material allows, written out for this brand, with a recommendation:
   - The brand's voice about the reader (always available).
   - The founder, first person (only with the founder's own words on file).
   - A customer's story (only as real quotes; the brand's voice carries the rest).
   - A named expert (only a real one, with their words on file).
5. **Lock the variables:** brand name, page title, eyebrow, headline, product name, price, the offers shown, guarantee or returns line, delivery line, 3 trust phrases, colours (primary, primary deep, secondary, tint, text, rule), fonts. Anything not on file is marked "not on file" and its slot is left out.
6. **Write the copy** for every part of the story, before any HTML. Short paragraphs, 2 sentences at most. Show the draft and wait for approval.
7. **Collect images** in 1 message: hero (the ad's picture, or the same product and scene), problem (optional), the product in context, a clean product shot for pricing, a close view of the ingredient, material or making, and customer photos only if real and cleared. "Skip" leaves a marked placeholder.
8. **Build the HTML**, 1 self-contained file, sections in this order: head (fonts, all CSS), header with the "Advertisement" label, hero, problem, what people try, the cause, the product block, trust band, pricing, benefit cards, for and not for, callouts, reviews (if any), FAQ accordion, closing call to action, footer, script. Use `reference/template-example.html` for the CSS patterns, layout and scripts only.
9. **Check it on a phone width first**, then deliver. Save as `[product-slug]-lp.html`, or output the full HTML in a code block where there is no file access. List every `[INSERT: ...]` image placeholder at the top of the delivery note.

## Design rules

- **No emoji anywhere.** Every icon is an inline SVG.
- Stars, where a real rating is shown, use the `&#9733;` entity. No rating on file: no stars.
- A review card shows the customer's name as the source gives it. No avatar initials made up for a name the source does not give.
- **Options selector:** stacked rows; clicking a row selects it and clears its siblings.
- **Benefit cards:** large radius, a dashed border in the primary colour, a lift on hover, no heavy shadow.
- **Scroll animations:** fade and rise on entering view, eased out, siblings staggered. Content is readable with scripts off.
- **CSS variables** for every colour (`--primary`, `--primary-deep`, `--secondary`, `--tint`, `--text`, `--rule`). No hex in a section rule.
- Every `<img>` has a descriptive `alt`. A missing image is `<img src="[INSERT: hero image]" alt="[INSERT: descriptive alt text]">`.

## Checklist before delivering

- [ ] The "Advertisement" label is visible in the first screen
- [ ] The headline keeps the ad's words and names neither brand nor product
- [ ] The first 2 paragraphs start answering what the ad asked
- [ ] No author line, narrator, expert or reviewer that is not a real person on file
- [ ] Every review is word for word with its source, or the block is gone
- [ ] No rating, count, press mention, badge, timeframe or price that is not on file
- [ ] The story is in order, and "what people try first" appears once
- [ ] No button before the product is explained
- [ ] The pricing block fits the kind of product, and every row is a real offer
- [ ] Returns, guarantee and delivery lines are the brand's own words, or left out
- [ ] Nothing from the reference template's sample copy remains
- [ ] No emoji; every image has `alt`; the FAQ and the options selector work
- [ ] No long dashes in the copy

## What this reads from the brand brain

| What | Where (contract names) | When it is blank |
|---|---|---|
| The buyer, their problem in their words, what they tried, what almost stops them | `customer-avatars.md` per avatar (Who they are, What almost stops them, The moment), Customer language bank, Ranked insight bank | Ask. The story cannot be written without a buyer and a problem |
| The mechanism: why the usual fix fails and why this works | `brand-guidelines.md` Unique selling propositions; Product catalog: Positioning angle, Key features; `competitors.md` Differentiation summary | Ask the founder. Do not invent a cause |
| Ingredients, or materials and dimensions | `brand.json` products (`ingredients`, `specs`) | Leave part 10 out |
| The offer, price, guarantee | `offers.json`; `brand.json` offers and guarantee | Single price only; no guarantee line |
| Real quotes with sources | `customer-avatars.md` Grounded in; the research | Leave the reviews block out |
| The founder's own words | The founder interview, where the brand has one | The founder does not narrate |
| Claims and forbidden claims | `brand.json` claims, forbidden claims; `brand-guidelines.md` Brand guardrails | Fewer claims, never new ones |
| Voice, colours, fonts | `brand-guidelines.md` Brand voice and tone; `brand-look.json` | House style; ask for colours |
| Photos | `assets/`; Product catalog: Reference photos (new in the draft) | Marked placeholders |
| The ad the page follows | Creative Studio or the ad account: headline, hook, buyer, offer, image | Agree 1 buyer and 1 problem instead |

Not in the contract, and this page needs them: **Returns** (window, who pays), **Shipping and delivery** (cost, time), **Warranty**, **What is in the box**, **Size and fit**, **How long a pack lasts**, **Subscription terms**, the brand's own **FAQ**, and **Experts on file** (a named person, their role, their words, and the brand's right to use them). Until they exist, the line is left out.
