# References library for landing pages

## CRO workspace integration

`app-contract.md` defines the capture, audit, plan, section generation, browser QA and export contracts. `src/lib/landing/knowledge.ts` indexes the merged Landing Pages Learning category plus landing/CRO/speed cards, ideas and playbook passages. It retrieves complete selected guidance within a bounded prompt, preserves provenance and caveats, and exposes an inventory. See `docs/landing-pages/cro-knowledge.md` for verified counts, prior reading-evidence limits and retrieval behavior. This new retrieval is separate from the older fixed-section word writer described below; a caller must explicitly use it.

Everything the Landing pages module draws on, where it lives, and when it is used. The app reads the files named here; nothing is copied into code.

## 1. This skill

| File | What | Used by |
|---|---|---|
| `SKILL.md` | The method: measure RPV, fix in order (clarity, copy, offer, proof, friction), continuity with the ad, testing honestly | People; the CRO screen's explanations |
| `CARD.md` | The same rules for a writer step | The page writer (`lp_write`) |
| `kinds/pdp.md`, `kinds/listicle.md`, `kinds/advertorial.md` | The rules of 1 page type: what the first screen holds, what goes where, what changes by kind of product | The page writer, on top of the card (`kindCard` in `src/lib/landing/write.ts`) |
| `structure.md` | Ecommerce page structures from the ThrillX Figma file (product landing page, homepage), mapped to builder sections | The page builder's section order |
| `copy-formulas.md` | ThrillX copy prompts as rules: headline, sub-headline, PAS, value props, CTA | The page writer; the free draft writer's patterns |
| `checklist.json` | Every check the app runs on a page, with its id, area, source and test | `src/lib/landing/checks.ts`, the CRO audit |

Pictures of the 4 ThrillX wireframes (product page and homepage, desktop and mobile) and the Figma file's thumbnail are in `docs/landing-pages/wireframes/` (kept outside `skills/` because images there are not committed).

## 2. Other skills in this folder

