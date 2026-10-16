# Foreplay MCP Mapping

The workflow doctrine in `master-prompt.md` is written against generic API naming. This file records example Foreplay operations and field shapes, not universal host tool IDs. Discover the connected tools and map these logical operations to their actual schemas before any call; current schemas take precedence over sample fields.

**Two corpus rules that override anything in the samples below:** corpus pulls use `running_duration_min_days=7` (never 60) and NO `live` filter. The one exception is the optional killed-ads pull, which uses `live="false"` on purpose. See master-prompt.md Stage 3.

---

## Endpoint Translation

| Doctrine name | Logical Foreplay operation | When to use |
|--------------------|------------------|-------------|
| `GET /ads/search?advertiser_name=X` | `Foreplay.get_ads_by_brand_ids` | Resolve brand to ID first via `get_brands_by_domain` |
| `GET /ads/{ad_id}` | `Foreplay.get_ad_by_ad_id` or `get_ad_by_id` | `ad_id` is the platform ID; `id` is the Foreplay internal ID |
| `GET /advertisers/{id}/ads` | `Foreplay.get_ads_by_brand_ids` | Pass `brand_ids` as array |
| `GET /discovery` | `Foreplay.search_discovery_ads` | Use `niches`, `running_duration_min_days`, `order` filters |
| `GET /spyder/{folder_id}/ads` | `Foreplay.get_spyder_brand_ads` | Get folder list via `get_spyder_brands` first |
| `GET /boards/{board_id}/ads` | `Foreplay.get_board_ads` | Get board list via `get_boards` first |
| Brand discovery | `Foreplay.get_brands_by_domain` | Primary brand resolver |
| Brand discovery by name | `Foreplay.search_discovery_brands` | Fallback when no domain |
| Discover brands by ad characteristics | `Foreplay.discover_brands_by_ads` | Surface competitors from creative |
| Brand details by Meta page | `Foreplay.get_brands_ads_by_page_id` | When you have a Meta page ID |
| Render gallery in chat | `Foreplay.display_ad_results` | Always pair with plain markdown links in chat |

---

## Field Name Translation

| Doctrine field | MCP response field | Type | Notes |
|---------------------|--------------------|----|-------|
| `first_seen_date` | `started_running` | int (Unix ms) | Convert with `Date(ms).toISOString()` |
| `last_seen_date` | `last_checked` | int (Unix ms) | |
| `still_running` | `live` | bool | Often stale; badge signal only, never a corpus filter |
| `days_running` | `running_duration.days` | int | Use directly, do not recompute |
| `media_type` | `display_format` | string | VIDEO, IMAGE, CAROUSEL, DCO, multi_videos, etc. |
| `video_url` | `video` | string | Often `https://r2.foreplay.co/...mp4` |
| `image_url` | `image` | string | |
| `thumbnail_url` | `thumbnail` | string | |
| `ad_copy` | `description` | string | Body text. May be null on DCO ads. |
| `cta_button_text` | `cta_type` and `cta_title` | string | |
| `landing_page_url` | `link_url` | string | Second link on every ad card |
| Foreplay detail-page URL | `foreplay_url` | string | Canonical server-provided link to the ad in the Foreplay app. Use for "View on Foreplay". If missing, fall back to `https://app.foreplay.co/discovery?ad=[internal id]` |
| `duration_seconds` | `video_duration` | number | Only on video ads |
| `advertiser_name` | `brand` or `brand_name` | string | |
| `advertiser_page_id` | `brand_id` | string | Foreplay's internal brand ID |
| `platform` | `publisher_platform` | array of strings | e.g. `["facebook", "instagram"]` |
| `format_tags` | Not directly exposed | | Use `display_format` + visual inspection |
| `niche_tags` | `niches` and `categories` | array | |
| `emotion_tags` | `emotional_drivers` | array | When available |
| `language` | `languages` | array | |
| `market_target` | `market_target` | string | "b2b" or "b2c" |

---

## Filter Parameter Translation

| Doctrine filter | MCP param | Example |
|---------------------|-----------|---------|
| `still_running=true` | `live="true"` | String, not bool. Only for the optional killed-ads pull (`live="false"`); never on corpus pulls |
| `min_days_running=7` | `running_duration_min_days=7` | Integer |
| `max_days_running=30` | `running_duration_max_days=30` | Integer |
| `last_seen_after=[date]` | `start_date="YYYY-MM-DD"` | Date string |
| `last_seen_before=[date]` | `end_date="YYYY-MM-DD 23:59:59"` | Use 23:59:59 to include the full day |
| `media_type=video` | `display_format=["video"]` | Array, lowercase |
| `platform=meta` | `publisher_platform=["facebook", "instagram"]` | Array, lowercase |
| `niche_tags=[X]` | `niches=["X"]` | Array, lowercase, from the controlled list below |
| `language=en` | `languages=["english"]` | Language word, not code |
| `sort=days_running_desc` | `order="longest_running"` | String |
| Pagination | `cursor=[from previous response]` | String |

