---
name: video-ad-scripts
description: Write, review and vary direct-response video ad scripts for e-commerce brands on Meta (UGC, founder, talking head, VSL, story ads, AI UGC, claymation, animation). Use when asked for a video ad script, hooks for a video, a script rewrite, beat-by-beat feedback on a script, script variants of a winner, or a longer or shorter cut. Follows the 9-beat ad script playbook. Does not write static image or carousel copy.
---

# Video ad scripts

This skill writes video ad scripts that sell, for e-commerce brands running Meta ads. It follows the 9-beat ad script playbook: research first, offer second, the argument beat by beat, then voice, then format.

About 90% of a good script is decided before the first line is written. Do the steps in order. Do not jump to writing hooks.

The script is also the source for everything made after it: the creator brief, the AI UGC prompt, the claymation or animation prompt, the statics and carousels cut from it. So every line carries what those need: the spoken words, the on-screen text, the picture, and the evidence behind it.

**Superseded inside the app (2026-10-05).** Creative Studio writes scripts with the skill family that was built from this file: `script-from-research`, `script-reference-structure`, `script-reference-principles`, `script-transpose`, 1 recipe from `script-types`, 1 `script-format-*` skill and the sections of `ad-script-principles`. Of this folder the app sends the script writer only `references/winning-ad-patterns.md`. This file is kept as the whole method in 1 place, for use outside the app. Where it and the family differ, the family is right. The method holds for any D2C product: where an example below is about a supplement, the same rule is shown for a product that is bought once and kept (a pan, a jacket) in `ad-script-principles`.

## Reference files

Read these when the step calls for them. They sit next to this file.

| File | What it holds | Read it at |
|---|---|---|
| `references/performance-playbook.md` | Feed craft (first 3 seconds, sound-off, pacing), e-commerce offer mechanics, reading ad metrics to find the weak beat, Meta policy limits, what each production format needs from the script | Steps 3, 6, 7, 8b, 11, 12 and every review |
| `references/winning-ad-patterns.md` | Patterns counted across the analysed winning video ads in the reference library: opening devices, how mechanisms are shown, proof and offer devices, by awareness stage | Steps 5, 7 and 12 |

## Match effort to the ask

| Request | Do |
|---|---|
| "Give me hooks", "punch up this line" | Steps 1 and 7 only. Return the lines. |
| "Write a script" | All steps. 1 script plus hook variants. |
| "Write scripts to test", or no angle given | All steps. 3 scripts on 3 angles that differ in the argument, not the wording. |
| "Make something like this ad" | Ask which reference mode (below): same ad in a new format, keep the structure, or loose inspiration. |
| "What's wrong with this script?" | Review mode. |
| "Make it 15s", "make a 3 minute version" | Length change. Never a trim. |

**No customer research yet?** Use the `video-ad-copywriter` skill's method: build an assumed customer model (desire, problem in their words, accommodation, failed solutions, trigger, objections, their words), mark it `Assumed customer model`, and treat every script as a bet to test. Swap in real research as soon as it exists.

**Starting points.** Every script starts from 1 of 4 places. Work out which before writing, because each gives you a different amount of freedom.

| Starting point | What the user gave | Your freedom | What you write |
|---|---|---|---|
| A. Same ad, new format | A reference ad, to be remade exactly in another format | None over the words. | Nothing. Do not run steps 1 to 13. Lay the reference's own words and shots out as the script, line for line, and hand it to production. |
| B. Step by step | A reference ad, to be rebuilt for this brand | Words, and any step that does not fit this brand. | The reference read one step at a time, and each step redone with what does the same job for this brand. |
| C. What made it work | A reference ad, for why it worked, or for its idea only | Structure and words. | A script built with steps 1 to 13, with the reference's principle (or only its idea) as the base. |
| D. From research | No reference | Full. | A script built with steps 1 to 13 from the customer research. |

**Reference modes.** Rules for A, B and C.

- **Mode A, same ad, new format.** The user wants their ad again as claymation, a cartoon, a carousel or a static. Keep every spoken word, every on-screen line, the shot order and the timing. Do not improve it, shorten it, re-order it or fit it to the 9 beats. Label each line with the beat it does so production knows its job. The only thing that changes is the visual format. The claim and guardrail checks still run and report what they find; they do not rewrite the ad.
- **Mode B, step by step.** Read the reference first, one step at a time: what happens, and what that step does for the buyer. Note the hook device, the rhetorical pattern (a repeated phrase, a list, a reveal), who is on camera, where the product first appears, the pace. Then, for each step, write the line that does the same job for this brand's buyer. Keep the order of the steps and the device wherever they hold for this brand. The reference is another brand's ad: where a step rests on something this brand does not have (a kind of person, a setting, a way the product is used, a fact, an offer), replace it with what does that job truthfully here, and where nothing does, drop the step or join it to the next. Never bend the brand to fit the reference. Pacing follows loosely: about the same length. Every word, claim, number and offer is this brand's. If the device rests on a fact (a price drop, a new formula, a result), use a fact the brand brain supports; if none fits, keep the shape of the device and build it on a fact that is true. The 9-beat order and the length table do not apply: the steps are the beat table. Share no phrase of 6 or more words with it. Return the step map before the script: step, what it did, what yours does, and "changed" or "dropped" where you departed.
- **Mode C, what made it work.** Take only why it worked: the principle behind the hook, the way it makes the mechanism visible, the feeling it leaves, its best parts. Then run steps 1 to 13 as normal. The script should not be recognisable as a copy of the reference's sequence. Name the principle you built on in the notes. Where you are given the idea only (what the ad is and the 1 reason it works), take the idea and nothing else: the principles, the structure and the words are all your own.

