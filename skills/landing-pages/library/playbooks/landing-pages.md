# 07-LPG landing pages playbook

version: 2.0-draft  |  date: 24 Sep 2026  |  sources: 26 mini playbooks (at most 14 independent voices, see section 0)  |  cards: 400  |  built from: sources/*.md

## 0. How to use this playbook

**Ecommerce first.** This playbook is for stores, not lead-gen or service funnels. Section 3.0 is the ranking: read it first to know which lever matters most for a given brand before reading the generic groups it points into. Store-type conditions decide which rules apply: hero SKU vs catalogue, low vs high AOV, subscription vs one-off, marketplace-heavy, luxury or considered purchase, and mobile-first India vs US all change which rule fires and how hard.

**Who runs it.** The landing page and PDP agent. It plans, audits, writes and wireframes the pages that paid and organic traffic lands on: product detail pages (PDP), cold-traffic landing pages, advertorials and presell pages, listicles, quiz funnels, and direct-response sales pages with an order page and post-purchase upsells. It also writes the message-match check between an ad and its page, the mobile check, the compliance check and the pre-traffic QA. It proposes tests; it does not run or read them. Test design, sample size, significance and the registry record hand off to 09-CRO-testing. Offer maths (bundles, thresholds, guarantees, discount framing) hands off to 03-OFF-offers. Page speed hands off to 08-SPD-speed. Ad creative and hooks hand off to 10-MCR; ad copy fields to 11-ADC; Meta account work to 24-DEP; Google Ads pages to 12-GAD; email after a quiz capture to 14-EML; post-purchase flows to 17-CXP.

**Which sections to load for which task.**

| Task | Load |
|---|---|
| Audit an existing PDP or landing page | 0, 2, 3A to 3J, 5.1 or 5.2, 5.5, 5.6, 5.7, 8 |
| Write a section-order wireframe with copy for a new page | 0, 2, 3B to 3J, 4.1 to 4.5, 9.2 |
| Draft an advertorial or presell page | 0, 2, 3A, 3B, 3K, 4.6 to 4.9, 5.3, 5.7, 7, 8, 9.3 |
| Design or review a quiz funnel | 0, 2, 3L, 4.10, 5.4, 5.7, 7, 9.4 |
| Sales page, order page, upsells | 0, 2, 3M, 4.11, 5.7 |
| Message-match check between an ad and its page | 3B, 5.5 |
| Research before a build (heatmaps, recordings, surveys, review mining, user tests) | 3N, 4.12 to 4.15 |
| Propose a page test | 3O, 4.16, 6, 9.5, then hand to 09-CRO |
| Build and QA before traffic | 3P, 4.17, 5.6, 5.8 |
| Read a lift claim from any source | 3O, 6, 12 |

**What the agent must fetch before acting.** From the brand record: product facts and specs, the substantiated claims list, the real guarantee, returns, warranty, shipping cost and delivery times, price history and any legitimate compare-at price, stock levels, review count and rating, named and consenting customers or experts, press quotes with permission, brand voice rules. From the data layer: traffic mix by source and awareness per page, device split, scroll depth, click share, session recordings, GA4 funnel rates, survey answers, quiz answer exports, past test results. From the web: the live ad that sends traffic to the page, competitor pages for structure only, current ad policy and disclosure rules for the market, tool UI where a step is tagged `[verify UI]`. Section 10 lists every item.

**Source independence, and why the confidence counts are low.** 26 files were read. They do not carry 26 opinions. The task flagged sources 10, 11, 20 and 24 as 1 agency presenter and 14 and 25 as another. Reading the full set shows a wider overlap. Sources 01, 10, 11, 13, 14, 15, 20, 24 and 25 all describe the same landing page and CRO agency ("400+ landing pages in 80+ niches", the same clients Parcel Safety, Wildman Drinking, Influence Hunter and Inboxy, the same free audit offer, the same Clarity and UserBrain method, the same "2 forms of proof" and "FUD under the CTA" rules). Sources 10 and 11 are the same 7,017-word video filed twice. This playbook counts all 9 files as **1 voice (cluster A)**. Sources 09, 16 and 23 are the same presenter "Mark" (the 4 foundational documents, necessary beliefs, the same swipe library). They count as **1 voice (cluster B)**. Sources 06 and 19 use the same framing word for word ("selling is creating a separation", the pain threshold, 3 to 5 pains and desires) and source 18 shares their agency pitch and "$100k/day" titles; they count as **1 voice (cluster C)** with a caveat that 18 may be separate. Source 07 (Arsh) shares cluster A's tools and "80 niches" claim but names himself; it is counted separately, so any tally that leans on 07 may overstate by 1. Sources 05 and 12 are both "Alex" advertorial presenters with a possible commercial link to cluster B; they are counted separately with the same caveat. That leaves at most 14 independent voices: A, B, C, 02, 03, 04, 05, 07, 08, 12, 17, 21, 22, 26. The confidence column in section 6 counts voices, not files.

**Lead-generation and service sources.** Sources 01, 02 and 13 are lead-generation or local-service sources (forms, booked calls, phone numbers). Sources 14, 15, 20 and 25 are mostly lead-gen too, with a few ecommerce clients. Their PDP and cart rules were written by the card writers, not stated by the presenters. Every rule below that rests on such a card says "card adaptation" so the agent knows the presenter never tested it on a store.

**Two meanings of "advertorial".** Sources 03, 05, 06, 08, 12, 16, 19, 21 and 22 mean a brand-hosted presell page between a paid ad and the product or offer page. Source 26 means sponsored content that runs on a publisher's site (Forbes, BuzzFeed) and borrows the host's trust. Section 3K keeps them apart. A rule from 26 never applies to a brand-hosted page unless it says so.

**ecomOS rules that override every source in this folder.** Several sources model or tolerate practices that are banned here. Each is listed in section 8.1 with its source number as do-not-copy.
1. No fake spokespeople, fake doctors, fake experts, invented narrators, invented patients or invented authors. A first-person story is only used with a real, consenting person, or it is written in a clearly editorial third-person voice with no invented results. Sources 03, 05, 06, 08, 12, 16, 19 and 22 each model an invented person.
2. No invented testimonials, no written "testimonial personas", no AI-generated customers, no reviews copied from competitors, no fake comment sections. Sources 05, 06, 08, 12 and 22 model at least 1 of these.
3. No undisclosed advertising. Every advertorial, presell page and quiz funnel carries a clear "Advertisement" or "Sponsored" label in the market's required form, and the author or brand is not hidden behind a "review team" or "news" masthead. Sources 05 (admits it), 06, 12, 16, 19 and 21 hide or skip the label.
4. No fake scarcity, fake stock-outs, "check availability" when stock is not limited, resetting or evergreen timers, "only on this page today" that is not enforced, or invented "X people joined" counts. Sources 05, 06, 09 (shows one), 12, 17, 19 and 22 model at least 1.
5. No invented reference prices. A compare-at or "was" price must be a real former selling price the brand can prove, or a genuine sum of parts. Source 10/11 (cluster A) raised compare-at prices to widen shown savings; that is rejected.
6. No unsupported health, disease, safety or result claims, and no invented mechanisms or study figures. Sources 03, 05, 06, 12, 16, 19, 21 and 22 each carry at least 1. Every claim on a page must match the brand record's substantiated claims list.
7. Copy stays below a tenth-grade reading level. Source 03 aims for grade 5; that is a stricter target the agent may use, not a floor.
8. Arithmetic (savings, percentages, drop-off rates, lifts) is done in code, never in prose. Every lift figure quoted from a source is marked with what it lacks (sample size, duration, isolation).
9. Competitor pages and swipe files are signals for structure, section order and mood only. Never copy their text, claims, names, images, faces or products.
10. Generated images can redraw a product. Where the product is shown, use the real product photo. Never present a generated or stock face as a real customer, patient or author.
11. Meta is read-only. This agent never publishes, pauses or edits ads; it hands ad changes to 24-DEP as recommendations.

## 1. Scope and outcomes

**What this domain covers.** Every page a visitor lands on from paid or organic traffic and every page between that landing and the order: PDP structure and first screen, cold-traffic landing pages, advertorials and presell pages (including listicles, buyer's guides, case-study and expert formats), quiz funnels and their results pages, direct-response sales pages with a custom order page and post-purchase offers, the homepage and collection page rules that decide whether a visitor reaches a PDP, cart drawer behaviour, and the research and QA that surround a build. It covers the copy on those pages: headline and subheadline formulas, section headings, benefit and proof copy, CTA labels, FUD reducers, objection handling, advertorial leads and mechanism copy, quiz questions and info screens.

**What it does not cover, and where it lives.** Offer economics and the design of bundles, thresholds, guarantees and subscriptions: 03-OFF. Test statistics, sample size, run length, significance, the registry: 09-CRO. Page load speed and Core Web Vitals: 08-SPD. Ad creative, hooks, native image ads and video: 10-MCR. Ad copy fields: 11-ADC. Meta campaign structure, CBO tests and placements (sources 05 and 12 give settings; they are not applied here): 24-DEP. Google Ads landing page rules and programmatic city pages (source 02): 12-GAD. Email and SMS after a quiz or lead capture (sources 18 and 23 give sequences): 14-EML. Post-purchase upsell flows beyond the page itself: 17-CXP. Measurement setup, GA4 events and thank-you page tracking (sources 02 and 07 give steps): 06-MEA. Sponsored content on publisher sites (source 26) sits in 13-ORG or 11-ADC by meaning; the rules are kept in 3K.6 so nobody merges them into presell rules.

**Business measures this domain moves.** Purchase conversion rate per landing page and per traffic source. Revenue per visitor (RPV) and contribution per visitor. Average order value where the page sells bundles, quantity breaks or upsells. Add-to-cart rate and View Product Rate on homepage and collection paths. Click-through from an advertorial or quiz to the offer page, judged together with the purchase rate after the click, never alone. Cost per purchase on the traffic sent to the page. Quiz completion, judged with downstream purchase rate. Every source measures lead form fills or calls in at least half its examples; those numbers are not store benchmarks (02 says so itself [9ffcba120b24]).

## 2. Inputs the agent needs

| Input | From where | Required or optional | Why |
|---|---|---|---|
| Page type and goal (PDP, cold LP, advertorial, quiz, sales page) and the 1 conversion event | User brief | Required | Section order, CTA and length rules differ by type (3A) |
| The live ad, search result or link that sends traffic, with its exact promise, hook, persona and offer | Web (Meta Ad Library, ad account read-only), user | Required for any paid page | Message match is the first check on every page (3B) [3cefd472f380] [d107bfda3ceb] |
| Traffic mix per page by source and awareness stage (Meta cold, retargeting, Google search, organic) | Data layer | Required | Awareness sets hero type, pain placement and page length (3A.6, 3J) [0441a8cce669] [05ee72da15eb] |
| Device split per page | Data layer | Required | Mobile-first rules and QA (3I) [38729fdb61c9] |
| Product facts: specs, materials, contents, form, origin, how it is used, what it does that alternatives do not | Brand record | Required | Value props, mechanism, USP copy; nothing may be invented [2bb1553ace82] [c916e37c3b02] |
| Substantiated claims list and the claims that are banned for the category and market | Brand record, web check | Required | Compliance check (5.7); health, result and comparative claims |
| Real guarantee, returns window, who pays return shipping, warranty, shipping cost, delivery time, payment methods, COD | Brand record | Required | FUD reducers under the CTA must match policy word for word [0d11fac972bd] [651985640c1d] |
| Price, real former prices, compare-at history, bundle prices, unit maths, margin per SKU and bundle | Brand record, 03-OFF | Required for any offer block | Savings shown in money; anchors must be real [fd9d123726a1] [54399c0a8159] |
| Stock levels and channel availability (Amazon, marketplaces, retail) | Brand record, web check | Required if scarcity or exclusivity copy is planned | "Not sold elsewhere" and "risk of selling out" only if true [090226c382a3] [ba6079d8e9e9] |
| Reviews with text, name, photo consent, platform and date; review count and rating | Brand record, data layer | Required | Verifiable proof, objection-matched testimonials [85e78b3e4eb7] [83fd5d9ddc1a] |
| Named experts, founders or customers who agreed to appear, with what they will say | Brand record | Optional; required for any expert or story format | No invented people [68ab05281912] [20cba28f276b] |
| Press mentions with the actual quote and permission | Brand record | Optional | Logos need quotes [8940324d5b00] [8e94b675714d] |
| Customer research: review mining, survey answers ("what almost stopped you", "what motivated you"), support tickets, ad comments, sales-call objections, quiz answer exports | Data layer, brand record | Required for any new page; optional for a quick audit | Objections, pains, desires, beliefs and the customer's own words [3b5634f1c703] [0106fc07ad6a] [1f3ae96ccb10] |
| Heatmaps, scroll maps, area maps and session recordings for the page (Clarity, PostHog, Hotjar) | Data layer | Required for an audit of a live page; optional for a new page | Section reach, click share, rage clicks, drop-off points (3N) [98544575e3db] [bfbcb883a414] |
| GA4 funnel rates (view product, add to cart, begin checkout, purchase) and landing page report | Data layer | Optional for a page; required for homepage or collection work | Fix the weakest stage first [f258739c8f9c] |
| Past test results for this page and the brand's headline test history | Data layer (09-CRO registry) | Optional | Do not repeat a lost test; double down on a win [91a259fd4a85] |
| Weekly sessions and baseline conversion rate for the page | Data layer | Required before proposing a test | Decides A/B test vs before-and-after (3O) [bfdcedabc90c] [5b56dd4acd81] |
| Competitor and category pages, swipe files | Web, inspiration folder | Optional | Structure and mood only; never text, claims or images [64349a706993] [0be867d0a8b8] |
| Brand voice rules and tone limits on agitation | Brand record | Required | PAS and pain-threshold copy must fit the brand [43874661fc5d] [70ebc6c92534] |
| Platform and theme: page builder, cart drawer support, sticky CTA trigger, variant image swap, custom HTML block, review app fields | Brand record, `[verify UI]` | Required for a build | Several rules need theme features (3P) |
| Market and platform rules: advertorial disclosure wording, health and comparative claims, reference pricing, subscription consent, before-and-after images | Web check | Required for advertorial, quiz and any health or beauty page | Compliance check (5.7) |
## 3. Decision rules

Each rule gives the rule, its condition, the mini playbooks that support it (cluster letters A, B, C mark files that count as 1 voice), any conflict (pointer to section 7), and card ids. "Card adaptation" means the card writer translated a lead-gen rule to a store; the presenter did not state it. "Reject" means the source says it and ecomOS forbids it.

### 3.0 Ecommerce priority order

Ranked by how much purchase rate or RPV a lever can move and how early it must be decided. `[general practice]` marks a ranking judgment, not an unsourced rule.

1. Route traffic to the right page type first (3A.1 to 3A.9): PDP direct for a single hero SKU (3A.1, 3A.3); advertorial or quiz for a considered, high-AOV, cold offer (3A.2, 3A.7, 3A.8); catalogue brands decide per SKU. Wrong routing wastes the whole build.
2. Match the page to the ad's exact promise, persona and offer (3B.1 to 3B.3), the single most agreed rule in the folder; cheap to fix and the first check for every store type.
3. Build the PDP first screen to spec (3C.9, 3D.4, 4.4) before anything else on a catalogue store, where most traffic lands; rank lower for a single-SKU brand.
4. Fix the weakest GA4 funnel stage first, not the whole funnel (3N.2). `[general practice: triage order]`
5. Put real FUD reducers under the CTA and add to cart, word for word to policy (3C.8, 3G.6); higher for new brands and COD or low-trust markets.
6. Show bundle savings in money, cap tiers at 3 (3G.1, 3G.2); high for multi-pack or subscription brands, irrelevant for single-unit ones.
7. Build and QA mobile first (3I.1, 4.17); highest for a mobile-first market like India.
8. Cart drawer with no reload and real upsells (3H.3), a low-cost, store-wide lever once traffic and PDPs are fixed.
9. Build an advertorial or quiz only after a winning ad or research base exists (3A.4, 4.6). `[general practice: sequencing]` Skipping this is the most named mistake for this page type.
10. Scatter proof and objection-matched reviews at the buy box and drop-off points (3F.2, 3F.3); higher where trust is the blocker.
11. Score and queue tests by traffic, above the fold first, hand to 09-CRO with the prior's gaps stated (3O.2, 3O.3, 4.16); low-traffic pages use before-and-after.
12. Run the compliance check (5.7) before launch on any advertorial, quiz or claims page: a gate, not a lever, so it sits last.

Load this block first; the groups below are the detail.

### 3A. Which page type, and when to put a page between the ad and the product

**3A.1 Send product-aware and most-aware traffic straight to the PDP.** Condition: retargeting of product viewers, branded search, cart abandoners, repeat buyers. These visitors "just want the best discount possible" and need price and the buy box, not education. Sources: 12, 04 (saturated and curious markets), 01 (Google search traffic gets a direct hero). No conflict. [05ee72da15eb] [34a2012a9531] [0c22726bae24]

**3A.2 Put an educating page (advertorial, presell, quiz or long landing page) in front of the PDP when the visitor is unaware or problem-aware, and the product cannot be understood in seconds.** Condition, any 1 of these triggers: the product needs about 3 minutes of explanation; the market is skeptical; the claim needs explanation; the product is a new mechanism; the category is crowded; the ad only sold the click. Sources: 12 (3-minute rule and 4 triggers), 08, 21, 05, 06, 19 (C), 09 (B), 03. Caveat: none of these sources shows a test of advertorial vs direct-to-PDP on the same traffic; 05's advertorial campaign (6x ROAS) ran with a different setup and time than its angle tests, and 06's "3 to 4% vs 1 to 2%" is unsourced. Treat the route as a hypothesis to test on the brand's own traffic (3O.9). [05ee72da15eb] [b757b2f67584] [110546fbea50] [1ec80c7e259e] [a0bf3baac741] [needs brand data: cold-traffic PDP conversion rate and CPA]

**3A.3 Send simple, self-evident products straight to the PDP even on cold traffic.** Condition: a t-shirt, a hoodie, a plain accessory, a product whose value is visible in 1 image. Source: 12. Source 09 (B) disagrees for outcome-led high-AOV offers ("ad to PDP is a first date"), but frames that for offers that sell an outcome. See 7.13. [05ee72da15eb] [a0bf3baac741]

**3A.4 Build the advertorial only after an ad has proven the angle.** Condition: cold paid traffic. Source 21: build only after an ad converts at least break-even on the product page and confirms avatar, desire, angle and mechanism (his example: about $1,000 spend at break-even). Source 05: test about 5 angles with native image ads in 1 CBO campaign, take the winner, then write the advertorial for that 1 angle. Neither source defines break-even or the spend needed. Source 12 says the opposite about speed ("ship in 1 day, don't think for 6 months") but agrees the copy must rest on real research. Rule for the agent: no advertorial without a winning ad angle or, for a new brand, a written research base (3N.1). [0623f1ad4849] [108973ca4a70] [a5a6310c4758] [needs brand data: ad results by angle, break-even ROAS from 20-FIN]

**3A.5 Pick the advertorial format by the buyer's main obstacle and the product type.** Condition: obstacle known from research (3N). Source 12's map: low trust, story with proof early (start here if you run none yet); need for permission, a real expert; too many options or a skeptical "seen it all" buyer, buyer's guide or comparison; "will it work for me", cover that objection directly (the header says case study; the talk does not). Source 21's map: improvement product (a better version of a known thing), failed-solutions personal story; innovation or gadget, breaking-news or revelation frame that reaches the product faster. Source 03's 10 editorial frames (3K.5) are the copy-level version. Conflict inside 12: the buyer's guide is "very good for retargeting" and also for cold skeptics; keep both as hypotheses. [68ab05281912] [cdf7785c11ed] [e74fd721f7f7] [44bf08d46ea9]

**3A.6 Classify the traffic's awareness before writing the top of any page.** Condition: every page. Cluster A (01, 13, 14): Meta traffic is mostly unaware or problem-aware, Google Ads and SEO traffic is solution-aware or ready to buy. Source 12: 5 levels (unaware, problem, solution, product, most aware). Source 04: 3 market stages (clueless, curious, saturated) read from category search trends and customer interviews. Source 03: portfolio of about 30% unaware, about 30% problem-aware, rest solution to most-aware for advertorial tests. Source 18: read the stage from the quiz answer "what have you tried before". The agent records the stage per page in the brief (4.1). [0441a8cce669] [5014418361eb] [2a1909cea73f] [85a5623c70bf] [3c016be4d254] [needs brand data: traffic mix by source per page, customer survey on prior category knowledge]

**3A.7 Use a quiz funnel when the product choice or the buyer's belief needs a few answers first, and the brand will read the answers.** Condition: cold traffic in a problem-solution category (health, hair, skin, gut, fitness are the sources' only examples), or a range where a recommendation is real. Sources: 17, 18 (C?), 23 (B). All 3 say the quiz has 2 jobs: personalise the path and collect first-party research. Source 23 says the front end wins by priming, not personalising (see 7.14). No source shows a quiz for gifting, fashion or jewellery; fit there is untested. [58789a695fea] [4d9eb8148c84] [38bb690a9cc6] [needs brand data: whether answers would change the recommendation; whether the team will export and read answers]

**3A.8 Use a sales page plus order page plus post-purchase offers for outcome-led, high-AOV direct-response offers.** Condition: consumables, supplements, courses, products with a natural next problem; not one-off durable goods. Source: 09 (B) only. Trade-off it skips: leaving native Shopify checkout may lose accelerated wallets and speed. [a0bf3baac741] [9f5970096a05] [web check: current Shopify checkout support for order bumps, quantity breaks and post-purchase offers]

**3A.9** Moved to Appendix A.1: a sponsored piece on a publisher's site is a different asset from a brand-hosted advertorial, not a store rule.

**3A.10 Build a distinct reorder path for repeat and loyalty customers that skips persuasion.** Condition: a returning, logged-in customer or one matched by email or a loyalty cookie. 3A.1 routes repeat buyers to the PDP but does not design what changes for them: cut hero persuasion and proof, surface the past order and its quantity, offer 1-click reorder or resubscribe, and shorten the path to checkout. `[general practice]` No library source; verify against brand data before use.

### 3B. Message match from ad to page

**3B.1 The ad's exact promise is the first thing the visitor reads.** Condition: any paid page. The hero headline mirrors the ad's specific promise, persona and offer; a generic brand line ("Retreat to a new reality" after an ad that said "Lose 6 to 20 lbs in 2 to 4 weeks") drops the benefit that earned the click. Sources: A (14, 13, 01, 20), 06 (C), 22, 02, 21. No conflict; the most agreed rule in the folder. [3cefd472f380] [706a0be05ca5] [338245ec724b] [d107bfda3ceb] [d6e1e26520c5] [ca6dfd85e131]

**3B.2 The advertorial continues the ad's story; it cannot start a new one.** Condition: cold ad to presell. The ad's 4 jobs: break a pattern, open a loop, qualify the audience in 1 line, tease the mechanism without revealing it. The page's first screen closes that loop in the same voice. "A perfect advertorial behind the wrong ad converts really bad." Sources: 06 (C), 21, 22, 05. [d107bfda3ceb] [ffdf5c3a30ff] [d6e1e26520c5] [b7214132b1ab]

**3B.3 Keep 1 persona from ad to page to PDP.** Condition: paid funnels built for 1 segment. Same age, gender, problem and problem length in the ad, the headline, the story and the PDP copy; widening any step to "everyone" breaks the mirror. Sources: 22, 05 (avatar first), 08 (1 archetype per advertorial). [20cba28f276b] [d6e1e26520c5] [53d57d05d296] [d02a32ae552f]

**3B.4 Match the page's selling load to how much selling the ad already did.** Condition: any presell. A clickbait image ad with no body copy needs a long lead (source 21's example puts the product at about 50 to 60% of the scroll). A long story ad, a 1,000 to 3,000 word sales letter or a 4 to 5 minute VSL needs a short page that shows the product in the top image and first lines. Source 21 only, hedged as "not always true". Source 05's native image ads carry long copy that already introduces the product, so his page confirms and sells; that agrees. See 7.3. [ffdf5c3a30ff] [b7214132b1ab]

**3B.5 One page per keyword or angle, not 1 catch-all page.** Condition: search traffic (02: city x service pages; 12-GAD owns the build) and paid social angles (05: separate URL per angle refinement, /braces and /teeth). Source 02 warns not to publish 1,000 pages in a day for SEO. [ca6dfd85e131] [31a4937fc754] [web check: current Google policy on scaled pages]

**3B.6 The ad CTA to an advertorial reads "Learn More", not "Shop Now"; the ad CTA to a quiz reads "Take the quiz".** Condition: Meta ads to a presell or quiz. Sources: 05, 23 (B). Hand the change to 24-DEP. [28056fad0269] [38bb690a9cc6]

### 3C. Hero section (above the fold)

**3C.1 The first screen carries 6 elements in this order: proof 1, benefit headline, subheadline (how, mechanism, USP), benefit CTA, FUD reducers next to or under the CTA, an image or video that shows the promise, and proof 2 under it.** Condition: cold-traffic landing pages and campaign pages; adapt for a PDP (3C.9). Sources: A (25's 6-element version, 14's 7-slot version, 01, 13, 15, 20), 07 (its winning above-the-fold test bundled the same parts), 05 (header only). Two proof forms is cluster A's rule ("A/B tested a lot", no numbers); 15 says "at least 2"; 25 warns proof must not be "gigantic" under the headline. [f4cbc2b893ed] [12c3e5742646] [e6a8d5dff241] [706a0be05ca5] [59be84f0758c] [ac46f2bf0ebf] [28056fad0269]

**3C.2 State the outcome this SKU delivers, not the category, with only numbers that SKU's own PDP and reviews back. It never says who you are or what you do.** Condition: every hero except a PDP title (3C.9). "What's in it for me" is the part "99% of brands" miss (13). Sources: A (all files), 09 (B), 12, 20's Value Equation (dream outcome in the headline), 04 (Mario: sell big Mario, not the fireflower), 15. The presenters' own examples contain invented numbers ("97% success rate", "clinically proven", "Swiss approved"); never ship a number the brand record does not back. [4fb1b734b296] [b2e00b510c25] [accfa461c58b] [e39c49f19656] [d582b28ffa4e] [needs brand data: substantiated outcome and time claims]

**3C.3 Headline formulas the agent may use.** Pick 1, then check it against 3C.2 and the 7-trait score (3E.2).
- End result + time period + emotional payoff, in any order: "Calm your horse, enjoy safer happier rides, in just 2 weeks" (15, A). [59be84f0758c]
- 3 beats: outcome, then credibility, then fear removal: "Get 20/20 vision with 100% success rate" plus a 10-year guarantee (01, A). [4fb1b734b296]
- Who, what, what's in it for me, readable in 5 seconds (10/11, 20, A). [2070e6c0b648] [accfa461c58b]
- Low awareness, desire-led: "Achieve [specific desire] with the only / largest / most [product type] that does [valuable thing]"; pain-led: "Eliminate [problem] with the only / largest / most [product type] that [valuable unique thing]" (13 quoting a CXL table; only 2 rows given). "Only" and "most" need proof. [5014418361eb]
- "So that" chain to reach the benefit: feature, so that outcome, so that deeper outcome; stop at a concrete outcome the buyer cares about (13, 20, 15, header of 05). [05cef19e3b81] [799ca4958608] [ae55963d2252] [021844addc99]
- Contrarian headline for a curious market that already holds the belief: "Doctor says throw your probiotics in the trash" (04). Only with a real doctor and a defensible claim. [7544583064ea] [d235019925fc]
- Advertorial qualifying headline: "If you're [avatar] dealing with [symptom 1], [symptom 2] or [worry 3], read this short article before you try anything else" (05). [6aa1da717dab]
- Advertorial persona headline: "[Gender], [age], finally free from [problem] after [duration]" (22). Only with a real person or clear editorial framing. [2595318b416f]
- Advertorial curiosity headline with 1 curiosity element, 2 at most (problem in the headline, solution in the subhead), universal, passes the 1-second "mom test" (03). [9bd853e225c5]
- Open-loop headline: personal fear or struggle, then a discovery (16, B). Not in first person unless the person is real. [3bcd4bbc9ddb]
- Quiz headline: a question plus a time promise, "Why hasn't your gut fully healed yet? Find out in 2 minutes" (23, B). [9f7d25ae19bb]

**3C.4 The subheadline explains how, not what again.** Condition: every hero. It names the mechanism or proprietary method that delivers the headline, or runs pain then solution: "Stop doing X, no more Y. Our solution does A, B, C" plus an effort or risk clause ("zero effort required from you"). It carries who you are, what you do and the USP (25). It must not repeat the headline. Sources: A (14, 01, 15, 25). [ec11504efa22] [12c3e5742646] [f4cbc2b893ed] [59be84f0758c]

**3C.5 Hero body copy stays short: 2 to 3 sentences, 3 to 4 bullets at most.** Condition: cold LP hero. Sources: A (14: cut 8 lines to 2 to 3 sentences; 01: 3 to 4 bullets in the form-above-the-fold variant), 02 (visitors read about 10%: headline, 2 subheads, 3 bullets). [ae06c62a4a73] [0c22726bae24] [de1cd5d08ee6]

**3C.6 Proof above the fold: 2 forms, each relevant to the offer, each verifiable.** Condition: every hero. Forms: rating and review count, customer or user count, quantified result, press quote with the outlet's words, real client logos. Rules on thinness: with about 30 reviews or fewer, do not headline the count; hand-pick 2 to 4 relevant reviews (10/11, 13, A); a 4.7 to 4.9 rating reads more real than 5.0 (02, opinion). A testimonial that does not mention the offer's result is weak proof even in the hero (15). Sources: A, 07, 02. Conflict: common practice shows any count; see 7.16. [79b4db61ba63] [7f28a425cebc] [83fd5d9ddc1a] [4bc5cc0e725e] [13c8f4c9d77e] [ac46f2bf0ebf]

**3C.7 One obvious CTA in the hero, benefit-led, passes the blur test.** Condition: single-goal landing pages and PDPs. Blur the page; the button must still be the 1 thing that stands out. Label names the outcome or the task, not "Submit", "Contact us", "Shop now" or "Buy now" alone: "See how to end your dizziness", "Get instant quote" (instant beats free), "Improve your deliverability", "Get thicker hair now" (A). Card adaptation for stores: "Add [product] to cart", "Choose your size", "Build your bundle" (14 cards); see 7.5. Source 13 praises a dual-CTA hero (Chargebee) while its card says avoid; see 7.12. [2070e6c0b648] [8805ac6febed] [4e7bcbfc5e4b] [6dbf3e919d60] [ae06c62a4a73]

**3C.8 FUD reducers sit next to or directly under the CTA, and each one is a real policy.** Condition: every hero CTA and every add-to-cart button. Reducers: money-back guarantee, return window, warranty, free shipping, delivery time ("ships in 24 hours"), secure checkout, no card required or free trial for services, "no surgery or pills" type risk lines only if true. Sources: A (25: 40 to 60% lifts "from this one small thing", no detail; 20: Parcel Safety badges under add to cart +30%, 1 test, no n; 13; 14; 15), 07 (benefits bar with shipping and 30-day free returns inside its +64% bundle), 12 (objection block: risk, price, time, safety). Card 0d11fac972bd's "directly under" placement comes from a header; the presenter said "around the point of action". [0d11fac972bd] [e0053984b930] [716414ea8582] [9f5465768bf6] [3ff3c8b062b0] [f4cbc2b893ed] [needs brand data: policy terms]

**3C.9 On a PDP, the first mobile screen holds: gallery with visible thumbnails, rating and review count, product title, price and any saving in money, variant or bundle selector, add to cart, FUD reducers under it.** Condition: standard store PDP. Source 14 (A) draws the line at add to cart plus FUD; it also says reviews go above the title ("always"), which its own card softens to "test the order". Source 07: shorten the description and shrink hero elements when only 36% reach add to cart. Source 24 (A): thumbnails not dots (dots took 7.35% of clicks in 07's store). Sources: A (14, 24), 07. Conflict on reviews above title: 7.15. [3ff3c8b062b0] [c6a46a3c8964] [fd9d123726a1]

**3C.10 The hero image or video shows the promise, not decoration.** Condition: every page. A transformation, a happy user in the outcome state matched to the buyer, the product in use, or a proof collage ("social proof at scale", Influence Hunter +78% from the image alone, 1 client, no n). Never a venue shot or generic stock. Emotional, social and functional benefit in 1 image where possible (10/11). Sources: A (20, 14, 13, 25, 10/11), 04 (demonstration as hero media, card suggestion), 07. The "60,000 times faster than text" and "90% visual" figures are unsourced and must not appear on client pages. [96baec725a87] [ecf232bf372c] [b721b5ef1086] [d9c4d43e2810] [df90571ef30f] [web check: origin of the 60,000x claim]

**3C.11 Visual hierarchy: headline biggest and boldest, body lighter and smaller in a second colour, CTA in a distinct accent colour, 1 or 2 emphasised elements only.** Condition: every page; strongest on mobile where a huge logo or announcement bar buries the button. Desktop numbers from cluster A: body about 16 px, headline 3 to 4x body (they say 48 to 57 px; 4x would be 64), one example at headline 32 to 33 px and body 16 px. No all-caps everywhere, no bold everywhere, no clashing colours. Sources: A (10/11, 24, 25, 13, 01), 07 (small title at 3.2% of clicks earned more than the big button, so enlarge it). [5d7260153d8b] [d9610985ed8c] [751c54e90cdc] [2877b10aa93f] [bfbcb883a414]

**3C.12 No empty white blocks between the fold and the first proof.** Condition: mobile first. Scroll maps show the average fold; proof must sit above it. Cut spacing until headline, body, proof, CTA and phone or add to cart fit in the first screen without overwhelm. Sources: A (01), 07 (25% left before the description when the main image pushed content down). [98544575e3db] [c6a46a3c8964]

**3C.13 Familiar layouts beat creative ones when clarity is the cost (Jakob's law).** Condition: conversion pages. Flags: 2 headlines, oversized proof under the headline, body far from the headline, headline-only hero with no CTA. Sources: A (25, 15). If a creative layout is kept, test it against a familiar control. [a556c62817f0] [a3d3e6c06299]

**3C.14 Form-above-the-fold hero only for high-awareness search traffic.** Condition: Google search or branded traffic, lead gen. 1 benefit headline, 3 to 4 bullets, 1 large CTA with a risk reducer under it. Never for cold Meta traffic ("asking before educating is premature"). Source: A (01). Lead-gen rule; the store equivalent is the direct buy-box PDP (3A.1). [0c22726bae24] [af3eaeba1a44]

**3C.15 Add a subscribe-and-save or one-time-purchase selector to the PDP first screen.** Condition: consumable or replenishable SKUs. Place next to the add-to-cart control per 4.4 step 3; show the subscription saving in money, to the same standard as 3G.1. `[general practice]` No library source; verify against brand data before use.

**3C.16 Show a delivery ETA or pincode serviceability check near the buy box.** Condition: markets where delivery time or reach varies by area, especially a mobile-first market like India. Place it with the FUD reducers per 3C.8 and 4.4 step 6. `[general practice]` No library source; verify against brand data before use.

**3C.17 Show the local payment trust signals the market actually uses (COD, UPI, EMI, buy-now-pay-later) beside the FUD reducers.** Condition: every PDP and checkout entry point; match the signals to the market, not a generic card-logo strip. Source 15 names this gap directly; card [716414ea8582] is a card addition covering returns and shipping only, so payment-method trust itself is `[general practice]`. Verify against brand data before use.

### 3D. Section order by page type

**3D.1 Cold-traffic landing page (problem-aware, Meta).** Condition: cold paid social to a single-offer page. Order: hero (3C.1); pain section with PAS right after the hero (3D.6); wall of love or proof block; value prop sections, 3 to 4 minimum and up to 8 to 10 for complex offers (15 says 6 to 8, 13 says 4 to 5 or more); a second proof block; comparison table or "what makes us different" block with 3 to 6 points; how it works in 3 or 4 steps ending in the outcome; team or founder block for service and trust-led brands; guarantee block only if a guarantee exists; another proof block; FAQ built from real objections; closer section. A CTA in every critical section. Sources: A (01 template, 14 framework, 15 counts, 13, 25). Cluster A gives 2 orders for the pain and proof positions and says the order is awareness-driven, not fixed. [e296505d973c] [0441a8cce669] [72fd0e79eb5c] [145380876d79] [ecc54f71873d] [ae06c62a4a73]

**3D.2 Solution-aware landing page (search, warm).** Condition: Google search, branded or retargeting traffic. Proof moves up to right under the hero; the pain section shrinks and moves below it; value props follow; the buy or lead action can sit in the hero (3C.14). Source: A (01). [0441a8cce669] [52706461f320]

**3D.3 Ecommerce campaign page (single product, paid traffic).** Condition: dedicated product landing page, not the storefront PDP template. Order: hero with product, benefit headline, proof, price and offer, selector and add to cart with FUD reducers near the top; image-led value props (3E.6); proof scattered between value props; comparison against alternatives; how it fits the routine (3 or 4 steps); reviews grid; FAQ; closer with a second buy block. Product selection is the main action and sits near the top; bundle savings are stated in money; add to cart opens a cart drawer, not a page reload. This order is a card adaptation of cluster A's lead-gen template plus 07 and 24; no source shows a full tested store order. [e296505d973c] [d436d80a4ccb] [c3c1046803f6] [d6a9cf8c165e] [85e78b3e4eb7] [af92a8953b92]

**3D.4 PDP (storefront template).** Condition: the standard product page reached from collections, search and retargeting. First screen per 3C.9. Below: benefit modules with icons and real imagery instead of dense text; objection-matched reviews near the buy box and a full review section open on mobile; FUD reducers between sections where drop-off is steep; size, care, ingredients and specs kept available in a scannable form; FAQ from support tickets and reviews. Keep store navigation (3H.2). Sources: A (14, 24, 10/11), 07. [3ff3c8b062b0] [49c753e32e8d] [83fd5d9ddc1a] [e03f2284af5e] [4514239a3d5e]

**3D.5 Homepage and collection page (the road to the PDP).** Condition: store entry pages. Homepage: benefit headline, not a slogan; visual navigation with product images or story-style icons (A: +15% and +72% in 2 single-client tests, no n); 7 or fewer top-level items; best-clicked categories first and reachable near the top; measure View Product Rate. Collection: products as high as possible; consolidate above-the-fold content; 1 or 2 filter layers with plain labels; FUD reducers between product rows at the steepest drop-off; honest Best Seller and Most Popular badges; quick add where reverse-path data shows collection to PDP to add-to-cart loops. Sources: A (14, 24), 07. [d9c4d43e2810] [7caa022c540c] [c7160f33c310] [e03f2284af5e] [88fb8838882b] [530251f31987] [63a914e978db]

**3D.6 Open on the exact shopping or product friction this SKU creates (a stain, a leak, a return trip), not a generic opener, in the format that fits the offer.** Condition: cold traffic; skip or shorten for high-intent visitors. 3 executions (15, A): graphical before-and-after with icons for visual transformations; a sales-letter PAS for complex offers, opening "Does this sound like you?" with 3 to 5 pains, paragraphs of 1 to 2 sentences, an agitate step of "a few sentences", then the solution as the clear way out; a short PAS for simple non-visual offers. A pain list with no agitation and no solution is box-ticking. Agitation stays honest: no invented harm, no medical claims, and it must fit the brand voice. Sources: A (14, 15, 25, 01, 13's contrast principle), 06 and 19 (C, the pain threshold). Conflict with 03 (do not lead with pain): 7.9. [81a3fd40b635] [43874661fc5d] [52706461f320] [7b3bdfd30f36] [e5afd40ade58] [70ebc6c92534]

**3D.7 Value prop sections: benefit in the heading, feature as support, 1 clear image each.** Condition: every page. Drill each feature with "so what?" or "so that" until the day-to-day benefit appears ("clear reports" becomes "make smarter decisions" becomes "grow your bottom line"). Standard image-plus-text layout works in every niche; 2 or 3 images for visual offers; custom graphics or analogue layouts where they help the buyer picture the future. Sources: A (01, 15, 13, 25). [90790635ecd5] [ae55963d2252] [a3d3e6c06299] [145380876d79]

**3D.8 How it works: 3 or 4 steps, the last step is the end benefit.** Condition: any offer with a process or routine. Card adaptation for products: how it fits the customer's routine. Source: A (01). [d6a9cf8c165e]

**3D.9 Comparison block: compare against the 2 or 3 SKUs or brands the shopper is actually price-checking in the same search or listing, with checks and crosses and a line of text per cell for complex offers.** Condition: crowded categories or when buyers weigh alternatives. Every comparison must be accurate and admit who may prefer another option (06 card). Sources: A (01), 06 (C), 12 (listicle "5 reasons why"), 15 (Pilates vs the client's method). [c3c1046803f6] [ff648126e918] [43874661fc5d]

**3D.10 Closer section: a mini hero that recaps.** Condition: every long page. Benefit headline that recaps the dream outcome, 1 final reason to act today, 3 value props or 3 to 5 bullets, 2 proof forms, CTA, FUD reducers, image, video or the form. No "Contact us" or "Want to know more?" endings. For a course, a value stack; for a store, the product selector and add to cart again. Source: A (01, 14). A short PDP with a sticky buy module may not need it (card caveat). [e296505d973c] [ecc54f71873d] [d436d80a4ccb]

**3D.11 Build the PDP FAQ from that SKU's own tickets and negative reviews (runs small, scent fades), not the site-wide FAQ; it is an objection block, not filler, and objections are pre-handled earlier where possible.** Condition: every page. Harvest objections from sales calls ("was anything ambiguous?"), support tickets, reviews, on-site search and surveys. Place a matching testimonial or copy line before the FAQ so the objection never reaches it (09, B: a pregnant customer's review answers "will this work if I'm pregnant?"). Sources: 02, 09 (B), 16 and 23 (B, pre-handle before the sales page), A (01), 12. [3f57d3484974] [cc5d84e31feb] [99f68cd7f6fd] [56f4e8549a30] [e296505d973c]

**3D.12 Treat on-site search and its results page as a conversion lever, not just a box.** Condition: any store with a search bar. Surface synonyms and typo tolerance, merchandise results by margin and stock, and feed unmatched queries into the objection-mining in 3F.7. Source 01 mentions search only as a place to mine objections [3f57d3484974]; the feature itself is `[general practice]`.

**3D.13 Add a frequently-bought-together module on the PDP, separate from the cart-drawer upsell.** Condition: a SKU with a real, commonly co-purchased companion item; never an unrelated add-on. Distinct from the cart-drawer cross-sell in 3H.3 [af92a8953b92]; the module itself is `[general practice]`.

**3D.14 Add a dedicated size or fit guide module on the PDP.** Condition: apparel, footwear or any SKU with a sizing decision. Source 15 names sizing as a missing FUD item, card [716414ea8582]; the module format is `[general practice]`.

### 3E. Copy rules for pages

**3E.1 Name the shopper's payoff for this line, not the department label ("Our Ingredients" becomes "What's in your jar and why it works").** Condition: every heading. If a visitor reads only the headings top to bottom, they should have an incentive to buy. No "Our services", "What makes us unique", "How it works", "Our reviews", "See what our customers are saying". Proof headings use "Helping [N] customers achieve [outcome]" with a real N. Sources: A (all), 02. The "read 20%, scan 80%" and "read 10%" figures are unsourced heuristics. [2877b10aa93f] [ae06c62a4a73] [6ff63786e24d] [b2e00b510c25] [ac8005d3b7e7] [de1cd5d08ee6]

**3E.2 Score the headline on 7 traits and hit at least 3 or 4: curiosity, calls out the pain, promises the solution, specificity, simplicity, credibility, time frame to results. Add an eyebrow line above the headline for a missing trait instead of overloading the headline.** Condition: sales pages and cold LPs. Source: 09 (B). Source 03's cap of 1 curiosity element (2 at most) is the counterweight: more traits, not more ideas. [9246e69228b5] [9bd853e225c5]

**3E.3 Lead with the benefit a shopper uses to pick between 2 open comparison tabs; the spec backs it up, not headlines it.** Condition: every page. Benefit families: saving time, earning money, pain aversion, peace of mind, status, freedom (02). For premium consumer goods the dream outcome is often status and needs translation into what the buyer feels (20's $20,000 table). Sources: 02, 04, 20 (A), 09 (B), 13 (A), 03 (product components each get a truthful reason). [9b3e679ad878] [e16763c803e8] [afd75cbd0aa2] [a7a83f2d6fb7]

**3E.4 Write to "you" in the customer's own words.** Condition: every page. Copy comes from review mining, survey answers, support tickets, forum and comment language, sales conversations; not from the writer's own filters. Sources: A (13, 15), B (09, 16, 23), 06 (C), 22, 03. [4b1eaf817c12] [10b436ef5145] [0106fc07ad6a] [20262eb9059c] [needs brand data: quote bank]

**3E.5 Make text scannable: bullets, icons, subheads, selective bold; keep full specs available.** Condition: PDP descriptions and page body; not inside a long, engaging story lead. Cluster A reports +25% CR and +34% RPV (1 client, no n) and "huge increases" from this. [4ef5d75f8104] [2d9c1b326b14] [49c753e32e8d] [312f58b6a046]

**3E.6 Let images sell: every gallery image carries a selling point, and text lives on or beside the image.** Condition: PDP gallery and value props. Image types: happy user in the outcome, how it is used, use cases and occasions, ease and portability, use with others, before and after (regulated in health and beauty), benefit stats, infographic overlays on the real product photo. Test: a visitor who only looks at the images has enough to buy. Cluster A reports +32% CR from gallery infographics (1 client, no n). Never let overlays hide the true product. [b721b5ef1086] [8c97c1a87218] [634fdf0d882d] [e90da6b10562]

**3E.7 Every image traces to the SKU's current photo set (color, size, packaging shipping today); a mismatch drives a return, and every image looks like a real photo and is honest about what it is.** Condition: advertorials and story pages. Source 22. ecomOS adds: generated or stock images are never passed off as real customers, patients or authors; the real product photo is used wherever the product shows. [146a5b208b74]

**3E.8 Quantify the value where a true number exists.** Condition: headlines, proof headings, CTAs, time claims. "Trusted by 700,000 happy customers" beats "trusted by happy customers"; "ships in 24 hours"; "in 90 days". Only numbers the brand record backs. Sources: A (24, 20, 01, 13), 06 (C, specificity), 12 (specific numbers and timelines in proof). [b2e00b510c25] [c028f18c0982] [20262eb9059c] [b23e07cd5c01]

**3E.9 Reading level: below tenth grade always; aim near grade 5 to 7 for consumer copy; use concrete, short, Germanic-rooted words; full sentences; no staccato fragments; no em dashes.** Condition: all page copy. Source 03 is the only source with a grade target (about 5; grade 7 to 8 flagged too high; AI prompt target grade 3 to 5), and it says advertorials may run slightly higher because they mimic editorials. ecomOS's rule is below tenth grade. See 7.10. Source 03's anti-AI edits: 1 fragment beat is fine, repeated fragments are the fault; re-read after every AI pass. [d36b6dd3162b] [eb01995ac888] [2475094b3f6b] [1a914d4178f2]

**3E.10 AI drafts are starting points. Every name, study, number, price and testimonial in an AI draft is treated as invented until matched to the brand record.** Condition: any AI-assisted copy. Sources: 08 (the model invented a doctor, studies, testimonials and a price in the demo), 01, 14, 05, 16, 21, 03. [cc252faac5f7] [d582b28ffa4e] [df5d2f71273b] [e30258576d36] [6ec3aac63864]

**3E.11 Sound bites and a named mechanism help copy spread, if the name describes something real.** Condition: a product with a real, checkable mechanism. Give it 1 short name and use it in headline, subheads, body and close (19's "feel-based feedback", 06's "Triple Therapy Method", 03's "characterization"). Do not coin a medical-sounding name for a mechanism the product does not have (22's "rheumatoid trauma protocol" is invented on the spot: reject). Sources: 19 and 06 (C), 03, 22, 04, 09 and 16 (B). [46b86014e059] [10605f2c40fb] [6704102a81a7] [890b189e8bfa] [67d1415b8bc7]

### 3F. Proof and objection handling

**3F.1 Show the platform badge (Shopify verified buyer, Amazon verified purchase) the shopper trusts for the channel it buys on; every review stays verifiable with full name, photo with consent, platform source and date, and press logos carry the outlet's actual quote.** Condition: every review block and logo strip. Cluster A reports +38% from adding quotes under logos (1 client, no n). Bare or repeated "featured on" logos are overdone and make buyers numb. Sources: A (01, 25, 14, 10/11), 02 (external badges are more credible because they are outside your control). [85e78b3e4eb7] [8e94b675714d] [8940324d5b00] [4bc5cc0e725e] [needs brand data: review consent for names and photos]

**3F.2 Every testimonial has a job: it answers 1 named objection or installs 1 needed belief.** Condition: every testimonial placed. Map the top 5 objections to 1 real review each, different customer types where possible; place each next to the claim or the section it supports and at the point of action (under add to cart, beside the bundle selector, above the fold). Never write, edit or invent a review to fit. Sources: A (10/11, 13, 01), 09 (B), 06 and 19 (C), 12. [83fd5d9ddc1a] [cc5d84e31feb] [5aaa4297b2ac] [cca2df9310c1] [bece1235ee24]

**3F.3 Proof is scattered, not stacked once: above the fold, between value props, at drop-off points, near every CTA, and a full open grid ("wall of love") somewhere on the page.** Condition: long pages. Grid, not carousel; platform source in each card; a short summary heading on each review; video reviews get a scannable headline for viewers with sound off; photos of results inside reviews where the result is visual. Sources: A (01, 15, 13, 25). Source 01 contradicts itself on carousels (avoid them, yet shows a rotating proof unit as creative); rule: never hide a whole review section in a carousel or accordion on mobile. [3f41ff67021b] [79b4db61ba63] [ac8005d3b7e7] [4514239a3d5e] [bece1235ee24]

**3F.4 Prioritise phone-shot UGC of the product unboxed or worn, styled like the brand's own ad, matching cold traffic's feed, and a 45-second founder video where the category is trust-led; keep written reviews as the base.** Condition: service, high-ticket, new brands. Source 02 calls both "non-negotiable" for lead gen (his 9 videos cut cost per lead from $200 to $30 on 1 account; the founder video moved his page from 10% to 15%, a 50% relative lift he calls 33%). It admits this is "personal bias" and that written reviews still beat nothing. Cards add placement (below the headline, still thumbnail, no autoplay with sound, small file). Ecommerce practice leans on review volume; see 7.17. [4435f3fae23c] [05575fd44bd3] [cbc6126cdb67] [b32f8041f945]

**3F.5 Three layers of proof on a presell page: mechanism proof (why it works, in about 3 sentences), social proof (10 to 20 real quotes, repeat-buyer reviews for consumables), demonstration proof (the product visibly working).** Condition: advertorials and long sales pages. Add specificity (numbers, timelines) and third-party proof (real experts, real publications). Sources: 12, 04 (demonstration as the strongest hijack; exaggerate staging never efficacy), 06 (C), 03 ("massive proof"). [b23e07cd5c01] [df90571ef30f] [bbd78f74d75f] [ae370217e964]

**3F.6 Study-based proof keeps the real institution, the real population, the comparison group and the time frame; numbers are translated to plain percentages in code.** Condition: any claim from a study. Rate the study by authors, journal, institution and design (randomized, double-blind, placebo-controlled). Source 03's own advice to "manipulate the proof" and call an author "Harvard trained" when the study is from elsewhere is rejected; its own example ("0.42 to 0.25 slashed in half") is a 40.5% drop. [7b87cbeac602] [ae370217e964] [web check: read each paper, not an AI summary]

**3F.7 Collect proof on purpose with leading questions.** Condition: brands with few usable reviews. Ask customers: how did you discover us, what problem were you trying to solve, how did we help, what was your goal, what was the outcome. Post-purchase survey: "What motivated you to buy today?" and "Did you have any concerns, doubts or uncertainties that almost stopped you from buying?" (85 to 90% completion in 07's clients, unverified). Sources: A (13, 10/11), 07, 02 (ask on sales calls). [04866413d08b] [3b5634f1c703] [83fd5d9ddc1a] [3f57d3484974]

**3F.8 Credibility fits the market; a doctor is not the default.** Condition: choosing a spokesperson or authority. Research who the buyer trusts; in some health markets the medical system is the enemy the buyer distrusts (09's Primal Queen example). Any expert must be real, qualified, consenting and disclosed. Sources: 09 (B), 12 ("use real doctors that actually exist"), 04 (people of prominence), 08 (pick a swipe whose credibility source you actually have). [1dee1f7972ec] [68ab05281912] [f798243cc16a] [8d0b230d2e81]

**3F.9** Moved to Appendix A.2: case studies and results rule, whose condition names B2B and high-ticket first.

### 3G. Offer presentation on the page (03-OFF owns the maths)

**3G.1 Show the saving in money, in the tier headline; never make the shopper do maths.** Condition: any bundle, multi-pack or discount. "3 pack: save $10", "5 pack: save $20", not "save 10%" in small body text. Cluster A reports +25% CR and +28.57% RPV from this change (1 client, no n) and "A/B tested a lot". Sources: A (10/11, 14, 24, 01). [fa82d767b952] [c8277a1ff908] [fd9d123726a1] [d436d80a4ccb]

**3G.2 Three bundle tiers, with an image of each tier and 1 honest badge on the tier you want chosen.** Condition: recordings show shoppers picking the cheapest tier or leaving. Cluster A: 5 tiers cut to 3 gave +53% CR and +13.5% AOV (1 client, no n); images on tiers +32% (same client); "Most Popular" or a benefit badge ("for faster results") on the target tier. The middle-option ladder (equal money saving per step up) came in the same test as a compare-at increase, so its lift (+11.74%) is not isolated and the anchor tactic is rejected (0.5). Sources: A (10/11, 24). Card caveats: cutting a tier can hurt a real segment; a too-attractive middle tier can cannibalise a higher-margin top tier. [d0db4bcd8f2f] [af10d9d13cab] [4638fcca1797] [530251f31987] [14136b82590a] [e8c3a0cb2c42] [needs brand data: tier mix and margin per tier]

**3G.3 Price is visible in the PDP buy box by default; moving it lower is a test only when a price objection is proven.** Condition: PDP. Cluster A's 1 client with a price objection versus competitors moved the price lower and put trust above it (+32%, then +88% cumulative, no n). Sources 22 (never name price in the advertorial CTA) and 12 (hold price to a second presell page) apply to advertorial funnels, not the PDP. See 7.4. [91a259fd4a85] [e0053984b930] [98430d1864cc] [7d6c89cc428f]

**3G.4 Anchor the price against a real comparison: the cost of the problem, the cost of alternatives, or a genuine sum of parts.** Condition: advertorials and sales pages. "$40 brush, about $3 a month, versus $6,000 in orthodontic repair" only with a sourced cost; PT sessions at $200 twice a week for 14 weeks only if that is what buyers really pay. Invented "suggested retail" prices and raised compare-at prices are rejected. Sources: 05, 06 (C), 10/11 (A, rejected part), 14 (A, "legitimate reference price"). [2bb1553ace82] [54399c0a8159] [e8c3a0cb2c42] [fd9d123726a1] [web check: reference pricing rules in the market]

**3G.5 Urgency and scarcity only when true, phrased as risk not as an invented count.** Condition: real sale end dates, real same-day dispatch cut-offs, real limited stock. "Due to high demand, high risk of selling out" beats "only 7 left" when the count is not live; a countdown only for a real deadline; a stock claim only from live stock data. Sources: 09 (B, and it shows a page with "most likely fake urgency" as good, which is rejected), 05 (urgency bar "only if true"), 06, 12, 19, 22 (reject their unverified lines). [ba6079d8e9e9] [6aa1da717dab] [cb940d13cea9] [needs brand data: stock levels, promo calendar]

**3G.6 Present the guarantee as confidence, designed for the buyer's real risk, and repeat it beside every buy CTA.** Condition: a guarantee exists and ops can carry it. Structure beats length; state 1 clear policy that matches the store's terms word for word (19's example page mixed "100% satisfied", "110%", "no questions asked", "results or you don't pay"). Sources: 09 (B), 19 and 06 (C), 05, A (01: only if you have one; otherwise use the slot for proof). [982828a9eb80] [651985640c1d] [54399c0a8159] [090226c382a3] [needs brand data: refund policy and refund rate]

**3G.7 Exclusivity ("not on Amazon, not in stores") only when checked live.** Condition: the product really is not sold elsewhere. Source 05 says it brings back distrustful readers; unverified. [090226c382a3] [web check: marketplace listings for the product]

**3G.8 Two-options close: give the reader a way out, then position the offer as the better path.** Condition: end of a sales page or advertorial. Option 1: leave and keep the problem; option 2: try it risk-free under the guarantee. Restate discount and guarantee beside the last CTA. Sources: 19 and 06 (C), 05. Page-only price scarcity in the close is rejected unless enforced. [e893c433c3b8] [54399c0a8159] [090226c382a3]

**3G.9 Build a real-time low-stock display wired to live inventory, never a static or randomised count.** Condition: a SKU genuinely close to selling out, with stock data the page can read live. 3G.5 [ba6079d8e9e9] bans fake scarcity but does not design the UI itself; the display is `[general practice]`.

### 3H. Navigation, footer and exits

**3H.1 Strip nav only on 1-campaign pages; keep Shop reachable elsewhere, since a lost visitor is a lost repeat purchase, not a lost lead: logo, 1 CTA (and a phone number for service brands), sticky; policy links required by law stay in a small footer.** Condition: single-offer campaign pages, lead-gen pages, advertorials, quiz result pages. Cluster A's area map found the nav taking 33.2% of clicks and testimonial links 3.28%; source 02 says every about-page click is paid for. Remove LinkedIn or website links inside testimonials and linked "featured on" logos; if proof is clicked, anchor to the on-page review section. Sources: A (01, 14, 13), 02, 12 and 17 (remove exits at the buy box). See 7.1. [89e1eb35d667] [e95750b86b05] [e225b45e3d43] [159090e7a12d] [cb722cd52538] [a7e987adb7a8]

**3H.2 Storefront PDPs, collections and the homepage keep navigation, cut to 7 items or fewer, visual, with the Shop menu exposed.** Condition: pages that are also organic entry points or browse paths. Remove items near 0% of clicks (expect 2 to 3), remove "Home" (the logo goes home), move About, Contact, Blog and FAQ to a sub-menu or footer in smaller text; nested menus for large catalogues, but no extra click to reach the shop. Sources: A (14, 24, 10/11), 02 card (keep delivery, returns, support and policy access; test removal on campaign traffic only). Removing FAQ from the nav is safe only if the answers live on the PDP. [bc8e0b03fd58] [d9c4d43e2810] [511b0c6e9e86] [be1f562f3042] [needs brand data: nav click share per item]

**3H.3 The cart drawer opens on add to cart, holds the basics, and never reloads the page.** Condition: any store. Contents: items, higher-tier option, a few minor upsells or cross-sells, an honest free-shipping or discount progress bar (margin modelled first with 03-OFF), a clear next step. A cart "where everything screams at once" is stripped down. Sources: A (24, 01). Source 24 says always use a drawer; some brands send shoppers straight to checkout and the source gives no test, so treat the drawer as the default and test. [af92a8953b92] [d436d80a4ccb] [verify UI: theme cart drawer support]

**3H.4 Pop-ups fire on intent, never in the first 3 to 5 seconds.** Condition: discount or email pop-ups. Triggers: exit intent (desktop mouse; mobile behaviour must be checked in the tool), right after add to cart for shoppers who have not checked out, or at the scroll depth where the heatmap shows drop-off ("Need help deciding? Here's 10% off"). Judge on sales, not pop-up views. Cluster A claims "up to 125%" from timing alone (no case, no n). Discount conditioning and margin are 03-OFF's call. [396f2ef27e9e] [82c9c48592fe] [verify UI: pop-up tool triggers on mobile] [needs brand data: scroll-depth map, margin]

**3H.5 Remove false affordances and dead controls.** Condition: any page with click data. Elements styled like buttons that go nowhere (logos with borders, ratings) draw rage clicks: make them real internal links or make them look inert. Controls under about 1% of clicks (wishlist 0.09%, "call an expert" 0.36%, a "show" filter at 0.74%) are removal candidates, with the caveat that low clicks do not always mean low value (size charts, returns, support). Sources: 07, A (01, 10/11, 24). [bfbcb883a414] [47c52d23ae2e] [c6a46a3c8964] [d0db4bcd8f2f]
### 3I. Mobile rules

**3I.1 Build and review mobile first.** Condition: every page. Source figures: 64% mobile, 3% tablet, 33% desktop (02, his own site); about 80% mobile (07, 1 client); "99%" (05, no data). Read scroll maps on mobile first. Use the brand's own split. Sources: 02, 05, 07, A (01, 14). [38729fdb61c9] [3491a4f0a0d9] [50b30a244eb6] [98544575e3db] [needs brand data: device split per page]

**3I.2 The pinned PDP CTA shows live price and saving, updates on variant tap, never covers the size or shade selector; CTAs sprinkled down the page on desktop.** Condition: long pages. Source 02: 1 bottom-pinned CTA that jumps to the form; cluster A: sticky nav CTA plus phone on lead pages; source 12: 1 floating CTA can replace the 4 in-page CTAs on an advertorial; source 22: show the sticky button only after the product introduction on a story page. See 7.6. A repeated or sticky CTA must not skip a required choice (size, shade). [622577c84cdc] [89e1eb35d667] [65c6cbb0e670] [340d4991b51b] [ae06c62a4a73]

**3I.3 Nothing critical hides behind a carousel, accordion, tab or drop-down on mobile, above all reviews.** Condition: every page. Sources: A (25, 01). Card adds accordions and tabs. SEO text may hide in accordions on pages that must rank (02). [4514239a3d5e] [79b4db61ba63] [de1cd5d08ee6]

**3I.4 Shrink the chrome: no oversized logo or announcement bar burying the headline and button.** Condition: mobile hero. Source: A (10/11). [5d7260153d8b]

**3I.5 Forms on mobile: labels stay visible (separate label from placeholder), 1 full-name field, 4 fields or fewer, progressive disclosure where the tool allows.** Condition: lead forms and quiz capture. Sources: A (01, 13). Progressive disclosure has no test data in the sources. [f391cf14459a] [50c99cc00c00] [78edd0e14e2f] [verify UI: form tool conditional fields]

**3I.6 Check every width in the browser's responsive mode, and check tap targets, overflow and the pinned CTA.** Condition: before traffic. Source: 02. Procedure 4.17. [38729fdb61c9]

**3I.7 Page weight is a conversion problem: heavy images, video and widgets go to 08-SPD before launch.** Condition: every page. Source 02's unnamed study (1 second load at 3.05%, halving by 2 seconds, about 20% of that by 4 seconds) is uncited; the working target is under 2 seconds on mobile and never over 4. Sources: 02, 09 (B: ugly, fast and clear beats heavy and pretty), A (01: builders add weight). [4d6326770c4b] [fdc8482e2d86] [1e9621a4c281] [64e822fe1ad0] [web check: the load-time study]

### 3J. Page length by traffic warmth

**3J.1 Scale page length by SKU tier (hero, core, tail) for a catalogue brand, not one house style for every product; length still follows warmth and selling load, not a word count.** Condition: every page. Cold, unaware or problem-aware traffic from a click-only ad: long page with many value prop and proof sections, pain section near the top, product later (3B.4). Warm traffic from a long ad, a VSL, retargeting or search: short page, product and offer in the first screen. Sources: 21 (the congruency rule), A (01, 14, 25: long pages do not kill conversion, bad structure does; 60% "never scroll" is unsourced), 02 (less copy for high-intent search lead pages), 09 (B: as long as it needs to be, no longer), 06 and 19 (C: long, with deliberate repetition of 3 to 5 pains and desires), 22 (native ad traffic: shorter, more CTAs), 18 (post-quiz page short and proof-heavy). See 7.2. [ffdf5c3a30ff] [4514239a3d5e] [de1cd5d08ee6] [9246e69228b5] [4da8204c9b2b] [4c990d3bdb82] [needs brand data: scroll depth and conversion by page length]

**3J.2 Every section must move the visitor 1 step closer; cut any section that does not.** Condition: long pages. Sources: A (25, 15: the page is a machine, not a checklist). [4514239a3d5e] [13c8f4c9d77e]

**3J.3 Repetition of the core 3 to 5 pains and desires is deliberate on cold long-form pages, and pushy on short or premium pages.** Condition: problem-solving products with a felt pain. Sources: 06 and 19 (C, "do not be scared of repetition"); the card caveat and the brand voice rule bound it. [4da8204c9b2b] [70ebc6c92534] [needs brand data: brand voice limits]

### 3K. Advertorial and presell page rules (brand-hosted)

**3K.1 Research inputs come before any advertorial draft.** Condition: every advertorial. Minimum set: current state (pains, daily frustrations, current beliefs about the cause), desired state (goals, the specific moments they want back), the 3 to 5 biggest pains and desires, every alternative tried and why it failed (including doing nothing), the top 5 objections, the real root cause and the real mechanism with its evidence, 10 to 20 real review quotes, the persona (1 age, 1 gender, 1 problem, 1 duration where the format uses one). Cluster B's 4 documents (research doc, avatar sheet with a quote bank, offer brief with awareness and sophistication and mechanism, 4 to 6 "I believe that" necessary beliefs) are 1 way to hold this. Sources: 06 and 19 (C), B (09, 16, 23), 03, 12, 22, 08 (extraction battery). [5f8bf0a170d8] [4da8204c9b2b] [0106fc07ad6a] [4d2414f0f91d] [34a2012a9531] [22ce9222dfea] [a7a83f2d6fb7]

**3K.2 Rank candidate pains on urgency, scale and relevance, and lead with the top one; fold small urgent pains in as secondary benefits.** Condition: the product could lead with several problems. Source 03 (its card 8a3302c0a9fb says "urgency only"; the talk weighs all 3). In a crowded niche, pick an under-served sub-avatar instead of the category's top pain (05: parents of kids with braces cut his CPM to about $20; 1 account, no test). [37c5cec3fd92] [a95896b77075] [53d57d05d296]

**3K.3 The big idea sits where product uniqueness, the market's live debate and the chosen prospect overlap; if the 1-line angle could belong to a competitor, it is not unique enough.** Condition: every advertorial angle. Source 03; card 5737588f8a37 adds the competitor test. Give every product component a truthful reason (why this form, this source, this dose). [a7a83f2d6fb7] [5737588f8a37]

**3K.4 Name the mechanism with the pack's own ingredient words, so the story never outpaces the label and unboxed product; it maps 1 to 1 to the root cause, uses the reader's existing mental sketch, and has as few causal steps as possible.** Condition: every advertorial. A metaphor must match the mechanism's real action (a clogged filter is flushed, not mopped). "Only this combination works" only when true. Sources: 06 (C), 03, 19 (C), 12, 09 and 16 (B), 22. Invented mechanisms (12's "molecule from eating plastic", 22's "RTP") are rejected. [c916e37c3b02] [66470c34199d] [45720eb59c92] [46b86014e059] [67d1415b8bc7] [needs brand data: real mechanism and its evidence]

**3K.5 Every advertorial commits to 1 editorial frame and holds it to the end.** Condition: every advertorial. Frames (03's 10): breaking news or discovery; authority or expert breaking down an issue; David vs Goliath; warning; scandal or whistleblower; social proof ("why everyone is talking about"); origin discovery; comparison ("I tested 5"); local or relatable; scarcity or exclusivity. Source 12's 6 formats map onto these (storytelling, authority expert, buyer's guide, scandal, case study, reasons-why listicle). A "Warning" must warn about something specific; bolted-on clauses ("and why X, Y and Z won't fix it") are cut. Missing identity is "the number one issue" 03 sees. Fear and whistleblower frames raise claim risk; an invented insider is rejected (16). [44bf08d46ea9] [2920ab7bf3d2] [68ab05281912] [5c8995960ecb]

**3K.6 Universal block order for a brand-hosted advertorial.** Condition: any frame; adapt the lead per 7.3 and 7.9. Merged from 12 (10 blocks), 06 (10 sections), 05 (20 blocks), 19 (about 11), 22 (M-S-T order), 03 (expert-confession example), 08 (swipe skeleton):
1. Disclosure label ("Advertisement") at the top, plus any urgency bar only if true (05).
2. Headline in the chosen frame (3C.3) and a subhead that adds the mechanism or a proof stat; hero image that shows the problem or the transformation (05, 22, 06: image, byline and trust line only with real people and real press).
3. Lead: for cold click-only traffic, a mirror of the reader's situation told as a story from a tiny concrete moment (06's "I couldn't hook my own bra"), with proof and curiosity woven in (03), with permission softeners ("maybe you've tried", first or third person) (03); for warm traffic, the product in the first lines (21).
4. Agitation and the cost of inaction: the life shrinking in concrete steps (06), pain threshold (19), symptom list in the avatar's words (05), 3 to 5 pains repeated in different forms.
5. Why nothing else worked: each alternative the reader tried and its honest limit, including doing nothing and the expert path (06, 12, 05's common enemy as a method or tool, 22's failed solutions). No unsupported claims that competitors fail or that a retail product replaces professional treatment.
6. Root cause: the new, supportable "why" that reframes blame onto the tool or the situation, not the reader (06, 05, 03's "not your fault", 04's villain only if defensible).
7. Mechanism and product reveal: named, mapped 1 to 1, each feature tied to the cause, the reason only this form works if true, origin story if real, first CTA soon after (12, 06, 19, 03).
8. Proof stack: mechanism proof, social proof (real reviews, 1 per objection), demonstration, a real customer's timeline with its limits (06's day 1 to day 14 only if documented), fast-results and user-count claims only if provable (19).
9. Objections: risk, price, time, safety, "why hasn't my doctor told me", "why not Amazon", "will it work for someone like me" (12, 06, 05, 16).
10. Offer, price context and guarantee: price anchored against the real cost of the problem or alternatives, the real offer, the guarantee stated once and clearly (05, 06, 19); or, in a 2-page presell, the offer held to the next page (12, 22; see 7.4).
11. CTA: soft, medium or hard layered (12); "check availability" only if stock is limited (19, 22); benefit or outcome wording otherwise (06: "get yours back").
12. Late pain-threshold section, more proof, second CTA (19).
13. Two-options close with a way out (19, 06, 05).
14. Author or brand sign-off that is honest (a real author bio under the CTA per 22; never a "review team" persona per 19), a real comment or FAQ block (never fabricated per 06), and the disclosure again.
CTAs: about 4 across the page (after the hook, after the mechanism, after the proof, after objections and guarantee) or 1 floating CTA (12); the first CTA after the risk reversal in 19's example; "earlier CTAs" is 03's own fix to its draft; 2 CTAs around the author bio in 22. [7d6c89cc428f] [5f8bf0a170d8] [2bb1553ace82] [79e0f9206043] [47a0c05d4614] [720bfa12f751] [65a962dc4285] [65c6cbb0e670] [cb940d13cea9] [e893c433c3b8] [5970767eda77] [ff648126e918] [20262eb9059c]

**3K.7 The hook and headline are the section to test hardest.** Condition: every advertorial. Test order: format, then headline, then the position of the first proof block, then CTA style only with thousands of visitors a day (12). Cluster B calls the headline "90%" of a split test's weight (opinion). Sources: 06 (C), 12, 16 (B). [d107bfda3ceb] [82a0e9f86e18] [3bcd4bbc9ddb]

**3K.8 The story never stops for a pitch; the product moves the story forward.** Condition: story-frame advertorials. Audit for the sentence where story turns to selling; each is "a place someone closed the tab" (22, opinion). The reader should feel sold to by no one at the product reveal. The soft-sell device "my doctor asked where to get it" is used only if a real person said it. Sources: 22, 06 (C), 03 (symphony of copy blocks). [bf3e5b98a5c7] [98430d1864cc] [046994a8d7d8]

**3K.9 Write the after state first and build backwards; spend real length in the before state.** Condition: transformation stories. The reader ends with hope for a problem they have had for years. Source 22; 06's "life shrinking" ladder is the before state. [33e80017536a] [20262eb9059c]

**3K.10 Subheadlines stand alone and tell the story in order; images repeat the paragraph above them; native traffic gets a shorter page with more CTAs.** Condition: every advertorial. Sources: 03 (subheads), 22 (images, native), 12 (write in blocks). [48b68b595955] [146a5b208b74] [a5a6310c4758]

**3K.11 Model a live advertorial's structure, never its content, and pick a swipe whose credibility source the brand actually has.** Condition: any swipe use. Find swipes in ad libraries, sponsored slots on news and weather sites, affiliate hubs; in and out of niche. The prompt "make it exactly like this one" is rephrased to "follow the section order and pacing; write all copy from our facts". Sources: 08, 12, 16 (B), 21. [8d0b230d2e81] [0be867d0a8b8] [fc318bc5a7c9] [64349a706993]

**3K.12** Moved to Appendix A.1: publisher-hosted sponsored content rules (source 26 only), kept separate from brand-hosted presell pages.

### 3L. Quiz funnels

**3L.1 Every question earns its place: it changes the recommendation, gives research the team will read, or does 1 of cluster B's 3 jobs (micro-commitment, seeds a needed belief, pre-handles a real objection).** Condition: every question. Cut questions with no job. Sources: 23 (B), 17 (card), 18 (C?). [62b402dc7dc6] [58789a695fea] [b73a7db33bae]

**3L.2 The first 3 questions are the hook; test them before anything else.** Condition: every quiz. Source 18 measured the share of starters who pass question 3 (illustration: 70% vs 85%). Judge hook tests on downstream purchase or RPV too, since more throughput of low-intent takers can lower purchase rate. [5b8e0e66fb00]

**3L.3 Open with the least invasive, most important question (usually the main goal) and put personal or demographic questions later, unless the demographic changes the recommendation.** Condition: personal or health topics above all. Source 23 (gradualization); source 17's example opens with age, gender and body type because they change the plan; its card says skip demographics that do not affect a valid choice. See 7.7 note. [25ad02d8040c] [4a5a01ce29d7] [58789a695fea]

**3L.4 Rotate input types; never more than 2 or 3 of the same format in a row; avoid typed input at launch; give visible tap feedback without heavy effects.** Condition: every quiz. Types: image choice, single choice, multi-select, slider, yes or no, numeric only where a number drives the result, a date only if timing changes the recommendation. Sources: 23 (B), 17. [1081c0601454] [ce1ad833b2ec] [b73a7db33bae] [5f24ab9d9d72]

**3L.5 Put an info or nurture screen about every 3 to 5 questions, and make each one give real value that reflects the answers so far.** Condition: quizzes longer than about 6 questions. Content: how the method works, authority (real), social proof (real), a normalising "you're not alone" screen after a failure question. Any "you drink more water than 50% of users" line needs a real measured base; any projection, graph or loading screen must be a real calculation, never a simulated one. Sources: 17, 18 (C?), 23 (B: intra-quiz cards, no frequency). [2e104f23d8b2] [4c990d3bdb82] [d20c2b44905c]

**3L.6 Length: start at 8 to 12 questions (range 3 to 20) for a product quiz; only go to 15 to 25 or beyond when nurture screens carry education and the category is problem-solution.** Condition: see 7.7 for the 3 sources' positions. A 3-question quiz before a sales page "seldom" failed for cluster B (no numbers). [c9f4734eacf6] [4c990d3bdb82] [a7e987adb7a8]

**3L.7 Ask what they tried before and what routine is realistic; use the answers for the recommendation and read the awareness stage from them.** Condition: every quiz. Mostly "haven't tried much" means top-of-funnel traffic; mostly named failed products means middle to bottom. Sources: 18, 17, 23. [3c016be4d254] [6bd33483c267] [56f4e8549a30]

**3L.8 The results page shows the shopper's own answers back, the rule that links them to the recommended SKU, size or bundle, then product details, price, real reviews, delivery and returns, and 1 buy button; no exits at the buy box.** Condition: every quiz. Keep summary, product and price consistent; let the shopper correct a consumption assumption; a timer only for a real deadline. Sources: 17, 18 (short and proof-heavy), 23 (B: no results-page detail). Personalisation must be real: the same SKU for every answer while claiming a match is rejected (18 suspects the hair brand of this). [d20c2b44905c] [a7e987adb7a8] [4c990d3bdb82] [4d9eb8148c84]

**3L.9 Route by answer where a page and offer per pain point exist; branch the follow-up email by answer; export answers and report every 100 submissions, at least twice a month.** Condition: quiz tool integrated with the email platform. Most-picked pains become ad angles (hand to 10-MCR). Sources: 18, 23 (B), 17. Email content goes to 14-EML. [11555797742f] [a8aab5b91a98] [71392b19ec6c] [b800e9ca6a61]

**3L.10 Email gate: decide by KPI, take marketing consent as a separate choice, and test gated vs ungated.** Condition: every quiz. See 7.8. [3269b97e0ba6] [a7e987adb7a8] [b800e9ca6a61] [web check: consent rules in the market]

**3L.11 Judge a quiz on completion and downstream purchase together.** Condition: every quiz. Cluster B's target of about 30% completion (25% still good) does not define the denominator and does not match its own 1 to 2% per-question drop-off illustration (which would give about 77% over 10 questions). Define completion as completers over starters, expect at least about 1% drop per question, look for the spike question, then compare quiz-path purchase rate and RPV against direct-to-PDP on the same traffic. Sources: 23 (B), 18, 17 (cards). [cb45dd220b9b] [2e104f23d8b2] [needs brand data: quiz starts, step views, completions, purchases by path]

**3L.12 Draft the quiz with AI from the research base, not from the founder's beliefs or a swiped quiz, then review every question's job and every claim.** Condition: new quiz. Sources: 18, 23 (B). [11ad5d80b42f] [9f7d25ae19bb]

### 3M. Sales page, order page and post-purchase offers (source 09, cluster B, unless noted)

**3M.1 Judge a sales page by conversion rate and AOV, and every funnel step by contribution per buyer, not take rate.** Condition: DR funnels. [694b21ec8c19] [ea7e5b13b044] [needs brand data: COGS per SKU]

**3M.2 The sales page has 8 must-haves: benefit headline scored on 7 traits; real urgency; real scarcity; a guarantee designed as risk reversal; the unique mechanism of the problem and of the solution; embedded testimonials each with a job; an FAQ that handles objections; credibility the market trusts.** Condition: outcome-led sales pages. Card placements (mechanism after headline and problem, guarantee near checkout, credibility near payment) are card additions. [9246e69228b5] [ba6079d8e9e9] [982828a9eb80] [67d1415b8bc7] [cc5d84e31feb] [1dee1f7972ec]

**3M.3 Copy plus media carry the sale; design matters only when it slows the page or blurs the message.** Condition: DR sales pages. Source 12 agrees ("ugly design can print if the copy rests on real research"); cluster A disagrees for high-ticket ("no one spends $5,000 on a page that looks poorly put together"); 02 calls design a binary trust check in about 50 milliseconds. Rule: clear the trust bar with a familiar, clean layout, then spend the effort on copy, proof and offer. See 7.18. [1e9621a4c281] [a5a6310c4758] [338245ec724b] [8d4d6395709d]

**3M.4 The order page has 1 goal: the least friction between the buyer and a completed order. Card fields obvious, quantity breaks, 1 or 2 low-price order bumps as checkboxes, plain design, fast.** Condition: custom order pages. Order bumps must deliver a real service and be priced against that SKU's own contribution per buyer, not a fixed price band; "shipping insurance" or "expedited shipping" that changes nothing is rejected. Source 09's price and take-rate recollection is demoted to Appendix A.4. [f965f0b7466d] [f3e8514c33f7] [web check: Shopify checkout options; consumer rules on shipping fees]

**3M.5 The post-purchase offer (OTO) goes to the buyer at peak emotion: 1 product chosen as more of the same or as the solution to the next problem the first product creates; VSL or text format; price it by contribution per buyer, not a fixed multiple of the front-end price; route yes to OTO2 and no to a down-sell.** Condition: consumables and products with a natural next problem; poor fit for one-off durable goods. Manufactured "next problems" are rejected. Common practice uses lower-priced complementary add-ons. Source 09's "10x front end" heuristic is demoted to Appendix A.4. [9f5970096a05] [ea7e5b13b044]

**3M.6 A soft first ask beats a high-friction first ask on cold paid traffic.** Condition: lead-gen and service funnels. Collect simple information before a calendar booking (14, A); progressive disclosure on forms (01, 13, A); scroll the hero CTA to an on-page form instead of a separate page (13, A: +220% in 1 test, no n). Lead-gen rules; store equivalent is the cart drawer and express checkout. [ae06c62a4a73] [45c2e59e672b] [50c99cc00c00]

### 3N. Research inputs before a build or audit

**3N.1 Pull that SKU's own GA4 and Clarity numbers, not a site average, since 1 slow SKU can hide behind a healthy brand rate; back each change with 2 to 4 data points; quantitative shows where, qualitative shows why.** Condition: any live page. Under about 25,000 to 30,000 visitors a month per page (cluster A) or 50,000 to 80,000 a month for the store (07), quantitative data alone is thin, so add user tests, surveys and review mining. Sources: 07, A (01, 15), 02 (you are too close to your own page). [7d3a4c37853c] [6f6f47a38de3] [19ceeeff7acf] [75d6c6bbb420] [d77e97941d57]

**3N.2 Fix the weakest GA4 funnel stage first.** Condition: store audit. Source 07's bands (unsourced "industry benchmarks"): view product 50 to 70%, add to cart 12 to 20%, begin checkout 40 to 60%, purchase 45 to 60%; view product is the weakest stage in "90 to 95%" of his audits; a low purchase rate on Shopify usually means unexpected costs. Check GA4 event mapping before trusting any rate. [f258739c8f9c] [needs brand data: GA4 purchase journey, 6 to 12 months]

**3N.3 Read scroll maps mobile first at the average fold, 75%, 50% and 25% lines; a key section reached by about 30% moves up; a 50% drop right after the fold means the fold is leaking.** Condition: any page with Clarity, Hotjar or PostHog. Sources: A (01), 07 (only 32% reached a logo strip; 36% reached add to cart on a PDP; about 10% lost per 2 products on a collection). [98544575e3db] [a88919c97b72] [ac46f2bf0ebf] [e03f2284af5e]

**3N.4 Read click and area maps as clicks versus intent: what is clicked now, where you want clicks, what design change moves them.** Condition: same. Cluster A's benchmark: each CTA about 3 to 5% of page clicks (share of clicks in the area map, no basis given); a CTA getting fewer clicks than a testimonial near the top is a red flag; a text-only CTA got 0%. Sources: A (01), 07. [e225b45e3d43] [bfbcb883a414] [c7160f33c310]

**3N.5 Watch converted sessions first (filter by the thank-you or order-confirmation path), then rage clicks, then recordings sorted by clicks, and log patterns across many sessions.** Condition: same. Recordings are for spotting anomalies people repeat (colour swatch far from the image, back-and-forth scrolling); split tests are the evidence (02). Sources: A (01), 07, 02. [19ceeeff7acf] [ee5a74cd7f5c] [63d3f8c37b06] [d77e97941d57] [f31e01f03e62]

**3N.6 Run 3 to 5 think-aloud user tests with a first-impression question before any scroll, task-type prompts, "walk through your thought process" reminders, graded screening questions, and re-run the same tasks after changes.** Condition: any page, and required under the traffic thresholds in 3N.1. Ecommerce tasks: search, find the right product, add to cart and check out, overall impression. Sources: A (01, 15), 07. UserBrain cost about $45 per tester at 01's recording. [1255665f3d67] [e7747485521b] [75d6c6bbb420] [10b436ef5145] [web check: UserBrain price]

**3N.7 Mine reviews and surveys into topics, motivations, values and anxieties; pivot counts separately for positive and negative; feed the top topics into copy, proof choice and tests.** Condition: every new page. Post-purchase survey right after purchase; mid-session friction survey at about 60% of average session duration, watching that it does not cut conversion. Sources: 07, A (10/11), B (09), 15. [1f3ae96ccb10] [3b5634f1c703] [0d65f4f7da9f] [0106fc07ad6a]

**3N.8 Compare device, entry path and landing page anomalies before touching layout.** Condition: store audit. Examples from 07: desktop 1.4% vs mobile 0.84% and RPV 2x; the same product at 1.53% from the homepage URL vs 1.29% from the collection URL; a top PDP at 44 seconds engagement against about 1 minute wanted. Path loops (home to collection to home, about 15%) mean findability problems. [50b30a244eb6] [8f90616b8da5] [cbe719818c7a]

**3N.9 Read the market stage off years of category search trends overlaid with brand terms, and cross-check with revenue.** Condition: choosing clueless, curious or saturated framing. Source 04. Search interest is attention, not sales. [b7d24be2fa78] [2a1909cea73f] [web check: Google Trends for the category term]

### 3O. Test design and how to read the sources' lift claims

**3O.1 This agent proposes tests; 09-CRO designs, sizes and reads them.** Condition: always. The proposal (9.5) carries hypothesis in "if X, then KPI, because rationale" form, the primary metric, the page and traffic, the pre-registered decision date, and the sources' prior with its weaknesses. [6f6f47a38de3] [1bedb6cc7753]

**3O.2 Set the floor per page: a homepage may clear it while long-tail PDPs never do, so most PDPs default to before-and-after; otherwise ship on data and measure over time with a rollback plan.** Condition: per page. Cluster A's cut-offs: 25,000 to 30,000 visitors a month per page (01); under about 1,000 a week you cannot run 1 test a week (20); 10,000 to 20,000 a month clients get before-and-after changes read in Clarity (20, admitted not a true A/B test). Source 12: CTA-style tests only with thousands of visitors a day. None of these is a sample-size calculation; the real requirement depends on baseline rate and the smallest lift worth detecting (15: use a calculator). See 7.11. [5b56dd4acd81] [bfdcedabc90c] [220ec901e95b] [65c6cbb0e670] [needs brand data: weekly sessions and orders per page]

**3O.3 Test order: above the fold first (headline, then hero image, then proof and FUD placement); 1 element at a time where traffic allows; bundle changes into 1 bigger test where it does not; set the primary metric and decision date before launch; keep visitor assignment consistent; do not stop early; freeze other page changes during a visual test; record wins and losses; double down on a win before switching topics.** Condition: every test. Sources: A (20, 10/11, 01), 12 (format, headline, first proof position, CTA style), 02, 15, 07 (PXL scoring). [3baf2881eea1] [cb7820a5960b] [51c0c6b48e3a] [de130801d763] [91a259fd4a85] [82a0e9f86e18] [4239f2807a97]

**3O.4 Count conversions on a confirmation page or a deduplicated success event; keep quiz and signup completions apart from purchases; judge on purchases, RPV and contribution, never on click-through or completion alone.** Condition: every test. Sources: 02, 07, 06 (C), 17, 23. [a835b362c4f5] [9ffcba120b24] [2296ba94b6ea] [5f8bf0a170d8]

**3O.5 Read every lift figure in this folder as an example, not a prior.** Condition: always. No source gives a sample size, duration, device split or significance for any result. Most big lifts bundle many changes (132%, 108%, 187%, 142%, 174%, 282%, +64% with +52% RPV, "upwards of 80%") or come from a weak starting page. Single-change results (+53% tiers, +25% savings label, +32% bundle images, +32% infographics, +30% badges, +38% logo quotes, +15% visual nav, +78% hero image, +220% same-page form, +18% category thumbnails) are each 1 client, reported by the agency that sold the work. Section 6 marks each one. [ff47a06fdb3a] [4d8daca6320c] [e4ed90b85412]

**3O.6 Testing compounds, and CRO results are customer research that travels into ads and positioning.** Condition: a steady cadence. Sources: A (20, 01, 10/11), 15 (no ceiling; the page that got you to $1M will not get you to $10M). [48195b82871f] [fe0b0cc42e76] [587103c3bbc8]

### 3P. Build and QA before traffic

**3P.1 Offer and copy are finalised before design; design is built around the copy.** Condition: every build. Sources: A (15), B (09), 12. [72fd0e79eb5c] [1e9621a4c281] [a5a6310c4758]

**3P.2 Build stack is the brand's choice; the agent hands a wireframe with copy, not a theme.** Condition: every build. Named stacks in the sources: WordPress plus Elementor on Flywheel (01), an AI coding agent deployed via GitHub and Vercel (02), PageFly or GemPages custom HTML with theme header and footer hidden (05, 21), Funnelish, Checkout Champ, Zipify (12), Lovable (03), a Fiverr or Upwork builder for $100 to $200 (12). All `[verify UI]`. [64e822fe1ad0] [7091bbdbaa48] [2424ba647b51] [3491a4f0a0d9] [a5a6310c4758]

**3P.3 Before traffic: message match, claims audit, disclosure label, policy match, price and offer match on every step, tracking events fire once, variant routing verified in a private window, mobile widths and pinned CTA, speed target, and a proofread (05 shipped double dollar signs and typos).** Condition: every page. Procedure 4.17 and checklist 5.8. [a835b362c4f5] [2f79f41a6063] [28056fad0269] [cb940d13cea9]

**3P.4 Launch, read the first 48 hours for page-to-page click-through and CPM or CTR anomalies, then optimise step by step where the funnel loses people.** Condition: presell funnels. Source 12's targets (30 to 40% first page to next page, 70 to 80% second to third, about 15% at a Checkout Champ checkout) are his own, with undefined denominators. [82a0e9f86e18]

**3P.5 A landing page is a living asset: elements are added as proof arrives, and a found winner runs for years.** Condition: always. Sources: 02 (winners ran 5 to 7 years; 40 to 60 pages tested to find one), A (10/11: never one and done). [45546f922308] [51c0c6b48e3a]
## 4. Procedures (implementation)

Each procedure states goal, preconditions, steps, a check after each step, and rollback. Tool steps that can change carry `[verify UI]`.

### 4.1 Pre-build brief (every page)

Goal: a 1-page brief that fixes audience, pain, outcome, awareness, page type and conversion event before any copy. Preconditions: brand record and traffic data available. Sources: A (01, 15), 04, 12, 21. [fff98a4880b0] [10b436ef5145] [2a1909cea73f] [0623f1ad4849]
1. Who is the page for: 1 persona (age band, gender if it matters, situation, problem, problem length). Check: it matches real buyers the brand wants more of, not a guess.
2. What pain or desire brings them: from reviews, tickets, surveys, ad comments. Check: at least 3 verbatim quotes attached.
3. What they are trying to solve or achieve: functional outcome and emotional outcome. Check: the "so that" chain ends at something concrete.
4. Awareness stage of the traffic that will land here: unaware, problem, solution, product, most aware; or clueless, curious, saturated for the category. Check: named by traffic source with the ad or search term attached.
5. Page type and the 1 conversion event (add to cart, order, quiz completion plus purchase, form). Check: 1 event, and the tracking event or confirmation page that counts it exists.
6. The ad's exact promise, hook, persona and offer, pasted in. Check: the headline plan repeats the promise.
7. Proven angle status: for an advertorial, which ad won and its 4 variables (avatar, desire, angle, mechanism). Check: if none, route to 10-MCR for angle tests first, or mark the page as research-only.
8. Constraints: substantiated claims list, banned claims, policy terms, price and offer, stock, brand voice. Check: each item has a source in the brand record or is marked `[needs brand data]`.
Rollback: none; the brief is a document. If step 6 or 7 cannot be filled, do not proceed to 4.2.

### 4.2 Write the hero (cold landing page or campaign page)

Goal: the first screen per 3C.1. Preconditions: 4.1 done. Sources: A (01, 13, 14, 15, 25, 20), 09 (B), 03. [4fb1b734b296] [ec11504efa22] [12c3e5742646] [59be84f0758c] [9246e69228b5] [e0053984b930]
1. Draft 5 to 10 headlines from the formulas in 3C.3; mark which mirror the ad promise. Check: each passes the 5-second who, what, what's in it for me test, states an outcome not a category, and contains no number the brand record cannot back.
2. Score each on the 7 traits (3E.2); keep those at 3 or more; add an eyebrow line for a missing trait. Check: no more than 1 curiosity element per headline.
3. Write the subheadline: pain then mechanism then USPs, or the how. Check: it does not repeat the headline; it names the mechanism or what is different.
4. Write body copy of 2 to 3 sentences or 3 to 4 bullets. Check: quantify only true numbers.
5. Pick 2 proof forms that are relevant and verifiable. Check: source platform shown; review count only if it is not thin; press logos carry quotes.
6. Write the CTA label as an outcome or a task. Check: blur test passes in the wireframe; 1 CTA only (or a justified dual CTA per 7.12).
7. List FUD reducers from the policy record and place them under the CTA. Check: each matches the policy word for word.
8. Pick the hero image or video: transformation, user in the outcome, product in use, or a proof collage; real product photo where the product shows. Check: with the copy hidden, the image alone says what is sold and the promise.
9. Set hierarchy: headline largest and boldest, body lighter, CTA in the accent colour; check the mobile fold has no empty block before proof 2.
10. If AI is used for headlines: paste the page copy, "do not do anything yet", then the headline prompt, then "make these benefit oriented and direct response", then "no em dashes"; iterate; check every claim (01, 14). `[verify UI]`
Rollback: keep the current live hero as control; the new hero ships only as a test variant (4.16) or after 4.17.

### 4.3 Section-order wireframe with copy (cold landing page or campaign page)

Goal: a section-by-section wireframe with headings, body, proof and CTA per section (deliverable 9.2). Preconditions: 4.1 and 4.2. Sources: A (01, 14, 15, 25, 13), 07. [e296505d973c] [72fd0e79eb5c] [ecc54f71873d] [ae06c62a4a73]
1. Decompose the offer into its parts (every unique component of how the outcome is delivered; 15's personal training example listed 8). Check: no 2 parts say the same thing.
2. Choose the order from 3D.1 (problem-aware) or 3D.2 (solution-aware) or 3D.3 (product campaign). Check: the order is written down with the reason (awareness).
3. Write the pain section in the format that fits (3D.6). Check: problem, agitation, solution all present; agitation stays inside brand voice and makes no unsupported claim.
4. Write 3 to 4 value prop sections minimum (up to 8 to 10 for complex offers), each heading a benefit, each with 1 image and short support. Check: read only the headings; the buyer is sold by them alone.
5. Place proof: hero (2 forms), a wall of love grid, reviews between value props, a proof line near every CTA, proof at known drop-off points. Check: each testimonial has a named objection or belief it serves.
6. Add the comparison block, how-it-works (3 or 4 steps ending in the outcome), guarantee (only if real), FAQ (from real objections), closer (mini hero). Check: FAQ questions trace to a ticket, call note or review.
7. Add a CTA to every critical section; on mobile plan 1 pinned CTA. Check: no CTA skips a required choice.
8. Mark every claim with its source and every image with its origin (real photo, brand asset, generated). Check: no placeholder numbers remain (14's hair mock-up used "all made up data").
9. Hand to design with the note: build the design around this copy.
Rollback: the wireframe is a document; the live page is not touched.

### 4.4 PDP first-screen and body rebuild

Goal: a PDP that shows purchase-critical information in the first mobile screen and sells with images and scannable modules. Preconditions: heatmap, scroll map and recordings for the PDP; policy record; bundle maths from 03-OFF. Sources: A (14, 24, 10/11, 01), 07. [3ff3c8b062b0] [c6a46a3c8964] [fd9d123726a1] [49c753e32e8d] [634fdf0d882d] [83fd5d9ddc1a] [af92a8953b92]
1. Gallery: replace pagination dots with visible thumbnails; make the first images sell (use, outcome, scale, before-and-after where allowed, infographic overlay on the real product photo). Check: heatmap click share on dots drops to near 0 after launch; the product is still depicted accurately.
2. Move the rating and review count near the top (above or beside the title; test the exact order). Check: rating links to the on-page review section, not off-site.
3. Put title, price, any saving in money, selector and add to cart above the first-screen line on the brand's main device; shorten the description above the button; cut empty space. Check: scroll map shows add to cart reached by most visitors (07's bad case: 36%).
4. Move controls next to what they change (colour swatch near the main image). Check: recordings stop showing scroll up and down loops.
5. Bundle block: 3 tiers, an image per tier, money saving in each tier headline, 1 honest badge. Check: arithmetic done in code; savings match the cart; no invented compare-at.
6. FUD reducers directly under add to cart: returns, guarantee, warranty, shipping cost and time, secure checkout. Check: each matches policy.
7. Objection-matched reviews near the buy box (3 to 4, each answering a top objection); full reviews open on mobile, not in a carousel. Check: names, photos and platform shown with consent.
8. Body: convert dense text to benefit modules (image, icon if useful, benefit heading, 1 supporting line); keep specs, sizes, ingredients, care and safety available. Check: headline-only read still sells.
9. Insert FUD reducers between sections at steep drop-off points. Check: scroll map after launch.
10. Remove dead controls under about 1% of clicks unless they prevent costly problems (size charts, returns, support). Check: rage clicks re-checked after the change.
11. Add to cart opens a cart drawer with the basics; no page reload. `[verify UI: theme cart drawer]`
12. Ship as a test where traffic allows (4.16); otherwise ship with before-and-after reads and a dated rollback point.
Rollback: keep the previous theme template version; revert if add-to-cart rate or RPV falls over a full business cycle.

### 4.5 Homepage and collection discovery fixes

Goal: raise View Product Rate without hurting add to cart or purchase. Preconditions: GA4 path exploration and landing page report; Clarity area maps on homepage and collection. Sources: A (14, 24), 07. [d9c4d43e2810] [7caa022c540c] [c7160f33c310] [88fb8838882b] [e03f2284af5e] [bc8e0b03fd58] [63a914e978db]
1. Measure View Product Rate (homepage sessions that reach a PDP), add-to-cart rate and purchase rate. `[verify UI: GA4 path exploration node type "page path", computed in code]` Check: rates computed in code, not by eye.
2. Rewrite the homepage headline as the shopper benefit; match the lead image to the promise.
3. Cut the nav to 7 items or fewer: remove items near 0% clicks, "Home", move About, Contact, Blog and FAQ to a sub-menu or footer; keep Shop exposed; nested menu for large catalogues. Check: FAQ answers exist on PDPs before FAQ leaves the nav.
4. Add product images or story-style icons to the nav or a category row near the top; order categories by click share. Check: A/B test by device where traffic allows (cluster A reports +15% and +72%, 1 client each, no n).
5. Collection: consolidate above-the-fold content so products appear earlier; 1 or 2 filter layers with plain labels ("sort and filter"); products you most want seen in the highest-reach rows; FUD reducers between rows at the steepest drop; honest Best Seller badges.
6. Where reverse-path data shows many add-to-carts after collection to PDP, test quick add on the collection.
7. Re-read path loops (home to collection to home) after launch. Check: loop share falls.
Rollback: menu and template versions kept; revert on a fall in add-to-cart or purchase over a full cycle.

### 4.6 Advertorial research and angle (before drafting)

Goal: the research base and 1 chosen angle, frame and persona. Preconditions: a winning ad or, for a new brand, agreement that the page is a research-stage asset. Sources: 03, 06 and 19 (C), B (09, 16, 23), 05, 12, 22, 08, 21. [37c5cec3fd92] [a7a83f2d6fb7] [5f8bf0a170d8] [0106fc07ad6a] [4d2414f0f91d] [34a2012a9531] [20cba28f276b] [22ce9222dfea] [0623f1ad4849]
1. Gather: reviews and testimonials (skim for the most repeated benefits), support emails, ad comments, Reddit and forum language, sales-call objections, the winning ad and its 4 variables, current funnel mix by awareness. Check: every quote has a source.
2. Write current state and desired state; rank 3 to 5 pains and 3 to 5 desires; list every alternative tried and its honest limit, including doing nothing; list the top 5 objections. Check: alternatives are what buyers really consider, compared accurately.
3. Rank candidate pains on urgency, scale and relevance; in a crowded niche pick an under-served sub-avatar. Check: the chosen pain serves the biggest reachable segment, not a niche one.
4. Name the real root cause and the real mechanism; write the mechanism in 3 sentences; map each product component to the cause with a truthful reason; note what "only this combination" really means. Check: every mechanism claim has evidence in the brand record; none is invented. `[web check: each study cited]`
5. Write the "why now" if one is true (something rose, something fell), and check the trend's public awareness stage. `[web check]`
6. Write 4 to 6 necessary beliefs as "I believe that..." lines, from research not assumption.
7. Pick the persona for the mirror: 1 real buyer type (age band, gender if it matters, problem, duration), matched to the buyers the brand wants more of. Check: consent and privacy rules followed if a real customer is contacted.
8. Pick the frame (3K.5) and format (3A.5) from the main obstacle and product type. Check: the frame can be held to the end and does what its label says.
9. Name the mechanism (characterization): generate names from form, ingredient, source, visual; drop overused ones; the name must describe something real.
10. Write the 1-line big idea; run the competitor test (could a rival say this?). If yes, go back to step 3.
Rollback: none; documents only.

### 4.7 Advertorial draft, block by block

Goal: a full draft in the 3K.6 order. Preconditions: 4.6 done; disclosure wording from a web check. Sources: 12, 06 and 19 (C), 05, 22, 03, 08. [7d6c89cc428f] [5f8bf0a170d8] [2bb1553ace82] [47a0c05d4614] [720bfa12f751] [65a962dc4285]
1. Decide the lead length from the feeding ad (3B.4): click-only ad, long lead with the product later; long ad or VSL, product in the first lines. Write it down.
2. Write the headline in the chosen frame (3C.3 advertorial formulas) with 1 curiosity element; write the subhead with the mechanism or a real proof stat; choose the hero image (problem, transformation, or product for warm traffic). Check: universal, passes the 1-second test, no invented number.
3. Write the lead as a weave of mirror, curiosity, promise and proof, with permission softeners; or, if the brand chooses to lead with pain (7.9), a concrete tiny moment, not a symptom list. Check: a proof element appears in the first screen.
4. Write agitation and cost of inaction in concrete steps; repeat the 3 to 5 pains and desires in different forms (list, story, question). Check: agitation is honest and inside brand voice.
5. Write "why nothing else worked", 1 block per alternative, honest limits, doing nothing, the expert path only with defensible statements. Check: no unsupported claim that competitors fail or that the product replaces treatment.
6. Write the root cause and the reframe of blame onto the tool or situation. Check: supportable, no disease claim for a non-drug.
7. Write the mechanism and product reveal: name, 1 to 1 map to the cause, each feature to a benefit, the reason this form works if true, origin story if true, "what if there was a tool that..." transition (05). Place CTA 1 soon after. Check: a reader can retell the mechanism in 1 or 2 lines.
8. Write the proof stack: mechanism proof, 10 to 20 real quotes with 1 per objection, demonstration, a real customer timeline with its limits and hedge. Check: every person, number and study is in the brand record.
9. Write objections: risk, price, time, safety, authority, "why not Amazon", "will it work for me". Check: each answer is true.
10. Write the offer block: price anchored against a real cost, the real offer, the guarantee once and clearly; or hold price to the next page in a 2-page presell. Check: matches the offer page word for word.
11. Write CTAs: about 4 (after hook, mechanism, proof, objections) or 1 floating; wording by 7.5; push line above each button; "check availability" only if stock is limited.
12. Write the late pain-threshold section, more proof, CTA 2, the two-options close, the honest author or brand sign-off, the real FAQ or comment block, and the disclosure line. Check: no "review team" persona; no fabricated comments.
13. Write subheads that stand alone and tell the story in order; place an image after each paragraph it proves.
Rollback: the draft is a document; nothing is published until 4.9 and 4.17.

### 4.8 AI-assisted advertorial drafting (optional)

Goal: a first draft in under an hour from the research base, with every invented fact caught. Preconditions: 4.6 documents as PDFs; a swipe chosen for structure only; disclosure wording. Sources: 08, 16 (B), 21, 05, 03. All model names, limits and upload steps are stale. `[verify UI: current model, file upload limits, output length]` [22ce9222dfea] [e9318cd29eae] [d1001c281579] [6ec3aac63864] [df5d2f71273b] [cc252faac5f7]
1. Prime the model with the brand's own product page and facts (a clean text PDF, FAQs expanded, real testimonials with names), then the 4 research documents. Say "do not do anything yet, confirm you understand".
2. Run an extraction pass once per product: target market, pains, promises; credible and social proof; common solutions and why they fail; the real culprit; product facts, price, offer; ingredients or components with studies; avatar archetypes. Save the outputs as a reusable inputs document.
3. Attach the swipe and ask only "analyze the structure". Then: "write a new advertorial for [product] that follows this section order, pacing, style and tone, for [1 archetype]; keep these 4 variables fixed because they are proven in our ads: [avatar, desire, problem or angle, mechanism]; write all copy from our facts; do not invent any person, study, number, review or price; do not condense; go section by section and ask me to continue". Check: the model's plan restates the sections and the variables before writing.
4. Draft in halves or chunks; read the first half and judge the headline before continuing; correct mid-stream when the model names a person or study the brand does not have.
5. Ask for 5 to 10 alternative headlines; add specificity by hand (flavour, format, ritual).
6. Run the 3 tightening prompts: flow and anti-staccato ("full grammatical sentences, natural conversational flow, same length"); simple language ("more concrete Germanic-rooted words, simpler sentences, do not cut intensity, target grade 5 to 7"); subheads ("3 to 5 options each, each stands alone, together they tell 1 story"). Re-read after every pass; staccato comes back.
7. Ask the model to review the draft against the necessary beliefs, objections, mechanism and risk reversal ("AI chief"), then read the whole thing yourself for bumps (slippery slide).
8. Scrub: remove or replace every named expert, doctor or narrator the brand does not have; look up every study; replace model-written testimonials with real ones; correct price, offer and shipping; set the CTA link; put the "Advertisement" label at the top. Check: 5.7 compliance check passes.
Rollback: keep every draft version; the inputs document is reused for the next angle.

### 4.9 Advertorial review and tighten (before design)

Goal: pass the review in 5.3. Preconditions: draft from 4.7 or 4.8. Sources: 03, 22, 19 (C), 12. [48b68b595955] [bf3e5b98a5c7] [4da8204c9b2b] [9beeec9cb1de]
1. Name the frame in 1 word; confirm it holds to the end. Fix or rebuild if it reads like a sales letter.
2. Colour-code pain, desire and mechanism; every section should mix all 3; the repeated pains and desires come from the same 3 to 5.
3. Search for the mechanism name; it appears in headline, subhead, listicle points, origin, pain section and close, with 1 name only.
4. Run the story-stop audit: mark each sentence where story turns to selling; rewrite each as a story event.
5. Read only the subheads in order; each stands alone and the stack tells the story.
6. Count causal steps in the mechanism (1 or 2), check the metaphor matches the action, and remove abstract maths and timelines the reader must picture.
7. Move proof up if none appears in the lead; add CTAs earlier if the first is at the bottom; strengthen the headline's urgency only with true framing.
8. Reading level check with a readability tool: below grade 10, aiming at 5 to 7. `[verify UI: readability tool]`
9. Claims and people check: list every number, endorsement, press mention, user count, "only", "guarantees", "sold out", expert and study; each has a file or record; otherwise cut.
10. Disclosure and sign-off check.
Rollback: the previous draft version.

### 4.10 Quiz funnel build

Goal: a quiz spec (deliverable 9.4) the builder can implement and the analyst can measure. Preconditions: research base (4.6 steps 1 to 6), the range and the rule that maps answers to SKUs, email platform field mapping. Sources: 23 (B), 18, 17. `[verify UI: quiz builder branching, tagging, export, drop-off report]` [62b402dc7dc6] [25ad02d8040c] [1081c0601454] [2e104f23d8b2] [d20c2b44905c] [5b8e0e66fb00] [b800e9ca6a61] [cb45dd220b9b]
1. List the beliefs the buyer must hold and the top objections; list the answers that change the recommendation. Check: each future question will map to 1 of these.
2. Write question 1 as the least invasive, most important question (usually the main goal) that also seeds a belief; questions 2 and 3 low friction. Check: no age, weight or health question first unless it changes the recommendation and the category expects it.
3. Write seeding questions (a 1 to 10 slider on how much the problem affects daily life), pre-handling questions (expected time to results; what was most frustrating about past products, as choices not typed input), routine and preference questions, "what have you tried". Check: every question labelled commit, seed, pre-handle, recommend or research.
4. Order by gradualization; rotate formats (no more than 2 or 3 of the same in a row); no typed input at launch; numeric only where a number drives the result; a date only if delivery timing matters.
5. Insert an info screen about every 3 to 5 questions with real value that reflects the answers; branch copy on the goal and the past frustration; a normalising screen after the failure question. Check: any percentage comparison has a real measured base; any graph is a real calculation; no simulated loading.
6. Set length: 8 to 12 questions as the default (7.7); longer only with nurture screens in a problem-solution category.
7. Capture step: name, then email, with a separate marketing consent choice; decide gated or ungated by 7.8 and plan to test both.
8. Results page: the shopper's answers back, the rule linking them to the SKU, size or bundle, a correctable consumption assumption, product details, price, real reviews, delivery and returns, 1 buy button, no exits, a timer only for a real deadline.
9. Tracking: quiz start, each step view, completion, email captured, purchase after quiz (separate event from purchase), all deduplicated; per-question drop-off report enabled.
10. Routing: where a page and offer per pain point exist, route by answer; pass answers to the email platform; hand the 5 to 7 email sequence to 14-EML.
11. Pre-launch: take the quiz with 3 contradictory answer sets; check the recommendation, copy and price change as claimed; check consent wording. `[web check: consent rules]`
12. After launch: test the first 3 questions first (throughput past question 3, judged with downstream purchase); find the drop-off spike question and soften or remove it unless it is deliberate qualifying friction; export answers and report at about 100 submissions and then at least twice a month; compare quiz-path purchase rate and RPV with direct-to-PDP.
Rollback: keep the ad's alternate destination (PDP or LP) live; switch traffic back if quiz-path RPV is lower over a full cycle.

### 4.11 Sales page, order page and post-purchase offers (source 09, cluster B)

Goal: a DR funnel spec. Preconditions: high-AOV outcome-led offer; platform supports a custom order page and post-purchase offers `[verify UI]`; COGS from 20-FIN; offer maths from 03-OFF. [a0bf3baac741] [9246e69228b5] [f965f0b7466d] [9f5970096a05] [ea7e5b13b044]
1. Map the current flow and drop-off per step. Check: conversion rate and AOV per page and per step are instrumented before any redesign.
2. Build the 4 research documents (4.6 steps 1 to 6).
3. Write the sales page with the 8 must-haves (3M.2); cut anything confusing; keep it fast.
4. Order page: card fields obvious, quantity breaks, 1 or 2 order bumps as checkboxes at $10 to $20 that deliver a real service, plain design. Check: a new visitor finds the card and CVV fields at once.
5. OTO1: pick the product by "more of the same" or "solve one problem, create another" (only if the next problem is real); VSL or text format with an honest interrupt frame; price as a test up to the 10x heuristic; compare options by contribution per buyer. Route yes to OTO2, no to a down-sell.
6. Split test the order page first (09's most impactful test), then OTO product and price, each with 09-CRO.
7. Hand the leak map (drop-off per step) to 14-EML for recovery flows.
Rollback: native checkout stays configured; revert if purchase conversion or contribution per visitor falls.

### 4.12 Read heatmaps, scroll maps and area maps

Goal: a list of section-level findings with 2 to 4 data points each. Preconditions: Clarity (or Hotjar, PostHog) installed and collecting. Sources: A (01), 07. `[verify UI: Clarity Heatmaps, Scroll, Area, Edit areas, Change screenshot, device toggle]` [98544575e3db] [a88919c97b72] [e225b45e3d43] [bfbcb883a414] [c6a46a3c8964]
1. Open Heatmaps for the most viewed page; start with mobile; fix the screenshot if it rendered wrong.
2. Scroll view: note the average fold, 75%, 50% and 25% reach lines; note where priority sections sit relative to reach; note empty blocks between the fold and the first proof. Check: a key section under about 30% reach is flagged to move up; a 50% drop right after the fold flags the fold.
3. Switch to Area (Edit areas): draw an area per element (image, title, price, reviews, each CTA, each nav item, each filter, thumbnails, swatches, wishlist, badges, logos). Record click share per element.
4. For each element ask: clicked but not clickable (false affordance); clickable but near 0% (clutter); heavily clicked but small or low on the page (promote); CTA share versus proof share (CTA below a testimonial's share is a red flag; cluster A's benchmark 3 to 5% per CTA is a share of page clicks with no basis).
5. Cross-check high-click sections against scroll reach; surface high-click low-reach sections.
6. Repeat on desktop.
7. Write each finding as a hypothesis with its data points and KPI.
Rollback: none.

### 4.13 Session recordings and rage clicks

Goal: repeated friction patterns. Preconditions: as 4.12. Sources: A (01), 07, 02. `[verify UI: Clarity Recordings, Filters, Path contains, User actions, Rage clicks, sort by clicks]` [19ceeeff7acf] [ee5a74cd7f5c] [63d3f8c37b06] [d77e97941d57]
1. Filter recordings to converters: Path, visited URL contains the order-confirmation path. Watch 10 or more; log which sections they read, where they pause, where they scroll back, what they click, time to convert.
2. Filter to rage clicks; list the elements; decide per element: make it a real internal link or anchor, or make it look inert; do not send people off the page. Note that some mobile rage clicks are accidental taps.
3. Sort by clicks high to low; watch for patterns repeated across several recordings (control far from its effect, bundle overwhelm, form confusion).
4. Log each pattern with device, country and count of recordings; turn it into a hypothesis.
5. After a fix, re-check the same filter to confirm the pattern stops.
Rollback: none.

### 4.14 Surveys and review mining

Goal: ranked objections, motivations, values and anxieties in the customer's words. Preconditions: survey tool on the order confirmation page; review exports from every platform. Sources: 07, A (10/11, 15), B (09). `[verify UI: survey tool triggers]` [3b5634f1c703] [0d65f4f7da9f] [1f3ae96ccb10] [0106fc07ad6a]
1. Post-purchase survey right after purchase: "What motivated you to buy from us today?" and "Did you have any concerns, doubts or uncertainties that almost stopped you from buying today?" Open-ended when data is thin.
2. Mid-session survey at about 60% of average session duration: "Is there anything holding you back from buying this product right now?" then preset reasons plus "something else". Watch conversion while it runs; remove it if conversion falls.
3. Export reviews from the site, Google, Trustpilot, Amazon (note Amazon reviews may describe another seller's shipping) into 1 sheet; tag main topic, motivation, value, anxiety; pivot counts for positive and negative separately, in code.
4. Add sales-call and support-ticket objections ("was anything ambiguous?").
5. Rank the top 5 objections and the top pains and desires; attach 3 verbatim quotes each; feed into 4.1, 4.3 step 5 and 4.6.
Rollback: none.

### 4.15 Think-aloud user tests

Goal: 3 to 5 recorded tests that explain the "why". Preconditions: test budget (about $45 per tester at 01's recording); a live page or a clickable prototype. Sources: A (01, 15), 07. `[verify UI: UserBrain test setup, task types, screening]` [1255665f3d67] [e7747485521b] [75d6c6bbb420]
1. Create a website test, 5 to 20 minutes, "start from scratch".
2. Task 1 before any scroll or click: "Based on what you see above the fold, what are your first impressions? What does this page sell and why should you care?"
3. Ecommerce tasks: find the right product, add to cart and go through checkout, overall opinion of the experience and design; tick "ask testers if they completed the task"; end every task with "please walk through your thought process".
4. Screening: up to 2 single-select graded questions, never yes or no; set device (the brand's main device), country, age range, gender.
5. Run 3 to 5; log every hesitation, navigation failure and doubt; write hypotheses; re-run the same tasks after changes.
Rollback: none.

### 4.16 Test proposal handed to 09-CRO

Goal: a proposal 09-CRO can size and run (deliverable 9.5). Preconditions: a hypothesis with 2 to 4 data points; weekly sessions and orders for the page. Sources: 07, A (20, 10/11, 15), 02, 12. [6f6f47a38de3] [1bedb6cc7753] [bfdcedabc90c] [51c0c6b48e3a] [a835b362c4f5]
1. Write the hypothesis: "If we [change], [KPI] will rise because [rationale with data points]."
2. Name the primary metric (purchase conversion, RPV or contribution per visitor; add-to-cart only as a secondary) and the guardrails (AOV, refund rate, margin).
3. Score with the PXL-style sheet (above the fold; noticeable in 5 seconds; adds or removes an element; raises motivation; high-traffic page; addresses a user-test finding; supported by heatmaps; ease). Run the highest totals first. The source's sheet is incomplete in the transcript; do not standardise on it without the original. `[web check: PXL criteria]`
4. State the test type: A/B in a visual editor for 1-element changes; split URL for 2 different pages; before-and-after with a dated rollback point when traffic is under the threshold 09-CRO sets.
5. State the sources' prior and its weaknesses (which example, what it lacks).
6. State what must be frozen during the test, the tracking event, and the decision date. 09-CRO sets sample size, run length and significance.
7. After the readout, record win or loss and why; if a win, propose the next test that pushes the same idea.
Rollback: 09-CRO owns test stop rules.

### 4.17 Build and pre-traffic QA

Goal: a page that is safe to send paid traffic to. Preconditions: design built around the final copy; tracking installed. Sources: 02, 05, 21, A (01), 12. [a835b362c4f5] [2f79f41a6063] [38729fdb61c9] [4d6326770c4b] [2424ba647b51]
1. Message match: open the live ad and the page hero side by side; same promise, persona, offer and tone. Check: the first screen continues the ad's loop.
2. Claims audit: every number, endorsement, study, "only", "guarantee", "sold out", expert and press mention has a record; the rest is cut. Health, comparative and result claims checked against the market's rules. `[web check]`
3. Disclosure: "Advertisement" or "Sponsored" label present on advertorials, presells and quiz pages; author or brand honest; no fake masthead.
4. Policy match: guarantee, returns, warranty, shipping and delivery copy matches the policy pages word for word; price, saving and offer match on every step from ad to checkout.
5. Navigation and exits: dedicated pages have no nav and no outbound links except required policy; storefront pages keep nav under 7 items; proof links anchor on-page.
6. Tracking: submit a test order or form in each variant; confirm the confirmation-page or success event fires once; quiz completion and purchase are separate events; variant routing checked in a private window (a cookie pins a normal browser to 1 variant); results lag can be about 30 minutes. `[verify UI: PostHog, GA4 or the test tool]`
7. Mobile: browser responsive mode, every preset and a slow drag across widths; pinned CTA visible and working; form usable one-handed; labels stay visible; nothing overflows; no oversized logo or announcement bar.
8. Speed: run Lighthouse; target under 2 seconds on throttled mobile and never over 4; compress images, defer scripts, remove unused widgets; hand a report to 08-SPD if the target is missed. `[verify UI: Chrome dev tools, Lighthouse]`
9. Advertorial on Shopify: custom HTML page with theme header and footer hidden; page listed for tracking. `[verify UI: PageFly or native template]`
10. Proofread for typos, double currency signs, placeholder text, invented numbers, and reading level.
11. Secrets: no API keys in page JavaScript; environment variables set on the host, never committed.
12. Launch; read the first 48 hours for page-to-page click-through, CTR and CPM anomalies; fix the page that loses people.
Rollback: keep the previous page version and the ad's previous destination; switch back if purchase rate or RPV falls sharply in the first read.
## 5. Diagnostic checklists

Written so a worker can run each one without the sources. Score each row pass or fail; every fail carries the fix.

### 5.1 PDP audit

| What to check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| First mobile screen | Open on the brand's main phone size | Thumbnails, rating and count, title, price with saving in money, selector, add to cart, FUD under it all visible | Add to cart below the fold; dots instead of thumbnails; saving needs maths | 4.4 steps 1 to 6 | 14, 24, 07 (A) [3ff3c8b062b0] [c6a46a3c8964] |
| Gallery sells | View images only, text hidden | Use, outcome, scale, benefit overlays on the real product; enough to buy | Angles only; overlays hide the product | 4.4 step 1 | 24, 10/11 (A) [634fdf0d882d] [b721b5ef1086] |
| Rating placement | Look at the top | Rating near the title, linked to on-page reviews | Rating buried under the description | Move it; test order | 14 (A) [3ff3c8b062b0] |
| Control near effect | Recordings | Swatch next to the image it changes | Scroll up and down loops | Move the control | 07 [63d3f8c37b06] |
| Bundle block | Read the tiers | 3 tiers, image each, money saving in each headline, 1 honest badge | 5 tiers, % in small text, no images, badge on every tier | 4.4 step 5 | 24, 10/11 (A) [af10d9d13cab] [c8277a1ff908] |
| Price and reference price | Compare with price history | Real former price or genuine sum of parts | Raised compare-at, "suggested retail" nobody charged | Remove the anchor | 10/11 (A, rejected) [e8c3a0cb2c42] |
| FUD under add to cart | Look under the button | Returns, guarantee, warranty, shipping cost and time, secure checkout, all true | Nothing, or terms that differ from the policy page | Add real reducers | 20, 14 (A) [e0053984b930] [3ff3c8b062b0] |
| Objection-matched reviews | Compare featured reviews to the top 5 objections | Each objection answered by a real review near the buy box | Generic praise, logos only, thin count headlined | Re-pick 3 to 4 | 10/11 (A) [83fd5d9ddc1a] |
| Reviews exposed on mobile | Scroll on a phone | Grid or list open, names, photos, platform | Carousel, accordion, anonymous | Expose and attribute | 25, 01 (A) [4514239a3d5e] [85e78b3e4eb7] |
| Headline-only read | Read only headings | Benefits, some quantified | "Description", "Features", vague lines | Rewrite headings | 24, 14 (A) [b2e00b510c25] |
| Text blocks | Scroll the body | Icon and image benefit modules; specs available | Paragraph walls | Convert to modules | 14, 24 (A) [49c753e32e8d] [2d9c1b326b14] |
| Dead controls | Area map | Every control earns clicks or prevents a costly problem | Wishlist 0.09%, phone 0.36% type elements | Remove or justify | 07 [c6a46a3c8964] |
| Add to cart feedback | Click it | Drawer opens with basics and a clear next step | Page reload; cart "screaming" with widgets | Drawer, strip down | 24, 01 (A) [af92a8953b92] |
| Scroll reach to buy button | Scroll map | Most visitors reach add to cart | About 36% or less | Shorten above the button; cut white space | 07 [c6a46a3c8964] |
| Navigation | Count top items | 7 or fewer, visual, Shop exposed | 12 items, "Home", About and Blog prominent | 4.5 step 3 | 24, 14 (A) [bc8e0b03fd58] |
| Device gap | GA4 by device | Similar conversion and RPV | Mobile far below desktop | Find what desktop shows that mobile hides | 07 [50b30a244eb6] |

### 5.2 Cold-traffic landing page audit

| What to check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Ad to page match | Ad beside hero | Same promise, persona, offer, tone | Generic brand line; offer missing above the fold | 3B.1, 4.2 step 1 | A (14, 13, 01), 06 (C) [3cefd472f380] [d107bfda3ceb] |
| 5-second test | Show the hero for 5 seconds to someone new | They say what it is, what they gain, why this brand | They guess the category (01's tester guessed "respirator supplier") | Rewrite headline and subhead | A (10/11, 13, 20) [2070e6c0b648] [accfa461c58b] |
| Headline benefit | Read it alone | Outcome, quantified if true | Who you are, what you do, jargon, invented number | 3C.2, 3C.3 | A (all) [4fb1b734b296] [b2e00b510c25] |
| Subheadline | Compare with headline | Adds the how, mechanism, USP | Repeats the headline | 3C.4 | A (14, 25) [12c3e5742646] |
| Hero proof | Count and read | 2 relevant, verifiable forms | None, 1 weak, thin count, logos without quotes | 3C.6 | A [79b4db61ba63] [7f28a425cebc] |
| CTA | Blur test | 1 standout, benefit or task label | Competes, plain text, "Submit" | 3C.7 | A [8805ac6febed] [4e7bcbfc5e4b] |
| FUD at the CTA | Look under the button | Real reducers | Reassurance only in the footer | 3C.8 | A (25, 13, 20) [0d11fac972bd] |
| Hero image | Copy hidden | Shows the promise | Venue, stock, mood that contradicts the promise | 3C.10 | A (14, 20) [96baec725a87] |
| Fold density | Scroll map, mobile | Proof 2 above the average fold; no empty blocks | Big white gaps; 50% drop after the fold | 3C.12 | A (01) [98544575e3db] |
| Section order fits awareness | Read the order | Pain with PAS after the hero for cold; proof up and pain short for warm | Form or buy ask before any education on cold traffic; pain list with no solution | 3D.1, 3D.2, 3D.6 | A (01, 14, 15) [0441a8cce669] [81a3fd40b635] |
| Headline-only read | Read only headings | Sold by the headings | Generic headings | 3E.1 | A [ae06c62a4a73] |
| Value prop depth | Count sections | 3 to 4 minimum, up to 8 to 10 for complex offers, each with a benefit and image | 1 or 2 sections; bare page | 3D.7 | A (01, 13, 15) [90790635ecd5] [145380876d79] |
| Every section earns its place | Ask per section | Moves the visitor 1 step closer | Filler, checklist sections | 3J.2 | A (15, 25) [13c8f4c9d77e] |
| Proof scatter | Map proof positions | Hero, wall of love, between value props, near CTAs, at drop-off points; each with a job | 1 block at the bottom; carousel; anonymous | 3F.2, 3F.3 | A (01, 13, 25) [bece1235ee24] [3f41ff67021b] |
| Objections | Compare FAQ and testimonials to research | Top 5 handled before the FAQ and in it | FAQ filler | 3D.11 | 02, 09 (B), A [3f57d3484974] [cc5d84e31feb] |
| Comparison and how it works | Read | Accurate comparison; 3 or 4 steps ending in the outcome | Missing, or unsupported claims about rivals | 3D.8, 3D.9 | A (01), 06 (C) [c3c1046803f6] [ff648126e918] |
| Closer | Read the last block | Mini hero: recap, reason to act, proof, CTA, FUD | "Contact us", "Want to know more?" | 3D.10 | A (14, 01) [ecc54f71873d] |
| CTA coverage | Scroll and count | 1 per critical section; 1 pinned on mobile | 1 at the bottom | 3I.2 | 02, A (14, 13) [622577c84cdc] [f7356787e0a5] |
| Navigation and exits | Header, testimonials, logos | No nav; no outbound links except required policy | Menu, LinkedIn links, linked logos | 3H.1 | A (01, 14), 02 [89e1eb35d667] [159090e7a12d] |
| Pop-up timing | Load fresh | None in the first 3 to 5 seconds; intent triggers only | Arrival pop-up | 3H.4 | A (10/11) [396f2ef27e9e] |
| Scannability | Scroll | Bullets, icons, subheads, selective bold | Dense text | 3E.5 | A [4ef5d75f8104] |
| Familiar layout | Compare with the 3C.1 baseline | Standard pattern | 2 headlines, giant proof, headline-only hero | 3C.13 | A (25) [a556c62817f0] |
| Reading level | Readability tool | Below grade 10, near 5 to 7 | Grade 10 or higher; staccato fragments | 3E.9 | 03, ecomOS [d36b6dd3162b] |

### 5.3 Advertorial review

| What to check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Disclosure | Top and bottom of page | "Advertisement" or "Sponsored" in the market's form; honest author or brand | No label; "review team" or news masthead | Add label; fix sign-off | ecomOS; 08, 05 [cc252faac5f7] [2bb1553ace82] |
| Proven angle | Ad results | A winning ad with 4 variables, or a declared research-stage page | Built before any ad test | Route to angle tests | 21, 05 [0623f1ad4849] [108973ca4a70] |
| Ad continuity | Ad beside first screen | Same persona, loop, tone; page opens mid-story | Page restarts or changes the angle | Rewrite the lead | 06 (C), 22 [d107bfda3ceb] [d6e1e26520c5] |
| Lead length vs ad | Rate the ad's selling load | Click-only ad: long lead; long ad or VSL: product early | Long VSL traffic sent to a 3,000-word lead | 3B.4 | 21 [ffdf5c3a30ff] |
| Frame identity | Name it in 1 word | Held to the end; a "Warning" warns about something specific | Reads like a sales letter; bolted-on clauses | 3K.5 | 03 [44bf08d46ea9] |
| Headline load | Count ideas | 1 curiosity element (2 with the subhead); universal; 1-second test | Several variables; narrowing details | 3C.3 | 03 [9bd853e225c5] |
| Proof in the opening | Colour-code | Proof in the first screen | Pain dump with no proof | Add a real proof stat | 03 [48b68b595955] |
| Mirror | Read headline and first 3 paragraphs | 1 person, 1 problem, 1 duration | Several ages and genders; "everyone" | 3B.3 | 22 [20cba28f276b] |
| Permission | Find every "you do X" line | "Maybe", first or third person softeners | Assumes habits and feelings | 3K.6 step 3 | 03 [046994a8d7d8] |
| Agitation | Read | Concrete, honest, within brand voice | Invented harm, medical claims, stigmatising words | 3D.6, 3J.3 | 06, 19 (C), 03 [20262eb9059c] [70ebc6c92534] |
| Why nothing else worked | List alternatives | Every real alternative and doing nothing, compared accurately | Missing, or unsupported claims that rivals fail | 3K.6 step 5 | 06 (C), 12 [ff648126e918] |
| Root cause and mechanism | Ask a reader to retell | Supportable cause; 1 to 2 causal steps; metaphor matches the action; 1 name used throughout | Invented cause; 4 steps; mop on a clog; several names | 3K.4 | 06 (C), 03, 19 (C) [c916e37c3b02] [66470c34199d] [46b86014e059] |
| Pain, desire, mechanism mix | 3-colour audit | Every section mixes all 3; same 3 to 5 items repeat | Feature block only; pain named once | 4.9 step 2 | 19 (C) [4da8204c9b2b] |
| Story continuity | Story-stop audit | No pitch sentence breaks the story | Story for 200 words, then product copy | 3K.8 | 22 [bf3e5b98a5c7] |
| Proof stack | List proof items | Mechanism, social (1 real review per objection), demonstration; specifics; real third parties | 1 proof type; invented personas; "33,000 golfers" with no record | 3F.5 | 12, 19 (C), 06 (C) [b23e07cd5c01] [5aaa4297b2ac] |
| Studies | Look up each | Real, on point, real institution, translated in code | Cannot be found; upgraded population | 3F.6 | 03, 08 [7b87cbeac602] [cc252faac5f7] |
| Objections | Map top 5 | Each answered before the offer | Left to the FAQ or missing | 3K.6 step 9 | 12, 16 (B) [7d6c89cc428f] [99f68cd7f6fd] |
| Offer and anchor | Read the offer block | Real price, real anchor, 1 guarantee matching policy; or price held to the next page by design | "Suggested retail" nobody charged; mixed guarantee wording | 3G.4, 3G.6 | 06, 19 (C) [54399c0a8159] [651985640c1d] |
| CTAs | Count and read | About 4 or 1 floating; first CTA soon after the mechanism or after the risk reversal; wording by 7.5 | 1 at the bottom; "check availability" with unlimited stock | 3K.6 step 11 | 12, 19 (C), 03 [65c6cbb0e670] [cb940d13cea9] |
| Scarcity | List every urgency line | True, enforced | "Sold out 3 times", "only today" unverified | Remove | 06, 19 (C), 05 [cb940d13cea9] |
| Close | Read the end | Two options with a way out; honest sign-off; real FAQ or comments | Boxed in; fabricated comments; "review team" | 3G.8 | 19, 06 (C) [e893c433c3b8] [5970767eda77] |
| Subheads | Read them alone in order | Each stands alone; stack tells the story | Missing or disconnected | 3K.10 | 03 [48b68b595955] |
| Images | For each, read the paragraph above | Shows what the text said; honest origin; real product photo | Unrelated; stock face as a patient | 3E.7 | 22 [146a5b208b74] |
| Reading level and rhythm | Tool plus read aloud | Below grade 10, near 5 to 7; full sentences | Post-graduate words; staccato | 3E.9 | 03 [d36b6dd3162b] [eb01995ac888] |
| Product fit | Ask whether buyers have a felt pain | Problem-solving product with a real before state | Gift, fashion or jewellery with no pain to agitate | Consider a different page type | 06, 19, 22 (caveats) |

### 5.4 Quiz funnel review

| What to check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Every question has a job | Label each | Recommend, research the team reads, commit, seed or pre-handle | "Just for the sake of having questions" | Cut | 23 (B), 17 [62b402dc7dc6] [58789a695fea] |
| First question | Read Q1 cold | Least invasive, most important; seeds a belief | Age, weight or health first without need | Reorder | 23 (B) [25ad02d8040c] |
| First 3 questions | Throughput past Q3 by variant, plus downstream purchase | The variant that lets more through without lowering purchase rate | Untested | Test them first | 18 [5b8e0e66fb00] |
| Format rotation | Scan the sequence | No more than 2 or 3 of the same in a row; no typed input at launch | 20 steps of buttons; free text | Swap formats | 23 (B), 17 [1081c0601454] [ce1ad833b2ec] |
| Info screens | Count gaps | About every 3 to 5 questions; each gives value and reflects answers | 7 questions with no break; 2 info screens back to back | Insert or rebalance | 17 [2e104f23d8b2] |
| Claims on screens | Audit every %, graph, date, loader | Real measured base; real calculation; no simulated computing | "More than 62% of users" with no base; projected result date; fake loader | Remove or replace | 17, 18 [d20c2b44905c] |
| Length | Count | 8 to 12 default; longer only with nurture screens in a problem-solution category | 30 steps for a gift product | Cut | 23 (B), 18, 17 [c9f4734eacf6] |
| Personalisation is real | Take the quiz 3 ways | Copy, images, result and SKU change with answers | Same page and SKU for everyone while claiming a match | Route by answer or drop the claim | 18, 17 [4a5a01ce29d7] [4d9eb8148c84] |
| Email gate | Read the capture step | Placement chosen by KPI; separate marketing consent; tested both ways | Bundled consent; no test | 3L.10, 7.8 | 18, 23 (B) [3269b97e0ba6] |
| Results page | Read it | Answers back, the rule to the SKU, correctable assumption, details, price, real reviews, delivery, returns, 1 buy button, no exits | Timer with no deadline; exits at the buy box; app-store reviews for a product | 3L.8 | 17 [a7e987adb7a8] |
| Tracking | Fire test events | Start, step views, completion, capture, purchase after quiz, all separate and deduplicated | Completion counted as a sale | 4.10 step 9 | 02 cards [2296ba94b6ea] |
| Completion and drop-off | Per-question report | Even drop of about 1 to 2% with no cliff; completion defined and tracked with purchase | Cliff at 1 question; completion judged alone | 3L.11 | 23 (B) [cb45dd220b9b] |
| Answers used | Export cadence | Report at about 100 submissions, at least twice a month; pains fed to ad angles | Data never read | 3L.9 | 18 [a8aab5b91a98] |
| Subscription pre-selection | Read the offer | Consent rules met | Pre-ticked subscription where rules forbid | Fix | 12, 18 `[web check]` |

### 5.5 Message-match check (ad to page)

| What to check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Promise | Write the ad's promise in 1 line; read the hero | Same promise, same numbers | Different or generic | Rewrite the hero | A (14) [3cefd472f380] |
| Persona | Compare who the ad addresses with who the page addresses | Same age, gender, problem, duration | Page widens to everyone | 3B.3 | 22 [d6e1e26520c5] |
| Loop | Read the ad's open loop and the page's first screen | The page closes it in the same voice | Page starts a new story | 3B.2 | 06 (C) [d107bfda3ceb] |
| Offer | Compare price, discount, guarantee, shipping in ad, page and checkout | Identical on every step | Ad says 50% off, page says 30% | Fix the weaker step | 19 (C) [cb940d13cea9] |
| Imagery | Compare the ad image and the hero | Same product, same mood | Different product shown | Fix the hero image | A (01) [338245ec724b] |
| Selling load | Rate the ad: click-only or long | Page length fits (3B.4) | Mismatch | Change the lead | 21 [ffdf5c3a30ff] |
| Ad CTA | Read the ad button | "Learn More" to an advertorial; "Take the quiz" to a quiz | "Shop Now" to a presell | Recommend to 24-DEP | 05, 23 (B) [28056fad0269] |
| Awareness | Compare the ad's assumed knowledge with the page's | Same stage | Contrarian headline on a clueless audience | 3A.6 | 04 [d235019925fc] |
| Re-check trigger | Note the date | Re-run when creative changes | Stale | Schedule | A (14) [3cefd472f380] |

### 5.6 Mobile check

| What to check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Widths | Responsive mode, every preset, slow drag | No breaks at any width | Overflow, broken sections | Fix layout | 02 [38729fdb61c9] |
| First screen | Phone view | Headline, proof, CTA (or add to cart) visible without scrolling; no empty block | Logo and announcement bar bury the button | Shrink chrome; tighten | A (10/11, 01) [5d7260153d8b] [98544575e3db] |
| Pinned CTA | Scroll top to bottom | 1 pinned CTA visible and working (or sticky after the product intro on a story page) | CTA scrolls away, or a sticky button skips size choice | 3I.2 | 02, 22 [622577c84cdc] [340d4991b51b] |
| Hidden content | Scroll | Reviews and key info open | Carousels, accordions, tabs hide them | Expose | A (25) [4514239a3d5e] |
| Tap targets and forms | Use one-handed | Buttons and fields easy to tap; labels stay visible | Placeholder-as-label; tiny targets | 3I.5 | A (01, 13) [f391cf14459a] |
| Type sizes | Measure | Headline clearly larger than body; legible body | Headline near body size | 3C.11 | A (10/11) [e64076c81e2b] |
| Rage taps | Clarity mobile filter | Few; none on key elements | Repeated taps on inert elements | 4.13 | A (01) [47c52d23ae2e] |
| Speed | Lighthouse throttled mobile | Under 2 seconds; never over 4 | Heavy images, video, widgets | 08-SPD | 02 [4d6326770c4b] |
| Pop-ups | Load fresh on a phone | None on arrival; exit-intent replaced by a mobile-safe trigger | Arrival pop-up; desktop-only exit intent | 3H.4 | A (10/11) [82c9c48592fe] |
| Device gap | GA4 by device | Similar conversion and RPV | Mobile far below desktop | 3N.8 | 07 [50b30a244eb6] |

### 5.7 Compliance check (run on every page; blocks launch on any fail)

| What to check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| People | List every named or implied person (author, expert, doctor, narrator, reviewer) | Real, consenting, disclosed, qualified where implied | Invented or AI-generated person | Remove or replace | 0.1; 03, 05, 06, 08, 12, 16, 19, 22 |
| Testimonials and reviews | List each with its source | Real customers, real wording, permission | Written personas, copied reviews, fake comments | Remove | 0.2; 05, 06, 08, 12, 22 [cca2df9310c1] [5970767eda77] |
| Disclosure | Top of page | Clear ad label in the market's form; brand visible | Hidden, fake masthead, "review team" | Add | 0.3; 05, 06, 12, 16, 19, 21 `[web check]` |
| Scarcity and urgency | List every line and timer | True and enforced | Fake stock-outs, evergreen timers, "only today" | Remove | 0.4; 05, 06, 09, 12, 17, 19, 22 |
| Reference prices and savings | Compare with price history | Real former price or sum of parts; savings computed in code | Raised compare-at; invented "retail" | Remove | 0.5; 10/11 [e8c3a0cb2c42] `[web check: reference price rules]` |
| Health, safety, result and comparative claims | List every claim | On the substantiated list; allowed for the category and market | "340% blood flow", "cut toxin absorption 55%", disease claims for a supplement, rivals "killing contact" | Remove | 0.6; 03, 05, 06, 12, 16, 19, 21, 22 `[web check: health claim and comparative advertising rules; Meta personal attributes policy]` |
| Mechanism and studies | Check each against evidence | Real mechanism; real study, real institution, real population | "I just made that up"; "Harvard trained" misattribution | Remove | 0.6; 12, 03 [7b87cbeac602] |
| Guarantee and policy | Compare with policy pages | Word-for-word match | "1 year no questions" on the page, 30 days in policy | Fix | 3G.6 [651985640c1d] |
| Endorsements and press | Check each | Real, permitted, quoted accurately | "Top PGA pro", "featured on Golf Channel" unverified | Remove | 19 |
| Before-and-after images | Category rules | Allowed and real | Regulated or staged | Remove | 22, 10/11 `[web check]` |
| Images | Origin of each | Real product photo where the product shows; generated images never shown as real people | AI patient photos; product redrawn | Replace | 0.10; 12, 22, 03 |
| Badges | Sales data | "Best Seller" and "Most Popular" are true | Badge on a slow seller | Remove | 24 (A) [530251f31987] |
| Quiz claims and consent | Screens and capture | Real percentages, real calculations, separate consent, no pre-ticked subscription where forbidden | Invented comparisons; bundled consent | Fix | 17, 18, 23 `[web check]` |
| Reading level | Tool | Below grade 10 | At or above | Simplify | 0.7 |
| Personal attributes in copy | Read for "you are fat", "your liver is clogged" | Softened, policy-safe | Asserts a health or weight state | Rewrite | 03 `[web check: Meta personal attributes policy]` |
| Secrets | Page source | No keys in JavaScript | Key in the page | Move to backend | 0; 02 |

### 5.8 Pre-traffic QA

| What to check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| 5.5 passed | Run it | All pass | Any fail | Fix first | |
| 5.7 passed | Run it | All pass | Any fail | Blocks launch | |
| 5.6 passed | Run it | All pass | Any fail | Fix first | |
| Offer consistency | Ad, page, next page, cart, checkout | Same price, saving, guarantee, shipping | Any mismatch | Fix the weaker step | 19 (C) [cb940d13cea9] |
| Tracking | Test submission in each variant | Confirmation event fires once; quiz and purchase separate; variant routing in a private window | Missing or double events; same variant always | 4.17 step 6 | 02 [a835b362c4f5] [2f79f41a6063] |
| Links | Click every CTA | Lands on the promised SKU and offer | Homepage, wrong variant | Fix | 05 [0d2cc6cf41f5] |
| Exits | Count links | None off-page except required policy on dedicated pages | Nav, outbound links | 3H.1 | A [e95750b86b05] |
| Proofread | Read all | No typos, placeholder text, double currency signs, invented numbers | Any | Fix | 05, 14 [28056fad0269] |
| Speed | Lighthouse | Target met | Missed | 08-SPD | 02 [4d6326770c4b] |
| Theme chrome on advertorials | View live | Header and footer hidden; label present | Store header shows | Fix template | 21 [2424ba647b51] |
| First 48 hours plan | Written | Metrics to read and who reads them | None | Write it | 12 [82a0e9f86e18] |
| Rollback point | Written | Previous version and previous destination saved | None | Save | 4.17 |

## 6. Thresholds and benchmarks

Confidence counts independent voices (section 0), not files. "Lacks" names what a lift figure is missing: n (sample size), d (duration), i (isolation: many changes bundled), s (significance), c (the source sells the service that produced it). Every lift figure below lacks n, d and s; the column shows the extra gaps.

| Item | Value | Condition | Source | Confidence | Lacks or basis |
|---|---|---|---|---|---|
| *(moved)* | *(5 rows: time to notice a benefit, scroll-past-fold share, share of copy read, first impression time, star-rating heuristic)* | General web psychology | n/a | n/a | Moved to Appendix A.3; none are store facts, already flagged in 10.2 |
| Effort on the hero when starting out | 80 to 90% (20 says 99%) | New page | A | 1 voice | Opinion |
| Proof forms above the fold | 2 (at least 2) | Hero | A (01, 14, 15, 25, 13) | 1 voice | "A/B tested a lot", no data |
| Hero body copy | 2 to 3 sentences or 3 to 4 bullets | Cold LP | A (14, 01), 02 | 2 voices | Opinion |
| Headline traits to hit | 3 or 4 of 7 | Sales page headline | 09 (B) | 1 voice | Opinion |
| Curiosity elements in a headline | 1, max 2 | Advertorial | 03 | 1 voice | Taste |
| Headline to body size | 3 to 4x; 16 px body, 48 to 57 px headline (desktop) | Hierarchy | A (10/11) | 1 voice | Heuristic; 4x of 16 is 64 |
| Value prop sections | 3 to 4 minimum, up to 8 to 10; 4 to 5+; 6 to 8 | Long LP | A (01, 13, 15) | 1 voice | Agency template |
| Proof sections on a long page | 2 to 4 | Long LP | A (15) | 1 voice | Template |
| How-it-works steps | 3 or 4 | Any process | A (01) | 1 voice | Practice |
| Pain list in a PAS section | 3 to 5 items; paragraphs of 1 to 2 sentences | Sales-letter pain section | A (15) | 1 voice | Rule |
| Pains and desires to repeat | 3 to 5 each | Long-form advertorial | 06, 19 (C) | 1 voice | Method |
| Closer bullets | 3 to 5 | Lead-gen closer | A (01) | 1 voice | Template |
| Form fields | 4 or fewer; 1 full-name field | Lead form | A (13, 01) | 1 voice | Rule |
| Navigation items | 7 or fewer | Store nav | A (10/11, 14, 24) | 1 voice | "Diminishing returns", no data |
| Nav items you can usually cut | 2 to 3 (near 0% clicks) | Store nav | A (24) | 1 voice | Experience |
| Filter layers | 1 or 2 | Collection page | 07 | 1 voice | 1 small-catalogue case |
| Removal candidate | under about 1% of clicks | Any control | 07, A (10/11) | 2 voices | Threshold from examples; low clicks may still be valuable |
| Bundle tiers | 3 (cut from 5) | Multi-pack | A (10/11, 24) | 1 voice | 1 client test, +53% CR, +13.5% AOV; single change; c |
| Savings display | Money amount in the tier headline | Bundles | A (10/11, 14, 24, 01) | 1 voice | 1 client test, +25% CR, +28.57% RPV; c |
| Bundle images | 1 per tier | Bundles | A (24) | 1 voice | 1 client, +32% CR; c; same 32% as the infographic test |
| Gallery infographics | Overlays on real photo | PDP | A (24) | 1 voice | 1 client, +32% CR; c |
| Text to icons | Modules | PDP, LP | A (24) | 1 voice | 1 client, +25% CR, +34% RPV; c |
| Middle-tier ladder | Equal money step per tier | 3 tiers | A (10/11) | 1 voice | +11.74% CR mixed with a compare-at increase; i, c; anchor rejected |
| Visual navigation | Images or story icons | Homepage | A (14, 24) | 1 voice | +15% (pet), +60.7% CR and +92% RPV (Parcel Safety), +72% and +82% (pet); c |
| Category thumbnails at the top | Row near the hero | Homepage | 07 | 1 voice | +18% CR; c |
| Trust badges under add to cart | Returns, guarantee, warranty, shipping | PDP | A (20) | 1 voice | +30% (Parcel Safety); c |
| FUD under the CTA | Same | LP hero | A (25) | 1 voice | "40 to 60%" across clients; c |
| Logo quotes | Quote under each press logo | Proof | A (25) | 1 voice | +38% (WMDC); c |
| Headline tests | Benefit headline | Hero | A (20, 25) | 1 voice | "60 to 80%", "upwards of 80%"; c |
| Hero image test | Proof collage | Hero | A (20) | 1 voice | +78% (Influence Hunter, "boring" original); c |
| Same-page form vs link away | Scroll to form | Lead gen | A (13) | 1 voice | +220%, 1 test; c; lead gen |
| Founder video | 45 seconds max | Trust-led pages | 02 | 1 voice | 10% to 15% on 1 page (source says 33%); c |
| Video testimonials | 30 seconds, phone-shot, about 9 | Trust-led pages | 02 | 1 voice | Cost per lead $200 to $30 on 1 account; i, c |
| Price lower with trust above | PDP with a price objection | PDP | A (01, 20) | 1 voice | +32% then +88% cumulative, 1 client; c |
| Above-the-fold redesign | Value prop, button, benefits bar, products, proof | Store | 07; A (24: +64% CR, +72% RPV Parcel Safety) | 2 voices, same pattern | 07: +64% CR, +52% RPV; both i, c |
| Bundled redesign lifts | 132%, 108%, 187%, 142%, 174% CR and 32% AOV, 282%, 158% orders, "more than double", "upwards of 80%" | Whole-page rebuilds | A (01, 13, 15, 24, 25, 10/11) | 1 voice | i, c; not usable as priors |
| Advertorial vs everyone else | 3 to 4% vs 1 to 2% | Cold traffic | 06 (C) | 1 voice | Metric undefined; no data |
| Advertorial campaign | $1,000 spend, 160 add to carts, $16 per purchase, 6x ROAS | 1 dropshipping product | 05 | 1 voice | No comparison with PDP; i |
| Quiz added before a sales page | 2.3% to over 3% CR | 1 client | 18 | 1 voice | c |
| Advertorial to next page click-through | 30%, ideally 40% | First presell page | 12 | 1 voice | Presenter target; denominator undefined |
| Second to third page click-through | 70 to 80% | 2-page presell | 12 | 1 voice | Target |
| Checkout conversion in a presell funnel | about 15% | Checkout Champ funnel | 12 | 1 voice | Tool-specific; ambiguous |
| Quiz completion | about 30% (25% still good) | Product quiz | 23 (B) | 1 voice | Denominator undefined; does not match its own drop-off illustration |
| Per-question drop-off | at least about 1%; spike is the fix point | Quiz | 23 (B) | 1 voice | Illustration |
| Quiz length | 8 to 12 (range 3 to 20); 15 to 25; 20 to 40 steps | Quiz | 23 (B); 18; 17 | 3 voices, 3 answers | See 7.7 |
| Info screen spacing | every 3 to 5 questions | Quiz | 17 | 1 voice | Its own example ran 7 questions before the first |
| Submissions per report | about 100, at least twice a month | Quiz research | 18 | 1 voice | Rule of thumb |
| Email sequence after capture | 5 to 7 emails | Quiz | 23 (B) | 1 voice | Suggestion (14-EML) |
| Advertorials per hour with AI | 5 to 10 claimed; 3 in 47 minutes shown | Production | 08 | 1 voice | Demo |
| Advertorial draft time | about 1 day; under 1 hour with AI | Production | 12; 16 (B), 21 (6 min 41 s) | 3 voices | Anecdote |
| Build cost | $100 to $200 on Fiverr or Upwork | Native design | 12 | 1 voice | Anecdote `[web check]` |
| Reading grade | about 5; grade 7 to 8 too high; AI target 3 to 5 | Copy | 03 | 1 voice | Preference; ecomOS floor is below 10 |
| Order bump | $10 to $20, about 50% take | Order page | 09 (B) | 1 voice | Recollection; maths inconsistent |
| OTO1 price | 10x front end as a ceiling to test | Post-purchase | 09 (B) | 1 voice | Opinion |
| Pop-up timing | Never in the first 3 to 5 seconds | Pop-ups | A (10/11) | 1 voice | "Up to 125%" with no case; c |
| A/B testing floor | 25,000 to 30,000 visitors a month per page; under 1,000 a week cannot test weekly; 10,000 to 20,000 a month gets before-and-after | Testing | A (01, 20) | 1 voice, internally inconsistent | Heuristics, not sample size |
| Qualitative research required | under 50,000 to 80,000 monthly visitors | Store | 07 | 1 voice | Opinion |
| Minimum test length | 1 week plus calculator; 2 weeks plus significance; 1 test a week | Testing | A (15; 10/11; 20 quoting Hormozi) | 1 voice, 3 answers | See 7.11; 09-CRO decides |
| CTA-style tests | only with thousands of visitors a day | Advertorial | 12 | 1 voice | Opinion |
| User tests | 3 to 5 testers; 5 to 20 minutes; about $45 per tester | Research | A (01, 15), 07 | 2 voices | Practice; price `[web check]` |
| Post-purchase survey completion | 85 to 90% | Right after purchase | 07 | 1 voice | Client claim `[web check]` |
| Mid-session survey trigger | about 60% of average session duration | PDP | 07 | 1 voice | Rule |
| GA4 funnel bands | view product 50 to 70%; add to cart 12 to 20%; begin checkout 40 to 60%; purchase 45 to 60% | Store funnel | 07 | 1 voice | Unsourced "industry" bands |
| PDP engagement wanted | about 1 minute | PDP | 07 | 1 voice | Judgement |
| Collection scroll decay | about 10% lost per 2 products | Collection | 07 | 1 voice | 1 case |
| CTA click share | about 3 to 5% of page clicks per CTA | Area map | A (01) | 1 voice | No basis |
| Load time | 1 second at 3.05%; halves by 2 seconds; about 20% of that by 4 seconds; target under 2, never over 4 | Speed | 02 | 1 voice | Unnamed study `[web check]`; 08-SPD owns |
| Device split | 64 / 3 / 33 (02); about 80% mobile (07); "99%" (05) | Traffic | 02, 07, 05 | 3 voices, 3 numbers | Use brand data |
| Thin review count | about 30 (or 3): do not headline it; pick 2 to 4 | Proof | A (10/11, 13) | 1 voice | Opinion; conflicts with common practice |
| Avatar age for long-form advertorials | 35 and up | Problem-solving products | 05 | 1 voice | Opinion |
| Product appears in a long lead | after about 50 to 60% of the scroll | Click-only ad traffic | 21 | 1 voice | 1 observed page |
| Angles to test before an advertorial | about 5 in 1 CBO campaign | Meta | 05 | 1 voice | Habit (24-DEP) |
| Proof quotes to gather | 10 to 20; 5 objections; mechanism in 3 sentences | Advertorial assets | 12 | 1 voice | Checklist |
| Content to pitch ratio | about 70 / 30 | Publisher sponsored content only | 26 | 1 voice | Rule of thumb |
| Necessary beliefs | 4 to 6 (max 6) | Research base | B (09, 16, 23) | 1 voice | Method |
| Winner lifespan | 5 to 7 years; 40 to 60 pages tested to find one | Lead-gen pages | 02 | 1 voice | Experience |
## 7. Where sources disagree

Each entry: what each side says, when each is right, and what the agent should do. Sources are kept apart; nothing is averaged.

**7.1 Remove navigation or not.** Cluster A (01, 13, 14) and 02 remove the menu on dedicated landing pages (nav took 33.2% of clicks on 1 audited site; every about-page click is paid for). Cluster A (14, 24) keeps navigation on the ecommerce homepage and storefront pages, cut to 7 items and made visual, and 02's card keeps delivery, returns, support and policy access on store campaign pages. Source 24 also removes "Home" and demotes FAQ and About, which sits against the view that trust pages should be easy to find. When each is right: a single-offer page fed only by paid traffic has no reason to leak; a PDP that is also an organic entry and a browse path needs the store frame. What the agent should do: strip navigation to logo, cart and 1 CTA on campaign pages, advertorials, quiz results and lead pages; keep a 7-item visual nav on storefront PDPs, collections and the homepage; move FAQ out of the nav only after the answers live on the PDP; test nav removal on campaign traffic only, never as a storefront default. [89e1eb35d667] [159090e7a12d] [511b0c6e9e86] [bc8e0b03fd58] [d9c4d43e2810]

**7.2 Long pages vs short pages.** Long: cluster A (01, 14, 25: long pages do not kill conversion, bad structure does; best pages are many sections long), 06 and 19 (C: long with deliberate repetition), 12 and 08 (do not let the model condense). Short: 02 (visitors read about 10%; less copy, except SEO pages), 18 (post-quiz page short and proof-heavy), 22 (native traffic gets a shorter page), 09 (B: as long as needed, no longer). Conditional: 21 (length follows how much selling the ad did). When each is right: cold, click-only traffic on a problem-solving product needs the long page; warm, high-intent search, retargeting, post-quiz or post-VSL traffic needs the short one; every extra section must earn its place. What the agent should do: set length from 3J.1 in the brief, write it down with the reason, and propose page length as a test only where scroll data disagrees with the choice. The "60% never scroll" figure is not evidence for either side. [4514239a3d5e] [de1cd5d08ee6] [ffdf5c3a30ff] [4c990d3bdb82] [9246e69228b5]

**7.3 Product early vs late on an advertorial.** Early: 19 (C, the product and mechanism are in the headline and subhead; the listicle follows), 21 for traffic from long ads, 05 (native image ads already introduced the product; the page confirms), 12's warm variants. Late: 12's block order (hook, reader, agitation, why it happens, why others fail, then the offer), 06 (product in section 5 of 10 after a long story), 22 (soft mention late, "not been sold to yet"), 21 for click-only traffic (product at 50 to 60% of the scroll), 03 (mechanism and curiosity lead, product after). When each is right: the more the ad sold, the earlier the product; a story or warning frame delays it; a listicle, buyer's guide or "breaking news" frame can name it early. What the agent should do: decide the reveal point from the feeding ad (3B.4) and the frame (3K.5), state it in the draft plan, place the first CTA soon after the reveal, and treat "first proof block position" as the third test variable after format and headline (12). [ffdf5c3a30ff] [79e0f9206043] [7d6c89cc428f] [98430d1864cc] [82a0e9f86e18]

**7.4 Show the price or hide it.** Hide on the advertorial: 22 (never name the price in the CTA; "check availability"), 12 (reveal what it is and does, hold the price for the second presell page in a 2-page funnel). Show on the advertorial: 05 (urgency bar with the offer at the top, a price anchor and offer block; "some of my best advertorials talked about price right away"), 06 (price reveal in section 8 against anchors), 19 (50% off and the guarantee restated at the close). Show on the PDP: cluster A (14, 24: saving in money in the tier headline; 24 criticises a page for not showing savings per option); the only "price lower" case is cluster A's 1 client with a proven price objection, where the price moved down and trust moved above it. When each is right: a 2-page presell can hold the price to the page that carries the offer; a 1-page advertorial that sends people straight to checkout must show the offer or the click-through becomes a bait step and the PDP conversion falls; a PDP shows price in the buy box unless a price objection is proven and the move is tested. What the agent should do: on a PDP, price visible by default; on an advertorial, show the offer where the CTA is, hide it only in a 2-page funnel where the next page shows it in full; judge any hidden-price variant on purchase rate after the click, not on click-through. [98430d1864cc] [7d6c89cc428f] [2bb1553ace82] [54399c0a8159] [91a259fd4a85] [c8277a1ff908]

**7.5 Hard CTA vs soft CTA.** Soft: 19 and 22 ("Apply discount, check availability"; "not pushy", implies demand; 22 adds a push line above the button), 12 (layer soft, medium and hard on 1 page), 23 (B, "take the quiz" hides the sales ask in the ad). Hard or benefit-led: cluster A ("Get instant quote", "Get thicker hair now", "Lose fat fast"; never "Contact us"), 06 (outcome wording, "click here to get yours back now"), 09 (B, clarity over cleverness on the order page), 14's cards (task labels: "Add to cart", "Choose your size"). When each is right: on an advertorial a soft CTA can lift clicks, but "check availability" is a false scarcity signal when stock is not limited; on a PDP the platform's expected "Add to cart" is the task label and the benefit copy sits around it; on a lead page the outcome label wins. What the agent should do: PDP, keep "Add to cart" with benefit copy near it; landing page, outcome label; advertorial, an outcome or "see the offer" label by default, "check availability" only with real limited stock, and never hide the price behind the button on a 1-page funnel. Test soft vs outcome wording only with the traffic 12 names (thousands a day). [cb940d13cea9] [340d4991b51b] [65c6cbb0e670] [6dbf3e919d60] [ae06c62a4a73] [f965f0b7466d]

**7.6 Sticky button always vs after the product introduction.** Always: 02 (1 pinned mobile CTA visible while scrolling), cluster A (sticky nav CTA and phone on lead pages, "especially critical on mobile"), 12 (1 floating CTA can replace the 4 in-page ones). After the product intro: 22 (a sticky button at the top or at 50% of a story page shows before the reader knows what is sold). When each is right: a PDP or landing page where the product is known from the first screen benefits from an always-visible button; a story-led advertorial has nothing to buy until the reveal, so a button before it interrupts the story. What the agent should do: pinned CTA from the top on PDPs and landing pages, checking it does not skip a required choice; on story advertorials, trigger the sticky button at the product reveal paragraph and move the trigger if the page is edited; test both on any page where the reveal is early. [622577c84cdc] [89e1eb35d667] [65c6cbb0e670] [340d4991b51b]

**7.7 Quiz length: 8 to 12 vs 15 to 25 vs 20 to 40.** 23 (B): 3 to 20, sweet spot 8 to 12, a 3-question quiz before a sales page "seldom" failed; completion target about 30%. 18: 15 to 25, about 20, about 5 minutes, with nurture screens; 1 client went from 2.3% to over 3%. 17: 20, 30 or 40 steps build commitment so the offer matters less; its example is a fitness subscription app, not a store. Common product-quiz advice keeps quizzes under 10 questions (card caveat, `[web check]`). Related split: 17 sorts demographics first because they change the plan; 23 puts personal questions late (gradualization); 17's card says skip demographics that do not change a valid product choice. When each is right: long quizzes are shown only in health, fitness, hair and skin categories with education screens and a subscription or app economics; a product recommendation for a range needs only the questions that change the pick. What the agent should do: start at 8 to 12 with 1 or 2 info screens; add length only when each added question has a job and the category is problem-solution; demographic questions only when they change the recommendation, placed after the goal question; measure completion with purchase and test a shorter version against the long one. [c9f4734eacf6] [4c990d3bdb82] [a7e987adb7a8] [25ad02d8040c] [58789a695fea]

**7.8 Email gate before the results or not.** Gate by default: 23 (B, name and email at the end unlock the personalised result and a 5 to 7 email sequence; no skip option), 17's example (name, date of birth, email before the summary). Trade-off: 18 (decide by KPI: front-end conversion and cash vs an owned list; lean toward gating for subscription offers where a 1.8x instead of 2x front-end ROAS is fine; skip it if front-end conversion matters most). Cards: test both; take marketing consent as a separate choice; explain what will be sent. When each is right: subscription or repeat-purchase offers with a real email programme can afford the drop; one-off purchases judged on front-end RPV usually cannot. What the agent should do: make the email optional or place it after the recommendation for one-off products; gate for subscription offers; always separate marketing consent; test gated vs ungated on purchase rate and RPV; hand the sequence to 14-EML. [b800e9ca6a61] [3269b97e0ba6] [a7e987adb7a8]

**7.9 Lead with pain or not.** Do not: 03 (AI and most writers default to pain so readers tune it out; pain is "for the street", the same for every product; lead with curiosity about your mechanism and proof; earn permission before naming pain; pain can come once the reader is warm; "you can lead with pain but it needs to be sticky"). Do: cluster A (PAS right after the hero for cold Meta traffic; 13's contrast principle "Denied again? We can help"), 06 (story opens on a tiny humiliating moment, then the life shrinking), 19 (pain threshold, the headline opens on a pain), 22 (mirror, then agitate), 05 (qualifying headline lists symptoms). Stage-dependent: 04 (clueless markets open on a symptom they already care about; curious markets open on a contrarian claim). When each is right: 03's rule is about the advertorial lead in a crowded direct-response category where every rival opens with the same pain; cluster A's PAS sits after a benefit hero, not in the headline; 06 and 22 lead with a concrete moment, not a symptom list. What the agent should do: the hero headline leads with the outcome or a curiosity element, never a pain dump; a PAS or mirror section follows for cold traffic, written from a concrete moment with permission softeners and honest agitation; in a crowded category, test a curiosity-and-proof lead against a pain lead. [046994a8d7d8] [81a3fd40b635] [20262eb9059c] [70ebc6c92534] [e5afd40ade58] [7b22550734f6]

**7.10 Reading grade target.** 03: about grade 5, grade 7 to 8 is too high, the AI simplify prompt targets grade 3 to 5, and advertorials may run slightly higher because they mimic editorials; its card says grade 8 is the outer limit, which the talk does not say. No other source gives a grade; 02 and cluster A say "less copy" and "scannable"; ecomOS sets below tenth grade. When each is right: consumer direct response and health copy sits near grade 5 to 7; a premium brand voice or an expert audience can sit higher but still below 10. What the agent should do: run a readability tool on every draft; fail anything at grade 10 or above; aim at 5 to 7 for advertorials and PDP copy; simplify with concrete words and shorter sentences, not by cutting intensity or ideas. [d36b6dd3162b] [1a914d4178f2]

**7.11 Test duration: 1 week vs 2 weeks vs sample-size based.** Cluster A gives 3 answers in 3 files: 15 says at least 1 week plus a sample-size calculator plus a significance check; 10/11 say a minimum of 2 weeks to cover a full cycle plus significance; 20 (quoting Hormozi) runs 1 test a week and says under about 1,000 visitors a week you cannot, while its "low traffic" clients at 10,000 to 20,000 a month get before-and-after reads. 01 sets a flat 25,000 to 30,000 visitors a month per page before any A/B test. 12: CTA-style tests only with thousands of visitors a day. 02: "enough runs" make it significant, no method. 07: none. When each is right: none of these is a calculation; 15 comes closest by naming a calculator. What the agent should do: never quote a fixed duration as sufficient; hand traffic, baseline rate and the smallest lift worth detecting to 09-CRO, which sets sample size, a minimum of full weekly cycles and the stop rule; treat cluster A's thresholds as a screen for "A/B test vs before-and-after", not as a stop rule. [220ec901e95b] [51c0c6b48e3a] [bfdcedabc90c] [5b56dd4acd81] [65c6cbb0e670]

**7.12 Two CTAs side by side or one.** One: cluster A (10/11, 25: 1 obvious CTA, blur test; 14: 1 core action per page, 2 competing offers are cut), 09 (B, clarity). Two: 13 (A) praises Chargebee's dual CTAs (get a demo plus a secondary) as good hierarchy, while its own card says avoid dual CTAs; 19 and 22 run a primary CTA with a soft frame. When each is right: a single-goal page has 1 action; a B2B page with 2 real intents (demo vs trial) can carry a primary and a visually subordinate secondary; a PDP's "Add to cart" plus an express-pay button is a platform pattern, not a competing offer. What the agent should do: 1 primary CTA per screen; any secondary is visually subordinate and never a competing offer; cut a second offer (a free guide next to a booking) rather than style it; test dual vs single only where 2 real intents exist. [2070e6c0b648] [4e7bcbfc5e4b] [159090e7a12d] [8805ac6febed]

**7.13 Advertorial or presell vs straight to the PDP for cold traffic.** For a presell: 12 (PDP assumes intent; 3-minute rule), 08, 21, 05, 06 and 19 (C, the PDP is the scaling ceiling), 09 (B, ad to PDP is a first date). For the PDP: 12 for simple products and product-aware traffic; many operators run cold PDP traffic profitably (02's card, 09's caveat). No source tests the 2 routes on the same traffic. What the agent should do: route by 3A.1 to 3A.3; when a presell is proposed, run it as a split against direct-to-PDP on the same cold audience, judged on purchases, CAC and contribution (06's card), not on click-through. [05ee72da15eb] [b757b2f67584] [1ec80c7e259e] [a0bf3baac741] [5f8bf0a170d8]

**7.14 Quiz wins by personalising or by priming.** 18: the gain comes from congruence and routing (pain point 1 goes to a page and offer about pain point 1); 17: personalisation makes the plan feel made for them and the data feeds research. 23 (B): the front end wins by priming (micro-commitments put the visitor in a suggestible state); personalisation matters at the email step. When each is right: a real product range with a real recommendation rule gains from routing; a single-product brand gains only from priming and research, and must not claim a match it does not make. What the agent should do: never claim personalisation the quiz does not deliver; route by answer where pages and offers exist; write questions for commitment, seeding and pre-handling in either case; use the answers for research in both. [4d9eb8148c84] [38bb690a9cc6] [4a5a01ce29d7]

**7.15 Reviews above the product title.** 14 (A): "on any landing page we always put the reviews as the very first thing", move the rating above the title. Its card: keep rating and product identity prominent near the gallery and test the exact order. Cluster A elsewhere: proof 1 sits above the headline on landing pages. What the agent should do: rating and count in the first screen, near the title; test above vs below the title on the PDP; low risk either way. [3ff3c8b062b0] [12c3e5742646]

**7.16 Show a thin review count or hide it.** Cluster A (10/11: with about 30 reviews "maybe" do not feature the count, hand-pick 3 to 4; 13: with 3 reviews feature 2 hand-picked ones). Common practice shows the rating and count whatever the number, and 02 says a 5.0 with few reviews looks filtered while 4.7 to 4.9 looks real. When each is right: a high-consideration product with 3 reviews gains nothing from "3 reviews"; a growing catalogue with dozens of honest reviews loses trust by hiding them. What the agent should do: below about 30 reviews, lead with hand-picked objection-matched reviews and show the count in the review section rather than the hero; above that, show rating and count in the first screen; never hide negative reviews. [83fd5d9ddc1a] [7f28a425cebc] [4bc5cc0e725e]

**7.17 Written vs video testimonials.** 02: written testimonials are no longer trusted (AI text, stock faces), video is non-negotiable, a founder video is "the biggest non-negotiable"; it calls this a personal bias and admits written still beats nothing. Cluster A and 07: written reviews with name, photo, platform and objection match are the base; video reviews get a scannable headline. Ecommerce practice leans on review volume. What the agent should do: written, verifiable, objection-matched reviews as the base on every page; add 30-second phone-shot video reviews and a 45-second founder video on trust-led, high-ticket or new-brand pages; test with and without the founder video. [4435f3fae23c] [cbc6126cdb67] [85e78b3e4eb7] [ac8005d3b7e7]

**7.18 Design matters vs ugly converts.** Cluster A (01): good design is a "hill to die on", no one spends $5,000 on a page that looks poorly put together; 25 and 15 add familiar layouts. 02: design is a binary trust check in about 50 ms, "beautiful websites make you zero dollars". 09 (B): copy and media carry the sale; design matters only when it adds friction; "ugly, fast and clear" beats heavy and pretty. 12: ugly design can print if the copy rests on real research. When each is right: high-ticket and premium brands need the trust bar cleared with a clean, familiar layout; direct-response funnels win on copy, proof and speed once the bar is cleared. What the agent should do: clear the trust bar with a clean, familiar, fast layout, then spend the effort on copy, proof and offer; never add animation or heavy media that slows the page. [338245ec724b] [8d4d6395709d] [1e9621a4c281] [a5a6310c4758]

**7.19 Does the cold ad show the product?** 06 (C): the cold ad never shows or names the product; it reads as a person sharing a discovery, and the page continues the story. 05: native image ads carry long copy that already introduces the product, so the reader arrives with context. 21: the ad's selling load decides the page. What the agent should do: 10-MCR owns the ad; this agent reads which type the ad is and sets the lead length by 3B.4. Disclosure applies to the ad as much as the page. [d107bfda3ceb] [b7214132b1ab] [ffdf5c3a30ff]

**7.20 FAQ vs pre-handled objections.** 16 and 23 (B): handle every objection inside the advertorial or quiz before the sales page; the best copy has no objections left for an FAQ. 02 and 09 (B) and cluster A keep an FAQ as an objection block and pre-handle the biggest ones earlier with a matching testimonial. What the agent should do: both; the FAQ stays for shoppers who skim to it, and the top 5 objections are answered in the body before it. [99f68cd7f6fd] [56f4e8549a30] [3f57d3484974] [cc5d84e31feb]

**7.21 Attribution of cluster A's own results.** 10/11 give Parcel Safety "upwards of 80%" from several quick wins and no isolated number for the above-the-fold rewrite; 24 gives the above-the-fold redesign its own +64% CR and +72% RPV and gives +80% to a benefit-headline page rebuild; 15 gives Parcel Safety +174% CR and +32% AOV over "a few years"; 20 gives the badge test +30%. The 2 identical +32% results in 24 (bundle images and gallery infographics) may be 1 number reused. What the agent should do: cite none of these as a prior; treat cluster A's numbers as 1 agency's marketing of 1 client. [ac46f2bf0ebf] [d9610985ed8c] [4d8daca6320c] [e0053984b930]

**7.22 Carousels.** Cluster A (01) says avoid carousels (low engagement, unsourced) and shows an HVAC rotating photo-plus-review unit as "very creative"; 25 says never hide reviews in carousels or drop-downs on mobile. What the agent should do: a whole review section is never a carousel on mobile; a single proof unit that rotates is allowed only if the first slide already carries the proof. [79b4db61ba63] [85e78b3e4eb7] [4514239a3d5e]

**7.23 One test a week vs many.** 20 (Hormozi): 1 split test a week, headline first, forces focus. 15: dozens of tests a month for clients. 07: a backlog of 100+ ideas scored and run in order. What the agent should do: 1 test per page at a time; cadence set by 09-CRO from traffic; the backlog is scored, not run at once. [91a259fd4a85] [587103c3bbc8] [1bedb6cc7753]

## 8. Common mistakes

Merged from all 26 sources, deduplicated, each with the fix. Section 8.1 lists the practices the sources model that ecomOS forbids.

| Mistake | Fix | Sources |
|---|---|---|
| Headline says who you are or what you do, not what the visitor gains; or it is vague, jargon or a category label | Rewrite as the outcome (3C.2, 3C.3); run the 5-second test | A (all), 09, 12, 15 |
| Page does not match the ad; generic hero after a specific ad promise | Mirror the promise, persona and offer (3B.1); re-check when creative changes | A (14, 13, 01), 06, 22, 21 |
| Same layout for every traffic source; a form or buy ask before any education on cold Meta traffic | Set awareness in the brief; pain and education first for cold, direct for warm (3A.6, 3D.2) | A (01, 14), 04, 12 |
| Bare page on paid traffic: 1 or 2 sections, no proof, no objections | 3 to 4 value props minimum, proof scattered, FAQ from real objections (3D.1) | A (01, 13, 15) |
| Proof only in the middle or bottom; 1 proof type; logos without quotes; anonymous reviews; hidden in a carousel | 2 verifiable forms in the hero; quotes under logos; names, photos, platform; open grid on mobile (3C.6, 3F.1, 3F.3) | A (01, 25, 13, 14), 02 |
| Testimonials with no job; generic praise | Map each to an objection or belief; place at the point of action (3F.2) | A (10/11, 13), 09, 06, 19 |
| Thin review count headlined; 5.0 with few reviews | Hand-pick objection-matched reviews; show the count in the review section (7.16) | A (10/11, 13), 02 |
| CTA that looks like text, small, competes, or reads "Submit", "Contact us", "Shop now" alone | 1 standout CTA per screen, outcome or task label, blur test (3C.7) | A (01, 10/11, 14, 25) |
| No FUD reducers near the CTA or under add to cart; reassurance only in the footer | Real policies under the button (3C.8) | A (25, 20, 14, 13), 07, 12 |
| Hero image that decorates or contradicts the promise; product-only packshots; galleries of angles | Outcome, use, proof or transformation images; overlays on the real photo (3C.10, 3E.6) | A (14, 20, 24, 10/11), 07 |
| No hierarchy: all caps, all bold, many colours, headline near body size; oversized logo or bar on mobile | Size, weight, colour for headline, body, CTA; subdue the rest (3C.11, 3I.4) | A (10/11, 24, 25, 13) |
| Empty white blocks pushing proof below the fold; add to cart out of reach on the PDP | Tighten the fold; shorten above the button (3C.12, 3C.9) | A (01), 07 |
| Generic section headings ("Our services", "How it works", "Our reviews") | Benefit in every heading; "Helping N achieve outcome" (3E.1) | A (01, 14, 15, 24, 25) |
| Features without benefits; selling the tech stack | "So that" or "so what" drill; benefits lead, features lower (3E.3) | 02, 04, A (01, 13, 15, 20) |
| Dense text blocks; walls of copy | Bullets, icons, subheads, benefit modules; keep specs available (3E.5) | A (10/11, 14, 24, 25), 02 |
| Copy in the writer's voice, not the customer's; skipping research | Review mining, surveys, tickets, quote bank before writing (3E.4, 3N) | B (09, 16, 23), A (15), 06, 22, 03 |
| Making shoppers do maths on savings; % in small text; discount invisible on mobile | Money saving in the tier headline, computed in code (3G.1) | A (10/11, 14, 24, 01) |
| Too many bundle tiers, nav items or page elements; 3 to 4 filter layers | 3 tiers, 7 nav items, 1 to 2 filters, remove near-0% controls (3G.2, 3H.2, 3H.5) | A (10/11, 24), 07 |
| Navigation and outbound links on a dedicated page; linked testimonials and logos | Strip to logo, CTA, required policy; anchor proof on-page (3H.1) | A (01, 14), 02 |
| False affordances (bordered logos, ratings that look clickable) drawing rage clicks | Make them real internal links or inert (3H.5) | 07, A (01) |
| Full-page reload after add to cart; cart stacked with widgets | Cart drawer with the basics (3H.3) | A (24, 01) |
| Pop-up on arrival | Intent triggers only (3H.4) | A (10/11) |
| Control far from what it changes (colour swatch far from the image); image dots instead of thumbnails | Move the control; show thumbnails (3C.9, 4.4) | 07, A (14, 24) |
| Products low on the collection page; high-demand categories and proof where few scroll | Consolidate above the fold; reorder by click share; surface near the top (3D.5) | 07, A (14) |
| Ignoring mobile; desktop-only checks; exit-intent that assumes a mouse | Mobile first, responsive check, mobile-safe triggers (3I) | 02, 05, A (10/11) |
| Heavy pages: animations, big media, budget shared hosting, unused plugins | Speed target with 08-SPD (3I.7) | 02, 09, A (01) |
| Pain list with no agitation and no solution; agitation that invents harm or breaks brand voice | PAS with honest agitation in the brand's voice (3D.6) | A (14, 15), 06, 19, 03 |
| Leading the advertorial with a generic pain dump; assuming the reader's habits without permission | Curiosity and proof in the lead; "maybe", first or third person softeners (7.9) | 03 |
| Advertorial with no editorial identity; a "Warning" that warns about nothing; bolted-on clauses | 1 frame held to the end (3K.5) | 03 |
| Story stops after 200 words and product copy begins; pitch in a sales voice | Story-stop audit; product moves the story (3K.8) | 22, 06 |
| Mechanism with too many steps, mismatched metaphor, several names, or not mapped to the root cause | 1 to 2 steps, matching image, 1 name everywhere, 1 to 1 map (3K.4) | 03, 06, 19 |
| Skipping "why nothing else worked" and the root cause; jumping to the mechanism | Keep both blocks (3K.6 steps 5 and 6) | 06, 12 |
| Skipping objections and the guarantee on a presell ("most people mess it up here") | Risk, price, time, safety block plus 1 clear guarantee (3K.6 steps 9 and 10) | 12, 09 |
| Only 1 CTA at the bottom of a long page | About 4 or 1 floating; first soon after the reveal (3K.6) | 12, 03, 22, A (14) |
| Advertorial built before any ad proves the angle; angles guessed or copied from competitors; chasing the category's top pain in a crowded niche | Angle test first; under-served sub-avatar (3A.4, 3K.2) | 21, 05, 18 |
| Wrong advertorial style for the product (improvement vs innovation) or the ad's selling load | Match style and lead length (3A.5, 3B.4) | 21 |
| Copying a swipe's text, story or claims; "rewrite this swipe for my brand" with no research | Structure only; research first (3K.11) | 16, 08, 21, 12 |
| Shipping AI output with invented experts, studies, testimonials, prices, "clinically proven", "the only" | Scrub against the brand record (3E.10, 4.8 step 8) | 08, 01, 14, 05, 16, 21, 03 |
| Speaking to many audiences at once ("if you're 28, 57, a woman, a man") | 1 persona per page (3B.3) | 22, 08, 05 |
| Quiz questions with no job; typed input at launch; the same format for 20 steps; invasive first question; invented percentages, projections and loaders; exits at the buy box; email consent bundled; completion judged alone; answers never read | 3L rules and 4.10 | 23, 17, 18 |
| Same page and SKU for every quiz answer while claiming a match | Route by answer or drop the claim (7.14) | 18 |
| Sales page judged on looks; order page where buyers cannot find the card field; OTO chosen for take rate; no offer after payment; ending after OTO1 | 3M rules | 09 |
| Testing on guesswork; 1 data point; testing everything at once; stopping early; not logging losers; checking variants in a normal browser; reading results before the data lag; testing a page under the traffic floor; treating a page as done | 3N.1, 3O.3, 4.16; hand to 09-CRO | 07, A (10/11, 20, 01, 15), 02 |
| Fixing every funnel stage at once | Weakest GA4 stage first (3N.2) | 07 |
| Relying on quantitative data alone at low traffic; yes/no screening questions; not reminding testers to think aloud | Surveys, review mining, 3 to 5 think-aloud tests (3N.6, 3N.7) | 07, A (01) |
| Publishing placeholder or "made up" numbers from a mock-up | Claims audit before build (4.17 step 2) | A (14), 05 |
| Typos, double currency signs, wrong link destination, "Shop Now" on an ad to an advertorial | Proofread and link check (5.8); ad CTA "Learn More" (3B.6) | 05 |
| Committing secrets; forgetting host environment variables so tracking breaks live | Keys on the backend only (4.17 step 11) | 02 |
| Pre-selected subscription; shipping-insurance bumps that deliver nothing; cart progress bars with no margin maths | Consent rules; real service; 03-OFF models margin | 12, 18, 09, 24 |

### 8.1 Do-not-copy list by source

These are things the sources show, praise or tolerate. They are recorded so an agent recognises the pattern. None may be shipped.
- 03: an invented "17 years treating liver disease" expert; unverified stats ("55%", "credit card of plastic a week", "$8 billion industry"); disease claims for a supplement; "pretend it's the best and only solution"; "manipulate the proof"; calling an author "Harvard trained" when the study came from elsewhere; calling a dropper a "tea".
- 04: the ASMR "complete bait and switch" hook; manufactured consensus and planted phrases; exaggerated demonstrations that show an effect the product does not have; villain claims (sugar, aspartame) repeated as fact; the card's countdowns and limited quantities (Clemens never said them); the Garcinia auto-billing and Power Balance examples.
- 05: a made-up "licensed dental hygienist" byline; fake reviews on the site and in the AI output; images "stolen" from other sites; unverified "not on Amazon", "limited supplies" and "$6,000" claims; no ad disclosure (he says he should have added one).
- 06: a "written by Dr." byline on a story; written testimonial personas per objection; a fabricated comment section; "340% blood flow", "3% per year", surgery "half the time", "making cortisone shots obsolete"; "sold out 3 times this year"; "$159 suggested retail"; blaming "the system"; a page that hides that it is an ad.
- 08: "a fake spokesperson is not uncommon"; first-person weight-loss stories from people who do not exist; model-written studies, testimonials and prices left unchecked.
- 09: a page with "most likely fake urgency" shown as good; expedited-shipping and shipping-insurance bumps where "you're not changing anything"; "solve one problem, create another" sliding into manufactured problems.
- 10/11 (A): raising compare-at prices that were never charged to widen shown savings.
- 12: AI-generated people and doctors shown as real; third-party "review" and "news" pages that hide the brand paid; an invented mechanism ("I just made that up"); review quotes ripped from competitors ("I can't endorse that, but I know that's what you guys will do"); "very low availability" with no stock basis; discrediting named drugs and rivals without proof; pre-selected subscriptions; disease claims (nerve pain, blood pressure, prostate, weight loss, "plastic poisoning").
- 16: an advertorial defined as third-party and impartial with no label; an invented first-person narrator; a "whistleblower" insider who does not exist; "heating companies are keeping you broke" villain claims; AI research quotes used as testimonials; unsupported savings claims.
- 17: peer percentages ("more than 62% of users") and result-date projections with no base; a loading screen that pretends to compute; a 6:30 discount timer of unknown honesty; "using their answers against them"; consent bundled with "email my results".
- 18: "2x chance based on a 12-week study" and "400,000 women in their 30s" unless real; subscription pre-selected; a quiz that only looks personalised.
- 19: "Top PGA pro says"; "featured on Golf Channel"; "guarantees square club face"; "saves 4 to 6 strokes on the first round"; "over 33,000 golfers"; "sold out in 2 days"; unnamed "golf experts" and a rival "hidden design flaw"; a first-person story with no named author; "the golf equipment review team" sign-off; "check availability" with unlimited stock; "only on this page today", "full price is double".
- 21: "disguised as an editorial" with no label; "create the advertorial exactly like the one I am giving you"; claims copied from "a very similar product" on Amazon; "ammonia can harm their health", "forcing fluid back into bulging discs".
- 22: a fictional patient "Mary" and a doctor narrator presented as real; "my doctor asked where to get it" when no doctor did; "more women got rid of their problem" with no count; the invented "rheumatoid trauma protocol"; phone-style staged photos shown as real patients; a made-up author bio; a page with no ad label.
- 26: calls advertorials "semi sneaky" and gives no disclosure guidance; the sponsored label is the publisher's job in its examples.
- Cluster A (01, 14): mock-ups with "all made up data" and AI headlines with "97% success rate", "clinically proven", "Swiss approved", "the only"; the presenters say never to publish them, and neither may the agent.
## 9. Deliverables

Every deliverable is a Markdown document in the brand's folder, with a header line: brand, page, page type, traffic source and awareness, date, sources used (mini playbook numbers and card ids), and the list of `[needs brand data]` and `[web check]` items still open. Arithmetic is shown with the code that produced it. No deliverable contains a lift promise; sources' figures appear only as examples with their gaps.

### 9.1 Page audit
For a PDP, landing page, homepage or collection. Format:
1. Header and the 1 conversion event.
2. Data read: device split, scroll reach at the fold, 75%, 50%, 25%; click share per element; rage clicks; converter patterns; GA4 rates where relevant; survey and review themes. Each with the tool and date.
3. Checklist results: the relevant table from 5.1 or 5.2 plus 5.5, 5.6 and 5.7, each row pass or fail with the evidence.
4. Findings ranked: each with 2 to 4 data points, the rule it breaks (section 3 number), the fix, and whether the fix is a repair (ship), a test (hand to 09-CRO) or a research task.
5. Compliance blockers listed first and separately.
6. Wireframe deltas: the changed sections only, with copy (9.2 format).
7. Open items: `[needs brand data]`, `[web check]`, `[verify UI]`.

### 9.2 Section-order wireframe with copy (cold landing page or campaign page)
For a new or rebuilt cold-traffic landing page or ecommerce campaign page, not a storefront PDP (use 9.2b). Format: 1 block per section in order. Each block: section name and purpose (which rule it serves); heading copy; body copy or bullets; proof item(s) with source and consent status; image direction (real photo, brand asset, or generated with the note that the product must be the real photo); CTA label and destination; FUD reducers with the policy line they match; mobile note (what is pinned, what is hidden, what stays open). The hero block also lists the ad promise it mirrors and the 7-trait headline score. The document ends with the claims register (every number, endorsement and study with its record) and the reveal point for a presell (where the product first appears and why).

### 9.2b PDP brief
For a PDP rebuild, which follows the fixed template in 3C.9 and 4.4 rather than the long-form wireframe built for a cold landing page. Format: gallery plan (image order and what each sells); buy-box order (title, price and saving, rating placement, selector, add to cart); FUD list (each reducer and the policy line it matches); bundle block (tiers, images, money saving per tier); objection-matched reviews near the buy box; body modules converted from dense text; store-lever additions where they apply (subscribe-and-save selector 3C.15, delivery ETA or pincode check 3C.16, payment trust signals 3C.17, frequently-bought-together 3D.13, size or fit guide 3D.14); claims register; open `[needs brand data]` and `[web check]` items.

### 9.3 Advertorial draft
Format: disclosure label; frame and format chosen with the obstacle it attacks; persona; feeding ad and its 4 variables; the research base summary (3 to 5 pains and desires, alternatives, root cause, mechanism in 3 sentences, top 5 objections, necessary beliefs); the full draft in the 3K.6 block order with subheads; CTA plan (positions, labels, destination, sticky trigger); image plan per paragraph with origins; claims register; review results from 5.3 with the fixes applied; reading grade; the 2-page presell note if the price is held to the next page, with that page's offer block.

### 9.4 Quiz spec
Format: purpose (recommend, research, prime) and the rule that maps answers to SKUs, sizes or bundles; question list in order with, for each: text, input type, options, job label (recommend, research, commit, seed, pre-handle), branch logic, and whether it changes the recommendation; info screens with their copy, what they reflect and the data behind any number; capture step with consent wording and gate decision (7.8); results page block order and copy; tracking events; export and reporting cadence; first-3-question test plan; the 3 contradictory test paths and expected outputs; compliance results from 5.4 and 5.7; hand-offs to 14-EML (sequence) and 10-MCR (angles from answers).

### 9.5 Test backlog (handed to 09-CRO)
A ranked backlog, not 1 proposal: every candidate test scored with the PXL-style sheet (4.16 step 3) and run in that order, highest first. Format: for each candidate, page and URL; hypothesis in "if, then, because" form with the 2 to 4 data points; primary metric (purchase conversion, RPV or contribution per visitor) and guardrails (AOV, refund rate, margin, add-to-cart); variant description with the wireframe delta; test type (A/B element, split URL, before-and-after with rollback date); weekly sessions and orders for the page; what stays frozen; the tracking event; the sources' prior stated as an example with its gaps (n, d, i, s, c); PXL-style score; the follow-up test if it wins; rollback plan. The document lists candidates in score order, not just the top 1, so 09-CRO can queue the next test without waiting on a fresh write-up. 09-CRO adds sample size, duration, stop rule and the registry record for each it runs.

## 10. What needs live data or a web check

### 10.1 `[needs brand data]`
- Traffic mix per landing page by source and awareness stage; which ads send to which pages; live ad copy per page (3A.6, 3B.1, 4.1)
- Device split per page; scroll depth by device; click share per element; rage clicks; session recordings; converter paths (3I.1, 3N.3 to 3N.5)
- GA4 purchase journey rates for 6 to 12 months, path exploration, landing page report, device report; GA4 event setup audit (3N.2, 3N.8)
- Weekly sessions and orders per page, baseline conversion rate (3O.2, 4.16)
- Cold-traffic PDP conversion rate and CPA, to compare with an advertorial or quiz route (3A.2, 7.13)
- Ad results by angle; break-even ROAS from cost, shipping, fees and margin (3A.4)
- Product facts: specs, materials, contents, form, origin, how it is used, what it does that alternatives cannot; the real mechanism and its evidence; the real development story (3K.1, 3K.4)
- Substantiated claims list; banned claims for the category; real customer counts, review counts, result figures and time-to-result (3C.2, 3E.8, 3F.5)
- Guarantee, returns window, who pays return shipping, warranty, shipping cost, delivery and dispatch times, payment methods, COD, refund rate and margin after refunds (3C.8, 3G.6)
- Price history and legitimate compare-at prices; bundle prices, unit maths, margin per SKU and tier; tier sales mix (3G.1 to 3G.4)
- Stock levels, promo calendar, channel availability on Amazon and marketplaces (3G.5, 3G.7)
- Reviews with text, names, photo consent, platform, date; which reviews answer which objection; repeat-buyer reviews (3F.1, 3F.2)
- Named experts, founders or customers who agreed to appear and what they will say; real press quotes with permission (3F.8, 3F.1)
- Customer research: review mining pivot, post-purchase and mid-session survey answers, support tickets, ad comments, sales-call objections, quote bank, necessary beliefs (3E.4, 3N.7, 4.6)
- Top pre-purchase questions for the FAQ (3D.11)
- Brand voice rules and limits on agitation (3D.6, 3J.3)
- Quiz: which answers change the recommendation; quiz starts, step views, completions, captures, purchases after the quiz by path; answer exports; email platform field mapping; subscription share (3L, 4.10)
- Sales funnel: conversion rate and AOV per step, COGS, take rates by OTO price (3M)
- Past test results and headline test history from the 09-CRO registry (3O.3)
- Nav click share per item; heatmap click share on gallery images (3H.2, 3E.6)
- Real answer distributions before any "more than X% of users" line (3L.5)
- Consent to contact buyers for persona research; review consent for names and photos (4.6 step 7, 3F.1)
- Theme and builder features: cart drawer, sticky CTA trigger, variant image swap, custom HTML block, review app fields, survey tool triggers (3P.2)

### 10.2 `[web check]`
- Advertorial and native ad disclosure rules per market and platform (FTC native advertising and endorsement guides in the US; ASCI and the dark pattern guidelines in India for Gehna; Meta landing page and misleading content policies) (0.3, 5.7)
- Health, supplement, cosmetic and device claim rules per market; Meta policy on personal attributes, health and weight loss in copy; before-and-after image rules (0.6, 5.7)
- Reference pricing rules per market (US FTC pricing guides, EU Omnibus 30-day rule, India consumer protection) (3G.4)
- Subscription pre-selection and auto-renew consent rules; marketing consent rules for quiz capture (3L.10, 5.4)
- Comparative advertising rules when naming competitors (buyer's guide format) (3A.5)
- Origin of the recurring statistics: "60% never scroll past the fold", "people read 20% and scan 80%", "images process 60,000 times faster", "90% of information is visual", "50 ms first impression", "Amazon runs 12,000 experiments", "270% more likely with 5 reviews", "4x sales from speed to lead", the 3.05% load-time study, the "4,000 ads a day" and goldfish claims (6)
- Current scroll-depth research by device for ecommerce (3N.3)
- Current quiz length benchmarks for product quizzes (7.7)
- Current Shopify checkout extensibility for order bumps, quantity breaks and post-purchase offers; conversion effect of leaving native checkout (3A.8, 3M.4)
- Tool prices and features: UserBrain per-tester price, Microsoft Clarity limits and pricing, Okendo surveys, Intelligems and Go Stellar, FigPii, PostHog experiments, Heyflow, PageFly free tier, GemPages, Funnelish, Checkout Champ, Zipify, Elementor and Flywheel plans, Fiverr and Upwork rates (3P.2, 4.12 to 4.16)
- AI tools named: current Claude and ChatGPT models, file upload limits, output length, Deep Research availability, Poe pricing, Higgsfield policy on images of people and minors, Nano Banana (4.8)
- Public awareness stage of any trend used as "why now" (microplastics, seed oils) (4.6 step 5)
- Every study cited in any advertorial: the paper, population, dose, design, result (3F.6)
- Marketplace listings for the product before any exclusivity claim (3G.7)
- Meta Ad Library run dates for any competitor page used as a structural reference; whether swipe pages are live (3K.11)
- PXL framework's original criteria (4.16 step 3)
- Google policy on scaled or programmatic pages (3B.5)
- Correct presenter and brand names where transcripts garbled them (Alex Fedotoff, MadMuscles, Luvly, iRestore, Lagree, Nutrisense, Capterra, Jonno Catliff's channel) (12)
- Whether the Rejuvaare and Performance Golf pages and revenue claims are real and current (12)

## 11. Freshness and stale-risk notes

| Area | What can go stale | Re-verify how often | Rules affected |
|---|---|---|---|
| AI tool versions and limits | Claude 3 and message caps (08, April 2024), GPT-4.5 and Deep Research (16, 2025), "ChatGPT 5" (23), Claude output length and stalls (21), Poe pricing, Higgsfield's ban on images of kids (05), Nano Banana | Every project; models change quarterly | 4.8, 3E.10, 3K.11 |
| Shopify checkout and theme features | Order bumps, quantity breaks, post-purchase offers, checkout extensibility (09's claim that native checkout lacks bumps), cart drawer, variant image swap, custom HTML pages hiding header and footer, PageFly free tier | Every build; Shopify changes checkout yearly | 3A.8, 3M.4, 3H.3, 4.17 |
| Ad policy | Meta rules on advertorials and pre-landers (05 says Meta "cracks down now"), personal attributes and health, misleading formats, weapon ads (04), Google policies on scaled pages, TikTok and Taboola native rules, disclosure wording per market | Before every advertorial or quiz launch; quarterly | 0.3, 0.6, 3K.6, 5.7 |
| Consumer law | Reference pricing, dark pattern guidelines (India), subscription consent, review and testimonial rules (FTC consumer review rule), before-and-after images | Before every offer block or quiz; yearly | 3G, 3L.10, 5.7 |
| Analytics and testing tool UI | GA4 report paths and metric names ("key events" since 2024; "time on page" is a Universal Analytics name), Clarity menus and area maps, PostHog experiments and authorised URLs, FigPii, Intelligems, Okendo, UserBrain | Every procedure run | 4.12 to 4.16, 3N |
| Costs and prices | UserBrain about $45 per tester, Elementor about $11.99 a month (CAD), Fiverr $100 to $200 builds, ad cost rises (20's Meta +61% and TikTok +185% carry no year) | Yearly | 3N.6, 3P.2, section 6 |
| Format cycles | 23 says quiz funnels are a "limited window" (advertorials, then VSLs, now quizzes); 26's publisher examples date to 2014 to 2015; 03's trend calls (microplastics in the early majority in 2025) | Yearly; check the awareness stage before reuse | 3A.7, 3K.12, 4.6 step 5 |
| Named example pages | Rejuvaare, Performance Golf, Bioma, Primal Queen, Javvy, Yeti, Prepared Hero, iRestore, Segment, Chargebee, Snov.io, MadMuscles, Luvly: layouts change | Before citing as a reference | 3K.11, section 12 |
| Recurring statistics | 60% no-scroll, 20/80 read, 60,000x, 50 ms, load-time curve | When a source is found; do not put them on client pages until then | 3C.1, 3E.1, 3E.6, 3I.7 |
| Cluster A's client numbers | Reported by the agency that sold the work, no n or duration; the same tests appear in 3 files with slightly different figures | Never use as priors; replace with the brand's own tests | 3O.5, 6, 7.21 |

24 Sep 2026: ecommerce specificity pass applied from ECOM_REVIEW.md; priority block added, 14 rules reworded, 8 levers added, about 500 words moved to Appendix A.

## 12. Source index

Numbers are the mini playbook files. Cluster letters mark files that count as 1 voice.

| # | Title (short) | Type | Voice | Credibility and bias | Contributed most |
|---|---|---|---|---|---|
| 01 | The Only Landing Page Guide You'll Ever Need | Transcript, agency masterclass | A | Landing page and CRO agency selling design, build and audits; lead-gen clients; lifts bundle many changes; unsourced stats (60%, 20%); ecommerce thin, PDP cards are card adaptations | Fold anatomy, section template, Clarity and UserBrain procedures, 25,000 to 30,000 visitor threshold, price-lower test, bundle savings, cart drawer |
| 02 | Claude Code Website Masterclass, 20% conversions | Transcript, screen-share | 02 | Local-service lead gen turned AI agency; sells a community; own account data, no test detail; 20% is form fills; several stats he distrusts himself; merchant cards are adaptations | Kill nav and footer on ad pages, pinned mobile CTA, founder and video testimonials, message-match "zipper", speed loop, PostHog split test setup, tracking before testing |
| 03 | The Most Valuable 60 Minutes on Advertorials | Transcript, live review | 03 | Direct-response copywriter selling a $27 course and AI copy bots; no conversion data; says of his own draft "do I know this would work? Absolutely not"; models an invented expert and "manipulate the proof" | Pain ranking, big idea, mechanism and metaphor rules, editorial frames, do-not-lead-with-pain, headline load, reading grade 5, anti-AI rewrite prompts, review checklist |
| 04 | Psychological Tricks, $1 Billion (Craig Clemens) | Podcast transcript | 04 | Golden Hippo co-founder; retold history (Bernays, Hopkins, Otis) and round numbers; no tests; several examples are harmful or fraud; page placements are card suggestions | 7 hijacks (about them, event, demonstration, proof, daily behaviour, dream, rebel), 3 market stages and search-trend read |
| 05 | Copy my $20k/day advertorial structure | Transcript, dropshipper | 05 | Dropshipper selling a community and a PageFly template; own screenshots for 1 banned product; header mislabels it as Hormozi; used a fake expert, fake reviews, stolen images, no disclosure | 20-block advertorial order, qualifying headline, angle-first order of work, native image ads, "why not Amazon", price anchor vs cost of failure, Claude HTML rebuild prompt |
| 06 | Guide: $100k/day with Advertorials | Transcript, teardown | C | Ecommerce growth agency selling calls; teardown of 1 competitor page; "3 to 4% vs 1 to 2%" unsourced; page relies on a Dr. byline, personas and a fabricated comment section | 10-section advertorial, ad's 4 jobs, pain threshold, "why nothing else worked", root cause to mechanism 1 to 1, day-by-day proof, objection testimonials, price reveal, two paths |
| 07 | The BEST CRO Tutorial for Ecommerce (Arsh) | Transcript, tutorial | 07 (possibly A) | CRO agency, "150 brands in 80 niches", sells audits; 1 client's GA4 and Clarity data; 2 lifts without n; funnel bands unsourced | GA4 funnel bands and path exploration, area-map reading, collection and PDP fixes, surveys, review mining, user tests, hypothesis form and PXL, above-the-fold redesign |
| 08 | Using Claude to Write 10 Advertorials in an Hour | Transcript, demo | 08 | Stefan Georgi, sells a mastermind; demo only, April 2024 tooling; says fake spokespeople are "not uncommon" | Extraction battery, swipe-for-structure, 1 archetype per advertorial, model hallucination scrub, "advertisement" label at the top |
| 09 | $535k/mo with landing pages that look like sh_t | Transcript | B | "Mark", sells a program; no data; arithmetic slips; shows a fake-urgency page as good; bump ethics | 2-metric judgement, sales page 8 must-haves, 7-trait headline, honest urgency and scarcity wording, guarantee design, order page and OTO frameworks, 4 research documents |
| 10 | 11 Landing Page Tricks | Transcript | A | Same agency as 01; client tests without n; borrowed stats; compare-at inflation (rejected) | Objection-matched proof, image-led selling, 4-part fold, hierarchy sizes, pop-up timing, 5-to-3 tiers, savings in the headline, FUD pass, 2-week test rule |
| 11 | Brutally Honest Landing Page Advice (mis-titled Hormozi) | Transcript | A | Same video as 10, filed twice; not Hormozi | Nothing new; counted once |
| 12 | $100 Million Advertorial Formula | Transcript, screen tour | 12 | "Alex" selling Get Hooked AI, a swipe file and agency help; observed pages, no results; tolerates AI doctors, ripped reviews, invented mechanisms, undisclosed third-party pages | 3-minute rule, 4 triggers, 6 formats and obstacle map, universal block order, 3 proof layers, 4 CTAs or 1 floating, KPI targets, test order, 1-day build |
| 13 | 4 Proven Steps to a Million Dollar Landing Page | Transcript | A | Same agency; B2B and lead-gen examples; 220% is 1 test; unsourced stats | 5 hero pillars, "so that" chain, CXL awareness headline rows, proof stacking, blur test, form friction, progressive disclosure, same-page form test, proof at decision points, leading questions |
| 14 | I Studied 1,000 Landing Pages, This Stops Them | Transcript, audit | A | Same agency; 1 numbered test (15%); "made up data" mock-ups | Fold anatomy with FUD, ad-promise mirroring, subheadline as mechanism, closer section, homepage View Product Rate and visual nav, PDP first-screen rules, bundle labels, nav removal limited to campaign pages |
| 15 | The NEW Way of Landing Pages in 2026 | Transcript | A | Same agency; 3 pillars; case results without design | Headline formula (result, time, payoff), pain section formats, proof headline formula, blueprint counts, offer decomposition, GA4 plus Clarity plus UserBrain test loop, 1-week minimum plus calculator |
| 16 | Advertorial landing pages with AI, $1.3m/mo | Transcript, demo | B | "Mark"; no data; prompts not in transcript; no disclosure; invented narrator | 5-step SOP, foundational docs, max 6 beliefs, draft in halves, AI and human review, slippery slide, objections before the sales page |
| 17 | Best 2026 Ecommerce Quiz Funnel Structure | Transcript, teardown | 17 | Quiz agency selling builds; 1 fitness app quiz; no results; praises fake loaders and peer percentages | 30-step walkthrough, info screen every 3 to 5, input variety, results page order, remove exits, first-party research |
| 18 | Scale past $100k/day with Quiz Funnels | Transcript | C (caveat) | Growth agency selling calls; 1 client result; 2 observed quizzes | First 3 questions as hook, 15 to 25 length, nurture screens, email gate trade-off, routing by pain point, 100-submission reports, awareness from "what have you tried" |
| 19 | The Ultimate Advertorial Blueprint, $1m/month | Transcript, teardown | C | Agency; teardown of Performance Golf; unverified endorsements, counts and scarcity | Pain, desire, mechanism colour-coding, 1 named mechanism everywhere, proof story arc with a hedge, testimonial per objection, soft CTA, first CTA after risk reversal, two-options close |
| 20 | Alex Hormozi's Advice on Landing Pages (reaction) | Transcript, reaction | A | Same agency reacting to Hormozi clips; agency lifts without n; ad-cost stats undated | 1 test a week, headline then image, traffic floor and before-and-after path, Value Equation mapping, badges under add to cart, quantify time, effort-reduction copy, status for premium goods |
| 21 | $1k/day advertorials with Claude in 6 min 41 s | Transcript, demo | 21 | Dropshipping coach; demo with made-up variables; no results; "disguised as editorial" | Build after ad proof, ad-selling-load to page-length rule, improvement vs innovation styles, in and out of niche swipes, PDFs-in HTML-out, PageFly deploy |
| 22 | 3 things every winning advertorial has | Transcript, drawn | 22 | Health advertorial writer selling services; all examples fictional; invented doctor, patient and mechanism name | Mirror, story, transformation; write for 1 real buyer; story-stop audit; after state first; no price in the CTA (conflict); sticky button after reveal; images match paragraphs; author bio under CTA |
| 23 | Quiz funnels, $1,073,966/mo | Transcript | B | "Mark"; no numbers from his own quizzes; completion maths inconsistent | 3 jobs per question, gradualization, format rotation, no typed input, 8 to 12 length, 30% completion and spike diagnosis, email gate and 5 to 7 emails, AI drafting on research docs |
| 24 | Increase Conversion Rate INSTANTLY, cognitive friction | Transcript | A | Same agency and same client data as 10/11 with different attribution; borrowed stats | 5-step friction checklist, 7-item nav and demotions, bundle images, gallery infographics, text to icons, badges, cart drawer and progress bar |
| 25 | I Studied 1000 Landing Pages, What Works in 2025 | Transcript | A | Same agency; 7 rules; lifts bundle changes | 6-element hero with FUD under the CTA, emotion and PAS, long pages with structure, verifiable proof with logo quotes, hierarchy, Jakob's law |
| 26 | Advertorials: How To Write Them (Neville Medhora) | Short video | 26 | Copywriting teacher selling a course; 2014 to 2015 publisher examples; different meaning of advertorial; no data | 70/30 content to pitch, share and tear-out tests, host trust, plain ads skipped |

**Neighbour folders and what lives there.** 03-OFF-offers: bundle, threshold, guarantee, subscription and discount economics, and the costed offer block this agent presents. 06-MEA-measurement: GA4 events, thank-you page and purchase tracking, quiz event setup. 08-SPD-speed: load time, images, scripts, Core Web Vitals. 09-CRO-testing: hypothesis registry, sample size, run length, significance, readouts. 10-MCR-paid-social-creative: ad hooks, native image ads, video, angle tests, quiz-answer angles. 11-ADC-ad-copy-deployment: ad copy fields, reading-level and anti-AI editing rules shared with 03's copy advice. 12-GAD-google-ads: search landing page rules, city x service pages (02). 13-ORG-organic-and-content: sponsored content on publisher sites (26) and SEO pages with hidden long copy (02). 14-EML-email-lifecycle: post-quiz sequences, branch by answer, leak recovery. 17-CXP-post-purchase: post-purchase offers beyond the page, subscription consent flows. 20-FIN-finance-and-accounting: break-even ROAS, contribution per order, COGS. 24-DEP-ad-deployment: CBO angle tests, placements, ad CTA buttons, campaign structure (05, 12 settings).

## Appendix A. General background

Moved out of sections 3 and 6 on 24 Sep 2026 because it is not store-specific: publisher-hosted sponsored content practice, a B2B-first case-study rule, unverified general web-psychology statistics, and 2 info-product pricing heuristics. Kept for reference; an agent never applies these as store rules.

### A.1 Publisher-hosted sponsored content (moved from 3A.9 and 3K.12)

From 3A.9: A sponsored piece on a publisher's site is a different asset from a brand-hosted advertorial. Condition: any placement on Forbes, BuzzFeed, a creator's blog or a news site. Source 26 only. Its rules (70/30 content to pitch, share test, tear-out test) apply there, not to a presell page. [e8a2b0ea5103] [94b27707001f]

From 3K.12: Sponsored content on a publisher's site (source 26 only): about 70% useful or fun content, 30% or less pitch; the piece must pass the share test and the tear-out test; a plain ad next to unrelated content converts poorly; disclosure is the publisher's "sponsored by" label plus the brand's own check. Condition: paid placements on Forbes, BuzzFeed, Thrillist and the like, or a deal email to an owned list (where the 70% can be product how-to). Not for a brand-hosted presell. [94b27707001f] [155f2bc2faf1] [343044bc4a83] [63b55235ae47] [687f3ff8d7fe]

### A.2 Case studies, B2B framing (moved from 3F.9)

Case studies and results are specific: before, after, period, conditions and limits. Condition: B2B, high-ticket and any product with measurable outcomes. Never reuse an agency's revenue results as product proof; never promise the same result to everyone; a real customer story keeps its real limits and hedges ("can't say with 100% certainty"). Sources: 02, 19 (C), 06 (C). [e03cd7999ee5] [fc341da1e995] [cca2df9310c1]

### A.3 Unverified web-psychology statistics (moved from section 6)

None of these are store facts. Each was already flagged as unsourced where it stood and again in section 10.2.

| Item | Value | Condition | Source | Confidence | Lacks or basis |
|---|---|---|---|---|---|
| Time to make the benefit clear | 5 seconds | Hero | A (01, 10/11, 13, 20, 25) | 1 voice, repeated | Heuristic |
| Visitors who never scroll past the fold | 60% | All pages | A (01, 13, 14, 20, 25); 07 says about 60% leave after the homepage hero | 2 voices | Unsourced; no device split `[web check]` |
| Share of copy read | 20% read, 80% scan; 02 says about 10% | All pages | A, 02 | 2 voices | Unsourced heuristics |
| First impression time | about 50 ms | Design trust check | 02, 13 (A) | 2 voices | Uncited |
| Star rating that reads real | 4.7 to 4.9 beats 5.0 | Proof | 02 | 1 voice | Opinion |

### A.4 Info-product pricing heuristics (demoted from 3M.4 and 3M.5)

From 3M.4: order bumps at $10 to $20, about 50% take, from source 09's recollection; source 09 also says the order page "always" loses the most visitors and is its most impactful test, with no data behind either claim. The store instruction (a real service, priced by contribution per buyer) stays in 3M.4.

From 3M.5: source 09's "10x front end" price is a ceiling to test, not a rule, for OTO1, sized for long-form direct-response funnels rather than a store's own contribution maths. The store instruction (post-purchase offer at peak emotion, priced by contribution per buyer) stays in 3M.5.
