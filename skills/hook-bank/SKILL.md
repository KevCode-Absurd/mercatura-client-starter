---
name: hook-bank
title: Hook Bank
description: Ways to open an ad. Who to name in the first 3 seconds, worked out from the buyer's own record (their pain, their moment, how they see themselves, what they want); the 5 founder hooks with their timed beats and what each needs to be true; and a bank of 135 opener shapes tagged by kind, awareness stage, occasion and niche, each marked when it needs a real person or real proof. How a shape is used (a way in, never a line to fill), how many hooks a body gets, and how a hook is tested.
---

# The hook bank

Written for this app from the playbook's hook pages: "15 Avatar Hooks", "The Perfect Meta Ad Structure (Avatar Hook Method)", "5 Buyer Segments", "The Founder Hook Framework", "10 Viral UGC Hooks in One Afternoon", "The Ad Creative Checklist", and the hook idea lists of "Ecommerce Brand Content Ideas & Tests" (all under `docs/ecommerce-playbook/`). The bank itself is `bank.json` beside this file; the code is `src/lib/hooks/`.

In the app: a script's page has **From the hook bank** under its hooks, closed until opened; **Write more hooks** is sent the same list; a founder brief is written with the 5 founder hooks; and "/" → Hook Bank in the chat reads the bank out for the buyer and stage named.

## 1. Name the buyer in the first 3 seconds

The opening of an ad is also its targeting: who stops is who the platform goes and finds more of. So the first 0 to 3 seconds say who this is for. On-screen words land in under 2 seconds.

The app works out who an ad can name from the buyer's own record, and makes nothing up where a field is empty:

| Name them by | Read from |
|---|---|
| What they live with | The persona's problem |
| The moment they are in | What makes them buy now (the trigger) |
| How they see themselves | The persona's identity, else its summary |
| What they want instead | The persona's want |

Two rules sit on every callout:

- **What they do, not who they are on paper.** "If your coffee order is a double shot before nine" beats "if you are a busy professional" every time. The playbook's own list has demographic callouts ("Moms over 35..."); they are in the bank, and the behaviour is still the stronger line.
- **No "you" statement about a health condition.** "Why your partner ended up on the couch", not "Do you snore?". Platforms flag the second.

The ad that follows a callout, at 45 seconds: the hook (0 to 3 s, the callout and something that interrupts the scroll), the problem (3 to 10), the product as the answer (10 to 25), proof (25 to 35), the call to action (35 to 45). Proof is real proof; urgency is a real deadline or it is left out. The app writes scripts on principles by stage, not on a fixed order of beats: this is one shape an ad can take, not a rule.

## 2. The 5 founder hooks

Every founder story can open on 1 of these. A real founder films them: the app never generates a founder. Each needs something to be true, and a fact the brand's material does not hold is a prompt for the founder to answer on camera.

| Hook | The line | The video, in seconds | When | It needs |
|---|---|---|---|---|
| The frustration origin | "I was sick of [problem] so I built [product]." | Frustration 5, what you tried 10, the moment you decided 5, what makes yours different 15, call to action 5 (40) | The founder was a customer first. The most common and the strongest | The real years, spend and job |
| The credential | "I've [credential] and here's what most people get wrong about [category]." | Credential 3, what the trade knows 10, what is wrong with what is sold 10, how yours differs 15, call to action 5 (43) | Only with a background that bears on the product | A real, checkable credential |
| Against the grain | "Everyone in [industry] does [common practice]. We do the exact opposite." | The norm 3, "we do the opposite" 3, why the norm is wrong 15, your way 15, call to action 5 (41) | The brand truly does something different | The practice is true; a kind of product, never a named one |
| The hard moment | "I almost shut down the company in [year]. Here's what saved it." | The low point 5, what went wrong 10, what turned it 10, where it is now 10, call to action 5 (40) | There is a true low point | The real event, year and numbers |
| The process, shown | "Here's exactly how we make [product]." | "Most brands hide this" 3, behind the scenes 15, why it matters 10, what it means for quality 10, call to action 5 (43) | The making can be filmed | Real footage of the real place |

