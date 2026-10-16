---
name: image-ad-copywriter
description: Write copy and visual briefs for static image ads and carousels for e-commerce and DTC brands on Meta and Instagram, from a brand brief, ICP, product details or a reference ad, with no customer research needed. Produces on-image text, primary text, headlines, descriptions, CTA buttons, designer briefs and image-model prompts for single images, native-style posts, advertorials, long-copy statics, comparison, offer and sale ads, and multi-card carousels. Use whenever someone asks for a static ad, image ad, carousel, ad creative concepts, ad headlines or primary text, a sale or launch ad, or "an ad like this one", even if they only describe the product and audience.
---

# Image ad copywriter

> Superseded inside the app by `image-ad-copy`, which was built from this skill and is the one the planning steps are sent. No step is sent this file. It is kept as the by-hand method for a brand with no customer research yet. Where the 2 differ, `image-ad-copy` is right.

Write static image ads and carousels that sell, working from what a brand already knows: the product, the offer, the brand voice, the ideal customer (ICP) and sometimes a reference ad. No reviews, tickets or call recordings are needed.

Without customer research, every ad is a **hypothesis about the customer**. So you model the customer carefully, write in their likely words, mark what you assumed, and give the brand distinct angles to test. Image ads are cheap to make, which makes them the best way to test angles fast.

## Pick the mode

| Request | Mode | What to do |
|---|---|---|
| "5 headlines", "punch up this primary text", "1 more overlay" | Quick | Steps 1 and 6 only. Return the lines with exact character counts. |
| "Make an ad" | Full | All steps. 1 ad with variants. |
| "Make a few ads" or no angle given | Angle test | All steps. 3 ads on 3 different angles and ad types. |
| "Make something like this ad" | Reference remix | Step 2 first, then the full workflow. |
| "Make a carousel" | Carousel | All steps, plus the carousel section. |
| "Sale", "Black Friday", "launch offer" | Offer | Full workflow, leaning on the offer and sale archetypes. |

## Inputs

Use what the user gives. Ask only if the product itself is unclear. Otherwise assume sensibly and list assumptions at the top.

| Input | Used for |
|---|---|
| Product: what it is, how it works, materials or ingredients, how it's used | Mechanism, visual |
| Price, offer, bundle, guarantee, deadline | Offer, badges, CTA |
| Claims allowed and not allowed | Compliance |
| Proof the brand has (review count, press, awards, certifications) | Proof slots |
| ICP: who buys, their situation, what they want | Customer model |
| Brand voice, colours, fonts, look | Copy and design brief |
| Reference ad(s) | Structure to borrow |
| Available images (packshots, lifestyle, UGC frames) | Design brief |
| Placement (feed, stories, reels) | Aspect ratios |

**Facts must come from the user.** Do not make up reviews, review screenshots, star ratings, customer counts, percentages, study results, awards, press logos, "as seen in" badges, doctor endorsements or before and after images. Fake proof breaks Meta's ad policies and consumer law, and it is the fastest way to get an ad account restricted. When a slot needs proof you don't have, use a placeholder such as `[REVIEW_COUNT]` or `[REAL_REVIEW_QUOTE]` and list it at the end.

This includes small specifics that read as fact: "since July", "$800 on a desk", "after 3 weeks". Keep them general or put them in brackets for the brand to confirm. Don't invent offer terms either (free replacements, extra gifts, longer trials) beyond what the brief says.

Comparisons need support too. "Cheap mats curl at the corners" claims something about other products. Use it only if the brief supports it, otherwise flag it.

The line to draw: 2nd person observations about the viewer's likely life are the whole point of an accommodation ("You stand on 1 leg by mid-afternoon"). Stated facts about a real person, the product or "most people" are claims, and claims need the brief behind them.

**Derived numbers need a stated basis.** "About 25 cents a night" is fine when the brand gives both the price and how long the product lasts. A warranty period is not a lifespan, and "workdays per year" is your assumption, not the brand's. If the basis isn't in the brief, put the line in the "to check" list for approval instead of on the image.

## How image ads work

