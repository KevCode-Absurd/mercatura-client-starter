# BEFORE and AFTER images

How to make the BEFORE (an annotated real screenshot) and the AFTER (a mock-up made with the image model) and place them in the deck's slots. The image model in use, its id and its settings are in `skills/production-principles/models.md`; none is named here. This phase costs money: say what it will cost and get an OK first.

## BEFORE images: real 9:16 screenshots only (G8)

Every BEFORE is a Phase 1 screenshot of the exact section the test is about, framed 9:16 at a phone viewport with the whole section in frame. Never generate, redraw or edit a BEFORE.

Per slide:
1. Take the real 9:16 crop from `screenshots/crop/`.
2. Place it in the slide's before slot.
3. Add a highlight box in the brand's accent colour over the problem area and a short callout naming the issue ("2 competing buttons, no clear path"). No long dashes (G3).

A missing or clipped crop means going back to Phase 1. A section that cannot be captured leaves the slot empty, labelled "live screenshot pending".

## AFTER images: a mock-up from the real BEFORE

Always edit FROM the real 9:16 crop, at 9:16, so the brand's interface, product and layout stay as they are.

### Flow per image

1. Upload the source crop to the image tool (1 crop serves every variation of that surface).
2. Generate once per test, with that test's prompt.
3. Download the result and place it in the matching `AFTERSLOT_<surface>_v{n}` slot.

Keep a `manifest.tsv` (job id, `surface_v{n}.png`) so a run can be resumed.

### Prompt rules

1. Change exactly ONE thing per image; keep everything else identical to the reference.
2. End every prompt with: "Keep all text crisp, sharp and perfectly legible. Photorealistic mobile storefront interface, vertical phone screenshot."
3. Use the client's brand name, colours, products and prices, from the brand brain.
4. Variations for 1 surface pull different levers, not 3 shades of 1 idea.
5. **No invented proof (G9).** Every bracket below that stands for a rating, a review count, a customer or sales count, a press logo, a certification, a guarantee, a price or an offer is filled from the brand's facts. If the brand has none, write "a plain grey box labelled '[what goes here]'" in its place. Never a made-up number, a real publication's logo the brand was not in, or a live counter the store cannot run.
6. **Fit the kind of product.** Subscription, price per unit and "supply" belong to a product bought again. Size picker, what is in the box, returns and warranty belong to a product bought once. Drop the template that does not fit.

### Prompt templates by surface (pick up to 3 that fit; adapt every bracket)

Generate 1 image per variation and place it in `AFTERSLOT_<surface>_v{n}`.

**1. Home page**
- 1 clear button and categories: "Edit this [BRAND] mobile homepage. Keep the brand look. Replace the competing buttons with ONE primary [ACCENT] button '[SHOP BEST SELLERS]', and below it a row of 4 rounded category tiles [CAT1..CAT4]. ..."
- Proof in the hero: "Edit this [BRAND] homepage hero. Add a proof strip under the headline: [THE BRAND'S RATING AND COUNT] and [PRESS THE BRAND REALLY HAS]. Keep 1 clear button. ..."
- Offer-led hero: "Edit this [BRAND] homepage hero. Show the current offer ('[THE BRAND'S REAL OFFER]') as a banner above the button. ..."

**2. Navigation menu**
- Shop by need: "Edit this [BRAND] mobile menu. Make the first section a heading '[SHOP BY NEED]' with 4 large tiles [CAT1..CAT4], then a short list of 4 links. Remove the long category list. ..."
- Shorter, with search: "Edit this [BRAND] menu. Cut to under 7 items, add a search bar at the top and a 'Best sellers' link first. ..."
- Featured product: "Edit this [BRAND] menu. Add a small best-seller card with thumbnail, [THE BRAND'S RATING] and price above a short link list. ..."

**3. Collection page**
- Filters and sort: "Edit this [BRAND] collection grid. Add a sticky bar with rounded filter chips [CAT1..CAT4] and a Sort button. Keep the products. ..."
- Proof on cards: "Edit this [BRAND] collection grid. On each product card add a 'BEST SELLER' badge where true and the product's [REAL RATING AND COUNT] under the name. ..."
- Bundle or set card: "Edit this [BRAND] collection grid. Insert 1 wide card at the top with an [ACCENT] border: '[REAL BUNDLE OR SET NAME]', '[A + B]', '[ITS PRICE]' beside '[THE REAL SEPARATE PRICE]', [ACCENT] 'ADD TO CART'. ..."

