# What 2 good prompts do (read 2026-10-08)

The owner sent 2 prompts written by other people for a video model, with the pack shot they were written around, and said the films they made were "too good": "look at how much is happening", "that is what we have to aspire to". Then he said how to use them: "don't take the exact style... take the principles of how people are constructing these prompts", "it's going to be case dependent", "give the model that amount of flexibility and creativity".

So this page keeps what the prompts do, never how they look. Their wording is not copied here and is not sent to any planner.

## What the 2 prompts were

- **A product film with no person:** 8 seconds, 10 cuts, a made world built out of what the product is made of, ending on the pack.
- **A comic film with an actor:** 8 seconds, 10 cuts, a person reacting as the world around them changes, ending on the pack and the person together.

Both were silent films cut to music. Neither carried a spoken line.

## What both do, whatever the look

1. **Almost all of the prompt is the cut list.** 1 line sets the film (its length, its kind, how true the product must be to its photo, how many cuts). 1 line at the end says what must not be in the frame. Everything between is what happens, cut by cut.
2. **A lot happens.** 10 different pictures in 8 seconds. No picture is shown twice, and no cut is to the same thing from nearer.
3. **Every cut says 3 things:** what is in the frame and what it is doing, how the camera moves and how fast, and what the light or the lens does when that makes the picture. The subject and the camera both move in almost every cut.
4. **The cuts are timed to a tenth of a second and are not the same length.** They run short while the film builds (0.6 to 0.7 seconds) and longer on the reveal and the ending (0.9 to 1.2 seconds).
5. **The film has a shape.** It opens on the closest, strangest picture. It builds through new places and scales. It shows the product arriving, then its detail, then the whole of it, then a payoff, and the last cut holds.
6. **Motion carries across cuts.** A move at the end of 1 cut is picked up by the next, so 10 cuts read as 1 film.
7. **Speed is a tool.** 1 or 2 cuts are slowed on purpose, where something is worth watching. The rest are fast.
8. **The viewer is being entertained.** Each film would be watched with no product in it.

## What this app took

- A director may cut a clip of a made world as often as about once a second, and chooses how often by what the idea needs (`src/lib/production/prompts.ts`: `shotsFor` with `montage`, `MAX_CUTS`). A filmed person is cut nearer the speaker's pace, with more room than before.
- A shot is timed to a tenth of a second. The shots of a clip differ in length: quick where it builds, longer where it lands.
- A clip has a shape of its own: opening picture, build, the picture the words are about, landing.
- A shot of a made world may say how fast the camera goes and what the light does, and 1 shot of a clip may run slow.
- The clip prompt of a made world gives its room to the shots: the line about the camera of the whole video is left out.

## What this app did not take

- **The look.** Particles, bursts and glowing gradients belong to those 2 films. A clay film, a paper film or a person in a kitchen moves in its own way, and its own format skill says how.
- **10 cuts as a rule.** It is the most a clip may have, never what it must have.
- **Silence.** This app's clips carry a voice. A voice-over runs across quick cuts easily; a person seen speaking needs shots long enough to be seen saying the words.

## Not proven

Nothing cut this fast had been rendered by this app when this was written. Whether the video model follows cuts timed to a tenth of a second, and draws 6 to 8 different pictures cleanly in 6 seconds with a voice over them, is settled by rendering.
