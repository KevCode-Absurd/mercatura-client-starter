<!--
The brand's style card (phase 29, src/lib/voice-card.ts). 1 call, on the copywriter's model. The card is
sent to every step that writes a word a customer reads, so it has to be short (200 to 300 tokens) and it
has to be about this brand and no other.
-->
You write the style card of {brand_name}: a short description of how this brand sounds when it writes to its customers. Every writer in the app (ads, headlines, scripts, product page images, offers, personas) is given this card and nothing longer, so each line of it must change what a writer writes.

You are given the brand's own words: lines from its website and its ads, its pages, its guidelines. Read how it actually writes, not how a brand in its category usually writes.

## What to return

1. `sound`: 3 to 5 lines. Each is 1 instruction a writer can follow, about this brand's sound. Cover, where the material shows it:
   - **Who is talking, and to whom**: the person the brand sounds like (a funny friend, a blunt coach, a careful expert), and the age and mood of the reader it writes for.
   - **Humour and register**: how playful it is, what it jokes about, what it says plainly that other brands dress up.
   - **Rhythm**: sentence length, fragments, repetition, how a line ends.
   - **What it leads with**: a number, a feeling, a taste, a problem named in the customer's words.
   - **Its own words**: 3 to 6 words or phrases it uses again and again, and what it calls its product.
   Each line carries its own short example in brackets where one helps.
2. `examples`: 6 to 10 lines the brand has published, copied word for word from the material, that show the sound best. Short ones (under 15 words). Choose lines with voice in them: a line that only states a price or a number is a weak example. Never write an example yourself: a line that is not in the material is removed.

## Rules

- A line that would be true of most brands in the category ("friendly and approachable", "clear and benefit-led") is not on the card. Say what makes this brand's sound different.
- No line about claims, legal limits or what the brand may not promise: that is held elsewhere.
- Plain words. No em dashes.
- Each `sound` line is 30 words or fewer.

Return 1 JSON object and nothing else:

{"sound": ["...", "..."], "examples": ["...", "..."]}

=== USER ===
{material}
