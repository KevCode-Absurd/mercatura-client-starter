---
name: recreate-winning-ads
description: Read the visual and structural DNA of a brand's own winning ads (6 dimensions, plus what each ad argued and what was measured), record it in the brand brain, then plan new on-brand static ads in that DNA for a chosen product. 2 approval points (the DNA, then the concepts). Needs the brand brain and 3 or more measured winners. Triggered by "recreate winning ads", "make ads from my winners", "recreate from winners", "generate ads from my best creative". In the app the planner is sent CARD.md, not this file.
user-invocable: true
---

# Recreate Winning Ads

A brand's winning ads already hold what has converted for it in market: how it sets type, its colours, its layouts, how it shows the product, how its copy opens. That is a better guide than any description of the brand. This skill reads that DNA from the winners, writes it into the brand brain where every later job can use it, and then plans new static ads in the same DNA for a product the person names.

It is judged on 2 things. Someone who knows the brand's ads would take the new ad for one of theirs. And each new ad tests 1 thing the winners did not, so the result teaches something. A copy of a winner teaches nothing, and an ad that borrows only the look, without knowing why the winner won, is a guess in the brand's clothes.

## In this app

- A static ad remixed from a reference (the "static-remix" recipe) is planned with `CARD.md` as style guidance. This file is the whole method, for a person.
- The DNA is not a separate file. What is true of 1 ad goes in that ad's entry in `winning-ads.md`; what is true across the winners goes in its `Pattern summary`. Both use the fields under "What the brain's winning-ads.md must hold" below.
- How the product is shown true is `skills/production-principles`. How an image prompt is written is `skills/image-prompt-craft`. Which model renders, and what to do when a filter refuses a prompt, is `skills/production-principles/models.md`.
- Words on the image are the person's choice (on, off, or on with a copy without them).

## What counts as a winner

- An ad of this brand's that was **measured**: spend, a result (return on ad spend, cost per purchase, click-through), the dates, and how that compares with the account's usual.
- Where only a proxy is known (how long it has run, how many versions of it are live), it is recorded as a proxy, in those words.
- An ad nobody measured is a reference, not a winner. An ad from another brand is a reference too: the reference skills handle those.
- **How many:** 3 at least to see a pattern. 8 to 15 is best. 20 at most: beyond that keep the ones with the most spend or the longest run. With 1 or 2, do not call it DNA: it is 1 ad remixed, and the card's rules still apply.

## The method

2 hard stops. Nothing passes a stop without the person's yes.

| Step | What happens | Stop |
|---|---|---|
| 1 | Read the brand brain | Only if there is none |
| 2 | Ask: which product, which winners, how many ads | Waits for the answers |
| 3 | Read the DNA, write it into `winning-ads.md` | **Stop 1: the person approves the DNA** |
| 4 | Draft the concepts | **Stop 2: the person approves the concepts** |
| 5 | Make 1 or 2, check them, then the rest | |
| 6 | Write back to the brain | |

### 1. Read the brain

`recent-changes.md` (stock, offers, what changed), `brain.md` (What we know works, What to avoid, Key decisions), `brand-guidelines.md` (voice, palette, typography, guardrails), `winning-ads.md` (what is already recorded). From `products-and-positioning.md` take only the list of products for now.

### 2. Ask

- **The product.** The person names it, every time. It is never assumed from the folder, from the last ad looked at, or because there is only 1 product: assuming the product is the commonest failure of this skill.
- **The winners.** Which entries in `winning-ads.md`, or which folder of files.
- **How many ads.** 3, 5 or 10.

Then read the chosen product whole (price, what it is, key features, who buys it, core benefit, positioning, how it looks and is used, its photos), the avatars that buy it, and any winner entries already about it. Say back in 3 to 5 lines what you are working from, so a stale fact is caught before anything is made. Stop and ask if the product is out of stock, or if it carries small print that must appear on every ad.

### 3. Read the DNA

Look at every winner at full size. For each ad fill its entry; across them fill the pattern summary.

**The 6 dimensions:**

1. **Typography:** serif or sans, weight, width, case, the ranking of the lines, the container the words sit in.
2. **Colour:** dominant, accent, background treatment, by eye as hex. Compare with the brand's palette and say where the ads depart from it.
3. **Format archetypes:** sort the ads into 4 to 12 layout families. For each: a name, the layout grammar (where the product sits and how large, where the words sit, the reading order), the elements that recur, which ads are examples, what it has been used to argue.
4. **Photography and look:** the light, the background, how the product is staged (in a hand, on a surface, in use, alone), people (none, hands, a face).
5. **Copy patterns:** how headlines open, what the second line does, the button, length, small print, emoji.
6. **Graphic devices:** what recurs: ribbons, badges, labelled lines, chips, quote cards, stickers.

**And the 2 things the look does not tell you:** the 1 argument each ad made and who it was for; and what was measured. Without these the new ads copy a surface. If the record does not say why an ad won, write "not recorded", never a guess.

**What carries and what does not.** The type system, the colours, the layout grammar, the devices, the light and the shape of the copy carry. The winner's words, claims, numbers, reviews, offer, deadline, people and product do not: each was true of that ad, then, for that product.

**Not yet tried.** List the combinations nobody has run: a format with this product, a format with this buyer, an argument in a format. These are the best candidates for new concepts.

**Stop 1.** Show the person the pattern summary and the entries. Apply their corrections before going on.

