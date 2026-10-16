---
name: five-reasons-lp
description: Generate a "5 Reasons Why" advertorial landing page, premium editorial HTML, adapted to the client's brand. Always a 5-reasons format, never another page type. Usable from any assistant with supplied brand context; file and browser steps depend on available tools. Use five-reasons-lp-pro instead when the user wants to choose between two design versions (Editorial or Advertorial/Modern DTC), wants a revision loop, or wants a Shopify Liquid export.
trigger: user invokes /five-reasons-lp, wants a "5 reasons" landing page, wants an advertorial landing page, or says "build a landing page for [client/brand]"
reference: reference/template-example.html
---

# Five Reasons Landing Page

Use from any assistant/harness with the context and tools this task needs. Follow [Harness portability](../../README.md#harness-portability): discover tool capabilities, carry explicit brand evidence, and deliver source with accurate execution status when file/browser tools are unavailable.

**This skill builds one thing: a "5 Reasons Why" advertorial landing page.** Not a homepage. Not a general landing page. Not a listicle. A premium editorial page structured around exactly 5 benefit-driven reasons a customer should buy. The format is fixed. The brand, angle, and copy are what change.

**Superseded by `five-reasons-lp-pro`.** That skill builds the same page in 2 designs, with a revision loop and a Shopify export, and is the one to use. This one is kept for its single template. Its rules are kept in step with the pro skill and with `skills/landing-pages/kinds/listicle.md`, which is what the app's own page writer is sent.

**What the page is judged on:** a reader who tapped the ad finds the same promise in the first screen, and each of the 5 reasons is a reason to choose this product over what they use now, backed by a fact the brand states.

Start immediately at Phase 1. Do not summarize this skill or narrate what you are about to do.

The full HTML blueprint is `reference/template-example.html`. It is a worked example for 1 brand (wall art, a gift angle): use it as the structural, CSS, and JS reference. Keep its structure; swap the brand, angle, copy, colors, fonts, and images. Its sample copy, review score, review and customer counts, and proof captions are filler for the layout: none of it is carried into a new page.

If the user needs a choice of design versions or a Shopify upload, that is `five-reasons-lp-pro`, not this skill. Mention it and ask which they want before proceeding.

---

## Non-negotiables (read first, enforce everywhere)

These apply to every word of client-facing output this skill produces: page copy, headlines, FAQ answers, alt text, image captions, everything.

1. **ZERO EM DASHES (—). EVER.** No em dashes in any copy on the page, in any headline variant, in any FAQ answer, in any delivery note that ships to a client. Use a period, a comma, a colon, or parentheses instead. **The blueprint's sample copy contains em dashes (including the "— Reason N" tag prefix). That is legacy. Never carry a single one into your output.** Before delivering, search the finished HTML for the — character; the count must be 0.
2. **Humanize the copy.** No AI tells: no "elevate," "unlock," "delve," no symmetrical triads in every paragraph, no robotic parallelism. Read each reason aloud in your head; if it sounds like a press release, rewrite it.
3. **Never invent facts.** No fabricated reviews, review scores, review counts, customer counts, certifications, press mentions, discounts, or guarantees, and no default or estimated figure standing in for one. A figure the brand has not stated is asked for; until it arrives its element (the review pill, the proof heading's count) is left off the page. A review or proof caption is a real customer's words, word for word, with the name the source gives. Claims, prices, offers and guarantee terms come only from the brand's facts.
4. **Always exactly 5 reasons.** Not 4, not 6. If the user asks for a different count or a different page type, tell them this skill only builds the 5-reasons format.
5. **The page carries on from the ad.** Ask which ad sends readers here. The headline keeps the ad's main words, the page speaks to the ad's buyer, the offer the ad named is the first price option, and the hero image shows the same product as the ad (the same picture where the brand has it).
6. **The byline is the brand.** "The [Brand] Team", or a real, named person at the brand who has agreed to it. Never a made-up author, and never a layout that passes for a magazine, a gift guide from a publication or a review site. The page is the brand's own advertising and reads as such.
7. **No generated children, and no person shown as a customer, founder or expert unless that person's real photo was supplied.**

---

## Phase map

| Phase | What happens | Gate before continuing |
|---|---|---|
| 1 | Brand intake (brand brain, then web research or interview), and the ad the page follows | User confirms Brand Snapshot |
| 2 | Headline formula | User picks a formula or custom angle |
| 3 | Brand variables | None (infer; only ask if truly blocked) |
| 4 | Copy draft | User approves copy |
| 5 | Image collection | User provides images or says skip |
| 6 | Build the full HTML | None |
| 7 | QA + delivery | Checklist passes |

---

## Phase 1: Brand intake

### 1.1 Ask for the brand

Say this exactly:

> "Which brand or client are we building this for?"

Wait for the answer.

### 1.2 Context check

Once you have the brand name, silently run through every source of context you have, in order:

- **A. Available project context.** Check supplied or accessible records for this brand/client; do not assume hidden memory or context from another harness.
- **B. Conversation history.** Has the user mentioned this brand earlier in this session? Any files, links, or details shared?
- **C. Uploaded files.** Any brand documents, screenshots, or guidelines in the conversation?
- **D. The brand brain.** Check if a brand-brain folder exists (in this app, `brands/<brand>/brand-brain/`). If yes, it is the first source: read the fields listed in "What this reads from the brand brain" at the end of this file. The website is read only for what the brain lacks.

**If you have strong context** (brand colors, products, target audience, USPs), say:

> "I have existing context on [Brand]. Here's what I'm working with:
> - **Brand colors:** [primary, secondary, accent]
> - **Product(s):** [name and one-liner]
> - **Target audience:** [who they are]
> - **Core USPs:** [2-3 bullet points]
>
> Does this look right? I'll use this to build your angles. Correct anything that's off."

Wait for confirmation, then go to **Phase 2**.

**If you have partial context:** fill what you can, flag what's missing, and proceed. Don't stop to ask; infer from what you have and note assumptions clearly. Only ask if the gap is critical (e.g., you have no product name at all). Go to **Phase 2**.

**If you have no context**, say this exactly:

> "It doesn't look like I have any context on this brand yet. No problem, I can pull most of what I need from their website.
>
> What's their domain name? (e.g., yourbrand.com)"

If they give a domain, run **1.3 Web research**. If they have no website, run **1.4 Manual interview**.

### 1.3 Web research

Fetch the domain they provided. Start with the homepage, then check `/about`, `/products`, `/collections`, or `/shop` if they exist. (Some Shopify stores return 403 to direct fetches. If so, fall back to any local brand assets, screenshots the user provides, or the interview.)

Extract:

| What | Where to look |
|---|---|
| Brand name (confirmed) | `<title>`, `<h1>`, logo alt text |
| Tagline / positioning | Hero section, meta description, `<title>` |
| Primary color | Most-used color on CTAs, headers, nav |
| Secondary / accent color | Hover states, highlights, pill badges |
| Background color | Body/page background |
| Headline font | `font-family` on `h1` / `h2` |
| Body font | `font-family` on `p` / body |
| Products | Product cards, collection names, pricing |
| Core USPs | Features section, bullet lists, "why us" copy |
| Target audience | Language clues: who they write to |
| Review count + score | Only as shown on the site, noted with the page it was found on. Not found means not used |
| Guarantee, returns, shipping, warranty | The policy pages and the product page, in the brand's own words |
| What kind of product it is | Bought again (packs, a subscription, ingredients) or bought once (sizes, dimensions, materials, a warranty) |

Then present a **Brand Snapshot**:

> "Here's what I pulled from [domain]:
>
> **Brand:** [name]
> **Tagline:** [tagline or "not found"]
> **Colors:** [primary #hex] · [secondary #hex] · [accent #hex or "none found"]
> **Fonts:** [headline font] / [body font]
> **Products:** [list]
> **USPs:** [list]
> **Audience:** [inferred]
> **Social proof:** [X reviews / X stars with where it is shown, or "not found: the page will carry no score"]
> **Returns, guarantee, delivery:** [as stated, or "not found"]
>
> Anything wrong or missing? I'll use this to build your page."

Wait for confirmation or corrections.

### 1.5 The ad

Ask: "Which ad will send people to this page? Paste its headline, its first line, the offer it names and its image." Record the hook line, the buyer, the offer and the picture: Phase 2 and Phase 3 start from them. If there is no ad, agree 1 buyer and 1 angle. Then go to **Phase 2**.

### 1.4 Manual interview

If no website is available (or web research failed), ask these questions one message at a time, not all at once:

**Message 1:**
> "Let's build your brand snapshot. First: what does [Brand] sell and who is it for? (One or two sentences is fine.)"

**Message 2 (after answer):**
> "What are the 3 biggest reasons someone should choose [Brand] over competitors?"

**Message 3:**
> "Brand visuals: what are your main colors? (Hex codes or describe them, e.g., 'deep navy, warm gold, off-white')"

**Message 4:**
> "Do you have a preferred font, or should I pick one that fits your brand vibe?"

**Message 5:**
> "Last one: do you have any product images or URLs I can reference? And what's your price range?"

After all answers, summarize as a Brand Snapshot (same format as 1.3) and confirm before continuing.

---

## Phase 2: Pick the headline formula

The page always has 5 reasons. What changes is the headline formula: the specific angle and audience framing the whole page is built around. When the page follows an ad, the ad chooses the formula: pick the 1 that keeps the ad's main words, and say so in the recommendation.

The 4 formulas:

**Formula 1: The Switch**
> "5 Reasons Why [audience / pain-point descriptor] Are Switching to [Product] Because of [key differentiator]"

Fill in: who is switching, from what implicit old solution, and what's driving the change. Best when there's a clear "old way vs. new way" story.
*Examples: "5 Reasons Why Serious Golfers Are Replacing Trophies With Course Art"; "5 Reasons Why Home Cooks Are Switching to Carbon Steel Because Nothing Wears Off"*

**Formula 2: The Gift**
> "5 Reasons This Is The [Occasion] Gift [Audience] Actually Wants"

Fill in: the occasion (Father's Day, birthday, anniversary, Mother's Day) and the recipient. Best when the product has strong gifting demand or a seasonal spike.
*Examples: "5 Reasons This Is The Father's Day Gift Every Golfer Actually Wants"; "5 Reasons This Is The Housewarming Gift New Cooks Actually Want"*

**Formula 3: The Revelation**
> "5 Reasons [Audience] With [Specific Problem] Can't Stop Buying [Product]"

Fill in: who they are, the specific pain they have, and the product. Best when the product solves something people have struggled with for a long time and feel relieved to find an answer to. "Can't stop buying" only fits a product bought again; for a product bought once say what they did ("finally bought", "kept", "stopped replacing").
*Examples: "5 Reasons Women With Textured Skin Can't Stop Buying This Serum"; "5 Reasons Commuters Who Hate Rain Jackets Finally Kept This One"*

**Formula 4: The Better Alternative**
> "5 Reasons [Audience] Are Ditching [Generic Old Category] for [Product]"

Fill in: the category they're abandoning (e.g., "cheap prints," "generic supplements," "big-box furniture") and what they're moving to. Name a kind of product, never a rival brand or shop. Best when the product is a clear upgrade from a commoditized category.
*Examples: "5 Reasons Homeowners Are Ditching Mass-Produced Prints for Custom Course Art"; "5 Reasons Snackers Are Ditching Protein Bars for Roasted Chickpeas"*

Present all 4 with the brand-specific fill-ins already written out:

> **4 Headline Formulas for [Brand]**
>
> **Formula 1: The Switch**
> "[filled-in headline]"
>
> **Formula 2: The Gift**
> "[filled-in headline]"
>
> **Formula 3: The Revelation**
> "[filled-in headline]"
>
> **Formula 4: The Better Alternative**
> "[filled-in headline]"
>
> **My recommendation: Formula [N].** [One sentence on why this formula fits their brand and audience best.]
>
> Which one do you want to run? (Say "recommended" to go with my pick, or give me a different angle entirely and I'll write a custom headline.)

Wait for the user's selection before continuing. If they choose a custom angle, write a headline in the same formula style (benefit-led, audience-specific, 8-14 words, no em dashes) and confirm before moving on.

---

## Phase 3: Build brand variables

Before writing any HTML, lock down every variable. Infer from context; only surface a question if you truly cannot proceed.

```
BRAND_NAME:          [e.g., Golf Course Prints]
PAGE_TITLE:          [brand] | [angle headline short form]

HEADLINE:            [h1: the chosen angle headline]
KICKER:              [parenthetical subheadline, 1 sentence, in parens]
AUTHOR_INITIALS:     [the brand's initials, or a real named person's]
AUTHOR_NAME:         ["The [Brand] Team", or a real person at the brand who agreed to it; never a made-up name]
AUTHOR_META:         [e.g., "From [Brand] · 4 min read"; never the name of a publication or its section]

REVIEW_SCORE:        [the brand's stated score, as stated; if unknown, leave the review pill off the page]
REVIEW_COUNT:        [the brand's stated count, as stated; if unknown, leave it off]
CUSTOMER_COUNT:      [the brand's stated count; if unknown, the proof heading carries no number]

STRIP_PHRASE_1:      [short marquee phrase]
STRIP_PHRASE_2:      [short marquee phrase]
STRIP_PHRASE_3:      [short marquee phrase]

PRIMARY_COLOR:       #[hex]   -> replaces --green in the blueprint
PRIMARY_DEEP:        #[hex]   -> darker shade, 10-15% darker
PRIMARY_TINT:        #[hex]   -> very light tint (~95% white mix)
PRIMARY_TINT_2:      #[hex]   -> slightly less light (~90% white mix)
ACCENT_COLOR:        #[hex]   -> replaces --gold (accent/secondary brand color)

DISPLAY_FONT:        [CSS font stack, heading style]
BODY_FONT:           [CSS font stack, body text]
GOOGLE_FONTS_URL:    [full @import URL, or "none" if using system fonts]

PRODUCT_NAME:        [e.g., The Signature Series]
PRODUCT_TAGLINE:     [1 line shown under product section heading]
PRODUCT_DESC:        [2-3 sentence product description]
PRICE_OPTIONS:       [list: label / sublabel / orig price / sale price / is_featured]
                     -> Discount guardrail: if the client proposes a % discount, evaluate
                        whether it produces a compelling dollar amount. At sub-$100 price
                        points, a flat bundle price ("$X for the complete routine, save $Y")
                        almost always reads stronger than a percentage. Suggest the flat
                        price and let the client confirm.
                     -> By kind of product. Bought again: packs or bundles, one-time against
                        subscribe, how long a pack lasts, how to pause or cancel. Bought once:
                        1 price with the size or colour options, what is in the box, the set or
                        accessory that completes it; never a "supply" or a price per day.
                     -> A compare-at ("orig") price is a real former or separate price.
GUARANTEE_DAYS:      [as the brand states; if none, leave the guarantee line off]
RETURNS / WARRANTY:  [as the brand states; they matter most for a product bought once]
SHIPPING_COPY:       [as the brand states, e.g., Free U.S. shipping; if unknown, leave off]

CTA_BUTTON_TEXT:     [e.g., SHOP NOW]
FINAL_CTA_H2:        [e.g., "His Favorite Course. On His Wall. This Father's Day."]
FINAL_CTA_LEDE:      [1-2 sentence social proof framing]
OFFER_CARD_LABEL:    [e.g., ★ FATHER'S DAY SPECIAL ★, or omit]
OFFER_CARD_LINE1:    [e.g., Free Personalization on Every Print]
OFFER_CARD_LINE2:    [e.g., Add his name or a date, at no charge]

FREE_GIFTS:          [up to 3: label / value / visual style, or omit]
```

---

## Phase 4: Write the copy draft

Write all content before touching HTML. Show the draft to the user for approval.

For each of the **5 reasons**, write:
- **Tag:** `Reason N` (the blueprint renders this tag with a leading em dash; drop the dash, style the tag element without it)
- **H2:** specific, benefit-led, 6-10 words, never generic
- **Body:** 3 short paragraphs, 2-4 sentences each. Match brand voice. No filler.
- **Image note:** alternating sides; image LEFT for reasons 1, 3, 5; image RIGHT for 2, 4

Also write:
- **Proof section h2** (social proof framing, with the brand's stated customer count or with no number)
- **4 proof tile captions:** a real customer's words, word for word, with the name the source gives and where it came from. Fewer real quotes means fewer tiles; none means the section is left out
- What the 5 reasons are about, by kind of product. Bought again: what is in it, how easy it is to keep using, what it replaces, what it costs a day, what happens if they do not like it. Bought once: what it is made of, how long it lasts, fit or what it works with, what the cheaper kind costs over time (only with the brand's figures), returns and warranty. The last reason is about risk or the offer
- **6-8 FAQ items:** questions mapped to the angle's likely objections
- **Final CTA h2 and lede**

Run the Non-negotiables over the whole draft (zero em dashes, humanized, no invented facts). Then present:

> "Here's the copy draft. Review the 5 reasons and the headline. Say 'looks good' or give me edits, then I'll build the full HTML."

Wait for approval before continuing.

---

## Phase 5: Collect images

Once copy is approved, ask for images in a single message:

> "Copy is locked. Before I build the HTML, I need your images.
>
> - **Hero image:** lifestyle shot, product in context (shown in the top half of the page)
> - **Product images:** up to 5 for the gallery (main view + alternate angles or variants)
> - **Social proof images:** 4 photos for the customer tile section (lifestyle, UGC, product-in-use)
> - **CTA banner image:** a strong single product or lifestyle shot for the final section
>
> Paste URLs, drop files, or give me Shopify/CDN paths. For any image you don't have yet, just say 'skip' and I'll mark it as a placeholder."

Wait for their response. Map whatever they give you to:

```
HERO_IMG:          [URL / path / "[INSERT: hero image]"]
HERO_IMG_ALT:      [descriptive alt text based on what you know of the product]
PRODUCT_IMG_1-5:   [URL / path, or "[INSERT: product image N]"]
PROOF_IMG_1-4:     [URL / path, or "[INSERT: proof tile N]"]
CTA_IMG:           [URL / path, or "[INSERT: CTA banner image]"]
```

If images come from a local folder, verify every path actually exists before using it (sequential numbering often has gaps: IMG_2000 may not exist between IMG_1999 and IMG_2001). If they skip some, note them; you'll mark `[INSERT: ...]` placeholders in the HTML and call them out at delivery.

---

## Phase 6: Generate the full HTML

Output a complete, self-contained HTML file. Every variable from Phase 3, every copy block from Phase 4, and every image path from Phase 5 slots in verbatim. Zero placeholders remaining except any images the user skipped.

Reference `reference/template-example.html` for the exact structure, CSS patterns, JS behavior, and tweaks panel. Build every section in this order:

```
1.  <head>: charset, viewport, title, Google Fonts (if needed), all CSS in <style>
2.  HERO: review pill + h1 + kicker + byline (avatar circle, name, meta) + hero image
3.  MARQUEE STRIP: 3 taglines, each repeated for a seamless scroll loop
4.  REASON 1: image LEFT with backing card offset, copy RIGHT
5.  REASON 2: copy LEFT, image RIGHT (full bleed)
6.  PROOF TILES: review pill + h2 + 4 photo tiles (gradient overlay, caption, reviewer meta)
7.  REASON 3: image LEFT (multi-image grid), copy RIGHT
8.  REASON 4: copy LEFT, image RIGHT
9.  REASON 5: image LEFT (two overlapping rotated panels), copy RIGHT
10. PRODUCT DETAIL: section heading + gallery (main + 5 thumbs + arrow nav) + details panel
            (rating, product name, description, price option rows, free gifts grid, add-to-cart block)
11. FAQ: h2 + 2-column accordion (click-to-expand, chevron toggle)
12. CTA BANNER: h2 + lede + CTA button + micro trust items + art panel + offer card
13. TWEAKS PANEL: fixed bottom-right, hidden by default, activated by parent postMessage
            (color swatches x4, headline selector x4 variants, kicker selector x3, display font selector)
14. <script>: apply(), persist(), message API, FAQ accordion, gallery thumbs, opt-row selection
```

**CSS variable mapping** (the blueprint keeps legacy `--green*` names whatever the brand's actual color; keep the names, swap the values):

| Blueprint variable | Maps to |
|---|---|
| `--green` | PRIMARY_COLOR |
| `--green-deep` | PRIMARY_DEEP |
| `--green-tint` | PRIMARY_TINT |
| `--green-tint-2` | PRIMARY_TINT_2 |
| `--gold` | ACCENT_COLOR |
| `--gold-star` | Keep `#F4C01E` for star ratings |
| `--display` | DISPLAY_FONT |
| `--body` | BODY_FONT |

**CTA banner, critical:** `.cta-banner` must use `overflow: visible`, never `overflow: hidden`. The offer card is positioned with a negative `bottom` value; `hidden` clips it. The art panel uses its own `border-radius` for visual containment.

**Tweaks panel:**
- 4 headline variants (the approved one + 3 alternates from the angle exploration), all em-dash-free
- 3 kicker variants
- 4 color swatches: default = PRIMARY_COLOR, 3 alternates from the brand palette or neutral fallbacks

**Output location:**
- With a writable client hub: save as `clients/{slug}/5-reasons-landing-page.html`
- With other writable project access: save to the project root or wherever the user's files live
- Without writable file access: output the full HTML in a code block and say:
  > "Save this as `5-reasons-landing-page.html` and open it in a browser."

**Missing images:** leave a clearly marked placeholder with a real alt:

```html
<img src="[INSERT: hero lifestyle image]" alt="[INSERT: descriptive alt text]">
```

---

## Phase 7: QA + delivery

Run this checklist silently before delivering. Every item must pass:

- [ ] **Zero em dashes anywhere in the file.** Search the finished HTML for the — character (require zero matches in the output source). This includes copy carried over from the blueprint.
- [ ] Exactly 5 reason sections
- [ ] Zero `BRAND_VARIABLE` placeholders remaining in the HTML
- [ ] All image `src` attributes filled or clearly marked `[INSERT: ...]`
- [ ] Every `<img>` has an `alt` attribute
- [ ] Review score, count, and customer count are the brand's own, as stated, or the element is off the page. No default, no estimate
- [ ] Every proof caption is a real customer's words with its source
- [ ] The headline keeps the ad's main words; the first price option is the ad's offer; the hero image shows the ad's product
- [ ] The byline is the brand or a real person; nothing passes for a publication
- [ ] Nothing from the blueprint's sample copy, scores or captions remains
- [ ] All 5 reason h2s are specific to the angle, not generic
- [ ] Body copy voice matches brand tone and reads human
- [ ] Product prices, option labels, and guarantee days are accurate; no invented offers or claims
- [ ] FAQ questions are relevant to the chosen angle
- [ ] Tweaks panel has 4 headline variants + 3 kicker variants
- [ ] Gallery thumb JS array matches the 5 product images in the HTML (same paths, same order)
- [ ] `.cta-banner` uses `overflow: visible`
- [ ] If image paths came from a local folder, every path was verified to exist
- [ ] File saved (or output in a code block)

If any images were skipped, open your delivery message with the list:

> "Page is built. You'll need to drop in [N] images, marked `[INSERT: ...]` in the HTML:
> - Hero image (hero section)
> - Proof tile 2 (social proof grid)
> - [etc.]"

---

## What this reads from the brand brain

| What | Where (contract names) | When it is blank |
|---|---|---|
| The product, its price, variants, offers | `products-and-positioning.md` Product catalog, Bundles and offers; `offers.json` | Ask. No price is guessed |
| The 5 reasons: what sets it apart | `brand-guidelines.md` Unique selling propositions (ranked); Product catalog: Key features, Positioning angle; `competitors.md` Differentiation summary | Ask for the 3 biggest reasons to choose the brand (Phase 1.4) |
| The buyer and their objections | `customer-avatars.md` per avatar (Why they buy this product, What almost stops them) | The FAQ holds only what the facts answer; say so |
| Real quotes with sources | `customer-avatars.md` Grounded in; Customer language bank | The proof tiles are left out |
| Rating and counts | `brand.json` claims and proof assets, as stated | The review pill is left off |
| Guarantee | `brand.json` guarantee | No guarantee line |
| Ingredients or materials | `brand.json` products (`ingredients`, `specs`) | The reason that needs them is rewritten without figures |
| Voice, colours, fonts | `brand-guidelines.md` Brand voice and tone, Visual identity; `brand-look.json` | Ask (Phase 1.4) |
| Photos | `assets/` | `[INSERT: ...]` placeholders |
| The ad the page follows | Creative Studio or the ad account | Agree 1 buyer and 1 angle |

Not in the contract, and this page needs them: **Returns**, **Shipping and delivery**, **Warranty**, **What is in the box**, **Size and fit**, **How long a pack lasts**, **Subscription terms**, the brand's own **FAQ**, and **Proof on file** (the rating and count with where each is shown).