**Filming.** Film the body once, then 10 different hooks for it: the same video with 10 openings. Film each hook 5 ways; the first take is never the best. Look at the lens. Speak a fifth faster than feels natural. Under 60 seconds; 30 to 45 is the sweet spot.

**Testing, as the playbook gives it** (the app changes nothing in an ad account): 1 video for each of the 5 types in 1 campaign at $20 to $30 a day each for 5 days; read the hook rate (3-second views over impressions), the hold rate (ThruPlays over 3-second views), the click rate and the cost per purchase; take the best hook rate at an acceptable cost; film 5 versions of that type; do it again every 2 to 3 weeks.

## 3. The opener bank

`bank.json` holds 135 openers from the playbook's lists. Each has:

- **type**: names who they are, names the pain, names how they see themselves, names the moment, a doubter turned, the founder speaks, opens a question, goes against the usual, leads with a number, asks, states the offer, for a gift, for a season, other;
- **stage**: the awareness stage it suits, or none (any);
- **occasion**: gifting, sale or a season, or none;
- **niche**: skincare, supplements, apparel, pets, fitness, or none (any);
- **needs**: `real_person` when it is said in a founder's, a customer's or an expert's own voice, and `real_proof` when it states a number, a count or a result.

How the app picks: the stage's own shapes first, then those for any stage; an occasion's shapes only when the ad is for that occasion (its offer or notes say gift or sale, or the date is in a gifting season: November 15 to December 24 and the 2 weeks before Valentine's, Mother's and Father's Day); a niche's only for a brand in it; one of each kind before a second of any. A script is dealt 3 of them by its own number, so 2 scripts made one after the other are offered different shapes, and a script is offered the same 3 each time it is read.

**A shape is a way in, never a line to fill.** The writer uses one only where the ad can hold it, says it wholly in the buyer's own words, and puts nothing in a blank that the ad does not state. A line that could open an ad for any brand in the category is written again.

**Who may say what.**

- A `real_person` line is offered only for a brief a real founder or creator films, or an ad built on a real customer's words. An ad a generated presenter would say is never given "I didn't believe it until I tried this": that is a testimonial nobody gave.
- A `real_proof` line is shown to a person browsing the bank, marked, and is not handed to the hook writer, which states no fact the ad does not.

**Left out of the bank.** 9 lines that sell by hype ("the secret hack they don't want you to know", "STOP SCROLLING", "you won't believe"), the lines written for the agency's own audience of brand owners, lines tied to a year or a platform, and worked examples that state a claim about a category or a medical figure.

## 4. Writing the line

- A spoken hook is something a person would say to 1 friend in 1 breath. The app's hook writer holds it to 15 words where it can and never over 22; the playbook's own range for a generated presenter is 15 to 25 words, 5 to 8 seconds.
- No offer and no call to action in a hook for a cold buyer; no feature list in the first 15 seconds. For a buyer who is ready, the price and the deal are clear in the first few seconds.
- Words to cut wherever they appear: really, very, just, actually, unique, amazing, incredible, high-quality, game-changing. Put a number the brand holds in its place, or a customer's words, or nothing.
- Read it aloud. If it sounds like a brand, write it like a person.

## 5. How many, and what to test

- 10 hooks for 1 proven body is the playbook's batch; the app keeps up to 5 hooks on a script, each with the same body, each its own ad.
- No 2 hooks of a batch pull the same lever: 10 hooks that open the same way are 1 hook tested 10 times.
- Change only the first 3 seconds: the same body, offer, budget and audience. Read it on day 3.
- The targets the playbook quotes: a hook rate over 25% (under it, write the hook again), a click rate over 1%. They are its figures, not this brand's.
