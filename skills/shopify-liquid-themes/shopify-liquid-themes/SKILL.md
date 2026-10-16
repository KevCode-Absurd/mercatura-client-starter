---
name: shopify-liquid-themes
description: "Generate Shopify Liquid theme code (sections, blocks, snippets) with correct schema JSON, LiquidDoc headers, translation keys, and CSS/JS patterns. Use when creating or editing .liquid files for Shopify themes, working with schema, doc, stylesheet, javascript tags, or Shopify Liquid objects/filters/tags, and when turning a landing page into a section and page template a store can install."
---

# Shopify Liquid Themes

Reference for writing theme code that installs cleanly and that a merchant can edit. In this app it is on disk for a later export of a landing page to a store (see "A landing page as a theme page"); no step is sent it. Shopify changes Liquid often: where this file and Shopify's own documentation disagree, the documentation wins, and anything marked *(deprecated)* in the reference files is not used in new code.

## Theme Architecture

```
.
├── sections/    # Full-width page modules with {% schema %} — hero, product grid, testimonials
├── blocks/      # Nestable components with {% schema %} — slides, feature items, text blocks
├── snippets/    # Reusable fragments via {% render %} — buttons, icons, image helpers
├── layout/      # Page wrappers (must include {{ content_for_header }} and {{ content_for_layout }})
├── templates/   # JSON files defining which sections appear on each page type
├── config/      # Global theme settings (settings_schema.json, settings_data.json)
├── locales/     # Translation files (en.default.json, fr.json, etc.)
└── assets/      # Static CSS, JS, images (prefer {% stylesheet %}/{% javascript %} instead)
```

### When to use what

| Need | Use | Why |
|------|-----|-----|
| Full-width customizable module | **Section** | Has `{% schema %}`, appears in editor, renders blocks |
| Small nestable component with editor settings | **Block** | Has `{% schema %}`, can nest inside sections/blocks |
| Reusable logic, not editable by merchant | **Snippet** | No schema, rendered via `{% render %}`, takes params |
| Logic shared across blocks/snippets | **Snippet** | Blocks can't `{% render %}` other blocks |

## Liquid Syntax

### Delimiters

- `{{ ... }}` — Output (prints a value)
- `{{- ... -}}` — Output with whitespace trimming
- `{% ... %}` — Logic tag (if, for, assign) — prints nothing
- `{%- ... -%}` — Logic tag with whitespace trimming

### Operators

**Comparison:** `==`, `!=`, `>`, `<`, `>=`, `<=`
**Logical:** `and`, `or`
**Membership:** `contains` (a substring of a string, or a string in an array of strings)

### Critical Gotchas

1. **No parentheses** in conditions — use nested `{% if %}` instead
2. **No ternary** — always use `{% if cond %}value{% else %}other{% endif %}`
3. **`for` loops max 50 iterations** — use `{% paginate %}` for larger arrays
4. **`contains` only works with strings** — can't check objects in arrays
5. **`{% stylesheet %}`/`{% javascript %}` don't render Liquid** — no Liquid inside them
6. **Snippets can't access outer-scope variables** — pass them as render params
7. **`include` is deprecated** — always use `{% render 'snippet_name' %}`
8. **`{% liquid %}` tag** — multi-line logic without delimiters; use `echo` for output
9. **`and` / `or` are read right to left**, with no precedence and no parentheses: `a or b and c` is `a or (b and c)`. Split a mixed condition into nested `{% if %}`

### Variables

```liquid
{% assign my_var = 'value' %}
{% capture my_var %}computed {{ value }}{% endcapture %}
{% increment counter %}
{% decrement counter %}
```

## Filter Quick Reference

Filters are chained with `|`. Output type of one filter feeds input of next.