In B and C the non-negotiable rules below hold in full. In A they apply to what you flag, never to what you change.

## What this skill produces

Depending on the request, 1 or more of:

1. **New script.** A full script as an AV sheet (beat, spoken line, visual note), plus 5 to 10 hook variants, plus a format recommendation.
2. **Script review.** Beat-by-beat feedback on an existing script, with a rewritten version.
3. **Variants.** New versions of a winning script that keep what makes it win (person, tense, persona, hook, length, register).
4. **Length change.** A script rewritten for a new length. Never a simple cut.

## Inputs

Gather these before writing. Read them from files or the conversation. If a brand-brain skill or brand folder exists, read it first.

| Input | Why it matters | If missing |
|---|---|---|
| Brand brain: product, ingredients or materials, offers, prices, guarantee, approved claims, forbidden claims, proof assets, voice rules | Mechanism, proof, offer and compliance all depend on it | Ask. If the user wants a draft anyway, use clear placeholders like `[PRICE]` |
| Customer research: call notes or transcripts, support tickets and return reasons, reviews, post-purchase survey answers, Reddit or forum posts | The hook, problem, objection, risk reversal and urgency come from here | Ask for it. If none exists, say the script is a hypothesis and mark every assumed customer insight with `[ASSUMED]` |
| Concept: persona × angle × offer | 1 concept per script | Propose 1 and state it at the top |
| Awareness stage (unaware, problem aware, solution aware, product aware, most aware) | Decides how the script opens | Pick 1 and state it |
| Market sophistication stage (1 to 5) | Decides claim vs mechanism vs identity | Estimate from competitor ads and state it |
| Target length (15s, 30s, 60s, 2 to 3 min, 5 to 10 min) | Decides which beats get space | Default 60s |
| Who delivers it (UGC creator, founder, expert, AI avatar, voiceover) | Decides person and register | Default UGC creator, 2nd person |
| Reference ads: 2 to 4 analysed winning ads at the same awareness stage or in the same format | Shows a structure that already works: opening device, pacing, how the mechanism is shown | Use `references/winning-ad-patterns.md` |
| Performance data, if this ad or account has run: hook rate, hold rate, link click-through rate, conversion rate | Tells you which beat to fix, so you don't rewrite the whole script | Say the review is a craft review, not a data review |

**Borrow structure, never words.** From a reference ad take the opening device, the order of beats, the pacing and the way the mechanism is shown. Never take its lines, its claims, its numbers or its creator's story. A claim that was true for their product is an invented claim for yours.

**Never invent customer evidence.** Do not make up quotes, testimonials, review counts, star ratings, study results, customer numbers or stories. Use what the inputs give you. When a line needs a number you do not have, write a placeholder such as `[REVIEW_COUNT]` and flag it.

The same goes for the small details that make an ad feel real:

- **Small specifics read as facts on camera.** "Since March", "$800 on a desk", "20 minutes in". Take them from research, keep them general ("for months"), or bracket them for the creator to swap in their own true detail: `[HOW LONG YOU'VE HAD IT]`.
- **Comparisons are claims about other products.** "Won't go flat like a yoga mat" needs support in the brand brain or the research. Otherwise flag it.
- **Derived numbers need a stated basis.** "73 cents a day" needs the price and the days it lasts, both from the brand brain. A warranty period is not a lifespan.
- **Who is speaking.** A hired creator can only say "I" about things they have really done with the product. Write lines they can honestly say after using it, switch to 2nd person, or attribute the story ("A customer told us..."), and only a story a customer really told. Founders can tell the founding story, in their own footage. Avatars and claymation characters are fiction and must read as fiction: a generated presenter tells the problem and shows the product, and gives no personal testimonial. No generated children.
- **A picture that can be made.** A line whose picture needs a celebrity, a real person who has not been filmed, a real news clip, a child, or words to be read inside the video is a wasted line. Words on screen are overlays, added afterwards.
- **Where the line sits:** a 2nd person observation about the viewer's likely life is the point of an accommodation. A stated fact about a real person, the product or "most people" is a claim, and claims need evidence.

## Non-negotiable rules

1. **Channel a desire that already exists.** Copy cannot create desire. Every script must aim at a desire you can point to in research (a review, a ticket, a call, a thread).
2. **Agitate the consequence, never the symptom.** Name what the buyer changed in their life to cope (the accommodation). Do not list symptoms.
3. **Promise before mechanism.** Say what they get, then why it works. Never open with jargon.
4. **Every promise needs a mechanism. Every claim needs proof bigger than the claim.**
5. **Each line's job is to get the next line watched.** The hook must flow into line 2.
6. **Introduce the product late and gradually.** Do not name it before the mechanism lands.
7. **Use the buyer's words, not marketer words.**
8. **Specific beats adjective.** Numbers, names, physical details, times, proper nouns.
9. **Write for the ear.** 1 idea per sentence. Contractions. Read it aloud.
10. **Only true, compliant claims.** If a claim is not true for this product, do not write it.
11. **Write the picture with the words.** Every line gets a visual note and, where it helps, on-screen text. Most feed video starts with the sound off, so the first frame and the text overlay must carry the hook on their own.
12. **Never tell the viewer what they have.** Meta rejects ads that assert a personal attribute ("Are you bloated?", "Your thinning hair"). Use 1st person, "if you've...", or a scene. See the policy section in `references/performance-playbook.md`.

