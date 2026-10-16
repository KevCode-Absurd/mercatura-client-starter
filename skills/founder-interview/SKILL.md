---
name: founder-interview
description: Run the founder interview when a new brand is onboarded - ask only what the brand's data sources cannot answer, then write the answers into the brand brain with their source marked. Use after the website, reviews, tickets, surveys, order data and ad account have been read, and before any script is written or any picture made for the brand. Not for building the brand brain from a website (brand-brain does that) or for customer research.
---

# Founder interview

A brand's data says what customers do and say. It does not say why the product is the way it is, what can be proven, what the founder will and won't put their name on, who is allowed to appear in an ad, or what the product is really like in the hand: how it opens, what comes out, what it sounds like. Only the founder has those. This skill gets them in 1 call and 1 written follow-up.

The questions are in `questionnaire.md`, written to be sent to the founder as it is. The app reads that file: 12 sections, each question on 1 line as `- **F2.10 (core)** text`. Keep that shape. A question's id is never reused for a different question, because saved answers are kept by id.

It is judged on 1 thing: after it, no writer or picture step has to guess. Every blank in the brain is either filled with a sourced answer or written down as "not answered".

## What each source already answers (don't ask the founder these)

| Source | It answers |
|---|---|
| Website and product pages | Products, prices, public claims, current offers, public voice, the pack as photographed |
| Reviews and post-purchase surveys | Why people bought, what they noticed, the words they use, where they heard of the brand |
| Support tickets | Objections, failures, confusion, why people cancel or send it back |
| Reddit and forums | What the category's buyers believe, competitors they compare, language |
| Order and customer data | Best sellers, repeat rate, order value, who buys |
| Ad account | What ran, what it cost, what won |

Where one of these already answers a question, show the founder the answer and ask "is this right?" A founder corrects faster than they recall.

No source answers the product questions (F2.10 to F2.13, and the second halves of F2.7 and F2.8). A product page shows the pack from the front; it does not show the product out of its pack next to a hand, the order of the steps, or the sound. These are always asked.

## The same question, 2 kinds of product

A product that is used up (a cream, a snack, a supplement, a candle) is bought again. One that is bought once (a pan, a jacket, a bag, a lamp) is bought after longer thought. The questions are worded for both; listen for a different answer.

| Question | Used up | Bought once |
|---|---|---|
| F2.7 what they notice, and when | Often felt, not seen, and after days or weeks. "Nothing to see" is common and useful | Often seen at once (fit, finish, how it works), and again after a year (it has lasted) |
| F2.12 how it is used | A short routine repeated daily: open, measure, apply or eat | First use and care differ: unbox, set up or try on, use, clean, store |
| F4.4 guarantee, returns, warranty | A money-back promise on the first order | Returns, exchanges for size, a warranty in years. Ask how often each is used: returns are a cost |
| F4.5 after the first order | How long 1 unit lasts, the subscription, pausing | How long it lasts, and what they buy next: a second colour, an accessory, a part, a gift for someone else |
| F5.4 why people leave | Stopped using it, cancelled, did not reorder | Sent it back, or never bought the second thing |
| F6.1 what the sale is lost to | Doing nothing, or the brand they already buy | Keeping the one they already own |

## Before the call

1. Read what the brand brain already holds. Strike every question it answers with a source.
2. Turn struck questions into confirmations: "Your site says returns are free for 30 days. Is that exact?"
3. List the gaps the data exposed: claims with no source, numbers that differ between pages, ingredients or materials with no figure, personas marked as inferred, and every blank picture field (see "What this reads from the brand brain"). Add each as a question under the matching section.
4. Send `questionnaire.md` 2 days ahead. Ask for the documents in F3.1 and F7.6, the asset folder in F11.1 and the 5 photos per product in F11.5 before the call.
5. Ask the founder to have the product, in its packaging, on the desk.

## On the call

- Ask the **core** questions. Leave the rest for writing.
- Ask for the scene, not the summary. "What happened that week?" beats "why did you start?"
- After any claim, ask "how do you know?" The answer decides whether it is a claim, a belief or a story.
- When the founder gives an adjective for the voice or the look, ask for a sentence they'd really say or a picture they'd really post.
- At F2.10 and F2.12, ask the founder to hold the product up to the camera, take it out of its pack and use it once, saying what they are doing. Write down the order of the steps and which hand does what. The recording is a reference for how the product is really handled; it is not footage for an ad unless F9.1 allows it.
- Don't correct or pitch. Record the call; the transcript is a source item like any other.
- Where the founder's view of the customer differs from the data, write down both. Don't settle it on the call.

## Where the answers go

Every answer is saved with its question id and `source: founder` and the date. A founder's statement is not proof: a claim stays `pending` until its document is on file.

