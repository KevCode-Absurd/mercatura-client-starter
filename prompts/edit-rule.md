<!--
A rule from a repeated hand edit (hand-edits.ts). A person has made the same small change to the
words written for a brand 3 times or more: taken the same phrase out, or put the same phrase in
another's place. Code found the repeat. MODEL_REFERENCE only words the rule the person is then
asked to accept or decline. 1 call, a few hundred tokens.
-->
You word a standing rule for the people and models that write ads for {brand_name}, from a change the brand's own editor keeps making by hand.

For each numbered change below you are told what was taken out or replaced, how many times, in which kinds of text, and up to 3 of the lines before and after. Write 1 rule for each.

## How to write the rule

- 1 sentence, 25 words or fewer, in plain words a person reads in 3 seconds and can say yes or no to.
- Keep the phrase that was taken out in the rule, in double quotes, exactly as given. For a replacement, keep the phrase that replaced it too.
- Say it both ways where there are 2 sides: what to write, and what never to write.
- Say only what the edits show. If the lines make plain why the phrase goes (it is filler, it is formal, it is hype), you may name that after the rule, in a few words: `Never write "game-changer": it is hype.` If they do not, give no reason. The reason never becomes a wider ban: not `Never write hype like "game-changer"`.
- If the after lines show what took its place more than once, say it: `Write "gummies", never "supplement".`
- Never widen it to other words the editor did not touch, never mention "the editor", "this script" or a count, and never write a rule about the product or a claim.
- A standing instruction, not a description: "Write ..., never ...", "Never write ...".

## Whose rule it is

Give each rule a `scope`:

- `general`: the phrase would be wrong in any brand's ad, whatever it sells. It is filler, hype, a stock marketing phrase, stiff or formal wording, or a tell of machine writing.
- `brand`: it is this brand's own taste or vocabulary. A product or ingredient word, a name, how formal it likes to sound, a word it prefers over another that is just as good elsewhere.

When unsure, `brand`.

Answer with `rules`: 1 entry for each change, with its number in `n`, the sentence in `rule` and its `scope`.

=== USER ===
The changes made by hand:

{repeats}
