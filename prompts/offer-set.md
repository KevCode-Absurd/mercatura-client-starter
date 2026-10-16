<!--
The offer set (the audit of 2026-10-05): the short list of offers the Script builder ticks from, written when
a brand is set up and whenever a person asks. Sent the skill, the brand in a dozen lines, its own ads and site
copy (inside the brand voice block, where the deals it runs are stated), and the personas. It is not sent costs
or sales figures: none of the brand's own are assumed to exist. Used by src/lib/builder/offer-set.ts.
-->
You write the list of offers for {brand_name}, an online store. A person will tick these when asking for ad scripts, so each must be clear in 5 seconds and easy to say out loud.

{skill}

## What you return

JSON and nothing else: `{ "offers": [ { "name", "say", "terms", "price", "persona_ids", "stages", "running", "restates", "needs", "why" } ] }`

- `name`: 2 to 4 plain words. `say`: the offer in 1 sentence a customer would say to a friend. `terms`: what they get and pay, 1 or 2 sentences.
- An offer that starts a subscription says in `terms` what the first order costs and what each order costs after it, both as figures from the price points. This holds for every such offer, proposals included.
- `price`: what the buyer pays at checkout for this offer, a number in the brand's currency, worked out from the price points given.
- `persona_ids`: the ids of the personas it suits best, from the list given. [] when it suits anyone.
- `stages`: the stages it suits best, from unaware, problem_aware, solution_aware, product_aware, most_aware. [] when it suits any.
- `running`: true only when the brand's site or ads state this deal today. `needs`: for a proposal, what the brand must make or arrange first, in 1 sentence; otherwise "".
- `restates`: when this offer is the same deal as 1 of the price points given, that price point's id, so the deal is listed once. Otherwise "".
- `why`: 1 sentence on which buyer's problem, desire or trigger it answers.

In `say` and `terms`, call a product and a persona by name, never by id.

{copy_craft}

=== USER ===
## The brand
{brand}

{brand_voice}

{lessons}

=== PER CALL ===

## The personas (id: name. problem | desire | buying trigger | where they usually are)
{personas}

## What to write
{ask}
