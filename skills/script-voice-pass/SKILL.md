---
name: script-voice-pass
description: Make a finished ad script sound right when it is said aloud - whole sentences a person would say, 1 idea per sentence, verbs early, plain words, contractions, and no machine-sounding patterns. Use on any script or long-form ad copy after it is written and before the brand voice check. Fixes how lines sound, never what they say. Not for checking claims or brand voice (brand-voice-check does that next).
principles: voice
---

# Script voice pass

What to say and how it sounds are different skills. A script can be correct in every beat and still be unsayable. This pass is the read-aloud test, done on every line, before the brand voice check.

Order of the checks on a finished script:

1. **This pass:** does it sound like a person talking?
2. **Brand voice check:** does it sound like this brand talking to this customer?
3. **Claims audit:** on the final words.

You fix how a line sounds. You don't change what it says.

This pass repairs wording, not voice casting or acting. Preserve clean spoken text and existing placeholders; do not add performance tags, dramatic punctuation, fillers or a new emotional arc. After wording/brand/claims checks, use [Voice identity and spoken performance](../production-principles/references/voice-performance.md) to direct an approved script through separate identity and delivery records. A spoken-audio listening check happens on the actual render, not on this text-only pass.

## The read-aloud test

Read each line as if aloud, at the pace it would be delivered.

| What happens | What it means | The fix |
|---|---|---|
| You stumble | The sentence is tangled | Reorder it: subject, verb, then what matters |
| You run out of breath | The sentence is too long | Split it where the breath would fall |
| You'd be embarrassed to say it | Nobody talks like that | Say it the way you would to a friend |
| You have to re-read it to follow it | 2 ideas are in 1 sentence | 1 idea per sentence |
| It sounds like a list being read | Every sentence is the same length, or short and unjoined | Join them the way a person talks: "and", "but", "so", "because" |
| It sounds like a slogan | Small words were dropped to make it punchy | Put them back, even if the line gets longer |

## The 5 rules

1. **A whole sentence a person would say.** This comes first. A clipped line gets its small words back, even when that makes it longer.
2. **1 idea per sentence, joined the way people talk.** "The base has 3 layers, so the heat spreads right to the edge and nothing burns in the middle." A long sentence joined by "and", "so" or "because" is how a person tells it, and is not a fault. Split one only where the speaker would breathe.
3. **Verb early, then what matters.** "It spreads the heat to the edge", not "resulting in a progressive distribution of heat across the cooking surface". No trailing clauses that make the listener wait for the point.
4. **Plain words.** If a simpler word says the same thing, use it. A technical term stays only where the audience really uses it, and is followed by what it means for them.
5. **Sayable.** Every line can be said in 1 breath at speaking pace. Sentence lengths vary the way speech does, and no pattern is forced: a run of very short sentences sounds like a machine, and so does a run all the same length.

## The 6 settings

Keep each as the script has set it, and make it consistent. Don't change a setting; flag it if it wobbles.

| Setting | Check |
|---|---|
| Person | The script stays in the person it started in, except where the close turns to the viewer |
| Tense | Past for the story, present for how the mechanism works. No drifting between them inside a passage |
| Sentence length | As speech has it. Flag 4 or more sentences in a row of about the same length; never force a pattern |
| Reading level | Set by who buys. General public: grade 7 or below (6 is better). An audience that uses the category's terms among themselves (runners who say "heel drop", home cooks who say "tri-ply", athletes who say "fast-twitch"): up to grade 9, and those terms may stay. Professionals: up to 11. The app works the level out once from the customers' own words and gives it to you |
| Contractions | Always: can't, don't, it's, I'd, you've. "Do not" and "it is" get contracted unless the stress is deliberate |
| Last word | A line that trails off on "it", "that", "of" or "too" is mended only when the mended line is still what a person would say. Never twist a sentence to end on a strong word |

## What the app checks by rule

These are counted by code on every script and on every piece of ad copy, so they hold whether or not a model remembers them: contractions; the reading level against the brand's audience; a sentence over 28 words (40 for copy that is read); 4 or more very short sentences in a row; 5 or more sentences of the same length in a row; lines that end on a word with no weight ("it", "that", "of", "too"), above all the hook and the last line; the person the script was asked for against the person it is written in. Each one that fails is handed to you as a flag to fix.

The same rules apply to everything a customer reads: the words on an image, the headline, the primary text. A headline is a plain sentence or a phrase a person says, so the breath test does not apply to it and the rest do.

## Machine-sounding patterns to remove

- Uncontracted verbs.
- "It's not X, it's Y", more than once in a script. Say the point directly.
- Em dashes. Use a full stop or a comma.
- Stacked rhetorical questions.
- A run of fragments used for drama.
- A "No X. No Y. No Z." stack, and a clipped tag-on after a claim ("Yes, really.").
- Lists of 3 adjectives.
- Words nobody says aloud: "game-changer", "elevate", "seamless", "unlock", "journey", "transform your".
- Openers like "Here's the thing" and "Let's be honest" used as filler.

## What you must not change

- The meaning of any line.
- Any claim, number, price, offer term, guarantee, product name or placeholder in square brackets.
- The order of lines, their beats, or the script's person and tense.
- A line into a shorter one, except to split 1 sentence that is too long for a breath into 2 whole ones. A clipped line may grow by the small words it was missing. Adding a sentence is not allowed.
- A plain line that already works. Don't add rhythm or personality: a device is never added by this pass.
- A word or an emoji that the brand's own published lines use. A rhythm or a turn of phrase the brand sometimes uses is left only on a line a person would still say: a brand's device is an option, never protection for a line nobody would say.

## For copy that is read, not spoken

Long-form copy (a native ad story, the long primary text of an ad) is read on a phone. The same rules apply with 1 difference: the breath test gives way to paragraphs of 2 to 5 whole sentences, joined the way a person tells a story, with no rows of 1-line paragraphs. A fragment on its own line is a fault here too. A phrase repeated once for weight is fine; 3 lines in a row that open on the same word are a pattern to fix.

## What to return

For each field that needs a change: where it is, the exact phrase that fails, which rule it breaks, and the full corrected text for that field. Most good scripts need 0 to 5 fixes. If nearly every line needs one, fix the worst and say in the summary that the script should be rewritten for voice.

## What this reads from the brand brain

This pass is general craft, the same for every brand, so it reads little.

- **The audience's reading level and the terms it really uses.** The app works these out once from the customers' own words and keeps them in the brand's settings, not in a brain document. Proposed home: `brand-guidelines.md`, Brand voice and tone: `Audience level` (general, informed or expert) and `Terms the audience uses`. Blank: a general audience, grade 7, no technical terms.
- **The brand's own published lines,** only to know which words are the brand's. `brand-guidelines.md`: How the brand writes; Key phrases and taglines. Blank: the rules above apply in full.