## Workflow

### Step 1: ground the script in research

Find these 5 things. They fill 5 of the 9 beats.

| Find | What it is | Feeds this beat | Best source |
|---|---|---|---|
| The accommodation | What they changed in their life to work around the problem, usually without saying it out loud | Problem (and often hook) | Calls, forums, reviews |
| The failed solution | What they tried first, what it cost, why they stopped | Objection | Calls, forums, 2 to 4 star reviews |
| The nearly-didn't-buy | The last thing between them and buying | Risk reversal, offer | Calls ("I nearly didn't..."), surveys |
| The word | The noun they use for the problem | Hook, and every line | Reviews, forums |
| The moment | The day, week or event they started looking | Urgency, problem | Calls, post-purchase surveys |

Each source has a job:

| Source | What only it gives you |
|---|---|
| Call recordings | The final objection before purchase |
| Support tickets and return reasons | Failure modes. Angles and claims to stop using. |
| Reviews | The words buyers use. 2 to 4 star reviews hold the objections. |
| Post-purchase survey | What tipped them at the moment of purchase |
| Reddit, Facebook groups, forums | The language of people who have not bought yet |

**Translate marketer language into buyer language.** Examples:

| Marketer says | Buyer says |
|---|---|
| Is your hair thinning? | I can see my scalp. |
| Do you suffer from bloating? | I look 4 months pregnant by 4pm. |
| Waterproof breathable shell | I get to work wet either way, from the rain or from the sweat. |
| Durable non-stick coating | It peeled into the eggs. |

The findings differ by how the product is bought. For something used up and reordered (a supplement, a serum, a coffee) the nearly-didn't-buy is usually "will I keep it up?" or "is this a subscription trap?". For something bought once and kept (a pan, a jacket, a bag) it is the price, the size or fit, whether it will last and whether it can go back, and the failed solution is the cheap one that was replaced.

If a failure mode shows up in tickets or return reasons (for example refunds from people who expected regrowth, or returns for "smaller than the photo"), treat it as a guardrail. The script must not imply that outcome.

### Step 2: place the buyer

Pick 1 awareness stage and 1 sophistication stage. Write both at the top of the script.

**Awareness stage sets the opening:**

| Stage | What they know | Open with | Example opening (hair thinning) | Example opening (a cast-iron pan) |
|---|---|---|---|---|
| Unaware | No problem yet | Teach the problem first | The photos you don't like of yourself are usually taken from behind. There's a reason for that. | You cook everything on medium. There's a reason. |
| Problem aware | The problem, not the solutions | The accommodation or moment | If you've started parting it on the side, this is for you. | If you've stopped cooking steak at home, this is for you. |
| Solution aware | Solutions exist | Why other solutions fail | Most hair supplements dose saw palmetto at a 5th of what the studies used. | A coated pan can't be taken to full heat. That's the whole problem. |
| Product aware | Your product exists | Proof, offer, objection | (Lead with proof or the guarantee) | Yes, it's heavy. That weight is what holds the heat. |
| Most aware | Close to buying, usually stuck on price | Offer and reason for now | The 90-day pack is back and it's the last run at this price. | The 26 cm is back in stock. |

Colder stages cost more and need more skill, but scale further.

**Sophistication stage sets the type of claim:**

| Stage | Market state | Write |
|---|---|---|
| 1 | First to market | Make the claim |
| 2 | Claim exists | Enlarge the claim (watch compliance) |
| 3 | Market is tired of claims | Introduce a unique mechanism |
| 4 | Everyone has a mechanism | Enlarge the mechanism |
| 5 | Mechanisms exhausted | Sell identity and transformation |

Scripts written at a higher sophistication stage than the market usually perform better. Default to a unique mechanism plus identity.

### Step 3: audit the offer

Offer beats copy. Check the 5 elements. The script can only use what the offer actually has.

| Element | Buyer's question | Used in |
|---|---|---|
| The thing | What do I actually get, in my words? | Promise |
| The terms | What does it cost, framed against what? | Offer |
| The reversal | What if it doesn't work? | Risk reversal |
| The reason for now | Why this week? | CTA, urgency |
| The effort | What do I have to do, and for how long? | Offer, CTA |

**Frame the price** with 1 of these:

- **Anchor against the alternative.** "1 call-out from a plumber costs you $200."
- **Reduce to the ridiculous.** "73 cents a day. Less than the coffee you're drinking."
- **Price the problem.** "You've spent more than this on 2 things that didn't work."
- **Make the effort the price.** "It's 2 minutes every Sunday night."

**Write the guarantee so it sells:**

- Specific, not "30-day money back".
- A little uncomfortable for the seller.
- Matched to how long the buyer needs to find out (a 90-day cycle gets a 90-day guarantee; a pan gets enough weeks to cook on it; a jacket gets a season).
- Repeats the messaging, using the buyer's word.
- Example, used up: "Take it for 90 days. If your part hasn't changed, send us the empty tubs and we'll refund all 3."
- Example, kept: "Cook on it for 100 days. If it isn't the pan you reach for, send it back used."

