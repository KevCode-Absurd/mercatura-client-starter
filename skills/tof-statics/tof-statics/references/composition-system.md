# Composition system

The type layer is built in HTML at exactly 1080×1920 and rendered with
`scripts/compose.py` (Python Playwright). One HTML file per ad, adapted from
`templates/composition-base.html`.
This file is the spec for what goes in those files. It is for work done by hand: in the app
the words are rendered in the image in the brand's fonts (or left off), each size asked for is
made on its own, and the pixel positions below do not apply.

## Canvas law

- Canvas: **1080×1920** (9:16). The base image is `object-fit: cover`, full bleed.
- Read-zone: the centred **1080×1350** (4:5). Its top edge is y=285, bottom edge y=1635.
  Every element that must be READ — headline, subhead, callouts, product inset, price flag,
  CTA — lives entirely inside it. Test by cropping to the read-zone: the ad must be complete.
- The lower ~25% (below ~y=1440 in practice) carries scenery only.
- One master file. Never produce a second aspect ratio; the 4:5 crop IS the feed version.

## The default skeleton (Creative + Communicative)

| Zone | Y-range (approx) | Content |
|------|------------------|---------|
| Headline block | 300–780 | 2–4 lines, huge (90–130px), heavy weight |
| Subhead | directly below | ~40% of headline size (38–52px), 1–3 lines |
| Hero visual | centre | already in the base image — type must not fight it |
| Callouts / product | 1000–1600 | leader lines, inset, price flag |
| Scenery | 1635–1920 | nothing readable |

Headline block may sit lower if the base image's quiet area is lower — the skeleton bends to
the image, never the reverse. If the base has no quiet area, the base is wrong; regenerate.

## Devices — pick 1–3, never all

**Highlight bar.** One line of the headline reversed out in a solid accent block. Put it on the
*pivot* — the phrase where the ad turns ("MINTS START INSTANTLY." / "Food noise" / "STILL BACKED
UP."). Implementation: `<span class="bar">` with brand accent background, text in white or a
light tint of the accent, slight horizontal padding, `box-decoration-break: clone` for wraps.

**Two-tone headline.** Setup line(s) in a lighter weight or lighter tint; payoff line in heavy
weight, darker/accent color. The eye lands on the payoff.

**Leader-line callout.** A 2px hairline rule (with a small dot at origin) running from a short
caption to the product or the relevant part of the visual. Carries exactly ONE spec ("210 mg
magnesium per serving"). Max 2 per ad. Borrowed from technical illustration — it reads as
evidence, not decoration.

**Product inset.** When the product is not already in-scene in the base image: a small circular
crop (240–320px), thin white or brand-tint ring, placed in the lower half of the read-zone,
often the origin or target of a leader line. Never a floating rectangular cutout with a drop
shadow.

**Price/offer flag.** Small solid rectangle or pill, heavy type, adjacent to the product,
carrying the brand's real offer in its own words. Only on the <10% of ads that are offer statics.

**Lower-third caption (Native/documentary).** White or near-white bar with dark condensed type,
positioned like a broadcast lower third. Used when the base image imitates footage.

**iMessage/caption bubbles (Native/flat-lay).** White rounded-rect bubbles (border-radius ~28px),
black text, subtle shadow, placed like annotations on an organic photo. Two max: hook bubble
(top), resolution bubble (bottom of read-zone).

## Per-mode specs

### Creative (stop + DR headline)
Headline is the biggest element on the canvas, high contrast against the scene's quiet area.
Persona-calling or pain-naming question/statement. Subhead names the mechanism + product in one
breath. Product in-scene or inset near the bottom of the read-zone.

### Communicative (the visual explains)
The diagram/chart/sequence carries the argument, so type recedes: headline shorter and often
below or above the visual rather than over it; labels inside the visual do the work (generated
in-world where they're part of the illustration, or set as HTML labels/callouts when crisp
reading matters). Any number, unit, or word the viewer must trust — set it in HTML.

### Native (invisible ad)
No headline block, no brand chrome, no product inset. Only the mode's own device (lower third,
bubbles). Type must look like it belongs to the medium being imitated, not to an ad.

## Typography rules

- Client brand fonts first (check `brand-guidelines.md`); else a geometric sans
  (Poppins/Montserrat class). Load via Google Fonts `<link>` — compose.py waits for fonts.
- Real hierarchy: headline weight 700–800; subhead 500–600; captions 500, letter-spaced caps ok.
- Line-height tight on headlines (0.95–1.05). Kerning: `letter-spacing: -0.01em` to -0.03em on
  huge sizes.
- Text shadows only when the base forces it — prefer placing type over quiet areas. If needed:
  a soft scrim gradient behind the block, not per-letter shadows.

## Dev guides

`templates/composition-base.html?guides` draws the 4:5 read-zone bounds and a centre rule.
compose.py strips nothing — remove the query param (or leave it off) for the export render.
Always export WITHOUT guides, then verify the read-zone by cropping in QA.
