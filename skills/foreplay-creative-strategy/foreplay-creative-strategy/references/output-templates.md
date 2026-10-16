# Output Template: Dark-Mode HTML Brief with Colorful Accents

The deliverable is **one `index.html` file** at `./Foreplay Ad Inspiration/[brand-slug]/[brief-slug]-[YYYY-MM-DD]/index.html`. Auto-opens in the default browser. Tailwind via CDN + custom dark-theme CSS with a curated colorful accent palette. Mobile-responsive, scrollable, scannable, embedded media.

---

## File Organization (multi-brief, multi-brand)

Never write to a flat `./Foreplay Ad Inspiration/index.html`. Every brief lives in its own dated subfolder under the brand, so prior briefs are never overwritten:

```
./Foreplay Ad Inspiration/
├── acme-haircare/
│   ├── brand-wide-tof-2026-05-25/
│   │   ├── index.html
│   │   ├── raw/
│   │   └── gemini-analysis/
│   ├── product-scalp-serum-2026-06-10/
│   │   ├── index.html
│   │   ├── raw/
│   │   └── gemini-analysis/
│   └── sale-mothers-day-20off-2026-04-15/
│       ├── index.html
│       ├── raw/
│       └── gemini-analysis/
└── nordic-blankets/
    └── brand-wide-mixed-2026-05-22/
        ├── index.html
        ├── raw/
        └── gemini-analysis/
```

### Brief-slug naming convention

Build the slug from the Phase 3 (brief purpose) answer, always ending with the date `YYYY-MM-DD`:

| Phase 3 answer | Brief slug pattern |
|---|---|
| Brand-wide | `brand-wide-[funnel-stage]` (e.g., `brand-wide-tof`, `brand-wide-mof`) |
| Specific product | `product-[skuname-kebab-case]` (e.g., `product-scalp-serum`, `product-hair-wax-stick`) |
| Sale / promo | `sale-[offerslug]` (e.g., `sale-mothers-day-20off`, `sale-bfcm-bogo`) |
| Custom | `custom-[short-name]` (e.g., `custom-influencer-launch`) |

### Auto-open

After writing, open the specific brief file, not the top-level folder:

```bash
open "./Foreplay Ad Inspiration/[brand-slug]/[brief-slug]-[YYYY-MM-DD]/index.html"
```

---

## Universal Rules

- **No em dashes anywhere in the HTML.** Use colons, parens, line breaks, or "and".
- Quote hooks verbatim from Gemini analysis (not from ad copy descriptions, which often differ).
- Every ad reference includes: brand name, days running, LIVE/ENDED status, longevity tier (HOT/WARM/COOL), video/image media, two separate links (Foreplay ad URL + landing page URL), format type, per-ad rework note.
- Every angle has 3+ evidence URLs.
- **Recreation notes at THREE levels:** per-cluster, per-angle, per-ad (1 sentence on every individual card). All grounded in the brand brain.
- Confidence ratings: HIGH / MEDIUM / WHITESPACE.
- Never include Gemini cost, token counts, or usage metadata in the deliverable.

---

## Visual Style: Dark Mode with Curated Colorful Accents

Do NOT inject the brand-brain palette. The deliverable uses one clean, curated palette for every brand; brand identity comes through in the content, not the colors.

### Base palette

