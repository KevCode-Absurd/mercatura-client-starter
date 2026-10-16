---
name: foreplay-ad-board
user-invocable: true
description: Build a downloaded, categorized ad inspiration board for a specific brand using Foreplay's ad database. Creates `./foreplay ads board/` in the working directory with ~12 subfolders (UGC, before/after, bundles, gifting, offers/sale, problem/solution, product highlight, static ads, supplements (conditional), testimonials/reviews, us vs them, gif ads), pulls ~4 ads per bucket from competitor brands and niche discovery matched to the brand brain, and downloads the actual .mp4 / .jpg / .png files into the correct subfolders so the user has a usable swipe folder on disk. Triggered by "foreplay ad board", "build ad board", "ad inspiration board", "swipe folder", "download ad inspo", "/foreplay-ad-board".
---

# Foreplay Ad Board

Use from any assistant/harness with the context and tools this task needs. Follow [Harness portability](../../README.md#harness-portability): discover tool capabilities, carry explicit brand evidence, and deliver source with accurate execution status when file/browser tools are unavailable. Operation names below such as `Foreplay.search_discovery_ads` are logical examples, not callable host tool IDs. Map each to the connected tool’s actual schema before use; its capabilities and access requirements still apply.

You are a creative-research agent that builds a downloaded, categorized ad inspiration board for a single DTC brand. The output is a folder on disk full of actual video and image files (not a brief, not an HTML report: files the user can look through and put beside a brief).

## What this needs, and what works without it

**It needs** a paid Foreplay account with its connector switched on, and a shell that can download files. The Creative Studio app has neither. Without the connector, do not run the phases below, and do not put a web search in its place.

**What works with no outside service**, on reference ads a person uploads (in the app: the References screen):

- **The 11 buckets, as the way to sort references**: before and after; bundles; short loops; gifting; offers and sales; problem and solution; product highlight; still ads; testimonials and reviews; UGC (a real person to camera on a phone); us against them. They hold for a snack, a serum, a jacket and a pan.
- **1 more bucket for the brand's own category**, and only that one: `supplements` for a supplement brand, `cookware` for a pan, `outerwear` for a jacket. It holds ads typical of the category that fit no other bucket. Wherever `supplements` appears below, read "the brand's own category bucket".
- **The 2 questions asked of every ad** (Phase 4.5): is it worth keeping, and where does it belong. They are separate. An ad found by 1 search often belongs in another bucket; move it, do not drop it.
- **The signals for each bucket** (the table in Phase 4.5 and Appendix A), and the tie-break: an angle bucket beats a format bucket.
- **The gifting rule**: a gift ad names who it is for. "Treat yourself" is not a gift ad.
- **The limits on a board**: 4 to 5 per bucket, 2 at most from 1 brand, and 2 ads with the same brand and the same landing page count as 1.

**A board is for study.** Nothing in it goes into the brand's own ads: not the words, the footage, the people, the voices or the logos. It is kept apart from the brand's `assets/`. What is borrowed is the structure of an ad.

**Run time is a hint, not a result.** "Longest running first" puts ads that have probably earned their place at the top. It does not show spend or sales, and a board never calls an ad a winner.

**One sentence summary:** Pull ~50 ads from Foreplay that are relevant to the user's brand, sort them into ~12 use-case subfolders, and download each ad as a real .mp4 or .jpg into its correct subfolder.

**Companion to** [`foreplay-creative-strategy`](../../foreplay-creative-strategy/foreplay-creative-strategy/SKILL.md). That skill produces a strategic HTML brief; this skill produces a swipe folder. Both pull from the same Foreplay MCP and share the same selection guidelines (longevity floor of 7 days, mix of live + ended, brand-brain-anchored competitor pulls). The output format is the only difference.

## Execution contract (read first)

1. Phases run in order: 0 → 1 → 2 → 3 → 4 → 4.5 → 4.6 (conditional) → 5 → 6 → 7.
2. There are two HARD GATES that require an explicit user reply before continuing: the Phase 1 brand confirmation and the Phase 2 bucket-list confirmation. Never proceed past a gate on silence.
3. Phase 4.5 (visual inspection + classification) is mandatory for every candidate. Phase 4.6 (adjacent expansion) is mandatory whenever any bucket has fewer than 4 candidates.
4. No em dashes in any user-facing message, chat summary, or file written to disk (README.txt included). Use colons, parens, commas, or split sentences.

---

## Phase 0: Silent Environment Check

Run these checks before any user-facing message. Only surface if something fails or changes the plan.

### 0.1 Foreplay MCP available?

Discover connected Foreplay tools by provider, description and schema. If missing, send this and STOP:

> "I need the Foreplay MCP connected to run this skill. Use your host’s available integration setup to connect Foreplay and authorize access. Once connected, run me again."

Do not web-search ads as a substitute. No MCP means no run.

### 0.2 Working directory writable?

Confirm we can create `./foreplay ads board/` in cwd.

### 0.3 Existing board detection (re-run mode)

Check if `./foreplay ads board/` already exists. If it does, this is a re-run: the goal is to ADD ads, not start over.

- List all existing filenames under each subfolder. Filenames carry the `ad_id` (e.g. `arrae_764d_IMG_666338208158314.jpg` gives `ad_id = 666338208158314`). Extract every existing `ad_id` into an in-memory `EXISTING_AD_IDS` set.
- Also build an `EXISTING_CREATIVE_KEYS` set: record `{brand_slug}` and (where recoverable from the README) the `{link_url stem}` per existing file. This feeds the near-duplicate check in Phase 5.
- Surface this to the user before pulling:

> "Existing ad board detected with [N] ads across [M] subfolders. Re-run mode: I'll add new ads to existing buckets, skip any ad_id already on disk, and dedupe near-identical creative (same brand + same product link). Bucket caps (~5 max per bucket) still apply, so once a bucket is full I won't add more there."

- In Phases 4, 5, and 6, every new candidate must pass dedupe against both sets before being downloaded.

### 0.4 `curl` available?

Required for downloading ad media. Only check if downloads fail later.

### 0.5 Foreplay niche-filter health probe

Some Foreplay accounts have a broken or empty `niches` index: discovery returns 0 results no matter the query. Run ONE cheap probe before committing to a discovery-heavy plan:

```
Foreplay.search_discovery_ads(
  niches=[<brand niche, e.g. "health/wellness">],
  running_duration_min_days=30,
  limit=5,
  field_preset="summary"
)
```

- **0 results:** the niche index is dead on this account. Set internal flag `NICHE_DISCOVERY_DEAD = true`. In Phase 4, skip niche-discovery queries entirely and pull exclusively from competitor `brand_ids`. Surface this to the user in Phase 2:

> "Heads up: Foreplay niche discovery is returning 0 results on this account, so I'll pull strictly from the resolved competitor brand_ids. Total ads will likely be ~25-35 instead of 50, and bucket gaps are expected."

- **5+ results:** niche discovery is healthy. Proceed normally.

(If the brand niche isn't known yet because Phase 1 hasn't run, defer the probe until right after Phase 1 confirms the brand. It must run before Phase 4 either way.)

---

## Phase 1: Brand Identification

### 1a. Auto-scan for a brand brain

Check these paths in order, stop at the first hit:

```bash
ls "./brand-brain.md" 2>/dev/null
ls "./brand-brain/" 2>/dev/null
ls "./"*brand-brain*.md 2>/dev/null
ls ./brands/*/brand-brain/ 2>/dev/null
```

If found, read it (or the `README.md` / `brand-guidelines.md` inside if it's a folder) and confirm:

> "Found a brand brain for **[Brand Name]** at `[path]`. Here's what I see:
> - **Category:** [vertical, e.g. clean haircare DTC]
> - **Hero product:** [SKU + price]
> - **ICP:** [target persona, 1 line]
> - **Known competitors** (if in brain): [list]
>
> Build the ad board for this brand?"

**HARD GATE:** wait for confirmation. If the brand brain belongs to a different brand than the one the user is asking about, ask before proceeding; never silently use Brand A's brain for a Brand B board.

If confirmed → Phase 2.

### 1b. No brand brain found

> "I couldn't find a brand brain in your current directory or the standard locations. Two options:
>
> 1. Paste your brand's website URL and I'll scrape the basics now (works for this run, but I won't have it next time).
> 2. Run /brand-brain first to build a permanent brand knowledge folder, then come back here.
>
> Which do you want?"

If option 1, take the URL, fetch with an available web-reading tool, summarize the basics (category, hero product, voice, ICP), and proceed. If option 2, hand off and stop.

---

## Phase 2: Finalize the Category List

The default category set (subfolders to be created under `./foreplay ads board/`):

| # | Folder name | What goes here |
|---|---|---|
| 1 | `before-after` | Transformation hooks, split-screen ads, "month 1 vs month 3" |
| 2 | `bundles` | Multi-product sets, kits, trios, duos, "complete routine" |
| 3 | `gif-ads` | Short looping animations, GIF-style statics, micro-video loops |
| 4 | `gifting` | Holiday gift positioning (Mother's Day, Father's Day, Valentine's, Xmas, birthday) |
| 5 | `offers-sale` | Discount promos, BOGO, % off, "save $X", scarcity offers |
| 6 | `problem-solution` | "Tired of X? Try Y" framing, pain-point hooks |
| 7 | `product-highlight` | Single-product hero ads, ingredient call-outs, feature spotlights |
| 8 | `static-ads` | Static image ads (any angle), pull-quote statics, editorial layouts |
| 9 | `testimonials-reviews` | Customer reviews, 5-star call-outs, founder reading reviews |
| 10 | `ugc` | UGC talking-head (real person speaking AT camera, native phone footage) |
| 11 | `us-vs-them` | Comparison ads, "vs the competitor", "instead of", differentiation |

**Vertical-conditional category:**

| Folder | Rule |
|---|---|
| `supplements` | ONLY include if the brand is itself a supplements / vitamins / nutrition / ingestibles brand. Use the brand brain's category field to decide. For a brand in another category, the 12th bucket is named for that category instead (`cookware`, `outerwear`, `skincare`), filled from the brand's direct competitors. |

**Hardcoded exclusion:** Do NOT create a `training_board` folder. It was in the source category list but is excluded by design. Permanently.

### Decision logic

```
categories = [before-after, bundles, gif-ads, gifting, offers-sale,
              problem-solution, product-highlight, static-ads,
              testimonials-reviews, ugc, us-vs-them]

if brand_vertical matches /supplement|vitamin|nutrition|ingestible|powder|gummy|capsule/i:
    categories.append("supplements")
```

### Surface the final list to the user (every run, including re-runs)

> "Final category list for **[Brand]** ([N] subfolders):
> [bulleted list]
>
> Distribution: ~4 ads per bucket, ~[N x 4] total downloads.
> Mix of live and ended ads, minimum 7 days running.
>
> Which do you want me to populate? Reply with one of:
> A) **All of them** (default, recommended for first runs and broad inspiration)
> B) **Pick a subset**: tell me which buckets (e.g. 'just UGC, before-after, and testimonials')
> C) **All + custom additions**: tell me extra ad types you want me to find (e.g. 'add founder POV ads, add ASMR-style hooks')
> D) **Subset + custom additions**: combine B and C
>
> [If NICHE_DISCOVERY_DEAD: include the heads-up message from Phase 0.5 here.]
> [If RE-RUN MODE: 'Existing board has [X] ads. New ads will be ADDED to existing buckets, never replacing them.']"

