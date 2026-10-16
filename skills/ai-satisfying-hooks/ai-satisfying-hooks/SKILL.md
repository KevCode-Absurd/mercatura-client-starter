---
version: 0.3.0
name: ai-satisfying-hooks
description: Make a wordless satisfying hook for a paid social ad - 4 to 5 seconds in which the product, what it is made of or the thing it replaces does 1 motion that resolves (fills to the brim, peels, clicks shut, slides free, sorts into order), so people keep watching and the ad body gets seen. Built from the brand's tagged product photos, an opening still approved before any clip, real speed, named sound, and a last frame that hands over to the ad body. Use for "satisfying hook", "scroll-stopper", "wordless hook", "hook for our winning ad", "ASMR-style hook". Default batch 2 or 3. Not for a talking presenter (ai-ugc-hooks), a full ad, or product stills.
---

# AI satisfying hooks

A satisfying hook is a short wordless clip that goes in front of an ad. It has 1 job: **keep people watching, so the ad body gets seen.** It is judged on 3 things: the first frame stops the thumb, the eye stays until the motion ends, and the last frame leads into the body without a change of subject.

It rests on `skills/production-principles/SKILL.md` (the product shown true from tagged photos, a still before a clip, real speed, sound said out loud, a check after every render). Read that first. This file adds only what is particular to a satisfying hook. Facts about a named model, tool or price are in `skills/production-principles/models.md` and nowhere in this skill.

For a talking presenter use `ai-ugc-hooks`. For the words of a satisfying ad (the overlay, the demonstration that follows the hook) use `script-format-satisfying`.

## The rules that define it

1. **1 motion that resolves.** Something fills, peels, clicks shut, slides free, settles, sorts into order. The viewer can see what "done" will look like and waits for it. A camera move with no end (an orbit, a glide) is not a hook.
2. **The object in focus is the product.** The product itself out of its pack, something it is made of, or the thing it replaces. The pack may be in the frame. A sealed pack turning on a stand is a packshot, not a hook.
3. **The product comes from its photos.** Every prompt that shows it attaches the brand's reference photos, each named with its job. Described in words only, the colour came back wrong on both of our test clips.
4. **The motion is already under way in frame 1,** and it ends in the last third of the clip. The last half second is still.
5. **The last frame hands over.** The product is in view, its printing uncovered, in the place and light where the ad body begins.
6. **Real speed.** No slowed or sped-up footage. `references/realism-rules.md`.
7. **Sound is named.** The sound of the motion and of its end, the room, no music, no voice.
8. **No person speaking, no words in the picture.** The overlay is added afterwards. A hand may do the motion. A product that is worn is shown on a hanger, laid flat, or on an adult cropped below the face.
9. **A still first, then 1 clip, then a batch of 2 or 3.** Never 10.

## The shape, in seconds

For a 4-second hook (the usual length; 5 where the motion needs it):

| When | What is on screen |
|---|---|
| 0.0 | The motion part-way: the pour in the air, the seal a third peeled, the lid a quarter turn from shut |
| 0 to 2.5 | The same motion continues. The end is in sight and not yet reached |
| 2.5 to 3.5 | The end: the brim reached, the last corner free, the click |
| 3.5 to 4 | Nothing moves. The product is in view. This frame is where the ad body starts |

## The method

### 1. Read the brain

Read the fields listed under "What this reads from the brand brain" below, for the 1 product the hook is for. Do not write a hook from a website, a guess or another brand's example.

A blank field is a question for the brand, asked before anything is drafted. The 3 that stop the work when blank: `Reference photos` (no photo of the product out of its pack means no hook that shows it), `Looks like`, and `How it is used` for any hook where the product opens or pours. `Moves and sounds` blank: propose motions from `How it is used`, mark each "inferred", and have the brand confirm them.

If the hook is for an ad that already runs, get that ad: its first frame, its first spoken line, where it is filmed. The hook is written against them.

### 2. Pick

For each hook, choose in this order (`references/mechanics-library.md`):

1. **The object in focus:** the product itself, what it is made of, or what it replaces.
2. **The mechanic:** the motion, and what "done" looks like.
3. **The place:** from `Brand world` and the avatar's `The moment`, and the same place the ad body starts in.
4. **The camera:** where it is and the 1 thing it does. Locked is the default.
5. **The sound:** from `Moves and sounds`.
6. **The last frame:** what is in it, and how it meets the first frame of the body.

Then say in 1 sentence why this buyer would wait for the end. If there is no answer, pick again.

### 3. The line-up, approved

Show 2 or 3 rows, each a different mechanic, and a different object in focus where the product allows:

| # | Object in focus | Mechanic and what "done" is | Place and camera | Sound | Last frame | Why they wait |