**E-commerce terms to check.** For a product that is reordered: one-time vs subscription price, what the subscription commits them to and how they cancel, bundle and multi-pack price per unit, first-order discount, free gift, shipping threshold. State subscription terms plainly. If research shows a fear of being locked in, answer it in the risk reversal with the real cancel steps. For a product bought once: returns and exchanges (and whether a used one can go back), the size guide, the warranty and repairs, and stock of the size or colour. Per-day pricing rarely fits it; price it against what it replaces or how long it lasts, with real numbers only. Details in `references/performance-playbook.md`.

If the user cannot change the offer, look for what already exists and say it better (free returns reframed as a specific guarantee, a bundle hidden on a landing page, urgency already in the mechanism).

### Step 4: find the specific, unique claim

**Delete before you refine.** Cut lines that any competitor could say ("vegan, cruelty-free, made in Australia" when the category is all of those). Do not replace them until research shows what is truly unique.

**Run every differentiator through 3 questions:**

1. Is it a proposition? (Buy this and you get this.)
2. Is it unavailable to competitors?
3. Will it move a stranger?

"Family-owned since 1994" fails question 3. "Free shipping" fails question 2. "Third-party lab tested, results published" can pass all 3.

**Use the specificity ladder** in place of adjectives:

1. Measured numbers
2. A named 3rd party
3. A specific physical detail
4. A specific time
5. Proper nouns

| Adjective | Specific |
|---|---|
| Fast absorbing | Dry in 40 seconds. We timed it. |
| Luxury craftsmanship | 1 person stitches each pair, start to finish. It takes her 4 hours. |
| Limited time only | We make 400 a month. October's gone. The next batch ships 14 November. |

**Ask the 3 factory questions** to find a mechanism:

1. What does the factory do that the brand thinks is boring?
2. What was rejected during formulation, and why?
3. What constraint did the product force that has never been mentioned?

Example: "Most magnesium is oxide. It passes straight through you. Ours is glycinate. Your body absorbs it. It's much harder to make."

### Step 5: set the script controls

| Control | Options | Default |
|---|---|---|
| Length | 15s, 30s, 60s, 2 to 3 min, 5 to 10 min | 60s |
| Person | 1st (story, UGC, founder), 2nd (most scripts), 3rd (documentary, claymation) | 2nd |
| Tense | Past for stories, present for mechanisms | Matches person |
| Problem entry | Accommodation, moment, failed solution | Accommodation |
| Story shape | None, failed-solutions journey, discovery, transformation with a witness, confession | None for under 30s |
| Register | UGC casual, documentary, diary | UGC casual |

Performance order for person: 1st, then 2nd, then 3rd. 1st person past tense performs best for story ads.

### Step 6: write the 9 beats

Write each beat with its rules. Tag every line with its beat.

| # | Beat | Job |
|---|---|---|
| 1 | Hook | Buys attention and pre-qualifies the right buyer. Sells nobody. |
| 2 | Problem | Agitates the consequence they already accommodated |
| 3 | Promise | What they get, in their terms |
| 4 | Mechanism | A reason to believe the promise |
| 5 | Objection | Handles the other solutions they tried |
| 6 | Proof | Backs the claims |
| 7 | Offer | The product and what they get |
| 8 | Risk reversal | Makes saying yes safe |
| 9 | Call to action | Action, what happens next, effort, reason for now |

Bridges connect the beats. Identity is an optional closing line.

#### Beat 1: hook (write it last, see step 7)

#### Beat 2: problem

- Name the **accommodation**, not the symptom. "You've started planning what you wear around the bad days" beats "Bloating can be frustrating."
- Speak to **1 person**. This is the biggest predictor of whether the beat works.
- Argue at **category level**. The product is not in yet. Nobody can dismiss a whole category as hype.
- **Do not resolve the problem** in this beat.
- **Escalate toward 1 consequence.** If you can swap any 2 lines and nothing changes, you wrote a list.
- About 10 to 15 seconds in a 60s script.
- Frame against an accommodation, never the affliction. No pity, no "sufferer" framing. This keeps brand teams on side.
- 3 ways in: the accommodation, the moment, or a failed solution (the last one locks the script into solution aware).

#### Beat 3: promise

- Answer "what do they get?" in 1 sentence.
- 4 failure modes to avoid: no promise; 5 promises; a feature posing as a promise ("6 clinically studied ingredients"); a promise bigger than the proof.
- A smaller promise you can prove outsells a bigger one you can't.
- Example: "This is about keeping what you've still got, not getting back what's gone."

#### Beat 4: mechanism

- Use the chain: **feature, which means promise, which is why mechanism.**
- Every promise needs one. "No crash" needs "L-theanine cancels the jitters."
- **Promise first, then mechanism.** "You stop thinking about food at 11am, because the ketones suppress ghrelin."
- Every physical product has a mechanism, because someone made a decision (fabric, construction, process, supplier). "Merino fibre is crimped, so it traps air, so it holds odour in the fibre and off your skin."
- Do not name the product category or brand before the mechanism lands, or you join the commodity pile.
- A contradiction ("coffee energy, no crash") is not a mechanism. Add the mechanism, move it to the hook, or cut it.
- No real mechanism? Switch to proof. Promise, proof, promise, proof.

#### Beat 5: objection

Handle objections in this order:

| # | Objection | Fix |
|---|---|---|
| 1 | This isn't for me | Persona-specific language |
| 2 | This won't work | Mechanism and proof |
| 3 | It might work, but not for me | Proof from this exact persona |
| 4 | It's not worth it | Offer, value framing, cost of not buying |
| 5 | What if I'm wrong? | Guarantee, risk reversal |
| 6 | I'll do it later | Urgency, reason for now |

Pre-empt objections inside the buyer's own experience. "You're going to react to this in week 1. Everyone does. That's why the first tube is only 0.05%." Only use experiences found in research.

#### Beat 6: proof

Proof ladder, strongest first:

1. Demonstration on camera, including before and after (check platform rules)
2. Third-party verification: clinical results, lab tests, certifications, real press
3. Volume of specific social proof: review counts, customer counts
4. Named individual testimony (can beat 3 in some niches)
5. Mechanism explanation (makes it plausible, not proof)
6. Founder assertion (only if the founder has standing)

**Proof must be bigger than the claim.** "Customers love it" is weak. "[REVIEW_COUNT] reviews. The word that comes up most is 'finally'" is strong, if true.

New brand with no proof: use demonstration, or seed 20 products to real users and quote their specific reviews.

#### Beat 7: offer

- Present the product, now it can be named.
- Frame the price (step 3).
- Make the effort small and concrete.
- Short at every length. Length never comes from the offer.

#### Beat 8: risk reversal

- Use the specific guarantee from step 3.
- Answer the nearly-didn't-buy from research directly.
- Skip below 60s if there is no room.

#### Beat 9: call to action

4 parts:

1. Name the action.
2. Say what happens next.
3. Price the effort.
4. Give a real reason for now.

Weak: "Learn more by clicking below." Strong: "Take the 60-second quiz. You'll get your size and 2 cuts that suit your shape."

#### Identity close (optional, recommended)

End on who the buyer becomes, tied to a real mechanism. "The women who keep it are the ones who started before they could see it." Identity without a mechanism is a lifestyle brand, not a performance ad.

### Step 7: write the hooks

Write 5 to 10 hook variants. Each must flow straight into line 2 of the body you wrote.

- **Pre-qualify, don't grab everyone.** Meta optimises toward whoever watches, so the hook decides who the ad gets served to.
- **Pile B, not pile A.** Pile A looks like an ad (polished, logo, "Introducing..."). Pile B looks native (lo-fi, a screenshot, a notes app, talking to camera). Most performance comes from pile B.
- **Marketing language makes pile A.** Drop ad-speak and a hi-fi visual can still feel native.
- **Use the buyer's word.**
- **The most specific detail can do 3 jobs:** targeting, proof and casting at once.
- **All hooks must agree:** first frame, spoken line, text overlay, primary text, headline and landing page top all carry 1 claim.

Hook types to rotate:

| Type | Example |
|---|---|
| Accommodation | You've stopped parting it in the middle. You didn't decide to. |
| Moment | The photo from behind is always the one that gets you. |
| Failed solution / contrarian | Rosemary oil was never going to fix your part. Here's why. |
| Curiosity gap | Why hair thins at the part line first. |
| Specific proof | (A real, measured outcome) |
| Truth bomb | This costs $120. Yes, it's expensive. Here's why it's our best seller. |
| Confrontation | You know that drawer full of products you never use? That's the problem. |
| Founder stakes | (A real risk the founder took) |
| Sensory | No words. 2 to 3 seconds of texture, sound or a satisfying action. |

For each hook, write a matching **first-frame visual** and **text overlay**.

**The first 3 seconds are 3 hooks at once:** what is seen, what is said and what is written. Write all 3 so that any 1 alone still pre-qualifies the buyer. Start mid-action. No logo, no greeting, no "so". The overlay is the buyer's word in 3 to 8 words, not a transcript of the spoken line.

**Grade each hook 1 to 5** on clarity, relevance (to the problem, not a persona call-out), novelty, specificity and credibility. Keep hooks with clarity of 3 or more and at least 2 scores of 4 or more. Rewrite the rest.

### Step 8: fix the bridges

Bridges are where retention falls off a cliff. Check the 2 big ones:

1. **Hook into body.** Never staple a stock hook onto a body. Read the hook and line 2 together.
2. **The moment the product appears.** Do not jump from education to "that's why [Brand] is your solution". Show the product visually first. Name it later, ideally in the offer.

Product awareness should ramp up through the script, not jump from 0 to 100. Good bridge lines:

- "The fix isn't a better shampoo. It's getting the follicle to stop shrinking."
- "3 things do that. The first is why most people fail."
- "You can buy those separately, and people do. Or you can take them all in 1 capsule."

Avoid "it's not X, it's Y" lines in the rest of the script. Use at most 1, and only as a bridge.

### Step 8b: write the visual track

A script that only works with the sound on is half a script. This track is also what the production prompts are built from.

