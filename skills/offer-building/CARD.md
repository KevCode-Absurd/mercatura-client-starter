# Offer building: the card

<!-- The rules of SKILL.md with the explanation taken out. This is what the offer builder is sent. -->

An offer is not a discount. It has 5 parts: **positioning** (the problem, for whom, why now), **price architecture** (units, threshold, bundle or set, subscription, billing cycle), **value mechanic** (what the buyer gets that costs the brand little), **risk reversal**, **urgency**. The buyer judges it by the gap between what they get and what they think it costs the brand to give it. Widen the gap with things worth a lot to the buyer that cost the brand little (something it already owns, a partner's product, a low-cost item with a real price); do not cut the price.

## Used up, or bought once

Read the brand block first. A product shown with "1 unit lasts N days" is used up and bought again. One without is bought once, after longer thought (price, fit, lasting, can it go back).

- **Used up**: more units is a longer supply. `subscription` only where the brand already sells one. Risk reversal: money back on the first order, or a small size to try. Returning buyers: a longer supply or a reward on the next order.
- **Bought once**: `subscription` is false and nothing is called a supply. More units is a pair, 1 to give, or a set. Risk reversal carries the offer: a trial at home, returns, an exchange for size, a warranty. Value added: care, fitting, a spare part, an accessory. Returning buyers: the next product, never the same one again.

## The mechanics

- **reposition**: the same product for a different problem, buyer and headline. No margin cost. Then build the terms around that buyer (a result that takes 90 days justifies a 90-day supply; a first week of doubt justifies 30 days to send it back). Every offer for a named buyer starts here, whatever its mechanic: positioned for them, answering their main objection.
- **bundle**: more units or several products in 1 order. The shipping saving protects the margin.
- **gift**: a low-cost item that pairs with the product, given at a unit or spend level. It needs a real price so it reads as value included.
- **tiered**: spend more, get more. Tiers sit 10 to 30% above each peak in the order values, never at the average.
- **discount**: flat money off. Rare (1 or 2 a year), on high-margin or slow stock, to turn stock into cash and never to rescue a sales figure. Never alone: pair it with units, a gift, a guarantee or a deadline.

After the main offer (these are not a 6th and 7th mechanic: they add profit to an order that is already decided, and are judged by share who take it x price x what is kept of it):

- **upsell**: 1 add-on in the cart or at checkout: more of the same (the longer supply), or a different product that goes with the cart (a cross-sell). Relevant to the cart first, then high margin; read in 2 seconds. At checkout, a low-friction add-on (shipping protection), not a second product.
- **post_purchase**: a 1-click add after payment. Anchor high, step down if declined.

## Named deals

Known shapes of the mechanics above. Use one when it fits the buyer, and say it in its own words.

- **Buy 1, get 1 free; buy 1, get 1 half price; 3 for 2** (bundle): `units` is every unit in the parcel and `discount` the share off the whole order (a half, a quarter, a third). The free unit still costs what it costs to make: the order has to keep more than the same share off 1 unit would.
- **A gift over a spend level, in place of a deeper cut** (gift): a lighter discount, or none, and a named gift keeps more than the deep discount does. The level is the median order of the last 90 days plus 20 to 30%. The gift sells on the site at its own price, costs little, and is something a buyer would come back for. **Never gift the hero**: not the product buyers come for. A gift that can run out needs its count, and the line for when it has, in `needs`.
- **A spend ladder** (tiered): 3 levels, for example 10% off, 20% off, then 25% off and a gift, the upper 2 at about 1.5 and 2.5 times the average order and never inside a peak. The top gift costs the brand under a tenth of the average order. The cart says how far the next level is. A bonus level for the last 24 hours only where the sale has a real last day, and its gift is named with its price: never a mystery gift.
- **Credit on the next order** (gift, with the name "Credit on the next order"): spend this, get that back as credit. It costs the brand the goods the credit buys, not its face value, and only when it is spent: `value` is the face value, `cost` the face value times what goods cost as a share of the price. The expiry date and how it is issued go in `needs`.
- **Early access** (an `access` add on any offer): the list gets in first, about 7 days, at the same price or percentage everyone gets later. The public price is never below the early one and the window is never extended.
- **A shipping cut-off sale** (reposition, no money off): the deadline is the carrier's real last order day for personalised, standard and express orders, and for gift cards. `urgency` holds those dates, or "[the carrier's dates]" until they are given: never a count of days without a date. Returns extended into the new year, where the brand can, go in `needs`.

## Rules

1. Start from the buyer. Each offer answers a stated objection or want from the research, and says which.
2. Stack 2 to 4 parts. Stop there: simple scales.
3. Prefer units, gifts, access and guarantees to a percentage off. A discount of 10% or under changes nothing about what people buy and only lowers the price; past 30 to 40% no rise in units pays for it. A bonus given on the second order (the extra unit, the reward) protects the first order's margin and brings the buyer back.
4. New buyers and returning buyers get different offers: a reason to try, a reason to stay and buy more. Say which each is for.
5. Use only the facts given. Never invent a fact about the product: a count, a dose, an ingredient, a size, a material, a result, a time to a result or how long it lasts. A partner, an app, a download or a service the brand does not have is allowed as a proposal: name it plainly and put what the brand must make or arrange in `needs`.
6. The guarantee is the brand block's, word for word. A longer trial, free returns or a warranty it does not state is a proposal: put it in `needs`, with what it costs the brand when buyers use it.
7. No claim the facts do not hold. Never say or imply the product treats, cures or prevents anything, works with a medication, or saves a stated sum.
8. Every offer must be deliverable by an online store: shipped, downloaded, access granted, or done for the buyer.
9. Estimate costs honestly. A gift's `cost` is your estimate of what the brand pays for it, and its `value` what the buyer would pay.
10. Design around the 7 failures listed below. Do not propose an offer that triggers one.
