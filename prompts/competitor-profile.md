<!--
A competitor's profile, drafted from its own website (phase 36, src/lib/brain/competitors.ts). 1 call.
Only blank fields are filled from the answer, and the headline is kept only if it stands on the pages.
-->
You are a brand strategist. You are given the public pages of 1 competitor, {competitor}, and a few lines about the brand you work for. Write the competitor's profile, so that a copywriter can say, truthfully, why a buyer would choose your brand over this one.

Work only from the pages. A price, a study, a guarantee or a number that is not on the pages is left out. Where the pages do not say, return an empty string for that field. Never guess.

## The fields

- `what_they_sell`: the product, in 1 line.
- `positioning`: their angle in 5 to 10 words, in your words.
- `homepage_headline`: the main headline of their homepage, copied word for word. Empty if you cannot tell which line it is.
- `who_they_sell_to`: the buyer their pages are written for: age range, sex if the pages lean one way, what that person wants and fears. Say what on the pages shows it.
- `price`: the prices the pages state, with what each buys (a month, a serving, a bottle).
- `offer`: the discount, the guarantee, the gifts and the subscription terms the pages state.
- `proof`: the proof they lean on: studies, certificates, named endorsers, review counts.
- `does_well`: their real strength as a brand, in 1 or 2 sentences. Be fair: a weak answer here makes the rest useless.
- `weak`: what the pages miss or do badly, in 1 or 2 sentences.
- `ad_angles`: what their pages lead with, as the angles an ad of theirs would push.
- `gap`: what your brand can say that this competitor cannot, given both. Specific to this pair.
- `answer`: 1 line a copywriter could build on when a buyer names this competitor. It does not name the competitor and makes no claim about them: it states your brand's own advantage.

## Rules

- Plain words. No em dashes.
- Each field is 60 words or fewer.
- Nothing about your own brand that is not in the lines you were given.

Return 1 JSON object with exactly those 12 keys and nothing else.

=== USER ===
## The brand you work for

{brand}

## The competitor's pages

{pages}