### 4. Concepts

Every concept:

- is tied to **1 format archetype** from the pattern summary;
- is for the named product, argues something the **brand's facts hold for that product**, and keeps the guardrails;
- says **what is kept** from the winners and **what is changed**, and changes 1 thing that matters (a new product in a proven format, a new buyer for a proven argument, a new argument in a proven format, 1 new device);
- **fits the format to this product's shape**: a slot built for a tall bottle is redrawn for a wide pan or a folded jacket, and the product is shown in a view its own photos show;
- differs from every other concept in the batch: no 2 in the same format unless the person asks;
- prefers a combination from "Not yet tried".

If a format needs evidence this product does not have (a number, a quote, a comparison, a visible change), say so and offer the nearest format it can fill honestly.

Present each as:

```
### Concept [n]: [short name]
- Format: [from the pattern summary]
- For: [buyer] | Argues: [1 sentence]
- Kept from the winners: [...]   Changed: [the 1 thing]
- Headline (draft): [...]   Second line (draft): [...]
- Product shown: [view, and which photo]
- Rests on: [the fact or quote, with its source]
```

**Stop 2.** All concepts in 1 message. Apply edits before anything is made.

### 5. Make

- Attach the product's own photos, 1 per job, each named with its job. The clean photo of the product as sold leads: a styled ad used as the product reference gives wrong proportions. A winner's image may be attached last, for composition, type treatment and light only, and the prompt says its product, words and people must not carry across.
- Make 1 or 2 first. Check them against the product's photo and the DNA. Then the rest.
- A prompt a filter refuses is reworded once, as `models.md` says. It is never reworded into a different claim: softening "weight loss" into something else changes what the ad says, and that is the brand's decision, not a retry rule.
- Read every word on every image. Short lines survive; a long one that fails is shortened, not retried unchanged.

### 6. Write back

- `winning-ads.md`: the pattern summary and any entry that was filled or corrected.
- `recent-changes.md`: 1 line: what was made, for which product, from which winners.
- `brain.md`: anything the person said that is a lasting rule ("this format always works for gifts", "this angle is dead") under What we know works or What to avoid.
- When results come back, the new ads that won get entries of their own.

## What the brain's winning-ads.md must hold

**Per ad** (1 entry each). The first 5 exist today; the rest are new.

| Field | What it holds |
|---|---|
| `Kind` | static, carousel, video |
| `Result` | what was measured: spend, the result, the dates, against the account's usual. Or the proxy, named as a proxy |
| `What it says` | every line on the image by role (headline, second line, badge, button), word for word, and the first line of the feed copy |
| `Why it works` | the reason, if known. "Not recorded" if not |
| `Link` | where it can be seen |
| `Product` (new) | the product it sold |
| `Buyer` (new) | the persona and how aware they were |
| `Argument` (new) | the 1 thing it argued, in a sentence |
| `Format` (new) | its layout family, by the name used in the pattern summary |
| `Visual device` (new) | the 1 thing doing the work: the split, the labelled lines, the giant product, the quote card |
| `Layout` (new) | zones in reading order with rough shares of the frame; where the product sits and how large |
| `Product shown` (new) | the view (pack front, out of pack, in a hand, in use) and how it was staged |
| `Look` (new) | photograph or drawn; light; background; people (none, hands, a face) |
| `Offer shown` (new) | the offer in its exact words, or none |
| `File` (new) | the image, in `assets/winning-ads/` |
| `Do not carry over` (new) | what was true only then: a claim, a number, a person, a date, an offer |

**`Pattern summary`** (across the winners): `Formats that win` (4 to 12, each with its grammar, its recurring elements, its example ads and what it has argued), `Type on ads`, `Colour on ads` (against the palette), `Look`, `Copy patterns`, `Graphic devices`, `Not yet tried`, `What lost`.

## When not to use this

- No measured winners: start from the brand brain alone (a concept set, or the 50-ad sprint), or from the reference library.
- 1 product photo wanted, or a product page image: the photo and product page skills.
- A video hook or a landing page: their own skills.

## What this reads from the brand brain

| Needs | Document and field | If blank |
|---|---|---|
| The winners and why they won | `winning-ads.md`: Pattern summary; per ad the fields above | Fewer than 3 measured winners: say so and treat it as 1 ad remixed. `Why it works` blank: "not recorded", never guessed |
| The winners' images | `assets/winning-ads/` (per ad `File`) | Ask for the files. Without an image only the copy shape can be read |
| The product to make ads for | `products-and-positioning.md`, per product: Price, What it is, Key features, Who buys it, Core benefit, Positioning angle, Stock; Looks like, Pack, How it is used, Visible result, Never show, Reference photos (new, in the draft) | Ask. The product is never assumed. With no clean product photo, nothing is made |
| Who it is for | `customer-avatars.md`: the avatar for this product (Grounded in, Why they buy this product, What almost stops them) | Ask; or keep the winner's buyer and say so |
| The official look, to compare the ads against | `brand-guidelines.md`: Color palette, Typography, Photography and imagery style; `brand-look.json` | The ads' own look is recorded as the look |
| What may be claimed | `brand.json`: claims with sources, forbidden claims, guarantee; `offers.json`; `brand-guidelines.md`: Brand guardrails | No claim, number or offer is written |
| What changed lately | `recent-changes.md`; `brain.md`: What we know works, What to avoid, Key decisions | None |
