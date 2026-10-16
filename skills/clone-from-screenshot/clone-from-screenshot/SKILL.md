---
name: clone-from-screenshot
description: Use when given a screenshot, image, or URL of a webpage or landing page and asked to clone, recreate, or rebuild it as HTML, including "make this page ours", "rebuild this competitor page with our brand", or any request to borrow a layout and then fill it with a brand's own colours, fonts, copy, products and proof. Borrows the layout only, never another brand's words, images, logo or reviews.
---

# Clone From Screenshot

## Overview

Two phases, one gate between them.

- **Phase 1 — Clone 1:1.** A static HTML page that matches the source screenshot section for section: same proportions, colours, type, image shapes, copy. Nothing changed, nothing "improved".
- **Gate.** The user sees the clone and says go (and what to change).
- **Phase 2 — Rebrand.** Swap tokens, copy, and assets for the brand's own. Layout and structure stay frozen unless the user asks for a modification.

**What it is judged on:** the finished page has the source's structure and nothing else of the source's: every word, picture and number on it is the brand's own, and it still does what a landing page must (carry on from the ad, answer the buyer's needs in order, fit the kind of product).

## What may be borrowed, and what may not

A page may borrow another page's **layout**: the order of sections, the grid, the proportions, the kinds of component. It must not carry another brand's **words, images, logo, reviews, review scores, press logos, badges, customer names or photos, or product**.

- `clone.html` (Phase 1) holds the source's copy and crops of its images so the layout can be checked. It is a private working file. It is never published, hosted, sent to a customer, used in an ad, or handed over as a deliverable.
- `branded.html` (Phase 2) is the only file that leaves the folder, and only once `leftovers` exits 0 and the fact slots below are filled from the brand brain or removed.
- Do not rebuild a page so it could be mistaken for the source brand's own (its name, its mark, its distinctive look copied whole). The brand's own colours and fonts replace the source's in Phase 2 for this reason as well as for taste.
- A slot that states a fact is never filled by rewording the source's fact. See "Fact slots" in Phase 2.

Screenshot-to-HTML is an **image-reading problem before it is a coding problem.** Every fidelity failure in this skill's history traces to writing code before finishing the read. Phase 1 is therefore strict about order: capture → slice → inventory → build → verify.

Everything mechanical lives in `clone-tools.py` (Python 3 + Pillow, plus Chrome for `capture`; set `CHROME_BIN` if Chrome is not found). Run `python3 clone-tools.py -h` for the subcommands (`python` where that is the name of Python 3). Colours are sampled, sizes are measured on the grid, comparisons are rendered — none of it is eyeballed.

## Where things go

The **brand folder** is the folder holding `brain.md` and `brand-guidelines.md` — `clients/{slug}/` in client-hub, or the root of a single-brand brain repo. Output:

```
{brand folder}/clone/{page-name}/
  source.png            the screenshot (or the capture)
  source-mobile.png     if a mobile screenshot was supplied
  strips/               sliced source, gridded
  inventory.md          filled from references/inventory-template.md
  assets/source/*.png   regions cropped from the source — clone.html renders from these; keep them
  assets/*.{jpg,png}    the brand's own assets, dropped in during Phase 2
  clone.html            Phase 1 result — frozen after the gate
  render/               verification captures + compare strips
  branded.html          Phase 2 result
```

`{page-name}` is the source + page type, e.g. `source-7-reasons`.

---

## Phase 1 — Clone 1:1

### 1. Get the source at native resolution

- Screenshot supplied → copy it to `source.png`. Ask for a mobile screenshot too if the page will be used on mobile; do not block on it.
- URL supplied → `clone-tools.py capture URL source.png` (default 1440px viewport). Never reconstruct a URL from memory of the brand — the live page is the source.

Record the source width; the clone is built for that viewport and verified at it.

### 2. Slice and read everything

```bash
python3 clone-tools.py slice source.png strips/
```

Read **every strip** at full size, top to bottom. The magenta grid labels are page coordinates; for exact numbers use the measuring subcommands — `bbox` (edges of a button, card, band or image by its colour), `edges --col X` (where sections, padding and gaps start and stop along a column). While reading, fill `inventory.md` (copy `references/inventory-template.md`):

