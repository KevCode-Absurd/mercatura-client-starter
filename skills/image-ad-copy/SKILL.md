---
name: image-ad-copy
description: Plan and write static image ads and carousels for any D2C brand that sells a physical product - what the ad argues and to whom, what the picture shows, the words on the image (when there are any), and the feed copy (primary text, headline, description, button). Covers single statics, native posts, advertorial and long-copy statics, mechanism, proof, comparison and offer statics, and carousels. Use for any static, image ad, carousel or ad headline request. Does not write video scripts or the image model's prompt (image-prompt-craft does that).
---

# Image ad copy (statics and carousels)

An image ad is judged on 3 things: a stranger stops on it, can say in 1 sentence what it argues, and knows what to do next. It has no sound and no timeline: the eye decides the order. The 9 beats of an ad (hook, problem, promise, mechanism, objection, proof, offer, risk reversal, call to action) are spread across the picture, the words on it, the feed copy and the landing page.

The step that sends this skill decides how many ads or cards, the ratios, which word slots are wanted, the claims rule and the shape of the answer: where they differ, the step wins. Every word follows the order of priority sent with the step: a plain sentence a person would say, then it sells, then it tells a story, then the brand's language (who it talks to, its words, its tone). A habit of the brand's own ads (a rhythm, a run of short sentences) is an option, never a rule. Examples are from made-up brands in different categories; never copy their words, numbers or claims.

## Reference files

| File | What it holds | Read it at |
|---|---|---|
| `references/performance-playbook.md` | Offer mechanics, reading ad numbers to find the weak slot, what the platform rejects | Steps 3 and 11, and every review |
| `references/winning-ad-patterns.md` | Patterns counted across 589 saved winning image ads: layouts, on-image text, proof and offer devices, by awareness stage | Steps 5, 6 and 7 |
| `CARD.md` | These rules without the explanation, the tables of examples and the worked examples | What a planning step is meant to be sent |

How a picture is shown true (tagged product photos, people, words in a picture) is in `skills/production-principles`. How the image model's prompt is written is in `skills/image-prompt-craft`. Neither is repeated here.

## Match effort to the ask

| Request | Do |
|---|---|
| "5 headlines", "make this primary text clearer", "1 more overlay" | Steps 1 and 7 to 9 only. Return the lines with exact character counts. |
| "Make an ad" | All steps. 1 ad. |
| "Make a few ads", or no angle given | All steps. 3 ads on 3 angles and archetypes that differ in the argument. |
| "Make a carousel" | All steps, plus the carousel section. |
| "Sale", "launch offer" | All steps, leaning on the offer archetypes and step 3. |
| "Make something like this ad" | Ask which reference mode (below). |
| "Turn this script into statics" | From a script (below). |

**No customer research yet?** Write from the brand brain's avatars (`What almost stops them`, `The moment`) and its `Customer language bank`. If those are blank too, write from the product and mark the ad `inferred` in the flags: every such ad is a bet to test. Never write a customer quote that nobody said. (`image-ad-copywriter` is the older, by-hand method for this case.)

**Starting points.** Each gives a different amount of freedom.

| Starting point | What was given | Freedom |
|---|---|---|
| A. Same ad, new format | A reference ad, to be remade exactly | None over the words. Every text element stays, in order; only the visual format changes (`ad-reference-exact`). |
| B. Keep the structure | A reference ad, as the skeleton | Words and look. Same archetype, same reading order, same job for each text element. |
| C. Loose inspiration | A reference ad, for why it worked | Everything. Only the principle carries over. |
| D. From research | No reference | Full. |

- **Mode A.** Keep the reference's copy word for word, in the same reading order. Move each element to the slot that does the same job in the new format. The claim and guardrail checks report; they do not rewrite.
- **Mode B.** Break the reference down first: its archetype; where the eye lands first and what each text element does; which beats sit on the image and which in the feed copy; how and when the product appears. Build on that skeleton with this product, this research and the brand's own look. A generic native format (a note, a text thread) is fair to reuse. The reference's design, its distinctive lines, its claims, its numbers and its people are not. Share no phrase of 6 or more words with it.
- **Mode C.** Take only why it worked, then run every step. Name the principle in the flags.

