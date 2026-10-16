{floor}

- The fewest words changed. Say the line again, merge it into its neighbour, or cut it (empty text) where the ad reads on without it. The ad's only next step is never cut, and neither is the only term of the deal the ad states, unless the fault named is that the deal is said at all.
- **Do not invent facts.** A fix adds no number, price, study, health claim, named other product or offer term that is not in "Held facts" below or already in the lines shown. Where such a statement rests on no held fact, take the statement out of its line or say only what is held, with its number exact. Colour is not a fact: an exaggeration, a joke, a metaphor or an everyday observation stays as lively as it was.
- A fault of sense is fixed against the story as given: the patched line agrees with the buyer, the before, the turn, the after, and every line shown. Where 2 lines disagree, change the starred one to fit the other, or cut it. Do not answer a contradiction with a new detail.
- A fact fault is fixed by saying less: take out the words that go beyond the held fact, and keep the line and its scene (the figure goes, the line stays; a fact fault is never a cut). Do not answer it by reading the fact out, and add no figure the line did not have. At most 1 figure to a sentence.
- Do not add the offer, a price or a guarantee to an ad that states none, or more terms to one that states some: how much of the deal is said was chosen for this buyer. Where a line claims something about cost and no price is said, reword the claim; do not bring the price in.
- Never remove proof that is held: a figure, a study, what happened or a customer's words that answer a doubt stay, in the starred line or the one beside it, and a merge or a cut keeps them.
- Keep the speaker, the person and the tense. The patched line still follows the line before it and leads into the line after.
- It is talk, said in 1 breath (28 words at most), at school grade {grade} or below. A long sentence joined by "and", "so" or "because" is how people talk: keep it whole, and where one is too long for a breath end it where the speaker would breathe, with its joining words kept. Never turn 1 told sentence into 2 flat ones.
- A patch coins nothing. No mirrored saying of 2 matching halves ("a budget you hate is a budget you break"), no slogan, no "it's not X, it's Y" (also not across 2 sentences), no row of "no this, no that", no em dash, no fragment left behind. A line that had one of these is said as the plain thing it means.
- Where the story says the buyer does not know the answer yet, a technical term is said as what it does, in plain words. That is the held fact said plainly, not a new fact.
- A line with no `*` is changed only when a merge needs it.
- Where a named fault is not a fault, leave the line and say why in `stands`.

Return JSON: `{ "changes": [ { "line": <number>, "text": "<the whole line as it should be said, or empty to cut it>" } ], "stands": [ { "line": <number>, "why": "<why it is right as it is>" } ] }`.

=== USER ===
## The story (who it is for, and how it goes)
{about}

{brand_voice}

{lessons}

## Held facts that bear on these lines
{facts}

## The faults
{faults}

## The lines (line number | words). `*` marks a line with a fault.
{lines}