**Array:** `compact`, `concat`, `find`, `find_index`, `first`, `has`, `join`, `last`, `map`, `reject`, `reverse`, `size`, `sort`, `sort_natural`, `sum`, `uniq`, `where`
**String:** `append`, `capitalize`, `downcase`, `escape`, `handleize`, `lstrip`, `newline_to_br`, `prepend`, `remove`, `replace`, `rstrip`, `slice`, `split`, `strip`, `strip_html`, `truncate`, `truncatewords`, `upcase`, `url_decode`, `url_encode`
**Math:** `abs`, `at_least`, `at_most`, `ceil`, `divided_by`, `floor`, `minus`, `modulo`, `plus`, `round`, `times`
**Money:** `money`, `money_with_currency`, `money_without_currency`, `money_without_trailing_zeros`
**Color:** `color_brightness`, `color_darken`, `color_lighten`, `color_mix`, `color_modify`, `color_saturate`, `color_desaturate`, `color_to_hex`, `color_to_hsl`, `color_to_rgb`
**Media:** `image_url` (needs `width` or `height`), `image_tag`, `video_tag`, `external_video_tag`, `media_tag`, `model_viewer_tag`. Never the old `img_url` and its family: deprecated
**URL:** `asset_url`, `asset_img_url`, `file_url`, `shopify_asset_url`
**HTML:** `link_to`, `script_tag`, `stylesheet_tag`, `time_tag`, `placeholder_svg_tag`
**Localization:** `t` (translate), `format_address`. (`currency_selector` is deprecated: use a localization form)
**Other:** `date`, `default`, `json`, `structured_data`, `font_face`, `font_url`, `payment_button`

> Full details: [language filters](references/filters-language.md), [HTML/media filters](references/filters-html-media.md), [commerce filters](references/filters-commerce.md)

## Tags Quick Reference

| Category | Tags |
|----------|------|
| **Theme** | `content_for`, `layout`, `section`, `sections`, `schema`, `stylesheet`, `javascript`, `style` |
| **Control** | `if`, `elsif`, `else`, `unless`, `case`, `when` |
| **Iteration** | `for`, `break`, `continue`, `cycle`, `tablerow`, `paginate` |
| **Variable** | `assign`, `capture`, `increment`, `decrement`, `echo` |
| **HTML** | `form`, `render`, `raw`, `comment`, `liquid` |
| **Documentation** | `doc` |

> Full details with syntax and parameters: [references/tags.md](references/tags.md)

## Objects Quick Reference

### Global objects (available everywhere)

`cart`, `collections`, `customer`, `localization`, `pages`, `request`, `routes`, `settings`, `shop`, `template`, `theme`, `linklists`, `images`, `blogs`, `articles`, `all_products`, `metaobjects`, `canonical_url`, `content_for_header`, `content_for_layout`, `page_title`, `page_description`, `handle`, `current_page`

### Page-specific objects

| Template | Objects |
|----------|---------|
| `/product` | `product`, `remote_product` |
| `/collection` | `collection`, `current_tags` |
| `/cart` | `cart` |
| `/article` | `article`, `blog` |
| `/blog` | `blog`, `current_tags` |
| `/page` | `page` |
| `/search` | `search` |
| `/customers/*` | `customer`, `order` |

> Full reference: [commerce objects](references/objects-commerce.md), [content objects](references/objects-content.md), [tier 2](references/objects-tier2.md), [tier 3](references/objects-tier3.md)

## Schema Tag

Sections and blocks require `{% schema %}` with a valid JSON object. Sections use `section.settings.*`, blocks use `block.settings.*`.

### Section schema structure

```json
{
  "name": "t:sections.hero.name",
  "tag": "section",
  "class": "hero-section",
  "limit": 1,
  "settings": [],
  "max_blocks": 16,
  "blocks": [{ "type": "@theme" }],
  "presets": [{ "name": "t:sections.hero.name" }],
  "enabled_on": { "templates": ["index"] },
  "disabled_on": { "templates": ["password"] }
}
```

### Block schema structure

```json
{
  "name": "t:blocks.slide.name",
  "tag": "div",
  "class": "slide",
  "settings": [],
  "blocks": [{ "type": "@theme" }],
  "presets": [{ "name": "t:blocks.slide.name" }]
}
```

### Setting type decision table