```css
:root {
  /* Base dark mode */
  --bg: #0f0f0f;
  --bg-card: #161616;
  --bg-card-elevated: #1c1c1c;
  --border: #2a2a2a;
  --border-hover: #3a3a3a;
  --text: #ededed;
  --text-muted: #a0a0a0;
  --text-faint: #6b6b6b;
  --text-faintest: #4a4a4a;

  /* Status semantic colors */
  --live: #22c55e;          /* LIVE status */
  --ended: rgba(255,255,255,0.12);  /* ENDED status */
  --hot: #22c55e;           /* 500+ days */
  --warm: #f59e0b;          /* 100-499 days */
  --cool: #38bdf8;          /* 7-99 days */
  --confidence-high: #22c55e;
  --confidence-med: #f59e0b;
  --confidence-whitespace: #a855f7;

  /* Archetype palette: each cluster type gets its own color */
  --c-ugc-talking: #6366f1;       /* indigo: UGC talking-head */
  --c-ugc-demo: #8b5cf6;          /* violet: UGC product demo */
  --c-founder: #10b981;           /* emerald: founder-led */
  --c-satisfying: #ec4899;        /* pink: satisfying product demo */
  --c-broll: #a855f7;             /* purple: b-roll montage */
  --c-beforeafter: #f59e0b;       /* amber: before-after */
  --c-tutorial: #0ea5e9;          /* sky: tutorial */
  --c-pov: #84cc16;               /* lime: POV creator */
  --c-stitch: #14b8a6;            /* teal: stitch-react */
  --c-review: #f97316;            /* orange: customer review reel */
  --c-listicle: #06b6d4;          /* cyan: listicle static */
  --c-pullquote: #fbbf24;         /* yellow: 5-star pull-quote */
  --c-editorial: #d946ef;         /* fuchsia: editorial endorsement */
  --c-scarcity: #ef4444;          /* red: scarcity / back-in-stock */
  --c-seasonal: #f43f5e;          /* rose: seasonal promo */
  --c-identity: #c084fc;          /* light purple: tribal identity */

  /* Brand label pop color */
  --brand-label: #fb923c;         /* orange: "BRAND" tag beside brand name */

  /* Highlight accent */
  --accent: #f9fafb;              /* near-white: hooks and section labels */
}
```

### Where each color goes

- **LIVE / ENDED badges**: always semantic (green / muted gray)
- **HOT / WARM / COOL longevity pills**: always semantic (green / amber / sky)
- **HIGH / MEDIUM / WHITESPACE confidence badges**: always semantic (green / amber / purple)
- **Archetype chips**: each archetype uses its `--c-*` color. Indigo chip = UGC talking-head, pink chip = satisfying demo, emerald chip = founder-led, etc.
- **"BRAND" label**: orange pop pill beside the brand name on every ad card
- **Hook quote borders**: `--accent` near-white for clean readability, never a brand color
- **Section labels**: `--accent` near-white

### Typography

System UI fonts. No custom brand fonts. Headings use the same stack at heavier weight and tighter letter-spacing.

---

## Sticky Navigation: Big, Pill-Shaped, Obviously Clickable

Nav pills are explicit buttons with visible padding and hover states, never small gray text:

```html
<nav class="sticky top-0 z-20 bg-bg-blur backdrop-blur border-b border-border py-3">
  <div class="max-w-6xl mx-auto px-6 flex gap-2 overflow-x-auto">
    <a href="#executive" class="nav-pill">Executive insights</a>
    <a href="#cluster-a" class="nav-pill">A · Stylist POV</a>
    <a href="#cluster-b" class="nav-pill">B · Derm authority</a>
    ...
    <a href="#angles" class="nav-pill nav-pill-primary">Angle library →</a>
    <a href="#whitespace" class="nav-pill">Whitespace</a>
    <a href="#anti-patterns" class="nav-pill">Anti-patterns</a>
    <a href="#allocation" class="nav-pill">Allocation</a>
  </div>
</nav>

<style>
.nav-pill {
  padding: 9px 18px;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.15s;
  text-decoration: none;
}
.nav-pill:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.2);
  color: var(--text);
}
.nav-pill-primary {
  background: rgba(99,102,241,0.15);
  border-color: rgba(99,102,241,0.4);
  color: #a5b4fc;
}
.nav-pill-primary:hover {
  background: rgba(99,102,241,0.25);
  color: #c7d2fe;
}
</style>
```

---

## HTML File Structure

