{floor}

**Do not invent facts.** Only these are facts: a specific number or price, a study or a test, what the product does to a body, what is in the product (an ingredient, a material, a part), anything about a named competitor or other product, a rule stated as proven truth, and the terms of the offer. Each comes from the ad and the brief below, exact, or is not said. Everything else is yours: exaggerate, joke, be sly, use a metaphor, say the everyday thing anyone would nod at, make up the scene, the feeling and the speaker's small story. Run wild with it. Nothing that smears a person or a brand.

Read the whole ad first, as the buyer below would hear it. Know what it turns on. Then find what the body leans on from the opening, and write it down in `leans_on` before you write a hook:
- what the first body line needs to have been said for it to make sense (a word like "it", "that", "there", "so", "and" at its start points back at something: name the thing);
- every later line that calls back to the opening (an object, a place, a phrase, a moment the ad returns to at its end), with its line number.
Then write each opening for that ad and no other.

{ways}

{variety}

**It hands off to the body.** Read your opening, then the first body line after it, aloud. It must sound like 1 person carrying on:
- the same speaker, the same person (I, you, she) and tense as the ad;
- no fact (the short list above), promise or named product the ad does not state, each figure said the way the ad says it, and nothing that contradicts the body;
- it does not say what the next body line is about to say, and it does not give away the turn or name the product before the ad does;
- everything in `leans_on` still holds. The first body line after your opening must make sense with only your opening before it: every "it", "that" and "there" in it points at something you said. A later line that calls back to the original opening must still land.

A hook from somewhere else than the opening's picture has 2 tools, used as little as possible:
- `replaces`: how many opening lines yours stands in for. Normally 1. Make it 2 when line 2 only makes sense after the original line 1; your hook then leads into line 3. Never more than 2, and never a line that carries the product, the turn or a fact.
- a bridge: when 1 later line calls back to the original opening and would no longer land, return that 1 line with the fewest words changed so it calls back to your opening instead, or to nothing (`bridge_line`, `bridge_text`): 1 clause changed, the same facts, about the same length. 1 bridge at most. A hook that would need 2 is not written.

**How it is said.** Something a person would say out loud to 1 friend, in 1 breath: 15 words or fewer where it can be, never over 22. Words at school grade {grade} or below. {terms} The buyer's situation first, not the brand's name. No slogan, no coined phrase, no mirrored saying of 2 matching halves, no "what if I told you", no "here's the thing", no "it's not X, it's Y", no question that only has yes for an answer, no em dash, no list of 3. If a line could open an ad for any brand in the category, write another.

For each: `way` (2 or 3 words naming the form), `image` (the 1 thing or place it opens on, in 2 to 4 words, different for every hook), `text` (the opening as said), `overlay` (the words on screen with it, or empty), `first_frame` (the shot it opens on: who and what is in frame; an adult, a hand, a place, the real product only if the ad's own opening shows it), `replaces`, `then` (the body line that is said straight after your opening, copied word for word: read the 2 together before you return them), `bridge_line` (the number of the body line that changes, or 0), `bridge_text` (that whole line as it should be said, or empty).

Return JSON: `{ "leans_on": [ "<line number, and what it needs from the opening>" ], "own_image": "<the thing or place the ad's own opening shows, in 2 to 4 words>", "hooks": [ { "way": "", "image": "", "text": "", "overlay": "", "first_frame": "", "replaces": 1, "then": "", "bridge_line": 0, "bridge_text": "" } ] }` with exactly {count} hook{plural}, strongest first.

{selling_principles}

=== USER ===
## Who it is for, and the story
{brief}

{brand_voice}

{lessons}

## Openings the ad already has (do not reword these)
{have}

## The ad (line number | words). Line 1 is its opening.
{script}
