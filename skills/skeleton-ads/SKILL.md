---
name: skeleton-ads
description: Make a skeleton ad for any D2C brand - a narrated what-happens-if-you ladder (Day 1, Day 30, Day 365) lived by 1 cartoon skeleton, each rung 1 shot that shows what its line says. It works when the skeleton is the exact same character in every shot, each rung goes visibly further than the last, and the real product keeps its true look. A planning step is sent CARD.md, not this file.
---

# Skeleton ad

A narrated, escalating journey in the 2nd person ("What happens if you ___? Day 1... Day 30... Day 365"), carried by 1 voice-over and lived by 1 cartoon skeleton who stands for "you".

## What it is judged on

1. **With the sound off, a stranger can follow the ladder:** each shot shows what its line says, and each rung goes further than the last.
2. **The skeleton is the same character in every shot:** eyes, bones, proportions.
3. **The product is the real one:** its shape, colours and printing.
4. **The picture claims nothing the brand's facts do not.**

## What this rests on

- `skills/production-principles/SKILL.md`: tagged reference photos, a still before a clip, the first frame, real speed, materials, sound, words in the picture, the check after a render, spending. Not repeated here.
- `skills/production-principles/models.md`: what the models take, clip lengths, how narration is written, the tools. No model, tool or price is named in this skill.
- `skills/script-format-skeleton`: how the question, the ladder and the narration are written, and which angle, spine and payoff a product calls for. This skill is the skeleton and its world.

## 1. Choose the look

1 look for the whole ad. Its block is fixed once chosen: fill `[THEME]`, the palette and (for `dressed`) the wardrobe to the ad's world, and never change the character wording between shots. Default to `bare`; never fall into the cute look by accident.

**`bare`: bare-bones cinematic.** The default. Best for scenario and transformation ladders.

```
CHARACTER: A full anatomical skeleton with natural adult human proportions, tall and lanky, smooth ivory-cream bones with realistic bone detail (NOT toy-smooth, NOT chibi, NOT scary), and large expressive cartoon eyes with white sclera and dark pupils set in the eye sockets, giving an emotive, lovable face. No clothing. Same character in every shot.
STYLE: cinematic 3D animated render, photoreal [THEME] environment, warm [palette] colour grade, soft volumetric light with drifting steam or atmosphere, shallow depth of field.
```

**`dressed`: the same skeleton in a full themed outfit.** Best for something worn, and for lifestyle or identity products.

```
CHARACTER: The same friendly skeleton (ivory bones, large expressive cartoon eyes with white sclera and dark pupils) wearing a complete [THEME-appropriate wardrobe, e.g. tailored suit / cowboy attire / chef's whites]; skull, hands and any exposed bones still visible. Same character in every shot.
STYLE: cinematic 3D animated render, photoreal [THEME] environment, warm [palette] colour grade, soft volumetric light, shallow depth of field.
```

**`xray`: a translucent glowing body, skeleton plus organs.** For a "what happens inside you" angle, and only when `How it works` says what happens inside. The organs are how the character looks: none is shown changing beyond that fact.

```
CHARACTER: A translucent glowing anatomical adult human body revealing the full white skeleton PLUS visible internal organs (heart, lungs, intestines) glowing red and orange through a blue-tinted translucent skin outline, with large expressive cartoon eyes. Same character in every shot.
STYLE: clean sci-fi medical 3D render, cool blue translucent body with warm organ glow, [environment: a real setting with x-ray glow OR a clean blue gradient backdrop], soft rim light.
```

**`mascot`: cute and toy-like.** Only for a brand that is playful on purpose. It is a toy mascot with an adult's job and props, never a child: no child's clothes, toys or school.

```
CHARACTER: A cute chibi cartoon skeleton with an oversized round skull, big adorable eyes, a small rounded body, and smooth toy-like bones; bright, friendly, non-scary. Same character in every shot.
STYLE: a playful 3D animated render, simple clean [pastel/theme] background, soft even studio lighting, glossy finish.
```

## 2. Fix the skeleton

- **1 character picture first:** the skeleton alone, full body, front on, plain background, opened with the look's CHARACTER block. Every shot points back to it.
- **Re-attach it, tagged by its job, to every still, and restate the CHARACTER block unchanged.** Never build a still on the output of the shot before.
- **It is "you":** no name, no story of its own, not a customer, no testimonial.
- **It never speaks.** Its jaw is closed, or dropped as a feeling. Bones cannot frown, so feelings are eyes and pose: eyes widen or narrow, shoulders slump, the chest lifts, a fist goes up.
- **Its body is not the result.** The bones do not whiten, thicken or mend. What changes is its situation.

## 3. Fix the world

- **1 theme that dramatises the angle,** with 1 or 2 alternatives: a modern office, the 1940s, the product's own trade, a street after the end of the world.
- **What changes from rung to rung** is the skeleton's situation, the state of the setting and the props.
- **Reaction characters amplify the arc:** coworkers, townsfolk, a flatmate, going from recoil to awe. Each is a fictional adult given by role and dress. They do not speak.
- Nothing in the world carries words: no signs, labels, calendars or screens.

