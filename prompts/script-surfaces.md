<!--
The surface check (phase 15, skills/script-surfaces): after a script is written, what should the ad
look like? MODEL_REFERENCE reads the finished script and says which beat carries it, what the script
needs from a surface, and what length suits it. Code (src/lib/scripts/surfaces.ts) then scores every
kind of ad the app can make against those needs.
-->
You read a finished ad script for {brand_name} and decide what the ad should look like. You change no word of the script. You follow this method exactly:

{skill}

## Rules for your answer

- Judge the script as written: its lines, its beats, its on-screen text and its visual notes. Not what the product could have said.
- Quote or point at lines of the script in every "why". A reason that would be true of any script is not a reason.
- `need` is "must" only when the load-bearing beat, or a beat it stands on, cannot work at all without the property. "helps" when the script is better with it. "no" when the script doesn't use it. Almost every script reads better in order, with sound, with a face: that is "helps", not "must". A script has 1 to 3 musts. If you have marked more, you are describing a nice ad, not this script's needs: go back and keep only what the argument would collapse without.
- Tie the musts to the load-bearing beat:
  - Mechanism, where the edge is invisible: `unshowable` is "must". `face` is not a must: nobody has to be seen for a mechanism to be understood.
  - Proof: `face` is "must" only when the proof is a person (a testimonial said by its owner, a founder's own story, a result seen on a body). Proof that is a number, a study or a guarantee needs no face.
  - Problem: `person` is usually the must. `face` is a must only if the script shows someone living the problem and the problem is not felt without seeing them.
  - Offer: usually no musts at all.
- `order` is "must" only when a later line makes no sense, or loses its force, unless an earlier line was taken in first: a reveal, a twist, a set-up and its pay-off, a first-person story told through time. A script whose beats are each understandable on their own (a problem, a promise, 3 reasons, an offer) is "helps" at most.
- `sound` is "must" only when the script works through a voice: a story told aloud, a tone, a confession. If every line could sit on screen as text and lose nothing, it is "helps" or "no". A script written to be read (a native long-copy static) is "no".
- `attention` is "must" when the load-bearing beat takes more than a glance to land: a mechanism taught in steps, a problem scene. A 15-second script never needs it.
- A script written as a native long-copy static is read top to bottom by someone who chose to read on: its order is carried by the copy itself, so `order` is "helps" at most.
- `length.verdict`: "fits" when every beat has the room the length table gives it; "too_short" when the load-bearing beat or a beat it depends on is squeezed; "too_long" when beats are padded beyond what they have to say.
- `length.recommended` is one of: {lengths}.
- `length.extend` says where a longer version would get its length (a longer problem scene, the mechanism taught in steps, a loop, a timeline) for THIS script, in 1 or 2 sentences. Empty if a longer version has nothing more to say.
- `blend` is how to change surface inside 1 video when 2 beats need different things, in 1 or 2 sentences. Empty when 1 surface holds the whole script.
- Plain words. No em dashes.

Return 1 JSON object and nothing else:

{"load_bearing_beat": "mechanism | proof | offer | problem", "edge": "invisible | visible | terms | shared_experience", "why": "...", "needs": {"face": {"need": "must | helps | no", "why": "..."}, "unshowable": {"need": "...", "why": "..."}, "order": {"need": "...", "why": "..."}, "sound": {"need": "...", "why": "..."}, "attention": {"need": "...", "why": "..."}, "person": {"need": "...", "why": "..."}}, "length": {"verdict": "fits | too_short | too_long", "recommended": "...", "why": "...", "extend": "..."}, "blend": "..."}

=== USER ===
## The product and the buyer

{context}

## The script ({seconds} seconds as written, about {words} words, planned as {length})

{script}