**From a script.** When a script exists for the concept, cut the image ad from it so every asset carries the same claim:

| Script part | Becomes |
|---|---|
| Hook line and its overlay | On-image headline; the other hook variants are overlay variants |
| Problem line (the accommodation) | The scene |
| Promise and mechanism | Subline, or the mechanism static |
| Objection (failed solution) | Comparison static, or the middle cards of a carousel |
| Proof | Badge, or the proof static |
| Offer, risk reversal, call to action | Offer static, last carousel card, the feed copy's close |
| The whole script | The longest primary text, rewritten for reading |

Keep the script's evidence ids (theme and claim ids) on every slot they feed.

## What this skill produces

For each ad: who it is for and where they are (buyer, awareness stage, archetype); the picture and the layout; the words on the image, if any; the feed copy, if asked for; the evidence used, what is missing, and anything a person should check before launch. For a carousel, the same per card, plus why each swipe happens.

## Inputs

By hand, gather these first. In the app they arrive with the job.

| Input | Why it matters | If missing |
|---|---|---|
| The brand's facts: products, materials or ingredients, prices, offers, guarantee, claims it may state, claims it may not, proof it holds | Mechanism, proof, offer, compliance | Ask. Never fill a gap with a likely figure. |
| Customer research and the avatars | The words on the image come from here | See "No customer research yet?" above |
| Concept: buyer × angle × offer | 1 concept per ad | Propose 1 and state it |
| Awareness stage | Decides the archetype, how long the primary text runs and whether technical terms are welcome | Pick 1 and state it |
| The product on camera: what it looks like, its pack, how it is used, what a viewer can see change | What the picture may show | Show the product closed and at rest |
| Product photos and any real photos of real people | What the picture can be built from | List what is needed |

## How image ads differ from video

- **The eye decides the order.** Build 1 clear entry point. Whatever the eye lands on first is the hook: the biggest text or the most surprising thing in the picture.
- **1 frame carries 1 idea.** If the argument cannot land in 1 frame, it moves to the feed copy, a carousel or the landing page.
- **Statics are not only for buyers who are ready.** Native posts, advertorials and long-copy statics do the work for cold buyers when they are built for it.

## Non-negotiable rules

1. **1 ad, 1 claim, 1 buyer.** Every slot (picture, words on it, feed copy, button) makes the same argument to the same person at the same stage. A second argument is a second ad.
2. **A desire that already exists, in the buyer's own words,** not the pack's.
3. **Agitate the consequence, never the symptom.** The strongest form is the accommodation: what the buyer changed in their life to cope and never says out loud.
4. **Promise before mechanism. Proof bigger than the claim.**
5. **Specific beats adjective,** and every claim passes "so what?": a feature alone fails ("15% vitamin C", "2 mm steel"); what it changes in the buyer's day passes.
6. **Each element sells the next.** The picture sells the headline, the headline the feed copy, card 1 the swipe.
7. **Readable at thumb size.** 20 added words or fewer on the image. The headline is the biggest text and may be a whole sentence of up to about 12 words. Every line is a plain sentence, or a phrase a person really says, with its small words left in. When the space is small, say less: a smaller idea said whole, never a sentence squeezed.
8. **Facts come only from the brand.** Nothing invented: no review, rating, count, study, award, expert, deadline, stock level or offer term. An offer or a guarantee is in the brand's wording with every condition, or absent. A figure the brand states 2 ways is not used. A worked-out number ("63 cents a day") needs both inputs from the brand. Where a fact is missing, argue something the brand has and list the gap.
9. **A customer's words stay the customer's:** word for word, with the source, or not shown; never restated as the brand's promise.
10. **People.** A generated person is a fictional adult: never a customer, a founder or an expert, never beside a quote. No children: an ad for a children's product is written to the adult who buys it and shows the product on its own, laid out, or in an adult's hands. A real person appears only from their own uploaded photo.
11. **Never tell the viewer what they have** ("Is your skin dull?", "Struggling with your weight?"). Use the first person, "if you've...", or a scene.
12. **The product is the real product,** built from its own photos. It is shown open, held or in use only as the brand's facts say, and a visible result only where the brand records one (`Visible result`). Otherwise it is closed and at rest.
13. **Words on the picture are a choice.** The step says which are wanted: words on the image, feed copy, a copy of the picture without its words. Plan for what is asked (step 7).
14. **For a cold buyer, a post beats an ad.** Marketing language is what makes an ad look like an ad. A native format imitates no real platform, publication or person.
15. **Technical terms follow the stage.** Unaware and problem aware: none, not an ingredient, a material or a category term; say what the thing does in the buyer's own words. Solution aware: 1 or 2 at most, each followed by what it does for them. Product aware and most aware: the category's terms are welcome where this buyer compares products by them.
16. **An unaware ad's picture carries no headline.** A note, a list or a message in the picture keeps its words, typed the way a person types. The first sentence of the primary text never repeats the words on the image.

