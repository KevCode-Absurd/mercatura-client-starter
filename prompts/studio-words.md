{floor}

## What is fixed, and what is yours

- **The picture is fixed.** Each item names it in a few words (its setting, light and camera) and says where the product is; the slots say where each text sits. Write nothing the picture would contradict, and nothing that needs a different picture to make sense.
- **The buyer and the stage are fixed.** Each item says who it is for and where they are in the decision. Where a rule below asks you to name them, they are already named: write to them.
- **The slots are fixed.** Each item lists the texts its image carries, in reading order, each with its role, where it sits and `max`, the most characters that place holds. Return 1 text for each slot, in the same order, doing that role's job in that place. Never add a slot or merge 2. A slot marked `or empty` (a caption, a point, a badge, a subhead, a label) may come back as an empty text where the ad says its 1 idea without it: it is then left off the picture, and a picture is better for it. Each item also gives "Words on the picture", the most words its whole picture may carry. That is a ceiling, never a target: most good ads sit well under it, 1 line is a complete ad, and a slot is never filled because it is there. No text is longer than its `max`: the type is already laid out, and a text that runs over is thrown away with the rest of that image's words. Count before you return. When a whole sentence will not fit its `max`, say a smaller thing as a whole sentence: never cut a sentence down to a telegram, and never coin a phrase to save room.
- **Lines to write again.** An item may carry a block that starts "Write these lines again.". It shows that ad's lines as they stand, in the slots' order, and says what must change. Change that and nothing else: unless the block says otherwise, every other line comes back word for word. Still return 1 text for each slot, in the same order.
- **Every word is yours.** Start from the buyer the ad is for and the 1 thing they doubt. Where `layout` names words that are set a certain way ("10 Seconds in italic"), those words stay in that slot; the rest of the slot is yours.
- **A quote slot holds a customer's words, word for word** from the customers' words given below (for a static ad: the ones dealt under that ad, each with its source), and its attribution slot names that customer the way they are given there. Take the quote that serves this buyer best and fits the slot. Never trim, join or tidy a quote. Where no quote fits the slot whole, take a shorter real quote, or write the slot as the ad's own plain sentence with no quotation marks: a customer's sentence squeezed to fit is no longer what they said. A slot marked `keep` holds a placeholder for the person: return it unchanged.
- **`argument`** is the 1 question the image answers for the buyer, and the answer. Sharpen it to this buyer's doubt if the picture still answers it; otherwise return it unchanged. The words on the image and the feed copy all make that 1 argument.
- **The feed copy**, where an item asks for it, is yours on the same terms: written for this buyer, as long as that buyer's stage asks (the lengths are given under "What to return"). The brand's own ad copy shows its tone and its words, never how long this one runs.

## Rules for every word

- **The product is real.** Only the product in the product guide. Never invent a variant, a flavour, a colour, a size, an ingredient, an amount or an accessory.
{claim_rules}
- **Never name a competitor.** A comparison is against an unbranded stand-in, like for like, on 1 argument.
- **No disease claims** (treats, cures, prevents, relieves a condition), and nothing in `forbidden_claims`. No em dashes.
- **Voice.** "The brand's voice" below is priorities 4 and 5 of the order above: who the brand talks to, its words and its tone, and then its devices as options. Write to the buyer each item is for: 2 items for 2 buyers must not be able to swap their words. A plain line a person would say is never off voice.
- **Terms.** {terms_rule}
- **Feed headlines.** {headline_rule}
- **Language.** Write in the language, spelling and currency given in `language`.
- **Only added words.** Do not type the brand's name as a logo, a sign-off or a badge: the product carries the logo.
- **Words, not symbols.** No arrows or signs that carry meaning. State a claim the way the approved claim states it.
- **State an offer or a guarantee in full, or not at all**, with every condition `offers` and `guarantee` give ("on your first order", "subscribers only").
- **A fact is set once.** A price, a figure or an offer term appears in 1 slot of an image. A button says what happens next, never the price again.
- **No fragments, and none of the turns that stand in for a reason.** Never clipped sentences of 1 or 2 words ("Scoop. Shake. Wash."), a tag-on ("Yes, really."), a row of "no this, no that", 2 halves built to match ("Sleeps like a cloud, costs like a pillow"), a question with a 1-word comeback, or a stack of counts. Say what the buyer gets as 1 plain sentence that fits the slot.
- **Lessons from feedback are rules**, below the order above. Each one below was a mistake on earlier work. Do not repeat any.

{kind_rules}

## What to return

JSON: `{ "items": [ ... ] }`, 1 object per item given, in the same order, each with:

- `id`: the item id, unchanged.
- `argument`: 1 sentence.
- `texts`: 1 object per slot, in the slots' order, each `{ "text", "source" }`. `text` is the exact words. {source_field}
{ad_copy_field}

{copy_craft}

{selling_principles}

=== USER ===
## Brand
```json
{brand_context}
```

## Product
```json
{product}
```

{counted}

## How this brand talks (its voice, its own published work, and its customers' own words)
{brand_voice}

## Lessons from feedback on earlier work
{lessons}

=== PER CALL ===

## For these items: the offer as it may be stated
These add to the brand block above. `offers` and `guarantee`, where they are here, are the ones the rules above mean.
```json
{brand_batch}
```

## The buyers these ads are for, and further facts that bear on them
These add to the brand block above.
{brand_own}

{research}

## Notes from the user for the whole set
{notes}

## The choices made for these images
{choices}

## Items: the picture and the slots of each
{items}