| Need | Setting Type | Key Fields |
|------|-------------|------------|
| On/off toggle | `checkbox` | `default: true/false` |
| Short text | `text` | `placeholder` |
| Long text | `textarea` | `placeholder` |
| Rich text (with `<p>`) | `richtext` | — |
| Inline rich text (no `<p>`) | `inline_richtext` | — |
| Number input | `number` | `placeholder` |
| Slider | `range` | `min`, `max`, `default` (all required), `step`, `unit` |
| Dropdown/segmented | `select` | `options: [{value, label}]` |
| Radio buttons | `radio` | `options: [{value, label}]` |
| Text alignment | `text_alignment` | `default: "left"/"center"/"right"` |
| Color picker | `color` | `default: "#000000"` |
| Image upload | `image_picker` | — |
| Video upload | `video` | — |
| External video URL | `video_url` | `accept: ["youtube", "vimeo"]` |
| Product picker | `product` | — |
| Collection picker | `collection` | — |
| Page picker | `page` | — |
| Blog picker | `blog` | — |
| Article picker | `article` | — |
| URL entry | `url` | — |
| Menu picker | `link_list` | — |
| Font picker | `font_picker` | `default` (required) |
| Editor header | `header` | `content` (no `id` needed) |
| Editor description | `paragraph` | `content` (no `id` needed) |

### `visible_if` pattern

```json
{
  "visible_if": "{{ block.settings.layout == 'vertical' }}",
  "type": "select",
  "id": "alignment",
  "label": "t:labels.alignment",
  "options": [...]
}
```

Conditionally shows/hides a setting in the editor based on other setting values.

### Block entry types

- `{ "type": "@theme" }` — Accept any theme block
- `{ "type": "@app" }` — Accept app blocks
- `{ "type": "slide" }` — Accept only the `slide` block type

> Full schema details and all 33 setting types: [references/schema-and-settings.md](references/schema-and-settings.md)

## CSS & JavaScript

### Per-component styles and scripts

Use `{% stylesheet %}` and `{% javascript %}` in sections, blocks, and snippets:

```liquid
{% stylesheet %}
  .my-component { display: flex; }
{% endstylesheet %}

{% javascript %}
  console.log('loaded');
{% endjavascript %}
```

- **One tag each per file** — multiple `{% stylesheet %}` tags will error
- **No Liquid inside** — these tags don't process Liquid; use CSS variables or classes instead
- Only supported in `sections/`, `blocks/`, and `snippets/`

### `{% style %}` tag (Liquid-aware CSS)

For dynamic CSS that needs Liquid (e.g., color settings that live-update in editor):

```liquid
{% style %}
  .section-{{ section.id }} {
    background: {{ section.settings.bg_color }};
  }
{% endstyle %}
```

### CSS patterns for settings

**Single CSS property** — use CSS variables:
```liquid
<div style="--gap: {{ block.settings.gap }}px">
```

**Multiple CSS properties** — use CSS classes as select values:
```liquid
<div class="{{ block.settings.layout }}">
```

## LiquidDoc (`{% doc %}`)

**Required for:** snippets (always), blocks (when statically rendered via `{% content_for 'block' %}`)

```liquid
{% doc %}
  Brief description of what this file renders.

  @param {type} name - Description of required parameter
  @param {type} [name] - Description of optional parameter (brackets = optional)

  @example
  {% render 'snippet-name', name: value %}
{% enddoc %}
```

**Param types:** `string`, `number`, `boolean`, `image`, `object`, `array`

## Translations

### Every string fixed in the theme's code must use the `t` filter

