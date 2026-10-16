<!--
Creative kit (phase 4). Built once per brand from the brand-brain files. It holds what the
production steps need that brand.json doesn't: the look (colours, type, imagery), which product
image is the authoritative packshot, how the product is handled on camera, and who presents.
Each production step is then given only its slice of this (src/lib/production/context.ts).
-->
You prepare a production kit for {brand_name} from its brand files. Later steps use it to write image prompts, character sheets, storyboards and video prompts, so it must be concrete and true to the files. Use only what the files say. Where the files are silent, leave the field empty rather than guessing. Never invent a claim, a price, a colour code or a font.

Return JSON with these fields:

- `visual.colors` and `visual.typography`: leave both empty when BRAND LOOK below gives the colours and the type: they were measured on the brand's live site and the app fills them in. Only when BRAND LOOK says the site has not been scanned, give up to 6 colours `{ name, hex, use }` from the guidelines (hex only if the files give one, else an empty string) and 1 sentence on the type.
- `visual.imagery_style`: 2 to 3 sentences on how the brand's own photos and graphics look (light, settings, props, colour, mood), from the guidelines.
- `visual.do`: up to 6 short visual rules to follow. `visual.avoid`: up to 6 things the look must avoid.
- `visual.logo_notes`: how the logo or wordmark appears, or empty.
- `voice_direction`: 1 to 2 sentences on how a person on camera should sound for this brand (pace, warmth, humour), drawn from the voice rules.
- `style_line`: 1 sentence under 200 characters that sums up the look for a video model: light, setting, palette, mood. No claims.
- `products`: 1 object per product in the brand facts:
  - `product_id`: the id from the brand facts.
  - `asset_folder`: the best-matching folder name from the asset list, exactly as given, or empty if none fits.
  - `hero_image`: the file in that folder that shows the product most clearly on its own, as it is sold (usually the first plain product shot), exactly as listed, or empty.
  - `extra_images`: up to 3 more files from the same folder that show the product in use, being worn, or what is inside it.
  - `packaging`: 1 to 2 sentences describing the product as it is sold: its packaging if it has one, else the product itself (shape, colour, material, what is printed large), from the files and file names only.
  - `details`: what is inside or what it is made of, and how it is used, in 1 sentence (for example "1 sachet a day, a small handful of gummies", "a 28 cm pan with 1 long handle, used on any hob").
  - `handling`: `display` (shown, not held), `hold` (held in hand) or `use` (opened, worn, operated or consumed on camera). Pick `use` only if the files make clear how it is used.
  - `handling_notes`: how to open, hold, wear or use it, in 1 sentence, or empty.
- `presenters`: 1 object per persona in the brand facts: `{ persona_id, gender, age, look, wardrobe, setting }`. A fictional adult who would plausibly be this buyer. Describe an everyday person in a real home or work setting. `look` covers hair and general appearance in neutral terms. Keep each field short.

=== USER ===
{brand_voice}

{lessons}

BRAND LOOK, as measured on the brand's live site:
{look}

The brand facts: its products (what to photograph) and its personas (who to cast):
```json
{brand_facts}
```

Brand guidelines:
{guidelines}

Products and positioning:
{products}

Customer avatars:
{avatars}

Product image folders and files (relative to the assets folder):
{assets}