```
<!DOCTYPE html>
<html lang="en">
<head>
  <title>[Brand] · [Brief Purpose] Creative Intelligence · [Date]</title>
  <style>
    :root { /* full curated palette as above */ }
    body { background: var(--bg); color: var(--text); font-family: system-ui; }
    /* ... full stylesheet ... */
  </style>
</head>
<body>

  <!-- 1. HEADER -->
  <header>
    [brand avatar] [Brand] · [Brief Purpose] Creative Intelligence
    [Run metadata: # competitors, # ads analyzed, sort order]
    [Mode chip in top-right: BRAND-WIDE · TOF · VIDEO+STATIC]
  </header>

  <!-- 2. BRIEF PURPOSE BANNER -->
  <section class="purpose-banner">
    <strong>BRIEF PURPOSE</strong> [What the brief is for. Funnel stage. Specific product or offer if applicable.]
  </section>

  <!-- 3. STICKY NAV -->
  <nav>[nav-pill A, nav-pill B, nav-pill C, ..., Angle library, Whitespace, etc.]</nav>

  <!-- 4. EXECUTIVE INSIGHTS -->
  <section id="executive">
    <h2>Where competitors are spending ad dollars right now</h2>
    <ol>5 sharp insights, numbered, bold lead-ins, concrete numbers, named brands + days</ol>
  </section>

  <!-- 5. CLUSTER GALLERIES (named A, B, C, ... with descriptive labels) -->
  <section id="cluster-a">
    Cluster A · Stylist POV
    [1-line cluster insight]
    [Cluster-level "How [Brand] would recreate this cluster" note]
    [Grid of ad cards, see Ad Card Spec below]
  </section>

  <!-- 6. ANGLE LIBRARY -->
  <section id="angles">
    For each angle (5-15 depending on Phase 5):
      - Title + confidence pill
      - Hook (verbatim)
      - Beat-by-beat (videos) OR layout breakdown (statics)
      - Mechanism / why it works
      - Evidence URLs (3+)
      - "How [Brand] would recreate this for [brief purpose]" panel
  </section>

  <!-- 7. WHITESPACE -->
  <section id="whitespace">
    Lanes no competitor is running. Each with brand-specific opportunity sizing.
  </section>

  <!-- 8. ANTI-PATTERNS (killed ads) -->
  <section id="anti-patterns">
    What competitors tried that died. What to avoid.
  </section>

  <!-- 9. ALLOCATION TABLE -->
  <section id="allocation">
    How to split test budget across recommended angles. Biased by funnel stage.
  </section>

  <!-- 10. COMPETITOR COVERAGE TABLE -->
  <section id="competitors-table">
    Compact 4-col table: Brand avatar+name, Longest ad, Primary creative angle, Format strategy.
  </section>

  <!-- 11. YOUR BRAND BASELINE -->
  <section id="baseline">
    "[Brand] baseline: Currently running [X, Y, Z]. Not running [A, B, C]."
    Bordered with accent color. Heavy emphasis.
  </section>

  <!-- 12. NEXT STEPS -->
  <section id="next">
    4 numbered options for what to do next.
  </section>

  <footer>Generated [date] · Foreplay MCP · [N competitors analyzed]</footer>
</body>
</html>
```

---

## Ad Card Spec

Every ad card must include every element below.

### Markup pattern

```html
<div class="ad-card">
  <!-- MEDIA -->
  <div class="card-media [portrait|landscape|square]">
    <!-- Video: inline player with poster. Image: clickable, opens full-res. -->
    <video src="[mp4 URL]" poster="[thumbnail URL]" preload="none" controls></video>
    <!-- OR -->
    <a href="[image URL]" target="_blank"><img src="[image URL]"></a>

    <!-- Top-left: LIVE/ENDED status -->
    <div class="badge-status">
      <span class="badge badge-[live|ended]">[LIVE | ENDED]</span>
    </div>

    <!-- Top-right: longevity tier -->
    <div class="badge-tier">
      <span class="badge badge-[hot|warm|cool]">[HOT|WARM|COOL] · [N]d</span>
    </div>
  </div>

  <!-- CARD BODY -->
  <div class="card-body">

    <!-- Brand row with BRAND label + format -->
    <div class="card-brand-row">
      <span class="brand-label">BRAND</span>
      <img class="brand-avatar" src="[Foreplay brand avatar]">
      <span class="brand-name">[Brand Name]</span>
      <span class="format-pill">[VIDEO | IMAGE | CAROUSEL | DCO]</span>
    </div>

    <!-- Verbatim hook (from Gemini) -->
    <blockquote class="card-hook">"[verbatim first-3-seconds]"</blockquote>

    <!-- Claims (optional 1-2 lines) -->
    <p class="card-claims"><strong>Claims:</strong> [primary claim verbatim from Gemini]</p>

    <!-- Colorful archetype chips (3-5) -->
    <div class="card-chips">
      <span class="chip chip-[archetype]">[primary archetype]</span>
      <span class="chip chip-[secondary]">[secondary trait]</span>
      <span class="chip chip-platform">[FB / IG / TikTok]</span>
    </div>

    <!-- WHY IT RAN -->
    <p class="card-analysis">
      <strong>WHY IT RAN:</strong> [1-2 sentence persuasion mechanism from Gemini why_it_works]
    </p>

    <!-- REWORK FOR [BRAND] (per-ad recreation note) -->
    <p class="card-rework">
      <strong>REWORK FOR [BRAND]:</strong> [1 sentence specific adaptation for THIS ad, not a generic cluster note]
    </p>

    <!-- TWO LINKS: Foreplay ad + Landing page -->
    <div class="card-links">
      <a href="[Foreplay ad URL]" target="_blank" class="link-foreplay">→ View on Foreplay</a>
      <a href="[landing page URL]" target="_blank" class="link-landing">→ View landing page</a>
    </div>
  </div>
</div>
```

