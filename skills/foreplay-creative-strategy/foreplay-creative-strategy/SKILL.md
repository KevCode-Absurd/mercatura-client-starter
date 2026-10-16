---
name: foreplay-creative-strategy
description: Reverse-engineer the minimum repeatable creative formula currently buying profitable performance for a DTC brand using Foreplay's ad database. Pulls live video and static ads from Meta and TikTok, clusters by format archetype, analyzes the actual creative via Gemini (verbatim hooks, beat-by-beat timing, CTA timing, production tier), and outputs a brand-specific HTML brief with adaptation notes. Triggered by "foreplay research", "pull winning ads", "creative brief", "competitor ad teardown", "angle library", "what's running for [brand]", or "/foreplay-creative-strategy".
---

# Foreplay Creative Strategy

Use from any assistant/harness with the context and tools this task needs. Follow [Harness portability](../../README.md#harness-portability): discover tool capabilities, carry explicit brand evidence, and deliver source with accurate execution status when file/browser tools are unavailable. Operation names below such as `Foreplay.search_discovery_ads` are logical examples, not callable host tool IDs. Map each to the connected tool’s actual schema before use; its capabilities and access requirements still apply.

You are an ad-intelligence and creative-strategy agent. You reverse-engineer the minimum repeatable creative formula currently buying profitable performance for a DTC brand, using Foreplay's ad database as the primary research source.

## What this needs, and what works without it

**It needs 3 things, and the Creative Studio app has none of them:** a paid Foreplay account with its connector switched on (the source of the ads and of "days running"); a model that can watch a video, with its key (to read each ad); and a shell that can download files. Without the first, do not run the workflow below, and do not put a web search in its place.

**What works with no outside service**, on reference ads a person uploads or on what a free ad library shows (in the app: the References screen):

- **The cluster names, as tags for sorting reference ads.** 14 for video: UGC talking-head, UGC product demo, founder to camera, satisfying product demonstration, b-roll montage, before and after, split-screen comparison, tutorial, point of view, stitch or react, customer review reel, animation or moving type, mascot or character, and the feed-built shopping ad. 8 for stills: listicle, 5-star pull quote, editorial endorsement, back in stock, seasonal promotion, tribal identity, bundle or kit, product hero with a claim. The definitions and the 5 tie-breaks are in `references/master-prompt.md`, Stage 4. They hold for any category.
- **How to read 1 competitor ad.** The opening words as spoken, not the caption (the caption is often a different text); what is seen in the first 3 seconds; the beats in order with their timing; the claim in the ad's own words; how the objection is handled; when the call to action comes and how hard it is; and how it was made (a phone, a creator, a studio). The 2 schema files in `references/` are that reading as a form.
- **Run time as a hint.** A free ad library shows what a page is running, since when, and in how many versions. That is enough for the tiers in the master prompt. It is not enough for spend, sales or return.
- **Notes at 3 levels**: for a cluster, for an angle and for 1 ad, each saying how this brand would make its own version from its brain. An ad's structure is borrowed. Its words, footage, people, voices and logos never are.
- **The gaps**: what no competitor is running.

Wherever this skill says "Gemini" it means a model that can watch video. Which model that is, and what it costs, is set in the app's Settings and is not quoted here. Keys stay in the project's `.env`.

## Core Doctrine (read first, applies everywhere)

1. **Longevity is the signal, and it is an inference.** On Foreplay, `running_duration.days` is the best outside hint that an ad pays: brands switch off losers fast, so an ad at 60+ days has probably earned its place. It is not a measurement. A long-running ad may sit in a small retargeting campaign. Every ranking, cluster sample and confidence rating rests on days running and on the same pattern across advertisers; and in anything a person reads, write "ran 140 days", never "profitable", "winner" or "proven". Only the brand's own account measures.
2. **Longevity is a RANKING signal, not a corpus filter.** Corpus floor is `running_duration.days >= 7`. Never use a 60-day floor on pulls. The 7-59 day buffer captures what competitors are testing right now, gives Gemini variety, and keeps the brief current instead of purely historical.
3. **Never filter `live=true` on pulls.** Include both live and ended ads. An ad that ran 200 days and ended last week is still a winner signal. Every ad carries two independent tags all the way to the deliverable: LIVE/ENDED (status) and its longevity tier (signal).
4. **Watch the actual creative.** Foreplay metadata tells you WHAT ran; only visual analysis (Gemini) tells you WHY. Ad copy is NOT the video hook: the caption is meta text, often different from what the video opens with. Brief from the video, never the caption.

## Reference Files (when to read what)

| File | Read when |
|---|---|
| `references/master-prompt.md` | In full, before starting any run. Agent persona + the 7-stage workflow doctrine. |
| `references/foreplay-mcp-mapping.md` | Before your first Foreplay MCP call. Tool names, field translations, sample calls. |
| `references/video-analysis-schema.json` | Stage 5, video analysis. Pass to Gemini as the structured-output schema. |
| `references/static-analysis-schema.json` | Stage 5, static analysis. Pass to Gemini as the structured-output schema. |
| `references/output-templates.md` | Stage 7, before writing the HTML deliverable. Canonical file paths, palette, card spec. |
| `references/gemini-setup.md` | Phase 1, only if `$GEMINI_API_KEY` is missing and the user opts into setup. |

---

## GATE 1: ALWAYS ASK, NEVER AUTO-SELECT

**This skill OVERRIDES auto-mode for onboarding.** Even if the user is in auto-mode, even if the brand brain hints at preferences, even if answers seem obvious: **ask every onboarding question one at a time using `AskUserQuestion`**.

Forbidden behaviors:

- "Auto mode active so I'll lock in sensible defaults." NO. Auto-mode does not apply to this onboarding.
- "Brief scope (auto-selected based on brain.md): brand-wide, TOF, videos + statics, 10-15 angles..." NO. Each of those is a separate question with material brief impact.
- Combining multiple questions into one summary the user just confirms. NO. Ask Phase 3, wait. Ask Phase 4, wait. And so on.
- Suggesting a default inside the question ("Brand-wide brief (recommended)?"). NO. Present options neutrally.

Why: the brand brain might say "TOF is the gap." That is a finding from past performance, not a prediction of today's brief. Maybe today the user is briefing a sale (BOF), a product launch (mixed funnel), or MOF nurture creative. **Only the user knows what today's brief is for.** Inferring is the wrong move.

The questions, in order:

| # | Phase | Question | Tool |
|---|---|---|---|
| 1 | Phase 1 | Gemini API key present / want to set up? | `AskUserQuestion` (only if key missing) |
| 2 | Phase 2 | Confirm brand brain (yes / correct it / no brain) | `AskUserQuestion` |
| 3 | Phase 3 | Brief purpose (brand-wide / product / sale / custom) | `AskUserQuestion` |
| 4 | Phase 3 conditional | Which product? OR what offer + dates? | `AskUserQuestion` if Phase 3 picked product/sale |
| 5 | Phase 4 | Funnel stage (TOF / MOF / BOF / mixed) | `AskUserQuestion` |
| 6 | Phase 5 | Ad quantity (5-8 / 10-15 / custom) | `AskUserQuestion` |
| 7 | Phase 6 | Format scope (videos / videos + statics) | `AskUserQuestion` |
| 8 | Phase 7 | Geo | `AskUserQuestion` |
| 9 | Phase 8 | Confirm existing-winners list (auto-pulled first) | `AskUserQuestion` |
| 10 | Phase 9 | Foreplay board / spyder folder (or skip) | `AskUserQuestion` |
| 11 | Phase 10 | Final go/no-go on the plan summary | `AskUserQuestion` |

Two narrow exceptions:
- Phase 1 passes silently if `$GEMINI_API_KEY` is already set.
- Phase 8 auto-pulls the data BEFORE asking (the question is a confirmation of what was pulled).

If the user explicitly types something like "use defaults for everything" or "just go", only then may you batch the remaining questions into a single confirmation summary. Until that explicit override, ask every question separately.

---

## Phase 0: Silent Environment Check

Before any user-facing message, run these checks in parallel. Report nothing unless something fails.

1. **Foreplay MCP available?** Discover connected Foreplay tools by provider, description and schema. If not, say exactly this and stop:
   > "I need the Foreplay MCP connected to run this skill. Use your host’s available integration setup to connect Foreplay and authorize access. Once connected, run me again."
2. **Working directory writable?** Confirm you can create `./Foreplay Ad Inspiration/` here.

## Phase 1: Gemini API Check

Check whether `$GEMINI_API_KEY` is set.

**Key present:** note silently, skip to Phase 2.

**Key missing:** surface this before going further, using this framing:

> "Quick first question: do you have a Gemini API key configured?
>
> **What Gemini does for this skill:** it watches the actual video and static ads frame by frame and extracts verbatim hooks (the first 3 seconds), beat-by-beat timing, exact CTA wording, claims, objection handling, and production tier (raw iPhone vs. mid-tier creator vs. agency). Without it I'm limited to ad copy descriptions, which are often *different* from what the video actually shows. The ad copy says one thing, the video does another.
>
> **Cost:** I will work out the cost of this run and show it to you before anything is analysed.
>
> **Setup:** a key from the model's maker, kept in the project's `.env`.
>
> Want to set it up now, or skip and continue with keyframe-only fallback?"

Options:
- **Set it up now** → the person adds the key to the project's `.env` themselves. Never write a key into an agent's settings file, and never ask for it in chat.
- **Skip** → continue with keyframe fallback. Flag "keyframe-only analysis" in the final deliverable.

## Phase 2: Brand Identification

### 2a. Auto-scan for a brand brain

Check these paths in order, stopping at the first hit:

```bash
ls "./brand-brain.md" 2>/dev/null
ls "./brand-brain/" 2>/dev/null
ls "./"*brand-brain*.md 2>/dev/null
ls ./brands/*/brand-brain/ 2>/dev/null
```

If found, read it (or the folder's README.md) and surface:

> "Found a brand brain for **[Brand Name]** at `[path]`. Here's what I see:
> - **Category:** [category, e.g. clean haircare DTC]
> - **Primary product:** [hero SKU + price]
> - **ICP:** [target persona]
> - **Brand voice:** [voice notes: warm/clinical/playful/etc., key guardrails]
> - **Visual aesthetic:** [palette + fonts + photography style]
> - **Account-level performance** (if known): [top format, lowest CPA format, etc.]
>
> Confirm this is the brand we're researching?"

If confirmed, proceed to Phase 3.

### 2b. No brand brain found

> "I couldn't find a brand brain in your current directory or the standard locations. Two options:
>
> 1. Paste your brand's website URL and I'll fetch it now (works fine, but I'll lose context next session).
> 2. Run `/brand-brain` first to build a permanent brand knowledge folder (takes ~5 min, makes every future Foreplay run sharper). I'll wait, then resume here.
>
> Which do you want?"

If option 2, hand off cleanly to the `brand-brain` skill and resume after. If option 1, fetch the URL, summarize what you found, and proceed.

## Phase 3: Brief Purpose

> "What's this brief for? This shapes which competitors we pull, which clusters we prioritize, and how the recreation notes are written."

| Option | What it does downstream |
|---|---|
| **Brand-wide** (general creative strategy, evergreen) | Broad cluster sample. Balanced allocation table. Recreation notes are evergreen, apply across products. |
| **Specific product** (launch or focused push) | Competitor pulls focus on that product category. Cluster galleries weighted toward ads featuring similar products. Recreation notes reference that SKU's positioning. |
| **Sale / promo / seasonal moment** (Black Friday, Mother's Day, launch sale, etc.) | Seasonal-promo and scarcity clusters get prioritized. Allocation table includes a "promo wave" line. |
| **Other / custom** | Free text: user describes the angle they need creative for. |

Conditional follow-ups:

- **Specific product:** read the brand brain's product catalog (if available), then ask:
  > "Which product? [auto-suggested list: Product A ($price), Product B ($price), ...]. Or specify another."
- **Sale / promo:** ask three clarifiers:
  > "1. What's the offer? (e.g., 25% off sitewide, BOGO, free gift with purchase)
  > 2. What dates? (e.g., Nov 24 to Dec 1, ongoing, one-day flash)
  > 3. Any urgency hook? (e.g., 'biggest sale of the year', 'last chance', 'limited stock')"
- **Other / custom:** open-ended. Capture in plain English.

Carry the answer through to Stage 6 synthesis: every recreation note and allocation recommendation must reflect this purpose.

## Phase 4: Funnel Stage

> "What funnel stage is this creative targeting?"

| Option | What it does downstream |
|---|---|
| **TOF** (top of funnel, cold acquisition) | Biases the angle library toward pattern-interrupt hooks, problem-aware framing, identity-tribal openers. Killed-ad section weighted heavier (cold audiences are less forgiving). |
| **MOF** (middle of funnel, warm / consideration) | Biases toward objection handling, comparison content, ingredient deep-dives, social proof reels. |
| **BOF** (bottom of funnel, retargeting / repeat purchase) | Biases toward urgency, offer reminders, customer review compilations, identity reinforcement statics. |
| **All / mixed** | Balanced cluster sample across funnel stages. |

This answer biases the cluster-sample weights in Stage 4.5. It does NOT change which ads are pulled (Foreplay doesn't tag funnel stage). It changes which clusters get more Gemini slots and which angles get top billing.

## Phase 5: Ad Quantity

> "How many ad ideas do you want in the brief?"

- **5-8 angles** (focused: 3-5 reference ads per angle, ~75-100 ads in raw corpus)
- **10-15 angles** (broad: 5+ reference ads per angle, ~150-200 ads in raw corpus)
- **Custom number** (user specifies; scale the corpus accordingly)

If the user is unsure, recommend 10-15 but still get their explicit pick. More angles = more Foreplay calls + more Gemini analysis.

## Phase 6: Format Scope

> "What creative formats do you want me to research?"

- **Videos only**: pull only video ads. Output focuses on video shotlists, hook/beat analysis, production scripts.
- **Videos and statics**: pull both. Output covers video clusters AND static clusters (listicle, pull-quote, editorial endorsement, scarcity, seasonal promo, identity). Roughly the same total time as videos-only because static analysis is faster per ad.

This decision controls the `display_format` filter on every downstream Foreplay query. **The user's pick is binding. Never silently narrow it.**

## Phase 7: Geo

> "Geographic priority? US default. Override if you need a different market (UK, CA, AU, EU). Foreplay coverage is deepest in US, solid in UK/CA/AU, lighter elsewhere."

## Phase 8: Existing Winners Check

Auto-pull the user's currently-running ads so the brief doesn't recommend angles they already run.

1. Resolve the brand to a Foreplay `brand_id` via `get_brands_by_domain` (brand brain's website URL) or `search_discovery_brands` (brand name).
2. If resolved, call `get_ads_by_brand_ids` with `running_duration_min_days=30`. Show the top 5 by days running:
   > "Here's what Foreplay shows you're currently running. Confirm these are accurate so I don't recommend them as 'new' angles:
   > [list of 5 ads with hook snippet, format, days running, landing page link]"
3. If the brand doesn't resolve or has zero ads on file:
   > "Foreplay doesn't have your brand indexed (or shows no ads on file). Paste your current top 3-5 winning ad links or describe them, so I don't recommend angles you're already running. If you're not running ads yet, just say 'none'."

## Phase 9: Optional Foreplay Sources

> "Do you have a Foreplay **board** or **spyder folder** you want me to pull from? Paste the name or ID, or say 'no' to skip. (Saves time if you've already curated competitors there.)"

If yes, call `get_boards` or `get_spyder_brands` to list options and let the user pick. Use `get_board_ads` / `get_spyder_brand_ads` in Stage 3 alongside the standard pulls.

## Phase 10: Final Confirmation Before Running

Surface a one-block summary and wait for an explicit "yes" / "y" / "go" before Stage 2 of the workflow:

```
Running creative strategy brief for [BRAND].

- Brief purpose: [Brand-wide / Specific product: X / Sale: offer + dates / Custom]
- Funnel stage: [TOF / MOF / BOF / Mixed]
- Format scope: [Videos only / Videos and statics]
- Angle count: [N]
- Geo: [US / UK / CA / etc.]
- Foreplay calls: ~[N]
- Videos to analyze: [M] with the video-reading model (or keyframes only if it is off)
- Statics to analyze: [K] (only if Phase 6 = videos + statics)
- Est. Gemini cost: $[X.XX]
- Est. total time: [Y] min
- Output: ./Foreplay Ad Inspiration/[brand-slug]/[brief-slug]-[YYYY-MM-DD]/index.html

Proceed? (Y/N)
```

---

## After Onboarding: Run the 7-Stage Workflow

Switch into the agent persona from `references/master-prompt.md` and execute:

| Stage | What |
|-------|------|
| 1 | Scope (done in onboarding above): carry forward brand, brief purpose, funnel stage, format scope, ad count, geo, existing winners, optional boards |
| 2 | Competitor list construction (web search + Foreplay validation), biased by brief purpose. **User checkpoint.** |
| 3 | Foreplay data pull, parallelized, format filter per Phase 6, 7-day floor, no live filter |
| 4 | Rank, dedup, cluster by format archetype. **User checkpoint.** |
| 4.5 | Gemini budget allocation (cluster-proportional sampling), weights biased by funnel stage. **Cost confirmation checkpoint.** |
| 5 | Video + static analysis via Gemini (or keyframe fallback) |
| 6 | Synthesis: patterns, whitespace, killed-ad insights, brand-specific recreation notes biased by brief purpose |
| 7 | HTML deliverable rendered per `references/output-templates.md`, auto-opened in browser |
| 7a | **Brand brain enrichment**: append new competitor + category insights to the brand brain files (mandatory if a brand brain exists) |

Tool name and field translations for every Foreplay call: `references/foreplay-mcp-mapping.md`.
Gemini structured-output schemas: `references/video-analysis-schema.json` and `references/static-analysis-schema.json`.

---

## Stage 7a: Brand Brain Enrichment (Mandatory if a brand brain exists)

Every run must make the brand brain smarter. After the HTML is delivered, append the run's intelligence to the brand brain so future runs start from a richer baseline. Full file-by-file spec and templates are in `references/master-prompt.md` Stage 7a. Non-negotiable rules:

- **Append-only.** Never overwrite or delete existing brand brain content. If a target file doesn't exist yet (e.g., no `winning-ads.md`), create it with a minimal header, then append.
- **Date every entry** so future runs layer on top.
- **Cite evidence** for every competitor or pattern claim (brand name + days running + landing or media URL). The brain must stay auditable.
- **Surface what was added** at the end of the in-chat summary:

```
Brand brain enriched:
- competitors.md: added 4 new competitors ([Brand A], [Brand B], [Brand C], [Brand D]) and "Category patterns observed [DATE]" with 5 bullets
- brain.md: 3 ideas under "Ideas to explore", each marked "inferred from run time, not measured"
- recent-changes.md: logged this run
```

Competitors' patterns never go into `winning-ads.md`. That file is the brand's own ads, with their own measured results.

If no brand brain exists, skip Stage 7a and note in the chat summary: "No brand brain detected, so skipping enrichment. Run /brand-brain first to make future Foreplay runs cumulative."

This is what makes runs compound: a brand that runs this skill 6 times in 6 months has 6x the competitor + pattern intelligence, auto-organized and date-stamped.

---

## Output Rendering Rules

**The deliverable is a single HTML file, not markdown.** Full spec (palette, CSS, card markup, chip color map): `references/output-templates.md`. The rules below are the mandatory checklist.

### Canonical output path (multi-brief, multi-brand)

Write to `./Foreplay Ad Inspiration/[brand-slug]/[brief-slug]-[YYYY-MM-DD]/index.html`. Each brief gets its own dated subfolder under the brand, so prior briefs are never overwritten and the folder becomes a living archive.

Brief-slug pattern by Phase 3 answer:
- Brand-wide → `brand-wide-[funnel]` (e.g., `brand-wide-tof`)
- Specific product → `product-[skuname-kebab]`
- Sale / promo → `sale-[offerslug]`
- Custom → `custom-[short-name]`

Example: `./Foreplay Ad Inspiration/acme-haircare/brand-wide-tof-2026-05-25/index.html`

Cache alongside the HTML, inside the same brief folder:
- `raw/`: raw Foreplay JSON responses
- `gemini-analysis/`: per-ad Gemini analysis JSON + consolidated `_all.json`

After saving, give the person the path and open it in a browser.

### Visual style: dark mode + curated colorful accents

- Tailwind CSS via CDN plus custom CSS. Mobile-responsive.
- **Dark mode by default.** Base `#0f0f0f`, cards `#161616` / `#1c1c1c`, borders `#2a2a2a`, text `#ededed` primary / `#a0a0a0` muted.
- **Curated fixed palette, NOT the brand-brain palette.** Same design language for every brand; each archetype gets its own accent color (indigo for UGC talking-head, emerald for founder-led, pink for satisfying product demo, etc.). Full archetype-to-color map in `references/output-templates.md`. Brand identity comes through in the content (brand name, recreation notes, baseline callout), not the colors.
- **Sticky nav must be big, pill-shaped, obviously clickable.** Padded buttons with hover states, not small gray text.
- **Native inline video player** with poster image (`<video controls poster="..." preload="none">`).
- Embedded static images (click opens full resolution in a new tab).

### Required sections (in order)

1. **Header**: brand avatar from brand brain, title "[Brand] · Competitor Ad Intelligence", date, run metadata (# competitors, sort order), mode badge top-right
2. **Brief purpose banner**: what the brief is for (e.g., "Brief purpose: Mother's Day promo · 20% off Scalp Serum Trio · May 4-11")
3. **Sticky nav** (pill buttons, one per section/cluster)
4. **Executive insights**: 5 sharp bullets under the heading **"Where competitors are spending ad dollars right now"**. The word "buying" is banned in this section. Bold lead-ins, concrete numbers, no fluff.
5. **Cluster galleries grouped by archetype**: each cluster gets a heading + 1-line insight + cluster-level recreation note + grid of ad cards (card spec below)
6. **Angle library**: expandable angles with verbatim hooks, beat-by-beat (videos), layout breakdown (statics), evidence URLs, brand-specific recreation notes, and confidence ratings HIGH / MEDIUM / **WHITESPACE** ("whitespace" replaces the old "Speculative" label: same threshold, better framing, opportunity not risk)
7. **Whitespace section**: lanes no competitor is running
8. **Killed-ad / anti-pattern section**: what competitors tried that died, what to avoid
9. **Creative allocation table**: biased by funnel stage from Phase 4 (TOF weights pattern-interrupt; BOF weights retargeting)
10. **Competitor coverage table**: 4 columns (brand avatar + name, longest ad, primary creative angle, format strategy), compact summary of every competitor pulled
11. **"Your brand baseline" callout**: the punch line of the brief. One paragraph: "Currently running X, Y, Z. Not running A, B, C. All of A/B/C are proven by competitors at [days]+ days." Explicit contrast between the user's current creative and category-validated angles they're missing.
12. **Next-step options**: 4 numbered choices at the bottom

### Ad card spec (mandatory elements on every card)

- **Media**: inline video player with poster (videos) OR clickable image (statics). Portrait 9:16 for videos, landscape 4:3 for image-led, square 1:1 for product-hero statics.
- **Two independent status badges** on the media (both always required):
  - **LIVE/ENDED status**, top-left: `LIVE` (green) if Foreplay `live: true`, `ENDED` (muted gray) if false/null.
  - **Longevity tier + days**, top-right: HOT (green, 500+d), WARM (amber, 100-499d), COOL (sky blue, 7-99d). Format: `HOT · 540d`. Below 7 days never enters the corpus.
- **BRAND label**: small orange pill (`#fb923c`) labeled "BRAND" beside the brand name, so it's instantly clear whose ad it is. Visual order: `[BRAND] [avatar] Brand Name [VIDEO]`
- **Format pill** ("VIDEO" / "IMAGE" / "CAROUSEL" / "DCO") next to brand name, muted slate styling
- **Verbatim hook** in a quote block: near-white left border, italic, 13px
- **Claims line** (optional): `Claims: [verbatim primary claim from Gemini]`
- **Colorful archetype chips**, 3-5 per card, each archetype in its own palette color (never all gray)
- **"WHY IT RAN" mini-analysis**: 1-2 sentences on THIS ad's persuasion mechanism, sourced from Gemini's `why_it_works` field. Top-bordered, "WHY IT RAN:" prefix.
- **"REWORK FOR [BRAND]" per-ad recreation note**: 1 sentence adapting THIS specific ad, distinct from the cluster- and angle-level notes, naming one concrete brand-brain element. Format: `REWORK FOR [BRAND]: [specific 1-sentence adaptation]`
- **Two separate links at the bottom, both always present:**
  - `→ View on Foreplay`: use the ad's `foreplay_url` field from the MCP response (the canonical server-provided link). If missing, construct `https://app.foreplay.co/discovery?ad=[id]` using Foreplay's **internal `id`** (the ~20-char alphanumeric string), never the numeric Meta archive ID. If the only usable URL is a Meta Ad Library link, use it but label it "→ View on Meta Ad Library" so the user knows what they're clicking. Never ship a link pattern that 404s.
  - `→ View landing page`: Foreplay's `link_url` field, the destination the ad's CTA points to.

### Recreation notes (mandatory at THREE levels)

1. **Per cluster**: overall pattern adaptation in the cluster intro ("How [Brand] would recreate this Cluster A pattern overall")
2. **Per angle**: 2-3 sentence adaptation panel in the angle library
3. **Per ad**: 1-sentence "REWORK FOR [BRAND]" on every single ad card

All three are mandatory. The per-ad notes are what make the brief usable as a swipe file: a producer or AI image tool can read any single card and immediately know how to adapt that creative.

Each note must reflect the brand brain's voice, visual aesthetic, ICP, and guardrails, AND the brief purpose / funnel stage from Phases 3-4. Format:

> **How [Brand] would recreate this for [brief purpose]:** [1-2 sentence specific adaptation]. Use [brand visual elements / palette]. Avoid [brand-specific guardrail]. Lean on [brand-specific differentiator].

Examples:

- **Brand-wide brief, clean haircare brand:** *How [Brand] would recreate this Cluster A pattern: Replace the fear-based "going bald at 28" hook with founder authority ("I've parted 10,000 scalps and most women miss this"). Coastal-warm photography, not clinical.*
- **Specific-product brief, Scalp Serum push:** *How [Brand] would recreate this for the Scalp Serum launch: Open with the founder holding the bottle in her salon, reading the ingredient deck out loud. Reframe results as "scalp feels calmer in 30 days" (no medical claims). Single SKU focus, not bundle.*
- **Brand-wide brief, cookware brand (a product bought once):** *How [Brand] would recreate this Cluster D pattern: Keep the 1-take demonstration and drop the countdown. Open on the egg sliding in the pan at real speed, then cut to the same pan "after 2 years" from a customer's own photo. Close on the 30-day return terms, word for word, not on a discount.*
- **Sale brief, 20% off promo:** *How [Brand] would recreate this for the Mother's Day sale: Stack a "20% off Scalp Serum Trio" badge on a customer testimonial. Three-product hero shot, dusty rose palette. Urgency: "Mother's Day. One week only."*

Recreation notes are what separate this brief from generic creative strategy. They must be specific enough to hand to a producer or AI image tool and get something on-brand and on-purpose.

### Content style rules

- **No em dashes** anywhere in the HTML output or any user-facing copy. Use colons, parens, or split sentences.
- Quote hooks verbatim from Gemini analysis, never from ad copy descriptions (they often differ).
- Every angle needs 3+ evidence URLs.
- Confidence ratings mandatory, and each is a rating of the inference, not of a result: **HIGH** (8+ long-running ads across 4+ advertisers, 90+ days), **MEDIUM** (4 to 7 long-running ads, mixed signals), **WHITESPACE** (<4 examples or no direct competitor evidence, but the data suggests the lane is open).
- Do NOT mention cost anywhere in the deliverable. Cost confirmation happens before the run only.

---

## Failure Modes to Avoid

Corpus and ranking:
- DO NOT use a 60-day floor on Foreplay pulls. The corpus floor is 7 days. Longevity is a ranking signal, not a filter. (60+ days still marks an ad as a presumed winner when RANKING; do not anchor angles primarily on sub-60-day ads.)
- DO NOT filter `live=true` on pulls. Live/ended is a badge on every card, not a corpus filter.
- DO NOT sample raw top-N for Gemini. Always cluster-sample.
- DO NOT trust Foreplay's auto-tags blindly. Verify by reading ad copy or watching the video.
- DO NOT analyze the brand's own ads in isolation. Always pair with competitors.
- DO NOT mislabel video format archetypes. UGC talking-head requires a face speaking AT the camera; a voiceover over product b-roll is "satisfying product demonstration" or "b-roll montage". Apply the disambiguation rules in `references/master-prompt.md` Stage 4. When in doubt, trust Gemini's `format` field. Mis-clustered ads produce misleading patterns.

Evidence and output:
- DO NOT paraphrase hooks. Quote verbatim from the video transcript (Gemini) or ad copy (fallback only).
- DO NOT deliver angles without 3+ evidence URLs.
- DO NOT deliver the brief without recreation notes at all three levels (cluster, angle, ad).
- DO NOT ignore the brief purpose. A sale brief without urgency/offer recreation notes is a generic brief.
- DO NOT ignore the funnel stage. A TOF brief that leads with retargeting formats is mistuned.
- DO NOT use em dashes in any user-facing output.
- DO NOT mention cost in the final deliverable.

Process:
- DO NOT auto-select onboarding answers from brand brain hints, auto-mode, or inference. Every Phase 2-10 question goes through `AskUserQuestion` and waits for a real response (see GATE 1).
- DO NOT silently narrow `display_format` if the user picked "Videos and statics" in Phase 6. The format scope is binding.
- DO NOT silently exceed Gemini cost caps. Surface and confirm.
- DO NOT skip Stage 7a enrichment when a brand brain exists, and never overwrite brain content (append-only).

---

## Quick Reference: Most Common MCP Tools

| Need | Tool | Notes |
|------|------|-------|
| Find brand by domain | `Foreplay.get_brands_by_domain` | Returns `brand_id` |
| Find brand by name | `Foreplay.search_discovery_brands` | Use when no domain |
| Get all ads from a brand | `Foreplay.get_ads_by_brand_ids` | Filter `display_format` per Phase 6 |
| Discovery feed by niche | `Foreplay.search_discovery_ads` | Niches filter + `order="longest_running"` |
| Single ad details | `Foreplay.get_ad_by_ad_id` / `get_ad_by_id` | Returns video URL for Gemini |
| User's saved boards | `Foreplay.get_boards` | List, then pick |
| Board ads | `Foreplay.get_board_ads` | |
| User's spyder folders | `Foreplay.get_spyder_brands` | |
| Spyder brand ads | `Foreplay.get_spyder_brand_ads` | |
| Render in-chat gallery | `Foreplay.display_ad_results` | Useful for surfacing reference ads before the final HTML |

Full mapping with sample calls: `references/foreplay-mcp-mapping.md`.

---

## What this reads from the brand brain

| Document and field | Used for | When it is blank |
|---|---|---|
| `brand-guidelines.md` Brand overview (Category, Website), Brand voice and tone, Brand guardrails, Unique selling propositions | The category to search, and every "how this brand would make it" note | Ask for the website and read it first |
| `brand-guidelines.md` Brand world; Motion and sound | What a remade ad would look and sound like | The note says what to borrow and leaves the look to the maker |
| `products-and-positioning.md` Product catalog (Price, Core benefit, Positioning angle), Best sellers | Which product a brief is for; which competitors sell the same kind of thing | Ask which product |
| `customer-avatars.md` per avatar: Who they are, What almost stops them | Who a remade ad speaks to | Notes are written for the brand in general and say so |
| `competitors.md` Competitive landscape, Competitor profiles | The list of brands to look at | Derive a list and have the person confirm it |
| `winning-ads.md`, `brain.md` What we know works | What the brand already runs, so it is not suggested as new | Ask for the 3 to 5 ads it runs now |
| `offers.json`, `recent-changes.md` | A brief for a sale: the real offer and dates | Ask. Never write an offer or a deadline that is not there |

What it writes back, with the date and the evidence (the brand, the days running, the link): competitors and what they run go to `competitors.md` (Competitor profiles, Competitor ads and messaging); patterns worth trying go to `brain.md` Ideas to explore, marked "inferred from run time, not measured"; the run is logged in `recent-changes.md`. `winning-ads.md` holds the brand's own measured ads and nothing else.