- **The eye decides the order.** Give the image 1 clear entry point. The first thing seen is the hook.
- **No sound.** Every word is read, so every word must earn its place.
- **1 image, 1 claim.** If the idea can't land in 1 frame, move the argument into the primary text, a carousel or a landing page.
- **The 9 beats still apply**, spread across the image, on-image text, primary text, headline, description, button and landing page.
- **Statics can sell to cold audiences.** Native-looking posts, advertorials and long-copy statics do top-of-funnel work when they're built for it.

## Workflow

### Step 1: build the customer model

This replaces customer research. Think like the ICP before writing, and write the model down as hypotheses:

| Hypothesis | Question | Example (linen sheets buyer) |
|---|---|---|
| Desire | What did they already want before any ad? | To sleep cool and wake up rested |
| Problem in their words | How would they say it to a friend? | "I wake up sweaty at 3am" |
| Accommodation | What have they changed in their life to cope? | Sleeps with 1 leg out of the doona. Fan on all year. |
| Failed solutions | What did they try first? | "Cooling" microfibre sheets that pill in a month |
| Trigger moment | What makes them look for a fix? | A heatwave week of bad sleep |
| Objections | Why wouldn't they buy? | Price, linen feels scratchy, wrinkles |
| Their words | What do they call things? | "sheets", "too hot", "sticky" |

The **accommodation** matters most. It's the workaround people never say out loud, so naming it makes a viewer feel seen. "You sleep with 1 leg out of the doona" stops a scroll. "Stay cool at night" doesn't. The same holds in any category: for a serum, "a shelf of half-used bottles"; for a pan, "the 1 pan nobody else is allowed to use".

Mark it as `Assumed customer model` in the output so the brand can replace guesses with real customer language later.

### Step 2: deconstruct the reference ad (if given)

Borrow the structure, never the words or the look. A competitor's ad works for their brand, audience and proof. Copying its lines or design gives you none of that and invites legal trouble.

Break the reference down:

1. What type of ad is it? (See the archetypes in step 4.)
2. Where does the eye land first? What does each text element do?
3. Which beats does it carry on the image, and which in the copy?
4. What makes it feel native rather than like an ad?
5. How does the product appear, and when?

Then build your ad on the same skeleton with your product, your customer model, new words and your own brand look. Generic native formats (a notes-app screenshot, a tweet, a text thread) are fair to reuse. The reference's specific design and its distinctive lines are not, and a close paraphrase ("Things I wish someone told me" to "Things nobody tells you") still reads as a copy. Share no phrase of 6 or more words with it. Show the breakdown as a short table before your ad.

### Step 3: place the buyer

Pick 1 stage of awareness. It decides the ad type and how long the copy runs.

| Stage | They know | Ad types that fit | Primary text |
|---|---|---|---|
| Unaware | Nothing about the problem | Native post, advertorial, long-copy static, educational carousel | Long |
| Problem aware | The problem, not the fixes | Accommodation static, native post, story carousel | Medium to long |
| Solution aware | Fixes exist | Comparison, mechanism static, myth-busting carousel | Medium |
| Product aware | Your product exists | Proof static, objection carousel, demo still | Short to medium |
| Most aware | Nearly ready, stuck on price | Offer static, sale static, price truth bomb | Short |

In crowded categories, plain claims ("the softest sheets") don't land. Lead with a **mechanism** (why it works differently) and an **identity** (who the buyer becomes).

### Step 4: shape the offer, angle and ad type

**Offer.** Check what the brand actually has: the thing, the price, the guarantee, a reason to buy now, the effort. Frame the price:

| Tactic | Weak | Strong |
|---|---|---|
| Against the alternative | Was $220, now $180 | Less than 2 sets of "cooling" sheets |
| Per night or per use | $180 a set | About 25 cents a night for 2 years |
| Against the cost of the problem | Only $180 | What's a week of bad sleep costing you? |
| Effort as the price | Free shipping | Wash, dry, done. No ironing. |

A guarantee sells when it's specific and matched to the product. "Sleep on them for 100 nights. Send them back used if you don't love them." beats "30-day returns."

**Sale ads.** A discount alone is a weak reason. Say the sale price, not just the %. Pair it with a reason the product is worth it and a real end date. Only claim "lowest price ever" or show a "was" price if the brand confirms it's true.

**Angles.** When the user hasn't fixed one, write 3 ads that differ in the argument and the ad type, not just the wording.

