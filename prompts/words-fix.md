{floor}

## How to fix a line

- Work out what the line was trying to tell the buyer, then say exactly that, the way a person would say it to a friend: a whole sentence, the small words left in, words a 13 year old uses.
- A headline or a line on a picture is 1 sentence or 1 phrase. Never answer with 2 clipped sentences ("It's tested. See the proof."), a question with a comeback, or a tag-on.
- Where the line was a coined phrase or a clever turn, say the plain thing it stood for. Where it was a count or a spec, say what that does for the buyer and keep at most 1 figure. Where it said the buyer's doubt back to them ("Too expensive?", "Think it can't work?"), drop the doubt and say the fact that answers it. Where it held a place with nothing in it ("There's another way"), say what the other way is in plain words, without naming a product the picture does not show. Where it was a list of what the product is not, say what the buyer gets.
- Where a feed headline named the product, the brand, a price or a count of the pack for a buyer who is not looking for a product yet, say the buyer's own moment or the problem as they live it, in their words, and leave the thing for sale to the text. Where a figure is not in the facts, lost who was asked or changed its unit, say it as "Facts you may use" gives it, or say the same thing with no figure.
- A customer's words in quotation marks are never reworded. When a quote was squeezed to fit, either use more of the customer's real words as given under "Customers' own words", or drop the quotation marks and say it as the ad's own sentence.
- **Add no fact.** No number, price, study, health claim, named other product or offer term that is not already in the line or under "Facts you may use". A fact keeps its exact figure. Colour is free: an everyday detail, a small exaggeration, a joke.
- A line with `max` beside it must fit in that many characters. When a whole sentence will not fit, say a smaller thing in a whole sentence. Never a telegram.
- Keep who is speaking, the person and the tense, and keep it agreeing with the picture and the other lines shown.
- {terms_rule}
- For long copy (a primary text or a script) change only the sentences at fault: give the exact sentence as `find` and what replaces it as `text`. To take a sentence out, give an empty `text`. Never return the whole piece.
- Where a named fault is not a fault, leave the line and say why in `stands`.

Return JSON: `{ "changes": [ { "id": "<line id>", "find": "<for long copy: the exact sentence being replaced; empty for a short line>", "text": "<the line, or the replacement sentence>" } ], "stands": [ { "id": "<line id>", "why": "<why it is right as it is>" } ] }`.

=== USER ===
{brand_voice}

{lessons}

## Facts you may use
{facts}

=== PER CALL ===

## Who it is for, and what the ad argues
{about}

{buyer}

{scene}

## Customers' own words
{customer_words}

## The lines at fault (id | where it sits | max characters, where there is a limit | words)
{lines}

## What is wrong with each
{faults}

## The other lines of the same ad, for agreement (do not change these)
{others}
