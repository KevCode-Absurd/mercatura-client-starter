---
name: gpt-image-ads
description: RETIRED 2026-10-05, kept for the record only; use image-prompt-craft, static-ad-factory and tof-statics instead. Was - Generate 6 ad variations from one product image using GPT-4o's image generator. Collects brand info, builds a brand fingerprint, and outputs 6 copy-paste prompts ready for ChatGPT. Use when the user invokes /gpt-image-ads, wants to generate ads with GPT-4o or the ChatGPT image generator, or says "make ads from this image".
---

# GPT Image Ads

> **Retired (2026-10-05). Do not use this skill and do not send it to a model.**
>
> **Why.** It was written for an older image model used by hand in a chat window: 1 photo in, 6
> prompts to paste. It was dropped from the app in phase 30 because it disagreed with the rules
> the app now follows: it caps headlines at 3 to 6 words because that model garbled longer text;
> it tells the user to start a fresh chat for each prompt; it writes font names where the image
> model needs attributes; it builds a "core claim" and review quotes from a short chat, not from
> the brand's facts; and its hand-held scene describes a bottle, whatever the product is.
>
> **What replaced it.**
> - Writing the prompt for an image model (product from tagged photos, type by attributes, exact
>   words once, hands, scale, the checks an image must pass): `skills/image-prompt-craft`.
> - How any picture shows the product true: `skills/production-principles`.
> - Ads built on a proven layout (its 6 "graphic overlay" concepts and 4 "scene" archetypes are
>   all covered by the layout library): `static-ad-factory`.
> - Ads from 1 idea with no layout: `tof-statics`. Product scenes with no words: the photoshoot
>   skills.
>
> **Checked for anything worth keeping (skill pass, 2026-10-05).** Its troubleshooting table is
> already in `image-prompt-craft` (spell a word letter by letter, hex with a plain colour name,
> each product rule said both ways, the product resting on a surface with a real shadow). 1 idea
> has no home yet and is logged for a decision: a "gift or occasion" kind of ad for buyers who
> are ready (see `docs/skill-pass/static-concepts.md`).
>
> The text below is the skill as it was, unchanged.

AICMO community workflow. One product photo in, 6 ready-to-paste GPT-4o prompts out.

Start immediately at Step 1. Do not summarize the skill or ask what to do with it.

**Workflow:** 1. Intake → 2. Brand guidelines → 3. Brand fingerprint (confirm) → 4. Output mode → 5. Write ad copy → 6. Output 6 prompts.

**Terminology used throughout:** "source photo" = the user's uploaded product image. "fingerprint" = the brand block built in Step 3, pasted into every prompt. Mode A prompts are built from "archetypes"; Mode B prompts from "concepts".

---

## Step 1 — Intake

Say this exactly:

> "Let's make your ads. Two things to start:
>
> 1. What brand or product are we making ads for?
> 2. Upload your product photo, the one you want me to use as the source image."

Do not continue until you have both the brand name and the source photo.

---

## Step 2 — Brand guidelines

Ask:

> "Do you have brand guidelines? Options:
> - Paste them here (colors, fonts, aesthetic)
> - Give me your website URL and I'll extract them
> - No guidelines. I'll pull what I can from the product photo and ask a couple of questions"

Then follow exactly one path:

1. **Pasted guidelines:** extract colors (hex), fonts, and aesthetic. Go to Step 3.
2. **Website URL:** fetch the page. Extract primary color, secondary color, accent color (with hex codes), headline font, body font, and overall aesthetic in 3 words. Confirm with the user before continuing.
3. **No guidelines:** study the source photo. Note the dominant colors, any visible fonts or logo style, and the product category. Then ask only:

> "Two quick questions:
> 1. What are your main brand colors? (hex codes or describe them)
> 2. Describe your brand's look in 3 words. For example: 'clean minimal premium' or 'warm rustic organic'"

---

## Step 3 — Build the brand fingerprint

Compress everything into this block. It gets pasted in full into every prompt.

```
BRAND: [Name]
PRIMARY: #[hex] ([color name])
SECONDARY: #[hex] ([color name])
ACCENT: #[hex] ([color name or "none"])
HEADLINE FONT: [font name]
BODY FONT: [font name]
AESTHETIC: [3 words]
PRODUCT: [name, one-sentence description]
CORE CLAIM: [what this product does better than anything else]
AVOID: [what NOT to include, e.g., "no neon, no serif fonts, no busy layouts"]
```