Parse the response into the final `RUN_BUCKETS` list:

- **A** → all default buckets.
- **B** → only the named buckets. Validate each name against the default list. Confirm back.
- **C** → default + custom buckets.
- **D** → user's subset + custom additions.

For every custom bucket (C or D), capture three things before moving on:
1. **Bucket name** (kebab-case, becomes the subfolder name).
2. **One-sentence definition** of what creative belongs there (used in Phase 4.5 classification).
3. **Source-vertical hints** if any (used for Phase 4.6 adjacent expansion).

**HARD GATE:** wait for explicit confirmation on the final bucket list before Phase 3.

---

## Phase 3: Build the Competitor + Discovery Source List

You need a pool of ~10-15 brands to pull from. Source priority:

1. **Brand brain `competitors.md`** (if folder structure): read the named competitors directly. Don't re-derive.
2. **Brand brain `brain.md`** competitor section (if single-file): extract named competitors.
3. **Foreplay discovery by niche**: use `search_discovery_ads` with the brand's vertical mapped to a Foreplay niche (see Niche Map below). Skip this source if `NICHE_DISCOVERY_DEAD`.
4. **Foreplay `discover_brands_by_ads`**: for surfacing additional competitors if the brand brain list is thin.

### Foreplay niche map (controlled list)

