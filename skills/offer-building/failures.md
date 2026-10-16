# The 7 ways offers fail

<!--
The app reads this file (src/lib/offers/data.ts). Each "## n. id | name" heading is 1 failure;
the 3 lines under it are shown on the Offers screen, and "n. name. the fix" is sent to the offer
builder. The test for each failure is code, keyed by the id: change the words here freely, keep
each of the 3 lines on 1 line, and change an id only together with the code.
-->

## 1. blank_discount | A discount called an offer

**What it is:** Money off and nothing else. No reason, no units, no gift, no guarantee, no deadline. It trains buyers to wait for the next one.
**How the app tests it:** The offer has a discount and no other part: 1 unit, nothing added, no risk reversal, no urgency.
**The fix:** Keep the price and add value that costs little, or tie the discount to units, a set, a subscription the brand already sells, or a real deadline.

## 2. margin_miscalculated | The margin is worked out wrong

**What it is:** Counting only the cost of goods and forgetting shipping, fulfilment, fees and, for a product that gets sent back, returns; or discounting past the point the ad account can ever make up.
**How the app tests it:** A cost is missing or shipping is not counted; the discount is 10% or under, too small to change what people buy; no extra items are expected, so the discount only lowers the price; or the return on ad spend needed to keep today's profit per order is far above the return the ads run at. Returns are not counted yet.
**The fix:** Enter the real costs; where buyers send things back, add the average cost of returns per order to the shipping figure. Lower the discount, raise the units, or swap the discount for a gift until the needed return is one the account has reached.

## 3. same_for_new_and_returning | The same offer for new and returning buyers

**What it is:** New buyers need a reason to try. Returning buyers need a reason to stay and buy more. One offer for both overpays one of them.
**How the app tests it:** The offer is for everyone and cuts the price; or every offer in use is aimed at new buyers and none at returning ones.
**The fix:** Say who each offer is for. Give returning buyers their own: for a product that is used up, a longer supply or a reward on the next order; for one that is bought once, the next product, an accessory, a care kit or 1 to give.

## 4. threshold_at_average | A threshold set at the average order value

**What it is:** An average hides the shape. Where order values have 2 peaks, a threshold at the average rewards the buyers already above it and is out of reach of the ones below.
**How the app tests it:** A spend level sits within 10% of the average order value where orders bunch in 2 groups, or is not just above a group of orders. When the spread of order values is not known, it says so.
**The fix:** Look at where orders bunch, not at the average. Put a level 10 to 25% above each group.

## 5. wrong_gift | The wrong gift

**What it is:** A gift buyers do not care about, or one that costs so much the offer no longer pays.
**How the app tests it:** The gift has no stated value to the buyer, costs more than a quarter of the order's margin, is worth less than 3 times what it costs, is the product most of the sales come from (never gift the hero), or is not tied to buying more. Whether this buyer wants it is the 1 judgement a model makes, when the offer is worded.
**The fix:** Ask buyers what they want. Pick a gift that is used with the product, sell it on the site at a real price, and keep its cost low.

## 6. promo_calendar | A promotion every week

**What it is:** Rotating percentage discounts all year and calling it offer rotation. Buyers learn the full price is not the price.
**How the app tests it:** More than 2 flat discounts in the last 12 months, more than 2 discount offers in use at once, or money off that is set to run every week or every month.
**The fix:** 1 or 2 flat discounts a year. Run an evergreen offer built on units, gifts and guarantees the rest of the time, and test replacements on their own page.

## 7. q1_as_season | Treating a quiet quarter as the weather

**What it is:** Accepting a slow stretch as something that happens to the brand: January to March for most stores, the off season for a seasonal product. It is an offer problem, and the quietest quarter is the best time to test offers.
**How the app tests it:** Sales dip in the first quarter (January to March) and no offer is planned for it. A quiet season in another part of the year is not checked yet.
**The fix:** Plan an offer that fits the quiet season, and use that quarter to test new ones.