**Specificity.** Replace adjectives with facts from the brief: numbers, materials, places, times, processes. "Stonewashed French flax" beats "premium linen", as "the batch date is printed on the base" beats "fresh formula". Cut claims any competitor could make ("high quality", "free shipping", "family owned") unless buyers care.

**Ad types:**

| Type | Best stage | Layout | Copy approach |
|---|---|---|---|
| Accommodation | Problem aware | A real-life scene showing the workaround | Overlay names the accommodation. Primary text takes it from problem to offer. |
| Native post (tweet, notes app, text thread, Reddit-style post) | Unaware to problem aware | Looks like organic content, little or no branding on the image | The post teaches or confesses. The sell is in the primary text. |
| Advertorial | Unaware to solution aware | Article or listicle look | Needs a click-through to an educational page or long primary text. Only honest comparisons. |
| Long-copy static | Unaware, strong with older audiences | Plain native photo, long story in the primary text | Write the primary text like a full video script. |
| Mechanism | Solution aware | Close-up or simple diagram of the material, ingredient or process | Overlay: the promise. Subline: why it works. |
| Comparison | Solution aware | 2 columns: the usual fix vs this | Facts only. Don't name a competitor brand. |
| Proof | Product aware | Real review, real photo, review count | Only with real proof from the brief |
| Demo still | Product aware | The product mid-use, result visible | Overlay: what you're seeing |
| Offer or sale | Most aware | Packshot, framed price, guarantee badge, deadline | Price framed, reason for now |
| Price truth bomb | Product to most aware, higher price | Product plus a blunt price line | "Yes, it's $X. Here's why people still buy it." Then 3 reasons. |
| Sensory | Problem to product aware | Extreme close-up of texture or detail | Very short overlay, or none |

Before and after images are strong proof but risky. Use them only if the brand has real, consented images, and check the platform's rules for the category. A generated before and after of a person is fake proof; show the old way against the new one as objects.

### Step 5: map the beats to the slots

| Slot | Usually carries | Limit |
|---|---|---|
| Image | Hook, problem or proof | 1 subject, 1 entry point |
| On-image headline | Hook or promise | 10 words or fewer. The biggest text. |
| On-image subline | Mechanism or proof | About 12 words. Optional. |
| Badge | Offer, guarantee or deadline | 2 to 5 words |
| Primary text, first line | Hook continuation | About 125 characters show before "See more". This line must earn the tap. |
| Primary text, body | Problem, mechanism, objection, proof, offer, guarantee, CTA | Short: 2 to 4 lines. Long: as long as the story needs. |
| Headline field (under the image) | Promise or offer | 40 characters or fewer |
| Description field | Extra detail | 30 characters or fewer. Not shown in every placement, so never the only place the price, the guarantee or an offer term appears. |
| CTA button | The action | Shop now, Learn more, Get offer, Order now, Sign up |
| Landing page top | The same claim | Should repeat the ad's promise |

**Everything agrees.** Image, overlay, primary text, headline and landing page all carry the same 1 claim. A luxury photo with a "70% OFF" overlay and a science headline confuses the buyer and the ad platform's targeting.

### Step 6: write the words

**On-image text.**

- Write 3 overlay variants per image (more if asked). Overlay swaps are the cheapest new ads you can make.
- Native posts (notes app, tweet, text thread) can carry more text than a headline, but keep the whole post to 25 words or fewer and make its first line do the hook's job.
- Use the customer's words from step 1. Name the problem, not a demographic: "If you sleep with 1 leg out" beats "Hot sleepers, listen up."
- Make it feel like content, not an ad, for cold audiences. A centred logo with a tagline reads as an ad and gets skipped.
- Large, high contrast, readable at thumb size. 20 words or fewer on the whole image.

**Primary text.**

Short version (2 to 4 lines) for warmer audiences: hook continuation, promise plus mechanism, offer or proof, guarantee plus CTA.

Long version only for unaware and problem-aware ads, written like a script on the page:

1. A first line that earns "See more"
2. Problem: escalate to 1 consequence. Don't list symptoms. Don't solve it yet.
3. Promise, then the mechanism: feature, which means benefit, which is why
4. The objection or failed solution, handled
5. Real proof, or a placeholder
6. Offer with a framed price and the effort involved
7. Guarantee
8. CTA: action, what happens next, a real reason for now
9. Close on identity, tied to something the product really does