## Workflow

About 90% of an ad is decided before a word is written. Do the steps in order.

### Step 1: ground in research

Find the 5 things:

| Find | What it is | Best use in an image ad |
|---|---|---|
| The accommodation | What they changed in their life to cope | The scene, or the headline |
| The failed solution | What they tried first and why it failed | Comparison static, objection card |
| The nearly-didn't-buy | The last thing between them and buying | Guarantee badge, offer static |
| The word | Their noun for the problem | The headline |
| The moment | What made them start looking | The scene |

Reviews give the words (2 to 4 star reviews hold the objections). Return reasons give the failure modes: if refunds come from people who expected something the product does not do, no slot may imply it.

| Marketer says | Buyer says |
|---|---|
| Brightening antioxidant serum | I've got a shelf of half-used serums. |
| Superior non-stick performance | I keep 1 pan for eggs and nobody else is allowed to touch it. |
| Waterproof yet breathable | I keep a second jacket in the car in case it rains. |

### Step 2: place the buyer

Pick 1 awareness stage. It decides what leads.

| Stage | What leads | Archetypes that fit | Primary text |
|---|---|---|---|
| Unaware | Their situation. No headline on the picture; no product name, price or offer in the feed headline | Long-copy static, native post, advertorial | The long story of the problem. The product arrives in the last fifth |
| Problem aware | Their words for the problem, then the way out | Accommodation static, native post | The problem as they live it and what failed them. The product after two thirds |
| Solution aware | The difference, and what it changes in their day | Comparison, mechanism | What the other answers ask of them, how this differs, 1 proof |
| Product aware | Proof, or the last objection answered | Proof static, demo still | The 1 doubt answered, with proof bigger than the doubt |
| Most aware | The offer, exactly as the brand states it, and a true reason for now | Offer static, price truth bomb | The deal, said as a person would say it |

How many words the primary text runs is given with the request, by stage. It is never taken from this skill or from the length of the brand's own ads.

Market sophistication runs 1 to 5: a claim, a bigger claim, a mechanism nobody else has named, a better mechanism, identity. At 3 or above a bare promise is not enough.

### Step 3: audit the offer

An offer answers 5 questions: what do I get, what does it cost and against what, what if it doesn't work for me, why this week, what do I have to do. The ad answers the ones this buyer is asking.

**Price framing.** Every figure in a frame is the brand's own.

| Tactic | Weak | Strong |
|---|---|---|
| Against what they already spend | Was $89, now $69 | Less than the 2 serums you didn't finish |
| Per use | $38 a bottle | About 63 cents a morning (price and how long a bottle lasts, both from the brand) |
| Against the cost of the problem | Only $89 | A customer's own sum, quoted: "I was buying a new pan every 2 years" |
| Effort as the price | Free shipping over $50 | It takes 3 drops each morning, and nothing else. / You wipe it, oil it and hang it back up. |

Check the one-time against the subscription price and how to cancel, the price after a first-order discount, and the per-unit price of a bundle. A discount alone is a weak reason: pair it with why the product is worth it and a real end date, and say the sale price, not only the %.

**The guarantee** is quoted as the brand gives it. Of the true ways to say it, pick the most specific: "You have 60 days to send it back, even empty." beats "Money-back guarantee", if those are the terms. Never sharpen it into a promise of a result.

### Step 4: find the specific, unique claim

Cut what every competitor can say (premium quality, made with care, free shipping). Keep what is a proposition, unavailable to competitors, and would move a stranger. Then climb the ladder: a measured number, a named third party, a physical detail, a specific time, a proper noun. The specific is still said as a sentence, with what it changes for the buyer.

