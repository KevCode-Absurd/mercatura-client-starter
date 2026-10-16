---
name: generate-50
description: Generate 50 ad creatives from your brand brain in three approval-gated phases (strategic plan, brief expansion, AI image generation). Triggered by "generate 50", "create my ads", "generate ads", "/generate-50". Requires /brand-brain to be completed first.
user-invocable: true
---

# generate-50: AI Ad Creative Sprint

> Archive (2026-10-05): the community skill as received, kept as the "before". No step is sent this file. The tools, models and command lines it names are not the app's; current facts are in `skills/production-principles/models.md`, and the method the app runs is `../SKILL.md`.

AICMO community skill. Takes a completed brand brain folder and produces 50 ad creatives in three phases: strategic plan, brief expansion, generation.

## THE TWO APPROVAL GATES (read first, never violate)

This skill is approval-gated. Two gates stand between starting and generating images:

- **GATE 1 (end of Phase 1):** The user must explicitly approve the 50-ad plan before ANY briefs are written.
- **GATE 2 (end of Phase 2):** The user must explicitly approve the 50 briefs before ANY images are generated (or, for Option 4, before `prompts-ready.md` is written).

Rules that apply to both gates:

1. NEVER generate an ad image before both gates have passed. No exceptions, no "just a preview", no partial batches.
2. Explicit approval only. "Looks good", "approved", "generate", "go ahead" count. Silence, a question, or a change request do NOT count.
3. If the user requests changes at a gate, apply them, re-present the full updated output, and wait at the same gate again. Loop until explicit approval.
4. If the user tries to skip ahead ("just generate them"), confirm once: restate what will be generated and get an explicit yes before treating it as approval of both gates.

There is also one **mandatory asset quantity gate** inside Phase 1 (see 1.3). It blocks plan construction, not just generation.

---

## Prerequisites

`/brand-brain` must have been run first. Before Phase 0, verify `brand-brain/` exists with all 7 files and an `assets/` subfolder:

- `brand-brain/brand-guidelines.md`
- `brand-brain/products-and-positioning.md`
- `brand-brain/customer-avatars.md`
- `brand-brain/competitors.md`
- `brand-brain/brain.md`
- `brand-brain/winning-ads.md`
- `brand-brain/recent-changes.md`
- `brand-brain/assets/` (folder)

If the folder or files are missing, stop and tell the user to run `/brand-brain` first. Do not improvise brand context.

## Reference file

- `reference/motion-benchmarks.md` (bundled with this skill): Motion 2026 format hit rates, hook performance, vertical-specific recommendations, and the 50-ad planning framework. Read it in Phase 1 and use it to build the format distribution and angle map.

## Terminology (use consistently)

