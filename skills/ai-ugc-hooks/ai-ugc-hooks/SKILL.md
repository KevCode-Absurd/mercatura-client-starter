---
version: 0.3.0
name: ai-ugc-hooks
description: Make talking hooks for paid social ads - 6 to 8 seconds in which 1 fictional adult presenter says 1 line to their phone and the brand's real product comes up into the frame on a cue word, so people keep watching and the ad body gets seen. Built from the brand's tagged product photos, an approved presenter, an opening still approved before any clip, 11 honest hook levers and 3 pacings, and a last frame that hands over to the ad body. Use for "UGC hooks", "talking hooks", "hook variants for our winning ad", "pattern interrupt hooks", "AI presenter hooks". Default batch 2 or 3. Not for wordless hooks (ai-satisfying-hooks), full ads, or stills.
---

# AI UGC hooks

A talking hook is 6 to 8 seconds: 1 person says 1 line to their phone and the product comes up into the frame. It goes in front of an ad body that already works, or opens a new UGC ad. It has 1 job: **keep people watching, so the body gets seen.** It is judged on 4 things: the first frame reads as a person and not an advert, the line makes the viewer need the next line, the product arrives on the cue word and is the real product, and the last frame leads into the body.

It rests on `skills/production-principles/SKILL.md` (the product from tagged photos, a still before a clip, people, sound, a check after every render). Read that first. Facts about a named model, tool or price are in `skills/production-principles/models.md` and nowhere in this skill.

Neighbours: no presenter and no speech is `ai-satisfying-hooks`. How a generated clip is made to look like a phone video is `realistic-ai-ugc`. The words of a whole UGC ad are `script-format-ugc`.

Approved handling overrides this method's lift/use examples. With `handling=display`, reveal the verified sealed front on a support at the cue cut and leave it there; nobody holds, opens or uses it. Establish scale only from actual evidence, not a front-only pack photo. An action hook requires verified use, otherwise select a talking lever. If an approved line cannot fit, propose shorter words retaining the opening and cue, obtain revised-line approval and then generate; never silently cut or stretch it.

## The rules that define it

1. **The line is written against the body.** A hook sells line 2. It is read aloud with the first line of the ad body before anything is made.
2. **A generated presenter is a fictional adult** and says nothing only a real customer could say. The 11 levers in `references/hook-frameworks.md` are the ones such a person can say honestly. A founder, a customer or an expert appears only from their own upload. No children.
3. **The product comes from its photos,** each attached and named with its job, and it is in the opening frame. It is lifted into view on a cue word; the camera does not turn to find it.
4. **18 words or fewer.** Said at the speaker's pace, which follows their age. 8 or fewer while the product is being lifted.
5. **Every fact is the brand's:** numbers, prices, dates, claims, and a customer's words word for word.
6. **It looks like a phone video.** 1 person, 1 real room, the room's own light.
7. **Voice and sound are named.** No music.
8. **It ends on a closed mouth and a still product,** so no word runs across the join.
9. **A still first, then 1 clip, then a batch of 2 or 3.** Never 10.

## The shape, in seconds

For a 6-second hook (8 for a quiet one):

| When | What is on screen |
|---|---|
| 0.0 | The presenter mid-thought, mouth just opening, eyes on the lens. The product is already in the frame, low in a hand or on the surface |
| 0 to 4 | The line. The face and 1 free hand do what the pacing says |
| About 4 to 5 | The cue word. 1 hand lifts the product to chest height beside the face, front to the lens |
| Last half second | Mouth closed, eyes on the lens, the product held still |

## The method

### 1. Read the brain

Read the fields under "What this reads from the brand brain" below for the 1 product. A blank field is a question for the brand, asked before drafting. What stops the work when blank: `Reference photos` (pack front, plus scale/handling evidence for a lift), `Looks like`, and an avatar to write to. A front-only photo supports display; it does not establish in-hand scale or use.

Get the ad body the hooks are for: its first spoken line, its first frame, who is in it and where. If there is no body yet, the hook is the first clip of a new ad and the script comes first (`script-format-ugc`).

### 2. The presenter

`references/presenter.md`. If the brand has an approved presenter, use that person. If not: 3 options from the avatar, the brand picks 1, 1 picture is made and approved. If the body has a real creator in it, the hook either uses that creator's own footage or a plainly different person; never a generated look-alike.

### 3. Draft the lines

For each hook: the lever (`references/hook-frameworks.md`), the line with its cue word marked, the pacing (`references/pacing-styles.md`), the room, where the product is at the start, how it is lifted, the last frame. Run the check at the foot of `hook-frameworks.md` on every line.