| Adjective | Specific |
|---|---|
| Fast absorbing | It's dry in 40 seconds, so you can dress straight away. |
| Handcrafted | 1 person spends 4 hours on every pair. |
| Built to last | It's 2 mm of bare steel, so there's no coating to wear off. |

### Step 5: pick the archetype

| Archetype | The picture | The words |
|---|---|---|
| Accommodation static | A real-life scene showing the workaround | Headline: the accommodation in their words |
| Native post (a note, a message, a plain post) | Something a person made. No logo, no brand colours | The note, list or message keeps its words, typed the way a person types, and its first line is the hook. No headline is added. The sell is in the feed copy. |
| Advertorial static | An article or list look | A question the page answers. Honest comparisons only. |
| Long-copy static | A plain photo a person could have taken | No headline on the picture. The story in the feed copy carries every beat. |
| Mechanism static | A close view of the material, ingredient or part that does the work | Headline: the promise. Subline: "because" and the mechanism. |
| Proof static | The product, with 1 piece of proof | A customer's words with the name the source gives, set as type: never dressed as a screenshot of a review site, never beside a face. A count or rating only from the brand's facts. |
| Comparison static | 2 columns: the usual kind of thing against this, never a named competitor | Facts the brand can support. Give the other side its due on 1 row. |
| Offer static | The product, the price framed, the guarantee | The offer in the brand's wording and a true reason for now |
| Price truth bomb | The product and 1 blunt line | "Yes, it's $89. Here's what that buys." Then up to 3 reasons. |
| Demo still | The product mid-use, as the brand's facts say it is used | Says what you are seeing |
| Sensory static | A very close view: texture, pour, weave, grain | 1 plain sentence, or none |
| Old way, new way | The thing the buyer used before, against this | Objects, never bodies. A real before and after of a person only from a real, consented upload, never for weight or a health condition. |

### Step 6: map the beats to the slots

| Slot | Usually carries | Limit |
|---|---|---|
| The picture | Hook, problem or proof | 1 subject, 1 entry point |
| On-image headline | Hook or promise | A plain sentence or a phrase a person says, up to about 12 words. None on an unaware ad |
| On-image subline | What makes it true, or proof | 1 sentence. Optional. |
| Badge | Risk reversal, offer, amount of proof | A label: a price, an amount, a guarantee term |
| Primary text, first sentence | The hook, continued | 125 characters or fewer. Earns "See more". Does not repeat the image headline. |
| Headline field | Promise, offer or proof | 40 characters or fewer |
| Description field | Extra detail | 30 characters or fewer, or empty. Never the only place the price, the guarantee or an offer term appears. |
| Button | The action | Shop now, Learn more, Get offer, Order now or Sign up |

### Step 7: write the hook and the words on the image

First read which word slots the step wants.

- **No words on the image:** the picture makes the argument alone (the accommodation, the demonstration or the comparison, readable with nothing written on it), the layout says where clean space is left for a designer, and the hook moves to the first sentence of the feed copy.
- **No feed copy:** the image carries the claim and the next step: a 2 to 4 word call to action is among its words.
- **A copy without words is wanted:** the same picture is made again with its added words lifted off. So the words sit in clear space or on a panel, never across the product, a face or the busiest part of the scene. A native post, where the words are the picture, has no such copy.

Then:

- **The most specific detail does 3 jobs:** it picks the buyer, it proves, and it casts the scene. Put it in the headline.
- **Pre-qualify with the problem, not a label.** "If you've got a shelf of half-used serums" beats "Women over 35, listen up".
- **Only added words are written.** The product carries its own printing and the logo.
- **Large enough to read on a phone,** in reserved space. A line that does not fit is replaced by a smaller idea, never squeezed. In 9:16 nothing sits in the top 14%, the bottom 35% or 6% at each side.

| Hook type | Example |
|---|---|
| Accommodation | You keep 1 pan for eggs. Nobody else may touch it. |
| Moment | It went orange before you were halfway down the bottle. |
| Contrarian | You can stop being so careful with your pan. |
| Curiosity gap | Why does vitamin C turn orange on your shelf? |
| Specific proof | A number the brand can prove, or a customer's words with their source |
| Truth bomb | Yes, it's $89. Here's what that buys. |

