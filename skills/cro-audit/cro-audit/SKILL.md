---
name: cro-audit
description: Use when a user wants a CRO (conversion rate optimization) audit of a D2C storefront or of 1 landing page. Triggered by "cro audit", "audit this store", "audit this page", "run a cro audit", "/cro-audit". Walks each page on a phone as a buyer would, in the order a buyer needs things, writes findings as test hypotheses, sizes them in money only when the store's own numbers are supplied, and can package them into a client-branded deck with real BEFORE screenshots and mocked-up AFTERs. Works from the page alone when there is no analytics access. Checkpoints after every phase.
user-invocable: true
argument-hint: "[brand site URL, or path to the brand-brain folder]"
---

# CRO audit: a live storefront, judged as a buyer on a phone

Works for any D2C brand and any kind of product. 5 phases, numbered 0 to 4. What it makes: phone screenshots of the live store, `AUDIT-FINDINGS.md`, and, when asked for, a deck branded to the client with real annotated BEFORE screenshots and mocked-up AFTERs.

**What an audit is judged on:** each finding names the first thing a buyer needed on that page and did not get, says what to change, and is something the owner of this brand would act on. Not how many findings there are.

**Keep each phase inspectable and report meaningful progress. In the CRO app, an audit stops for the user to accept/reject findings, select a direction and explicitly approve the build scope. Generate only from that current saved approval; do not require a second approval after each section. Outside that app workflow, follow the user’s actual authorization rather than adding new checkpoints.**

The existing Landing pages checklist audit (`src/lib/landing/audit.ts`) remains a deterministic signal, not a full visual audit. The CRO workspace's application contract is `skills/landing-pages/app-contract.md`: capture actual desktop/mobile evidence, diagnose, plan, build editable sections, inspect their renders and validate exports. `src/lib/landing/knowledge.ts` retrieves existing detailed methods with provenance and caveats for model steps. A skill being present on disk does not prove that a workflow implements every check.

Reference files: `reference/shopify-data-request.md` (what to ask the store for, and what each number adds), `reference/capture.js` (a headless-browser capture template), `reference/figma-deck-playbook.md` (deck spec for Figma Slides), `reference/after-image-pipeline.md` (BEFORE and AFTER images, prompt templates).

## How a page is judged

**On a phone first.** Every page is opened at a phone width before anything else. Desktop is looked at only for a finding that is particular to desktop.

**In the order a buyer needs things.** Walk the page from the top and stop at the first need it does not meet. That is the page's first finding; what comes after it matters less until it is fixed.

