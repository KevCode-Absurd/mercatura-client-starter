---
name: review-mining
title: Review Miner
description: How a customer's own words become an angle library: the 12 jobs a phrase can do, the intake filters, the ranking by frequency, the 9 rules that keep a quote a quote, the legal flags, and the monthly loop. Reads every customer source, not only reviews.
---

# Review mining: the angle library

Written for this app from the Review Mining playbook (`docs/ecommerce-playbook/ai/the-review-mining-c276`). The method is the playbook's; where the app's own rules differ, the app's rules win and are marked.

**The idea.** A brand pays a copywriter to invent lines its customers already wrote. A long review, a call, a support ticket is not one testimonial: it is six to twelve separate assets stapled together, each with a different job in the funnel. Read at scale, with every phrase kept exactly as typed and traced to the source it came from, those phrases are an angle inventory, not research.

**In this app.** The angle library lives on Insights, in the Angles tab. It is read out of *every* customer source the brand has connected (calls, support tickets, reviews, surveys, community posts), never out of the brand's own voice (its website, its founder). Extraction gives each quote a job; clustering groups the quotes into themes; the library reads each theme as an angle, ranked by how many separate sources say it. Simulated sources now, a real brand's later: the same place either way.

## 1. Why their words beat ours

Four mechanical reasons, not a soft argument about authenticity:

1. **Recognition beats persuasion.** Brand copy asks a stranger to believe a claim. A customer's line lets a stranger recognise themselves, and the right person stops because they have been described.
2. **Specificity cannot be faked.** The team writes "wake up naturally". A buyer writes "around day nine I woke up before the sound even started, because the room was orange". Nobody in a brand meeting produces the word orange.
3. **They name the villain the brand is too polite to name.** "My old clock was a black plastic brick with a blue LED" is a comparison ad written by someone with nothing to lose.
4. **They tell you the objection before it costs money.** "First week I thought it wasn't doing anything" is a refund about to happen. Said back to a buyer on day two, it does not.

The test for every asset: **if the line is not in a source, it does not go in the ad.** That rule is what makes this a system and not a brainstorm.

## 2. The 12 jobs

Most long sources contain four to seven of these. Very few contain all twelve. The code's list is `JOBS` in `src/lib/taxonomy.ts`; the extraction reader assigns one per quote.

| # | Job | What it sounds like | Where it earns its money |
|---|---|---|---|
| 01 | The identity | Who they were before the product arrived | Cold traffic hooks, the first welcome email |
| 02 | The trigger | The season, event or moment that made them search | Seasonal campaigns, browse abandon |
| 03 | The failed fix | What they tried first that did not work | Us-versus-them ads, comparison sections |
| 04 | The objection | The doubt they had before buying | Cart abandon, product page FAQ, negative qualifier ads |
| 05 | The slow start | The stretch where they thought it was not working | The first post-purchase email, refund prevention |
| 06 | The mechanism | How it works, by feel rather than spec | Mid-funnel education, advertorial leads |
| 07 | The first notice | The exact moment they knew | Proof ads, review-led creative, subject lines |
| 08 | The real win | The benefit they kept, rarely the one that was sold | Retargeting, winback, positioning |
| 09 | The ritual | How it fits into a normal day now | Lifestyle creative, UGC scripts, SMS |
| 10 | The complaint | Their honest gripe | Pre-empt ads, FAQ, the product roadmap |
| 11 | The villain | What it replaced and why that thing was bad | Comparison ads, strikethrough creative |
| 12 | The repeat signal | Why they bought again, or bought one for someone else | Cross-sell, gifting, subscription |

**The one most brands miss is 08, the real win.** The brand sold better sleep. He bought twenty quiet minutes before the kids wake up. Those are different products, and the second one is what he tells his friends.

The app's insight types (accommodation, failed solution, objection, proof point, and so on) say what a quote is *evidence of*. The job says what it can be *used for*. Both ride on the quote. An older quote with no job gets the job its type usually does, shown with a question mark.

## 3. Intake: what to keep, what to drop

The review import takes CSV or JSON from any review app. Keep rating, title, body, date, product, the verified flag, helpful votes and, when the export has it, whether the reviewer was given the product. Names and emails are dropped on import and never reach a model.