| Brand vertical | Foreplay niche |
|---|---|
| Beauty / cosmetics / skincare / haircare | `beauty` |
| Supplements / nutrition / wellness ingestibles | `health/wellness` |
| Fitness apparel / activewear | `fashion` + `health/wellness` |
| Apparel / clothing / footwear | `fashion` |
| Food / beverage / cooking | `food/drink` |
| Home / kitchen / cleaning / decor | `home/garden` |
| Pets / pet products | `pets` |
| Baby / kids products | `kids/baby` |
| Jewelry / watches | `jewelry/watches` |
| Accessories / bags / sunglasses | `accessories` |
| App / SaaS | `app/software` |
| Education / courses | `education` |

If the brand vertical doesn't map cleanly, pick the closest and supplement with a free-text `query` filter.

### Resolve competitors to brand_ids

For each named competitor, resolve to a Foreplay `brand_id` in parallel:

```
Foreplay.get_brands_by_domain(domain="competitor.com")
```

Fallback to `search_discovery_brands(query="[brand name]")` if no domain.

Cache the brand_id → name mapping for filename construction later.

### Brand-own exclusion (the most-missed rule)

The board is competitor / adjacent-brand inspiration. The brand being researched is the AUDIENCE for the board, not a source. Never include the brand's own ads.

- Resolve the brand's own `brand_id` (via `get_brands_by_domain` on the brand's domain) and add it to a `SELF_BRAND_IDS` set. Some brands have multiple Foreplay records (regional/duplicate pages): capture them all.
- Filter every ad result, in every pull, where `ad.brand_id ∈ SELF_BRAND_IDS`. Reject silently before any classification or download decision.
- This applies to niche-discovery pulls AND competitor brand_id pulls, even if a confused user pastes their own brand into the competitor list. Strip it.
- Rationale: the user already has their own ads (in Foreplay's own UI, the brand's saved Foreplay board, or local files like `Ads From Foreplay/`). A swipe board's job is to surface what OTHER brands are doing.

---

## Phase 4: Pull Ads Per Category

Instead of one giant corpus + classifier, run **per-category queries**. This gives much higher hit rates than trying to classify a single mixed pool.

For each category in `RUN_BUCKETS`, run a targeted Foreplay query in parallel. Goal: 8-12 candidates per bucket so you have headroom to pick the best ~4.

**Shared filters across all queries:**

```
running_duration_min_days=7   # Longevity floor, same as foreplay-creative-strategy
limit=15
order="longest_running"
field_preset="summary"
publisher_platform=["facebook", "instagram", "tiktok"]
```

Do NOT filter `live="true"`. Include both live and ended ads.

### If NICHE_DISCOVERY_DEAD

Skip every `search_discovery_ads` row in the playbook below. Run ONLY the competitor-anchored pull (raise its `limit` to 100) and classify the results into buckets using Phase 4.5 + Appendix A. Phase 4.6 still works in this mode because adjacent expansion uses `get_ads_by_brand_ids`, which does not touch the niche index. Expect a ~25-35 ad board and say so in the final summary.

### Per-category query playbook

| Bucket | Query strategy |
|---|---|
| **before-after** | `search_discovery_ads(niches=[<brand niche>], query="before after transformation", display_format=["video","image"], ...)` |
| **bundles** | `search_discovery_ads(niches=[<brand niche>], query="bundle kit set trio routine", display_format=["video","image"], ...)` |
| **gif-ads** | `search_discovery_ads(niches=[<brand niche>], display_format=["gif"], ...)`. If `gif` is not a valid display_format in the MCP, fall back to short-duration images (`display_format=["image"]`) and tag heuristically. |
| **gifting** | `search_discovery_ads(niches=[<brand niche>], query="gift mothers day fathers day valentines christmas holiday", ...)`. Adapt seasonal query to current month if relevant. |
| **offers-sale** | `search_discovery_ads(niches=[<brand niche>], query="off sale save discount BOGO limited", ...)` |
| **problem-solution** | `search_discovery_ads(niches=[<brand niche>], query="tired struggle stop frustrated", display_format=["video"], ...)` |
| **product-highlight** | Pull from competitor brand_ids directly via `get_ads_by_brand_ids(brand_ids=[...], display_format=["video","image"], limit=15, order="longest_running")`. Filter for single-product focus during selection. |
| **static-ads** | `get_ads_by_brand_ids(brand_ids=[...], display_format=["image"], limit=15, order="longest_running")` + `search_discovery_ads(niches=[<brand niche>], display_format=["image"], ...)` |
| **supplements** (if applicable) | `search_discovery_ads(niches=["health/wellness"], query="supplement vitamin daily", ...)` |
| **testimonials-reviews** | `search_discovery_ads(niches=[<brand niche>], query="review customer 5 stars I tried honest", display_format=["video","image"], ...)` |
| **ugc** | `search_discovery_ads(niches=[<brand niche>], query="I tried this honest review", display_format=["video"], ...)` |
| **us-vs-them** | `search_discovery_ads(niches=[<brand niche>], query="vs versus instead compared difference", ...)` |

Run all category pulls **in parallel** (single message with multiple Foreplay tool calls). This is the longest step; parallelizing it is essential.

### Hard filters BEFORE classification

Apply these to every candidate ad as it comes back, from every source (discovery, competitor pull, adjacent expansion). Reject silently. Do not classify, do not stage, do not download.

**1. Blog-link previews (NOT designed ad creative).** Foreplay scrapes the OG thumbnail from the `link_url`, which for blog ads is a stock photo, not the actual ad. Skip any ad where `link_url` matches any of:

- `/blog/` `/blogs/`
- `/article/` `/articles/`
- `/post/` `/posts/`
- `/learn/` `/learning/`
- `/guide/` `/guides/`
- `/how-to/` `/how-to-`
- `/journal/` `/magazine/`
- `/news/` `/story/`
- `/p/` (Instagram permalink, see filter #2)

Example of what to reject: `link_url = "https://www.humnutrition.com/blog/causes-of-body-odor"`. The `image` will be a stock armpit photo, not a designed ad. Skip it even if `running_duration.days > 500`.

**2. Organic-creator boosted posts (NOT brand DTC creative).** `search_discovery_ads` surfaces creator/educator/dietitian Instagram posts that were boosted with paid spend. They read as "ads" in Foreplay but they're not the polished DTC creative the user wants on a swipe board. Skip when ALL three are true:

- `link_url` contains `instagram.com/p/` (organic IG permalink, not a product page), AND
- `name` (brand or creator name) looks like a personal handle: lowercase, contains a period or underscore, no spaces, or is a single first name (e.g. `jennythedietitian`, `dr.jaban.moore`, `theaubreymarie`, `thebalanceroutine`), AND
- No clear single-product call-out in the `description` (it reads like an educational reel, listicle, or tip post).

Note: legit influencer UGC for a brand (e.g. `jorryfitt` posting an Arrae ad with `link_url = arrae.com/pages/clear-protein`) is FINE. The `link_url` points to a product page, not an IG permalink. This filter targets boosted organic content only.

**3. Publisher / domain exclusions.** Skip any ad where the resolved `brand` has `niches=["Media/News"]`, `category="Publisher"`, or `category="Personal blog"`. Content publishers are not DTC brands.

**4. Missing media.** Skip if both `video` and `image` are null (some Foreplay records are stale).

**5. Self-brand.** Skip if `ad.brand_id ∈ SELF_BRAND_IDS` (Phase 3 rule, restated because it applies here).

**6. Already on disk (re-run mode).** Skip if `ad_id ∈ EXISTING_AD_IDS`.

### Cross-pool from competitor brand pulls

In parallel with the niche-discovery calls above, also run a competitor-anchored pull:

```
Foreplay.get_ads_by_brand_ids(
  brand_ids=[<all resolved competitor brand_ids>],
  running_duration_min_days=7,
  display_format=["video","image"],
  limit=50,
  order="longest_running",
  field_preset="summary"
)
```

This becomes a secondary classifier pool: when a niche-discovery bucket comes up thin (<4 candidates), pull from this competitor pool and classify into the bucket using the heuristics in Appendix A.

---

## Phase 4.5: Per-Ad Visual Inspection + Bucket Classification (MANDATORY)

The job here is NOT to reject ads. The job is to look at the actual creative (the image or video) and put it in the bucket where it ACTUALLY belongs.

The query that surfaced an ad is a hint, not a verdict. A "gift" query can surface a "treat yourself" ad. That ad isn't junk: it's a self-care ad, and it belongs in `product-highlight` or `static-ads`, not `gifting`. Move it; don't toss it.

### What "look at the creative" means

For every candidate that survived the Phase 4 hard filters:

1. **Pre-download the media file** to `./foreplay ads board/.staging/`. For images, that's the full creative. For videos, that's the `thumbnail` (single frame, small download).
2. **View the actual image with an available visual-inspection tool.** Inspect layout, product, people, text overlay and visual mood. A text-only file read or filename is not visual inspection; if pixels cannot be inspected, state the limitation and do not mark classification complete.
3. **Combine the visual with the ad copy** (`description`, `headline`, `link_url`). Visual = format and feel. Copy = offer and angle. Together = bucket.
4. **For ambiguous video cases** (sparse description + non-decisive thumbnail), optionally escalate to Gemini Video API if the user has it set up (chain via `/foreplay-creative-strategy` plumbing). Opt-in, not default; descriptions + thumbnails resolve most cases.

### The bar: two independent questions

For each ad, ask two separate questions:

1. **Quality (inclusion test):** is this a high-performing, high-converting, great-looking ad worth dropping into a swipe board for ANY DTC brand? An ad makes the cut if it's all three:
   - High-performing or long-running (already filtered by `running_duration_min_days >= 7` + `order=longest_running`).
   - Visually polished or distinctly on-strategy (clean design OR clear UGC intent OR clear DR intent, not slop).
   - Useful inspiration for ANY DTC brand, not just the end user's. The widest possible swipe board.
2. **Fit (classification test):** which bucket in `RUN_BUCKETS` does it best fit?

Quality = inclusion. Fit = classification. They're independent. Most ads that survived the Phase 4 hard filters pass the quality bar. Don't be precious; the point is curation across many buckets, not gatekeeping. Genuine non-creative content (blog OG thumbnails, organic creator boosts, publisher pages) was already filtered upstream.

### Classification guide (where ads BELONG)

An ad surfaced by one query often belongs in a different bucket. That's normal, not a problem.

| Visual + copy signals | Best bucket |
|---|---|
| Split-screen, time language ("month 1 vs month 3", "after 12 weeks"), transformation outcome shown | `before-after` |
| Multiple SKUs in frame, kit/set/duo/trio wording, "complete routine" | `bundles` |
| Short loop motion, animated text reveal, dissolving/morphing product, micro-video under 4 sec | `gif-ads` |
| Recipient framing ("for her", "Mother's Day gift", "give the gift of"), gift-guide URL, holiday packaging shown | `gifting` |
| "Treat yourself", self-care lifestyle, NO recipient framing | `product-highlight` or `static-ads` (NOT gifting, but still a great ad worth keeping) |
| Percent off, BOGO, sale countdown, discount code visible, "save $X" | `offers-sale` |
| Pain-statement opener + branded product as the fix in same ad | `problem-solution` |
| Educational reel from a dietitian / doctor / creator with NO branded product fix | `ugc` (creator content); if the brand is referenced, `product-highlight` may fit better, pick by visual format |
| Single SKU hero, ingredient call-out, feature spotlight | `product-highlight` |
| Pull-quote layout, editorial typography, designed static (no animation) | `static-ads` |
| Customer quote + name + product reference | `testimonials-reviews` |
| Polished brand-produced creative with actor model, scripted, high production | `product-highlight` (NOT ugc; real UGC is phone-vertical, first-person) |
| Phone-vertical footage, hand-held shake, real-person direct-to-camera | `ugc` |
| Direct comparison framing front-and-center ("vs X", "instead of Y", "why ours beats theirs") | `us-vs-them` |
| Long-copy DR sales letter that mentions competitors only in passing | `product-highlight` (NOT us-vs-them, but still a valid ad) |
| Daily-routine wording, branded actives named, supplement positioning | `supplements` (if the bucket is in `RUN_BUCKETS`; otherwise `product-highlight`) |
| Matches a custom bucket the user added in Phase 2 | the user's custom bucket; use their 1-sentence definition |

If an ad fits two buckets equally well, pick the more SPECIFIC one (e.g. a testimonial-style video for a specific SKU goes in `testimonials-reviews`, not `product-highlight`).

### When (and only when) to reject at 4.5

Rare. The Phase 4 hard filters already catch non-creative content. Phase 4.5 rejections are limited to:

- Corrupted file, missing assets, placeholder content.
- Ad genuinely off-strategy for ANY DTC brand, so no bucket fits (extremely rare).

If you're tempted to reject for "this doesn't fit the bucket I thought it would", that's a CLASSIFICATION error, not a rejection signal. Move it to the right bucket.

### Bucket audit after classification

Audit every bucket. **Every bucket must reach at least 4 sanity-check-passing ads.** If any bucket has fewer than 4 (after dedup, brand cap, near-duplicate rejection), do NOT leave it thin and do NOT pad it. Escalate to Phase 4.6.

Two failure modes to avoid in equal measure:

- **Fake coverage:** padding a thin bucket with the primary pool's borderline ads to hit a count. Produces a bad swipe board.
- **Lazy gaps:** giving up at the primary pool and leaving buckets empty. The skill's job is to find good ads, not to declare the brand's category "doesn't have them."

---

## Phase 4.6: Adjacent-Category Expansion (MANDATORY when any bucket has <4 candidates)

Trigger: after the Phase 4.5 audit, any bucket with fewer than 4 surviving candidates. Goal: every bucket reaches at least 4 ads.

### Why expansion exists

Some archetypes are owned by specific DTC verticals and won't appear in the brand's strict competitor pool. Supplements broadly avoid before-after (FDA risk on weight-loss imagery), gifting positioning (personal-purchase category), and gif-format motion creative. Jewelry brands rarely run problem-solution. Skincare doesn't do us-vs-them.

The solution is not "leave the bucket empty": pull from the DTC vertical that actually runs that archetype. What makes an ad from a neighbouring category relevant is that it is shown to the same kind of buyer as the brand's own (read the brand's avatars; do not assume who they are). The user is studying creative archetypes, not the brand's SKU category.