- **Sections** — one row per visual section, with y-range, column layout, which side holds the image, background.
- **Tokens** — every colour sampled, not named: `clone-tools.py palette source.png X Y W H` on a button, a background, a card; `palette … --dark` on a text block for the text colour (`--light` for text on a dark band); `color source.png X Y` for a single pixel. The template's token list is the minimum — a source with three greens and an orange gets `--brand-2`, `--accent-2`… as needed; every colour still ends up in `:root`. Fonts classified by what you see (stroke contrast, x-height, terminals) before naming a candidate, and their weights recorded as tokens too.
- **Images** — every photographic region, badge, logo, and illustration with its crop box and aspect ratio.
- **Copy manifest** — every string, verbatim: headlines, body, chip labels, stats, quotes, disclaimers, button text. Never paraphrase; never fill a gap from memory.
- **Component checks** — the inversions that recur on DTC pages (chip polarity, avatar shape, timer format, bottom CTA type). Answer each from the source.

If the source is a DTC advertorial / "7 reasons" page, `references/dtc-anatomy.md` is the section checklist.

The inventory is complete when every section has a row, every colour has a hex, and every image has a crop box. Only then open an editor.

### 3. Cut the source images

For each row in the images table:

```bash
python3 clone-tools.py crop source.png X Y W H assets/source/hero.png
```

The command prints the aspect ratio — that goes in the CSS. These crops make the clone visually 1:1 for the comparison; they are the original brand's assets and every one is replaced in Phase 2, which is why each `<img>` carries `data-swap`. They stay in `assets/source/` so `clone.html` keeps rendering after the gate.

If a photo carries text that the source rendered *into* the image (a hero headline baked into the picture), blur that region of the crop — `clone-tools.py patch assets/source/hero.png X Y W H` — and write the copy as DOM on top. Otherwise the DOM copy ghosts over the baked copy in every compare.

### 4. Build `clone.html`

Semantic HTML, one `<style>` block, no framework, no build step. Three contracts make Phase 2 a swap instead of a rewrite:

**Token block** — every value from the inventory tokens table, and no colour, font, weight, radius, shadow, or width written anywhere else. `clone-tools.py lint clone.html` enforces this (and the two markers below); run it before the first compare and after the last patch.

```html
<style>
:root {
  --bg: #faf3e7; --surface: #fff; --ink: #1b1b1b; --ink-soft: #5c5750;
  --brand: #c4f03d; --brand-ink: #10210a; --accent: #c4f03d; --band: #10210a; --band-ink: #fff; --line: #e6dccb;
  --font-display: "Fraunces", Georgia, serif; --font-body: "Inter", system-ui, sans-serif; --font-ui: var(--font-body);
  --weight-display: 600; --weight-heading: 700; --weight-body: 400;
  --radius-card: 16px; --radius-btn: 999px; --radius-img: 10px;
  --shadow-card: 0 8px 30px rgba(0,0,0,.08);
  --max-w: 1100px; --pad-section: 88px;
}
@media (max-width: 768px) { /* the one place a literal is allowed: breakpoints cannot read var() */ }
</style>
```

**Section ids** — `<section id="s03-timeline">`, numbered to match the inventory, so a compare strip maps straight to the code.

**Swap markers** — `<img data-swap="hero" src="assets/source/hero.png" style="aspect-ratio:1440/472">`. Photos, badges, logos, illustrations are `<img>`; text, chip grids, tables, timelines, review cards are DOM. A text block is never an image.

Fonts: load the nearest Google Fonts match; write the substitution in the inventory's deviations list. If the source has a mobile screenshot, build the `@media` layout from it; if not, write a sensible stack and log "mobile interpreted" in deviations.

### 5. Verify against the source, section by section

```bash
python3 clone-tools.py capture clone.html render/clone.png --width {source width}
python3 clone-tools.py compare source.png render/clone.png render/compare/
```

Read **every** compare strip (source left, render right). For each section confirm: same background and button hex, same chip polarity, same avatar shape and position, same timer format, same column split, same image shape, no image overflowing its box. The printed Δ (total height) is a smoke test, not the check — fixed-height sections make it zero while a section is still wrong. Where a strip looks close but not right, `compare … --zoom X Y W H` shows that region at 1:1. Patch, re-capture, re-compare — until each section matches or its difference is written in the deviations list. Finish with `lint clone.html` clean.

### Gate