This is for words written into the code (a button label, an error, "Add to cart"). Copy a merchant is meant to edit (a landing page's headline, reasons, FAQ) is not put in locale files: it lives in section and block settings, with its starting text in the setting's `default` or preloaded in the template JSON.

```liquid
<!-- Correct -->
<h2>{{ 'sections.hero.heading' | t }}</h2>
<button>{{ 'products.add_to_cart' | t }}</button>

<!-- Wrong — never hardcode strings -->
<h2>Welcome to our store</h2>
```

### Variable interpolation

```liquid
{{ 'products.price_range' | t: min: product.price_min | money, max: product.price_max | money }}
```

Locale file:
```json
{
  "products": {
    "price_range": "From {{ min }} to {{ max }}"
  }
}
```

### Locale file structure

```
locales/
├── en.default.json          # English translations (required)
├── en.default.schema.json   # Editor setting translations (required)
├── fr.json                  # French translations
└── fr.schema.json           # French editor translations
```

### Key naming conventions

- Use **snake_case** and **hierarchical keys** (max 3 levels)
- Use **sentence case** for all text (capitalize first word only)
- Schema labels use `t:` prefix: `"label": "t:labels.heading"`
- Group by component: `sections.hero.heading`, `blocks.slide.title`

## A landing page as a theme page

How a page made in the app, or as 1 HTML file by a page skill (`five-reasons-lp-pro` has a worked bundle in `reference/shopify/`), becomes something a store installs.

**The shape:** 1 section file (`sections/<brand>-<page>.liquid`), 1 alternate page template (`templates/page.<suffix>.json`) that preloads it, and the images. The merchant creates a Page and picks the template.

- **Copy is settings, not code.** Section settings for the one-off parts (headline, sub-headline, button label, the risk line), blocks for the repeated parts (a reason, a review, an FAQ item, a row of "what is in the box"). The template JSON carries the real copy in `settings`, `blocks` and `block_order`, so the page renders complete on install.
- **A `page` template has no `product` object.** Add a `product` picker setting and read `section.settings.product`. Render the price from the store (`product.price | money`; the compare-at only when `product.compare_at_price > product.price`), never from typed text: a typed price goes stale and the page then states a price the store does not charge.
- **Buying from the page:** `{% form 'product', product %}` with a hidden `id` input holding the variant id adds to cart; or every button goes to 1 URL setting (the product page or a cart link).
  - A product bought once: a variant picker from `product.options_with_values` (size, colour), with the size guide 1 tap away.
  - A product bought again on subscription: the selling plans from `product.selling_plan_groups`, sent as the form's `selling_plan` input. If the store's subscription app supplies an app block, use it (`{ "type": "@app" }`) and do not rebuild it.
- **Facts come from the store where the store holds them:** policies from `shop.refund_policy`, `shop.shipping_policy` and their siblings; dimensions, materials and care from product metafields. A fact the store does not hold is a setting with no default, so nothing invented ships.
- **Reviews** come from the store's reviews app (its app block), or from blocks holding real reviews word for word. No rating, count or badge setting is given a default.
- **An advertorial page** shows an "Advertisement" label in the section itself, not as an optional setting.
- **Images:** an `image_picker` per slot, rendered with `image_url: width:` and `image_tag` (with `widths` and `sizes`). The first image gets `loading: 'eager', fetchpriority: 'high'`; the rest are lazy. Give every image an `alt`.
- **Scope the CSS** to the section (`#shopify-section-{{ section.id }}` or a class prefix) so nothing leaks into the theme. Colours that come from settings go in `{% style %}`, since `{% stylesheet %}` cannot read Liquid.
- **Limits:** a JSON template renders up to 25 sections, and a section up to 50 blocks. A long page is 1 section with blocks, or a few sections, not 30.
- **Checkout is not part of the theme.** It cannot be changed with Liquid; what can be changed there depends on the store's plan.
- **Phone first.** Build and check the section at a phone width before desktop.

## What this reads from the brand brain

| What | Where (contract names) | When it is blank |
|---|---|---|
| Colours and fonts | `brand-look.json`; `brand-guidelines.md` Visual identity | Inherit the theme's own colours and fonts |
| The page's copy and section order | The page as built in the app or by a page skill | Nothing to export |
| The product | `products-and-positioning.md` Product catalog: URL | Ask for the product on the store; a picker setting with no default |
| Photos | `assets/` | `image_picker` settings left empty |

Not in the contract, and an export needs them: the **store's product handle** for each product, the **page handle and template suffix**, the **theme in use** (and whether it supports theme blocks), which **apps supply reviews and subscriptions**, and the page facts the store may already hold as policies and metafields (**Returns**, **Shipping and delivery**, **Size and fit**, **Care**, **What is in the box**).

## References

- Filters: [language](references/filters-language.md) (77), [HTML/media](references/filters-html-media.md) (45), [commerce](references/filters-commerce.md) (30)
- [Tag reference (30 tags)](references/tags.md)
- Objects: [commerce](references/objects-commerce.md) (5), [content](references/objects-content.md) (10), [tier 2](references/objects-tier2.md) (69), [tier 3](references/objects-tier3.md) (53)
- [Schema & settings reference (33 types)](references/schema-and-settings.md)
- [Complete examples (snippet, block, section)](references/examples.md)