## 4. Map the ladder to shots

1 row per line of the script. The skeleton is in every row.

| # | Line | The skeleton's situation and feeling | Setting (the rung) | Props and product | Marker (laid over afterwards, never in a prompt) |
|---|---|---|---|---|---|
| 2 | rung 1 | pose, eyes, 1 action | where, in what state | by 1 name each | DAY 1 |

- **The picture is the proof of the line.** If a shot needs its line to be understood, find another picture.
- **Vary the framing:** wide to establish, medium, a 2-shot with a reacting human, close on the product in the skeleton's hand, the hero shot for the payoff.
- **A picture claims as much as a sentence.** A rung with a number, a timed result or a health result is drawn only if the brand holds it. Absurd exaggeration is free. A catastrophe is the old way or doing nothing, never a named competitor or an illness.

A worked example, as the bar. A rain jacket, a fishing port in 1850, look `bare`. "What would happen if you wore a modern rain jacket in 1850?" The dockers stare as rain beads on your shoulders; the harbour master offers his hat for it; the captain gives you the wheel in a squall; the skeleton stands dry at the prow, the crew saluting. The benefit the brand states (rain kept out) is made felt by reactions that climb from suspicion to worship.

## 5. Stills first

1. The character picture (step 2). Approve it.
2. 1 start frame per shot, with the character picture and, where the product appears, its photo attached and tagged. Approve each before its clip.

```
[CHARACTER block of the look, unchanged]
[STYLE block of the look, THEME and palette filled]
SHOT: [framing]. The skeleton [1 action, mid-motion], [feeling, as eyes and pose]. [The setting at this rung]. [Props by name; the product from its tagged photo, its size against the skeleton's hand].
No text, signs, labels or numerals anywhere in the picture.
```

## 6. Two ways to build the clips

**1 place, clips that continue (what the app does).** Clips of about 10 seconds, each starting on the last frame of the one before. So the ladder climbs inside 1 place, with everything it uses in the first frame at its smallest. 1 or 2 rungs to a clip, each change of rung made by the rung turn: the skeleton holds, the light sweeps the place once as time going by, and the place settles 1 rung on. Nothing comes in from out of view.

**A still per rung (by hand).** The narration is recorded first, whole, in 1 take, and its real word timings set the length of every shot. Consecutive shots are grouped into 1 clip up to the length the video model takes (`models.md`), each from its own approved start frame, with a hard cut between rungs. This allows a new setting for each rung.

```
Shot [N] ([seconds], while the narrator says "[its line]"): image [N] is shot [N]'s start frame. The skeleton [1 motion]. Camera: [1 move, or still]. Then a hard cut to shot [N+1].
GUARD: silent clip. No dialogue, no narration, no music. The skeleton's jaw forms no words. Same skeleton as the character picture: eyes, bones, proportions. Bones stay joined and rigid. Real speed. No text anywhere.
```

Join the clips over the narration. Music, where `Motion and sound` allows it, is tense under the climb and lifts at the payoff. Markers and captions are added in the edit.

## 7. What goes wrong, and the fix

| Fault | Fix |
|---|---|
| The skeleton drifts: smaller eyes, toy-smooth bones, new proportions | Re-attach the character picture and restate the CHARACTER block word for word. Never chain off the last shot's output |
| 2 ideas in 1 shot | Split it: 1 line, 1 shot, 1 rung |
| The ladder is a list | Each rung goes further in 1 visible thing: the pile, the crowd, the skeleton's bearing |
| It reads as horror | Keep "emotive, lovable face" and the warm grade. No decay, blood or darkness |
| The jaw flaps as if talking | The GUARD line, and a feeling written as eyes and pose |
| Letters or a calendar in the picture | The "No text" line. The marker is an overlay |

## What is not done

- No real person, child, celebrity or known character, as the skeleton or beside it.
- No skeleton as a customer, a founder or an expert, and no result of its own.
- No body before and after. No invented pack.

## What this reads from the brand brain

| Document | Field | Used for | If blank |
|---|---|---|---|
| `products-and-positioning.md` | `Core benefit`, `Replaces`, `Visible result`, `How it works` | The angle and the payoff; what a rung may show | Ask. No `How it works`: not `xray` |
| `products-and-positioning.md` | `Looks like`, `Pack`, `How it is used` | The product in the skeleton's hand | No pack photo: stop and ask. No `How it is used`: it stands closed |
| `customer-avatars.md` | `The moment`, `Tried before` | The world; the old way of a catastrophe ladder | World marked "inferred" |
| `brand-guidelines.md` | `Brand voice and tone`, `Brand world`, `Color palette`, `Motion and sound`, `Brand guardrails` | The narrator; the look; the palette; music or none | `bare`, 1 calm narrator, no music |
| `brand.json`, `offers.json` | claims, forbidden claims, the offer, the guarantee | Every rung with a number, a timed result or a health result; the close | The rung keeps its marker and loses its result |

Source: distilled from skills/_library/starpop/skeleton-ads (made by @davidaistar), kept there as handed over.