Name the product late, after the mechanism. 1 to 2 sentences per paragraph. Contractions. Grade 7 reading level. Vary sentence length. Emojis only if the brand uses them. No em dashes, no "it's not X, it's Y" chains, no "game-changer" or "elevate".

**Headlines.** 3 options, each a different angle on the same claim (promise, offer, proof). Plain and specific. "Sheets that stay cool at 3am" beats "Transform your sleep."

**Description.** Extra detail, or empty. The guarantee and the deadline also appear in the primary text.

**CTA button.** "Learn more" for educational cold ads. "Shop now" or "Get offer" for offer ads.

### Step 7: write the design brief

Give a designer or image model everything they need:

- Aspect ratios: 4:5 for feed and 9:16 for stories and reels. Keep text out of the top 14%, the bottom 35% and 6% at each side of 9:16 versions, where the app's buttons sit.
- Image: subject, setting, light, who's in it (a fictional adult from the ICP's world, never shown as a customer, a founder or an expert; no children), what's in hand, the mood. The product is the real one, from its photos.
- Layout: where each text element sits, and which is biggest.
- Exact on-image copy, so the designer doesn't rewrite it.
- Look: native or branded, fonts and colours from the brief.
- Assets needed: packshots, real photos, real reviews.
- Don'ts: anything that makes it look like an ad to a cold audience, any claim the brief rules out.

If an image model will make the picture, the prompt is written with `image-prompt-craft`: the real product photos attached and named, the exact words in quotes with where they sit, or no words at all if a designer will set the type.

### Step 8: self-audit

Count characters and words exactly, with code if you can run it, and report those numbers. Character limits are hard limits in the ad manager, and estimates drift. Then list every number in the copy and trace each one to the brief. Only state that something was checked (numbers, overlap, compliance) if you actually checked it. If a check was a judgement call, say so.

- [ ] Awareness stage stated. Customer model shown and marked as assumed.
- [ ] The ad type fits the stage
- [ ] 1 claim, and every slot agrees on it
- [ ] 1 clear entry point. On-image headline is 10 words or fewer. Native post text is 25 words or fewer. Final carousel card is 20 words or fewer.
- [ ] Customer's words used. The problem is an accommodation or consequence, not a symptom list.
- [ ] Promise before mechanism. Mechanism uses real product facts.
- [ ] Proof is real or a flagged placeholder
- [ ] Price framed, effort stated, guarantee specific (if the brand has one)
- [ ] First line of primary text earns "See more"
- [ ] Every headline-field option is 40 characters or fewer
- [ ] CTA button matches the intent
- [ ] Aspect ratios and safe zones in the brief
- [ ] Every number traced to the brief, and derived numbers have a stated basis. No invented reviews, logos, images, offer terms or small specifics. No claim the brief rules out.
- [ ] Reference remix shares no distinctive 6+ word phrase with the reference
- [ ] Contractions, varied sentences, no AI tells, brand voice matched

## Carousels

A carousel is a script in cards. **Card 1 must make swiping feel necessary**, and each card should make the next one necessary, the same way each line of a script sells the next line.

- 3 to 10 cards. 5 to 7 is typical.
- 1 idea per card, 12 words or fewer of on-card text.
- Keep a visual thread (same layout, colour, character) so it reads as 1 story.
- Card 1 is the hook. For cold audiences, don't name the brand or product on card 1.
- Name the product on a later card, after the mechanism.
- **The last card carries on-card CTA text** ("Tap Shop now to get yours by Friday"), plus the offer and guarantee, in 20 words or fewer. The shared CTA button alone is easy to miss on the final swipe, and a crowded last card hides the CTA.
- Primary text carries the hook and a short version of the argument, for people who never swipe.

| Structure | Best stage | Card flow |
|---|---|---|
| Story | Problem aware | Accommodation → trigger moment → what I learned (mechanism) → what I tried (objection) → what changed → offer + CTA |
| Myth-busting | Solution aware | Contrarian claim → myth and truth pairs → mechanism → product + offer + CTA |
| Failed fixes | Solution aware | "You've probably tried..." → each fix and why it falls short → what works → offer + CTA |
| How it works | Solution to product aware | Promise → 1 card per mechanism step → proof → offer + CTA |
| What to expect | Product aware | Day 1 → week 2 → month 3 (only what the product reliably does) → offer + CTA |
| Before you buy | Product to most aware | 1 card per likely objection → guarantee → CTA |
| Bundle | Most aware | Bundle value → 1 card per item → framed price → CTA |

