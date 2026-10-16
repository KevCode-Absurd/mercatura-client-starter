# Performance playbook for image ads

Craft rules for image ads that the 9 beats don't cover: how the offer is built, how to read results, what the platform rejects, and what the picture must respect. They hold for any brand that sells a physical product.

## 1. E-commerce offer mechanics

The ad can only sell the offer that exists. Check which of these the brand has, and say them plainly.

| Mechanic | What to show or say | Watch for |
|---|---|---|
| Subscription | The price, how often it ships, how to pause or cancel | If research shows fear of being locked in, put the real cancel steps in the primary text. Never write "cancel anytime" unless it is that simple. |
| First-order discount | The price today and the price after | A renewal price that surprises buyers comes back as refunds. Show both. |
| Bundle or multi-pack | Per-unit or per-use price, and why that quantity | Tie the quantity to how the product is used up or used together (a 3-month supply, a pan and its lid) |
| Sale | The sale price (not only the %), the reason the product is worth it, the real end date | "Was" prices and "lowest ever" only if confirmed |
| Guarantee, warranty, returns | The window, what the buyer does, what they get back, in the brand's own wording | Say every condition (first order only, unworn, in its box). A warranty period is not a lifespan. |
| Free gift | What it is and what it's for | Only if it helps them use the product |
| Reason for now | Stock, batch, season, price change | Must be true |

## 2. Read the numbers before remaking

Compare against the account's own average, not a universal benchmark.

| Signal | What it usually means | Change |
|---|---|---|
| Low link click-through, low thumb-stop | The image has no clear entry point, or the overlay speaks to nobody in particular | New image or overlay. Keep the primary text. |
| People tap "See more" but don't click | The primary text loses them: no promise, late offer, dead CTA | Rewrite the first line, promise and CTA |
| High click-through, low conversion | The landing page top doesn't repeat the ad's claim, the price surprises, or the overlay pre-qualified the wrong people | Match the landing page. Show the price. Make the overlay clearer about who it is for. |
| Carousel: most people stop at card 1 | Card 1 doesn't open a gap | Rewrite card 1 so it promises what the swipe reveals |
| Carousel: swipes but no clicks | The last card hides the CTA | 20 words or fewer on the last card, with on-card CTA text |
| Works for a week, then fades | Fatigue | Overlay swaps first, then a new image, then a new archetype |
| Cheap clicks, high refunds | The ad sets an expectation the product doesn't meet | Check the guardrails. Shrink the promise. |

A variant should change 1 thing: the overlay, the image, the archetype, the way the primary text opens or the persona.

## 3. What Meta and regulators reject

- **Personal attributes.** Don't assert or imply the viewer has a condition, a body type, an age or a financial state ("Is your skin dull?", "Struggling to afford good cookware?"). Safer: the first person, "if you've...", a scene, or a statement about the category.
- **Results.** No cure, treat or prevent language. No guaranteed result and no fixed timeline ("visible in 7 days", "lasts a lifetime") unless the brand's facts hold it in those words.
- **Before and after.** Not allowed for weight loss and many health and beauty categories. Elsewhere, only real, consented photos the brand uploaded.
- **Fake proof.** No invented review, review screenshot, rating, count, press logo or expert. A generated picture of a review on a named review site is a fake review.
- **Fake interface.** No fake play button, notification badge or system dialog. A native format is a generic one, never a real platform's design.
- **Negative self-perception.** Don't shame the viewer's body, home or habits.
- **Comparisons.** Facts only, against a kind of product. No competitor's name or packaging.
- **Urgency.** Real deadlines and real stock limits only.
- **Green, safety and origin words** ("sustainable", "non-toxic", "safe for babies", "made in"): only with the brand's proof.

Flag anything doubtful for a person to check before launch, and offer a safer version.

## 4. Writing prompts for image models

Not this skill's job. The plan says what the picture shows and the exact words on it; `skills/image-prompt-craft` turns that into the image model's prompt, and `skills/production-principles` says how the product is shown true (tagged product photos, a job for each, the words agreeing with the photo). 3 things the plan must give the prompt writer:

- **Where the empty space is,** so the words fit inside the safe zones of every ratio the ad is made in.
- **The whole action** wherever the product is open, held or in use, from the brand's facts.
- **Who is in the picture:** a fictional adult from the buyer's world, or nobody. Never a generated face beside a quote.