---

## Sample Calls (Copy / Adapt)

### Resolve brand by website to a Foreplay brand_id

```
Foreplay.get_brands_by_domain(domain="thegreensidegallery.com")
```
Returns: `[{brand_id: "WPgHc9bSWORRgN1LJy3q", name: "The Greenside Gallery", ...}]`

### Pull 1: Per-competitor full corpus (7+ days, live AND ended)

```
Foreplay.get_ads_by_brand_ids(
  brand_ids=["WPgHc9bSWORRgN1LJy3q"],
  running_duration_min_days=7,
  display_format=["video"],            # or ["video","image","carousel"] per Phase 6
  limit=50,
  order="longest_running",
  field_preset="summary"
)
```
Note: NO `live` param, 7-day floor. `field_preset="summary"` keeps the response token-light; use `"full"` only on single-ad detail calls.

### Pull 2: Testing-phase supplement (only if Pull 1 < 25 ads for that competitor)

```
Foreplay.get_ads_by_brand_ids(
  brand_ids=["[id]"],
  running_duration_min_days=7,
  running_duration_max_days=13,
  limit=15,
  order="newest"
)
```

### Pull 3: Niche discovery

```
Foreplay.search_discovery_ads(
  query="scalp serum",                 # single keyword; multi-word often returns zero
  display_format=["video"],            # per Phase 6
  running_duration_min_days=7,
  publisher_platform=["facebook", "instagram", "tiktok"],
  limit=50,
  order="longest_running",
  field_preset="summary"
)
```

Available niches (controlled list):
`accessories`, `app/software`, `beauty`, `business/professional`, `education`, `entertainment`, `fashion`, `food/drink`, `health/wellness`, `home/garden`, `jewelry/watches`, `other`, `parenting`, `pets`, `real estate`, `service business`, `medical`, `charity/nfp`, `kids/baby`.

If the brand's category doesn't map cleanly, use the closest niche + a `query` text search to refine.

### Pull 4a: Spyder folder pull (only if the user opted in during Phase 9)

```
Foreplay.get_spyder_brands(limit=50)
  → lists the user's spyder brands

Foreplay.get_spyder_brand_ads(
  brand_id="[id from list]",
  running_duration_min_days=7,
  limit=50
)
```

### Pull 4b: Board pull (only if the user opted in during Phase 9)

```
Foreplay.get_boards(limit=10)
  → lists the user's saved boards

Foreplay.get_board_ads(
  board_id="[id from list]",
  running_duration_min_days=7,
  limit=50,
  order="longest_running"
)
```

### Optional Pull 5: Recently killed ads (anti-pattern section; the ONE allowed `live` filter)

```
Foreplay.get_ads_by_brand_ids(
  brand_ids=["[id]"],
  live="false",
  running_duration_max_days=30,
  start_date="[90 days ago, YYYY-MM-DD]",
  limit=20,
  order="newest"
)
```

### Get full details + video URL for a single ad (Stage 5 prep)

```
Foreplay.get_ad_by_id(id="A0vobjQ9lHPgVne6wK2w")
  → returns the full record including video URL and foreplay_url
```

### Render gallery in chat

```
Foreplay.display_ad_results(
  title="...",
  summary="...",
  results=[{...one per ad with avatar, title, video, etc...}]
)
```
**Important:** Always ALSO paste plain markdown links in chat for every ad shown (use each ad's `foreplay_url`). The display iframe is a visual gallery; the user needs raw clickable links to inspect each creative.

---

## Token Cost Optimization

The MCP supports `field_preset` and `fields` params for narrowing responses.

| Preset | Keeps | Use when |
|--------|-------|----------|
| `summary` | Common ad fields (id, name, brand, video, image, link, dates, duration, platform) | Default for list pulls |
| `media` | Image / video / link fields only | When you only need to render |
| `transcription` | Script / transcript fields | When re-pulling videos Gemini already analyzed |
| `analytics` | Reporting fields | Rarely useful; the MCP doesn't expose real spend |
| `full` | Everything | Only on single-ad detail calls |

Explicit `fields=["id", "video", "running_duration", "started_running"]` is cheaper than any preset when you know exactly what you need.

---

## Rate Limits + Error Handling

- Parallelize independent calls (concurrent tool calls in one message).
- On rate-limit error: exponential backoff (1s, 2s, 4s, up to 3 retries), then fall back to a reduced-scope pull (`limit=20` instead of `50`).
- On empty result for a known-active competitor: surface to the user with "Foreplay has no ads matching the filter for [brand]". Do not silently drop them.
- On null `description` field: don't paraphrase. State "Ad copy not exposed (likely DCO)" in the deliverable.

---

## Things the MCP Does NOT Expose

Do not try to use these signals; they are not available:

- Real spend data (longevity is the only profitability signal)
- Reach estimates
- Impression share
- Per-ad demographic targeting breakdown
- A/B test status flags

If a future MCP version exposes any of these, update this mapping file.
