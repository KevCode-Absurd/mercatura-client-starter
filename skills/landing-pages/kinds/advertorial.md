<!--
What the landing page writer is sent, on top of CARD.md, when the page is an advertorial
(src/lib/landing/write.ts). First taken from skills/advertorial-v1; rewritten for PB-03 from the
Advertorial Playbook (docs/ecommerce-playbook/ai/the-advertorial-playbook-ba8f), in this app's terms, and kept in step with skills/script-format-advertorial (the ad that
sends the reader here) and skills/indirect-ads (the cold-traffic ad that always lands here). Where the
playbook allows a publication masthead or a made-up narrator, this card does not: see "Who is telling
it". The page is marked "Advertisement" by the renderer, and its byline is the brand's own name with a
read time. The writer fills the fields a section has and cannot add a section.
tests/phase33-sets.test.ts reads 1 sentence of "Who is telling it" word for word.
-->
## This page is an advertorial

It is read by someone who does not yet know they need the product. A homepage is built for people who already know the brand; a product page answers "what is this and how much", which a cold visitor has not asked yet. This page does one job: it moves her from "who are you" to "I want this" before she sees a price. It reads like an article and sells like a landing page. It is advertising and is marked as advertising: it never claims to be a publication, a news item or a review.

Article mode is what buys the thirty seconds an argument needs. The page opens with a byline and a read time (the renderer adds them), so it is read patiently, top to bottom, not skimmed for the price and the catch.

- **The headline** follows 1 of 4 formulas. Write all 4 (`headlines`, in the order switch, gift, revelation, alternative) and pick 1 (`headline_pick`), because the fill-in exercise shows which story the product has. 8 to 14 words. Name the audience, not "everyone", and the problem, not the feature. It should be a headline she would read on a day she was not shopping; if it only works on someone already in-market it is an ad, not an advertorial. On a page for an ad, the hero keeps the ad's exact claim (message match: the page opens with the claim the ad made), and the 4 are the test queue.
  1. The switch: Why [audience] are switching to [product] because of [differentiator]. When there is a clear old way and new way.
  2. The gift: Why this is the [occasion] gift [audience] actually wants. Strong gifting demand or a seasonal spike.
  3. The revelation: Why [audience] with [specific problem] can't stop buying [product]. The product solves a long-running frustration.
  4. The better alternative: Why [audience] are ditching [old category] for [product]. A clear upgrade from a commodity.
- **The eyebrow** is 3 to 6 words that name the reader or the subject, not the brand.
- **The lede** (the story section's paragraphs) does not mention the product. Two or three sentences describing her situation so precisely that she assumes you have already solved it. The product enters at reason 1.
- **What people try first** (the problem section's "agitate" list): 3 to 6 things, named plainly, and why each falls short. Said in 1 place only. Kinds of thing, never rival brands.
- **The supported reasons** (the reasons section) are the persuasion, and they are objections, not features. Five features argue with nobody. Take the doubts given below, most frequent first; the most common doubt is reason 1, because it is the one most likely to end the visit if it goes unanswered. Use only distinct reasons supported by supplied evidence. A focused answer may need fewer. Each:
  - a benefit-led heading of 6 to 10 words that answers the doubt, specific to this product, never generic: not "Is it safe?" but "Every batch tested by an outside lab, and the results are public"; not "Great value" but "One jar replaces the two products already on your shelf";
  - 3 short paragraphs in `body`, separated by a blank line, 2 to 4 sentences each: the first states the answer, the second gives the mechanism or the evidence, the third ties it back to her day;
  - 1 image, of the thing the reason is about (code places the slot).
- **Proof goes where doubt peaks**, not in a block at the bottom. Reasons 2 and 4 carry a customer's words (code takes the quote by number from the list: pick the one that says the reason's own claim back in a buyer's words). What counts as proof, strongest first: a real customer's words that name the objection out loud; a rating with a real count, near the claim it supports; a third-party test or certification the facts hold. Four proof tiles across the page is the right number. Never write a quote yourself.
- **The FAQ** is the last doubt-clearing pass: 6 to 8 questions she actually asks before buying (the doubts below, the questions support is tired of answering), after the reasons and before the offer. Answer plainly and briefly; a hedge creates the doubt it was meant to remove. If the honest answer is "this is not right for you if", say that.
- **The buy box comes last**, after the reasons and the FAQ, and it asks "which of these two", not "yes or no". Two plan cards (code draws them): the one the page wants filled and wider, with the only filled button; the other outlined. Name the offer as the facts give it. The value stack lists what is included; a price on a line only when the facts state it, and the struck-through anchor is the honest sum of what she receives, never an invented "was" price. Under the button: the cadence, the guarantee and how to pause or cancel, in the offer's own words. The price appears once, here.
- **No call to action before the product has been explained.** From the buy box on, the sticky button stays in view.
- **Who is telling it.** Write it in the brand's own voice, about the reader ("you") or about buyers like them ("they"). It is told in the first person by the founder only when the founder's own words are in the facts, and by a customer only as a quote given to you, word for word. Never write a made-up founder, customer, doctor or journalist, and never an author line with a name that is not in the facts.
- **Borrowed authority is out:** no publication name or masthead, no "as seen in", no study, statistic, count, certification or date that is not in the facts. Editorial framing raises trust, so a false claim does more damage here than in an ad.
- **Urgency** only from a real, dated, named offer in the facts. No countdown, no "while stocks last" without a count. A fake clock spends the trust nine blocks earned.
- **Reviews** are the customer quotes given, by number. If none is given, the proof is what the brand can state.
- A bundle is shown only if the offers given include one. The offer is the one the ad named.
- **The writing** has to survive a real reader. No em dashes (the count on the finished page is zero). None of: elevate, unlock, delve, seamless, game-changer, revolutionize, "in today's fast-paced world". Break the rhythm: a four-word sentence next to a long one; no three-item lists by habit. Read every reason as if out loud; a press release gets rewritten. Specific beats impressive: "it fits in the door of the fridge" is worth more than "thoughtfully designed for modern living". 2 sentences a paragraph at most, and every paragraph earns the next.

**The pre-publish check** (code runs it on every save): zero em dashes, a supported reason count, real proof where relevant to the doubt, the price once at the end, the lede names nothing, a formula headline of 8 to 14 words, 6 to 8 real questions, every number one the brand states, no invented urgency, the hero carries the ad's words.
