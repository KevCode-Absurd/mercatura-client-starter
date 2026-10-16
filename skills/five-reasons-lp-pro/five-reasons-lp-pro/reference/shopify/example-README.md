# Your Brand: Girls' Night "5 Reasons" Landing Page (Shopify)

Drop-in Shopify Liquid bundle for the `/pages/girls-night-5-reasons` landing page.

## What's in this folder

```
shopify-girls-night-5-reasons/
├── sections/
│   └── brand-5-reasons.liquid             <- main section (CSS + markup + schema)
├── templates/
│   └── page.brand-5-reasons-page.json     <- page template (preloaded with all copy + blocks)
├── assets/
│   ├── lp-hero-girls-night.webp
│   ├── lp-reason-01-boise.avif
│   ├── lp-reason-02-toronto.avif
│   ├── lp-reason-03.avif
│   ├── lp-reason-04.avif
│   └── lp-reason-05.avif
└── README.md
```

No theme-wide changes required. Everything is namespaced (`#shopify-section-{{ section.id }}`) so the styles will not leak into the rest of the theme.

---

## Install (3 steps)

### 1. Drop the files into the theme

From Shopify admin, go to **Online Store → Themes → … → Edit code**:

| Source file | Drop into theme folder |
|---|---|
| `sections/brand-5-reasons.liquid` | `sections/` |
| `templates/page.brand-5-reasons-page.json` | `templates/` |
| Everything in `assets/` | `assets/` |

Or via Shopify CLI:

```bash
shopify theme push \
  --only sections/brand-5-reasons.liquid \
  --only templates/page.brand-5-reasons-page.json \
  --only "assets/lp-*"
```

### 2. Create the page in Shopify admin

1. **Online Store → Pages → Add page**
2. Title: `Girls' Night Out: 5 Reasons` (the URL handle will be auto-generated; set it to `girls-night-5-reasons` to match the template name)
3. Leave the content body empty
4. In the **Theme template** dropdown on the right rail, choose `brand-5-reasons-page`
5. Save

Live at: `https://yourbrand.com/pages/girls-night-5-reasons` (or whatever handle you set).

### 3. (Optional) Customize in the theme editor

The page is fully editable via **Online Store → Customize → Pages → Girls' Night Out: 5 Reasons**:

- **Section settings**: CTA URL, H1, subhead, hero image, press eyebrow, final CTA copy, FAQ heading
- **Blocks**: Reasons (5), Studio Locations (9), FAQ items (8). All reorderable, addable, removable.

---

## CTA wiring

All "Book Your Night" / "Book Your Workshop" buttons share **one URL setting** in section settings (`Book Now URL`). Default: `https://www.yourbrand.com/booknow`. Change it in one place and every button updates.

---

## Image handling

Two ways to set images:

1. **Use the theme editor**: image picker fields on the section + each reason block (this pulls from Shopify Files → CDN, served as responsive `image_tag` with WebP)
2. **Fallback**: if no image is picked, the section loads the matching file from `/assets/` (the six images already shipped in this bundle)

If your devs want to swap images, the fastest path is the theme editor image pickers.

---

## Fonts

Google Fonts are loaded inline at the top of the section:

- **Anton** (display)
- **Playfair Display Italic** (serif headlines + testimonials)
- **Inter** (body)

If your theme already preloads these, remove the `<link>` tags at the top of the section file to avoid duplicate requests.

---

## Brand notes (do not edit copy without checking with brand)

- No em dashes anywhere. Anything that looks like one should be a period or a comma.
- Never frame the workshop as a "class" or "school."
- Cancellation policy is **$20 per person within 24 hours**, never "free reschedule."
- The "40,000+ groups" stat is a placeholder until the founder confirms the real cumulative number.

---

## Browser support

Tested in current Chrome / Safari / Firefox / Edge. The marquee animation, iPhone overlay, `aspect-ratio`, and `text-wrap: balance` are progressively enhanced. Old browsers see a slightly less polished version but no broken layout.

---

## Questions

Ping Jordan at jordanbazouzi@nu-reach.com.
