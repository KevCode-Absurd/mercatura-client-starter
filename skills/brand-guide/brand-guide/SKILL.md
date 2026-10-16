---
name: brand-guide
description: Make a printable brand guide (HTML that prints to PDF, plus a copy-and-paste tokens file) for the people who make things for a brand - what it looks like, how it sounds, how its product must be shown, and the world it is shown in. Built from the brand brain; from a site's CSS where the guide is for a web build. Use when the user asks for a brand guide, style guide, brand book or design tokens document.
user-invocable: true
argument-hint: "[brand name or project path]"
---

# Brand guide

A guide for someone who has never worked with the brand: a designer, a freelance editor, a creator, a web builder. It is judged on 1 thing: from the guide alone, that person can make a picture, a clip or a page that is on brand and shows the product as it really is.

2 files come out:

1. `brand-guide.html`: the guide, 1 printed page per section (open in a browser, print, save as PDF with margins set to none).
2. `brand-tokens.md`: every value on 1 page, ready to paste.

In the app this is Brand, then Brand guide. The app builds it by rule from the brand's look and its guidelines, so it changes when they do.

## Step 1: gather, from the brand brain first

| Page | Read from | If it is blank |
|---|---|---|
| Colour | `brand-look.json` (colours read off the live site); `brand-guidelines.md` Color palette (name, hex, role) | Leave the page out. Never fill a palette with likely colours |
| Type | `brand-look.json` fonts; `brand-guidelines.md` Typography | Leave the page out |
| Voice | `brand-guidelines.md` Brand voice and tone, Voice do's, Voice don'ts, Tone by context, Key phrases and taglines, Brand guardrails (Never say) | Leave the voice half out |
| The product on camera | `products-and-positioning.md`, for the hero product and up to 3 more: Looks like, Pack, How it is used, Visible result, Moves and sounds, Never show, Reference photos (the files in `assets/`) | Show the photos that exist with their job under each, and print "not yet described" for a blank field |
| The brand's world | `brand-guidelines.md` Brand world (Places, Surfaces and props, Light and time of day, People, Never in frame); Photography and imagery style; Imagery do's and don'ts; Brand guardrails (Never show) | Leave the page out |
| Motion and sound | `brand-guidelines.md` Motion and sound (Pace, Camera, Sound, On-screen text, Formats in use) | Leave the block out |
| Components (web builds only) | The site's own code: CSS custom properties, a theme or design-token file, the styles of an existing page | Leave the page out |

For a web build with the code to hand, also read spacing (section and card padding, gaps), corner radius (cards, buttons, badges) and the button and card patterns.

Every blank is listed at the foot of the cheat sheet under "Not yet captured", with the founder question that fills it (`skills/founder-interview`). A guide with honest gaps is more use than one padded with general advice.

## Step 2: find the reasons

Before writing, work out, from the brain and not from taste:

- **What the palette is saying**: the 2 ideas the colours stand for, and the job of each (the 1 colour for the button, the 1 for the background).
- **What each typeface is for**: which speaks and which explains.
- **How the product is recognised**: the 2 or 3 things about it that must never be wrong in a picture (from Looks like and Never show).
- **What the world is**: the place, the light and the people in 1 sentence.

Each page opens with 1 or 2 sentences of this. A guide that only lists values is a spreadsheet.

## Step 3: make brand-guide.html

The skeleton is `references/template-structure.md`. Pages, in order, each left out when it has nothing to show:

1. **Cover**: the brand's name, "Brand guide", 1 line, the date.
2. **Colour**: the main swatches, the supporting ones, and how backgrounds alternate.
3. **Type**: each typeface set in the brand's own words, the scale, type on light and on dark.
4. **Voice**: how it writes, do and don't in pairs from the brand's real copy, words to avoid.
5. **The product on camera**: for each product, its reference photos with the job of each (the pack from the front, out of its pack, in a hand, in use, close up), then Looks like, Pack, How it is used as numbered steps, and Never show.
6. **The world, motion and sound**: where it is shown, on what, in what light, with whom, and what never appears; then how a clip moves and sounds.
7. **Components** (web builds only): buttons, corners, spacing, cards.
8. **Cheat sheet**: everything on 1 page to pin above a desk, with "Not yet captured" at the foot.

Rules for the file:

- 1 self-contained file: inline CSS; the brand's web fonts are the only outside link.
- `@page { size: A4; margin: 0; }`; each `.page` is 1 printed page with `page-break-after: always`.
- The guide is set in the brand's own fonts and colours. A guide for a forest-green brand is forest green.
- A swatch is a block of the colour over a white panel with its name, hex and role.
- A footer on every page but the cover: the brand's name on the left, "Brand guide" and the date on the right.
- Product photos are the brand's own files, never generated for the guide.

## Step 4: make brand-tokens.md

Plain markdown with blocks to copy: every colour with its hex and role; the CSS variables; the font import, if there is one; the type scale; then, in words, the product's Looks like and Never show and the brand's world in 3 lines each, so the same file can be handed to a picture or video tool. For a web build: corner radius, spacing, the button order.

## Step 5: hand it over

Save both in the brand's folder (for a web build, the project's `docs/` folder), open the HTML, and tell the person how to print it.

## What makes a guide good

- **It uses its own brand.** Never a generic grey and blue.
- **Reasons before values.** Each page says why before it says what.
- **Real specimens.** The brand's fonts setting the brand's words, not "The quick brown fox". The brand's product in the brand's photos.
- **It shows the product true.** A maker who reads page 5 will not draw a pouch as a tub or a matt pan as a shiny one.
- **Do and don't in pairs.** A real weak line beside the fixed one, from the brand's own copy.
- **It prints.** A4, clean page breaks, nothing that needs scrolling.
- **It fits any brand.** A snack, a serum, a jacket and a pan all have pages 2 to 6. Only page 7 is for web builds.

## Reference files

| File | When to read |
|---|---|
| `references/template-structure.md` | Always: the HTML skeleton, page by page |
| `references/example-output-chs.html` | When building by hand. It is 1 brand's guide, made for a web build: a worked example of finish and density. It has no product or world page, and its content is that brand's alone: copy nothing from it |

Adapt the structure to what the brand has: 6 colours or 14, 1 typeface or 3, 1 product or 4.

## What this reads from the brand brain

| Document and field | Page | When it is blank |
|---|---|---|
| `brand-look.json` colours and fonts; `brand-guidelines.md` Visual identity: Color palette, Typography | Colour, Type, the look of the guide itself | No guide can be set in the brand's look: stop and read the site first |
| `brand-guidelines.md` Brand voice and tone (Personality, Writes like), Voice do's, Voice don'ts, Tone by context, Key phrases and taglines | Voice | The voice half is left out |
| `products-and-positioning.md` per product: Looks like, Pack, How it is used, Visible result, Moves and sounds, Never show, Reference photos | The product on camera | "Not yet described", and the question to ask (F2.10 to F2.13, F2.7, F2.8, F11.5) |
| `brand-guidelines.md` Brand world: Places, Surfaces and props, Light and time of day, People, Never in frame | The world | The page is left out (F7.7, F7.8, F9.4) |
| `brand-guidelines.md` Motion and sound: Pace, Camera, Sound, On-screen text, Formats in use | Motion and sound | The block is left out (F7.9, F7.10, F8.5) |
| `brand-guidelines.md` Photography and imagery style, Imagery do's and don'ts, Brand guardrails | The world, the cheat sheet | Left out |
| `assets/` product photos; the logo file | Cover, the product page | The cover is set in type alone |

Needed and not in the brain today: the logo as a file with its clear space and smallest size, and which uses of it are not allowed.
