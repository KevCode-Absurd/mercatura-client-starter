---
name: ad-script-principles
description: Reference library of what a good direct-response ad script is, for any D2C brand, split into sections (desire and research, buyer stage, offer, claims and specificity, the 9 beats, problem, promise and mechanism, hook and bridges, objections proof and call to action, identity, story, voice, length and format). It describes; it does not instruct. Task skills (script-from-research, script-reference-structure, script-reference-principles, ad-reference-exact) and format skills (script-format-*) load only the sections they need. Do not use on its own to write an ad.
---

# Ad script principles (library)

This is a library, not a method. Each file in `sections/` says what is true of scripts that sell, with no steps and no orders. The principles come from the classic direct-response writers (Hopkins, Caples, Schwartz, Ogilvy, Halbert, Collier, Reeves, Cialdini) as applied to paid social ads.

A task skill decides what to do. It names the sections it needs in its front matter (`principles: problem, voice`) and only those are loaded with it. A section that isn't loaded doesn't apply to that task.

## 3 things every section holds to

1. **Any D2C brand.** Each rule has to hold for something eaten or applied and for something worn or used. Where the 2 differ, the section says how: a product **bought again** (tried cheaply, judged in use, sold on the first order and the habit) and a product **bought once** (considered for longer, judged before buying, sold on price against lifespan, fit, and returns). The offer, the objections, the proof and the call to action all change with it.
2. **Examples are made up, and come from more than 1 category.** The running examples are a retinol serum, a cold-brew concentrate, a cast-iron pan and a rain jacket. No fact, number or phrase in an example belongs in a script.
3. **The brand's voice outranks the library.** `voice` describes what tends to hold for speech. The brand's own voice is sent with the job by the app and wins wherever the 2 differ.

## Sections

| Section | What it describes |
|---|---|
| `desire-and-research` | Desire is found, not created. What each research source is good for. The 5 things research yields, for both ways of buying, and the beat each one feeds. |
| `buyer-stage` | Awareness and sophistication: where the buyer starts, and how that changes the whole ad. |
| `offer` | What an offer is, its 5 parts by how the product is bought, how price and guarantees are framed, honest urgency. |
| `claims-and-specificity` | The test for a differentiator. Specifics versus adjectives. Process as mechanism. What cannot be made up. |
| `beats` | The 1 belief a script moves. The 9 beats, the job of each, and why they come in that order. |
| `problem` | Accommodation versus symptom. Ways into the problem. What makes agitation work or read as complaining. |
| `promise-and-mechanism` | Feature, promise, mechanism: what each is and how they depend on each other. Seen is not named. |
| `hook-and-bridges` | What a hook is for. Native versus obvious advertising. How lines hand over to each other and how the product arrives. |
| `objections-proof-cta` | The 6 objections, for both ways of buying, and what answers each. The proof ladder. The parts of a call to action. |
| `identity` | What the buyer is really buying. How a feature connects to who they are. |
| `story` | Story as a carrier for the beats. The 4 common shapes. What breaks a story ad. Who may report a result. |
| `voice` | What separates a script that reads well from one that sounds right aloud, where the brand's own voice is silent. |
| `length-and-format` | The load-bearing beat. What each kind of surface can carry. A line is only as good as its picture. How length is built. |

## Which task uses which

| Task skill | Sections |
|---|---|
| `script-from-research` | all |
| `script-reference-principles` | all |
| `script-reference-structure` | claims-and-specificity, offer, promise-and-mechanism, hook-and-bridges, objections-proof-cta, voice |
| `ad-reference-exact` | beats, length-and-format |
| `script-format-*` | each lists its own |

Section file names are read by code (`src/lib/scripts/skills.ts`, and a test that the library describes and never instructs). A section is edited in place; none is added, renamed or removed without changing the code.

## What this reads from the brand brain

Nothing directly: a section is reference text and is sent as written. The task skill that loads it says where each fact comes from. What the sections assume the brain can supply:

| The section speaks of | Document and field | When it is blank |
|---|---|---|
| The 5 research findings | `customer-avatars.md`: Grounded in, Customer language bank, What almost stops them, The moment (new) | The finding is a named gap, never filled in by the writer |
| Bought again or bought once | `products-and-positioning.md`, per product: Buying pattern (new, not in the draft) | Read from the product's format and offers: a subscription or a pack size means bought again |
| The 5 parts of the offer | `offers.json`, `brand.json` guarantee; `products-and-positioning.md`: Pricing summary, Bundles and offers | A part the offer lacks is not written |
| The mechanism and process facts | `products-and-positioning.md`, per product: Key features, How it is used (new), How it is made (new, not in the draft) | The promise is carried by proof or a demonstration of use |
| The proof ladder | `brand.json`: claims with sources, proof assets; `products-and-positioning.md`: Visible result (new) | A placeholder, or the rung the brand does have |
| Awareness and sophistication | `brain.md`: Brand diagnosis | The concept's own stages are used |