### Adjacent-category playbook

| Bucket | Adjacent verticals that own this archetype | Example brands to resolve |
|---|---|---|
| `before-after` | hair growth, teeth whitening, anti-aging skincare, acne skincare | Vegamour, Nutrafol, Hairburst, SNOW, Crest, Crepe Erase, Curology, Bubble, Hero Cosmetics |
| `gifting` | jewelry, premium beauty gift sets, candles, loungewear/PJs | Mejuri, Aurate, Catbird, Tatcha, Drunk Elephant, Glossier, Lake, Otherland, Boy Smells |
| `gif-ads` | better-for-you food/drink (high motion in feed), tech gadgets | Olipop, Liquid Death, Magic Spoon, Poppi |
| `us-vs-them` | better-for-you food (vs legacy), pharma alternatives, DTC vs incumbent | Olipop (vs Coke), Magic Spoon (vs cereal), Hers/Roman (vs Pfizer), Quip (vs traditional) |
| `testimonials-reviews` | medical DTC, prestige supplements, gut health | Hers, Roman, AG1, Seed, Curology |
| `ugc` | creator-heavy beauty, Gen-Z DTC | Glossier, Rare Beauty, e.l.f., Sunday Riley, Bloom |
| `problem-solution` | medical DTC, sleep, gut health, skincare for acne/eczema | Hers, Roman, Curology, Headspace, Magic Spoon |
| `bundles` | prenatal/perinatal supplements, skincare routines, wellness kits | Needed., Tatcha, Glossier, Drunk Elephant |
| `static-ads` | premium DTC with strong editorial design | Tatcha, Glossier, Aesop, Drunk Elephant, Mejuri |
| `offers-sale` | any DTC with frequent discount cycles | (every brand; the primary pool usually delivers this) |
| `product-highlight` | (usually delivered by the primary pool) | (n/a) |
| `supplements` | (only applies when the brand IS a supplements brand) | (n/a) |

For custom buckets, use the source-vertical hints captured in Phase 2.

### How to run the expansion

1. **Audit which buckets are under-filled.** Target = 4 per bucket.
2. **Resolve adjacent-vertical brand_ids in parallel** via `get_brands_by_domain` against the example brands above (or others you know match). Add to a temporary `ADJACENT_BRAND_IDS` set.
3. **Pull ads from `ADJACENT_BRAND_IDS` in parallel** with `get_ads_by_brand_ids`: `display_format=["image","video"]`, `running_duration_min_days=7`, `order="longest_running"`, `limit=30`, `field_preset="summary"`.
4. **Apply ALL Phase 4 hard filters:** SELF_BRAND_IDS exclusion, blog-link rejection, organic-creator IG rejection, publisher exclusion, missing-media skip, EXISTING_AD_IDS skip, near-duplicate dedup.
5. **Re-run the Phase 4.5 sanity check** on adjacent-pool candidates. Same fit bar: a hair-growth ad without time + outcome + visible transformation language is still rejected from `before-after`.
6. **Fill under-filled buckets up to 4.** The per-brand cap (max 2 per bucket) may be RELAXED to 4 from a single brand here, and only here, if that vertical is the only delivering source (e.g. gifting often ends up dominated by Vegamour gift-guide ads because no other vertical runs explicit gift framing in cold paid). Disclose any brand concentration in the README.
7. **Loop once if still under-filled.** Expand the brand list (secondary verticals from the playbook, or `search_discovery_ads` with the relevant niche if discovery is healthy). Do NOT loop more than twice total. After two rounds, accept the under-population and flag it as a real category gap in the README.