Name the question or expectation the body pays off, and the exact use step or explanation that does so. Attention alone is not enough: an unrelated stunt or promise the body never answers is a different concept, not an improved talking hook. Keep this format's one person, cue-led product handling and approved words.

### 4. The line-up, approved

Show 2 or 3 rows, each a different lever:

| # | Lever | The line (cue word marked) | Pacing | Room | Product at the start, and the lift | Leads into (the body's first line) |

Say what the still and the clips will cost, read fresh. Wait for a yes. A changed row is confirmed again on its own.

### 5. The opening still, approved

Make the opening frame with the image model from the presenter's picture and the tagged product photos (`references/prompt-template.md`, part 1). Look at it before showing it:

- the product matches its photo: shape, colour, printing, size against the hand
- the presenter matches the approved picture
- it reads as a phone video at the size of a thumb, not as a photo shoot
- the product is in the frame and its printing is uncovered
- nothing that matters is in the top or bottom sixth

Remake it until it is right. Show it. Wait for a yes. Hooks that share a presenter and a room share this still.

### 6. 1 clip

Write the clip prompt (`references/prompt-template.md`, part 2), run its check, read the price and say it, make 1 clip.

### 7. Check the clip

The check in `skills/production-principles/SKILL.md` section 9, and for a talking hook also:

1. The whole line is said, word for word, and none of it is rushed or cut off.
2. The lips match the words.
3. The product comes up on the cue word and is the brand's product.
4. It looks like a phone video. The face is not smoothed.
5. The last frame is a closed mouth and a still product, and it sits well beside the body's first frame.
6. A person has listened: the voice fits the presenter, the room sounds like the room, there is no music.

A fault is written down as 1 line and goes to the brand's lessons. `references/troubleshooting.md` says what the next prompt does about each. A refused or failed job is never sent again with the same words.

### 8. The rest of the batch, then deliver

Only when the first clip passes: the other 1 or 2 hooks. Deliver each as the raw clip, its last frame as a picture, the line, and the lever. Then the test: the same body with each hook in front of it, run as separate ads, so only the hook differs. Joining notes are in `references/troubleshooting.md`.

## In the app

The app makes a UGC ad from a script: the hook is the script's first line and the first seconds of its first clip. The planning step is sent `CARD.md`, not this file: a rule that should reach the planner goes in both. A pack of hooks for an ad that already exists is not a format in the app yet; it is made by hand with this method.

## Reference files

- `references/hook-frameworks.md`: the 11 levers, 2 wildcards, 4 for real people only, and the check for a line
- `references/pacing-styles.md`: quiet, fast, direct
- `references/presenter.md`: who may be on screen, choosing and describing a presenter
- `references/prompt-template.md`: the 2 prompts, with a worked example for a consumable and a durable
- `references/troubleshooting.md`: what came back wrong and what the next prompt says; joining a hook to a body

## What this reads from the brand brain

| Document | Field | Used for | If blank |
|---|---|---|---|
| `products-and-positioning.md`, the product | `Looks like`, `Pack` | The words about the product | Ask |
| | `Reference photos` | Pack front, in hand, in use, each tagged | Ask. No photo, no hook |
| | `How it is used`, `Moves and sounds`, `Visible result` | Lever 5 and the sound on the lift | Do not use lever 5 |
| | `Never show` | How it is held and stood; the check | Use the lessons only |
| | `Replaces` (proposed) | Levers 2 and 9 | Do not use them |
| `customer-avatars.md` | `Who they are`, `What almost stops them`, `The moment` | The presenter, levers 1, 3, 8, 10, the room | Ask which avatar |
| | `Customer language bank`, `Ranked insight bank` | The buyer's nouns; lever 7's quote and its source | Do not use lever 7 |
| `brand-guidelines.md` | `Brand voice and tone`: Voice do's and don'ts, Tone by context | The wording and the pacing | Ask |
| | `Brand world`: Places, People, Never in frame | The room and who may be on screen | Use the place in the brand's own photos, marked "inferred" |
| | `Motion and sound`: Pace, Sound | The pacing, the voice | Match the ad body |
| | `Brand world`: `Presenters` (proposed) | The approved presenter to reuse | Make 3 options |
| | `Brand guardrails` | Never say, Never show | None |
| `winning-ads.md`, the ad the hook joins | `Opening line`, `First frame` (proposed) | The line it has to sell; the hand-over | Ask for the ad itself |
| `brand.json` | Claims with sources, forbidden claims | Levers 4 and 6 | Do not use them |
| `offers.json` | A real date and its terms | Lever 11 | Do not use it |
| `lessons.json` | How the product is opened, held and used | Word for word in the prompt | None |
