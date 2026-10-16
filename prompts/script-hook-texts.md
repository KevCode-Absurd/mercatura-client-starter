<!--
The first line of the primary text, and the headline, for each hook of a script (phase 47). A script with several
hooks is several ads on 1 body: each ad's caption must open the way its video opens. 1 small call writes a first
sentence and a headline for every hook; the rest of the primary text is shared and is not rewritten.
Used by src/lib/builder/kit.ts (hookTexts).
-->
You finish the feed text for {count} versions of 1 ad for {brand_name}. Every version has the same video body and the same primary text, and each opens on a different hook. For each hook, write the opening of the primary text and the headline for that version.

{floor}

**Do not invent facts.** Only these are facts: a specific number or price, a study or a test, what the product does to a body, what is in the product (an ingredient, a material, a part), anything about a named competitor or other product, a rule stated as proven truth, and the terms of the offer. Each comes from the primary text below, exact, or is not said. Everything else is yours: exaggerate, joke, be sly, use a metaphor, say the everyday thing anyone would nod at, make up the scene, the feeling and the speaker's small story. Run wild with it. Nothing that smears a person or a brand.

- **The opening** stands in for the opening shown below: about as long as it (1 to 3 sentences). Its first sentence stands alone above "See more" and earns the tap. It comes in the same way its hook does: the same picture, moment or question, said for someone reading and in words of your own, never the hook copied out. It hands off to the rest of the primary text, which follows unchanged: read your opening, then the next sentence, aloud. They must sound like 1 person carrying on. Nothing in your opening may disagree with what follows, and every "it", "that" and "there" in the next sentence must point at something you said.
- **The headline** is 1 plain line the same speaker would say, about 40 characters, from the way in of that hook. Never a slogan or a list of contents. {headline_rule}
- The same speaker ({speaker}), the same story and the same facts as the text. No figure, price, health result or named product that is not already in it, and nothing that contradicts it. No 2 versions share a first sentence or a headline, and none repeats the ones the text already has.
- Talk a person would say: school grade {grade} or below, no em dash, no "it's not X, it's Y", no mirrored saying of 2 matching halves, no run of fragments, no question with only yes for an answer. {terms}
- {variety}

Before you write, read the first sentence of "The rest" and set down in `leans_on` what it needs to have been said before it: the thing an "it", "that" or "there" points at, a group or a moment it names, whether something was done or not done. Every opening you write says those things too.

Return JSON: `{ "leans_on": "<what the next sentence needs from the opening>", "texts": [ { "hook": <the hook's number>, "first_line": "<the opening: 1 to 3 sentences>", "headline": "<1 line>" } ] }`, 1 for each hook.

{selling_principles}

=== USER ===
## The primary text as written

Its opening (version 1 keeps it): {first}

The rest (shared by every version, unchanged):
{rest}

Headline of version 1: {headline}

{counted}

{brand_voice}

{lessons}

## The hooks (number | how that version of the video opens)
{hooks}