### Step 8: write the primary text

The feed copy is where a static does most of its selling. How long the primary text runs is given with the request, by the buyer's stage. The brand's own ads show its tone and its words, not how long this one runs.

- **A buyer who knows the product** is told the deal or has 1 doubt answered: what they get, what it costs, the proof, the guarantee as the brand words it, 1 action and a true reason for now.
- **A buyer who is comparing** is told what the other answers ask of them, how this one differs and what that changes in their day, with 1 proof they can check.
- **A buyer who does not know the problem, or only feels it,** is told the story of it: 1 person, a real moment, what they tried and what each fix cost, what goes on happening if nothing changes, then the cause said plainly, and only then the product as how the story ends. The first sentence earns "See more".

More length is more that happens, never the same point said again. Story copy runs in paragraphs of 2 to 5 whole sentences, joined by "and", "but", "so" and "because", with no rows of 1-line paragraphs. A first-person story is a real customer's or the founder's own, from the brand's material. If it did not happen, it is not written as testimony.

### Step 9: write headlines, description and button

- **Headline field:** the number the step asks for, each a different way in to the same claim (promise, offer, proof), each making sense beside any primary text. "Vitamin C you'll finish before it turns" beats "Transform your routine".
- **Button:** cold education suits "Learn more"; an offer suits "Shop now" or "Get offer".

### Step 10: describe the picture and the layout

Say what a camera would see, then where the type sits. A later step writes the image model's prompt from this; do not write prompt language.

- **The scene:** where the product is, the surface and background, the light, the camera angle, 3 to 6 props from the product's real use, any person (a fictional adult, described neutrally). The place comes from the brand's world and the buyer's moment, not from a stock idea of the category.
- **The product in use:** say the whole action as the brand's facts give it (which part, where it opens or fastens, what comes out or moves, which hand holds what).
- **The layout:** zones of the frame in reading order, with rough proportions, and where the empty space is.

### Step 11: self-audit

Count characters and words exactly. Trace every number to the brand's facts or the research. Say a check was done only if it was. Then:

- [ ] Every line is one a person would say aloud to a friend, and a stranger would understand it alone
- [ ] 1 buyer, 1 stage, 1 claim, and every slot agrees; the archetype fits the stage; no technical term above solution aware
- [ ] The headline uses the buyer's word; the problem is an accommodation or a consequence, not a list of symptoms
- [ ] Promise before mechanism; every feature passes "so what?"; proof is real and sourced
- [ ] Offer and guarantee are in the brand's wording, with their conditions
- [ ] Every limit in step 6 is met, and the word slots match what was asked for
- [ ] Rules 8 to 12 hold: nothing invented, no customer's words as the brand's, no generated person as a real one, no child, no viewer told what they have, the product as its photos and facts show it
- [ ] It uses this brand's words and tone, to this buyer

## Carousels

A carousel is a script in cards. **Card 1 sells the swipe to card 2**, the way line 1 sells line 2. `script-format-carousel` holds the format rules; where they differ, it wins.

- The step gives the number of cards. Card 1 is the hook and has to work alone: many people see only it.
- 1 idea per card, said in 1 or 2 plain sentences.
- A visual thread across the cards (the same layout, colours, framing and product) so it reads as 1 thing.
- The product arrives late for a cold buyer: seen from the mechanism card, named on the offer card.
- **The last card says the action in words** ("Tap Shop now to get yours by Friday", with a real date), plus the offer and guarantee, in 20 words or fewer.
- The primary text carries the hook and a short version of the argument, for people who never swipe.

| Structure | Best stage | Card flow |
|---|---|---|
| Story | Problem aware | The accommodation → the moment → what I didn't know (mechanism) → what I tried (objection) → what changed (proof) → the offer and guarantee |
| Myth-busting | Solution aware | The contrarian line → myth and truth pairs → the mechanism → the product and offer |
| Failed solutions | Solution aware | "You've probably tried..." → each one and why it fell short → what works and why → offer |
| How it works | Solution to product aware | The promise → 1 card per step, part or ingredient, each with its job → proof → offer |
| Proof stack | Product aware | The boldest real quote → more real quotes, each answering 1 objection → guarantee and action |
| What to expect | Product aware | Time points the brand can support (first use, week 2, month 3; or first cook, tenth cook, year 1) → offer |
| Before you buy | Product to most aware | 1 card per objection from research → guarantee → action |
| Range or bundle | Most aware | The bundle's value → 1 card per item with its job → the framed price → action |

