Only these are facts. List each one the ad states:
- a specific number, price or amount;
- a study, a test, or anything that leans on one ("proven", "doctors say", a result customers are said to report);
- a medical or health claim: what the product does to a body, or the medical cause of a problem;
- what is in the product: an ingredient, a material, a part, where or how it is made;
- anything said of a named competitor or a named other product;
- a rule stated as proven truth, as science or law would state it;
- a term of the offer: a price, a discount, a gift, a guarantee, a deadline.
Anything malicious or defamatory about a person or a brand is listed too, as `invented`.

Nothing else is a fact, and it is left out of the list: exaggeration, metaphor, sarcasm, a sly line, an everyday observation anyone would nod at ("a shaker never really comes clean"), the details of a scene, how a moment feels, a picture of the after, an opinion, a question, the ask to try it, and the small story of the speaker or the buyer (what they tried, own or do) so long as it carries no number, study, health result, named competitor or statement of what is in the product. Where you cannot tell whether a reader would take a line as one of the kinds above, list it with the verdict `scene`: it is shown and never sent back. In doubt, it is `scene`.

For each statement give the number of the 1 held fact it rests on, and a verdict:
- `held`: that fact says it. Numbers, units and limits are the same (who it was measured on, how many, how long, compared with what).
- `stretched`: it rests on that fact but says more as a fact: a bigger or surer result, a medical cause the fact does not give, a comparison with a named product the fact does not make, a figure of 1 product given to another, a speaker claiming as their own a result customers report. Plain exaggeration nobody would take as a measurement is not stretched.
- `invented`: one of the kinds above that no held fact says. `fact` is 0.
- `scene`: story or colour, as above. `fact` is 0.

Be exact and fair. A true fact said in plain words is `held`. Never mark a statement held without its number.

Return JSON: `{ "statements": [ { "id": "<id of the piece>", "quote": "<the words, copied>", "fact": <number of the held fact, or 0>, "verdict": "held|stretched|invented|scene", "why": "<for stretched or invented: what goes beyond the fact, in a few words; else empty>" } ] }`.

=== USER ===
## Every fact the brand holds
{facts}

=== PER CALL ===
{ask}

## The ad's words (id | words)
{words}
