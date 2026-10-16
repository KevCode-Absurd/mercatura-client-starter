---
name: motion-graphics-animation
description: Make a motion graphics ad for any D2C brand - a flat information system built round the real product cutout, with kinetic type, diagrams, icons, charts and rhythmic transitions. It works when a compact design system from the brand's own colours and typefaces is fixed first, when every shot holds 1 message and 1 supporting visual whose movement explains something, and when only wordless plates are generated while exact type, numbers and the logo are laid over afterward. A planning step is sent CARD.md, not this file.
---

# Motion graphics ad

A precise information system built round the product: flat shapes, icons, diagrams, charts and type on a grid, moving by a small set of rules. It exists to make figures, parts and terms plain at phone size.

Generated pictures and exact copy are 2 separate jobs. The video model makes what benefits from being generated: the cutout turning, shapes, a diagram drawing itself, backgrounds. Exact type, numbers, the logo and any interface are set afterward, over the plates.

## What it is judged on

1. **Every line can be read at phone size,** once, in the time it is on screen.
2. **Every movement explains something:** hierarchy, cause, comparison or mechanism.
3. **Every figure and every chart matches the brand's facts.** An illustrative shape is visibly not a measurement.
4. **The product is the real one:** its proportions, colours and printing. Brand marks are placed, never regenerated.
5. **It is 1 system** from the first shot to the last.

## What this rests on

- `skills/production-principles/SKILL.md`: tagged reference photos, a still before a clip, the first frame, real speed, materials, sound, words in the picture, the check after a render, spending. Not repeated here.
- `skills/production-principles/models.md`: what the models take, clip lengths, how narration is written, the tools. No model, tool or price is named in this skill.
- `skills/script-format-motion-graphics`: how the lines and the on-screen text are written. This skill is the design system and the motion.

## 1. Fix the design system

Before a shot is written, 7 things are decided once and written down. The brand's `Color palette` and `Typography` are the system: nothing is chosen that the brand has already chosen.

| Part | What is fixed | Example |
|---|---|---|
| Grid | Columns, margins, where copy sits, where the cutout sits | 6 columns, wide margins, copy in the top third, the cutout on the centre line |
| Type scale | 3 sizes in the brand's typefaces: headline, label, small print | A headline a sixth of the frame's height; a label a third of that |
| Palette | 1 ground, 2 or 3 brand colours, 1 accent kept for the thing that matters | Cream ground, deep green, sand, a coral accent |
| Shape language | 1 kind of corner and 1 kind of edge | Rounded rectangles and full circles, no outlines |
| Icon style | 1 line weight, 1 corner radius, filled or outlined and never both | Outlined, an even stroke, rounded ends |
| Cutout treatment | How the product sits on the ground | A clean cut, front on, 1 soft shadow beneath |
| Transition family | 1 of: slide, wipe, scale, draw-on | Slide: everything travels along the grid's lines |

Palette or typefaces blank: take the colours from the pack and a plain sans-serif, and mark the system "inferred" for the brand to confirm.

## 2. 1 message and 1 supporting visual to a shot

Each shot has 1 message, 1 visual (the cutout, a diagram, a chart or a row of icons) and 1 focal point. Movement shows 1 of 4 things. A movement that shows none of them is cut.

| It shows | When the line says | The movement |
|---|---|---|
| Hierarchy | This is the thing that matters | The 1 important thing arrives last, largest, in the accent; the rest have already settled |
| Cause | This leads to that | 1 shape travels to another, and the second responds on contact |
| Comparison | This against the old way | 2 things on 1 baseline change at the same moment, at the same speed |
| Mechanism | How it works | The diagram draws itself link by link, in the order `How it works` gives |

A comparison is with the old way or the category, never a named competitor.

## 3. The product cutout

- From its own tagged photo: its true proportions, colours and printing. It is never redrawn as an icon, and no letter of it is reset.
- It is in the first shot and is the fixed point the shapes arrange round. It may turn slowly on its upright axis, scale, or slide along the grid. It does not open or pour unless `How it is used` says how.
- 1 soft shadow beneath it is the only depth in the system.

## 4. Diagrams, charts and icons

- **A diagram** shows the mechanism as `How it works` gives it: 2 or 3 links, each 1 shape, joined by 1 line that draws itself. None is invented. No body before and after.
- **A chart is a measurement.** Its shapes are in the proportions of supplied figures, and the proportion is written into the prompt ("the left bar twice the height of the right"). The figures and units are laid over afterward. No data, no chart.
- **An illustrative shape** stands for an idea, not an amount. It has no axis, no scale, no bars and no figure beside it, so nobody reads it as a result.
- **Icons** come in 1 row of 3 or 4, 1 for each thing the brand's facts name (`Made of`, or the steps of `How it is used`).

## 5. The storyboard

