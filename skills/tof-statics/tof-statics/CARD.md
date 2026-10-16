<!--
The card of tof-statics: what the planner of a concept ad is sent (src/lib/studio/engine.ts, kindSkill).
SKILL.md beside it is the whole method with its reasoning. This file is the rules, in the app's terms.
The 23 worlds, 4 modes, the devices and the 11 kinds of ad are data in src/lib/studio/worlds.ts: each
item names its own. Not repeated here, because the planner already has them: prompts/studio-plan.md
(the product is real, claims, people, how the product is opened and used) and skills/production-principles.

Where this app differs from SKILL.md (kept here, not sent: a planner has never seen SKILL.md):
- SKILL.md sets the type in a second layer over a picture with no words. This app renders the words in
  the image, in the brand's fonts, and reads them back; a person can also ask for no words on the
  image, or for a copy without them. The rules for the words and the quiet area are the same.
- SKILL.md makes 1 tall image and crops it. This app makes each size the person asked for.
- A message thread or a post is drawn in a design of this app's own. No real platform is copied.
-->
# Concept ads for cold audiences: rules

A concept ad has no layout to copy. It is 1 argument for 1 buyer, shown as 1 picture in 1 visual world. It is judged on 2 things: a stranger stops, and within 1 second can say who it is for and what it argues about this product. A clever picture any brand in the category could run has failed.

## The argument comes first

- 1 buyer and 1 argument to an ad. An argument is a reason this buyer would care, not a product feature: a moment they would recognise, a cause they have wrong, a failed fix, a cost of waiting, an identity.
- It comes from the research: the buyer's own words, their trigger, what they tried. An argument with nothing in the research behind it is a guess: pick another.
- It ends in something only this product can say, taken from the brand's facts: what it is made of, how it works, what it replaces, its guarantee. An argument every competitor could make sells the category.
- In a set, most ads argue something different. 8 ads carry 5 or more different arguments. 2 ads may share an argument only if their worlds and headlines differ.
- Offer and discount ads are for people who already know the brand: 1 in 10 of a set at most.

## The words

- Headline and sub-headline together: 90 characters or fewer.
- 4 tests for the headline: plain English a 12-year-old reads at once; the fewest words that say it; written to 1 person; understood with no context at all.
- The exclusion test: someone the product is not for should read the headline and know it is not for them.
- The ad still works with the headline covered: the picture alone says what it is about. And the headline still works without the picture.
- No headline is a slogan, a pun that needs explaining, or a benefit list. The 3-beat list ("Sears harder. Cleans faster.") is for a brand-world ad only.
- Write the words to the picture: decide the picture, then write what it needs said.
- A set with no words on the image: the picture passes the covered-headline test on its own, and the line you would have set goes into the feed copy.

## The picture

- 1 world to an ad, the one the item names. Commit to it: every part of the image belongs to that world.
- The picture is the argument made visible in under a second. If it needs the headline to be understood, find another picture.
- Read the world for this product. A world written around the body (a body part as a character, an X-ray) becomes, for a product that is not about the body, the thing the problem lives in: a flaking coating, a leaking seam, a clogged filter.
- Leave a quiet area for the words, usually the top third. On a tall image, everything a person must read sits in the middle four fifths of the height, and the bottom quarter is scenery only.
- 1 to 3 devices at most, from the list the item gives. A device is used because the argument needs it.

## The product in the picture

- The product is in the picture, inside the scene and in its light: never a cut-out pasted on top with a shadow. Where the world can't hold it (a sketch, a diagram, a message), it is a small circle in a corner.
- It is drawn from its photos, never from words. In `scene`, say which view the picture uses (the pack front on, the product out of its pack, in a hand, in use) and repeat the 2 or 3 things that make it this product: its shape, its colour, what is printed large. If no photo shows that view, plan a picture that uses a view the photos do show.
- In a drawn or modelled world (clay, comic, pixel, sketch) it is redrawn in that look and keeps its shape, its colours and what is printed large. Small print is left out, never invented. A product larger than life is a choice the `scene` states.
- It may be absent only when all 3 hold: the mode is native or the kind is "The problem, at its moment"; the thing in focus is what the product replaces or the problem it ends (the scratched pan, the soaked shirt, the shelf of half-used jars); and the words say what this product is and the 1 fact that makes it this brand's.

## An honest picture

- The picture shows the problem, its cause, or how the product works. It never shows a result the brand's facts do not state: no changed face or body, no before and after, no week-by-week change, no condition gone, no number drawn into the scene without a source.
- A diagram, cutaway or chart shows only a mechanism or a figure the brand's facts state. A made-up curve is a made-up claim.
- Fear is no bigger than the real stake, and never a medical outcome.
- The most a picture shows the product doing is what a person would see it do.

## The 4 modes

- Creative: the picture is wrong, funny or impossible. The headline is hard and direct.
- Communicative: the picture explains. The headline says what it shows.
- Native: a caption-style line and no brand dressing. It imitates no real platform, outlet or person.
- Brand world: the product as a monument. A short identity headline and 1 specification.

## Ads for buyers who are comparing or ready to buy

An item may name a kind of ad ("A customer's own words", "The price, said plainly"). It is then for a buyer who already knows the category or the product, and these rules replace "the argument comes first":

- 1 kind to an ad. A quote ad is not also a comparison; a deadline ad is not also a feature list.
- The kind needs its evidence, and the evidence is real. A quote is a customer's words from the research, word for word. A number is one the brand's facts state. A price, a saving, a guarantee and a deadline are the offer's own. Nothing is rounded up, and nothing is invented to fill the layout.
- If the facts do not hold what the kind needs, say so in `argument` and make the nearest honest ad from what they do hold. An ad with a made-up quote or a made-up deadline is worse than no ad.
- No person in the picture is shown as the customer who said the quote, as the founder or as an expert.
- A comparison is against the usual way of doing it, unbranded. No other brand is named or drawn.
- Labels on a product: 4 at most. A button: 3 words or fewer. A caption on a problem moment: 5 words or fewer.
- Colder buyers get softer asks: a comparing buyer is shown proof and a way to look closer; only a ready buyer is told the price and to buy.
- The limit of 1 offer ad in 10 is for cold sets. A set for ready buyers is all offer ads.

## Before it is done

- Would a competitor's logo fit on it unchanged? Then the argument is not this brand's.
- Is every word traceable to something the brand can say, and does the picture promise nothing the words could not?
- Was something the ad needed missing (the buyer's moment, a fact only this product has, a photo of the view)? Say so in `watch_outs`. Never fill it in.
