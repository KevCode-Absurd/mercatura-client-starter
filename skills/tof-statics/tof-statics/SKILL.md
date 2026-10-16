---
name: tof-statics
description: >
  Create top-of-funnel STATIC ads (concept ads for cold audiences) for any D2C brand: research-backed
  messaging first, 1 picture in 1 visual world second, the words written to the picture third.
  Use when the task is "tof statics", "concept ads", "premium statics", "research-backed statics",
  "make statics for [brand]", "crack top of funnel with statics", or any static ad batch where
  the argument matters more than a layout to copy.
  Pipeline: persona doc (two-source rule), validated angles, creative forecast, visual concepts
  (Creative, Communicative, Native, Brand-world), base image, copy written to the visual (90
  characters or fewer), composition, QA gates. Successor to scroll-stopper-static-ads for sets
  of statics. In the app the planner is sent CARD.md, not this file.
user_invocable: true
---

# TOF Statics

Built from a studied corpus of 263 shipped, high-spend DTC static ads across supplements
(human, dog, chicken), apparel, jewelry, everyday-carry goods, beverages, games and B2B, plus
the production notes behind them. The research ships inside this skill: `research/teardown.md`
(the evidence and reasoning), `research/exemplars/` (43 curated ads: open the relevant ones
before concepting; they are the quality bar), `research/contact-sheets/` (the full corpus at a
glance, grouped by style). Brand names in the reference files are citations of that corpus,
never things to copy.

A concept ad is judged on 2 things: a stranger stops, and within 1 second can say who it is for
and what it argues about this product. Its risk for a brand that sells a physical product is a
clever picture with no product truth: the product drawn wrong, or left out so the ad sells the
whole category.

## In this app

- The planner of a concept ad is sent `CARD.md` (the rules) and the item's world, mode, devices
  and kind of ad from `src/lib/studio/worlds.ts`. This file is the whole method, for a person.
- The app renders the words in the image, in the brand's fonts, and reads them back. A person
  can also ask for no words on the image, or for a copy without them. Beliefs 5 and 6 below
  (1 master file, type never generated) describe work done by hand.
- The app makes each size the person asked for. It draws a message thread or a post in a design
  of its own: no real platform, outlet or person is imitated.
- How a product is shown true (tagged reference photos, 1 photo per job, the words agreeing with
  the photo, a check after every render) is `skills/production-principles`. Which model makes
  the picture is `skills/production-principles/models.md`. Neither is repeated here.

## The six beliefs this system is built on

1. **Copy is the load-bearing variable.** Tested at 800+ ads a month: the same headline kept
   winning across dozens of visuals; the best visual collapsed under different headlines. Spend
   your quality budget on the message.
2. **Top of funnel is the hard, valuable problem.** Anyone can put a discount on a product shot.
   Offer and promo statics are capped at **under 10% of a batch** (unless the assigned strategy
   is promo).
3. **AI collects and produces; the human decides.** "Statics made end-to-end with AI look like
   statics made end-to-end with AI." The person picks angles, approves concepts, approves base
   images.
4. **Diversity counts at the argument level.** 6 visually distinct ads making the same claim are
   1 message with 6 coats of paint. Count distinct arguments per batch, not distinct styles.
5. **One master file** (by hand). 9:16, the image bleeds edge to edge, every element that must
   be read sits inside the centred 4:5.
6. **Type is never generated** (by hand). Base image and type are separate layers. Exception:
   type that is part of the illustration world itself (a painted banner, an engraving label).

## The product in the picture

- The product is in the picture by default: inside the scene, in its light, never a cut-out
  pasted on top with a shadow. Where the world cannot hold it (a sketch, a diagram, a message),
  it is a small circle in a corner.
- It is drawn from its photos, never from words: the product itself, and its pack where it has
  one. Name the view the picture uses (pack front on, product out of its pack, in a hand, in
  use). If no photo shows that view, plan a picture that uses a view the photos do show.
- In a drawn or modelled world (clay, comic, pixel, sketch) the product is redrawn in that look
  and keeps its shape, its colours and what is printed large. Small print is left out, never
  invented.
- It may be absent only when all 3 hold: the mode is Native or the ad is a problem moment; the
  thing in focus is what the product replaces or the problem it ends (the scratched pan, the
  soaked shirt, the shelf of half-used jars); and the words say what this product is and the 1
  fact that makes it this brand's. An ad that a competitor could put its logo on has failed.

## An honest picture

A metaphor makes a problem felt. It must not promise what the brand cannot support.