1 row to a shot, 3 or 4 seconds each, 2 or 3 shots to a clip of about 10 seconds. An example for a layered steel pan:

| Time | Message (laid over) | Visual, and what its movement shows | Enters | Holds | Exits |
|---|---|---|---|---|---|
| 0 to 3 s | "3 layers. 1 pan." | The pan cutout, centre; 3 flat bands stack beside it (mechanism) | Bands slide in from the left along the grid | 2 s | Stays |
| 3 to 7 s | "Heat reaches the rim" | 1 accent band widens from the centre of the base to its edge (cause) | Scales from the focal point | 2 s | Bands slide out to the right |

The hold is long enough to read the copy twice: about 2 seconds for 6 words. Each clip ends with everything at rest.

## 6. Stills first

The opening still is made and approved before any clip. Its prompt opens with the style block, unchanged in every prompt of the ad:

```
Original flat motion graphics system. A plain [ground colour] ground on an even grid with wide margins. Flat geometric shapes with [rounded or square] corners in [brand colour 1], [brand colour 2] and 1 accent, [accent colour]. Icons in 1 even line weight. Even shadowless light, no gradients, no gloss, no texture, no depth except 1 soft shadow beneath the product. The camera is locked and square to the ground.
```

A prompt for a generated asset or plate has 5 parts, in this order:

1. The style block: the original graphic system.
2. The supplied product reference, tagged with its job, and what to copy from it.
3. The isolated asset or the background plate that is needed, and where its plain area for copy is.
4. The palette and the light, by name.
5. The last line, word for word:

```
No generated words, numbers, logos, watermarks, or UI.
```

Generate only what benefits from generation. A logo, an icon the brand already has, a screenshot and a chart of many values are prepared, not generated.

## 7. The clips, with the motion guard

Each clip continues from the last frame of the one before. Every clip prompt carries the style block, the shots in order with 1 move each, and the motion guard:

```
Flat graphic motion at real speed. Shapes slide, scale, turn and wipe along the grid, ease to a stop and hold still. The camera is locked: no shake, no drift, no zoom. No motion blur trails, no particles, no lens flare, no 3D depth. Nothing morphs into anything else. The product keeps its proportions, colours and printing. No generated words, numbers, logos, watermarks, or UI.
```

The transition family, chosen once in step 1:

| Family | What happens | Prompt wording |
|---|---|---|
| Slide | Everything enters and leaves along the grid's lines, in 1 direction | "the [shape] slides in from the left along the grid and settles" |
| Wipe | A block of the accent colour crosses the frame and uncovers the next layout | "a flat [accent] block wipes across the frame from left to right, uncovering the next layout" |
| Scale | Things grow from, and shrink to, the focal point | "the [shape] scales up from the centre point and settles" |
| Draw-on | Lines draw themselves, and shapes fill in after them | "a thin [colour] line draws itself from the product to the [shape], which then fills with colour" |

1 family for the ad, the same easing throughout, 1 dominant move to a shot.

## 8. Type, numbers and the logo

Set over the finished plates, in the brand's typefaces, on the grid, at the 3 sizes. Copy appears when the plate under it has come to rest, and leaves before the next move. Every figure and label is checked against the approved copy and the supplied data.

## 9. The check after each clip

On top of the shared check:

1. No letter, numeral, logo or interface was generated anywhere but the product's own printing.
2. Flat stayed flat, in the brand's palette: no gradients, no 3D, no camera movement.
3. The accent is on 1 thing.
4. Each shot made 1 move, in the chosen family, and came to rest.
5. The plain area for copy stayed plain for the whole hold.
6. A chart's proportions match the figures.
7. The cutout matches its photo in every frame.

## When it fails

| Failure | Fix |
|---|---|
| Scribbled letters or numerals appear in the plate | The last line, word for word; take every quoted word and figure out of the prompt; describe label areas as "plain blank areas" |
| The plate drifts to 3D, gloss or gradients | The style block unchanged at the top; add "flat shapes, even shadowless light" |
| The camera drifts or shakes | "The camera is locked and square to the ground" in the shot line as well as the guard |
| Shapes morph or wobble like liquid | Name the 1 move with its start and its end; "ease to a stop and hold still" |
| Colours shift between clips | Name each colour in every prompt; continue from the approved last frame |
| The product's proportions or label change as it turns | A smaller turn, or a slide in place of a turn; attach the product photo again |
| The system changes from shot to shot | The same style block in every prompt, never "same style as before" |

## What is not done

- No generated logo, figure, label or interface.
- No chart without supplied data, and no invented mechanism.
- No named competitor, no person shown as a customer, a founder or an expert, no child.
- No named designer's, studio's or brand's style.

Source: distilled from skills/_library/starpop/motion-graphics-animation (made by @davidaistar), kept there as handed over.
