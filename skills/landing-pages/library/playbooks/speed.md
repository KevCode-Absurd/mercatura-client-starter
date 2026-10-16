# Speed (08-SPD) playbook

version: 2.0-draft  |  date: 24 Sep 2026  |  sources: 9  |  cards: 226  |  built from: sources/*.md

## 0. How to use this playbook

**Who runs it.** The site speed agent. It audits a storefront's speed end to end, decides what to fix in which order, does the fixes it can do safely (or writes the brief for a developer or host), and proves each fix with before and after data. It works on Shopify first (6 of 9 sources), on WordPress and WooCommerce second (sources 02, 04, 05), and on any other platform for the architecture rules (sources 07, 08, 09).

**Which sections to load for which task.**

| Task | Load |
|---|---|
| First audit of a store | 0, 1, 2, 3 (groups A and B), 4 (P1 to P6), 5 (all), 6 |
| Business case for speed work | 3 (R9), 4 (P6), 6, 7 (conflicts 7.2, 7.3, 7.9) |
| Image audit and fixes | 3 (group C), 4 (P14 to P17), 5 (5.2), 6 |
| Apps, scripts and third parties (Shopify) | 3 (group D), 4 (P7 to P12), 5 (5.3), 7 (7.7, 7.12) |
| Plugins and assets (WordPress, WooCommerce) | 3 (group D, E), 4 (P7, P13), 5 (5.3, 5.4) |
| Theme code, CSS and JS | 3 (group E), 4 (P22, P23), 5 (5.4) |
| Fonts | 3 (group F), 4 (P21), 5 (5.5) |
| Layout shift (CLS) | 3 (group G), 4 (P19, P20), 5 (5.6) |
| Largest Contentful Paint (LCP) | 3 (group H), 4 (P18), 5 (5.7) |
| Interaction delay (INP, TBT) | 3 (group I), 4 (P13, P10), 5 (5.8) |
| Caching, CDN and hosting | 3 (groups J, K), 4 (P26 to P28), 5 (5.9, 5.10), 7 (7.4, 7.10) |
| Video, embeds, redirects, checkout | 3 (groups L, M, N), 4 (P24, P25), 5 (5.11, 5.12) |
| Prove a fix and report | 3 (group P), 4 (P30), 9 |
| Peak sale readiness | 3 (R94), 4 (P31), 5 (5.13) |
| Deciding to call the host or a developer | 3 (group O), 4 (P28), 9 |
| Custom or framework storefront (Next.js, custom app) | 3 (groups D, E, F, H, and R59 to R61), 4 (P1, P18, P21, P30), 5 (5.3, 5.5, 5.7), 6 |

**What the agent must fetch before acting.**

- From the brand record: platform and plan, theme name, version, who built it and when it was last customized; installed apps, plugins, app embeds and external scripts with the revenue role of each; which widgets must show at first paint; pixel and consent setup; mobile share of sessions and revenue; the pages ads land on; AOV, daily sessions, conversion rate, monthly orders, cart abandonment rate; whether shoppers use dynamic checkout (wallet) buttons; the store's own load time and speed history.
- From the data layer: sessions and revenue by template (home, collection, product, cart, checkout); scroll and click maps if they exist; Search Console Core Web Vitals report if connected.
- From the web: the current Core Web Vitals list and thresholds at web.dev/articles/vitals (sources are dated; 5 of 9 still name FID); current Shopify admin speed reporting; current Shopify image delivery behaviour (WebP and AVIF); current AVIF browser support; tool prices and plan limits (GTmetrix, WebPageTest, CDNs, hosting); whether named apps and plugins still exist. Section 10 lists every item.

**Hard rules for this agent.** Read-only until a baseline is recorded. Work on a duplicate theme or staging. Change 1 thing at a time. Never remove a script whose function is unknown. Never touch pixels or consent banners without the tests in P10a step 7 and P30 step 4. Never clear caches or purge a CDN on a live store without the owner's go-ahead. Do arithmetic in code, not in the model.

**Ecommerce first.** This playbook is for stores, not for a generic website. Section 3.0 is the ranking: it says what to fix first for a store, and every other rule in section 3 is the detail behind it. Store-type conditions (hero SKU vs catalogue, low vs high AOV, subscription vs one-off, marketplace-heavy, luxury or considered purchase, mobile-first India vs US) decide which rules apply and how far to push them; check 3.0 before opening any procedure.

## 1. Scope and outcomes

**What this domain covers.** How fast a storefront loads and responds for real shoppers, and the score Google gives it. Concretely: images (size, format, delivery, lazy loading), scripts and apps (which to keep, how they load), theme code (Liquid, CSS, JS, critical CSS, loops, Quick View, sliders), fonts, third parties (pixels, chat, reviews, embeds), caching and CDN, hosting and server (TTFB, PHP, HTTP/3, database), layout shift, LCP, interaction delay, measurement method (lab vs field, tools, test protocol), order of work, when to call the host or a developer, and how to prove a fix.

**What it does not cover, and where it lives.**

- Keyword research, titles, descriptions, sitemaps, rich snippets, alt text as SEO: 15-SEO-search. Source 01 carries a long SEO video; only its speed parts are merged here.
- Product page layout, promo copy, gallery order, add-to-cart placement: 09-CRO-testing and 07-LPG-landing-pages.
- Pixel, Web Pixels API and CAPI setup and event testing: 06-MEA-measurement. This playbook only says when a speed change must be checked against tracking.
- Theme selection, media library setup, domains, headless and Commerce Components: 05-SET-store-setup. Theme choice appears here only where it changes speed.
- Load balancers, infrastructure sizing, virtual waiting room setup: 05-SET-store-setup. This playbook only flags peak-event risk.
- Google Ads landing page policy: 12-GAD.

**Business measures it moves.** Conversion rate (sources cite 5.6% to 8.4% per second or per 0.1 s; direction, not forecast), bounce rate (about 12% per second, source 06), pages per session (8.9 at 2 s vs 3.3 at 8 s, source 06), revenue per session, wasted paid clicks (a visitor who leaves before load never sees the offer, source 08), cart abandonment on mobile checkout (source 03), organic visibility (Core Web Vitals as tie-breaker per sources 04 and 05, as ranking factor per source 08; see 7.8), and return intent (source 06). All figures are third-party or vendor benchmarks. Recompute with brand data (P6).

## 2. Inputs the agent needs

| Input | From where | Required or optional | Why |
|---|---|---|---|
| Platform, plan, theme name and version, who built it, last customization date | Brand record | Required | Sets the levers (R12), tells whether responsive widths and lazy loading are likely missing (R28, R34), whether a rebuild beats optimizing (R13) |
| Installed apps, plugins, app embeds, external scripts, and the revenue role of each | Brand record, user | Required | App triage (R44) cannot run without it; the agent must not guess revenue roles |
| Widgets that must show at first paint (for example review stars above the fold) | Brand record, user | Required | Exceptions to delaying scripts (R48) |
| Pixel, tag manager and consent setup | Brand record, 06-MEA | Required | Delaying scripts can break events; consent banners have legal limits (R48, R76) |
| Mobile share of sessions and revenue | Data layer | Required | Decides mobile-first weighting (R10) and separate mobile targets |
| Sessions and revenue by template (home, collection, product, cart, checkout) | Data layer | Required | Page priority (R3) |
| Pages ads land on, and paid vs organic share | Brand record, data layer | Required | Ad landing page gets fixed first (R3); score weighting (R5) |
| AOV, daily sessions, conversion rate, margin, monthly orders, cart abandonment | Data layer | Required for business case; optional for a fix | Revenue model (P6), hosting tier (R92) |
| Baseline PSI averages per template, mobile and desktop, with dates | Agent produces in P1 | Required before any change | Proof of fix (R102) |
| Visitor connection and device mix | Data layer (analytics device and network reports), or user | Optional | Picks the throttling profile (P2) and the test device (R10) |
| Scroll and click heatmaps | Data layer (Hotjar or similar) | Optional | Quick View usage (R61), buy button reach (neighbour 09-CRO) |
| Search Console Core Web Vitals report | Data layer | Optional | Field confirmation of CLS and LCP fixes (R102) |
| Dynamic checkout button usage | Brand record, data layer | Optional | R56 |
| Current CWV thresholds, Shopify image delivery, AVIF support, tool prices | Web | Required once per audit | Sources are dated; see sections 10 and 11 |
| Staging or duplicate theme access, code editor access, host support contact | User | Required | Safe work and rollback (R14) |
| Consent rules that apply to the store's markets | User, legal | Required before touching a cookie banner | R76 |

## 3. Decision rules

Numbering runs across all groups. Each rule gives the rule, its condition, the mini playbooks that support it (by number), conflicts (pointing to section 7) and card ids. "Sources: 01" alone means 1 practitioner's view, not a law.

### 3.0 Ecommerce priority order

1. Fix images on the ad landing page and top PDP first. Most sources call images the biggest weight, and R2 says find the one biggest cause first. R2, R3, R28, R31.
2. Fix LCP or CLS next on that same page, whichever the report shows as bigger. Either can dominate the score on the page a paid shopper lands on. R2, 7.4, P18 to P20.
3. Triage every app and script by revenue role. Third-party count is the strongest predictor of score in the cited 1,533-store dataset, and these scripts also power reviews, loyalty and upsells. R7, R44, R57.
4. Test and fix cart and checkout speed on its own. A delay here loses a shopper who already decided to buy. R25, R98, R99.
5. Retest mobile-first on the connection shoppers actually use. Weight this highest for India and other lower-bandwidth markets, lower for a fast, mostly-desktop US audience. R10, R19.
6. Decide above-the-fold widgets (wallet buttons, review stars, chat) by measured usage, not guesswork. R47, R56.
7. Clean up fonts and non-critical CSS. Safe, moderate gains, low risk to the purchase flow. R62 to R64, R70 to R73.
8. Caching, CDN and hosting last, only after 1 to 7; infrastructure work before content work hides nothing. R4, R91, 7.4. Pull peak-event capacity work forward only in the weeks before a sale. R94, P31.
9. Build the revenue business case once per audit, not once per fix. R9, P6.
10. [general practice] Single hero SKU store: skip catalogue-wide work, put the effort into the PDP. Large catalogue: automate compression on the top revenue SKUs first. R39.
11. [general practice] High-AOV, luxury or considered-purchase stores can carry heavier hero imagery if LCP still passes; low-AOV, high-volume stores should hold to the strict end of R31.
12. [general practice] Subscription stores: add account and login speed, uncovered here. Marketplace-heavy sellers with little on-site traffic: treat this whole playbook as lower priority.

Load this block first; the groups below are the detail.

### Group A. Strategy, scope and order of work

**R1. Record a baseline before changing anything.** Condition: every audit, every template you will touch. Run PSI on mobile and desktop for home, a collection, a top product, cart and checkout; note the score, LCP, CLS, INP and TTFB; start a dated change log ("15 March: image compression enabled"). Without a baseline no fix can be proven. Sources: 08, 01, 05. Cards: [6012d71fccb6] [c33439a2c9b9] [d2e8efefa7f2].

**R2. Find the 1 biggest cause first; it is often most of the slowdown.** Condition: when the report shows many items. A 3 MB hero or a dozen unused apps usually explains more than the rest combined. On Shopify, source 01 ranks layout stability (CLS, LCP) and apps as the 2 root causes, CLS first. Use PSI's hover hint to see which metric would move the score most (R23). Sources: 04, 01, 05. Cards: [b4cb9fdf5db6] [7678b95c31ff] [693051f7daf7].

**R3. Prioritize pages by traffic and money, not by which page is easiest.** Condition: always. Product and category pages carry 72% of shopper page views (source 06). A 0.5 s gain on a page with 10,000 monthly visits beats a 2 s gain on a page with 100 (source 04). For paid traffic, fix the page ads land on first, usually the product page, which often has a poor LCP while the home page passes (source 01). Order: ad landing pages, top product pages, main collections, home, then cart and checkout. Sources: 04, 06, 01. Cards: [4b59118db903] [dd24469d1841] [1b9747314efd] [74187c8d7e19]. [needs brand data: sessions and revenue by template; ad landing pages]

**R4. Fix content before infrastructure: images, then scripts and apps, then hosting, CDN and caching; code work (minify, bundle, critical CSS) after those 3.** Condition: any platform. All 9 sources agree that images and third-party scripts come first. They disagree on where hosting and caching sit: source 04 puts hosting and CDN third and before code work; sources 02 and 08 put caching and server work last and call caching "a band-aid" if fundamentals are skipped; source 08 says a host contacted before content is fixed "will simply point to unoptimized content". Merged rule keeps the strictest condition: do not call the host or turn on caching layers until images and scripts are done and re-measured. See 7.4 for the Shopify-specific order (LCP and CLS vs apps first). Sources: 04, 02, 08, 01, 09. Cards: [c35b62b83860] [1b50d0611dc3] [0709d6cdeb98] [cce38d9369f2] [3d5cfd45530c].

**R5. How much the Google score matters depends on the traffic mix; the shopper experience case applies regardless.** Condition: deciding how far to push. If the store depends on organic traffic, the PSI score and Core Web Vitals matter and flagged items should be fixed. If nearly all traffic is paid, a low score matters less for ranking, but slow pages still lose ad clicks. Visits without sales make speed a candidate cause to test, not a proven one. Sources: 01, 04, 08. Conflict on ranking weight: see 7.8. Cards: [37d2f02ad647] [04439b080448] [f8bdb58727f9]. [needs brand data: paid vs organic share]

**R6. Do not chase 100, and do not game the score.** Condition: always. A perfect score on a marketing site is not a fair target for an image-heavy catalog; major sites average about 90 (source 07). Speed apps, caching scripts and "specialists" that raise the lab score while real shoppers still wait are not fixes (source 01). A plugin used only to inflate PSI is out of scope (source 02). Sources: 05, 02, 01, 07. Cards: [693051f7daf7] [1b50d0611dc3] [5f44ccb5ead1] [b906791efd1b].

**R7. Every app, plugin, embed and script must earn its place in revenue or shopper experience; remove the rest completely.** Condition: every installed item, including sales channel apps and scripts pasted by hand. Ask "how does this make money now?" and write the answer. No answer, or purely visual, or duplicate of a theme feature: remove. Deactivating is not removing (source 08). More than 20 apps is a warning sign (source 03). In a 1,533-store Shopify dataset the count of third-party services was the strongest predictor of score (r = -0.66): 0 to 5 services had a median mobile score of 74, 21 to 30 had 44 (source 04). Sources: 01, 03, 04, 08, 09, 06. Cards: [8dbbb42b9c2e] [474204ae609c] [efd7ec0cb6ce] [c09e2fd0f0d7] [753859e92e44] [dc6cd41ae52d] [a62896aba3d8]. [needs brand data: app list with revenue role of each]

**R8. Stores slow down over time; re-audit on a schedule and hold a performance budget.** Condition: ongoing. Source 01's illustration: a fresh store scores 60 to 80, drops to 40 with apps and to 20 or lower with customization. Test at least monthly, right after any app install, theme change or site-wide update, and before major sales (source 04). Write a budget: max page weight, minimum score, max third-party scripts. Any change that breaks it gets reviewed before approval. Most site changes add features that slow pages (source 06). Sources: 04, 01, 06. Cards: [9ffe9f981c57] [474204ae609c] [d56347d58c66] [689b4ce4442e].

**R9. Speed is revenue work; model it with the brand's own numbers and label the lift as an assumption.** Condition: when making the case or ranking work against other projects. Use the benchmarks in section 6 as direction only. Method: daily sessions x conversion rate x AOV today, then again with an assumed higher conversion rate, difference x 365. Never quote a source's example ($9,000 a day, $1.8 million a year) as a forecast. Sources: 03, 04, 06, 08, 09. Conflicts on the figures: 7.2, 7.3, 7.9. Cards: [b36e60f619f7] [41ce06260ce9] [77da7bd48ab8] [fa57997432c4] [f8bdb58727f9] [af5fd5b1745b]. [needs brand data: AOV, daily sessions, conversion rate, margin, current load time]

**R10. Mobile first, measured separately, on real mid-range devices where possible.** Condition: always; mandatory when mobile share is high or traffic comes from ads. Mobile pages load 87.8% longer than desktop on average and 59% of traffic is mobile (source 06); Google indexes mobile first (source 04); emulation on a developer machine hides problems (source 04). Still check the desktop tab: CLS can be 0 on mobile and large on desktop (source 01). Sources: 01, 04, 05, 06, 09, 08. Cards: [74187c8d7e19] [a4ded81551ca] [085b91000740] [2bb637e027c0] [b35da7f37105] [f00068c50316]. [needs brand data: mobile share of sessions and revenue]

**R11. Balance speed with the buying journey; never strip UI that helps shoppers buy just to win a score.** Condition: any removal decision. Reviews, chat, size charts and tracking have a revenue or operations role; check it before removing for speed. Tools guide, they do not decide. Sources: 03, 08 (card caveat), 01. Cards: [9bd3f7aed489] [b36e60f619f7] [3d795cd17d4b] [753859e92e44].

**R12. The platform sets the levers.** Condition: choosing where to spend effort. Shopify: hosting, CDN and basic caching are handled and largely locked; apps and images are the main levers; caching scripts add nothing. WooCommerce and other self-hosted PHP stores: shared hosting, database bloat and plugin conflicts dominate, and the server foundation (PHP version, Redis or Varnish, HTTP/3) is yours to fix. Shopware and similar platforms: check what the platform does natively (WebP, thumbnails, HTTP cache, selective invalidation) before adding tools. Sources: 04, 01, 08, 03. Cards: [b147e14a22ec] [b4cb9fdf5db6] [cdc61c33e699] [ee4655c50df6] [54e3673579e3].

**R13. A simpler theme beats a feature-rich one unless the features pay; theme architecture beats quick hacks.** Condition: new store, redesign, or an old custom theme on an established store. Premium themes ship libraries and effects you will not use. Optimizing an old theme can cost more than rebuilding on Dawn or Horizon; plan the rebuild with a redesign, not as a rush job. Sources: 01, 03. Cards: [637495534f7f] [02c570556e30] [a459458a1b47] [21280154cb29].

**R14. Work on a duplicate theme or staging, keep a backup, and make changes you can revert one by one.** Condition: every code, app or setting change. Shopify: duplicate the live theme and test on its preview link (preview runs a bit slower, so compare preview to preview). WordPress: staging, and 1 plugin setting at a time. Staging may not match production; confirm on live after. Sources: 01, 08, 05. Cards: [c33439a2c9b9] [58c5589c135f] [0709d6cdeb98] [8f0d567d9844].

### Group B. Measurement and testing method

**R15. Average 3 runs per page per device on the pages that carry money (ad landing page, top PDP, checkout) first, wait 1 to 2 minutes after a change before retesting, and compare averages, not single readings.** Condition: every before and after comparison. Same page scored 48, 51 and 54 in a row (source 01). Test servers can serve a cached older version right after a change. Large swings usually mean many apps loading. Sources: 01, 02, 04. Cards: [079f8ea11444] [c33439a2c9b9] [9b3008487ad5] [21b1708d102a] [a4ded81551ca].

**R16. Test every template type, not only the home page; "Core Web Vitals passed" on home is not a pass.** Condition: every audit. Minimum: home, a collection, a product page (the 3 pages Shopify's admin score used). Add cart and checkout (source 08's card and source 04). Each template loads different apps; a store passed vitals on home while scoring 18 on home, 38 on collection and lower on product (source 01). Fix all templates of a page type, not only the one Shopify links to. Sources: 01, 08, 04, 03. Cards: [5e79bed9130e] [9b3008487ad5] [6012d71fccb6] [a4ded81551ca].

**R17. Read lab and field data as 2 different things; fix against lab data now, since field data proves real shoppers, not a lab phone, saw the gain, in about 28 days.** Condition: reading any PSI report. Field = Chrome UX Report, real Chrome users, 28-day window. Lab = Lighthouse on a simulated mid-tier phone and mobile network. URL toggle = this page; Origin = all pages averaged; a greyed URL toggle means too little traffic, so read Origin as a site-wide signal only. Field CLS in one case went 0.73, 0.66, 0.13, 0.1, 0 over about 28 days after the fix. Sources: 05, 04, 01. Cards: [085b91000740] [7d6d1e80db3c] [95c02555626f] [0d2d3621b19d] [80a761efcb18].

**R18. Report LCP, INP and CLS in every client deliverable, since these are the numbers that move both ranking and the funnel; FCP, TTFB, TBT and Speed Index are diagnostics, not vitals; drop FID and TTI.** Condition: any report, target or client deliverable. 5 of 9 sources still name FID or TTI; source 08 lists TTFB as a vital; source 03 describes vitals as "fully loaded, time to first byte, first meaningful paint". None of that is current. Use the thresholds in section 6 and verify them live. Sources: 05, 04, 08 (card correction), 06 (card), 07 (card), 09 (card). Cards: [dfde1d811af8] [2969a152a99d] [a10a7445f2a3] [4c4de77e3eae] [717cf5ec82fd] [0e11008fda40]. [web check: web.dev/articles/vitals for the current list and thresholds]

**R19. Run a slow-connection visual test alongside the scores, on the page a paid ad sends shoppers to, at the connection speed common in the store's real markets; this is where a hidden hero or a jump costs a sale.** Condition: every audit and every LCP or CLS investigation. DevTools Network, Disable cache, throttle to Slow 4G or 3G (pick the slowest common visitor connection), reload, and watch: time to first content, jumps, images revealing in chunks, the main image hidden behind a script. Source 02 ranks this above tool scores; source 05 says optimize against lab data; source 01 uses 3G and a 20 kbps custom profile to catch shifts. Merged: use both, and treat a page that looks bad on slow 4G as failing even with a good score. See 7.5. Sources: 02, 01, 05. Cards: [29d73beaf348] [d16d1fcdd349] [a5d2c3aee970] [74187c8d7e19] [085b91000740]. [needs brand data: visitor connection mix]

**R20. Make sure the test saw your latest version.** Condition: after every change. Put a small visible marker above the fold, rerun PSI, check the screenshot; marker missing means the test used a cached page, so clear cache and rerun; remove the marker after. Sources: 05, 01. Cards: [f1a837edbfbe] [079f8ea11444].

**R21. Cross-check with a second tool, and never compare scores across tools.** Condition: when Google's list runs out, or when 1 tool's result looks odd. GTmetrix, WebPageTest or Pingdom (tool feature notes moved to Appendix A). Each tool picks its own "loaded" marker. Fix findings that 2 tools share first. Sources: 09, 03, 04, 01, 02. Cards: [b35da7f37105] [9bd3f7aed489] [a4ded81551ca] [9b3008487ad5] [701c087d0917]. [verify UI: tool plans and features]

**R22. Audit every page of a large catalog, not a sample; outlier slow pages hide.** Condition: hundreds of URLs or more. Run `npx unlighthouse --site <url>` against staging or with throttling (it can load a production server hard), find outliers, then confirm key pages with field data. Sources: 07. Cards: [08cf33a0563a]. [verify UI: Unlighthouse flags]

**R23. Pick the highest-impact fix from the report, not the first item in the list.** Condition: reading PSI lab results. Hover the score circle to see which metric would most improve the score; open that metric's opportunity group first; read estimated savings against effort; retest after each change. Sources: 05, 09. Cards: [693051f7daf7] [b35da7f37105].

**R24. Fix the Lighthouse list first, then PSI's list.** Condition: Shopify stores per source 01's practice. Lighthouse in DevTools shows fewer issues than PSI; clearing them first makes PSI's remaining list actionable. Expect new items to surface as old ones clear. Sources: 01. Cards: [ba43a0aaa747] [9b3008487ad5].

**R25. Test the checkout flow separately; site scores miss it.** Condition: every audit. Cart calculations should feel instant; slow payment, address and fraud scripts show only here. Sources: 04, 03. Cards: [a4ded81551ca] [0bc2087de2a1].

**R26. Change 1 setting or script at a time and re-test cart, add-to-cart and tracking before the next change (browse the live site in incognito); a broken checkout or a dropped pixel costs more than the speed gain.** Condition: any JS minify, combine, defer or delay setting; any script removal. If something breaks you must know which change did it. Sources: 05, 01. Cards: [8f0d567d9844] [1dffb0dd47d1] [58c5589c135f].

**R27. Field data lags. Do not judge a fix by Search Console or the PSI history graph for at least 28 days.** Condition: after any fix. Search Console lagged "a couple of days" in one case and about 28 days in another (source 01); CrUX is a 28-day window (sources 04, 05). Shopify's admin score refreshed every 12 to 24 hours and needed traffic (source 01, older UI). Sources: 01, 04, 05. Cards: [ba43a0aaa747] [80a761efcb18] [95c02555626f] [9b3008487ad5]. [web check: whether Shopify admin still shows a composite speed score]

### Group C. Images

**R28. Check images first, and expect them to be the biggest weight.** Condition: always, and with priority when the theme is old, custom or agency-built, the catalog is large, mobile share is high, or the store is simple with few apps and still slow. Images are 50% to 75% of page weight (source 03), can be over 60% of data (source 08); a 4,000 x 3,000 camera photo can exceed 5 MB (source 04). Platform help (Shopify CDN, width variants, automatic WebP, light compression) is not enough: a 9.8 MB upload was delivered at 6.1 MB (source 01). Sources: 01, 03, 04, 08, 09. Cards: [21698bb77d52] [d84575512652] [1c99225810ac] [3d795cd17d4b] [74fc1378fc6a] [3d5cfd45530c].

**R29. Resize before upload. Long edge about 2,000 px for product and section images; 3,000 px is the ceiling and only for a full-bleed hero.** Condition: every upload. 2,000 px is enough for zoom and retina (source 01). A 1,920 x 1,920 JPEG at 46 KB looked fine as a zoomable product image. Never upload DSLR or design-tool originals (sources 01, 04). Sources: 01, 04. Cards: [cfa3fe76f953] [08bb3d69ec5b] [74fc1378fc6a].

**R30. Serve each image near its display size.** Condition: every rendered image. Three sources give 3 rules: box width plus 100 to 300 px (source 01, section images); 2x rendered size for retina (source 02, content images; cover backgrounds keep size and only change format); "resize to display dimensions" (source 04). Merged: export at 2x the rendered width, capped at 2,000 px, never below the box width (exact box size can look blurry), and never the master file. Flag any image whose intrinsic width is more than about 2x the box (example: 5,000 px in a 700 px box, 6 MB). See 7.13. Sources: 01, 02, 04, 09. Cards: [7558889b0856] [c9fcbc1b5513] [036e673a5a05] [b783c30c2217] [8883db1cfb1d] [3d5cfd45530c].

**R31. File size ceilings: target under 100 KB per product image and under 200 KB per hero; the LCP image under 250 KB; never above 500 KB for any image.** Condition: every image; the sources disagree and this merged rule keeps the strictest as target and the most common as the hard stop. Source 04: product under 100 KB, hero under 200 KB. Source 05: LCP image under 250 KB. Source 01, across videos: 500 KB max; 500 to 600 KB, prefer 100 to 200 KB; under 1 MB for section images; "full HD JPEG under 1 MB" for mobile-majority stores. Anything over 500 KB in Content > Files gets reduced. See 7.1. Sources: 04, 05, 01. Cards: [8883db1cfb1d] [eb9525bda54a] [21698bb77d52] [cfa3fe76f953] [0c4e0163aff8] [3a99be49f292] [cce38d9369f2].

**R32. Format by role: JPEG for photos, PNG only for transparency, never GIF (use MP4), and let the platform or CDN serve WebP or AVIF with fallbacks.** Condition: every image. WebP is 25% to 35% smaller than JPEG at equal quality (source 04); WebP or AVIF 30% to 50% smaller (source 08); AVIF compresses better still and source 02 prefers it at 50% quality, while source 04 calls its support narrower and makes WebP the default. Source 01 says do not hand-upload WebP to Shopify because Shopify converts automatically and non-supporting browsers could show nothing. A photo re-exported as PNG went from 2.7 MB to 8 MB (source 01). See 7.6. Sources: 01, 02, 04, 07, 08. Cards: [02dbd594ff18] [3dd6497a4d63] [cf9d029b70aa] [5148a60eef22] [f50e2bf2a5c4] [8883db1cfb1d] [baaf2f6aee4e] [cc2d433b9ede]. [web check: current AVIF support; whether Shopify still auto-serves WebP and AVIF and whether uploaded WebP is still a problem]

**R33. Compress once, from the original, with a visual preview, at JPEG quality about 70 to 80 (AVIF about 50): stop just before a shopper would notice quality loss on the item they are about to buy, not at the smallest file the tool allows.** Condition: every upload and every heavy image found later. Source 04: JPEG 80% "typically" balances size and look; repeat compression degrades quality. Source 01: Squoosh from default 75 down until artifacts show (40 gave 172 KB from 2.7 MB; 20 to 30 still acceptable to his eye); Photopea export at about 70%; a second pass on a compressed file saved only 8%. Source 02: AVIF at 50% was imperceptible in the presenter's tests. Keep originals. Sources: 04, 01, 02. Cards: [8883db1cfb1d] [cfa3fe76f953] [621e302f651f] [f50e2bf2a5c4].

**R34. The theme must serve responsive widths (srcset or width variants); a single `src` with the master URL fails.** Condition: every image-rendering section, especially in old, custom or agency themes, where sections added later often skip the pattern. Good pattern: several widths (example 1,600 default, 800 under 800 px, 1,200 under 1,200 px). Category grids use thumbnails, never full-size photos. Sources: 01, 04, 08, 09, 07. Cards: [c5fb935a9b7d] [d84575512652] [8883db1cfb1d] [baaf2f6aee4e] [3d5cfd45530c] [3932af95de46].

**R35. Lazy-load every image below the fold; never lazy-load anything in view.** Condition: hero, first slide, logo, main product image, first card of a grid and anything visible without scrolling stay eager. Lazy loading them "actually hurts LCP" (source 04) and source 01 says Google penalizes it. Slides 2 and on, footer logos, reviews, related products and social feeds are lazy. Browsers otherwise download every image at once (source 03). Sources: 01, 02, 03, 04. Cards: [51db910ccfc8] [0f413fcac223] [7a213481a9d2] [b093ed3b4d75] [eeb9c51fe0da] [4e8335051514] [8883db1cfb1d].

**R36. Set `loading="eager"` explicitly on in-view images, and remember the attribute only works on `<img>`, not CSS backgrounds.** Condition: any image a plugin or theme might lazy-load by default (a demo logo was lazy by default, source 02; a Dawn hero section lazy-loaded its first image, source 01). Background images that must cover a section: convert format, do not resize, do not lazy-load. Sources: 02, 01. Cards: [eeb9c51fe0da] [08e530e7d0b2] [51db910ccfc8].

**R37. Preload and set `fetchpriority="high"` on the LCP image only; set low priority on images far down; never preload many assets.** Condition: hero, first slide, main product image (with Liquid logic per product on PDPs), critical fonts. Too many preloads recreate the contention they were meant to fix. Check syntax against current browser support. Sources: 01, 07. Cards: [d56347d58c66] [b4735bb55b51] [958af3150188] [481d00497deb]. [web check: fetchpriority and preload support]

**R38. Every image and video in normal flow gets `width` and `height` attributes (numbers, no unit) or a CSS `aspect-ratio`, especially on PDP, grid and cart-thumbnail images: these are the images that jump and shift a tap toward or away from Add to Cart.** Condition: all templates. This works only if CSS keeps the aspect ratio. For responsive images whose ratio changes by viewport, use `srcset`. Absolutely positioned images likely do not shift layout but get dimensions anyway. WordPress quick fix: WP Rocket "Add missing width and height attributes". Sources: 01, 02, 05, 07. Cards: [d16d1fcdd349] [f597983f8e66] [883371c7111c] [3932af95de46].

**R39. Large catalogs: automate compression, but measure before and after because the app adds its own scripts, and keep the manual pipeline for hero and launch images.** Condition: hundreds of images or more, or images already uploaded. Bulk apps often touch only product images, so still check Content > Files for section and home page images. CDN image services (Cloudflare, Imgix, Cloudinary) are the alternative at thousands of SKUs. Sources: 01, 04, 08. Cards: [3bbbee3c2099] [64042fc21a8b] [8883db1cfb1d] [baaf2f6aee4e] [3a99be49f292]. [web check: Tiny SEO, SEOAnt, TinyIMG, Hyperspeed still listed]

**R40. One media file per image, reused everywhere; use Replace to update; no empty `src`; combine small icons into a sprite.** Condition: Shopify media library and any theme. Uploading the same file twice makes a second URL and multiplies edits. `<img src=''>` still sends a request. Alt text goes in during the same pass (accessibility and image SEO, not speed; decorative images get empty alt; re-add alt after pasting builder settings). Sources: 01, 03, 02. Cards: [23917da7d97a] [1c99225810ac] [876fb6014fe1] [fe083ee96b08].

**R41. Sliders: 1 strong hero with a clear call to action beats a slider; if a slider is required, 2 to 3 static slides, slide 1 eager and the rest lazy.** Condition: home and collection banners. 4 to 5 auto-rotating slides are heavy (source 03). Sources: 03, 01. Cards: [a459458a1b47] [70af8654d12d] [7a213481a9d2].

**R42. Check non-product images in Content > Files (or the media library) for multi-MB files.** Condition: every Shopify audit. Bulk compressors often skip them. Reduce anything over the ceiling in R31 by download, compress, resize (Shopify's editor resizes but does not compress), compress again, re-upload. Sources: 01. Cards: [3a99be49f292] [0c4e0163aff8] [7558889b0856]. [verify UI: Content > Files]

### Group D. Scripts, apps and third parties

**R43. Inventory every way a script reaches the page before touching any.** Condition: Shopify. Three routes: the async load function inside `{{ content_for_header }}` (lists every app script Shopify injects; scripts via the Script Tag API load async), hardcoded `<script>` tags pasted into theme.liquid (often blocking), and App embeds toggled on in Customize (added straight to the head, so they load early). WordPress: the GTmetrix waterfall and PSI "Render-blocking requests" list everything. Sources: 01, 03, 02. Cards: [2a89f4e58923] [b7d4c6046a25] [b1f2c1da412b] [b711b4ded0ce] [efd7ec0cb6ce] [701c087d0917].

**R44. Uninstalling does not clean the theme; search for and remove residual code after every uninstall.** Condition: after any uninstall, trial, or removed tracking, on Shopify and WordPress alike. Leftover script tags, JS, CSS and rendered snippets keep calling external servers on every page view. Search the brand name and the App Store listing name (they differ: "Hexom" vs "free shipping bar"). Only remove code for apps you have actually uninstalled. Sources: 01, 03. Cards: [3c6bd0cce957] [68699dfd59de] [fde546149035] [10d064e032f8] [58c5589c135f] [efd7ec0cb6ce].

**R45. Before installing anything: check reviews for speed complaints, check the theme already lacks the feature, and run a speed test before and after.** Condition: every new app or plugin, for the life of the store. Sources: 01, 04, 03. Cards: [8dbbb42b9c2e] [c09e2fd0f0d7] [74fc1378fc6a] [efd7ec0cb6ce].

**R46. Add `defer` first; if the feature breaks try `async`; if both break, leave the script blocking. Never touch a script whose purpose you do not know. Test the exact buying step each script powers (reviews, upsells, chat) before and after, not just whether the page loads.** Condition: every `<script>` without defer or async in theme.liquid or the WordPress head. Source 01 prefers defer ("more powerful": runs after the document loads; async downloads alongside without blocking); source 03 offers both without a rule; its card adds defer for scripts that need order, async for independent ones. Expect small gains per script (78 to 80 after one defer). Unknown speed or caching service scripts: test by commenting out; if speed is unchanged, leave them. Sources: 01, 03, 04, 05. Cards: [1dffb0dd47d1] [1d1dca3e3cfb] [07b358e531fb] [e42f2f04f259] [c09e2fd0f0d7] [8f0d567d9844] [cdc61c33e699]. See 7.11.

**R47. Delay scripts for widgets that are not in view and not part of the buying flow until the first user interaction.** Condition: loyalty, chat, cookie banner, social feed, SMS pop-up, review widgets below the fold, upsell drawers. Exceptions: widgets that must show at load (for example review stars above the fold; the brand record must say which), payments and fraud scripts (source 09's card), and tracking pixels (source 01 says never delay them; the cards say follow tested behaviour per integration; see 7.7 and R48). Source 01 claims 10 to 20% score gains when apps are the bottleneck, and says the delay helps little while CLS or LCP is large. Sources: 01, 04, 09, 05. Cards: [4e05290f17d5] [9714159dd4aa] [d1007a68a9e0] [56315833a352] [dc6cd41ae52d] [c09e2fd0f0d7] [8f0d567d9844]. [needs brand data: which widgets must show at first paint]

**R48. Tracking: never change how pixels load without testing page view, variant, add to cart and a test purchase for missing and duplicate events, with consent on and off.** Condition: any defer, delay, tag manager change or content_for_header override. Source 01's rule is to keep Facebook and Google pixels and Hotjar in the initial load; the card correction says use Shopify's supported pixel integration (Web Pixels API and standard events) and verify each integration. Duplicate injections are common (Facebook loaded twice: once by hand in theme.liquid, once by an app). Pixel setup itself is 06-MEA. Sources: 01, 03, 09. Cards: [15d23b16ff3c] [ef51a42e0e16] [20821a7ae674] [adc3ea59042a] [81ac749043da] [78f603581ed4] [dc6cd41ae52d]. [needs brand data: pixel and consent setup] [web check: current Shopify Web Pixels guidance]

**R49. Load an app's assets only on the templates that use its widget, and remove duplicate injections.** Condition: any script or stylesheet flagged as unused on a template where its widget is not visible (reviews and subscriptions only on collection and product pages; rewards only on the rewards page; a carousel library only where a carousel is in view at load). WordPress: unload per page with Asset CleanUp and write down what you unloaded, so a later mini cart gets its files back. Sources: 01, 02, 04, 08. Cards: [adc3ea59042a] [81ac749043da] [44c02380f01e] [c067983b290a] [3d795cd17d4b].

**R50. Remove jQuery and other libraries unless the cart drawer or checkout needs them; if you must keep one, self-host it from the theme assets instead of an outside CDN, so a CDN outage cannot take down Add to Cart.** Condition: any theme loading a library from a third-party CDN. WordPress: dequeue jQuery only for logged-out front-end visitors (the admin bar needs it) and only if theme and plugins do not need it. Sources: 01, 02. Cards: [fdbc70a82f75] [0d00d9d01688] [81ac749043da].

**R51. Turn off every app embed you do not actively use, and re-check embeds after uninstalls.** Condition: Shopify, Customize > App embeds. An uninstalled app's embed should disappear; if it is still listed and unused, turn it off. Sources: 01. Cards: [d675d594782b] [4e05290f17d5]. [verify UI]

**R52. Never comment out `{{ content_for_header }}` on a live theme.** Condition: always. It is a diagnostic only (score went 80 to 100 on a demo) and breaks apps and platform features; the editor flags it as an error. The supported way to delay app scripts wraps or filters it (P10). Sources: 01. Cards: [b7d4c6046a25].

**R53. Non-essential integrations load after product images and product information; integrations that touch payment or fraud may need to load earlier.** Condition: any third-party on a product page. Check that analytics still fire after deferring (R48). Sources: 09, 01, 03. Cards: [dc6cd41ae52d] [ad877c2f348c] [4e8335051514].

**R54. A tag manager is for inventory and a kill switch, not for speed by itself; measure the waterfall.** Condition: stores with many tracking tags. The claim that a container "condenses all tags into one request" is wrong (card correction). Use it to remove a failing tag fast. Sources: 03. Cards: [78f603581ed4]. [verify UI: Shopify tag manager setup]

**R55. Be skeptical of speed apps and caching scripts; test them like any other change.** Condition: Shopify especially. Source 01: no magic app; speed apps "only work for returning users, if at all"; Shopify already caches, so caching scripts add nothing. Source 04 names Hyperspeed and TinyIMG for minification and source 05 uses WP Rocket on WordPress. Merged: on Shopify default to no speed app; on WordPress a cache and optimization plugin is normal but every setting is tested 1 at a time (R26). See 7.12. Sources: 01, 04, 05. Cards: [5f44ccb5ead1] [cdc61c33e699] [23a3f294b81c] [c067983b290a] [8f0d567d9844]. [web check: whether speed apps only help returning users]

**R56. Dynamic checkout (wallet) buttons: disable if shoppers do not use them; otherwise delay their script to interaction and accept that the buttons appear late.** Condition: Shopify product pages. Source 01 calls the script demanding. The trade-off is not measured. Sources: 01. Cards: [98a7bf9f5fb4]. [needs brand data: dynamic checkout button usage]

**R57. Count third-party services per page as a leading metric and hold it in the budget.** Condition: every audit and every app request. Each third-party script adds 34.1 ms on average (source 06); in many stores scripts are over 50% of load time (source 08); the count correlates with score at r = -0.66 (source 04). Beauty stores average 31 services per page, automotive 15 (source 04). Sources: 04, 06, 08. Cards: [c09e2fd0f0d7] [a62896aba3d8] [3d795cd17d4b].

**R58. Moving third-party scripts to a web worker (Partytown) is a developer task and needs per-tool testing.** Condition: rebuild or framework storefront; not every script is compatible. Sources: 07. Cards: [717cf5ec82fd].

**R59. When first-party JavaScript only runs after the load event, check the CDN's script rewriting before the code.** Condition: any store behind Cloudflare or a similar CDN, where the app's data calls or hydration start after `load` even though the chunks arrived earlier. Cloudflare Rocket Loader rewrites every `<script>` to `type="text/javascript"` with a `data-cfasync` marker and runs them itself after load; Email Address Obfuscation and Auto Minify rewrite HTML and can break React hydration. Evidence to look for: `rocket-loader.min.js` in the waterfall, chunk requests initiated by it, rewritten script types in view-source. Fix: Cloudflare > Speed > Optimization > Content Optimization, Rocket Loader off; Scrape Shield, Email Obfuscation off; purge cache; re-test. Cost: 15 minutes, no code. Found on the 24 Sep 2026 Gehna audit; the general-prompt arm caught it first and the playbook arm treated it as a late test, so check it in the first pass. [test: speed-test-2026-09-24] [verify UI]

**R60. On a custom or framework storefront (Next.js, Nuxt, custom React), apply the platform-neutral rules through the framework's own primitives, and say so in the report.** Condition: the platform is not Shopify or WordPress. Equivalents: fonts via `next/font/google` with `subsets: ['latin']` or a `pyftsubset` WOFF2 subset that keeps the rupee sign U+20B9 (never ship a full CJK TTF; the Gehna site shipped 1.9 MB of Korean serif on every page); `priority` on the one LCP image only and `sizes` on every small image so the optimiser does not serve 640 px icons; server-render the buy box (main image, name, price, add to cart) and the first collection tiles with `getStaticProps` and `revalidate` or `getServerSideProps`, keep only personal state client-side; fixed-height containers or skeletons for late content; `images.minimumCacheTTL` of 30 days and CDN cache keys that include `Accept` so AVIF is not pinned as PNG at the edge (Cloudflare needs a Vary for Images rule or a cache bypass for `/_next/image`; CloudFront honours `Vary: Accept`). A developer executes these; the agent writes the brief with the file, prop and config names. [test: speed-test-2026-09-24]

**R61. Every fix in the plan carries a pass threshold, a rollback and its dependencies; a fix list without them is a diagnosis, not a plan.** Condition: every execution plan this agent writes. The 24 Sep 2026 blind test found that this structure, not the diagnosis, was the difference between the playbook output and a general audit: both found the same problems, only the playbook plan could be run on Monday. Format per fix: problem and evidence, gain and the arithmetic, effort, owner, steps, what to measure before and after and the number that counts as done (P30), risk and rollback, depends on. [test: speed-test-2026-09-24]

**R105. Test the ad landing page and top PDP inside in-app browsers (Instagram, TikTok, Facebook), not only mobile Safari or Chrome.** Condition: any store running paid social ads; most paid social clicks open inside the platform's own in-app browser, which can render differently from the shopper's normal browser. [general practice] No library source; verify against brand data before use.

**R106. On stores selling in more than 1 country or currency, check that currency conversion and geolocation redirects do not block or delay first paint.** Condition: international or multi-currency stores. [general practice] No library source; verify against brand data before use.

### Group E. Theme code, CSS and JavaScript

**R59. Reference theme CSS and JS through `asset_url` so the Shopify CDN serves the current version; fix URLs typed directly inside CSS.** Condition: Shopify themes with edits that do not show, or static URLs in CSS. `asset_url` adds a version (`?v=...`) that tells the CDN to pull the new file. Hovering an asset link in the code editor should say assets should be served from the Shopify CDN. Sources: 03, 01. Cards: [5748b07d6cda] [fdbc70a82f75]. [verify UI: Shopify URL filters]

**R60. Remove Liquid loops that crawl a whole collection to find a condition, and loops run more than once for the same data.** Condition: themes worked on by several developers; large collections. Loops are fine for outputting images or variants and on small collections; repetition is the problem. Use `product.options_with_values` where it fits. No gain figure is given. Sources: 03. Cards: [11d911ca0868].

**R61. Remove Quick View on collection pages; if it must stay, fetch product data on click.** Condition: any grid that pre-loads data for 20 to 30 tiles. Check click maps first to see if shoppers use it. Find the source: customizer toggle, then apps, then theme code (developer). Removing beats AJAX on click, which beats data attributes. Sources: 03. Cards: [6f05e9392e74]. [needs brand data: Quick View click usage]

**R62. Minify CSS and JS, split code by page type, inline critical CSS and load the rest async, but only after images, scripts and hosting are done.** Condition: all platforms; developer task on custom themes. Product pages do not need checkout code; category pages do not need zoom. JS can shrink up to 80% with minification (a maximum, not typical). Assets you cannot minify or compress (served from an app's own host): ask the app's support or drop the app. Sources: 04, 01, 05. Cards: [c067983b290a] [c35b62b83860] [81ac749043da] [8f0d567d9844].

**R63. Delay non-critical CSS with `media="print" onload="this.media='all'"` for stylesheets like the cart drawer, size-chart modal and filter panel that style nothing in view; never delay CSS a shopper sees before scrolling.** Condition: modal, drawer and below-fold section styles. Applying it to in-view styles causes unstyled content, CLS and a worse LCP. Confirm the swap happened in the Network panel; a failed onload leaves the sheet print-only. Sources: 01. Cards: [08d397da7d0d] [b73d08e8603c] [e9b7f4c3107e]. [web check: behaviour of the media=print trick in current browsers]

**R64. If the theme lazy-loads its main CSS, the inlined critical CSS must be complete for each visually different template.** Condition: elements show unstyled for about 1 second then jump. Generate critical CSS per template (collection with banner vs without), serve it inline from theme.liquid via a snippet, then add reserve rules for anything still moving. Sources: 01, 04. Cards: [cabcd2d4c66e] [c067983b290a].

**R65. Remove default WordPress bloat and unload page-specific assets; on WooCommerce, unload cart, checkout and block styles from every page with no cart or checkout on it, since these are the files most often left loading everywhere.** Condition: WordPress and WooCommerce, logged-out visitors. Toggle off Gutenberg block CSS (only if unused), emojis, dashicons for logged-out users, pingbacks. Unload WooCommerce cart files, block styles and similar on pages that have no cart (13 files in 1 group on the demo). Keep global assets. Sources: 02. Cards: [83d6ff4a133c] [44c02380f01e] [701c087d0917]. [verify UI: builder and plugin settings]

**R66. Render-blocking JavaScript before the main image is the pattern to avoid "at all cost"; server-side or hybrid rendering beats a client-rendered single-page app, but that is a rebuild.** Condition: headless or framework storefronts, or when a carousel plugin hides an already-downloaded image until its JS runs. Size server capacity before moving rendering to the server. Sources: 07, 09, 01. Cards: [cc2d433b9ede] [171da560af89] [1b9747314efd].

**R67. Remove entrance effects, fade-ins, slide-ins, preloader bars and placeholders on in-view elements.** Condition: hero, first slide, main product image, header. Effects need a library to download first and delay display. Sources: 01, 07. Cards: [d56347d58c66] [7a213481a9d2] [3932af95de46].

**R68. Pop-ups do not fire on page load; use exit intent or a time delay.** Condition: any pop-up app. Sources: 03. Cards: [a459458a1b47].

**R69. APIs behind a storefront return only the fields a tile or page needs; caching should not be used to hide slow or unstructured APIs.** Condition: headless or custom front ends; a developer task coordinated between API and front end. Sources: 09. Cards: [34052dbf559b] [9973ef4b38a5].

### Group F. Fonts

**R70. Every `@font-face` rule carries `font-display: swap`, on every weight and italic, especially price, CTA and headline weights, so a slow connection never hides the price or the Buy button text.** Condition: any custom font. Without it the text can wait for the font on slow connections (invisible text). Sources: 01, 04. Cards: [027af5f63b68] [3ef856fab3ae] [3263b4728b85] [ea1d2a527d10] [74fc1378fc6a].

**R71. Keep about 3 font variations at most, load only the fonts a page needs, and subset them.** Condition: custom fonts. 5 or 10 weights because of 1 occurrence is not worth it (source 01). Fonts are assets too (source 07). Sources: 01, 07, 04. Cards: [1eacf61a57a2] [cc2d433b9ede] [74fc1378fc6a].

**R72. Self-host fonts as WOFF2 (WordPress) or use the platform's built-in theme fonts (Shopify) instead of calling Google Fonts.** Condition: fonts loading from a third-party server; no strong design reason for a custom font. Source 02 gives no number for the font step alone. Sources: 02, 04, 01. Cards: [731928d47c17] [74fc1378fc6a] [1eacf61a57a2].

**R73. Style the fallback font to match the custom font's size and line height so the swap does not move text.** Condition: any swapped font causing CLS. Sources: 01. Cards: [14bc6ce5b8a6] [cce38d9369f2].

### Group G. Layout shift (CLS)

**R74. A CLS Google reports is real: on a store it usually means a tap landed wrong because a review badge, price or Add to Cart button moved after render. CLS is unexpected movement without user input, during load and during scroll; a change after a click is not CLS.** Condition: reading any CLS figure. Check the desktop tab too. In source 01's experience most CLS is either a CSS issue or an app widget without reserved space, and apps are the main source. Sources: 01, 04, 05. Cards: [d16d1fcdd349] [24893ea78676] [f00068c50316] [2969a152a99d] [883371c7111c].

**R75. Reserve space for everything that arrives late: app widgets, ads, embeds, iframes, cookie and consent banners, announcement bars.** Condition: any element injected after first paint. Measure the rendered size and fix the container's width and height in CSS; verify on the breakpoints you care about, since a fixed size can clip responsive widgets. Replace an app announcement bar with the theme's own. Sources: 01, 05, 07, 04. Cards: [24893ea78676] [ba43a0aaa747] [883371c7111c] [3932af95de46] [2969a152a99d] [f00068c50316].

**R76. Delaying a consent banner removes its CLS and blocking, but check the consent rules for the store's markets first.** Condition: cookie banner causes CLS. Source 01 delays it to first interaction (example: CLS gone, score 48 to 57). The card caveat says this can have legal consequences. Merged: do not delay a consent banner without a documented go-ahead from whoever owns compliance. Sources: 01. Cards: [b1f2c1da412b] [867a3ac29ede]. [needs brand data: consent rules by market]

**R77. Remove contradicting CSS instead of stacking overrides; move late body styles into the head; wrap desktop-only rules in a media query.** Condition: 2 stylesheets set different sizes for 1 element; a style in the body tag (example: page width 70%) rewrites base CSS after first render. One client fix used `min-width: 767px` so mobile stays full width. Prefer the theme's own layout width setting. Confirm the intended design with the owner first. Sources: 01. Cards: [24893ea78676] [80a761efcb18] [dbf103b05b0a] [3b3894441e6c] [f21b8466aa36].

**R78. Fix CLS before the app delay snippet, because the snippet removes blocking time, not layout problems.** Condition: Shopify stores with both large CLS and many apps. Source 01 says the snippet is "not as effective" while CLS or LCP is large. Sources: 01. Cards: [4e05290f17d5] [37d2f02ad647]. See 7.4.

### Group H. Largest Contentful Paint (LCP)

**R79. Name the LCP element per template before fixing anything.** Condition: every template. Home and collection: hero or first product grid. Product: main product image. It can also be a headline (text is the fastest LCP, source 05's opinion) or a video (compress it). Tools: PSI Diagnostics > "Largest Contentful Paint element"; the Web Vitals extension console log (element plus subparts: TTFB, load delay, render delay); the Network waterfall (very wide bars). Sources: 04, 05, 07, 01. Cards: [2969a152a99d] [eb9525bda54a] [11d184a954ab] [457e4a26802c] [1b9747314efd].

**R80. LCP fix order: un-lazy it, de-animate it, compress it, preload it, then cut blocking scripts ahead of it.** Condition: the LCP element is an image. Remove `loading="lazy"` and lazysizes classes; set eager; remove fade or slide effects and preloaders; keep it out of a delayed carousel path; compress as far as looks allow (under 250 KB per source 05, under 200 KB per source 04); add a preload with high fetch priority; then check blocking time, which also delays LCP. Sources: 01, 07, 05, 04. Cards: [7a213481a9d2] [d56347d58c66] [b4735bb55b51] [958af3150188] [cc2d433b9ede] [eb9525bda54a] [8883db1cfb1d].

**R81. A poor LCP with a fast image download means a script is hiding the image; find the script, not the image.** Condition: throttled test shows the image file downloaded but not shown (a slideshow plugin in source 01's case). Fix by showing the main image as a plain image outside the carousel. Sources: 01, 07. Cards: [1b9747314efd] [cc2d433b9ede].

**R82. Slow server response can also cause a poor LCP; check TTFB before blaming the image.** Condition: TTFB over 800 ms in PSI. Source 08 says poor TTFB is hosting or an overloaded database; source 05 says poor FCP is usually the theme and plugins, not the server. Merged: read TTFB; if it is under 800 ms, work the front end; if over, do the front end anyway (R4) and then take TTFB to the host (P28). See 7.10. Sources: 08, 05, 04. Cards: [a10a7445f2a3] [dfde1d811af8] [2969a152a99d].

### Group I. Interaction delay (INP, TBT)

**R83. Long tasks over 50 ms block the main thread; TBT adds them up; a failing TBT means a lot of complex JavaScript. On a product page, a high TBT means Add to Cart or the variant picker will feel unresponsive after tap; confirm the fix with a tap test, not just the score.** Condition: lab report shows high TBT. Fastest fixes: minify, defer and delay JS (R46, R47, P13). Source 09's definition of TBT ("time between FCP and TTI") is outdated; use source 05's. Sources: 05, 09. Cards: [8f0d567d9844] [0e11008fda40].

**R84. INP maps to add to cart, variant pickers and category filters; the only fix is less JavaScript running on the main thread.** Condition: field INP over 200 ms, or the symptom "Add to Cart does nothing for half a second". Cut, defer or delay app and tracking scripts (source 04 says this helps INP but gives no data); lazy-load non-critical components; move third parties to a worker at rebuild time. INP may not include an async cart request finishing, so track cart completion separately (card editorial). Sources: 04, 07, 05. Cards: [2969a152a99d] [717cf5ec82fd] [dfde1d811af8].

**R107. Treat predictive or instant site-search latency (autocomplete lag) as an everyday INP issue on any store with on-site search, not only a peak-event brownout risk.** Condition: any store with on-site search or autocomplete. The folder's only mention of this is buried in a peak-event brownout warning. Sources: 06 (peak-event mention only). Cards: [88659194131b]. [general practice for the everyday, non-peak case] No further library source; verify against brand data before use.

### Group J. Caching and CDN

**R85. Verify caching and compression from response headers, not from a plugin's settings page.** Condition: WordPress and any self-hosted store. DevTools Network, Preserve log, reload, click the document request: a cache hit header (example `x-cache: hit`; the name depends on the host) and `content-encoding: gzip` (or the host's method). Do not read `cache-control` as proof (demo showed `no-cache, must-revalidate` with caching on). Re-verify in incognito with Disable cache unticked. Sources: 02. Cards: [55f9847e6f0a]. [verify UI]

**R86. Never cache cart, checkout or account pages, or any page with visitor-specific data.** Condition: every cache layer. Load each after a change and check the headers. Sources: 04, 08 (card). Cards: [9490c0550ad4] [0709d6cdeb98].

**R87. Static assets cache up to 1 year only when file names or versions change on update; HTML caches briefly; prices and stock get short TTLs with fast invalidation or a JavaScript update.** Condition: any store you control headers for. Selective ("intelligent") invalidation clears only the pages a price or stock change touched; a full purge on every change throws the gain away. Sources: 04, 08, 09. Cards: [9490c0550ad4] [ee4655c50df6] [9973ef4b38a5].

**R88. Defer session creation until first add to cart or login so anonymous browsing stays cacheable.** Condition: platforms that start a session on first hit (Salesforce guidance cited by source 04). Sources: 04. Cards: [9490c0550ad4].

**R89. Full-page caching serves pre-rendered HTML; ask for it by name (Redis, Varnish, integrated HTTP cache) on self-hosted stores, and test cart and checkout afterwards.** Condition: WooCommerce, Shopware and similar; not Shopify. Sources: 08, 04. Cards: [0709d6cdeb98] [ee4655c50df6] [9490c0550ad4].

**R90. CDN: start with static assets; pick by traffic geography; cache keys include content-changing parameters (page number) and exclude tracking parameters; purge automatically on image updates and deploys; target 80%+ hit rate.** Condition: self-hosted stores with customers in several regions or heavy image traffic. Shopify already serves through Fastly; hosts like Vercel and Firebase do it automatically. A low hit rate means misconfiguration or too much dynamic content. CDN latency cut 200 to 800 ms for distant visitors (Cloudflare, cited by source 04). Sources: 04, 07, 09, 03. Cards: [46127ea01ca7] [9490c0550ad4] [cc2d433b9ede] [6e2d4fa52ebe] [54e3673579e3]. [web check: CDN plans and prices]

**R91. Caching, compression and CDN come after the fundamentals; they hide problems on repeat visits and do nothing for a first-time shopper on a heavy page.** Condition: sequencing. A demo page reached GTmetrix 98%, LCP 1 s and CLS 0 with no gzip, no cache and no CDN (source 02). Sources: 02, 08, 09. Cards: [1b50d0611dc3] [0709d6cdeb98] [9973ef4b38a5]. See 7.4.

### Group K. Hosting, server and platform

**R92. Match the hosting tier to order volume, and leave shared hosting within the first year.** Condition: self-hosted stores. Shared ($1 to $15 a month in 2026) for a new store with little traffic; VPS or cloud (managed from about $20 to $50 a month) at 100+ orders a month; auto-scaling cloud or managed hosting at high volume; a CDN on top for international customers. The 100-order line is a heuristic. Compute ROI with cart abandonment and AOV. Sources: 04. Cards: [a063ce857916]. [web check: hosting prices] [needs brand data: monthly orders, AOV, cart abandonment]

**R93. Call the host or IT admin only after images and plugins are fixed and re-measured, and arrive with 4 questions.** Condition: self-hosted stores. Ask: which PHP version (want 8.2+)? Is server-side caching (Redis or Varnish) active? Is full-page caching serving pre-rendered HTML? Is HTTP/3 on? In SaaS and cloud setups many of these are already tuned; read the documentation anyway. Re-measure TTFB and LCP after. Sources: 08. Cards: [0709d6cdeb98] [d2e8efefa7f2]. [web check: current PHP and HTTP/3 recommendations]

**R94. Plan capacity for peak events; slowdowns in add to cart, search and login ("brownouts") are more common than crashes.** Condition: before BFCM-type sales, drops and limited-inventory launches. Check memory and bandwidth limits and projected peak load with the platform; load test the dynamic steps; decide what each step does under load; consider a virtual waiting room for limited inventory (source 06 sells them). Infrastructure work belongs to 05-SET. PetSmart's Black Friday pages took 7.7 to 13.84 s. Sources: 03, 06, 04. Cards: [54e3673579e3] [88659194131b] [9ffe9f981c57].

**R95. Clean the WooCommerce database on a schedule.** Condition: WordPress stores: old revisions, expired transients, orphaned metadata (WP-Optimize). Plugins that run heavy queries on every page load without caching get removed or cached. Sources: 04, 08. Cards: [74fc1378fc6a] [3d795cd17d4b].

### Group L. Video and embeds

**R96. Replace standard YouTube embeds with lite embeds; turn off autoplay on mobile; compress video files; set `preload="none"` on video tags; replace GIFs with MP4.** Condition: any video on a template. A standard embed costs almost 1 MB and a fixed-size iframe; a lite embed loads a 15 KB thumbnail and the player on click. Oversized video hurts as much as oversized images. Sources: 03, 09, 01. Cards: [badac5a4a278] [0021f744e1e0] [3dd6497a4d63] [0f413fcac223] [70af8654d12d] [5148a60eef22].

### Group M. Redirects and links

**R97. Permanent moves use 301, never 302; no redirect chains; remove broken links to images, CSS and JS; build a custom 404 that points to top categories.** Condition: every store. Shopify's Navigation redirects are 301 by default. Sources: 03. Cards: [2cd7ecfea589]. [verify UI: Shopify redirects]

### Group N. Cart, checkout and mobile buying

**R98. Checkout is in scope; on mobile, remove form steps where the platform allows (Shop Pay is Shopify's vendor-claimed 1.91x mobile checkout-to-order rate) and test the flow separately.** Condition: every audit, especially mobile-heavy stores. Delay at checkout loses impulse buyers. Sources: 03, 04. Cards: [0bc2087de2a1] [a4ded81551ca]. [verify UI: Shop Pay availability] Vendor claim; treat as an example.

**R99. Test cart drawer, add to cart and checkout after every cache, protocol, script or app change.** Condition: always. Sources: 08 (card), 01, 04. Cards: [0709d6cdeb98] [6427c0d96eec] [9490c0550ad4].

**R108. For subscription and repeat-purchase stores, test account, login and order-history page speed as part of every audit.** Condition: subscription or high-repeat-purchase stores; this playbook does not cover these pages anywhere else. [general practice] No library source; verify against brand data before use.

**R109. Test the post-purchase upsell and thank-you page for speed.** Condition: stores running post-purchase upsells; a slow upsell page loses an add-on sale the shopper already agreed to. [general practice] No library source; verify against brand data before use.

**R110. Test shipping-cost and delivery-date calculators on cart and checkout for speed.** Condition: stores showing a live shipping cost or delivery-date estimate; a slow calculator delays the last step before payment. [general practice] No library source; verify against brand data before use.

### Group O. When to call a developer or the host

**R100. Hand to a developer when the fix needs theme logic or code the operator cannot safely write.** Condition: any of: adding srcset or width variants to a custom section; first-item-eager logic in a loop; capturing and filtering `content_for_header`; conditional app loading per template; critical CSS generation and per-template inlining; Quick View removal in theme code; Liquid loop clean-up; lite embed markup; AJAX Quick View; SSR or hybrid rendering; API field selection; Partytown; cache header values beyond the defaults. Write the brief with the page, the element, the measured before state and the target. Sources: 01, 03, 07, 09, 04. Cards: [c5fb935a9b7d] [b093ed3b4d75] [56315833a352] [cabcd2d4c66e] [6f05e9392e74] [11d911ca0868] [171da560af89] [34052dbf559b] [717cf5ec82fd] [9490c0550ad4].

**R101. Hand to the host when TTFB stays over 800 ms after front-end work, when caching or compression headers are missing, or before a peak event.** Condition: self-hosted stores. Use the 4 questions in R93. Sources: 08, 02, 03. Cards: [0709d6cdeb98] [55f9847e6f0a] [54e3673579e3].

### Group P. Proving a fix

**R102. A fix is proven only by averaged before and after lab runs on the same page, same device tab and same tool, plus the field metric moving in the expected direction after 28 days.** Condition: every change the agent reports. Keep the dated change log; note which changes were made together (several at once means no single step gets the credit). Sources: 01, 05, 08, 02. Cards: [c33439a2c9b9] [dca8734ae894] [6012d71fccb6] [085b91000740] [21b1708d102a].

**R103. After any loading change, exercise every affected app's full function and every tracking event before calling it done.** Condition: defer, delay, unload, remove, cache. Reviews, upsells, loyalty, forms, chat, pixels, consent. Re-check after app updates, since script URLs change. Sources: 01. Cards: [6427c0d96eec] [b711b4ded0ce] [ef51a42e0e16].

**R104. Rollback is part of the change: keep the original theme or the pre-change setting, and revert the single change that broke something rather than the whole batch. Keep a tested rollback path ready before touching anything during a peak sale window.** Condition: always. Sources: 01, 05, 02. Cards: [58c5589c135f] [8f0d567d9844] [44c02380f01e].

## 4. Procedures (implementation)

Each procedure: goal, preconditions, steps, checks, rollback. Platform steps carry `[verify UI]`. Sources named in brackets by mini playbook number; card ids at the end of each procedure.

### P1. Baseline and testing protocol (run before and after every change)

Goal: numbers you can compare. Preconditions: list of templates and the ad landing pages (R3); a duplicate theme or staging (R14).

1. Pick the reference pages: home, 1 collection, the top-traffic product page, the ad landing page if different, cart, checkout. Record URLs. [01, 08, 04]
2. On Shopify, duplicate the live theme and test its preview link. Compare preview to preview, never preview to live. [01]
3. Open PageSpeed Insights (pagespeed.web.dev). Paste the URL. Analyze. Mobile tab first, then Desktop. [05] [verify UI]
4. Run each page 3 times per device with a pause between runs. Record score, LCP, CLS, INP (field), TBT, TTFB, FCP and the LCP element in a table (date, page, device, run). Average the 3. Example variance: 48, 51, 54. [01, 02]
5. Note the field section: URL or Origin, and whether the URL toggle is greyed (too little traffic). [05]
6. Take the PSI screenshot and note which metric the hover hint flags as the biggest lever. [05]
7. Run the slow-connection visual test (P2) on the product page and home. Note what you saw in words. [02, 01]
8. Start the dated change log. First entry: the baseline. [08]
9. After each batch of changes: wait 1 to 2 minutes, confirm freshness (P4), run 3 more tests, average, compare averages. Treat differences of a few points as noise. [01]
10. Optional cross-check: GTmetrix (waterfall, Top Issues) or WebPageTest (filmstrip) on the same URL. Do not compare scores across tools. [04, 09, 03]
11. Lighthouse in Chrome for the render-blocking list: right-click > Inspect > Lighthouse > Analyze page load. [01] [verify UI]
12. If PageSpeed Insights is unavailable (API quota, network block), run the lab test yourself in headless Chromium (Playwright) with the Lighthouse mobile profile: 1.6 Mbps down, 750 Kbps up, 150 ms RTT, 4x CPU slowdown, cold cache, phone viewport, 3 runs per page, report the median. Record TTFB, FCP, LCP and its element, CLS and its sources, long tasks, load event, requests and bytes by type. Say in the report that it is a lab run and not a Lighthouse score. [test: speed-test-2026-09-24]
13. Third-party bytes: never take them from the browser's Resource Timing API. It reports 0 bytes for most cross-origin files (no Timing-Allow-Origin header), so totals come out 4x too low; decoded sizes come out 2x too high. Get compressed sizes from the response headers in DevTools or the CDP log, or fetch each third-party script directly with `Accept-Encoding: br, gzip` and sum. On the 24 Sep 2026 Gehna audit the true figure was 470 KB where the two methods gave 110 KB and 1.05 MB. [test: speed-test-2026-09-24]

Checks: baseline table complete for every template on both devices; change log started; third-party bytes come from headers or direct fetch. Rollback: none needed.
Cards: [c33439a2c9b9] [079f8ea11444] [9b3008487ad5] [6012d71fccb6] [085b91000740] [693051f7daf7] [21b1708d102a] [a4ded81551ca].

### P2. See the store the way a slow-connection shopper does

Goal: catch what scores hide (blank wait, jumps, hidden hero). Preconditions: Chrome.

1. Chrome DevTools > Network. Tick Disable cache. Throttling: Slow 4G (source 02's default) or Fast 3G / Slow 3G (source 01). Pick the slowest connection common among your visitors. [02, 01] [verify UI] [needs brand data: connection mix]
2. Reload. Watch: time to first content; layout jumps; images revealing in chunks; the main image absent while other things appear.
3. If 3G is still too fast to see a shift, add a custom profile (source 01 used about 20 kbps). If throttling seems not to apply, switch profiles and back, then reload. [01] [verify UI]
4. Stop the load when the suspect element appears and inspect it mid-load. [01]
5. Optional: DevTools Performance tab recording for a timeline. [01] [verify UI]
6. Optional: open the store on a phone on mobile data away from Wi-Fi. [01] Real mid-range device preferred. [04]
7. Mobile layout check: DevTools device toolbar, pick a phone (iPhone 12 Pro in the demo); Safari Develop > Enter Responsive Design Mode. Pass if text stays on screen, images are not shrunk or distorted, everything is reachable. [01] [verify UI]
8. Repeat after each stage so gains can be attributed. For a final comparison, load an unoptimized copy and the optimized page in incognito with the same throttle; then untick Disable cache for the repeat-visit case (the cache-disabled run is the worst case, not the typical user). [02]

Checks: written notes per page. Rollback: none.
Cards: [29d73beaf348] [d16d1fcdd349] [a5d2c3aee970] [74187c8d7e19] [58bc1e28be27] [15b41de4c239] [a4ded81551ca].

### P3. Read a PageSpeed Insights report

Goal: correct reading of field vs lab and the right first fix. Preconditions: P1 run.

1. Top section = field data (CrUX, real Chrome users, 28 days). Expand to see which 3 are Core Web Vitals (LCP, INP, CLS); FCP and TTFB are notable metrics, not vitals. [05]
2. URL vs Origin toggle: URL = this page; Origin = site average. Greyed URL = not enough traffic; read Origin as site-wide only. No field data at all = work from lab. [05]
3. Bottom section = lab (Lighthouse, simulated mid-tier phone). Score bands: 90+ green, 50 to 89 orange, under 50 red. [05, 04]
4. If field fails and lab passes, that is real devices and networks, not an error. Optimize against lab; field follows in about 28 days. [05]
5. Hover the score circle to see which metric would move the score most. Open that metric's opportunity group first. Work top down. Retest after each change. [05]
6. Diagnostics > "Largest Contentful Paint element" names the LCP element. [05] [verify UI]
7. For CLS, open the filmstrip screenshots and compare frames for an element that appears and pushes content; PSI outlines the shifting element. Check the desktop tab too. [01]
8. Read the estimated savings per opportunity and order by saving against effort. [09]
9. "Reduce unused JavaScript" means unused at test time, not useless. The fix is remove leftovers, then defer, delay or load conditionally; not line-by-line edits of app code you do not own. [01]
10. Copy the report link and attach it to the change log or the developer brief. [05] [verify UI]

Cards: [085b91000740] [7d6d1e80db3c] [dfde1d811af8] [693051f7daf7] [eb9525bda54a] [f00068c50316] [b35da7f37105] [68699dfd59de] [f338ed52ce8f] [95c02555626f].

### P4. Confirm the test saw your latest version

1. Add a small visible marker above the fold (a line of text). [05]
2. Rerun PSI. Check the screenshot. Marker visible = fresh. Missing = cached; clear caches (theme, plugin, CDN) and rerun. [05]
3. Remove the marker. [05]
4. On Shopify, also wait 1 to 2 minutes after saving before the retest. [01]

Cards: [f1a837edbfbe] [079f8ea11444].

### P5. Site-wide audit for large catalogs

Goal: find outlier pages. Preconditions: staging URL, or owner's go-ahead to throttle against production; Node installed.

1. New directory. Run `npx unlighthouse --site <url>`. A UI opens with live results; hundreds of pages take a couple of minutes. [07] [verify UI: flags]
2. Sort by score. List the outliers and their templates.
3. Confirm key pages with PSI field data (P3); Unlighthouse is triage. [07]
4. Optional: the Unlighthouse SDK in CI to keep the check running. [07]

Cards: [08cf33a0563a] [b906791efd1b].

### P6. Business case (revenue model)

Goal: a number the owner trusts, built from the brand's data. Preconditions: [needs brand data: daily sessions, conversion rate, AOV, margin, current load time, mobile share].

1. Today: daily sessions x conversion rate x AOV = daily revenue. Source 06's example: 50,000 x 3.5% x $50 = $87,500. [06]
2. Choose an assumed lift for 1 s faster and label it as an assumption. The sources' range: +5.6% conversion per second (06); about 7% loss per 1 s delay (04, 08); +8.4% per 0.1 s (03, 04, 06, an upper bound, retail); 0.3% per second (03, uncited). See 7.2 and 7.9. Do not present any of them as the store's own result. [03, 04, 06, 08]
3. Recompute with the lifted conversion rate. Difference x 365. Source 06's example: 3.5% to 3.7% = $5,000 a day, about $1.8 million a year. [06]
4. Add the ad-spend angle: paid clicks that leave before load never see the offer. [08]
5. Present benchmarks as direction (Portent 1 s vs 5 s = 2.5x; source 08 says up to 3x; sources 04 and 06 say 5x for 1 s vs 10 s). Say which study, and say they are third-party figures. [03, 04, 06, 08]
6. Do the arithmetic in code, not in prose.

Cards: [77da7bd48ab8] [fa57997432c4] [b36e60f619f7] [41ce06260ce9] [f8bdb58727f9] [af5fd5b1745b].

### P7. App, plugin and third-party triage

Goal: a shorter list of scripts, each with a stated revenue role. Preconditions: [needs brand data: app list and revenue role per app]; duplicate theme or staging.

1. List every installed app, sales-channel app, app embed, plugin and external script. Include scripts pasted by hand. [01, 03, 08]
2. For each, write the concrete revenue or operations mechanism (sizing chart for sized products; reviews for social proof; pixel for attribution). "How does this contribute to revenue now?" [01, 08]
3. Mark: no clear value, purely visual, trial left on, duplicate of a theme feature (announcement bar, cart discount code), or not used. Remove those completely (uninstall or delete, not deactivate). [01, 03, 08]
4. Uncertain items: disable in staging, re-measure, decide. No speed change and useful = keep; clear gain = remove. [08]
5. Count what remains against the budget: more than 20 apps is a warning (03); each third-party script about 34 ms (06); the median mobile score fell from 74 at 0 to 5 services to 44 at 21 to 30 (04). [03, 04, 06]
6. Shopify: Customize > App embeds. Turn off every embed not in active use. Save. [01] [verify UI]
7. For each kept script decide its loading: needed at first paint (keep), needed on this template only (P11), needed only after interaction (P10), pixel (R48).
8. Clean residual code (P8). Re-test (P1).
9. Set the rule for the future: reviews for speed complaints, theme-already-does-it check, and a before-and-after test for every new install. [04, 01]

Rollback: reinstall the app; restore the theme copy. Cards: [8dbbb42b9c2e] [474204ae609c] [d675d594782b] [efd7ec0cb6ce] [753859e92e44] [c09e2fd0f0d7] [a62896aba3d8] [4e05290f17d5].

### P8. Remove residual app and pixel code (Shopify)

Goal: no leftover calls to servers of apps you removed. Preconditions: backup or duplicate theme; list of uninstalled apps and old pixels.

1. Online Store > Themes > Edit code. Use the left-panel search. Search the app's brand name and its App Store listing name (example: "Hexom" and "free shipping bar"; "Loox" captioned as "logs"). [01] [verify UI]
2. Check theme.liquid, head and footer snippets at minimum. The Chrome extension "Shopify Theme File Search" searches all files at once. [01]
3. Deep search: Themes > theme menu > Download theme file; unzip; open the folder in a code editor (Cursor is free); global search for each app name, listing name, old pixel or provider ("Google"). Matches can sit in JSON files. Note file and line. The download is a snapshot; re-download if you change the theme. [01] [verify UI]
4. Back in Edit code, open that file and line. Remove only the target tag, or comment it out with Cmd+/ or Ctrl+/ (Liquid comment). [01]
5. Also scroll theme.liquid for script and pixel tags you do not recognize. To tell whether a script belongs to an installed app, check Apps (including sales channels); if unsure, ask whoever managed the store. Do not touch scripts you cannot identify. [01]
6. Remove old tracking pixels, unused custom fonts and style tags from plugins you stopped using. [01]
7. Save. Load the store. Check it works. Re-test after each removal so changes can be attributed. [01]

Rollback: restore from the backup theme or un-comment. Cards: [3c6bd0cce957] [68699dfd59de] [fde546149035] [10d064e032f8] [58c5589c135f] [8dbbb42b9c2e].

### P9. Add defer or async to scripts in theme.liquid (or the WordPress head)

Goal: no render-blocking scripts that do not need to block. Preconditions: Lighthouse render-blocking list (P1 step 11); duplicate theme.

1. Note each script under render-blocking resources. [01]
2. Open theme.liquid. Find `<script>` tags with neither `defer` nor `async`. Shopify's newer code editor flags them. [01] [verify UI]
3. Identify what each script does and which app it belongs to (inspect the front end; example: a script traced to a cookie banner widget). Skip anything you cannot identify. [01]
4. Add `defer` (`defer` or `defer="defer"` both work). Save. [01]
5. Load the store and test the exact feature the script powers. Works: keep. Breaks: replace with `async`, test again. Also breaks: remove the attribute; that script must block. [01, 03]
6. Re-run Lighthouse; confirm the entry is gone. Example: 78 to 80 after 1 defer, 81 after removing a jQuery script. [01]
7. Unknown speed or caching service scripts: comment out, re-test; if unchanged, leave them. [01]
8. WordPress: use the plugin's "Load JavaScript deferred" with exclusions for scripts that must load first (P13). [05]

Rollback: remove the attribute. Cards: [1dffb0dd47d1] [1d1dca3e3cfb] [07b358e531fb] [e42f2f04f259] [9714159dd4aa] [cdc61c33e699].

### P10. Delay app scripts until the shopper interacts (Shopify)

Goal: app widgets that are not in view load on the first scroll, click, touch, mouse move or key press instead of at load. Preconditions: P7 done; CLS and LCP fixed first or at least measured (R78); [needs brand data: widgets that must show at load; pixel and consent setup]; duplicate theme.

Source 01 sells the code and does not publish it. The method is described; a developer or the agent writes the small vanilla JavaScript function.

**10a. All app scripts via the content_for_header override**
1. Edit code > theme.liquid > search `content_for_header`. [01] [verify UI]
2. In DevTools Elements, expand the head, open the unnamed script tags until you find the "async load" function (usually the last). It lists every app script URL Shopify injects. Copy the list for the record. [01]
3. Wrap `{{ content_for_header }}` in `{% comment %}` ... `{% endcomment %}` and, directly under it, render a snippet that outputs content_for_header with the async injection stopped and replays it on the first human interaction (scroll, click, mousemove, touchstart, keydown). Brief for the developer: "look at the async function and delay the injection until first interaction". [01]
4. Save. Wait 1 to 2 minutes. Re-test 3 times. [01]
5. Verify: Console open, refresh, do not touch the page: widgets absent; move the mouse: a console message and the widgets appear. [01]
6. Exercise every app fully: reviews, upsells, loyalty, forms, chat, subscriptions. Anything broken: take that app out of the delay (10b) or revert. [01]
7. Tracking: test page view, variant change, add to cart and a test purchase, with consent accepted and refused; check for missing and duplicated events. If events break, keep the pixel in the initial load (source 01's rule) or move to the platform's supported pixel integration (card correction). Pixel setup is 06-MEA. [01]
8. Expected effect: blocking time drops; source 01 claims 10 to 20% score gain when apps are the bottleneck; on a store with large CLS or LCP the gain is small. [01]

**10b. One app script only (capture and filter)**
1. Copy the app script URL from the async function. [01]
2. In theme.liquid: capture content_for_header, assign a version with that URL removed, output the modified version. Confirm the URL is gone from the async function and the app stops working on the front end. If it still works, it is also injected via an app embed: toggle the embed off. [01] [verify UI]
3. Create a snippet (example name lazy-scripts.liquid) with a function that creates a script tag with that src on the first interaction; render it in theme.liquid. Verify the app fires on click or scroll. [01]

**10c. An app embed widget (chat widget example)**
1. Leave the embed on. Refresh, DevTools Elements, search the app name. Right-click its script element > Edit as HTML, copy the JS URL; same for its CSS URL. [01] [verify UI]
2. Add both URLs to the lazy-load function's lists. Save. Customize > App embeds: toggle the app off, save. [01] [verify UI]
3. Verify the widget appears only after hover or scroll and works fully. Example: 57 to about 65. Re-check after app updates, since URLs change. [01]

**10d. A hardcoded script (cookie banner example)**
1. Confirm the banner causes CLS or blocking in the report. Confirm the consent owner allows delaying it (R76). [01]
2. Comment out its script tag in theme.liquid. Paste the lazy-load function above `</head>` with the banner URL in its list. [01]
3. Verify: refresh without touching, banner absent; move the mouse, banner appears; Console message shows. Example: CLS gone, 48 to 57. [01]

**10e. Dynamic checkout buttons**
1. [needs brand data: wallet button usage]. If unused, disable them in the theme settings. [01] [verify UI]
2. If kept: remove their script from content_for_header as in 10b and inject on interaction. Buttons appear late; trade-off unmeasured. Test on the copy theme. [01]

Rollback: un-comment `{{ content_for_header }}` and remove the snippet render; toggle embeds back on. Cards: [d1007a68a9e0] [4e05290f17d5] [b7d4c6046a25] [2a89f4e58923] [9714159dd4aa] [56315833a352] [b711b4ded0ce] [b1f2c1da412b] [867a3ac29ede] [98a7bf9f5fb4] [6427c0d96eec] [ef51a42e0e16] [20821a7ae674].

### P11. Load app assets only where the widget is, and remove duplicates

1. For each script flagged as unused on a template, check whether its widget is visible on that template. Reviews and subscriptions: collection and product only. Rewards: rewards page only. Carousel library: only where a carousel is in view at load. [01]
2. Load those assets conditionally by template (Liquid template conditions; developer if the theme is complex). This also clears the app's "reduce unused CSS" warning on other pages. Source 01 gives no code. [01]
3. Look for scripts loaded twice (Facebook by hand and by app; PostScript twice). Remove the duplicate; test events (R48). [01]
4. App assets that lack minification or text compression and are served from the app's host: ask the app's support, or drop the app. [01]
5. WordPress equivalent: Asset CleanUp per page (P13). [02]

Cards: [adc3ea59042a] [81ac749043da] [44c02380f01e].

### P12. Self-host a library you must keep (Shopify)

1. Prefer removing jQuery; use vanilla JavaScript. [01]
2. If you must keep a CDN library: open its URL, save the file, upload it to the theme assets folder. [01] [verify UI]
3. Copy an existing script line that uses the `asset_url` filter and replace only the file name. Hovering the link in the editor should say assets should be served from the Shopify CDN. [01, 03] [verify UI]

Cards: [fdbc70a82f75] [5748b07d6cda].

### P13. WordPress and WooCommerce: unload assets and tune the optimization plugin

Goal: no jQuery, cart files, block CSS or emoji scripts on pages that do not use them; JS minified, deferred and delayed without breaking anything. Preconditions: staging; a waterfall (GTmetrix) of each key page.

1. Waterfall audit: PSI "Render-blocking requests", then the full GTmetrix waterfall. Mark what the page does not use (jQuery, WooCommerce CSS, add-to-cart script on a page with no cart, entrance animations, Google Fonts). Split into global and page-specific. [02] [verify UI]
2. Site-wide bloat: theme or builder performance settings (Oxygen > Settings > Performance in the demo). Tick: Gutenberg block CSS (only if unused), disable emojis, disable dashicons for logged-out users, remove pingbacks. Skip toggles tied to features you use. Save, recheck the waterfall. [02] [verify UI]
3. jQuery: only if theme and plugins do not need it on the front end. Snippet on `wp_enqueue_scripts` that dequeues and deregisters jQuery, with conditions front end AND not logged in (the admin bar needs it). Verify against WordPress docs; source 02 does not print the code. Recheck the waterfall. [02] [verify UI]
4. Per-page unload: Asset CleanUp (free). Open the page; the metabox lists loaded files by plugin group (13 WooCommerce files in the demo). Unload what the page does not use (brand styles, sourcebuster, add-to-cart, block styles, jQuery block UI). Keep what you are unsure about. Write down what you unloaded; re-enable if you add a mini cart later. [02] [verify UI]
5. Optimization plugin (WP Rocket in source 05): File Optimization tab. Tick "Minify JavaScript files" only. Save. Clear cache. Browse several pages incognito; everything must work. Breaks: untick. Repeat the same loop for "Combine JavaScript files", then "Load JavaScript deferred" (add exclusions for scripts that must load first), then "Delay JavaScript execution" (can break add to cart or sliders). One setting per loop. [05] [verify UI]
6. Image dimensions: WP Rocket "Add missing width and height attributes". [05] [verify UI]
7. Fonts: P21. Caching and compression: P26. Database: P28 step 6.
8. Rerun PSI. Demo: 69 to 99 on 1 page; example only. [05]

Rollback: untick the last setting; re-enable unloaded files; disable the snippet. Cards: [701c087d0917] [83d6ff4a133c] [0d00d9d01688] [44c02380f01e] [8f0d567d9844] [883371c7111c] [514d616ab421].

### P14. Image pipeline before upload

Goal: every new image arrives sized, compressed, named and described. Order matters; other orders create rework: resize, crop, convert, compress, rename, alt text, upload, order gallery, verify. [01]

1. Resize: long edge to about 2,000 px (3,000 only for a full-bleed hero). macOS Preview batch: same-orientation images in 1 folder, select all, open in Preview, Edit > Select All, Tools > Adjust Size, set the larger dimension to 2,000. Do not mix portrait and landscape in 1 batch. Content images: 2x the rendered width is the target (source 02), capped at 2,000. [01, 02] [verify UI]
2. Crop 1 by 1, never in bulk; product position differs per shot. Square for general grids, 4:5 for fashion. [01] [verify UI]
3. Convert: JPEG for photos, PNG only with transparency, MP4 for motion; never GIF. If your platform serves WebP or AVIF automatically (Shopify, Shopware), upload JPEG or PNG and let it convert. If you control delivery (WordPress), export AVIF (source 02, quality 50%) or WebP (source 04). [01, 02, 04, 08]
4. Compress with a preview. Squoosh: drag quality from 75 down until artifacts show. Photopea: Image > Size 2,000 px, Export as JPEG about 70%. Source 04: JPEG 80% typical. Optional second pass on TinyJPEG or compressjpeg.com saves little (8% in a demo). Compress once from the original; keep the original. [01, 04, 02]
5. Check size against the ceiling: product under 100 KB, hero under 200 KB target; 250 KB max for the LCP image; 500 KB hard stop (R31). [04, 05, 01]
6. Rename: keyword + descriptor + unique detail + angle (leather-wallet-men-brown-front). Never camera or supplier names. [01]
7. Alt text: describe the image in plain language with product, visible attributes and angle; no sales pitch; decorative images get empty alt. Not a speed factor; done here because you are touching the file. [01, 02]
8. Upload once to the media library and select it everywhere (Content > Files, product page, collection cover, customizer pickers all land in 1 library). Update with Replace image; check each placement after. [01] [verify UI]
9. Assign variant images so swatches switch the gallery. [01] [verify UI]
10. Verify on the live page (P16).
11. Video: compress files; `preload="none"`; MP4 in a video tag replaces GIF. [01]

Cards: [08bb3d69ec5b] [dc287d5fb7e6] [cfa3fe76f953] [621e302f651f] [02dbd594ff18] [3dd6497a4d63] [f50e2bf2a5c4] [b783c30c2217] [8883db1cfb1d] [88d406704603] [fe083ee96b08] [876fb6014fe1] [23917da7d97a] [c4e17c272dd9] [c371cc94a060] [0f413fcac223] [5148a60eef22].

### P15. Find and fix heavy images already on the store

1. Shopify: Content > Files. Scroll for large files (3 MB, 5 MB examples). Flag everything over 500 KB. Compressor apps often skip these. [01] [verify UI]
2. Find the section that uses each heavy image. Download it. [01]
3. Compress on a free tool (example cut about 70%). If still over budget (1.7 MB in the demo), resize (Shopify image editor: Resize, example width 1,500, keeps ratio, saves a copy; or Photopea), download, compress again (about 400 KB). [01] [verify UI]
4. Re-upload and place it back. Keep the original file. [01]
5. Quick in-theme hero fix: Customize > section > image > Edit > Resize > new width > Apply > Save. This resizes but does not compress, so compress separately for the real gain. [01] [verify UI]
6. Large catalogs: bulk compression app set to compress on upload (Tiny SEO Speed and Image Optimizer and SEOAnt in source 01, affiliate; ShortPixel, Imagify, TinyIMG in 04 and 02) or a CDN image service. Measure before and after; the app adds scripts. [01, 04, 02]
7. WordPress: inspect the image, hover `src` to read rendered, intrinsic and file size (demo: 398 x 597 rendered, 1770 x 2560 intrinsic, 161 KB). Open the URL, copy into Photopea, Export as AVIF at 2x rendered width, quality 50% (about 10 KB in the demo). Replace on the page; re-add alt text. Background images that cover a section: convert only, do not resize. [02] [verify UI]

Cards: [3a99be49f292] [0c4e0163aff8] [7558889b0856] [3bbbee3c2099] [64042fc21a8b] [f50e2bf2a5c4] [08e530e7d0b2].

### P16. Inspect rendered vs intrinsic size, and check the theme serves responsive widths

1. On the live page, right-click an image > Inspect. Hover `src`. Read intrinsic size and file size vs the rendered box. Dock DevTools to the side. [01, 02]
2. Network tab, reload: read delivered file sizes. [01]
3. Flag gaps: intrinsic more than about 2x the box (5,000 px in a 700 px box, 6 MB). Decide per image: oversized dimensions, resize; heavy after resize, compress; right size but heavy, compress only; small and right size, leave it. [01, 02]
4. Theme check (Shopify): Edit code > open a section or snippet that renders an image (hero, image with text, product card). Bad: a single `src` using the image URL filter with `master`. Good: several widths (1,600 default; 800 under 800 px; 1,200 under 1,200 px) or srcset. Check every image section on old, custom or agency themes. Fix or brief a developer (R100). [01] [verify UI]
5. How to see Shopify's variants: the image URL ends with a width parameter (493, 450); removing it opens the original. Newer themes resize automatically (a 5,000 px upload shown at 1,300 px intrinsic). [01]
6. Category grids: thumbnails, never full-size photos. [04]
7. Re-check visually after each change; apply to hero, section images and repeated blocks, not only product images. [01]

Cards: [036e673a5a05] [c9fcbc1b5513] [08b2e0e2f95d] [c5fb935a9b7d] [21698bb77d52] [b783c30c2217] [8883db1cfb1d].

### P17. Lazy-load below the fold and keep the first item eager

1. Add `loading="lazy"` to every image not visible at first load; footer logos included. [01, 02, 03]
2. Set `loading="eager"` explicitly on hero, logo, first slide, main product image and first card, so a later plugin cannot flip them. [02, 01]
3. Carousels: slide 1 eager, slides 2 and on lazy. [01]
4. Loops (collection list, product grid), as source 01 describes it (adapt syntax to the theme): in the section's for loop, if `forloop.index == 1` assign `lazy = false`, else `lazy = true`; pass `lazy: lazy` into the card snippet; in the snippet output `loading="eager"` when lazy is false, else `loading="lazy"`. Inspect: card 1 eager, rest lazy. [01]
5. If a hero section lazy-loads its first image by default, add logic to exempt it. [01]
6. Videos: `preload="none"`. [01]
7. Optional lazysizes plugin (src = empty pixel, data-src = real URL, class lazyload). Source 01 calls it slightly better than native; never on in-view images. [01] [web check: lazysizes in current browsers]
8. Lazy-load supporting content too: user-generated content, social carousels, reviews, related products (P10). [03, 04]
9. Verify in the Network panel: in-view images download at once; others only on scroll. [01]

Cards: [51db910ccfc8] [0f413fcac223] [eeb9c51fe0da] [70af8654d12d] [b093ed3b4d75] [481d00497deb] [3c9bddfb47c1] [4e8335051514] [c067983b290a].

### P18. Fix LCP

Goal: the largest in-view element paints in under 2.5 s (lab and field). Preconditions: LCP element named (P3 step 6, or Web Vitals extension); throttled test done (P2).

1. Name the element per template: hero or first grid (home, collection), main product image (product), a headline or video elsewhere. [04, 05, 01]
2. Web Vitals Chrome extension (settings > console logging): the LCP log names the element and splits time into TTFB, load delay and render delay. Network waterfall: very wide bars before the main content are the bottleneck. [07] [verify UI] [web check: extension features vs DevTools]
3. Throttled load of the ad landing page: does the main image show as soon as it downloads? If the file arrived but stayed hidden until a slideshow plugin's JS ran, the fix is the plugin, not the image: show the main image as a plain image outside the carousel path. [01]
4. Remove `loading="lazy"`, lazyload classes and similar from the LCP image. Set eager. [01, 04, 02]
5. Remove fade-in, slide-in, preloader bars and placeholders on it. [01, 07]
6. Compress it: under 250 KB (05), under 200 KB for a hero (04); AVIF or WebP where you control delivery. [05, 04]
7. Add `<link rel="preload">` for it with `fetchpriority="high"`; on product pages add Liquid logic that preloads the right image per product. Set `fetchpriority="low"` on images far down. Preload only this and critical fonts. [01, 07] [web check: syntax and support]
8. Cut render-blocking scripts ahead of it (P9, P10) and check TBT; blocking time delays LCP too. [01, 07]
9. Read TTFB. Under 800 ms: done here. Over 800 ms after the front-end work: hosting (P28). [08, 05]
10. Retest 3 times. Source 01 expected a community store's PDP to move from about 5 s LCP and a score in the 30s to 43 to 50, or 50 to 60 with preload; example, not a promise. [01]

Rollback: revert the section or snippet from the duplicate theme. Cards: [7a213481a9d2] [1b9747314efd] [d56347d58c66] [b4735bb55b51] [958af3150188] [457e4a26802c] [11d184a954ab] [cc2d433b9ede] [eb9525bda54a] [8883db1cfb1d] [a10a7445f2a3].

### P19. Find the CLS source

1. PSI filmstrip: compare frames for a new element that pushes content. GIF motion in frames is expected; the signal is a new element. Check the desktop tab. [01]
2. PSI outlines the shifting element. Copy its id or classes, open the page, Inspect, Cmd/Ctrl+F, paste, Return to reach the tag. If the id looks like an app prefix, search that name in the App Store (a "hexom" id led to a free shipping bar app injecting an announcement bar after load). [01]
3. Lighthouse > View Original Trace: watch from first paint for elements that appear late (header menu, Afterpay widget, product thumbnails). Zoom the page out and re-run to catch below-fold shifts. Lighthouse shows fewer issues than PSI; fix Lighthouse's first. [01] [verify UI]
4. Web Vitals extension CLS log lists the shifted DOM elements. [07] [verify UI]
5. Throttle and watch (P2); stop the load mid-way and inspect. Custom 20 kbps profile if needed. [01]
6. Common causes to check in order: images without dimensions; late app widgets (announcement bars, review badges, payment widgets); cookie banner; font swap resizing text; late body or inline styles; lazy-loaded theme CSS with incomplete critical CSS; contradicting CSS rules; ads, embeds, iframes; entrance animations. [01, 04, 05, 07]
7. Search Console > Core Web Vitals shows the field effect; Shopify admin "visual stability: poor" points at CLS. [01] [verify UI]

Cards: [f00068c50316] [24893ea78676] [80a761efcb18] [cabcd2d4c66e] [ba43a0aaa747] [a5d2c3aee970] [11d184a954ab] [2969a152a99d] [883371c7111c] [3932af95de46].

### P20. Fix CLS

Goal: CLS under 0.1 on every template, both devices. Do each fix on the duplicate theme; retest between fixes.

1. Images and videos without dimensions: add `width` and `height` (numbers, no unit; read the rendered size by hovering `src`). Or CSS `aspect-ratio`. Works only if CSS keeps the ratio; use `srcset` when the ratio changes by viewport. WordPress quick fix: WP Rocket "Add missing width and height attributes". [01, 02, 05, 07]
2. Late widgets: measure the rendered size, add a CSS rule fixing the container's width and height, verify on each breakpoint (fixed size can clip responsive widgets). [01]
3. App-only simple elements (announcement bar): replace with the theme's own. [01]
4. Ads, embeds, iframes: placeholder with fixed space. [05, 07]
5. Cookie banner: delay to interaction (P10d) only with a consent go-ahead. [01]
6. Font swap: `font-display: swap` plus a fallback styled to the custom font's size and line height (P21). [01]
7. Contradicting CSS: remove 1 rule instead of stacking overrides. [01]
8. Late body styles: a page-width style in the body tag re-wrote base CSS after first render. Move it to the end of the head; wrap desktop-only rules in `@media (min-width: 767px)`; better, use the theme's layout width setting. Confirm the intended design first. [01]
9. Body jump on Dawn: `display: block` on the body tag stopped the hero rendering low and jumping up in 1 store. [01]
10. Lazy-loaded theme CSS: generate critical CSS per visually different template (online generator fed with the full theme CSS and the page URL), inline it via a snippet in theme.liquid, then add reserve rules for anything still moving (font-size changes included). If the theme has no critical CSS, create a snippet of CLS-preventing rules rendered only on the template being fixed. [01]
11. Tone down animations that do too much. [07]
12. Retest with Lighthouse original trace and PSI; then wait for field CLS (one case: 0.73, 0.66, 0.13, 0.1, 0 over about 28 days). [01]

Rollback: revert the snippet or CSS rule. Cards: [d16d1fcdd349] [f597983f8e66] [883371c7111c] [3932af95de46] [24893ea78676] [ba43a0aaa747] [f00068c50316] [b1f2c1da412b] [14bc6ce5b8a6] [80a761efcb18] [dbf103b05b0a] [3b3894441e6c] [f21b8466aa36] [cabcd2d4c66e].

### P21. Fonts

1. Inventory the custom font weights and styles actually used. Keep about 3 at most. No design reason for a custom font: use the theme's built-in fonts. [01]
2. Shopify: Edit code > search `@font-face`. Add `font-display: swap;` to every rule that lacks it (just under font-family), every weight and italic. [01] [verify UI]
3. WordPress: find the fonts on fonts.google.com; get WOFF2 files (Google Web Fonts Helper recommended; Font Squirrel failed on some variable fonts); upload as custom fonts in the builder or theme (Oxygen: Preferences > Custom Fonts, set weight and style) or a custom-font plugin; name them clearly ("Inter Local"); switch the body and heading font variables to the local versions. [02] [verify UI]
4. Subset to the characters you use. [04]
5. Test on throttled 3G: a standard font shows first, then the custom font swaps in. [01]
6. Style the fallback to match the custom font's metrics so the swap does not shift text (P20 step 6). [01]
7. Rerun GTmetrix and confirm no requests to fonts.googleapis.com. [02]

Cards: [1eacf61a57a2] [027af5f63b68] [3ef856fab3ae] [3263b4728b85] [ea1d2a527d10] [731928d47c17] [74fc1378fc6a] [14bc6ce5b8a6].

### P22. Critical CSS and non-critical CSS

1. Identify stylesheets that style only elements not visible at load (modals, drawers, below-fold sections). [01]
2. Rewrite each as `<link rel="stylesheet" href="..." media="print" onload="this.media='all'">`. Never on in-view styles. [01]
3. Confirm the swap in the rendered page and the Network panel; a failed onload leaves the sheet print-only. [01]
4. Critical CSS: extract above-fold styles per template, inline them, load the rest async. Tools named: Critical, PurgeCSS; WP Rocket and similar plugins generate it. On Shopify, per-template snippets (P20 step 10). Developer task on complex themes. [04, 01]
5. Minify CSS (CSSNano; plugin settings on WordPress). [04]
6. Recheck the Lighthouse trace for the first second: styled from first paint, no unstyled flash. [01]

Cards: [08d397da7d0d] [b73d08e8603c] [e9b7f4c3107e] [cabcd2d4c66e] [c067983b290a].

### P23. Shopify theme code clean-up: asset_url, Liquid loops, Quick View, sliders, pop-ups

1. `asset_url`: view page source; asset URLs should carry `?v=`. Find URLs typed directly inside CSS files and change them to the `asset_url` filter (card form: `{{ 'theme.css' | asset_url | stylesheet_tag }}`). Check the Shopify URL filter docs. [03] [verify UI]
2. Liquid loops: review templates for `for` loops that crawl a whole collection to test price or tag, and for the same loop run in several snippets. Remove duplicates; use `product.options_with_values` where it fits. [03]
3. Quick View: does the grid show it? Click map (Hotjar, Hindsight) to see if shoppers use it. Source: customizer toggle, then apps, then theme code (developer). Remove it; if it must stay, AJAX on click or data attributes plus JS. [03] [verify UI] [needs brand data: click map]
4. Sliders: 1 hero image with a clear call to action; if required, 2 to 3 static slides, srcset, slide 1 eager (P17). [03, 01]
5. Pop-ups: exit intent or time delay, never on load. [03]
6. Empty `<img src=''>`: search and remove. Small icons: CSS sprite. [03]
7. Entrance effects and effects libraries on in-view elements: remove (P18 step 5). [01]
8. Re-test after each item.

Cards: [5748b07d6cda] [11d911ca0868] [6f05e9392e74] [a459458a1b47] [1c99225810ac] [d56347d58c66].

### P24. Video and embeds

1. Network tab before clicking play: if the player JS loaded at page load, the embed is standard. Replace with a lite embed (thumbnail about 15 KB; player on click). No library is named; developer or a lite-embed component. [03, 09]
2. Mobile: turn off autoplay; static thumbnail and a play button. [03]
3. Compress video files; `preload="none"`; MP4 in a video tag replaces GIF (attributes such as autoplay, muted, loop, playsinline are not given by the sources; verify). [01]
4. Re-test the template.

Cards: [badac5a4a278] [0021f744e1e0] [3dd6497a4d63] [5148a60eef22] [0f413fcac223].

### P25. Redirects and broken links

1. Export the redirect list (Shopify Navigation) or crawl. Replace 302s that should be permanent with 301s. [03] [verify UI]
2. Remove chains: never redirect to a URL that redirects. [03]
3. Run a broken link checker for images, CSS and JS 404s; fix or remove. [03]
4. Custom 404 pointing to the 2 biggest categories (Gymshark example). [03]

Cards: [2cd7ecfea589].

### P26. Caching: verify, set rules, protect dynamic pages

Preconditions: fundamentals done (R91); owner's go-ahead for any purge.

1. Verify current state (any platform): DevTools Network, Preserve log, no throttle, reload, click the document request, read response headers. Cache hit header present (name depends on host); `content-encoding: gzip` or the host's method. Do not read `cache-control` as proof. [02] [verify UI]
2. WordPress: turn on compression and caching at the host and cache plugin (Breeze on Cloudways; WP Rocket, W3 Total Cache, Redis Object Cache named by source 04). Re-verify in incognito with Disable cache unticked. [02, 04] [verify UI]
3. Rules: static assets (images, CSS, JS, fonts) up to 1 year only with versioned file names; HTML short; prices and stock either updated by JS on a cached page or short TTL with fast invalidation. [04]
4. Exclusions: cart, checkout, account and any visitor-specific page. Load each and read the headers. [04]
5. Defer session creation until first add to cart or login where the platform allows. [04]
6. Invalidation: selective purge on price and stock changes, not a full purge. Test: change a price in admin, reload the product page and a category page listing it; the page updates and the rest stays cached. [08, 04]
7. Full-page cache on self-hosted stores: Redis or Varnish via the host (P28). [08]
8. Shopify: caching is managed; do not install caching scripts. [01, 04]
9. After any change: test cart, add to cart and checkout end to end. [08]

Cards: [55f9847e6f0a] [9490c0550ad4] [ee4655c50df6] [0709d6cdeb98] [cdc61c33e699] [9973ef4b38a5].

### P27. CDN setup (self-hosted stores)

1. Pick by geography: 1 region, a basic CDN; global, a wide edge network. Named: Cloudflare (DDoS, image optimization), Fastly, Akamai, AWS CloudFront, BunnyCDN. Shopify already uses Fastly. [04, 03] [web check: plans and prices]
2. Start with static assets: images, CSS, JS, fonts. [04, 09]
3. Cache keys: include query parameters that change content (page number); exclude tracking parameters (UTM) so they do not fragment the cache. [04]
4. Automatic invalidation on image updates and deploys (API purge or URL invalidation). [04]
5. Monitor hit rate in the CDN dashboard; target 80%+. Low means misconfiguration or too much dynamic content. [04]
6. Optional: CDN image optimization for thousands of SKUs (Cloudflare, Imgix, Cloudinary). [04]
7. A CDN does not fix rendering or API problems; those stay with the developer. [09]

Cards: [46127ea01ca7] [9490c0550ad4] [6e2d4fa52ebe] [54e3673579e3] [8883db1cfb1d].

### P28. Hosting: tier check and the host conversation

Preconditions: images and plugins fixed and re-measured (R93); TTFB from PSI.

1. Tier by volume: shared ($1 to $15 a month) only for a new store with little traffic and a plan to upgrade within the year; VPS or cloud (about $20 to $50 a month managed) at 100+ orders a month; auto-scaling cloud or managed WooCommerce hosting at high volume; CDN on top for international customers. Compute ROI with abandonment and AOV. [04] [needs brand data: orders, AOV, abandonment] [web check: prices]
2. Read TTFB per template. Under 800 ms is the target; harder in ecommerce because of dynamic carts. [08]
3. Contact the in-house admin or host support with: PHP version (want 8.2+)? Redis or Varnish active? Full-page cache serving pre-rendered HTML? HTTP/3 on? Ask them to confirm caching and compression headers (P26 step 1). [08]
4. SaaS and cloud platforms: many settings are already tuned; read the documentation and ask only for what is missing. [08]
5. Before a peak event: memory and bandwidth limits, projected peak load, what add to cart, search and login do under load; load test; waiting room for limited inventory (05-SET for the infrastructure). [03, 06]
6. Database (WooCommerce): schedule clean-up of revisions, expired transients and orphaned metadata (WP-Optimize); remove or cache plugins that run heavy queries on every page load. [04, 08]
7. Re-measure TTFB and LCP after changes; test cart and checkout. [08]

Cards: [a063ce857916] [0709d6cdeb98] [d2e8efefa7f2] [a10a7445f2a3] [54e3673579e3] [88659194131b] [74fc1378fc6a] [3d795cd17d4b].

### P29. Monitoring and performance budget

1. Test at least monthly, after every app install, theme change or site-wide update, and before major sales. [04]
2. Automate: PSI API on a schedule, GTmetrix monitoring, Lighthouse CI in deploys (free); DebugBear, SpeedCurve, Calibre (paid). [04] [web check: prices]
3. Write the budget: max page weight (source 01 works to 2 to 3 MB per page; see 7.19), minimum mobile score per template, max third-party services per page, image ceilings (R31). [04, 01]
4. Any change that breaks the budget is reviewed before approval; every new feature gets a speed review because most changes slow pages. [04, 06]
5. Re-check delayed app URLs after app updates (P10c). [01]

Cards: [9ffe9f981c57] [689b4ce4442e] [621e302f651f] [b711b4ded0ce].

### P30. Prove a fix and report it

1. For each change: page, device, tool, 3-run average before, 3-run average after, date, what changed, what else changed at the same time. [01, 08]
2. Freshness confirmed (P4). Waited 1 to 2 minutes. [05, 01]
3. Slow-connection visual test before and after, described in words. [02]
4. Function tests: every affected app; page view, variant, add to cart, test purchase events with consent on and off; cart and checkout end to end. [01, 08]
5. Field follow-up: note the date 28 days out to check PSI field data and Search Console. Shopify admin web performance report after 12 to 24 hours (older UI). [05, 01] [verify UI]
6. Share the frozen PSI report link with the owner or developer. [05]
7. Say what is an example and what is measured. Never present a source's case result as the store's forecast.

Cards: [c33439a2c9b9] [dca8734ae894] [6012d71fccb6] [f1a837edbfbe] [15b41de4c239] [6427c0d96eec] [ef51a42e0e16] [085b91000740] [f338ed52ce8f].

### P31. Peak-event readiness

1. List the dynamic steps at risk: add to cart, checkout, login, site search. [06]
2. Speed audit of the templates involved 2 to 4 weeks before (P1 to P20). [04]
3. Capacity check with the platform or host (P28 step 5). [03]
4. Load test the dynamic steps; decide what each does under load (queue, throttle, static fallback). Card suggestion, not in the source text. [06]
5. Limited inventory: consider a virtual waiting room (source 06 sells them; 84% of surveyed shoppers preferred a queue to an error page). [06]
6. Freeze app installs and theme changes for the event window (R8). [04]

Cards: [88659194131b] [54e3673579e3] [9ffe9f981c57].

### P32. Theme choice, migration and benchmark (Shopify)

1. New store or beginner: Dawn or Horizon, not a complex premium theme (saves about $300 and the unused libraries). [01]
2. The 23 free themes are 2 codebases: 13 Dawn-based, 10 Horizon-based; switching within a family changes design, not speed. [01] [web check: current Dawn and Horizon versions]
3. Existing Dawn store with lots of work: keep Dawn, move to Horizon at the next redesign. New store: Horizon. Old slow custom theme: apply this playbook; if the cost exceeds a rebuild, rebuild on Dawn or Horizon with the redesign. [01]
4. Benchmark 2 themes fairly: same store, identical content (hero and a few products), all app embeds off in both, PSI on each published theme, record mobile and desktop plus LCP and blocking time. Example: Horizon 71 mobile / 74 to 77 desktop vs Dawn 56 / 78, LCP from an oversized hero in both. [01]
5. Premium theme only when a specific feature is known to make money. Agency evidence for a lean theme: over 50% better home page bounce for new visitors after 1 switch (single observation). [01, 03]

Cards: [637495534f7f] [943bdc967b80] [21280154cb29] [02c570556e30] [caf6d4c08b6d] [a459458a1b47] [d68b270990ab].

## 5. Diagnostic checklists

Written for a worker. Each row: what to check, how, what good looks like, what bad looks like, the fix (procedure), the source. Run 5.1 first, then the sub-topic tables, then the template tables in 5.14 to 5.18, then 5.19 for mobile vs desktop.

### 5.1 Measurement setup

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Baseline exists | Change log has dated 3-run averages per template, mobile and desktop | Table complete | Nothing recorded, or 1 run | P1 | 08, 01 [6012d71fccb6] [c33439a2c9b9] |
| Test freshness | Above-fold marker in PSI screenshot | Marker shows | Marker missing | P4 | 05 [f1a837edbfbe] |
| Field vs lab | PSI top vs bottom section | Both read; lab used for fixes | Treating a mismatch as an error | P3 | 05 [085b91000740] |
| URL data available | URL / Origin toggle | URL active | Greyed; only Origin | Use lab for the page | 05 [7d6d1e80db3c] |
| Metric names in the report | CWV named | LCP, INP, CLS | FID, TTI, "fully loaded" as vitals | R18 | 05, 08 [dfde1d811af8] [a10a7445f2a3] |
| Score stability | 3 runs | Within a few points | Swings of 10+ | Many apps loading; P7 | 01 [079f8ea11444] |
| Second tool | GTmetrix or WebPageTest on same URL | Same problems flagged | Only 1 tool used | P1 step 10 | 09, 04 [b35da7f37105] [a4ded81551ca] |
| Slow-connection look | Slow 4G, cache disabled, reload | Main content fast, no jumps, images pop in whole | Blank wait, jumps, images scan in | P2, then P18 to P20 | 02 [29d73beaf348] |
| Outliers on big sites | Unlighthouse on staging | All pages similar | A few pages far worse | P5 | 07 [08cf33a0563a] |

### 5.2 Images

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| File weight per image | Network tab; Content > Files | Product under 100 KB, hero under 200 KB, LCP image under 250 KB, nothing over 500 KB | Multi-MB files | P14, P15 | 04, 05, 01 [8883db1cfb1d] [eb9525bda54a] [3a99be49f292] |
| Intrinsic vs rendered | Inspect image, hover `src` | Intrinsic about 2x rendered, under 2,000 px | 5,000 px in a 700 px box | P16 | 01, 02 [036e673a5a05] [b783c30c2217] |
| Responsive widths | Read section code; image URLs carry width parameter | srcset or several widths | Single `src` with `master` | P16 step 4 (developer if needed) | 01 [c5fb935a9b7d] |
| Format | Extensions and delivered type | JPEG photos; PNG only transparent; MP4 motion; WebP or AVIF delivered by platform or CDN | PNG photos; GIFs; hand-uploaded WebP on Shopify | P14 step 3 | 01, 04, 02 [02dbd594ff18] [f50e2bf2a5c4] |
| In-view images lazy? | Inspect hero, logo, first slide, main product image, first card | `loading="eager"`, no lazyload class | `loading="lazy"` or lazyload class | P17, P18 | 01, 02, 04 [7a213481a9d2] [eeb9c51fe0da] |
| Below-fold images eager? | Network panel on load | Only in-view images download at once | Everything downloads at load | P17 | 01, 03 [51db910ccfc8] [4e8335051514] |
| Dimensions set | Inspect `<img>` | `width` and `height` or `aspect-ratio` | Missing | P20 step 1 | 01, 02, 05, 07 [d16d1fcdd349] [f597983f8e66] |
| Entrance effects | Watch throttled load; read section code | Plain image | Fade, slide, preloader, placeholder | P18 step 5 | 01 [d56347d58c66] |
| Non-product images | Content > Files sorted by size | All under ceiling | 3 MB, 5 MB files | P15 | 01 [3a99be49f292] |
| Duplicates in media library | Search file names | 1 file per image | Same name with gibberish suffix | R40 | 01 [23917da7d97a] |
| Empty `src` | Search theme for `src=''` | None | Present | P23 step 6 | 03 [1c99225810ac] |
| Slider weight | Count slides and sizes | 1 hero or 2 to 3 static slides | 4 to 5 auto-rotating | P23 step 4 | 03 [a459458a1b47] |
| Bulk compressor coverage | Compare product vs section images after app run | Both compressed | Only product images | P15 step 1 | 01 [3a99be49f292] |
| Compression history | Check original exists | Compressed once from original | Compressed several times | R33 | 04 [8883db1cfb1d] |

### 5.3 Scripts, apps and third parties

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| App count and revenue roles | List apps, embeds, plugins, scripts with a stated role | Every item has a role | Trials, unused, purely visual, no role | P7 | 01, 03, 08 [8dbbb42b9c2e] [efd7ec0cb6ce] [753859e92e44] |
| Third-party service count | Count distinct third-party hosts on a page (waterfall) | 0 to 5 (median 74 mobile) | 21 to 30 (median 44) | P7 | 04 [c09e2fd0f0d7] |
| Scripts at load (Shopify) | DevTools head > async load function; theme.liquid; App embeds | Only needed scripts; pixels once | Many app URLs; duplicates | P10, P11 | 01 [2a89f4e58923] [adc3ea59042a] |
| Residual code | Search app and pixel names in theme files or the downloaded theme | No hits for removed apps | Leftover tags | P8 | 01 [3c6bd0cce957] [10d064e032f8] |
| Bare script tags | theme.liquid scan; editor warning; PSI render-blocking | All non-critical scripts have defer or async | Plain `<script src>` in head | P9 | 01, 03 [1d1dca3e3cfb] [e42f2f04f259] |
| JS execution time | PSI "reduce JavaScript execution", TBT | Low | Seconds of JS (2.7 s example) | P9, P10, P13 | 01 [81ac749043da] |
| Unused JS and CSS | PSI opportunities per template | Assets load only where used | App CSS and JS on templates without the widget | P11 | 01 [adc3ea59042a] |
| Delay snippet working | Console message on interaction; widget timing | Widgets appear after hover or scroll | Widgets at load, or never | P10 | 01 [d1007a68a9e0] |
| App embeds | Customize > App embeds | Only used embeds on | Unused embeds on | P7 step 6 | 01 [d675d594782b] |
| App still works | Exercise each delayed app | Full function | Anything broken | Revert that app; P10 | 01 [6427c0d96eec] |
| Tracking intact | Page view, variant, add to cart, test purchase; consent on and off | Each event once | Missing or doubled events | R48; 06-MEA | 01 [ef51a42e0e16] |
| Duplicate pixels | Waterfall per vendor | 1 load each | Facebook twice | P11 step 3 | 01 [81ac749043da] |
| Libraries from outside CDNs | Waterfall hosts | Self-hosted or removed | jQuery from a third-party CDN | P12 | 01 [fdbc70a82f75] |
| jQuery needed? (WP) | Waterfall on public page | Absent if unused | Loaded with Migrate for logged-out users | P13 step 3 | 02 [0d00d9d01688] |
| WordPress bloat | Waterfall | No emoji, dashicons, pingback assets for logged-out | Present | P13 step 2 | 02 [83d6ff4a133c] |
| WooCommerce files off-cart | Asset CleanUp metabox on a non-cart page | Only needed files | 13 WooCommerce files on a landing page | P13 step 4 | 02 [44c02380f01e] |
| Speed or caching scripts | Identify unknown scripts | None, or proven useful | Unknown "speedy" scripts | Test by commenting out; R55 | 01 [cdc61c33e699] |
| Dynamic checkout buttons | Product page under add to cart | Disabled if unused, or delayed | Loading at first paint unused | P10e | 01 [98a7bf9f5fb4] |
| Tag manager | Waterfall per tag | Each tag justified | Many tracking scripts | R54 | 03 [78f603581ed4] |
| CDN script rewriting | View-source script types; waterfall for `rocket-loader.min.js`; when first-party JS starts vs load event | App code runs when its chunks arrive | JS waits for load; Rocket Loader or Email Obfuscation on | R59 | test 2026-09-24 |
| Third-party bytes measured right | Sum compressed sizes from response headers or direct fetch | Figure matches a direct fetch | Figure from Resource Timing (zeros) or decoded sizes | P1 step 13 | test 2026-09-24 |

### 5.4 Theme code, CSS and JS

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Versioned asset URLs | View source; check URLs in CSS | `?v=` via `asset_url` | Hardcoded URLs in CSS | P23 step 1 | 03 [5748b07d6cda] |
| Duplicate Liquid loops | Code review of templates and snippets | Each collection crawl once | Same loop several times | P23 step 2 | 03 [11d911ca0868] |
| Quick View | Network on collection load; click map | No pre-loaded product data | Data for 20 to 30 tiles at load | P23 step 3 | 03 [6f05e9392e74] |
| Critical CSS | Lighthouse trace first second | Styled from first paint | Unstyled flash then jump | P22 | 01 [cabcd2d4c66e] |
| Non-critical CSS | Network panel; link tags | Below-fold CSS on media=print swap | All CSS render-blocking, or visible CSS delayed | P22 | 01 [b73d08e8603c] |
| Minified JS and CSS | PSI "minify" opportunities | Minified | Unminified app or theme files | P13 step 5, R62 | 04, 05 [c067983b290a] |
| Code per page type | Coverage of product vs category vs checkout | Split | Checkout code on product pages | R62 (developer) | 04 [c067983b290a] |
| Render-blocking JS before main image | Waterfall order | Image before scripts | Scripts ahead of hero | P18 step 8 | 07 [cc2d433b9ede] |
| Content in server HTML | View source or JS off | Main content present | Content waits on JS (SPA) | R66 (rebuild) | 07, 09 [cc2d433b9ede] [171da560af89] |
| Late body styles | Inspect body tag | No inline layout styles | Page-width style in body | P20 step 8 | 01 [dbf103b05b0a] |
| Pop-up trigger | Load a page fresh | No pop-up at load | Fires on load | P23 step 5 | 03 [a459458a1b47] |
| API payload (headless) | Inspect a listing tile response | Only fields shown | Full product object | R69 (developer) | 09 [34052dbf559b] |

### 5.5 Fonts

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| `font-display: swap` | Search `@font-face` | On every rule | Missing | P21 step 2 | 01, 04 [027af5f63b68] |
| Variations count | Count weights and italics loaded | About 3 or fewer | 5 to 10 | P21 step 1 | 01 [1eacf61a57a2] |
| External font calls | Waterfall | Own domain or theme fonts | fonts.googleapis.com requests | P21 step 3 | 02 [731928d47c17] |
| Font swap CLS | Throttled reload | Text keeps size on swap | Text resizes | P20 step 6 | 01 [14bc6ce5b8a6] |
| Subset | Font file size | Small, needed characters | Full character sets | P21 step 4 | 04 [74fc1378fc6a] |
| Font format and subset | Waterfall: font file names, sizes, format | WOFF2, Latin subset, under 30 KB each, rupee sign present | TTF or OTF, full CJK set, hundreds of KB per file | P21; R60 | test 2026-09-24 |

### 5.6 Layout shift (CLS)

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| CLS value | PSI, both devices | 0.1 or less | Over 0.1; over 0.25 poor | P19, P20 | 05, 04, 01 [883371c7111c] [2969a152a99d] |
| Shifting element | PSI filmstrip and outline; Lighthouse trace; extension CLS log | None moves without input | Header, widget, banner, thumbnails push content | P19 | 01, 07 [f00068c50316] [11d184a954ab] |
| Late widgets | Watch throttled load | Space reserved | Widget pushes content | P20 step 2 | 01 [ba43a0aaa747] |
| Cookie banner | Throttled load | Reserved or delayed (with consent go-ahead) | Banner pushes page | P20 step 5 | 01 [b1f2c1da412b] |
| Ads, embeds, iframes | Inspect containers | Fixed placeholder | No reserved size | P20 step 4 | 05 [883371c7111c] |
| Contradicting CSS | Inspect computed styles | 1 rule | 2 heights for 1 element | P20 step 7 | 01 [24893ea78676] |
| Desktop CLS | PSI desktop tab | Also 0.1 or less | Mobile 0, desktop large | P19 step 1 | 01 [f00068c50316] |
| Field CLS trend | Search Console; PSI field | Falling after fix | Unchanged after 28 days | Re-run P19 | 01 [80a761efcb18] |

### 5.7 Largest Contentful Paint (LCP)

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| LCP value | PSI, both devices | 2.5 s or less | Over 4 s poor | P18 | 04, 05, 07 [2969a152a99d] [eb9525bda54a] |
| LCP element known | PSI Diagnostics; extension log | Named per template | Unknown | P3 step 6 | 05, 07 [eb9525bda54a] [11d184a954ab] |
| LCP element lazy or animated | Inspect | Eager, plain | Lazy, fade, preloader, in delayed carousel | P18 steps 4 and 5 | 01 [7a213481a9d2] |
| LCP image weight | Network | Under 250 KB (05), under 200 KB hero (04) | Multi-MB | P18 step 6 | 05, 04 |
| Preload and priority | View head | Preload plus fetchpriority high on LCP only | None, or many preloads | P18 step 7 | 01, 07 [958af3150188] [b4735bb55b51] |
| Image downloaded but hidden | Throttled load | Shows on download | Hidden until plugin JS | P18 step 3 | 01 [1b9747314efd] |
| Waterfall bottleneck | Network waterfall | No very wide bar before main content | Wide bars on hero or scripts | P18 | 07 [457e4a26802c] |
| TTFB | PSI | 800 ms or less | Over 800 ms | P28 after front-end work | 08, 05 [a10a7445f2a3] |

### 5.8 Interaction delay (INP, TBT)

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| INP (field) | PSI field section | 200 ms or less | Over 200 ms; over 500 ms poor | P9, P10, P13 | 04, 05 [2969a152a99d] [dfde1d811af8] |
| TBT (lab) | PSI lab | Low; no flagged long tasks | High: many long tasks over 50 ms | P13 step 5; P10 | 05 [8f0d567d9844] |
| Add to cart response | Tap on a mid-range phone | Instant | Half-second nothing | Cut scripts; R84 | 04 [2969a152a99d] |
| Variant and filter controls | Tap on collection and product | Instant | Lag | R84 | 04, 07 [717cf5ec82fd] |
| Cart completion | Track separately from INP | Fast | Slow async cart request | Developer | 05 (card) [dfde1d811af8] |

### 5.9 Caching and CDN

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Caching on | Document response headers | Cache hit header | None | P26 | 02 [55f9847e6f0a] |
| Compression on | Response headers | `content-encoding: gzip` or equivalent | None | P26 | 02 [55f9847e6f0a] |
| Cart, checkout, account | Load each; headers | Not cached | Cached | P26 step 4 | 04 [9490c0550ad4] |
| Stale prices or stock | Change a price; reload | Updates fast; rest stays cached | Old price; or full purge each change | P26 step 6 | 04, 08 [ee4655c50df6] |
| Static asset TTL | Headers on CSS, JS, images | Long, with versioned names | Short, or long without versioning | P26 step 3 | 04 [9490c0550ad4] |
| CDN hit rate | CDN dashboard | 80%+ | Low | P27 step 5 | 04 [46127ea01ca7] |
| Cache key fragmentation | CDN logs with UTM params | Tracking params ignored | Each UTM a new entry | P27 step 3 | 04 [46127ea01ca7] |
| Caching scripts on Shopify | Theme scan | None | "Speedy" or cache scripts | Remove after test | 01 [cdc61c33e699] |
| Session cookie on first hit | Response headers on anonymous load | No session until add to cart or login | Session created at once | P26 step 5 | 04 [9490c0550ad4] |

### 5.10 Hosting and server

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| TTFB per template | PSI | 800 ms or less | Over 800 ms after front-end work | P28 | 08 [a10a7445f2a3] |
| Tier vs orders | Orders per month vs plan | VPS or cloud at 100+ orders | Shared hosting with real traffic | P28 step 1 | 04 [a063ce857916] |
| PHP version | Ask host | 8.2+ | Older | P28 step 3 | 08 [0709d6cdeb98] |
| Server cache | Ask host | Redis or Varnish full-page cache | None | P28 step 3 | 08 [0709d6cdeb98] |
| Protocol | Ask host; DevTools protocol column | HTTP/3 | HTTP/1.1 | P28 step 3 | 08 [0709d6cdeb98] |
| Heavy plugin queries | Ask developer; staging test | Cached | Complex queries every load | P28 step 6 | 08 [3d795cd17d4b] |
| Database bloat (WP) | WP-Optimize report | Clean on schedule | Revisions, transients, orphans | P28 step 6 | 04 [74fc1378fc6a] |
| Peak capacity | Host or platform check before events | Limits known; load tested | Unknown | P31 | 03, 06 [54e3673579e3] [88659194131b] |

### 5.11 Video and embeds

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| YouTube embeds | Network before clicking play | Thumbnail only | Player JS at load | P24 | 03, 09 [badac5a4a278] |
| Mobile autoplay | Load on phone | Off; thumbnail and play button | Autoplays | P24 step 2 | 03 [badac5a4a278] |
| Video file weight | Network | Compressed; `preload="none"` | Multi-MB, preloading | P24 step 3 | 01 [3dd6497a4d63] |
| GIFs | Search for .gif | None; MP4 instead | Animated GIFs | P24 step 3 | 01 [5148a60eef22] |

### 5.12 Redirects and links

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Redirect types | Redirect list or crawl | 301s | 302s for permanent moves | P25 | 03 [2cd7ecfea589] |
| Chains | Crawl | None | Redirect to redirect | P25 | 03 |
| Broken asset links | Broken link checker | None | 404 on images, CSS, JS | P25 | 03 |
| 404 page | Visit a bad URL | Custom, links to top categories | Default | P25 step 4 | 03 |

### 5.13 Peak readiness

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Dynamic steps under load | Load test add to cart, search, login, checkout | Stable | Slowdowns (PetSmart 7.7 to 13.84 s) | P31 | 06 [88659194131b] |
| Change freeze | Calendar | No installs or theme changes in window | Changes during event | R8 | 04 [9ffe9f981c57] |
| Waiting room decision | Limited inventory drop? | Decided in advance | Crash or error page | P31 step 5; 05-SET | 06 |

### 5.14 Template: home page

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Hero (LCP) | Inspect first image | Eager, preloaded, under 200 KB, no effect, 1 hero or 2 to 3 static slides | Lazy, animated, multi-MB, 4 to 5 slides | P18, P23 step 4 | 01, 03, 04 |
| Section images | Content > Files; inspect | Under ceiling; sized to box | 3 to 6 MB section images | P15, P16 | 01 [3a99be49f292] |
| App widgets at load | Head async function; embeds | Only first-paint widgets | Chat, loyalty, social feed at load | P10 | 01 |
| Announcement bar | Watch throttled load | Theme's own, no shift | App bar injected after load | P20 step 3 | 01 [f00068c50316] |
| Below-fold sections | Network | Lazy | All eager | P17 | 01, 03 |
| Score and vitals | PSI both devices | Mobile over 50 (source 01 client target), LCP under 2.5 s, CLS under 0.1 | Under 20 | Whole playbook | 01, 04 |
| Traffic weight | Sessions by template | Effort proportional to traffic | Over-investing in a home page ads skip | R3 | 01, 04 |

### 5.15 Template: collection (category) page

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| First card eager, rest lazy | Inspect grid | Card 1 eager, others lazy | All lazy or all eager | P17 step 4 | 01 [b093ed3b4d75] |
| Thumbnails | Inspect intrinsic size | Thumbnail widths | Full-size photos | P16 step 6 | 04 [8883db1cfb1d] |
| Quick View | Network at load; click map | Removed or on click | Data pre-loaded for every tile | P23 step 3 | 03 [6f05e9392e74] |
| Filters respond | Tap filters on phone | Instant | Lag (INP) | R84 | 04 |
| Liquid loops | Code review | No full-collection crawls | Loops testing price or tag over all products | P23 step 2 | 03 |
| Mixed aspect ratios | Look at grid | 1 ratio | Messy heights (also CLS risk) | Crop to ratio (P14 step 2) | 01 [c371cc94a060] |
| Collection banner critical CSS | Trace first second, with and without banner | Styled | Unstyled then jump | P22 | 01 [cabcd2d4c66e] |
| App assets not used here | PSI unused CSS/JS | Only review and subscription widgets that render here | Rewards or checkout code | P11 | 01 |

### 5.16 Template: product page

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Main image (LCP) | Throttled load; inspect | Shows as soon as downloaded; eager; preloaded per product; under 250 KB | Hidden until carousel JS; lazy; multi-MB | P18 | 01, 05 [1b9747314efd] [eb9525bda54a] |
| Gallery thumbnails | Trace | Space reserved | Thumbnails push content (CLS) | P20 | 01 [80a761efcb18] |
| Payment and BNPL widgets | Trace | Reserved space; delayed if unused | Afterpay-type widget shifts layout | P20 step 2; P10e | 01 |
| Reviews, upsells, related | Network at load | Load after main image and buy box | Load before | P10, R53 | 01, 04, 09 |
| Add to cart response | Tap on phone | Instant | Half-second nothing | R84 | 04 |
| Variant images | Click swatches | Gallery switches | Missing variant images | P14 step 9 | 01 [c4e17c272dd9] |
| Dynamic checkout buttons | Under add to cart | Disabled if unused, or delayed | Heavy script at load | P10e | 01 |
| Buy box reach (neighbour 09-CRO) | Scroll heatmap | Most reach add to cart | 20% reach it | 09-CRO-testing | 01 [bf8e6e41254e] |
| Video | Network | Lite embed; no autoplay on mobile | Full player at load | P24 | 03 |
| Tracking events | Variant, add to cart | Fire once | Missing or doubled | R48 | 01 |

### 5.17 Template: cart

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Not cached | Headers | No cache | Cached user data | P26 step 4 | 04 [9490c0550ad4] |
| Cart drawer and add to cart after changes | Add, change quantity, remove | Works, instant | Broken or slow after defer, delay, cache | P30 step 4 | 01, 08 |
| Upsell and discount apps | Inventory | Earn their place; theme discount field used | App for a discount code box | P7 | 01 |
| Layout shift on update | Change quantity | Stable | Content jumps (a shopper selected 56 items in Google's example) | P20 | 05 [883371c7111c] |
| WooCommerce cart files elsewhere | Asset CleanUp | Only on cart | On landing pages | P13 step 4 | 02 |

### 5.18 Template: checkout

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Tested separately | Run the flow on a phone | Address, payment, fraud scripts fast | Slow; site scores never showed it | R25, P1 | 04 [a4ded81551ca] |
| Not cached | Headers | No cache | Cached | P26 step 4 | 04 |
| Mobile form steps | Count fields and steps | Wallet or express option on (Shop Pay on Shopify) | Long forms | R98 | 03 [0bc2087de2a1] |
| Injected content | Inspect | Reserved space | Shifts before tap | P20 | 05 |
| Under peak load | Load test | Stable | Brownout | P31 | 06 |
| Tracking | Test purchase | Purchase event once | Missing or doubled | R48; 06-MEA | 01 |

### 5.19 Mobile vs desktop

| Check | How | Good | Bad | Fix | Source |
|---|---|---|---|---|---|
| Both tabs tested | PSI mobile and desktop per template | Both recorded | Only 1 | P1 | 01, 09 [f00068c50316] [b35da7f37105] |
| Gap size | Compare scores | Mobile close to desktop | Mobile far worse (average 87.8% longer) | Mobile-first fixes | 06, 04 [2bb637e027c0] |
| Real device | Mid-range phone on mobile data | Matches lab | Emulation hid problems | P2 step 6 | 04 [a4ded81551ca] |
| Desktop-only CLS | Desktop tab | 0.1 or less | Large on desktop only | P19 | 01 |
| Desktop-only styles | Inspect media queries | Wrapped (min-width 767 px in 1 case) | Applied to mobile | P20 step 8 | 01 [dbf103b05b0a] |
| Mobile layout | Device toolbar | Text on screen, images intact | Overflow, distortion | Theme fix | 01 [58bc1e28be27] |
| Autoplay video | Phone | Off | On | P24 | 03 |

## 6. Thresholds and benchmarks

One table for the folder. Confidence = number of the 9 mini playbooks that state the value (agreeing sources / sources that speak to it). "1 (opinion)" means a single presenter's working number. Dated items carry `[web check]`. Current Core Web Vitals names are used: LCP, INP, CLS. FID and TTI are listed only as retired.

| Metric or rule | Value | Condition | Sources | Confidence | Notes |
|---|---|---|---|---|---|
| **Core Web Vitals** | | | | | |
| LCP good | 2.5 s or less | field and lab, 75th percentile | 04, 05, 07, 08 | 4 of 4 that give a number | [web check: web.dev/articles/vitals] |
| LCP needs improvement | 2.5 to 4 s | | 05 | 1 (Google band) | |
| LCP poor | over 4 s | | 04, 05, 07 | 3 of 3 | Source 01's "under 4" is the presenter's floor, not Google's good band [1b9747314efd] |
| INP good | 200 ms or less | field; replaced FID in March 2024 | 04, 05, 08 | 3 of 3 that name INP | 5 sources still name FID [web check] |
| INP needs improvement | 200 to 500 ms | | 05 | 1 | |
| INP poor | over 500 ms | | 05 | 1 | |
| CLS good | 0.1 or less | field and lab | 04, 05, 08, 01 (ideal) | 4 of 5 | Source 01 says "under 0.25, ideally 0.1 or 0" [80a761efcb18]; source 07 gives no number |
| CLS needs improvement | 0.1 to 0.25 | | 05 | 1 | |
| CLS poor | over 0.25 | | 05, 01 | 2 | |
| **Diagnostic metrics** | | | | | |
| TTFB | 800 ms or less; should not exceed 1.8 s | diagnostic, not a CWV | 05, 06, 08 | 3 of 3 | Source 08 lists it as a CWV; card corrects. Averages reported by 06: 1.286 s desktop, 2.594 s mobile. FID, FCP, Long task, TTI and Speed Index rows moved to Appendix A. |
| **Scores** | | | | | |
| PSI performance score bands | 90+ good; 50 to 89 needs improvement; under 50 poor | lab | 04, 05 | 2 of 2 | Coarse; CWV metrics are more stable (04 card) |
| Mobile score alarm | 20 or lower | many shoppers struggle to load | 01 | 1 (opinion) | [74187c8d7e19] |
| Mobile score working target | over 50 ("33 is not bad, over 50 is better") | client work | 01 | 1 (opinion) | [dca8734ae894] |
| Major sites' typical score | about 90 | quick Lighthouse runs | 07 | 1 (observation) | Not a target for image-heavy catalogs |
| Third-party services vs score | 0 to 5 services: median mobile 74; 21 to 30: median 44; r = -0.66 | 1,533 Shopify stores | 04 | 1 (vendor benchmark, method not given) | [c09e2fd0f0d7] |
| **Load time targets (conflict 7.3)** | | | | | |
| Page load target | 2 s or less | ecommerce page, attributed to Google | 03 | 1 | Dated attribution [web check] |
| Page load target | under 3 s; 2 s or less for competitive stores | "industry research" | 04 | 1 | |
| Page load target | 3 s ("Google recommended mobile") | mobile | 06 | 1 | Dated [web check] |
| Page load target | under 3 s | whole store, "Google says" | 01 | 1 (opinion) | |
| Shopper patience | leaves at 2 to 3 s; many at 3 to 4 s | mobile, from ads | 01 | 1 (opinion) | Unsourced |
| Expect load in 3 s or less | 83% of users | | 06 | 1 (uncited) | |
| Expect 2 s or less | 47% of shoppers | | 09 | 1 (uncited) | |
| Leave after 3 s | 53% of mobile visitors | | 04, 06, 09 | 3 of 3 | Same Google figure cited 3 times |
| Leave after 4 s | 63% | ecommerce | 04, 06 | 2 | Queue-it |
| Abandon at 5 s | 74% | mobile | 06 | 1 | |
| Leave at 6 s | 2 of 3 | | 06 | 1 | |
| **Conversion effects (conflicts 7.2, 7.9)** | | | | | |
| 0.1 s faster | up to +8.4% retail conversions; almost +10% spend per session; +9.1% add to basket | retail; upper bound | 03, 04, 06 | 3 of 3 | Deloitte via Google. 03 also writes "millisecond" in 2 places |
| 1 s delay | about -7% conversions | | 04 (Cloudflare), 08 ("up to") | 2 | |
| 100 ms delay | up to -7% conversions | | 09 (Akamai) | 1 | Same 7%, 10x different delay [web check: Akamai 2017 wording] |
| 1 s faster | +5.6% conversion; nearly -12% bounce | | 06 | 1 (uncited) | Mobile version: +5.9%, nearly -9% bounce |
| Per extra second | -0.3% conversion | average store | 03 | 1 (uncited) | |
| Per 2 s | about -4% conversions | | 04 (Cloudflare) | 1 | |
| 1 s site vs 5 s site | 2.5x conversions | | 03 (Portent) | 1 | Chart in 03 shows 3.05% at 1 s vs 1.68% at 2 s |
| Under 1 s vs 5 s | up to 3x | | 08 | 1 (uncited) | |
| 1 s vs 10 s | about 5x | | 04, 06 | 2 | 04 credits Cloudflare and Queue-it in different places |
| Highest conversion band | average 3.05% at 1 to 2 s | | 06 | 1 | |
| Bounce vs load | 9% at under 2 s vs 38% at 5 s; +32% from 1 to 3 s; +90% to 5 s; +123% to 10 s | | 06 | 1 (uncited, Google-style figures) | |
| Pages per visit | 8.9 at 2 s vs 3.3 at 8 s | | 06 | 1 | |
| CWV pass effect | users 24% less likely to abandon mid-load | | 03 | 1 (uncited) | |
| CWV pass rate | about 50% of mobile sites | HTTP Archive 2025 | 04 | 1 | |
| **Images (conflict 7.1)** | | | | | |
| Product image file size | under 100 KB | | 04 | 1 | Strictest |
| Hero image file size | under 200 KB | | 04 | 1 | |
| LCP image file size | below 250 KB | when LCP is an image | 05 | 1 (opinion) | |
| Image file ceiling | 500 KB max (prefer 100 to 200 KB) | Shopify images | 01 | 1 (opinion; 3 videos) | Strictest of source 01's own figures |
| Image file ceiling | 500 to 600 KB, never over 600 KB | before upload | 01 | 1 (opinion) | |
| Image file ceiling | under 1 MB ("1 MB is too much"); full HD JPEG under 1 MB | section and hero; mobile-majority | 01 | 1 (opinion) | Loosest |
| Max long edge | about 2,000 px; 3,000 overkill | uploads | 01 | 1 (opinion) | |
| Full-bleed hero width | up to about 3,000 px | full-bleed hero | 01 | 1 (opinion) | |
| Export size vs box | box + 100 to 300 px | section images | 01 | 1 (opinion) | Conflict 7.13 |
| Export size vs box | 2x rendered size | content images, retina | 02 | 1 (opinion) | |
| Export size vs box | resize to display dimensions | | 04 | 1 | |
| Image width for Google Discover | 1,200 px | eligibility, not speed | 05 | 1 | |
| JPEG quality | about 80% | product photos | 04 | 1 | |
| JPEG quality | about 70%; Squoosh from 75 down; 40 acceptable; 20 to 30 sometimes | photos | 01 | 1 (opinion) | |
| AVIF quality | 50% | | 02 | 1 (opinion) | |
| WebP vs JPEG | 25% to 35% smaller | equal quality | 04 | 1 | |
| WebP or AVIF vs JPEG or PNG | 30% to 50% smaller | | 08 | 1 (uncited) | |
| WebP conversion page weight | 40% to 60% less | "often" | 04 | 1 (author claim) | Different measure from the per-image figure |
| Image share of page weight | 50% to 75% | typical | 03 | 1 | 08 says "more than 60% of data" |
| Shopify built-in compression | 9.8 MB upload served at 6.1 MB | test store | 01 | 1 (demo) | |
| Compression savings | free sites 50% to 70%; app over 80%; second pass 8% | examples | 01 | 1 (demo) | |
| Pages that could save 250 KB or 1 MB by compression | 25% / 10% | | 06 | 1 | |
| Product images per product | 3 to 5 minimum | merchandising | 01 | 1 (opinion) | Neighbour 09-CRO |
| Hero slider | 2 to 3 slides max; 4 to 5 heavy | if required | 03 | 1 | |
| Lite embed | thumbnail about 15 KB; saves almost 1 MB | YouTube | 03 | 1 | |
| **Page weight and scripts** | | | | | |
| Page weight | 2 to 3 MB ("entire store"); "a page can have like 2 MB" | budget | 01 | 1 (opinion; 2 versions) | Conflict 7.19 |
| Third-party script cost | 34.1 ms each on average | | 06 | 1 | |
| Third-party share of load time | more than 50% | "in many stores" | 08 | 1 (uncited) | |
| App count warning | more than 20 apps | heuristic | 03 | 1 | |
| Industry third-party load | beauty median 31 services (worst of 9), automotive 15 (best) | Shopify | 04 | 1 | |
| Delay-snippet gain | 10 to 20%; 10 to 15%; 15 to 20% | apps are the bottleneck | 01 | 1 (3 versions) | Small when CLS or LCP dominate |
| Apps' cost on a demo store | about 20% of initial score | 4 apps | 01 | 1 (demo) | |
| Score decay | 60 to 80 new; 40 with apps; 20 or lower customized | illustration | 01 | 1 | |
| JS minification | up to 80% smaller | maximum | 04 | 1 | |
| Custom font variations | about 3 max | | 01 | 1 (opinion) | 07: fewest needed |
| **Testing** | | | | | |
| Runs per comparison | 3 (3 to 4 in 1 video) | averaged | 01, 02, 04 | 3 | |
| Wait before retest | 1 to 2 minutes | after a change | 01 | 1 | |
| CrUX field window | 28 days | PSI field data | 01, 04, 05 | 3 of 3 | |
| Search Console lag after fix | "a couple of days" to about 28 days | | 01 | 1 (2 cases) | |
| Shopify admin score refresh | 12 to 24 h, needs traffic | older admin UI | 01 | 1 | [web check] |
| Test cadence | at least monthly; after app or theme changes; before sales | | 04 | 1 | |
| Throttle profile | Slow 4G or 3G; custom about 20 kbps for CLS hunting | | 02, 01 | 2 | |
| **Caching, CDN, hosting** | | | | | |
| Static asset browser cache | up to 1 year | versioned file names | 04 | 1 | |
| CDN hit rate | 80%+ | | 04 | 1 | |
| CDN latency cut | 200 to 800 ms | distant visitors | 04 (Cloudflare) | 1 | |
| Hosting upgrade point | 100+ orders a month | to VPS or cloud | 04 | 1 (heuristic) | |
| Shared hosting price | $1 to $15 a month | 2026 | 04 | 1 | [web check] |
| Managed VPS price | from $20 to $50 a month | 2026 | 04 | 1 | [web check] |
| PHP version | 8.2+ | self-hosted PHP stores | 08 | 1 | [web check] |
| Protocol | HTTP/3 | | 08 | 1 | |
| Desktop-only breakpoint used | min-width 767 px | 1 client fix | 01 | 1 (case) | |
| **Mobile** | | | | | |
| Mobile share of traffic | 59% | | 06 | 1 | 03: m-commerce "10.4% of ecommerce by 2025" (dated) |
| Mobile revenue share | 66% | smartphones and tablets | 08 | 1 (uncited) | |
| Mobile load vs desktop | 87.8% longer | | 06 | 1 | |
| Average mobile load | around 15 s; top 100 sites 8.6 s; US retail 6.3 s; fully loaded 27.3 s | different measures | 06 | 1 (internal conflict) | |
| Retail pages per session | 5.01 desktop | | 06 | 1 | |
| PDP plus category share of views | 72% | | 06 | 1 | |
| **Vendor and case figures (examples only)** | | | | | |
| Shop Pay | 1.91x mobile checkout-to-order | vs regular checkout | 03 (Shopify) | 1 (vendor) | |
| Storefront Renderer | 2.5x to 5x faster server-side | | 03 (Shopify) | 1 (vendor) | |
| Rhone after SFR | revenue +15%, conversion +17%, page load -12% | vs prior month | 03 | 1 (vendor case) | |
| Vodafone | LCP -31%, sales +8% | A/B test | 04 | 1 (web.dev) | |
| Rakuten 24 | conversion +33%, revenue per visitor +53% | after CWV work | 04 | 1 (web.dev) | |
| WP Rocket demo page | 69 to 99 | 1 page | 05 | 1 (demo) | |
| Source 02 demo page | GTmetrix 98%, LCP 1 s, CLS 0 before caching | 1 landing page | 02 | 1 (demo) | |
| Source 01 client store | mobile 33 to 58, desktop to 93 | several changes together | 01 | 1 (case) | |
| PetSmart Black Friday | 7.7 to 13.84 s | | 06 | 1 | |

## 7. Where sources disagree

Each conflict: what each side says, when each is right, what the agent should do. Nothing here is averaged into section 3.

**7.1 Image file size ceilings.** Source 04: product images under 100 KB, hero under 200 KB. Source 05: LCP image below 250 KB. Source 01, across its videos: 500 KB max; 500 to 600 KB and never over 600; prefer 100 to 200 KB; under 1 MB for section images; a full HD JPEG under 1 MB is enough for mobile-majority stores. Source 04 writes for 2026 and modern formats; source 01's looser numbers come from JPEG-only advice on Shopify, where the platform recompresses. What the agent should do: set targets at 100 KB (product) and 200 KB (hero), a 250 KB cap on the LCP image, and treat 500 KB as the hard stop for any image on any template. Report which images exceed each line separately, so the owner can see the strict and the lenient view. [8883db1cfb1d] [eb9525bda54a] [21698bb77d52] [cfa3fe76f953] [3a99be49f292] [cce38d9369f2]

**7.2 The 7% figures.** Source 09 quotes Akamai: a 100 ms delay costs up to 7% conversion. Source 04 quotes Cloudflare: a 1 s delay costs about 7%. Source 08: a 1 s delay cuts conversion by up to 7% (no study named). Same percentage, 10x different delay. What the agent should do: never quote either in a client deliverable without checking the original study's wording [web check: Akamai 2017 "100 ms" study; Cloudflare source]. In the business case (P6) use a range and label it; prefer the brand's own before and after over any of them. [af5fd5b1745b] [41ce06260ce9] [f8bdb58727f9]

**7.3 Load-time targets.** Source 03: 2 s or less (attributed to Google). Source 04: under 3 s, 2 s for competitive stores. Source 06: 3 s is "Google's recommended mobile load time". Source 01: under 3 s, "Google says". The "Google target" attributions are old; Google's current public thresholds are per metric (LCP 2.5 s), not a page load time. What the agent should do: set targets on LCP, INP and CLS (section 6), and use "under 3 s on mobile, under 2 s where competitors are fast" only as a plain-language summary for owners, marked as a summary. [web check: current Google guidance] [b36e60f619f7] [b147e14a22ec] [d6ae849bc093]

**7.4 Order of work.** Four sequences. Source 04's ladder: images, third-party scripts, hosting and CDN, then code. Sources 02 and 08: fundamentals first, caching and server last; source 02 calls caching "a band-aid" and source 08 says the host will blame unoptimized content. Source 01 gives 3 orders of its own: the 7-step framework (apps, residual code, images, fonts, defer, non-critical CSS, lazy-load apps last); the client case (defer, lazy-load apps, then CLS, then LCP); and the LCP/CLS video (fix LCP and CLS first because they dominate the score and the app snippet helps little while they are large). When each is right: source 04's ladder is for self-hosted stores where hosting is a real lever; sources 02 and 08 are right that infrastructure work before content work wastes the host's time; source 01's LCP/CLS-first order is right on Shopify when the report shows a large CLS or LCP, and its apps-first order is right when blocking time dominates. What the agent should do: baseline (P1); then whichever of "images", "CLS/LCP" or "apps" the report shows as the biggest single cause (R2); then the other two; then fonts, CSS and code; then caching, CDN and host. On Shopify, skip the hosting step. Never call the host before images and scripts are done. [c35b62b83860] [1b50d0611dc3] [0709d6cdeb98] [cce38d9369f2] [dca8734ae894] [4e05290f17d5] [37d2f02ad647]

**7.5 What to optimize against: slow-4G visual test vs lab scores.** Source 02 says tool scores "are not the best way" to judge and ranks the slow-connection visual test first. Source 05 says optimize against lab data and let field follow. Source 01 uses PSI averages as the yardstick but hunts CLS on throttled 3G. When each is right: the visual test catches hidden-hero and jump problems scores miss and matches what shoppers feel; lab data is the only repeatable comparison and the only thing that maps to Google's report. What the agent should do: both, every time (R19). A page that looks broken on slow 4G fails even with a good score; a page with a bad score is not "fine" because it looks OK on office Wi-Fi. [29d73beaf348] [085b91000740] [a5d2c3aee970]

**7.6 AVIF vs WebP, and who converts.** Source 02: AVIF has "really good browser support" and is preferred at 50% quality; WebP is the acceptable alternative. Source 04: WebP is the default (25% to 35% smaller than JPEG, all modern browsers); AVIF compresses better but "support is narrower", so optional. Source 01: do not upload WebP to Shopify at all; upload JPEG and let Shopify convert. Source 08: WebP by default, AVIF named. When each is right: on WordPress you control the file and can pick AVIF with a fallback; on Shopify and Shopware the platform converts, so the upload format is JPEG or PNG. What the agent should do: platform converts where it can; where the agent controls delivery, AVIF with a WebP or JPEG fallback after checking current support. [web check: AVIF support; Shopify automatic WebP/AVIF delivery] [f50e2bf2a5c4] [8883db1cfb1d] [21698bb77d52] [baaf2f6aee4e]

**7.7 Tracking pixels: never delay vs test each integration.** Source 01 (transcript): never defer Facebook or Google pixels or Hotjar; keep them in the initial load because deferring can corrupt data. Cards [ef51a42e0e16] and [20821a7ae674] (editorial): not a universal rule; use Shopify's supported pixel integration (Web Pixels API and standard events) and verify each. Source 09's card: payment and fraud scripts may need to load early; check analytics fire after deferring. What the agent should do: leave pixels as they are by default; if a pixel is the blocking problem, move it to the platform's supported integration or delay it only after the event tests in R48 pass with consent on and off. Never change pixels and app scripts in the same batch. Pixel setup lives in 06-MEA. [15d23b16ff3c] [adc3ea59042a] [dc6cd41ae52d] [web check: Shopify Web Pixels guidance]

**7.8 Core Web Vitals as a ranking factor.** Source 08: official ranking factors; a slow store "will rank lower... even if its content or products are excellent". Source 09: an important ranking factor but not the only one. Sources 04 and 05: a tie-breaker between pages of similar quality; content depth drives rankings. Source 06 infers ranking from first-page results averaging 1.96 s (correlation). What the agent should do: describe CWV as a tie-breaker with a real effect on mobile-first indexing, never promise ranking gains, and let the shopper-experience case (bounce, conversion) carry the argument. [f8bdb58727f9] [04439b080448] [693051f7daf7] [0e0cdcf93746]

**7.9 Fast vs slow conversion multiples.** 1 s vs 5 s: 2.5x (source 03, Portent; its own chart shows 3.05% at 1 s vs 1.68% at 2 s, which is a different comparison). Under 1 s vs 5 s: up to 3x (source 08, uncited). 1 s vs 10 s: about 5x (sources 04 and 06; source 04 credits Cloudflare in the body and Queue-it in the summary). What the agent should do: quote at most 1 with its study name and comparison points; mark it as direction. [b36e60f619f7] [f8bdb58727f9] [41ce06260ce9] [fa57997432c4]

**7.10 Is the server the problem?** Source 08: poor TTFB means slow hosting or an overloaded database; front-end work can only do so much on a weak base. Source 05: poor FCP is usually the theme, plugins and page elements, not the web server. Source 04 lists slow server response among LCP causes. When each is right: on Shopify the server is not yours to fix and source 05's view applies; on shared WordPress hosting with a TTFB over 800 ms, source 08's applies. What the agent should do: read TTFB. Under 800 ms: front end only. Over 800 ms: still do the front end first (R4), then take the 4 questions to the host (R93). [a10a7445f2a3] [dfde1d811af8] [2969a152a99d]

**7.11 defer vs async.** Source 01: defer first, async fallback, defer is "more powerful". Source 03: either, and check the site still works; its card adds defer for scripts that need order, async for independent ones (not in the article). Source 05: plugin setting "Load JavaScript deferred" with exclusions. What the agent should do: R46's sequence (defer, then async, then leave it). For scripts that depend on each other keep defer so order holds. [1dffb0dd47d1] [e42f2f04f259] [8f0d567d9844]

**7.12 Speed apps and plugins.** Source 01: no magic app; speed apps help returning users at best; caching scripts on Shopify add nothing; some specialists game the score. Source 04 names Hyperspeed and TinyIMG for minification on Shopify and WP Rocket and Autoptimize on WordPress. Source 05 fixes TBT with WP Rocket settings (69 to 99 on 1 page). Source 02 refuses to teach a plugin and reaches 98% without one. When each is right: on WordPress a cache and optimization plugin is standard tooling and source 05's 1-setting-at-a-time loop makes it safe; on Shopify the platform already caches and minifies theme assets, so an app mostly adds scripts. What the agent should do: on Shopify, no speed app unless a specific measured gain justifies it; on WordPress, one optimization plugin, settings tested 1 at a time; on both, measure with the app's own scripts included. [web check: whether speed apps only help returning users] [5f44ccb5ead1] [cdc61c33e699] [c067983b290a] [8f0d567d9844] [1b50d0611dc3]

**7.13 How big to export an image.** Source 01: display box plus 100 to 300 px. Source 02: 2x the rendered size for retina. Source 04: resize to display dimensions. What the agent should do: 2x rendered width, capped at 2,000 px (R29); never below the box. Report intrinsic-to-rendered ratio so the owner can see the waste. [7558889b0856] [b783c30c2217] [8883db1cfb1d]

**7.14 App delay snippet gain.** Source 01 claims 10 to 20%, 10 to 15% and 15 to 20% in different videos, and also says it is "not as effective" while CLS or LCP are large. The presenter sells the snippet. What the agent should do: expect a blocking-time drop, measure it, and promise no percentage. [b7d4c6046a25] [dca8734ae894] [4e05290f17d5]

**7.15 Native lazy loading vs lazysizes.** Source 01 calls the lazysizes plugin "bulletproof" and slightly better than native `loading="lazy"`; every other source uses native. What the agent should do: native first; lazysizes only where native is proven not to work, and never on in-view images. [web check: lazysizes in current browsers] [3c9bddfb47c1] [51db910ccfc8]

**7.16 Tag manager "one request".** Source 03 says a tag manager "condenses all your tags into one JavaScript request"; the card correction says a container does not make vendor tags 1 request. What the agent should do: use a tag manager for inventory and kill switch, measure the waterfall. [78f603581ed4]

**7.17 Quick View heading vs body.** Source 03's heading says "Enable quick view"; its body argues to remove it. Follow the body (R61). [6f05e9392e74]

**7.18 CLS target.** Source 01: under 0.25, ideally 0.1 or 0. Sources 04, 05, 08: under 0.1. What the agent should do: 0.1 is the target; 0.25 is "poor", not acceptable. [80a761efcb18] [883371c7111c]

**7.19 Page weight budget.** Source 01: "the entire store around 2 or 3 MB" in one video, "a page can have like 2 MB, maybe a bit bigger" in another. No other source gives a total. What the agent should do: budget 2 MB per page as source 01's working figure; write the store's own budget in P29 and label it as chosen, not sourced. [621e302f651f] [3a99be49f292]

**7.20 Mobile average load times.** Source 06 gives "around 15 s" average mobile load, 8.6 s for the top 100 sites, 6.3 s for US retail and 27.3 s "fully loaded" on mobile, with no definitions. What the agent should do: do not quote any of these as "average"; use the store's own numbers. [2bb637e027c0] [4c4de77e3eae]

**7.21 Card vs transcript in source 01.** Card [fde546149035] names Yotpo as the uninstall example; the transcript's example is Loox. Card [867a3ac29ede] calls the cookie banner fix "a different property"; in context it is `defer`. Neither changes a rule; noted so the agent does not cite the wrong app or fix.

**7.22 Pop-up trigger sentence in source 03.** The text reads "display immediately upon page load, such as exit intent or time delay", which is garbled; the intent is not on load. Rule R68 follows the intent. [a459458a1b47]

## 8. Common mistakes

Merged and deduplicated. Each with the fix.

**Method**
- Changing things before recording a baseline and a change log. Fix: P1 (08, 01).
- Trusting 1 test run, or retesting right after a change. Fix: 3 runs, 1 to 2 minute wait, averages (01, 02, 04).
- Reading field and lab data as the same thing; reading Origin as the page's data. Fix: P3 (05).
- Testing only the home page, or only 1 template of a page type; trusting "vitals passed". Fix: R16 (01).
- Testing only on fast Wi-Fi or a developer machine; judging mobile by desktop; testing only 1 device tab. Fix: P2, R10 (01, 04, 06).
- Testing without confirming the tool saw the new version. Fix: P4 (05).
- Chasing 100 or a CWV pass at the cost of content and journey; stripping UI that sells. Fix: R6, R11 (05, 03, 02).
- Turning on several JS settings or removing several scripts at once. Fix: R26 (05, 01).
- Treating a cache-disabled test as the typical visitor. Fix: also run the cached repeat view (02).
- Working from PSI's list in order instead of the biggest lever. Fix: R23 (05).
- Quoting a source's case or example as the store's forecast. Fix: P6, P30 (all).

**Images**
- Uploading camera, DSLR or design-tool originals; believing higher resolution always looks better. Fix: P14 (01, 04).
- Believing "Shopify optimizes images automatically" is enough. Fix: R28 (01).
- Exporting photos as PNG (Canva banners), using animated GIFs, hand-uploading WebP to Shopify. Fix: R32 (01).
- Lazy-loading the hero, logo, first slide, main product image or first card; or making everything eager; or preloading too many assets. Fix: P17, P18 (01, 02, 04, 07).
- Leaving a logo or hero on a plugin's default lazy setting. Fix: explicit eager (02).
- Fade-in, slide-in, preloader or placeholder on in-view images; main image trapped in a carousel plugin. Fix: P18 (01).
- Images without width and height. Fix: P20 step 1 (01, 02, 05, 07).
- Compressing the same image several times; exporting at raw rendered size (soft on retina). Fix: R33, R30 (04, 02).
- Batch cropping; mixed aspect ratios in one grid. Fix: P14 step 2 (01).
- Uploading the same image twice instead of Replace; empty `src`; 4 to 5 slide auto-rotating sliders; standard YouTube embeds; mobile autoplay. Fix: R40, R41, P24 (01, 03).
- Bulk compressor run and assumed complete while section images stay at 5 MB. Fix: P15 (01).
- Overwriting alt text when pasting builder settings; ad copy in alt text. Fix: R40 (02, 01).

**Apps, scripts and third parties**
- Keeping trial, unused or purely visual apps; using an app for a theme feature (announcement bar, discount code). Fix: P7 (01, 03, 08).
- Deactivating instead of deleting a plugin. Fix: R7 (08).
- Assuming uninstalling removes the code. Fix: P8 (01, 03).
- Installing apps without a before and after test; ignoring reviews about speed. Fix: R45 (04, 01).
- Pasting scripts straight into `<head>` without defer or async. Fix: P9 (03, 01).
- Adding defer or async to a script without knowing what it does; not testing the feature after. Fix: R46 (01).
- Commenting out `content_for_header` on a live theme. Fix: R52 (01).
- Loading jQuery or other libraries from outside CDNs; removing jQuery for logged-in WordPress users. Fix: P12, P13 (01, 02).
- Forgetting what you unloaded, then adding a cart feature that needs it. Fix: write it down (02).
- Deferring or delaying pixels, consent banners or payment scripts without testing events and consent rules. Fix: R48, R76 (01, 09).
- Buying speed apps, caching scripts or "specialists" that game the score. Fix: R55 (01).
- Believing a tag manager makes all tags 1 request. Fix: R54 (03).
- Line-by-line edits to app code you do not own after a "reduce unused JavaScript" flag. Fix: remove, delay or load conditionally (01).

**Theme, CSS, fonts**
- Picking a theme for "bells and whistles"; rushing a Dawn to Horizon migration; relying on hacks instead of theme architecture. Fix: R13, P32 (01, 03).
- Hardcoding asset URLs inside CSS so the CDN serves old files. Fix: P23 step 1 (03).
- Running the same Liquid loop several times; Quick View that pre-loads the whole grid. Fix: P23 (03).
- Applying the media=print trick to visible CSS; lazy-loading theme CSS with incomplete critical CSS. Fix: P22 (01).
- Contradicting CSS rules; late inline styles in the body; desktop styles applied to mobile. Fix: P20 (01).
- Missing `font-display: swap`; 5 to 10 font variations; fonts from Google's servers; swap without matched fallback metrics. Fix: P21 (01, 02, 04).
- Themes loading every feature on every page. Fix: R49, R62 (08, 04).
- Running JavaScript before the main image can display; single-page app rendering that waits on JS. Fix: R66 (07).

**Caching, CDN, hosting**
- Relying on caching, compression or CDN before fixing heavy images and extra assets. Fix: R91 (02, 08, 09).
- Reading `cache-control` as proof of caching. Fix: P26 step 1 (02).
- Caching cart, checkout or account pages; caching so hard that prices and stock go stale, or so little that nothing is gained; full purge on every change. Fix: P26 (04, 08).
- Tracking parameters in CDN cache keys. Fix: P27 step 3 (04).
- Calling the host before fixing images and plugins; blaming the server for FCP before checking theme and plugins. Fix: R93, 7.10 (08, 05).
- Ignoring database bloat and uncached heavy plugin queries on WooCommerce. Fix: P28 step 6 (04, 08).
- Assuming high traffic only causes crashes; slowdowns in cart, search and login are more common. Fix: P31 (06).
- No performance budget; adding features and animations without a speed review. Fix: P29 (04, 06).

## 9. Deliverables

| Task | Deliverable | Format |
|---|---|---|
| First audit | Speed audit report: baseline table (per template, mobile and desktop, 3-run averages, LCP element, CLS source), slow-connection observations, top 3 causes ranked by expected effect, the fix list in order with owner (agent, developer, host), budget proposal, what needs brand data or a web check | Markdown; tables; PSI report links attached; dated |
| Speed revenue model | Revenue model from brand inputs with assumptions labelled, plus 1 to 3 named benchmarks marked as direction | Markdown or sheet; arithmetic in code |
| Image audit | List of images over each ceiling (100, 200, 250, 500 KB) per template, intrinsic vs rendered ratio, format, lazy or eager, dimensions present; fix per image; theme sections lacking responsive widths | Table; before and after weights |
| App and script audit | Inventory with revenue role, route to page (async function, hardcoded, embed), load decision (keep, template-only, delay, remove), residual code found, duplicate pixels | Table; change log entries |
| Developer brief | Per item: page, element, measured before state, target, the rule (R number), the procedure (P number), acceptance test, rollback | Markdown; 1 brief per fix or batch |
| Host brief | TTFB per template, headers seen, the 4 questions (PHP, Redis or Varnish, full-page cache, HTTP/3), peak-event dates and expected load | Short email or ticket text |
| Fix proof | Change log entry: date, page, device, tool, before and after averages, other changes in the batch, function tests passed, event tests passed, freshness confirmed, field check date | Table row plus notes |
| Monitoring setup | Cadence, tool, budget values, alert thresholds, re-check dates (28 days after each fix) | Markdown or config |
| Peak readiness note | At-risk steps, capacity confirmation, load test result, freeze window, fallback decision per step | Markdown |
| Client page copy | Plain English summary: what was slow, what changed, what shoppers will notice, what is next; no tool names the client does not know, no GPT or .env mentions | Short text, digits, no em dashes |

## 10. What needs live data or a web check

**Brand data (from brand record, data layer or owner)**
- Installed apps, plugins, app embeds and external scripts, and the revenue role of each (R7, P7). [01, 03, 08]
- Which widgets must show at first paint (R47, P10). [01]
- Pixel, tag manager and consent setup; consent rules by market (R48, R76). [01]
- Paid vs organic share of sessions (R5). [01]
- Pages ads land on (R3). [01]
- Mobile share of sessions and revenue (R10). [01, 09]
- Sessions and revenue by template; page views by template (R3). [04, 06]
- AOV, daily sessions, conversion rate, margin, current average load time (P6). [03, 04, 06]
- Monthly orders, AOV, cart abandonment rate (hosting tier, R92). [04]
- Visitor connection and device mix (throttle profile, P2). [02]
- Theme name, version, who built it, customization history (R28, R34). [01]
- Baseline PSI averages per template (P1). [01]
- Dynamic checkout button usage (R56). [01]
- Quick View click usage; scroll heatmaps (R61; neighbour 09-CRO). [03, 01]
- Conversion rate by load time, if analytics can segment it (P6). [03]

**Web checks (dated or platform-dependent claims)**
- Current Core Web Vitals list and thresholds (LCP, INP, CLS; FID retired; TTI dropped) at web.dev/articles/vitals. [05, 06, 07, 08, 09, 03, 01]
- Current INP thresholds specifically. [07, 05]
- Current Google guidance on load-time targets (the "2 s" and "3 s" attributions). [03, 06]
- Whether Shopify still serves WebP and AVIF automatically, and whether hand-uploaded WebP is still a problem. [01]
- Current AVIF browser support. [02, 04]
- Whether Shopify admin still shows a composite speed score, and how its web performance report is calculated. [01]
- Current Shopify Web Pixels API guidance. [01]
- Current state of Dawn updates and Horizon version; Horizon release date. [01]
- Whether speed-optimization apps "only work for returning users". [01]
- The "8-second attention span", 50 ms and 0.1 s first-impression figures. [01, 03]
- Original studies behind every figure in source 06 before quoting to a client. [06]
- Akamai "100 ms = 7%" wording; Cloudflare "1 s = 7%" source. [09, 04]
- Behaviour of the media=print onload trick and lazysizes in current browsers. [01]
- `fetchpriority` and preload syntax and support. [07]
- Web Vitals Chrome extension features; whether Chrome moved them into DevTools. [07]
- Unlighthouse flags and SDK. [07]
- GTmetrix engine (Lighthouse, not YSlow) and plan limits. [03, 04]
- Moved to Appendix A: the AMP web-check note. [03]
- Whether Hyperspeed, TinyIMG, Tiny SEO Speed and Image Optimizer, SEOAnt, ShortPixel, Imagify are still listed. [04, 01, 02]
- CDN plans and prices (Cloudflare, Fastly, Akamai, CloudFront, BunnyCDN). [04]
- Hosting prices (shared $1 to $15, VPS $20 to $50) and current PHP and HTTP/3 recommendations. [04, 08]
- Monitoring tool prices (DebugBear, SpeedCurve, Calibre). [04]
- Shopify URL filters and image size parameter syntax. [03]
- WordPress hook name `wp_enqueue_scripts` and the dequeue pattern. [02]

## 11. Freshness and stale-risk notes

| Rule or procedure | Depends on | Re-verify |
|---|---|---|
| R18, section 6 CWV rows | Google's metric list and thresholds | Every audit (quick) and at every Google announcement; 5 of 9 sources already use retired metrics |
| P1, P3, P4 (PSI layout: hover hint, Diagnostics, URL/Origin, copy link) | PageSpeed Insights UI | Every 3 months |
| P1 step 11, P19 step 3 (Lighthouse panel, View Original Trace) | Chrome DevTools UI | Every 3 months |
| P2 (throttling profiles, device toolbar) | Chrome DevTools UI | Every 6 months |
| R27, P30 step 5 (Shopify admin speed score, web performance report) | Shopify admin | Every 3 months; already changed once in source 01's span |
| P7 step 6, P10c (App embeds toggle) | Shopify Customize UI | Every 3 months |
| P8 (Edit code search, editor defer warnings, Download theme file) | Shopify code editor | Every 3 months |
| P10 (content_for_header structure, async load function) | Shopify platform internals | Every 3 months and after any Shopify platform update; undocumented behaviour, high stale risk |
| R32, 7.6 (Shopify WebP and AVIF delivery; hand-uploaded WebP) | Shopify image CDN behaviour | Every 6 months |
| R48, 7.7 (Web Pixels API) | Shopify pixel platform | Every 6 months, with 06-MEA |
| P32 (Dawn and Horizon versions, 23 free themes) | Shopify theme store | Every 6 months |
| P13 (Oxygen settings, Asset CleanUp metabox, WP Rocket tabs and setting names) | Plugin UIs | Every 6 months and at major plugin versions |
| P21 step 3 (Google Web Fonts Helper, Font Squirrel) | Third-party tools | Yearly |
| R39, R55, 7.12 (named apps: Tiny SEO, SEOAnt, TinyIMG, Hyperspeed, ShortPixel, Imagify) | App store listings and prices | Every 6 months |
| R90, R92, P27, P28 (CDN and hosting prices, PHP 8.2+, HTTP/3) | Vendor pricing and platform versions | Every 6 months; prices are 2026 figures |
| P29 (PSI API, GTmetrix monitoring, Lighthouse CI, DebugBear, SpeedCurve, Calibre) | Tool plans | Yearly |
| P5 (Unlighthouse command and flags) | Open-source tool | Every 6 months |
| P18 step 2 (Web Vitals extension) | Chrome extension and DevTools | Every 6 months |
| R37, P18 step 7 (fetchpriority, preload) | Browser support | Yearly |
| R63, P17 step 7 (media=print trick, lazysizes) | Browser behaviour | Yearly |
| R97, P25 (Shopify Navigation redirects) | Shopify admin | Yearly |
| R98 (Shop Pay availability and vendor figure) | Shopify | Yearly |
| Section 6 conversion and behaviour statistics | Third-party studies, several undated | Before every client use; treat as direction only |
| Ecomhint 1,533-store benchmark (R7, R57) | Vendor dataset, method unpublished | Check for a newer edition yearly |

## 11b. Test learnings log

Entries here come from ecomOS runs of this playbook, not from the library. Each names the test and the rules or procedures it changed.

- 2026-09-24, Gehna speed audit, blind A/B against a general prompt (`reviews/speed-test/`). Added P1 steps 12 and 13, R59 to R61, 2 rows in 5.3, 1 row in 5.5, 1 row in the section 0 table. Findings: the playbook did not improve the diagnosis (both arms found the same problems with the same instrument) but it made the output operable (thresholds, rollbacks, sequencing, budget, business case). It cost one finding (Rocket Loader) because checklist coverage crowded out following the evidence; R59 fixes that. Both arms mis-measured third-party bytes; P1 step 13 fixes that. Shopify-only procedures needed on-the-fly adaptation for a Next.js store; R60 gives the equivalents.
- 24 Sep 2026: ecommerce specificity pass applied from ECOM_REVIEW.md; priority block added, 15 rules reworded, 6 levers added, about 500 words moved to Appendix A.

## 12. Source index

| No. | Title | Type | Credibility and bias | What it contributed most |
|---|---|---|---|---|
| 01 | Page speed (Shopify speed optimization video compilation) | Transcript, about 19 YouTube videos, 59,341 words, 129 cards | One freelance Shopify developer (Christian). Sells a speed course, paid delay snippets, a done-for-you service and a community; affiliate links to Tiny SEO and SEOAnt. Evidence: live demos on demo and client stores, single-store PSI runs, several changes made together. No conversion or revenue data. Metric names dated (no INP); videos span years so UI steps differ. Strongest numeric claims promote his own products. | Nearly all Shopify mechanics: 3 routes app scripts take, content_for_header override method, per-app delay, residual code search, defer-then-async loop, image pipeline and Shopify image behaviour, responsive width check, first-item-eager loop logic, CLS hunting (filmstrip, trace, throttling, body styles, critical CSS), LCP hidden by carousel, fonts, media=print trick, testing protocol (3 runs, wait, duplicate theme), theme choice and benchmark method. Also the widest spread of image ceilings (7.1). |
| 02 | WordPress Speed Optimization (step-by-step) | Transcript, YouTube tutorial, 6,521 words, 17 cards | Presenter Elijah; builds with Oxygen and hosts on Cloudways (promotional context). Evidence: 1 image-heavy landing page, before and after in PSI, GTmetrix, Gift of Speed and a slow-4G visual test. No client data. No date; AVIF praised. | Slow-4G visual test as the primary judgment; explicit eager on in-view images; width and height from rendered size; 2x rendered export; AVIF at 50%; waterfall asset audit; unloading WordPress bloat, jQuery (logged-out only) and WooCommerce files per page; local WOFF2 fonts; verifying cache and compression from headers; fundamentals before caching (98% with no cache). |
| 03 | Website Speed Optimization Tips for Shopify Stores | Article, Shopify Plus blog, 5,767 words, 15 cards | Vendor (Shopify). Sells Shopify Plus, Storefront Renderer, Shop Pay, Plus Partners. Evidence: third-party studies (Deloitte, Portent), Shopify-reported numbers, merchant cases and agency quotes. Dated in places (AMP, "first meaningful paint", CWV described wrongly). | Business case framing and benchmarks; more than 20 apps warning; asset_url and CDN versioning; Liquid loop clean-up; Quick View removal; slider and pop-up rules; lite embeds and mobile autoplay; redirects and 404; tag manager caveat; checkout in scope; peak capacity planning; the 3 test tools and why scores do not compare. |
| 04 | Ecommerce Site Speed Optimization: Complete Guide for 2026 | Article, Ecomhint, 5,492 words, 17 cards | Jakub Rusniok, sells speed and conversion audits ("Run Free Audit" 3 times). Evidence: cited research (Google, Cloudflare, HTTP Archive, web.dev cases) plus a 1,533-store Shopify benchmark with no method shown. Published March 2026; uses INP. The most current source. | Current CWV thresholds and INP; PSI score bands; priority ladder (images, scripts, hosting, code); image size targets (100 KB, 200 KB) and JPEG 80%; third-party count correlation and industry medians; caching rules (never cache cart, checkout, account; 1-year static; short TTL for prices); CDN configuration and 80% hit rate; hosting tiers by orders; testing toolchain; monitoring and performance budget; page priority by traffic. |
| 05 | Google PageSpeed Insights: Step-by-Step Tutorial | Transcript, YouTube, 4,649 words, 10 cards | Jack from Rank Math (WordPress SEO plugin vendor); uses WP Rocket (paid) for fixes. Evidence: walkthrough of PSI plus 1 before and after (69 to 99). Around 2024: INP present, FID still shown. | How to read PSI (field vs lab, URL vs Origin, hover hint, LCP element, score bands); Good / Needs improvement / Poor bands for LCP, INP, CLS, FCP, TTFB; freshness marker trick; 1-setting-at-a-time plugin loop for TBT; reserved space for injected content; 250 KB LCP image guidance; sharing a frozen report. |
| 06 | 93 Powerful Statistics That Show Why Your Ecommerce Site Speed Matters in 2026 | Article, statistics roundup, 2,446 words, 10 cards | Queue-it, sells virtual waiting rooms; last section supports its product. 93 figures with no study names, years or samples; several dated (FID, AMP, "3 s Google recommendation"). | Business-case numbers (patience, bounce, conversion, pages per visit), revenue model template, PDP and category 72% of views, mobile vs desktop gap, 34.1 ms per third-party script, brownout risk at peak. All as direction only. |
| 07 | The Ultimate Guide to Web Performance | Transcript, YouTube (Fireship), 1,993 words, 9 cards | Developer education channel; sells a Pro membership. Aimed at developers, not stores. Evidence: definitions, a Web Vitals extension demo, quick Unlighthouse runs. Dated (FID). | Waterfall bottleneck reading; Web Vitals extension for the exact LCP and CLS elements; preload and fetchpriority; aspect-ratio and srcset for CLS; render-blocking JS before the main image; SSR vs SPA; Partytown; Unlighthouse site-wide audits; "scores are for triage". |
| 08 | Page Speed Guide for Ecommerce Store Operators: Diagnosis and Actions | Article, Shopware point of view, 1,815 words, 9 cards | Platform vendor; closing section promotes Shopware 6 features. Evidence: unnamed benchmarks (7% per second, 3x, 66% mobile revenue). States INP replaced FID in March 2024. | The 4-step operator roadmap (baseline, images, extension audit, server); the rule to call the host only after steps 1 to 3 and the 4 questions to ask (PHP 8.2+, Redis or Varnish, full-page cache, HTTP/3); delete not deactivate; dated change log; intelligent cache invalidation; TTFB under 800 ms as diagnostic. |
| 09 | Page Speed Optimization: How to Improve the Loading Time of Your Online Shop | Article, unnamed European platform vendor, 1,770 words, 10 cards | Vendor blog with a lead-magnet plug; vendor unnamed. Evidence: 1 named study (Akamai) plus uncited surveys. Old metric model (TTI, TBT misdefined; no INP or CLS). | Architecture levers: SSR vs CSR and hybrid, CDN for static files, browser and server caching, APIs with field selection; load third-party integrations after product images and information; lite embeds; measure on both devices and cross-check with a second tool; the Akamai 100 ms = 7% figure (conflict 7.2). |

**Credibility summary.** 5 of 9 sources sell something in the domain (01 snippets and services, 03 Shopify Plus, 04 audits, 06 waiting rooms, 08 Shopware; 05 and 07 sell adjacent products; 09 is an unnamed vendor). Only source 04 uses current metric names throughout. No source has controlled conversion tests of its own; every conversion figure is third-party or vendor-reported. The strongest agreement across sources is on 4 things: images first, every third-party script must earn its place, never lazy-load in-view images, and reserve space for anything that arrives late. Treat single-source numbers as working rules, not laws.

**Neighbour folders and what lives there.**
- 15-SEO-search: keywords, titles, descriptions, H1s, URL handles, sitemaps, rich snippets, blogs, backlinks, alt text and file names as SEO (source 01 sections 3.20 and 3.32).
- 09-CRO-testing: product page layout, buy button reach, promo copy, image set and gallery order, Quick View usage as a UX question (source 01 sections 3.21 and 3.31; source 03 Quick View).
- 07-LPG-landing-pages: ad landing page structure; this playbook only sets its speed targets.
- 06-MEA-measurement: pixel, Web Pixels API, CAPI, tag manager and consent setup; event testing method.
- 05-SET-store-setup: theme selection and migration as a project, media library setup, domains, headless and Commerce Components, infrastructure, load balancers, waiting rooms.
- 12-GAD: Google Ads landing page requirements.

## Appendix A. General background

Moved here on 24 Sep 2026 during the ecommerce specificity pass (ECOM_REVIEW.md). This is platform and metric history with no store framing. Nothing here is an active rule; use section 3, 5 or 6 for the current bands.

**From section 6, Diagnostic metrics and Core Web Vitals rows.**

| Metric or rule | Value | Condition | Sources | Confidence | Notes |
|---|---|---|---|---|---|
| FID (retired) | good 100 ms or less; poor over 300 ms | replaced by INP | 05, 06, 07 | 3 (all dated) | Do not report FID [web check] |
| FCP | good under 1.8 s; 1.8 to 3 s needs improvement; poor over 3 s | diagnostic | 05, 06 | 2 of 2 | |
| Long task | over 50 ms blocks the main thread | TBT adds them up | 05 | 1 | Source 09's TBT definition (FCP to TTI) is outdated |
| TTI (retired) | no threshold | dropped from Lighthouse | 09 | 1 (dated) | [web check] |
| Speed Index | defined only, no threshold | | 05 | 1 | |

**From section 6, an uncited survey figure not tied to a store action.**

| Metric or rule | Value | Condition | Sources | Confidence | Notes |
|---|---|---|---|---|---|
| Marketers prioritizing speed | 3% top priority; 81% know it matters but do not prioritize | survey | 06 | 1 (uncited) | |

**From R21 (section 3, Group B), tool-feature documentation.** GTmetrix: waterfall, Top Issues tab, other test locations with a free account. WebPageTest: filmstrip and connection view, best for chasing 1 specific problem. Pingdom: waterfall. None of this changes which tool to use or when; R21 keeps the decision rule.

**From section 10, a dated web-check note.** Whether AMP and the named AMP apps (AMP, Fire AMP, The AMP App) still exist or are worth using. [03]