### Foreplay ad URL rules

The "View on Foreplay" link must land on the ad's detail page in the Foreplay app, never on a 404.

**Priority order:**

1. **Use the `foreplay_url` field** from the MCP response. Every ad object includes it; it is the canonical, server-provided URL. Do not construct your own when this field exists.
2. If `foreplay_url` is missing (treat as a server bug), construct: `https://app.foreplay.co/discovery?ad=[id]` where `[id]` is the ad's **internal Foreplay `id`** (a ~20-char alphanumeric string like `zzrVIc0hvJITcWBK1Rgi`), NOT the long numeric Meta archive ID. Never use any other path (there is no `/discover/ad/{id}`).
3. If the only usable URL is a Meta Ad Library link (`facebook.com/ads/library/?id=...`), you may use it, but label the link "→ View on Meta Ad Library" instead of "→ View on Foreplay" so the user knows what they are clicking.

### Landing page URL

Always include the second link from Foreplay's `link_url` field (the destination the ad's CTA points to). Label: "→ View landing page". Both links appear on every card.

### Status + tier are INDEPENDENT (both always shown)

| Foreplay `live` | Days running | Badge combo |
|---|---|---|
| `true` | 500+ | `LIVE` + `HOT · 540d` |
| `true` | 100-499 | `LIVE` + `WARM · 220d` |
| `true` | 7-99 | `LIVE` + `COOL · 45d` |
| `false` / `null` | 500+ | `ENDED` + `HOT · 614d` |
| `false` / `null` | 100-499 | `ENDED` + `WARM · 220d` |
| `false` / `null` | 7-99 | `ENDED` + `COOL · 45d` |

### Archetype chip color map

| Archetype | Chip color | CSS class |
|---|---|---|
| UGC talking-head | Indigo `#6366f1` | `chip-ugc-talking` |
| UGC product demo | Violet `#8b5cf6` | `chip-ugc-demo` |
| Founder-led | Emerald `#10b981` | `chip-founder` |
| Satisfying product demo | Pink `#ec4899` | `chip-satisfying` |
| B-roll montage | Purple `#a855f7` | `chip-broll` |
| Before-after | Amber `#f59e0b` | `chip-beforeafter` |
| Tutorial educational | Sky `#0ea5e9` | `chip-tutorial` |
| POV creator | Lime `#84cc16` | `chip-pov` |
| Stitch react | Teal `#14b8a6` | `chip-stitch` |
| Customer review reel | Orange `#f97316` | `chip-review` |
| Listicle static | Cyan `#06b6d4` | `chip-listicle` |
| 5-star pull-quote | Yellow `#fbbf24` | `chip-pullquote` |
| Editorial endorsement | Fuchsia `#d946ef` | `chip-editorial` |
| Scarcity / back-in-stock | Red `#ef4444` | `chip-scarcity` |
| Seasonal promo | Rose `#f43f5e` | `chip-seasonal` |
| Tribal identity | Light purple `#c084fc` | `chip-identity` |
| Platform pill (FB/IG/TikTok) | Slate `#64748b` | `chip-platform` |

Chip CSS pattern:

```css
.chip {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  background: color-mix(in srgb, var(--chip-color) 18%, transparent);
  color: var(--chip-color);
  border: 1px solid color-mix(in srgb, var(--chip-color) 30%, transparent);
}
.chip-ugc-talking { --chip-color: var(--c-ugc-talking); }
.chip-founder { --chip-color: var(--c-founder); }
/* etc. for each archetype */
```

### BRAND label

Small pop-color pill beside the brand name on every ad card. Orange (`#fb923c`). Makes it instantly clear which brand the ad is FROM. Visual order: `[BRAND] [avatar] [COMPETITOR NAME] [VIDEO]`

```css
.brand-label {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  background: rgba(251,146,60,0.15);
  color: #fb923c;
  border: 1px solid rgba(251,146,60,0.4);
}
```