| Questions | Goes to | What the app does with it |
|---|---|---|
| 1 Why this exists | `brain.md` About this brand; `brand-guidelines.md` Brand story | Founder ads (made only of the founder's own words: F1.1 to F1.3, F2.1 to F2.3, F2.5), origin beats, what stays private (F1.5) |
| F2.1 to F2.6, F2.9 | `products-and-positioning.md` per product (Key features, Positioning angle); `brand.json` products; `brain.md` Product notes | Mechanism lines, the differentiator test, who not to target |
| F2.10 | `products-and-positioning.md` per product: **Looks like** | The words every picture prompt repeats about the product |
| F2.11 | per product: **Pack** | What is printed on the pack is copied, never made up |
| F2.12 | per product: **How it is used**; a step that must never be shown wrongly also goes to `lessons.json` | The order of actions in a demonstration |
| F2.7 | per product: **Visible result**; the time to notice goes to `brain.md` Product notes | Whether a before and after may be shown at all |
| F2.13 | per product: **Moves and sounds** | The motion and the sound a clip is asked for |
| F2.8 | per product: **Never show**; `lessons.json` | Checked after every render |
| F11.5 | per product: **Reference photos**; the files go to `assets/<product>/` | The tagged photos attached to every prompt that shows the product |
| 3 Claims and proof | `brand.json` claims (with status and source), `forbidden_claims`, `proof_assets` | The claims check, where it is switched on, and the proof beat |
| 4 Money and offers | `brand.json` offers and guarantee; `offers.json`; the costs in F4.2 go to the Offers screen; `brain.md` Key decisions | Offer and call-to-action lines, which product a concept sells, what an offer may and may not do |
| F4.7 | `recent-changes.md` | Real deadlines and stock limits. No other urgency is ever written |
| 5 The customer | `customer-avatars.md`, marked "founder's view" | Persona hypotheses to check against research, not facts |
| F5.9 | `customer-avatars.md` per avatar: **The moment**, marked "founder's view" until research confirms it | Where and when a scene is set |
| 6 Competitors and the enemy | `competitors.md`; `brand.json` voice | Comparison lines, what may be named |
| F7.1 to F7.6 | `brand-guidelines.md` Brand voice and tone, Voice do's, Voice don'ts, Brand guardrails; `brand.json` voice | The brand voice at every step |
| F7.7 | `brand-guidelines.md` **Brand world**: Places, Light and time of day | Where a picture is set |
| F7.8 | **Brand world**: Surfaces and props, Never in frame | What may sit beside the product |
| F9.4 | **Brand world**: People | Who is cast |
| F7.9 | `brand-guidelines.md` **Motion and sound**: Pace, Camera | How a clip moves |
| F7.10 | **Motion and sound**: Sound, On-screen text | What a clip sounds like and whether words are added |
| F8.5 | **Motion and sound**: Formats in use; `brain.md` Ideas to explore | Which formats to make first |
| 8 What has been tried | `winning-ads.md` (marked "reported by the founder, not measured" unless a number is given); `brain.md` What we know works, What to avoid, Ideas to explore | Script types and angles to repeat, retest or skip |
| 9 Who appears | `creative-kit.json` presenters and rights | Casting in image and video plans |
| 10 Honesty lines | `brain.md` Key decisions; `brand.json` voice don't | Which story-ad forms and image types are switched on |
| F11.1, F11.2 | `creative-kit.json`; `assets/` | Reference images, what may not be generated |
| 12 Goals and how we work | `brain.md` Key decisions; `recent-changes.md` | Planning volume, approval steps |

## Rules

- Never fill a gap the founder left. An unanswered question is written as "not answered" in `brain.md` under Open questions.
- Never turn a founder's belief into a claim. "We think it works because..." is a story line in the founder's voice, not a proof line.
- Rights are recorded as stated, with limits (who, where, how long). No recorded right means no use.
- A number without a source and a date is not used in an ad.
- Where the founder and the data disagree about the customer, the data leads the script and the disagreement is noted for the founder.
- For what the product looks like, a photo outranks the founder's words, and the founder's words outrank a description a model wrote from file names. Where the 3 disagree, ask.
- A picture answer is written as said: "matt, off-white, the size of a thumb". It is not tidied into brand language.

## Before the first picture

No picture or clip of a product is made until these are answered for it, or the output is marked "product not confirmed": F2.10 (looks like), F2.12 (how it is used) and F11.5 (the 5 photos). These 3 are core. F2.11, F2.13 and the second halves of F2.7 and F2.8 take a minute each in writing and should follow within the week.

## After the call

1. Import the transcript as a source item (type: founder interview).
2. Write the answers into the files above, each with its question id.
3. Send the founder a 1-page readback: what we heard, what we still need (documents, photos, rights, unanswered questions), and the decisions they made in sections 9 and 10.
4. Re-run the brand diagnosis in `brain.md`.

## What this reads from the brand brain

It reads the whole brain before the call, to strike what is already answered, and it is the place every blank is asked. A blank after the interview stays blank and is listed in `brain.md` Open questions; nothing is invented.

| Document and field | Blank? Ask |
|---|---|
| `products-and-positioning.md`, per product: Looks like, Pack, How it is used, Visible result, Moves and sounds, Never show, Reference photos | F2.10, F2.11, F2.12, F2.7, F2.13, F2.8, F11.5 |
| `brand-guidelines.md` Brand world: Places, Light and time of day, Surfaces and props, Never in frame, People | F7.7, F7.8, F9.4 |
| `brand-guidelines.md` Motion and sound: Pace, Camera, Sound, On-screen text, Formats in use | F7.9, F7.10, F8.5 |
| `customer-avatars.md`, per avatar: The moment; any avatar marked "inferred" | F5.9, F5.1 to F5.5 |
| `brand-guidelines.md` Brand voice and tone, Brand guardrails (Never say, Never show, Always) | F7.2 to F7.6, F10.4 |
| `brand.json` claims with no source, `forbidden_claims`, `proof_assets`, guarantee | F3.1 to F3.6, F4.4 |
| `offers.json` and `brand.json` offers; whether the product is used up or bought once, and how long 1 unit lasts | F4.1 to F4.7 |
| `winning-ads.md`, `brain.md` What we know works, What to avoid | F8.1 to F8.6 |
| `competitors.md` | F6.1 to F6.4 |
| `recent-changes.md` | F4.7 |