- **Slot**: one of the 50 planned ad positions (Ad #1 through Ad #50).
- **Asset**: a product/brand photo in `brand-brain/assets/` (original client photo or AI-generated in Phase 1).
- **Template**: a winning-ad layout reference pulled from ShipWinningAds, used for spatial arrangement only.
- **Brief card**: the full per-slot spec produced in Phase 2.
- **`[SELECTED_TOOL]`**: the generation tool chosen in Phase 0.

---

## Phase 0 — Tool Selection

Before reading any files, ask the user once:

> "Which image generation tool will you use to create these ads?
>
> 1. **Google Studio API, Nano Banana 2** (default, recommended)
> 2. **Higgsfield MCP**
> 3. **GPT Image Gen**
> 4. **Just give me the prompts.** I'll copy-paste them myself."

If the user skips or is unsure, default to option 1 (Nano Banana 2).

Store the selection as `[SELECTED_TOOL]`. Reference it in Phase 2 prompt writing and Phase 3 generation. Do not ask again.

Option 4 changes Phase 3 entirely: no generation runs. Instead, Phase 3 produces a single output document (`brand-brain/prompts-ready.md`) with one entry per ad: the full prompt, the exact asset filename to attach, and paste instructions for whatever tool the user is using. GATE 2 still applies before that file is written.

---

## Phase 1 — Strategic Plan

### 1.1 Read the brand context

Read ALL of these before building anything:

- `brand-brain/brand-guidelines.md` — brand voice, colors (get exact hex codes), fonts, USPs
- `brand-brain/products-and-positioning.md` — products, pricing, hero products, positioning angles
- `brand-brain/customer-avatars.md` — pain points, objections, desires, hooks that work per avatar
- `brand-brain/competitors.md` — competitor gaps and differentiation angles
- `brand-brain/brain.md` — what's been tried, what's been learned, what to avoid
- `brand-brain/winning-ads.md` — proven formats and angles for this brand (if populated)
- `brand-brain/recent-changes.md` — anything that changed since setup
- `reference/motion-benchmarks.md` — format hit rates, vertical recommendations, hook performance

### 1.2 Asset inventory

**First: check for an existing cache.**

```bash
ls brand-brain/assets-cache.json 2>/dev/null
```

If `brand-brain/assets-cache.json` exists: read it. For each file already in the cache, use the stored data; do not re-read the image. Only analyze images whose filenames are NOT present as keys in the cache.

If the cache does not exist: analyze every image in `brand-brain/assets/`.

**Analyzing images:**

For each image that needs analysis, read it with the Read tool to see it visually. Then produce a JSON entry in this exact structure:

```json
"FILENAME.JPG": {
  "analysis": {
    "assetType": "studio | lifestyle | in_use | ugc_style | modeled_product | no_people",
    "description": "One detailed paragraph describing exactly what is in the image: subject, product shown, positioning, background, any people.",
    "style": "One sentence on photography style: lighting, mood, depth of field, setting.",
    "dominantColors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
    "products": ["Exact product name as it appears or can be inferred"],
    "tags": ["tag1", "tag2", "..."],
    "suggestedUses": ["Suggested ad use 1", "Suggested ad use 2", "..."]
  },
  "productTags": ["product-slug-from-products-and-positioning"]
}
```

**assetType values (exactly one per image):**
- `studio` — product on clean/white/neutral background, no people
- `lifestyle` — product in a real environment (home, outdoors, on a surface)
- `in_use` — product being actively used by someone
- `ugc_style` — raw, phone-camera feel, unpolished
- `modeled_product` — product worn or held by a person in a lifestyle context
- `no_people` — product only, any non-studio background

**tags** must cover: product name, product category, who is in the shot (if anyone), setting/background, style descriptors, relevant use cases.

**productTags** must reference the product slug from `brand-brain/products-and-positioning.md`, in kebab-case (e.g., `crochet-snap-clip`).

After analyzing all new images, write the complete updated cache to `brand-brain/assets-cache.json`. Merge new entries with existing entries; never overwrite entries that were already cached.

Present the inventory as a summary table (count by assetType). Use the cache data for this; do not re-read images that were already cached.

### 1.3 Asset checks

#### Step 1 — Quantity check (MANDATORY GATE)

Calculate the minimum assets needed: `min_assets = ceil(total_ads / 5)`. The hard limit is **5 ads per asset**; reusing the same photo more than 5 times creates a repetitive feed that audiences tune out.

If `assets_count < min_assets`, this is a mandatory gate. Do not proceed to plan construction (1.4) until resolved. Say:

> "You have [X] assets, which covers [X×5] ad slots at most. For [total_ads] ads you need at least [min_assets] assets. Reusing the same photo more than 5 times in one batch kills feed variety and performance.
>
> Two options:
> 1. **AI photoshoot.** I'll generate the [N] additional assets you need using your brand context. Which approach?
>    - **From scratch**: unique prompts built from your brand colors, product type, and avatar demographics
>    - **Re-create a winner**: pull winning ads from ShipWinningAds and generate photos in those compositional styles with your product
> 2. **Add your own photos.** Drop more images into `brand-brain/assets/` and tell me when ready."

**If user chooses AI photoshoot, From scratch (Branch A):**
1. Target: generate enough assets to reach `min_assets`; prioritize lifestyle and in-use shot types for variety.
2. Write generation prompts using the brand color palette, product description, and avatar profile (age/gender/lifestyle from `customer-avatars.md`).
3. Generate using `[SELECTED_TOOL]`.
4. Save to `brand-brain/assets/`.
5. Update `brand-brain/assets-cache.json` with the new images.
6. Re-count assets and confirm the quantity gate is cleared before continuing.

**If user chooses AI photoshoot, Re-create a winner (Branch B):**

1. **Pull templates from ShipWinningAds.**
   - Call the ShipWinningAds MCP with `count=10`, filtering by the brand's category.
   - If 10 suitable templates are not found in the brand's category, broaden to adjacent or different categories until you have enough; do not stop at an insufficient set.
   - Templates are JSON entries with a corresponding image. If the image URL is not returned by default, call the MCP to request it explicitly before proceeding.
   - Display the template previews to the user so they can see what's being used as reference.

2. **Write a brand-adapted prompt for each template.** Read each template image visually, then write a generation prompt that:
   - **Preserves**: composition, shot type, framing, lighting setup, subject positioning, environment structure (e.g., person sitting on a bean bag becomes a new person, same bean bag, same position)
   - **Swaps**: product becomes the brand's actual product; people become a new person matching avatar demographics from `customer-avatars.md` (age, gender, lifestyle match)
   - **Adapts**: background colors and surfaces toward the brand palette from `brand-guidelines.md` where it fits naturally (e.g., orange studio background becomes brand cream or forest green); don't force it, apply where it reads as on-brand without looking artificial
   - **Keeps**: anything that doesn't conflict with the brand: lighting quality, studio setup, spatial relationships, mood

3. **Generate.** The template image MUST be uploaded and passed as a reference; this is what keeps the composition from looking purely AI-generated.

   **Higgsfield upload flow (required for each template):**
   1. Download the template: `curl -sL "[template_url]" -o /tmp/template_ref.jpg`
   2. Call the Higgsfield MCP `media_upload` tool → get `upload_url` and `media_id`
   3. Upload the file: `curl -X PUT "[upload_url]" --upload-file /tmp/template_ref.jpg`
   4. Call the Higgsfield MCP `media_confirm` tool with the `media_id`
   5. Call the Higgsfield MCP `generate_image` tool with:
      - `model: "marketing_studio_image"`
      - `prompt`: the brand-adapted prompt written above
      - `reference_images`: `[{ "media_id": "[confirmed_id]", "role": "image" }]`
      - `aspect_ratio`: `"3:4"`

   **Nano Banana 2:** pass the template as Image 1 (layout reference); the brand-adapted prompt describes the recreation.

   Name each generated file `[template-filename]_AI.png`; the `_AI` suffix marks it as AI-generated from a template. Save to `brand-brain/assets/`.

4. **Log the template-to-asset mapping.** After each generation, append an entry to `brand-brain/asset-generation-log.json`:

   ```json
   {
     "[template-filename]_AI.png": {
       "source_template_filename": "[original template filename]",
       "source_template_url": "[template image URL]",
       "generation_prompt": "[the prompt used]",
       "tool": "[SELECTED_TOOL]"
     }
   }
   ```

   This log is used in Phase 3: when generating ads, any asset that has a log entry gets paired with its original source template as the layout reference, creating a matched pair.

5. **Asset QA and client review.** Read each generated image immediately after generation. Asset QA is different from ad QA (Step 3.3); apply this checklist:

   **FAIL — discard and skip (do not save to assets/):**
   - Product is invisible (if this slot was supposed to feature the product)
   - Another brand's product, logo, or watermark bled through from the template
   - Deformed or uncanny anatomy: people, hands, or animals look wrong
   - Image so AI-looking it would be obvious in a feed (plastic skin, floating elements, unnatural proportions)
   - Wrong animal breed or size for the brand (e.g., toy breed for a large-breed supplement)

   **WARN — flag to user but include in library:**
   - Product present but small or not the hero of the frame
   - Colors drift noticeably from brand palette but composition is usable
   - Composition partially matches template but not closely

   **PASS — save and cache:**
   - Product clearly identifiable (if it should be in frame)
   - Composition reflects the template's shot type: portrait stays portrait, action stays action, flat-lay stays flat-lay
   - Looks natural enough to run as a paid ad, not obviously AI-generated
   - On-brand colors and mood

   Report QA results per image. Flag WARNs with a note. Do not count FAILed images toward the quantity gate; they don't exist as usable assets.

   After all passing assets are saved, say: "Your new assets are in `brand-brain/assets/`. Review them and let me know when ready to build the plan."
   - Update `brand-brain/assets-cache.json` with all passing images.
   - Re-count assets and confirm the quantity gate is cleared before continuing.

**If user chooses Add your own photos:**
- Wait for confirmation before continuing.
- Re-scan `brand-brain/assets/`, update the cache with any new images (per 1.2).
- Re-check quantity; if still insufficient, surface the gap again before proceeding.

#### Step 2 — Variety check (optional, recommendation only)

If the quantity gate is cleared but all assets are studio shots (no lifestyle, in-use, or UGC-style), surface this as a recommendation, not a hard stop:

> "You have enough assets ([X]) for the batch, but all are studio shots. Lifestyle and in-use images significantly improve format variety. Formats like Founder, POV, and Behind the scenes perform better with them. Want to generate a few lifestyle shots before we build the plan? This is optional; you can skip and we'll design around what's available."

If the user declines:
- Note which format slots will be constrained by studio-only assets.
- Design the 50-ad mix around what exists.

### 1.4 Build the 50-ad plan

Using the brand context and `reference/motion-benchmarks.md`:

**1. Determine format distribution.**

Pull the vertical-specific hit rate leaders from `reference/motion-benchmarks.md`. Cross-reference with `brand-brain/winning-ads.md`; bias toward proven formats. Apply the 50-ad split from the reference file:
- ~40% scale formats (Demo, Testimonial, Montage, Offer-first if a promo exists)
- ~30% high-hit-rate underused formats (Unboxing, Founder, POV, Behind the scenes)
- ~20% angle-specific formats (Before & after, Us vs them, Problem agitation)
- ~10% experimental (Collage, Grid swap, Statistic, Expert explainer)

Adjust percentages based on available assets. If no lifestyle shots exist, reduce Founder and Behind the scenes allocation.

**2. Build the angle map.**

Identify 8–10 creative angles from:
- Avatar pain points and objections (from `customer-avatars.md`)
- Competitor gaps (from `competitors.md`, "Gaps Worth Owning")
- Product USPs (from `brand-guidelines.md`)
- Proven hooks from winning ads (from `winning-ads.md`)

Map each angle to the formats that will carry it. An angle is one sentence, e.g.: "Skeptical buyer who tried everything and finally found something that works."

**3. Build the asset assignment table.**

Assign every one of the 50 slots to a specific asset file from `brand-brain/assets/`. Verifiable rules:
- No slot left unassigned.
- Hard limit: no asset appears in more than 5 slots.
- Distribute as evenly as possible across the library; never assign the same asset to adjacent slots.

### 1.5 GATE 1 — Present plan and wait for approval

Present to the user:

> "Here's the plan for your first 50 ads, based on your brand and what the data says works for [detected vertical]:"

Show three tables:
1. Format distribution (format name, slot count, reason)
2. Angle map (angle name, avatar it targets, formats assigned to it)
3. Asset summary (how many of each type, how many slots each type covers)

Then:

> "Does this look right? Tell me any formats to swap, angles to drop, or products to change. When you're happy, say 'looks good' to continue."

**STOP HERE.** Loop until the user gives explicit approval. Do not write a single brief before approval. Once approved, save the approved plan to `brand-brain/creative-plan.md`, then proceed to Phase 2.

---

## Phase 2 — Brief Expansion

Requires GATE 1 passed. Read `brand-brain/creative-plan.md`.

### 2.1 Brief card format

For each of the 50 slots, generate a full brief card in this format:

```
Ad #[N] — [Format Type] / "[Angle Name]"
Hook: [first thing the viewer sees or reads; be specific, not vague]
Headlines (3 variants):
  A: [4–5 words]
  B: [4–5 words]
  C: [4–5 words]
Visual direction: [what's in the frame, mood, composition, what product is featured]
Asset: brand-brain/assets/[exact filename]
Avatar: [which persona this targets; use the name from customer-avatars.md]
Prompt: [full image gen prompt for [SELECTED_TOOL]; see prompt format below]
```

### 2.2 Headline rules

- 4–5 words max; image gen models garble longer text.
- Lead with desire, not description ("Finally Sleep That Lasts" not "Sleep Supplement Features").
- No punctuation. No em dashes ever; this is a non-negotiable content rule for anything that ships.
- No internal collection names; they mean nothing to cold audiences.

### 2.3 Prompt format by tool

**Google Studio API (Nano Banana 2):**

```
CRITICAL RULES FOR IMAGE 1 (TEMPLATE):
Image 1 is a LAYOUT REFERENCE from a DIFFERENT brand. Use ONLY for spatial arrangement.
NEVER COPY: logos, brand names, watermarks, text, URLs, social handles.
ALL text must be freshly written for {brand_name} as specified below.

CRITICAL: Attached product photos are REAL photographs. PASTE them AS-IS, exact pixels, exact colors. NEVER redraw or reimagine any product.

Create a 3:4 ad for {brand_name}.
Image 1 = layout guide only. Match spatial arrangement. Ignore all text/content from Image 1.

STRATEGY: {angle}: {concept in 1 sentence}
LAYOUT: {1-2 sentences describing overall layout}

| POSITION | ELEMENT | DETAILS |
| full-frame | background | {color or gradient, exact hex codes from brand-guidelines.md} |
| {zone} | product photo | PASTE Image 2 AS-IS, UNMODIFIED. |
| {zone} | headline | "{chosen headline}", {hex color}, {exact font name from brand-guidelines.md}, bold |
| {zone} | subheadline | "{subheadline if needed}", {hex color}, {exact font name} |
| {zone} | cta button | "{cta text}", bg: {hex}, text: {hex} |

RULES:
- PRODUCT: PASTE exact photo. Never redraw.
- Colors: use only hex codes from brand-guidelines.md.
- Fonts: Headline = {exact font name}. Body = {exact font name}. Use the real font name, not generic descriptions.
- ALL TEXT MUST BE SPELLED CORRECTLY.
- NO CROPPING: All products fully visible.
- NO TEXT OVERLAPPING PRODUCTS OR FACES.
```

Leave `[TEMPLATE: TBD — filled in Phase 3 after ShipWinningAds call]` as a placeholder in the prompt where the template/layout reference will go. Phase 3 fills this in before generation runs.

**Higgsfield MCP:**
Write a descriptive natural-language prompt covering: visual concept, product placement, lighting, mood, background, text overlay (headline + brand name), aspect ratio (3:4). Reference the exact hex codes and font names from `brand-guidelines.md`. Do not use the table format; Higgsfield takes natural language.

**GPT Image Gen:**
Write a descriptive prose prompt: product description, scene/environment, lighting, composition, headline text to render, brand colors. Keep prompts under 200 words; GPT Image Gen performs better with focused prompts.

**Just give me the prompts (Option 4):**
Use the same table-structured Nano Banana 2 prompt format. Leave the `[TEMPLATE: TBD]` placeholder; it will be filled in Phase 3. The prompt will be delivered with explicit instructions on what images to attach and where to paste it.

### 2.4 GATE 2 — Present briefs and wait for approval

Group the 50 brief cards by format type for scannable review. Show a summary table first (ad number, format, angle, headline A, asset) so the user can scan all 50 quickly, then the full cards below.

> "Here are all 50 briefs, grouped by format. Review any you want to change; tell me the ad number and what to fix. When you're ready, say 'generate' to start producing images."

**STOP HERE.** Loop until the user gives explicit approval. Do not generate a single image (and do not write `prompts-ready.md` for Option 4) before approval. Once approved, save the approved briefs to `brand-brain/creative-briefs.md`, then proceed to Phase 3.

---

## Phase 3 — Generation

Requires GATE 1 and GATE 2 passed. Read `brand-brain/creative-briefs.md`.

### 3.1 Assign templates to each ad slot

**Check `asset-generation-log.json` first.**

Read `brand-brain/asset-generation-log.json` if it exists. For any ad slot whose assigned asset has a log entry, use that asset's `source_template_filename` and `source_template_url` directly; do not pull a new template for that slot. The asset was generated from that template, so they are a matched pair and will produce the most cohesive output.

For slots whose asset has no log entry (original client photos), call the ShipWinningAds MCP filtered by the brand's category. Select the most relevant template for each slot, matched by format type and angle. If the brand's category yields no suitable match, broaden to adjacent categories. If the template image URL is not returned by default, request it explicitly before proceeding.

Slot each template into the brief prompt, replacing the `[TEMPLATE: TBD]` placeholder. The template is used for spatial arrangement only; never copy its text, logos, or brand identity.

### 3.2 Generate

Every ad uses an asset from `brand-brain/assets/` (original or generated in Phase 1). Run all 50 via `[SELECTED_TOOL]`:

**Google Studio API, Nano Banana 2:**
Pass: (1) the winning ad template as Image 1, (2) the product asset from `brand-brain/assets/` as Image 2, (3) the full structured table prompt. Run sequentially; do not batch, rate limits apply.

**Higgsfield MCP:**

Both the template and the product asset must be uploaded before generation. Run this flow for each ad:

1. Download template: `curl -sL "[template_url]" -o /tmp/template_ref.jpg`
2. Higgsfield MCP `media_upload` → get `upload_url` + `media_id` for the template
3. `curl -X PUT "[upload_url]" --upload-file /tmp/template_ref.jpg`
4. Higgsfield MCP `media_confirm` → confirm the template `media_id`
5. Repeat steps 1–4 for the product asset from `brand-brain/assets/` (use the local file path instead of a URL in the curl)
6. Higgsfield MCP `generate_image` with:
   - `model: "marketing_studio_image"`
   - `prompt`: descriptive prompt from the brief
   - `reference_images`: `[{ "media_id": "[template_id]", "role": "image" }, { "media_id": "[product_asset_id]", "role": "image" }]`
   - `aspect_ratio`: `"3:4"`

The template reference anchors the composition. The product asset reference keeps the product looking real and on-brand. Both are required.

**GPT Image Gen:**
Call the GPT Image Gen API for each ad. Pass the prose prompt from the brief with the product asset attached.

**Just give me the prompts (Option 4):**
Skip generation entirely. Produce `brand-brain/prompts-ready.md` with one entry per ad in this format:

```
---
## Ad #[N] — [Format Type] / "[Angle Name]"

**Paste this prompt into your image generation tool:**

[full structured prompt with [TEMPLATE: TBD] replaced by the winning ad template name/description]

**Attach these images (in this order):**
1. Image 1: [winning ad template filename or description], layout reference only
2. Image 2: brand-brain/assets/[exact filename], your product photo

**Settings:** 3:4 ratio, highest quality available.

---
```

After writing all 50 entries, tell the user:

> "Your 50 ad prompts are ready in `brand-brain/prompts-ready.md`. Open the file, copy each prompt, attach the listed images in order, and paste into your tool of choice (ChatGPT, Gemini, Midjourney, etc.). The prompts are formatted for image generation tools that accept reference images."

Skip 3.3 and 3.4; there are no images to QA. The process ends here for Option 4.

### 3.3 QA every image

Read each generated image with the Read tool immediately after generation. Do not skip any image.

**FAIL — regenerate:**
- Misspelled or garbled text (any misspelling)
- Missing words from the headline
- Product cropped at edge
- Text overlapping product or faces
- AI-illustrated product instead of the real photo
- Text unreadable against background
- Wrong product featured
- Logo missing or incorrect brand colors

**PASS — acceptable:**
- AI-ish background or slight color shift
- Minor layout variation from the brief
- Slight shadow or lighting difference on the product

**If failed:** shorten the headline to 3 words, fix the specific problem in the prompt, re-run. Maximum 2 attempts per ad; if it fails twice, log it in the final report and move on. Do not loop endlessly.

Save each passing ad to `brand-brain/generated-ads/ad-[N]-[format-type].png`.

### 3.4 Final report

```
50 ads generated.
[X] used original assets from brand-brain/assets/
[X] assets were generated in Phase 1
[X] passed QA on first attempt
[X] required a retry
[X] failed after 2 attempts (listed below)

Saved to: brand-brain/generated-ads/
```

Follow with a table:

| Ad # | Format | Angle | File | QA |
|---|---|---|---|---|
| 1 | Demo | Skeptical buyer | ad-1-demo.png | ✓ |
| 2 | Testimonial | Mom guilt | ad-2-testimonial.png | ✓ retry |
| ... | | | | |