Ask about the overlay once: 1 to 4 words, or none (the rules are under "The overlay" below). Say what the still and the clip will cost, read fresh. Wait for a yes. A changed row is confirmed again on its own.

### 4. The opening still, approved

For the first row, make the opening frame with the image model from the tagged product photos (`references/prompt-template.md`, part 1). Look at it before showing it:

- the product matches its photo: shape, colour, finish, printing, size against the hand
- the motion is visibly part-way, not about to start
- the camera is where the row says
- everything the clip uses is in the frame
- nothing sits in the top or bottom sixth, where the overlay and the feed's buttons go
- the frame reads at the size of a thumb: 1 subject, clear edges

Fix and remake the still until it is right. A still costs little; a clip made on a wrong still is thrown away. Show it. Wait for a yes.

### 5. 1 clip

Write the clip prompt (`references/prompt-template.md`, part 2) and run its check. Read the price and say it. Make 1 clip, at the shortest length the model makes, starting on the approved still.

### 6. Check the clip

The check in `skills/production-principles/SKILL.md` section 9, and for a hook also:

1. Frame 1 already has the motion.
2. The motion ends, and ends in the last third.
3. Nothing new happens after the end.
4. The last frame is a clean still with the product in view, and it sits well beside the first frame of the ad body.
5. Stopped at any frame, it is still a good picture.
6. A person has listened: the motion's sound is there, there is no music and no voice.

A fault is written down as 1 line (what was asked, what came back) and goes to the brand's lessons. `references/troubleshooting.md` says what the next prompt does about each fault. A refused or failed job is never sent again with the same words.

### 7. The rest of the batch, then deliver

Only when the first clip passes: the still and the clip for the other 1 or 2 rows, each approved the same way.

Deliver each hook as: the raw clip, the clip with its overlay (if one was chosen), its last frame as a picture, and 1 line on what it shows. Then the test: the same ad body with each hook in front of it, run as separate ads, so the hooks are compared and nothing else. Joining notes are in `references/troubleshooting.md`.

## The overlay

- 1 to 4 words that open a question: "Wait for it", "POV:", or the first words of the buyer's own thought from the `Customer language bank`. Never an offer, a price, a claim or a call to action.
- Added after the render, on a copy. The raw clip is kept, so the words can change without a new clip.
- In the brand's typeface and colours (`brand-look.json`, and `On-screen text` under `Motion and sound`), in the upper third, below the band where the feed's own buttons sit, and never over the object in focus.
- All the first-frame messages agree: the overlay, the picture and the body's first line make 1 point.

## In the app

The app makes this as the "Satisfying hook and demo" format: a script (`script-format-satisfying`), then a shot plan, a first frame, and clips. The planning step is sent `CARD.md`, not this file: a rule that should reach the planner goes in both.

## Reference files

- `references/mechanics-library.md`: 25 mechanics, how to choose, the camera
- `references/prompt-template.md`: the 2 prompts, with a worked example for a consumable and a durable
- `references/realism-rules.md`: speed words, verbs, how materials behave
- `references/troubleshooting.md`: what came back wrong and what the next prompt says; joining a hook to a body

## What this reads from the brand brain

| Document | Field | Used for | If blank |
|---|---|---|---|
| `products-and-positioning.md`, the product | `Looks like`, `Pack` | The words about the product in every prompt | Ask. Never describe from memory |
| | `How it is used` | Where it opens, what comes out, the steps | Ask before any hook that opens or pours |
| | `Moves and sounds` | The mechanic and the sound line | Propose from `How it is used`, mark "inferred", confirm |
| | `Visible result` | Whether an "after" may be shown | Show no result |
| | `Never show` | What the still and the clip are checked against | Use the lessons only |
| | `Reference photos` | The tagged photos: pack front, product out of pack, in hand, close view of the surface | Ask. No photo, no hook that shows the product |
| | `Made of` (proposed) | The object in focus when it is an ingredient or material | Use the product itself |
| | `Replaces` (proposed) | The object in focus when it is the thing the product replaces | Use the product itself |
| `brand-guidelines.md` | `Brand world`: Places, Surfaces and props, Light and time of day, Never in frame | The place, the surface, the light | Ask, or use the place in the brand's own product photos and mark "inferred" |
| | `Motion and sound`: Pace, Camera, Sound, On-screen text | The look to match, the overlay's style | Match the ad body the hook joins |
| | `Brand guardrails`: Never show | The check on the still | None |
| `customer-avatars.md` | `The moment`; `Customer language bank` | The place and the overlay's words | Leave the overlay out |
| `winning-ads.md`, the ad the hook joins | `Opening line`, `First frame` (proposed) | The hand-over | Ask for the ad itself |
| `lessons.json` | Rules on how the product is opened, held and used | Copied into the prompt word for word | None |
| `brand-look.json` | Fonts and colours | The overlay | Use a plain bold sans and say so |
