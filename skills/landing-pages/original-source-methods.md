# Original CRO documents: operational methods and corrections

These methods were checked against the complete main-document paragraph text of the four original DOCX files in `skills/`, not inferred from the existing checklist JSON. They preserve the source's useful coverage while distinguishing observations, proposed tests and facts the brand must actually supply. Source counts below describe the supplied files, not independently proven conversion factors.

## PDP product page audit: all seven original checklist groups

Source: `skills/Product Page Checklist (PDP).docx`, 47 XML paragraphs, 2,528 extracted text characters, 28 checkbox items across seven groups. The earlier references table called this 27; the actual supplied document has 28.

1. Images/media: inspect whether the first product view explains use; look for a genuine product demonstration, real customer footage or founder explanation where available; check front, back, detail and in-use coverage; judge generic supplier-looking imagery against the actual brand and product. The absence of a video is a possible content opportunity, not proof of poor conversion. Do not fabricate a customer or founder to fill the slot.
2. Copy/description: check whether the headline expresses a supported buyer outcome, first-screen wording is scannable, the description connects the product to the problem, technical specifications supplement rather than overwhelm the explanation, and product identity plus price are readily discoverable. Do not remove necessary specs or an identity heading merely to satisfy a headline formula.
3. CTA: inspect mobile purchase-button visibility, contrast, tap size and visible one-time/subscription choices where subscriptions exist. Test the actual selected variant, availability and purchase destination. An attractive button with an invalid purchase route fails the interaction check.
4. Proof: inspect the position of the brand's actual rating/count, accessible review content, genuine customer images, and proof near relevant claims throughout the page. Verify provenance and whether review content loads. No supplied rating means a missing-evidence opportunity, not permission to invent a star row.
5. Shipping/returns: look for the real free-shipping threshold, returns terms and risk reversal near the price and purchase action, with relevant shipping/returns facts accessible without hunting in a footer. A store with paid shipping can be clear and trustworthy; free shipping is not mandatory. Separate delivery time, dispatch time, costs, return window and who pays return postage.
6. Trust: check relevant genuine certifications or guarantees, actual press mentions where available, and explanations of ingredients/materials/sourcing. Generic security seals do not compensate for unsupported claims. Do not add a press strip or badge merely because the checklist names one.
7. Mobile: inspect readability without zooming, usable first-screen hierarchy, measured loading behavior, sticky purchase controls where useful and supported express-payment choices. Do not cram the entire page into one viewport to meet the source's literal wording. Its under-three-seconds target is a heuristic; state the actual measured metric and conditions. Sticky controls must not obscure page content or consent controls.

Output each applicable check as observed pass, observed issue, unknown evidence or not applicable. Record exact viewport and section evidence; explain the buyer consequence before recommending a change. Avoid a raw checkbox percentage presented as conversion potential.

## Shopify checkout, shipping and performance audit: actual settings in the original

Source: `skills/Shopify CRO Checklist - 30 Settings.docx`, 21 XML paragraphs, 672 extracted text characters. Despite its title, the supplied file contains 15 checkboxes: six checkout, three shipping/pricing, three speed and three post-purchase. Do not claim the other fifteen were supplied or audited.

Checkout items are guest checkout, Shop Pay, Apple/Google wallets, express-payment placement, appropriate tipping settings and gift-card fulfillment. A public screenshot cannot verify administrative configuration, payment eligibility, fulfillment automation or every market's wallet support. Mark inaccessible configuration as unverified and specify the evidence needed; never infer that a setting is disabled just because a control is absent in one session.

Shipping/pricing checks are visible product-page shipping rates, a visible free-shipping threshold when the brand offers one, and clear product-page returns. Speed checks are unused-app review, optimized images and the source's old theme-speed-score target above 50. Do not reuse that score threshold as a current platform guarantee; assess the actual performance measurement used by the current store. An app inventory and observed load cost are needed before recommending removal.

Post-purchase checks are relevant upsell/cross-sell, a survey and referral opportunity. These are optional product- and business-specific tests, not universal requirements. Checkout and post-purchase changes can depend on Shopify capabilities and merchant configuration. The CRO app should export supported page code and explain integration requirements, not pretend its HTML can replace restricted checkout surfaces.

## Awareness routing: five buyer segments, five different page jobs

Source: `skills/5 Buyer Segments For Creative & CRO.docx`, 35 XML paragraphs, 1,625 extracted text characters. Read awareness from the actual entry message and buyer knowledge; engagement alone does not prove a person's stage.

- Unaware: begin with a relevant situation or story that makes the problem intelligible. A narrative or educational entry can fit; curiosity must pay off honestly.
- Problem-aware: explain the problem and available ways to solve it. Help the visitor understand why the product category matters before requiring a purchase decision.
- Solution-aware: clarify mechanism, approach and trade-offs with supported comparison. Avoid a generic feature pile and unsupported competitor claims.
- Product-aware: answer the remaining doubts about this brand/product with appropriate proof, fit, FAQs, demonstration and transparent terms.
- Most-aware: make the actual product/variant, offer, price, delivery and purchase action straightforward. A made-up discount or deadline is not required.

The document's example customer count, discount and 24-hour deadline are illustrative copy forms, not brand facts. A quiz may discover needs or prior experience, but does not diagnose an exact awareness stage. Homepage, PDP, comparison and advertorial routes should continue the incoming message rather than mechanically force each stage into one template.

## Landing structure and interactive reassurance from the original must-haves