## Output format

Lead with the ads. Put the customer model once at the end (not per ad), and keep the "to fill or check" list to the few items that matter. Busy marketers skim, so a tight output gets used.

```
## Ad [n]: [name]
Mode: [..] · Type: [..] · Awareness: [..] · Placements: 4:5, 9:16
Concept: [persona] × [angle] × [offer]

Reference breakdown (remix only, before the first ad): table of element → job → what we borrow

### Design brief
- Image: .. · Layout: .. · Look: .. · Assets needed: ..
- Image prompt (optional): ..

### On-image text
- Headline: .. · Subline: .. · Badge: ..
- Overlay variants: 1 .. 2 .. 3 ..

### Primary text (short)
### Primary text (long)

### Headline field options (character count)
1 .. (31) · 2 .. (38) · 3 .. (27)

Description: .. · CTA button: ..

### To fill or check
- Placeholders: .. · Compliance notes: ..
```

After the last ad:

```
### Assumed customer model
1 line each: desire, accommodation, failed fixes, trigger, objections, their words
```

For carousels, replace "On-image text" with:

```
| Card | Beat | Visual | On-card text | Words |
```

When a calling app needs JSON, return:

```json
{"type":"static|carousel","mode":"","ad_type":"","awareness_stage":"","placements":["4:5","9:16"],
 "concept":{"persona":"","angle":"","offer":""},
 "assumed_customer_model":{"desire":"","accommodation":"","failed_solutions":[],"trigger":"","objections":[],"their_words":[]},
 "design_brief":{"image":"","layout":"","look":"","assets_needed":[],"image_prompt":""},
 "on_image":{"headline":"","subline":"","badge":"","overlay_variants":[]},
 "cards":[{"n":1,"beat":"","visual":"","text":""}],
 "primary_text":{"short":"","long":""},
 "headlines":[{"text":"","chars":0}],"description":"","cta_button":"",
 "placeholders":[],"assumptions":[],"compliance_notes":[]}
```

## Example

Brief: Saltmarsh, a fictional linen sheet brand. Stonewashed French flax. $180 a queen set. 100-night trial. ICP: couples 30 to 45 in warm Australian cities. Voice: calm, warm. 1 static for cold traffic. Problem aware.

Assumed customer model: wants cool, unbroken sleep; sleeps with 1 leg out of the doona; tried "cooling" microfibre sheets; trigger is a hot week of bad sleep; objections are price and scratchy linen; says "too hot", "sticky".

- **Type:** accommodation static
- **Image:** a bed from above at dawn, rumpled sheets, 1 bare leg out from under the doona, soft natural light. No logo on the image.
- **On-image headline:** You sleep with 1 leg out of the doona.
- **Subline:** Your sheets are the reason.
- **Primary text (short):**
  > You sleep with 1 leg out of the doona. Most sheets trap heat against your skin.
  > Stonewashed French flax lets it escape, so you stay cool till morning, without the scratch of new linen.
  > Sleep on them for 100 nights. Don't love them? Send them back.
- **Headline field:** 1. Sheets that stay cool at 3am (28) 2. Try them for 100 nights (23) 3. Linen, already softened (23)
- **Description:** 100-night trial
- **CTA button:** Learn more
- **Placeholders:** none. No reviews or numbers were invented. "Lets heat escape" is a common linen claim the brand should confirm.

## What this reads from the brand brain

By hand it works from a brief. Where a brand brain exists it reads: `products-and-positioning.md` (per product: What it is, Key features, Price, Who buys it; Bundles and offers), `brand-guidelines.md` (Brand voice and tone, Visual identity, Brand guardrails, Target audience summary), and `brand.json` (claims, forbidden claims, proof assets, guarantee). It reads no customer research: `customer-avatars.md` is what its assumed customer model stands in for, and every assumption is marked so it can be replaced. A blank fact is a bracketed placeholder for the brand to fill, never a guess.