1. Is this the thing the ad showed me? (The same promise, words, offer and picture as the ad that sends traffic here. Ask for the ads, or read the brand's `winning-ads.md`.)
2. What is it, and what does it do for me?
3. Why this one, and not what I use now?
4. Do I believe it? (Proof that matches the claim, from real customers or a named source.)
5. What exactly do I get, and what does it cost in full?
6. Will it work for me?
7. What if it does not, and when does it arrive? Then 1 clear button.

**By kind of product.** Need 6 and need 7 mean different things:

| | Bought again (a serum, a snack, coffee) | Bought once (a pan, a jacket, luggage) |
|---|---|---|
| Will it work for me | Taste or feel, what is in it, how to use it, how long a pack lasts, when to expect a change | Size and fit, dimensions, materials, what it works with, care, how long it lasts |
| What if it does not | Guarantee, pause or cancel | Returns (window, who pays), warranty, repairs |
| The offer to look for | Starter pack, bundle, subscribe with the saving in money, price per day | 1 clear price, what is in the box, the set that completes it, instalments, delivery date |
| What to measure | First order, then reorder rate and subscription churn | First order, return rate, time from first visit to purchase |

A finding that only fits the other kind of product is cut (a price per day on a jacket; a size guide on a snack).

## Hard gates (G1 to G9): read all before starting

**G1. Numbers are real or absent.** Every figure in the audit is 1 of 3 things: the brand's own number (from the data request), a published figure with its source named, or a rule of thumb marked "rule of thumb". Nothing is invented, estimated silently, or carried over from another brand. The audit runs in 1 of 2 modes and says which on its first page:

- **Sized.** The store's analytics were supplied (`reference/shopify-data-request.md`). Leaks and opportunities are sized in money, with the sum shown and the assumption stated.
- **Page-only.** No analytics access. The audit is done from the pages alone: findings are ranked by impact x confidence x ease and none is given a money value or a predicted lift. The findings file lists what the numbers would add (which leak is biggest, phone against desktop, where the funnel drops, whether a change worked).

Ask for the data once. If it does not come, run page-only; do not block.

**G2. The CRO knowledge base loads first.** Use the brand's `cro-brain.md` if the brand brain has one; otherwise read `skills/cro-brain/cro-brain/reference/cro-brain-master.md` directly. Tie each finding to a principle in it.

**G3. No long dashes** in any deck copy, callout, hypothesis, or client-facing text. Use commas, periods, or parentheses.

**G4. A deck file is edit-only after creation.** Never delete or recreate it. The playbook has the tool's own traps.

**G5. The owner test on every recommendation:** "Would the owner of this brand, at its size and for this kind of product, act on this in the next month?" If not, cut it. A store doing 200 orders a month is not told to run A/B tests it cannot power.

**G6. Save evidence after every phase.** Show the output and make it revisable. The app uses saved stage outputs and one explicit audit-to-build approval, not a compulsory chat gate after every phase. Accepted finding notes and selected scope govern generation; rejected recommendations must not reappear through later design prompts.

**G7. Surface coverage: all 8.** Every whole-store audit covers:
   1. Home page
   2. Navigation menu
   3. Collection page
   4. Product pages
   5. Landing pages (advertorial, reasons-why page)
   6. FAQ, About, story pages
   7. Cart
   8. Checkout

   For each surface write up to 3 test suggestions that pull different levers, each with its own mock-up. At least 1; never pad to reach 3: a surface that is already good is said to be good. If a surface does not exist (no landing page, no story page), say so and propose what to build there. Never silently skip a surface. A quiz and a post-purchase offer are added when the store has them. An audit of 1 page covers that page only.

**G8. BEFORE images are real phone screenshots, every one.**
   - Each BEFORE is a screenshot from Phase 1 of the exact section the test is about, showing the site as it is today.
   - Never generate, redraw or edit a BEFORE. Image generation is for AFTER mock-ups only.
   - Preserve full-page mobile and desktop captures. For deck slides, use 9:16 phone crops with the whole section in frame; a taller section needs several frames. A deck crop does not constrain the page's aspect ratio.
   - A section that cannot be captured (behind payment) leaves the slot empty, labelled "live screenshot pending".

**G9. An AFTER never shows invented proof.** Every rating, review count, customer count, press logo, badge, guarantee, price and offer in a mock-up is the brand's own, from the brand brain. Where the brand has none, the mock-up shows a grey box labelled with what would go there ("review count here"). A mock-up is a drawing of a layout, and is labelled "mock-up" on the slide.

---

## Phase 0: setup and inputs

**0.1 Locate the brand brain.** In order: a path argument; a `brand-brain/` folder in the working directory; a folder 1 level down holding `brand-guidelines.md` and `brain.md`. If none, ask. Read what "What this reads from the brand brain" lists.

**0.2 Get the live URL** and any gate on it (an age check, a region picker, a cookie banner, a sign-up pop-up).

**0.3 Ask for the store's numbers** with the message in `reference/shopify-data-request.md`. On receipt, save them word for word to `{brand-brain}/shopify-funnel-data.md` with the derived figures. A missing figure is marked as a gap. If nothing arrives, the audit is page-only (G1).

**0.4 Ask which ads send traffic to which pages.** Need 1 cannot be judged without them. If none are supplied, say so in the findings.

**0.5 CHECKPOINT.** Brand brain found, knowledge base loaded, URL confirmed, mode stated (sized or page-only).

---

## Phase 1: capture the storefront

Use a headless browser at a phone viewport; `reference/capture.js` is a template to adapt per store. Phone screenshots first, desktop only for desktop findings. Capture all 8 surfaces (G7): home, the open menu, a collection, the top product page, a landing page if there is one, the FAQ and story pages, the cart with an item in it, and the checkout as far as it goes without paying.

Save full shots and the 9:16 crops. The crops are the deck's BEFORE images, so frame the section each test will be about (G8).

Notes from use:
- Phone viewport about 390 wide at 2x. Crop every BEFORE to 9:16.
- Clear gates in order (age or region gates, then the cookie banner: decline what is not needed), then hide pop-ups and overlays before shooting.
- Hiding overlays can hide the menu or cart you are shooting. Check each of those shots shows the open panel.
- Also note, while there, what a buyer would: how long the first screen takes to appear, whether a pop-up covers the page on arrival, whether the price and button are in the first screen.

**CHECKPOINT.** Show the captured set; re-shoot anything covered or clipped.

---

## Phase 2: diagnose

Write `{audit}/AUDIT-FINDINGS.md`. No long dashes (G3).

1. **Mode and sources.** Sized or page-only (G1), the date window of any data, the ads looked at.
2. **Funnel diagnosis** (sized mode only): where the money leaks, in funnel order, with the store's own rates, phone against desktop.
3. **Top 3 leaks and top 3 opportunities.** Sized mode: each in money, sum shown, assumption stated ("if phone checkout completion rose from 28% to 38%"), labelled a model and not a forecast. Page-only mode: each ranked by impact x confidence x ease, with no money figure.
4. **Page by page, every surface (G7).** For each page: the first buyer need it does not meet, then the test suggestions. Each test is "Test [name]: change X because Y, expected to lift [metric]", tied to a principle in the knowledge base, with 1 line describing the design it implies. In page-only mode "expected to lift [metric]" names the metric and no percentage.
5. **Prioritisation.** Impact x ease across all tests. Say which to ship without testing (the obvious fixes) and which need a test, and whether the store has the traffic to test at all (a trusted result needs about 1,000 conversions per variant: rule of thumb).
6. **What the brand brain lacks.** Facts the pages need and the brand has not written down (returns terms, delivery times, warranty, a size guide, what is in the box, a stated rating). These are findings too: a page cannot answer a need the brand has not answered.

Keep it honest: a surface that is already good is said to be good.

**CHECKPOINT.** Save and show the findings before producing the requested deck or implementation. Continue within the authorized scope.

---

## Phase 3: build the deck (when asked for)

Deck spec and the tool's traps: `reference/figma-deck-playbook.md`. In short:

- 1 deck file named `{Client} CRO Audit`, created once and only edited after (G4).
- Colours and font from the client's `brand-guidelines.md` and `brand-look.json`. The look is the client's.
- Flow: cover, agenda, method and sources (with the mode), funnel diagnosis (sized mode), the leaks, a section for each surface, prioritisation, projected impact (sized mode only), close.
- Each surface: the annotated BEFORE on the left, then 1 to 3 test cards, each with its hypothesis above a named AFTER slot (`AFTERSLOT_<surface>_v1`, `_v2`, `_v3`).

**CHECKPOINT.** Inspect a few slides for structure and brand fidelity before filling images; expose the result for revision.

---

## Phase 4: BEFORE and AFTER images

For an optional image mock-up deck, use `reference/after-image-pipeline.md`. Apply existing paid-call authorization and budget limits; ask only if the proposed spend is not already authorized. For the CRO app, the AFTER should be a browser rendering of executable page code, not an image-model drawing presented as an implemented page.

- **BEFORE:** the real Phase 1 crop, placed in the slide, with a highlight box and a short callout naming the problem (G8).
- **AFTER:** 1 mock-up per test, made with the image model by editing the real BEFORE crop so the brand's interface and product stay as they are. Each prompt makes that test's 1 change. Every figure and proof element follows G9. The model in use and its settings are in `skills/production-principles/models.md`; this skill names none.
- Look at every mock-up at small size before placing it: garbled text or wrong brand colours means make it again.

**FINAL CHECKPOINT.** Deliver the findings file and the deck link.

---

## After the run

Log what was changed and what it did to `brain.md` (What we know works, What to avoid) and `recent-changes.md`, so the knowledge compounds.

## Voice

Direct, practical, about profit. Every recommendation passes the owner test (G5).

## What this reads from the brand brain

| What | Where (contract names) | When it is blank |
|---|---|---|
| The buyer, and what almost stops them | `customer-avatars.md` per avatar | Judge as a stranger; say the objections are assumed |
| What the product is and what kind (bought again or once) | `products-and-positioning.md` Product catalog; `brand.json` products | Read it off the product page |
| The offer and guarantee the pages should show | `offers.json`; `brand.json` offers, guarantee | Finding: "no standing offer on file" |
| Proof the brand really has | `brand.json` claims with sources, proof assets | Mock-ups show labelled grey boxes (G9) |
| The ads that send traffic | `winning-ads.md` (1 entry per ad) | Ask; else need 1 is marked "not judged" |
| Competitors to compare against | `competitors.md` | Skip the comparison |
| Colours, fonts, voice for the deck | `brand-guidelines.md` Visual identity; `brand-look.json` | Sample from the screenshots |
| What worked before | `brain.md` What we know works, What to avoid | Nothing to carry forward |

Not in the contract, and an audit needs them: **Store numbers** (`shopify-funnel-data.md`: sessions, conversion rate, AOV, device split, funnel rates, with the date window; today a file this skill writes beside the 8 documents), **Which ad lands on which page**, **Returns rate and reasons**, and the page facts every page skill needs (**Shipping and delivery**, **Returns**, **Warranty**, **Size and fit**, **What is in the box**, **FAQ**, **Proof on file**). `cro-brain.md` is also outside the 8 documents (see `cro-brain`).