| Skill | What it gives the module | Where |
|---|---|---|
| `cro-brain` (`reference/cro-brain-master.md`) | The DTC CRO knowledge base: must-haves, page-by-page playbook (homepage, collection, PDP, cart drawer, checkout, landing pages and listicles, post-purchase), the 40 tips, AOV and the mode-based free-shipping threshold, prioritisation, and the swipe library of about 380 brands by niche | CRO audit rules; the References screen's swipe library (section 15) |
| `cro-audit` | The live audit pipeline: 8 mandatory surfaces with 2 to 3 tests each, real 9:16 screenshots as the "before" (never generated), hypotheses "Test X: change Y because Z, expected to lift M" | The CRO audit's surfaces and hypothesis format; the URL capture's mobile screenshot |
| `five-reasons-lp-pro` | "5 reasons why" listicle in 2 designs (Editorial, Advertorial/Modern DTC), 4 headline formulas (Switch, Gift, Revelation, Better alternative), the Shopify Liquid export pattern | The listicle page type; the export pattern for later |
| `five-reasons-lp` | The single-design version. Superseded by `five-reasons-lp-pro`; kept for its template | Reference |
| `advertorial-v1` | Long-form narrative advertorial: problem, failed alternatives, the cause, the product. Told in the brand's voice; by a founder, customer or expert only from that person's real words. Marked as advertising | The advertorial page type; the static advertorial ad's plan (its `CARD.md`) |
| `script-format-advertorial` | The ad that sends a reader to an advertorial: headline as hook, no brand name, 1 claim across ad and page | Kept in step with `kinds/advertorial.md`: the page's headline keeps the ad's headline |
| `clone-from-screenshot` | Starting a page from a screenshot of another page: its layout only, never its words, images, logo or reviews | On disk; not used by a step |
| `product-image-templates` | The 12 product image buckets (what it does, benefits, deep dive, how it works, reviews, before and after, what makes us different, what's included, feature callouts, top testimonial, guarantee, occasions) with real examples | Every image slot on a page names its bucket, so Creative Studio can make that image |
| `PDP Image Factory` | The gallery library and laws for product page images | Through Creative Studio's product page images |
| `asset-generator-cmo` | Base product photos rebuilt from a winning-ad recipe, for a brand with few photos of its own | When a page has image slots and the brand has too few product photos to fill them. The real product photo still wins where accuracy matters |
| `offer-building` | The offer method and the 7 ways offers fail | The page's offer section reads offers in use from the Offers module |
| `copy-principles`, `brand-voice-check`, `ai-copy-blacklist.md` | Copy rules and banned AI phrases | The page checks |
| `strategic-audit/references/awareness-levels.md` | The 5 awareness levels | Page type by awareness |
| `shopify-liquid-themes` | Liquid reference | A later Shopify export |
| `5 Buyer Segments For Creative & CRO.docx` | Problem aware, solution aware, product aware, most aware, unaware: what each needs | Page type by awareness |
| `Product Page Checklist (PDP).docx` | 28 actual checkbox items in 7 groups (images, copy, CTA, proof, shipping and returns, trust, mobile), verified from the original DOCX | `checklist.json`; complete original-based guidance in `original-source-methods.md` |
| `Shopify CRO Checklist - 30 Settings.docx` | 15 actual checkbox items despite the title: checkout, shipping and pricing, speed, post-purchase settings | Original-based guidance in `original-source-methods.md`; administrative states require merchant evidence |
| `Must-Haves and Best Practices.docx` | Core problems of Shopify stores and the fixes; above-the-fold steps; sticky elements; proof of popularity | `checklist.json`; the CRO audit |

## 3. The ecomOS library (`library/`)

| Folder | What | Count | Used by |
|---|---|---|---|
| `library/cards/landing-pages.json` | Knowledge cards: title, summary, use when, steps, caveats, tags | 400 | Shown beside a finding on the CRO and builder screens ("From the library") |
| `library/cards/cro.json` | CRO and testing cards | 177 | CRO audit, test calculator |
| `library/cards/speed.json` | Page speed cards | 226 | Speed findings |
| `library/cards/security.json` | Bot, agent and site security cards (defensive) | 412 | Security findings |
| `library/playbooks/landing-pages.md` | Playbook 07-LPG: priority order, page type routing, message match, hero (3C), section order by page type (3D), checklists 5.1 PDP, 5.2 cold-traffic page, 5.5 message match, 5.6 mobile, 5.7 compliance, 5.8 pre-traffic QA | 1 | `checklist.json`; the CRO audit |
| `library/playbooks/cro.md` | Playbook 09-CRO: metric choice (RPV), funnel bands, sample size (n = 16 p(1-p) / delta squared), traffic bands by orders a month, stopping rules | 1 | The test calculator; the CRO screen |
| `library/playbooks/speed.md` | Playbook 08-SPD: baseline protocol, thresholds (LCP 2.5 s, INP 200 ms, CLS 0.1, TTFB 800 ms), fix order | 1 | Speed findings and thresholds |
| `library/playbooks/security.md` | Playbook 23-SEC: transport, headers, cookies, checklists 5.1 (Shopify) and 5.2 (self-hosted) | 1 | Security checks |
| `library/ideas/*.json` | Idea bank: each idea with the signal that triggers it, effort, risk, steps and a test | 208, 167, 148, 146 | Findings' "what to do" |

The speed lab's method (Pixel 5 viewport, slow 4G at 1.6 Mbps and 150 ms, 4x CPU, cold cache, median of runs; LCP, CLS, long tasks via PerformanceObserver; third-party bytes from response headers, not Resource Timing) is ported from ecomOS `speed_lab/measure.py` into `src/lib/landing/speed.ts`.

## 4. Product images

A page's image slots are filled from:

1. The brand's own product photos (`brand-brain/assets/<product>/`, and `assets/manifest.json` with each photo's source URL on the store's CDN).
2. Images made in Creative Studio as product page images, by bucket.

Which bucket fills which section:

| Section | Buckets |
|---|---|
| Hero gallery (the "product image hack": the gallery is a mini landing page) | what-it-does, benefits-list, reviews-ugc, before-after, what-makes-us-different, whats-included, guarantee |
| Benefit strip | benefits-list, feature-callouts |
| Value prop | benefit-deep-dive, occasions |
| How it works | how-it-works |
| Reviews and UGC | reviews-ugc, top-testimonial |
| Comparison | what-makes-us-different, before-after |
| Offer | whats-included |
| Guarantee | guarantee |
| Final CTA | product-shot, occasions |

## 5. Not available
