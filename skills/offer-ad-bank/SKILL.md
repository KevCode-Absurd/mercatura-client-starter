---
name: offer-ad-bank
title: Offer Ad Bank
description: The set of static ads an offer needs before it runs. 1 offer argued 3 ways (the deal for people who know the brand, the proof for people who doubt the quality, the product for colder people who need a reason it is worth the money), across the product range, in 4:5 and 9:16. The offer's terms are 1 text of their own on every ad, so a change of price or date changes that line and not the picture. How to count the bank, how to tell 3 ads from 3 crops of 1 ad, and the order of work.
---

# The offer ad bank

Written for this app from the BFCM Offer Playbook, offer 5, "Forty offer ads, made in October" (`docs/ecommerce-playbook/offers/the-bfcm-offer-playbook-e3b5`). In the app it is the format **Offer ads** on Create, and "/" → Offer Ad Bank in the chat. The code is `src/lib/studio/offer-bank.ts`.

## 1. Why a bank

In a sale the same people see the same ad many times in 2 days. The ad that worked on Thursday is tired by Saturday, and a brand with 3 offer ads has nowhere to go. That is not a problem of quality: it is a problem of having enough different ads ready before the offer starts. Nobody makes good creative while a sale is live, so the bank is built before it.

## 2. Three arguments, not three crops

One offer needs several arguments, because the person who needs proof is not the person who needs the deal.

| Argument | For | The ad |
|---|---|---|
| **The deal** | People who already know the brand | The offer and its terms, stated plainly, with the range or the bundle shown. In the app: the price said plainly, the bundle and what it saves, a real deadline. |
| **The proof** | People whose doubt is whether it is any good, not what it costs | A real review, word for word, carrying the whole frame. The offer is a small chip. |
| **The product** | Colder people, who need a reason it is worth the money before a discount matters | Why it is worth it at full price, in 3 numbered callouts on the product. The offer appears as a deadline, never as the reason. |

**Write the 3 arguments before a brief is written.** The failure this guards against has a name: treating volume as the goal. Forty versions of 1 argument are still 1 ad. The point of the bank is the 3 arguments; the count is what falls out of making them properly across the range.

## 3. The count

The [40-Ad BFCM Matrix](https://nureachmedia.notion.site/3f409b1670488106a5a9c3b71972ddba) adds useful reasons to argue, within the existing three lanes: verified saving, included bundle or actual access for the deal; a real review answering a specific doubt for proof; a supported benefit/mechanism, approved use, gift suitability or verified comparison for the product. Choose one supported reason per ad. A missing fact stays a gap; an example's numbers, stock, delivery cutoff or quote never become brand facts. This adaptation adds neither four sale phases nor a fixed forty-ad quota, launch schedule, scorecard or winner-refresh plan.

3 arguments × the products or colourways in the offer × 2 sizes. With 4 variants that is 24 before a new line is written. Then 2 more hooks on each ad that is working takes it past 40. The app makes 1 set for 1 product: 6 ads is each argument twice, in both sizes. Make a set for each product in the offer.

## 4. Two sizes, each made at its own shape

4:5 for the feed and 9:16 for stories and reels, each composed for its own shape. Never a centre crop of the other one.

## 5. The offer line is its own text

The offer will change at least once while it runs: a date moves, the price changes, a gift runs out. If the terms are spread through the headline and the picture, every change is a new set of ads. So on every ad the offer's own numbers and dates (the price, the saving, what is given, the last day) appear **exactly once**, as 1 text with the role `offer`, in the offer's own words, 12 words at most. No other text on the ad repeats a number or a date of the offer.

In the app, the set's page has **"The offer line, on all N ads"**: type the new line and every ad changes. An ad that already has a picture is changed on that picture, with everything else kept; it is not made again from its plan. With "Also make it without words" on, each picture is kept bare as well, for a designer who wants to set the type by hand.

The line is only ever what the offer states. A deadline is a real date; a limit is a real count. With neither, the ad has no urgency and says none.

## 6. Told apart at a glance

Put 3 thumbnails side by side at 300 pixels wide. If the argument of each cannot be named without reading it, they are 3 crops of 1 ad, and a test between them shows nothing. Each argument gets its own layout, its own ground and its own dominant colour. The app checks this twice: the plan is warned when 2 ads are the same kind in the same look, or when an argument is missing or takes over the set; and once the pictures exist, the page says which ones read as the same ad at thumbnail size.

## 7. People and proof

- The proof is a real review from the research, word for word, with only the attribution its source holds. A count of reviews or a star rating is shown only when the brand's facts hold it.
- No generated person is shown as a customer or a reviewer.
- The callouts on the product ad are facts about the product from the brand's material: what it is made of, how it is made, what is in it.

## 8. What this does not do

It does not set the offer (Offers does), plan the dates of a sale, or rotate ads in an account. It makes the ads ready, argued 3 ways, with 1 line to change when the offer does.
