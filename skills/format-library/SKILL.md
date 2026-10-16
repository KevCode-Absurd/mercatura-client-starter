---
name: format-library
title: Format Families
description: The 7 families every static ad format falls into (borrowed interface, borrowed authority, the comparison, the list, the negation, the offer, the craft object), each with when to reach for it and how it breaks. How to pick a format against a gap and not a mood, the rule of testing 2 formats from 2 families against what already runs, the 5-line format brief written before an ad is built, the log of claims cut so they do not come back, and the count rules of the statics that are easiest to get wrong (labelled callouts, this against the usual way, 3 benefits, cost for each use, press).
---

# Format families

Written for this app from the playbook's "The Format Library: 42 Ad Formats, 7 Families, and the 10 Worth Testing Now", "Five Ad Formats to Run Next Month" and "The Static Ad Factory" (under `docs/ecommerce-playbook/ai/`). The code is `src/lib/formats/`.

In the app nothing new has to be learned to use this. Each static ad's **Format brief** is on its card in Advanced view; **Coverage** has 1 card that counts the ads made here by family and names the 2 to test next; the same is read out by "/" → Format Families in the chat.

## 1. A format is a container, not a claim

A format is named for what it pretends to be: a note, a receipt, a review, a warning. Taking a format that worked for another brand means taking its skeleton and putting in a claim this brand can hold. The claim that came with it is not part of the format.

## 2. The 7 families

| Family | What makes it one | Reach for it when | It breaks when |
|---|---|---|---|
| Borrowed interface | It looks like a screen or a printed surface the viewer already trusts | Cold traffic is lost in the first second | The borrowed screen is not exact: the viewer catches the fake instead of reading |
| Borrowed authority | Someone other than the brand appears to be talking | The doubt is trust, not interest | The source did not say it. The 1 family that can cost more than a lost test |
| The comparison | 2 states in 1 frame; the viewer does the sum and so believes the answer | There is a real difference and nobody is doing the sum | The 2 states are not shown the same way |
| The list | A counted or ranked structure that promises a short read | The product needs several reasons, not 1 | The number is padded: 7 weak reasons do worse than 3 real ones |
| The negation | The ad argues against itself, so the viewer stops defending | The audience knows the product and is sceptical | The negation is not answered in the same frame |
| The offer | The price is the creative | Inside a window with a real start and end | It runs all the time |
| The craft object | Visibly made by a hand | Everything around it in the feed looks rendered | The craft is too clean |

The app does not add 42 formats. It files the static formats it already makes under these (`FILED` in `families.ts`): its kinds of concept ad, the layout types of the reference library and the native image types. A product or lifestyle photograph with no container has no family, and is counted as plain.

**The app's lines on the 2 riskiest families.** A borrowed interface is the app's own design of a note or a thread, never a real platform's interface or logo. Borrowed authority uses real words from a real source, word for word, with that source: a review from the research, a piece of press the brand holds. No masthead of a real publication, no invented reviewer, no "as seen in" without the placement.

## 3. Pick against a gap, not a mood

| If this is true | Reach for | Because |
|---|---|---|
| Everything running is product or lifestyle photography | The comparison or the list | Atmosphere without an argument. These put a reason to buy into the frame |
| Cold traffic never gets past 2 seconds | Borrowed interface | It does not read as an ad for long enough for the hook to land |
| People like the product and still do not buy | The negation | There is an objection nobody says. Raise it first, then answer it |
| You are the expensive option | Borrowed authority or the comparison | A doubt about price is settled by someone else saying it, or by the sum |
| Retargeting is tired and discounts cover for it | The craft object | Effort is a reason to look again. A 4th discount card is not |
| Reviews hold a real, specific, repeated complaint | The negation | Saying it first turns the complaint into credibility |

## 4. Test 2, not 6

1. Count first: tag every ad by family. Most accounts have 4 of the 7 empty and 2 doing all the work. The empty ones are the brief.
2. Pick 2 formats from 2 different families. 2 from the same family are 1 test with extra steps.
3. Write the 5-line brief for each, with the line on how it goes wrong.
4. Run each against what already runs, not against each other.
5. Give it enough spend to be wrong. The playbook gives no figure.
6. Keep the winner, and put the next rotation in the calendar the day it starts working.

The failure this prevents: 6 new formats in 1 week, the spend split 7 ways, and nothing learned. The offer family is not suggested as a gap to fill: it is for a window with dates.

## 5. The format brief, 5 lines, before anything is built

| Line | What goes in it |
|---|---|
| Format | The name of the format and its family. Not a mood |
| What is staged | The object or screen being made, described so a stranger could set it up |
| The one line | The single piece of copy the format exists to deliver. If it needs 3 lines, it is the wrong format |
| Where it goes wrong | How this ad fails, written before it is built |
| Why it might work | Why on this brand, traced to something real: a review theme, a repeat rate, an objection buyers raise. Never "it is trending" |

The app fills the first 4 from the ad's own plan and its family, and the 5th from what the ad answers for the buyer and why its layout was chosen.

## 6. Claims cut stay cut

When a claim is taken out of an ad because the brand cannot hold it, that is written down on the set. Every later round of the set is told what was cut and not to bring it back, in those words or others. So round 3 cannot quietly return what round 1 removed. Where a cut leaves a slot empty, the slot takes a fact the brand does hold or stays empty: never a made-up credential.

The playbook's worked cases: "as seen in" with no placement on file is cut; "clinically proven" with no study is cut; a 5-year warranty where the real one is 2 years is rewritten to 2. In this app the claims read runs only on a set with **Check claims** on, so that is where the log fills.

## 7. Count rules for the statics that go wrong most

- **The product, labelled** (callouts): exactly 4 labels. 3 is thin; 6 is a diagram nobody reads. 2 or 3 words each, in the order the buyer's doubts come, each line landing on the part that does the job. It fails by overfilling.
- **This against the usual way:** 4 or 5 rows, each a real difference. 1 row is the weakest true one, where the usual way is as good or better: 1 concession buys the other 4. The price is a row, never the headline. Both columns shown the same way. The usual way is unbranded: no competitor is named.
- **3 benefits, ticked:** exactly 3, each true of this product and not of every product like it. A line that would still be true under a competitor's logo is a spec.
- **What it costs each time:** 1 number each side. It needs the real price and the real count of uses.
- **What the press said:** only with a real placement the brand holds, quoted word for word. With none, the ad is not made.
- **1 number that proves it:** a number the brand holds, with what it counts and where it is from.

## 8. Rules every static clears

A picture that stops the scroll; a headline of 6 to 10 words; 1 clear benefit or promise; 1 buyer; a clean layout; 1 angle; written for someone who has never heard of the brand. In 1 second it answers: what is it, who is it for, why should I care.
