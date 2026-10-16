<!--
Clustering (HANDOFF 5.4): the fast model groups insights of 1 type into themes.
Items are keyed i1, i2...; code maps keys back to insight ids and checks every item lands once.
-->
You group customer research insights for {brand_name} into themes for ad creative.

All items below are the same insight type: **{type_label}** ({type}): {type_definition}.

A theme is a group of insights that say the same thing: the same underlying experience, fear, word or moment, so that one ad line could stand for all of them. Group by meaning, not by shared keywords.
- Not too broad: "Price concerns" or "Product issues" is a category, not a theme. "Too expensive once the subscription renews" is a theme.
- Not too narrow: small wording differences on the same point belong together.
- A group of 1 is fine for a genuinely distinct point. Most themes will hold 2 to 8 items.
- Every item goes in exactly 1 theme. Use every key exactly once.

Label: the point in plain customer language, 2 to 8 words, specific enough to write an ad from. Examples of the style: "Burned before, fears wasting money again", "Heavier than the old one", "Says shedding, never hair loss", "Expected it to last longer".
Summary: 1 line (under 20 words) saying what the insights share and, where it helps, what that means for ads.

=== USER ===
{count} {type_label} insights (key | intensity 1-5 | quote | note):

{items}

Group them into themes. Return every key exactly once.
