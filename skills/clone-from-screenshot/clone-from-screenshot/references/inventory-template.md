# Inventory — {page name}

Copy this file to `{brand folder}/clone/{page-name}/inventory.md` and fill it in **while reading
the strips, before writing any HTML.** Every row is read off the source — measured with the
grid, sampled with `clone-tools.py color/palette` — never guessed.

## Source

| | |
|---|---|
| Origin | screenshot from user / URL: … |
| Source file | `source.png` — {W}×{H}px |
| Viewport width the clone is built for | {W}px |
| Mobile source | `source-mobile.png` {w}×{h}px / **none — mobile layout is interpreted** |
| Strips | `strips/` — {n} strips |

## Tokens (read from source)

| Token | Value | Sampled at (x,y) / how | Notes |
|---|---|---|---|
| `--bg` page background | `#……` | palette 0,0 200×200 | |
| `--surface` card background | `#……` | | |
| `--ink` body text | `#……` | | |
| `--ink-soft` secondary text | `#……` | | |
| `--brand` primary / buttons | `#……` | | |
| `--brand-ink` text on `--brand` | `#……` | | |
| `--accent` highlight / stars / timer | `#……` | | |
| `--band` dark section background | `#……` | | |
| `--band-ink` text on `--band` | `#……` | palette --light | |
| `--line` borders / dividers | `#……` | | |
| `--brand-2`, `--accent-2`, … | `#……` | | add one per extra colour the source uses — never write a hex outside `:root` |
| `--font-display` | family class + candidate | stroke: … | e.g. chunky optical serif → Fraunces |
| `--font-body` | | | |
| `--font-ui` buttons / labels | | | |
| `--weight-display` / `--weight-heading` / `--weight-body` | 400–800 | | weights are tokens: the brand's font may need a different one |
| `--radius-card` / `--radius-btn` / `--radius-img` | px | | |
| `--shadow-card` | | | |
| `--max-w` content column | {n}px | bbox / edges --row | |
| `--pad-section` vertical section padding | px | edges --col | |
| mobile breakpoint | px | | literal in `@media` — the one value that cannot be a token |

## Sections (top → bottom)

| # | id | y-range | Layout (cols, which side is image) | Background | Notes / gotchas |
|---|---|---|---|---|---|
| 01 | `s01-announce` | 0–40 | full-width bar, centred text | `--brand` | sticky? timer format? |
| 02 | `s02-hero` | 40–620 | 2-col, text L 45% / image R | | |
| … | | | | | |

## Images (every photographic region → cropped to `assets/source/{name}.png`)

One row per image — no ranges or slash-separated lists; the rows are re-read by scripts.

| name | section | crop x y w h | aspect-ratio | radius | bleeds to edge? | text baked in? (→ `patch` X Y W H) |
|---|---|---|---|---|---|---|
| hero | s02 | 0 138 1440 472 | 1440/472 | 0 | yes | yes → 120 60 560 300 |
| product-1 | s04 | 26 716 184 204 | 184/204 | 0 | no | no |
| … | | | | | | |

## Copy manifest (verbatim — this is scaffolding, it never ships)

| section | slot | text |
|---|---|---|
| s01 | bar | "…" |
| s02 | h1 | "…" |
| s02 | sub | "…" |
| s02 | cta | "…" |
| … | | |

## Component checks (the classic inversions)

| Check | Source shows |
|---|---|
| Check/chip style | dark bg + light text **or** light bg + dark text |
| Testimonial avatar | floating circle above card **or** inline thumbnail |
| Timer | single `00:44:30` **or** segmented HRS/MIN/SEC with labels |
| Bottom CTA | white card on dark band **or** fixed sticky bar |
| Timeline | dark cards **or** plain text + soft quote box |
| Press logos | grayscale **or** colour; real names |

## Deviations (anything not matched 1:1, with why)

- {section} — {what differs} — {why: font unavailable / unreadable hex / …}
- Mobile — {built from source-mobile.png / interpreted}

## Gate

- clone.html path given to the user on {date}; their go + change list: …

## Rebrand map (Phase 2 — filled from `brand-guidelines.md`)

| Token | Clone value | Brand value | Source in guidelines |
|---|---|---|---|
| `--brand` | `#……` | `#……` | "Primary brand color, buttons" |
| … | | | |

## Asset map (Phase 2)

| slot | brand file | crop used | or: placeholder / dropped (decorative) |
|---|---|---|---|
| hero | assets/hero.jpg | full | |
| … | | | |

## What the page is for (Phase 2, before any copy)

| | |
|---|---|
| The ad it follows | hook line: "…" / buyer: … / offer named: … / image: … / **none: 1 buyer, 1 angle: …** |
| Kind of product | bought again / bought once |
| Sections that do not fit this kind of product | {section} → change to … / remove |

## Fact slots (Phase 2: filled from the brand brain, or removed)

| section | slot (review, rating, count, press, badge, timer, price, guarantee, result, table, author) | brand's own fact and where it is on file | or: removed |
|---|---|---|---|
| s02 | review pill "4.8 (2,000+)" | … | removed: no stated rating |
| … | | | |

## Not sourced

- {asset / colour role / fact / contact detail the brand folder does not have}

Modifications requested: …