- The picture shows the problem, its cause, or how the product works. It never shows a result
  the brand's facts do not state: no changed face or body, no before and after, no week-by-week
  change, no condition gone, no number drawn into the scene without a source.
- A diagram, cutaway or chart shows only a mechanism or a figure the brand's facts state. A
  made-up curve is a made-up claim.
- Fear is no bigger than the real stake, and never a medical outcome.
- The most a picture shows the product doing is what a person would see it do (`Visible result`
  in the brain).
- Claims, prices and offers come only from the brand's facts. A customer quote is word for word,
  with its source, and no generated face beside it.

---

## Pipeline

7 phases, 3 hard gates. Each gate: show the person, wait for approval.

```
P0 Foundation → P1 Angles ▮GATE 1▮ P2 Forecast → P3 Visual concepts ▮GATE 2▮
P4 Base images ▮GATE 3▮ P5 Copy → P6 Composition → P7 QA → deliver
```

For a fast run the person can collapse gates ("just ship it"), but say which gates are skipped.

### P0: Foundation, the persona doc

Read the brand brain (see "What this reads from the brand brain" at the end). Then build or
verify a **persona doc** per target persona. Every bullet filled in becomes messaging:

- **Overarching pain point or desire**: 1 per persona; a persona is its core problem
- Level of awareness (unaware, problem, solution, product, most)
- Level of sophistication (how many competing claims they have already heard)
- Sub pain points
- Trigger events (what just happened that makes them buy today)
- Failed alternatives (what they tried; why it disappointed)
- Desired outcomes
- Common phrases (their words, verbatim: these become headlines)
- Questions they ask