| Filter | Rule | Why |
|---|---|---|
| Length | Under 25 words carries no angle | Four-word reviews are star-rating noise; the reader returns nothing for them, so they cost nothing |
| Rating | Keep 5 star, 4 star, and every single 3 star | A 3 star review is a person who kept the product and was still annoyed enough to say why: the exact shape of a cold buyer's objection |
| Rating | 1 and 2 star are kept, read for complaints and objections | They are the objection library and the churn reasons, not angles |
| Recency | The last 18 months | Older reviews describe a product and a market the brand no longer has |
| Volume | 300 to 800 a pass | Under about 150 there is no repetition to count; over 1,000, split by product |
| Product | Split by product when the brand sells more than four | Angles do not transfer cleanly between products |

**Verified first.** A verified purchase is the safest source for paid. An unverified review may be read, and its phrase shown, but the library prefers a verified phrase as the best phrase and marks the unverified ones. A reviewer who was given the product or paid is never the best phrase, and any quote of theirs that reaches an ad must say so.

**Other sources carry the same jobs.** A call transcript holds the final objection and the trigger; a ticket holds the complaint and the failed fix; a survey holds the trigger and the first notice; a community post holds the villain and the failed fix from people who have not bought. The library counts them all.

## 4. The pass: mark it up, do not summarise

The reader works phrase by phrase. Every time a phrase does one of the 12 jobs it is pulled out as its own quote, wording **exactly as written**, typos, lowercase and bad grammar included. The code checks every quote against the source text before it is stored and drops anything that is not there. A quote that has been cleaned up has been rewritten into brand voice, which defeats the exercise.

Then the quotes are clustered: phrases making the same point, even in different words, become one theme. The library reads each theme as an angle:

- **Job**: the job most of its quotes do.
- **Frequency**: how many separate sources say it, and what share of the corpus that is.
- **Best phrase**: the single strongest verbatim quote, with its source id (R-012, C-003). Strongest means the most intense, a verified purchase before an unverified one, the more specific line before the shorter.
- **Backups**: the three next best, each from a different source.
- **Audience** and **product**: which persona it lands on, which product it is about.
- **Covered**: whether the brand's site already says it. In the app this is a word match against the pages last read, and it is labelled as such; a person confirms it before calling it a blind spot in public.
- **Thin**: fewer than 3 sources. Usable, but not a pattern.
- **Status**: not built, running, tested and dead.
- **Built from it**: the concepts, scripts and builder angles that cite it.

**Rank by frequency, not by taste.** The phrase you love is one person; the phrase in 12% of sources is the market. The app keeps its own score (intensity × frequency × diversity) on the Insights table beside the library, and the two are read together: frequency says what to build first, intensity says how hard it lands.

**Blind spots first.** An idea in 5% or more of the sources that appears nowhere on the site is the money. On almost every first run the most frequent idea in the corpus is something the brand has never said out loud.

**The objection list.** Every distinct doubt and gripe from the 3 star and 1 to 2 star reviews, the tickets and the calls, ranked by how often it appears, in the buyer's words. That list is the FAQ, the cart-abandon email, and the five reasons of an advertorial.

## 5. The fan-out

One library feeds every surface. The rule that holds it together: **the phrase rides along.** Whatever is built, the quote and its source id travel in the brief, in the angle's line, and in the record of what was made. An asset that cannot be traced to a source id did not come out of this system.

An unexpected use or occasion belongs with job 09 ritual or 08 real win, with product and source ID. Check official use and compatibility before proposing an ad or demonstration. A customer's experiment is not permission to recommend that use. For PDP objections, hand off the question, distinct-source count and source IDs to [the answer map](../landing-pages/objection-answer-map.md); word overlap alone cannot establish that an answer is visible or sufficient.

| Surface | Jobs it draws on |
|---|---|
| Static ads in the 7 review-led formats (negative qualifier, Q and A card, strikethrough, taped note, poll sticker, quote card, side by side) | One format per job pair; see `JOB_FORMATS` in the taxonomy and the `review-ads` skill |
| Ad copy | Headline is the quote, primary text is the story (identity, failed fix, first notice, real win), description answers the objection |
| Advertorial lead and reasons | 01 identity opens; 03 failed fix is section one; the top 5 objections by frequency are the five reasons |
| Product page bullets and FAQ | 06 mechanism and 08 real win as bullets; 04 and 10 ranked as the FAQ |
| UGC and founder hooks | 01, 02, 07 handed to the creator as the first sentence |
| Organic captions | 10 complaint and 12 repeat signal, posted openly |
| Email and SMS (a later module) | 05 slow start on day two stops the week-one refund; 09 ritual and 02 trigger fit in 160 characters |

