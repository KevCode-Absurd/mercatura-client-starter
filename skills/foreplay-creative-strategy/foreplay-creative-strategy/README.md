# Foreplay Creative Strategy Skill

AICMO community Claude Code skill. Reverse-engineers winning paid ads from Foreplay's database and produces a brand-specific creative brief as a single HTML file.

## Read this first

This skill cannot run inside the Creative Studio app: it needs a paid Foreplay account, its connector, and a model that can watch video. `SKILL.md` opens with what it needs and with the parts that work without any of that (the cluster names as tags, how to read a competitor's ad, run time as a hint and never as a result).

## What it does

1. Pulls video and static ads (live AND ended) from Foreplay's Meta + TikTok index, with a 7-day minimum running duration.
2. Ranks by longevity (60+ days running = presumed profitable; longevity is a ranking signal, never a corpus filter).
3. Clusters by creative archetype (UGC talking-head, founder-led, satisfying demo, listicle static, etc.).
4. Watches the actual videos / reads the actual statics with a model that can watch video. Extracts verbatim hooks (first 3 seconds), beat-by-beat timing, exact CTA wording, claims, production tier, and the underlying persuasion mechanism.
5. Builds a brand-specific angle library with recreation notes grounded in the brand brain (voice, visual aesthetic, ICP, guardrails) at three levels: per cluster, per angle, per individual ad card.
6. Outputs one `index.html` per brief with embedded videos, clickable evidence links, and next-step options. Auto-opens in the browser.
7. Enriches the brand brain after every run (append-only, date-stamped, evidence-cited).

## Install

Lives at:

```bash
~/.claude/skills/foreplay-creative-strategy/
```

Trigger via `/foreplay-creative-strategy` or natural language ("foreplay research", "pull winning ads", "creative brief for [brand]", "competitor ad teardown").

## Requires

- **Foreplay MCP** connected via Claude Connectors (OAuth). The skill detects this and prompts setup if missing.
- **A key for a model that can watch video** (recommended, not required), kept in the project's `.env`. Without it, the skill falls back to keyframes only and says so in the deliverable.

## Files

```
foreplay-creative-strategy/
  SKILL.md                              # Entry point: doctrine, onboarding phases, output rules
  README.md                             # This file
  references/
    master-prompt.md                    # Agent persona + 7-stage workflow doctrine
    foreplay-mcp-mapping.md             # MCP tool reference + field translations + sample calls
    video-analysis-schema.json          # Gemini structured-output schema for video analysis
    static-analysis-schema.json         # Gemini structured-output schema for static/image analysis
    output-templates.md                 # HTML deliverable spec: paths, palette, card markup
    gemini-setup.md                     # API key setup walkthrough
```

## Onboarding flow

The skill asks every question one at a time (never auto-selects, even in auto-mode):

1. **Gemini API check** (only if the key is missing)
2. **Brand brain confirmation**: auto-detects a brand-brain folder, surfaces the profile for confirmation
3. **Brief purpose**: brand-wide / specific product / sale or promo / custom (with conditional follow-ups: which product, what offer + dates)
4. **Funnel stage**: TOF / MOF / BOF / mixed
5. **Ad quantity**: 5-8 angles, 10-15 angles, or custom
6. **Format scope**: videos only OR videos + statics (binding on every Foreplay query)
7. **Geo**: US default, override available
8. **Existing winners check**: auto-pulls the brand's current ads so the brief doesn't recommend duplicates
9. **Optional Foreplay boards / spyder folders**
10. **Final cost + plan confirmation gate** before running

Brief purpose biases competitor selection and recreation notes. Funnel stage biases the Gemini cluster-sample weights and which angles get top billing.

## Output

`./Foreplay Ad Inspiration/[brand-slug]/[brief-slug]-[YYYY-MM-DD]/index.html`: single dark-mode HTML file, Tailwind-styled, mobile-responsive, opens in the browser. Sections in order:

- Header + brief purpose banner + sticky pill nav
- Executive insights ("Where competitors are spending ad dollars right now")
- Cluster galleries by archetype, each ad card with LIVE/ENDED + HOT/WARM/COOL badges, verbatim hook, WHY IT RAN, and a per-ad REWORK FOR [BRAND] note
- Angle library with verbatim hooks, beat-by-beat, 3+ evidence URLs, confidence ratings (HIGH / MEDIUM / WHITESPACE), and recreation notes
- Whitespace section (lanes no competitor is running)
- Killed-ad / anti-pattern section
- Creative allocation table (funnel-stage biased)
- Competitor coverage table
- "Your brand baseline" callout
- Next-step options

Plus caches inside the same brief folder: `raw/` (Foreplay JSON) and `gemini-analysis/` (per-ad analysis + `_all.json`).

## What makes this different

Most creative-strategy tools surface ad copy and call it a day. This skill watches the actual videos and reads the actual statics, then ties every finding back to the specific brand brain with concrete recreation notes. The output is specific enough that a producer or AI image tool could execute it directly.

## Compounding brand intelligence

Every run automatically enriches the brand brain (if one exists). New competitors append to `competitors.md`, category patterns log to `winning-ads.md`, strategic insights land in `brain.md`, and the run is recorded in `recent-changes.md`. All append-only, date-stamped, evidence-cited. Pairs with the sibling skills `brand-brain` (builds the brain) and `foreplay-ad-board` (downloads a swipe folder to disk).

## Failure modes the skill protects against

- Briefing from ad copy when the video says something different (the caption is meta text, not the video hook)
- Filtering out 7-59 day ads or ended ads (loses current-testing intelligence)
- Silently narrowing format scope (the user's video/static pick is binding)
- Sampling raw top-N instead of cluster-sampling (kills cost control and pattern detection)
- Mislabeling archetypes (voiceover b-roll is not UGC talking-head)
- Generic angle libraries with no brand-specific adaptation
- Exceeding Gemini cost caps without confirmation

## Cost

The Foreplay connector comes with a Foreplay subscription. Reading the videos is paid per video; the skill works out the cost of a run and asks before it starts. No price is quoted here, and no key ships with this skill.
