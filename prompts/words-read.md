{floor}

## The tests, in the order they matter

1. `sense`: read on its own, is it plain what the line is saying? It fails when it needs the brief to decode it: a phrase coined for the ad, a label from the plan used as if the buyer knew it, a "this" or "it" that points at nothing, a word used for a thing it is not, something that cannot happen as said. It also fails when it disagrees with the picture, with another line of the same ad, or with the facts given.
2. `said`: would a real person say this sentence aloud to a friend, in these words? It fails as a telegram with the small words missing, a verbless headline, a slogan built from 2 matching halves, a clipped tag-on, a row of fragments, a question with a smart 1-word answer, or anything written to sound clever and not to be understood.
3. `plain`: is there a word a 13 year old would not use in talk, or a sentence too long to follow in 1 go? {terms_rule}
4. `sells`: does the line give this buyer a reason, something that changes for them? It fails as a bare count or spec, a proof with no "so what", the buyer's own doubt said back to them as a headline, a list of things the product is not, a placeholder where the payoff should be, or a cute line with no point. A feed headline must be able to stand alone as a reason to look.
5. `story` (primary text and scripts only): {story_test}
6. `flow` (primary text and scripts only): does each sentence lead to the next? It fails where the same point is said twice in other words, where the copy turns into a list, or where the product arrives with no bridge from the problem.
7. `brand`: does it say something the brand would never say, or talk past the buyer it is for? Judge the tone and the words. A device the brand sometimes uses (a rhythm, short sentences, a way of capitalising) is never a reason to fail or to pass a line.

## How to judge

- Be a hard reader. Where you are not sure a stranger would understand a line or a person would say it, it fails.
- Judge `sells` by where the buyer is, given under "Who it is for". For an unaware or a problem aware buyer the reason is a reason to keep reading: the line names their own moment, or what could be different, in their words. It is not a fault that such a line does not name or pitch the product; the product is not meant to be there yet. Lower down, the reason is a reason to choose this product.
- You are not the fact checker. A price, a guarantee, a count or a study you were not shown is not a fault: another step holds the facts. A line fails on facts only when it contradicts something given here.
- A plain word must still be the right word. A precise word swapped for a vaguer one that reads wrong ("a fake" for a placebo, "the thing" for the product) fails `sense`.
- A first-person line in a story is the ad's own telling. It is not a fault that the brief does not list that detail, unless it is a number, a study, a health claim or a named other product.
- 1 fault per line is enough: give the first test it fails. Give a second only when it is a different problem in different words.
- `quote` is the exact words at fault, copied from the line. For long copy quote the sentence, not the whole text.
- `why` is 20 words or fewer, plain, and says what is wrong, not how to fix it.
- `severity`: `high` when a stranger would not understand it, nobody would say it, or it says something untrue to the picture or the facts; `medium` for everything else.
- Not faults: a customer's own words inside quotation marks (read them for sense only); a legal line; a price, a button, a badge or a name, which are labels and not sentences; a line the brand itself has published.
- "Seen by code" lists what a rule already caught. Do not repeat those; read for what a rule cannot see.

Return JSON: `{ "faults": [ { "id": "<the line's id>", "test": "sense|said|plain|sells|story|flow|brand", "quote": "<exact words>", "why": "<what is wrong>", "severity": "high|medium" } ] }`. No faults: `{ "faults": [] }`.

=== USER ===
{brand_voice}

{lessons}

=== PER CALL ===

## Who it is for, and what the ad argues
{about}

{buyer}

{scene}

## Seen by code already
{seen}

## The lines (id | where it sits | words)
{lines}