**Two-source rule:** no insight enters the doc without 2 independent sources (reviews, forum
threads, comments, competitor reviews, support tickets, the brand's research). 1 anecdote is
not an insight. If the brain's avatars are rich, map them into this schema and flag which
fields are thin; do not re-research.

The persona doc is also the **QA reference all copy is checked back against** in P7.

### P1: Angle development

An angle = persona × argument. Build 1.5 to 2 times more angles than ads planned, then cut.

**Insight quality test.** A winning insight has most of these 5 elements:
1. A specific avatar  2. A clear pain point or desire  3. Failed alternatives they have tried
4. The mechanism  5. The result (as the brand's facts state it)

**Angle validation.** A strong angle answers 4 questions easily:
1. What pain point or desire are we addressing?
2. What argument are we making?
3. What justifies this argument? (believability, proof, from the brand's facts)
4. Why would this matter to the avatar?

**Differentiation test.** There are only 2 ways to win: a pain point few are selling a solution
for, or a common one solved in a way nobody else is. A common pain solved the common way is cut.

**The product-truth test.** The argument ends in something only this product can say (what it
is made of, how it works, what it replaces, its guarantee). If every competitor could say it,
the ad sells the category.

**Messaging-diversity manifest.** Before presenting, write 1 line per angle:
`[persona] | [argument in 1 sentence] | [proof]`. If 2 rows argue the same thing, they are 1
angle. An 8-ad batch carries 5 or more distinct arguments.

**Multiplying a proven winner:** hold the pain point, swap the persona: new vocabulary, new
trigger events, new context. (1 pain point × N personas = N angles.)

**▮GATE 1▮** Present the angle table (persona, argument, proof, awareness level). The person picks.

### P2: Creative forecast

A loose plan, 3 lines: how many ads get which messaging × which visual mode. For example
"8 ads: 3 mechanism (communicative), 2 problem-felt (creative), 2 native, 1 comparison."
Check: promo share under 10%, argument count at or above about 60% of ad count, at least 2
modes present. Pick the mode mix by market posture: problem-driven products lean Creative,
Communicative and Native; premium and lifestyle brands lean Brand-world with Communicative
support.

### P3: Visual concepts

**The first decision for every ad: what is the image's job?**

| Mode | Job | Pair with | Route these arguments here |
|------|-----|-----------|---------------------------|
| **Creative** | Stop the scroll; make the problem felt | Hard, direct headline | Problem or pain, us against the usual way, bold desire |
| **Communicative** | Explain the argument in 1 beat | Short factual headline | Unique mechanism, comparison, how it is made, how it is used |
| **Native** | Disappear into the feed | Caption-style text only | Discovery, "the real reason...", a real customer's words |
| **Brand-world** | Make the product coveted | Identity headline + 1 spec | Premium and lifestyle brands, desire-led most-aware traffic |

**Brand-world register:** 1 committed premium world derived from the brand's identity; the
product is a monument (scaled up, used as a set-piece, not evidence at the bottom); the
headline is an identity claim or a visual idiom that excludes by aspiration, not by symptom;
proof collapses to 1 spec on a leader line; the button is optional. It is a register with
flavours: brand-colour pop, dark luxury, mythic-epic, dreamy pastel, storybook, vintage. Pick
the flavour from the brand's identity (`Brand world` and `Photography and imagery style` in
the brain) and hold it across the batch's premium ads. Not for problem-driven purchases, where
pain and mechanism convert.

Communicative is the workhorse for unique-mechanism ads: diagram, chart, cutaway, annotated
illustration, labelled sequence. The visual is the argument, so it shows only a mechanism the
brand's facts state.

Then spec each ad's 2 layers:
- **Base image** = visual idea × visual style. The idea is the concept ("a coating flaking into
  the eggs", "a capsule losing a race to a mint"); the style is the world: pick 1 from the
  23 worlds in **references/worlds-and-devices.md** (in the app, `worlds.ts`). Commit per
  concept; never reuse 1 world across a batch. 2 strategies worth checking on every batch:
  **personify** the problem or the product (a sulking zip, an angry gut, a mascot living a
  life) and **miniaturise** (tiny workers on a giant product).
- **Composition** = format and layout (headline-block skeleton, 2 columns, benefit-chip row,
  quote card, message bubbles, lower third). Devices: references/worlds-and-devices.md;
  geometry: references/composition-system.md.

**Concept gates (all must pass):**
- 1-second test: digestible in a second, not too many details
- Works without the headline giving it context
- The product passes "The product in the picture" above
- The picture passes "An honest picture" above
- Anti-template: would this read as the same template everyone reuses? Reject.
- Tasteful and not sloppy (unless ugly is the deliberate choice)

**▮GATE 2▮** Present concepts: mode, visual idea × style, composition format, intended argument.

### P4: Base image

- Made by the image model (`skills/production-principles/models.md`), at the size being made.
- **The product's own photos are attached and each is named with its job**, even for stylised
  worlds (`skills/production-principles`, section 1).
- By hand: **no text in the base image**; prompt for a clean, unlettered scene. Exception:
  in-world type when the concept demands it, never the headline.
- Compose for the read-zone: subject centred, key content inside the middle 4:5; the lower
  quarter is scenery only. Leave a quiet area where the words will land (usually the upper third).
- 1 or 2 bases first. A batch only once those have passed the check.

**▮GATE 3▮** Look at the bases for composition; approve or make again. Detail QA at full size
happens in P7: a downscaled tile both hides and invents defects.

### P5: Copy (written to the visual, after it exists)

Copy written blind to the image produces caption-copy, not integrated copy.

**4 headline rules (pass or fail):**
1. Plain English: no jargon unless the sophistication level calls for it
2. Fewest words possible
3. Written to 1 person
4. Someone with zero context understands it

**Plus:** simplicity over cleverness; specificity over ambiguity; the headline should
**deliberately exclude** people who are not the target persona (the exclusion test).

**Hard budget: headline + subhead 90 characters or fewer combined.** Target well under.

**Batch rules:** immediately clear; a solution-aware ad clearly implies the unique mechanism;
copy connects to a specific persona and pain point; **sounds human** (run the
`ai-copy-blacklist` audit); the subhead states the mechanism or the turn and does not repeat
the headline. Every number, price and offer is the brand's own.

Check every line back against the persona doc: is this their pain, their phrase, their question?

Because layers are split by hand, headline iteration is free: offer 2 or 3 headline options
per ad against the same base.

### P6: Composition (by hand: real type over the base)

Set the type in HTML at the exact pixel size and screenshot it. Toolkit and skeleton:
`templates/composition-base.html`; renderer: `scripts/compose.py`. 1 HTML file per ad: the
devices are reusable, the layout is per concept. If the person supplies a design-file link,
build the type layer in that file instead; the split-layer principle is unchanged.

**The recurring skeleton** (default for Creative and Communicative; Native ignores it):

```
┌──────────────────────────┐ 9:16
│  HEADLINE 2 to 4 lines   │ ← upper third, huge; 1 line reversed
│  ▓highlight bar▓ on the  │   out in a solid accent bar (the pivot)
│  subhead, 1 to 3 lines   │ ← about 40% of headline size, states mechanism
│                          │
│      HERO VISUAL         │ ← single subject, centre; bleeds past 4:5
│   ── leader line ──▶ ▣   │ ← hairline rule from caption to product
│                          │
│  · · scenery only · ·    │ ← below the 4:5 line: nothing readable
└──────────────────────────┘
```

Devices (use 1 to 3 per ad, not all): highlight bar on the pivot line · 2-tone headline (setup
light, payoff heavy) · leader-line callouts carrying 1 spec each · small circular product
inset · a button (small solid pill, 2 to 4 words; standard on direct-response ads, optional on
brand-world) · offer bar (only on offer ads, only the brand's real offer) · benefit-chip row ·
2 columns · speech bubble · strikethrough · big-number pair (both numbers from the brand's
facts) · stage flags (only for a sequence the brand's facts state) · quote card (real words
only) · lower-third caption · message bubbles (native, in a design of your own).

Typography: the brand's fonts (`Typography` in the brain; else the closest available), real
hierarchy, tight kerning. Every readable element inside the centred 4:5.

### P7: QA (full resolution, every ad)

- [ ] Read the export at full size: type crisp, no clipped descenders, no overlap with busy areas
- [ ] Every readable element inside the centre 4:5 crop
- [ ] 1-second test and works-without-headline test still pass on the finished ad
- [ ] Headline + subhead 90 characters or fewer; 4 headline rules; exclusion test
- [ ] Copy traced back to a persona-doc bullet (name it)
- [ ] Every claim, number, price and offer traced to the brand's facts
- [ ] The picture promises nothing the words could not ("An honest picture")
- [ ] The product matches its reference photo: shape, colour, finish, what is printed large
      (the full list is `skills/production-principles`, section 9)
- [ ] Would a competitor's logo fit on it unchanged? Then it is not this brand's ad
- [ ] Anti-slop and anti-template: would a stranger read it as AI, or as a layout seen everywhere?
- [ ] Batch check: count distinct arguments; promo share under 10%; 2 or more modes; no world reused

Deliver: finished images + a manifest table (file, persona, argument, mode, world, headline characters).

---

## Post-launch (when performance data comes back)

- **Pareto post-mortem:** name the top 1 to 3 variables behind a winner, never 100. Build the
  next hypothesis from those alone.
- **Multiply winners** by persona recontextualisation (P1 rule).
- **Video to static transfer:** only messaging carries across: pain or desire, failed
  alternatives, problem mechanism, solution mechanism, awareness, sophistication. Study the
  first 15 to 20 seconds; that is where the message that earned attention lives.
- Feed results into the brand's `winning-ads.md` and `brain.md` (What we know works, What to
  avoid), and into the next creative forecast.

## References

- `references/composition-system.md`: layout system, devices, per-mode specs (by-hand work)
- `references/research-and-angles.md`: persona doc template, angle worksheets
- `references/worlds-and-devices.md`: 23 worlds + device catalog with corpus indexes
- `references/exemplars.md`: map of modes and devices to `research/exemplars/` (open the images)
- `research/teardown.md`: the evidence and reasoning this skill encodes

## What this reads from the brand brain

| Needs | Document and field | If blank |
|---|---|---|
| The buyer, their words, trigger, failed fixes | `customer-avatars.md`: Ranked insight bank, Customer language bank; per avatar Grounded in, What they care about, Why they buy this product, What almost stops them | Ask. An argument with no research behind it is marked "inferred" and never states a fact |
| The moment the picture stages | `customer-avatars.md`, per avatar: The moment (new, in the draft) | Ask; or pick a mode that needs no moment (Communicative) |
| Awareness and sophistication | `brain.md`: Brand diagnosis (Market awareness level, Market sophistication) | Assume problem aware, stage 3, and say so |
| What only this product can say | `products-and-positioning.md`, per product: Key features, Core benefit, Positioning angle; `brand-guidelines.md`: Unique selling propositions; `brand.json`: claims with sources, guarantee | No claim is written. The ad argues the problem and names the product |
| What the product looks like and how it is shown | `products-and-positioning.md`, per product: Looks like, Pack, How it is used, Visible result, Never show, Reference photos (all new, in the draft) | The product is shown closed or at rest, from the 1 photo there is. A missing view is a question for the brand |
| The world a brand-world ad lives in | `brand-guidelines.md`: Brand world (new, in the draft), Photography and imagery style, Color palette, Typography | Brand-world mode is not used |
| What must not be said or shown | `brand-guidelines.md`: Brand guardrails; `brand.json`: forbidden claims; `lessons.json` | None |
| Offers (ready buyers only) | `offers.json`; `products-and-positioning.md`: Bundles and offers | No offer ad is made |
| What has been tried | `winning-ads.md`: Pattern summary and entries; `brain.md`: What we know works, What to avoid | Nothing is assumed to have worked |
