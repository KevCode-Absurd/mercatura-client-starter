# The renderer: what it does, what it can't, and where the ideas came from

For whoever changes the finishing step or reviews its output. It is not sent to the planning model.

## What it does

The finishing step lays overlays on a finished video. The planning model returns a list of timed events; code checks each one and draws it; the overlay version is saved as a new file beside the approved video, with the sound untouched.

- **Events:** a text label, a badge, an underline.
- **Styles,** set by the format: clean, tactile (stepped movement), graphic (outlined), premium (restrained).
- **Checks before drawing:** times inside the video and in order, no 2 events at once, each held long enough to read, text taken word for word from the approved plan, text and background at a contrast of 4.5 to 1 or better, an event that repeats the caption on screen is dropped, an event that would sit on a caption is moved up.
- **Type:** the verified actual brand headline font, loaded from its file on each draw. Missing font inputs stop added text for repair; clean footage remains available. Caption/title/label text uses transparent glyphs and a restrained contour, never a generic opaque fallback plate. Source logos and product printing remain intact.

## What it can't do

It does not follow a moving object, sit behind a person, find beats in the sound, recut or lengthen the video, add sound effects, music or a voice, or draw a logo. The planning model sees about 9 sampled frames, not the whole video, so a placement between samples is a guess that a person checks. Each of these is added only as a real feature with its own review.

## Where the ideas came from

The principles were taken from the motion reel kit in `skills/motion-reel`, which builds whole films in code:

- Movement is a function of time, so the same plan always draws the same video.
- Real product and brand material, a clear order of importance, type that reads on a phone.
- Movement with weight; sound matched to picture only where timing was measured.
- Review from the rendered file at phone size, never from the plan.
- A separate output and a plan that can be run again, never an edit that destroys the source.

What was not taken, because this step finishes an existing ad and does not build one: the kit's bans on every fade and every still hold, its 60 frames a second, its constant camera pushes, and its rule of 3 scored review rounds. Its review questions are used as questions, never as invented scores. Its rule of 1 accent colour is a default, not a reason to replace a brand's palette.