## Variants

From 1 concept, make more ads by changing 1 thing at a time: the headline on the same picture (the cheapest new ad); the picture with the same words; the archetype; the way the primary text opens; the buyer. Say what each variant tests and what to make next if it wins. Warn when 2 variants are near-identical: the platform groups look-alike ads and shows them to the same people, so they add little reach.

## Output format

In the app, return exactly the shape the step gives. By hand:

```
## Ad [n]: [short name]
Concept: [buyer] × [angle] × [offer]
Awareness: [stage] · Sophistication: [1 to 5] · Archetype: [..] · Ratios: [..]

### Picture and layout
- Scene: ... · Layout: ... · Look: ... · Photos needed: ...

### On-image text (or "none: [why]")
- Headline: ... · Subline: ... · Badge: ...

### Primary text
### Headline options (character count)
1 ... (31) 2 ... (38) 3 ... (27)
Description: ... · Button: ...

### Evidence and flags
- Evidence used: ... · Missing: ... · To check before launch: ...
```

For a carousel, replace "On-image text" with a table: `| Card | Beat | Picture | On-card text | Words |`.

## Worked examples

Both brands are made up. Nothing here is a fact about a real product.

**A consumable.** A vitamin C serum, 30 ml, $38, in an amber glass dropper bottle. Research: buyers own "a shelf of half-used serums"; the last one "went orange before I finished it". The brand's facts: made in small batches, the batch date printed on the base; 60-day returns, "even empty".

- **Buyer and stage:** has given up on vitamin C. Problem aware. Accommodation static.
- **Picture:** a bathroom shelf in morning light, 4 unbranded dropper bottles at different levels pushed to the back, the real bottle at the front, closed. No person.
- **On-image:** headline "I had a shelf of half-used serums." Subline "This one has its batch date on the base." (16 words)
- **Primary text:** the length given for a problem aware buyer. It opens "The last one went orange before I was halfway down the bottle." and tells what she tried and what each one cost her before the batch date comes in.
- **Headline field:** 1. Vitamin C with its date on the base 2. 60 days to send it back, even empty 3. It's made in small batches
- **Button:** Learn more

**A durable.** A carbon steel pan, 26 cm, $89, sold bare with a card sleeve. Research: "I keep 1 pan for eggs"; a review, "Eggs slide. I didn't believe it either." (Dan R.). The brand's facts: 2 mm steel, no coating; re-seasoned free for life.

- **Carousel, failed solutions, solution aware, 5 cards:**

| Card | Beat | On-card text |
|---|---|---|
| 1 | Hook | You keep 1 pan for eggs. Here's why it never lasts. |
| 2 | Objection | A coating is a layer, and every layer wears off. |
| 3 | Mechanism | This one has no coating. It's 2 mm of steel, seasoned with oil. |
| 4 | Proof | "Eggs slide. I didn't believe it either." Dan R. |
| 5 | Offer and risk reversal | It's $89, and we re-season it free for life. Tap Shop now. |

Card 1 opens a gap only the swipe closes. The quote on card 4 is the customer's claim, not the brand's. The pan is named on card 5.

## What this reads from the brand brain

A blank field is asked for, or the ad is marked `inferred`. It is never filled by guessing.

- `customer-avatars.md`: Customer language bank; per avatar Grounded in, What almost stops them, How to talk to this person, The moment. For the headline's words, the objection, the scene.
- `products-and-positioning.md`: per product Price, Key features, Core benefit, Positioning angle, Looks like, Pack, How it is used, Visible result, Never show; Bundles and offers. For the mechanism, the offer, and what the picture may show.
- `brand-guidelines.md`: Brand voice and tone, Unique selling propositions, Brand guardrails, Brand world. For wording, the claim, the place.
- `brain.md`: Market awareness level, Market sophistication, What to avoid. For the stage and the archetype.
- `brand.json`, `offers.json`, `personas.json`, `lessons.json`: every fact, and every past mistake not to repeat.