Show the fingerprint and ask: "Does this look right?" Do not move to Step 4 until the user confirms.

---

## Step 4 — Choose the output mode

Ask:

> "What kind of ads do you want?
>
> **A — Scene transformation:** product placed into creative environments (held in hands, laid on sand, styled with objects). Looks like a full photo shoot. Great for brand-building and organic content.
>
> **B — Graphic overlay:** product stays as-is, placed on a designed background with text and layout. Faster to produce, better for direct response."

Both modes use the same fingerprint and both output 6 prompts. Only the prompt language differs.

---

## Step 5 — Write the ad copy

Before building prompts, draft the text that goes into them: one headline per prompt, plus subheadline, CTA, review quotes, or callout labels where the template calls for them. Rules:

1. Every headline derives from the CORE CLAIM in the fingerprint.
2. Headlines are 3 to 6 words. GPT-4o garbles long text.
3. No em dashes in any ad text: headlines, subheadlines, CTAs, quotes, or labels. Ever.
4. No two prompts share a headline.
5. ICP check: would a $5M DTC brand owner find this angle believable for their category? If not, rewrite it.

---

## Step 6 — Build and output the 6 prompts

### Mode A — Scene Transformation

These ads put the product into a world. GPT-4o generates the scene and integrates the product into it. The result looks like a real photo shoot, not a Canva template.

**Four scene archetypes:**

| # | Archetype | What it looks like | Best for |
|---|---|---|---|
| 1 | Hand-held | Manicured hand holds the product against a warm lifestyle background. Floating review quotes around it. | Social proof, organic feel |
| 2 | Editorial diagram | Large bold serif headline takes up half the frame. Product in the other half with callout lines pointing to key features. | Feature education, launch |
| 3 | Flatlay environment | Product laid on a textured surface (sand, linen, marble, wood). Overhead angle. "NEW" or repeating brand text as a vertical border strip. | New product, seasonal |
| 4 | Styled still life | Product surrounded by complementary objects that reinforce the brand world (seashells, botanicals, ceramics). Soft lifestyle background. | Brand identity, gifting |

**To reach 6 prompts:** Prompts 1-4 cover one archetype each. For prompts 5 and 6, pick the two archetypes that best fit this brand and write a second variation of each with a different headline angle and different scene details (surface, background color, or supporting-text treatment).

**Mode A prompt template** (fill every bracket, keep everything else verbatim):

```
I'm uploading a product photo. Study it carefully. Note the exact shape, label design, colors, and proportions.

Create a 4:5 vertical ad for [Brand Name].

BRAND FINGERPRINT:
[paste full fingerprint]

SCENE: [describe the full environment: surface, background, lighting, angle, mood]

PRODUCT PLACEMENT: Place the product naturally into this scene. You can hold it in a hand, lay it on the surface, or lean it against something, but the product's label, shape, and colors must remain accurate to the uploaded photo. Do not redesign the product.

TEXT:
- Headline: "[headline]" | font style: [style] | color: #[hex] | position: [top/bottom/side of frame]
- Supporting text: [floating quote bubbles / callout lines with labels / repeating border text / "omit"]

RULES:
- Product label and shape match the uploaded photo exactly
- Colors match the brand fingerprint hex codes
- Text spelled exactly as written above
- Format: 4:5, single clean image, not a mockup or phone frame
- No watermarks, no extra logos

Final result should feel: [aesthetic words from fingerprint]
```

**SCENE line per archetype** (adapt colors, objects, and copy to the brand):

1. *Hand-held:*
> "A woman's hand with clean, natural nails holds the product upright. Fingers wrapped naturally around the lower half of the bottle. Warm [brand color] background, soft diffused light from the left. Three floating white rounded-rectangle text bubbles positioned around the bottle, each containing a short review quote."

2. *Editorial diagram:*
> "Large bold serif type '[headline]' fills the top 40% of the frame on a [brand color] background. The bottom 60% shows the product held in a hand at waist height. Two thin callout lines extend from the product: one pointing left with a small text label '[feature 1]', one pointing right labeled '[feature 2]'."

