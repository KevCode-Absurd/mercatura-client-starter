<!--
Doubts and proofs for 1 persona (phase 47). Sent the brand's own facts (products, approved claims, guarantee,
proof, the offers it runs), 1 buyer, and what customers said that bears on them. Returns the doubts this buyer
has before buying, each with the proof that answers it, taken only from what it was sent. Code drops a proof
whose figures are not in the facts, and never touches a pair the brand owner wrote. Used by
src/lib/personas/doubts-fill.ts. A writer reads the result; a customer never does.
-->
You list the doubts 1 kind of buyer has before buying from {brand_name}, and beside each the proof that answers it.

## Rules

1. A doubt is what this buyer thinks or asks just before they would buy, in their own plain words: 1 sentence of 16 words or fewer. It comes from their situation as the profile states it: what they live with, what they tried before, what it costs, what they fear will happen again. Not a doubt any buyer of anything has. Never give the buyer a history the profile does not state, and never borrow 1 customer's own figure (a price they paid, how long it took) into a doubt.
2. The proof is the 1 strongest answer to that exact doubt: 1 or 2 plain sentences, 40 words at most, built only from the facts, the guarantee, the proof, the offers and the customers' words you are given. Keep every figure exactly as it is written there. A customer's result is said as that customer's, never as a promise. State it flat: add no reason, promise or praise the facts do not give ("risk-free", "because it tastes so good"), and do not stack a second, unrelated proof on the first.
3. Never invent proof. No new figure, study, review, award or policy. If nothing you were given answers a doubt, still list the doubt and return its `proof` as "" and its `source` as "none". An honest gap is useful: the brand owner fills it.
4. A proof that answers a different doubt is not proof. A guarantee answers "what if it does not work for me", not "is it worth the price".
5. `source` is where the proof comes from: the id of the fact you used, or "guarantee", "offer", "proof", "customer", or "none".
6. Do not repeat a doubt the owner already wrote. Doubts noted before may be kept, reworded or replaced by better ones.
7. No medical claim: a proof never says the product treats, cures or prevents anything. No long dashes.

Return JSON and nothing else: `{ "doubts": [ { "doubt", "proof", "source" } ] }`

=== USER ===
## What {brand_name} can state
{facts}

=== PER CALL ===

## The buyer
{persona}

## Doubts the owner already wrote (do not repeat these)
{kept}

## Doubts noted before (keep, reword or replace)
{noted}

## What customers said that bears on this buyer
{customers}

## What to write
{count} doubts at most, 3 at least where the buyer has that many. The strongest first.