- **Give every line a visual note:** what is on screen, who, where, what is in hand, the shot (selfie, close-up, over the shoulder, screen recording, animation).
- **Give on-screen text its own field.** The overlay for that line, exactly as it should appear. Leave it empty when captions are enough.
- **Change the picture every 2 to 4 seconds** in short ads: a cut, a new angle, a prop, a text change, a move closer. Long takes are fine in a story if something in frame keeps changing.
- **Show before you name.** The product can be in the creator's hand or on the counter from early on. It is named late (beat rules above).
- **Show the mechanism.** If the benefit is invisible, the mechanism line needs an animation, a diagram, a prop demo or a close-up. Say which.
- **Put proof on screen as itself:** the real review, the real lab report, the real count. Never a mock-up.
- **Put the offer on screen at the CTA:** price framing, guarantee and the action, readable with the sound off.
- **Captions on.** Keep text inside the 9:16 safe zone (clear of roughly the top 14% and bottom 20%).

### Step 9: emotion and identity pass

- Ask "so what?" after every line. The answer cannot just be the mechanism. People buy a version of themselves.
- **Join the conversation already in their head.** Where is their attention now? What register belongs there? What did they already feel?
- Translate each feature into an identity: "absorbs in 40 seconds" becomes "someone out the door at 6:30am".
- A script can be correct, pass every review, and still not make anyone want it. Fix that here.

### Step 10: voice pass

**5 rules:**

1. 1 idea per sentence.
2. Verbs up front, then what matters.
3. Remove complex words.
4. Shorter sentences.
5. Read it aloud at real speed. Every stumble gets cut. Every breathless sentence gets split. Every embarrassing line gets rewritten.

**6 sentence-level settings:**

