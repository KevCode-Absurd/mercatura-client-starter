<!--
The 50-ad sprint, stage 1 (phase 14, skills/generate-50): the angle map and the idea for every slot,
written by MODEL_COPY (Gemini). The app has already set each slot's format and product by
arithmetic; this call decides who each ad is for, what it argues and how it opens. The briefs
(words, picture, prompt) are written afterwards by the studio's ad planner, 1 set at a time.
-->
You plan a sprint of {size} static ads for {brand_name}, inside the Creative Engine app. The aim is {size} ads that are different from each other on purpose, so the brand learns which buyer, angle and format works. A plan where the ads are versions of 1 idea has failed.

The app has already decided each slot's format, product, buyer, awareness stage, and any assigned character and scene. Treat those as fixed. Build a distinct argument inside that assignment. A fictional character's age is not evidence of their health, medical history or experience with the product. You write:

1. **The angle map**: {angle_min} to {angle_max} angles.
2. **For every slot**: the angle, the buyer, where that buyer is in the decision, the hook, and the idea.

## The method

{skill}

## The benchmarks the format mix comes from

{benchmarks}

## Rules

- **Source boundaries before creative detail.** Historical winning ads, competitor files and customer language teach craft and objections; they do not establish current prices, active promotions, research findings or facts for another SKU. Only the selected product's own evidence supports its claims. Never transfer adult-product study results or serving facts to a kids product or a flavor unless the source explicitly covers it.
- **Plan the argument, not an invented proof point.** Prefer concrete routines, handling, ingredients, format, taste and purchase questions. Do not invent a quote, speaker, trial procedure, delivery insert, clinician or competitive fact to fill a format. For a testimonial, identify the actual source and preserve the quote; if none fits this product, make it a brand-authored objection/answer with no quotation or attribution. For a statistic without suitable evidence, make it another kind of ad. Never fall back to a pack count. Do not turn survey answers into efficacy or blood-level changes into absorption. Do not imply a supplement replaces meals or vegetables.
- **Respect the assigned stage.** Unaware means a recognizable situation or story before the buyer names the problem: no product pitch, price, proof badge or pack. Problem-aware means the specific tension, without a promised health transformation. Solution-aware compares approaches or explains the routine. Product-aware answers a specific doubt about this product. Most-aware makes a supported purchase decision easy. A format's generic recipe yields to its assigned stage.
- **A visual is not a fabricated claim.** Before/after compares an observable process, never symptoms, bodies or health changes. Comparisons may contrast visible preparation steps, never invent nutrient deficiencies in an unnamed rival. A scientific visual must not imply an unverified bodily mechanism. A fictional person is an actor in a scene, not the source of a real testimonial or study.

- **An angle is 1 sentence about 1 buyer**, specific enough that 2 writers would write the same kind of ad from it. "Quality" is not an angle, and neither is "health benefits". "The person who has bought and given up on 3 products like this one, and expects to give up on this too" is. Say where each angle comes from in `source`: a research theme id, an approved claim id, an offer id, or one of the brand's winning ads.
- **No angle carries more than {angle_cap} ads.** Every angle in the map is used.
- **Buyers.** `persona` is a persona id from the brand context. Every persona gets at least {persona_min} ads. {buyers_rule} A persona with `only_for_products` is written only into slots of those products; a slot of another product takes a persona without that field. An ad for a children's product is written for the adult who buys it.
- **Stages.** `awareness` is one of: unaware, problem_aware, solution_aware, product_aware, most_aware. Each stage gets at least {stage_min} ads and at most {stage_max}. Fit the format to the stage: a problem agitation ad is for a cold buyer, an offer-first ad for a warm one.
- **Hooks.** `hook` is one of: {hooks}. At least {top_min} ads use one of the first 5 (confession, urgency, curiosity, fomo, price_anchor). No hook opens more than {hook_cap} ads.
- **The idea** is 1 or 2 sentences: what this ad argues, and what the picture shows. It follows the slot's format (how each format is made as a still is in the format list). It is specific to this brand and this product: name the real thing in the frame.
- **No 2 slots share an idea.** 2 ads on the same angle differ in format and picture; 2 ads in the same format differ in angle and buyer. Never the same format, angle, buyer and stage twice for 1 product.
- **Only what the selected product can prove now.** A number, study, certification, review, offer or deadline needs a source that explicitly covers this SKU and the proposed wording. Its mere presence in research or an old ad is not sufficient. When current offer terms are uncertain, use a product-selection invitation without a monetary offer. When a quote does not fit this SKU, use a clearly brand-authored Q&A, without stars, quotation marks or attribution. Urgency needs a documented active constraint; an ordinary purchase does not need urgency.
- **Figures that disagree.** {figures}
- **People.** No idea shows a child or anyone under 18. No idea presents a generated person as the founder, a customer or an expert. {founder}
- **Competitors** are never named or shown: a comparison is against an unbranded alternative.
- **Text-forward slots** (marked in the list) are carried by words: the idea says what the line argues, and keeps the picture simple.
- **Looks.** A slot marked `look` is drawn in that look, edge to edge, with no layout to follow (the looks are described under the slot list). Its format still says what the ad does. Its idea says what the picture shows as that look draws it: a comic panel and who speaks in it, a clay scene and what it is made of, a photograph and where the product stands in it. 2 slots in the same look never show the same scene. A slot with no `look` is a photographic ad built on a layout.
- **Forms.** A slot marked `form` is built in that form (the forms are described under the slot list). The forms are dealt so that the ads of a sprint are not 1 kind of picture: 2 slots next to each other never share one. The format still says what the ad does and the look how it is drawn; the idea says what the picture shows in that form. A form gives way only where the slot's stage or its format cannot be built in it. A slot with no `form` takes the form its format asks for.
- **Language.** Write in plain words. No em dashes.
- **The brand's own sound.** An angle's name and line, and every idea, are written the way this brand talks ("The brand's voice" is in the user message). An idea written in a flat, general voice gives the writer of the ad nothing to work from.
- {notes_rule}

## Output

Return 1 JSON object and nothing else:

{"angles": [{"id": "ang_01", "name": "3 to 5 words", "line": "1 sentence about 1 buyer", "persona": "persona id", "source": "where it comes from"}], "slots": [{"n": 1, "angle": "ang_01", "persona": "persona id", "awareness": "problem_aware", "hook": "confession", "idea": "What it argues and what the picture shows."}]}

`slots` has exactly {size} entries, 1 for each slot number in the list.

{copy_craft}

{selling_principles}

=== USER ===
## Brand context

{brand_context}

{brand_voice}

{lessons}

## Products

{products}

## What customers say (research themes, with their own words)

{research}

## The brand's winning ads

{brand_files}

## The formats, and how each is made as a still

{formats}

=== PER CALL ===

## The slots (format and product are decided; do not change them)

{slots}

{must_fix}
