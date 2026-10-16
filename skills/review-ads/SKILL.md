---
name: review-ads
title: Ads in Their Words
description: Static ads built on 1 angle of the library: the buyer's phrase baked on the picture character for character, in the 7 formats made to carry a quote, and feed copy where the headline is the quote, the primary text is the story in other buyers' words, and the description answers the doubt.
---

# Ads in their words

Written for this app from the Review Mining playbook, lanes 1 and 2 (`docs/ecommerce-playbook/ai/the-review-mining-c276`, sections 10, 11, 15 and 16). The angle library it builds on is the `review-mining` skill; the formats are held as data in `src/lib/studio/worlds.ts` (the `review` funnel) and the picks in `src/lib/studio/review-ads.ts`.

**The idea.** The creative carries one line, and the line is a buyer's. The format is chosen for the job that line does: an identity line becomes a negative qualifier, a doubt and its answer become a Q and A card, a mechanism felt becomes a strikethrough of the brand's own duller line. The phrase is locked: the planner may not improve it, the words writer may not tidy it, the image model may not rewrite it, and the render is read at full size to prove it did not. The headline in the feed is the same phrase, trimmed, never reworded. Then the headline is not a claim the brand has to substantiate; it is a quote the brand can source.

**In this app.** Create → "Ad from a review". The person picks the product and the angle (the first angle not built yet is chosen to start with); the set is 1 to 7 ads, 1 format each, the formats made for the angle's job first. The phrase and its source id ride in the set's notes under THEIR WORDS, EXACTLY, in every item's direction, and in the record of what was made. The angle's status on Insights turns to running when it is adopted. `/review ads` in the chat does the same from a sentence.

## 1. The seven formats, and the jobs each carries

| Format | What it is | Carries best |
|---|---|---|
| Negative qualifier | "Do not buy this if..." then the phrase that says who it is for | 01 identity, 10 complaint |
| Q and A card | The doubt as a question, in a buyer's words; the phrase as the answer | 04 objection, 05 slow start |
| Strikethrough correction | The brand's own line struck out, the buyer's line written in beneath it | 06 mechanism, 11 villain |
| Taped note | The phrase handwritten on paper, taped over a real product photograph | 02 trigger, 08 real win |
| Poll sticker | A story frame; the phrase as the poll's question, in a design of the app's own | 06 mechanism, 09 ritual |
| Quote card | The phrase set very large, the attribution small, the product small | 07 first notice, 08 real win |
| Side by side | Before and after as scenes or objects, both halves in buyers' words; never a body | 03 failed fix, 11 villain |

Seven angles through seven formats is 49 statics; the fiftieth, in the playbook, is the review card itself. In this app a set is 1 angle through up to 7 formats, and the next angle is the next set: one angle per asset, so a test says which angle worked.

The strikethrough's struck-out line is the brand's own nearest sentence from its site or ads, or a plain category claim. It is never a competitor's words: the ad is an argument about language, not about a rival.

## 2. The generation brief

The planner is told, per ad:

```
FORMAT     : the format and what its picture and words are
THE PHRASE : "..." (R-012), as the `quote` text element, character for character,
             the biggest text on the image
SCENE      : the planner's own, in the world the pick names
REFERENCE  : the real product photograph (locked, never regenerated)
RULE       : trim only at a word boundary if the format cannot hold it whole,
             and say so; never reword
```

The attribution is only what the source holds: a first name if the export kept one, else nothing. No invented name, initial, city or star count. A reviewer the import marked as given the product is marked so beside the quote.

**Check the baked copy at full size.** Image models silently rewrite text: "Not night one. Night nine." comes back as "Night mine" often enough that every render is read at 100%, not as a thumbnail. In this app the inspect step compares the render's words with the plan's and fails a changed quote; a failed image is mended off itself (the `image-prompt-craft` re-roll), never re-prompted from the brief. A rewritten quote is no longer a quote.

## 3. The feed copy

The creative carries one line; the copy around it carries the rest of the story. Most brands skip this lane because they assume the image is the ad. The structural rule: **the headline is a quote, the primary text is the story, the description is the objection.**

| Field | What goes in it | From |
|---|---|---|
| Headline, 40 characters or fewer | The phrase, trimmed at a word boundary, never reworded | The angle |
| Primary text, first line | An identity or trigger line, so the right person self-selects in the first words | 01, 02 |
| Primary text, middle | The failed fix, then the first notice: the whole arc in two sentences | 03, 07 |
| Primary text, close | The real win, then one plain call to action | 08 |
| Description, under 30 characters | The doubt, answered. Never a discount | 04, 05 |

The primary text is 60 to 110 words and quotes at least 2 of the other buyers given in the notes, from different sources, in quotation marks, so what is theirs and what is the writer's can be told apart. One quote, one plain sentence, one quote: never three quotes in a row. The connective writing is plainer than the quotes; if the writer's sentence is the most interesting one, the ad is about the writer. No exclamation marks, no em dashes, none of game-changer, elevate, unlock, transform.

Six copy sets against one creative beat six creatives against one copy set, and cost nothing to produce. A set's copy varies which buyer it opens with across its ads: six ads built on one buyer's voice is one ad.

## 4. The rules

1. If the line is not in a source, it does not go in the ad. The phrase, the backups and the attribution all come from the library with their source ids.
2. Verbatim means verbatim. Trim at a word boundary; never fix, tighten, punch up or make it "more us".
3. The connective copy is plainer than the quote.
4. One angle per ad, one angle per set.
5. Never let a model regenerate a quote: the phrase is locked in the plan, read at full size, and a changed one is mended off the flawed image.
6. The source id rides along: in the notes, the direction, the record of what was made.
7. A quote from an unverified review is read, not run in paid: the set says so in its notes. A reviewer who was given the product is disclosed beside the quote.
8. No invented customers, names, cities or counts. No before-and-after of a person's body.
9. The app's claim checks apply to a quote as to any line: a quoted disease claim is still a disease claim, and a number in a quote is still a number the brand has to hold.

## 5. What the checks read

- `review_quote_missing`: an ad of the set has no `quote` text element. The phrase is the ad.
- `review_quote_changed`: the quote on the image is not the phrase word for word.
- `review_headline`: the feed headline is not the phrase trimmed at a word boundary.
- `quote_source` (from the studio's own checks): a quoted span in the copy is not word for word in the research.

All are warnings on the set, never blocks: a person reads them and decides.