Source: `skills/Must-Haves and Best Practices.docx`, 67 XML paragraphs, 5,339 extracted text characters. Its main mechanisms are consistent post-click brand experience, one clear angle, supported benefit plus product explanation, transparent price/payment, relevant proof, reassurance near action, interactive help and continuity into follow-up.

Use real founder demonstrations, meaningful variant/gallery controls and relevant FAQ responses where they reduce uncertainty. Repetition should reinforce the main argument without clutter. Explain both what the product is and why its specifications matter. Offer a complementary item only where it fits the purchase; never insert an automatic charge. Show a discount reminder only if the corresponding code or automatic discount is actually applied.

The source's popularity counters, 24-hour shipping promise, 15% bundle saving, $1-per-day framing and $100 BNPL threshold are examples or heuristics. They do not authorize those claims for the active brand. Installing every named pixel is not a CRO default; scripts have performance and consent consequences and are a separate merchant integration. Do not add trackers while cloning a page. The current local quiz intentionally sends no answer data.

## Quiz fit, branching and result quality

Sources: full detailed guides `deep-landing-lpg23-purposeful-quiz`, `deep-landing-lpg23-quiz-dropoff`, `deep-landing-lpg18-quiz-throughput`, `deep-landing-lpg17-dynamic-summary` and `deep-landing-lpg18-quiz-research`; original quiz-result mock-up pattern in the CRO audit AFTER pipeline. The runtime supports a bounded product finder, not a medical consultation or an inferred diagnosis.

Give every question a declared purpose: necessary fit constraint, useful preference, supported education or a purchase objection. Start with a noninvasive practical question. Answers must affect routing, product fit or the explanation; do not present a fixed generic offer as individually diagnosed. Use explicit product exclusions for hard incompatibilities, not merely a negative score that later preferences can outweigh. Recommended products, URLs and claims must belong to the active brand catalog.

The current renderer supports one to eight single-choice questions, two to five options, weighted own-product recommendations and explicit branches. Validate unique IDs, all reachable questions, valid targets and an acyclic route to results. Null/omitted routing means the next sequential question; `end` means results. Only answers on the active route contribute. Show an honest no-match response if all products are excluded or insufficiently supported. Expose ties and compare alternatives instead of pretending a unique result exists.

Use native radio controls, fieldsets/legends, visible focus, Back and Restart, meaningful progress and a result summary of the visitor's actual answers. Reversing an answer must recompute the route and result. Keep answers in memory only; no hidden email gate, tracking call, local storage or answer transmission. The product link is an explicit next action. HTML and Shopify use the same trusted runtime; the model supplies data, not executable JavaScript.

A future measured quiz needs starts, each step's entrants/advances, result views, optional contact gate and purchases as distinct events. Local drop-off uses that step's entrants as denominator. Evaluate contribution and orders per original entrant, including wrong-fit returns; higher result-page conversion alone can conceal worse total performance. Historical completion percentages and preferred question counts are heuristics, not success criteria. No telemetry is collected by the current export, so it must not display invented completion or conversion results.

## Editorial, advertorial and Shopify design details

Sources: full `five-reasons-lp-pro/five-reasons-lp-pro/SKILL.md` and `advertorial-v1/advertorial-v1/SKILL.md`. Preserve their transferable mechanics rather than their mandatory two-layout choice. An editorial page can use a deliberate type hierarchy, alternating compositions, evidence alongside reasons and a complete offer. A modern DTC page can use concise numbered arguments, a product gallery, an itemized real bundle and contextual sticky purchase controls. Each reason supports one angle; a repeated benefit is not a new reason.

The advertorial sequence is a recognizable problem, prior approaches, a supported explanation, the product as a relevant option, evidence, complete terms and remaining objections. Explain the product before aggressive purchase repetition. Show an advertising label and the true author/brand. Do not invent a root cause to make a mechanism seem inevitable. A durable-product offer must not inherit a supplement subscription or arbitrary three-pack.

Keep images and copy editable. Check gallery thumbnail/source alignment, sticky controls at hero/footer boundaries, FAQ and offer selection, and clipped overlapping art. Shopify needs scoped per-instance CSS/JS, merchant-selectable products, live price/availability, editable block settings, valid schema and a matching JSON template. Font, media and installation requirements are part of the handoff. A renamed HTML file is not a Liquid integration.

## Corrections and conflicts found during full source reading

Source: `cro-brain/cro-brain/reference/cro-brain-master.md`, sections 0–14, including pricing section 6 and shipping section 7. Preserve the source archive but do not copy these defective examples into a brand recommendation.

- Bundle arithmetic: a $60 item with 60% gross margin implies $24 item cost. Three items sold for $120 cost $72 and leave $48 gross profit before other costs, not the source's $72 profit. Compare contribution per transaction and visitor, including changed units and costs; higher AOV is not automatically higher margin percentage.
- Threshold arithmetic: a $150 free-shipping threshold above a $115 modal cart value is a $35 difference, about 30.4% of $115. The source's $13/15% gap is inconsistent. Use the real cart-value distribution, shipping cost, margin and product increments to test a threshold; neither mean nor mode alone determines the optimum.
- Cart-drawer-only, automatic sticky CTAs, a fixed minimum review count, universal discounts, fixed click counts and claims that a video always outperforms a still are tactics or source assertions. They are not universal pass/fail rules for every store.
- Price points, rush-processing percentages, post-purchase timing and order-volume/sample-size thresholds are rules of thumb unless the actual metric, test assumptions and brand economics support them. Do not transfer source test results as predicted lift.

These corrections govern shorter source-derived recommendations. Arithmetic belongs in code using actual brand inputs. A section that cannot be evaluated remains unknown, and a product that does not need a tactic can be not applicable.
