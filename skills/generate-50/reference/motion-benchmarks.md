# Motion Creative Benchmarks 2026: reference for generate-50

**Source:** Motion Creative Benchmarks 2026 Report
**Dataset:** 578,750 creatives · 6,015 advertisers · $1.29B realized spend
**Window:** Sep 1, 2025 to Jan 1, 2026 (BFCM + holiday cycle)
**How this file is used:** sent whole to the sprint planner. The app has already set the format of every slot from the split at the bottom, so the format tables explain the mix; they are not for the planner to change it. The Hook & Headline section is the planner's to use: it drives which hooks the slots open on.
**What it does not cover:** the figures are for all advertisers and 6 verticals. A brand in another category (food and drink, cookware, luggage, electronics) reads the overall table. Most formats here are video formats; each is made in the sprint as a still that does the same job. A format that leans on a body, a face or a real person's result (before and after, transformation, influencer, celebrity, a testimonial with a face) is made only as the app's rules allow: objects not bodies, a quote with no face, a real person only from that person's own upload.
**Dataset caveat:** all metrics use Meta spend as the success signal. BFCM context means Offer-first banner and urgency hooks are overweighted in this dataset. Apply the vertical-specific tables for evergreen campaigns and de-weight Offer-first banner unless a live promo exists.

---

## Format Performance Table

Ranked by winner volume. Hit rate = winners ÷ (winners + mid-range).

| Visual format | Winners | Hit rate (%) | Notes |
|---|---|---|---|
| Offer-first banner | 11,006 | 8.68 | BFCM-boosted: weight lower for evergreen |
| Demo | 5,563 | 8.11 | Strong evergreen scale format |
| Testimonial | 5,073 | 6.57 | High volume + solid hit rate |
| Headline | 4,570 | 6.26 | Text-forward, fast to produce |
| Montage | 3,704 | 7.02 | Strong scale format |
| Before & after | 1,724 | 6.07 | Works with transformation angles |
| Listicle | 1,641 | 5.30 | Good for multi-benefit products |
| Split screen | 1,491 | 5.62 | Us vs them, comparison angles |
| Us vs them | 1,365 | 6.52 | Strong when competitor gaps exist |
| Unboxing | 1,229 | 9.83 | Highest hit rate, underused |
| Feature benefit point | 1,142 | 5.61 | USP-driven static |
| Cinematic b-roll | 900 | 6.85 | Lifestyle/brand play |
| Grid swap | 882 | 7.98 | Product variety / collection |
| Problem agitation | 818 | 5.98 | Pain-point-first hook |
| Review | 804 | 4.89 | Social proof |
| How to | 793 | 6.62 | Education-first |
| POV | 792 | 8.28 | High hit rate, underused |
| Behind the scenes | 772 | 8.64 | High hit rate, underused |
| Founder | 692 | 8.57 | High hit rate, underused, strong evergreen |
| Statistic | 645 | 5.81 | Data-backed claim |
| Influencer endorsement | 635 | 7.71 | Authority/credibility |
| Collage | 626 | 6.50 | Multi-asset variety |
| Expert explainer | 581 | 5.96 | Credibility + education |

**Evergreen priorities (de-weight Offer-first banner):** Unboxing (9.83%), Behind the scenes (8.64%), Founder (8.57%), POV (8.28%), Demo (8.11%): these have the highest hit rates and are underused.

---

## Vertical-Specific Formats

Match the brand's vertical (`Category` in `brand-brain/brand-guidelines.md`) to the closest category below; with no close match, use the overall table above. Hit rate leaders = formats most likely to produce a winner; spend use leaders = formats that absorb the most spend once they win.

### Health & Wellness
- **Hit rate leaders:** Unboxing, Founder, Influencer endorsement, POV, Transformation, Stitch, Reaction video
- **Spend use leaders:** Offer-first banner, Founder, Behind the scenes, UGC overlay, Transformation, Case study

### Fashion & Apparel
- **Hit rate leaders:** Stylized product shot, Product shot, Product showcase, Post-it, Meme
- **Spend use leaders:** Demo, Offer-first banner, Podcast, Billboard, Slideshow, Celebrity

### Home & Garden / Lifestyle
- **Hit rate leaders:** Demo, Before & after, How to, Unboxing, Montage
- **Spend use leaders:** Demo, Testimonial, Before & after, Offer-first banner

### Baby & Family
- **Hit rate leaders:** Testimonial, Demo, Founder, Before & after, POV
- **Spend use leaders:** Testimonial, Demo, Offer-first banner, Influencer endorsement

### Pet
- **Hit rate leaders:** Demo, Unboxing, Behind the scenes, Founder, POV
- **Spend use leaders:** Demo, Testimonial, Before & after, Founder

### Beauty & Skincare
- **Hit rate leaders:** Before & after, Testimonial, Demo, Founder, Influencer endorsement
- **Spend use leaders:** Before & after, Testimonial, Demo, Offer-first banner

---

## Hook & Headline Performance

### Highest hit rate hooks (6 to 11%)
Confession · Urgency · Curiosity · FOMO · Bold claim · Shocking statement · Warning · If-then · Contrarian · Price anchor · Exclusivity · Direct address · Authority · Wordplay · Relatability · Contrast

### Highest spend use ratio hooks
Confession · Urgency · Curiosity · FOMO · Price anchor · Offer only · Announcement · Contrarian · Myth busting · Wordplay · Contrast · Warning · If-then · Bold claim · Storytelling · Reasons why

### Best overlap (high hit rate AND high spend use): start here
**Confession · Urgency · Curiosity · FOMO · Price anchor**

These hooks both generate winners AND capture disproportionate spend when they win. Prioritize them in the angle map before diversifying.

---

## Asset Type Performance

### Hit rate leaders
Text only · Product image with text · Lifestyle-product image · UGC · High production · GIF

### Spend use ratio leaders
Text only · Product image with text · Illustration · UGC · Lifestyle-product image with text

**Key insight:** text-forward assets (text-only, product image with text) outperform expectations. Fast and clear beats polished and vague. Build 30 to 40% of the 50-ad mix around text-forward compositions.

---

## The 50-Ad Planning Framework

How a brand's first 50 ads are assembled. Step 4 is done by the app before the planner is called; steps 2, 3 and 5 are the planner's, and they shape the angles and the hooks, not the formats:

1. **Identify the vertical** from `brand-brain/brand-guidelines.md`, then pull that vertical's hit rate leaders from the tables above.
2. **Read `brand-brain/winning-ads.md`** and bias toward the angles and hooks the brand has already proven work; add variety around that core.
3. **Check competitor gaps** from `brand-brain/competitors.md`. An angle or a kind of ad competitors avoid (no founder content, nobody showing the product in use) is whitespace to occupy.
4. **Apply the 50-ad split:**
   - ~40% to scale formats (Demo, Testimonial, Montage, Offer-first if a promo exists)
   - ~30% to high-hit-rate underused formats (Unboxing, Founder, POV, Behind the scenes)
   - ~20% to angle-specific formats driven by avatar pain points (Before & after, Us vs them, Problem agitation)
   - ~10% to experimental (Collage, Grid swap, Statistic, Expert explainer)
5. **Assign hooks from the overlap list first** (Confession, Urgency, Curiosity, FOMO, Price anchor), then diversify.
