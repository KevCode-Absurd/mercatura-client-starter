---
name: brand-brain
description: Use when a user wants to build a brand knowledge base, brand folder, or brand brain for their business. Triggered by "brand brain", "build my brand brain", "create brand files", "set up my brand", or similar. Scrapes the website and generates a complete structured folder that gives any AI instant context about the brand.
user-invocable: true
argument-hint: "[optional: website URL]"
---

# Brand Brain: Build the Brand's AI Knowledge Base

Use from any assistant/harness with the context and tools this task needs. Follow [Harness portability](../../README.md#harness-portability): discover tool capabilities, carry explicit brand evidence, and deliver source with accurate execution status when file/browser tools are unavailable. Names such as `Meta.ads_get_ad_accounts` and `Klaviyo.get_account_details` below identify logical operations. Discover the corresponding connected tools and map their actual schemas; names and integration availability differ by host.

You are building a complete brand knowledge folder that gives any AI (Claude, ChatGPT, Gemini, or any future tool) full context about a brand from this workflow, whether invoked naturally or through a host-supported `/brand-brain` command.

The output is a structured folder of markdown files. Every file has a specific job. Together they become the brand's permanent memory: a foundation for landing pages, ads, emails, product descriptions, or any creative work going forward.

---

## Critical Rules (apply to the entire run)

1. **No em dashes, ever.** Nothing you output may contain an em dash (—): not user-facing messages, not generated brand files, not file contents of any kind. Use commas, periods, colons, or hyphens instead. This is a hard content rule. Before delivering the final summary, verify no generated file contains an em dash.
2. **Generate all 9 files.** README.md, brand-guidelines.md, products-and-positioning.md, customer-avatars.md, competitors.md, brain.md, recent-changes.md, winning-ads.md, session-instructions.md. Never skip any. Host-specific instruction wrappers are optional and point to these canonical records.
3. **Two hard gates.** Gate 1: user confirms the scraped basics (Phase 3.1). Gate 2: user responds to the asset invite (Phase 4.2). Do not write the brand files until both gates have a user response.
4. **MCP detection is silent.** Never tell the user you are running detection calls (Phase 3.2). Just note the result and adapt.
5. **MCPs before manual asks.** For every data follow-up, pull from a connected MCP first. Only fall back to manual input if the MCP is not available or the user declines. Every follow-up accepts "skip" or "later" as a valid answer; move on immediately.
6. **Auto-pull product images without asking first** (Phase 4.1). Report what you grabbed afterward.
7. **Never leave the user stuck.** If scraping fails entirely, ask them to paste their about page text plus a product list with prices, and generate the files from that.
8. **Ground the personas, then diagnose (Phase 6).** After writing the files, run the grounding review: every avatar must cite 2-3 verbatim customer quotes or be labeled "Inferred, not yet grounded in reviews." Never fabricate a quote to pass this check. Then write a 1-2 sentence brand diagnosis to `brain.md`. Do not deliver the summary until this pass has run.
9. **Look before you describe (Phase 4.3).** What a product looks like, what its pack looks like and which photo shows what are written by opening the photos and looking, never from the product's title or a file name. Every picture and clip made later is held to these lines. A model told about a product in words invents one: in a test of 2 clips made from words alone, both got the product's colour wrong.
10. **A blank is a question, never a guess.** Where the site, the photos and the user do not say, leave the field blank or write "Not captured: {what would answer it}". The brain check lists blanks; a later skill that needs one asks for it. This holds for every field, and most of all for prices, claims, review figures, quotes, ingredients, materials, dimensions and policy terms.
11. **Any brand, any category.** Nothing in this skill assumes what is sold. A consumable (eaten, drunk, applied, used up and bought again) and a durable (worn, used, kept and bought once) need different facts: a pack size and how long it lasts for the first; sizes, materials, dimensions, care and what is in the box for the second. Record the product's kind (Phase 2) and fill the fields that fit it.

## Pipeline Overview

| Phase | What happens | Gate |
|-------|-------------|------|
| 1 | Get the website URL | |
| 2 | Scrape the website | |
| 3 | Confirm findings, detect MCPs, run 7 data follow-ups | Gate 1 at 3.1 |
| 4 | Auto-pull product images, invite extra assets, then look at the photos and write what a camera needs (4.3) | Gate 2 at 4.2 |
| 5 | Write all 9 files | |
| 6 | Grounding review + brand diagnosis | Grounding gate at 6.1 |
| 7 | Deliver the summary | |

The Living System rules at the end apply to every future session where the brand brain is loaded, not just this build.

In the Creative Studio app the same documents are built and edited on the Brand screen, and `pnpm brain:check <brand>` runs the review of Phase 6 by rule and lists, format by format, what is still blank. This skill is the same work done by hand, and it is where the shape of the documents is set: a field added here is added to the app's template (`src/lib/brain/docs.ts`) and to the founder questionnaire.

---

## Phase 1: Get the Website URL

If the user already passed a URL as an argument, skip the question and proceed. Otherwise ask exactly one question:

> "What's the URL for your brand's website? (e.g., https://yourbrand.com)"

Once you have the URL, **scrape immediately. Do not ask any more questions yet.** Extract everything you can before coming back with follow-ups.

---

## Phase 2: Scrape the Website

Fetch these pages using an available web-reading tool. Work through them in order; skip any that return 404 or block access.

| Priority | Page | Paths to try |
|----------|------|-------------|
| 1 | Homepage | `{url}` |
| 2 | About page | `/about`, `/pages/about`, `/pages/about-us`, `/pages/our-story`, `/our-story` |
| 3 | Shop/Collections | `/collections`, `/collections/all`, `/shop`, `/products` |
| 4 | Product pages | Grab 5-10 product URLs from the collections page, fetch each one |
| 5 | FAQ | `/faq`, `/pages/faq`, `/pages/frequently-asked-questions` |
| 6 | Reviews/Testimonials | `/reviews`, `/pages/reviews`, `/pages/testimonials` |
| 7 | Shipping, returns, guarantee | `/policies/shipping-policy`, `/policies/refund-policy`, `/pages/shipping`, `/pages/returns`, `/pages/guarantee`, the footer links |
| 8 | How it works, ingredients or materials, size guide | `/pages/how-it-works`, `/pages/ingredients`, `/pages/science`, `/pages/materials`, `/pages/size-guide`, `/pages/care` (whichever the category has) |
| 9 | Subscription terms, if it sells on subscription | `/pages/subscription`, the product page's subscribe box, the FAQ |

### Extract from the scrape

- **Brand name**: from the page title, logo alt text, or header
- **Slug**: lowercase brand name, spaces to hyphens (e.g., "My Brand" becomes `my-brand`)
- **Category**: infer from products (Home, Baby, Pet, Apparel, Beauty, Wellness, Food, Sports, Tech, Accessories)
- **Brand color**: primary hex from CSS custom properties, logo colors, or dominant header/button color
- **Description**: one punchy sentence synthesized from homepage hero plus about page
- **Products**: names, prices, key features, URLs
- **Brand voice**: scan all copy for tone patterns (playful? clinical? premium? friendly?)
- **USPs**: what does the brand claim makes them different?
- **Customer language**: phrases from reviews that reveal real pain points and desires
- **Product kind**: how the product is used and bought, in 2 parts. How it is used: eaten or drunk, applied to the body, worn, used with the hands, or placed in a room. How it is bought: once, again when it runs out, or on subscription. Later skills pick their shots, their offer and their objections from this.
- **How it works**: the mechanism in the brand's own plain words (what is in it or how it is built, and what that does), with the page it came from. If the site gives none, leave it blank.
- **The old way**: what the buyer used before, or what the category does that the brand is against (a powder to mix, a pan that sticks, a bra that digs in). This is the brand's enemy; most ads are built against it.
- **Proof**: every number, study, award, press mention, review count and rating the site states, each with the exact wording and the page it is on. A figure that is stated 2 ways on 2 pages is recorded both ways and flagged.
- **Policies**: shipping (cost, free-over threshold, how long), returns (window, who pays), the guarantee (its exact terms and what it does not cover), subscription terms (can it be paused or cancelled, how).
- **Facts by kind**: for a consumable, what is in it with amounts, the serving, how long a pack lasts. For a durable, materials, sizes or dimensions, weight, care, what is in the box, the warranty.

**If scraping fails entirely** (bot protection or all pages blocked): tell the user and ask them to paste their about page text plus a product list with prices. Generate the files from that content. Never leave the user stuck (Critical Rule 7).

---

## Phase 3: Confirm and Pull Data

### 3.1 GATE 1: Confirm what you found

Present this and wait for the user's response before continuing:

> "Here's what I pulled from your site:
> - **Brand name**: {detected_name}
> - **Category**: {detected_category}
> - **Primary color**: {detected_hex}
> - **Description**: {detected_description}
> - **Products found**: {count} products cataloged
>
> Does that look right? Fix anything or just say 'good' to continue."

### 3.2 Silent MCP Detection

Before asking any follow-up questions, **silently** attempt the tool calls below. Do not tell the user you are running these checks. Just note the result and adapt the follow-up questions accordingly.

| Integration | Detection call | What it unlocks |
|------------|---------------|----------------|
| **Meta Ads** | `Meta.ads_get_ad_accounts` | Campaign performance, winning creatives, spend data |
| **Klaviyo** | `Klaviyo.get_account_details` | Email campaigns, flows, open/click rates |
| **Shopify AI Toolkit** | Discover connected Shopify tools by capability and inspect their actual schemas | Best sellers, order history, revenue data, customer reviews |

If a tool returns usable data, mark it **CONNECTED**. If it errors, requires auth, or is not in your tool list, mark it **NOT CONNECTED**.

### 3.3 Deep context follow-ups

Work through follow-ups 1 through 7 in order. For every item: **pull from MCPs first if connected**; fall back to manual input only if the MCP is unavailable or the user declines. Each is optional: accept "skip" or "later" and move on immediately.

---

#### Follow-up 1: Ads performance data

**If Meta MCP is CONNECTED:**

First, call `Meta.ads_get_ad_accounts` to list available ad accounts. If there is more than one, ask:

> "I can see you have the following Meta ad accounts connected:
> - {account name} ({account id})
> - {account name} ({account id})
>
> Which one should I pull data from?"

Once the account is confirmed (or if there is only one), call `Meta.ads_insights_performance_trend` for that account and present a summary:

> "Here's what I found in your Meta account:
> - **Active campaigns**: {count}
> - **Top performer**: {campaign name} at {cost per result}
> - **Spend trend**: {pattern, e.g. increasing, stable, declining}
> - **Top-converting ad**: {ad name or creative description if visible}
>
> Does that look like an accurate picture? Anything to add or correct?"

Extract and note in `brain.md`:
- Top-performing campaigns and ad names go under "What We Know Works"
- Worst performers go under "What to Avoid"
- Cost per result by ad

**If Meta MCP is NOT CONNECTED:**

> "Are you running ads on Meta (Facebook/Instagram)? I can pull your ad data automatically if you connect your Meta account, no CSV needed.
>
> **Option 1 - Connect Meta MCP (recommended):**
> Use your host’s available integration setup to connect Meta and authorize your ad account. Once access is available, I can read the account data.
>
> **Option 2 - Upload a CSV:**
> Export from Meta Ads Manager (Columns > Performance > Export) and paste or upload it here.
>
> Which would you prefer? (Or skip to come back to this later.)"

What to extract from a CSV if provided:
- Top-performing ad names/copy: what messaging the market responds to
- Worst performers: angles or products that don't convert
- Cost per result by ad: which products have the best margin for acquisition
- Audience data if visible: age/gender breakdown, placements
- Note findings in `brain.md` under "What We Know Works" and "What to Avoid"

---

#### Follow-up 2: Winning ads

**If Meta MCP is CONNECTED:**

Call `Meta.ads_get_ad_entities` for the confirmed ad account to identify top-performing ads by lowest cost per result. Present:

> "Based on your Meta data, your top performers look like:
> - **{Ad name}**: {format/hook description if visible}, {cost per result}
> - **{Ad name}**: {description}
>
> Are any of these the ads you're most proud of? Anything I'm missing, like winning formats or hooks that aren't captured here?"

**If Meta MCP is NOT CONNECTED:**

> "Do you have any ads that are currently performing well, even 1 or 2 you're proud of? Describe what they showed, what the hook or headline was, and what format they were (image, video, UGC, talking head). (Or skip. If you connect Meta above, I can pull your top performers automatically.)"

What to extract if provided (either path):
- Format (static image, video, UGC, etc.): which formats this audience responds to
- Hook or headline that performed: anchors for generate-50 angle mapping
- Visual style (product-only, lifestyle, founder-face, etc.): informs asset direction
- Why it worked, if the user knows: reveals a non-obvious desire or objection being resolved

Write findings to `winning-ads.md` (see File 8 below).

---

#### Follow-up 3: Top sellers and revenue data

**If Shopify AI Toolkit is CONNECTED:**

Pull top products by revenue. Present:

> "I pulled your Shopify data. Your top sellers are:
> - **{Product}**: {revenue or order count}
> - **{Product}**: {data}
> - **{Product}**: {data}
>
> Look right? Any products underperforming despite good traffic?"

**If Shopify AI Toolkit is NOT CONNECTED:**

> "I can connect directly to your Shopify store to pull your best sellers, order history, and revenue data automatically, no CSV needed.
>
> Want me to set that up? You'll need to install the **Shopify AI Toolkit** MCP:
> - **GitHub**: https://github.com/Shopify/Shopify-AI-Toolkit
> - **Docs**: https://shopify.dev/docs/apps/build/ai-toolkit
> - **Permissions required**: `read_orders`, `read_products`, `read_analytics`, `read_customers`
>
> Once installed, just run `/brand-brain` again and I'll pull everything automatically. Or tell me your top 3 to 5 products from memory and we'll continue now. (Or skip.)"

What to extract if provided:
- Hero products by revenue: acquisition focus in `products-and-positioning.md`
- Products with high repeat purchase rate: signals for retention messaging
- Products that underperform despite traffic: positioning or price problem, note it

---

#### Follow-up 4: Customer reviews

**If Shopify AI Toolkit is CONNECTED:**

Attempt to pull review data from the toolkit. If accessible, extract using the list below, then present: "Here are the most useful signals I found in your reviews: ..." and ask if anything is missing.

**If Shopify AI Toolkit is NOT CONNECTED:**

> "Do you have customer reviews you can share? A CSV from Shopify/Okendo, a paste from your reviews page, or even a screenshot works. Reviews are the single best source for customer language. (Or skip. If you install the Shopify AI Toolkit above, I can pull these automatically next time.)"

What to extract (either path):
- Exact phrases customers use to describe the problem before buying: these become hooks
- Words they use to describe the product experience: these become copy
- Recurring complaints: flag in `brain.md` under "What to Avoid" plus a note in `products-and-positioning.md`
- What surprised them positively: often the real USP nobody's advertising yet

---

#### Follow-up 5: Email marketing data

**If Klaviyo MCP is CONNECTED:**

First, call `Klaviyo.get_account_details` to confirm the connected account. If the account name doesn't clearly match the brand being onboarded, ask:

> "I can see a Klaviyo account connected: **{account name}**. Is this the right account for {brand name}?"

Once confirmed, call `Klaviyo.get_campaigns` and `Klaviyo.get_flows`. Present:

> "Here's what I found in your Klaviyo account:
> - **Active campaigns**: {count}
> - **Top campaign by open rate**: "{subject line}" at {open rate}%
> - **Active flows**: {count}, including {names of key ones, e.g. Welcome, Abandoned Cart}
>
> Anything surprising, or anything I should know about your email strategy?"

Extract from results:
- High-performing subject lines go to `brain.md` under "What We Know Works"
- Best-converting flows: note in `brain.md`
- List size: note in `brain.md`

**If Klaviyo MCP is NOT CONNECTED:**

> "Do you use Klaviyo for email? I can pull your campaigns, flows, and open rates automatically if you connect your account, no manual exports needed.
>
> **Option 1 - Connect Klaviyo MCP (recommended):**
> Use your host’s available integration setup to connect Klaviyo and authorize your account. Once access is available, I can read the account data.
>
> **Option 2 - Tell me manually:**
> What platform do you use (Klaviyo, Mailchimp, etc.), and do you know your rough open rate and click rate? Or paste 2 or 3 subject lines that crushed it.
>
> Which would you prefer? (Or skip.)"

What to extract if provided manually:
- High-performing subject lines: what angles the list responds to
- Open rate vs. industry average: list health and subject line strength
- Best-converting email type: what the audience is most ready to buy

---

#### Follow-up 6: Competitors

Don't ask; discover first. Run a web search before presenting anything to the user.

Search queries to run (in order, stop when you have 3-5 solid results):
1. `"{brand name}" alternatives`
2. `best {category} brands` (e.g., "best baby blanket brands")
3. `"{product type}" competitors` (e.g., "weighted blanket competitors")
4. Check the brand's own site for any "compare" pages, "vs." landing pages, or competitor mentions in copy

From the results, identify 3-5 direct competitors (similar product, similar price range, similar audience). Ignore aggregators, review sites, and mass retailers like Amazon unless the brand specifically competes there.

Then present what you found:

> "I found a few brands that look like direct competitors:
> - **{Competitor 1}**: {one line: what they sell and their positioning}
> - **{Competitor 2}**: {one line}
> - **{Competitor 3}**: {one line}
>
> Look right? Any others you want to add, or any of these I should remove?"

After confirmation, fetch each competitor URL and analyze:
- Their homepage headline and positioning angle
- Price range
- What they do well (design, copy, offers, social proof)
- What they miss or do poorly: this is the gap to own

Write the full analysis to `competitors.md`.

---

#### Follow-up 7: Free-form context

> "Anything else about your brand, customers, or business that I should know going in? This is your chance to tell me things the website doesn't say: who your real buyer is, what's changed recently, what you're trying to figure out. (Or skip.)"

If the user is willing, 4 short questions get what no website states. Ask them 1 at a time and accept "skip":

1. "What do your customers hate about this category, or about what they used before you?" (the old way, for `brand-guidelines.md`)
2. "Who is not your customer? Who buys once and returns it, or complains?" (goes to `brain.md`, What to Avoid)
3. "Which promotions have worked best, and are any codes live now?" (`products-and-positioning.md` and `recent-changes.md`)
4. "Roughly what share of sales is your best seller?" (`products-and-positioning.md`, Best Sellers)

---

**After all follow-ups:** note any skipped items and any MCPs that weren't connected in `brain.md` under "Open Questions" so future sessions know what's still missing and which integrations would unlock more data automatically.

---

## Phase 4: Product Images and Assets

Create the folder and required subfolders first:

```bash
mkdir -p brand-brain/assets
```

### 4.1 Auto-pull all product images from the site (do this automatically, do NOT ask first)

Immediately pull every product image from the brand's store and organize it by product. This gives the user a ready-to-use image library and feeds the ad-generation skills (`/generate-50`, `/recreate-winning-ads`). Save images into BOTH locations:
- `Products/<Product Name>/` in the working directory (a standalone, browsable library), and
- `brand-brain/assets/<Product Name>/` (the canonical location the generation skills read from).

**Primary method: Shopify product JSON (works for the vast majority of DTC brands).**
Most Shopify stores expose a public catalog at `{url}/products.json` that returns full-resolution image URLs with no scraping guesswork.

```bash
# 1. Pull the catalog (up to 250 products; paginate with ?page=2 if there are more)
curl -s "{url}/products.json?limit=250" -o products_raw.json
jq '.products | length' products_raw.json   # sanity check it returned products
```

Then run this Python to build the folders and a download list. It strips emojis from folder names and skips non-product line items (shipping protection, returns, warranties, gift-card / GWP placeholders):

```python
import json, os, re, urllib.parse
data = json.load(open('products_raw.json', encoding='utf-8'))

SKIP_SUBSTRINGS = ['shipping protection', 'free returns', 'warranty', 'gift card', 'route ', 're:do']

def clean(title):
    t = re.sub(r'[\U0001F000-\U0001FAFF☀-➿]', '', title)  # strip emojis/symbols
    return re.sub(r'\s+', ' ', t.replace('/', '-').strip())

jobs = []
for p in data['products']:
    if any(s in p['title'].lower() for s in SKIP_SUBSTRINGS):
        continue
    name = clean(p['title'])
    for dest_root in ('Products', 'brand-brain/assets'):
        folder = os.path.join(dest_root, name)
        os.makedirs(folder, exist_ok=True)
        for img in p.get('images', []):
            pos = img.get('position', 0)
            fname = f"{pos:02d}_{os.path.basename(urllib.parse.urlparse(img['src']).path)}"
            jobs.append((img['src'], os.path.join(folder, fname)))

with open('.img_jobs.tsv', 'w', encoding='utf-8') as f:
    for url, dest in jobs:
        f.write(f"{url}\t{dest}\n")
print(f"{len(jobs)} image downloads queued")
```

```bash
# 2. Download everything
ok=0; fail=0
while IFS=$'\t' read -r url dest; do
  if curl -s -f -o "$dest" "$url"; then ok=$((ok+1)); else echo "FAILED: $url"; fail=$((fail+1)); fi
done < .img_jobs.tsv
echo "Downloaded OK: $ok | Failed: $fail"

# 3. Verify no empty files, then remove temp artifacts
find Products -type f -size 0 -print     # should print nothing
rm -f products_raw.json .img_jobs.tsv
```

**Fallback (non-Shopify sites, or if `products.json` returns 404 / empty):**
- Re-use the product page URLs you already scraped in Phase 2. For each, pull the `og:image` meta tag and the inline gallery `<img>` srcs, then `curl` them into the same `Products/<name>/` plus `brand-brain/assets/<name>/` structure.
- If images still can't be fetched programmatically, tell the user the site blocked automated image access and ask them to drop product photos into `brand-brain/assets/` manually.

**Always:** prefix filenames with a zero-padded position (`01_`, `02_`) so they keep the store's display order, confirm there are no zero-byte files, and delete the temp `products_raw.json` / `.img_jobs.tsv` when done.

### 4.2 GATE 2: Invite the user to add anything extra

After the auto-pull finishes, report what you grabbed and invite additions:

> "I pulled **{N} product images across {M} products** straight from your store and organized them into `Products/` and `brand-brain/assets/` (one subfolder per product).
>
> Want to add anything the website doesn't have? Drop lifestyle shots, UGC-style clips, founder photos, or existing ad creative into `brand-brain/assets/` now. The more the better. Say 'done' or 'skip' when you're ready to continue."

If the auto-pull found nothing (rare: non-Shopify with blocked images), fall back to the manual ask: drop any product photos, lifestyle shots, or existing ad imagery into `brand-brain/assets/`.

**Wait for the user to respond before proceeding to Phase 5.**

### 4.3 Look at the photos, and write what a camera needs

The photos are now in the folder and nobody has looked at them. Do it now, for the hero product and every best seller first, then the rest of the products ads will be made for. Open each photo in the product's folder (view the image itself; a file name tells you nothing).

**Sort every photo by the job it can do.** A photo does a job only if it is a plain photograph: no words set over it, no collage, no arrows or badges.

| Job | What the photo shows | What it is used for later |
|---|---|---|
| `pack front` | The product as it is sold, straight on, on its own | The identity of the pack: shape, colours, every printed word |
| `out of pack` | The product itself, out of its packaging, on its own | The shape, colour and finish of the thing itself |
| `in hand` | The product in or beside a hand | Its true size |
| `in use` | The product being opened, applied, worn, poured or used | How it is held and what the action looks like |
| `close up` | A near view of its surface | Texture and finish |

A product that has no packaging worth showing (a pan, a jacket) uses `pack front` for the product itself, front on, and may have no `out of pack`. A designed image (an infographic, a review card, a lifestyle picture with a headline on it) does none of these jobs: leave it out of this list, it stays in the folder for other uses.

**Then write the product's record for the camera** into its entry in `products-and-positioning.md` (the fields are in File 3). Write only what you can see in the photos or read on the site:

- **Looks like**: the product itself, out of its pack. Shape, the colour of the thing itself (not of the background it was photographed on), finish (matt, glossy, see-through, brushed), and its size against a hand. Add what it must never be mistaken for.
- **Pack**: what it is sold in. The kind of pack, its material and colours, and every word or mark printed large, with where each sits. Name the versions that look different (a sugar-free burst, a second colourway).
- **How it is used**: the steps in order, as actions a hand does: where it opens, what comes out, where it goes. Take them from the site's how-to, the photos and the user. If you cannot tell how it opens, ask.
- **Visible result**: what a viewer can see change when it is used (a stain lifts, a pan releases an egg, a crease drops out), or "Nothing a camera can show", with what can be shown instead (the action itself).
- **Moves and sounds**: 2 to 4 real motions the product makes (a pour, a peel, a click, a zip, a fold, a spread) and the sound of each. Mark a sound you have not heard as reasoned, not recorded.
- **Never show**: the mistakes particular to this product (opened at the wrong place, the wrong colour, the wrong count, a use the brand does not support).
- **Reference photos**: 1 file per job, as `pack front: 01_name.jpg; out of pack: 04_name.jpg; in hand: 07_name.jpg`. Only files that are in the folder.

**Report the gaps and ask for them.** A job with no plain photo is the most useful thing to tell the user at this point:

> "I looked through the photos for {product}. I have a clean shot of {jobs found}. I could not find a plain photo of {jobs missing, e.g. the product out of its pack, or in a hand}. Those 2 photos decide whether generated pictures and clips get the product right. If you have them, drop them into `brand-brain/assets/{Product Name}/` and tell me which is which. A phone photo on a plain surface is enough."

Record what is still missing in `brain.md` under Open Questions. Never fill a missing job with a designed image, and never describe a product you have not seen.

**Last, the brand's world.** From the lifestyle photos and the site, note for `brand-guidelines.md` (File 2): the places the product is shown in, the surfaces and props around it, the light and time of day, who appears, and what never appears. If the brand runs video (its site, its social links, its ads), watch 2 or 3 and note the pace, the camera, the sound and the words on screen. If you could not watch any, write "Not captured".

---

## Phase 5: Write the Files

Pre-write checklist. Confirm all four before writing anything:
1. Gate 1 answered (brand basics confirmed or corrected)
2. All 7 follow-ups asked (answered or explicitly skipped)
3. Image auto-pull attempted and reported
4. Gate 2 answered ('done' or 'skip')

Write all 9 files below into `brand-brain/`. Generate them all; do not skip any. No em dashes anywhere in the generated content (Critical Rule 1).

---

### FILE 1: README.md

This file is the entry point. Any AI reading this folder should start here.

```markdown
# {Brand Name} Brand Brain

> Last updated: {todays_date}
> Built with /brand-brain

This folder is your brand's permanent knowledge base. Load any or all of these files into an AI conversation to give it full context about your brand.

## Files in This Folder

| File | What It Contains | When to Load It |
|------|-----------------|-----------------|
| `brand-guidelines.md` | Brand story, voice, tone, colors, fonts, USPs, guardrails | Always (this is the foundation) |
| `products-and-positioning.md` | Every product with pricing, features, and positioning angles | When writing product copy, landing pages, or ads |
| `customer-avatars.md` | 2-3 detailed buyer personas with pain points and psychology | When writing anything customer-facing |
| `competitors.md` | Competitor breakdown and differentiation opportunities | When writing positioning copy or strategy |
| `brain.md` | Accumulated learnings: what works, what doesn't, open questions | Always (this is what makes the AI smarter over time) |
| `recent-changes.md` | Log of launches, pivots, promos, and product updates | When anything has changed since the last session |
| `winning-ads.md` | Formats and angles that have worked; used by /generate-50 to bias toward proven approaches | When generating ads |
| `assets/` | Product images auto-pulled from your store (one subfolder per product), plus any lifestyle / UGC / ad imagery you add | When generating ads with /generate-50 |
| `session-instructions.md` | Context index and session update protocol shared across harnesses | Supply with the brand records; optional host wrappers may point here |

## How to Use This Folder

**Paste into any AI chat:**
> "Here are my brand files. Use these as context for everything in this conversation."
> Then attach or paste the relevant files.

**Or in a file-capable harness:**
> Ask it to read the actual brand records and `session-instructions.md`; use the host’s supported file references.

**Always load `recent-changes.md` first.** It tells the AI what has changed since the original setup, so it doesn't give you advice based on outdated information.

**Session updates depend on access.** With writable access and authorization, save new learnings to `brain.md`, `recent-changes.md` and the relevant records. Otherwise return the proposed updates for the user to save. Loading context alone does not prove persistence.

**Keep it fresh:**
- After every major decision, add a line to `brain.md` (or let your AI do it)
- After every launch or change, add an entry to `recent-changes.md`
- Re-run `/brand-brain` every 6 to 12 months to refresh the scraped data
```

---

### FILE 2: brand-guidelines.md (target: 150-250 lines)

```markdown
# Brand Guidelines: {Brand Name}

> Last updated: {todays_date}

---

## Brand Overview

- **Brand Story**: {from the about page: how it started, why it exists}
- **Mission**: {what the brand is trying to do for its customers}
- **Elevator Pitch**: {one paragraph: what they sell, who it's for, why it matters}
- **Brand Promise**: {the core implicit promise to every customer}
- **Category**: {category}
- **Website**: {url}
- **Said aloud**: {how the brand's name is pronounced, if a stranger could get it wrong. Ask; do not guess}
- **The old way**: {what the buyer used before, or what the category does that this brand is against, in the brand's own words where it has said so. This is the brand's enemy}

---

## Brand Voice & Tone

- **Personality**: {3-5 adjectives that describe how the brand speaks}
- **Writes like**: {one analogy, e.g. "a knowledgeable friend", "a confident expert", "a warm coach"}
- **Humour**: {does the brand joke, about what, and where it stops. "None" is an answer}

### Voice Do's
- {specific, based on actual copy patterns found on the site}
- {specific}
- {specific}
- {specific}

### Voice Don'ts
- {specific, the opposite of their actual tone}
- {specific}
- {specific}
- {specific}

### Tone by Context
| Context | Tone |
|---------|------|
| Website headlines | {tone} |
| Product descriptions | {tone} |
| Email subject lines | {tone} |
| Customer support | {tone} |
| Social media | {tone} |

---

## Visual Identity

### Color Palette
| Color | Hex | Role |
|-------|-----|------|
| {name} | {hex} | Primary: {where/how it's used} |
| {name} | {hex} | Secondary: {where/how it's used} |
| {name} | {hex} | Background: {where/how it's used} |
| {name} | {hex} | Text: {where/how it's used} |

### Typography
- **Headings**: {font name}, {weight}, {personality: authoritative / friendly / editorial}
- **Body**: {font name}, {weight}
- **Accent/Labels**: {font if different, or "same as body"}

### Photography & Imagery Style
- {describe what their product photos look like: clean white? lifestyle? textured backgrounds?}
- {describe people if present: diverse? aspirational? everyday?}
- {describe mood: bright and airy? moody and rich? minimal?}

### Imagery Do's and Don'ts
- **Do**: {what fits the brand aesthetic}
- **Don't**: {what breaks the aesthetic}

### Brand World
{From Phase 4.3. Where the brand's pictures happen. Every generated picture and clip is set here.}
- **Places**: {3 to 5 real places the product is used or shown: a room, a time of day, what is around}
- **Surfaces and props**: {what the product sits on and beside. Name backdrops and colours as the brand uses them}
- **Light and time of day**: {bright morning daylight, warm evening lamp, hard studio flash}
- **People**: {who appears: ages, how they dress, what they are doing. Say what may be generated: a fictional adult, never a child}
- **People on file**: {real people who may appear (a founder, a customer, an expert), each with a photo in `assets/` and their say. "Nobody" if none}
- **Never in frame**: {the old way, except as the "before"; anything the brand would not be seen with; another brand's pack}

### Motion and Sound
{From watching the brand's own video. Write "Not captured" for what you could not watch.}
- **Pace**: {quick cuts or 1 long take; how long a shot is held}
- **Camera**: {hand-held phone, locked-off, macro}
- **Sound**: {the product's own sounds, a voice, music or none}
- **Voice**: {language, accent, age and pace of the voice on camera or the narrator. A cloned or borrowed voice is never used}
- **On-screen text**: {how captions and labels look: typeface, size, where they sit}
- **Formats in use**: {the ratios and lengths the brand runs, and any format it refuses}

---

## Unique Selling Propositions

Ranked by importance. These are the core reasons customers choose this brand over alternatives:

1. {USP, specific and concrete, not vague}
2. {USP}
3. {USP}
4. {USP}
5. {USP if applicable}

---

## Proof on File

{Every number, study, award, press line, certification, rating and review count the brand may use. The exact words as the brand states them, never rounded or reworded. A figure stated 2 ways in 2 places is entered once with both and flagged.}

| Proof | Exact words | Source and date | May be shown as |
|-------|-------------|-----------------|-----------------|
| {what it is} | "{word for word}" | {the page or document, and the date read} | {a number with its source named, a badge in words, a quote with a name. Note what needs someone's say: a retailer's logo, a reviewer's name} |

---

## Target Audience Summary

{2-3 sentence summary of who buys this brand and why. Full personas are in customer-avatars.md.}

---

## Brand Guardrails

- **Never say**: {things that would feel off-brand or damage trust}
- **Never show**: {imagery or visual contexts that break the brand}
- **Always**: {non-negotiable behaviors such as tone, promise, quality signal}
- **Never use em dashes** in any copy written for this brand. Use commas, periods, or hyphens.

---

## Key Phrases & Taglines

{Taglines and repeated phrases found on the site. These are the brand's own vocabulary.}

- "{phrase}"
- "{phrase}"
- "{tagline if found}"
```

---

### FILE 3: products-and-positioning.md (target: 150-300 lines)

```markdown
# Products & Positioning: {Brand Name}

> Last updated: {todays_date}

---

## Pricing Summary

| Metric | Value |
|--------|-------|
| Price range | {lowest} to {highest} |
| Positioning tier | {budget / mid / premium / luxury} |
| Entry product | {cheapest or most accessible product} |
| Hero product | {best seller or most featured product} |
| Estimated AOV | {estimate based on typical cart} |

---

## Product Catalog

{For each product found during scraping, write one section:}

### {Product Name}
- **Price**: {price}
- **URL**: {product URL}
- **What it is**: {one sentence description}
- **Key features**: {bullet list from product page}
- **Who buys it**: {which avatar this most appeals to}
- **Core benefit**: {the #1 reason someone buys this product}
- **Positioning angle**: {the angle that makes this product easy to sell, e.g. "the X for people who Y"}
- **Kind**: {how it is used (eaten or drunk, applied, worn, used with the hands, placed in a room) and how it is bought (once, again when it runs out, on subscription), with how long 1 lasts}
- **How it works**: {the reason it works in 1 or 2 lines, in the brand's plain words, with the page it is stated on. Blank if the site gives none: never invent a mechanism}
- **Replaces**: {what the buyer used before, as objects (a tub and a shaker, 3 pans, a drawer of bras), and the differences the brand states as fact}
- **Made of**: {a consumable: what is in it, with amounts, and what it is free from. A durable: materials and how it is built}
- **Size and fit**: {a consumable: the serving and the pack size. A durable: dimensions, weight, sizes, how it fits}
- **In the box**: {exactly what arrives}
- **Lasts and care**: {how long 1 lasts or is expected to last; how it is stored, washed or looked after}
- **Looks like**: {Phase 4.3. The product itself, out of its pack: shape, its own colour, finish, size against a hand}
- **Pack**: {Phase 4.3. What it is sold in, and every word or mark printed large, with where each sits}
- **How it is used**: {Phase 4.3. The steps in order, as actions a hand does}
- **Visible result**: {Phase 4.3. What a viewer can see change, or "Nothing a camera can show" and what can be shown instead}
- **Moves and sounds**: {Phase 4.3. 2 to 4 real motions and the sound of each}
- **Never show**: {Phase 4.3. The mistakes particular to this product}
- **Reference photos**: {Phase 4.3. `pack front: file; out of pack: file; in hand: file; in use: file; close up: file`. Also, where the kind calls for it: `label`, `on body`, `in place`, `laid out`, `before after`. Only plain photos that are in the folder}

{Fill the fields that fit the product's kind and leave the others out. A blank field that does fit stays in, blank.}

---

## Best Sellers

{Identify from homepage featured items, "best seller" badges, or notes from user}

1. {Product}: {why it's the hero}
2. {Product}
3. {Product}

---

## Bundles & Offers

{Any existing bundles, sets, or volume offers found on site, or "None found during onboarding."}

---

## Seasonal / Limited Products

{Any time-sensitive or limited collections, or "No seasonal collections identified."}

---

## Delivery, Returns and Guarantee

{The terms a buyer asks about before paying, in the brand's own words. A page, an offer ad and a product page image state these. "Not captured" for what the site does not say; never a typical figure.}

- **Delivery**: {cost, the free-over threshold, how long it takes, where it ships}
- **Returns**: {the window, the condition, who pays}
- **Guarantee**: {its exact terms, and what it does not cover}
- **Warranty**: {for a durable: how long and what for. "Does not apply" for something used up}
- **Subscription**: {can it be paused, skipped or cancelled, and how}

---

## Questions Buyers Ask

{From the site's FAQ and from reviews. 5 to 10, each with the brand's own answer. A question the brand has not answered is listed in brain.md under Open Questions, not answered here.}

- {Question?} {The answer, from the site.}
```

---

### FILE 4: customer-avatars.md (target: ~200 lines)

```markdown
# Customer Avatars: {Brand Name}

> Last updated: {todays_date}

---
```

Generate 2-3 distinct buyer personas. Base them on:
- The products and who they solve problems for
- Customer language extracted from reviews
- The brand's price point and category
- Any audience notes the user provided

**Grounding requirement (Week 3 method).** Rank personas by BOTH volume (their approximate share of the customer base) AND emotional intensity; the highest-intensity persona is often the strongest creative bet even if it is smaller. Every persona must carry 2-3 verbatim customer quotes that justify it. If no review data was available, still generate the personas as hypotheses but label each one as inferred (the template shows how). Never invent a quote.

For each avatar, use this structure:

```markdown
## Avatar {N}: "{Descriptive Name}"
*{Role description, e.g. "The Gifter", "The Practical Buyer", "The Enthusiast"}*
*Represents approximately {X}% of the customer base | Emotional intensity: {low / medium / high}*

### Grounded In (customer evidence)
{2-3 verbatim customer quotes that justify this persona, each with its source. This is the proof the avatar is real, not invented from site copy.}
- "{verbatim review quote}" ({source, e.g. site review, Amazon, competitor review})
- "{verbatim review quote}" ({source})

{If no review data was available, delete the quotes above and use exactly this line instead:}
> Inferred from site copy and product context. Not yet grounded in customer reviews. Validate by pulling reviews (see brain.md Open Questions).

### Who They Are
- **Age**: {range}
- **Gender**: {breakdown if relevant}
- **Location**: {geographic description}
- **Income**: {household income range}
- **Family status**: {description}
- **Occupation**: {types}

### The Moment
{The scene an ad is set in. Take it from the quotes above; mark a line "Inferred" when no customer said it.}
- **Trigger**: {what happens just before they go looking: the bill, the mirror, the argument at dinner}
- **Where and when**: {the place and time of day the problem shows, and where the product gets used}
- **Tried before**: {what they used and gave up, as they name it}
- **Believes**: {the 1 belief in the way of buying, in their words}
- **On camera**: {what this person would be doing if filmed: the room, what is in their hands, what is within reach}

### What They Care About
- **Values**: {what matters to them in life}
- **Lifestyle**: {how they spend time, what they follow online}
- **Aspirations**: {what they want to become or achieve}
- **Identity**: {how they see themselves}

### Why They Buy This Product
- **Primary pain point**: {the specific problem this product solves for them}
- **Secondary pain point**: {another reason}
- **Emotional driver**: {the feeling they're chasing, e.g. safety, pride, belonging}

### What Almost Stops Them
| Objection | What overcomes it |
|-----------|------------------|
| "{objection}" | {rebuttal} |
| "{objection}" | {rebuttal} |
| "{objection}" | {rebuttal} |

### How to Talk to This Person
- **Tone**: {what tone resonates}
- **Hooks that work**: {the angles and framings they respond to}
- **Hooks to avoid**: {what feels wrong or off-putting to this person}
```

---

### FILE 5: competitors.md

Competitors are discovered automatically during setup (Phase 3.3, Follow-up 6) and confirmed with the user before analysis runs. The file is always populated, not a placeholder.

```markdown
# Competitors: {Brand Name}

> Last updated: {todays_date}

## Competitive Landscape

| Competitor | URL | Positioning | Price Range | What They Do Well | Gap We Can Own |
|-----------|-----|-------------|-------------|-------------------|----------------|
| {name} | {url} | {their angle in 5-10 words} | {range} | {their actual strength} | {what they miss, be specific} |

---

## Differentiation Summary

What makes {Brand Name} the distinct choice in this space:

1. {differentiator, concrete, not generic}
2. {differentiator}
3. {differentiator}

---

## Gaps Worth Owning

These are the angles no competitor is clearly winning on, the whitespace in the market:

- {gap}: {brief explanation of the opportunity}
- {gap}: {brief explanation}

---

## Competitor Ads & Messaging (optional, populate over time)

_When you research competitor ads (via Meta Ad Library, TikTok Creative Center, etc.), log findings here._

| Competitor | Angle They're Pushing | Hook Type | Weakness in Their Approach |
|-----------|----------------------|-----------|---------------------------|
```

---

### FILE 6: brain.md

```markdown
# {Brand Name} Brain

> This is a living document. Update it after every meaningful decision, learning, or insight.
> Last updated: {todays_date}

---

## About This Brand

{2-3 sentence synthesis from the scrape: the most important things to know going in}

---

## Brand Diagnosis

> The 1-2 sentence anchor for all creative strategy (written during the grounding review, Phase 6.3). Re-diagnose roughly every quarter as new learnings come in.

{Filled during Phase 6. The single most useful line in this whole folder: where the brand is, who it should be talking to, and the biggest creative opportunity.}

- **Market awareness level**: {Unaware / Problem Aware / Solution Aware / Product Aware / Most Aware}
- **Highest-intensity persona**: {name} ({share}%, {intensity})
- **Biggest opportunity**: {the gap between who the ads target and who actually buys, in one line}

---

## Key Decisions

_Log important decisions here so you never have to re-explain them._

| Date | Decision | Why |
|------|----------|-----|
| {todays_date} | Brand brain created from /brand-brain skill | Initial setup |

---

## What We Know Works

_Copy angles, products, channels, tactics that have proven themselves._

- {Anything from reviews or site copy that signals strong product-market fit}

---

## Open Questions

_Things worth figuring out. Answer them here when you do._

{If the user skipped any follow-up questions, list those as open items:}
- {e.g., "Competitor analysis not yet done, add URLs to competitors.md when ready"}
- {e.g., "Customer reviews not analyzed, paste reviews to get deeper avatar insights"}

---

## Ideas to Explore

_Future angles, product ideas, positioning tests worth considering._

---

## What to Avoid

_Things that don't fit the brand, lessons learned the hard way._

---

## Product Notes

_Anything the AI should know about specific products: limitations, common questions, seasonal behavior._
```

---

### FILE 7: recent-changes.md

```markdown
# Recent Changes: {Brand Name}

> Log launches, pivots, promos, and anything that changes the brand context.
> Any AI reading this folder should read this file first to know what's new.
> Last updated: {todays_date}

---

## How to Use This File

Add an entry any time:
- A new product launches
- A promotion or sale goes live
- The brand changes its messaging or positioning
- A product is discontinued or out of stock
- Something important happens that affects how you market the brand

## Change Log

| Date | Type | Description |
|------|------|-------------|
| {todays_date} | Setup | Brand brain created, baseline scraped from {url} |

```

---

### FILE 8: winning-ads.md

```markdown
# Winning Ads: {Brand Name}

> Last updated: {todays_date}
> Populated from user-provided examples during onboarding. Update after any strong performer.

---

{If user provided winning ad examples, document each one:}

## Ad {N}

- **Format**: {static image / video / UGC / talking head / etc.}
- **Product**: {which product}
- **Buyer**: {which avatar it speaks to, and how aware they are of the product}
- **Hook / Headline**: "{exact hook, headline or opening line}"
- **First frame**: {a video: what is on screen in the first second}
- **Visual**: {what was shown: product only, lifestyle, founder, etc. Name the visual device and the layout}
- **Offer shown**: {the offer in the ad, or "none"}
- **Result**: {the number, and whether it is measured (from the ad account), reported (the user said so) or not known. An ad that is only still running is "not known", not a winner}
- **File**: {the ad's image or clip in `assets/winning-ads/`, if the user gave it}
- **Why it worked**: {user's explanation, or "not specified"}
- **Takeaway**: {what this tells us about what angles or formats resonate}
- **Do not carry over**: {what in it must not be copied into a new ad: a dated offer, a licensed character, a claim since withdrawn}

---

{If user skipped:}

_No winning ads provided during onboarding. Add examples here as you identify strong performers._
```

---

### FILE 9: session-instructions.md

This canonical file gives any assistant the context index, integration status and session update protocol. Supply it explicitly with the brand records. Where a host supports project instruction files, an optional wrapper can point here; do not assume it auto-loads or create conflicting copies of the policy.

**Before writing this file, resolve the following substitutions from what you learned during Phases 2 and 3:**

| Placeholder | Where to get it |
|------------|----------------|
| `{Brand Name}` | Detected in Phase 2 from the website scrape |
| `{url}` | The URL the user provided in Phase 1 |
| `{todays_date}` | Today's date |
| `{2-3 sentence brand summary}` | Synthesize from the homepage plus about page scrape |
| Meta row: `connected / not connected` | Result of the Phase 3.2 Meta MCP detection |
| Meta row: `{account name}` | The ad account the user confirmed in Follow-up 1; leave blank if not connected |
| Klaviyo row: `connected / not connected` | Result of the Phase 3.2 Klaviyo MCP detection |
| Klaviyo row: `{account name}` | The account confirmed in Follow-up 5; leave blank if not connected |
| Shopify row: `connected / not connected` | Result of the Phase 3.2 Shopify AI Toolkit detection |

Remove any integration row where the user explicitly declined to connect during onboarding. Don't leave "not connected" rows that clutter the file for tools the user isn't using. Only keep rows for integrations that are connected, or that the user said they plan to connect.

```markdown
# {Brand Name}: Session Instructions

> Brand brain built with /brand-brain on {todays_date}
> Website: {url}

---

## What This Brand Does

{2-3 sentence summary: what they sell, who they sell to, and what makes them different. Pulled from brand-guidelines.md during setup.}

---

## Files in This Folder: Read These First

| File | What's in It | Priority |
|------|-------------|----------|
| `recent-changes.md` | Latest launches, promos, out-of-stock products | **Read first every session** (prevents stale advice) |
| `brain.md` | Accumulated learnings, what works, what to avoid, open questions | **Always load** |
| `brand-guidelines.md` | Voice, tone, colors, fonts, USPs, guardrails | Always load |
| `products-and-positioning.md` | Full product catalog with pricing, features, and positioning angles | Load for any product or copy work |
| `customer-avatars.md` | 2-3 buyer personas with pain points, objections, and hooks | Load when writing customer-facing content |
| `competitors.md` | Competitor analysis and differentiation gaps | Load for strategy or positioning work |
| `winning-ads.md` | Proven ad formats, hooks, and angles | Load when generating ads |
| `assets/` | Product images auto-pulled from the store (one subfolder per product), plus any added lifestyle / UGC / ad imagery | Reference when generating ads |

**Rule:** Always read `recent-changes.md` and `brain.md` before giving any advice. These two files contain everything that has changed or been learned since setup.

---

## Connected Integrations

{Populate this section during onboarding based on what the user connected. Remove any row marked "not connected."}

| Integration | Status | What It Unlocks |
|------------|--------|----------------|
| Meta Ads | {connected / not connected} | Ad performance, winning creatives, spend data; ad account: {account name} |
| Klaviyo | {connected / not connected} | Email campaigns, flows, open/click rates; account: {account name} |
| Shopify AI Toolkit | {connected / not connected} | Best sellers, order history, revenue data, customer reviews |

When a connected integration can answer a question the user is asking, **pull from it directly** rather than asking the user to export data manually.

---

## Session Rules

These apply in every session where this folder is loaded.

### Before you start
1. Read `recent-changes.md`: know what has changed since the last session
2. Read `brain.md`: know what's been tried, what worked, what didn't

### During the session
- If the user mentions a new product, promo, or out-of-stock item: write it to `recent-changes.md` immediately
- If the user shares a competitor or pricing context: update `competitors.md` immediately
- If a decision is made about positioning, messaging, or strategy: write it to `brain.md` under Key Decisions immediately

### At session end
Scan the conversation for anything new learned. Without asking for permission, write it to the appropriate file and tell the user:

> "Updated your brand brain with what we covered today:
> - [what was added] -> [which file]"

**Routing:**
| What you learned | Where it goes |
|-----------------|--------------|
| A hook or angle worked well | `brain.md` -> What We Know Works |
| A product is the clear top seller | `products-and-positioning.md` -> Best Sellers |
| A customer objection came up | `customer-avatars.md` -> Objections table |
| An angle or format fell flat | `brain.md` -> What to Avoid |
| The user taught you something about their customer | `customer-avatars.md` + `brain.md` |
| A product launched or is coming soon | `products-and-positioning.md` + `recent-changes.md` |

---

## Guardrails

- **Never invent offers or discounts.** Only reference promotions that exist in `recent-changes.md` or confirmed by the user in this session
- **Never assume product availability.** Always check `recent-changes.md` for out-of-stock or discontinued items before recommending them
- **Follow the brand voice** in `brand-guidelines.md` for all copy, especially the Voice Don'ts
- **Don't repeat winning ad angles** from `winning-ads.md` without testing something new alongside them
- **Never use em dashes** in any copy written for this brand. Use commas, periods, or hyphens
```

---

## The Living System: Auto-Update Rules

The brand brain is not a one-time snapshot. It should get smarter every time the user works with an AI. These rules apply in **any session where the brand brain files are loaded**, not just during initial setup. The generated `session-instructions.md` encodes a compact version of these rules for future sessions in any harness; this section is the full protocol.

**Any AI using these files must follow this protocol:**

### When to update files mid-session or at session close

| What you learn | Where it goes | When to write it |
|----------------|--------------|-----------------|
| A product turns out to be the top seller or hero product | `products-and-positioning.md` -> Best Sellers, plus `brain.md` | Immediately when confirmed |
| A specific hook or angle generated strong engagement / clicks | `brain.md` -> What We Know Works | At session close |
| A customer objection keeps coming up | `customer-avatars.md` -> Objections table | At session close |
| A messaging angle fell flat | `brain.md` -> What to Avoid | At session close |
| A new product launched or is coming soon | `products-and-positioning.md` + `recent-changes.md` | Immediately when mentioned |
| A promotion or sale is running | `recent-changes.md` | Immediately when mentioned |
| A product is out of stock / discontinued | `products-and-positioning.md` + `recent-changes.md` | Immediately when mentioned |
| The user teaches you about their real customer | `customer-avatars.md` + `brain.md` | At session close |
| A competitor is mentioned with context | `competitors.md` | Immediately when mentioned |
| A pricing change or new bundle | `products-and-positioning.md` | Immediately when mentioned |
| A decision is made about positioning, voice, or strategy | `brain.md` -> Key Decisions | Immediately |
| The user says "we learned that..." or "turns out..." | `brain.md` | Immediately |

### The update rule

**At the end of any session where the brand brain was loaded:** scan the conversation for anything in the table above. If you find it, write it to the appropriate file before closing. Don't ask for permission; just do it and tell the user what was added:

> "I've updated your brand brain with what we learned today:
> - Added [X] to brain.md under What We Know Works
> - Updated [product] as your hero product in products-and-positioning.md
> - Logged [promo] to recent-changes.md"

### recent-changes.md is the freshness signal

Any AI loading the brand brain folder should **read `recent-changes.md` first** to understand what has changed since the baseline was created. This file is what prevents an AI from giving outdated advice ("just run your hero product X" when X has been out of stock for a month).

**Always prepend new entries** (newest at the top) so the most recent changes are visible without scrolling.

### brain.md is the intelligence layer

brain.md starts seeded during setup but grows with every session. The pattern:
- **Key Decisions**: strategic choices that should not be re-litigated
- **What We Know Works**: proven angles, products, and approaches
- **What to Avoid**: things that have been tested and failed, or are off-brand
- **Open Questions**: things worth figuring out that nobody has answered yet
- **Ideas to Explore**: future angles worth testing

When brain.md gets long, don't trim it. It's a log, and future AIs benefit from the full history.

---

## Phase 6: Grounding Review and Diagnosis

Before the summary, run a review pass on the files you just wrote. This is the quality gate that separates a grounded brand brain from AI guesswork. It applies the Week 3 method (Dara Denney, Motion Creative Strategy Bootcamp): personas must be justified by real customer language, not invented from site copy, and the whole brand must resolve to a single diagnosis.

### 6.1 GATE: Persona grounding check

For each avatar in `customer-avatars.md`, verify:

1. **Evidence exists.** Every avatar must carry 2-3 verbatim customer quotes in its "Grounded In" block. Read each quote back and confirm it actually supports that persona's stated pain point and emotional driver. A quote that doesn't fit the persona is not evidence; move it or cut it.
2. **If no quote backs an avatar**, you built it from site copy. That is allowed as a hypothesis, but label it honestly: keep the "Inferred from site copy..." line in its Grounded In block, and add a line to `brain.md` under Open Questions: "Avatar '{name}' is inferred from site copy, not customer reviews. Validate by pulling reviews."
3. **Ranking is present.** Confirm each avatar header shows an approximate share AND an emotional-intensity read (low / medium / high). Identify the highest-intensity persona; it is often the strongest creative bet even if smaller.

**Never fabricate a quote to pass this check.** A missing quote is a label, not a reason to invent one.

### 6.2 Internal consistency check

Skim the written files for contradictions and fix any you find:
- The hero product is the same in `brand-guidelines.md`, `products-and-positioning.md`, and `brain.md`
- Every USP in `brand-guidelines.md` traces to something in the scrape or reviews, not asserted from nowhere
- No invented prices, claims, offers, or discounts: every price traces to the scrape or MCP data
- Voice Do's / Don'ts reflect how the brand actually writes, with at least one real phrase from the site behind them

### 6.2b The camera check

For the hero product and each best seller, confirm in `products-and-positioning.md`:
- `Looks like`, `Pack` and `How it is used` are written, and were written from the photos (Phase 4.3), not from the title
- `Reference photos` names at least 2 jobs, and every file named is in the product's folder
- `Kind`, `How it works` and `Replaces` are written, or are listed in `brain.md` under Open Questions with what would answer them

And in `brand-guidelines.md`: Brand World has at least its places, its people and what is never in frame; Proof on File has a source on every row; Delivery, Returns and Guarantee quotes the site.

Anything missing goes into `brain.md` under Open Questions as 1 line each, naming the field and who can answer it. The founder questionnaire (`skills/founder-interview/questionnaire.md`) has a question for every one of these fields: tell the user it is the fastest way to close them.

### 6.3 Write the diagnosis

Synthesize a 1-2 sentence brand diagnosis using Dara's 5-step logic: research done -> personas analyzed both ways (who the ads target vs. who actually buys) -> market awareness and sophistication level -> creative diversity level -> the diagnosis. The diagnosis usually names the gap between who the ads target and who actually buys, because that gap is the opportunity.

Write it into the **Brand Diagnosis** section at the top of `brain.md`, filling the market awareness level, highest-intensity persona, and biggest opportunity fields.

### 6.4 Report the review

Tell the user what the review found, plainly:

> "Ran a grounding review on your brand brain:
> - {N} avatars: {M} grounded in real customer quotes, {K} labeled inferred (no review data yet)
> - Diagnosis: {the 1-2 sentence diagnosis}
> - {consistency fixes made, or 'no contradictions found'}
> - On camera: {N} products described from their photos; missing photos: {list, or 'none'}; still blank: {fields}"

---

## Phase 7: Deliver the Summary

After the grounding review (Phase 6) has run, verify no generated file contains an em dash (Critical Rule 1), then deliver a clean summary:

> **Brand brain built for {Brand Name}**
>
> Your brand knowledge folder is ready at `brand-brain/`. Here's what was created:
>
> | File | Status |
> |------|--------|
> | README.md | ✓ Index + usage guide |
> | brand-guidelines.md | ✓ Voice, colors, fonts, USPs |
> | products-and-positioning.md | ✓ {X} products cataloged |
> | customer-avatars.md | ✓ {N} buyer personas |
> | competitors.md | ✓ {N competitors analyzed, or "placeholder" only if discovery failed} |
> | brain.md | ✓ Seeded with initial learnings + brand diagnosis |
> | recent-changes.md | ✓ Change log started |
> | winning-ads.md | ✓ {filled with examples / placeholder} |
> | session-instructions.md | ✓ Context index + session update protocol supplied |
>
> **How to use these files:**
> In any AI conversation, paste or attach the files relevant to your task. For most tasks, start with `brand-guidelines.md` and `customer-avatars.md`. For anything product-specific, add `products-and-positioning.md`.
>
> **What to do next:**
> - Add the photos I could not find ({the missing jobs}): they decide whether generated pictures and clips get the product right
> - Answer the founder questionnaire for the fields still blank
> - Review each file and correct anything that feels off
> - Add competitor URLs to `competitors.md` if you have them
> - Update `brain.md` after any important decision
> - Add an entry to `recent-changes.md` whenever something in the brand shifts

---

## What the other skills read from this folder

Every skill that writes or makes something for the brand ends with the fields it reads. Together they are the reason each field above exists:

| Who reads it | What it reads |
|---|---|
| Every picture and clip (photoshoots, static ads, product page images, UGC, hooks, podcast, claymation, comic, explainer) | Per product: Looks like, Pack, How it is used, Visible result, Moves and sounds, Never show, Reference photos. Brand World. Motion and Sound. The colour palette and typography. Guardrails |
| Scripts, ad copy, native ads, briefs | Per product: Kind, How it works, Replaces. Per avatar: Grounded In, The Moment, What Almost Stops Them. Proof on File. Voice. The old way. recent-changes.md |
| Product page images and landing pages | Per product: Made of, Size and fit, In the box, Lasts and care. Delivery, Returns and Guarantee. Questions Buyers Ask. Proof on File |
| Offers | Per product: Kind. Bundles and offers. Delivery, Returns and Guarantee |
| Remakes of what has worked | winning-ads.md, with each ad's Result marked measured, reported or not known |

A field left blank is not a fault in this folder: it is the list of what to ask the brand next.

---

## Appendix: Web Users (No Local File Access)

If the current harness cannot save files locally:

1. Generate all file content in the chat, clearly labeled with their filenames
2. Tell the user: "Copy each section below and save it as the named file on your computer in a folder called `brand-brain/`"
3. Offer to export as a single combined document if easier
4. Remind them: "Once saved, you can paste these files into any future AI conversation to give it full context about your brand."