Phase 1 is done when the compare strips have been reviewed, deviations are logged, and the user has been given the path to `clone.html` and the deviations list. Stop here and wait for their go and their change list. `clone.html` is not edited after this point.

---

## Phase 2 — Rebrand

Work in a copy: `cp clone.html branded.html`. Order matters — each step is verified before the next.

### 1. Map tokens from the brand

Read `{brand folder}/brand-guidelines.md` (colours with roles, fonts) and, for product facts, `products-and-positioning.md` if the folder has one — otherwise the product/pricing sections of `brain.md`; `brain.md` as a whole is for voice. Fill the inventory's **Rebrand map**: for each `--token`, the brand value and the guideline line that justifies it (e.g. "Dark Green `#1E4222` — buttons, announcement bar" → `--brand`). A source with more colour tokens than the brand has colours maps several tokens to one value — write that down rather than inventing a shade. Then change values inside `:root` only, weights included (a brand serif at the source's 600 usually wants `--weight-display: 500`). Capture and look: text on `--brand` and `--band` must still read; a light source palette swapped for a dark brand palette needs `--brand-ink`/`--band-ink` re-paired, not new selectors.

### 2. Decide what the page is for, then rewrite the copy

Before a word is written, settle 3 things and note them in the inventory:

- **The ad.** Which ad sends visitors here? The first screen repeats it: the headline keeps the ad's hook line, the page speaks to the ad's buyer, the first offer shown is the offer the ad named, and the hero image shows the same product as the ad. If there is no ad, write down the 1 buyer and 1 angle.
- **The kind of product.** The source was built for 1 kind. A layout made for a product bought again (an ingredient table, a "day 7, day 30, day 90" timeline, a subscribe box, a price per day) does not fit a product bought once (which needs size or fit, dimensions and materials, what is in the box, returns, warranty), and the other way round. Mark each section "fits", "change to..." or "remove", and apply it in step 4.
- **Fact slots.** Go down the copy manifest and mark every slot that states a fact. Each is filled from the brand brain, or the element is removed. Never by rewording the source, never with a placeholder number that could ship.

| Fact slot in the source | Filled from | If the brand has none |
|---|---|---|
| Review cards, testimonial rows, customer names and photos | Real reviews, word for word, with the name and source the brand brain gives | Remove the section |
| Star rating, review count, "customers served", "sold" counts | The brand's own stated figure | Remove the element |
| Press logo strip, "as seen in" | Press the brand was really in | Remove the strip |
| Review-site widget or score | The brand's own profile on that site | Remove the section |
| Certification icons, badges, "tested by" | Certifications the brand holds | Remove them |
| Countdown timer, "only N left", sale ribbon | A real deadline or stock figure the store can run | Remove it. An always-on timer is invented urgency |
| Prices, compare-at prices, the offer, free gifts | `offers.json`, at the brand's prices; a compare-at is a real former or separate price | Show the product's price only |
| Guarantee, returns, delivery, warranty lines | The brand's own terms | Remove the line |
| Before and after, results timeline | Real results the brand may claim, as it states them | Remove the section |
| Ingredient or specification table | The product's own ingredients or materials and dimensions | Remove the table |
| Author line, expert, founder | A real person at the brand, with their agreement | The brand's name |

Then write: every remaining slot gets brand copy, for the brand's product, in the brand's voice, at roughly the source length so the layout holds. Transcribed source copy is scaffolding and none of it ships, reworded or not: the argument is rebuilt from the brand's own reasons, not translated line by line. If the repo has an `ai-copy-blacklist.md`, run the new copy through it.

### 3. Replace the assets

Every `data-swap` image gets a brand asset from `{brand folder}/assets/` (or one the user supplies) at the same aspect ratio, saved as `assets/{name}.{ext}`. No image of the source's is kept, traced or redrawn: not its product, its people, its logo, its badges or its illustrations. A person shown as a customer, a founder or an expert is that real person, from an upload. No generated children. Three or four brand photos across twenty slots is normal — crop different regions of them; a photo of product A never sits under product B's name. A slot with no brand asset:

- photo, logo, badge, avatar → a `<div>` placeholder with the slot's aspect ratio, a `--line` dashed outline and the slot name as its text, so the owner sees what to supply;
- decorative texture, pattern band, edge illustration → drop it; the section keeps its background token. A placeholder box the width of the page is not a placeholder, it is a new section.

Both go in the inventory under "Not sourced".

