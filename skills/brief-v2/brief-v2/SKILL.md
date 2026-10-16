---
name: brief-v2
description: Use when the user asks for ad creative briefs, a creative sprint, ad concepts, or says "brief", "weekly brief", "creative sprint" or "draft briefs". Makes 3 concepts with 3 variants each from the brand brain and whatever ad evidence exists - measured results from an ad account, results the founder reports, or what an ad library shows is running. Each concept names the belief in the buyer's way before any headline is written, and each variant differs from its siblings on 2 of 4 axes. Also use to rebuild weak briefs.
---

# Brief V2: 3 concepts, each built on a belief

A brief here thinks before it writes. For each concept it first says where the buyer is, what they believe that stops them, what the ad must leave them believing, the moment the ad meets them in, and how strong the evidence is. Only then is a headline written. Each concept gets 3 variants that are 3 different ads, not 1 ad reworded.

It is judged on 3 things: a maker can produce every variant without asking a question; no 2 variants would be read by an ad platform as the same ad; and nothing in it is presented as proven that was only inferred.

`CARD.md` is the short form for a step that writes concepts. `references/concept-block.md` is the template. The other reference files are background, read when a field needs them.

## 1. What evidence there is

Say which of these the brief rests on, in its first line. It changes what may be claimed.

| What is to hand | What it gives | What may be said | Best evidence tier |
|---|---|---|---|
| **The brand's ad account**, by ad, for the last 1 to 4 weeks: spend, purchases, revenue, hook rate (the share of people shown the ad who watch 3 seconds), hold rate (the share who keep watching), click rate, frequency, days running, on or off | What won, what is tiring, what never got spend | "Measured": this ad returned 2.4 on 3,100 of spend | 1 to 4 |
| **What the founder reports** (questionnaire F8.1, F8.2, F8.5), with or without a number | What the brand believes worked and failed | "Reported by the founder, not measured" | Treat as 5 until measured |
| **Research**: reviews, surveys, tickets, with quotes | Who buys, what they believe, the moment | "From research", with the quote | 5 |
| **An ad library only** (the brand's own page and its competitors'): what is running, since when, in how many versions, in which formats, with which opening lines | What has and has not been tried. Not what works | "Running for 140 days in 6 versions". Never "winner", "profitable" or "proven" | 6 to 8 |

An ad that has run a long time may be a winner, or may be sitting in a small retargeting campaign nobody looked at. Days running and number of versions are a reason to look, not a result.

With no account and no founder report, the brief is still made. Its mode is NOT MEASURED (section 4) and its header says so.

## 2. Read first

From the brand brain, in this order. Names are the brain's own.

1. `recent-changes.md`: what is live now. A promotion that ended or a product out of stock is not briefed.
2. `brain.md`: Brand diagnosis, What we know works, What to avoid, Key decisions, Open questions.
3. `winning-ads.md`: the pattern summary and each ad, and whether each is measured or reported.
4. `customer-avatars.md`: each avatar's quotes, What almost stops them, The moment.
5. `products-and-positioning.md`: the product each concept sells, its price, Visible result, Reference photos.
6. `brand-guidelines.md`: voice, Brand world, Motion and sound, guardrails.
7. `competitors.md`: what they run and the gaps. Required, not optional.
8. `offers.json`: the offers in use. A brief states no other offer.
9. The last brief, so no concept is repeated.

In the app, the count of ads by stage, by awareness, by buyer and by format is the Coverage screen, and the concepts already made are the Concepts screen. Read those; do not keep a second tally in a file. Worked by hand, keep the tally under Brand diagnosis in `brain.md`.

## 3. The diagnosis

4 questions, answered from section 2 before any concept. 1 or 2 sentences in all.

1. **Who do the ads speak to, and who buys?** The gap between the 2 is the next angle.
2. **Which stages are covered?** Map each running ad to a stage (table below). A stage with nothing running for weeks comes first.
3. **Which belief is in the way?** For a cold buyer, which of the 6 kinds of belief (`references/copy-frameworks.md`) blocks the sale: outcome, identity, problem, solution, product, credibility. Do not answer the same one in every brief.
4. **Is the product used up, or bought once?** It changes where the work is:

| Stage | Awareness | What the buyer is doing | A product that is used up | A product bought once |
|---|---|---|---|---|
| Trigger | Unaware | Living with the problem, not naming it | Name the daily moment | Name the moment the old one fails |
| Exploration | Problem-aware | Looking at kinds of fix | Why this kind of product | Why replace rather than put up with it |
| Evaluation | Solution-aware | Comparing | Short: taste, feel, what is in it, how others use it | Long, and where most sales are won or lost: price against years of use, fit, materials, what happens if it is wrong (returns, warranty) |
| Purchase | Product-aware, most-aware | Ready, needs a push | A first try made safe; later, a reason to come back | The risk taken away, and a real reason to decide now |

## 4. The mode

| Mode | When | The 3 concepts |
|---|---|---|
| **PIVOT** | Measured, below target, no clear winner | 3 new ideas at tier 4 or 5, each against a different belief |
| **ITERATE** | Measured, on target, winners exist | 1 at tier 1 or 2 (the best ad, taken further), 1 at tier 4 (a new opening for a proven buyer), 1 at tier 5 (a new buyer or angle) |
| **SCALE** | Measured, strong, low frequency | 3 at tier 1 or 2. Take the best ad apart first (opening, angle, format, feeling), then change 1 part in each |
| **PROMO** | Only when the person asks | 3 concepts for an offer in use. The price or the value is the belief to install. Dates and limits are real ones from `recent-changes.md` |
| **NOT MEASURED** | No account, or under 7 days of data | As PIVOT, from research and reports: tiers 5 to 7 only. The header says "Not measured: no concept here is proven" |
| **HOLD** | The account is paused, or the person says so | No brief. Say why |

In every mode but SCALE and PROMO, at least 2 of the 3 concepts are for buyers who do not know the product (Trigger or Exploration): the app plans 70 to 90% of new ads for them. For a product bought once, the third concept is an Evaluation concept: that is where such a sale is won or lost, and 1 in 3 is the least it should get.

## 5. The thinking block (before any headline)

When a visual tutorial or trend is supplied for inspiration, use [Memorable visual ideas](../../production-principles/references/memorable-visual-ideas.md) to derive an original motif, immediate surprise and earned payoff. Keep this brief's buyer belief, evidence and requested format authoritative. Explain the attention/share hypothesis, the true brand connection and hardest production beat within the existing variant description; do not promote a source's "viral" label into an evidence tier or substitute spectacular imagery for proof. Different visual devices still follow the required variant axes and concept count.

Think beyond the source's genre: competing agendas, disproportionate effort, a revealing detail, a status reversal or a callback can become a trailer, documentary, interview, POV, animation, still or carousel. Select formats from the supported catalogue and the buyer's moment; do not repeat a cat/roommate sketch with new props. Each candidate connects recognizable tension, visible contradiction and payoff to a supported selling point. Humor, mascots and nostalgia are optional; staged failure or reactions never become proof, and ordinary UGC/native/podcast rules remain intact.

Every concept opens with these. Template and examples: `references/concept-block.md`.

- **Stage**: Trigger, Exploration, Evaluation or Purchase.
- **Awareness**: unaware, problem-aware, solution-aware, product-aware or most-aware.
- **The belief in the way**: the exact thing this buyer believes that stops the sale, in their words. From What almost stops them or a quote; marked "inferred" if neither.
- **The belief to install**: what they believe after the ad. It must be something the brand's facts can hold up.
- **The moment**: where they are and what they are doing when the problem shows. A scene, not a description of a person. From the avatar's The moment; marked "inferred" if blank.
- **Evidence tier**: 1 to 8 (`references/research-frameworks.md`), with its basis: measured, reported, from research, or inferred from an ad library.
- For video, the **opener**: 1 of the 12 in `references/copy-frameworks.md`.

## 6. 3 variants that are 3 ads

Each variant differs from each of the other 2 on at least 2 of these 4:

1. **Sub-persona**: a different person, not the same one reworded.
2. **Feeling**: curiosity, relief, pride, belonging and fear of loss are different feelings.
3. **Awareness**: the next level up or down.
4. **The way it opens**: a different opener, and a different first picture.

3 headlines over 1 picture for 1 person are 1 ad. An ad platform groups near-copies and spends on 1 of them, so they are not written.

## 7. The spec, per variant

Stated, not left to the maker. The decision tree is `references/layout-specs.md`.

- **Layout**: headline only; headline and sub-headline; headline and up to 3 short points; all 3; price shown large; a customer's words; a number.
- **Headline length**: short (3 to 5 words), medium (5 to 7), long (8 to 10). The app's limit is 10 words on a layout ad, and 90 characters with the sub-headline on a concept ad.
- **Tone**: direct, empathetic, doubt turned to belief, teaching, or identity.
- **What is seen**: 1 line, built from the product's Looks like and Reference photos and the brand's Brand world. A picture or clip follows `skills/production-principles`; the brief does not restate it.

## 8. Checks before it is saved

- Every concept has its thinking block filled, and anything inferred is marked.
- No 2 variants of a concept share both the person and the feeling. No variant opens the way an ad now running opens.
- At least 2 awareness levels across the 3 concepts.
- A point in a list says what the buyer gets. A material or an amount appears only with what it does ("3 mm steel: holds heat when the steak goes in").
- Claims, prices, numbers and offers are the brand's facts, as stated. Whether a claim is softened is the brand's voice rule, not this skill's.
- A customer's words are word for word, with the source. No quote on file: write "quote needed".
- No urgency that is not real, in any mode.
- No person in a picture who is a child, or who is shown as the founder, a customer or an expert without that person's own photo and say.
- Run the copy against `skills/ai-copy-blacklist.md`.

Fix what fails and note it in the footer: "Copy check: rewrote 2 lines".

## 9. What comes out

- In the app: 3 concepts on the Concepts screen, each with its thinking block, and 9 variants a person can send to be made as scripts or image ads.
- By hand: `creative-brief-YYYY-MM-DD.md` in the brand's folder, in the shape of `references/concept-block.md`.
- Nothing is written to `brain.md` until a person has read the brief. Then: the concepts go to Ideas to explore; a result, once measured, goes to What we know works or What to avoid, and to `winning-ads.md`.

Rules that always hold: never repeat a concept from the last brief; words that sit on the ad only, no feed text; no "stop this ad, keep that one" advice, the brief is for makers; name a file only if it is in the brand's `assets/`.

## What this reads from the brand brain

| Document and field | Used for | When it is blank |
|---|---|---|
| `brain.md` Brand diagnosis (Market awareness level, Market sophistication, Creative diversity level, Highest-intensity persona, Biggest opportunity) | Section 3 | Write the diagnosis and mark it "first read" |
| `brain.md` What we know works, What to avoid | What to take further, what not to brief | Mode is NOT MEASURED unless an account is to hand |
| `winning-ads.md` Pattern summary and each ad | Tiers 1 to 4 | No tier above 5 |
| `customer-avatars.md` per avatar: Grounded in, What almost stops them, The moment | The belief in the way, the moment, the sub-personas | Mark the field "inferred"; ask (F5.4, F5.9) |
| `products-and-positioning.md` per product: Price, Core benefit, Visible result, Reference photos | The product a concept sells, what may be shown | Ask (F2.7, F11.5). No before and after without a Visible result |
| `brand-guidelines.md` Brand world; Motion and sound; Brand guardrails | What is seen | Leave "What is seen" to the maker and say so |
| `competitors.md` Competitor ads and messaging; Gaps worth owning | Tiers 6 to 8, and what not to copy | Say "competitors not read" in the header |
| `offers.json`, `brand.json` offers and guarantee | PROMO mode; the Purchase stage | No offer is stated |
| `recent-changes.md` | What is live | Ask before naming a date |

Needed and not in the brain today: for each ad in `winning-ads.md`, whether its result is measured or reported, with the number and its dates; and its stage, awareness, buyer and format, so coverage can be counted without an account.