3. *Flatlay:*
> "Overhead shot. Product lying flat on [textured surface: natural sand / white linen / pale marble]. Soft natural daylight, no harsh shadows. A vertical strip on the right edge repeats the word 'NEW' in small caps, [brand color] text on white. '[Headline]' in large serif type at the bottom."

4. *Styled still life:*
> "Product standing upright on a [surface] surface, slightly off-center. Surrounded by [2-3 complementary objects, e.g., seashells, a sprig of eucalyptus, a small ceramic dish]. Soft lifestyle lighting, warm and airy. '[Headline]' in script or serif font, upper right."

### Mode B — Graphic Overlay

Product stays as photographed. GPT-4o composites it onto a designed background with text. One prompt per concept, 6 total.

**Six concepts:**

| # | Concept | What it targets |
|---|---|---|
| 1 | Clean Product Hero | In-market buyers comparing options |
| 2 | Lifestyle In Use | Aspirational: "would this fit my life?" |
| 3 | Outcome Headline | Skeptics who need to believe the claim |
| 4 | Problem to Solution | Pain-aware but not yet product-aware |
| 5 | Social Proof | Fence-sitters who need validation |
| 6 | Gift / Occasion | Gift shoppers or seasonal intent |

**Mode B prompt template** (fill every bracket, keep everything else verbatim):

```
I'm attaching a product photo. Using it as the source:

Create a 4:5 vertical ad for [Brand Name].

BRAND FINGERPRINT:
[paste full fingerprint]

CONCEPT: [concept name]
LAYOUT: [1-2 sentences describing overall composition]

AD ELEMENTS:
- Background: [exact description with hex color]
- Product: Keep the product photo exactly as shown. Do not redraw, reimagine, or alter it. Composite it cleanly onto the background.
- Headline: "[headline]" | color: #[hex] | weight: [bold/light] | position: [top/bottom/side]
- Subheadline: "[subheadline]" | color: #[hex] | smaller than headline [or "omit"]
- CTA: "[text]" | button: #[hex] | text: #[hex] [or "omit"]

RULES:
- Spell every word exactly as written
- Match all hex codes exactly
- Product fully visible, never cropped
- No watermarks, no extra logos
- Format: 4:5, single clean ad, not a mockup or phone frame

Final result should feel: [aesthetic words from fingerprint]
```

### Output format

Output exactly 6 prompts. Each prompt goes in its own fenced code block so the user can copy it in one click, with a plain-text label line above it:

**PROMPT 1 — Hand-Held (Scene Mode)**
```
[full prompt, every bracket filled, fingerprint pasted in]
```

**PROMPT 2 — Editorial Diagram**
```
[full prompt]
```

...and so on through PROMPT 6. No placeholders may remain inside the output prompts; every bracket must be filled with real values.

After all 6 prompts, add:

> **How to run these in ChatGPT:**
> 1. Open ChatGPT with GPT-4o selected
> 2. Upload your product photo
> 3. Paste a prompt, then download the result
> 4. Start a fresh chat for each prompt (upload the photo again each time for consistency)
>
> **To iterate:** Reply in the same thread: "Keep everything the same but [one specific change]." GPT-4o holds the scene context within a thread.

---

## Troubleshooting — if a result doesn't look right

| Problem | Fix (add to the prompt or adjust) |
|---|---|
| Product looks redesigned / generic | Add: "The product must match the uploaded photo exactly. Same label, same shape, same colors. Do not invent a version of this product." |
| Product looks copy-pasted (Mode B) | Add: "Composite the product naturally. Match the lighting direction and shadow to the background." |
| Text is garbled | Shorten to 3-4 words. Spell it out if it still fails: "S-M-O-O-T-H space S-H-I-N-E" |
| Colors are off | Add descriptive names: "#F4EDE4 (warm cream, like off-white paper)" |
| Scene looks fake / product floating | Add: "The product should cast a soft natural shadow on the surface beneath it. Integrate it into the scene. It should look like it was photographed there." |
| Layout is crowded | Remove the subheadline. Let the headline breathe. |
| Product is too small | Add: "Product occupies at least 55% of the frame height." |