```bash
python3 clone-tools.py leftovers clone.html branded.html
```

Exit code 0 means no source copy (4+ words) and no `assets/source/` file is referenced by `branded.html`. Non-zero lists what is left; fix and re-run. `assets/source/` itself stays on disk for `clone.html`. `leftovers` catches copied strings; it does not catch a copied number, name or logo, so read the fact-slot table against the page once more by eye.

### 4. Apply the requested modifications

Only now: the changes the user asked for, the sections marked "change" or "remove" in step 2 (a timeline swapped for a size guide, a subscribe box for a single price with returns and warranty), and the fact slots that had to go. 1 change at a time, each captured and checked before the next, so a layout break is attributable.

### 5. Verify the rebrand held the layout

```bash
python3 clone-tools.py capture branded.html render/branded.png --width {source width}
python3 clone-tools.py compare render/clone.png render/branded.png render/compare-branded/
```

Left is the frozen clone, right is the brand version: structure identical, only colour/type/copy/images differ, unless a modification was asked for. `lint branded.html` clean. Check it at a phone width too: most visitors arrive on a phone, and a clone of a desktop screenshot is not a phone page until it has been looked at as one. Hand back `branded.html`, the rebrand map, and the "Not sourced" list (missing assets, fact slots removed for want of a fact, colour roles the guidelines do not define, contact details not on file).

---

## Red flags — stop and re-read the source

| Thought | Do instead |
|---|---|
| "I know what this green looks like" | `palette` on the button. Write the hex it prints. |
| "It's a standard card layout" | Check avatar shape and position in the strip. |
| "I'll do one section at a time and inventory as I go" | Finish the inventory. The strips are the spec; HTML is not. |
| "Close enough, I'll adjust after" | Adjusting after costs more than reading first — and skips the compare. |
| "I'll rebrand while I clone, saves a pass" | Two outputs, one gate. The 1:1 clone is what the user checks the layout against. |
| "This headline works for our brand too" | Source copy never ships. Rewrite every slot. |
| "I'll keep their reviews as placeholders" | A review is real and the brand's own, or the section goes. |
| "They show 4.8 stars, we probably have about that" | The brand's stated figure, or no stars. |
| "The press strip makes it look credible" | Only press the brand was in. Otherwise remove the strip. |
| "The countdown timer is part of the design" | It is a claim. No real deadline, no timer. |
| "I'll send clone.html so they can see progress" | `clone.html` holds another brand's words and images. Show it on screen; ship only `branded.html`. |
| "The layout will hold, no need to re-compare" | Capture and compare. Copy length and image shape change heights. |
| "Just this one `color: #fff` inline, it's the hero" | It is the value Phase 2 cannot reach. Token it. `lint` will find it anyway. |
| "The Δ is 0, the clone matches" | Δ is total height. Read the strips — that is the check. |

---

## What this reads from the brand brain

| What | Where (contract names) | When it is blank |
|---|---|---|
| Colours with their roles, fonts | `brand-guidelines.md` Visual identity (Color palette, Typography); `brand-look.json` | Map several tokens to 1 value and list the missing role under "Not sourced" |
| Voice | `brand-guidelines.md` Brand voice and tone, Brand guardrails | House style |
| The product, price, offers | `products-and-positioning.md` Product catalog, Bundles and offers; `offers.json` | Ask. No price is guessed |
| Ingredients, or materials and dimensions | `brand.json` products (`ingredients`, `specs`) | Remove the table |
| Guarantee | `brand.json` guarantee | Remove the line |
| Real reviews with sources | `customer-avatars.md` Grounded in, Customer language bank | Remove the review sections |
| Rating, counts, press, certifications | `brand.json` claims with sources, proof assets | Remove the element |
| The buyer and their objections | `customer-avatars.md` per avatar | Ask who the page is for |
| Photos, logo | `assets/` | Dashed placeholder with the slot's name |
| The ad the page follows | Creative Studio or the ad account: hook line, buyer, offer, image | Write down 1 buyer and 1 angle |

Not in the contract, and a cloned page nearly always has a slot for them: **Returns**, **Shipping and delivery**, **Warranty**, **What is in the box**, **Size and fit**, the brand's own **FAQ**, **Proof on file** (rating and count with where each is shown; press and certifications with a link; the brand's profile on a review site), the **logo file** in `assets/`, and **contact details** for the footer.
