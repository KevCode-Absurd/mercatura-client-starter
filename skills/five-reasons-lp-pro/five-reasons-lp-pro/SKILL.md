---
name: five-reasons-lp-pro
description: Build a "5 Reasons Why" landing page in one of two design versions (Editorial or Advertorial/Modern DTC), adapted to any brand, then optionally export it as a drop-in Shopify Liquid bundle. Always a 5-reasons format, never another page type. Usable from any assistant with supplied brand context; file and browser steps depend on available tools. Use this over five-reasons-lp when the user wants a design choice, a step-by-step revision loop, or a Shopify upload.
trigger: user invokes /five-reasons-lp-pro, wants a "5 reasons" landing page, wants an advertorial or editorial landing page, says "build a landing page for [client/brand]", or wants a 5-reasons page they can upload to Shopify
reference: reference/design-A-editorial.html, reference/design-B-advertorial.html, reference/example-editorial.html, reference/shopify/
---

# Five Reasons Landing Page (Pro)

Use from any assistant/harness with the context and tools this task needs. Follow [Harness portability](../../README.md#harness-portability): discover tool capabilities, carry explicit brand evidence, and deliver source with accurate execution status when file/browser tools are unavailable.

**This skill builds one thing: a "5 Reasons Why" landing page.** Not a homepage. Not a general landing page. Not a listicle. A page structured around exactly 5 benefit-driven reasons a customer should buy. The format is fixed. What changes is (1) the brand, angle, and copy, and (2) which of **two design versions** you build.

This is the multi-design, Shopify-ready evolution of `five-reasons-lp`, and it supersedes it: use this one. It is used across many different brands and kinds of product, so it must stay brand-agnostic and never hardcode one brand's content. In the app, a reasons-why page is written by the Landing pages module from `skills/landing-pages/CARD.md` and `kinds/listicle.md`; the rules there and here agree. This file is the whole method, for a person building the HTML page and its Shopify export by hand.

**What the page is judged on:** a reader who tapped the ad finds the same promise in the first screen, and each of the 5 reasons is a reason to choose this product over what they use now, backed by a fact the brand states.

Start immediately at Phase 1. Do not summarize this skill or narrate what you are about to do.

---

## Non-negotiables (read first, enforce everywhere)

These apply to every word of client-facing output: page copy, headlines, FAQ answers, alt text, schema defaults, template JSON, README text, everything.

1. **ZERO EM DASHES (—). EVER.** No em dashes anywhere in the page, the Shopify bundle, or any copy that ships to a client. Use a period, a comma, a colon, or parentheses instead. **The blueprints' sample copy contains em dashes (the Editorial blueprint especially, including its "— Reason N" tag prefix). That is legacy. Never carry a single one into your output.** Before delivering, search every output file for the — character; the count must be 0.
2. **Humanize the copy.** No AI tells. Read each reason aloud in your head; if it sounds like a press release, rewrite it. American spellings unless the brand specifies otherwise.
3. **Never invent facts.** No fabricated reviews, review scores, review counts, customer counts, certifications, badges, press mentions, offers, discounts, free-gift values, or guarantees, and no default or estimated figure standing in for one. A figure the brand has not stated is asked for; until it arrives its element (the review pill, a count, a badge) is left off the page. A review, a testimonial or a proof caption is a real customer's words, word for word, with the name the source gives. A compare-at price is a real former or separate price. Only show badge pills (certifications, "Made in X") and press names the brand actually holds.
4. **Always exactly 5 reasons.** The Design B blueprint happens to be a 6-reason worked example. Ignore the count; you always build exactly 5.
5. **The page carries on from the ad.** Ask which ad sends readers here (Phase 1.5). The headline keeps the ad's main words, the page speaks to the ad's buyer, the offer the ad named is the first offer shown, and the hero image shows the same product as the ad (the same picture where the brand has it).
6. **The byline is the brand.** "The [Brand] Team", or a real, named person at the brand who has agreed to it. Never a made-up author. The Editorial design borrows a magazine's layout; it never borrows a magazine's name, masthead or section, and the page reads as the brand's own advertising.
7. **The blueprints are layouts.** Their sample copy, scores, counts, testimonials, press strip and chat overlay are filler: none of it is carried into a new page. A chat overlay or a press strip is built only from real messages the brand may use and press the brand really has.
8. **No generated children, and no person shown as a customer, founder or expert unless that person's real photo was supplied.**

---

## The two design versions

Both build the same 5-reason content. They differ only in **layout and visual system**. Use the chosen blueprint as the exact structural, CSS, and JS reference: keep the structure, swap the brand, angle, copy, colors, fonts, and media.

**Design A: Editorial.** Premium magazine/article feel. Big display headline, hero image with byline, a scrolling tagline strip, 5 alternating image/copy reason blocks with offset backing cards, photo proof tiles, a product-detail block with gallery + price options + free-gift grid, an FAQ accordion, and a closing CTA banner with an offer card. Blueprint: `reference/design-A-editorial.html`. Best for considered/premium brands, gifting, experiences, story-led products.

A richer worked adaptation lives at `reference/example-editorial.html` (an experience/booking brand). It shows how far Design A can flex while staying editorial: centered single-column reason blocks with big display numbers, a CTA button repeated under every reason, customer testimonials inside reason blocks, a press/locations strip, a final CTA band, FAQ moved to the footer, and an iPhone group-chat overlay in the hero. Borrow those patterns when they fit the brand.

**Design B: Advertorial / Modern DTC.** Conversion-first, mobile-led. Sticky top nav, a centered text hero (image optional), full-width stacked reason blocks each with a big number and its own repeating CTA, a PDP-style bundle showcase (large main image + clickable thumbnail gallery + Save badge + itemized "what's included" with crossed-out free-gift values + a value stack), a "Don't just take our word for it" social-proof section with badge pills, a UGC tile wall, and a pull quote, a multi-column footer, and a sticky add-to-cart bar. Blueprint: `reference/design-B-advertorial.html`. Best for performance/DTC, bundle offers, % off + free gifts, paid-traffic landing.

---

## Phase map

| Phase | What happens | Gate before continuing |
|---|---|---|
| 1 | Brand intake | User confirms Brand Snapshot |
| 2 | Design version choice | User picks A or B |
| 3 | Headline formula | User picks a formula or custom angle |
| 4 | Brand variables | None (infer; only ask if truly blocked) |
| 5 | Copy draft | User approves copy |
| 6 | Media collection | User provides media or says skip |
| 7 | Build the full HTML | Open it in the browser |
| 8 | Revision loop | User says they are done |
| 9 | Shopify handoff (optional) | User answers the Shopify question |
| 10 | Delivery + QA | Checklist passes |

---

## Phase 1: Brand intake

### 1.1 Ask for the brand

Say this exactly:

> "Which brand or client are we building this for?"

Wait for the answer.

### 1.2 Context check

Silently run through every source of context you have, in order:

- **A. Available project context.** Check supplied or accessible records for this brand/client; do not assume hidden memory or context from another harness.
- **B. Conversation history.** Has the user mentioned this brand earlier? Any files, links, or details shared?
- **C. Uploaded files.** Any brand documents, screenshots, or guidelines in the conversation?
- **D. The brand brain.** Check for a brand-brain folder (in this app, `brands/<brand>/brand-brain/`). If present, it is the first source: read the fields listed in "What this reads from the brand brain" at the end of this file. The website is read only for what the brain lacks.

**Strong context** (colors, products, audience, USPs): present a short Brand Snapshot (colors, product + one-liner, audience, 2-3 core USPs), ask the user to confirm or correct, then go to **Phase 2**.

**Partial context:** fill what you can, note assumptions, and continue to **Phase 2**. Only stop to ask if a critical piece is missing (e.g. no product at all).

**No context:** say:

> "It doesn't look like I have context on this brand yet. What's their domain name? (e.g., yourbrand.com). If they don't have a site, I'll ask a few quick questions instead."

### 1.3 Web research (if they give a domain)

Fetch the homepage, then `/about`, `/products`, `/collections`, or `/shop`, and the shipping, returns and FAQ pages. Extract: brand name, tagline, primary/secondary/accent colors, heading + body fonts, products + pricing, USPs, target audience, the review count and score only as shown (with the page each was found on), the guarantee, returns, shipping and warranty terms in the brand's own words, and what kind of product it is (bought again, or bought once). Present a Brand Snapshot, say plainly what was not found, and confirm. (Some Shopify stores return 403 to direct fetches. If so, fall back to local brand-brain assets, screenshots the user provides, or the interview.)

### 1.4 Manual interview (if no site)

Ask one message at a time: (1) what they sell + who for, (2) the 3 biggest reasons to choose them, (3) brand colors, (4) preferred fonts or pick-for-me, (5) product images/URLs + price range, (6) the returns, guarantee and delivery terms. Summarize as a Brand Snapshot and confirm.

### 1.5 The ad

Ask: "Which ad will send people to this page? Paste its headline, its first line, the offer it names and its image." Record the hook line, the buyer, the offer and the picture: the design choice, the headline and the offer block start from them. If there is no ad, agree 1 buyer and 1 angle.

---

## Phase 2: Choose the design version

Present both versions filled in for this brand, with a recommendation:

> **Two design versions for [Brand]:**
>
> **A: Editorial.** Premium, article-style. Display headline, hero image with byline, tagline strip, alternating reason blocks, photo proof tiles, product detail with gallery + price options + free gifts, FAQ, closing CTA banner. Best for premium/considered/gifting brands.
>
> **B: Advertorial / Modern DTC.** Conversion-first, mobile-led. Sticky nav, centered hero, stacked reasons each with their own CTA, PDP-style bundle showcase with value stack and free gifts, badge-pill social proof + UGC wall, sticky add-to-cart bar, footer. Best for DTC bundle/offer pages and paid traffic.
>
> **My recommendation: [A or B]** because [one sentence tied to their brand, offer, and traffic source].
>
> Which design do you want?

Recommendation heuristic: Editorial for story/premium/gifting; Advertorial for a concrete offer (bundle, % off, free gifts) and paid-traffic conversion. The kind of product counts too. Design B's bundle showcase and value stack were drawn for a product bought again in packs (a routine, a starter bundle, a subscription). For a product bought once (a pan, a jacket, luggage) either choose Design A, or build Design B with the offer block changed: 1 price, the size or colour options, what is in the box item by item, delivery time, the returns window and the warranty, and no value stack unless the brand really runs a set with a real saving. Wait for the choice before continuing.

---

## Phase 3: Pick the headline formula

The page always has 5 reasons. What changes is the headline angle. When the page follows an ad, the ad chooses: recommend the formula that keeps the ad's main words. Present these 4 formulas, each written out with brand-specific fill-ins:

- **Formula 1: The Switch.** "5 Reasons Why [audience / pain descriptor] Are Switching to [Product] Because of [key differentiator]". Best when there is an old-way-vs-new-way story.
- **Formula 2: The Gift.** "5 Reasons This Is The [Occasion] Gift [Audience] Actually Wants". Best for gifting / seasonal spikes.
- **Formula 3: The Revelation.** "5 Reasons [Audience] With [Specific Problem] Can't Stop Buying [Product]". Best when the product solves a long-standing pain. "Can't stop buying" only fits a product bought again; for a product bought once say what they did ("finally kept", "stopped replacing").
- **Formula 4: The Better Alternative.** "5 Reasons [Audience] Are Ditching [Generic Old Category] for [Product]". Best when it is a clear upgrade from a commodity category. Name a kind of product, never a rival brand or shop.

Give a one-line recommendation and wait for the pick. If they want a custom angle, write a headline in the same benefit-led, audience-specific, 8-14 word style and confirm. Headlines may be Title Case or sentence case; ask if unsure. No em dashes in any variant, ever.

---

## Phase 4: Build brand variables

Before writing HTML, lock every variable. Infer from context; only surface a question if you truly cannot proceed.

```
BRAND_NAME, PAGE_TITLE
HEADLINE, KICKER (subhead)
BYLINE_AUTHOR ("The [Brand] Team", or a real person at the brand), BYLINE_META (e.g. "From [Brand] · 4 min read"; never a publication's name)
REVIEW_SCORE, REVIEW_COUNT, CUSTOMER_COUNT
    -> the brand's own, as stated. No default and no estimate: an unknown figure is asked for,
       and until it arrives the review pill or the count is left off the page
PALETTE: primary, primary-deep, primary-tint, primary-tint-2, accent, ink, paper/off-paper
    -> pull exact hexes from the brand
FONTS: display stack, (serif stack), body stack + Google Fonts URL
PRODUCT_NAME, PRODUCT_TAGLINE, PRODUCT_DESC
OFFER: the offer the ad named, else the brand's standing offer: compare-at value (a real
       former or separate price only), price, % or $ off
    -> respect the brand's discount guardrail; at low price points a flat
       "save $X" often reads stronger than a percentage. Suggest, let the client confirm.
    -> bought again: pack or bundle, one-time against subscribe, how long a pack lasts,
       how to pause or cancel. Bought once: 1 price, size or colour options, what is in
       the box, the set or accessory that completes it; no "supply", no price per day
FREE_GIFTS: up to 3 the brand really gives, each with label + its real value (for the value stack)
GUARANTEE / RETURNS / WARRANTY / SHIPPING copy, as the brand states each; unknown means left off
CTA_BUTTON_TEXT (e.g. "Shop the Bundle" / "Shop Now" / "Book Now")
FINAL_CTA copy, OFFER_CARD copy
```

**CSS variable mapping.** Both blueprints keep legacy `--green*` names whatever the brand's actual color: `--green / --green-deep / --green-tint / --green-tint-2` are the primary system, `--gold` is the accent, and Design A adds `--display / --serif / --body`. Map the brand's primary to `--green`, accent to `--gold`, and keep `--gold-star: #F4C01E` for star ratings. (The `example-editorial.html` adaptation renames the system to `--primary / --primary-d / --primary-t / --accent`; either naming is fine, but pick one and stay consistent within the file.) Match the brand's real fonts: a heavy condensed or grotesque display with a clean sans body, a serif display with a sans body, whatever matches the storefront.

---

## Phase 5: Write the copy draft

Write all content before touching HTML, and show it for approval.

For each of the **5 reasons**:
- A short tag or number (`Reason N` or `01`-`05`; the Editorial blueprint prefixes its tag with an em dash, drop it)
- A specific benefit-led H2, 6-10 words, never generic
- Body: 3 short paragraphs (Editorial) or a 1-2 sentence subheadline (Advertorial)
- Alternate image side: left for 1/3/5, right for 2/4

What the 5 reasons are about follows the kind of product. Bought again: what is in it, how easy it is to keep using, what it replaces, what it costs a day, what happens if they do not like it. Bought once: what it is made of, how long it lasts, fit or what it works with, what the cheaper kind costs over time (only with the brand's figures), returns and warranty. The last reason is about risk or the offer.

Also write:
- The proof/social-proof framing + up to 4 proof captions: real customers' words, word for word, each with the name or @handle the source gives and where it came from. Fewer real quotes means fewer tiles; none means the block is left out
- 6-8 FAQ items mapped to the angle's objections
- The final CTA h2 + lede
- **Advertorial only:** the badge-pill list (real certifications / proof points only) and the bundle value-stack lines (what's included, free-gift labels + crossed-out values, compare-at total, today price, Save line)
- **Editorial with testimonials (optional):** per-reason testimonial quote + name + meta, laid out as in `example-editorial.html`, each a real review that proves that reason

Run the Non-negotiables over the whole draft. Then present:

> "Here's the copy draft. Review the 5 reasons and the headline. Say 'looks good' or give me edits, then I'll build the page."

Wait for approval.

---

## Phase 6: Collect media (images and video)

Ask in a single message for: hero image (the ad's picture, or the same product and scene), product images (up to 5 for the gallery), social-proof images (up to 4 for tiles: real customers' photos the brand may use; a before and after only if it is real and the brand may claim the result), and a CTA banner image. Tell them to paste URLs, drop files, or say "skip" for placeholders.

If the brand has a content folder, dig in and pick the best file per slot (view the images, do not guess from filenames). Prefer browser-friendly `.jpg/.jpeg/.png/.webp/.mp4`; skip `.heic` and `.mov` for the live page. Verify every local path actually exists before using it (sequential numbering often has gaps).

**Video (Advertorial especially).** A short clip of the product in use often shows a reason better than a still. Convert source clips to a muted web mp4 no wider than 1080 px, with a poster image, and use inline `<video autoplay muted loop playsinline preload="metadata" poster="...">`. Keep each clip small: video is the heaviest thing on the page, and load time on a phone comes first.

**UGC collage / thumbnails.** Build collages and gallery thumbnails with whatever image tool is to hand. For a review wall use a gapless or masonry grid so nothing is cropped awkwardly (the Design B blueprint's final reason shows a masonry collage pattern you can reuse).

Keep all assets in a single `lp-assets/` (or `assets/`) folder next to the HTML so the page is portable. Map whatever you get to the slots; mark anything missing as `[INSERT: descriptive name]` with a real `alt`, and list those at delivery.

---

## Phase 7: Generate the full HTML

Output one complete, self-contained HTML file built from the chosen design's blueprint. Every variable from Phase 4, every copy block from Phase 5, and every image/video from Phase 6 slots in verbatim. Zero `BRAND_VARIABLE` placeholders. Keep the blueprint's CSS architecture and JS behavior; only the brand, content, colors, fonts, and media change.

**Design A: Editorial**, sections in order (per `reference/design-A-editorial.html`):
1. Head + fonts + CSS
2. Hero: review pill + h1 + kicker + byline + hero image
3. Tagline marquee strip
4. Reason 1 (image left, offset backing card)
5. Reason 2 (copy left)
6. Proof tiles (4, gradient overlay + caption + reviewer meta)
7. Reason 3 (multi-image grid)
8. Reason 4
9. Reason 5 (overlapping rotated panels)
10. Product detail: gallery (main + 5 thumbs + arrows) + rating + description + price option rows + free-gift grid + add-to-cart + trust row
11. FAQ accordion (2 columns)
12. CTA banner: h2 + lede + button + micro trust + art panel + offer card. **`.cta-banner` must use `overflow: visible`** or the offer card gets clipped.
13. Optional tweaks panel + JS (apply/persist, FAQ accordion, gallery thumbs, opt-row selection)

**Design B: Advertorial**, sections in order (per `reference/design-B-advertorial.html`; note the blueprint shows 6 reasons, you build 5):
1. Head + fonts + CSS
2. Sticky header nav
3. Centered hero: review pill + h1 + subhead + CTA (hero image optional)
4. Stacked reason blocks: big number + H2 + 1-2 sentence sub + repeating CTA; image or autoplay video, alternating side; the last reason can be a masonry UGC collage
5. Bundle showcase: PDP gallery (large main image + clickable thumbnail strip + Save badge) + offer side (itemized "what's included," FREE gifts with crossed-out values, value stack of compare-at, today price, Save %, full-width CTA, trust micro)
6. Social proof: "Don't just take our word for it" + badge pills + UGC tile wall + pull quote
7. Multi-column footer
8. Sticky add-to-cart bar (IntersectionObserver: shows after the hero scrolls off, hides over the footer)
9. Optional tweaks panel + JS (thumb gallery swap, sticky bar observers, accordion if used)

**Output location.** With writable file access: save to the brand/client folder (e.g. `clients/{slug}/` or the brand-brain folder) as `{brand}-5-reasons-landing-page.html`, with media in a sibling `lp-assets/` folder. Without writable file access: output the full HTML in a code block and tell them to save it as an `.html` file.

Open the file with the host’s available preview/browser tool if possible.

---

## Phase 8: Revision loop (work step by step)

After the page is built, do NOT consider the job done. Say:

> "The page is built and open. Let's go through it together step by step. Walk me through any revisions you want to images, copy, or any section, and I'll make each change and reopen the page so you can see it live."

Then iterate one change at a time: swap images/videos, rewrite headlines or subheads, reorder or restyle sections, adjust the offer/value stack, colors, fonts, casing, cropping. After each change, reopen/refresh the page. Keep going until the user says they are done.

---

## Phase 9: Shopify handoff (optional)

Once the user signals they are done revising, ask exactly:

> "Would you like to move forward with this landing page and uploading it into Shopify?"

If **no**, stop. The HTML file is the deliverable.

If **yes**, build a drop-in Shopify Liquid bundle in a new folder next to the HTML, following the proven pattern in `reference/shopify/` (`example-section.liquid`, `example-template.page.json`, `example-README.md`). The Liquid rules themselves (schema, settings, filters, limits) are in `skills/shopify-liquid-themes`; read its "A landing page as a theme page" section first.

```
shopify-{handle}/
├── sections/{brand}-5-reasons.liquid      <- CSS + markup + {% schema %} (settings + blocks)
├── templates/page.{handle}.json           <- page template preloaded with all copy + blocks
├── assets/                                <- every image/video, web-optimized
└── README.md                              <- install steps, CTA wiring, image handling, brand notes
```

Conventions:

- **Namespace all CSS** under `#shopify-section-{{ section.id }}` (and prefix classes, e.g. `gs-`) so styles never leak into the theme.
- **Section settings** (`{% schema %}`): grouped with `header` rows. Expose the global CTA URL + button labels, hero (pill text, rating, H1, subhead/kicker, byline, hero image), social-proof eyebrow, final CTA copy, micro-trust lines, FAQ heading + sub. Use `text` / `textarea` / `url` / `image_picker` / `checkbox` / `range`.
- **Blocks** for repeatable content: a `reason` block (number, optional show-stars checkbox, title, body/sub, optional testimonial quote + name + meta, image), a proof/`tile` or `location` block, and a `faq` block (question, answer). Render with `{%- for block in section.blocks -%}{%- case block.type -%}...` and include `{{ block.shopify_attributes }}`. Set sensible `limit` values (reason: 5). Make them reorderable/addable/removable, and mirror them in a `presets` entry.
- **Images:** `image_picker` per slot, rendered with `{{ ... | image_url: width: 1440 | image_tag: loading: 'lazy', alt: ... }}`, with an `/assets/` fallback via `asset_url` when no image is picked. Hero uses `loading: 'eager', fetchpriority: 'high'` and width 1240+. Ship the actual images in `assets/`.
- **One global CTA URL** drives every button. Default it to the brand's product/checkout/booking URL.
- **Prices go stale when typed.** Where the page shows a price, add a `product` picker setting and render the price from the store (`product.price | money`, the compare-at only when the store has one), so the page never shows a price the store no longer charges. Typed price text is a fallback, and the README says so.
- **Template JSON** preloads the section with all real copy in `settings` plus a `blocks` map and `block_order` so the page renders fully on install with no manual entry.
- **README** mirrors `example-README.md`: what's in the folder, 3-step install (drop files into the theme, create the page, pick the template), CTA wiring, image handling, fonts, browser support, and a "brand notes" section. Brand notes always include: no em dashes anywhere; never edit offers/claims without brand sign-off; flag any placeholder stats awaiting confirmation.
- Keep all interactive JS (gallery swap, sticky bar, accordions, marquee) inside the section file, scoped to `shopify-section-{{ section.id }}`. Convert any video to mp4 in `assets/` and reference via `{{ 'file.mp4' | asset_url }}`.

Then tell the user the bundle is ready and give the install summary (or zip it if they ask).

---

## Phase 10: Delivery + QA

Run this checklist silently before delivering. Every item must pass:

- [ ] Correct design version built (A or B as chosen)
- [ ] Exactly 5 reason sections (even though the Design B blueprint shows 6)
- [ ] **Zero em dashes anywhere** in the HTML and in every Shopify bundle file. Scan all output sources and require zero matches.
- [ ] Zero `BRAND_VARIABLE` placeholders remain
- [ ] Every `<img>`/`<video>` has a source or a clearly marked `[INSERT: ...]`, and every `<img>` has `alt`
- [ ] All 5 reason H2s are specific to the angle, not generic; copy reads human
- [ ] Colors and fonts match the real brand; review, score and customer numbers are the brand's own as stated, or the element is off the page. No default, no estimate
- [ ] Every testimonial and proof caption is a real customer's words with its source
- [ ] The headline keeps the ad's main words; the first offer is the ad's offer; the hero image shows the ad's product
- [ ] The byline is the brand or a real person; nothing passes for a publication; press names and chat messages are real
- [ ] The offer block fits the kind of product (packs and subscription, or 1 price with box contents, returns and warranty)
- [ ] Nothing from a blueprint's sample copy, scores, counts or testimonials remains
- [ ] Offer, prices, free-gift values, and guarantee are accurate; compare-at prices are real; badge pills are real; discount guardrail respected
- [ ] FAQ questions map to the angle's objections
- [ ] Advertorial: sticky bar shows/hides correctly, bundle gallery thumbnails swap, value stack reads clearly
- [ ] Editorial: CTA banner offer card is not clipped (`overflow: visible`), gallery thumb JS array matches the images
- [ ] Every local image path verified to exist
- [ ] File saved (or output in a code block) and opened in the browser
- [ ] Shopify bundle (if requested): CSS namespaced, template JSON preloaded, assets shipped, README included

If any images were skipped, open your delivery message with the list of `[INSERT: ...]` placeholders.

---

## Reference files

- `reference/design-A-editorial.html`: Editorial blueprint (5-reason, alternating layout, product detail, tweaks panel)
- `reference/example-editorial.html`: richer worked Editorial adaptation (centered numbered reasons, per-reason CTAs, testimonials, press strip, iPhone chat hero)
- `reference/design-B-advertorial.html`: Advertorial / Modern DTC blueprint (worked as 6 reasons; you build 5)
- `reference/shopify/example-section.liquid`: Shopify section pattern (namespaced CSS + markup + schema + blocks + presets)
- `reference/shopify/example-template.page.json`: page template JSON pattern (settings + blocks + block_order)
- `reference/shopify/example-README.md`: install/handoff README pattern

---

## What this reads from the brand brain

| What | Where (contract names) | When it is blank |
|---|---|---|
| The product, its price, variants, offers | `products-and-positioning.md` Product catalog, Bundles and offers; `offers.json` | Ask. No price is guessed |
| The 5 reasons: what sets it apart | `brand-guidelines.md` Unique selling propositions (ranked); Product catalog: Key features, Positioning angle; `competitors.md` Differentiation summary | Ask for the 3 biggest reasons to choose the brand (Phase 1.4) |
| The buyer and their objections | `customer-avatars.md` per avatar (Why they buy this product, What almost stops them) | The FAQ holds only what the facts answer; say so |
| Real quotes with sources | `customer-avatars.md` Grounded in; Customer language bank | The proof block and the per-reason testimonials are left out |
| Rating, counts, badges, press | `brand.json` claims and proof assets, as stated | The pill, the count, the badge or the strip is left off |
| Guarantee | `brand.json` guarantee | No guarantee line |
| Ingredients or materials | `brand.json` products (`ingredients`, `specs`) | The reason that needs them is rewritten without figures |
| Voice, colours, fonts | `brand-guidelines.md` Brand voice and tone, Visual identity; `brand-look.json` | Ask (Phase 1.4) |
| Photos and clips | `assets/` | `[INSERT: ...]` placeholders |
| The ad the page follows | Creative Studio or the ad account | Agree 1 buyer and 1 angle |

Not in the contract, and this page needs them: **Returns**, **Shipping and delivery**, **Warranty**, **What is in the box**, **Size and fit**, **How long a pack lasts**, **Subscription terms**, the brand's own **FAQ**, **Proof on file** (the rating and count with where each is shown; press and certifications with a link), **Free gifts and their real values**, and for the Shopify export the **store's product handle and page handle**.
