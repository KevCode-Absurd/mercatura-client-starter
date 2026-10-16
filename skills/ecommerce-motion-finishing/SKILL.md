---
name: ecommerce-motion-finishing
description: How to plan the few timed overlays (labels, badges, underlines) laid over a finished, approved product ad so a viewer with the sound off still gets the product, the 1 fact and the action. Says which moments earn an overlay, which words to take, how many, where they go, which colours, and what each format's style allows. Never rewrites the ad, adds a claim, or touches the footage or sound.
---

# Motion finishing for a product ad

The video is finished and approved. Finishing adds a few words on screen at the moments that matter, so a viewer with the sound off still gets 3 things: what the product is, the 1 fact worth knowing, and what to do next. It is judged on that, and on what it leaves alone: the product, the faces, the hands and the quiet stretches stay clear.

The prompt you were given sets the output, the kinds, the positions and the limits. This says how to choose.

## What earns an overlay

In order. Stop when the video has enough.

1. **What the product is,** the first time it is clearly seen: its name or its plain description, in the script's words. A label beside it, never on it.
2. **The 1 number or proof** the script gives, at the moment it is said. A badge.
3. **The step a viewer could miss** in a demonstration: what is being done, in 2 to 4 words. A label.
4. **The offer, the guarantee or the action** in the last scene, if no caption already carries it. A badge.
5. **An underline** is a short accent bar at 1 of the positions, with no words. It can't be tied to a caption or to a word, so it earns its place only directly beneath something in the picture that sits there and holds still (the product standing in the lower left). Otherwise leave it out.

What does not earn one: a caption's own words said again; a feeling ("so good"); anything in the first 1.5 seconds when the hook has a caption; a stretch where the picture is doing the work (a pour, a reveal, a wordless hook). Empty time is part of the plan.

If nothing earns an overlay, return the 1 that is least in the way (usually the action, in the last scene) and say in `rationale` that the video is better left as it is.

## Which words

- Take the fewest words that carry the point: 2 to 4 is usual. Choose a phrase that reads whole on its own ("no coating", not "which has no").
- Take them from the line being spoken in that scene, so eye and ear agree. A line's time is its scene's time: add up the `seconds` of the scenes before it in `script`. Place the overlay inside that scene, starting a moment after the line begins.
- A number, a price, an offer, a claim or a customer's words appear only as they stand in the allowed copy. Nothing is rounded, shortened into a stronger claim, or given a mark it did not have.

## How many

About 1 for every 6 to 8 seconds: 2 in a 15-second video, 3 to 5 in 30 seconds. The maximum in the prompt is a ceiling, not a target. 2 overlays never make the same point.

## Where

- Look at the sampled frame nearest the overlay's time and choose the position with the emptiest background, away from the product, any face and any hand.
- On vertical video the right edge sits under the app's own buttons and captions fill the lower part of the frame: prefer `top-left` and `middle-left`, then `top-right`. A lower position is for a scene with no caption.
- The frames are samples. Where the subject moves between 2 samples, choose the side it is moving away from, and name the event in `rationale` as one a person should look at.
- Keep 1 position for labels through the video where the picture allows. Overlays that jump about read as noise.

## Colours

The colours and typeface are applied from the actual brand look. Labels and badges are transparent glyphs in the verified headline font, with a restrained brand-colour glyph contour for contrast. They never gain a generic opaque text plate. Missing font inputs must be repaired; no replacement face is drawn. Preserve product printing and planned real logos. The planner chooses where, when and which exact approved words, not fonts or colours.

## What each style allows

The requested `style` follows the format. The renderer draws it; you choose text, time and place to suit it.

- **clean** (a person talking, a podcast clip): the fewest and smallest. Labels over badges. Nothing near a mouth, and nothing that reads as words the person did not say.
- **tactile** (clay): short labels, like a paper tag in a handmade scene. No offer badge before the last scene.
- **graphic** (cartoon, comic, talking object): 1 or 2 bold badges. In a comic the caption boxes already carry the words: add the closing offer or action and no more.
- **premium** (a product demonstration, a rendered explainer, anything else): precise callouts for the product's name, the 1 number, and the part or material being shown. Never a callout for something the picture does not show.

## What to say in `rationale`

Which sampled frame each placement was judged on; which events fall between samples and need a person's eye; that times come from the script's scene lengths and not from measured speech; and anything in the footage that does not match the script.

## For the person reviewing

The plan is a draft, and the overlay version is a separate file. Watch it at phone size with the sound off: each overlay against the product and the faces, and the last frame. What the renderer can and can't do is in `references/kit-adaptation.md`.

## What this reads from the brand brain

- `brand-guidelines.md`: `Motion and sound`, `On-screen text` (how much the brand writes on screen and in what case); `Brand guardrails` (`Never say`, `Never show`). `Color palette` and `Typography` are applied by the app when the tiles are drawn, not by the plan.
- The approved plan of the video: the spoken lines and captions are the only words allowed.

No guidance on on-screen text: sentence case, the fewest overlays.