Using an angle: the theme panel's **Use as an angle** puts it on the builder's angle list, so the home box, the script builder and the chat can choose it. The line is the phrase verbatim with its source; the basis says how many sources say it. The theme is marked running.

## 6. The nine rules

The first is the system; the other eight protect it.

1. **If the line is not in a source, it does not go in the ad.** Every headline, subject line and hook traces to a source id or it does not ship.
2. **Verbatim means verbatim.** Trimming at a word boundary is allowed. Fixing grammar, tightening, punching up and making it "more us" are not.
3. **The connective copy must be plainer than the quote.** If the writer's sentence is the most interesting one in the ad, the ad is about the writer.
4. **One angle per asset.** Two angles in one ad test nothing.
5. **Rank by frequency, not by taste.**
6. **Never let a model regenerate a quote.** Lock it in the brief, read it at full size, discard anything that came back reworded.
7. **Cite the source id everywhere.** In the brief, the angle, the asset's record.
8. **Three-star reviews, tickets and calls get mined harder than five-star reviews.** That is where the objections are.
9. **Do not run an angle twice.** The status exists so the same three ideas are not rebuilt every quarter.

## 7. Using real customer words legally

Not legal advice; the app is the first pass, not the sign-off. Anything that quotes a real customer goes past whoever signs off on the brand's claims, above all in supplements, skincare, health and finance. In the US a customer statement in paid advertising is an endorsement:

- **Do not change the meaning.** Trimming is fine; editing a review so it says something the buyer did not say is not.
- **The endorser must be real and must have used the product.** Verified purchases are the safe source. Unverified reviews stay out of paid.
- **Do not present an unusual result as typical.** One review that lost 40 pounds when the median is 6 is not an ad. Frequency ranks the available sources; it does not establish a representative sample or a typical result, even when a phrase recurs often.
- **A customer statement does not lower the substantiation bar.** "It cured my insomnia" quoted is still a claim the brand has to hold. The app's claim checks apply to quotes as to any other line.
- **Disclose material connections.** A reviewer who got the product free, was paid, was gifted or entered a sweepstake has to be disclosed when quoted. The import flags these and the library marks them.
- **Health and structure-function claims still apply.** A quoted disease claim is still a disease claim on a creative.
- **Platform rules sit on top of the law.** Before-and-after imagery and personal-attribute claims are restricted whoever said them.

The app's own rule on attribution: only what the export really holds. No invented first names, initials or cities.

Before any customer-facing copy goes out, flag every phrase that states or implies a health, medical or disease outcome, describes a result that could be read as typical when it is not, names a competitor, or makes a claim the brand brain cannot support. Put them in a **review before use** list with the reason. Never silently drop them and never silently soften them.

## 8. The monthly loop

New sources arrive every week, and each one is a chance at an angle the brand does not have. First Monday of the month, about an hour:

1. Import last month's sources only.
2. Extract and re-cluster incrementally: the new quotes are placed, existing themes keep their ids.
3. Read the library for what changed: **new** angles (first seen in the last 30 days), **fading** ones (no new source in 90 days), and anything that contradicts a persona.
4. Build only what is **not built**. Everything else has shipped.
5. Build the unbuilt angles against last month's winning format, not a new one. Change one variable.
6. Update the status and notes on everything that shipped.

## 9. What this does not do

- **It does not work under about 150 usable sources.** With 40, you are reading one person four times. Run it anyway to build the file; do not call anything a pattern until the counts mean something. The tab says so.
- **It does not replace research on people who did not buy.** Every objection that actually stopped a purchase is invisible in reviews. Community posts, cart-abandon surveys and support tickets fill that in, which is why the library reads them too.
- **It does not say why an ad wins.** It says which language is common. Frequency is a starting hypothesis, not a performance prediction.
- **It does not fix a bad offer.** Better language makes a wrong price a more efficient way to lose money.
- **It does not transfer between products.** Split the export by product.
- **It does not make the reviews true.** Section 7 is on the brand.