| Setting | Default |
|---|---|
| Person | 1st for stories, 2nd for most scripts |
| Tense | Past for stories, present for mechanisms |
| Sentence length | Varied. Try long, long, short. All-short staccato reads as AI. |
| Reading level | Grade 7 or below. Higher only for expert audiences. |
| Contractions | Always (can't, don't, it's) |
| Last word of a line | A load-bearing word where possible |

Remove AI tells: em dashes, "it's not X, it's Y" chains, stacked rhetorical questions, words like "game-changer", "elevate", "seamless".

These are defaults. Where the brand's own voice differs (a word it uses, its rhythm, its length), the brand's voice wins. Only the facts, the offer terms and the guardrails outrank it.

**Register examples (same angle):**

- UGC: "I stopped parting in the middle. I didn't even notice I was doing it. That's the crazy part."
- Documentary: "She changed where she parted her hair about a year before she admitted it to herself."
- Diary: "I stopped parting in the middle today. I didn't decide to. I just started doing it."

### Step 10b: brand voice pass

The voice pass above makes a script sound spoken. This pass makes it sound like this brand talking to these customers. Run it on every script before anyone sees it (in the Creative Engine a separate checker, the `brand-voice-check` skill, does it and fixes what it finds).

1. Read only the voice material: the brand's voice do and don't lists, tone notes, key phrases, and the customers' own words from the research.
2. Go line by line. Flag any word or phrase this brand's customer would not say or would not hear from this brand: jargon, corporate or clinical wording, a register that is too old, too young, too formal or too salesy for them.
3. Replace it with the customer's word for the same thing. If the research has a phrase for it, use that phrase.
4. Change wording only. Never touch a claim, a number, an offer term or the order of the lines.

### Step 11: self-audit

Run every script through this before returning it. Fix failures. Report any warning you cannot fix.

Count the spoken words exactly, with code if you can run it, and report that number. Aim for 90 to 100% of the target: it is set from the speaker's pace, which is in the length guide below. Then list every number in the script and trace each to the brand brain or the research. Only say a check was done if you did it. If it was a judgement call, say so.

- [ ] Desire is evidenced in research, not invented
- [ ] Awareness and sophistication stages are labelled
- [ ] Hook uses the buyer's word, reads as pile B, flows into line 2
- [ ] Problem names an accommodation, speaks to 1 person, escalates, does not resolve
- [ ] Exactly 1 promise, before the mechanism (1st person stories may imply it)
- [ ] Every feature has a mechanism, or is swapped for proof
- [ ] Product not named before the mechanism lands
- [ ] Objections come from research, in the 6-step order
- [ ] Proof is bigger than the claim
- [ ] Price is framed. Effort is stated.
- [ ] Guarantee is specific and matches the mechanism's timeline
- [ ] CTA has action, next step, effort and a real reason for now
- [ ] Every line survives "so what?"
- [ ] Closes on identity tied to a real mechanism (or says why not)
- [ ] Contractions used, grade 7 or below, varied sentence length, no AI tells
- [ ] Word count fits the length at the speaker's pace (the length guide)
- [ ] No forbidden or untrue claims. No failure-mode guardrail broken.
- [ ] No invented quotes, numbers, stories or small "real life" specifics. No unsupported comparisons. Derived numbers have a basis. Placeholders flagged.
- [ ] The speaker can honestly say every 1st person line
- [ ] First frame, spoken hook and overlay each pre-qualify on their own, and agree
- [ ] Every line has a visual note. The mechanism is shown, not only said.
- [ ] The offer and guarantee are readable on screen with the sound off
- [ ] No personal-attribute assertions, no cure or guaranteed-result claims
- [ ] Nothing borrowed from a reference ad's wording or claims (no shared phrase of 6 or more words)

### Step 12: recommend the format

Pick the format after the script. Find the **load-bearing beat**, the one doing most of the persuading.

| Product's edge | Load-bearing beat | Formats that suit it |
|---|---|---|
| Invisible benefit (supplement, skincare actives) | Mechanism | AI animation or claymation, VSL, faceless educational, UGC that cuts to animation for the mechanism |
| Visible result (gadget, cleaning, beauty) | Proof | UGC demo, founder demo, before and after (where compliant) |
| Differentiated terms | Offer | Short UGC, static or carousel (hand off to the image ad skill) |
| A story with stakes | Problem | UGC story, VSL, founder story |

Formats can mix inside 1 ad: UGC talking head, then AI animation for the mechanism, then back to UGC. Most format failures are writing failures.

### Step 13: give the test plan

A script is a hypothesis. Say how to test it.

- **Name the 1 variable each variant changes** (hook, problem entry, person, proof type, offer framing, length).
- **Default first test:** 3 to 5 hooks on 1 body. Hooks move delivery the most and cost the least to shoot.
- **Say what result would mean what.** Use the metric table in `references/performance-playbook.md`: weak hook rate points at the first 3 seconds, weak hold at the bridge or problem, clicks without sales at the offer or the landing page.
- **Say what to make next if it wins:** a longer cut, a static of the winning hook (hand off to the image ad skill), a new persona on the same angle.

## Length guide

The pace follows the speaker's age, in spoken words a second: 3.6 under 30, 3.4 for 30 to 44, 3.2 for 45 to 59, 3.0 for 60 to 74, 2.8 from 75, and 3.3 when the age is not known. A calm pace is a sixth slower. The app works out the words for a length from this 1 table (`src/lib/pace.ts`) and gives them with the brief.

| Beat | 15s | 30s | 60s | 1 to 3 min | 5 to 10 min |
|---|---|---|---|---|---|
| Hook | 1 line | 1 line | 1 line | 1 line | 1 line |
| Problem | 1 line | 1 line | 1 to 2 lines | Several lines | A scene, 2 to 3 min |
| Promise | None | 1 line | 1 to 2 sentences | 2 sentences | 2 sentences |
| Mechanism | None | 0 to 1 sentence | 1 to 2 sentences | 2 to 4 sentences, can be most of the ad | Large block |
| Objection | None | None | 1 to 2 sentences | Several | Multiple blocks |
| Proof | None | 1 short | 1 piece | 1 to 3 pieces | 5 to 6 pieces, the full ladder |
| Offer | Short | Short | Short | Short | Short |
| Risk reversal | None | None | 1 line | 1 line | 1 line |
| CTA | 1 line | 1 line | 1 line | 2 to 3 lines | Several CTAs at intervals |

**Long scripts loop the beats.** Problem, promise, mechanism, objection, proof, then back to problem, about 3 times. A timeline device works well (day 7, day 14, day 30, day 90), each milestone solving 1 problem and opening the next. Treat long scripts as edutainment.

**Write for the length.** Never cut a 5-minute script down to 2 minutes. Write a separate 2-minute script. The bridges differ.

## Story ads

Story is not a beat. It is the vehicle that carries all 9 beats. Do not bolt a story onto a finished script.

| Story shape | Carries | Example opening (1st person) |
|---|---|---|
| Failed-solutions journey | Objection | I tried the rosemary oil, then the supplements, then my GP said nothing could be done. |
| Discovery | Mechanism | I found out why it happens at the part first, and it changed how I bought. |
| Transformation with a witness | Proof, identity | My sister noticed before I did. That's the bit that got me. |
| Confession | Problem | I stopped parting it in the middle about a year ago. I never told anyone. |

Rules:

- Inside a story, the viewer stops auditing you and starts finding out what happened. Every beat is still there.
- 1st person past tense performs best. 3rd person works for claymation and documentary.
- Do not resolve the story in the hook.
- Stories need stakes: something risked, lost or embarrassing. "I'd stopped going to the hairdresser because I thought she'd say something" has stakes. "I'd been looking for something for a while" does not.
- In a 1st person story the promise can stay implied before the mechanism.
- **If it didn't happen, it's fiction and must read as fiction.** Take stories from real customers and real history.
- Story ads need length. Under 30 seconds, use a straight script.

## Modes

### Review an existing script

0. If performance data is given, start there. Find the weakest metric, map it to its beat with the table in `references/performance-playbook.md`, and spend the rewrite on that beat. Leave what is working alone.
1. Label each line with its beat.
2. Go beat by beat. For each: what works, what fails, and the rule it breaks.
3. Run the 2 questions on every claim: is it true, and could the product next to it say the same?
4. Flag lines to delete outright.
5. Return a rewritten version in the AV sheet format, plus a short "what changed" table.

### Variants of a winner

1. Ask what the user believes makes it win. Keep those parts fixed.
2. Change 1 thing per variant: person (1st, 2nd, 3rd), tense, persona, problem entry, story shape, register, hook, or length.
3. Hook swaps are the cheapest variants. Give at least 5.
4. Warn when 2 variants are near-identical. Meta's Andromeda bundles similar ads and shows them to the same people, so near-duplicates add little reach.

### Change the length

Re-plan the beats from the length table and rewrite. Say which beats grew or shrank.

## Output format

Return markdown in this structure. Also return JSON when the user or calling app asks for it.

```
## [Script title]

Concept: [persona] × [angle] × [offer]
Awareness: [stage] · Sophistication: [1 to 5] · Length: [target] · Est. read time: [Xs]
Person and tense: [..] · Story shape: [..] · Register: [..]
Load-bearing beat: [..] · Recommended formats: [..]

| Beat | Spoken line | On-screen text | Visual note | Evidence |
|---|---|---|---|---|
| Hook | ... | ... | ... | [theme or quote ref, claim ref] |
| Problem | ... | ... | ... | ... |
| ... | ... | ... | ... | ... |

### Hook variants
| # | Type | Spoken hook | Text overlay | First frame |
|---|---|---|---|---|

### Test plan
- Variable under test: [...] · If it wins, make next: [...]

### Notes
- Spoken words: [exact count]
- Assumptions and placeholders to fill: [...]
- Self-audit warnings: [...]
- Compliance flags: [...]
```

JSON shape (for apps such as Creative Engine):

```json
{
  "title": "string",
  "concept": {"persona": "string", "angle": "string", "offer": "string"},
  "awareness_stage": "unaware|problem_aware|solution_aware|product_aware|most_aware",
  "sophistication_stage": 1,
  "length": "15s|30s|60s|2-3min|5-10min",
  "person": "first|second|third",
  "tense": "past|present",
  "story_shape": "none|failed_solutions|discovery|transformation_witness|confession",
  "lines": [
    {"beat": "hook|problem|promise|mechanism|objection|proof|offer|risk_reversal|cta|identity|bridge|retention",
     "text": "string", "on_screen": "string", "visual_note": "string",
     "theme_ids": ["research theme ids this line rests on"],
     "claim_ids": ["brand brain claim ids, required on mechanism and proof lines, substantiated claims only"]}
  ],
  "test_plan": "string",
  "hook_variants": [{"type": "string", "text": "string", "overlay": "string", "first_frame": "string"}],
  "load_bearing_beat": "mechanism|proof|offer|problem",
  "recommended_formats": ["string"],
  "est_seconds": 0,
  "placeholders": ["string"],
  "audit_warnings": ["string"]
}
```

## What this reads from the brand brain

| Need | Document and field | When it is blank |
|---|---|---|
| The buyer's own words, the accommodation, the moment | `customer-avatars.md`: Grounded in, Customer language bank, The moment | Ask. For a draft, mark every assumed insight `[ASSUMED]` and quote nobody. |
| What nearly stops them, what they tried before | `customer-avatars.md`: What almost stops them, Tried before | Use the first doubt of the way the product is bought, and say it is assumed. |
| The mechanism | `products-and-positioning.md`, per product: Key features, How it is used, How it is made | Switch to proof: promise, proof. Never make up how it works. |
| The proof, with its source | `brand.json`: claims with sources, proof assets; `products-and-positioning.md`: Visible result | A demonstration, or a placeholder such as `[REVIEW_COUNT]`. |
| The offer | `offers.json`; `brand.json`: guarantee; `products-and-positioning.md`: Pricing summary, Bundles and offers, Buying pattern | `[PRICE]`, and no guarantee is stated. |
| Voice and guardrails | `brand-guidelines.md`: Brand voice and tone, Brand guardrails | Plain spoken English, and no claim beyond the product facts. |
| Stage | `brain.md`: Brand diagnosis | Pick 1 and state it. |

## Worked example

This example is a product that is used up and reordered. A worked example for a product bought once (a cast-iron pan) is in `video-ad-copywriter`.

Product: a hair-thinning supplement for women (demo brand). Research found:

- Accommodation: stopped parting in the middle.
- Moment: a wedding photo from behind.
- Failed solution: 4 months of rosemary oil.
- The word: "shedding", "my part", never "hair loss".
- Nearly-didn't-buy: burned twice before.
- Review word: "finally".

**Before (weak):**

> If you're finding more hair in the shower drain, you're not imagining it. Women lose it at the part line first, which is why we made [Brand] with 6 clinically studied ingredients, vegan, cruelty-free and made in Australia. Head to the site and grab yours.

What's wrong:

- Symptom, not accommodation.
- No promise.
- A feature instead of a mechanism.
- The product is named too early.
- 3 claims every competitor can make.
- No proof, no offer terms, no risk reversal.
- A dead CTA.

**After (60s, 1st person, past tense, problem aware, sophistication 4):**

| Beat | Spoken line |
|---|---|
| Hook | I stopped parting my hair in the middle about a year ago. I didn't decide to do that. I just started doing it. |
| Problem | Then I saw a photo from my sister's wedding, from behind, and I understood what I'd been avoiding. |
| Mechanism | Here's what I didn't know. The follicle shrinks a bit every cycle because of DHT. Every cycle the hair comes back finer, until 1 cycle it doesn't come back at all. |
| Promise | This is about keeping what you've still got, not getting back what's gone. |
| Objection | I'd done the rosemary oil. 4 months. My pillowcase smelled and nothing happened. |
| Mechanism | 3 things slow it down. Saw palmetto blocks the enzyme that makes DHT. Rosemary keeps blood at the root, which is why the oil half worked. A keratin precursor gives the follicle something to build with. |
| Proof | [REVIEW_COUNT] people have reviewed it. The word that comes up most is "finally". |
| Bridge + offer | You can buy those 3 separately, and people do. Or take 1 capsule at night. It's the 90-day pack, because the cycle is 90 days. About [PRICE_PER_DAY] a day. |
| Risk reversal | If your part hasn't changed, send back the empties and they refund all 3. |
| Identity | The women who keep it are the ones who started before they could see it. |

The mechanism comes before the promise here because it is a 1st person story, where the promise stays implied until it lands naturally.
