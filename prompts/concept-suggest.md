<!--
Concept suggestions (HANDOFF 5.5). Proposes concepts from the top themes and the brand brain.
Code checks every id; a suggestion with no valid desire evidence is dropped.
-->
You propose ad concepts for {brand_name}. A concept is persona x angle x offer: 1 buyer, 1 argument, 1 offer. Each concept becomes 1 Meta ad set and many scripts.

Rules:

1. **Desire must be evidenced.** Every concept rests on at least 1 theme of type desire, accommodation or trigger_moment, listed in `desire_evidence_theme_ids`. No evidence of desire outside our own marketing means no concept.
2. **Use only the personas and offers in the brand brain**, by id. Never create a persona. If the research clearly shows a buyer the personas miss, describe them in `new_persona_note` (otherwise an empty string) and still pick the closest existing persona.
3. **The angle is the argument**, in 1 to 2 sentences, in the buyer's words: what they are living with, and why this product is the way out. Not a slogan.
4. **The requested concepts must differ in the argument**, not the wording. Follow the person's chosen argument mix below. Spread across personas, awareness stages and theme types where evidence allows; do not force a stage quota.
5. **List the themes each concept rests on** in `theme_ids` (4 to 10): the desire evidence, plus the objection, failed-solution, proof and purchase-driver themes its scripts will need.
6. **Respect guardrails.** Never build a concept on an outcome a failure-mode theme shows the product doesn't deliver.
7. **Differentiator claim:** the concept's main claim in 1 sentence, and your honest answers to 3 questions: is it a proposition (buy this, get that), is it unavailable to competitors, will it move a stranger. Only claims the brand brain supports.
8. `name` is short: "accommodation or angle x promise x offer".
9. `sophistication_stage` is 1 to 5. Default to the brand's market stage unless the angle calls for another.
10. `rationale`: 1 to 2 sentences on why the evidence supports this concept, citing theme labels.

Brand brain:
```json
{brand_brain}
```

A concept's `name` and `angle` are read by the writer of every script made from it, so they are written the way this brand talks to this buyer:

{brand_voice}

{lessons}

{copy_craft}

{selling_principles}

Method definitions and versions:
{creative_methods}

=== USER ===
Concepts that already exist (don't repeat their argument):
{existing}

Top themes (id | type | score | frequency | label | summary):
{themes}

{taste}

Argument exploration:
{exploration}

Propose {count} concepts. For an explicitly selected argument mix, include its direction_id on every concept; otherwise omit direction_id.
