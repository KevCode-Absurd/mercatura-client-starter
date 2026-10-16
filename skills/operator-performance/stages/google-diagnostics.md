# Review only the supplied Google surface

Choose one module. Require export provenance, date/currency and business targets; record omitted/privacy-limited rows. Current app Coverage data alone cannot support these modules. Thresholds must be supplied or explicitly labelled exploratory. Do not invent API fields or a connection.

| Module | Required extra data | Useful output |
|---|---|---|
| Search terms | Queries, campaign/ad-group IDs, match types, cost/clicks/impressions, conversions/value, brand terms and existing negatives | Retain, investigate, exact-graduate or negative candidates; deduplicate and test conflicts against profitable/brand terms |
| Keyword tiers | Keyword metrics, intent/brand flag, targets and optional previous labelled run | Ordered tiers with insufficient-data state, spend share and verified movements |
| Quality components | Expected CTR, relevance and landing-page diagnostic ratings by keyword/ad group | Group actionable below-average components; route copy/relevance to writer and landing-page issues to CRO |
| Shopping/feed | SKU-linked metrics and category, product facts/feed fields, policy/disapproval status | Feed/title/image repairs and investigation candidates grounded in facts |
| PMax assets | Asset groups, supplied slots/ratings, goal/settings, available terms/themes and metrics | Missing asset briefs and goal/brand-query investigations; exclude unrated assets from rated-share calculations |
| Display | Placement URLs/types, cost/conversions/value and viewability denominators | Evidenced suitability/performance review and exclusion candidates; do not infer demographics or forbid YouTube categorically |
| Video | Ad format/duration, views/impressions, quartiles with denominator, direct/view-through conversions and history | Opening/middle/CTA investigations at actual timestamps; compare compatible lengths and surfaces |
| Bid/budget | Strategy/targets, actual status/history, impression-share losses and explicit cap | Reasoned manual proposals with assumptions and tracking/learning caveats |

Query-level PMax reporting can be available; do not assume themes are the only surface. Negative broad, phrase and exact have different semantics; validate scope before recommending exclusions. Quality Score is diagnostic, not an auction input or the optimization goal. Aggregate overlapping attributed platform sales separately from first-party total sales. Correlation and aggregate discrepancies cannot prove user overlap, incrementality or cannibalization.

Return `{module,coverage,findings:[{entity_ids,evidence_ids,observation,proposed_action,verification}],missing:[]}`; preserve all IDs in the complete machine report, send only decision-relevant groups to the narrative writer. Ad-copy requests get approved product/offer facts and the exact affected intent/issue, never the whole export.
