# Brand Guide HTML Template Structure

This is the skeleton for the printable brand guide: up to 8 pages, each left out when the brand brain has nothing for it. Adapt colours, fonts, counts and copy per brand. Use it as a structure, not as text to copy.

## HTML Shell

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{CLIENT_NAME}} Brand Guide</title>
  <!-- Google Fonts link here if applicable -->
  <style>
    :root {
      /* Paste all client CSS variables here */
    }

    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font-body);
      font-size: 14px;
      line-height: 1.6;
      color: var(--primary-dark);
      background: #fff;
    }

    /* Each page is a full A4 sheet */
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 48px 56px;
      page-break-after: always;
      position: relative;
    }
    .page:last-child { page-break-after: auto; }

    /* On screen, show pages as stacked cards */
    @media screen {
      .page {
        border: 1px solid #ddd;
        margin-bottom: 24px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      }
    }

    /* ... all component styles ... */
  </style>
</head>
<body>
  <!-- 1 .page div per section that has content -->
</body>
</html>
```

## Page 1: Cover

Full-bleed page using the brand's primary dark color as background. Centered vertically.

```
.page.cover
  .cover__brand    → client name, 14px uppercase, accent color, 0.3em tracking
  h1.cover__title  → "Brand Guide", 48px, heading font, white/cream
  p.cover__sub     → one-line subtitle, 16px, muted white
  .cover__date     → "Month Year · v1.0", absolute bottom, very muted
```

## Page 2: Color

Section number + title + intro paragraph, then swatch grids.

**Swatch card structure:**
```
.swatch (border-radius: 10px, 1px border)
  .swatch__color   → 72px tall colored div
  .swatch__info    → white panel below
    .swatch__name  → uppercase, heading font, 11px
    .swatch__hex   → monospace, 12px
    .swatch__role  → muted, 11px, what it's used for
```

**Layout:**
- Primary colors: 4-col grid (or 3 if only 3 primaries)
- Supporting colors: 4-col grid
- Extra colors: 3-col grid
- Section rhythm strip: flex row of colored bars showing alternation pattern

## Page 3: Typography

**Font specimen card:**
```
.type-specimen (border: 1px, radius: 10px, padding: 28px 24px)
  .type-specimen__name    → "Heading Font" in accent color, 11px uppercase
  .type-specimen__sample  → actual font rendering at display size
  character set row       → A-Z 0-9 in the font
  .type-specimen__meta    → flex row: weights, case rule, source
```

One specimen per font family.

**Type scale table:**
| Element | Font | Size | Weight | Style |
Works for any number of scale levels. Use a real HTML table with thead/tbody.

**Color-on-background demo:**
Two side-by-side boxes (light bg + dark bg) showing heading/body/eyebrow colors for each background.

## Page 4: Voice

- A table of 3 or 4 principles: the name of each and what it means, from Personality and Writes like
- A do and don't grid: 2 columns, a green-tinted "do" card beside an amber-tinted "don't" card, each with a real line from the brand's own copy
- Words to avoid: a wrapping row of small bordered tags (from Voice don'ts and Never say)
- Tone by context: the brand's own table

## Page 5: The product on camera

1 block per product, the hero product first, 4 products at most. A product with nothing recorded is left out.

```
.product
  h3.product__name          -> the product's name and price
  .product__photos (grid, 5 columns; fewer if photos are missing)
    figure.photo
      img                   -> the brand's own file from assets/
      figcaption.photo__job -> "pack front" / "out of pack" / "in hand" / "in use" / "close up"
  dl.product__facts
    dt "Looks like"         dd the words from the brain, as written
    dt "Pack"               dd what it is sold in and what is printed largest
    dt "How it is used"     dd an ordered list, 1 step per line
    dt "Visible result"     dd what a viewer can see change, or "nothing visible"
    dt "Moves and sounds"   dd each motion with its sound
    dt "Never show"         dd in the amber "don't" style
```

A blank field prints "not yet described" in the muted colour. A missing photo leaves an outlined empty box with its job named, so the gap is seen.

## Page 6: The world, motion and sound

2 halves.

**The world**: 5 short rows (Places, Surfaces and props, Light and time of day, People, Never in frame), each the brain's own words; beside them, 2 to 4 of the brand's own photographs that show it. "Never in frame" is set in the amber "don't" style.

**Motion and sound**: 5 short rows (Pace, Camera, Sound, On-screen text, Formats in use).

No stock pictures and nothing generated: if the brand has no photograph that shows its world, the rows stand alone.

## Page 7: Components (web builds only)

Left out unless the guide is for someone building pages and the site's code was read.

**Buttons:**
Each button variant as a real rendered specimen + label:
```
.btn-row (flex, gap: 16px, align center)
  .btn-specimen  → actual styled button
  .btn-label     → monospace description: "Primary CTA · pill · amber bg"
```

**Border radius table:** simple 2-col (element → value)

**Spacing scale:** visual bars with labels, sorted small to large

**Cards:** two side-by-side pattern boxes showing card variants

## Page 8: Cheat sheet

Everything compressed onto one page for pinning above a desk:

- Color dots: flex row of 48x48 colored circles
- Fonts: 2 lines (heading font + body font with weights and case rules)
- Section pattern: one line showing eyebrow → H2 → subtitle → content flow
- CTA hierarchy: numbered list (primary → secondary → tertiary)
- Voice in N words: one bold line summarizing the voice (e.g., "Direct. Specific. Short. Opinionated. Real.")
- One-line voice rule: the single most important copy rule
- The product in 2 lines: what it looks like, and the 1 thing never to show
- The world in 1 line: the place, the light, the people
- Not yet captured: every blank field, with the founder question that fills it

## Page Footer

Every page (except cover) gets:
```
.page-footer (absolute bottom, flex space-between)
  left: client name
  right: "Brand Guide v1.0"
```

## CSS Patterns to Reuse

**Section headers** (every page after cover):
```css
.section-num   → accent color, 11px, uppercase, 0.18em tracking, "01, Color"
h2             → heading font, 32px, 700, uppercase, primary dark
.section-intro → body font, 15px, muted color, max-width 56ch, 1.65 line-height
h3             → heading font, 13px, 700, uppercase, 0.12em tracking, margin-top 36px
```

**Tables:**
```css
.scale-table th → heading font, 10px uppercase, 0.14em tracking, 2px bottom border
.scale-table td → body font, 13px, 1px bottom border (border color)
td:first-child  → heading font, bold, uppercase (row label)
```

**Voice cards:**
```css
.voice-card--do   → green-tinted bg, green border, green label
.voice-card--dont → amber-tinted bg, amber border, amber label
```

## Adapting for Different Brands

- **Fewer colors?** Use 3-col grids instead of 4. Drop the "Supporting" section if there are only 5 total.
- **One font?** Show it at both heading and body sizes in one specimen. The type scale table still works.
- **No dark sections?** Skip the section rhythm strip and color-on-background demo.
- **No voice guidelines?** Leave page 4 out. The cheat sheet drops the voice line.
- **No product fields yet?** Page 5 shows the photos that exist with their jobs, and "not yet described" for the rest.
- **Not a web build?** Leave page 7 out.
- **More than 2 fonts?** Add a third specimen card. Consider whether the third font needs its own scale entries.
