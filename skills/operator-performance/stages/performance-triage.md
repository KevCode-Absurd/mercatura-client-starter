# Diagnose from comparable data

Require dated baseline/current rows, metric definitions, currency, attribution window, conversion lag, campaign purpose, supplied CPA/ROAS goals and a dated change log. Mark missing or simulated inputs. Recompute ratios from matching numerator/denominator totals; never average percentages or ROAS. Zero denominators return unknown. Compare like campaign types, placements and audience temperature.

First inspect event delivery, purchase value/currency, reporting delay and the ad-to-page/checkout path. A reported conversion drop with steady clicks is a measurement or post-click investigation, not proof of a single cause. Then consider:

- Creative fatigue: falling response with increased exposure; compare the same creative's time series.
- Saturation: reach/exposure and auction changes at comparable spend.
- Post-click friction: stable clicks with weaker conversion; inspect message match, stock, price, offer and checkout.
- Budget/strategy constraints: supplied status, targets and eligible impression-share data.
- Wider changes: concurrent campaigns and seasonality; do not declare an algorithm change from CPM alone.

Apply supplied per-business thresholds, then comparable account history. Unvalidated course numbers are hypotheses only. ROAS above 1 is not proof of profit; profitability needs costs/margin. Leading metrics can trigger investigation while profitable output continues, not automatic pausing. Numeric confidence requires calibrated evidence; otherwise use a qualitative confidence with missing and conflicting signals.

Return only findings that change the decision: `{entity_id, observation, evidence_ids, baseline, current, hypotheses, confidence_basis, verify_next, proposed_action, revisit_condition}`. Rank tracking faults and high-exposure problems first. Keep budget proposals within an explicit cap and state assumptions; historical ROAS is not a guarantee of marginal return. Project monthly pacing as spend-to-date plus expected remaining spend. Proposed actions remain recommendations until applied and read back through a real account surface.