### Per-ad rework note (mandatory on every card)

Each ad card gets its OWN rework note, one sentence specific to that individual ad, in addition to the cluster-level and angle-level notes. Bordered top, "REWORK FOR [BRAND]:" prefix in muted heading color (same style as "WHY IT RAN:"). It must name one concrete element from the brand brain or brief purpose.

Example (clean-haircare brand looking at a competitor's "going bald at 28" ad):
> **REWORK FOR [BRAND]:** Open with the founder parting a client's hair in her salon instead of a fear-based "going bald" hook, and replace the "93% saw less hair fall" stat with "my scalp stopped flaking in 30 days" (non-medical claim per brand brain).

The three levels of recreation guidance, all mandatory:
1. **Per-cluster**: overall pattern adaptation (in the cluster intro)
2. **Per-angle**: angle-specific adaptation (in the angle library)
3. **Per-ad**: individual ad adaptation (on every card)

---

## Angle Card Structure

```html
<div class="angle-card">
  <div class="angle-body">
    <div class="angle-name">[N] · [Angle name]</div>
    <div class="angle-archetype">Hook type: [pattern]</div>
    <div class="angle-hook">"[Verbatim hook]"</div>
    <div class="angle-meta">
      <strong>Evidence:</strong> [brand A] [days]d, [brand B] [days]d, [brand C] [days]d<br>
      <strong>Format:</strong> [video / static archetype + duration]
    </div>

    <div class="recreation-panel">
      <div class="recreation-label">How [Brand] would recreate this for [brief purpose]</div>
      <p>[2-3 sentence specific adaptation. Brand voice. Visual elements. Guardrails. Differentiator. Offer if sale brief.]</p>
    </div>
  </div>

  <span class="confidence-badge confidence-[high|med|whitespace]">[HIGH | MEDIUM | WHITESPACE]</span>
</div>
```

---

## "Your Brand Baseline" Callout

```html
<div class="baseline-note">
  <strong>[Brand] baseline (your current ad activity):</strong> Currently running [list 3-5 from existing-winners pulled in Phase 8]. Not running: [list 3-5 angles from this brief]. All [N] of those untested angles are proven by competitors at [days range]+ days.
</div>
```

Bordered with the confidence-whitespace purple `#a855f7` (signals "opportunity"). Bold lead-in. Concrete day-range citation.

---

## Competitor Coverage Table

4-column synthesis table near the bottom showing all competitors pulled in Stage 2. One row per competitor, sorted by longest ad descending. If a competitor was queried but Foreplay returned nothing, still include them with "Confirmed in Foreplay · no creative ads indexed" so the user knows they were checked.

---

## Executive Insights Heading: Exact Wording

Use exactly this heading (or a close variant below):

**"Where competitors are spending ad dollars right now"**

Acceptable variants:
- "Where competitors are spending right now"
- "What competitors are targeting right now"
- "Where the category is putting ad spend"
- "Current category spend signals"

The word **"buying"** is banned in this section. Brands don't "buy" angles; they spend on them, target audiences, run them, scale them. Use precise language.

---

## In-Chat Surface (after the HTML is saved and opened)

Do NOT dump the full brief in chat. Surface only:

1. **2-3 sentence executive summary** (the single most important finding)
2. **Top 3 angles**, one line each, with verbatim hook
3. **Direct link** to the HTML file, e.g. `[Foreplay Ad Inspiration/acme-haircare/brand-wide-tof-2026-05-25/index.html](...)`
4. **Next-step options** (4 choices via `AskUserQuestion` or a numbered list)
5. **Brand brain enrichment summary** (from Stage 7a): what was added to which files

Users read the HTML in the browser. Chat is just the executive layer.

---

## Caching

Within each brief folder:

- Raw Foreplay JSON: `./Foreplay Ad Inspiration/[brand-slug]/[brief-slug]-[date]/raw/[query-type].json`
- Gemini analysis per ad: `./Foreplay Ad Inspiration/[brand-slug]/[brief-slug]-[date]/gemini-analysis/[ad_id].json`
- Consolidated Gemini: `./Foreplay Ad Inspiration/[brand-slug]/[brief-slug]-[date]/gemini-analysis/_all.json`

On reruns for the same brand + brief purpose, check the most recent folder first. If the user wants a fresh corpus, create a new dated folder.
