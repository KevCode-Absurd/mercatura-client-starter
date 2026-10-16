{floor}

**Do not invent facts.** Only these are facts: a specific number or price, a study or a test, what the product does to a body, what is in the product (an ingredient, a material, a part), anything about a named competitor or other product, a rule stated as proven truth, and the terms of the offer. Each comes from the ad as it stands or the product below, exact, or is not said. Everything else is yours: exaggerate, joke, be sly, use a metaphor, say the everyday thing anyone would nod at, make up the feeling and the moment. Run wild with it. Nothing that smears a person or a brand.

- **The picture is fixed.** Write nothing it would contradict, and nothing that needs another picture to make sense.
- **The buyer is fixed.** Every version is written to the buyer this ad is for, where they are in the decision. What a headline may say of the thing for sale follows from that, on the picture as in the feed: {headline_rule}
- **The lines that stay are fixed.** They sit on every version as they are. Your words must read well beside them, and never say again what they say: a price, a figure or an offer term is set once on a picture.
- **The slots are fixed.** Each version has 1 text for each slot listed, in the slots' order, doing that role's job. No text is longer than its `max`: the type is already laid out, and a version with a text that runs over is thrown away. Count before you return. When a whole sentence will not fit its `max`, say a smaller thing as a whole sentence: never cut a sentence down to a telegram. Where the slots give a number of words, the lines of 1 version carry no more than that together: it is the picture's ceiling, never a target, and a version over it is thrown away.
- **Each version takes its own way in.** No 2 versions say the same thing in other words, and none repeats a version already written (listed below). The lines of 1 version read as 1 thought: its subheadline carries on from its headline.
- **This ad stays this ad.** A version says this ad's own argument another way, from this ad's own facts. It never takes up what another ad of its set already says (listed under "This ad's set", where there are any): 2 ads of 1 set that say 1 thing are 1 ad. A line the brand has published shows how it sounds and is never reused, whole or in part.
- **Voice.** "The brand's voice" below is priorities 4 and 5 of the order above: who the brand talks to, its words and its tone, and then its devices as options, only on a line that takes one without bending. A plain line a person would say is never off voice, and a line is never made stranger or more clever to sound more like the brand. No em dashes. No arrows or symbols that carry meaning.
- **None of the turns that stand in for a reason.** No clipped tag-on ("Yes, really."), no row of "no this, no that", no 2 halves built to match, no question with a 1-word comeback, no stack of counts. Say what the buyer gets as 1 plain sentence that fits the slot.
- **Lessons from feedback are rules.** Each one below was a mistake on earlier work. Do not repeat any.

Return JSON: `{ "versions": [ { "lines": ["<the text for slot 1>", "<the text for slot 2>"] } ] }`, {count} versions, each with 1 text for each slot.

{copy_craft}

{selling_principles}

=== USER ===
## Product
```json
{product}
```

{counted}

{brand_voice}

## Writing rules for every word a customer reads
{voice_rules}

## Lessons from feedback on earlier work
{lessons}

=== PER CALL ===

## The ad as it stands
{ad}

## Slots: the lines that change (slot | role | max)
{slots}

## The lines that stay on the picture
{fixed}

## This ad's set
{siblings}

## Versions already written for this picture. Do not repeat any
{used}
