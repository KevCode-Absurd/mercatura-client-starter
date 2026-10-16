---
name: brand-voice-check
description: Check a finished ad script or ad copy against a brand's voice and its customers' own language, and fix the words that don't fit. Use after a script or ad copy is written and before a person sees it. Changes wording only; never claims, numbers, offers or structure.
---

# Brand voice check

A script can pass every claim check and still sound like the wrong brand. This check is the last pass before a person reads the script. It answers 1 question for every line: would this brand say this, to this customer, in these words?

## What you are given

- **The voice pack.** Only the parts of the brand's documents that are about voice: how it sounds, the do and don't lists, its guardrails on words, tone notes, how it writes its own ads and site (with samples and their measured shape), the buyer the piece is for, phrases the brand uses, and real customer quotes that show how its customers talk. This is what you check against. Do not judge the script against general copywriting taste. It sits under 1 rule: a plain line a person would say is never off voice.
- **The script.** Numbered lines (spoken text and on-screen text) and numbered hook variants.
- **The mode.** `fix` means your replacements are applied. `report` means the words must stay as they are (the script is a copy of an existing ad) and you only list what is off.

## What counts as off-voice

Check only these 3 things. Flag a word or phrase when:

1. **It is a word the brand never uses, or the customer wouldn't say.** Jargon, category words only marketers use, clinical, scientific or technical terms outside a proof line, a word above the customer's everyday vocabulary, or a word that breaks a don't rule. If the customer quotes call it "gritty", the script must not call it "an unpleasant texture"; if they say a jacket "wets out", it must not "lose water repellency".
2. **It is a tone the brand would not take.** A register the voice pack rules out: too formal, too salesy, too earnest, preachy, guilt-driven.
3. **It talks past the buyer.** Slang the audience doesn't use, stiff wording for an audience that talks casually, or a do rule about how to speak to them that clearly applies and is dodged. Match the customer quotes, not what you imagine the audience sounds like.

Do not flag:

- A line that is plain and clear, in any brand. A plain line a person would say is never off voice.
- Product names, ingredient and material names, numbers, prices, legal or disclosure wording.
- A line that only states a term: a price, a guarantee, a disclosure.
- Anything on the grounds of persuasion or structure. Other checks own those.
- A line for not using a rhythm, a run of short sentences, a catchphrase or an emoji the brand sometimes uses.

Never rewrite a line to add a device (a rhythm, short sentences, a catchphrase), and never make a line stranger or more clever to sound more like the brand. The order for every word is: natural, then it sells, then it tells a story, then the brand's language (who it talks to, its words, its tone), and the brand's devices last and optional. A device is an option the writer may take on a line that carries it without bending. Its absence is not a fault, and "any brand could have said this" is not a fault in a line that is plain and makes sense.

## How to fix

- Replace the smallest span that fixes the problem, then return the full corrected field.
- Prefer the customers' own word for the thing. Next, a word from the brand's phrase list, if it fits naturally. Do not paste taglines in.
- Keep the meaning, every number, every claim, every offer term and every placeholder in square brackets exactly as they are.
- The fixed line is a whole sentence a person would say aloud. Change no more words than the fix needs.
- Never add a claim, a benefit, a number or a promise. Never soften or strengthen a claim.
- No em dashes. Contractions always.

## What to return

- `verdict`: `on_voice` when nothing needs changing, otherwise `needs_fixes`.
- `summary`: 1 sentence on how the script sounds against the voice pack.
- `issues`: 1 entry per field that needs a change (not per word). Each has where it is, the exact off-voice phrase copied from the script, why it is off (name the rule or the customer wording it conflicts with), and the full corrected text for that field.

Most good scripts need 0 to 4 fixes. If you find yourself rewriting most lines, stop and keep only the changes where the original would make the customer notice the brand sounds wrong.

## What this reads from the brand brain

The app puts the voice pack together from these. What a brand has not recorded is left out, never made up.

- **How the brand sounds.** `brand.json`: the style card and the voice do and don't. `brand-guidelines.md`: Brand voice and tone (Personality, Writes like, Voice do's, Voice don'ts, Tone by context); Key phrases and taglines.
- **Its guardrails on words.** `brand-guidelines.md`: Brand guardrails (Never say, Always). These outrank the voice.
- **How the brand writes the kind of thing being checked.** `brand-guidelines.md`: How the brand writes, which holds the brand's own ad texts, headlines, on-image lines, scripts and site copy, word for word. The app reads this section today; the draft contract does not list it yet.
- **How its customers talk.** `customer-avatars.md`: Customer language bank; per avatar, Grounded in (real quotes with source) and How to talk to this person. The research quotes on the subject of the piece.
- **Blank.** With no voice on record, hold the script to the customers' own words and the guardrails only, give the brand no sound it has not shown, and say so in the summary. Length and rhythm are never flagged, with or without a measured shape: the length is set by the buyer's stage, and a rhythm is a device.
