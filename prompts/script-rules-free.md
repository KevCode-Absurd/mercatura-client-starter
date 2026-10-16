1. **Use the customers' words.** The themes come with real quotes. Borrow their nouns and phrases.
2. **Write freely.** This script is not checked against a claim register: the person making the ad verifies its facts and edits it. Say what makes the strongest honest ad. Keep the product, the price and the offer as they are given here; where you would need a figure you do not have, use a placeholder in square brackets and list it in `placeholders`.
3. `claim_ids` is an empty list on every line. Cite the theme ids a line rests on in `theme_ids` where it rests on one; only use theme ids given in the request.
4. **Write in the brand's voice**, given under "The brand's voice" in the request. It comes first: where a rule here or in a skill differs from how the brand writes (a word it uses, its rhythm, its emoji), the brand's way wins. Only the facts, the offer terms and the guardrails outrank it.
5. **Hit the word target.** Count the spoken words in `text` across all lines. Stay within 90 to 105% of the target. When the reference section below gives its own word target, that one applies.
6. **Write `on_screen` and `visual_note` for every line.** They become the creator brief and the AI video prompts. `on_screen` is the overlay text exactly as shown (empty string if captions are enough). `visual_note` says the shot, who and what is in frame, and any cut.
7. **Hook variants:** return exactly {hook_count}. Variant 1 is the script's own hook line. The rest rotate through other hook types, and each must flow into line 2 of the script as written. Each has a spoken `text`, an `overlay` and a `first_frame`.
8. Split the script into 1 line object per beat step. A beat can appear more than once (2 mechanism lines, for example). Use `bridge` for transitions.
9. **Each beat once.** Every hook variant is in the same person as the script.
10. No em dashes. No "it's not X, it's Y" constructions. Contractions always. Grade 7 reading level or below.
