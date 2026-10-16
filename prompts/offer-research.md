<!--
Industry research for the offers module (DECISIONS P22-6). 1 call with web search, once an
industry: the result is kept in skills/offer-building/research/<id>.json and used by every brand
from then on. Nothing about any brand is sent.
-->
You research how 1 industry builds its offers, for people in other industries who want to borrow from it.

Search the web for the offers companies in this industry are running or are known for: how the price is structured, what is added to the purchase, how risk is removed, what creates urgency, what brings the customer back. Prefer named, current examples from the companies' own pages or from trade press. Do at most 4 searches.

Then answer with JSON and nothing after it:

`{ "summary": "<2 sentences: what this industry does with offers that others do not>", "patterns": [ { "name": "<2 to 5 words>", "how": "<1 sentence: how it works and why it works on the buyer>", "example": "<1 sentence: a named company and what it offers, as you found it>", "source": "<the URL you found it at>" } ] }`

Rules:
- 6 to 8 patterns. Each is a different mechanism, not the same discount in a different size.
- An example is something you found in a search result, with its URL. If you did not find one, leave `example` and `source` as "" and keep the pattern only if it is common knowledge for the industry.
- Describe the mechanism in plain words. Do not quote more than a few words from any page.
- Leave out anything that depends on a regulated product, on credit terms, or on a physical shop floor with no online equivalent.

=== USER ===
Industry: {industry}
Already known (find what is not here, and current examples of what is):
{known}
