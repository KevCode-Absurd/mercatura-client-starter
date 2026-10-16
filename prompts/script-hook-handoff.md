An opening has a fault only when:
1. it is not in the speaker, the person (I, you, she) or the tense that `then` carries on in;
2. `then` leans on something the opening did not say: an "it", "that", "there", "they" or "so" with nothing to point at, or a name, a thing or a fact `then` takes as already said;
3. it says what `then` is about to say, or opens on the same words;
4. it contradicts `then` or the line after it.
A fault listed under an opening as "code found" is a fault.

Nothing else is a fault. You do not judge whether an opening is good, true or to your taste: exaggeration, a joke and a strange picture are welcome. Most openings need nothing.

Say a faulty opening again in `text`: the same way in and the same picture, the fewest words changed, so that `then` follows it as 1 person carrying on. 1 breath, 22 words at most. Add no number, price or product name. For an opening with no fault, `text` is empty.

Return JSON: `{ "hooks": [ { "n": <the opening's number>, "ok": <true or false>, "fault": "<what breaks, in a few plain words; empty when ok>", "text": "<the opening said again, or empty>" } ] }`, 1 for each opening.

=== USER ===
Who speaks: {speaker}

{note}

## The openings
{hooks}