**4. Product page**
- Sticky button: "Edit this [BRAND] product page. Add a sticky bottom bar: full-width [ACCENT] button 'ADD TO CART  [PRICE]' with a small product thumbnail at left. ..."
- Offer block, product bought again: "Edit this [BRAND] price area: one-time price '[PRICE]', and a selected row 'Subscribe: [REAL SUBSCRIPTION PRICE], [REAL SAVING IN MONEY], pause or cancel any time', with small grey '[REAL PRICE PER DAY OR PER SERVING]'. ..."
- Offer block, product bought once: "Edit this [BRAND] price area: the price '[PRICE]', the size picker with a 'Size guide' link, and under the button 3 short lines: '[REAL DELIVERY TIME]', '[REAL RETURNS WINDOW]', '[REAL WARRANTY]'. ..."
- Selling points on the image: "Edit this [BRAND] product page. On the product image overlay up to 4 small rounded badges down the left edge, each a fact from the brand brain: '[KEY SPEC]', '[TESTED BY, IF TRUE]', '[REAL RATING]', '[GUARANTEE OR WARRANTY]'. ..."

**5. Landing page (advertorial, reasons-why page)**
- Reasons-why hero: "Create a [BRAND] reasons-why landing page. Announcement bar and logo, headline '[THE AD'S HEADLINE WORDS]', the start of a numbered list (a large '1', a sub-heading, 2 lines of body, a photo of the product in use), [ACCENT] button 'SHOP [PRODUCT]'. ..."
- Problem and answer: "Create a [BRAND] advertorial hero: a small 'Advertisement' label, a headline about the problem in the ad's words, 1 photo of the product in use, the first 2 lines of the story. No button in the first screen. ..."
- Sticky button and offer reminder: "Create a [BRAND] landing page with a slim bar '[THE REAL OFFER] applied' and 1 [ACCENT] buy button that stays in view. ..."
- If the store has no landing page, make these as a PROPOSED page and label the slot so (G7).

**6. FAQ, About, story**
- Story that leads somewhere: "Edit this [BRAND] About page. Keep the founder's story and the real founder photo; add a short mission headline, up to 3 facts the brand states ([REAL FACTS]), and an [ACCENT] 'SHOP [BEST SELLER]' button at the end. ..."
- Proof-led: "Edit this [BRAND] About page. Add [PRESS THE BRAND REALLY HAS] and 2 or 3 real customer quotes, plus the mission in 1 sentence at the top. ..."
- FAQ that answers objections: "Redesign this [BRAND] FAQ as a clean accordion that answers the top reasons not to buy first ([delivery time], [returns or guarantee], [the product-specific worry], [how to use or which size]), each with a short answer, and an [ACCENT] 'Shop now' button. ..."

**7. Cart**
- Goes-with card: "Edit this [BRAND] cart. Keep header, line item, subtotal, checkout button. Fill the empty middle with a 'GOES WITH IT' card (thumbnail, '[REAL PRODUCT] [PRICE]', [ACCENT] 'ADD') and a line '[REAL RATING], [REAL GUARANTEE OR RETURNS]'. ..."
- Free-shipping or gift bar: "Edit this [BRAND] cart. Change ONLY the top strip into a compact progress bar toward '[THE REAL THRESHOLD AND REWARD]', filled [ACCENT] to the current point, caption 'You are [X] from [reward]'. ..."
- Reassurance: "Edit this [BRAND] cart. Under the subtotal add a small row: '[REAL RETURNS OR GUARANTEE]', '[REAL DELIVERY TIME]'. ..."

**8. Checkout** (what can be changed depends on the store's plan: check before proposing)
- Wallet buttons first: "Edit this [BRAND] checkout. Keep order summary, contact, delivery fields. Put the express wallet buttons the store has switched on at the top, full width, and a line '[REAL RETURNS OR GUARANTEE]'. ..."
- Reassurance by the summary: "Edit this [BRAND] checkout. Beside the order summary add the product thumbnail, '[REAL DELIVERY TIME]' and '[REAL RETURNS OR GUARANTEE]'. ..."

**Extra: quiz result.** "Create a [BRAND] mobile quiz result page. 'Your match', a line 'Based on your answers: [need]', 2 or 3 recommended product cards (thumbnail, name, price, [ACCENT] 'Add to cart'). ..."

**Extra: offer after purchase.** "Create a [BRAND] one-click offer shown after payment. 'Order confirmed' banner, headline 'Add [what goes with it] to this order', ONE product with [ITS REAL OFFER PRICE], 'no extra shipping' if true, a large [ACCENT] 'YES, ADD IT' button, a small 'No thanks' link. ..."

## Check before placing (hard gate)

Look at every variation at small size for garbled text, wrong brand colours, and any number or logo that is not the brand's own. Make again what fails. Each surface ends with at least 1 usable design before moving on.