### Expansion guardrails

- Does NOT lower the sanity-check bar. A "treat yourself" Vegamour ad is still rejected from `gifting` even though Vegamour is on the gifting adjacent list. Expansion changes the SOURCE pool, not the FIT bar.
- Does NOT include the brand's own ads. `SELF_BRAND_IDS` still applies.
- Does NOT re-download anything in `EXISTING_AD_IDS`. Re-run mode still applies.
- Does NOT misclassify hair-growth ads as supplements (or any cross-bucket misclassification). The bucket's archetype definition is fixed.

---

## Phase 5: Select + Dedupe

For each bucket, you now have 4-15 candidates after the sanity-check pass. Pick the final ~4 per bucket using this priority:

1. **Days running, descending.** Longest-runner first.
2. **Format diversity within the bucket.** If 4 candidates are all UGC talking-heads in `problem-solution`, swap one for a static problem-solution layout.
3. **Brand diversity.** No more than 2 ads from the same brand in any single bucket. In the primary pool this is a hard rule: if only 2 viable ads exist for a bucket, do not add a 3rd from the same brand, escalate to Phase 4.6 instead. The only sanctioned relaxation (up to 4 from one brand) happens inside Phase 4.6 step 6, with README disclosure.
4. **Verbal alignment with the bucket.** If the ad's `description` clearly fits a different bucket better, move it. Run this cross-bucket pass once across all buckets.

### Minimum-4 rule (read twice)

**Every bucket must reach at least 4 ads.** If a bucket has fewer than 4 after the primary pool + sanity-check, Phase 4.6 is mandatory before Phase 5 completes.

DO:
- Pull from adjacent-vertical brands when the primary pool comes up short. The archetype matters for inspiration, not the SKU category.
- Relax the per-brand cap to 4 (Phase 4.6 only) if a single vertical is the only delivering source. Disclose in the README.
- Treat "this category doesn't run that archetype" as a trigger to escalate, not a stopping condition.

DO NOT:
- Stretch a borderline ad from the primary pool into the bucket to hit the count.
- Re-classify an ad you already rejected at sanity-check just because the target bucket is empty.
- Loop the expansion more than twice. After two adjacent-vertical rounds, accept the gap and document it in the README as a real category-level absence (rare: most archetypes are findable in adjacent verticals).

The floor matters because under-populated buckets read as "the skill didn't try hard enough." Honest gaps are still surfaced in the README, but as an outcome of exhausted search, not default behavior.

### Gifting-specific reminder

Gifting is the bucket most often padded with the wrong thing. Require explicit gift framing in the description: "gift", "for him", "for her", "gift idea", "Mother's Day gift", "Father's Day gift", "stocking stuffer", "give the gift of", "perfect present", "shop for [recipient]", "give her", "give him". Brand-awareness ads that just mention a holiday do NOT qualify. "Treat yourself" does NOT qualify (self-care is the opposite of gifting). If the primary pool can't deliver 4 ads with explicit gift framing, escalate to Phase 4.6 and pull from jewelry (Mejuri, Aurate), premium beauty (Tatcha, Glossier, Drunk Elephant), candles (Otherland, Boy Smells), or hair-beauty gift guides (Vegamour). Don't leave the bucket empty; pull from where the gifting creative actually lives.

### Global dedup rules

**Same `ad_id` never appears in two buckets.** If an ad matches multiple buckets, place it where it fits best (Appendix A).

**Re-run dedup (skip ad_ids already on disk):** if `EXISTING_AD_IDS` was populated in Phase 0, reject any candidate whose `ad_id` is in the set BEFORE allocating it to a bucket. A re-run grows the board with fresh ads; it never re-downloads.

**Near-duplicate dedup (within a single run AND across re-runs):** Foreplay's database often has multiple `ad_id`s for the same underlying creative (Meta duplicates ad IDs when an ad is rebuilt or recopied for a new campaign). Different `ad_id`s with the same brand and the same `link_url` (or same description) are functionally one ad on a swipe board.

