# 09-CRO-testing playbook

version: 2.0-draft  |  date: 24 Sep 2026  |  sources: 7  |  cards: 177  |  built from: sources/*.md

## 0. How to use this playbook

**Ecommerce first.** This playbook is written for ecommerce stores, not for SaaS, lead-gen or publisher CRO. Section 3.0 is the priority order: load it first, before any of the numbered rule groups, to rank which lever to work on for this store. Store-type conditions decide which rules apply: hero SKU vs catalogue, low vs high AOV, subscription vs one-off, marketplace-heavy, luxury or considered purchase, and mobile-first India vs US. Read the condition on every rule before applying it to a specific store.

**Who runs it.** The growth experimentation agent (CRO agent). It owns the funnel read, the research inputs, the hypothesis backlog, the repair-or-ship-or-test call, test design, validity checks, the readout, and the registry record. A page audit worker can run section 5 on its own. Page redesign and copy execution hand off to 07-LPG.

**Which sections to load for which task.**

| task | load |
|---|---|
| Find where the funnel leaks | 2, 3.1, 3.2, procedures P1 to P3, checklist 5.1 |
| Gather research (recordings, heatmaps, surveys, review mining, user tests) | 3.3, P4 to P9, checklist 5.8 |
| Audit a page type for test ideas | 3.10, checklists 5.2 to 5.7 |
| Write and rank hypotheses | 3.4, P10, P11 |
| Decide repair, ship or test | 3.5, P12, section 6 |
| Size and design a test | 3.6, 3.7, P13, P14, section 6 |
| Launch, monitor, audit validity | 3.7, P15, P16, checklist 5.9 |
| Read and close a test | 3.8, P17, P18 |
| Prove programme or feature value (holdouts) | 3.9, P19, P20, P23 |
| Price or offer test | 3.11, P21 |
| Shopify platform limits | 3.12, P22, section 11 |
| Any point where sources disagree | section 7 |
| What to hand back | section 9 |

**Fetch before acting.**

- From brand data: monthly sessions (GA4, not Shopify), monthly orders, conversion rate by page, device and traffic temperature, AOV including shipping collected, gross margin by SKU, funnel stage rates, weekly traffic on any candidate test page, review count and media-review share, past test log and which winners are still live. Full list in section 2 and section 10.
- From the data layer: behaviour tool (Microsoft Clarity or Hotjar), survey tool (post-purchase and exit), GA4 Explore funnel, Shopify analytics, the A/B testing tool and its stats engine.
- From the web: current Shopify checkout A/B options and plan limits, the testing vendor's stats engine and free tier, current tool prices, current Baymard figures. List in section 10, cadence in section 11.

**Source notes to keep in mind while reading.**

- Mini playbook 01 (Exposure Ninja CLOSER course, 2020) was built for lead generation and service businesses. Its presenter says the ecommerce lure is "obviously" the product and that the sales-process lesson is "only relevant for service companies". Every ecommerce use of 01 in this playbook (PDP proof placement, quiz design, cart reassurance, email-capture lures, form-field rules) is the card writers' adaptation, not the presenter's claim. Rules that rest only on 01 are marked "(01, lead-gen adaptation)" and are hypotheses to test, not proven ecommerce practice.
- Mini playbooks 05 and 06 carry header labels for 06-MEA. Parts of them belong to neighbour folders and are only pointed to here: tracking setup and GA4 funnel configuration (06-MEA), speed work (08-SPD), cart-recovery email and SMS flow builds (14-EML), ad-channel geo and platform lift tests (11-ADC), finance (20-FIN), page design output (07-LPG). This playbook keeps what an experimentation agent needs to design, run and judge on-site tests and holdouts.
- No case number here is a promise. None of the 7 sources reports sample size, duration and confidence for its own case results. Only 05 (the statistics manual) cites published studies with methods.
- Tags: `[verify UI]` for platform steps that change, `[needs brand data: what]` for anything that depends on the brand's own numbers, `[web check: what]` for anything to confirm live.

## 1. Scope and outcomes

**This folder covers.**

- Reading the purchase funnel and finding the biggest drop weighted by traffic and value.
- Research inputs that produce hypotheses: session recordings, click, scroll and Area maps, post-purchase and exit surveys, one-time surveys, review mining, user tests, customer interviews, self-purchase audits.
- Page-type audits (home, collection, PDP, cart, checkout, mobile) written as test-hypothesis checklists.
- Writing and ranking hypotheses with an evidence gate and a profit-weighted score.
- Deciding repair, ship or test by traffic, orders and the type of change.
- Sample size from a minimum detectable effect, runtime, stopping rules, validity checks (SRM, flicker, bots, tracking, promo overlap, peeking, multiple comparisons, novelty).
- Reading a result with a confidence interval, guardrails and business value; closing and recording it.
- Holdouts and incrementality for on-site work: feature holdouts and CRO programme holdouts. Channel holdouts and causal methods are described only far enough to route the question.
- Metric choice: revenue per visitor and contribution per visitor over conversion rate, with the traffic penalty that comes with revenue metrics.
- Price and offer test limits, Shopify platform limits, research tool choice.
- The registry record for every test, repair and holdout.
- Marketplace-lite stores: a DTC brand that also sells on Amazon, Flipkart, Meesho or Instagram/WhatsApp. Read the on-site funnel and tests in this folder for the brand's own site traffic only; a marketplace listing's own conversion and reviews are a separate channel, not part of this playbook's funnel. `[general practice]`

**This folder does not cover (neighbour folder).**

- Page design, copy rewrites, landing-page formats and offer construction as deliverables: 07-LPG. Section 3.10 keeps only the rules that seed test hypotheses.
- GA4 event setup, funnel configuration, attribution, tracking QA: 06-MEA. This playbook only says when broken tracking invalidates a read.
- Speed work (LCP, INP, images, scripts): 08-SPD. Section 3.10 keeps the mobile LCP target and the rule to isolate revenue impact.
- Cart-recovery email and SMS flows: 14-EML. This playbook keeps only "compare against a holdout".
- Ad-channel incrementality (geo holdouts, platform lift studies, on/off tests) and Meta ad-set splits: 11-ADC.
- Finance definitions beyond gross margin: 20-FIN.
- Difference-in-differences, BSTS, synthetic control, propensity matching, instrumental variables, regression discontinuity: named in 06 for routing only. They need specialist implementation and live with 06-MEA.

**Business measures this folder moves.**

- Revenue per visitor (RPV = conversion rate x AOV) and contribution per visitor (RPV x gross margin %). Primary outcomes.
- CAC, through conversion rate: CAC is about ad spend / (sessions x conversion rate), so a lift cuts CAC in proportion (02).
- Conversion rate by stage and segment, as a diagnostic.
- AOV, return rate, refund rate, repeat rate and LTV by acquisition angle, as guardrails.
- Programme value: net incremental lift against a holdout, not the sum of test lifts.

## 2. Inputs the agent needs

| input | from where | required or optional | why |
|---|---|---|---|
| Monthly sessions (GA4) and monthly orders, last 3 to 6 months | data layer (GA4, Shopify) | required | Picks the traffic band and the CRO model (R53 and R54). Shopify sessions include more bots (02). |
| Conversion rate by page, device, and traffic temperature (cold paid, warm, returning) | data layer | required | Diagnoses mix effects before any page change (R15). Baseline for sample size (R59). |
| AOV including shipping collected; revenue net of tax | data layer (Shopify: Net sales + Shipping collected) | required | Correct RPV (R3). |
| Gross margin by SKU or category | brand record or finance | required for ranking and RPV decisions | Profit-weighted prioritisation (R9, R44); contribution per visitor. |
| Funnel stage rates: PDP view, add to cart, checkout start, checkout complete, purchase, by device and channel | data layer (GA4 Explore funnel, Shopify) | required | Finds the biggest leak (R12). |
| Weekly eligible traffic on each candidate test page | data layer | required before any test | Runtime math (R62). |
| Weekly orders on the tested path | data layer | required before any test | Conversions per variant (R60). |
| Behaviour tool access (Clarity or Hotjar) with 90 days to 6 months of data | data layer | required | Insights, heatmaps, recordings (R23 to R30). |
| Post-purchase survey answers ("what almost stopped you") | data layer or user | required if it exists; else set it up (P7) | Objections that seed hypotheses (R31). |
| Exit-intent survey answers | data layer | optional | Non-buyer reasons (R32). |
| Review export (CSV) and review count, media-review share | data layer (review app) | required when 500 to 1,000+ reviews; optional below | Review mining (R34); proof rules (R104). |
| Past test log: hypotheses, results, which winners are still live | brand record | required | Avoid re-running losers; protect winners (R85, R87). |
| Repair log | brand record | required | Stops repairs being re-proposed as hypotheses (R50). |
| Active ad concepts by persona, offer and angle, with spend | brand record or 11-ADC | required for message-match audits | R108. |
| Checkout extras (shipping, tax, fees) as % of AOV | data layer | required for checkout audit | R116. |
| Returns, chargebacks, repeat rate and 365-day LTV by acquisition angle | data layer | optional, required before scaling a winning angle | R84. |
| Shopify plan tier and checkout extensibility status | brand record + `[web check]` | required before planning a checkout test | R123, R133. |
| Testing tool, its stats engine, prior (if Bayesian), SRM alert setting | data layer + `[web check: vendor docs]` | required before writing a brief | R67 to R69. |
| Marketing calendar (promos, launches, holidays) for the test window | user or brand record | required | Promo overlap check (R74). |
| Device split, logged-in or returning identified share | data layer | required | Mobile-first effort (R124); CUPED eligibility (C5). |
| Credibility asset inventory (reviews, UGC, certifications, press, warranty, customer counts) | brand record | optional | Proof hypotheses (R104). 01, lead-gen adaptation. |
| Brand voice and claims that are substantiated | brand record | required before any copy hypothesis ships | Health and beauty claims need substantiation (02). |
| Competitor and paid-ad landing pages | web (public) | optional | Pattern research only (R41). Keep separate from private data. |
| Current Baymard abandonment figures | `[web check]` | optional | Checkout hypotheses (R116). |

## 3. Decision rules

Every rule states the rule, when it applies, the mini playbooks that support it (by number), any conflict (by section 7 code), and card ids. Where only 1 source supports a rule, the rule says so. Where sources disagree, the strictest condition is kept here and the disagreement is written out in section 7.

### 3.0 Ecommerce priority order

1. Repair defects and checkout blockers first. R50, R16, R123. Costs every store type; matters most on considered-purchase or luxury sites where one lost sale is expensive.
2. Read the funnel for the biggest weighted leak. R12, R13. For a single-hero-SKU store the "page" is usually the PDP; for a catalogue store it can be collection or search.
3. Diagnose traffic-mix effects before touching a page. R15. Matters most for ad-driven, cold-traffic stores; less for repeat or organic-heavy stores.
4. Mobile-first audit and fixes. R124. Highest for mobile-first markets (India, Southeast Asia) at 80 to 95% mobile share; lower for a desktop-researched, high-ticket purchase. `[general practice]` for the desktop case.
5. PDP: 4 hero questions, proof and CTA above the fold. R101, R102. Top for single-hero-SKU brands, where the PDP does the homepage's job; shares priority with collection UX on a catalogue store.
6. Checkout friction removal: guest checkout, express pay, fewer fields, upfront costs. R116 to R119. Highest for low-AOV, impulse, cold-traffic stores; lower once a luxury buyer has already committed.
7. Cart economics: free-shipping threshold and bundle upsell tuned to AOV. R114, R131. High for low-to-mid AOV catalogue stores; does not apply to a single-SKU subscription store, which has no "add more items" lever. `[general practice]`.
8. Proof and review strategy matched to store maturity. R104. Very high under 100 reviews (build volume); drops toward relevance once mature.
9. Message match from ad to landing page. R108. High for paid-social acquisition; low for repeat, email or retail-driven stores.
10. Price and offer construction: no same-SKU price tests, prefer bundles and tiers. R129 to R131. High for promo-heavy, multi-SKU catalogues. No offer content here for subscription plan tiers. `[general practice]`.
11. Traffic-gated test aggressiveness by order volume. R53, R59. Governs how hard every lever above can be tested; binds tightest for low-order, single-SKU or marketplace-heavy stores.
12. LTV and guardrail check before scaling a winning angle. R84. Last gate before spending against a win; most critical for claims-driven categories (health, beauty).

Load this block first; the groups below are the detail.

### 3.1 Metric choice

**R1. Judge CRO on revenue per visitor or contribution per visitor, not on conversion rate.** RPV = conversion rate x AOV. Contribution per visitor = RPV x gross margin %. Condition: always as the decision lens; as the statistical primary metric only when traffic can power it (R6). Sources: 02, 03, 06; 05 agrees on the objective and adds the traffic penalty. Conflict: C8 (01 calls conversion rate "the only metric that matters"). Cards: [b9f3fede007a] [b2dc4e814c63] [372439a05cbd] [a9ed03163804] [83db79dbdb65] [25f9d85cd8e3] [7eeb62d20124].

**R2. Treat conversion rate as a diagnostic, never as a north star, and never compare it across brands.** 02 says it is the output of about 50 inputs, most of them off the page: category, price point, AOV, traffic source, how much the creative educates, purchase intent, cold-traffic share, product quality, return rate. 03 adds that a price cut raises conversion rate while cutting revenue per visitor. Condition: every readout and every benchmark comparison. Sources: 02, 03. Cards: [953e03390b0d] [b9f3fede007a] [83db79dbdb65].

**R3. Compute the numbers correctly before reading them.** Revenue: not Shopify "Total sales" raw (it includes tax); use Net sales + Shipping collected, or Total sales minus tax. AOV: Shopify's AOV excludes shipping collected; add it back. Sessions: use GA4, because Shopify sessions include more bot traffic. Conversion rate: corrected orders divided by GA4 sessions. Condition: every RPV or conversion figure this agent reports. Source: 02 only. `[verify UI]` `[needs brand data: GA4 vs Shopify session gap]`. Cards: [91d639e7e2e2].

**R4. Keep contribution per visitor gross.** Do not subtract CAC or ad spend from it. Read it next to LTGP:CAC, contribution profit and returning-customer rate, and track RPV as a long trend (02's agency uses about 2.5 years). Condition: reporting and trend reads. Source: 02 only. Cards: [b9f3fede007a] [91d639e7e2e2].

**R5. Never judge on one metric alone, because every single metric can be gamed.** Turn off paid ads and conversion rate rises while revenue falls. Run traffic campaigns and sessions rise with no revenue. Push high-AOV products and AOV rises while CAC makes them unprofitable. Cut prices and conversion rises while RPV falls. Raise opt-ins with a popup while purchases fall. Condition: every readout. Sources: 02, 03, 06. Cards: [91d639e7e2e2] [83db79dbdb65] [c076b110d253].

**R6. Pick the statistical primary metric by the decision and by the traffic.** Conversion rate is binary, low variance and fastest but ignores order value. Revenue per visitor captures both but is heavily skewed (97% of visitors spend $0; coefficient of variation about 750% in 05's example) and needs about 6x the traffic (about 175,000 vs 28,000 visitors per variant at a 3% baseline for the same relative MDE). Gross profit per visitor is "the honest objective" but has the same variance plus needs margin data. Condition: RPV as primary only when the store is in the 3,000+ orders per month band, winsorized; borderline near the top of the 300 to 3,000 band; below that, conversion rate primary with AOV, margin and RPV as guardrails. Sources: 05; 02 and 03 recommend RPV without this caveat. Conflict: C9. Cards: [7eeb62d20124] [0bda3b4d7e04] [b9f3fede007a] [a9ed03163804].

**R7. Guardrails must not get worse, even when the primary metric improves.** Standard guardrails: AOV, gross margin, return rate, refund rate, page load, add to cart, downstream purchase; add returns, chargebacks, repeat rate and 365-day LTV by acquisition angle before scaling a winning angle. A conversion win that tanks AOV, margin or LTV is not a win. Condition: every test brief and every readout. Sources: 05, 02, 06. Cards: [1f26cd618e2d] [7eeb62d20124] [dad9c85ea261] [c076b110d253].

**R8. Use a micro-conversion (add to cart, begin checkout, CTA click share, reach) as the primary metric only as a leading indicator, with purchase and revenue as guardrails.** Condition: low volume (30 to 300 orders per month), or when the tested step sits far from purchase (a collection filter, a homepage module). Never bank a micro-conversion lift without checking purchase. Sources: 05, 04. Cards: [67f74e89d43e] [1b7725e0ff57] [6d2e6fafa7df].

**R9. Weight by gross profit per conversion, not revenue, when ranking and reading.** A lift that shifts the mix toward low-margin SKUs can raise revenue and cut profit. Judge offers, bundles and thresholds on contribution, not AOV alone. Condition: prioritisation (R44) and any offer or mix test. Sources: 05, 02. `[needs brand data: SKU margin]`. Cards: [aad25dea9ed9] [0ca0ef2a3d5d].

**R10. Judge a CRO retainer by incremental revenue or margin against a holdout of the store's own traffic, not by how many PDP or checkout tests were shipped that month.** "Would this have happened anyway? If you cannot answer that, you are optimising in the dark" (06). Condition: any programme review or agency report. Sources: 06, 05. Cards: [0eca60fd9161] [f671352f5b6e] [70db51ffb976].

**R11. Make the business case through CAC and the revenue equation, not through conversion rate itself.** CAC = ad spend / new-customer orders, about ad spend / (sessions x conversion rate). A conversion lift cuts CAC in proportion and lets spend rise back to the old CAC ceiling. 01's lead-gen version: at £1 CPC, 1% conversion is £100 per lead and 3% is £33. 06's version: revenue = traffic x conversion rate x AOV x repeat rate; CRO controls 3 of the 4. Condition: when deciding whether CRO work is worth funding versus more spend. 02 notes he has "almost never seen" anyone double conversion, and that conversion rate is only a small second-order input to Meta CPM. Sources: 02, 01, 06. Cards: [82fbec40a149] [b22709fcf770] [ab4878e2910b] [93fdbe5da8f2].

### 3.2 Reading the funnel and finding the biggest drop

**R12. Read the funnel before choosing a fix.** Instrument: sessions, product page view, add to cart, checkout start, checkout completion, purchase, plus AOV and RPV, by device and channel. For paid traffic also map ad, landing page, PDP, cart, checkout, thank-you page, post-purchase upsell. Pick the stage with the biggest leak weighted by the traffic and value passing through it. 03 calls funnel drop-off analysis a "non-negotiable" for every store, though a full GA4 analysis is not required under 300,000 sessions. Condition: first step of every engagement and after every shipped change. Sources: 03, 06, 05, 07. Funnel configuration itself: 06-MEA. `[needs brand data: stage conversion rates by device and channel]`. Cards: [bbe716a39c74] [9568c40e1d88] [25f9d85cd8e3] [f856d689f3d8] [382d08d3f6aa].

**R13. Compare each stage with the 06 bands, but treat them as directional because 06 names no study.** Overall conversion: poor under 1%, average 2 to 3%, good 3 to 5%, excellent over 5%. Add to cart: poor under 5%, average 8 to 12%, good 12 to 18%, excellent over 18%. Cart to checkout: poor under 30%, average 50 to 60%, good 60 to 70%, excellent over 70%. Checkout completion: poor under 50%, average 60 to 70%, good 70 to 80%, excellent over 80%. PDP conversion by vertical: beauty 2.5 to 4%, apparel 1.8 to 3%, electronics 1.2 to 2%, home 1.5 to 2.5%. Condition: check traffic intent, cold share and device mix before blaming design on a low band; 02 says conversion rate has a ceiling set by category, price and traffic quality. Source: 06 only for the bands; 02 for the ceiling. Cards: [25f9d85cd8e3] [953e03390b0d].

**R14. A funnel drop on the PDP, cart or checkout step shows where shoppers leave, not why.** Watch recordings, read heatmaps, or survey that exact step before writing a hypothesis. Condition: always. Sources: 03, 07, 04. Cards: [bbe716a39c74] [382d08d3f6aa] [6d2e6fafa7df].

**R15. Before touching a page after a conversion-rate change, diagnose the mix.** Split conversion by traffic temperature (cold paid, warm, returning). If cold share rose, the blend falls with no page change (02's example: blended 2.8%, cold 1%, warm 4%). Check returning-customer share (it inflates conversion rate and AOV), category, price point, AOV and creative changes. Audit the page only if a segment's own rate fell with steady creative. If clarity, offer and proof are already good, look at product quality, first-order contribution, launches and repeat purchase before another redesign. Condition: any conversion-rate move that triggers a redesign request. Source: 02 only. `[needs brand data: cold vs warm conversion rates]`. Cards: [953e03390b0d] [372439a05cbd].

**R16. When checkout completion is the leak, fix checkout first, mostly as repairs rather than tests.** Baymard (as cited by 05 and 06): 70.22% average cart abandonment across 50 studies, about 32 checkout improvements available on a large site, about 35% checkout uplift available from UX fixes alone, 11.3 average form fields. 06 calls "fix checkout first" strategic priority 1. Condition: applies when the checkout completion band is poor or average (R13). Most checkout changes on standard Shopify plans cannot be A/B tested client-side (R123), so ship them as repairs and best practice, and measure with before-and-after stage rates as weak evidence (R55). Sources: 06, 05, 02. `[web check: current Baymard figures]`. Cards: [d4104b13110f] [3163cc34fa79].

**R17. Confirm tracking health before trusting any funnel read.** Compare event counts with orders in the store backend. Missing or inconsistent events mean fix tracking first (06-MEA). Broken tracking invalidates a test read. Condition: before every funnel read and every test launch. Sources: 07, 05. Cards: [382d08d3f6aa] [3eca46fe9ba3].

**R18. Category exit rate should sit near the site average.** A high exit rate means visitors leave the site instead of moving to product pages. Check traffic intent first, then design. Condition: collection pages with material traffic. Source: 06 only. Cards: [1e03a58f6fe1].

**R19. Treat every PDP and collection page that gets direct entrances as a cold-traffic landing page.** Search and ads send people to inner pages, so homepage proof and awards are not seen. Audit those pages as landing pages. Condition: pages with a material share of direct entrances. Source: 01 (lead-gen origin; the ecommerce use is the card writer's). `[needs brand data: which pages get direct entrances]`. Cards: [3127398d2368].

### 3.3 Research inputs

**R20. Research produces hypotheses, not tests, and every hypothesis needs at least 2 points of evidence before it enters the backlog.** Quantitative data shows what is happening; qualitative data shows why. Analytics plus 1 of: replay, heatmap, survey, user test, interview. 03 calls data "single-handedly the most important thing" in CRO. 05 notes DRIP's 36.3% win rate comes from pre-qualifying every hypothesis with analytics, recordings and heatmaps. Condition: every backlog entry. Sources: 03, 05, 04, 07. Cards: [25979af2691c] [f856d689f3d8] [aad25dea9ed9] [6d2e6fafa7df] [6e48c0e74fe7].

**R21. Run 03's non-negotiables at any traffic level.** Funnel drop-off analysis; a heatmap on the PDP ("at 10,000 or 10 million sessions"); a false-click and rage-click check; a post-purchase survey; and review mining once the store has 500 to 1,000+ reviews. Allow about 1 to 2 weeks to gather this under 300,000 sessions. Condition: every store before its first test. Source: 03; 05 and 07 agree on the inputs. Cards: [9568c40e1d88] [b4505f6c4061] [fc9b05411697] [bbe716a39c74].

**R22. Behaviour data supports a hypothesis; it never proves a lift.** Heatmaps, scroll maps and recordings show behaviour, not cause or statistical significance. Use them to prioritise a test, then apply sample-size math before claiming conversion or revenue impact. Condition: always. Sources: 04, 07, 05. Cards: [6d2e6fafa7df] [0b8d2f6cc4d1] [3043da84ee0c].

**R23. Start every map or recording review from the page's one core action.** Name it first (add to cart, buy now, start checkout, sign up). Then ask 3 questions: do people reach that section, do they take the action, and if not, what would get them there. Condition: every page review. Source: 04. Cards: [09583734387e] [6d2e6fafa7df].

**R24. In Clarity, read the Insights block and the recordings, and take top-line metrics from GA4.** Rage clicks, dead clicks, excessive scrolling and quick backs are Clarity's value. Sessions, scroll depth, pages per session, smart events, channel and device all come from GA4, which 04 says does funnels "a much better job". Keep top-line metrics only as context and for segmentation. Condition: any Clarity review. Source: 04. `[verify UI]`. Cards: [e053644d5707].

**R25. A percentage alone never justifies a change; watch the recordings behind it.** If a real usability issue exists, fix it whatever the rate. If the rate is low and no clear issue shows, it is not a priority. 04's heuristic: rage clicks under about 1 to 2% is "good" (demo account 0.2%); excessive scrolling under 0.01% "not a major concern". No threshold for dead clicks or quick backs. Condition: every Insight rate. Source: 04 only. Cards: [9d9871ee324b] [5b9da7dd1967] [e053644d5707].

**R26. Classify behaviour signals by what the shopper expected.** Rage clicks usually mean a shopper cannot get out of something or cannot make something work: a popup in the first 5 seconds, a chat widget covering add to cart or submit, a hard-to-hit close control. Dead clicks matter only when the missing action would help the purchase (site logo that does not go home, product image that does not open a gallery, pricing block with 1 working button, informational check marks); press logos can stay static so shoppers do not leave. Excessive scrolling and quick backs usually mean missing or buried information (reviews, price, add to cart, delivery). Elements styled like buttons or links that do nothing ("false clicks") cost money; 03 reports "massive" wins from removing them in high-volume stores. Condition: confirm the cause in recordings for the same page and device before assuming. Sources: 04, 03. Cards: [9d9871ee324b] [0eae610ddc62] [5b9da7dd1967] [9568c40e1d88] [a2d5c573076a].

**R27. Read scroll reach and click share together.** High click share on a module with low reach means placement is hiding real demand: test moving it up, alone, with the design and destination unchanged (07's example: a "shop by industry" module with 10.41% of homepage clicks reached by only 30 to 35% of visitors; a reported 18% conversion lift with no statistics). A highly visible module with few clicks means weak relevance, unclear affordance or a less important need. A sharp scroll drop right after one block (04's example: 93% reach above a long paragraph, about a 30% drop after it, only 25% reaching add to cart) means the block is in the way. Confirm intent versus confusion in recordings. Condition: any page with a scroll map and click or Area map. Sources: 07, 04, 03. Cards: [de4dfe536e94] [3043da84ee0c] [09583734387e] [edd07a1a15f6] [9568c40e1d88] [bc5a8130eee9].

**R28. Weight clicks by revenue when the tool allows; otherwise by click share, never by raw counts.** 05 says to weight heatmaps by revenue per click. 03 names heatmap.com for revenue-tied heatmaps (the presenter's partner, disclosed). Clarity gives exact click share per region in Area maps. Condition: any heatmap reading. Sources: 05, 03, 07. Cards: [9568c40e1d88] [9e1368a119b8].

**R29. Recordings: no quota; block 1 to 2 hours; compare engaged with disengaged; stop when patterns repeat; restart after every shipped change.** 04 watched about 100 for some clients and 400 to 450 for others. Sort by clicks and pages high to low (most active) then low to high (least active) and compare on the same page type. Ask "why" about every action. Engagement sorts can mislead: long sessions can mean intent, confusion or idleness. Condition: every research round. Source: 04. `[verify UI]`. Cards: [0b8d2f6cc4d1] [a1a3e1f62713].

**R30. Fix the heatmap screenshot and filter by the biggest device before reading.** If a popup that fires in the first 3 to 5 seconds, or a broken layout, was captured, use Change screenshot and pick another version. Read the device with the most traffic first. Read the scroll map at top, average fold, 75%, 50% and 25%. Condition: every heatmap read. Source: 04. `[verify UI]` `[needs brand data: device split]`. Cards: [09583734387e] [edd07a1a15f6].

**R31. Run a post-purchase survey with at least 2 questions: "What made you purchase today?" and "What made you almost not purchase today?"** 03 calls it "probably single-handedly the most effective way to optimise your store"; the second answer is the objection source for hero copy, FAQs and tests. Group answers into objections (quality, time to results, fit, shipping, guarantee, how to use) and check each is answered near the decision. Buyer-only bias: pair with an exit survey and user tests for non-buyers. Attribution questions ("how did you hear about us") belong to 06-MEA; do not mix them into CRO research. Condition: every store; set it up now if missing (P7). Sources: 03, 07, 05. `[verify UI]`. Cards: [b4505f6c4061] [91410aaad2c8] [f89dbadb9131].

**R32. Run an exit-intent survey for non-buyers.** Questions from 07: "What stopped you from buying?", "What almost stopped you from converting today?", "What's the reason you're exiting the site?" Group into themes: product uncertainty, price, shipping, trust gaps, missing info, comparison needs, unclear fit. Exit surveys hear only those who answer. Condition: any store with enough traffic for responses; treat answers as hypothesis input, cross-checked with recordings and funnel data. Sources: 07, 05. Cards: [f89dbadb9131].

**R33. If no post-purchase survey exists yet, bootstrap with a one-time survey.** Email customers and VIPs a Typeform or similar; 03's incentive example is a chance to win a $250 Amazon gift card. Condition: only until the post-purchase survey is live. Source: 03. `[verify UI]` `[web check: prize-draw and data-privacy rules in the brand's market]`. Cards: [b3b265cf22f6].

**R34. Mine reviews with an LLM, then read the source reviews to confirm.** Export reviews to CSV, prompt for commonalities, tone of voice, buzzwords, key phrases, friction points, objections and feedback that differentiates the product. Answer the objections on the front end; use the unique feedback for one-of-one positioning (02). Condition: 03 makes it non-negotiable at 500 to 1,000+ reviews; 02 uses it at any count for positioning. Sources: 03, 02. `[needs brand data: review export]`. Cards: [fc9b05411697] [cf0bc0f31721] [79bdf741dfc4].

**R35. Run task-based user tests with 5 to 8 people per task.** First prompt: first impressions on landing. Then real tasks: find a suitable product, add it to cart, check out. Watch for missed navigation, misread product details, missed key info, hesitation at cart, checkout doubts. These are small qualitative samples, not conversion estimates. Impartial testers matter: owners cannot judge their own site's first impression (01). Condition: before any redesign hypothesis; after any funnel drop with no obvious cause. Sources: 05 (5 to 8), 07, 03, 01. Cards: [f856d689f3d8] [f375f7ffb264] [c0690a74d2de] [9398191fe1b4].

**R36. Buy from your own store at least every 4 weeks, on mobile, desktop and tablet.** Hand your phone to a 70-year-old and watch them buy. Look for exit popups and cookie banners covering the PDP CTA or the cart button, and for bugs on any device. Condition: every 4 weeks and before every test launch. Source: 03. Cards: [a2d5c573076a].

**R37. Call recent buyers of the flagship SKU, or a random sample across the catalogue, and ask why they bought, whether checkout was easy, and what words they used for the product.** Interviews feed messaging hypotheses. Condition: any time survey answers are thin or ambiguous. Sources: 03, 05. Cards: [c0690a74d2de] [fc9b05411697].

**R38. Pick Clarity, Hotjar or Okendo by the store's daily session volume and Shopify plan tier, not by feature lists.** A single-SKU store under a few hundred daily sessions should default to Clarity's free tier before paying for an all-in-one platform. Clarity for heatmaps and recordings (free with no data limit at 07's recording time; 03 calls it "quite laggy"). Hotjar when an all-in-one platform (surveys, interviews, funnels) is worth the cost, noting surveys are a separately paid component and plans are priced by daily sessions (Plus $32 a month for 100 daily sessions at recording time; 07's firm moved 300,000 to 400,000-visitor clients to Clarity for cost). Unbundle when you can run several tools: Clarity, Okendo (Shopify surveys), Userbrain ($40 per tester at recording time), GA4 Explore funnels. Before migrating, confirm privacy, retention and any Hotjar feature in active use. Condition: any tool decision. Sources: 07, 03, 06 (lists without choosing), 02 (install Clarity). `[web check: current Clarity, Hotjar, Userbrain, Okendo pricing and limits]` `[needs brand data: daily sessions, normal and peak]`. Cards: [9e1368a119b8] [3728f5d4ae33] [6e48c0e74fe7] [373e2f9d659a] [a56c27356031].

**R39. Set the behaviour review window to the longest representative period.** 04 uses about 6 months; use 90 days if the tool is newer. A big site, merchandising or traffic change makes an older window less representative. Condition: every review. Source: 04. Cards: [e053644d5707].

**R40. Do not pay for a funnel feature you already have.** GA4 Explore builds custom funnels (product view, add to cart, begin checkout, purchase). Confirm ecommerce tracking is configured before reading it (06-MEA). Condition: any tool budget. Source: 07. `[verify UI]`. Cards: [382d08d3f6aa].

**R41. Use competitor and paid-ad landing pages as pattern research only.** Advertisers pay per click, so they are more likely to measure; but a paid ad does not prove a page is profitable. Use for layout and mood; never copy text, logos, products or faces (repo rule). Keep public web research separate from private brand data. Condition: hypothesis generation only. Source: 01 (lead-gen adaptation). Cards: [a8ff5e236f0f].

### 3.4 Writing and ranking hypotheses

**R42. Write every hypothesis in the pre-registration form.** "Because we observed [evidence], we believe [change] will cause [effect] for [segment], measured by [primary metric]. We will know it worked if [metric moves by at least MDE]." Equivalent shorter forms: change, expected outcome, rationale (03); IF [change] THEN [result] BECAUSE [reasoning] (06); change plus reason (04). The rationale must come from data. Condition: every backlog entry; the expected outcome is only possible after research. Sources: 05, 03, 06, 04. Cards: [1b7725e0ff57] [a6c0f42b99a3] [300b03fc0354] [6d2e6fafa7df].

**R43. Cross-check survey themes against funnel and heatmap data, and re-survey after shipping.** An objection that appears in surveys, shows as a drop at the matching step and shows as hunting behaviour in recordings has 3 points of evidence. After the fix ships, check whether the objection declines in new survey answers. Condition: every survey-derived hypothesis. Source: 03 (card additions). Cards: [25979af2691c] [b4505f6c4061].

**R44. Rank the backlog by expected profit, not expected lift.** Expected value = P(win) x expected lift x gross profit per conversion x traffic exposed, minus build cost. Add a ceiling estimate (the most it could be worth if it wins). Keep P(win) evidence-based or the formula gives false precision. A 20% lift on a low-margin, low-traffic page can be worth less than a 5% lift on the hero product's checkout. Condition: every ranking. Source: 05. `[needs brand data: SKU margin, page traffic]`. Cards: [aad25dea9ed9].

**R45. Score PDP, cart and checkout hypotheses with PXL-style evidence gating, not ICE, because the merchandiser or founder who pitched the idea will otherwise score their own PDP change 9 out of 9.** Moved to Appendix A: the ICE vs PIE vs PXL vs RICE vs CIE framework comparison. Condition: PXL-style evidence gating plus R44 is the default; ICE only for small teams building the habit. Sources: 02 (ICE), 03 (PXL, partly described), 05 (all), 06 (PIE, ICE, CIE). Conflict: C10. `[web check: PXL criteria]`. Cards: [a56c27356031] [4a2e3d77d68e] [a6c0f42b99a3] [aad25dea9ed9] [300b03fc0354].

**R46. Put above-the-fold PDP and homepage changes (hero, price, CTA) ahead of below-the-fold collection filters, because most shoppers decide to buy before they scroll on a phone.** 80% of 03's agency tests are bigger swings above the fold "because that's really what's going to drive the revenue increase"; this is their bias, not a law. 04's scroll data (a claimed 60% never scroll past the top section; hero reach 93 to 95% on the demo site) explains why. Condition: ranking; does not forbid below-fold tests where research points there. Sources: 03, 05 (PXL), 04. Cards: [4d0785cdcf2b] [aad25dea9ed9] [bc5a8130eee9].

**R47. Order on-page work: clarity and hierarchy, then copy, then offer, then proof, then friction.** 02 ranks these by ICE overall. The offer has the biggest impact ("a bad offer keeps conversion at 0%") but is the hardest, so it comes third; the card caveat is not to let offer problems wait. The same order is also a page structure top to bottom. Condition: when choosing which class of change to work on first for one page. Source: 02 only. Cards: [9e7d2fb74d83] [3965231e76dc] [347f8b289bd6].

**R48. Ship obvious clarity fixes directly; save tests for big swings.** 02: fixing an unclear page has a quick impact and "you're not going to really need to do any split testing". Test later the bigger swings: headline framing (pain or benefit led vs feature led), offer, message-matched page. Condition: the fix is unambiguous and research-backed; if both versions are plausibly viable, R52 applies. Sources: 02; 05 agrees through R50. Cards: [6503bc821ea6] [e02ace8044e5] [55e7424e6d18].

**R49. Re-audit after every shipped change.** Fixing 1 element can expose another. Watch fresh recordings of the new version, re-read the funnel step, re-survey. Condition: after every ship. Sources: 04, 01 (card addition), 03. Cards: [0b8d2f6cc4d1] [bdded17187e0] [b4505f6c4061].

### 3.5 Repair, ship or test

**R50. Repair, do not test, when the current state is objectively defective.** Defective means: page errors, a field that rejects valid input, add to cart failing on one browser, tracking firing twice, a known standard violated, a cart that empties silently (04's example, "had to get fixed straight away"), elements styled as buttons that do nothing, a popup or cookie bar covering the CTA. Do not randomise shoppers onto a broken experience to prove it hurts. Log every repair so it is not re-proposed as a hypothesis. Condition: always. Sources: 05, 04, 03. Cards: [3eca46fe9ba3] [0b8d2f6cc4d1] [9568c40e1d88] [a2d5c573076a].

**R51. Ship without a test when the change is a clarity fix, a proven checkout or landing-page practice at a store under 30 orders a month, or the removal of a blocker confirmed in recordings.** Confirm the ship with fresh recordings and the funnel step rate; treat any before-and-after shift as weak evidence (R55). Condition: the change cannot plausibly hurt, or the store cannot power a test. Sources: 02, 05, 04. Cards: [6503bc821ea6] [0bda3b4d7e04] [0b8d2f6cc4d1].

**R52. Test when both versions are plausibly viable, the better one is unknown, and the test can reach its planned sample in about 2 to 4 weeks.** Most store changes can plausibly hurt conversion, AOV, margin or experience, which is why two-tailed is the default (R64). Condition: everything not covered by R50 or R51. Source: 05. Cards: [3eca46fe9ba3] [00c82f0de25d].

**R53. Use the traffic gates as heuristics, and always compute the real sample size.** Four gates exist in the sources and they are not reconciled (C2, C7):
- Orders per month (05, author synthesis; assumes DTC, 2 to 3% conversion, anonymous traffic). Under 30: research and repairs only; no A/B, A/B/n, bandit or before-and-after with statistical claims (even a 30% lift needs about 120+ conversions per variant). 30 to 300: one bold A/B at a time on the highest-traffic page (home, hero product, cart) aimed at 20%+ relative lift, 2 to 4 weeks, fixed sample computed in advance, micro-conversion primary with purchase guardrail; no tweak tests, no A/B/n, no RPV primary. 300 to 3,000: regular A/B aimed at 10 to 20% on high-traffic pages, conversion rate primary, AOV, margin and return-rate guardrails, 2-week minimum, SRM checks, sequential engines; RPV primary and 2 to 3 arms borderline; no sub-5% lifts. 3,000 to 20,000: A/B/n, bandits for short campaigns, winsorized RPV, CUPED, pre-registered segments, 5 to 10% lifts on hero pages; no sub-2 to 3% lifts without long runtimes. 20,000+: full programme, 2 to 5% MDE, revenue and gross-profit primaries, always-valid monitoring, concurrent tests with FDR control, holdouts for surprising winners, A/A tests.
- Sessions per month (03, agency's 2025 internal update). Under about 300,000: big swings only; no button-colour, single-hero-image or text-snippet tests. Over about 300,000, with "good enough" conversion rate and order count (undefined): comprehensive CRO with 4 to 8 isolated tests a month.
- Visitors per month (05, heuristic). Under about 100,000: bold changes aimed at 10 to 20%+ effects on the highest-traffic pages.
- Online revenue (02, opinion). Micro-tweaks chasing about 0.1% lifts pay only at about $40M+ online.
Condition: use the orders band first because it maps to conversions per variant; use the others as sanity checks. Sources: 05, 03, 02. Cards: [0bda3b4d7e04] [67f74e89d43e] [91c7b6d064ec] [3d52bd4930fe] [365c9ff30a24] [e7dfd865fcfd] [e02ace8044e5] [699a7cd5ac4c].

**R54. Below the testing threshold, "test bigger, not more".** Bold changes aimed at 10 to 20%+ effects, on the highest-traffic pages, one at a time, backed by qualitative research; re-test surprising big winners with a holdout. One bold homepage test teaches more than 10 micro-tests on low-traffic category pages (05, citing SplitBase). 03's big-swings list for stores under 300,000 sessions: landing-page formats (listicle, sales page, advertorial), PDP redesigns from data, offer tests every month (buy 1 get 1, 3 for the price of 2, build-a-bundle, price points), free-shipping and price tests in cart, post-purchase upsells and surveys, ad-creative alignment. 02's list of what is worth testing: headline framing, offer, message-matched page. Condition: stores under the gates in R53. Sources: 05, 03, 02. Cards: [67f74e89d43e] [365c9ff30a24] [2d977920a505] [d12e614c0b4e] [e3ba0fb7d6f6] [e02ace8044e5] [55e7424e6d18].

**R55. Treat any "we changed the PDP and revenue went up" comparison as biased, not just noisy.** Promos, restocks and seasonal demand move orders exactly like a real page change would. They confound the change with time: seasonality, promotions, weekday mix, traffic-source shifts, news. Use only for big structural changes where the effect dwarfs noise, with equal comparable periods and conditions held constant. Treat a clear, stable, explainable shift as weak evidence and confirm later with a randomised test. 06's difference-in-differences needs a comparable control group and belongs to 06-MEA. Condition: any non-randomised read, including checkout repairs on standard Shopify. Sources: 05, 06. Cards: [062507c94ee4] [04a08881ac09].

**R56. Do not add arms to test more ideas at once.** A/B/n needs the full per-variant sample for every arm, so total traffic scales with the number of arms. Multivariate only at high volume. Condition: A/B/n borderline at 300 to 3,000 orders a month with 2 to 3 arms; routine at 3,000+. Below that, "sequential A/B tests" (one after another, 06's meaning) are the safer choice. Sources: 05, 03, 06. Conflict: C12 on the word "sequential". Cards: [3b20905bfc58] [4d0785cdcf2b] [300b03fc0354].

**R57. Use A/B tests for durable decisions and bandits for short tactical ones.** A/B gives a clean causal read before a lasting change (redesign, pricing logic, navigation, checkout). Bandits (Thompson sampling, UCB) shift traffic to the better arm in real time and fit headlines, seasonal promos, banner creative and recommendations where showing the loser is costly and the window is short; they minimise regret, do not estimate effects well, and need sticky bucketing so returning users stay on one arm. Condition: routine bandits from about 3,000 orders a month; lower only for short regret-minimising campaigns. Source: 05 only. Cards: [3b20905bfc58].

**R58. Do not run 2 tests on the same page area at the same time, and never run 2 tests on the same PDP at once.** A homepage test and a cart test can run together because they touch different steps in the funnel; an above-the-fold and a below-the-fold test on the same page can too. Many concurrent tests need FDR control (05, 20,000+ band). Condition: every test calendar. Sources: 03, 05. Cards: [7d481c590b57] [4d0785cdcf2b] [1f26cd618e2d].

### 3.6 Sample size and duration

**R59. Size every test from the minimum detectable effect, never from a magic conversion count.** Evan Miller's rule: n = 16 x sigma^2 / delta^2 per variant, where delta is the absolute effect and, for a conversion rate, sigma^2 = p(1-p). The 16 bakes in alpha 0.05 two-sided and 80% power. Halving the MDE quadruples the sample. Set the MDE to the smallest lift worth shipping, thought through in gross profit, not the smallest lift possible. Check whether the calculator wants relative or absolute (2% to 2.4% is +0.4 points absolute, +20% relative). Condition: every test. Source: 05. `[needs brand data: baseline conversion rate per page and device]`. Cards: [00c82f0de25d].

**R60. State every sample size as orders per variant, not sessions or clicks, because orders are what a store's finance team and P&L track.** At 80% power and 95% confidence the conversions needed per variant depend mainly on the relative MDE: about 3,830 for 5%, about 1,000 for 10%, about 260 for 20%, about 120 for 30%. 02 agrees on the anchor: about 1,000 conversions per variant for a 10 to 20% lift, which at 2.5% conversion is about 40,000 sessions per variant and 80,000 for a simple A/B. 03 says its agency runs 50,000 to 100,000 sessions "through a test", without saying per variant or total. Condition: always state per variant, then multiply by arms. Sources: 05, 02, 03. Conflict: C3. Cards: [00c82f0de25d] [699a7cd5ac4c] [4d0785cdcf2b].

**R61. Reject magic numbers.** "400 conversions a month" powers only a 30 to 40% lift in a month. "200 conversions per variant for a 20% lift" is roughly right but 250 to 260 is safer at 80% power. The HubSpot "20,000 per group" rule is email-oriented and equals about 400 control conversions at 2%. Condition: any brief or vendor claim that quotes a flat number. Source: 05. Cards: [00c82f0de25d].

**R62. Multiply by arms, divide by weekly eligible traffic on the tested page, round up to whole weeks.** Use traffic on the page or path, not sitewide sessions. If the runtime is unreasonable: raise the MDE (bolder change), move to a higher-traffic page, switch to a faster primary metric with purchase as guardrail (R8), or drop to research only. Condition: every test. Source: 05. `[needs brand data: weekly sessions on the tested page]`. Cards: [00c82f0de25d] [5fae1beab1ba] [67f74e89d43e].

**R63. Run at least 1 full week, in practice 2, and also reach the planned sample.** Weekends convert differently and buyers differ by day; 2 weeks captures one cycle of returning visitors (Kohavi, via 05). Cover each weekday twice (2 Mondays, 2 Tuesdays, and so on) so a one-day shock such as a competitor's Monday sale cannot trigger a wrong kill (03). Typical runtime 2 to 4 weeks; 03's comprehensive programme uses at least 2 weeks. Hitting significance early is not a reason to stop. Two weeks is a minimum, not a replacement for sample math. Condition: every test. Sources: 05, 03, 06. Self-contradiction: 02 suggests a 7 to 10 day delivery-time display test, which is short against 02's own sample math (C19). Cards: [5fae1beab1ba] [7d481c590b57] [300b03fc0354] [27026398ed8a].

**R64. Two-tailed is the default.** One-tailed reaches significance faster but only tests one direction. Use it only when a negative result would trigger the same action as a null (keep control either way), document that before launch, and recompute the sample because standard tables assume two-sided. It is never a shortcut to hide downside. Condition: every brief. Source: 05. Cards: [517a8bce6324].

**R65. Remove contamination from the test population.** Klaviyo or other retention sends spike conversion, and an on-page split tool forks email traffic into the test too. Options from 02: send tests custom landing pages that receive only cold Meta traffic; or fork traffic at the Meta ad-set or campaign level `[verify UI]` (set-up in 11-ADC). Account for multi-click journeys: on 02's big client brands about 1.5 Meta clicks per conversion on average, so about 50% of buyers click more than once and may see both variants without sticky bucketing. Condition: any test on a page that receives both paid and owned traffic. Source: 02 only; 05 supports through its SRM and contamination checks. Cards: [699a7cd5ac4c] [370ed8c02e34].

**R66. Randomise properly, keep allocation balanced, and use sticky bucketing.** The randomisation unit is the user; returning users must see the same arm. Condition: every test and every bandit. Sources: 03, 06, 05. Cards: [4d0785cdcf2b] [300b03fc0354] [3b20905bfc58].

### 3.7 Validity checks and stopping rules

**R67. A p-value is valid only under its planned stopping rule. Do not peek.** Fixed horizon means: fix the sample in advance, look once at the end. Moved to Appendix A: the peeking-simulation study history (Evan Miller, Kohavi, Etsy). The alternative is a validated sequential engine (mSPRT always-valid p-values, GAVI confidence sequences, group sequential with alpha spending, corrected alpha) whose stopping rule you follow and nothing else. 02: "peeking daily and stopping at significance inflates false positives"; do not call a test after 2 weeks and 100 conversions. Condition: every test. Sources: 05, 06, 02, 03. Cards: [e3ee87a025c5] [300b03fc0354] [699a7cd5ac4c] [c54652571336].

**R68. Bayesian tools are not immune to peeking.** Moved to Appendix A: the Molas (2025) peeking-simulation numbers. Most commercial "Bayesian" tools use flat priors, which makes them close to frequentist but less transparent. If you cannot state the prior and whether the stopping threshold is protected against optional stopping, you cannot fully interpret or reproduce the result; treat it like a peeked frequentist test. Condition: any Bayesian engine (VWO SmartStats, AB Tasty, Eppo). Source: 05. `[web check: vendor stats engine docs]`. Cards: [e3ee87a025c5].

**R69. Choose the engine before writing the brief.** If you can estimate the expected sample well: fixed horizon or group sequential design (more powerful; Spotify's view). If you cannot, or stakeholders will watch daily: an always-valid method (mSPRT, GAVI, corrected alpha), accepting wider intervals. Confirm the tool's current engine in vendor docs. Condition: every brief. Source: 05. `[web check: vendor stats engine docs]`. Cards: [e3ee87a025c5].

**R70. Require statistical power, not just significance.** 03: significance without power is like 3 coin flips giving 2 heads; power means enough data that the result will repeat. A checkout or cart tool that reports "significant" is not enough: size the test yourself from the page's weekly order volume first. Condition: every test. Sources: 03, 05. Cards: [c54652571336] [4d0785cdcf2b] [00c82f0de25d].

**R71. Check sample ratio mismatch early and often.** Chi-square goodness-of-fit on users (the randomisation unit), not page views. Flag at p < 0.001 (Kameleoon's threshold). A designed 50/50 that returns 50.3/49.7 on a large sample can already be a mismatch. About 6% of Microsoft experiments show SRM. If present, stop trusting the result until the cause is found (bots, redirects, tracking, browser-specific failures). Condition: every test, at launch and at each planned look. Source: 05 only. Cards: [370ed8c02e34].

**R72. QA every test 2 or 3 times on real devices before launch, and confirm tracking fires in both arms.** A bug makes a winner look like a loser. Compare event counts per arm with orders in the store backend during the test. If tracking breaks mid-test, invalidate the read. Condition: every launch. Sources: 03, 05. Cards: [4d0785cdcf2b] [370ed8c02e34] [3eca46fe9ba3].

**R73. Check for flicker on a slow mobile connection.** In client-side tests the original can render before the variant. Flicker hurts UX and can inflate the effect by drawing the eye. Anti-flicker snippets hide the page for up to 3 to 4 seconds by default (DebugBear). AB Tasty says there is "no miracle fix". Prefer server-side or Shopify Rollouts for speed-sensitive paths. Condition: every client-side test. Source: 05 only. Cards: [370ed8c02e34] [7c932a3b4986].

**R74. Filter bots and check the marketing calendar for overlaps.** Promotions, holidays and traffic-mix shifts inside the window confound the read. Note the confound in the record and consider a re-run. Condition: every test window. Sources: 05, 03. Cards: [370ed8c02e34] [062507c94ee4] [7d481c590b57].

**R75. Pre-register mobile vs desktop and cold-paid vs returning before reading any PDP or checkout result, and count your metrics.** Pre-register device, paid vs organic, new vs returning. A mobile checkout fix can lose on desktop and still look like a blended win. Slicing after the fact until a winner appears is p-hacking; post-hoc slices only seed new tests. Multiple metrics inflate error: 1 metric 5%, 2 about 10%, 3 about 14% at alpha 0.05 each; apply Bonferroni or FDR (05 does not say which to prefer). 06 adds: segment only when the sample supports it and decide on the pre-declared overall metric. Condition: every brief and readout. Sources: 05, 06. Cards: [1f26cd618e2d] [c076b110d253].

**R76. Never kill or call a test on one bad or good day.** Early cumulative deltas are noisy. Condition: every test. Sources: 03, 05. Cards: [7d481c590b57] [5fae1beab1ba].

**R77. Apply Twyman's law: a surprising number is usually wrong.** A 50%+ lift, or hundreds of percent, is more likely an instrumentation bug, SRM, contamination, bot skew, tracking failure or promo overlap than a discovery. Realistic lifts: 1 to 5% on mature pages, 10 to 20%+ on early or unoptimised pages. A small-sample early-stopped winner (200 conversions instead of 2,000) inflates the lift (winner's curse). A case study without baseline, sample, runtime and validity checks is hypothesis material only; that applies to every case number in this playbook, including 07's 18% lift, 01's 60% ADT uplift, 03's monthly revenue figures and 06's case table. Condition: every readout and every case study. Sources: 05, 06, 07, 01, 03. Cards: [370ed8c02e34] [8dc46d4893e1] [300b03fc0354] [de4dfe536e94] [8121c53ef9d8].

**R78. Check novelty and primacy with daily plots, but be sceptical.** Novelty: a temporary bump because the change is new. Primacy: returning users dip then recover. Plot the daily effect and compare first-exposure with repeat-exposure conversion. Kohavi found most suspected effects are artifacts of noisy early cumulative deltas. Judge on the stable period. No threshold proves a real novelty effect. Condition: any test with returning traffic or a visible design change. Source: 05. Cards: [5fae1beab1ba].

**R79. Validate the platform with an A/A test when you start a programme or change tools.** A significant A/A difference means fix the platform before trusting tests. Condition: 05 lists it for the 20,000+ band; it is sensible at any volume when a tool is new. Source: 05. Cards: [0bda3b4d7e04].

### 3.8 Reading and closing a test

**R80. Report the effect with its confidence interval and decide against the MDE and business value, not against p < 0.05 alone.** "Significant" does not mean 95% likely real: if only 10% of ideas truly work and power is 80%, roughly 1 in 5 significant wins is a false positive. Compare the interval with the MDE, incremental gross profit, build cost and guardrails. Condition: every readout. Source: 05. Cards: [70db51ffb976].

**R81. A fully powered inconclusive test is a result.** It is evidence the effect is smaller than the MDE. Do not extend it to chase significance (that is peeking). Ship neither, or the cheaper and simpler version. A test that is clearly negative after 2 weeks: stop, do not wait for a reversal, fail fast. Condition: every inconclusive or negative readout. Source: 05. Cards: [70db51ffb976].

**R82. Replicate or hold out a surprising large win before banking the revenue.** Condition: any win above the realistic band in R77, or any win the team did not expect. Sources: 05, 06. Cards: [70db51ffb976] [370ed8c02e34] [f671352f5b6e].

**R83. Read the mobile PDP or checkout number before shipping.** If mobile and desktop move in opposite directions, do not ship blind; investigate. On a mobile-first India or Southeast Asia store, a desktop-only lift is not worth shipping. Condition: every readout. Source: 05. Cards: [1f26cd618e2d].

**R84. Run an LTV check before scaling a winning angle or page.** Dark patterns and over-claiming lift front-end conversion and lower CAC, then raise returns and chargebacks and cut repeat rate and lifetime gross profit (02's example: a supplement angle on eyesight that scales on Meta while customers feel no difference). Check returns, chargebacks, repeat rate and 365-day LTV by angle. Condition: any win driven by a claim, an angle or urgency. Sources: 02, 05 (guardrails). `[needs brand data: returns and LTV by acquisition angle]`. Cards: [dad9c85ea261] [1f26cd618e2d].

**R85. Ship winners and protect them.** Keep a live-winner register and check it after theme changes, app changes or team changes. 03's client saw new leadership overwrite winning tests; "a win will usually stick into perpetuity", so retained wins compound. Condition: every shipped winner, reviewed at least quarterly. Source: 03. `[needs brand data: past test log and which winners are still live]`. Cards: [f09cfbc3ef44] [bbab5b1b0329].

**R86. Do not promise a founder more than 1 in 5 to 1 in 10 PDP, cart or checkout tests will beat control.** Set the expectation against ecommerce agency figures (DRIP, ConversionTeam), not tech-platform case studies. 05's best-sourced anchor: about 10 to 20% of well-run tests produce a significant winner. Moved to Appendix A: the tech-platform win-rate roll call (Microsoft, Bing, Google Ads, Booking, Netflix, Airbnb, Optimizely, VWO, CXL) behind that anchor. 03 says 30 to 35% is "very, very well" while its own showcase record is 13 winners out of 135 tests (about 9.6%). 06's "60%+ win rate" is a "decisive" rate (wins over wins plus losses), not a significant-per-test rate. Learn why tests lose and feed that into the next hypothesis. Condition: never set a win-rate target above 05's anchor without stating the definition and sample. Sources: 05, 03, 06. Conflict: C4. Cards: [8dc46d4893e1] [bbab5b1b0329] [300b03fc0354].

**R87. Keep one experiment log for tests, repairs and holdouts.** Institutional memory stops re-running losers and flags surprising winners for replication. At Booking.com's scale "the bottleneck is not running tests but not fooling yourself with them". 06 calls the same thing a causal knowledge base: question, method, result with interval, decision. The record format is in P18 and section 9. Condition: every test, repair, holdout and causal analysis. Sources: 05, 06, 03. Cards: [70db51ffb976] [2b951af15841] [f09cfbc3ef44] [3eca46fe9ba3].

**R88. Winners do not add up.** Shipping 20 winners does not make conversion "20x better": interaction effects (a CTA that won alone may not work with a new layout that also won), cumulative drift (buyer mix, competition and seasons change), and attribution confusion (after 20 changes you cannot say which ones moved the 8%). Report programme value from a holdout (R91), never as the sum of test lifts. Condition: every programme report. Source: 06. Cards: [f671352f5b6e].

**R89. Verify after shipping.** Watch fresh recordings of the new version, re-read the funnel step, and re-survey for the objection the change addressed. Condition: every ship. Sources: 04, 03. Cards: [0b8d2f6cc4d1] [b4505f6c4061].

### 3.9 Holdouts and incrementality

**R90. Match the measurement design to the question.** "Did this specific test win?": A/B test. "Does this feature (popup, recommendations, personalisation) add net revenue?": feature holdout. "Has our whole CRO programme created value?": CRO programme holdout. "Does retargeting or Meta drive incremental revenue?": user-level or geo holdout (11-ADC). "What was the impact during peak season with no clean control?": BSTS or difference-in-differences (06-MEA, specialist). "We cannot randomise": synthetic control, propensity matching, regression discontinuity (06-MEA, specialist). Document question, method, result with confidence interval, business decision. Condition: before any measurement is designed. Source: 06 only. Cards: [0eca60fd9161] [2b951af15841] [04a08881ac09].

**R91. Prove programme value with a persistent programme holdout.** Randomly assign a small share of all traffic (06's example: 5%) to see the site as it was before the programme; everyone else gets every shipped winner; keep assignment stable for the period (example: 90 days); compare conversion rate and RPV at the end; report net lift with a confidence interval. Card caveats: 5% and 90 days are illustrative, compute whether traffic can detect a meaningful effect first; withholding major usability, accessibility or policy fixes from a permanent holdout raises operational and ethical concerns, so apply repairs (R50) to everyone. Condition: any programme that claims cumulative value; 06 gates user-level holdouts at over 100,000 monthly visitors (C7). Source: 06 only. `[needs brand data: monthly visitors, logged-in share]`. Cards: [f671352f5b6e].

**R92. Measure features by net revenue with a feature holdout, not by their own engagement metric.** Randomly hold out a group that never sees the feature (examples: popup 90% exposed / 10% holdout; recommendations 5% holdout). Tag and track both groups to purchase and, where relevant, repeat purchase. Decision metric RPV; support metrics conversion rate, AOV, opt-in rate. Look for trade-offs: more opt-ins but fewer purchases; more clicks but no bigger baskets. Segment only when the sample supports it; decide on the pre-declared overall metric. Keep the holdout long enough to capture delayed purchases. Condition: every popup, recommendation module, personalisation layer and cart-recovery flow. Source: 06 only. Cards: [c076b110d253].

**R93. Traffic gate for holdout designs: over about 100,000 monthly visitors for user-level holdouts, geo holdouts and switchbacks.** Below that, use longer holdouts or a causal method with a stated assumption. This 100,000 is 06's gate for holdout designs; 05 uses the same number for "bold changes only" A/B testing. They are different rules (C7). Condition: rough guidance; compute detectability. Source: 06. Cards: [0eca60fd9161].

**R94. Any causal method must state its identifying assumption and challenge it before the output is trusted.** Moved to Appendix A: what each causal method (difference-in-differences, regression discontinuity, propensity matching, synthetic control) assumes. These need specialist implementation and live in 06-MEA and 11-ADC. Condition: whenever randomisation is impossible. Source: 06. Cards: [04a08881ac09] [e353aade03ae].

**R95. Judge cart-recovery flows against a holdout, and do not make discounts the only answer.** Frequent discounts can train shoppers to abandon on purpose. 06's timing framework (first contact within 1 hour, escalation over 72 hours) is a framework to test, not a rule. Flow build belongs to 14-EML. Condition: any abandonment flow. Sources: 06, 02. Cards: [e46b405d55df] [3163cc34fa79].

### 3.10 Page-level rules that seed hypotheses

These rules tell the agent what to look for on each page type. Design and copy execution live in 07-LPG. Every case number here is an example with no sample size or duration.

**Home**

**R96. The homepage orients; it rarely converts.** Its job is to route visitors to the right products fast and build credibility. Hero passes a 3-second test; 1 clear conversion offer (newsletter with a concrete incentive); simple navigation with clear category entry points; curated selection. 06's reported experiments: a broad head-to-toe assortment cut add to cart 6.07% and CTR 10.4%; bestsellers for visitors with no history lifted CTR to product pages 23.01% versus static featured products; personalised recommendations lifted CTR 136% versus static. 07's pattern: a high-click, low-reach module moved up. Condition: homepage hypotheses; check first what share of sessions even start on the homepage. Sources: 06, 07, 03. Cards: [5e578ca91bcc] [de4dfe536e94] [1823c8a7c180].

**R97. Design the menu as a guide, not a directory.** New visitors open the mega menu to see what is on offer (03's recordings). Put a bestsellers carousel at the top, icons and some social proof, and move non-money links (contact, reviews, FAQs) to the bottom. Use customer words, not jargon; do not sort alphabetically; past about 6 options people forget the first (01's phone-menu analogy); a click should open a useful page, not an intermediate "home" page; keep the menu icon familiar (01's law-firm site with a quirky hamburger had a "massive" bounce rate). Condition: navigation hypotheses. Sources: 03, 01 (lead-gen adaptation for the analogy). Cards: [033531683bba] [1823c8a7c180] [f5942adec72b] [d4484bf96e29].

**Collection**

**R98. Define the collection page's job before designing it: browsing, deciding or buying.** 06: on browsing pages, Add to Cart buttons create decision conflict because the visitor is still asking "what options exist"; visitors want clear subcategories, visual hierarchy, filters that narrow without overwhelming, and click-through to PDPs. 03: for consumable repeat-buy products, putting the price on the collection card button and allowing add to cart from the grid was a winning test for Boom ($30,000 a month with labels combined); "doesn't work with every single product or niche". Condition: add-to-cart-from-grid is a hypothesis for repeat-buy consumables with returning traffic, not for first-time browsing. Sources: 06, 03. Conflict: C14. Cards: [1e03a58f6fe1] [6f635b9d003d].

**R99. On mobile, show products above the fold and keep controls in the thumb zone.** 03: a 2 x 2 grid, 4 products visible; if a hero banner or text block hides them, "start again". 06: hero banners no more than 30 to 40% of the first view; the first 2 rows get most taps; tap targets at least 44px; a sticky bottom filter bar or floating "Filter" pill (06 claims 75% of mobile users abandon if they cannot refine quickly; unsourced). 04: shoppers scrolling back to the top to reach a filter is a sticky-filter hypothesis, confirmed across several sessions first. Labels (bestseller, new, low in stock, trending) on a few products only, never all; must reflect real data. Condition: mobile collection hypotheses. Sources: 03, 06, 04. Cards: [6f635b9d003d] [1e03a58f6fe1] [11e64288067b].

**R100. Keep promo messaging consistent from collection to PDP, and from ad to page.** When the collection promo is reinforced on the PDP, add to cart is more likely (06). Condition: any promo. Sources: 06, 02. Cards: [1e03a58f6fe1] [a5cf6ee34972].

**R143. Test legitimate scarcity and back-in-stock signals, kept separate from the warning against fake scarcity.** A "low in stock" label is one of the real, data-backed labels in R99 (03's collection-card labels: bestseller, new, low in stock, trending), never invented. Extend the same real-data rule to a back-in-stock notice or waitlist on the PDP or collection card: only show it when the stock number is true, and test whether it lifts add to cart without hurting trust. Condition: collection or PDP hypotheses where stock data is accurate and available. Source: 03 (partial; one label example, no dedicated procedure). `[general practice]` `[needs brand data: live stock levels]`. Cards: [6f635b9d003d].

**PDP**

**R101. A PDP must answer 4 questions above the fold on a phone: what is it, why this one (unique mechanism), why now, why trust you.** Order elements by persuasive weight: value proposition, proof, price, CTA. Leave SKU details, size and quantity pickers out of the hero (handle in cart, or default to the larger size or a bundle). Add a scroll cue so the page does not look finished. 02's recap says "core five questions" while its body lists 4 (C19). Condition: every PDP audit, checked on a phone. Source: 02 only. Cards: [bb761687ad68] [36f1d8130259] [e76096210c1d] [e10616e94452].

**R102. Put purchase drivers next to the buy box.** 03's Boom PDP test (nearly $40,000 a month, +$0.50 per paid PDP visitor, 5 changes combined): reviews and stars moved higher, visible savings, sticky add to cart, gallery thumbnails instead of dots, gallery used as a mini landing page (benefits, testimonials, UGC, video, guarantee), money-back guarantee un-collapsed next to the CTA for an older audience. 03 claims more people swipe the whole carousel than scroll the whole page (no data). 06: Add to Cart above the fold, trust signals and social proof near the decision. 01: make the conversion goal the most visible element (Amazon's bordered buy box). Condition: PDP hypotheses; do not credit any single change with the combined case result. Sources: 03, 06, 01. Cards: [116d1016fa3b] [fc7c739888fc] [e18bae3af3dd] [a360a5796cb7].

**R103. Price, shipping cost, returns and a realistic delivery estimate must be easy to find, with consistent currency and origin cues.** 01's Shark Proof teardown: a "$75 free shipping" note on a pounds price made a UK buyer worry about US shipping time; delivery times shown inconsistently; review dates clustered. Condition: every PDP audit. Sources: 06, 01, 02. Cards: [fc7c739888fc] [e24c4415d85e] [27026398ed8a].

**R104. Proof: get reviews first, sort media first, match proof to the claim, and show a believable distribution.** 02: going from 0 to about 100 reviews roughly doubled conversion on his own 2019 to 2020 stores, mostly in the jump from 0 to 80, beyond that "immeasurable"; image and video reviews are worth far more than text, auto-sort them first; 5 hyper-relevant reviews beat 400 generic ones; a 4.8 reads as more genuine than 5.0 (opinion). 06: a mix of 4 and 5 stars feels more real than a wall of 5 stars. 01: review volume often beats average rating (seminar exercise); build volume by sending review links; if you have 2 reviews, use the 2; specifics ("at age 50", "dropped 30 lbs") build belief and must be true and permissioned. Incentivise photo reviews only where legal (02: $10 gift card or cash back for submitting a review with an image; you can reward submitting, not a rating). Condition: proof hypotheses; volume matters up to about 100 reviews (02), relevance after that. Sources: 02, 06, 01. Conflict: C18. `[needs brand data: review count, media-review share]` `[web check: incentivised-review rules in the brand's markets]`. Cards: [a507cc86ec03] [0a1f9ee893a3] [1d5e67c73cdd] [e18bae3af3dd] [affc22a52d1b] [3ef8c77c4464] [f95f16ca7611] [1cdf5f4a3630].

**R105. Trust badges: remove generic security seals unless a test says otherwise; test specific policy and proof statements beside the CTA.** 02: footer security seals "do absolutely nothing to close anyone"; guarantees and returns are table stakes but useful as risk reversal after the proof. 03: winning designs include a "trust policy bar" (easy returns, support, satisfaction guarantee, money-back guarantee) in cart and trust seals by the CTA (money-back guarantee, "over 10,000 happy customers", vegan-friendly, made in the US, "featured in" logos, only if true). 06: one DTC brand moved trust icons inline next to Add to Cart and reported +18% revenue per session after 3 weeks; 06 also lists payment trust signals at a 40.5% test win rate (unsourced). 01: secure-checkout logos, awards and Trustpilot badges as credibility. Condition: the disagreement is about generic security seals versus specific policy and proof statements; see C1 for what to do. Sources: 02, 03, 06, 01. Conflict: C1. Cards: [cdd5df001439] [1d5e67c73cdd] [84ebf548938d] [4653645c47ac] [e18bae3af3dd].

**R106. A long text block between the shopper and add to cart is a hypothesis to cut or restructure it.** 04's example: 93% reach above the paragraph, about a 30% drop right after it, 25% reaching add to cart. 03: turn description blocks into benefit-driven bullets, bold key words, outcomes not features. Long copy is not always bad; detailed products may need it; the problem is presentation that blocks scanning. Condition: scroll map shows a steep drop after one block, not normal end-of-page decay. Sources: 04, 03, 02. Cards: [edd07a1a15f6] [116d1016fa3b] [790f6b3372c2].

**R107. Answer the top "almost did not buy" objection in the hero or beside the CTA, and build the FAQ from real objections.** 03: a sandal brand's answers were about leather quality, so the hero was rewritten around craftsmanship, sourcing and handcrafting ($77,000 a month reported); a supplement's "did not know how long results take" becomes a "results in the first 6 weeks" section below the fold (illustration). 02: FAQs answer the top reasons people do not buy, not shipping policy or brand story. 01: handle objections to the first step, not only to the product (will a salesperson call, do you serve my area); state exactly what happens after the click. Condition: every PDP and landing page. Sources: 03, 02, 01 (lead-gen adaptation). Cards: [d8e9c11154e5] [109929fb0656] [91410aaad2c8] [499b4e67252a] [182f13121915] [f62861431f31] [16c2667cb67c].

**R108. Keep message match from ad to page, and send cold unaware traffic to a landing page, not a plain PDP.** If the ad changes persona or offer, use a separate page; if it changes angle (unique mechanism), keep the page on that 1 angle rather than listing every benefit (02's collagen example: arthritis as benefit 9 of many converted worse). Match hero, mechanism, objections, testimonials and CTA to the ad's promise and wording. 03: sending paid traffic straight to PDPs, homepages or collection pages "is leaving money on the table"; a pre-sell listicle for Boom reported $20,000 a month and allowed cold-traffic scaling. Prioritise concepts with meaningful spend, since each page adds build and QA. Condition: every paid concept. Sources: 02, 03. `[needs brand data: active ad concepts by persona, offer, angle]`. Cards: [a5cf6ee34972] [19d7eed88979] [322887ac21c3] [aa0e72b56778] [2d977920a505] [6695665021f2].

**R109. Headline framing (pain-led or benefit-led versus feature-led) is one of the few above-the-fold changes worth a split test.** Big swing, seen by everyone. Condition: stores with enough traffic per R53. Source: 02. Cards: [55e7424e6d18].

**R110. Number of CTAs: many repeated CTAs are fine only if they all do the same thing; competing offers add friction.** 01 praises 7 or more identical "get in touch" access points on 1 page including a sticky bar. 03 wants "one clear call to action" on a sales-page hero and to explain what happens on click ("shop bestsellers" if unsure). Condition: repeat 1 action; never stack different offers. Sources: 01 (lead-gen adaptation), 03. Conflict: C6. Cards: [a360a5796cb7] [4653645c47ac].

**R111. Popups in the first 5 seconds, chat widgets over add to cart, and cookie bars over the cart button are repairs, not tests.** They show up as rage clicks (04) and in self-purchase audits (03). Condition: always. Sources: 04, 03. Cards: [9d9871ee324b] [a2d5c573076a].

**R140. Put a size guide or fit tool next to the size picker on an apparel or footwear PDP, and test it against the store's own size-driven return rate.** A shopper who cannot judge fit either abandons or buys wrong and returns it; a size chart, a fit quiz or measurements-to-size table removes that guess before checkout. Condition: apparel, footwear and other size-dependent categories. No source in this folder. `[general practice]` `[needs brand data: size-related return rate]`. Verify against brand data before use.

**Cart**

**R112. Remove the discount-code box from cart when no promotion is live; keep it working when one is.** Shoppers leave to search "[brand] discount code", hit coupon sites and popups, and do not come back; worse for older shoppers. Part of a $40,000-a-month combined cart result (03). Condition: any store with a visible coupon field and no live promo. Source: 03 only. Cards: [19e8c5c27387] [84ebf548938d].

**R113. Add purchase reassurance in the cart: returns, support, satisfaction or money-back guarantee.** 03's trust policy bar replaced the coupon field. See C1 for the badge debate. Condition: cart hypotheses. Source: 03. Cards: [84ebf548938d].

**R114. Use the cart drawer to raise contribution, judged on RPV, not AOV alone.** Free-shipping progress message ("spend $12 more for free shipping"), gift-with-purchase thresholds that unlock as spend rises, 1-click upgrade from the single item to a routine bundle, in-cart upsells (03's clothing client: nearly $60,000 a month with AOV stuck at $60 to $80 before). Set the free-shipping threshold above typical carts (02's examples $66 and $75; "most brands set the threshold too low"); price bundle discounts from fulfilment savings (02: $136 value, $122 price, $14 equal to the shipping and fulfilment of 3 separate orders). Condition: offer hypotheses; check margin first. Sources: 02, 03. `[needs brand data: fulfilment cost per order, typical cart value]`. Cards: [6baa7dce36c7] [23f840cd83b0] [c6984ab0f0cc] [e3ba0fb7d6f6] [d5a74f7edadd] [1e7c5456a957].

**R115. A multi-buy offer below add to cart ("buy 3, save 20%") fits low-price items people own several of, not luxury.** 03's sunglasses client ($30 to $40 products) reported over $180,000 a month. Condition: consumables and multiples. Source: 03. Cards: [e3ba0fb7d6f6].

**R141. Show a buy-now-pay-later badge (Afterpay-style instalments) on the PDP and in the cart as a "why now" lever for mid to high-AOV items.** Splitting the price into instalments can lift add to cart and AOV by making a considered purchase feel affordable today. Condition: mid to high-AOV items, not low-price impulse buys or luxury where instalments can cheapen the brand. Source: 02-cro-masterclass-2026.md, section 6, names "Afterpay-style instalments: 'why now' lever" with no card id and no rule built on it. `[general practice]`. No library card; verify against brand data before use.

**Checkout**

**R116. Keep total checkout extras under about 10% of AOV and show them before checkout begins.** 02: sum shipping, tax and fees; on a $100 order stay under $10; "internally" found lower has no material gain; shipping collected up to about 10% of AOV had no material conversion effect in his own 2019 to 2020 tests (02 also states this as "10% of total revenue", C19). Baymard as cited: 39% of abandoners leave because of late extra costs (02, 06); 21% slow delivery; 19% card trust; 19% forced account (06 gives 16 to 24%); 18% checkout too long; 15% returns; 14% total not shown up front. Show the total early; no drip pricing (02's IM8 example: monthly price on page, quarterly-only in cart); if tax is included but shown as a line, label it. Condition: every checkout audit. Sources: 02, 06, 05. `[needs brand data: checkout extra costs as % of AOV]` `[web check: current Baymard figures]`. Cards: [27026398ed8a] [8b2d9df04dfb] [3163cc34fa79] [d4104b13110f].

**R117. Guest checkout is the default and prominent; collect email during it and build the account after purchase.** Baymard as cited by 06: 62% of sites do not make guest checkout prominent enough. 02 "believes" forced accounts may be a Shopify default; check. Condition: every store. Sources: 02, 06. `[verify UI]`. Cards: [94a63f9f740b] [d4104b13110f].

**R118. Put express payment first and offer the market's methods.** Shop Pay, Apple Pay, Google Pay at the top; UPI in India; recognisable payment brands; no redirects or context switches. Condition: every checkout. Sources: 02, 06. `[verify UI]`. Cards: [a5c46083a30f] [d4104b13110f].

**R119. Cut fields to the strictly necessary, enable autofill, add progress indicators on multi-step flows.** 02: make fields optional, shorten the address block. Baymard average is 11.3 checkout fields (05). Form-field evidence from lead-gen sources, adaptation only: 04's B2B forms lose most people by the 3rd or 4th field and 4 or fewer is "the sweet point", phone number causes "a substantial drop off"; 01's HubSpot study showed conversion falling from 3 to 10 fields and also lower at 1 to 2 fields, with free-text boxes worst; ask only for what you will use. Condition: checkout and any capture form. Sources: 02, 06, 05, 04, 01 (adaptation). Conflict: C17 (01 allows deliberate friction for costly free services). Cards: [c6984ab0f0cc] [d4104b13110f] [4ae56138baa5] [8accb09355e6].

**R120. State the returns policy at the decision point, but do not rush to free returns, above all in fashion.** Test and accept some loss only if more profitable. Condition: returns hypotheses. Sources: 02, 06. Cards: [1e401776f34b] [d4104b13110f].

**R121. One-page versus multi-step checkout is a test, not a rule.** 02's agency data says one-page converts "a little" better (data not shared). 06's marketplace switchback (12 days, rotating hourly) found the 3-page checkout raised AOV 2.1% at 98% significance and improved RPV, "flipping" the fewer-steps advice; the card calls it context-specific. Condition: Shopify Plus or server-side only (R123). Sources: 02, 06. Conflict: C15. Cards: [c6984ab0f0cc] [04a08881ac09].

**R122. Slow delivery: get faster options before you consider hiding dates.** 02 suggests a 7 to 10 day split test of hiding delivery times, noting hiding adds ambiguity and lowers conversion. That runtime is short against 02's own sample math, and hiding may conflict with consumer disclosure rules. Condition: only with legal review and a properly sized test. Source: 02. Conflict: C16. `[web check: delivery disclosure rules]`. Cards: [27026398ed8a].

**R123. Shopify checkout cannot be A/B tested client-side on standard plans.** Since checkout extensibility replaced checkout.liquid (general rollout August 2024), JavaScript injection into checkout is gone, and there is no built-in way to show a checkout customisation to one group and hide it from another. Shopify Plus has checkout extensibility (Checkout Blocks, UI extensions, Functions, Branding API) and some apps run limited checkout-element tests. About 80% of high-impact ecommerce tests happen before checkout anyway. Condition: any checkout hypothesis; ship as repairs on standard plans. Source: 05. `[verify UI]` `[web check: current Shopify checkout A/B options, yearly]`. Cards: [7c932a3b4986].

**R144. Localise checkout beyond payment method: currency display, cash on delivery, GST-inclusive pricing shown as one number, and the shopper's own language.** Sits next to R118 (express payment and local payment methods). A price that switches currency mid-checkout, a missing cash-on-delivery option where it is the norm, or a tax line that reads as a surprise fee each cost a sale that a working checkout would have kept. Condition: any store selling into more than one country or language, or into a market where cash on delivery or GST-inclusive pricing is standard. No source beyond the UPI line in R118. `[general practice]` `[web check: local payment norms and tax display rules by market]`. Verify against brand data before use.

**Mobile**

**R124. Mobile first: put about 90% of CRO effort on mobile and check every page on a phone.** 02: 60% to 95% of traffic is mobile depending on brand (80% in the hero section). 06: mobile is about 60% of traffic and sales, converts at about half the desktop rate, and mobile cart abandonment is about 85%. Priorities: one-page or wallet checkout; guest checkout; tap targets at least 44px; floating key CTAs and critical actions in the thumb zone; clickable phone and email fields; social proof visible where decisions happen; no desktop grids squeezed onto mobile; no filters hidden in hamburger menus. Condition: every audit and every test's pre-registered device split. Sources: 02, 06. `[needs brand data: device split]`. Cards: [a56c27356031] [bb761687ad68] [1e03a58f6fe1] [d4104b13110f].

**R125. Speed is a lever; measure it with real-user data and isolate its revenue effect with a test or holdout.** 06's target: mobile LCP under 2 seconds; hero images under 100KB, grid images under 60KB. 06's elasticities contradict each other (100ms slower = 3.5% lower conversion; 100ms = 7% drop "in one large analysis"; 1 second = "up to 7%"), so use them to justify investigation, not to forecast. 02 calls load time "one of the easiest leverage points" (mockup 4.8 s vs 0.9 s) with no how. The work lives in 08-SPD. Condition: any speed hypothesis. Sources: 06, 02. Cards: [9461d45dfbe7] [36f1d8130259].

**Email capture and quizzes (01, lead-gen adaptations)**

**R126. Give every capture CTA a lure that matches the shopper's stage.** "Subscribe to our newsletter" offers nothing. A buyer guide for shoppers who do not know what to buy; a first-order discount or free postage for shoppers who know but delay. Check discount and shipping cost against margin first; measure signup-to-first-purchase, not signup volume. Condition: email capture hypotheses. Source: 01 (lead-gen adaptation). Cards: [ea8b1b83867d] [d043167a017f] [6026a7303e2a].

**R127. In a quiz or multi-step flow, ask about the need before asking for contact details.** Asking the problem first feels like a diagnosis; asking name, email and phone first feels like lead capture. Be honest about what the result step is. Condition: quiz funnels. Source: 01 (lead-gen adaptation). Cards: [9ed6a0a32b9f].

**R128. Say what happens after the click, and lower the commitment to match the shopper's stage.** "Get a free quote" beat "Book a free survey" by 60% at ADT because buyers only wanted a price (no sample given). Use permission phrases ("no obligation"). If you do not tell people what they will get, they assume the worst. Condition: any CTA that starts a process (quiz, consultation, pre-order, subscription). Sources: 01 (lead-gen adaptation), 03. Cards: [16c2667cb67c] [a4d2ce6b188a] [8121c53ef9d8] [a01ac2d91e2d] [4653645c47ac].

**Search**

**R138. Audit on-site search as its own funnel: autocomplete, no-results handling, and search-to-purchase rate.** A shopper who searches has already told the store what they want; a dead-end "no results" page or a slow, irrelevant autocomplete loses that intent instead of routing it to a product. Track search-to-purchase rate next to browse-to-purchase rate, and treat a big gap as a hypothesis source. Condition: any store where search carries a material share of sessions, checked first (mirrors R19's direct-entrance check). No source in this folder. `[general practice]` `[needs brand data: search usage share, search-to-purchase rate, top zero-result queries]`.

**Subscription**

**R139. Treat subscription mechanics (pause, skip, swap, cancel-flow saves) as a distinct hypothesis set from one-off purchase CRO.** A subscriber who wants to pause or skip and cannot find how will cancel instead; a cancel flow that offers a pause, a swap or a discount before the cancel confirms can save orders that one-off CRO rules do not touch. Condition: subscription SKUs or plans only; does not apply to a pure one-off catalogue. Thin source: 02-cro-masterclass-2026.md line 160 names a "subscription funnel" once with no procedure; 06-cro-fundamentals.md gives a SaaS/subscription conversion band with no ecommerce framing. `[general practice]`. Verify against brand data before use.

### 3.11 Price and offer tests

**R129. Never show different prices for the same SKU to different users at the same time.** It is legal in the US and EU when not based on protected characteristics, the EU requires disclosure of personalised prices, and even where legal it is "an ethics and brand landmine" (Amazon's 2000 DVD test ended with 6,896 refunds and Bezos saying "even that was a mistake"). Test instead: price presentation, savings framing, payment framing (instalments), tiers, bundles, or offerings that add or remove real features at different prices. Document refund, support and price-match handling before exposing traffic. 03 recommends monthly price-point testing with a tool (the presenter's conference sponsor); apply 05's limits to it. Condition: every price test. Sources: 05, 03. Conflict: C13. `[web check: jurisdiction rules on personalised pricing]`. Cards: [34fa165a64fe] [d12e614c0b4e] [e3ba0fb7d6f6].

**R130. Test offers on a cadence at stores that cannot power micro-tests.** Buy 1 get 1, 3 for the price of 2 (03 transcribed "3 for the power of 2"; confirm), build-a-bundle, thresholds, gifts with purchase (02: $30 perceived value, $4 to $5 COGS, over $60), post-purchase 1-click upsell (02: $19 bag, "usually $35 to $40", 50% off for 5 minutes). Judge on RPV and contribution. Condition: 03 says monthly under 300,000 sessions. Sources: 03, 02. Cards: [d12e614c0b4e] [1e7c5456a957] [0ca0ef2a3d5d].

**R131. Prefer positioned offers to blanket discounts.** 02: a "New Year's reset" bundle at full price converted better than the product ever did on sale; 20% off everything lifts revenue, cuts profit and trains customers to wait; free shipping teaches customers to value delivery separately, so give it only at a threshold that pulls AOV up. Condition: offer hypotheses. Source: 02 only. Cards: [0ca0ef2a3d5d] [1e7c5456a957] [23f840cd83b0].

### 3.12 Platform rules (Shopify)

**R132. Client-side tools for front-end visuals; server-side or Shopify Rollouts for checkout, pricing logic and speed-sensitive paths.** Client-side: marketer-owned, visual editor, fast, but flicker, extra JavaScript, easier to break, logic is public. Server-side: no flicker, faster, can test backend logic, works with feature flags, but needs engineers and a deploy cycle. Rollouts: server-side theme split before the page ships, no flicker, reports numbers with no significance verdict (you do the stats), paid plan tier. Condition: every test plan. Source: 05. `[verify UI]` `[web check: Shopify Rollouts availability and plan tier]`. Cards: [7c932a3b4986].

**R133. Check the plan before planning.** Basic, Shopify, Advanced: test everything before checkout (product, collection, cart, homepage, add to cart, trust elements, pricing display); tools like Varify run via a head snippet on all plans. Plus: checkout extensibility plus native theme A/B. Re-verify yearly. Condition: every engagement start. Source: 05. `[verify UI]` `[web check: Shopify checkout extensibility A/B options]`. Cards: [7c932a3b4986].

**R134. Confirm the testing vendor's engine, prior, SRM alerting and free tier before committing.** Moved to Appendix A: the full vendor roster and their engines (VWO, AB Tasty, Convert, Kameleoon, Optimizely Web, GrowthBook, Statsig, Eppo). Google Optimize was sunset 30 September 2023. Condition: tool choice. Source: 05. `[web check: current engines, pricing, free tiers]`. Cards: [e3ee87a025c5] [0bda3b4d7e04].

### 3.13 Programme rules

**R135. A comprehensive programme (03: over about 300,000 sessions with good conversion and orders) runs deep audits, isolated A/B tests at 4 to 8 a month, a full data stack, learning loops on wins and losses, and a cross-functional team.** 03's agency spends 2 to 3 weeks on an audit of about 100 pages for such clients. Condition: only above the gates in R53; below them, R54. Source: 03. Cards: [3d52bd4930fe] [bbab5b1b0329].

**R136. Run only as many PDP, cart or checkout tests a month as the store's weekly order volume can power, with no 2 tests overlapping one page.** A single-hero-SKU store under 300 orders a month should run 1 bold test at a time, not a weekly cadence. 06 praises weekly testing ("test relentlessly", ShopClues at least 1 test a week). 05 says low-volume stores should test bigger, not more. Condition: the number of tests a month is whatever the traffic can power at the chosen MDE with no overlap on the same page area (R58). Sources: 05, 06. Conflict: C11. Cards: [67f74e89d43e] [300b03fc0354].

**R137. Research-prequalified programmes show higher win rates; unresearched ones lower.** 05 cites DRIP's 36.3% win rate against its pre-qualification. Condition: any programme review where the win rate is low; check the evidence gate (R20) before blaming the ideas. Source: 05. Cards: [f856d689f3d8] [8dc46d4893e1].

**R142. Track loyalty and rewards programme membership as a repeat-purchase lever, separate from the one-off CRO backlog.** A points or tiers programme changes what a repeat buyer sees and is worth testing (sign-up placement, point-earning clarity, redemption friction) on repeat rate and RPV, not on first-purchase conversion. Condition: any store with a loyalty or rewards programme, or considering one. Only mention in the sources: 06-cro-fundamentals.md line 164 uses loyalty tiers as a statistics example, not ecommerce content. `[general practice]`. Verify against brand data before use.

## 4. Procedures (implementation)

Each procedure names its goal, preconditions, steps with settings, checks, and rollback. Platform steps carry `[verify UI]`.

### P1. Build correct conversion and RPV numbers (02)

Goal: a baseline the agent can trust. Preconditions: Shopify analytics and GA4 access.
1. Revenue: pull Net sales + Shipping collected for the period, or Total sales minus tax. Do not use Total sales raw. `[verify UI]`
2. AOV: revenue from step 1 divided by orders. Shopify's AOV excludes shipping collected, so it will differ. `[verify UI]`
3. Sessions: pull GA4 sessions for the same period. Note the gap to Shopify sessions. `[needs brand data: GA4 vs Shopify session gap]`
4. Conversion rate = orders / GA4 sessions.
5. RPV = conversion rate x AOV. Contribution per visitor = RPV x gross margin %. Do not subtract CAC.
6. Repeat by device and by traffic temperature (cold paid, warm, returning).
7. Write RPV as a trend, not a point (02's agency uses about 2.5 years).
Check: the corrected RPV is higher than Shopify's naive figure (shipping added back) and the conversion rate is higher than Shopify's (fewer bot sessions). If not, a step is wrong. Rollback: none; this is a read. Cards: [91d639e7e2e2] [b9f3fede007a].

### P2. Read the funnel and find the biggest drop (03, 06, 07)

Goal: name the stage to work on. Preconditions: tracking confirmed (R17); P1 done.
1. In GA4, open Explore and build a funnel: product view, add to cart, begin checkout, purchase (07). Add checkout completion if the events exist. `[verify UI]` Funnel configuration itself is 06-MEA.
2. For paid traffic, extend the map: ad, landing page, PDP, cart, checkout, thank-you page, post-purchase upsell (03).
3. Read each stage rate by device and channel.
4. Compare with 06's bands (R13) as a directional check only.
5. Weight each drop by the sessions and revenue that pass through it. A 10-point drop on the hero PDP outranks a 30-point drop on a page with 200 sessions a month.
6. Compare event counts with orders in the store backend. If they do not match, stop and route to 06-MEA.
7. Write the funnel memo: stage rates, the biggest weighted leak, device and channel splits, what is unknown.
Check: the leak is stated with the traffic behind it, not only as a percentage. Rollback: none. Cards: [382d08d3f6aa] [bbe716a39c74] [9568c40e1d88] [25f9d85cd8e3].

### P3. Diagnose a conversion-rate change before touching the page (02)

Goal: rule out mix effects before a redesign. Preconditions: P1 by segment.
1. Split conversion by traffic temperature: cold paid, warm, returning.
2. Check whether cold share rose. If yes, the blend can fall with no page change (02: blended 2.8%, cold 1%, warm 4%).
3. Check returning-customer share; high returning share inflates conversion rate and AOV.
4. Check category, price point, AOV, creative and offer changes in the period.
5. If a segment's own rate fell with steady creative, audit the page (section 5). If only the blend moved, report a mix effect and stop.
6. If clarity, offer and proof are already strong, look at product quality, first-order contribution, launches and repeat purchase before another redesign.
7. Judge on RPV or contribution per visitor.
Check: the memo names which segment moved. Rollback: none. Cards: [953e03390b0d] [372439a05cbd].

### P4. Set up a behaviour review in Clarity (04) `[verify UI]`

Goal: a list of friction patterns by page and device. Preconditions: Clarity installed with at least 90 days of data. Interface as of July 2024; names may have moved.
1. Set the date range to the longest representative period (about 6 months; 90 days if newer).
2. Skim top-line metrics for context only.
3. Open the Insights block. Note the rates for rage clicks, dead clicks, excessive scrolling, quick backs.
4. For each Insight, click the camera icon to open the matching recordings.
5. Start with the most valuable and most visited journeys: homepage or campaign landing page, collection, PDP, cart, checkout.
6. For each recurring pattern, record page, device, the apparent blocker, and whether it blocks the purchase path.
7. Classify each pattern by R26 (blocked exit, useful missing action, buried information, false click).
Check: every pattern has at least 1 recording reference. Rollback: none. Cards: [e053644d5707] [9d9871ee324b] [0eae610ddc62] [5b9da7dd1967].

### P5. Read a heatmap page and turn an Area map into a test (04, 07) `[verify UI]`

Goal: placement and reach hypotheses for 1 page. Preconditions: P4 or a known page to inspect.
1. Open Heatmaps. Pick the page. Check the screenshot shows the real page; if a popup or broken layout was captured, use Change screenshot and pick another version.
2. Filter by the device with the most traffic first. `[needs brand data: device split]`
3. Name the page's core action (R23).
4. Click map: add up the clicks on and around the core CTA (04's heuristic: 5 to 7% preferred, 4 to 5% "in and around the average", under 1 to 3% weak). Note clicks on non-clickable elements and in empty space.
5. Scroll map: read reach at the top, the average fold, 75%, 50%, 25%. Find the exact section where reach falls sharply. Note the reach of reviews, guarantee, price and add to cart.
6. Area map: Edit areas, draw regions around navigation, filters, sticky controls, banners, menu toggles, product cards, key modules. Read each region's share of clicks.
7. Flag modules with high click share and low reach (07: 10.41% of clicks, 30 to 35% reach). Flag highly visible modules with few clicks. Flag a static element with a high click share (04: a banner that looked like a button took 46% of clicks).
8. Open recordings for the flagged elements to separate intent from confusion.
9. Write each finding as a narrow hypothesis (R42). For a placement finding, test the move alone: same module design, same destination, new position; primary metric purchase conversion with collection and PDP behaviour as support.
Check: every hypothesis names page, device, evidence and metric. Rollback: none. Cards: [09583734387e] [edd07a1a15f6] [de4dfe536e94] [3043da84ee0c] [bc5a8130eee9].

### P6. Pick and watch recordings (04) `[verify UI]`

Goal: the main friction pattern for a page or step. Preconditions: P4 flagged a page, or P2 found a drop.
1. Open Recordings. Filter: time frame, device, user action (dead clicks, rage clicks, excessive scrolling), scroll depth, landing page, performance (slow vs fast), page duration.
2. Sort by clicks high to low, then pages high to low: the most active visitors. Reverse the sort: the least active. Compare the 2 groups on the same page type.
3. Turn on skip inactivity and raise speed (04 used 4x for a 1-hour session, 1.5x for another). If hesitation may matter, leave inactivity visible.
4. Block 1 to 2 hours with no distractions. Take notes on every key finding.
5. Watch for: clicks on non-clickable elements; repeated navigation loops (back to the top for a filter); rapid clicking, excessive scrolling, skimming; how people move from home to product; which sections get time.
6. Ask "why" about every action.
7. Stop when new sessions repeat patterns you already have (04: about 100 for some clients, 400 to 450 for others).
8. After a fix ships, repeat with fresh recordings of the new version.
Check: the pattern is seen across several sessions and at least 2 devices before it becomes a hypothesis (1 return-to-top is not a pattern). Rollback: none. Cards: [0b8d2f6cc4d1] [a1a3e1f62713] [11e64288067b].

### P7. Set up surveys (03, 07) `[verify UI]`

Goal: objections and motivations in customer words.
1. Post-purchase survey on the thank-you page (KnoCommerce or Okendo on Shopify; Zipify is 03's host's product). Ask at least: "What made you purchase today?" and "What made you almost not purchase today?" Keep attribution questions ("how did you hear about us") in a separate 06-MEA survey or clearly separated.
2. Exit-intent survey (Hotjar Surveys paid add-on, or Okendo): "What stopped you from buying?", "What almost stopped you from converting today?", "What's the reason you're exiting the site?"
3. If no post-purchase survey exists yet: email customers and VIPs a one-time Typeform with the same questions; 03's incentive example is a $250 Amazon gift card draw. `[web check: prize-draw and data-privacy rules]`
4. After 2 to 4 weeks (or 100+ answers, whichever first; no source gives a count), group answers into themes: product uncertainty, quality, time to results, fit, price, shipping, returns, guarantee, how to use, trust gaps, missing info, comparison needs.
5. For each theme, check whether it is answered near the decision on the PDP, cart and checkout. Unanswered themes become hypotheses (R107).
6. Cross-check each theme with the funnel step and recordings (R43).
7. Re-survey after the fix ships and see whether the theme declines.
Check: buyer answers are not used to explain non-buyers; exit survey and user tests cover non-buyers. Rollback: remove the survey app. Cards: [b4505f6c4061] [91410aaad2c8] [b3b265cf22f6] [f89dbadb9131].

### P8. Mine reviews (03, 02)

Goal: objections, tone, buzzwords and unique feedback. Preconditions: review export; 03 says 500 to 1,000+ reviews for this to be non-negotiable.
1. Export all reviews to CSV from the review app. `[verify UI]` `[needs brand data: review export]`
2. Upload to an LLM (03: GPT; 02: Claude or ChatGPT) and prompt for: commonalities, tone of voice, buzzwords, key phrases, friction points, objections, and unique feedback that differentiates the product from alternatives.
3. Read the source reviews behind each claimed theme to confirm; the model can over-generalise.
4. Objections go to the FAQ and hero (R107). Unique feedback goes to positioning (02's one-of-one angle: "the first retinol that didn't make me peel"); claim it only if competitors cannot honestly say the same.
5. Include verbatims in the hypothesis rationale.
Check: every theme has at least 3 verbatim reviews behind it. Rollback: none. Cards: [fc9b05411697] [cf0bc0f31721] [79bdf741dfc4].

### P9. User tests, interviews and the self-purchase audit (03, 05, 07, 01)

Goal: what heatmaps cannot show.
1. Self-purchase: buy from the store on mobile, desktop and tablet within the last 4 weeks. Hand a phone to a 70-year-old and watch. Note popups and cookie bars covering the PDP CTA or cart button, and bugs. These are repairs (R50).
2. Remote user test (Userbrain at $40 per tester at 07's recording time, or Hotjar interviews): recruit 5 to 8 people per task (05). First prompt: first impressions on landing. Tasks: find a suitable product, add it to cart, check out. Note missed navigation, misread details, missed key info, hesitation at cart, checkout doubts.
3. Impartial first-impression check (01): ask people who have never seen the site what they expect about quality, service and legitimacy from the page alone.
4. Customer interviews (03): call recent buyers; why did you buy, was it easy, was anything unclear, what words do you use for the product.
5. Turn repeated patterns into hypotheses. These are qualitative samples, never conversion estimates.
Check: each pattern seen in at least 2 testers or interviews. Rollback: none. Cards: [a2d5c573076a] [f375f7ffb264] [f856d689f3d8] [c0690a74d2de] [9398191fe1b4].

### P10. Write the hypothesis and the test brief (05, 03, 06)

Goal: a pre-registered brief that a reader can run and audit. Preconditions: at least 2 points of evidence.
1. Hypothesis: "Because we observed [evidence], we believe [change] will cause [effect] for [segment], measured by [primary metric]. We will know it worked if [metric moves by at least MDE]."
2. Page, device scope, audience (all, cold paid only, new only).
3. One primary decision metric (conversion rate, RPV or gross profit per visitor per R6). State why.
4. Guardrails with thresholds: AOV, margin, return rate, refund rate, page load, add to cart, downstream purchase. 05 gives no threshold values; set and pre-register them per brand. `[needs brand data: guardrail baselines]`
5. MDE (relative and absolute), planned sample per variant, number of arms, planned dates.
6. Pre-registered segments: device, paid vs organic, new vs returning.
7. Tails (two-sided default; one-sided only with the R64 justification) and stopping method (fixed horizon, or which sequential engine).
8. Runtime: at least 1 full week, in practice 2, covering each weekday twice, plus time to reach the sample.
9. Contamination plan: exclude retention traffic, or run on a cold-only landing page (R65).
10. Validity plan: SRM check, tracking QA, flicker check, bot filter, marketing calendar check.
11. Action for win, loss and inconclusive, written before launch.
12. Expected-value estimate and ceiling (R44).
Check: a colleague can compute the same sample from the brief. Rollback: not applicable. Cards: [1b7725e0ff57] [1f26cd618e2d] [a6c0f42b99a3] [300b03fc0354].

### P11. Prioritise the backlog (05, 03, 02, 06)

Goal: a ranked leaderboard. Preconditions: hypotheses in R42 form.
1. Gate entry: no idea enters without 2 points of evidence (analytics plus replay, survey, user test or interview).
2. Score with a frame to organise: PXL-style criteria (above the fold; noticeable within 5 seconds; high-traffic page; backed by heatmap, user test, survey or analytics; build difficulty), or ICE 1 to 10 x 3 multiplied (02) for a small team. Do not let the idea's owner be the only scorer.
3. Compute expected value: P(win) x expected lift x gross profit per conversion x traffic exposed, minus build cost. Add the ceiling (most it could be worth). `[needs brand data: SKU margin, page traffic]`
4. Keep P(win) honest: 05's anchor is 10 to 20% for well-run tests; raise it only for strong evidence.
5. Sort by expected value. Break ties with the frame score.
6. Check the calendar: no 2 tests on the same page area at once (R58).
7. Repairs and clarity fixes skip the queue and ship (R50, R51).
Check: the top 5 all have named evidence and a computed sample. Rollback: none. Cards: [aad25dea9ed9] [4a2e3d77d68e] [a6c0f42b99a3] [a56c27356031] [300b03fc0354].

### P12. Decide repair, ship or test (05, 02, 04)

Goal: the right path for each backlog item.
1. Is the current state objectively defective (errors, rejected valid input, browser failure, double tracking, blocked CTA, silent cart wipe, false-click element)? Yes: repair now, log it, verify with fresh recordings. Stop.
2. Is it an obvious clarity fix, or proven checkout or landing-page practice, and the store is under 30 orders a month, or the change cannot plausibly hurt? Yes: ship, log it, watch the funnel step and recordings, treat any before-and-after shift as weak evidence.
3. Are both versions plausibly viable and the better one unknown? Compute the sample (P13). If reachable in 2 to 4 weeks: test.
4. If not reachable: raise the MDE (bolder change), move to a higher-traffic page, switch to a micro-conversion primary with purchase guardrail, or ship as a bold change with research backing and a later holdout.
5. Record the decision and the reason in the registry.
Check: nothing defective is queued for a test. Rollback: for a shipped change, keep the previous theme version or section so it can be restored in 1 step. Cards: [3eca46fe9ba3] [6503bc821ea6] [0bda3b4d7e04] [0b8d2f6cc4d1].

### P13. Size a test and set runtime (05, 02, 03)

Goal: sample per variant, total, and weeks. Preconditions: baseline conversion rate of the tested page and metric; weekly eligible traffic. `[needs brand data: baseline conversion rate per page and device; weekly sessions on the tested page]`
1. Baseline p: conversion rate of the page for the audience in the test (not sitewide).
2. MDE: the smallest relative lift worth shipping, thought through in gross profit. Convert to absolute delta = p x relative MDE.
3. Confirm the calculator's input type (relative vs absolute).
4. Alpha 0.05, power 0.80, two-sided (R64).
5. n per variant = 16 x p(1-p) / delta^2, or read the table below, or use Evan Miller's calculator. Check against conversions per variant: about 3,830 (5%), 1,000 (10%), 260 (20%), 120 (30%).
6. Total = n x number of arms.
7. Weeks = total / weekly eligible traffic, rounded up to whole weeks; minimum 1, in practice 2; cover each weekday twice.
8. If RPV is the primary metric, multiply the traffic need by about 6 (05) and pre-register a winsorization cap or a threshold-proportion metric; 05 gives no cap value.
9. If weeks are unreasonable (05: months), go back to P12 step 4.
10. Write MDE, n per variant, arms, total, weeks and dates into the brief.

Sample size per variant, 95% confidence, 80% power, two-sided (05, statsunlock.com, consistent with Evan Miller):

| baseline | 5% rel | 10% rel | 20% rel | 30% rel | 50% rel |
|---|---|---|---|---|---|
| 1% | 637,010 | 163,095 | 42,693 | 19,827 | 7,750 |
| 2% | 315,206 | 80,682 | 21,109 | 9,798 | 3,826 |
| 3% | 207,938 | 53,211 | 13,914 | 6,455 | 2,518 |
| 5% | 122,124 | 31,234 | 8,158 | 3,780 | 1,471 |

Check: a second person gets the same n from the brief. Cross-check with 02's anchor (about 1,000 conversions per variant for a 10% lift). Rollback: none. Cards: [00c82f0de25d] [5fae1beab1ba] [699a7cd5ac4c] [7eeb62d20124].

### P14. Choose the stats engine and stopping method (05)

Goal: a stopping rule the p-value is valid under.
1. Can you estimate the expected sample well (stable traffic, known baseline)? Yes: fixed horizon (look once at the planned sample) or group sequential with alpha spending (more powerful). No, or stakeholders will watch daily: always-valid method (mSPRT, GAVI, corrected alpha), accepting wider intervals.
2. If the tool is Bayesian, find its prior and whether its stopping threshold is protected against optional stopping. If you cannot state the prior, treat results like a peeked frequentist test and size as fixed horizon.
3. Confirm the tool's current engine and SRM alerting in vendor docs. `[web check: vendor stats engine docs]`
4. Write the method into the brief. Under fixed horizon, no interim reads are acted on. Under a sequential engine, only its rule stops the test.
5. New tool or new programme: run an A/A test first (R79).
Check: the brief names the engine and the exact stopping rule. Rollback: none. Cards: [e3ee87a025c5] [0bda3b4d7e04].

### P15. QA, launch and monitor (03, 05, 02)

Goal: a clean test. Preconditions: brief approved.
1. QA the variant 2 or 3 times on real devices (mobile first), browsers and connection speeds. Check add to cart, cart, checkout start in both arms.
2. Confirm tracking fires in both arms and that the tool's conversion count matches the store backend for a short window.
3. Check flicker on a slow mobile connection; if the original flashes, move to server-side or Rollouts, or accept the anti-flicker cost (up to 3 to 4 seconds hidden) and record it.
4. Exclude retention traffic (Klaviyo sends) from the test population, or run on a cold-only landing page; confirm sticky bucketing. `[verify UI]`
5. Check the marketing calendar for promos, launches and holidays in the window; move dates if a sale falls inside.
6. Launch with the planned split.
7. Day 1 and then at each planned look: SRM chi-square on users; flag p < 0.001; if flagged, pause trusting the result and find the cause (bots, redirects, tracking, browser failures).
8. Filter bots.
9. Do not read significance between planned looks. Do not kill or call on one day.
10. Watch for tracking breakage; if it breaks, invalidate the read and restart.
Check: SRM clean, tracking matched, no promo overlap. Rollback: end the test and restore control to 100%; keep the brief and log the reason. Cards: [4d0785cdcf2b] [370ed8c02e34] [699a7cd5ac4c] [7d481c590b57] [3eca46fe9ba3].

### P16. Audit a result or a case study (05, 06)

Goal: decide whether a number can be trusted. Use for your own tests and for any case study, including every case in this playbook.
1. SRM: chi-square goodness-of-fit on the randomisation unit; p above 0.001.
2. Flicker: did the original render first in the variant arm?
3. Tracking: did any pixel or event break mid-test? Do tool conversions match backend orders?
4. Bots filtered?
5. Seasonality or promotions overlapping the window?
6. Stopping: was the test stopped at the planned sample or by a sequential rule, or at the first p < 0.05?
7. Runtime: at least 1 full week, in practice 2, whole weeks?
8. Metric count: how many metrics and segments were read? Bonferroni or FDR applied? Were segments pre-registered?
9. Twyman's law: is the lift plausible (1 to 5% mature, 10 to 20%+ unoptimised)? 50%+ or hundreds of percent: hunt for bugs before celebrating.
10. Guardrails: AOV, margin, returns, refunds, page load, add to cart flat or better?
11. Device split: same direction on mobile and desktop?
12. For a case study: does it state baseline, sample, runtime and validity checks? If not, hypothesis material only.
Output: pass, fail, or hypothesis-only, with the failing checks named. Cards: [370ed8c02e34] [8dc46d4893e1] [1f26cd618e2d] [300b03fc0354].

### P17. Read, decide and close (05, 03, 02)

Goal: a decision and a learning.
1. Report the effect on the primary metric with its confidence interval, per arm, with sample and dates.
2. Compare the interval with the MDE, incremental gross profit, build cost and guardrails.
3. Plot the daily effect; if novelty is suspected, compare first-exposure with repeat-exposure conversion; judge on the stable period.
4. Read the pre-registered segments (device, paid vs organic, new vs returning). Opposite directions: do not ship blind.
5. Win within the realistic band and guardrails flat or better: ship to 100%, add to the live-winner register, schedule the post-ship verification (P6 step 8, P7 step 7, checklist 5.8).
6. Win that is surprising or large: replicate or hold out before banking the revenue.
7. Fully powered inconclusive: record "effect smaller than MDE"; ship neither, or the simpler and cheaper version; do not extend.
8. Clearly negative: stop; do not wait for a reversal; record why it lost.
9. Before scaling a winning angle: check returns, chargebacks, repeat rate and 365-day LTV by angle.
10. Write the registry record (P18).
Rollback: a shipped winner keeps its control version stored so it can be restored in 1 step if guardrails degrade after launch. Cards: [70db51ffb976] [5fae1beab1ba] [1f26cd618e2d] [dad9c85ea261] [f09cfbc3ef44].

### P18. Write the registry record (05, 06, 03)

Goal: one record per test, repair, holdout or causal analysis, in one log. Fields:
1. id, date opened, owner, status (planned, live, closed, shipped, reverted).
2. type: A/B, A/B/n, bandit, feature holdout, programme holdout, repair, before-and-after, causal method.
3. page, device scope, audience, platform tool and engine.
4. hypothesis in R42 form, with the evidence list (each point: source, date, what it showed) and verbatims.
5. primary metric and why; guardrails with thresholds; pre-registered segments.
6. MDE relative and absolute; baseline; planned sample per variant; arms and split; planned dates; tails; stopping method.
7. validity plan and results: QA passes, SRM values per look, tracking match, flicker check, bots filtered, promo overlap notes.
8. actual sample per variant, actual dates, whether the sample was reached.
9. results: effect and confidence interval per metric per segment; guardrail results; daily plot note (novelty).
10. Twyman check: plausible or investigated.
11. decision: ship, kill, inconclusive, replicate, hold out; the action pre-written in the brief versus the action taken.
12. learning: why it won or lost; what the next hypothesis is.
13. shipped date; live-winner check dates; any later reversion and why.
14. for repairs: what was broken, evidence, fix, verification.
15. for holdouts: question, groups and shares, period, net lift with interval, decision.
Check: a reader with no context can compute the same sample and reproduce the decision. Cards: [70db51ffb976] [2b951af15841] [f09cfbc3ef44] [3eca46fe9ba3].

### P19. Run a CRO programme holdout (06)

Goal: net programme value. Preconditions: user-level randomisation available; 06's rough gate is over 100,000 monthly visitors. `[needs brand data: monthly visitors, logged-in share]`
1. Compute detectability first: with the holdout share and period, can the holdout reach enough conversions to detect the effect you care about (P13 math with unequal arms)? 06's 5% and 90 days are illustrations.
2. Randomly assign the holdout share (example 5%) to see the site as it was before the programme; sticky by user.
3. Everyone else gets every shipped winner.
4. Apply repairs and accessibility, policy and major usability fixes to both groups; do not withhold them.
5. Keep assignment stable for the period (example 90 days).
6. At the end, compare conversion rate and RPV with confidence intervals. Report net lift, not the sum of test lifts.
7. Record which experiences each group could receive, the interval and the decision (P18).
Check: the holdout was never exposed to a shipped winner (check the tool's audience logs). Rollback: end the holdout and expose everyone. Cards: [f671352f5b6e].

### P20. Run a feature holdout (06)

Goal: net revenue effect of a popup, recommendation module, personalisation layer or cart-recovery flow.
1. Define the decision metric: RPV. Support: conversion rate, AOV, opt-in rate, repeat purchase.
2. Randomly hold out a group that never sees the feature (examples: popup 90/10; recommendations 5% holdout). Sticky by user.
3. Tag both groups and track through to purchase and, if the feature targets it, repeat purchase.
4. Run long enough to capture delayed purchases; compute the detectable effect first.
5. Read trade-offs: more opt-ins but fewer purchases; more clicks but no bigger baskets.
6. Segment only if the sample supports it; decide on the pre-declared overall metric.
7. Decision: keep, rework, or remove. Record (P18).
Rollback: expose everyone or remove the feature. Cards: [c076b110d253] [e46b405d55df].

### P21. Run a price or offer test (05, 03, 02)

Goal: a legal, ethical test of value perception.
1. Legal and ethics review for the market. `[web check: jurisdiction rules on personalised pricing and disclosure]`
2. Never base price differences on protected characteristics. Do not show different prices for the same SKU to different users at the same time.
3. Choose what to test instead: price presentation, savings framing, payment framing (4 payments of $12), tiers, bundles, gift thresholds, free-shipping thresholds, post-purchase upsells, or different offerings at different prices.
4. Price bundle discounts from fulfilment savings (02) so margin holds; check gift COGS against perceived value.
5. Document refund, support and price-match handling before exposing traffic.
6. If a price-test app is used (05 names TestSignal; 03's sponsor is likely Intelligems `[web check: tool name]`), check how it assigns prices, handles disclosure, and records revenue and margin.
7. Primary metric: contribution per visitor where powered; otherwise conversion rate with AOV and margin guardrails.
8. Size, run, audit and close as P13 to P17.
Rollback: restore the single price and offer for everyone. Cards: [34fa165a64fe] [d12e614c0b4e] [d5a74f7edadd] [0ca0ef2a3d5d].

### P22. Plan a Shopify test around platform limits (05) `[verify UI]`

Goal: a test the platform can actually run.
1. Check the plan tier. `[web check: Shopify checkout extensibility and A/B options, yearly]`
2. Basic, Shopify, Advanced: test only before checkout (product, collection, cart, homepage, add to cart, trust elements, pricing display). A head-snippet tool (Varify named) runs on all plans. Checkout changes ship as repairs, measured by stage rates as weak evidence.
3. Shopify Plus: checkout extensibility (Checkout Blocks, UI extensions, Functions, Branding API); some apps (Personizely, Checkout Boost named) run limited checkout-element tests via Checkout Blocks.
4. Theme tests: consider Shopify Rollouts (server-side, no flicker, numbers with no significance verdict, paid tier); do the stats yourself (P13, P14).
5. Client-side for visuals; server-side or Rollouts for checkout, pricing logic and speed-sensitive paths.
6. Record the platform constraint in the brief.
Cards: [7c932a3b4986].

### P23. Route a measurement question (06)

Goal: the right design for the question, and the right folder.
1. "Did this specific test win?": A/B test, this folder.
2. "Does this feature add net revenue?": feature holdout (P20), this folder.
3. "Has the CRO programme created value?": programme holdout (P19), this folder.
4. "Does retargeting drive incremental revenue?": user-level holdout (06's illustration: 30-day non-buyers, 80/20 split, 14 days; holdout rate divided by exposed rate is the share that would have bought anyway). Route to 11-ADC.
5. "Does Meta drive incremental sales?": geo holdout (06's Hourglass example: 10 DMAs paused 6 weeks, market correlations 0.96 to 0.99). Route to 11-ADC.
6. "Does this email campaign drive incremental purchases?": list holdout (example 10%; lift = promoted rate minus holdout rate). Route to 14-EML.
7. "What was the impact of a site-wide change during peak season?": difference-in-differences or BSTS (Appendix A has the assumption each needs). Route to 06-MEA; state the identifying assumption.
8. "We cannot randomise": synthetic control, propensity matching, regression discontinuity (Appendix A has the assumption each needs). Route to 06-MEA.
9. Whatever the route, write the question, method, result with interval and decision into the shared log (P18).
Cards: [0eca60fd9161] [ddbbe8061d10] [e353aade03ae] [04a08881ac09] [2b951af15841].

## 5. Diagnostic checklists

Written for a worker. Columns: what to check, how, good, bad, fix, source. "Fix" means the hypothesis or repair to raise, not a promise. Case figures are examples. Anything from 01 is a lead-gen adaptation.

### 5.1 Funnel read

| what to check | how | good | bad | fix | source |
|---|---|---|---|---|---|
| Tracking health | Compare funnel event counts with backend orders for the same period | Within a few % | Missing or inconsistent events | Fix tracking first (06-MEA); no test until fixed | 07 [382d08d3f6aa], 05 [3eca46fe9ba3] |
| Session and revenue definitions | Check that sessions are GA4 and revenue excludes tax, includes shipping collected | Corrected figures used | Shopify raw totals | Rebuild with P1 | 02 [91d639e7e2e2] |
| Overall conversion band | Orders / GA4 sessions vs 06 bands | 3 to 5% "good" | Under 1% | Check traffic quality and mix (P3) before page work | 06 [25f9d85cd8e3] |
| Add-to-cart rate | Add to cart / PDP views | 12 to 18% | Under 5% | PDP work (5.4) | 06 [25f9d85cd8e3] [fc7c739888fc] |
| Cart-to-checkout rate | Checkout starts / carts | 60 to 70% | Under 30% | Cart work: cost transparency, reassurance (5.5) | 06 [25f9d85cd8e3] |
| Checkout completion | Purchases / checkout starts | 70 to 80% | Under 50% | Checkout audit (5.6), mostly repairs | 06 [d4104b13110f] |
| Biggest weighted leak | Multiply each drop by sessions and revenue passing through it | One stage clearly dominates | Working on a low-traffic page while the hero PDP leaks | Re-point the backlog | 03 [bbe716a39c74], 05 [f856d689f3d8] |
| Mix effect | Split conversion by cold, warm, returning; check cold share over time | Segment rates steady; blend moved by mix | A segment's own rate fell with steady creative | Audit the page only in the second case | 02 [953e03390b0d] |
| Device split | Stage rates by device | Mobile close to half desktop or better (06) | Mobile far below | Mobile checklist (5.7) | 06 [1e03a58f6fe1] |
| Category exit rate | Exit rate on collections vs site average | Near average | Well above | Check traffic intent, then 5.3 | 06 [1e03a58f6fe1] |
| Direct entrances | Landing-page report: which PDPs and collections get direct entries | Those pages carry their own proof and delivery info | Proof only on homepage | Audit them as landing pages | 01 [3127398d2368] |

### 5.2 Homepage

| what to check | how | good | bad | fix | source |
|---|---|---|---|---|---|
| Share of sessions that start here | Landing-page report | Known before any homepage work | Assumed | Work the real entry pages first | 01 [3127398d2368] |
| 3-second hero | Show the hero to a stranger for 3 seconds: who, what, why | They can say it | Vague line ("Expert hand, human touch") | Rewrite hero (07-LPG); hypothesis on clarity | 06 [5e578ca91bcc], 04 [bc5a8130eee9], 01 |
| Hero drop | Scroll map reach just below the hero | About 93 to 95% still scrolling (04 demo) | Large drop right after hero | Hero clarity plus proof above the fold | 04 [bc5a8130eee9] |
| Curation | Count promoted items and categories in the first 2 screens | Focused selection, clear category entry points | Head-to-toe assortment across many categories | Test a curated set (06 example: broad set cut ATC 6.07%) | 06 [5e578ca91bcc] |
| New-visitor merchandising | What do visitors with no history see | Bestsellers | Static featured products | Test bestsellers for new visitors (06 example +23.01% CTR) | 06 [5e578ca91bcc], 03 [1823c8a7c180] |
| Mega menu | Recordings: do new visitors open it; what is on top | Bestsellers carousel, icons, proof; non-money links at the bottom | Plain default links; contact and FAQ on top | Mega menu test (03 case) | 03 [033531683bba] |
| Menu structure | Count options; check labels; click each | Customer words; under about 6 top options; clicks land on useful pages | Alphabetical, jargon, "commercial home" style intermediate pages | Restructure menu | 01 [f5942adec72b] |
| Menu icon | Mobile: is the menu control familiar | Standard icon and position | Quirky icon or hidden control | Repair | 01 [d4484bf96e29] |
| Hidden demand | Area map click share vs scroll reach per module | Most-clicked modules sit where most people reach | High click share, low reach (07: 10.41% clicks, 30 to 35% reach) | Test moving the module up alone | 07 [de4dfe536e94] |
| Ignored modules | Area map: highly visible modules with few clicks | Every module earns clicks | Static banners that look like buttons; dead modules | Make it work, restyle or remove; confirm in recordings | 04 [09583734387e], 07 [3043da84ee0c] |
| Proof above the fold | Is social proof visible before scrolling | Rating, review count, press or customer count in the hero | Proof only on About or reviews page | Test proof in hero | 04 [bc5a8130eee9], 01 [ba8350548af5] |
| One conversion offer | Count offers competing in the first screen | One newsletter or promo offer with a concrete incentive | Several competing offers | Reduce to one | 06 [5e578ca91bcc], 03 [4653645c47ac] |
| Popups and chat | Recordings and rage clicks in the first 5 seconds | Nothing covers the hero CTA or menu in the first seconds | Popup within 5 s; chat covering a button | Repair: delay or move | 04 [9d9871ee324b] |

### 5.3 Collection page

| what to check | how | good | bad | fix | source |
|---|---|---|---|---|---|
| Page job | Decide: browsing, deciding or buying, from traffic and recordings | Design matches the job | Add to Cart buttons on a browsing page | Test removing them; or, for repeat-buy consumables, test price on card plus add to cart (C14) | 06 [1e03a58f6fe1], 03 [6f635b9d003d] |
| Products above the fold (mobile) | Open on a phone | 2 x 2 grid, 4 products visible | Hero banner or text block hides products | Cut banner to 30 to 40% of first view or less; "start again" (03) | 03 [6f635b9d003d], 06 [1e03a58f6fe1] |
| Labels | Count labelled cards | A few products labelled (bestseller, new, low stock); labels true | Every product labelled; invented scarcity | Reduce; only real data | 03 [6f635b9d003d], 06 [e18bae3af3dd] |
| Filters on mobile | Recordings: do shoppers scroll back to the top to refine | Sticky bottom filter bar or floating pill | Filter only at the top; hidden in hamburger | Test sticky filter, after confirming across several sessions | 04 [11e64288067b], 06 [1e03a58f6fe1] |
| Tap targets | Measure controls | At least 44px with whitespace | Tiny thumbnails, cramped desktop grid | Resize | 06 [1e03a58f6fe1] |
| Subcategory entry | Page review | Clear subcategories, visual hierarchy, swipeable carousels | Wall of undifferentiated products | Add structure | 06 [1e03a58f6fe1] |
| Promo consistency | Compare promo message on collection and on its PDPs | Same promo reinforced | Promo vanishes on PDP | Align messaging | 06 [1e03a58f6fe1] |
| Exit rate | Analytics | Near site average | Well above | Check traffic intent; then design | 06 [1e03a58f6fe1] |
| Image weight | Grid image sizes | Under 60KB, WebP, lazy-loaded below the fold | Heavy images | 08-SPD | 06 [9461d45dfbe7] |

### 5.4 Product page

| what to check | how | good | bad | fix | source |
|---|---|---|---|---|---|
| 4 questions above the fold | Open on a phone; ask what is it, why this one, why now, why trust | All 4 answered; order value, proof, price, CTA | Generic title ("Face serum 30 ml"), no reason to choose, no urgency, no proof | Hero rewrite (07-LPG); headline framing test | 02 [bb761687ad68] [36f1d8130259] |
| Above-fold clutter | Count pickers in the hero | No SKU details, size or quantity pickers in the hero (or defaulted) | Pickers push proof and CTA down | Move pickers to cart or default them | 02 [e10616e94452] |
| Scroll cue | Look at the fold | Cue that more is below | Page looks finished at the fold | Add cue | 02 [36f1d8130259] |
| Add to Cart position | Scroll map reach at the CTA | CTA above the fold and sticky | Reached by 25% (04 example) | Sticky add to cart; move up | 06 [fc7c739888fc], 03 [116d1016fa3b], 04 [edd07a1a15f6] |
| CTA click share | Click map: sum clicks on and around the CTA | 5 to 7% (04 heuristic) | Under 1 to 3% | Emphasise, move, redesign; test | 04 [09583734387e] |
| Reviews position | Where do stars and count first appear | In the hero | Reviews only far below | Move stars up | 03 [116d1016fa3b], 02 [36f1d8130259] |
| Review count and mix | Review widget | About 100+ reviews; media reviews first; mix of 4 and 5 stars; 4.8 reads real | 0 reviews; wall of 5.0; text only | Get reviews first; sort media first; show real distribution | 02 [a507cc86ec03] [0a1f9ee893a3], 06 [e18bae3af3dd] |
| Proof matches claim | Read the featured reviews against the hero claim | Reviews prove the specific claim; specifics (age, result, time) | Generic "great product" wall | Curate claim-matched reviews and before-and-afters | 02 [1d5e67c73cdd], 01 [f95f16ca7611] |
| Review authenticity cues | Review dates | Spread over time | Bunched around the same dates | Fix collection cadence; do not fake | 01 [e24c4415d85e] |
| Gallery | Swipe the carousel | Thumbnails, not dots; gallery sells (benefits, UGC, video, guarantee) | Dots; product-only shots | Test gallery as mini landing page | 03 [116d1016fa3b] |
| Guarantee visibility | Find the guarantee | Visible next to the CTA (older or risk-averse audiences) | Collapsed accordion | Un-collapse; test | 03 [116d1016fa3b] |
| Trust elements | List every badge and statement near the CTA | Specific policy and proof statements (returns, guarantee, customer count) | Generic security seals as the only "proof" | Remove generic seals; test policy statements (C1) | 02 [cdd5df001439], 03 [84ebf548938d], 06 [e18bae3af3dd] |
| Price, shipping, returns, delivery | Find each without clicking | All visible; consistent currency and origin | "Add to cart to see shipping"; $ note on a £ price; inconsistent times | Surface and align | 06 [fc7c739888fc], 01 [e24c4415d85e] |
| Long copy block | Scroll map section by section | Smooth decay | Steep drop after one paragraph (04: about 30%) | Bullets, bold, restructure | 04 [edd07a1a15f6], 03 [116d1016fa3b] |
| "So what" on every line | Read each feature line | Outcome first, feature as proof | "30 ml, vegan, triple peptide" as headlines | Rewrite (07-LPG) | 02 [790f6b3372c2] |
| Table stakes given hero space | Look for free shipping, fast dispatch, great service as headlines | Shrunk to small points low on the page | Given hero space as differentiators | Shrink | 02 [cf0bc0f31721] |
| Top objection answered | Compare "almost did not buy" themes with hero and CTA area | Top objection answered in hero or beside CTA | Objection unanswered (leather quality; time to results) | Hero or section test (03 cases) | 03 [d8e9c11154e5] [109929fb0656] |
| FAQ content | Read the FAQ | Top 3 real objections from research | Shipping policy, brand story | Rebuild from research | 02 [499b4e67252a] |
| Alternatives handled | Read the end of the copy | Every other solution addressed | Silent on cheaper or existing options | Add section | 02 [9f610afef497] |
| Message match | Open each active ad next to the page | Same persona, promise, words | Specific ad into a generic 9-benefit PDP | Message-matched page per persona or offer | 02 [a5cf6ee34972], 03 [6695665021f2] |
| Cold-traffic format | Where does unaware or VSL traffic land | Landing page or advertorial with hook, problem, mechanism, objections, proof, risk reversal, CTA | Plain PDP | Pre-sell page test (C2 for traffic) | 02 [aa0e72b56778], 03 [2d977920a505] |
| Dead clicks | Insights, click map, recordings | Static items do not block purchase | Images that do not open, logo that does not go home, pricing block with 1 live button | Add the expected action | 04 [0eae610ddc62] |
| Quick backs and hunting | Insights, recordings | Normal comparison shopping | Leaving within seconds; racing to find price, reviews, delivery | Surface the missing item sooner | 04 [5b9da7dd1967] |
| Popups and chat | Recordings, rage clicks | Nothing covers ATC in the first 5 s | Popup within 5 s; chat over ATC; cookie bar over button | Repair | 04 [9d9871ee324b], 03 [a2d5c573076a] |
| Demographic fit | Fonts, images, readability vs buyer | Target-age images, larger fonts, scannable text for older buyers | Young models for a pro-age brand; small text | Redesign (07-LPG); test | 03 [116d1016fa3b] [6695665021f2] |
| AI-referred visitors | Segment AI referral traffic; read landing mix and conversion | PDP confirms product type, size, price, delivery, use case at once | Generic page forces re-browsing | Tailor PDP facts; measure RPS | 06 [86c233f0eb39] |
| Load time | Real-user LCP on mobile | Under 2 s | 2.5 s+ | 08-SPD; isolate revenue with a test or holdout | 06 [9461d45dfbe7], 02 [36f1d8130259] |

### 5.5 Cart

| what to check | how | good | bad | fix | source |
|---|---|---|---|---|---|
| Coupon field | Is a discount-code box shown with no live promo | Hidden when no promo; working when one is | Box shown, no promo | Remove (03 case) | 03 [19e8c5c27387] |
| Reassurance | Is there a returns, support, guarantee bar | Present near the checkout button | None | Add trust policy bar; test (C1) | 03 [84ebf548938d] |
| Free-shipping progress | Add an item below threshold | "Spend $12 more" message | No message; threshold too low or absent | Add message; set threshold above typical cart | 02 [c6984ab0f0cc] [23f840cd83b0] |
| Upgrade path | Add a single item | 1-click upgrade to routine or bundle that unlocks gift and shipping | Nothing | Cart drawer offer test | 02 [6baa7dce36c7] |
| Gift thresholds | Raise cart value | Gifts unlock as spend rises (low COGS, high perceived value) | None | Gamification test (03 case) | 03 [e3ba0fb7d6f6], 02 [0ca0ef2a3d5d] |
| In-cart upsells | Review cart | Relevant, low-friction add-ons | None, or irrelevant | Test | 03 [e3ba0fb7d6f6] |
| Cost preview | Look for shipping, tax, fees | Shown or estimated before checkout | Appear only at last step | Show early (39% abandon for late costs) | 06 [d4104b13110f], 02 [27026398ed8a] |
| Cart wipe or state bugs | Recordings; self-purchase; switch menus and variants at checkout | Cart persists | Silent cart wipe (04 case) | Repair immediately | 04 [0b8d2f6cc4d1] |
| Cookie bar over cart button | Phone test | Clear | Covered | Repair | 03 [a2d5c573076a] |
| Judge on | Metrics for any cart test | RPV and contribution | AOV alone | Set metrics per R1, R9 | 02 [0ca0ef2a3d5d] |

### 5.6 Checkout

| what to check | how | good | bad | fix | source |
|---|---|---|---|---|---|
| Testability | Plan tier and checkout extensibility status | Known before hypotheses are written | Client-side checkout test planned on a standard plan | Ship as repairs; Plus for tests (P22) | 05 [7c932a3b4986] |
| Total extras | Sum shipping, tax, fees on a typical order | Under about 10% of AOV | $26 of extras on a $100 order (02 mockup) | Cut or fold into price; threshold shipping | 02 [27026398ed8a] |
| Total shown early | Walk through | Total before checkout; no drip pricing | Monthly price on page, quarterly in cart (02 IM8) | Show true total | 02 [8b2d9df04dfb] |
| Tax line | Look at the order summary | Included tax labelled clearly | Looks like a new charge | Label | 02 [8b2d9df04dfb] |
| Guest checkout | Walk through as a new user | Guest is default and prominent; email collected during it | Forced or hidden account step (62% of sites, Baymard) | Turn off forced accounts `[verify UI]` | 02 [94a63f9f740b], 06 [d4104b13110f] |
| Express pay | Look at the top of checkout | Shop Pay, Apple Pay, Google Pay first; UPI in India | Missing or buried; redirects | Enable and move up `[verify UI]` | 02 [a5c46083a30f], 06 [d4104b13110f] |
| Field count | Count fields | Essentials only; optional marked; autofill works | Baymard average 11.3; bloated address block | Cut fields | 02 [c6984ab0f0cc], 06, 05 |
| Progress indicator | Multi-step flow | Present | Absent | Add | 06 [d4104b13110f] |
| Returns policy | Find it during checkout | Stated plainly ("30-day returns") | Hidden | Surface; do not rush free returns in fashion | 02 [1e401776f34b], 06 |
| Delivery expectations | Read the delivery options | Realistic dates; fast options offered | Slow only; or dates hidden without legal review | Add fast options; hide-dates test only sized and reviewed (R122) | 02 [27026398ed8a] |
| Payment trust cues | Look for payment logos, security indicators | Recognisable brands present | Startup-looking checkout with no brand presence | Add proof and brand presence, not generic seals (C1) | 06 [d4104b13110f], 02 [cdd5df001439] |
| One-page vs multi-step | Note current design | Decided by a test or held constant | Changed on opinion | Test on Plus or server-side (C15) | 02 [c6984ab0f0cc], 06 [04a08881ac09] |
| Mobile checkout | Phone walk-through | Large tap targets; wallet or one-page | Tiny fields; redirects | Mobile repairs | 06 [d4104b13110f] |
| Abandonment flows | Are email and SMS recovery flows live | Live, measured against a holdout, not discount-only | Absent, or discount-only with no holdout | 14-EML build; P20 holdout | 02 [3163cc34fa79], 06 [e46b405d55df] |
| Payment errors and completion tracked | Separate events for checkout start, payment error, completion by device | Tracked before and after changes | Only purchases tracked | 06-MEA | 06 [d4104b13110f] |

### 5.7 Mobile

| what to check | how | good | bad | fix | source |
|---|---|---|---|---|---|
| Effort split | Where is CRO time going | About 90% mobile | Desktop first | Re-plan | 02 [a56c27356031] |
| Device conversion gap | Mobile vs desktop conversion | Mobile near half of desktop or better (06) | Far below | Mobile audit | 06 [1e03a58f6fe1] |
| Mobile cart abandonment | Carts vs purchases on mobile | Better than about 85% (06) | Worse | Cart and checkout mobile fixes | 06 [d4104b13110f] |
| Thumb zone | Where are key actions on a phone | Lower half; floating CTA; sticky filter | Top-only controls | Move controls | 06 [1e03a58f6fe1] |
| Tap targets | Measure | At least 44px | Cramped | Resize | 06 [1e03a58f6fe1] |
| Desktop grid squeezed | Compare layouts | Mobile-designed grid | Tiny thumbnails, unreadable text | Redesign | 06 [1e03a58f6fe1] |
| Clickable phone and email | Tap them | Open dialler and mail | Static text | Repair | 06 [d4104b13110f] |
| Wallets | Checkout on phone | Apple Pay, Google Pay, Shop Pay | Card entry only | Enable | 02 [a5c46083a30f], 06 |
| LCP and INP | Chrome UX Report, Shopify Web Performance, PageSpeed Insights (real-user) `[verify UI]` | LCP under 2 s | 2.5 s+ | 08-SPD | 06 [9461d45dfbe7] |
| Image weights | Inspect | Hero under 100KB, grid under 60KB, WebP, lazy-load | Heavy | 08-SPD | 06 [9461d45dfbe7] |
| Hero check on a phone | Open every PDP on a phone, not a computer | 4 questions answered (5.4) | Only checked on desktop | Re-audit | 02 [36f1d8130259] |
| Test segment | Every brief pre-registers device | Mobile read separately | Blended read only | Add to brief | 05 [1f26cd618e2d] |

### 5.8 Behaviour signals (Clarity or Hotjar)

| what to check | how | good | bad | fix | source |
|---|---|---|---|---|---|
| Rage clicks | Insights rate, then camera icon to recordings | Under about 1 to 2% and no blocking cause | Repeated clicks on a popup close, chat widget, or a control in the buy path | Remove or delay the blocker; recheck | 04 [9d9871ee324b] |
| Dead clicks | Insights, click map, recordings | Static items do not block purchase (press logos) | Pricing blocks, logo, product images, check marks clicked with no action | Add the expected action or make static nature clear | 04 [0eae610ddc62] |
| Excessive scrolling | Insights, recordings, scroll map | Very low rate; no hunting | Racing to find reviews, price, ATC; skipping a text wall | Move the item up or shorten | 04 [5b9da7dd1967] |
| Quick backs | Insights, recordings | Normal comparison | Leaving a PDP within seconds for missing info | Surface price, reviews, delivery, sizing sooner | 04 [5b9da7dd1967] |
| False clicks | Click map vs live page | Clicks sit on real controls | Clicks on button-styled non-buttons; clicks in empty space | Make them work or restyle; "massive" wins reported (03) | 03 [9568c40e1d88], 04 [09583734387e] |
| Screenshot validity | Heatmap screenshot vs live page | Real page captured | Popup or broken layout captured | Change screenshot | 04 [09583734387e] |
| Scroll checkpoints | Top, average fold, 75%, 50%, 25% | Key proof and CTA where most reach | Reviews or ATC reached by 25 to 30% | Move up | 04 [bc5a8130eee9] [edd07a1a15f6] |
| Reach vs clicks | Area map click share vs scroll reach | Aligned | High clicks, low reach; or high reach, no clicks | Placement test; relevance check | 07 [de4dfe536e94] [3043da84ee0c] |
| Engaged vs disengaged | Sort recordings by clicks and pages both ways | Clear difference in what engaged shoppers use | Sorts reflect page complexity, not intent | Read with caution; add filters | 04 [a1a3e1f62713] |
| Pattern confirmation | Count sessions and devices showing the pattern | Several sessions, 2+ devices | 1 recording | Keep watching before writing a hypothesis | 04 [11e64288067b] |
| Post-ship recheck | Fresh recordings of the new version | Friction gone; next issue found | Not rechecked | Schedule the recheck | 04 [0b8d2f6cc4d1] |
| Tool cost | Daily sessions vs plan allowance | Paying only for jobs used | Hotjar bill or sampling at high traffic for heatmaps alone | Move heatmaps and recordings to Clarity `[web check: pricing]` | 07 [3728f5d4ae33] |
| Survey coverage | Is there a post-purchase and an exit survey | Both live | Neither | P7 | 07 [f89dbadb9131], 03 [b4505f6c4061] |

### 5.9 Test validity (run before, during and after every test)

| what to check | how | good | bad | fix | source |
|---|---|---|---|---|---|
| Repair or test | Is the current state objectively broken | Both versions viable | Bug, broken tracking, blocked CTA | Repair; do not test | 05 [3eca46fe9ba3] |
| Evidence gate | Count evidence points in the brief | 2 or more | Opinion only | Back to research | 05 [aad25dea9ed9], 03 [25979af2691c] |
| Powered | Sample table or calculator vs weekly page traffic | Planned sample in 2 to 4 weeks | Needs months; MDE under 10% at low volume | Bolder change, bigger page, micro primary, or research only | 05 [00c82f0de25d] [67f74e89d43e] |
| Relative vs absolute MDE | Read calculator input | Matches plan | +0.4 points confused with +20% | Recompute | 05 [00c82f0de25d] |
| Tails | Brief | Two-sided, or one-sided with documented reason | One-sided to hit significance | Revert, recompute | 05 [517a8bce6324] |
| Stopping rule | Brief names fixed horizon or a sequential engine | Named and followed | Stopped at first p < 0.05 | Result unreliable; re-run | 05 [e3ee87a025c5], 02 [699a7cd5ac4c] |
| Bayesian prior | Vendor docs | Prior and stopping protection stated | Flat hidden prior; stopped on a peek | Treat as peeked; re-run | 05 [e3ee87a025c5] |
| Runtime | Dates | 2 full weeks or more; each weekday twice; sample met | Under 1 week; split weeks | Extend only if pre-planned | 05 [5fae1beab1ba], 03 [7d481c590b57] |
| SRM | Chi-square on users | p above 0.001 | p < 0.001 or visible skew | Do not trust; find cause | 05 [370ed8c02e34] |
| Flicker | Load variant on slow mobile | No original flash | Flash then swap | Server-side; record anti-flicker cost | 05 [370ed8c02e34] |
| Tracking | Tool conversions vs backend orders per arm | Match | Pixel broke mid-test | Invalidate | 05 [3eca46fe9ba3] |
| Contamination | Traffic sources in the test | Retention traffic excluded or isolated; sticky bucketing | Klaviyo sends in the test; multi-click exposure to both arms | Cold-only page or ad-set split | 02 [699a7cd5ac4c] |
| Bots | Filter applied | Yes | No | Filter and re-read | 05 [370ed8c02e34] |
| Promo overlap | Marketing calendar vs dates | Clean window | Sale or holiday inside | Note confound; consider re-run | 05 [062507c94ee4] |
| QA | 2 to 3 passes on devices | Done | Bug in variant | Fix and restart | 03 [4d0785cdcf2b] |
| Concurrent tests | Test calendar | No overlap on the same page area | Two tests on one PDP area | Serialise | 03 [7d481c590b57] |
| Multiple comparisons | Count metrics and segments read | 1 primary; pre-registered segments; correction applied | Many metrics; post-hoc slices | Bonferroni or FDR; slices seed new tests | 05 [1f26cd618e2d] |
| Device direction | Pre-registered mobile vs desktop | Same direction | Blended win hides mobile loss | Investigate before shipping | 05 [1f26cd618e2d] |
| Guardrails | AOV, margin, returns, refunds, load, ATC | Flat or better | Any worse | Not a win | 05 [7eeb62d20124], 02 [dad9c85ea261] |
| Plausibility | Lift vs page maturity | 1 to 5% mature; 10 to 20% unoptimised | 50%+ | Twyman audit; replicate or hold out | 05 [370ed8c02e34] [8dc46d4893e1] |
| Novelty | Daily plot; first vs repeat exposure | Stable | Early spike that fades | Judge on stable period | 05 [5fae1beab1ba] |
| Inconclusive handling | Decision at full power | Recorded as "smaller than MDE"; not extended | Extended to chase significance | Close it | 05 [70db51ffb976] |
| Winner still live | Live-winner register vs site | Live | Overwritten by theme or team change | Restore | 03 [f09cfbc3ef44] |
| Platform sanity | A/A test | No difference | Significant A/A | Fix platform | 05 [0bda3b4d7e04] |
| Case study claim | Baseline, sample, runtime, validity stated | Stated | Not stated | Hypothesis only | 05 [370ed8c02e34], 06 |

## 6. Thresholds and benchmarks

One table for the folder. Confidence: how many sources agree and what kind of evidence sits behind the number. "Self-contradiction" marks a number the same source states 2 ways. Every case figure is an example.

| topic | value | condition | source(s) | confidence |
|---|---|---|---|---|
| **Traffic gates** | | | | |
| Comprehensive CRO vs big swings | about 300,000 sessions a month; also needs "good enough" conversion and orders (undefined) | 2025 internal agency update | 03 | 1 source, agency heuristic |
| Micro-tweak testing worthwhile | about $40M+ online revenue for ~0.1% lifts | opinion | 02 | 1 source, opinion |
| Bold changes only | under about 100,000 visitors a month, aim at 10 to 20%+ effects | heuristic | 05 | 1 source, cites aiformarketing.news and VWO |
| Holdout designs (user-level, geo, switchback) | over about 100,000 visitors a month | rough | 06 | 1 source; different meaning from 05's 100,000 (C7) |
| Order bands | under 30: research only; 30 to 300: one bold A/B at 20%+; 300 to 3,000: A/B at 10 to 20%; 3,000 to 20,000: A/B/n, bandits, 5 to 10%; 20,000+: full programme, 2 to 5% | DTC, 2 to 3% conversion, anonymous traffic | 05 | 1 source, author synthesis; not eligibility gates |
| A/B/n and routine bandits | 3,000+ orders a month | lower only for short regret-minimising campaigns | 05 | 1 source |
| Test velocity | 4 to 8 tests a month | over 300,000 sessions | 03 | 1 source, agency practice; 05 says cadence follows power (C11) |
| Research gathering time | about 1 to 2 weeks | under 300,000 sessions | 03 | 1 source |
| Comprehensive audit | 2 to 3 weeks, about 100 pages | agency clients | 03 | 1 source |
| **Sample size** | | | | |
| Formula | n = 16 x p(1-p) / delta^2 per variant | alpha 0.05 two-sided, power 0.80, delta absolute | 05 (Evan Miller) | 1 source, published method |
| Conversions per variant | about 3,830 (5%), 1,000 (10%), 260 (20%), 120 (30%) | 80% power, 95% confidence | 05; 02 agrees on ~1,000 for 10 to 20% | 2 sources agree on the 1,000 anchor |
| Sessions per variant | about 40,000 at 2.5% conversion (80,000 total) for a 10 to 20% lift | illustrative | 02 | 1 source; consistent with 05's table between 10% and 20% |
| Sessions per test | 50,000 to 100,000 "through a test" | unclear per variant or total | 03 | 1 source, ambiguous (C3) |
| Sample table | 2% baseline: 315,206 (5%), 80,682 (10%), 21,109 (20%), 9,798 (30%), 3,826 (50%) per variant; other rows in P13 | 95% / 80% two-sided | 05 | 1 source, published calculator |
| Halving the MDE | 4x sample | always | 05 | formula |
| "400 conversions a month" | powers only about 30 to 40% lift in a month | rejected as a rule | 05 | 1 source |
| "200 per variant for 20%" | roughly right; 250 to 260 safer | 80% power | 05 | 1 source |
| RPV sample penalty | about 6x traffic; about 175,000 vs 28,000 per variant | 3% baseline, same relative MDE | 05 (Atticus Li 2026) | 1 source |
| RPV skew | 97% of visitors spend $0; CV about 750% | typical case | 05 | 1 source |
| User test size | 5 to 8 people per task | task-based | 05 | 1 source, origin not given |
| Backlog entry | at least 2 points of evidence | every idea | 05, 03 (data non-negotiable) | 2 sources |
| **Duration and stopping** | | | | |
| Minimum runtime | at least 1 full week, in practice 2, plus planned sample | all tests | 05, 03, 06 | 3 sources |
| Typical runtime | 2 to 4 weeks | agency practice; 05 band 30 to 300 | 03, 05 | 2 sources |
| Weekday coverage | each weekday twice | avoid one-day shocks | 03 | 1 source |
| Delivery-time display test | 7 to 10 days | slow-delivery stores | 02 | 1 source; self-contradiction with 02's own sample math |
| Peeking, worst case | 5% false positive becomes 26.1% | check after every observation, stop at first p < 0.05 | 05 (Evan Miller) | 1 source, published |
| Peeking after 2 weeks | 5% becomes about 17% | daily checks for 2 more weeks | 05 (Kohavi/Sonnet) | 1 source, published |
| Bayesian peeking | about 80% false positive | peek every 100 observations, stop at P > 0.95 | 05 (Molas 2025) | 1 source, simulation |
| Reported p needed for true 5% | 2.9% (1 peek), 2.2% (2), 1.8% (3), 1.4% (5), 1.0% (10) | fixed number of looks | 05 | 1 source |
| SRM flag | p < 0.001 (chi-square on users) | every test | 05 (Kameleoon) | 1 source |
| SRM frequency | about 6% of experiments | Microsoft | 05 (Kohavi) | 1 source |
| Anti-flicker cost | page hidden up to 3 to 4 s by default | client-side snippets | 05 (DebugBear) | 1 source |
| Multiple metrics error | 1 metric 5%, 2 about 10%, 3 about 14% | alpha 0.05 each | 05 | 1 source |
| False wins among significant results | about 1 in 5 | 10% of ideas true, 80% power | 05 | 1 source, derived |
| CUPED sample reduction claim | 30 to 50% | metrics tied to past behaviour, identified users | 05 (Optimizely); 06 "essentially free" | 2 sources disagree on applicability (C5) |
| CUPED ceiling on revenue | 15.91% variance reduction | n = 400,000, volatile revenue | 05 (LinkedIn) | 1 source, published |
| Switchback precision | 40 to 60% lower standard errors | marketplaces vs item randomisation | 06 | 1 source, unsourced |
| **Win rates and lift sizes** | | | | |
| Win rate anchor | about 10 to 20% significant winners | well-run programmes | 05 (Microsoft 33%, Bing 15%, Google/Booking/Netflix 10%, Airbnb 8%, Optimizely 12%, VWO 14%, CXL 20%) | 1 source compiling many published figures |
| "Very good" win rate | 30 to 35% | agency view | 03 | 1 source; self-contradiction: own showcase 13 of 135 (9.6%) |
| Decisive rates | DRIP 36.3% win / 41.6% inconclusive, decisive 62.1%; ConversionTeam 19.1% significant, 61.1% decisive | looser definitions | 05 | 1 source with definitions |
| "60%+ win rate" | cited as a target; 61.1% for one 2025 programme | definition not stated | 06 | 1 source; conflicts with 05 (C4) |
| Realistic lift | 1 to 5% mature pages; 10 to 20%+ unoptimised; 50%+ suspect | planning | 05 | 1 source |
| Median winner RPV | +2.77%; top quartile +5.21%+ | DRIP database | 05 | 1 source |
| Programme holdout illustration | 5% holdout, 90 days; 2.5% vs 2.9% (+16% relative) | illustration | 06 | illustration, not data |
| **Conversion benchmarks** | | | | |
| Overall conversion bands | under 1% poor; 1 to 2% average; 2 to 3% above average; 3 to 4.5% strong; 4.5%+ top 10%; 5 to 8%+ best | ecommerce | 06 | 1 source, unsourced |
| Global ecommerce average | about 2.5 to 3% | average | 06 | 1 source, unsourced |
| Average site conversion | "maybe 1 to 2%, probably 0.5% to 1%"; weak sites 0.5% or lower; agency-built 2 to 10% | 2020, mostly lead-gen | 01 | 1 source, presenter estimate |
| Funnel stage bands | ATC under 5 / 8 to 12 / 12 to 18 / over 18; cart to checkout under 30 / 50 to 60 / 60 to 70 / over 70; checkout completion under 50 / 60 to 70 / 70 to 80 / over 80 (poor / average / good / excellent) | ecommerce | 06 | 1 source, unsourced |
| PDP conversion by vertical | beauty 2.5 to 4%; apparel 1.8 to 3%; electronics 1.2 to 2%; home 1.5 to 2.5%; SaaS 3 to 7% | | 06 | 1 source, unsourced |
| Blended vs segment example | blended 2.8%, cold Meta 1%, warm 4% | illustration | 02 | illustration |
| Store comparison | 9% conversion at $45 to $55 AOV vs 1% at $200M and 50% contribution margin: the 1% store is better | anonymised real stores | 02 | 1 source |
| Cart abandonment | 70.22% (50 studies; 69 to 71% since 2014); 02 quotes 70% | global | 05, 06 (Baymard), 02 | 3 sources, same origin |
| Mobile cart abandonment | about 85% | mobile | 06 | 1 source, unsourced |
| Abandonment reasons | extra costs 39%; slow delivery 21%; card trust 19%; forced account 19% (06: 16 to 24%); checkout too long 18%; returns 15%; total not shown 14%; 43% of abandoners just browsing | Baymard as cited | 02, 06 | 2 sources, cited from memory; `[web check]` |
| Guest checkout not prominent | 62% of sites | Baymard | 06 | 1 source |
| Checkout UX mediocre or worse | 65% of sites (also 64% desktop, 63% mobile); 2% good; 15% poor | Baymard 2025 | 06 | 1 source; self-contradiction (rounding) |
| Checkout improvements available | about 32 per large site; about 35% checkout uplift | Baymard | 05, 06 | 2 sources, same origin |
| Checkout fields average | 11.3 | Baymard | 05 | 1 source |
| Checkout extras cap | under about 10% of AOV | all extras | 02 | 1 source, agency finding |
| Shipping collected with no material effect | up to about 10% of AOV, also stated as "10% of total revenue" | 2019 to 2020 own tests | 02 | 1 source; self-contradiction |
| High-impact tests before checkout | about 80% | ecommerce | 05 | 1 source, vendor-derived |
| **Behaviour heuristics** | | | | |
| Rage click rate "good" | under about 1 to 2% (demo 0.2%) | directional | 04 | 1 source, heuristic |
| Excessive scrolling "not a concern" | under 0.01% | demo | 04 | 1 source |
| Popup timing that causes rage clicks | within the first 5 s (screenshot issue 3 to 5 s) | | 04 | 1 source |
| Core CTA click share | 5 to 7% preferred; 4 to 5% average; under 1 to 3% weak | click map sum | 04 | 1 source, heuristic |
| Never scroll past the top section | 60% | unsourced "statistically" | 04 | 1 source, unsourced; check own data |
| Hero reach on a healthy page | 93 to 95% (demo 96% then 87%) | | 04 | 1 source, demo |
| Testimonial reach signalling placement problem | about 30% | example | 04 | 1 source |
| Key point seen above footer | about 6% of visitors | 1 case | 03 | 1 source |
| High-click low-reach example | 10.41% of clicks, 30 to 35% reach; reported +18% conversion | 1 case, no stats | 07 | 1 source, no statistics |
| Recordings to watch | no quota; about 100 to 450 | stop when repetitive | 04 | 1 source |
| Recording block | 1 to 2 hours | per session | 04 | 1 source |
| Review window | about 6 months; 90 days if newer | | 04 | 1 source |
| Self-purchase cadence | every 4 weeks | | 03 | 1 source |
| Review mining threshold | 500 to 1,000+ reviews | non-negotiable above | 03 | 1 source; 02 uses at any count |
| Post-purchase questions | at least 2 | | 03 | 1 source; 07 agrees on the questions |
| One-time survey incentive | $250 gift card draw | example | 03 | example |
| **Page heuristics** | | | | |
| Reviews effect | 0 to about 100 roughly doubles conversion; jump mostly 0 to 80; beyond immeasurable | own brands 2019 to 2020 | 02 | 1 source, no method |
| Proof relevance | 5 relevant reviews beat 400 generic | opinion | 02 | 1 source |
| Rating believability | 4.8 more believable than 5.0; mix of 4 and 5 stars | opinion | 02, 06 | 2 sources, opinion |
| Trust gap | 14% trust brand claims | consumers | 06 | 1 source, unsourced |
| Category test win rates | benefit communication 54.5%; shipping and returns 41.8%; payment trust 40.5% | | 06 | 1 source, unsourced |
| Inline trust icons | +18% revenue per session after 3 weeks | 1 DTC brand | 06 | 1 case, no stats |
| Homepage curation | broad assortment: ATC down 6.07%, CTR down 10.4%; bestsellers to new visitors +23.01% CTR; personalised +136% CTR | single experiments | 06 | 1 source, unsourced |
| Hero test | 3 seconds (06); 5 seconds or less (04) | homepage hero | 06, 04 | 2 sources, different numbers |
| Mobile share | 60 to 95% by brand (80% in hero section) (02); about 60% (06) | | 02, 06 | 2 sources |
| Mobile conversion | about half desktop | | 06 | 1 source |
| Effort split | 90% mobile, 10% desktop | | 02 | 1 source, opinion |
| Mobile grid above the fold | 2 x 2, 4 products | | 03 | 1 source |
| Hero banner share of first view | 30 to 40% max | mobile collection | 06 | 1 source |
| Tap targets | at least 44px | | 06 | guideline |
| Mobile filter abandonment | 75% if they cannot refine quickly | | 06 | 1 source, unsourced |
| Mobile LCP target | under 2 s | | 06 | 1 source |
| Image weights | hero under 100KB; grid under 60KB | | 06 | 1 source |
| Speed elasticities | 100ms = 3.5% lower conversion; 100ms = 7% drop; 1 s = up to 7%; LCP 2.5 s vs 1.5 s about 30% lower; 0.1 s faster = 8.4% higher | | 06 | 1 source; self-contradiction; investigate, do not forecast |
| Form fields | 4 or fewer "sweet point"; drop at 3rd or 4th field (04, B2B); falls from 3 to 10, also lower at 1 to 2 (01, HubSpot, lead gen) | lead forms | 04, 01 | 2 sources, lead gen; adaptation |
| Menu options | past about 6 people forget the first | phone-menu analogy | 01 | 1 source, analogy |
| Free-shipping threshold examples | $66 (offer), $75 (checkout mockup) | examples | 02 | illustration |
| Bundle funded by fulfilment | $136 value, $122 price, $14 saved fulfilment | example | 02 | illustration |
| Gift with purchase | $30 perceived, $4 to $5 COGS, orders over $60 | example | 02 | illustration |
| Post-purchase upsell | $19 "usually $35 to $40", 50% off for 5 minutes | example | 02 | illustration |
| Multi-buy fit | $30 to $40 items people own several of | sunglasses | 03 | 1 case |
| Cart recovery timing | first contact within 1 hour; escalate over 72 hours | framework to test | 06 | 1 source |
| **Holdouts** | | | | |
| Programme holdout | 5% traffic, 90 days | illustrative | 06 | illustration |
| Popup holdout | 90% exposed / 10% holdout | illustrative | 06 | illustration |
| Recommendation holdout | 5% | illustrative | 06 | illustration |
| Email holdout | 10% of list; lift = 3.8% minus 2.1% = 1.7 points | illustrative | 06 | illustration |
| Retargeting holdout | 80/20, 14 days, 30-day non-buyers; holdout at 70% of exposed rate = 30% incremental | illustrative | 06 | illustration; 11-ADC |
| Geo holdout | 10 DMAs, 6 weeks, correlations 0.96 to 0.99; incremental CPA $130 (10.4% lift, 99% confidence) | Hourglass 2025 | 06 | 1 real case; 11-ADC |
| **Tool prices (dated)** | | | | |
| Clarity | free, no data limit | at 07's recording | 07, 04 | `[web check]` |
| Hotjar Plus | $32 a month for 100 daily sessions; surveys paid separately | at recording | 07 | `[web check]` |
| Userbrain | $40 per tester | at recording | 07 | `[web check]` |
| VWO free tier | up to 50,000 tested users a month | time-sensitive | 05 | `[web check]` |
| Statsig free tier | up to 1M events a month | time-sensitive | 05 | `[web check]` |
| ResponseTap | about £250 a month | 2020 | 01 | `[web check]` |
| Live Call | $49 a month annual, $59 monthly | 2020 | 01 | `[web check]` |
| Leadpages | about £60 a month | 2020 | 01 | `[web check]` |

## 7. Where sources disagree

Each conflict: what each side says, when each is right, and what the agent should do.

**C1. Trust badges.** 02: generic footer security seals "do absolutely nothing to close anyone"; remove them; guarantees and returns are table stakes but useful as risk reversal after the proof. 03: winning designs include a "trust policy bar" in cart (easy returns, support, satisfaction guarantee, money-back guarantee) and seals by the CTA (money-back guarantee, "over 10,000 happy customers", vegan-friendly, made in the US, "featured in" logos, only if true). 06: one DTC brand moved trust icons inline next to Add to Cart and reported +18% revenue per session after 3 weeks (no stats); payment trust signals win 40.5% of tests (unsourced). 01: secure-checkout logos, awards and Trustpilot as credibility (lead gen). The sides are partly about different things: 02 attacks generic security seals; 03 and 06 are mostly policy and proof statements. Nothing was tested head to head in any source. What the agent should do: remove generic security seals from hero and PDP unless a brand test says otherwise; treat specific policy and proof statements beside the CTA and in cart (returns, guarantee, customer count, press, made-in) as a hypothesis worth testing; keep payment logos in checkout; never invent a count or a press mention.

**C2. When micro-testing pays, and which traffic gate to use.** 02: micro-tweaks for about 0.1% lifts pay only at about $40M+ online revenue; most "CRO wins" are noise; test only big swings. 03: comprehensive testing (4 to 8 isolated tests a month) above about 300,000 monthly sessions with enough orders; big swings below. 05: bands by orders per month (2 to 5% MDE only at 20,000+ orders; 5 to 10% at 3,000 to 20,000; 10 to 20% at 300 to 3,000; 20%+ at 30 to 300; nothing under 30) and "under about 100,000 visitors a month, bold changes only". The gates measure different things (revenue, sessions, visitors, orders) and none is derived from the sample formula. What the agent should do: compute conversions per variant for the chosen MDE from the brand's own baseline (P13); use 05's order bands as the primary map because they tie to conversions; use 03's 300,000 sessions and 02's $40M as sanity checks; never run a tweak test that needs months to power.

**C3. Sample size per variant versus total.** 02: about 1,000 conversions per variant for a 10 to 20% lift, about 40,000 sessions per variant at 2.5%, 80,000 total for an A/B. 03: 50,000 to 100,000 sessions "through a test", without saying per variant or total. 05: per-variant table by baseline and MDE; 1,000 conversions per variant powers a 10% lift, 260 a 20% lift. 02 and 05 agree once "per variant" is explicit; 03 is ambiguous and, read as a total, would under-power a 10% lift at 2% baseline (80,682 per variant needed). What the agent should do: always state sample per variant and multiply by arms; use 05's table; treat 03's range as an agency habit, not a rule.

**C4. Win-rate targets.** 05: about 10 to 20% of well-run tests produce a significant winner; higher figures use looser definitions (DRIP 36.3% with research pre-qualification; ConversionTeam 61.1% "decisive" = wins over wins plus losses). 03: 30 to 35% is "very, very well", while its showcase client won 13 of 135 (about 9.6%). 06: "a disciplined testing program with 60%+ win rate generates compounding returns", citing 61.1% for one 2025 programme without a definition. What the agent should do: plan for 10 to 20% significant winners; report any win rate with its definition (significant winner per test, decisive rate, or raw) and sample; never set 60% as a target; if a programme reports above 35%, audit the definition and the stopping rules before believing it.

**C5. CUPED.** 06: "essentially free sensitivity" for any A/B test with pre-experiment user data; cuts variance and sample. 05: vendors claim 30 to 50% lower sample needs, but the method needs logged-in users or stable device IDs; on mostly new, anonymous DTC checkout traffic the covariate is missing or weak; LinkedIn saw only 15.91% variance reduction on 400,000 members for volatile revenue. What the agent should do: turn CUPED on if the platform offers it and the tested audience has returning identified users; do not lower the planned sample on the strength of a vendor claim; prefer simpler aids (proportion metrics instead of raw revenue means, winsorized orders); record the actual variance reduction after the test.

**C6. Number of CTAs.** 01: many repeated CTAs are fine if they all do the same thing (7 or more "get in touch" access points on one page, including a sticky bar; lead gen). 03: "one clear call to action" on a sales-page hero, with what happens on click explained. 06: one clear conversion offer on the homepage. What the agent should do: one action per page, repeated as often as reach data justifies (hero, sticky, after proof, end); never stack different offers or destinations; treat a multi-offer hero as a hypothesis to simplify.

**C7. The 2 meanings of 100,000 monthly visitors.** 05: under about 100,000 visitors a month, run bold-change A/B tests only (10 to 20%+ effects). 06: over about 100,000 visitors a month, user-level holdouts, geo holdouts and switchbacks become possible; below, use longer holdouts or causal methods. Same number, different rules; neither is reconciled with 05's order bands or with the sample formula. What the agent should do: never quote "100,000" as a single gate; state which rule is meant; compute detectability for the specific design (P13 for tests, P19 step 1 for holdouts).

**C8. Conversion rate as "the only metric that matters" versus RPV.** 01: "the only metric that matters though is conversion rate" (lead gen, 2020; never discusses AOV, margin or RPV). 02, 03, 05, 06: RPV or contribution per visitor; conversion rate can be gamed by price cuts, traffic mix and dark patterns. What the agent should do: follow R1 and R2; use conversion rate as a stage diagnostic and as the statistical primary only when RPV cannot be powered (R6); when using 01's CLOSER audit, add AOV and margin checks the source does not have.

**C9. RPV "9 times out of 10" versus the RPV traffic penalty.** 03: optimise RPV "9 times out of 10". 02: judge tests on RPV or contribution per visitor. 05: RPV needs about 6x the traffic of conversion rate; RPV as primary is not valid at 30 to 300 orders a month and borderline at 300 to 3,000. What the agent should do: RPV is the decision lens for every readout; as the statistical primary metric use it only when powered (3,000+ orders a month, winsorized) and otherwise pre-register conversion rate primary with RPV, AOV and margin as guardrails.

**C10. Prioritisation frameworks.** 06: PIE, ICE or CIE as equals, no scales. 02: ICE, 1 to 10 x 3, multiplied. 03: PXL as described (3 of its criteria named, credited to others). 05: ICE lets idea owners inflate scores; PXL-style evidence gating plus profit-weighted expected value is preferred. What the agent should do: gate on 2 points of evidence, score with PXL-style criteria, rank by expected gross profit (R44); use ICE only for a small team building the habit and never with the idea's owner as the only scorer.

**C11. Testing cadence.** 06: "test relentlessly", at least 1 test a week (ShopClues); 03: 4 to 8 a month above 300,000 sessions. 05: below the A/B threshold, "test bigger, not more"; one bold test at a time at 30 to 300 orders. What the agent should do: cadence is an output of power and page-area overlap rules, never a target; at low volume most months are research months.

**C12. Two meanings of "sequential".** 06: "sequential A/B tests" means running tests one after another instead of multivariate. 05: "sequential" means sequential statistics (mSPRT, GAVI, group sequential) and, in a warning, sequential before-and-after comparisons that are biased. What the agent should do: write "one after another", "sequential engine" or "before-and-after" in every brief; never the bare word.

**C13. Price testing.** 03: test price points monthly with a price-testing tool (the presenter's conference sponsor; likely Intelligems). 05: never show different prices for the same SKU to different users at the same time; legal issues, disclosure rules in the EU, and brand risk (Amazon 2000); test presentation, framing, tiers, bundles and different offerings instead. What the agent should do: follow 05; run 03's offer tests (bundles, thresholds, multi-buy, gifts) through P21; if a price-test tool is used, check how it assigns and discloses prices and get legal review.

**C14. Add to cart on collection pages.** 06: Add to Cart buttons on browsing-focused category pages create decision conflict and are a listed pitfall. 03: for consumable repeat-buy products, price on the card button and add to cart from the grid was part of a $30,000-a-month winning test; "doesn't work with every single product or niche". What the agent should do: decide the page's job first (R98); test grid add-to-cart only for repeat-buy consumables with meaningful returning traffic, and read new versus returning separately.

**C15. One-page versus multi-step checkout.** 02: one-page converts "a little" better in the agency's data (not shared). 06: a marketplace switchback (12 days, hourly rotation) found the 3-page checkout raised AOV 2.1% at 98% significance and improved RPV. What the agent should do: treat it as a test, on Shopify Plus or server-side only; primary metric RPV where powered; do not change checkout structure on opinion.

**C16. Hiding delivery times.** 02: consider a 7 to 10 day split test of hiding delivery times for slow-delivery stores, noting ambiguity lowers conversion. 05 and the cards: transparency; consumer disclosure rules; 7 to 10 days is short against 02's own sample math. What the agent should do: fix delivery speed or offer fast options first; only test hiding dates with legal review and a properly sized runtime.

**C17. Deliberate form friction.** 01: adding fields to filter serious leads is valid when the free step is costly to deliver, after selling it hard (lead gen). 02, 06: cut checkout fields to essentials; every field is a chance to abandon. What the agent should do: for ecommerce checkout, cut fields (R119); 01's rule applies only to consultation, quote or sample requests that cost the brand money to fulfil.

**C18. Review volume versus relevance.** 01: volume often beats average rating (seminar exercise); build volume. 02: going from 0 to about 100 reviews roughly doubled conversion, beyond that "immeasurable"; 5 hyper-relevant reviews beat 400 generic ones. What the agent should do: below about 100 reviews, work on volume; above it, work on relevance, media and claim match; both are 1-source claims with no method.

**C19. Self-contradictions inside one source.** 02: 4 above-the-fold questions in the body, "core five" in the recap; shipping threshold stated as "10% of AOV" and "10% of total revenue"; "most CRO wins are noise" yet recommends testing shipping thresholds, delivery-time display, one-page checkout and hero framing; a 7 to 10 day test against its own 40,000-sessions-per-variant math. 03: 30 to 35% win rate is "very good" versus 13 of 135 shown. 06: speed elasticities (3.5%, 7%, "up to 7%") that cannot all be true; Baymard 65% versus 64% desktop and 63% mobile. 04: title says 2026, recording says 29 July 2024. What the agent should do: quote the stricter or better-evidenced version and note the other; never present these as settled numbers.

**C20. Ecommerce transfer of 01.** 01 is a lead-generation course; its ecommerce uses (CLOSER audit of PDPs, email-capture lures, quiz order, form-field rules, "cocktail stick" permission cues, sticky CTAs) are card-writer translations. 02, 03, 05, 06 are ecommerce-native. What the agent should do: when a rule rests on 01 alone, label it an adaptation and treat it as a hypothesis; when 01 agrees with an ecommerce source (proof beside the CTA, say what happens after the click, familiar UI), the ecommerce source carries the weight.

## 8. Common mistakes

Merged from all 7 sources, deduplicated, each with the fix.

**Metrics and diagnosis**
1. Chasing conversion rate as the north star, or comparing it across brands. Fix: RPV or contribution per visitor as the lens (R1, R2). [b9f3fede007a] [83db79dbdb65]
2. Using Shopify total sales (with tax), AOV without shipping collected, and bot-heavy Shopify sessions. Fix: P1. [91d639e7e2e2]
3. Redesigning a page because blended conversion fell, when cold share rose. Fix: P3. [953e03390b0d]
4. Judging on one metric when AOV, margin, returns or LTV can move. Fix: guardrails in every brief (R7). [c076b110d253] [dad9c85ea261]
5. Adding up individual test wins to claim programme value. Fix: programme holdout (R88, P19). [f671352f5b6e]
6. Crediting a channel with all attributed conversions. Fix: incrementality question routed to 11-ADC (P23). [ddbbe8061d10]
7. Judging popups on opt-ins alone. Fix: feature holdout on RPV (P20). [c076b110d253]
8. Fixing the PDP again when checkout completion is the leak. Fix: funnel read first (R12, R16). [25f9d85cd8e3]

**Research**
9. Testing without research, or with opinion as the only evidence. Fix: 2-point evidence gate (R20). [f856d689f3d8] [300b03fc0354]
10. No post-purchase survey. Fix: P7. [b4505f6c4061]
11. Relying on Clarity's top-line metrics that GA4 already gives. Fix: Insights block and recordings (R24). [e053644d5707]
12. Acting on an Insight percentage without watching its recordings, or ignoring a real defect because its rate is low. Fix: R25. [9d9871ee324b] [5b9da7dd1967]
13. Reading a heatmap captured behind a popup. Fix: Change screenshot (R30). [09583734387e]
14. Treating every high-click element as demand; some are confusion. Fix: recordings before moving it (R27). [3043da84ee0c]
15. Setting a recording quota, watching with distractions, or stopping review after one round. Fix: R29. [0b8d2f6cc4d1]
16. Using buyer surveys to explain non-buyers. Fix: exit survey and user tests (R31, R32). [f89dbadb9131]
17. Never buying from your own store; missing popups and cookie bars over CTAs. Fix: R36. [a2d5c573076a]
18. Paying Hotjar prices at high traffic for heatmaps Clarity gives free; paying for bundled features nobody uses. Fix: R38. [3728f5d4ae33] [6e48c0e74fe7]
19. Mixing attribution surveys with CRO research surveys. Fix: separate them (R31). [f89dbadb9131]

**Deciding what to do**
20. Testing whether to fix a bug. Fix: repair and log (R50). [3eca46fe9ba3]
21. Treating button colours, one hero image or a text snippet as CRO at low volume. Fix: big swings (R53, R54). [365c9ff30a24] [e02ace8044e5] [67f74e89d43e]
22. Testing low-traffic category pages. Fix: highest-traffic pages first. [67f74e89d43e]
23. Sending paid traffic straight to a PDP, homepage or collection; ad creative that does not match the page; all angles on one generic PDP. Fix: message-matched pre-sell page (R108). [2d977920a505] [6695665021f2] [a5cf6ee34972]
24. Letting the idea's owner score it 9/9/9; ranking by lift instead of profit; weighting by revenue instead of gross profit. Fix: R44, R45. [aad25dea9ed9]
25. Adding arms to test more ideas at once; multivariate below the traffic threshold. Fix: R56. [3b20905bfc58] [300b03fc0354]
26. Using bandits where a clean causal read is needed. Fix: R57. [3b20905bfc58]
27. Treating before-and-after as proof, or calling its problem "wider error bars". Fix: R55. [062507c94ee4]
28. Running conflicting tests on the same PDP area. Fix: R58. [4d0785cdcf2b]

**Test design and validity**
29. Using "400 conversions a month" or any magic number instead of MDE math; confusing relative and absolute lift. Fix: P13. [00c82f0de25d]
30. One-tailed tests to reach significance faster. Fix: R64. [517a8bce6324]
31. Peeking and stopping at first significance; believing Bayesian tools are immune; calling a test after 2 weeks and 100 conversions. Fix: R67, R68, P14. [e3ee87a025c5] [699a7cd5ac4c]
32. Relying on significance without power. Fix: R70. [c54652571336]
33. Stopping before a full week or before the planned sample; killing a test after one bad day; split weeks. Fix: R63, R76. [5fae1beab1ba] [7d481c590b57]
34. Launching without QA; tracking that breaks mid-test. Fix: R72, P15. [4d0785cdcf2b] [3eca46fe9ba3]
35. Ignoring SRM, flicker, bots, promo overlap. Fix: R71, R73, R74. [370ed8c02e34]
36. Letting Klaviyo or retention traffic into a test; ignoring multi-click exposure. Fix: R65. [699a7cd5ac4c]
37. Reading many metrics or slicing segments after the fact. Fix: R75. [1f26cd618e2d]
38. RPV as primary at low volume. Fix: R6. [7eeb62d20124]
39. Reading early cumulative noise as novelty or primacy. Fix: R78. [5fae1beab1ba]
40. Planning client-side checkout tests on standard Shopify. Fix: P22. [7c932a3b4986]
41. Same-SKU price tests. Fix: R129, P21. [34fa165a64fe]

**Reading and closing**
42. Reading p < 0.05 as "95% likely real". Fix: R80. [70db51ffb976]
43. Extending an inconclusive test hoping for significance. Fix: R81. [70db51ffb976]
44. Banking a micro-conversion lift without a purchase guardrail. Fix: R8. [67f74e89d43e]
45. Trusting vendor case studies, "+364%" lifts, or any number without sample, duration and baseline. Fix: P16. [370ed8c02e34]
46. Comparing win rates without their definitions. Fix: R86. [8dc46d4893e1]
47. Letting new teams or theme changes overwrite past winners. Fix: R85. [f09cfbc3ef44]
48. Shipping a blended win that hides a mobile loss. Fix: R83. [1f26cd618e2d]
49. Scaling an angle that lifts conversion and destroys LTV; dark patterns; over-claiming. Fix: R84. [dad9c85ea261]
50. Not re-checking recordings, the funnel step and surveys after shipping. Fix: R89. [0b8d2f6cc4d1]

**Page-level (hypothesis material; execution in 07-LPG)**
51. Default Shopify PDP that fails the 4 hero questions; generic title; no scroll cue; pickers in the hero. Fix: R101. [bb761687ad68]
52. Feature-led copy; table stakes in the hero; generic FAQs; big blocks of feature text before add to cart. Fix: R106, R107. [790f6b3372c2] [499b4e67252a] [edd07a1a15f6] [116d1016fa3b]
53. No reviews; text-only review walls; wall of 5.0; reviews bunched on the same dates; hidden proof on About pages. Fix: R104. [a507cc86ec03] [e18bae3af3dd] [e24c4415d85e] [ba8350548af5]
54. Generic trust badges as the only proof (see C1). [cdd5df001439]
55. Hero that does not say who, what, why in 3 to 5 seconds; vague headline; quirky navigation; directory-style menus. Fix: R96, R97. [bc5a8130eee9] [d4484bf96e29] [f5942adec72b]
56. Key selling points, guarantee or reviews placed where 6 to 30% of visitors reach. Fix: R27. [9568c40e1d88] [bc5a8130eee9]
57. Elements styled like buttons that do nothing; logo that does not go home; images that do not open. Fix: repair (R26). [9568c40e1d88] [0eae610ddc62]
58. Popups in the first 5 seconds; chat widgets over add to cart; cookie bars over the cart button. Fix: repair (R111). [9d9871ee324b] [a2d5c573076a]
59. Carousel dots instead of thumbnails; a gallery that does not sell; a collapsed guarantee for a risk-averse audience. Fix: R102. [116d1016fa3b]
60. Discount box in cart with no live promo. Fix: R112. [19e8c5c27387]
61. Collection hero banners that push products below the fold; labelling every product; filters only at the top; Add to Cart on browsing pages (C14). Fix: R98, R99. [6f635b9d003d] [1e03a58f6fe1] [11e64288067b]
62. Surprise checkout costs; drip pricing; forced accounts; long forms; no express pay; hidden returns; unlabelled tax. Fix: R116 to R120. [3163cc34fa79] [d4104b13110f] [8b2d9df04dfb]
63. Rushing into free returns in fashion. Fix: R120. [1e401776f34b]
64. Lazy blanket discounting; free shipping with no threshold or too low a threshold. Fix: R131. [1e7c5456a957] [23f840cd83b0]
65. Optimising desktop first; desktop grids on mobile; filters hidden in a hamburger. Fix: R124. [a56c27356031] [1e03a58f6fe1]
66. Slow mobile pages left unmeasured. Fix: R125, 08-SPD. [9461d45dfbe7]
67. Generic pages for AI-referred visitors who arrive pre-sold. Fix: 5.4 row. [86c233f0eb39]
68. Promo messaging that changes between collection and PDP. Fix: R100. [1e03a58f6fe1]
69. "Contact us" or "Subscribe" CTAs with no lure; asking for fields you will not use; contact details before the diagnostic questions; leaving the after-click process unexplained (01, lead-gen adaptations). Fix: R126 to R128. [ea8b1b83867d] [4ae56138baa5] [9ed6a0a32b9f] [16c2667cb67c]
70. False scarcity and inflated social proof ("only Y left") not backed by real data. Fix: real data only. [e18bae3af3dd]

## 9. Deliverables

What the agent produces, and the format.

1. **Funnel diagnosis memo.** Corrected metrics (P1), stage rates by device and channel against the 06 bands, the biggest weighted leak, mix-effect check (P3), tracking health, what is unknown. 1 page plus a table. `[needs brand data]` items listed at the end.
2. **Research findings log.** One row per finding: source (recording, heatmap, survey, review mining, user test, self-purchase), page, device, what was seen, how many sessions or answers, classification (R26), evidence strength. Links or ids to recordings.
3. **Page audit report.** The section 5 checklist for the page type, filled in with good, bad, fix, and the evidence behind each bad row. Repairs separated from hypotheses.
4. **PDP, cart and checkout test backlog (leaderboard).** Spreadsheet: id, hypothesis in R42 form, page, device, evidence points, PXL-style criteria, P(win), expected lift, gross profit per conversion, traffic exposed, build cost, expected value, ceiling, status. Sorted by expected value.
5. **Repair list.** What is broken, evidence, fix, owner, verification plan. Logged in the registry.
6. **Test brief (pre-registration).** The P10 fields, including MDE, sample per variant, arms, dates, engine and stopping rule, guardrails with thresholds, segments, contamination plan, validity plan, and pre-written actions for win, loss and inconclusive.
7. **QA and launch checklist.** P15 steps with pass or fail and dates; SRM values per look.
8. **Test readout.** Effect with confidence interval per metric and pre-registered segment, guardrail results, daily plot note, validity audit (P16) outcome, decision, learning, next hypothesis.
9. **Registry record.** The P18 fields, one per test, repair, holdout or causal analysis, in one log shared with 06-MEA and 11-ADC.
10. **Live-winner register.** Shipped winners, ship date, last verified live, any reversion.
11. **Holdout plan and readout.** Question, design (P19 or P20), groups and shares, detectability calculation, period, net lift with interval, decision, ethics note on what was not withheld.
12. **Test vs holdout routing note.** For any question that is not an on-site test: the route from P23 and the folder that owns it.
13. **Programme review.** Tests run, win rate with definition, net lift from holdout if one exists, winners still live, learnings, what needs brand data or a web check next.

Format rules for all deliverables: short sentences, digits, no em dashes, no invented claims; every number carries its source or "brand data"; case figures from the sources are labelled examples; nothing that mentions GPT or .env on client-facing pages.

## 10. What needs live data or a web check

### 10.1 Needs brand data

Metrics and baselines
- `[needs brand data: current conversion rate, CPC, AOV and margin by channel]` (01, R11)
- `[needs brand data: RPV and contribution per visitor by channel and device]` (02, R1)
- `[needs brand data: GA4 vs Shopify session gap]` (02, R3, P1)
- `[needs brand data: cold vs warm conversion rates]` (02, R15, P3)
- `[needs brand data: monthly sessions and orders]` (03, R53)
- `[needs brand data: orders per month, conversion rate, traffic per page]` (05, R53)
- `[needs brand data: baseline conversion rate per page and device]` (05, R59, P13)
- `[needs brand data: weekly sessions on the tested page]` (05, R62, P13)
- `[needs brand data: stage conversion rates by device and channel]` (06, R12, P2)
- `[needs brand data: funnel step drop-off]` (03, R12)
- `[needs brand data: guardrail baselines: AOV, margin, return and refund rate, page load, add to cart]` (05, P10)
- `[needs brand data: SKU margin, page traffic]` (05, R44, P11)
- `[needs brand data: device split]` (04, R30, R124)
- `[needs brand data: monthly visitors, logged-in share, geo split]` (06, R91, P19)
- `[needs brand data: daily sessions, normal and peak]` (07, R38)

Research inputs
- `[needs brand data: scroll reach per section from the scroll map]` and `[needs brand data: own scroll reach and CTA click share by page and device]` (04, R27, P5)
- `[needs brand data: PDP scroll depth and rage clicks]` (03, R21)
- `[needs brand data: post-purchase survey answers]` (03, R31, P7)
- `[needs brand data: review export]` and `[needs brand data: review count, media-review share]` (03, 02, R34, R104, P8)
- `[needs brand data: top 3 first-step fears from support tickets and reviews]` (01, R107)
- `[needs brand data: credibility asset inventory]` (01, section 2)
- `[needs brand data: which pages get direct entrances]` (01, R19)
- `[needs brand data: AI referral sessions]` (06, 5.4)

Offers, checkout and acquisition
- `[needs brand data: checkout extra costs as % of AOV]` (02, R116)
- `[needs brand data: fulfilment cost per order for bundle pricing]` and `[needs brand data: typical cart value]` (02, R114)
- `[needs brand data: active ad concepts by persona, offer, angle]` (02, R108)
- `[needs brand data: returns and LTV by acquisition angle]` (02, R84)

Programme memory
- `[needs brand data: past test log and which winners are still live]` (03, R85, R87)
- Repair log (05, R50)

### 10.2 Web checks

Platform and tools
- `[web check: current Shopify checkout extensibility and A/B testing options, yearly]` and `[web check: Shopify Rollouts availability, plan tier, checkout A/B options]` (05, R123, R132, R133, P22)
- `[web check: vendor stats engine docs]` for VWO, AB Tasty, Convert, Kameleoon, Optimizely, GrowthBook, Statsig, Eppo (05, R68, R69, P14)
- `[web check: current VWO free tier]` and `[web check: current Statsig free tier]` (05, R134)
- `[web check: current Clarity, Hotjar, Userbrain and Okendo pricing and limits]` (07, R38)
- `[web check: Clarity current terms]`, `[web check: current Clarity install, consent and data retention terms]` (04, 07)
- `[web check: Okendo plan and limits]`, `[web check: Userbrain pricing]`, `[web check: Hotjar pricing]` (07)
- `[web check: heatmap.com current features and pricing]` (03, R28)
- `[web check: tool name]` for the price-testing tool 03 calls "Intelligence" (likely Intelligems) (03, P21)
- `[web check: PXL framework criteria]` (03, 05, R45)
- `[web check: current status of ResponseTap, Live Call, Tawk.to, Leadpages, Delighted]` and their pricing (01; call tracking and chat tools are outside this folder's core)
- `[web check: original HubSpot form-field study and conditions]` (01, R119)

Benchmarks and research
- `[web check: current Baymard abandonment figures]` (02, 06, R16, R116)
- `[web check: current AI referral share and behaviour]` (06, 5.4)

Legal and compliance
- `[web check: incentivised-review rules in the brand's markets]` (02, R104)
- `[web check: review and endorsement rules for the brand's market]` (01, R104)
- `[web check: prize-draw and data-privacy rules]` (03, R33, P7)
- `[web check: jurisdiction rules on personalised pricing and disclosure]` (05, R129, P21)
- `[web check: delivery disclosure rules]` (02, R122)
- `[web check: consent and data-retention terms]` for behaviour tools (07)

### 10.3 Verify UI

Every step marked `[verify UI]`: Clarity dashboard, Insights, Heatmaps (Change screenshot, Clicks, Scroll, Area, Edit areas), Recordings (Filters, Sort, Skip inactivity, speed) (04, interface of July 2024); Hotjar Engagement zones, Surveys, User interviews, Funnels (07); GA4 Explore funnels (07); Shopify analytics fields, customer-account setting, express checkout placement, checkout extensibility, Rollouts (02, 05); review app media-first sorting (02); survey apps (KnoCommerce, Okendo, Typeform) (03, 07); Klaviyo flows and campaign exclusion (02); Meta ad-set or campaign split (02, 11-ADC); speed tools (Chrome UX Report, Shopify Web Performance, PageSpeed Insights) (06, 08-SPD).

## 11. Freshness and stale-risk notes

| item | why it goes stale | re-verify | rules affected |
|---|---|---|---|
| Microsoft Clarity interface | 04's walkthrough was recorded 29 July 2024 despite a 2026 title; Insights, Smart events, Area maps, Change screenshot, Edit areas, Skip inactivity, sort options may have moved or been renamed | before each P4 to P6 run; at least every 6 months | R24, R29, R30, P4, P5, P6 |
| Clarity "free, no data limit" | stated "at the time of this recording" (07, undated) | before any tool decision | R38 |
| Hotjar pricing | Plus at $32 a month for 100 daily sessions; surveys paid separately; user interviews "newer feature" (07, undated) | before any budget; yearly | R38, P7 |
| Userbrain $40 per tester; Okendo unlimited responses | undated vendor quotes (07) | before any budget | R35, R38, P7, P9 |
| Shopify checkout A/B limits | 05 flags the position "as of late 2025" and says re-verify yearly; checkout extensibility rolled out August 2024; Rollouts plan tier and features | yearly, and before any checkout test plan | R123, R132, R133, P22 |
| Testing vendor engines and free tiers | VWO 50,000 tested users a month; Statsig 1M events a month; Optimizely CUPED default; Kameleoon SRM threshold (05, 2025 to 2026) | before each brief; yearly | R68, R69, R134, P14 |
| Google Optimize | sunset 30 September 2023; do not plan on it | none | R134 |
| Baymard figures | 70.22% updated 22 Sep 2025; abandonment reasons quoted from memory by 02 and 06 | yearly | R16, R116 |
| 03's 300,000-session line | described as a recent internal update driven by iOS 14 tracking loss and rising CPMs "in the last 6 to 12 months" (2025) | yearly | R53 |
| 05's order bands | author synthesis on 2 to 3% conversion and anonymous traffic; not eligibility gates | recompute per brand each time | R53 |
| 01's tools and prices | ResponseTap about £250 a month, Live Call $49 or $59, Tawk.to free, Leadpages about £60, Delighted; all 2020; Skype named | before any use; likely changed or closed | none core to this folder |
| AI-referred traffic figures | +4,700% year over year Jul 2024 to Jul 2025; Shopify conversion and spend claims (06) | quarterly | 5.4 row |
| Review-incentive, prize-draw, personalised-pricing and delivery-disclosure rules | vary by market and change | before each affected test | R33, R104, R122, R129 |
| Speed metrics | INP replaced FID in 2024; elasticities in 06 are unsourced | 08-SPD owns | R125 |
| Case results | all monthly revenue and lift figures are agency or vendor claims from 2019 to 2025 with no sample, duration or confidence | never treat as current or transferable | R77, P16 |

24 Sep 2026: ecommerce specificity pass applied from ECOM_REVIEW.md; priority block added, 14 rules reworded, 8 levers added, about 490 words moved to Appendix A.

## 12. Source index

| no. | title | type | credibility and bias | contributed most |
|---|---|---|---|---|
| 01 | COMPLETE Revenue-increasing CRO Course (Exposure Ninja) | course, video transcript, 2020, 38 cards | UK marketing agency lead selling done-for-you marketing and a free review. Evidence: own client sites (PPI claims, exhibition stands, surveys company), 1 third-party split test (ADT, no sample), 1 HubSpot form study, seminar exercises. No sample sizes, durations or significance anywhere. Built for lead generation and service businesses; ecommerce is asides and 1 teardown (Shark Proof). Ecommerce uses in the cards are the card writers' adaptations. Calls conversion rate "the only metric that matters". Credibility: low for ecommerce testing; moderate as a qualitative audit frame. | CLOSER audit frame (credibility, lure, objection handling, social proof, ease, result); objections to the first step; say what happens after the click; proof beside the CTA; familiar UI; menu as guide; form-field trade-offs; email-capture lures; quiz order. |
| 02 | eCommerce CRO Masterclass 2026: The Full System | talk, whiteboard and screen share, 47 cards | Unnamed performance-marketing agency lead auditing DTC brands (pitch: free audit for brands over $10M). Evidence: client data, "internal model", own 2019 to 2020 store tests (shipping, reviews), Baymard as cited, mockups. No sample sizes for own findings. Openly sceptical of CRO agencies and micro-testing, which is also a positioning. Some self-contradictions (C19). Credibility: moderate; strongest on metric framing, message match and checkout economics; thin on statistics. | RPV and contribution per visitor; conversion rate as output; CAC leverage; mix diagnosis before redesign; clarity, copy, offer, proof, friction order; 4 hero questions; message match; reviews 0 to 100; trust badges do nothing; checkout extras under 10% of AOV; contamination from Klaviyo and multi-click; ~1,000 conversions per variant; test only big swings; LTV guardrail. |
| 03 | Conversion Rate Optimization Framework Revealed (Conversion Wise, hosted by Ezra Firestone) | talk, live webinar, 2025, 35 cards | Co-founder of a Shopify CRO agency (3,500+ brands, "thousands" of tests claimed). Host is a paying client who sells Zipify; partner (heatmap.com) and sponsor (price-testing tool) disclosed. Evidence: client cases with monthly revenue claims, no sample, duration or confidence; combined-change results. Win-rate claim (30 to 35%) contradicts its own showcase (13 of 135). Credibility: moderate on research method and test hygiene; low on case numbers; commercial bias high. | 300,000-session model split; big-swings list; non-negotiables (funnel, PDP heatmap, false clicks, post-purchase survey, review mining); "what almost stopped you"; hypothesis = change, outcome, rationale; PXL as described; 2 to 4 weeks, each weekday twice; no conflicting tests; QA 2 to 3 times; protect winners; mega menu, PDP, cart coupon, collection, listicle, cart gamification, multi-buy cases. |
| 04 | Microsoft Clarity COMPLETE Tutorial in 2026 | transcript, YouTube tutorial, recorded July 2024, 11 cards | Unnamed CRO agency presenter selling a free audit. Evidence: client audits and Clarity's demo account; no results, no statistics. Benchmarks (1 to 2% rage clicks, 5 to 7% CTA click share, 60% never scroll past the top) are unsourced heuristics. Many examples are SaaS or B2B. Credibility: moderate as a tool method; low for any number. | Insights block method; rage, dead, excessive scroll, quick back classification; click, scroll and Area map reading; scroll checkpoints; recording selection, sorting, stopping rule and 1 to 2 hour blocks; core-action-first principle; turn a finding into a hypothesis; post-ship recheck. |
| 05 | CRO as testing and experimentation for DTC ecommerce | article, synthesised research brief with tiered sources, 2025 to 2026, 19 cards | Unnamed author; not first-hand practice; sells nothing. Almost every statistical claim ties to a named primary source (Kohavi, Tang and Xu 2020; Evan Miller 2010, 2015; Johari et al.; Spotify, Etsy, LinkedIn engineering; CUPED paper; Baymard; vendor docs). Rejects unsourced win rates and vendor case studies. Order-volume bands are the author's own synthesis. Credibility: highest in the folder for statistics and discipline; moderate for the bands; some 2026 SEO posts used only for tooling facts. | Repair vs test; MDE formula and sample table; conversions per variant; two-tailed default; peeking and sequential engines; Bayesian caveat; runtime rule; novelty; before-and-after bias; SRM, flicker, bots, promo overlap; Twyman's law; metric choice and RPV penalty; guardrails and pre-registered segments; CI over p-values; inconclusive as a result; experiment log; win-rate benchmarks with definitions; Shopify checkout limits; price-test ethics; order bands; prioritisation frames and expected value. |
| 06 | CRO fundamentals (holdouts, incrementality, causal inference; ecommerce CRO deep research) | article, 2 AI-style deep-research reports, 2025 to 2026, 19 cards | No author; reads as an LLM research output. Most numbers name a source loosely (Baymard, IAB, Shopify, Columbia) with no links, samples or dates; several illustrations presented next to real cases; case table is vendor and agency claims. Internal contradictions (speed elasticities, Baymard percentages). "60%+ win rate" and "CUPED is free sensitivity" conflict with 05. Credibility: low to moderate; useful as a checklist and a map of measurement designs; every benchmark directional. Header labels it 06-MEA; speed, recovery flows and channel incrementality belong to neighbours. | Measurement design picker; programme and feature holdouts; winners do not add up; net revenue over engagement; funnel stage bands; page-type checklists (home, category, PDP, cart, checkout, mobile); checkout priorities; guest checkout; local payment methods; mobile targets (44px, LCP under 2 s); AI-referred visitors; causal-learning log. |
| 07 | HotJar vs Microsoft Clarity: Which is Better For Your Website? | transcript, YouTube comparison, undated, 8 cards | Unnamed CRO and web design firm (clients 300,000 to 400,000 visitors a month) migrating clients to Clarity for cost; sells services, not tools. Evidence: 1 Area map finding and 1 test result (18% lift) with no statistics; vendor prices at recording time. Credibility: moderate for tool comparison; low for the result. | Clarity vs Hotjar feature comparison; cost at real traffic; unbundled stack (Clarity, Okendo, Userbrain, GA4 Explore); high-click low-reach pattern; exit and post-purchase survey questions; task-based user tests; GA4 Explore funnels. |

**Neighbour folders and what lives there**

- 06-MEA (measurement): GA4 event setup, funnel configuration, tracking QA, attribution, attribution-style post-purchase surveys, difference-in-differences, BSTS, synthetic control, propensity matching, instrumental variables, regression discontinuity. 05 and 06 carry this header label.
- 07-LPG (landing pages): page design, copy rewrites, hero and gallery builds, landing-page formats (listicle, advertorial, VSL page), offer construction detail, FAQ writing. 02 was originally tagged for 07-LPG. This folder's 3.10 rules seed hypotheses only.
- 08-SPD (speed): LCP, INP, image and script work, real-user monitoring. 06's speed section belongs there.
- 11-ADC (ad channels): Meta ad-set or campaign splits for page tests, retargeting and geo holdouts, platform lift studies, on/off tests, ad metrics.
- 14-EML (email and retention): cart-recovery email and SMS flows, list holdouts, campaign incrementality. 06's recovery section belongs there.
- 20-FIN (finance): contribution margin definitions, LTGP:CAC, unit economics beyond gross margin.
- 24-DEP (ad deployment) and 12-GAD (Google Ads): not referenced by these sources.

## Appendix A. General background

Content moved here on 24 Sep 2026 during the ecommerce specificity pass. This is generic statistics, vendor detail or framework history that every rule already routes to its operating line; nothing here changes a rule's condition, source or card id. Each entry names the rule it was cut from.

**From R94 and P23 (measurement design).** Every causal method needs a stated, checkable assumption before its output is trusted: parallel trends (difference-in-differences), a valid threshold (regression discontinuity), no unobserved confounding (propensity matching), pre-period similarity (synthetic control; 06's Hourglass geo example matched markets at 0.96 to 0.99 correlation). These are specialist methods that live in 06-MEA and 11-ADC; this folder only routes the question (R94, P23) and never runs them itself.

**From R67 and R68 (validity checks).** The peeking-simulation study history behind "do not peek": Evan Miller's calculation that checking after every observation and stopping at the first p < 0.05 turns a nominal 5% false-positive rate into 26.1% in the worst case; Kohavi and Sonnet's estimate that running a test for 2 weeks and then checking daily for 2 more weeks turns it into about 17%; Etsy's simulation finding over 50% chance of a false difference after 500 observations; Molas's 2025 simulation finding that peeking every 100 observations and stopping a Bayesian test at P(A > B) > 0.95 gives about an 80% false-positive rate. The operating rule stays in R67 and R68: do not peek, use a validated sequential engine, and treat an unstated Bayesian prior as a peeked frequentist test.

**From R45 (prioritisation).** The scoring-framework comparison: ICE (Impact, Confidence, Ease, 1 to 10 each, multiply or average) is fast but subjective, since whoever pitches the idea scores it and everything becomes 9/9/9 (05). PIE (Potential, Importance, Ease) forces a look at page traffic. PXL (about 10 to 14 evidence-tied, mostly yes-or-no criteria: above the fold, noticeable within 5 seconds, high-traffic page, backed by heatmaps, user tests, surveys or analytics, build difficulty) is least subjective and slowest, best for mature programmes. RICE suits audiences that vary a lot in size. CIE is named by 06 with no scale. The chosen method stays in R45 and R44: PXL-style evidence gating plus profit-weighted ranking is the default; ICE only for a small team building the habit.

**From R86 (win rates).** The tech-platform win-rate roll call behind 05's 10 to 20% anchor: Microsoft about 33% in 2009; Bing about 15%; Google Ads, Booking and Netflix about 10%; Airbnb Search about 8%; Optimizely 12% on primary metric across 127,000 experiments; VWO about 14%; CXL/Convert about 20%. Most of these are not DTC ecommerce stores. The ecommerce-agency figures (DRIP, ConversionTeam) and the 10 to 20% anchor stay in R86.

**From R134 (testing vendors).** The full stats-engine vendor roster named by 05 (all time-sensitive; confirm current status before use): VWO SmartStats (Bayesian; free up to 50,000 tested users a month), AB Tasty (Bayesian), Convert, Kameleoon (SRM flag at p < 0.001), Optimizely Web (mSPRT always-valid plus FDR; CUPED default on), GrowthBook (open source; frequentist and Bayesian; sequential; CUPED), Statsig (corrected-alpha sequential; free up to 1M events a month), Eppo (Bayesian with shrinkage plus GAVI). The operating line stays in R134: confirm the vendor's engine, prior, SRM alerting and free tier before committing.
