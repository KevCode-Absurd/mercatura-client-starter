---
name: offer-building
description: What an offer is for any online store, the short path that builds one, and the 7 checks it is held against. The detail lives in the Offers screen and in code; a model is sent only the path that was chosen.
---

# Offer building

## What an offer is

A discount is a percentage off. An offer has 5 parts, and a discount touches only the second.

1. **Who and why now.** The problem the product solves, for which buyer, and why today.
2. **The price.** 1 unit, a set, a spend level, a subscription. Not only money off.
3. **What is added.** Something the buyer wants that costs the brand little: free shipping, a gift, a sample, a perk.
4. **What removes the risk.** A guarantee, returns, a trial, a small size to try.
5. **Why now.** A real season, drop or window. Real or left out.

The buyer judges the gap between what they get and what they think it costs the brand to give it: a deal feels good when it looks as if nobody could be making money on it. So widen the gap with things that are worth a lot to the buyer and cost the brand little (something it already owns, a partner's product, a low-cost item with a real price on the site), not by cutting the price. Simple scales: add only what this buyer cares about, and after 90 to 120 days ask buyers which part made them buy and take out what nobody names. A part that wins the first order and disappoints in use costs the second order: fix it or remove it.

## The path

Every offer starts from the customer, not from what the brand wants to earn.

1. **Who it is for.** 1 persona and their biggest doubt, from their own words (ask buyers what held them back and what worried them first). The product is said again for that persona, as the answer to their problem, and the terms are built around their reason: this is where every offer for a persona starts, whatever the mechanic. New buyers get a reason to try; returning buyers get a reason to stay and buy more. Never the same offer for both.
2. **The mechanic.** 1 of 5: the same product for a new buyer, a bundle, a gift with purchase, spend more and get more, a straight discount used rarely. Code marks 1 as recommended from 4 questions: how much of an order is kept, whether order sizes bunch in 1 group or 2, 1 hero product or many, whether buyers come back. 1 hero: a new buyer for it first, then a gift, then a rare discount. Many products: bundles, add-ons across categories, spend levels. Buyers who rarely come back: protect what the first order keeps. Mechanics can be combined (a gift for 1 group of orders, a spend level for the other).
3. **Add-ons.** Tick only what answers the doubt: take the risk away, a real reason to act now, a reward for staying, a free extra.
4. **The numbers.** Price, cost per item, shipping for 1, 2 and 3 items, items per order. Code works out what is kept per order, the break-even return (1 divided by the margin) and the return needed to keep today's profit per order. Cost of goods is counted on every unit sent at its full cost, never on the discounted price. A small discount (5 to 10%) loses money: nobody adds an item for it. The break-even return climbs steadily with each point off; the return needed to keep today's profit climbs faster and faster. Where there is a discount, it sits where profit per order peaks, read off how items per order moved in past discounts. How far a sale lifts the ads depends on how rarely the brand discounts.
5. **After the main offer.** Cart, checkout, after payment, on leaving. A cross-sell is a different product that goes with the order; an upsell is more of the same. Added profit per order = share who take it x its price x what is kept of it: judge by that, never by take rate, order value or margin alone. In the cart: 1 offer per slot, relevant to the cart first, read in 2 to 3 seconds. At checkout: a small add-on that needs no thought, not another product. After payment: a 1-click add, lead high and step down (a good one adds 10 to 15% to the order value). On leaving: generous while browsing, small with a full basket, no money off at checkout (a reminder, or a risk removed).

Then 1 small call words it: the name, the line on the page, the line a person says, and why it answers the doubt.

Of the many offers a brand could run, a few are good, and only a test says which: a new offer is tested on its own page beside the running one, which stays until something beats it.

## Named deals

Some offers have a name a shopper already knows. Each is a shape of a mechanic above, not an 8th mechanic, and the offer editor fills its parts in from "Start from a named deal" (`src/lib/offers/plays.ts`). The Discount calculator works 3 of them out on the brand's own costs, under the flat-discount table.

| Deal | It is | What to know |
|---|---|---|
| Buy 1, get 1 free; buy 1, get 1 half price; 3 for 2 | A bundle | It is 50%, 25% or a third off the order, on 2 or 3 units in 1 parcel. The free unit still costs what it costs to make, so compare it with the same share off 1 unit, and both with full price. |
| A gift over a spend level | A gift | In place of a deeper cut: on a 55% margin, 40% off a $90 cart keeps $13.50 and 20% off a $95 cart with a gift keeps $25.80 (the playbook's own sum). The level is the median order of the last 90 days plus 20 to 30%. Name the gift and its price. Never gift the hero. Know the count and have the sold-out line ready. |
| A spend ladder | Tiered | 3 levels (the playbook's example: $75+ 10%, $150+ 20%, $250+ 25% and a gift, on a $100 average order): the upper 2 at 1.5 and 2.5 times the average order, the gift under a tenth of it. A line in the cart says how far the next level is. A last-24-hours bonus level needs a real last day and a named gift. The app still checks that no level sits inside a peak. |
| Credit on the next order | A gift, on the second order | "Spend $100, get $50 back" costs the brand the goods the credit buys, not $50, and only when it is spent. It brings the buyer back. The share of credit that gets spent is the brand's own number: until it has one, the calculator's figure is an assumption. |
| Early access for the list | Access, on any offer | The list gets in about 7 days before the public (3 is too short, 14 too long), at the same price or percentage. The public price is never below the early one. No extension. |
| A shipping cut-off sale | A repositioning, no money off | December 1 to the last shipping day. 4 real dates from the carrier: personalised orders, standard, express, gift cards by email. The dates are shown; a day count is only ever worked out from a date that was entered. Returns extended into January. |

What the playbook says that the app does not take: "buy 2, get 1 free doubles the profit" (it does not, once the free unit's cost is counted: the calculator shows the real figure), and a "mystery gift worth $75" (a gift is named, with its price, or it is not offered).

## The 7 checks

`failures.md` lists them. Code tests the ones that are sums or structure. Only "would this buyer want this gift" is a judgement, and it rides in the wording call. A warning is shown on the offer and never blocks it.

## A new brand

The offers found on its site and in its ads are sorted into the 5 parts by their own words (`partsOfText`). A part no offer states is shown as a suggestion, not a fault.

## Files

- `snippets/<mechanic>.md`, `snippets/addons.md`: the few lines the wording step is sent for the choice made.
- `failures.md`: the 7 failures, read by the app.
- `CARD.md`: the older card, still sent when several offers are designed at once or borrowed from another industry (Advanced view).
- `industries.json`, `research/`: what other industries do.