Reject a candidate as a near-duplicate if any of these match an already-selected ad (this run) OR an already-on-disk ad (re-run mode, via `EXISTING_CREATIVE_KEYS`):
- Same `brand_id` AND identical normalized `link_url` (strip query strings / fbclid params before comparing).
- Same `brand_id` AND first 80 characters of `description` match (after stripping HTML and `<br />` tags).
- Same `image` URL (Foreplay's R2 hash): definitive duplicate, same media file.

Keep the longest-running version, reject the rest. Don't fill the freed slot with another near-duplicate from the same brand for the same product; pick a different brand or a different product angle.

### Allocation math (50-total splits)

- 11 categories (no supplements): 6 buckets get 5 ads, 5 buckets get 4 ads → 50 total.
- 12 categories (with supplements): 2 buckets get 5 ads, 10 buckets get 4 ads → 50 total.

Allocate the extra slots to whichever buckets had the strongest candidate pool (most options at 60+ days running). If `NICHE_DISCOVERY_DEAD`, the realistic total is ~25-35; keep the per-bucket minimum-4 ambition but accept documented gaps after the two expansion rounds.

---

## Phase 6: Download the Files

Create the folder structure first:

```bash
mkdir -p "./foreplay ads board"
mkdir -p "./foreplay ads board/before-after"
mkdir -p "./foreplay ads board/bundles"
# ...one mkdir per finalized category
```

For each selected ad, download the actual media file using `curl`. Run downloads in parallel batches of 5-10 to avoid hammering Foreplay's R2 CDN. Never download serially.

### Filename convention

```
{BrandSlug}_{Days}d_{Format}_{AdIdShort}.{ext}
```

Where:
- `BrandSlug` = lowercase brand name, kebab-cased, max 25 chars (e.g. `salee-hair`, `vuori`, `hims`)
- `Days` = `running_duration.days` from the ad record (e.g. `240`)
- `Format` = short format tag: `VID`, `IMG`, `CAR` (carousel), `GIF`, `DCO`
- `AdIdShort` = first 8 chars of the Foreplay `ad_id` for cross-reference
- `ext` = `.mp4` for video, `.jpg` for static (use whatever extension Foreplay's URL ends with; preserve it)

**Examples:**
- `salee-hair_540d_VID_a0vobjQ9.mp4`
- `hims_385d_IMG_xQ2nB7p1.jpg`
- `vuori_120d_GIF_lk93nQ2x.gif`

### Download command pattern

For videos (use the `video` field from the Foreplay ad object):

```bash
curl -L -s -o "./foreplay ads board/<bucket>/<filename>.mp4" "<video_url>"
```

For statics (use the `image` field, or `thumbnail` if `image` is null):

```bash
curl -L -s -o "./foreplay ads board/<bucket>/<filename>.jpg" "<image_url>"
```

Use `-L` to follow redirects (R2 sometimes redirects). Use `-s` for silent (you'll surface a single progress line per bucket in chat).

### Error handling

- If `curl` returns non-zero or the file size is suspiciously small (<10KB for video, <2KB for image), retry once. If it fails twice, log the ad as "download failed" in `./foreplay ads board/.download-errors.txt` and the final summary, with the Foreplay URL so the user can grab it manually.
- If an ad's `video` field is null but it's a video ad (display_format=video), try the `thumbnail` field as a static fallback and tag the filename `_THUMB`.
- Never fabricate URLs. Download ONLY from the `video`, `image`, or `thumbnail` fields returned by Foreplay. If both `video` and `thumbnail` are null, skip the ad and pull a replacement from the secondary pool.
- Clean up `./foreplay ads board/.staging/` after final downloads complete.

### Progress messaging

One short status line per bucket completing, e.g.:

> "Downloaded 4/4 in ugc. Moving to before-after."

Do not narrate every individual file.

---

## Phase 7: Final Summary + README

After downloads complete, run a quick verification:

```bash
find "./foreplay ads board" -type f \( -name "*.mp4" -o -name "*.jpg" -o -name "*.png" -o -name "*.gif" \) | wc -l
du -sh "./foreplay ads board"
```

Then surface a clean summary in chat (no em dashes):

```
Foreplay ad board ready: ./foreplay ads board/

Brand: [Brand Name] ([vertical])
Total ads downloaded: [N] across [M] subfolders
Total size: [X] MB

Distribution:
- before-after: 4 ads (3 video, 1 static)
- bundles: 4 ads (2 video, 2 static)
- gif-ads: 4 ads (4 gif)
- gifting: 4 ads (3 video, 1 static)
- offers-sale: 5 ads (3 video, 2 static)
- problem-solution: 4 ads (4 video)
- product-highlight: 4 ads (2 video, 2 static)
- static-ads: 5 ads (5 static)
- testimonials-reviews: 4 ads (3 video, 1 static)
- ugc: 4 ads (4 video)
- us-vs-them: 4 ads (3 video, 1 static)
[+ supplements row if applicable]

[If any buckets under-populated after two Phase 4.6 rounds:]
Notes:
- gif-ads had only 2 candidates after two adjacent-vertical expansion rounds; documented gap.
- 1 download failed (logged in ./foreplay ads board/.download-errors.txt)
[If NICHE_DISCOVERY_DEAD: note that discovery was dead on this account and the board is competitor-anchored only.]

Next: open the folder and look through it, or add the ads you want as references in the app.
```

### README.txt spec

Write `./foreplay ads board/README.txt` so the folder is self-documenting. It must include:

- Date the board was built and the brand brain it was anchored to (path).
- The filename convention (`{BrandSlug}_{Days}d_{Format}_{AdIdShort}.{ext}`).
- What each bucket is for (one line each).
- Per-ad index: bucket, filename, brand, days running, `link_url` (this is what makes `EXISTING_CREATIVE_KEYS` recoverable on re-runs).
- Any brand-concentration disclosures from Phase 4.6 (e.g. "gifting: 4/4 from Vegamour; only vertical delivering explicit gift framing").
- Any documented category gaps and why (two expansion rounds exhausted, or niche discovery dead).
- No em dashes anywhere in the file.

---

## Appendix A: Bucket Classification Heuristics

Used when classifying ads from the competitor-anchored secondary pool (Phase 4 fallback, or the only pool when `NICHE_DISCOVERY_DEAD`) into a bucket, or during the cross-bucket pass (Phase 5).

| Bucket | Positive signals |
|---|---|
| `before-after` | description contains: "before", "after", "transformation", "month 1", "week 4", "results", "what happened" |
| `bundles` | description contains: "bundle", "set", "kit", "trio", "duo", "starter", "complete routine", "system" |
| `gif-ads` | `display_format` is `gif` OR short looping image OR `video_duration < 4` seconds with no spoken audio |
| `gifting` | description contains: "gift", "mother's day", "father's day", "valentine's", "christmas", "holiday", "birthday", "her", "him", "perfect for" + person noun |
| `offers-sale` | description contains: "off", "save", "$ off", "% off", "sale", "BOGO", "limited time", "ends", "free shipping", "today only" |
| `problem-solution` | description starts with: "tired of", "struggling with", "if you have", "stop", "fix", "solve", "the truth about", "do you" + pain word |
| `product-highlight` | Single-product focused. Description mentions one SKU repeatedly, ingredient/feature call-out, "introducing", "meet the" |
| `static-ads` | `display_format` is `image` AND no animation signals |
| `supplements` | brand vertical = supplements AND description mentions: "daily", "blend", "formula", "ingredients", "support", "serving", "scoop" |
| `testimonials-reviews` | description contains: "review", "rated", "stars", "customer said", "I tried", "honest", "I was skeptical", "quoted in", "as seen on" |
| `ugc` | `display_format` = video AND visual cue of person speaking to camera (vertical 9:16, native iPhone aesthetic, talking head). Heuristic when no transcript: video duration 15-60s + description starts with first-person ("I", "my", "we") |
| `us-vs-them` | description contains: "vs", "versus", "instead of", "compared to", "why we're different", "competitor", brand-vs-brand callouts |

When in doubt between two buckets:
- Format buckets (`static-ads`, `gif-ads`, `ugc`) lose to angle buckets (`problem-solution`, `before-after`, `testimonials-reviews`): angle is more useful for inspiration.
- Exception: `static-ads` wins if the ad has no clear angle signal.

---

## Appendix B: Foreplay Field Reference

Use this when reading Foreplay MCP responses. Source: [`foreplay-creative-strategy/references/foreplay-mcp-mapping.md`](../../foreplay-creative-strategy/foreplay-creative-strategy/references/foreplay-mcp-mapping.md).

| Need | MCP field |
|---|---|
| Days running | `running_duration.days` |
| Live status | `live` (bool) |
| Video URL | `video` |
| Image URL | `image` |
| Thumbnail (fallback) | `thumbnail` |
| Ad copy | `description` |
| Format | `display_format` (`video`, `image`, `carousel`, `gif`, `dco`) |
| Brand name | `brand` or `brand_name` |
| Brand ID | `brand_id` |
| Ad ID | `ad_id` (platform) or `id` (Foreplay internal) |
| Foreplay detail URL | `https://app.foreplay.co/discovery?ad=<ad_id>` |
| Landing page | `link_url` |

---

## Failure Modes to Avoid

Setup and gates:
- DO NOT skip the Foreplay MCP check. If it's not connected, stop and tell the user; don't web-search ads as a substitute.
- DO NOT skip the Phase 0.5 niche-filter health probe. If discovery is dead on this account, surface it upfront so the user knows to expect a smaller, competitor-anchored-only board (~25-35 ads).
- DO NOT proceed past Phase 2 without explicit user confirmation of the final category list.
- DO NOT use a brand brain from a different brand than what the user is asking about. If you find one for Brand A but they're asking about Brand B, ask before proceeding.

Sourcing and filtering:
- DO NOT download blog-link previews. If `link_url` matches any pattern in Phase 4 hard filter #1 (`/blog/`, `/article/`, `/post/`, `/learn/`, `/guide/`, `/how-to/`, `/journal/`, `/magazine/`, `/news/`, `/story/`, `/p/`, and plurals/variants), the `image` field is the OG thumbnail of the blog post, NOT a designed ad creative.
- DO NOT download organic-creator IG-permalink posts (`link_url` contains `instagram.com/p/` + personal-handle name + no product call-out). These are creator posts boosted with paid spend, not DTC creative. Influencer UGC linking to a product page is fine.
- DO NOT include ads from publishers, media/news pages, or personal blogs (Phase 4 hard filter #3).
- DO NOT include the brand's own ads. Resolve `SELF_BRAND_IDS` and filter every pull. The board is built FOR the brand, sourced from OTHER brands.
- DO NOT download from any URL except the `video`, `image`, or `thumbnail` fields returned by Foreplay. Never fabricate or guess URLs.
- DO NOT silently filter `live=true`. Both live and ended ads are valid inspiration.
- DO NOT use a 60-day longevity floor. Minimum is 7 days, the same floor as `foreplay-creative-strategy`. Boards benefit from a mix of proven long-runners and recent testing-phase ads.

Classification and buckets:
- DO NOT skip the per-ad sanity check in Phase 4.5. The query that surfaced an ad is not proof of fit. Look at the staged creative and re-read the `description` before bucket assignment.
- DO NOT put self-care "treat yourself" ads in `gifting`. Gifting requires explicit recipient framing ("for her", "for him", "gift idea", "Mother's Day gift"). Brand-awareness ads that merely mention a holiday do not qualify.
- DO NOT put educational tip reels, dietitian breakdowns, or functional-medicine explainers in `problem-solution`. That bucket needs a branded product as the solution in-frame.
- DO NOT pad an under-populated bucket with poor-fit ads from the primary pool. Escalate to Phase 4.6; the archetype lives in some DTC vertical even if not the brand's own.
- DO NOT skip Phase 4.6 when buckets come up short. The minimum-4 floor is mandatory; leaving a bucket at 0-3 is only acceptable AFTER two adjacent-vertical expansion rounds have both failed, and it must be documented in the README.
- DO NOT put more than 2 ads from the same brand in a single bucket, except the sanctioned Phase 4.6 relaxation to 4 with README disclosure.
- DO NOT include a `supplements` folder unless the brand is itself a supplements brand. Default off.
- DO NOT include a `training_board` folder. It's permanently excluded.

Dedupe and downloads:
- DO NOT put the same `ad_id` in two buckets. Dedupe before downloading.
- DO NOT re-download ads already on disk in a re-run. Build `EXISTING_AD_IDS` in Phase 0 and skip matches before assigning buckets.
- DO NOT treat two `ad_id`s as different ads when they share the same `brand_id` + same `link_url` (or same `image` URL, or near-identical `description`). Meta and Foreplay both produce duplicate `ad_id`s for one creative. Apply the Phase 5 near-duplicate rule.
- DO NOT download serially. Parallelize curl calls in batches of 5-10.

Output:
- DO NOT use em dashes in any chat output, user-facing message, summary, or the README.txt written to disk. Use colons, parens, or split sentences instead.

---

## Quick Reference: Most Common MCP Tools

| Need | Tool |
|---|---|
| Resolve brand by domain → brand_id | `Foreplay.get_brands_by_domain` |
| Resolve brand by name | `Foreplay.search_discovery_brands` |
| Pull ads from specific competitor brands | `Foreplay.get_ads_by_brand_ids` |
| Discovery feed by niche + query | `Foreplay.search_discovery_ads` |
| Single ad details (rare, mostly for verification) | `Foreplay.get_ad_by_ad_id` |
| User's saved boards (optional secondary source) | `Foreplay.get_boards` / `get_board_ads` |
| User's spyder folders (optional secondary source) | `Foreplay.get_spyder_brands` / `get_spyder_brand_ads` |

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

It writes nothing into the brain. The board's own `README.txt` records what was pulled and from whom.
